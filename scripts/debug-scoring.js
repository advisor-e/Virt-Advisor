'use strict'

/**
 * Scoring debug harness — runs resolveTemplates() directly with known inputs.
 * No server, no webpack, no AI. Runs in ~2 seconds.
 *
 * Usage:
 *   node scripts/debug-scoring.js
 *   node scripts/debug-scoring.js --scenario=profit-margin
 *
 * This is the canonical scoring validation tool. Run it before and after any
 * change to templateResolver.js to verify expected ranking behaviour.
 */

const path = require('path')
const { resolveTemplates } = require('../server/utils/templateResolver')

const templates = require(path.resolve(__dirname, '../data/templates.json'))

// ── Scenarios ──────────────────────────────────────────────────────────────────
// Each scenario defines the exact CaseState + StrategyDecision that would be
// produced by the pipeline for a known advisor conversation. The watchList
// names templates that must appear in expected rank order.
const SCENARIOS = {
  'cafe-foot-traffic': {
    label: 'Café — foot traffic / customer acquisition [THE FAILING SCENARIO]',
    caseState: {
      domain: 'sales-marketing',
      staircaseLevel: 3,
      complexityCeiling: 'analytical',
      client: {
        requestedHelp: false,
        growthStage: 'established',
        operatorStyle: null,
        ownershipType: 'private',
        urgency: 'low'
      },
      advisor: { confidence: 'medium', experience: null, stretchWillingness: false },
      constraints: { sessionLength: null, meetingCount: null, templateBudget: 2 },
      diagnosticSignals: ['SALES_DIAGNOSIS', 'CLIENT_GROWTH_STAGE'],
      // sales_pipeline omitted: requires SALES_DIAGNOSIS==='volume' structured signal,
      // which had not fired in the failing live session
      solutionCategories: ['sales-marketing'],
      // Contaminated: cash_flow_gap fires from "gonna struggle to pay their bills"
      problemSignals: { sales_volume: 1, cash_flow_gap: 1 },
      reportingEngagement: null
    },
    strategyDecision: { engagementType: 'facilitation', templateBudget: 2 },
    watchList: ['Customer Journey', 'Quick Fire Diagnosis', 'Lite Feasibility'],
    // After fix: Customer Journey must rank above both QFD and Lite Feasibility
    mustRankAbove: [
      ['Customer Journey', 'Quick Fire Diagnosis'],
      ['Customer Journey', 'Lite Feasibility']
    ]
  },

  'profit-margin': {
    label: 'Profit — margin squeeze, uses reports, would benefit from review',
    caseState: {
      domain: 'profit',
      staircaseLevel: 3,
      complexityCeiling: 'analytical',
      client: {
        requestedHelp: false,
        growthStage: 'established',
        operatorStyle: null,
        ownershipType: 'private',
        urgency: 'low'
      },
      advisor: { confidence: 'medium', experience: null, stretchWillingness: false },
      constraints: { sessionLength: null, meetingCount: null, templateBudget: 2 },
      diagnosticSignals: ['REPORTING_ENGAGEMENT', 'VARIABLE_REVIEW_READINESS'],
      solutionCategories: ['profit', 'revenue_feasibility', 'reporting'],
      problemSignals: { profit_plateau: 1, pricing_issue: 1 },
      reportingEngagement: 'regular'
    },
    strategyDecision: { engagementType: 'education', templateBudget: 2 },
    watchList: [],
    mustRankAbove: []
  }
}

// ── Run ────────────────────────────────────────────────────────────────────────
const scenarioArg = process.argv.find(a => a.startsWith('--scenario='))
const scenarioKey = scenarioArg ? scenarioArg.split('=')[1] : 'cafe-foot-traffic'

const scenario = SCENARIOS[scenarioKey]
if (!scenario) {
  console.error('Unknown scenario: ' + scenarioKey)
  console.error('Available: ' + Object.keys(SCENARIOS).join(', '))
  process.exit(1)
}

const DIVIDER = '═'.repeat(72)
const RULE = '─'.repeat(72)

console.log('\n' + DIVIDER)
console.log('SCORING DEBUG: ' + scenario.label)
console.log(DIVIDER + '\n')

console.log('CaseState inputs:')
console.log('  domain:             ' + scenario.caseState.domain)
console.log('  complexityCeiling:  ' + scenario.caseState.complexityCeiling)
console.log('  engagementType:     ' + scenario.strategyDecision.engagementType)
console.log('  solutionCategories: ' + scenario.caseState.solutionCategories.join(', '))
console.log('  problemSignals:     ' + JSON.stringify(scenario.caseState.problemSignals))
console.log('  templateBudget:     ' + scenario.strategyDecision.templateBudget)
console.log()

const result = resolveTemplates(scenario.caseState, scenario.strategyDecision, templates)

if (result.noMatchReason) {
  console.log('NO MATCH: ' + result.noMatchReason)
  process.exit(0)
}

// ── Top N results ──────────────────────────────────────────────────────────────
const TOP_N = 15
const watchSet = new Set((scenario.watchList || []).map(n => n.toLowerCase()))

console.log('TOP ' + TOP_N + ' SCORED TEMPLATES:')
console.log(RULE)
result.scoringLog.slice(0, TOP_N).forEach((t, i) => {
  const isWatch = watchSet.has(t.title.toLowerCase())
  const marker = isWatch ? '  ◄◄◄' : ''
  console.log((String(i + 1)).padStart(2) + '. [' + t.score.toFixed(1).padStart(5) + ']  ' + t.title + marker)
  console.log('     subSection: ' + (t.subSection || '(none)') + '  |  richness: ' + t.profileRichness)
  console.log('     reasons:    ' + (t.matchReasons.length ? t.matchReasons.join(', ') : '(none)'))
})

// ── Selected ───────────────────────────────────────────────────────────────────
console.log()
console.log('SELECTED (budget=' + scenario.strategyDecision.templateBudget + '):')
result.selected.forEach((t, i) => {
  console.log('  ' + (i + 1) + '. ' + t.title + '  [score: ' + t.score.toFixed(1) + ']')
})

// ── Watchlist detail ───────────────────────────────────────────────────────────
if (scenario.watchList && scenario.watchList.length > 0) {
  console.log()
  console.log('WATCHLIST DETAIL:')
  console.log(RULE)
  for (const name of scenario.watchList) {
    const found = result.scoringLog.find(t => t.title.toLowerCase() === name.toLowerCase())
    if (found) {
      const rank = result.scoringLog.indexOf(found) + 1
      console.log(name + ':')
      console.log('  rank:       #' + rank)
      console.log('  score:      ' + found.score.toFixed(1))
      console.log('  richness:   ' + found.profileRichness)
      console.log('  subSection: ' + (found.subSection || '(none)'))
      console.log('  reasons:    ' + (found.matchReasons.length ? found.matchReasons.join(', ') : '(none)'))
    } else {
      console.log(name + ': scored 0 or ineligible (not in top ' + result.scoringLog.length + ' results)')
    }
  }
}

// ── mustRankAbove assertions ───────────────────────────────────────────────────
if (scenario.mustRankAbove && scenario.mustRankAbove.length > 0) {
  console.log()
  console.log('RANK ASSERTIONS:')
  console.log(RULE)
  let allPass = true
  for (const [higher, lower] of scenario.mustRankAbove) {
    const higherEntry = result.scoringLog.find(t => t.title.toLowerCase() === higher.toLowerCase())
    const lowerEntry = result.scoringLog.find(t => t.title.toLowerCase() === lower.toLowerCase())
    const higherRank = higherEntry ? result.scoringLog.indexOf(higherEntry) + 1 : null
    const lowerRank = lowerEntry ? result.scoringLog.indexOf(lowerEntry) + 1 : null
    const pass = higherRank !== null && (lowerRank === null || higherRank < lowerRank)
    const icon = pass ? '✓ PASS' : '✗ FAIL'
    console.log(icon + '  "' + higher + '" (#' + (higherRank || '?') + ') must rank above "' + lower + '" (#' + (lowerRank || '?') + ')')
    if (!pass) { allPass = false }
  }
  console.log()
  console.log(allPass ? '✓ All assertions passed.' : '✗ One or more assertions FAILED.')
}

console.log()
