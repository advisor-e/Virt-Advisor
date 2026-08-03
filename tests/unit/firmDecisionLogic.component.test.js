/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmDecisionLogic = require('~/components/firm/FirmDecisionLogic.vue').default

/**
 * Decision Logic — the Firm Manager Hub tab named "Logic-Lab".
 * Spec: design/mockups/decision-logic-map-mockup.html (approved 2026-08-02).
 *
 * What is worth testing is not "does it render" but the claims that would
 * quietly mislead a firm manager if they broke:
 *
 *   1. Every count on the page is the FIRM'S live number. A card showing the
 *      platform default while the firm's own work is missing is the exact
 *      failure the accuracy ruling was made about.
 *   2. "None found" and "nothing to look at" must never read alike. A near-miss
 *      section that shows nothing without saying what it read implies a clean
 *      bill of health it has not earned.
 *   3. The near-miss actions must ASK before writing. They change the firm's
 *      live distinction configuration, on a page whose lede says nothing here
 *      changes anything.
 *   4. Numbers must be read from the payload, never from a constant in the
 *      component — a second copy of "+3" is free to disagree with the engine.
 *
 * `$t()` returns the KEY (tests/helpers/mountComponent), so assertions pin WHICH
 * message shows and with which numbers, never its English — the wording is
 * Mike's to change.
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
    rows: [
      {
        id: 7,
        source: 'firm-own',
        description: 'Owner cannot let go',
        filedDomain: 'succession',
        matchedDomain: 'staff',
        count: 3,
        triggers: ['wont let go'],
        templates: ['Succession Plan'],
        boost: 5
      }
    ],
    basisCaseCount: 12,
    tracedCaseCount: 10,
    staleDropped: 0
  },
  domains: [
    { id: 'succession', label: 'Succession & Exit Planning' },
    { id: 'staff', label: 'Staff & Team' }
  ]
}

function mountPage (summary = SUMMARY, opts = {}) {
  const wrapper = mountWithBuefy(FirmDecisionLogic, {
    propsData: { apiToken: 'test-token' },
    stubs: { 'decision-logic-diagnostic': true, DecisionLogicDiagnostic: true },
    ...opts
  })
  wrapper.setMethods({ api: jest.fn().mockResolvedValue(summary) })
  return wrapper
}

describe('FirmDecisionLogic — the three levers', () => {
  it('states the FIRM’S counts, not the platform defaults', async () => {
    const wrapper = mountPage()
    await wrapper.vm.load()
    await wrapper.vm.$nextTick()
    const text = wrapper.text()

    expect(text).toContain('firmDecisionLogic.dsCount {"count":29}')
    expect(text).toContain('firmDecisionLogic.ltCount {"tables":42,"hints":37}')
    expect(text).toContain('firmDecisionLogic.adCount {"count":67}')
    expect(text).toContain('firmDecisionLogic.quizFootB {"banks":62,"questions":652}')
  })

  it('reads +3 and +5 from the payload rather than a copy of its own', async () => {
    const bespoke = JSON.parse(JSON.stringify(SUMMARY))
    bespoke.levers.logicTables.boost = 4
    bespoke.levers.distinctions.boost = 8
    const wrapper = mountPage(bespoke)
    await wrapper.vm.load()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.treeBoost).toBe(4)
    expect(wrapper.vm.distinctionBoost).toBe(8)
    expect(wrapper.text()).toContain('firmDecisionLogic.ltBodyB {"boost":4}')
    expect(wrapper.text()).toContain('firmDecisionLogic.adBodyD {"boost":8}')
  })

  it('carries the Scenario Lab figures through to the cards', async () => {
    const wrapper = mountPage()
    await wrapper.vm.load()
    await wrapper.vm.$nextTick()
    const text = wrapper.text()

    expect(text).toContain('firmDecisionLogic.ltMeasureD {"count":3}')
    expect(text).toContain('firmDecisionLogic.adMeasureG {"count":29}')
    // "3.0", not "3": JavaScript drops the decimal, and this is the figure the
    // whole "+3 versus +5" argument rests on.
    expect(text).toContain('firmDecisionLogic.adMeasureC {"margin":"3.0"}')
  })

  it('keeps a space between the "measured" tag and the number after it', async () => {
    // Pug emits NO whitespace between a bare `|` and a following tag, which
    // rendered "measured3 cases in 51" (found by Mike, 2026-08-03).
    const wrapper = mountPage()
    await wrapper.vm.load()
    await wrapper.vm.$nextTick()

    const html = wrapper.html()
    expect(html).not.toMatch(/<\/span><b>firmDecisionLogic\.ltMeasureD/)
    expect(html).toMatch(/<\/span>\s+<b>firmDecisionLogic\.ltMeasureD/)
  })

  it('shows nothing at all — and says why — when the configuration cannot be read', async () => {
    const wrapper = mountPage()
    wrapper.setMethods({ api: jest.fn().mockRejectedValue(new Error('down')) })
    await wrapper.vm.load()
    await wrapper.vm.$nextTick()

    // Half a map, silently, is worse than no map: every number here is meant to
    // be acted on.
    expect(wrapper.vm.levers).toBeNull()
    expect(wrapper.text()).toContain('firmDecisionLogic.loadFailed')
    expect(wrapper.text()).not.toContain('firmDecisionLogic.dsCount')
  })
})

describe('FirmDecisionLogic — the near-miss answer', () => {
  it('opens in place behind router row 5, not as a section of its own', async () => {
    const wrapper = mountPage()
    await wrapper.vm.load()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.nearmiss').exists()).toBe(false)
    // $tc, so one row reads "1 of yours is filed", never "1 … are filed".
    expect(wrapper.text()).toContain('firmDecisionLogic.r5Button 1')

    wrapper.setData({ showNearMiss: true })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.nearmiss').exists()).toBe(true)
  })

  it('names areas, never database keys', async () => {
    const wrapper = mountPage()
    await wrapper.vm.load()
    wrapper.setData({ showNearMiss: true })
    await wrapper.vm.$nextTick()

    const text = wrapper.find('.nearmiss').text()
    expect(text).toContain('Succession & Exit Planning')
    expect(text).toContain('Staff & Team')
    expect(text).not.toContain('succession')
  })

  it('says what the count rests on, so it cannot read as every conversation', async () => {
    const wrapper = mountPage()
    await wrapper.vm.load()
    wrapper.setData({ showNearMiss: true })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('firmDecisionLogic.nmBasis {"traced":10,"total":12}')
  })

  it('distinguishes "none misfiled" from "no cases to read"', async () => {
    const none = JSON.parse(JSON.stringify(SUMMARY))
    none.nearMisses = { rows: [], basisCaseCount: 12, tracedCaseCount: 10, staleDropped: 0 }
    const wrapper = mountPage(none)
    await wrapper.vm.load()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('firmDecisionLogic.nmNone {"count":12}')

    const empty = JSON.parse(JSON.stringify(SUMMARY))
    empty.nearMisses = { rows: [], basisCaseCount: 0, tracedCaseCount: 0, staleDropped: 0 }
    const wrapper2 = mountPage(empty)
    await wrapper2.vm.load()
    await wrapper2.vm.$nextTick()
    expect(wrapper2.text()).toContain('firmDecisionLogic.nmNoCases')
    expect(wrapper2.text()).not.toContain('firmDecisionLogic.nmNone')
  })

  it('reports a case-store failure as a failure, never as "none found"', async () => {
    const broken = JSON.parse(JSON.stringify(SUMMARY))
    broken.nearMisses = { rows: [], basisCaseCount: 0, tracedCaseCount: 0, staleDropped: 0, unavailable: true }
    const wrapper = mountPage(broken)
    await wrapper.vm.load()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('firmDecisionLogic.nmUnavailable')
    expect(wrapper.text()).not.toContain('firmDecisionLogic.nmNone')
  })

  it('reports near-misses dropped because the distinction was deleted', async () => {
    const stale = JSON.parse(JSON.stringify(SUMMARY))
    stale.nearMisses.staleDropped = 2
    const wrapper = mountPage(stale)
    await wrapper.vm.load()
    wrapper.setData({ showNearMiss: true })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('firmDecisionLogic.nmStale {"count":2}')
  })
})

describe('FirmDecisionLogic — the near-miss decisions', () => {
  it('ASKS before moving: it changes the firm’s live configuration', async () => {
    const wrapper = mountPage()
    await wrapper.vm.load()
    const confirm = jest.fn()
    wrapper.vm.$buefy = { dialog: { confirm }, toast: { open: jest.fn() } }

    wrapper.vm.moveRow(SUMMARY.nearMisses.rows[0])
    expect(confirm).toHaveBeenCalledTimes(1)
    // Nothing is sent until the manager confirms.
    expect(wrapper.vm.api).toHaveBeenCalledTimes(1) // the initial load only
  })

  it('routes a firm-own move to the distinction’s own update endpoint', async () => {
    const wrapper = mountPage()
    await wrapper.vm.load()
    const api = jest.fn().mockResolvedValue({ updated: true })
    wrapper.setMethods({ api })
    wrapper.vm.$buefy = { dialog: { confirm: o => o.onConfirm() }, toast: { open: jest.fn() } }

    await wrapper.vm.moveRow(SUMMARY.nearMisses.rows[0])
    await wrapper.vm.$nextTick()

    expect(api).toHaveBeenCalledWith('PUT', '/api/firm-manager/distinctions/7', { domain: 'staff' })
  })

  it('copies by creating a new row, leaving the original where it is', async () => {
    const wrapper = mountPage()
    await wrapper.vm.load()
    const api = jest.fn().mockResolvedValue({ created: true })
    wrapper.setMethods({ api })
    wrapper.vm.$buefy = { dialog: { confirm: o => o.onConfirm() }, toast: { open: jest.fn() } }

    await wrapper.vm.copyRow(SUMMARY.nearMisses.rows[0])
    await wrapper.vm.$nextTick()

    expect(api).toHaveBeenCalledWith('POST', '/api/firm-manager/distinctions', {
      domain: 'staff',
      description: 'Owner cannot let go',
      triggers: ['wont let go'],
      templates: ['Succession Plan'],
      boost: 5
    })
  })

  it('"Leave it" writes NOTHING — it only stops the page asking', async () => {
    const wrapper = mountPage()
    await wrapper.vm.load()
    const api = jest.fn()
    wrapper.setMethods({ api })

    wrapper.vm.leaveRow(SUMMARY.nearMisses.rows[0])
    expect(api).not.toHaveBeenCalled()
    expect(wrapper.vm.settled['7::staff']).toBe('firmDecisionLogic.nmLeft')
  })

  it('says nothing changed when the save fails', async () => {
    const wrapper = mountPage()
    await wrapper.vm.load()
    const toast = jest.fn()
    wrapper.setMethods({ api: jest.fn().mockRejectedValue(new Error('nope')) })
    wrapper.vm.$buefy = { dialog: { confirm: o => o.onConfirm() }, toast: { open: toast } }

    await wrapper.vm.moveRow(SUMMARY.nearMisses.rows[0])
    await wrapper.vm.$nextTick()

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'firmDecisionLogic.nmActionFailed', type: 'is-danger' })
    )
    expect(wrapper.vm.settled['7::staff']).toBeUndefined()
  })

  it('keys a decision by distinction AND area, so one row settling never marks another', async () => {
    const two = JSON.parse(JSON.stringify(SUMMARY))
    two.nearMisses.rows.push({ ...SUMMARY.nearMisses.rows[0], matchedDomain: 'conflict', count: 1 })
    const wrapper = mountPage(two)
    await wrapper.vm.load()

    wrapper.vm.leaveRow(two.nearMisses.rows[0])
    expect(wrapper.vm.settled['7::staff']).toBeDefined()
    expect(wrapper.vm.settled['7::conflict']).toBeUndefined()
  })
})
