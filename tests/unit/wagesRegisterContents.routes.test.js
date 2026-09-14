'use strict'

/**
 * /api/wages-register/:clientId — the register's CONTENTS (item 4.104).
 *
 * 🔴 WHAT UAT CANNOT SEE, AND THIS IS THE WHOLE REASON THE FILE EXISTS. A tester drives a
 * screen that only renders the register when the gate says open, so on screen the gate always
 * looks enforced. These assertions call the routes directly, which is what an unhappy former
 * employee's lawyer — or anyone with the URL and a token — would be doing. Both routes must
 * re-resolve the gate from the LIVE case every time: a case that has left the due-diligence
 * domain stops serving named employees immediately, not when somebody remembers to switch it
 * off. Decision 6: *"it is not a permanent property of the client."*
 */
jest.mock('../../server/utils/clientStore', () => ({ getById: jest.fn() }))
jest.mock('../../server/utils/caseStore', () => ({ listForClient: jest.fn() }))
jest.mock('../../server/utils/wagesRegisterGate', () => {
  const actual = jest.requireActual('../../server/utils/wagesRegisterGate')
  return Object.assign({}, actual, { readSwitch: jest.fn() })
})
jest.mock('../../server/utils/wagesRegisterStore', () => {
  const actual = jest.requireActual('../../server/utils/wagesRegisterStore')
  return Object.assign({}, actual, { read: jest.fn(), save: jest.fn() })
})
jest.mock('../../server/utils/firmOverlay', () => ({ loadFirmConfig: jest.fn(), saveFirmConfig: jest.fn() }))

const clientStore = require('../../server/utils/clientStore')
const caseStore = require('../../server/utils/caseStore')
const gate = require('../../server/utils/wagesRegisterGate')
const store = require('../../server/utils/wagesRegisterStore')
const overlay = require('../../server/utils/firmOverlay')
const routes = require('../../server/routes/wagesRegister')

const DD_CASE = { id: 'case-1', title: 'Acquisition of Kinetic Planning (2007) Limited', domain: 'due-diligence' }
const OTHER_CASE = { id: 'case-2', title: 'Margin review', domain: 'profitability-and-feasibility' }
const OPENED = { openedBy: { name: 'M. Bartlett', email: 'mike@advisor-e.com' }, openedAt: '2026-09-14T02:00:00.000Z' }

const TEAM = [
  { name: 'Mary G', division: 'Admin', payRate: 19.95 },
  { name: 'Bruce', division: 'Production', payRate: 40.28 }
]

function makeMockRes () {
  // `sendError` writes through writeHead/end, the success path through send — both are here
  // for the same reason the gate's own route test carries both.
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { try { this._body = JSON.parse(body) } catch (e) { this._body = body } }
  }
}

function advisorReq (over) {
  return Object.assign({
    firmId: 'firm-from-jwt',
    advisorId: 'adv-from-jwt',
    advisorName: 'M. Bartlett',
    userEmail: 'mike@advisor-e.com',
    params: { clientId: 'c-1' },
    body: {}
  }, over)
}

/** The happy path: a client, a due-diligence case, and the register switched on. */
function registerIsOpen () {
  clientStore.getById.mockResolvedValue({ id: 'c-1', name: 'Kinetic Planning' })
  caseStore.listForClient.mockResolvedValue([DD_CASE])
  gate.readSwitch.mockResolvedValue(OPENED)
}

beforeEach(() => {
  clientStore.getById.mockReset()
  caseStore.listForClient.mockReset()
  gate.readSwitch.mockReset()
  store.read.mockReset()
  store.save.mockReset()
  overlay.loadFirmConfig.mockReset()
  overlay.loadFirmConfig.mockResolvedValue(null)
  store.read.mockResolvedValue({ hoursInLeaveDay: 8, people: [], savedAt: null, savedBy: null })
  store.save.mockResolvedValue({ hoursInLeaveDay: 8, savedAt: '2026-09-15T02:00:00.000Z', savedBy: 'mike@advisor-e.com' })
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => { console.error.mockRestore() })

describe('POST /api/wages-register/:clientId/view', () => {
  it('serves the register, priced, when the gate is open', async () => {
    registerIsOpen()
    store.read.mockResolvedValue({
      hoursInLeaveDay: 8,
      people: [{ key: 'production|bruce|1', name: 'Bruce', accruedLeaveDays: 16, yearsEmployed: 5, band: 'direct-loss' }],
      savedAt: null,
      savedBy: null
    })
    const res = makeMockRes()
    await routes.viewRegister(advisorReq({ body: { team: TEAM } }), res)
    expect(res._status).toBe(200)
    expect(res._body.rows).toHaveLength(2)
    // 40.28 x 8 x 16
    expect(res._body.rows.find(r => r.name === 'Bruce').liability).toBe(5155.84)
    // Mary G has no accrued balance: not yet priced, never a confident zero.
    expect(res._body.rows.find(r => r.name === 'Mary G').liability).toBeNull()
    expect(res._body.summary.total.priced).toBe(1)
    // The HEADCOUNT, not the number of people somebody has got round to rating. Mary G is
    // unrated and is still a person on the register.
    expect(res._body.summary.total.people).toBe(2)
    expect(res._body.summary.unrated.people).toBe(1)
  })

  it('🔴 REFUSES when the case has left the due-diligence domain', async () => {
    clientStore.getById.mockResolvedValue({ id: 'c-1', name: 'Kinetic Planning' })
    caseStore.listForClient.mockResolvedValue([OTHER_CASE])
    const res = makeMockRes()
    await routes.viewRegister(advisorReq({ body: { team: TEAM } }), res)
    expect(res._status).toBe(403)
    expect(res._body.error.code).toBe('REGISTER_NOT_OPEN')
    // And nothing was even read.
    expect(store.read).not.toHaveBeenCalled()
  })

  it('🔴 REFUSES when a due-diligence case stands but nobody switched it on', async () => {
    clientStore.getById.mockResolvedValue({ id: 'c-1', name: 'Kinetic Planning' })
    caseStore.listForClient.mockResolvedValue([DD_CASE])
    gate.readSwitch.mockResolvedValue(null)
    const res = makeMockRes()
    await routes.viewRegister(advisorReq({ body: { team: TEAM } }), res)
    expect(res._status).toBe(403)
    expect(store.read).not.toHaveBeenCalled()
  })

  it('🔴 REFUSES once the register has been closed again', async () => {
    clientStore.getById.mockResolvedValue({ id: 'c-1', name: 'Kinetic Planning' })
    caseStore.listForClient.mockResolvedValue([DD_CASE])
    gate.readSwitch.mockResolvedValue(Object.assign({}, OPENED, {
      closedBy: { name: 'M. Bartlett', email: 'mike@advisor-e.com' },
      closedAt: '2026-09-15T02:00:00.000Z'
    }))
    const res = makeMockRes()
    await routes.viewRegister(advisorReq({ body: { team: TEAM } }), res)
    expect(res._status).toBe(403)
  })

  it('reports a client of another firm as absent, not as forbidden', async () => {
    clientStore.getById.mockResolvedValue(null)
    const res = makeMockRes()
    await routes.viewRegister(advisorReq({ body: { team: TEAM } }), res)
    expect(res._status).toBe(404)
  })

  it('refuses a session that does not identify a firm', async () => {
    const res = makeMockRes()
    await routes.viewRegister(advisorReq({ firmId: null }), res)
    expect(res._status).toBe(403)
    expect(res._body.error.code).toBe('NO_FIRM_IDENTITY')
  })

  it('carries the CALLING advisor into the case lookup', async () => {
    // A colleague's private due-diligence case must not open this advisor's register.
    registerIsOpen()
    await routes.viewRegister(advisorReq({ body: { team: TEAM } }), makeMockRes())
    expect(caseStore.listForClient).toHaveBeenCalledWith('adv-from-jwt', 'firm-from-jwt', 'c-1')
  })

  it('prices nothing at all when the firm has not set hours in a leave day', async () => {
    registerIsOpen()
    store.read.mockResolvedValue({
      hoursInLeaveDay: null,
      people: [{ name: 'Bruce', accruedLeaveDays: 16, band: 'direct-loss' }],
      savedAt: null,
      savedBy: null
    })
    const res = makeMockRes()
    await routes.viewRegister(advisorReq({ body: { team: TEAM } }), res)
    expect(res._body.summary.total.priced).toBe(0)
    expect(res._body.rows.find(r => r.name === 'Bruce').liability).toBeNull()
  })

  it('answers with an empty register rather than failing when step 1 has no team yet', async () => {
    registerIsOpen()
    const res = makeMockRes()
    await routes.viewRegister(advisorReq({ body: {} }), res)
    expect(res._status).toBe(200)
    expect(res._body.rows).toEqual([])
  })

  it('carries the retention DATE, counted from the opening', async () => {
    registerIsOpen()
    const res = makeMockRes()
    await routes.viewRegister(advisorReq({ body: { team: TEAM } }), res)
    // Platform default is 84 months from the 2026-09-14 opening.
    expect(res._body.retention.months).toBe(84)
    expect(res._body.retention.keptUntil.slice(0, 7)).toBe('2033-09')
  })

  it('reports a storage failure as a generic error, never a stack trace', async () => {
    registerIsOpen()
    store.read.mockRejectedValue(new Error('ER_NO_SUCH_TABLE: firm_framework_versions'))
    const res = makeMockRes()
    await routes.viewRegister(advisorReq({ body: { team: TEAM } }), res)
    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toMatch(/ER_NO_SUCH_TABLE/)
  })
})

describe('PUT /api/wages-register/:clientId', () => {
  it('saves what was typed, attributing it to the verified token', async () => {
    registerIsOpen()
    const res = makeMockRes()
    await routes.saveRegister(advisorReq({
      body: { hoursInLeaveDay: 8, people: [{ name: 'Bruce', accruedLeaveDays: 16 }] }
    }), res)
    expect(res._status).toBe(200)
    expect(store.save).toHaveBeenCalledWith(
      'firm-from-jwt', 'c-1', expect.any(Object), 'mike@advisor-e.com'
    )
  })

  it('🔴 REFUSES to write when the gate is not open', async () => {
    clientStore.getById.mockResolvedValue({ id: 'c-1', name: 'Kinetic Planning' })
    caseStore.listForClient.mockResolvedValue([OTHER_CASE])
    const res = makeMockRes()
    await routes.saveRegister(advisorReq({ body: { people: [{ name: 'Bruce' }] } }), res)
    expect(res._status).toBe(403)
    expect(store.save).not.toHaveBeenCalled()
  })

  it('refuses a session that does not identify a firm', async () => {
    const res = makeMockRes()
    await routes.saveRegister(advisorReq({ firmId: null }), res)
    expect(res._status).toBe(403)
  })

  it('reports a client of another firm as absent', async () => {
    clientStore.getById.mockResolvedValue(null)
    const res = makeMockRes()
    await routes.saveRegister(advisorReq({}), res)
    expect(res._status).toBe(404)
  })

  it('reports an unkeyable client id as a bad request', async () => {
    registerIsOpen()
    store.save.mockRejectedValue(Object.assign(new Error('bad key'), { code: 'BAD_CLIENT' }))
    const res = makeMockRes()
    await routes.saveRegister(advisorReq({}), res)
    expect(res._status).toBe(400)
  })

  it('reports a storage failure as a generic error', async () => {
    registerIsOpen()
    store.save.mockRejectedValue(new Error('ER_LOCK_WAIT_TIMEOUT'))
    const res = makeMockRes()
    await routes.saveRegister(advisorReq({}), res)
    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toMatch(/ER_LOCK_WAIT/)
  })
})
