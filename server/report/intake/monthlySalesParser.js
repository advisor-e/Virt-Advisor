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

// ─────────────────────────────────────────────────────────────────────────────
// The SECOND shape: a Xero Account Transactions export.
//
// Added 2026-08-31, when Mike dropped his own export in and it was refused. It was not
// the wrong file — it was a shape nobody had described to us:
//
//   Consultancy Fees Transactions
//   Kinetic Planning (2007) Limited
//   For the period 20 August 2024 to 31 August 2026
//   Date | Gross
//   Consultancy Fees
//   45525 | 11000        ← one row per invoice, the date an Excel serial
//   …
//   Total Consultancy Fees | 0
//
// It is a BETTER source for this model than the by-month P&L: it spans as many years as
// the advisor asks for, so one file can fill the 24-month window that otherwise needs two.
// The months are summed from the transactions rather than read from columns.
//
// TWO THINGS ARE READ DIFFERENTLY HERE, and both are deliberate:
//  - **A month with no transaction is a REAL zero**, not missing data. In a by-month P&L
//    a 0 means "the year has not reached this month"; in a transaction listing it means
//    "nothing was invoiced", which is exactly the lumpiness this report measures. Reading
//    it as missing would quietly delete the quiet months and flatter the business.
//  - **The report's own period line decides what is partial**, not the presence of later
//    months. A period starting 20 August covers only part of that August, and one ending
//    mid-month likewise — both are set aside on the same rule as the P&L's cut-off month.
// ─────────────────────────────────────────────────────────────────────────────

/** Xero writes the amount column under one of these; first match wins. */
const AMOUNT_HEADERS = ['gross', 'amount', 'total', 'net']
const DATE_HEADER_RE = /^date$/i
/** "For the period 20 August 2024 to 31 August 2026" */
const PERIOD_RE = /^for the period\s+(.+?)\s+to\s+(.+)$/i
const MONTH_NAME_RE = /^(\d{1,2})\s+([a-z]+)\s+((?:19|20)\d{2})$/i

/**
 * An Excel date serial as a UTC calendar date. Serial 1 is 1 Jan 1900, and the epoch is
 * offset by two days for Lotus's 1900 leap-year bug — the standard 1899-12-30 anchor,
 * correct for every serial above 60, which is every date a Xero export can carry.
 * @param {number} serial
 * @returns {{year:number, month:number, day:number}|null}
 */
function fromExcelSerial (serial) {
  if (!Number.isFinite(serial) || serial < 61 || serial > 2958465) { return null }
  const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000)
  return { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate() }
}

/** "20 August 2024" → {year, month, day}. @param {string} text */
function parseDayMonthYear (text) {
  const m = MONTH_NAME_RE.exec(String(text).trim())
  if (!m) { return null }
  const month = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase())
  if (month === -1) { return null }
  return { year: parseInt(m[3], 10), month, day: parseInt(m[1], 10) }
}

/** Days in a month, so a period end mid-month can be spotted. */
/** "20 August 2024" from a parsed date. @param {{year:number,month:number,day:number}} d */
function dayLabel (d) {
  return d.day + ' ' + MONTHS[d.month].charAt(0).toUpperCase() + MONTHS[d.month].slice(1) + ' ' + d.year
}

function daysInMonth (year, month) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
}

/**
 * Extract monthly sales from a Xero Account Transactions grid.
 *
 * @param {Array<Array<string|number|null>>} grid
 * @returns {object} { recognised:false } when this is not a transactions export, else the
 *   same shape extractMonthlySales returns, with kind 'accountTransactions'.
 */
function extractTransactionMonths (grid) {
  // The column header row: a cell that says "Date", plus a named amount column.
  let headerRow = -1
  let dateCol = -1
  let amountCol = -1
  const limit = Math.min(grid.length, 15)
  for (let r = 0; r < limit && headerRow === -1; r++) {
    const cells = grid[r] || []
    let d = -1
    let a = -1
    let best = AMOUNT_HEADERS.length
    for (let c = 0; c < cells.length; c++) {
      const v = cells[c]
      if (typeof v !== 'string') { continue }
      const text = v.trim()
      if (d === -1 && DATE_HEADER_RE.test(text)) { d = c; continue }
      const rank = AMOUNT_HEADERS.indexOf(text.toLowerCase())
      if (rank !== -1 && rank < best) { best = rank; a = c }
    }
    if (d !== -1 && a !== -1) { headerRow = r; dateCol = d; amountCol = a }
  }
  if (headerRow === -1) { return { recognised: false } }

  // Company and period from the rows above the header.
  let companyName = null
  let periodStart = null
  let periodEnd = null
  for (let r = 0; r < headerRow; r++) {
    const cells = grid[r] || []
    let label = null
    for (let c = 0; c < cells.length; c++) {
      const v = cells[c]
      if (typeof v === 'string' && v.trim() !== '') { label = v.trim(); break }
    }
    if (!label) { continue }
    const period = PERIOD_RE.exec(label)
    if (period) {
      periodStart = parseDayMonthYear(period[1])
      periodEnd = parseDayMonthYear(period[2])
      continue
    }
    // The first line is the report's own title ("… Transactions"); the next is the company.
    if (r > 0 && companyName === null) { companyName = label }
  }

  // One row per transaction: a date SERIAL in the date column. Section headers and
  // "Total …" rows carry text there instead, so they exclude themselves.
  const byOrdinal = new Map()
  let counted = 0
  let earliest = null
  let latest = null
  for (let r = headerRow + 1; r < grid.length; r++) {
    const cells = grid[r] || []
    const when = fromExcelSerial(typeof cells[dateCol] === 'number' ? cells[dateCol] : NaN)
    const amount = cells[amountCol]
    if (!when || typeof amount !== 'number') { continue }
    const ordinal = when.year * 12 + when.month
    byOrdinal.set(ordinal, (byOrdinal.get(ordinal) || 0) + amount)
    counted++
    if (earliest === null || ordinal < earliest) { earliest = ordinal }
    if (latest === null || ordinal > latest) { latest = ordinal }
  }
  if (!counted) { return { recognised: false } }

  // The period line is authoritative for the span; the transactions themselves are the
  // fallback when it is absent or unreadable.
  const from = periodStart ? periodStart.year * 12 + periodStart.month : earliest
  const to = periodEnd ? periodEnd.year * 12 + periodEnd.month : latest

  const warnings = []
  const months = []
  for (let ordinal = Math.min(from, earliest); ordinal <= Math.max(to, latest); ordinal++) {
    const year = Math.floor(ordinal / 12)
    const month = ordinal % 12
    let complete = true
    let reason = null
    // A period that begins or ends mid-month covers only part of it.
    if (periodStart && ordinal === from && periodStart.day > 1) { complete = false; reason = 'partial' }
    if (periodEnd && ordinal === to && periodEnd.day < daysInMonth(year, month)) { complete = false; reason = 'partial' }
    months.push({
      label: MONTHS[month].charAt(0).toUpperCase() + MONTHS[month].slice(1) + ' ' + year,
      month,
      year,
      ordinal,
      value: byOrdinal.get(ordinal) || 0,
      complete,
      reason
    })
  }

  const quiet = months.filter(m => m.complete && m.value === 0).length
  if (quiet) {
    warnings.push(quiet === 1
      ? '1 month has no transactions in this export and is counted as zero sales — which is what a transaction listing means. If that month had sales recorded elsewhere, type it in.'
      : quiet + ' months have no transactions in this export and are counted as zero sales — which is what a transaction listing means. If those months had sales recorded elsewhere, type them in.')
  }

  return {
    recognised: true,
    kind: 'accountTransactions',
    companyName,
    reportDate: periodStart && periodEnd ? (dayLabel(periodStart) + ' to ' + dayLabel(periodEnd)) : null,
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
    const byMonth = extractMonthlySales(grids[g])
    if (byMonth.recognised) { return byMonth }
    const transactions = extractTransactionMonths(grids[g])
    if (transactions.recognised) { return transactions }
  }
  const e = new Error('This export does not carry monthly figures. Two Xero reports do: Profit and Loss with the "Current financial year by month" layout, or an Account Transactions export for your sales account (Reports → Account Transactions), which can cover more than one year.')
  e.code = 'NOT_BY_MONTH'
  throw e
}

module.exports = {
  parseMonthlyUpload,
  extractTransactionMonths,
  extractMonthlySales,
  MIN_MONTH_COLUMNS
}
