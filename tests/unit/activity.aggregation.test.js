'use strict'

/**
 * Activity routes — what the numbers ACTUALLY come out as.
 *
 * WHY THIS FILE EXISTS (2026-07-29). `activity.routes.test.js` is a security file: all six
 * of its tests prove identity is taken from the verified JWT and never from the client, and
 * every one of them hands the routes an EMPTY result set. So the fifty-odd lines that turn
 * database rows into tier cards, average quiz scores, a recent-activity list and a team
 * table had never once been run over a single row. A wrong average, a session filed under
 * the wrong capability tier, or "Recent Activity" sorted oldest-first would all have shipped
 * green.
 *
 * This file feeds realistic rows through and pins the output. It began as a record of what
 * the code did BEFORE anything was changed — including behaviours we already believed were
 * wrong, marked CURRENT BEHAVIOUR so that fixing one would fail the suite rather than pass
 * quietly. A test that agreed with every change would be worth nothing.
 *
 * One of those has since been fixed: the silent database failure (see the last describe
 * block). Two remain, both about a session carrying no capability tier.
 *
 * The database is a stand-in throughout: no MySQL is needed to run this, which is the whole
 * point — the real one has never been provisioned.
 */

process.env.MYSQL_DATABASE = 'virt_advisor_test'
process.env.MYSQL_PASSWORD = 'test'

jest.mock('../../server/utils/db', () => ({ execute: jest.fn() }))

const db = require('../../server/utils/db')
const { getProgression, getTeam } = require('../../server/routes/activity')

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeMockRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    // Success responses use res.send; error envelopes (sendError) use writeHead + end.
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { try { this._body = JSON.parse(body) } catch (e) { this._body = body } }
  }
}

// A request as it looks AFTER firmAuth has run.
function makeReq (overrides = {}) {
  return { advisorId: 'advisor-from-jwt', firmId: 'firm-from-jwt', query: {}, body: {}, ...overrides }
}

/**
 * Route the two queries by the table they name, not by call order.
 * Both routes fire their queries inside one Promise.all, and keying on order would
 * silently hand the course rows to the VA branch if those two lines were ever swapped.
 *
 * @param {object[]} vaRows     - rows for advisor_va_sessions
 * @param {object[]} courseRows - rows for advisor_course_completions
 */
function mockRowsByTable (vaRows, courseRows) {
  db.execute.mockImplementation((sql) => {
    if (sql.includes('advisor_va_sessions')) { return Promise.resolve([vaRows]) }
    if (sql.includes('advisor_course_completions')) { return Promise.resolve([courseRows]) }
    throw new Error('unexpected query: ' + sql)
  })
}

beforeEach(() => jest.clearAllMocks())

// ── getProgression — the "My Progress" screen ─────────────────────────────────

describe('getProgression — one advisor\'s own record', () => {
  // Two sessions scored 70 and 73 are the two real completions Mike ran on 2026-07-28
  // that never reached the database. They average 71.5, which is the rounding boundary.
  const VA_ROWS = [
    { highest_tier: 'advanced', domain: 'profit', completed_at: '2026-07-28T19:30:00Z' },
    { highest_tier: 'entry-level', domain: 'staff', completed_at: '2026-07-20T09:00:00Z' },
    { highest_tier: null, domain: 'cash', completed_at: '2026-07-29T08:00:00Z' }
  ]
  const COURSE_ROWS = [
    { course_id: 'c1', course_title: 'Cashflow Basics', session_index: 0, session_title: 'Session One', quiz_score: 70, highest_tier: 'intermediate', completed_at: '2026-07-28T20:00:00Z' },
    { course_id: 'c1', course_title: 'Cashflow Basics', session_index: 1, session_title: 'Session Two', quiz_score: 73, highest_tier: 'intermediate', completed_at: '2026-07-28T21:00:00Z' },
    { course_id: 'c1', course_title: 'Cashflow Basics', session_index: 2, session_title: 'Session Three', quiz_score: null, highest_tier: 'intermediate', completed_at: '2026-07-27T10:00:00Z' }
  ]

  async function run (vaRows = VA_ROWS, courseRows = COURSE_ROWS) {
    mockRowsByTable(vaRows, courseRows)
    const res = makeMockRes()
    await getProgression(makeReq(), res)
    return res
  }

  test('counts VA sessions and course sessions into the right tier', async () => {
    const res = await run()

    expect(res._status).toBe(200)
    expect(res._body.tiers['entry-level'].vaSessions).toBe(1)
    expect(res._body.tiers['entry-level'].courseSessions).toBe(0)
    expect(res._body.tiers.intermediate.vaSessions).toBe(0)
    expect(res._body.tiers.intermediate.courseSessions).toBe(3)
    expect(res._body.tiers.advanced.vaSessions).toBe(1)
    expect(res._body.tiers.advanced.courseSessions).toBe(0)
  })

  test('all three tiers are always present, even with no activity in them', async () => {
    const res = await run([], [])

    // The screen renders three cards unconditionally — a missing key would render blank,
    // not zero, and the two read very differently to an advisor.
    expect(Object.keys(res._body.tiers)).toEqual(['entry-level', 'intermediate', 'advanced'])
    expect(res._body.tiers.advanced).toEqual({
      vaSessions: 0, courseSessions: 0, avgQuizScore: null, lastActive: null
    })
  })

  test('averages quiz scores and rounds — 70 and 73 report as 72, not 71', async () => {
    const res = await run()

    // 71.5 rounds up. Pinned because a switch to truncation would move it to 71 and look
    // entirely plausible on screen.
    expect(res._body.tiers.intermediate.avgQuizScore).toBe(72)
  })

  test('a skipped quiz is left out of the average, never counted as zero', async () => {
    const res = await run()

    // Three sessions, two scores. Counting the skipped one as 0 would give 48 — an advisor
    // marked as failing for work they did complete.
    expect(res._body.tiers.intermediate.courseSessions).toBe(3)
    expect(res._body.tiers.intermediate.avgQuizScore).toBe(72)
  })

  test('a tier with sessions but no scores reports no average, not zero', async () => {
    const res = await run()

    expect(res._body.tiers.advanced.vaSessions).toBe(1)
    expect(res._body.tiers.advanced.avgQuizScore).toBeNull()
  })

  test('lastActive per tier is the most recent session in THAT tier', async () => {
    const res = await run()

    expect(res._body.tiers['entry-level'].lastActive).toBe('2026-07-20T09:00:00Z')
    expect(res._body.tiers.intermediate.lastActive).toBe('2026-07-28T21:00:00Z')
    expect(res._body.tiers.advanced.lastActive).toBe('2026-07-28T19:30:00Z')
  })

  test('a row with no tier is dropped from the counts entirely', async () => {
    const res = await run()

    // The 2026-07-29 VA session has no tier. It must not inflate a count, and — the part
    // that would be easy to get wrong — it must not become any tier's lastActive either,
    // even though it is the newest row in the set.
    const totals = ['entry-level', 'intermediate', 'advanced']
      .reduce((n, t) => n + res._body.tiers[t].vaSessions, 0)
    expect(totals).toBe(2)
    expect(Object.values(res._body.tiers).map(t => t.lastActive))
      .not.toContain('2026-07-29T08:00:00Z')
  })

  test('recent activity merges both sources, newest first', async () => {
    const res = await run()

    const stamps = res._body.recentActivity.map(r => r.completedAt)
    expect(stamps).toEqual([...stamps].sort().reverse())
    expect(res._body.recentActivity[0].type).toBe('va')
    expect(res._body.recentActivity[1]).toMatchObject({
      type: 'course', sessionTitle: 'Session Two', quizScore: 73, tier: 'intermediate'
    })
  })

  test('a VA entry carries its domain and a course entry its titles and score', async () => {
    const res = await run()

    // The two row types are shaped differently and the screen switches on `type`.
    const va = res._body.recentActivity.find(r => r.type === 'va' && r.tier === 'advanced')
    expect(va).toEqual({
      type: 'va', domain: 'profit', tier: 'advanced', completedAt: '2026-07-28T19:30:00Z'
    })
    const course = res._body.recentActivity.find(r => r.sessionTitle === 'Session One')
    expect(course).toEqual({
      type: 'course',
      courseTitle: 'Cashflow Basics',
      sessionTitle: 'Session One',
      quizScore: 70,
      tier: 'intermediate',
      completedAt: '2026-07-28T20:00:00Z'
    })
  })

  test('recent activity is capped at 10 and keeps the 10 newest', async () => {
    const many = Array.from({ length: 14 }, (_, i) => ({
      highest_tier: 'entry-level',
      domain: 'profit',
      // i=0 is the oldest (July 1st), i=13 the newest.
      completed_at: `2026-07-${String(i + 1).padStart(2, '0')}T09:00:00Z`
    }))
    const res = await run(many, [])

    expect(res._body.recentActivity).toHaveLength(10)
    expect(res._body.recentActivity[0].completedAt).toBe('2026-07-14T09:00:00Z')
    expect(res._body.recentActivity[9].completedAt).toBe('2026-07-05T09:00:00Z')
    // The tier count is NOT capped — all 14 still count towards capability.
    expect(res._body.tiers['entry-level'].vaSessions).toBe(14)
  })

  test('CURRENT BEHAVIOUR — a tierless session still appears in Recent Activity', async () => {
    const res = await run()

    // The recent list maps every row; the tier counts skip tierless ones. So this session
    // is visible to the advisor while counting towards nothing. Recorded, not endorsed —
    // if the tier lookup starts returning null often this becomes a real inconsistency.
    const orphan = res._body.recentActivity.find(r => r.completedAt === '2026-07-29T08:00:00Z')
    expect(orphan).toBeDefined()
    expect(orphan.tier).toBeNull()
  })

  test('the advisor ID in the reply is the one from the verified pass', async () => {
    const res = await run()

    expect(res._body.advisorId).toBe('advisor-from-jwt')
    expect(res._body.success).toBe(true)
  })
})

// ── getTeam — the "Team Progress" table ───────────────────────────────────────

describe('getTeam — the firm manager\'s table', () => {
  // COUNT and AVG come back from mysql2 as strings, not numbers. Both are deliberately
  // given as strings here: '3' + '2' would concatenate to "32" if a Number() were dropped.
  const VA_ROWS = [
    { advisor_id: 'adv-a', highest_tier: 'advanced', count: '3', last_active: '2026-07-28T19:00:00Z' },
    { advisor_id: 'adv-b', highest_tier: 'entry-level', count: '1', last_active: '2026-07-10T09:00:00Z' }
  ]
  const COURSE_ROWS = [
    { advisor_id: 'adv-a', highest_tier: 'intermediate', count: '2', avg_score: '71.5000', last_active: '2026-07-28T21:00:00Z' },
    { advisor_id: 'adv-b', highest_tier: 'entry-level', count: '4', avg_score: '64.4000', last_active: '2026-07-11T09:00:00Z' }
  ]

  async function run (vaRows = VA_ROWS, courseRows = COURSE_ROWS) {
    mockRowsByTable(vaRows, courseRows)
    const res = makeMockRes()
    await getTeam(makeReq(), res)
    return res
  }

  test('one entry per advisor, each with all three tiers', async () => {
    const res = await run()

    expect(res._status).toBe(200)
    expect(res._body.advisors).toHaveLength(2)
    expect(Object.keys(res._body.advisors[0].tiers))
      .toEqual(['entry-level', 'intermediate', 'advanced'])
  })

  test('counts arrive as text from the database and are stored as numbers', async () => {
    const res = await run()

    const a = res._body.advisors.find(x => x.advisorId === 'adv-a')
    expect(a.tiers.advanced.vaSessions).toBe(3)
    expect(a.tiers.intermediate.courseSessions).toBe(2)
  })

  test('the average is rounded from the database decimal', async () => {
    const res = await run()

    const a = res._body.advisors.find(x => x.advisorId === 'adv-a')
    const b = res._body.advisors.find(x => x.advisorId === 'adv-b')
    expect(a.tiers.intermediate.avgQuizScore).toBe(72) // 71.5 up
    expect(b.tiers['entry-level'].avgQuizScore).toBe(64) // 64.4 down
  })

  test('totalSessions adds both kinds across every tier', async () => {
    const res = await run()

    const a = res._body.advisors.find(x => x.advisorId === 'adv-a')
    const b = res._body.advisors.find(x => x.advisorId === 'adv-b')
    expect(a.totalSessions).toBe(5) // 3 VA advanced + 2 course intermediate
    expect(b.totalSessions).toBe(5) // 1 VA entry + 4 course entry
  })

  test('lastActive is the latest across both sources, and the table sorts by it', async () => {
    const res = await run()

    expect(res._body.advisors.map(a => a.advisorId)).toEqual(['adv-a', 'adv-b'])
    expect(res._body.advisors[0].lastActive).toBe('2026-07-28T21:00:00Z')
    expect(res._body.advisors[1].lastActive).toBe('2026-07-11T09:00:00Z')
  })

  test('a team tier carries no lastActive of its own — only the advisor does', async () => {
    const res = await run()

    // Deliberately a different shape from the personal view, where every tier has one.
    // Pinned so the two screens cannot drift apart unnoticed.
    expect(res._body.advisors[0].tiers.advanced).toEqual({
      vaSessions: 3, courseSessions: 0, avgQuizScore: null
    })
  })

  test('an advisor with no course scores reports no average, not zero', async () => {
    const res = await run(VA_ROWS, [])

    const a = res._body.advisors.find(x => x.advisorId === 'adv-a')
    expect(a.tiers.advanced.vaSessions).toBe(3)
    expect(a.tiers.advanced.avgQuizScore).toBeNull()
  })

  test('CURRENT BEHAVIOUR — a tierless row lists the advisor with nothing recorded', async () => {
    const res = await run([
      { advisor_id: 'adv-c', highest_tier: null, count: '9', last_active: '2026-07-28T12:00:00Z' }
    ], [])

    // The advisor row is created before the tier is checked, so adv-c appears on the
    // manager's table with all zeros and no last-active date, despite nine real sessions.
    // Recorded, not endorsed — to a manager this reads as an advisor who has done nothing.
    expect(res._body.advisors).toHaveLength(1)
    expect(res._body.advisors[0]).toMatchObject({
      advisorId: 'adv-c', lastActive: null, totalSessions: 0
    })
  })

  test('the firm ID in the reply is the one from the verified pass', async () => {
    const res = await run()

    expect(res._body.firmId).toBe('firm-from-jwt')
    expect(res._body.success).toBe(true)
  })
})

// ── How the routes behave when the database is not there ──────────────────────

describe('database failure — the advisor is told, not shown a page of zeros', () => {
  let errSpy

  beforeEach(() => { errSpy = jest.spyOn(console, 'error').mockImplementation(() => {}) })
  afterEach(() => errSpy.mockRestore())

  /**
   * FIXED 2026-07-29. Until this date each query ended `.catch(() => [[]])`, so a refused
   * connection was replaced with an empty result: the advisor saw a tidy page of zeros and
   * "No activity yet", identical in every pixel to a genuinely new advisor. That is what
   * kept the only real fault in this feature invisible for months — Mike completed two
   * course sessions on 2026-07-28 and the failure was silent at both ends.
   *
   * The four swallows are gone. The honest path below them already existed, and the screen's
   * error state (AdvisorProgression.vue — a message plus a Try Again button) already
   * existed too; it had simply never been reachable.
   *
   * These tests replace three that pinned the old behaviour deliberately, so that removing
   * the swallow could not pass unnoticed. It did not: the mutation run flagged it.
   *
   * NOT changed, and deliberately so: the WRITE path (activityLogger) stays fire-and-forget.
   * A database outage must never interrupt an advisor mid-session. Only reading is loud.
   */
  test('a refused connection is an error, not an empty record', async () => {
    db.execute.mockRejectedValue(new Error("Access denied for user 'root'@'localhost'"))
    const res = makeMockRes()

    await getProgression(makeReq(), res)

    expect(res._status).toBe(500)
    expect(res._body.error.code).toBe('DB_ERROR')
    expect(res._body.success).toBe(false)
    // The reply must not be mistakable for a real, empty record.
    expect(res._body.tiers).toBeUndefined()
    expect(res._body.recentActivity).toBeUndefined()
  })

  test('the manager is told too — a broken firm never reads as an empty one', async () => {
    db.execute.mockRejectedValue(new Error("Access denied for user 'root'@'localhost'"))
    const res = makeMockRes()

    await getTeam(makeReq(), res)

    expect(res._status).toBe(500)
    expect(res._body.error.code).toBe('DB_ERROR')
    expect(res._body.advisors).toBeUndefined()
  })

  test('both ways a query can fail now give the same honest answer', async () => {
    // A rejected promise and a synchronous throw used to diverge — 200 for one, 500 for the
    // other, in the same feature. Pinned together so they can never drift apart again.
    db.execute.mockImplementation(() => { throw new Error('pool exhausted') })
    const res = makeMockRes()

    await getProgression(makeReq(), res)

    expect(res._status).toBe(500)
    expect(res._body.error.code).toBe('DB_ERROR')
  })

  test('the real reason is logged for the operator, never sent to the browser', async () => {
    db.execute.mockRejectedValue(new Error("Access denied for user 'root'@'localhost'"))
    const res = makeMockRes()

    await getProgression(makeReq(), res)

    // Full detail server-side...
    expect(errSpy).toHaveBeenCalled()
    expect(errSpy.mock.calls.flat().join(' ')).toMatch(/Access denied/)
    // ...safe generic message to the client. No credentials, host or SQL leaves the server.
    const body = JSON.stringify(res._body)
    expect(body).not.toMatch(/Access denied/)
    expect(body).not.toMatch(/root|localhost|SELECT/)
  })

  test('an empty database still reads as a genuinely new advisor', async () => {
    // The other half of the fix: "nothing yet" must still be possible to say. If every
    // empty result now looked like an error, a new advisor would be shown a fault.
    mockRowsByTable([], [])
    const res = makeMockRes()

    await getProgression(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.success).toBe(true)
    expect(res._body.recentActivity).toEqual([])
    expect(res._body.tiers['entry-level'].vaSessions).toBe(0)
  })
})
