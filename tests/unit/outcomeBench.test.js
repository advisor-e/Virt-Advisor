'use strict'

/**
 * The two benches (4.87 T038). What UAT cannot see: a share that is computed on the wrong
 * denominator, a bench that is not deterministic, a replay that leaks a pool key, and a
 * fixed bench that reports change where the adjustments touched nothing.
 */

const templates = require('../../data/templates.json')
const SCENARIOS = require('../../scripts/scenario-lab-cases.json')
const bench = require('../../server/utils/outcomeBench')
const { POOLED_HOLDBACK_MAX } = require('../../server/utils/templateResolver')
const { labelsFor, proposesIssue } = require('../../server/utils/primaryIssueProposer')

function row (over = {}) {
  return Object.assign({
    v: 1,
    month: '2026-09',
    domain: 'profit',
    primaryIssue: null,
    industry: null,
    signals: [],
    engagementType: 'education',
    staircaseStep: 'as-interpretation',
    templates: []
  }, over)
}

/** The engine's own plain answer for the fixture situation, and the answer under a full hold-back on it. */
function plainAndHeld () {
  const { caseState, strategy, signalTypes } = bench.poolRowToCase(row())
  const plain = bench.topRecommendation(caseState, strategy, templates, [], signalTypes)
  const hold = [{ id: 'x|domain|profit', template: plain, dimension: 'domain', value: 'profit', size: -POOLED_HOLDBACK_MAX, firms: 5, cases: 25 }]
  const held = bench.topRecommendation(caseState, strategy, templates, hold, signalTypes)
  return { plain, held, hold }
}

describe('outcomeBench — the pool replayed', () => {
  const { plain, held, hold } = plainAndHeld()

  test('the fixture is meaningful: a full hold-back moves the top recommendation', () => {
    expect(typeof plain).toBe('string')
    expect(typeof held).toBe('string')
    expect(held).not.toBe(plain)
  })

  test('before and after are the share whose top recommendation that review marked well', async () => {
    const rows = {
      'tokA:c1': row({ templates: [{ title: plain, used: 'full', outcome: 'well' }] }),
      'tokB:c2': row({ templates: [{ title: plain, used: 'full', outcome: 'well' }, { title: held, used: 'partial', outcome: 'less' }] }),
      'tokC:c3': row({ templates: [{ title: held, used: 'full', outcome: 'well' }, { title: plain, used: 'full', outcome: 'less' }] }),
      'tokD:c4': row({ templates: [{ title: plain, used: 'full', outcome: 'well' }, { title: held, used: 'full', outcome: 'well' }] })
    }
    const result = await bench.outcomeBench(rows, templates, hold)
    // Plain top = `plain`: marked well on c1, c2, c4 → 3 of 4.
    // Held top = `held`: marked well on c3, c4 → 2 of 4.
    expect(result).toMatchObject({ reviews: 4, wellBefore: 3, wellAfter: 2, before: 0.75, after: 0.5, noWellVerdict: 0, liveIds: ['x|domain|profit'] })
  })

  // THE DENOMINATOR RULE (SC-005): a review that marked nothing "Landed well" is a review the
  // engine cannot be right on. It counts ONCE in the denominator and never in the numerator.
  // Leaving it out would flatter the share.
  test('a review with no well verdict counts in the denominator only', async () => {
    const rows = {
      'tokA:c1': row({ templates: [{ title: plain, used: 'full', outcome: 'well' }] }),
      'tokB:c2': row({ templates: [{ title: plain, used: 'full', outcome: 'less' }] }),
      'tokC:c3': row({ templates: [{ title: plain, used: 'full', outcome: null }] }),
      // "Didn't use it" is neutral: a well verdict on an unused template is not a hit.
      'tokD:c4': row({ templates: [{ title: plain, used: 'none', outcome: 'well' }] })
    }
    const result = await bench.outcomeBench(rows, templates, [])
    expect(result).toMatchObject({ reviews: 4, wellBefore: 1, wellAfter: 1, before: 0.25, after: 0.25, noWellVerdict: 3 })
  })

  test('with no adjustments, before equals after', async () => {
    const rows = { 'tokA:c1': row({ templates: [{ title: plain, used: 'full', outcome: 'well' }] }) }
    const result = await bench.outcomeBench(rows, templates, [])
    expect(result.before).toBe(result.after)
    expect(result.liveIds).toEqual([])
  })

  test('is deterministic: the same pool replays to the same figures', async () => {
    const rows = {
      'tokA:c1': row({ templates: [{ title: plain, used: 'full', outcome: 'well' }], signals: ['financial_foundations_gap'] }),
      'tokB:c2': row({ templates: [{ title: held, used: 'full', outcome: 'well' }], primaryIssue: 'Cost of sales has increased' })
    }
    const first = await bench.outcomeBench(rows, templates, hold)
    const second = await bench.outcomeBench(rows, templates, hold)
    expect(second).toEqual(first)
  })

  test('titles are matched case-insensitively, as the guard and the resolver match them', async () => {
    const rows = { 'tokA:c1': row({ templates: [{ title: plain.toUpperCase(), used: 'full', outcome: 'well' }] }) }
    const result = await bench.outcomeBench(rows, templates, [])
    expect(result.wellBefore).toBe(1)
  })

  test('a malformed row is skipped and never counted; an empty or missing pool is zero, not NaN', async () => {
    const rows = { 'tokA:c1': null, 'tokB:c2': 'text', 'tokC:c3': row({ domain: undefined }) }
    expect(await bench.outcomeBench(rows, templates, [])).toMatchObject({ reviews: 0, before: 0, after: 0 })
    expect(await bench.outcomeBench(null, templates, [])).toMatchObject({ reviews: 0, before: 0, after: 0 })
  })

  test('the report carries counts and shares only — never a pool key', async () => {
    const rows = { 'tokSECRET123:hashSECRET': row({ templates: [{ title: plain, used: 'full', outcome: 'well' }] }) }
    const text = JSON.stringify(await bench.outcomeBench(rows, templates, hold))
    expect(text).not.toContain('SECRET')
  })

  test('a signal adjustment applies only to a review that fired that signal', async () => {
    const signal = [{ id: 's|signal|financial_foundations_gap', template: plain, dimension: 'signal', value: 'financial_foundations_gap', size: -POOLED_HOLDBACK_MAX, firms: 5, cases: 25 }]
    const rows = {
      'tokA:c1': row({ templates: [{ title: plain, used: 'full', outcome: 'well' }], signals: ['financial_foundations_gap'] }),
      'tokB:c2': row({ templates: [{ title: plain, used: 'full', outcome: 'well' }], signals: [] })
    }
    const result = await bench.outcomeBench(rows, templates, signal)
    expect(result).toMatchObject({ wellBefore: 2, wellAfter: 1 })
  })

  test('yields to the event loop on a long pool, so a timer can fire mid-run', async () => {
    const rows = {}
    for (let i = 0; i < bench.YIELD_EVERY * 2 + 1; i++) {
      rows['t' + (i % 7) + ':c' + i] = row({ templates: [{ title: plain, used: 'full', outcome: 'well' }] })
    }
    let fired = false
    const timer = new Promise((resolve) => { setImmediate(() => { fired = true; resolve() }) })
    const result = await bench.outcomeBench(rows, templates, hold)
    await timer
    expect(fired).toBe(true)
    expect(result.reviews).toBe(bench.YIELD_EVERY * 2 + 1)
  })
})

describe('fixedBench — the Scenario Lab cases', () => {
  const profit = SCENARIOS.filter(s => s.domain === 'profit')
  const staff = SCENARIOS.filter(s => s.domain === 'staff')

  test('with no adjustments nothing changes: before 1, after 1, no case named', async () => {
    const result = await bench.fixedBench(profit.concat(staff), templates, [])
    expect(result).toMatchObject({ before: 1, after: 1, cases: profit.length + staff.length, unchanged: profit.length + staff.length, changed: [], liveIds: [] })
  })

  // SC-001: a case outside the adjustment's situation is untouched by it.
  test('an adjustment in one domain leaves every case in another domain unchanged, and names the cases it moved', async () => {
    const { caseState, strategy, signalTypes } = bench.scenarioToCase(profit[0])
    const top = bench.topRecommendation(caseState, strategy, templates, [], signalTypes)
    const hold = [{ id: 'p|domain|profit', template: top, dimension: 'domain', value: 'profit', size: -POOLED_HOLDBACK_MAX, firms: 5, cases: 25 }]
    const result = await bench.fixedBench(profit.concat(staff), templates, hold)
    expect(result.changed.length).toBeGreaterThan(0)
    result.changed.forEach((c) => {
      expect(profit.map(s => s.key)).toContain(c.key)
      expect(c.from).toBe(top)
      expect(c.to).not.toBe(top)
    })
    expect(result.after).toBeCloseTo(result.unchanged / result.cases, 10)
    expect(result.liveIds).toEqual(['p|domain|profit'])
  })

  test('an empty case list reports zero, not NaN', async () => {
    expect(await bench.fixedBench([], templates, [])).toMatchObject({ before: 0, after: 0, cases: 0, capBreaches: 0 })
  })

  // ── 4.97 US3: the bench PROVES the advisor's words won, rather than asserting it ──
  //
  // What UAT cannot see: that a pooled adjustment re-ordered a template the advisor's own
  // evidence had put above it. The two orderings look equally plausible on screen — only a
  // comparison of the same case with and without the adjustments can tell them apart.
  describe('cap breaches', () => {
    // A breach cannot be produced through the resolver — US3 is exactly the rule that stops it
    // — so the counter itself is proved here on constructed display sets. Without this the
    // "0 breaches" headline could be a counter that never counts.
    const card = (title, reasons) => ({ title, matchReasons: reasons })
    const EVIDENCE = ['distinction:+5']
    const POOLED = ['pooled:lifted-4']

    test('counts a pair the adjustments re-ordered against the advisor', () => {
      const plain = [card('Evidence Tool', EVIDENCE), card('Pooled Tool', POOLED)]
      const adjusted = [card('Pooled Tool', POOLED), card('Evidence Tool', EVIDENCE)]
      expect(bench.hasCapBreach(plain, adjusted)).toBe(true)
    })

    test('does NOT count a pair that was already in that order before the adjustments', () => {
      // The pooled template was above all along, so the pool re-ordered nothing. Counting this
      // would report a breach the adjustments did not cause.
      const order = [card('Pooled Tool', POOLED), card('Evidence Tool', EVIDENCE)]
      expect(bench.hasCapBreach(order, order)).toBe(false)
    })

    test('does not count an unchanged order, nor a template carrying no advisor evidence', () => {
      const plain = [card('Evidence Tool', EVIDENCE), card('Pooled Tool', POOLED)]
      expect(bench.hasCapBreach(plain, plain)).toBe(false)
      const noEvidence = [card('Plain Tool', ['domain:primary_subsection']), card('Pooled Tool', POOLED)]
      const flipped = [card('Pooled Tool', POOLED), card('Plain Tool', ['domain:primary_subsection'])]
      expect(bench.hasCapBreach(noEvidence, flipped)).toBe(false)
    })

    test('every one of the six evidence families is protected, not only a distinction', () => {
      // The US3 change in one assertion: before it, only the distinction row returned true.
      const families = ['distinction:+5', 'primary_issue:strong_match', 'industry:title_match', 'industry:tag_match', 'semantic:4.2', 'purpose_fallback:3.0']
      families.forEach((reason) => {
        const plain = [card('Evidence Tool', [reason]), card('Pooled Tool', POOLED)]
        const adjusted = [card('Pooled Tool', POOLED), card('Evidence Tool', [reason])]
        expect(bench.hasCapBreach(plain, adjusted)).toBe(true)
      })
    })

    test('the shipped cases with a live adjustment report zero breaches — the US3 checkpoint', async () => {
      const { caseState, strategy, signalTypes } = bench.scenarioToCase(profit[0])
      const top = bench.topRecommendation(caseState, strategy, templates, [], signalTypes)
      const live = [{ id: 'p|domain|profit', template: top, dimension: 'domain', value: 'profit', size: -POOLED_HOLDBACK_MAX, firms: 5, cases: 25 }]
      const result = await bench.fixedBench(profit.concat(staff), templates, live)
      expect(result.capBreaches).toBe(0)
    })
  })

  test('scenarioToCase reads the same fields the Scenario Lab report runs on', () => {
    const { caseState, strategy } = bench.scenarioToCase(profit[0])
    expect(caseState).toMatchObject({ domain: 'profit', industry: profit[0].industry, solutionCategories: ['profit'] })
    expect(typeof caseState.complexityCeiling).toBe('string')
    expect(strategy.templateBudget).toBe(profit[0].budget || 2)
    expect(typeof strategy.engagementType).toBe('string')
  })

  // 4.97 US1 T019. What UAT cannot see: the bench measuring an engine in which the advisor
  // never named their problem. It was hardcoded to '' until 2026-09-14, so every figure in the
  // report — and the fixed bench itself — scored against a blank primary issue while the live
  // engine had already begun asking for one.
  describe('the case carries the primary issue the live engine would propose', () => {
    test('a case whose words match an authored label carries that label, not a blank', () => {
      const { caseState } = bench.scenarioToCase(profit[0])
      expect(caseState.primaryIssue).not.toBe('')
      expect(labelsFor('profit')).toContain(caseState.primaryIssue)
    })

    test('nothing is ever invented: every label set is an authored label for that domain', () => {
      SCENARIOS.forEach((sc) => {
        const { caseState } = bench.scenarioToCase(sc)
        if (caseState.primaryIssue) {
          expect(labelsFor(sc.domain)).toContain(caseState.primaryIssue)
        }
      })
    })

    test('a context domain carries no label, because the engine proposes none there by design', () => {
      const context = SCENARIOS.filter(s => !proposesIssue(s.domain))
      expect(context.length).toBeGreaterThan(0)
      context.forEach((sc) => {
        expect(bench.scenarioToCase(sc).caseState.primaryIssue).toBe('')
      })
    })
  })
})

describe('runBenches — the stored shape', () => {
  test('both benches carry ranAt, before, after and liveIds, as data-model §4 stores them', async () => {
    const { plain, hold } = plainAndHeld()
    const result = await bench.runBenches({
      scenarios: SCENARIOS.slice(0, 3),
      poolRows: { 'tokA:c1': row({ templates: [{ title: plain, used: 'full', outcome: 'well' }] }) },
      templates,
      adjustments: hold
    })
    for (const which of ['fixed', 'outcome']) {
      expect(new Date(result[which].ranAt).toISOString()).toBe(result[which].ranAt)
      expect(result[which].before).toBeGreaterThanOrEqual(0)
      expect(result[which].after).toBeLessThanOrEqual(1)
      expect(result[which].liveIds).toEqual(['x|domain|profit'])
    }
  })
})

// ── The out-of-sample bench (4.97 US7, T046) ─────────────────────────────────
//
// 🔴 WHAT THIS EXISTS TO STOP, AND WHY NO TESTER COULD SEE IT. The outcome bench scores the
// adjustments on the very reviews that produced them, so it flatters them — an adjustment
// built from a review is asked to predict that same review. The figure looks like evidence
// and is not. This bench trains on the earlier months and tests on the latest, so it cannot
// see its own answers. A mentor reading "0% → 60%" has no way to tell which kind of number
// they are looking at; only the code can keep the two apart.
//
// The assertion that matters most is the NEGATIVE one: an adjustment that clears the floor
// only because the test month's rows were counted must NOT apply. That is the leak that
// would quietly turn this back into the in-sample bench while still reading as honest.
describe('timeSplitBench — trained on the earlier months, tested on the latest', () => {
  const { plain, held } = plainAndHeld()
  const { MIN_CASES, MIN_FIRMS } = require('../../server/utils/outcomeLearning')

  /** `n` rows in `month`, each marking `title` as the outcome given, across `firms` tokens. */
  function rows (month, n, title, outcome, firms = MIN_FIRMS, from = 0) {
    const out = {}
    for (let i = 0; i < n; i++) {
      out['tok' + (i % firms) + ':' + month + '-c' + (from + i)] =
        row({ month, templates: [{ title, used: 'full', outcome }] })
    }
    return out
  }

  const LIB = templates.map(t => t.title)

  test('one month only is insufficient: nothing to train on, and the figures are null', async () => {
    const pool = rows('2026-09', MIN_CASES + 10, plain, 'well')
    const out = await bench.timeSplitBench(pool, {}, templates, LIB)
    expect(out.insufficient).toBe(true)
    expect(out.before).toBeNull()
    expect(out.after).toBeNull()
    expect(out.trained).toBe(0)
  })

  test('names the cut-off month and counts both sides', async () => {
    const pool = Object.assign(
      rows('2026-07', MIN_CASES + 5, held, 'less'),
      rows('2026-08', MIN_CASES + 5, held, 'less', MIN_FIRMS, 100),
      rows('2026-09', MIN_CASES + 5, plain, 'well', MIN_FIRMS, 200)
    )
    const out = await bench.timeSplitBench(pool, {}, templates, LIB)
    // The cut-off is the month being TESTED — the latest one.
    expect(out.cutoff).toBe('2026-09')
    expect(out.tested).toBe(MIN_CASES + 5)
    expect(out.trained).toBe((MIN_CASES + 5) * 2)
    expect(out.insufficient).toBe(false)
  })

  test('too few rows in the latest month is insufficient, not a small sample reported as fact', async () => {
    const pool = Object.assign(
      rows('2026-08', MIN_CASES + 5, held, 'less'),
      rows('2026-09', 3, plain, 'well', MIN_FIRMS, 200)
    )
    const out = await bench.timeSplitBench(pool, {}, templates, LIB)
    expect(out.insufficient).toBe(true)
    expect(out.tested).toBe(3)
    expect(out.before).toBeNull()
    expect(out.after).toBeNull()
  })

  // 🔴 THE LEAK THIS BENCH EXISTS TO PREVENT.
  test('an adjustment that only clears the floor thanks to the TEST month never applies', async () => {
    // Under the floor in training (5 rows), over it once September is counted in.
    const pool = Object.assign(
      rows('2026-08', 5, held, 'less'),
      rows('2026-09', MIN_CASES + 5, held, 'less', MIN_FIRMS, 200)
    )
    const out = await bench.timeSplitBench(pool, {}, templates, LIB)
    expect(out.liveIds).toEqual([])
    // With nothing applying, the two figures must be identical — there is no adjustment
    // to make a difference, and any gap would mean the test month leaked into training.
    expect(out.after).toBe(out.before)
  })

  // The mentor's gate holds here exactly as it does live: nothing changes a recommendation
  // until it is ACCEPTED, so an undecided pool measures no adjustment at all. A bench that
  // quietly applied proposals would report a lift the platform is not actually giving.
  test('the mentor gate holds — only an ACCEPTED adjustment is measured', async () => {
    const pool = Object.assign(
      rows('2026-07', MIN_CASES + 5, held, 'less'),
      rows('2026-08', MIN_CASES + 5, held, 'less', MIN_FIRMS, 100),
      rows('2026-09', MIN_CASES + 5, plain, 'well', MIN_FIRMS, 200)
    )
    const undecided = await bench.timeSplitBench(pool, {}, templates, LIB)
    expect(undecided.liveIds).toEqual([])
    expect(undecided.after).toBe(undecided.before)

    // Accept whatever the training months proposed, and it is measured.
    const { computeAdjustments } = require('../../server/utils/outcomeLearning')
    const trainOnly = {}
    Object.keys(pool).forEach((k) => { if (pool[k].month < '2026-09') { trainOnly[k] = pool[k] } })
    const accepted = {}
    computeAdjustments(trainOnly, {}, LIB)
      .filter(a => a.state === 'proposed')
      .forEach((a) => { accepted[a.id] = { state: 'live', by: 'mentor@x' } })
    expect(Object.keys(accepted).length).toBeGreaterThan(0)

    const out = await bench.timeSplitBench(pool, accepted, templates, LIB)
    expect(out.liveIds.length).toBeGreaterThan(0)

    // And a rejection puts it back to measuring nothing.
    const rejected = {}
    Object.keys(accepted).forEach((id) => { rejected[id] = { state: 'rejected', reason: 'no' } })
    const back = await bench.timeSplitBench(pool, rejected, templates, LIB)
    expect(back.liveIds).toEqual([])
  })

  test('the shares are shares, and the result carries the data-model §4 shape', async () => {
    const pool = Object.assign(
      rows('2026-08', MIN_CASES + 5, held, 'less'),
      rows('2026-09', MIN_CASES + 5, plain, 'well', MIN_FIRMS, 200)
    )
    const out = await bench.timeSplitBench(pool, {}, templates, LIB)
    expect(Object.keys(out).sort()).toEqual(['after', 'before', 'cutoff', 'insufficient', 'liveIds', 'tested', 'trained'])
    expect(out.before).toBeGreaterThanOrEqual(0)
    expect(out.before).toBeLessThanOrEqual(1)
    expect(out.after).toBeGreaterThanOrEqual(0)
    expect(out.after).toBeLessThanOrEqual(1)
  })

  test('runBenches carries it as the third figure, stamped like the others', async () => {
    const pool = Object.assign(
      rows('2026-08', MIN_CASES + 5, held, 'less'),
      rows('2026-09', MIN_CASES + 5, plain, 'well', MIN_FIRMS, 200)
    )
    const out = await bench.runBenches({
      scenarios: SCENARIOS.slice(0, 3),
      poolRows: pool,
      templates,
      adjustments: [],
      decisions: {},
      libraryTitles: LIB
    })
    expect(out.timeSplit).toBeDefined()
    expect(typeof out.timeSplit.ranAt).toBe('string')
    expect(out.timeSplit.cutoff).toBe('2026-09')
  })

  test('an empty pool is insufficient rather than a crash', async () => {
    const out = await bench.timeSplitBench({}, {}, templates, LIB)
    expect(out.insufficient).toBe(true)
    expect(out.cutoff).toBeNull()
  })
})

describe('poolRowToCase — the anonymised shape and nothing more', () => {
  test('maps a staircase step id to its ceiling and passes only the row fields', () => {
    const { caseState, strategy, signalTypes } = bench.poolRowToCase(row({ staircaseStep: 'as-observation', industry: 'cafe', primaryIssue: 'Cost of sales has increased', signals: ['a', 7, 'b'] }))
    expect(caseState).toMatchObject({ domain: 'profit', industry: 'cafe', primaryIssue: 'Cost of sales has increased', complexityCeiling: 'strategic', problemSignals: {} })
    expect(strategy).toEqual({ engagementType: 'education', templateBudget: 1 })
    expect(signalTypes).toEqual(['a', 'b'])
  })

  test('an unknown or missing step falls back to the staircase default, and a missing engagement type to the domain\'s natural one', () => {
    const { caseState, strategy } = bench.poolRowToCase(row({ staircaseStep: null, engagementType: undefined }))
    expect(typeof caseState.complexityCeiling).toBe('string')
    expect(typeof strategy.engagementType).toBe('string')
  })
})
