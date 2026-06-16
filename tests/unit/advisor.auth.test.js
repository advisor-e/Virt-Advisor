'use strict'

// IDOR closure for the advisor session endpoint (/api/advisor/query).
//
// The route is now guarded by `firmAuth` (registered in server/restify-server.js),
// which attaches the VERIFIED firmId/advisorId to the request. firmAuth's own
// behaviour — no token -> 401, spoofed JWT claims rejected, dev-bypass identity —
// is covered by tests/unit/firmAuth.test.js. These tests cover the engine half of
// the fix: handleQuery must scope firm reads by the verified identity it is handed
// and must IGNORE any firmId/advisorId smuggled in the request body.

process.env.OPENAI_API_KEY = 'test-key' // silence the startup FATAL log; no network is made

const { EventEmitter } = require('events')

// loadFirmConfig is the first firm-scoped read in the pipeline (advisorEngine.js:700),
// reached right after the mode check and before any OpenAI call or SSE write — so the
// firmId it receives is the proof of which identity the engine trusts.
jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn().mockResolvedValue(null),
  deepMerge: (a, b) => Object.assign({}, a, b)
}))

// Never touch the network if the flow runs past the firm-config load.
jest.mock('../../server/utils/openaiClient', () => ({
  createOpenAIClient: () => ({ chat: { completions: { create: jest.fn().mockResolvedValue({ choices: [{ message: { content: '{}' } }], usage: {} }) } } })
}))

const { loadFirmConfig } = require('../../server/utils/firmOverlay')
const advisorMiddleware = require('../../server/advisorEngine')

// A request as it looks AFTER firmAuth has run: firmId/advisorId are attached from
// the verified JWT. The body carries hostile values a client could try to smuggle.
function makeReq (identity, body) {
  const req = new EventEmitter()
  req.method = 'POST'
  req.url = '/api/advisor/query'
  req.headers = {}
  req.socket = { remoteAddress: '127.0.0.1', destroy () {} }
  req.firmId = identity.firmId
  req.advisorId = identity.advisorId
  // The middleware attaches its data/end listeners synchronously; emit on the next tick.
  setImmediate(() => {
    req.emit('data', Buffer.from(JSON.stringify(body)))
    req.emit('end')
  })
  return req
}

function makeRes () {
  return {
    headersSent: false,
    _writes: [],
    writeHead (status) { this.headersSent = true; this._status = status },
    setHeader () {},
    flushHeaders () {},
    write (chunk) { this._writes.push(chunk); return true },
    end (chunk) { if (chunk) { this._writes.push(chunk) } }
  }
}

// Let the middleware's async chain (body collect -> handleQuery -> awaited
// loadFirmConfig) settle. Errors further down the sequencer are caught by the
// engine's own .catch and do not affect the early loadFirmConfig assertion.
function flush () {
  return new Promise(resolve => setImmediate(() => setImmediate(() => setImmediate(resolve))))
}

beforeEach(() => jest.clearAllMocks())

describe('advisor /query — firm scoping uses the verified identity (IDOR closed)', () => {
  test('firm config is loaded with the JWT firmId, never the firmId in the body', async () => {
    const req = makeReq(
      { firmId: 'firm-from-jwt', advisorId: 'advisor-from-jwt' },
      { query: '__init__', mode: 'client', firmId: 'ATTACKER-spoofed-firm', advisorId: 'ATTACKER-spoofed-advisor' }
    )
    const res = makeRes()

    advisorMiddleware(req, res, () => {})
    await flush()

    expect(loadFirmConfig).toHaveBeenCalled()
    for (const call of loadFirmConfig.mock.calls) {
      expect(call[0]).toBe('firm-from-jwt')
    }
    // The hostile body value must never reach a firm-scoped read.
    const firmIdsSeen = loadFirmConfig.mock.calls.map(c => c[0])
    expect(firmIdsSeen).not.toContain('ATTACKER-spoofed-firm')
  })

  test('with no firm on the verified token, a body firmId cannot smuggle firm scope', async () => {
    const req = makeReq(
      { firmId: null, advisorId: null },
      { query: '__init__', mode: 'client', firmId: 'ATTACKER-spoofed-firm' }
    )
    const res = makeRes()

    advisorMiddleware(req, res, () => {})
    await flush()

    // firmId resolves to null, so the firm-scoped reads are skipped entirely —
    // the body value is ignored, not used as a fallback.
    expect(loadFirmConfig).not.toHaveBeenCalled()
  })
})
