'use strict'

process.env.MYSQL_DATABASE = 'virt_advisor_test'
process.env.MYSQL_PASSWORD = 'test'

// ── Module mocks (declared before any require) ────────────────────────────────

jest.mock('../../server/utils/db', () => ({
  execute: jest.fn()
}))

jest.mock('../../server/utils/activityLogger', () => ({
  logCourseSession: jest.fn()
}))

const db = require('../../server/utils/db')
const { logCourseSession } = require('../../server/utils/activityLogger')

const { logCourse, getProgression, getTeam } = require('../../server/routes/activity')

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeMockRes () {
  return {
    _status: null,
    _body: null,
    send (status, body) { this._status = status; this._body = body }
  }
}

// A request as it looks AFTER firmAuth has run: advisorId/firmId are attached
// from the verified JWT. query/body simulate values a hostile client may send.
function makeReq (overrides = {}) {
  return {
    advisorId: 'advisor-from-jwt',
    firmId: 'firm-from-jwt',
    query: {},
    body: {},
    ...overrides
  }
}

beforeEach(() => jest.clearAllMocks())

// ── logCourse ─────────────────────────────────────────────────────────────────

describe('logCourse', () => {
  test('returns 403 when the verified pass carries no advisor identity', async () => {
    const req = makeReq({ advisorId: null, body: { courseId: 'c1', sessionIndex: 0 } })
    const res = makeMockRes()

    await logCourse(req, res)

    expect(res._status).toBe(403)
    expect(res._body.error.code).toBe('NO_ADVISOR_IDENTITY')
    expect(logCourseSession).not.toHaveBeenCalled()
  })

  test('returns 400 when required course fields are missing', async () => {
    const req = makeReq({ body: {} })
    const res = makeMockRes()

    await logCourse(req, res)

    expect(res._status).toBe(400)
    expect(logCourseSession).not.toHaveBeenCalled()
  })

  test('stamps the session with the JWT identity, ignoring IDs sent in the body', async () => {
    logCourseSession.mockResolvedValue()

    const req = makeReq({
      body: {
        advisorId: 'ATTACKER-spoofed-advisor', // hostile values — must be ignored
        firmId: 'ATTACKER-spoofed-firm',
        courseId: 'course-9',
        sessionIndex: 2,
        sessionTitle: 'Session Three'
      }
    })
    const res = makeMockRes()

    await logCourse(req, res)

    expect(res._status).toBe(200)
    expect(logCourseSession).toHaveBeenCalledTimes(1)
    const logged = logCourseSession.mock.calls[0][0]
    expect(logged.advisorId).toBe('advisor-from-jwt')
    expect(logged.firmId).toBe('firm-from-jwt')
    expect(logged.courseId).toBe('course-9')
  })
})

// ── getProgression ──────────────────────────────────────────────────────────────

describe('getProgression', () => {
  test('returns 403 when the verified pass carries no advisor identity', async () => {
    const req = makeReq({ advisorId: null })
    const res = makeMockRes()

    await getProgression(req, res)

    expect(res._status).toBe(403)
    expect(res._body.error.code).toBe('NO_ADVISOR_IDENTITY')
    expect(db.execute).not.toHaveBeenCalled()
  })

  test('queries the DB with the JWT identity, ignoring IDs in the address bar (IDOR closed)', async () => {
    db.execute.mockResolvedValue([[]])

    const req = makeReq({
      query: { advisorId: 'ATTACKER-other-advisor', firmId: 'ATTACKER-other-firm' }
    })
    const res = makeMockRes()

    await getProgression(req, res)

    expect(res._status).toBe(200)
    // Every DB call must be scoped to the trusted JWT identity, never the query params.
    for (const call of db.execute.mock.calls) {
      const params = call[1]
      expect(params).toEqual(['advisor-from-jwt', 'firm-from-jwt'])
    }
  })
})

// ── getTeam ─────────────────────────────────────────────────────────────────────

describe('getTeam', () => {
  test('queries the DB with the JWT firm, ignoring the firm ID in the address bar', async () => {
    db.execute.mockResolvedValue([[]])

    const req = makeReq({ query: { firmId: 'ATTACKER-other-firm' } })
    const res = makeMockRes()

    await getTeam(req, res)

    expect(res._status).toBe(200)
    for (const call of db.execute.mock.calls) {
      const params = call[1]
      expect(params).toEqual(['firm-from-jwt'])
    }
  })
})
