'use strict'

/**
 * Sales-sheet reader — a period's sales, one row per product, turned into the lines the Stock
 * Purchasing model scores (item 4.94).
 *
 * Mike asked for the stock-sheet import on 2026-09-13 and this is its other half. A stock-on-hand
 * export carries two of the five criteria; the other three — margin achieved, how many sold, and
 * days on hand — live in a sales report, which is what the source workbook's own step 1 reads.
 * The workbook always assumed two files without ever saying so.
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 * 🔴 THE TARGET LAYOUT IS THE WORKBOOK'S OWN `Sales Report` SHEET, AND NOT A NAMED PACKAGE.
 *
 * `inventoryReader.js` reads Cin7 Core and Unleashed because Mike supplied those two published
 * stock-on-hand layouts on 2026-09-07. **No equivalent has been supplied for a sales export, and
 * none is invented here.** Guessing a vendor's column names would produce a reader that looks
 * finished and fails on the first real file — the same honesty rule that keeps both stock
 * packages marked `expected` rather than `verified`.
 *
 * So this reads the columns the workbook itself uses, which every accounting and point-of-sale
 * package can produce and an advisor can assemble in a spreadsheet in minutes. When Mike supplies
 * a named package's sales layout it is added here beside this one, exactly as the stock reader
 * holds two.
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 *
 * WHAT STOCK PURCHASING NEEDS, and why each column is required rather than optional:
 *
 *   Product Code   the line cannot be ranked without a name to put on the buy list
 *   Quantity       *how many sold* — the criterion, and the one a stock file cannot give
 *   Sales          with Cost, gives gross profit and therefore *margin achieved*
 *   Cost           also gives the average unit cost, and therefore *unit cost risk*
 *   Entry Date     with Sale Date, gives *days on hand* — the model's best mechanic, because
 *   Sale Date      it costs the client nothing: both dates are already in their system
 *
 * `Product Group` and `% of Stock Units` are read when present and never required. Share of stock
 * is properly a stock question, and a client who imports a stock sheet as well gets it computed
 * from that file rather than typed.
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 * 🔴 THE REQUIRED LIST IS PER MODEL, AND IT HAS TO BE. (Mike, 2026-09-13, Decision 9 on
 * `design/mockups/sales-dashboard.html` — named there as the one real cost of adding dates.)
 *
 * This reader was written for Stock Purchasing, which needs `Entry Date` AND `Sale Date` because
 * the gap between them IS days on hand. The Sales Dashboard needs neither: it needs revenue and
 * cost, and reads a sale date only to draw a trend. Shared with one fixed list, this reader would
 * **reject a perfectly good file for missing a column that model never uses** — so `required` is
 * chosen by the caller from `REQUIRED_BY_MODEL`, and the refusal names what THAT model lacks.
 *
 * The Sales Dashboard also needs four columns Stock Purchasing has no use for — brand, product
 * category, region and salesperson — which are the cuts its five tabs are built from. They are
 * optional everywhere: a firm with no regions simply has no Region tab (Decision 8), rather than
 * an empty one or a fabricated one.
 *
 * 🔴 AND A HEADER MAY BE SPELLED MORE THAN ONE WAY, because the two source workbooks spell the
 * same column differently — Stock Purchasing's `Sales Report` says `Sales` and `Cost` where the
 * Sales Dashboard's `Sales Data Input` says `Sales Revenue` and `Product Cost`. Without the
 * aliases below, this reader would refuse the very workbook the Sales Dashboard ports. Each
 * field's first spelling is the one named in a refusal message.
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 *
 * 🔴 DATES ARE RETURNED AS ISO STRINGS, NOT AS EXCEL SERIALS. The workbook stores 44355; the model
 * subtracts two ISO dates. Converting here, once, keeps the model free of spreadsheet epochs — and
 * a text date that a spreadsheet never parsed ("8 June 2021" left as a string) is read as well, so
 * an advisor whose column came through as text is not refused for a formatting reason.
 *
 * Node 14, CommonJS. Processes untrusted uploads → tested to the report standard.
 */

const { gridsFromBuffer } = require('./xeroReportParser')

/** How far down a file the header row may sit — an export prints it first or after a title line. */
const HEADER_SEARCH_ROWS = 10

/**
 * The one layout, in the shape of `inventoryReader.INVENTORY_PACKAGES` so the same honesty and
 * the same refusal message apply.
 */
const SALES_LAYOUT = Object.freeze({
  name: 'the Stock Purchasing sales report',
  confidence: 'expected',
  since: '2026-09-13',
  evidence: 'Built to the `Sales Report` sheet of design/report-source-models/Growth Pro.1a.Stock Purchasing.xlsx and the `Sales Data Input` sheet of design/report-source-models/Sales Dashboard.xlsx — the two workbooks these models port. No named package layout has been supplied for a sales export and none is invented.',
  /** Field → the header spellings that name it. The FIRST is the one a refusal names. */
  columns: Object.freeze({
    group: Object.freeze(['Product Group']),
    code: Object.freeze(['Product Code', 'Product Name']),
    quantity: Object.freeze(['Quantity']),
    sales: Object.freeze(['Sales', 'Sales Revenue']),
    cost: Object.freeze(['Cost', 'Product Cost']),
    entryDate: Object.freeze(['Entry Date']),
    saleDate: Object.freeze(['Sale Date']),
    shareOfStock: Object.freeze(['% of Stock Units']),
    // The four cuts the Sales Dashboard's tabs are built from. Optional for every model.
    brand: Object.freeze(['Product Brand', 'Brand']),
    category: Object.freeze(['Product Category', 'Category']),
    region: Object.freeze(['Region']),
    salesperson: Object.freeze(['Sales Person', 'Salesperson'])
  }),
  required: Object.freeze(['code', 'quantity', 'sales', 'cost', 'entryDate', 'saleDate'])
})

/**
 * What each model cannot do without — Decision 9's per-model list.
 *
 * `stockPurchasing` is the original set, unchanged, so that model's behaviour is untouched.
 * `salesDashboard` asks for revenue and cost alone: every cut, and the trend, is optional by
 * ruling, so the screen works on the barest file a client can produce.
 */
const REQUIRED_BY_MODEL = Object.freeze({
  stockPurchasing: SALES_LAYOUT.required,
  salesDashboard: Object.freeze(['sales', 'cost'])
})

/** Excel's day zero. Its serials count from 1899-12-30, which is the 1900 leap-year bug baked in. */
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30)
const MS_PER_DAY = 86400000

/**
 * The lowest serial read as a date rather than as a plain number.
 *
 * 20000 is 1954-10-03. A sales sheet whose date column holds a number below that is far likelier
 * to hold something that is not a date at all, and turning 5 into 1900-01-04 would invent an
 * arrival date and with it a days-on-hand score.
 */
const MIN_DATE_SERIAL = 20000

/** Normalise a header for comparison: case, spaces and punctuation are not meaning. @param {*} c */
function normHeader (c) {
  return String(c === null || c === undefined ? '' : c).toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** @param {*} v @returns {number|null} a finite number, or null for anything else. */
function num (v) {
  return typeof v === 'number' && isFinite(v) ? v : null
}

/** @param {*} v @returns {string} */
function text (v) {
  return v === null || v === undefined ? '' : String(v).trim()
}

/**
 * A cell holding a date, as ISO yyyy-mm-dd, or null.
 *
 * Handles the three things a date column actually arrives as: an Excel serial, a real Date that
 * the xlsx reader already parsed, and a string a spreadsheet never recognised.
 *
 * @param {*} v
 * @returns {string|null}
 */
function isoDate (v) {
  if (v instanceof Date && !isNaN(v.getTime())) { return v.toISOString().slice(0, 10) }
  const n = num(v)
  if (n !== null) {
    if (n < MIN_DATE_SERIAL) { return null }
    return new Date(EXCEL_EPOCH_MS + Math.round(n) * MS_PER_DAY).toISOString().slice(0, 10)
  }
  const s = text(v)
  if (!s) { return null }
  // Date.parse on a bare string is locale-dependent for "03/04/2021", so only an unambiguous
  // ISO-looking string is taken. Anything else is left null rather than guessed at, because the
  // guess decides a days-on-hand score.
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (!iso) { return null }
  const t = Date.parse(s.slice(0, 10) + 'T00:00:00Z')
  return isNaN(t) ? null : new Date(t).toISOString().slice(0, 10)
}

/** The header spelling a refusal message uses for a field. @param {string} field */
function headerNameOf (field) {
  return SALES_LAYOUT.columns[field][0]
}

/**
 * Which column is which, and what the file is missing.
 *
 * @param {Array<*>} row
 * @param {Array<string>} required the fields THIS model cannot do without
 * @returns {{index: Object<string, number>, missing: Array<string>}}
 */
function matchHeader (row, required) {
  const cells = (row || []).map(normHeader)
  const index = Object.create(null)
  for (const field of Object.keys(SALES_LAYOUT.columns)) {
    // Any accepted spelling wins; the first one found decides the column.
    for (const spelling of SALES_LAYOUT.columns[field]) {
      const at = cells.indexOf(normHeader(spelling))
      if (at !== -1) { index[field] = at; break }
    }
  }
  const missing = (required || SALES_LAYOUT.required)
    .filter(f => index[f] === undefined)
    .map(headerNameOf)
  return { index, missing }
}

/**
 * Find the header row across every sheet in the file, or refuse BY THE COLUMNS IT LACKS.
 *
 * @param {Array<Array<Array<*>>>} grids
 * @param {Array<string>} required the fields THIS model cannot do without
 * @returns {{index: Object<string, number>, grid: Array<Array<*>>, headerRow: number}}
 */
function locateHeader (grids, required) {
  const want = required || SALES_LAYOUT.required
  let nearest = null
  for (const grid of grids) {
    const limit = Math.min(grid.length, HEADER_SEARCH_ROWS)
    for (let r = 0; r < limit; r++) {
      const m = matchHeader(grid[r], want)
      if (m.missing.length === 0) { return { index: m.index, grid, headerRow: r } }
      if (!nearest || m.missing.length < nearest.missing.length) { nearest = m }
    }
  }
  // The expectation named is THIS model's, not the reader's — a Sales Dashboard file refused for
  // lacking an Entry Date it never uses is the exact fault Decision 9 called out.
  const detail = nearest && nearest.missing.length < want.length
    ? ' It has no ' + nearest.missing.join(', ') + ' column.'
    : ' Expected ' + want.map(headerNameOf).join(', ') + ' in the first rows.'
  const e = new Error('This does not look like a sales report.' + detail)
  e.code = 'UNRECOGNISED_SALES'
  throw e
}

/**
 * One row, in the shape `scoreLine` reads — plus the four cuts the Sales Dashboard groups by.
 *
 * 🔴 WHAT MAKES A ROW REAL DEPENDS ON THE MODEL. Stock Purchasing cannot rank a line with no
 * product code, so a row without one is skipped. The Sales Dashboard bands and totals a sale that
 * may name nothing at all — plenty of exports have no product column — so there a row is real if
 * it carries a sales figure. Keeping one rule would either drop half a dashboard's sales or let a
 * nameless row onto a buy list.
 *
 * @param {Array<*>} row @param {Object<string, number>} index
 * @param {Array<string>} [required] the fields this model cannot do without
 * @returns {Object|null} null for a row this model cannot use
 */
function readLine (row, index, required) {
  const cell = f => (index[f] === undefined ? undefined : row[index[f]])
  const code = text(cell('code'))
  const sales = num(cell('sales'))
  const wants = required || SALES_LAYOUT.required
  const real = wants.includes('code') ? Boolean(code) : sales !== null
  if (!real) { return null }
  return {
    code: code || null,
    group: text(cell('group')) || null,
    quantity: num(cell('quantity')),
    sales,
    cost: num(cell('cost')),
    entryDate: isoDate(cell('entryDate')),
    saleDate: isoDate(cell('saleDate')),
    shareOfStock: num(cell('shareOfStock')),
    brand: text(cell('brand')) || null,
    category: text(cell('category')) || null,
    region: text(cell('region')) || null,
    salesperson: text(cell('salesperson')) || null
  }
}

/**
 * Read an uploaded sales sheet.
 *
 * @param {Buffer} buf the uploaded file
 * @param {Object} [options]
 * @param {Array<string>} [options.required] the fields the CALLING MODEL cannot do without, from
 *   `REQUIRED_BY_MODEL`. Defaults to Stock Purchasing's, so that model is untouched.
 * @returns {{lines: Array<Object>, layout: string, confidence: string, linesRead: number,
 *   carries: Array<string>, missing: Array<string>, hasShareOfStock: boolean,
 *   dimensions: Array<string>}}
 * @throws {Error} with a `code` — `UNRECOGNISED_SALES`, or the grid reader's own
 */
function readSalesSheet (buf, options) {
  const required = (options && Array.isArray(options.required) && options.required.length)
    ? options.required
    : SALES_LAYOUT.required
  const grids = gridsFromBuffer(buf)
  const { index, grid, headerRow } = locateHeader(grids, required)

  const lines = []
  for (let r = headerRow + 1; r < grid.length; r++) {
    const line = readLine(grid[r] || [], index, required)
    if (line) { lines.push(line) }
  }
  if (!lines.length) {
    const e = new Error('The sales report has its column headings but no product lines under them.')
    e.code = 'UNRECOGNISED_SALES'
    throw e
  }

  // A sales sheet answers four of the five outright. The fifth is a stock question, and it is
  // carried only when the optional column is actually present — never claimed because the file
  // could in principle have held it.
  const hasShareOfStock = index.shareOfStock !== undefined && lines.some(l => l.shareOfStock !== null)
  // Which of the Sales Dashboard's five cuts this file genuinely supports — Decision 8. A column
  // that is present but empty on every row does NOT count, for the same reason as above.
  const dimensions = ['brand', 'code', 'category', 'region', 'salesperson']
    .filter(f => index[f] !== undefined && lines.some(l => l[f] !== null))
  return {
    lines,
    layout: SALES_LAYOUT.name,
    confidence: SALES_LAYOUT.confidence,
    linesRead: lines.length,
    carries: hasShareOfStock
      ? ['margin', 'sold', 'unitCostRisk', 'daysOnHand', 'shareOfStock']
      : ['margin', 'sold', 'unitCostRisk', 'daysOnHand'],
    missing: hasShareOfStock ? [] : ['shareOfStock'],
    hasShareOfStock,
    dimensions
  }
}

module.exports = {
  SALES_LAYOUT,
  REQUIRED_BY_MODEL,
  MIN_DATE_SERIAL,
  isoDate,
  headerNameOf,
  matchHeader,
  readLine,
  readSalesSheet
}
