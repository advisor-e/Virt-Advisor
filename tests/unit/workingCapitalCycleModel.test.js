'use strict'

const { computeWorkingCapitalCycle, DEFAULT_INPUTS } = require('../../server/report/workingCapitalCycleModel')

/**
 * Golden set — every calculated cell of the source spreadsheet
 * (design/report-source-models/GE.3c.Working Capital Cycle model.xlsx, sheet "Cycle Model")
 * for the default scenario. The engine must reproduce these exactly.
 * Verified 2026-07-09 against the workbook's own cached values (all 28 matched).
 */
const GOLDEN = {
  setupSpend: 80, // D12
  workingCapital: 120, // K9
  fullSalePrice: 2.5, // V9
  grossSalesMargin: 1.5, // V12
  totalUnits: 120, // Q15
  discountedPrice: 2.125, // V15
  totalUnitsCost: 120, // Q17
  cycleDays: 30, // V23
  cycleFactorMonthly: 1, // V25
  cycleFactorAnnual: 12, // V27
  unitsFullPrice: 120, // L29
  fullPriceRevenue: 300, // N29
  unitsDiscount: 0, // L31
  reducedRevenue: 0, // N31
  totalBatchUnits: 120, // L33
  totalBatchRevenue: 300, // N33
  batchGrossProfit: 180, // N35
  monthlyCashSales: 300, // V29
  monthlyCashGP: 180, // V31
  annualRevenue: 3600, // V33
  differenceVsScenario: 1057, // V36
  netProfitMonthly: 0, // D25
  contributionMarginPct: 0.6, // D20
  cashReserveRequired: 0, // N9
  cashflowStatus: 'Cashflow Positive', // J3
  profitIfPositive: 0, // Q3
  returnOnWorkingCapital: 0 // Q5
}

describe('Working Capital Cycle model — golden values (matches source spreadsheet)', () => {
  const out = computeWorkingCapitalCycle(DEFAULT_INPUTS)

  Object.keys(GOLDEN).forEach((key) => {
    test(`${key} reproduces the spreadsheet`, () => {
      if (typeof GOLDEN[key] === 'string') {
        expect(out[key]).toBe(GOLDEN[key])
      } else {
        expect(out[key]).toBeCloseTo(GOLDEN[key], 6)
      }
    })
  })

  test('differencePct (V37) reproduces the spreadsheet', () => {
    expect(out.differencePct).toBeCloseTo(0.4156508061, 8) // V37 = 1057 / 2543
  })
})

describe('Working Capital Cycle model — behaviour', () => {
  test('shortening the cycle raises the cycle factor and annual revenue', () => {
    const base = computeWorkingCapitalCycle(DEFAULT_INPUTS)
    const faster = computeWorkingCapitalCycle(Object.assign({}, DEFAULT_INPUTS, { daysReceivable: 15 }))
    expect(faster.cycleDays).toBeLessThan(base.cycleDays)
    expect(faster.cycleFactorMonthly).toBeGreaterThan(base.cycleFactorMonthly)
    expect(faster.annualRevenue).toBeGreaterThan(base.annualRevenue)
  })

  test('a zero or negative cycle caps the factor at 30 (no divide-by-zero)', () => {
    const out = computeWorkingCapitalCycle(Object.assign({}, DEFAULT_INPUTS, { daysDeliverable: 0, daysOnHand: 0, daysReceivable: 0, daysPayable: 0 }))
    expect(out.cycleFactorMonthly).toBe(30)
    expect(Number.isFinite(out.annualRevenue)).toBe(true)
  })

  test('negative net profit flags cashflow negative', () => {
    const out = computeWorkingCapitalCycle(Object.assign({}, DEFAULT_INPUTS, { fixedCostsMonthly: 500 }))
    expect(out.netProfitMonthly).toBeLessThan(0)
    expect(out.cashflowStatus).toBe('Cashflow Negative')
  })

  test('contribution margin uses same-period figures when the cycle != 30 days (corrected D20)', () => {
    // Regression guard for the corrected D20. At a 20-day receivable cycle V25 = 2:
    // the flawed source formula (V29 - Q15*V7)/V29 gave 0.80 by subtracting a
    // per-batch cost from per-month revenue; the correct ratio is V31/V29 = 0.60.
    const out = computeWorkingCapitalCycle(Object.assign({}, DEFAULT_INPUTS, { daysReceivable: 20 }))
    expect(out.cycleFactorMonthly).toBe(2)
    expect(out.contributionMarginPct).toBeCloseTo(0.6, 6)
    // Must always equal monthly cash GP / monthly cash sales.
    expect(out.contributionMarginPct).toBeCloseTo(out.monthlyCashGP / out.monthlyCashSales, 10)
  })

  test('contribution margin is unchanged from the source at the default scenario (V25 = 1)', () => {
    const out = computeWorkingCapitalCycle(DEFAULT_INPUTS)
    expect(out.contributionMarginPct).toBeCloseTo(0.6, 6) // matches the golden value
  })
})
