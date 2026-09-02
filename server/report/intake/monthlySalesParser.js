'use strict'

/**
 * Monthly-sales parser — turns a BY-MONTH Profit and Loss export into the monthly
 * sales series the Volatility Report measures (item 4.54, Mike's "upload next" half
 * of the 2026-08-31 ruling).
 *
 * This is the mirror image of the annual parser beside it: `xeroReportParser`
 * DELIBERATELY refuses a by-month export (`MULTI_PERIOD_COLUMNS`, 2026-07-19),
 * because reading only its first column silently lost the rest of the year — and
 * this parser refuses a whole-period export for the mirrored reason: one figure
 * column cannot say how twelve months varied. Neither refusal is a defect; each
 * report shape has exactly one reader.
 *
 * What is shared is shared FROM the annual parser, never copied: the hardened
 * grid readers (`readUploadGrids` — bounds-checked xlsx, capped CSV), the report
 * title test, the "what counts as sales" section and label rules (R18 anchoring
 * included), and the Total-row name matching. One definition each, so the two
 * parsers can never disagree about what a P&L is.
 *
 * Contract rules carried over from REPORT-DATA-MODEL §4:
 *  - NEVER read a "Total …" row as a line item — sum the line items per month;
 *    the file's own cached income totals are only a cross-check, warned on mismatch.
 *  - Never silently guess: months that cannot be put in consecutive order are a
 *    refusal, not a reordering; a gap in the months is a refusal, not a zero.
 *  - Wrong file → a plain authored sentence with a stable code; no partial parse.
 *  - Identity stays local: company name and report date go back to the advisor's
 *    own screen; callers must never log them (see the route).
 */

const {
  readUploadGrids,
  shapeRows,
  headerMeta,
  sectionName,
  PL_TITLE,
  TOTAL_RE,
  INCOME_SECTION_RE,
  INTEREST_RECEIVED_RE,
  DIVIDENDS_RE,
  BAD_DEBTS_RECOVERED_RE
} = require('./xeroReportParser')

/** The month keys the screen's own selector uses, calendar order. */
const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** The volatility model measures 12, 18 or 24 months; below 12 no window exists. */
const MIN_MONTHS = 12
/** The model's longest window — extra history beyond it is dropped with a warning. */
const MAX_MONTHS = 24

/** How far down the grid a month header row may sit (title + company + date + blanks). */
const HEADER_SCAN_ROWS = 20

/**
 * "Jan", "Jan 2024", "Jan-24", "January 2024", "31 Jan 2024" — or an Excel date
 * serial. Anything else is not a month column header.
 */
const MONTH_TEXT_RE = /^(?:\d{1,2}\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?:[\s\-./,']+(\d{2}|\d{4}))?$/i

/** Excel date serials for 1990-01-01 .. 2069-12-31 — the range a real header can hold. */
const SERIAL_MIN = 32874
const SERIAL_MAX = 62000

/**
 * Read one header cell as a month.
 *
 * @param {*} cell - a grid cell (string or number).
 * @returns {{ m: number, y: number|null }|null} m is 0-based; y is null when the
 *   header names no year ("Jan"), which is common on narrow exports.
 */
function monthOf (cell) {
  if (typeof cell === 'number') {
    if (!Number.isInteger(cell) || cell < SERIAL_MIN || cell > SERIAL_MAX) { return null }
    // Excel's day 0 is 1899-12-30 (the 1900 leap-year bug means serials after
    // Feb 1900 — every real report date — convert exactly with this epoch).
    const d = new Date(Date.UTC(1899, 11, 30) + cell * 86400000)
    return { m: d.getUTCMonth(), y: d.getUTCFullYear() }
  }
  if (typeof cell !== 'string') { return null }
  const hit = MONTH_TEXT_RE.exec(cell.trim())
  if (!hit) { return null }
  const m = MONTH_KEYS.indexOf(hit[1].slice(0, 3).toLowerCase())
  // Unreachable while MONTH_TEXT_RE and MONTH_KEYS agree — kept so a later edit
  // to either cannot quietly index a month at -1 (same pattern as cpdCatalogue's
  // deliberate defence-in-depth branch).
  if (m === -1) { return null }
  let y = null
  if (hit[2]) {
    y = parseInt(hit[2], 10)
    if (hit[2].length === 2) { y += 2000 }
    if (y < 1990 || y > 2069) { return null }
  }
  return { m, y }
}

/** An intake refusal with its stable code. @param {string} code @param {string} message */
function refuse (code, message) {
  const e = new Error(message)
  e.code = code
  throw e
}

/** The authored under-12 refusal — one wording, used by both short and whole-period files. */
function refuseInsufficient (n) {
  refuse('MONTHS_INSUFFICIENT', n === 0
    ? 'This looks like a whole-period export with no monthly columns. In your accounting software, set the Profit and Loss to monthly for the last 12, 18 or 24 months and export again.'
    : 'This export holds only ' + n + ' monthly columns — the report needs at least 12. In your accounting software, set the Profit and Loss to monthly for the last 12, 18 or 24 months and export again.')
}

/**
 * Find the month header row: the first row where three or more cells read as
 * months. (A "Total" column, or an empty label cell, simply isn't one of them.)
 *
 * @param {Array<Array<string|number|null>>} grid
 * @returns {{ row: number, cols: Array<{col: number, m: number, y: number|null}> }|null}
 */
function findMonthHeader (grid) {
  const limit = Math.min(grid.length, HEADER_SCAN_ROWS)
  for (let r = 0; r < limit; r++) {
    const cells = grid[r] || []
    const cols = []
    for (let c = 0; c < cells.length; c++) {
      const hit = monthOf(cells[c])
      if (hit) { cols.push({ col: c, m: hit.m, y: hit.y }) }
    }
    if (cols.length >= 3) { return { row: r, cols } }
  }
  return null
}

/**
 * Put the month columns oldest-first, refusing anything ambiguous.
 *
 * With years on every header the order is computed and checked; without them the
 * file's own left-to-right order must already be consecutive (ascending or
 * descending) or there is no honest way to know which January is which. A gap or
 * a duplicate is refused either way: volatility statistics over non-consecutive
 * months would be a plausible wrong answer, the exact failure this intake family
 * exists to prevent.
 *
 * @param {Array<{col: number, m: number, y: number|null}>} cols - in file order.
 * @returns {Array<{col: number, m: number, y: number|null}>} oldest first.
 */
function orderMonths (cols) {
  const allYeared = cols.every(c => c.y !== null)
  if (allYeared) {
    const sorted = cols.slice().sort((a, b) => (a.y * 12 + a.m) - (b.y * 12 + b.m))
    for (let i = 1; i < sorted.length; i++) {
      if ((sorted[i].y * 12 + sorted[i].m) !== (sorted[i - 1].y * 12 + sorted[i - 1].m) + 1) {
        refuse('MONTHS_UNREADABLE', 'The export\'s months are not consecutive — the report needs an unbroken run of monthly columns. Please export the Profit and Loss again with one column per month.')
      }
    }
    return sorted
  }
  // No (or partial) years: the printed order itself must be consecutive.
  let ascending = true
  let descending = true
  for (let i = 1; i < cols.length; i++) {
    const step = ((cols[i].m - cols[i - 1].m) % 12 + 12) % 12
    if (step !== 1) { ascending = false }
    if (step !== 11) { descending = false }
  }
  if (ascending) { return cols.slice() }
  if (descending) { return cols.slice().reverse() }
  refuse('MONTHS_UNREADABLE', 'The month columns could not be read in a consecutive order — please export the Profit and Loss again with one column per month.')
}

/**
 * Extract the monthly sales series from one recognised P&L grid.
 *
 * @param {Array<Array<string|number|null>>} grid
 * @param {{companyName: string|null, reportDate: string|null}} meta
 * @returns {object} the parseMonthlyUpload result shape.
 */
function extractMonthlySales (grid, meta) {
  const header = findMonthHeader(grid)
  if (!header) { refuseInsufficient(0) }
  if (header.cols.length < MIN_MONTHS) { refuseInsufficient(header.cols.length) }

  const warnings = []
  let months = orderMonths(header.cols)
  if (months.length > MAX_MONTHS) {
    warnings.push('The export holds ' + months.length + ' months — the most recent ' + MAX_MONTHS + ' were read.')
    months = months.slice(months.length - MAX_MONTHS)
  }

  // Walk the body: label-only rows open sections, "Total X" rows close them and
  // carry the cached totals for the cross-check. Only income-section line items
  // (minus the shared non-sales labels) feed the sales series; ALL income items
  // feed the cross-check, because the file's own "Total Income" includes interest
  // and the like — comparing it against the sales subset would warn on every
  // ordinary export.
  const salesByCol = Object.create(null)
  const incomeByCol = Object.create(null)
  months.forEach((mc) => { salesByCol[mc.col] = 0; incomeByCol[mc.col] = 0 })

  /** @type {Array<{name: string, sum: number}>} open sections; sum spans month columns. */
  const stack = []
  let sawIncomeSection = false
  let cachedIncomeTotals = null

  const monthValues = cells => months.map(mc => (typeof cells[mc.col] === 'number' ? cells[mc.col] : null))
  const inIncome = () => stack.some(s => INCOME_SECTION_RE.test(s.name))
  const isSalesLabel = label =>
    !INTEREST_RECEIVED_RE.test(label) && !DIVIDENDS_RE.test(label) && !BAD_DEBTS_RECOVERED_RE.test(label)

  const addItem = (label, values) => {
    let rowTotal = 0
    for (let i = 0; i < values.length; i++) { rowTotal += values[i] || 0 }
    for (let s = 0; s < stack.length; s++) { stack[s].sum += rowTotal }
    if (inIncome()) {
      months.forEach((mc, i) => { incomeByCol[mc.col] += values[i] || 0 })
      if (isSalesLabel(label)) {
        months.forEach((mc, i) => { salesByCol[mc.col] += values[i] || 0 })
      }
    }
  }

  for (let r = header.row + 1; r < grid.length; r++) {
    const cells = grid[r] || []
    let label = null
    for (let c = 0; c < cells.length; c++) {
      if (typeof cells[c] === 'string' && cells[c].trim()) { label = cells[c].trim(); break }
    }
    if (!label) { continue }
    const values = monthValues(cells)
    const hasValues = values.some(v => v !== null)

    if (TOTAL_RE.test(label)) {
      const closes = label.replace(TOTAL_RE, '').trim().toLowerCase()
      let matched = false
      for (let s = stack.length - 1; s >= 0; s--) {
        if (stack[s].name.toLowerCase() === closes) {
          if (INCOME_SECTION_RE.test(stack[s].name)) { cachedIncomeTotals = values }
          stack.length = s
          matched = true
          break
        }
      }
      // R17, carried over: a "Total X" row that closes nothing, sits inside an
      // open section and does not look like any open section's own sum is a real
      // account (e.g. "Total Oil purchases") — kept, never dropped or doubled.
      if (!matched && stack.length && hasValues) {
        let rowTotal = 0
        for (let i = 0; i < values.length; i++) { rowTotal += values[i] || 0 }
        if (!stack.some(s => Math.abs(s.sum - rowTotal) <= 0.01)) { addItem(label, values) }
      }
      continue
    }

    if (!hasValues) {
      const name = sectionName(label)
      if (INCOME_SECTION_RE.test(name)) { sawIncomeSection = true }
      stack.push({ name, sum: 0 })
      continue
    }
    addItem(label, values)
  }

  if (!sawIncomeSection) {
    refuse('UNRECOGNISED_REPORT', 'The export has no income section to read monthly sales from — please check it is a standard Profit and Loss export.')
  }

  // Cross-check the file's own cached income totals, month by month (§3.1: the
  // line-item sums are the answer; the cached row only ever raises a warning).
  if (cachedIncomeTotals) {
    let mismatches = 0
    months.forEach((mc, i) => {
      const cached = cachedIncomeTotals[i]
      if (typeof cached === 'number' && Math.abs(cached - incomeByCol[mc.col]) > 0.01) { mismatches++ }
    })
    if (mismatches) {
      warnings.push('The file\'s own income totals do not match the sum of its line items for ' + mismatches + ' month(s) — the line-item sums were used. Please check the export.')
    }
  }

  return {
    recognised: true,
    kind: 'monthlySales',
    companyName: meta.companyName,
    reportDate: meta.reportDate,
    months: months.map(mc => ({ key: MONTH_KEYS[mc.m], year: mc.y, sales: salesByCol[mc.col] })),
    monthsRead: months.length,
    warnings
  }
}

/**
 * Sniff an uploaded buffer, read it, find the by-month P&L sheet and extract the
 * monthly sales series. The single entry point the volatility intake route calls.
 *
 * @param {Buffer} buf - the uploaded file's bytes.
 * @returns {object} { recognised: true, kind: 'monthlySales', companyName,
 *   reportDate, months: [{key, year, sales}] oldest-first, monthsRead, warnings }.
 * @throws {Error} err.code ∈ NOT_XLSX | CORRUPT_FILE | FILE_TOO_LARGE |
 *   TOO_MANY_PARTS | PDF_REJECTED | UNRECOGNISED_FILE | UNRECOGNISED_REPORT |
 *   MONTHS_INSUFFICIENT | MONTHS_UNREADABLE
 */
function parseMonthlyUpload (buf) {
  const grids = readUploadGrids(buf)
  for (let g = 0; g < grids.length; g++) {
    const meta = headerMeta(shapeRows(grids[g]), PL_TITLE)
    if (meta.titleRow === -1) { continue }
    return extractMonthlySales(grids[g], meta)
  }
  refuse('UNRECOGNISED_REPORT', 'This does not look like a Profit and Loss export — expected the report title in the first rows.')
}

module.exports = { parseMonthlyUpload, extractMonthlySales, monthOf, MIN_MONTHS, MAX_MONTHS, MONTH_KEYS }
