'use strict'

/**
 * Forecast trend thresholds — Restify routes.
 *
 * The bands the Three-Way Forecast's two-year trend read draws (item 4.61 phase (b)).
 * Ruled by Mike 2026-09-03: warning bands on thresholds HE sets, against a recommendation
 * of a plain read with no judgement.
 *
 * Access is asymmetric, exactly as the property tax rules are:
 *   - READ  (`get`)      — any signed-in user (`firmAuth`). Every advisor building a
 *     forecast needs it, so it must never require a manager role and must never break the
 *     forecast: on any failure it degrades to the platform set.
 *   - MANAGE (`getForManager` / `save` / `history` / `restore`) — managers only
 *     (`firmAuth` + `requireManagerRole` + the managing-tier guard, wired in
 *     restify-server.js).
 *
 * 🔴 EVERY ROUTE IS SCOPED TO `req.firmId`, WHICH IS THE VERIFIED SCOPE FROM THE JWT. No
 * handler here reads an id from a body or a query, so one scope can never read or write
 * another's thresholds (`tier-cascade.md` P6). That is also why ONE set of routes serves
 * every tier, even though only the mentor's screen is switched on today.
 *
 * Persistence rides the same `firmOverlay` store as the rest of the config
 * (`config_key` `'forecast-trend-thresholds'`), so version history and restore come for
 * free. A dev-JSON fallback keeps it usable before the MySQL table is provisioned.
 */

const fs = require('fs')
const path = require('path')
const overlay = require('../utils/firmOverlay')
const { sendError } = require('../utils/sendError')
const { devFallbackAllowed } = require('../utils/dbFailure')
const { parentScopeOf } = require('../utils/tierChain')
const {
  BASE_TREND_THRESHOLDS,
  CONFIG_KEY,
  validateTrendThresholds,
  loadResolvedTrendThresholds
} = require('../utils/forecastTrendThresholds')

const DEV_FILE = path.resolve(__dirname, '../../data/dev-forecast-trend-thresholds.json')

/** Dev-only: this scope's own stored changes from the JSON fallback, or null. */
function devRead (scopeId) {
  try {
    const all = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8'))
    const own = all[scopeId]
    return (own && typeof own === 'object' && !Array.isArray(own)) ? own : null
  } catch (e) { return null }
}

/** Dev-only: persist this scope's own changes to the JSON fallback. */
function devWrite (scopeId, value) {
  let all = {}
  try { all = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8')) } catch (e) { all = {} }
  all[scopeId] = value
  fs.writeFileSync(DEV_FILE, JSON.stringify(all, null, 2))
}

/**
 * The overlay reader the resolver walks the tier chain with, falling back to the dev file
 * so the cascade behaves the same way with and without a database.
 * @param {string} scopeId
 * @param {string} key
 * @returns {Promise<object|null>}
 */
async function readScopeConfig (scopeId, key) {
  try {
    return await overlay.loadFirmConfig(scopeId, key)
  } catch (err) {
    if (devFallbackAllowed(err)) { return devRead(scopeId) }
    throw err
  }
}

/**
 * GET /api/report/trend-thresholds  (firmAuth)
 *
 * The bands this scope works to, with every tier above it already applied. The forecast's
 * step 3 draws its trend block against these.
 *
 * @route GET /api/report/trend-thresholds
 * @returns {{thresholds: object, isDefault: boolean}} `isDefault` is true when nothing
 *   above the platform has changed anything.
 */
async function get (req, res) {
  try {
    const thresholds = await loadResolvedTrendThresholds(req.firmId, readScopeConfig)
    res.send(200, { thresholds, isDefault: thresholds === BASE_TREND_THRESHOLDS })
  } catch (err) {
    // A thresholds read must never stop an advisor building a forecast. The worst case is
    // the platform set, which is what every firm gets today anyway.
    console.error('[trend-thresholds] read failed:', err.message)
    res.send(200, { thresholds: BASE_TREND_THRESHOLDS, isDefault: true })
  }
}

/**
 * GET /api/firm-manager/trend-thresholds  (manager)
 *
 * What this tier is working to, split three ways so the screen can show the difference
 * rather than assert it: what it INHERITS, what it has CHANGED itself, and the RESOLVED
 * result the advisors under it actually get.
 *
 * @route GET /api/firm-manager/trend-thresholds
 * @returns {{inherited: object, own: object, resolved: object, hasOwn: boolean}}
 */
async function getForManager (req, res) {
  try {
    // The layer above, asked for by resolving the PARENT rather than subtracting our own
    // values from the result — subtraction cannot tell "same as above" from "set here to
    // the same thing", and those are different decisions.
    const parent = parentScopeOf(req.firmId)
    const inherited = parent === null
      ? BASE_TREND_THRESHOLDS
      : await loadResolvedTrendThresholds(parent, readScopeConfig)

    const stored = await readScopeConfig(req.firmId, CONFIG_KEY)
    const { ok, value } = validateTrendThresholds(stored)
    const own = ok ? value : {}
    const resolved = await loadResolvedTrendThresholds(req.firmId, readScopeConfig)

    res.send(200, { inherited, own, resolved, hasOwn: Object.keys(own).length > 0 })
  } catch (err) {
    console.error('[trend-thresholds] manager read failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read the trend thresholds')
  }
}

/**
 * POST /api/firm-manager/trend-thresholds  (manager)
 *
 * Save THIS tier's own changes. A partial object: an absent measure keeps coming from the
 * level above, and an empty object clears this tier's changes altogether so it inherits
 * again. An explicit null CLEARS a threshold, which is how a measure is set to report
 * without ever being banded.
 *
 * @route POST /api/firm-manager/trend-thresholds
 * @param {object} req.body - `{ thresholds: object }`
 * @returns {{saved: true, own: object, resolved: object}}
 */
async function save (req, res) {
  const { ok, errors, value } = validateTrendThresholds(req.body && req.body.thresholds)
  if (!ok) {
    return sendError(res, 400, 'INVALID_TREND_THRESHOLDS', errors.join('; '))
  }
  try {
    try {
      await overlay.saveFirmConfig(req.firmId, CONFIG_KEY, value, req.userEmail)
    } catch (err) {
      if (!devFallbackAllowed(err)) { throw err }
      devWrite(req.firmId, value)
    }
    const resolved = await loadResolvedTrendThresholds(req.firmId, readScopeConfig)
    res.send(200, { saved: true, own: value, resolved })
  } catch (err) {
    console.error('[trend-thresholds] save failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not save the trend thresholds')
  }
}

/**
 * GET /api/firm-manager/trend-thresholds/history  (manager)
 * @route GET /api/firm-manager/trend-thresholds/history
 * @returns {{history: Array<object>}} every saved version of THIS scope's own changes.
 */
async function history (req, res) {
  try {
    const rows = await overlay.getVersionHistory(req.firmId, CONFIG_KEY)
    res.send(200, { history: rows })
  } catch (err) {
    if (devFallbackAllowed(err)) { res.send(200, { history: [] }); return }
    console.error('[trend-thresholds] history failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read the change history')
  }
}

/**
 * POST /api/firm-manager/trend-thresholds/restore  (manager)
 * @route POST /api/firm-manager/trend-thresholds/restore
 * @param {object} req.body - `{ versionId: number }`
 * @returns {{restored: true, resolved: object}}
 */
async function restore (req, res) {
  const versionId = req.body && req.body.versionId
  if (!versionId) {
    return sendError(res, 400, 'MISSING_VERSION', 'versionId is required')
  }
  try {
    await overlay.restoreVersion(req.firmId, CONFIG_KEY, Number(versionId))
    const resolved = await loadResolvedTrendThresholds(req.firmId, readScopeConfig)
    res.send(200, { restored: true, resolved })
  } catch (err) {
    console.error('[trend-thresholds] restore failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not restore that version')
  }
}

module.exports = { get, getForManager, save, history, restore, readScopeConfig }
