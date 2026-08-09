'use strict'

/**
 * @file The list of firms on the platform — id and name, nothing else.
 * @module server/utils/firmsDirectory
 *
 * ⚠ THIS IS THE FIRST AND ONLY PLACE IN THIS BACKEND THAT QUERIES THE `firms`
 * TABLE. That was checked, not assumed: as of 2026-08-09 no other SQL statement
 * in `server/` selected from or joined it (design/MENTOR-SAVE-SCOPE-PLAN.md §3.1
 * records the check, made when the reserved platform row was seeded). Anything
 * else needing "which firms…" should come here rather than write a second query,
 * for the same reason `listFirmIdsWithConfigKey` is a single choke point.
 *
 * WHY IT EXISTS. Activity lives in the session tables, which only ever hold rows
 * for firms that have DONE something. A firm that has never opened the product
 * leaves no trace there — so "who has NOT adopted this", the more useful half of
 * the mentor's adoption question, cannot be answered without this list. Mike
 * ruled on 2026-08-09 that the page reads it
 * (design/mockups/mentor-adoption-view.html §3, decision 1).
 *
 * ⚠ THE RESERVED PLATFORM ROW IS NOT A FIRM and is excluded IN SQL, so no caller
 * can forget and it never crosses the wire. It exists because the overlay store's
 * `firm_id` column is foreign-keyed to `firms.id` and the mentor's own content
 * has to live somewhere; counting it here would report a firm that is really
 * Advisor-e's own shelf. Same rule, same reason, as `listFirmIdsWithConfigKey`.
 *
 * ⚠ THE TABLE MAY NOT BE OURS. `config/db-schema.sql` explicitly invites the
 * Advisor-e team to skip our `firms` CREATE TABLE and point the foreign keys at
 * their own. So this read can legitimately return rows we did not write, or fail
 * in ways the rest of this repo has never seen. Every caller must therefore treat
 * an empty list as "we do not know", never as "there are no firms" — see the
 * @returns note below.
 */

const fs = require('fs')
const path = require('path')
const db = require('./db')
const { PLATFORM_SCOPE } = require('./platformScope')

// DEV/TEST-ONLY stand-in, mirroring activityStore's ACTIVITY_DEV_FILE. There is no
// MySQL on a developer machine, and without this the adoption page would be
// untestable end to end and permanently empty in development.
const DEV_FIRMS_FILE = process.env.FIRMS_DEV_FILE
  ? path.resolve(process.env.FIRMS_DEV_FILE)
  : path.resolve(__dirname, '../../data/dev-firms.json')

const SQL_LIST_FIRMS =
  `SELECT id, name
         FROM firms
         WHERE id <> ?
         ORDER BY name`

/**
 * Whether the DEV/TEST-ONLY JSON fallback may stand in for an unavailable DB.
 * Read at call-time so a production failure always propagates.
 * @returns {boolean}
 */
function devFallbackEnabled () {
  return process.env.NODE_ENV !== 'production'
}

/**
 * Read the dev stand-in file.
 *
 * A missing file is not a fault — it is a developer who has never set one up, and
 * the adoption page then shows only the firms that have activity, which is
 * exactly what it would show without this module at all.
 *
 * @returns {Array<{id: string, name: (string|null)}>}
 */
function _devReadFirms () {
  let raw
  try {
    raw = fs.readFileSync(DEV_FIRMS_FILE, 'utf8')
  } catch (e) {
    if (e.code === 'ENOENT') { return [] }
    throw e
  }
  const parsed = JSON.parse(raw)
  const rows = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.firms) ? parsed.firms : [])
  return rows
    .filter(r => r && r.id && r.id !== PLATFORM_SCOPE)
    .map(r => ({ id: String(r.id), name: typeof r.name === 'string' ? r.name : null }))
}

/**
 * Every firm on the platform, excluding the reserved platform scope.
 *
 * @returns {Promise<Array<{id: string, name: (string|null)}>>} the firms, or an
 *   EMPTY ARRAY when the directory cannot be read in development. An empty result
 *   means "we could not learn about firms", NOT "there are no firms" — callers
 *   must add any firm they can see by other means rather than filtering to this
 *   list, or a directory outage would silently under-report adoption.
 *   In production a failure REJECTS: a page that quietly drops every never-started
 *   firm looks identical to a platform where everyone is active, which is the
 *   opposite of what it is for.
 */
async function listFirms () {
  try {
    const [rows] = await db.execute(SQL_LIST_FIRMS, [PLATFORM_SCOPE])
    return (Array.isArray(rows) ? rows : [])
      .filter(r => r && r.id)
      .map(r => ({ id: String(r.id), name: typeof r.name === 'string' ? r.name : null }))
  } catch (err) {
    if (!devFallbackEnabled()) { throw err }
    console.warn('[firmsDirectory] listFirms fell back to the dev file:', err.message)
    return _devReadFirms()
  }
}

module.exports = {
  listFirms,
  // Exported for tests and for anything needing to reason about the fallback.
  devFallbackEnabled,
  DEV_FIRMS_FILE
}
