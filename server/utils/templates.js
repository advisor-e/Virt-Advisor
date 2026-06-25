/**
 * Template loader and filter utilities — CommonJS version for the Restify backend.
 * Loads data/templates.json and provides filtering and formatting for the AI prompt.
 */

const { readFileSync } = require('fs')
const { resolve } = require('path')
const { STOP_WORDS } = require('./stop-words')

let _templates = null

function loadTemplates () {
  if (_templates) { return _templates }
  const filePath = resolve(process.cwd(), 'data/templates.json')
  try {
    _templates = JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (err) {
    console.error('[templates] Failed to load templates.json:', err.message)
    _templates = []
  }
  return _templates
}

function getOrgTemplates (orgTemplateIds, firmTemplates) {
  const all = (Array.isArray(firmTemplates) && firmTemplates.length > 0) ? firmTemplates : loadTemplates()
  if (!orgTemplateIds || !Array.isArray(orgTemplateIds) || orgTemplateIds.length === 0) { return all }
  const validIds = orgTemplateIds.filter(id => typeof id === 'string').slice(0, 500)
  return all.filter(t => validIds.includes(t.page))
}

// ── Crisis-search recognition (Discover mode) ────────────────────────────────
// A failing business described in plain words ("going under", "going broke",
// "can't pay the bills", "shut the doors") rarely uses the library's literal terms
// (liquidation / receivership / insolvency / worst case), so the survival tools
// (Quick & Worst, Receivership vs Liquidation, Worst Case Scenario, Quick Position)
// never surface in a keyword search — even though they are the right answer. We
// cannot add crisis tags to templates.json (the master export is never hand-edited
// here), so the recognition lives in code: when a SEARCH reads as a crisis, expand
// it with insolvency vocabulary so the scorer can find the survival tools. Mirrors
// the Client-mode crisis vocabulary (domains.json profit keywords); only ADDS
// candidates (the scorer still ranks), so a mild false-positive is low-risk.
const CRISIS_QUERY_RE = /\b(go(ing)? under|go(ing|ne)? broke|go(ing|ne)? bust|shut(ting)? down|shut the business|close (the doors|down the business)|business fail(ure|ing)?|facing (business )?(closure|liquidation)|face liquidation|into liquidation|receivership|voluntary administration|wind(ing)? up the business|insolven(t|cy)|can'?t pay (its |their |the )?(debts|bills)|cannot pay (its |their |the )?(debts|bills)|may not survive|might not survive|won'?t survive|on the brink|liquidation)\b/i
const CRISIS_SEARCH_EXPANSION = ' liquidation receivership insolvency insolvent worst bankruptcy creditor administration'

function filterTemplatesByQuery (templates, query, maxResults) {
  maxResults = maxResults || 40
  // Crisis search → expand with insolvency vocabulary so the survival tools surface.
  const effectiveQuery = CRISIS_QUERY_RE.test(query) ? query + CRISIS_SEARCH_EXPANSION : query
  const queryLower = effectiveQuery.toLowerCase()
  const queryWords = queryLower
    .split(/\s+/)
    .filter(w => w.length > 3)
    .filter(w => !STOP_WORDS.has(w))

  if (queryWords.length === 0) { return templates.slice(0, maxResults) }

  const scored = templates.map((t) => {
    const titleLower = (t.title || '').toLowerCase()
    const searchText = [
      t.purpose,
      t.topic,
      t.section,
      (t.tags || []).join(' ')
    ].join(' ').toLowerCase()

    let score = 0
    for (const word of queryWords) {
      if (titleLower.includes(word) || (titleLower.length >= 4 && word.startsWith(titleLower))) {
        score += 3 // title match — includes plural/derived forms (e.g. "cafes" → "Cafe")
      } else if (searchText.includes(word)) {
        score++
      }
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
    const videoNote = ''
    const useNote = t.includedInClient
      ? '\n   Use: Client-facing delivery tool (shown to client during advisory sessions — NOT advisor learning material)'
      : '\n   Use: Advisor reference/learning resource'
    return `${i + 1}. **${t.title}** [${t.section} > ${t.subSection ? t.subSection + ' > ' : ''}${t.topic}]
   Purpose: ${t.purpose}
   Tags: ${tags}
   ID: ${t.page}${useNote}${videoNote}`
  }).join('\n\n')
}

module.exports = { getOrgTemplates, filterTemplatesByQuery, formatTemplatesForPrompt }
