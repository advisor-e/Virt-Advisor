'use strict'

/**
 * Inventory-export reader — a Cin7 Core or Unleashed stock-on-hand export turned into
 * the totals the Business Performance Report's stock page needs (item 4.70, stage 4).
 *
 * WHAT IT READS. One row per product in both packages; one internal record, two column
 * maps — Mike's target layouts of 2026-09-07, kept in the Brief
 * (`design/features/business-performance-report.md`, "The inventory reader's target
 * layouts"). Which package wrote the file is decided by its column names, and a file
 * matching neither map is refused BY THE COLUMNS IT LACKS, as the accounts readers do.
 *
 * 🔴 BOTH PACKAGES ARE `expected`, NOT `verified` — the same honesty rule as
 * `supportedPackages.js` (4.60). No real export has been read; the maps come from the
 * packages' published layouts. Moving one to 'verified' takes a real export and nothing
 * else. They are listed here rather than on the accounts list because that list's
 * sentences promise Balance Sheets and Profit and Loss reports, and these read neither.
 *
 * THREE RULES THE READER HONOURS, from the Brief:
 *  1. The cost basis differs — Cin7 exports a unit cost, Unleashed an average cost — and
 *     the result says which it read (`costBasis`), so the page can print it.
 *  2. Unleashed carries a Base Currency Code; Cin7 carries none. The code is CHECKED
 *     against the firm's currency by `summariseInventory`, never assumed: a file in
 *     another currency is refused by name rather than summed as if it were the firm's.
 *     A Cin7 file is taken to be in the firm's currency and the result says so.
 *  3. Neither export carries a date, so NOTHING here is an age. Stock ageing stays typed
 *     on the step until an ageing report is read (P3: a plausible chart with no date
 *     behind it is a verdict nobody gave).
 *
 * WHAT LEAVES THIS MODULE. `readInventoryUpload` returns the product lines, because the
 * route's tests and any later ageing work need them; the ROUTE sends the browser only
 * `summariseInventory`'s totals — value by category and by location, the unit counts,
 * the file total — never a product's code or name. A client's stock list is theirs.
 *
 * Node 14, CommonJS. Processes untrusted uploads → tested to the report standard.
 */

const { gridsFromBuffer } = require('./xeroReportParser')

/**
 * The two packages, in the shape of `supportedPackages.PACKAGES` so the same honesty
 * applies. `columns` is the header map: internal field → the header the package prints.
 * A field in `required` must be present for the file to be read as that package.
 * @type {ReadonlyArray<{name:string, confidence:'verified'|'expected', since:string, evidence:string, costBasis:'unitCost'|'averageCost', columns:Object<string,string>, required:string[]}>}
 */
const INVENTORY_PACKAGES = Object.freeze([
  Object.freeze({
    name: 'Cin7 Core',
    confidence: 'expected',
    since: '2026-09-08',
    evidence: 'Built to the published stock-on-hand layout Mike supplied 2026-09-07: SKU, Product Name, Category, Default Location, OnHand, Allocated, Available, OnOrder, Unit Cost, Total Value. No real export has been read.',
    costBasis: 'unitCost',
    columns: Object.freeze({
      code: 'SKU',
      name: 'Product Name',
      category: 'Category',
      location: 'Default Location',
      onHand: 'OnHand',
      allocated: 'Allocated',
      available: 'Available',
      onOrder: 'OnOrder',
      unitCost: 'Unit Cost',
      value: 'Total Value'
    }),
    required: Object.freeze(['code', 'name', 'onHand', 'allocated', 'available', 'unitCost', 'value'])
  }),
  Object.freeze({
    name: 'Unleashed',
    confidence: 'expected',
    since: '2026-09-08',
    evidence: 'Built to the published stock-on-hand layout Mike supplied 2026-09-07: Product Code, Product Description, Group Name, Warehouse Code, Bin Location, Qty On Hand, Qty Allocated, Qty Available, Average Cost, Total Cost On Hand, Base Currency Code. No real export has been read.',
    costBasis: 'averageCost',
    columns: Object.freeze({
      code: 'Product Code',
      name: 'Product Description',
      category: 'Group Name',
      location: 'Warehouse Code',
      onHand: 'Qty On Hand',
      allocated: 'Qty Allocated',
      available: 'Qty Available',
      unitCost: 'Average Cost',
      value: 'Total Cost On Hand',
      currency: 'Base Currency Code'
    }),
    required: Object.freeze(['code', 'name', 'onHand', 'allocated', 'available', 'unitCost', 'value'])
  })
])

/** The label a line gets when the file has no category or location column, or the cell is blank. */
const UNGROUPED = 'Uncategorised'

/** How far down a file the header row may sit — an export prints it first or after a title line or two. */
const HEADER_SEARCH_ROWS = 10

/** Normalise a header for comparison: case, spaces and punctuation are not meaning. @param {*} cell */
function normHeader (cell) {
  return String(cell === null || cell === undefined ? '' : cell).toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** @param {*} v @returns {number|null} a finite number, or null for anything else. */
function num (v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** @param {*} v @returns {string} trimmed text, or '' for a blank cell. */
function text (v) {
  return v === null || v === undefined ? '' : String(v).trim()
}

/**
 * Match one grid row against one package's header map.
 * @param {Array} row
 * @param {object} pkg - an INVENTORY_PACKAGES entry.
 * @returns {{index:Object<string,number>, missing:string[]}} column index per field found, and the required headers not found.
 */
function matchHeader (row, pkg) {
  const cells = (row || []).map(normHeader)
  const index = Object.create(null)
  for (const field of Object.keys(pkg.columns)) {
    const at = cells.indexOf(normHeader(pkg.columns[field]))
    if (at !== -1) { index[field] = at }
  }
  const missing = pkg.required.filter(f => index[f] === undefined).map(f => pkg.columns[f])
  return { index, missing }
}

/**
 * Find the header row and the package that wrote it, across every sheet.
 * @param {Array<Array>} grids
 * @returns {{pkg:object, index:Object<string,number>, grid:Array<Array>, headerRow:number}}
 * @throws {Error} UNRECOGNISED_INVENTORY — naming the nearest package and the columns it lacks.
 */
function locateHeader (grids) {
  let nearest = null
  for (const grid of grids) {
    const limit = Math.min(grid.length, HEADER_SEARCH_ROWS)
    for (let r = 0; r < limit; r++) {
      for (const pkg of INVENTORY_PACKAGES) {
        const m = matchHeader(grid[r], pkg)
        if (m.missing.length === 0) { return { pkg, index: m.index, grid, headerRow: r } }
        if (!nearest || m.missing.length < nearest.missing.length) { nearest = { pkg, missing: m.missing } }
      }
    }
  }
  const names = INVENTORY_PACKAGES.map(p => p.name).join(' or ')
  const detail = nearest && nearest.missing.length < nearest.pkg.required.length
    ? ' It is nearest to ' + nearest.pkg.name + ' but has no ' + nearest.missing.join(', ') + ' column.'
    : ' Expected the column headings in the first rows.'
  const e = new Error('This does not look like a stock-on-hand export from ' + names + '.' + detail)
  e.code = 'UNRECOGNISED_INVENTORY'
  throw e
}

/**
 * Read one product line. A line with no code and no name is a blank or a footer and is skipped.
 * @param {Array} row @param {Object<string,number>} index @param {object} pkg
 * @returns {object|null}
 */
function readLine (row, index, pkg) {
  const cell = f => index[f] === undefined ? undefined : row[index[f]]
  const code = text(cell('code'))
  const name = text(cell('name'))
  if (!code && !name) { return null }
  const onHand = num(cell('onHand'))
  const unitCost = num(cell('unitCost'))
  let value = num(cell('value'))
  // The file's own total is the figure; only when it is blank is it rebuilt from the two
  // it is made of, and a line with neither is counted as unvalued rather than taken as zero.
  if (value === null && onHand !== null && unitCost !== null) { value = onHand * unitCost }
  return {
    code,
    name,
    category: text(cell('category')) || UNGROUPED,
    location: text(cell('location')) || UNGROUPED,
    onHand,
    allocated: num(cell('allocated')),
    available: num(cell('available')),
    onOrder: index.onOrder === undefined ? null : num(cell('onOrder')),
    unitCost,
    value,
    currency: index.currency === undefined ? null : (text(cell('currency')).toUpperCase() || null)
  }
}

/**
 * Sniff an uploaded buffer (xlsx or csv), find the header, and read every product line.
 * @param {Buffer} buf - the uploaded file.
 * @returns {{package:string, confidence:string, costBasis:'unitCost'|'averageCost', hasOnOrder:boolean, hasCurrency:boolean, lines:Array<object>}}
 * @throws {Error} the xlsx/csv reader codes, or UNRECOGNISED_INVENTORY.
 */
function readInventoryUpload (buf) {
  const grids = gridsFromBuffer(buf)
  const { pkg, index, grid, headerRow } = locateHeader(grids)
  const lines = []
  for (let r = headerRow + 1; r < grid.length; r++) {
    const line = readLine(grid[r] || [], index, pkg)
    if (line) { lines.push(line) }
  }
  if (!lines.length) {
    const e = new Error('The ' + pkg.name + ' export has its column headings but no product lines under them.')
    e.code = 'UNRECOGNISED_INVENTORY'
    throw e
  }
  return {
    package: pkg.name,
    confidence: pkg.confidence,
    costBasis: pkg.costBasis,
    hasOnOrder: index.onOrder !== undefined,
    hasCurrency: index.currency !== undefined,
    lines
  }
}

/**
 * Sum a set of lines under one label.
 * @param {string} name @param {Array<object>} lines
 * @returns {{name:string, lines:number, value:number, onHand:number, allocated:number, available:number}}
 */
function bucket (name, lines) {
  const sum = f => lines.reduce((t, l) => t + (l[f] === null ? 0 : l[f]), 0)
  return { name, lines: lines.length, value: sum('value'), onHand: sum('onHand'), allocated: sum('allocated'), available: sum('available') }
}

/**
 * Group lines by one field, largest value first.
 * @param {Array<object>} lines @param {string} field
 * @returns {Array<object>} buckets with a `share` of the file total (null when the total is zero).
 */
function groupBy (lines, field) {
  const groups = Object.create(null)
  for (const l of lines) { (groups[l[field]] = groups[l[field]] || []).push(l) }
  const total = lines.reduce((t, l) => t + (l.value === null ? 0 : l.value), 0)
  return Object.keys(groups)
    .map(name => bucket(name, groups[name]))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
    .map(b => Object.assign(b, { share: total === 0 ? null : b.value / total }))
}

/**
 * The totals the stock page prints, from a read export — pure, so every rule is testable
 * without a file. This is ALL the route sends: no product line leaves the server.
 *
 * @param {object} parsed - `readInventoryUpload`'s result.
 * @param {string} firmCurrency - the firm's currency code (e.g. 'NZD').
 * @returns {object} { package, confidence, costBasis, currency, currencyAssumed, lineCount,
 *   linesWithoutValue, totalValue, units: {onHand, allocated, available, onOrder|null},
 *   allocatedShare, categories[], locations[] }
 * @throws {Error} INVENTORY_CURRENCY_MISMATCH — an Unleashed file in another currency, or in more than one.
 */
function summariseInventory (parsed, firmCurrency) {
  const firm = String(firmCurrency || '').toUpperCase()
  let currency = firm
  let currencyAssumed = true
  if (parsed.hasCurrency) {
    const codes = Array.from(new Set(parsed.lines.map(l => l.currency).filter(Boolean)))
    if (codes.length > 1) {
      const e = new Error('This ' + parsed.package + ' export holds stock in more than one currency (' + codes.join(', ') + '). Please export one currency at a time.')
      e.code = 'INVENTORY_CURRENCY_MISMATCH'
      throw e
    }
    if (codes.length === 1 && codes[0] !== firm) {
      const e = new Error('This ' + parsed.package + ' export is in ' + codes[0] + ' but the firm reports in ' + firm + '. It cannot be set against the accounts without conversion, so it has not been read.')
      e.code = 'INVENTORY_CURRENCY_MISMATCH'
      throw e
    }
    if (codes.length === 1) { currency = codes[0]; currencyAssumed = false }
  }

  const lines = parsed.lines
  const valued = lines.filter(l => l.value !== null)
  const total = bucket('all', lines)
  const onOrder = parsed.hasOnOrder ? lines.reduce((t, l) => t + (l.onOrder === null ? 0 : l.onOrder), 0) : null

  return {
    package: parsed.package,
    confidence: parsed.confidence,
    costBasis: parsed.costBasis,
    currency,
    currencyAssumed,
    lineCount: lines.length,
    linesWithoutValue: lines.length - valued.length,
    totalValue: total.value,
    units: { onHand: total.onHand, allocated: total.allocated, available: total.available, onOrder },
    allocatedShare: total.onHand === 0 ? null : total.allocated / total.onHand,
    categories: groupBy(lines, 'category'),
    locations: groupBy(lines, 'location')
  }
}

module.exports = { INVENTORY_PACKAGES, readInventoryUpload, summariseInventory, UNGROUPED }
