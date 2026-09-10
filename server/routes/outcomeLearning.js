'use strict'

/**
 * Outcome Learning — the mentor's routes (item 4.87, specs/002-outcome-learning contracts
 * §Mentor). Design: `design/mockups/outcome-learning-mentor.html`, approved 2026-09-10.
 *
 * The pool is one platform-wide set at PLATFORM_SCOPE, so every route here reads and writes
 * the reserved mentor scope and none reads a scope from the request. Access is the mentor
 * guard, wired in restify-server.js; FR-014 gives no lower tier a view of this.
 *
 * 🔴 A PAGE LOAD RECOMPUTES BUT NEVER WRITES. `list` runs the arithmetic on every call, as the
 * spec clarified, and reports it from memory. It does NOT save: every save on the overlay
 * store is a new version in a history capped at FRAMEWORK.maxVersionHistory, and the same row
 * holds the mentor's decisions — ten page loads would otherwise push every earlier decision
 * out of the history that FR-009 promises. Only the explicit "Recompute now" and a firm's
 * withdrawal persist, through `recomputeAndPersist`, and each of those is a deliberate act.
 *
 * 🔴 `by` ON A DECISION COMES FROM THE VERIFIED TOKEN, NEVER THE BODY. It is the name beside
 * an adjustment that changes advice at every consenting firm.
 *
 * The evidence floor is refused HERE, not only on the screen: a `live` decision on an
 * adjustment below the floor, or on one whose template has left the library, is a 400.
 */

const overlay = require('../utils/firmOverlay')
const { PLATFORM_SCOPE } = require('../utils/platformScope')
const { sendError } = require('../utils/sendError')
const { loadEffectiveTemplates } = require('../utils/templateLibrary')
const SEED_TEMPLATES = require('../../data/templates.json')
const {
  MIN_FIRMS,
  MIN_CASES,
  POOLED_HOLDBACK_MAX,
  POOL_PREFIX,
  DECISIONS_KEY,
  computeAdjustments,
  liveAdjustments
} = require('../utils/outcomeLearning')

const DECISION_STATES = ['live', 'held', 'rejected']
const MAX_REASON = 500

/**
 * Every title in the platform's template library now: the mentor's uploaded library when
 * there is one, else the committed seed. `loadEffectiveTemplates` never rejects.
 * @returns {Promise<string[]>}
 */
async function _libraryTitles () {
  const uploaded = await loadEffectiveTemplates(null)
  const list = Array.isArray(uploaded) && uploaded.length > 0 ? uploaded : SEED_TEMPLATES
  return list.map(t => t && t.title).filter(t => typeof t === 'string' && t.trim())
}

/**
 * The decisions row, cleaned to its three parts. A malformed row reads as empty rather than
 * as a guess: `decisions` must be a plain object, or it is `{}`.
 * @returns {Promise<{decisions: Object, lastRecomputeAt: string|null, benches: Object|null}>}
 */
async function _decisionsRow () {
  const stored = await overlay.loadFirmConfig(PLATFORM_SCOPE, DECISIONS_KEY)
  const row = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}
  const decisions = row.decisions && typeof row.decisions === 'object' && !Array.isArray(row.decisions) ? row.decisions : {}
  return {
    decisions,
    lastRecomputeAt: typeof row.lastRecomputeAt === 'string' ? row.lastRecomputeAt : null,
    benches: row.benches && typeof row.benches === 'object' && !Array.isArray(row.benches) ? row.benches : null
  }
}

/**
 * Recompute from the pool. Reads only.
 * @returns {Promise<Object>} the page payload minus `success`, plus the raw `computed` list
 *   and the `row` it was computed against, for the routes that go on to write
 */
async function recompute () {
  const [rows, titles, row] = await Promise.all([
    overlay.loadFirmConfigsByPrefix(PLATFORM_SCOPE, POOL_PREFIX),
    _libraryTitles(),
    _decisionsRow()
  ])
  const keys = Object.keys(rows || {})
  // Firms are distinct tokens parsed from the keys — the only place a firm is counted.
  const tokens = new Set(keys.map(k => k.split(':')[0]).filter(Boolean))
  const computed = computeAdjustments(rows, row.decisions, titles)
  return {
    firms: tokens.size,
    cases: keys.length,
    lastRecomputeAt: row.lastRecomputeAt,
    floor: { minFirms: MIN_FIRMS, minCases: MIN_CASES },
    capMax: POOLED_HOLDBACK_MAX,
    adjustments: computed.filter(a => a.state !== 'orphaned'),
    orphaned: computed.filter(a => a.state === 'orphaned'),
    benches: row.benches,
    computed,
    row
  }
}

/**
 * Recompute AND stamp `lastRecomputeAt` on the decisions row, as a new version. Used by the
 * explicit "Recompute now" and by a firm's withdrawal (T016), so an adjustment that has just
 * dropped below the floor is recorded as such at that moment.
 * @param {string} savedBy - the verified caller
 * @returns {Promise<Object>} as `recompute`
 */
async function recomputeAndPersist (savedBy) {
  const result = await recompute()
  const lastRecomputeAt = new Date().toISOString()
  await overlay.saveFirmConfig(PLATFORM_SCOPE, DECISIONS_KEY, {
    decisions: result.row.decisions,
    lastRecomputeAt,
    benches: result.row.benches
  }, savedBy)
  result.lastRecomputeAt = lastRecomputeAt
  return result
}

function _payload (result) {
  return {
    success: true,
    firms: result.firms,
    cases: result.cases,
    lastRecomputeAt: result.lastRecomputeAt,
    floor: result.floor,
    capMax: result.capMax,
    adjustments: result.adjustments,
    orphaned: result.orphaned,
    benches: result.benches
  }
}

/**
 * GET /api/mentor/outcome-learning — the page. Recomputes on every call; writes nothing.
 * @route GET /api/mentor/outcome-learning
 * @returns {200} { success, firms, cases, lastRecomputeAt, floor, capMax, adjustments, orphaned, benches }
 */
async function list (req, res) {
  try {
    res.send(200, _payload(await recompute()))
  } catch (err) {
    console.error('[outcome-learning] list failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not read the outcome pool')
  }
}

/**
 * POST /api/mentor/outcome-learning/recompute — "Recompute now". Same payload, persisted.
 * @route POST /api/mentor/outcome-learning/recompute
 */
async function recomputeNow (req, res) {
  try {
    res.send(200, _payload(await recomputeAndPersist(req.userEmail)))
  } catch (err) {
    console.error('[outcome-learning] recompute failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not recompute the outcome pool')
  }
}

/**
 * POST /api/mentor/outcome-learning/decision — accept, hold or reject one adjustment.
 * @route POST /api/mentor/outcome-learning/decision
 * @param {string} req.body.id - the adjustment id
 * @param {string} req.body.state - 'live' | 'held' | 'rejected'
 * @param {string} [req.body.reason] - at most 500 characters
 * @returns {200} { success, decision } · {400} INVALID_DECISION | OUTCOME_BELOW_FLOOR | OUTCOME_ORPHANED
 * @returns {404} OUTCOME_UNKNOWN_ID · {500} DB_ERROR
 */
async function decision (req, res) {
  const body = req.body || {}
  const id = typeof body.id === 'string' ? body.id.trim() : ''
  if (!id) { return sendError(res, 400, 'INVALID_DECISION', 'id is required') }
  if (!DECISION_STATES.includes(body.state)) {
    return sendError(res, 400, 'INVALID_DECISION', "state must be 'live', 'held' or 'rejected'")
  }
  if (body.reason !== undefined && (typeof body.reason !== 'string' || body.reason.length > MAX_REASON)) {
    return sendError(res, 400, 'INVALID_DECISION', 'reason must be a string of at most 500 characters')
  }
  try {
    const result = await recompute()
    const target = result.computed.find(a => a.id === id)
    if (!target) { return sendError(res, 404, 'OUTCOME_UNKNOWN_ID', 'No adjustment has that id') }
    if (body.state === 'live') {
      // The floor is a rule, not a hint: the screen greys the button, and this refuses anyway.
      if (target.state === 'orphaned') {
        return sendError(res, 400, 'OUTCOME_ORPHANED', 'That template is no longer in the library')
      }
      if (!target.meetsFloor) {
        return sendError(res, 400, 'OUTCOME_BELOW_FLOOR', 'That adjustment does not meet the evidence floor')
      }
    }
    const record = {
      state: body.state,
      by: req.userEmail || null,
      at: new Date().toISOString(),
      reason: typeof body.reason === 'string' ? body.reason : '',
      // Kept with the decision so it can still be shown once the evidence behind it is gone.
      template: target.template,
      dimension: target.dimension,
      value: target.value
    }
    const decisions = Object.assign({}, result.row.decisions, { [id]: record })
    await overlay.saveFirmConfig(PLATFORM_SCOPE, DECISIONS_KEY, {
      decisions,
      lastRecomputeAt: result.row.lastRecomputeAt,
      benches: result.row.benches
    }, req.userEmail)
    res.send(200, { success: true, decision: Object.assign({ id }, record) })
  } catch (err) {
    console.error('[outcome-learning] decision failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not save the decision')
  }
}

/**
 * GET /api/mentor/outcome-learning/history — the decisions row's version history.
 * @route GET /api/mentor/outcome-learning/history
 * @returns {200} { success, versions }
 */
async function history (req, res) {
  try {
    const versions = await overlay.getVersionHistory(PLATFORM_SCOPE, DECISIONS_KEY)
    res.send(200, { success: true, versions })
  } catch (err) {
    console.error('[outcome-learning] history failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not read the change history')
  }
}

/**
 * POST /api/mentor/outcome-learning/restore — restore an earlier decisions row.
 * @route POST /api/mentor/outcome-learning/restore
 * @param {number|string} req.body.versionId
 * @returns {200} { success } · {400} MISSING_VERSION · {500} DB_ERROR
 */
async function restore (req, res) {
  const versionId = (req.body || {}).versionId
  if (versionId === undefined || versionId === null || versionId === '') {
    return sendError(res, 400, 'MISSING_VERSION', 'versionId is required')
  }
  try {
    await overlay.restoreVersion(PLATFORM_SCOPE, DECISIONS_KEY, versionId)
    res.send(200, { success: true })
  } catch (err) {
    console.error('[outcome-learning] restore failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not restore that version')
  }
}

/**
 * GET /api/mentor/outcome-learning/export — the live adjustments in the resolver's option
 * shape, which is what the Scenario Lab's `--adjustments` flag reads.
 * @route GET /api/mentor/outcome-learning/export
 * @returns {200} { success, adjustments }
 */
async function exportLive (req, res) {
  try {
    const result = await recompute()
    res.send(200, { success: true, adjustments: liveAdjustments(result.computed) })
  } catch (err) {
    console.error('[outcome-learning] export failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not export the live adjustments')
  }
}

module.exports = {
  list,
  recomputeNow,
  decision,
  history,
  restore,
  exportLive,
  recompute,
  recomputeAndPersist
}
