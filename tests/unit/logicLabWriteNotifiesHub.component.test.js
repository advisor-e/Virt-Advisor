/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmDecisionLogic = require('~/components/firm/FirmDecisionLogic.vue').default
const DecisionLogicDiagnostic = require('~/components/firm/DecisionLogicDiagnostic.vue').default

/**
 * THE GAP BETWEEN TWO SCREENS — the defect Mike found on 2026-08-03, minutes
 * after a green suite of 4,385 tests.
 *
 * He ran a diagnosis, pressed the attach button, switched to the Advisory
 * Distinctions tab, and his change was not there. It HAD saved: the override, the
 * drift baseline and the accepted-idea log were all correct on the server. The
 * Distinctions tab simply loads its list once when the hub mounts, and refetches
 * only after a write the hub itself made — and this write comes from two
 * components below it, which said nothing.
 *
 * WHY EVERY EXISTING TEST PASSED THROUGH IT. The diagnostic's own tests mount the
 * diagnostic alone, and `firmDecisionLogic.component.test.js` mounts the page with
 * `stubs: { 'decision-logic-diagnostic': true }`. Both halves were correct and
 * fully covered. Nothing mounted them TOGETHER, so nothing could observe that the
 * event never left the building. That is the same shape as the five defects of
 * 2026-08-03: the assertions pinned what each part was asked to do, and no test
 * asked whether the parts talked to each other.
 *
 * So this file deliberately mounts the real child inside the real parent and
 * follows one event the whole way. It is about the JOIN, not either component.
 */

const SUMMARY = {
  levers: {
    schemaVersion: 1,
    domainSupport: { documents: 29, firmEdited: 4 },
    logicTables: { tables: 42, withTemplateHints: 37, firmEdited: 2, boost: 3 },
    distinctions: { count: 67, firmAuthored: 12, boost: 5 },
    quizBanks: { banks: 62, questions: 652 },
    measured: {
      basis: 'scenario-lab',
      caseCount: 51,
      measuredOn: '2026-08-02',
      turnedOnTablesAlone: 3,
      turnedOnDistinctionsAlone: 29,
      averageTopTwoMargin: 3.0
    }
  },
  nearMisses: {
    rows: [{
      id: 7,
      source: 'firm-own',
      description: 'Owner cannot let go',
      filedDomain: 'succession',
      matchedDomain: 'staff',
      count: 3,
      triggers: ['wont let go'],
      templates: ['Succession Plan'],
      boost: 5
    }],
    basisCaseCount: 12,
    tracedCaseCount: 10,
    staleDropped: 0
  },
  domains: [
    { id: 'succession', label: 'Succession & Exit Planning' },
    { id: 'staff', label: 'Staff & Team' }
  ]
}

/** The page with its REAL diagnostic child — the whole point of this file. */
async function mountPageForReal () {
  const wrapper = mountWithBuefy(FirmDecisionLogic, {
    propsData: { apiToken: 'test-token' }
  })
  wrapper.setMethods({ api: jest.fn().mockResolvedValue(SUMMARY) })
  await wrapper.vm.load()
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('a Logic-Lab write reaches the Advisory Distinctions tab', () => {
  it('carries a delivered template all the way up to the hub’s listener', async () => {
    const wrapper = await mountPageForReal()

    const child = wrapper.findComponent(DecisionLogicDiagnostic)
    expect(child.exists()).toBe(true)

    child.setMethods({
      api: jest.fn().mockResolvedValue({
        delivered: true,
        mode: 'create',
        domain: 'governance',
        boost: 10,
        templateTitle: 'Governance Introduction',
        score: 11
      })
    })

    await child.vm.deliver('Governance Introduction')
    await wrapper.vm.$nextTick()

    // The child raised it...
    expect(child.emitted('distinctions-changed')).toBeTruthy()
    // ...and the page passed it on. Without this second assertion the event
    // could stop one component short and the tab would still go stale.
    expect(wrapper.emitted('distinctions-changed')).toBeTruthy()
  })

  it('says nothing when nothing was delivered — a stale tab beats a false refresh', async () => {
    const wrapper = await mountPageForReal()
    const child = wrapper.findComponent(DecisionLogicDiagnostic)
    // The server checked, could not deliver, and put the configuration back.
    child.setMethods({ api: jest.fn().mockResolvedValue({ delivered: false, topTemplate: 'x', reverted: true }) })

    await child.vm.deliver('Governance Introduction')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('distinctions-changed')).toBeFalsy()
  })

  it('carries a near-miss Move the same way', async () => {
    // Move and Copy shipped on 2026-08-03 with the identical defect, found by
    // this investigation rather than by anyone using them.
    const wrapper = await mountPageForReal()
    wrapper.setMethods({ api: jest.fn().mockResolvedValue({ updated: true }) })

    await wrapper.vm.runAction(
      SUMMARY.nearMisses.rows[0],
      { method: 'PUT', path: '/api/firm-manager/distinctions/7', body: { domain: 'staff' } },
      'moved'
    )
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('distinctions-changed')).toBeTruthy()
  })

  it('and the HUB is listening for it — the hop that was actually broken', async () => {
    // The two assertions above prove the event leaves the Logic-Lab page. This
    // one proves something is there to catch it: on 2026-08-03 the page raised
    // nothing and the hub bound nothing, and either half alone still leaves the
    // Advisory Distinctions tab showing what it fetched on mount.
    const FirmManagerHub = require('~/components/FirmManagerHub.vue').default
    const prevFetch = global.fetch
    // The hub loads five things on mount; none of them matter here, and a
    // rejecting fetch is closer to honest than a fake success payload.
    global.fetch = jest.fn().mockRejectedValue(new Error('no network in test'))
    try {
      const hub = mountWithBuefy(FirmManagerHub, {
        propsData: { apiToken: 'test-token' },
        stubs: { 'firm-decision-logic': true, FirmDecisionLogic: true }
      })
      const page = hub.findComponent(FirmDecisionLogic)
      expect(page.exists()).toBe(true)

      // Asserted on the FETCH, not on the method: the template captured
      // `loadFirmDistinctions` when it rendered, so swapping the method
      // afterwards would test nothing that ships. What matters is that the tab
      // goes back to the server — being told what changed is exactly how a
      // screen ends up holding a version the store does not have.
      const api = jest.fn().mockResolvedValue({ ownRows: [], declinedIds: [], overrides: {} })
      hub.setMethods({ api })

      page.vm.$emit('distinctions-changed')
      await hub.vm.$nextTick()

      expect(api).toHaveBeenCalledWith('GET', '/api/firm-manager/distinctions/state')
    } finally {
      global.fetch = prevFetch
    }
  })

  it('says nothing when a near-miss action failed', async () => {
    const wrapper = await mountPageForReal()
    wrapper.setMethods({ api: jest.fn().mockRejectedValue(new Error('nope')) })

    await wrapper.vm.runAction(
      SUMMARY.nearMisses.rows[0],
      { method: 'PUT', path: '/api/firm-manager/distinctions/7', body: { domain: 'staff' } },
      'moved'
    )
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('distinctions-changed')).toBeFalsy()
  })
})
