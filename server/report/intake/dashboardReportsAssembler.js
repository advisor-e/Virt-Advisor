'use strict'

/**
 * Dashboard Reports intake assembler — the four annual exports (this year's and last
 * year's Balance Sheet and Profit and Loss) turned into the confirm table the Business
 * Performance Report is built from (item 4.70, stage 2; the drawing is
 * `design/mockups/business-performance-report-intake.html`, step 2).
 *
 * Pure and side-effect free: the upload route parses the files and hands the results
 * here, so every rule below is unit-testable without a file.
 *
 * 🔴 WHICH FILE IS THIS YEAR IS DECIDED BY THE REPORTS' OWN DATE LINES, never by upload
 * order — the same ruling the forecast intake follows, for the same reason: a report built
 * on last year's position is plausible in every figure and wrong in all of them. A pair
 * that cannot be dated apart is refused rather than guessed.
 *
 * THE LINES, and where each comes from. Balance sheet: bank, accounts receivable, stock,
 * other current assets, fixed assets, current liabilities (with accounts payable shown
 * inside it as a memo line, because creditor days need it), non-current liabilities.
 * Profit and loss: trading income, other income, cost of sales, wages, operating expenses
 * (EXCLUDING wages, depreciation and interest — the deck's definition), depreciation,
 * interest paid. Then one figure no export carries: net capital spend, pre-filled from the
 * movement in fixed assets plus depreciation and marked as the advisor's, because that is
 * what it is until they confirm it.
 *
 * Equity is not a line. It is what is left when liabilities are taken from assets, and the
 * page model derives it that way, so a balance sheet that ties in the accounting package
 * ties here too.
 *
 * Node 14, CommonJS.
 */

const { OVERHEAD_TESTS } = require('./threeWayForecastAssembler')

/** Most files one drop may carry: two Balance Sheets and two Profit and Loss reports. */
const MAX_FILES = 4

/** The balance-sheet lines, in table order. */
const BALANCE_SHEET_LINES = [
  'bank', 'accountsReceivable', 'stock', 'otherCurrentAssets', 'fixedAssets',
  'currentLiabilities', 'accountsPayable', 'nonCurrentLiabilities'
]

/** The profit-and-loss lines, in table order. */
const PROFIT_LOSS_LINES = [
  'tradingIncome', 'otherIncome', 'costOfSales', 'wages', 'operatingExpenses', 'depreciation', 'interestPaid'
]

/** The one line no export carries. */
const ENTERED_LINES = ['netCapitalSpend']

/** Every line, in table order. */
const LINES = BALANCE_SHEET_LINES.concat(PROFIT_LOSS_LINES, ENTERED_LINES)

/** Expense lines that are wages for this report — the forecast's own two tests, so the two never drift. */
const WAGES_TESTS = OVERHEAD_TESTS.filter(t => t.key === 'wages' || t.key === 'shareholderSalaries').map(t => t.re)

/** Expense lines that are depreciation or amortisation. */
const DEPRECIATION_RE = /depreciation|amortis/i

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

/**
 * The date a report's own date line ends on, as a sortable number, or null.
 * "As at 30 June 2026" and "For the year ended 30 June 2026" both end "30 June 2026".
 * @param {string|null} reportDate
 * @returns {number|null} year * 10000 + month * 100 + day
 */
function dateKey (reportDate) {
  const m = /(\d{1,2})\s+([A-Za-z]+)\s+((?:19|20)\d{2})\s*$/.exec(String(reportDate || '').trim())
  if (!m) { return null }
  const month = MONTHS.findIndex(name => name.startsWith(m[2].toLowerCase().slice(0, 3)))
  if (month === -1) { return null }
  return parseInt(m[3], 10) * 10000 + (month + 1) * 100 + parseInt(m[1], 10)
}

/**
 * Newest first by the reports' own dates, or null when two cannot be told apart.
 * @param {Array<object>} list
 * @returns {Array<object>|null}
 */
function newestFirst (list) {
  if (list.length < 2) { return list.slice() }
  const keyed = list.map(p => ({ p, key: dateKey(p.reportDate) }))
  if (keyed.some(k => k.key === null)) { return null }
  if (keyed[0].key === keyed[1].key) { return null }
  return keyed.sort((a, b) => b.key - a.key).map(k => k.p)
}

/** @param {object} figures @param {string} key @returns {number} the figure's value, or 0 when absent */
function valueOf (figures, key) {
  const f = figures && figures[key]
  return f && typeof f.value === 'number' && isFinite(f.value) ? f.value : 0
}

/** @param {object} figures @param {string[]} keys @returns {boolean} whether any of the keys was read */
function anyPresent (figures, keys) {
  return keys.some(k => figures && figures[k])
}

/** A file-sourced line. @param {number} value */
function fromFile (value) { return { value, source: 'file' } }

/**
 * The balance-sheet lines from one parsed forecast Balance Sheet. A line is present only
 * when the file carried something for it; an absent line is the advisor's to type.
 * @param {object} bs - an `extractForecastBalanceSheet` result
 * @returns {Object<string, {value:number, source:string}>}
 */
function balanceSheetLines (bs) {
  const f = bs.figures || {}
  const out = Object.create(null)
  if (f.cashAtBank) { out.bank = fromFile(valueOf(f, 'cashAtBank')) }
  if (f.accountsReceivable) { out.accountsReceivable = fromFile(valueOf(f, 'accountsReceivable')) }
  if (f.inventory) { out.stock = fromFile(valueOf(f, 'inventory')) }

  const otherCurrentKeys = ['prepayments', 'gstRefund', 'incomeTaxRefundDue', 'stockInTransitDeposits', 'otherCurrentAsset']
  let otherCurrent = otherCurrentKeys.reduce((t, k) => t + valueOf(f, k), 0)
  let otherCurrentPresent = anyPresent(f, otherCurrentKeys)

  const assets = bs.assets || {}
  const assetKeys = Object.keys(assets)
  if (assetKeys.length) { out.fixedAssets = fromFile(assetKeys.reduce((t, k) => t + valueOf(assets, k), 0)) }

  // Loans and shareholder accounts are positional in the parser; their sides say which
  // line each belongs to. A shareholder's overdrawn current account is a current asset.
  const loans = bs.loanBalances || []
  const loanTerms = bs.loanTerms || []
  let currentLoans = 0
  let nonCurrentLoans = 0
  let loansPresent = false
  loans.forEach((v, i) => {
    if (typeof v !== 'number') { return }
    loansPresent = true
    if (loanTerms[i] === 'nonCurrent') { nonCurrentLoans += v } else { currentLoans += v }
  })
  const shareholders = bs.shareholderBalances || []
  const sides = bs.shareholderSides || []
  let currentShareholder = 0
  let nonCurrentShareholder = 0
  let shareholderLiabilityPresent = false
  shareholders.forEach((v, i) => {
    if (typeof v !== 'number') { return }
    if (sides[i] === 'asset') { otherCurrent += v; otherCurrentPresent = true; return }
    if (sides[i] === 'equity') { return }
    shareholderLiabilityPresent = true
    if (sides[i] === 'nonCurrentLiability') { nonCurrentShareholder += v } else { currentShareholder += v }
  })
  if (otherCurrentPresent) { out.otherCurrentAssets = fromFile(otherCurrent) }

  const currentLiabKeys = ['bankOverdraft', 'accountsPayable', 'accruedExpenses', 'gstPayable', 'incomeTaxPayable', 'otherCurrentLiability']
  if (anyPresent(f, currentLiabKeys) || loansPresent || shareholderLiabilityPresent) {
    out.currentLiabilities = fromFile(currentLiabKeys.reduce((t, k) => t + valueOf(f, k), 0) + currentLoans + currentShareholder)
  }
  if (f.accountsPayable) { out.accountsPayable = fromFile(valueOf(f, 'accountsPayable')) }
  if (f.otherNonCurrentLiability || nonCurrentLoans || nonCurrentShareholder) {
    out.nonCurrentLiabilities = fromFile(valueOf(f, 'otherNonCurrentLiability') + nonCurrentLoans + nonCurrentShareholder)
  }
  return out
}

/**
 * The profit-and-loss lines from one parsed Profit and Loss.
 * @param {object} pl - an `extractProfitLoss` result
 * @returns {Object<string, {value:number, source:string}>}
 */
function profitLossLines (pl) {
  const f = pl.plFigures || {}
  const out = Object.create(null)
  if (f.sales) { out.tradingIncome = fromFile(valueOf(f, 'sales')) }
  const otherKeys = ['otherIncome', 'interestReceived', 'dividendsReceived', 'badDebtsRecovered']
  if (anyPresent(f, otherKeys)) { out.otherIncome = fromFile(otherKeys.reduce((t, k) => t + valueOf(f, k), 0)) }
  if (f.costOfSales) { out.costOfSales = fromFile(valueOf(f, 'costOfSales')) }

  const lines = Array.isArray(pl.expenseLines) ? pl.expenseLines : []
  let wages = 0
  let depreciation = 0
  lines.forEach((line) => {
    if (!line || typeof line.amount !== 'number' || !line.name) { return }
    if (WAGES_TESTS.some(re => re.test(line.name))) { wages += line.amount } else if (DEPRECIATION_RE.test(line.name)) { depreciation += line.amount }
  })
  const interest = valueOf(f, 'loanInterestPaid')
  if (f.operatingExpenses) {
    // The file's expense total carries everything; the table shows wages, depreciation and
    // interest on their own lines, so this line is what is left once they are taken out.
    out.operatingExpenses = fromFile(valueOf(f, 'operatingExpenses') - wages - depreciation - interest)
    out.wages = fromFile(wages)
    out.depreciation = fromFile(depreciation)
    out.interestPaid = fromFile(interest)
  }
  return out
}

/**
 * The confirm table from the parsed files.
 *
 * @param {Array<object>} parsed - `parseForecastUpload` results, in any order
 * @returns {{
 *   files: Array<{kind:string, companyName:(string|null), reportDate:(string|null)}>,
 *   companyName: (string|null),
 *   current: {balanceSheetDate:(string|null), profitLossDate:(string|null), figures:object}|null,
 *   prior: {balanceSheetDate:(string|null), profitLossDate:(string|null), figures:object}|null,
 *   blocked: (string|null),
 *   warnings: string[]
 * }}
 */
function assembleDashboardIntake (parsed) {
  const files = []
  const warnings = []
  const list = Array.isArray(parsed) ? parsed.filter(Boolean) : []
  const refuse = blocked => ({ files, companyName: null, current: null, prior: null, blocked, warnings })

  if (!list.length) { return refuse('No file was read.') }
  if (list.length > MAX_FILES) {
    return refuse('Please drop at most ' + MAX_FILES + ' files together: this year\'s and last year\'s Balance Sheet and Profit and Loss.')
  }
  list.forEach((p) => {
    files.push({ kind: p.kind, companyName: p.companyName || null, reportDate: p.reportDate || null })
    ;(p.warnings || []).forEach(w => warnings.push(w))
  })

  const balanceSheets = list.filter(p => p.kind === 'forecastBalanceSheet')
  const profitLosses = list.filter(p => p.kind === 'profitLoss')
  if (balanceSheets.length > 2) { return refuse('More than two Balance Sheets were dropped together. The report compares this year with last year — please drop at most two.') }
  if (profitLosses.length > 2) { return refuse('More than two Profit and Loss reports were dropped together. The report compares this year with last year — please drop at most two.') }

  const bsSorted = newestFirst(balanceSheets)
  const plSorted = newestFirst(profitLosses)
  if (bsSorted === null) { return refuse('Two Balance Sheets were dropped but their dates could not be told apart, so it is not clear which is this year\'s. Please check the reports carry their "As at" line.') }
  if (plSorted === null) { return refuse('Two Profit and Loss reports were dropped but their dates could not be told apart. Please check the reports carry their period line.') }

  const names = new Set(files.map(f => f.companyName).filter(Boolean))
  if (names.size > 1) { warnings.push('The files name different organisations. Please check every export belongs to the same client before going on.') }

  const yearFrom = (bs, pl) => {
    if (!bs && !pl) { return null }
    const figures = Object.assign(Object.create(null), bs ? balanceSheetLines(bs) : {}, pl ? profitLossLines(pl) : {})
    return { balanceSheetDate: bs ? bs.reportDate || null : null, profitLossDate: pl ? pl.reportDate || null : null, figures }
  }
  const current = yearFrom(bsSorted[0] || null, plSorted[0] || null)
  const prior = yearFrom(bsSorted[1] || null, plSorted[1] || null)

  // A Balance Sheet and a Profit and Loss for the same year should end on the same day.
  const sameYear = (year, label) => {
    if (!year || !year.balanceSheetDate || !year.profitLossDate) { return }
    const a = dateKey(year.balanceSheetDate)
    const b = dateKey(year.profitLossDate)
    if (a !== null && b !== null && a !== b) {
      warnings.push(label + ' Balance Sheet is dated ' + year.balanceSheetDate + ' but the Profit and Loss ends ' + year.profitLossDate + ' — please check they cover the same year.')
    }
  }
  sameYear(current, 'This year\'s')
  sameYear(prior, 'Last year\'s')

  // Net capital spend: fixed assets moved by this much over the year, and depreciation
  // reduced them by this much on the way — so what was bought is the sum. Offered as the
  // advisor's figure to confirm, never as a fact read from a file.
  if (current && prior && current.figures.fixedAssets && prior.figures.fixedAssets && current.figures.depreciation) {
    const movement = current.figures.fixedAssets.value - prior.figures.fixedAssets.value
    current.figures.netCapitalSpend = { value: movement + current.figures.depreciation.value, source: 'entered' }
    warnings.push('Net capital spend is not on either report. It has been pre-filled as the movement in fixed assets plus depreciation — please confirm it.')
  }
  if (current && !prior) {
    warnings.push('Only this year\'s reports were read, so the report shows this year alone with no "vs last year" and no cash drivers. Drop last year\'s Balance Sheet and Profit and Loss to add them.')
  }

  return {
    files,
    companyName: files.map(f => f.companyName).find(Boolean) || null,
    current,
    prior,
    blocked: null,
    warnings
  }
}

module.exports = {
  MAX_FILES,
  LINES,
  BALANCE_SHEET_LINES,
  PROFIT_LOSS_LINES,
  ENTERED_LINES,
  dateKey,
  assembleDashboardIntake
}
