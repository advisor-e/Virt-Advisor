/**
 * @jest-environment jsdom
 */
'use strict'
/* eslint-env browser, jest */

/**
 * Component test for pages/index.vue — the static home hero with the five pillar
 * links. Display-only, so this just asserts the links are present and correct.
 */

import { mount, createLocalVue, RouterLinkStub } from '@vue/test-utils'
import Home from '../../components/collaborate/screens/index.vue'

const localVue = createLocalVue()

function factory () {
  return mount(Home, {
    localVue,
    stubs: { 'nuxt-link': RouterLinkStub },
    mocks: { $t: key => key }
  })
}

describe('home page', () => {
  test('renders the hero title', () => {
    expect(factory().text()).toContain('home.title')
  })

  test('links to the five pillars (Connecting replaces Connections + Messages)', () => {
    const links = factory().findAllComponents(RouterLinkStub)
    const targets = links.wrappers.map(w => w.props('to'))
    expect(targets).toEqual([
      '/discover',
      '/connecting',
      '/discover?tab=groups',
      '/marketplace',
      '/profile'
    ])
  })
})
