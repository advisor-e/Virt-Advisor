'use strict'
/**
 * Ghost Reference Migration Script
 *
 * Removes template names from logic tree nodes that do not exist in the
 * search content (source of truth). These dead references cause Phase 3 AI
 * to fabricate recommendations for templates the advisor cannot find.
 *
 * Run from project root:
 *   node scripts/migrate-ghost-references.js
 *
 * Dry-run mode (no file changes):
 *   node scripts/migrate-ghost-references.js --dry-run
 *
 * After running: npm run audit:content to confirm ghost count = 0.
 */

const { readFileSync, writeFileSync } = require('fs')
const { resolve } = require('path')
const { loadLatestSearchContent, EXPORT_DIR } = require('../server/utils/masterExport')

const DRY_RUN = process.argv.includes('--dry-run')

const searchContent = loadLatestSearchContent()
if (!searchContent) {
  console.error(`[migrate:ghosts] No search_content_*.json found in ${EXPORT_DIR}/ — aborting.`)
  process.exit(1)
}
const logicTreesRaw = readFileSync(resolve(process.cwd(), 'data/logic_trees.json'), 'utf8')
const logicTrees = JSON.parse(logicTreesRaw)

const allTitles = new Set(searchContent.map(t => t.title))

const removed = []
let nodesChanged = 0

for (const tree of (logicTrees.trees || [])) {
  for (const node of (tree.nodes || [])) {
    if (!node.templates || !node.templates.length) { continue }

    const ghosts = node.templates.filter(name =>
      name && typeof name === 'string' && name.length < 80 &&
      !name.startsWith('[') && !name.startsWith('a ') &&
      !allTitles.has(name)
    )

    if (ghosts.length === 0) { continue }

    ghosts.forEach(g => removed.push({ tree: tree.id, node: node.id, name: g }))
    node.templates = node.templates.filter(name => !ghosts.includes(name))
    nodesChanged++
  }
}

console.log(`\n=== GHOST REFERENCE MIGRATION ===`)
console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes written)' : 'LIVE'}`)
console.log(`Ghost references found: ${removed.length} across ${nodesChanged} nodes\n`)
removed.forEach(r => console.log(`  [${r.tree}] node=${r.node} → removed: "${r.name}"`))

if (!DRY_RUN && removed.length > 0) {
  writeFileSync(resolve(process.cwd(), 'data/logic_trees.json'), JSON.stringify(logicTrees, null, 2))
  console.log(`\nWrote updated logic_trees.json — ${removed.length} ghost reference(s) removed.`)
  console.log(`Run 'npm run audit:content' to confirm ghost count = 0.\n`)
} else if (DRY_RUN) {
  console.log(`\nDry run complete — no files changed. Run without --dry-run to apply.\n`)
} else {
  console.log(`\nNo ghost references found — nothing to migrate.\n`)
}
