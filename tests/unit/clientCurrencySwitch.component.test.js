/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * The advisor's per-client CURRENCY control on the report header (item 13.4).
 * Built to design/mockups/client-currency-picker.html, approved by Mike 2026-09-22.
 *
 * WHAT UAT CANNOT SEE, AND THIS PINS:
 *   - the control tells a client's OWN currency from the firm's inherited one, which is
 *     the whole reason the drawing carries two different notes rather than one;
 *   - "Use firm's" appears only when there IS something to clear;
 *   - a clear sends an empty string — the backend's signal to inherit — not a code;
 *   - a failed save says so and does NOT leave a wrong currency on screen as if saved;
 *   - a failed READ is silent, because a display setting must never break a report.
 *
 * The relabel line (item 13.1) is asserted once, here, beside the control it qualifies:
 * a client-level currency reads as a conversion far more readily than a firm-wide one,
 * so that sentence is load-bearing rather than decorative.
 */

jest.mock('~/utils/devHost', () => ({ isDevHost: jest.fn(() => false) }))

const { mountWithBuefy } = require('../helpers/mountComponent')
const { isDevHost } = require('~/utils/devHost')
const ClientAccessSwitch = require('~/components/base/ClientAccessSwitch.vue').default

function respond (status, body) {
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) })
}

async function settle (wrapper) {
  for (let i = 0; i < 8; i++) { await wrapper.vm.$nextTick() }
}

const CLIENTS = {
  success: true,
  clients: [{ id: 'c-1', name: 'Big Bird Bakery' }, { id: 'c-2', name: 'Vanoss' }]
}

function fetchByUrl (answers) {
  return jest.fn((url, init) => {
    const method = (init && init.method) || 'GET'
    const key = `${method} ${url}`
    const hit = Object.keys(answers).find(k => key.indexOf(k) === 0)
    return hit ? answers[hit]() : respond(404, {})
  })
}

/** Sign in as an advisor and serve the client list plus a currency answer. */
function mountWithCurrency (currencyAnswer, extra = {}) {
  window.localStorage.setItem('advisor_e_token', 'tok')
  global.fetch = fetchByUrl({
    'GET /api/clients': () => respond(200, CLIENTS),
    'GET /api/client-reports/access/': () => respond(200, { open: {} }),
    'GET /api/report/currency/client/': () => respond(200, currencyAnswer),
    ...extra
  })
  return mountWithBuefy(ClientAccessSwitch, { propsData: { modelRoute: '/volatility' } })
}

beforeEach(() => { window.localStorage.clear(); isDevHost.mockReturnValue(false) })
afterEach(() => { delete global.fetch; jest.clearAllMocks() })

describe('the control on screen', () => {
  it('shows the currency picker, and the relabel line beside it', async () => {
    const wrapper = mountWithCurrency({ currency: 'GBP', source: 'firm' })
    await settle(wrapper)

    expect(wrapper.find('.cas-cur').exists()).toBe(true)
    expect(wrapper.find('.cas-curselect').exists()).toBe(true)
    expect(wrapper.text()).toContain('modelLibrary.currency.relabelNote')
  })

  it('is disabled until a client is chosen — it waits, it does not vanish', async () => {
    const wrapper = mountWithCurrency({ currency: 'GBP', source: 'firm' })
    await settle(wrapper)

    expect(wrapper.find('.cas-cur').exists()).toBe(true)
    expect(wrapper.find('.cas-curselect select').attributes('disabled')).toBeDefined()
  })

  it('offers every supported currency, from the shared single source', async () => {
    const currencies = require('~/data/currencies.json').currencies
    const wrapper = mountWithCurrency({ currency: 'GBP', source: 'firm' })
    await settle(wrapper)

    expect(wrapper.find('.cas-curselect').findAll('option').length).toBe(currencies.length)
  })
})

describe('whose choice is showing', () => {
  it('says the firm\'s when the client has none of its own', async () => {
    const wrapper = mountWithCurrency({ currency: 'GBP', source: 'firm' })
    await settle(wrapper)
    await wrapper.vm.pickClient('c-1')
    await settle(wrapper)

    expect(wrapper.text()).toContain('clientReports.currency.inherited')
    expect(wrapper.text()).not.toContain('clientReports.currency.ownChoice')
  })

  it('says the client\'s own when it has one, and offers Use firm\'s', async () => {
    const wrapper = mountWithCurrency({ currency: 'EUR', source: 'client' })
    await settle(wrapper)
    await wrapper.vm.pickClient('c-1')
    await settle(wrapper)

    expect(wrapper.text()).toContain('clientReports.currency.ownChoice')
    expect(wrapper.find('.cas-clear').exists()).toBe(true)
  })

  it('offers NO Use firm\'s when there is nothing to clear', async () => {
    const wrapper = mountWithCurrency({ currency: 'GBP', source: 'firm' })
    await settle(wrapper)
    await wrapper.vm.pickClient('c-1')
    await settle(wrapper)

    expect(wrapper.find('.cas-clear').exists()).toBe(false)
  })
})

describe('changing it', () => {
  it('posts the code for the chosen client, with the token', async () => {
    const wrapper = mountWithCurrency({ currency: 'GBP', source: 'firm' }, {
      'POST /api/report/currency/client/': () =>
        respond(200, { saved: true, currency: 'EUR', source: 'client' })
    })
    await settle(wrapper)
    await wrapper.vm.pickClient('c-1')
    await settle(wrapper)
    global.fetch.mockClear()

    await wrapper.vm.pickCurrency('EUR')
    await settle(wrapper)

    const call = global.fetch.mock.calls.find(c => (c[1] || {}).method === 'POST')
    expect(String(call[0])).toContain('/api/report/currency/client/c-1')
    expect(JSON.parse(call[1].body)).toEqual({ currency: 'EUR' })
    expect(call[1].headers.Authorization).toBe('Bearer tok')
  })

  it('🔴 a clear sends an EMPTY string — the signal to inherit, never a code', async () => {
    const wrapper = mountWithCurrency({ currency: 'EUR', source: 'client' }, {
      'POST /api/report/currency/client/': () =>
        respond(200, { saved: true, currency: 'GBP', source: 'firm' })
    })
    await settle(wrapper)
    await wrapper.vm.pickClient('c-1')
    await settle(wrapper)

    await wrapper.vm.pickCurrency('')
    await settle(wrapper)

    const call = global.fetch.mock.calls.find(c => (c[1] || {}).method === 'POST')
    expect(JSON.parse(call[1].body)).toEqual({ currency: '' })
    // And the screen now shows the FIRM's, not a blank.
    expect(wrapper.vm.currency).toBe('GBP')
    expect(wrapper.vm.currencySource).toBe('firm')
  })

  it('tells the report what now applies, so its money re-formats', async () => {
    const wrapper = mountWithCurrency({ currency: 'GBP', source: 'firm' }, {
      'POST /api/report/currency/client/': () =>
        respond(200, { saved: true, currency: 'EUR', source: 'client' })
    })
    await settle(wrapper)
    await wrapper.vm.pickClient('c-1')
    await settle(wrapper)

    await wrapper.vm.pickCurrency('EUR')
    await settle(wrapper)

    const emitted = wrapper.emitted('currency-change')
    expect(emitted[emitted.length - 1][0])
      .toEqual({ clientId: 'c-1', currency: 'EUR', source: 'client' })
  })

  it('does nothing at all when no client is chosen', async () => {
    const wrapper = mountWithCurrency({ currency: 'GBP', source: 'firm' })
    await settle(wrapper)
    global.fetch.mockClear()

    await wrapper.vm.pickCurrency('EUR')
    await settle(wrapper)

    expect(global.fetch.mock.calls.some(c => (c[1] || {}).method === 'POST')).toBe(false)
  })
})

describe('when it fails', () => {
  it('a failed SAVE says so, and does not show the code as if it saved', async () => {
    const wrapper = mountWithCurrency({ currency: 'GBP', source: 'firm' }, {
      'POST /api/report/currency/client/': () => respond(500, {})
    })
    await settle(wrapper)
    await wrapper.vm.pickClient('c-1')
    await settle(wrapper)

    await wrapper.vm.pickCurrency('EUR')
    await settle(wrapper)

    expect(wrapper.text()).toContain('clientReports.currency.saveError')
    expect(wrapper.vm.currency).toBe('GBP')
    expect(wrapper.emitted('currency-change')).toBeFalsy()
  })

  it('a failed READ is silent — a display setting never breaks a report', async () => {
    const wrapper = mountWithCurrency(null, {
      'GET /api/report/currency/client/': () => respond(500, {})
    })
    await settle(wrapper)
    await wrapper.vm.pickClient('c-1')
    await settle(wrapper)

    expect(wrapper.text()).not.toContain('clientReports.currency.saveError')
    expect(wrapper.find('.cas-cur').exists()).toBe(true)
  })
})
