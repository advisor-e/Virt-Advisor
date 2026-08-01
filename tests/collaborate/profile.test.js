/**
 * @jest-environment jsdom
 */
'use strict'
/* eslint-env browser, jest */

/**
 * Component tests for pages/profile.vue — shows the Advisory-owned identity and
 * lets the advisor edit the advertised fields (availability, tags, about), saved
 * via PUT /api/people/me. speechMixin is inert under jsdom (no Speech API).
 */

import { mount, createLocalVue } from '@vue/test-utils'
import Profile from '../../components/collaborate/screens/profile.vue'

const localVue = createLocalVue()
const Stub = { render (h) { return h('div', this.$slots.default) } }
;['b-message', 'b-field', 'b-switch', 'b-taginput', 'b-input', 'b-button', 'page-help'].forEach(n => localVue.component(n, Stub))

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

const ME = {
  name: 'Mike Barnes',
title: 'Partner',
firm: 'Advisor-e',
city: 'Munich',
country: 'DE',
  timezone: 'CET',
email: 'mike@advisor-e.com',
phone: '+49 89 5550',
linkedin: 'https://linkedin.com/in/mb',
  available: true,
blockFirmManagerView: false,
strengths: ['tax'],
industries: ['seafood'],
topics: ['M&A'],
about: 'My bio'
}

function factory () {
  return mount(Profile, {
    localVue,
    mocks: { $t: key => key, $buefy: { toast: { open: jest.fn() } } }
  })
}

describe('profile page', () => {
  afterEach(() => { delete global.fetch })

  test('loads the profile on mount and renders identity', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(ME) }))
    const w = factory()
    await flush(); await w.vm.$nextTick()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/me')
    expect(w.vm.loading).toBe(false)
    expect(w.vm.advisorProfile.name).toBe('Mike Barnes')
    expect(w.text()).toContain('Mike Barnes')
    expect(w.text()).toContain('mike@advisor-e.com')
  })

  test('toasts and stops loading if the profile fails to load', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
    const w = factory()
    await flush(); await w.vm.$nextTick()
    expect(w.vm.loading).toBe(false)
    expect(w.vm.$buefy.toast.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'is-danger' }))
  })

  test('a non-OK load keeps the blank profile and toasts', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ success: false }) }))
    const w = factory()
    await flush(); await w.vm.$nextTick()
    expect(w.vm.loading).toBe(false)
    expect(w.vm.advisorProfile.name).toBe('') // default preserved, form still renders
    expect(w.vm.$buefy.toast.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'is-danger' }))
  })

  test('save() treats a non-OK response as failure (does not adopt an error body)', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(ME) }))
    const w = factory()
    await flush()

    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ success: false }) }))
    await w.vm.save()
    await flush()

    expect(w.vm.saved).toBe(false)
    expect(w.vm.saving).toBe(false)
    expect(w.vm.advisorProfile.name).toBe('Mike Barnes') // kept the loaded identity
    expect(w.vm.$buefy.toast.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'is-danger' }))
  })

  test('save() PUTs only the advertised fields and marks saved', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(ME) }))
    const w = factory()
    await flush()

    w.vm.advisorProfile.available = false
    w.vm.advisorProfile.about = 'Updated bio'
    w.vm.advisorProfile.blockFirmManagerView = true // advisor opts out of manager view
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ ...ME, available: false, about: 'Updated bio', blockFirmManagerView: true }) }))

    await w.vm.save()
    await flush()

    expect(global.fetch).toHaveBeenCalledWith('/api/people/me', expect.objectContaining({ method: 'PUT' }))
    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body).toEqual({
      available: false, blockFirmManagerView: true, strengths: ['tax'], industries: ['seafood'], topics: ['M&A'], about: 'Updated bio'
    })
    expect(body.name).toBeUndefined() // identity is Advisory's, never written back
    expect(w.vm.saved).toBe(true)
    expect(w.vm.saving).toBe(false)
  })

  test('save() toasts and clears the saving flag on failure', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(ME) }))
    const w = factory()
    await flush()

    global.fetch = jest.fn(() => Promise.reject(new Error('down')))
    await w.vm.save()
    await flush()

    expect(w.vm.saving).toBe(false)
    expect(w.vm.saved).toBe(false)
    expect(w.vm.$buefy.toast.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'is-danger' }))
  })
})
