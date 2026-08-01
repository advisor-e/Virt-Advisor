/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmQuizzes = require('~/components/firm/FirmQuizzes.vue').default
const { blockTone, BAND_TEXT } = require('~/utils/brandTokens')

/**
 * Component tests for the Firm Quizzes rail (CB-31 Phase 3).
 *
 * The screen's whole job is to tell a firm the truth about its own library:
 * which areas exist, in the owner's order, where quiz material is missing, and
 * where a quiz cannot be attached at all. Every one of those is a rendering
 * claim that the backend tests cannot reach — the route can serve a perfect
 * payload and the rail can still draw it in the wrong order, hide the gaps, or
 * omit the warning that stops an author wasting their work.
 *
 * Assertions use i18n KEYS, not English (see tests/helpers/mountComponent.js),
 * so they survive a wording change.
 */

const DUP_TAG = 'firmQuizzes.duplicateNameTag'
const DUP_WARNING = 'firmQuizzes.duplicateNameWarning'

const page = (title, section, subSection, bindable) => ({
  page: 'id-' + title.toLowerCase().replace(/\W+/g, '-'),
  section,
  subSection,
  title,
  bindable: bindable !== false
})

/**
 * A resolved question. `qid` is identity, `id` is the POSITION the backend
 * reassigns, and `source` is what the screen badges — the three are separate on
 * purpose and the screen must never confuse them.
 */
const entry = (id, question, answer, keyPoint, source) => ({
  id,
  qid: 'qz-' + id,
  source: source || 'platform',
  question: question || 'What is working capital?',
  answer: answer || 'Current assets less current liabilities.',
  keyPoint: keyPoint || 'It funds the trading cycle.'
})

/** The payload shape GET /api/firm-manager/quizzes returns. */
function payload (overrides) {
  return Object.assign({
    firmOverride: null,
    hasOverride: false,
    hasDecisions: false,
    // Advisor-e's own banks — the only place a switched-off question's wording lives.
    base: {
      'Working Capital Cycle': { entries: [entry(1), entry(2)] },
      'Price Rise': { entries: [entry(1, 'How do you raise price?')] },
      'Advisor Prep': { entries: [entry(1)] }
    },
    state: { declinedIds: [], overrides: {}, ownRows: [] },
    // What the course engine reads. The screen draws THIS, never `merged`.
    resolved: {
      'Working Capital Cycle': { entries: [entry(1), entry(2)] },
      'Price Rise': { entries: [entry(1, 'How do you raise price?')] },
      'Advisor Prep': { entries: [entry(1)] }
    },
    pages: [
      // Deliberately in the order the server sends — the rail must preserve it.
      page('Working Capital Cycle', 'Do the Job', 'Help'),
      page('Dashboard Discussions', 'Do the Job', 'Help'),
      page('Quiet Page', 'Do the Job', 'Governance Tools'),
      page('Price Rise', 'Get the Job', 'Marketing'),
      page('Advisor Prep', 'Get Organised', 'Advisor Access', false)
    ]
  }, overrides)
}

/**
 * Let every pending promise settle, then re-render.
 *
 * `load()` awaits the fetch, its .json(), and then loadHistory() — several
 * microtask turns. A couple of hand-rolled `nextTick`s is not enough, and the
 * component is still in its loading state when assertions run, which reads as
 * "the rail renders nothing" rather than "the test looked too early".
 *
 * `setTimeout`, not `setImmediate`: Jest 27 removed the immediate timers from
 * its jsdom environment, and referencing one throws before any assertion runs.
 */
async function settle (wrapper) {
  await new Promise(resolve => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()
  await new Promise(resolve => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()
}

/** Mount with fetch stubbed, and let the mounted() load settle. */
async function mountRail (body, opts) {
  const data = Object.assign(payload(), body)
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data)
  }))
  const wrapper = mountWithBuefy(FirmQuizzes, Object.assign({
    propsData: { apiToken: 'test-token' }
  }, opts))
  await settle(wrapper)
  return wrapper
}

afterEach(() => { delete global.fetch })

describe('loading', () => {
  test('asks the backend for the firm quizzes, with the bearer token', async () => {
    await mountRail()
    expect(global.fetch).toHaveBeenCalled()
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/firm-manager/quizzes')
    expect(opts.headers.Authorization).toBe('Bearer test-token')
  })

  // A silently empty screen is the failure mode the standards call out by name:
  // the firm would read "you have no quizzes" when the truth is "we could not ask".
  test('a failed load says so rather than rendering an empty library', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, statusText: 'boom', json: () => Promise.resolve({}) }))
    const wrapper = mountWithBuefy(FirmQuizzes, { propsData: { apiToken: 't' } })
    await settle(wrapper)
    expect(wrapper.text()).toContain('firmQuizzes.loadFailed')
  })
})

describe('the rail', () => {
  test('keeps the order the server sent — the owner\'s document order', async () => {
    const wrapper = await mountRail()
    const names = wrapper.findAll('.rail-section').wrappers.map(w => w.text())
    expect(names).toEqual(['Do the Job', 'Get the Job', 'Get Organised'])
  })

  test('a sub-section with quiz material reports how many pages have one', async () => {
    const wrapper = await mountRail()
    expect(wrapper.text()).toContain('firmQuizzes.quizCount')
  })

  // Seeing the gap is the point of the screen — a firm cannot fill material it
  // cannot see is missing.
  test('a sub-section with no quizzes is still listed, marked none', async () => {
    const wrapper = await mountRail()
    expect(wrapper.text()).toContain('firmQuizzes.none')
  })

  test('turning off "show empty" hides the empty sub-sections', async () => {
    const wrapper = await mountRail()
    expect(wrapper.text()).toContain('firmQuizzes.none')
    wrapper.setData({ showEmpty: false })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('firmQuizzes.none')
  })
})

describe('section colour comes from the brand tokens', () => {
  test('each band uses its tone, with white text', async () => {
    const wrapper = await mountRail()
    const bands = wrapper.findAll('.rail-section').wrappers
    bands.forEach((band, i) => {
      expect(band.element.style.backgroundColor).toBeTruthy()
      expect(band.element.style.color).toBeTruthy()
    })
    // First section must carry tone 0's band, not an invented colour.
    expect(bands[0].element.style.backgroundColor)
      .toBe(hexToRgb(blockTone(0).band))
    expect(bands[0].element.style.color).toBe(hexToRgb(BAND_TEXT))
  })

  test('the three sections do not share a colour', async () => {
    const wrapper = await mountRail()
    const backgrounds = wrapper.findAll('.rail-section').wrappers
      .map(w => w.element.style.backgroundColor)
    expect(new Set(backgrounds).size).toBe(backgrounds.length)
  })
})

describe('opening a page', () => {
  /** Expand a sub-section, then click the first page in it. */
  async function openFirstPage (wrapper) {
    wrapper.findAll('.rail-sub').at(0).trigger('click')
    await wrapper.vm.$nextTick()
    wrapper.findAll('.rail-page').at(0).trigger('click')
    await wrapper.vm.$nextTick()
    return wrapper
  }

  test('before anything is picked, the panel invites a choice', async () => {
    const wrapper = await mountRail()
    expect(wrapper.text()).toContain('firmQuizzes.pickAPage')
  })

  test('shows the questions with their answer and key point', async () => {
    const wrapper = await openFirstPage(await mountRail())
    expect(wrapper.text()).toContain('What is working capital?')
    expect(wrapper.text()).toContain('firmQuizzes.answer')
    expect(wrapper.text()).toContain('firmQuizzes.keyPoint')
  })

  test('an untouched question is badged as the platform\'s, not the firm\'s', async () => {
    const wrapper = await openFirstPage(await mountRail())
    expect(wrapper.text()).toContain('firmQuizzes.tagPlatform')
    expect(wrapper.text()).not.toContain('firmQuizzes.tagCustomised')
    expect(wrapper.text()).not.toContain('firmQuizzes.tagFirm')
  })

  // The badge is PER QUESTION, not per quiz. Since 2026-07-31 one page can hold
  // Advisor-e's questions and the firm's side by side, so a single badge on the
  // whole quiz would have to be wrong about one of them.
  test('an edited question and an untouched one are badged differently on the same page', async () => {
    const wrapper = await mountRail({
      resolved: {
        'Working Capital Cycle': {
          entries: [
            entry(1, 'Our own wording', null, null, 'firm-override'),
            entry(2)
          ]
        }
      }
    })
    wrapper.setData({ currentTitle: 'Working Capital Cycle' })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('firmQuizzes.tagCustomised')
    expect(wrapper.text()).toContain('firmQuizzes.tagPlatform')
  })

  test('a question the firm added is badged as the firm\'s own', async () => {
    const wrapper = await mountRail({
      resolved: {
        'Working Capital Cycle': { entries: [entry(1, 'We wrote this', null, null, 'firm-own')] }
      }
    })
    wrapper.setData({ currentTitle: 'Working Capital Cycle' })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('firmQuizzes.tagFirm')
  })

  // Replaced a version-history table that read storage nothing writes to any more,
  // so it would have been empty for every firm forever — and an empty history table
  // reads as "nothing you saved was kept".
  test('the panel explains how to undo a change', async () => {
    const wrapper = await openFirstPage(await mountRail())
    expect(wrapper.text()).toContain('firmQuizzes.undoNote')
  })

  // A snapshot taken at click time goes stale the moment a question is edited, and
  // the screen would then show the firm its own pre-edit wording as if the save had
  // not happened.
  test('the panel redraws from the latest load, not from a snapshot', async () => {
    const wrapper = await openFirstPage(await mountRail())
    expect(wrapper.text()).toContain('What is working capital?')

    wrapper.setData({
      banks: { 'Working Capital Cycle': { entries: [entry(1, 'Reworded after saving')] } }
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Reworded after saving')
    expect(wrapper.text()).not.toContain('What is working capital?')
  })
})

describe('search', () => {
  test('matches a page by title', async () => {
    const wrapper = await mountRail()
    wrapper.setData({ query: 'working capital' })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Working Capital Cycle')
    expect(wrapper.text()).not.toContain('Price Rise')
  })

  // The reason search exists: a firm remembers what it ASKED, not which page
  // it filed the question under.
  test('matches on question text, not just the page name', async () => {
    const wrapper = await mountRail()
    wrapper.setData({ query: 'raise price' })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Price Rise')
    expect(wrapper.text()).not.toContain('Working Capital Cycle')
  })

  test('a search with no hit says so instead of showing an empty rail', async () => {
    const wrapper = await mountRail()
    wrapper.setData({ query: 'zzzz-no-such-thing' })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('firmQuizzes.noMatchHere')
  })
})

// The guard built ahead of the flow that exposes it: quiz banks are keyed by
// page TITLE, so a page sharing its title with another cannot take a quiz. The
// resolver refuses rather than guess, and a save would be rejected — AFTER the
// author had written the whole thing. This says so up front.
describe('a page whose name is not unique', () => {
  test('is flagged in the rail', async () => {
    const wrapper = await mountRail()
    wrapper.findAll('.rail-sub').wrappers.forEach(w => w.trigger('click'))
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain(DUP_TAG)
  })

  test('explains itself when opened, before any work is done', async () => {
    const wrapper = await mountRail()
    wrapper.setData({ currentTitle: 'Advisor Prep' })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain(DUP_WARNING)
  })

  test('a normal page shows no such warning', async () => {
    const wrapper = await mountRail()
    wrapper.setData({ currentTitle: 'Working Capital Cycle' })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain(DUP_WARNING)
  })

  // A quiz cannot be attached to it at all, so offering the button would send the
  // author away to write a question the save is guaranteed to reject.
  test('offers no Add question button', async () => {
    const wrapper = await mountRail()
    wrapper.setData({ currentTitle: 'Advisor Prep' })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('firmQuizzes.addQuestion')
  })
})

// ── Editing (Phase 3b) ────────────────────────────────────────────────────────
//
// What these must prove is not "a button exists" but the two things a firm can
// get badly wrong and the one thing the mechanism depends on: that switching off
// the last question warns what replaces it, that a new question is filed against
// the page on screen, and that editing one of Advisor-e's questions sends only
// what changed.

describe('editing', () => {
  /** Mount, open a page, and capture the calls made after the initial load. */
  async function openFor (body, title) {
    const wrapper = await mountRail(body)
    wrapper.setData({ currentTitle: title || 'Working Capital Cycle' })
    await wrapper.vm.$nextTick()
    global.fetch.mockClear()
    return wrapper
  }

  test('switching off a question when others remain does not interrupt', async () => {
    const wrapper = await openFor()
    const confirm = jest.fn()
    wrapper.vm.$buefy.dialog.confirm = confirm

    await wrapper.vm.switchOff({ qid: 'qz-1' })

    expect(confirm).not.toHaveBeenCalled()
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/firm-manager/quizzes/platform/qz-1/decline')
    expect(opts.method).toBe('PUT')
    expect(JSON.parse(opts.body)).toEqual({ declined: true })
  })

  // The case a firm gets wrong: they believe they are removing the quiz. They are
  // not — the page still runs one and the AI writes the questions.
  test('switching off the LAST question asks first, and says what replaces it', async () => {
    const wrapper = await openFor({
      resolved: { 'Working Capital Cycle': { entries: [entry(1)] } }
    })
    const confirm = jest.fn()
    wrapper.vm.$buefy.dialog.confirm = confirm

    await wrapper.vm.switchOff({ qid: 'qz-1' })

    expect(confirm).toHaveBeenCalled()
    expect(confirm.mock.calls[0][0].message).toBe('firmQuizzes.lastQuestionWarning')
    // Nothing is sent until the firm confirms.
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('a new question is filed against the page on screen, not a typed name', async () => {
    const wrapper = await openFor()
    wrapper.setData({
      showForm: true,
      editing: null,
      form: { question: 'Ours?', answer: 'Yes.', keyPoint: 'Because.' }
    })

    await wrapper.vm.saveQuestion()

    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/firm-manager/quizzes/own')
    expect(JSON.parse(opts.body)).toEqual({
      question: 'Ours?', answer: 'Yes.', keyPoint: 'Because.', bank: 'Working Capital Cycle'
    })
  })

  test('editing one of Advisor-e questions sends ONLY the field that changed', async () => {
    // The freshness guarantee. Sending all three would freeze the untouched two at
    // today's wording, which is the defect the whole mechanism exists to close.
    const wrapper = await openFor()
    wrapper.setData({
      showForm: true,
      editing: { qid: 'qz-1', kind: 'platform' },
      form: {
        question: 'What is working capital?', // unchanged
        answer: 'Our own answer.', // changed
        keyPoint: 'It funds the trading cycle.' // unchanged
      }
    })

    await wrapper.vm.saveQuestion()

    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/firm-manager/quizzes/platform/qz-1')
    expect(opts.method).toBe('PUT')
    expect(JSON.parse(opts.body)).toEqual({ answer: 'Our own answer.' })
  })

  test('putting every field back to Advisor-e wording resets, rather than storing a copy', async () => {
    // A stored copy that happens to be identical would still shield the question
    // from Advisor-e's next improvement to it.
    const wrapper = await openFor()
    wrapper.setData({
      showForm: true,
      editing: { qid: 'qz-1', kind: 'customised' },
      form: {
        question: 'What is working capital?',
        answer: 'Current assets less current liabilities.',
        keyPoint: 'It funds the trading cycle.'
      }
    })

    await wrapper.vm.saveQuestion()

    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/firm-manager/quizzes/platform/qz-1')
    expect(opts.method).toBe('DELETE')
  })

  // Found by Mike on the running screen, 2026-07-31: Edit appeared to do nothing.
  // The form was rendering at the FOOT of the page, and a Growth Curve bank is ten
  // tall cards, so it opened about a screen and a half below the button pressed.
  // The only visible change near the click was the Add button disappearing, which
  // read as a fault. Editing now happens in the card itself.
  describe('the edit form opens where the question is', () => {
    test('clicking Edit puts the form inside that question card, not at the foot of the page', async () => {
      const wrapper = await openFor()
      wrapper.vm.openForm({ qid: 'qz-1', kind: 'platform', question: 'a', answer: 'b', keyPoint: 'c' })
      await wrapper.vm.$nextTick()

      const cards = wrapper.findAll('article.q').wrappers
      expect(cards[0].find('.quiz-question-form').exists()).toBe(true)
      // …and no separate form box at the bottom, which is what caused the confusion.
      expect(wrapper.find('.quiz-form').exists()).toBe(false)
    })

    test('the card being edited is marked, so it is obvious which one it applies to', async () => {
      const wrapper = await openFor()
      wrapper.vm.openForm({ qid: 'qz-2', kind: 'platform', question: 'a', answer: 'b', keyPoint: 'c' })
      await wrapper.vm.$nextTick()

      const editing = wrapper.findAll('article.q.is-editing').wrappers
      expect(editing.length).toBe(1)
      expect(editing[0].find('.quiz-question-form').exists()).toBe(true)
    })

    test('only the question being edited turns into a form — the others stay readable', async () => {
      const wrapper = await openFor()
      wrapper.vm.openForm({ qid: 'qz-1', kind: 'platform', question: 'a', answer: 'b', keyPoint: 'c' })
      await wrapper.vm.$nextTick()

      expect(wrapper.findAll('.quiz-question-form').length).toBe(1)
      // Question 2 is still shown as text.
      expect(wrapper.text()).toContain('firmQuizzes.switchOff')
    })

    test('adding a NEW question still uses the form at the end, where it will appear', async () => {
      const wrapper = await openFor()
      wrapper.vm.openForm(null)
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.quiz-form').exists()).toBe(true)
      expect(wrapper.findAll('article.q.is-editing').length).toBe(0)
    })

    // The identity trap: `id` is a POSITION the backend reassigns when a question
    // above is switched off, so matching on it would open the form on the wrong card.
    test('the open card is matched by qid, never by its displayed number', async () => {
      const wrapper = await openFor()
      wrapper.vm.openForm({ qid: 'qz-2', id: 1, kind: 'platform', question: 'a', answer: 'b', keyPoint: 'c' })
      await wrapper.vm.$nextTick()

      const cards = wrapper.findAll('article.q').wrappers
      expect(cards[0].classes()).not.toContain('is-editing')
      expect(cards[1].classes()).toContain('is-editing')
    })

    // The Add button used to hide whenever a form opened, so the single visible
    // response to clicking Edit was a button vanishing at the top of the page.
    test('the Add question button does not disappear when a question is opened for editing', async () => {
      const wrapper = await openFor()
      wrapper.vm.openForm({ qid: 'qz-1', kind: 'platform', question: 'a', answer: 'b', keyPoint: 'c' })
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('firmQuizzes.addQuestion')
    })
  })

  test('a half-filled question is refused before it reaches the backend', async () => {
    const wrapper = await openFor()
    wrapper.setData({
      showForm: true,
      editing: null,
      form: { question: 'Ours?', answer: '   ', keyPoint: 'Because.' }
    })

    await wrapper.vm.saveQuestion()

    expect(global.fetch).not.toHaveBeenCalled()
  })

  // Every question switched off is a legitimate choice, but it must not read as
  // "this page has no quiz".
  test('a page with nothing left says the AI will write the questions', async () => {
    const wrapper = await mountRail({
      resolved: {},
      state: { declinedIds: ['qz-1', 'qz-2'], overrides: {}, ownRows: [] }
    })
    wrapper.setData({ currentTitle: 'Working Capital Cycle' })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('firmQuizzes.noneLiveNote')
    // …and the switched-off questions are listed, not silently gone.
    expect(wrapper.text()).toContain('firmQuizzes.switchedOffHeading')
    expect(wrapper.text()).toContain('firmQuizzes.switchOn')
  })

  // The gap this closes: a question the firm had edited and then switched off could
  // only be returned to Advisor-e's default by switching it back on FIRST and then
  // pressing Reset — and while it sat there, nothing said the firm's version was
  // still being held.
  test('a switched-off question the firm edited says so, and offers Reset', async () => {
    const wrapper = await mountRail({
      resolved: {},
      state: { declinedIds: ['qz-1'], overrides: { 'qz-1': { question: 'Ours?' } }, ownRows: [] }
    })
    wrapper.setData({ currentTitle: 'Working Capital Cycle' })
    await wrapper.vm.$nextTick()

    const off = wrapper.find('.q-off')
    expect(off.text()).toContain('firmQuizzes.tagCustomised')
    expect(off.text()).toContain('firmQuizzes.resetToPlatform')
  })

  test('a switched-off question the firm never edited offers no Reset', async () => {
    // Reset there would delete nothing. A button that does nothing when pressed is
    // how a screen loses a manager's trust in every other button on it.
    const wrapper = await mountRail({
      resolved: {},
      state: { declinedIds: ['qz-1'], overrides: {}, ownRows: [] }
    })
    wrapper.setData({ currentTitle: 'Working Capital Cycle' })
    await wrapper.vm.$nextTick()

    const off = wrapper.find('.q-off')
    expect(off.text()).toContain('firmQuizzes.switchOn')
    expect(off.text()).not.toContain('firmQuizzes.resetToPlatform')
    expect(off.text()).not.toContain('firmQuizzes.tagCustomised')
  })

  test('resetting from the switched-off list drops the edit WITHOUT switching it on', async () => {
    // The whole point of doing it from here. If this ever fired the decline route as
    // well, a firm asking "go back to Advisor-e's wording" would silently find the
    // question live in front of its advisors again.
    const wrapper = await mountRail({
      resolved: {},
      state: { declinedIds: ['qz-1'], overrides: { 'qz-1': { question: 'Ours?' } }, ownRows: [] }
    })
    wrapper.setData({ currentTitle: 'Working Capital Cycle' })
    await wrapper.vm.$nextTick()
    global.fetch.mockClear()

    const confirm = jest.fn()
    wrapper.vm.$buefy.dialog.confirm = confirm
    wrapper.find('.q-off').findAll('button').at(1).trigger('click')
    await wrapper.vm.$nextTick()

    // Nothing is sent until the firm confirms — this discards their wording.
    expect(confirm).toHaveBeenCalled()
    expect(global.fetch).not.toHaveBeenCalled()

    await confirm.mock.calls[0][0].onConfirm()

    const urls = global.fetch.mock.calls.map(c => c[0])
    expect(urls).toContain('/api/firm-manager/quizzes/platform/qz-1')
    expect(urls.some(u => String(u).includes('/decline'))).toBe(false)
  })
})

// Phase 4 — Advisor-e improves a question a firm had reworded. The firm's edit shields
// it, deliberately; this is the screen that says so and offers the choice. Stage A (the
// record) is proven on the backend; what only a mounted screen can prove is that the
// flag lands on the RIGHT question, that it can be FOUND, and that each button sends the
// call it names.
describe('an update to a question the firm edited', () => {
  /** A firm holding its own wording of question 1, which Advisor-e has since changed. */
  const DRIFTED = {
    resolved: {
      'Working Capital Cycle': {
        entries: [
          entry(1, 'Our own wording', 'Our own answer', 'Our own point', 'firm-override'),
          entry(2)
        ]
      }
    },
    state: { declinedIds: [], overrides: { 'qz-1': { question: 'Our own wording' } }, ownRows: [] },
    driftQids: ['qz-1']
  }

  /** Mount with that state and nothing opened — the tab as a firm first meets it. */
  const mountDrifted = body => mountRail(Object.assign({}, DRIFTED, body))

  /** Mount with that state, open the page, and capture only the calls made after. */
  async function openDrifted (body) {
    const wrapper = await mountDrifted(body)
    wrapper.setData({ currentTitle: 'Working Capital Cycle' })
    await wrapper.vm.$nextTick()
    global.fetch.mockClear()
    return wrapper
  }

  test('the flagged question says so and offers Review update', async () => {
    const wrapper = await openDrifted()
    const first = wrapper.findAll('article.q').at(0)

    expect(first.text()).toContain('firmQuizzes.platformUpdated')
    expect(first.text()).toContain('firmQuizzes.reviewUpdate')
  })

  test('the untouched question beside it is left alone', async () => {
    // The flag has to be per question. A page-level notice would be wrong about one of
    // them, and a manager cannot act on "something on this page changed".
    const wrapper = await openDrifted()
    const second = wrapper.findAll('article.q').at(1)

    expect(second.text()).not.toContain('firmQuizzes.platformUpdated')
    expect(second.text()).not.toContain('firmQuizzes.reviewUpdate')
  })

  test('nothing is flagged when Advisor-e has changed nothing', async () => {
    // The control. Without it every assertion above could pass on a screen that simply
    // flags every edited question — which would send a firm to compare two identical
    // versions and teach them to ignore the flag.
    const wrapper = await openDrifted({ driftQids: [] })

    expect(wrapper.text()).not.toContain('firmQuizzes.platformUpdated')
    expect(wrapper.text()).not.toContain('firmQuizzes.reviewUpdate')
    expect(wrapper.text()).not.toContain('firmQuizzes.updateCount')
  })

  // The difference from the Advisory Staircase, and the reason this screen needs more
  // than a tag on the card: the staircase's five steps are all on one screen, whereas a
  // quiz question sits inside one of 62 pages behind the rail. A flag only visible after
  // clicking into the right page waits to be stumbled upon.
  describe('finding it', () => {
    test('the rail says which page holds the update', async () => {
      const wrapper = await mountDrifted()
      wrapper.findAll('.rail-sub').at(0).trigger('click')
      await wrapper.vm.$nextTick()

      const pages = wrapper.findAll('.rail-page').wrappers
      const wc = pages.find(w => w.text().includes('Working Capital Cycle'))
      expect(wc.text()).toContain('firmQuizzes.updateCount 1')
      // …and it is the only page claiming one, in the rail and in its headers alike.
      expect(pages.filter(w => w.text().includes('firmQuizzes.updateCount')).length).toBe(1)
      expect(wrapper.findAll('.rail-sub').filter(w => w.text().includes('firmQuizzes.updateCount')).length).toBe(1)
    })

    test('a sub-section that has never been opened still shows something is waiting inside', async () => {
      // Otherwise the answer to "is there anything to look at?" is opening all 26 in
      // turn — and a firm that does not know an update exists has no reason to try.
      const wrapper = await mountDrifted()
      const sub = wrapper.findAll('.rail-sub').at(0)

      expect(sub.attributes('aria-expanded')).toBe('false')
      expect(sub.text()).toContain('firmQuizzes.updateCount 1')
    })

    test('the count is what the panel will actually flag, not a count of edits', async () => {
      // Two edited questions, one of them changed by Advisor-e. A rail that counted
      // overrides would say 2 and the panel would show one flag — and a rail that
      // disagrees with the screen it points at is worse than no rail badge.
      const wrapper = await openDrifted({
        resolved: {
          'Working Capital Cycle': {
            entries: [
              entry(1, 'Our own wording', null, null, 'firm-override'),
              entry(2, 'Also ours', null, null, 'firm-override')
            ]
          }
        },
        state: {
          declinedIds: [],
          overrides: { 'qz-1': { question: 'Our own wording' }, 'qz-2': { question: 'Also ours' } },
          ownRows: []
        },
        driftQids: ['qz-1']
      })

      expect(wrapper.findAll('.rail-sub').at(0).text()).toContain('firmQuizzes.updateCount 1')
      expect(wrapper.findAll('article.q').filter(w => w.text().includes('firmQuizzes.reviewUpdate')).length).toBe(1)
    })
  })

  describe('choosing', () => {
    test('Adopt drops the firm version, which is what lets it track Advisor-e again', async () => {
      const wrapper = await openDrifted()

      await wrapper.vm.adoptUpdate('qz-1')

      const [url, opts] = global.fetch.mock.calls[0]
      expect(url).toBe('/api/firm-manager/quizzes/platform/qz-1')
      expect(opts.method).toBe('DELETE')
    })

    test('Keep mine re-stamps the baseline and does NOT touch the firm wording', async () => {
      // The assertion that matters is the second one: a Keep mine that also fired the
      // reset would discard the firm's version while telling them it had been kept.
      const wrapper = await openDrifted()

      await wrapper.vm.keepMine('qz-1')

      const [url, opts] = global.fetch.mock.calls[0]
      expect(url).toBe('/api/firm-manager/quizzes/platform/qz-1/keep-mine')
      expect(opts.method).toBe('POST')
      expect(global.fetch.mock.calls.some(c => c[1] && c[1].method === 'DELETE')).toBe(false)
    })

    test('either choice closes the panel and re-reads the screen', async () => {
      // The prompt clears because the state changed, not because the button was pressed.
      const wrapper = await openDrifted()
      wrapper.vm.openUpdateReview(wrapper.vm.rows.live[0])
      expect(wrapper.vm.showUpdateModal).toBe(true)

      await wrapper.vm.keepMine('qz-1')

      expect(wrapper.vm.showUpdateModal).toBe(false)
      expect(wrapper.vm.updateRow).toBeNull()
      expect(global.fetch.mock.calls.map(c => c[0])).toContain('/api/firm-manager/quizzes')
    })

    test('a rejected call leaves the firm version alone and says so', async () => {
      const wrapper = await openDrifted()
      global.fetch = jest.fn(() => Promise.resolve({
        ok: false, statusText: 'Conflict', json: () => Promise.resolve({ error: { message: 'no custom version' } })
      }))
      const toast = jest.fn()
      wrapper.vm.$buefy.toast.open = toast

      await wrapper.vm.keepMine('qz-1')

      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ type: 'is-danger' }))
      // The panel stays open: the choice has not been made, and closing it would read
      // as though it had.
      expect(wrapper.vm.resolvingUpdate).toBe(false)
    })
  })

  test('the compare panel shows both versions, ours beside theirs', async () => {
    const wrapper = await openDrifted()
    const row = wrapper.vm.rows.live[0]
    wrapper.vm.openUpdateReview(row)
    await wrapper.vm.$nextTick()

    // The row carries Advisor-e's current wording alongside the firm's, so the two
    // halves of the panel can never be drawn from different questions.
    expect(row.question).toBe('Our own wording')
    expect(row.platformVersion.question).toBe('What is working capital?')

    const modal = wrapper.find('.modal-card')
    expect(modal.exists()).toBe(true)
    expect(modal.text()).toContain('Our own wording')
    expect(modal.text()).toContain('What is working capital?')
    expect(modal.text()).toContain('firmQuizzes.adoptPlatform')
    expect(modal.text()).toContain('firmQuizzes.keepMine')
  })
})

// The quiz-rail-stuck-open fix (design/ACTIONS.md): open-state is three-state
// (unset / opened / closed) inside the shared FirmRail, so an explicit close
// always wins over auto-expand. The old two-state flag let "holds the current
// page" force the panel open on the same tick the firm closed it.
describe('closing a sub-section (the three-state rail fix)', () => {
  test('a sub-section opened by click can be closed by a second click', async () => {
    const wrapper = await mountRail()
    const sub = () => wrapper.findAll('.rail-sub').at(0)
    sub().trigger('click')
    await wrapper.vm.$nextTick()
    expect(sub().attributes('aria-expanded')).toBe('true')
    sub().trigger('click')
    await wrapper.vm.$nextTick()
    expect(sub().attributes('aria-expanded')).toBe('false')
    expect(wrapper.findAll('.rail-page').length).toBe(0)
  })

  // The reported bug (Mike, 2026-07-22, Growth Framework): once a page inside
  // a drop-tab was OPEN, the drop-tab could never be closed again.
  test('a sub-section holding the open page can still be closed', async () => {
    const wrapper = await mountRail()
    const sub = () => wrapper.findAll('.rail-sub').at(0)
    sub().trigger('click')
    await wrapper.vm.$nextTick()
    wrapper.findAll('.rail-page').at(0).trigger('click')
    await wrapper.vm.$nextTick()
    // The page is on screen, which auto-expands its sub-section…
    expect(sub().attributes('aria-expanded')).toBe('true')
    // …and an explicit close must still win over that auto-expand.
    sub().trigger('click')
    await wrapper.vm.$nextTick()
    expect(sub().attributes('aria-expanded')).toBe('false')
  })

  test('an explicit close wins over search auto-expand', async () => {
    const wrapper = await mountRail()
    wrapper.setData({ query: 'working capital' })
    await wrapper.vm.$nextTick()
    const sub = () => wrapper.findAll('.rail-sub').at(0)
    expect(sub().attributes('aria-expanded')).toBe('true')
    sub().trigger('click')
    await wrapper.vm.$nextTick()
    expect(sub().attributes('aria-expanded')).toBe('false')
  })

  // A close made under one search must not hide the NEXT search's hits —
  // that would be the original "search finds matches but shows nothing"
  // defect returning by another door.
  test('a changed search resets explicit closes and re-expands its hits', async () => {
    const wrapper = await mountRail()
    wrapper.setData({ query: 'working capital' })
    await wrapper.vm.$nextTick()
    wrapper.findAll('.rail-sub').at(0).trigger('click') // explicit close
    await wrapper.vm.$nextTick()
    wrapper.setData({ query: 'raise price' })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Price Rise')
    expect(wrapper.findAll('.rail-page').length).toBeGreaterThan(0)
  })
})

/** jsdom reports inline colours as rgb(); convert for comparison. */
function hexToRgb (hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${r}, ${g}, ${b})`
}
