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

jest.mock('../../server/utils/savedReports', () => ({
  load: jest.fn(),
  changedKeys: jest.fn(() => []),
  saveAsAdvisor: jest.fn(),
  saveAsClient: jest.fn(),
  restoreAdvisorVersion: jest.fn()
}))

const clientStore = require('../../server/utils/clientStore')
const access = require('../../server/utils/clientReportAccess')
const saved = require('../../server/utils/savedReports')
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

// ── Saved reports (part 2, item 4.62) ────────────────────────────────────────

describe('saved reports — the advisor side (firmAuth)', () => {
  beforeEach(() => {
    saved.load.mockReset(); saved.saveAsAdvisor.mockReset(); saved.restoreAdvisorVersion.mockReset()
    saved.changedKeys.mockReset().mockReturnValue([])
  })

  it('GET reads the row for a client of the token\'s firm, with the client-changed keys', async () => {
    clientStore.getById.mockResolvedValue({ id: 'c-1', name: 'Big Bird Bakery' })
    const row = { inputs: { sales: 1 }, savedBy: { tier: 'business_entity', name: 'BB' } }
    saved.load.mockResolvedValue(row)
    saved.changedKeys.mockReturnValue(['sales'])
    const res = makeMockRes()
    await routes.getSaved(advisorReq({ params: { clientId: 'c-1' }, query: { route: '/debtor-drag' } }), res)
    expect(res._status).toBe(200)
    expect(res._body).toMatchObject({ clientId: 'c-1', clientName: 'Big Bird Bakery', route: '/debtor-drag', report: row, clientChanges: ['sales'] })
    expect(saved.load).toHaveBeenCalledWith('firm-from-jwt', 'c-1', '/debtor-drag')
  })

  it('a client of another firm looks absent on every saved-report route', async () => {
    clientStore.getById.mockResolvedValue(null)
    for (const fn of ['getSaved', 'putSaved', 'restoreSaved']) {
      const res = makeMockRes()
      await routes[fn](advisorReq({ params: { clientId: 'c-other' }, query: {}, body: { route: '/debtor-drag', inputs: { a: 1 } } }), res)
      expect(res._status).toBe(404)
    }
    expect(saved.saveAsAdvisor).not.toHaveBeenCalled()
    expect(saved.restoreAdvisorVersion).not.toHaveBeenCalled()
  })

  it('PUT saves as the advisor named in the token, never a name from the body', async () => {
    clientStore.getById.mockResolvedValue({ id: 'c-1', name: 'x' })
    saved.saveAsAdvisor.mockResolvedValue({ inputs: { a: 1 } })
    const res = makeMockRes()
    await routes.putSaved(advisorReq({ advisorName: 'Pat', params: { clientId: 'c-1' }, body: { route: '/debtor-drag', inputs: { a: 1 }, savedBy: { name: 'Mallory' } } }), res)
    expect(res._status).toBe(200)
    expect(saved.saveAsAdvisor).toHaveBeenCalledWith('firm-from-jwt', 'c-1', '/debtor-drag', { a: 1 }, { name: 'Pat', email: 'adv@firm' })
  })

  it.each([['BAD_ROUTE', 400], ['BAD_INPUTS', 400], ['NO_ADVISOR_VERSION', 409]])('a %s from the store is a %i carrying that code', async (code, status) => {
    clientStore.getById.mockResolvedValue({ id: 'c-1', name: 'x' })
    const err = new Error('nope'); err.code = code
    saved.saveAsAdvisor.mockRejectedValue(err)
    saved.restoreAdvisorVersion.mockRejectedValue(err)
    const res = makeMockRes()
    await routes.putSaved(advisorReq({ params: { clientId: 'c-1' }, body: { route: '/debtor-drag', inputs: {} } }), res)
    expect(res._status).toBe(status)
    expect(res._body.error.code).toBe(code)
    const res2 = makeMockRes()
    await routes.restoreSaved(advisorReq({ params: { clientId: 'c-1' }, body: { route: '/debtor-drag' } }), res2)
    expect(res2._status).toBe(status)
  })

  it('an unknown failure is a 500 with a safe message, not the error', async () => {
    clientStore.getById.mockResolvedValue({ id: 'c-1', name: 'x' })
    saved.saveAsAdvisor.mockRejectedValue(new Error('ER_NO_SUCH_TABLE at /srv/db.js:12'))
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const res = makeMockRes()
    await routes.putSaved(advisorReq({ params: { clientId: 'c-1' }, body: { route: '/debtor-drag', inputs: { a: 1 } } }), res)
    spy.mockRestore()
    expect(res._status).toBe(500)
    expect(res._body.error.code).toBe('DB_ERROR')
    expect(JSON.stringify(res._body)).not.toMatch(/ER_NO_SUCH_TABLE|\/srv/)
  })
})

describe('saved reports — the business entity side (entityAuth)', () => {
  beforeEach(() => {
    saved.load.mockReset(); saved.saveAsClient.mockReset()
    saved.changedKeys.mockReset().mockReturnValue([])
  })

  it('GET reads firm and client from the token, only the route from the request', async () => {
    saved.load.mockResolvedValue(null)
    const res = makeMockRes()
    await routes.getMineSaved({ firmId: 'firm-from-jwt', businessEntityId: 'c-1', params: { clientId: 'c-OTHER' }, query: { route: '/debtor-drag', clientId: 'c-OTHER' } }, res)
    expect(res._status).toBe(200)
    expect(res._body).toMatchObject({ route: '/debtor-drag', report: null, clientChanges: [] })
    expect(saved.load).toHaveBeenCalledWith('firm-from-jwt', 'c-1', '/debtor-drag')
  })

  it('PUT saves as the client in the token, named from the register, and NOT_OPEN is a 403', async () => {
    clientStore.getById.mockResolvedValue({ id: 'c-1', name: 'Big Bird Bakery' })
    saved.saveAsClient.mockResolvedValue({ inputs: { a: 2 } })
    saved.changedKeys.mockReturnValue(['a'])
    const res = makeMockRes()
    await routes.putMineSaved({ firmId: 'firm-from-jwt', businessEntityId: 'c-1', userEmail: 'dev-client@local', body: { route: '/debtor-drag', inputs: { a: 2 }, clientId: 'c-OTHER' } }, res)
    expect(res._status).toBe(200)
    expect(res._body.clientChanges).toEqual(['a'])
    expect(saved.saveAsClient).toHaveBeenCalledWith('firm-from-jwt', 'c-1', '/debtor-drag', { a: 2 }, { name: 'Big Bird Bakery', email: 'dev-client@local' })

    const err = new Error('closed'); err.code = 'NOT_OPEN'
    saved.saveAsClient.mockRejectedValue(err)
    const res2 = makeMockRes()
    await routes.putMineSaved({ firmId: 'firm-from-jwt', businessEntityId: 'c-1', body: { route: '/debtor-drag', inputs: { a: 2 } } }, res2)
    expect(res2._status).toBe(403)
    expect(res2._body.error.code).toBe('NOT_OPEN')
  })

  it('refuses a session that does not identify a business entity, on both routes', async () => {
    for (const fn of ['getMineSaved', 'putMineSaved']) {
      const res = makeMockRes()
      await routes[fn]({ firmId: 'firm-from-jwt', businessEntityId: null, query: {}, body: {} }, res)
      expect(res._status).toBe(403)
      expect(res._body.error.code).toBe('NO_ENTITY_IDENTITY')
    }
    expect(saved.load).not.toHaveBeenCalled()
    expect(saved.saveAsClient).not.toHaveBeenCalled()
  })
})
