/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const EN = require('../../locales/en.json')

/**
 * THE "ANSWERED BY" TRACE ROW, RENDERED (item 4.97 US8, task T052).
 *
 * Mike's ruling 2026-09-14 on `design/mockups/outcome-learning-trace-lift.html` (Screen B):
 * this row shows on EVERY trace, not only when the backup answered, because a row that
 * appears only on failure cannot be trusted by its absence — and a case reopened months
 * later still says which service wrote it.
 *
 * ⚠ THIS FILE ASSERTS ENGLISH, the same deliberate exception `decisionTraceMainIssue.render.test.js`
 * documents. The strings were ruled by Mike word for word, and the risk guarded is a row making
 * a FALSE STATEMENT about which service answered. Both states are fluent English whichever one
 * is wrong, so nothing on screen reveals the mistake.
 *
 * 🔴 WHAT UAT CANNOT SEE, AND WHY THIS TEST EXISTS. A tester in UAT sees "Answered by OpenAI"
 * and has no way to know whether the backup actually answered — the reply reads the same either
 * way. Before T052 the trace hardcoded the literal `'openai'`, so the row would have stated the
 * primary answered on a session where it demonstrably had not. That is exactly the defect this
 * row was ruled into existence to prevent, and only an assertion catches it.
 */

/** `$t` that resolves against the REAL locale file, so tests read what ships. */
function realT (key, params) {
  const text = key.split('.').reduce((o, k) => (o === null || o === undefined ? undefined : o[k]), EN)
  if (typeof text !== 'string') { throw new TypeError(`missing locale key: ${key}`) }
  return params
    ? text.replace(/\{(\w+)\}/g, (_m, name) => (name in params ? String(params[name]) : `{${name}}`))
    : text
}

const LABEL = EN.decisionTrace.answeredBy
const BACKUP_CLAUSE = 'the usual service did not answer, so the backup did'

/** A decision trace with the `ai` block swapped in per test. */
const traceWith = ai => ({
  domain: { id: 'profit', label: 'profitability and feasibility' },
  lenses: { engagementType: 'advice', complexityCeiling: null, problemSignals: {}, templateBudget: 3, signalTypes: [] },
  distinctions: { evaluatedDomain: 'profit', note: '', aiFailed: false, nearMissAiFailed: false, boostsApplied: {}, nearMisses: [] },
  templateScores: [],
  budget: {},
  primaryIssue: { label: null, how: 'none', reason: null, asked: false },
  ai
})

beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))
})

describe('The Answered by row, as the advisor sees it', () => {
  const VirtualAdvisor = require('~/components/VirtualAdvisor.vue').default

  async function panelWith (ai) {
    const wrapper = mountWithBuefy(VirtualAdvisor, { mocks: { $t: realT } })
    await wrapper.setData({
      mode: 'client',
      lastTrace: traceWith(ai),
      recommendationDelivered: true,
      showTracePanel: true
    })
    return wrapper
  }

  it('names the service that answered, with no explanation when it was the usual one', async () => {
    const text = (await panelWith({ provider: 'openai', fallbackUsed: false })).text()
    expect(text).toContain(LABEL)
    expect(text).toContain('openai')
    expect(text).not.toContain(BACKUP_CLAUSE)
  })

  it('says the BACKUP answered — never passes it off as the usual service', async () => {
    // The whole point of the row. A session the backup rescued reads identically to a normal
    // one on screen; without this assertion the advisor is told the wrong thing and cannot tell.
    const text = (await panelWith({ provider: 'mistral', fallbackUsed: true })).text()
    expect(text).toContain('mistral — ' + BACKUP_CLAUSE)
  })

  it('never names a service the trace did not record', async () => {
    // Before T052 this row would have read "openai" from a hardcoded literal regardless of
    // what happened. A session where nothing through the seam answered shows no row at all.
    const text = (await panelWith({ provider: null, fallbackUsed: false })).text()
    expect(text).not.toContain(LABEL)
    expect(text).not.toContain('openai')
  })

  it('a case saved before this shipped shows no row, rather than breaking the panel', async () => {
    const wrapper = await panelWith(undefined)
    expect(wrapper.text()).not.toContain(LABEL)
    expect(wrapper.text()).toContain(EN.decisionTrace.areaFocused)
  })

  it('sits third, under what shaped the advice — the order drawn on Screen B', async () => {
    const text = (await panelWith({ provider: 'openai', fallbackUsed: false })).text()
    expect(text.indexOf(EN.decisionTrace.whatShaped)).toBeLessThan(text.indexOf(LABEL))
  })
})
