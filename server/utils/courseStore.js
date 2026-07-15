'use strict'

/**
 * courseStore — persistence for Course Builder courses (the `va_courses` table).
 * CB-16/17, design/COURSE-BUILDER-PLAN.md — mirrors caseStore's storage model.
 *
 * Storage model:
 *   - Every course lives centrally so it follows the advisor across devices and
 *     can feed firm reporting.
 *   - `visibility`: 'private' (owner only — default and fail-safe) or 'firm'
 *     (reserved for firm-wide sharing). The value is stored from day one, but
 *     NO firm-scoped read exists yet — the UI keeps the option disabled
 *     ("Coming soon", Mike's CB-07 ruling 2026-07-15), and every read in this
 *     module is owner-scoped. The firm read ships with the sharing feature.
 *
 * Security:
 *   - All reads and mutations carry `advisor_id = ?` from the caller's verified
 *     JWT — an advisor can only ever see or change their own courses.
 *
 * DEV/TEST-ONLY fallback: when MySQL is unavailable AND we are not in
 * production, a gitignored JSON file (data/dev-courses.json) stands in so the
 * screens are testable locally — the caseStore convention. In production a DB
 * failure propagates so an outage is never silently masked.
 */

const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const db = require('./db')

// Default dev fallback file; overridable via COURSE_DEV_FILE so tests can point
// at an isolated temp file (hermetic `npm test`, immune to a live backend
// writing the shared file). Production never sets this — it uses MySQL.
const DEV_COURSES_FILE = process.env.COURSE_DEV_FILE
  ? path.resolve(process.env.COURSE_DEV_FILE)
  : path.resolve(__dirname, '../../data/dev-courses.json')

/**
 * Whether the DEV/TEST-ONLY JSON fallback may stand in for an unavailable DB.
 * Read at call-time so a production DB failure always propagates.
 * @returns {boolean}
 */
function devFallbackEnabled () {
  return process.env.NODE_ENV !== 'production'
}

const STATUSES = ['active', 'paused', 'complete']
const VISIBILITIES = ['private', 'firm']

/**
 * Node-14.15-safe UUID v4 (`crypto.randomUUID` needs 14.17+; the locked
 * runtime is 14.15). Same implementation as caseStore.generateId — consolidate
 * into a shared util in the cleanup pass, not mid-feature.
 * @returns {string}
 */
function generateId () {
  const b = crypto.randomBytes(16)
  b[6] = (b[6] & 0x0F) | 0x40 // version 4
  b[8] = (b[8] & 0x3F) | 0x80 // variant 10xx
  const h = b.toString('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/** Normalise a requested status to a safe enum value (fail-safe to active). */
function safeStatus (value) {
  return STATUSES.includes(value) ? value : 'active'
}

/** Normalise a requested visibility to a safe enum value (fail-safe to private). */
function safeVisibility (value) {
  return VISIBILITIES.includes(value) ? value : 'private'
}

/**
 * Sanitise a per-session progress array: plain objects only, capped at 100
 * sessions, per-session notes capped so one field can't balloon the row.
 * Anything else stores as an empty array — progress is always an array.
 * @param {*} raw
 * @returns {Array<object>}
 */
function sanitiseProgress (raw) {
  if (!Array.isArray(raw)) { return [] }
  return raw
    .filter(p => p && typeof p === 'object' && !Array.isArray(p))
    .slice(0, 100)
    .map(p => ({
      ...p,
      notes: (typeof p.notes === 'string') ? p.notes.slice(0, 20000) : p.notes || null
    }))
}

/**
 * Sanitise the design conversation: role/content pairs only, last 200 turns,
 * content capped per message. Null when there is nothing to keep.
 * @param {*} raw
 * @returns {Array<{role: string, content: string}>|null}
 */
function sanitiseDesignHistory (raw) {
  if (!Array.isArray(raw)) { return null }
  const kept = raw
    .filter(m => m && typeof m === 'object' && typeof m.content === 'string')
    .slice(-200)
    .map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content.slice(0, 8000)
    }))
  return kept.length ? kept : null
}

// ── Shape mapping ─────────────────────────────────────────────────────────────

/** mysql2 returns JSON columns already parsed; tolerate strings too. */
function parseJSON (value, fallback) {
  if (value === null || value === undefined) { return fallback }
  if (typeof value !== 'string') { return value }
  try { return JSON.parse(value) } catch (e) { return fallback }
}

/** Map a DB row (snake_case, JSON text) to the course shape the frontend uses. */
function rowToCourse (row) {
  return {
    id: row.id,
    advisorId: row.advisor_id,
    firmId: row.firm_id,
    status: row.status,
    visibility: row.visibility,
    outline: parseJSON(row.outline, null),
    progress: parseJSON(row.progress, []),
    designHistory: parseJSON(row.design_history, null),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * List the calling advisor's OWN courses, most recently touched first.
 * (Deliberately no firm-shared read yet — see the module note.)
 * @param {string} advisorId - from the verified JWT
 * @returns {Promise<object[]>}
 */
async function listForAdvisor (advisorId) {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM va_courses
        WHERE advisor_id = ?
        ORDER BY updated_at DESC
        LIMIT 200`,
      [advisorId]
    )
    return rows.map(rowToCourse)
  } catch (err) {
    if (devFallbackEnabled()) { return _devList(advisorId) }
    throw err
  }
}

/**
 * Fetch ONE course the caller owns. Returns null when missing or not theirs.
 * @param {string} id
 * @param {string} advisorId - from the verified JWT
 * @returns {Promise<object|null>}
 */
async function getOwn (id, advisorId) {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM va_courses WHERE id = ? AND advisor_id = ? LIMIT 1',
      [id, advisorId]
    )
    return rows.length ? rowToCourse(rows[0]) : null
  } catch (err) {
    if (devFallbackEnabled()) { return _devGet(id, advisorId) }
    throw err
  }
}

/**
 * Insert a new course. Identity (advisorId/firmId) is the caller's verified
 * identity — never trusted from the request body. `id` is preserved when
 * supplied (the localStorage migration keeps existing ids) else generated.
 * @param {object} input - { id?, advisorId, firmId, status?, visibility?, outline, progress?, designHistory? }
 * @returns {Promise<object>} the stored course
 */
async function create (input) {
  if (!input.outline || typeof input.outline !== 'object' || Array.isArray(input.outline)) {
    throw new TypeError('outline (object) is required')
  }
  const row = {
    id: (typeof input.id === 'string' && input.id) ? input.id.slice(0, 64) : generateId(),
    advisor_id: String(input.advisorId).slice(0, 64),
    firm_id: String(input.firmId).slice(0, 64),
    status: safeStatus(input.status),
    visibility: safeVisibility(input.visibility),
    outline: input.outline,
    progress: sanitiseProgress(input.progress),
    design_history: sanitiseDesignHistory(input.designHistory)
  }

  try {
    await db.execute(
      `INSERT INTO va_courses
         (id, advisor_id, firm_id, status, visibility, outline, progress, design_history)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.id, row.advisor_id, row.firm_id, row.status, row.visibility,
        JSON.stringify(row.outline),
        row.progress.length ? JSON.stringify(row.progress) : null,
        row.design_history ? JSON.stringify(row.design_history) : null
      ]
    )
    const now = new Date().toISOString()
    return rowToCourse({ ...row, created_at: now, updated_at: now })
  } catch (err) {
    if (devFallbackEnabled()) { return _devCreate(row) }
    throw err
  }
}

// Columns a whole-document update may touch — anything else in the patch is
// ignored (identity and timestamps are never client-writable).
const UPDATABLE = ['status', 'visibility', 'outline', 'progress']

/**
 * Update a course the advisor owns. Whole-document semantics per field: any of
 * status / visibility / outline / progress present in the patch replaces the
 * stored value (the screen saves the full course object, caseStore-style).
 * @param {string} id
 * @param {string} advisorId - from the verified JWT
 * @param {object} patch
 * @returns {Promise<boolean>} true if a row the advisor owns was updated
 */
async function updateOwn (id, advisorId, patch) {
  const fields = []
  const values = []
  for (const key of UPDATABLE) {
    if (patch === null || patch === undefined || !(key in patch)) { continue }
    if (key === 'status') { fields.push('status = ?'); values.push(safeStatus(patch.status)) }
    if (key === 'visibility') { fields.push('visibility = ?'); values.push(safeVisibility(patch.visibility)) }
    if (key === 'outline') {
      if (!patch.outline || typeof patch.outline !== 'object' || Array.isArray(patch.outline)) { continue }
      fields.push('outline = ?'); values.push(JSON.stringify(patch.outline))
    }
    if (key === 'progress') {
      const progress = sanitiseProgress(patch.progress)
      fields.push('progress = ?'); values.push(progress.length ? JSON.stringify(progress) : null)
    }
  }
  if (fields.length === 0) { return false }

  try {
    const [result] = await db.execute(
      `UPDATE va_courses SET ${fields.join(', ')} WHERE id = ? AND advisor_id = ?`,
      [...values, id, advisorId]
    )
    return result.affectedRows > 0
  } catch (err) {
    if (devFallbackEnabled()) {
      return _devUpdate(id, advisorId, (c) => {
        if ('status' in patch) { c.status = safeStatus(patch.status) }
        if ('visibility' in patch) { c.visibility = safeVisibility(patch.visibility) }
        if ('outline' in patch && patch.outline && typeof patch.outline === 'object' && !Array.isArray(patch.outline)) { c.outline = patch.outline }
        if ('progress' in patch) { c.progress = sanitiseProgress(patch.progress) }
      })
    }
    throw err
  }
}

/**
 * Delete a course the advisor owns.
 * @returns {Promise<boolean>} true if a row the advisor owns was deleted
 */
async function remove (id, advisorId) {
  try {
    const [result] = await db.execute(
      'DELETE FROM va_courses WHERE id = ? AND advisor_id = ?',
      [id, advisorId]
    )
    return result.affectedRows > 0
  } catch (err) {
    if (devFallbackEnabled()) { return _devRemove(id, advisorId) }
    throw err
  }
}

// ── DEV/TEST-ONLY JSON fallback (gitignored data/dev-courses.json) ────────────
// Only reached when the DB is unavailable AND devFallbackEnabled(). Stores the
// camelCase course shape directly. Not production-safe.

function _devReadAll () {
  try { return JSON.parse(fs.readFileSync(DEV_COURSES_FILE, 'utf8')) } catch (e) { return [] }
}

function _devWriteAll (all) {
  fs.writeFileSync(DEV_COURSES_FILE, JSON.stringify(all, null, 2))
}

function _devList (advisorId) {
  return _devReadAll()
    .filter(c => c.advisorId === advisorId)
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
}

function _devGet (id, advisorId) {
  return _devReadAll().find(c => c.id === id && c.advisorId === advisorId) || null
}

function _devCreate (row) {
  const all = _devReadAll()
  // Mirror the DB primary-key constraint so a migration re-run can never duplicate.
  if (all.some(c => c.id === row.id)) {
    throw new Error(`duplicate course id: ${row.id}`)
  }
  const now = new Date().toISOString()
  const entry = {
    id: row.id,
    advisorId: row.advisor_id,
    firmId: row.firm_id,
    status: row.status,
    visibility: row.visibility,
    outline: row.outline,
    progress: row.progress,
    designHistory: row.design_history,
    createdAt: now,
    updatedAt: now
  }
  all.unshift(entry)
  _devWriteAll(all)
  return entry
}

/** Apply `mutate` to the owned course, return whether one was found. */
function _devUpdate (id, advisorId, mutate) {
  const all = _devReadAll()
  const c = all.find(x => x.id === id && x.advisorId === advisorId)
  if (!c) { return false }
  mutate(c)
  c.updatedAt = new Date().toISOString()
  _devWriteAll(all)
  return true
}

function _devRemove (id, advisorId) {
  const all = _devReadAll()
  const next = all.filter(x => !(x.id === id && x.advisorId === advisorId))
  if (next.length === all.length) { return false }
  _devWriteAll(next)
  return true
}

module.exports = {
  listForAdvisor,
  getOwn,
  create,
  updateOwn,
  remove,
  // exported for tests
  generateId,
  safeStatus,
  safeVisibility,
  sanitiseProgress,
  sanitiseDesignHistory,
  STATUSES,
  VISIBILITIES
}
