'use strict'

/**
 * @file The bands the Three-Way Forecast's two-year trend read draws — the platform's
 *   thresholds, with each tier's own changes merged over them.
 * @module server/utils/forecastTrendThresholds
 *
 * Item 4.61 phase (b). RULED BY MIKE, 2026-09-03, AGAINST THE RECOMMENDATION: he was
 * offered a plain read with direction and size and no judgement, and chose warning bands
 * on thresholds HE sets. The recommendation's objection was that any threshold a developer
 * chose would be invented advisory content sitting inside a funding document; his ruling
 * removes that objection rather than overriding it, because the numbers are his. THAT IS
 * THE WHOLE REASON THIS MODULE EXISTS — and the reason `data/forecast-trend-thresholds.json`
 * ships with nulls in it rather than sensible-looking defaults.
 *
 * MENTOR TIER ALONE for now, per the default-is-mentor-alone ruling of 2026-08-24: these
 * are platform advisory thresholds and no firm has yet had a real reason to differ. The
 * resolver below nonetheless walks the whole tier chain, exactly as
 * `loadResolvedPropertyTaxRules` does, so the day a firm does need its own numbers costs
 * one line in `TAB_TIERS` and nothing here. Building the cascade now and gating the SCREEN
 * is cheaper and safer than retro-fitting inheritance into a flat store later.
 *
 * Modelled on `propertyTaxRules.js` deliberately — same recursion, same "a scope that has
 * decided nothing gets the layer above untouched", same refusal to let a storage fault
 * stop an advisor. A second way of doing inheritance is how two of them drift apart.
 *
 * ⚠ THE MECHANISM IS `deepMerge`. These are map-shaped settings, not rows carrying a
 * decision each: a firm that sets only `levels.stockDays` must keep receiving the mentor's
 * debtor-day numbers. There is nothing here to switch off and nothing to add.
 */

const BASE_FILE = require('../../data/forecast-trend-thresholds.json')
const { MEASURES } = require('../report/trendModel')
const { deepMerge } = require('./deepMerge')
const { parentScopeOf } = require('./tierChain')

/**
 * The shipped thresholds. `_`-prefixed keys are the data file's own documentation and are
 * stripped here rather than in the file, so the note explaining why a value is null stays
 * beside the null it explains and never reaches an API response or the model.
 */
const BASE_TREND_THRESHOLDS = Object.keys(BASE_FILE)
  .filter(k => k.charAt(0) !== '_')
  .reduce((out, k) => { out[k] = BASE_FILE[k]; return out }, {})

/** The overlay address these settings are stored under, at every tier. */
const CONFIG_KEY = 'forecast-trend-thresholds'

/**
 * Which measures live in which group, and how each movement threshold is read. Derived
 * from `MEASURES` rather than restated, so a measure cannot be banded by the model and
 * unknown to the validator — the drift that would let a firm save a threshold that
 * silently does nothing.
 */
const LEVEL_KEYS = MEASURES.filter(m => m.basis === 'level').map(m => m.key)
const MOVEMENT_KEYS = MEASURES.filter(m => m.basis === 'movement').map(m => m.key)
const COMPARE_BY_KEY = MEASURES.reduce((out, m) => { out[m.key] = m.compare; return out }, {})

/** A finite number, or null for anything else — including '' from a cleared input. */
function num (v) {
  if (v === null || v === undefined || v === '') { return null }
  const n = typeof v === 'number' ? v : parseFloat(v)
  return isFinite(n) ? n : null
}

/**
 * Validate and sanitise a scope's OWN changes — a partial object, never a whole config.
 *
 * An absent group, measure or boundary is not an error: it means "keep taking this from
 * the level above". An explicit `null` IS meaningful and is kept — it is how a manager
 * CLEARS a threshold so the measure is reported and never banded, which Mike's own file
 * ships in for five of the six measures.
 *
 * An UNKNOWN key is an error rather than a silent drop: a typo that vanishes quietly is a
 * threshold somebody believes they saved and which will never fire.
 *
 * 🔴 THE ORDERING CHECKS ARE NOT PEDANTRY. A red threshold less severe than its amber
 * inverts the bands: with a 3-point amber and a 1-point red, EVERY fall over one point
 * reports as red and amber never fires at all. Nothing on screen would look wrong — it
 * would simply be a screen that shouts at everything, which is a screen nobody reads.
 *
 * @param {*} value - the candidate object from the request body.
 * @returns {{ok: boolean, errors: string[], value: object}} `value` holds only the
 *   recognised, in-range fields and is meaningful only when `ok` is true.
 */
function validateTrendThresholds (value) {
  const errors = []
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, errors: ['thresholds must be a non-array JSON object'], value: {} }
  }

  const clean = {}

  Object.keys(value).forEach((group) => {
    if (group !== 'levels' && group !== 'movements') {
      errors.push(`${group} is not a threshold group — expected levels or movements`)
      return
    }
    const body = value[group]
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      errors.push(`${group} must be a non-array JSON object`)
      return
    }
    const allowedKeys = group === 'levels' ? LEVEL_KEYS : MOVEMENT_KEYS
    const boundaries = group === 'levels' ? ['green', 'amber'] : ['warn', 'crit']
    const out = {}

    Object.keys(body).forEach((key) => {
      if (!allowedKeys.includes(key)) {
        errors.push(`${key} is not banded on ${group === 'levels' ? 'its level' : 'its movement'}`)
        return
      }
      const pair = body[key]
      if (!pair || typeof pair !== 'object' || Array.isArray(pair)) {
        errors.push(`${key} must be an object holding ${boundaries.join(' and ')}`)
        return
      }
      const kept = {}
      let bad = false
      Object.keys(pair).forEach((b) => {
        if (!boundaries.includes(b)) {
          errors.push(`${key}.${b} is not a boundary — expected ${boundaries.join(' or ')}`)
          bad = true
          return
        }
        const n = num(pair[b])
        // A day-count cannot be negative; a percentage-point movement certainly can —
        // "growth falls below -5%" is a perfectly ordinary red line.
        if (n !== null && group === 'levels' && n < 0) {
          errors.push(`${key}.${b} must be a number of days, and cannot be negative`)
          bad = true
          return
        }
        kept[b] = n
      })
      if (bad) { return }

      if (group === 'levels' && kept.green !== undefined && kept.amber !== undefined &&
          kept.green !== null && kept.amber !== null && kept.green > kept.amber) {
        errors.push(`${key}: the green figure must not be higher than the amber one`)
        return
      }
      if (group === 'movements' && kept.warn !== undefined && kept.crit !== undefined &&
          kept.warn !== null && kept.crit !== null) {
        const inverted = COMPARE_BY_KEY[key] === 'below' ? kept.crit > kept.warn : kept.crit < kept.warn
        if (inverted) {
          errors.push(`${key}: the red figure must be more severe than the amber one, or amber will never fire`)
          return
        }
      }
      out[key] = kept
    })

    if (Object.keys(out).length) { clean[group] = out }
  })

  return { ok: errors.length === 0, errors, value: clean }
}

/**
 * The thresholds one scope works to, resolved through every tier above it.
 *
 * @param {string|null} scopeId - the scope to resolve for, taken from the verified JWT and
 *   NEVER from a request body — a body-supplied id would let one firm read another's
 *   configuration (`tier-cascade.md` P6).
 * @param {function(string, string): Promise<Object|null>} loadFirmConfig - the overlay
 *   reader, injected rather than imported so tests need no database.
 * @returns {Promise<object>} the effective `{levels, movements}`. Falls back to the layer
 *   above when this scope has stored nothing, has no scope id, or the store cannot be
 *   reached. NEVER REJECTS: a thresholds read must not stop an advisor building a
 *   forecast, and the worst case is the platform set — which is what every firm gets today.
 */
async function loadResolvedTrendThresholds (scopeId, loadFirmConfig) {
  if (!scopeId) { return BASE_TREND_THRESHOLDS }

  const parent = parentScopeOf(scopeId)
  const base = parent === null
    ? BASE_TREND_THRESHOLDS
    : await loadResolvedTrendThresholds(parent, loadFirmConfig)

  let own = null
  try {
    own = await loadFirmConfig(scopeId, CONFIG_KEY)
  } catch (err) {
    console.error('[trend-thresholds] scope read failed:', err.message)
    return base
  }

  // Identity, not merely an optimisation: a scope that has changed nothing gets the object
  // from the layer above itself, so "unchanged" is provable by reference.
  const { ok, value } = validateTrendThresholds(own)
  if (!ok || Object.keys(value).length === 0) { return base }

  return deepMerge(base, value)
}

module.exports = {
  BASE_TREND_THRESHOLDS,
  CONFIG_KEY,
  LEVEL_KEYS,
  MOVEMENT_KEYS,
  COMPARE_BY_KEY,
  validateTrendThresholds,
  loadResolvedTrendThresholds
}
