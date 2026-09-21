'use strict'

/**
 * salesPipelineStore — an advisor's own sales pipeline (MySQL `va_sales_pipeline`).
 *
 * Item 17 stage 2. Ported from the standalone Sales Tracker
 * (advisor-e/sales-tracker-nuxt), whose data layer was Prisma and whose access
 * model was one firm per database. Neither comes across: raw SQL via `mysql2`
 * per the Stack Constitution, and the access model below.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 THE ACCESS MODEL, AND WHY IT IS NOT THE SOURCE APP'S
 * ─────────────────────────────────────────────────────────────────────────────
 * The source app says so in its own comment, twice — in the list route and again
 * in the update route:
 *
 *     // Pipeline is shared across the firm - no userId filter
 *
 * That is a defensible product decision for a single-firm tool. Here it would be
 * two separate faults:
 *
 *   1. Virt Advisor is MULTI-TENANT. With no firm filter, one firm reads another
 *      firm's prospects, fee values and who is chasing whom.
 *   2. Mike ruled 2026-09-21 that this is the ADVISOR'S OWN tool — "the gain is
 *      to the advisor, not to their client". Firm-wide by default would show
 *      every advisor at a firm every colleague's deals.
 *
 * So this store copies the model `caseStore` already uses for case studies, which
 * is built, reviewed and tested:
 *
 *   - Reads are scoped to the caller's verified identity: an advisor sees their
 *     OWN deals at any visibility, plus their firm's deals marked 'firm'. Never
 *     another advisor's private deal.
 *   - Mutations carry `AND advisor_id = ? AND firm_id = ?`, so an advisor can only
 *     ever change a row they own. The id in the URL is never sufficient on its own.
 *
 * ⚠ THE SOURCE APP'S UPDATE IS AN IDOR AND IT MUST NOT BE COPIED. Its
 * `[id].patch.js` runs `updateMany({ where: { id } })` after `requireUser` — any
 * signed-in person could edit any row by guessing an incrementing integer. Our ids
 * are UUIDs *and* every mutation is ownership-checked; either alone would be thin.
 *
 * ⚠ A FIRM MANAGER SEES EVERY DEAL IN THEIR FIRM, private ones included — Mike's
 * ruling, 2026-09-22 — AND IT IS **NOT** IMPLEMENTED HERE. It belongs to the Team
 * roll-up (stage 4), which
 * reads across the firm behind a manager-role guard. This store is the advisor's
 * own view, and widening it here would hand every advisor the manager's reach.
 *
 * DEV/TEST fallback: when the DB is unavailable outside production, reads and
 * writes go to a gitignored JSON file (data/dev-sales-pipeline.json; override via
 * SALES_PIPELINE_DEV_FILE for hermetic tests) — the same convention as caseStore
 * and clientStore. In production a DB failure propagates so an outage is never
 * silently masked.
 */

const path = require('path')
const fs = require('fs')
const db = require('./db')
const { generateId } = require('./caseStore')
const { devFallbackAllowed } = require('./dbFailure')

const DEV_FILE = process.env.SALES_PIPELINE_DEV_FILE
  ? path.resolve(process.env.SALES_PIPELINE_DEV_FILE)
  : path.resolve(__dirname, '../../data/dev-sales-pipeline.json')

/**
 * Same rule as caseStore: the JSON fallback may never stand in for production,
 * and never when a live server REFUSED the statement — a rejected write must not
 * report success. See server/utils/dbFailure.js.
 */
function devFallbackEnabled (err) {
  return devFallbackAllowed(err)
}

/** The two legal visibilities. Anything else fails safe to 'private'. */
const VISIBILITIES = ['private', 'firm']

/**
 * Normalise a requested visibility to a safe enum value.
 * Fail-safe to 'private': an unrecognised value must never widen access.
 * @param {*} v
 * @returns {string} 'private' | 'firm'
 */
function normaliseVisibility (v) {
  return !VISIBILITIES.includes(v) ? 'private' : v
}

/**
 * Every business column, in schema order, as [jsName, sqlName, kind].
 *
 * ONE LIST, used by the row mapper, the insert and the update, because three
 * hand-maintained copies of 34 columns is three chances to drop one. The source
 * app has exactly that bug: its PATCH schema accepts 16 of the 34 fields, so
 * `industry`, `meetingDate`, `dateSecured`, `supportStaff` and 13 others can be
 * created but never edited. Adding a column here reaches all three at once.
 *
 * `kind` drives conversion, not validation — the route validates.
 *   text   — string or null
 *   bool   — 0/1 in MySQL, boolean in JS
 *   money  — DECIMAL(14,2); MySQL returns a STRING and it is converted on the way
 *            out, never stored as a float
 *   date   — DATETIME or null
 */
const COLUMNS = [
  ['prospectName', 'prospect_name', 'text'],
  ['businessName', 'business_name', 'text'],
  ['prospectStatus', 'prospect_status', 'text'],
  ['address', 'address', 'text'],
  ['contactPhone', 'contact_phone', 'text'],
  ['email', 'email', 'text'],
  ['industry', 'industry', 'text'],
  ['existingFeeValue', 'existing_fee_value', 'text'],
  ['partner', 'partner', 'text'],
  ['leadStaff', 'lead_staff', 'text'],
  ['supportStaff', 'support_staff', 'text'],
  ['relationshipType', 'relationship_type', 'text'],
  ['prospectSource', 'prospect_source', 'text'],
  ['coiInvolved', 'coi_involved', 'text'],
  ['dateLastContact', 'date_last_contact', 'date'],
  ['approachDate', 'approach_date', 'date'],
  ['approachStyle', 'approach_style', 'text'],
  ['secureMeeting', 'secure_meeting', 'bool'],
  ['quizCompleted', 'quiz_completed', 'bool'],
  ['salesStyle', 'sales_style', 'text'],
  ['meetingTheme', 'meeting_theme', 'text'],
  ['meetingDate', 'meeting_date', 'date'],
  ['followUpMeeting', 'follow_up_meeting', 'bool'],
  ['followUpMeetingDate', 'follow_up_meeting_date', 'date'],
  ['totalNeedsStage', 'total_needs_stage', 'text'],
  ['proposalSent', 'proposal_sent', 'bool'],
  ['proposalValue', 'proposal_value', 'money'],
  ['jobSecured', 'job_secured', 'bool'],
  ['dateSecured', 'date_secured', 'date'],
  ['jobSecuredValue', 'job_secured_value', 'money'],
  ['additionalWorkSecured', 'additional_work_secured', 'money'],
  ['comments', 'comments', 'text']
]

/** Max lengths, mirroring the schema so a long value is trimmed rather than rejected by MySQL. */
const TEXT_LIMITS = {
  prospectName: 255,
businessName: 255,
prospectStatus: 80,
address: 500,
  contactPhone: 80,
email: 255,
industry: 120,
existingFeeValue: 120,
  partner: 255,
leadStaff: 255,
supportStaff: 255,
relationshipType: 80,
  prospectSource: 120,
coiInvolved: 255,
approachStyle: 120,
salesStyle: 80,
  meetingTheme: 120,
totalNeedsStage: 80
}

/**
 * A DB row → the shape the screen reads.
 *
 * Money is converted from MySQL's DECIMAL string to a Number here, at the edge,
 * so the screen never formats a string and the maths never sees one. It is stored
 * as DECIMAL precisely so no float ever touches a fee value in the database.
 * @param {object} row
 * @returns {object}
 */
function rowToEntry (row) {
  const out = {
    id: row.id,
    advisorId: row.advisor_id,
    firmId: row.firm_id,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
  COLUMNS.forEach(([js, sql, kind]) => {
    const v = row[sql]
    if (kind === 'bool') { out[js] = v === 1 || v === true } else if (kind === 'money') { out[js] = Number(v || 0) } else { out[js] = v === undefined ? null : v }
  })
  return out
}

/**
 * A caller-supplied value → what goes in the statement.
 * @param {string} kind - 'text' | 'bool' | 'money' | 'date'
 * @param {*} value
 * @param {string} js - the field name, for the text length cap
 * @returns {*}
 */
function toColumn (kind, value, js) {
  if (kind === 'bool') { return value ? 1 : 0 }
  if (kind === 'money') {
    const n = Number(value)
    // A non-finite value becomes 0 rather than NaN: NaN reaches MySQL as NULL on
    // a NOT NULL column and the whole insert fails on one bad field.
    return Number.isFinite(n) ? n.toFixed(2) : '0.00'
  }
  if (kind === 'date') {
    if (!value) { return null }
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }
  if (value === null || value === undefined || value === '') { return null }
  const limit = TEXT_LIMITS[js]
  const s = String(value)
  return limit ? s.slice(0, limit) : s
}

/**
 * The deals one advisor may see: their own at any visibility, plus their firm's
 * deals marked 'firm'. Most recently updated first.
 *
 * The 500 cap matches the source app's own `take: 500` and every other list in
 * this repo. A firm past 500 live deals needs paging, not a bigger number.
 *
 * @param {string} advisorId - from the verified JWT, never the request body
 * @param {string} firmId - from the verified JWT, never the request body
 * @returns {Promise<object[]>}
 */
async function listForAdvisor (advisorId, firmId) {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM va_sales_pipeline
        WHERE firm_id = ?
          AND (advisor_id = ? OR visibility = 'firm')
        ORDER BY updated_at DESC
        LIMIT 500`,
      [firmId, advisorId]
    )
    return rows.map(rowToEntry)
  } catch (err) {
    if (devFallbackEnabled(err)) { return _devList(advisorId, firmId) }
    throw err
  }
}

/**
 * ONE deal the caller may see: their own, or their firm's and shared.
 * `firm_id` is in the WHERE clause even though the id is a UUID — a guessed id
 * from another tenant must miss, not merely be unlikely.
 * @param {string} id
 * @param {string} advisorId - from the verified JWT
 * @param {string} firmId - from the verified JWT
 * @returns {Promise<object|null>}
 */
async function getById (id, advisorId, firmId) {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM va_sales_pipeline
        WHERE id = ? AND firm_id = ?
          AND (advisor_id = ? OR visibility = 'firm')
        LIMIT 1`,
      [id, firmId, advisorId]
    )
    return rows.length ? rowToEntry(rows[0]) : null
  } catch (err) {
    if (devFallbackEnabled(err)) { return _devGet(id, advisorId, firmId) }
    throw err
  }
}

/**
 * Insert a deal. Identity is the caller's verified identity — `advisorId` and
 * `firmId` are arguments, never read from the payload, which is what keeps a
 * crafted body from filing a deal into another firm.
 *
 * Visibility defaults to 'private': a new deal is the advisor's own until they
 * say otherwise.
 *
 * @param {object} input - { advisorId, firmId, visibility?, ...business fields }
 * @returns {Promise<object>} the stored deal
 */
async function create (input) {
  const id = generateId()
  const advisorId = String(input.advisorId || '').slice(0, 64)
  const firmId = String(input.firmId || '').slice(0, 64)
  if (!advisorId || !firmId) { throw new Error('advisorId and firmId are required') }

  const cols = ['id', 'advisor_id', 'firm_id', 'visibility']
  const vals = [id, advisorId, firmId, normaliseVisibility(input.visibility)]
  COLUMNS.forEach(([js, sql, kind]) => {
    cols.push(sql)
    vals.push(toColumn(kind, input[js], js))
  })

  try {
    await db.execute(
      `INSERT INTO va_sales_pipeline (${cols.map(c => '`' + c + '`').join(', ')})
        VALUES (${cols.map(() => '?').join(', ')})`,
      vals
    )
    const saved = await getById(id, advisorId, firmId)
    if (saved) { return saved }
    // A row that inserted but cannot be read back is not reported as saved.
    throw new Error('pipeline entry could not be read back after insert')
  } catch (err) {
    if (devFallbackEnabled(err)) { return _devCreate(id, advisorId, firmId, input) }
    throw err
  }
}

/**
 * Update a deal the caller OWNS. Every business column is updatable, unlike the
 * source app, whose PATCH accepts 16 of 34 (see COLUMNS).
 *
 * `AND advisor_id = ? AND firm_id = ?` is the access boundary: a deal shared to
 * the firm is READABLE by a colleague and still only EDITABLE by its owner.
 * Returns null when nothing matched, which the route reports as 404 — it never
 * distinguishes "no such deal" from "not yours", because that difference is
 * itself a disclosure.
 *
 * @param {string} id
 * @param {string} advisorId - from the verified JWT
 * @param {string} firmId - from the verified JWT
 * @param {object} patch - any subset of the business fields, plus `visibility`
 * @returns {Promise<object|null>} the updated deal, or null if not the caller's
 */
async function update (id, advisorId, firmId, patch) {
  const sets = []
  const vals = []
  COLUMNS.forEach(([js, sql, kind]) => {
    // `undefined` means "not supplied"; null is a real value that clears a field.
    if (Object.prototype.hasOwnProperty.call(patch, js) && patch[js] !== undefined) {
      sets.push('`' + sql + '` = ?')
      vals.push(toColumn(kind, patch[js], js))
    }
  })
  if (Object.prototype.hasOwnProperty.call(patch, 'visibility')) {
    sets.push('`visibility` = ?')
    vals.push(normaliseVisibility(patch.visibility))
  }
  if (!sets.length) { return getById(id, advisorId, firmId) }

  try {
    const [res] = await db.execute(
      `UPDATE va_sales_pipeline SET ${sets.join(', ')}
        WHERE id = ? AND advisor_id = ? AND firm_id = ?`,
      vals.concat([id, advisorId, firmId])
    )
    if (!res.affectedRows) { return null }
    return getById(id, advisorId, firmId)
  } catch (err) {
    if (devFallbackEnabled(err)) { return _devUpdate(id, advisorId, firmId, patch) }
    throw err
  }
}

/**
 * Delete a deal the caller OWNS. Same boundary as update.
 * @param {string} id
 * @param {string} advisorId - from the verified JWT
 * @param {string} firmId - from the verified JWT
 * @returns {Promise<boolean>} true if a row was deleted
 */
async function remove (id, advisorId, firmId) {
  try {
    const [res] = await db.execute(
      'DELETE FROM va_sales_pipeline WHERE id = ? AND advisor_id = ? AND firm_id = ?',
      [id, advisorId, firmId]
    )
    return res.affectedRows > 0
  } catch (err) {
    if (devFallbackEnabled(err)) { return _devRemove(id, advisorId, firmId) }
    throw err
  }
}

// ── DEV/TEST fallback ────────────────────────────────────────────────────────
// A flat array in one JSON file, holding the same shape the DB returns so the
// screens behave identically. NOT production persistence: no concurrency safety
// and no real access boundary beyond the filters below.

function _devReadAll () {
  try { return JSON.parse(fs.readFileSync(DEV_FILE, 'utf8')).entries || [] } catch (e) { return [] }
}

function _devWriteAll (entries) {
  fs.writeFileSync(DEV_FILE, JSON.stringify({ entries }, null, 2))
}

/** The same rule as the SQL: own at any visibility, or the firm's shared. */
function _devVisible (e, advisorId, firmId) {
  return e.firmId === firmId && (e.advisorId === advisorId || e.visibility === 'firm')
}

function _devList (advisorId, firmId) {
  return _devReadAll()
    .filter(e => _devVisible(e, advisorId, firmId))
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, 500)
}

function _devGet (id, advisorId, firmId) {
  return _devReadAll().find(e => e.id === id && _devVisible(e, advisorId, firmId)) || null
}

function _devCreate (id, advisorId, firmId, input) {
  const now = new Date().toISOString()
  const entry = {
    id,
    advisorId,
    firmId,
    visibility: normaliseVisibility(input.visibility),
    createdAt: now,
    updatedAt: now
  }
  COLUMNS.forEach(([js, , kind]) => {
    const v = toColumn(kind, input[js], js)
    entry[js] = kind === 'bool' ? !!v : (kind === 'money' ? Number(v) : (v instanceof Date ? v.toISOString() : v))
  })
  const all = _devReadAll()
  all.push(entry)
  _devWriteAll(all)
  return entry
}

function _devUpdate (id, advisorId, firmId, patch) {
  const all = _devReadAll()
  // Ownership, not visibility: a shared deal is editable only by its owner.
  const i = all.findIndex(e => e.id === id && e.advisorId === advisorId && e.firmId === firmId)
  if (i === -1) { return null }
  COLUMNS.forEach(([js, , kind]) => {
    if (Object.prototype.hasOwnProperty.call(patch, js) && patch[js] !== undefined) {
      const v = toColumn(kind, patch[js], js)
      all[i][js] = kind === 'bool' ? !!v : (kind === 'money' ? Number(v) : (v instanceof Date ? v.toISOString() : v))
    }
  })
  if (Object.prototype.hasOwnProperty.call(patch, 'visibility')) {
    all[i].visibility = normaliseVisibility(patch.visibility)
  }
  all[i].updatedAt = new Date().toISOString()
  _devWriteAll(all)
  return all[i]
}

function _devRemove (id, advisorId, firmId) {
  const all = _devReadAll()
  const i = all.findIndex(e => e.id === id && e.advisorId === advisorId && e.firmId === firmId)
  if (i === -1) { return false }
  all.splice(i, 1)
  _devWriteAll(all)
  return true
}

module.exports = {
  listForAdvisor,
  getById,
  create,
  update,
  remove,
  normaliseVisibility,
  rowToEntry,
  COLUMNS,
  VISIBILITIES
}
