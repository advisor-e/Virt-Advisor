'use strict'

const { computeQuickPosition, computeExpensesReview } = require('../../server/report/quickPositionModel')

/**
 * Golden values read from `CM. Quick Position..xlsx` (deconstructed + independently
 * validated 2026-07-16 — 32/32 cells, plan decision log). The NZ COVID wage-subsidy
 * block is excluded by owner ruling; its cells (V6,V7,V9,T6,T7,H18,H28) are not here.
 */
describe('Quick Position — golden values (source-sheet defaults)', () => {
  const r = computeQuickPosition({})

  test('adjusted realisable assets — G6, G7, G8, G9', () => {
    expect(r.adjusted.cash).toBeCloseTo(296155, 6) // G6
    expect(r.adjusted.debtors).toBeCloseTo(123924.8, 6) // G7
    expect(r.adjusted.stock).toBeCloseTo(0, 6) // G8 (factor 0 in the sample)
    expect(r.adjusted.fixedAssets).toBeCloseTo(30000, 6) // G9
  })

  test('immediate liabilities subtract — G11, G12', () => {
    expect(r.adjusted.creditors).toBeCloseTo(-63000, 6) // G11
    expect(r.adjusted.wagesDue).toBeCloseTo(-32000, 6) // G12
  })

  test('Quick Cash Available — G15', () => {
    expect(r.quickCashAvailable).toBeCloseTo(355079.8, 6)
  })

  test('monthly outgoings — G17, G18, G19, G21', () => {
    // G17=20000, G18=0, G19=0 fold into the total
    expect(r.totalMonthlyOutgoings).toBeCloseTo(20000, 6) // G21
  })

  test('expense cycles at zero sales — G23', () => {
    expect(r.expenseCyclesZeroSales).toBeCloseTo(17.75399, 5)
  })

  test('life-line capital and trading cycles — T19, G24', () => {
    expect(r.lifelineCapital).toBeCloseTo(50000, 6) // T19
    expect(r.tradingCyclesWithLifeline).toBeCloseTo(20.25399, 5) // G24
  })

  test('break-even sales required — G26', () => {
    expect(r.breakEvenSalesRequired).toBeCloseTo(86956.52174, 4)
  })

  test('discounting — E33 new margin, E34 sales increase', () => {
    expect(r.newGrossMarginPct).toBeCloseTo(0.1894736842, 9)
    expect(r.salesIncreaseToMaintainGM).toBeCloseTo(0.2777777778, 9)
  })

  test('the worked example — E37..H41', () => {
    const ex = r.discountExample
    expect(ex.revenue).toBeCloseTo(195000, 6) // E37
    expect(ex.grossMarginPct).toBeCloseTo(0.23, 9) // F37
    expect(ex.grossMargin).toBeCloseTo(44850, 6) // G37
    expect(ex.monthlySurplus).toBeCloseTo(24850, 6) // H37
    expect(ex.discountAmount).toBeCloseTo(9750, 6) // E38
    expect(ex.discountPct).toBeCloseTo(0.05, 9) // F38
    expect(ex.revenueAfterDiscount).toBeCloseTo(185250, 6) // E39
    expect(ex.revenueIncreaseNeeded).toBeCloseTo(51458.33333, 4) // E40
    expect(ex.increasePct).toBeCloseTo(0.2777777778, 9) // F40
    expect(ex.revenueNeeded).toBeCloseTo(236708.3333, 3) // E41
    expect(ex.newGrossMarginPct).toBeCloseTo(0.1894736842, 9) // F41
    expect(ex.newGrossMargin).toBeCloseTo(44850, 6) // G41
    expect(ex.newMonthlySurplus).toBeCloseTo(24850, 6) // H41
  })
})

describe('Expenses Review — golden values (D55, F55, F60)', () => {
  // The sheet's 46 rows: Accounting 7800 @ 50% maintained; every other line @ 100%.
  const amounts = [7800, 32000, 1500, 2500, 5000, 7500, 8000, 3500, 750, 3500, 17000,
    500, 3600, 4800, 450, 1800, 2000, 1500, 2500, 500, 2000, 1500, 1250,
    24000, 850, 3600, 500, 4500, 850, 5600, 8500, 3500, 22500, 1500,
    100, 500, 600, 700, 800, 900, 100, 200, 300, 400, 500, 600]
  const lines = amounts.map((amount, idx) => ({ amount, maintainedPct: idx === 0 ? 0.5 : 1 }))

  test('current total, revised total, average monthly — D55, F55, F60', () => {
    const r = computeExpensesReview(lines, 12)
    expect(r.totalCurrent).toBeCloseTo(193050, 6) // D55
    expect(r.totalRevised).toBeCloseTo(189150, 6) // F55
    expect(r.averageMonthly).toBeCloseTo(15762.5, 6) // F60
  })

  test('empty review is zeros, not an error', () => {
    const r = computeExpensesReview([], 12)
    expect(r.totalCurrent).toBe(0)
    expect(r.totalRevised).toBe(0)
    expect(r.averageMonthly).toBe(0)
  })

  test('zero operating months yields null, never Infinity', () => {
    expect(computeExpensesReview(lines, 0).averageMonthly).toBeNull()
  })
})

describe('Quick Position — no-stock service business (owner ruling 2026-07-16)', () => {
  test('stock is excluded entirely, not zeroed', () => {
    // Give stock a real value + factor so exclusion is observable
    const withStock = computeQuickPosition({ stock: 40000, stockFactor: 0.5 })
    const service = computeQuickPosition({ stock: 40000, stockFactor: 0.5, serviceBusiness: true })
    expect(withStock.quickCashAvailable).toBeCloseTo(service.quickCashAvailable + 20000, 6)
    expect(service.adjusted.stock).toBeNull()
    expect(service.stockExcluded).toBe(true)
    expect(withStock.stockExcluded).toBe(false)
  })

  test('serviceBusiness accepts the JSON-string form', () => {
    expect(computeQuickPosition({ serviceBusiness: 'true' }).stockExcluded).toBe(true)
  })
})

describe('Quick Position — honesty guards (null, never a fabricated figure)', () => {
  test('zero monthly outgoings: runway is null (unlimited), not 0 or Infinity', () => {
    const r = computeQuickPosition({ monthlyFixedCosts: 0, monthlyDrawings: 0, monthlyLoanRepayments: 0 })
    expect(r.expenseCyclesZeroSales).toBeNull()
    expect(r.tradingCyclesWithLifeline).toBeNull()
  })

  test('zero gross margin: no break-even exists', () => {
    expect(computeQuickPosition({ grossMarginPct: 0 }).breakEvenSalesRequired).toBeNull()
  })

  test('discount >= margin: no sales volume can recover it', () => {
    const r = computeQuickPosition({ grossMarginPct: 0.2, discountPct: 0.2 })
    expect(r.salesIncreaseToMaintainGM).toBeNull()
    expect(r.discountExample).toBeNull()
    // the new (destroyed) margin is still reported so the screen can show the damage
    expect(r.newGrossMarginPct).toBeCloseTo(0, 9)
  })

  test('a 100% discount cannot divide by zero', () => {
    const r = computeQuickPosition({ discountPct: 1 })
    expect(r.newGrossMarginPct).toBeNull()
    expect(r.salesIncreaseToMaintainGM).toBeNull()
    expect(r.discountExample).toBeNull()
  })

  test('debts exceeding realisable assets report a NEGATIVE position, faithfully', () => {
    const r = computeQuickPosition({ cash: 10000, debtors: 0, fixedAssets: 0, creditors: 50000 })
    expect(r.quickCashAvailable).toBeLessThan(0)
    expect(r.expenseCyclesZeroSales).toBeLessThan(0) // insolvent-now reads as negative months
  })
})

describe('Quick Position — input robustness (route receives raw JSON)', () => {
  test('JSON-string numbers are accepted', () => {
    const r = computeQuickPosition({ cash: '100000', cashFactor: '0.5', debtors: '0', fixedAssets: '0' })
    expect(r.adjusted.cash).toBeCloseTo(50000, 6)
  })

  test('junk input falls back to the source-sheet default, never NaN', () => {
    const r = computeQuickPosition({ cash: 'abc', debtors: {}, grossMarginPct: [], monthlyFixedCosts: null })
    expect(r.adjusted.cash).toBeCloseTo(296155, 6)
    expect(r.adjusted.debtors).toBeCloseTo(123924.8, 6)
    expect(r.breakEvenSalesRequired).toBeCloseTo(86956.52174, 4)
    expect(Number.isFinite(r.quickCashAvailable)).toBe(true)
  })

  test('a non-object body computes the defaults', () => {
    const r = computeQuickPosition('nonsense')
    expect(r.quickCashAvailable).toBeCloseTo(355079.8, 6)
  })
})
