'use strict'

/**
 * /api/firm-manager/register-retention — the dial that says how long a staff register lives.
 *
 * @module server/routes/registerRetentionRoutes
 *
 * Item 5.1's last piece. `server/utils/registerRetention.js` has answered *how long* since
 * 2026-09-15 and the register screen has shown the resulting date — but nothing served the
 * figure to a manager, so **every firm was stuck on the platform default with no way to
 * change it**. A privacy control that exists and cannot be reached is not a control.
 *
 * 🔴 MIKE'S RULING, 2026-09-23: *"the data holding period to be no more than 18months - this
 * should flow down from mentor - through the cascade levels and then at firm manager - be
 * editable again. this way, at least a set period is loaded as a default."* So: a real
 * default arrives from above, every tier may shorten it, and **no tier may exceed 18 months**
 * — a ceiling enforced in `validateRetentionMonths`, not here, so it binds every path into
 * the value rather than only this screen.
 *
 * ⚠ A SEPARATE FILE FROM `wagesRegister.js`, DELIBERATELY. That one is advisor-facing and
 * client-scoped: it reads a named client's cases and writes an attributable record, behind
 * `firmAuth` and the due-diligence gate. This one is manager-facing and firm-scoped, behind
 * `fmGuard`, and touches no client at all. The same judgement `wagesRegister.js` records in
 * its own header about not living in `report.js`.
 *
 * ⚠ AND IT DOES NOT REUSE `meetingReview.js`'s THREE HANDLERS, though they are the same
 * shape. `registerRetention` is a different dial on purpose — its own module says why at
 * length: the meeting period is SPOKEN ALOUD to a client in approved consent wording, and
 * one function serving both is how a promise made to a client silently changes how long
 * registers of named staff are kept. Sharing handlers would rebuild that coupling in the
 * one layer where nobody would look for it.
 *
 * Node 14, CommonJS.
 */

const fs = require('fs')
const path = require('path')
const { sendError } = require('../utils/sendError')
const overlay = require('../utils/firmOverlay')
const { devFallbackAllowed } = require('../utils/dbFailure')
const {
  CONFIG_KEY,
  DEV_FILE,
  PLATFORM_DEFAULT_MONTHS,
  MIN_MONTHS,
  MAX_MONTHS,
  validateRetentionMonths,
  loadOwnRetention,
  loadResolvedRetention,
  retentionPhrase
} = require('../utils/registerRetention')

/**
 * A storage fault, reported without saying what broke.
 * @param {object} res
 * @param {Error} err
 * @param {string} what - the action, for the message the manager reads
 */
function serverError (res, err, what) {
  console.error('[register-retention] failed to ' + what + ':', err.message)
  return sendError(res, 500, 'DB_ERROR', 'Could not ' + what + '. Please try again.')
}

/** Dev-only: the whole `{ scopeId: value }` map. */
function devReadAll () {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), DEV_FILE), 'utf8'))
  } catch (_e) { return {} }
}

/** Dev-only: write or clear one scope's value. */
function devWrite (scopeId, value) {
  const all = devReadAll()
  if (value === null) { delete all[scopeId] } else { all[scopeId] = value }
  fs.writeFileSync(path.resolve(process.cwd(), DEV_FILE), JSON.stringify(all, null, 2))
}

/**
 * The overlay reader the cascade walks with, falling back to the dev file so the tier chain
 * behaves the same way with and without a database.
 *
 * ⚠ The fallback is refused when a live server REFUSED the statement (`dbFailure`), so a
 * rejected read can never answer with the platform default dressed up as a firm's choice.
 * The key is checked too: this fallback exists for one config key and must not quietly
 * answer for another that happens to fail.
 */
async function readScopeConfig (scopeId, key) {
  try {
    return await overlay.loadFirmConfig(scopeId, key)
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    if (key !== CONFIG_KEY) { throw err }
    const all = devReadAll()
    return Object.prototype.hasOwnProperty.call(all, scopeId) ? all[scopeId] : null
  }
}

/** Write or clear this scope's value, with the same dev fallback. */
async function writeScopeConfig (scopeId, value, savedBy) {
  try {
    await overlay.saveFirmConfig(scopeId, CONFIG_KEY, value, savedBy)
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    devWrite(scopeId, value)
  }
}

/**
 * GET /api/firm-manager/register-retention  (manager)
 *
 * What this scope keeps staff registers for, what it set itself, and the range it may
 * choose. `resolved.source` is what the screen badges — set here, inherited, or the
 * platform's — so a manager can tell a figure they chose from one they are living under.
 *
 * @route GET /api/firm-manager/register-retention
 * @returns {{resolved: object, ownMonths: (number|null), platformDefault: number,
 *   min: number, max: number, phrase: string}}
 */
async function getRetention (req, res) {
  try {
    const resolved = await loadResolvedRetention(req.firmId, readScopeConfig)
    const ownMonths = await loadOwnRetention(req.firmId, readScopeConfig)
    res.send(200, {
      resolved,
      ownMonths,
      platformDefault: PLATFORM_DEFAULT_MONTHS,
      min: MIN_MONTHS,
      max: MAX_MONTHS,
      phrase: retentionPhrase(resolved.months)
    })
  } catch (err) {
    return serverError(res, err, 'read the retention period')
  }
}

/**
 * PUT /api/firm-manager/register-retention  (manager)
 *
 * ⚠ THIS SHORTENS OR LENGTHENS HOW LONG NAMED EMPLOYEES' PAY AND LEAVE DATA IS KEPT — people
 * who consented to nothing and will never see this screen. The value is validated rather
 * than stored as typed, and the 18-month ceiling is applied in the validator so it cannot be
 * bypassed by any other caller.
 *
 * ⚠ IT DELETES NOTHING. The dial answers *how long*; no purge runs against staff registers
 * and Decision 8 asked for none. Shortening the period changes the date the register shows,
 * not what exists today.
 *
 * @route PUT /api/firm-manager/register-retention
 * @param {object} req.body - `{ months: number }`
 * @returns {{saved: true, months: number, phrase: string}}
 */
async function setRetention (req, res) {
  const checked = validateRetentionMonths((req.body || {}).months)
  if (!checked.ok) {
    return sendError(res, 400, 'INVALID_RETENTION', checked.errors.join('; '))
  }
  try {
    await writeScopeConfig(req.firmId, { months: checked.value }, req.userEmail)
    res.send(200, {
      saved: true,
      months: checked.value,
      phrase: retentionPhrase(checked.value)
    })
  } catch (err) {
    return serverError(res, err, 'save the retention period')
  }
}

/**
 * DELETE /api/firm-manager/register-retention  (manager)
 *
 * Drop this scope's figure so the level above applies again — and keeps applying as that
 * level changes it. That is the point of the cascade rather than a convenience: a firm that
 * resets is not set back to a frozen copy of today's number.
 *
 * Idempotent: resetting a scope that has set nothing is a success, because the caller's
 * intent — "inherit from above" — is already true.
 *
 * @route DELETE /api/firm-manager/register-retention
 * @returns {{reset: true, resolved: object, phrase: string}}
 */
async function resetRetention (req, res) {
  try {
    await writeScopeConfig(req.firmId, null, req.userEmail)
    const resolved = await loadResolvedRetention(req.firmId, readScopeConfig)
    res.send(200, { reset: true, resolved, phrase: retentionPhrase(resolved.months) })
  } catch (err) {
    return serverError(res, err, 'reset the retention period')
  }
}

module.exports = {
  getRetention,
  setRetention,
  resetRetention,
  // Exported for the tests, which drive the cascade through a stubbed overlay rather than
  // a real database.
  readScopeConfig,
  writeScopeConfig
}
