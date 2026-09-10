'use strict'

/**
 * The BUSINESS-ENTITY LEVEL — the routes. Second half of slice 4 of
 * design/MEETING-TYPES-CASCADE.md §7, drawn as design/mockups/meeting-preset-client-level.html
 * and ruled by Mike 2026-09-10 (five questions; the fifth removed the manager's screen).
 *
 * 🔴 WHAT MATTERS AND IS INVISIBLE IN UAT:
 *
 *   1. THE CLIENT IS CHECKED AGAINST THE CALLER'S FIRM ON EVERY CALL. Another firm's client
 *      id is a 404 and never a read or a write. On screen a route that trusted the id would
 *      look identical from the caller's own seat.
 *   2. WHO SET IT COMES FROM THE TOKEN, NEVER THE BODY. Question 4 puts a name beside every
 *      entry and question 3 lets any advisor write; a body-supplied name would let anyone
 *      sign a colleague's name to a decision.
 *   3. ONE SHARED ROW PER CLIENT (question 1): two advisors write the same key, and neither
 *      the advisor's own row nor the firm's list is touched.
 *   4. A DECLINE IS REFUSED FOR A POINT THE FIRM DOES NOT OFFER, so a stray string cannot
 *      sit in the firm's configuration for ever.
 *   5. A LIVE MySQL REFUSAL IS A 500, never a fall-through to the dev file.
 */

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  loadFirmConfigsByPrefix: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))
jest.mock('../../server/utils/clientStore', () => ({
  getById: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const clientStore = require('../../server/utils/clientStore')
const routes = require('../../server/routes/meetingObservationsEntity')
const { CONFIG_KEYS, entityConfigKey, MAX_OWN_POINTS_PER_SCENARIO } = require('../../server/utils/meetingObservationsEntity')
const { advisorConfigKey } = require('../../server/utils/meetingObservationsAdvisor')

const EOY = 'eoy_meeting'
const FIRM = 'firm-test-123'
const OTHER_FIRM = 'firm-other-999'
const CLIENT = 'client-42'
const ME = 'adv-me'
const COLLEAGUE = 'adv-colleague'

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
function errorBody (res) { return typeof res._body === 'string' ? JSON.parse(res._body) : res._body }
function refusal (message) {
  return Object.assign(new Error(message), { code: 'ER_NO_REFERENCED_ROW_2', sqlState: '23000' })
}
function makeReq (overrides = {}) {
  return {
    firmId: FIRM,
    advisorId: ME,
    advisorName: 'Ruth Kelleher',
    query: {},
    params: {},
    body: {},
    headers: {},
    ...overrides
  }
}

/** The register: CLIENT belongs to FIRM and to nobody else. */
function registerClient () {
  clientStore.getById.mockImplementation((id, firmId) => {
    return Promise.resolve((id === CLIENT && firmId === FIRM) ? { id: CLIENT, name: 'Harbourside Joinery Ltd' } : null)
  })
}

/** Stored config, keyed by `scope|key`. Anything else is null (platform defaults resolve). */
function storeWith (map) {
  overlay.loadFirmConfig.mockImplementation((scope, key) => {
    const hit = map[scope + '|' + key]
    return Promise.resolve(hit === undefined ? null : hit)
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  overlay.loadFirmConfigsByPrefix.mockResolvedValue({})
  overlay.saveFirmConfig.mockResolvedValue(undefined)
  storeWith({})
  registerClient()
})

describe('GET /api/meeting/observations/client/:clientId', () => {
  test('answers the client, the firm list with the advisor layer and the client layer applied', async () => {
    storeWith({
      [FIRM + '|' + advisorConfigKey('advisorDeclines', ME)]: { scenarios: { [EOY]: ['mo-eoy-2'] } },
      [FIRM + '|' + entityConfigKey('entityDeclines', CLIENT)]: { scenarios: { [EOY]: [{ id: 'mo-eoy-1', byId: COLLEAGUE, byName: 'Tom Boyd', at: 'x' }] } },
      [FIRM + '|' + entityConfigKey('entityOwn', CLIENT)]: { scenarios: { [EOY]: [{ id: 'eo-1', text: 'Raise succession gently.', hintWords: [], byId: COLLEAGUE, byName: 'Tom Boyd', at: 'x' }] } }
    })
    const req = makeReq({ params: { clientId: CLIENT }, query: { scenario: EOY } })
    const res = makeMockRes()
    await routes.getForClient(req, res)
    expect(res._status).toBe(200)
    expect(res._body.client).toEqual({ id: CLIENT, name: 'Harbourside Joinery Ltd' })
    const s = res._body.scenarios[0]
    const ids = s.points.map(p => p.id)
    expect(ids).not.toContain('mo-eoy-1') // set aside for this client
    expect(ids).not.toContain('mo-eoy-2') // set aside by the advisor for all their meetings
    expect(ids).toContain('eo-1')
    const own = s.points.find(p => p.id === 'eo-1')
    expect(own.sourceTier).toBe('client')
    expect(own.setBy.byName).toBe('Tom Boyd')
    expect(s.setAside.map(p => p.id)).toEqual(['mo-eoy-1'])
    expect(s.setAside[0].setAsideLabel).toContain('Tom Boyd')
    expect(res._body.maxOwnPerScenario).toBe(MAX_OWN_POINTS_PER_SCENARIO)
  })

  test('🔴 another firm\'s client is a 404, and nothing is read for it', async () => {
    const req = makeReq({ firmId: OTHER_FIRM, params: { clientId: CLIENT } })
    const res = makeMockRes()
    await routes.getForClient(req, res)
    expect(res._status).toBe(404)
    const entityReads = overlay.loadFirmConfig.mock.calls.filter(c => String(c[1]).indexOf('meeting-observation-entity') === 0)
    expect(entityReads.length).toBe(0)
  })

  test('an unknown scenario is a 404 before the register is consulted', async () => {
    const req = makeReq({ params: { clientId: CLIENT }, query: { scenario: 'nope' } })
    const res = makeMockRes()
    await routes.getForClient(req, res)
    expect(res._status).toBe(404)
    expect(clientStore.getById).not.toHaveBeenCalled()
  })

  test('a live MySQL refusal is a 500, not the dev file', async () => {
    overlay.loadFirmConfig.mockRejectedValue(refusal('refused'))
    const req = makeReq({ params: { clientId: CLIENT } })
    const res = makeMockRes()
    await routes.getForClient(req, res)
    expect(res._status).toBe(500)
    expect(errorBody(res).error.code).toBe('SERVER_ERROR')
  })
})

describe('POST /api/meeting/observations/client/decline', () => {
  test('🔴 writes the CLIENT\'s row, stamped with the caller from the token, never a body name', async () => {
    const req = makeReq({ body: { clientId: CLIENT, scenario: EOY, pointId: 'mo-eoy-1', declined: true, byName: 'Somebody Else', byId: COLLEAGUE } })
    const res = makeMockRes()
    await routes.setClientDecline(req, res)
    expect(res._status).toBe(200)
    expect(overlay.saveFirmConfig).toHaveBeenCalledTimes(1)
    const [scope, key, value, savedBy] = overlay.saveFirmConfig.mock.calls[0]
    expect(scope).toBe(FIRM)
    expect(key).toBe(CONFIG_KEYS.entityDeclines + ':' + CLIENT)
    expect(savedBy).toBe(ME)
    expect(value.scenarios[EOY][0].id).toBe('mo-eoy-1')
    expect(value.scenarios[EOY][0].byId).toBe(ME)
    expect(value.scenarios[EOY][0].byName).toBe('Ruth Kelleher')
    expect(typeof value.scenarios[EOY][0].at).toBe('string')
  })

  test('🔴 question 1: a colleague\'s decline lands in the same shared row', async () => {
    storeWith({
      [FIRM + '|' + entityConfigKey('entityDeclines', CLIENT)]: { scenarios: { [EOY]: [{ id: 'mo-eoy-1', byId: ME, byName: 'Ruth Kelleher', at: 'x' }] } }
    })
    const req = makeReq({ advisorId: COLLEAGUE, advisorName: 'Tom Boyd', body: { clientId: CLIENT, scenario: EOY, pointId: 'mo-eoy-2', declined: true } })
    const res = makeMockRes()
    await routes.setClientDecline(req, res)
    expect(res._status).toBe(200)
    const [, key, value] = overlay.saveFirmConfig.mock.calls[0]
    expect(key).toBe(CONFIG_KEYS.entityDeclines + ':' + CLIENT)
    expect(value.scenarios[EOY].map(d => d.id + '/' + d.byName)).toEqual(['mo-eoy-1/Ruth Kelleher', 'mo-eoy-2/Tom Boyd'])
    // Neither the firm's own list nor any advisor's row was written.
    overlay.saveFirmConfig.mock.calls.forEach(([, k]) => {
      expect(k.indexOf('meeting-observation-entity-')).toBe(0)
    })
  })

  test('putting a point back removes the entry, and an emptied scenario leaves no key', async () => {
    storeWith({
      [FIRM + '|' + entityConfigKey('entityDeclines', CLIENT)]: { scenarios: { [EOY]: [{ id: 'mo-eoy-1', byId: ME, byName: 'Ruth Kelleher', at: 'x' }] } }
    })
    const req = makeReq({ body: { clientId: CLIENT, scenario: EOY, pointId: 'mo-eoy-1', declined: false } })
    const res = makeMockRes()
    await routes.setClientDecline(req, res)
    expect(res._status).toBe(200)
    expect(res._body.declines).toEqual([])
    expect(overlay.saveFirmConfig.mock.calls[0][2].scenarios[EOY]).toBeUndefined()
  })

  test('a decline for a point the firm does not offer is a 404 and writes nothing', async () => {
    const req = makeReq({ body: { clientId: CLIENT, scenario: EOY, pointId: 'made-up', declined: true } })
    const res = makeMockRes()
    await routes.setClientDecline(req, res)
    expect(res._status).toBe(404)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('another firm\'s client is a 404 and writes nothing', async () => {
    const req = makeReq({ firmId: OTHER_FIRM, body: { clientId: CLIENT, scenario: EOY, pointId: 'mo-eoy-1', declined: true } })
    const res = makeMockRes()
    await routes.setClientDecline(req, res)
    expect(res._status).toBe(404)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('validation: scenario, pointId and declined are each required', async () => {
    for (const body of [
      { clientId: CLIENT, scenario: 'nope', pointId: 'mo-eoy-1', declined: true },
      { clientId: CLIENT, scenario: EOY, pointId: '', declined: true },
      { clientId: CLIENT, scenario: EOY, pointId: 'mo-eoy-1', declined: 'yes' }
    ]) {
      const res = makeMockRes()
      await routes.setClientDecline(makeReq({ body }), res)
      expect([400, 404]).toContain(res._status)
    }
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('no advisor on the token is a 403', async () => {
    const res = makeMockRes()
    await routes.setClientDecline(makeReq({ advisorId: null, body: { clientId: CLIENT, scenario: EOY, pointId: 'mo-eoy-1', declined: true } }), res)
    expect(res._status).toBe(403)
  })

  test('a live MySQL refusal on the write is a 500', async () => {
    overlay.saveFirmConfig.mockRejectedValue(refusal('refused'))
    const res = makeMockRes()
    await routes.setClientDecline(makeReq({ body: { clientId: CLIENT, scenario: EOY, pointId: 'mo-eoy-1', declined: true } }), res)
    expect(res._status).toBe(500)
  })
})

describe('the client\'s own points', () => {
  test('add: minted under the client prefix, stamped with the caller, cannotHear and hints kept', async () => {
    const req = makeReq({ body: { clientId: CLIENT, scenario: EOY, text: 'Raise succession gently.', hintWords: ['succession'], cannotHear: true } })
    const res = makeMockRes()
    await routes.addClientPoint(req, res)
    expect(res._status).toBe(200)
    expect(res._body.point.id).toBe('eo-1')
    expect(res._body.point.cannotHear).toBe(true)
    expect(res._body.point.hintWords).toEqual(['succession'])
    expect(res._body.point.byName).toBe('Ruth Kelleher')
    const [scope, key, value, savedBy] = overlay.saveFirmConfig.mock.calls[0]
    expect(scope).toBe(FIRM)
    expect(key).toBe(CONFIG_KEYS.entityOwn + ':' + CLIENT)
    expect(savedBy).toBe(ME)
    expect(value.nextSeq[EOY]).toBe(1)
  })

  test('add: a removed id is never reissued', async () => {
    storeWith({
      [FIRM + '|' + entityConfigKey('entityOwn', CLIENT)]: { scenarios: {}, nextSeq: { [EOY]: 4 } }
    })
    const res = makeMockRes()
    await routes.addClientPoint(makeReq({ body: { clientId: CLIENT, scenario: EOY, text: 'Again.' } }), res)
    expect(res._status).toBe(200)
    expect(res._body.point.id).toBe('eo-5')
  })

  test('add: the cap holds', async () => {
    const rows = []
    for (let i = 1; i <= MAX_OWN_POINTS_PER_SCENARIO; i++) { rows.push({ id: 'eo-' + i, text: 'p' + i }) }
    storeWith({ [FIRM + '|' + entityConfigKey('entityOwn', CLIENT)]: { scenarios: { [EOY]: rows } } })
    const res = makeMockRes()
    await routes.addClientPoint(makeReq({ body: { clientId: CLIENT, scenario: EOY, text: 'One more.' } }), res)
    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('add: a malformed point is a 400, and another firm\'s client a 404', async () => {
    let res = makeMockRes()
    await routes.addClientPoint(makeReq({ body: { clientId: CLIENT, scenario: EOY, text: '' } }), res)
    expect(res._status).toBe(400)
    res = makeMockRes()
    await routes.addClientPoint(makeReq({ body: { clientId: CLIENT, scenario: EOY, text: 'x', hintWords: 'not a list' } }), res)
    expect(res._status).toBe(400)
    res = makeMockRes()
    await routes.addClientPoint(makeReq({ firmId: OTHER_FIRM, body: { clientId: CLIENT, scenario: EOY, text: 'Fine.' } }), res)
    expect(res._status).toBe(404)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('🔴 question 3: a colleague may edit a point somebody else added, and the entry is restamped with the editor', async () => {
    storeWith({
      [FIRM + '|' + entityConfigKey('entityOwn', CLIENT)]: { scenarios: { [EOY]: [{ id: 'eo-1', text: 'Old.', hintWords: [], byId: ME, byName: 'Ruth Kelleher', at: 'x' }] }, nextSeq: { [EOY]: 1 } }
    })
    const req = makeReq({ advisorId: COLLEAGUE, advisorName: 'Tom Boyd', body: { clientId: CLIENT, scenario: EOY, pointId: 'eo-1', text: 'New.' } })
    const res = makeMockRes()
    await routes.updateClientPoint(req, res)
    expect(res._status).toBe(200)
    const value = overlay.saveFirmConfig.mock.calls[0][2]
    expect(value.scenarios[EOY][0]).toMatchObject({ id: 'eo-1', text: 'New.', byId: COLLEAGUE, byName: 'Tom Boyd' })
    expect(value.nextSeq[EOY]).toBe(1)
  })

  test('update: an unknown id is a 404, never a silent create', async () => {
    const res = makeMockRes()
    await routes.updateClientPoint(makeReq({ body: { clientId: CLIENT, scenario: EOY, pointId: 'eo-9', text: 'New.' } }), res)
    expect(res._status).toBe(404)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('remove: drops the point, keeps the high-water mark, and empties the scenario', async () => {
    storeWith({
      [FIRM + '|' + entityConfigKey('entityOwn', CLIENT)]: { scenarios: { [EOY]: [{ id: 'eo-3', text: 'Only.', hintWords: [] }] }, nextSeq: { [EOY]: 3 } }
    })
    const res = makeMockRes()
    await routes.deleteClientPoint(makeReq({ body: { clientId: CLIENT, scenario: EOY, pointId: 'eo-3' } }), res)
    expect(res._status).toBe(200)
    const value = overlay.saveFirmConfig.mock.calls[0][2]
    expect(value.scenarios[EOY]).toBeUndefined()
    expect(value.nextSeq[EOY]).toBe(3)
  })

  test('remove: an unknown id is a 404', async () => {
    const res = makeMockRes()
    await routes.deleteClientPoint(makeReq({ body: { clientId: CLIENT, scenario: EOY, pointId: 'eo-9' } }), res)
    expect(res._status).toBe(404)
  })
})

describe('loadEntityState', () => {
  test('no client means empty state and no read', async () => {
    const state = await routes.loadEntityState(FIRM, null)
    expect(state).toEqual({ declines: {}, own: {} })
    expect(overlay.loadFirmConfig).not.toHaveBeenCalled()
  })
})
