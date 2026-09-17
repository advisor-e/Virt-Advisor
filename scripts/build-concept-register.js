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

/**
 * How a RESPONSE page is told from a teaching page, read off Mike's own decks.
 * Two signals, either one enough:
 *
 * 1. The title — `(Our) Revenue Streams`, `Vertical Integration Tasks`,
 *    `Price For Problem Solving - Complete the Tables`. He marks a page the
 *    client writes on by putting "Our" on it or calling it Tasks.
 * 2. An instruction spoken to the client anywhere on the page — *"complete the
 *    tables"*, *"record your observations"*. `read-deck-pages.py` collects
 *    these as `asks`.
 *
 * `Our Session Objective` and `Our Planning Process` match signal 1 and are
 * session furniture, so they are named out. Judged, not guessed — and every
 * suggestion this produces is a SUGGESTION Mike confirms, never an assignment.
 */
const RESPONSE_TITLE = /^\(our\)|^our |tasks\s*$|complete the|observations/i
const NOT_A_RESPONSE = /^our session objective|^our planning process/i

/**
 * How far after a concept its response page may sit. Four pages covers the
 * widest real gap — the 8 Profit Levers teaches on 39, has a second teaching
 * page on 40 and asks for the tables on 41 — without reaching across into the
 * next concept's material.
 */
const RESPONSE_WITHIN = 4

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
function buildRows (data, haveSlide, deckPages) {
  const deckName = {}
  const deckOrder = {}
  data.decks.forEach((d, i) => { deckName[d.id] = d.name; deckOrder[d.id] = i })

  const byConcept = {}
  data.frameworks.forEach((f) => { if (f.conceptId) { byConcept[f.conceptId] = f } })

  const responses = {}
  Object.keys(deckPages).forEach((d) => { responses[d] = responsePages(deckPages[d]) })

  // Every page a concept of the same deck claims, so a suggestion can tell
  // whether it would be reaching across somebody else's material.
  const claimed = {}
  data.concepts.forEach((c) => {
    if (c.source !== AGENDA) { (claimed[c.deck] = claimed[c.deck] || []).push(c.page) }
  })

  return data.concepts
    .map((c) => {
      const framework = byConcept[c.id] || null
      const known = c.source !== AGENDA
      const slide = slideName(c.deck, c.page)
      // Only where the concept's own page is trusted: suggesting a response
      // page relative to the agenda slide would be four pages of noise.
      const suggested = known
        ? suggestResponse(c.page, responses[c.deck] || [], claimed[c.deck] || [], c.name)
        : null
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
        suggestedPage: suggested ? suggested.page : null,
        suggestedTitle: suggested ? suggested.title : null,
        measured: c.captureFormBasis === 'measured',
        // Whether the app draws a graphic for this concept today.
        drawn: !!(framework && DRAWN_SHAPES.indexOf(framework.shape) !== -1)
      }
    })
    .sort((a, b) => (a.deckOrder - b.deckOrder) || (a.page - b.page) || a.name.localeCompare(b.name))
}

/**
 * The response pages of one deck, as `{page: title}`.
 *
 * @param {Array<{page: number, lines: string[], asks: string[]}>} pages
 * @returns {Array<{page: number, title: string}>}
 */
function responsePages (pages) {
  return pages
    .filter((p) => {
      const title = (p.lines && p.lines[0]) || ''
      if (NOT_A_RESPONSE.test(title)) { return false }
      return RESPONSE_TITLE.test(title) || (p.asks && p.asks.length > 0)
    })
    .map((p) => ({ page: p.page, title: (p.lines && p.lines[0]) || '' }))
}

/**
 * The response page to suggest for one concept: the nearest one after its own
 * page, within RESPONSE_WITHIN. Two concepts may land on the same page — the
 * Integration Tasks table on Strategic Orientation 2 p24 answers both Vertical
 * and Horizontal Integration, which is correct and not a clash.
 *
 * @param {number} page  the concept's own page
 * @param {Array<{page: number, title: string}>} responses
 * @returns {{page: number, title: string}|null}
 */
function suggestResponse (page, responses, otherPages, name) {
  for (let i = 0; i < responses.length; i++) {
    const found = responses[i]
    const gap = found.page - page
    if (gap <= 0 || gap > RESPONSE_WITHIN) { continue }

    // Another concept sits between this one and that page, so the page most
    // likely belongs to THAT concept — the Sigmoid Curve does not answer onto
    // Blue Ocean Strategy's sheet just because it comes first.
    const between = otherPages.some(p => p > page && p < found.page)
    if (!between || sharesAWord(name, found.title)) { return found }
  }
  return null
}

/** Words too common to mean two titles are about the same thing. */
const NOISE = ['the', 'our', 'your', 'and', 'for', 'with', 'from', 'that', 'this',
  'review', 'tasks', 'complete', 'tables', 'table', 'model', 'framework', 'thoughts']

/**
 * Whether a response page's title names the concept — the second signal, and
 * the reason Vertical Integration keeps `Vertical Integration Tasks` even
 * though Horizontal Integration is taught between the two.
 *
 * @param {string} name  the concept's name
 * @param {string} title  the response page's title
 * @returns {boolean}
 */
function sharesAWord (name, title) {
  const words = (s) => String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/)
    .filter(w => w.length > 3 && NOISE.indexOf(w) === -1)
  const mine = words(name)
  return words(title).some(w => mine.indexOf(w) !== -1)
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
  const pagesFile = path.join(args.images, '..', 'deck-pages.json')
  if (!fs.existsSync(pagesFile)) {
    // Loud rather than quietly suggesting nothing: a register with no response
    // suggestions looks the same as one whose page titles never got read.
    throw new Error('deck-pages.json not found beside the images directory: ' + pagesFile)
  }
  const deckPages = JSON.parse(fs.readFileSync(pagesFile, 'utf8'))
  const rows = buildRows(data, new Set(files), deckPages)
  const html = page(rows, slidesByDeck(files), forms)
  fs.writeFileSync(args.out, html, 'utf8')

  const missing = rows.filter(r => !r.slide)
  console.log('')
  console.log('Concept Register built.')
  console.log('  ' + rows.length + ' concepts · ' + rows.filter(r => r.pageKnown).length +
    ' on a page of their own, ' + rows.filter(r => !r.pageKnown).length + ' listed only on an agenda')
  console.log('  ' + rows.filter(r => r.responseTable).length + ' name a response table · ' +
    rows.filter(r => r.drawn).length + ' are drawn by the app today')
  console.log('  ' + rows.filter(r => r.suggestedPage).length + ' carry a suggested response page, ' +
    'from ' + Object.keys(deckPages).reduce((n, d) => n + responsePages(deckPages[d]).length, 0) +
    ' found across the decks')
  console.log('  ' + files.length + ' slides available' + (missing.length ? ', ' + missing.length + ' rows without one' : ''))
  console.log('  written to ' + args.out)
  console.log('')
}

main()
