/**
 * @jest-environment jsdom
 */
'use strict'
/* eslint-env browser, jest */

/**
 * Component tests for pages/groups/new.vue — the create-group form.
 */

import { mount, createLocalVue } from '@vue/test-utils'
import GroupNew from '../../components/collaborate/screens/groups/new.vue'

const localVue = createLocalVue()
const Stub = { render (h) { return h('div', this.$slots.default) } }
;['b-field', 'b-input', 'b-taginput', 'b-select', 'b-button', 'page-help', 'nuxt-link'].forEach(n => localVue.component(n, Stub))

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

function factory () {
  return mount(GroupNew, {
    localVue,
    mocks: {
      $t: key => key,
      $router: { push: jest.fn(), back: jest.fn() },
      $buefy: { toast: { open: jest.fn() } }
    }
  })
}

describe('create-group page', () => {
  afterEach(() => { delete global.fetch })

  test('blocks creation without a name', async () => {
    global.fetch = jest.fn()
    const w = factory()
    w.vm.form.name = '   '
    await w.vm.create()
    expect(global.fetch).not.toHaveBeenCalled()
    expect(w.vm.$buefy.toast.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'is-warning' }))
  })

  test('creates a group and routes to it', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'coastal-4', name: 'Coastal' }) }))
    const w = factory()
    w.vm.form = { name: 'Coastal', icon: '🌊', summary: 's', tags: ['cash'], visibility: 'listed' }
    await w.vm.create()
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/groups', expect.objectContaining({ method: 'POST' }))
    expect(w.vm.$router.push).toHaveBeenCalledWith('/groups/coastal-4')
    expect(w.vm.saving).toBe(false)
  })

  test('toasts and resets saving on failure', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('down')))
    const w = factory()
    w.vm.form.name = 'Coastal'
    await w.vm.create()
    await flush()
    expect(w.vm.saving).toBe(false)
    expect(w.vm.$buefy.toast.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'is-danger' }))
  })
})
