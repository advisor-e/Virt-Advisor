/**
 * Read the capture tables that live on a DECK PAGE rather than in a workbook.
 *
 * WHY THIS EXISTS. `scripts/read-capture-tables.js` reads Mike's fill-in workbooks,
 * and the census (§4 finding 2) says the decks teach and then POINT at one. That is
 * true of sixteen concepts and false of five: **Branding, Customer Loyalty, Pricing
 * and Packaging/ Bundling keep their fill-in form on the facing page of the Sales &
 * Marketing deck** — p34, p36, p38, p40, each headed "<X> Considerations | Your <X>
 * Ideas — and **Divisional KPI's prints its table on its own teaching page**, p22 of
 * the Organisational Review deck. There is no workbook because there was never meant
 * to be one.
 *
 * 🔴 THE APP USED TO CALL THESE FOUR "NOT SUPPLIED", AND THAT WAS OUR ERROR, NOT A
 * GAP IN HIS MATERIAL. `TEMPLATES_NOT_SUPPLIED` in
 * `server/utils/strategyCaptureForms.js` listed all four by name, so an advisor who
 * scoped Branding Review was told "The Branding table has not been supplied yet.
 * Talk it through and record it in your own notes" — with his eight questions
 * sitting on the very next page of the deck the app already reads. Mike, 2026-09-22:
 * *"the content is right there and the forms are on the same page"*. 29 questions
 * across the four.
 *
 * 🔴 NOTHING HERE IS AUTHORED EXCEPT `PAGES` BELOW — which page carries which form.
 * Every string written to the output file is lifted from his page's own text layer,
 * and the rows and columns come from the rules he drew. This is the same discipline
 * as the workbook reader and the concept drawings: read his page by machine, never
 * retype it. Retyping is how *"can you please stick to what i gave you?"* happened
 * three times in one day.
 *
 * ⚠ ITS SOURCE SITS OUTSIDE THE REPOSITORY, so unlike the workbook reader this
 * cannot be re-run by a test on either machine or by the master team. The decks live
 * in `C:\Documents\Visual Code Projects\Strategy Planner` and only
 * `scripts/read-deck-pages.py` can open them. The output is therefore COMMITTED and
 * guarded by its shape — see `tests/unit/strategyDeckCaptureTables.test.js` — the
 * same arrangement the 33 concept drawings already use.
 *
 * Usage:
 *   python scripts/read-deck-pages.py sales-marketing 34 --out DIR   (for each page)
 *   node scripts/read-deck-capture-tables.js --pages DIR
 *   node scripts/read-deck-capture-tables.js --pages DIR --check
 */

'use strict'

const fs = require('fs')
const path = require('path')

const OUT_FILE = path.join(__dirname, '..', 'data', 'strategy-deck-capture-tables.json')

/**
 * The one authored fact: which deck page holds which concept's form.
 *
 * `template` is what the concept's `captureTemplate` calls it, so these resolve
 * through the same name an advisor's concept already carries. The page numbers are
 * read off the deck — the first four sit immediately after their teaching page (33,
 * 35, 37, 39), which is why all four were missed: the concept's `page` is the
 * teaching one and nothing recorded the other.
 *
 * 🔴 DIVISIONAL KPI'S IS THE OTHER WAY ROUND — ITS TABLE *IS* ITS TEACHING PAGE, so
 * there is no second page to record. It was missed for the opposite reason: the
 * concept is one of the 18 read off a deck's AGENDA, and every one of those carries
 * `page: 2`, the contents page. Nothing pointed at p22 at all. Found 2026-09-23 by
 * rendering the page and looking at it — the title alone says "Divisional KPI's" on
 * both the agenda row and the slide, so no text comparison could tell them apart.
 */
const PAGES = [
  { template: 'Branding', deck: 'sales-marketing', page: 34 },
  { template: 'Customer Loyalty', deck: 'sales-marketing', page: 36 },
  { template: 'Pricing', deck: 'sales-marketing', page: 38 },
  { template: 'Packaging', deck: 'sales-marketing', page: 40 },
  { template: 'Divisional KPIs', deck: 'organisational-review', page: 22 }
]

/**
 * Is this span the deck's own page number, sitting in the bottom-right corner?
 *
 * 🔴 IT IS NOT CONTENT AND IT LANDED IN A CLIENT'S ANSWER BOX. Every page of his
 * decks carries its number in Calibri grey at the same spot, and on three of these
 * four it sits a couple of points ABOVE the grid's last rule — so read by position
 * it is inside the final answer cell, and the extraction put "34", "36" and "38"
 * into the box where the client answers his last question. Found 2026-09-22 by
 * reading the extracted table back rather than trusting the row counts.
 *
 * Dropping it is not only a fix: the Brief already rules that **his page number does
 * not travel**, because the client's plan runs in the advisor's order and his number
 * would be wrong on the page.
 *
 * Deliberately narrow — the exact number, hard against the bottom-right corner — so
 * it can never eat a real answer that happens to be a figure.
 *
 * @param {object} span
 * @param {object} pageJson
 * @returns {boolean}
 */
function isPageNumber (span, pageJson) {
  if (String(span.text).trim() !== String(pageJson.page)) { return false }
  const rect = pageJson.pageRect
  const height = (rect.heightPt / rect.widthPt) * rect.viewBoxWidth
  return span.bbox[0] > rect.viewBoxWidth * 0.8 && span.bbox[1] > height * 0.9
}

/**
 * A rule is a hairline, and a hairline is a rectangle with no width.
 *
 * PyMuPDF reports a stroked line as a `rect` whose two x's (or two y's) are equal.
 * Anything with area is a fill — his cyan border, the green title highlight — and
 * is not part of the grid.
 */
const isVerticalRule = d => d.type === 's' && Math.abs(d.rect[0] - d.rect[2]) < 1.5
const isHorizontalRule = d => d.type === 's' && Math.abs(d.rect[1] - d.rect[3]) < 1.5

/**
 * The ligatures a PDF text layer carries and a Word document does not.
 *
 * 🔴 WITHOUT THIS THE ADVISOR READS "deﬁne" AND "diﬀerentiate" and reasonably
 * reports them as typos in Mike's own questions. Six spans on the Branding page
 * alone. The glyphs are a rendering of the same letters, so expanding them is
 * faithful to his page rather than a change to his words.
 */
const LIGATURES = { '\uFB00': 'ff', '\uFB01': 'fi', '\uFB02': 'fl', '\uFB03': 'ffi', '\uFB04': 'ffl', '\uFB05': 'st', '\uFB06': 'st' }

/**
 * @param {string} s
 * @returns {string} his text, with ligature glyphs written out as their letters
 */
function expandLigatures (s) {
  return String(s).replace(/[\uFB00-\uFB06]/g, m => LIGATURES[m] || m)
}

/**
 * Sorted, de-duplicated positions of the rules in one direction.
 *
 * His grid is drawn once, but a rule can be emitted as two paths a fraction of a
 * point apart; collapsing anything within 2pt keeps that from inventing a column.
 *
 * @param {Array<object>} drawings
 * @param {function} pick  isVerticalRule or isHorizontalRule
 * @param {number} axis  0 for x, 1 for y
 * @returns {Array<number>}
 */
function ruleLines (drawings, pick, axis) {
  const out = []
  drawings.filter(pick).forEach((d) => {
    const v = d.rect[axis]
    if (!out.some(existing => Math.abs(existing - v) < 2)) { out.push(v) }
  })
  return out.sort((a, b) => a - b)
}

/**
 * Which band of a set of boundaries does this coordinate fall in?
 *
 * @param {Array<number>} lines  sorted boundaries
 * @param {number} v
 * @returns {number} band index, or -1 when outside the grid entirely
 */
function bandOf (lines, v) {
  for (let i = 0; i < lines.length - 1; i++) {
    if (v >= lines[i] - 2 && v < lines[i + 1] - 2) { return i }
  }
  return -1
}

/**
 * One deck page's grid, in the shape `strategyCaptureForms` already reads.
 *
 * 🔴 AN EMPTY ANSWER CELL IS EMPTY TEXT, NEVER `blank: true`. In the workbooks
 * `blank` means Mike RULED A LINE to write on, and `fieldsOfTable` switches its
 * whole reading on whether any exist: with ruled lines only the lines are boxes,
 * without them the first column is the prompt and the rest is answered. These pages
 * rule no lines inside a cell — the right-hand column is the answer column from top
 * to bottom, and six of Branding's eight cells simply have nothing in them yet.
 * Emitting those six as `blank` would make his two WORKED EXAMPLES stop being boxes,
 * so the advisor would get six where his page gives eight. This encoding is also
 * what his Marketing Answers table already produces, which is the same form.
 *
 * That is the Brief's own rule — *"a page that is its own capture form shows the
 * worked example only"* (Mike, 2026-09-18) — applied to the four pages that are
 * literally that.
 *
 * @param {object} pageJson  as scripts/read-deck-pages.py writes it
 * @returns {{columns: number, rows: Array<{cells: Array<{text: string}>}>}}
 */
function gridOfPage (pageJson) {
  const xs = ruleLines(pageJson.drawings, isVerticalRule, 0)
  const ys = ruleLines(pageJson.drawings, isHorizontalRule, 1)
  if (xs.length < 2 || ys.length < 2) {
    throw new Error(`${pageJson.deck} p${pageJson.page}: no grid — ${xs.length} vertical and ${ys.length} horizontal rules`)
  }

  const columns = xs.length - 1
  const cells = ys.slice(0, -1).map(() => Array.from({ length: columns }, () => []))

  pageJson.spans.forEach((s) => {
    // Chrome, never content — and it overlaps the last row, so it must go first.
    if (isPageNumber(s, pageJson)) { return }
    // The span's own top-left, in the same 1500px space as the rules.
    const r = bandOf(ys, s.bbox[1])
    const c = bandOf(xs, s.bbox[0])
    // His title sits above the grid, so it lands outside it.
    if (r < 0 || c < 0) { return }
    cells[r][c].push(s)
  })

  const rows = cells.map(row => ({
    cells: row.map((spans) => {
      // Reading order within the cell: down the lines, then across each line.
      spans.sort((a, b) => (Math.abs(a.bbox[1] - b.bbox[1]) > 4 ? a.bbox[1] - b.bbox[1] : a.bbox[0] - b.bbox[0]))
      const text = expandLigatures(spans.map(s => s.text).join(' ')).replace(/\s+/g, ' ').trim()
      return { text }
    })
  }))

  return { columns, rows }
}

/**
 * Read every page in `PAGES` into the committed shape.
 *
 * @param {string} pagesDir  where read-deck-pages.py wrote its JSON
 * @returns {{templates: Object}}
 */
function build (pagesDir) {
  const templates = {}
  PAGES.forEach((p) => {
    const file = path.join(pagesDir, `${p.deck}-p${p.page}.json`)
    if (!fs.existsSync(file)) {
      throw new Error(`missing ${file} — run: python scripts/read-deck-pages.py ${p.deck} ${p.page} --out ${pagesDir}`)
    }
    const pageJson = JSON.parse(fs.readFileSync(file, 'utf8'))
    templates[p.template] = {
      // Provenance, so the table can be found again on his page rather than trusted.
      file: `${p.deck} deck, page ${p.page}`,
      format: 'deck-page',
      deck: p.deck,
      page: p.page,
      tables: [gridOfPage(pageJson)]
    }
  })
  return { templates }
}

// ---------------------------------------------------------------------------

if (require.main === module) {
  const args = process.argv.slice(2)
  const at = args.indexOf('--pages')
  if (at < 0 || !args[at + 1]) {
    console.error('usage: node scripts/read-deck-capture-tables.js --pages DIR [--check]')
    process.exit(2)
  }

  const built = build(args[at + 1])

  if (args.includes('--check')) {
    const committed = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'))
    if (JSON.stringify(built) !== JSON.stringify(committed)) {
      console.error('DRIFT: the committed deck capture tables are not what his pages say.')
      process.exit(1)
    }
    console.log('deck capture tables match his pages.')
  } else {
    fs.writeFileSync(OUT_FILE, JSON.stringify(built, null, 2) + '\n')
    Object.keys(built.templates).forEach((k) => {
      const t = built.templates[k].tables[0]
      console.log(`  ${k}: ${t.rows.length} rows x ${t.columns} columns  (${built.templates[k].file})`)
    })
    console.log(`\n  written to ${OUT_FILE}`)
  }
}

module.exports = { build, gridOfPage, expandLigatures, ruleLines, bandOf, isPageNumber, PAGES }
