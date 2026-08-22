'use strict'

const {
  DEFAULT_INPUTS,
  computeMultiplePropertyAssessment,
  interestRateSeries,
  chattelsDepreciation,
  yearOneAddBackAmount,
  deductibilityFactor,
  amortiseYear,
  annuityPayment,
  YEARS,
  END_CONVERT,
  END_REPAY,
  ADD_BACK_SETUP,
  ADD_BACK_SETUP_AND_PURCHASE,
  ADD_BACK_NONE,
  DEPRECIABLE_CHATTELS,
  DEPRECIABLE_CHATTELS_AND_BUILDING,
  METHOD_DIMINISHING_VALUE,
  METHOD_STRAIGHT_LINE,
  LOSSES_RING_FENCED,
  LOSSES_OFFSET
} = require('../../server/report/multiplePropertyModel')

/**
 * GOLDEN TEST — Multiple Property Assessment, Phase 1 (one property, ten years).
 *
 * Source: `design/report-source-models/Multiple Property Assessment.xlsx`, sheets
 * `INPUTS`, `MODEL` and `OUTPUTS`. Design artefact:
 * `design/MULTIPLE-PROPERTY-ASSESSMENT.md`.
 *
 * 🔴 READ THIS BEFORE CHANGING A NUMBER — the expected values have TWO provenances and
 * they are labelled individually:
 *
 *   - **Years 1 to 8, and every row the loans do not touch, are the workbook's OWN
 *     cached values**, read straight out of the cells, with the cell reference beside
 *     each. If our port and the spreadsheet ever disagree, this fails. That is the whole
 *     point of a golden test and it is the normal case here.
 *
 *   - **Years 9 and 10 under the 'convert' ending are OURS, hand-worked**, because they
 *     are precisely the years the workbook gets wrong (§6 rule 9 of the artefact: the
 *     interest-only balance is zeroed with nothing repaying it). Every one of those
 *     carries its arithmetic in the comment beside it so it can be checked by hand. They
 *     encode Mike's ruling of 2026-08-17, not the spreadsheet.
 *
 * ✅ The 'repay' ending is the strongest check in this file: with the money simply
 * cleared, our years 9 and 10 reproduce the workbook's own cached values EXACTLY — total
 * expenses, operating profit, the tax position including the year-10 tax bill, net cash
 * and net equity. So the correction is provably confined to the two things Mike ruled on
 * and the two arithmetic slips below, and has not disturbed the maths anywhere else.
 *
 * THE THREE CORRECTIONS are each tested by name, with the workbook's own wrong value
 * written out beside the right one — see the final describe block.
 *
 * PRECISION CONVENTION: the workbook caches to 10 significant figures (`47884.84516`,
 * `-0.8958015562`). Each `toBeCloseTo` precision is chosen one digit INSIDE the cached
 * value's own precision — tighter than anything the screen will display, loose enough
 * not to fail on the cache's own rounding.
 */

/** Money: the cached values carry 4–6 decimals; assert to 3. */
const MONEY = 3
/** Rates and ratios: cached to 10 significant figures; assert to 8. */
const RATIO = 8

/**
 * Assert a ten-year series year by year, naming the year when one fails — Jest's own
 * message for `expect(arr[i])` inside a loop does not say which year broke.
 *
 * An `undefined` entry is skipped, so a series whose last two years are asserted
 * elsewhere (the ending-dependent rows) can still pin years 1–8 here.
 *
 * @param {number[]} actual
 * @param {Array<number|undefined>} expected
 * @param {string} label
 * @param {number} [precision]
 */
function expectYears (actual, expected, label, precision) {
  const p = precision === undefined ? MONEY : precision
  expected.forEach((want, i) => {
    if (want === undefined) { return }
    const got = actual[i]
    const tolerance = 0.5 * Math.pow(10, -p)
    if (!(Math.abs(got - want) < tolerance)) {
      throw new Error(
        label + ' — year ' + (i + 1) + ': expected ' + want + ', got ' + got +
        ' (difference ' + (got - want) + ')'
      )
    }
  })
}

/** The workbook's own sample, and the ending Mike ruled as the default. */
const convert = computeMultiplePropertyAssessment(DEFAULT_INPUTS)
/** The same sample with the loan cleared by the client's own money. */
const repay = computeMultiplePropertyAssessment(
  Object.assign({}, DEFAULT_INPUTS, { endOfInterestOnly: END_REPAY })
)

describe('Multiple Property Assessment — the workbook\'s own values', () => {
  describe('income and expenses (MODEL rows 10–21) — untouched by either ending', () => {
    it('rental is net of vacancy, then grows (row 10)', () => {
      // C10 = 610 × ((52 − 2) / 52) × 52 = 30,500 — the vacancy is two weeks' rent.
      expectYears(convert.profitAndLoss.rental, [
        30500, //         C10
        31567.5, //       D10
        32672.3625, //    E10
        33815.89519, //   F10
        34999.45152, //   G10
        36224.43232, //   H10
        37492.28745, //   I10
        38804.51751, //   J10
        40162.67563, //   K10
        41568.36927 //    L10
      ], 'rental', 4)
    })

    it('the management fee carries GST inside the calculation (row 14)', () => {
      // C14 = C10 × (7.5% × 1.15). The 1.15 is hardcoded in the formula, NOT an input —
      // read the fee as 8.625% of rent and the whole ten years drift.
      expectYears(convert.profitAndLoss.managementFee, [
        2630.625, //      C14
        2722.696875, //   D14
        2817.991266, //   E14
        2916.62096, //    F14
        3018.702694, //   G14
        3124.357288, //   H14
        3233.709793, //   I14
        3346.889636, //   J14
        3464.030773, //   K14
        3585.27185 //     L14
      ], 'management fee', 5)
    })

    it('the flat costs inflate at 5% a year (rows 13, 15, 16, 17, 20, 21)', () => {
      expectYears(convert.profitAndLoss.accountingFees,
        [1500, 1575, 1653.75, 1736.4375, 1823.259375, 1914.422344, 2010.143461,
          2110.650634, 2216.183166, 2326.992324], 'accounting fees', 5) //   C13:L13
      expectYears(convert.profitAndLoss.insurance,
        [3600, 3780, 3969, 4167.45, 4375.8225, 4594.613625, 4824.344306,
          5065.561522, 5318.839598, 5584.781578], 'insurance', 5) //         C15:L15
      expectYears(convert.profitAndLoss.rates,
        [1850, 1942.5, 2039.625, 2141.60625, 2248.686563, 2361.120891, 2479.176935,
          2603.135782, 2733.292571, 2869.9572], 'rates', 5) //               C16:L16
      expectYears(convert.profitAndLoss.bodyCorp,
        [1387.5, 1456.875, 1529.71875, 1606.204688, 1686.514922, 1770.840668,
          1859.382701, 1952.351836, 2049.969428, 2152.4679], 'body corp', 5) // C17:L17
      expectYears(convert.profitAndLoss.repairs,
        [500, 525, 551.25, 578.8125, 607.753125, 638.1407813, 670.0478203,
          703.5502113, 738.7277219, 775.664108], 'repairs', 6) //            C20:L20
      expectYears(convert.profitAndLoss.other,
        [25, 26.25, 27.5625, 28.940625, 30.38765625, 31.90703906, 33.50239102,
          35.17751057, 36.93638609, 38.7832054], 'other', 6) //              C21:L21
    })

    it('purchase and setup costs fall in year 1 only (rows 18, 19)', () => {
      // The workbook leaves C18/C19's later columns EMPTY. Inflating them across ten
      // years — the obvious thing to do — would overstate expenses by about 18,000.
      expect(convert.profitAndLoss.purchaseCosts[0]).toBeCloseTo(2000, MONEY) //   C18
      expect(convert.profitAndLoss.setupCosts[0]).toBeCloseTo(1500, MONEY) //      C19
      for (let y = 1; y < YEARS; y++) {
        expect(convert.profitAndLoss.purchaseCosts[y]).toBe(0)
        expect(convert.profitAndLoss.setupCosts[y]).toBe(0)
      }
    })
  })

  describe('the loans (MODEL rows 60–72)', () => {
    it('the interest rate rises by year INDEX, not compounding (rows 64, 72)', () => {
      // D64 = rate + (rate × inflation × 1), E64 = … × 2, F64 = … × 3.
      const expected = [0.04, 0.04004, 0.04008, 0.04012, 0.04016,
        0.0402, 0.04024, 0.04028, 0.04032, 0.04036] //                        C64:L64
      expectYears(convert.loans.interestOnly.rate, expected, 'IO rate', RATIO)
      expectYears(convert.loans.principalAndInterest.rate, expected, 'P&I rate', RATIO) // C72:L72
    })

    it('the interest-only loan stands still and is charged interest (rows 60, 62)', () => {
      expectYears(convert.loans.interestOnly.balance,
        [350000, 350000, 350000, 350000, 350000, 350000, 350000, 350000],
        'IO balance') //                                                      C60:J60
      expectYears(convert.profitAndLoss.interestInterestOnly,
        [14000, 14014, 14028, 14042, 14056, 14070, 14084, 14098],
        'IO interest') //                                                     C62:J62
      // No principal is repaid while the loan is interest-only. This is the guard that
      // stops its interest being counted as a repayment as well as an expense.
      for (let y = 0; y < 8; y++) { expect(convert.loans.interestOnly.repayment[y]).toBe(0) }
    })

    it('the P&I loan amortises and clears its residual in year 8 (rows 67–70)', () => {
      // The instalment is PMT(4%, 7, 299,000) = 49,816.274, computed ONCE from the base
      // rate exactly as the workbook repeats it unchanged in every column, while each
      // year's interest uses that year's inflated rate.
      expect(annuityPayment(0.04, 7, 299000)).toBeCloseTo(49816.274, MONEY) //   C68

      expectYears(convert.loans.principalAndInterest.openingBalance, [
        299000, //           C67
        261143.726, //       D67
        221783.6468, //      E67
        180856.4614, //      F67
        138296.1486, //      G67
        94033.84791, //      H67
        47997.7346, //       I67
        112.8894364, //      J67 — below the 250 residual threshold
        0, //                K67
        0 //                 L67
      ], 'P&I opening', 4)

      expectYears(convert.loans.principalAndInterest.annualInterest, [
        11960, //            C69
        10456.19479, //      D69
        8889.088563, //      E69
        7255.961229, //      F69
        5553.973327, //      G69
        3780.160686, //      H69
        1931.42884, //       I69
        0, //                J69 — the residual is paid out, no interest charged
        0,
        0
      ], 'P&I interest', 5)

      expectYears(convert.loans.principalAndInterest.closingBalance, [
        261143.726, //       C70
        221783.6468, //      D70
        180856.4614, //      E70
        138296.1486, //      F70
        94033.84791, //      G70
        47997.7346, //       H70
        112.8894364, //      I70
        0, //                J70
        0,
        0
      ], 'P&I closing', 4)
    })
  })

  describe('the tax position (MODEL rows 42–54)', () => {
    it('depreciation is diminishing value on CHATTELS only (row 42)', () => {
      // Year 1 = 29,832 × 28%; year 2 = (29,832 − year 1) × 28%. A flat percentage of
      // the original figure would charge 8,352.96 every year instead of 434 by year 10.
      expectYears(convert.taxPosition.depreciation, [
        8352.96, //          C42
        6014.1312, //        D42
        4330.174464, //      E42
        3117.725614, //      F42
        2244.762442, //      G42
        1616.228958, //      H42
        1163.68485, //       I42
        837.853092, //       J42
        603.2542262, //      K42
        434.3430429 //       L42
      ], 'depreciation', 5)
    })

    it('interest deductibility phases 100/75/50/25/0, then stays at 0 (row 44)', () => {
      // H44:L44 all point at INPUTS E84 — the FIFTH entry covers years 6 to 10 too.
      expectYears(convert.taxPosition.addBackDeductibleInterest, [
        7268.8, //           C44
        5138.740906, //      D44
        3208.392399, //      E44
        1490.857286, //      F44
        0, //                G44 — yr5's factor is 0
        0, 0, 0 //           H44:J44
      ], 'add-back', 5)
    })

    it('year 1 adds Setup Costs back; no other year does (row 46)', () => {
      // C46 = (C40 − C42 − C44) + C19. Without the + 1,500 year 1 reads −26,074.885,
      // and every carried-forward loss after it is wrong by the same amount.
      expectYears(convert.taxPosition.taxableOperatingIncome, [
        -24574.885, //       C46
        -16083.88877, //     D46
        -10372.19044, //     E46
        -5266.721465, //     F46
        -646.4110843, //     G46
        2322.640042, //      H46
        5202.866355, //      I46
        8051.347291 //       J46
      ], 'taxable operating income', 5)
    })

    it('losses ring-fence and carry forward, so no tax is due for years (rows 48–54)', () => {
      expectYears(convert.taxPosition.priorYearTaxLoss, [
        0, //                C48 is blank — nothing has been carried in yet
        -24574.885, //       D48
        -40658.77377, //     E48
        -51030.96421, //     F48
        -56297.68568, //     G48
        -56944.09676, //     H48
        -54621.45672, //     I48
        -49418.59036 //      J48
      ], 'prior year loss', 5)

      expectYears(convert.taxPosition.netTaxableIncome, [
        -24574.885, //       C50
        -40658.77377, //     D50
        -51030.96421, //     E50
        -56297.68568, //     F50
        -56944.09676, //     G50
        -54621.45672, //     H50
        -49418.59036, //     I50
        -41367.24307 //      J50
      ], 'net taxable income', 5)

      // 🔴 The operating profit turns positive in year 5 (MODEL G26 = 1,598) but no tax
      // is payable then, or in any year to 8 — the ring-fenced losses are still bigger.
      // Reading the P&L alone and taxing year 5 is the mistake this row exists to stop.
      for (let y = 0; y < 8; y++) { expect(convert.profitAndLoss.taxPayable[y]).toBe(0) } // C52:J52
    })
  })

  describe('the cash position (MODEL rows 25–33) and the summary (OUTPUTS 11–23)', () => {
    it('total expenses and operating profit (rows 25, 26)', () => {
      expectYears(convert.profitAndLoss.totalExpenses, [
        40953.125, //        C25
        36498.51666, //      D25
        35505.98608, //      E25
        34474.03375, //      F25
        33401.10016, //      G25
        32285.56332, //      H25
        31125.73625, //      I25
        29915.31713 //       J25
      ], 'total expenses', 4)

      expectYears(convert.profitAndLoss.netOperatingProfit, [
        -10453.125, //       C26
        -4931.016664, //     D26
        -2833.623579, //     E26
        -658.1385644, //     F26
        1598.351358, //      G26
        3938.869001, //      H26
        6366.551205, //      I26
        8889.200383 //       J26
      ], 'net operating profit', 5)
    })

    it('loan repayments are principal only — the interest is already an expense (row 28)', () => {
      // C28 = −C68 − C69 = instalment − interest. Year 8 is CORRECTED (see below).
      expectYears(convert.profitAndLoss.loanRepayments, [
        37856.274, //        C28
        39360.07921, //      D28
        40927.18544, //      E28
        42560.31277, //      F28
        44262.30067, //      G28
        46036.11331, //      H28
        47884.84516 //       I28
      ], 'loan repayments', 4)
    })

    it('net cash, and the weekly figure an advisor says out loud (rows 31, 33)', () => {
      expectYears(convert.profitAndLoss.netCashPosition, [
        -48309.399, //       C31
        -44291.09587, //     D31
        -43760.80902, //     E31
        -43218.45133, //     F31
        -42663.94931, //     G31
        -42097.24431, //     H31
        -41518.29395 //      I31
      ], 'net cash position', 4)

      expectYears(convert.profitAndLoss.weeklyCashPosition, [
        -929.0269038, //     C33 — "this property costs you $929 a week"
        -851.7518437, //     D33
        -841.5540195, //     E33
        -831.1240641, //     F33
        -820.4605637, //     G33
        -809.5623906, //     H33
        -798.4287299 //      I33
      ], 'weekly cash position', 6)
    })

    it('property value, debt and equity (OUTPUTS rows 11–15)', () => {
      expectYears(convert.investmentSummary.propertyValue, [
        649000, //           C11 — year 1 is the purchase price itself
        668470, //           D11
        688524.1, //         E11
        709179.823, //       F11
        730455.2177, //      G11
        752368.8742, //      H11
        774939.9404, //      I11
        798188.1387, //      J11
        822133.7828, //      K11
        846797.7963 //       L11
      ], 'property value', 4)

      expectYears(convert.investmentSummary.totalDebt, [
        611143.726, //       C13
        571783.6468, //      D13
        530856.4614, //      E13
        488296.1486, //      F13
        444033.8479, //      G13
        397997.7346, //      H13
        350112.8894, //      I13
        350000 //            J13
      ], 'total debt', 4)

      expectYears(convert.investmentSummary.netEquity, [
        37856.274, //        C15
        96686.35321, //      D15
        157667.6386, //      E15
        220883.6744, //      F15
        286421.3698, //      G15
        354371.1396, //      H15
        424827.051, //       I15
        448188.1387 //       J15
      ], 'net equity', 4)
    })

    it('investor funds and the return on them (OUTPUTS rows 19–23)', () => {
      expectYears(convert.investmentSummary.annualCashTopUp, [
        48309.399, //        C19
        44291.09587, //      D19
        43760.80902, //      E19
        43218.45133, //      F19
        42663.94931, //      G19
        42097.24431, //      H19
        41518.29395, //      I19
        0 //                 J19 — the year the property stops costing money
      ], 'annual cash top up', 4)

      expectYears(convert.investmentSummary.cumulativeInvestorFunds, [
        363309.399, //       C21 = deposit 315,000 + year 1's top-up
        407600.4949, //      D21
        451361.3039, //      E21
        494579.7552, //      F21
        537243.7045, //      G21
        579340.9489, //      H21
        620859.2428, //      I21
        620859.2428 //       J21
      ], 'cumulative investor funds', 4)

      expectYears(convert.investmentSummary.returnOnInvestorFunds, [
        -0.8958015562, //    C23
        -0.7627913743, //    D23
        -0.6506841918, //    E23
        -0.5533911931, //    F23
        -0.4668688207, //    G23
        -0.3883202278, //    H23
        -0.3157433735, //    I23
        -0.2781163463 //     J23
      ], 'return on investor funds', RATIO)
    })
  })
})

describe('Multiple Property Assessment — the two endings (§6 rule 9)', () => {
  describe("'repay' — the workbook's own years 9 and 10, with the money counted", () => {
    // ✅ This is the fidelity proof. Clearing the loan is what the workbook already does,
    // so with that ending our figures must land on its cached values to the last decimal.
    it('reproduces the workbook exactly once the loan is cleared', () => {
      expect(repay.profitAndLoss.interestInterestOnly[8]).toBe(0) //                  K62
      expect(repay.profitAndLoss.interestInterestOnly[9]).toBe(0) //                  L62
      expect(repay.profitAndLoss.totalExpenses[8]).toBeCloseTo(16557.97964, 4) //     K25
      expect(repay.profitAndLoss.totalExpenses[9]).toBeCloseTo(17333.91816, 4) //     L25
      expect(repay.profitAndLoss.netOperatingProfit[8]).toBeCloseTo(23604.69598, 4) // K26
      expect(repay.profitAndLoss.netOperatingProfit[9]).toBeCloseTo(24234.45111, 4) // L26
      expect(repay.taxPosition.taxableOperatingIncome[8]).toBeCloseTo(23001.44176, 4) // K46
      expect(repay.taxPosition.taxableOperatingIncome[9]).toBeCloseTo(23800.10807, 4) // L46
      expect(repay.taxPosition.netTaxableIncome[8]).toBeCloseTo(-18365.80131, 4) //   K50
      expect(repay.taxPosition.netTaxableIncome[9]).toBeCloseTo(5434.306754, 5) //    L50
      // The first and only tax bill in ten years, in the year the ring-fenced losses
      // finally run out: 5,434.306754 × 28%.
      expect(repay.profitAndLoss.taxPayable[9]).toBeCloseTo(1521.605891, 5) //        L52
      expect(repay.profitAndLoss.netCashPosition[8]).toBeCloseTo(23604.69598, 4) //   K31
      expect(repay.profitAndLoss.netCashPosition[9]).toBeCloseTo(22712.84522, 4) //   L31
      expect(repay.profitAndLoss.weeklyCashPosition[8]).toBeCloseTo(453.9364612, 6) // K33
      expect(repay.profitAndLoss.weeklyCashPosition[9]).toBeCloseTo(436.785485, 6) //  L33
      expect(repay.investmentSummary.netEquity[8]).toBeCloseTo(822133.7828, 4) //      K15
      expect(repay.investmentSummary.netEquity[9]).toBeCloseTo(846797.7963, 4) //      L15
    })

    it('counts the capital the client puts in — the correction that changes the headline', () => {
      // 🔴 OURS, not the workbook's. The 350,000 arrives on its own line in the year
      // after the interest-only period, and joins cumulative investor funds.
      expect(repay.investmentSummary.capitalIntroduced[7]).toBe(0) //     year 8 — nothing yet
      expect(repay.investmentSummary.capitalIntroduced[8]).toBe(350000) // year 9
      expect(repay.investmentSummary.capitalIntroduced[9]).toBe(0) //     year 10 — once only

      // 620,859.2428 (OUTPUTS I21, unchanged) + 350,000 = 970,859.2428.
      expect(repay.investmentSummary.cumulativeInvestorFunds[8]).toBeCloseTo(970859.2428, 4)
      expect(repay.investmentSummary.cumulativeInvestorFunds[9]).toBeCloseTo(970859.2428, 4)

      // (846,797.7963 − 970,859.2428) ÷ 970,859.2428 = −0.1277852041.
      // 🔴 The workbook prints +0.3639126841 here (OUTPUTS L23) — a 36.4% return —
      // because it counts a 350,000 payoff as free money. This is the single figure the
      // whole correction was for.
      expect(repay.investmentSummary.returnOnInvestorFunds[9]).toBeCloseTo(-0.1277852041, RATIO)
      expect(repay.headline.returnOnInvestorFundsFinalYear).toBeCloseTo(-0.1277852041, RATIO)
    })
  })

  describe("'convert' — hand-worked, because these are the years the workbook gets wrong", () => {
    // Every number below is derived here and NONE of it is in the spreadsheet. The
    // instalment is PMT(4%, 30 − 8 = 22 years, 350,000) = 24,219.58388104163, computed
    // from the base rate exactly as the P&I block computes its own.
    const instalment = 24219.58388104163

    it('the instalment', () => {
      expect(annuityPayment(0.04, 22, 350000)).toBeCloseTo(instalment, 6)
      expect(convert.loans.interestOnly.repayment[8]).toBeCloseTo(instalment, 6)
      expect(convert.loans.interestOnly.repayment[9]).toBeCloseTo(instalment, 6)
    })

    it('the balance falls instead of vanishing', () => {
      // Year 9:  interest = 350,000 × 4.032% = 14,112 exactly.
      //          closing  = 350,000 − 24,219.58388104 + 14,112 = 339,892.41611896.
      expect(convert.profitAndLoss.interestInterestOnly[8]).toBeCloseTo(14112, MONEY)
      expect(convert.loans.interestOnly.balance[8]).toBeCloseTo(339892.4161190, 5)

      // Year 10: interest = 339,892.41611896 × 4.036% = 13,718.05791456.
      //          closing  = 339,892.41611896 − 24,219.58388104 + 13,718.05791456
      //                   = 329,390.89015248.
      expect(convert.profitAndLoss.interestInterestOnly[9]).toBeCloseTo(13718.0579146, 5)
      expect(convert.loans.interestOnly.balance[9]).toBeCloseTo(329390.8901525, 5)

      // 🔴 The workbook has 0 in both years (MODEL K60, L60) with nothing repaying it.
      expect(convert.investmentSummary.totalDebt[8]).toBeCloseTo(339892.4161190, 5)
      expect(convert.investmentSummary.totalDebt[9]).toBeCloseTo(329390.8901525, 5)
    })

    it('the cash flow carries the repayments', () => {
      // Principal repaid = instalment − interest.
      //   Year 9:  24,219.58388104 − 14,112          = 10,107.58388104
      //   Year 10: 24,219.58388104 − 13,718.05791456 = 10,501.52596648
      expect(convert.profitAndLoss.loanRepayments[8]).toBeCloseTo(10107.5838810, 5)
      expect(convert.profitAndLoss.loanRepayments[9]).toBeCloseTo(10501.5259665, 5)

      // Operating profit = rental − expenses, with the interest now still being charged:
      //   Year 9:  40,162.67563 − 30,669.97964 =  9,492.69598
      //   Year 10: 41,568.36927 − 31,051.97608 = 10,516.39320
      expect(convert.profitAndLoss.netOperatingProfit[8]).toBeCloseTo(9492.6959839, 5)
      expect(convert.profitAndLoss.netOperatingProfit[9]).toBeCloseTo(10516.3931958, 5)

      // Net cash = operating profit − repayments − tax.
      //   Year 9:   9,492.69598 − 10,107.58388 − 0 = −614.88790  (−11.82 a week)
      //   Year 10: 10,516.39320 − 10,501.52597 − 0 =   14.86723  (  0.29 a week)
      expect(convert.profitAndLoss.netCashPosition[8]).toBeCloseTo(-614.8878971, 5)
      expect(convert.profitAndLoss.netCashPosition[9]).toBeCloseTo(14.8672293, 5)
      expect(convert.profitAndLoss.weeklyCashPosition[8]).toBeCloseTo(-11.8247673, 6)
      expect(convert.profitAndLoss.weeklyCashPosition[9]).toBeCloseTo(0.2859083, 6)
    })

    it('no tax falls due, because the interest keeps the ring-fenced losses running', () => {
      // A consequence worth stating: under 'repay' the client pays 1,521.61 in year 10
      // (the workbook's own figure). Keeping the loan alive keeps the carried-forward
      // loss alive with it, so nothing is payable inside the ten years.
      expect(convert.taxPosition.netTaxableIncome[9]).toBeCloseTo(-22395.7511609, 5)
      expect(convert.profitAndLoss.taxPayable[9]).toBe(0)
      expect(convert.investmentSummary.capitalIntroduced[8]).toBe(0)
    })

    it('the two headline figures the correction was for', () => {
      // Net equity year 10 = 846,797.7963 − 329,390.89015 = 517,406.90615.
      // 🔴 The workbook says 846,797.7963 (OUTPUTS L15) — it has forgotten the debt.
      expect(convert.headline.netEquityFinalYear).toBeCloseTo(517406.9061527, 5)

      // Return = (517,406.90615 − 621,474.13070) ÷ 621,474.13070 = −0.16745222.
      // 🔴 The workbook says +0.3639126841. Same property, same money.
      expect(convert.headline.returnOnInvestorFundsFinalYear).toBeCloseTo(-0.1674522227, RATIO)
    })

    it('the two headline figures the correction did NOT touch', () => {
      // Both are year-1 figures, so neither ending can move them — they stay the
      // workbook's own.
      expect(convert.headline.weeklyCashPosition).toBeCloseTo(-929.0269038, 6) //  MODEL C33
      expect(convert.headline.totalDebt).toBeCloseTo(611143.726, 4) //             OUTPUTS C13
      expect(repay.headline.weeklyCashPosition).toBeCloseTo(-929.0269038, 6)
      expect(repay.headline.totalDebt).toBeCloseTo(611143.726, 4)
    })
  })

  it('years 1 to 8 are identical under both endings — the ruling changes nothing early', () => {
    for (let y = 0; y < 8; y++) {
      expect(convert.profitAndLoss.netCashPosition[y])
        .toBeCloseTo(repay.profitAndLoss.netCashPosition[y], 6)
      expect(convert.investmentSummary.netEquity[y])
        .toBeCloseTo(repay.investmentSummary.netEquity[y], 6)
    }
  })

  it('an unrecognised ending converts rather than clearing the debt for free', () => {
    // Fail toward the safer of the two: a typo must never wipe 350,000 of debt.
    const odd = computeMultiplePropertyAssessment(
      Object.assign({}, DEFAULT_INPUTS, { endOfInterestOnly: 'sell-it' })
    )
    expect(odd.endOfInterestOnly).toBe(END_CONVERT)
    expect(odd.investmentSummary.totalDebt[9]).toBeCloseTo(329390.8901525, 5)
    expect(odd.investmentSummary.capitalIntroduced[8]).toBe(0)
  })

  it('a loan due the moment its interest-only period ends is repaid over one year', () => {
    // interestOnlyTotalTermYears at or below the interest-only period means the balance
    // falls due, which is one period: PMT(4%, 1, 350,000) = 364,000.
    const due = computeMultiplePropertyAssessment(
      Object.assign({}, DEFAULT_INPUTS, { interestOnlyTotalTermYears: 8 })
    )
    expect(due.loans.interestOnly.repayment[8]).toBeCloseTo(364000, MONEY) // 350,000 × 1.04

    // A 112 tail is left over, and it is CORRECT rather than a rounding slip: the
    // instalment is struck at the base 4% while year 9's interest is charged at the
    // inflated 4.032%, so 350,000 × 0.032% = 112 goes unpaid. This is the very same
    // mechanism that leaves the workbook's own P&I loan with 112.8894364 outstanding in
    // year 8 (MODEL I70) — faithful behaviour, not ours.
    expect(due.loans.interestOnly.balance[8]).toBeCloseTo(112, MONEY)

    // The residual rule then clears it the next year, and the debt is gone.
    expect(due.loans.interestOnly.repayment[9]).toBeCloseTo(112, MONEY)
    expect(due.loans.interestOnly.balance[9]).toBe(0)
    expect(due.investmentSummary.totalDebt[9]).toBe(0)
  })
})

describe('Multiple Property Assessment — the three corrections, each by name', () => {
  it('1. the interest-only loan does not repay itself (MODEL row 60)', () => {
    // The workbook: total debt 350,000 in year 8 and 0 in year 9, with no repayment
    // anywhere in the cash flow. Net equity leaps 448,188.14 → 822,133.78.
    // Ours, under either ending, the debt is dealt with and the money is accounted for.
    expect(convert.investmentSummary.totalDebt[7]).toBeCloseTo(350000, MONEY) //  J13, agreed
    expect(convert.investmentSummary.totalDebt[8]).toBeGreaterThan(0) //          K13 was 0
    expect(repay.investmentSummary.totalDebt[8]).toBe(0) //                       K13 agreed…
    expect(repay.investmentSummary.capitalIntroduced[8]).toBe(350000) //          …but paid for
  })

  it('2. the last residual repayment had its sign flipped (MODEL rows 68, 28)', () => {
    // J68 is `IF(opening < 250, opening, -PMT(…))` — the residual branch returns the
    // payment POSITIVE where the normal branch returns it negative, and row 28 negates
    // both. So the workbook ADDS the final 112.8894364 to the client's cash.
    //
    //   workbook:  loan repayments −112.8894364 → net cash 9,002.089819 → $173.12/week
    //   ours:      loan repayments +112.8894364 → net cash 8,776.310947 → $168.78/week
    expect(convert.profitAndLoss.loanRepayments[7]).toBeCloseTo(112.8894364, 5)
    expect(convert.profitAndLoss.netCashPosition[7]).toBeCloseTo(8776.3109470, 5)
    expect(convert.profitAndLoss.weeklyCashPosition[7]).toBeCloseTo(168.7752105, 6)

    // The residual rule itself: below 250 the balance is paid out, no interest charged.
    const cleared = amortiseYear(112.8894364, 49816.274, 0.04028)
    expect(cleared.repayment).toBeCloseTo(112.8894364, 6)
    expect(cleared.interest).toBe(0)
    expect(cleared.closing).toBe(0)
    // …and one dollar above it, the scheduled instalment still runs.
    expect(amortiseYear(251, 49816.274, 0.04).repayment).toBeCloseTo(49816.274, MONEY)
  })

  it('3. year 1 would have printed $0 a week on a cash-positive property (MODEL C33)', () => {
    // C33 is `IF(C31 < 0, C31/52, 0)` while every other year is `x/52` either way. On
    // the sample it never fires (year 1 is negative), so no golden value moves — but a
    // property that IS positive in year 1 would report nothing at all.
    const strong = computeMultiplePropertyAssessment(
      Object.assign({}, DEFAULT_INPUTS, { rentPerWeek: 2500 })
    )
    expect(strong.profitAndLoss.netCashPosition[0]).toBeGreaterThan(0)
    expect(strong.profitAndLoss.weeklyCashPosition[0])
      .toBeCloseTo(strong.profitAndLoss.netCashPosition[0] / 52, 6)
    expect(strong.profitAndLoss.weeklyCashPosition[0]).not.toBe(0) // the workbook's answer
  })
})

describe('Multiple Property Assessment — the four tax rules (§6 rule 10)', () => {
  /** The sample with one tax rule changed and nothing else. */
  const withRule = o => computeMultiplePropertyAssessment(Object.assign({}, DEFAULT_INPUTS, o))

  it('🔴 every default IS the workbook — a firm that changes nothing sees no change', () => {
    // The 38 tests above are the real proof of this, since they run on the defaults. This
    // one states it directly: supplying none of the four settings changes nothing at all.
    const bare = Object.assign({}, DEFAULT_INPUTS)
    delete bare.yearOneAddBack
    delete bare.managementFeeGstRate
    delete bare.depreciableAssets
    delete bare.depreciationMethod
    delete bare.lossTreatment
    const r = computeMultiplePropertyAssessment(bare)

    expect(r.profitAndLoss.managementFee[0]).toBeCloseTo(2630.625, MONEY) //        MODEL C14
    expect(r.taxPosition.depreciation[0]).toBeCloseTo(8352.96, MONEY) //            MODEL C42
    expect(r.taxPosition.taxableOperatingIncome[0]).toBeCloseTo(-24574.885, MONEY) // MODEL C46
    expect(r.profitAndLoss.netCashPosition[0]).toBeCloseTo(-48309.399, 4) //         MODEL C31
    // …and each fallback is declared rather than assumed (the R8 ruling).
    expect(r.defaultedInputs).toContain('yearOneAddBack')
    expect(r.defaultedInputs).toContain('managementFeeGstRate')
    expect(r.defaultedInputs).toContain('lossTreatment')
  })

  describe('which year-1 costs are added back', () => {
    it('setup only (the workbook), setup and purchase (its own note), or neither', () => {
      // MODEL C46 = (C40 − C42 − C44) + C19. The three settings differ ONLY in what is
      // added on the end: 1,500 / 3,500 / 0 against a base of −26,074.885.
      expect(withRule({ yearOneAddBack: ADD_BACK_SETUP })
        .taxPosition.taxableOperatingIncome[0]).toBeCloseTo(-24574.885, MONEY)
      expect(withRule({ yearOneAddBack: ADD_BACK_SETUP_AND_PURCHASE })
        .taxPosition.taxableOperatingIncome[0]).toBeCloseTo(-22574.885, MONEY)
      expect(withRule({ yearOneAddBack: ADD_BACK_NONE })
        .taxPosition.taxableOperatingIncome[0]).toBeCloseTo(-26074.885, MONEY)
    })

    it('touches year 1 only — later years carry it forward but never repeat it', () => {
      const both = withRule({ yearOneAddBack: ADD_BACK_SETUP_AND_PURCHASE })
      // Year 2's own taxable income is untouched…
      expect(both.taxPosition.taxableOperatingIncome[1]).toBeCloseTo(-16083.88877, 5)
      // …but its carried-forward loss is 2,000 smaller, and so is every year after.
      expect(both.taxPosition.priorYearTaxLoss[1]).toBeCloseTo(-22574.885, MONEY)
      expect(convert.taxPosition.priorYearTaxLoss[1]).toBeCloseTo(-24574.885, MONEY)
    })

    it('and it reaches the tax bill ten years later', () => {
      // On the repay ending the workbook's own year-10 bill is 1,521.605891. Adding the
      // 2,000 back makes the loss smaller, so 2,000 × 28% = 560 more tax falls due.
      const both = withRule({
        yearOneAddBack: ADD_BACK_SETUP_AND_PURCHASE, endOfInterestOnly: END_REPAY
      })
      expect(both.taxPosition.netTaxableIncome[9]).toBeCloseTo(7434.306754, 5)
      expect(both.profitAndLoss.taxPayable[9]).toBeCloseTo(2081.605891, 5)
      expect(repay.profitAndLoss.taxPayable[9]).toBeCloseTo(1521.605891, 5)
    })

    it('the helper stands on its own', () => {
      expect(yearOneAddBackAmount(ADD_BACK_SETUP, 1500, 2000)).toBe(1500)
      expect(yearOneAddBackAmount(ADD_BACK_SETUP_AND_PURCHASE, 1500, 2000)).toBe(3500)
      expect(yearOneAddBackAmount(ADD_BACK_NONE, 1500, 2000)).toBe(0)
    })
  })

  describe('the GST inside the management fee', () => {
    it('is a rate now, and 15% reproduces the hardcoded 1.15', () => {
      expect(convert.profitAndLoss.managementFee[0]).toBeCloseTo(2630.625, MONEY) // MODEL C14
      // No GST: the fee is simply 7.5% of the rent.
      expect(withRule({ managementFeeGstRate: 0 }).profitAndLoss.managementFee[0])
        .toBeCloseTo(2287.5, MONEY) //                                    30,500 × 7.5%
      // 20% (the UK, say): 30,500 × 7.5% × 1.20.
      expect(withRule({ managementFeeGstRate: 0.2 }).profitAndLoss.managementFee[0])
        .toBeCloseTo(2745, MONEY)
    })

    it('🔴 reports what the fee ACTUALLY costs — the figure nobody could see', () => {
      // This is the whole reason the rule could not stay an assumption: an advisor reads
      // 7.5% on screen while the model charges 8.625%, and nothing said so.
      expect(convert.taxRules.effectiveManagementFeePct).toBeCloseTo(0.08625, 8)
      expect(withRule({ managementFeeGstRate: 0 }).taxRules.effectiveManagementFeePct)
        .toBeCloseTo(0.075, 8)
    })
  })

  describe('what may be depreciated, and how', () => {
    it('chattels on diminishing value is the default, and is the workbook', () => {
      expect(withRule({}).taxPosition.depreciation[0]).toBeCloseTo(8352.96, MONEY) // MODEL C42
    })

    it('straight line charges a flat amount and STOPS when the asset is written off', () => {
      // 29,832 × 28% = 8,352.96 a year. Three full years, then only 4,773.12 is left.
      // 🔴 Running the flat charge on regardless would claim 83,529 of a 29,832 asset —
      // ours is capped, which is not something the workbook ever had to decide.
      const sl = withRule({ depreciationMethod: METHOD_STRAIGHT_LINE })
      expectYears(sl.taxPosition.depreciation,
        [8352.96, 8352.96, 8352.96, 4773.12, 0, 0, 0, 0, 0, 0], 'straight line', 4)
      const claimed = sl.taxPosition.depreciation.reduce((a, b) => a + b, 0)
      expect(claimed).toBeCloseTo(29832, MONEY) // exactly the chattels, never more
    })

    it('the building can be depreciated too, where the country allows it', () => {
      const both = withRule({
        depreciableAssets: DEPRECIABLE_CHATTELS_AND_BUILDING,
        buildingDepreciationRate: 0.02
      })
      // Year 1 = chattels 8,352.96 + building 359,168 × 2% = 7,183.36.
      expect(both.taxPosition.depreciation[0]).toBeCloseTo(15536.32, MONEY)
      expect(both.taxPosition.depreciation[1]).toBeCloseTo(13053.824, 4)
      // The land is never depreciated under either setting — it is not in the sum.
      expect(both.taxPosition.depreciation[0]).toBeLessThan(8352.96 + (359168 + 260000) * 0.02)
    })

    it('a negative rate depreciates nothing — it never ADDS value back', () => {
      // Nonsense input, but the guard is what stops it becoming a negative expense, which
      // would raise taxable income and quietly invent a tax bill.
      const daft = withRule({
        depreciableAssets: DEPRECIABLE_CHATTELS_AND_BUILDING,
        buildingDepreciationRate: -0.05
      })
      expectYears(daft.taxPosition.depreciation, convert.taxPosition.depreciation,
        'negative building rate', 6)
      expect(withRule({ depreciationRateChattels: -0.28 }).taxPosition.depreciation
        .every(v => v === 0)).toBe(true)
    })

    it('choosing the building without a rate gives no building depreciation, honestly', () => {
      // There is no right default for a building rate — it differs by country — so the
      // model invents nothing. The result is identical to chattels only, which is at
      // least true, and the screen shows the empty field.
      const noRate = withRule({ depreciableAssets: DEPRECIABLE_CHATTELS_AND_BUILDING })
      expectYears(noRate.taxPosition.depreciation, convert.taxPosition.depreciation,
        'building with no rate', 6)
    })
  })

  describe('how a rental loss is treated', () => {
    const offset = withRule({ lossTreatment: LOSSES_OFFSET })

    it('ring-fenced holds the loss; offset turns it into a refund the same year', () => {
      // Ring-fenced (the workbook): nothing payable, and the loss is carried forward.
      expect(convert.profitAndLoss.taxPayable[0]).toBe(0)
      expect(convert.taxPosition.lossToCarryForward[0]).toBeCloseTo(-24574.885, MONEY)

      // Offset: the loss reduces the client's OTHER income, so tax goes negative.
      // −24,574.885 × 28% = −6,880.9678.
      expect(offset.profitAndLoss.taxPayable[0]).toBeCloseTo(-6880.9678, 4)
      expect(offset.taxPosition.lossToCarryForward.every(v => v === 0)).toBe(true)
      expect(offset.taxPosition.priorYearTaxLoss.every(v => v === 0)).toBe(true)
    })

    it('🔴 the refund reaches the cash flow immediately — the setting with teeth', () => {
      // Net cash year 1: −48,309.399 ring-fenced, −41,428.4312 offset. The whole
      // difference is the refund, to the penny.
      expect(offset.profitAndLoss.netCashPosition[0]).toBeCloseTo(-41428.4312, 4)
      expect(offset.profitAndLoss.netCashPosition[0] - convert.profitAndLoss.netCashPosition[0])
        .toBeCloseTo(6880.9678, 4)
      expect(offset.profitAndLoss.weeklyCashPosition[0]).toBeCloseTo(-796.7006, 4)
    })

    it('and once the property is profitable, offset simply pays tax every year', () => {
      // Year 6 is the first profitable one; ring-fencing still shows nothing payable
      // because the earlier losses are not yet used up.
      expect(offset.profitAndLoss.taxPayable[5]).toBeCloseTo(650.339212, 5)
      expect(convert.profitAndLoss.taxPayable[5]).toBe(0)
      expect(offset.profitAndLoss.taxPayable[9]).toBeCloseTo(2822.974043, 5)
    })
  })

  it('a mistyped setting falls back to New Zealand AND says that it did', () => {
    // 🔴 The one that must never be silent: 'ringfence' is not 'ringFenced', and a firm
    // that meant to offset its losses would otherwise be shown NZ's answer with no sign.
    const typo = withRule({ lossTreatment: 'ringfence' })
    expect(typo.taxRules.lossTreatment).toBe(LOSSES_RING_FENCED)
    expect(typo.defaultedInputs).toContain('lossTreatment')

    // Case is not the trap, though — a setting is matched case-insensitively.
    const caps = withRule({ lossTreatment: 'RINGFENCED', depreciationMethod: 'SL' })
    expect(caps.taxRules.lossTreatment).toBe(LOSSES_RING_FENCED)
    expect(caps.taxRules.depreciationMethod).toBe(METHOD_STRAIGHT_LINE)
    expect(caps.defaultedInputs).toEqual([])
  })

  it('the payload states which rules the figures were built on', () => {
    // So a reader of the screen is never left to assume New Zealand.
    expect(convert.taxRules).toEqual({
      yearOneAddBack: ADD_BACK_SETUP,
      managementFeeGstRate: 0.15,
      effectiveManagementFeePct: 0.08625,
      depreciableAssets: DEPRECIABLE_CHATTELS,
      depreciationMethod: METHOD_DIMINISHING_VALUE,
      depreciationRateChattels: 0.28,
      buildingDepreciationRate: 0,
      lossTreatment: LOSSES_RING_FENCED
    })
  })
})

describe('Multiple Property Assessment — inputs, defaults and guards', () => {
  it('names every input it had to default (the R8 ruling)', () => {
    expect(computeMultiplePropertyAssessment(DEFAULT_INPUTS).defaultedInputs).toEqual([])

    const empty = computeMultiplePropertyAssessment({})
    expect(empty.defaultedInputs).toContain('rentPerWeek')
    expect(empty.defaultedInputs).toContain('purchasePrice')
    expect(empty.defaultedInputs).toContain('endOfInterestOnly')
    expect(empty.defaultedInputs).toContain('phasingTable')
    // A whole-sample fallback still produces the sample's own answer.
    expect(empty.headline.weeklyCashPosition).toBeCloseTo(-929.0269038, 6)
  })

  it('a figure that is present but unusable is defaulted AND declared', () => {
    // The fault this closes: a mistyped figure silently replaced by the sample, with the
    // caller told the number was the client's.
    const typo = computeMultiplePropertyAssessment(
      Object.assign({}, DEFAULT_INPUTS, { rentPerWeek: 'six hundred and ten' })
    )
    expect(typo.defaultedInputs).toEqual(['rentPerWeek'])
    expect(typo.profitAndLoss.rental[0]).toBeCloseTo(30500, MONEY)
  })

  it('accepts numbers arriving as JSON strings without concatenating them', () => {
    const asText = computeMultiplePropertyAssessment(
      Object.assign({}, DEFAULT_INPUTS, { rentPerWeek: '610', vacancyWeeks: '2' })
    )
    expect(asText.defaultedInputs).toEqual([])
    expect(asText.profitAndLoss.rental[0]).toBeCloseTo(30500, MONEY)
  })

  it('reports whether the purchase price split reconciles, and computes either way', () => {
    // INPUTS G32 = price − (land + building + chattels), which the workbook expects to
    // be 0. The screen refuses to compute while it is not; the model reports it rather
    // than deciding, so nothing is silently guessed.
    expect(convert.purchasePriceSplit.total).toBeCloseTo(649000, MONEY) //   G36
    expect(convert.purchasePriceSplit.difference).toBeCloseTo(0, MONEY) //   G32
    expect(convert.purchasePriceSplit.reconciles).toBe(true)

    const wrong = computeMultiplePropertyAssessment(
      Object.assign({}, DEFAULT_INPUTS, { chattels: 20000 })
    )
    expect(wrong.purchasePriceSplit.difference).toBeCloseTo(9832, MONEY)
    expect(wrong.purchasePriceSplit.reconciles).toBe(false)
    expect(wrong.profitAndLoss.rental[0]).toBeCloseTo(30500, MONEY) // still computed
  })

  it('the deductibility setting behaves at each of its three values', () => {
    expect(deductibilityFactor('Yes', DEFAULT_INPUTS.phasingTable, 1)).toBe(1)
    expect(deductibilityFactor('Yes', DEFAULT_INPUTS.phasingTable, 9)).toBe(1)
    expect(deductibilityFactor('No', DEFAULT_INPUTS.phasingTable, 1)).toBe(0)
    expect(deductibilityFactor('Phasing', DEFAULT_INPUTS.phasingTable, 2)).toBe(0.75)
    // Beyond the table, the LAST entry holds — MODEL H44:L44 all point at INPUTS E84.
    expect(deductibilityFactor('Phasing', DEFAULT_INPUTS.phasingTable, 10)).toBe(0)
    expect(deductibilityFactor('phasing', [1, 0.5], 7)).toBe(0.5)

    // 'Yes' deducts the full interest, so the add-back is bigger than under phasing.
    const allDeductible = computeMultiplePropertyAssessment(
      Object.assign({}, DEFAULT_INPUTS, { interestDeductibility: 'Yes' })
    )
    expect(allDeductible.taxPosition.addBackDeductibleInterest[4])
      .toBeCloseTo((14056 + 5553.973327) * 0.28, 5) // year 5, where phasing gives 0
    expect(convert.taxPosition.addBackDeductibleInterest[4]).toBe(0)
  })

  it('divides by nothing safely — no NaN or Infinity reaches the screen', () => {
    const zeros = computeMultiplePropertyAssessment(
      Object.assign({}, DEFAULT_INPUTS, { cashDeposit: 0, piTermYears: 0, vacancyWeeks: 52 })
    )
    const finite = v => typeof v === 'number' && Number.isFinite(v)
    expect(zeros.profitAndLoss.rental.every(finite)).toBe(true)
    expect(zeros.investmentSummary.returnOnInvestorFunds.every(finite)).toBe(true)
    expect(zeros.profitAndLoss.weeklyCashPosition.every(finite)).toBe(true)
    expect(finite(zeros.headline.returnOnInvestorFundsFinalYear)).toBe(true)
  })

  it('the helpers stand on their own', () => {
    expect(interestRateSeries(0.04, 0.001, 3)).toEqual([0.04, 0.04004, 0.04008])
    expect(interestRateSeries(0.05, 0, 2)).toEqual([0.05, 0.05])
    expect(annuityPayment(0, 10, 1000)).toBeCloseTo(100, 6) // no rate: straight division
    expect(annuityPayment(0.04, 0, 1000)).toBe(0) //           no term: nothing to pay
    const dep = chattelsDepreciation(29832, 0.28)
    expect(dep[0]).toBeCloseTo(8352.96, 5)
    expect(dep[1]).toBeCloseTo(6014.1312, 5)
    expect(dep.length).toBe(YEARS)
  })

  it('returns ten years of everything, and says which ending it used', () => {
    expect(convert.years).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(convert.endOfInterestOnly).toBe(END_CONVERT)
    expect(repay.endOfInterestOnly).toBe(END_REPAY)
    expect(convert.address).toBe('56 Big Deal Avenue, Goldentown') //  INPUTS E23
    const series = [].concat(
      Object.values(convert.profitAndLoss),
      Object.values(convert.taxPosition),
      Object.values(convert.loans.interestOnly),
      Object.values(convert.loans.principalAndInterest)
    )
    series.forEach(arr => expect(arr.length).toBe(YEARS))
  })
})
