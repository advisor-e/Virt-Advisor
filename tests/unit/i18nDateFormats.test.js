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

  // ⚠ PINNED BECAUSE IT IS LOAD-BEARING AND UNRESOLVED, not because wording needs a test.
  // `en` resolves to en-US, so this reads "September 7, 2026" while the prose in the same
  // printed pack reads "7 September 2026" — the backend writes the model's date day-first.
  // One document, two orders. Raised with Mike 2026-09-07; until he rules, this records
  // what the app really does so the change is visible when it happens.
  test('English is US-ordered today, and the pack’s own prose is not', () => {
    expect(i18nFor('en').d(new Date(2026, 8, 7), FORMAT)).toBe('September 7, 2026')
    expect(i18nFor('en').d(new Date(2026, 10, 30), FORMAT)).toBe('November 30, 2026')
  })

  // Not decoration: the whole reason for going through `$d` rather than assembling a date
  // in a component is that the month arrives in the reader's own language.
  test('another locale writes the month in its own language', () => {
    const french = i18nFor('fr').d(new Date(2026, 8, 7), FORMAT)
    expect(french.toLowerCase()).toContain('septembre')
  })
})
