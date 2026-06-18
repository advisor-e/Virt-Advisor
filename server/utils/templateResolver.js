'use strict'

const { readFileSync } = require('fs')
const { resolve } = require('path')
const { SIGNAL_REGISTRY } = require('./problemSignals')

// ── Semantic profile loader ─────────────────────────────────────────────────
// Reads the pre-compiled semantic profiles (built by scripts/build-semantic-profiles.js).
// Keyed by template page ID. Returns empty profile for unknown templates.
let _profileMap = null
function getProfileMap () {
  if (!_profileMap) {
    _profileMap = new Map()
    try {
      const raw = JSON.parse(readFileSync(resolve(process.cwd(), 'data/semantic-profiles.json'), 'utf8'))
      for (const entry of raw) {
        if (entry.page) { _profileMap.set(entry.page, entry.profile || {}) }
      }
    } catch (_) {
      // File not present during unit tests — scoring degrades to structural only
    }
  }
  return _profileMap
}

// ── Scoring version + config ────────────────────────────────────────────────
// Bump SCORING_VERSION whenever the algorithm changes so scoring logs are traceable.
const SCORING_VERSION = '2.1.0'

// Signal attenuation — out-of-domain signals are excluded entirely (weight 0).
// Each domain's scope is defined in DOMAIN_SIGNAL_SCOPE. Signals outside the scope
// are downstream effects, not primary causes — they must not drive template selection.
// Set outOfDomainWeight: 0.33 to roll back to soft attenuation if needed.
const SCORING_CONFIG = {
  inDomainWeight: 1.0,
  outOfDomainWeight: 0,
  enableAttenuation: true
}

// Domain → in-scope signals, DERIVED from the signal dictionary's per-signal
// `domains` field (the single source of truth). Signals not in scope get
// outOfDomainWeight in semantic scoring (they're downstream effects, not primary
// causes, so must not drive selection).
//
// This was previously a hand-maintained duplicate that drifted out of sync with
// signal-dictionary.json — it omitted `revenue_modelling` from `profit` (silently
// zeroing the dominant semantic lever for profitability/feasibility cases — the
// café bug), carried a phantom `profit_plateau` signal that no longer exists, and
// lacked all 8 newer domains. Deriving it from the dictionary kills that whole
// class of drift: add a signal/domain in the dictionary and the scope follows.
//
// Empty Set = domain runs on STRUCTURED questions only → suppress all free-text
// signals. The dictionary declares no signals for these, so they're set
// explicitly (derivation alone would leave them unfiltered — wrong). Domain absent
// from the map = no filtering (all signals at full weight).
const STRUCTURED_ONLY_DOMAINS = ['risk', 'valuation', 'conflict', 'due-diligence']

function buildDomainSignalScope () {
  const scope = {}
  for (const d of STRUCTURED_ONLY_DOMAINS) { scope[d] = new Set() }
  for (const [signal, meta] of Object.entries(SIGNAL_REGISTRY)) {
    if (meta.penaltyOnly) { continue } // penalty-only signals never positively scope a domain
    for (const domain of meta.domains || []) {
      if (STRUCTURED_ONLY_DOMAINS.includes(domain)) { continue }
      if (!scope[domain]) { scope[domain] = new Set() }
      scope[domain].add(signal)
    }
  }
  return scope
}

const DOMAIN_SIGNAL_SCOPE = buildDomainSignalScope()

function getSignalWeight (signal, domain) {
  if (!SCORING_CONFIG.enableAttenuation) { return 1.0 }
  const scope = DOMAIN_SIGNAL_SCOPE[domain]
  if (scope === undefined) { return 1.0 } // domain not mapped — no filtering
  if (scope.size === 0) { return 0 } // empty scope — suppress all signals
  return scope.has(signal) ? SCORING_CONFIG.inDomainWeight : SCORING_CONFIG.outOfDomainWeight
}

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
  conflict: ['Strategic Tools', 'Governance Tools', 'General Tools'],
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
// Source: content headers spec — Education = General/Lite only; Facilitation = Revenue/Strategic;
// Advice = Specialist/Governance. Revenue & Feasibility Models are Facilitation level, not Education.
// First entry = primary (score +2); remaining = secondary (score +1)
const ENGAGEMENT_SUBSECTION_PREFERENCE = {
  education: ['General Tools', 'Lite Fundamentals', 'Reporting', 'Growth Framework'],
  facilitation: ['Revenue & Feasibility Models', 'Strategic Tools', 'Governance Tools', 'Lite Fundamentals', 'General Tools'],
  advice: ['Specialist Tools', 'Governance Tools', 'Strategic Tools', 'External Advisors']
}

// ── Advisor confidence → subSection fit ──────────────────────────────────────
// Source: content headers spec — new-advisor-friendly vs experience-required subSections
const NEW_ADVISOR_SUBSECTIONS = new Set(['Revenue & Feasibility Models', 'General Tools', 'EOY Notes & Docs'])
const EXPERIENCE_REQUIRED_SUBSECTIONS = new Set(['Lite Fundamentals', 'Strategic Tools', 'Specialist Tools', 'Governance Tools'])

// ── resolveTemplates ────────────────────────────────────────────────────────
// Pure deterministic function. No side effects. No AI calls.
// Inputs: CaseState + StrategyDecision (from Phases B/C) + templates array
// Output: scored, ranked selection capped at templateBudget
// ── resolveTemplates (internal) ─────────────────────────────────────────────
// ignoreCeiling: when true (Pass 1 / unrestricted), removes the staircase ceiling
// hard block so the best-matched template is found regardless of advisor range.
// Engagement type is always a soft scoring preference only — never a hard gate.
function resolveTemplates (caseState, strategyDecision, templates, options) {
  const ignoreCeiling = (options && options.ignoreCeiling) || false
  const distinctionBoosts = (options && options.distinctionBoosts) || {}
  const { domain, primaryIssue, industry, solutionCategories, client, complexityCeiling, advisor } = caseState
  const { engagementType, templateBudget } = strategyDecision

  // Primary issue keyword hints — used to add a scoring boost for templates whose
  // tags or purpose closely match the advisor-confirmed primary issue.
  const _primaryIssueKeywords = primaryIssue
    ? primaryIssue.toLowerCase().split(/[\s—\-,]+/).filter(w => w.length > 4)
    : []

  // Industry keyword hints — the client's stated industry (e.g. "cafe") is a key
  // selection factor: an industry-specific template should win for a matching client.
  // Tokens length > 3 only, so noise words don't match. Matched against template
  // title + tags below (see the industry boost in the scoring loop).
  const _industryKeywords = industry
    ? industry.toLowerCase().split(/[\s—\-,/&]+/).filter(w => w.length > 3)
    : []

  const blocked = ignoreCeiling ? new Set() : (CEILING_BLOCKED[complexityCeiling] || new Set())

  // ── Step 1: Hard filters ─────────────────────────────────────────────────
  // Only the staircase ceiling is a hard block. Engagement type is a scoring
  // preference only (see ENGAGEMENT_SUBSECTION_PREFERENCE). ignoreCeiling=true
  // lifts even the ceiling for Pass 1 (unrestricted best-match).
  const eligible = templates.filter(t =>
    // NOTE: do NOT filter on includedInClient here. That field only governs whether a
    // CLIENT, self-serving in Advisor-e without an advisor, can SEE the template in their
    // own search. It is NOT a statement about whether an advisor may recommend it to use
    // WITH a client. Filtering on it wrongly excluded 77 advisor-with-client do-the-job
    // templates (e.g. E.O.Y Meeting, 5 Layers Questionnaire, Advisory Proposal). The real
    // content-type boundary is the menuSection gate below (do-the-job only).
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

  // Prepare semantic scoring inputs once (not inside the map loop)
  const _profileMap = getProfileMap()
  const _problemSignals = caseState.problemSignals || {}
  const _activeSignalEntries = Object.entries(_problemSignals)
    .filter(([sig, n]) => sig !== 'modeling_rejected' && n > 0)

  const scored = eligible.map((t) => {
    let score = 0
    const reasons = []
    const tagsLower = (t.tags || []).map(tag => tag.toLowerCase())
    const purposeLower = (t.purpose || '').toLowerCase()
    const subSection = t.subSection || ''

    // Domain → subSection preference (weak prior — semantic evidence takes precedence)
    if (preferredSubSections.length > 0) {
      if (preferredSubSections[0] === subSection) {
        score += 2
        reasons.push('domain:primary_subsection')
      } else if (preferredSubSections.includes(subSection)) {
        score += 1
        reasons.push('domain:secondary_subsection')
      }
    }

    // Primary issue keyword boost — advisor confirmed the specific problem,
    // so templates whose tags or purpose echo those keywords score higher.
    if (_primaryIssueKeywords.length > 0) {
      const _allText = [...tagsLower, purposeLower].join(' ')
      const _matches = _primaryIssueKeywords.filter(kw => _allText.includes(kw)).length
      if (_matches >= 2) {
        score += 3
        reasons.push('primary_issue:strong_match')
      } else if (_matches === 1) {
        score += 1
        reasons.push('primary_issue:partial_match')
      }
    }

    // Industry boost — the client's industry is a key selection factor. An
    // industry-specific template (above all the Revenue & Feasibility models, which
    // are named by industry) should win for a matching client. A title match is
    // decisive (+8); a tag match is a softer signal (+4). Plural/stem tolerant
    // (>=4-char prefix) so "cafes" matches the "Cafe" model.
    let _industryMatched = false
    if (_industryKeywords.length > 0) {
      const _titleWords = (t.title || '').toLowerCase().split(/[\s—\-,/&]+/).filter(Boolean)
      const _matchesWord = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a)))
      const _titleHit = _industryKeywords.some(kw => _titleWords.some(w => _matchesWord(kw, w)))
      const _tagHit = !_titleHit && _industryKeywords.some(kw =>
        tagsLower.some(tag => tag.split(/[\s—\-,/&]+/).some(w => _matchesWord(kw, w)))
      )
      _industryMatched = _titleHit || _tagHit
      if (_titleHit) {
        score += 8
        reasons.push('industry:title_match')
      } else if (_tagHit) {
        score += 4
        reasons.push('industry:tag_match')
      }
    }

    // Hold back WRONG-industry models. A pure industry revenue model is fingerprinted
    // as exactly {revenue_modelling} (that is how the content is tagged — "a revenue
    // model for industry X", nothing more). When the client's industry is stated and
    // this is such a model but it does NOT match (a Manufacturing model for a café), it
    // is irrelevant — heavy penalty so it drops below the generic, industry-agnostic
    // tools. Matching models keep their +8 boost; generic feasibility tools (Break-Even,
    // EBITDA — different/no fingerprint) are untouched.
    // NOTE: this keys on the semantic-profile SHAPE to recognise an industry model;
    // revisit if the master app ever re-fingerprints these models.
    if (_industryKeywords.length > 0 && !_industryMatched) {
      const _p = (t.page && _profileMap.has(t.page)) ? _profileMap.get(t.page) : {}
      const _pk = Object.keys(_p)
      if (_pk.length === 1 && _pk[0] === 'revenue_modelling') {
        score -= 15
        reasons.push('industry:mismatch_specific_model')
      }
    }

    // Advisory distinctions boost — domain expert vocabulary matched against advisor text
    const _distinctionBoost = distinctionBoosts[t.title] || 0
    if (_distinctionBoost > 0) {
      score += _distinctionBoost
      reasons.push('distinction:+' + _distinctionBoost)
    }

    // Advisory distinctions — GROUP boost (Revenue & Feasibility models only).
    // A firm distinction can target a group rather than a single named model:
    //   '@rf-industry' → the industry-specific models (auto-matched to the client's
    //                    industry by the industry boost + hold-back above)
    //   '@rf-general'  → the generic feasibility/concept tools (Break-Even, EBITDA…)
    // This lets a firm say "for a costing problem, use the right revenue model" without
    // naming an industry — the engine + conversation pick the specific one. Industry vs
    // general is read from the fingerprint shape (a pure industry model is exactly
    // {revenue_modelling}), the same signature the wrong-industry hold-back uses.
    if (subSection === 'Revenue & Feasibility Models' && (distinctionBoosts['@rf-industry'] || distinctionBoosts['@rf-general'])) {
      const _gpk = Object.keys((t.page && _profileMap.has(t.page)) ? _profileMap.get(t.page) : {})
      const _isIndustryRf = _gpk.length === 1 && _gpk[0] === 'revenue_modelling'
      const _groupBoost = _isIndustryRf ? (distinctionBoosts['@rf-industry'] || 0) : (distinctionBoosts['@rf-general'] || 0)
      if (_groupBoost > 0) {
        score += _groupBoost
        reasons.push('distinction:' + (_isIndustryRf ? '@rf-industry' : '@rf-general') + '+' + _groupBoost)
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

    // Stage 1 — weighted semantic profile match.
    // For each active problem signal, multiply the template's profile strength for that
    // signal by the advisor's signal count, then apply SEMANTIC_WEIGHT scale factor.
    // Richer diagnostics and stronger profile matches both increase the score.
    // Degrades to 0 if no profile exists or no signals active.
    const SEMANTIC_WEIGHT = 2.0
    const _semanticProfile = (t.page && _profileMap.has(t.page)) ? _profileMap.get(t.page) : {}
    const _hasSemanticProfile = Object.keys(_semanticProfile).length > 0
    if (_activeSignalEntries.length > 0) {
      let semanticScore = 0
      for (const [signal, signalCount] of _activeSignalEntries) {
        const profileStrength = _semanticProfile[signal] || 0
        if (profileStrength > 0) {
          const signalWeight = getSignalWeight(signal, domain)
          if (signalWeight > 0) {
            semanticScore += profileStrength * signalCount * SEMANTIC_WEIGHT * signalWeight
          }
        }
      }
      if (semanticScore > 0) {
        score += semanticScore
        reasons.push('semantic:' + semanticScore.toFixed(1))
      }
    }

    // Stage 1b — purpose text fallback for templates without a semantic profile.
    // Maps active in-domain signals to keyword sets and scores purpose/tag text matches.
    // Ensures templates in the 90-missing-summary set can still compete on content.
    if (!_hasSemanticProfile && _activeSignalEntries.length > 0) {
      // Keyword sets keyed by the live signal-dictionary signals. Kept in step with
      // signal-dictionary.json (the single source) — every non-penalty signal has an
      // entry. (Previously this drifted: it carried a phantom `profit_plateau` and
      // lacked revenue_modelling / stock_management / capital_raising, so no-profile
      // templates couldn't score on those signals.)
      const PURPOSE_FALLBACK_KEYWORDS = {
        sales_volume: ['sales', 'customer', 'foot traffic', 'marketing', 'conversion', 'prospect', 'revenue', 'upsell', 'cross-sell'],
        marketing_gap: ['marketing', 'market', 'brand', 'message', 'customer', 'digital', 'outbound'],
        pricing_issue: ['price', 'pricing', 'margin', 'discount', 'value'],
        cash_flow_gap: ['cash flow', 'cashflow', 'debtor', 'liquidity', 'working capital'],
        revenue_modelling: ['revenue model', 'feasibility', 'forecast', 'projection', 'cost model', 'pricing model', 'break-even', 'industry model'],
        staff_problem: ['staff', 'team', 'employee', 'people', 'performance', 'delegation'],
        data_quality: ['data', 'reporting', 'accounts', 'kpi', 'indicator', 'dashboard'],
        governance_gap: ['governance', 'board', 'accountab', 'director', 'decision'],
        succession_issue: ['succession', 'exit', 'sale', 'transition', 'business sale'],
        strategy_needed: ['strategy', 'planning', 'strategic', 'swot', 'competitive'],
        systems_gap: ['system', 'process', 'workflow', 'procedure', 'operation'],
        stock_management: ['stock', 'inventory', 'reorder', 'overstock', 'stockout', 'supply chain', 'days on hand'],
        capital_raising: ['capital', 'funding', 'investor', 'investment', 'undercapitalised', 'raise finance']
      }
      const _purposeText = [purposeLower, (t.support || '').toLowerCase()].join(' ')
      let purposeFallbackScore = 0
      for (const [signal] of _activeSignalEntries) {
        const signalWeight = getSignalWeight(signal, domain)
        if (signalWeight > 0) {
          const keywords = PURPOSE_FALLBACK_KEYWORDS[signal] || []
          for (const kw of keywords) {
            if (_purposeText.includes(kw)) {
              purposeFallbackScore += 1.5 * signalWeight
              break // one match per signal
            }
          }
        }
      }
      if (purposeFallbackScore > 0) {
        score += purposeFallbackScore
        reasons.push('purpose_fallback:' + purposeFallbackScore.toFixed(1))
      }
    }

    // Explicit contradiction penalty: advisor indicated revenue modelling is not the solution.
    // Fires from free-text keyword match OR from the direct signal (advisor answered No to
    // the profit driver review question). Either is sufficient to exclude the entire subSection.
    const _modelingDeclined = caseState.modelingDeclined || (_problemSignals.modeling_rejected || 0) > 0
    if (_modelingDeclined && subSection === 'Revenue & Feasibility Models') {
      score -= 50
      reasons.push('penalty:modeling_declined')
    }

    // Contradiction: client already uses management reports — Reporting templates are redundant
    if (caseState.reportingEngagement === 'regular' && subSection === 'Reporting') {
      score -= 4
      reasons.push('penalty:reports_already_in_use')
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

    const _profile = (t.page && _profileMap.has(t.page)) ? _profileMap.get(t.page) : {}
    const profileRichness = Object.values(_profile).reduce((sum, n) => sum + n, 0)
    return { title: t.title, page: t.page, subSection, score, profileRichness, matchReasons: reasons }
  })

  // ── Step 3: Rank and cap ─────────────────────────────────────────────────
  // Primary sort: score descending. Tiebreaker: profile richness ascending
  // (lower total signal strength = more focused authoring = preferred).
  // If testing shows this produces wrong results, revisit with subSection preference rank.
  const ranked = scored
    .filter(s => s.score > 0)
    .sort((a, b) =>
      b.score - a.score ||
      a.profileRichness - b.profileRichness || // lower richness = more focused = preferred
      (a.page || '').localeCompare(b.page || '') // deterministic final tiebreaker
    )

  const budget = (typeof templateBudget === 'number' && templateBudget >= 0) ? templateBudget : 1
  const selected = ranked.slice(0, budget)

  // Build a diverse candidate pool: cap any single subSection at 3 entries so the
  // AI receives representation across multiple section types, not just the highest-
  // scoring subSection monopolising all slots.
  const MAX_CANDIDATES = Math.max(8, budget * 4)
  const SUBSECTION_CAP = 3
  const _subSectionCounts = {}
  const _diverseCandidates = []
  for (const t of ranked) {
    const n = _subSectionCounts[t.subSection] || 0
    if (n < SUBSECTION_CAP) {
      _diverseCandidates.push(t)
      _subSectionCounts[t.subSection] = n + 1
    }
    if (_diverseCandidates.length >= MAX_CANDIDATES) { break }
  }
  const candidates = _diverseCandidates

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

// ── resolveTemplatesWithOutlier ──────────────────────────────────────────────
// Runs two passes and determines whether the best match sits outside the
// advisor's current parameters. Returns structured result for two-card output.
//
// primary   — best match ignoring engagement gates (staircase ceiling kept)
// withinRange — best match within advisor parameters (current restrictions)
// hasOutlier — true when the best unrestricted match differs from within-range
// fallbackExists — true when at least one within-range template was found
function resolveTemplatesWithOutlier (caseState, strategyDecision, templates, options) {
  const opts = options || {}
  const primary = resolveTemplates(caseState, strategyDecision, templates, { ignoreCeiling: true, distinctionBoosts: opts.distinctionBoosts })
  const withinRange = resolveTemplates(caseState, strategyDecision, templates, { distinctionBoosts: opts.distinctionBoosts })

  const primaryTop = primary.selected[0]
  const withinTop = withinRange.selected[0]

  const hasOutlier = !!(primaryTop && withinTop && primaryTop.title !== withinTop.title)
  const fallbackExists = withinRange.selected.length > 0

  return { primary, withinRange, hasOutlier, fallbackExists }
}

module.exports = { resolveTemplates, resolveTemplatesWithOutlier, SCORING_VERSION }
