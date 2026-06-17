'use strict'

const ADVISORY_STAIRCASE = require('../../data/advisory-staircase.json')
const DOMAINS = require('../../data/domains.json')
const { SIGNAL_TYPES } = require('./signals')
const { extractProblemSignals } = require('./problemSignals')

// Domain natural engagement type — what kind of delivery the domain typically requires.
// Built from data/domains.json (single source of truth); clientRequestedHelp must also
// be true before facilitation or advice is used.
const DOMAIN_NATURAL_ENGAGEMENT = DOMAINS.reduce((map, d) => {
  if (d.engagementType) { map[d.id] = d.engagementType }
  return map
}, {})

// Staircase level → complexity ceiling for template selection (Phase D).
// Reads from a staircase config (steps + defaultCeiling). Defaults to the
// platform base (data/advisory-staircase.json, the single source of truth); the
// request handler may pass a firm-specific staircase (base + firm override already
// blended) so a firm's customisation changes the ceiling. Falls back to the
// config's defaultCeiling when no step is set or the step is unknown.
function staircaseToCeiling (staircaseNum, staircase = ADVISORY_STAIRCASE) {
  if (!staircaseNum) { return staircase.defaultCeiling }
  const step = staircase.steps.find(s => s.step === staircaseNum)
  return step ? step.complexityCeiling : staircase.defaultCeiling
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
// Cause text for problem-signal extraction = the advisor's "what contributed?"
// answer (situationDiagnostic) PLUS their answer to the cause-first confirmation
// (domainConfirmed). Including the confirmation makes the advisor's correction at
// the check-in actually steer the selection — the problemSignals are the dominant
// scoring lever (memory design-cause-first-not-problem-first). A plain "yes, that's
// right" matches no dictionary phrase, so behaviour is unchanged unless the advisor
// says something signal-bearing. 'pending'/'skipped' sentinels are excluded.
function causeText (state) {
  return [state.situationDiagnostic, state.domainConfirmed]
    .filter(v => v && v !== 'pending' && v !== 'skipped')
    .join(' ')
}

// Pure function. Takes signals array + raw state → canonical typed CaseState.
// This is the authoritative input for the strategy resolver and template resolver.
// `staircase` is an optional pre-blended staircase config (base + firm override);
// when omitted it defaults to the platform base, so behaviour is unchanged for
// any firm that has not customised it.
function buildCaseState (signals, state, staircase = ADVISORY_STAIRCASE) {
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
    primaryIssue: state.primaryIssue && state.primaryIssue !== 'pending' ? state.primaryIssue : null,
    // Client industry (free text, e.g. "cafe") — a key selection factor: industry-
    // specific templates (the Revenue & Feasibility models) should win for a matching
    // client. Read by templateResolver to boost title/tag matches. null when not asked.
    industry: state.industry && state.industry !== 'pending' && state.industry !== 'skipped' ? state.industry : null,
    staircaseLevel: staircaseNum,
    complexityCeiling: staircaseToCeiling(staircaseNum, staircase),
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
    problemSignals: extractProblemSignals(causeText(state)),
    // 'regular' = client already uses reports; 'none' = no reports in use; null = not asked
    reportingEngagement: get(SIGNAL_TYPES.REPORTING_ENGAGEMENT) || null,
    // Advisor explicitly declined the profit driver / revenue model review.
    // Used by templateResolver to penalise all Revenue & Feasibility Models.
    modelingDeclined: get(SIGNAL_TYPES.VARIABLE_REVIEW_READINESS) === 'no',
    // pricing_issue has zero template coverage — no template addresses pricing as a primary outcome.
    // Reclassified as a consultation signal: advisor should discuss pricing directly, not via template.
    // Revisit once a dedicated pricing template exists in the library.
    needsPricingConsultation: !!get(SIGNAL_TYPES.PRICE_COMMUNICATION_NEED)
  }
}

module.exports = { buildCaseState, DOMAIN_NATURAL_ENGAGEMENT, staircaseToCeiling, causeText }
