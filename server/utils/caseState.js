'use strict'

const { SIGNAL_TYPES } = require('./signals')
const { extractProblemSignals } = require('./problemSignals')

// Domain natural engagement type — what kind of delivery the domain typically requires.
// clientRequestedHelp must also be true before facilitation or advice is used.
const DOMAIN_NATURAL_ENGAGEMENT = {
  // Education — teaching clients to understand their numbers/situation
  profit: 'education',
  'data-systems': 'education',
  forecasting: 'education',
  'stock-purchasing': 'education',
  'raising-capital': 'education',
  // Facilitation — working through options and decisions together
  staff: 'facilitation',
  'sales-marketing': 'facilitation',
  governance: 'facilitation',
  strategy: 'facilitation',
  systems: 'facilitation',
  conflict: 'facilitation',
  eoy: 'facilitation',
  'fm-coach-culture': 'facilitation',
  'org-capacity-planner': 'facilitation',
  'org-board-pack': 'facilitation',
  'people-power': 'facilitation',
  'org-leadership': 'facilitation',
  // Advice — specific expert recommendations required
  valuation: 'advice',
  risk: 'advice',
  succession: 'advice',
  'due-diligence': 'advice',
  'org-firm-strategy': 'advice'
}

// Staircase level → complexity ceiling for template selection (Phase D)
function staircaseToCeiling (staircaseNum) {
  if (!staircaseNum) { return 'foundational' }
  if (staircaseNum <= 2) { return 'foundational' }
  if (staircaseNum <= 4) { return 'analytical' }
  return 'strategic'
}

// Signal → solution category mappings — used by Phase D template scorer
function deriveSolutionCategories (signals, domain) {
  const categories = new Set()
  const get = (type) => {
    const s = signals.find(s => s.type === type)
    return s ? s.value : null
  }

  if (domain) { categories.add(domain) }

  // Profit domain
  if (get(SIGNAL_TYPES.REPORTING_ENGAGEMENT) === 'none') { categories.add('reporting') }
  if (get(SIGNAL_TYPES.VARIABLE_REVIEW_READINESS) === 'yes') { categories.add('revenue_feasibility') }
  if (get(SIGNAL_TYPES.PRICE_COMMUNICATION_NEED)) { categories.add('pricing') }
  if (get(SIGNAL_TYPES.FINANCIAL_FOUNDATIONS_GAP) === 'yes') { categories.add('financial_literacy') }

  // Staff domain
  const staffCat = get(SIGNAL_TYPES.STAFF_ISSUE_CATEGORY)
  if (staffCat === 'performance' || staffCat === 'development' || staffCat === 'culture') {
    categories.add('staff_development')
  }
  if (staffCat === 'employment_law') { categories.add('specialist') }

  // Sales-marketing domain
  const salesDiag = get(SIGNAL_TYPES.SALES_DIAGNOSIS)
  if (salesDiag === 'volume') { categories.add('sales_pipeline') }
  if (salesDiag === 'profitability') { categories.add('revenue_feasibility') }
  if (get(SIGNAL_TYPES.CONVERSION_TRACKING) === 'no') { categories.add('marketing') }
  if (get(SIGNAL_TYPES.PRODUCT_FIT_ISSUE) === 'yes') { categories.add('marketing') }

  // Forecasting
  if (get(SIGNAL_TYPES.FINANCIAL_MGMT_THEME)) { categories.add('reporting') }

  // Specialist/advice domains
  if (get(SIGNAL_TYPES.GOVERNANCE_NATURE)) { categories.add('governance') }
  if (get(SIGNAL_TYPES.STRATEGY_TRIGGER)) { categories.add('strategy') }
  if (get(SIGNAL_TYPES.SYSTEMS_TYPE)) { categories.add('systems') }
  if (get(SIGNAL_TYPES.VALUATION_PURPOSE)) { categories.add('specialist') }
  if (get(SIGNAL_TYPES.RISK_TYPE)) { categories.add('risk') }
  if (get(SIGNAL_TYPES.SUCCESSION_SCENARIO)) { categories.add('specialist') }
  if (get(SIGNAL_TYPES.CONFLICT_PARTIES)) { categories.add('specialist') }
  if (get(SIGNAL_TYPES.EOY_PURPOSE)) { categories.add('eoy') }
  if (get(SIGNAL_TYPES.DUE_DILIGENCE_SCENARIO)) { categories.add('specialist') }

  return [...categories]
}

// Aggregate urgency from any domain urgency signal that fired
function deriveUrgency (signals) {
  const get = (type) => {
    const s = signals.find(s => s.type === type)
    return s ? s.value : null
  }
  if (
    get(SIGNAL_TYPES.GOVERNANCE_URGENCY) === 'urgent' ||
    get(SIGNAL_TYPES.RISK_URGENCY) === 'immediate'
  ) { return 'high' }
  if (get(SIGNAL_TYPES.RISK_URGENCY) === 'medium') { return 'medium' }
  return 'low'
}

// ── buildCaseState ─────────────────────────────────────────────────────────
// Pure function. Takes signals array + raw state → canonical typed CaseState.
// This is the authoritative input for the strategy resolver and template resolver.
function buildCaseState (signals, state) {
  const get = (type) => {
    const s = signals.find(s => s.type === type)
    return s ? s.value : null
  }

  const staircaseNum = get(SIGNAL_TYPES.RELATIONSHIP_MATURITY)
  const advisorConfidence = get(SIGNAL_TYPES.ADVISOR_CONFIDENCE_LEVEL)
  const advisorExperience = get(SIGNAL_TYPES.ADVISOR_EXPERIENCE_LEVEL)

  // Stretch willingness — inferred from free-text confidence answer
  const stretchWillingness = state.advisorConfidence
    ? /stretch|willing|happy to try|give it a go|have a go|push myself|attempt/i.test(state.advisorConfidence)
    : false

  // Lens 2: client requested help = awareness + desire signal
  const clientRequestedHelp = get(SIGNAL_TYPES.CLIENT_AWARENESS) === 'client_raised'

  return {
    domain: state.detectedDomain || null,
    staircaseLevel: staircaseNum,
    complexityCeiling: staircaseToCeiling(staircaseNum),
    client: {
      requestedHelp: clientRequestedHelp,
      growthStage: get(SIGNAL_TYPES.CLIENT_GROWTH_STAGE),
      operatorStyle: get(SIGNAL_TYPES.OPERATOR_EXECUTION_STYLE),
      ownershipType: get(SIGNAL_TYPES.BUSINESS_OWNERSHIP),
      urgency: deriveUrgency(signals)
    },
    advisor: {
      confidence: advisorConfidence,
      experience: advisorExperience,
      stretchWillingness
    },
    constraints: {
      sessionLength: get(SIGNAL_TYPES.SESSION_LENGTH),
      meetingCount: get(SIGNAL_TYPES.MEETING_COUNT),
      templateBudget: get(SIGNAL_TYPES.TEMPLATE_BUDGET)
    },
    diagnosticSignals: signals.map(s => s.type),
    solutionCategories: deriveSolutionCategories(signals, state.detectedDomain),
    problemSignals: extractProblemSignals(state.situationDiagnostic || ''),
    // 'regular' = client already uses reports; 'none' = no reports in use; null = not asked
    reportingEngagement: get(SIGNAL_TYPES.REPORTING_ENGAGEMENT) || null
  }
}

module.exports = { buildCaseState, DOMAIN_NATURAL_ENGAGEMENT, staircaseToCeiling }
