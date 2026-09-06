'use strict'

/**
 * `$d(date, 'long')` must actually produce a date.
 *
 * 🔴 WHY THIS TEST EXISTS. vue-i18n returns an EMPTY STRING when asked for a datetime format
 * that is not configured, and until 2026-09-07 none was. The visible consequence was in the
 * client's printed funding pack: `runMeta` reads "Run {run} · researched {date} · …" and
 * printed as "Run 1 · researched · 17 sources · 1,887 words" — the date silently gone from
 * the document a lender reads, where the date the research was made is the basis of the
 * whole assessment.
 *
 * It survived because the component tests stub `$d`, so they agreed with the fault. It was
 * found by driving a real browser. This test is the guard that was missing: it asserts a
 * real formatted date, in every locale the app ships, against real `Intl`.
 */

const VueI18n = require('vue-i18n')
const Vue = require('vue')
const { dateTimeFormats, LOCALES } = require('../../plugins/i18n')
const { intlLocaleFor } = require('../../utils/dateLocale')
const routes = require('../../server/routes/economicAnalysis')

Vue.use(VueI18n)

/** The three places `$d(…, 'long')` is called, all in the Economic Analysis feature. */
const FORMAT = 'long'

function i18nFor (locale) {
  return new VueI18n({
    locale,
    fallbackLocale: 'en',
    messages: { [locale]: {} },
    dateTimeFormats
  })
}

describe('$d(date, "long") — the format the run line and the printed pack ask for', () => {
  test('every locale the app ships defines it', () => {
    for (const locale of LOCALES) {
      expect(dateTimeFormats[locale]).toBeDefined()
      expect(dateTimeFormats[locale][FORMAT]).toBeDefined()
    }
  })

  // The assertion that would have caught it: not "a format exists" but "a date comes out".
  test('it returns a real date, not the empty string vue-i18n falls back to', () => {
    const when = new Date(2026, 8, 7)

    for (const locale of LOCALES) {
      const out = i18nFor(locale).d(when, FORMAT)
      expect(typeof out).toBe('string')
      expect(out.trim()).not.toBe('')
      expect(out).toMatch(/2026/)
      expect(out).toMatch(/\d/)
    }
  })

  // 🔴 PINNED, AND THE COMMENT IS WHY. Ruled by Mike, 2026-09-07: English dates read
  // day-first. This line prints in the same funding pack as the model's own prose, which
  // the backend writes day-first via `todayInWords()` — a document that disagrees with
  // itself about a date looks careless to a credit assessor. Bare `en` gives the American
  // order, so the tag matters and nothing but a test will notice if it is dropped.
  test('English reads day-first, matching the prose in the same printed pack', () => {
    expect(i18nFor(intlLocaleFor('en')).d(new Date(2026, 8, 7), FORMAT)).toBe('7 September 2026')
    expect(i18nFor(intlLocaleFor('en')).d(new Date(2026, 10, 30), FORMAT)).toBe('30 November 2026')
  })

  // The exact words the backend puts in the prompt, so the two halves of the pack agree.
  test('it matches what the backend writes into the prompt', () => {
    const when = new Date(2026, 8, 7)
    expect(i18nFor(intlLocaleFor('en')).d(when, FORMAT)).toBe(routes.todayInWords(when))
  })

  test('bare "en" is not what gets used, because it orders dates the American way', () => {
    expect(intlLocaleFor('en')).toBe('en-GB')
    expect(i18nFor('en').d(new Date(2026, 8, 7), FORMAT)).toBe('September 7, 2026')
  })

  test('a locale with no mapping is passed through unchanged', () => {
    expect(intlLocaleFor('fr')).toBe('fr')
    expect(intlLocaleFor('pl')).toBe('pl')
  })

  // Nothing may fall through to a bare `en` and quietly become American again.
  test('a missing locale falls back to English, and English means en-GB', () => {
    expect(intlLocaleFor('')).toBe('en-GB')
    expect(intlLocaleFor(undefined)).toBe('en-GB')
    expect(intlLocaleFor(null)).toBe('en-GB')
  })

  // Not decoration: the whole reason for going through `$d` rather than assembling a date
  // in a component is that the month arrives in the reader's own language.
  test('another locale writes the month in its own language', () => {
    const french = i18nFor('fr').d(new Date(2026, 8, 7), FORMAT)
    expect(french.toLowerCase()).toContain('septembre')
  })
})
