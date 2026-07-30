/**
 * @jest-environment jsdom
 */
'use strict'
/* eslint-env browser, jest */

/**
 * Component tests for components/shared/ToolPicker.vue — the shared Advisor-e
 * tool-catalogue picker (FEAT-TOOLPICKER-EXTRACT), used by the marketplace, the
 * group Shared workspace, and the 1:1 conversation pane. Covers catalogue load
 * (once), client-side filter + cap, and the select / locked / clear events.
 */

import { mount, createLocalVue } from '@vue/test-utils'
import ToolPicker from '../../components/collaborate/shared/ToolPicker.vue'

const localVue = createLocalVue()
const Stub = { render (h) { return h('div', this.$slots.default) } }
localVue.component('b-autocomplete', Stub)

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

const TOOLS = [
  { pageId: 'id-100', title: 'Dashboard Report', subSection: 'Reporting', tags: ['kpi'], purpose: 'Shows KPIs' },
  { pageId: 'id-200', title: 'Cashflow Forecast', subSection: 'Finance', tags: ['cash'], purpose: 'Forecasts cash' }
]

function factory (props, fetchImpl) {
  global.fetch = jest.fn(fetchImpl || (() => Promise.resolve({ ok: true, json: () => Promise.resolve(TOOLS) })))
  return mount(ToolPicker, { localVue, propsData: props || {}, mocks: { $t: k => k } })
}

describe('tool picker', () => {
  afterEach(() => { delete global.fetch })

  test('loads the catalogue on mount', async () => {
    const w = factory()
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/templates')
    expect(w.vm.tools).toHaveLength(2)
  })

  test('a non-OK catalogue response leaves the picker empty', async () => {
    const w = factory({}, () => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) }))
    await flush()
    expect(w.vm.tools).toEqual([])
  })

  test('filteredTools searches by title/section/tags and caps at 40', async () => {
    const w = factory()
    await flush()
    w.vm.query = 'cashflow'
    expect(w.vm.filteredTools).toHaveLength(1)
    expect(w.vm.filteredTools[0].pageId).toBe('id-200')

    w.vm.tools = Array.from({ length: 60 }, (_, i) => ({ pageId: 'id-' + i, title: 'Tool ' + i, tags: [] }))
    w.vm.query = ''
    expect(w.vm.filteredTools).toHaveLength(40)
  })

  test('selecting a tool emits `select` with the catalogue row', async () => {
    const w = factory()
    await flush()
    w.vm.onSelect(TOOLS[0])
    expect(w.emitted().select[0][0]).toEqual(TOOLS[0])
    expect(w.vm.query).toBe('Dashboard Report')
  })

  test('block-locked refuses a locked tool: emits `locked`, no select', async () => {
    const w = factory({ blockLocked: true })
    await flush()
    w.vm.onSelect({ pageId: 'id-lock', title: 'Locked FW', locked: true })
    expect(w.emitted().locked).toBeTruthy()
    expect(w.emitted().select).toBeFalsy()
    expect(w.vm.selected).toBeNull()
  })

  test('without block-locked a locked tool selects normally', async () => {
    const w = factory()
    await flush()
    w.vm.onSelect({ pageId: 'id-lock', title: 'Locked FW', locked: true })
    expect(w.emitted().select).toBeTruthy()
  })

  test('re-typing after a selection emits `clear`', async () => {
    const w = factory()
    await flush()
    w.vm.onSelect(TOOLS[0])
    w.vm.query = 'something else'
    await w.vm.$nextTick()
    expect(w.emitted().clear).toBeTruthy()
    expect(w.vm.selected).toBeNull()
  })

  test('clearing the field (select null) emits `clear`', async () => {
    const w = factory()
    await flush()
    w.vm.onSelect(null)
    expect(w.emitted().clear).toBeTruthy()
  })

  test('reset() blanks the query and selection', async () => {
    const w = factory()
    await flush()
    w.vm.onSelect(TOOLS[0])
    w.vm.reset()
    expect(w.vm.query).toBe('')
    expect(w.vm.selected).toBeNull()
  })
})
