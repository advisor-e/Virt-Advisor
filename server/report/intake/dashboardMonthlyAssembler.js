'use strict'

/**
 * Dashboard monthly assembler — the by-month exports dropped on step 2's "By month, this
 * year" group, joined into the two series the Business Performance Report's monthly view
 * reads (item 4.70, stage 5; the drawing is `design/mockups/business-performance-report-
 * intake.html`, step 2).
 *
 * Two series, kept apart because they answer different pages: the profit-and-loss months
 * (sales, cost of sales, other income, operating expenses — the quarterly charts on pages
 * 4 and 5, and the Sales Volatility page) and the bank months (the closing-bank line on
 * page 7). Up to two by-month Profit and Loss files are joined, because a mid-year export
 * gives fewer than twelve complete months and last year's fills the rest — the Volatility
 * Report's own two-file rule, with its own three join rules repeated here in its words:
 *
 *  - OVERLAP: the older file's figures are kept, because its year has closed and been
 *    reconciled, whereas the newer export restates the same month while it is still open.
 *  - A GAP: only the months after the gap are used. Measuring a quarter across a hole is
 *    the fault the rule exists to prevent.
 *  - INCOMPLETE months are NOT removed here. The pages model decides per chart: a quarter
 *    with an empty month in it is not drawn, and the volatility page takes the last twelve
 *    complete months. Removing them here would splice non-adjacent months together.
 *
 * Pure and side-effect free; the upload route parses the files and hands the results here.
 * Nothing identifying passes through: month labels and figures only. Node 14, CommonJS.
 */

const { ordinalLabel } = require('./monthlySeriesAssembler')

/** Most files one drop may carry: two by-month Profit and Loss files and one by-month Balance Sheet. */
const MAX_FILES = 3

/** The figures a profit-and-loss month carries into the report. */
const PL_MONTH_FIELDS = ['value', 'costOfSales', 'otherIncome', 'operatingExpenses']

/** @param {*} v @returns {number} */
function num (v) { return typeof v === 'number' && Number.isFinite(v) ? v : 0 }

/**
 * Join the by-month Profit and Loss files into one oldest-first run.
 * @param {Array<object>} files - parsed `profitLossByMonth` results
 * @param {string[]} warnings
 * @returns {Array<object>} months, each `{ label, ordinal, sales, costOfSales, otherIncome, operatingExpenses, complete, reason }`
 */
function joinProfitLoss (files, warnings) {
  const withMonths = files.filter(p => (p.months || []).length)
  const ordered = withMonths.slice().sort((a, b) => a.months[0].ordinal - b.months[0].ordinal)
  const byOrdinal = new Map()
  const overlap = []
  for (const p of ordered) {
    for (const m of p.months) {
      if (byOrdinal.has(m.ordinal)) { overlap.push(m.ordinal); continue }
      byOrdinal.set(m.ordinal, m)
    }
  }
  if (overlap.length) {
    const from = ordinalLabel(Math.min.apply(null, overlap))
    const to = ordinalLabel(Math.max.apply(null, overlap))
    warnings.push('The two by-month files overlap. Both cover ' + (from === to ? from : from + ' to ' + to) + '. The older file\'s figures were used for those months and the newer file\'s ignored. If that is the wrong way round, replace the older file.')
  }
  let series = Array.from(byOrdinal.values()).sort((a, b) => a.ordinal - b.ordinal).map(m => ({
    label: m.label,
    ordinal: m.ordinal,
    sales: num(m.value),
    costOfSales: num(m.costOfSales),
    otherIncome: num(m.otherIncome),
    operatingExpenses: num(m.operatingExpenses),
    complete: m.complete !== false,
    reason: m.reason || null
  }))
  let gapAt = -1
  for (let i = series.length - 1; i > 0; i--) {
    if (series[i].ordinal !== series[i - 1].ordinal + 1) { gapAt = i; break }
  }
  if (gapAt !== -1) {
    const missingCount = series[gapAt].ordinal - series[gapAt - 1].ordinal - 1
    const missingFrom = ordinalLabel(series[gapAt - 1].ordinal + 1)
    const missingTo = ordinalLabel(series[gapAt].ordinal - 1)
    warnings.push('The two by-month files do not meet. ' + missingCount + ' month' + (missingCount === 1 ? ' is' : 's are') + ' missing between them (' + (missingFrom === missingTo ? missingFrom : missingFrom + ' to ' + missingTo) + '), so only the months after the gap were used.')
    series = series.slice(gapAt)
  }
  return series
}

/**
 * The monthly view's two series from the parsed files.
 *
 * @param {Array<object>} parsed - `parseDashboardMonthlyUpload` results, in any order
 * @returns {{
 *   files: Array<{kind:string, companyName:(string|null), reportDate:(string|null), monthsRead:number, monthsComplete:number}>,
 *   companyName: (string|null),
 *   profitLoss: {reportDate:(string|null), months:Array<object>}|null,
 *   bank: {reportDate:(string|null), months:Array<{label:string, ordinal:number, bank:(number|null), complete:boolean, reason:(string|null)}>}|null,
 *   blocked: (string|null),
 *   warnings: string[]
 * }}
 */
function assembleDashboardMonthly (parsed) {
  const files = []
  const warnings = []
  const list = Array.isArray(parsed) ? parsed.filter(Boolean) : []
  const refuse = blocked => ({ files, companyName: null, profitLoss: null, bank: null, blocked, warnings })

  if (!list.length) { return refuse('No file was read.') }
  if (list.length > MAX_FILES) {
    return refuse('Please drop at most ' + MAX_FILES + ' by-month files together: this year\'s Profit and Loss by month, last year\'s if this year\'s stops mid-year, and the Balance Sheet by month.')
  }
  list.forEach((p) => {
    const months = p.months || []
    files.push({
      kind: p.kind,
      companyName: p.companyName || null,
      reportDate: p.reportDate || null,
      monthsRead: months.length,
      monthsComplete: months.filter(m => m.complete !== false).length
    })
    ;(p.warnings || []).forEach(w => warnings.push(w))
  })

  const profitLosses = list.filter(p => p.kind === 'profitLossByMonth')
  const balanceSheets = list.filter(p => p.kind === 'balanceSheetByMonth')
  const other = list.filter(p => p.kind !== 'profitLossByMonth' && p.kind !== 'balanceSheetByMonth')
  if (other.length) { return refuse('A file was not a by-month Profit and Loss or a by-month Balance Sheet. No figures were read.') }
  if (profitLosses.length > 2) { return refuse('More than two by-month Profit and Loss files were dropped together. Drop this year\'s and, if it stops mid-year, last year\'s.') }
  if (balanceSheets.length > 1) { return refuse('More than one by-month Balance Sheet was dropped. The bank line reads one, this year\'s.') }

  const names = new Set(files.map(f => f.companyName).filter(Boolean))
  if (names.size > 1) { warnings.push('The files name different organisations. Please check every export belongs to the same client before going on.') }

  const profitLoss = profitLosses.length
    ? {
        reportDate: profitLosses.map(p => p.reportDate).filter(Boolean).sort().pop() || null,
        months: joinProfitLoss(profitLosses, warnings)
      }
    : null
  const bank = balanceSheets.length
    ? {
        reportDate: balanceSheets[0].reportDate || null,
        months: (balanceSheets[0].months || []).map(m => ({
          label: m.label,
          ordinal: m.ordinal,
          bank: typeof m.bank === 'number' ? m.bank : null,
          complete: m.complete !== false,
          reason: m.reason || null
        }))
      }
    : null

  if (profitLoss) {
    const complete = profitLoss.months.filter(m => m.complete).length
    if (complete < 12) {
      warnings.push(complete + ' complete month' + (complete === 1 ? '' : 's') + ' of sales ' + (complete === 1 ? 'was' : 'were') + ' read. The Sales Volatility page needs twelve — drop last year\'s by-month Profit and Loss as well. Quarters with an empty month in them are not drawn.')
    }
  }

  return {
    files,
    companyName: files.map(f => f.companyName).find(Boolean) || null,
    profitLoss,
    bank,
    blocked: null,
    warnings
  }
}

module.exports = { MAX_FILES, PL_MONTH_FIELDS, assembleDashboardMonthly }
