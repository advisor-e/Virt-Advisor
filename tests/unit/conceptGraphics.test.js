/**
 * The concept drawings, and the one promise they have to keep.
 *
 * 🔴 WHAT UAT CANNOT SEE IS DRIFT FROM THE ARTEFACT. A tester looking at Porter's
 * hub sees a diagram; they cannot know whether it is the diagram Mike approved or
 * one a session nudged afterwards. That is the whole reason these components are
 * GENERATED from the mockups rather than written — and this suite is what makes
 * "copied, never redrawn" checkable instead of claimed. It is the same failure
 * family as the Logic-Lab mockup of 2026-08-01, where the record kept the
 * paraphrase and lost the original.
 *
 * It also guards two things a person cannot see at all: a sample firm hardcoded
 * into a client's document, and a 300 KB picture pasted into the first-load
 * bundle.
 *
 * What is deliberately NOT asserted, per the 2026-08-24 testing rule: how a
 * drawing looks, what any label on it says, or that a file exists for its own
 * sake.
 */

'use strict'

const fs = require('fs')
const path = require('path')

const builder = require('../../scripts/build-concept-graphics')
const { concepts } = require('../../data/strategy-frameworks.json')

const ROOT = path.join(__dirname, '..', '..')
const MOCKUPS = path.join(ROOT, 'design', 'mockups')

describe('every shipped drawing is the drawing Mike approved', () => {
  test('no component has drifted from its mockup', () => {
    const { stale } = builder.build({ check: true })

    expect(stale).toEqual([])
  })

  test('each drawing is lifted whole, not summarised', () => {
    builder.DRAWINGS.forEach((d) => {
      const html = fs.readFileSync(path.join(MOCKUPS, d.file), 'utf8')
      const svg = builder.nthSvg(html, d.svg)
      const file = path.join(
        ROOT, 'components', 'strategy', 'concepts',
        builder.componentName(d.conceptId) + '.vue'
      )
      const shipped = fs.readFileSync(file, 'utf8')

      // Every drawn element of the artefact reaches the component. The firm mark
      // is the one deliberate edit and is checked separately below.
      const elements = (svg.match(/<(path|rect|circle|ellipse|line|polyline|polygon|text|image)\b/g) || [])
      expect(elements.length).toBeGreaterThan(0)

      const shippedElements = (shipped.match(/<(path|rect|circle|ellipse|line|polyline|polygon|text|image)\b/g) || [])
      expect(shippedElements.length).toBe(elements.length)
    })
  })
})

describe('a client document can never print somebody else\'s firm', () => {
  test('no drawing ships the sample firm from the mockup', () => {
    builder.DRAWINGS.forEach((d) => {
      const file = path.join(
        ROOT, 'components', 'strategy', 'concepts',
        builder.componentName(d.conceptId) + '.vue'
      )
      const shipped = fs.readFileSync(file, 'utf8')

      // The three sample firms the drawings use to demonstrate the switch.
      expect(shipped).not.toMatch(/Hartley/)
      expect(shipped).not.toMatch(/Northbridge/)
      expect(shipped).not.toMatch(/Kestrel/)
    })
  })

  test('every drawing binds all three parts of the mark', () => {
    builder.DRAWINGS.forEach((d) => {
      const file = path.join(
        ROOT, 'components', 'strategy', 'concepts',
        builder.componentName(d.conceptId) + '.vue'
      )
      const shipped = fs.readFileSync(file, 'utf8')

      expect(shipped).toContain(':fill="firmColour"')
      expect(shipped).toContain('{{ firmInitial }}')
      expect(shipped).toContain('{{ firmName }}')
    })
  })
})

describe('a drawing reaches the screen it was drawn for', () => {
  test('every registered id is a real concept', () => {
    const known = {}
    concepts.forEach((c) => { known[c.id] = true })

    const unknown = builder.DRAWINGS
      .map(d => d.conceptId)
      .filter(id => !known[id])

    // A typo here is silent: the concept simply never shows its picture, and the
    // screen looks exactly like a concept that has not been drawn yet.
    expect(unknown).toEqual([])
  })

  test('no concept is registered twice', () => {
    const ids = builder.DRAWINGS.map(d => d.conceptId)

    expect(ids.length).toBe(new Set(ids).size)
  })
})

describe('the first-load budget survives the drawings', () => {
  test('no drawing carries a pasted-in picture', () => {
    builder.DRAWINGS.forEach((d) => {
      const html = fs.readFileSync(path.join(MOCKUPS, d.file), 'utf8')
      const svg = builder.nthSvg(html, d.svg)

      // Five of the 33 hold a photograph or an exported chart as base64 text,
      // 307 KB gzipped between them against a 300 KB budget for the whole app.
      // Their image has to be lifted out to a file before they can be generated.
      expect(svg).not.toContain('data:image/')
    })
  })

  test('every drawing is loaded lazily, never imported into the main bundle', () => {
    const registry = fs.readFileSync(
      path.join(ROOT, 'components', 'strategy', 'concepts', 'index.js'),
      'utf8'
    )

    expect(registry).not.toMatch(/^import\s/m)
    builder.DRAWINGS.forEach((d) => {
      expect(registry).toContain("'" + d.conceptId + "': () => import(")
    })
  })
})
