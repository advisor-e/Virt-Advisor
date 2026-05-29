'use strict'
/**
 * Signal Map Generator
 *
 * Reads content-summaries.json and generates a suggested auto_signal_map
 * for each template based on its indicators, purpose, and helpsOwner text.
 *
 * Output is written back to content-summaries.json as:
 *   auto_signal_map:  { signal: score (1-10) }   — auto-generated, awaiting review
 *   reviewed_signal_map: null                     — set by review workflow when approved
 *
 * Rules:
 *   - Skips entries where reviewed_signal_map is non-null (already approved — do not overwrite)
 *   - Always overwrites auto_signal_map (re-running is safe and deterministic)
 *   - Scores normalized: highest signal in a template = 10, others proportional
 *
 * Run from project root:
 *   node scripts/generate-signal-maps.js
 *   npm run generate:signal-maps
 */

const { readFileSync, writeFileSync } = require('fs')
const { resolve } = require('path')

const SUMMARIES_PATH = resolve(__dirname, '../data/content-summaries.json')

// ── Keyword index tuned for formal content-summary language ───────────────
// Same approach as build-semantic-profiles.js but maintained here separately
// so signal map generation can evolve independently of profile compilation.
// profit_plateau keywords are intentionally tighter here — the broad catch-alls
// ('seasonal', 'volatility', 'business performance') caused 53/125 templates
// to match, destroying discrimination.
const SIGNAL_KEYWORDS = {
  sales_volume: [
    'few prospects', 'not enough customers', 'not enough clients',
    'low sales', 'sales volume', 'declining sales', 'sales are down',
    'customer acquisition', 'acquire more', 'attract more customers',
    'grow their customer', 'grow the customer', 'more customers',
    'initial sales but no loyal', 'high exposure but few prospects',
    'sales decline', 'conversion rate', 'not converting',
    'foot traffic', 'low foot traffic', 'lack of demand',
    'sales problem', 'sales issue', 'insufficient customers',
    'number of sales', 'volume of sales', 'more clients'
  ],
  pricing_issue: [
    'price rise', 'pricing issue', 'undercharging', 'too cheap',
    'price increase', 'charge more', 'margin compression',
    'communicating price', 'price communication', 'underpriced',
    'price sensitivity', 'pricing pressure', 'mark up', 'markup',
    'price their services', 'reluctant to raise', 'afraid to charge',
    'price correctly', 'pricing strategy', 'fee increase', 'rate increase'
  ],
  cash_flow_gap: [
    'cash flow', 'cash tight', 'working capital', 'debtor',
    'overdraft', 'late payment', 'cash crisis', 'running out of cash',
    'cash squeeze', 'cash funding', 'cash position', 'cash shortfall',
    'collecting payments', 'owed money', 'cash cycle', 'business drag',
    'funding request', 'capital expenditure', 'payback', 'break-even',
    'might go under', 'going under', 'insolvency', 'liquidity'
  ],
  staff_problem: [
    'staff', 'team performance', 'employee', 'people management',
    'hiring', 'retention', 'culture', 'leadership gap',
    'performance management', 'poor performance', 'staff turnover',
    'team dynamics', 'people problem', 'workforce', 'team culture',
    'staff development', 'managing people', 'key person',
    'talent', 'human resources', 'hr issue',
    'conflict', 'ego-clashes', 'parallel thinking',
    'collaborative thinking', 'team meetings'
  ],
  strategy_needed: [
    'strategic direction', 'business strategy', 'growth strategy',
    'pivot', 'long-term plan', 'no clear direction', 'strategic review',
    'business planning', 'strategic planning', 'vision',
    'where the business is going', 'future direction',
    'growth plan', 'business model', 'competitive strategy',
    'market position', 'strategic priorities', 'swot', 'blue ocean'
  ],
  data_quality: [
    'management reports', 'financial data', 'reporting', 'kpi',
    'dashboard', 'ratios', 'data quality', 'chart of accounts',
    'accounting data', 'financial information', 'financial clarity',
    'inaccurate data', 'no reporting', 'management information',
    'financial reporting', 'business data', 'financial numbers',
    'financial literacy', 'understand their numbers',
    'financial education', 'financial foundation',
    'budget', 'financial plan', 'no budget', 'financial baseline',
    'financial year', 'revenue forecast', 'cost forecast'
  ],
  governance_gap: [
    'governance', 'board', 'accountability', 'director',
    'advisory board', 'leadership structure', 'decision making',
    'corporate structure', 'business structure', 'stakeholder',
    'board of directors', 'governance structure', 'annual plan',
    'board pack', 'governance framework', 'organisational review'
  ],
  succession_issue: [
    'succession', 'exit', 'sell the business', 'handover',
    'retirement', 'next generation', 'business sale', 'transition',
    'exit strategy', 'business valuation for sale', 'sale of business',
    'ownership transition', 'passing the business', 'due diligence',
    'business purchase', 'acquire a business', 'buying a business'
  ],
  systems_gap: [
    'process', 'workflow', 'systems', 'software', 'technology',
    'inefficient', 'manual process', 'automation', 'operational efficiency',
    'business systems', 'admin burden', 'systems review',
    'operating system', 'tech stack', 'business processes',
    'streamline', 'scale the business', 'scalable'
  ],
  revenue_modelling: [
    'revenue model', 'feasibility model', 'industry model', 'financial model',
    'model their revenue', 'model the revenue', 'revenue and cost model',
    'revenue structure', 'revenue assumptions', 'revenue drivers',
    'feasibility analysis', 'feasibility study', 'revenue feasibility',
    'build a model', 'run the numbers', 'model the numbers',
    'industry-specific model', 'revenue projection', 'cost model',
    'labour model', 'margin model', 'sales model', 'pricing model',
    'budget model', 'high level budget', 'back costing', 'break-even model',
    'feasibility template', 'revenue template'
  ],
  marketing_gap: [
    'marketing', 'brand', 'digital', 'online presence', 'awareness',
    'advertising', 'customer journey', 'messaging', 'product fit',
    'positioning', 'market exposure', 'market awareness',
    'digital funnel', 'sales funnel', 'brand awareness',
    'digital marketing', 'marketing strategy', 'target market',
    'ideal customer', 'customer avatar', 'persona',
    'social media', 'website', 'content marketing'
  ]
}

function scoreText (text) {
  if (!text || typeof text !== 'string') { return {} }
  const lower = text.toLowerCase()
  const scores = {}
  for (const [signal, keywords] of Object.entries(SIGNAL_KEYWORDS)) {
    let count = 0
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) { count++ }
    }
    if (count > 0) { scores[signal] = count }
  }
  return scores
}

function mergeScores (...scoreSets) {
  const merged = {}
  for (const s of scoreSets) {
    for (const [signal, count] of Object.entries(s)) {
      merged[signal] = (merged[signal] || 0) + count
    }
  }
  return merged
}

function normalizeTo10 (scores) {
  const values = Object.values(scores)
  if (values.length === 0) { return {} }
  const max = Math.max(...values)
  if (max === 0) { return {} }
  const normalized = {}
  for (const [signal, count] of Object.entries(scores)) {
    const score = Math.max(1, Math.round((count / max) * 10))
    normalized[signal] = score
  }
  // Sort descending by score
  return Object.fromEntries(
    Object.entries(normalized).sort((a, b) => b[1] - a[1])
  )
}

// ── Main ──────────────────────────────────────────────────────────────────
const summaries = JSON.parse(readFileSync(SUMMARIES_PATH, 'utf8'))

let generated = 0
let skipped = 0
let noMatch = 0

const updated = summaries.map((s) => {
  // Never overwrite a reviewed map — it was human-approved
  if (s.reviewed_signal_map !== null && s.reviewed_signal_map !== undefined) {
    skipped++
    return s
  }

  const indicatorScores = scoreText(s.indicators)
  const purposeScores = scoreText(s.purpose)
  const ownerScores = scoreText(s.helpsOwner)

  // Indicators carry double weight — most specific "when to use" signal
  const merged = mergeScores(indicatorScores, indicatorScores, purposeScores, ownerScores)
  const normalized = normalizeTo10(merged)

  if (Object.keys(normalized).length === 0) { noMatch++ }
  else { generated++ }

  return Object.assign({}, s, {
    auto_signal_map: normalized,
    reviewed_signal_map: s.reviewed_signal_map !== undefined ? s.reviewed_signal_map : null
  })
})

writeFileSync(SUMMARIES_PATH, JSON.stringify(updated, null, 2), 'utf8')

console.log('Signal map generation complete')
console.log('  Generated:', generated)
console.log('  No match (empty map):', noMatch)
console.log('  Skipped (already reviewed):', skipped)
console.log('  Total:', updated.length)
