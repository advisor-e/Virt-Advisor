'use strict'

const {
  DEFAULT_INPUTS,
  computeLeaseVsBuy,
  amortise,
  depreciate,
  annuityPayment
} = require('../../server/report/leaseVsBuyModel')

/**
 * GOLDEN TEST — Lease vs Buy.
 *
 * Every expected number below is the source workbook's OWN cached value, read straight
 * out of `design/report-source-models/CM.Lease vs. Buy.xlsx`. If our port and the
 * spreadsheet ever disagree, this fails. Cell references are given so any figure can
 * be checked against the workbook by hand.
 *
 * THE ONE DELIBERATE DEPARTURE — the corrected double-count (owner ruling, 2026-07-27):
 * the workbook adds the lease-end costs twice (`Lease!K3` already includes `D37`, and
 * `Input!D33` adds `D37` again), so its cached Total Lease Cost is 38,425.62 and its
 * verdict is "Buy!". We count the lease-end costs once → Total Lease Cost 28,725.45 and
 * the honest verdict "Lease!". The `describe('the corrected double-count')` block below
 * pins BOTH: the corrected total, and that we are NOT reproducing the buggy 38,425.62.
 *
 * PRECISION: the workbook stores ~10 significant figures; each `toBeCloseTo` precision
 * is chosen one digit inside that, tighter than anything the report displays.
 */

describe('Lease vs Buy — golden values from CM.Lease vs. Buy.xlsx', () => {
  const r = computeLeaseVsBuy(DEFAULT_INPUTS)

  describe('the loan amortisation engine (Interest sheet)', () => {
    // Sample loan: financed = 55000 − 8500 = 46500 @ 9.5% over 48 months.
    const loan = amortise(false, 46500, 0.095 / 12, 48, 10) // Table (the sample, D6='T')

    it('Table method — annual interest (Interest C7:F7, "t")', () => {
      expect(loan.annualInterest[0]).toBeCloseTo(3988.216338, 4) // C7
      expect(loan.annualInterest[1]).toBeCloseTo(2992.714049, 4) // D7
      expect(loan.annualInterest[2]).toBeCloseTo(1898.410563, 4) // E7
      expect(loan.annualInterest[3]).toBeCloseTo(695.5000993, 4) // F7
    })

    it('Table method — annual principal (Interest C9:F9, "t")', () => {
      expect(loan.annualPrincipal[0]).toBeCloseTo(10030.49392, 4) // C9
      expect(loan.annualPrincipal[1]).toBeCloseTo(11025.99621, 4) // D9
      expect(loan.annualPrincipal[2]).toBeCloseTo(12120.2997, 4) //  E9
      expect(loan.annualPrincipal[3]).toBeCloseTo(13323.21016, 4) // F9
    })

    it('Table method — year-end balance (Interest W10:Z10)', () => {
      expect(loan.yearEndBalance[0]).toBeCloseTo(36469.50608, 4) // W10
      expect(loan.yearEndBalance[1]).toBeCloseTo(25443.50986, 4) // X10
      expect(loan.yearEndBalance[2]).toBeCloseTo(13323.21016, 4) // Y10
      expect(loan.yearEndBalance[3]).toBeCloseTo(0, 4) //           Z10
    })

    it('total interest and principal tie out (Interest N7, N9)', () => {
      const totalInterest = loan.annualInterest.reduce((a, b) => a + b, 0)
      const totalPrincipal = loan.annualPrincipal.reduce((a, b) => a + b, 0)
      expect(totalInterest).toBeCloseTo(9574.84105, 3) // N7
      expect(totalPrincipal).toBeCloseTo(46500, 3) //    N9 (= financed)
    })

    it('Reducing method — level principal, year-1 anchors (Interest W6, W9)', () => {
      const red = amortise(true, 46500, 0.095 / 12, 48, 10)
      expect(red.annualInterest[0]).toBeCloseTo(3911.328125, 4) // W6
      expect(red.annualPrincipal[0]).toBeCloseTo(11625, 4) //      = 46500/48×12
      expect(red.yearEndBalance[0]).toBeCloseTo(34875, 4) //       W9 (= 46500 − 11625)
    })
  })

  describe('the depreciation engine (Depreciation sheet)', () => {
    it('Diminishing-Value — charge and written-down value (rows 18/19)', () => {
      const dv = depreciate(true, 55000, 0.23, 10)
      expect(dv.charge[0]).toBeCloseTo(12650, 4) //       C18 = 55000×0.23
      expect(dv.charge[1]).toBeCloseTo(9740.5, 4) //      D18 = 42350×0.23
      expect(dv.remainingValue[0]).toBeCloseTo(42350, 4) // C19
      expect(dv.remainingValue[1]).toBeCloseTo(32609.5, 4) // D19
      expect(dv.remainingValue[2]).toBeCloseTo(25109.315, 4) // E19
      expect(dv.remainingValue[3]).toBeCloseTo(19334.17255, 4) // F19
    })

    it('Straight-Line — flat charge, remaining value declines to 0 (rows 15/16)', () => {
      const sl = depreciate(false, 55000, 0.23, 10)
      expect(sl.charge[0]).toBeCloseTo(12650, 4) //       C15 (flat)
      expect(sl.charge[3]).toBeCloseTo(12650, 4) //       F15 (flat)
      expect(sl.remainingValue[0]).toBeCloseTo(42350, 4) // C16
      expect(sl.remainingValue[3]).toBeCloseTo(4400, 4) //  F16
      expect(sl.remainingValue[4]).toBeCloseTo(0, 4) //     G16 (floored)
    })
  })

  describe('the Buy build-up (Buy sheet)', () => {
    it('year-1 net cost decomposes exactly (Buy!D3 and its parts)', () => {
      const y1 = r.buy.years[0]
      expect(y1.whatYouvePaid).toBeCloseTo(14018.71026, 4) // D8 = interest + principal
      expect(y1.owed).toBeCloseTo(36469.50608, 4) //         D9
      expect(y1.worth).toBeCloseTo(42350, 4) //              D10 (DV year-1 WDV)
      expect(y1.costOfCapital).toBeCloseTo(807.5, 4) //      D12 = 8500×0.095
      expect(y1.servicingCosts).toBeCloseTo(2709.090909, 4) // D23 = 900+850+709.09+250
      expect(y1.totalTaxRebates).toBeCloseTo(6200.996029, 4) // D30
      expect(y1.netCost).toBeCloseTo(11334.30514, 4) //      D3
    })

    it('per-year net cost and gross total (Buy!D3:M3, O3)', () => {
      expect(r.buy.years[1].netCost).toBeCloseTo(12516.17453, 4) // E3
      expect(r.buy.years[2].netCost).toBeCloseTo(14445.4478, 4) //  F3
      expect(r.buy.years[3].netCost).toBeCloseTo(14468.66106, 4) // G3
      expect(r.buy.years[4].netCost).toBeCloseTo(0, 4) //           H3 (loan paid off)
      expect(r.buy.grossTotal).toBeCloseTo(52764.58854, 3) //       O3
    })

    it('total Buy cost nets off the resale value (Input!I31)', () => {
      expect(r.buy.totalNet).toBeCloseTo(33264.58854, 3) // I31 = D31(52764.59) − F31(19500)
    })
  })

  describe('the Lease build-up (Lease sheet)', () => {
    it('per-year net cost (Lease!D3:I3)', () => {
      expect(r.lease.years[0].netCost).toBeCloseTo(6341.76, 4) // D3
      expect(r.lease.years[1].netCost).toBeCloseTo(6341.76, 4) // E3
      expect(r.lease.years[2].netCost).toBeCloseTo(6341.76, 4) // F3
      expect(r.lease.years[3].netCost).toBeCloseTo(0, 4) //      G3 (lease ended, 36 months)
    })

    it('lease-end costs (Lease!D34/D35/D37)', () => {
      expect(r.lease.endCosts.refurb).toBeCloseTo(1200, 4) //        D34 = 300×4
      expect(r.lease.endCosts.excessKmLevy).toBeCloseTo(8500.17, 4) // D35 = (90000−39999)×0.17
      expect(r.lease.endCosts.total).toBeCloseTo(9700.17, 4) //      D37
    })
  })

  describe('the corrected double-count (owner ruling 2026-07-27)', () => {
    it('Total Lease Cost counts the lease-end costs ONCE', () => {
      // Corrected Lease!K3 = sum(D3:I3) + D37 = 3×6341.76 + 9700.17 = 28725.45
      expect(r.lease.grossTotal).toBeCloseTo(28725.45, 2)
      expect(r.lease.totalNet).toBeCloseTo(28725.45, 2) // I33 (corrected) = K3 − F33(0)
    })

    it('is NOT reproducing the buggy 38,425.62 (D37 added twice)', () => {
      // The workbook's Input!D33 = Lease!K3 + Lease!D37 = 28725.45 + 9700.17 = 38425.62.
      // If this ever equals 38425.62 again, the double-count has crept back in.
      expect(r.lease.totalNet).not.toBeCloseTo(38425.62, 2)
    })
  })

  describe('the verdict (Input!K31)', () => {
    it('recommends the cheaper option — corrected, that is Lease', () => {
      // Buy 33,264.59 vs Lease 28,725.45 → Lease is cheaper (workbook's buggy verdict was "Buy!").
      expect(r.verdict.recommended).toBe('lease')
      expect(r.verdict.cheaperCost).toBeCloseTo(28725.45, 2)
      expect(r.verdict.dearerCost).toBeCloseTo(33264.58854, 2)
      expect(r.verdict.saving).toBeCloseTo(4539.13854, 2) // 33264.59 − 28725.45
    })

    it('the buggy workbook would have recommended Buy — a regression sentinel', () => {
      // Prove the flip is real: reconstruct the workbook's double-counted lease total
      // and confirm it would have out-costed Buy, producing the wrong "Buy!".
      const buggyLeaseNet = r.lease.grossTotal + r.lease.endCosts.total - r.lease.residual
      expect(buggyLeaseNet).toBeCloseTo(38425.62, 2)
      expect(buggyLeaseNet > r.buy.totalNet).toBe(true) // would have said "Buy!"
    })
  })

  describe('defaults never substitute silently (R8 ruling)', () => {
    it('a full inputs object declares nothing defaulted', () => {
      expect(r.defaultedInputs).toEqual([])
    })

    it('a missing field is named, not silently sampled', () => {
      const partial = Object.assign({}, DEFAULT_INPUTS)
      delete partial.deposit
      const out = computeLeaseVsBuy(partial)
      expect(out.defaultedInputs).toContain('deposit')
    })
  })

  /**
   * THE GUARDS, EXERCISED. Each block below has a guard in the model and, until now,
   * nothing that ran it. They are not hypothetical: the route hands this model raw JSON
   * straight off the browser, so a number arriving as text, or an unknown interval
   * arriving as zero, is ordinary input rather than an exotic case.
   */
  describe('hostile and edge-case inputs', () => {
    const sample = () => Object.assign({}, DEFAULT_INPUTS)

    it('a number arriving as unparseable TEXT falls back instead of concatenating', () => {
      // The `num()` comment names this exactly: raw JSON must not string-concatenate.
      // 'eight thousand' cannot become a deposit; the sample deposit is used instead.
      const out = computeLeaseVsBuy(Object.assign(sample(), { deposit: 'eight thousand' }))
      expect(out.buy.totalNet).toBeCloseTo(r.buy.totalNet, 6)
      expect(Number.isFinite(out.buy.totalNet)).toBe(true)
    })

    it('a numeric field arriving as NaN or Infinity falls back', () => {
      // typeof is 'number' here, so only the finiteness check catches these.
      const nan = computeLeaseVsBuy(Object.assign(sample(), { deposit: NaN }))
      const inf = computeLeaseVsBuy(Object.assign(sample(), { deposit: Infinity }))
      expect(nan.buy.totalNet).toBeCloseTo(r.buy.totalNet, 6)
      expect(inf.buy.totalNet).toBeCloseTo(r.buy.totalNet, 6)
    })

    it('⚠ CURRENT BEHAVIOUR — a text value is substituted WITHOUT being declared', () => {
      // Pinned deliberately, not endorsed. A field that is absent is named in
      // `defaultedInputs` (the R8 ruling, tested above); a field present but unusable is
      // silently replaced by the sample and named nowhere, so the caller is told the
      // figure is theirs. Raised with the owner 2026-08-02. If this is later ruled a
      // defect, the fix will fail THIS test rather than pass quietly.
      const out = computeLeaseVsBuy(Object.assign(sample(), { deposit: 'eight thousand' }))
      expect(out.defaultedInputs).not.toContain('deposit')
    })

    it('a zero servicing interval yields no servicing cost, never Infinity', () => {
      // `div()` exists so an unknown "km between services" cannot produce Infinity and
      // poison every downstream total. Zero is what an unanswered interval looks like.
      const out = computeLeaseVsBuy(Object.assign(sample(), { servicePeriodKm: 0 }))
      expect(Number.isFinite(out.buy.totalNet)).toBe(true)
      expect(out.buy.totalNet).toBeLessThan(r.buy.totalNet) // servicing drops out entirely
    })

    it('a loan over zero months has no instalment', () => {
      expect(annuityPayment(0.095 / 12, 0, 46500)).toBe(0)
    })

    it('an interest-free loan repays straight-line — the annuity formula cannot', () => {
      // Real for interest-free dealer finance. At 0% the standard annuity formula
      // divides by zero, so the model takes a separate branch: principal ÷ periods.
      expect(annuityPayment(0, 48, 48000)).toBeCloseTo(1000, 10)
      expect(Number.isFinite(annuityPayment(0, 48, 48000))).toBe(true)
    })
  })
})
