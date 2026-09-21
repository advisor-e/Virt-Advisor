'use strict'

/**
 * THE LANGUAGE POLICY, PINNED TO THE CODE IT DESCRIBES.
 *
 * `design/features/localisation-and-currency.md` §1a states how languages work here:
 * ONE authored file (`locales/en.json`), 28 languages offered, 8 shipped as static
 * files and the other 20 translated on demand and cached per browser.
 *
 * 🔴 WHY THIS TEST EXISTS, AND IT IS NOT THE USUAL REASON. Nothing here is broken and
 * this guards no bug. It guards a MISREADING — one that has now happened twice, the
 * second time on 2026-09-22.
 *
 * The seven non-English static files hold 8 top-level keys against English's 54. Open
 * that folder cold and the obvious conclusion is "translation is half-finished, there is
 * a backlog here". It is exactly wrong: those files are a partial head start, and
 * everything missing from them is translated on demand like the other twenty. A session
 * that reaches the wrong conclusion does not file a bug — it proposes BUILDING a
 * translation system beside the working one, which is what stage 6 of the Sales Tracker
 * would have been (skipped on Mike's ruling, 2026-09-22).
 *
 * So these assertions are aimed at a reader, not at a regression. If one fails, the
 * question is whether the POLICY changed — and if it did, §1a is what needs rewriting,
 * before this file does.
 *
 * ⚠ Deliberately NOT asserted: any label's wording, per Mike's ruling of 2026-08-24. The
 * facts below are structural — counts, wiring and which file is authored — which is the
 * half a person in UAT cannot see.
 */

const fs = require('fs')
const path = require('path')

const languages = require('../../data/languages.json')
const en = require('../../locales/en.json')

const LOCALES_DIR = path.join(__dirname, '..', '..', 'locales')

/** @returns {string[]} the language codes offered to a reader. */
function offeredCodes () {
  const arr = Array.isArray(languages) ? languages : (languages.languages || Object.values(languages)[0])
  return arr.map(l => l.code || l.value || l)
}

/** @returns {string[]} the locale codes that ship as a static file. */
function staticCodes () {
  return fs.readdirSync(LOCALES_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
}

describe('the language policy — localisation-and-currency.md §1a', () => {
  test('ENGLISH IS THE ONLY AUTHORED LOCALE, and it is the biggest by a distance', () => {
    const codes = staticCodes()
    expect(codes).toContain('en')

    // Every other static file is a partial head start, so English must dominate. If a
    // second file ever rivals it, somebody has started hand-translating — which §1a
    // says not to do, because on-demand translation already covers all 28.
    const enKeys = Object.keys(en).length
    codes.filter(c => c !== 'en').forEach((code) => {
      const other = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, `${code}.json`), 'utf8'))
      expect(Object.keys(other).length).toBeLessThan(enKeys)
    })
  })

  test('🔴 a partial static file is EXPECTED, not a backlog — the gap is covered on demand', () => {
    // The assertion that carries the whole misreading. Were these files meant to be
    // complete, this would be the failing test that sent someone translating by hand.
    const codes = staticCodes().filter(c => c !== 'en')
    const partial = codes.filter((code) => {
      const other = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, `${code}.json`), 'utf8'))
      return Object.keys(other).length < Object.keys(en).length
    })

    expect(partial.length).toBe(codes.length)
  })

  test('every language offered is either shipped or translated on demand — none is stranded', () => {
    const offered = offeredCodes()
    const shipped = staticCodes()

    // Nothing to assert about WHICH bucket a language is in; what must never happen is a
    // language offered in the picker that no path can serve. Both buckets are served:
    // shipped from disk, the rest through /api/translate/locale from the English file.
    expect(offered.length).toBeGreaterThan(shipped.length)
    expect(new Set(offered).size).toBe(offered.length) // no duplicate codes
    offered.forEach(code => expect(typeof code).toBe('string'))
  })

  test('🔴 THE ON-DEMAND PATH IS WIRED, and it sends the ENGLISH file', () => {
    // If this breaks, the 20 unshipped languages stop working and the static eight hide
    // it — the picker still looks right, and only an Arabic or Japanese reader sees
    // English. That is the silent failure this whole mechanism is exposed to.
    const mixin = fs.readFileSync(path.join(__dirname, '..', '..', 'mixins', 'localeMixin.js'), 'utf8')

    expect(mixin).toMatch(/\/api\/translate\/locale/)
    expect(mixin).toMatch(/messages\.en/) // the English locale is what gets sent
    expect(mixin).toMatch(/va_locale_/) // cached per browser, paid once
    expect(mixin).toMatch(/Authorization/) // firmAuth-guarded: it spends a metered quota
  })

  test('the translation route is guarded — it spends a shared, metered allowance', () => {
    // P5a. It was open to the whole internet until 2026-09-22. Exhausting the quota
    // silently reverts 20 languages to English with nothing on screen to explain it.
    const server = fs.readFileSync(
      path.join(__dirname, '..', '..', 'server', 'restify-server.js'), 'utf8'
    )
    const line = server.split('\n').find(l => l.includes('/api/translate/locale'))

    expect(line).toBeDefined()
    expect(line).toMatch(/firmAuth/)
  })
})
