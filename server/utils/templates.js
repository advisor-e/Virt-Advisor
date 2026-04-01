/**
 * Template loader and filter utilities — CommonJS version for the Restify backend.
 * Loads data/templates.json and provides filtering and formatting for the AI prompt.
 */

const { readFileSync } = require('fs')
const { resolve } = require('path')

let _templates = null

function loadTemplates () {
  if (_templates) return _templates
  const filePath = resolve(process.cwd(), 'data/templates.json')
  _templates = JSON.parse(readFileSync(filePath, 'utf8'))
  return _templates
}

function getOrgTemplates (orgTemplateIds) {
  const all = loadTemplates()
  if (!orgTemplateIds || orgTemplateIds.length === 0) return all
  return all.filter(t => orgTemplateIds.includes(t.page))
}

function filterTemplatesByQuery (templates, query, maxResults) {
  maxResults = maxResults || 40
  const queryLower = query.toLowerCase()
  const queryWords = queryLower
    .split(/\s+/)
    .filter(w => w.length > 3)
    .filter(w => !STOP_WORDS.has(w))

  if (queryWords.length === 0) return templates.slice(0, maxResults)

  const scored = templates.map(t => {
    const searchText = [
      t.title,
      t.purpose,
      t.topic,
      t.section,
      (t.tags || []).join(' ')
    ].join(' ').toLowerCase()

    let score = 0
    for (const word of queryWords) {
      if (searchText.includes(word)) score++
    }
    return { template: t, score }
  })

  return scored
    .sort((a, b) => b.score - a.score)
    .filter(s => s.score > 0)
    .slice(0, maxResults)
    .map(s => s.template)
}

function formatTemplatesForPrompt (templates) {
  return templates.map((t, i) => {
    const tags = (t.tags || []).slice(0, 5).join(', ')
    return `${i + 1}. **${t.title}** [${t.section} > ${t.topic}]
   Purpose: ${t.purpose}
   Tags: ${tags}
   ID: ${t.page}`
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

module.exports = { getOrgTemplates, filterTemplatesByQuery, formatTemplatesForPrompt }
