'use strict'

/**
 * AI Prompts — Restify routes.
 *
 * The instructions the AI is given when it builds a model, and the handful of settings a
 * manager may change on them. Asked for by Mike 2026-08-21: *"an 'AI Prompts' page in the
 * hub pages (Mentor, Global Group Manager, Group Manager and Firm Manager) so that users
 * have the ability to influence the approach to formulas in the performance report
 * models"*, and *"editable … but NOT over ride key protocols"*.
 *
 * Design: `design/AI-PROMPTS-PAGE.md`. Artefact: `design/mockups/ai-prompts-tab.html`.
 *
 * 🔴 THIS FILE DELIBERATELY MIRRORS `propertyTaxRules.js` LINE FOR LINE — the same four
 * handlers, the same dev fallback, the same `inherited / own / resolved` triple, the same
 * refusal to read an id from the request. Both blocks are map-shaped settings cascading
 * through `firmOverlay`, and a second way of doing inheritance is how two ways drift
 * apart (`tier-cascade.md` §3, and the note at the top of `server/utils/aiPrompts.js`).
 *
 * 🔴 EVERY ROUTE IS SCOPED TO `req.firmId`, THE VERIFIED SCOPE FROM THE JWT — a firm id or
 * a reserved tier scope (`__platform__`, `__global__:…`, `__group__:…`). No handler here
 * reads a scope from a body or a query, so one tier can never read or write another's
 * settings. That is `tier-cascade.md` P6 and the open IDOR item in `ACTIONS.md`, and it is
 * why ONE set of routes serves all four tiers.
 *
 * ⚠ ACCESS IS MANAGER-ONLY, AND THERE IS NO READING TWIN. Property tax rules have a
 * second `firmAuth`-only route because every advisor opening the property report needs
 * the values. Nothing an advisor opens reads these prompts today — no report model calls
 * the AI at all (`AI-PROMPTS-PAGE.md` §2) — so an unguarded read route would exist for no
 * caller. It gets added the day something needs it, not in advance.
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
const {
  CONFIG_KEY,
  PROTECTION_PANEL,
  hubTierOfScope,
  validateAiPromptOverrides,
  loadResolvedAiPromptOverrides,
  listPrompts
} = require('../utils/aiPrompts')

const DEV_FILE = path.resolve(__dirname, '../../data/dev-ai-prompts.json')

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
 * GET /api/firm-manager/ai-prompts  (manager)
 *
 * Everything the tab draws: the prompts this tier is shown with the value in force on
 * every setting, which of those values this tier set ITSELF, and the plain-English
 * protection panel.
 *
 * 🔴 `own` IS WHAT MAKES THE "set here" / "inherited" BADGES HONEST. A level holds only
 * its own changes (`tier-cascade.md` P3), so a setting reading "inherited" keeps receiving
 * the level above's corrections and one reading "set here" is protected from them. Without
 * the split those two look identical on screen and they are not the same thing.
 *
 * 🔴 `inherited` IS RESOLVED FROM THE PARENT, NOT SUBTRACTED FROM OUR OWN RESULT.
 * Subtraction cannot tell "same as above" from "set here to the same thing", and those
 * are different decisions. Same reasoning as `propertyTaxRules.getForManager`.
 *
 * @route GET /api/firm-manager/ai-prompts
 * @returns {{tier: string, prompts: object[], protectionPanel: object, own: object,
 *   hasOwn: boolean, inherited: object}}
 */
async function getForManager (req, res) {
  try {
    const tier = hubTierOfScope(req.firmId)

    const parent = parentScopeOf(req.firmId)
    const inherited = parent === null
      ? {}
      : await loadResolvedAiPromptOverrides(parent, readScopeConfig)

    const stored = await readScopeConfig(req.firmId, CONFIG_KEY)
    const { ok, value } = validateAiPromptOverrides(stored)
    const own = ok ? value : {}

    const resolved = await loadResolvedAiPromptOverrides(req.firmId, readScopeConfig)

    res.send(200, {
      tier,
      prompts: listPrompts(resolved, tier),
      protectionPanel: PROTECTION_PANEL,
      own,
      hasOwn: Object.keys(own).length > 0,
      inherited
    })
  } catch (err) {
    console.error('[ai-prompts] manager read failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read the AI prompt settings')
  }
}

/**
 * POST /api/firm-manager/ai-prompts  (manager)
 *
 * Save THIS tier's own settings. A partial map: an absent variable keeps coming from the
 * level above (`tier-cascade.md` P3), and an empty object clears this tier's settings
 * altogether so it inherits again.
 *
 * 🔴 THE VALIDATOR FAILS CLOSED ON ANYTHING NOT DECLARED. An unknown prompt id or an
 * unknown variable id is a 400, never a value quietly kept — a setting the store accepts
 * and nothing reads is a setting a manager believes is in force and is not. The locked
 * sections are not in the payload shape at all, so there is no request that could edit
 * one, and the protocols are not in this file's reach at any point.
 *
 * @route POST /api/firm-manager/ai-prompts
 * @param {object} req.body - `{ overrides: { '<promptId>': { '<variableId>': value } } }`
 * @returns {{saved: true, own: object, prompts: object[], hasOwn: boolean}}
 */
async function save (req, res) {
  const { ok, errors, value } = validateAiPromptOverrides(req.body && req.body.overrides)
  if (!ok) {
    return sendError(res, 400, 'INVALID_AI_PROMPT_SETTINGS', errors.join('; '))
  }
  try {
    try {
      await overlay.saveFirmConfig(req.firmId, CONFIG_KEY, value, req.userEmail)
    } catch (err) {
      if (!devFallbackAllowed(err)) { throw err }
      devWrite(req.firmId, value)
    }
    const tier = hubTierOfScope(req.firmId)
    const resolved = await loadResolvedAiPromptOverrides(req.firmId, readScopeConfig)
    res.send(200, {
      saved: true,
      own: value,
      hasOwn: Object.keys(value).length > 0,
      prompts: listPrompts(resolved, tier)
    })
  } catch (err) {
    console.error('[ai-prompts] save failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not save the AI prompt settings')
  }
}

/**
 * GET /api/firm-manager/ai-prompts/history  (manager)
 * @route GET /api/firm-manager/ai-prompts/history
 * @returns {{history: Array<object>}} every saved version of THIS scope's own settings.
 */
async function history (req, res) {
  try {
    const rows = await overlay.getVersionHistory(req.firmId, CONFIG_KEY)
    res.send(200, { history: rows })
  } catch (err) {
    if (devFallbackAllowed(err)) { res.send(200, { history: [] }); return }
    console.error('[ai-prompts] history failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read the change history')
  }
}

/**
 * POST /api/firm-manager/ai-prompts/restore  (manager)
 * @route POST /api/firm-manager/ai-prompts/restore
 * @param {object} req.body - `{ versionId: number }`
 * @returns {{restored: true, own: object, prompts: object[], hasOwn: boolean}}
 */
async function restore (req, res) {
  const versionId = req.body && req.body.versionId
  if (!versionId) {
    return sendError(res, 400, 'MISSING_VERSION', 'versionId is required')
  }
  try {
    await overlay.restoreVersion(req.firmId, CONFIG_KEY, Number(versionId))
    const tier = hubTierOfScope(req.firmId)
    const stored = await readScopeConfig(req.firmId, CONFIG_KEY)
    const { ok, value } = validateAiPromptOverrides(stored)
    const own = ok ? value : {}
    const resolved = await loadResolvedAiPromptOverrides(req.firmId, readScopeConfig)
    res.send(200, {
      restored: true,
      own,
      hasOwn: Object.keys(own).length > 0,
      prompts: listPrompts(resolved, tier)
    })
  } catch (err) {
    console.error('[ai-prompts] restore failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not restore that version')
  }
}

module.exports = { getForManager, save, history, restore, readScopeConfig }
