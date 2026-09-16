/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const EN = require('../../locales/en.json')

/**
 * THE "MAIN ISSUE" TRACE ROW, RENDERED (item 4.97 US1, task T020).
 *
 * The engine now asks the advisor to confirm the primary issue, and stores the answer with
 * HOW it was reached — proposed and accepted, or corrected by the advisor. This row is where
 * the advisor sees what was recorded about them. It is the check on the engine's reading:
 * if the label is wrong, this is the screen that reveals it.
 *
 * ⚠ THIS FILE ASSERTS ENGLISH, which the house rule normally forbids — the same deliberate
 * exception `decisionTraceAiFailure.render.test.js` documents, and for the same reason. Every
 * string here was ruled by Mike one at a time on `design/mockups/primary-issue-proposal.html`
 * (Screen D, 2026-09-14), including the three states word for word. The risk being guarded
 * is a row making a FALSE STATEMENT about the advisor — telling them they confirmed something
 * they corrected, or that nothing matched when the question was never asked. A key-based
 * assertion passes happily through every one of those.
 *
 * What UAT cannot see, and therefore what is pinned here: which of the three states renders,
 * and that the row is ABSENT where no proposal was ever put. All three read as fluent English
 * on screen whichever one is wrong.
 */

/** `$t` that resolves against the REAL locale file, so tests read what ships. */
function realT (key, params) {
  const text = key.split('.').reduce((o, k) => (o === null || o === undefined ? undefined : o[k]), EN)
  if (typeof text !== 'string') { throw new TypeError(`missing locale key: ${key}`) }
  return params
    ? text.replace(/\{(\w+)\}/g, (_m, name) => (name in params ? String(params[name]) : `{${name}}`))
    : text
}

const LABEL = EN.decisionTrace.mainIssue
const NONE = EN.decisionTrace.issueNone
const ISSUE = 'Cost of sales has increased'
const REFRAMED_TO = 'Excessive discounting eroding margin'

/** A decision trace with the primaryIssue block swapped in per test. */
const traceWith = primaryIssue => ({
  domain: { id: 'profit', label: 'profitability and feasibility' },
  lenses: { engagementType: 'advice', complexityCeiling: null, problemSignals: {}, templateBudget: 3, signalTypes: [] },
  distinctions: { evaluatedDomain: 'profit', note: '', aiFailed: false, nearMissAiFailed: false, boostsApplied: {}, nearMisses: [] },
  templateScores: [],
  budget: {},
  primaryIssue
})

beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))
})

describe('The Main issue row, as the advisor sees it', () => {
  const VirtualAdvisor = require('~/components/VirtualAdvisor.vue').default

  async function panelWith (primaryIssue) {
    const wrapper = mountWithBuefy(VirtualAdvisor, { mocks: { $t: realT } })
    await wrapper.setData({
      mode: 'client',
      lastTrace: traceWith(primaryIssue),
      recommendationDelivered: true,
      showTracePanel: true
    })
    return wrapper
  }

  it('a confirmed issue is named, and credited to the advisor', async () => {
    const text = (await panelWith({ label: ISSUE, how: 'confirmed', reason: 'you mentioned cost and sales', asked: true })).text()
    expect(text).toContain(LABEL)
    expect(text).toContain(ISSUE + ' · confirmed by you')
  })

  it('a REFRAMED issue says reframed — never that they confirmed our first guess', async () => {
    // The distinction the mentor reads: did the engine get it right, or was it corrected?
    // Both render as a plausible sentence, so only an assertion separates them.
    const text = (await panelWith({ label: REFRAMED_TO, how: 'reframed', reason: 'you mentioned discounting', asked: true })).text()
    expect(text).toContain(REFRAMED_TO + ' · reframed by you')
    expect(text).not.toContain('confirmed by you')
  })

  it('a genuine miss says so plainly', async () => {
    const text = (await panelWith({ label: null, how: 'none', reason: null, asked: true })).text()
    expect(text).toContain(NONE)
  })

  it('a domain that never proposes shows NO row at all', async () => {
    // A context domain (conflict, eoy, due-diligence) names no structural problem by design.
    // Printing "nothing matched a known issue" there would report a miss that never happened.
    const text = (await panelWith({ label: null, how: 'none', reason: null, asked: false })).text()
    expect(text).not.toContain(NONE)
    expect(text).not.toContain(LABEL)
  })

  it('a trace from before this step shipped shows no row, rather than breaking the panel', async () => {
    // Saved cases predate `primaryIssue` entirely; the panel must still render.
    const wrapper = await panelWith(undefined)
    expect(wrapper.text()).not.toContain(LABEL)
    expect(wrapper.text()).toContain(EN.decisionTrace.areaFocused)
  })

  it('sits directly under the area — the order the advisor confirmed them in', async () => {
    const text = (await panelWith({ label: ISSUE, how: 'confirmed', reason: null, asked: true })).text()
    expect(text.indexOf(EN.decisionTrace.areaFocused)).toBeLessThan(text.indexOf(LABEL))
    expect(text.indexOf(LABEL)).toBeLessThan(text.indexOf(EN.decisionTrace.whatShaped))
  })
})
