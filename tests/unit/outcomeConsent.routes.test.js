'use strict'

/**
 * The firm's Outcome Sharing routes (4.87 T014/T016/T017).
 *
 * What UAT cannot see: a consent signed with a body-supplied name or scoped to a
 * body-supplied firm, and a withdrawal that deletes one row more than this firm's own.
 */

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  loadFirmConfigsByPrefix: jest.fn(),
  saveFirmConfig: jest.fn(),
  deleteFirmConfigsByPrefix: jest.fn()
}))
jest.mock('../../server/routes/outcomeLearning', () => ({ recomputeAndPersist: jest.fn() }))
jest.mock('../../server/utils/outcomeLearningSession', () => ({ loadPooledForSession: jest.fn() }))

const overlay = require('../../server/utils/firmOverlay')
const { recomputeAndPersist } = require('../../server/routes/outcomeLearning')
const { loadPooledForSession } = require('../../server/utils/outcomeLearningSession')
const routes = require('../../server/routes/outcomeConsent')
const { CONFIG_KEY, CONSENT_WORDING, firmToken } = require('../../server/utils/outcomeConsent')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

const FIRM = 'firm-from-jwt'
const MANAGER = 'manager@firm.example'

function makeRes () {
  return {
    headersSent: false,
    _status: null,
    _body: null,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status },
    end (json) { this._body = JSON.parse(json) }
  }
}
const req = (over = {}) => ({ firmId: FIRM, userEmail: MANAGER, body: {}, ...over })

const stored = (over = {}) => ({
  on: true,
  setBy: 'earlier@firm.example',
  setAt: '2026-09-01T00:00:00Z',
  wording: CONSENT_WORDING,
  withdrawals: [{ requestedBy: 'earlier@firm.example', requestedAt: '2026-09-02T00:00:00Z', removed: 3 }],
  events: [{ on: true, by: 'earlier@firm.example', at: '2026-09-01T00:00:00Z' }],
  ...over
})

const originalSecret = process.env.OUTCOME_POOL_SECRET
let token

beforeEach(() => {
  jest.clearAllMocks()
  process.env.OUTCOME_POOL_SECRET = 'test-pool-secret'
  token = firmToken(FIRM)
  overlay.loadFirmConfig.mockResolvedValue(null)
  overlay.loadFirmConfigsByPrefix.mockResolvedValue({})
  overlay.saveFirmConfig.mockResolvedValue(1)
  overlay.deleteFirmConfigsByPrefix.mockResolvedValue(0)
  recomputeAndPersist.mockResolvedValue({})
  loadPooledForSession.mockResolvedValue({ consented: true, available: true, adjustments: [{ id: 'a' }, { id: 'b' }] })
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  console.error.mockRestore()
  if (originalSecret === undefined) { delete process.env.OUTCOME_POOL_SECRET } else { process.env.OUTCOME_POOL_SECRET = originalSecret }
})

describe('read', () => {
  test('returns the consent, the pinned wording and the pooled count for req.firmId, ignoring a body firmId', async () => {
    overlay.loadFirmConfig.mockResolvedValue(stored())
    overlay.loadFirmConfigsByPrefix.mockResolvedValue({ [token + ':a']: {}, [token + ':b']: {} })
    const res = makeRes()
    await routes.read(req({ body: { firmId: 'someone-else' } }), res)
    expect(overlay.loadFirmConfig).toHaveBeenCalledWith(FIRM, CONFIG_KEY)
    expect(overlay.loadFirmConfigsByPrefix).toHaveBeenCalledWith(PLATFORM_SCOPE, 'outcome-pool:' + token + ':')
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ success: true, consent: stored(), wording: CONSENT_WORDING, pooledCount: 2, adjustmentsApplying: 2 })
    expect(loadPooledForSession).toHaveBeenCalledWith(FIRM)
  })

  // Mike's ruling of 2026-09-10: a sharing firm sees the COUNT of adjustments applying to
  // it, never the list. A firm that is not sharing receives no adjustment, so there is
  // nothing to count and the pool is not read for it.
  test('a firm that is not sharing gets no adjustment count, and the pool is not asked', async () => {
    overlay.loadFirmConfig.mockResolvedValue(stored({ on: false }))
    const res = makeRes()
    await routes.read(req(), res)
    expect(res._body.adjustmentsApplying).toBeNull()
    expect(loadPooledForSession).not.toHaveBeenCalled()
  })

  test('a sharing firm whose pool could not be read gets null, not zero', async () => {
    overlay.loadFirmConfig.mockResolvedValue(stored())
    loadPooledForSession.mockResolvedValue({ consented: true, available: false, adjustments: [] })
    const res = makeRes()
    await routes.read(req(), res)
    expect(res._status).toBe(200)
    expect(res._body.adjustmentsApplying).toBeNull()
  })

  test('no record yet reads as consent null, count 0, even when the pool read returns null', async () => {
    const res = makeRes()
    await routes.read(req(), res)
    expect(res._body).toEqual({ success: true, consent: null, wording: CONSENT_WORDING, pooledCount: 0, adjustmentsApplying: null })
    overlay.loadFirmConfigsByPrefix.mockResolvedValue(null)
    const res2 = makeRes()
    await routes.read(req(), res2)
    expect(res2._body.pooledCount).toBe(0)
  })

  test('a malformed record reads as null', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ on: 'yes' })
    const res = makeRes()
    await routes.read(req(), res)
    expect(res._body.consent).toBeNull()
  })

  test('without a pool secret the count is null and the read still succeeds', async () => {
    delete process.env.OUTCOME_POOL_SECRET
    overlay.loadFirmConfig.mockResolvedValue(stored())
    const res = makeRes()
    await routes.read(req(), res)
    expect(res._status).toBe(200)
    expect(res._body.pooledCount).toBeNull()
    expect(overlay.loadFirmConfigsByPrefix).not.toHaveBeenCalled()
  })

  test('a pool read failure that is not the secret is the safe error shape', async () => {
    overlay.loadFirmConfigsByPrefix.mockRejectedValue(new Error('ECONNREFUSED 10.0.0.1'))
    const res = makeRes()
    await routes.read(req(), res)
    expect(res._status).toBe(500)
    expect(res._body).toMatchObject({ success: false, error: { code: 'DB_ERROR' } })
    expect(JSON.stringify(res._body)).not.toContain('10.0.0.1')
  })
})

describe('set', () => {
  test('writes setBy and setAt from the token, the pinned wording, keeps earlier withdrawals, ignores body identity', async () => {
    overlay.loadFirmConfig.mockResolvedValue(stored({ on: false }))
    const res = makeRes()
    await routes.set(req({ body: { on: true, firmId: 'someone-else', setBy: 'impostor@x', wording: 'my own words' } }), res)
    expect(res._status).toBe(200)
    const [scope, key, value, by] = overlay.saveFirmConfig.mock.calls[0]
    expect(scope).toBe(FIRM)
    expect(key).toBe(CONFIG_KEY)
    expect(by).toBe(MANAGER)
    expect(value).toMatchObject({ on: true, setBy: MANAGER, wording: CONSENT_WORDING, withdrawals: stored().withdrawals })
    expect(value.setBy).not.toBe('impostor@x')
    expect(Number.isNaN(Date.parse(value.setAt))).toBe(false)
    expect(res._body.consent).toMatchObject({ on: true, setBy: MANAGER })
  })

  // The History card: every switch is kept on the record, oldest first, signed from the
  // token. The store's version history cannot supply this — it keeps who saved and when,
  // not what was saved.
  test('appends this switch to the events the record already holds, signed from the token', async () => {
    overlay.loadFirmConfig.mockResolvedValue(stored({ on: true }))
    const res = makeRes()
    await routes.set(req({ body: { on: false, by: 'impostor@x' } }), res)
    const value = overlay.saveFirmConfig.mock.calls[0][2]
    expect(value.events).toHaveLength(2)
    expect(value.events[0]).toEqual(stored().events[0])
    expect(value.events[1]).toMatchObject({ on: false, by: MANAGER, at: value.setAt })
    expect(res._body.consent.events).toHaveLength(2)
  })

  test('the first switch has no withdrawals and is the first event', async () => {
    const res = makeRes()
    await routes.set(req({ body: { on: false } }), res)
    expect(overlay.saveFirmConfig.mock.calls[0][2]).toMatchObject({ on: false, withdrawals: [], events: [{ on: false, by: MANAGER }] })
  })

  test.each([['a string', 'true'], ['a number', 1], ['missing', undefined], ['no body at all', null]])('refuses on as %s with 400 before reading', async (_l, on) => {
    const res = makeRes()
    await routes.set(req({ body: on === null ? undefined : { on } }), res)
    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('INVALID_CONSENT')
    expect(overlay.loadFirmConfig).not.toHaveBeenCalled()
  })

  test('refuses an unnamed caller with 403, because an unnamed consent is not a consent', async () => {
    const res = makeRes()
    await routes.set(req({ userEmail: undefined, body: { on: true } }), res)
    expect(res._status).toBe(403)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('a store failure is the safe error shape', async () => {
    overlay.saveFirmConfig.mockRejectedValue(new Error('boom'))
    const res = makeRes()
    await routes.set(req({ body: { on: true } }), res)
    expect(res._status).toBe(500)
    expect(res._body.error.code).toBe('DB_ERROR')
  })
})

describe('withdraw', () => {
  test("deletes exactly this firm's prefix at the platform scope, appends the withdrawal, recomputes, returns removed", async () => {
    overlay.deleteFirmConfigsByPrefix.mockResolvedValue(12)
    overlay.loadFirmConfig.mockResolvedValue(stored())
    const res = makeRes()
    await routes.withdraw(req({ body: { confirm: true, firmId: 'someone-else' } }), res)
    expect(overlay.deleteFirmConfigsByPrefix).toHaveBeenCalledTimes(1)
    expect(overlay.deleteFirmConfigsByPrefix).toHaveBeenCalledWith(PLATFORM_SCOPE, 'outcome-pool:' + token + ':')
    const [scope, key, value, by] = overlay.saveFirmConfig.mock.calls[0]
    expect(scope).toBe(FIRM)
    expect(key).toBe(CONFIG_KEY)
    expect(by).toBe(MANAGER)
    expect(value.on).toBe(true)
    expect(value.withdrawals).toHaveLength(2)
    expect(value.withdrawals[1]).toMatchObject({ requestedBy: MANAGER, removed: 12 })
    expect(recomputeAndPersist).toHaveBeenCalledWith(MANAGER)
    expect(res._status).toBe(200)
    expect(res._body).toMatchObject({ success: true, removed: 12 })
    expect(res._body.consent.withdrawals).toHaveLength(2)
  })

  test('with no consent record the rows are still deleted and nothing is written', async () => {
    overlay.deleteFirmConfigsByPrefix.mockResolvedValue(0)
    const res = makeRes()
    await routes.withdraw(req({ body: { confirm: true } }), res)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
    expect(res._body).toEqual({ success: true, removed: 0, consent: null })
  })

  test('a recompute failure is logged and the withdrawal still reports success', async () => {
    overlay.deleteFirmConfigsByPrefix.mockResolvedValue(4)
    recomputeAndPersist.mockRejectedValue(new Error('boom'))
    const res = makeRes()
    await routes.withdraw(req({ body: { confirm: true } }), res)
    expect(res._status).toBe(200)
    expect(res._body.removed).toBe(4)
    expect(console.error).toHaveBeenCalled()
  })

  test.each([['missing', undefined], ['the string "true"', 'true'], ['false', false], ['no body at all', null]])('refuses confirm %s with 400 before deleting', async (_l, confirm) => {
    const res = makeRes()
    await routes.withdraw(req({ body: confirm === null ? undefined : { confirm } }), res)
    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('CONFIRM_REQUIRED')
    expect(overlay.deleteFirmConfigsByPrefix).not.toHaveBeenCalled()
  })

  test('refuses an unnamed caller with 403 before deleting', async () => {
    const res = makeRes()
    await routes.withdraw(req({ userEmail: '', body: { confirm: true } }), res)
    expect(res._status).toBe(403)
    expect(overlay.deleteFirmConfigsByPrefix).not.toHaveBeenCalled()
  })

  test('without a pool secret it is 503 POOL_UNAVAILABLE and nothing is deleted', async () => {
    delete process.env.OUTCOME_POOL_SECRET
    const res = makeRes()
    await routes.withdraw(req({ body: { confirm: true } }), res)
    expect(res._status).toBe(503)
    expect(res._body.error.code).toBe('POOL_UNAVAILABLE')
    expect(overlay.deleteFirmConfigsByPrefix).not.toHaveBeenCalled()
  })

  test('a store failure is the safe error shape', async () => {
    overlay.deleteFirmConfigsByPrefix.mockRejectedValue(new Error('ER_LOCK_DEADLOCK'))
    const res = makeRes()
    await routes.withdraw(req({ body: { confirm: true } }), res)
    expect(res._status).toBe(500)
    expect(res._body).toMatchObject({ success: false, error: { code: 'DB_ERROR' } })
  })
})
