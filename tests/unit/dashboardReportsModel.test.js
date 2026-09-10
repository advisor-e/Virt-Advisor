'use strict'

const {
  DEFAULT_INPUTS,
  DEFAULT_COLLECTIBLE,
  computePeriodRatios,
  computeQuarterlyComparison,
  computeSalesVolatility,
  computeCashMovementSummary,
  healthScore,
  computeDashboardReports
} = require('../../server/report/dashboardReportsModel')

/**
 * GOLDEN TEST — Dashboard Reports (item 4.70, stage 1).
 *
 * Every expected number below is the source workbook's OWN cached value, read straight out of
 * `design/report-source-models/Dashboard Reports_.xlsx`, sheet *API Data*. If the port and the
 * spreadsheet ever disagree, this fails. Cell references are given so any figure can be checked
 * by hand: the monthly block is columns F..Q, the yearly block T..X.
 *
 * Where the sheet is odd — the yearly "Current Ratio" that is the quick ratio, "Stock Turn"
 * as income over current assets, "Drawings & Tax" that is the wages line — the SOURCE's number
 * is asserted. Reproducing the sheet is the job (Mike, 2026-09-07: Stats NZ's benchmark ratios
 * carry these definitions, so they must match); changing a definition is a separate decision.
 */

const P = 6

describe('Dashboard Reports — golden values from Dashboard Reports_.xlsx, sheet API Data', () => {
  describe('the yearly block, column T (year to March 2021)', () => {
    const t = computePeriodRatios(DEFAULT_INPUTS.yearly[0])

    it('rolls the balance sheet up to the sheet totals', () => {
      expect(t.totalAssets).toBeCloseTo(165146, P) //           T16
      expect(t.totalLiabilities).toBeCloseTo(53369, P) //       T22
      expect(t.netAssets).toBeCloseTo(111777, P) //             T24
      expect(t.totalEquity).toBeCloseTo(147777, P) //           T29
    })

    it('rolls the profit and loss up to the sheet totals', () => {
      expect(t.totalIncome).toBeCloseTo(81564, P) //            T33
      expect(t.grossProfit).toBeCloseTo(51544, P) //            T39
      expect(t.netProfit).toBeCloseTo(45374, P) //              T43
      expect(t.totalSalesCosts).toBeCloseTo(39520, P) //        T113
    })

    it('computes the liquidity and debt ratios as the sheet defines them', () => {
      expect(t.debtPercentageOfLiquid).toBeCloseTo(0.4022561051, P) // T52
      expect(t.quickRatio).toBeCloseTo(1.463790447, P) //        T53 — labelled "Current Ratio" there
      expect(t.totalDebt).toBeCloseTo(53369, P) //               T67
      expect(t.debtToEquity).toBeCloseTo(0.3611455098, P) //     T70
      expect(t.debtRatio).toBeCloseTo(0.323162535, P) //         T101
      expect(t.liabilityStructure).toBeCloseTo(0.7346753105, P) // T159
    })

    it('computes the profitability ratios', () => {
      expect(t.grossProfitPct).toBeCloseTo(0.6560765745, P) //   T61 (and T153, the same figure)
      expect(t.returnOnEquity).toBeCloseTo(0.3070437213, P) //   T76
      expect(t.wagesToSales).toBeCloseTo(0.1591059518, P) //     T82
      expect(t.netProfitPct).toBeCloseTo(0.5775418767, P) //     T88
      expect(t.averageMarkup).toBeCloseTo(1.907623982, P) //     T107
      expect(t.returnOnTotalAssets).toBeCloseTo(0.2747508265, P) // T146
    })

    it('computes working against fixed capital, and the sheet\'s stock turn', () => {
      expect(t.workingCapital).toBeCloseTo(4822, P) //           T92
      expect(t.fixedCapital).toBeCloseTo(106955, P) //           T93
      expect(t.workingToFixed).toBeCloseTo(0.04508438128, P) //  T94
      expect(t.stockTurn).toBeCloseTo(17.20253996, P) //         T139 — income over current assets
    })

    it('holds for the oldest year too, column X (March 2017)', () => {
      const x = computePeriodRatios(DEFAULT_INPUTS.yearly[4])
      expect(x.quickRatio).toBeCloseTo(1.364240927, P) //        X53
      expect(x.returnOnEquity).toBeCloseTo(0.4349331799, P) //   X76
      expect(x.stockTurn).toBeCloseTo(6.926038193, P) //         X139
      expect(x.liabilityStructure).toBeCloseTo(0.5761527684, P) // X159
    })
  })

  describe('the monthly block, column F (March 2020)', () => {
    const f = computePeriodRatios(DEFAULT_INPUTS.monthly[0])

    it('totals the month as the sheet does — debtors excluded from total assets when positive', () => {
      expect(f.totalAssets).toBeCloseTo(165146, P) //           F16 (AR 154,250 is NOT in it)
      expect(f.totalEquity).toBeCloseTo(58450, P) //            F29
      expect(f.grossProfit).toBeCloseTo(43750, P) //            F39
      expect(f.netProfit).toBeCloseTo(35250, P) //              F43
      expect(f.overheads).toBeCloseTo(9750, P) //               F52
      expect(f.totalSalesCosts).toBeCloseTo(3281, P) //         F113
    })

    it('computes the day cost and days cover with debtors at 80 percent', () => {
      expect(DEFAULT_COLLECTIBLE).toBe(0.8) //                   D49
      expect(f.quickRatio).toBeCloseTo(48.61325116, P) //        F53 — labelled "Quick Ratio" here
      expect(f.dayCost).toBeCloseTo(314.516129, P) //            F54 (31 days)
      expect(f.daysCover).toBeCloseTo(393.1594872, P) //         F55
    })

    it('computes the month\'s ratios, odd monthly return on equity included', () => {
      expect(f.grossProfitPct).toBeCloseTo(0.9556366178, P) //   F61
      expect(f.debtToEquity).toBeCloseTo(0.9130710009, P) //     F70
      expect(f.returnOnEquity).toBeCloseTo(0.6030795552, P) //   F76 — one month's profit over equity
      expect(f.wagesToSales).toBeCloseTo(0.02730390337, P) //    F82
      expect(f.netProfitPct).toBeCloseTo(0.7699700749, P) //     F88
      expect(f.workingCapital).toBeCloseTo(4822, P) //           F92
      expect(f.fixedCapital).toBeCloseTo(106955, P) //           F93
      expect(f.averageMarkup).toBeCloseTo(21.54111275, P) //     F107
      expect(f.returnOnTotalAssets).toBeCloseTo(0.2134474949, P) // F156
      expect(f.equityAfterDebt).toBeCloseTo(5081, P) //          F68
    })

    it('holds for February 2021, column Q, a 28-day month', () => {
      const q = computePeriodRatios(DEFAULT_INPUTS.monthly[11])
      expect(q.netAssets).toBeCloseTo(76986, P) //              Q24
      expect(q.netProfit).toBeCloseTo(74154, P) //              Q43
      expect(q.dayCost).toBeCloseTo(348.2142857, P) //          Q54
      expect(q.daysCover).toBeCloseTo(32.02510769, P) //        Q55
      expect(q.returnOnEquity).toBeCloseTo(1.26867408, P) //    Q76
    })
  })

  describe('the derived blocks', () => {
    it('sums the twelve months into the sheet\'s four quarters (rows 125–128)', () => {
      const q = computeQuarterlyComparison(DEFAULT_INPUTS.monthly)
      expect(q).toHaveLength(4)
      expect(q.map(x => x.sales)).toEqual([170453, 225783, 256323, 198273]) //       F126..I126
      expect(q.map(x => x.grossProfit)).toEqual([163514, 217866, 248705, 189778]) // F127..I127
      expect(q.map(x => x.netProfit)).toEqual([138014, 192366, 223205, 164278]) //  F128..I128
      expect(q[0].label).toBe('May 2020') //                                        F125 = H8
    })

    it('draws the volatility band from the mean and one population deviation (rows 133–139)', () => {
      const v = computeSalesVolatility(DEFAULT_INPUTS.monthly)
      expect(v.count).toBe(12) //                                D133
      expect(v.total).toBeCloseTo(850832, P) //                  D135
      expect(v.average).toBeCloseTo(70902.66667, 4) //           F135
      expect(v.deviation).toBeCloseTo(16584.97806, 4) //         E139 (STDEV.P)
      expect(v.upper).toBeCloseTo(87487.64473, 4) //             F136
      expect(v.lower).toBeCloseTo(54317.68861, 4) //             F137
      expect(v.salesCosts[0]).toBeCloseTo(3281, P) //            F134
      expect(v.totalCosts[0]).toBeCloseTo(11781, P) //           F145
    })

    it('walks the cash movement summary from revenue to net cash flow (rows 121–132)', () => {
      const c = computeCashMovementSummary(DEFAULT_INPUTS.yearly[0], DEFAULT_INPUTS.yearly[1])
      expect(c.revenue).toBeCloseTo(78564, P) //                 U121
      expect(c.afterOperatingExpenses).toBeCloseTo(69394, P) //  X122
      expect(c.afterOtherIncome).toBeCloseTo(72394, P) //        X123
      expect(c.changeInReceivables).toBeCloseTo(202, P) //       V124
      expect(c.afterReceivables).toBeCloseTo(72596, P) //        X124
      expect(c.changeInCurrentLiabilities).toBeCloseTo(2167, P) // W125
      expect(c.operatingCashFlow).toBeCloseTo(70429, P) //       U126
      expect(c.drawingsAndTax).toBeCloseTo(12500, P) //          W127 — the sheet's wages line
      expect(c.afterDrawingsAndTax).toBeCloseTo(57929, P) //     X127
      expect(c.changeInFixedAssets).toBeCloseTo(2991, P) //      W128
      expect(c.freeCashFlow).toBeCloseTo(54938, P) //            U129
      expect(c.changeInNonCurrentLiabilities).toBeCloseTo(5534, P) // W130
      expect(c.netCashFlow).toBeCloseTo(49404, P) //             U131
      expect(c.closingBank).toBeCloseTo(3500, P) //              U132
    })
  })

  describe('the whole hub', () => {
    it('assembles every block from the workbook sample by default', () => {
      const all = computeDashboardReports()
      expect(all.yearly).toHaveLength(5)
      expect(all.monthly).toHaveLength(12)
      expect(all.quarterly).toHaveLength(4)
      expect(all.volatility.average).toBeCloseTo(70902.66667, 4)
      expect(all.cashMovement.netCashFlow).toBeCloseTo(49404, P)
      expect(all.yearly[0].quickRatio).toBeCloseTo(1.463790447, P)
      expect(all.monthly[0].daysCover).toBeCloseTo(393.1594872, P)
    })

    it('has no cash movement with fewer than two years, and empty blocks with no months', () => {
      const one = computeDashboardReports({ yearly: [DEFAULT_INPUTS.yearly[0]], monthly: [] })
      expect(one.cashMovement).toBeNull()
      expect(one.quarterly).toEqual([])
      expect(one.volatility.count).toBe(0)
      expect(one.volatility.average).toBeNull()
    })
  })
})

describe('Dashboard Reports — what the sheet would get wrong, and this port does not', () => {
  it('returns null, never 0, where the sheet\'s IFERROR would print a zero ratio', () => {
    const r = computePeriodRatios({ bank: 100, accountsReceivable: 50, currentLiabilities: 0, tradingIncome: 0, costOfSales: 0, currentAssets: 0 })
    expect(r.quickRatio).toBeNull()
    expect(r.grossProfitPct).toBeNull()
    expect(r.averageMarkup).toBeNull()
    expect(r.stockTurn).toBeNull()
    expect(r.wagesToSales).toBeNull()
  })

  it('has no day cost or days cover for a period with no day count — a year is not a month', () => {
    const y = computePeriodRatios(DEFAULT_INPUTS.yearly[0])
    expect(y.dayCost).toBeNull()
    expect(y.daysCover).toBeNull()
  })

  it('reads JSON-string numbers and treats junk as an empty cell', () => {
    const r = computePeriodRatios({ bank: '3500', accountsReceivable: 'x', currentLiabilities: '3245', currentAssets: 4567 })
    expect(r.workingCapital).toBeCloseTo(4822, P)
    expect(r.lines.accountsReceivable).toBe(0)
    expect(r.quickRatio).toBeCloseTo(3500 / 3245, P)
  })

  it('treats a missing period, a non-finite number and junk inputs as empty cells, not crashes', () => {
    const empty = computePeriodRatios(null)
    expect(empty.totalAssets).toBe(0)
    expect(empty.quickRatio).toBeNull()
    expect(empty.label).toBe('')
    expect(computePeriodRatios({ bank: NaN, currentLiabilities: Infinity }).lines.bank).toBe(0)
    const fromJunk = computeDashboardReports('junk')
    expect(fromJunk.yearly).toHaveLength(5) // falls back to the workbook sample
    const noCollectible = computeDashboardReports({ yearly: [], monthly: [], collectible: 'x' })
    expect(noCollectible.yearly).toEqual([])
  })

  it('lets the collectible share be set, since D49 is a cell an advisor may change', () => {
    const full = computePeriodRatios(DEFAULT_INPUTS.monthly[0], { collectible: 1 })
    expect(full.daysCover).toBeCloseTo((3500 + 154250 - 3245) / 314.516129, 3)
  })
})

describe('the Business Health Score — a count, not a formula (Mike, 2026-09-07)', () => {
  it('scores the report\'s sample: five green, one amber, two red = 69', () => {
    const s = healthScore(['green', 'green', 'green', 'green', 'green', 'amber', 'red', 'red'])
    expect(s).toEqual({ score: 69, green: 5, amber: 1, red: 2, total: 8 })
  })

  it('is 100 when every measure is green and 0 when every measure is red', () => {
    expect(healthScore(['green', 'green', 'green']).score).toBe(100)
    expect(healthScore(['red', 'red']).score).toBe(0)
    expect(healthScore(['amber', 'amber']).score).toBe(50)
  })

  it('has no score with no measures, and refuses a band it does not know', () => {
    expect(healthScore([]).score).toBeNull()
    expect(healthScore(undefined).total).toBe(0)
    expect(() => healthScore(['green', 'grene'])).toThrow(/unknown band/)
  })
})
