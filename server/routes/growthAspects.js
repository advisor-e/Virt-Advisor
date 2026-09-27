'use strict'

/**
 * Growth Aspect Questions — the Mentor Hub tab's Restify routes. Item 15.2, screen 3 of
 * `design/mockups/growth-aspect-questions.html`.
 *
 * Managers only (`firmAuth` + `requireManagerRole` + the managing-tier guard, wired in
 * restify-server.js). Advisors read the resolved aspects through the planner's own
 * `GET /api/strategy/frameworks`, never through these.
 *
 * 🔴 EVERY ROUTE IS SCOPED TO `req.firmId`, THE VERIFIED SCOPE FROM THE JWT. No handler here
 * reads an id from a body or a query, so one scope can never read or write another's
 * wording (`tier-cascade.md` P6). That is also why one set of routes serves every tier,
 * though only the mentor's screen is switched on today.
 */

const overlay = require('../utils/firmOverlay')
const { sendError } = require('../utils/sendError')
const { devFallbackAllowed } = require('../utils/dbFailure')
const { parentScopeOf } = require('../utils/tierChain')
const {
  BASE_ASPECTS,
  CONFIG_KEY,
  validateAspects,
  diffAgainst,
  loadResolvedAspects,
  readScopeConfig,
  saveScopeConfig
} = require('../utils/growthAspects')

/**
 * What the level above this scope resolves to — asked for by resolving the PARENT, never by
 * subtracting this scope's own changes from its result.
 * @param {string} scopeId
 * @returns {Promise<Array<object>>}
 */
function inheritedFor (scopeId) {
  const parent = parentScopeOf(scopeId)
  return parent === null ? Promise.resolve(BASE_ASPECTS) : loadResolvedAspects(parent, readScopeConfig)
}

/**
 * GET /api/firm-manager/growth-aspects  (manager)
 *
 * @route GET /api/firm-manager/growth-aspects
 * @returns {{aspects: Array<{name, description, questions}>, own: object, hasOwn: boolean}}
 *   `aspects` is what advisors under this scope are shown; `own` is what this scope changed.
 */
async function getForManager (req, res) {
  try {
    const stored = await readScopeConfig(req.firmId, CONFIG_KEY)
    const { ok, value } = validateAspects(stored)
    const own = ok ? value : {}
    const aspects = await loadResolvedAspects(req.firmId, readScopeConfig)
    res.send(200, { aspects, own, hasOwn: Object.keys(own).length > 0 })
  } catch (err) {
    console.error('[growth-aspects] manager read failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read the Growth Aspect questions')
  }
}

/**
 * POST /api/firm-manager/growth-aspects  (manager)
 *
 * Saves this scope's wording. The screen sends every aspect as shown; only what differs from
 * the level above is stored (see `diffAgainst`), so an aspect left alone keeps inheriting.
 *
 * @route POST /api/firm-manager/growth-aspects
 * @param {object} req.body - `{ aspects: { [name]: {description?, questions?} } }`
 * @returns {{saved: true, aspects: Array<object>, own: object, hasOwn: boolean}}
 */
async function save (req, res) {
  const { ok, errors, value } = validateAspects(req.body && req.body.aspects)
  if (!ok) {
    return sendError(res, 400, 'INVALID_GROWTH_ASPECTS', errors.join('; '))
  }
  try {
    const own = diffAgainst(value, await inheritedFor(req.firmId))
    await saveScopeConfig(req.firmId, own, req.userEmail)
    const aspects = await loadResolvedAspects(req.firmId, readScopeConfig)
    res.send(200, { saved: true, aspects, own, hasOwn: Object.keys(own).length > 0 })
  } catch (err) {
    console.error('[growth-aspects] save failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not save the Growth Aspect questions')
  }
}

/**
 * GET /api/firm-manager/growth-aspects/history  (manager)
 * @route GET /api/firm-manager/growth-aspects/history
 * @returns {{history: Array<object>}} every saved version of THIS scope's own changes.
 */
async function history (req, res) {
  try {
    const rows = await overlay.getVersionHistory(req.firmId, CONFIG_KEY)
    res.send(200, { history: rows })
  } catch (err) {
    if (devFallbackAllowed(err)) { res.send(200, { history: [] }); return }
    console.error('[growth-aspects] history failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read the change history')
  }
}

/**
 * POST /api/firm-manager/growth-aspects/restore  (manager)
 * @route POST /api/firm-manager/growth-aspects/restore
 * @param {object} req.body - `{ versionId: number }`
 * @returns {{restored: true, aspects: Array<object>}}
 */
async function restore (req, res) {
  const versionId = Number(req.body && req.body.versionId)
  if (!Number.isInteger(versionId) || versionId < 1) {
    return sendError(res, 400, 'MISSING_VERSION', 'versionId is required')
  }
  try {
    // Scoped by req.firmId inside restoreVersion: a version id belonging to another scope
    // matches no row there, so it cannot be restored from here.
    await overlay.restoreVersion(req.firmId, CONFIG_KEY, versionId)
    const aspects = await loadResolvedAspects(req.firmId, readScopeConfig)
    res.send(200, { restored: true, aspects })
  } catch (err) {
    console.error('[growth-aspects] restore failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not restore that version')
  }
}

module.exports = { getForManager, save, history, restore }
