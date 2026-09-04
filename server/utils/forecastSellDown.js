'use strict'

/**
 * @file The price ladder imported stock sells down at — the platform's figures, with each
 *   tier's own changes merged over them.
 * @module server/utils/forecastSellDown
 *
 * Item 4.64. The ladder is Mike's, read out of `design/report-source-models/Import &
 * Retail.xlsx` on 2026-09-04 (`Supplier 1 Inputs` row 19). It decides what a client's
 * imported stock is priced at as it ages, so it moves revenue, GST and tax together on a
 * document a lender reads — which is the whole reason it is a screen rather than a
 * constant, per the hub-page rule.
 *
 * MENTOR TIER ALONE for now, per the default-is-mentor-alone ruling of 2026-08-24: this is
 * platform advisory content and no firm has yet had a real reason to price differently.
 * The resolver below nonetheless walks the whole tier chain, exactly as
 * `loadResolvedTrendThresholds` does, so the day a firm does need its own ladder costs one
 * line in `TAB_TIERS` and nothing here.
 *
 * Modelled on `forecastTrendThresholds.js` deliberately — same recursion, same "a scope
 * that has decided nothing gets the layer above untouched", same refusal to let a storage
 * fault stop an advisor. A second way of doing inheritance is how two of them drift apart.
 *
 * ⚠ WHAT A TIER MAY CHANGE IS FIVE FIGURES AND A PATTERN NAME, NOT THE WHOLE FILE.
 *   - the three markups, and the two day boundaries that separate them;
 *   - `defaultPattern`, the demand shape a new forecast opens on.
 * The `patterns` themselves are NOT editable here. Their curves each have to total 1 and
 * they are consumed by an upstream calculator that does not exist yet (4.64 slice 2), so
 * editing them is its own change with its own drawing — not a field smuggled onto this one.
 *
 * ⚠ `runoutUpToDays` IS NOT EDITABLE, BECAUSE THE ENGINE NEVER READS IT. In
 * `threeWayForecastModel.js` the runout markup is the ELSE branch — everything past
 * `standardUpToDays` is runout, whatever `runoutUpToDays` says. It stays in the data file
 * as a record of where Mike's own ladder ends, and the validator refuses it with that
 * explanation rather than accepting a number that would silently do nothing.
 *
 * ⚠ UNITS ARE THE FILE'S AND THE ENGINE'S: a markup is a DECIMAL (1.85 = 185%), because
 * price is cost x (1 + markup). The screen shows percentages and converts on both edges.
 * Storing what the engine reads means a stored ladder can be compared to the engine's
 * defaults by eye; storing percentages would put a x100 between them for nobody's benefit.
 */

const BASE_FILE = require('../../data/forecast-sell-down.json')
const { deepMerge } = require('./deepMerge')
const { parentScopeOf } = require('./tierChain')

/**
 * The shipped ladder. `_`-prefixed keys are the data file's own documentation and are
 * stripped here rather than in the file, so the note explaining where a figure came from
 * stays beside the figure and never reaches an API response or the model.
 */
const BASE_SELL_DOWN = Object.keys(BASE_FILE)
  .filter(k => k.charAt(0) !== '_')
  .reduce((out, k) => { out[k] = BASE_FILE[k]; return out }, {})

/** The overlay address this content is stored under, at every tier. */
const CONFIG_KEY = 'forecast-sell-down'

/** The three markups a tier may set, in ladder order — newest stock first. */
const MARKUP_KEYS = ['newMarkup', 'standardMarkup', 'runoutMarkup']

/** The two day boundaries a tier may set. `runoutUpToDays` is deliberately absent. */
const DAY_KEYS = ['newUpToDays', 'standardUpToDays']

/** Every ladder key a tier may change. */
const LADDER_KEYS = MARKUP_KEYS.concat(DAY_KEYS)

/** The demand patterns as shipped — read-only here, and the set `defaultPattern` must name. */
const PATTERN_NAMES = (BASE_SELL_DOWN.patterns || []).map(p => p.name)

/** A finite number, or null for anything else — including '' from a cleared input. */
function num (v) {
  if (v === null || v === undefined || v === '') { return null }
  const n = typeof v === 'number' ? v : parseFloat(v)
  return isFinite(n) ? n : null
}

/**
 * Validate and sanitise a scope's OWN changes — a partial object, never a whole config.
 *
 * An absent key is not an error: it means "keep taking this from the level above". Unlike
 * the trend thresholds, an explicit null is NOT meaningful here and is refused — there is
 * no "price this band at nothing" state, and a cleared box that became 0 would sell a
 * band of stock at cost with nothing on screen to notice it by.
 *
 * An UNKNOWN key is an error rather than a silent drop: a figure that vanishes quietly is
 * a price somebody believes they set and which will never reach a client.
 *
 * 🔴 THE ORDERING CHECK IS NOT PEDANTRY. The engine reads the boundaries as
 * `days <= newUpToDays ? new : (days <= standardUpToDays ? standard : runout)`. Set the
 * new boundary past the standard one and the standard price NEVER FIRES — every band
 * prices as new or as runout, and the middle rung of the ladder is dead. Nothing on any
 * screen would look wrong; the revenue would simply be a different number.
 *
 * @param {*} value - the candidate object from the request body.
 * @returns {{ok: boolean, errors: string[], value: object}} `value` holds only the
 *   recognised, in-range fields and is meaningful only when `ok` is true.
 */
function validateSellDown (value) {
  const errors = []
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, errors: ['the ladder must be a non-array JSON object'], value: {} }
  }

  const clean = {}

  Object.keys(value).forEach((key) => {
    if (key === 'ladder') { return }
    if (key === 'defaultPattern') { return }
    if (key === 'patterns') {
      errors.push('patterns are not editable here — their curves must each total 1, and they are the shipment calculator\'s own change')
      return
    }
    errors.push(`${key} is not part of the sell-down ladder`)
  })

  if (Object.prototype.hasOwnProperty.call(value, 'ladder')) {
    const body = value.ladder
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      errors.push('ladder must be a non-array JSON object')
    } else {
      const out = {}
      Object.keys(body).forEach((key) => {
        if (key === 'runoutUpToDays') {
          errors.push('runoutUpToDays is derived, not set — every band past the standard boundary is runout')
          return
        }
        if (!LADDER_KEYS.includes(key)) {
          errors.push(`${key} is not a figure on the ladder`)
          return
        }
        const n = num(body[key])
        if (n === null) {
          errors.push(`${key} must be a number — the ladder has no blank rung`)
          return
        }
        // A negative markup prices stock below what it cost to land. It is a typo every
        // time, and it would show up only as revenue that is quietly too low.
        if (MARKUP_KEYS.includes(key) && n < 0) {
          errors.push(`${key} cannot be negative — that would price stock below cost`)
          return
        }
        // A boundary is a whole number of days, and a band of zero days cannot contain
        // anything: the first 30-day band would already be past it.
        if (DAY_KEYS.includes(key) && (n < 1 || Math.round(n) !== n)) {
          errors.push(`${key} must be a whole number of days, and at least 1`)
          return
        }
        out[key] = n
      })

      // Read against what this tier will actually work to, not against what it happened to
      // send: a tier that changes only the standard boundary must still be checked against
      // the new boundary it inherits, or an inversion gets in one field at a time.
      const effNew = out.newUpToDays !== undefined ? out.newUpToDays : BASE_SELL_DOWN.ladder.newUpToDays
      const effStd = out.standardUpToDays !== undefined ? out.standardUpToDays : BASE_SELL_DOWN.ladder.standardUpToDays
      if (effNew > effStd) {
        errors.push('the new-stock boundary must not be past the standard one, or the standard price never applies')
      }

      if (Object.keys(out).length) { clean.ladder = out }
    }
  }

  if (Object.prototype.hasOwnProperty.call(value, 'defaultPattern')) {
    const name = value.defaultPattern
    if (typeof name !== 'string' || !PATTERN_NAMES.includes(name)) {
      // A pattern name that matches nothing does not fail loudly downstream — the engine
      // falls back to the shipped default — so a manager would see their choice saved and
      // silently ignored for as long as it stood.
      errors.push(`defaultPattern must be one of: ${PATTERN_NAMES.join(', ')}`)
    } else {
      clean.defaultPattern = name
    }
  }

  return { ok: errors.length === 0, errors, value: clean }
}

/**
 * The ladder one scope works to, resolved through every tier above it.
 *
 * @param {string|null} scopeId - the scope to resolve for, taken from the verified JWT and
 *   NEVER from a request body — a body-supplied id would let one firm read another's
 *   configuration (`tier-cascade.md` P6).
 * @param {function(string, string): Promise<Object|null>} loadFirmConfig - the overlay
 *   reader, injected rather than imported so tests need no database.
 * @returns {Promise<object>} the effective `{ladder, defaultPattern, patterns}`. Falls back
 *   to the layer above when this scope has stored nothing, has no scope id, or the store
 *   cannot be reached. NEVER REJECTS: a ladder read must not stop an advisor building a
 *   forecast, and the worst case is the platform ladder — which is what every firm gets
 *   today.
 */
async function loadResolvedSellDown (scopeId, loadFirmConfig) {
  if (!scopeId) { return BASE_SELL_DOWN }

  const parent = parentScopeOf(scopeId)
  const base = parent === null
    ? BASE_SELL_DOWN
    : await loadResolvedSellDown(parent, loadFirmConfig)

  let own = null
  try {
    own = await loadFirmConfig(scopeId, CONFIG_KEY)
  } catch (err) {
    console.error('[sell-down] scope read failed:', err.message)
    return base
  }

  // Identity, not merely an optimisation: a scope that has changed nothing gets the object
  // from the layer above itself, so "unchanged" is provable by reference.
  const { ok, value } = validateSellDown(own)
  if (!ok || Object.keys(value).length === 0) { return base }

  return deepMerge(base, value)
}

module.exports = {
  BASE_SELL_DOWN,
  CONFIG_KEY,
  MARKUP_KEYS,
  DAY_KEYS,
  LADDER_KEYS,
  PATTERN_NAMES,
  validateSellDown,
  loadResolvedSellDown
}
