'use strict'

const fs = require('fs')

// firmOverlay is the prod persistence path — mock it so tests never touch MySQL.
jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const { get, set } = require('../../server/routes/currency')
const { default: DEFAULT_CURRENCY } = require('../../data/currencies.json')

// ── Helpers (mirror firmManager.routes.test.js) ───────────────────────────────

function makeMockRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { this._body = body }
  }
}

function makeReq (overrides = {}) {
  return {
    firmId: 'firm-test-123',
    userRole: 'firm_manager',
    userEmail: 'mgr@testfirm.com',
    query: {},
    params: {},
    body: {},
    headers: {},
    ...overrides
  }
}

beforeEach(() => { jest.clearAllMocks() })

// ── GET /api/report/currency ──────────────────────────────────────────────────

describe('get', () => {
  test('returns the firm’s stored currency', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ code: 'GBP' })
    const res = makeMockRes()
    await get(makeReq(), res)
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ currency: 'GBP', isDefault: false })
  })

  test('returns the platform default when the firm has not chosen', async () => {
    overlay.loadFirmConfig.mockResolvedValue(null)
    const res = makeMockRes()
    await get(makeReq(), res)
    expect(res._body).toEqual({ currency: DEFAULT_CURRENCY, isDefault: true })
  })

  test('ignores an unsupported stored code and serves the default', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ code: 'XYZ' })
    const res = makeMockRes()
    await get(makeReq(), res)
    expect(res._body).toEqual({ currency: DEFAULT_CURRENCY, isDefault: true })
  })

  test('dev fallback: on a store error, reads the dev JSON file', async () => {
    overlay.loadFirmConfig.mockRejectedValue(new Error('no db'))
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ 'firm-test-123': 'EUR' }))
    const res = makeMockRes()
    await get(makeReq(), res)
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ currency: 'EUR', isDefault: false })
    fs.readFileSync.mockRestore()
  })
})

// ── POST /api/report/currency ─────────────────────────────────────────────────

describe('set', () => {
  test('rejects an unknown currency code with 400 and never saves', async () => {
    const res = makeMockRes()
    await set(makeReq({ body: { currency: 'XYZ' } }), res)
    expect(res._status).toBe(400)
    expect(JSON.parse(res._body).error.code).toBe('INVALID_CURRENCY')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('rejects a missing body with 400', async () => {
    const res = makeMockRes()
    await set(makeReq({ body: {} }), res)
    expect(res._status).toBe(400)
    expect(JSON.parse(res._body).error.code).toBe('INVALID_CURRENCY')
  })

  test('saves a valid code via firmOverlay under config_key "currency"', async () => {
    overlay.saveFirmConfig.mockResolvedValue(2)
    const res = makeMockRes()
    await set(makeReq({ body: { currency: 'GBP' } }), res)
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(
      'firm-test-123', 'currency', { code: 'GBP' }, 'mgr@testfirm.com'
    )
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ saved: true, currency: 'GBP' })
  })

  test('dev fallback: on a store error, writes the dev JSON file and still succeeds', async () => {
    overlay.saveFirmConfig.mockRejectedValue(new Error('no db'))
    jest.spyOn(fs, 'readFileSync').mockReturnValue('{}')
    const write = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {})
    const res = makeMockRes()
    await set(makeReq({ body: { currency: 'AUD' } }), res)
    expect(write).toHaveBeenCalled()
    expect(res._body).toEqual({ saved: true, currency: 'AUD' })
    fs.readFileSync.mockRestore()
    fs.writeFileSync.mockRestore()
  })

  // 🔴 THE UAT TRAP, AND THE REASON server/utils/dbFailure.js EXISTS.
  //
  // Every management tier needs its reserved row in `firms` before anything can be
  // stored against its scope (config/db-schema.sql). Miss the insert and MySQL
  // refuses each save with a foreign-key error — errno 1452, sqlState '23000'.
  //
  // The old gate was `NODE_ENV !== 'production'`, so in ANY environment not named
  // exactly 'production' — a UAT box included — that refusal was read as "there is
  // no database here", the content was written to a gitignored scratch file, and
  // the screen said saved. A tester could then exercise the whole cascade, see it
  // work, and sign it off having proved nothing: the database was never written to,
  // and the file disappears on the next deploy. A false pass, which is worse than a
  // failure because a failure gets fixed.
  //
  // This test is the control. It runs in the dev-shaped env every other test here
  // uses, so it fails if the guard is ever removed or loosened back to NODE_ENV.
  test('🔴 a foreign-key REFUSAL never becomes a dev-file write, even outside production', async () => {
    const refusal = new Error('ER_NO_REFERENCED_ROW_2')
    refusal.code = 'ER_NO_REFERENCED_ROW_2'
    refusal.errno = 1452
    refusal.sqlState = '23000' // only a live server that answered sets this
    overlay.saveFirmConfig.mockRejectedValue(refusal)
    jest.spyOn(fs, 'readFileSync').mockReturnValue('{}')
    const write = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {})

    const res = makeMockRes()
    await set(makeReq({ body: { currency: 'AUD' } }), res)

    expect(write).not.toHaveBeenCalled()
    expect(res._status).toBe(500)
    expect(JSON.parse(res._body).error.code).toBe('DB_ERROR')
    expect(res._body).not.toContain('ER_NO_REFERENCED_ROW_2') // no internals leak out

    fs.readFileSync.mockRestore()
    fs.writeFileSync.mockRestore()
  })

  test('a refused READ does not answer from the dev file either', async () => {
    const refusal = new Error('ER_NO_SUCH_TABLE')
    refusal.code = 'ER_NO_SUCH_TABLE'
    refusal.errno = 1146
    refusal.sqlState = '42S02'
    overlay.loadFirmConfig.mockRejectedValue(refusal)
    const read = jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ 'firm-test-123': 'EUR' }))

    const res = makeMockRes()
    await get(makeReq(), res)

    // 'EUR' is what the dev file holds. Reaching it would mean a refused read had
    // been answered from a scratch file — the read-side half of the same trap.
    // (readFileSync itself cannot be asserted on: Jest's own reporter calls it.)
    expect(res._body).not.toEqual({ currency: 'EUR', isDefault: false })
    expect(res._body).toEqual({ currency: DEFAULT_CURRENCY, isDefault: true })
    read.mockRestore()
  })
})

// ── Production behaviour (dev fallback OFF) ────────────────────────────────────
// 🔴 THE ENV MUST STAY 'production' WHILE THE ROUTE RUNS, not merely while it is
// required. This block used to set NODE_ENV=production, require the module in an
// isolated registry so the old module-level `IS_DEV` const captured `false`, and
// then restore NODE_ENV='test' BEFORE calling the route. That worked only because
// the flag was frozen at load; the assertions passed without production ever being
// in force at the moment that mattered.
//
// The gate is now evaluated per failure (server/utils/dbFailure.js), which is what
// platformDistinctions.js and templateCheckRulings.js already did on purpose — "so
// the dev fallback honours the env in force when a write actually happens". These
// tests therefore hold the env across the call. That is a stricter test of the same
// intent, not a weaker one: it exercises the real production path instead of a
// frozen boolean.

describe('production mode', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    if (originalEnv === undefined) { delete process.env.NODE_ENV } else { process.env.NODE_ENV = originalEnv }
  })

  function loadProd (overlayImpl) {
    let mod
    jest.isolateModules(() => {
      process.env.NODE_ENV = 'production'
      jest.doMock('../../server/utils/firmOverlay', () => overlayImpl)
      mod = require('../../server/routes/currency')
    })
    // Deliberately NOT restored here — the caller runs the route under production.
    return mod
  }

  test('a real save DB error returns 500 DB_ERROR (no silent file write)', async () => {
    const prod = loadProd({
      loadFirmConfig: jest.fn(),
      saveFirmConfig: jest.fn().mockRejectedValue(new Error('no db')),
      getVersionHistory: jest.fn(),
      restoreVersion: jest.fn()
    })
    const res = makeMockRes()
    await prod.set(makeReq({ body: { currency: 'GBP' } }), res)
    expect(res._status).toBe(500)
    expect(JSON.parse(res._body).error.code).toBe('DB_ERROR')
  })

  test('a read DB error degrades to the default rather than breaking the report', async () => {
    const prod = loadProd({
      loadFirmConfig: jest.fn().mockRejectedValue(new Error('no db')),
      saveFirmConfig: jest.fn(),
      getVersionHistory: jest.fn(),
      restoreVersion: jest.fn()
    })
    const res = makeMockRes()
    await prod.get(makeReq(), res)
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ currency: DEFAULT_CURRENCY, isDefault: true })
  })
})

// ── Wiring tripwire ───────────────────────────────────────────────────────────
// The manager-only guard lives in route registration, not the handler; pin it so a
// future edit can't silently open the write path or lock advisors out of the read.

describe('route wiring', () => {
  const server = fs.readFileSync(
    require('path').resolve(__dirname, '../../server/restify-server.js'), 'utf8'
  )

  test('GET currency is open to any firm user — an advisor or a client of the firm (item 4.68)', () => {
    expect(server).toMatch(
      /server\.get\('\/api\/report\/currency',\s*firmOrEntityAuth,\s*currencyRoute\.get\)/
    )
  })

  test('POST currency requires firmAuth AND requireManagerRole', () => {
    expect(server).toMatch(
      /server\.post\('\/api\/report\/currency',\s*firmAuth,\s*requireManagerRole,\s*currencyRoute\.set\)/
    )
  })
})
