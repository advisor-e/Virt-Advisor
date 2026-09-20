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
 * ⚠ IT REFUSES A DRAWING CARRYING A PASTED-IN PICTURE. Five of the 33 hold a
 * photograph or an exported chart as base64 text inside the SVG — 307 KB
 * gzipped between them, which is the whole first-load budget. Those need their
 * image lifted out to a file first; the script stops rather than quietly
 * shipping one into the bundle.
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
 * 🔴 FIVE OF THE 33 APPROVED DRAWINGS ARE DELIBERATELY ABSENT and each is named
 * below where it would sit. They hold a photograph or an exported chart pasted
 * in as base64 — 307 KB gzipped between them against a 300 KB first-load budget
 * for the whole app — so their image has to be lifted out to a file before they
 * can be generated. The script refuses them either way; the notes are here so
 * nobody re-derives which five.
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

  // batch-2 drawings 1, 2 and 4 — Market Diffusion Theory, Product Life Cycle
  // and E. Deming's Volatility Theory — carry a pasted-in picture.
  { file: 'strategy-concept-batch-2.html', svg: 3, conceptId: 'sigmoid-curve' },

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
  // batch-5 drawing 4 — Digital Funnel Storyboard — carries a pasted-in picture.
  { file: 'strategy-concept-batch-5.html', svg: 5, conceptId: 'outbound-messaging-plan' },
  { file: 'strategy-concept-batch-5.html', svg: 6, conceptId: 'inbound-landing-page-review' },
  { file: 'strategy-concept-batch-5.html', svg: 7, conceptId: 'sparketing-friction-review' },
  { file: 'strategy-concept-batch-5.html', svg: 8, conceptId: 'branding-review' },
  { file: 'strategy-concept-batch-5.html', svg: 9, conceptId: 'customer-loyalty-programme' },
  // batch-5 drawing 10 — Packaging/ Bundling — carries a pasted-in picture.
  { file: 'strategy-concept-batch-5.html', svg: 11, conceptId: 'sales-process-review' },

  { file: 'strategy-concept-porters.html', svg: 1, conceptId: 'porters-5-forces' },
  { file: 'strategy-concept-technology-points.html', svg: 1, conceptId: 'technology-points' }
]

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
 * PascalCase component name from a concept id. `the-8-profit-levers` becomes
 * `The8ProfitLevers`.
 *
 * @param {string} conceptId
 * @returns {string}
 */
function componentName (conceptId) {
  return conceptId
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
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
  { group: 'class="firm-mark"', disc: 'class="fm-disc"', init: 'class="fm-init"', name: 'class="fm-name"' },
  { group: 'id="firmMark"', disc: 'id="firmDisc"', init: 'id="firmInitials"', name: 'id="firmName"' }
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
    '$1 :fill="firmColour"'
  )
  out = out.replace(
    new RegExp('(<text[^>]*' + escapeAttr(mark.init) + '[^>]*>)[\\s\\S]*?(</text>)'),
    '$1{{ firmInitial }}$2'
  )
  out = out.replace(
    new RegExp('(<text[^>]*' + escapeAttr(mark.name) + '[^>]*>)[\\s\\S]*?(</text>)'),
    '$1{{ firmName }}$2'
  )

  if (out.indexOf(':fill="firmColour"') === -1 ||
      out.indexOf('{{ firmInitial }}') === -1 ||
      out.indexOf('{{ firmName }}') === -1) {
    throw new Error('firm-mark found but one of its three parts did not bind')
  }
  return out
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
 * @returns {string}
 */
function render (drawing, svg) {
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
  name: '${componentName(drawing.conceptId)}',

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

    /** The firm's colour, as a CSS colour. */
    firmColour: {
      type: String,
      default: '#0070c0'
    }
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

    if (svg.indexOf('data:image/') !== -1) {
      throw new Error(
        drawing.conceptId + ': the drawing carries a pasted-in picture. Lift the ' +
        'image out to static/ and point the SVG at it before generating — see the ' +
        'header of this script.'
      )
    }

    const source = render(drawing, bindFirmMark(svg))
    const file = path.join(OUT, componentName(drawing.conceptId) + '.vue')
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
 * 🔴 LAZY IS NOT AN OPTIMISATION HERE. The 33 drawings weigh 361 KB gzipped
 * between them and the first-load budget for the whole app is 300 KB, so a
 * drawing loads when its concept is opened and never before.
 *
 * @returns {string}
 */
function renderRegistry () {
  const rows = DRAWINGS.reduce((acc, d) => {
    const name = componentName(d.conceptId)
    // A drawing serving two concepts registers both against the same chunk, so
    // the second concept shows the page rather than a second copy of it.
    servedConcepts(d).forEach((id) => {
      acc.push(
        '  ' + registryKey(id) + ': () => import(\n' +
        "    /* webpackChunkName: 'concept-" + d.conceptId + "' */\n" +
        "    '~/components/strategy/concepts/" + name + ".vue'\n  )"
      )
    })
    return acc
  }, []).join(',\n')

  return `/**
 * ⚠ GENERATED — DO NOT EDIT. \`node scripts/build-concept-graphics.js\`.
 *
 * Every concept that has an approved teaching drawing, and how to load it.
 * A concept absent from this map has no drawing yet, and the screens fall back
 * to Mike's words — which is what they did for all 52 before item 15.7.
 */

/** @type {Object<string, function(): Promise<object>>} */
export const CONCEPT_GRAPHICS = {
${rows}
}

/**
 * @param {string} conceptId
 * @returns {boolean} true where an approved drawing exists
 */
export function hasConceptGraphic (conceptId) {
  return Boolean(conceptId) && Object.prototype.hasOwnProperty.call(CONCEPT_GRAPHICS, conceptId)
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

module.exports = { DRAWINGS, componentName, nthSvg, bindFirmMark, servedConcepts, sameDrawing, build }
