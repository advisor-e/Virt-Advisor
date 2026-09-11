'use strict'

// ─────────────────────────────────────────────────────────────────────────────
// OUTCOME BENCH — the pool itself, replayed (item 4.87, specs/002-outcome-learning
// user story 4, task T041). The library half is server/utils/outcomeBench.js; the
// mentor page's "Run the benches" calls the same function through the bench route.
//
// Reads every pooled review through the store (needs MySQL and OUTCOME_POOL_SECRET
// is NOT needed — the pool is read by prefix, never by firm), replays each review's
// situation through the real resolver with and without the LIVE adjustments, and
// prints the share whose top recommendation that review marked "Landed well".
//
// RUN:
//   node -r dotenv/config scripts/outcome-bench.js
//
// In-sample in this release: the adjustments are scored on the reviews that produced
// them, so the figure flatters them a little. The fixed bench (scripts/scenario-lab.js
// --adjustments) cannot be flattered because it never saw the pool. Read them together.
// ─────────────────────────────────────────────────────────────────────────────

const overlay = require('../server/utils/firmOverlay')
const { PLATFORM_SCOPE } = require('../server/utils/platformScope')
const { POOL_PREFIX, DECISIONS_KEY, computeAdjustments, liveAdjustments } = require('../server/utils/outcomeLearning')
const { platformTemplates } = require('../server/utils/outcomeContribute')
const { outcomeBench } = require('../server/utils/outcomeBench')

const pct = x => (100 * x).toFixed(1) + '%'

async function main () {
  const [rows, stored, templates] = await Promise.all([
    overlay.loadFirmConfigsByPrefix(PLATFORM_SCOPE, POOL_PREFIX),
    overlay.loadFirmConfig(PLATFORM_SCOPE, DECISIONS_KEY),
    platformTemplates()
  ])
  const decisions = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored.decisions : null
  const titles = templates.map(t => t && t.title).filter(t => typeof t === 'string' && t.trim())
  const live = liveAdjustments(computeAdjustments(rows, decisions, titles))

  const started = Date.now()
  const result = await outcomeBench(rows, templates, live)
  const ms = Date.now() - started

  console.log(`\n=== OUTCOME BENCH — ${result.reviews} pooled reviews · ${live.length} live adjustment${live.length === 1 ? '' : 's'} · ${ms} ms ===`)
  console.log(`  Top recommendation marked "Landed well":  without adjustments ${pct(result.before)} (${result.wellBefore}/${result.reviews})`)
  console.log(`                                            with adjustments    ${pct(result.after)} (${result.wellAfter}/${result.reviews})`)
  console.log(`  Reviews with no "Landed well" verdict (counted in the denominator only): ${result.noWellVerdict}`)
  if (live.length) { console.log('  Live: ' + live.map(a => `${a.template} · ${a.dimension} ${a.value} · −${a.holdBack}`).join(' | ')) }
  console.log('')
  return result
}

module.exports = { main }

if (require.main === module) {
  const db = require('../server/utils/db')
  main()
    .then(() => db.end())
    .catch((err) => {
      process.stderr.write('outcome-bench failed: ' + err.message + '\n')
      db.end().catch(() => {}).then(() => process.exit(1))
    })
}
