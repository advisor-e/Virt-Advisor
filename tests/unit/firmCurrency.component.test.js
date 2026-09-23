/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')

const FirmCurrency = require('~/components/firm/FirmCurrency.vue').default

/**
 * The Firm Manager Hub's Currency tab (item 13.3, Mike's ruling 2026-09-23: the Hub is
 * where a manager SETS the currency, and the Model Library keeps showing it read-only).
 *
 * 🔴 WHAT THESE PIN, AND WHAT THEY DELIBERATELY DO NOT. Per CLAUDE.md's testing rule,
 * nothing here asserts a label or a CSS class — a person in UAT judges wording better
 * than an assertion can. What a tester CANNOT see is a failed save that leaves the
 * picker showing a currency the account does not actually have: the screen would look
 * correct and every report would disagree with it. That revert is the first block below
 * and it is why this file exists.
 */
function respond (status, body) {
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) })
}

async function settle (wrapper) {
  for (let i = 0; i < 6; i++) { await wrapper.vm.$nextTick() }
}

function mount () {
  return mountWithBuefy(FirmCurrency, { propsData: { apiToken: 'tok-1' } })
}

beforeEach(() => { window.localStorage.clear() })
afterEach(() => { delete global.fetch })

describe('Firm currency — a failed save never leaves a wrong currency on screen', () => {
  it('reverts the picker and the default flag when the save is refused', async () => {
    global.fetch = jest.fn((url, init) => ((init && init.method) === 'POST'
      ? respond(500, {})
      : respond(200, { currency: 'NZD', isDefault: false })))

    const wrapper = mount()
    await settle(wrapper)
    expect(wrapper.vm.firmCurrency).toBe('NZD')

    await wrapper.vm.change('EUR')
    await settle(wrapper)

    // Still NZD. A picker showing EUR while every report says NZD is worse than an
    // error, because nothing on the screen would ever say the two disagree.
    expect(wrapper.vm.firmCurrency).toBe('NZD')
    expect(wrapper.vm.isDefault).toBe(false)
  })

  it('does not cache a currency it failed to save', async () => {
    global.fetch = jest.fn((url, init) => ((init && init.method) === 'POST'
      ? respond(500, {})
      : respond(200, { currency: 'NZD', isDefault: false })))

    const wrapper = mount()
    await settle(wrapper)
    await wrapper.vm.change('EUR')
    await settle(wrapper)

    // The cache is what every report screen reads on open. A code written here that
    // the backend rejected would relabel the whole account off a failed save.
    expect(window.localStorage.getItem('advisor_e_currency')).toBeNull()
  })

  it('caches the new code on a successful save, so reports pick it up', async () => {
    global.fetch = jest.fn((url, init) => ((init && init.method) === 'POST'
      ? respond(200, { saved: true, currency: 'EUR' })
      : respond(200, { currency: 'NZD', isDefault: false })))

    const wrapper = mount()
    await settle(wrapper)
    await wrapper.vm.change('EUR')
    await settle(wrapper)

    expect(wrapper.vm.firmCurrency).toBe('EUR')
    expect(window.localStorage.getItem('advisor_e_currency')).toBe('EUR')
  })

  it('a save that lands clears the "using the default" state', async () => {
    global.fetch = jest.fn((url, init) => ((init && init.method) === 'POST'
      ? respond(200, { saved: true, currency: 'EUR' })
      : respond(200, { currency: 'NZD', isDefault: true })))

    const wrapper = mount()
    await settle(wrapper)
    expect(wrapper.vm.isDefault).toBe(true)

    await wrapper.vm.change('EUR')
    await settle(wrapper)

    // The firm has now chosen. Still saying "you have not chosen" would be false.
    expect(wrapper.vm.isDefault).toBe(false)
  })
})

describe('Firm currency — an unreadable setting never looks like the default', () => {
  it('an HTTP failure sets error rather than showing a currency', async () => {
    global.fetch = jest.fn(() => respond(500, {}))
    const wrapper = mount()
    await settle(wrapper)

    // Showing the platform default here would tell a manager their firm has no choice
    // set, which is a claim about their data made at the moment we could not read it.
    expect(wrapper.vm.error).toBe(true)
  })

  it('a network failure is a failure', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
    const wrapper = mount()
    await settle(wrapper)
    expect(wrapper.vm.error).toBe(true)
  })

  it('a firm sitting on the platform default is NOT an error', async () => {
    global.fetch = jest.fn(() => respond(200, { currency: 'NZD', isDefault: true }))
    const wrapper = mount()
    await settle(wrapper)

    expect(wrapper.vm.error).toBe(false)
    expect(wrapper.vm.isDefault).toBe(true)
  })
})

describe('Firm currency — the request', () => {
  it('sends the bearer token and names no firm', async () => {
    global.fetch = jest.fn(() => respond(200, { currency: 'NZD', isDefault: false }))
    const wrapper = mount()
    await settle(wrapper)

    const [url, init] = global.fetch.mock.calls[0]
    expect(init.headers.Authorization).toBe('Bearer tok-1')
    // The scope is resolved by firmAuth from the verified token. A firmId in the
    // request would be an IDOR into another firm's settings.
    expect(url).toBe('/api/report/currency')
    expect(url).not.toMatch(/firmId|firm_id|scope=/)
  })

  it('does not POST when the chosen code is the one already in force', async () => {
    global.fetch = jest.fn(() => respond(200, { currency: 'NZD', isDefault: false }))
    const wrapper = mount()
    await settle(wrapper)

    await wrapper.vm.change('NZD')
    await settle(wrapper)

    const posts = global.fetch.mock.calls.filter(c => (c[1] && c[1].method) === 'POST')
    expect(posts).toHaveLength(0)
  })

  it('offers only codes the backend validates against', async () => {
    global.fetch = jest.fn(() => respond(200, { currency: 'NZD', isDefault: false }))
    const wrapper = mount()
    await settle(wrapper)

    // Both sides read data/currencies.json, so the picker cannot offer a code the
    // route would reject with INVALID_CURRENCY.
    const supported = require('../../data/currencies.json').currencies.map(c => c.code)
    expect(wrapper.vm.currencies.map(c => c.code)).toEqual(supported)
  })
})
