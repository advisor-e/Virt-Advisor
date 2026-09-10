'use strict'

// The Advisor-e → this app template PUSH (SEARCH-CONTENT-CASCADE-PLAN Phase 4).
//
// None of this is visible in UAT, which is why every line here earns its place:
//
// 1. The door FAILS CLOSED. With no secret configured it answers 404 — it does not
//    exist. With the wrong secret it answers 401 and saves nothing. A slip here is
//    an unauthenticated write into the platform's template library.
// 2. The comparison is constant-time and never throws on a length mismatch — a
//    thrown timingSafeEqual would turn a probe into a 500 and leak the length.
// 3. Every write goes to the reserved PLATFORM scope, never a firm id, and a
//    rejected body leaves the store untouched — a bad push can never take the
//    platform offline.
// 4. The dev-file fallback runs ONLY when no database answered. A live MySQL
//    refusal (sqlState set — the missing reserved `firms` row) surfaces as a 500,
//    never lands in a scratch file reported as saved.
// 5. An oversize body is refused mid-stream, never buffered whole.

const { Readable } = require('stream')

jest.mock('../../config/integration', () => ({
  PUSH: { header: 'x-advisor-e-push-secret', secret: '' }
}))

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn(),
  listFirmIdsWithConfigKey: jest.fn(() => Promise.resolve([]))
}))

jest.mock('../../server/routes/firmManager', () => ({
  _devReadTemplates: jest.fn(() => null),
  _devWriteTemplates: jest.fn(),
  promoteOverridesForDeletedRow: jest.fn()
}))

jest.mock('../../server/utils/templateLibrary', () => ({
  clearTemplateCache: jest.fn()
}))

const { PUSH } = require('../../config/integration')
const overlay = require('../../server/utils/firmOverlay')
const firmManager = require('../../server/routes/firmManager')
const { clearTemplateCache } = require('../../server/utils/templateLibrary')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')
const { TEMPLATE_IMPORT_MAX_BYTES } = require('../../server/utils/templateImport')
const {
  requirePushSecret,
  pushPlatformTemplates,
  secretsMatch,
  readBody,
  PUSHED_BY
} = require('../../server/routes/integrationTemplates')

const SECRET = 'a-long-random-shared-secret'

function makeMockRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { try { this._body = JSON.parse(body) } catch (e) { this._body = body } }
  }
}

/** A request whose body arrives as the given chunks, with the given headers. */
function makeReq (chunks, headers) {
  const req = Readable.from(chunks.map(c => Buffer.from(c)))
  req.headers = headers || {}
  return req
}

const goodTemplates = [
  { page: 'p1', title: 'Cashflow Basics', section: 'Finance' },
  { page: 'p2', title: 'Pricing Review', section: 'Revenue' }
]

// A connection-level failure: no sqlState → "no database here" → dev fallback OK.
const noDbError = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:3306'), { code: 'ECONNREFUSED' })
// A live-server refusal: sqlState set → NEVER fall back (dbFailure.js).
const refusalError = Object.assign(new Error('FK constraint fails'), { sqlState: '23000', errno: 1452 })

beforeEach(() => {
  jest.clearAllMocks()
  PUSH.secret = SECRET
  overlay.saveFirmConfig.mockResolvedValue(3)
})

describe('secretsMatch — constant-time, and never throws', () => {
  it('matches only the exact configured secret', () => {
    expect(secretsMatch(SECRET, SECRET)).toBe(true)
    expect(secretsMatch(SECRET + 'x', SECRET)).toBe(false)
    expect(secretsMatch(SECRET.slice(0, -1), SECRET)).toBe(false)
  })

  it.each([
    ['undefined', undefined],
    ['an empty string', ''],
    ['a number', 42],
    ['an array', [SECRET]]
  ])('refuses a presented value that is %s', (_label, given) => {
    expect(secretsMatch(given, SECRET)).toBe(false)
  })

  it('refuses everything while no secret is configured, even an empty match', () => {
    expect(secretsMatch('', '')).toBe(false)
    expect(secretsMatch('anything', '')).toBe(false)
  })
})

describe('requirePushSecret — the door fails closed', () => {
  it('answers 404, as if the route did not exist, while no secret is configured', () => {
    PUSH.secret = ''
    const res = makeMockRes()
    const next = jest.fn()
    requirePushSecret({ headers: { 'x-advisor-e-push-secret': 'anything' } }, res, next)
    expect(res._status).toBe(404)
    expect(next).toHaveBeenCalledWith(false)
  })

  it('answers 401 with a fixed message when the header is missing', () => {
    const res = makeMockRes()
    const next = jest.fn()
    requirePushSecret({ headers: {} }, res, next)
    expect(res._status).toBe(401)
    expect(res._body.error.code).toBe('UNAUTHORISED')
    expect(next).toHaveBeenCalledWith(false)
  })

  it('answers 401 when the header is wrong, and the body confirms nothing about the secret', () => {
    const res = makeMockRes()
    const next = jest.fn()
    requirePushSecret({ headers: { 'x-advisor-e-push-secret': 'wrong' } }, res, next)
    expect(res._status).toBe(401)
    expect(JSON.stringify(res._body)).not.toContain(SECRET)
    expect(next).toHaveBeenCalledWith(false)
  })

  it('survives a request with no headers object at all', () => {
    const res = makeMockRes()
    const next = jest.fn()
    requirePushSecret({}, res, next)
    expect(res._status).toBe(401)
  })

  it('lets the right secret through', () => {
    const res = makeMockRes()
    const next = jest.fn()
    requirePushSecret({ headers: { 'x-advisor-e-push-secret': SECRET } }, res, next)
    expect(res._status).toBeNull()
    expect(next).toHaveBeenCalledWith()
  })
})

describe('readBody — the size cap bites mid-stream', () => {
  it('joins the chunks into one UTF-8 string', async () => {
    expect(await readBody(makeReq(['[{"a":', '1}]']), 1024)).toBe('[{"a":1}]')
  })

  it('refuses past the cap with PAYLOAD_TOO_LARGE and tears the stream down', async () => {
    const req = makeReq(['x'.repeat(600), 'y'.repeat(600)])
    const destroy = jest.spyOn(req, 'destroy')
    await expect(readBody(req, 1000)).rejects.toMatchObject({ code: 'PAYLOAD_TOO_LARGE' })
    expect(destroy).toHaveBeenCalled()
  })

  it('surfaces a stream error', async () => {
    const req = new Readable({ read () {} })
    req.headers = {}
    const p = readBody(req, 1000)
    req.emit('error', new Error('socket hang up'))
    await expect(p).rejects.toThrow('socket hang up')
  })
})

describe('POST /api/integration/templates', () => {
  it('stores a valid export under the platform scope, attributed to Advisor-e, and clears the cache', async () => {
    const res = makeMockRes()
    await pushPlatformTemplates(makeReq([JSON.stringify(goodTemplates)]), res)
    expect(res._status).toBe(201)
    expect(res._body).toEqual({ success: true, imported: true, templateCount: 2, version: 3 })
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(PLATFORM_SCOPE, 'templates', goodTemplates, PUSHED_BY)
    expect(clearTemplateCache).toHaveBeenCalled()
  })

  it('refuses an oversize body with 413 and saves nothing', async () => {
    const big = '["' + 'x'.repeat(TEMPLATE_IMPORT_MAX_BYTES) + '"]' // two bytes over the cap
    const res = makeMockRes()
    await pushPlatformTemplates(makeReq([big]), res)
    expect(res._status).toBe(413)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  it('reports an unreadable stream as PARSE_ERROR without echoing the fault', async () => {
    const req = new Readable({ read () { this.destroy(new Error('socket hang up')) } })
    req.headers = {}
    const res = makeMockRes()
    await pushPlatformTemplates(req, res)
    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('PARSE_ERROR')
    expect(JSON.stringify(res._body)).not.toContain('hang up')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  it('rejects malformed JSON and leaves the store untouched', async () => {
    const res = makeMockRes()
    await pushPlatformTemplates(makeReq(['{ not json']), res)
    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('INVALID_JSON')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  it.each([
    ['an empty array', []],
    ['an object, not an array', { page: 'p1', title: 't', section: 's' }],
    ['an entry missing its page and section', [{ title: 'missing page and section' }]]
  ])('rejects %s and leaves the store untouched', async (_label, body) => {
    const res = makeMockRes()
    await pushPlatformTemplates(makeReq([JSON.stringify(body)]), res)
    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
    expect(clearTemplateCache).not.toHaveBeenCalled()
  })

  it('falls back to the dev file when no database answered, and says so via version:null', async () => {
    overlay.saveFirmConfig.mockRejectedValue(noDbError)
    const res = makeMockRes()
    await pushPlatformTemplates(makeReq([JSON.stringify(goodTemplates)]), res)
    expect(res._status).toBe(201)
    expect(res._body.version).toBeNull()
    expect(firmManager._devWriteTemplates).toHaveBeenCalledWith(PLATFORM_SCOPE, goodTemplates)
  })

  it('NEVER dev-falls-back on a live MySQL refusal — the missing-reserved-row trap', async () => {
    overlay.saveFirmConfig.mockRejectedValue(refusalError)
    const res = makeMockRes()
    await pushPlatformTemplates(makeReq([JSON.stringify(goodTemplates)]), res)
    expect(res._status).toBe(500)
    expect(firmManager._devWriteTemplates).not.toHaveBeenCalled()
    expect(clearTemplateCache).not.toHaveBeenCalled()
    expect(JSON.stringify(res._body)).not.toContain('constraint')
  })
})

describe('wiring — restify-server.js mounts the door and skips the 1 MB parser for it', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '../../server/restify-server.js'), 'utf8')

  it('mounts POST /api/integration/templates behind requirePushSecret', () => {
    expect(src).toMatch(/server\.post\('\/api\/integration\/templates', integrationTemplates\.requirePushSecret, integrationTemplates\.pushPlatformTemplates\)/)
  })

  it('skips the global JSON parser for that path, so the 10 MB upload cap governs', () => {
    expect(src).toMatch(/p === '\/api\/integration\/templates'\) \{ return next\(\) \}/)
  })
})
