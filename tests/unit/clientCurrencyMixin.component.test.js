/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * A CLIENT's currency on a report screen — currencyMixin.loadClientCurrency and the
 * seam in savedReport.onReportClient (item 13.4, Mike's ruling 2026-09-22).
 *
 * 🔴 THE BUG THIS EXISTS TO PREVENT, and it is invisible in UAT. The firm's currency
 * is cached in ONE localStorage key for the whole app. Cache a client's currency
 * there and the NEXT client paints with the previous one's symbol — a tester looking
 * at one client at a time would never see it, and the figures look perfectly correct
 * because only the symbol is wrong. Money labelled in the wrong currency is exactly
 * the failure item 13.1's wording exists to prevent, one level down.
 *
 * Also pinned: a client with no currency of its own falls BACK to the firm's rather
 * than keeping the last client's, and a failed lookup never takes the report down.
 */

const { mountWithBuefy } = require('../helpers/mountComponent')
const currencyMixin = require('~/mixins/currencyMixin').default
const currenciesData = require('~/data/currencies.json')

const CACHE_KEY = 'advisor_e_currency'

const Host = {
  name: 'ClientCurrencyHost',
  mixins: [currencyMixin],
  render (h) { return h('div', this.money(1234)) }
}

let prevClient

/** Answer the firm route and the client route independently. */
function backendServes ({ firm = null, client = null, clientFails = false } = {}) {
  global.fetch = jest.fn((url) => {
    if (String(url).includes('/client/')) {
      if (clientFails) { return Promise.resolve({ ok: false }) }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(client || {}) })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(firm || {}) })
  })
}

beforeEach(() => {
  prevClient = process.client
  process.client = true
  window.localStorage.clear()
  backendServes()
})

afterEach(() => {
  process.client = prevClient
  delete global.fetch
  jest.clearAllMocks()
})

async function mountHost () {
  const wrapper = mountWithBuefy(Host)
  await wrapper.vm.$nextTick()
  await Promise.resolve()
  return wrapper
}

/** Let a loadClientCurrency call settle. */
async function settle (wrapper) {
  await Promise.resolve()
  await Promise.resolve()
  await wrapper.vm.$nextTick()
}

describe('a client with its own currency', () => {
  test('shows the client\'s currency, and says it is the client\'s', async () => {
    backendServes({
      firm: { currency: 'GBP', isDefault: false },
      client: { currency: 'EUR', isDefault: false, source: 'client' }
    })
    const wrapper = await mountHost()

    await wrapper.vm.loadClientCurrency('client-abc')
    await settle(wrapper)

    expect(wrapper.vm.firmCurrency).toBe('EUR')
    expect(wrapper.vm.currencySource).toBe('client')
  })

  test('🔴 NEVER caches the client\'s currency — the cache is the FIRM\'s alone', async () => {
    backendServes({
      firm: { currency: 'GBP', isDefault: false },
      client: { currency: 'EUR', isDefault: false, source: 'client' }
    })
    const wrapper = await mountHost()

    await wrapper.vm.loadClientCurrency('client-abc')
    await settle(wrapper)

    // The firm's value may be cached; the client's must not be, or the next
    // client mounts wearing this one's symbol.
    expect(window.localStorage.getItem(CACHE_KEY)).not.toBe('EUR')
  })
})

describe('the cascade, on screen', () => {
  test('a client with no choice of its own falls back to the firm\'s', async () => {
    backendServes({
      firm: { currency: 'GBP', isDefault: false },
      client: { currency: 'GBP', isDefault: false, source: 'firm' }
    })
    const wrapper = await mountHost()

    await wrapper.vm.loadClientCurrency('client-with-none')
    await settle(wrapper)

    expect(wrapper.vm.firmCurrency).toBe('GBP')
    expect(wrapper.vm.currencySource).toBe('firm')
  })

  test('switching from a euro client to one with none returns to the firm\'s', async () => {
    backendServes({
      firm: { currency: 'GBP', isDefault: false },
      client: { currency: 'EUR', isDefault: false, source: 'client' }
    })
    const wrapper = await mountHost()
    await wrapper.vm.loadClientCurrency('client-euro')
    await settle(wrapper)
    expect(wrapper.vm.firmCurrency).toBe('EUR')

    // Now a client that inherits.
    backendServes({
      firm: { currency: 'GBP', isDefault: false },
      client: { currency: 'GBP', isDefault: false, source: 'firm' }
    })
    await wrapper.vm.loadClientCurrency('client-plain')
    await settle(wrapper)

    expect(wrapper.vm.firmCurrency).toBe('GBP')
    expect(wrapper.vm.currencySource).toBe('firm')
  })

  test('clearing the client re-reads the FIRM route, not the client one', async () => {
    backendServes({ firm: { currency: 'AUD', isDefault: false } })
    const wrapper = await mountHost()
    global.fetch.mockClear()

    await wrapper.vm.loadClientCurrency('')
    await settle(wrapper)

    const urls = global.fetch.mock.calls.map(c => String(c[0]))
    expect(urls.some(u => u.includes('/client/'))).toBe(false)
    expect(wrapper.vm.firmCurrency).toBe('AUD')
  })
})

describe('failure never breaks the report', () => {
  test('a failed client lookup keeps what is already showing', async () => {
    backendServes({ firm: { currency: 'GBP', isDefault: false } })
    const wrapper = await mountHost()
    await settle(wrapper)
    expect(wrapper.vm.firmCurrency).toBe('GBP')

    backendServes({ clientFails: true })
    await wrapper.vm.loadClientCurrency('client-abc')
    await settle(wrapper)

    expect(wrapper.vm.firmCurrency).toBe('GBP')
  })

  test('a thrown fetch is swallowed and the screen still renders money', async () => {
    const wrapper = await mountHost()
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')))

    await expect(wrapper.vm.loadClientCurrency('client-abc')).resolves.toBeUndefined()
    expect(typeof wrapper.vm.money(1234)).toBe('string')
  })

  test('an unsupported code from the backend is ignored, not displayed', async () => {
    backendServes({
      firm: { currency: 'GBP', isDefault: false },
      client: { currency: 'XYZ', source: 'client' }
    })
    const wrapper = await mountHost()
    await settle(wrapper)

    await wrapper.vm.loadClientCurrency('client-abc')
    await settle(wrapper)

    expect(wrapper.vm.firmCurrency).not.toBe('XYZ')
  })

  test('the id is URL-encoded, so an odd id cannot reshape the path', async () => {
    backendServes({ client: { currency: 'EUR', source: 'client' } })
    const wrapper = await mountHost()
    global.fetch.mockClear()

    await wrapper.vm.loadClientCurrency('a/../b')
    await settle(wrapper)

    const url = String(global.fetch.mock.calls[0][0])
    expect(url).toContain(encodeURIComponent('a/../b'))
  })
})

describe('the starting state', () => {
  test('source starts as default, before anything is known', () => {
    process.client = false
    const wrapper = mountWithBuefy(Host)
    expect(wrapper.vm.currencySource).toBe('default')
    expect(wrapper.vm.firmCurrency).toBe(currenciesData.default)
    process.client = true
  })
})
