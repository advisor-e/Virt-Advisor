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

module.exports = { intlLocaleFor, DATE_LOCALES }
