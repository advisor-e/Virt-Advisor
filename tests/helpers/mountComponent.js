'use strict'

/**
 * Shared mounting helper for component tests (TEST-GAP, design/ACTIONS.md).
 *
 * Every component test needs the same two things, and getting either wrong makes the
 * test lie rather than fail:
 *
 * 1. **Real Buefy, not stubs.** The intake screens carry their state in `b-input` /
 *    `b-checkbox` `v-model`s, so a stub would be testing the stub. Buefy is a real
 *    dependency and mounts cleanly under jsdom, so the tests exercise what ships.
 *
 * 2. **A `$t()` stand-in that returns the KEY, not English.** Deliberate: assertions
 *    then pin *which message* the screen shows, not its wording. The three report
 *    components are due an i18n sweep (P1, design/ACTIONS.md) — with key-based
 *    assertions these tests survive it; with English ones they would all break on the
 *    day the wording moves into `locales/`.
 *
 * Requires a `@jest-environment jsdom` docblock in the calling test file.
 */

const { createLocalVue, mount, shallowMount } = require('@vue/test-utils')
const Buefy = require('buefy').default

// One localVue for the whole suite — Buefy registers ~60 components, and re-running
// that per test is the bulk of a component test's runtime.
const localVue = createLocalVue()
localVue.use(Buefy)

/**
 * `$t(key, params)` → the key, with any interpolation params appended so a test can
 * assert on them (e.g. a count) without depending on the English sentence around them.
 *
 * @param {string} key - the i18n key the component asked for.
 * @param {object} [params] - vue-i18n interpolation values.
 * @returns {string} the key, or `key {"n":3}` when params were supplied.
 */
function translateStub (key, params) {
  return params ? `${key} ${JSON.stringify(params)}` : key
}

/**
 * Default mocks every component test gets. `$tc`/`$d` are included because a component
 * picked up mid-refactor may reach for them, and a missing mock fails as an unhelpful
 * "not a function" deep inside the render.
 *
 * `$i18n.locale` is not optional for the report screens: `mixins/currencyMixin.js`
 * formats every money figure with it, so without it the whole screen fails to render
 * with "Cannot read property 'locale' of undefined" — which reads like a broken test
 * rather than a missing mock.
 */
function defaultMocks () {
  return {
    $t: translateStub,
    $tc: translateStub,
    $d: value => String(value),
    $i18n: { locale: 'en' }
  }
}

/**
 * `<nuxt-link>` is injected by Nuxt at runtime and does not exist in a bare test mount,
 * so any component with in-app navigation renders it as an unknown element and a test
 * asking for the link finds nothing. This stub renders the real thing an advisor
 * clicks — an anchor carrying the destination — so navigation stays assertable.
 */
const NuxtLinkStub = {
  name: 'NuxtLink',
  props: { to: { type: [String, Object], default: '' } },
  render (h) {
    return h('a', { attrs: { href: typeof this.to === 'string' ? this.to : '' } }, this.$slots.default)
  }
}

/**
 * vue-i18n's `<i18n path tag>` component, which the app registers and a bare test mount does
 * not. It renders the sentence through the test's own `$t`, filling `{name}` from the named
 * slots — so under `englishMocks()` a test reads the real English sentence with its bold parts
 * in place, and under the key stub it reads the key. Without it those sentences were invisible
 * to every test (2026-09-25).
 */
const I18nStub = {
  name: 'I18n',
  functional: true,
  props: { path: { type: String, required: true }, tag: { type: [String, Boolean], default: 'span' } },
  render (h, ctx) {
    const text = String(ctx.parent.$t(ctx.props.path))
    const slots = ctx.slots()
    const children = []
    text.split(/(\{[A-Za-z0-9_]+\})/).forEach((piece) => {
      const name = (piece.match(/^\{([A-Za-z0-9_]+)\}$/) || [])[1]
      if (name && slots[name]) { children.push(...slots[name]) } else if (piece) { children.push(piece) }
    })
    return h(ctx.props.tag || 'span', ctx.data, children)
  }
}

/** Stubs every component test gets; a caller's own `stubs` merge over these. */
function defaultStubs () {
  return { NuxtLink: NuxtLinkStub, 'nuxt-link': NuxtLinkStub, i18n: I18nStub }
}

/**
 * Mount a component with Buefy and the i18n stand-in already wired.
 *
 * @param {object} component - the imported `.vue` component.
 * @param {object} [options] - @vue/test-utils options; `mocks` and `stubs` merge over
 *   the defaults.
 * @returns {object} the test-utils Wrapper.
 */
function mountWithBuefy (component, options) {
  const opts = options || {}
  return mount(component, Object.assign({}, opts, {
    localVue,
    mocks: Object.assign(defaultMocks(), opts.mocks),
    stubs: Object.assign(defaultStubs(), opts.stubs)
  }))
}

/**
 * Shallow variant — for presentational components whose children are irrelevant.
 *
 * @param {object} component - the imported `.vue` component.
 * @param {object} [options] - @vue/test-utils options; `mocks` merges over the defaults.
 * @returns {object} the test-utils Wrapper.
 */
function shallowWithBuefy (component, options) {
  const opts = options || {}
  return shallowMount(component, Object.assign({}, opts, {
    localVue,
    mocks: Object.assign(defaultMocks(), opts.mocks)
  }))
}

/**
 * `$t` / `$tc` backed by the real `locales/en.json`, for a screen whose tests read the
 * English it shows — the numbers inside a sentence ("1h 17m — 17m video") are what they
 * guard, and the key stub would hide them behind a JSON blob. Pass as `mocks`.
 *
 * @returns {object} mocks carrying real English `$t`, `$tc` and `$i18n.locale`.
 */
function englishMocks () {
  const VueI18n = require('vue-i18n')
  // Installed on a private Vue copy: on the global one it defines a read-only
  // `$i18n` that the mock below could not then replace.
  createLocalVue().use(VueI18n)
  const i18n = new VueI18n({ locale: 'en', messages: { en: require('../../locales/en.json') } })
  return {
    $t: (key, params) => i18n.t(key, params),
    $tc: (key, n, params) => i18n.tc(key, n, params),
    $i18n: { locale: 'en' }
  }
}

module.exports = { localVue, mountWithBuefy, shallowWithBuefy, translateStub, englishMocks }
