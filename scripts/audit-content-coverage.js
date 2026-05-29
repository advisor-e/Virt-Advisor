'use strict'
/**
 * Content Coverage Audit
 *
 * Validates that the content pipeline is complete and consistent.
 * Run after build-semantic-profiles.js to confirm the output is production-safe.
 *
 * Run from project root:
 *   node scripts/audit-content-coverage.js
 *
 * Exits with code 1 if any CRITICAL issues are found.
 * Exits with code 0 if only warnings (or nothing) found.
 *
 * Set VA_STRICT_CONTENT=true to treat warnings as errors.
 */

const { readFileSync } = require('fs')
const { resolve } = require('path')

const STRICT = process.env.VA_STRICT_CONTENT === 'true'

// ── Penalty-only signals — zero template coverage is acceptable ────────────
const ZERO_COVERAGE_ALLOWED = new Set(['modeling_rejected'])

// ── Load data ──────────────────────────────────────────────────────────────
function load (file) {
  return JSON.parse(readFileSync(resolve(process.cwd(), file), 'utf8'))
}

const searchContent = load('search_content_20260519050251.json')
const profiles = load('data/semantic-profiles.json')
const summaries = load('data/content-summaries.json')
const logicTrees = load('data/logic_trees.json')

const clientTemplates = searchContent.filter(t => t.includedInClient)
const allTitles = new Set(searchContent.map(t => t.title))
const summaryNames = new Set(summaries.map(s => s.name))
const profileTitles = new Set(profiles.map(p => p.title))

// ── All signals tracked by the system ─────────────────────────────────────
const ALL_SIGNALS = [
  'sales_volume', 'pricing_issue', 'cash_flow_gap', 'profit_plateau',
  'modeling_rejected', 'staff_problem', 'strategy_needed', 'data_quality',
  'governance_gap', 'succession_issue', 'systems_gap', 'marketing_gap'
]

const issues = []   // CRITICAL — block
const warnings = [] // Advisory — warn only

// ── 1. Signal coverage ─────────────────────────────────────────────────────
const signalCoverage = {}
ALL_SIGNALS.forEach(s => { signalCoverage[s] = 0 })

profiles.forEach(p => {
  if (!p.profile) { return }
  Object.keys(p.profile).forEach(sig => {
    if (signalCoverage[sig] !== undefined) { signalCoverage[sig]++ }
  })
})

ALL_SIGNALS.forEach(sig => {
  if (signalCoverage[sig] === 0 && !ZERO_COVERAGE_ALLOWED.has(sig)) {
    issues.push(`CRITICAL: Signal "${sig}" has zero template coverage — fires but nothing scores`)
  }
})

// ── 2. Ghost references in logic trees ────────────────────────────────────
const ghosts = []
for (const tree of (logicTrees.trees || [])) {
  for (const node of (tree.nodes || [])) {
    for (const name of (node.templates || [])) {
      if (name && typeof name === 'string' && name.length < 80 &&
          !name.startsWith('[') && !name.startsWith('a ') &&
          !allTitles.has(name) && !ghosts.includes(name)) {
        ghosts.push(name)
      }
    }
  }
}
if (ghosts.length > 0) {
  issues.push(`CRITICAL: ${ghosts.length} ghost reference(s) in logic trees — template names not found in search content`)
  ghosts.forEach(g => issues.push(`  ghost: "${g}"`))
}

// ── 3. Client template summary coverage ───────────────────────────────────
const missingFromSummaries = clientTemplates.filter(t => !summaryNames.has(t.title))
const coveragePct = Math.round(((clientTemplates.length - missingFromSummaries.length) / clientTemplates.length) * 100)

if (coveragePct < 90) {
  const msg = `Coverage: ${coveragePct}% of client templates have summaries (${missingFromSummaries.length} missing)`
  if (STRICT) { issues.push('CRITICAL: ' + msg) } else { warnings.push('WARNING: ' + msg) }
}

// ── 4. Empty semantic profiles ─────────────────────────────────────────────
const emptyProfiles = profiles.filter(p => !p.profile || Object.keys(p.profile).length === 0)
if (emptyProfiles.length > 0) {
  warnings.push(`WARNING: ${emptyProfiles.length} template(s) have empty semantic profiles — summaries exist but no signals matched`)
  emptyProfiles.slice(0, 5).forEach(p => warnings.push(`  empty: "${p.title}"`))
}

// ── 5. Client templates missing from profiles entirely ─────────────────────
const missingFromProfiles = clientTemplates.filter(t => !profileTitles.has(t.title))
if (missingFromProfiles.length > 0) {
  warnings.push(`WARNING: ${missingFromProfiles.length} client template(s) not in semantic-profiles.json at all`)
}

// ── Report ─────────────────────────────────────────────────────────────────
console.log('\n=== CONTENT COVERAGE AUDIT ===\n')
console.log(`Client templates:     ${clientTemplates.length}`)
console.log(`With summaries:       ${clientTemplates.length - missingFromSummaries.length} (${coveragePct}%)`)
console.log(`Profiles with data:   ${profiles.filter(p => p.profile && Object.keys(p.profile).length > 0).length}`)
console.log(`Ghost references:     ${ghosts.length}`)
console.log('\nSignal coverage:')
ALL_SIGNALS.forEach(s => {
  const count = signalCoverage[s] || 0
  const flag = count === 0 && !ZERO_COVERAGE_ALLOWED.has(s) ? ' ← CRITICAL' : ''
  console.log(`  ${s}: ${count} templates${flag}`)
})

if (warnings.length > 0) {
  console.log('\nWARNINGS:')
  warnings.forEach(w => console.log('  ' + w))
}

if (issues.length > 0) {
  console.log('\nCRITICAL ISSUES (blocking):')
  issues.forEach(e => console.log('  ' + e))
  console.log('\nAudit FAILED — fix critical issues before deploying.\n')
  process.exit(1)
}

console.log('\nAudit PASSED' + (warnings.length > 0 ? ' with warnings' : ' — all checks clear') + '.\n')
process.exit(0)
