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
  { template: 'Divisional KPIs', deck: 'organisational-review', page: 22 },
  // Item 15.16, ruled by Mike 2026-09-24 — design/STRATEGY-CAPTURE-FORM-PROPOSALS.md.
  // Two more question sheets, read exactly as the four above.
  { template: 'Sparketing Thoughts', deck: 'sales-marketing', page: 32 },
  { template: 'Sales Distribution (Channel) Options', deck: 'sales-marketing', page: 42 },
  // One table drawn across two pages — part 1 costs Free to Small Fee, part 2 names
  // the three client tiers. Both pages rule the same eight columns.
  { template: 'Engagement Story-Board', deck: 'sales-marketing', pages: [20, 21] },
  // 🔴 THE REST ARE GRIDS OF WRITING LINES, NOT QUESTION SHEETS, and `grid` says so.
  // Read as a question sheet, his first column became the questions: Deming's
  // "Common Cause" lost all six of its lines and Revenue Streams' whole Upstream
  // column vanished. `headerRows` is how many rows head the columns; `labelColumns`
  // is where he names the rows. Both are read off his page, and both are stated here
  // rather than guessed from fonts — p24 names a row in the same regular type as his
  // examples, so nothing in the text layer could tell them apart.
  { template: 'Vertical/ & Horizontal Integration Tasks', deck: 'strategic-orientation-2', page: 24, grid: { headerRows: 1, labelColumns: [0] } },
  { template: 'Revenue Streams', deck: 'strategic-orientation-2', page: 34, grid: { headerRows: 1, labelColumns: [] } },
  { template: 'Volatility Graph Observations', deck: 'strategic-orientation-2', page: 37, grid: { headerRows: 1, labelColumns: [] } },
  { template: 'A.I.D.C.R.A Advertisement', deck: 'sales-marketing', page: 16, grid: { headerRows: 2, labelColumns: [] } },
  { template: 'Outbound Communication Plan', deck: 'sales-marketing', page: 25, grid: { headerRows: 1, labelColumns: [] } },
  // Two tables stacked on one page. `region` is the band of the page each occupies,
  // in the reader's 1500px space; the second one's title sits in the gap between.
  { template: 'Price For Problem Solving', deck: 'strategic-orientation-2', page: 21, region: [110, 400], grid: { headerRows: 2, labelColumns: [] } },
  { template: 'Price For Delivery Medium', deck: 'strategic-orientation-2', page: 21, region: [480, 780], grid: { headerRows: 2, labelColumns: [] } },
  // 🔴 ONE CONCEPT, TWO FORMS OF DIFFERENT SHAPES — item 15.28, drawing approved by Mike
  // 2026-09-26. Alignment Statements captures five named statements (p8) AND a three-column
  // table (p10), so each part names its own form and the table carries it. `gapRows` reads
  // p8's gap between two bands as the gap his Productive Habits ruling describes, never as
  // a row. p9 is read for the table because it IS p10 with his worked example written in —
  // the same rules at the same x, and the same three rows — which is Decision B: his example
  // shown as grey guide text in the client's empty boxes.
  {
    template: 'Alignment Statements',
    deck: 'alignment',
    parts: [
      { page: 8, gapRows: true, form: 'named-field-stack' },
      { page: 9, grid: { headerRows: 1, labelColumns: [] } }
    ]
  }
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
function gridOfPage (pageJson, options) {
  const opts = options || {}
  // A band of the page, for two tables stacked on one. Outside it nothing is read.
  const inRegion = opts.region
    ? y => y >= opts.region[0] && y <= opts.region[1]
    : () => true
  const drawings = pageJson.drawings.filter(d => inRegion(d.rect[1]))
  const xs = ruleLines(drawings, isVerticalRule, 0)
  const ys = ruleLines(drawings, isHorizontalRule, 1)
  if (xs.length < 2 || ys.length < 2) {
    throw new Error(`${pageJson.deck} p${pageJson.page}: no grid — ${xs.length} vertical and ${ys.length} horizontal rules`)
  }

  const columns = xs.length - 1
  const cells = ys.slice(0, -1).map(() => Array.from({ length: columns }, () => []))

  pageJson.spans.filter(s => inRegion(s.bbox[1])).forEach((s) => {
    // Chrome, never content — and it overlaps the last row, so it must go first.
    if (isPageNumber(s, pageJson)) { return }
    // The span's own top-left, in the same 1500px space as the rules.
    const r = bandOf(ys, s.bbox[1])
    const c = bandOf(xs, s.bbox[0])
    // His title sits above the grid, so it lands outside it.
    if (r < 0 || c < 0) { return }
    cells[r][c].push(s)
  })

  const textOf = (spans) => {
    // Reading order within the cell: down the lines, then across each line.
    spans.sort((a, b) => (Math.abs(a.bbox[1] - b.bbox[1]) > 4 ? a.bbox[1] - b.bbox[1] : a.bbox[0] - b.bbox[0]))
    return expandLigatures(spans.map(s => s.text).join(' ')).replace(/\s+/g, ' ').trim()
  }

  if (!opts.grid) {
    const rows = cells.map((row) => {
      const out = row.map(spans => ({ text: textOf(spans) }))
      // A row with no words at all, between two ruled bands, is the gap between two
      // named fields. Marked as his blank lines are, so the named-field stack reads the
      // names DOWN the first column and skips the gap — never offering it as a box.
      if (opts.gapRows && out.every(c => !c.text)) { return { cells: out.map(() => ({ text: '', blank: true })) } }
      return { cells: out }
    })
    return { columns, rows }
  }
  return linesGrid(cells, xs, ys, drawings.filter(isHorizontalRule), opts.grid, textOf)
}

/** His line numbers — `1`, `2.` — printed at the start of a writing line. */
const LINE_NUMBER = /^\d+[.,]?$/

/** A cell that holds a numbered list of placeholder letters: `1. A 2. B 3. C 4. D`. */
const PLACEHOLDER_LIST = /^(\d+\.\s*[A-Z]\s*)+$/

/**
 * A grid of WRITING LINES, in the encoding his workbooks already use.
 *
 * `strategyCaptureForms` reads a workbook's ruled line as `blank: true`, and a table
 * with ruled lines as a banded grid: the lines are the boxes, the words are labels.
 * A deck page has no such flag — it draws cells, not lines — so this supplies it:
 *
 * - **An empty body cell, or one holding only his line number, is a line.**
 * - **His worked example, in regular type in an answer cell, is a line too** —
 *   `guide: true`, shown as grey guide text in its own box. That is how the deck-page
 *   question sheets already treat his examples, and it is the only reading that keeps
 *   every line he drew: p24's "Customer Experience vs. Bottom Line Focus" row holds
 *   nothing BUT his example. (Where an example sits in a ruled WORKBOOK table, above its
 *   lines rather than in one, is item 15.18 and Mike's call; this does not decide it.)
 * - **Bold type in an answer column is a heading** — p34's "Our Thoughts to Support
 *   These Ideas" — and stays words.
 * - **A merged cell is detected from his own rules**: where no rule crosses a column,
 *   the cell below continues the one above. A merged NAME carries down so each of its
 *   lines is labelled; a merged ANSWER is one box, and its continuations are `merged`.
 * - **A placeholder list — `1. A 2. B 3. C 4. D` — is that many lines.**
 *
 * @param {Array<Array<Array<object>>>} cells  spans per [row][column]
 * @param {Array<number>} xs  vertical rule positions
 * @param {Array<number>} ys  horizontal rule positions
 * @param {Array<object>} hRules  the horizontal rule drawings, with their extents
 * @param {{headerRows: number, labelColumns: Array<number>}} grid  read off his page
 * @param {function(Array<object>): string} textOf
 * @returns {{columns: number, rows: Array<{cells: Array<object>}>}}
 */
function linesGrid (cells, xs, ys, hRules, grid, textOf) {
  const columns = xs.length - 1
  // Is there a rule along the top of row r across column c? If not, the cell merges up.
  const ruledAbove = (r, c) => {
    const mid = (xs[c] + xs[c + 1]) / 2
    return hRules.some(d => Math.abs(d.rect[1] - ys[r]) < 2 && d.rect[0] - 2 <= mid && d.rect[2] + 2 >= mid)
  }

  // Gather each column's merged runs so a run's words belong to its first row.
  const head = cells.map(row => row.map(() => null))
  for (let c = 0; c < columns; c++) {
    for (let r = 0; r < cells.length; r++) {
      head[r][c] = (r > grid.headerRows && !ruledAbove(r, c)) ? head[r - 1][c] : r
    }
  }
  const runSpans = (r, c) => {
    const spans = []
    for (let i = 0; i < cells.length; i++) {
      if (head[i][c] === r) { cells[i][c].forEach(s => spans.push(s)) }
    }
    return spans
  }

  const rows = []
  cells.forEach((row, r) => {
    const out = row.map((spans, c) => {
      // `header` is what lets the mapper tell his second heading row — the question
      // each column asks — from a worked example sitting above the lines, which a
      // workbook's banded grid also puts in row 1 (item 15.18, Mike's call).
      if (r < grid.headerRows) { return { text: textOf(spans), header: true } }
      const h = head[r][c]
      const label = grid.labelColumns.includes(c)
      const own = runSpans(h, c)
      const text = textOf(own.slice())
      if (label) { return h === r ? { text } : { text, merged: true } }
      if (h !== r) { return { text: '', merged: true } }
      if (!text) { return { text: '', blank: true } }
      if (LINE_NUMBER.test(text)) { return { text, blank: true } }
      if (own.every(s => s.bold)) { return { text } }
      return { text, blank: true, guide: true }
    })

    // A row of placeholder lists becomes that many rows of numbered lines.
    const lists = out.map(cell => (cell.guide && PLACEHOLDER_LIST.test(cell.text)) ? cell.text.match(/\d+\./g) : null)
    if (lists.some(Boolean) && lists.every((l, c) => l || grid.labelColumns.includes(c) || out[c].merged)) {
      const n = Math.max.apply(null, lists.filter(Boolean).map(l => l.length))
      for (let i = 0; i < n; i++) {
        rows.push({ cells: out.map((cell, c) => lists[c] ? { text: lists[c][i] || '', blank: true } : cell) })
      }
      return
    }
    rows.push({ cells: out })
  })

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
    // `parts` gives each page its own reading and its own form; otherwise every page
    // shares the entry's.
    const parts = p.parts || (p.pages || [p.page]).map(page => ({ page, region: p.region, grid: p.grid }))
    const pages = parts.map(part => part.page)
    const tables = parts.map((part) => {
      const n = part.page
      const file = path.join(pagesDir, `${p.deck}-p${String(n).padStart(2, '0')}.json`)
      if (!fs.existsSync(file)) {
        throw new Error(`missing ${file} — run: python scripts/read-deck-pages.py ${p.deck} ${n} --out ${pagesDir}`)
      }
      const table = gridOfPage(JSON.parse(fs.readFileSync(file, 'utf8')),
        { region: part.region, grid: part.grid, gapRows: part.gapRows })
      if (part.form) { table.form = part.form }
      return table
    })
    templates[p.template] = {
      // Provenance, so the table can be found again on his page rather than trusted.
      file: pages.length > 1
        ? `${p.deck} deck, pages ${pages.join(' and ')}`
        : `${p.deck} deck, page ${pages[0]}`,
      format: 'deck-page',
      deck: p.deck,
      page: pages[0],
      tables
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
