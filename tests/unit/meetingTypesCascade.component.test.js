/**
 * @jest-environment jsdom
 */
'use strict'

// FirmMeetingTypes — slice 3 of design/MEETING-TYPES-CASCADE.md (2026-09-08): the kinds of
// meeting become editable at every manager tier, not the mentor alone.
//
// Per the testing ruling (2026-08-24) nothing here asserts wording or CSS. What UAT cannot
// see, and these tests pin:
//
// - 🔴 THE SECTION OPENS AT ALL FOUR MANAGER TIERS. A firm or group manager who cannot see
//   this section does not see an error — they see a screen that looks complete, because the
//   observation points below it render normally. Slice 2's mentor-only gate failed exactly
//   that way on purpose; a regression to it would fail the same way by accident, and the
//   only signal would be a manager eventually asking why they cannot rename a meeting.
// - the section stays closed until the backend has said who is asking, so a manager is never
//   shown an empty list and an "add" button that a real list then replaces. `tier` is the
//   only thing that can answer that, and it arrives with the data.
//
// It does NOT pin `visible` as a permission check, because it is not one: `tierOfScope`
// returns exactly these four values, so what protects a tier from another's types is the
// backend scoping every route to `req.firmId` (tests/unit/meetingObservations.routes.test.js
// and the guards in server/routes/meetingTypes.js). See the note on `visible` itself.

const FirmMeetingTypes = require('../../components/firm/FirmMeetingTypes.vue').default
const { mountWithBuefy } = require('../helpers/mountComponent')

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

/** The four values server/utils/tierChain.js `tierOfScope` can return. */
const MANAGER_TIERS = ['mentor', 'global_group_manager', 'group_manager', 'firm_manager']

function mountAtTier (tier) {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      tier,
      types: [{ id: 'eoy_meeting', name: 'End of year meeting', treeId: 'eoy_meeting', source: 'inherited' }],
      own: { declines: [], overrides: {}, own: [], order: [] },
      inherited: [{ id: 'eoy_meeting', name: 'End of year meeting' }],
      maxNameLength: 120
    })
  }))
  return mountWithBuefy(FirmMeetingTypes, {
    propsData: { apiToken: 'test-token' },
    mocks: { $buefy: { toast: { open: jest.fn() }, dialog: { confirm: jest.fn() } } }
  })
}

afterEach(() => {
  delete global.fetch
  jest.clearAllMocks()
})

describe('the kinds of meeting cascade to every manager tier', () => {
  MANAGER_TIERS.forEach((tier) => {
    it(`opens at ${tier}`, async () => {
      const wrapper = mountAtTier(tier)
      await flush()
      expect(wrapper.vm.tier).toBe(tier)
      expect(wrapper.vm.visible).toBe(true)
      // The resolved list reached the screen, so the section is usable and not merely present.
      expect(wrapper.vm.types).toHaveLength(1)
    })
  })

  it('stays closed until the backend has said which tier is asking', () => {
    const wrapper = mountAtTier('firm_manager')
    // Before flush: mounted() has fired but load() has not resolved.
    expect(wrapper.vm.tier).toBe('')
    expect(wrapper.vm.visible).toBe(false)
  })

  it('shows the failure rather than an empty space when the load fails', async () => {
    // An HTTP error rather than a rejected fetch, deliberately: `api()` replaces a network
    // rejection with its own connection message (the house error rule), so only this path
    // carries the BACKEND's own words through to the screen — which is what lets this test
    // assert the failure surfaced without pinning any label we wrote.
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ error: { code: 'UNAVAILABLE', message: 'meeting types unavailable' } })
    }))
    const wrapper = mountWithBuefy(FirmMeetingTypes, {
      propsData: { apiToken: 'test-token' },
      mocks: { $buefy: { toast: { open: jest.fn() }, dialog: { confirm: jest.fn() } } }
    })
    await flush()

    // 🔴 THE FAULT THIS PINS (fixed 2026-09-08). `tier` stays empty when the read fails, so
    // a section gated on `visible` alone hid the editor AND the message saying why — a
    // manager saw blank space and had nothing to act on or report. UAT cannot catch it,
    // because a section that renders nothing looks identical to one a tier is not meant to
    // have.
    expect(wrapper.text()).toContain('meeting types unavailable')

    // ...and the editor itself is still not offered, because there is nothing to edit.
    expect(wrapper.vm.visible).toBe(false)
  })
})
