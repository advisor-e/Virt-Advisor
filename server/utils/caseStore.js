'use strict'

/**
 * caseStore — persistence for advisor case studies (the `va_case_studies` table).
 *
 * Storage model (design memory `design-case-study-visibility-model`, confirmed
 * 2026-06-19):
 *   - Every case lives centrally so it follows the advisor across devices.
 *   - `visibility` is the whole privacy model: 'private' = the owning advisor
 *     only (on any device); 'shared' = the whole firm. An advisor may flip a
 *     case either way.
 *
 * Security:
 *   - Reads are scoped to the caller's verified identity — an advisor sees their
 *     own cases (any visibility) plus their firm's 'shared' cases, never another
 *     advisor's private case. (Closes the legacy localStorage IDOR.)
 *   - Mutations (review / visibility / delete) carry `AND advisor_id = ?`, so an
 *     advisor can only ever change a row they own.
 *
 * DEV/TEST-ONLY fallback: when MySQL is unavailable AND we are not in production,
 * a gitignored JSON file (data/dev-cases.json) stands in so the screens are
 * testable locally. This is NOT production persistence (no concurrency safety,
 * no real access boundary) — the same convention as firmManager's _devRead/Write.
 * In production a DB failure propagates so an outage is never silently masked.
 */

const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const db = require('./db')

const DEV_CASES_FILE = path.resolve(__dirname, '../../data/dev-cases.json')

/**
 * Whether the DEV/TEST-ONLY JSON fallback may stand in for an unavailable DB.
 * Read at call-time (not cached) so it always reflects the real environment —
 * in production a DB failure must propagate, never be masked by the fallback.
 * @returns {boolean}
 */
function devFallbackEnabled () {
  return process.env.NODE_ENV !== 'production'
}

const VISIBILITIES = ['private', 'shared']

/**
 * Node-14.15-safe UUID v4. `crypto.randomUUID` only exists from Node 14.17, and
 * the locked runtime is 14.15 — so build the v4 string from random bytes.
 * @returns {string}
 */
function generateId () {
  const b = crypto.randomBytes(16)
  b[6] = (b[6] & 0x0F) | 0x40 // version 4
  b[8] = (b[8] & 0x3F) | 0x80 // variant 10xx
  const h = b.toString('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/** Normalise a requested visibility to a safe enum value (fail-safe to private). */
function safeVisibility (value) {
  return VISIBILITIES.includes(value) ? value : 'private'
}

// ── Shape mapping ─────────────────────────────────────────────────────────────

/**
 * Map a DB row (snake_case, flat review columns, JSON text) to the case shape the
 * frontend uses (camelCase, nested `review`, parsed arrays).
 */
function rowToCase (row) {
  return {
    id: row.id,
    advisorId: row.advisor_id,
    firmId: row.firm_id,
    title: row.title,
    mode: row.mode,
    visibility: row.visibility,
    domain: row.domain || null,
    staircaseStep: row.staircase_step || null,
    growthStage: row.growth_stage || null,
    finMgtTheme: row.fin_mgt_theme || null,
    templates: parseJSON(row.templates, []),
    summary: row.summary || '',
    transcript: parseJSON(row.transcript, []),
    feedbackPending: row.feedback_pending === 1 || row.feedback_pending === true,
    review: (row.review_went_well || row.review_went_less || row.review_changes_recommended || row.reviewed_at)
      ? {
          wentWell: row.review_went_well || '',
          wentLess: row.review_went_less || '',
          changesRecommended: row.review_changes_recommended || '',
          reviewedAt: row.reviewed_at || null
        }
      : null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  }
}

/** mysql2 returns JSON columns already parsed; tolerate strings too. */
function parseJSON (value, fallback) {
  if (value === null || value === undefined) { return fallback }
  if (typeof value !== 'string') { return value }
  try { return JSON.parse(value) } catch (e) { return fallback }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * List the cases visible to one advisor: their own (any visibility) plus their
 * firm's shared cases. Most recent first.
 * @param {string} advisorId - from the verified JWT
 * @param {string} firmId - from the verified JWT
 * @returns {Promise<object[]>}
 */
async function listForAdvisor (advisorId, firmId) {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM va_case_studies
        WHERE advisor_id = ? OR (firm_id = ? AND visibility = 'shared')
        ORDER BY created_at DESC
        LIMIT 500`,
      [advisorId, firmId]
    )
    return rows.map(rowToCase)
  } catch (err) {
    if (devFallbackEnabled()) { return _devList(advisorId, firmId) }
    throw err
  }
}

/**
 * Insert a new case. Identity (advisorId/firmId) is the caller's verified
 * identity — never trusted from the request body.
 * @param {object} input
 * @returns {Promise<object>} the stored case
 */
async function create (input) {
  const row = {
    id: (typeof input.id === 'string' && input.id) ? input.id.slice(0, 64) : generateId(),
    advisor_id: String(input.advisorId).slice(0, 64),
    firm_id: String(input.firmId).slice(0, 64),
    title: String(input.title || 'Untitled case').slice(0, 255),
    mode: String(input.mode || 'client').slice(0, 32),
    visibility: safeVisibility(input.visibility),
    domain: input.domain ? String(input.domain).slice(0, 128) : null,
    staircase_step: input.staircaseStep ? String(input.staircaseStep).slice(0, 128) : null,
    growth_stage: input.growthStage ? String(input.growthStage).slice(0, 64) : null,
    fin_mgt_theme: input.finMgtTheme ? String(input.finMgtTheme).slice(0, 128) : null,
    templates: Array.isArray(input.templates) ? input.templates : [],
    summary: input.summary ? String(input.summary).slice(0, 4000) : null,
    transcript: Array.isArray(input.transcript) ? input.transcript : [],
    feedback_pending: input.feedbackPending === false ? 0 : 1
  }

  try {
    await db.execute(
      `INSERT INTO va_case_studies
         (id, advisor_id, firm_id, title, mode, visibility, domain,
          staircase_step, growth_stage, fin_mgt_theme, templates, summary,
          transcript, feedback_pending)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.id, row.advisor_id, row.firm_id, row.title, row.mode, row.visibility,
        row.domain, row.staircase_step, row.growth_stage, row.fin_mgt_theme,
        row.templates.length ? JSON.stringify(row.templates) : null,
        row.summary,
        row.transcript.length ? JSON.stringify(row.transcript) : null,
        row.feedback_pending
      ]
    )
    return rowToCase({ ...row, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
  } catch (err) {
    if (devFallbackEnabled()) { return _devCreate(row) }
    throw err
  }
}

/**
 * Update the post-delivery review on a case the advisor owns.
 * @returns {Promise<boolean>} true if a row the advisor owns was updated
 */
async function updateReview (id, advisorId, review) {
  const wentWell = review && review.wentWell ? String(review.wentWell).slice(0, 5000) : null
  const wentLess = review && review.wentLess ? String(review.wentLess).slice(0, 5000) : null
  const changes = review && review.changesRecommended ? String(review.changesRecommended).slice(0, 5000) : null

  try {
    const [result] = await db.execute(
      `UPDATE va_case_studies
          SET review_went_well = ?, review_went_less = ?,
              review_changes_recommended = ?, reviewed_at = NOW(),
              feedback_pending = 0
        WHERE id = ? AND advisor_id = ?`,
      [wentWell, wentLess, changes, id, advisorId]
    )
    return result.affectedRows > 0
  } catch (err) {
    if (devFallbackEnabled()) { return _devUpdate(id, advisorId, (c) => { c.review = { wentWell: wentWell || '', wentLess: wentLess || '', changesRecommended: changes || '', reviewedAt: new Date().toISOString() }; c.feedbackPending = false }) }
    throw err
  }
}

/**
 * Flip a case's visibility (private <-> shared) — owner only.
 * @returns {Promise<boolean>} true if a row the advisor owns was updated
 */
async function updateVisibility (id, advisorId, visibility) {
  const value = safeVisibility(visibility)
  try {
    const [result] = await db.execute(
      'UPDATE va_case_studies SET visibility = ? WHERE id = ? AND advisor_id = ?',
      [value, id, advisorId]
    )
    return result.affectedRows > 0
  } catch (err) {
    if (devFallbackEnabled()) { return _devUpdate(id, advisorId, (c) => { c.visibility = value }) }
    throw err
  }
}

/**
 * Delete a case the advisor owns.
 * @returns {Promise<boolean>} true if a row the advisor owns was deleted
 */
async function remove (id, advisorId) {
  try {
    const [result] = await db.execute(
      'DELETE FROM va_case_studies WHERE id = ? AND advisor_id = ?',
      [id, advisorId]
    )
    return result.affectedRows > 0
  } catch (err) {
    if (devFallbackEnabled()) { return _devRemove(id, advisorId) }
    throw err
  }
}

// ── DEV/TEST-ONLY JSON fallback (gitignored data/dev-cases.json) ──────────────
// Only reached when the DB is unavailable AND devFallbackEnabled(). Stores the camelCase case
// shape directly. Not production-safe (no locking, no real access control).

function _devReadAll () {
  try { return JSON.parse(fs.readFileSync(DEV_CASES_FILE, 'utf8')) } catch (e) { return [] }
}

function _devWriteAll (all) {
  fs.writeFileSync(DEV_CASES_FILE, JSON.stringify(all, null, 2))
}

function _devList (advisorId, firmId) {
  return _devReadAll()
    .filter(c => c.advisorId === advisorId || (c.firmId === firmId && c.visibility === 'shared'))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
}

function _devCreate (row) {
  const all = _devReadAll()
  const now = new Date().toISOString()
  const entry = {
    ...rowToCase({ ...row, created_at: now, updated_at: now }),
    templates: row.templates,
    transcript: row.transcript
  }
  all.unshift(entry)
  _devWriteAll(all)
  return entry
}

/** Apply `mutate` to the owned case, return whether one was found. */
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
  create,
  updateReview,
  updateVisibility,
  remove,
  // exported for tests
  generateId,
  safeVisibility,
  VISIBILITIES
}
