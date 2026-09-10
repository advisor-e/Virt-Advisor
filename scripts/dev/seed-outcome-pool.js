'use strict'

/**
 * seed-outcome-pool — fill the outcome pool with a pool that has crossed the floor, so the
 * mentor's Outcome Learning page can be seen with rows in it (item 4.87, T030; quickstart
 * Story 2 step 1).
 *
 * RUN (development only, against the local MySQL the desktop has):
 *   node scripts/dev/seed-outcome-pool.js            # add the seeded rows
 *   node scripts/dev/seed-outcome-pool.js --reset    # remove the seeded firms' rows first
 *
 * WHAT IT WRITES. Thirty-one reviews across five firms in the profitability domain:
 *   Break-Even      delivered in 31, "Didn't land" in 12  → hold-back 4, ABOVE the floor
 *   7 Cash Drivers  delivered in 20, "Didn't land" in 5   → hold-back 3, BELOW the floor
 * Firm A is the dev firm (`dev-firm`), so a withdrawal from its Outcome Sharing tab takes
 * its rows out and the first adjustment drops below the floor — Story 2 step 5. The other
 * four firms are invented ids that exist nowhere else; their tokens are one-way, as every
 * pool token is.
 *
 * 🔴 EVERY ROW GOES THROUGH THE GUARD AND THE STORE, NEVER AROUND THEM. A seed that wrote
 * SQL directly could put a row in the pool that a real review could not, and the page would
 * be tested against something that cannot happen. `guardContribution` refuses any row a
 * review could not produce; `saveFirmConfig` is the one door into the store.
 *
 * 🔴 REFUSES TO RUN IN PRODUCTION. NODE_ENV=production exits before anything is required.
 * It also needs OUTCOME_POOL_SECRET, as the app does: without it no token can be derived
 * and nothing is written.
 *
 * It does NOT switch the dev firm's sharing on — that is the firm manager's act on the
 * Outcome Sharing tab, and the seed says so when it finishes.
 */

if (process.env.NODE_ENV === 'production') {
  process.stderr.write('seed-outcome-pool: refusing to run with NODE_ENV=production. This seed is for a developer\'s machine only.\n')
  process.exit(1)
}

try { require('dotenv').config() } catch (_e) { /* the process environment as-is */ }

const overlay = require('../../server/utils/firmOverlay')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')
const { SIGNAL_TYPES } = require('../../server/utils/signals')
const { firmToken, caseHash } = require('../../server/utils/outcomeConsent')
const { POOL_PREFIX, guardContribution } = require('../../server/utils/outcomeLearning')
const { platformTemplates } = require('../../server/utils/outcomeContribute')

/** What a seeded row records as its author: a constant, never a person. */
const SEED_SAVED_BY = 'outcome-learning-seed'

/** Firm A is the dev firm the dev token signs in to; the rest exist only here. */
const SEED_FIRM_IDS = ['dev-firm', 'seed-firm-2', 'seed-firm-3', 'seed-firm-4', 'seed-firm-5']

const DOMAIN = 'profit'
const TEMPLATE_ABOVE = 'Break-Even'
const TEMPLATE_BELOW = '7 Cash Drivers'
const CASES = 31
const ABOVE_LESS = 12
const BELOW_CASES = 20
const BELOW_LESS = 5
// An authored primary-issue label for the domain, on some rows, so the page shows one.
const PRIMARY_ISSUE = 'Cost of sales has increased'
const MONTHS = ['2026-07', '2026-08', '2026-09']

/**
 * The thirty-one rows, in the guarded shape, before any store is touched.
 * @param {string[]} libraryTitles - so the titles are the library's own spelling
 * @returns {Array<{firmId: string, caseId: string, row: Object}>}
 */
function buildSeedRows (libraryTitles) {
  const canonical = new Map(libraryTitles.map(t => [t.trim().toLowerCase(), t]))
  const above = canonical.get(TEMPLATE_ABOVE.toLowerCase())
  const below = canonical.get(TEMPLATE_BELOW.toLowerCase())
  if (!above || !below) {
    throw new Error(`seed-outcome-pool: the library does not hold "${TEMPLATE_ABOVE}" and "${TEMPLATE_BELOW}"; nothing written`)
  }
  const out = []
  for (let i = 0; i < CASES; i++) {
    const templates = [{ title: above, used: i % 3 === 0 ? 'partial' : 'full', outcome: i < ABOVE_LESS ? 'less' : 'well' }]
    if (i < BELOW_CASES) {
      templates.push({ title: below, used: 'full', outcome: i < BELOW_LESS ? 'less' : 'well' })
    }
    out.push({
      firmId: SEED_FIRM_IDS[i % SEED_FIRM_IDS.length],
      caseId: 'seed-case-' + (i + 1),
      row: {
        v: 1,
        month: MONTHS[i % MONTHS.length],
        domain: DOMAIN,
        primaryIssue: i % 2 === 0 ? PRIMARY_ISSUE : null,
        industry: null,
        signals: i % 4 === 0 ? [SIGNAL_TYPES.FINANCIAL_FOUNDATIONS_GAP] : [],
        engagementType: 'education',
        staircaseStep: null,
        templates
      }
    })
  }
  return out
}

/**
 * Seed the pool. Every row is guarded, then saved through the store.
 * @param {{reset?: boolean}} [opts]
 * @returns {Promise<{written: number, removed: number, firms: number}>}
 */
async function seed (opts) {
  const reset = !!(opts && opts.reset)
  const templates = await platformTemplates()
  const libraryTitles = templates.map(t => t && t.title).filter(t => typeof t === 'string' && t.trim())
  const signalTypes = Object.values(SIGNAL_TYPES)

  let removed = 0
  if (reset) {
    for (const firmId of SEED_FIRM_IDS) {
      removed += await overlay.deleteFirmConfigsByPrefix(PLATFORM_SCOPE, POOL_PREFIX + firmToken(firmId) + ':')
    }
  }

  const rows = buildSeedRows(libraryTitles)
  let written = 0
  for (const r of rows) {
    guardContribution(r.row, { libraryTitles, signalTypes })
    await overlay.saveFirmConfig(PLATFORM_SCOPE, POOL_PREFIX + firmToken(r.firmId) + ':' + caseHash(r.caseId), r.row, SEED_SAVED_BY)
    written += 1
  }
  return { written, removed, firms: SEED_FIRM_IDS.length }
}

async function main () {
  const reset = process.argv.includes('--reset')
  const result = await seed({ reset })
  process.stdout.write([
    '',
    `seed-outcome-pool: ${result.written} reviews written across ${result.firms} firms` + (reset ? `, after removing ${result.removed} earlier rows` : '') + '.',
    `  ${TEMPLATE_ABOVE}: delivered in ${CASES}, didn't land in ${ABOVE_LESS} → hold-back ${Math.round(10 * ABOVE_LESS / CASES)}, above the floor.`,
    `  ${TEMPLATE_BELOW}: delivered in ${BELOW_CASES}, didn't land in ${BELOW_LESS} → below the floor (needs ${25 - BELOW_CASES} more cases).`,
    '',
    '  Firm A is the dev firm. Its sharing switch is NOT set by this seed: switch it on from the',
    '  Outcome Sharing tab (sign in as dev-local-bypass), then open the Mentor Hub as',
    '  dev-local-mentor → Outcome Learning. A withdrawal from firm A takes its rows out.',
    ''
  ].join('\n'))
}

module.exports = { seed, buildSeedRows, SEED_FIRM_IDS, SEED_SAVED_BY }

if (require.main === module) {
  const db = require('../../server/utils/db')
  main()
    .then(() => db.end())
    .catch((err) => {
      process.stderr.write('seed-outcome-pool failed: ' + err.message + '\n')
      db.end().catch(() => {}).then(() => process.exit(1))
    })
}
