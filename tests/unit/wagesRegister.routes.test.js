'use strict'

/**
 * /api/wages-register — the seam on the staff-register gate (item 4.100, Decision 6,
 * ruled by Mike 2026-09-14).
 *
 * WHAT UAT CANNOT SEE, AND THIS PINS. A tester drives the screen and never sees the route
 * called directly. These assertions cover exactly that: that identity is the verified
 * token's and never the request's, that a client of another firm looks absent rather than
 * forbidden, that the case lookup carries the calling advisor so a colleague's private case
 * does not open the register, that a switch-on with no due-diligence case is REFUSED at the
 * route rather than only hidden on the screen, and that a closed gate does not read — or
 * report — who once opened it.
 */
jest.mock('../../server/utils/clientStore', () => ({ getById: jest.fn() }))
jest.mock('../../server/utils/caseStore', () => ({ listForClient: jest.fn() }))
jest.mock('../../server/utils/wagesRegisterGate', () => {
  const actual = jest.requireActual('../../server/utils/wagesRegisterGate')
  return Object.assign({}, actual, { readSwitch: jest.fn(), openRegister: jest.fn() })
})

const clientStore = require('../../server/utils/clientStore')
const caseStore = require('../../server/utils/caseStore')
const gate = require('../../server/utils/wagesRegisterGate')
const routes = require('../../server/routes/wagesRegister')

const DD_CASE = { id: 'case-1', title: 'Acquisition of Kinetic Planning (2007) Limited', domain: 'due-diligence' }
const OTHER_CASE = { id: 'case-2', title: 'Margin review', domain: 'profitability-and-feasibility' }
const STORED = { openedBy: { name: 'M. Bartlett', email: 'mike@advisor-e.com' }, openedAt: '2026-09-14T02:00:00.000Z' }

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

function advisorReq (over) {
  return Object.assign({
    firmId: 'firm-from-jwt',
    advisorId: 'adv-from-jwt',
    advisorName: 'M. Bartlett',
    userEmail: 'mike@advisor-e.com',
    params: {},
    body: {}
  }, over)
}

beforeEach(() => {
  clientStore.getById.mockReset()
  caseStore.listForClient.mockReset()
  gate.readSwitch.mockReset()
  gate.openRegister.mockReset()
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => { console.error.mockRestore() })

describe('GET /api/wages-register/gate/:clientId', () => {
  it('a due-diligence case and a switch-on is OPEN, carrying who and when', async () => {
    clientStore.getById.mockResolvedValue({ id: 'c-1', name: 'Kinetic Planning' })
    caseStore.listForClient.mockResolvedValue([DD_CASE])
    gate.readSwitch.mockResolvedValue(STORED)
    const res = makeMockRes()
    await routes.getGate(advisorReq({ params: { clientId: 'c-1' } }), res)
    expect(res._status).toBe(200)
    expect(res._body.gate.state).toBe('open')
    expect(res._body.gate.openedBy).toEqual(STORED.openedBy)
    expect(res._body.clientName).toBe('Kinetic Planning')
  })

  it('a due-diligence case with no switch-on is AVAILABLE, naming the case', async () => {
    clientStore.getById.mockResolvedValue({ id: 'c-1', name: 'Kinetic Planning' })
    caseStore.listForClient.mockResolvedValue([DD_CASE])
    gate.readSwitch.mockResolvedValue(null)
    const res = makeMockRes()
    await routes.getGate(advisorReq({ params: { clientId: 'c-1' } }), res)
    expect(res._body.gate.state).toBe('available')
    expect(res._body.gate.case).toEqual({ id: 'case-1', title: DD_CASE.title })
  })

  it('no due-diligence case is CLOSED, and the switch is never even read', async () => {
    // Reading it would be harmless in itself; NOT reading it is what guarantees the closed
    // answer cannot accidentally carry the old record out with it.
    clientStore.getById.mockResolvedValue({ id: 'c-1', name: 'Kinetic Planning' })
    caseStore.listForClient.mockResolvedValue([OTHER_CASE])
    const res = makeMockRes()
    await routes.getGate(advisorReq({ params: { clientId: 'c-1' } }), res)
    expect(res._body.gate.state).toBe('closed')
    expect(res._body.gate.openedBy).toBeNull()
    expect(gate.readSwitch).not.toHaveBeenCalled()
  })

  it('identity is the TOKEN\'s — firm and advisor both', async () => {
    clientStore.getById.mockResolvedValue({ id: 'c-1', name: 'Kinetic Planning' })
    caseStore.listForClient.mockResolvedValue([])
    const res = makeMockRes()
    await routes.getGate(advisorReq({
      params: { clientId: 'c-1' },
      body: { firmId: 'not-my-firm', advisorId: 'not-me' }
    }), res)
    expect(clientStore.getById).toHaveBeenCalledWith('c-1', 'firm-from-jwt')
    // The calling advisor is carried, so a colleague's PRIVATE due-diligence case does not
    // open this advisor's register — caseStore's existing boundary, not a new one.
    expect(caseStore.listForClient).toHaveBeenCalledWith('adv-from-jwt', 'firm-from-jwt', 'c-1')
  })

  it('a client of another firm is 404, exactly as if it did not exist', async () => {
    clientStore.getById.mockResolvedValue(null)
    const res = makeMockRes()
    await routes.getGate(advisorReq({ params: { clientId: 'someone-elses' } }), res)
    expect(res._status).toBe(404)
    expect(res._body.error.code).toBe('NOT_FOUND')
    expect(caseStore.listForClient).not.toHaveBeenCalled()
  })

  it('a session with no firm is refused', async () => {
    const res = makeMockRes()
    await routes.getGate(advisorReq({ firmId: null, params: { clientId: 'c-1' } }), res)
    expect(res._status).toBe(403)
    expect(res._body.error.code).toBe('NO_FIRM_IDENTITY')
  })

  it('a store failure is a 500 with no detail of what broke', async () => {
    clientStore.getById.mockRejectedValue(new Error('ER_NO_SUCH_TABLE: va_clients'))
    const res = makeMockRes()
    await routes.getGate(advisorReq({ params: { clientId: 'c-1' } }), res)
    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toContain('ER_NO_SUCH_TABLE')
  })
})

describe('POST /api/wages-register/gate/:clientId/open', () => {
  it('switches the register on and answers with the open gate', async () => {
    clientStore.getById.mockResolvedValue({ id: 'c-1', name: 'Kinetic Planning' })
    caseStore.listForClient.mockResolvedValue([DD_CASE])
    gate.openRegister.mockResolvedValue(STORED)
    const res = makeMockRes()
    await routes.openGate(advisorReq({ params: { clientId: 'c-1' } }), res)
    expect(res._status).toBe(200)
    expect(res._body.gate.state).toBe('open')
    // Who is recorded comes from the verified token, never the body.
    expect(gate.openRegister).toHaveBeenCalledWith('firm-from-jwt', 'c-1', { name: 'M. Bartlett', email: 'mike@advisor-e.com' })
  })

  it('an advisor whose token carries no name is recorded by email', async () => {
    // firmAuth sets `advisorName` to null when the token has no name on it, and this record
    // is the whole of Decision 6's "who". Falling back to the email keeps it attributable
    // rather than storing a blank where a person should be.
    clientStore.getById.mockResolvedValue({ id: 'c-1', name: 'Kinetic Planning' })
    caseStore.listForClient.mockResolvedValue([DD_CASE])
    gate.openRegister.mockResolvedValue(STORED)
    const res = makeMockRes()
    await routes.openGate(advisorReq({ params: { clientId: 'c-1' }, advisorName: null }), res)
    expect(gate.openRegister).toHaveBeenCalledWith('firm-from-jwt', 'c-1', { name: 'mike@advisor-e.com', email: 'mike@advisor-e.com' })
  })

  it('a token with neither name nor email still records the date, not a crash', async () => {
    clientStore.getById.mockResolvedValue({ id: 'c-1', name: 'Kinetic Planning' })
    caseStore.listForClient.mockResolvedValue([DD_CASE])
    gate.openRegister.mockResolvedValue(STORED)
    const res = makeMockRes()
    await routes.openGate(advisorReq({ params: { clientId: 'c-1' }, advisorName: null, userEmail: null }), res)
    expect(res._status).toBe(200)
    expect(gate.openRegister).toHaveBeenCalledWith('firm-from-jwt', 'c-1', { name: '', email: '' })
  })

  it('🔴 a switch-on with NO due-diligence case is refused by the route itself', async () => {
    // Condition 1 is not a hint to the frontend. Without this, the register opens for any
    // client by calling the route directly.
    clientStore.getById.mockResolvedValue({ id: 'c-1', name: 'Kinetic Planning' })
    caseStore.listForClient.mockResolvedValue([OTHER_CASE])
    const res = makeMockRes()
    await routes.openGate(advisorReq({ params: { clientId: 'c-1' } }), res)
    expect(res._status).toBe(403)
    expect(res._body.error.code).toBe('NO_DUE_DILIGENCE_CASE')
    expect(gate.openRegister).not.toHaveBeenCalled()
  })

  it('a client of another firm cannot be switched on', async () => {
    clientStore.getById.mockResolvedValue(null)
    const res = makeMockRes()
    await routes.openGate(advisorReq({ params: { clientId: 'someone-elses' } }), res)
    expect(res._status).toBe(404)
    expect(gate.openRegister).not.toHaveBeenCalled()
  })

  it('a session with no firm is refused', async () => {
    const res = makeMockRes()
    await routes.openGate(advisorReq({ firmId: null, params: { clientId: 'c-1' } }), res)
    expect(res._status).toBe(403)
    expect(res._body.error.code).toBe('NO_FIRM_IDENTITY')
  })

  it('an unusable client id is a 400 carrying its code', async () => {
    clientStore.getById.mockResolvedValue({ id: 'c-1:evil', name: 'Kinetic Planning' })
    caseStore.listForClient.mockResolvedValue([DD_CASE])
    const err = new Error('The client id cannot be used as a storage key.')
    err.code = 'BAD_CLIENT'
    gate.openRegister.mockRejectedValue(err)
    const res = makeMockRes()
    await routes.openGate(advisorReq({ params: { clientId: 'c-1:evil' } }), res)
    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('BAD_CLIENT')
  })

  it('a store failure is a 500 with no detail of what broke', async () => {
    clientStore.getById.mockResolvedValue({ id: 'c-1', name: 'Kinetic Planning' })
    caseStore.listForClient.mockResolvedValue([DD_CASE])
    gate.openRegister.mockRejectedValue(new Error('ER_LOCK_DEADLOCK on firm_framework_versions'))
    const res = makeMockRes()
    await routes.openGate(advisorReq({ params: { clientId: 'c-1' } }), res)
    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toContain('ER_LOCK_DEADLOCK')
  })
})
