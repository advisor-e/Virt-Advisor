'use strict'

/**
 * @file The Education Gate hub tab — read and edit the question an advisor is asked when a
 *   client cannot read their own numbers, at whichever tier the manager is signed in as.
 * @module server/routes/educationGate
 *
 * Item 2.9. Design: `design/EDUCATION-GATE.md` §8. Artefact: `design/mockups/education-gate.html`.
 *
 * 🔴 WHY THIS SCREEN EXISTS AT ALL, and it is a rule rather than a nicety. Mike's binding
 * ruling of 2026-08-16: content that shapes what the AI does must surface on a hub page,
 * starting at the mentor and cascading down. The gate's wording and its trigger phrases
 * shape every recommendation the gate touches. Wiring them into the engine and leaving them
 * in `data/*.json` would have been half a fix — live, and untouchable by the people whose
 * content it is. That is the exact state the 4.16 sweep found 102 times over.
 *
 * ⚠ MIRRORS `server/routes/aiPrompts.js` DELIBERATELY, down to the dev-fallback helpers and
 * the own/inherited split. A second way of doing tier-scoped editing is how two ways drift
 * apart. `hubTierOfScope` is imported from `utils/aiPrompts` rather than re-declared, so
 * there is one map between the tier vocabulary and the hub's scope names, not two.
 *
 * ⚠ THE TWO MIDDLE TIERS CANNOT BE EXERCISED BY A REAL LOGIN TODAY. `config/integration.js`
 * ships `globalManagerRole` and `groupManagerRole` empty on purpose, fail-closed. These
 * routes are correct for four tiers and provable on two. Stated rather than implied.
 *
 * Node 14, CommonJS.
 */

const fs = require('fs')
const path = require('path')
const overlay = require('../utils/firmOverlay')
const { sendError } = require('../utils/sendError')
const { devFallbackAllowed } = require('../utils/dbFailure')
const { parentScopeOf } = require('../utils/tierChain')
const { hubTierOfScope } = require('../utils/aiPrompts')
const {
  BASE_GATE,
  CONFIG_KEY,
  validateEducationGate,
  loadResolvedEducationGate
} = require('../utils/educationGate')

const DEV_FILE = path.resolve(__dirname, '../../data/dev-education-gate.json')

/** Dev-only: this scope's own stored settings from the JSON fallback, or null. */
function devRead (scopeId) {
  try {
    const all = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8'))
    const own = all[scopeId]
    return (own && typeof own === 'object' && !Array.isArray(own)) ? own : null
  } catch (e) { return null }
}

/** Dev-only: persist this scope's own settings to the JSON fallback. */
function devWrite (scopeId, value) {
  let all = {}
  try { all = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8')) } catch (e) { all = {} }
  all[scopeId] = value
  fs.writeFileSync(DEV_FILE, JSON.stringify(all, null, 2))
}

/**
 * The overlay reader the resolver walks the tier chain with, falling back to the dev file
 * so the cascade behaves the same way with and without a database.
 *
 * @param {string} scopeId - a firm id or reserved tier scope
 * @param {string} key - the config key
 * @returns {Promise<object|null>} the stored partial, or null
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
 * GET /api/firm-manager/education-gate  (manager)
 *
 * Everything the tab draws: the gate in force at this tier, what this tier set itself, and
 * what it would inherit if it set nothing.
 *
 * 🔴 `own` IS WHAT MAKES THE "set here" / "inherited" BADGES HONEST. A level holds only its
 * own changes, so a field reading "inherited" keeps receiving the level above's corrections
 * and one reading "set here" is protected from them. Without the split the two look
 * identical on screen and they are not the same thing.
 *
 * 🔴 `inherited` IS RESOLVED FROM THE PARENT, NOT SUBTRACTED FROM OUR OWN RESULT.
 * Subtraction cannot tell "same as above" from "set here to the same thing", and those are
 * different decisions. Same reasoning as `aiPrompts.getForManager`.
 *
 * @route GET /api/firm-manager/education-gate
 * @returns {{tier: string, gate: object, own: object, hasOwn: boolean, inherited: object,
 *   platform: object}}
 */
async function getForManager (req, res) {
  try {
    const tier = hubTierOfScope(req.firmId)

    const parent = parentScopeOf(req.firmId)
    const inherited = parent === null
      ? BASE_GATE
      : await loadResolvedEducationGate(parent, readScopeConfig)

    const stored = await readScopeConfig(req.firmId, CONFIG_KEY)
    const { ok, value } = validateEducationGate(stored)
    const own = ok ? value : {}

    const gate = await loadResolvedEducationGate(req.firmId, readScopeConfig)

    res.send(200, {
      tier,
      gate,
      own,
      hasOwn: Object.keys(own).length > 0,
      inherited,
      // The shipped default, so "restore what Advisor-e ships" is a button and not a
      // support request. It is the same object the engine falls back to.
      platform: BASE_GATE
    })
  } catch (err) {
    console.error('[education-gate] manager read failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read the education gate')
  }
}

/**
 * POST /api/firm-manager/education-gate  (manager)
 *
 * Save THIS tier's own settings. A partial object: an absent field keeps coming from the
 * level above, and an empty object clears this tier's settings so it inherits again.
 *
 * 🔴 THE VALIDATOR FAILS CLOSED. An unknown answer value is a 400, never a value quietly
 * kept — the two option values are the contract with `strategyResolver`, and a third one
 * the store accepted and nothing understood would be a gate whose answer does nothing.
 *
 * @route POST /api/firm-manager/education-gate
 * @param {object} req.body - `{ gate: { question?, reason?, options?, phrases? } }`
 * @returns {{saved: true, own: object, gate: object, hasOwn: boolean}}
 */
async function save (req, res) {
  const { ok, error, value } = validateEducationGate(req.body && req.body.gate)
  if (!ok) {
    return sendError(res, 400, 'INVALID_EDUCATION_GATE', error)
  }
  try {
    try {
      await overlay.saveFirmConfig(req.firmId, CONFIG_KEY, value, req.userEmail)
    } catch (err) {
      if (!devFallbackAllowed(err)) { throw err }
      devWrite(req.firmId, value)
    }
    const gate = await loadResolvedEducationGate(req.firmId, readScopeConfig)
    res.send(200, {
      saved: true,
      own: value,
      hasOwn: Object.keys(value).length > 0,
      gate
    })
  } catch (err) {
    console.error('[education-gate] save failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not save the education gate')
  }
}

/**
 * GET /api/firm-manager/education-gate/history  (manager)
 * @route GET /api/firm-manager/education-gate/history
 * @returns {{history: Array<object>}} every saved version of THIS scope's own settings.
 */
async function history (req, res) {
  try {
    const rows = await overlay.getVersionHistory(req.firmId, CONFIG_KEY)
    res.send(200, { history: rows })
  } catch (err) {
    if (devFallbackAllowed(err)) { res.send(200, { history: [] }); return }
    console.error('[education-gate] history failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read the change history')
  }
}

/**
 * POST /api/firm-manager/education-gate/restore  (manager)
 * @route POST /api/firm-manager/education-gate/restore
 * @param {object} req.body - `{ versionId: number }`
 * @returns {{restored: true, own: object, gate: object, hasOwn: boolean}}
 */
async function restore (req, res) {
  const versionId = req.body && req.body.versionId
  if (!versionId) {
    return sendError(res, 400, 'MISSING_VERSION', 'versionId is required')
  }
  try {
    await overlay.restoreVersion(req.firmId, CONFIG_KEY, Number(versionId))
    const stored = await readScopeConfig(req.firmId, CONFIG_KEY)
    const { ok, value } = validateEducationGate(stored)
    const own = ok ? value : {}
    const gate = await loadResolvedEducationGate(req.firmId, readScopeConfig)
    res.send(200, { restored: true, own, hasOwn: Object.keys(own).length > 0, gate })
  } catch (err) {
    console.error('[education-gate] restore failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not restore that version')
  }
}

module.exports = { getForManager, save, history, restore, readScopeConfig }
