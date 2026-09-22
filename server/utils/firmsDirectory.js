'use strict'

/**
 * @file The list of firms on the platform, and one firm's white-label brand.
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
 *
 * ⚠ IN DEVELOPMENT the brand read takes its logo and colour straight off
 * `data/dev-firms.json` as `logo` and `colour`, with no column names configured.
 * That is deliberate: the whole point of Q-FIRM-BRAND is that the real names are
 * unknown until the master team answers, and a developer must be able to see a
 * branded document before then. The format checks are the SAME on both paths, so
 * a malformed dev value fails exactly as a malformed production one would.
 */

const fs = require('fs')
const path = require('path')
const { FIRM_BRAND } = require('../../config/integration')
const db = require('./db')
const { PLATFORM_SCOPE } = require('./platformScope')
const { devFallbackAllowed } = require('./dbFailure')

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
// See server/utils/dbFailure.js — also refuses the fallback when a live server
// REFUSED the statement, so a rejected read cannot answer with stale dev data.
function devFallbackEnabled (err) {
  return devFallbackAllowed(err)
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
  return _devReadRawFirms()
    .map(r => ({ id: String(r.id), name: typeof r.name === 'string' ? r.name : null }))
}

/**
 * The dev stand-in rows as written, with every field intact.
 *
 * Split out of `_devReadFirms` when firm branding arrived (item 16): that one
 * narrows each row to id and name, which is right for the adoption list and
 * would silently discard a logo and a colour. Callers needing more than the
 * directory's two fields read here and narrow for themselves.
 *
 * @returns {Array<Object>} the rows, minus the reserved platform scope
 */
function _devReadRawFirms () {
  let raw
  try {
    raw = fs.readFileSync(DEV_FIRMS_FILE, 'utf8')
  } catch (e) {
    if (e.code === 'ENOENT') { return [] }
    throw e
  }
  const parsed = JSON.parse(raw)
  const rows = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.firms) ? parsed.firms : [])
  return rows.filter(r => r && r.id && r.id !== PLATFORM_SCOPE)
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
    if (!devFallbackEnabled(err)) { throw err }
    console.warn('[firmsDirectory] listFirms fell back to the dev file:', err.message)
    return _devReadFirms()
  }
}

/* ── Firm branding (item 16) ──────────────────────────────────────────────────
 *
 * THE STUB CONNECTION to Advisor-e's firm profile page. Mike ruled on 2026-09-22
 * that a client's document carries the ADVISOR firm's logo and colour, never
 * Advisor-e's, and that the data is Advisor-e's own: "Advisor-e already picks up
 * the colour and brands the border to suit." So this reads; it never writes, and
 * no screen in this app edits a firm's brand.
 *
 * It lives HERE rather than in a module of its own for the reason stated at the
 * top of this file: the `firms` table has exactly one reader, and a second query
 * against it elsewhere would be the drift that rule exists to prevent.
 */

// A column name cannot be a bound parameter, so the two configured names are
// interpolated. Only a plain SQL identifier is ever allowed through.
const COLUMN_NAME = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/

// A brand colour reaches an SVG `fill` attribute and a logo URL reaches an
// `<image>` href, so neither is trusted as read. #rgb and #rrggbb only; http(s)
// only. Anything else resolves to null and the drawing falls back — see
// `_brandFrom`. This is the "never trust external data as structured data" rule
// in CLAUDE.md applied to a field Advisor-e owns and we merely display.
const HEX_COLOUR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

/**
 * Refuse anything that is not a plain SQL identifier.
 *
 * Guards the one place in this backend where a configured value is interpolated
 * into SQL rather than bound. It throws rather than silently dropping the column,
 * because a typo in `config/integration.js` that quietly disabled firm branding
 * would look exactly like "the master team has not answered yet" — the two must
 * never be confusable.
 *
 * @param {string} name the configured column name
 * @param {string} which which setting it came from, for the error message
 * @returns {string} the same name, once proven safe
 * @throws {Error} when the name is not a bare identifier
 */
function assertColumnName (name, which) {
  if (!COLUMN_NAME.test(String(name))) {
    throw new Error(
      `[firmsDirectory] FIRM_BRAND.${which} is not a plain column name: ${JSON.stringify(name)}. ` +
      'It is interpolated into SQL and must match /^[A-Za-z_][A-Za-z0-9_]*$/.'
    )
  }
  return name
}

/**
 * The configured brand columns, validated, or null when none are set.
 * @returns {{logo: (string|null), colour: (string|null)}|null}
 */
function _brandColumns () {
  const logo = FIRM_BRAND && FIRM_BRAND.logoColumn ? assertColumnName(FIRM_BRAND.logoColumn, 'logoColumn') : null
  const colour = FIRM_BRAND && FIRM_BRAND.colourColumn ? assertColumnName(FIRM_BRAND.colourColumn, 'colourColumn') : null
  return (logo || colour) ? { logo, colour } : null
}

/**
 * Shape one firm's brand from a raw row, dropping anything that fails its format.
 *
 * @param {Object} row the row as read, or a dev-file entry
 * @param {{logo: (string|null), colour: (string|null)}|null} cols configured columns
 * @returns {{id: string, name: (string|null), logo: (string|null), colour: (string|null)}}
 */
function _brandFrom (row, cols) {
  const rawLogo = cols && cols.logo ? row[cols.logo] : row.logo
  const rawColour = cols && cols.colour ? row[cols.colour] : row.colour
  const logo = typeof rawLogo === 'string' && /^https?:\/\//i.test(rawLogo.trim()) ? rawLogo.trim() : null
  const colour = typeof rawColour === 'string' && HEX_COLOUR.test(rawColour.trim()) ? rawColour.trim() : null
  return {
    id: String(row.id),
    name: typeof row.name === 'string' ? row.name : null,
    logo,
    colour
  }
}

/**
 * One firm's white-label brand, for the document a client is handed.
 *
 * @route read-only; no Restify route of its own — a document renderer calls it.
 * @param {string} firmId the firm whose document is being produced
 * @returns {Promise<{id: string, name: (string|null), logo: (string|null), colour: (string|null)}|null>}
 *   null when the firm is unknown or the reserved platform scope. `logo` and
 *   `colour` are null whenever the master team has not answered Q-FIRM-BRAND, or
 *   the stored value fails its format — a caller MUST treat null as "fall back to
 *   the initials disc", never as "this firm has no brand".
 */
async function firmBrand (firmId) {
  const id = String(firmId || '')
  if (!id || id === PLATFORM_SCOPE) { return null }
  const cols = _brandColumns()
  const extra = cols ? [cols.logo, cols.colour].filter(Boolean).join(', ') : ''
  const sql = `SELECT id, name${extra ? ', ' + extra : ''} FROM firms WHERE id = ? LIMIT 1`
  try {
    const [rows] = await db.execute(sql, [id])
    const row = Array.isArray(rows) ? rows[0] : null
    return row && row.id ? _brandFrom(row, cols) : null
  } catch (err) {
    if (!devFallbackEnabled(err)) { throw err }
    console.warn('[firmsDirectory] firmBrand fell back to the dev file:', err.message)
    const row = _devReadRawFirms().find(r => String(r.id) === id)
    return row ? _brandFrom(row, cols) : null
  }
}

module.exports = {
  listFirms,
  firmBrand,
  // Exported for tests and for anything needing to reason about the fallback.
  devFallbackEnabled,
  assertColumnName,
  DEV_FIRMS_FILE
}
