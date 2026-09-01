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

// Nor the DATABASE. handleQuery reads the advisor's past cases (loadPromptCases,
// added 2026-08-03 when the case list moved server-side), and unmocked that is a
// real MySQL connection attempt — measured at 96 ms on a machine with no database,
// because it waits for the connect to fail before falling back. That is an eternity
// beside the tick-based settle below, and it left the FIRST request's firm reads
// still arriving while the SECOND test was being asserted: the security assertion
// then failed on calls the other test had made. A unit test must not reach for a
// database at all.
jest.mock('../../server/utils/caseStore', () => ({
  listForAdvisor: jest.fn().mockResolvedValue([]),
  listForClient: jest.fn().mockResolvedValue([])
}))

const { loadFirmConfig } = require('../../server/utils/firmOverlay')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')
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
//
// This WAITS FOR QUIET rather than counting ticks. A fixed number of ticks is a
// guess about how long the chain takes, and the guess silently expires the day
// someone adds a slower step — at which point one test's firm reads land during
// the next test and a security assertion fails for a reason that has nothing to
// do with security. Quiescence keeps that from happening again.
function flush (mock = loadFirmConfig) {
  return new Promise((resolve) => {
    let lastSeen = -1
    const tick = () => {
      const now = mock.mock.calls.length
      // Two consecutive idle passes: one to notice nothing new, one to be sure a
      // resolved promise has not queued more work behind it.
      if (now === lastSeen && idleRuns++ >= 2) { return resolve() }
      if (now !== lastSeen) { idleRuns = 0 }
      lastSeen = now
      setImmediate(tick)
    }
    let idleRuns = 0
    setImmediate(tick)
  })
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
    // Two scopes are legitimate since Phase 5 (2026-08-09): the caller's own firm,
    // and the reserved platform scope that holds what the MENTOR authored — every
    // firm resolves against it, so reading it is not firm-crossing. Both are decided
    // server-side from the verified token; neither can be influenced by the body.
    for (const call of loadFirmConfig.mock.calls) {
      expect(['firm-from-jwt', PLATFORM_SCOPE]).toContain(call[0])
    }
    // The hostile body value must never reach ANY scoped read — the property this
    // test exists for, and the one Phase 5 must not have loosened.
    const firmIdsSeen = loadFirmConfig.mock.calls.map(c => c[0])
    expect(firmIdsSeen).not.toContain('ATTACKER-spoofed-firm')
    expect(firmIdsSeen).toContain('firm-from-jwt')
  })

  test('with no firm on the verified token, a body firmId cannot smuggle firm scope', async () => {
    const req = makeReq(
      { firmId: null, advisorId: null },
      { query: '__init__', mode: 'client', firmId: 'ATTACKER-spoofed-firm' }
    )
    const res = makeRes()

    advisorMiddleware(req, res, () => {})
    await flush()

    // firmId resolves to null, so FIRM-scoped reads are skipped. Since Cascade
    // Phase 2 (2026-09-01) the engine still resolves the template library at the
    // reserved platform scope — the mentor's content, which every caller may read
    // (same reasoning as the first test). The property this test exists for is
    // unchanged: the body value is ignored, not used as a fallback, so no read
    // may carry ANY scope but the platform's.
    for (const call of loadFirmConfig.mock.calls) {
      expect(call[0]).toBe(PLATFORM_SCOPE)
    }
    expect(loadFirmConfig.mock.calls.map(c => c[0])).not.toContain('ATTACKER-spoofed-firm')
  })
})
