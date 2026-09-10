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
 * Spend one of this firm's readings, or refuse.
 *
 * Never throws: every failure is returned as a refusal the route can send straight on, so a
 * caller can never accidentally let a reading through by catching nothing.
 *
 * @param {string} scopeId - the VERIFIED scope from the JWT, never client-supplied
 * @param {string} [savedBy] - the verified user, recorded on the version row
 * @param {Date} [now] - injected by tests; the clock otherwise
 * @returns {Promise<{ok: boolean, used: number, remaining: number, status: (number|undefined),
 *   code: (string|undefined), message: (string|undefined)}>}
 */
async function consume (scopeId, savedBy, now) {
  const at = now instanceof Date ? now : new Date()
  const nowMs = at.getTime()

  let stored
  try {
    stored = await overlay.loadFirmConfig(scopeId, CONFIG_KEY)
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
    stored = devRead(scopeId)
  }

  const loads = _within(stored, nowMs)
  if (loads.length >= LIMIT) {
    return {
      ok: false,
      used: loads.length,
      remaining: 0,
      status: 429,
      code: 'AI_LOAD_LIMIT',
      message: LIMIT_MESSAGE
    }
  }

  // Anything outside the window is dropped on the way past, so the stored list stays at
  // twenty-odd entries forever rather than growing for the life of the firm.
  const next = { loads: loads.concat([at.toISOString()]) }
  try {
    await overlay.saveFirmConfig(scopeId, CONFIG_KEY, next, savedBy || '')
  } catch (err) {
    if (!devFallbackAllowed(err)) {
      // The same reasoning as the read: a reading we cannot record is a reading nobody can
      // count, and an uncountable reading is exactly what this exists to stop.
      console.error('[ai-load-budget] budget write failed:', err.message)
      return {
        ok: false,
        used: loads.length,
        remaining: LIMIT - loads.length,
        status: 503,
        code: 'BUDGET_UNAVAILABLE',
        message: UNAVAILABLE_MESSAGE
      }
    }
    devWrite(scopeId, next)
  }

  return { ok: true, used: next.loads.length, remaining: LIMIT - next.loads.length }
}

module.exports = {
  CONFIG_KEY,
  LIMIT,
  WINDOW_MS,
  LIMIT_MESSAGE,
  UNAVAILABLE_MESSAGE,
  consume
}
