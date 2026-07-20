/**
 * Currency + number formatting for the Business Performance Report screens.
 *
 * Pure functions — no Vue, no DOM, no store — so they are unit-tested directly
 * (tests/unit/currencyFormat.test.js). This is deliberate: the repo has no Vue
 * component-test tooling yet (design/ACTIONS.md → TEST-GAP), so keeping the
 * formatting logic OUT of the .vue files is what makes it testable on any machine.
 * The report components reach these through `mixins/currencyMixin.js`, which supplies
 * the firm's currency (Vuex) and the reader's language (`$i18n.locale`).
 *
 * Rules (owner decisions 2026-07-21):
 *   - The SYMBOL follows the currency ISO code (GBP→£, EUR→€, the $-family→"$").
 *   - DIGIT GROUPING follows `locale` (the reader's UI language): en "1,234.56",
 *     fr "1 234,56", de "1.234,56".
 *   - $-family currencies (USD/NZD/AUD/CAD) render as a plain "$" via `narrowSymbol`
 *     (verified on Node 14.15 + browsers), so existing dollar reports look unchanged.
 *   - A blank/invalid value renders as an em dash "—", matching the reports' existing
 *     "no figure" convention — a failed figure is never shown as "$0".
 */

const FALLBACK_LOCALE = 'en'
const FALLBACK_CURRENCY = 'NZD'

/**
 * Build an Intl currency formatter, degrading gracefully if an ICU build rejects
 * `narrowSymbol` or an unknown locale, so a formatter is always returned.
 * @param {string} locale @param {string} currency @param {object} opts
 * @returns {Intl.NumberFormat}
 */
function currencyFormatter (locale, currency, opts) {
  const cfg = Object.assign(
    { style: 'currency', currency: currency || FALLBACK_CURRENCY, currencyDisplay: 'narrowSymbol' },
    opts
  )
  try {
    return new Intl.NumberFormat(locale || FALLBACK_LOCALE, cfg)
  } catch (e) {
    delete cfg.currencyDisplay
    try {
      return new Intl.NumberFormat(locale || FALLBACK_LOCALE, cfg)
    } catch (e2) {
      return new Intl.NumberFormat(FALLBACK_LOCALE, cfg)
    }
  }
}

/** @param {*} value @returns {boolean} true for null/undefined/non-finite/non-numeric. */
function isBlank (value) {
  if (value === null || value === undefined || value === '') { return true }
  const n = Number(value)
  return !isFinite(n)
}

/**
 * Whole-currency amount, no decimals: "$1,234", "£1,234", "-$500", "—" when blank.
 * @param {number|null} value @param {string} currency @param {string} locale
 */
export function money (value, currency, locale) {
  if (isBlank(value)) { return '—' }
  const n = Math.round(Number(value))
  return currencyFormatter(locale, currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

/**
 * Currency to 2 decimals: "$0.93", "£12.50". For unit costs / share prices.
 * @param {number|null} value @param {string} currency @param {string} locale
 */
export function money2 (value, currency, locale) {
  if (isBlank(value)) { return '—' }
  return currencyFormatter(locale, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))
}

/**
 * Whole-currency amount with an explicit leading sign, zero shown as "+": "+$1,234",
 * "-$1,234", "+$0". @param {number|null} value @param {string} currency @param {string} locale
 */
export function signedMoney (value, currency, locale) {
  if (isBlank(value)) { return '—' }
  const n = Math.round(Number(value))
  return currencyFormatter(locale, currency, {
    minimumFractionDigits: 0, maximumFractionDigits: 0, signDisplay: 'always'
  }).format(n)
}

/**
 * Thousands, abbreviated with the currency symbol: "$12k", "-$3k". Chart-label helper
 * for the $-bearing "kf" formatters. @param {number|null} value @param {string} currency @param {string} locale
 */
export function kMoney (value, currency, locale) {
  if (isBlank(value)) { return '—' }
  const k = Math.round(Number(value) / 1000)
  return money(k, currency, locale) + 'k'
}

/**
 * A plain grouped number, NO currency symbol, grouping by locale: "1,234" / "1.234".
 * For the reports' symbol-free figures (day counts, percentages' integer part, etc.).
 * @param {number|null} value @param {string} locale @param {number} [decimals=0]
 */
export function num (value, locale, decimals) {
  if (isBlank(value)) { return '—' }
  const d = decimals || 0
  const cfg = { minimumFractionDigits: d, maximumFractionDigits: d }
  try {
    return new Intl.NumberFormat(locale || FALLBACK_LOCALE, cfg).format(Number(value))
  } catch (e) {
    return new Intl.NumberFormat(FALLBACK_LOCALE, cfg).format(Number(value))
  }
}
