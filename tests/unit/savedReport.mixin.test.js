/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const savedReport = require('~/mixins/savedReport').default

/**
 * The savedReport mixin (mixins/savedReport.js; design/features/business-entity-reports.md
 * §5, item 4.62). Pinned: the mode comes from the sign-in and nothing else; a client's copy
 * loads on mount and an advisor's only once a client is chosen; a load applies the saved
 * figures to the screen; a save sends the screen's figures to the right route with the
 * token; NOT_OPEN is told apart from any other failure; and Restore is advisor-only.
 */
function respond (status, body) {
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) })
}

async function settle (wrapper) {
  for (let i = 0; i < 6; i++) { await wrapper.vm.$nextTick() }
}

const Host = {
  name: 'HostScreen',
  mixins: [savedReport],
  data () { return { f: { sales: 100, markup: 47 }, applied: null, recomputed: 0 } },
  render (h) { return h('div') },
  methods: {
    reportInputs () { return Object.assign({}, this.f) },
    applyReportInputs (inputs) { this.applied = inputs; this.f = Object.assign({}, this.f, inputs); this.recomputed++ }
  }
}

function mount () {
  return mountWithBuefy(Host, { mocks: { $route: { path: '/debtor-drag' } } })
}

const ROW = { inputs: { sales: 250, markup: 47 }, savedBy: { tier: 'advisor', name: 'Pat' }, savedAt: '2026-09-03T10:00:00.000Z', advisorVersion: null }

beforeEach(() => { window.localStorage.clear() })
afterEach(() => { delete global.fetch })

describe('savedReport — mode', () => {
  it('is inert with no sign-in: no mode, no fetch', async () => {
    global.fetch = jest.fn()
    const w = mount()
    await settle(w)
    expect(w.vm.savedReport.mode).toBe('')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('a business entity sign-in loads its own copy on mount and applies it to the screen', async () => {
    window.localStorage.setItem('advisor_e_token', 'tok')
    window.localStorage.setItem('advisor_e_role', 'business_entity')
    global.fetch = jest.fn(() => respond(200, { success: true, report: ROW, clientChanges: [] }))
    const w = mount()
    await settle(w)
    expect(w.vm.savedReport.mode).toBe('client')
    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/client-reports/mine/saved?route=%2Fdebtor-drag')
    expect(init.headers.Authorization).toBe('Bearer tok')
    expect(w.vm.applied).toEqual({ sales: 250, markup: 47 })
    expect(w.vm.f.sales).toBe(250)
  })

  it('an advisor sign-in loads nothing until a client is chosen, then loads that client\'s row', async () => {
    window.localStorage.setItem('advisor_e_token', 'tok')
    window.localStorage.setItem('advisor_e_role', 'firm_manager')
    global.fetch = jest.fn(() => respond(200, { success: true, clientName: 'Big Bird Bakery', report: ROW, clientChanges: [] }))
    const w = mount()
    await settle(w)
    expect(w.vm.savedReport.mode).toBe('advisor')
    expect(global.fetch).not.toHaveBeenCalled()
    w.vm.onReportClient({ clientId: 'c-1', clientName: 'Big Bird Bakery' })
    await settle(w)
    expect(global.fetch.mock.calls[0][0]).toBe('/api/client-reports/saved/c-1?route=%2Fdebtor-drag')
    expect(w.vm.savedReport.report).toEqual(ROW)
    expect(w.vm.f.sales).toBe(250)
  })
})

describe('savedReport — saving', () => {
  it('the advisor saves the screen\'s figures to the client\'s row', async () => {
    window.localStorage.setItem('advisor_e_token', 'tok')
    window.localStorage.setItem('advisor_e_role', 'firm_manager')
    global.fetch = jest.fn(() => respond(200, { success: true, report: null, clientChanges: [] }))
    const w = mount()
    await settle(w)
    w.vm.onReportClient({ clientId: 'c-1', clientName: 'BB' })
    await settle(w)
    global.fetch.mockClear()
    global.fetch.mockImplementation(() => respond(200, { success: true, report: ROW, clientChanges: [] }))
    w.vm.f.sales = 250
    await w.vm.saveReport()
    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/client-reports/saved/c-1')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body)).toEqual({ route: '/debtor-drag', inputs: { sales: 250, markup: 47 } })
    expect(w.vm.savedReport.report).toEqual(ROW)
    expect(w.vm.savedReport.error).toBe('')
  })

  it('the client saves to its own route, and a NOT_OPEN refusal is named as such', async () => {
    window.localStorage.setItem('advisor_e_token', 'tok')
    window.localStorage.setItem('advisor_e_role', 'business_entity')
    global.fetch = jest.fn(() => respond(200, { success: true, report: null, clientChanges: [] }))
    const w = mount()
    await settle(w)
    global.fetch.mockClear()
    global.fetch.mockImplementation(() => respond(403, { success: false, error: { code: 'NOT_OPEN', message: 'closed' } }))
    await w.vm.saveReport()
    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/client-reports/mine/saved')
    expect(init.method).toBe('PUT')
    expect(w.vm.savedReport.error).toBe('clientReports.saved.notOpen')

    global.fetch.mockImplementation(() => respond(500, { success: false, error: { code: 'DB_ERROR' } }))
    await w.vm.saveReport()
    expect(w.vm.savedReport.error).toBe('clientReports.saved.saveFailed')
  })

  it('the advisor cannot save with no client chosen', async () => {
    window.localStorage.setItem('advisor_e_token', 'tok')
    window.localStorage.setItem('advisor_e_role', 'firm_manager')
    global.fetch = jest.fn()
    const w = mount()
    await settle(w)
    await w.vm.saveReport()
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

describe('savedReport — restore and the badge list', () => {
  it('restore is advisor-only and applies the restored figures', async () => {
    window.localStorage.setItem('advisor_e_token', 'tok')
    window.localStorage.setItem('advisor_e_role', 'business_entity')
    global.fetch = jest.fn(() => respond(200, { success: true, report: null, clientChanges: [] }))
    const client = mount()
    await settle(client)
    global.fetch.mockClear()
    await client.vm.restoreReport()
    expect(global.fetch).not.toHaveBeenCalled()

    window.localStorage.setItem('advisor_e_role', 'firm_manager')
    const edited = { inputs: { sales: 999, markup: 47 }, savedBy: { tier: 'business_entity', name: 'BB' }, savedAt: '2026-09-05T00:00:00.000Z', advisorVersion: ROW }
    global.fetch = jest.fn(() => respond(200, { success: true, report: edited, clientChanges: ['sales'] }))
    const adv = mount()
    await settle(adv)
    adv.vm.onReportClient({ clientId: 'c-1', clientName: 'BB' })
    await settle(adv)
    expect(adv.vm.isClientChanged('sales')).toBe(true)
    expect(adv.vm.isClientChanged('markup')).toBe(false)

    global.fetch.mockClear()
    global.fetch.mockImplementation(() => respond(200, { success: true, report: ROW, clientChanges: [] }))
    await adv.vm.restoreReport()
    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/client-reports/saved/c-1/restore')
    expect(init.method).toBe('POST')
    expect(adv.vm.f.sales).toBe(250)
    expect(adv.vm.isClientChanged('sales')).toBe(false)
  })
})
