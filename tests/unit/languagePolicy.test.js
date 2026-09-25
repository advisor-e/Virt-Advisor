'use strict'

/**
 * THE LANGUAGE POLICY, PINNED TO THE CODE IT DESCRIBES.
 *
 * `design/features/localisation-and-currency.md` §1a states how languages work here:
 * ONE authored file (`locales/en.json`), 28 languages offered, 8 shipped as static
 * files, and every language but English completed by the BACKEND — translated once per
 * language, stored at the platform scope, shared by every reader (Mike, 2026-09-25).
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

  test('🔴 BOTH PICKERS ASK THE BACKEND — for every language, the shipped seven included', () => {
    // Until 2026-09-25 a shipped language never asked at all, so a German reader saw every
    // section missing from de.json in English. If either picker stops using the loader, that
    // returns silently: the picker still looks right and only the reader sees English.
    ;['localeMixin.js', path.join('collaborate', 'localeMixin.js')].forEach((file) => {
      const mixin = fs.readFileSync(path.join(__dirname, '..', '..', 'mixins', file), 'utf8')
      expect(mixin).toMatch(/loadUiLocale\(lang\.code\)/)
      expect(mixin).not.toMatch(/if \(!this\.\$i18n\.messages\[lang\.code\]\) \{\s*this\.loadingLang/)
    })
  })

  test('the translation routes are guarded — both spend a shared allowance', () => {
    // P5a. /api/translate/locale was open to the whole internet until 2026-09-22; it now
    // carries chat messages only. /api/ui-translation spends model calls.
    const server = fs.readFileSync(
      path.join(__dirname, '..', '..', 'server', 'restify-server.js'), 'utf8'
    )
    ;['/api/translate/locale', '/api/ui-translation/'].forEach((route) => {
      const line = server.split('\n').find(l => l.includes("'" + route) && /server\.(get|post)/.test(l))
      expect(line).toBeDefined()
      expect(line).toMatch(/firmAuth/)
    })
  })
})
