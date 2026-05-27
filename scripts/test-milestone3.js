'use strict'

/**
 * Milestone 3 test — Deterministic strategy layer
 * Contract: engagement type, complexity ceiling, and sequencing constraints
 * are determined by code with 100% determinism. Same input = same output always.
 * Run: node scripts/test-milestone3.js
 */

const { buildCaseState } = require('../server/utils/caseState')
const { resolveStrategy } = require('../server/utils/strategyResolver')
const { extractSignals, deriveInferredState } = require('../server/utils/signals')

let passed = 0
let failed = 0
const failures = []

function check (label, actual, expected) {
  if (actual === expected) {
    console.log(`  ✓ ${label}: ${actual}`)
    passed++
  } else {
    console.log(`  ✗ ${label}: got "${actual}", expected "${expected}"`)
    failed++
    failures.push(`${label}: got "${actual}", expected "${expected}"`)
  }
}

function makeSignals (stateOverrides) {
  const state = Object.assign({
    detectedDomain: 'profit',
    clientRaisedIssue: 'yes they requested help',
    advisoryStaircase: 'Step 3',
    advisorConfidence: 'medium confidence',
    advisorExperience: 'developing'
  }, stateOverrides)

  const derived = {
    reportsYes: false,
    reportsNo: false,
    reportsFromAdvisorFirm: false,
    reviewYes: false,
    reviewNo: false,
    clientRaisedIssue: /requested|asked|\byes\b/i.test(state.clientRaisedIssue || ''),
    staircaseNum: state.advisoryStaircase
      ? parseInt((state.advisoryStaircase.match(/Step\s*([1-5])/i) || [])[1]) || null
      : null,
    meetingNum: 3,
    templateBudget: 3,
    hasPriceCommunication: false
  }

  const signals = extractSignals(state, derived)
  return { signals, state }
}

function strategy (stateOverrides, firmOverrides) {
  const { signals, state } = makeSignals(stateOverrides)
  const caseState = buildCaseState(signals, state)
  return resolveStrategy(caseState, firmOverrides)
}

// ── Test 1: Determinism — same input produces same output 3 times ───────────
console.log('\nTest 1 — Determinism')
const r1 = strategy({})
const r2 = strategy({})
const r3 = strategy({})
check('run 1 engagementType', r1.engagementType, r1.engagementType)
check('run 1 === run 2', JSON.stringify(r1), JSON.stringify(r2))
check('run 2 === run 3', JSON.stringify(r2), JSON.stringify(r3))

// ── Test 2: Advisor noticed → always education ───────────────────────────────
console.log('\nTest 2 — Advisor noticed → education regardless of domain/staircase')
const advNoticedProfit = strategy({ clientRaisedIssue: 'no I spotted it', detectedDomain: 'profit', advisoryStaircase: 'Step 5' })
check('profit Step5 advisor-noticed', advNoticedProfit.engagementType, 'education')

const advNoticedValuation = strategy({ clientRaisedIssue: 'advisor noticed', detectedDomain: 'valuation', advisoryStaircase: 'Step 5' })
check('valuation Step5 advisor-noticed', advNoticedValuation.engagementType, 'education')

// ── Test 3: Complexity ceiling from staircase — independent of engagement type
console.log('\nTest 3 — Complexity ceiling from staircase only')
check('Step 1 → foundational', strategy({ advisoryStaircase: 'Step 1' }).complexityCeiling, 'foundational')
check('Step 2 → foundational', strategy({ advisoryStaircase: 'Step 2' }).complexityCeiling, 'foundational')
check('Step 3 → analytical',   strategy({ advisoryStaircase: 'Step 3' }).complexityCeiling, 'analytical')
check('Step 4 → analytical',   strategy({ advisoryStaircase: 'Step 4' }).complexityCeiling, 'analytical')
check('Step 5 → strategic',    strategy({ advisoryStaircase: 'Step 5' }).complexityCeiling, 'strategic')

// ── Test 4: Domain natural engagement type (client requested help) ────────────
console.log('\nTest 4 — Domain natural engagement type when client requested help')
check('profit requested help → education',      strategy({ detectedDomain: 'profit',        clientRaisedIssue: 'yes they requested help' }).engagementType, 'education')
check('strategy requested help → facilitation', strategy({ detectedDomain: 'strategy',      clientRaisedIssue: 'yes they requested help' }).engagementType, 'facilitation')
check('valuation requested help → advice',      strategy({ detectedDomain: 'valuation',     clientRaisedIssue: 'yes they requested help' }).engagementType, 'advice')
check('risk requested help → advice',           strategy({ detectedDomain: 'risk',          clientRaisedIssue: 'yes they requested help' }).engagementType, 'advice')
check('succession requested help → advice',     strategy({ detectedDomain: 'succession',    clientRaisedIssue: 'yes they requested help' }).engagementType, 'advice')
check('governance requested help → facilitation', strategy({ detectedDomain: 'governance',  clientRaisedIssue: 'yes they requested help' }).engagementType, 'facilitation')
check('conflict requested help → facilitation', strategy({ detectedDomain: 'conflict',      clientRaisedIssue: 'yes they requested help' }).engagementType, 'facilitation')

// ── Test 5: Advisor constraint — low confidence + no stretch → education ─────
console.log('\nTest 5 — Advisor low confidence + no stretch → drops to education')
const lowNoStretch = strategy({
  detectedDomain: 'valuation',
  clientRaisedIssue: 'yes they requested help',
  advisorConfidence: 'not confident at all, unsure'
})
check('low confidence no stretch → education', lowNoStretch.engagementType, 'education')
check('advisor constraint applied', String(lowNoStretch.advisorConstraintApplied), 'true')

// ── Test 6: Advisor low confidence + willing to stretch → removes constraint ─
console.log('\nTest 6 — Advisor low confidence + willing to stretch → constraint removed')
const lowWithStretch = strategy({
  detectedDomain: 'valuation',
  clientRaisedIssue: 'yes they requested help',
  advisorConfidence: 'not confident but willing to stretch and try'
})
check('low confidence + stretch → advice', lowWithStretch.engagementType, 'advice')
check('advisor constraint NOT applied', String(lowWithStretch.advisorConstraintApplied), 'false')

// ── Test 7: Firm override replaces base values ────────────────────────────────
console.log('\nTest 7 — Firm overrides replace base values')
const overridden = strategy(
  { detectedDomain: 'profit', clientRaisedIssue: 'yes requested' },
  { engagementType: 'advice', complexityCeiling: 'strategic' }
)
check('firm override engagementType', overridden.engagementType, 'advice')
check('firm override complexityCeiling', overridden.complexityCeiling, 'strategic')

// ── Test 8: Staircase ceiling is independent of engagement type ────────────────
console.log('\nTest 8 — Staircase ceiling independent of engagement type')
const step1ValuationHelp = strategy({ detectedDomain: 'valuation', advisoryStaircase: 'Step 1', clientRaisedIssue: 'yes requested' })
check('valuation Step1 → advice engagement', step1ValuationHelp.engagementType, 'advice')
check('valuation Step1 → foundational ceiling', step1ValuationHelp.complexityCeiling, 'foundational')

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(50))
console.log(`Result: ${passed} passed, ${failed} failed`)

if (failed === 0) {
  console.log('MILESTONE 3 PASSED — strategy layer is fully deterministic\n')
  process.exit(0)
} else {
  console.log('\nFailed checks:')
  failures.forEach(f => console.log(`  ${f}`))
  process.exit(1)
}
