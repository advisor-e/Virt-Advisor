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
  MEETING_COUNT: 'meeting_count',
  // Governance domain
  GOVERNANCE_NATURE: 'governance_nature',
  GOVERNANCE_PARTIES: 'governance_parties',
  GOVERNANCE_URGENCY: 'governance_urgency',
  // Strategy domain
  STRATEGY_TRIGGER: 'strategy_trigger',
  STRATEGY_PLAN_EXISTS: 'strategy_plan_exists',
  STRATEGY_HORIZON: 'strategy_horizon',
  // Systems domain
  SYSTEMS_TYPE: 'systems_type',
  SYSTEMS_DRIVER: 'systems_driver',
  SYSTEMS_PRIOR_ATTEMPT: 'systems_prior_attempt',
  // Valuation domain
  VALUATION_PURPOSE: 'valuation_purpose',
  VALUATION_TIMELINE: 'valuation_timeline',
  VALUATION_OWNER_AWARENESS: 'valuation_owner_awareness',
  // Risk domain
  RISK_TYPE: 'risk_type',
  RISK_AWARENESS: 'risk_awareness',
  RISK_URGENCY: 'risk_urgency',
  // Succession domain
  SUCCESSION_SCENARIO: 'succession_scenario',
  SUCCESSION_TIMELINE: 'succession_timeline',
  SUCCESSION_OWNER_READINESS: 'succession_owner_readiness',
  // Conflict domain
  CONFLICT_PARTIES: 'conflict_parties',
  CONFLICT_STAGE: 'conflict_stage',
  CONFLICT_LEGAL_FLAG: 'conflict_legal_flag',
  // EOY domain
  EOY_PURPOSE: 'eoy_purpose',
  EOY_SPECIFIC_ISSUE: 'eoy_specific_issue',
  EOY_CLIENT_ENGAGEMENT: 'eoy_client_engagement',
  // Due diligence domain
  DUE_DILIGENCE_SCENARIO: 'due_diligence_scenario',
  DUE_DILIGENCE_ADVISOR_ROLE: 'due_diligence_advisor_role',
  DUE_DILIGENCE_TIMELINE: 'due_diligence_timeline'
}

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

  // ── Governance domain signals ─────────────────────────────────────────────
  if (state.detectedDomain === 'governance') {
    if (state.governanceNature && state.governanceNature !== 'pending') {
      const nature = /structural|role|accountab|decision|process|procedure/i.test(state.governanceNature)
        ? 'structural'
        : /behav|cultural|how people|lead|act/i.test(state.governanceNature)
          ? 'behavioural'
          : 'both'
      signals.push(sig(SIGNAL_TYPES.GOVERNANCE_NATURE, 'q_governanceNature', nature))
    }
    if (state.governanceParties && state.governanceParties !== 'pending') {
      const parties = /owner/i.test(state.governanceParties)
        ? 'owner'
        : /board|director/i.test(state.governanceParties)
          ? 'board'
          : /shareholder/i.test(state.governanceParties)
            ? 'shareholders'
            : 'management'
      signals.push(sig(SIGNAL_TYPES.GOVERNANCE_PARTIES, 'q_governanceParties', parties))
    }
    if (state.governanceUrgency && state.governanceUrgency !== 'pending') {
      const urgent = /urgent|now|immediate|pressing|right away|crisis/i.test(state.governanceUrgency)
        ? 'urgent'
        : 'planned'
      signals.push(sig(SIGNAL_TYPES.GOVERNANCE_URGENCY, 'q_governanceUrgency', urgent))
    }
  }

  // ── Strategy domain signals ───────────────────────────────────────────────
  if (state.detectedDomain === 'strategy') {
    if (state.strategyTrigger && state.strategyTrigger !== 'pending') {
      const trigger = /growth|opportunit/i.test(state.strategyTrigger)
        ? 'growth_opportunity'
        : /performance|challenge|problem|struggling/i.test(state.strategyTrigger)
          ? 'performance_challenge'
          : /business model|pivot|restructure|change/i.test(state.strategyTrigger)
            ? 'model_change'
            : 'first_time_planning'
      signals.push(sig(SIGNAL_TYPES.STRATEGY_TRIGGER, 'q_strategyTrigger', trigger))
    }
    if (state.strategyPlanExists && state.strategyPlanExists !== 'pending') {
      const exists = /yes|have|do have|documented|active|working from/i.test(state.strategyPlanExists)
        ? 'yes'
        : /no|don.t|haven.t|not yet|nothing|first time/i.test(state.strategyPlanExists)
          ? 'no'
          : 'informal'
      signals.push(sig(SIGNAL_TYPES.STRATEGY_PLAN_EXISTS, 'q_strategyPlanExists', exists))
    }
    if (state.strategyHorizon && state.strategyHorizon !== 'pending') {
      const horizon = /12 month|one year|1 year|short/i.test(state.strategyHorizon)
        ? '12_months'
        : /2|3|two|three|medium/i.test(state.strategyHorizon)
          ? '2_3_years'
          : '5_plus_years'
      signals.push(sig(SIGNAL_TYPES.STRATEGY_HORIZON, 'q_strategyHorizon', horizon))
    }
  }

  // ── Systems domain signals ────────────────────────────────────────────────
  if (state.detectedDomain === 'systems') {
    if (state.systemsType && state.systemsType !== 'pending') {
      const type = /financ|admin|account|bookkeep/i.test(state.systemsType)
        ? 'financial_admin'
        : /operation|workflow|process/i.test(state.systemsType)
          ? 'operational'
          : /tech|software|crm|erp|platform|app/i.test(state.systemsType)
            ? 'technology'
            : 'hr_people'
      signals.push(sig(SIGNAL_TYPES.SYSTEMS_TYPE, 'q_systemsType', type))
    }
    if (state.systemsDriver && state.systemsDriver !== 'pending') {
      const driver = /grown|outgrown|scaling|too big/i.test(state.systemsDriver)
        ? 'growth'
        : /breaking|broken|failing|not working|unreliable/i.test(state.systemsDriver)
          ? 'breakdown'
          : 'modernisation'
      signals.push(sig(SIGNAL_TYPES.SYSTEMS_DRIVER, 'q_systemsDriver', driver))
    }
    if (state.systemsPriorAttempt && state.systemsPriorAttempt !== 'pending') {
      const prior = /yes|tried|attempt|before|previous|last time/i.test(state.systemsPriorAttempt)
        ? 'yes'
        : /no|never|first time|haven.t/i.test(state.systemsPriorAttempt)
          ? 'no'
          : 'partial'
      signals.push(sig(SIGNAL_TYPES.SYSTEMS_PRIOR_ATTEMPT, 'q_systemsPriorAttempt', prior))
    }
  }

  // ── Valuation domain signals ──────────────────────────────────────────────
  if (state.detectedDomain === 'valuation') {
    if (state.valuationPurpose && state.valuationPurpose !== 'pending') {
      const purpose = /sale|sell|exit/i.test(state.valuationPurpose)
        ? 'sale'
        : /succession|handover|next gen|family/i.test(state.valuationPurpose)
          ? 'succession'
          : /shareholder|dispute|partner/i.test(state.valuationPurpose)
            ? 'shareholder'
            : /financ|loan|raise|capital/i.test(state.valuationPurpose)
              ? 'finance'
              : 'benchmarking'
      signals.push(sig(SIGNAL_TYPES.VALUATION_PURPOSE, 'q_valuationPurpose', purpose))
    }
    if (state.valuationTimeline && state.valuationTimeline !== 'pending') {
      const timeline = /immediate|now|soon|this year|urgent/i.test(state.valuationTimeline)
        ? 'immediate'
        : /12 month|within a year|next year|one year/i.test(state.valuationTimeline)
          ? 'within_12_months'
          : 'longer_term'
      signals.push(sig(SIGNAL_TYPES.VALUATION_TIMELINE, 'q_valuationTimeline', timeline))
    }
    if (state.valuationOwnerAwareness && state.valuationOwnerAwareness !== 'pending') {
      const awareness = /yes|realistic|good sense|knows|aware|understand/i.test(state.valuationOwnerAwareness)
        ? 'realistic'
        : /no|not sure|overvalue|undervalue|no idea|don.t know|haven.t|first time/i.test(state.valuationOwnerAwareness)
          ? 'unrealistic'
          : 'partial'
      signals.push(sig(SIGNAL_TYPES.VALUATION_OWNER_AWARENESS, 'q_valuationOwnerAwareness', awareness))
    }
  }

  // ── Risk domain signals ───────────────────────────────────────────────────
  if (state.detectedDomain === 'risk') {
    if (state.riskType && state.riskType !== 'pending') {
      const type = /operation/i.test(state.riskType)
        ? 'operational'
        : /financ/i.test(state.riskType)
          ? 'financial'
          : /key person|key man/i.test(state.riskType)
            ? 'key_person'
            : /legal|compliance|regulat/i.test(state.riskType)
              ? 'legal_compliance'
              : /reputation/i.test(state.riskType)
                ? 'reputational'
                : 'other'
      signals.push(sig(SIGNAL_TYPES.RISK_TYPE, 'q_riskType', type))
    }
    if (state.riskAwareness && state.riskAwareness !== 'pending') {
      const aware = /already aware|knows|client identified|they know|they see/i.test(state.riskAwareness)
        ? 'client_aware'
        : 'advisor_identified'
      signals.push(sig(SIGNAL_TYPES.RISK_AWARENESS, 'q_riskAwareness', aware))
    }
    if (state.riskUrgency && state.riskUrgency !== 'pending') {
      const urgent = /immediate|now|urgent|right away|critical/i.test(state.riskUrgency)
        ? 'immediate'
        : /monitor|plan|longer|not urgent|watching/i.test(state.riskUrgency)
          ? 'monitoring'
          : 'medium'
      signals.push(sig(SIGNAL_TYPES.RISK_URGENCY, 'q_riskUrgency', urgent))
    }
  }

  // ── Succession domain signals ─────────────────────────────────────────────
  if (state.detectedDomain === 'succession') {
    if (state.successionScenario && state.successionScenario !== 'pending') {
      const scenario = /family|next gen|children|son|daughter/i.test(state.successionScenario)
        ? 'family'
        : /management buyout|MBO|mbo|management team/i.test(state.successionScenario)
          ? 'mbo'
          : /external sale|third party|sell to|buyer/i.test(state.successionScenario)
            ? 'external_sale'
            : 'undecided'
      signals.push(sig(SIGNAL_TYPES.SUCCESSION_SCENARIO, 'q_successionScenario', scenario))
    }
    if (state.successionTimeline && state.successionTimeline !== 'pending') {
      const timeline = /1.2 year|1 year|2 year|soon|within two|short/i.test(state.successionTimeline)
        ? '1_2_years'
        : /3.5 year|3 year|4 year|5 year|medium/i.test(state.successionTimeline)
          ? '3_5_years'
          : /longer|10|beyond|no rush|not sure/i.test(state.successionTimeline)
            ? 'longer_term'
            : 'event_driven'
      signals.push(sig(SIGNAL_TYPES.SUCCESSION_TIMELINE, 'q_successionTimeline', timeline))
    }
    if (state.successionOwnerReadiness && state.successionOwnerReadiness !== 'pending') {
      const readiness = /ready|eager|want to go|can.t wait|looking forward/i.test(state.successionOwnerReadiness)
        ? 'ready'
        : /reluct|not ready|hesit|emotional|struggle|hard time|let go/i.test(state.successionOwnerReadiness)
          ? 'reluctant'
          : 'working_toward'
      signals.push(sig(SIGNAL_TYPES.SUCCESSION_OWNER_READINESS, 'q_successionOwnerReadiness', readiness))
    }
  }

  // ── Conflict domain signals ───────────────────────────────────────────────
  if (state.detectedDomain === 'conflict') {
    if (state.conflictParties && state.conflictParties !== 'pending') {
      const parties = /partner|co.director|co director/i.test(state.conflictParties)
        ? 'business_partners'
        : /shareholder/i.test(state.conflictParties)
          ? 'shareholders'
          : /family/i.test(state.conflictParties)
            ? 'family'
            : /employ|staff|worker/i.test(state.conflictParties)
              ? 'employer_employee'
              : 'directors'
      signals.push(sig(SIGNAL_TYPES.CONFLICT_PARTIES, 'q_conflictParties', parties))
    }
    if (state.conflictStage && state.conflictStage !== 'pending') {
      const stage = /early|tension|manageab|still ok|not escalat/i.test(state.conflictStage)
        ? 'early'
        : /legal|proceeding|court|lawyer|solicit/i.test(state.conflictStage)
          ? 'legal'
          : 'active_dispute'
      signals.push(sig(SIGNAL_TYPES.CONFLICT_STAGE, 'q_conflictStage', stage))
    }
    if (state.conflictLegalFlag && state.conflictLegalFlag !== 'pending') {
      const legal = /yes|legal|hr|specialist|lawyer|solicitor|need a/i.test(state.conflictLegalFlag)
        ? 'yes'
        : /no|advisory|mediation|not yet/i.test(state.conflictLegalFlag)
          ? 'no'
          : 'unclear'
      signals.push(sig(SIGNAL_TYPES.CONFLICT_LEGAL_FLAG, 'q_conflictLegalFlag', legal))
    }
  }

  // ── EOY domain signals ────────────────────────────────────────────────────
  if (state.detectedDomain === 'eoy') {
    if (state.eoyPurpose && state.eoyPurpose !== 'pending') {
      const purpose = /review|performance|how did we go|year.s result/i.test(state.eoyPurpose)
        ? 'performance_review'
        : /goal|plan|ahead|next year|forward/i.test(state.eoyPurpose)
          ? 'forward_planning'
          : /tax|financial plan|financ/i.test(state.eoyPurpose)
            ? 'financial_planning'
            : 'strategic'
      signals.push(sig(SIGNAL_TYPES.EOY_PURPOSE, 'q_eoyPurpose', purpose))
    }
    if (state.eoySpecificIssue && state.eoySpecificIssue !== 'pending') {
      const hasIssue = /yes|there is|specific|something|one thing|key issue|concern/i.test(state.eoySpecificIssue)
        ? 'yes'
        : 'standard'
      signals.push(sig(SIGNAL_TYPES.EOY_SPECIFIC_ISSUE, 'q_eoySpecificIssue', hasIssue))
    }
    if (state.eoyClientEngagement && state.eoyClientEngagement !== 'pending') {
      const engagement = /active|engage|depth|want detail|participate|keen/i.test(state.eoyClientEngagement)
        ? 'engaged'
        : /compliance|key point|brief|not interest|passive|just tell/i.test(state.eoyClientEngagement)
          ? 'compliance'
          : 'moderate'
      signals.push(sig(SIGNAL_TYPES.EOY_CLIENT_ENGAGEMENT, 'q_eoyClientEngagement', engagement))
    }
  }

  // ── Due diligence domain signals ──────────────────────────────────────────
  if (state.detectedDomain === 'due-diligence') {
    if (state.dueDiligenceScenario && state.dueDiligenceScenario !== 'pending') {
      const scenario = /acquir|buying|purchase/i.test(state.dueDiligenceScenario)
        ? 'acquiring'
        : /being approach|for sale|sell|acquisition target/i.test(state.dueDiligenceScenario)
          ? 'being_acquired'
          : /joint venture|partnership|jv/i.test(state.dueDiligenceScenario)
            ? 'joint_venture'
            : 'investment'
      signals.push(sig(SIGNAL_TYPES.DUE_DILIGENCE_SCENARIO, 'q_dueDiligenceScenario', scenario))
    }
    if (state.dueDiligenceAdvisorRole && state.dueDiligenceAdvisorRole !== 'pending') {
      const role = /lead|leading|running|managing/i.test(state.dueDiligenceAdvisorRole)
        ? 'lead'
        : /support|alongside|assist/i.test(state.dueDiligenceAdvisorRole)
          ? 'support'
          : 'commentary'
      signals.push(sig(SIGNAL_TYPES.DUE_DILIGENCE_ADVISOR_ROLE, 'q_dueDiligenceAdvisorRole', role))
    }
    if (state.dueDiligenceTimeline && state.dueDiligenceTimeline !== 'pending') {
      const timeline = /deadline|urgent|soon|specific date|this month|this quarter/i.test(state.dueDiligenceTimeline)
        ? 'deadline_driven'
        : /explor|early|not yet|no rush/i.test(state.dueDiligenceTimeline)
          ? 'exploratory'
          : 'in_progress'
      signals.push(sig(SIGNAL_TYPES.DUE_DILIGENCE_TIMELINE, 'q_dueDiligenceTimeline', timeline))
    }
  }

  return signals
}

// ── deriveInferredState ────────────────────────────────────────────────────
// Converts signal array into a flat, readable CaseState snapshot.
// This is the Phase A/B version — will evolve into the full typed CaseState in Phase C.
function deriveInferredState (signals, state) {
  const get = (type) => {
    const found = signals.find(s => s.type === type)
    return found ? found.value : null
  }

  return {
    domain: state.detectedDomain || null,
    // Situation
    clientAwareness: get(SIGNAL_TYPES.CLIENT_AWARENESS),
    // Client
    businessOwnership: get(SIGNAL_TYPES.BUSINESS_OWNERSHIP),
    growthStage: get(SIGNAL_TYPES.CLIENT_GROWTH_STAGE),
    operatorStyle: get(SIGNAL_TYPES.OPERATOR_EXECUTION_STYLE),
    // Relationship
    relationshipMaturity: get(SIGNAL_TYPES.RELATIONSHIP_MATURITY),
    // Advisor
    advisorConfidenceLevel: get(SIGNAL_TYPES.ADVISOR_CONFIDENCE_LEVEL),
    advisorExperienceLevel: get(SIGNAL_TYPES.ADVISOR_EXPERIENCE_LEVEL),
    // Constraints
    templateBudget: get(SIGNAL_TYPES.TEMPLATE_BUDGET),
    sessionLength: get(SIGNAL_TYPES.SESSION_LENGTH),
    meetingCount: get(SIGNAL_TYPES.MEETING_COUNT),
    // Profit domain
    reportingEngagement: get(SIGNAL_TYPES.REPORTING_ENGAGEMENT),
    reportingSource: get(SIGNAL_TYPES.REPORTING_SOURCE),
    variableReviewReadiness: get(SIGNAL_TYPES.VARIABLE_REVIEW_READINESS),
    priceCommunicationNeeded: get(SIGNAL_TYPES.PRICE_COMMUNICATION_NEED),
    // Staff domain
    staffIssueScope: get(SIGNAL_TYPES.STAFF_ISSUE_SCOPE),
    staffIssueOrigin: get(SIGNAL_TYPES.STAFF_ISSUE_ORIGIN),
    staffIssueCategory: get(SIGNAL_TYPES.STAFF_ISSUE_CATEGORY),
    // Data-systems domain
    financialFoundationsGap: get(SIGNAL_TYPES.FINANCIAL_FOUNDATIONS_GAP),
    accountingTeamCapability: get(SIGNAL_TYPES.ACCOUNTING_TEAM_CAPABILITY),
    complexityVsTechnology: get(SIGNAL_TYPES.COMPLEXITY_VS_TECHNOLOGY),
    // Sales-marketing domain
    salesDiagnosis: get(SIGNAL_TYPES.SALES_DIAGNOSIS),
    conversionTracking: get(SIGNAL_TYPES.CONVERSION_TRACKING),
    productFitIssue: get(SIGNAL_TYPES.PRODUCT_FIT_ISSUE),
    // Forecasting domain
    financialMgmtTheme: get(SIGNAL_TYPES.FINANCIAL_MGMT_THEME),
    // Governance domain
    governanceNature: get(SIGNAL_TYPES.GOVERNANCE_NATURE),
    governanceParties: get(SIGNAL_TYPES.GOVERNANCE_PARTIES),
    governanceUrgency: get(SIGNAL_TYPES.GOVERNANCE_URGENCY),
    // Strategy domain
    strategyTrigger: get(SIGNAL_TYPES.STRATEGY_TRIGGER),
    strategyPlanExists: get(SIGNAL_TYPES.STRATEGY_PLAN_EXISTS),
    strategyHorizon: get(SIGNAL_TYPES.STRATEGY_HORIZON),
    // Systems domain
    systemsType: get(SIGNAL_TYPES.SYSTEMS_TYPE),
    systemsDriver: get(SIGNAL_TYPES.SYSTEMS_DRIVER),
    systemsPriorAttempt: get(SIGNAL_TYPES.SYSTEMS_PRIOR_ATTEMPT),
    // Valuation domain
    valuationPurpose: get(SIGNAL_TYPES.VALUATION_PURPOSE),
    valuationTimeline: get(SIGNAL_TYPES.VALUATION_TIMELINE),
    valuationOwnerAwareness: get(SIGNAL_TYPES.VALUATION_OWNER_AWARENESS),
    // Risk domain
    riskType: get(SIGNAL_TYPES.RISK_TYPE),
    riskAwareness: get(SIGNAL_TYPES.RISK_AWARENESS),
    riskUrgency: get(SIGNAL_TYPES.RISK_URGENCY),
    // Succession domain
    successionScenario: get(SIGNAL_TYPES.SUCCESSION_SCENARIO),
    successionTimeline: get(SIGNAL_TYPES.SUCCESSION_TIMELINE),
    successionOwnerReadiness: get(SIGNAL_TYPES.SUCCESSION_OWNER_READINESS),
    // Conflict domain
    conflictParties: get(SIGNAL_TYPES.CONFLICT_PARTIES),
    conflictStage: get(SIGNAL_TYPES.CONFLICT_STAGE),
    conflictLegalFlag: get(SIGNAL_TYPES.CONFLICT_LEGAL_FLAG),
    // EOY domain
    eoyPurpose: get(SIGNAL_TYPES.EOY_PURPOSE),
    eoySpecificIssue: get(SIGNAL_TYPES.EOY_SPECIFIC_ISSUE),
    eoyClientEngagement: get(SIGNAL_TYPES.EOY_CLIENT_ENGAGEMENT),
    // Due diligence domain
    dueDiligenceScenario: get(SIGNAL_TYPES.DUE_DILIGENCE_SCENARIO),
    dueDiligenceAdvisorRole: get(SIGNAL_TYPES.DUE_DILIGENCE_ADVISOR_ROLE),
    dueDiligenceTimeline: get(SIGNAL_TYPES.DUE_DILIGENCE_TIMELINE)
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

module.exports = { extractSignals, deriveInferredState, buildObservabilityPayload, SIGNAL_TYPES }
