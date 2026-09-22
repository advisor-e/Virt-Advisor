'use strict'

/**
 * salesTeamStore — the firm-wide read behind the Team roll-up (item 17 stage 4).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 THIS IS THE ONE SALES READ THAT CROSSES THE ADVISOR BOUNDARY
 * ─────────────────────────────────────────────────────────────────────────────
 * `salesPipelineStore.listForAdvisor` gives an advisor their own deals plus
 * their firm's shared ones. This gives a FIRM MANAGER every deal in their firm,
 * private ones included — Mike's ruling, 2026-09-22, asked and answered as the
 * open question stage 1 left behind:
 *
 *     "Still open, and it is Mike's: whether a firm manager sees their advisors'
 *      pipelines by default."  (features/sales-tracker.md §10 stage 1)
 *
 * Because it crosses that boundary, two properties are not optional:
 *
 *   1. `firm_id = ?` is the ONLY widening. The manager's own firm, from the
 *      verified JWT, never from the request. A manager of firm A cannot reach
 *      firm B by any argument this module accepts.
 *   2. The ROLE is checked at the route (`requireManagerRole`), not here. A
 *      store that widens access must never also be the thing deciding who is
 *      allowed the widening — the route gates it and this module assumes the
 *      gate held.
 *
 * ⚠ THE SOURCE APP'S VERSION OF THIS SCREEN DOES NOT WORK, and it is worth
 * saying why so nobody "restores" it. `server/api/team/summary.get.js` filters
 * `where: { userId: user.id }` — it aggregates only the MANAGER'S OWN deals and
 * then groups them by `leadStaff`. A team roll-up that cannot see the team. Its
 * role check is also a client-side redirect (`middleware/firm-manager.js` returns
 * early on the server), so the page was hidden rather than the data protected.
 * Neither comes across.
 *
 * This module holds no maths: it returns rows, and `salesMetrics.teamSummary`
 * groups them. Same division as the dashboard — one place reads, one place
 * counts, and the access rule cannot drift into the arithmetic.
 */

const path = require('path')
const fs = require('fs')
const db = require('./db')
const { devFallbackAllowed } = require('./dbFailure')
const { rowToEntry } = require('./salesPipelineStore')

const DEV_FILE = process.env.SALES_PIPELINE_DEV_FILE
  ? path.resolve(process.env.SALES_PIPELINE_DEV_FILE)
  : path.resolve(__dirname, '../../data/dev-sales-pipeline.json')

/**
 * Every deal in one firm, whatever its visibility or owner.
 *
 * The 2000 cap is deliberately higher than the 500 of the per-advisor list: this
 * is every advisor's deals at once, and a roll-up that silently drops rows
 * reports wrong totals to the person judging the team by them. A firm past 2000
 * live deals needs paging, not a bigger number — and the route says so on screen
 * rather than quietly truncating.
 *
 * @param {string} firmId - from the verified JWT, never the request body
 * @returns {Promise<object[]>}
 */
async function listForFirm (firmId) {
  if (!firmId) { throw new Error('firmId is required') }
  try {
    const [rows] = await db.execute(
      `SELECT * FROM va_sales_pipeline
        WHERE firm_id = ?
        ORDER BY updated_at DESC
        LIMIT 2000`,
      [firmId]
    )
    return rows.map(rowToEntry)
  } catch (err) {
    if (devFallbackAllowed(err)) { return _devListForFirm(firmId) }
    throw err
  }
}

// ── DEV/TEST fallback ────────────────────────────────────────────────────────
// Reads the SAME file salesPipelineStore writes, so the Team screen and the
// pipeline screen cannot disagree in development.

function _devReadAll () {
  try { return JSON.parse(fs.readFileSync(DEV_FILE, 'utf8')).entries || [] } catch (e) { return [] }
}

/** The firm filter, and nothing else — the SQL's rule, in JS. */
function _devListForFirm (firmId) {
  return _devReadAll()
    .filter(e => e.firmId === firmId)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, 2000)
}

module.exports = {
  listForFirm
}
