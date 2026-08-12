'use strict'

// How firms are using the app — the mentor's adoption view.
//
// THE ARTEFACT IS design/mockups/mentor-adoption-view.html, ruled by Mike on
// 2026-08-09. Its §3 holds four decisions, and the three that are testable are
// tested here by name: the firms list is read, Avg quiz stays, and the quiet line
// is 60 days. A test that names the ruling is what stops the build drifting from
// the artefact quietly — the failure the Save-the-Artefact rule exists to prevent.
//
// WHY THIS PAGE IS NOT A ROLL-UP OF TEAM PROGRESS. That tab lists a firm's advisers
// BY NAME. Widening it would have put every firm's people in front of Advisor-e,
// against a boundary this codebase enforces in code. The privacy tests below are
// therefore the point of the file, not an afterthought.

const {
  QUIET_AFTER_DAYS,
  STATUS,
  statusFor,
  mergeActivityRows,
  assertNoPersonalFields,
  buildAdoptionView
} = require('../../server/utils/mentorAdoption')

const NOW = '2026-08-09T12:00:00.000Z'
const nowMs = Date.parse(NOW)
const daysAgo = n => new Date(nowMs - n * 24 * 60 * 60 * 1000).toISOString()

describe('the rulings on the artefact', () => {
  it('RULED — a firm is quiet after 60 days, not 30', () => {
    expect(QUIET_AFTER_DAYS).toBe(60)
  })

  it('RULED — six weeks ago still reads Active, which is the line made visible', () => {
    // The artefact shows this row deliberately rather than stating the number.
    expect(statusFor(daysAgo(42), nowMs)).toBe(STATUS.active)
  })

  it('a firm silent for longer than the line has slowed down', () => {
    expect(statusFor(daysAgo(61), nowMs)).toBe(STATUS.slowed)
  })

  it('the boundary day itself is still Active — the line is inclusive', () => {
    expect(statusFor(daysAgo(60), nowMs)).toBe(STATUS.active)
  })

  it('a firm with no activity at all has never started', () => {
    expect(statusFor(null, nowMs)).toBe(STATUS.never)
  })

  it('an unreadable stamp counts as never started, not as active', () => {
    // Treating a data fault as activity would hide a firm that needs chasing.
    expect(statusFor('not-a-date', nowMs)).toBe(STATUS.never)
  })
})

describe('privacy — the boundary this page must not cross', () => {
  it('throws rather than publishing an adviser name', () => {
    expect(() => assertNoPersonalFields({ firms: [{ advisorName: 'Jo Smith' }] }))
      .toThrow(/advisorName/)
  })

  it('throws on the snake_case column name too, which is the shape a raw row has', () => {
    expect(() => assertNoPersonalFields({ rows: [{ advisor_id: 'adv-1' }] }))
      .toThrow(/advisor_id/)
  })

  it('throws on client work reaching the payload', () => {
    expect(() => assertNoPersonalFields({ x: { transcript: '...' } })).toThrow(/transcript/)
    expect(() => assertNoPersonalFields({ x: { clientName: 'Acme' } })).toThrow(/clientName/)
  })

  it('a real payload passes — the check is not merely always-throwing', () => {
    const report = buildAdoptionView({
      now: NOW,
      firms: [{ id: 'firm-a', name: 'Hartley & Vine' }],
      activity: [{ firmId: 'firm-a', advisers: 4, sessions: 40, courses: 9, avgQuiz: 71, lastSeen: daysAgo(2) }]
    })
    expect(report.firms).toHaveLength(1)
  })

  it('the built payload carries no adviser identity, whatever the input tried to pass', () => {
    // The caller smuggles a name in. It does not reach the payload, and NOT because
    // the guard catches it — the row builder names the fields it copies, so an extra
    // field is dropped rather than refused. That is the stronger of the two
    // mechanisms: it holds for a field nobody thought to forbid.
    const report = buildAdoptionView({
      now: NOW,
      firms: [{ id: 'firm-a', name: 'A' }],
      activity: [{ firmId: 'firm-a', advisers: 1, advisor_name: 'Jo Smith', advisorName: 'Jo Smith' }]
    })

    expect(JSON.stringify(report)).not.toContain('Jo Smith')
    expect(Object.keys(report.firms[0]).sort()).toEqual([
      'advisers', 'avgQuiz', 'courses', 'firmId', 'firmName', 'lastSeen', 'named', 'sessions', 'status'
    ])
  })

  it('the guard is the backstop for the day that whitelist is widened', () => {
    // Belt and braces, and worth keeping separate: the test above proves today's
    // shape is clean, this one proves the alarm still works if tomorrow's is not.
    const clean = buildAdoptionView({ now: NOW, firms: [{ id: 'a', name: 'A' }], activity: [] })
    expect(() => assertNoPersonalFields({ ...clean, extra: { advisorName: 'Jo' } }))
      .toThrow(/forbidden field "advisorName"/)
  })
})

describe('the firms list is read — RULED, and it is what makes the page useful', () => {
  it('a firm that has never started appears, with zeros', () => {
    const report = buildAdoptionView({
      now: NOW,
      firms: [{ id: 'firm-a', name: 'Active Co' }, { id: 'firm-z', name: 'Pentland Fiscal' }],
      activity: [{ firmId: 'firm-a', advisers: 3, sessions: 30, courses: 4, avgQuiz: 66, lastSeen: daysAgo(1) }]
    })

    const never = report.firms.find(f => f.firmId === 'firm-z')
    expect(never.status).toBe(STATUS.never)
    expect(never.sessions).toBe(0)
    expect(never.advisers).toBe(0)
    expect(never.lastSeen).toBeNull()
    expect(report.totals.neverStartedFirms).toBe(1)
  })

  it('a real name is used, and a missing one falls back to the id', () => {
    const report = buildAdoptionView({
      now: NOW,
      firms: [{ id: 'firm-a', name: 'Hartley & Vine' }, { id: 'firm-b', name: null }],
      activity: []
    })

    const named = report.firms.find(f => f.firmId === 'firm-a')
    const unnamed = report.firms.find(f => f.firmId === 'firm-b')

    expect(named.firmName).toBe('Hartley & Vine')
    expect(named.named).toBe(true)
    // In the master app the firms table may be Advisor-e's rather than ours, so a
    // missing name is expected. `named` is what lets the screen show it as a code
    // rather than passing an id off as a name.
    expect(unnamed.firmName).toBe('firm-b')
    expect(unnamed.named).toBe(false)
  })

  it('THE DIRECTORY IS NOT A FILTER — a firm with activity but no directory row still shows', () => {
    // The failure this guards: a directory read that misses a firm would otherwise
    // delete that firm's real sessions from the page, under-reporting adoption with
    // nothing on screen to say so.
    const report = buildAdoptionView({
      now: NOW,
      firms: [],
      activity: [{ firmId: 'firm-ghost', advisers: 2, sessions: 12, courses: 0, avgQuiz: null, lastSeen: daysAgo(3) }]
    })

    expect(report.firms).toHaveLength(1)
    expect(report.firms[0].firmId).toBe('firm-ghost')
    expect(report.firms[0].status).toBe(STATUS.active)
  })
})

describe('the counts', () => {
  it('RULED — Avg quiz stays on the page, and is null when nothing was scored', () => {
    const report = buildAdoptionView({
      now: NOW,
      firms: [{ id: 'firm-a', name: 'A' }, { id: 'firm-b', name: 'B' }],
      activity: [
        { firmId: 'firm-a', advisers: 1, sessions: 1, courses: 1, avgQuiz: 70.6, lastSeen: daysAgo(1) },
        { firmId: 'firm-b', advisers: 1, sessions: 1, courses: 0, avgQuiz: null, lastSeen: daysAgo(1) }
      ]
    })

    expect(report.firms.find(f => f.firmId === 'firm-a').avgQuiz).toBe(71)
    // Not 0 — a firm that has sat no quiz has no score, and 0% would read as failure.
    expect(report.firms.find(f => f.firmId === 'firm-b').avgQuiz).toBeNull()
  })

  it('busiest firm first', () => {
    const report = buildAdoptionView({
      now: NOW,
      firms: [],
      activity: [
        { firmId: 'small', advisers: 1, sessions: 5, courses: 1, lastSeen: daysAgo(1) },
        { firmId: 'big', advisers: 9, sessions: 200, courses: 40, lastSeen: daysAgo(1) }
      ]
    })

    expect(report.firms.map(f => f.firmId)).toEqual(['big', 'small'])
  })

  it('the totals count firms by status and add the work up', () => {
    const report = buildAdoptionView({
      now: NOW,
      firms: [{ id: 'c', name: 'C' }],
      activity: [
        { firmId: 'a', advisers: 3, sessions: 10, courses: 2, lastSeen: daysAgo(1) },
        { firmId: 'b', advisers: 2, sessions: 4, courses: 1, lastSeen: daysAgo(200) }
      ]
    })

    expect(report.totals.activeFirms).toBe(1)
    expect(report.totals.slowedFirms).toBe(1)
    expect(report.totals.neverStartedFirms).toBe(1)
    expect(report.totals.advisers).toBe(5)
    expect(report.totals.sessionsAndCourses).toBe(17)
  })
})

describe('mergeActivityRows — folding the three queries into one row per firm', () => {
  it('ADVISERS ARE NOT ADDED UP — the count comes from the UNION query alone', () => {
    // The defect this guards: one adviser who did both a session and a course is
    // one person. Summing the two tables would inflate exactly the firms that use
    // the product properly, which is the opposite of what the page is for.
    const merged = mergeActivityRows({
      vaRows: [{ firm_id: 'a', sessions: 12, last_active: daysAgo(5) }],
      courseRows: [{ firm_id: 'a', courses: 4, avg_score: 70, last_active: daysAgo(9) }],
      adviserRows: [{ firm_id: 'a', advisers: 3 }]
    })

    expect(merged[0].advisers).toBe(3)
    expect(merged[0].sessions).toBe(12)
    expect(merged[0].courses).toBe(4)
  })

  it('last seen is the most recent across BOTH kinds of work', () => {
    // A firm whose only recent work is a course must not read as last seen months
    // ago because the sessions table has an older stamp.
    const merged = mergeActivityRows({
      vaRows: [{ firm_id: 'a', sessions: 3, last_active: daysAgo(90) }],
      courseRows: [{ firm_id: 'a', courses: 1, avg_score: null, last_active: daysAgo(2) }],
      adviserRows: [{ firm_id: 'a', advisers: 1 }]
    })

    expect(merged[0].lastSeen).toBe(daysAgo(2))
  })

  it('a firm present in only one table still gets a row', () => {
    const merged = mergeActivityRows({
      vaRows: [],
      courseRows: [{ firm_id: 'courses-only', courses: 2, avg_score: 55, last_active: daysAgo(1) }],
      adviserRows: [{ firm_id: 'courses-only', advisers: 1 }]
    })

    expect(merged).toHaveLength(1)
    expect(merged[0].sessions).toBe(0)
    expect(merged[0].courses).toBe(2)
  })

  it('survives empty and malformed input rather than throwing', () => {
    expect(mergeActivityRows(null)).toEqual([])
    expect(mergeActivityRows({ vaRows: [null, { sessions: 1 }] })).toEqual([])
  })
})
