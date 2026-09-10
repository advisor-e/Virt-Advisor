'use strict'

/**
 * aiLoadBudget — how many tax documents one firm may have the AI read, in any 24 hours.
 *
 * Item 4.82. Loading a document sends it to the model and every reading is paid for.
 * Nothing capped how many one firm could set off: the proposal store keeps 20 documents,
 * but it TRIMS AFTER THE MODEL HAS BEEN PAID, which is a tidy-up and not a limit.
 *
 * Mike's rulings, 2026-09-11, each answered on its own:
 *   1. The cap is counted PER FIRM — the firm is what pays, and `req.firmId` is the one
 *      identity every route here already has verified. Per-advisor would need identity data
 *      that belongs to Advisor-e and has not arrived, which would leave the cap unbuilt.
 *   2. The cap is 20. Not a round number picked for neatness: the proposal store only ever
 *      KEEPS 20 documents, so a firm paying for more than 20 readings in a day is paying for
 *      readings it cannot keep.
 *   3. ONE SHARED COUNT for advisors and managers together. They reach the same handler
 *      through two routes; two pools of 20 would let a firm spend 40.
 *   4. A ROLLING 24 HOURS, not a daily reset. A fixed reset needs a clock, and every clock
 *      is wrong somewhere: midnight UTC lands at midday in New Zealand, so a firm could
 *      spend 20 before lunch and 20 after; midnight local hardcodes one country into a
 *      feature whose entire purpose is that firms are in different countries; and either
 *      way 20 at 23:59 and 20 more at 00:01 is 40 in two minutes.
 *   5. IT FAILS CLOSED. A store we cannot read is exactly when we cannot know what has
 *      already been spent, so the reading is refused. Same direction as his fail-closed
 *      ruling on roles (2026-08-10). It costs nothing elsewhere: reading rates has its own
 *      fallback and never touches this, so no forecast is affected.
 *
 * 🔴 THE COUNT IS SPENT BEFORE THE MODEL IS CALLED, NEVER AFTER. `consume()` records the
 * reading and only then does the caller send the file. A cap that recorded afterwards would
 * be the same fault as the store's 20-document trim — it would count what had already been
 * paid for. The consequence, stated rather than discovered later: a reading the model
 * answers badly still spends one, because it was still paid for. A file refused BEFORE this
 * point — not a PDF, no file, an unparseable body — never reaches here and so costs nothing.
 *
 * ⚠ HONEST LIMIT: read-then-write, not a transaction. Two requests arriving in the same
 * instant can both read 19 and both proceed, so the true ceiling is 20 plus whatever is in
 * flight. This is a spending guard, not a security boundary, and the alternative — locking a
 * row on every document load — buys a rounding error at the price of a new failure mode.
 */

const fs = require('fs')
const path = require('path')
const overlay = require('./firmOverlay')
const { devFallbackAllowed } = require('./dbFailure')

/** Its own config key, so it can never disturb the rates or the proposals beside it. */
const CONFIG_KEY = 'ai-document-loads'

/** Readings per firm per rolling window. Mike, 2026-09-11. */
const LIMIT = 20

/**
 * 🔴 THE SECOND ALLOWANCE — a COUNTRY SCHEDULE, and it is deliberately kept apart from the 20.
 *
 * Mike's ruling, 2026-09-11 (item 4.92): *a country schedule has its own reading allowance,
 * kept apart from any firm's 20 a day.* The reasoning he accepted: loading a country's whole
 * schedule once is the thing that STOPS every firm in the group paying to re-read the same
 * document, so charging it to a firm's daily allowance would penalise exactly the behaviour the
 * feature exists to produce. It is also a different act by a different person at a different
 * tier — one global group manager, a handful of times a year.
 *
 * ⚠ COUNTED IN SCHEDULES, NOT IN MODEL CALLS, and that is the point of a separate counter. One
 * schedule is a survey plus one request per eight pages — seven for IR265's 52 table pages, nine
 * for a 71-page one. Counting the calls would make the allowance mean "how long is your
 * country's document", which is not a thing anyone can plan around.
 *
 * The number is 10, ruled by Mike on 2026-09-11. Ten covers a first-day setup for a group
 * operating in up to ten countries, including a couple of retries on a document that fights
 * back, while still stopping the runaway this exists for — a loop, or somebody re-loading a
 * failing file, hits it within minutes. The cost he accepted with it: a group in more than ten
 * countries loads them over two days, which is a one-off.
 */
const SCHEDULE_CONFIG_KEY = 'country-schedule-loads'

/** Country schedules per scope per rolling window. Mike, 2026-09-11. */
const SCHEDULE_LIMIT = 10

const WINDOW_MS = 24 * 60 * 60 * 1000

/**
 * Mike's approved wording, 2026-09-11. It names the FIRM rather than the person, because the
 * limit is the firm's and the advisor in front of it may not be the one who used it up; it
 * says when the door opens again; and it deliberately does not say "ask your manager",
 * because no manager can raise it and sending someone on that errand wastes their afternoon.
 */
const LIMIT_MESSAGE =
  'Your firm has used all 20 document readings for today. ' +
  'Nothing has been lost — you can load this document again tomorrow.'

/**
 * Mike's approved wording for the fail-closed case, 2026-09-11. It is its own sentence
 * because we cannot claim the firm has used all 20 when the truth is that we do not know.
 */
const UNAVAILABLE_MESSAGE =
  "Document readings can't be checked right now. Please try again shortly."

/**
 * 🔴 MIKE'S APPROVED WORDING, 2026-09-11 (item 4.92), and load-bearing for the same reason the
 * sentence above is. It follows the shape he settled for the document cap: it names the GROUP
 * rather than the person, because the manager reading it may not be the one who used it up; it
 * says when the door opens again; and it deliberately does not say *ask your manager*, because
 * nobody can raise it and promising that sends someone on an errand that goes nowhere.
 */
const SCHEDULE_LIMIT_MESSAGE =
  'Your group has used all 10 country schedule readings for today. ' +
  'Nothing has been lost — you can load this schedule again tomorrow.'

/** Dev-only mirror, for a developer machine with no MySQL. Gitignored, like every sibling. */
const DEV_FILE = path.resolve(__dirname, '../../data/dev-ai-load-budget.json')

/** Dev-only: this scope's stored value, or null. */
function devRead (scopeId) {
  try {
    const all = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8'))
    const own = all[scopeId]
    return (own && typeof own === 'object' && !Array.isArray(own)) ? own : null
  } catch (e) { return null }
}

/** Dev-only: persist this scope's stored value. */
function devWrite (scopeId, value) {
  let all = {}
  try { all = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8')) } catch (e) { all = {} }
  all[scopeId] = value
  fs.writeFileSync(DEV_FILE, JSON.stringify(all, null, 2))
}

/**
 * The timestamps inside the window, oldest first.
 *
 * A stored value we cannot understand is treated as NO READINGS rather than as a failure.
 * That is the deliberate direction for this one case: a corrupt counter would otherwise lock
 * a firm out of a feature permanently with no way back, and the thing at stake is a bill,
 * not anyone's data. It is not the same case as rule 5 above — there the store did not
 * answer at all, and we cannot tell an empty count from a spent one.
 *
 * @param {*} stored - whatever the overlay held for CONFIG_KEY
 * @param {number} nowMs
 * @returns {string[]} ISO timestamps of readings still inside the window
 */
function _within (stored, nowMs) {
  const raw = stored && Array.isArray(stored.loads) ? stored.loads : []
  return raw.filter((value) => {
    if (typeof value !== 'string') { return false }
    const at = Date.parse(value)
    // A reading exactly 24 hours old has left the window and frees its slot.
    return !isNaN(at) && (nowMs - at) < WINDOW_MS
  })
}

/**
 * Spend one reading from a named allowance, or refuse.
 *
 * ⚠ EXTRACTED FROM `consume` WHEN THE SECOND ALLOWANCE ARRIVED (item 4.92, 2026-09-11), and
 * `consume`'s own tests are the proof the move changed nothing. Every rule in this file's
 * header applies unchanged to both allowances — spent before the model is called, rolling
 * window, fails closed, read-then-write rather than a transaction. Two copies of that reasoning
 * would be two places for it to rot.
 *
 * Never throws: every failure is returned as a refusal the route can send straight on, so a
 * caller can never accidentally let a reading through by catching nothing.
 *
 * @param {object} opts
 * @param {string} opts.scopeId - the VERIFIED scope from the JWT, never client-supplied
 * @param {string} opts.configKey - which allowance; each has its own, so one can never spend
 *   the other's
 * @param {number} opts.limit
 * @param {string} opts.limitMessage - what the person is told at the limit
 * @param {string} opts.code - the refusal code the screen switches on
 * @param {string} [opts.savedBy] - the verified user, recorded on the version row
 * @param {Date} [opts.now] - injected by tests; the clock otherwise
 * @returns {Promise<{ok: boolean, used: number, remaining: number, status: (number|undefined),
 *   code: (string|undefined), message: (string|undefined)}>}
 */
async function _spend (opts) {
  const at = opts.now instanceof Date ? opts.now : new Date()
  const nowMs = at.getTime()
  // Dev mirrors are per allowance too, or a developer's schedule loads would be counted
  // against their document loads on a machine with no MySQL.
  const devScope = opts.configKey + '|' + opts.scopeId

  let stored
  try {
    stored = await overlay.loadFirmConfig(opts.scopeId, opts.configKey)
  } catch (err) {
    if (!devFallbackAllowed(err)) {
      // Rule 5: we cannot see what has been spent, so nothing more is spent.
      console.error('[ai-load-budget] budget read failed:', err.message)
      return {
        ok: false,
        used: 0,
        remaining: 0,
        status: 503,
        code: 'BUDGET_UNAVAILABLE',
        message: UNAVAILABLE_MESSAGE
      }
    }
    stored = devRead(devScope)
  }

  const loads = _within(stored, nowMs)
  if (loads.length >= opts.limit) {
    return {
      ok: false,
      used: loads.length,
      remaining: 0,
      status: 429,
      code: opts.code,
      message: opts.limitMessage
    }
  }

  // Anything outside the window is dropped on the way past, so the stored list stays at
  // twenty-odd entries forever rather than growing for the life of the firm.
  const next = { loads: loads.concat([at.toISOString()]) }
  try {
    await overlay.saveFirmConfig(opts.scopeId, opts.configKey, next, opts.savedBy || '')
  } catch (err) {
    if (!devFallbackAllowed(err)) {
      // The same reasoning as the read: a reading we cannot record is a reading nobody can
      // count, and an uncountable reading is exactly what this exists to stop.
      console.error('[ai-load-budget] budget write failed:', err.message)
      return {
        ok: false,
        used: loads.length,
        remaining: opts.limit - loads.length,
        status: 503,
        code: 'BUDGET_UNAVAILABLE',
        message: UNAVAILABLE_MESSAGE
      }
    }
    devWrite(devScope, next)
  }

  return { ok: true, used: next.loads.length, remaining: opts.limit - next.loads.length }
}

/**
 * Spend one of this firm's DOCUMENT readings, or refuse. Item 4.82, the 20 a day.
 *
 * @param {string} scopeId - the VERIFIED scope from the JWT, never client-supplied
 * @param {string} [savedBy] - the verified user, recorded on the version row
 * @param {Date} [now] - injected by tests; the clock otherwise
 * @returns {Promise<object>} see `_spend`
 */
function consume (scopeId, savedBy, now) {
  return _spend({
    scopeId,
    savedBy,
    now,
    configKey: CONFIG_KEY,
    limit: LIMIT,
    limitMessage: LIMIT_MESSAGE,
    code: 'AI_LOAD_LIMIT'
  })
}

/**
 * Spend one of this scope's COUNTRY SCHEDULE loads, or refuse. Item 4.92, the 10 a day.
 *
 * 🔴 ONE SCHEDULE IS ONE READING HERE, however many model calls it takes. See
 * `SCHEDULE_CONFIG_KEY` above: counting the calls would make the allowance mean "how long is
 * your country's document", which nobody can plan around.
 *
 * ⚠ IT NEVER TOUCHES THE FIRM'S 20, and the separate config key is what guarantees that rather
 * than a rule somebody has to remember.
 *
 * @param {string} scopeId - the VERIFIED scope from the JWT, never client-supplied
 * @param {string} [savedBy] - the verified user, recorded on the version row
 * @param {Date} [now] - injected by tests; the clock otherwise
 * @returns {Promise<object>} see `_spend`
 */
function consumeScheduleLoad (scopeId, savedBy, now) {
  return _spend({
    scopeId,
    savedBy,
    now,
    configKey: SCHEDULE_CONFIG_KEY,
    limit: SCHEDULE_LIMIT,
    limitMessage: SCHEDULE_LIMIT_MESSAGE,
    code: 'SCHEDULE_LOAD_LIMIT'
  })
}

module.exports = {
  CONFIG_KEY,
  LIMIT,
  SCHEDULE_CONFIG_KEY,
  SCHEDULE_LIMIT,
  WINDOW_MS,
  LIMIT_MESSAGE,
  SCHEDULE_LIMIT_MESSAGE,
  UNAVAILABLE_MESSAGE,
  consume,
  consumeScheduleLoad
}
