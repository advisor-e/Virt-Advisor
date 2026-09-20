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
 * so this is a list of drawings, not a list of pages.
 */
const DRAWINGS = [
  { file: 'strategy-concept-batch-1.html', svg: 1, conceptId: 'risk-reward-matrix' },
  { file: 'strategy-concept-batch-1.html', svg: 2, conceptId: 'boston-model' },
  { file: 'strategy-concept-batch-1.html', svg: 3, conceptId: 'the-8-profit-levers' },
  { file: 'strategy-concept-batch-1.html', svg: 4, conceptId: 'vertical-integration' }
]

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
 * Replace the drawing's sample firm with the three props.
 *
 * The mark is `<g class="firm-mark">` holding `.fm-disc` (the coloured circle),
 * `.fm-init` (one letter) and `.fm-name`. Everything else is left alone.
 *
 * @param {string} svg
 * @returns {string}
 * @throws if the mark is missing — a drawing without one would ship a client
 *   document with no firm on it, and that is the fault this work exists to fix.
 */
function bindFirmMark (svg) {
  if (svg.indexOf('class="firm-mark"') === -1) {
    throw new Error('no firm-mark group — the drawing cannot carry a firm logo')
  }

  let out = svg.replace(
    /(<circle[^>]*class="fm-disc"[^>]*?)\sfill="[^"]*"/,
    '$1 :fill="firmColour"'
  )
  out = out.replace(
    /(<text[^>]*class="fm-init"[^>]*>)[\s\S]*?(<\/text>)/,
    '$1{{ firmInitial }}$2'
  )
  out = out.replace(
    /(<text[^>]*class="fm-name"[^>]*>)[\s\S]*?(<\/text>)/,
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

    if (current === source) { return }
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

  if (currentRegistry !== registry) {
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
 * The concept-id → drawing map, as lazy imports.
 *
 * 🔴 LAZY IS NOT AN OPTIMISATION HERE. The 33 drawings weigh 361 KB gzipped
 * between them and the first-load budget for the whole app is 300 KB, so a
 * drawing loads when its concept is opened and never before.
 *
 * @returns {string}
 */
function renderRegistry () {
  const rows = DRAWINGS.map((d) => {
    const name = componentName(d.conceptId)
    return "  '" + d.conceptId + "': () => import(\n" +
      "    /* webpackChunkName: 'concept-" + d.conceptId + "' */\n" +
      "    '~/components/strategy/concepts/" + name + ".vue'\n  )"
  }).join(',\n')

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

if (require.main === module) {
  const check = process.argv.indexOf('--check') !== -1
  try {
    const result = build({ check })
    if (check) {
      if (result.stale.length) {
        console.error('Out of step with their drawings:\n  ' + result.stale.join('\n  '))
        process.exit(1)
      }
      console.log(DRAWINGS.length + ' concept graphics match their approved drawings.')
    } else if (result.written.length) {
      console.log('Written:\n  ' + result.written.join('\n  '))
    } else {
      console.log('Already up to date — ' + DRAWINGS.length + ' concept graphics.')
    }
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}

module.exports = { DRAWINGS, componentName, nthSvg, bindFirmMark, build }
