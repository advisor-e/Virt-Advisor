'use strict'

/**
 * registerRetention — how long a firm keeps a staff register.
 *
 * @module server/utils/registerRetention
 *
 * Decision 8 of `design/mockups/wages-model.html`, RULED BY MIKE 2026-09-14 **against the
 * recommendation**: the register is *kept on the firm's own retention dial*, not deleted when
 * the deal closes. His reasoning, recorded there: a restructure is challenged years later,
 * *"exactly the moment a dispute is most likely"* — and the record protects both sides, the
 * firm showing the reasoning was financial and a former employee seeing what was actually
 * recorded about their role. Deals also go quiet and restart, and auto-deletion would throw
 * away real work with no way back.
 *
 * 🔴 WHY THIS IS ITS OWN DIAL AND NOT `meetingRetention` (Mike, question 4, 2026-09-15). The
 * drawing first proposed reusing "the firm's existing retention dial". Reading
 * `server/utils/meetingRetention.js` showed there is no general one: what exists is
 * `meeting-retention`, and its own file says it is how long a firm keeps A MEETING
 * TRANSCRIPT — a period **spoken aloud to a client** in the recorded consent wording. Sharing
 * one number would mean a firm changing what it promises a client out loud silently changing
 * how long it keeps registers of named staff, and the reverse. One dial, two promises, is the
 * coupling nobody remembers at the moment they move it.
 *
 * SAME MECHANISM, THOUGH, and deliberately: `firmOverlay` under one config key, cascading the
 * tier chain, so version history and restore come free and a firm that has set nothing
 * inherits from above. The shared reasoning for the dev-only fallback, for refusing a
 * non-integer, and for never rejecting on a storage fault is written out once in
 * `meetingRetention.js`; this file states only what differs.
 *
 * ⚠ WHAT THIS MODULE DOES AND DOES NOT DO. It answers *how long*. It does not delete
 * anything: no purge runs against staff registers, and Decision 8 asked for none — it asked
 * for a visible clock the firm sets. The register screen shows the resulting date and never
 * the setting.
 *
 * Node 14, CommonJS.
 */

const fs = require('fs')
const path = require('path')
const { devFallbackAllowed: IS_DEV } = require('./dbFailure')
const { parentScopeOf } = require('./tierChain')

/** Its own key. Never `meeting-retention` — see the header. */
const CONFIG_KEY = 'register-retention'

/** Dev-only stand-in, used when there is no MySQL. */
const DEV_FILE = 'data/dev-register-retention.json'

/**
 * The platform's default, set at the mentor tier: eighteen months.
 *
 * 🔴 RULED BY MIKE, 2026-09-23: *"i think i asked for the data holding period to be no more
 * than 18months - this should flow down from mentor - through the cascade levels and then at
 * firm manager - be editable again. this way, at least a set period is loaded as a default."*
 *
 * ⚠ **IT WAS 84 MONTHS UNTIL THAT DAY, AND THAT FIGURE WAS NEVER HIS.** Decision 8 of
 * `design/mockups/wages-model.html` ruled only that the register is **kept on a retention
 * dial rather than deleted at deal-end** — it named no number. The seven years, and the
 * twelve-month floor below it, were written here afterwards by us and then read back by
 * later sessions as though he had chosen them. A default nobody authorised is how a
 * privacy setting drifts long without anyone deciding it should.
 *
 * ⚠ **THE COST, STATED RATHER THAN DISCOVERED.** The old comment argued seven years because
 * a restructure is challenged years later. Under 18 months a firm cannot hold the register
 * that long, and that is the intended outcome: this is personal data about named employees
 * who consented to nothing, so the short life is the point. Decision 8's purpose — the
 * register surviving the end of the deal rather than being deleted with it — is unaffected.
 *
 * ⚠ Where the cascade ends, nothing more — read it through `loadResolvedRetention`.
 * @type {number}
 */
const PLATFORM_DEFAULT_MONTHS = 18

/**
 * The range any tier may set: one month to eighteen.
 *
 * 🔴 **THE CEILING IS THE RULING, NOT A GUARD RAIL.** "No more than 18 months" binds every
 * tier including the mentor's own, so it is enforced in `validateRetentionMonths` — the one
 * place every read and every write passes through — rather than only on the screen that
 * sets it. A tier cannot raise it, and a stored value above it reads back as "nothing set"
 * and falls through to the level above (`readStoredRetention`), so a figure written before
 * this ruling cannot keep applying.
 *
 * The floor matches `meetingRetention`'s one month. There is no reason to force a firm to
 * keep personal data for longer than it wants to.
 */
const MIN_MONTHS = 1
const MAX_MONTHS = 18

/** Where a resolved figure came from — what a manager's screen badges. */
const RETENTION_SOURCES = {
  platform: 'platform-default',
  inherited: 'inherited',
  own: 'set-here'
}

/**
 * Checks a submitted retention period. Fails closed, and refuses a non-integer rather than
 * rounding one.
 * @param {*} value - the submitted months
 * @returns {{ok: boolean, errors: string[], value: (number|null)}}
 */
function validateRetentionMonths (value) {
  if (typeof value !== 'number' || !isFinite(value)) {
    return { ok: false, errors: ['months must be a number'], value: null }
  }
  if (!Number.isInteger(value)) {
    return { ok: false, errors: ['months must be a whole number of months'], value: null }
  }
  if (value < MIN_MONTHS || value > MAX_MONTHS) {
    return {
      ok: false,
      errors: ['months must be between ' + MIN_MONTHS + ' and ' + MAX_MONTHS],
      value: null
    }
  }
  return { ok: true, errors: [], value }
}

/**
 * Reads a stored value back, keeping only what is well-formed. NEVER THROWS: malformed
 * storage reads as "this scope has set nothing" and the cascade carries on above.
 * @param {*} stored
 * @returns {number|null}
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
 * Load this scope's stored value, preferring the injected loader. The fallback is dev-only,
 * so a production outage can never be dressed up as "this firm has set nothing".
 * @param {Function} loadFirmConfig - async (scopeId, key) => stored value
 * @param {string} scopeId
 * @returns {Promise<*>}
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
 * @param {string|null} scopeId - the authenticated scope, never client-supplied
 * @param {Function} loadFirmConfig
 * @returns {Promise<number|null>}
 */
async function loadOwnRetention (scopeId, loadFirmConfig) {
  if (!scopeId) { return null }
  return readStoredRetention(await _load(loadFirmConfig, scopeId))
}

/**
 * The retention period in force at a scope, and where it came from. Recurses up the tier
 * chain; the platform default ends it. Never rejects.
 * @param {string|null} scopeId
 * @param {Function} loadFirmConfig
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
    console.error('[register-retention] scope read failed:', err.message)
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
    source: above.setAtScope === null ? RETENTION_SOURCES.platform : RETENTION_SOURCES.inherited,
    setAtScope: above.setAtScope
  }
}

/**
 * The date a register opened now would be kept until — what the screen says in plain words.
 *
 * Counted from the day the register was opened, not from today, so the sentence on a register
 * opened last year does not drift forward every time somebody looks at it.
 *
 * @param {string} openedAt - ISO date the register was opened
 * @param {number} months - the resolved retention period
 * @returns {string|null} an ISO date, or null when the opening date is unusable
 */
function keptUntil (openedAt, months) {
  // 🔴 THE FALSY GUARD IS NOT BELT-AND-BRACES: `new Date(null)` is 1 January 1970, a
  // perfectly valid date, so without this a register with no opening date would be given a
  // retention sentence counted from the epoch. Found by the test below, not by reading.
  if (!openedAt || typeof openedAt !== 'string') { return null }
  const from = new Date(openedAt)
  if (isNaN(from.getTime())) { return null }
  const checked = validateRetentionMonths(months)
  if (!checked.ok) { return null }
  const until = new Date(from.getTime())
  until.setMonth(until.getMonth() + checked.value)
  return until.toISOString()
}

/**
 * The period in words, for a screen — the only place months become prose here.
 *
 * ⚠ A SEPARATE FUNCTION FROM `meetingRetention.retentionPhrase`, DELIBERATELY, for the same
 * reason the two dials are separate: that one renders a figure **spoken aloud to a client**
 * in approved consent wording, and must never change shape because a manager's screen wanted
 * different words. This one is read on a screen only.
 *
 * Whole years are said as years — "12 months" is the same period as "1 year" and the second
 * is how a records policy is written. Singular is handled because "1 months" on a manager's
 * screen makes the rest of the page look unconsidered.
 *
 * An out-of-range figure renders the platform default rather than throwing: a screen must
 * never show a blank where a period belongs.
 *
 * @param {number} months
 * @returns {string} e.g. "18 months", "1 year", "1 month"
 */
function retentionPhrase (months) {
  const n = Number(months)
  if (!Number.isInteger(n) || n < MIN_MONTHS || n > MAX_MONTHS) {
    return PLATFORM_DEFAULT_MONTHS + ' months'
  }
  if (n === 12) { return '1 year' }
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
  keptUntil,
  retentionPhrase
}
