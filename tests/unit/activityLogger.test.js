'use strict'

/**
 * activityLogger — the two WRITE paths for advisor activity.
 *
 * WHY THIS FILE EXISTS. This is the last untested file in the advisor-progress
 * workstream. Everything around it now has coverage — activityStore (17 tests), the
 * read routes (30), the aggregation (24), quizRecord (22) — but the functions that
 * decide WHAT gets written had never run under a single test. That matters more than
 * it sounds: a value truncated at the wrong length, a tier computed from the wrong
 * list, or a genuine score of 0 turned into "no score" would all be written into a
 * permanent record, and no read-side test could tell afterwards.
 *
 * TWO CONTRACTS ARE PINNED HERE, and they pull in opposite directions on purpose:
 *
 * 1. **Fire-and-forget.** A storage failure must NEVER interrupt a live advisor
 *    session. Both functions swallow their errors deliberately. This is the exact
 *    opposite of the read path, where a swallowed failure was the defect fixed on
 *    2026-07-29 — so the asymmetry is tested explicitly rather than left to be
 *    "corrected" by someone who has only read the other half.
 *
 * 2. **Swallowed is not silent.** Every swallow still reports to the server console.
 *    That console line is the only trace a lost write leaves; without it this would
 *    be exactly the invisible-failure bug the read path had.
 *
 * The store is a stand-in throughout, so these need no MySQL and no dev file.
 */

jest.mock('../../server/utils/activityStore', () => ({
  recordVASession: jest.fn(),
  recordCourseSession: jest.fn()
}))

const activityStore = require('../../server/utils/activityStore')
const { getHighestTier } = require('../../server/utils/tierLookup')
const { logVASession, logCourseSession } = require('../../server/utils/activityLogger')

/** A template title the catalogue really knows, so the tier assertions mean something. */
const KNOWN_TEMPLATES = ['7 Cash Drivers', 'Working Capital Cycle']

/** The row handed to the store by the last call. */
function lastVARow () { return activityStore.recordVASession.mock.calls[0][0] }
function lastCourseRow () { return activityStore.recordCourseSession.mock.calls[0][0] }

/** A course payload with every required field present. */
function courseParams (overrides) {
  return Object.assign({
    advisorId: 'advisor-1',
    firmId: 'firm-1',
    courseId: 'course-1',
    courseTitle: 'Cash Flow Fundamentals',
    sessionIndex: 0,
    sessionTitle: 'Session One'
  }, overrides || {})
}

let consoleError

beforeEach(() => {
  jest.clearAllMocks()
  activityStore.recordVASession.mockResolvedValue(undefined)
  activityStore.recordCourseSession.mockResolvedValue(undefined)
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => { consoleError.mockRestore() })

// ── Nothing is written without an identity ────────────────────────────────────

describe('a write without an identity never happens', () => {
  // These are JWT-derived. Absent identity means the caller has no verified user, and
  // a row that cannot be attributed is worse than no row: it inflates a firm's totals
  // and belongs to nobody.
  describe('logVASession', () => {
    test.each([
      ['no advisorId', null, 'firm-1'],
      ['no firmId', 'advisor-1', null],
      ['empty advisorId', '', 'firm-1'],
      ['empty firmId', 'advisor-1', ''],
      ['neither', undefined, undefined]
    ])('%s writes nothing', async (_label, advisorId, firmId) => {
      await logVASession(advisorId, firmId, 'profit', KNOWN_TEMPLATES)
      expect(activityStore.recordVASession).not.toHaveBeenCalled()
    })
  })

  describe('logCourseSession', () => {
    test.each([
      ['no advisorId', { advisorId: null }],
      ['no firmId', { firmId: null }],
      ['no courseId', { courseId: null }],
      ['empty courseId', { courseId: '' }]
    ])('%s writes nothing', async (_label, overrides) => {
      await logCourseSession(courseParams(overrides))
      expect(activityStore.recordCourseSession).not.toHaveBeenCalled()
    })

    test.each([
      ['undefined', undefined],
      ['null', null]
    ])('a %s payload is survived, not thrown on', async (_label, payload) => {
      await expect(logCourseSession(payload)).resolves.toBeUndefined()
      expect(activityStore.recordCourseSession).not.toHaveBeenCalled()
    })
  })
})

// ── Fire-and-forget: the contract that protects a live session ────────────────

describe('a storage failure never reaches the caller', () => {
  // The design decision this feature rests on: an advisor mid-session must not see
  // their conversation die because a database was unreachable.
  test('logVASession swallows the error and reports it to the console', async () => {
    activityStore.recordVASession.mockRejectedValue(new Error('Access denied for user'))

    await expect(logVASession('advisor-1', 'firm-1', 'profit', KNOWN_TEMPLATES))
      .resolves.toBeUndefined()

    expect(consoleError).toHaveBeenCalledTimes(1)
    expect(String(consoleError.mock.calls[0][0])).toContain('logVASession failed')
    // The reason must survive: "it failed" with no cause is what made the live
    // MySQL refusal take a day to pin down.
    expect(consoleError.mock.calls[0][1]).toContain('Access denied')
  })

  test('logCourseSession swallows the error and reports it to the console', async () => {
    activityStore.recordCourseSession.mockRejectedValue(new Error('ECONNREFUSED 3306'))

    await expect(logCourseSession(courseParams())).resolves.toBeUndefined()

    expect(consoleError).toHaveBeenCalledTimes(1)
    expect(String(consoleError.mock.calls[0][0])).toContain('logCourseSession failed')
    expect(consoleError.mock.calls[0][1]).toContain('ECONNREFUSED')
  })

  test('a successful write says nothing at all', async () => {
    await logVASession('advisor-1', 'firm-1', 'profit', KNOWN_TEMPLATES)
    await logCourseSession(courseParams())
    expect(consoleError).not.toHaveBeenCalled()
  })
})

// ── What actually gets stored ─────────────────────────────────────────────────

describe('logVASession — the row it builds', () => {
  test('passes identity, domain and templates through', async () => {
    await logVASession('advisor-1', 'firm-1', 'profit', KNOWN_TEMPLATES, 'Sample Advisor')

    expect(lastVARow()).toMatchObject({
      advisorId: 'advisor-1',
      advisorName: 'Sample Advisor',
      firmId: 'firm-1',
      domain: 'profit',
      templates: KNOWN_TEMPLATES
    })
  })

  test('computes the tier at write time from the recommended templates', async () => {
    // Stored, never recomputed on read: the catalogue changes, and a session done in
    // March must not silently change tier in July because a tool was re-filed.
    await logVASession('advisor-1', 'firm-1', 'profit', KNOWN_TEMPLATES)

    const expected = getHighestTier(KNOWN_TEMPLATES)
    expect(expected).not.toBeNull() // the fixture must exercise a real lookup
    expect(lastVARow().tier).toBe(expected)
  })

  test('a session with no recognised tool is stored with no tier, not dropped', async () => {
    // These are routine — a client conversation can end without a recommendation —
    // and the read side counts them as "not yet at a level".
    await logVASession('advisor-1', 'firm-1', 'profit', ['Not A Real Template'])

    expect(activityStore.recordVASession).toHaveBeenCalledTimes(1)
    expect(lastVARow().tier).toBeNull()
  })

  test.each([
    ['undefined', undefined],
    ['null', null],
    ['a string', 'Some Template'],
    ['an object', { 0: 'Some Template' }]
  ])('a non-array template list (%s) becomes an empty list', async (_label, templates) => {
    await logVASession('advisor-1', 'firm-1', 'profit', templates)

    expect(lastVARow().templates).toEqual([])
    expect(lastVARow().tier).toBeNull()
  })

  test.each([
    ['no name given', undefined, null],
    ['an empty name', '', null],
    ['a real name', 'Mike Barnes', 'Mike Barnes']
  ])('%s stores %j', async (_label, given, expected) => {
    // Null is a valid answer — the screens fall back to the advisor id rather than
    // inventing a name. An empty string would render as a blank where a name belongs.
    await logVASession('advisor-1', 'firm-1', 'profit', KNOWN_TEMPLATES, given)
    expect(lastVARow().advisorName).toBe(expected)
  })

  test('a missing domain is stored as null, not as the string "null"', async () => {
    await logVASession('advisor-1', 'firm-1', null, KNOWN_TEMPLATES)
    expect(lastVARow().domain).toBeNull()
  })
})

describe('logCourseSession — the row it builds', () => {
  test('passes every field through', async () => {
    await logCourseSession(courseParams({
      advisorName: 'Sample Advisor Two',
      courseTopic: 'Cash',
      sessionResources: KNOWN_TEMPLATES,
      quizScore: 73
    }))

    expect(lastCourseRow()).toMatchObject({
      advisorId: 'advisor-1',
      advisorName: 'Sample Advisor Two',
      firmId: 'firm-1',
      courseId: 'course-1',
      courseTitle: 'Cash Flow Fundamentals',
      courseTopic: 'Cash',
      sessionIndex: 0,
      sessionTitle: 'Session One',
      resources: KNOWN_TEMPLATES,
      quizScore: 73
    })
  })

  test('computes the tier from the session resources', async () => {
    await logCourseSession(courseParams({ sessionResources: KNOWN_TEMPLATES }))

    const expected = getHighestTier(KNOWN_TEMPLATES)
    expect(expected).not.toBeNull()
    expect(lastCourseRow().tier).toBe(expected)
  })

  describe('the quiz score', () => {
    test('a genuine zero is stored as zero, not discarded', async () => {
      // The distinction that caused a live P1 in quizRecord on 2026-07-29: 0 is a real
      // score. Anything treating it as "missing" fabricates an absence.
      await logCourseSession(courseParams({ quizScore: 0 }))
      expect(lastCourseRow().quizScore).toBe(0)
    })

    test.each([
      ['null', null],
      ['undefined', undefined],
      ['omitted', 'OMIT']
    ])('a %s score is stored as null — a skipped quiz is not a failed one', async (_l, given) => {
      const params = courseParams()
      if (given !== 'OMIT') { params.quizScore = given }
      await logCourseSession(params)
      expect(lastCourseRow().quizScore).toBeNull()
    })
  })

  describe('the per-question record', () => {
    test('is passed through when present', async () => {
      const questions = [{ bankKey: 'Debtor Protocols', bankRef: 1, score: 40, passed: false, ungraded: false }]
      await logCourseSession(courseParams({ quizQuestions: questions }))
      expect(lastCourseRow().quizQuestions).toEqual(questions)
    })

    test.each([
      ['omitted', undefined],
      ['null', null],
      ['not an array', 'answer text']
    ])('a %s record becomes an empty list, never undefined', async (_label, given) => {
      // Defaulted here so a direct caller cannot write an undefined into the column.
      await logCourseSession(courseParams({ quizQuestions: given }))
      expect(lastCourseRow().quizQuestions).toEqual([])
    })
  })

  test.each([
    ['omitted', undefined],
    ['null', null],
    ['a string', 'One Template']
  ])('a %s resource list becomes empty, and the tier null', async (_label, given) => {
    await logCourseSession(courseParams({ sessionResources: given }))
    expect(lastCourseRow().resources).toEqual([])
    expect(lastCourseRow().tier).toBeNull()
  })

  test('a missing title is stored as an empty string, not "undefined"', async () => {
    // String(undefined) is the four-letter word "undefined", which would render on a
    // manager's screen as if it were the session's name.
    await logCourseSession(courseParams({ courseTitle: undefined, sessionTitle: undefined }))

    expect(lastCourseRow().courseTitle).toBe('')
    expect(lastCourseRow().sessionTitle).toBe('')
  })

  test('a missing topic is null rather than the string "null"', async () => {
    await logCourseSession(courseParams({ courseTopic: undefined }))
    expect(lastCourseRow().courseTopic).toBeNull()
  })
})

// ── Length caps ───────────────────────────────────────────────────────────────

describe('every stored string is capped to its column width', () => {
  // The identity comes from a verified token, but titles and resources originate in
  // the browser. An oversized value must be cut here rather than rejected by the
  // database mid-session — the write is fire-and-forget and would vanish silently.
  const long = 'x'.repeat(1000)

  test('logVASession caps advisorId, advisorName, firmId and domain', async () => {
    await logVASession(long, long, long, KNOWN_TEMPLATES, long)

    const row = lastVARow()
    expect(row.advisorId).toHaveLength(64)
    expect(row.firmId).toHaveLength(64)
    expect(row.advisorName).toHaveLength(128)
    expect(row.domain).toHaveLength(128)
  })

  test('logCourseSession caps every string it stores', async () => {
    await logCourseSession(courseParams({
      advisorId: long,
      advisorName: long,
      firmId: long,
      courseId: long,
      courseTitle: long,
      courseTopic: long,
      sessionTitle: long
    }))

    const row = lastCourseRow()
    expect(row.advisorId).toHaveLength(64)
    expect(row.firmId).toHaveLength(64)
    expect(row.courseId).toHaveLength(64)
    expect(row.advisorName).toHaveLength(128)
    expect(row.courseTitle).toHaveLength(255)
    expect(row.courseTopic).toHaveLength(255)
    expect(row.sessionTitle).toHaveLength(255)
  })

  test('a value already within its cap is untouched', async () => {
    await logVASession('advisor-1', 'firm-1', 'profit', KNOWN_TEMPLATES, 'Mike Barnes')

    expect(lastVARow().advisorId).toBe('advisor-1')
    expect(lastVARow().advisorName).toBe('Mike Barnes')
  })
})

// ── Recorded, not fixed ───────────────────────────────────────────────────────

describe('sessionIndex is validated BEFORE anything is written', () => {
  // This block was "CURRENT BEHAVIOUR — sessionIndex is not validated": a
  // characterisation suite that pinned the defect and said, in as many words, that a fix
  // should FAIL it and be read rather than pass quietly. It did exactly that on
  // 2026-08-03. The full reasoning now lives in server/utils/sessionIndex.
  //
  // The two failures it guards are OPPOSITE, which is why a coercion could never be the
  // answer: `Number(null)` is 0 — a session the advisor never sat, recorded as fact —
  // while `Number('abc')` is NaN, which MySQL discards and the fire-and-forget catch
  // hides. One fabricates a record, the other loses one.

  test.each([
    ['undefined', undefined],
    ['null — the dangerous one: Number(null) is 0, a real session index', null],
    ['an empty string — Number("") is also 0', ''],
    ['an empty array — Number([]) is also 0', []],
    ['true — Number(true) is 1, filing against session two', true],
    ['a word', 'abc'],
    ['an object', {}],
    ['a negative index', -1],
    ['a fraction', 1.5],
    ['past the TINYINT UNSIGNED ceiling', 256]
  ])('refuses %s, and writes nothing', async (_label, sessionIndex) => {
    await logCourseSession(courseParams({ sessionIndex }))

    expect(activityStore.recordCourseSession).not.toHaveBeenCalled()
    // Swallowed is not silent — the refusal names itself and the value it refused.
    expect(consoleError).toHaveBeenCalled()
    expect(consoleError.mock.calls[0][0]).toContain('sessionIndex')
  })

  test.each([
    ['zero — a legitimate first session', 0, 0],
    ['a mid-course index', 4, 4],
    ['a numeric string, still coerced', '2', 2],
    ['the column ceiling', 255, 255]
  ])('accepts %s', async (_label, sessionIndex, expected) => {
    await logCourseSession(courseParams({ sessionIndex }))

    expect(activityStore.recordCourseSession).toHaveBeenCalledTimes(1)
    expect(lastCourseRow().sessionIndex).toBe(expected)
  })
})
