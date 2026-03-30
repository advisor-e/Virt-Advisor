import { readFileSync } from 'fs'
import { resolve } from 'path'

let _templates = null

function loadTemplates() {
  if (_templates) return _templates
  const filePath = resolve(process.cwd(), 'data/templates.json')
  _templates = JSON.parse(readFileSync(filePath, 'utf8'))
  return _templates
}

/**
 * Get all templates available to an org.
 * orgTemplateIds: array of template page IDs the org has access to.
 * If null/empty, returns all templates (used during development).
 */
export function getOrgTemplates(orgTemplateIds = null) {
  const all = loadTemplates()
  if (!orgTemplateIds || orgTemplateIds.length === 0) return all
  return all.filter(t => orgTemplateIds.includes(t.page))
}

/**
 * Pre-filter templates by relevance to a query using keyword matching.
 * Returns up to maxResults templates most likely to be relevant.
 */
export function filterTemplatesByQuery(templates, query, maxResults = 40) {
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

/**
 * Format templates into a concise string for the Claude prompt.
 */
export function formatTemplatesForPrompt(templates) {
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
