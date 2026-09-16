'use strict'

/**
 * Outcome Learning's pooled adjustment in the resolver (4.87 T031/T034; SIGNED by 4.97 US2
 * T022).
 *
 * What UAT cannot see: an adjustment that exceeds the cap in EITHER direction, one that makes
 * a template vanish from the log, one that overrules the advisor's own words, one that fires
 * at a firm with no matching dimension, and any change at all to a run with no adjustments.
 *
 * 🔴 `size` IS SIGNED — negative holds back, positive lifts. The hold-back tests below pass
 * negative sizes and are otherwise unchanged from 4.87, because a hold-back must behave
 * exactly as it did; the lift tests beside them are what US2 added.
 */

const { resolveTemplates, resolveTemplatesWithOutlier, POOLED_HOLDBACK_MAX, SCORING_VERSION, advisorEvidenceKind } = require('../../server/utils/templateResolver')
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
// `size` is signed: -2 is the old default hold-back of 2. `hold(n)` and `lift(n)` read the
// way the feature reads, so a test's intent is never hidden inside a minus sign.
const adj = (over = {}) => ({ id: 'x', template: QFD, dimension: 'domain', value: 'profit', size: -2, firms: 6, cases: 31, ...over })
const hold = (n, over = {}) => adj({ size: -n, ...over })
const lift = (n, over = {}) => adj({ size: n, ...over })

const scoreOf = (result, title) => result.scoringLog.find(t => t.title === title).score
const reasonsOf = (result, title) => result.scoringLog.find(t => t.title === title).matchReasons
const run = (opts, over) => resolveTemplates(makeCaseState(over), strategy, makeTemplates(), Object.assign({}, opts))

describe('pooled hold-back', () => {
  test('the cap is the ruled value and the scoring version moved with the formula', () => {
    expect(POOLED_HOLDBACK_MAX).toBe(10)
    expect(SCORING_VERSION).toBe('2.3.0')
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
      pooledAdjustments: [adj({ size: -2 }), adj({ dimension: 'industry', value: 'cafe', size: -1 })],
      pooledSignalTypes: []
    })
    expect(scoreOf(without, QFD) - scoreOf(r, QFD)).toBe(3)
    expect(reasonsOf(r, QFD)).toContain('pooled:held_back-3')

    // Three sixes sum to 18; the reason records the CAPPED total, and the clamp holds at 1.
    const capped = run({
      pooledAdjustments: [adj({ size: -6 }), adj({ dimension: 'industry', value: 'cafe', size: -6 }), adj({ dimension: 'engagementType', value: 'education', size: -6 })]
    })
    expect(reasonsOf(capped, QFD)).toContain('pooled:held_back-' + POOLED_HOLDBACK_MAX)
    expect(scoreOf(capped, QFD)).toBe(1)
  })

  // ── Lifts (4.97 US2 T022) ──────────────────────────────────────────────────
  // The half of "gets smarter with use" the engine could not do until 2026-09-14: a template
  // consenting firms reported as landing WELL moves UP, through the same cap and trace.

  test('a lift raises the score by its size and pushes pooled:lifted-<n>', () => {
    const without = run({})
    const r = run({ pooledAdjustments: [lift(3)] })
    expect(scoreOf(r, QFD) - scoreOf(without, QFD)).toBe(3)
    expect(reasonsOf(r, QFD)).toContain('pooled:lifted-3')
    expect(reasonsOf(r, QFD).some(x => x.startsWith('pooled:held_back'))).toBe(false)
  })

  test('a lift and a hold-back on one template net, and the net carries the direction', () => {
    const without = run({})
    // +4 and −1 net to +3: one reason, not two, because one number reached the score.
    const up = run({ pooledAdjustments: [lift(4), hold(1, { dimension: 'industry', value: 'cafe' })] })
    expect(scoreOf(up, QFD) - scoreOf(without, QFD)).toBe(3)
    expect(reasonsOf(up, QFD)).toContain('pooled:lifted-3')
    expect(reasonsOf(up, QFD).filter(x => x.startsWith('pooled:'))).toHaveLength(1)

    // +1 and −4 net to −3, and the same pairing reads as a hold-back.
    const down = run({ pooledAdjustments: [lift(1), hold(4, { dimension: 'industry', value: 'cafe' })] })
    expect(scoreOf(without, QFD) - scoreOf(down, QFD)).toBe(3)
    expect(reasonsOf(down, QFD)).toContain('pooled:held_back-3')

    // Equal and opposite is no change at all — and, critically, NO REASON: a trace line
    // saying "learned from outcomes 0" would claim an influence the score never felt.
    const level = run({ pooledAdjustments: [lift(4), hold(4, { dimension: 'industry', value: 'cafe' })] })
    expect(scoreOf(level, QFD)).toBe(scoreOf(without, QFD))
    expect(reasonsOf(level, QFD).some(x => x.startsWith('pooled:'))).toBe(false)
  })

  test('a lift caps at 10, the same ceiling a hold-back has', () => {
    const without = run({})
    const capped = run({
      pooledAdjustments: [lift(6), lift(6, { dimension: 'industry', value: 'cafe' }), lift(6, { dimension: 'engagementType', value: 'education' })]
    })
    expect(reasonsOf(capped, QFD)).toContain('pooled:lifted-' + POOLED_HOLDBACK_MAX)
    expect(scoreOf(capped, QFD) - scoreOf(without, QFD)).toBe(POOLED_HOLDBACK_MAX)
  })

  test("the advisor's words win in the flattering direction too: a lift is outweighed, not applied", () => {
    // A lift that reorders the advisor's own evidence is the same overruling as a hold-back.
    const without = run({ distinctionBoosts: LIFT_ALL })
    const r = run({ distinctionBoosts: LIFT_ALL, pooledAdjustments: [lift(10)] })
    expect(reasonsOf(r, QFD)).toContain('pooled:outweighed-distinction')
    expect(reasonsOf(r, QFD).some(x => x.startsWith('pooled:lifted'))).toBe(false)
    expect(scoreOf(r, QFD)).toBe(scoreOf(without, QFD))
  })

  test("the advisor's words win: a template carrying a distinction: reason is untouched and marked pooled:outweighed", () => {
    // LIFT_ALL is applied as distinction boosts, so every lifted template carries `distinction:+20`.
    const without = run({ distinctionBoosts: LIFT_ALL })
    const r = run({ distinctionBoosts: LIFT_ALL, pooledAdjustments: [adj({ size: -10 })] })
    expect(reasonsOf(r, QFD)).toContain('distinction:+20')
    expect(reasonsOf(r, QFD)).toContain('pooled:outweighed-distinction')
    expect(reasonsOf(r, QFD).some(r => r.startsWith('pooled:held_back'))).toBe(false)
    expect(scoreOf(r, QFD)).toBe(scoreOf(without, QFD))
  })

  // ── 4.97 US3: the advisor's own words win in ALL SIX WAYS they reach a template ──
  //
  // What UAT cannot see: WHICH evidence protected a template. Until US3 only `distinction:`
  // did, so the confirmed main issue, the client's industry and the signals heard in the
  // description were all silently overruled by other firms' data — the engine looked correct
  // doing it, because the score it produced was a perfectly ordinary number.
  //
  // Each case below drives ONE family through the real resolver and asserts the same three
  // things: the family's own reason fired, the pooled adjustment was set aside naming that
  // family, and the score is untouched.
  describe("the advisor's own words outweigh a pooled adjustment, in every family", () => {
    // A template whose title, tags and purpose carry the words each family matches on.
    const industryTemplates = () => [
      { page: 'id-1', title: 'Quick Fire Diagnosis', section: 'Do the Job', subSection: 'General Tools', tags: ['diagnosis'], purpose: 'diagnose the source of the business issue' },
      { page: 'id-2', title: 'Cafe Performance Model', section: 'Do the Job', subSection: 'General Tools', tags: ['cafe'], purpose: 'model a cafe' }
    ]

    test('a distinction outweighs it, and names distinction', () => {
      const without = run({ distinctionBoosts: LIFT_ALL })
      const r = run({ distinctionBoosts: LIFT_ALL, pooledAdjustments: [hold(10)] })
      expect(reasonsOf(r, QFD).some(x => x.indexOf('distinction:') === 0)).toBe(true)
      expect(reasonsOf(r, QFD)).toContain('pooled:outweighed-distinction')
      expect(scoreOf(r, QFD)).toBe(scoreOf(without, QFD))
    })

    test('the confirmed main issue outweighs it, and names primary_issue', () => {
      // The issue's own keywords are in the title and purpose, so the issue branch fires.
      const over = { primaryIssue: 'diagnosis of the business issue' }
      const without = run({}, over)
      const r = run({ pooledAdjustments: [hold(10)] }, over)
      expect(reasonsOf(r, QFD).some(x => x.indexOf('primary_issue:') === 0)).toBe(true)
      expect(reasonsOf(r, QFD)).toContain('pooled:outweighed-primary_issue')
      expect(reasonsOf(r, QFD).some(x => x.indexOf('pooled:held_back') === 0)).toBe(false)
      expect(scoreOf(r, QFD)).toBe(scoreOf(without, QFD))
    })

    test("the client's industry outweighs it, and names industry", () => {
      const TITLE = 'Cafe Performance Model'
      const cafeAdj = { id: 'c', template: TITLE, dimension: 'domain', value: 'profit', size: -10, firms: 6, cases: 31 }
      const state = makeCaseState({ industry: 'cafe' })
      const without = resolveTemplates(state, strategy, industryTemplates(), {})
      const r = resolveTemplates(state, strategy, industryTemplates(), { pooledAdjustments: [cafeAdj] })
      expect(reasonsOf(r, TITLE).some(x => x.indexOf('industry:title_match') === 0)).toBe(true)
      expect(reasonsOf(r, TITLE)).toContain('pooled:outweighed-industry')
      expect(scoreOf(r, TITLE)).toBe(scoreOf(without, TITLE))
    })

    test('a signal heard in the description outweighs it, and names signal', () => {
      // problemSignals drive the semantic / purpose_fallback branches — both report `signal`.
      // problemSignals is `{ signalName: count }` — a real registry name, a positive count.
      const over = { problemSignals: { cash_flow_gap: 2 } }
      const withoutPool = run({}, over)
      const signalled = reasonsOf(withoutPool, QFD).concat(reasonsOf(withoutPool, 'Working Capital Cycle'))
      const title = reasonsOf(withoutPool, QFD).some(x => /^(semantic|purpose_fallback):/.test(x)) ? QFD : 'Working Capital Cycle'
      expect(signalled.some(x => /^(semantic|purpose_fallback):/.test(x))).toBe(true)
      const target = { id: 's', template: title, dimension: 'domain', value: 'profit', size: -10, firms: 6, cases: 31 }
      const r = run({ pooledAdjustments: [target] }, over)
      expect(reasonsOf(r, title)).toContain('pooled:outweighed-signal')
      expect(scoreOf(r, title)).toBe(scoreOf(withoutPool, title))
    })

    test('a template carrying none of the six is still adjusted', () => {
      // The other half of the rule: protection is not blanket. Nothing here is the advisor's
      // own evidence, so the pooled hold-back applies in full.
      const without = run({})
      const r = run({ pooledAdjustments: [hold(3)] })
      expect(advisorEvidenceKind(reasonsOf(r, QFD))).toBeNull()
      expect(reasonsOf(r, QFD)).toContain('pooled:held_back-3')
      expect(scoreOf(r, QFD)).toBe(Math.max(1, scoreOf(without, QFD) - 3))
    })

    test('an industry PENALTY does not protect a template — only a real industry match does', () => {
      // `industry:wrong_domain_model` and `industry:mismatch_specific_model` share the prefix
      // but are penalties, not the advisor's evidence. Treating them as evidence would let a
      // template the engine just marked irrelevant escape a pooled hold-back.
      expect(advisorEvidenceKind(['industry:wrong_domain_model'])).toBeNull()
      expect(advisorEvidenceKind(['industry:mismatch_specific_model'])).toBeNull()
      expect(advisorEvidenceKind(['industry:title_match'])).toBe('industry')
      expect(advisorEvidenceKind(['industry:tag_match'])).toBe('industry')
    })
  })

  test('clamps at 1: a low-scoring template with hold-back 10 ends at 1 and never drops from the log', () => {
    const without = run({})
    const weakBase = scoreOf(without, 'Weak Affinity Tool')
    expect(weakBase).toBeGreaterThan(0)
    expect(weakBase).toBeLessThanOrEqual(10)
    const r = run({ pooledAdjustments: [adj({ template: 'Weak Affinity Tool', size: -10 })] })
    expect(scoreOf(r, 'Weak Affinity Tool')).toBe(1)
    expect(reasonsOf(r, 'Weak Affinity Tool')).toContain('pooled:held_back-10')
  })

  test('an empty list, or no option at all, leaves every score and reason identical', () => {
    const base = resolveTemplates(makeCaseState(), strategy, makeTemplates())
    const empty = run({ pooledAdjustments: [] })
    // A size of 0 is dropped like any malformed entry: the mentor accepted the pairing and the
    // evidence says "no difference", so it must not put a reason on the trace claiming one.
    const malformed = run({ pooledAdjustments: [null, 'x', { template: QFD }, adj({ size: 0 }), adj({ dimension: 'colour' }), adj({ size: 'four' })] })
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
      pooledAdjustments: [adj({ template: 'Weak Affinity Tool', size: -10 })],
      priorHoldback: { delivered: ['Weak Affinity Tool'], wentLessTitles: [] }
    })
    const weak = r.scoringLog.find(t => t.title === 'Weak Affinity Tool')
    expect(weak.score).toBe(1)
    expect(weak.matchReasons.indexOf('pooled:held_back-10')).toBeLessThan(weak.matchReasons.indexOf('history:already_delivered'))
    expect(HISTORY_HOLDBACK_PENALTY).toBeGreaterThan(0)
  })

  test('a template that was not viable anyway is left untouched, with no reason', () => {
    const r = resolveTemplates(makeCaseState({ domain: 'valuation' }), strategy, makeTemplates(), {
      pooledAdjustments: [adj({ dimension: 'domain', value: 'valuation', size: -5 })]
    })
    const qfd = r.scoringLog.find(t => t.title === QFD)
    if (qfd && qfd.score <= 0) {
      expect(qfd.matchReasons.some(x => x.startsWith('pooled:'))).toBe(false)
    }
  })

  test('resolveTemplatesWithOutlier passes the adjustments through to both passes', () => {
    const r = resolveTemplatesWithOutlier(makeCaseState(), strategy, makeTemplates(), {
      distinctionBoosts: { 'Working Capital Cycle': 20 },
      pooledAdjustments: [adj({ size: -3 })],
      pooledSignalTypes: []
    })
    expect(reasonsOf(r.primary, QFD)).toContain('pooled:held_back-3')
  })

  // Found by the 4.87 quickstart on 2026-09-12: the trace named the evidence of EVERY live
  // adjustment for a title, not of the ones that matched this session, so "held back in
  // {where}" could name a situation the session was never in, with the wrong size.
  test('the log entry names, by id, only the adjustments that matched this session', () => {
    const matching = adj({ id: 'qfd|domain|profit' })
    const notMatching = adj({ id: 'qfd|industry|bakery', dimension: 'industry', value: 'bakery', size: -5 })
    const r = run({ pooledAdjustments: [notMatching, matching] })
    const entry = r.scoringLog.find(t => t.title === QFD)
    expect(entry.matchReasons).toContain('pooled:held_back-2')
    expect(entry.pooledMatched).toEqual(['qfd|domain|profit'])
    // Outweighed carries the same ids, so the panel can say what was set aside.
    const lifted = run({ pooledAdjustments: [notMatching, matching], distinctionBoosts: LIFT_ALL })
    expect(reasonsOf(lifted, QFD)).toContain('pooled:outweighed-distinction')
    expect(lifted.scoringLog.find(t => t.title === QFD).pooledMatched).toEqual(['qfd|domain|profit'])
    // A template nothing matched carries no such key, so an unchanged run stays identical.
    expect('pooledMatched' in r.scoringLog.find(t => t.title === 'Working Capital Cycle')).toBe(false)
  })

  // Found the same day: the log is the top 20 by score, and a hold-back that pushed a
  // template below 20th made it vanish from the trace, so the advisor was never shown it.
  test('a held-back template that falls outside the top 20 stays in the log', () => {
    const crowd = Array.from({ length: 24 }, (_, i) => ({
      page: `crowd-${i}`, title: `Crowd Tool ${i}`, section: 'Do the Job', subSection: 'General Tools', tags: ['cash'], purpose: 'understand the working capital cycle'
    }))
    const templates = makeTemplates().concat(crowd)
    const plain = resolveTemplates(makeCaseState(), strategy, templates)
    expect(plain.scoringLog).toHaveLength(20)
    expect(plain.scoringLog.some(t => t.title === 'Weak Affinity Tool')).toBe(false)
    const held = resolveTemplates(makeCaseState(), strategy, templates, {
      pooledAdjustments: [adj({ template: 'Weak Affinity Tool', size: -10 })]
    })
    const weak = held.scoringLog.find(t => t.title === 'Weak Affinity Tool')
    expect(weak).toBeDefined()
    expect(weak.score).toBe(1)
    expect(weak.matchReasons).toContain('pooled:held_back-10')
    expect(held.scoringLog).toHaveLength(21)
  })
})
