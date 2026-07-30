/**
 * @jest-environment jsdom
 */
'use strict'
/* eslint-env browser, jest */

/**
 * Component tests for pages/connecting.vue — the unified "Connecting" inbox
 * (Q-CONN-MSG-IA Option B). Covers merged-row load + tab counts, tab filtering,
 * search, name sort, side-by-side selection into the shared pane, and inline
 * accept/decline of a connection request. fetch is URL-aware; $t/$router/$buefy
 * mocked; <conversation-pane> stubbed.
 */

import { mount, createLocalVue } from '@vue/test-utils'
import Connecting from '../../components/collaborate/screens/connecting.vue'

const localVue = createLocalVue()
const Stub = { render (h) { return h('div', this.$slots.default) } }
;['b-message', 'b-input', 'b-button', 'page-help', 'conversation-pane'].forEach(n => localVue.component(n, Stub))

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

const ROWS = {
  rows: [
    { type: 'chat', rowKey: 'thread:t-bob', threadId: 't-bob', advisorId: 'bob-lindt', name: 'Bob Lindt', subtitle: 'Gerne!' },
    { type: 'group', rowKey: 'thread:t-grp', threadId: 't-grp', groupId: 'seafood', name: 'Seafood', subtitle: 'Welcome', icon: '🐟' },
    { type: 'group', rowKey: 'group:tax', threadId: null, groupId: 'tax', name: 'Tax Lab', subtitle: '', icon: '🧮' },
    { type: 'connection', rowKey: 'conn:c-sara', connectionId: 'c-sara', advisorId: 'sara', name: 'Sara Okafor', firm: 'Okafor Advisory' },
    { type: 'request-incoming', rowKey: 'conn:c-anna', connectionId: 'c-anna', advisorId: 'anna', name: 'Anna Richter', firm: 'BDO' },
    { type: 'invitation', rowKey: 'thread:t-inv', threadId: 't-inv', groupId: 'hosp', name: 'Hospitality', subtitle: 'Join us' }
  ]
}

function mockApi () {
  global.fetch = jest.fn((url) => {
    let payload = {}
    if (url.includes('/thread')) { payload = { success: true, threadId: 't-new' } } else if (url === '/api/people/connecting') { payload = ROWS }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(payload) })
  })
}

function factory () {
  const push = jest.fn()
  const w = mount(Connecting, {
    localVue,
    mocks: {
      $t: key => key,
      $route: { query: {} },
      $router: { push },
      $buefy: { toast: { open: jest.fn() } }
    }
  })
  return { w, push }
}

describe('connecting page', () => {
  afterEach(() => { delete global.fetch })

  test('loads merged rows and computes tab counts (requests = invites + connection requests)', async () => {
    mockApi()
    const { w } = factory()
    await flush(); await w.vm.$nextTick()
    expect(w.vm.rows).toHaveLength(6)
    const counts = {}
    w.vm.tabs.forEach((t) => { counts[t.key] = t.count })
    expect(counts).toEqual({ all: 6, chats: 1, groups: 2, connections: 1, requests: 2 })
  })

  test('the active tab filters the visible rows', async () => {
    mockApi()
    const { w } = factory()
    await flush()
    w.vm.tab = 'groups'
    await w.vm.$nextTick()
    expect(w.vm.visibleRows.map(r => r.name).sort()).toEqual(['Seafood', 'Tax Lab'])
  })

  test('search narrows across name, firm and last message', async () => {
    mockApi()
    const { w } = factory()
    await flush()
    w.vm.search = 'okafor' // matches Sara's firm
    await w.vm.$nextTick()
    expect(w.vm.visibleRows).toHaveLength(1)
    expect(w.vm.visibleRows[0].name).toBe('Sara Okafor')
  })

  test('sort=name orders rows alphabetically', async () => {
    mockApi()
    const { w } = factory()
    await flush()
    w.vm.sort = 'name'
    await w.vm.$nextTick()
    const names = w.vm.visibleRows.map(r => r.name)
    expect(names).toEqual(names.slice().sort((a, b) => a.localeCompare(b)))
  })

  test('openRow: a row with a thread selects it into the side-by-side pane', async () => {
    mockApi()
    const { w, push } = factory()
    await flush()
    await w.vm.openRow({ type: 'chat', threadId: 't-bob' })
    expect(w.vm.selectedThreadId).toBe('t-bob')
    expect(push).not.toHaveBeenCalled()
  })

  test('openRow: a threadless group opens the group page', async () => {
    mockApi()
    const { w, push } = factory()
    await flush()
    await w.vm.openRow({ type: 'group', threadId: null, groupId: 'tax' })
    expect(push).toHaveBeenCalledWith('/groups/tax')
  })

  test('openRow: a group WITH an existing chat also opens the group page (consistent, not the inline chat)', async () => {
    mockApi()
    const { w, push } = factory()
    await flush()
    await w.vm.openRow({ type: 'group', threadId: 't-grp', groupId: 'seafood' })
    expect(push).toHaveBeenCalledWith('/groups/seafood')
    expect(w.vm.selectedThreadId).toBeNull()
  })

  test('openRow: a connection with no thread creates one then shows it in the pane', async () => {
    mockApi()
    const { w } = factory()
    await flush()
    await w.vm.openRow({ type: 'connection', advisorId: 'sara' })
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/advisors/sara/thread', expect.objectContaining({ method: 'POST' }))
    expect(w.vm.selectedThreadId).toBe('t-new')
  })

  test('openRow: an incoming request is a no-op (its inline buttons handle it)', async () => {
    mockApi()
    const { w, push } = factory()
    await flush()
    await w.vm.openRow({ type: 'request-incoming', connectionId: 'c-anna' })
    expect(w.vm.selectedThreadId).toBeNull()
    expect(push).not.toHaveBeenCalled()
  })

  test('a group-request row falls under Requests, reads "Request Pending", and opens the group page', async () => {
    mockApi()
    const { w, push } = factory()
    await flush()
    const r = { type: 'group-request', rowKey: 'gjr:tax', groupId: 'tax-automation', name: 'Tax Automation Lab', icon: '🧮' }
    expect(w.vm.tabOf('group-request')).toBe('requests')
    expect(w.vm.rowSubtitle(r)).toBe('connecting.requestPending') // $t stub echoes the key
    await w.vm.openRow(r)
    expect(push).toHaveBeenCalledWith('/groups/tax-automation')
  })

  test('respondRequest: accepting posts to the connection accept route and reloads', async () => {
    mockApi()
    const { w } = factory()
    await flush()
    await w.vm.respondRequest({ connectionId: 'c-anna' }, true)
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/connections/c-anna/accept', expect.objectContaining({ method: 'POST' }))
    expect(w.vm.$buefy.toast.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'is-success' }))
  })
})
