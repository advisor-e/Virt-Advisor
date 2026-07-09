'use strict'

/**
 * Working Capital Cycle model — pure calculation engine.
 *
 * Faithful port of `design/report-source-models/GE.3c.Working Capital Cycle model.xlsx`
 * (sheet "Cycle Model"). Validated: reproduces all 28 calculated cells of the source
 * spreadsheet exactly (see tests/unit/workingCapitalCycleModel.test.js — the golden set).
 *
 * Pure and side-effect free. No I/O, no DB, no AI — business logic only, backend-only per
 * the Stack Constitution. The Restify route + Nuxt screen consume this.
 *
 * The `cell` tag on each output is the source-spreadsheet cell it reproduces, kept for audit.
 */

/**
 * Default scenario — the sample values shipped in the source model. Used by the UI as the
 * starting point and by the golden test.
 * @type {WccInputs}
 */
const DEFAULT_INPUTS = {
  initialInvestment: 200, // E3
  plantEquipmentPct: 0.4, // E5  (fraction of investment spent on plant & equipment)
  unitCost: 1, // V7
  markupPct: 1.5, // V11 (fraction, 1.5 = 150%)
  discountPct: 0.15, // V13 (fraction)
  fullPricePct: 1, // V19 (fraction of units sold at full price)
  daysDeliverable: 4, // Q20
  daysOnHand: 6, // Q23
  daysReceivable: 35, // D22
  daysPayable: 15, // Q13
  fixedCostsMonthly: 180, // D17
  priorScenarioAnnualRevenue: 2543 // V35
}

/**
 * @typedef {Object} WccInputs
 * @property {number} initialInvestment
 * @property {number} plantEquipmentPct
 * @property {number} unitCost
 * @property {number} markupPct
 * @property {number} discountPct
 * @property {number} fullPricePct
 * @property {number} daysDeliverable
 * @property {number} daysOnHand
 * @property {number} daysReceivable
 * @property {number} daysPayable
 * @property {number} fixedCostsMonthly
 * @property {number} priorScenarioAnnualRevenue
 */

/**
 * Compute the Working Capital Cycle model.
 * @param {Partial<WccInputs>} [input] - overrides merged over DEFAULT_INPUTS.
 * @returns {Object} named outputs (see below); each corresponds to a source-sheet cell.
 */
function computeWorkingCapitalCycle (input) {
  const i = Object.assign({}, DEFAULT_INPUTS, input || {})

  const E3 = i.initialInvestment
  const E5 = i.plantEquipmentPct
  const V7 = i.unitCost
  const V11 = i.markupPct
  const V13 = i.discountPct
  const V19 = i.fullPricePct
  const Q20 = i.daysDeliverable
  const Q23 = i.daysOnHand
  const D22 = i.daysReceivable
  const Q13 = i.daysPayable
  const D17 = i.fixedCostsMonthly
  const V35 = i.priorScenarioAnnualRevenue

  const D12 = E3 * E5 // setup spend
  const K9 = E3 - D12 // working capital (cash)
  const V9 = (V7 * V11) + V7 // full sale price
  const V12 = V9 - V7 // gross sales margin ($)
  const Q15 = V7 ? K9 / V7 : 0 // total units
  const V15 = V9 - (V9 * V13) // discounted price
  const Q17 = Q15 * V7 // total units cost
  const V23 = (Q20 + Q23 + D22) - Q13 // working-capital cycle (days)
  const V25 = V23 <= 0 ? 30 : 30 / V23 // cycle factor (turns per month)
  const V27 = V25 * 12 // cycle factor per annum
  const L29 = Q15 * V19 // units sold at full price
  const N29 = L29 * V9 // full-price revenue
  const L31 = Q15 - L29 // units sold at discount
  const N31 = L31 * V15 // reduced-price revenue
  const L33 = L29 + L31 // total batch units
  const N33 = N29 + N31 // total batch revenue
  const N35 = N33 - Q17 // batch gross profit
  const V29 = V23 > 30 ? N33 * V25 : (N29 + N31) * V25 // monthly cash sales
  const V31 = V29 - (Q17 * V25) // monthly cash gross profit
  const V33 = V29 * 12 // annual revenue
  const V36 = V33 - V35 // difference vs prior scenario ($)
  const V37 = V35 ? V36 / V35 : 0 // difference vs prior scenario (%)
  const D25 = V31 - D17 // net profit before tax (monthly)
  const D20 = V29 ? (V29 - Q15 * V7) / V29 : 0 // contribution margin %
  const N9 = D25 // cash reserve required
  const J3 = D25 < 0 ? 'Cashflow Negative' : 'Cashflow Positive'
  const Q3 = D25 > 1 ? D25 : 0
  const Q5 = D25 >= 1 ? D25 / K9 : 0

  return {
    setupSpend: D12, // cell D12
    workingCapital: K9, // cell K9
    fullSalePrice: V9, // cell V9
    grossSalesMargin: V12, // cell V12
    totalUnits: Q15, // cell Q15
    discountedPrice: V15, // cell V15
    totalUnitsCost: Q17, // cell Q17
    cycleDays: V23, // cell V23
    cycleFactorMonthly: V25, // cell V25
    cycleFactorAnnual: V27, // cell V27
    unitsFullPrice: L29, // cell L29
    fullPriceRevenue: N29, // cell N29
    unitsDiscount: L31, // cell L31
    reducedRevenue: N31, // cell N31
    totalBatchUnits: L33, // cell L33
    totalBatchRevenue: N33, // cell N33
    batchGrossProfit: N35, // cell N35
    monthlyCashSales: V29, // cell V29
    monthlyCashGP: V31, // cell V31
    annualRevenue: V33, // cell V33
    differenceVsScenario: V36, // cell V36
    differencePct: V37, // cell V37
    netProfitMonthly: D25, // cell D25
    contributionMarginPct: D20, // cell D20
    cashReserveRequired: N9, // cell N9
    cashflowStatus: J3, // cell J3
    profitIfPositive: Q3, // cell Q3
    returnOnWorkingCapital: Q5 // cell Q5
  }
}

module.exports = { computeWorkingCapitalCycle, DEFAULT_INPUTS }
