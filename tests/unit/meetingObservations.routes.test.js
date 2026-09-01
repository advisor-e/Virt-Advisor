'use strict'

/**
 * The Meeting Review observation-point routes — slice 1 of the feature Mike asked for on
 * 2026-09-01. Design `design/features/meeting-review.md` §3; artefact
 * `design/mockups/meeting-review.html` Stage A and B1, approved 2026-09-01.
 *
 * 🔴 THE THREE THAT MATTER, and none of them is visible to a person testing in UAT:
 *
 *   1. AN ID NEVER COMES FROM THE BROWSER. `addOwnPoint` mints the id itself. A body-
 *      supplied id could collide with an inherited point and silently replace it, and
 *      every decline and override in the mechanism is keyed to an id.
 *
 *   2. EVERY ROUTE IS SCOPED TO `req.firmId`, THE VERIFIED SCOPE FROM THE JWT. No handler
 *      reads a scope from a body or a query, so one tier cannot touch another's points
 *      even if it asks to. `tier-cascade.md` P6.
 *
 *   3. AN ADVISOR CANNOT WRITE. The advisor route is read-only by construction — there is
 *      no write handler for them to reach — because one advisor editing the standing list
 *      would change what every advisor in the firm is checked on.
 *
 * The fourth theme is the storage discipline the house already has: a live MySQL REFUSAL
 * must surface as a 500 and never fall through to the dev JSON, or an outage gets signed
 * off as "this firm has no override" (see `server/utils/dbFailure.js`).
 */

// firmOverlay is the production persistence path — mocked so tests never touch MySQL.
jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const routes = require('../../server/routes/meetingObservations')
const { CONFIG_KEYS } = require('../../server/utils/meetingObservations')

const EOY = 'eoy_meeting'
const FIRM = 'firm-test-123'

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

/**
 * The error envelope, whichever way the handler wrote it. `sendError` goes out through
 * `writeHead`/`end`, so the body is a JSON STRING — reading `res._body.error` off it
 * silently yields `undefined` and an assertion that passes for the wrong reason.
 */
function errorBody (res) {
  return typeof res._body === 'string' ? JSON.parse(res._body) : res._body
}

/**
 * A failure a LIVE MySQL answered and refused. The `sqlState` is the whole point:
 * `dbFailure.devFallbackAllowed` treats an error WITHOUT one as "there is no database
 * here" and lets the dev-JSON fallback run, which is correct on a developer machine.
 */
function refusal (message) {
  return Object.assign(new Error(message), { code: 'ER_NO_REFERENCED_ROW_2', sqlState: '23000' })
}

function makeReq (overrides = {}) {
  return {
    firmId: FIRM,
    userRole: 'firm_manager',
    userEmail: 'mgr@testfirm.com',
    query: {},
    params: {},
    body: {},
    headers: {},
    ...overrides
  }
}

/** Nothing stored anywhere. */
function storeNothing () {
  overlay.loadFirmConfig.mockResolvedValue(null)
}

/** `{ configKey: value }` for this firm; every other scope reads empty. */
function storeForFirm (byKey) {
  overlay.loadFirmConfig.mockImplementation((scopeId, key) => {
    if (scopeId !== FIRM) { return Promise.resolve(null) }
    return Promise.resolve(Object.prototype.hasOwnProperty.call(byKey, key) ? byKey[key] : null)
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  overlay.saveFirmConfig.mockResolvedValue(1)
})

describe('the manager read', () => {
  test('returns every meeting scenario with the points in force', async () => {
    storeNothing()
    const res = makeMockRes()
    await routes.getForManager(makeReq(), res)
    expect(res._status).toBe(200)
    const eoy = res._body.scenarios.filter(s => s.id === EOY)[0]
    expect(eoy.points.map(p => p.id)).toEqual(['mo-eoy-1', 'mo-eoy-2', 'mo-eoy-3', 'mo-eoy-4'])
  })

  test('reports this tier as having decided nothing when it has', async () => {
    storeNothing()
    const res = makeMockRes()
    await routes.getForManager(makeReq(), res)
    expect(res._body.hasOwn).toBe(false)
  })

  test('separates what this tier set from what it inherited', async () => {
    // The split is what makes an "inherited" / "set here" badge honest: one keeps
    // receiving the level above's corrections, the other is protected from them, and on
    // screen they look identical.
    storeForFirm({ [CONFIG_KEYS.declines]: { [EOY]: ['mo-eoy-2'] } })
    const res = makeMockRes()
    await routes.getForManager(makeReq(), res)
    expect(res._body.hasOwn).toBe(true)
    expect(res._body.own.declines[EOY]).toEqual(['mo-eoy-2'])
    // Inherited is resolved from the PARENT, so it still holds the point this tier dropped.
    expect(res._body.inherited[EOY].points.map(p => p.id)).toContain('mo-eoy-2')
  })

  test('a live database refusal is a 500, never an empty list', async () => {
    overlay.loadFirmConfig.mockRejectedValue(refusal('firm row missing'))
    const res = makeMockRes()
    await routes.getForManager(makeReq(), res)
    expect(res._status).toBe(500)
  })
})

describe('editing an inherited point', () => {
  test('records only the fields the body carried', async () => {
    // Fields left out keep tracking the level above's wording rather than freezing at
    // today's text — the whole point of the mechanism.
    storeNothing()
    const res = makeMockRes()
    await routes.setPointOverride(makeReq({
      params: { scenarioId: EOY, pointId: 'mo-eoy-1' },
      body: { text: 'Our own framing check.' }
    }), res)
    expect(res._status).toBe(200)
    const [, key, value] = overlay.saveFirmConfig.mock.calls[0]
    expect(key).toBe(CONFIG_KEYS.overrides)
    expect(value[EOY]['mo-eoy-1']).toEqual({ text: 'Our own framing check.' })
  })

  test('writes against the scope from the JWT and nothing else', async () => {
    storeNothing()
    const res = makeMockRes()
    await routes.setPointOverride(makeReq({
      params: { scenarioId: EOY, pointId: 'mo-eoy-1' },
      // A body trying to name another firm. It must be ignored entirely.
      body: { text: 'x', firmId: 'someone-elses-firm' }
    }), res)
    // `firmId` is not an editable field, so the whole request fails closed rather than
    // being partly honoured.
    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('refuses a point the level above does not have', async () => {
    storeNothing()
    const res = makeMockRes()
    await routes.setPointOverride(makeReq({
      params: { scenarioId: EOY, pointId: 'mo-not-a-point' },
      body: { text: 'phantom' }
    }), res)
    expect(res._status).toBe(404)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('refuses a scenario that does not exist', async () => {
    const res = makeMockRes()
    await routes.setPointOverride(makeReq({
      params: { scenarioId: 'not_a_meeting', pointId: 'mo-eoy-1' },
      body: { text: 'x' }
    }), res)
    expect(res._status).toBe(404)
  })

  test('an empty body changes nothing rather than storing an empty edit', async () => {
    storeNothing()
    const res = makeMockRes()
    await routes.setPointOverride(makeReq({
      params: { scenarioId: EOY, pointId: 'mo-eoy-1' }, body: {}
    }), res)
    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('resetting drops this tier\'s version and is idempotent', async () => {
    storeForFirm({ [CONFIG_KEYS.overrides]: { [EOY]: { 'mo-eoy-1': { text: 'mine' } } } })
    const res = makeMockRes()
    await routes.resetPointOverride(makeReq({
      params: { scenarioId: EOY, pointId: 'mo-eoy-1' }
    }), res)
    expect(res._status).toBe(200)
    const [, , value] = overlay.saveFirmConfig.mock.calls[0]
    expect(value[EOY]).toBeUndefined()

    // Again, with nothing stored: still a 200, and no pointless write.
    jest.clearAllMocks()
    storeNothing()
    const res2 = makeMockRes()
    await routes.resetPointOverride(makeReq({
      params: { scenarioId: EOY, pointId: 'mo-eoy-1' }
    }), res2)
    expect(res2._status).toBe(200)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })
})

describe('switching an inherited point off', () => {
  test('writes only the declines key, so this tier\'s own edit survives', async () => {
    storeForFirm({ [CONFIG_KEYS.overrides]: { [EOY]: { 'mo-eoy-1': { text: 'mine' } } } })
    const res = makeMockRes()
    await routes.setPointDecline(makeReq({
      params: { scenarioId: EOY, pointId: 'mo-eoy-1' }, body: { declined: true }
    }), res)
    expect(res._status).toBe(200)
    expect(overlay.saveFirmConfig).toHaveBeenCalledTimes(1)
    expect(overlay.saveFirmConfig.mock.calls[0][1]).toBe(CONFIG_KEYS.declines)
  })

  test('switching every point off is allowed — an empty list is a legitimate state', async () => {
    // Deliberate difference from the staircase, which refuses its last decline because an
    // advisor mid-session must have a step to choose. Ten of the eleven scenarios ship
    // with no points at all, so a guard here would invent a rule the data itself breaks.
    storeForFirm({ [CONFIG_KEYS.declines]: { [EOY]: ['mo-eoy-1', 'mo-eoy-2', 'mo-eoy-3'] } })
    const res = makeMockRes()
    await routes.setPointDecline(makeReq({
      params: { scenarioId: EOY, pointId: 'mo-eoy-4' }, body: { declined: true }
    }), res)
    expect(res._status).toBe(200)
  })

  test('declined must be a boolean, not a truthy string', async () => {
    const res = makeMockRes()
    await routes.setPointDecline(makeReq({
      params: { scenarioId: EOY, pointId: 'mo-eoy-1' }, body: { declined: 'yes' }
    }), res)
    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('INVALID_DECLINED')
  })
})

describe('adding a point of this tier\'s own', () => {
  test('the id is minted here and never taken from the body', async () => {
    // 🔴 The one that matters. An id from the browser could collide with an inherited
    // point and silently replace it.
    storeNothing()
    const res = makeMockRes()
    await routes.addOwnPoint(makeReq({
      params: { scenarioId: EOY },
      body: { text: 'We raised succession.', id: 'mo-eoy-1' }
    }), res)
    expect(res._status).toBe(400)
    expect(errorBody(res).error.message).toContain('id')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('a valid point is stored under a tier-prefixed id', async () => {
    storeNothing()
    const res = makeMockRes()
    await routes.addOwnPoint(makeReq({
      params: { scenarioId: EOY }, body: { text: 'We raised succession.' }
    }), res)
    expect(res._status).toBe(201)
    expect(res._body.pointId).toBe('fm-1')
    const [, key, value] = overlay.saveFirmConfig.mock.calls[0]
    expect(key).toBe(CONFIG_KEYS.own)
    expect(value[EOY]).toEqual([{ id: 'fm-1', text: 'We raised succession.' }])
  })

  test('a point with no words is refused', async () => {
    const res = makeMockRes()
    await routes.addOwnPoint(makeReq({ params: { scenarioId: EOY }, body: { text: '   ' } }), res)
    expect(res._status).toBe(400)
  })

  test('deleting a point never lets its id be reissued', async () => {
    storeForFirm({ [CONFIG_KEYS.own]: { [EOY]: [{ id: 'fm-1', text: 'a' }, { id: 'fm-2', text: 'b' }] } })
    const res = makeMockRes()
    await routes.deleteOwnPoint(makeReq({ params: { scenarioId: EOY, pointId: 'fm-2' } }), res)
    expect(res._status).toBe(200)

    // Now add again against the post-delete state: the next id is fm-2 only if it counted
    // rows. It must be fm-3 — a reused id inherits the deleted point's declines.
    jest.clearAllMocks()
    overlay.saveFirmConfig.mockResolvedValue(1)
    storeForFirm({ [CONFIG_KEYS.own]: { [EOY]: [{ id: 'fm-1', text: 'a' }, { id: 'fm-3', text: 'c' }] } })
    const res2 = makeMockRes()
    await routes.addOwnPoint(makeReq({ params: { scenarioId: EOY }, body: { text: 'new' } }), res2)
    expect(res2._body.pointId).toBe('fm-4')
  })

  test('editing one of this tier\'s own points cannot change its id', async () => {
    storeForFirm({ [CONFIG_KEYS.own]: { [EOY]: [{ id: 'fm-1', text: 'a' }] } })
    const res = makeMockRes()
    await routes.updateOwnPoint(makeReq({
      params: { scenarioId: EOY, pointId: 'fm-1' }, body: { text: 'edited' }
    }), res)
    expect(res._status).toBe(200)
    const [, , value] = overlay.saveFirmConfig.mock.calls[0]
    expect(value[EOY]).toEqual([{ id: 'fm-1', text: 'edited' }])
  })

  test('editing a point this tier does not own is a 404', async () => {
    storeNothing()
    const res = makeMockRes()
    await routes.updateOwnPoint(makeReq({
      params: { scenarioId: EOY, pointId: 'fm-99' }, body: { text: 'x' }
    }), res)
    expect(res._status).toBe(404)
  })
})

describe('the advisor\'s read', () => {
  test('returns the points in the first person', async () => {
    storeNothing()
    const res = makeMockRes()
    await routes.getForAdvisor(makeReq({ query: { scenario: EOY } }), res)
    expect(res._status).toBe(200)
    expect(res._body.scenarios[0].points[0].text)
      .toBe('I framed the meeting — said what we would cover and why, in the first two minutes.')
  })

  test('with no scenario named it returns every one, for the picker', async () => {
    storeNothing()
    const res = makeMockRes()
    await routes.getForAdvisor(makeReq(), res)
    expect(res._body.scenarios.length).toBeGreaterThan(1)
  })

  test('a scenario that does not exist is a 404, not an empty list', async () => {
    const res = makeMockRes()
    await routes.getForAdvisor(makeReq({ query: { scenario: 'not_a_meeting' } }), res)
    expect(res._status).toBe(404)
  })

  test('there is no advisor write handler at all', () => {
    // 🔴 Read-only BY CONSTRUCTION, not by a role check that could be loosened. One
    // advisor editing the standing list would change what every advisor is checked on.
    const advisorFacing = Object.keys(routes).filter(k => /Advisor$/.test(k))
    expect(advisorFacing).toEqual(['getForAdvisor'])
  })
})

describe('version history and restore', () => {
  test('history is returned for each of the three storage keys', async () => {
    overlay.getVersionHistory.mockResolvedValue([{ id: 1, version: 1 }])
    const res = makeMockRes()
    await routes.history(makeReq(), res)
    expect(res._status).toBe(200)
    expect(Object.keys(res._body.history).sort()).toEqual(['declines', 'overrides', 'own'])
  })

  test('restore refuses a part that is not one of the three', async () => {
    const res = makeMockRes()
    await routes.restore(makeReq({ body: { part: 'everything', versionId: 3 } }), res)
    expect(res._status).toBe(400)
    expect(overlay.restoreVersion).not.toHaveBeenCalled()
  })

  test('restore requires a version id', async () => {
    const res = makeMockRes()
    await routes.restore(makeReq({ body: { part: 'own' } }), res)
    expect(res._status).toBe(400)
  })

  test('restore acts on the scope from the JWT', async () => {
    overlay.restoreVersion.mockResolvedValue(2)
    const res = makeMockRes()
    await routes.restore(makeReq({ body: { part: 'own', versionId: 3, firmId: 'elsewhere' } }), res)
    expect(res._status).toBe(200)
    expect(overlay.restoreVersion).toHaveBeenCalledWith(FIRM, CONFIG_KEYS.own, 3)
  })
})
