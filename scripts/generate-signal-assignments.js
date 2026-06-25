'use strict'
/**
 * Signal Assignment Generator — Phase 1, content feedback loop.
 *
 * Auto-detects the latest search_content_*.json from the project root.
 * Supplements with content-summaries.json where available.
 * Outputs data/signal-assignments-draft.json — the human review queue.
 *
 * Priority tiers:
 *   P0 — Known failing fixtures (hardcoded list). Full review required.
 *   P1 — Has a content-summaries.json entry (well-documented). Full review required.
 *   P2 — Client-facing, missing content-summaries entry. Review before activating.
 *   P3 — Not referenced in any logic tree. Defer indefinitely.
 *
 * Re-run-safe: entries with status "approved" carry forward unchanged.
 * Draft entries are regenerated. New templates in an updated search_content
 * file are picked up automatically on the next run.
 *
 * Usage:
 *   npm run generate:signal-assignments
 */

const { readFileSync, writeFileSync, existsSync } = require('fs')
const { resolve, join, basename } = require('path')
const { findLatestSearchContentPath, loadLatestSearchContent, EXPORT_DIR } = require('../server/utils/masterExport')

const ROOT = resolve(__dirname, '..')
const SIGNAL_DICT_PATH = join(ROOT, 'data', 'signal-dictionary.json')
const SUMMARIES_PATH = join(ROOT, 'data', 'content-summaries.json')
const LOGIC_TREES_PATH = join(ROOT, 'data', 'logic_trees.json')
const OUTPUT_PATH = join(ROOT, 'data', 'signal-assignments-draft.json')

// ── Find latest search_content_*.json (in Central Frameworks/, via the helper) ──
function findLatestSearchContent () {
  const path = findLatestSearchContentPath()
  if (!path) {
    throw new Error(`No search_content_*.json file found in ${EXPORT_DIR}/. Drop the master-app export there and re-run.`)
  }
  return path
}

// ── Content keyword index ───────────────────────────────────────────────────
// These keywords match formal template description language (purpose, tags,
// indicators prose). They are intentionally separate from the regex patterns
// in signal-dictionary.json, which are tuned for conversational advisor speech.
//
// Signal names here must stay in sync with keys in signal-dictionary.json.
// modeling_rejected is excluded — it is a penalty-only signal with no positive
// template expression.
const CONTENT_KEYWORDS = {
  sales_volume: [
    'few prospects', 'not enough customers', 'not enough clients', 'low sales',
    'sales volume', 'declining sales', 'customer acquisition', 'acquire more',
    'attract more customers', 'grow their customer', 'grow the customer',
    'more customers', 'more clients', 'sales decline', 'conversion rate',
    'not converting', 'foot traffic', 'low foot traffic', 'lack of demand',
    'sales problem', 'sales issue', 'insufficient customers',
    'lead generation', 'leads', 'new prospects', 'prospect',
    'sales process', 'sales system', 'pipeline',
    'upsell', 'cross-sell', 'referral strategy', 'new business', 'win new',
    'triage', 'distress or growth', 'business performance'
  ],
  pricing_issue: [
    'price rise', 'pricing issue', 'undercharging', 'too cheap',
    'price increase', 'charge more', 'margin compression',
    'communicating price', 'price communication', 'underpriced',
    'price sensitivity', 'pricing pressure', 'mark up', 'markup',
    'price their services', 'afraid to charge', 'price correctly',
    'pricing strategy', 'fee increase', 'rate increase',
    'pricing model', 'value-based pricing', 'price their'
  ],
  cash_flow_gap: [
    'cash flow', 'cashflow', 'cash tight', 'working capital', 'debtor',
    'overdraft', 'late payment', 'cash crisis', 'running out of cash',
    'cash squeeze', 'cash position', 'cash shortfall',
    'collecting payments', 'owed money', 'cash cycle',
    'business loan', 'funding request', 'capital expenditure', 'payback',
    'break-even', 'insolvency', 'liquidity', 'distress',
    'cash forecast', 'cash management', 'forecasting cash'
  ],
  revenue_modelling: [
    'revenue model', 'feasibility model', 'industry model', 'financial model',
    'model their revenue', 'revenue and cost model', 'revenue structure',
    'revenue assumptions', 'revenue drivers', 'feasibility analysis',
    'feasibility study', 'revenue feasibility', 'build a model',
    'run the numbers', 'model the numbers', 'industry-specific model',
    'revenue projection', 'cost model', 'labour model', 'margin model',
    'budget model', 'high level budget', 'back costing', 'break-even model',
    'feasibility template', 'financial projections', 'modelling',
    'forecast model', 'financial forecast'
  ],
  staff_problem: [
    'team performance', 'employee', 'people management',
    'hiring', 'retention', 'culture', 'leadership gap',
    'performance management', 'poor performance', 'staff turnover',
    'team dynamics', 'people problem', 'workforce', 'team culture',
    'staff development', 'managing people', 'key person',
    'talent', 'human resources', 'conflict resolution',
    'parallel thinking', 'collaborative thinking', 'team meetings',
    'onboarding', 'induction', 'remuneration', 'accountability plan',
    'engagement', 'motivation', 'staff kpi', 'staff performance'
  ],
  strategy_needed: [
    'strategic direction', 'business strategy', 'growth strategy',
    'pivot', 'long-term plan', 'strategic review',
    'business planning', 'strategic planning', 'vision',
    'future direction', 'growth plan', 'business model',
    'competitive strategy', 'market position', 'strategic priorities',
    'swot', 'blue ocean', 'annual plan', 'business plan',
    '90-day plan', 'quarterly planning', 'strategic goals',
    'strategy session', 'direction setting'
  ],
  data_quality: [
    'management reports', 'financial data', 'management reporting', 'kpi',
    'dashboard', 'financial ratios', 'data quality', 'chart of accounts',
    'accounting data', 'financial information', 'financial clarity',
    'management information', 'financial reporting',
    'financial literacy', 'understand their numbers',
    'financial education', 'financial foundation',
    'financial plan', 'financial baseline',
    'revenue forecast', 'cost forecast',
    'profit and loss', 'balance sheet', 'management accounts',
    'financial management', 'ratio analysis'
  ],
  governance_gap: [
    'governance', 'advisory board', 'leadership structure', 'decision making',
    'corporate structure', 'business structure', 'stakeholder',
    'board of directors', 'governance structure',
    'board pack', 'governance framework', 'organisational review',
    'compliance', 'regulatory', 'shareholders', 'constitution',
    'board meeting', 'board agenda'
  ],
  succession_issue: [
    'succession', 'exit', 'sell the business', 'handover',
    'retirement', 'next generation', 'business sale', 'transition',
    'exit strategy', 'business valuation', 'sale of business',
    'ownership transition', 'due diligence', 'business purchase',
    'acquire a business', 'buying a business', 'valuation',
    'business value', 'ebitda', 'goodwill',
    'family succession', 'management buyout', 'mbo'
  ],
  systems_gap: [
    'workflow', 'software', 'technology',
    'inefficient', 'manual process', 'automation', 'operational efficiency',
    'business systems', 'admin burden', 'systems review',
    'tech stack', 'business processes',
    'streamline', 'scale the business', 'scalable',
    'erp', 'crm', 'job management', 'project management software',
    'cloud', 'digital transformation', 'operating system'
  ],
  marketing_gap: [
    'marketing', 'brand awareness', 'digital', 'online presence',
    'advertising', 'customer journey', 'messaging', 'product fit',
    'positioning', 'market exposure', 'market awareness',
    'digital funnel', 'sales funnel',
    'digital marketing', 'marketing strategy', 'target market',
    'ideal customer', 'customer avatar', 'persona',
    'social media', 'website', 'content marketing',
    'seo', 'google ads', 'referral', 'networking', 'seminar'
  ]
}

// ── P0: Templates with confirmed scoring failures ──────────────────────────
const P0_TEMPLATES = new Set([
  'Customer Journey',
  'Quick Fire Diagnosis',
  'Lite Feasibility',
  'Sales Session'
])

// ── Extract all template names referenced in logic trees ──────────────────
function buildLogicTreeSet () {
  const trees = JSON.parse(readFileSync(LOGIC_TREES_PATH, 'utf8'))
  const names = new Set()

  function walk (node) {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) { node.forEach(walk); return }
    if (typeof node.template === 'string') names.add(node.template)
    if (Array.isArray(node.templates)) node.templates.forEach(t => names.add(t))
    if (Array.isArray(node.support_templates)) node.support_templates.forEach(t => names.add(t))
    Object.values(node).forEach(v => { if (v && typeof v === 'object') walk(v) })
  }

  trees.trees.forEach(walk)
  return names
}

// ── Score a template's fields against the keyword index ───────────────────
// Returns suggested signals (ordered by score), normalized scores, and
// attribution showing exactly which field and keyword drove each match.
function scoreTemplate (fields, activeSignals) {
  const raw = {}
  const attribution = {}

  for (const signal of activeSignals) {
    const keywords = CONTENT_KEYWORDS[signal]
    if (!keywords) continue

    for (const [fieldName, value] of Object.entries(fields)) {
      if (!value) continue

      // Tags come in as an array — join for matching but record matched tags individually
      const text = Array.isArray(value) ? value.join(' | ') : value
      const lower = text.toLowerCase()

      const matched = []
      for (const kw of keywords) {
        if (lower.includes(kw.toLowerCase())) {
          raw[signal] = (raw[signal] || 0) + 1
          if (!matched.includes(kw)) matched.push(kw)
        }
      }

      if (matched.length > 0) {
        if (!attribution[signal]) attribution[signal] = []
        attribution[signal].push(`${fieldName}: ${matched.map(k => `"${k}"`).join(', ')}`)
      }
    }
  }

  // Normalize raw counts to 1–10 scale
  const values = Object.values(raw)
  const max = values.length ? Math.max(...values) : 0
  const scores = {}
  if (max > 0) {
    for (const [sig, count] of Object.entries(raw)) {
      scores[sig] = Math.max(1, Math.round((count / max) * 10))
    }
  }

  const suggestedSignals = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([sig]) => sig)

  return { suggestedSignals, scores, attribution }
}

// ── Main ──────────────────────────────────────────────────────────────────
const sourcePath = findLatestSearchContent()
const sourceFile = basename(sourcePath) // basename kept for the sourceFile metadata field
console.log(`Source: ${sourcePath}`)

const searchContent = loadLatestSearchContent()
const summaries = JSON.parse(readFileSync(SUMMARIES_PATH, 'utf8'))
const signalDict = JSON.parse(readFileSync(SIGNAL_DICT_PATH, 'utf8'))

// Load existing draft — carry forward any approved entries
let existingApproved = new Map()
if (existsSync(OUTPUT_PATH)) {
  try {
    const existing = JSON.parse(readFileSync(OUTPUT_PATH, 'utf8'))
    ;(existing.assignments || [])
      .filter(a => a.status === 'approved')
      .forEach(a => existingApproved.set(a.template, a))
    console.log(`Carrying forward ${existingApproved.size} approved entries`)
  } catch {
    console.warn('Could not parse existing draft — starting fresh')
  }
}

// Active signals only (exclude penaltyOnly)
const activeSignals = Object.entries(signalDict.signals)
  .filter(([, def]) => !def.penaltyOnly)
  .map(([name]) => name)

// Index summaries by name for O(1) lookup
const summaryByName = new Map(summaries.map(s => [s.name, s]))

// Build logic-tree template set for P3 detection
const logicTreeTemplates = buildLogicTreeSet()

// Do-the-Job templates — the pool the resolver scores (NOT the includedInClient
// client-self-serve flag, which hid the advisor-with-client tools)
const clientTemplates = searchContent.filter(t => t.menuSection === 'do-the-job')
console.log(`Client templates found: ${clientTemplates.length}`)

let counts = { P0: 0, P1: 0, P2: 0, P3: 0, withSignals: 0, noSignals: 0, carried: 0 }

const assignments = clientTemplates.map(template => {
  const name = template.title

  // Carry forward approved entries unchanged
  if (existingApproved.has(name)) {
    counts.carried++
    return existingApproved.get(name)
  }

  // Priority tier
  let priority
  if (P0_TEMPLATES.has(name)) {
    priority = 'P0'
  } else if (!logicTreeTemplates.has(name)) {
    priority = 'P3'
  } else if (summaryByName.has(name)) {
    priority = 'P1'
  } else {
    priority = 'P2'
  }
  counts[priority]++

  // Build the text fields available for this template.
  // search_content is the baseline (all 131 templates).
  // content-summaries adds richer prose where available.
  const summary = summaryByName.get(name)
  const fields = {
    purpose: template.purpose || (summary && summary.purpose) || '',
    tags: template.tags || [],
    indicators: (summary && summary.indicators) || '',
    helpsOwner: (summary && summary.helpsOwner) || '',
    helpsAdvisor: (summary && summary.helpsAdvisor) || ''
  }

  const { suggestedSignals, scores, attribution } = scoreTemplate(fields, activeSignals)

  if (suggestedSignals.length > 0) counts.withSignals++
  else counts.noSignals++

  return {
    template: name,
    page: template.page || (summary && summary.page) || null,
    section: template.section || null,
    subSection: template.subSection || null,
    priority,
    status: 'draft',
    suggestedSignals,
    scores,
    attribution,
    sourceFile,
    generatedAt: new Date().toISOString()
  }
})

// Sort: P0 → P1 → P2 → P3, alphabetical within each tier
const tierOrder = { P0: 0, P1: 1, P2: 2, P3: 3 }
assignments.sort((a, b) => {
  const td = (tierOrder[a.priority] ?? 3) - (tierOrder[b.priority] ?? 3)
  return td !== 0 ? td : a.template.localeCompare(b.template)
})

const output = {
  meta: {
    generatedAt: new Date().toISOString(),
    sourceFile,
    signalDictionaryVersion: signalDict.version,
    totalTemplates: assignments.length,
    byPriority: { P0: counts.P0, P1: counts.P1, P2: counts.P2, P3: counts.P3 },
    withSignals: counts.withSignals,
    noSignals: counts.noSignals,
    carriedForward: counts.carried
  },
  assignments
}

writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8')

console.log('\nComplete.')
console.log(`  P0 (failing fixtures):       ${counts.P0}`)
console.log(`  P1 (has content-summary):    ${counts.P1}`)
console.log(`  P2 (missing summary):        ${counts.P2}`)
console.log(`  P3 (not in logic trees):     ${counts.P3}`)
console.log(`  With signals:                ${counts.withSignals}`)
console.log(`  No signals (needs attention):${counts.noSignals}`)
console.log(`  Approved (carried forward):  ${counts.carried}`)
console.log(`  Output: data/signal-assignments-draft.json`)
