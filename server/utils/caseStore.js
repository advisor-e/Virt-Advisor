'use strict'

/**
 * caseStore — persistence for advisor case studies (the `va_case_studies` table).
 *
 * Storage model (design memory `design-case-study-visibility-model`, confirmed
 * 2026-06-19):
 *   - Every case lives centrally so it follows the advisor across devices.
 *   - `visibility` is the advisor's privacy model: 'private' = the owning
 *     advisor only (on any device); 'shared' = the whole firm. An advisor may
 *     flip a case either way.
 *   - `mentorShared` is a SEPARATE axis owned by the firm MANAGER (not the
 *     advisor): a per-case, double-opt-in flag that surfaces a firm-`shared`
 *     case to the mentor for app-accuracy review. The mentor only ever sees the
 *     anonymised copy written on the manager's approval — never the raw text.
 *     The share/withdraw mutations and the mentor read live in their own
 *     functions (added with parts 3-4); this mapping only carries the flag +
 *     audit stamp so manager screens can show share state.
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

// Default dev fallback file; overridable via CASE_DEV_FILE so tests can point at an
// isolated temp file (keeps a clean `npm test` independent of the shared dev file and
// of any live backend writing to it). Production never sets this — it uses MySQL.
const DEV_CASES_FILE = process.env.CASE_DEV_FILE
  ? path.resolve(process.env.CASE_DEV_FILE)
  : path.resolve(__dirname, '../../data/dev-cases.json')

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
    // Client-knowledge-base link (design 2026-07-14). NULL for cases saved
    // before the feature or where the advisor skipped naming the client.
    clientId: row.client_id || null,
    title: row.title,
    mode: row.mode,
    visibility: row.visibility,
    // Manager-owned mentor-share axis (separate from `visibility`). The
    // anonymised copies are deliberately NOT mapped here — they surface only via
    // the mentor read (part 4), never in advisor/manager case lists.
    mentorShared: row.mentor_shared === 1 || row.mentor_shared === true,
    mentorSharedBy: row.mentor_shared_by || null,
    mentorSharedAt: row.mentor_shared_at || null,
    domain: row.domain || null,
    staircaseStep: row.staircase_step || null,
    growthStage: row.growth_stage || null,
    finMgtTheme: row.fin_mgt_theme || null,
    templates: parseJSON(row.templates, []),
    summary: row.summary || '',
    transcript: parseJSON(row.transcript, []),
    decisionTrace: parseJSON(row.decision_trace, null),
    // Per-template outcomes recorded at review time (2026-07-14); null for
    // pre-feature reviews — consumers fall back to the case-level review.
    templateOutcomes: parseJSON(row.template_outcomes, null),
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
 * The cases that inform ONE client's knowledge base, for the calling advisor
 * (design 2026-07-14). The access boundary is IDENTICAL to listForAdvisor: the
 * advisor's own cases (any visibility) plus the firm's shared ones — sharing a
 * case is what contributes it to a colleague's knowledge of the client. No new
 * permission model; a client_id belonging to another firm returns nothing.
 * @param {string} advisorId - from the verified JWT, never the request body
 * @param {string} firmId - from the verified JWT
 * @param {string} clientId - va_clients id (validate firm ownership via clientStore.getById first)
 * @returns {Promise<object[]>} newest first, capped at 50
 */
async function listForClient (advisorId, firmId, clientId) {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM va_case_studies
        WHERE client_id = ?
          AND (advisor_id = ? OR (firm_id = ? AND visibility = 'shared'))
        ORDER BY created_at DESC
        LIMIT 50`,
      [clientId, advisorId, firmId]
    )
    return rows.map(rowToCase)
  } catch (err) {
    if (devFallbackEnabled()) { return _devListForClient(advisorId, firmId, clientId) }
    throw err
  }
}

/**
 * List a firm's SHARED case studies across all its advisors, most recent first.
 * For the firm-manager review area. Managers see shared cases only — a private
 * case stays invisible to them (the visibility model is the access boundary), so
 * the review queue is opt-in: an advisor shares the cases they want reviewed.
 * @param {string} firmId - from the verified JWT
 * @returns {Promise<object[]>}
 */
async function listSharedForFirm (firmId) {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM va_case_studies
        WHERE firm_id = ? AND visibility = 'shared'
        ORDER BY created_at DESC
        LIMIT 500`,
      [firmId]
    )
    return rows.map(rowToCase)
  } catch (err) {
    if (devFallbackEnabled()) { return _devListSharedForFirm(firmId) }
    throw err
  }
}

/**
 * Fetch ONE firm-`shared` case by id, scoped to the caller's firm. Used by the
 * manager-gated mentor-share flow: a manager may only act on a case that is both
 * their firm's and already shared (the visibility model is the access boundary).
 * Returns the full case shape (including raw summary/transcript, read
 * server-side only) or null if it does not exist / is not shared / is another
 * firm's.
 * @param {string} id
 * @param {string} firmId - from the verified JWT
 * @returns {Promise<object|null>}
 */
async function getSharedForFirm (id, firmId) {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM va_case_studies
        WHERE id = ? AND firm_id = ? AND visibility = 'shared'
        LIMIT 1`,
      [id, firmId]
    )
    return rows.length ? rowToCase(rows[0]) : null
  } catch (err) {
    if (devFallbackEnabled()) { return _devGetSharedForFirm(id, firmId) }
    throw err
  }
}

/**
 * Map a row to the MENTOR's view shape — deliberately narrow: the ANONYMISED
 * summary/transcript (never the raw), the engine-behaviour fields (decision
 * trace, templates, review) and the firm id, but NO advisor identity and no raw
 * client text. This is the only read that crosses the firm boundary.
 */
function rowToMentorCase (row) {
  return {
    id: row.id,
    firmId: row.firm_id,
    title: row.title,
    mode: row.mode,
    domain: row.domain || null,
    staircaseStep: row.staircase_step || null,
    growthStage: row.growth_stage || null,
    finMgtTheme: row.fin_mgt_theme || null,
    templates: parseJSON(row.templates, []),
    decisionTrace: parseJSON(row.decision_trace, null),
    review: (row.review_went_well || row.review_went_less || row.review_changes_recommended)
      ? {
          wentWell: row.review_went_well || '',
          wentLess: row.review_went_less || '',
          changesRecommended: row.review_changes_recommended || ''
        }
      : null,
    summary: row.mentor_anon_summary || '',
    transcript: parseJSON(row.mentor_anon_transcript, []),
    mentorSharedAt: row.mentor_shared_at || null,
    createdAt: row.created_at || null
  }
}

/**
 * List every case shared with the mentor, across ALL firms (the cross-firm
 * mentor review feed). Returns the anonymised, advisor-stripped shape only.
 * Role-gated to the mentor at the route — this function trusts that gate.
 * @returns {Promise<object[]>}
 */
async function listSharedWithMentor () {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM va_case_studies
        WHERE mentor_shared = 1
        ORDER BY mentor_shared_at DESC, created_at DESC
        LIMIT 500`
    )
    return rows.map(rowToMentorCase)
  } catch (err) {
    if (devFallbackEnabled()) { return _devListSharedWithMentor() }
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
    client_id: (typeof input.clientId === 'string' && input.clientId) ? input.clientId.slice(0, 64) : null,
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
    decision_trace: input.decisionTrace && typeof input.decisionTrace === 'object' ? input.decisionTrace : null,
    feedback_pending: input.feedbackPending === false ? 0 : 1
  }

  try {
    await db.execute(
      `INSERT INTO va_case_studies
         (id, advisor_id, firm_id, client_id, title, mode, visibility, domain,
          staircase_step, growth_stage, fin_mgt_theme, templates, summary,
          transcript, decision_trace, feedback_pending)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.id, row.advisor_id, row.firm_id, row.client_id, row.title, row.mode, row.visibility,
        row.domain, row.staircase_step, row.growth_stage, row.fin_mgt_theme,
        row.templates.length ? JSON.stringify(row.templates) : null,
        row.summary,
        row.transcript.length ? JSON.stringify(row.transcript) : null,
        row.decision_trace ? JSON.stringify(row.decision_trace) : null,
        row.feedback_pending
      ]
    )
    return rowToCase({ ...row, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
  } catch (err) {
    if (devFallbackEnabled()) { return _devCreate(row) }
    throw err
  }
}

// Per-template outcome enums (product owner 2026-07-14). `used` is required on
// every entry; `outcome` may be null (e.g. "partly used" with no verdict yet).
const OUTCOME_USED = ['full', 'partial', 'none']
const OUTCOME_RESULT = ['well', 'less']

/**
 * Sanitise a per-template outcomes payload against the case's OWN template
 * list. Entries with unknown titles or invalid enums are dropped (a crafted
 * request must not be able to attach outcomes for templates the case never
 * delivered — that would poison the client-history hold-back). Returns null
 * when nothing valid remains, so an absent/garbage payload stores NULL and the
 * engine falls back to the case-level review.
 * @param {*} raw - client-supplied array
 * @param {string[]} caseTemplates - the case's stored template titles
 * @returns {Array<{title:string, used:string, outcome:string|null}>|null}
 */
function sanitiseTemplateOutcomes (raw, caseTemplates) {
  if (!Array.isArray(raw) || raw.length === 0) { return null }
  const allowed = new Map((caseTemplates || []).map(t => [String(t).trim().toLowerCase(), String(t)]))
  const seen = new Set()
  const out = []
  for (const entry of raw.slice(0, 20)) {
    if (!entry || typeof entry !== 'object') { continue }
    const key = String(entry.title || '').trim().toLowerCase()
    const canonical = allowed.get(key)
    if (!canonical || seen.has(key)) { continue }
    if (!OUTCOME_USED.includes(entry.used)) { continue }
    const outcome = OUTCOME_RESULT.includes(entry.outcome) ? entry.outcome : null
    seen.add(key)
    out.push({ title: canonical, used: entry.used, outcome })
  }
  return out.length > 0 ? out : null
}

/**
 * Update the post-delivery review on a case the advisor owns — including the
 * per-template outcomes (which templates were used / half-used and how each
 * landed). Outcomes are validated against the case's own template list, which
 * costs one owner-scoped SELECT; an invalid or absent payload stores NULL.
 * @returns {Promise<boolean>} true if a row the advisor owns was updated
 */
async function updateReview (id, advisorId, review) {
  const wentWell = review && review.wentWell ? String(review.wentWell).slice(0, 5000) : null
  const wentLess = review && review.wentLess ? String(review.wentLess).slice(0, 5000) : null
  const changes = review && review.changesRecommended ? String(review.changesRecommended).slice(0, 5000) : null
  const rawOutcomes = review ? review.templateOutcomes : null

  try {
    let outcomes = null
    if (rawOutcomes) {
      const [rows] = await db.execute(
        'SELECT templates FROM va_case_studies WHERE id = ? AND advisor_id = ? LIMIT 1',
        [id, advisorId]
      )
      if (rows.length === 0) { return false }
      outcomes = sanitiseTemplateOutcomes(rawOutcomes, parseJSON(rows[0].templates, []))
    }
    const [result] = await db.execute(
      `UPDATE va_case_studies
          SET review_went_well = ?, review_went_less = ?,
              review_changes_recommended = ?, template_outcomes = ?,
              reviewed_at = NOW(), feedback_pending = 0
        WHERE id = ? AND advisor_id = ?`,
      [wentWell, wentLess, changes, outcomes ? JSON.stringify(outcomes) : null, id, advisorId]
    )
    return result.affectedRows > 0
  } catch (err) {
    if (devFallbackEnabled()) {
      return _devUpdate(id, advisorId, (c) => {
        c.review = { wentWell: wentWell || '', wentLess: wentLess || '', changesRecommended: changes || '', reviewedAt: new Date().toISOString() }
        c.templateOutcomes = rawOutcomes ? sanitiseTemplateOutcomes(rawOutcomes, c.templates || []) : null
        c.feedbackPending = false
      })
    }
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
 * Approve and persist a mentor share (part 3). Stores the manager-approved
 * anonymised copy and flips `mentor_shared` on. Scoped to a firm-`shared` case
 * of the caller's firm — a manager can only share their own firm's shared cases.
 * The stored copy is exactly what the manager previewed and approved (part 2);
 * the raw summary/transcript are untouched and never leave the firm.
 * @param {string} id
 * @param {string} firmId - from the verified JWT
 * @param {string} approverId - the approving manager (audit: mentor_shared_by)
 * @param {string} anonSummary - approved anonymised summary
 * @param {Array<{role:string, content:string}>} anonTranscript - approved scrubbed transcript
 * @returns {Promise<boolean>} true if a firm-shared row was updated
 */
async function shareWithMentor (id, firmId, approverId, anonSummary, anonTranscript) {
  const summary = anonSummary ? String(anonSummary).slice(0, 16000) : null
  const transcript = Array.isArray(anonTranscript) && anonTranscript.length
    ? JSON.stringify(anonTranscript)
    : null
  try {
    const [result] = await db.execute(
      `UPDATE va_case_studies
          SET mentor_shared = 1, mentor_anon_summary = ?, mentor_anon_transcript = ?,
              mentor_shared_by = ?, mentor_shared_at = NOW()
        WHERE id = ? AND firm_id = ? AND visibility = 'shared'`,
      [summary, transcript, String(approverId || '').slice(0, 64), id, firmId]
    )
    return result.affectedRows > 0
  } catch (err) {
    if (devFallbackEnabled()) {
      return _devUpdateFirm(id, firmId, true, (c) => {
        c.mentorShared = true
        c.mentorAnonSummary = summary
        c.mentorAnonTranscript = Array.isArray(anonTranscript) ? anonTranscript : []
        c.mentorSharedBy = String(approverId || '').slice(0, 64)
        c.mentorSharedAt = new Date().toISOString()
      })
    }
    throw err
  }
}

/**
 * Withdraw a mentor share (part 3). Flips `mentor_shared` off and CLEARS the
 * stored anonymised copy (least-retention) so it no longer reaches the mentor.
 * Firm-scoped — a manager may withdraw any of their firm's cases.
 * @param {string} id
 * @param {string} firmId - from the verified JWT
 * @returns {Promise<boolean>} true if a firm row was updated
 */
async function withdrawFromMentor (id, firmId) {
  try {
    const [result] = await db.execute(
      `UPDATE va_case_studies
          SET mentor_shared = 0, mentor_anon_summary = NULL, mentor_anon_transcript = NULL,
              mentor_shared_by = NULL, mentor_shared_at = NULL
        WHERE id = ? AND firm_id = ?`,
      [id, firmId]
    )
    return result.affectedRows > 0
  } catch (err) {
    if (devFallbackEnabled()) {
      return _devUpdateFirm(id, firmId, false, (c) => {
        c.mentorShared = false
        c.mentorAnonSummary = null
        c.mentorAnonTranscript = null
        c.mentorSharedBy = null
        c.mentorSharedAt = null
      })
    }
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

/** Mirrors listForClient's SQL: same visibility boundary, filtered to one client. */
function _devListForClient (advisorId, firmId, clientId) {
  return _devList(advisorId, firmId).filter(c => c.clientId === clientId)
}

function _devListSharedForFirm (firmId) {
  return _devReadAll()
    .filter(c => c.firmId === firmId && c.visibility === 'shared')
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
}

function _devGetSharedForFirm (id, firmId) {
  return _devReadAll()
    .find(c => c.id === id && c.firmId === firmId && c.visibility === 'shared') || null
}

function _devListSharedWithMentor () {
  return _devReadAll()
    .filter(c => c.mentorShared)
    .map(c => ({
      id: c.id,
      firmId: c.firmId,
      title: c.title,
      mode: c.mode,
      domain: c.domain || null,
      staircaseStep: c.staircaseStep || null,
      growthStage: c.growthStage || null,
      finMgtTheme: c.finMgtTheme || null,
      templates: c.templates || [],
      decisionTrace: c.decisionTrace || null,
      review: c.review || null,
      summary: c.mentorAnonSummary || '',
      transcript: c.mentorAnonTranscript || [],
      mentorSharedAt: c.mentorSharedAt || null,
      createdAt: c.createdAt || null
    }))
    .sort((a, b) => new Date(b.mentorSharedAt || 0) - new Date(a.mentorSharedAt || 0))
}

function _devCreate (row) {
  const all = _devReadAll()
  // Mirror the DB primary-key constraint: a duplicate id is rejected (the live
  // INSERT would throw), so a migration re-run can never create duplicates here.
  if (all.some(c => c.id === row.id)) {
    throw new Error(`duplicate case id: ${row.id}`)
  }
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

/**
 * Firm-scoped dev mutate (mentor-share flow). When `sharedOnly` is true the case
 * must also be visibility 'shared' (mirrors the live SQL WHERE on share).
 */
function _devUpdateFirm (id, firmId, sharedOnly, mutate) {
  const all = _devReadAll()
  const c = all.find(x => x.id === id && x.firmId === firmId && (!sharedOnly || x.visibility === 'shared'))
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
  listForClient,
  listSharedForFirm,
  getSharedForFirm,
  listSharedWithMentor,
  create,
  updateReview,
  updateVisibility,
  shareWithMentor,
  withdrawFromMentor,
  remove,
  // exported for tests
  generateId,
  safeVisibility,
  sanitiseTemplateOutcomes,
  VISIBILITIES
}
