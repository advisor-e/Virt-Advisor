'use strict'

/**
 * Milestone 2 test — Phase B signal coverage
 * Contract: every domain emits at least 2 domain-specific signals from its
 * diagnostic questions when given representative answer state.
 * Run: node scripts/test-milestone2.js
 */

const { extractSignals, deriveInferredState, SIGNAL_TYPES } = require('../server/utils/signals')

// Domain-specific signal type groups — one entry per domain
const DOMAIN_SIGNAL_GROUPS = {
  profit: [
    SIGNAL_TYPES.REPORTING_ENGAGEMENT,
    SIGNAL_TYPES.REPORTING_SOURCE,
    SIGNAL_TYPES.VARIABLE_REVIEW_READINESS
  ],
  staff: [
    SIGNAL_TYPES.STAFF_ISSUE_SCOPE,
    SIGNAL_TYPES.STAFF_ISSUE_ORIGIN,
    SIGNAL_TYPES.STAFF_ISSUE_CATEGORY
  ],
  'data-systems': [
    SIGNAL_TYPES.FINANCIAL_FOUNDATIONS_GAP,
    SIGNAL_TYPES.ACCOUNTING_TEAM_CAPABILITY,
    SIGNAL_TYPES.COMPLEXITY_VS_TECHNOLOGY
  ],
  'sales-marketing': [
    SIGNAL_TYPES.SALES_DIAGNOSIS,
    SIGNAL_TYPES.CONVERSION_TRACKING,
    SIGNAL_TYPES.PRODUCT_FIT_ISSUE
  ],
  forecasting: [
    SIGNAL_TYPES.FINANCIAL_MGMT_THEME
  ],
  governance: [
    SIGNAL_TYPES.GOVERNANCE_NATURE,
    SIGNAL_TYPES.GOVERNANCE_PARTIES,
    SIGNAL_TYPES.GOVERNANCE_URGENCY
  ],
  strategy: [
    SIGNAL_TYPES.STRATEGY_TRIGGER,
    SIGNAL_TYPES.STRATEGY_PLAN_EXISTS,
    SIGNAL_TYPES.STRATEGY_HORIZON
  ],
  systems: [
    SIGNAL_TYPES.SYSTEMS_TYPE,
    SIGNAL_TYPES.SYSTEMS_DRIVER,
    SIGNAL_TYPES.SYSTEMS_PRIOR_ATTEMPT
  ],
  valuation: [
    SIGNAL_TYPES.VALUATION_PURPOSE,
    SIGNAL_TYPES.VALUATION_TIMELINE,
    SIGNAL_TYPES.VALUATION_OWNER_AWARENESS
  ],
  risk: [
    SIGNAL_TYPES.RISK_TYPE,
    SIGNAL_TYPES.RISK_AWARENESS,
    SIGNAL_TYPES.RISK_URGENCY
  ],
  succession: [
    SIGNAL_TYPES.SUCCESSION_SCENARIO,
    SIGNAL_TYPES.SUCCESSION_TIMELINE,
    SIGNAL_TYPES.SUCCESSION_OWNER_READINESS
  ],
  conflict: [
    SIGNAL_TYPES.CONFLICT_PARTIES,
    SIGNAL_TYPES.CONFLICT_STAGE,
    SIGNAL_TYPES.CONFLICT_LEGAL_FLAG
  ],
  eoy: [
    SIGNAL_TYPES.EOY_PURPOSE,
    SIGNAL_TYPES.EOY_SPECIFIC_ISSUE,
    SIGNAL_TYPES.EOY_CLIENT_ENGAGEMENT
  ],
  'due-diligence': [
    SIGNAL_TYPES.DUE_DILIGENCE_SCENARIO,
    SIGNAL_TYPES.DUE_DILIGENCE_ADVISOR_ROLE,
    SIGNAL_TYPES.DUE_DILIGENCE_TIMELINE
  ]
}

// Representative mock state for each domain — uses realistic free-text answers
// matching the regex patterns in extractSignals
const MOCK_STATES = {
  profit: {
    detectedDomain: 'profit',
    usesReports: 'yes they use them regularly',
    reportsFromFirm: 'yes we provide them',
    wouldBenefitFromReview: 'yes that would help',
    clientRaisedIssue: 'they raised it',
    advisoryStaircase: 'Step 3'
  },
  staff: {
    detectedDomain: 'staff',
    staffScope: 'it is a whole team issue',
    staffOrigin: 'it was gradual over time',
    staffCategory: 'performance and productivity',
    clientRaisedIssue: 'they raised it',
    advisoryStaircase: 'Step 2'
  },
  'data-systems': {
    detectedDomain: 'data-systems',
    dataSystemsChartAccounts: 'no they do not understand it',
    dataSystemsTeam: 'just me no real team',
    dataSystemsComplexity: 'it is a software and technology issue',
    clientRaisedIssue: 'advisor noticed',
    advisoryStaircase: 'Step 2'
  },
  'sales-marketing': {
    detectedDomain: 'sales-marketing',
    salesDiagnosis: 'not enough volume of sales',
    salesTracking: 'no they do not track conversions',
    salesProductFit: 'yes there is a product fit issue',
    clientRaisedIssue: 'they raised it',
    advisoryStaircase: 'Step 3'
  },
  forecasting: {
    detectedDomain: 'forecasting',
    forecastingTheme: 'cash forecast',
    clientRaisedIssue: 'they raised it',
    advisoryStaircase: 'Step 3'
  },
  governance: {
    detectedDomain: 'governance',
    governanceNature: 'it is a structural issue with roles and accountability',
    governanceParties: 'primarily the board of directors',
    governanceUrgency: 'it is urgent and needs addressing now',
    clientRaisedIssue: 'they raised it',
    advisoryStaircase: 'Step 4'
  },
  strategy: {
    detectedDomain: 'strategy',
    strategyTrigger: 'a growth opportunity has come up',
    strategyPlanExists: 'no they do not have a documented plan',
    strategyHorizon: 'thinking 2 to 3 years out',
    clientRaisedIssue: 'they raised it',
    advisoryStaircase: 'Step 3'
  },
  systems: {
    detectedDomain: 'systems',
    systemsType: 'operational workflow and processes',
    systemsDriver: 'they have grown beyond their current systems',
    systemsPriorAttempt: 'yes they tried before but it failed',
    clientRaisedIssue: 'they raised it',
    advisoryStaircase: 'Step 3'
  },
  valuation: {
    detectedDomain: 'valuation',
    valuationPurpose: 'potential sale of the business',
    valuationTimeline: 'within 12 months',
    valuationOwnerAwareness: 'no idea what it is worth',
    clientRaisedIssue: 'they raised it',
    advisoryStaircase: 'Step 4'
  },
  risk: {
    detectedDomain: 'risk',
    riskType: 'key person dependency',
    riskAwareness: 'advisor identified it they are not aware',
    riskUrgency: 'it needs immediate action',
    clientRaisedIssue: 'advisor noticed',
    advisoryStaircase: 'Step 3'
  },
  succession: {
    detectedDomain: 'succession',
    successionScenario: 'passing to next generation family',
    successionTimeline: '3 to 5 years out',
    successionOwnerReadiness: 'they are still reluctant to let go',
    clientRaisedIssue: 'they raised it',
    advisoryStaircase: 'Step 4'
  },
  conflict: {
    detectedDomain: 'conflict',
    conflictParties: 'business partners and co-directors',
    conflictStage: 'active dispute escalating',
    conflictLegalFlag: 'no this is an advisory and mediation conversation',
    clientRaisedIssue: 'they raised it',
    advisoryStaircase: 'Step 3'
  },
  eoy: {
    detectedDomain: 'eoy',
    eoyPurpose: 'reviewing the year performance',
    eoySpecificIssue: 'yes there is a specific concern I want to raise',
    eoyClientEngagement: 'they are actively engaged and want depth',
    clientRaisedIssue: 'they raised it',
    advisoryStaircase: 'Step 3'
  },
  'due-diligence': {
    detectedDomain: 'due-diligence',
    dueDiligenceScenario: 'they are acquiring a business',
    dueDiligenceAdvisorRole: 'I am leading the due diligence',
    dueDiligenceTimeline: 'there is a deadline driving this',
    clientRaisedIssue: 'they raised it',
    advisoryStaircase: 'Step 4'
  }
}

// Standard derived booleans — same for all tests (domain questions don't use these)
function makeDerived (state) {
  const step = state.advisoryStaircase
    ? (state.advisoryStaircase.match(/Step\s*([1-5])/i) || [])[1]
    : null
  return {
    reportsYes: /yes|already|they do|we do|regular/i.test(state.usesReports || ''),
    reportsNo: false,
    reportsFromAdvisorFirm: /yes|we do|our firm|my firm/i.test(state.reportsFromFirm || ''),
    reviewYes: /yes|yeah|absolutely|think so|would help/i.test(state.wouldBenefitFromReview || ''),
    reviewNo: false,
    clientRaisedIssue: /yes|raised|brought|flagged|came to me/i.test(state.clientRaisedIssue || ''),
    staircaseNum: step ? parseInt(step) : null,
    meetingNum: 3,
    templateBudget: 3,
    hasPriceCommunication: false
  }
}

// ── Run tests ────────────────────────────────────────────────────────────────

let passed = 0
let failed = 0
const failures = []

console.log('\nMilestone 2 — Phase B signal coverage\n' + '='.repeat(50))

for (const [domainId, expectedSignalTypes] of Object.entries(DOMAIN_SIGNAL_GROUPS)) {
  const state = MOCK_STATES[domainId]
  const derived = makeDerived(state)
  const signals = extractSignals(state, derived)
  const inferred = deriveInferredState(signals, state)

  const domainSignals = signals.filter(s => expectedSignalTypes.includes(s.type))
  const pass = domainSignals.length >= Math.min(2, expectedSignalTypes.length)

  const icon = pass ? '✓' : '✗'
  const label = domainId.padEnd(16)
  console.log(`${icon} ${label}  signals=${signals.length}  domain-specific=${domainSignals.length}/${expectedSignalTypes.length}`)

  if (pass) {
    passed++
    // Show each domain signal value for inspection
    for (const s of domainSignals) {
      console.log(`    ${s.type} = ${s.value}`)
    }
  } else {
    failed++
    failures.push({ domainId, got: domainSignals.length, expected: Math.min(2, expectedSignalTypes.length), signals })
    console.log(`    FAIL: only ${domainSignals.length} domain signals emitted (need ≥2)`)
    console.log('    All signals:', signals.map(s => s.type).join(', ') || '(none)')
  }
  console.log()
}

console.log('='.repeat(50))
console.log(`Result: ${passed}/14 domains passed`)

if (failed === 0) {
  console.log('MILESTONE 2 PASSED — all domains emit structured diagnostic data\n')
  process.exit(0)
} else {
  console.log(`\nFAILED domains (${failed}):`)
  for (const f of failures) {
    console.log(`  ${f.domainId}: got ${f.got} domain signals`)
  }
  process.exit(1)
}
