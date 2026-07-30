/**
 * @jest-environment jsdom
 */
'use strict'
/* eslint-env browser, jest */

/**
 * Component tests for pages/marketplace.vue — group-owned IP listings with a
 * catalogue-linked create flow (a listing must reference a real Advisor-e tool
 * page ID) and record-only purchases. fetch is method/URL-aware.
 */

import { mount, createLocalVue } from '@vue/test-utils'
import Marketplace from '../../components/collaborate/screens/marketplace.vue'

const localVue = createLocalVue()
const Stub = { render (h) { return h('div', this.$slots.default) } }
;['b-button', 'b-message', 'b-modal', 'b-field', 'b-autocomplete', 'b-input',
  'b-taginput', 'page-help'].forEach(n => localVue.component(n, Stub))
// The shared ToolPicker has its own tests (tests/toolPicker.test.js); stub it here
// so the page tests exercise only the page's own select/locked/clear handlers.
const PickerStub = { render (h) { return h('div') }, methods: { reset () {} } }

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

const LISTINGS = [
  { id: 'm-trucking', title: 'Trucking Model', price: '€450', summary: 'A model', tags: ['valuation'], createdBy: 'Anna', groupName: 'Seafood', owned: false }
]
const TOOLS = [
  { pageId: 'id-100', title: 'Dashboard Report', subSection: 'Reporting', tags: ['kpi'], purpose: 'Shows KPIs' },
  { pageId: 'id-200', title: 'Cashflow Forecast', subSection: 'Finance', tags: ['cash'], purpose: 'Forecasts cash' }
]

function mockApi () {
  global.fetch = jest.fn((url, opts) => {
    let payload = {}
    const isPost = opts && opts.method === 'POST'
    if (url.includes('/purchase')) { payload = { success: true } } else if (url === '/api/templates') { payload = TOOLS } else if (url.endsWith('/marketplace') && isPost) { payload = { id: 'm-new', title: 'New' } } else { payload = LISTINGS }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(payload) })
  })
}

function factory () {
  return mount(Marketplace, {
    localVue,
    stubs: { ToolPicker: PickerStub },
    mocks: { $t: key => key, $buefy: { toast: { open: jest.fn() } } }
  })
}

describe('marketplace page', () => {
  afterEach(() => { delete global.fetch })

  test('loads listings on mount and renders them', async () => {
    mockApi()
    const w = factory()
    await flush(); await w.vm.$nextTick()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/marketplace')
    expect(w.vm.listings).toHaveLength(1)
    expect(w.text()).toContain('Trucking Model')
  })

  test('a non-OK load keeps listings empty and toasts (no crash on an error body)', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ success: false }) }))
    const w = factory()
    await flush(); await w.vm.$nextTick()
    expect(w.vm.loading).toBe(false)
    expect(w.vm.listings).toEqual([])
    expect(w.vm.$buefy.toast.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'is-danger' }))
  })

  test('the My tools filter shows only owned listings, with an Open tool link', async () => {
    const listings = [
      { id: 'm1', title: 'Owned One', price: 'Free', summary: 's', tags: [], createdBy: 'A', groupName: 'G', owned: true, openUrl: 'https://app.advisor-e.com/p/id-1', ipTier: 4 },
      { id: 'm2', title: 'Not Owned', price: 'Free', summary: 's', tags: [], createdBy: 'A', groupName: 'G', owned: false, openUrl: null, ipTier: 4 }
    ]
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(listings) }))
    const w = factory()
    await flush(); await w.vm.$nextTick()
    expect(w.vm.ownedCount).toBe(1)
    expect(w.vm.visibleListings.length).toBe(2)
    // The owned listing renders an "Open tool" deep-link.
    expect(w.find('a[href="https://app.advisor-e.com/p/id-1"]').exists()).toBe(true)

    w.vm.filter = 'mine'
    await w.vm.$nextTick()
    expect(w.vm.visibleListings.length).toBe(1)
    expect(w.vm.visibleListings[0].id).toBe('m1')
  })

  test('buy() records a purchase and marks the listing owned', async () => {
    mockApi()
    const w = factory()
    await flush()
    const l = { id: 'm-trucking', owned: false }
    await w.vm.buy(l)
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/marketplace/m-trucking/purchase', expect.objectContaining({ method: 'POST' }))
    expect(l.owned).toBe(true)
    expect(w.vm.$buefy.toast.open).toHaveBeenCalled()
  })

  test('onToolSelect (from the ToolPicker) fills the form and links the page ID', async () => {
    mockApi()
    const w = factory()
    await flush()
    w.vm.onToolSelect(TOOLS[0])
    expect(w.vm.form.pageId).toBe('id-100')
    expect(w.vm.form.title).toBe('Dashboard Report')
    expect(w.vm.form.summary).toBe('Shows KPIs')
  })

  test('onToolLocked warns that a locked framework cannot be listed', async () => {
    mockApi()
    const w = factory()
    await flush()
    w.vm.onToolLocked()
    expect(w.vm.form.pageId).toBe('')
    expect(w.vm.$buefy.toast.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'is-warning' }))
  })

  test('a group-owned listing shows the IP tier badge', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 'm-1', title: 'Tiered', price: 'Free', summary: 's', tags: [], createdBy: 'A', groupName: 'G', owned: false, ipTier: 4 }]) }))
    const w = factory()
    await flush(); await w.vm.$nextTick()
    expect(w.text()).toContain('market.groupOwned')
  })

  test('create surfaces a locked-framework rejection from the backend', async () => {
    mockApi()
    const w = factory()
    await flush()
    // Backend refuses with an error envelope (no id).
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: false, error: { code: 'LOCKED_IP', message: 'Locked framework' } }) }))
    w.vm.form = { title: 'X', summary: '', tags: [], price: 'Free', pageId: 'id-100' }
    await w.vm.create()
    await flush()
    expect(w.vm.$buefy.toast.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'is-warning' }))
  })

  test('onToolClear drops the linked tool (re-searching in the picker)', async () => {
    mockApi()
    const w = factory()
    await flush()
    w.vm.onToolSelect(TOOLS[0])
    expect(w.vm.form.pageId).toBe('id-100')
    w.vm.onToolClear()
    expect(w.vm.form.pageId).toBe('')
  })

  test('openCreate resets the form and opens the modal', async () => {
    mockApi()
    const w = factory()
    await flush()
    w.vm.form = { title: 'stale', summary: 's', tags: ['x'], price: '€9', pageId: 'id-100' }
    w.vm.openCreate()
    expect(w.vm.createOpen).toBe(true)
    expect(w.vm.form).toEqual({ title: '', summary: '', tags: [], price: 'Free', pageId: '' })
  })

  test('create blocks without a linked tool, then without a title', async () => {
    mockApi()
    const w = factory()
    await flush(); global.fetch.mockClear()

    w.vm.form = { title: 'x', summary: '', tags: [], price: 'Free', pageId: '' }
    await w.vm.create()
    expect(global.fetch).not.toHaveBeenCalled()
    expect(w.vm.$buefy.toast.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'is-warning' }))

    w.vm.form = { title: '   ', summary: '', tags: [], price: 'Free', pageId: 'id-100' }
    await w.vm.create()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('create posts a valid listing and closes + reloads', async () => {
    mockApi()
    const w = factory()
    await flush()
    w.vm.createOpen = true
    w.vm.form = { title: 'My Tool', summary: 's', tags: ['t'], price: 'Free', pageId: 'id-100' }
    await w.vm.create()
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/marketplace', expect.objectContaining({ method: 'POST' }))
    expect(w.vm.createOpen).toBe(false)
    expect(w.vm.$buefy.toast.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'is-success' }))
  })
})
