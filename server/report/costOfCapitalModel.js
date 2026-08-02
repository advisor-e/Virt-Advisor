'use strict'

/**
 * Cost of Capital (WACC) model — port of `design/report-source-models/Cost of Capital.xlsx`.
 *
 * Answers: what does the money funding this business actually cost, blending what the
 * owners expect to earn on their equity with what the bank charges on debt? The result is
 * the hurdle an investment must clear to be worth doing.
 *
 * The workbook is two sheets and this file ports both:
 *   - `WACC Calcs` — the calculation itself (`computeWacc`).
 *   - `Beta Calcs` — a helper that derives the company's growth rate and two candidate
 *     BETA figures from a pasted series of index values and shareholders' equity
 *     (`computeBetaHelper`). The workbook's main sheet does NOT read the helper's beta:
 *     `WACC Calcs!E8` is hand-entered, with a note saying "be guided by your Beta calcs".
 *     We keep that relationship — the helper OFFERS a beta, the caller decides — see
 *     `computeCostOfCapital`. The growth rate the helper derives now serves only the
 *     ROI beta (`I9 = F9/F10`); it no longer reaches the WACC — see correction (4).
 *
 * ── CORRECTED FROM THE SOURCE (owner-ruled 2026-07-28, to be fixed in the .xlsx too) ──
 *
 * (1) THE EMPTY TRAILING PERIOD. The company data rows hold twelve slots but the sample
 *     fills eleven (`Beta Calcs!M40:X40`; `X40` is empty). The sheet's own note says
 *     "If you don't have data for one period leave it blank", and its average honours
 *     that (`Y50 = Y43/M37`, where `M37` counts the FILLED periods). Two formulas do not:
 *
 *       a. `AE40 = X40 - M40` reaches for the last SLOT, not the last FILLED period, so
 *          the growth calculation subtracts the opening equity from an empty cell:
 *          `AE42 = AE40/M40` = -2,569,800 / 2,569,800 = **-1**, a -100% growth rate.
 *          That flowed to `WACC Calcs!E10`, and `M19 = L20 + (L20 * E10)` multiplied the
 *          cost of equity by (1 + -1) = 0 — so `I23`, the EQUITY contribution to the
 *          WACC, was zero and the workbook's headline 1.62% was the DEBT cost alone.
 *          Corrected: growth = (last filled - first filled) / first filled = +4.2457%.
 *          (Correction (4) since removes that `E10` wiring altogether, so this defect can
 *          no longer reach the WACC by any route — but the growth figure still feeds the
 *          ROI beta, so getting it right still matters.)
 *
 *       b. `M62 = STDEV.P(M43:X43)` spans all twelve share-value cells. The twelfth is 0
 *          (its own `if(M40=0,0,...)` guard firing on the blank), so a zero share price is
 *          averaged into the spread: the company's "volatility" reads 27.67% when the
 *          eleven real values only range 335.92-350.18. That inflates the volatility beta
 *          to 7.61. Corrected (filled periods only) it is a credible ~0.36.
 *
 *     Both are the same root cause, and correcting it is what makes the helper's two betas
 *     plausible at last: the ROI beta becomes ~0.47, close to the 0.52 a human had already
 *     typed into `E8` by judgement.
 *
 * (2) THE COST-OF-EQUITY FORMULA. `K21 = E6 + E7*E8` adds the risk-free rate to
 *     beta x the market RETURN. The Capital Asset Pricing Model multiplies beta by the
 *     market PREMIUM — the market return less the risk-free rate — because the reward for
 *     bearing risk is only the excess over what a government bond pays for none. As
 *     written the risk-free rate is counted twice, overstating the cost of equity by
 *     beta x riskFree (2.03 points on the sample: 8.57% against 6.55%).
 *     Corrected: `costOfEquity = riskFree + beta * (marketRate - riskFree)`.
 *
 * (3) `Beta Calcs!M52 = $Y$17 - M43` measures each of the COMPANY's share values against
 *     the MARKET index average (4,660) instead of the company's own (343). It should be
 *     `$Y$50`. Traced: this row feeds only the displayed variance/volatility figures on
 *     that sheet (`Y52`/`M54`/`Y54`/`N56`/`M56`) — the volatility beta reaches
 *     `F15` via `P62 = M62/Y50`, which is clean — so it never touched the WACC. Corrected
 *     here anyway (`companyVarianceFromOwnMean`) so the ported figures agree with the sheet
 *     once the .xlsx is fixed.
 *
 * (4) THE TWO ADJUSTMENTS ON TOP OF CAPM — REMOVED (owner-ruled 2026-07-29). The workbook
 *     does not stop at the CAPM figure. It applies two further multipliers before the cost
 *     of equity is weighted into the WACC:
 *
 *         L20 "Post Inflation"   = K21 * (1 + E9)    // E9 = "Expected Real Inflation Rate"
 *         M19 "Post Real Growth" = L20 * (1 + E10)   // E10 = the company's own growth
 *         I23                    = H23 * M19         // the equity contribution
 *
 *     Both are wrong, for different reasons, and neither survives:
 *
 *       a. INFLATION IS ALREADY IN THE INPUTS. `E6` is a government bond rate and `E7` a
 *          share index return — market rates quoted in NOMINAL terms, so expected inflation
 *          is inside them already. Multiplying the result by (1 + inflation) counts it a
 *          second time. A model works entirely in nominal terms or entirely in real ones;
 *          this one took nominal inputs and then inflated them. (The sheet's own label,
 *          "Expected REAL Inflation Rate", shows a real-terms model was intended — but the
 *          inputs feeding it were never converted.)
 *
 *       b. GROWTH IS NOT A COMPONENT OF A DISCOUNT RATE. The cost of equity is what
 *          investors REQUIRE for bearing risk, and under CAPM risk is carried entirely by
 *          beta. How fast the company happened to grow does not change what its
 *          shareholders demand. Growth belongs in the cash flows being discounted, never in
 *          the rate they are discounted at — counting it in both places is double-counting.
 *          It also runs backwards as an incentive: the faster a company grew, the higher
 *          its hurdle became, so a good year made every future investment look worse.
 *          (Separately, the figure was a TOTAL change across the supplied window used as
 *          though it were a per-year rate — so it was the wrong number even on its own
 *          terms. That mattered when it fed the WACC; it no longer does.)
 *
 *     Corrected: the equity contribution weights the CAPM cost of equity directly
 *     (`I23 = H23 * K21`). On the sample the WACC moves 6.16% -> 5.71%. `E9` and `E10`
 *     are no longer inputs to the WACC at all — a rate that changes nothing must not sit
 *     on screen inviting an advisor to tune it. The growth rate is still derived by the
 *     Beta helper, where it legitimately drives the ROI beta.
 *
 * ── FIDELITY NOTES — reproduced as the source has them, NOT corrected ──
 *   - `K22` (cost of debt after tax) is displayed but not referenced by `E26`, which
 *     reaches the same figure the long way (`I24 - K24`). Both are returned, and a test
 *     pins that they agree.
 *   - Beta is an INPUT to the WACC, hand-entered. The helper's betas are advisory.
 *
 * Defaults NEVER substitute silently (the R8 ruling, 2026-07-19): any input that fell
 * back to the workbook's sample value is named in the result's `defaultedInputs`.
 *
 * Class: **Decision** (see `design/MODEL-CLASSIFICATION.md`) — the client's real figures,
 * typed in. No file intake, no "Illustrative" badge, nothing goes to an LLM.
 *
 * Pure, side-effect free, backend-only per the Stack Constitution.
 */

/**
 * Fewest filled periods a spread is meaningful over. Below this a standard deviation is
 * arithmetic noise, so the helper reports the shortfall instead of a confident beta.
 */
const MIN_PERIODS = 3

/** The band a beta normally falls in. Outside it, the helper warns rather than stays silent. */
const TYPICAL_BETA_MIN = 0.3
const TYPICAL_BETA_MAX = 2.5

/** Warning codes. The SCREEN translates these — never put English in the engine. */
const WARN = {
  FEW_PERIODS_MARKET: 'FEW_PERIODS_MARKET',
  FEW_PERIODS_COMPANY: 'FEW_PERIODS_COMPANY',
  ROI_BETA_ATYPICAL: 'ROI_BETA_ATYPICAL',
  VOLATILITY_BETA_ATYPICAL: 'VOLATILITY_BETA_ATYPICAL',
  MARKET_RETURN_ZERO: 'MARKET_RETURN_ZERO',
  MARKET_VOLATILITY_ZERO: 'MARKET_VOLATILITY_ZERO'
}

/**
 * Hurdle-test verdicts. Like `WARN`, these are codes — the SCREEN owns the English.
 * `MEETS` exists so an investment landing exactly on the cost of capital is not forced
 * into a pass or a fail it does not deserve.
 */
const HURDLE = {
  CLEARS: 'CLEARS',
  MEETS: 'MEETS',
  SHORT: 'SHORT'
}

/**
 * How close to the hurdle counts as landing ON it. Two figures derived through different
 * arithmetic will not compare exactly equal in binary floating point, so an investment
 * priced to break even to the cent would otherwise be reported as clearing or failing by
 * a margin of 1e-17. A tenth of a basis point is far below anything an advisor can act on.
 */
const HURDLE_EPSILON = 1e-6

/**
 * Coerce to a finite number (accepting JSON-string numbers), else the fallback. The route
 * receives raw JSON, so a numeric field arriving as text must not string-concatenate.
 * @param {*} v
 * @param {number} fallback
 * @returns {number}
 */
function num (v, fallback) {
  if (typeof v === 'number') { return Number.isFinite(v) ? v : fallback }
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : fallback
}

/** Guard every division: a zero denominator yields 0, never NaN/Infinity. */
function div (a, b) {
  return b ? a / b : 0
}

/**
 * Is this series slot FILLED? A blank period is `null`/`undefined`/`''` — deliberately
 * distinct from a supplied 0, which is real data. This distinction is the whole of
 * correction (1): the workbook conflated the two and read a blank as a zero.
 * @param {*} v
 * @returns {boolean}
 */
function isFilled (v) {
  if (v === null || v === undefined || v === '') { return false }
  return Number.isFinite(typeof v === 'number' ? v : parseFloat(v))
}

/**
 * Keep only the filled slots of a series, as numbers, preserving order.
 * @param {Array<*>} series
 * @returns {number[]}
 */
function filled (series) {
  if (!Array.isArray(series)) { return [] }
  return series.filter(isFilled).map(function (v) { return num(v, 0) })
}

/** Sum of a numeric array. */
function sum (xs) {
  return xs.reduce(function (a, b) { return a + b }, 0)
}

/**
 * Population standard deviation — Excel `STDEV.P`, which is what the workbook uses
 * (`_xlfn.stdev.p`). Divides by n, not n-1.
 * @param {number[]} xs
 * @returns {number}
 */
function stdDevP (xs) {
  if (!xs.length) { return 0 }
  const mean = div(sum(xs), xs.length)
  const squares = xs.map(function (x) { return Math.pow(x - mean, 2) })
  return Math.sqrt(div(sum(squares), xs.length))
}

/**
 * The workbook's own sample scenario. Cell references are given so every figure can be
 * checked by hand against the .xlsx.
 * @type {object}
 */
const DEFAULT_INPUTS = {
  /* ── `WACC Calcs` sheet, column E ─────────────────────────────────────────── */
  riskFreeRate: 0.039, //     E6  — 5 Yr Govt Bond Investment Rate
  marketRate: 0.0899, //      E7  — Market Rate (Avg Share Index Return Rate)
  beta: 0.52, //              E8  — hand-entered, "be guided by your Beta calcs"
  taxRate: 0.28, //           E12 — Company Tax Rate
  equity: 50000, //           E14 — Equity (Cash) Invested
  debt: 30000, //             E15 — Debt (Funds Borrowed)
  borrowRate: 0.06, //        E17 — Borrowing (Loan) Rate

  /* `E9` (expected inflation) and `E10` (company real growth) are deliberately absent:
     correction (4) removed both from the WACC, so neither is an input to it any longer.
     The growth rate is still derived on the `Beta Calcs` side for the ROI beta. */

  /* ── `Beta Calcs` sheet ───────────────────────────────────────────────────── */
  /** Market index values, `M10:X10` — twelve months, all filled. */
  indexValues: [4393, 4463, 4730, 4703, 4653, 4731, 4883, 4891, 4846, 4691, 4546, 4394],
  /**
   * Total shareholders' equity, `M40:X40`. ELEVEN filled and a deliberate trailing blank
   * — the sample's own shape, and the shape that broke the workbook (correction 1).
   * Kept exactly so the golden test exercises the real failure case.
   */
  equityValues: [
    2569800, 2580507.5, 2591259.615, 2602056.53, 2612898.432, 2623785.509,
    2634717.948, 2645695.94, 2656719.673, 2667789.338, 2678905.127, null
  ],
  /** Total shares issued, `M41:X41` — constant across the window. */
  sharesIssued: [7650, 7650, 7650, 7650, 7650, 7650, 7650, 7650, 7650, 7650, 7650, 7650],
  /** Market index average ROI %, `F10` — the same figure as `WACC Calcs!E7`. */
  marketReturnRate: 0.0899
}

/**
 * The `Beta Calcs` sheet: derive the company's growth rate and two candidate betas.
 *
 * Both betas are ratios of a company measure to the same market measure:
 *   - ROI (co-variance) beta — `I9 = F9/F10` — company growth / market return.
 *   - Volatility beta        — `I15 = F15/F16` — company spread % / market spread %,
 *     each expressed as standard deviation over its own mean.
 *
 * Blank trailing periods are EXCLUDED throughout (correction 1): a period with no
 * shareholders' equity is absent, not a company briefly worth nothing.
 *
 * @param {object} [inputs] - `indexValues`, `equityValues`, `sharesIssued`, `marketReturnRate`.
 * @returns {{market: object, company: object, growthRate: number, roiBeta: number,
 *   volatilityBeta: number, warnings: string[], defaultedInputs: string[]}}
 */
function computeBetaHelper (inputs) {
  const src = (inputs && typeof inputs === 'object') ? inputs : {}
  const defaultedInputs = []

  function series (key) {
    if (Array.isArray(src[key]) && src[key].length) { return src[key] }
    defaultedInputs.push(key)
    return DEFAULT_INPUTS[key]
  }
  function scalar (key) {
    if (isFilled(src[key])) { return num(src[key], DEFAULT_INPUTS[key]) }
    defaultedInputs.push(key)
    return DEFAULT_INPUTS[key]
  }

  const indexValues = series('indexValues')
  const equityValues = series('equityValues')
  const sharesIssued = series('sharesIssued')
  const marketReturnRate = scalar('marketReturnRate')

  const warnings = []

  /* ── Market side (`M10:X10`, `M7`, `Y10`, `Y17`, `M29`, `P29`) ───────────────── */
  const indexFilled = filled(indexValues)
  const marketTotal = sum(indexFilled) //                     Y10  = 55,924
  const marketAverage = div(marketTotal, indexFilled.length) // Y17 = 4,660.333333
  const marketStdDev = stdDevP(indexFilled) //                M29  = 169.3946739
  const marketVolatilityPct = div(marketStdDev, marketAverage) // P29 = 0.03634818838

  if (indexFilled.length < MIN_PERIODS) { warnings.push(WARN.FEW_PERIODS_MARKET) }

  /* ── Company side (`M40:X40`, `M41:X41`, `M43`, `M37`, `Y43`, `Y50`, `M62`, `P62`) ──
     Share value per period = that period's equity / that period's shares (`M43`). A
     period counts only when its equity is filled AND its share count is usable, so a
     blank can never enter as a zero share price. */
  const shareValues = []
  for (let i = 0; i < equityValues.length; i++) {
    if (!isFilled(equityValues[i])) { continue }
    const shares = isFilled(sharesIssued[i]) ? num(sharesIssued[i], 0) : 0
    if (!shares) { continue }
    shareValues.push(div(num(equityValues[i], 0), shares))
  }

  const companyPeriods = shareValues.length //                M37 = 11 (filled count)
  const companyTotal = sum(shareValues) //                    Y43 = 3,773.089622
  const companyAverage = div(companyTotal, companyPeriods) // Y50 = 343.0081475
  const companyStdDev = stdDevP(shareValues) //               M62, blanks excluded
  const companyVolatilityPct = div(companyStdDev, companyAverage) // P62

  if (companyPeriods < MIN_PERIODS) { warnings.push(WARN.FEW_PERIODS_COMPANY) }

  /* Correction (3): the sheet's displayed variance row measured the company against the
     MARKET mean. Each company share value against its OWN mean is what it meant. */
  const companyVarianceFromOwnMean = shareValues.map(function (v) { return companyAverage - v })

  /* ── Growth rate (`AE40`, `AE42`, `F9`) — correction (1a) ─────────────────────
     Last FILLED equity against the first, not the last slot. */
  const equityFilled = filled(equityValues)
  const openingEquity = equityFilled.length ? equityFilled[0] : 0
  const closingEquity = equityFilled.length ? equityFilled[equityFilled.length - 1] : 0
  const equityChange = closingEquity - openingEquity //        AE40 corrected
  const growthRate = div(equityChange, openingEquity) //       AE42 corrected = +0.042456657

  /* ── The two candidate betas (`I9`, `I15`) ───────────────────────────────────── */
  if (!marketReturnRate) { warnings.push(WARN.MARKET_RETURN_ZERO) }
  if (!marketVolatilityPct) { warnings.push(WARN.MARKET_VOLATILITY_ZERO) }

  const roiBeta = div(growthRate, marketReturnRate) //         I9
  const volatilityBeta = div(companyVolatilityPct, marketVolatilityPct) // I15

  /* Guard-rails: a beta outside the normal band is reported, never passed on quietly.
     The workbook offered -11.12 and 7.61 with no hint either was absurd. */
  function atypical (b) { return b < TYPICAL_BETA_MIN || b > TYPICAL_BETA_MAX }
  if (atypical(roiBeta)) { warnings.push(WARN.ROI_BETA_ATYPICAL) }
  if (atypical(volatilityBeta)) { warnings.push(WARN.VOLATILITY_BETA_ATYPICAL) }

  return {
    market: {
      periods: indexFilled.length, //   M7
      total: marketTotal, //            Y10
      average: marketAverage, //        Y17
      stdDev: marketStdDev, //          M29
      volatilityPct: marketVolatilityPct //  P29 / F16
    },
    company: {
      periods: companyPeriods, //       M37
      shareValues, //      M43:X43 (filled only)
      total: companyTotal, //           Y43
      average: companyAverage, //       Y50
      stdDev: companyStdDev, //         M62
      volatilityPct: companyVolatilityPct, // P62 / F15
      varianceFromOwnMean: companyVarianceFromOwnMean, // M52:X52, corrected (3)
      openingEquity, //  M40
      closingEquity, //  last filled of M40:X40
      equityChange //     AE40, corrected
    },
    growthRate, //          AE42 / F9, corrected
    roiBeta, //                I9
    volatilityBeta, //  I15
    warnings,
    defaultedInputs
  }
}

/**
 * The `WACC Calcs` sheet: blend the cost of equity and the after-tax cost of debt in the
 * proportions the business is funded.
 *
 * @param {object} [inputs] - the scalar inputs above. `inflationRate` and `growthRate` are
 *   NOT among them: correction (4) removed both from the WACC, and accepting them here
 *   would let a caller believe they still moved the answer.
 * @returns {object} every intermediate the sheet shows, plus `wacc` (`E26`).
 */
function computeWacc (inputs) {
  const src = (inputs && typeof inputs === 'object') ? inputs : {}
  const defaultedInputs = []

  function scalar (key) {
    if (isFilled(src[key])) { return num(src[key], DEFAULT_INPUTS[key]) }
    defaultedInputs.push(key)
    return DEFAULT_INPUTS[key]
  }

  const riskFreeRate = scalar('riskFreeRate') //   E6
  const marketRate = scalar('marketRate') //       E7
  const beta = scalar('beta') //                   E8
  const taxRate = scalar('taxRate') //             E12
  const equity = scalar('equity') //               E14
  const debt = scalar('debt') //                   E15
  const borrowRate = scalar('borrowRate') //       E17

  /* ── Cost of equity — CAPM, corrected (2) ────────────────────────────────────
     K21 as written: riskFree + marketRate * beta (double-counts the risk-free rate).
     This is the FINAL cost of equity: correction (4) removed the sheet's two further
     multipliers (`L20` post-inflation, `M19` post-growth), so nothing else is applied. */
  const marketPremium = marketRate - riskFreeRate
  const costOfEquity = riskFreeRate + beta * marketPremium //        K21, corrected

  /* ── Cost of debt ────────────────────────────────────────────────────────────
     Interest is deductible, so the real cost is the rate less the tax it saves. */
  const costOfDebtAfterTax = borrowRate - (borrowRate * taxRate) //  K22

  /* ── Capital mix ─────────────────────────────────────────────────────────────── */
  const capital = equity + debt
  const equityRatio = div(equity, capital) //                        H23 = 0.625
  const debtRatio = div(debt, capital) //                            H24 = 0.375

  /* ── The two weighted contributions, and the answer ──────────────────────────── */
  const equityComponent = equityRatio * costOfEquity //              I23, corrected (4)
  const debtComponentPreTax = debtRatio * borrowRate //              I24
  const debtTaxShield = debtComponentPreTax * taxRate //             K24
  const debtComponent = debtComponentPreTax - debtTaxShield //       L24
  const wacc = equityComponent + debtComponent //                    E26

  return {
    inputs: {
      riskFreeRate,
      marketRate,
      beta,
      taxRate,
      equity,
      debt,
      borrowRate
    },
    marketPremium,
    costOfEquity, //                          K21 (corrected)
    costOfDebtAfterTax, //               K22
    capital,
    equityRatio, //                             H23
    debtRatio, //                                 H24
    equityComponent, //                     I23
    debtComponentPreTax, //             I24
    debtTaxShield, //                         K24
    debtComponent, //                         L24
    wacc, //                                           E26
    defaultedInputs
  }
}

/**
 * The hurdle-rate test (owner-ruled 2026-07-28) — does a proposed investment earn more
 * than the money funding it costs?
 *
 * NOT in the workbook. The workbook stops at the WACC; this turns that figure into the
 * decision it exists to serve. The arithmetic is deliberately plain — the value is in the
 * framing, and in giving the answer in MONEY as well as percentage points, because
 * "it must earn $15,400 a year and it is expected to earn $22,000" is a sentence an
 * advisor can say to a client, where "8.80% beats 6.16%" is not.
 *
 * The hurdle is the WACC exactly as calculated, with NO risk margin added. Some advisors
 * add a buffer for a risky project; the workbook does not, and inventing one here would
 * assert a judgement no input has authorised. An optional buffer is a later owner ruling.
 *
 * Returns `null` — the screen shows nothing — unless BOTH figures are usable. A blank or
 * zero investment cost has no return percentage to report, and guessing at one (or
 * rendering a division by zero) is worse than staying quiet.
 *
 * @param {object} src - raw request body; reads `investmentCost` and `annualReturn`.
 * @param {number} hurdleRate - the WACC this test judges against, as a decimal.
 * @returns {?{investmentCost: number, annualReturn: number, returnRate: number,
 *   hurdleRate: number, requiredAnnualReturn: number, marginRate: number,
 *   marginAmount: number, verdict: string}}
 */
function computeHurdleTest (src, hurdleRate) {
  if (!isFilled(src.investmentCost) || !isFilled(src.annualReturn)) { return null }

  const investmentCost = num(src.investmentCost, 0)
  const annualReturn = num(src.annualReturn, 0)

  /* A cost of zero has no percentage; a negative cost is not an investment. Both are
     "nothing to test" rather than an error — the advisor is mid-typing, not wrong. */
  if (investmentCost <= 0) { return null }

  const returnRate = div(annualReturn, investmentCost)
  const requiredAnnualReturn = investmentCost * hurdleRate
  const marginRate = returnRate - hurdleRate
  const marginAmount = annualReturn - requiredAnnualReturn

  let verdict = HURDLE.MEETS
  if (marginRate > HURDLE_EPSILON) {
    verdict = HURDLE.CLEARS
  } else if (marginRate < -HURDLE_EPSILON) {
    verdict = HURDLE.SHORT
  }

  return {
    investmentCost,
    annualReturn,
    returnRate,
    hurdleRate,
    requiredAnnualReturn,
    marginRate,
    marginAmount,
    verdict
  }
}

/**
 * How far each input is nudged to measure its effect. One percentage point for every
 * rate, 0.1 for beta (which is a ratio, not a rate, and moves on a different scale).
 * Small enough that the answer stays in the neighbourhood the advisor is actually in.
 */
const SENSITIVITY_STEP = {
  riskFreeRate: 0.01,
  marketRate: 0.01,
  beta: 0.1,
  taxRate: 0.01,
  borrowRate: 0.01,
  debtShare: 0.01
}

/**
 * "What moves the answer most" — the WACC recomputed with each input raised on its own.
 *
 * NOT in the workbook. It answers the question a build-up cannot: of everything on this
 * screen, which figure is actually driving the answer, and which barely matters? An
 * advisor who knows the borrowing rate moves it twelve times as much as the tax rate
 * knows where to spend the conversation.
 *
 * ONE input changes per line, everything else held. That is the whole meaning of the
 * figure, and it is stated on screen too — a reader who assumes the lines combine would
 * badly overestimate the effect of changing two things at once.
 *
 * `debtShare` is expressed as a point of the funding mix rather than an amount, because
 * "a point more debt" is comparable with the rate rises beside it, where "$1,000 more
 * debt" is not. It moves capital from equity to debt, holding the total.
 *
 * @param {object} waccInputs - the SAME inputs the headline WACC was built from.
 * @param {number} baseWacc - that WACC, so a line's change is measured against the
 *   figure actually on screen rather than one recomputed slightly differently.
 * @returns {Array<{key: string, step: number, wacc: number, change: number}>} biggest
 *   absolute effect first; ties keep their declaration order.
 */
function computeSensitivity (waccInputs, baseWacc) {
  const capital = num(waccInputs.equity, 0) + num(waccInputs.debt, 0)

  const rows = Object.keys(SENSITIVITY_STEP).map(function (key) {
    const step = SENSITIVITY_STEP[key]
    let probe

    if (key === 'debtShare') {
      /* Hold the total and move a point of it across. With no capital at all there is no
         mix to shift, and the line correctly reports no effect rather than dividing by
         zero — `div` would return 0 and quietly invent a 100% debt share. */
      const debtRatio = div(num(waccInputs.debt, 0), capital)
      const newDebt = capital * (debtRatio + step)
      probe = Object.assign({}, waccInputs, { debt: newDebt, equity: capital - newDebt })
    } else {
      probe = Object.assign({}, waccInputs, { [key]: num(waccInputs[key], 0) + step })
    }

    const wacc = computeWacc(probe).wacc
    return { key, step, wacc, change: wacc - baseWacc }
  })

  return rows.sort(function (a, b) { return Math.abs(b.change) - Math.abs(a.change) })
}

/**
 * The whole model, assembled HERE rather than in the route (the marginBreakeven lesson:
 * the golden test must exercise exactly what the screen receives).
 *
 * NOTHING is wired from the helper into the WACC. The workbook wired the growth rate
 * across (`E10 = 'Beta Calcs'!F9`); correction (4) removed that path, because growth is
 * not a component of a discount rate. Beta was never wired either — the workbook
 * hand-enters it, and the helper's betas stay advisory, which is what `betaSuggestions`
 * offers the screen for a one-click adopt. The helper is now purely advisory in both
 * directions: it suggests, and the WACC is built only from what the advisor typed.
 *
 * @param {object} [inputs]
 * @returns {{beta: object, wacc: object, betaSuggestions: object, hurdle: ?object,
 *   sensitivity: Array}} - `hurdle` is null unless the caller supplied a testable
 *   investment.
 */
function computeCostOfCapital (inputs) {
  const src = (inputs && typeof inputs === 'object') ? inputs : {}

  const betaHelper = computeBetaHelper(src)

  /* Computed ONCE and reused: two calls could not disagree today, but `inUse` claiming a
     beta the returned `wacc` was not built from is precisely the kind of quiet lie a
     screen would render with confidence. */
  const wacc = computeWacc(src)

  return {
    beta: betaHelper,
    wacc,
    betaSuggestions: {
      roi: betaHelper.roiBeta, //             I9  — from growth vs market return
      volatility: betaHelper.volatilityBeta, // I15 — from spread vs market spread
      inUse: wacc.inputs.beta //              E8, the beta this result was actually built on
    },
    /* Judged against the WACC just computed, never a re-derived one — the same reasoning
       that keeps `inUse` honest above. */
    hurdle: computeHurdleTest(src, wacc.wacc),
    /* Measured from the same inputs and the same answer, for the same reason. */
    sensitivity: computeSensitivity(wacc.inputs, wacc.wacc)
  }
}

module.exports = {
  DEFAULT_INPUTS,
  computeBetaHelper,
  computeWacc,
  computeHurdleTest,
  computeSensitivity,
  computeCostOfCapital,
  stdDevP,
  filled,
  isFilled,
  MIN_PERIODS,
  TYPICAL_BETA_MIN,
  TYPICAL_BETA_MAX,
  WARN,
  HURDLE,
  HURDLE_EPSILON,
  SENSITIVITY_STEP
}
