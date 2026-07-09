'use strict'

/**
 * Debtor Business Drag model — core calculation engine (Scenario A vs B).
 *
 * Faithful port of `design/report-source-models/GE.4b.Debtor Business Drag Model.xlsx`
 * (the "Debtor Drag" headline metrics — sheets "Debtor Assumptions" + "Cash Movement
 * Figures", cells Z8/Z9/Z11 for Scenario A and Z52/Z53/Z55/Z14 for Scenario B). Validated:
 * reproduces the spreadsheet's drag figures exactly (see the golden test).
 *
 * Concept: of a year's sales, some cash is collected in-year, some is written off (lost), and
 * some is merely *delayed* into next year because customers pay slowly — that delayed cash is
 * the **Debtor Drag**. Comparing two collection profiles shows how much drag changes.
 *
 * Pure, side-effect free, backend-only per the Stack Constitution.
 *
 * Two entry points: `computeDebtorDrag` (headline drag + A/B compare) and
 * `computeDebtorCashflow` (the full month-by-month closing bank balance / overdraft view,
 * reproducing the "Cash Movement Figures" sheet).
 */

/** Sample 12-month sales shipped in the source model. */
const DEFAULT_MONTHLY_SALES = [100000, 137850, 207563, 215000, 232000, 347000, 356000, 432000, 318000, 323000, 365000, 324000]

/** Scenario A ("current") collection profile from the source model. */
const DEFAULT_SCENARIO_A = { sameMonth: 0.85, month1: 0.07, month2: 0.05, month3: 0, month4: 0, writeOff: 0.03 }

/** Scenario B ("alternative") collection profile from the source model. */
const DEFAULT_SCENARIO_B = { sameMonth: 0.72, month1: 0.15, month2: 0.10, month3: 0, month4: 0, writeOff: 0.03 }

const DEFAULT_INPUTS = {
  monthlySales: DEFAULT_MONTHLY_SALES.slice(),
  scenarioA: Object.assign({}, DEFAULT_SCENARIO_A),
  scenarioB: Object.assign({}, DEFAULT_SCENARIO_B)
}

/**
 * @typedef {Object} CollectionProfile
 * @property {number} sameMonth - fraction collected in the sale month
 * @property {number} month1 - fraction collected 1 month later
 * @property {number} month2 - 2 months later
 * @property {number} month3 - 3 months later
 * @property {number} month4 - 4 months later
 * @property {number} writeOff - fraction never collected
 */

/**
 * Compute one scenario's drag figures.
 * @param {number[]} monthlySales - 12 monthly sales figures (Jan..Dec).
 * @param {CollectionProfile} p - collection profile (fractions; ideally sum to 1).
 * @returns {{totalSales:number, fundsBanked:number, writeOff:number, grossCashDiff:number, debtorDrag:number}}
 */
function computeDebtorScenario (monthlySales, p) {
  const sales = monthlySales
  const n = sales.length
  const totalSales = sales.reduce(function (a, b) { return a + b }, 0)

  // In-year collected: sales from month (m - offset) collected in month m, counted only
  // while m stays within the 12-month window. Offset k's in-year base is sales[0 .. n-1-k].
  const offsets = [p.sameMonth, p.month1, p.month2, p.month3, p.month4]
  let fundsBanked = 0
  for (let k = 0; k < offsets.length; k++) {
    let base = 0
    for (let idx = 0; idx <= (n - 1 - k); idx++) { base += sales[idx] }
    fundsBanked += offsets[k] * base
  }

  const writeOff = p.writeOff * totalSales
  const grossCashDiff = totalSales - fundsBanked // uncollected in-year (delayed + written off)
  const debtorDrag = grossCashDiff - writeOff // cash merely delayed into next year

  return { totalSales, fundsBanked, writeOff, grossCashDiff, debtorDrag }
}

/**
 * Compute both scenarios and their drag difference.
 * @param {Partial<typeof DEFAULT_INPUTS>} [input]
 * @returns {{scenarioA:object, scenarioB:object, dragDifference:number, writeOff:number}}
 */
function computeDebtorDrag (input) {
  const i = Object.assign({}, DEFAULT_INPUTS, input || {})
  const sales = i.monthlySales || DEFAULT_MONTHLY_SALES
  const a = computeDebtorScenario(sales, Object.assign({}, DEFAULT_SCENARIO_A, i.scenarioA))
  const b = computeDebtorScenario(sales, Object.assign({}, DEFAULT_SCENARIO_B, i.scenarioB))
  return {
    scenarioA: a,
    scenarioB: b,
    dragDifference: b.debtorDrag - a.debtorDrag, // sheet Z14 = Z55 - Z11
    writeOff: a.writeOff
  }
}

/** Default supplier (creditor) payment profile: [same, +1, +2, +3, +4 months]. */
const DEFAULT_CREDITOR = [0.9, 0.1, 0, 0, 0]

/** Default debtor collection profile as an array: [same, +1, +2, +3, +4 months]. */
const DEFAULT_DEBTOR = [0.85, 0.07, 0.05, 0, 0]

const DEFAULT_CASHFLOW_INPUTS = {
  monthlySales: DEFAULT_MONTHLY_SALES.slice(),
  debtor: DEFAULT_DEBTOR.slice(), // [same,+1,+2,+3,+4] fractions collected
  creditor: DEFAULT_CREDITOR.slice(), // [same,+1,+2,+3,+4] fractions paid to suppliers
  markup: 0.47,
  netProfitPct: 0.13,
  gstRate: 0.15
}

/**
 * Full monthly cashflow → closing bank balance, faithful to the source model's
 * "Cash Movement Figures" sheet. Reproduces the month-end balances exactly (see golden test).
 *
 * Chain: material purchases lag sales by a month (sales[m-1] / (1+markup)); suppliers are paid
 * over the creditor profile; debtors are collected over the debtor profile; GST flows on both;
 * fixed costs are derived so the year nets to the target net-profit%. The running closing
 * balance is what dips into overdraft.
 *
 * @param {Partial<typeof DEFAULT_CASHFLOW_INPUTS>} [input]
 * @returns {{monthlyClosing:number[], monthlyBanked:number[], monthlyStockPaid:number[],
 *   fixedMonthly:number, deepestLow:{value:number,month:number}, monthsInOverdraft:number,
 *   yearEndBalance:number}}
 */
function computeDebtorCashflow (input) {
  const i = Object.assign({}, DEFAULT_CASHFLOW_INPUTS, input || {})
  const sales = i.monthlySales
  const d = i.debtor
  const c = i.creditor
  const n = sales.length
  const g = i.gstRate / (1 + i.gstRate)
  const total = sales.reduce(function (a, b) { return a + b }, 0)

  const purch = []
  for (let m = 0; m < n; m++) { purch[m] = m >= 1 ? sales[m - 1] / (1 + i.markup) : 0 }

  const stockPaid = []
  let totalStockPaid = 0
  for (let m = 0; m < n; m++) {
    let sp = 0
    for (let k = 0; k < 5; k++) { if (m - k >= 0) { sp += purch[m - k] * c[k] } }
    stockPaid[m] = sp
    totalStockPaid += sp
  }

  const fixedMonthly = (total - totalStockPaid - total * i.netProfitPct) / 12

  const monthlyBanked = []
  const monthlyClosing = []
  let bal = 0
  for (let m = 0; m < n; m++) {
    let banked = 0
    for (let k = 0; k < 5; k++) { if (m - k >= 0) { banked += sales[m - k] * d[k] } }
    monthlyBanked[m] = banked
    const deposits = banked + stockPaid[m] * g
    const withdrawals = sales[m] * g + fixedMonthly + stockPaid[m]
    bal += deposits - withdrawals
    monthlyClosing[m] = bal
  }

  let lowV = monthlyClosing[0]
  let lowM = 0
  let inOd = 0
  for (let m = 0; m < n; m++) {
    if (monthlyClosing[m] < lowV) { lowV = monthlyClosing[m]; lowM = m }
    if (monthlyClosing[m] < 0) { inOd++ }
  }

  return {
    monthlyClosing,
    monthlyBanked,
    monthlyStockPaid: stockPaid,
    fixedMonthly,
    deepestLow: { value: lowV, month: lowM },
    monthsInOverdraft: inOd,
    yearEndBalance: monthlyClosing[n - 1]
  }
}

module.exports = {
  computeDebtorScenario,
  computeDebtorDrag,
  computeDebtorCashflow,
  DEFAULT_INPUTS,
  DEFAULT_CASHFLOW_INPUTS,
  DEFAULT_MONTHLY_SALES,
  DEFAULT_SCENARIO_A,
  DEFAULT_SCENARIO_B,
  DEFAULT_DEBTOR,
  DEFAULT_CREDITOR
}
