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
 * Mount a component with Buefy and the i18n stand-in already wired.
 *
 * @param {object} component - the imported `.vue` component.
 * @param {object} [options] - @vue/test-utils options; `mocks` merges over the defaults.
 * @returns {object} the test-utils Wrapper.
 */
function mountWithBuefy (component, options) {
  const opts = options || {}
  return mount(component, Object.assign({}, opts, {
    localVue,
    mocks: Object.assign(defaultMocks(), opts.mocks)
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

module.exports = { localVue, mountWithBuefy, shallowWithBuefy, translateStub }
