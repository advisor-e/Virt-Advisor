/**
 * Plain formatters for the figures a report page prints — everything that is not money.
 * Money goes through `mixins/currencyMixin.js` so the firm's currency and the reader's
 * language decide it; these are the unit-free companions. Every one answers "—" for a
 * figure that is null, which is the reports' own no-figure convention (report-models.md §1:
 * a missing figure is shown missing, never as zero).
 *
 * THE READER'S LANGUAGE WRITES THE DIGITS (item 13.8). Each takes the locale last and
 * formats through Intl, so a German reader gets "13,9 %" and "1,6×" where English keeps
 * "13.9%" and "1.6×" exactly as before. Components reach them through
 * `mixins/reportFormatMixin.js`, which passes `$i18n.locale`; a call with no locale is
 * English.
 *
 * CommonJS, no DOM, shared by the components and their tests.
 */

'use strict'

const DASH = '—'
const FALLBACK_LOCALE = 'en'

/** @param {*} v @returns {boolean} */
function finite (v) { return typeof v === 'number' && Number.isFinite(v) }

/**
 * @param {string} [locale]
 * @param {object} opts - Intl.NumberFormat options
 * @returns {Intl.NumberFormat} for the locale, or English when the locale is unknown
 */
function formatter (locale, opts) {
  try {
    return new Intl.NumberFormat(locale || FALLBACK_LOCALE, opts)
  } catch (e) {
    return new Intl.NumberFormat(FALLBACK_LOCALE, opts)
  }
}

/** A plain number to exactly `d` places in the reader's language. */
function fixed (v, d, locale) {
  return formatter(locale, { minimumFractionDigits: d, maximumFractionDigits: d }).format(v)
}

/** A fraction as a percentage to exactly `d` places in the reader's language. */
function percent (v, d, locale) {
  return formatter(locale, { style: 'percent', minimumFractionDigits: d, maximumFractionDigits: d }).format(v)
}

/**
 * A fraction as a percentage. `pct(0.139)` → "13.9%".
 * @param {number|null} v @param {number} [d=1] decimals @param {string} [locale]
 * @returns {string}
 */
function pct (v, d, locale) {
  if (!finite(v)) { return DASH }
  return percent(v, d === undefined ? 1 : d, locale)
}

/**
 * A percentage that is already ×100 (the trend model's measures). `pct100(13.9)` → "13.9%".
 * @param {number|null} v @param {number} [d=1] @param {string} [locale]
 * @returns {string}
 */
function pct100 (v, d, locale) {
  if (!finite(v)) { return DASH }
  return percent(v / 100, d === undefined ? 1 : d, locale)
}

/**
 * A signed movement in percentage points. `pts(0.7)` → "+0.7 pts".
 * @param {number|null} v - points, already ×100 @param {string} [locale]
 * @param {string} [unit="pts"] - the unit word, from the locale files so it can be translated
 * @returns {string}
 */
function pts (v, locale, unit) {
  if (!finite(v)) { return DASH }
  return (v > 0 ? '+' : '') + fixed(v, 1, locale) + ' ' + (unit || 'pts')
}

/**
 * A signed percentage change. `signedPct(0.124)` → "+12.4%".
 * @param {number|null} v - a fraction @param {string} [locale]
 * @returns {string}
 */
function signedPct (v, locale) {
  if (!finite(v)) { return DASH }
  return (v > 0 ? '+' : '') + percent(v, 1, locale)
}

/**
 * A signed percentage that is already ×100. `signedPct100(2.2)` → "+2.2%".
 * @param {number|null} v @param {string} [locale]
 * @returns {string}
 */
function signedPct100 (v, locale) {
  if (!finite(v)) { return DASH }
  return (v > 0 ? '+' : '') + percent(v / 100, 1, locale)
}

/**
 * Whole days. `days(46.6)` → "47".
 * @param {number|null} v @param {string} [locale] @returns {string}
 */
function days (v, locale) {
  if (!finite(v)) { return DASH }
  return fixed(Math.round(v), 0, locale)
}

/**
 * A multiple. `times(5.23)` → "5.2×".
 * @param {number|null} v @param {string} [locale] @returns {string}
 */
function times (v, locale) {
  if (!finite(v)) { return DASH }
  return fixed(v, 1, locale) + '×'
}

/**
 * A ratio to two places. `ratio2(0.38)` → "0.38".
 * @param {number|null} v @param {string} [locale] @returns {string}
 */
function ratio2 (v, locale) {
  if (!finite(v)) { return DASH }
  return fixed(v, 2, locale)
}

/** @param {number|null} v @returns {'up'|'down'|null} the direction of a movement */
function direction (v) {
  if (!finite(v) || v === 0) { return null }
  return v > 0 ? 'up' : 'down'
}

module.exports = { DASH, pct, pct100, pts, signedPct, signedPct100, days, times, ratio2, direction }
