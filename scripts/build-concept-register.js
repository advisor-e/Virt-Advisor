/**
 * Build the Concept Register — Mike's 52 planning concepts, each beside the
 * slide it comes from.
 *
 * WHY THIS EXISTS. Mike's ruling, 2026-09-18: *"if you didnt know you had it
 * then i suggest we start by developing a basic table listing the topic/concept
 * - page, graphic and response table such that i can edit so we're in
 * agreement."*
 *
 * 🔴 IT SHOWS THE GRAPHIC, NOT THE NAME OF THE GRAPHIC. The concept index has
 * recorded `strategic-orientation-2, page 13` for Porter's since 16 September,
 * and the build still drew a diagram that put three of the four forces in the
 * wrong place — because a session read the label `radial-hub` and drew from the
 * label. A register of page numbers would have prevented none of that. Putting
 * his slide on the page is the whole point: a mismatch is then visible rather
 * than deducible.
 *
 * WHAT IS AUTHORED HERE: nothing about a concept. Every name, summary, page and
 * template below is copied from `data/strategy-frameworks.json`, which is itself
 * read off his decks. The only text this file writes is the page's own furniture.
 *
 * THE IMAGES ARE NOT IN THIS REPOSITORY. They are rendered from Mike's own decks
 * in `C:\Documents\Visual Code Projects\Strategy Planner`, the same folder
 * `read-capture-tables.js` takes the fill-in templates from. Pass the directory
 * holding them with --images; a concept whose slide is missing says so on the
 * page rather than showing a broken frame.
 *
 * Usage:
 *   node scripts/build-concept-register.js --images <dir> [--out <file>]
 */

'use strict'

const fs = require('fs')
const path = require('path')

const DATA_FILE = path.join(__dirname, '..', 'data', 'strategy-frameworks.json')

/**
 * The response forms the app actually holds, read into
 * `data/strategy-capture-tables.json` from Mike's own fill-in workbooks. The
 * register offers these BY NAME rather than a text box, so a pairing cannot be
 * made against a form that does not exist — Mike's ruling, 2026-09-18:
 * *"include that so there's nil mistakes."*
 */
const CAPTURE_FILE = path.join(__dirname, '..', 'data', 'strategy-capture-tables.json')

/**
 * Where each deck's 'page' actually comes from, in one sentence, because the
 * two sources mean very different things for the register.
 *
 * `session-scope-table` — the deck's own Session Scope table gives the concept
 * its own page, so the slide shown is the concept's slide.
 * `agenda` — the concept is a line on the deck's agenda slide, so the only page
 * we hold is the agenda itself. We do NOT know which slide teaches it. Those
 * rows are the ones Mike fills in.
 */
const AGENDA = 'agenda'

/**
 * The capture shapes `components/strategy/StrategyTeachingSlide.vue` draws a
 * GRAPHIC for. It is one, and naming it here rather than counting frameworks
 * keeps the register honest: four of the five framework records carry a shape
 * that lays out the capture boxes and draws nothing at all, so counting them
 * would tell Mike the app draws five concepts when it draws one.
 */
const DRAWN_SHAPES = ['forces']

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * @param {string[]} argv
 * @returns {{images: string, out: string}}
 */
function parseArgs (argv) {
  const get = (flag, fallback) => {
    const i = argv.indexOf(flag)
    return i === -1 || !argv[i + 1] ? fallback : argv[i + 1]
  }
  const images = get('--images', '')
  if (!images) {
    throw new Error('--images <dir> is required: the directory of rendered deck slides.')
  }
  return { images, out: get('--out', path.join(images, '..', 'concept-register.html')) }
}

/**
 * The rows, in the order a reader wants them: by deck as the decks are run,
 * then by page.
 *
 * @param {Object} data  the parsed strategy-frameworks.json
 * @param {Set<string>} haveSlide  slide filenames that were actually rendered
 * @returns {Array<Object>}
 */
function buildRows (data, haveSlide) {
  const deckName = {}
  const deckOrder = {}
  data.decks.forEach((d, i) => { deckName[d.id] = d.name; deckOrder[d.id] = i })

  const byConcept = {}
  data.frameworks.forEach((f) => { if (f.conceptId) { byConcept[f.conceptId] = f } })

  return data.concepts
    .map((c) => {
      const framework = byConcept[c.id] || null
      const known = c.source !== AGENDA
      const slide = slideName(c.deck, c.page)
      return {
        id: c.id,
        name: c.name,
        deck: c.deck,
        deckName: deckName[c.deck] || c.deck,
        deckOrder: deckOrder[c.deck],
        page: c.page,
        // A page we trust as the CONCEPT's page, rather than the agenda it was listed on.
        pageKnown: known,
        slide: haveSlide.has(slide) ? slide : null,
        summary: c.conceptSummary || '',
        helps: c.helpsClientTo || '',
        teachingForm: c.teachingForm || null,
        captureForm: c.captureForm || null,
        responseTable: c.captureTemplate || null,
        measured: c.captureFormBasis === 'measured',
        // Whether the app draws a graphic for this concept today.
        drawn: !!(framework && DRAWN_SHAPES.indexOf(framework.shape) !== -1)
      }
    })
    .sort((a, b) => (a.deckOrder - b.deckOrder) || (a.page - b.page) || a.name.localeCompare(b.name))
}

/**
 * @param {string} deck
 * @param {number} page
 * @returns {string}
 */
function slideName (deck, page) {
  return deck + '-p' + String(page).padStart(2, '0') + '.jpg'
}

/**
 * Every slide rendered for a deck, so a row can offer the whole deck to pick
 * from when its page is the agenda's rather than the concept's.
 *
 * @param {string[]} files
 * @returns {Object<string, string[]>}
 */
function slidesByDeck (files) {
  const out = {}
  files.slice().sort().forEach((f) => {
    const m = /^(.*)-p(\d+)\.jpg$/.exec(f)
    if (!m) { return }
    ;(out[m[1]] = out[m[1]] || []).push(f)
  })
  return out
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/** @param {string} s @returns {string} */
function esc (s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * @param {Array<Object>} rows
 * @param {Object<string, string[]>} decks
 * @returns {string}
 */
function page (rows, decks, forms) {
  const counts = {
    total: rows.length,
    known: rows.filter(r => r.pageKnown).length,
    table: rows.filter(r => r.responseTable).length,
    drawn: rows.filter(r => r.drawn).length
  }
  return TEMPLATE
    .replace('/*ROWS*/', JSON.stringify(rows))
    .replace('/*DECKS*/', JSON.stringify(decks))
    .replace('/*FORMS*/', JSON.stringify(forms))
    .replace('/*COUNTS*/', JSON.stringify(counts))
    .replace(/\{\{(\w+)\}\}/g, (_, k) => esc(String(counts[k])))
}

const TEMPLATE = fs.readFileSync(path.join(__dirname, 'concept-register-shell.html'), 'utf8')

// ---------------------------------------------------------------------------

function main () {
  const args = parseArgs(process.argv.slice(2))
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  const files = fs.readdirSync(args.images).filter(f => /\.jpg$/.test(f))
  const forms = Object.keys(JSON.parse(fs.readFileSync(CAPTURE_FILE, 'utf8')).templates).sort()
  const rows = buildRows(data, new Set(files))
  const html = page(rows, slidesByDeck(files), forms)
  fs.writeFileSync(args.out, html, 'utf8')

  const missing = rows.filter(r => !r.slide)
  console.log('')
  console.log('Concept Register built.')
  console.log('  ' + rows.length + ' concepts · ' + rows.filter(r => r.pageKnown).length +
    ' on a page of their own, ' + rows.filter(r => !r.pageKnown).length + ' listed only on an agenda')
  console.log('  ' + rows.filter(r => r.responseTable).length + ' name a response table · ' +
    rows.filter(r => r.drawn).length + ' are drawn by the app today')
  console.log('  ' + files.length + ' slides available' + (missing.length ? ', ' + missing.length + ' rows without one' : ''))
  console.log('  written to ' + args.out)
  console.log('')
}

main()
