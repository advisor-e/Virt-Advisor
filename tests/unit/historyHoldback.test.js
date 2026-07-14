'use strict'

// Client-history hold-back (Option A — product owner 2026-07-14): a template the
// client has already received is DISCOURAGED in scoring, never banned, and the
// hold-back is visible in the trace. Locks:
//   - the penalty + reason codes fire for delivered titles (case-insensitive)
//   - went-less-well sessions get their own reason code, case-level only
//   - a strongly-matched repeat can STILL WIN (Option A, not a ban)
//   - no priorHoldback → identical behaviour to before (regression guard)
//   - deriveHistoryScoringInputs: honest attribution from case-level reviews

const { resolveTemplates } = require('../../server/utils/templateResolver')
const { deriveHistoryScoringInputs, buildPriorEngagementSummary, HISTORY_HOLDBACK_PENALTY } = require('../../server/utils/priorEngagement')

// Minimal template pool — same domain, comparable structural scores.
function makeTemplates () {
  return [
    { page: 'id-1', title: 'Quick Fire Diagnosis', section: 'Do the Job', subSection: 'General Tools', tags: ['diagnosis'], purpose: 'diagnose the source of the business issue' },
    { page: 'id-2', title: 'Working Capital Cycle', section: 'Do the Job', subSection: 'General Tools', tags: ['cash'], purpose: 'understand the working capital cycle' },
    { page: 'id-3', title: 'Break-Even Analysis', section: 'Do the Job', subSection: 'General Tools', tags: ['costs'], purpose: 'find the break-even point' },
    // Deliberately low-affinity (non-preferred subSection, no tags/purpose):
    // scores just above zero, so the clamp floor genuinely gets exercised.
    { page: 'id-4', title: 'Weak Affinity Tool', section: 'Do the Job', subSection: 'Reporting', tags: [], purpose: '' }
  ]
}

function makeCaseState (over = {}) {
  return {
    domain: 'profit',
    primaryIssue: null,
    industry: null,
    solutionCategories: [],
    client: {},
    advisor: {},
    complexityCeiling: 'strategic',
    problemSignals: {},
    ...over
  }
}

const strategy = { engagementType: 'education', templateBudget: 3 }

// Lift every template to a realistic positive score (real sessions run 20–39)
// so the exact-penalty assertions are meaningful and nothing sits near zero.
const LIFT_ALL = { 'Quick Fire Diagnosis': 20, 'Working Capital Cycle': 20, 'Break-Even Analysis': 20 }

describe('resolver history hold-back (Option A)', () => {
  test('a delivered template is penalised with the already_delivered reason', () => {
    const withHoldback = resolveTemplates(makeCaseState(), strategy, makeTemplates(), {
      distinctionBoosts: LIFT_ALL,
      priorHoldback: { delivered: ['Quick Fire Diagnosis'], wentLessTitles: [] }
    })
    const without = resolveTemplates(makeCaseState(), strategy, makeTemplates(), { distinctionBoosts: LIFT_ALL })

    const qfdHeld = withHoldback.scoringLog.find(t => t.title === 'Quick Fire Diagnosis')
    const qfdFree = without.scoringLog.find(t => t.title === 'Quick Fire Diagnosis')

    expect(qfdHeld.matchReasons).toContain('history:already_delivered')
    expect(qfdFree.score - qfdHeld.score).toBe(HISTORY_HOLDBACK_PENALTY)
  })

  test('a went-less-well session marks its templates with the distinct reason code', () => {
    const r = resolveTemplates(makeCaseState(), strategy, makeTemplates(), {
      distinctionBoosts: LIFT_ALL,
      priorHoldback: { delivered: ['Quick Fire Diagnosis', 'Working Capital Cycle'], wentLessTitles: ['Working Capital Cycle'] }
    })
    const qfd = r.scoringLog.find(t => t.title === 'Quick Fire Diagnosis')
    const wcc = r.scoringLog.find(t => t.title === 'Working Capital Cycle')

    expect(qfd.matchReasons).toContain('history:already_delivered')
    expect(wcc.matchReasons).toContain('history:went_less_well')
    expect(wcc.matchReasons).not.toContain('history:already_delivered')
  })

  test('title matching is case-insensitive (saved names must not need exact casing)', () => {
    const r = resolveTemplates(makeCaseState(), strategy, makeTemplates(), {
      distinctionBoosts: LIFT_ALL,
      priorHoldback: { delivered: ['  quick fire diagnosis  '], wentLessTitles: [] }
    })
    expect(r.scoringLog.find(t => t.title === 'Quick Fire Diagnosis').matchReasons)
      .toContain('history:already_delivered')
  })

  test('the penalty follows max(1, score − penalty) — a viable template NEVER vanishes from the log', () => {
    // Measure each template's baseline without history, then assert the exact
    // clamp formula with it — no magic numbers, valid whatever the base scores.
    // A raw (unclamped) penalty would push weak-but-viable templates below the
    // ranking gate (score > 0) and they would silently disappear from the log —
    // the exact defect class this feature removes.
    const pool = makeTemplates()
    const delivered = pool.map(t => t.title)
    const without = resolveTemplates(makeCaseState(), strategy, pool, {})
    const withHold = resolveTemplates(makeCaseState(), strategy, pool, {
      priorHoldback: { delivered, wentLessTitles: [] }
    })
    for (const base of without.scoringLog) {
      const held = withHold.scoringLog.find(t => t.title === base.title)
      expect(held).toBeDefined() // visible before history → still visible after
      expect(held.score).toBe(Math.max(1, base.score - HISTORY_HOLDBACK_PENALTY))
      expect(held.score).toBeGreaterThanOrEqual(1)
      expect(held.matchReasons).toContain('history:already_delivered')
    }
    // At least one template must actually exercise the floor (score clamped to 1),
    // or this test is not covering the branch it exists for.
    expect(withHold.scoringLog.some(t => t.score === 1)).toBe(true)
  })

  test('DISCOURAGED, not banned: a strongly-matched repeat still outranks weak alternatives', () => {
    // Give the delivered template a dominant boost (a firm distinction larger
    // than the penalty) — Option A means it can still win.
    const r = resolveTemplates(makeCaseState(), strategy, makeTemplates(), {
      distinctionBoosts: { 'Quick Fire Diagnosis': 20 },
      priorHoldback: { delivered: ['Quick Fire Diagnosis'], wentLessTitles: [] }
    })
    expect(r.selected[0].title).toBe('Quick Fire Diagnosis')
    // And the hold-back is still VISIBLE on the winner — never silent.
    expect(r.selected[0].matchReasons).toContain('history:already_delivered')
  })

  test('no priorHoldback option → scores and reasons identical to before (regression)', () => {
    const a = resolveTemplates(makeCaseState(), strategy, makeTemplates(), {})
    const b = resolveTemplates(makeCaseState(), strategy, makeTemplates(), { priorHoldback: null })
    expect(b.scoringLog.map(t => ({ t: t.title, s: t.score })))
      .toEqual(a.scoringLog.map(t => ({ t: t.title, s: t.score })))
    expect(a.scoringLog.every(t => !t.matchReasons.some(r => r.startsWith('history:')))).toBe(true)
  })
})

describe('deriveHistoryScoringInputs — honest case-level attribution', () => {
  function summaryFrom (cases) { return buildPriorEngagementSummary(cases) }

  test('null summary → null (no history, no inputs)', () => {
    expect(deriveHistoryScoringInputs(null)).toBeNull()
  })

  test('all delivered titles are listed; only went-less sessions mark their templates', () => {
    const s = summaryFrom([
      {
        title: 'Session 2',
        templates: ['Working Capital Cycle'],
        review: { wentWell: '', wentLess: 'ran long, owner lost', changesRecommended: 'split into two' },
        createdAt: '2026-07-01T00:00:00.000Z'
      },
      {
        title: 'Session 1',
        templates: ['Quick Fire Diagnosis'],
        review: { wentWell: 'landed well', wentLess: '', changesRecommended: '' },
        createdAt: '2026-06-01T00:00:00.000Z'
      }
    ])
    const inputs = deriveHistoryScoringInputs(s)
    expect(inputs.delivered.sort()).toEqual(['Quick Fire Diagnosis', 'Working Capital Cycle'])
    expect(inputs.wentLessTitles).toEqual(['Working Capital Cycle'])
    // The advisor's pain words ride along for problem-signal extraction (rule 3).
    expect(inputs.reviewPainText).toContain('ran long')
    expect(inputs.reviewPainText).toContain('split into two')
    // Went-WELL text is not pain — it must not leak into the signal text.
    expect(inputs.reviewPainText).not.toContain('landed well')
  })

  test('a session with several templates and a went-less review marks them ALL — case-level honesty, no invented attribution', () => {
    const s = summaryFrom([{
      title: 'Combined session',
      templates: ['Quick Fire Diagnosis', 'Working Capital Cycle'],
      review: { wentWell: '', wentLess: 'second half dragged', changesRecommended: '' },
      createdAt: '2026-07-01T00:00:00.000Z'
    }])
    const inputs = deriveHistoryScoringInputs(s)
    expect(inputs.wentLessTitles.sort()).toEqual(['Quick Fire Diagnosis', 'Working Capital Cycle'])
  })

  test('unreviewed sessions contribute delivered titles but no pain text', () => {
    const s = summaryFrom([{
      title: 'Unreviewed',
      templates: ['Break-Even Analysis'],
      review: null,
      createdAt: '2026-07-01T00:00:00.000Z'
    }])
    const inputs = deriveHistoryScoringInputs(s)
    expect(inputs.delivered).toEqual(['Break-Even Analysis'])
    expect(inputs.wentLessTitles).toEqual([])
    expect(inputs.reviewPainText).toBe('')
  })
})

// Stage 5b: per-template outcomes make the hold-back TEMPLATE-precise —
// they are authoritative where present; case-level honesty remains the fallback.
describe('deriveHistoryScoringInputs — per-template outcome precision (5b)', () => {
  function summaryFrom (cases) { return buildPriorEngagementSummary(cases) }

  test("'didn't use it' removes the hold-back — the client never actually received it", () => {
    const s = summaryFrom([{
      title: 'Session',
      templates: ['Quick Fire Diagnosis', 'Working Capital Cycle'],
      review: { wentWell: 'fine', wentLess: '', changesRecommended: '' },
      templateOutcomes: [
        { title: 'Quick Fire Diagnosis', used: 'full', outcome: 'well' },
        { title: 'Working Capital Cycle', used: 'none', outcome: null }
      ],
      createdAt: '2026-07-01T00:00:00.000Z'
    }])
    const inputs = deriveHistoryScoringInputs(s)
    expect(inputs.delivered).toEqual(['Quick Fire Diagnosis'])
    expect(inputs.wentLessTitles).toEqual([])
  })

  test("outcomes are template-precise: only the 'didn't land' template gets the went-less reason, even though the case review has pain text", () => {
    const s = summaryFrom([{
      title: 'Combined session',
      templates: ['Quick Fire Diagnosis', 'Working Capital Cycle'],
      review: { wentWell: '', wentLess: 'the working capital half dragged', changesRecommended: '' },
      templateOutcomes: [
        { title: 'Quick Fire Diagnosis', used: 'full', outcome: 'well' },
        { title: 'Working Capital Cycle', used: 'partial', outcome: 'less' }
      ],
      createdAt: '2026-07-01T00:00:00.000Z'
    }])
    const inputs = deriveHistoryScoringInputs(s)
    // WITHOUT outcomes, case-level honesty would mark BOTH — with them, precision.
    expect(inputs.wentLessTitles).toEqual(['Working Capital Cycle'])
    expect(inputs.delivered.sort()).toEqual(['Quick Fire Diagnosis', 'Working Capital Cycle'])
    // The pain text still rides along for signal extraction.
    expect(inputs.reviewPainText).toContain('dragged')
  })

  test('the NEWEST record for a title wins — went badly in June, went well in July → judged on July', () => {
    const s = summaryFrom([
      {
        title: 'July',
        templates: ['Quick Fire Diagnosis'],
        review: null,
        templateOutcomes: [{ title: 'Quick Fire Diagnosis', used: 'full', outcome: 'well' }],
        createdAt: '2026-07-01T00:00:00.000Z'
      },
      {
        title: 'June',
        templates: ['Quick Fire Diagnosis'],
        review: { wentWell: '', wentLess: 'did not land at all', changesRecommended: '' },
        templateOutcomes: [{ title: 'Quick Fire Diagnosis', used: 'full', outcome: 'less' }],
        createdAt: '2026-06-01T00:00:00.000Z'
      }
    ])
    const inputs = deriveHistoryScoringInputs(s)
    expect(inputs.delivered).toEqual(['Quick Fire Diagnosis'])
    expect(inputs.wentLessTitles).toEqual([]) // July's 'well' outranks June's 'less'
  })

  test('engagements without outcomes keep the case-level fallback — mixed history behaves per engagement', () => {
    const s = summaryFrom([
      {
        title: 'With outcomes',
        templates: ['Quick Fire Diagnosis'],
        review: null,
        templateOutcomes: [{ title: 'Quick Fire Diagnosis', used: 'none', outcome: null }],
        createdAt: '2026-07-01T00:00:00.000Z'
      },
      {
        title: 'Pre-feature review',
        templates: ['Working Capital Cycle'],
        review: { wentWell: '', wentLess: 'dragged', changesRecommended: '' },
        createdAt: '2026-06-01T00:00:00.000Z'
      }
    ])
    const inputs = deriveHistoryScoringInputs(s)
    expect(inputs.delivered).toEqual(['Working Capital Cycle'])
    expect(inputs.wentLessTitles).toEqual(['Working Capital Cycle'])
  })

  test('the prompt text shows per-template outcomes in plain words', () => {
    const s = summaryFrom([{
      title: 'Session',
      templates: ['Quick Fire Diagnosis', 'Working Capital Cycle'],
      review: null,
      templateOutcomes: [
        { title: 'Quick Fire Diagnosis', used: 'full', outcome: 'well' },
        { title: 'Working Capital Cycle', used: 'partial', outcome: 'less' }
      ],
      createdAt: '2026-07-01T00:00:00.000Z'
    }])
    const { formatPriorEngagementText } = require('../../server/utils/priorEngagement')
    const text = formatPriorEngagementText(s, 'Vanoss Scaffolding')
    expect(text).toContain('Quick Fire Diagnosis: used fully, landed well')
    expect(text).toContain('Working Capital Cycle: partly used, did not land')
  })
})
