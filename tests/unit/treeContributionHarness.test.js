'use strict'

// ─────────────────────────────────────────────────────────────────────────────
// TREE-CONTRIBUTION HARNESS — does a dormant logic tree make the engine better?
//
// Purpose: measure, deterministically, whether a logic tree's diagnostic content
// improves template selection over the signal-scoring engine ALONE. Built to
// answer Mike's question (2026-06-23): are the 28 dormant trees worth hooking up?
//
// Design principle being tested (see memory: design-logic-trees-guide-not-replace):
//   • The tree GUIDES the engine — it does not replace it.
//   • A tree's named templates are a SOFT HINT (a modest boost), never an override.
//     Template names age; the reasoning does not — so the hint is deliberately weak.
//
// Two passes through the SAME real resolver (no AI, fully deterministic):
//   PASS A — engine today:        signals only.
//   PASS B — tree-assisted:       the SAME real resolver, given the tree's named templates
//                                  via the production `treeHintNames` option (the wired
//                                  soft-hint boost — not a hand-rolled model).
//
// What this file LOCKS today: the objective comparison (snapshot) — what each pass
// ranks, and exactly what the tree moved. It needs NO ground truth to be useful.
//
// What is still PENDING: the verdict assertions ("the CORRECT template surfaces").
// Those encode Mike's stated correct answers and stay `.skip` until he confirms
// them — the engine must not grade its own homework, and the tree must not grade
// its own either. Flip each `.skip` → `test()` once the correct answer is locked.
// ─────────────────────────────────────────────────────────────────────────────

const { resolveTemplates } = require('../../server/utils/templateResolver')
const templates = require('../../data/templates.json')
const logicTreeData = require('../../data/logic_trees.json')

// The soft-hint boost now lives in the resolver (templateResolver.js → TREE_HINT_BOOST,
// applied via the `treeHintNames` option). Pass B below feeds the tree's named templates
// through that real production option rather than re-ranking by hand, so the harness
// measures the wired engine, not a model.

// Pull the set of template names a tree can actually reach (its terminal nodes),
// stripping the placeholder strings ("[...]", "a ...") the tree uses for prose.
function treeTemplateNames (treeId) {
  const tree = (logicTreeData.trees || []).find(t => t.id === treeId)
  const names = new Set()
  for (const node of (tree.nodes || [])) {
    for (const name of (node.templates || [])) {
      if (name && typeof name === 'string' && !name.startsWith('[') &&
          !name.startsWith('a ') && name.length < 80) {
        names.add(name)
      }
    }
  }
  return names
}

function caseFor ({ domain, problemSignals = {}, growthStage = null, confidence = null, industry = null }) {
  return {
    domain,
    primaryIssue: '',
    industry,
    solutionCategories: [domain],
    client: growthStage ? { growthStage } : {},
    complexityCeiling: 'strategic',
    advisor: confidence ? { confidence } : {},
    problemSignals
  }
}

// Run both passes and return a comparable, snapshot-friendly object.
function compare (scenario, treeId) {
  const strategy = { engagementType: scenario.engagementType || 'facilitation', templateBudget: scenario.budget || 3 }
  const hints = treeTemplateNames(treeId)

  // PASS A — engine today (no tree hint).
  const resA = resolveTemplates(caseFor(scenario), strategy, templates, { ignoreCeiling: true })
  // PASS B — tree-assisted: the SAME real resolver, given the tree's named templates via the
  // production `treeHintNames` option (NOT a hand-rolled re-rank). So Pass B is the wired
  // engine. (Production derives the names from walkLogicTree — situation-specific; here we
  // pass the tree's flat name set, a conservative superset of what a walk would reach.)
  const resB = resolveTemplates(caseFor(scenario), strategy, templates, { ignoreCeiling: true, treeHintNames: [...hints] })

  const passA = resA.scoringLog
    .map(t => ({ title: t.title, score: t.score, subSection: t.subSection }))
    .sort((a, b) => b.score - a.score)

  const passB = resB.scoringLog
    .map(t => ({ title: t.title, score: t.score, subSection: t.subSection, hinted: hints.has(t.title) }))
    .sort((a, b) => b.score - a.score)

  const topA = passA.slice(0, 6).map(t => `${t.score} · ${t.title} [${t.subSection}]`)
  const topB = passB.slice(0, 6).map(t => `${t.score}${t.hinted ? '*' : ' '} · ${t.title} [${t.subSection}]`)

  // What did the hint actually change in the visible top-6?
  const beforeTop = new Set(passA.slice(0, 6).map(t => t.title))
  const afterTop = passB.slice(0, 6).map(t => t.title)
  const promotedIntoTop6 = afterTop.filter(title => !beforeTop.has(title) && hints.has(title))

  return {
    treeReaches: [...hints],
    passA_engineOnly_top6: topA,
    passB_treeAssisted_top6: topB, // "*" marks a tree-hinted template
    promotedIntoTop6_byTreeHint: promotedIntoTop6
  }
}

// ── Scenarios — representative advisor situations per domain ──────────────────
// VALUATION: the dictionary has ZERO signals here, so problemSignals is empty —
// this is the live reality, and it is exactly why the engine cannot tell a SALE
// engagement from a PURCHASE one today.
const SCENARIOS = {
  'valuation · owner wants to sell / exit': {
    domain: 'valuation',
    engagementType: 'facilitation',
    budget: 3,
    problemSignals: {} // no valuation signals exist yet — honest baseline
  },
  // GOVERNANCE: the dictionary has one signal (governance_gap); this fires it.
  'governance · board not functioning': {
    domain: 'governance',
    engagementType: 'facilitation',
    budget: 3,
    problemSignals: { governance_gap: 1 }
  },
  // GOVERNANCE — business NOT READY: the new governance_too_early signal fires when
  // the advisor describes no clear objectives / failure accepted / no honest feedback.
  // Harvested from the governance tree's readiness gate; surfaces foundational-management
  // tools (People vs. Process) instead of pushing straight to board tools.
  'governance · business not ready for governance': {
    domain: 'governance',
    engagementType: 'facilitation',
    budget: 3,
    problemSignals: { governance_too_early: 1 }
  }
}

const SCENARIO_TREE = {
  'valuation · owner wants to sell / exit': 'valuation',
  'governance · board not functioning': 'governance',
  'governance · business not ready for governance': 'governance'
}

describe('tree-contribution harness — current vs tree-assisted (snapshot net)', () => {
  for (const [name, scenario] of Object.entries(SCENARIOS)) {
    test(name, () => {
      expect(compare(scenario, SCENARIO_TREE[name])).toMatchSnapshot()
    })
  }
})

// ── VERDICT assertions — Mike-confirmed correct outcomes (2026-06-23) ─────────
// Each encodes the CORRECT outcome Mike states. A MET criterion is a live test();
// an unmet one stays a named `.skip` (the acceptance criterion for the work that
// would meet it) and flips to test() when that fix lands — same convention as
// selectionHarness.test.js. Nothing self-grades: these are Mike's standard, not
// the engine's or the tree's.
describe('tree-contribution harness — VERDICT (Mike-confirmed correct outcomes)', () => {
  // CONFIRMED + MET + WIRED. A "sell / exit" valuation engagement leads with the SALE-side
  // assessment tools — the tree's soft hint breaks the signal-blind tie in the correct (sell,
  // not buy) direction. Asserted on Pass B, which is now the REAL resolver with the production
  // `treeHintNames` option applied (not a model) — so this proves the live wiring, not a what-if.
  test('valuation sell-case leads with Sale (not Purchase) assessment tools', () => {
    const { passB_treeAssisted_top6: passB } = compare(
      SCENARIOS['valuation · owner wants to sell / exit'], 'valuation')
    expect(passB.join('\n')).toMatch(/Sale Assessment/)
    // …and a Sale tool now LEADS, rather than the generic/purchase-side tie.
    expect(passB[0]).toMatch(/Sale Assessment/)
  })

  // CONFIRMED + MET 2026-06-23. The governance_too_early signal (Option A) makes the
  // ENGINE ITSELF surface a foundational-management tool when the business is not ready
  // for governance — no tree hint needed (asserted on Pass A, engine-only). People vs.
  // Process now carries a governance_too_early profile (reviewed_signal_map). Productive
  // Habits is deferred — it has no content summary to profile (logged in ACTIONS.md).
  test('governance not-ready case surfaces a foundational tool (engine, no hint)', () => {
    const { passA_engineOnly_top6: passA } = compare(
      SCENARIOS['governance · business not ready for governance'], 'governance')
    expect(passA.join('\n')).toMatch(/Productive Habits|People vs/)
  })
})
