'use strict'

/**
 * The Sales Tracker pipeline routes — item 17 stage 2.
 *
 * 🔴 WHAT THESE TESTS ARE FOR, AND WHY UAT CANNOT DO THIS JOB.
 *
 * A tester in UAT signs in as one advisor at one firm. Every screen looks correct
 * whether the access rules hold or not — the leak is another advisor's or another
 * firm's data appearing where nobody is looking. The source app
 * (advisor-e/sales-tracker-nuxt) shipped with all three of the faults below, and
 * each one is invisible from a single signed-in session:
 *
 *   1. NO FIRM FILTER. Its list route says so in its own comment: "Pipeline is
 *      shared across the firm - no userId filter". In a multi-tenant app that is
 *      one firm reading another's prospects and fee values.
 *
 *   2. AN IDOR ON UPDATE. Its `[id].patch.js` runs updateMany({ where: { id } })
 *      behind a plain "is signed in" check, on an auto-increment integer. Anyone
 *      could edit anyone's deal by guessing a number.
 *
 *   3. IDENTITY FROM THE BODY. Nothing stops a crafted body naming another owner.
 *
 * And one that is not a leak but is still invisible: its PATCH schema accepts 16
 * of the 34 business fields, so `industry`, `meetingDate`, `dateSecured` and 13
 * others can be created and never edited. A person would eventually notice a lost
 * edit; they would never guess which fields.
 *
 * The store is mocked throughout — these tests are about the routes' contract, not
 * about SQL. The store's own access rules are pinned in salesPipelineStore.test.js.
 */

jest.mock('../../server/utils/salesPipelineStore', () => {
  const actual = jest.requireActual('../../server/utils/salesPipelineStore')
  return {
    listForAdvisor: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    // The real values — the routes build their field list from these, so faking
    // them would test a schema this app does not have.
    COLUMNS: actual.COLUMNS,
    VISIBILITIES: actual.VISIBILITIES,
    normaliseVisibility: actual.normaliseVisibility
  }
})

const store = require('../../server/utils/salesPipelineStore')
const routes = require('../../server/routes/salesPipeline')

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

/** `sendError` writes a JSON STRING through writeHead/end, so it must be parsed. */
function errorOf (res) {
  return typeof res._body === 'string' ? JSON.parse(res._body) : res._body
}

function req (over) {
  return Object.assign({ advisorId: ADVISOR, firmId: FIRM, body: {}, params: {} }, over || {})
}

beforeEach(() => {
  jest.clearAllMocks()
  store.listForAdvisor.mockResolvedValue([])
  store.create.mockImplementation(input => Promise.resolve(Object.assign({ id: 'new-1' }, input)))
  store.update.mockImplementation((id, a, f, patch) => Promise.resolve(Object.assign({ id }, patch)))
  store.remove.mockResolvedValue(true)
})

describe('identity comes from the verified token and nowhere else', () => {
  test('create passes the TOKEN\'s advisor and firm to the store', async () => {
    const res = makeRes()
    await routes.createEntry(req({ body: { prospectName: 'Acme', prospectStatus: 'New' } }), res)
    expect(res._status).toBe(200)
    const passed = store.create.mock.calls[0][0]
    expect(passed.advisorId).toBe(ADVISOR)
    expect(passed.firmId).toBe(FIRM)
  })

  test('🔴 a body claiming another advisor and firm CANNOT set them', async () => {
    const res = makeRes()
    await routes.createEntry(req({
      body: {
        prospectName: 'Acme',
        prospectStatus: 'New',
        advisorId: 'someone-else',
        firmId: 'another-firm'
      }
    }), res)
    const passed = store.create.mock.calls[0][0]
    // The token's values win, and the body's are not merely overridden — they are
    // dropped before the merge, so no future reordering of Object.assign can
    // reintroduce them.
    expect(passed.advisorId).toBe(ADVISOR)
    expect(passed.firmId).toBe(FIRM)
  })

  test('a body cannot set the row id either', async () => {
    const res = makeRes()
    await routes.createEntry(req({ body: { prospectName: 'A', prospectStatus: 'New', id: 'chosen-id' } }), res)
    expect(store.create.mock.calls[0][0].id).toBeUndefined()
  })

  test.each([
    ['listEntries', 'listEntries'],
    ['createEntry', 'createEntry'],
    ['updateEntry', 'updateEntry'],
    ['deleteEntry', 'deleteEntry']
  ])('%s refuses a session with no advisor identity', async (_name, fn) => {
    const res = makeRes()
    await routes[fn](req({ advisorId: null, params: { id: 'x' } }), res)
    expect(res._status).toBe(403)
    expect(errorOf(res).error.code).toBe('NO_ADVISOR_IDENTITY')
  })

  test.each([
    ['listEntries', 'listEntries'],
    ['createEntry', 'createEntry'],
    ['updateEntry', 'updateEntry'],
    ['deleteEntry', 'deleteEntry']
  ])('%s refuses a session with no firm identity', async (_name, fn) => {
    const res = makeRes()
    await routes[fn](req({ firmId: null, params: { id: 'x' } }), res)
    expect(res._status).toBe(403)
    expect(errorOf(res).error.code).toBe('NO_ADVISOR_IDENTITY')
  })

  test('the list route asks the store for THIS advisor at THIS firm', async () => {
    await routes.listEntries(req(), makeRes())
    expect(store.listForAdvisor).toHaveBeenCalledWith(ADVISOR, FIRM)
  })

  test('update and delete pass both ids to the store, so ownership is checked in SQL', async () => {
    await routes.updateEntry(req({ params: { id: 'deal-9' }, body: { comments: 'x' } }), makeRes())
    expect(store.update.mock.calls[0].slice(0, 3)).toEqual(['deal-9', ADVISOR, FIRM])

    await routes.deleteEntry(req({ params: { id: 'deal-9' } }), makeRes())
    expect(store.remove).toHaveBeenCalledWith('deal-9', ADVISOR, FIRM)
  })
})

describe('a deal that is not yours is indistinguishable from one that does not exist', () => {
  test('update answers 404 when the store matched nothing', async () => {
    store.update.mockResolvedValue(null)
    const res = makeRes()
    await routes.updateEntry(req({ params: { id: 'not-mine' }, body: { comments: 'x' } }), res)
    expect(res._status).toBe(404)
    expect(errorOf(res).error.code).toBe('NOT_FOUND')
  })

  test('delete answers 404 when the store deleted nothing', async () => {
    store.remove.mockResolvedValue(false)
    const res = makeRes()
    await routes.deleteEntry(req({ params: { id: 'not-mine' } }), res)
    expect(res._status).toBe(404)
    expect(errorOf(res).error.code).toBe('NOT_FOUND')
  })

  test('the 404 message does not reveal whether the deal exists', async () => {
    store.update.mockResolvedValue(null)
    const res = makeRes()
    await routes.updateEntry(req({ params: { id: 'x' }, body: { comments: 'y' } }), res)
    const msg = errorOf(res).error.message
    expect(msg).not.toMatch(/exist|deleted|another|other advisor/i)
  })
})

describe('every business field is editable — the source app\'s 16-of-34 gap', () => {
  // The whole point of driving validation off the store's COLUMNS list. If a
  // future change hand-writes an update schema, this fails.
  const EDITABLE = store.COLUMNS.map(([js]) => js)

  test('there are 32 business fields and the update accepts all of them', async () => {
    expect(EDITABLE).toHaveLength(32)
    const body = {}
    store.COLUMNS.forEach(([js, , kind]) => {
      body[js] = kind === 'bool' ? true : kind === 'money' ? 1 : kind === 'date' ? '2026-01-01' : 'v'
    })
    await routes.updateEntry(req({ params: { id: 'd1' }, body }), makeRes())
    const patch = store.update.mock.calls[0][3]
    EDITABLE.forEach(f => expect(Object.prototype.hasOwnProperty.call(patch, f)).toBe(true))
  })

  test.each([
    'industry', 'meetingDate', 'dateSecured', 'supportStaff',
    'existingFeeValue', 'salesStyle', 'totalNeedsStage', 'additionalWorkSecured'
  ])('%s is editable — it is one the source app could create but never edit', async (field) => {
    const kind = store.COLUMNS.find(([js]) => js === field)[2]
    const value = kind === 'money' ? 5 : kind === 'date' ? '2026-03-04' : 'x'
    await routes.updateEntry(req({ params: { id: 'd1' }, body: { [field]: value } }), makeRes())
    expect(Object.prototype.hasOwnProperty.call(store.update.mock.calls[0][3], field)).toBe(true)
  })

  test('a field not supplied is not sent to the store, so it is not overwritten', async () => {
    await routes.updateEntry(req({ params: { id: 'd1' }, body: { comments: 'only this' } }), makeRes())
    const patch = store.update.mock.calls[0][3]
    expect(Object.keys(patch)).toEqual(['comments'])
  })

  test('an explicit null CLEARS a field rather than being ignored', async () => {
    await routes.updateEntry(req({ params: { id: 'd1' }, body: { industry: null } }), makeRes())
    expect(store.update.mock.calls[0][3].industry).toBeNull()
  })
})

describe('money is validated, because a wrong figure reaches a client', () => {
  test.each([
    ['a string', 'lots'],
    ['NaN', NaN],
    ['Infinity', Infinity]
  ])('%s is refused', async (_label, value) => {
    const res = makeRes()
    await routes.createEntry(req({ body: { prospectName: 'A', prospectStatus: 'New', proposalValue: value } }), res)
    expect(res._status).toBe(400)
    expect(errorOf(res).error.code).toBe('INVALID_NUMBER')
    expect(store.create).not.toHaveBeenCalled()
  })

  test('a negative fee is refused', async () => {
    const res = makeRes()
    await routes.createEntry(req({ body: { prospectName: 'A', prospectStatus: 'New', jobSecuredValue: -1 } }), res)
    expect(res._status).toBe(400)
    expect(errorOf(res).error.code).toBe('INVALID_NUMBER')
  })

  test('🔴 a value past DECIMAL(14,2) is REFUSED, not silently truncated to a different number', async () => {
    const res = makeRes()
    await routes.createEntry(req({
      body: { prospectName: 'A', prospectStatus: 'New', proposalValue: 1000000000000 }
    }), res)
    expect(res._status).toBe(400)
    expect(errorOf(res).error.code).toBe('INVALID_NUMBER')
  })

  test('the largest value the column holds is accepted', async () => {
    const res = makeRes()
    await routes.createEntry(req({
      body: { prospectName: 'A', prospectStatus: 'New', proposalValue: 999999999999.99 }
    }), res)
    expect(res._status).toBe(200)
  })

  test('zero and a normal fee are accepted', async () => {
    const res = makeRes()
    await routes.createEntry(req({
      body: { prospectName: 'A', prospectStatus: 'New', proposalValue: 0, jobSecuredValue: 46170.5 }
    }), res)
    expect(res._status).toBe(200)
    expect(store.create.mock.calls[0][0].jobSecuredValue).toBe(46170.5)
  })
})

describe('the rest of the validation', () => {
  test('a deal needs a prospect name and a status', async () => {
    for (const body of [{}, { prospectName: 'A' }, { prospectStatus: 'New' }, { prospectName: '   ', prospectStatus: 'New' }]) {
      const res = makeRes()
      await routes.createEntry(req({ body }), res)
      expect(res._status).toBe(400)
      expect(errorOf(res).error.code).toBe('MISSING_FIELD')
    }
    expect(store.create).not.toHaveBeenCalled()
  })

  test('the update does NOT require them — the body is a partial update', async () => {
    const res = makeRes()
    await routes.updateEntry(req({ params: { id: 'd1' }, body: { comments: 'just a note' } }), res)
    expect(res._status).toBe(200)
  })

  test('an unreadable date is refused', async () => {
    const res = makeRes()
    await routes.createEntry(req({ body: { prospectName: 'A', prospectStatus: 'New', meetingDate: 'next Tuesday-ish' } }), res)
    expect(res._status).toBe(400)
    expect(errorOf(res).error.code).toBe('INVALID_DATE')
  })

  test('an empty date string clears the date rather than failing', async () => {
    const res = makeRes()
    await routes.createEntry(req({ body: { prospectName: 'A', prospectStatus: 'New', meetingDate: '' } }), res)
    expect(res._status).toBe(200)
    expect(store.create.mock.calls[0][0].meetingDate).toBeNull()
  })

  test('a yes/no field must be a real boolean, not a string', async () => {
    const res = makeRes()
    await routes.createEntry(req({ body: { prospectName: 'A', prospectStatus: 'New', jobSecured: 'yes' } }), res)
    expect(res._status).toBe(400)
    expect(errorOf(res).error.code).toBe('INVALID_FLAG')
  })

  test('a text field given an object is refused', async () => {
    const res = makeRes()
    await routes.createEntry(req({ body: { prospectName: 'A', prospectStatus: 'New', industry: { a: 1 } } }), res)
    expect(res._status).toBe(400)
    expect(errorOf(res).error.code).toBe('INVALID_TEXT')
  })

  test('an unknown visibility is refused rather than quietly narrowed', async () => {
    // The STORE fails safe to private; the ROUTE refuses, so a caller asking for
    // something impossible is told, instead of silently getting something else.
    const res = makeRes()
    await routes.createEntry(req({ body: { prospectName: 'A', prospectStatus: 'New', visibility: 'public' } }), res)
    expect(res._status).toBe(400)
    expect(errorOf(res).error.code).toBe('INVALID_VISIBILITY')
  })

  test.each(['private', 'firm'])('visibility %s is accepted', async (v) => {
    const res = makeRes()
    await routes.createEntry(req({ body: { prospectName: 'A', prospectStatus: 'New', visibility: v } }), res)
    expect(res._status).toBe(200)
    expect(store.create.mock.calls[0][0].visibility).toBe(v)
  })

  test('a missing id on update or delete is a 400, not a crash', async () => {
    for (const fn of ['updateEntry', 'deleteEntry']) {
      const res = makeRes()
      await routes[fn](req({ params: {} }), res)
      expect(res._status).toBe(400)
      expect(errorOf(res).error.code).toBe('MISSING_ID')
    }
  })

  test('a body that is not an object does not crash the route', async () => {
    for (const body of [null, undefined, 'a string', 42]) {
      const res = makeRes()
      await routes.updateEntry(req({ params: { id: 'd1' }, body }), res)
      expect(res._status).toBe(200)
    }
  })
})

describe('a new deal is private unless its owner says otherwise', () => {
  test('no visibility in the body means none is sent, so the store default applies', async () => {
    await routes.createEntry(req({ body: { prospectName: 'A', prospectStatus: 'New' } }), makeRes())
    expect(store.create.mock.calls[0][0].visibility).toBeUndefined()
    // And the store's default is private — asserted here too, because the two
    // halves of this guarantee live in different files.
    expect(store.normaliseVisibility(undefined)).toBe('private')
  })
})

describe('failures are reported safely', () => {
  test.each([
    ['listEntries', 'listForAdvisor', {}],
    ['createEntry', 'create', { body: { prospectName: 'A', prospectStatus: 'New' } }],
    ['updateEntry', 'update', { params: { id: 'd1' }, body: { comments: 'x' } }],
    ['deleteEntry', 'remove', { params: { id: 'd1' } }]
  ])('%s answers 500 DB_ERROR when the store throws', async (fn, storeFn, over) => {
    store[storeFn].mockRejectedValue(new Error('ER_LOCK_DEADLOCK: gory detail'))
    const res = makeRes()
    await routes[fn](req(over), res)
    expect(res._status).toBe(500)
    expect(errorOf(res).error.code).toBe('DB_ERROR')
  })

  test('🔴 the raw error never reaches the caller', async () => {
    store.listForAdvisor.mockRejectedValue(new Error('SELECT * FROM va_sales_pipeline WHERE secret'))
    const res = makeRes()
    await routes.listEntries(req(), res)
    const body = JSON.stringify(errorOf(res))
    expect(body).not.toMatch(/SELECT|va_sales_pipeline|secret/)
  })

  test('every error carries the standard envelope', async () => {
    store.listForAdvisor.mockRejectedValue(new Error('x'))
    const res = makeRes()
    await routes.listEntries(req(), res)
    const env = errorOf(res)
    expect(env.success).toBe(false)
    expect(typeof env.error.code).toBe('string')
    expect(typeof env.error.message).toBe('string')
    expect(typeof env.timestamp).toBe('string')
  })
})

describe('the success shapes', () => {
  test('list returns { success, items }', async () => {
    store.listForAdvisor.mockResolvedValue([{ id: 'a' }, { id: 'b' }])
    const res = makeRes()
    await routes.listEntries(req(), res)
    expect(res._body.success).toBe(true)
    expect(res._body.items).toHaveLength(2)
  })

  test('create and update return { success, item }', async () => {
    const res1 = makeRes()
    await routes.createEntry(req({ body: { prospectName: 'A', prospectStatus: 'New' } }), res1)
    expect(res1._body.success).toBe(true)
    expect(res1._body.item).toBeTruthy()

    const res2 = makeRes()
    await routes.updateEntry(req({ params: { id: 'd1' }, body: { comments: 'x' } }), res2)
    expect(res2._body.success).toBe(true)
    expect(res2._body.item).toBeTruthy()
  })

  test('delete returns { success, deleted }', async () => {
    const res = makeRes()
    await routes.deleteEntry(req({ params: { id: 'd1' } }), res)
    expect(res._body).toEqual({ success: true, deleted: true })
  })
})
