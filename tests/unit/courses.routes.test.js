'use strict'

// Verifies the /api/courses routes through to courseStore, with the DB mocked
// (CB-16/17 Stage B). Focus: identity always comes from the verified JWT
// (never the request body), every route is owner-scoped, the outline is
// re-validated at the door, and a duplicate id maps to 409 so the Stage D
// migration can re-run safely.

jest.mock('../../server/utils/db', () => ({
  execute: jest.fn()
}))

const db = require('../../server/utils/db')
const { listCourses, createCourse, updateCourse, deleteCourse } = require('../../server/routes/courses')

// ── Helpers (same pattern as clients.routes.test.js) ──────────────────────────

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

// A request as it looks AFTER firmAuth has run: advisorId/firmId from the JWT.
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

const OUTLINE = {
  title: 'Selling Valuation Services',
  topic: 'Positioning',
  intensity: 'consistent',
  totalSessions: 1,
  sessions: [{ id: 1, title: 'S1', focus: 'Basics', resources: [], objectives: [], estimatedMinutes: 30 }]
}

// A va_courses row as the DB returns it (snake_case, JSON text).
function courseRow (over = {}) {
  return {
    id: 'course-1',
    advisor_id: 'advisor-from-jwt',
    firm_id: 'firm-from-jwt',
    status: 'active',
    visibility: 'private',
    outline: JSON.stringify(OUTLINE),
    progress: JSON.stringify([{ status: 'pending', quizScore: null, completedAt: null }]),
    design_history: null,
    created_at: '2026-07-15T00:00:00.000Z',
    updated_at: '2026-07-15T00:00:00.000Z',
    ...over
  }
}

beforeEach(() => jest.clearAllMocks())

// ── listCourses ───────────────────────────────────────────────────────────────

describe('listCourses', () => {
  test('returns 403 when the verified pass carries no advisor identity', async () => {
    const res = makeMockRes()
    await listCourses(makeReq({ advisorId: null }), res)
    expect(res._status).toBe(403)
    expect(res._body.error.code).toBe('NO_ADVISOR_IDENTITY')
    expect(db.execute).not.toHaveBeenCalled()
  })

  test('scopes the query to the JWT advisor, ignoring identity in the query string (IDOR closed)', async () => {
    db.execute.mockResolvedValue([[courseRow()]])
    const res = makeMockRes()
    await listCourses(makeReq({ query: { advisorId: 'ATTACKER' } }), res)

    expect(res._status).toBe(200)
    expect(db.execute.mock.calls[0][1]).toEqual(['advisor-from-jwt'])
    // snake_case → camelCase mapping + JSON parsing
    expect(res._body.courses[0]).toMatchObject({ id: 'course-1', advisorId: 'advisor-from-jwt', status: 'active' })
    expect(res._body.courses[0].outline.title).toBe('Selling Valuation Services')
    expect(res._body.courses[0].progress).toHaveLength(1)
  })

  test('a DB failure returns the safe envelope, never a stack trace', async () => {
    process.env.NODE_ENV = 'production' // disable the dev fallback for this test
    db.execute.mockRejectedValue(new Error('SQLSTATE[HY000] secret details'))
    const res = makeMockRes()
    await listCourses(makeReq(), res)
    process.env.NODE_ENV = 'test'

    expect(res._status).toBe(500)
    expect(res._body.error.code).toBe('DB_ERROR')
    expect(JSON.stringify(res._body)).not.toContain('SQLSTATE')
  })
})

// ── createCourse ──────────────────────────────────────────────────────────────

describe('createCourse', () => {
  test('returns 403 without identity', async () => {
    const res = makeMockRes()
    await createCourse(makeReq({ advisorId: null }), res)
    expect(res._status).toBe(403)
  })

  test('rejects a missing or invalid outline at the door', async () => {
    const res = makeMockRes()
    await createCourse(makeReq({ body: { outline: { title: 'No sessions', sessions: [] } } }), res)
    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('INVALID_OUTLINE')
    expect(db.execute).not.toHaveBeenCalled()
  })

  test('stores with the JWT identity — identity in the body is ignored (IDOR closed)', async () => {
    db.execute.mockResolvedValue([{}])
    const res = makeMockRes()
    await createCourse(makeReq({
      body: { id: 'course-mig-1', outline: OUTLINE, advisorId: 'ATTACKER', firmId: 'ATTACKER-FIRM', visibility: 'firm' }
    }), res)

    expect(res._status).toBe(200)
    const insertArgs = db.execute.mock.calls[0][1]
    expect(insertArgs[0]).toBe('course-mig-1') // supplied id preserved (migration)
    expect(insertArgs[1]).toBe('advisor-from-jwt')
    expect(insertArgs[2]).toBe('firm-from-jwt')
    expect(res._body.course.visibility).toBe('firm') // stored, inert until sharing ships
  })

  test('a duplicate id maps to 409 (migration re-runs never duplicate)', async () => {
    const dup = new Error('ER_DUP_ENTRY')
    dup.code = 'ER_DUP_ENTRY'
    process.env.NODE_ENV = 'production' // keep the dev fallback out of the way
    db.execute.mockRejectedValue(dup)
    const res = makeMockRes()
    await createCourse(makeReq({ body: { id: 'dup', outline: OUTLINE } }), res)
    process.env.NODE_ENV = 'test'

    expect(res._status).toBe(409)
    expect(res._body.error.code).toBe('DUPLICATE_ID')
  })
})

// ── updateCourse ──────────────────────────────────────────────────────────────

describe('updateCourse', () => {
  test('returns 403 without identity', async () => {
    const res = makeMockRes()
    await updateCourse(makeReq({ advisorId: null }), res)
    expect(res._status).toBe(403)
  })

  test('an empty patch is refused', async () => {
    const res = makeMockRes()
    await updateCourse(makeReq({ params: { id: 'course-1' }, body: { unknownField: 1 } }), res)
    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('NO_FIELDS')
    expect(db.execute).not.toHaveBeenCalled()
  })

  test('an invalid replacement outline is refused', async () => {
    const res = makeMockRes()
    await updateCourse(makeReq({ params: { id: 'course-1' }, body: { outline: { title: 'x', sessions: [{ title: 'no focus' }] } } }), res)
    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('INVALID_OUTLINE')
  })

  test("another advisor's course 404s exactly as if it did not exist", async () => {
    db.execute.mockResolvedValue([{ affectedRows: 0 }])
    const res = makeMockRes()
    await updateCourse(makeReq({ params: { id: 'not-mine' }, body: { status: 'paused' } }), res)

    expect(res._status).toBe(404)
    // WHERE carries the JWT advisor id.
    const updateArgs = db.execute.mock.calls[0][1]
    expect(updateArgs[updateArgs.length - 1]).toBe('advisor-from-jwt')
  })

  test('updates progress and status, then returns the fresh course', async () => {
    db.execute
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // UPDATE
      .mockResolvedValueOnce([[courseRow({ status: 'paused' })]]) // getOwn
    const res = makeMockRes()
    await updateCourse(makeReq({
      params: { id: 'course-1' },
      body: { status: 'paused', progress: [{ status: 'complete', quizScore: 90, completedAt: 'x', notes: 'n' }] }
    }), res)

    expect(res._status).toBe(200)
    expect(res._body.course.status).toBe('paused')
  })
})

// ── deleteCourse ──────────────────────────────────────────────────────────────

describe('deleteCourse', () => {
  test('returns 403 without identity', async () => {
    const res = makeMockRes()
    await deleteCourse(makeReq({ advisorId: null }), res)
    expect(res._status).toBe(403)
  })

  test("another advisor's course 404s; own course deletes", async () => {
    db.execute.mockResolvedValueOnce([{ affectedRows: 0 }])
    const res404 = makeMockRes()
    await deleteCourse(makeReq({ params: { id: 'not-mine' } }), res404)
    expect(res404._status).toBe(404)

    db.execute.mockResolvedValueOnce([{ affectedRows: 1 }])
    const res200 = makeMockRes()
    await deleteCourse(makeReq({ params: { id: 'mine' } }), res200)
    expect(res200._status).toBe(200)
    expect(res200._body).toEqual({ success: true })
    // DELETE is owner-scoped by the JWT advisor id.
    const delArgs = db.execute.mock.calls[1][1]
    expect(delArgs).toEqual(['mine', 'advisor-from-jwt'])
  })
})
