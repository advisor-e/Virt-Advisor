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
        builder.componentName(d.conceptId, d.sheet) + '.vue'
      )
      const shipped = fs.readFileSync(file, 'utf8')

      // Every drawn element of the artefact reaches the component. The firm mark
      // is the one deliberate edit and is checked separately below.
      const elements = (svg.match(/<(path|rect|circle|ellipse|line|polyline|polygon|text|image)\b/g) || [])
      expect(elements.length).toBeGreaterThan(0)

      const shippedElements = (shipped.match(/<(path|rect|circle|ellipse|line|polyline|polygon|text|image)\b/g) || [])

      // 🔴 THE AGENDA SLOT ADDS EXACTLY TWO, AND HIS OWN ROWS ARE STILL ALL THERE.
      // A drawing with a live region keeps its drawn group WHOLE under `v-if` and
      // gains a SIBLING group under `v-else` holding one bullet and one line of
      // text, rendered once per session step. Counted rather than waved through:
      // any other difference is still the drawing being summarised, which is what
      // this test exists to catch.
      const slotRows = /class="agenda-slot is-live"/.test(shipped) ? 2 : 0
      expect(shippedElements.length).toBe(elements.length + slotRows)
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
    // frame came back in the firm's colour. A regenerate that bound four of
    // five on one drawing would ship a single unbranded page among 33, which is
    // exactly the kind of thing nobody notices until a client has it.
    //
    // ⚠ THE FRAME IS FIVE FILLED BARS, NOT A STROKED RECT, since 2026-09-23 —
    // his own page breaks its foot so the logo stands in the gap, and a single
    // rect cannot break. All five must take the colour: four out of five is a
    // grey line down one edge of a client's page.
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

      const bars = shipped.match(/<rect class="firm-bar[^>]*:fill="firmColour"[^>]*>/g) || []
      expect(d.conceptId + ' bars:' + bars.length).toBe(d.conceptId + ' bars:5')
      expect(shipped).not.toContain('class="firm-border"')
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

describe('the firm frame is on every drawing, identically', () => {
  const MOCKUPS = path.join(ROOT, 'design', 'mockups')
  const files = fs.readdirSync(MOCKUPS).filter(f => /^strategy-concept-.*\.html$/.test(f))

  // 🔴 THE GEOMETRY IS MIKE'S OWN PAGE, AND THESE FIVE NUMBERS ARE WHY THIS TEST
  // EXISTS. Until 2026-09-23 every drawing carried ONE rounded rect — rx=8, inset
  // 0.333%, bar 0.667%, unbroken at the foot — and a note on the approved artefact
  // said the drawings "already carry this exact frame". Measured, not one of the 32
  // did. That single unchecked sentence is why the frame ported into
  // StrategyPlanFrame.vue on 2026-09-22 never appeared on a teaching page: the page
  // is told to use the drawing's frame, and the drawing's was the wrong one.
  //
  // Converted from `design/mockups/strategy-plan-firm-mark.html`, rules `.deck .bd.*`
  // (machine-extracted from Advance.6.Organisational Review.pdf, 720x405pt) into the
  // drawings' own 1500x844 viewBox — the same 16:9, so a percentage maps directly.
  const BARS = [
    ['is-t', 'x="8.13" y="8.13" width="1483.74" height="14.8"'],
    ['is-l', 'x="8.13" y="22.92" width="14.16" height="798.16"'],
    ['is-r', 'x="1477.71" y="22.92" width="14.16" height="798.16"'],
    ['is-bl', 'x="8.13" y="821.07" width="95.01" height="14.8"'],
    ['is-brun', 'x="248.31" y="821.07" width="1243.56" height="14.8"']
  ]

  test('every drawing carries the five bars of his page, to the same numbers', () => {
    // Mike, 2026-09-22, on being shown one drawing bordered: "there is NO reason
    // why you would have some and not others". Every viewBox is 0 0 1500 844, so
    // one geometry is correct everywhere and a drawing carrying a different one
    // has been hand-edited away from the migration.
    let svgs = 0
    const counts = {}

    files.forEach((f) => {
      const src = fs.readFileSync(path.join(MOCKUPS, f), 'utf8')
      svgs += (src.match(/<svg /g) || []).length
      BARS.forEach(([cls, geometry]) => {
        const found = src.match(new RegExp('<rect class="firm-bar ' + cls + '"[^>]*>', 'g')) || []
        counts[cls] = (counts[cls] || 0) + found.length
        found.forEach((rect) => { expect(rect).toContain(geometry) })
      })
    })

    // 32 drawings until 2026-09-23; then Our Session Objective (1) and
    // Collaborative Thinking (2 sheets).
    expect(svgs).toBe(35)
    BARS.forEach(([cls]) => expect(cls + ':' + counts[cls]).toBe(cls + ':' + svgs))
  })

  test('the foot is TWO bars with a gap, never one — the logo stands in the gap', () => {
    // A rounded rect and a CSS border fail for the same reason and both were tried:
    // neither can break. The stub ends at x=103.14 and the run starts at x=248.31,
    // so the gap is real and the mark is not painted over a line.
    const stubEnd = 8.13 + 95.01
    const runStart = 248.31

    expect(runStart).toBeGreaterThan(stubEnd)

    files.forEach((f) => {
      const src = fs.readFileSync(path.join(MOCKUPS, f), 'utf8')
      // Nothing may reintroduce the single unbroken rect this replaced.
      expect(src).not.toContain('class="firm-border"')
    })
  })

  test('the registry knows which drawings title themselves, and it is read not guessed', () => {
    // 🔴 THE PAGE MUST NOT PRINT A SECOND TITLE OVER HIS — Mike, 2026-09-23. Measured
    // by size and position in the top band: 31 of the 32 drawings open with a title at
    // 45.8-50px, and `vertical-integration` is the one that does not. Its page still
    // needs ours, so a registry that claimed all 32 would strip the only title off it.
    //
    // ⚠ A SUBSTRING MATCH ON THE NAME WAS TRIED FIRST AND IS WRONG: it called Sales
    // Channel Options titled because a chart label read "sales", and missed Blue Ocean
    // Strategy whose title is split across two text elements.
    const registry = fs.readFileSync(
      path.join(ROOT, 'components', 'strategy', 'concepts', 'index.js'), 'utf8'
    )
    const block = (registry.match(/CONCEPT_TITLED = \{([\s\S]*?)\n\}/) || [])[1] || ''

    // 🔴 THIS COUNTS CONCEPTS, NOT DRAWINGS, and the two are no longer the same
    // number. 32 until 2026-09-23, then Our Session Objective and Collaborative
    // Thinking — which is ONE entry across its two sheets, because a concept either
    // titles itself or does not. Emitting it per drawing produced a duplicate key,
    // which the lint caught and this count would not have.
    expect((block.match(/: true/g) || []).length).toBe(34)
    expect(block).not.toContain('vertical-integration')
    expect(block).toContain('porters-5-forces')
  })

  test('the registry names the two concepts whose bullets repeat their own drawing', () => {
    // 🔴 ITEM 15.12, ruled fixed rather than filed — Mike, 2026-09-23. A teaching page
    // printed his full-page drawing and then repeated the questions inside it as
    // bullets underneath, so a client read the same five questions twice on one page;
    // on A4 the page grew past the sheet and split mid-list. It is on the RUN SESSION
    // SCREEN too, which the item's own wording missed because it described a printing
    // fault and there is no sheet to overflow on a screen.
    //
    // Generated by word overlap, never listed: Porter's 5 Forces 92%, The 8 Profit
    // Levers 74%, everything else far below 60%. A concept whose prompts are genuinely
    // extra keeps every one of them, which is the half a hand-written list gets wrong.
    const registry = fs.readFileSync(
      path.join(ROOT, 'components', 'strategy', 'concepts', 'index.js'), 'utf8'
    )
    const block = (registry.match(/CONCEPT_PROMPTS_ECHOED = \{([\s\S]*?)\n\}/) || [])[1] || ''

    expect((block.match(/: true/g) || []).length).toBe(2)
    expect(block).toContain('porters-5-forces')
    expect(block).toContain('the-8-profit-levers')
  })

  test('the frame is drawn LAST, so nothing paints over it', () => {
    // A frame added before the artwork is a frame a full-bleed panel hides,
    // and the page then looks unbranded for a reason no colour check finds.
    files.forEach((f) => {
      const src = fs.readFileSync(path.join(MOCKUPS, f), 'utf8')
      const re = /<rect class="firm-bar is-brun"[^>]*><\/rect>\s*<\/svg>/g
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

  test('no concept is registered twice on the same sheet', () => {
    // 🔴 A CONCEPT MAY HAVE SEVERAL SHEETS SINCE 2026-09-23, so the identity is
    // the PAIR — concept and sheet — not the concept alone. Two drawings claiming
    // one concept AND one sheet would leave which of them ships to the order of
    // the list, silently, which is the fault this has always guarded.
    const keys = builder.DRAWINGS.reduce(function (acc, d) {
      return acc.concat(builder.servedConcepts(d).map(function (id) {
        return id + '#' + (d.sheet || 1)
      }))
    }, [])

    expect(keys.length).toBe(new Set(keys).size)

    // And a concept's sheets are 1..n with none missing — a gap would mean a
    // sheet was dropped from the list and the concept teaches part of itself.
    const bySheet = {}
    builder.DRAWINGS.forEach(function (d) {
      builder.servedConcepts(d).forEach(function (id) {
        bySheet[id] = (bySheet[id] || []).concat(d.sheet || 1)
      })
    })
    Object.keys(bySheet).forEach(function (id) {
      const want = bySheet[id].map(function (_, i) { return i + 1 })
      expect(id + ':' + bySheet[id].slice().sort().join(',')).toBe(id + ':' + want.join(','))
    })
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

    const awaiting = {}
    builder.AWAITING_APPROVAL.forEach((d) => { awaiting[d.file + '#' + d.svg] = true })

    const missed = []
    fs.readdirSync(MOCKUPS)
      .filter(f => /^strategy-concept-.*\.html$/.test(f))
      .forEach((file) => {
        const html = fs.readFileSync(path.join(MOCKUPS, file), 'utf8')
        const count = (html.match(/<svg[\s\S]*?<\/svg>/g) || []).length

        for (let n = 1; n <= count; n++) {
          if (wired[file + '#' + n]) { continue }
          // The ONE accepted reason, and it is not an excuse — it is a state.
          // A drawing saved so Mike can look at it, before he has approved it,
          // may sit unwired while it is declared in `AWAITING_APPROVAL` and its
          // register row says the same. Every other unwired drawing is a drawing
          // nobody wired. (This used to excuse a drawing carrying a pasted-in
          // picture, which quietly exempted the five that most needed wiring.)
          if (awaiting[file + '#' + n]) { continue }
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
        // ⚠ A LIST SINCE 2026-09-23 — one entry per teaching sheet. The id opens an
        // array; every import() in the file is still checked for laziness by the
        // assertion above, so a concept cannot go back to a bare factory unnoticed.
        expect(registry).toMatch(new RegExp("^\\s*'?" + key + "'?: \\[$", 'm'))
      })
    })
  })
})

// 🔴 THE THIRD STATE, AND THE FOUR CHECKS THAT STOP IT BECOMING A LOOPHOLE.
// `AWAITING_APPROVAL` lets a drawing Mike has not yet approved be committed —
// which *Save the Artefact* requires — without it being built, which is what
// being in `DRAWINGS` means. Item 15.19. Nothing here relaxes the guard above:
// these make the waiting state cost something to enter and impossible to
// forget, so it cannot be used to park a drawing indefinitely.
describe('a drawing waiting on Mike is declared, and cannot be forgotten', () => {
  const ARTEFACTS = fs.readFileSync(path.join(ROOT, 'design', 'ARTEFACTS.md'), 'utf8')

  /** The exact token a register row must carry for one waiting drawing. */
  const token = d => 'AWAITING APPROVAL (' + d.file + '#' + d.svg + ')'

  test('nothing is both waiting for approval and already built', () => {
    // Wiring a drawing in is what approval MEANS here. Leaving it in both
    // lists would let an approved drawing keep a waiting drawing's exemption.
    const wired = {}
    builder.DRAWINGS.forEach((d) => { wired[d.file + '#' + d.svg] = true })

    const both = builder.AWAITING_APPROVAL
      .filter(d => wired[d.file + '#' + d.svg])
      .map(d => d.file + '#' + d.svg)

    expect(both).toEqual([])
  })

  test('a waiting entry points at a drawing that really exists', () => {
    // An entry naming a file or a drawing number that is not there would
    // exempt nothing and hide the fact, which is worse than no entry at all.
    const wrong = builder.AWAITING_APPROVAL.filter((d) => {
      const file = path.join(MOCKUPS, d.file)
      if (!fs.existsSync(file)) { return true }
      const count = (fs.readFileSync(file, 'utf8').match(/<svg[\s\S]*?<\/svg>/g) || []).length
      return !(d.svg >= 1 && d.svg <= count)
    }).map(d => d.file + '#' + d.svg)

    expect(wrong).toEqual([])
  })

  test('the register and the code agree on what is waiting', () => {
    // 🔴 THIS IS THE HALF THAT CLOSES THE STATE. The register row is where
    // Mike's approval gets recorded, so the moment somebody records it by
    // removing this token, the build fails until the drawing is wired into
    // DRAWINGS and its entry removed here. Without this a drawing could be
    // approved and left unbuilt for ever, invisible on every screen — which
    // is the exact fault the guard above exists to catch.
    const missingToken = builder.AWAITING_APPROVAL
      .filter(d => !ARTEFACTS.includes(token(d)))
      .map(d => d.file + '#' + d.svg)

    expect(missingToken).toEqual([])

    const declared = {}
    builder.AWAITING_APPROVAL.forEach((d) => { declared[token(d)] = true })

    // Deliberately strict: a real token names an .html file and a digit. The
    // register's own explanation of the convention uses a `<placeholder>`
    // form, which must NOT read as a drawing nobody declared.
    const orphanTokens = (ARTEFACTS.match(/AWAITING APPROVAL \([A-Za-z0-9._-]+\.html#\d+\)/g) || [])
      .filter(t => !declared[t])

    expect(orphanTokens).toEqual([])
  })

  test('a waiting entry says when it was shown and what it belongs to', () => {
    // A bare {file, svg} is unreadable six weeks later. The date is how anyone
    // sees that a drawing has been waiting too long; the item is where the
    // decision lives.
    const thin = builder.AWAITING_APPROVAL.filter(d =>
      !/^\d{4}-\d{2}-\d{2}$/.test(String(d.since)) || !/^\d+(\.\d+)?$/.test(String(d.item))
    ).map(d => d.file + '#' + d.svg)

    expect(thin).toEqual([])
  })
})
