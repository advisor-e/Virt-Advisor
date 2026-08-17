'use strict'

/**
 * Property tax rules — Restify routes.
 *
 * The settings the Multiple Property Assessment is built on: what may be depreciated and
 * how, whether rental losses ring-fence, the GST inside the management fee, and which
 * year-1 costs are added back. Ruled by Mike 2026-08-17 (§8 Q6): **a group sets them, a
 * firm may correct them, and an advisor types over them on the screen for one client.**
 *
 * Access is asymmetric, exactly as the currency setting is:
 *   - READ  (`get`)      — any signed-in user (`firmAuth`). Every advisor opening the
 *     report needs it, so it must never require a manager role and must never break the
 *     report: on any failure it degrades to the shipped New Zealand set.
 *   - MANAGE (`getForManager` / `save` / `history` / `restore`) — managers only
 *     (`firmAuth` + `requireManagerRole` + the managing-tier guard, wired in
 *     restify-server.js).
 *
 * 🔴 EVERY ROUTE IS SCOPED TO `req.firmId`, WHICH IS THE VERIFIED SCOPE FROM THE JWT —
 * a firm id, or one of the reserved tier scopes (`__platform__`, `__global__:…`,
 * `__group__:…`). No handler here reads an id from a body or a query, so one scope can
 * never read or write another's rules. That is `tier-cascade.md` P6 and the open IDOR
 * item in `ACTIONS.md`, and it is also why ONE set of routes serves all four tiers.
 *
 * Persistence rides the same `firmOverlay` store as the rest of the firm's config
 * (`config_key` `'property-tax-rules'`), so version history and restore come for free.
 * A dev-JSON fallback keeps it usable before the MySQL table is provisioned.
 */

const fs = require('fs')
const path = require('path')
const overlay = require('../utils/firmOverlay')
const { sendError } = require('../utils/sendError')
const { devFallbackAllowed } = require('../utils/dbFailure')
const { parentScopeOf } = require('../utils/tierChain')
const {
  BASE_PROPERTY_TAX_RULES,
  CONFIG_KEY,
  validatePropertyTaxRules,
  loadResolvedPropertyTaxRules
} = require('../utils/propertyTaxRules')

const DEV_FILE = path.resolve(__dirname, '../../data/dev-property-tax-rules.json')

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
 * The overlay reader the resolver walks the tier chain with, falling back to the dev
 * file so the cascade behaves the same way with and without a database.
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
 * GET /api/report/property-tax-rules  (firmAuth)
 *
 * The rules this scope works to, with every tier above it already applied. The report
 * screen seeds its Tax rules card from these and the advisor types over them.
 *
 * @route GET /api/report/property-tax-rules
 * @returns {{rules: object, isDefault: boolean}} `isDefault` is true when nothing above
 *   the platform has changed anything — so a screen can say the figures are the shipped
 *   New Zealand set rather than somebody's decision.
 */
async function get (req, res) {
  try {
    const rules = await loadResolvedPropertyTaxRules(req.firmId, readScopeConfig)
    res.send(200, { rules, isDefault: rules === BASE_PROPERTY_TAX_RULES })
  } catch (err) {
    // A settings read must never stop an advisor assessing a property.
    console.error('[property-tax-rules] read failed:', err.message)
    res.send(200, { rules: BASE_PROPERTY_TAX_RULES, isDefault: true })
  }
}

/**
 * GET /api/firm-manager/property-tax-rules  (manager)
 *
 * What this tier is working to, split three ways so the screen can show the difference
 * rather than assert it: what it INHERITS, what it has CHANGED itself, and the RESOLVED
 * result the advisors under it actually get.
 *
 * @route GET /api/firm-manager/property-tax-rules
 * @returns {{inherited: object, own: object, resolved: object, hasOwn: boolean}}
 */
async function getForManager (req, res) {
  try {
    // The layer above, asked for by resolving the PARENT rather than subtracting our own
    // values from the result — subtraction cannot tell "same as above" from "set here to
    // the same thing", and those are different decisions.
    const parent = parentScopeOf(req.firmId)
    const inherited = parent === null
      ? BASE_PROPERTY_TAX_RULES
      : await loadResolvedPropertyTaxRules(parent, readScopeConfig)

    const stored = await readScopeConfig(req.firmId, CONFIG_KEY)
    const { ok, value } = validatePropertyTaxRules(stored)
    const own = ok ? value : {}
    const resolved = await loadResolvedPropertyTaxRules(req.firmId, readScopeConfig)

    res.send(200, { inherited, own, resolved, hasOwn: Object.keys(own).length > 0 })
  } catch (err) {
    console.error('[property-tax-rules] manager read failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read the property tax rules')
  }
}

/**
 * POST /api/firm-manager/property-tax-rules  (manager)
 *
 * Save THIS tier's own changes. A partial object: an absent field keeps coming from the
 * level above (`tier-cascade.md` P3), and an empty object clears this tier's changes
 * altogether so it inherits again.
 *
 * @route POST /api/firm-manager/property-tax-rules
 * @param {object} req.body - `{ rules: object }`
 * @returns {{saved: true, own: object, resolved: object}}
 */
async function save (req, res) {
  const { ok, errors, value } = validatePropertyTaxRules(req.body && req.body.rules)
  if (!ok) {
    return sendError(res, 400, 'INVALID_TAX_RULES', errors.join('; '))
  }
  try {
    try {
      await overlay.saveFirmConfig(req.firmId, CONFIG_KEY, value, req.userEmail)
    } catch (err) {
      if (!devFallbackAllowed(err)) { throw err }
      devWrite(req.firmId, value)
    }
    const resolved = await loadResolvedPropertyTaxRules(req.firmId, readScopeConfig)
    res.send(200, { saved: true, own: value, resolved })
  } catch (err) {
    console.error('[property-tax-rules] save failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not save the property tax rules')
  }
}

/**
 * GET /api/firm-manager/property-tax-rules/history  (manager)
 * @route GET /api/firm-manager/property-tax-rules/history
 * @returns {{history: Array<object>}} every saved version of THIS scope's own changes.
 */
async function history (req, res) {
  try {
    const rows = await overlay.getVersionHistory(req.firmId, CONFIG_KEY)
    res.send(200, { history: rows })
  } catch (err) {
    if (devFallbackAllowed(err)) { res.send(200, { history: [] }); return }
    console.error('[property-tax-rules] history failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read the change history')
  }
}

/**
 * POST /api/firm-manager/property-tax-rules/restore  (manager)
 * @route POST /api/firm-manager/property-tax-rules/restore
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
    const resolved = await loadResolvedPropertyTaxRules(req.firmId, readScopeConfig)
    res.send(200, { restored: true, resolved })
  } catch (err) {
    console.error('[property-tax-rules] restore failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not restore that version')
  }
}

module.exports = { get, getForManager, save, history, restore, readScopeConfig }
