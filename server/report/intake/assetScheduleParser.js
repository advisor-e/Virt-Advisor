'use strict'

/**
 * @file Reads a FIXED ASSET SCHEDULE — the report that says what each individual asset is
 *   carried at, which no other export in this app supplies.
 * @module server/report/intake/assetScheduleParser
 *
 * Item **4.65**, drawn as `design/mockups/three-way-forecast-asset-schedule.html` and approved
 * by Mike 2026-09-08 with all six of its questions ruled. Slice 1 of that build: the reader.
 *
 * 🔴 IT IS USED FOR ONE JOB ONLY — looking up ONE asset's book value when it is sold. It does
 * NOT seed the six fixed-asset categories, and the reason is in the drawing's §4, measured on
 * Mike's own exports: **neither real schedule ties to its own balance sheet.** Both balance
 * sheets say fixed assets are 145,300; MYOB's Asset Register totals 128,775.83 and
 * QuickBooks' Fixed Asset Listing 125,825 — and the two disagree with each other on identical
 * cost of 224,500, because MYOB depreciates some assets diminishing-value and QuickBooks
 * straight-line. An asset register is a sub-ledger and is reconciled periodically, so a gap is
 * the ordinary case. Had the schedule been allowed to seed the categories it would have
 * understated fixed assets by 16,524 and charged too little depreciation all year — and the
 * forecast would still have balanced.
 *
 * 🔴 WHY IT IS A SEPARATE MODULE FROM `xeroReportParser`. Every report that file reads is
 * LABEL + FIGURE — a name in one cell and its amount in another, which `rowShape` reduces each
 * row to. A schedule is a TABLE: a header row naming columns, then one row per asset. Reading
 * it needs a column map, not a row shape, and pushing that into `rowShape` would have taken a
 * function four other reports depend on and taught it a second job.
 *
 * ⚠ `guardFigureColumns` IS DELIBERATELY NOT APPLIED. That guard refuses a report with five or
 * more figure columns because such a file is a by-month or by-quarter export whose first
 * column is a fraction of the year. A schedule legitimately has five or more — QuickBooks'
 * has cost, prior, current and accumulated depreciation plus net book value — and applying the
 * guard here would refuse every real file this module exists to read.
 *
 * Node 14, CommonJS.
 */

const { gridsFromBuffer } = require('./xeroReportParser')

/**
 * The report titles the two packages actually print, plus the obvious siblings.
 *
 * MYOB writes "Asset Register Report"; QuickBooks writes "Fixed Asset Detail Report". Both
 * are matched, and so are the names their sheet tabs use ("Asset Register", "Fixed Asset
 * Listing"), because a single-sheet export often carries the tab name as its title.
 *
 * ⚠ It must NOT match a Balance Sheet. A QuickBooks balance sheet holds a "Fixed Assets"
 * SECTION, but `headerMeta`-style title detection only reads the first rows, where the title
 * is "Balance Sheet" — and this module is asked last in any case.
 */
const ASSET_SCHEDULE_TITLE =
  /asset\s*register|fixed\s*asset|asset\s*(?:schedule|listing|detail)|depreciation\s*schedule/i

/**
 * A totals row, which is not an asset.
 *
 * ⚠ `totals?` MATTERS. MYOB writes "TOTALS" and `xeroReportParser`'s own `/^total\b/i` does
 * not match it — the `\b` falls between "TOTAL" and "S", which are both word characters. Using
 * that regex here would have read the totals line as a twelfth asset carrying the whole
 * register's value, and the chooser would have offered "TOTALS" for sale at 128,775.83.
 */
const TOTALS_RE = /^totals?\b/i

/* ── column headers, as the two packages actually write them ───────────────────────── */

/** "Asset Description" (MYOB) · "Asset Name" (QuickBooks). Never "Asset Code" or "Asset Group". */
const NAME_RE = /asset\s*(?:description|name)|^(?:description|item|asset)$/i
/** "Asset Group" (MYOB) · "Asset Account" (QuickBooks). */
const GROUP_RE = /asset\s*(?:group|account|class|type)|^(?:group|category|class|account)$/i
/** "Asset Code" (MYOB). QuickBooks has none — the name is the identity. */
const CODE_RE = /asset\s*(?:code|no\.?|number|id)\b/i
/** "Purchase Date" (both). */
const DATE_RE = /purchase\s*date|date\s*(?:acquired|purchased)|^(?:acquired|date)$/i
/** "Cost ($)" (MYOB) · "Cost Basis" (QuickBooks). */
const COST_RE = /\bcost\b/i
/** "Closing Carrying Value" (MYOB) · "Net Book Value" (QuickBooks). */
const BOOK_VALUE_RE =
  /(?:closing\s*)?carrying\s*value|net\s*book\s*value|book\s*value|written[-\s]?down\s*value|adjusted\s*tax\s*value|closing\s*value/i
/** "Dep'n Rate" (MYOB only). The apostrophe may be straight or curly. */
const RATE_RE = /(?:dep(?:['’]?n|reciation)?)\s*rate|^rate$/i
/** "Dep'n Method" (MYOB only). */
const METHOD_RE = /(?:dep(?:['’]?n|reciation)?)\s*method|^method$/i

/** How many rows from the top may hold the header before we give up looking. */
const HEADER_SEARCH_ROWS = 14

/**
 * A cell read as a number, or null.
 *
 * Handles what the two packages emit: a real number, a percentage string ("10.00%"), a
 * thousands-separated string, and an accounting negative in brackets. A blank is null rather
 * than 0, because a fully written-down asset carrying a real 0 is a different fact from a
 * column that was never filled in.
 *
 * @param {*} v
 * @returns {number|null}
 */
function num (v) {
  if (typeof v === 'number') { return Number.isFinite(v) ? v : null }
  if (typeof v !== 'string') { return null }
  const t = v.trim()
  if (!t) { return null }
  const negative = /^\(.*\)$/.test(t)
  const cleaned = t.replace(/[()]/g, '').replace(/[,\s]/g, '').replace(/%$/, '').replace(/^\$/, '')
  if (!/^-?\d*\.?\d+$/.test(cleaned)) { return null }
  const n = parseFloat(cleaned)
  if (!Number.isFinite(n)) { return null }
  return negative ? -n : n
}

/** A cell read as trimmed text, or null. @param {*} v @returns {string|null} */
function text (v) {
  if (typeof v === 'number') { return String(v) }
  if (typeof v !== 'string') { return null }
  const t = v.trim()
  return t || null
}

/**
 * Find the header row and map the columns we need.
 *
 * A row qualifies only when it names BOTH an asset and a book value — the two columns without
 * which nothing downstream can work. Requiring both is what stops a title row or a stray
 * caption being taken as the header.
 *
 * @param {Array<Array<string|number|null>>} grid
 * @returns {{row: number, cols: object}|null}
 */
function findHeader (grid) {
  const limit = Math.min(grid.length, HEADER_SEARCH_ROWS)
  for (let r = 0; r < limit; r++) {
    const cells = grid[r] || []
    const cols = { name: -1, group: -1, code: -1, date: -1, cost: -1, bookValue: -1, rate: -1, method: -1 }
    for (let c = 0; c < cells.length; c++) {
      const h = text(cells[c])
      if (!h) { continue }
      // First match wins per column, so a later similar heading cannot displace it.
      if (cols.name === -1 && NAME_RE.test(h)) { cols.name = c; continue }
      if (cols.code === -1 && CODE_RE.test(h)) { cols.code = c; continue }
      if (cols.group === -1 && GROUP_RE.test(h)) { cols.group = c; continue }
      if (cols.date === -1 && DATE_RE.test(h)) { cols.date = c; continue }
      if (cols.rate === -1 && RATE_RE.test(h)) { cols.rate = c; continue }
      if (cols.method === -1 && METHOD_RE.test(h)) { cols.method = c; continue }
      // Book value BEFORE cost: "Cost Basis" contains neither, but a column called
      // "Cost" and one called "Net Book Value" must not both fall to /cost/i.
      if (cols.bookValue === -1 && BOOK_VALUE_RE.test(h)) { cols.bookValue = c; continue }
      if (cols.cost === -1 && COST_RE.test(h)) { cols.cost = c; continue }
    }
    if (cols.name !== -1 && cols.bookValue !== -1) { return { row: r, cols } }
  }
  return null
}

/**
 * The company and the report date, from the rows above the header.
 *
 * Deliberately simple and NOT `xeroReportParser.headerMeta`: that function reads a label-and-
 * figure shape and stops at the first date line, which is right for a Balance Sheet whose
 * header is three rows. Here the header block is whatever sits above the column row, and the
 * date line has no fixed wording — MYOB writes "Financial Year Ending December 31, 2025" and
 * QuickBooks "As of December 31, 2025".
 *
 * @param {Array<Array<string|number|null>>} grid
 * @param {number} headerRow
 * @returns {{companyName: (string|null), reportDate: (string|null)}}
 */
function scheduleMeta (grid, headerRow) {
  let companyName = null
  let reportDate = null
  for (let r = 0; r < headerRow; r++) {
    const cells = (grid[r] || []).filter(v => text(v) !== null)
    if (!cells.length) { continue }
    const label = text(cells[0])
    if (!label) { continue }
    if (ASSET_SCHEDULE_TITLE.test(label)) { continue }
    if (/^(?:as\s+(?:at|of)|for\s+the|financial\s+year|year\s+end)/i.test(label) || /\b(?:19|20)\d{2}\b/.test(label)) {
      if (reportDate === null) { reportDate = label }
      continue
    }
    if (companyName === null) { companyName = label }
  }
  return { companyName, reportDate }
}

/**
 * Extract one grid as a Fixed Asset Schedule.
 *
 * @param {Array<Array<string|number|null>>} grid
 * @returns {object} `{recognised:false}` or the schedule extract
 */
function extractAssetSchedule (grid) {
  if (!Array.isArray(grid) || !grid.length) { return { recognised: false } }

  // The title must appear somewhere above the header row. Without this a plain table of
  // anything with a "name" and a "value" column would be read as an asset register.
  let titled = false
  const scan = Math.min(grid.length, HEADER_SEARCH_ROWS)
  for (let r = 0; r < scan && !titled; r++) {
    const cells = grid[r] || []
    for (let c = 0; c < cells.length; c++) {
      const t = text(cells[c])
      if (t && ASSET_SCHEDULE_TITLE.test(t)) { titled = true; break }
    }
  }
  if (!titled) { return { recognised: false } }

  const header = findHeader(grid)
  if (!header) { return { recognised: false } }

  const { cols } = header
  const warnings = []
  const assets = []
  let statedTotalBookValue = null
  let statedTotalCost = null

  for (let r = header.row + 1; r < grid.length; r++) {
    const cells = grid[r] || []
    const name = text(cells[cols.name])
    const bookValue = num(cells[cols.bookValue])

    // The totals line: recognised, read for its own figures, and never an asset.
    if (name && TOTALS_RE.test(name)) {
      if (statedTotalBookValue === null) { statedTotalBookValue = bookValue }
      if (cols.cost !== -1 && statedTotalCost === null) { statedTotalCost = num(cells[cols.cost]) }
      continue
    }
    // A row with no name, or no book value, is not an asset. Blank separator rows and
    // sub-headings both land here and are skipped in silence — they are layout, not data.
    if (!name || bookValue === null) { continue }

    const cost = cols.cost === -1 ? null : num(cells[cols.cost])
    assets.push({
      name,
      code: cols.code === -1 ? null : text(cells[cols.code]),
      group: cols.group === -1 ? null : text(cells[cols.group]),
      purchaseDate: cols.date === -1 ? null : text(cells[cols.date]),
      cost,
      bookValue,
      // 🔴 DERIVED, NEVER READ FROM A COLUMN. MYOB gives "Opening Accum Dep" and a separate
      // "YTD Dep'n"; QuickBooks gives a single closing "Accumulated Depreciation". Reading
      // either package's column would give a different meaning under the same field name,
      // and taking MYOB's opening figure as the closing one understates it by a year.
      // Cost less book value is the closing accumulated depreciation by definition, in every
      // package, and it is null when either side is missing rather than guessed.
      accumulatedDepreciation: (cost === null || bookValue === null) ? null : round2(cost - bookValue),
      // Read and stored, used by nothing — question 4, ruled by Mike 2026-09-08. The engine
      // depreciates the CATEGORY pool at one rate, so a per-asset rate cannot be applied
      // without the disposal ceasing to reconcile with the pool it came out of. QuickBooks
      // supplies neither field, so using MYOB's would make one business forecast differently
      // depending on which package it happens to run.
      depreciationRate: cols.rate === -1 ? null : num(cells[cols.rate]),
      depreciationMethod: cols.method === -1 ? null : text(cells[cols.method])
    })
  }

  if (!assets.length) { return { recognised: false } }

  const totalBookValue = round2(assets.reduce((t, a) => t + a.bookValue, 0))
  const totalCost = assets.every(a => a.cost === null)
    ? null
    : round2(assets.reduce((t, a) => t + (a.cost || 0), 0))

  // The file's own totals line against what its rows add to.
  //
  // 🔴 IT EARNED ITS PLACE ON ITS FIRST REAL RUN (2026-09-08). Mike's QuickBooks export does
  // not tie to ITSELF: all eleven rows are internally consistent (cost less accumulated
  // depreciation equals net book value on every one) and the cost total is right, but the
  // totals line understates accumulated depreciation by 525, so the book value it prints —
  // 125,825 — is 525 more than its own rows add to (125,300).
  //
  // ⚠ THE ROWS WIN, and that is deliberate: the rows are the assets that can be offered for
  // sale, so a total nothing can be attributed to is the wrong figure to carry. The wording
  // below deliberately does NOT say rows were missed — that was the first draft and it blamed
  // this reader for a disagreement inside the file.
  if (statedTotalBookValue !== null && Math.abs(statedTotalBookValue - totalBookValue) > 0.05) {
    warnings.push('The schedule\'s own total (' + statedTotalBookValue.toFixed(2) +
      ') does not match what its ' + assets.length + ' asset rows add up to (' + totalBookValue.toFixed(2) +
      '). The rows have been used.')
  }

  const meta = scheduleMeta(grid, header.row)

  return {
    recognised: true,
    kind: 'assetSchedule',
    companyName: meta.companyName,
    reportDate: meta.reportDate,
    assets,
    totalCost,
    totalBookValue,
    statedTotalCost,
    statedTotalBookValue,
    warnings
  }
}

/** Money rounding, matching the engine's own two-decimal convention. @param {number} n @returns {number} */
function round2 (n) {
  return Math.round(n * 100) / 100
}

/**
 * Sniff an uploaded buffer for a Fixed Asset Schedule, on ANY sheet.
 *
 * ⚠ IT SCANS EVERY SHEET AND DOES NOT STOP AT THE FIRST RECOGNISED REPORT, unlike
 * `parseForecastUpload`. Both of the real exports are one workbook holding a Profit and Loss,
 * a Balance Sheet AND a schedule, in that order — so a first-recognised loop returns the P&L
 * and the schedule is never seen. The route calls this in addition to the annual sniff, so one
 * file can legitimately contribute both.
 *
 * @param {Buffer} buf - the uploaded file's bytes
 * @returns {object|null} the schedule extract, or null when the file holds none
 * @throws {Error} only what `gridsFromBuffer` throws — an unreadable or empty file
 */
function parseAssetScheduleUpload (buf) {
  const grids = gridsFromBuffer(buf)
  for (let g = 0; g < grids.length; g++) {
    const found = extractAssetSchedule(grids[g])
    if (found.recognised) { return found }
  }
  return null
}

/**
 * Compare a schedule against the fixed-asset total the Balance Sheet gave.
 *
 * 🔴 IT NEVER BLOCKS AND IT CHANGES NO FIGURE — Mike's ruling, question 3, 2026-09-08. Neither
 * of the two real exports ties (16,524 and 19,475 apart), so a difference is the ordinary
 * case: an asset register is a sub-ledger, reconciled periodically and commonly omitting
 * fully-written-down items. It is reported so that an advisor who DOES expect the two to
 * agree can find out, and for no other reason.
 *
 * @param {number|null} scheduleTotal - the schedule's total book value
 * @param {number|null} balanceSheetTotal - the six categories' openings, summed
 * @returns {{available: boolean, ties: boolean, scheduleTotal: number, balanceSheetTotal: number, difference: number}}
 */
function compareToBalanceSheet (scheduleTotal, balanceSheetTotal) {
  if (typeof scheduleTotal !== 'number' || typeof balanceSheetTotal !== 'number') {
    return { available: false, ties: false, scheduleTotal: 0, balanceSheetTotal: 0, difference: 0 }
  }
  const difference = round2(balanceSheetTotal - scheduleTotal)
  return {
    available: true,
    // One cent of slack, so a rounding difference is never reported as a discrepancy.
    ties: Math.abs(difference) <= 0.01,
    scheduleTotal: round2(scheduleTotal),
    balanceSheetTotal: round2(balanceSheetTotal),
    difference
  }
}

module.exports = {
  parseAssetScheduleUpload,
  extractAssetSchedule,
  compareToBalanceSheet,
  ASSET_SCHEDULE_TITLE
}
