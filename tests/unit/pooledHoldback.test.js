'use strict'

/**
 * Outcome Learning's pooled hold-back in the resolver (4.87 T031/T034).
 *
 * What UAT cannot see: a hold-back that exceeds the cap, one that makes a template vanish
 * from the log, one that overrules the advisor's own words, one that fires at a firm with
 * no matching dimension, and any change at all to a run with no adjustments.
 */

const { resolveTemplates, resolveTemplatesWithOutlier, POOLED_HOLDBACK_MAX, SCORING_VERSION } = require('../../server/utils/templateResolver')
const { HISTORY_HOLDBACK_PENALTY } = require('../../server/utils/priorEngagement')

function makeTemplates () {
  return [
    { page: 'id-1', title: 'Quick Fire Diagnosis', section: 'Do the Job', subSection: 'General Tools', tags: ['diagnosis'], purpose: 'diagnose the source of the business issue' },
    { page: 'id-2', title: 'Working Capital Cycle', section: 'Do the Job', subSection: 'General Tools', tags: ['cash'], purpose: 'understand the working capital cycle' },
    { page: 'id-3', title: 'Break-Even Analysis', section: 'Do the Job', subSection: 'General Tools', tags: ['costs'], purpose: 'find the break-even point' },
    // Low affinity, so its score sits just above zero and the clamp is genuinely exercised.
    { page: 'id-4', title: 'Weak Affinity Tool', section: 'Do the Job', subSection: 'Reporting', tags: [], purpose: '' }
  ]
}

function makeCaseState (over = {}) {
  return {
    domain: 'profit',
    primaryIssue: null,
    industry: 'cafe',
    solutionCategories: [],
    client: {},
    advisor: {},
    complexityCeiling: 'strategic',
    problemSignals: {},
    ...over
  }
}

const strategy = { engagementType: 'education', templateBudget: 3 }
// A DISTINCTION lift, used only where the test needs the advisor's words to have matched:
// any template carrying it is outweighed, never held back, by design.
const LIFT_ALL = { 'Quick Fire Diagnosis': 20, 'Working Capital Cycle': 20, 'Break-Even Analysis': 20 }
const QFD = 'Quick Fire Diagnosis'
// On this fixture the three main templates score 4 and the weak one 2, unlifted.
const adj = (over = {}) => ({ id: 'x', template: QFD, dimension: 'domain', value: 'profit', holdBack: 2, firms: 6, cases: 31, ...over })

const scoreOf = (result, title) => result.scoringLog.find(t => t.title === title).score
const reasonsOf = (result, title) => result.scoringLog.find(t => t.title === title).matchReasons
const run = (opts, over) => resolveTemplates(makeCaseState(over), strategy, makeTemplates(), Object.assign({}, opts))

describe('pooled hold-back', () => {
  test('the cap is the ruled value and the scoring version moved with the formula', () => {
    expect(POOLED_HOLDBACK_MAX).toBe(10)
    expect(SCORING_VERSION).toBe('2.2.0')
  })

  test('one matching live adjustment subtracts its hold-back and pushes pooled:held_back-<n>', () => {
    const without = run({})
    const withAdj = run({ pooledAdjustments: [adj()] })
    expect(scoreOf(without, QFD)).toBe(4)
    expect(scoreOf(withAdj, QFD)).toBe(2)
    expect(reasonsOf(withAdj, QFD)).toContain('pooled:held_back-2')
    // Only the named template moved.
    expect(scoreOf(withAdj, 'Working Capital Cycle')).toBe(scoreOf(without, 'Working Capital Cycle'))
    expect(reasonsOf(withAdj, 'Working Capital Cycle').some(r => r.startsWith('pooled:'))).toBe(false)
  })

  test('several matching adjustments sum, and cap at 10', () => {
    const without = run({})
    const r = run({
      pooledAdjustments: [adj({ holdBack: 2 }), adj({ dimension: 'industry', value: 'cafe', holdBack: 1 })],
      pooledSignalTypes: []
    })
    expect(scoreOf(without, QFD) - scoreOf(r, QFD)).toBe(3)
    expect(reasonsOf(r, QFD)).toContain('pooled:held_back-3')

    // Three sixes sum to 18; the reason records the CAPPED total, and the clamp holds at 1.
    const capped = run({
      pooledAdjustments: [adj({ holdBack: 6 }), adj({ dimension: 'industry', value: 'cafe', holdBack: 6 }), adj({ dimension: 'engagementType', value: 'education', holdBack: 6 })]
    })
    expect(reasonsOf(capped, QFD)).toContain('pooled:held_back-' + POOLED_HOLDBACK_MAX)
    expect(scoreOf(capped, QFD)).toBe(1)
  })

  test("the advisor's words win: a template carrying a distinction: reason is untouched and marked pooled:outweighed", () => {
    // LIFT_ALL is applied as distinction boosts, so every lifted template carries `distinction:+20`.
    const without = run({ distinctionBoosts: LIFT_ALL })
    const r = run({ distinctionBoosts: LIFT_ALL, pooledAdjustments: [adj({ holdBack: 10 })] })
    expect(reasonsOf(r, QFD)).toContain('distinction:+20')
    expect(reasonsOf(r, QFD)).toContain('pooled:outweighed')
    expect(reasonsOf(r, QFD).some(r => r.startsWith('pooled:held_back'))).toBe(false)
    expect(scoreOf(r, QFD)).toBe(scoreOf(without, QFD))
  })

  test('clamps at 1: a low-scoring template with hold-back 10 ends at 1 and never drops from the log', () => {
    const without = run({})
    const weakBase = scoreOf(without, 'Weak Affinity Tool')
    expect(weakBase).toBeGreaterThan(0)
    expect(weakBase).toBeLessThanOrEqual(10)
    const r = run({ pooledAdjustments: [adj({ template: 'Weak Affinity Tool', holdBack: 10 })] })
    expect(scoreOf(r, 'Weak Affinity Tool')).toBe(1)
    expect(reasonsOf(r, 'Weak Affinity Tool')).toContain('pooled:held_back-10')
  })

  test('an empty list, or no option at all, leaves every score and reason identical', () => {
    const base = resolveTemplates(makeCaseState(), strategy, makeTemplates())
    const empty = run({ pooledAdjustments: [] })
    const malformed = run({ pooledAdjustments: [null, 'x', { template: QFD }, adj({ holdBack: 0 }), adj({ dimension: 'colour' }), adj({ holdBack: 'four' })] })
    expect(empty.scoringLog).toEqual(base.scoringLog)
    expect(malformed.scoringLog).toEqual(base.scoringLog)
  })

  test.each([
    ['domain', { dimension: 'domain', value: 'profit' }, { dimension: 'domain', value: 'staff' }, {}],
    ['industry', { dimension: 'industry', value: 'Cafe' }, { dimension: 'industry', value: 'plumber' }, {}],
    ['engagementType', { dimension: 'engagementType', value: 'education' }, { dimension: 'engagementType', value: 'advice' }, {}],
    ['signal', { dimension: 'signal', value: 'client_awareness' }, { dimension: 'signal', value: 'sales_diagnosis' }, { pooledSignalTypes: ['client_awareness'] }]
  ])('matches on the %s dimension, case-insensitively, and a non-matching value applies nothing', (_dim, hit, miss, extra) => {
    const without = run({})
    const hitRun = run(Object.assign({ pooledAdjustments: [adj(hit)] }, extra))
    const missRun = run(Object.assign({ pooledAdjustments: [adj(miss)] }, extra))
    expect(scoreOf(without, QFD) - scoreOf(hitRun, QFD)).toBe(2)
    expect(scoreOf(missRun, QFD)).toBe(scoreOf(without, QFD))
    expect(reasonsOf(missRun, QFD).some(r => r.startsWith('pooled:'))).toBe(false)
  })

  test('a session with no industry or no signals matches nothing on those dimensions', () => {
    const without = run({}, { industry: null })
    const r = run({ pooledAdjustments: [adj({ dimension: 'industry', value: 'cafe' }), adj({ dimension: 'signal', value: 'client_awareness' })] }, { industry: null })
    expect(scoreOf(r, QFD)).toBe(scoreOf(without, QFD))
  })

  test('applied before the history clamp, so history and pooled together still clamp at 1', () => {
    const r = run({
      pooledAdjustments: [adj({ template: 'Weak Affinity Tool', holdBack: 10 })],
      priorHoldback: { delivered: ['Weak Affinity Tool'], wentLessTitles: [] }
    })
    const weak = r.scoringLog.find(t => t.title === 'Weak Affinity Tool')
    expect(weak.score).toBe(1)
    expect(weak.matchReasons.indexOf('pooled:held_back-10')).toBeLessThan(weak.matchReasons.indexOf('history:already_delivered'))
    expect(HISTORY_HOLDBACK_PENALTY).toBeGreaterThan(0)
  })

  test('a template that was not viable anyway is left untouched, with no reason', () => {
    const r = resolveTemplates(makeCaseState({ domain: 'valuation' }), strategy, makeTemplates(), {
      pooledAdjustments: [adj({ dimension: 'domain', value: 'valuation', holdBack: 5 })]
    })
    const qfd = r.scoringLog.find(t => t.title === QFD)
    if (qfd && qfd.score <= 0) {
      expect(qfd.matchReasons.some(x => x.startsWith('pooled:'))).toBe(false)
    }
  })

  test('resolveTemplatesWithOutlier passes the adjustments through to both passes', () => {
    const r = resolveTemplatesWithOutlier(makeCaseState(), strategy, makeTemplates(), {
      distinctionBoosts: { 'Working Capital Cycle': 20 },
      pooledAdjustments: [adj({ holdBack: 3 })],
      pooledSignalTypes: []
    })
    expect(reasonsOf(r.primary, QFD)).toContain('pooled:held_back-3')
  })
})
