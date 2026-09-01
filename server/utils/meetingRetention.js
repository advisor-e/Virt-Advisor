'use strict'

/**
 * @file How long a firm keeps a meeting transcript — the one number inside the fixed
 *   consent wording that is not fixed.
 * @module server/utils/meetingRetention
 *
 * Design: `design/features/meeting-review.md` P8. Artefact:
 * `design/MEETING-CONSENT-WORDING.md` — read its banner before touching this file.
 *
 * 🔴 THIS EXISTS BECAUSE THE NUMBER IS SPOKEN ALOUD TO A CLIENT. The consent wording is
 * fixed and a firm may not edit it (Mike, 2026-09-01), but P8 lets a firm move its own
 * retention clock, and the approved screen quotes that figure back to the client. Those two
 * rulings meet in this one value. A build that types "18 months" into the sentence has
 * advisors telling clients something untrue the day a firm changes the dial, and nothing on
 * screen would ever say so — which is why the figure is resolved here and rendered, never
 * written into the words.
 *
 * ⚠ SO `PLATFORM_DEFAULT_MONTHS` IS A DEFAULT, NOT A CONSTANT. Nothing may read it as the
 * answer for a firm. `loadResolvedRetention` is the only correct way to learn what a given
 * scope keeps transcripts for, and it is what the consent route calls.
 *
 * The mechanism is `firmOverlay` under one config key, cascading up the tier chain exactly
 * as the observation points do — so version history and restore come free, and a firm that
 * has set nothing keeps tracking the level above rather than being frozen at today's figure.
 *
 * Node 14, CommonJS.
 */

const fs = require('fs')
const path = require('path')
const { parentScopeOf } = require('./tierChain')
const { devFallbackAllowed: IS_DEV } = require('./dbFailure')

/**
 * The overlay address. ONE key, unlike the observation points' three — this is a single
 * scalar setting, not a list of rows with "switch this one off" and "add my own" to
 * express, so `resolveInheritedRows` has nothing to do here.
 * @type {string}
 */
const CONFIG_KEY = 'meeting-retention'

/** Dev-only stand-in, used when there is no MySQL. See `_load`. */
const DEV_FILE = 'data/dev-meeting-retention.json'

/**
 * The platform's default, ruled by Mike on 2026-09-01.
 *
 * ⚠ NOT A CONSTANT TO READ DIRECTLY — see this file's header. It is where the cascade ends,
 * nothing more.
 * @type {number}
 */
const PLATFORM_DEFAULT_MONTHS = 18

/**
 * The range a firm may set.
 *
 * Bounds exist because this number is SPOKEN TO A CLIENT. A mistyped 1800 would have an
 * advisor promising a 150-year retention period out loud, and a 0 would have them promising
 * a transcript that is deleted before it is written. Ten years is past any retention period
 * a professional-services firm has a reason to claim; one month is the shortest that still
 * leaves a meeting reviewable.
 */
const MIN_MONTHS = 1
const MAX_MONTHS = 120

/**
 * Where a resolved figure came from — what the manager's screen badges.
 * @type {Object.<string, string>}
 */
const RETENTION_SOURCES = {
  platform: 'platform-default',
  inherited: 'inherited',
  own: 'set-here'
}

/**
 * Checks a submitted retention period.
 *
 * Fails closed, and refuses a non-integer rather than rounding one: "17.5 months" spoken to a
 * client is a figure nobody chose, and silently rounding a manager's typing into a promise
 * made aloud is worse than refusing it.
 *
 * @param {*} value - the submitted months
 * @returns {{ok: boolean, errors: string[], value: (number|null)}}
 */
function validateRetentionMonths (value) {
  const errors = []

  if (typeof value !== 'number' || !isFinite(value)) {
    return { ok: false, errors: ['months must be a number'], value: null }
  }
  if (!Number.isInteger(value)) {
    return { ok: false, errors: ['months must be a whole number of months'], value: null }
  }
  if (value < MIN_MONTHS || value > MAX_MONTHS) {
    errors.push('months must be between ' + MIN_MONTHS + ' and ' + MAX_MONTHS)
  }

  return { ok: errors.length === 0, errors, value: errors.length === 0 ? value : null }
}

/**
 * Reads a stored value back, keeping only what is well-formed.
 *
 * NEVER THROWS. Malformed storage reads as "this scope has set nothing", so the cascade
 * carries on to the level above rather than failing the consent screen — an advisor who
 * cannot open the consent screen cannot record a meeting they have a client sitting in
 * front of them for.
 *
 * @param {*} stored - whatever came back from the overlay
 * @returns {number|null} the months set here, or null when nothing usable is stored
 */
function readStoredRetention (stored) {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) { return null }
  const checked = validateRetentionMonths(stored.months)
  return checked.ok ? checked.value : null
}

/** Dev-only: the whole `{ scopeId: value }` map. */
function _readDevMap () {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), DEV_FILE), 'utf8'))
  } catch (_e) {
    return {}
  }
}

/**
 * Load this scope's stored value, preferring the injected loader.
 *
 * THE FALLBACK IS DEV-ONLY, DELIBERATELY — `dbFailure.devFallbackAllowed` refuses it when a
 * live server REFUSED the statement, so a production outage can never be dressed up as
 * "this firm has not set a retention period" and answered with the platform default. That
 * would be a figure nobody chose, spoken to a client as though they had.
 *
 * @param {Function} loadFirmConfig - async (scopeId, key) => stored value
 * @param {string} scopeId
 * @returns {Promise<*>}
 * @throws in production, when the store cannot be read
 */
async function _load (loadFirmConfig, scopeId) {
  try {
    const value = await loadFirmConfig(scopeId, CONFIG_KEY)
    return (value === null || value === undefined) ? null : value
  } catch (err) {
    if (!IS_DEV(err)) { throw err }
    const map = _readDevMap()
    return Object.prototype.hasOwnProperty.call(map, scopeId) ? map[scopeId] : null
  }
}

/**
 * What this scope has set ITSELF. No cascade — the raw read.
 *
 * @param {string|null} scopeId - the authenticated scope, never client-supplied
 * @param {Function} loadFirmConfig - async (scopeId, key) => stored value
 * @returns {Promise<number|null>} months, or null when this scope has set nothing
 */
async function loadOwnRetention (scopeId, loadFirmConfig) {
  if (!scopeId) { return null }
  return readStoredRetention(await _load(loadFirmConfig, scopeId))
}

/**
 * The retention period in force at a scope, and where it came from.
 *
 * Recurses up the tier chain exactly as `loadResolvedObservations` does: the nearest level
 * that has set a figure wins, and the platform default is where the chain ends.
 *
 * NEVER REJECTS. A storage fault falls back to the level above and logs, for the reason in
 * `readStoredRetention` — the consent screen must open.
 *
 * @param {string|null} scopeId
 * @param {Function} loadFirmConfig - async (scopeId, key) => stored value
 * @returns {Promise<{months: number, source: string, setAtScope: (string|null)}>}
 */
async function loadResolvedRetention (scopeId, loadFirmConfig) {
  const platform = {
    months: PLATFORM_DEFAULT_MONTHS,
    source: RETENTION_SOURCES.platform,
    setAtScope: null
  }
  if (!scopeId) { return platform }

  let own
  try {
    own = await loadOwnRetention(scopeId, loadFirmConfig)
  } catch (err) {
    console.error('[meeting-retention] scope read failed:', err.message)
    own = null
  }

  if (own !== null) {
    return { months: own, source: RETENTION_SOURCES.own, setAtScope: scopeId }
  }

  const parent = parentScopeOf(scopeId)
  if (parent === null) { return platform }

  const above = await loadResolvedRetention(parent, loadFirmConfig)
  return {
    months: above.months,
    // Anything reached by walking upward is INHERITED from here, even where the level above
    // was itself using the platform default — the distinction the screen has to draw is
    // "somebody above me chose this" versus "I chose this", and `setAtScope` carries the rest.
    source: above.setAtScope === null ? RETENTION_SOURCES.platform : RETENTION_SOURCES.inherited,
    setAtScope: above.setAtScope
  }
}

/**
 * The figure as the advisor reads it aloud — the only place months become words.
 *
 * 🔴 THIS IS THE SUBSTITUTION THE CONSENT SCREEN MAKES, and it is the whole reason this
 * module exists. The approved sentence is fixed; this supplies the one value inside it.
 * Singular is handled because "kept for 1 months" in front of a client is the kind of
 * carelessness that makes the rest of the sentence sound untrue too.
 *
 * @param {number} months
 * @returns {string} e.g. "18 months", "1 month"
 */
function retentionPhrase (months) {
  const n = Number(months)
  if (!Number.isInteger(n) || n < 1) { return PLATFORM_DEFAULT_MONTHS + ' months' }
  return n === 1 ? '1 month' : n + ' months'
}

module.exports = {
  CONFIG_KEY,
  DEV_FILE,
  PLATFORM_DEFAULT_MONTHS,
  MIN_MONTHS,
  MAX_MONTHS,
  RETENTION_SOURCES,
  validateRetentionMonths,
  readStoredRetention,
  loadOwnRetention,
  loadResolvedRetention,
  retentionPhrase
}
