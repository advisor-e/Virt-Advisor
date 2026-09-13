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
 * WHAT IT NEEDS, and why each column is required rather than optional:
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
  evidence: 'Built to the `Sales Report` sheet of design/report-source-models/Growth Pro.1a.Stock Purchasing.xlsx — the workbook this model ports. No named package layout has been supplied for a sales export and none is invented.',
  columns: Object.freeze({
    group: 'Product Group',
    code: 'Product Code',
    quantity: 'Quantity',
    sales: 'Sales',
    cost: 'Cost',
    entryDate: 'Entry Date',
    saleDate: 'Sale Date',
    shareOfStock: '% of Stock Units'
  }),
  required: Object.freeze(['code', 'quantity', 'sales', 'cost', 'entryDate', 'saleDate'])
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

/**
 * Which column is which, and what the file is missing.
 * @param {Array<*>} row
 * @returns {{index: Object<string, number>, missing: Array<string>}}
 */
function matchHeader (row) {
  const cells = (row || []).map(normHeader)
  const index = Object.create(null)
  for (const field of Object.keys(SALES_LAYOUT.columns)) {
    const at = cells.indexOf(normHeader(SALES_LAYOUT.columns[field]))
    if (at !== -1) { index[field] = at }
  }
  const missing = SALES_LAYOUT.required
    .filter(f => index[f] === undefined)
    .map(f => SALES_LAYOUT.columns[f])
  return { index, missing }
}

/**
 * Find the header row across every sheet in the file, or refuse BY THE COLUMNS IT LACKS.
 * @param {Array<Array<Array<*>>>} grids
 * @returns {{index: Object<string, number>, grid: Array<Array<*>>, headerRow: number}}
 */
function locateHeader (grids) {
  let nearest = null
  for (const grid of grids) {
    const limit = Math.min(grid.length, HEADER_SEARCH_ROWS)
    for (let r = 0; r < limit; r++) {
      const m = matchHeader(grid[r])
      if (m.missing.length === 0) { return { index: m.index, grid, headerRow: r } }
      if (!nearest || m.missing.length < nearest.missing.length) { nearest = m }
    }
  }
  const detail = nearest && nearest.missing.length < SALES_LAYOUT.required.length
    ? ' It has no ' + nearest.missing.join(', ') + ' column.'
    : ' Expected Product Code, Quantity, Sales, Cost, Entry Date and Sale Date in the first rows.'
  const e = new Error('This does not look like a sales report.' + detail)
  e.code = 'UNRECOGNISED_SALES'
  throw e
}

/**
 * One row, in the shape `scoreLine` reads.
 * @param {Array<*>} row @param {Object<string, number>} index
 * @returns {Object|null} null for a row with no product on it
 */
function readLine (row, index) {
  const cell = f => (index[f] === undefined ? undefined : row[index[f]])
  const code = text(cell('code'))
  if (!code) { return null }
  return {
    code,
    group: text(cell('group')) || null,
    quantity: num(cell('quantity')),
    sales: num(cell('sales')),
    cost: num(cell('cost')),
    entryDate: isoDate(cell('entryDate')),
    saleDate: isoDate(cell('saleDate')),
    shareOfStock: num(cell('shareOfStock'))
  }
}

/**
 * Read an uploaded sales sheet.
 *
 * @param {Buffer} buf the uploaded file
 * @returns {{lines: Array<Object>, layout: string, confidence: string, linesRead: number,
 *   carries: Array<string>, missing: Array<string>, hasShareOfStock: boolean}}
 * @throws {Error} with a `code` — `UNRECOGNISED_SALES`, or the grid reader's own
 */
function readSalesSheet (buf) {
  const grids = gridsFromBuffer(buf)
  const { index, grid, headerRow } = locateHeader(grids)

  const lines = []
  for (let r = headerRow + 1; r < grid.length; r++) {
    const line = readLine(grid[r] || [], index)
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
  return {
    lines,
    layout: SALES_LAYOUT.name,
    confidence: SALES_LAYOUT.confidence,
    linesRead: lines.length,
    carries: hasShareOfStock
      ? ['margin', 'sold', 'unitCostRisk', 'daysOnHand', 'shareOfStock']
      : ['margin', 'sold', 'unitCostRisk', 'daysOnHand'],
    missing: hasShareOfStock ? [] : ['shareOfStock'],
    hasShareOfStock
  }
}

module.exports = {
  SALES_LAYOUT,
  MIN_DATE_SERIAL,
  isoDate,
  matchHeader,
  readLine,
  readSalesSheet
}
