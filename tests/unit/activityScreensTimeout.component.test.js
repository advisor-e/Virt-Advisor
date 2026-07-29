/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const { DEFAULT_TIMEOUT_MS } = require('~/utils/fetchWithTimeout')

const AdvisorProgression = require('~/components/AdvisorProgression.vue').default
const FirmTeamProgress = require('~/components/firm/FirmTeamProgress.vue').default
const FirmAdvisorQuestions = require('~/components/firm/FirmAdvisorQuestions.vue').default

/**
 * A request that is never answered must end as a stated failure, on ALL THREE
 * activity screens.
 *
 * WHY THIS FILE EXISTS. On 2026-07-29 "My Progress" span for ever with no error
 * anywhere — no red in the console, nothing in the backend log, because the request
 * never left the browser. Chrome allows six simultaneous connections per host and, in
 * development, every open tab permanently holds one for hot-reload; with all six taken
 * the request was queued indefinitely. `fetch()` has no timeout of its own, so the
 * promise stayed pending, the `finally` that clears `loading` never ran, and the
 * spinner never stopped.
 *
 * That browser limit is a development artefact and cannot happen in production — but
 * "the server never answered" absolutely can, and it produced a screen that lied by
 * omission. This is the same fault the backend swallows had, one layer up: a failure
 * rendering as "still working".
 *
 * Tested per SCREEN rather than only on the helper, because the helper being correct
 * proves nothing about whether a screen actually calls it — the previous version of
 * all three called bare `fetch`.
 *
 * Fake timers throughout: the real limit is 15 seconds and no test should wait that
 * long. Promise microtasks are NOT faked, so each advance is followed by a flush to
 * let the rejection travel through the component's catch.
 */

/** A fetch that resolves never — exactly what a stalled browser request looks like. */
function hangingFetch () {
  global.fetch = jest.fn(() => new Promise(() => {}))
}

/** Let queued promise callbacks run. Microtasks are real even under fake timers. */
async function flush () {
  for (let i = 0; i < 12; i++) { await Promise.resolve() }
}

/**
 * Mount a screen whose request will never be answered, then push time past the limit.
 *
 * @param {object} component - the screen under test.
 * @param {object} propsData - its props.
 * @returns {Promise<object>} the settled wrapper.
 */
async function mountAndExpire (component, propsData) {
  hangingFetch()
  const wrapper = mountWithBuefy(component, { propsData })
  await flush()

  // Before the limit: still loading, and nothing claimed to have failed.
  expect(wrapper.vm.loading).toBe(true)

  jest.advanceTimersByTime(DEFAULT_TIMEOUT_MS + 1)
  await flush()
  await wrapper.vm.$nextTick()
  await flush()
  await wrapper.vm.$nextTick()
  return wrapper
}

beforeEach(() => { jest.useFakeTimers() })

afterEach(() => {
  jest.useRealTimers()
  delete global.fetch
})

describe('My Progress', () => {
  test('an unanswered request ends as a stated error, not an endless spinner', async () => {
    const wrapper = await mountAndExpire(AdvisorProgression, { apiToken: 'test-token' })

    expect(wrapper.vm.loading).toBe(false)
    expect(wrapper.find('.prog-loading').exists()).toBe(false)
    expect(wrapper.find('.prog-error').exists()).toBe(true)
  })

  test('it reports being unable to reach the server, not a rejected read', async () => {
    // The two states mean different things to whoever is looking at it: one says the
    // record could not be reached, the other that it came back refused.
    const wrapper = await mountAndExpire(AdvisorProgression, { apiToken: 'test-token' })

    expect(wrapper.vm.error).toBe('advisorProgress.connectFailed')
  })

  test('it does not render as an advisor who has simply done nothing', async () => {
    // The equivalence this whole workstream exists to break.
    const wrapper = await mountAndExpire(AdvisorProgression, { apiToken: 'test-token' })

    expect(wrapper.text()).not.toContain('advisorProgress.noActivityYet')
  })
})

describe('Team Progress', () => {
  test('an unanswered request ends as a stated error', async () => {
    const wrapper = await mountAndExpire(FirmTeamProgress, { apiToken: 'test-token' })

    expect(wrapper.vm.loading).toBe(false)
    expect(wrapper.vm.error).toBe(true)
    expect(wrapper.text()).toContain('firmTeamProgress.loadFailed')
  })

  test('a manager is not shown an empty team as though the firm had none', async () => {
    const wrapper = await mountAndExpire(FirmTeamProgress, { apiToken: 'test-token' })

    expect(wrapper.text()).not.toContain('firmTeamProgress.empty')
    expect(wrapper.find('table').exists()).toBe(false)
  })
})

describe('Quiz detail', () => {
  test('an unanswered request ends as a stated error', async () => {
    const wrapper = await mountAndExpire(FirmAdvisorQuestions, {
      apiToken: 'test-token',
      advisorId: 'advisor-1'
    })

    expect(wrapper.vm.loading).toBe(false)
    expect(wrapper.vm.error).toBe(true)
  })

  test('an advisor is not shown as having answered nothing', async () => {
    // Reading "no questions recorded" off a failed request would send a manager to
    // coach a gap that may not exist.
    const wrapper = await mountAndExpire(FirmAdvisorQuestions, {
      apiToken: 'test-token',
      advisorId: 'advisor-1'
    })

    expect(wrapper.vm.topics).toEqual([])
    expect(wrapper.vm.sessions).toEqual([])
    expect(wrapper.text()).not.toContain('firmAdvisorQuestions.empty')
  })
})

describe('the limit does not fire on a healthy request', () => {
  test('a screen that got its data never flips to the error state afterwards', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, advisors: [] })
    }))

    const wrapper = mountWithBuefy(FirmTeamProgress, { propsData: { apiToken: 'test-token' } })
    await flush()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.loading).toBe(false)
    expect(wrapper.vm.error).toBe(false)

    // Past the limit: a timer left running would now reject a settled request and
    // turn a working screen into a broken-looking one.
    jest.advanceTimersByTime(DEFAULT_TIMEOUT_MS + 1)
    await flush()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.error).toBe(false)
  })
})
