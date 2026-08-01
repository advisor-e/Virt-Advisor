'use strict'

/**
 * Tests for utils/i18nMessages.js and, just as importantly, for the two REAL
 * locale files it joins.
 *
 * The merge exists because Collaborate brought its own wording file. The danger
 * it guards against is not a crash — it is a silent one: two files claiming the
 * same section name, the second quietly replacing every label under the first,
 * and a screen that reads wrongly with nothing in any log.
 */

const { mergeSections, COLLABORATE_SECTIONS } = require('../../utils/i18nMessages')
const ourEn = require('../../locales/en.json')
const collaborateEn = require('../../locales/collaborate/en.json')

describe('mergeSections', () => {
  test('adds the named sections and leaves the originals untouched', () => {
    const base = { a: { x: 1 } }
    const extra = { b: { y: 2 }, c: { z: 3 } }

    const merged = mergeSections(base, extra, ['b'])

    expect(merged).toEqual({ a: { x: 1 }, b: { y: 2 } })
    expect(base).toEqual({ a: { x: 1 } }) // not mutated
    expect(merged.c).toBeUndefined() // only what was asked for
  })

  test('THROWS on a colliding section rather than silently replacing it', () => {
    const base = { common: { cancel: 'Cancel' } }
    const extra = { common: { cancel: 'Abandon' } }

    expect(() => mergeSections(base, extra, ['common']))
      .toThrow(/section 'common' exists in both/)
  })

  test('throws when a requested section is missing, rather than merging nothing', () => {
    expect(() => mergeSections({}, { a: {} }, ['nope']))
      .toThrow(/'nope' was requested but is not in the merged locale file/)
  })
})

describe('the real locale files', () => {
  test('the app builds its English messages without a collision', () => {
    // If this fails, a section name was added to one file that already exists in
    // the other — and the app would refuse to start rather than mislabel a screen.
    expect(() => mergeSections(ourEn, collaborateEn, COLLABORATE_SECTIONS)).not.toThrow()
  })

  test('`profile` is the known clash and is deliberately NOT merged', () => {
    // Both files define it. It stays out until it is renamed — this test is what
    // stops someone "fixing" the omission by adding it to the list.
    expect(Object.prototype.hasOwnProperty.call(ourEn, 'profile')).toBe(true)
    expect(Object.prototype.hasOwnProperty.call(collaborateEn, 'profile')).toBe(true)
    expect(COLLABORATE_SECTIONS).not.toContain('profile')
  })

  test('every key the Adviser Network tab renders actually resolves', () => {
    // The tab reuses Collaborate's component, so its labels come from Collaborate's
    // file. A section left out of COLLABORATE_SECTIONS does not error — it renders
    // the raw key on screen, which is why this walks the components for real.
    const fs = require('fs')
    const messages = mergeSections(ourEn, collaborateEn, COLLABORATE_SECTIONS)
    const sources = [
      'components/collaborate/shared/ManagerConsole.vue',
      'components/collaborate/shared/ConsoleNode.vue',
      'components/firm/FirmAdviserNetwork.vue'
    ]

    const missing = []
    sources.forEach((file) => {
      const text = fs.readFileSync(file, 'utf8')
      const pattern = /\$t\('([^']+)'/g
      let match
      while ((match = pattern.exec(text))) {
        const key = match[1]
        // Keys built by concatenation ($t('console.titles.' + tier)) end at a dot;
        // their parent must exist, and that is what is checked.
        const path = key.endsWith('.') ? key.slice(0, -1).split('.') : key.split('.')
        const resolved = path.reduce((node, part) => (node && typeof node === 'object') ? node[part] : undefined, messages)
        if (resolved === undefined) { missing.push(key) }
      }
    })

    expect(missing).toEqual([])
  })
})
