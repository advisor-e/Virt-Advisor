'use strict'

const {
  DEFAULT_INPUTS,
  computeBetaHelper,
  computeWacc,
  computeHurdleTest,
  computeSensitivity,
  computeCostOfCapital,
  stdDevP,
  WARN,
  HURDLE,
  SENSITIVITY_STEP
} = require('../../server/report/costOfCapitalModel')

/**
 * Golden tests for the Cost of Capital (WACC) model.
 *
 * Every expected number is either
 *   (a) the source workbook's OWN cached value, with its cell reference — so the port and
 *       `design/report-source-models/Cost of Capital.xlsx` cannot silently disagree; or
 *   (b) a hand-derived value for one of the three owner-ruled corrections (2026-07-28),
 *       with the arithmetic shown so it can be re-checked without running the code.
 *
 * The corrected figures each carry a SENTINEL assertion against the workbook's defective
 * value — the Lease vs Buy pattern. A correction that is quietly reverted does not merely
 * fail a number, it fails a test that names the bug it was raised to close.
 */

/* ── The workbook's own cached values, for reference in both directions ──────────── */
const WB = {
  // `Beta Calcs` — market side (all UNCORRECTED: the port must match exactly)
  marketPeriods: 12, //         M7
  marketTotal: 55924, //        Y10
  marketAverage: 4660.333333, // Y17
  marketStdDev: 169.3946739, //  M29
  marketVolatilityPct: 0.03634818838, // P29 / F16

  // `Beta Calcs` — company side
  companyPeriods: 11, //        M37  (already counts FILLED periods — correct as written)
  companyTotal: 3773.089622, //  Y43
  companyAverage: 343.0081475, // Y50  (divides by M37 — correct as written)
  companyOpeningEquity: 2569800, //     M40
  companyClosingEquity: 2678905.127, // W40 (last FILLED; X40 is blank)

  // `WACC Calcs` — the debt half (UNCORRECTED: must match exactly)
  costOfDebtAfterTax: 0.0432, // K22
  equityRatio: 0.625, //         H23
  debtRatio: 0.375, //           H24
  debtComponentPreTax: 0.0225, // I24
  debtTaxShield: 0.0063, //      K24
  debtComponent: 0.0162, //      L24

  /* ── The DEFECTIVE values, kept as sentinels ─────────────────────────────────── */
  DEFECT_companyStdDev: 94.90073186, //      M62 — blank read as a zero share price
  DEFECT_companyVolatilityPct: 0.2766719466, // P62 / F15
  DEFECT_equityChange: -2569800, //          AE40 — `X40 - M40` over a blank X40
  DEFECT_growthRate: -1, //                  AE42 / F9 — a -100% growth rate
  DEFECT_roiBeta: -11.12347052, //           I9
  DEFECT_volatilityBeta: 7.611712135, //     I15
  DEFECT_costOfEquity: 0.085748, //          K21 — market RETURN, not the premium
  DEFECT_equityComponent: 0, //              I23 — the equity half, annihilated
  DEFECT_wacc: 0.0162, //                    E26 — the debt cost alone, published as the WACC

  /* ── CORRECTION 4 sentinels (owner ruling 2026-07-29) ────────────────────────────
     The two multipliers the workbook applied on top of CAPM, and the WACC they
     produced. These are no longer defects of the SOURCE — they are the values THIS
     MODEL published until 2026-07-29. They are pinned so that re-adding either
     multiplier fails loudly: the arithmetic would still be internally consistent, so
     nothing but a sentinel would catch it. */
  SUPERSEDED_costOfEquityPostInflation: 0.06972342, //  L20 = K21 x (1 + E9)
  SUPERSEDED_costOfEquityPostGrowth: 0.07268364359, //  M19 = L20 x (1 + E10)
  SUPERSEDED_equityComponent: 0.04542727725, //         I23 = H23 x M19
  SUPERSEDED_wacc: 0.06162727725 //                     E26 — 6.16%
}

/* ── Hand-derived corrected values ───────────────────────────────────────────────
   growth      = (W40 - M40) / M40 = (2,678,905.127 - 2,569,800) / 2,569,800
               = 109,105.127 / 2,569,800                      = 0.04245666083
   costOfEquity= E6 + E8 x (E7 - E6) = 0.039 + 0.52 x 0.0509  = 0.065468
   equityComp. = 0.625 x 0.065468                             = 0.0409175
   WACC        = 0.0409175 + 0.0162                           = 0.0571175      (5.71%)
   roiBeta     = 0.04245666083 / 0.0899                       = 0.47226541524
   volBeta     = 0.01314854200 / 0.03634818838                = 0.36173857867

   Note what is NOT in this chain any more: the "Post Inflation" and "Post Real Growth"
   multipliers. Correction (4) removed both, so the CAPM cost of equity is weighted
   straight into the WACC. See WB.SUPERSEDED_* for the figures that produced. */
const FIX = {
  equityChange: 109105.127,
  growthRate: 0.04245666083,
  companyStdDev: 4.510057035,
  companyVolatilityPct: 0.013148542,
  roiBeta: 0.47226541524,
  volatilityBeta: 0.36173857867,
  costOfEquity: 0.065468,
  equityComponent: 0.0409175,
  wacc: 0.0571175
}

describe('Cost of Capital — beta helper, market side (must match the workbook exactly)', () => {
  const beta = computeBetaHelper(DEFAULT_INPUTS)

  it('counts the filled index periods (M7)', () => {
    expect(beta.market.periods).toBe(WB.marketPeriods)
  })

  it('totals the index (Y10)', () => {
    expect(beta.market.total).toBeCloseTo(WB.marketTotal, 6)
  })

  it('averages the index (Y17)', () => {
    expect(beta.market.average).toBeCloseTo(WB.marketAverage, 5)
  })

  it('takes the population standard deviation of the index (M29 = STDEV.P)', () => {
    // STDEV.P, not STDEV.S — the workbook uses `_xlfn.stdev.p`. Dividing by n-1 instead
    // of n would land at 176.83 and quietly overstate every beta downstream.
    expect(beta.market.stdDev).toBeCloseTo(WB.marketStdDev, 6)
  })

  it('expresses market volatility as spread over mean (P29 / F16)', () => {
    expect(beta.market.volatilityPct).toBeCloseTo(WB.marketVolatilityPct, 10)
  })
})

describe('Cost of Capital — beta helper, company side', () => {
  const beta = computeBetaHelper(DEFAULT_INPUTS)

  it('counts only the FILLED equity periods (M37 = 11 of 12 slots)', () => {
    // The sample's twelfth slot (X40) is deliberately blank — the workbook's own note
    // says a missing period may be left blank, and this is the shape that broke it.
    expect(beta.company.periods).toBe(WB.companyPeriods)
    expect(beta.company.shareValues).toHaveLength(WB.companyPeriods)
  })

  it('totals and averages the share values (Y43, Y50)', () => {
    expect(beta.company.total).toBeCloseTo(WB.companyTotal, 5)
    expect(beta.company.average).toBeCloseTo(WB.companyAverage, 6)
  })

  it('reads the opening and last FILLED closing equity (M40, W40)', () => {
    expect(beta.company.openingEquity).toBe(WB.companyOpeningEquity)
    expect(beta.company.closingEquity).toBe(WB.companyClosingEquity)
  })

  describe('CORRECTION 1b — the blank period is not a zero share price', () => {
    it('takes the standard deviation over the filled periods only', () => {
      expect(beta.company.stdDev).toBeCloseTo(FIX.companyStdDev, 6)
      expect(beta.company.volatilityPct).toBeCloseTo(FIX.companyVolatilityPct, 8)
    })

    it('SENTINEL: does not reproduce the workbook\'s blank-as-zero spread (M62/P62)', () => {
      // 94.90 is a spread of 27.67% on values that only range 335.92-350.18 — the whole of
      // it is the empty twelfth cell entering as a share price of nothing.
      expect(beta.company.stdDev).not.toBeCloseTo(WB.DEFECT_companyStdDev, 3)
      expect(beta.company.volatilityPct).not.toBeCloseTo(WB.DEFECT_companyVolatilityPct, 4)
    })
  })

  describe('CORRECTION 1a — growth runs to the last FILLED period', () => {
    it('measures the equity change against the opening balance (AE40, AE42)', () => {
      expect(beta.company.equityChange).toBeCloseTo(FIX.equityChange, 5)
      expect(beta.growthRate).toBeCloseTo(FIX.growthRate, 10)
    })

    it('derives growth from the workbook\'s own opening and closing cells', () => {
      // Stated as arithmetic rather than a constant, so the expectation can be checked
      // against the .xlsx without trusting the number above.
      const expected = (WB.companyClosingEquity - WB.companyOpeningEquity) / WB.companyOpeningEquity
      expect(beta.growthRate).toBeCloseTo(expected, 12)
    })

    it('SENTINEL: never reports the workbook\'s -100% growth rate', () => {
      expect(beta.growthRate).not.toBeCloseTo(WB.DEFECT_growthRate, 6)
      expect(beta.company.equityChange).not.toBeCloseTo(WB.DEFECT_equityChange, 0)
      expect(beta.growthRate).toBeGreaterThan(0)
    })
  })

  describe('the two candidate betas (I9, I15)', () => {
    it('ROI beta is company growth over market return', () => {
      expect(beta.roiBeta).toBeCloseTo(FIX.roiBeta, 8)
      expect(beta.roiBeta).toBeCloseTo(beta.growthRate / DEFAULT_INPUTS.marketReturnRate, 12)
    })

    it('volatility beta is company spread % over market spread %', () => {
      expect(beta.volatilityBeta).toBeCloseTo(FIX.volatilityBeta, 8)
    })

    it('SENTINEL: neither reproduces the workbook\'s implausible betas', () => {
      expect(beta.roiBeta).not.toBeCloseTo(WB.DEFECT_roiBeta, 2)
      expect(beta.volatilityBeta).not.toBeCloseTo(WB.DEFECT_volatilityBeta, 2)
    })

    it('both corrected betas land in the plausible band, so nothing warns', () => {
      // The point of the correction: 0.47 and 0.36 are the betas of a real, slightly
      // defensive company. -11.12 and 7.61 were arithmetic debris.
      expect(beta.warnings).toEqual([])
    })
  })

  it('CORRECTION 3 — company variance is measured from the company\'s OWN mean', () => {
    // `M52 = $Y$17 - M43` used the MARKET average (4,660) against company share values
    // near 343, so every entry was ~4,320 — dimensional nonsense. Against its own mean the
    // deviations are small and must sum to ~0.
    const total = beta.company.varianceFromOwnMean.reduce((a, b) => a + b, 0)
    expect(total).toBeCloseTo(0, 6)
    beta.company.varianceFromOwnMean.forEach((v) => {
      expect(Math.abs(v)).toBeLessThan(20) // the real spread; the defect produced ~4,320
    })
  })
})

describe('Cost of Capital — the WACC calculation', () => {
  const beta = computeBetaHelper(DEFAULT_INPUTS)
  const wacc = computeWacc(Object.assign({}, DEFAULT_INPUTS, { growthRate: beta.growthRate }))

  describe('the debt half — untouched, and must match the workbook exactly', () => {
    it('splits the capital in the funded proportions (H23, H24)', () => {
      expect(wacc.equityRatio).toBeCloseTo(WB.equityRatio, 10)
      expect(wacc.debtRatio).toBeCloseTo(WB.debtRatio, 10)
    })

    it('weights, tax-shields and nets the debt cost (I24, K24, L24)', () => {
      expect(wacc.debtComponentPreTax).toBeCloseTo(WB.debtComponentPreTax, 10)
      expect(wacc.debtTaxShield).toBeCloseTo(WB.debtTaxShield, 10)
      expect(wacc.debtComponent).toBeCloseTo(WB.debtComponent, 10)
    })

    it('reaches the same debt cost by both of the sheet\'s routes (K22 x H24 == L24)', () => {
      // The sheet shows K22 but computes E26 the long way. If the two ever disagree, one
      // of them is wrong and the screen would be showing a figure the answer is not using.
      expect(wacc.costOfDebtAfterTax).toBeCloseTo(WB.costOfDebtAfterTax, 10)
      expect(wacc.debtRatio * wacc.costOfDebtAfterTax).toBeCloseTo(wacc.debtComponent, 12)
    })
  })

  describe('CORRECTION 2 — cost of equity uses the market PREMIUM', () => {
    it('is risk-free + beta x (market - risk-free)', () => {
      expect(wacc.marketPremium).toBeCloseTo(DEFAULT_INPUTS.marketRate - DEFAULT_INPUTS.riskFreeRate, 12)
      expect(wacc.costOfEquity).toBeCloseTo(FIX.costOfEquity, 10)
    })

    it('SENTINEL: does not double-count the risk-free rate (K21 as written)', () => {
      expect(wacc.costOfEquity).not.toBeCloseTo(WB.DEFECT_costOfEquity, 5)
      // The gap is exactly beta x riskFree — the term the workbook failed to subtract.
      const overstatement = WB.DEFECT_costOfEquity - wacc.costOfEquity
      expect(overstatement).toBeCloseTo(DEFAULT_INPUTS.beta * DEFAULT_INPUTS.riskFreeRate, 9)
    })

    /* ── CORRECTION 4 (owner ruling 2026-07-29) ────────────────────────────────────
       The CAPM figure is FINAL. The workbook applied two further multipliers before
       weighting it; both were removed as indefensible — inflation is already inside the
       nominal bond and index rates, and a company's own growth is not a component of the
       rate at which its cash flows are discounted. */
    it('CORRECTION 4: applies NOTHING on top of CAPM — no inflation, no growth step', () => {
      // The intermediates are gone from the result shape entirely. A screen reading them
      // would render `undefined`, which is the point: there is no such stage any more.
      expect(wacc.costOfEquityPostInflation).toBeUndefined()
      expect(wacc.costOfEquityPostGrowth).toBeUndefined()

      // And the equity half is weighted from the CAPM figure itself.
      expect(wacc.equityComponent).toBeCloseTo(wacc.equityRatio * wacc.costOfEquity, 12)
    })

    it('CORRECTION 4 SENTINEL: neither multiplier can creep back in', () => {
      // Re-adding either would leave the arithmetic internally consistent, so only a
      // pinned value catches it. These are the figures THIS MODEL published until
      // 2026-07-29 — not source defects, but superseded answers.
      expect(wacc.costOfEquity).not.toBeCloseTo(WB.SUPERSEDED_costOfEquityPostInflation, 6)
      expect(wacc.costOfEquity).not.toBeCloseTo(WB.SUPERSEDED_costOfEquityPostGrowth, 6)
      expect(wacc.equityComponent).not.toBeCloseTo(WB.SUPERSEDED_equityComponent, 6)
      expect(wacc.wacc).not.toBeCloseTo(WB.SUPERSEDED_wacc, 6)
    })

    it('CORRECTION 4: inflationRate and growthRate are not inputs, and cannot be smuggled in', () => {
      // A caller that still sends them must not move the answer — otherwise the ruling
      // holds only for callers that happen to have been updated.
      const withBoth = computeWacc(Object.assign({}, DEFAULT_INPUTS, {
        inflationRate: 0.065,
        growthRate: 0.04245666083
      }))
      expect(withBoth.wacc).toBeCloseTo(FIX.wacc, 12)
      expect(withBoth.inputs.inflationRate).toBeUndefined()
      expect(withBoth.inputs.growthRate).toBeUndefined()
      // ...and neither is reported as having been defaulted, because neither is an input.
      expect(withBoth.defaultedInputs).not.toContain('inflationRate')
      expect(withBoth.defaultedInputs).not.toContain('growthRate')
    })
  })

  describe('the answer (E26)', () => {
    it('the equity half now contributes (I23)', () => {
      expect(wacc.equityComponent).toBeCloseTo(FIX.equityComponent, 10)
    })

    it('SENTINEL: the equity half is never annihilated again', () => {
      // I23 = 0 is the single most consequential defect in this workbook: it published the
      // debt cost alone as the "Weighted Average Cost of Capital".
      expect(wacc.equityComponent).not.toBeCloseTo(WB.DEFECT_equityComponent, 6)
      expect(wacc.equityComponent).toBeGreaterThan(0)
    })

    it('blends both halves into the WACC', () => {
      expect(wacc.wacc).toBeCloseTo(FIX.wacc, 10)
      expect(wacc.wacc).toBeCloseTo(wacc.equityComponent + wacc.debtComponent, 12)
    })

    it('SENTINEL: never republishes the workbook\'s 1.62%', () => {
      expect(wacc.wacc).not.toBeCloseTo(WB.DEFECT_wacc, 4)
      // Sanity band: a real business's blended funding cost sits between its cheapest
      // money (after-tax debt) and its dearest (equity).
      expect(wacc.wacc).toBeGreaterThan(wacc.costOfDebtAfterTax)
      expect(wacc.wacc).toBeLessThan(wacc.costOfEquity)
    })
  })
})

describe('Cost of Capital — blanks, and the R8 no-silent-defaults rule', () => {
  it('a supplied 0 is data; a blank is an absent period', () => {
    // This distinction IS correction 1. Conflating them is what broke the workbook.
    const withZero = computeBetaHelper(Object.assign({}, DEFAULT_INPUTS, {
      equityValues: [1000, 0, 2000],
      sharesIssued: [10, 10, 10]
    }))
    expect(withZero.company.periods).toBe(3)

    const withBlank = computeBetaHelper(Object.assign({}, DEFAULT_INPUTS, {
      equityValues: [1000, null, 2000],
      sharesIssued: [10, 10, 10]
    }))
    expect(withBlank.company.periods).toBe(2)
    // Growth still runs first-filled to last-filled, unaffected by the hole.
    expect(withBlank.growthRate).toBeCloseTo(1, 10)
  })

  it('names every input that fell back to the sample', () => {
    const bare = computeBetaHelper({})
    expect(bare.defaultedInputs).toEqual(
      expect.arrayContaining(['indexValues', 'equityValues', 'sharesIssued', 'marketReturnRate'])
    )

    const supplied = computeWacc(Object.assign({}, DEFAULT_INPUTS, { growthRate: 0.04 }))
    expect(supplied.defaultedInputs).toEqual([])
  })

  it('names every WACC input it fell back on, and nothing it did not', () => {
    // R8: a figure computed on a sample default is always declared. The list is now
    // exactly the seven scalars the WACC still takes — correction (4) removed two.
    const bare = computeWacc({})
    expect(bare.defaultedInputs.slice().sort()).toEqual([
      'beta', 'borrowRate', 'debt', 'equity', 'marketRate', 'riskFreeRate', 'taxRate'
    ])

    const supplied = computeWacc(DEFAULT_INPUTS)
    expect(supplied.defaultedInputs).toEqual([])
  })
})

describe('Cost of Capital — the guard-rails', () => {
  it('warns on an implausible beta instead of passing it on quietly', () => {
    // Feed the model the workbook's ORIGINAL broken shape — a series whose last slot is
    // blank AND whose spread is dominated by it — and confirm the helper now objects.
    const wild = computeBetaHelper(Object.assign({}, DEFAULT_INPUTS, {
      equityValues: [1000, 50000, 1000, 90000],
      sharesIssued: [10, 10, 10, 10]
    }))
    expect(wild.warnings).toContain(WARN.VOLATILITY_BETA_ATYPICAL)
  })

  it('warns when there are too few periods to measure a spread', () => {
    const thin = computeBetaHelper(Object.assign({}, DEFAULT_INPUTS, {
      indexValues: [4393, 4463],
      equityValues: [1000, 1100],
      sharesIssued: [10, 10]
    }))
    expect(thin.warnings).toContain(WARN.FEW_PERIODS_MARKET)
    expect(thin.warnings).toContain(WARN.FEW_PERIODS_COMPANY)
  })

  it('never returns NaN or Infinity, however degenerate the input', () => {
    const degenerate = [
      { indexValues: [], equityValues: [], sharesIssued: [] },
      { indexValues: [100, 100, 100], equityValues: [500, 600], sharesIssued: [0, 0] },
      { marketReturnRate: 0 }
    ]
    degenerate.forEach((inputs) => {
      const r = computeBetaHelper(Object.assign({}, DEFAULT_INPUTS, inputs));
      [r.growthRate, r.roiBeta, r.volatilityBeta, r.market.average, r.company.average]
        .forEach(v => expect(Number.isFinite(v)).toBe(true))
    })
  })

  it('a flat market has no volatility, and says so rather than dividing by zero', () => {
    const flat = computeBetaHelper(Object.assign({}, DEFAULT_INPUTS, {
      indexValues: [4500, 4500, 4500, 4500]
    }))
    expect(flat.market.volatilityPct).toBe(0)
    expect(flat.warnings).toContain(WARN.MARKET_VOLATILITY_ZERO)
    expect(Number.isFinite(flat.volatilityBeta)).toBe(true)
  })
})

describe('Cost of Capital — the assembled payload (what the screen receives)', () => {
  it('CORRECTION 4: the helper\'s growth no longer reaches the WACC (the E10 wiring is gone)', () => {
    const report = computeCostOfCapital({})

    // The helper still derives it — it is what the ROI beta is built from...
    expect(report.beta.growthRate).toBeCloseTo(FIX.growthRate, 10)
    expect(report.betaSuggestions.roi).toBeCloseTo(FIX.roiBeta, 8)

    // ...but nothing carries it into the calculation, and `growthSource` is gone with it:
    // there is no longer a choice of source to report.
    expect(report.wacc.inputs.growthRate).toBeUndefined()
    expect(report.growthSource).toBeUndefined()
    expect(report.wacc.wacc).toBeCloseTo(FIX.wacc, 10)
  })

  it('CORRECTION 4: a caller who still sends a growth rate gets the same answer', () => {
    // The strongest form of the ruling: growth cannot move the WACC by ANY route, not
    // merely by the route that was unwired. A screen left un-updated changes nothing.
    const plain = computeCostOfCapital({})
    const withGrowth = computeCostOfCapital({ growthRate: 0.10 })
    const withBoth = computeCostOfCapital({ growthRate: 0.10, inflationRate: 0.20 })

    expect(withGrowth.wacc.wacc).toBeCloseTo(plain.wacc.wacc, 12)
    expect(withBoth.wacc.wacc).toBeCloseTo(plain.wacc.wacc, 12)
    expect(plain.wacc.wacc).toBeCloseTo(FIX.wacc, 10)
  })

  it('offers both betas but reports the one the answer was actually built on', () => {
    // The workbook hand-enters beta (E8 = 0.52) and only NOTES the helper's figures. The
    // suggestions are advisory; `inUse` must be the beta the returned WACC used, or the
    // screen would credit the answer to a number that never entered it.
    const report = computeCostOfCapital({})
    expect(report.betaSuggestions.roi).toBeCloseTo(FIX.roiBeta, 8)
    expect(report.betaSuggestions.volatility).toBeCloseTo(FIX.volatilityBeta, 8)
    expect(report.betaSuggestions.inUse).toBe(DEFAULT_INPUTS.beta)
    expect(report.betaSuggestions.inUse).not.toBe(report.betaSuggestions.roi)
  })

  it('adopting a suggested beta changes the answer, and the model reflects it', () => {
    const adopted = computeCostOfCapital({ beta: 0.47226541524 })
    expect(adopted.betaSuggestions.inUse).toBeCloseTo(FIX.roiBeta, 8)
    expect(adopted.wacc.wacc).toBeLessThan(FIX.wacc) // lower beta, cheaper equity
  })
})

describe('Cost of Capital — the standard-deviation helper', () => {
  it('is the population form (STDEV.P), matching the workbook', () => {
    // 2,4,4,4,5,5,7,9 is the textbook example: population sd 2, sample sd ~2.138.
    expect(stdDevP([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 12)
  })

  it('an empty or single-value series has no spread, not a division by zero', () => {
    expect(stdDevP([])).toBe(0)
    expect(stdDevP([42])).toBe(0)
  })
})

/**
 * The hurdle-rate test (owner-ruled 2026-07-28). NOT from the workbook — the workbook
 * stops at the WACC — so there are no cell references to check against. Instead the
 * scenarios use round numbers whose every figure can be verified by hand in one line.
 */
describe('Cost of Capital — the hurdle-rate test', () => {
  /* A 10% cost of capital and a $100,000 investment: every derived figure is exact. */
  const HURDLE_RATE = 0.10
  const COST = 100000

  it('clears the hurdle, and reports the margin in both percentage points and money', () => {
    const t = computeHurdleTest({ investmentCost: COST, annualReturn: 12000 }, HURDLE_RATE)
    expect(t.verdict).toBe(HURDLE.CLEARS)
    expect(t.returnRate).toBeCloseTo(0.12, 12) //           12,000 / 100,000
    expect(t.requiredAnnualReturn).toBeCloseTo(10000, 9) // 100,000 x 10%
    expect(t.marginRate).toBeCloseTo(0.02, 12) //           12% - 10%
    expect(t.marginAmount).toBeCloseTo(2000, 9) //          12,000 - 10,000
  })

  it('falls short, and the shortfall is signed rather than reported as a gap', () => {
    // A negative margin, not an absolute one: the screen decides how to word a shortfall,
    // and cannot recover the direction from a figure the engine has already flattened.
    const t = computeHurdleTest({ investmentCost: COST, annualReturn: 8000 }, HURDLE_RATE)
    expect(t.verdict).toBe(HURDLE.SHORT)
    expect(t.marginRate).toBeCloseTo(-0.02, 12)
    expect(t.marginAmount).toBeCloseTo(-2000, 9)
  })

  it('landing exactly on the hurdle is its own verdict, neither pass nor fail', () => {
    const t = computeHurdleTest({ investmentCost: COST, annualReturn: 10000 }, HURDLE_RATE)
    expect(t.verdict).toBe(HURDLE.MEETS)
    expect(t.marginRate).toBeCloseTo(0, 12)
    expect(t.marginAmount).toBeCloseTo(0, 9)
  })

  it('a break-even investment at the REAL wacc still reads as MEETS, not a 1e-18 margin', () => {
    // The reason HURDLE_EPSILON exists, and the figure is chosen, not arbitrary.
    // 0.057117499999999995 is not representable in binary, so `cost x wacc / cost` does
    // not always return the wacc exactly. At $7,000 it lands 6.9e-18 HIGH — without the
    // tolerance an investment priced to break even to the cent is reported with a
    // spurious verdict rather than "exactly meets your cost of capital".
    //
    // 434 of the 2,000 round thousands from $1k to $2m behave this way. The cost MUST be
    // re-chosen whenever the WACC changes: this test used $250,000 until 2026-07-28 (it
    // divides exactly, and a mutant deleting the tolerance survived), then $35,000 — and
    // correction (4) moved the WACC to a value $35,000 ALSO divides exactly, which would
    // have left the test passing while proving nothing all over again. The assertion on
    // the next line is what makes that failure loud instead of silent.
    const wacc = computeCostOfCapital({}).wacc.wacc
    const COST = 7000
    expect((COST * wacc) / COST).not.toBe(wacc) // the float gap this test exists for

    const t = computeHurdleTest({ investmentCost: COST, annualReturn: COST * wacc }, wacc)
    expect(t.verdict).toBe(HURDLE.MEETS)
  })

  it('is not testable until BOTH figures are usable, and says so with null', () => {
    // The advisor is mid-typing, not wrong: nothing to show beats a nonsense figure.
    expect(computeHurdleTest({}, HURDLE_RATE)).toBeNull()
    expect(computeHurdleTest({ investmentCost: COST }, HURDLE_RATE)).toBeNull()
    expect(computeHurdleTest({ annualReturn: 12000 }, HURDLE_RATE)).toBeNull()
    expect(computeHurdleTest({ investmentCost: '', annualReturn: 12000 }, HURDLE_RATE)).toBeNull()
    expect(computeHurdleTest({ investmentCost: null, annualReturn: 12000 }, HURDLE_RATE)).toBeNull()
  })

  it('a zero or negative investment cost has no return percentage, so there is no test', () => {
    expect(computeHurdleTest({ investmentCost: 0, annualReturn: 12000 }, HURDLE_RATE)).toBeNull()
    expect(computeHurdleTest({ investmentCost: -100, annualReturn: 12000 }, HURDLE_RATE)).toBeNull()
  })

  it('a supplied annual return of ZERO is real data, and fails the test rather than vanishing', () => {
    // The blank-vs-zero distinction that the source workbook got wrong (correction 1).
    // An investment expected to earn nothing is a testable investment with a bad answer.
    const t = computeHurdleTest({ investmentCost: COST, annualReturn: 0 }, HURDLE_RATE)
    expect(t).not.toBeNull()
    expect(t.verdict).toBe(HURDLE.SHORT)
    expect(t.returnRate).toBe(0)
    expect(t.marginAmount).toBeCloseTo(-10000, 9)
  })

  it('accepts numbers arriving as JSON strings, without string-concatenating them', () => {
    const t = computeHurdleTest({ investmentCost: '100000', annualReturn: '12000' }, HURDLE_RATE)
    expect(t.verdict).toBe(HURDLE.CLEARS)
    expect(t.returnRate).toBeCloseTo(0.12, 12)
  })

  it('a loss-making investment reports a negative return, not a suppressed one', () => {
    const t = computeHurdleTest({ investmentCost: COST, annualReturn: -5000 }, HURDLE_RATE)
    expect(t.verdict).toBe(HURDLE.SHORT)
    expect(t.returnRate).toBeCloseTo(-0.05, 12)
  })
})

describe('Cost of Capital — the hurdle test inside the assembled model', () => {
  it('is absent until an investment is supplied — the panel shows nothing by default', () => {
    expect(computeCostOfCapital({}).hurdle).toBeNull()
  })

  it('judges against the SAME wacc the response carries, not a re-derived one', () => {
    // The `inUse` reasoning applied to the hurdle: a verdict measured against a different
    // figure from the one shown beside it is exactly the kind of quiet lie a screen would
    // render with confidence. Strict equality, deliberately — close is not the same number.
    const report = computeCostOfCapital({ investmentCost: 250000, annualReturn: 22000 })
    expect(report.hurdle.hurdleRate).toBe(report.wacc.wacc)
  })

  it('gives the worked sample scenario end to end', () => {
    // 5.71% wacc, a $250,000 investment expected to earn $22,000 a year.
    const report = computeCostOfCapital({ investmentCost: 250000, annualReturn: 22000 })
    expect(report.hurdle.verdict).toBe(HURDLE.CLEARS)
    expect(report.hurdle.returnRate).toBeCloseTo(0.088, 12) //          22,000 / 250,000
    expect(report.hurdle.requiredAnnualReturn).toBeCloseTo(14279.375, 5)
    expect(report.hurdle.marginRate).toBeCloseTo(0.0308825, 10)
    expect(report.hurdle.marginAmount).toBeCloseTo(7720.625, 5)
  })

  it('carries a sensitivity line for every input, biggest effect first', () => {
    const rows = computeCostOfCapital({}).sensitivity
    expect(rows.length).toBe(Object.keys(SENSITIVITY_STEP).length)
    // Correction (4) removed inflation from the WACC, so it must no longer be offered as
    // a lever the advisor can pull — a row measuring a figure that does nothing is worse
    // than no row, because it ranks it against six that do.
    expect(rows.map(r => r.key)).not.toContain('inflationRate')

    for (let i = 1; i < rows.length; i++) {
      expect(Math.abs(rows[i - 1].change)).toBeGreaterThanOrEqual(Math.abs(rows[i].change))
    }
    // On the sample the market return leads and the debt share trails — an ordering that
    // would silently invert if the sort compared signed change instead of magnitude
    // (both trailing rows are NEGATIVE, and the larger negative sorts FIRST here).
    expect(rows[0].key).toBe('marketRate')
    expect(rows[rows.length - 1].key).toBe('debtShare')
    expect(rows[rows.length - 2].key).toBe('taxRate')
    expect(rows[rows.length - 1].change).toBeLessThan(0)
  })

  it('measures each line against the SAME wacc the response carries', () => {
    const report = computeCostOfCapital({})
    report.sensitivity.forEach((row) => {
      expect(row.change).toBeCloseTo(row.wacc - report.wacc.wacc, 12)
    })
  })

  it('moves ONE input per line, leaving the others exactly as they were', () => {
    // The claim the screen makes in words. If a line leaked into the next, the figures
    // would compound and every effect after the first would be overstated.
    const base = computeCostOfCapital({})
    const alone = computeSensitivity(base.wacc.inputs, base.wacc.wacc)

    alone.forEach((row) => {
      if (row.key === 'debtShare') { return } // expressed as a mix shift, checked below
      const probe = Object.assign({}, base.wacc.inputs)
      probe[row.key] = probe[row.key] + SENSITIVITY_STEP[row.key]
      expect(computeWacc(probe).wacc).toBeCloseTo(row.wacc, 12)
    })
  })

  it('shifts a POINT of the funding mix, holding the total capital', () => {
    // "$1,000 more debt" is not comparable with the rate rises beside it; a point of the
    // mix is. The total must not change, or the line measures two things at once.
    const base = computeCostOfCapital({})
    const row = base.sensitivity.filter(r => r.key === 'debtShare')[0]
    const capital = base.wacc.inputs.equity + base.wacc.inputs.debt // 80,000

    const probe = Object.assign({}, base.wacc.inputs, { debt: capital * 0.385, equity: capital * 0.615 })
    expect(computeWacc(probe).wacc).toBeCloseTo(row.wacc, 12) // 37.5% + 1 point
    expect(probe.debt + probe.equity).toBeCloseTo(capital, 6)
    // More debt is cheaper here, so the line falls — the only one that does, alongside tax.
    expect(row.change).toBeLessThan(0)
  })

  it('a business with no capital at all reports no mix effect, never a division by zero', () => {
    const rows = computeSensitivity(
      Object.assign({}, DEFAULT_INPUTS, { equity: 0, debt: 0, growthRate: 0 }),
      0
    )
    rows.forEach((row) => {
      expect(Number.isFinite(row.wacc)).toBe(true)
      expect(Number.isFinite(row.change)).toBe(true)
    })
  })

  it('tracks the model: a dearer cost of capital can turn the same investment down', () => {
    // Proof the hurdle is live rather than a static number pasted beside the WACC. Beta
    // 0.52 -> 3.0 lifts the cost of equity far above the investment's 8.8% return.
    const cheap = computeCostOfCapital({ investmentCost: 250000, annualReturn: 22000 })
    const dear = computeCostOfCapital({ investmentCost: 250000, annualReturn: 22000, beta: 3.0 })
    expect(cheap.hurdle.verdict).toBe(HURDLE.CLEARS)
    expect(dear.hurdle.verdict).toBe(HURDLE.SHORT)
    expect(dear.hurdle.hurdleRate).toBeGreaterThan(cheap.hurdle.hurdleRate)
  })
})
