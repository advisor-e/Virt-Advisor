'use strict'

/**
 * build-concept-graphics — turns an APPROVED concept drawing into a Vue component.
 *
 * 🔴 THE DRAWING IS COPIED, NEVER REDRAWN. Every graphic in
 * `components/strategy/concepts/` is lifted character for character out of the
 * mockup Mike approved, by this script, so what ships is provably what he saw.
 * The one and only edit is the firm's mark: the three values that make it
 * Hartley & Co on the drawing become props, which is the entire reason these
 * were drawn rather than photographed (item 15.7, and his ruling of 2026-09-18 —
 * *"in client dealings, Advisor-e ALWAYS clones and shows that ADVISORS firm
 * logo - never advisor-e"*).
 *
 * Run it again after a drawing is corrected and republished; the components
 * follow. Hand-editing a file in `concepts/` breaks that guarantee and the
 * header of every generated file says so.
 *
 * 🔴 A DRAWING MAY CARRY A PASTED-IN PICTURE, AND FIVE OF THE 33 DO — the
 * concepts whose artwork is a photograph rather than a drawing. DO NOT PUT THE
 * REFUSAL BACK. It stood here until 2026-09-20 on the grounds that those five
 * weigh 307 KB gzipped against a 300 KB first-load budget, and that comparison
 * is not one that applies: every drawing is a lazy import (`renderRegistry`),
 * so no drawing is in the first-load bundle at all — the suite pins exactly
 * that. They are five separate chunks, fetched one at a time when that concept
 * is opened, the largest 120 KB, cached after. The same picture held in
 * `static/` would weigh 118 KB, because base64 costs a third and gzip hands it
 * straight back. Measured: wiring all five in moved first load 129.5 → 129.6 KB
 * gzipped.
 *
 * 🔴 SO THE PICTURE STAYS INSIDE THE DRAWING — Mike's requirement, 2026-09-20:
 * *"theres no point having a graphic if it wont push through to the clients
 * plan."* That plan is printed, saved as a PDF and emailed on
 * (`StrategyPlanDocument.vue`, `@media print`), and a graphic living at a URL
 * reaches none of those. Inline, it is part of the document — and the component
 * is character for character the artefact he approved, the firm mark aside.
 *
 * Usage: node scripts/build-concept-graphics.js [--check]
 *   --check  writes nothing; fails if any component is out of step with its
 *            drawing. This is what the test uses.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const MOCKUPS = path.join(ROOT, 'design', 'mockups')
const OUT = path.join(ROOT, 'components', 'strategy', 'concepts')

/**
 * The approved framework cards, read for their prompt bullets alone — item 15.12.
 * A prompt that merely repeats what the drawing already says must not print twice.
 */
const FRAMEWORKS = (() => {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'strategy-frameworks.json'), 'utf8'))
  return Array.isArray(raw) ? raw : (raw.frameworks || raw.concepts || [])
})()

/**
 * Which drawing belongs to which concept.
 *
 * `svg` is the 1-based position of the drawing in that file, which is the order
 * the artefact presents them in. The concept ids are `data/strategy-frameworks.json`.
 *
 * ⚠ ONE PAGE CAN TEACH TWO CONCEPTS — Strategic Orientation 2 p20 is Price For
 * Problem Solving and Price For Delivery Medium, scoped separately in the menu —
 * so this is a list of drawings, not a list of pages. `alsoServes` points the
 * second concept at the same component, rather than shipping the same drawing
 * twice under two names.
 *
 * ⚠ FIVE OF THESE CARRY A PASTED-IN PICTURE rather than a drawn graphic —
 * Market Diffusion Theory, Product Life Cycle, E. Deming's Volatility Theory,
 * the Digital Funnel Storyboard and Packaging/ Bundling. They are listed here
 * like any other, because the picture travels inside the drawing; see the
 * header for why it is not lifted out to a file.
 *
 * A sixth concept, Drafting Tender Proposals, has no drawing at all and is not
 * an omission: Mike's own summary calls it general guidance, and his tender
 * notes run p53–p56. See the foot of `strategy-concept-batch-5.html`.
 */
const DRAWINGS = [
  { file: 'strategy-concept-batch-1.html', svg: 1, conceptId: 'risk-reward-matrix' },
  { file: 'strategy-concept-batch-1.html', svg: 2, conceptId: 'boston-model' },
  { file: 'strategy-concept-batch-1.html', svg: 3, conceptId: 'the-8-profit-levers' },
  { file: 'strategy-concept-batch-1.html', svg: 4, conceptId: 'vertical-integration' },

  { file: 'strategy-concept-batch-2.html', svg: 1, conceptId: 'market-diffusion-theory' },
  { file: 'strategy-concept-batch-2.html', svg: 2, conceptId: 'product-life-cycle' },
  { file: 'strategy-concept-batch-2.html', svg: 3, conceptId: 'sigmoid-curve' },
  { file: 'strategy-concept-batch-2.html', svg: 4, conceptId: 'e-demings-volatility-theory' },

  { file: 'strategy-concept-batch-3.html', svg: 1, conceptId: 'progression-of-economic-value' },
  { file: 'strategy-concept-batch-3.html', svg: 2, conceptId: 'horizontal-integration' },
  { file: 'strategy-concept-batch-3.html', svg: 3, conceptId: 'blue-ocean-strategy' },
  { file: 'strategy-concept-batch-3.html', svg: 4, conceptId: 'revenue-streams' },
  { file: 'strategy-concept-batch-3.html', svg: 5, conceptId: 'senges-circles-of-causality' },

  { file: 'strategy-concept-batch-4.html', svg: 1, conceptId: '10-marketing-messages' },
  { file: 'strategy-concept-batch-4.html', svg: 2, conceptId: 'customer-persona-type-table' },
  { file: 'strategy-concept-batch-4.html', svg: 3, conceptId: 'a-i-d-c-r-a-advertisement-framework' },
  { file: 'strategy-concept-batch-4.html', svg: 4, conceptId: 'pricing' },
  { file: 'strategy-concept-batch-4.html', svg: 5, conceptId: 'sales-channel-options' },
  {
    file: 'strategy-concept-batch-4.html',
    svg: 6,
    conceptId: 'price-for-problem-solving',
    alsoServes: ['price-for-delivery-medium']
  },

  { file: 'strategy-concept-batch-5.html', svg: 1, conceptId: 'product-fit-review' },
  { file: 'strategy-concept-batch-5.html', svg: 2, conceptId: '6-marketing-questions' },
  { file: 'strategy-concept-batch-5.html', svg: 3, conceptId: 'product-fit' },
  { file: 'strategy-concept-batch-5.html', svg: 4, conceptId: 'digital-funnel-storyboard' },
  { file: 'strategy-concept-batch-5.html', svg: 5, conceptId: 'outbound-messaging-plan' },
  { file: 'strategy-concept-batch-5.html', svg: 6, conceptId: 'inbound-landing-page-review' },
  { file: 'strategy-concept-batch-5.html', svg: 7, conceptId: 'sparketing-friction-review' },
  { file: 'strategy-concept-batch-5.html', svg: 8, conceptId: 'branding-review' },
  { file: 'strategy-concept-batch-5.html', svg: 9, conceptId: 'customer-loyalty-programme' },
  { file: 'strategy-concept-batch-5.html', svg: 10, conceptId: 'packaging-bundling' },
  { file: 'strategy-concept-batch-5.html', svg: 11, conceptId: 'sales-process-review' },

  { file: 'strategy-concept-porters.html', svg: 1, conceptId: 'porters-5-forces' },
  { file: 'strategy-concept-technology-points.html', svg: 1, conceptId: 'technology-points' },

  // 🔴 THE ONLY DRAWING WITH A LIVE REGION IN IT — its AGENDA block is the session's
  // own step list, Mike's ruling of 2026-09-23. `bindAgendaSlot` handles it; every
  // other drawing is fixed artwork and passes through untouched.
  { file: 'strategy-concept-our-session-objective.html', svg: 1, conceptId: 'our-session-objective' },

  // 🔴 THE ONLY CONCEPT WITH TWO TEACHING SHEETS, and the reason `sheet` exists.
  // Mike, 2026-09-23: *"include BOTH the christchurch engineer and picture +
  // debonos explanation"*. His two pages hold 799 and 1,042 body characters at
  // 22.9-25pt, so one sheet could only carry both by shrinking his own type,
  // which the method forbids because his sizes are READ off his page. Sheet 1 is
  // the story his p10 tells the advisor to draw; sheet 2 is that page's theory.
  { file: 'strategy-concept-collaborative-thinking.html', svg: 1, sheet: 1, conceptId: 'collaborative-thinking' },
  { file: 'strategy-concept-collaborative-thinking.html', svg: 2, sheet: 2, conceptId: 'collaborative-thinking' }
]

/**
 * Drawings that are saved and shown to Mike but NOT yet approved, and so not yet built.
 *
 * 🔴 THE THIRD STATE, AND WHY IT HAD TO EXIST. Two rules we keep pulled against each
 * other and left no legal move. *Save the Artefact* requires a drawing to be a committed
 * file BEFORE Mike approves it. The guard below requires every drawing in a
 * `strategy-concept-*.html` to be in `DRAWINGS` — and being in `DRAWINGS` IS being built,
 * because that list is what generates the component an advisor sees. So a drawing awaiting
 * his word could neither be saved nor shown without either shipping it unapproved or
 * leaving the suite red. On 2026-09-23 a day's work sat uncommitted for exactly this
 * reason. Item 15.19.
 *
 * ⚠ NEITHER RULE IS WEAKENED. An unwired drawing is still a failure — unless it is listed
 * here AND its file's row in `design/ARTEFACTS.md` carries the matching
 * `AWAITING APPROVAL (<file>#<svg>)` token. The two must agree, which is what closes the
 * other half: the moment somebody records Mike's approval by removing that token, the
 * build fails until the drawing is wired into `DRAWINGS` and its entry removed from here.
 * A drawing cannot be approved and quietly forgotten, which is the fault the guard was
 * written for in the first place.
 *
 * `since` is the date it was shown to him and `item` the live-list item it belongs to,
 * so an entry that has sat here too long is legible rather than invisible.
 *
 * @type {Array<{file: string, svg: number, since: string, item: string}>}
 */
const AWAITING_APPROVAL = [1, 2, 3, 4, 5, 6].map(svg => ({
  file: 'strategy-concept-alignment-statements.html', svg, since: '2026-09-26', item: '15.28'
}))

/**
 * Every concept a drawing serves, in registry order.
 *
 * @param {{conceptId: string, alsoServes: string[]=}} drawing
 * @returns {string[]}
 */
function servedConcepts (drawing) {
  return [drawing.conceptId].concat(drawing.alsoServes || [])
}

/**
 * What the component calls itself — the file name behind a `Concept` prefix.
 *
 * 🔴 THE PREFIX IS NOT DECORATION. Two concept ids begin with a digit —
 * `6-marketing-questions` and `10-marketing-messages` — and Vue refuses a
 * component name that does not start with a letter, so both logged
 * *"Invalid component name"* to the console on every session that opened them.
 * Nothing broke (a drawing is loaded as an object, never resolved by name) and
 * nobody in UAT would ever see it, which is exactly why it sat there. Found by
 * reading the console while proving item 15.7, 2026-09-20.
 *
 * Every drawing takes the prefix rather than only the two, because a rule that
 * applies to some names is one a later id quietly falls outside.
 *
 * @param {string} conceptId
 * @returns {string}
 */
function registeredName (conceptId, sheet) {
  return 'Concept' + componentName(conceptId, sheet)
}

/**
 * PascalCase component name from a concept id. `the-8-profit-levers` becomes
 * `The8ProfitLevers`. This is the FILE name; `registeredName` is what the
 * component calls itself.
 *
 * @param {string} conceptId
 * @returns {string}
 */
function componentName (conceptId, sheet) {
  const base = conceptId
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  // 🔴 A CONCEPT MAY HAVE MORE THAN ONE TEACHING SHEET SINCE 2026-09-23, and two
  // sheets sharing one file name would silently overwrite each other — the first
  // would simply never ship, and nothing on any screen would say so. Sheet 1 keeps
  // the plain name so the other 33 components are untouched.
  return sheet && sheet > 1 ? base + 'Sheet' + sheet : base
}

/**
 * Pull the nth `<svg>…</svg>` out of a drawing.
 *
 * @param {string} html the mockup's source
 * @param {number} n 1-based
 * @returns {string} the SVG, exactly as the artefact holds it
 */
function nthSvg (html, n) {
  const re = /<svg[\s\S]*?<\/svg>/g
  let m
  let i = 0
  while ((m = re.exec(html))) {
    i++
    if (i === n) { return m[0] }
  }
  throw new Error('drawing ' + n + ' not found (file holds ' + i + ')')
}

/**
 * How a drawing names its firm mark.
 *
 * The group holds a coloured disc, one letter, and the firm's name. Two
 * spellings exist and both are read here.
 *
 * ⚠ PORTER'S USES THE OLDER ONE AND IS NOT TO BE REDRAWN FOR IT. It was the
 * first concept drawn (2026-09-18) and named the mark with ids; the 31 drawings
 * that followed, and this script, settled on classes. The difference is in the
 * attribute names alone — not one drawn element differs — so the reader accepts
 * both rather than editing an artefact Mike has approved. Found 2026-09-20,
 * when the exemplar the whole method was built from turned out to be the one
 * drawing the method could not read.
 *
 * @type {Array<{group: string, disc: string, init: string, name: string}>}
 */
const MARK_DIALECTS = [
  {
    group: 'class="firm-mark"',
    disc: 'class="fm-disc"',
    init: 'class="fm-init"',
    name: 'class="fm-name"',
    logo: 'class="fm-logo"'
  },
  {
    group: 'id="firmMark"',
    disc: 'id="firmDisc"',
    init: 'id="firmInitials"',
    name: 'id="firmName"',
    // The one drawing on the id dialect still uses the class for its logo box:
    // the migration of 2026-09-22 added that element to all 32 uniformly, and
    // there was no reason to reproduce a dialect that exists only by accident.
    logo: 'class="fm-logo"'
  }
]

/**
 * Make an attribute safe to drop into a regular expression.
 *
 * @param {string} attr
 * @returns {string}
 */
function escapeAttr (attr) {
  return attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Replace the drawing's sample firm with the three props.
 *
 * Everything outside the mark is left alone.
 *
 * @param {string} svg
 * @returns {string}
 * @throws if the mark is missing — a drawing without one would ship a client
 *   document with no firm on it, and that is the fault this work exists to fix.
 */
function bindFirmMark (svg) {
  const mark = MARK_DIALECTS.find(d => svg.indexOf(d.group) !== -1)

  if (!mark) {
    throw new Error('no firm-mark group — the drawing cannot carry a firm logo')
  }

  let out = svg.replace(
    new RegExp('(<circle[^>]*' + escapeAttr(mark.disc) + '[^>]*?)\\sfill="[^"]*"'),
    '$1 v-if="!firmLogo" :fill="firmColour"'
  )
  out = out.replace(
    new RegExp('(<text[^>]*' + escapeAttr(mark.init) + ')([^>]*>)[\\s\\S]*?(</text>)'),
    '$1 v-if="!firmLogo"$2{{ firmInitial }}$3'
  )
  out = out.replace(
    new RegExp('(<text[^>]*' + escapeAttr(mark.name) + ')([^>]*>)[\\s\\S]*?(</text>)'),
    '$1 v-if="!firmLogo"$2{{ firmName }}$3'
  )

  // THE LOGO IS THE MARK AND THE DISC IS THE FALLBACK — Mike's ruling,
  // 2026-09-22. The drawing carries a placeholder logo so the artefact can show
  // the box working; here that sample href becomes the prop, exactly as the
  // sample firm name does. The three fallback elements above take `v-if` rather
  // than being deleted, because a firm holding no logo still needs them.
  out = out.replace(
    new RegExp('(<image[^>]*' + escapeAttr(mark.logo) + '[^>]*?)\\shref="[^"]*"'),
    '$1 v-if="firmLogo" :href="firmLogo"'
  )

  // The frame, in the firm's colour. Mike's second ruling the same day: the
  // colour drove ONE element before this — the disc — so ruling the disc into a
  // fallback would have left a branded firm's colour showing nowhere at all.
  //
  // 🔴 FIVE BARS, NOT ONE RECT, SINCE 2026-09-23. The drawings carried a single
  // rounded rect — rx=8, inset 0.333%, bar 0.667%, unbroken at the foot — and
  // Mike's own page is square, inset 0.542%, bar 0.986%, with the foot BROKEN so
  // the logo stands in the gap. Measured across all 32: not one matched. The
  // geometry now comes from `design/mockups/strategy-plan-firm-mark.html`, which
  // he approved on 2026-09-22 after it was machine-extracted from his PDF.
  //
  // ⚠ A ROUNDED RECT AND A CSS BORDER FAIL FOR THE SAME REASON — neither can
  // break for the logo. That is why this is five filled bars and not a stroke.
  const bars = (out.match(/<rect[^>]*class="firm-bar[^>]*?\sfill="[^"]*"/g) || []).length
  out = out.replace(
    /(<rect[^>]*class="firm-bar[^>]*?)\sfill="[^"]*"/g,
    '$1 :fill="firmColour"'
  )

  if (out.indexOf(':fill="firmColour"') === -1 ||
      out.indexOf('{{ firmInitial }}') === -1 ||
      out.indexOf('{{ firmName }}') === -1 ||
      out.indexOf(':href="firmLogo"') === -1 ||
      bars !== 5) {
    throw new Error(
      'firm-mark found but one of its five parts did not bind' +
      (bars !== 5 ? ' — expected 5 frame bars, found ' + bars : '')
    )
  }
  return out
}

/**
 * His agenda rows, measured off Advance.2.Strategic Orientation.1.pdf p2.
 *
 * The bullet and the text sit at fixed x on every row; only y advances. The
 * pitch is his own four rows averaged — 584.41, 619.30, 653.68, 688.05, so
 * (688.05 - 584.41) / 3 — rather than a number chosen to look right.
 */
const AGENDA_ROW = { bulletX: 98.09, textX: 150.69, firstY: 584.41, pitch: 34.5467, size: 25, ink: '#434343' }

/**
 * Turn the drawing's `agenda-slot` group into a live list, where one exists.
 *
 * 🔴 WHY A DRAWING HAS A SLOT AT ALL, WHICH NO OTHER ONE DOES. Mike ruled on
 * 2026-09-23 that the framing page's AGENDA **is the session's own step list** —
 * the steps an advisor names in Build session, which already drive Run session
 * and the client's plan — and not a second list belonging to the page. His words
 * about that step list, 2026-09-21: *"the client's agenda stops naming our
 * screens."* Two lists of the day's running order could disagree, and the one a
 * client reads would be the wrong one.
 *
 * 🔴 HIS OWN ROWS ARE KEPT, CHARACTER FOR CHARACTER, AS THE FALLBACK. They are
 * what the artefact shows and therefore what he approved, so they must still be
 * on the page when no session supplies steps. The generated list is a SIBLING
 * group under `v-else`, never an edit to his.
 *
 * ⚠ A STEP NAME IS NOT ONE OF HIS MEASURED LINES, so the generated rows carry no
 * `textLength`. Pinning an advisor's own wording to the width of Mike's sentence
 * would stretch or crush it — the pin exists to reproduce HIS justification.
 *
 * @param {string} svg
 * @returns {{svg: string, hasSlot: boolean}}
 */
function bindAgendaSlot (svg) {
  const open = svg.indexOf('<g class="agenda-slot"')
  if (open === -1) { return { svg, hasSlot: false } }

  const close = svg.indexOf('</g>', open)
  if (close === -1) { throw new Error('agenda-slot group is not closed') }

  const head = svg.slice(open, svg.indexOf('>', open) + 1)
  const drawn = svg.slice(open, close + 4)
  const r = AGENDA_ROW

  // His group, untouched but for the v-if that hides it once a session has steps.
  const fallback = drawn.replace(head, head.slice(0, -1) + ' v-if="!agendaItems.length">')

  const live = [
    '<g class="agenda-slot is-live" v-else font-family="Open Sans, sans-serif">',
    '  <template v-for="(item, i) in agendaItems">',
    '    <text :key="\'b\' + i" x="' + r.bulletX + '"',
    '          :y="' + r.firstY + ' + i * ' + r.pitch + '"',
    '          font-size="' + r.size + '" fill="' + r.ink + '">&#9679;</text>',
    '    <text :key="\'t\' + i" x="' + r.textX + '"',
    '          :y="' + r.firstY + ' + i * ' + r.pitch + '"',
    '          font-size="' + r.size + '" fill="' + r.ink + '">{{ item }}</text>',
    '  </template>',
    '</g>'
  ].join('\n        ')

  return { svg: svg.slice(0, open) + fallback + '\n        ' + live + svg.slice(close + 4), hasSlot: true }
}

/**
 * The component's source.
 *
 * The SVG sits in a Pug raw-text block, so it reaches the compiler unchanged
 * rather than being re-expressed as Pug — which is what "copied, never redrawn"
 * has to mean at the file level too.
 *
 * @param {{conceptId: string, file: string, svg: number}} drawing
 * @param {string} svg the bound SVG
 * @param {boolean} hasSlot whether this drawing carries the agenda slot
 * @returns {string}
 */
function render (drawing, svg, hasSlot) {
  // A blank line stays blank rather than becoming four spaces — the lint forbids
  // trailing whitespace, and indenting nothing is not part of the drawing.
  const indented = svg.split('\n').map(l => (l.trim() ? '    ' + l.replace(/\s+$/, '') : '')).join('\n')
  return `<template lang="pug">
  .scg.
${indented}
</template>

<script>
/**
 * ⚠ GENERATED — DO NOT EDIT THIS FILE.
 *
 * Lifted from design/mockups/${drawing.file} (drawing ${drawing.svg}) by
 * \`node scripts/build-concept-graphics.js\`. Correct the drawing and run the
 * script; an edit made here is lost and breaks the guarantee that what ships is
 * what Mike approved.
 *
 * Vue 2, Options API, Pug.
 */
export default {
  name: '${registeredName(drawing.conceptId, drawing.sheet)}',

  props: {
    /** The advisor firm's name, printed beside the mark. */
    firmName: {
      type: String,
      default: ''
    },

    /** One letter for the disc. */
    firmInitial: {
      type: String,
      default: ''
    },

    /** The firm's colour, as a CSS colour. Brands the page border and the disc. */
    firmColour: {
      type: String,
      default: '#0070c0'
    },

    /**
     * The firm's real logo, as an absolute http(s) URL.
     *
     * Mike's ruling, 2026-09-22: this IS the mark. The initials disc and the
     * printed name are the fallback shown only when a firm holds no logo. The
     * box is a fixed height with preserveAspectRatio="xMinYMid meet", so a logo
     * of any proportion is scaled to fit and never stretched or cropped.
     *
     * Supplied by \`firmBrand()\` in server/utils/firmsDirectory.js, which reads
     * it from Advisor-e's own firm profile record and returns null for anything
     * that is not an http(s) URL — so an empty string here is the safe state,
     * not a missing value.
     */
    firmLogo: {
      type: String,
      default: ''
    }${hasSlot ? `,

    /**
     * The session's own running order, one string per step.
     *
     * Mike's ruling, 2026-09-23: the framing page's AGENDA **is** the step list
     * the advisor names in Build session, not a second list of its own — so the
     * page a client reads and the order the app follows can never disagree.
     *
     * EMPTY IS NOT A MISSING VALUE. It means no session has supplied steps, and
     * the page then shows Mike's own four lines exactly as drawn, which is the
     * state the artefact was approved in.
     */
    agendaItems: {
      type: Array,
      default: () => []
    }` : ''}
  }
}
</script>

<style scoped>
.scg {
  width: 100%;
}

.scg >>> svg {
  display: block;
  width: 100%;
  height: auto;
}
</style>
`
}

/**
 * Whether a generated file still holds the drawing this script would write.
 *
 * 🔴 LINE ENDINGS ARE NOT CONTENT, AND TREATING THEM AS CONTENT BROKE THE GUARD.
 * This script writes LF; git is configured `core.autocrlf=true` here and there
 * is no `.gitattributes`, so it rewrites these files to CRLF every time it puts
 * them in the working tree — a fresh clone, a branch switch, a merge from
 * `master`. A byte comparison then reported every concept as drifted from its
 * approved drawing on a completely clean tree, which is the most alarming thing
 * this guard can say and was false every time. The pre-push hook runs the whole
 * suite, so the first person to merge `master` in was blocked, and the
 * obvious-looking fix — regenerate — buried any real change under 27 files of
 * line-ending churn. Found 2026-09-20.
 *
 * A match leaves the file alone rather than rewriting it, so a checkout's line
 * endings never show up as a change to review.
 *
 * @param {string|null} current what is on disk, or null where nothing is
 * @param {string} source what this script would write
 * @returns {boolean}
 */
function sameDrawing (current, source) {
  return current !== null && current.replace(/\r\n/g, '\n') === source.replace(/\r\n/g, '\n')
}

/**
 * Build every drawing.
 *
 * @param {{check: boolean}} opts
 * @returns {{written: string[], stale: string[]}}
 */
function build (opts) {
  const written = []
  const stale = []

  DRAWINGS.forEach((drawing) => {
    const html = fs.readFileSync(path.join(MOCKUPS, drawing.file), 'utf8')
    const svg = nthSvg(html, drawing.svg)
    // The mark binds first. The two touch different groups — the mark is never
    // inside the agenda slot — so the order cannot matter today; it is fixed
    // this way round because the mark is the one binding every drawing must
    // pass, and a drawing that fails it should fail before anything else runs.
    const slot = bindAgendaSlot(bindFirmMark(svg))
    const source = render(drawing, slot.svg, slot.hasSlot)
    const file = path.join(OUT, componentName(drawing.conceptId, drawing.sheet) + '.vue')
    const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null

    if (sameDrawing(current, source)) { return }
    if (opts.check) { stale.push(path.relative(ROOT, file)); return }

    fs.mkdirSync(OUT, { recursive: true })
    fs.writeFileSync(file, source, 'utf8')
    written.push(path.relative(ROOT, file))
  })

  const registry = renderRegistry()
  const registryFile = path.join(OUT, 'index.js')
  const currentRegistry = fs.existsSync(registryFile)
    ? fs.readFileSync(registryFile, 'utf8')
    : null

  if (!sameDrawing(currentRegistry, registry)) {
    if (opts.check) {
      stale.push(path.relative(ROOT, registryFile))
    } else {
      fs.mkdirSync(OUT, { recursive: true })
      fs.writeFileSync(registryFile, registry, 'utf8')
      written.push(path.relative(ROOT, registryFile))
    }
  }

  return { written, stale }
}

/**
 * A concept id as an object key.
 *
 * Nearly every id is hyphenated and has to be quoted; `pricing` is the one that
 * does not, and the lint's `quote-props` refuses a quote it does not need. The
 * generated file has to pass the same lint as a hand-written one.
 *
 * @param {string} id
 * @returns {string}
 */
function registryKey (id) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(id) ? id : "'" + id + "'"
}

/**
 * The concept-id → drawing map, as lazy imports.
 *
 * 🔴 LAZY IS WHAT KEEPS THE DRAWINGS OUT OF THE FIRST LOAD, AND IT IS LOAD-
 * BEARING. The 32 weigh 375 KB gzipped between them, the largest 120 KB, so
 * a static list of components would put all of it into every page load.
 * Measured at the 2026-09-20 build, wiring the last five in: first load
 * 129.5 → 129.6 KB gzipped against a 300 KB budget, because a drawing arrives
 * when its concept is opened and never before.
 *
 * @returns {string}
 */
/**
 * Does this drawing open with a title of its own?
 *
 * 🔴 WHY THIS IS READ AND NOT ASSUMED — Mike, 2026-09-23, on seeing a teaching page:
 * 20 of the 32 printed the concept's name TWICE, once as our page heading and once
 * inside his own drawing a few millimetres below it. Ten were word for word identical;
 * the rest were two wordings of one thing — our heading *Porter's 5 Forces* over his
 * *Porter's (Michael) 5 Forces*. The approved drawing could never have shown this: its
 * teaching-page example uses a placeholder box where the real drawing goes, so there
 * was no title inside it to collide with the heading above.
 *
 * ⚠ A SUBSTRING MATCH ON THE CONCEPT NAME IS NOT GOOD ENOUGH and was tried first —
 * it called Sales Channel Options titled because a chart label read "sales". A title is
 * a title by SIZE AND POSITION: the largest text in the top band of the page. Measured
 * that way, 31 of the 32 have one at 45.8-50px; only Vertical Integration does not.
 *
 * @param {string} svg the drawing, as the artefact holds it
 * @returns {boolean} true where the drawing titles itself, so the page must not
 */
function carriesOwnTitle (svg) {
  const TOP_BAND = 150 // of the 844-high viewBox
  const rx = /<text([^>]*)>([^<]*)<\/text>/g
  let biggest = 0
  let m

  while ((m = rx.exec(svg)) !== null) {
    if (m[2].trim().length < 3) { continue }
    const y = Number((m[1].match(/\by="([\d.]+)"/) || [])[1])
    const size = Number((m[1].match(/font-size="([\d.]+)"/) || [])[1])
    if (!isFinite(y) || !isFinite(size) || y > TOP_BAND) { continue }
    if (size > biggest) { biggest = size }
  }

  // His deck titles run 45.8-50px; the largest body text on any of these pages is 24.
  return biggest >= 40
}

/**
 * The words of a string, long enough to mean something.
 *
 * @param {string} s
 * @returns {string[]}
 */
function meaningfulWords (s) {
  return String(s || '')
    .replace(/&#\d+;|&[a-z]+;/g, ' ')
    .toLowerCase().replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/).filter(w => w.length > 3)
}

/**
 * Does this concept's drawing already say what its prompt bullets say?
 *
 * 🔴 ITEM 15.12, AND MIKE RULED IT FIXED ON 2026-09-23 rather than filed. A teaching
 * page printed one of his full-page drawings and then repeated the questions already
 * inside it as bullets underneath — so a client read the same five questions twice on
 * one page, and on A4 the page then grew past the sheet and split mid-list. The same
 * duplication is on the Run session screen, where there is no sheet to overflow, which
 * is why the item's own wording missed it.
 *
 * MEASURED, NOT LISTED: the prompt words against the drawing's words. Two concepts
 * cross the line — Porter's 5 Forces at 92% and The 8 Profit Levers at 74% — which is
 * exactly the "two teaching pages" the item names. Everything else is far below, so a
 * threshold at 60% separates them with room on both sides, and a concept whose prompts
 * are genuinely extra keeps them.
 *
 * @param {string} conceptId
 * @param {string} svg the drawing, as the artefact holds it
 * @returns {boolean} true where the bullets would repeat the drawing
 */
function promptsEchoTheDrawing (conceptId, svg) {
  const framework = FRAMEWORKS.find(f => (f.conceptId || f.id) === conceptId)
  const prompts = ((framework && framework.fields) || []).filter(f => f.prompt)
  if (!prompts.length) { return false }

  const inDrawing = new Set(meaningfulWords(
    (svg.match(/<text[^>]*>([^<]*)<\/text>/g) || []).join(' ').replace(/<[^>]*>/g, ' ')
  ))
  const promptWords = meaningfulWords(prompts.map(p => p.label + ' ' + p.prompt).join(' '))
  if (!promptWords.length) { return false }

  const shared = promptWords.filter(w => inDrawing.has(w)).length
  return shared / promptWords.length >= 0.6
}

function renderRegistry () {
  // 🔴 ONE CONCEPT, A LIST OF SHEETS — since 2026-09-23. This was one component
  // per concept, so a second sheet would have OVERWRITTEN the first in this
  // object with nothing failing anywhere: the concept would simply have taught
  // half of itself. The list keeps DRAWINGS order, which is the order the
  // artefact presents the sheets in.
  const sheets = new Map()
  DRAWINGS.forEach((d) => {
    const name = componentName(d.conceptId, d.sheet)
    // A drawing serving two concepts registers both against the same chunk, so
    // the second concept shows the page rather than a second copy of it.
    servedConcepts(d).forEach((id) => {
      if (!sheets.has(id)) { sheets.set(id, []) }
      sheets.get(id).push(
        '    () => import(\n' +
        "      /* webpackChunkName: 'concept-" + d.conceptId +
        (d.sheet > 1 ? '-sheet' + d.sheet : '') + "' */\n" +
        "      '~/components/strategy/concepts/" + name + ".vue'\n    )"
      )
    })
  })

  const rows = Array.from(sheets.entries())
    .map(function (entry) {
      return '  ' + registryKey(entry[0]) + ': [\n' + entry[1].join(',\n') + '\n  ]'
    })
    .join(',' + '\n')

  const titled = Array.from(DRAWINGS.reduce((acc, d) => {
    const svg = nthSvg(fs.readFileSync(path.join(MOCKUPS, d.file), 'utf8'), d.svg)
    if (!carriesOwnTitle(svg)) { return acc }
    servedConcepts(d).forEach((id) => { acc.add('  ' + registryKey(id) + ': true') })
    return acc
  }, new Set())).join(',' + String.fromCharCode(10))

  const echoed = Array.from(DRAWINGS.reduce((acc, d) => {
    const svg = nthSvg(fs.readFileSync(path.join(MOCKUPS, d.file), 'utf8'), d.svg)
    servedConcepts(d).forEach((id) => {
      if (promptsEchoTheDrawing(id, svg)) { acc.add('  ' + registryKey(id) + ': true') }
    })
    return acc
  }, new Set())).join(',' + String.fromCharCode(10))

  return `/**
 * ⚠ GENERATED — DO NOT EDIT. \`node scripts/build-concept-graphics.js\`.
 *
 * Every concept that has an approved teaching drawing, and how to load it.
 * A concept absent from this map has no drawing yet, and the screens fall back
 * to Mike's words — which is what they did for all 52 before item 15.7.
 */

/**
 * 🔴 EVERY VALUE IS AN ARRAY — ONE ENTRY PER TEACHING SHEET, in the order the
 * artefact presents them. All but one concept has exactly one; Collaborative
 * Thinking has two, because his two pages will not fit one sheet at his own type
 * sizes (Mike, 2026-09-23). A caller that renders \`list[0]\` alone teaches half a
 * concept, so \`conceptSheetCount\` is how a screen asks how many there are.
 *
 * @type {Object<string, Array<function(): Promise<object>>>}
 */
export const CONCEPT_GRAPHICS = {
${rows}
}

/**
 * Concepts whose drawing opens with a title of its own.
 *
 * 🔴 A PAGE WHOSE DRAWING TITLES ITSELF MUST NOT ADD A SECOND TITLE — Mike, 2026-09-23.
 * 20 of the 32 printed the concept's name twice, once as our heading and once inside
 * his own drawing below it; ten were identical word for word. Read from the artefact
 * by size and position, never guessed from the name.
 *
 * @type {Object<string, boolean>}
 */
export const CONCEPT_TITLED = {
${titled}
}

/**
 * @param {string} conceptId
 * @returns {boolean} true where an approved drawing exists
 */
export function hasConceptGraphic (conceptId) {
  return Boolean(conceptId) && Object.prototype.hasOwnProperty.call(CONCEPT_GRAPHICS, conceptId)
}

/**
 * How many teaching sheets this concept has.
 *
 * A screen loops this rather than assuming one, which is what every surface did
 * until 2026-09-23. Zero means the concept has no drawing and the screens fall
 * back to Mike's words.
 *
 * @param {string} conceptId
 * @returns {number}
 */
export function conceptSheetCount (conceptId) {
  return hasConceptGraphic(conceptId) ? CONCEPT_GRAPHICS[conceptId].length : 0
}

/**
 * Concepts whose prompt bullets merely repeat what the drawing already says.
 *
 * 🔴 ITEM 15.12 — a client read the same five questions twice on one page, once inside
 * Mike's drawing and once as bullets beneath it, and on A4 the page then split mid-list.
 * Measured by word overlap at build time: Porter's 5 Forces 92%, The 8 Profit Levers 74%,
 * everything else far below. A concept whose prompts are genuinely extra keeps them.
 *
 * @type {Object<string, boolean>}
 */
export const CONCEPT_PROMPTS_ECHOED = {
${echoed}
}

/**
 * @param {string} conceptId
 * @returns {boolean} true where the drawing titles itself, so the page must not
 */
export function conceptTitlesItself (conceptId) {
  return Boolean(conceptId) && Object.prototype.hasOwnProperty.call(CONCEPT_TITLED, conceptId)
}

/**
 * @param {string} conceptId
 * @returns {boolean} true where the bullets would repeat the drawing, so they must not print
 */
export function promptsEchoDrawing (conceptId) {
  return Boolean(conceptId) && Object.prototype.hasOwnProperty.call(CONCEPT_PROMPTS_ECHOED, conceptId)
}
`
}

/**
 * Drawings and concepts are not the same count — one page can teach two — so
 * the line says both rather than implying they agree.
 *
 * @returns {string}
 */
function tally () {
  const concepts = DRAWINGS.reduce((n, d) => n + servedConcepts(d).length, 0)
  return DRAWINGS.length + ' drawings, ' + concepts + ' concepts'
}

if (require.main === module) {
  const check = process.argv.indexOf('--check') !== -1
  try {
    const result = build({ check })
    if (check) {
      if (result.stale.length) {
        console.error('Out of step with their drawings:\n  ' + result.stale.join('\n  '))
        process.exit(1)
      }
      console.log(tally() + ' match their approved drawings.')
    } else if (result.written.length) {
      console.log('Written:\n  ' + result.written.join('\n  '))
      console.log(tally() + '.')
    } else {
      console.log('Already up to date — ' + tally() + '.')
    }
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}

module.exports = {
  DRAWINGS,
  AWAITING_APPROVAL,
  componentName,
  registeredName,
  nthSvg,
  bindFirmMark,
  servedConcepts,
  sameDrawing,
  build
}
