'use strict'

// ─────────────────────────────────────────────────────────────────────────────
// TREE TRIAGE SWEEP (analysis tool — not a committed test yet)
//
// Runs the same current-vs-tree-assisted comparison as treeContributionHarness,
// but across ALL content-bearing dormant trees, and auto-sorts each into:
//   REDUNDANT     — engine already surfaces the tree's templates; tree adds nothing
//   TIE-BREAKER   — the soft hint cleanly improves ranking (cheap win, like valuation)
//   NEEDS-SIGNAL  — the tree names good templates the engine scores too low to surface;
//                   the judgment must become a real signal (like governance's gate)
//   REVIEW        — inconclusive / firm-facing / templates not in the client pool
//
// CAVEAT: trees carry no domain field, so the tree→domain + which-signal mapping
// below is INFERRED and must be sanity-checked by Mike. Buckets are heuristic — a
// starting triage, not a verdict.
// ─────────────────────────────────────────────────────────────────────────────

const { resolveTemplates } = require('../server/utils/templateResolver')
const templates = require('../data/templates.json')
const logicTreeData = require('../data/logic_trees.json')

const TREE_HINT_BOOST = 3 // same soft-hint strength as the harness

// INFERRED tree → { domain, signals } mapping. signals = problemSignals to fire
// (empty where the dictionary has none for that domain — an honest "engine blind" baseline).
const MAP = {
  client_sales: { domain: 'sales-marketing', signals: { sales_volume: 1 } },
  cashflow: { domain: 'forecasting', signals: { cash_flow_gap: 1 } },
  client_planning: { domain: 'strategy', signals: { strategy_needed: 1 } },
  staff_performance: { domain: 'staff', signals: { staff_problem: 1 } },
  systems: { domain: 'systems', signals: { systems_gap: 1 } },
  risk_management: { domain: 'risk', signals: {} },
  succession: { domain: 'succession', signals: { succession_issue: 1 } },
  profitability_feasibility: { domain: 'profit', signals: { revenue_modelling: 1, pricing_issue: 1 } },
  due_diligence: { domain: 'due-diligence', signals: {} },
  stock_purchasing: { domain: 'stock-purchasing', signals: { stock_management: 1 } },
  raising_capital: { domain: 'raising-capital', signals: { capital_raising: 1 } },
  financial_systems_review: { domain: 'data-systems', signals: { data_quality: 1 } },
  three_pill_fin_mgt: { domain: 'forecasting', signals: { cash_flow_gap: 1 }, flag: 'broad/financial-mgmt' },
  cash_tactics: { domain: 'forecasting', signals: { cash_flow_gap: 1 } },
  fm_coach_culture: { domain: 'fm-coach-culture', signals: {}, flag: 'firm-facing' },
  org_ca_firm_strategy: { domain: 'org-firm-strategy', signals: {}, flag: 'firm-facing' },
  org_firm_board_pack: { domain: 'org-board-pack', signals: {}, flag: 'firm-facing' },
  quickfire: { domain: 'profit', signals: {}, flag: 'cross-domain router' },
  frameworks_find: { domain: 'strategy', signals: {}, flag: 'discovery router' }
}

function treeTemplateNames (treeId) {
  const tree = (logicTreeData.trees || []).find(t => t.id === treeId)
  const names = new Set()
  for (const node of (tree.nodes || [])) {
    for (const name of (node.templates || [])) {
      if (name && typeof name === 'string' && !name.startsWith('[') &&
          !name.startsWith('a ') && name.length < 80) { names.add(name) }
    }
  }
  return names
}

function caseFor (domain, problemSignals) {
  return {
    domain, primaryIssue: '', industry: null, solutionCategories: [domain],
    client: {}, complexityCeiling: 'strategic', advisor: {}, problemSignals
  }
}

function triage (treeId, cfg) {
  const strategy = { engagementType: 'facilitation', templateBudget: 3 }
  const res = resolveTemplates(caseFor(cfg.domain, cfg.signals), strategy, templates, { ignoreCeiling: true })
  const log = res.scoringLog
  const baseScore = new Map(log.map(t => [t.title, t.score]))

  const hints = treeTemplateNames(treeId)
  const passA = [...log].sort((a, b) => b.score - a.score)
  const passB = log.map(t => ({ title: t.title, score: t.score + (hints.has(t.title) ? TREE_HINT_BOOST : 0) }))
    .sort((a, b) => b.score - a.score)

  const topA = new Set(passA.slice(0, 6).map(t => t.title))
  const topB = new Set(passB.slice(0, 6).map(t => t.title))
  const cutoff = passA.length >= 6 ? passA[5].score : 0 // score of the 6th place — the visible cutoff

  const reachable = [...hints]
  const ghosts = reachable.filter(n => !baseScore.has(n)) // named by tree, not in client scoring pool
  const scored = reachable.filter(n => baseScore.has(n))
  const alreadyTop = scored.filter(n => topA.has(n))
  const promoted = scored.filter(n => topB.has(n) && !topA.has(n))
  const buriedValuable = scored.filter(n => !topB.has(n) && baseScore.get(n) < cutoff)

  let bucket
  if (scored.length === 0) bucket = 'REVIEW'
  else if (alreadyTop.length === scored.length && promoted.length === 0) bucket = 'REDUNDANT'
  else if (promoted.length > 0) bucket = 'TIE-BREAKER'
  else if (buriedValuable.length > 0) bucket = 'NEEDS-SIGNAL'
  else bucket = 'REVIEW'

  return {
    treeId,
    domain: cfg.domain,
    flag: cfg.flag || '',
    bucket,
    reachable: reachable.length,
    inPool: scored.length,
    ghosts: ghosts.length ? ghosts : '',
    alreadyTop: alreadyTop.length,
    promoted: promoted.length ? promoted : '',
    buriedValuable: buriedValuable.length ? buriedValuable : ''
  }
}

const ORDER = { 'NEEDS-SIGNAL': 0, 'TIE-BREAKER': 1, REDUNDANT: 2, REVIEW: 3 }
const rows = Object.entries(MAP).map(([id, cfg]) => triage(id, cfg))
  .sort((a, b) => ORDER[a.bucket] - ORDER[b.bucket] || a.treeId.localeCompare(b.treeId))

console.log('\n================== TREE TRIAGE SWEEP (' + rows.length + ' trees) ==================')
console.log('(valuation + governance already done separately — not re-run here)\n')
for (const r of rows) {
  console.log(`[${r.bucket.padEnd(12)}] ${r.treeId.padEnd(26)} → ${r.domain.padEnd(18)}${r.flag ? '  ⚑ ' + r.flag : ''}`)
  console.log(`   reaches ${r.reachable} templates · ${r.inPool} in client pool · ${r.alreadyTop} already top-6`)
  if (r.promoted) console.log(`   promoted by hint: ${r.promoted.join(', ')}`)
  if (r.buriedValuable) console.log(`   buried-but-named (needs a signal): ${r.buriedValuable.join(', ')}`)
  if (r.ghosts) console.log(`   NOT in client pool (name mismatch / wrong section): ${r.ghosts.join(', ')}`)
  console.log('')
}

const counts = rows.reduce((a, r) => { a[r.bucket] = (a[r.bucket] || 0) + 1; return a }, {})
console.log('=== bucket totals ===', JSON.stringify(counts))
