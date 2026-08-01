/**
 * @jest-environment jsdom
 */
'use strict'
/* eslint-env browser, jest */

/**
 * Component tests for components/AppHeader.vue — the notifications bell.
 *
 * Covers: loading notifications on mount, the unread badge, opening the dropdown
 * and rendering each notification's text via i18n interpolation, "mark all as
 * read" clearing the badge, clicking a notification navigating + closing, and the
 * empty state. fetch, $t, $router, $buefy and $i18n are mocked; nuxt-link is
 * stubbed. The bell degrades quietly when the backend load fails.
 */

import { mount, RouterLinkStub } from '@vue/test-utils'
import AppHeader from '../../components/collaborate/AppHeader.vue'

const NOTIFS = {
  items: [
    { id: 'n-1', userId: 'me', type: 'connection_request', params: { name: 'Anna Richter' }, link: '/connecting', read: false },
    { id: 'n-2', userId: 'me', type: 'message', params: { name: 'Bob Lindt' }, link: '/connecting', read: true }
  ],
  unread: 1
}

// Minimal i18n mock with named interpolation ({name} -> params.name).
const $t = (key, params) => {
  const map = {
    'notif.title': 'Notifications',
    'notif.empty': "You're all caught up",
    'notif.markAllRead': 'Mark all as read',
    'notif.connection_request': '{name} wants to connect',
    'notif.message': 'New message from {name}'
  }
  let s = map[key] || key
  if (params) { Object.keys(params).forEach((k) => { s = s.replace('{' + k + '}', params[k]) }) }
  return s
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

function factory () {
  const push = jest.fn()
  const toast = jest.fn()
  const w = mount(AppHeader, {
    stubs: { 'nuxt-link': RouterLinkStub },
    mocks: {
      $t,
      $i18n: { locale: 'en', messages: { en: {} } },
      $route: { path: '/' },
      $router: { push },
      $buefy: { toast: { open: toast } }
    }
  })
  return { w, push, toast }
}

afterEach(() => { jest.resetAllMocks() })

describe('AppHeader notifications bell', () => {
  test('loads notifications on mount and shows the unread badge', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(NOTIFS) }))
    const { w } = factory()
    await flush(); await w.vm.$nextTick()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/notifications')
    expect(w.vm.unreadCount).toBe(1)
    expect(w.find('.notif-badge').text()).toBe('1')
  })

  test('dropdown is closed until the bell is clicked, then lists interpolated notifications', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(NOTIFS) }))
    const { w } = factory()
    await flush(); await w.vm.$nextTick()
    expect(w.find('.notif-dropdown').exists()).toBe(false)
    await w.find('.notif-toggle').trigger('click')
    expect(w.find('.notif-dropdown').exists()).toBe(true)
    const items = w.findAll('.notif-item')
    expect(items.length).toBe(2)
    expect(items.at(0).text()).toContain('Anna Richter wants to connect')
    expect(items.at(1).text()).toContain('New message from Bob Lindt')
  })

  test('mark all as read posts to the backend and clears the badge', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(NOTIFS) }))
    const { w } = factory()
    await flush(); await w.vm.$nextTick()
    await w.find('.notif-toggle').trigger('click')
    await w.find('.notif-head .button').trigger('click')
    await flush(); await w.vm.$nextTick()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/notifications/read', expect.objectContaining({ method: 'POST' }))
    expect(w.vm.unreadCount).toBe(0)
    expect(w.find('.notif-badge').exists()).toBe(false)
  })

  test('clicking a notification navigates to its link and closes the dropdown', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(NOTIFS) }))
    const { w, push } = factory()
    await flush(); await w.vm.$nextTick()
    await w.find('.notif-toggle').trigger('click')
    await w.findAll('.notif-item').at(0).trigger('click')
    expect(push).toHaveBeenCalledWith('/connecting')
    expect(w.vm.notifOpen).toBe(false)
  })

  test('shows the empty state when there are no notifications', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [], unread: 0 }) }))
    const { w } = factory()
    await flush(); await w.vm.$nextTick()
    await w.find('.notif-toggle').trigger('click')
    expect(w.find('.notif-empty').text()).toBe("You're all caught up")
    expect(w.find('.notif-badge').exists()).toBe(false)
  })

  test('degrades quietly to an empty bell when the load fails', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 502 }))
    const { w } = factory()
    await flush(); await w.vm.$nextTick()
    expect(w.vm.notifications).toEqual([])
    expect(w.vm.unreadCount).toBe(0)
  })
})
