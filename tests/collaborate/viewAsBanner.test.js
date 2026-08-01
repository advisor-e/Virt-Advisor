/**
 * @jest-environment jsdom
 */
'use strict'
/* eslint-env browser, jest */

/**
 * Component tests for components/ViewAsBanner.vue — the persistent bar shown while
 * a firm manager is viewing the app "as" one of their advisers. Reads the state
 * from /api/people/me and exits via DELETE /api/people/firm/view-as.
 */

import { mount, createLocalVue } from '@vue/test-utils'
import ViewAsBanner from '../../components/collaborate/ViewAsBanner.vue'

const localVue = createLocalVue()
const flush = () => new Promise(resolve => setTimeout(resolve, 0))

function factory () {
  return mount(ViewAsBanner, {
    localVue,
    mocks: { $t: (k, p) => (p && p.name ? k + ':' + p.name : k) }
  })
}

describe('ViewAsBanner', () => {
  afterEach(() => { delete global.fetch })

  test('stays hidden when not viewing-as', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'me', viewingAs: null }) }))
    const w = factory()
    await flush(); await w.vm.$nextTick()
    expect(w.vm.viewingAs).toBeNull()
    expect(w.find('.viewas-bar').exists()).toBe(false)
  })

  test('shows the bar with the adviser name when viewing-as', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'priya-nair', viewingAs: { asName: 'Priya Nair', realName: 'Mike Barnes' } }) }))
    const w = factory()
    await flush(); await w.vm.$nextTick()
    expect(w.find('.viewas-bar').exists()).toBe(true)
    expect(w.text()).toContain('Priya Nair')
  })

  test('exit DELETEs the view-as session and reloads to the console', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'priya-nair', viewingAs: { asName: 'Priya Nair' } }) }))
    const w = factory()
    await flush()
    const reload = jest.spyOn(w.vm, 'reloadTo').mockImplementation(() => {})
    await w.vm.exit()
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/firm/view-as', expect.objectContaining({ method: 'DELETE' }))
    expect(reload).toHaveBeenCalledWith('/firm')
  })
})
