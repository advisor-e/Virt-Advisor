'use strict'

/**
 * Xero report parser — turns a raw cell grid (from the xlsx or csv reader) into the
 * Quick Position intake proposal: which figures the file can seed, each tagged
 * `source: 'file'`, with multi-row candidates where the chart of accounts splits a
 * concept across rows (the verified Electric Bikes stock finding, REPORT-DATA-MODEL §3.9).
 *
 * Contract rules implemented here (REPORT-DATA-MODEL §4):
 *  - NEVER read a "Total …" row as a line item — always sum the line items; when the
 *    file carries a cached section total, use it only as a cross-check and warn on
 *    mismatch (§3.1 + its 2026-07-15 nuance).
 *  - Never silently guess: a figure the file can't supply is simply absent from the
 *    proposal (the screen presents it pre-filled with the model default, tagged *entered*).
 *  - Wrong file → `recognised: false` with what was expected; no partial parse.
 *  - Identity stays local: this module returns labels/company name for the advisor's
 *    own screen, but callers must never log them (see the route).
 */

const { readXlsx, XlsxReadError } = require('./xlsxReader')
const { parseCsv } = require('./csvReader')

/** A grid row reduced to its first text cell + first numeric cell. */
function rowShape (cells) {
  let label = null
  let labelCol = -1
  let value = null
  for (let c = 0; c < cells.length; c++) {
    const v = cells[c]
    if (v === null || v === undefined || v === '') { continue }
    if (typeof v === 'string' && label === null) { label = v.trim(); labelCol = c; continue }
    if (typeof v === 'number' && label !== null && c > labelCol && value === null) { value = v; break }
  }
  return { label, value }
}

/** @param {Array<Array<string|number|null>>} grid @returns {Array<{label:string|null, value:number|null}>} */
function shapeRows (grid) {
  return grid.map(cells => rowShape(cells || []))
}

// Multi-column exports (R4, 2026-07-19): rowShape reads the FIRST numeric cell only, so
// extra figure columns vanish silently — and the cached-total cross-check reads the same
// column, so it can never catch it. Two real shapes: comparative (2–4 columns, first =
// most recent period, correct but partial → warn) and by-month/by-quarter (5+, first =
// a fraction of the year → refuse, contract §4.7: wrong-shape files fail loudly).
const WARN_FIGURE_COLUMNS = 2
const REFUSE_FIGURE_COLUMNS = 5

/** The widest labelled row's count of numeric cells after its label. @param {Array<Array<string|number|null>>} grid */
function figureColumnCount (grid) {
  let max = 0
  for (let r = 0; r < grid.length; r++) {
    const cells = grid[r] || []
    let hasLabel = false
    let count = 0
    for (let c = 0; c < cells.length; c++) {
      const v = cells[c]
      if (v === null || v === undefined || v === '') { continue }
      if (typeof v === 'string' && !hasLabel) { hasLabel = true; continue }
      if (typeof v === 'number' && hasLabel) { count++ }
    }
    if (count > max) { max = count }
  }
  return max
}

/** Refuse (5+ figure columns) or warn (2–4) on a recognised multi-column report. @param {Array<Array<string|number|null>>} grid @param {string[]} warnings */
function guardFigureColumns (grid, warnings) {
  const cols = figureColumnCount(grid)
  if (cols >= REFUSE_FIGURE_COLUMNS) {
    const e = new Error('This export splits the year across many columns (a by-month or by-quarter report). Please export the whole-period report from Xero and drop that instead.')
    e.code = 'MULTI_PERIOD_COLUMNS'
    throw e
  }
  if (cols >= WARN_FIGURE_COLUMNS) {
    warnings.push('The file holds several figure columns — only the first (the most recent period) was read. If you wanted a different period, export that single period and drop it instead.')
  }
}

const TOTAL_RE = /^total\b/i

/**
 * Xero opens P&L sections as "Less Cost of Sales" / "Less Operating Expenses" but
 * closes them as "Total Cost of Sales" — the section's tracked name must drop the
 * Less/Plus/Add prefix or the close never matches the open and sections nest wrongly
 * (found by the EBITDA intake tests, 2026-07-17).
 */
function sectionName (label) {
  return label.replace(/^(?:less|plus|add)\s+/i, '')
}

/**
 * Walk a report body: section headers (label, no value) open a section; "Total X"
 * rows close it and carry the file's own cached total for the cross-check.
 * @param {Array<{label:string|null, value:number|null}>} rows
 * @returns {Array<{section:string[], label:string, value:number}>} line items with their section path
 */
function lineItems (rows) {
  const items = []
  const stack = []
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if (!r.label) { continue }
    if (TOTAL_RE.test(r.label)) {
      // never a line item; pop the section it closes (best-effort by name)
      const closes = r.label.replace(TOTAL_RE, '').trim().toLowerCase()
      for (let s = stack.length - 1; s >= 0; s--) {
        if (stack[s].name.toLowerCase() === closes) {
          stack[s].cachedTotal = (typeof r.value === 'number') ? r.value : null
          stack.length = s
          break
        }
      }
      continue
    }
    if (r.value === null) {
      stack.push({ name: sectionName(r.label), cachedTotal: null })
      continue
    }
    items.push({ section: stack.map(s => s.name), label: r.label, value: r.value })
  }
  return items
}

/** Does any section on the path match the pattern? */
function inSection (item, re) {
  return item.section.some(s => re.test(s))
}

/** Sum a candidate list. @param {Array<{label:string,value:number}>} c */
function sumCandidates (c) { return c.reduce((t, x) => t + x.value, 0) }

/**
 * Cross-check the file's own cached section totals against our line-item sums.
 * @param {Array<{label:string|null, value:number|null}>} rows
 * @returns {string[]} warnings (label-based, no client identity)
 */
function totalCrossChecks (rows) {
  const warnings = []
  const sums = Object.create(null)
  const stack = []
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if (!r.label) { continue }
    if (TOTAL_RE.test(r.label)) {
      const name = r.label.replace(TOTAL_RE, '').trim()
      const key = name.toLowerCase()
      const idx = stack.lastIndexOf(key)
      if (idx !== -1) {
        if (typeof r.value === 'number' && sums[key] !== undefined && Math.abs(sums[key] - r.value) > 0.01) {
          warnings.push('The file\'s own "Total ' + name + '" does not match the sum of its line items — the line-item sum was used. Please check the export.')
        }
        stack.length = idx
      }
      continue
    }
    if (r.value === null) { const key = sectionName(r.label).toLowerCase(); stack.push(key); sums[key] = 0; continue }
    for (let s = 0; s < stack.length; s++) { sums[stack[s]] += r.value }
  }
  return warnings
}

/** Find the report's own date/period line in the header rows. */
function headerMeta (rows, titleRe) {
  const meta = { companyName: null, reportDate: null, titleRow: -1 }
  const limit = Math.min(rows.length, 8)
  for (let i = 0; i < limit; i++) {
    const label = rows[i].label
    if (!label) { continue }
    if (meta.titleRow === -1 && titleRe.test(label)) { meta.titleRow = i; continue }
    const asAt = /^as at\s+(.+)$/i.exec(label)
    const period = /^for the\s+(.+)$/i.exec(label) || /^(\d{1,2}\s+\w+\s+\d{4})\s*(?:to|[-–])\s*(.+)$/i.exec(label)
    if (asAt) { meta.reportDate = asAt[1].trim(); continue }
    if (period) { meta.reportDate = label.trim(); continue }
    if (meta.companyName === null && meta.titleRow !== -1) { meta.companyName = label } else if (meta.companyName === null && i > 0) { meta.companyName = label }
  }
  return meta
}

const BS_TITLE = /balance\s*sheet/i
const PL_TITLE = /profit\s*(?:and|&)\s*loss|income\s+statement/i

/**
 * Extract the Quick Position proposals from a Balance Sheet grid.
 * @param {Array<Array<string|number|null>>} grid
 * @returns {object} { recognised, kind, companyName, reportDate, proposals, warnings }
 */
function extractBalanceSheet (grid) {
  const rows = shapeRows(grid)
  const meta = headerMeta(rows, BS_TITLE)
  if (meta.titleRow === -1) { return { recognised: false } }

  const items = lineItems(rows)
  const warnings = totalCrossChecks(rows)
  guardFigureColumns(grid, warnings)

  const bankRows = items.filter(it => inSection(it, /^bank$|bank accounts/i))
  const debtorRows = items.filter(it => /accounts?\s+receivable|trade\s+(receivable|debtor)|^debtors\b/i.test(it.label))
  const stockRows = items.filter(it => /stock|inventor/i.test(it.label))
  const liabItems = items.filter(it => inSection(it, /liabilit/i))
  const creditorRows = liabItems.filter(it => /accounts?\s+payable|trade\s+(payable|creditor)|^creditors\b/i.test(it.label))
  const wageRows = liabItems.filter(it => /paye|payroll|wages|salaries/i.test(it.label))

  const proposals = Object.create(null)
  const propose = (key, candidates) => {
    if (candidates.length) {
      proposals[key] = {
        value: sumCandidates(candidates),
        source: 'file',
        candidates: candidates.map(c => ({ label: c.label, value: c.value }))
      }
    }
  }
  propose('cash', bankRows)
  propose('debtors', debtorRows)
  propose('stock', stockRows)
  propose('creditors', creditorRows)
  propose('wagesDue', wageRows)

  return {
    recognised: true,
    kind: 'balanceSheet',
    companyName: meta.companyName,
    reportDate: meta.reportDate,
    proposals,
    warnings
  }
}

// EBITDA & DCF line classification (2026-07-17). Each income item lands in exactly ONE
// bucket — interest/dividends/bad-debts match by label first, the remainder splits by
// section (trading income -> sales, other income -> otherIncome) — so seeding both
// `sales` and `interestReceived` can never double-count a row.
const INTEREST_RECEIVED_RE = /interest\s+(income|received)/i
const DIVIDENDS_RE = /^dividends?\b/i
const BAD_DEBTS_RECOVERED_RE = /bad\s*debts?\s*recovered/i
const INTEREST_PAID_RE = /interest\s+(paid|expense)|loan\s+interest/i
const OTHER_INCOME_SECTION_RE = /other\s+income|non-?operating\s+income/i
const COST_OF_SALES_SECTION_RE = /cost\s+of\s+(sales|goods)/i

/** Package a candidate list as a file-sourced proposal, or undefined when none found. */
function proposalOf (candidates) {
  if (!candidates.length) { return undefined }
  return {
    value: sumCandidates(candidates),
    source: 'file',
    candidates: candidates.map(c => ({ label: c.label, value: c.value }))
  }
}

/** The report's year: the LAST 4-digit year in its own date line ("1 April 2024 to 31 March 2025" -> 2025). */
function yearOf (reportDate) {
  if (!reportDate) { return null }
  const matches = String(reportDate).match(/\b(?:19|20)\d{2}\b/g)
  return matches ? parseInt(matches[matches.length - 1], 10) : null
}

/**
 * Extract the Expenses Review seed (and an income figure) from a P&L grid — plus, since
 * the EBITDA & DCF model (Stage B, 2026-07-17), the per-figure proposals it needs, in
 * `plFigures`. Additive: the Quick Position contract (expenseLines, incomeTotal) is
 * byte-for-byte unchanged.
 *
 * @param {Array<Array<string|number|null>>} grid
 * @returns {object} { recognised, kind, companyName, reportDate, year, expenseLines,
 *   incomeTotal, plFigures, warnings } — plFigures keys (each {value, source:'file',
 *   candidates} and present only when the file carries it): sales, costOfSales,
 *   operatingExpenses, otherIncome, interestReceived, dividendsReceived,
 *   badDebtsRecovered, loanInterestPaid. operatingExpenses deliberately INCLUDES any
 *   interest-paid rows (the model adds interest back separately, so its opex total must
 *   contain it — EBITDA Calcs row 14 vs row 28).
 */
function extractProfitLoss (grid) {
  const rows = shapeRows(grid)
  const meta = headerMeta(rows, PL_TITLE)
  if (meta.titleRow === -1) { return { recognised: false } }

  const items = lineItems(rows)
  const warnings = totalCrossChecks(rows)
  guardFigureColumns(grid, warnings)

  const expenseItems = items.filter(it => inSection(it, /operating expenses|^expenses$|overheads/i))
  const incomeItems = items.filter(it => inSection(it, /^income$|^revenue$|trading income|^sales$/i))
  const otherIncomeItems = items.filter(it => inSection(it, OTHER_INCOME_SECTION_RE))
  const costOfSalesItems = items.filter(it => inSection(it, COST_OF_SALES_SECTION_RE))

  const allIncome = incomeItems.concat(otherIncomeItems)
  const interestReceived = allIncome.filter(it => INTEREST_RECEIVED_RE.test(it.label))
  const dividendsReceived = allIncome.filter(it => DIVIDENDS_RE.test(it.label))
  const badDebtsRecovered = allIncome.filter(it => BAD_DEBTS_RECOVERED_RE.test(it.label))
  const claimed = new Set(interestReceived.concat(dividendsReceived, badDebtsRecovered))
  const salesItems = incomeItems.filter(it => !claimed.has(it))
  const plainOtherIncome = otherIncomeItems.filter(it => !claimed.has(it))
  const loanInterestPaid = expenseItems.filter(it => INTEREST_PAID_RE.test(it.label))

  const plFigures = Object.create(null)
  const put = (key, candidates) => {
    const p = proposalOf(candidates)
    if (p) { plFigures[key] = p }
  }
  put('sales', salesItems)
  put('costOfSales', costOfSalesItems)
  put('operatingExpenses', expenseItems)
  put('otherIncome', plainOtherIncome)
  put('interestReceived', interestReceived)
  put('dividendsReceived', dividendsReceived)
  put('badDebtsRecovered', badDebtsRecovered)
  put('loanInterestPaid', loanInterestPaid)

  return {
    recognised: true,
    kind: 'profitLoss',
    companyName: meta.companyName,
    reportDate: meta.reportDate,
    year: yearOf(meta.reportDate),
    expenseLines: expenseItems.map(it => ({ name: it.label, amount: it.value })),
    incomeTotal: incomeItems.length ? sumCandidates(incomeItems) : null,
    plFigures,
    warnings
  }
}

/**
 * Sniff an uploaded buffer, read it (xlsx or csv), detect which Xero report it is,
 * and extract the intake proposal. The single entry point the route calls.
 *
 * @param {Buffer} buf - the uploaded file's bytes.
 * @returns {object} on success: the extract result above.
 * @throws {XlsxReadError|Error} err.code ∈ NOT_XLSX | CORRUPT_FILE | FILE_TOO_LARGE |
 *   TOO_MANY_PARTS | PDF_REJECTED | UNRECOGNISED_FILE | UNRECOGNISED_REPORT | MULTI_PERIOD_COLUMNS
 */
function parseUpload (buf) {
  if (!Buffer.isBuffer(buf) || buf.length === 0) {
    const e = new Error('The upload was empty'); e.code = 'UNRECOGNISED_FILE'; throw e
  }
  if (buf.length >= 4 && buf.toString('latin1', 0, 4) === '%PDF') {
    const e = new Error('PDF files cannot be read reliably — please export the report from Xero as Excel (.xlsx) or CSV and drop that instead')
    e.code = 'PDF_REJECTED'
    throw e
  }

  let grids
  if (buf.length >= 4 && buf.readUInt32LE(0) === 0x04034B50) {
    grids = readXlsx(buf).map(s => s.rows)
  } else {
    // Treat as text/CSV only if it decodes as printable text (no binary control bytes)
    const text = buf.toString('utf8')
    // eslint-disable-next-line no-control-regex -- deliberately detecting binary bytes
    if (/[\u0000-\u0008\u000E-\u001F]/.test(text.slice(0, 2000))) {
      const e = new Error('Unrecognised file type — please drop a Xero report exported as Excel (.xlsx) or CSV')
      e.code = 'UNRECOGNISED_FILE'
      throw e
    }
    grids = [parseCsv(text)]
  }

  for (let g = 0; g < grids.length; g++) {
    const bs = extractBalanceSheet(grids[g])
    if (bs.recognised) { return bs }
    const pl = extractProfitLoss(grids[g])
    if (pl.recognised) { return pl }
  }
  const e = new Error('This does not look like a Xero Balance Sheet or Profit and Loss export — expected the report title in the first rows')
  e.code = 'UNRECOGNISED_REPORT'
  throw e
}

module.exports = { parseUpload, extractBalanceSheet, extractProfitLoss, XlsxReadError }
