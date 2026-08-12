/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * THE NOTICE ACTUALLY REACHES THE SCREEN — and the mentor's screens never see it.
 *
 * tierAwaitingFirms.test.js proves the backend decides the flag correctly, and
 * tierReportFiltering.test.js proves the routes send it. Neither proves a person
 * would SEE anything: a screen can receive `awaitingFirms: true` and still render
 * the blank panel, which is the exact state this whole piece of work exists to
 * remove. That gap is what these tests close.
 *
 * 🔴 THE FALSE-NEGATIVE HALF MATTERS AS MUCH AS THE POSITIVE ONE. Team Progress is
 * live in UAT at firm level today. A "not connected yet" banner appearing there
 * would replace one false statement with another, on a screen that was working
 * correctly, and nothing else in the suite looks at that screen's empty state.
 */

const { mountWithBuefy } = require('../helpers/mountComponent')
const TierNotConnected = require('../../components/base/TierNotConnected.vue').default
const FirmTeamProgress = require('../../components/firm/FirmTeamProgress.vue').default

/** Mount Team Progress with its one network call answered by `payload`. */
function mountTeamProgress (payload) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(Object.assign({ success: true, advisors: [] }, payload))
  })
  return mountWithBuefy(FirmTeamProgress, { propsData: { apiToken: 'test-token' } })
}

/** Let the mounted component's fetch settle before asserting on what it drew. */
const settle = () => new Promise(resolve => setTimeout(resolve, 0))

afterEach(() => { delete global.fetch })

describe('TierNotConnected', () => {
  test('it shows the approved sentence, and only that', () => {
    const wrapper = mountWithBuefy(TierNotConnected)
    // The $t stub returns the key, so this pins WHICH sentence rather than its
    // wording — the wording lives in locales/en.json, copied word for word from the
    // §4 table of design/mockups/tier-hub-pages.html.
    expect(wrapper.text()).toContain('tierNotConnected.firmsNotMapped')
  })

  test('🔴 IT IS NOT STYLED AS AN ERROR', () => {
    // Nothing has failed here — an integration step is outstanding. Dressed in red,
    // a manager reports it as a fault, and the one thing worse than a screen that
    // says nothing is a screen that raises a false alarm.
    const wrapper = mountWithBuefy(TierNotConnected)
    const html = wrapper.html()
    expect(html).toContain('is-info')
    expect(html).not.toContain('is-danger')
    expect(html).not.toContain('is-warning')
  })
})

describe('Team Progress — which empty it draws', () => {
  test('🔴 A FIRM MANAGER NEVER SEES THE NOTICE — they see the real empty state', async () => {
    // awaitingFirms is false for every firm, so this is the live UAT screen,
    // unchanged. Asserted here because this file is the only place that looks at it.
    const wrapper = mountTeamProgress({ awaitingFirms: false })
    await settle()

    expect(wrapper.text()).toContain('firmTeamProgress.empty')
    expect(wrapper.text()).not.toContain('tierNotConnected.firmsNotMapped')
  })

  test('a tier with no firms mapped sees the notice INSTEAD of "no activity"', async () => {
    const wrapper = mountTeamProgress({ awaitingFirms: true })
    await settle()

    expect(wrapper.text()).toContain('tierNotConnected.firmsNotMapped')
    // The point of the change: the misleading sentence is REPLACED, not accompanied.
    // Both on screen at once would still tell a manager their firms are idle.
    expect(wrapper.text()).not.toContain('firmTeamProgress.empty')
  })

  test('a response that omits the flag falls back to the old behaviour', async () => {
    // Every other caller of this route — and any older backend — sends no flag. The
    // screen must read that as "connected", never as "not connected yet".
    const wrapper = mountTeamProgress({})
    await settle()

    expect(wrapper.text()).toContain('firmTeamProgress.empty')
    expect(wrapper.text()).not.toContain('tierNotConnected.firmsNotMapped')
  })

  test('a FAILED load still says it failed, and is never dressed as "not connected"', async () => {
    // Three states now share one screen: unreachable, unconnected, and genuinely
    // empty. The first must survive the arrival of the second — an outage reported
    // as a pending integration is an outage nobody investigates.
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'))
    const wrapper = mountWithBuefy(FirmTeamProgress, { propsData: { apiToken: 'test-token' } })
    await settle()

    expect(wrapper.text()).toContain('firmTeamProgress.loadFailed')
    expect(wrapper.text()).not.toContain('tierNotConnected.firmsNotMapped')
  })
})
