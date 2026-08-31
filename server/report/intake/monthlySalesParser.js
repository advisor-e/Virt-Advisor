'use strict'

/**
 * By-month Xero P&L parser — reads the "Current financial year by month" export into
 * a series of monthly SALES figures, which is what the Volatility Report takes.
 *
 * WHY THIS EXISTS SEPARATELY FROM xeroReportParser. That parser reads ONE figure per
 * period and deliberately REFUSES a by-month export (MULTI_PERIOD_COLUMNS, added
 * 2026-07-19) because reading only its first column silently lost the rest of the year.
 * That refusal is correct and stays: the annual models want a year, not a January. This
 * module is the other half — the same document, read across its columns on purpose.
 *
 * WHAT THE FILE ACTUALLY LOOKS LIKE (verified against a real client export, 2026-07-15 —
 * REPORT-DATA-MODEL §3.9): a column per month plus a year-to-date column, income broken
 * out by line item, covering ONE financial year.
 *
 * THREE FINDINGS FROM THAT FILE THAT THIS CODE EXISTS TO HANDLE. Each one produces a
 * number that is wrong and completely believable, which is the worst kind:
 *
 *  1. **Months after the data cut-off read as a genuine 0.** A year ending 31 Mar 2027
 *     had real figures only through July 2026 — eight zeros that are "no data", not "no
 *     sales". Averaged in, they drag the mean down and widen the standard deviation, and
 *     the volatility score that comes out looks perfectly plausible. They are marked
 *     `complete: false, reason: 'empty'` and the assembler drops them.
 *  2. **The last populated month is usually partial**, because the export was taken
 *     mid-month. A half month reads as a collapse and lands outside the third deviation —
 *     a "finding" that is really an artefact of when the file was made. It cannot be
 *     detected from the cells, so it is INFERRED: a month is partial only when empty
 *     months follow it, which is what proves the export is mid-year. A completed
 *     historical year (all twelve populated) therefore has no partial month, which is
 *     the correct reading of last year's export.
 *  3. **The year-to-date column is not a month.** It is excluded by never matching the
 *     month-header pattern, and the count check below would catch it if it ever did.
 *
 * IDENTITY. §3.9 item 7: account row labels carry bank-card suffixes and people's names.
 * This module returns month labels and figures only — never a row label — so nothing
 * identifying can reach a log or the client payload by way of this path.
 */

const {
  gridsFromBuffer,
  PL_TITLE,
  headerMeta,
  yearOf,
  INCOME_RULES
} = require('./xeroReportParser')

/** Month names in calendar order; the index IS the month number (0 = January). */
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** A month column header: "Apr", "April", "Apr 2026", "Apr-26", "Apr/26". */
const MONTH_HEADER_RE = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*[-–/]?\s*((?:19|20)?\d{2})?$/i

const TOTAL_RE = /^total\b/i

/**
 * Fewer than this many month columns and it is not a by-month export. Six rather than
 * twelve on purpose: a part-year export (a company in its first months of trading) is
 * still a by-month file and must be read, not refused. The Volatility model needs twelve
 * for its shortest window, but that is the ASSEMBLER's judgement to make once the months
 * are in hand — refusing here would give the advisor "wrong export" for a right one.
 */
const MIN_MONTH_COLUMNS = 6

/** Strip the Less/Plus/Add prefix Xero opens sections with (mirrors sectionName in the annual parser). */
function sectionName (label) {
  return label.replace(/^(?:less|plus|add)\s+/i, '')
}

/**
 * Locate the month-header row and its columns.
 * @param {Array<Array<string|number|null>>} grid
 * @returns {{row:number, cols:Array<{col:number, month:number, year:number|null, label:string}>}|null}
 */
function findMonthHeader (grid) {
  const limit = Math.min(grid.length, 15)
  for (let r = 0; r < limit; r++) {
    const cells = grid[r] || []
    const cols = []
    for (let c = 0; c < cells.length; c++) {
      const v = cells[c]
      if (typeof v !== 'string') { continue }
      const m = MONTH_HEADER_RE.exec(v.trim())
      if (!m) { continue }
      let year = null
      if (m[2]) {
        const n = parseInt(m[2], 10)
        // "26" means 2026; a bare two-digit year is always this century in a Xero export.
        year = m[2].length === 2 ? 2000 + n : n
      }
      cols.push({ col: c, month: MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()), year, label: v.trim() })
    }
    if (cols.length >= MIN_MONTH_COLUMNS) { return { row: r, cols } }
  }
  return null
}

/**
 * Give every month column a year, so two files can be joined without guessing.
 *
 * Three cases, in order: the header already says (Apr 2026); one header says and the
 * rest follow it, walking forward and rolling the year at each January; nothing says, so
 * the report's own period-end year anchors the LAST column and we walk backwards. A
 * financial year that straddles the calendar (Apr → Mar, the NZ default) is exactly why
 * the roll is at January and not at the first column.
 *
 * @param {Array<{col:number, month:number, year:number|null, label:string}>} cols
 * @param {number|null} periodEndYear - from the report's own date line.
 * @returns {boolean} true when every column ended up with a year.
 */
function fillYears (cols, periodEndYear) {
  let anchorAt = -1
  for (let i = 0; i < cols.length; i++) { if (cols[i].year !== null) { anchorAt = i; break } }

  if (anchorAt === -1) {
    if (periodEndYear === null || periodEndYear === undefined) { return false }
    cols[cols.length - 1].year = periodEndYear
    anchorAt = cols.length - 1
  }

  for (let i = anchorAt + 1; i < cols.length; i++) {
    const prev = cols[i - 1]
    if (cols[i].year === null) {
      cols[i].year = cols[i].month <= prev.month ? prev.year + 1 : prev.year
    }
  }
  // No guard here, unlike the forward walk: `anchorAt` is the FIRST dated column, so every
  // column below it is undated by construction. A `year === null` check would be dead.
  for (let i = anchorAt - 1; i >= 0; i--) {
    const next = cols[i + 1]
    cols[i].year = cols[i].month >= next.month ? next.year - 1 : next.year
  }
  return cols.every(c => c.year !== null)
}

/**
 * Reduce each body row to its label and its figure at each month column.
 * @param {Array<Array<string|number|null>>} grid
 * @param {number} headerRow
 * @param {Array<{col:number}>} cols
 * @returns {Array<{label:string|null, values:Array<number|null>, hasValue:boolean}>}
 */
function shapeMonthRows (grid, headerRow, cols) {
  const out = []
  const firstMonthCol = cols[0].col
  for (let r = headerRow + 1; r < grid.length; r++) {
    const cells = grid[r] || []
    let label = null
    for (let c = 0; c < cells.length && c < firstMonthCol; c++) {
      const v = cells[c]
      if (typeof v === 'string' && v.trim() !== '') { label = v.trim(); break }
    }
    const values = cols.map((mc) => {
      const v = cells[mc.col]
      return typeof v === 'number' ? v : null
    })
    out.push({ label, values, hasValue: values.some(v => v !== null) })
  }
  return out
}

/**
 * Walk the body into line items carrying their section path — the by-month twin of
 * lineItems() in the annual parser. A labelled row with no figures at all opens a
 * section; a "Total X" row closes it and is never itself a line item.
 *
 * The annual parser's R17 rescue (a real account literally named "Total Oil purchases")
 * is deliberately NOT reproduced here. It discriminates by comparing a row against a
 * running section sum, which has no single answer across twelve columns; and its whole
 * purpose is to protect an EXPENSE total, whereas this module reads income only. A
 * "Total …" row inside Income is a total here, always.
 *
 * @param {Array<{label:string|null, values:Array<number|null>, hasValue:boolean}>} rows
 * @returns {Array<{section:string[], label:string, values:Array<number|null>}>}
 */
function monthlyLineItems (rows) {
  const items = []
  const stack = []
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if (!r.label) { continue }
    if (TOTAL_RE.test(r.label)) {
      const closes = r.label.replace(TOTAL_RE, '').trim().toLowerCase()
      for (let s = stack.length - 1; s >= 0; s--) {
        if (stack[s].toLowerCase() === closes) { stack.length = s; break }
      }
      continue
    }
    if (!r.hasValue) { stack.push(sectionName(r.label)); continue }
    items.push({ section: stack.slice(), label: r.label, values: r.values })
  }
  return items
}

/** Does any section on the item's path match the pattern? */
function inSection (item, re) {
  return item.section.some(s => re.test(s))
}

/**
 * Extract the monthly sales series from a by-month P&L grid.
 *
 * Sales is decided by exactly the rule the annual parser uses (INCOME_RULES, shared from
 * xeroReportParser): trading-income line items only, with Other Income, interest,
 * dividends and bad debts recovered excluded. Two copies of that rule would mean the same
 * client file yielding two different revenue figures depending on which export was dropped.
 *
 * @param {Array<Array<string|number|null>>} grid
 * @returns {object} { recognised:false } when this is not a by-month P&L, else
 *   { recognised:true, kind:'profitLossByMonth', companyName, reportDate,
 *     months: Array<{ label, month, year, ordinal, value, complete, reason }>,
 *     warnings: string[] } — months are oldest-first, `ordinal` is year*12+month so the
 *   assembler can join two files by arithmetic rather than by parsing labels again.
 */
function extractMonthlySales (grid) {
  const header = findMonthHeader(grid)
  if (!header) { return { recognised: false } }

  // The report title is checked on the rows ABOVE the month header — same first-8-rows
  // rule as the annual parser, which is where Xero puts the title, company and period.
  const headRows = grid.slice(0, header.row).map((cells) => {
    let label = null
    for (let c = 0; c < (cells || []).length; c++) {
      const v = cells[c]
      if (typeof v === 'string' && v.trim() !== '') { label = v.trim(); break }
    }
    return { label, value: null }
  })
  const meta = headerMeta(headRows, PL_TITLE)
  if (meta.titleRow === -1) { return { recognised: false } }

  const warnings = []
  const cols = header.cols.slice()
  if (!fillYears(cols, yearOf(meta.reportDate))) {
    warnings.push('The export does not date its month columns and its own period line carries no year, so the months could not be placed on a calendar. Check the export, or enter the figures by hand.')
    return { recognised: true, kind: 'profitLossByMonth', companyName: meta.companyName, reportDate: meta.reportDate, months: [], warnings }
  }

  const items = monthlyLineItems(shapeMonthRows(grid, header.row, cols))
  const incomeItems = items.filter(it => inSection(it, INCOME_RULES.INCOME_SECTION_RE))
  const excluded = new Set(
    incomeItems.filter(it =>
      INCOME_RULES.INTEREST_RECEIVED_RE.test(it.label) ||
      INCOME_RULES.DIVIDENDS_RE.test(it.label) ||
      INCOME_RULES.BAD_DEBTS_RECOVERED_RE.test(it.label)
    )
  )
  const salesItems = incomeItems.filter(it => !excluded.has(it))

  if (!salesItems.length) {
    warnings.push('No trading-income rows were found in this export, so no monthly sales could be read. Check that the export is a Profit and Loss with its income broken out by line item.')
  }

  const months = cols.map((c, i) => {
    let total = 0
    for (const it of salesItems) { if (typeof it.values[i] === 'number') { total += it.values[i] } }
    return {
      label: c.label,
      month: c.month,
      year: c.year,
      ordinal: c.year * 12 + c.month,
      value: total,
      complete: true,
      reason: null
    }
  })
  months.sort((a, b) => a.ordinal - b.ordinal)

  // Finding 1: a zero month is "no data", not "no sales".
  for (const m of months) {
    if (m.value === 0) { m.complete = false; m.reason = 'empty' }
  }
  // Finding 2: the cut-off month is partial — but ONLY when empty months follow it,
  // which is what shows the export was taken mid-year. A fully populated file is a
  // closed year and every month in it is real.
  let lastPopulated = -1
  for (let i = 0; i < months.length; i++) { if (months[i].value !== 0) { lastPopulated = i } }
  if (lastPopulated !== -1 && lastPopulated < months.length - 1) {
    months[lastPopulated].complete = false
    months[lastPopulated].reason = 'partial'
  }

  return {
    recognised: true,
    kind: 'profitLossByMonth',
    companyName: meta.companyName,
    reportDate: meta.reportDate,
    months,
    warnings
  }
}

/**
 * Sniff an uploaded buffer and extract its monthly sales series. The single entry point
 * the Volatility intake route calls.
 *
 * @param {Buffer} buf - the uploaded file's bytes.
 * @returns {object} the extractMonthlySales result.
 * @throws {Error} err.code ∈ NOT_XLSX | CORRUPT_FILE | FILE_TOO_LARGE | TOO_MANY_PARTS |
 *   PDF_REJECTED | UNRECOGNISED_FILE | NOT_BY_MONTH
 */
function parseMonthlyUpload (buf) {
  const grids = gridsFromBuffer(buf)
  for (let g = 0; g < grids.length; g++) {
    const result = extractMonthlySales(grids[g])
    if (result.recognised) { return result }
  }
  const e = new Error('That export has one column, not twelve. This looks like a whole-year Profit and Loss. This report needs "Current financial year by month" — in Xero, choose that layout before exporting.')
  e.code = 'NOT_BY_MONTH'
  throw e
}

module.exports = {
  parseMonthlyUpload,
  extractMonthlySales,
  MIN_MONTH_COLUMNS
}
