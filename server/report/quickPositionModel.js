'use strict'

/**
 * Quick Position model — calculation engine (the first Report-class model).
 *
 * Faithful port of `CM. Quick Position..xlsx` ("Lockdown Diagnosis" + "Expenses Review"),
 * validated against 32 golden cells (see the test). Two owner rulings shape it
 * (2026-07-16, plan decision log):
 *   - The NZ COVID wage-subsidy block does NOT port (incl. its two dependent cells,
 *     Subsidy Min and Sales Required After Subsidy Period).
 *   - No-stock service businesses ADAPT: `serviceBusiness: true` removes the stock line
 *     from the model entirely (excluded from the sum, `null` in the output — never a
 *     misleading zero tile).
 *
 * Where the source sheet would emit a division-by-zero, this engine returns `null`
 * (unlimited runway / no break-even), never a fabricated 0 — per the honesty defaults.
 *
 * Pure, side-effect free, backend-only per the Stack Constitution.
 */

/**
 * Coerce to a finite number; accepts JSON-string numbers ("2"); junk or absent
 * falls back to the supplied default (the source sheet's sample figure).
 * @param {*} v @param {number} def @returns {number}
 */
function pick (v, def) {
  if (typeof v === 'number') { return Number.isFinite(v) ? v : def }
  if (v === null || v === undefined || v === '') { return def }
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : def
}

/**
 * The source workbook's own sample figures — the defaults every input merges over,
 * and the fixture the golden tests run against.
 */
const DEFAULTS = {
  // Realisable assets (amount + realisability factor, sheet column F "Adjusted")
  cash: 296155,
  cashFactor: 1,
  debtors: 154906,
  debtorsFactor: 0.8,
  stock: 25847,
  stockFactor: 0,
  fixedAssets: 30000, // disposable (under-utilised), sellable in 30-45 days
  fixedAssetsFactor: 1,
  // Immediate liabilities (entered positive; the engine subtracts)
  creditors: 63000,
  creditorsFactor: 1,
  wagesDue: 32000, // salaries, wages and PAYE due
  wagesDueFactor: 1,
  // Monthly outgoings (the sheet carries a factor column here too — kept, default 1)
  monthlyFixedCosts: 20000,
  monthlyFixedCostsFactor: 1,
  monthlyDrawings: 0, // drawings + wages top-up
  monthlyDrawingsFactor: 1,
  monthlyLoanRepayments: 0,
  monthlyLoanRepaymentsFactor: 1,
  // Available "life-line" capital (outside the business)
  personalSavings: 38000,
  quickInvestments: 12000,
  raisedCapital: 0,
  securedLoans: 0,
  // Margin & discounting
  grossMarginPct: 0.23, // as a fraction
  discountPct: 0.05, // as a fraction
  exampleRevenue: 195000, // the sheet's worked example (rows 37-41)
  // Owner ruling 2026-07-16: true removes the stock line from the model entirely
  serviceBusiness: false
}

/**
 * Compute the Quick Position from partial inputs merged over the source-sheet defaults.
 *
 * @param {object} inputs - any subset of the DEFAULTS keys above.
 * @returns {object} {
 *   adjusted: { cash, debtors, stock|null, fixedAssets, creditors, wagesDue }, // creditors/wagesDue negative (sheet G11/G12)
 *   quickCashAvailable,                     // G15
 *   totalMonthlyOutgoings,                  // G21
 *   expenseCyclesZeroSales,                 // G23 — months; null when outgoings are 0
 *   lifelineCapital,                        // T19
 *   tradingCyclesWithLifeline,              // G24 — months; null when outgoings are 0
 *   breakEvenSalesRequired,                 // G26 — per month; null when margin <= 0
 *   newGrossMarginPct,                      // E33 — margin after the discount; null when discount >= 1
 *   salesIncreaseToMaintainGM,              // E34 — fraction; null when the discount >= the margin
 *   discountExample: {                      // the sheet's worked example, rows 37-41
 *     revenue, grossMarginPct, grossMargin, monthlySurplus,          // E37, F37, G37, H37
 *     discountAmount, discountPct, revenueAfterDiscount,             // E38, F38, E39
 *     revenueIncreaseNeeded, increasePct, revenueNeeded,             // E40, F40, E41
 *     newGrossMarginPct, newGrossMargin, newMonthlySurplus           // F41, G41, H41
 *   } | null,                               // null when the increase itself is undefined
 *   stockExcluded                           // true when serviceBusiness removed the stock line
 * }
 */
function computeQuickPosition (inputs) {
  const i = (inputs && typeof inputs === 'object') ? inputs : {}
  const g = function (key) { return pick(i[key], DEFAULTS[key]) }
  const serviceBusiness = i.serviceBusiness === true || i.serviceBusiness === 'true'

  const adjusted = {
    cash: g('cash') * g('cashFactor'),
    debtors: g('debtors') * g('debtorsFactor'),
    stock: serviceBusiness ? null : g('stock') * g('stockFactor'),
    fixedAssets: g('fixedAssets') * g('fixedAssetsFactor'),
    creditors: -(g('creditors') * g('creditorsFactor')),
    wagesDue: -(g('wagesDue') * g('wagesDueFactor'))
  }

  const quickCashAvailable = adjusted.cash + adjusted.debtors + (serviceBusiness ? 0 : adjusted.stock) +
    adjusted.fixedAssets + adjusted.creditors + adjusted.wagesDue

  const totalMonthlyOutgoings =
    g('monthlyFixedCosts') * g('monthlyFixedCostsFactor') +
    g('monthlyDrawings') * g('monthlyDrawingsFactor') +
    g('monthlyLoanRepayments') * g('monthlyLoanRepaymentsFactor')

  const lifelineCapital = g('personalSavings') + g('quickInvestments') + g('raisedCapital') + g('securedLoans')

  const expenseCyclesZeroSales = totalMonthlyOutgoings > 0 ? quickCashAvailable / totalMonthlyOutgoings : null
  const tradingCyclesWithLifeline = totalMonthlyOutgoings > 0 ? (quickCashAvailable + lifelineCapital) / totalMonthlyOutgoings : null

  const gm = g('grossMarginPct')
  const disc = g('discountPct')
  const breakEvenSalesRequired = gm > 0 ? totalMonthlyOutgoings / gm : null
  const newGrossMarginPct = disc < 1 ? 1 - (1 - gm) / (1 - disc) : null
  const salesIncreaseToMaintainGM = gm > disc ? gm / (gm - disc) - 1 : null

  let discountExample = null
  if (salesIncreaseToMaintainGM !== null && newGrossMarginPct !== null) {
    const revenue = g('exampleRevenue')
    const grossMargin = revenue * gm
    const discountAmount = revenue * disc
    const revenueAfterDiscount = revenue - discountAmount
    const revenueIncreaseNeeded = revenueAfterDiscount * salesIncreaseToMaintainGM
    const revenueNeeded = revenueIncreaseNeeded + revenueAfterDiscount
    const newGrossMargin = revenueNeeded * newGrossMarginPct
    discountExample = {
      revenue,
      grossMarginPct: gm,
      grossMargin,
      monthlySurplus: grossMargin - totalMonthlyOutgoings, // sheet H37 "Mthly Outgoings Shortfall / Surplus"
      discountAmount,
      discountPct: revenue > 0 ? discountAmount / revenue : 0,
      revenueAfterDiscount,
      revenueIncreaseNeeded,
      increasePct: revenueAfterDiscount > 0 ? revenueIncreaseNeeded / revenueAfterDiscount : 0,
      revenueNeeded,
      newGrossMarginPct,
      newGrossMargin,
      newMonthlySurplus: newGrossMargin - totalMonthlyOutgoings
    }
  }

  return {
    adjusted,
    quickCashAvailable,
    totalMonthlyOutgoings,
    expenseCyclesZeroSales,
    lifelineCapital,
    tradingCyclesWithLifeline,
    breakEvenSalesRequired,
    newGrossMarginPct,
    salesIncreaseToMaintainGM,
    discountExample,
    stockExcluded: serviceBusiness
  }
}

/**
 * Expenses Review (the workbook's second sheet): current yearly cost x % maintained
 * per line -> revised yearly total -> average monthly operating expenses.
 * Seeds the report screen's "monthly fixed costs" — the advisor confirms it.
 *
 * @param {Array<{amount:number, maintainedPct:number}>} lines - one per expense row.
 * @param {number} operatingMonths - business operating months (sheet D59, default 12).
 * @returns {{totalCurrent:number, totalRevised:number, averageMonthly:number|null}}
 *   averageMonthly is null when operatingMonths is 0 — never a fabricated figure.
 */
function computeExpensesReview (lines, operatingMonths) {
  const rows = Array.isArray(lines) ? lines : []
  let totalCurrent = 0
  let totalRevised = 0
  for (let r = 0; r < rows.length; r++) {
    const amount = pick(rows[r] && rows[r].amount, 0)
    const maintained = pick(rows[r] && rows[r].maintainedPct, 1)
    totalCurrent += amount
    totalRevised += amount * maintained
  }
  const months = pick(operatingMonths, 12)
  return {
    totalCurrent,
    totalRevised,
    averageMonthly: months > 0 ? totalRevised / months : null
  }
}

module.exports = { computeQuickPosition, computeExpensesReview, DEFAULTS }
