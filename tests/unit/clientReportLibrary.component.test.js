/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const ClientReportLibrary = require('~/components/ClientReportLibrary.vue').default
const { MODELS, isOpenable } = require('~/utils/reportModelCatalogue')

/**
 * The client's own library (design/features/business-entity-reports.md, D1/D2, approved
 * by Mike 2026-09-03). What matters and what UAT cannot check: a model the backend did
 * NOT open carries no link at all — not a greyed link, no link — and the page never
 * decides for itself: the open set is the backend's answer for the token, and a 403 is a
 * message, not a list. Assertions use i18n keys (tests/helpers/mountComponent.js).
 */
function respond (status, body) {
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) })
}

async function settle (wrapper) {
  for (let i = 0; i < 4; i++) { await wrapper.vm.$nextTick() }
}

beforeEach(() => {
  window.localStorage.clear()
  global.fetch = jest.fn()
})

afterEach(() => { delete global.fetch })

describe('ClientReportLibrary', () => {
  it('asks to sign in when there is no token, and never calls the backend', async () => {
    const wrapper = mountWithBuefy(ClientReportLibrary)
    await settle(wrapper)
    expect(wrapper.text()).toContain('clientReports.library.signIn')
    expect(global.fetch).not.toHaveBeenCalled()
    expect(wrapper.findAll('a').length).toBe(0)
  })

  it('links ONLY the models the backend opened; every other card has no link', async () => {
    window.localStorage.setItem('advisor_e_token', 'tok')
    global.fetch.mockReturnValue(respond(200, { success: true, open: { '/volatility': { state: 'open' } } }))
    const wrapper = mountWithBuefy(ClientReportLibrary)
    await settle(wrapper)

    const links = wrapper.findAll('a')
    expect(links.length).toBe(1)
    expect(links.at(0).attributes('href')).toBe('/volatility')

    const cards = wrapper.findAll('.crl-card')
    expect(cards.length).toBe(MODELS.filter(m => m.route).length)
    const locked = cards.filter(c => c.attributes('data-state') === 'locked')
    expect(locked.length).toBe(cards.length - 1)
    expect(wrapper.text()).toContain('clientReports.library.lockedLabel')
    expect(wrapper.text()).toContain('clientReports.library.openLabel')

    // The token went with the request; nothing else did.
    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/client-reports/mine')
    expect(init.headers.Authorization).toBe('Bearer tok')
  })

  it('an opened model that is not built yet still does not link — no dead pages for a client', async () => {
    const soon = MODELS.find(m => m.route && !isOpenable(m))
    if (!soon) { return } // every routed model is built today; nothing to prove
    window.localStorage.setItem('advisor_e_token', 'tok')
    global.fetch.mockReturnValue(respond(200, { success: true, open: { [soon.route]: { state: 'open' } } }))
    const wrapper = mountWithBuefy(ClientReportLibrary)
    await settle(wrapper)
    expect(wrapper.findAll('a').length).toBe(0)
  })

  it('a 403 — not a client\'s sign-in — is a message, not an empty list', async () => {
    window.localStorage.setItem('advisor_e_token', 'advisor-token')
    global.fetch.mockReturnValue(respond(403, { success: false, error: { code: 'NOT_A_BUSINESS_ENTITY' } }))
    const wrapper = mountWithBuefy(ClientReportLibrary)
    await settle(wrapper)
    expect(wrapper.text()).toContain('clientReports.library.notEntity')
    expect(wrapper.findAll('.crl-card').length).toBe(0)
  })

  it('any other failure says so rather than showing a silently empty page', async () => {
    window.localStorage.setItem('advisor_e_token', 'tok')
    global.fetch.mockReturnValue(respond(500, {}))
    const wrapper = mountWithBuefy(ClientReportLibrary)
    await settle(wrapper)
    expect(wrapper.text()).toContain('clientReports.library.loadFailed')
  })
})
