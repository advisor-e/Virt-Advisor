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
})

// ── Production behaviour (dev fallback OFF) ────────────────────────────────────
// IS_DEV is captured at module load, so re-load the route with NODE_ENV=production
// in an isolated registry to exercise the real prod error paths.

describe('production mode', () => {
  function loadProd (overlayImpl) {
    let mod
    jest.isolateModules(() => {
      process.env.NODE_ENV = 'production'
      jest.doMock('../../server/utils/firmOverlay', () => overlayImpl)
      mod = require('../../server/routes/currency')
    })
    process.env.NODE_ENV = 'test'
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

  test('GET currency is firmAuth-guarded and open to any firm user', () => {
    expect(server).toMatch(
      /server\.get\('\/api\/report\/currency',\s*firmAuth,\s*currencyRoute\.get\)/
    )
  })

  test('POST currency requires firmAuth AND requireManagerRole', () => {
    expect(server).toMatch(
      /server\.post\('\/api\/report\/currency',\s*firmAuth,\s*requireManagerRole,\s*currencyRoute\.set\)/
    )
  })
})
