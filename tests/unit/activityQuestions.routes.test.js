'use strict'

/**
 * getAdvisorQuestions — one advisor's question-level record, shown to their manager.
 *
 * WHY THIS FILE MATTERS MORE THAN ITS SIZE SUGGESTS (2026-07-29). Every other read in
 * this feature returns the caller's own record, or counts about a firm. This is the
 * first route that returns one named person's individual results to a DIFFERENT person.
 * Two claims therefore have to hold, and both are pinned here rather than asserted in a
 * comment:
 *
 *   1. The firm boundary. The advisor id arrives in the URL — the only client-supplied
 *      value on the route — and is confined to the manager's own firm by the query.
 *      A manager naming an advisor in another firm must get nothing, and must not be
 *      able to tell "not your firm" apart from "no record".
 *   2. The no-free-text guarantee. Bank, entry number, score, pass/fail and unmarked —
 *      never the advisor's own words. Pinned on the way OUT, not just on the way in,
 *      because a row written by an older path or a hand-edited dev file would otherwise
 *      walk straight through to a manager's screen.
 *
 * The arithmetic is pinned too: an unmarked question must never read as one they got
 * wrong, which is the one way this screen could quietly slander someone.
 *
 * The database is a stand-in throughout — no MySQL is needed to run this.
 */

process.env.MYSQL_DATABASE = 'virt_advisor_test'
process.env.MYSQL_PASSWORD = 'test'

jest.mock('../../server/utils/db', () => ({ execute: jest.fn() }))

const db = require('../../server/utils/db')
const { getAdvisorQuestions } = require('../../server/routes/activity')

// ── Test helpers ──────────────────────────────────────────────────────────────

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

/** A request as it looks AFTER firmAuth and requireManagerRole have run. */
function makeReq (overrides = {}) {
  return {
    firmId: 'firm-from-jwt',
    advisorId: 'the-manager',
    params: { advisorId: 'advisor-under-review' },
    query: {},
    body: {},
    ...overrides
  }
}

/**
 * Route by the table named in the SQL, not by call order — the route reads both
 * sources in one Promise.all, and keying on order would silently hand VA rows to the
 * course branch if those two lines were ever swapped.
 */
function mockRowsByTable (vaRows, courseRows) {
  db.execute.mockImplementation((sql) => {
    if (sql.includes('advisor_va_sessions')) { return Promise.resolve([vaRows]) }
    if (sql.includes('advisor_course_completions')) { return Promise.resolve([courseRows]) }
    throw new Error('unexpected query: ' + sql)
  })
}

/** One completed course session row, as the store hands it back. */
function courseRow (opts) {
  const o = opts || {}
  return {
    course_id: o.courseId || 'course-1',
    course_title: o.courseTitle || 'Cash Flow for Advisors',
    session_index: o.sessionIndex === undefined ? 1 : o.sessionIndex,
    session_title: o.sessionTitle || 'Session 1',
    quiz_score: o.quizScore === undefined ? 70 : o.quizScore,
    // mysql2 hands back a parsed JSON column; the dev file stores a string. Both occur,
    // so tests pass whichever the case under test is about.
    quiz_questions: o.questions === undefined ? [] : o.questions,
    highest_tier: o.tier === undefined ? 'intermediate' : o.tier,
    completed_at: o.completedAt || '2026-07-28T10:00:00Z'
  }
}

/** One stored question. Written the way the store holds it, not the way we wish it were. */
function q (bankKey, bankRef, opts) {
  const o = opts || {}
  return {
    bankKey,
    bankRef,
    score: o.score === undefined ? 100 : o.score,
    passed: o.passed === undefined ? true : o.passed,
    ungraded: o.ungraded === true
  }
}

function topicFor (body, bankKey) {
  return body.topics.filter(t => t.bankKey === bankKey)[0]
}

beforeEach(() => jest.clearAllMocks())

// ── The firm boundary ─────────────────────────────────────────────────────────

describe('getAdvisorQuestions — the firm boundary', () => {
  test('the advisor comes from the URL, the firm ALWAYS from the verified token', async () => {
    mockRowsByTable([], [])
    const res = makeMockRes()

    await getAdvisorQuestions(makeReq({
      // A manager trying to widen their reach by hand. Both are ignored.
      query: { firmId: 'someone-elses-firm' },
      body: { firmId: 'someone-elses-firm' }
    }), res)

    expect(res._status).toBe(200)
    const args = db.execute.mock.calls.map(c => c[1])
    for (const params of args) {
      expect(params).toEqual(['advisor-under-review', 'firm-from-jwt'])
    }
    expect(JSON.stringify(args)).not.toContain('someone-elses-firm')
  })

  test('an advisor outside the firm reads as no record, not as an error and not as data', async () => {
    // The query filters on advisor AND firm together, so an advisor in another firm
    // simply matches nothing. The reply must be indistinguishable from a genuine
    // "nothing recorded" — a manager must not be able to probe for who exists.
    mockRowsByTable([], [])
    const res = makeMockRes()

    await getAdvisorQuestions(makeReq({ params: { advisorId: 'advisor-at-another-firm' } }), res)

    expect(res._status).toBe(200)
    expect(res._body.success).toBe(true)
    expect(res._body.topics).toEqual([])
    expect(res._body.sessions).toEqual([])
    // Nothing in the reply hints at whether that advisor exists elsewhere.
    expect(res._body.advisorId).toBe('advisor-at-another-firm')
    expect(res._body.error).toBeUndefined()
  })

  test('an oversized advisor id is capped before it reaches the query', async () => {
    mockRowsByTable([], [])
    const res = makeMockRes()

    await getAdvisorQuestions(makeReq({ params: { advisorId: 'x'.repeat(500) } }), res)

    expect(db.execute.mock.calls[0][1][0]).toHaveLength(64)
  })

  test('no advisor named is a bad request, never a firm-wide read', async () => {
    mockRowsByTable([], [])
    const res = makeMockRes()

    await getAdvisorQuestions(makeReq({ params: {} }), res)

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('MISSING_PARAMS')
    expect(db.execute).not.toHaveBeenCalled()
  })

  test('no firm on the token is a bad request — the boundary is never skipped', async () => {
    mockRowsByTable([], [])
    const res = makeMockRes()

    await getAdvisorQuestions(makeReq({ firmId: undefined }), res)

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('MISSING_PARAMS')
    expect(db.execute).not.toHaveBeenCalled()
  })
})

// ── The no-free-text guarantee, enforced on the way out ───────────────────────

describe('getAdvisorQuestions — what a manager can and cannot see', () => {
  test("an advisor's own words cannot reach a manager, even if a row somehow held them", async () => {
    // This row could not be written by the current code — the write path strips these
    // too. It models an older row, a hand-edited dev file, or a future write path that
    // forgets. The read is narrowed as well, so none of those can leak.
    const smuggled = {
      bankKey: 'Cash Flow Basics',
      bankRef: 3,
      score: 40,
      passed: false,
      ungraded: false,
      answer: 'I honestly had no idea what to do here',
      question: 'What is the first sign of a cash flow problem?',
      feedback: 'Weak — did not mention debtor days'
    }
    mockRowsByTable([], [courseRow({ questions: [smuggled] })])
    const res = makeMockRes()

    await getAdvisorQuestions(makeReq(), res)

    const serialised = JSON.stringify(res._body)
    expect(serialised).not.toContain('no idea what to do')
    expect(serialised).not.toContain('first sign of a cash flow problem')
    expect(serialised).not.toContain('debtor days')
    // What SHOULD survive still does — the guarantee is a filter, not a blackout.
    expect(res._body.sessions[0].questions[0]).toEqual({
      bankKey: 'Cash Flow Basics', bankRef: 3, score: 40, passed: false, ungraded: false
    })
  })
})

// ── The topic rollup ──────────────────────────────────────────────────────────

describe('getAdvisorQuestions — the topic rollup', () => {
  test('questions group by their bank across every session', async () => {
    mockRowsByTable([], [
      courseRow({ sessionIndex: 1, questions: [q('Cash Flow Basics', 1), q('Pricing', 1)] }),
      courseRow({ sessionIndex: 2, questions: [q('Cash Flow Basics', 2, { passed: false, score: 20 })] })
    ])
    const res = makeMockRes()

    await getAdvisorQuestions(makeReq(), res)

    // One question from each session — the point of the rollup is that they meet.
    const cash = topicFor(res._body, 'Cash Flow Basics')
    expect(cash.asked).toBe(2)
    expect(cash.correct).toBe(1)
    // 100 and 20 → 60
    expect(cash.avgScore).toBe(60)
    expect(topicFor(res._body, 'Pricing').asked).toBe(1)
  })

  test('the average rounds the way the rest of this feature does', async () => {
    // 70 and 73 are the two real sessions of 2026-07-28: 71.5, the rounding boundary.
    mockRowsByTable([], [courseRow({
      questions: [q('Pricing', 1, { score: 70 }), q('Pricing', 2, { score: 73 })]
    })])
    const res = makeMockRes()

    await getAdvisorQuestions(makeReq(), res)

    expect(topicFor(res._body, 'Pricing').avgScore).toBe(72)
  })

  test('an UNMARKED question is asked, not wrong — and stays out of the average', async () => {
    // The one way this screen could quietly slander someone: counting a question the
    // marker never scored as one the advisor got wrong.
    mockRowsByTable([], [courseRow({
      questions: [
        q('Pricing', 1, { score: 80 }),
        q('Pricing', 2, { score: null, passed: false, ungraded: true })
      ]
    })])
    const res = makeMockRes()

    await getAdvisorQuestions(makeReq(), res)

    const pricing = topicFor(res._body, 'Pricing')
    expect(pricing.asked).toBe(2)
    expect(pricing.correct).toBe(1)
    expect(pricing.notMarked).toBe(1)
    // 80 alone — an unscored question is not a zero.
    expect(pricing.avgScore).toBe(80)
  })

  test('a score of 0 is a real score, not a missing one', async () => {
    mockRowsByTable([], [courseRow({
      questions: [q('Pricing', 1, { score: 0, passed: false }), q('Pricing', 2, { score: 50, passed: false })]
    })])
    const res = makeMockRes()

    await getAdvisorQuestions(makeReq(), res)

    expect(topicFor(res._body, 'Pricing').avgScore).toBe(25)
    expect(topicFor(res._body, 'Pricing').notMarked).toBe(0)
  })

  test('a marked question whose score was refused is left out, not counted as zero', async () => {
    // A real shape, not a hypothetical: quizRecord refuses an out-of-range score rather
    // than clamping it, so a question can arrive MARKED with no score at all (a score of
    // 900 becomes "no score", not 100). Averaging that as a zero would invent a failure.
    // This gap was invisible until mutation testing found it.
    mockRowsByTable([], [courseRow({
      questions: [
        q('Pricing', 1, { score: 80 }),
        q('Pricing', 2, { score: null, passed: false })
      ]
    })])
    const res = makeMockRes()

    await getAdvisorQuestions(makeReq(), res)

    const pricing = topicFor(res._body, 'Pricing')
    expect(pricing.avgScore).toBe(80)
    // It was still asked, and it was still not a pass — only the average ignores it.
    expect(pricing.asked).toBe(2)
    expect(pricing.correct).toBe(1)
    expect(pricing.notMarked).toBe(0)
  })

  test('a topic nobody marked has no average rather than a made-up one', async () => {
    mockRowsByTable([], [courseRow({
      questions: [q('Pricing', 1, { score: null, passed: false, ungraded: true })]
    })])
    const res = makeMockRes()

    await getAdvisorQuestions(makeReq(), res)

    expect(topicFor(res._body, 'Pricing').avgScore).toBeNull()
  })

  test('the weakest topic is first — that is what the view is for', async () => {
    mockRowsByTable([], [courseRow({
      questions: [
        q('Strong Topic', 1), q('Strong Topic', 2),
        q('Weak Topic', 1, { passed: false, score: 10 }),
        q('Weak Topic', 2, { passed: false, score: 20 }),
        q('Middling Topic', 1),
        q('Middling Topic', 2, { passed: false, score: 40 })
      ]
    })])
    const res = makeMockRes()

    await getAdvisorQuestions(makeReq(), res)

    expect(res._body.topics.map(t => t.bankKey)).toEqual([
      'Weak Topic', 'Middling Topic', 'Strong Topic'
    ])
  })

  test('on an equal rate, the better-evidenced topic ranks first', async () => {
    mockRowsByTable([], [courseRow({
      questions: [
        q('Thin Evidence', 1, { passed: false, score: 0 }),
        q('Lots Of Evidence', 1, { passed: false, score: 0 }),
        q('Lots Of Evidence', 2, { passed: false, score: 0 }),
        q('Lots Of Evidence', 3, { passed: false, score: 0 })
      ]
    })])
    const res = makeMockRes()

    await getAdvisorQuestions(makeReq(), res)

    expect(res._body.topics.map(t => t.bankKey)).toEqual(['Lots Of Evidence', 'Thin Evidence'])
  })

  test('a topic that was only ever unmarked sinks instead of heading the list', async () => {
    // No evidence is not the same as bad evidence. Sorting it top would send a manager
    // to coach a weakness nobody has shown.
    //
    // The unmarked topic deliberately carries MORE questions than the weak one. An
    // earlier version of this test gave them one each, and passed for the wrong reason:
    // treating "never marked" as a zero score made the two tie, and the alphabetical
    // tie-break happened to produce the expected order anyway. Caught by mutation.
    mockRowsByTable([], [courseRow({
      questions: [
        q('Never Marked', 1, { score: null, passed: false, ungraded: true }),
        q('Never Marked', 2, { score: null, passed: false, ungraded: true }),
        q('Never Marked', 3, { score: null, passed: false, ungraded: true }),
        q('Genuinely Weak', 1, { passed: false, score: 10 })
      ]
    })])
    const res = makeMockRes()

    await getAdvisorQuestions(makeReq(), res)

    expect(res._body.topics[0].bankKey).toBe('Genuinely Weak')
  })

  test('questions with no bank recorded group together and sit last, however they scored', async () => {
    mockRowsByTable([], [courseRow({
      questions: [
        q(null, null, { passed: false, score: 0 }),
        q(null, null, { passed: false, score: 0 }),
        q('A Real Topic', 1)
      ]
    })])
    const res = makeMockRes()

    await getAdvisorQuestions(makeReq(), res)

    const last = res._body.topics[res._body.topics.length - 1]
    expect(last.bankKey).toBeNull()
    expect(last.asked).toBe(2)
    // It scored worst of all and STILL sits last: it is not a topic to coach.
    expect(res._body.topics[0].bankKey).toBe('A Real Topic')
  })
})

// ── The session list, and the shapes storage actually returns ─────────────────

describe('getAdvisorQuestions — the session list', () => {
  test('sessions carry their own questions, in the order the store returns them', async () => {
    mockRowsByTable([], [
      courseRow({ sessionTitle: 'Newest', completedAt: '2026-07-28T10:00:00Z', questions: [q('Pricing', 4)] }),
      courseRow({ sessionTitle: 'Older', completedAt: '2026-07-20T10:00:00Z', questions: [q('Pricing', 5)] })
    ])
    const res = makeMockRes()

    await getAdvisorQuestions(makeReq(), res)

    expect(res._body.sessions.map(s => s.sessionTitle)).toEqual(['Newest', 'Older'])
    expect(res._body.sessions[0].questions[0].bankRef).toBe(4)
    expect(res._body.sessions[0].courseTitle).toBe('Cash Flow for Advisors')
    expect(res._body.sessions[0].tier).toBe('intermediate')
  })

  test('a session from before this record existed shows no questions, and says nothing else', async () => {
    // Every session predating 2026-07-29 is exactly this: a score and no detail. It must
    // read as "no detail", never as a session where everything was answered wrongly.
    mockRowsByTable([], [courseRow({ questions: null, quizScore: 73 })])
    const res = makeMockRes()

    await getAdvisorQuestions(makeReq(), res)

    expect(res._body.sessions[0].questions).toEqual([])
    expect(res._body.sessions[0].quizScore).toBe(73)
    expect(res._body.topics).toEqual([])
  })

  test('a skipped quiz keeps its null score rather than becoming a zero', async () => {
    mockRowsByTable([], [courseRow({ quizScore: null })])
    const res = makeMockRes()

    await getAdvisorQuestions(makeReq(), res)

    expect(res._body.sessions[0].quizScore).toBeNull()
  })

  test('both storage shapes read the same — mysql2 parses the JSON column, the dev file does not', async () => {
    const questions = [q('Pricing', 2, { passed: false, score: 30 })]
    mockRowsByTable([], [
      // mysql2: already an array.
      courseRow({ sessionTitle: 'From MySQL', questions }),
      // dev file: the same value as a string.
      courseRow({ sessionTitle: 'From the dev file', questions: JSON.stringify(questions) })
    ])
    const res = makeMockRes()

    await getAdvisorQuestions(makeReq(), res)

    expect(res._body.sessions[0].questions).toEqual(res._body.sessions[1].questions)
    expect(topicFor(res._body, 'Pricing').asked).toBe(2)
  })

  test('a malformed record costs its own detail, never the whole screen', async () => {
    mockRowsByTable([], [
      courseRow({ sessionTitle: 'Broken', questions: '{ not json at all' }),
      courseRow({ sessionTitle: 'Fine', questions: [q('Pricing', 1)] })
    ])
    const res = makeMockRes()

    await getAdvisorQuestions(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.sessions[0].questions).toEqual([])
    expect(res._body.sessions[1].questions).toHaveLength(1)
  })
})

// ── Honest failure ────────────────────────────────────────────────────────────

describe('getAdvisorQuestions — a broken record says so', () => {
  // The honest-failure guarantee is a PRODUCTION guarantee: outside production the dev
  // JSON file is the intended store, so a database failure there is not a fault.
  let realNodeEnv
  beforeEach(() => { realNodeEnv = process.env.NODE_ENV; process.env.NODE_ENV = 'production' })
  afterEach(() => {
    if (realNodeEnv === undefined) { delete process.env.NODE_ENV } else { process.env.NODE_ENV = realNodeEnv }
  })

  test('an unreachable record is an error, not an advisor who answered nothing', async () => {
    db.execute.mockRejectedValue(new Error("Access denied for user 'root'@'localhost'"))
    const res = makeMockRes()

    await getAdvisorQuestions(makeReq(), res)

    expect(res._status).toBe(500)
    expect(res._body.error.code).toBe('DB_ERROR')
    expect(res._body.sessions).toBeUndefined()
    expect(res._body.topics).toBeUndefined()
  })

  test('the real reason is logged for the operator, never sent to the browser', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    db.execute.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:3306'))
    const res = makeMockRes()

    await getAdvisorQuestions(makeReq(), res)

    expect(spy).toHaveBeenCalled()
    expect(JSON.stringify(res._body)).not.toContain('ECONNREFUSED')
    spy.mockRestore()
  })
})
