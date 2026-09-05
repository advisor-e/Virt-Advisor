/**
 * @jest-environment jsdom
 */
'use strict'

const fs = require('fs')
const path = require('path')
const { mountWithBuefy } = require('../helpers/mountComponent')
const GlossaryTerm = require('~/components/base/GlossaryTerm.vue').default
const GLOSSARY = require('~/data/glossary.json')

/**
 * The plain-English glossary — Mike's request of 2026-09-05: "most of the accountants
 * using this will be junior in terms of experience".
 *
 * 🔴 THE FIRST TEST IS THE REASON THIS FILE EXISTS. A mistyped key renders NOTHING — no
 * error, no empty tooltip, no clue. A person in UAT sees a heading with no "?" beside it
 * and has no way to know one was meant to be there, so this is precisely the class of
 * fault a test has to catch and a human cannot.
 *
 * Nothing here asserts a DEFINITION's wording. That is Mike's, it lives in
 * data/glossary.json, and it moves without these tests breaking.
 */

const ROOT = path.join(__dirname, '..', '..')

/** Every `glossary-term(term="…")` written into a Pug template anywhere in the app. */
function keysUsedInTemplates () {
  const dirs = ['components', 'components/base', 'pages']
  const used = []
  dirs.forEach((dir) => {
    const full = path.join(ROOT, dir)
    if (!fs.existsSync(full)) { return }
    fs.readdirSync(full)
      .filter(name => name.endsWith('.vue'))
      .forEach((name) => {
        const src = fs.readFileSync(path.join(full, name), 'utf8')
        const re = /glossary-term\(\s*term="([^"]+)"/g
        let m = re.exec(src)
        while (m) {
          used.push({ file: dir + '/' + name, key: m[1] })
          m = re.exec(src)
        }
      })
  })
  return used
}

describe('every glossary key on a screen has a definition behind it', () => {
  test('🔴 no screen asks for a term the glossary does not hold', () => {
    const missing = keysUsedInTemplates()
      .filter(u => !GLOSSARY.terms[u.key])
      .map(u => u.file + ' → ' + u.key)
    expect(missing).toEqual([])
  })

  test('the forecast screens actually use it, so the guard above is not vacuous', () => {
    // A test that passes because nothing uses the component would be worthless. This is
    // the assertion that keeps the one above honest.
    expect(keysUsedInTemplates().length).toBeGreaterThan(5)
  })
})

describe('the definitions themselves are complete', () => {
  const keys = Object.keys(GLOSSARY.terms)

  test('every entry carries both a term and a definition, and neither is blank', () => {
    keys.forEach((key) => {
      const entry = GLOSSARY.terms[key]
      expect(typeof entry.term).toBe('string')
      expect(entry.term.trim().length).toBeGreaterThan(0)
      expect(typeof entry.plain).toBe('string')
      expect(entry.plain.trim().length).toBeGreaterThan(0)
    })
  })

  test('a definition is two sentences of help, not a training course', () => {
    // The cap is deliberate and generous. A tooltip nobody finishes reading explains
    // nothing, and the moment one needs 400 characters it wants a page instead.
    keys.forEach((key) => {
      expect(GLOSSARY.terms[key].plain.length).toBeLessThanOrEqual(400)
    })
  })
})

describe('the component itself', () => {
  test('a known term renders its mark', () => {
    const w = mountWithBuefy(GlossaryTerm, { propsData: { term: 'facility' } })
    expect(w.find('.gt-mark').exists()).toBe(true)
    w.destroy()
  })

  test('🔴 an unknown term renders nothing at all, rather than an empty tooltip', () => {
    const w = mountWithBuefy(GlossaryTerm, { propsData: { term: 'noSuchTermExists' } })
    expect(w.find('.gt-mark').exists()).toBe(false)
    w.destroy()
  })
})
