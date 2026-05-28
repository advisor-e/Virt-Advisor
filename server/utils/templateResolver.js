'use strict'

// ── Complexity ceiling → blocked subSections ────────────────────────────────
// Architecture rule: "Step 1–2 cannot produce Specialist/Governance templates"
// foundational = staircase 1–2, analytical = 3–4, strategic = 5
const CEILING_BLOCKED = {
  foundational: new Set(['Strategic Tools', 'Specialist Tools', 'Governance Tools', 'External Advisors']),
  analytical: new Set(['Specialist Tools', 'External Advisors']),
  strategic: new Set()
}

// ── Domain → preferred subSections ─────────────────────────────────────────
// First entry = primary match (score +4); remaining = secondary (score +2)
const DOMAIN_SUBSECTION_MAP = {
  profit: ['Revenue & Feasibility Models', 'Lite Fundamentals', 'Reporting', 'General Tools'],
  staff: ['Governance Tools', 'Specialist Tools', 'General Tools'],
  'data-systems': ['Lite Fundamentals', 'General Tools', 'Reporting'],
  'sales-marketing': ['Lite Fundamentals', 'General Tools'],
  forecasting: ['Revenue & Feasibility Models', 'Reporting', 'Lite Fundamentals'],
  governance: ['Governance Tools', 'Strategic Tools'],
  strategy: ['Strategic Tools', 'General Tools'],
  systems: ['General Tools', 'Strategic Tools'],
  valuation: ['Specialist Tools'],
  risk: ['Specialist Tools', 'External Advisors'],
  succession: ['Specialist Tools'],
  conflict: ['Specialist Tools', 'General Tools'],
  eoy: ['EOY Notes & Docs', 'General Tools'],
  'due-diligence': ['Specialist Tools'],
  'stock-purchasing': ['General Tools', 'Specialist Tools'],
  'raising-capital': ['Specialist Tools', 'General Tools'],
  'fm-coach-culture': ['Governance Tools', 'Strategic Tools'],
  'org-firm-strategy': ['Strategic Tools', 'Specialist Tools'],
  'org-capacity-planner': ['General Tools', 'Strategic Tools'],
  'org-board-pack': ['Governance Tools', 'General Tools'],
  'org-leadership': ['Governance Tools', 'Specialist Tools'],
  'people-power': ['Governance Tools', 'Specialist Tools', 'General Tools']
}

// ── Solution category → tag keyword fragments ───────────────────────────────
// Substring-matched (case-insensitive) against template tags array
const CATEGORY_KEYWORDS = {
  profit: ['profit', 'margin', 'profitab'],
  reporting: ['report', 'dashboard', 'ratio'],
  revenue_feasibility: ['revenue', 'feasib', 'what-if', 'variable', 'driver'],
  pricing: ['pric', 'price rise'],
  financial_literacy: ['working capital', 'break-even', 'heald', 'cash flow cycle'],
  staff_development: ['staff', 'team', 'perform', 'culture', 'leadership', 'people'],
  specialist: ['specialist', 'valuati', 'succession', 'due diligence', 'acquisit'],
  sales_pipeline: ['sales', 'pipeline', 'conversion', 'prospect'],
  marketing: ['marketing', 'market', 'brand', 'customer'],
  governance: ['governance', 'board', 'accountab', 'director'],
  strategy: ['strateg', 'planning', 'swot', 'pest'],
  systems: ['system', 'software', 'technolog', 'process', 'workflow'],
  risk: ['risk', 'insurance', 'key person', 'contingency'],
  eoy: ['end of year', 'eoy', 'annual review'],
  valuation: ['valuati', 'business value'],
  succession: ['succession', 'exit', 'handover'],
  conflict: ['conflict', 'dispute', 'mediation'],
  'due-diligence': ['due diligence', 'acquisit'],
  forecasting: ['forecast', 'cash flow', 'budget'],
  'data-systems': ['data', 'system', 'accounting'],
  'sales-marketing': ['sales', 'marketing'],
  'stock-purchasing': ['stock', 'inventory', 'purchas'],
  'raising-capital': ['capital', 'raising', 'financ']
}

// ── Engagement type → preferred subSections ─────────────────────────────────
// Source: content headers spec (revenue models = EDUCATION; strategic = FACILITATION; specialist = ADVICE)
// First entry = primary (score +2); remaining = secondary (score +1)
const ENGAGEMENT_SUBSECTION_PREFERENCE = {
  education: ['Revenue & Feasibility Models', 'General Tools', 'Lite Fundamentals', 'Reporting', 'Growth Framework'],
  facilitation: ['Strategic Tools', 'Governance Tools', 'Lite Fundamentals', 'General Tools'],
  advice: ['Specialist Tools', 'Governance Tools', 'Strategic Tools', 'External Advisors']
}

// ── Problem signal → tag keyword fragments ───────────────────────────────────
// Maps free-text problem signals (from situationDiagnostic) to template tag substrings.
// Same substring matching as CATEGORY_KEYWORDS. modeling_rejected is penalty-only — no entry.
const PROBLEM_SIGNAL_KEYWORDS = {
  sales_volume: ['sales', 'customer', 'foot traffic', 'conversion', 'prospect', 'pipeline', 'market', 'brand', 'awareness', 'funnel'],
  pricing_issue: ['pric', 'price rise', 'markup', 'communicat'],
  cash_flow_gap: ['cash', 'debtor', 'working capital', 'overdraft', 'financ', 'credit'],
  profit_plateau: ['profit', 'levers', 'driver', 'profitab'],
  staff_problem: ['staff', 'team', 'perform', 'culture', 'leadership', 'people'],
  strategy_needed: ['strateg', 'planning', 'swot', 'pivot', 'growth'],
  data_quality: ['data', 'system', 'accounting', 'chart', 'report', 'kpi', 'ratio'],
  governance_gap: ['governance', 'board', 'accountab', 'director'],
  succession_issue: ['succession', 'exit', 'handover', 'valuati'],
  systems_gap: ['system', 'software', 'technolog', 'process', 'workflow'],
  marketing_gap: ['marketing', 'market', 'brand', 'digital', 'funnel']
}

// ── Advisor confidence → subSection fit ──────────────────────────────────────
// Source: content headers spec — new-advisor-friendly vs experience-required subSections
const NEW_ADVISOR_SUBSECTIONS = new Set(['Revenue & Feasibility Models', 'General Tools', 'EOY Notes & Docs'])
const EXPERIENCE_REQUIRED_SUBSECTIONS = new Set(['Lite Fundamentals', 'Strategic Tools', 'Specialist Tools', 'Governance Tools'])

// ── resolveTemplates ────────────────────────────────────────────────────────
// Pure deterministic function. No side effects. No AI calls.
// Inputs: CaseState + StrategyDecision (from Phases B/C) + templates array
// Output: scored, ranked selection capped at templateBudget
function resolveTemplates (caseState, strategyDecision, templates) {
  const { domain, solutionCategories, client, complexityCeiling, advisor } = caseState
  const { engagementType, templateBudget } = strategyDecision

  const blocked = CEILING_BLOCKED[complexityCeiling] || new Set()

  // ── Step 1: Hard filters ─────────────────────────────────────────────────
  const eligible = templates.filter(t =>
    t.includedInClient === true &&
    t.menuSection !== 'get-organised' &&
    t.menuSection !== 'get-the-job' &&
    !(t.subSection && blocked.has(t.subSection))
  )

  if (eligible.length === 0) {
    return {
      selected: [],
      scoringLog: [],
      noMatchReason: `No eligible templates after hard filters: ceiling=${complexityCeiling} domain=${domain}`
    }
  }

  // ── Step 2: Score ────────────────────────────────────────────────────────
  let preferredSubSections = domain ? (DOMAIN_SUBSECTION_MAP[domain] || []) : []

  // When the profit domain's revenue_feasibility signal is absent, the advisor
  // has indicated the client doesn't need financial modelling — shift subSection
  // preference so General Tools ranks first and surfaces sales-oriented templates.
  if (domain === 'profit' && !(solutionCategories || []).includes('revenue_feasibility')) {
    preferredSubSections = ['General Tools', 'Lite Fundamentals', 'Reporting', 'Revenue & Feasibility Models']
  }
  const engagementPreferred = ENGAGEMENT_SUBSECTION_PREFERENCE[engagementType] || []

  const scored = eligible.map((t) => {
    let score = 0
    const reasons = []
    const tagsLower = (t.tags || []).map(tag => tag.toLowerCase())
    const purposeLower = (t.purpose || '').toLowerCase()
    const subSection = t.subSection || ''

    // Domain → subSection preference
    if (preferredSubSections.length > 0) {
      if (preferredSubSections[0] === subSection) {
        score += 4
        reasons.push('domain:primary_subsection')
      } else if (preferredSubSections.includes(subSection)) {
        score += 2
        reasons.push('domain:secondary_subsection')
      }
    }

    // Solution category → tag keyword match
    for (const cat of (solutionCategories || [])) {
      const keywords = CATEGORY_KEYWORDS[cat] || [cat.toLowerCase()]
      let tagHit = false
      for (const kw of keywords) {
        if (tagsLower.some(tag => tag.includes(kw))) {
          score += 3
          reasons.push('tag:' + cat)
          tagHit = true
          break
        }
      }
      if (!tagHit) {
        for (const kw of keywords) {
          if (purposeLower.includes(kw)) {
            score += 1
            reasons.push('purpose:' + cat)
            break
          }
        }
      }
    }

    // Problem signals from situationDiagnostic free text → tag keyword match
    const _problemSignals = caseState.problemSignals || {}
    for (const [signal, signalCount] of Object.entries(_problemSignals)) {
      if (signal === 'modeling_rejected') { continue } // penalty-only signal handled below
      const keywords = PROBLEM_SIGNAL_KEYWORDS[signal] || []
      for (const kw of keywords) {
        if (tagsLower.some(tag => tag.includes(kw)) || purposeLower.includes(kw)) {
          score += Math.min(3, signalCount) // cap contribution per signal at 3
          reasons.push('problemSignal:' + signal)
          break
        }
      }
    }

    // Explicit contradiction penalty: advisor indicated revenue modelling is not the solution
    if ((_problemSignals.modeling_rejected || 0) > 0 && subSection === 'Revenue & Feasibility Models') {
      score -= 6
      reasons.push('penalty:modeling_rejected')
    }

    // Engagement type → subSection alignment
    if (engagementPreferred[0] === subSection) {
      score += 2
      reasons.push('engagement:primary')
    } else if (engagementPreferred.includes(subSection)) {
      score += 1
      reasons.push('engagement:secondary')
    }

    // Advisor confidence → subSection fit
    if (advisor && advisor.confidence) {
      if (advisor.confidence === 'low' && NEW_ADVISOR_SUBSECTIONS.has(subSection)) {
        score += 1
        reasons.push('advisor:confidence_match')
      } else if (advisor.confidence === 'low' && EXPERIENCE_REQUIRED_SUBSECTIONS.has(subSection)) {
        score -= 1
        reasons.push('advisor:confidence_mismatch')
      } else if (advisor.confidence === 'high' && EXPERIENCE_REQUIRED_SUBSECTIONS.has(subSection)) {
        score += 1
        reasons.push('advisor:confidence_boost')
      }
    }

    // Growth stage exact match
    if (client.growthStage && t.growth && t.growth.stage) {
      const clientStageNorm = client.growthStage.toLowerCase().replace(/[^a-z]/g, '')
      const templateStageNorm = t.growth.stage.toLowerCase().replace(/[^a-z]/g, '')
      if (clientStageNorm === templateStageNorm) {
        score += 2
        reasons.push('growth:exact')
      }
    }

    return { title: t.title, page: t.page, subSection, score, matchReasons: reasons }
  })

  // ── Step 3: Rank and cap ─────────────────────────────────────────────────
  const ranked = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)

  const budget = (typeof templateBudget === 'number' && templateBudget >= 0) ? templateBudget : 1
  const selected = ranked.slice(0, budget)
  const candidates = ranked.slice(0, Math.max(8, budget * 4))
  const scoringLog = ranked.slice(0, 20)

  if (selected.length === 0) {
    return {
      selected: [],
      candidates: [],
      scoringLog: scored.sort((a, b) => b.score - a.score).slice(0, 10),
      noMatchReason: `No template scored above 0: domain=${domain} categories=${(solutionCategories || []).join(',')}`
    }
  }

  return { selected, candidates, scoringLog, noMatchReason: null }
}

module.exports = { resolveTemplates }
