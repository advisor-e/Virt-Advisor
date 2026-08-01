/**
 * @jest-environment jsdom
 */
'use strict'
/* eslint-env browser, jest */

/**
 * Component tests for pages/groups/_id.vue — the group detail page: loads the
 * group by route id, join request, and the one-click "Open group chat" that
 * opens (or lazily creates) the group room and routes to it in Connecting.
 */

import { mount, createLocalVue } from '@vue/test-utils'
import GroupDetail from '../../components/collaborate/screens/groups/_id.vue'

const localVue = createLocalVue()
const Stub = { render (h) { return h('div', this.$slots.default) } }
;['b-message', 'b-modal', 'b-input', 'b-button', 'b-field', 'b-autocomplete', 'page-help'].forEach(n => localVue.component(n, Stub))
// The shared ToolPicker has its own tests; stub it (with reset) so this page test
// doesn't trigger its catalogue fetch.
const PickerStub = { render (h) { return h('div') }, methods: { reset () {} } }

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

const GROUP = {
  id: 'seafood',
name: 'Seafood Modelling',
icon: '🐟',
createdBy: 'Anna Richter',
  firms: 5,
memberCount: 12,
summary: 'Shared valuation model',
tags: ['seafood', 'valuation'],
  members: [{ id: 'me', name: 'Mike Barnes' }, { id: 'anna-r', name: 'Anna Richter' }]
}

function mockApi (groupOk) {
  global.fetch = jest.fn((url) => {
    let payload = {}
    if (url.includes('/join')) { payload = { success: true } } else if (url.includes('/chat')) { payload = { success: true, threadId: 't-grp' } } else { payload = GROUP }
    return Promise.resolve({ ok: groupOk !== false, json: () => Promise.resolve(payload) })
  })
}

function factory () {
  return mount(GroupDetail, {
    localVue,
    stubs: { ToolPicker: PickerStub },
    mocks: {
      $t: key => key,
      $route: { params: { id: 'seafood' } },
      $router: { push: jest.fn(), back: jest.fn() },
      $buefy: { toast: { open: jest.fn() }, dialog: { confirm: opts => opts.onConfirm() } }
    }
  })
}

describe('group detail page', () => {
  afterEach(() => { delete global.fetch })

  test('loads the group by route id and renders it', async () => {
    mockApi()
    const w = factory()
    await flush(); await w.vm.$nextTick()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/groups/seafood')
    expect(w.vm.loading).toBe(false)
    expect(w.vm.group.name).toBe('Seafood Modelling')
    expect(w.text()).toContain('Seafood Modelling')
    expect(w.text()).toContain('Anna Richter')
  })

  test('shows the not-found state when the group is missing', async () => {
    mockApi(false) // res.ok === false
    const w = factory()
    await flush(); await w.vm.$nextTick()
    expect(w.vm.group).toBeNull()
    expect(w.vm.loading).toBe(false)
  })

  test('join() posts a request and toasts success', async () => {
    mockApi()
    const w = factory()
    await flush(); global.fetch.mockClear()
    await w.vm.join()
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/groups/seafood/join', expect.objectContaining({ method: 'POST' }))
    expect(w.vm.joining).toBe(false)
    expect(w.vm.$buefy.toast.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'is-success' }))
  })

  test('openGroupChat opens the room and routes to it in Connecting', async () => {
    mockApi()
    const w = factory()
    await flush()
    await w.vm.openGroupChat()
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/groups/seafood/chat', expect.objectContaining({ method: 'POST' }))
    expect(w.vm.$router.push).toHaveBeenCalledWith('/connecting?thread=t-grp')
  })

  test('a manager loads pending join requests and can approve one', async () => {
    global.fetch = jest.fn((url) => {
      let payload = {}
      if (url.includes('/group-requests/')) { payload = { success: true, status: 'accepted' } } else if (url.endsWith('/requests')) { payload = { requests: [{ id: 'gjr-1', advisor: { id: 'bob-lindt', name: 'Bob Lindt', firm: 'Lindt' } }] } } else { payload = Object.assign({}, GROUP, { joinStatus: 'member' }) }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(payload) })
    })
    const w = factory()
    await flush(); await w.vm.$nextTick()
    expect(w.vm.joinRequests).toHaveLength(1)
    expect(w.text()).toContain('Bob Lindt')
    await w.vm.respondRequest({ id: 'gjr-1' }, true)
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/group-requests/gjr-1/accept', expect.objectContaining({ method: 'POST' }))
  })

  test('a member can add a tool to the shared workspace via the picker', async () => {
    global.fetch = jest.fn((url) => {
      let payload = {}
      if (url.includes('/shared-pages')) { payload = { success: true, sharedPages: [{ pageId: 'id-x', title: 'Picked Tool', openUrl: 'https://app.advisor-e.com/p/id-x' }] } } else if (url === '/api/templates') { payload = [{ pageId: 'id-x', title: 'Picked Tool', subSection: 'Finance' }] } else if (url.endsWith('/requests')) { payload = { requests: [] } } else { payload = Object.assign({}, GROUP, { joinStatus: 'member', sharedPages: [] }) }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(payload) })
    })
    const w = factory()
    await flush(); await w.vm.$nextTick()
    w.vm.openToolPicker()
    // The ToolPicker emits `select` with the chosen catalogue row.
    w.vm.onToolSelect({ pageId: 'id-x', title: 'Picked Tool' })
    expect(w.vm.selectedTool.pageId).toBe('id-x')
    await w.vm.addTool()
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/groups/seafood/shared-pages', expect.objectContaining({ method: 'POST' }))
    expect(w.vm.group.sharedPages[0].pageId).toBe('id-x')
  })

  test('a member can remove a tool from the shared workspace (confirm then DELETE)', async () => {
    global.fetch = jest.fn((url, opts) => {
      let payload = {}
      if (url.includes('/shared-pages/') && opts && opts.method === 'DELETE') { payload = { success: true, sharedPages: [] } } else if (url.endsWith('/requests')) { payload = { requests: [] } } else { payload = Object.assign({}, GROUP, { joinStatus: 'member', sharedPages: [{ pageId: 'ae-x', title: 'Cashflow Model', openUrl: 'https://app.advisor-e.com/p/ae-x' }] }) }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(payload) })
    })
    const w = factory()
    await flush(); await w.vm.$nextTick()
    expect(w.vm.group.sharedPages).toHaveLength(1)
    await w.vm.removeTool({ pageId: 'ae-x', title: 'Cashflow Model' })
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/groups/seafood/shared-pages/ae-x', expect.objectContaining({ method: 'DELETE' }))
    expect(w.vm.group.sharedPages).toHaveLength(0)
  })

  test('renders the shared workspace links to Advisor-e', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve(Object.assign({}, GROUP, {
        sharedPages: [{ pageId: 'ae-x', title: 'Cashflow Model', openUrl: 'https://app.advisor-e.com/p/ae-x' }]
      }))
    }))
    const w = factory()
    await flush(); await w.vm.$nextTick()
    expect(w.text()).toContain('Cashflow Model')
    expect(w.find('a[href="https://app.advisor-e.com/p/ae-x"]').exists()).toBe(true)
  })

  test('join flips the page to Request Pending', async () => {
    mockApi()
    const w = factory()
    await flush(); await w.vm.$nextTick()
    await w.vm.join()
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/groups/seafood/join', expect.objectContaining({ method: 'POST' }))
    expect(w.vm.group.joinStatus).toBe('requested')
  })

  test('initials and avatarStyle behave', async () => {
    mockApi()
    const w = factory()
    await flush()
    expect(w.vm.initials({ name: 'Anna Richter' })).toBe('AR')
    expect(w.vm.avatarStyle({ id: 'anna-r' }).background).toMatch(/linear-gradient/)
  })
})
