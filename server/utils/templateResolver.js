'use strict'

const { readFileSync } = require('fs')
const { resolve } = require('path')
const { SIGNAL_REGISTRY } = require('./problemSignals')
const { HISTORY_HOLDBACK_PENALTY } = require('./priorEngagement')
const { STOP_WORDS } = require('./stop-words')

// Commerce-generic words that must never be read as the client's INDUSTRY.
// Extends the shared STOP_WORDS for the industry matcher ONLY — the search
// paths keep the shorter shared list, because advisors legitimately SEARCH for
// "sales". Live session 2026-07-14 (raising-capital domain): the industry
// answer "car sales a car yard" made "sales" an industry keyword and
// title-boosted six sales/sale-titled tools to the top of an unrelated
// engagement — the same defect class as Bug 1's "business", one list short.
const INDUSTRY_STOPWORDS = new Set([
  'sales', 'sale', 'service', 'services', 'company', 'group', 'trading',
  'limited', 'enterprises', 'holdings', 'shop', 'store', 'firm', 'industry'
])

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

// ── Logic-tree soft hint ─────────────────────────────────────────────────────
// A dormant logic tree's process-of-elimination names the templates that fit the
// advisor's described situation (see treeHintNames option below + walkLogicTree).
// Mike's locked principle (memory: design-logic-trees-guide-not-replace): the tree
// GUIDES the engine, it does not replace it — template names age, the reasoning does
// not. So a named template gets a deliberately WEAK boost: enough to break a tie in
// the tree's direction (e.g. sell-side valuation tools over a signal-blind tie), never
// enough to overrule a strong industry (+8) or semantic match. Same magnitude as a
// strong primary-issue match. This single owned constant is the calibration knob.
const TREE_HINT_BOOST = 3

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
  // Templates the matched logic tree points at for THIS situation (walkLogicTree output,
  // situation-specific). A weak tie-breaking boost — see TREE_HINT_BOOST above.
  const treeHintNames = new Set((options && options.treeHintNames) || [])
  // Client-history hold-back (client knowledge base, Option A — product owner
  // 2026-07-14). Titles this client has ALREADY received are discouraged, never
  // banned; titles from a session the advisor reviewed as going less well carry
  // their own reason code. Case-insensitive: saved case templates and library
  // titles are the same names, but never trust casing to survive a round trip.
  const _histDelivered = new Set(
    ((options && options.priorHoldback && options.priorHoldback.delivered) || []).map(t => String(t).trim().toLowerCase())
  )
  const _histWentLess = new Set(
    ((options && options.priorHoldback && options.priorHoldback.wentLessTitles) || []).map(t => String(t).trim().toLowerCase())
  )
  const { domain, primaryIssue, industry, solutionCategories, client, complexityCeiling, advisor } = caseState
  const { engagementType, templateBudget } = strategyDecision

  // Primary issue keyword hints — used to add a scoring boost for templates whose
  // tags or purpose closely match the advisor-confirmed primary issue.
  const _primaryIssueKeywords = primaryIssue
    ? primaryIssue.toLowerCase().split(/[\s—\-,]+/).filter(w => w.length > 4)
    : []

  // Industry keyword hints — the client's stated industry (e.g. "cafe") is a key
  // selection factor: an industry-specific template should win for a matching client.
  // Matched against template title + tags below (see the industry boost in the
  // scoring loop). Filtered against the SHARED stop-word set (templates.js /
  // summaries.js already do) — without it, generic words in a free-text industry
  // answer are treated as the industry itself: "Vanoss scaffolding business" made
  // "business" an industry keyword, and every template with "business" in its
  // title/tags took a false +8/+4 boost. Live session 2026-07-14: "Business
  // Insurance Model" (28) displaced "Working Capital Cycle" (27) on that boost
  // alone. (Bug 1, engine-defects review 2026-07-14.)
  const _industryKeywords = industry
    ? industry.toLowerCase()
      .split(/[\s—\-,/&]+/)
      .filter(w => w.length > 3 && !STOP_WORDS.has(w) && !INDUSTRY_STOPWORDS.has(w))
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
    // A PURE industry revenue model is fingerprinted as exactly {revenue_modelling}.
    // Such models only belong in domains that actually use them (profit, forecasting —
    // the domains whose subSection map includes Revenue & Feasibility Models). The
    // scenario lab caught them leaking elsewhere — a "Hospitality" model topping a STAFF
    // turnover session, lifted purely by the +8 industry-name match. Outside the
    // revenue-model domains we suppress the model so it cannot outrank the domain's real
    // tools, even when the client's industry matches by name.
    const _modelProfileKeys = Object.keys((t.page && _profileMap.has(t.page)) ? _profileMap.get(t.page) : {})
    const _isPureIndustryModel = subSection === 'Revenue & Feasibility Models' &&
      _modelProfileKeys.length === 1 && _modelProfileKeys[0] === 'revenue_modelling'
    const _domainUsesRevenueModels = preferredSubSections.includes('Revenue & Feasibility Models')
    const _suppressOutOfDomainModel = _isPureIndustryModel && !_domainUsesRevenueModels && _industryKeywords.length > 0

    let _industryMatched = false
    if (_industryKeywords.length > 0 && !_suppressOutOfDomainModel) {
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

    // Out-of-domain industry model — neutralise it so it cannot lead the domain's real
    // tools (scenario-lab fix, 2026-06-25). Distinct from the wrong-industry hold-back.
    if (_suppressOutOfDomainModel) {
      score -= 15
      reasons.push('industry:wrong_domain_model')
    }

    // Hold back WRONG-industry models. A pure industry revenue model is fingerprinted
    // as exactly {revenue_modelling}. When the client's industry is stated and this is
    // such a model but it does NOT match (a Manufacturing model for a café), it is
    // irrelevant — heavy penalty so it drops below the generic, industry-agnostic tools.
    // Matching models keep their +8 boost; generic feasibility tools (Break-Even, EBITDA
    // — different/no fingerprint) are untouched. Excludes the out-of-domain case above.
    if (_industryKeywords.length > 0 && !_industryMatched && !_suppressOutOfDomainModel) {
      if (_modelProfileKeys.length === 1 && _modelProfileKeys[0] === 'revenue_modelling') {
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

    // Logic-tree soft hint — the dormant tree's process-of-elimination named this
    // template for the advisor's described situation. A weak tie-breaker (guide, not
    // replace): it lifts the tree's judgment past a tie but cannot overrule a strong
    // signal/industry match. See TREE_HINT_BOOST + memory design-logic-trees-guide-not-replace.
    if (treeHintNames.has(t.title)) {
      score += TREE_HINT_BOOST
      reasons.push('tree_hint:+' + TREE_HINT_BOOST)
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
        governance_too_early: ['habit', 'behaviour', 'behavior', 'productiv', 'protocol', 'procedure', 'foundational'],
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

    // Client-history hold-back (Option A, product owner 2026-07-14): this client
    // has already received this template, so DISCOURAGE it — a repeat must earn
    // its place by clearly outscoring the alternatives, and the hold-back is
    // visible in the trace (never a silent drop). A session the advisor reviewed
    // as going less well gets its own reason code: the issue is likely unresolved
    // AND the approach did not land, so steer toward a different tool. Reviews
    // are case-level — no per-template attribution is invented (Stage 5b).
    //
    // Deliberately the LAST scoring rule: applied any earlier, later boosts
    // (engagement, growth, confidence) leak past the clamp and dilute the
    // penalty — a real ordering bug the formula test caught on first run.
    // Clamped at 1, never below: the ranking gate drops score<=0 rows entirely,
    // and a hold-back that makes a viable template VANISH from the scoring log
    // would be a silent drop — the exact defect class this feature exists to
    // remove. Bottom-ranked and labelled beats invisible. Templates that were
    // not viable anyway (score<=0) are left untouched — no penalty, no reason.
    const _titleKey = (t.title || '').trim().toLowerCase()
    if (_histDelivered.has(_titleKey) && score > 0) {
      score = Math.max(1, score - HISTORY_HOLDBACK_PENALTY)
      reasons.push(_histWentLess.has(_titleKey) ? 'history:went_less_well' : 'history:already_delivered')
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

  // Budget slots must be spent on DISTINCT templates (Bug 2, engine-defects
  // review 2026-07-14). A library can hold two records with the same title
  // (different page IDs) — slicing `ranked` directly let both take a slot, and
  // buildDisplaySet's later title-dedup then dropped the second WITHOUT
  // returning its slot: budget 3 → only 2 cards, silently. Live session: "Quick
  // Fire Diagnosis" took two slots and "Working Capital Cycle" never surfaced.
  // Dedup BEFORE the slice so every slot yields a distinct card.
  const _seenTitles = new Set()
  const _distinctRanked = []
  for (const t of ranked) {
    const _key = (t.title || '').trim().toLowerCase()
    if (_key && _seenTitles.has(_key)) { continue }
    if (_key) { _seenTitles.add(_key) }
    _distinctRanked.push(t)
  }
  const selected = _distinctRanked.slice(0, budget)

  // Build a diverse candidate pool: cap any single subSection at 3 entries so the
  // AI receives representation across multiple section types, not just the highest-
  // scoring subSection monopolising all slots. Iterates the DEDUPED list —
  // duplicates must not consume candidate slots either.
  const MAX_CANDIDATES = Math.max(8, budget * 4)
  const SUBSECTION_CAP = 3
  const _subSectionCounts = {}
  const _diverseCandidates = []
  for (const t of _distinctRanked) {
    const n = _subSectionCounts[t.subSection] || 0
    if (n < SUBSECTION_CAP) {
      _diverseCandidates.push(t)
      _subSectionCounts[t.subSection] = n + 1
    }
    if (_diverseCandidates.length >= MAX_CANDIDATES) { break }
  }
  const candidates = _diverseCandidates

  // Deliberately UNdeduped: a duplicate title in the library is a genuine
  // data-quality signal a firm manager should see in the trace, not something
  // to hide. Only the budget/candidates are deduped — never the evidence.
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
  const primary = resolveTemplates(caseState, strategyDecision, templates, { ignoreCeiling: true, distinctionBoosts: opts.distinctionBoosts, treeHintNames: opts.treeHintNames, priorHoldback: opts.priorHoldback })
  const withinRange = resolveTemplates(caseState, strategyDecision, templates, { distinctionBoosts: opts.distinctionBoosts, treeHintNames: opts.treeHintNames, priorHoldback: opts.priorHoldback })

  const primaryTop = primary.selected[0]
  const withinTop = withinRange.selected[0]

  const hasOutlier = !!(primaryTop && withinTop && primaryTop.title !== withinTop.title)
  const fallbackExists = withinRange.selected.length > 0

  return { primary, withinRange, hasOutlier, fallbackExists }
}

// ── buildDisplaySet ──────────────────────────────────────────────────────────
// Turns the two-pass resolver result into the FINAL, deterministic set of cards
// the advisor sees. This is the macro-decision the system design reserves for
// CODE, not AI (Principle 4: "Code makes macro-decisions. AI writes copy only").
// Stage 6 used to hand the AI a wide candidate net and let it pick — which let the
// AI silently drop the top-scored template (the café/crisis defect, ACTIONS
// §display-drop). The AI now only writes copy for the set this returns; it cannot
// add, drop, reorder, or substitute a template, so the engine's #1 always appears.
//
//   hasOutlier  → §13 two-card model: lead with the outlier (Pass-1 best, which
//                 sits above the advisor's range), then fill with the within-range
//                 matches up to budget.
//   no outlier  → the unrestricted best matches (Pass 1 and Pass 2 agree).
//
// Deduped by title, capped at the template budget. Domain-agnostic by construction:
// it reads only the SHAPE of the resolver output (selected lists, hasOutlier,
// budget) — never any domain, industry, or keyword — so it behaves identically
// across all 14 domains and every scenario.
function buildDisplaySet (resolvedResult, budget) {
  const cap = (typeof budget === 'number' && budget > 0) ? budget : 1
  const primarySel = (resolvedResult && resolvedResult.primary && resolvedResult.primary.selected) || []
  const withinSel = (resolvedResult && resolvedResult.withinRange && resolvedResult.withinRange.selected) || []

  let chosen
  if (resolvedResult && resolvedResult.hasOutlier) {
    const outlier = primarySel[0]
    chosen = outlier ? [outlier].concat(withinSel) : withinSel.slice()
  } else {
    chosen = primarySel.slice()
  }

  const seen = new Set()
  const out = []
  for (const t of chosen) {
    if (t && t.title && !seen.has(t.title)) {
      seen.add(t.title)
      out.push(t)
      if (out.length >= cap) { break }
    }
  }
  return out
}

// TREE_HINT_BOOST is exported for the Logic-Lab page, which states the number to
// firm managers as fact. Exporting it means the screen reads the engine's own
// value instead of carrying a copy that is free to disagree with it.
module.exports = { resolveTemplates, resolveTemplatesWithOutlier, buildDisplaySet, SCORING_VERSION, TREE_HINT_BOOST }
