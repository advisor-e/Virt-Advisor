'use strict'

/**
 * @file How long a firm has to answer a client's copy request — the clock on the screen.
 * @module server/utils/copyRequestDeadline
 *
 * Design: `design/mockups/client-record-request.html` ruling 6, Mike 2026-09-10 — *a firm-set
 * number AND unit, defaulting to 20 working days, cascading exactly like the retention dial*.
 *
 * 🔴 THE UNIT IS PART OF THE SETTING, NOT DECORATION. New Zealand allows **20 working days**;
 * the UK and EU work to **one calendar month**. A build that stores a bare number has built
 * the wrong thing.
 *
 * ⚠ AND THE TWO ARE CLOSER THAN THEY LOOK, WHICH IS EXACTLY WHY NEITHER MAY STAND IN FOR THE
 * OTHER. Before public holidays, 20 working days is **exactly four weeks — 28 calendar days,
 * from any weekday**. A calendar month is 28 to 31. So the month is **always at least as
 * long**, equal only across a non-leap February.
 *
 * 🔴 SO ONE SUBSTITUTION IS MERELY WRONG AND THE OTHER IS DANGEROUS. Showing a UK firm New
 * Zealand's figure would have them answer early — harmless. Showing a New Zealand firm "one
 * calendar month" would hand them up to three days they do not legally have, on a screen that
 * looked entirely reasonable. A test pins the arithmetic, the February edge that makes the two
 * look interchangeable, and the direction.
 *
 * ⚠ REJECTED, AND RECORDED SO IT IS NOT REACHED FOR AGAIN: hanging this off the country tables
 * that Tax Rates and Depreciation Rates now use. That is a great deal of apparatus for one
 * number, and it would make the deadline depend on the CLIENT's country when it depends on the
 * FIRM's. A firm in Auckland answering an Australian client still answers under New Zealand law.
 *
 * ⚠ SO `PLATFORM_DEFAULT` IS A DEFAULT, NOT A CONSTANT, exactly as `meetingRetention`'s is.
 * `loadResolvedDeadline` is the only correct way to learn what a given scope answers within.
 *
 * 🔴 WORKING DAYS HERE MEAN WEEKDAYS. PUBLIC HOLIDAYS ARE NOT COUNTED OUT, and cannot be — this
 * application holds no holiday calendar for any country and inventing one would be worse than
 * having none. The consequence is stated rather than hidden: the due date this computes is
 * EARLIER than a strict legal reading, because excluding only weekends uses up the allowance
 * faster than excluding weekends and holidays. That is the safe direction — the firm is
 * prompted sooner than it strictly must be — and it is why `dueDate` is an operational aid and
 * never a legal calculation. The screen says so.
 *
 * Node 14, CommonJS.
 */

const fs = require('fs')
const path = require('path')
const { parentScopeOf } = require('./tierChain')
const { devFallbackAllowed: IS_DEV } = require('./dbFailure')

/**
 * The overlay address. ONE key: this is a single setting, not a list of rows with
 * "switch this one off" to express, so `resolveInheritedRows` has nothing to do here.
 * @type {string}
 */
const CONFIG_KEY = 'client-copy-request-deadline'

/** Dev-only stand-in, used when there is no MySQL. See `_load`. */
const DEV_FILE = 'data/dev-copy-request-deadline.json'

/**
 * The three units a firm may answer in.
 *
 * 🔴 THREE, NOT TWO. `calendarMonths` exists solely so "one calendar month" — the UK and EU
 * figure — can be expressed as itself rather than approximated as 28 or 30 days. An
 * approximation would be a deadline nobody chose, and the one it replaced is a legal one.
 * @type {Object.<string, string>}
 */
const UNITS = {
  workingDays: 'working-days',
  calendarDays: 'calendar-days',
  calendarMonths: 'calendar-months'
}

/** Every valid unit, for validation and for the screen's picker. */
const UNIT_VALUES = [UNITS.workingDays, UNITS.calendarDays, UNITS.calendarMonths]

/**
 * How each unit reads to a person. Singular is handled because "1 working days left" on a
 * screen counting down to a legal deadline reads as carelessness about the deadline itself.
 * @type {Object.<string, {one: string, many: string}>}
 */
const UNIT_WORDS = {
  'working-days': { one: 'working day', many: 'working days' },
  'calendar-days': { one: 'day', many: 'days' },
  'calendar-months': { one: 'calendar month', many: 'calendar months' }
}

/**
 * The platform default: New Zealand's statutory maximum, which is where the app is sold today.
 *
 * ⚠ NOT A CONSTANT TO READ DIRECTLY — see this file's header. It is where the cascade ends.
 * A firm outside New Zealand that never touches the setting keeps this figure, which is the
 * same exposure the retention dial already carries; the Compliance declaration is what puts
 * the obligation to know better on the firm.
 */
const PLATFORM_DEFAULT = { count: 20, unit: UNITS.workingDays }

/**
 * The range a firm may set, per unit.
 *
 * Bounds exist because this figure decides when a screen starts telling somebody they are
 * late. A mistyped 3650 would silence the clock for a decade; a 0 would have every request
 * overdue the moment it was logged.
 */
const LIMITS = {
  'working-days': { min: 1, max: 260 },
  'calendar-days': { min: 1, max: 365 },
  'calendar-months': { min: 1, max: 24 }
}

/**
 * Where a resolved figure came from — what the manager's screen badges.
 * @type {Object.<string, string>}
 */
const DEADLINE_SOURCES = {
  platform: 'platform-default',
  inherited: 'inherited',
  own: 'set-here'
}

/**
 * Checks a submitted deadline.
 *
 * Fails closed, and refuses a non-integer rather than rounding one: "17.5 working days" is a
 * deadline nobody chose, and rounding a manager's typing into one silently is worse than
 * refusing it — the same rule, and the same reason, as `validateRetentionMonths`.
 *
 * @param {*} count - the submitted number
 * @param {*} unit - one of `UNIT_VALUES`
 * @returns {{ok: boolean, errors: string[], value: ({count: number, unit: string}|null)}}
 */
function validateDeadline (count, unit) {
  const errors = []

  if (typeof unit !== 'string' || !UNIT_VALUES.includes(unit)) {
    return {
      ok: false,
      errors: ['unit must be one of: ' + UNIT_VALUES.join(', ')],
      value: null
    }
  }
  if (typeof count !== 'number' || !isFinite(count)) {
    return { ok: false, errors: ['count must be a number'], value: null }
  }
  if (!Number.isInteger(count)) {
    return { ok: false, errors: ['count must be a whole number'], value: null }
  }

  const limit = LIMITS[unit]
  if (count < limit.min || count > limit.max) {
    errors.push('count must be between ' + limit.min + ' and ' + limit.max + ' for ' + unit)
  }

  return {
    ok: errors.length === 0,
    errors,
    value: errors.length === 0 ? { count, unit } : null
  }
}

/**
 * Reads a stored value back, keeping only what is well-formed.
 *
 * NEVER THROWS. Malformed storage reads as "this scope has set nothing", so the cascade
 * carries on upward rather than failing the screen — a manager who cannot open the requests
 * tab cannot answer the client waiting on it.
 *
 * @param {*} stored - whatever came back from the overlay
 * @returns {{count: number, unit: string}|null}
 */
function readStoredDeadline (stored) {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) { return null }
  const checked = validateDeadline(stored.count, stored.unit)
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

/** Dev-only: write one scope's value, or remove it when null. */
function _writeDevMap (scopeId, value) {
  const all = _readDevMap()
  if (value === null) { delete all[scopeId] } else { all[scopeId] = value }
  fs.writeFileSync(path.resolve(process.cwd(), DEV_FILE), JSON.stringify(all, null, 2))
}

/**
 * Load this scope's stored value, preferring the injected loader.
 *
 * THE FALLBACK IS DEV-ONLY, DELIBERATELY — `dbFailure.devFallbackAllowed` refuses it when a
 * live server REFUSED the statement, so a production outage can never be dressed up as
 * "this firm has not set a deadline" and answered with New Zealand's figure.
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
 * @returns {Promise<{count: number, unit: string}|null>}
 */
async function loadOwnDeadline (scopeId, loadFirmConfig) {
  if (!scopeId) { return null }
  return readStoredDeadline(await _load(loadFirmConfig, scopeId))
}

/**
 * The deadline in force at a scope, and where it came from.
 *
 * Recurses up the tier chain exactly as `loadResolvedRetention` does: the nearest level that
 * has set a figure wins, and the platform default is where the chain ends.
 *
 * NEVER REJECTS. A storage fault falls back to the level above and logs.
 *
 * @param {string|null} scopeId
 * @param {Function} loadFirmConfig - async (scopeId, key) => stored value
 * @returns {Promise<{count: number, unit: string, source: string, setAtScope: (string|null)}>}
 */
async function loadResolvedDeadline (scopeId, loadFirmConfig) {
  const platform = {
    count: PLATFORM_DEFAULT.count,
    unit: PLATFORM_DEFAULT.unit,
    source: DEADLINE_SOURCES.platform,
    setAtScope: null
  }
  if (!scopeId) { return platform }

  let own
  try {
    own = await loadOwnDeadline(scopeId, loadFirmConfig)
  } catch (err) {
    console.error('[copy-request-deadline] scope read failed:', err.message)
    own = null
  }

  if (own !== null) {
    return {
      count: own.count,
      unit: own.unit,
      source: DEADLINE_SOURCES.own,
      setAtScope: scopeId
    }
  }

  const parent = parentScopeOf(scopeId)
  if (parent === null) { return platform }

  const above = await loadResolvedDeadline(parent, loadFirmConfig)
  return {
    count: above.count,
    unit: above.unit,
    // Anything reached by walking upward is INHERITED from here, even where the level above
    // was itself on the platform default — the distinction the screen draws is "somebody above
    // me chose this" versus "I chose this", and `setAtScope` carries the rest.
    source: above.setAtScope === null ? DEADLINE_SOURCES.platform : DEADLINE_SOURCES.inherited,
    setAtScope: above.setAtScope
  }
}

/** Saturday or Sunday, in UTC. The month arithmetic elsewhere is UTC for the same reason. */
function _isWeekend (date) {
  const day = date.getUTCDay()
  return day === 0 || day === 6
}

/**
 * Add working days to a date, counting weekdays only.
 *
 * 🔴 PUBLIC HOLIDAYS ARE NOT EXCLUDED — see this file's header. The result is therefore
 * EARLIER than a strict legal reading, which is the safe direction for a deadline.
 *
 * The start day is never counted: a request received on Monday with one working day is due
 * Tuesday, not Monday.
 *
 * 🔴 A REQUEST THAT ARRIVES ON A WEEKEND IS TREATED AS ARRIVING ON THE NEXT WORKING DAY, and
 * counting starts the day after that. This is the ordinary convention, and without it an email
 * sent on Saturday would fall due a whole working day BEFORE the identical email sent on
 * Monday — the firm losing time to the hour their client happened to press send. A test pins
 * the two together.
 *
 * @param {Date} from
 * @param {number} days
 * @returns {Date}
 */
function _addWorkingDays (from, days) {
  const out = new Date(from.getTime())

  // Roll a weekend arrival forward to Monday first. That day is the arrival, so it is not
  // counted — the loop below still starts by stepping past it.
  while (_isWeekend(out)) { out.setUTCDate(out.getUTCDate() + 1) }

  let left = days
  while (left > 0) {
    out.setUTCDate(out.getUTCDate() + 1)
    if (!_isWeekend(out)) { left -= 1 }
  }
  return out
}

/**
 * When a request received at `from` falls due under a resolved deadline.
 *
 * Calendar months let `Date` normalise the overflow — 31 January plus one month is 3 March in
 * a non-leap year. ⚠ THAT IS LATER THAN THE PROMISE, and it is the opposite of the safe
 * direction everywhere else in this file. It is kept because the alternative — clamping to
 * 28 February — invents a deadline the law does not state, and because the drift is at most
 * three days against an allowance of a month. `meetingPurge.expiryOf` normalises the same way
 * for the same reason, so the two agree.
 *
 * @param {string|Date} from - when the request was received
 * @param {{count: number, unit: string}} deadline - a resolved deadline
 * @returns {Date|null} null when either argument is unusable
 */
function dueDate (from, deadline) {
  const start = from instanceof Date ? new Date(from.getTime()) : new Date(String(from))
  if (isNaN(start.getTime())) { return null }
  if (!deadline || typeof deadline !== 'object') { return null }

  const checked = validateDeadline(deadline.count, deadline.unit)
  if (!checked.ok) { return null }

  const { count, unit } = checked.value

  if (unit === UNITS.workingDays) { return _addWorkingDays(start, count) }

  const out = new Date(start.getTime())
  if (unit === UNITS.calendarDays) {
    out.setUTCDate(out.getUTCDate() + count)
  } else {
    out.setUTCMonth(out.getUTCMonth() + count)
  }
  return out
}

/**
 * How much of the allowance is left, in the firm's own unit.
 *
 * 🔴 COUNTED IN THE FIRM'S UNIT, NOT IN DAYS. A firm answering in working days is told how
 * many working days remain, because that is the number they are actually working to — telling
 * them "6 days" when four of those are a weekend is how a request is left until Monday and
 * misses.
 *
 * Negative means overdue, and the number says by how much. Zero means due today.
 *
 * @param {string|Date} from - when the request was received
 * @param {{count: number, unit: string}} deadline
 * @param {Date} [now] - injectable so a test can stand at any date
 * @returns {{due: Date, remaining: number, unit: string, overdue: boolean}|null}
 */
function timeRemaining (from, deadline, now) {
  const due = dueDate(from, deadline)
  if (!due) { return null }

  const at = now instanceof Date ? now : new Date()
  const unit = deadline.unit

  let remaining
  if (unit === UNITS.workingDays) {
    remaining = _workingDaysBetween(at, due)
  } else if (unit === UNITS.calendarMonths) {
    // Months are not a countdown unit anybody reads. A firm on "one calendar month" wants to
    // know how many DAYS are left, so the remaining figure switches unit and says which.
    remaining = _calendarDaysBetween(at, due)
    return {
      due,
      remaining,
      unit: UNITS.calendarDays,
      overdue: remaining < 0
    }
  } else {
    remaining = _calendarDaysBetween(at, due)
  }

  return { due, remaining, unit, overdue: remaining < 0 }
}

/** Whole days from `a` to `b`, by UTC calendar date so a time of day cannot skew it. */
function _calendarDaysBetween (a, b) {
  const dayA = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())
  const dayB = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate())
  return Math.round((dayB - dayA) / 86400000)
}

/** Weekdays from `a` to `b`; negative when `b` is behind `a`. Weekends count for neither. */
function _workingDaysBetween (a, b) {
  const forward = b.getTime() >= a.getTime()
  const from = forward ? a : b
  const to = forward ? b : a

  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()))
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate())

  let count = 0
  while (cursor.getTime() < end) {
    cursor.setUTCDate(cursor.getUTCDate() + 1)
    if (!_isWeekend(cursor)) { count += 1 }
  }
  // `-0` is not 0 to a strict comparison, and "due today" is decided by `=== 0` on the screen.
  // A request due today read as -0 would render as overdue by nothing at all.
  if (count === 0) { return 0 }
  return forward ? count : -count
}

/**
 * The setting as a manager reads it — "20 working days", "1 calendar month".
 *
 * @param {{count: number, unit: string}} deadline
 * @returns {string}
 */
function deadlinePhrase (deadline) {
  const checked = deadline && validateDeadline(deadline.count, deadline.unit)
  if (!checked || !checked.ok) {
    return PLATFORM_DEFAULT.count + ' ' + UNIT_WORDS[PLATFORM_DEFAULT.unit].many
  }
  const words = UNIT_WORDS[checked.value.unit]
  return checked.value.count + ' ' + (checked.value.count === 1 ? words.one : words.many)
}

/**
 * The clock as it reads on the screen — "4 working days left", "2 days overdue".
 *
 * @param {{remaining: number, unit: string}} remaining - from `timeRemaining`
 * @returns {string}
 */
function remainingPhrase (remaining) {
  if (!remaining || typeof remaining.remaining !== 'number') { return '' }
  const n = remaining.remaining
  const words = UNIT_WORDS[remaining.unit] || UNIT_WORDS['calendar-days']

  if (n === 0) { return 'due today' }
  const size = Math.abs(n)
  const word = size === 1 ? words.one : words.many
  return n < 0 ? size + ' ' + word + ' overdue' : size + ' ' + word + ' left'
}

module.exports = {
  CONFIG_KEY,
  DEV_FILE,
  UNITS,
  UNIT_VALUES,
  UNIT_WORDS,
  PLATFORM_DEFAULT,
  LIMITS,
  DEADLINE_SOURCES,
  validateDeadline,
  readStoredDeadline,
  loadOwnDeadline,
  loadResolvedDeadline,
  dueDate,
  timeRemaining,
  deadlinePhrase,
  remainingPhrase,
  _writeDevMap
}
