'use strict'

// ── Signal type constants ──────────────────────────────────────────────────
// Each constant is the canonical string key used in signal payloads.
// Adding a new signal = add a constant here + extraction logic in extractSignals.
const SIGNAL_TYPES = {
  // Situation
  CLIENT_AWARENESS: 'client_awareness',
  // Client
  BUSINESS_OWNERSHIP: 'business_ownership',
  CLIENT_GROWTH_STAGE: 'client_growth_stage',
  OPERATOR_EXECUTION_STYLE: 'operator_execution_style',
  // Profit domain
  REPORTING_ENGAGEMENT: 'reporting_engagement',
  REPORTING_SOURCE: 'reporting_source',
  VARIABLE_REVIEW_READINESS: 'variable_review_readiness',
  PRICE_COMMUNICATION_NEED: 'price_communication_need',
  // Staff domain
  STAFF_ISSUE_SCOPE: 'staff_issue_scope',
  STAFF_ISSUE_ORIGIN: 'staff_issue_origin',
  STAFF_ISSUE_CATEGORY: 'staff_issue_category',
  // Data-systems domain
  FINANCIAL_FOUNDATIONS_GAP: 'financial_foundations_gap',
  ACCOUNTING_TEAM_CAPABILITY: 'accounting_team_capability',
  COMPLEXITY_VS_TECHNOLOGY: 'complexity_vs_technology',
  // Sales-marketing domain
  SALES_DIAGNOSIS: 'sales_diagnosis',
  CONVERSION_TRACKING: 'conversion_tracking',
  PRODUCT_FIT_ISSUE: 'product_fit_issue',
  // Forecasting domain
  FINANCIAL_MGMT_THEME: 'financial_mgmt_theme',
  // Relationship
  RELATIONSHIP_MATURITY: 'relationship_maturity',
  // Advisor
  ADVISOR_EXPERIENCE_LEVEL: 'advisor_experience_level',
  ADVISOR_CONFIDENCE_LEVEL: 'advisor_confidence_level',
  // Constraints
  TEMPLATE_BUDGET: 'template_budget',
  SESSION_LENGTH: 'session_length',
  MEETING_COUNT: 'meeting_count'
}

// Stub slots for the 9 domains with no questions yet — populated in Phase B.
// Listed here so the schema is complete and observable even before Phase B.
const STUB_DOMAIN_SIGNALS = [
  'governance_issue_type',
  'strategy_planning_horizon',
  'systems_change_driver',
  'valuation_purpose',
  'risk_category',
  'succession_timeline',
  'conflict_party_type',
  'eoy_meeting_focus',
  'due_diligence_role'
]

function sig (type, source, value) {
  return { type, source, value }
}

// ── extractSignals ─────────────────────────────────────────────────────────
// Pure function. Takes raw state + pre-computed derived booleans from advisor.js.
// Returns array of signal objects. No side effects, no AI calls.
// Derived booleans come from advisor.js to avoid duplicating regex patterns
// that already exist there. New extractions (ownership, confidence, etc.) live here.
function extractSignals (state, derived) {
  const {
    reportsYes,
    reportsFromAdvisorFirm,
    reviewYes,
    reviewNo,
    clientRaisedIssue: clientRaised,
    staircaseNum,
    meetingNum,
    templateBudget,
    hasPriceCommunication
  } = derived

  const signals = []

  // ── Situation signals ────────────────────────────────────────────────────
  if (state.clientRaisedIssue && state.clientRaisedIssue !== 'pending') {
    signals.push(sig(
      SIGNAL_TYPES.CLIENT_AWARENESS,
      'q_clientRaisedIssue',
      clientRaised ? 'client_raised' : 'advisor_noticed'
    ))
  }

  // ── Client signals ───────────────────────────────────────────────────────
  if (state.ownership && state.ownership !== 'pending') {
    const own = /nfp|non.profit|not.for.profit|charity/i.test(state.ownership)
      ? 'nfp'
      : /public|listed|asx|nyse|exchange/i.test(state.ownership)
        ? 'public_listed'
        : 'private'
    signals.push(sig(SIGNAL_TYPES.BUSINESS_OWNERSHIP, 'q_ownership', own))
  }

  if (state.growthStage && state.growthStage !== 'pending') {
    signals.push(sig(
      SIGNAL_TYPES.CLIENT_GROWTH_STAGE,
      'q_growthStage',
      state.growthStage.toLowerCase().replace(/[\s/]+/g, '_').replace(/[^a-z_]/g, '')
    ))
  }

  if (state.operatorPlanning && state.operatorPlanning !== 'pending') {
    const structured = /plan|structured|follow|act on|systematic|disciplined/i.test(state.operatorPlanning)
    signals.push(sig(
      SIGNAL_TYPES.OPERATOR_EXECUTION_STYLE,
      'q_operatorPlanning',
      structured ? 'structured' : 'day_to_day'
    ))
  }

  // ── Relationship signals ─────────────────────────────────────────────────
  if (staircaseNum) {
    signals.push(sig(SIGNAL_TYPES.RELATIONSHIP_MATURITY, 'q_advisoryStaircase', staircaseNum))
  }

  // ── Advisor signals ──────────────────────────────────────────────────────
  if (state.advisorConfidence && state.advisorConfidence !== 'pending') {
    const conf = /very confident|highly confident|comfortable|strong|experienced with|second nature|familiar/i.test(state.advisorConfidence)
      ? 'high'
      : /not confident|unsure|new to|haven.t|first time|stretch|nervous|unfamiliar|out of my/i.test(state.advisorConfidence)
        ? 'low'
        : 'medium'
    signals.push(sig(SIGNAL_TYPES.ADVISOR_CONFIDENCE_LEVEL, 'q_advisorConfidence', conf))
  }

  if (state.advisorExperience && state.advisorExperience !== 'pending') {
    const exp = /10\s*\+|10 year|many year|over a decade|veteran|senior|long.time|15|20/i.test(state.advisorExperience)
      ? 'experienced'
      : /new|just started|beginner|learning|first year|1 year|2 year|3 year|starting out/i.test(state.advisorExperience)
        ? 'new'
        : 'developing'
    signals.push(sig(SIGNAL_TYPES.ADVISOR_EXPERIENCE_LEVEL, 'q_advisorExperience', exp))
  }

  // ── Constraint signals ───────────────────────────────────────────────────
  if (meetingNum) {
    signals.push(sig(SIGNAL_TYPES.MEETING_COUNT, 'q_advisorMeetingCount', meetingNum))
  }
  if (state.advisorSessionLength && state.advisorSessionLength !== 'pending') {
    signals.push(sig(SIGNAL_TYPES.SESSION_LENGTH, 'q_advisorSessionLength', state.advisorSessionLength))
  }
  if (templateBudget !== undefined && templateBudget !== null) {
    signals.push(sig(SIGNAL_TYPES.TEMPLATE_BUDGET, 'computed', templateBudget))
  }

  // ── Profit domain signals ────────────────────────────────────────────────
  if (state.detectedDomain === 'profit') {
    if (state.usesReports && state.usesReports !== 'pending') {
      signals.push(sig(
        SIGNAL_TYPES.REPORTING_ENGAGEMENT,
        'q_usesReports',
        reportsYes ? 'regular' : 'none'
      ))
    }
    if (state.reportsFromFirm && state.reportsFromFirm !== 'pending') {
      signals.push(sig(
        SIGNAL_TYPES.REPORTING_SOURCE,
        'q_reportsFromFirm',
        reportsFromAdvisorFirm ? 'advisor_firm' : 'external'
      ))
    }
    if (state.wouldBenefitFromReview && state.wouldBenefitFromReview !== 'pending') {
      signals.push(sig(
        SIGNAL_TYPES.VARIABLE_REVIEW_READINESS,
        'q_wouldBenefitFromReview',
        reviewYes
          ? 'yes'
          : reviewNo
            ? 'no'
            : 'uncertain'
      ))
    }
    if (hasPriceCommunication) {
      signals.push(sig(SIGNAL_TYPES.PRICE_COMMUNICATION_NEED, 'computed_pattern', true))
    }
  }

  // ── Staff domain signals ─────────────────────────────────────────────────
  if (state.detectedDomain === 'staff') {
    if (state.staffScope && state.staffScope !== 'pending') {
      const scope = /individual|one person|single|specific employee|one staff/i.test(state.staffScope)
        ? 'individual'
        : /whole team|entire|all staff|organisation|company.wide/i.test(state.staffScope)
          ? 'whole_team'
          : 'small_group'
      signals.push(sig(SIGNAL_TYPES.STAFF_ISSUE_SCOPE, 'q_staffScope', scope))
    }
    if (state.staffOrigin && state.staffOrigin !== 'pending') {
      const origin = /event|incident|sudden|specific|trigger|happened|started when/i.test(state.staffOrigin)
        ? 'event_driven'
        : 'gradual'
      signals.push(sig(SIGNAL_TYPES.STAFF_ISSUE_ORIGIN, 'q_staffOrigin', origin))
    }
    if (state.staffCategory && state.staffCategory !== 'pending') {
      const cat = /law|legal|hr issue|terminate|dismiss|redundan|employ/i.test(state.staffCategory)
        ? 'employment_law'
        : /performance|underperform|productivity|output/i.test(state.staffCategory)
          ? 'performance'
          : /culture|morale|engagement|attitude|toxic/i.test(state.staffCategory)
            ? 'culture'
            : 'development'
      signals.push(sig(SIGNAL_TYPES.STAFF_ISSUE_CATEGORY, 'q_staffCategory', cat))
    }
  }

  // ── Data-systems domain signals ──────────────────────────────────────────
  if (state.detectedDomain === 'data-systems') {
    if (state.dataSystemsChartAccounts && state.dataSystemsChartAccounts !== 'pending') {
      const gap = /no|don.t|doesn.t|not|poor|weak|unclear|wrong|basic|limited|no idea|not sure/i.test(state.dataSystemsChartAccounts)
        ? 'yes'
        : /yes|good|strong|solid|understand|use them|have it/i.test(state.dataSystemsChartAccounts)
          ? 'no'
          : 'partial'
      signals.push(sig(SIGNAL_TYPES.FINANCIAL_FOUNDATIONS_GAP, 'q_dataSystemsChartAccounts', gap))
    }
    if (state.dataSystemsTeam && state.dataSystemsTeam !== 'pending') {
      const cap = /experienced|strong|qualified|good team|capable/i.test(state.dataSystemsTeam)
        ? 'strong'
        : /no one|no staff|just me|small|minimal/i.test(state.dataSystemsTeam)
          ? 'weak'
          : 'developing'
      signals.push(sig(SIGNAL_TYPES.ACCOUNTING_TEAM_CAPABILITY, 'q_dataSystemsTeam', cap))
    }
    if (state.dataSystemsComplexity && state.dataSystemsComplexity !== 'pending') {
      const type = /software|system|tech|tool|xero|myob|platform|app/i.test(state.dataSystemsComplexity)
        ? 'technology'
        : /complex|process|workflow|understanding|skills|knowledge/i.test(state.dataSystemsComplexity)
          ? 'complexity'
          : 'both'
      signals.push(sig(SIGNAL_TYPES.COMPLEXITY_VS_TECHNOLOGY, 'q_dataSystemsComplexity', type))
    }
  }

  // ── Sales-marketing domain signals ───────────────────────────────────────
  if (state.detectedDomain === 'sales-marketing') {
    if (state.salesDiagnosis && state.salesDiagnosis !== 'pending') {
      const diag = /volume|more sales|more clients|leads|not enough/i.test(state.salesDiagnosis)
        ? 'volume'
        : /profit|margin|pricing|making enough/i.test(state.salesDiagnosis)
          ? 'profitability'
          : /both|and also|unsure|unclear|don.t know|not sure/i.test(state.salesDiagnosis)
            ? 'both'
            : 'unclear'
      signals.push(sig(SIGNAL_TYPES.SALES_DIAGNOSIS, 'q_salesDiagnosis', diag))
    }
    if (state.salesTracking && state.salesTracking !== 'pending') {
      const track = /yes|do track|measure|monitor|crm|spreadsheet|system/i.test(state.salesTracking)
        ? 'yes'
        : /no|don.t|not really|nothing|never|no system/i.test(state.salesTracking)
          ? 'no'
          : 'partial'
      signals.push(sig(SIGNAL_TYPES.CONVERSION_TRACKING, 'q_salesTracking', track))
    }
    if (state.salesProductFit && state.salesProductFit !== 'pending') {
      const fit = /yes|issue|problem|wrong|mismatch|don.t fit|not right/i.test(state.salesProductFit)
        ? 'yes'
        : /no|fine|good|ok|not an issue/i.test(state.salesProductFit)
          ? 'no'
          : 'unknown'
      signals.push(sig(SIGNAL_TYPES.PRODUCT_FIT_ISSUE, 'q_salesProductFit', fit))
    }
  }

  // ── Forecasting domain signals ────────────────────────────────────────────
  if (state.detectedDomain === 'forecasting') {
    if (state.forecastingTheme && state.forecastingTheme !== 'pending') {
      signals.push(sig(SIGNAL_TYPES.FINANCIAL_MGMT_THEME, 'q_forecastingTheme', state.forecastingTheme))
    }
  }

  return signals
}

// ── deriveInferredState ────────────────────────────────────────────────────
// Converts signal array into a flat, readable CaseState snapshot.
// This is the Phase A version — will evolve into the full typed CaseState in Phase C.
function deriveInferredState (signals, state) {
  const get = (type) => {
    const found = signals.find(s => s.type === type)
    return found ? found.value : null
  }

  return {
    domain: state.detectedDomain || null,
    clientAwareness: get(SIGNAL_TYPES.CLIENT_AWARENESS),
    businessOwnership: get(SIGNAL_TYPES.BUSINESS_OWNERSHIP),
    growthStage: get(SIGNAL_TYPES.CLIENT_GROWTH_STAGE),
    operatorStyle: get(SIGNAL_TYPES.OPERATOR_EXECUTION_STYLE),
    relationshipMaturity: get(SIGNAL_TYPES.RELATIONSHIP_MATURITY),
    advisorConfidenceLevel: get(SIGNAL_TYPES.ADVISOR_CONFIDENCE_LEVEL),
    advisorExperienceLevel: get(SIGNAL_TYPES.ADVISOR_EXPERIENCE_LEVEL),
    templateBudget: get(SIGNAL_TYPES.TEMPLATE_BUDGET),
    sessionLength: get(SIGNAL_TYPES.SESSION_LENGTH),
    meetingCount: get(SIGNAL_TYPES.MEETING_COUNT),
    // Domain-specific
    reportingEngagement: get(SIGNAL_TYPES.REPORTING_ENGAGEMENT),
    reportingSource: get(SIGNAL_TYPES.REPORTING_SOURCE),
    variableReviewReadiness: get(SIGNAL_TYPES.VARIABLE_REVIEW_READINESS),
    priceCommunicationNeeded: get(SIGNAL_TYPES.PRICE_COMMUNICATION_NEED),
    staffIssueScope: get(SIGNAL_TYPES.STAFF_ISSUE_SCOPE),
    staffIssueOrigin: get(SIGNAL_TYPES.STAFF_ISSUE_ORIGIN),
    staffIssueCategory: get(SIGNAL_TYPES.STAFF_ISSUE_CATEGORY),
    financialFoundationsGap: get(SIGNAL_TYPES.FINANCIAL_FOUNDATIONS_GAP),
    accountingTeamCapability: get(SIGNAL_TYPES.ACCOUNTING_TEAM_CAPABILITY),
    complexityVsTechnology: get(SIGNAL_TYPES.COMPLEXITY_VS_TECHNOLOGY),
    salesDiagnosis: get(SIGNAL_TYPES.SALES_DIAGNOSIS),
    conversionTracking: get(SIGNAL_TYPES.CONVERSION_TRACKING),
    productFitIssue: get(SIGNAL_TYPES.PRODUCT_FIT_ISSUE),
    financialMgmtTheme: get(SIGNAL_TYPES.FINANCIAL_MGMT_THEME)
  }
}

// ── buildObservabilityPayload ──────────────────────────────────────────────
// Assembles the four-object log payload written at Phase 3 time.
// strategySnapshot: object built inline in advisor.js from already-computed vars.
// preFilteredNames: output of walkLogicTree — null if pre-filter returned nothing.
function buildObservabilityPayload (sessionId, domain, signals, inferredState, strategySnapshot, preFilteredNames) {
  return {
    sessionId: sessionId || 'unknown',
    domain: domain || 'undetected',
    detectedSignals: signals,
    inferredState,
    strategyDecision: strategySnapshot,
    templateScores: (preFilteredNames || []).map((name, i) => ({
      title: name,
      source: 'logic_tree_walk',
      rank: i + 1
    }))
  }
}

module.exports = { extractSignals, deriveInferredState, buildObservabilityPayload, SIGNAL_TYPES, STUB_DOMAIN_SIGNALS }
