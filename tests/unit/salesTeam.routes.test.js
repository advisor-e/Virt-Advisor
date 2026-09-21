'use strict'

/**
 * The Team roll-up and the Lists routes — item 17 stage 4.
 *
 * What is asserted here is what is DIFFERENT about these routes, not the access
 * rules the pipeline and COI suites already prove:
 *
 *   1. The team route reads the WHOLE FIRM, private deals included (Mike's
 *      ruling, 2026-09-22) — and takes the firm from the token, never the body.
 *   2. A list save refuses an unknown key, a non-hex colour, and a non-text item,
 *      because a stored list reaches a dropdown and a stored colour reaches a
 *      style binding.
 *   3. A restore of another firm's version is a 404, not a 500 — a miss, not a
 *      fault.
 *
 * The ROLE gate is not asserted here: it is `requireManagerRole`, applied at
 * registration in restify-server.js, and `serverWiring.test.js` is what proves it
 * is in front of these routes. A handler cannot test middleware it never runs.
 */

jest.mock('../../server/utils/salesTeamStore', () => ({ listForFirm: jest.fn() }))
jest.mock('../../server/utils/salesListsStore', () => {
  const actual = jest.requireActual('../../server/utils/salesListsStore')
  return {
    getLists: jest.fn(),
    getList: jest.fn(),
    saveList: jest.fn(),
    historyFor: jest.fn(),
    restoreList: jest.fn(),
    normaliseItems: actual.normaliseItems,
    isKnownKey: actual.isKnownKey,
    MAX_ITEM_LENGTH: actual.MAX_ITEM_LENGTH
  }
})

const teamStore = require('../../server/utils/salesTeamStore')
const listsStore = require('../../server/utils/salesListsStore')
const routes = require('../../server/routes/salesTeam')

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

/** One pipeline row, with only the fields the roll-up reads. */
function deal (over) {
  return Object.assign({
    leadStaff: 'Ann',
    prospectStatus: 'Active',
    approachStyle: 'Direct Contact',
    approachDate: '2026-08-01',
    secureMeeting: false,
    proposalSent: false,
    jobSecured: false,
    proposalValue: 0,
    jobSecuredValue: 0
  }, over || {})
}

beforeEach(() => {
  jest.clearAllMocks()
  teamStore.listForFirm.mockResolvedValue([])
  listsStore.getLists.mockResolvedValue({})
  listsStore.saveList.mockImplementation((f, key, payload) =>
    Promise.resolve({ key, items: payload.items, colors: payload.colors }))
  listsStore.historyFor.mockResolvedValue([])
  listsStore.restoreList.mockResolvedValue({ key: 'partner', items: ['Ann'] })
})

describe('GET /api/sales/team — the firm-wide roll-up', () => {
  test('reads the firm from the TOKEN, not the body or the query', async () => {
    await routes.getTeamSummary(req({
      body: { firmId: 'another-firm' },
      query: { firmId: 'another-firm' }
    }), makeRes())
    expect(teamStore.listForFirm).toHaveBeenCalledWith(FIRM)
  })

  test('🔴 groups every advisor in the firm, not just the caller', async () => {
    teamStore.listForFirm.mockResolvedValue([
      deal({ leadStaff: 'Ann', advisorId: 'advisor-aaa' }),
      deal({ leadStaff: 'Bob', advisorId: 'advisor-bbb' }),
      deal({ leadStaff: 'Bob', advisorId: 'advisor-bbb' })
    ])
    const res = makeRes()
    await routes.getTeamSummary(req(), res)
    expect(res._status).toBe(200)
    expect(res._body.rows.map(r => r.leadStaff)).toEqual(['Ann', 'Bob'])
    expect(res._body.rows.find(r => r.leadStaff === 'Bob').prospects).toBe(2)
  })

  test('🔴 a PRIVATE deal is counted — the manager sees all of it (Mike, 2026-09-22)', async () => {
    teamStore.listForFirm.mockResolvedValue([
      deal({ leadStaff: 'Ann', visibility: 'private' }),
      deal({ leadStaff: 'Ann', visibility: 'firm' })
    ])
    const res = makeRes()
    await routes.getTeamSummary(req(), res)
    expect(res._body.rows[0].prospects).toBe(2)
  })

  test('says when the 2000 cap was reached rather than silently truncating', async () => {
    teamStore.listForFirm.mockResolvedValue(new Array(2000).fill(null).map(() => deal()))
    const res = makeRes()
    await routes.getTeamSummary(req(), res)
    expect(res._body.truncated).toBe(true)
  })

  test('a short list is not reported as truncated', async () => {
    teamStore.listForFirm.mockResolvedValue([deal()])
    const res = makeRes()
    await routes.getTeamSummary(req(), res)
    expect(res._body.truncated).toBe(false)
  })

  test('no firm on the token is 403, and the store is never called', async () => {
    const res = makeRes()
    await routes.getTeamSummary(req({ firmId: null }), res)
    expect(res._status).toBe(403)
    expect(errorOf(res).error.code).toBe('NO_ADVISOR_IDENTITY')
    expect(teamStore.listForFirm).not.toHaveBeenCalled()
  })

  test('a database failure is a safe 500, never the raw error', async () => {
    teamStore.listForFirm.mockRejectedValue(new Error('ER_NO_SUCH_TABLE: va_sales_pipeline'))
    const res = makeRes()
    await routes.getTeamSummary(req(), res)
    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toMatch(/ER_NO_SUCH_TABLE/)
  })
})

describe('GET /api/sales/lists', () => {
  test('returns the firm\'s lists, scoped to the token\'s firm', async () => {
    listsStore.getLists.mockResolvedValue({ partner: { key: 'partner', items: [] } })
    const res = makeRes()
    await routes.getLists(req(), res)
    expect(listsStore.getLists).toHaveBeenCalledWith(FIRM)
    expect(res._status).toBe(200)
    expect(res._body.lists.partner.key).toBe('partner')
  })

  test('no firm on the token is 403', async () => {
    const res = makeRes()
    await routes.getLists(req({ firmId: null }), res)
    expect(res._status).toBe(403)
  })

  test('a failure is a safe 500', async () => {
    listsStore.getLists.mockRejectedValue(new Error('boom'))
    const res = makeRes()
    await routes.getLists(req(), res)
    expect(res._status).toBe(500)
  })
})

describe('PUT /api/sales/lists/:key', () => {
  test('saves the named list for the token\'s firm', async () => {
    const res = makeRes()
    await routes.saveList(req({ params: { key: 'partner' }, body: { items: ['Ann', 'Bob'] } }), res)
    expect(res._status).toBe(200)
    const [firmId, key, payload] = listsStore.saveList.mock.calls[0]
    expect(firmId).toBe(FIRM)
    expect(key).toBe('partner')
    expect(payload.items).toEqual(['Ann', 'Bob'])
  })

  test('🔴 an unknown key is refused and nothing is written', async () => {
    const res = makeRes()
    await routes.saveList(req({ params: { key: 'evil' }, body: { items: [] } }), res)
    expect(res._status).toBe(400)
    expect(errorOf(res).error.code).toBe('UNKNOWN_LIST')
    expect(listsStore.saveList).not.toHaveBeenCalled()
  })

  test('items that are not text are refused', async () => {
    const res = makeRes()
    await routes.saveList(req({ params: { key: 'partner' }, body: { items: [1, 2] } }), res)
    expect(res._status).toBe(400)
    expect(errorOf(res).error.code).toBe('INVALID_ITEMS')
    expect(listsStore.saveList).not.toHaveBeenCalled()
  })

  test('a missing items array is refused', async () => {
    const res = makeRes()
    await routes.saveList(req({ params: { key: 'partner' }, body: {} }), res)
    expect(res._status).toBe(400)
    expect(errorOf(res).error.code).toBe('INVALID_ITEMS')
  })

  test('🔴 a colour that is not a hex value is REFUSED — it reaches a style binding', async () => {
    const res = makeRes()
    await routes.saveList(req({
      params: { key: 'prospectStatus' },
      body: { items: ['Active'], colors: { Active: 'javascript:alert(1)' } }
    }), res)
    expect(res._status).toBe(400)
    expect(errorOf(res).error.code).toBe('INVALID_ITEMS')
    expect(listsStore.saveList).not.toHaveBeenCalled()
  })

  test('a hex colour is accepted and passed through', async () => {
    const res = makeRes()
    await routes.saveList(req({
      params: { key: 'prospectStatus' },
      body: { items: ['Active'], colors: { Active: '#dcfce7' } }
    }), res)
    expect(res._status).toBe(200)
    expect(listsStore.saveList.mock.calls[0][2].colors).toEqual({ Active: '#dcfce7' })
  })

  test('colours given as an array are refused', async () => {
    const res = makeRes()
    await routes.saveList(req({
      params: { key: 'partner' }, body: { items: [], colors: ['#fff'] }
    }), res)
    expect(res._status).toBe(400)
  })

  test('a non-text colour value is refused', async () => {
    const res = makeRes()
    await routes.saveList(req({
      params: { key: 'partner' }, body: { items: [], colors: { Ann: 5 } }
    }), res)
    expect(res._status).toBe(400)
  })

  test('the advisor id from the token is recorded as the saver', async () => {
    await routes.saveList(req({ params: { key: 'partner' }, body: { items: ['Ann'] } }), makeRes())
    expect(listsStore.saveList.mock.calls[0][3]).toBe(ADVISOR)
  })

  test('no firm on the token is 403', async () => {
    const res = makeRes()
    await routes.saveList(req({ firmId: null, params: { key: 'partner' }, body: { items: [] } }), res)
    expect(res._status).toBe(403)
  })

  test('a failure is a safe 500', async () => {
    listsStore.saveList.mockRejectedValue(new Error('boom'))
    const res = makeRes()
    await routes.saveList(req({ params: { key: 'partner' }, body: { items: [] } }), res)
    expect(res._status).toBe(500)
  })
})

describe('list history and restore', () => {
  test('history is fetched for the token\'s firm and the named key', async () => {
    listsStore.historyFor.mockResolvedValue([{ id: 7, version: 2 }])
    const res = makeRes()
    await routes.getListHistory(req({ params: { key: 'partner' } }), res)
    expect(listsStore.historyFor).toHaveBeenCalledWith(FIRM, 'partner')
    expect(res._body.versions).toHaveLength(1)
  })

  test('history for an unknown key is refused', async () => {
    const res = makeRes()
    await routes.getListHistory(req({ params: { key: 'nope' } }), res)
    expect(res._status).toBe(400)
    expect(listsStore.historyFor).not.toHaveBeenCalled()
  })

  test('history failure is a safe 500', async () => {
    listsStore.historyFor.mockRejectedValue(new Error('boom'))
    const res = makeRes()
    await routes.getListHistory(req({ params: { key: 'partner' } }), res)
    expect(res._status).toBe(500)
  })

  test('no firm on the token is 403 for history', async () => {
    const res = makeRes()
    await routes.getListHistory(req({ firmId: null, params: { key: 'partner' } }), res)
    expect(res._status).toBe(403)
  })

  test('restore puts the list back and returns it', async () => {
    const res = makeRes()
    await routes.restoreList(req({ params: { key: 'partner' }, body: { versionId: 3 } }), res)
    expect(listsStore.restoreList).toHaveBeenCalledWith(FIRM, 'partner', 3)
    expect(res._status).toBe(200)
  })

  test('restore with no version named is refused', async () => {
    const res = makeRes()
    await routes.restoreList(req({ params: { key: 'partner' }, body: {} }), res)
    expect(res._status).toBe(400)
    expect(errorOf(res).error.code).toBe('MISSING_VERSION')
    expect(listsStore.restoreList).not.toHaveBeenCalled()
  })

  test('restore of an unknown key is refused', async () => {
    const res = makeRes()
    await routes.restoreList(req({ params: { key: 'nope' }, body: { versionId: 1 } }), res)
    expect(res._status).toBe(400)
  })

  test('🔴 another firm\'s version is a 404, not a 500 — a miss, not a fault', async () => {
    listsStore.restoreList.mockRejectedValue(new Error('Version not found for this firm and config key'))
    const res = makeRes()
    await routes.restoreList(req({ params: { key: 'partner' }, body: { versionId: 99 } }), res)
    expect(res._status).toBe(404)
    expect(errorOf(res).error.code).toBe('NOT_FOUND')
  })

  test('a real failure is still a 500', async () => {
    listsStore.restoreList.mockRejectedValue(new Error('ER_LOCK_DEADLOCK'))
    const res = makeRes()
    await routes.restoreList(req({ params: { key: 'partner' }, body: { versionId: 1 } }), res)
    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toMatch(/DEADLOCK/)
  })

  test('no firm on the token is 403 for restore', async () => {
    const res = makeRes()
    await routes.restoreList(req({ firmId: null, params: { key: 'partner' }, body: { versionId: 1 } }), res)
    expect(res._status).toBe(403)
  })
})
