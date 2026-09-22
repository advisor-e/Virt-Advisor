'use strict'

/**
 * A CLIENT's own currency — /api/report/currency/client/:clientId (item 13.4).
 *
 * Mike's ruling, 2026-09-22: "currency is selected at firm manager level and cascades
 * down to the client level model library but at client level … the currency can again
 * be edited by the advisor."
 *
 * WHAT UAT CANNOT SEE, AND THIS PINS. A tester sees a currency symbol and judges it
 * instantly; none of the below shows on screen:
 *   - the CASCADE resolving client → firm → platform default, and `source` naming
 *     which of the three answered, so an advisor can tell a client's own choice from
 *     the firm's inherited one;
 *   - a client of ANOTHER firm reading and writing nothing (IDOR), resolving to the
 *     firm's currency rather than erroring — a display setting must not leak the
 *     existence of another firm's client;
 *   - a read NEVER throwing, whatever the store does, because a thrown currency
 *     would take a whole report down with it;
 *   - a clear returning the firm's value rather than a blank;
 *   - the write being ADVISOR-level, unlike the manager-gated firm-wide one.
 */

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))
jest.mock('../../server/utils/clientStore', () => ({ getById: jest.fn() }))

const overlay = require('../../server/utils/firmOverlay')
const clientStore = require('../../server/utils/clientStore')
const {
  getForClient,
  setForClient,
  readClientCurrency
} = require('../../server/routes/currency')
const { default: DEFAULT_CURRENCY } = require('../../data/currencies.json')

const FIRM = 'firm-test-123'
const CLIENT = 'client-abc'

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

function makeReq (overrides = {}) {
  return {
    firmId: FIRM,
    userRole: 'advisor',
    userEmail: 'advisor@testfirm.com',
    params: { clientId: CLIENT },
    body: {},
    ...overrides
  }
}

/** The client exists and belongs to this firm. */
function clientExists () {
  clientStore.getById.mockResolvedValue({ id: CLIENT, firmId: FIRM, name: 'Harbour Joinery' })
}

/**
 * Point the overlay at a firm currency and a client currency independently.
 * @param {string|null} firmCode
 * @param {string|null} clientCode
 */
function overlayHolds (firmCode, clientCode) {
  overlay.loadFirmConfig.mockImplementation((firmId, key) => {
    if (key === 'currency') { return Promise.resolve(firmCode ? { code: firmCode } : null) }
    if (key === 'client-currency:' + CLIENT) {
      return Promise.resolve(clientCode ? { code: clientCode } : {})
    }
    return Promise.resolve(null)
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  overlay.saveFirmConfig.mockResolvedValue(undefined)
})

// ── The cascade: client → firm → default ────────────────────────────────────

describe('the cascade, and which level answered', () => {
  test('a client with its own currency gets it, marked as the client\'s own', async () => {
    clientExists()
    overlayHolds('GBP', 'EUR')
    expect(await readClientCurrency(FIRM, CLIENT))
      .toEqual({ currency: 'EUR', isDefault: false, source: 'client' })
  })

  test('a client with none inherits the firm\'s, marked as the firm\'s', async () => {
    clientExists()
    overlayHolds('GBP', null)
    expect(await readClientCurrency(FIRM, CLIENT))
      .toEqual({ currency: 'GBP', isDefault: false, source: 'firm' })
  })

  test('neither set falls all the way to the platform default', async () => {
    clientExists()
    overlayHolds(null, null)
    const r = await readClientCurrency(FIRM, CLIENT)
    expect(r).toEqual({ currency: DEFAULT_CURRENCY, isDefault: true, source: 'default' })
  })

  test('no client id at all resolves to the firm without touching the client store', async () => {
    overlayHolds('AUD', null)
    expect(await readClientCurrency(FIRM, '')).toEqual({
      currency: 'AUD', isDefault: false, source: 'firm'
    })
    expect(clientStore.getById).not.toHaveBeenCalled()
  })

  test('an unsupported stored code is ignored, not served', async () => {
    clientExists()
    overlayHolds('GBP', 'XYZ')
    expect((await readClientCurrency(FIRM, CLIENT)).currency).toBe('GBP')
  })
})

// ── IDOR: another firm's client ─────────────────────────────────────────────

describe('a client that is not this firm\'s', () => {
  test('reads nothing of theirs and resolves to this firm\'s currency', async () => {
    clientStore.getById.mockResolvedValue(null)
    overlayHolds('GBP', 'EUR')
    const r = await readClientCurrency(FIRM, 'someone-elses-client')
    expect(r).toEqual({ currency: 'GBP', isDefault: false, source: 'firm' })
  })

  test('the client store is always asked with THIS firm\'s id', async () => {
    clientExists()
    overlayHolds('GBP', null)
    await readClientCurrency(FIRM, CLIENT)
    expect(clientStore.getById).toHaveBeenCalledWith(CLIENT, FIRM)
  })

  test('a write to another firm\'s client is a 404, and saves nothing', async () => {
    clientStore.getById.mockResolvedValue(null)
    const res = makeMockRes()
    await setForClient(makeReq({ body: { currency: 'EUR' } }), res)
    expect(res._status).toBe(404)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })
})

// ── A read must never break a report ────────────────────────────────────────

describe('a failing store never throws', () => {
  test('a client-store failure degrades to the firm\'s currency', async () => {
    clientStore.getById.mockRejectedValue(new Error('db down'))
    overlay.loadFirmConfig.mockResolvedValue({ code: 'GBP' })
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect((await readClientCurrency(FIRM, CLIENT)).currency).toBe('GBP')
    spy.mockRestore()
  })

  test('a total overlay failure still answers with the platform default', async () => {
    clientStore.getById.mockResolvedValue({ id: CLIENT, firmId: FIRM })
    overlay.loadFirmConfig.mockRejectedValue(new Error('db down'))
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const r = await readClientCurrency(FIRM, CLIENT)
    expect(r.currency).toBe(DEFAULT_CURRENCY)
    spy.mockRestore()
  })

  test('the GET route serves 200 even when everything below it fails', async () => {
    clientStore.getById.mockRejectedValue(new Error('db down'))
    overlay.loadFirmConfig.mockRejectedValue(new Error('db down'))
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const res = makeMockRes()
    await getForClient(makeReq(), res)
    expect(res._status).toBe(200)
    expect(res._body.currency).toBe(DEFAULT_CURRENCY)
    spy.mockRestore()
  })
})

// ── Writing, and clearing ───────────────────────────────────────────────────

describe('setting a client\'s currency', () => {
  test('saves under the client\'s own key and reports what now applies', async () => {
    clientExists()
    overlayHolds('GBP', 'EUR')
    const res = makeMockRes()
    await setForClient(makeReq({ body: { currency: 'EUR' } }), res)
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ saved: true, currency: 'EUR', source: 'client' })
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(
      FIRM, 'client-currency:' + CLIENT, { code: 'EUR' }, 'advisor@testfirm.com'
    )
  })

  test('clearing returns the FIRM\'s currency, not a blank', async () => {
    clientExists()
    overlayHolds('GBP', null)
    const res = makeMockRes()
    await setForClient(makeReq({ body: { currency: '' } }), res)
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ saved: true, currency: 'GBP', source: 'firm' })
  })

  test('a clear stores an empty object so version history keeps WHO cleared it', async () => {
    clientExists()
    overlayHolds('GBP', null)
    await setForClient(makeReq({ body: { currency: null } }), makeMockRes())
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(
      FIRM, 'client-currency:' + CLIENT, {}, 'advisor@testfirm.com'
    )
  })

  test('an unsupported code is refused with its code, and saves nothing', async () => {
    clientExists()
    const res = makeMockRes()
    await setForClient(makeReq({ body: { currency: 'XYZ' } }), res)
    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('INVALID_CURRENCY')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('a missing body is refused rather than treated as a clear', async () => {
    clientExists()
    const res = makeMockRes()
    await setForClient(makeReq({ body: undefined }), res)
    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('an ORDINARY ADVISOR may write — this is deliberately not manager-gated', async () => {
    clientExists()
    overlayHolds('GBP', 'EUR')
    const res = makeMockRes()
    await setForClient(makeReq({ userRole: 'advisor', body: { currency: 'EUR' } }), res)
    expect(res._status).toBe(200)
  })

  /**
   * 🔴 THE TWO FAILURE SHAPES ARE DIFFERENT ANSWERS, AND THAT IS THE POINT.
   * `dbFailure` tells "no database was reached" apart from "a live server
   * refused the statement" by the presence of `sqlState`. A client currency has
   * NO dev-file fallback — unlike the firm-wide setting, which has
   * `data/dev-firm-currency.json` — so an unreachable database must say so (503)
   * rather than appear to save into nothing. A server that answered and refused
   * is a real server error (500). Neither may report success, and neither may
   * leak the underlying message.
   */
  test('an unreachable database is a 503, never a silent success', async () => {
    clientExists()
    overlayHolds('GBP', null)
    overlay.saveFirmConfig.mockRejectedValue(new Error('connect ECONNREFUSED'))
    const res = makeMockRes()
    await setForClient(makeReq({ body: { currency: 'EUR' } }), res)
    expect(res._status).toBe(503)
    expect(res._body.error.code).toBe('DB_UNAVAILABLE')
    expect(JSON.stringify(res._body)).not.toMatch(/ECONNREFUSED/)
  })

  test('a live server REFUSING the write is a 500 with no stack', async () => {
    clientExists()
    overlayHolds('GBP', null)
    const refusal = new Error('write refused')
    refusal.sqlState = '23000' // a server answered — never the dev fallback
    overlay.saveFirmConfig.mockRejectedValue(refusal)
    const res = makeMockRes()
    await setForClient(makeReq({ body: { currency: 'EUR' } }), res)
    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toMatch(/write refused/)
  })
})
