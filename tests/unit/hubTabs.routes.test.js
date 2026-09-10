'use strict'

/**
 * The hub-tab dot routes — item 4.84, slice 1.
 *
 * 🔴 THE FOUR THAT MATTER, and none of them is visible to a person in UAT:
 *
 *   1. THE IDENTITY COMES FROM THE VERIFIED TOKEN, NEVER THE BODY. A body-supplied manager
 *      would let anyone with the route clear — or forge — somebody else's reading history, and
 *      every screen involved would look exactly as it does now.
 *
 *   2. THE SCOPE COMES FROM THE TOKEN TOO. No handler reads a scope from a body or a query, so
 *      no manager can reach another scope's rows (tier-cascade.md P6). A leak here is silent by
 *      construction.
 *
 *   3. THE TIME IS THE SERVER'S. A client-supplied timestamp could hold a dot off for ever by
 *      claiming a visit that never happened — a notification feature quietly switched off by
 *      the thing it is meant to notify.
 *
 *   4. A READ FAILURE OPENS THE HUB ANYWAY. A manager locked out of their own menu because a
 *      dot could not be computed is a far worse fault than a dot that is briefly wrong.
 */

// firmOverlay is the production persistence path — mocked so tests never touch MySQL, and so a
// save never falls through to the dev JSON file and writes into the working tree.
jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfigsByPrefix: jest.fn(),
  saveFirmConfig: jest.fn()
}))

const fs = require('fs')
const overlay = require('../../server/utils/firmOverlay')
const routes = require('../../server/routes/hubTabs')
const { STALE_DAYS, managerKeyPrefix } = require('../../server/utils/hubTabOpened')

const FIRM = 'firm-test-123'
const MANAGER = 'manager@example.com'

function makeRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { this._body = body }
  }
}

/** `sendError` writes a JSON STRING through writeHead/end, so it must be parsed. */
function errorBody (res) {
  return typeof res._body === 'string' ? JSON.parse(res._body) : res._body
}

function makeReq (over) {
  return Object.assign({ firmId: FIRM, userEmail: MANAGER, query: {}, body: {} }, over || {})
}

/** A MySQL refusal — it carries a sqlState, so the dev fallback must NOT run. */
function refusal () {
  const err = new Error('Cannot add or update a child row')
  err.code = 'ER_NO_REFERENCED_ROW_2'
  err.sqlState = '23000'
  return err
}

/** No database at all — no sqlState, so the dev fallback is allowed to run. */
function noDatabase () {
  const err = new Error('connect ECONNREFUSED 127.0.0.1:3306')
  err.code = 'ECONNREFUSED'
  return err
}

beforeEach(() => {
  jest.clearAllMocks()
  overlay.loadFirmConfigsByPrefix.mockResolvedValue({})
  overlay.saveFirmConfig.mockResolvedValue(1)
})

describe('reading when this manager last opened each tab', () => {
  test('reads the caller\'s OWN prefix, in the scope on their token', async () => {
    const res = makeRes()
    await routes.getOpened(makeReq(), res)

    expect(overlay.loadFirmConfigsByPrefix)
      .toHaveBeenCalledWith(FIRM, managerKeyPrefix(MANAGER))
  })

  test('ignores a scope or a manager offered in the query or the body', async () => {
    const res = makeRes()
    await routes.getOpened(makeReq({
      query: { firmId: 'firm-somebody-else', userEmail: 'victim@example.com' },
      body: { firmId: 'firm-somebody-else', userEmail: 'victim@example.com' }
    }), res)

    const [scope, prefix] = overlay.loadFirmConfigsByPrefix.mock.calls[0]
    expect(scope).toBe(FIRM)
    expect(prefix).toBe(managerKeyPrefix(MANAGER))
  })

  test('returns the stored timestamps and the threshold the orange dot is drawn from', async () => {
    overlay.loadFirmConfigsByPrefix.mockResolvedValue({
      taxRates: { at: '2026-09-01T00:00:00.000Z' }
    })

    const res = makeRes()
    await routes.getOpened(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.opened).toEqual({ taxRates: '2026-09-01T00:00:00.000Z' })
    expect(res._body.staleDays).toBe(STALE_DAYS)
  })

  test('opens the hub with no dots when the record cannot be read at all', async () => {
    overlay.loadFirmConfigsByPrefix.mockRejectedValue(refusal())

    const res = makeRes()
    await routes.getOpened(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.opened).toEqual({})
  })

  test('answers with no history when the token carries nobody to key on', async () => {
    const res = makeRes()
    await routes.getOpened(makeReq({ userEmail: null }), res)

    expect(res._status).toBe(200)
    expect(res._body.opened).toEqual({})
    expect(overlay.loadFirmConfigsByPrefix).not.toHaveBeenCalled()
  })
})

describe('stamping a tab as opened', () => {
  test('writes to a key carrying BOTH the caller\'s own id and the tab', async () => {
    const res = makeRes()
    await routes.markOpened(makeReq({ body: { tab: 'taxRates' } }), res)

    const [scope, key] = overlay.saveFirmConfig.mock.calls[0]
    expect(scope).toBe(FIRM)
    expect(key).toBe(managerKeyPrefix(MANAGER) + 'taxRates')
  })

  test('takes the identity from the token even when the body offers another', async () => {
    const res = makeRes()
    await routes.markOpened(makeReq({
      firmId: FIRM,
      body: { tab: 'taxRates', userEmail: 'victim@example.com', firmId: 'firm-somebody-else' }
    }), res)

    const [scope, key] = overlay.saveFirmConfig.mock.calls[0]
    expect(scope).toBe(FIRM)
    expect(key).toContain(MANAGER)
    expect(key).not.toContain('victim@example.com')
  })

  test('stores the SERVER\'s time, never a time offered in the body', async () => {
    const before = Date.now()
    const res = makeRes()
    await routes.markOpened(makeReq({
      body: { tab: 'taxRates', at: '2099-01-01T00:00:00.000Z' }
    }), res)

    const stored = overlay.saveFirmConfig.mock.calls[0][2]
    expect(stored.at).not.toBe('2099-01-01T00:00:00.000Z')
    expect(Date.parse(stored.at)).toBeGreaterThanOrEqual(before)
    expect(Date.parse(stored.at)).toBeLessThanOrEqual(Date.now())
  })

  test('refuses a tab key that would change what the address means, and writes nothing', async () => {
    const res = makeRes()
    await routes.markOpened(makeReq({ body: { tab: 'victim@example.com:taxRates' } }), res)

    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('BAD_TAB')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('refuses a missing tab, and writes nothing', async () => {
    const res = makeRes()
    await routes.markOpened(makeReq({ body: {} }), res)

    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('refuses when the token carries nobody to key on, rather than writing an unowned row', async () => {
    const res = makeRes()
    await routes.markOpened(makeReq({ userEmail: null, body: { tab: 'taxRates' } }), res)

    expect(res._status).toBe(403)
    expect(errorBody(res).error.code).toBe('NO_MANAGER')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('a MySQL REFUSAL is reported, never written to the dev file', async () => {
    // The dbFailure rule: a server that answered and said no must never fall through to a
    // scratch file, or the route reports success for a write that did not happen.
    const write = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {})
    overlay.saveFirmConfig.mockRejectedValue(refusal())

    const res = makeRes()
    await routes.markOpened(makeReq({ body: { tab: 'taxRates' } }), res)

    expect(res._status).toBe(500)
    expect(errorBody(res).error.code).toBe('DB_ERROR')
    expect(write).not.toHaveBeenCalled()
    write.mockRestore()
  })

  test('NO database at all falls through to the dev file, so the hub works without MySQL', async () => {
    const write = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {})
    jest.spyOn(fs, 'readFileSync').mockImplementation(() => '{}')
    overlay.saveFirmConfig.mockRejectedValue(noDatabase())

    const res = makeRes()
    await routes.markOpened(makeReq({ body: { tab: 'taxRates' } }), res)

    expect(res._status).toBe(200)
    expect(write).toHaveBeenCalled()
    expect(write.mock.calls[0][0]).toBe(routes.DEV_FILE)
    fs.readFileSync.mockRestore()
    write.mockRestore()
  })
})
