/**
 * @jest-environment jsdom
 */
'use strict'
/* eslint-env browser, jest */

/**
 * Component tests for pages/discover.vue — the two-sided search page (people /
 * groups) with connect, purposeful outreach, and group-invite flows. fetch is
 * URL-aware; $route/$router/$t/$buefy are mocked; Buefy/nuxt/custom tags stubbed.
 * speechMixin runs in mounted() but jsdom has no Speech API, so it stays inert.
 */

import { mount, createLocalVue } from '@vue/test-utils'
import Discover from '../../components/collaborate/screens/discover.vue'

const localVue = createLocalVue()
const Stub = { render (h) { return h('div', this.$slots.default) } }
;['b-tabs', 'b-tab-item', 'b-field', 'b-checkbox', 'b-message', 'b-tag', 'b-modal',
  'b-input', 'b-select', 'b-button', 'page-help', 'nuxt-link'].forEach(n => localVue.component(n, Stub))

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

const PEOPLE = [{ id: 'bob-lindt', name: 'Bob Lindt', title: 'Partner', firm: 'Lindt', city: 'Zürich', country: 'CH', available: true, strengths: ['capital raising'], connectionStatus: 'none' }]
const GROUPS = [{ id: 'seafood', name: 'Seafood Modelling', icon: '🐟', firms: 5, memberCount: 12, summary: 'A group', tags: ['seafood'] }]
const MY_GROUPS = [{ id: 'seafood', name: 'Seafood Modelling', icon: '🐟' }]

// URL-aware fetch: routes each endpoint to a payload. Per-test overrides via `over`.
function mockApi (over) {
  const o = over || {}
  global.fetch = jest.fn((url) => {
    let payload = {}
    if (url.includes('/advisors?')) { payload = PEOPLE } else if (url.includes('/groups?')) { payload = GROUPS } else if (url.includes('/my-groups')) { payload = MY_GROUPS } else if (url.includes('/connect')) { payload = { success: true } } else if (url.includes('/join')) { payload = { success: true } } else if (url.includes('/invite')) { payload = o.invite || { success: true } } else if (url.includes('/outreach')) { payload = { success: true, threadId: 't-1' } }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(payload) })
  })
}

function factory (routeQuery) {
  return mount(Discover, {
    localVue,
    mocks: {
      $t: key => key,
      $route: { query: routeQuery || {} },
      $router: { replace: jest.fn(() => Promise.resolve()), push: jest.fn() },
      $buefy: { toast: { open: jest.fn() } }
    }
  })
}

describe('discover page', () => {
  afterEach(() => { delete global.fetch })

  test('searches people on mount and renders them', async () => {
    mockApi()
    const w = factory()
    await flush(); await w.vm.$nextTick()
    expect(global.fetch.mock.calls[0][0]).toContain('/api/people/advisors?')
    expect(w.vm.people).toHaveLength(1)
    expect(w.text()).toContain('Bob Lindt')
  })

  test('starts on the groups tab when the route asks for it, and searches groups', async () => {
    mockApi()
    const w = factory({ tab: 'groups' })
    await flush(); await w.vm.$nextTick()
    expect(w.vm.tab).toBe('groups')
    expect(global.fetch.mock.calls[0][0]).toContain('/api/people/groups?')
    expect(w.vm.groups).toHaveLength(1)
  })

  test('connect() posts and flips the advisor status to pending_out', async () => {
    mockApi()
    const w = factory()
    await flush()
    const p = { id: 'bob-lindt', connectionStatus: 'none' }
    await w.vm.connect(p)
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/advisors/bob-lindt/connect', expect.objectContaining({ method: 'POST' }))
    expect(p.connectionStatus).toBe('pending_out')
    expect(w.vm.$buefy.toast.open).toHaveBeenCalled()
  })

  test('requestJoin() posts a join request and toasts success', async () => {
    mockApi()
    const w = factory()
    await flush(); global.fetch.mockClear()
    await w.vm.requestJoin({ id: 'seafood' })
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/groups/seafood/join', expect.objectContaining({ method: 'POST' }))
    expect(w.vm.$buefy.toast.open).toHaveBeenCalled()
  })

  test('sendOutreach warns when no reason is given, and does not post', async () => {
    mockApi()
    const w = factory()
    await flush(); global.fetch.mockClear()
    w.vm.outreachTarget = { id: 'bob-lindt' }
    w.vm.outreach = { context: '', ask: '' }
    await w.vm.sendOutreach()
    expect(global.fetch).not.toHaveBeenCalled()
    expect(w.vm.$buefy.toast.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'is-warning' }))
  })

  test('sendOutreach posts, closes the modal and routes to the new thread', async () => {
    mockApi()
    const w = factory()
    await flush()
    w.vm.openOutreach({ id: 'bob-lindt', name: 'Bob' })
    w.vm.outreach = { context: 'Building a model', ask: 'Keen?' }
    await w.vm.sendOutreach()
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/outreach', expect.objectContaining({ method: 'POST' }))
    expect(w.vm.outreachOpen).toBe(false)
    expect(w.vm.$router.push).toHaveBeenCalledWith('/connecting?thread=t-1')
  })

  test('requestJoin records the request and flips the card to pending', async () => {
    mockApi()
    const w = factory()
    await flush()
    const g = { id: 'tax-automation', joinStatus: 'none' }
    await w.vm.requestJoin(g)
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/groups/tax-automation/join', expect.objectContaining({ method: 'POST' }))
    expect(g.joinStatus).toBe('requested')
  })

  test('openInvite loads the viewer groups and preselects the first', async () => {
    mockApi()
    const w = factory()
    await flush()
    await w.vm.openInvite({ id: 'bob-lindt', name: 'Bob' })
    await flush()
    expect(w.vm.myGroups).toHaveLength(1)
    expect(w.vm.invite.groupId).toBe('seafood')
    expect(w.vm.inviteOpen).toBe(true)
  })

  test('sendInvite posts and closes on success', async () => {
    mockApi()
    const w = factory()
    await flush()
    w.vm.inviteTarget = { id: 'bob-lindt' }
    w.vm.invite = { groupId: 'seafood', note: 'join us' }
    await w.vm.sendInvite()
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/groups/seafood/invite', expect.objectContaining({ method: 'POST' }))
    expect(w.vm.inviteOpen).toBe(false)
    expect(w.vm.$buefy.toast.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'is-success' }))
  })

  test('sendInvite surfaces a backend rejection as a warning', async () => {
    mockApi({ invite: { success: false, error: { message: 'Already a member' } } })
    const w = factory()
    await flush()
    w.vm.inviteOpen = true // modal is open
    w.vm.inviteTarget = { id: 'bob-lindt' }
    w.vm.invite = { groupId: 'seafood', note: '' }
    await w.vm.sendInvite()
    await flush()
    expect(w.vm.inviteOpen).toBe(true) // stays open on failure
    expect(w.vm.$buefy.toast.open).toHaveBeenCalledWith(expect.objectContaining({ message: 'Already a member', type: 'is-warning' }))
  })

  test('a non-OK search keeps results safe and toasts instead of adopting an error body', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ success: false }) }))
    const w = factory()
    await flush(); await w.vm.$nextTick()
    expect(w.vm.people).toEqual([])
    expect(w.vm.$buefy.toast.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'is-danger' }))
  })

  test('initials and avatarStyle behave', () => {
    mockApi()
    const { vm } = factory()
    expect(vm.initials('Bob Lindt')).toBe('BL')
    expect(vm.avatarStyle({ id: 'bob-lindt' }).background).toMatch(/linear-gradient/)
  })
})
