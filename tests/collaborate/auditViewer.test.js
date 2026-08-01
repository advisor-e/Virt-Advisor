/**
 * @jest-environment jsdom
 */
'use strict'
/* eslint-env browser, jest */

/**
 * Component tests for components/shared/AuditViewer.vue — the admin/compliance
 * audit-log viewer (FEAT-AUDIT-UI). pages/audit.vue is a thin preview wrapper.
 * Loads the trail, renders rows (incl. a security-event reason tag), and narrows
 * by free-text search + the action dropdown.
 */

import { mount, createLocalVue } from '@vue/test-utils'
import AuditViewer from '../../components/collaborate/shared/AuditViewer.vue'

const localVue = createLocalVue()
const Stub = { render (h) { return h('div', this.$slots.default) } }
;['b-message', 'b-input', 'b-select'].forEach(n => localVue.component(n, Stub))

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

// Server returns newest-first + enriched with actorName.
const ENTRIES = [
  { id: 'a-3', at: '2026-07-07T10:00:00.000Z', actorName: 'Mike Barnes', actorId: 'me', action: 'purchase.record', targetType: 'listing', targetId: 'm-trucking', meta: {} },
  { id: 'a-2', at: '2026-07-07T09:00:00.000Z', actorName: 'Bob Lindt', actorId: 'bob-lindt', action: 'outreach.blocked', targetType: 'advisor', targetId: 'me', meta: { reason: 'cross_org' } },
  { id: 'a-1', at: '2026-07-07T08:00:00.000Z', actorName: 'Anna Richter', actorId: 'anna-r', action: 'group.create', targetType: 'group', targetId: 'seafood-modelling', meta: {} }
]

function factory (propsData) {
  return mount(AuditViewer, {
    localVue,
    propsData: propsData || {},
    mocks: { $t: (k, p) => (p ? k + ':' + JSON.stringify(p) : k) }
  })
}

describe('audit viewer', () => {
  afterEach(() => { delete global.fetch })

  test('loads and renders entries (a large trail scrolls; capped fetch)', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ entries: ENTRIES }) }))
    const w = factory()
    await flush(); await w.vm.$nextTick()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/audit?limit=200')
    expect(w.vm.filtered).toHaveLength(3)
    expect(w.text()).toContain('Anna Richter')
    expect(w.text()).toContain('cross_org') // security-event reason tag
  })

  test('free-text search narrows by person / action / target', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ entries: ENTRIES }) }))
    const w = factory()
    await flush()
    w.vm.search = 'anna'
    expect(w.vm.filtered.map(e => e.id)).toEqual(['a-1'])
    w.vm.search = 'outreach'
    expect(w.vm.filtered.map(e => e.id)).toEqual(['a-2'])
    w.vm.search = 'm-trucking' // matches by target
    expect(w.vm.filtered.map(e => e.id)).toEqual(['a-3'])
    w.vm.search = 'zzz'
    expect(w.vm.filtered).toHaveLength(0)
  })

  test('action dropdown filters to one action; options are distinct + sorted', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ entries: ENTRIES }) }))
    const w = factory()
    await flush()
    expect(w.vm.actionOptions).toEqual(['group.create', 'outreach.blocked', 'purchase.record'])
    w.vm.actionFilter = 'group.create'
    expect(w.vm.filtered.map(e => e.id)).toEqual(['a-1'])
  })

  test('a failed load shows the error state', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }))
    const w = factory()
    await flush(); await w.vm.$nextTick()
    expect(w.vm.failed).toBe(true)
  })

  test('falls back to the dev preview route when the real endpoint is refused', async () => {
    // Real endpoint 403 (dev user isn't a Mentor) → fall back to /preview → show ribbon.
    global.fetch = jest.fn((url) => {
      if (url.startsWith('/api/people/audit/preview')) { return Promise.resolve({ ok: true, json: () => Promise.resolve({ entries: ENTRIES }) }) }
      return Promise.resolve({ ok: false, status: 403, json: () => Promise.resolve({}) })
    })
    const w = factory({ endpoint: '/api/people/audit', fallbackEndpoint: '/api/people/audit/preview' })
    await flush(); await w.vm.$nextTick()
    expect(w.vm.usedFallback).toBe(true)
    expect(w.vm.filtered).toHaveLength(3)
    expect(w.vm.failed).toBe(false)
  })

  test('no fallback when the real endpoint succeeds (production Mentor)', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ entries: ENTRIES }) }))
    const w = factory({ endpoint: '/api/people/audit', fallbackEndpoint: '/api/people/audit/preview' })
    await flush(); await w.vm.$nextTick()
    expect(w.vm.usedFallback).toBe(false)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  test('empty trail + helper formatting', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ entries: [] }) }))
    const w = factory()
    await flush(); await w.vm.$nextTick()
    expect(w.vm.entries).toHaveLength(0)
    expect(w.vm.detailOf({})).toBe('—')
    expect(w.vm.humanize('group.shared_page_added')).toBe('group shared page added')
    expect(w.vm.formatWhen('')).toBe('')
    expect(typeof w.vm.formatWhen('2026-07-07T08:00:00.000Z')).toBe('string')
  })
})
