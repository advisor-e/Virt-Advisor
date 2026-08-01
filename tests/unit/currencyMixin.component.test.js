/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * currencyMixin — the firm's currency, and every money figure on every report screen.
 *
 * Untested until 2026-07-30 (design/COVERAGE-DEBT.md). Its own doc comment states the
 * contract that matters, and it is a contract about FAILURE: "any failure (401, offline,
 * backend down) silently keeps the cached or default currency", because "a report must
 * render regardless of the account setting being reachable".
 *
 * That is exactly the kind of promise that rots unnoticed — a swallowed error looks
 * identical whether it is deliberate or accidental. So most of what follows drives the
 * failure paths, not the happy one.
 */

const { mountWithBuefy } = require('../helpers/mountComponent')
const currencyMixin = require('~/mixins/currencyMixin').default
const currenciesData = require('~/data/currencies.json')

const CACHE_KEY = 'advisor_e_currency'
const TOKEN_KEY = 'advisor_e_token'

// A bare host: the mixin is the subject, so the component around it stays empty.
const Host = {
  name: 'CurrencyHost',
  mixins: [currencyMixin],
  render (h) { return h('div', this.money(1234)) }
}

let prevClient

beforeEach(() => {
  // The mixin's mounted() hook is guarded by `process.client`, which Nuxt sets at
  // runtime and jest does not. Without this the whole hook is skipped and the tests
  // silently assert nothing.
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

describe('currencyMixin — starting currency', () => {
  test("defaults to the data file's default, never a hardcoded one", async () => {
    const wrapper = await mountHost()

    expect(wrapper.vm.firmCurrency).toBe(currenciesData.default)
  })

  // Deliberately NOT async: the point is the value is already right before the fetch
  // settles, so awaiting anything here would test the wrong half of the pattern.
  test('paints instantly from a supported cached value, before the backend answers', () => {
    window.localStorage.setItem(CACHE_KEY, 'EUR')

    const wrapper = mountWithBuefy(Host)

    // Asserted BEFORE awaiting the fetch: this is the "paint instantly" half of the
    // localStorage-first pattern.
    expect(wrapper.vm.firmCurrency).toBe('EUR')
  })

  test('ignores an unsupported cached value rather than formatting money with it', async () => {
    window.localStorage.setItem(CACHE_KEY, 'XXX')

    const wrapper = await mountHost()

    expect(wrapper.vm.firmCurrency).toBe(currenciesData.default)
  })

  test('does nothing at all on the server (process.client false) — SSR safety', () => {
    process.client = false
    window.localStorage.setItem(CACHE_KEY, 'EUR')

    const wrapper = mountWithBuefy(Host)

    expect(wrapper.vm.firmCurrency).toBe(currenciesData.default)
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

describe('currencyMixin — loading the firm currency', () => {
  test('calls the firmAuth-guarded route with the stored token', async () => {
    window.localStorage.setItem(TOKEN_KEY, 'a-real-jwt')

    await mountHost()

    expect(global.fetch).toHaveBeenCalledWith('/api/report/currency', {
      headers: { Authorization: 'Bearer a-real-jwt' }
    })
  })

  test('falls back to the dev bypass token when none is stored', async () => {
    await mountHost()

    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer dev-local-bypass')
  })

  test('applies and caches a supported currency from the backend', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ currency: 'GBP' }) }))

    const wrapper = await mountHost()

    expect(wrapper.vm.firmCurrency).toBe('GBP')
    expect(window.localStorage.getItem(CACHE_KEY)).toBe('GBP')
  })

  test('ignores an unsupported currency from the backend, and never caches it', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ currency: 'DOGE' }) }))

    const wrapper = await mountHost()

    expect(wrapper.vm.firmCurrency).toBe(currenciesData.default)
    expect(window.localStorage.getItem(CACHE_KEY)).toBeNull()
  })
})

// The documented promise: a report renders whatever the account setting does.
describe('currencyMixin — never breaks a report', () => {
  test('a 401 leaves the cached currency in place', async () => {
    window.localStorage.setItem(CACHE_KEY, 'EUR')
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 401 }))

    const wrapper = await mountHost()

    expect(wrapper.vm.firmCurrency).toBe('EUR')
  })

  test('an offline fetch is swallowed, not surfaced', async () => {
    window.localStorage.setItem(CACHE_KEY, 'AUD')
    global.fetch = jest.fn(() => Promise.reject(new Error('Failed to fetch')))

    const wrapper = await mountHost()

    expect(wrapper.vm.firmCurrency).toBe('AUD')
  })

  test('a malformed body (no currency field) changes nothing', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(null) }))

    const wrapper = await mountHost()

    expect(wrapper.vm.firmCurrency).toBe(currenciesData.default)
  })

  test('unparseable JSON is swallowed too', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.reject(new Error('not json')) }))

    const wrapper = await mountHost()

    expect(wrapper.vm.firmCurrency).toBe(currenciesData.default)
  })
})

describe('currencyMixin — the formatters a report screen inherits', () => {
  test('every formatter is provided, so a screen can delete its own copies', async () => {
    const wrapper = await mountHost()

    for (const fn of ['money', 'money2', 'signedMoney', 'kMoney', 'num']) {
      expect(typeof wrapper.vm[fn]).toBe('function')
    }
  })

  test('formatting follows the firm currency, not a fixed symbol', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ currency: 'GBP' }) }))

    const wrapper = await mountHost()

    expect(wrapper.vm.money(1234)).toContain('£')
    expect(wrapper.vm.money(1234)).toContain('1,234')

    // Switch the firm's currency and the same figure re-renders in the new one.
    wrapper.vm.firmCurrency = 'EUR'
    expect(wrapper.vm.money(1234)).not.toContain('£')
  })

  test('money2 keeps 2 decimal places where money rounds', async () => {
    const wrapper = await mountHost()

    expect(wrapper.vm.money2(0.93)).toMatch(/0\.93/)
  })

  test('signedMoney marks a positive figure', async () => {
    const wrapper = await mountHost()

    expect(wrapper.vm.signedMoney(1234)).toMatch(/^\+/)
  })

  test('kMoney abbreviates thousands', async () => {
    const wrapper = await mountHost()

    expect(wrapper.vm.kMoney(572000)).toMatch(/572k/)
  })

  test('num formats a plain number with the reader’s locale, with no currency symbol', async () => {
    const wrapper = await mountHost()

    expect(wrapper.vm.num(1234)).toBe('1,234')
    expect(wrapper.vm.num(1234.5, 1)).toMatch(/1,234\.5/)
  })
})
