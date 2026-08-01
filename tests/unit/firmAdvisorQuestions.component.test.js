/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmAdvisorQuestions = require('~/components/firm/FirmAdvisorQuestions.vue').default

/**
 * Component tests for the manager's drill-down into one advisor's quiz record.
 *
 * This is the first screen in the app that shows one named person's individual results
 * to someone else, so the claims worth pinning are less about layout than about what it
 * must never say:
 *
 *   - an unreachable record must not render as an advisor who answered nothing;
 *   - a question the marker never scored must not render as one they got wrong;
 *   - an advisor with sessions but no per-question detail (every session before
 *     2026-07-29) must be told that, not shown an empty topic list.
 *
 * The screen must also not re-sort the rollup: the backend decides weakest-first, and a
 * second opinion here would mean two orderings to keep in step.
 *
 * Assertions use i18n KEYS, not English (tests/helpers/mountComponent.js).
 */

/** One question in the shape the route returns after normalisation. */
function question (bankKey, bankRef, opts) {
  const o = opts || {}
  return {
    bankKey,
    bankRef,
    score: o.score === undefined ? 100 : o.score,
    passed: o.passed === undefined ? true : o.passed,
    ungraded: o.ungraded === true
  }
}

/** One session in the shape the route returns. */
function session (opts) {
  const o = opts || {}
  return {
    courseTitle: o.courseTitle || 'Cash Flow for Advisors',
    sessionTitle: o.sessionTitle === undefined ? 'Session 1' : o.sessionTitle,
    quizScore: o.quizScore === undefined ? 70 : o.quizScore,
    tier: o.tier || 'intermediate',
    completedAt: o.completedAt || '2026-07-28T10:00:00Z',
    questions: o.questions || []
  }
}

/** One rolled-up topic in the shape the route returns. */
function topic (bankKey, opts) {
  const o = opts || {}
  return {
    bankKey,
    asked: o.asked === undefined ? 2 : o.asked,
    correct: o.correct === undefined ? 1 : o.correct,
    notMarked: o.notMarked || 0,
    avgScore: o.avgScore === undefined ? 50 : o.avgScore
  }
}

/** Serve one payload; `ok:false` or a rejection models a failed read. */
function stubFetch (result) {
  global.fetch = jest.fn(() => {
    if (result.reject) { return Promise.reject(new Error('network down')) }
    return Promise.resolve({
      ok: result.ok !== false,
      statusText: result.statusText || 'Error',
      json: () => Promise.resolve(result.body)
    })
  })
}

async function settle (wrapper) {
  await new Promise(resolve => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()
  await new Promise(resolve => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()
}

async function mountPanel (result, advisorId) {
  stubFetch(result || { body: { success: true, topics: [], sessions: [] } })
  const wrapper = mountWithBuefy(FirmAdvisorQuestions, {
    propsData: { apiToken: 'test-token', advisorId: advisorId || 'advisor-1' }
  })
  await settle(wrapper)
  return wrapper
}

/** A payload with one session and one topic, for the tests that only need something there. */
function onePayload (questions, topics) {
  return {
    body: {
      success: true,
      topics: topics || [topic('Pricing')],
      sessions: [session({ questions: questions || [question('Pricing', 1)] })]
    }
  }
}

afterEach(() => { delete global.fetch })

// ── The read, and its boundary ────────────────────────────────────────────────

describe('FirmAdvisorQuestions — how it asks', () => {
  test('asks for one advisor by id, and never sends a firm', async () => {
    // The firm is derived server-side from the token. If it were ever sent from here,
    // it would be a value a manager could edit.
    await mountPanel(null, 'advisor-42')

    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/activity/team/advisor/advisor-42')
    expect(url).not.toContain('firm')
    expect(opts.headers.Authorization).toBe('Bearer test-token')
  })

  test('an advisor id with path characters cannot escape its own URL', async () => {
    await mountPanel(null, 'advisor/../../admin')

    expect(global.fetch.mock.calls[0][0])
      .toBe('/api/activity/team/advisor/advisor%2F..%2F..%2Fadmin')
  })
})

// ── The three states that must never look alike ───────────────────────────────

describe('FirmAdvisorQuestions — an unreachable record says so', () => {
  test('a network failure shows the failure message and a retry, not an empty panel', async () => {
    const wrapper = await mountPanel({ reject: true })

    expect(wrapper.text()).toContain('firmTeamProgress.detail.loadFailed')
    expect(wrapper.text()).not.toContain('firmTeamProgress.detail.empty')
    expect(wrapper.text()).toContain('firmTeamProgress.detail.retry')
  })

  test('a non-OK response is a failure even when its body looks perfectly fine', async () => {
    // The failure the team tab's mutation run caught: a status check that changes
    // nothing, because every failing fixture also trips the success-flag guard below it.
    const wrapper = await mountPanel({ ok: false, body: onePayload().body })

    expect(wrapper.text()).toContain('firmTeamProgress.detail.loadFailed')
    expect(wrapper.text()).not.toContain('Pricing')
  })

  test('a body without success:true is a failure, not an advisor with no record', async () => {
    const wrapper = await mountPanel({ body: { success: false } })

    expect(wrapper.text()).toContain('firmTeamProgress.detail.loadFailed')
  })

  test('retry asks again and shows the record when the second attempt works', async () => {
    const wrapper = await mountPanel({ reject: true })
    expect(wrapper.text()).toContain('firmTeamProgress.detail.loadFailed')

    stubFetch(onePayload())
    await wrapper.find('button').trigger('click')
    await settle(wrapper)

    expect(wrapper.text()).not.toContain('firmTeamProgress.detail.loadFailed')
    expect(wrapper.text()).toContain('Pricing')
  })
})

describe('FirmAdvisorQuestions — nothing recorded is its own answer', () => {
  test('an advisor with no sessions at all gets the empty sentence, not an error', async () => {
    const wrapper = await mountPanel({ body: { success: true, topics: [], sessions: [] } })

    expect(wrapper.text()).toContain('firmTeamProgress.detail.empty')
    expect(wrapper.text()).not.toContain('firmTeamProgress.detail.loadFailed')
    expect(wrapper.text()).not.toContain('firmTeamProgress.detail.byTopic')
  })

  test('sessions that predate the record show the same sentence, never an empty topic table', async () => {
    // Every session before 2026-07-29 is a score with no questions behind it. Showing
    // a topic table with nothing in it would read as an advisor who got nothing right.
    const wrapper = await mountPanel({
      body: {
        success: true,
        topics: [],
        sessions: [session({ questions: [] }), session({ sessionTitle: 'Session 2', questions: [] })]
      }
    })

    expect(wrapper.text()).toContain('firmTeamProgress.detail.empty')
    expect(wrapper.findAll('.topic-table').length).toBe(0)
    expect(wrapper.findAll('.q-chip').length).toBe(0)
  })
})

// ── The topic rollup ──────────────────────────────────────────────────────────

describe('FirmAdvisorQuestions — the topic rollup', () => {
  test('topics render in the order the backend sent them — the screen does not re-sort', async () => {
    const wrapper = await mountPanel(onePayload(null, [
      topic('Weakest'), topic('Middle'), topic('Strongest')
    ]))

    const rows = wrapper.findAll('.topic-table tbody tr')
    expect(rows.at(0).text()).toContain('Weakest')
    expect(rows.at(1).text()).toContain('Middle')
    expect(rows.at(2).text()).toContain('Strongest')
  })

  test('a topic with no bank recorded is named as such, not left blank', async () => {
    const wrapper = await mountPanel(onePayload(null, [topic(null)]))

    expect(wrapper.text()).toContain('firmTeamProgress.detail.noTopic')
  })

  test('the unmarked tally appears only when there is one to report', async () => {
    const withNone = await mountPanel(onePayload(null, [topic('Pricing', { notMarked: 0 })]))
    expect(withNone.text()).not.toContain('firmTeamProgress.detail.notMarkedCount')

    const withSome = await mountPanel(onePayload(null, [topic('Pricing', { notMarked: 2 })]))
    // The count travels with the message, so a wrong number would fail here too.
    expect(withSome.text()).toContain('firmTeamProgress.detail.notMarkedCount {"n":2}')
  })

  test('a topic nobody marked shows a dash, never 0%', async () => {
    const wrapper = await mountPanel(onePayload(null, [topic('Pricing', { avgScore: null })]))

    const row = wrapper.find('.topic-table tbody tr')
    expect(row.text()).toContain('—')
    expect(row.text()).not.toContain('0%')
  })

  test('a real average of zero is shown as zero, not swallowed as missing', async () => {
    const wrapper = await mountPanel(onePayload(null, [topic('Pricing', { avgScore: 0 })]))

    expect(wrapper.find('.topic-table tbody tr').text()).toContain('0%')
  })
})

// ── Session by session ────────────────────────────────────────────────────────

describe('FirmAdvisorQuestions — session by session', () => {
  test('each outcome renders as itself — and unmarked is NOT a fail', async () => {
    const wrapper = await mountPanel(onePayload([
      question('Pricing', 1),
      question('Pricing', 2, { passed: false, score: 10 }),
      question('Pricing', 3, { passed: false, score: null, ungraded: true })
    ]))

    expect(wrapper.findAll('.q-chip.is-passed').length).toBe(1)
    expect(wrapper.findAll('.q-chip.is-not-passed').length).toBe(1)
    expect(wrapper.findAll('.q-chip.is-not-marked').length).toBe(1)
    // The claim in words as well as colour: the unmarked question says so.
    expect(wrapper.text()).toContain('firmTeamProgress.detail.notMarked')
  })

  test('a question is numbered by its place in the bank, falling back to its place in the session', async () => {
    const wrapper = await mountPanel(onePayload([
      question('Pricing', 7),
      question(null, null, { passed: false, score: 0 })
    ]))

    const chips = wrapper.findAll('.q-chip')
    expect(chips.at(0).text()).toContain('firmTeamProgress.detail.question {"n":7}')
    // No bank reference stored: its position in this session, so it is still identifiable.
    expect(chips.at(1).text()).toContain('firmTeamProgress.detail.question {"n":2}')
  })

  test('a session is named, dated and scored', async () => {
    const wrapper = await mountPanel({
      body: {
        success: true,
        topics: [topic('Pricing')],
        sessions: [session({
          sessionTitle: 'Reading a cash flow forecast',
          quizScore: 73,
          completedAt: '2026-07-28T10:00:00Z',
          questions: [question('Pricing', 1)]
        })]
      }
    })

    const head = wrapper.find('.session-head').text()
    expect(head).toContain('Reading a cash flow forecast')
    expect(head).toContain('73%')
    expect(head).toContain('Jul 2026')
  })

  test('a session with no title of its own is shown by its course, never blank', async () => {
    const wrapper = await mountPanel({
      body: {
        success: true,
        topics: [topic('Pricing')],
        sessions: [session({
          sessionTitle: '',
          courseTitle: 'Cash Flow for Advisors',
          questions: [question('Pricing', 1)]
        })]
      }
    })

    expect(wrapper.find('.session-head').text()).toContain('Cash Flow for Advisors')
  })

  test('a skipped quiz shows no percentage rather than 0%', async () => {
    const wrapper = await mountPanel({
      body: {
        success: true,
        topics: [topic('Pricing')],
        sessions: [session({ quizScore: null, questions: [question('Pricing', 1)] })]
      }
    })

    expect(wrapper.find('.session-head').text()).not.toContain('%')
  })
})
