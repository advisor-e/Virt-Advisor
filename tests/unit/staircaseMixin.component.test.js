/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * staircaseMixin — the firm's own Advisory Staircase wording, on the selector the
 * advisor actually reads.
 *
 * Before this mixin, `VirtualAdvisor.vue` built the selector's five options from
 * `data/advisory-staircase.json` at build time. The firm's saved override reached
 * the engine's complexity ceiling and nothing else, so renaming a step in Firm
 * Manager changed nothing an advisor ever saw.
 *
 * Most of what follows drives the FAILURE paths. The mixin's promise is that the
 * selector always renders — a firm whose backend is unreachable must still get a
 * usable staircase, in Advisor-e's words — and a swallowed error looks identical
 * whether it was deliberate or accidental. So each way of failing is named.
 */

const fs = require('fs')
const path = require('path')

const { mountWithBuefy } = require('../helpers/mountComponent')
const staircaseMixin = require('~/mixins/staircaseMixin').default
const BASE = require('~/data/advisory-staircase.json')

const TOKEN_KEY = 'advisor_e_token'

// A bare host: the mixin is the subject, so the component around it stays empty.
// VirtualAdvisor itself is ~2,500 lines with speech, streaming and markdown wired
// into mounted() — mounting it to assert five strings would test a great deal that
// has nothing to do with this rule (see virtualAdvisorInput.component.test.js).
const Host = {
  name: 'StaircaseHost',
  mixins: [staircaseMixin],
  render (h) { return h('div', this.staircaseSteps.length) }
}

/** Steps in the shape `GET /api/advisor/staircase` sends them. */
const FIRM_STEPS = [
  { step: 1, name: 'Getting the books right', selectorDescription: 'Our words for step one.' },
  { step: 2, name: 'Making it readable', selectorDescription: 'Our words for step two.' },
  { step: 3, name: 'Making sense of it', selectorDescription: 'Our words for step three.' }
]

let prevClient

beforeEach(() => {
  // mounted() is guarded by `process.client`, which Nuxt sets at runtime and jest
  // does not. Without this the hook is skipped and the tests silently assert nothing.
  prevClient = process.client
  process.client = true
  window.localStorage.clear()
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))
})

afterEach(() => {
  process.client = prevClient
  delete global.fetch
  jest.clearAllMocks()
})

/** Mount and let the mixin's async load settle. */
async function mountHost () {
  const wrapper = mountWithBuefy(Host)
  await wrapper.vm.$nextTick()
  await Promise.resolve()
  return wrapper
}

describe('staircaseMixin — the starting point', () => {
  test('paints the platform steps immediately, before the backend answers', () => {
    // Deliberately NOT async: the selector must never be empty while a request is
    // in flight, so the value has to be right the moment the component exists.
    const wrapper = mountWithBuefy(Host)

    expect(wrapper.vm.staircaseSteps.length).toBe(BASE.steps.length)
    expect(wrapper.vm.staircaseSteps[0].name).toBe(`Step 1: ${BASE.steps[0].name}`)
  })

  test('keeps the "Step N:" prefix — the server parses that number back out', () => {
    // The contract with advisorEngine: the advisor's answer text carries the step
    // number, and that number is what resolves the complexity ceiling. Drop the
    // prefix and the engine silently falls back to the default ceiling.
    const wrapper = mountWithBuefy(Host)

    wrapper.vm.staircaseSteps.forEach((s, i) => {
      expect(s.name).toMatch(/^Step \d+: /)
      expect(s.name).toContain(BASE.steps[i].name)
    })
  })

  test('carries the data file’s selectorDescription as the option’s description', async () => {
    const wrapper = await mountHost()

    expect(wrapper.vm.staircaseSteps[0].description).toBe(BASE.steps[0].selectorDescription)
  })

  test('does nothing at all on the server (process.client false) — SSR safety', () => {
    process.client = false

    const wrapper = mountWithBuefy(Host)

    expect(wrapper.vm.staircaseSteps.length).toBe(BASE.steps.length)
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

describe('staircaseMixin — loading the firm’s wording', () => {
  test('calls the firmAuth-guarded route with the stored token', async () => {
    window.localStorage.setItem(TOKEN_KEY, 'a-real-jwt')

    await mountHost()

    expect(global.fetch).toHaveBeenCalledWith('/api/advisor/staircase', {
      headers: { Authorization: 'Bearer a-real-jwt' }
    })
  })

  test('falls back to the dev bypass token when none is stored', async () => {
    await mountHost()

    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer dev-local-bypass')
  })

  test("replaces the platform wording with the firm's — the defect this closes", async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ steps: FIRM_STEPS }) }))

    const wrapper = await mountHost()

    expect(wrapper.vm.staircaseSteps.map(s => s.name)).toEqual([
      'Step 1: Getting the books right',
      'Step 2: Making it readable',
      'Step 3: Making sense of it'
    ])
    expect(wrapper.vm.staircaseSteps[0].description).toBe('Our words for step one.')
  })

  test('a firm that removed steps gets a shorter selector, not a padded one', async () => {
    // deepMerge replaces the steps array wholesale, so the firm's list is the list.
    // The engine resolves the ceiling from the same array, so the two agree.
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ steps: FIRM_STEPS }) }))

    const wrapper = await mountHost()

    expect(wrapper.vm.staircaseSteps.length).toBe(3)
  })
})

// The documented promise: the selector always renders something usable.
describe('staircaseMixin — never leaves the advisor without a staircase', () => {
  test('a 401 keeps the platform wording', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 401 }))

    const wrapper = await mountHost()

    expect(wrapper.vm.staircaseSteps.length).toBe(BASE.steps.length)
    expect(wrapper.vm.staircaseSteps[0].name).toBe(`Step 1: ${BASE.steps[0].name}`)
  })

  test('an offline fetch is swallowed, not surfaced', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('Failed to fetch')))

    const wrapper = await mountHost()

    expect(wrapper.vm.staircaseSteps.length).toBe(BASE.steps.length)
  })

  test('a malformed body (no steps field) changes nothing', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(null) }))

    const wrapper = await mountHost()

    expect(wrapper.vm.staircaseSteps.length).toBe(BASE.steps.length)
  })

  test('unparseable JSON is swallowed too', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.reject(new Error('not json')) }))

    const wrapper = await mountHost()

    expect(wrapper.vm.staircaseSteps.length).toBe(BASE.steps.length)
  })

  test('an empty steps array is refused — a selector with no options is a dead end', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ steps: [] }) }))

    const wrapper = await mountHost()

    expect(wrapper.vm.staircaseSteps.length).toBe(BASE.steps.length)
  })

  test('a step with no usable name is refused rather than rendered blank', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ steps: [{ step: 1, name: '  ' }] })
    }))

    const wrapper = await mountHost()

    expect(wrapper.vm.staircaseSteps.length).toBe(BASE.steps.length)
  })

  test('a step with no step number is refused — the engine could not resolve it', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ steps: [{ name: 'Nameless position' }] })
    }))

    const wrapper = await mountHost()

    expect(wrapper.vm.staircaseSteps.length).toBe(BASE.steps.length)
  })
})

/**
 * The wiring itself, read from the source. VirtualAdvisor is not mounted here for
 * the reason given at the top of the file; what matters is that it can no longer
 * hold a second, firm-blind copy of the steps.
 */
describe('VirtualAdvisor — takes its staircase from the mixin, not the data file', () => {
  const SRC = fs.readFileSync(path.join(__dirname, '../../components/VirtualAdvisor.vue'), 'utf8')

  test('mixes in staircaseMixin', () => {
    expect(SRC).toContain('staircaseMixin')
    expect(/mixins:\s*\[[^\]]*staircaseMixin[^\]]*\]/.test(SRC)).toBe(true)
  })

  test('keeps no copy of its own — a second copy is how the two drift apart', () => {
    // The original defect in one line: the component owned `staircaseSteps` and
    // built them from the platform import, so nothing a firm saved could reach it.
    expect(SRC).not.toMatch(/staircaseSteps:\s*advisoryStaircase\.steps/)
    expect(SRC).not.toContain('~/data/advisory-staircase.json')
  })
})
