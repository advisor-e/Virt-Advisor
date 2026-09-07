'use strict'

/**
 * @file "Where the cash went" — the Business Performance Report's optional page that
 *   joins this year's profit to the movement in the bank (item 4.70; page 12 of
 *   `design/mockups/business-performance-report-optional-pages.html`).
 * @module server/report/cashBridgeModel
 *
 * THE OWNER'S QUESTION: "I made a profit, so where is the cash?" Two balance sheets and
 * one Profit and Loss answer it in full, and the bridge closes EXACTLY because it is the
 * balance-sheet identity rearranged:
 *
 *   bank = equity + liabilities − (debtors + stock + other current assets + fixed assets)
 *
 * Take the change of each side over the year, write the change in equity as profit less
 * what the owners took out, and the change in fixed assets as capital spend less
 * depreciation, and the steps below fall out. Nothing is estimated, so a bridge that does
 * not close to the bank movement is a bug, and the model says so rather than printing it.
 *
 * TWO FIGURES ARE RESIDUALS, AND THE PAGE SAYS SO:
 *   - capital spend = the rise in fixed assets + depreciation (spend net of disposals).
 *     The cash page's "net capital spend" is the ADVISOR'S typed figure; where the two
 *     differ, `enteredCapitalSpend` carries the typed one so the page can name the gap
 *     rather than print two numbers that disagree.
 *   - drawings = profit − the change in equity. The Profit and Loss is pre-tax, so tax
 *     paid sits in here with drawings, dividends and any capital put in or taken out; a
 *     positive residual is capital introduced, and the page labels it that way.
 *
 * Pure, side-effect free, backend-only per the Stack Constitution.
 */

const { yearOf } = require('./profitBridgeModel')

/** Coerce to a finite number, or null. @param {*} v @returns {number|null} */
function num (v) {
  if (v === null || v === undefined || v === '') { return null }
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : null
}

/** The balance-sheet lines a year must carry for the bridge to close. */
const NEEDS = ['bank', 'accountsReceivable', 'stock', 'otherCurrentAssets', 'fixedAssets', 'currentLiabilities', 'accountsPayable', 'nonCurrentLiabilities']

/** The first balance-sheet line missing from either year, or null. */
function firstMissing (cur, pri) {
  for (let i = 0; i < NEEDS.length; i++) {
    if (num(cur[NEEDS[i]]) === null || num(pri[NEEDS[i]]) === null) { return NEEDS[i] }
  }
  return null
}

/** Equity as the balance-sheet page defines it: assets less liabilities. */
function equityOf (y) {
  const z = k => num(y[k]) || 0
  return (z('bank') + z('accountsReceivable') + z('stock') + z('otherCurrentAssets') + z('fixedAssets')) - (z('currentLiabilities') + z('nonCurrentLiabilities'))
}

/**
 * From this year's profit to the movement in the bank.
 *
 * @param {object} input
 * @param {object} input.current - this year's sixteen lines, numbers (`netCapitalSpend`
 *   optional — the advisor's typed figure, reported beside the derived one).
 * @param {object|null} input.prior - last year's lines, or null.
 * @returns {object} {
 *   available, blocked, missing,
 *   steps: Array<{key, value}>,     // profit, depreciation, debtors, stock, otherCurrentAssets,
 *                                   // creditors, otherCurrentLiabilities, capitalSpend, borrowing, owners
 *   cashFromTrading, capitalSpend, enteredCapitalSpend, borrowing, owners,
 *   bankPrior, bankCurrent, bankMovement, workingCapitalAbsorbed
 * }
 */
function computeCashBridge (input) {
  const opts = input || {}
  const empty = { available: false, blocked: null, missing: null, steps: [], cashFromTrading: null, capitalSpend: null, enteredCapitalSpend: null, borrowing: null, owners: null, bankPrior: null, bankCurrent: null, bankMovement: null, workingCapitalAbsorbed: null }
  if (!opts.current || !opts.prior) { return Object.assign({}, empty, { blocked: 'NO_PRIOR_YEAR' }) }
  const cur = opts.current
  const pri = opts.prior
  const missing = firstMissing(cur, pri)
  if (missing) { return Object.assign({}, empty, { blocked: 'MISSING_LINE', missing }) }
  const pl = yearOf(cur)
  if (pl.netProfit === null) { return Object.assign({}, empty, { blocked: 'NO_REVENUE' }) }

  const d = k => (num(cur[k]) || 0) - (num(pri[k]) || 0)
  const depreciation = num(cur.depreciation) || 0
  const debtors = -d('accountsReceivable')
  const stock = -d('stock')
  const otherCurrentAssets = -d('otherCurrentAssets')
  const creditors = d('accountsPayable')
  const otherCurrentLiabilities = d('currentLiabilities') - d('accountsPayable')
  const cashFromTrading = pl.netProfit + depreciation + debtors + stock + otherCurrentAssets + creditors + otherCurrentLiabilities
  const capitalSpend = d('fixedAssets') + depreciation
  const borrowing = d('nonCurrentLiabilities')
  const owners = (equityOf(cur) - equityOf(pri)) - pl.netProfit
  const bankMovement = d('bank')

  const steps = [
    { key: 'profit', value: pl.netProfit },
    { key: 'depreciation', value: depreciation },
    { key: 'debtors', value: debtors },
    { key: 'stock', value: stock },
    { key: 'otherCurrentAssets', value: otherCurrentAssets },
    { key: 'creditors', value: creditors },
    { key: 'otherCurrentLiabilities', value: otherCurrentLiabilities },
    { key: 'capitalSpend', value: -capitalSpend },
    { key: 'borrowing', value: borrowing },
    { key: 'owners', value: owners }
  ]
  const closes = Math.abs(steps.reduce((t, s) => t + s.value, 0) - bankMovement) < 0.5
  if (!closes) { return Object.assign({}, empty, { blocked: 'DOES_NOT_RECONCILE' }) }

  const entered = num(cur.netCapitalSpend)
  return {
    available: true,
    blocked: null,
    missing: null,
    steps,
    cashFromTrading,
    capitalSpend,
    enteredCapitalSpend: entered !== null && Math.abs(entered - capitalSpend) > 0.5 ? entered : null,
    borrowing,
    owners,
    bankPrior: num(pri.bank),
    bankCurrent: num(cur.bank),
    bankMovement,
    workingCapitalAbsorbed: -(debtors + stock + otherCurrentAssets + creditors + otherCurrentLiabilities)
  }
}

module.exports = { computeCashBridge, equityOf, NEEDS }
