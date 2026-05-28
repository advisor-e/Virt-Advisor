'use strict'
/**
 * Enriches data/content-summaries.json with page IDs from data/templates.json.
 *
 * For each template that has a page ID, finds its matching summary and records
 * the association. Writes the result back to content-summaries.json:
 *   - 1 template → summary: adds  { page: "id-xxx" }
 *   - N templates → same summary: adds  { pages: ["id-xxx", "id-yyy", ...] }
 *   - No match: entry left unchanged
 *
 * Run from project root:
 *   node scripts/enrich-summaries-page-ids.js
 */

const { readFileSync, writeFileSync } = require('fs')
const { resolve } = require('path')
const { getSummariesForTemplateNames } = require('../server/utils/summaries')

const templatesPath = resolve(process.cwd(), 'data/templates.json')
const summariesPath = resolve(process.cwd(), 'data/content-summaries.json')

const templates = JSON.parse(readFileSync(templatesPath, 'utf8'))
const all = templates.templates || templates
const sums = JSON.parse(readFileSync(summariesPath, 'utf8'))

// Build: summaryName → [pageId] from every template that has a page field
const summaryToPages = {}
let lookupMisses = 0

for (const t of all) {
  if (!t.page) continue
  const matched = getSummariesForTemplateNames([t.title])
  if (matched.length > 0) {
    const summaryName = matched[0].name
    if (!summaryToPages[summaryName]) { summaryToPages[summaryName] = [] }
    if (!summaryToPages[summaryName].includes(t.page)) {
      summaryToPages[summaryName].push(t.page)
    }
  } else {
    lookupMisses++
  }
}

// Enrich each summary entry
let enriched1to1 = 0
let enrichedShared = 0
let unchanged = 0

const updated = sums.map((s) => {
  const pages = summaryToPages[s.name]
  if (!pages || pages.length === 0) {
    unchanged++
    return s
  }
  if (pages.length === 1) {
    enriched1to1++
    return { ...s, page: pages[0] }
  }
  // Shared summary — multiple templates use the same summary entry
  enrichedShared++
  return { ...s, pages }
})

console.log(`Templates processed: ${all.length}`)
console.log(`Templates with no summary match: ${lookupMisses}`)
console.log(`Summaries enriched (1:1): ${enriched1to1}`)
console.log(`Summaries enriched (shared, N templates): ${enrichedShared}`)
console.log(`Summaries unchanged (no template match): ${unchanged}`)
console.log('')

// Report the shared summaries so they can be reviewed
console.log('Shared summary entries (1 summary → N templates):')
for (const [name, pages] of Object.entries(summaryToPages)) {
  if (pages.length > 1) {
    console.log(`  "${name}" → ${pages.length} templates`)
  }
}

writeFileSync(summariesPath, JSON.stringify(updated, null, 2), 'utf8')
console.log('\ncontent-summaries.json updated.')
