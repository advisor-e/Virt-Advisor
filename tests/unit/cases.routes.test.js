'use strict'

// Verifies the /api/cases routes through to caseStore, with the DB mocked.
// Focus: identity always comes from the verified JWT (never the request body),
// and mutations are owner-scoped — the IDOR the localStorage version had is closed.

jest.mock('../../server/utils/db', () => ({
  execute: jest.fn()
}))

const db = require('../../server/utils/db')
const {
  listCases, listFirmCases, createCase, reviewCase, setCaseVisibility, deleteCase
} = require('../../server/routes/cases')

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMockRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    // Success uses res.send; error envelopes (sendError) use writeHead + end.
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { try { this._body = JSON.parse(body) } catch (e) { this._body = body } }
  }
}

// A request as it looks AFTER firmAuth has run: advisorId/firmId from the JWT.
// query/body/params simulate values a hostile client may send.
function makeReq (overrides = {}) {
  return {
    advisorId: 'advisor-from-jwt',
    firmId: 'firm-from-jwt',
    query: {},
    body: {},
    params: {},
    ...overrides
  }
}

beforeEach(() => jest.clearAllMocks())

// ── listCases ───────────────────────────────────────────────────────────────

describe('listCases', () => {
  test('returns 403 when the verified pass carries no advisor identity', async () => {
    const req = makeReq({ advisorId: null })
    const res = makeMockRes()

    await listCases(req, res)

    expect(res._status).toBe(403)
    expect(res._body.error.code).toBe('NO_ADVISOR_IDENTITY')
    expect(res._body.success).toBe(false)
    expect(db.execute).not.toHaveBeenCalled()
  })

  test('scopes the query to the JWT identity, ignoring IDs in the address bar (IDOR closed)', async () => {
    db.execute.mockResolvedValue([[]])

    const req = makeReq({ query: { advisorId: 'ATTACKER', firmId: 'ATTACKER-firm' } })
    const res = makeMockRes()

    await listCases(req, res)

    expect(res._status).toBe(200)
    expect(res._body.success).toBe(true)
    // The authenticated advisor is echoed back so the client knows which cases
    // are its own — never trusting a client-held id.
    expect(res._body.advisorId).toBe('advisor-from-jwt')
    // The visibility scope lives in the SQL; identity params are the trusted ones.
    const params = db.execute.mock.calls[0][1]
    expect(params).toEqual(['advisor-from-jwt', 'firm-from-jwt'])
  })

  test('maps DB rows to the frontend case shape (nested review, parsed arrays)', async () => {
    db.execute.mockResolvedValue([[
      {
        id: 'c1',
        advisor_id: 'advisor-from-jwt',
        firm_id: 'firm-from-jwt',
        title: 'Café margins',
        mode: 'client',
        visibility: 'shared',
        domain: 'profit',
        templates: ['Lite Feasibility'],
        summary: 'A summary',
        transcript: [{ role: 'user', text: 'hi' }],
        feedback_pending: 0,
        review_went_well: 'Landed well',
        review_went_less: '',
        review_changes_recommended: '',
        reviewed_at: '2026-06-19T00:00:00.000Z',
        created_at: '2026-06-18T00:00:00.000Z'
      }
    ]])

    const res = makeMockRes()
    await listCases(makeReq(), res)

    const c = res._body.cases[0]
    expect(c.advisorId).toBe('advisor-from-jwt')
    expect(c.templates).toEqual(['Lite Feasibility'])
    expect(c.transcript).toHaveLength(1)
    expect(c.feedbackPending).toBe(false)
    expect(c.review.wentWell).toBe('Landed well')
  })

  test('returns 500 when the DB errors in production (no silent dev fallback)', async () => {
    const prev = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    db.execute.mockRejectedValue(new Error('connection refused'))

    const res = makeMockRes()
    await listCases(makeReq(), res)

    expect(res._status).toBe(500)
    expect(res._body.error.code).toBe('DB_ERROR')
    process.env.NODE_ENV = prev
  })
})

// ── listFirmCases (manager review feed) ───────────────────────────────────────

describe('listFirmCases', () => {
  test('returns 403 when the verified pass carries no firm identity', async () => {
    const req = makeReq({ firmId: null })
    const res = makeMockRes()

    await listFirmCases(req, res)

    expect(res._status).toBe(403)
    expect(res._body.error.code).toBe('NO_FIRM_IDENTITY')
    expect(db.execute).not.toHaveBeenCalled()
  })

  test('scopes to the JWT firm and queries shared-only (private never surfaces to a manager)', async () => {
    db.execute.mockResolvedValue([[]])

    // A hostile firmId in the body must be ignored — identity is from the JWT.
    const req = makeReq({ body: { firmId: 'ATTACKER-firm' } })
    const res = makeMockRes()

    await listFirmCases(req, res)

    expect(res._status).toBe(200)
    expect(res._body.success).toBe(true)
    const [sql, params] = db.execute.mock.calls[0]
    expect(sql).toMatch(/visibility = 'shared'/)
    expect(params).toEqual(['firm-from-jwt'])
  })

  test('returns 500 when the DB errors in production (no silent dev fallback)', async () => {
    const prev = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    db.execute.mockRejectedValue(new Error('connection refused'))

    const res = makeMockRes()
    await listFirmCases(makeReq(), res)

    expect(res._status).toBe(500)
    expect(res._body.error.code).toBe('DB_ERROR')
    process.env.NODE_ENV = prev
  })
})

// ── createCase ────────────────────────────────────────────────────────────────

describe('createCase', () => {
  test('returns 400 when no title is supplied', async () => {
    const res = makeMockRes()
    await createCase(makeReq({ body: { title: '   ' } }), res)

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('MISSING_FIELDS')
    expect(db.execute).not.toHaveBeenCalled()
  })

  test('stores the case under the JWT identity, ignoring advisor/firm IDs in the body', async () => {
    db.execute.mockResolvedValue()

    const req = makeReq({
      body: {
        advisorId: 'ATTACKER-spoofed', // hostile — must be ignored
        firmId: 'ATTACKER-firm',
        title: 'Partner dispute',
        mode: 'client',
        visibility: 'shared',
        templates: ['Force Field Analysis'],
        transcript: [{ role: 'user', text: 'they are fighting' }]
      }
    })
    const res = makeMockRes()

    await createCase(req, res)

    expect(res._status).toBe(200)
    expect(res._body.case.advisorId).toBe('advisor-from-jwt')
    // INSERT params order: id, advisor_id, firm_id, ...
    const params = db.execute.mock.calls[0][1]
    expect(params[1]).toBe('advisor-from-jwt')
    expect(params[2]).toBe('firm-from-jwt')
  })

  test('an unknown visibility fails safe to private', async () => {
    db.execute.mockResolvedValue()

    const req = makeReq({ body: { title: 'x', visibility: 'world-readable' } })
    const res = makeMockRes()

    await createCase(req, res)

    expect(res._body.case.visibility).toBe('private')
  })

  test('persists the decision trace from the body (stored as JSON)', async () => {
    db.execute.mockResolvedValue()

    const trace = { domain: { id: 'profit' }, distinctions: { nearMisses: [] } }
    const req = makeReq({ body: { title: 'Margins', decisionTrace: trace } })
    const res = makeMockRes()

    await createCase(req, res)

    expect(res._status).toBe(200)
    expect(res._body.case.decisionTrace).toEqual(trace)
    // INSERT order: ... transcript, decision_trace, feedback_pending.
    const params = db.execute.mock.calls[0][1]
    expect(JSON.parse(params[params.length - 2])).toEqual(trace)
  })

  test('a case with no trace stores null (not the string "null")', async () => {
    db.execute.mockResolvedValue()

    const res = makeMockRes()
    await createCase(makeReq({ body: { title: 'No trace' } }), res)

    expect(res._body.case.decisionTrace).toBeNull()
    const params = db.execute.mock.calls[0][1]
    expect(params[params.length - 2]).toBeNull()
  })
})

// ── reviewCase ────────────────────────────────────────────────────────────────

describe('reviewCase', () => {
  test('updates only when the advisor owns the case (owner id in the WHERE clause)', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 1 }])

    const req = makeReq({ params: { id: 'c1' }, body: { wentWell: 'good' } })
    const res = makeMockRes()

    await reviewCase(req, res)

    expect(res._status).toBe(200)
    const params = db.execute.mock.calls[0][1]
    // Last two bound params are id then the trusted advisor id.
    expect(params[params.length - 2]).toBe('c1')
    expect(params[params.length - 1]).toBe('advisor-from-jwt')
  })

  test("returns 404 when the case is missing or not the advisor's", async () => {
    db.execute.mockResolvedValue([{ affectedRows: 0 }])

    const res = makeMockRes()
    await reviewCase(makeReq({ params: { id: 'someone-elses' }, body: { wentWell: 'x' } }), res)

    expect(res._status).toBe(404)
    expect(res._body.error.code).toBe('NOT_FOUND')
  })
})

// ── setCaseVisibility ─────────────────────────────────────────────────────────

describe('setCaseVisibility', () => {
  test('rejects a visibility value that is not private/shared', async () => {
    const res = makeMockRes()
    await setCaseVisibility(makeReq({ params: { id: 'c1' }, body: { visibility: 'public' } }), res)

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('INVALID_VISIBILITY')
    expect(db.execute).not.toHaveBeenCalled()
  })

  test('flips an owned case both ways (private -> shared)', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 1 }])

    const res = makeMockRes()
    await setCaseVisibility(makeReq({ params: { id: 'c1' }, body: { visibility: 'shared' } }), res)

    expect(res._status).toBe(200)
    expect(res._body.visibility).toBe('shared')
    const params = db.execute.mock.calls[0][1]
    // params: [visibility, id, advisorId]
    expect(params).toEqual(['shared', 'c1', 'advisor-from-jwt'])
  })

  test("returns 404 when flipping a case the advisor doesn't own", async () => {
    db.execute.mockResolvedValue([{ affectedRows: 0 }])

    const res = makeMockRes()
    await setCaseVisibility(makeReq({ params: { id: 'x' }, body: { visibility: 'private' } }), res)

    expect(res._status).toBe(404)
  })
})

// ── deleteCase ────────────────────────────────────────────────────────────────

describe('deleteCase', () => {
  test('deletes only an owned case (owner id in the WHERE clause)', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 1 }])

    const res = makeMockRes()
    await deleteCase(makeReq({ params: { id: 'c1' } }), res)

    expect(res._status).toBe(200)
    const params = db.execute.mock.calls[0][1]
    expect(params).toEqual(['c1', 'advisor-from-jwt'])
  })

  test('returns 404 when deleting a case the advisor does not own', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 0 }])

    const res = makeMockRes()
    await deleteCase(makeReq({ params: { id: 'not-mine' } }), res)

    expect(res._status).toBe(404)
  })
})
