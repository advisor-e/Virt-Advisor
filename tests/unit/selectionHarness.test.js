'use strict'

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-DOMAIN TEMPLATE-SELECTION HARNESS — the regression net that was missing.
//
// Why this exists: for 20 rounds, a scoring input would silently die (a drifted
// signal-scope, a starved category, an un-regenerated profile) and NO test went
// red — we only found out in a live session. This harness drives the REAL
// deterministic resolver (no AI) with representative advisor cases per domain and
// asserts WHICH templates surface. Two layers:
//
//   1. SNAPSHOT (the net) — captures the ranked candidate pool for every scenario.
//      Green today (records current behaviour). When we re-point scoring to the
//      single source, the snapshot diff shows EXACTLY what moved, in every domain,
//      so nothing changes silently. Update intentionally with `jest -u`.
//
//   2. TARGET assertions — the outcomes the engine SHOULD produce (e.g. the café
//      profitability case must surface the Cafe revenue model). Some are `.skip`
//      today because the known scoring bugs (DOMAIN_SIGNAL_SCOPE drift, profile
//      coverage, category starvation) suppress them. Each skipped target flips to
//      a live `test()` as its fix lands — that is the acceptance criterion.
//
// The resolver is a pure function (no AI), so this is fully deterministic.
// ─────────────────────────────────────────────────────────────────────────────

const { resolveTemplates } = require('../../server/utils/templateResolver')
const templates = require('../../data/templates.json')

// Build a minimal CaseState the resolver reads. solutionCategories mirrors the
// CURRENT live behaviour (deriveSolutionCategories returns ~[domain] post-battery)
// so the baseline is honest; the fix will widen it from the live signal lever.
function caseFor ({ domain, problemSignals = {}, growthStage = null, confidence = null, industry = null }) {
  return {
    domain,
    primaryIssue: '', // null in the live flow since the cold selector was removed
    industry,
    solutionCategories: [domain],
    client: growthStage ? { growthStage } : {},
    complexityCeiling: 'analytical',
    advisor: confidence ? { confidence } : {},
    problemSignals
  }
}

// Run the "best possible" pass (ignoreCeiling) so we test SCORING, not the ceiling.
function run (scenario) {
  const strategy = { engagementType: scenario.engagementType, templateBudget: scenario.budget || 3 }
  const res = resolveTemplates(caseFor(scenario), strategy, templates, { ignoreCeiling: true })
  return {
    selected: res.selected.map(t => t.title),
    top10: res.scoringLog.slice(0, 10).map(t => `${t.score} · ${t.title} [${t.subSection}]`)
  }
}

// ── Representative scenarios — one per major signal/domain ────────────────────
const SCENARIOS = {
  'profit · café pricing+feasibility': {
    domain: 'profit',
    engagementType: 'education',
    budget: 3,
    growthStage: 'Leverage',
    confidence: 'low',
    industry: 'a couple of cafes', // the real (voice-transcribed) industry answer
    problemSignals: { revenue_modelling: 1, pricing_issue: 1 }
  },
  'forecasting · cash flow': {
    domain: 'forecasting',
    engagementType: 'education',
    budget: 2,
    problemSignals: { cash_flow_gap: 1 }
  },
  'staff · performance': {
    domain: 'staff',
    engagementType: 'facilitation',
    budget: 2,
    problemSignals: { staff_problem: 1 }
  },
  'sales-marketing · low volume': {
    domain: 'sales-marketing',
    engagementType: 'facilitation',
    budget: 2,
    problemSignals: { sales_volume: 1 }
  },
  'data-systems · data quality': {
    domain: 'data-systems',
    engagementType: 'education',
    budget: 2,
    problemSignals: { data_quality: 1 }
  },
  'governance · board/accountability': {
    domain: 'governance',
    engagementType: 'facilitation',
    budget: 2,
    problemSignals: { governance_gap: 1 }
  },
  'stock-purchasing · overstock': {
    domain: 'stock-purchasing',
    engagementType: 'education',
    budget: 2,
    problemSignals: { stock_management: 1 }
  },
  'raising-capital · funding growth': {
    domain: 'raising-capital',
    engagementType: 'education',
    budget: 2,
    problemSignals: { capital_raising: 1 }
  }
}

describe('selection harness — snapshot net (records current ranking per scenario)', () => {
  for (const [name, scenario] of Object.entries(SCENARIOS)) {
    test(name, () => {
      expect(run(scenario)).toMatchSnapshot()
    })
  }
})

// ── TARGET assertions — what the engine SHOULD produce (acceptance criteria) ──
// These encode Mike's stated correct outcomes. They are `.skip` while the known
// scoring bugs suppress them; each flips to `test()` as its fix lands.
describe('selection harness — TARGET outcomes (flip .skip → test as fixes land)', () => {
  // The café case: revenue_modelling now in-scope for profit (single-source signal
  // scope) lights the semantic match, and the industry boost lifts the café-specific
  // Cafe model above the other (tied) industry models. LIVE now.
  test('café profitability surfaces the Cafe revenue model', () => {
    const { top10 } = run(SCENARIOS['profit · café pricing+feasibility'])
    expect(top10.join('\n')).toMatch(/· Cafe \[/)
  })

  // Upselling mentioned → a sales tool should be reachable in a profit/sales case.
  test.skip('profit/sales case surfaces Sales Session', () => {
    const { top10 } = run(SCENARIOS['profit · café pricing+feasibility'])
    expect(top10.join('\n')).toMatch(/Sales Session/)
  })
})
