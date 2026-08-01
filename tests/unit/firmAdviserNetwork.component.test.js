/**
 * @jest-environment jsdom
 */
'use strict'

// The Adviser Network tab — Collaborate's manager console, rendered inside the
// Firm Manager Hub (COLLABORATE-MERGE-PLAN.md slice 4).
//
// WHY THIS FILE EXISTS. This tab is not our own screen: it is another application's
// page reframed to sit beside Domain Support. Two things can go wrong that no
// backend test can see, and both look fine in a passing suite:
//
//   1. The page chrome comes with it — a second banner and page frame inside a tab
//      that already has both, so the Hub reads as two applications bolted together.
//   2. View-as survives the move. It sets a cookie and reloads to '/', and the
//      banner offering the way back lives in a layout that never came across — so
//      a manager would land in a colleague's session with no sign of it and no exit.
//
// These tests pin both, and that the console is asked for the manager's REAL
// endpoint rather than one of Collaborate's dev preview endpoints.

const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmAdviserNetwork = require('../../components/firm/FirmAdviserNetwork.vue').default

const CONSOLE_PAYLOAD = {
  success: true,
  scope: { tier: 'firm_manager' },
  firm: 'Acme Advisory',
  stats: { advisers: 2, groups: 1, pendingApprovals: 1 },
  crossOrg: { own: 'closed', effective: 'closed', ceiling: null, cappedBy: null },
  advisers: [
    { id: 'a1', name: 'Dana Fox', title: 'Partner', available: true, groupCount: 2, lastActive: 'today', isMe: false, blocked: false },
    { id: 'a2', name: 'Sam Reed', title: 'Adviser', available: false, groupCount: 0, lastActive: 'last week', isMe: false, blocked: false }
  ],
  approvals: [],
  activity: []
}

function mountTab () {
  return mountWithBuefy(FirmAdviserNetwork)
}

/** Resolve the fetches the console fires on mount, then let the DOM settle. */
async function settle (wrapper) {
  await new Promise(resolve => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()
}

beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve(CONSOLE_PAYLOAD)
  }))
})

afterEach(() => { delete global.fetch })

describe('Adviser Network tab', () => {
  test('reads the real role-gated console endpoint, not a dev preview', async () => {
    // Collaborate ships preview endpoints for its show-home pages. Pointing the
    // live tab at one would show a manager fabricated demo advisers as if they
    // were their own firm's people.
    const wrapper = mountTab()
    await settle(wrapper)

    const urls = global.fetch.mock.calls.map(call => call[0])
    expect(urls).toContain('/api/people/firm')
    urls.forEach(url => expect(url).not.toContain('/preview/'))
  })

  test('renders the console WITHOUT its own page frame or banner', async () => {
    // The Hub already provides both. Two banners is the "different application"
    // look that slice 4 exists to avoid.
    const wrapper = mountTab()
    await settle(wrapper)

    expect(wrapper.find('.mc-embedded').exists()).toBe(true)
    expect(wrapper.find('.section-banner').exists()).toBe(false)
    expect(wrapper.find('.container').exists()).toBe(false)
  })

  test('does NOT offer View as — there is no way back from it in this app', async () => {
    const wrapper = mountTab()
    await settle(wrapper)

    expect(wrapper.text()).toContain('Dana Fox') // the table really did render
    expect(wrapper.text()).not.toContain('firm.viewAs')
    expect(wrapper.text()).not.toContain('firm.colAction')
  })

  test('still shows the adviser table and the cross-firm control', async () => {
    // The point of the tab. If the reframing above ever strips these, the tab is
    // decoration.
    const wrapper = mountTab()
    await settle(wrapper)

    expect(wrapper.text()).toContain('Sam Reed')
    expect(wrapper.text()).toContain('firm.collabTitle')
    expect(wrapper.findAll('tbody tr').length).toBe(2)
  })

  test('shows the tab lede so the screen explains itself', async () => {
    const wrapper = mountTab()
    await settle(wrapper)

    expect(wrapper.text()).toContain('firmAdviserNetwork.lede')
  })
})
