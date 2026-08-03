/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const EN = require('../../locales/en.json')

/**
 * THE TWO LIVE-SESSION PANELS, RENDERED — not read as source.
 *
 * The companion file `decisionTraceAiFailure.test.js` proves the failure branch
 * EXISTS and comes first. It cannot prove the screen puts a sentence on the page,
 * and a branch wired to a key that renders nothing would pass it. These tests
 * mount the real components with the failure switched on and read what a person
 * would see.
 *
 * ⚠ THIS FILE ASSERTS ENGLISH, WHICH IS THE OPPOSITE OF THE HOUSE RULE. Component
 * tests here use a `$t()` stand-in that returns the KEY, so an assertion pins
 * WHICH message shows and survives a rewording. That is right for every other
 * test and wrong for this one: the defect being guarded against was a screen
 * making a false STATEMENT, the wording was ruled on by Mike specifically
 * (design/WORDING-DISTINCTION-AI-FAILURE.md, 2026-08-03), and a key-based
 * assertion would have passed happily throughout the original bug. So `$t` is
 * wired to the real locale file and the sentences are asserted as words.
 *
 * Reproducing this by hand needs a deliberately broken OPENAI_API_KEY, which is
 * not something a non-technical owner can be asked to arrange — that request is
 * what this file replaces.
 */

/** `$t` that resolves against the REAL locale file, so tests read what ships. */
function realT (key, params) {
  const text = key.split('.').reduce((o, k) => (o === null || o === undefined ? undefined : o[k]), EN)
  if (typeof text !== 'string') { throw new TypeError(`missing locale key: ${key}`) }
  return params
    ? text.replace(/\{(\w+)\}/g, (_m, name) => (name in params ? String(params[name]) : `{${name}}`))
    : text
}

const FAULT = EN.decisionTrace.distAiFailed
const BRIDGE_FAULT = EN.decisionTrace.nearMissAiFailed
// The claim that must never appear about a layer nobody read.
const FALSE_CLAIM = 'No distinction changed the scoring in this area.'

/** A decision trace, with the distinction block swapped in per test. */
const traceWith = distinctions => ({
  domain: { id: 'governance', label: 'Governance & Leadership' },
  lenses: { engagementType: 'advice', complexityCeiling: null, problemSignals: {}, templateBudget: 3, signalTypes: [] },
  distinctions,
  templateScores: [],
  budget: {}
})

const AI_FAILED = { evaluatedDomain: 'governance', note: '', aiFailed: true, nearMissAiFailed: true, boostsApplied: {}, nearMisses: [] }
const MATCHED_NONE = { evaluatedDomain: 'governance', note: '', aiFailed: false, nearMissAiFailed: false, boostsApplied: {}, nearMisses: [] }

beforeEach(() => {
  // Both components fetch on mount. Nothing under test depends on the answer;
  // an unmocked fetch would fail the mount for an unrelated reason.
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))
})

describe('A live adviser session — the trace panel a person actually sees', () => {
  const VirtualAdvisor = require('~/components/VirtualAdvisor.vue').default

  /** Mount, open the panel, and put the given distinction block on screen. */
  async function panelWith (distinctions) {
    const wrapper = mountWithBuefy(VirtualAdvisor, { mocks: { $t: realT } })
    await wrapper.setData({
      // The trace lives inside the messages area, which only renders in a
      // conversational mode — with no mode the component shows the menu screen.
      mode: 'client',
      lastTrace: traceWith(distinctions),
      recommendationDelivered: true,
      showTracePanel: true
    })
    return wrapper
  }

  it('prints the approved sentence, in words, when the classifier failed', async () => {
    const text = (await panelWith(AI_FAILED)).text()
    expect(text).toContain(FAULT)
    // The sentence it replaces states a result. Both cannot be on the page.
    expect(text).not.toContain(FALSE_CLAIM)
  })

  it('says the cross-domain bridge failed instead of hiding the section', async () => {
    expect((await panelWith(AI_FAILED)).text()).toContain(BRIDGE_FAULT)
  })

  it('styles it as a fault, not as one more grey note', async () => {
    // The defect was a fault dressed as an ordinary result; the class carries that.
    expect((await panelWith(AI_FAILED)).find('.trace-fault').exists()).toBe(true)
  })

  it('a genuine no-match still reads as a result — the same empty trace, no fault', async () => {
    const text = (await panelWith(MATCHED_NONE)).text()
    expect(text).toContain(FALSE_CLAIM)
    expect(text).not.toContain(FAULT)
    expect(text).not.toContain(BRIDGE_FAULT)
  })
})

describe('A saved case in the Firm Manager Hub — the permanent record', () => {
  const FirmManagerHub = require('~/components/FirmManagerHub.vue').default

  /**
   * Mount the Hub, open the Team Case Studies tab and expand one case. The child
   * tab components are stubbed: they each fetch on mount and none of them is the
   * subject here.
   */
  async function caseWith (distinctions) {
    const wrapper = mountWithBuefy(FirmManagerHub, {
      propsData: { apiToken: 't' },
      mocks: { $t: realT },
      stubs: {
        'firm-adviser-network': true,
        'firm-team-progress': true,
        'firm-logic-lab': true,
        'firm-decision-logic': true,
        'firm-quiz-builder': true,
        'firm-domain-support': true
      }
    })
    await wrapper.setData({
      loadingFirmCases: false,
      firmCases: [{
        id: 9,
        title: 'A shared case',
        domain: 'governance',
        createdAt: '2026-08-03',
        decisionTrace: traceWith(distinctions)
      }],
      expandedReviewCaseId: 9
    })
    return wrapper
  }

  it('a case whose classifier failed is filed as a fault, not as "no distinction applied"', async () => {
    const text = (await caseWith(AI_FAILED)).text()
    expect(text).toContain(FAULT)
    expect(text).not.toContain(FALSE_CLAIM)
  })

  it('says so for the bridge too', async () => {
    expect((await caseWith(AI_FAILED)).text()).toContain(BRIDGE_FAULT)
  })

  it('a genuine no-match is unchanged', async () => {
    const text = (await caseWith(MATCHED_NONE)).text()
    expect(text).toContain(FALSE_CLAIM)
    expect(text).not.toContain(FAULT)
  })

  it('uses the SAME sentence as the live session — one key, two screens', async () => {
    // Two copies of a sentence drift; this is the guard against a second wording
    // appearing on the record a manager reads weeks later.
    expect(FAULT.length).toBeGreaterThan(0)
    expect((await caseWith(AI_FAILED)).text()).toContain(FAULT)
  })
})
