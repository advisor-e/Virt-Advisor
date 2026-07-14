'use strict'

// Verifies the /api/cases routes through to caseStore, with the DB mocked.
// Focus: identity always comes from the verified JWT (never the request body),
// and mutations are owner-scoped — the IDOR the localStorage version had is closed.

jest.mock('../../server/utils/db', () => ({
  execute: jest.fn()
}))

// Isolate the route from the coaching store — its own behaviour (overlay write,
// id assignment, dev fallback) is covered in coaching.test.js.
jest.mock('../../server/utils/coaching', () => ({
  appendFirmCoachingEntry: jest.fn()
}))

const db = require('../../server/utils/db')
const coaching = require('../../server/utils/coaching')
const {
  listCases, listFirmCases, createCase, reviewCase, setCaseVisibility, deleteCase,
  shareCaseWithMentor, withdrawCaseFromMentor, promote
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

// ── createCase + clientId (client knowledge base, design 2026-07-14) ─────────

describe('createCase clientId link', () => {
  const clientRow = {
    id: 'client-1',
    firm_id: 'firm-from-jwt',
    name: 'Vanoss Scaffolding',
    name_key: 'vanossscaffolding',
    created_by: 'advisor-from-jwt',
    created_at: '2026-07-14T00:00:00.000Z'
  }

  test('a clientId in the firm register is validated then saved on the case', async () => {
    db.execute
      .mockResolvedValueOnce([[clientRow]]) // clientStore.getById — found in OUR firm
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // INSERT
    const res = makeMockRes()

    await createCase(makeReq({ body: { title: 'Vanoss session', clientId: 'client-1' } }), res)

    expect(res._status).toBe(200)
    // getById is scoped to the JWT firm — the IDOR guard.
    expect(db.execute.mock.calls[0][1]).toEqual(['client-1', 'firm-from-jwt'])
    // INSERT column order: (id, advisor_id, firm_id, client_id, title, ...)
    expect(db.execute.mock.calls[1][1][3]).toBe('client-1')
  })

  test("a clientId from ANOTHER firm's register is rejected loudly (400), never silently unlinked", async () => {
    db.execute.mockResolvedValueOnce([[]]) // getById under OUR firm → not found
    const res = makeMockRes()

    await createCase(makeReq({ body: { title: 'T', clientId: 'other-firms-client' } }), res)

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('INVALID_CLIENT')
    expect(db.execute).toHaveBeenCalledTimes(1) // no INSERT happened
  })

  test('no clientId saves the case unlinked (client_id NULL) — naming is skippable', async () => {
    db.execute.mockResolvedValueOnce([{ affectedRows: 1 }]) // INSERT only
    const res = makeMockRes()

    await createCase(makeReq({ body: { title: 'Quick one-off' } }), res)

    expect(res._status).toBe(200)
    expect(db.execute).toHaveBeenCalledTimes(1)
    expect(db.execute.mock.calls[0][1][3]).toBeNull()
  })
})

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

// ── shareCaseWithMentor (manager approves the anonymised share) ────────────────

describe('shareCaseWithMentor', () => {
  test('returns 403 without a firm identity', async () => {
    const res = makeMockRes()
    await shareCaseWithMentor(makeReq({ firmId: null, params: { id: 'c1' } }), res)
    expect(res._status).toBe(403)
    expect(res._body.error.code).toBe('NO_FIRM_IDENTITY')
    expect(db.execute).not.toHaveBeenCalled()
  })

  test('rejects an empty anonymised payload', async () => {
    const res = makeMockRes()
    await shareCaseWithMentor(makeReq({
      params: { id: 'c1' },
      body: { anonymised: { summary: '   ', transcript: [] } }
    }), res)
    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('INVALID_ANON')
    expect(db.execute).not.toHaveBeenCalled()
  })

  test('persists the approved copy, firm-scoped and shared-only, stamping the approver', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 1 }])

    const req = makeReq({
      params: { id: 'c1' },
      body: { anonymised: { summary: 'The owner is worried.', transcript: [{ role: 'user', content: 'scrubbed' }] } }
    })
    const res = makeMockRes()
    await shareCaseWithMentor(req, res)

    expect(res._status).toBe(200)
    const [sql, params] = db.execute.mock.calls[0]
    expect(sql).toMatch(/mentor_shared = 1/)
    expect(sql).toMatch(/visibility = 'shared'/)
    // params: [summary, transcriptJSON, approverId, id, firmId]
    expect(params[0]).toBe('The owner is worried.')
    expect(JSON.parse(params[1])).toEqual([{ role: 'user', content: 'scrubbed' }])
    expect(params[2]).toBe('advisor-from-jwt') // approver from JWT, not body
    expect(params[3]).toBe('c1')
    expect(params[4]).toBe('firm-from-jwt')
  })

  test('returns 404 when the case is not the firm\'s shared case', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 0 }])
    const res = makeMockRes()
    await shareCaseWithMentor(makeReq({
      params: { id: 'x' },
      body: { anonymised: { summary: 'x', transcript: [] } }
    }), res)
    expect(res._status).toBe(404)
    expect(res._body.error.code).toBe('NOT_FOUND')
  })
})

// ── withdrawCaseFromMentor ────────────────────────────────────────────────────

describe('withdrawCaseFromMentor', () => {
  test('clears the share and the stored copy, firm-scoped', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 1 }])

    const res = makeMockRes()
    await withdrawCaseFromMentor(makeReq({ params: { id: 'c1' } }), res)

    expect(res._status).toBe(200)
    const [sql, params] = db.execute.mock.calls[0]
    expect(sql).toMatch(/mentor_shared = 0/)
    expect(sql).toMatch(/mentor_anon_summary = NULL/)
    expect(params).toEqual(['c1', 'firm-from-jwt'])
  })

  test('returns 404 when there is no such firm case', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 0 }])
    const res = makeMockRes()
    await withdrawCaseFromMentor(makeReq({ params: { id: 'nope' } }), res)
    expect(res._status).toBe(404)
  })
})

// ── promote (firm-scoped coaching reference, 2026-07-15) ─────────────────────
// The entry is built from the STORED case; the body carries only caseId. The
// old flow trusted the browser for the promoted text AND the audit stamps and
// wrote to a global file every firm's prompt read — both closed here.

describe('promote', () => {
  // A stored, reviewed case as the DB returns it (snake_case row).
  const reviewedRow = {
    id: 'c1',
    advisor_id: 'advisor-from-jwt',
    firm_id: 'firm-from-jwt',
    title: 'Cafe cash crunch',
    mode: 'client',
    visibility: 'private',
    domain: 'profit',
    templates: JSON.stringify(['Working Capital Cycle', 'EOY Meeting']),
    review_went_well: 'Cash flow visual landed',
    review_went_less: 'Owner resisted the tax discussion',
    review_changes_recommended: 'Bring working capital earlier',
    reviewed_at: '2026-07-14T00:00:00.000Z'
  }

  test('returns 403 when the verified pass carries no advisor identity', async () => {
    const res = makeMockRes()
    await promote(makeReq({ advisorId: null, body: { caseId: 'c1' } }), res)
    expect(res._status).toBe(403)
    expect(db.execute).not.toHaveBeenCalled()
  })

  test('returns 400 when caseId is missing or not a string', async () => {
    const res = makeMockRes()
    await promote(makeReq({ body: {} }), res)
    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('MISSING_CASE_ID')

    const res2 = makeMockRes()
    await promote(makeReq({ body: { caseId: { $ne: null } } }), res2)
    expect(res2._status).toBe(400)
    expect(db.execute).not.toHaveBeenCalled()
  })

  test("returns 404 for a case outside the caller's visibility boundary, scoped to the JWT", async () => {
    db.execute.mockResolvedValue([[]])
    const res = makeMockRes()
    await promote(makeReq({ body: { caseId: 'other-firms-case' } }), res)
    expect(res._status).toBe(404)
    // The read is scoped to the verified identity — own OR firm-shared.
    expect(db.execute.mock.calls[0][1]).toEqual(['other-firms-case', 'advisor-from-jwt', 'firm-from-jwt'])
    expect(coaching.appendFirmCoachingEntry).not.toHaveBeenCalled()
  })

  test('returns 400 NO_REVIEW when the case has no saved review', async () => {
    db.execute.mockResolvedValue([[{ ...reviewedRow, review_went_well: null, review_went_less: null, review_changes_recommended: null, reviewed_at: null }]])
    const res = makeMockRes()
    await promote(makeReq({ body: { caseId: 'c1' } }), res)
    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('NO_REVIEW')
    expect(coaching.appendFirmCoachingEntry).not.toHaveBeenCalled()
  })

  test('builds the entry from the STORED case and stamps audit fields server-side', async () => {
    db.execute.mockResolvedValue([[reviewedRow]])
    coaching.appendFirmCoachingEntry.mockResolvedValue(1)
    const res = makeMockRes()

    // Hostile extras in the body must be ignored — only caseId is read.
    await promote(makeReq({
      userEmail: 'manager@firm.test',
      body: {
        caseId: 'c1',
        caseTitle: 'FORGED TITLE',
        wentWell: 'FORGED TEXT',
        promotedBy: 'attacker@evil.test',
        promotedAt: '1999-01-01T00:00:00.000Z'
      }
    }), res)

    expect(res._status).toBe(200)
    expect(res._body).toEqual({ success: true, id: 1 })

    const [firmId, entry, savedBy] = coaching.appendFirmCoachingEntry.mock.calls[0]
    expect(firmId).toBe('firm-from-jwt')
    expect(savedBy).toBe('manager@firm.test')
    expect(entry.template).toBe('Working Capital Cycle') // stored templates[0]
    expect(entry.domain).toBe('profit')
    expect(entry.whatToLookFor).toBe('Cash flow visual landed')
    expect(entry.whereMayLead).toBe('Bring working capital earlier')
    expect(entry.scenarios).toEqual(['Cash flow visual landed', 'Note: Owner resisted the tax discussion'])
    expect(entry.sourceCase).toBe('Cafe cash crunch')
    expect(entry.promotedBy).toBe('manager@firm.test') // JWT, not the body
    expect(entry.promotedAt).not.toBe('1999-01-01T00:00:00.000Z') // server clock
    expect(JSON.stringify(entry)).not.toContain('FORGED')
  })

  test('a case with no templates falls back to its title as the label', async () => {
    db.execute.mockResolvedValue([[{ ...reviewedRow, templates: null }]])
    coaching.appendFirmCoachingEntry.mockResolvedValue(1)
    const res = makeMockRes()

    await promote(makeReq({ userEmail: 'manager@firm.test', body: { caseId: 'c1' } }), res)

    expect(res._status).toBe(200)
    expect(coaching.appendFirmCoachingEntry.mock.calls[0][1].template).toBe('Cafe cash crunch')
  })

  test('a store failure returns the safe 500 envelope, never internals', async () => {
    db.execute.mockResolvedValue([[reviewedRow]])
    coaching.appendFirmCoachingEntry.mockRejectedValue(new Error('SQL blew up at /secret/path'))
    const res = makeMockRes()

    await promote(makeReq({ userEmail: 'manager@firm.test', body: { caseId: 'c1' } }), res)

    expect(res._status).toBe(500)
    expect(res._body.error.code).toBe('PROMOTE_FAILED')
    expect(JSON.stringify(res._body)).not.toContain('/secret/path')
  })
})
