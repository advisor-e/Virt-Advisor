'use strict'

/**
 * salesCoiStore — an advisor's centres of influence (MySQL `va_sales_coi`).
 *
 * Item 17 stage 3. A COI is a referral partner: someone who sends the advisor
 * work. The row records who they are, how the advisor rates the relationship,
 * and what it has actually produced.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE ACCESS MODEL IS THE PIPELINE'S, DELIBERATELY
 * ─────────────────────────────────────────────────────────────────────────────
 * The source app carries the same comment here as on the pipeline —
 * *"COIs are shared across the firm - no userId filter"* — and it is wrong here
 * for the same two reasons (multi-tenancy, and Mike's ruling of 2026-09-21 that
 * this is the advisor's own tool). See `salesPipelineStore.js` for the full note;
 * it is not repeated, because one fact has one home.
 *
 *   - Reads: the caller's OWN rows at any visibility, plus their firm's rows
 *     marked 'firm'.
 *   - Writes: `AND advisor_id = ? AND firm_id = ?`, so a shared row is readable
 *     by a colleague and editable only by its owner.
 *
 * ⚠ A COI IS MORE LIKELY TO BE SHARED THAN A DEAL, and the default is still
 * 'private'. A referral partner is often known firm-wide, so an advisor may well
 * switch it — but that is their choice to make, not a default to assume. The
 * fail-safe direction does not change with how likely the other answer is.
 */

const path = require('path')
const fs = require('fs')
const db = require('./db')
const { generateId } = require('./caseStore')
const { devFallbackAllowed } = require('./dbFailure')

const DEV_FILE = process.env.SALES_COI_DEV_FILE
  ? path.resolve(process.env.SALES_COI_DEV_FILE)
  : path.resolve(__dirname, '../../data/dev-sales-coi.json')

function devFallbackEnabled (err) {
  return devFallbackAllowed(err)
}

const VISIBILITIES = ['private', 'firm']

/** Fail-safe to 'private': an unrecognised value must never widen access. */
function normaliseVisibility (v) {
  return !VISIBILITIES.includes(v) ? 'private' : v
}

/**
 * Every business column, as [jsName, sqlName, kind] — one list driving the row
 * mapper, the insert and the update, for the same reason the pipeline has one:
 * three hand-maintained copies is three chances to drop a field.
 *
 *   text   — string or null
 *   score  — INT, the advisor's own rating of the relationship
 *   count  — INT, something that actually happened
 *   money  — DECIMAL(14,2); MySQL returns a STRING, converted on the way out
 */
const COLUMNS = [
  ['coiName', 'coi_name', 'text'],
  ['email', 'email', 'text'],
  ['cell', 'cell', 'text'],
  ['entity', 'entity', 'text'],
  ['position', 'position', 'text'],
  ['industry', 'industry', 'text'],
  ['other', 'other', 'text'],
  ['leadRelationshipPartner', 'lead_relationship_partner', 'text'],
  ['relationshipSupport', 'relationship_support', 'text'],
  ['couldWe', 'could_we', 'score'],
  ['howWouldWe', 'how_would_we', 'score'],
  ['willWe', 'will_we', 'score'],
  ['testReview', 'test_review', 'score'],
  ['totalReferrals', 'total_referrals', 'count'],
  ['totalConverted', 'total_converted', 'count'],
  ['feeValue', 'fee_value', 'money']
]

const TEXT_LIMITS = {
  coiName: 255,
  email: 255,
  cell: 80,
  entity: 255,
  position: 255,
  industry: 120,
  other: 255,
  leadRelationshipPartner: 255,
  relationshipSupport: 255
}

/** A DB row → the shape the screen reads. */
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
    if (kind === 'money') {
      out[js] = Number(v || 0)
    } else if (kind === 'score' || kind === 'count') {
      out[js] = Number(v || 0)
    } else {
      out[js] = v === undefined ? null : v
    }
  })
  return out
}

/** A caller-supplied value → what goes in the statement. */
function toColumn (kind, value, js) {
  if (kind === 'money') {
    const n = Number(value)
    return Number.isFinite(n) ? n.toFixed(2) : '0.00'
  }
  if (kind === 'score' || kind === 'count') {
    const n = Number(value)
    // Non-finite becomes 0 rather than NaN: NaN reaches MySQL as NULL on a NOT
    // NULL column and fails the whole insert on one bad field.
    return Number.isFinite(n) ? Math.round(n) : 0
  }
  if (value === null || value === undefined || value === '') { return null }
  const limit = TEXT_LIMITS[js]
  const s = String(value)
  return limit ? s.slice(0, limit) : s
}

/**
 * The COIs one advisor may see: their own at any visibility, plus their firm's
 * shared ones. Most recently updated first.
 * @param {string} advisorId - from the verified JWT, never the request body
 * @param {string} firmId - from the verified JWT, never the request body
 * @returns {Promise<object[]>}
 */
async function listForAdvisor (advisorId, firmId) {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM va_sales_coi
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
 * ONE COI the caller may see. `firm_id` is in the WHERE clause even though the id
 * is a UUID — a guessed id from another tenant must miss, not merely be unlikely.
 * @param {string} id
 * @param {string} advisorId - from the verified JWT
 * @param {string} firmId - from the verified JWT
 * @returns {Promise<object|null>}
 */
async function getById (id, advisorId, firmId) {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM va_sales_coi
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
 * Insert a COI. Identity is the caller's verified identity — `advisorId` and
 * `firmId` are arguments, never read from the payload.
 * @param {object} input - { advisorId, firmId, visibility?, ...business fields }
 * @returns {Promise<object>} the stored COI
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
      `INSERT INTO va_sales_coi (${cols.map(c => '`' + c + '`').join(', ')})
        VALUES (${cols.map(() => '?').join(', ')})`,
      vals
    )
    const saved = await getById(id, advisorId, firmId)
    if (saved) { return saved }
    throw new Error('COI entry could not be read back after insert')
  } catch (err) {
    if (devFallbackEnabled(err)) { return _devCreate(id, advisorId, firmId, input) }
    throw err
  }
}

/**
 * Update a COI the caller OWNS. A row shared to the firm is READABLE by a
 * colleague and still EDITABLE only by its owner. Returns null when nothing
 * matched, which the route reports as 404 — it never distinguishes "no such row"
 * from "not yours", because that difference is itself a disclosure.
 * @param {string} id
 * @param {string} advisorId - from the verified JWT
 * @param {string} firmId - from the verified JWT
 * @param {object} patch - any subset of the business fields, plus `visibility`
 * @returns {Promise<object|null>}
 */
async function update (id, advisorId, firmId, patch) {
  const sets = []
  const vals = []
  COLUMNS.forEach(([js, sql, kind]) => {
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
      `UPDATE va_sales_coi SET ${sets.join(', ')}
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
 * Delete a COI the caller OWNS. Same boundary as update.
 * @param {string} id
 * @param {string} advisorId - from the verified JWT
 * @param {string} firmId - from the verified JWT
 * @returns {Promise<boolean>} true if a row was deleted
 */
async function remove (id, advisorId, firmId) {
  try {
    const [res] = await db.execute(
      'DELETE FROM va_sales_coi WHERE id = ? AND advisor_id = ? AND firm_id = ?',
      [id, advisorId, firmId]
    )
    return res.affectedRows > 0
  } catch (err) {
    if (devFallbackEnabled(err)) { return _devRemove(id, advisorId, firmId) }
    throw err
  }
}

// ── DEV/TEST fallback ────────────────────────────────────────────────────────

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
    entry[js] = kind === 'money' ? Number(v) : v
  })
  const all = _devReadAll()
  all.push(entry)
  _devWriteAll(all)
  return entry
}

function _devUpdate (id, advisorId, firmId, patch) {
  const all = _devReadAll()
  // Ownership, not visibility: a shared row is editable only by its owner.
  const i = all.findIndex(e => e.id === id && e.advisorId === advisorId && e.firmId === firmId)
  if (i === -1) { return null }
  COLUMNS.forEach(([js, , kind]) => {
    if (Object.prototype.hasOwnProperty.call(patch, js) && patch[js] !== undefined) {
      const v = toColumn(kind, patch[js], js)
      all[i][js] = kind === 'money' ? Number(v) : v
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
