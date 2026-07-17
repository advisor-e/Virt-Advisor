'use strict'

const {
  DEFAULT_INPUTS,
  computeCalculations,
  computeScenarios,
  computeBroadScenarios,
  computeEightLevers
} = require('../../server/report/eightLeversModel')

/**
 * GOLDEN TEST — 8 Levers.
 *
 * Every expected number below is the source workbook's OWN cached value, read straight out of
 * `design/report-source-models/GE.2b.8 Levers Model.xlsx` (all three sheets). If our port and
 * the spreadsheet ever disagree, this fails. Cell references are given so any figure can be
 * checked against the workbook by hand.
 *
 * Where the source is internally odd, we assert the SOURCE's number — reproducing the model is
 * the job; repairing it is a separate decision for the owner (see the negative "profit increase"
 * on the Scenarios sheet, below).
 */

// The workbook stores full floating-point values; 6dp is comfortably tighter than any
// figure the report displays, while tolerating IEEE noise.
const P = 6

describe('8 Levers — golden values from GE.2b.8 Levers Model.xlsx', () => {
  describe('Sheet 1: Calculations', () => {
    const c = computeCalculations(DEFAULT_INPUTS)

    it('rolls the product/labour mix up to the source totals', () => {
      expect(c.mix[0].contribution).toBeCloseTo(80000, P) //         J6
      expect(c.totalSales).toBeCloseTo(880000, P) //                 F12
      expect(c.totalContribution).toBeCloseTo(489350, P) //          J12
      expect(c.averageMarginPct).toBeCloseTo(0.5560795455, P) //     H12
    })

    it('re-prices the mix under the scenario lift', () => {
      expect(c.scenarioTotalContribution).toBeCloseTo(527126.5, P) // Y12
      expect(c.scenarioAverageMarginPct).toBeCloseTo(0.5723725501, P) // W12
      expect(c.contributionGain).toBeCloseTo(37776.5, P) //          Z13
    })

    it('computes the trading position', () => {
      expect(c.grossTaxableProfit).toBeCloseTo(275780, P) //         F22
      expect(c.grossTaxableProfitPct).toBeCloseTo(0.3133863636, P) // H22
      expect(c.totalActivityCosts).toBeCloseTo(12612, P) //          N27
    })

    it('restates the P&L into revenue / margin / activity / fixed', () => {
      expect(c.totalRevenue).toBeCloseTo(880000, P) //               F31
      expect(c.salesMarginPct).toBeCloseTo(0.5412784091, P) //       F33 (holds the COST ratio)
      expect(c.salesMarginValue).toBeCloseTo(476325, P) //           H33
      expect(c.salesActivityCosts).toBeCloseTo(12612, P) //          F35
      expect(c.fixedCosts).toBeCloseTo(115283, P) //                 F37
      expect(c.restatedProfit).toBeCloseTo(275780, P) //             F39
      expect(c.restatedProfitPct).toBeCloseTo(0.3133863636, P) //    H39
    })

    it('reconciles: the restated profit equals the trading gross profit', () => {
      // Not a source cell — a cross-check that the two routes through the sheet agree.
      expect(c.restatedProfit).toBeCloseTo(c.grossTaxableProfit, P)
    })

    it('computes the labour-productivity sub-model', () => {
      const l = c.labour
      expect(l.effectiveWeeksLost).toBeCloseTo(7.142857143, P) //     W32
      expect(l.weeklyChargePerWorker).toBeCloseTo(2295, P) //         W38
      expect(l.estimatedLabourRevenue).toBeCloseTo(308841.4286, 3) // Y20
      expect(l.adjustedLabourMarginPct).toBeCloseTo(0.3606557225, P) // Y22
      expect(l.wagePerWorker).toBeCloseTo(65818.66667, 4) //          Y28
      expect(l.weeklyWagePerWorker).toBeCloseTo(1265.74359, 4) //     W40
      expect(l.hourlyPayRate).toBeCloseTo(31.64358974, P) //          W42
      expect(l.targetLabourMarginPct).toBeCloseTo(0.5312060779, P) // W36
    })
  })

  describe('Sheet 2: Scenarios (faithful port — current back-solved from the Calculations revenue)', () => {
    const calc = computeCalculations(DEFAULT_INPUTS)
    const s = computeScenarios(calc, DEFAULT_INPUTS.scenarios)

    it('back-solves the funnel from the Calculations revenue', () => {
      expect(s.current.marketSize).toBeCloseTo(32500, P) //          F5
      expect(s.current.customers).toBeCloseTo(2046.511628, 5) //     F9
      expect(s.current.prospects).toBeCloseTo(8186.046512, 5) //     F8
      expect(s.current.footTraffic).toBeCloseTo(20465.11628, 4) //   F7
      expect(s.current.revenue).toBeCloseTo(880000, P) //            F14
    })

    it('carries the cost lines through from Calculations', () => {
      expect(s.current.margin).toBeCloseTo(476325, P) //             F16
      expect(s.current.activityCosts).toBeCloseTo(12612, P) //       F17
      expect(s.current.fixedCosts).toBeCloseTo(115283, P) //         F18
      expect(s.current.totalExpenses).toBeCloseTo(604220, P) //      F20
      expect(s.current.profit).toBeCloseTo(275780, P) //             F23
      expect(s.current.profitPct).toBeCloseTo(0.3133863636, P) //    H25
    })

    it('builds Option B forward from the funnel', () => {
      expect(s.optionB.revenue).toBeCloseTo(64744.68, P) //          P14
      expect(s.optionB.profit).toBeCloseTo(-1294.8936, P) //         P23
    })

    it('builds Option C forward from the funnel', () => {
      expect(s.optionC.revenue).toBeCloseTo(23400, P) //             Z14
      expect(s.optionC.profit).toBeCloseTo(1872, P) //               Z23
    })

    it('reproduces the source\'s own NEGATIVE profit increase — reproduced, NOT repaired', () => {
      // The Current column is anchored to the Calculations revenue (880,000) while Options B
      // and C are built forward from the funnel (64,745 / 23,400) — two different scales, so
      // the "increase" comes out hugely negative. These are the workbook's OWN cached values
      // (R24/R25, AB24/AB25).
      //
      // NB every figure in this model is ILLUSTRATIVE — it is an Education-class teaching
      // tool, not anyone's accounts. Whether this oddity is a real defect or a misreading of
      // the teaching intent is an OPEN QUESTION for the owner (design/ACTIONS.md). Our job is
      // to reproduce the model, not to reinterpret it.
      expect(s.optionB.profitIncrease).toBeCloseTo(-277074.8936, P) //   R24
      expect(s.optionB.profitIncreasePct).toBeCloseTo(-0.004695386177, P) // R25
      expect(s.optionC.profitIncrease).toBeCloseTo(-273908, P) //        AB24
      expect(s.optionC.profitIncreasePct).toBeCloseTo(0.006788019436, P) // AB25
    })
  })

  describe('Sheet 3: Broad Scenarios (all three columns built forward)', () => {
    const b = computeBroadScenarios(DEFAULT_INPUTS.broad)

    it('builds the current column forward through the lever chain', () => {
      expect(b.current.footTraffic).toBeCloseTo(2925, P) //          F7
      expect(b.current.prospects).toBeCloseTo(204.75, P) //          F8
      expect(b.current.customers).toBeCloseTo(51.1875, P) //         F9
      expect(b.current.revenue).toBeCloseTo(33015.9375, P) //        F14
      expect(b.current.margin).toBeCloseTo(11885.7375, P) //         F16
      expect(b.current.activityCosts).toBeCloseTo(2311.115625, P) // F17
      expect(b.current.fixedCosts).toBeCloseTo(8253.984375, P) //    F18
      expect(b.current.totalExpenses).toBeCloseTo(31695.3, P) //     F20
      expect(b.current.profit).toBeCloseTo(1320.6375, P) //          F23
      expect(b.current.profitPct).toBeCloseTo(0.04, 2) //            H25
    })

    it('computes Option B and its uplift over current', () => {
      expect(b.optionB.revenue).toBeCloseTo(64744.68, P) //          P14
      expect(b.optionB.profit).toBeCloseTo(1942.3404, P) //          P23
      expect(b.optionB.profitIncrease).toBeCloseTo(621.7029, P) //   R24
      expect(b.optionB.profitIncreasePct).toBeCloseTo(1.47075969, P) // R25
    })

    it('computes Option C and its uplift over current', () => {
      expect(b.optionC.revenue).toBeCloseTo(32175, P) //             Z14
      expect(b.optionC.profit).toBeCloseTo(4826.25, P) //            Z23
      expect(b.optionC.profitIncrease).toBeCloseTo(3505.6125, P) //  AB24
      expect(b.optionC.profitIncreasePct).toBeCloseTo(3.65448505, P) // AB25
    })

    it('shows Option C beating Option B on profit despite lower revenue — the teaching point', () => {
      // The whole point of the model: C turns less revenue into more profit, because the
      // margin lever (45% vs 40%) outweighs the volume lever.
      expect(b.optionC.revenue).toBeLessThan(b.optionB.revenue)
      expect(b.optionC.profit).toBeGreaterThan(b.optionB.profit)
    })
  })

  describe('computeEightLevers — the whole model', () => {
    it('returns all three sheets', () => {
      const r = computeEightLevers()
      expect(r.calculations.totalRevenue).toBeCloseTo(880000, P)
      expect(r.scenarios.current.profit).toBeCloseTo(275780, P)
      expect(r.broadScenarios.optionC.profit).toBeCloseTo(4826.25, P)
    })

    it('defaults to the source figures when called with nothing', () => {
      expect(computeEightLevers()).toEqual(computeEightLevers(DEFAULT_INPUTS))
    })

    it('applies partial overrides without disturbing the rest of the model', () => {
      const r = computeEightLevers({ broad: { current: Object.assign({}, DEFAULT_INPUTS.broad.current, { averageSpend: 430 }) } })
      // Double the spend, double the revenue on that column.
      expect(r.broad === undefined).toBe(true)
      expect(r.broadScenarios.current.revenue).toBeCloseTo(33015.9375 * 2, 4)
      // The other sheets are untouched.
      expect(r.calculations.totalRevenue).toBeCloseTo(880000, P)
    })
  })

  describe('input hardening', () => {
    it('coerces numeric strings arriving as JSON text', () => {
      const r = computeEightLevers({ trading: { tradingIncome: '880000', costOfSales: '476325', operatingExpenses: '127895' } })
      expect(r.calculations.grossTaxableProfit).toBeCloseTo(275780, P)
    })

    it('never produces NaN or Infinity from a zero denominator', () => {
      const r = computeEightLevers({
        trading: { tradingIncome: 0, costOfSales: 0, operatingExpenses: 0 },
        mix: [],
        activityCosts: [],
        labour: { totalWages: 0, workers: 0, weeklyHours: 0, hourlyChargeOutRate: 0, productivityPct: 0, weeksAnnualLeave: 0, sickAndPublicHolidayDays: 0 }
      })
      const flat = JSON.stringify(r)
      expect(flat).not.toMatch(/null/) // JSON.stringify turns NaN/Infinity into null
      expect(r.calculations.averageMarginPct).toBe(0)
      expect(r.calculations.labour.hourlyPayRate).toBe(0)
    })

    it('survives malformed input rather than throwing', () => {
      expect(() => computeEightLevers(null)).not.toThrow()
      expect(() => computeEightLevers({ mix: 'nonsense', activityCosts: 42 })).not.toThrow()
    })
  })
})
