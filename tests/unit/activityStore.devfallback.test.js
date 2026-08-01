'use strict'

// Exercises activityStore's DEV/TEST-ONLY JSON fallback — the stub that every other
// store in this app already had and activity did not, which is the actual reason
// "My Progress" and "Team Progress" have never shown anything (two real course
// sessions completed 2026-07-28, scoring 70 and 73, were lost to it).
//
// What matters here: a completed session survives a round trip; the fallback
// reproduces the DB semantics the routes depend on (INSERT IGNORE de-duplication,
// GROUP BY with NULL as its own group, AVG ignoring NULL scores, counts arriving as
// STRINGS like mysql2's); identity scoping holds; and the honest-failure rule from
// 2026-07-29 survives one layer down — a missing file is a new advisor, a CORRUPT
// file is a fault that must be said out loud.
//
// Uses an ISOLATED temp dev file (via ACTIVITY_DEV_FILE) rather than the shared
// data/dev-activity.json — hermetic `npm test`, same convention as the caseStore and
// courseStore fallback suites. (Mocking core 'fs' is avoided: it breaks jest's own
// transformer.)

process.env.NODE_ENV = 'development'

const fs = require('fs')
const path = require('path')
const os = require('os')

// Set BEFORE requiring activityStore — DEV_ACTIVITY_FILE resolves at module load.
const DEV_FILE = path.join(os.tmpdir(), `va-test-dev-activity-${process.pid}.json`)
process.env.ACTIVITY_DEV_FILE = DEV_FILE

// DB always rejects → forces the dev fallback path.
jest.mock('../../server/utils/db', () => ({
  execute: jest.fn(() => Promise.reject(new Error('no db in this test')))
}))

const activityStore = require('../../server/utils/activityStore')

function clean () { try { fs.unlinkSync(DEV_FILE) } catch (e) { /* not there — fine */ } }

const course = over => Object.assign({
  advisorId: 'a1',
  advisorName: 'Jordan Reeve',
  firmId: 'f1',
  courseId: 'c1',
  courseTitle: 'Cashflow Basics',
  courseTopic: null,
  sessionIndex: 0,
  sessionTitle: 'Session One',
  resources: ['Quick & Worst'],
  quizScore: 70,
  tier: 'intermediate'
}, over || {})

let warnSpy
beforeEach(() => {
  clean()
  // The fallback warns on every use by design; silence it so the run stays readable.
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => warnSpy.mockRestore())
afterAll(clean)

describe('a completed session survives without any database', () => {
  test('a course session written comes back on the advisor\'s own record', async () => {
    await activityStore.recordCourseSession(course())

    const { courseSessions } = await activityStore.readAdvisorSessions('a1', 'f1')
    expect(courseSessions).toHaveLength(1)
    expect(courseSessions[0]).toMatchObject({
      course_title: 'Cashflow Basics', quiz_score: 70, highest_tier: 'intermediate'
    })
    expect(courseSessions[0].completed_at).toBeTruthy()
  })

  test('a VA session written comes back too', async () => {
    await activityStore.recordVASession({
      advisorId: 'a1', firmId: 'f1', domain: 'profit', templates: ['Quick & Worst'], tier: 'advanced'
    })

    const { vaSessions } = await activityStore.readAdvisorSessions('a1', 'f1')
    expect(vaSessions).toHaveLength(1)
    expect(vaSessions[0]).toMatchObject({ domain: 'profit', highest_tier: 'advanced' })
  })

  test('the same course session recorded twice is stored once', async () => {
    // Mirrors the DB's INSERT IGNORE on (advisor_id, course_id, session_index).
    // Without this, replaying a session locally would inflate the advisor's record.
    await activityStore.recordCourseSession(course())
    await activityStore.recordCourseSession(course({ quizScore: 99 }))

    const { courseSessions } = await activityStore.readAdvisorSessions('a1', 'f1')
    expect(courseSessions).toHaveLength(1)
    expect(courseSessions[0].quiz_score).toBe(70)
  })

  test('a different session of the same course is a separate record', async () => {
    await activityStore.recordCourseSession(course({ sessionIndex: 0 }))
    await activityStore.recordCourseSession(course({ sessionIndex: 1, quizScore: 73 }))

    const { courseSessions } = await activityStore.readAdvisorSessions('a1', 'f1')
    expect(courseSessions).toHaveLength(2)
  })
})

describe('identity scoping holds without a database', () => {
  test('an advisor never sees a colleague\'s sessions', async () => {
    await activityStore.recordCourseSession(course({ advisorId: 'a1' }))
    await activityStore.recordCourseSession(course({ advisorId: 'a2' }))

    const { courseSessions } = await activityStore.readAdvisorSessions('a1', 'f1')
    expect(courseSessions).toHaveLength(1)
    expect(courseSessions[0].advisor_id).toBe('a1')
  })

  test('a firm never sees another firm\'s team', async () => {
    await activityStore.recordCourseSession(course({ firmId: 'f1' }))
    await activityStore.recordCourseSession(course({ advisorId: 'a9', firmId: 'f2' }))

    const { courseRows } = await activityStore.readFirmSessions('f1')
    expect(courseRows.map(r => r.advisor_id)).toEqual(['a1'])
  })
})

describe('the fallback reproduces the SQL the routes rely on', () => {
  test('groups by advisor and tier, counting as a string like mysql2 does', async () => {
    await activityStore.recordCourseSession(course({ sessionIndex: 0 }))
    await activityStore.recordCourseSession(course({ sessionIndex: 1 }))

    const { courseRows } = await activityStore.readFirmSessions('f1')
    expect(courseRows).toHaveLength(1)
    // A number here would let a dropped Number() in the route pass locally and fail live.
    expect(courseRows[0].count).toBe('2')
    expect(typeof courseRows[0].avg_score).toBe('string')
  })

  test('a tierless session forms its own group, which is what makes it countable', async () => {
    await activityStore.recordCourseSession(course({ sessionIndex: 0, tier: 'intermediate' }))
    await activityStore.recordCourseSession(course({ sessionIndex: 1, tier: null }))

    const { courseRows } = await activityStore.readFirmSessions('f1')
    expect(courseRows).toHaveLength(2)
    const tiers = courseRows.map(r => r.highest_tier)
    expect(tiers).toContain('intermediate')
    expect(tiers).toContain(null)
    // Each group carries its own count — the tierless one is not folded into the other.
    expect(courseRows.every(r => r.count === '1')).toBe(true)
  })

  test('a skipped quiz is excluded from the average, not counted as zero', async () => {
    await activityStore.recordCourseSession(course({ sessionIndex: 0, quizScore: 70 }))
    await activityStore.recordCourseSession(course({ sessionIndex: 1, quizScore: null }))

    const { courseRows } = await activityStore.readFirmSessions('f1')
    expect(Number(courseRows[0].avg_score)).toBe(70)
    expect(courseRows[0].count).toBe('2')
  })

  test('round-trips the per-question record', async () => {
    const questions = [
      { bankKey: 'Ratio Analysis', bankRef: 5, score: 80, passed: true, ungraded: false },
      { bankKey: null, bankRef: null, score: null, passed: false, ungraded: true }
    ]
    await activityStore.recordCourseSession(course({ quizQuestions: questions }))

    const { courseSessions } = await activityStore.readAdvisorSessions('a1', 'f1')
    expect(JSON.parse(courseSessions[0].quiz_questions)).toEqual(questions)
  })

  test('a session with no per-question record stores null, not an empty array', async () => {
    // A skipped quiz has nothing to record. Null matches what the DB column holds
    // and is what the route's parser treats as "no detail".
    await activityStore.recordCourseSession(course({ quizQuestions: [] }))

    const { courseSessions } = await activityStore.readAdvisorSessions('a1', 'f1')
    expect(courseSessions[0].quiz_questions).toBeNull()
  })

  test('carries the display name captured at write time through to the team read', async () => {
    await activityStore.recordCourseSession(course())

    const { courseRows } = await activityStore.readFirmSessions('f1')
    expect(courseRows[0].advisor_name).toBe('Jordan Reeve')
  })

  test('a session recorded with no name reports null, not an empty string', async () => {
    // Until Advisor-e's token carries a name claim. Null is what the screen tests for
    // when deciding to fall back to the id; '' would render as a blank line.
    await activityStore.recordCourseSession(course({ advisorName: null }))

    const { courseRows } = await activityStore.readFirmSessions('f1')
    expect(courseRows[0].advisor_name).toBeNull()
  })

  test('a group with no scored quiz at all reports no average', async () => {
    await activityStore.recordCourseSession(course({ quizScore: null }))

    const { courseRows } = await activityStore.readFirmSessions('f1')
    expect(courseRows[0].avg_score).toBeNull()
  })

  test('the advisor\'s own record comes back newest first', async () => {
    await activityStore.recordCourseSession(course({ sessionIndex: 0 }))
    // Force a distinguishable, later timestamp rather than relying on clock resolution.
    const all = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8'))
    all.courseSessions[0].completed_at = '2026-07-01 09:00:00'
    all.courseSessions.push(Object.assign({}, all.courseSessions[0], {
      session_index: 1, completed_at: '2026-07-28 21:00:00'
    }))
    fs.writeFileSync(DEV_FILE, JSON.stringify(all))

    const { courseSessions } = await activityStore.readAdvisorSessions('a1', 'f1')
    expect(courseSessions.map(r => r.completed_at))
      .toEqual(['2026-07-28 21:00:00', '2026-07-01 09:00:00'])
  })
})

describe('the honest-failure rule survives inside the fallback', () => {
  test('no file yet is a genuinely new advisor, not a fault', async () => {
    const { vaSessions, courseSessions } = await activityStore.readAdvisorSessions('a1', 'f1')
    expect(vaSessions).toEqual([])
    expect(courseSessions).toEqual([])
  })

  test('a corrupt file is a fault and is thrown, never read as an empty record', async () => {
    // The defect this feature just had, one layer down: if a broken store returned
    // "nothing", a fault and a new advisor would look identical again.
    fs.writeFileSync(DEV_FILE, '{ this is not json')
    await expect(activityStore.readAdvisorSessions('a1', 'f1')).rejects.toThrow()
    await expect(activityStore.readFirmSessions('f1')).rejects.toThrow()
  })
})

describe('production never touches the fallback', () => {
  test('a database failure propagates instead of quietly using a JSON file', async () => {
    const previous = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      await expect(activityStore.readAdvisorSessions('a1', 'f1'))
        .rejects.toThrow('no db in this test')
      await expect(activityStore.readFirmSessions('f1'))
        .rejects.toThrow('no db in this test')
      await expect(activityStore.recordCourseSession(course()))
        .rejects.toThrow('no db in this test')
    } finally {
      process.env.NODE_ENV = previous
    }
  })

  test('and writes nothing to disk while doing it', async () => {
    const previous = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      await activityStore.recordVASession({
        advisorId: 'a1', firmId: 'f1', domain: 'profit', templates: [], tier: null
      }).catch(() => {})
    } finally {
      process.env.NODE_ENV = previous
    }
    expect(fs.existsSync(DEV_FILE)).toBe(false)
  })
})
