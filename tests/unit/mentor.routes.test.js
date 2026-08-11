'use strict'

// Mentor view: the cross-firm read is role-gated to the mentor and returns only
// anonymised, mentor-approved cases.

jest.mock('../../server/utils/db', () => ({ execute: jest.fn() }))

const db = require('../../server/utils/db')
const { listMentorCases } = require('../../server/routes/mentor')
const { requireMentorRole } = require('../../server/middleware/firmAuth')
const { AUTH } = require('../../config/integration')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

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

beforeEach(() => jest.clearAllMocks())

describe('requireMentorRole', () => {
  test('allows the mentor role', () => {
    const req = { userRole: AUTH.mentorRole }
    let called = false
    requireMentorRole(req, makeMockRes(), () => { called = true })
    expect(called).toBe(true)
  })

  test('denies a firm manager', () => {
    const req = { userRole: AUTH.managerRole }
    const res = makeMockRes()
    let called = false
    requireMentorRole(req, res, () => { called = true })
    expect(called).toBe(false)
    expect(res._status).toBe(403)
    expect(res._body.error.code).toBe('FORBIDDEN')
  })

  test('denies a request with no role', () => {
    const res = makeMockRes()
    requireMentorRole({ userRole: null }, res, () => {})
    expect(res._status).toBe(403)
  })
})

// The caller, as firmAuth would have built it. Added 2026-08-11, when this feed was
// opened to the two middle tiers and began reading req.firmId to decide whose cases
// it may return. These tests used to pass `{}` — a request no route can receive,
// since firmAuth refuses a token with no firm claim. Every EXPECTATION below is
// unchanged; only the identity is now stated rather than assumed.
const MENTOR = { firmId: PLATFORM_SCOPE }

describe('listMentorCases', () => {
  test('returns mentor-shared cases across firms, anonymised (no advisor id, no raw text)', async () => {
    db.execute.mockResolvedValue([[
      {
        id: 'c1',
        advisor_id: 'advisor-x',
        firm_id: 'firm-a',
        title: 'A failing café',
        mode: 'client',
        domain: 'profit',
        templates: ['Quick & Worst'],
        summary: 'RAW should not surface',
        transcript: [{ role: 'user', content: 'RAW client words' }],
        mentor_anon_summary: 'The owner fears closure.',
        mentor_anon_transcript: [{ role: 'user', content: 'scrubbed words' }],
        decision_trace: { domain: { id: 'profit', label: 'Profit' } },
        mentor_shared_at: '2026-06-26T00:00:00.000Z',
        created_at: '2026-06-25T00:00:00.000Z'
      }
    ]])

    const res = makeMockRes()
    await listMentorCases(MENTOR, res)

    expect(res._status).toBe(200)
    const c = res._body.cases[0]
    // anonymised copy is what surfaces — never the raw
    expect(c.summary).toBe('The owner fears closure.')
    expect(c.transcript).toEqual([{ role: 'user', content: 'scrubbed words' }])
    // advisor identity is stripped from the mentor shape
    expect(c.advisorId).toBeUndefined()
    // the SQL filters to mentor_shared = 1
    expect(db.execute.mock.calls[0][0]).toMatch(/mentor_shared = 1/)
  })

  test('returns 500 on a DB error in production (no silent dev fallback)', async () => {
    const prev = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    db.execute.mockRejectedValue(new Error('connection refused'))

    const res = makeMockRes()
    await listMentorCases(MENTOR, res)

    expect(res._status).toBe(500)
    expect(res._body.error.code).toBe('DB_ERROR')
    process.env.NODE_ENV = prev
  })
})
