'use strict'

/**
 * @file Which BCP-47 tag `Intl` should be given when formatting a date.
 * @module utils/dateLocale
 *
 * 🔴 WHY THIS EXISTS. Date ORDER comes from the locale tag, never from the options — no
 * combination of `{ year, month, day }` will move the day in front of the month. `Intl`
 * resolves the bare tag `en` to **en-US**, so `$d(date, 'long')` produced
 * "September 7, 2026" while the same printed funding pack said "7 September 2026" in the
 * model's own prose, which the backend writes day-first. One document, two orders.
 *
 * Ruled by Mike, 2026-09-07: English dates read day-first. The app's audience is New
 * Zealand, the UK and Ireland, and a pack that disagrees with itself about a date looks
 * careless to a credit assessor.
 *
 * ⚠ IT MAPS ONLY WHAT IT MUST. Every other locale's bare tag already orders its dates the
 * way its readers expect, so mapping them would be inventing a problem to solve.
 *
 * Node 14, CommonJS — required by a Vue component and imported by the i18n plugin.
 */

/** App locale → the tag `Intl` is given. Anything absent is passed through unchanged. */
const DATE_LOCALES = { en: 'en-GB' }

/**
 * The tag to format a date with, for an app locale.
 *
 * @param {string} locale - an app locale key, e.g. 'en'
 * @returns {string} the tag to hand `Intl`, e.g. 'en-GB'
 */
function intlLocaleFor (locale) {
  const key = String(locale || 'en')
  return DATE_LOCALES[key] || key
}

/** "7 Sept 2026" in English. */
const DATE = { day: 'numeric', month: 'short', year: 'numeric' }
/** "7 Sept 2026, 14:05" in English — Mike's ruling of 2026-10-01: day first, 24-hour clock. */
const DATE_TIME = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }

/**
 * A date in the reader's language — never the browser's, which is what `toLocaleString()`
 * with no locale writes (item 13.8).
 *
 * @param {Date|string|number} value - a Date, an ISO string or a timestamp
 * @param {string} locale - an app locale key, e.g. `$i18n.locale`
 * @param {object} [opts=DATE] - Intl.DateTimeFormat options
 * @returns {string} '' for a missing or unreadable date, so a screen shows nothing rather
 *   than "Invalid Date"
 */
function formatDate (value, locale, opts) {
  if (value === null || value === undefined || value === '') { return '' }
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) { return '' }
  try {
    return new Intl.DateTimeFormat(intlLocaleFor(locale), opts || DATE).format(d)
  } catch (e) {
    return new Intl.DateTimeFormat('en-GB', opts || DATE).format(d)
  }
}

/**
 * A stored stamp as words: a bare "2026-10-01" is a day and shows as one; anything with a
 * time shows the time too. Used where a screen used to print the raw database value.
 * @param {string|Date} value @param {string} locale @returns {string}
 */
function formatStamp (value, locale) {
  return formatDate(value, locale, /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? DATE : DATE_TIME)
}

module.exports = { intlLocaleFor, DATE_LOCALES, formatDate, formatStamp, DATE, DATE_TIME }
