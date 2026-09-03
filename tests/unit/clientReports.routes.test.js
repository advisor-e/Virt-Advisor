'use strict'

/**
 * /api/client-reports — the advisor's switch and the client's own read
 * (design/features/business-entity-reports.md, approved by Mike 2026-09-03).
 *
 * What UAT cannot see and this pins: identity is ALWAYS the verified token's, a client of
 * another firm looks absent (404) rather than forbidden, a client's own read takes its
 * firm and id from the token and reads nothing from the request, and a bad route or
 * state is a 400 with the code rather than a saved value.
 */
jest.mock('../../server/utils/clientStore', () => ({ getById: jest.fn() }))
jest.mock('../../server/utils/clientReportAccess', () => ({
  listForClient: jest.fn(),
  setState: jest.fn()
}))

const clientStore = require('../../server/utils/clientStore')
const access = require('../../server/utils/clientReportAccess')
const routes = require('../../server/routes/clientReports')

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
  return Object.assign({ firmId: 'firm-from-jwt', advisorId: 'adv-1', userEmail: 'adv@firm', params: {}, body: {} }, over)
}

beforeEach(() => {
  clientStore.getById.mockReset()
  access.listForClient.mockReset()
  access.setState.mockReset()
})

describe('GET /api/client-reports/access/:clientId (advisor)', () => {
  it('returns the open set for a client of the token\'s firm', async () => {
    clientStore.getById.mockResolvedValue({ id: 'c-1', name: 'Big Bird Bakery' })
    access.listForClient.mockResolvedValue({ '/volatility': { state: 'open' } })
    const res = makeMockRes()
    await routes.getAccessForClient(advisorReq({ params: { clientId: 'c-1' } }), res)
    expect(res._status).toBe(200)
    expect(res._body.clientId).toBe('c-1')
    expect(res._body.clientName).toBe('Big Bird Bakery')
    expect(res._body.open).toEqual({ '/volatility': { state: 'open' } })
    // The lookup carries the TOKEN's firm, never one from the request.
    expect(clientStore.getById).toHaveBeenCalledWith('c-1', 'firm-from-jwt')
    expect(access.listForClient).toHaveBeenCalledWith('firm-from-jwt', 'c-1')
  })

  it('a client id of another firm is 404, exactly as if it did not exist', async () => {
    clientStore.getById.mockResolvedValue(null)
    const res = makeMockRes()
    await routes.getAccessForClient(advisorReq({ params: { clientId: 'someone-elses' } }), res)
    expect(res._status).toBe(404)
    expect(res._body.error.code).toBe('NOT_FOUND')
    expect(access.listForClient).not.toHaveBeenCalled()
  })

  it('refuses a session with no firm', async () => {
    const res = makeMockRes()
    await routes.getAccessForClient(advisorReq({ firmId: null, params: { clientId: 'c-1' } }), res)
    expect(res._status).toBe(403)
    expect(res._body.error.code).toBe('NO_FIRM_IDENTITY')
  })

  it('hides the database error behind a safe message', async () => {
    clientStore.getById.mockRejectedValue(new Error('ER_NO_SUCH_TABLE va_clients'))
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const res = makeMockRes()
    await routes.getAccessForClient(advisorReq({ params: { clientId: 'c-1' } }), res)
    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toContain('va_clients')
    spy.mockRestore()
  })
})

describe('PUT /api/client-reports/access/:clientId (advisor)', () => {
  it('opens a model for a client of the firm, stamped with the advisor', async () => {
    clientStore.getById.mockResolvedValue({ id: 'c-1', name: 'x' })
    access.setState.mockResolvedValue({ route: '/volatility', state: 'open' })
    const res = makeMockRes()
    await routes.setAccess(advisorReq({ params: { clientId: 'c-1' }, body: { route: '/volatility', state: 'open' } }), res)
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ success: true, clientId: 'c-1', route: '/volatility', state: 'open' })
    expect(access.setState).toHaveBeenCalledWith('firm-from-jwt', 'c-1', '/volatility', 'open', 'adv@firm')
  })

  it('a client of another firm is 404 and nothing is written', async () => {
    clientStore.getById.mockResolvedValue(null)
    const res = makeMockRes()
    await routes.setAccess(advisorReq({ params: { clientId: 'c-9' }, body: { route: '/volatility', state: 'open' } }), res)
    expect(res._status).toBe(404)
    expect(access.setState).not.toHaveBeenCalled()
  })

  it.each([['BAD_ROUTE'], ['BAD_STATE']])('a %s from the store is a 400 carrying that code', async (code) => {
    clientStore.getById.mockResolvedValue({ id: 'c-1', name: 'x' })
    const err = new Error('nope'); err.code = code
    access.setState.mockRejectedValue(err)
    const res = makeMockRes()
    await routes.setAccess(advisorReq({ params: { clientId: 'c-1' }, body: {} }), res)
    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe(code)
  })
})

describe('GET /api/client-reports/mine (business entity)', () => {
  it('reads the firm and the client id from the token and nothing from the request', async () => {
    access.listForClient.mockResolvedValue({ '/quick-position': { state: 'open' } })
    const res = makeMockRes()
    await routes.getMine({ firmId: 'firm-from-jwt', businessEntityId: 'c-1', params: { clientId: 'c-OTHER' }, query: { clientId: 'c-OTHER' } }, res)
    expect(res._status).toBe(200)
    expect(res._body.open).toEqual({ '/quick-position': { state: 'open' } })
    expect(access.listForClient).toHaveBeenCalledWith('firm-from-jwt', 'c-1')
  })

  it('refuses a session that does not identify a business entity', async () => {
    const res = makeMockRes()
    await routes.getMine({ firmId: 'firm-from-jwt', businessEntityId: null }, res)
    expect(res._status).toBe(403)
    expect(res._body.error.code).toBe('NO_ENTITY_IDENTITY')
    expect(access.listForClient).not.toHaveBeenCalled()
  })
})
