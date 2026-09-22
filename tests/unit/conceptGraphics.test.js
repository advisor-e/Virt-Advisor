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
 * into a client's document, and a drawing that stops being lazily loaded or
 * grows past the weight one concept may cost.
 *
 * What is deliberately NOT asserted, per the 2026-08-24 testing rule: how a
 * drawing looks, what any label on it says, or that a file exists for its own
 * sake.
 */

'use strict'

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const builder = require('../../scripts/build-concept-graphics')
const { concepts } = require('../../data/strategy-frameworks.json')

const ROOT = path.join(__dirname, '..', '..')
const MOCKUPS = path.join(ROOT, 'design', 'mockups')

describe('every shipped drawing is the drawing Mike approved', () => {
  test('no component has drifted from its mockup', () => {
    const { stale } = builder.build({ check: true })

    expect(stale).toEqual([])
  })

  test('a checkout\'s line endings are not mistaken for a changed drawing', () => {
    // 🔴 THE FALSE ALARM THAT TRAINS PEOPLE TO IGNORE THE ALARM. git is
    // `core.autocrlf=true` on both machines and rewrites these generated files
    // to CRLF whenever it touches the working tree — a clone, a branch switch, a
    // merge from `master`. Compared byte for byte, every concept then reads as
    // drifted from the drawing Mike approved, on a clean tree, and the pre-push
    // hook blocks the push. Nobody can see this on a screen; it looks exactly
    // like the real thing this guard is for.
    const unix = '<template lang="pug">\n  .scg.\n    <svg></svg>\n</template>\n'
    const windows = unix.replace(/\n/g, '\r\n')

    expect(builder.sameDrawing(windows, unix)).toBe(true)
    expect(builder.sameDrawing(unix, unix)).toBe(true)

    // And it still catches the thing it exists for.
    expect(builder.sameDrawing(unix.replace('.scg.', '.scg.x'), unix)).toBe(false)
    expect(builder.sameDrawing(null, unix)).toBe(false)
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

  test('every drawing binds all five parts of the mark', () => {
    // Five since Mike's rulings of 2026-09-22: the logo became the mark and the
    // border came back in the firm's colour. A regenerate that bound four of
    // five on one drawing would ship a single unbranded page among 33, which is
    // exactly the kind of thing nobody notices until a client has it.
    builder.DRAWINGS.forEach((d) => {
      const file = path.join(
        ROOT, 'components', 'strategy', 'concepts',
        builder.componentName(d.conceptId) + '.vue'
      )
      const shipped = fs.readFileSync(file, 'utf8')

      expect(shipped).toContain(':fill="firmColour"')
      expect(shipped).toContain('{{ firmInitial }}')
      expect(shipped).toContain('{{ firmName }}')
      expect(shipped).toContain(':href="firmLogo"')
      expect(shipped).toContain(':stroke="firmColour"')
    })
  })

  test('the disc, the initial and the name are ALL guarded as the fallback', () => {
    // Mike, 2026-09-22: the logo IS the mark and the disc is what a firm without
    // one falls back to. Guard two of the three and a firm with a logo gets the
    // logo AND its initials printed over the top of it.
    builder.DRAWINGS.forEach((d) => {
      const file = path.join(
        ROOT, 'components', 'strategy', 'concepts',
        builder.componentName(d.conceptId) + '.vue'
      )
      const shipped = fs.readFileSync(file, 'utf8')

      expect((shipped.match(/v-if="!firmLogo"/g) || []).length).toBe(3)
      expect((shipped.match(/v-if="firmLogo"/g) || []).length).toBe(1)
    })
  })

  test('A LOGO OF ANY PROPORTION FITS — the box never stretches or crops it', () => {
    // This single attribute is the whole answer to the objection the monogram
    // disc existed for: "a real logo is an image of unknown proportion".
    // preserveAspectRatio="none" would stretch every logo to the box and look
    // deliberate, and no test of colour or position would catch it.
    builder.DRAWINGS.forEach((d) => {
      const file = path.join(
        ROOT, 'components', 'strategy', 'concepts',
        builder.componentName(d.conceptId) + '.vue'
      )
      const shipped = fs.readFileSync(file, 'utf8')
      const image = /<image[^>]*class="fm-logo"[^>]*>/.exec(shipped)

      expect(image).not.toBeNull()
      expect(image[0]).toContain('preserveAspectRatio="xMinYMid meet"')
    })
  })
})

describe('the firm border is on every drawing, identically', () => {
  const MOCKUPS = path.join(ROOT, 'design', 'mockups')
  const files = fs.readdirSync(MOCKUPS).filter(f => /^strategy-concept-.*\.html$/.test(f))

  test('every drawing has one, and its geometry matches the page it borders', () => {
    // Mike, 2026-09-22, on being shown one drawing bordered: "there is NO reason
    // why you would have some and not others". Every viewBox is 0 0 1500 844, so
    // one geometry is correct everywhere and a drawing carrying a different one
    // has been hand-edited away from the migration.
    let svgs = 0
    let borders = 0

    files.forEach((f) => {
      const src = fs.readFileSync(path.join(MOCKUPS, f), 'utf8')
      svgs += (src.match(/<svg /g) || []).length
      const found = src.match(/<rect class="firm-border"[^>]*>/g) || []
      borders += found.length
      found.forEach((rect) => {
        expect(rect).toContain('x="5" y="5" width="1490" height="834"')
        expect(rect).toContain('fill="none"')
      })
    })

    expect(svgs).toBe(32)
    expect(borders).toBe(svgs)
  })

  test('the border is drawn LAST, so nothing paints over it', () => {
    // A border added before the artwork is a border a full-bleed panel hides,
    // and the page then looks unbranded for a reason no colour check finds.
    files.forEach((f) => {
      const src = fs.readFileSync(path.join(MOCKUPS, f), 'utf8')
      const re = /<rect class="firm-border"[^>]*><\/rect>\s*<\/svg>/g
      expect((src.match(re) || []).length).toBe((src.match(/<svg /g) || []).length)
    })
  })
})

describe('a drawing reaches the screen it was drawn for', () => {
  test('every registered id is a real concept', () => {
    const known = {}
    concepts.forEach((c) => { known[c.id] = true })

    const unknown = builder.DRAWINGS
      .reduce((acc, d) => acc.concat(builder.servedConcepts(d)), [])
      .filter(id => !known[id])

    // A typo here is silent: the concept simply never shows its picture, and the
    // screen looks exactly like a concept that has not been drawn yet. This
    // reads the concepts a drawing SERVES, so the second id on a shared page —
    // Price For Delivery Medium — is checked like any other.
    expect(unknown).toEqual([])
  })

  test('no concept is registered twice', () => {
    const ids = builder.DRAWINGS
      .reduce((acc, d) => acc.concat(builder.servedConcepts(d)), [])

    // Two drawings claiming one concept would leave which of them ships to the
    // order of this list, silently.
    expect(ids.length).toBe(new Set(ids).size)
  })
})

describe('a drawing costs no more than one concept is worth', () => {
  test('no single drawing exceeds the weight one concept may cost', () => {
    // 🔴 THIS REPLACED A BAN ON PASTED-IN PICTURES, AND THE BAN WAS WRONG.
    // It refused five drawings whose artwork is a photograph, on the grounds
    // that they weigh 307 KB gzipped against a 300 KB first-load budget — but
    // no drawing is in the first-load bundle at all. Each is its own lazy
    // chunk, which the test below pins, so the figure that can actually hurt
    // anyone is the largest SINGLE drawing, fetched once when that concept is
    // opened and cached after. Measured at the 2026-09-20 build: first load
    // 129.5 KB gzipped, every concept chunk outside it.
    //
    // So the guard is a per-drawing ceiling rather than a ban on a technique.
    // A photograph belongs inside its drawing — that is what makes it survive
    // into the client's printed plan (Mike, 2026-09-20) — but a drawing that
    // arrived carrying an unscaled 5 MB original would be a real fault, and
    // nobody in UAT could see it. The ceiling has room for the largest we
    // have and none for that.
    const CEILING_KB = 200

    const over = builder.DRAWINGS.map((d) => {
      const html = fs.readFileSync(path.join(MOCKUPS, d.file), 'utf8')
      const kb = zlib.gzipSync(Buffer.from(builder.nthSvg(html, d.svg))).length / 1024
      return { id: d.conceptId, kb: Math.round(kb) }
    }).filter(r => r.kb > CEILING_KB)

    expect(over).toEqual([])
  })

  test('no approved drawing is left out of the list without a reason', () => {
    // 🔴 A FORGOTTEN DRAWING IS INVISIBLE. The concept falls back to Mike's
    // words, which is exactly what a concept that has not been drawn yet does —
    // so nothing on any screen distinguishes "not drawn" from "drawn, approved,
    // and never wired up". A person in UAT cannot see the difference either.
    const wired = {}
    builder.DRAWINGS.forEach((d) => { wired[d.file + '#' + d.svg] = true })

    const missed = []
    fs.readdirSync(MOCKUPS)
      .filter(f => /^strategy-concept-.*\.html$/.test(f))
      .forEach((file) => {
        const html = fs.readFileSync(path.join(MOCKUPS, file), 'utf8')
        const count = (html.match(/<svg[\s\S]*?<\/svg>/g) || []).length

        for (let n = 1; n <= count; n++) {
          if (wired[file + '#' + n]) { continue }
          // There is no longer any accepted reason. This used to excuse a
          // drawing carrying a pasted-in picture, which quietly exempted the
          // five that most needed wiring; every approved drawing is now in the
          // list, so anything unwired here is a drawing nobody wired.
          missed.push(file + ' drawing ' + n)
        }
      })

    expect(missed).toEqual([])
  })

  test('every drawing is loaded lazily, never imported into the main bundle', () => {
    const registry = fs.readFileSync(
      path.join(ROOT, 'components', 'strategy', 'concepts', 'index.js'),
      'utf8'
    )

    expect(registry).not.toMatch(/^import\s/m)
    builder.DRAWINGS.forEach((d) => {
      builder.servedConcepts(d).forEach((id) => {
        // Quoted or not — `pricing` is the one id the lint will not let us
        // quote — what matters is that the id loads through `import()`.
        const key = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        expect(registry).toMatch(new RegExp("^\\s*'?" + key + "'?: \\(\\) => import\\(", 'm'))
      })
    })
  })
})
