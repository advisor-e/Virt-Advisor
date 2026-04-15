/**
 * Content summaries loader — detailed per-template guidance extracted from
 * "Do the Job Content summaries.docx". Covers 79 templates across 6 sections.
 */

const { readFileSync } = require('fs')
const { resolve } = require('path')
const { STOP_WORDS } = require('./stop-words')

let _summaries = null
let _sectionDescriptions = null

function loadSummaries () {
  if (_summaries) return _summaries
  const filePath = resolve(process.cwd(), 'data/content-summaries.json')
  try {
    _summaries = JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (err) {
    console.error('[summaries] Failed to load content-summaries.json:', err.message)
    _summaries = []
  }
  return _summaries
}

/**
 * Filter summaries by relevance to a query, returning up to maxResults.
 * Matches against purpose, indicators, helpsOwner, and helpsAdvisor fields.
 */
function filterSummariesByQuery (query, maxResults) {
  maxResults = maxResults || 15
  const summaries = loadSummaries()
  const words = query.toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3)
    .filter(w => !STOP_WORDS.has(w))

  if (words.length === 0) return summaries.slice(0, maxResults)

  const scored = summaries.map(s => {
    const searchText = [s.name, s.purpose, s.indicators, s.helpsOwner, s.helpsAdvisor]
      .join(' ').toLowerCase()
    let score = 0
    for (const word of words) {
      if (searchText.includes(word)) score++
    }
    return { summary: s, score }
  })

  return scored
    .sort((a, b) => b.score - a.score)
    .filter(s => s.score > 0)
    .slice(0, maxResults)
    .map(s => s.summary)
}

/**
 * Return ALL summaries (used when conversation history provides enough context
 * to warrant the full reference rather than keyword-filtered subset).
 */
function getAllSummaries () {
  return loadSummaries()
}

function loadSectionDescriptions () {
  if (_sectionDescriptions) return _sectionDescriptions
  const filePath = resolve(process.cwd(), 'data/section-descriptions.json')
  try {
    _sectionDescriptions = JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (err) {
    console.error('[summaries] Failed to load section-descriptions.json:', err.message)
    _sectionDescriptions = []
  }
  return _sectionDescriptions
}

function formatSectionDescriptionsForPrompt () {
  const sections = loadSectionDescriptions()
  const lines = ['### Template Section Guide — Use this to match client and advisor profile to the right complexity tier\n']
  for (const s of sections) {
    lines.push(`**${s.section}** (Complexity: ${s.complexity})`)
    lines.push(`Client profile: ${s.clientProfile}`)
    lines.push(`Advisor profile: ${s.advisorProfile}`)
    lines.push(`Engagement style: ${s.engagementStyle}`)
    lines.push(`When to use: ${s.whenToUse}`)
    lines.push('')
  }
  return lines.join('\n')
}

function formatSummariesForPrompt (summaries) {
  if (!summaries || summaries.length === 0) return ''
  return summaries.map(s => {
    const lines = [`**${s.name}** [${s.section}]`]
    if (s.purpose) lines.push(`Purpose: ${s.purpose}`)
    if (s.indicators) lines.push(`When to use: ${s.indicators}`)
    if (s.helpsOwner) lines.push(`Helps the owner: ${s.helpsOwner}`)
    if (s.helpsAdvisor) lines.push(`Helps the advisor: ${s.helpsAdvisor}`)
    return lines.join('\n')
  }).join('\n\n')
}


/**
 * Static alias map: logic tree template names → content summary names.
 * Used when the fuzzy matcher can't bridge naming differences (e.g. "Nine" vs "9",
 * abbreviated section prefixes, or completely different naming conventions).
 */
const TEMPLATE_SUMMARY_ALIASES = {
  'Nine Growth Aspects': '9 Growth Aspect Questions & Graphic',
  'Growth Framework': '9 Growth Aspect Questions & Graphic',
  'Powerful Goal Setting': 'GE.SMART & FAST Goals',
  'Profit Levers & Blue Ocean': 'Advance.1. Bizz Targets & BO Expectations',
  'Business Targets': 'Advance.1. Bizz Targets & BO Expectations',
  'Orientation Part 1': 'Advance.2 & 2B. Strategic Orientation (Part 1 & 2)',
  'Orientation Part 2': 'Advance.2 & 2B. Strategic Orientation (Part 1 & 2)',
  'Planning Outcomes Review': 'ADV.0. Planning Outcomes',
  '1 pg Bizz Case': 'One Page Supposition (Accme Business Case)',
  'Alignment Statements': 'L.Suppt.Alignment',
  'Porters & Pine': "Porter's & Pine",
  'Governance Introduction': 'Governance Introduction',
  'Organisational Review': 'Advance.6. Organisational Review & Org Chart',
  'Sales & Marketing Review': 'Advance.5. Sales & Marketing Review',
  'Turnaround Behaviours': 'Cafe Turnaround Behaviours',
  'Partner Accountability': 'Annual Board Plan',
  'Mgt Annual Plan': 'Management Reporting Annual Plan (Advisory Board Plan)',
  'General Meeting Agenda': 'Agenda & Notes',
  '6 Hats': '6 Hats Thinking',
  'Customer Journey': 'The Customer Journey',
  '8 Profit Levers': 'The 8 Profit Levers',
  'Rubbish In - Rubbish Out': 'Rubbish in - Rubbish Out',
  'Debtor Protocols': 'Debtor Protocols & Business Drag Model',
  '90 Day Best Practice Accounting': '90 Day Accounting Best Practice Plan',
  'Hire Winners': 'Managing Poor Performance',
  'Hiring Winners': 'Managing Poor Performance',
  'E.O.Y Meeting': 'E.O.Y Client Review Sheet - Input',
  'Capacity, Capability, Opportunity': 'Business Assessment Report'
}

/**
 * Find the best matching summary for a given template name.
 * Tries alias map → exact match → contains match → word-overlap match.
 * Returns the summary object or null if nothing is close enough.
 */
function matchSummaryByTemplateName (summaries, templateName) {
  const nameLower = templateName.toLowerCase().trim()

  // 0. Static alias map (bridges known naming mismatches)
  const aliasTarget = TEMPLATE_SUMMARY_ALIASES[templateName]
  if (aliasTarget) {
    const aliasMatch = summaries.find(s => s.name === aliasTarget)
    if (aliasMatch) return aliasMatch
  }

  // 1. Exact match
  const exact = summaries.find(s => s.name.toLowerCase() === nameLower)
  if (exact) return exact

  // 2. Summary name contains the full template name
  const contained = summaries.find(s => s.name.toLowerCase().includes(nameLower))
  if (contained) return contained

  // 3. Template name contains the full summary name (guards against very short names)
  const contains = summaries.find(s => s.name.length > 6 && nameLower.includes(s.name.toLowerCase()))
  if (contains) return contains

  // 4. Word-overlap: at least 60% of the template's meaningful words appear in the summary name
  const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'your', 'this', 'that'])
  const templateWords = nameLower.split(/[\s&.()+,/-]+/).filter(w => w.length > 3 && !stopWords.has(w))
  if (templateWords.length === 0) return null

  const threshold = Math.max(1, Math.ceil(templateWords.length * 0.6))
  const candidates = summaries
    .map(s => {
      const sLower = s.name.toLowerCase()
      const matches = templateWords.filter(w => sLower.includes(w)).length
      return { summary: s, matches }
    })
    .filter(c => c.matches >= threshold)
    .sort((a, b) => b.matches - a.matches)

  return candidates.length > 0 ? candidates[0].summary : null
}

/**
 * Given a list of template names from the logic tree terminal nodes,
 * return matching summaries using fuzzy name matching.
 * De-duplicates by summary name.
 */
function getSummariesForTemplateNames (templateNames) {
  const summaries = loadSummaries()
  const seen = new Set()
  const results = []
  for (const name of templateNames) {
    const match = matchSummaryByTemplateName(summaries, name)
    if (match && !seen.has(match.name)) {
      seen.add(match.name)
      results.push(match)
    }
  }
  return results
}

module.exports = {
  filterSummariesByQuery,
  getAllSummaries,
  getSummariesForTemplateNames,
  formatSummariesForPrompt,
  formatSectionDescriptionsForPrompt
}
