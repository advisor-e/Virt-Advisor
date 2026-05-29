'use strict'
/**
 * Semantic Profile Compiler
 *
 * Reads the templateRegistry (templates + summaries joined by page ID) and
 * compiles each template's indicators/purpose/helpsOwner text into a structured
 * semantic profile using the same signal vocabulary as problemSignals.js.
 *
 * Output: data/semantic-profiles.json  — checked into source control.
 *
 * Run from project root:
 *   node scripts/build-semantic-profiles.js
 *
 * Re-run whenever content-summaries.json indicators text changes.
 * The output is deterministic — same input always produces same output.
 */

const { writeFileSync } = require('fs')
const { resolve } = require('path')
const { getClientTemplatesWithSummaries } = require('../server/utils/templateRegistry')

// ── Indicator keyword index ────────────────────────────────────────────────
// Maps each signal type to keyword phrases found in indicator/purpose prose.
// These are tuned for the formal language of content-summaries.json, not the
// conversational language of advisor situationDiagnostic free text.
// modeling_rejected is excluded — it is a penalty-only signal with no template
// positive expression.
const INDICATOR_SIGNAL_KEYWORDS = {
  sales_volume: [
    'few prospects', 'not enough customers', 'not enough clients',
    'low sales', 'sales volume', 'declining sales', 'sales are down',
    'customer acquisition', 'acquire more', 'attract more customers',
    'grow their customer', 'grow the customer', 'more customers',
    'initial sales but no loyal', 'high exposure but few prospects',
    'sales decline', 'conversion rate', 'not converting',
    'foot traffic', 'low foot traffic', 'lack of demand',
    'sales problem', 'sales issue', 'insufficient customers',
    'number of sales', 'volume of sales', 'more clients',
    'unhappy about our business performance', 'business performance',
    'distress or growth', 'triage'
  ],
  pricing_issue: [
    'price rise', 'pricing issue', 'undercharging', 'too cheap',
    'price increase', 'charge more', 'margin compression',
    'communicating price', 'price communication', 'underpriced',
    'price sensitivity', 'pricing pressure', 'mark up', 'markup',
    'price their services', 'reluctant to raise', 'afraid to charge',
    'price correctly'
  ],
  cash_flow_gap: [
    'cash flow', 'cash tight', 'working capital', 'debtor',
    'overdraft', 'late payment', 'cash crisis', 'running out of cash',
    'cash squeeze', 'cash funding', 'cash position', 'cash shortfall',
    'collecting payments', 'owed money', 'cash cycle', 'business drag',
    'business loan', 'take out a loan', 'funding request',
    'asset purchase', 'buy new machinery', 'capital expenditure',
    'expand operations', 'payback', 'break-even',
    'might go under', 'going under', 'insolvency', 'distress'
  ],
  staff_problem: [
    'staff', 'team performance', 'employee', 'people management',
    'hiring', 'retention', 'culture', 'leadership gap',
    'performance management', 'poor performance', 'staff turnover',
    'team dynamics', 'people problem', 'workforce', 'team culture',
    'staff development', 'managing people', 'key person',
    'talent', 'human resources', 'hr issue',
    'conflict', 'confusion', 'ego-clashes', 'parallel thinking',
    'collaborative thinking', 'team meetings', 'argument thinking'
  ],
  strategy_needed: [
    'strategic direction', 'business strategy', 'growth strategy',
    'pivot', 'long-term plan', 'no clear direction', 'strategic review',
    'business planning', 'strategic planning', 'vision',
    'where the business is going', 'future direction',
    'growth plan', 'business model', 'competitive strategy',
    'market position', 'strategic priorities', 'swot', 'blue ocean',
    'new prospect', 'first meeting', 'quick-check', 'financial anchor',
    'financial snapshot', 'high-level snapshot'
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
    'financial year', 'revenue forecast', 'cost forecast',
    'standard deviation', 'seasonal average', 'natural volatility',
    'averages', 'month-to-month', 'performance data'
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

// ── Score a text block against the keyword index ───────────────────────────
function scoreText (text) {
  if (!text || typeof text !== 'string') { return {} }
  const lower = text.toLowerCase()
  const profile = {}

  for (const [signal, keywords] of Object.entries(INDICATOR_SIGNAL_KEYWORDS)) {
    let count = 0
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) { count++ }
    }
    if (count > 0) { profile[signal] = count }
  }
  return profile
}

// ── Merge two profiles (sum counts) ───────────────────────────────────────
function mergeProfiles (...profiles) {
  const merged = {}
  for (const p of profiles) {
    for (const [signal, count] of Object.entries(p)) {
      merged[signal] = (merged[signal] || 0) + count
    }
  }
  return merged
}

// ── Confidence tier based on total signal count ────────────────────────────
function confidenceTier (totalSignals) {
  if (totalSignals >= 4) { return 'high' }
  if (totalSignals >= 1) { return 'medium' }
  return 'low'
}

// ── Main ───────────────────────────────────────────────────────────────────
const entries = getClientTemplatesWithSummaries()

const profiles = []
const stats = { high: 0, medium: 0, low: 0, noSummary: 0, reviewed: 0, auto: 0, keyword: 0 }

for (const { template, summary } of entries) {
  if (!summary) {
    stats.noSummary++
    profiles.push({
      page: template.page,
      title: template.title,
      subSection: template.subSection || null,
      profile: {},
      totalSignals: 0,
      confidence: 'low',
      note: 'no summary — manual profile needed'
    })
    continue
  }

  // Priority: reviewed_signal_map (human approved) > auto_signal_map (generated) > keyword scoring
  let merged
  let source
  if (summary.reviewed_signal_map && Object.keys(summary.reviewed_signal_map).length > 0) {
    merged = summary.reviewed_signal_map
    source = 'reviewed'
  } else if (summary.auto_signal_map && Object.keys(summary.auto_signal_map).length > 0) {
    merged = summary.auto_signal_map
    source = 'auto'
  } else {
    const indicatorProfile = scoreText(summary.indicators)
    const purposeProfile = scoreText(summary.purpose)
    const helpsOwnerProfile = scoreText(summary.helpsOwner)
    merged = mergeProfiles(indicatorProfile, purposeProfile, helpsOwnerProfile)
    source = 'keyword'
  }

  const totalSignals = Object.values(merged).reduce((sum, n) => sum + n, 0)
  const confidence = confidenceTier(totalSignals)

  stats[confidence]++
  stats[source]++

  profiles.push({
    page: template.page,
    title: template.title,
    subSection: template.subSection || null,
    profile: merged,
    totalSignals,
    confidence,
    source
  })
}

// Sort by subSection then title for readability
profiles.sort((a, b) => {
  const ss = (a.subSection || '').localeCompare(b.subSection || '')
  return ss !== 0 ? ss : a.title.localeCompare(b.title)
})

const outputPath = resolve(process.cwd(), 'data/semantic-profiles.json')
writeFileSync(outputPath, JSON.stringify(profiles, null, 2), 'utf8')

console.log('=== Semantic Profile Build ===')
console.log(`Total client templates: ${entries.length}`)
console.log(`High confidence (4+ signals):   ${stats.high}`)
console.log(`Medium confidence (1-3 signals): ${stats.medium}`)
console.log(`Low confidence (0 signals):      ${stats.low}`)
console.log(`No summary (needs manual work):  ${stats.noSummary}`)
console.log('')
console.log(`Profile sources:`)
console.log(`  Reviewed (human approved): ${stats.reviewed}`)
console.log(`  Auto-generated:            ${stats.auto}`)
console.log(`  Keyword fallback:          ${stats.keyword}`)
console.log('')

// Print low-confidence templates for manual review
const lowConf = profiles.filter(p => p.confidence === 'low' && !p.note)
if (lowConf.length > 0) {
  console.log('Low confidence profiles (no signals detected — review indicators):')
  lowConf.forEach(p => console.log(` - ${p.title} [${p.subSection}]`))
  console.log('')
}

// Print a sample to verify correct behaviour
const samples = ['Customer Journey', '8 Profit Levers', 'Sales Session', 'Staff Performance Review']
console.log('Sample profiles:')
samples.forEach(name => {
  const p = profiles.find(p => p.title === name)
  if (p) { console.log(` ${p.title}: ${JSON.stringify(p.profile)} (${p.confidence})`) }
})

console.log(`\nWritten to data/semantic-profiles.json`)
