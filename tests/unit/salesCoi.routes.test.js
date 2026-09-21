'use strict'

/**
 * The COI routes and the dashboard metrics route — item 17 stage 3.
 *
 * The access rules are the pipeline's and are proved the same way; what is
 * asserted HERE is what is different about this resource:
 *
 *   1. The dashboard AGGREGATES the two stores rather than querying the tables,
 *      so it can only ever summarise what the advisor may already see. The source
 *      app computes its dashboard from separate aggregates carrying no user
 *      filter at all — a second place to get the access rule wrong, and it did.
 *   2. A COI's score and count columns are INTs, so a value past the column's
 *      range is REFUSED rather than wrapped by MySQL into a different number.
 */

jest.mock('../../server/utils/salesCoiStore', () => {
  const actual = jest.requireActual('../../server/utils/salesCoiStore')
  return {
    listForAdvisor: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    COLUMNS: actual.COLUMNS,
    VISIBILITIES: actual.VISIBILITIES,
    normaliseVisibility: actual.normaliseVisibility
  }
})
jest.mock('../../server/utils/salesPipelineStore', () => ({ listForAdvisor: jest.fn() }))

const store = require('../../server/utils/salesCoiStore')
const pipelineStore = require('../../server/utils/salesPipelineStore')
const routes = require('../../server/routes/salesCoi')

const ADVISOR = 'advisor-aaa'
const FIRM = 'firm-111'

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

function errorOf (res) {
  return typeof res._body === 'string' ? JSON.parse(res._body) : res._body
}

function req (over) {
  return Object.assign({ advisorId: ADVISOR, firmId: FIRM, body: {}, params: {} }, over || {})
}

beforeEach(() => {
  jest.clearAllMocks()
  store.listForAdvisor.mockResolvedValue([])
  pipelineStore.listForAdvisor.mockResolvedValue([])
  store.create.mockImplementation(input => Promise.resolve(Object.assign({ id: 'new-1' }, input)))
  store.update.mockImplementation((id, a, f, patch) => Promise.resolve(Object.assign({ id }, patch)))
  store.remove.mockResolvedValue(true)
})

describe('identity comes from the verified token and nowhere else', () => {
  test('create passes the TOKEN\'s advisor and firm to the store', async () => {
    await routes.createEntry(req({ body: { coiName: 'Harbour Legal' } }), makeRes())
    const passed = store.create.mock.calls[0][0]
    expect(passed.advisorId).toBe(ADVISOR)
    expect(passed.firmId).toBe(FIRM)
  })

  test('🔴 a body claiming another advisor and firm CANNOT set them', async () => {
    await routes.createEntry(req({
      body: { coiName: 'X', advisorId: 'someone-else', firmId: 'another-firm' }
    }), makeRes())
    const passed = store.create.mock.calls[0][0]
    expect(passed.advisorId).toBe(ADVISOR)
    expect(passed.firmId).toBe(FIRM)
  })

  test.each(['listEntries', 'createEntry', 'updateEntry', 'deleteEntry', 'getMetrics'])(
    '%s refuses a session with no advisor identity', async (fn) => {
      const res = makeRes()
      await routes[fn](req({ advisorId: null, params: { id: 'x' } }), res)
      expect(res._status).toBe(403)
      expect(errorOf(res).error.code).toBe('NO_ADVISOR_IDENTITY')
    })

  test.each(['listEntries', 'createEntry', 'updateEntry', 'deleteEntry', 'getMetrics'])(
    '%s refuses a session with no firm identity', async (fn) => {
      const res = makeRes()
      await routes[fn](req({ firmId: null, params: { id: 'x' } }), res)
      expect(res._status).toBe(403)
    })

  test('update and delete pass both ids, so ownership is checked in SQL', async () => {
    await routes.updateEntry(req({ params: { id: 'c9' }, body: { other: 'x' } }), makeRes())
    expect(store.update.mock.calls[0].slice(0, 3)).toEqual(['c9', ADVISOR, FIRM])
    await routes.deleteEntry(req({ params: { id: 'c9' } }), makeRes())
    expect(store.remove).toHaveBeenCalledWith('c9', ADVISOR, FIRM)
  })
})

describe('🔴 the dashboard can only summarise what the advisor may already see', () => {
  test('it reads through the two STORES, with this advisor and firm', async () => {
    await routes.getMetrics(req(), makeRes())
    expect(pipelineStore.listForAdvisor).toHaveBeenCalledWith(ADVISOR, FIRM)
    expect(store.listForAdvisor).toHaveBeenCalledWith(ADVISOR, FIRM)
  })

  test('the figures are computed from exactly those rows', async () => {
    pipelineStore.listForAdvisor.mockResolvedValue([
      { secureMeeting: true, proposalSent: true, jobSecured: true, jobSecuredValue: 1000 },
      { secureMeeting: true }
    ])
    store.listForAdvisor.mockResolvedValue([{ totalReferrals: 4, totalConverted: 2, feeValue: 500 }])
    const res = makeRes()
    await routes.getMetrics(req(), res)
    expect(res._status).toBe(200)
    expect(res._body.metrics.funnel).toMatchObject({ approached: 2, meetings: 2, proposals: 1, secured: 1 })
    expect(res._body.metrics.coi).toMatchObject({ total: 1, referrals: 4, converted: 2, feeValue: 500 })
  })

  test('an empty pipeline gives a full payload with null rates, not zeroes', async () => {
    const res = makeRes()
    await routes.getMetrics(req(), res)
    expect(res._body.metrics.funnel.overallRate).toBeNull()
    expect(res._body.metrics.coi.conversionRate).toBeNull()
  })

  test('a store failure answers 500 and leaks nothing', async () => {
    pipelineStore.listForAdvisor.mockRejectedValue(new Error('SELECT * FROM va_sales_pipeline'))
    const res = makeRes()
    await routes.getMetrics(req(), res)
    expect(res._status).toBe(500)
    expect(JSON.stringify(errorOf(res))).not.toMatch(/SELECT|va_sales/)
  })
})

describe('a partner that is not yours is indistinguishable from one that does not exist', () => {
  test('update answers 404 when the store matched nothing', async () => {
    store.update.mockResolvedValue(null)
    const res = makeRes()
    await routes.updateEntry(req({ params: { id: 'not-mine' }, body: { other: 'x' } }), res)
    expect(res._status).toBe(404)
    expect(errorOf(res).error.message).not.toMatch(/exist|deleted|another/i)
  })

  test('delete answers 404 when the store deleted nothing', async () => {
    store.remove.mockResolvedValue(false)
    const res = makeRes()
    await routes.deleteEntry(req({ params: { id: 'not-mine' } }), res)
    expect(res._status).toBe(404)
  })
})

describe('every business field is editable', () => {
  test('all 16 are accepted on update', async () => {
    const body = {}
    store.COLUMNS.forEach(([js, , kind]) => {
      body[js] = (kind === 'money' || kind === 'score' || kind === 'count') ? 1 : 'v'
    })
    await routes.updateEntry(req({ params: { id: 'c1' }, body }), makeRes())
    const patch = store.update.mock.calls[0][3]
    store.COLUMNS.forEach(([js]) => {
      expect(Object.prototype.hasOwnProperty.call(patch, js)).toBe(true)
    })
    expect(store.COLUMNS).toHaveLength(16)
  })

  test('a field not supplied is not sent, so it is not overwritten', async () => {
    await routes.updateEntry(req({ params: { id: 'c1' }, body: { other: 'only this' } }), makeRes())
    expect(Object.keys(store.update.mock.calls[0][3])).toEqual(['other'])
  })

  test('an explicit null clears a field', async () => {
    await routes.updateEntry(req({ params: { id: 'c1' }, body: { industry: null } }), makeRes())
    expect(store.update.mock.calls[0][3].industry).toBeNull()
  })
})

describe('the numbers are validated', () => {
  test('a name is required on create', async () => {
    for (const body of [{}, { coiName: '   ' }]) {
      const res = makeRes()
      await routes.createEntry(req({ body }), res)
      expect(res._status).toBe(400)
      expect(errorOf(res).error.code).toBe('MISSING_FIELD')
    }
    expect(store.create).not.toHaveBeenCalled()
  })

  test.each(['couldWe', 'totalReferrals'])('%s refuses a non-number', async (field) => {
    const res = makeRes()
    await routes.createEntry(req({ body: { coiName: 'X', [field]: 'lots' } }), res)
    expect(res._status).toBe(400)
    expect(errorOf(res).error.code).toBe('INVALID_NUMBER')
  })

  test('🔴 a count past the INT column is REFUSED, not wrapped into a different number', async () => {
    const res = makeRes()
    await routes.createEntry(req({ body: { coiName: 'X', totalReferrals: 2147483648 } }), res)
    expect(res._status).toBe(400)
    expect(errorOf(res).error.code).toBe('INVALID_NUMBER')
  })

  test('the largest value the INT column holds is accepted', async () => {
    const res = makeRes()
    await routes.createEntry(req({ body: { coiName: 'X', totalReferrals: 2147483647 } }), res)
    expect(res._status).toBe(200)
  })

  test('a fractional count is rounded rather than refused', async () => {
    await routes.createEntry(req({ body: { coiName: 'X', totalReferrals: 3.7 } }), makeRes())
    expect(store.create.mock.calls[0][0].totalReferrals).toBe(4)
  })

  test('a negative score or fee is refused', async () => {
    for (const body of [{ coiName: 'X', willWe: -1 }, { coiName: 'X', feeValue: -1 }]) {
      const res = makeRes()
      await routes.createEntry(req({ body }), res)
      expect(res._status).toBe(400)
    }
  })

  test('a fee past DECIMAL(14,2) is refused', async () => {
    const res = makeRes()
    await routes.createEntry(req({ body: { coiName: 'X', feeValue: 1000000000000 } }), res)
    expect(res._status).toBe(400)
  })

  test('an unknown visibility is refused rather than quietly narrowed', async () => {
    const res = makeRes()
    await routes.createEntry(req({ body: { coiName: 'X', visibility: 'public' } }), res)
    expect(res._status).toBe(400)
    expect(errorOf(res).error.code).toBe('INVALID_VISIBILITY')
  })

  test('a new partner is private unless the body says otherwise', async () => {
    await routes.createEntry(req({ body: { coiName: 'X' } }), makeRes())
    expect(store.create.mock.calls[0][0].visibility).toBeUndefined()
    expect(store.normaliseVisibility(undefined)).toBe('private')
  })

  test('a body that is not an object does not crash the route', async () => {
    for (const body of [null, undefined, 'a string', 42]) {
      const res = makeRes()
      await routes.updateEntry(req({ params: { id: 'c1' }, body }), res)
      expect(res._status).toBe(200)
    }
  })
})

describe('failures are reported safely', () => {
  test.each([
    ['listEntries', 'listForAdvisor', {}],
    ['createEntry', 'create', { body: { coiName: 'X' } }],
    ['updateEntry', 'update', { params: { id: 'c1' }, body: { other: 'x' } }],
    ['deleteEntry', 'remove', { params: { id: 'c1' } }]
  ])('%s answers 500 DB_ERROR when the store throws', async (fn, storeFn, over) => {
    store[storeFn].mockRejectedValue(new Error('ER_LOCK_DEADLOCK: gory detail'))
    const res = makeRes()
    await routes[fn](req(over), res)
    expect(res._status).toBe(500)
    expect(errorOf(res).error.code).toBe('DB_ERROR')
    expect(JSON.stringify(errorOf(res))).not.toMatch(/DEADLOCK|gory/)
  })

  test('every error carries the standard envelope', async () => {
    store.listForAdvisor.mockRejectedValue(new Error('x'))
    const res = makeRes()
    await routes.listEntries(req(), res)
    const env = errorOf(res)
    expect(env.success).toBe(false)
    expect(typeof env.error.code).toBe('string')
    expect(typeof env.timestamp).toBe('string')
  })
})
