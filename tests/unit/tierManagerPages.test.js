/**
 * @jest-environment jsdom
 */
'use strict'
/* eslint-env browser, jest */

/**
 * THE TWO NEW HUB PAGES — /global-group-manager and /group-manager.
 *
 * Built from design/mockups/tier-hub-pages.html, approved by Mike 2026-08-10.
 *
 * These pages CANNOT be opened by the people they are for. Advisor-e issues no
 * role for either tier, so their role lists are deliberately empty and nobody
 * signs in (artefact §6, written before the build rather than discovered after
 * it). That makes a test the only demonstration there is, and it is what these
 * assertions are for:
 *
 *   1. the pages exist and their Pug compiles at all;
 *   2. they render the shared hub at the RIGHT scope — the whole design is one
 *      screen re-scoped, so passing the wrong string would silently produce a
 *      Firm Manager Hub at a group manager's address;
 *   3. they FAIL CLOSED for a signed-in user, with a message that distinguishes
 *      "not connected yet" from "wrong person".
 *
 * The hub itself is stubbed. What it shows at each scope is TAB_TIERS' business
 * and is pinned by tests/unit/hubTabTiers.test.js; mounting it for real here would
 * fire every child component's API calls and prove nothing these pages own.
 */

import { shallowMount } from '@vue/test-utils'
import GlobalGroupManagerPage from '../../pages/global-group-manager.vue'
import GroupManagerPage from '../../pages/group-manager.vue'

// The hub is stubbed by shallowMount; this records the props it was handed.
const HubStub = {
  name: 'FirmManagerHub',
  props: ['scope', 'firmId', 'userEmail', 'apiToken', 'userRole'],
  render: h => h('div', { attrs: { 'data-hub': 'stub' } })
}

/**
 * Mount a page and let it settle.
 *
 * The await is load-bearing, not ceremony: both pages render a loading spinner
 * first and decide authorisation in `mounted()`, so the first synchronous render
 * shows neither the hub nor the refusal message. Asserting before the tick tests
 * the spinner.
 */
async function mountPage (Page, { hostname }) {
  // jsdom's window.location is not writable; replacing it wholesale is the
  // standard way to drive a hostname branch.
  delete window.location
  window.location = { hostname }

  const wrapper = shallowMount(Page, {
    stubs: { FirmManagerHub: HubStub, 'b-loading': true }
  })
  await wrapper.vm.$nextTick()
  return wrapper
}

const PAGES = [
  {
    name: 'Global Group Manager Hub',
    Page: GlobalGroupManagerPage,
    scope: 'global',
    devToken: 'dev-local-global',
    restricted: 'This hub is for global group managers.'
  },
  {
    name: 'Group Manager Hub',
    Page: GroupManagerPage,
    scope: 'group',
    devToken: 'dev-local-group',
    restricted: 'This hub is for group managers.'
  }
]

describe.each(PAGES)('$name', ({ Page, scope, devToken, restricted }) => {
  afterEach(() => {
    window.localStorage.clear()
  })

  test('renders the shared hub at its own scope on localhost', async () => {
    const wrapper = await mountPage(Page, { hostname: 'localhost' })
    const hub = wrapper.findComponent(HubStub)

    expect(hub.exists()).toBe(true)
    expect(hub.props('scope')).toBe(scope)
  })

  test('passes the dev token that resolves this tier\'s storage scope', async () => {
    // The counterpart to the dev bypasses in server/middleware/firmAuth.js. If
    // these two strings drift apart, the page authorises locally and every save
    // it makes lands under whatever scope the backend resolves instead — which is
    // the exact failure the mentor's hub ran with for weeks.
    const wrapper = await mountPage(Page, { hostname: 'localhost' })
    expect(wrapper.findComponent(HubStub).props('apiToken')).toBe(devToken)
  })

  test('sends no firm id — a managing tier is not a firm', async () => {
    const wrapper = await mountPage(Page, { hostname: 'localhost' })
    expect(wrapper.findComponent(HubStub).props('firmId')).toBe('')
  })

  test('FAILS CLOSED off localhost, even holding a valid-looking admin token', async () => {
    window.localStorage.setItem('advisor_e_token', 'a-real-looking-token')
    window.localStorage.setItem('advisor_e_role', 'platform_admin')

    const wrapper = await mountPage(Page, { hostname: 'app.advisor-e.com' })

    expect(wrapper.findComponent(HubStub).exists()).toBe(false)
    expect(wrapper.text()).toContain('This level is not connected yet.')
  })

  test('a firm manager\'s token does not open a tier hub either', async () => {
    window.localStorage.setItem('advisor_e_token', 'a-real-looking-token')
    window.localStorage.setItem('advisor_e_role', 'firm_manager')

    const wrapper = await mountPage(Page, { hostname: 'app.advisor-e.com' })
    expect(wrapper.findComponent(HubStub).exists()).toBe(false)
  })

  test('says "not connected yet", NOT "access restricted", while the role is unissued', async () => {
    // The distinction is the point. Telling a manager they are unauthorised sends
    // them to an administrator who can do nothing; telling them the level is not
    // connected is the truth and names who can fix it.
    const wrapper = await mountPage(Page, { hostname: 'app.advisor-e.com' })

    expect(wrapper.text()).toContain('Your Advisor-e administrator will enable it.')
    expect(wrapper.text()).not.toContain('Access Restricted')
    expect(wrapper.text()).not.toContain(restricted)
  })
})

describe('the two pages are distinct hubs, not one copied twice', () => {
  test('they render different scopes and carry different dev tokens', async () => {
    const a = await mountPage(GlobalGroupManagerPage, { hostname: 'localhost' })
    const b = await mountPage(GroupManagerPage, { hostname: 'localhost' })

    expect(a.findComponent(HubStub).props('scope'))
      .not.toBe(b.findComponent(HubStub).props('scope'))
    expect(a.findComponent(HubStub).props('apiToken'))
      .not.toBe(b.findComponent(HubStub).props('apiToken'))
  })
})
