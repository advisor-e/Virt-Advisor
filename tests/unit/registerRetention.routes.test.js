'use strict'

/**
 * The manager's dial for how long a staff register lives — item 5.1's last piece.
 *
 * WHAT UAT CANNOT SEE, WHICH IS WHY THESE EXIST. A tester moves the control, the screen says
 * a date, and everything looks right. What a person cannot see from that screen is whether
 * the ceiling actually held, whether a rejected save left the old value intact, or whether
 * the figure they are reading is this firm's or one inherited from above. Each of those is a
 * wrong number a firm would act on, and each is pinned below.
 *
 * 🔴 THE CEILING IS THE RULING. Mike, 2026-09-23: "no more than 18months". A save above it
 * must fail at the route, not be clamped quietly — a clamp would tell a manager they had set
 * 24 months while storing 18.
 */

const routes = require('../../server/routes/registerRetentionRoutes')
const overlay = require('../../server/utils/firmOverlay')
const { parentScopeOf } = require('../../server/utils/tierChain')

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn()
}))
jest.mock('../../server/utils/tierChain', () => ({ parentScopeOf: jest.fn(() => null) }))
jest.mock('../../server/utils/dbFailure', () => ({ devFallbackAllowed: jest.fn(() => false) }))

/**
 * A response double in the shape restify hands the handlers.
 *
 * `sendError` writes through writeHead/end while the success path uses `send`, so both are
 * here — the same double `wagesRegisterContents.routes.test.js` uses, for the same reason.
 */
function makeRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { try { this._body = JSON.parse(body) } catch (e) { this._body = body } }
  }
}

const managerReq = body => ({ firmId: 'firm-1', userEmail: 'manager@firm.example', body })

beforeEach(() => {
  jest.clearAllMocks()
  parentScopeOf.mockReturnValue(null)
  overlay.loadFirmConfig.mockResolvedValue(null)
  overlay.saveFirmConfig.mockResolvedValue(undefined)
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => { console.error.mockRestore() })

describe('GET — what this firm keeps registers for', () => {
  it('falls back to the platform default when nothing is set anywhere', async () => {
    const res = makeRes()
    await routes.getRetention(managerReq(), res)
    expect(res._status).toBe(200)
    expect(res._body.resolved).toEqual({ months: 18, source: 'platform-default', setAtScope: null })
    expect(res._body.ownMonths).toBeNull()
  })

  it('serves the range a tier may choose, so the screen never hardcodes it', async () => {
    const res = makeRes()
    await routes.getRetention(managerReq(), res)
    expect(res._body.min).toBe(1)
    expect(res._body.max).toBe(18)
    expect(res._body.platformDefault).toBe(18)
  })

  // 🔴 `ownMonths` SEPARATE FROM `resolved` IS THE POINT OF THE SCREEN. Without it a manager
  // cannot tell a figure they chose from one they are living under, and "reset" means nothing.
  it('distinguishes a figure set HERE from one inherited from above', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ months: 6 })
    const res = makeRes()
    await routes.getRetention(managerReq(), res)
    expect(res._body.resolved.source).toBe('set-here')
    expect(res._body.ownMonths).toBe(6)
  })

  it('reads an inherited figure with nothing of its own', async () => {
    parentScopeOf.mockImplementation(s => (s === 'firm-1' ? 'group-1' : null))
    overlay.loadFirmConfig.mockImplementation(scope =>
      Promise.resolve(scope === 'group-1' ? { months: 3 } : null))
    const res = makeRes()
    await routes.getRetention(managerReq(), res)
    expect(res._body.resolved).toEqual({ months: 3, source: 'inherited', setAtScope: 'group-1' })
    expect(res._body.ownMonths).toBeNull()
  })

  it('reports a storage failure as a generic error, never a stack trace', async () => {
    overlay.loadFirmConfig.mockRejectedValue(new Error('ER_NO_SUCH_TABLE: firm_framework_versions'))
    const res = makeRes()
    await routes.getRetention(managerReq(), res)
    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toMatch(/ER_NO_SUCH_TABLE/)
  })
})

describe('PUT — setting the period', () => {
  it('saves a period inside the range, under the register key', async () => {
    const res = makeRes()
    await routes.setRetention(managerReq({ months: 12 }), res)
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ saved: true, months: 12, phrase: '1 year' })
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(
      'firm-1', 'register-retention', { months: 12 }, 'manager@firm.example')
  })

  // 🔴 MIKE'S RULING, ENFORCED AT THE ROUTE. A clamp would report success for a figure the
  // manager did not choose, which is worse than a refusal.
  it.each([[19], [24], [84], [240]])('REFUSES %p months and stores nothing', async (months) => {
    const res = makeRes()
    await routes.setRetention(managerReq({ months }), res)
    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  it.each([[0], [-1], [1.5], ['12'], [null], [undefined]])('refuses %p', async (months) => {
    const res = makeRes()
    await routes.setRetention(managerReq({ months }), res)
    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  it('survives a request with no body at all', async () => {
    const res = makeRes()
    await routes.setRetention({ firmId: 'firm-1', userEmail: 'm@f.example' }, res)
    expect(res._status).toBe(400)
  })

  it('reports a write failure without leaking the cause', async () => {
    overlay.saveFirmConfig.mockRejectedValue(new Error('ER_LOCK_WAIT_TIMEOUT'))
    const res = makeRes()
    await routes.setRetention(managerReq({ months: 6 }), res)
    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toMatch(/ER_LOCK_WAIT/)
  })
})

describe('DELETE — inheriting from above again', () => {
  it('clears this scope and answers with what now applies', async () => {
    const res = makeRes()
    await routes.resetRetention(managerReq(), res)
    expect(res._status).toBe(200)
    expect(res._body.reset).toBe(true)
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(
      'firm-1', 'register-retention', null, 'manager@firm.example')
    expect(res._body.resolved.source).toBe('platform-default')
  })

  // The point of resetting is to FOLLOW the level above as it changes, not to copy today's
  // number down. A reset that froze the current figure would look identical on the screen.
  it('leaves the firm following the tier above, not holding a copy of its number', async () => {
    parentScopeOf.mockImplementation(s => (s === 'firm-1' ? 'group-1' : null))
    overlay.loadFirmConfig.mockImplementation(scope =>
      Promise.resolve(scope === 'group-1' ? { months: 9 } : null))
    const res = makeRes()
    await routes.resetRetention(managerReq(), res)
    expect(res._body.resolved).toEqual({ months: 9, source: 'inherited', setAtScope: 'group-1' })
  })

  it('is idempotent — resetting a scope that set nothing still succeeds', async () => {
    const res = makeRes()
    await routes.resetRetention(managerReq(), res)
    expect(res._status).toBe(200)
  })

  it('reports a failure generically', async () => {
    overlay.saveFirmConfig.mockRejectedValue(new Error('ER_ACCESS_DENIED_ERROR'))
    const res = makeRes()
    await routes.resetRetention(managerReq(), res)
    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toMatch(/ACCESS_DENIED/)
  })
})

// 🔴 THE SEPARATION IS THE FEATURE, SO IT IS TESTED RATHER THAN TRUSTED. The meeting dial's
// period is spoken aloud to a client in approved consent wording. If these routes ever wrote
// under `meeting-retention`, a manager shortening how long staff data is kept would silently
// change a promise made out loud in a client's meeting — and both screens would still look
// correct.
describe('it can never write the MEETING dial', () => {
  it('writes under `register-retention` and never `meeting-retention`', async () => {
    await routes.setRetention(managerReq({ months: 6 }), makeRes())
    const keys = overlay.saveFirmConfig.mock.calls.map(c => c[1])
    expect(keys).toContain('register-retention')
    expect(keys).not.toContain('meeting-retention')
  })

  it('reads under `register-retention` too', async () => {
    await routes.getRetention(managerReq(), makeRes())
    const keys = overlay.loadFirmConfig.mock.calls.map(c => c[1])
    expect(keys.length).toBeGreaterThan(0)
    expect(keys).not.toContain('meeting-retention')
  })
})
