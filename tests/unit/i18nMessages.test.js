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

  test('the `profile` clash is settled: Collaborate\'s section is renamed and merged', () => {
    // The clash predicted when the front door surfaced every screen (2026-09-01)
    // arrived and was settled the required way (2026-09-02): Collaborate's section
    // is `collabProfile` in its own file and components. This pins the settlement —
    // the app keeps `profile`, Collaborate must never reintroduce one, and the
    // renamed section actually merges (a rename that fell out of the list would
    // render raw keys on /profile with no error anywhere).
    expect(Object.prototype.hasOwnProperty.call(ourEn, 'profile')).toBe(true)
    expect(Object.prototype.hasOwnProperty.call(collaborateEn, 'profile')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(collaborateEn, 'collabProfile')).toBe(true)
    expect(COLLABORATE_SECTIONS).not.toContain('profile')
    expect(COLLABORATE_SECTIONS).toContain('collabProfile')
  })

  test('every section in Collaborate\'s locale file is merged — none left behind', () => {
    // Since the front door, every Collaborate screen is reachable, so a section
    // missing from the list means raw keys on a live screen (the 2026-09-02 bug:
    // only 3 of 19 sections were merged and every header showed `nav.*`).
    expect([...COLLABORATE_SECTIONS].sort()).toEqual(Object.keys(collaborateEn).sort())
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

  test('every key the advisor screen renders actually resolves', () => {
    // Added 2026-08-14 with the move of ~90 interface strings off VirtualAdvisor.vue
    // and into `advisor.*`. A key that does not resolve does NOT throw — vue-i18n
    // renders the key itself, so the screen would show "advisor.save.confirm" on a
    // button and every test would still pass. This is the only thing that catches it.
    const fs = require('fs')
    const text = fs.readFileSync('components/VirtualAdvisor.vue', 'utf8')

    const missing = []
    const pattern = /\$t\('([^']+)'/g
    let match
    while ((match = pattern.exec(text))) {
      const key = match[1]
      // Keys built by concatenation ($t('advisor.domains.' + id)) end at a dot;
      // their parent must exist, and that is what is checked.
      const path = key.endsWith('.') ? key.slice(0, -1).split('.') : key.split('.')
      const resolved = path.reduce((node, part) => (node && typeof node === 'object') ? node[part] : undefined, ourEn)
      if (resolved === undefined) { missing.push(key) }
    }

    expect(missing).toEqual([])
  })

  test('the domain dropdown has a label for every id it asks for', () => {
    // The dropdown builds its keys by concatenation, so a missing domain would
    // render the raw key as a selectable option rather than failing anywhere.
    const fs = require('fs')
    const text = fs.readFileSync('components/VirtualAdvisor.vue', 'utf8')
    const block = text.match(/domainSelectorOptions \(\) \{\s*return \[([\s\S]*?)\]\.map/)

    expect(block).not.toBeNull()
    const ids = (block[1].match(/'([^']+)'/g) || []).map(s => s.replace(/'/g, ''))
    expect(ids.length).toBe(14)
    ids.forEach((id) => {
      expect(typeof ourEn.advisor.domains[id]).toBe('string')
    })
  })
})
