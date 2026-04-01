/**
 * Content summaries loader — detailed per-template guidance extracted from
 * "Do the Job Content summaries.docx". Covers 79 templates across 6 sections.
 */

const { readFileSync } = require('fs')
const { resolve } = require('path')

let _summaries = null

function loadSummaries () {
  if (_summaries) return _summaries
  const filePath = resolve(process.cwd(), 'data/content-summaries.json')
  _summaries = JSON.parse(readFileSync(filePath, 'utf8'))
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

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'has',
  'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
  'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who',
  'with', 'have', 'this', 'will', 'your', 'from', 'they', 'know', 'want',
  'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here',
  'just', 'like', 'long', 'make', 'many', 'more', 'only', 'over', 'such',
  'take', 'than', 'them', 'well', 'were', 'what', 'help', 'need', 'their',
  'about', 'client', 'clients', 'business', 'advisor', 'template'
])

module.exports = { filterSummariesByQuery, getAllSummaries, formatSummariesForPrompt }
