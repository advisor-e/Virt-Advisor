/**
 * Plain formatters for the figures a report page prints — everything that is not money.
 * Money goes through `mixins/currencyMixin.js` so the firm's currency and the reader's
 * language decide it; these are the unit-free companions. Every one answers "—" for a
 * figure that is null, which is the reports' own no-figure convention (report-models.md §1:
 * a missing figure is shown missing, never as zero).
 *
 * CommonJS, no DOM, shared by the components and their tests.
 */

'use strict'

const DASH = '—'

/** @param {*} v @returns {boolean} */
function finite (v) { return typeof v === 'number' && Number.isFinite(v) }

/**
 * A fraction as a percentage. `pct(0.139)` → "13.9%".
 * @param {number|null} v @param {number} [d=1] decimals
 * @returns {string}
 */
function pct (v, d) {
  if (!finite(v)) { return DASH }
  return (v * 100).toFixed(d === undefined ? 1 : d) + '%'
}

/**
 * A percentage that is already ×100 (the trend model's measures). `pct100(13.9)` → "13.9%".
 * @param {number|null} v @param {number} [d=1]
 * @returns {string}
 */
function pct100 (v, d) {
  if (!finite(v)) { return DASH }
  return v.toFixed(d === undefined ? 1 : d) + '%'
}

/**
 * A signed movement in percentage points. `pts(0.7)` → "+0.7 pts".
 * @param {number|null} v - points, already ×100
 * @returns {string}
 */
function pts (v) {
  if (!finite(v)) { return DASH }
  return (v > 0 ? '+' : '') + v.toFixed(1) + ' pts'
}

/**
 * A signed percentage change. `signedPct(0.124)` → "+12.4%".
 * @param {number|null} v - a fraction
 * @returns {string}
 */
function signedPct (v) {
  if (!finite(v)) { return DASH }
  return (v > 0 ? '+' : '') + (v * 100).toFixed(1) + '%'
}

/**
 * Whole days. `days(46.6)` → "47".
 * @param {number|null} v @returns {string}
 */
function days (v) {
  if (!finite(v)) { return DASH }
  return String(Math.round(v))
}

/**
 * A multiple. `times(5.23)` → "5.2×".
 * @param {number|null} v @returns {string}
 */
function times (v) {
  if (!finite(v)) { return DASH }
  return v.toFixed(1) + '×'
}

/**
 * A ratio to two places. `ratio2(0.38)` → "0.38".
 * @param {number|null} v @returns {string}
 */
function ratio2 (v) {
  if (!finite(v)) { return DASH }
  return v.toFixed(2)
}

/** @param {number|null} v @returns {'up'|'down'|null} the direction of a movement */
function direction (v) {
  if (!finite(v) || v === 0) { return null }
  return v > 0 ? 'up' : 'down'
}

module.exports = { DASH, pct, pct100, pts, signedPct, days, times, ratio2, direction }
