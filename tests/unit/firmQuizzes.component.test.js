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

const entry = (id, question, answer, keyPoint) => ({
  id,
  question: question || 'What is working capital?',
  answer: answer || 'Current assets less current liabilities.',
  keyPoint: keyPoint || 'It funds the trading cycle.'
})

/** The payload shape GET /api/firm-manager/quizzes returns. */
function payload (overrides) {
  return Object.assign({
    base: {},
    firmOverride: null,
    hasOverride: false,
    merged: {
      'Working Capital Cycle': { origin: 'platform', entries: [entry(1), entry(2)] },
      'Price Rise': { origin: 'firm', entries: [entry(1, 'How do you raise price?')] },
      'Advisor Prep': { origin: 'platform', entries: [entry(1)] }
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

  test('an untouched quiz is badged as the platform\'s, not the firm\'s', async () => {
    const wrapper = await openFirstPage(await mountRail())
    expect(wrapper.text()).toContain('firmQuizzes.originPlatform')
    expect(wrapper.text()).not.toContain('firmQuizzes.originFirm')
  })

  // Without this badge a firm cannot tell an edited quiz from an untouched one.
  test('a firm-edited quiz says so', async () => {
    const wrapper = await mountRail()
    wrapper.setData({
      current: {
        title: 'Price Rise',
        section: 'Get the Job',
        subSection: 'Marketing',
        bindable: true,
        origin: 'firm',
        entries: [entry(1)]
      }
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('firmQuizzes.originFirm')
  })

  test('with no saved version, history explains itself rather than sitting blank', async () => {
    const wrapper = await openFirstPage(await mountRail())
    expect(wrapper.text()).toContain('firmQuizzes.historyEmpty')
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
    wrapper.setData({
      current: {
        title: 'Advisor Prep',
        section: 'Get Organised',
        subSection: 'Advisor Access',
        bindable: false,
        origin: 'platform',
        entries: [entry(1)]
      }
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain(DUP_WARNING)
  })

  test('a normal page shows no such warning', async () => {
    const wrapper = await mountRail()
    wrapper.setData({
      current: {
        title: 'Working Capital Cycle',
        section: 'Do the Job',
        subSection: 'Help',
        bindable: true,
        origin: 'platform',
        entries: [entry(1)]
      }
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain(DUP_WARNING)
  })
})

/** jsdom reports inline colours as rgb(); convert for comparison. */
function hexToRgb (hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${r}, ${g}, ${b})`
}
