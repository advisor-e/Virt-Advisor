/**
 * @jest-environment jsdom
 */
'use strict'
/* eslint-env browser, jest */

/**
 * Component tests for components/base/PageHelp.vue.
 *
 * Validates the frontend test harness (@vue/test-utils v1 + @vue/vue2-jest, Pug
 * templates, jsdom). PageHelp is display-only: a button that opens a Bulma modal
 * and renders help copy computed from the active i18n locale (with English
 * fallback). $t / $i18n are mocked.
 */

import { mount } from '@vue/test-utils'
import PageHelp from '../../components/collaborate/base/PageHelp.vue'

const $t = key => key

function makeI18n (locale, messages) {
  return {
    locale,
    getLocaleMessage: loc => (loc === 'en' ? messages : (loc === locale ? messages : {}))
  }
}

const EN = { help: { discover: { title: 'Discover help', body: ['Find people', 'Search groups'] } } }

function factory (opts) {
  const o = opts || {}
  return mount(PageHelp, {
    propsData: { helpKey: o.helpKey || 'discover' },
    mocks: { $t, $i18n: o.i18n || makeI18n('en', EN) }
  })
}

describe('PageHelp', () => {
  test('renders the help button and starts with the modal closed', () => {
    const w = factory()
    expect(w.find('.page-help__btn').exists()).toBe(true)
    expect(w.find('.page-help__modal').classes()).not.toContain('is-active')
  })

  test('opens the modal on button click', async () => {
    const w = factory()
    await w.find('.page-help__btn').trigger('click')
    expect(w.vm.open).toBe(true)
    expect(w.find('.page-help__modal').classes()).toContain('is-active')
  })

  test('renders the intro title and each body line from the active locale', async () => {
    const w = factory()
    await w.find('.page-help__btn').trigger('click')
    expect(w.text()).toContain('Discover help')
    const items = w.findAll('.page-help__list li')
    expect(items.length).toBe(2)
    expect(items.at(0).text()).toBe('Find people')
    expect(items.at(1).text()).toBe('Search groups')
  })

  test('close via the footer button hides the modal', async () => {
    const w = factory()
    await w.find('.page-help__btn').trigger('click')
    await w.find('.modal-card-foot .button').trigger('click')
    expect(w.vm.open).toBe(false)
    expect(w.find('.page-help__modal').classes()).not.toContain('is-active')
  })

  test('clicking the background closes the modal', async () => {
    const w = factory()
    await w.find('.page-help__btn').trigger('click')
    await w.find('.modal-background').trigger('click')
    expect(w.vm.open).toBe(false)
  })

  test('falls back to English when the active locale lacks the entry', () => {
    const w = factory({ i18n: makeI18n('fr', EN) }) // fr has no messages; en does
    expect(w.vm.intro).toBe('Discover help')
    expect(w.vm.body).toEqual(['Find people', 'Search groups'])
  })

  test('body is an empty array when there is no help entry at all', () => {
    const w = factory({ helpKey: 'missing', i18n: makeI18n('en', { help: {} }) })
    expect(w.vm.body).toEqual([])
    expect(w.vm.intro).toBe('')
  })

  test('Escape key closes the modal (SSR-safe keydown listener)', async () => {
    const w = factory()
    await w.find('.page-help__btn').trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await w.vm.$nextTick()
    expect(w.vm.open).toBe(false)
  })
})
