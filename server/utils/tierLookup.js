'use strict'

const path = require('path')

// Maps template subSection values to capability tiers.
// Get Organised subSections (role-based access, not content tier) resolve to null.
const SUBSECTION_TIER = {
  // Do the Job — entry-level
  'General Tools': 'entry-level',
  Help: 'entry-level',
  'Client On Boarding': 'entry-level',
  'EOY Notes & Docs': 'entry-level',
  'Growth Framework': 'entry-level',
  'Revenue & Feasibility Models': 'entry-level',
  'Packaging Solutions': 'entry-level',
  // Do the Job — intermediate
  'Lite Fundamentals': 'intermediate',
  Reporting: 'intermediate',
  'External Advisors': 'intermediate',
  // Do the Job — advanced
  'Strategic Tools': 'advanced',
  'Specialist Tools': 'advanced',
  'Governance Tools': 'advanced',
  // Get the Job — entry-level
  'Sales Process Design': 'entry-level',
  Marketing: 'entry-level',
  // Get the Job — intermediate
  'Learning to Sell': 'intermediate',
  Positioning: 'intermediate',
  'Pricing & Proposals': 'intermediate',
  // Get the Job — advanced
  'Seminar Delivery': 'advanced',
  // Get Organised — role-based, not content tier
  'Advisor Access': null,
  'Firm Manager Access': null,
  'Risk Advisor Access': null
}

const TIER_RANK = { 'entry-level': 1, intermediate: 2, advanced: 3 }

// Built once at require time: lowercase template title → tier
const _titleToTier = new Map()

;(function buildIndex () {
  let templates
  try {
    templates = require(path.resolve(process.cwd(), 'data/templates.json'))
  } catch (e) {
    console.error('[tierLookup] Could not load templates.json:', e.message)
    return
  }
  Object.values(templates).forEach((t) => {
    if (t.title && t.subSection !== undefined) {
      const tier = SUBSECTION_TIER[t.subSection] ?? null
      _titleToTier.set(t.title.toLowerCase().trim(), tier)
    }
  })
})()

/**
 * Given an array of template names, returns the highest capability tier
 * represented ('entry-level', 'intermediate', or 'advanced').
 * Returns null if names is empty, all names are unrecognised, or all
 * matched templates belong to role-based Get Organised sections.
 */
function getHighestTier (templateNames) {
  if (!Array.isArray(templateNames) || templateNames.length === 0) { return null }

  let highest = null
  for (const name of templateNames) {
    if (typeof name !== 'string') { continue }
    const tier = _titleToTier.get(name.toLowerCase().trim())
    if (!tier) { continue }
    if (highest === null || TIER_RANK[tier] > TIER_RANK[highest]) {
      highest = tier
    }
  }
  return highest
}

/**
 * The marker the AI closes a Phase 3 answer with, declaring what it recommended.
 *
 * Reading recommendations back out of prose is guesswork, and it was wrong in both
 * directions: names the AI had bolded (its house style for a real recommendation) were
 * missed entirely, while ordinary sentences like "your retail shop needs a pivot in
 * leadership" logged four tools nobody recommended — inflating the advisor's recorded
 * capability tier on the Team Dashboard, since Leadership is an advanced-tier tool.
 *
 * So the AI now says so explicitly. `data/prompts/client.txt` instructs it to end with:
 *
 *     [[TEMPLATES: Quick & Worst | Receivership vs Liquidation]]
 *
 * The marker never reaches the advisor — `advisorEngine` holds back the tail of the
 * stream — and every name inside it is validated against the real catalogue, because
 * an LLM naming a template is not evidence that the template exists.
 */
const TEMPLATE_MARK_OPEN = '[[TEMPLATES:'
const TEMPLATE_MARK_CLOSE = ']]'

/**
 * Titles that are also ordinary English words. Matching these in running prose is what
 * produced the false recommendations, so in the prose fallback they only count when the
 * AI has EMPHASISED them — which is exactly what it does when it means them.
 */
const COMMON_WORD_TITLES = new Set([
  'insurance', 'legal', 'assumptions', 'cafe', 'construction', 'engineering',
  'forecasting', 'hospitality', 'hairdressing', 'joiner', 'retail', 'shop',
  'physiotherapy', 'dentist', 'midwife', 'pivot', 'manufacturing', 'doctor',
  'beverages', 'butcher', 'cleaners', 'plumber', 'scaffolding', 'leadership',
  'cartoons', 'marketing', 'reporting', 'positioning'
])

/** Characters that may sit either side of a title without being part of it. */
const BOUNDARY = /[\s\-–—"'“”‘’(),.:;!?*_`[\]\n\r]/

/** Emphasis the AI puts around a name it is actually recommending. */
const EMPHASIS_BEFORE = /(\*\*|__|\*|_|`|^#{1,6}\s|^[-*+]\s|^\d+\.\s|["“'‘])\s*$/
const EMPHASIS_AFTER = /^\s*(\*\*|__|\*|_|`|["”'’])/

/** @param {string} title @returns {boolean} true if the catalogue knows this title. */
function isKnownTemplate (title) {
  return typeof title === 'string' && _titleToTier.has(title.toLowerCase().trim())
}

/**
 * Read the AI's declared recommendations out of the marker.
 *
 * @param {string} text - the full Phase 3 response
 * @returns {string[]|null} validated titles, or null when no marker was present (so the
 *   caller can tell "the AI declared nothing" from "the AI declared an empty list").
 */
function extractDeclaredTemplates (text) {
  if (typeof text !== 'string') { return null }
  const open = text.lastIndexOf(TEMPLATE_MARK_OPEN)
  if (open === -1) { return null }
  const close = text.indexOf(TEMPLATE_MARK_CLOSE, open)
  if (close === -1) { return null }

  const body = text.slice(open + TEMPLATE_MARK_OPEN.length, close)
  const seen = new Set()
  const out = []
  // Split on the declared separator, and on commas too — models drift on punctuation
  // and a missed separator would silently drop a real recommendation.
  body.split(/[|,;]/).forEach((raw) => {
    const name = raw.trim().replace(/^\*+|\*+$/g, '').trim()
    if (!name) { return }
    // Validate: the AI naming a template is not evidence that it exists.
    if (!isKnownTemplate(name)) { return }
    const key = name.toLowerCase()
    if (seen.has(key)) { return }
    seen.add(key)
    out.push(key)
  })
  return out
}

/** Remove the marker (and anything after it) from text destined for the advisor. */
function stripTemplateMarker (text) {
  if (typeof text !== 'string') { return text }
  const open = text.lastIndexOf(TEMPLATE_MARK_OPEN)
  if (open === -1) { return text }
  return text.slice(0, open).replace(/\s+$/, '')
}

/**
 * Fallback: scan prose for template titles, for a response that carried no marker.
 *
 * Case-insensitive and boundary-bounded. Titles that are also ordinary English words
 * additionally require emphasis around them, because they otherwise match normal
 * sentences — the defect that inflated capability tiers. Multi-word titles need no
 * emphasis: nobody writes "Receivership vs Liquidation" by accident.
 *
 * @param {string} text @returns {string[]}
 */
function extractTemplatesFromText (text) {
  if (typeof text !== 'string' || !text) { return [] }
  const found = []
  const lower = text.toLowerCase()
  for (const [title] of _titleToTier) {
    let from = 0
    let idx
    // Scan every occurrence: the first may be prose while a later one is emphasised.
    while ((idx = lower.indexOf(title, from)) !== -1) {
      from = idx + title.length
      const beforeChar = idx === 0 ? ' ' : lower[idx - 1]
      const afterChar = from >= lower.length ? ' ' : lower[from]
      const bounded = (idx === 0 || BOUNDARY.test(beforeChar)) &&
        (from === lower.length || BOUNDARY.test(afterChar))
      if (!bounded) { continue }

      if (COMMON_WORD_TITLES.has(title)) {
        const lead = text.slice(Math.max(0, idx - 8), idx)
        const trail = text.slice(from, from + 3)
        if (!EMPHASIS_BEFORE.test(lead) || !EMPHASIS_AFTER.test(trail)) { continue }
      }
      found.push(title)
      break
    }
  }
  return found
}

/**
 * The recommendations for a Phase 3 response, and WHICH of the two paths produced them.
 *
 * The AI is instructed (client.txt §11) to end with a [[TEMPLATES: ...]] marker declaring
 * what it recommended. It obeys only sometimes. When it does not, the prose fallback runs —
 * and that fallback is the defect the marker exists to fix, not a neutral second-best: it
 * has read ordinary sentences as recommendations and inflated an advisor's recorded tier.
 *
 * Both paths return a plausible list, so nobody can tell them apart from the outside.
 * Returning the source is what makes the fallback countable instead of invisible.
 *
 * @param {string} text - the full Phase 3 response, marker included
 * @returns {{templates: string[], source: 'declared'|'prose'}}
 */
function resolveRecommendedTemplatesWithSource (text) {
  const declared = extractDeclaredTemplates(text)
  if (declared !== null) { return { templates: declared, source: 'declared' } }
  return { templates: extractTemplatesFromText(text), source: 'prose' }
}

/**
 * The recommendations for a Phase 3 response: the AI's own declaration when it made
 * one, otherwise the prose fallback.
 *
 * @param {string} text @returns {string[]}
 */
function resolveRecommendedTemplates (text) {
  return resolveRecommendedTemplatesWithSource(text).templates
}

module.exports = {
  getHighestTier,
  extractTemplatesFromText,
  extractDeclaredTemplates,
  resolveRecommendedTemplates,
  resolveRecommendedTemplatesWithSource,
  stripTemplateMarker,
  isKnownTemplate,
  TEMPLATE_MARK_OPEN,
  TEMPLATE_MARK_CLOSE
}
