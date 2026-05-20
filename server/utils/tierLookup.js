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
 * Scans a block of text (e.g. a Phase 3 AI response) for exact template title
 * matches and returns the matched titles as an array.
 * Matching is case-insensitive and whole-word bounded to avoid false positives.
 */
function extractTemplatesFromText (text) {
  if (typeof text !== 'string' || !text) { return [] }
  const found = []
  const lower = text.toLowerCase()
  for (const [title] of _titleToTier) {
    // Require a word boundary on each side so partial name fragments don't match
    const idx = lower.indexOf(title)
    if (idx === -1) { continue }
    const before = idx === 0 ? ' ' : lower[idx - 1]
    const after = idx + title.length >= lower.length ? ' ' : lower[idx + title.length]
    const wordBoundary = /[\s\-–—"'(,.\n\r]/
    if (wordBoundary.test(before) || before === ' ' || idx === 0) {
      if (wordBoundary.test(after) || after === ' ' || idx + title.length === lower.length) {
        // Recover the original casing from _titleToTier key (which is lowercase),
        // so look it up in templates to get the canonical title
        found.push(title)
      }
    }
  }
  return found
}

module.exports = { getHighestTier, extractTemplatesFromText }
