/**
 * Sync videoMinutes from search_content JSON into data/templates.json.
 * Matches templates by `page` ID and copies cpd.watchedVideo where > 0.
 * Run once with: node scripts/sync-video-minutes.js
 */

const { readFileSync, writeFileSync } = require('fs')
const { resolve } = require('path')
const { findLatestSearchContentPath, loadLatestSearchContent, EXPORT_DIR } = require('../server/utils/masterExport')

const root = resolve(__dirname, '..')

// Find the most recent search_content file (in Central Frameworks/, via the helper)
const searchPath = findLatestSearchContentPath()
if (!searchPath) {
  console.error(`No search_content_*.json file found in ${EXPORT_DIR}/.`)
  process.exit(1)
}

console.log(`Using source: ${searchPath}`)

const searchContent = loadLatestSearchContent()
const templatesPath = resolve(root, 'data/templates.json')
const templates = JSON.parse(readFileSync(templatesPath, 'utf8'))

// Build lookup: page ID → watchedVideo minutes
const videoMap = {}
for (const entry of searchContent) {
  const minutes = entry.cpd && entry.cpd.watchedVideo > 0 ? entry.cpd.watchedVideo : 0
  if (minutes > 0) {
    videoMap[entry.page] = minutes
  }
}

let added = 0
let removed = 0

const updated = templates.map(t => {
  const minutes = videoMap[t.page] || 0
  const had = 'videoMinutes' in t

  if (minutes > 0) {
    if (!had || t.videoMinutes !== minutes) { added++ }
    return { ...t, videoMinutes: minutes }
  } else {
    if (had) {
      removed++
      const { videoMinutes, ...rest } = t
      return rest
    }
    return t
  }
})

writeFileSync(templatesPath, JSON.stringify(updated, null, 2), 'utf8')

console.log(`Done. ${added} templates updated with videoMinutes, ${removed} cleared.`)
console.log(`Templates with a tutorial video: ${updated.filter(t => t.videoMinutes > 0).length} of ${updated.length}`)
