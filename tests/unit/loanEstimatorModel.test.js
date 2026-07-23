'use strict'

const {
  DEFAULT_INPUTS,
  DEFAULT_LOAN_INPUTS,
  DEFAULT_SERVICEABILITY_INPUTS,
  DEFAULT_BUSINESS_INPUTS,
  computeLoanEstimator,
  computeLoanEstimatorReport,
  computeRepaymentSchedule,
  computeServiceability,
  computeBusinessBlock,
  computeSecurityItem,
  capBasedPropertyValue,
  fonterraShareValue,
  overdraftMonthlyInterest,
  getTaxBands,
  incomeTax
} = require('../../server/report/loanEstimatorModel')

/**
 * GOLDEN TEST — Loan Estimator, Phase 1 (Parts A + B: rule table + security position).
 *
 * Every expected number below is the source workbook's OWN cached value, read straight
 * out of `design/report-source-models/The Loan Estimator.xlsx` (`Capital Input` and
 * `Loan Criteria` sheets). If our port and the spreadsheet ever disagree, this fails.
 * Cell references are given so any figure can be checked against the workbook by hand.
 *
 * PRECISION CONVENTION: this workbook stores its cached values to 10 significant
 * figures (e.g. `13143782.67`, `9026.370957`). Each `toBeCloseTo` precision below is
 * therefore chosen one digit INSIDE the cached value's own precision — tighter than
 * anything the report will display, loose enough not to fail on the cache's rounding.
 */

/** Find one computed security row by class key. */
function byKey (result, key) {
  const item = result.items.find(it => it.key === key)
  if (!item) { throw new Error('missing item ' + key) }
  return item
}

describe('Loan Estimator — golden values from The Loan Estimator.xlsx', () => {
  const r = computeLoanEstimator(DEFAULT_INPUTS)

  describe('personal security items (Capital Input rows 6–14)', () => {
    it('Residential Home — the fully-borrowed home', () => {
      const it_ = byKey(r, 'residentialHome')
      expect(it_.adjustedValue).toBeCloseTo(1350000, 6) //           M6 (Static: unadjusted)
      expect(it_.currentEquity).toBeCloseTo(270000, 6) //            R6
      expect(it_.loanLimit).toBeCloseTo(1080000, 6) //               Z6 (= M6 × 80%, 'Loan Criteria' D4)
      expect(it_.availableSecurity).toBeCloseTo(0, 6) //             AB6 (borrowed to the limit)
      expect(it_.stressedDepositRequired).toBeCloseTo(270000, 6) //  AD6 ('Loan Criteria' T4)
      expect(it_.stressTestedPayment).toBeCloseTo(9026.370957, 5) // AH6 ('Loan Criteria' R4: -PMT(8.95%/12, 300, 1080000)) — hand-verified anchor
      expect(it_.stressPaymentGap).toBeCloseTo(-2394.370957, 5) //   AL6 (= V6 6632 − AH6)
    })

    it('Rental Property — the Decline adjustment bites before anything else', () => {
      const it_ = byKey(r, 'rentalProperty')
      expect(it_.adjustedValue).toBeCloseTo(804450, 6) //            M8 (865000 × (1 − 7%))
      expect(it_.currentEquity).toBeCloseTo(454450, 6) //            R8
      expect(it_.loanLimit).toBeCloseTo(563115, 6) //                Z8 (= M8 × 70%)
      expect(it_.availableSecurity).toBeCloseTo(213115, 6) //        AB8
      expect(it_.stressedDepositRequired).toBeCloseTo(241335, 6) //  AD8
      expect(it_.stressTestedPayment).toBeCloseTo(3615.000489, 5) // AH8 ('Loan Criteria' R6)
      expect(it_.stressPaymentGap).toBeCloseTo(-1293.840489, 5) //   AL8
    })

    it('Artworks — negative equity is reported, never clamped', () => {
      const it_ = byKey(r, 'artworks')
      expect(it_.adjustedValue).toBeCloseTo(348750, 6) //            M14 (375000 × 93%)
      expect(it_.currentEquity).toBeCloseTo(-1250, 6) //             R14 (debt exceeds adjusted value)
      expect(it_.availableSecurity).toBeCloseTo(-105875, 6) //       AB14
      expect(it_.stressedDepositRequired).toBeCloseTo(104625, 6) //  AD14
      expect(it_.stressTestedPayment).toBeCloseTo(1567.196744, 5) // AH14 ('Loan Criteria' R12)
      expect(it_.stressPaymentGap).toBeCloseTo(753.9632561, 5) //    AL14 (only row paying MORE than stress)
    })

    it('Classic Cars — spot check', () => {
      const it_ = byKey(r, 'classicCars')
      expect(it_.loanLimit).toBeCloseTo(315000, 6) //                Z12
      expect(it_.availableSecurity).toBeCloseTo(-35000, 6) //        AB12
    })
  })

  describe('commercial security items (Capital Input rows 21–39)', () => {
    it('Commercial Property — carries the cap-based valuation through the grid', () => {
      const it_ = byKey(r, 'commercialProperty')
      expect(it_.value).toBeCloseTo(1326732.673, 2) //               G21 (= D26)
      expect(it_.currentEquity).toBeCloseTo(886732.6733, 3) //       R21
      expect(it_.loanLimit).toBeCloseTo(796039.604, 2) //            Z21 (× 60%)
      expect(it_.availableSecurity).toBeCloseTo(356039.604, 2) //    AB21
      expect(it_.stressedDepositRequired).toBeCloseTo(530693.0693, 3) // AD21
      expect(it_.stressTestedPayment).toBeCloseTo(7379.385519, 5) // AH21 ('Loan Criteria' R14)
    })

    it('Plant & Equipment — the harshest lend % (30%) with Decline', () => {
      const it_ = byKey(r, 'plantEquipment')
      expect(it_.adjustedValue).toBeCloseTo(44640, 6) //             M23 (48000 × 93%)
      expect(it_.loanLimit).toBeCloseTo(13392, 6) //                 Z23
      expect(it_.availableSecurity).toBeCloseTo(1392, 6) //          AB23
      expect(it_.stressedDepositRequired).toBeCloseTo(31248, 6) //   AD23
      expect(it_.stressTestedPayment).toBeCloseTo(282.8958711, 5) // AH23 ('Loan Criteria' R16)
    })

    it('Vehicles — spot check', () => {
      const it_ = byKey(r, 'vehicles')
      expect(it_.loanLimit).toBeCloseTo(39000, 6) //                 'Loan Criteria' P18
      expect(it_.stressTestedPayment).toBeCloseTo(742.329081, 5) //  'Loan Criteria' R18
    })

    it('Fonterra Shares — carries the share valuation through the grid', () => {
      const it_ = byKey(r, 'fonterraShares')
      expect(it_.value).toBeCloseTo(173250, 6) //                    G39 (= D31)
      expect(it_.loanLimit).toBeCloseTo(95287.5, 6) //               Z39 (× 55%)
      expect(it_.availableSecurity).toBeCloseTo(83287.5, 6) //       AB39
      expect(it_.stressedDepositRequired).toBeCloseTo(77962.5, 6) // AD39
      expect(it_.stressTestedPayment).toBeCloseTo(1989.593309, 5) // AH39 ('Loan Criteria' R32)
    })
  })

  describe('personal totals and ratios (Capital Input rows 16–17)', () => {
    it('sums the personal grid to the source totals', () => {
      const t = r.totals.personal
      expect(t.value).toBeCloseTo(4390000, 6) //                     G16
      expect(t.adjustedValue).toBeCloseTo(4303200, 6) //             M16
      expect(t.currentDebt).toBeCloseTo(3210000, 6) //               P16
      expect(t.currentEquity).toBeCloseTo(1093200, 6) //             R16
      expect(t.currentMonthlyPayments).toBeCloseTo(20227.48, 6) //   V16
      expect(t.loanLimit).toBeCloseTo(3282240, 6) //                 Z16
      expect(t.availableSecurity).toBeCloseTo(72240, 6) //           AB16
      expect(t.stressedDepositRequired).toBeCloseTo(1020960, 6) //   AD16
      expect(t.stressTestedPayments).toBeCloseTo(25257.12849, 4) //  AH16
      expect(t.stressPaymentGap).toBeCloseTo(-5029.648493, 5) //     AL16
    })

    it('ratios divide by the personal asset-value total', () => {
      const ra = r.ratios.personal
      expect(ra.debtToValue).toBeCloseTo(0.7312072893, 9) //         P17 (= P16/$G$16)
      expect(ra.equityToValue).toBeCloseTo(0.2490205011, 9) //       R17
      expect(ra.loanLimitToValue).toBeCloseTo(0.7476628702, 9) //    Z17
      expect(ra.availableSecurityToValue).toBeCloseTo(0.01645558087, 9) // AB17
    })
  })

  describe('commercial totals and ratios (Capital Input rows 41–42)', () => {
    it('sums the commercial grid to the source totals', () => {
      const t = r.totals.commercial
      expect(t.value).toBeCloseTo(13143782.67, 1) //                 G41
      expect(t.adjustedValue).toBeCloseTo(12877922.67, 1) //         M41
      expect(t.currentDebt).toBeCloseTo(4849478, 6) //               P41
      expect(t.currentEquity).toBeCloseTo(8028444.673, 2) //         R41
      expect(t.currentMonthlyPayments).toBeCloseTo(18930.95, 6) //   V41
      expect(t.loanLimit).toBeCloseTo(7270519.104, 2) //             Z41
      expect(t.availableSecurity).toBeCloseTo(2421041.104, 2) //     AB41
      expect(t.stressedDepositRequired).toBeCloseTo(5607403.569, 2) // AD41
      expect(t.stressTestedPayments).toBeCloseTo(67964.43219, 4) //  AH41
      expect(t.stressPaymentGap).toBeCloseTo(-49033.48219, 4) //     AL41
    })

    it('ratios divide by the commercial asset-value total', () => {
      const ra = r.ratios.commercial
      expect(ra.debtToValue).toBeCloseTo(0.3689560396, 9) //         P42 (= P41/G41)
      expect(ra.equityToValue).toBeCloseTo(0.6108169066, 9) //       R42
      expect(ra.loanLimitToValue).toBeCloseTo(0.5531527175, 9) //    Z42
      expect(ra.availableSecurityToValue).toBeCloseTo(0.1841966779, 9) // AB42
    })
  })

  describe('combined totals (Capital Input row 43)', () => {
    it('personal + commercial, exactly as the sheet adds them', () => {
      const t = r.totals.combined
      expect(t.value).toBeCloseTo(17533782.67, 1) //                 G43
      expect(t.adjustedValue).toBeCloseTo(17181122.67, 1) //         M43
      expect(t.currentDebt).toBeCloseTo(8059478, 6) //               P43
      expect(t.currentEquity).toBeCloseTo(9121644.673, 2) //         R43
      expect(t.currentMonthlyPayments).toBeCloseTo(39158.43, 6) //   V43
      expect(t.loanLimit).toBeCloseTo(10552759.1, 1) //              Z43
      expect(t.availableSecurity).toBeCloseTo(2493281.104, 2) //     AB43
      expect(t.stressedDepositRequired).toBeCloseTo(6628363.569, 2) // AD43
      expect(t.stressTestedPayments).toBeCloseTo(93221.56068, 4) //  AH43
      expect(t.stressPaymentGap).toBeCloseTo(-54063.13068, 4) //     AL43
    })
  })

  describe('sub-calculations (Capital Input, left column)', () => {
    it('cap-based commercial property value', () => {
      expect(capBasedPropertyValue(67000, 0.0505)).toBeCloseTo(1326732.673, 2) // D26 (= D22/D25)
      expect(r.subCalculations.capBasedPropertyValue).toBeCloseTo(1326732.673, 2)
    })

    it('Fonterra shareholding value', () => {
      expect(fonterraShareValue(45000, 3.85)).toBeCloseTo(173250, 6) // D31 (= D29×D30)
      expect(r.subCalculations.fonterraShareValue).toBeCloseTo(173250, 6)
    })

    it('overdraft monthly interest — negative, as the sheet displays it', () => {
      expect(overdraftMonthlyInterest(25000, true)).toBeCloseTo(-320.625, 6) // C38 ('Loan Criteria' J47: IPMT(15.39%/12, 1, 36, 25000))
      expect(r.subCalculations.overdraftMonthlyInterest).toBeCloseTo(-320.625, 6)
    })
  })

  describe('formula branches the sample scenario never exercises', () => {
    // No cached anchor exists for these — the assertions below are hand-derived from
    // the workbook's own formulas (cell given), not from cached values.
    it('Growth prospects adjust UP (Capital Input M6 formula, Growth branch)', () => {
      const it_ = computeSecurityItem({ key: 'residentialHome', value: 1000000, adjustmentPct: 0.05, prospects: 'Growth' })
      expect(it_.adjustedValue).toBeCloseTo(1050000, 6) // = G + G×I
    })

    it('anything not Static/Growth falls to the Decline branch, as the formula does', () => {
      const it_ = computeSecurityItem({ key: 'residentialHome', value: 1000000, adjustmentPct: 0.05, prospects: 'unexpected' })
      expect(it_.adjustedValue).toBeCloseTo(950000, 6) // M6 formula's else-branch
    })

    it('unsecured overdraft uses the 22% rate (Loan Criteria F46)', () => {
      expect(overdraftMonthlyInterest(25000, false)).toBeCloseTo(-458.3333333, 5) // = −25000×22%/12
    })
  })

  describe('repayment schedules (Interest sheet — Part D, Phase 2)', () => {
    // Sample loan (`Capital Input` D6–D16): $1,350,000 less $270,000 deposit at
    // 5.5% over 36 years, Table basis.
    const t = computeRepaymentSchedule(DEFAULT_LOAN_INPUTS)
    const red = computeRepaymentSchedule(Object.assign({}, DEFAULT_LOAN_INPUTS, { basis: 'Reducing' }))

    it('derives the loan variables the sheet derives', () => {
      expect(t.loanAmount).toBeCloseTo(1080000, 6) // G22 (= C22 − C16)
      expect(t.termMonths).toBe(432) //               C20 (36 Years → months)
    })

    it('the three quick figures — incl. the hand-verified Table anchor', () => {
      expect(t.payments.table).toBeCloseTo(5747.094633, 5) //       C29/C31 (= Capital Input D18) — hand-verified anchor
      expect(t.payments.reducingFirstMonth).toBeCloseTo(7450, 6) // K29 (= 2500 principal + 4950 interest)
      // G24 — CORRECTED (owner ruling 2026-07-23): interest accrues on the
      // BORROWED amount. The source read C22×rate/12 (purchase price → 6187.5);
      // corrected in code and in the source workbook to G22×rate/12.
      expect(t.payments.interestOnly).toBeCloseTo(4950, 6) // = 1,080,000 × 5.5% ÷ 12
      expect(t.monthlyRepayment).toBeCloseTo(5747.094633, 5) // D18 picks by basis
      expect(red.monthlyRepayment).toBeCloseTo(7450, 6)
    })

    it('Table basis — all ten years of interest', () => {
      const got = t.years.map(y => y.interest)
      const cached = [59155.15681, 58601.7969, 58017.22313, 57399.67482, 56747.29192,
        56058.1095, 55330.05177, 54560.92587, 53748.41522, 52890.07258] // W6..AF6 (shown C6..M6)
      cached.forEach((v, i) => expect(got[i]).toBeCloseTo(v, 4))
      expect(t.totals.interest).toBeCloseTo(562508.7185, 3) // N6
    })

    it('Table basis — all ten years of principal', () => {
      const got = t.years.map(y => y.principal)
      const cached = [9809.978781, 10363.33869, 10947.91246, 11565.46077, 12217.84367,
        12907.02609, 13635.08382, 14404.20972, 15216.72037, 16075.06301] // W12..AF12 (shown C8..M8)
      cached.forEach((v, i) => expect(got[i]).toBeCloseTo(v, 4))
      expect(t.totals.principal).toBeCloseTo(127142.6374, 3) // N8
    })

    it('Table basis — all ten year-end balances, and the sheet\'s own total row', () => {
      const got = t.years.map(y => y.closingBalance)
      const cached = [1070190.021, 1059826.683, 1048878.77, 1037313.309, 1025095.466,
        1012188.44, 998553.3557, 984149.146, 968932.4256, 952857.3626] // W9..AF9 (shown C10..M10)
      cached.forEach((v, i) => expect(got[i]).toBeCloseTo(v, 2))
      expect(t.totals.closingBalances).toBeCloseTo(10157984.98, 1) // N10 (sums year-END balances — the sheet's own metric, reproduced)
    })

    it('Reducing basis — constant principal, falling interest', () => {
      red.years.forEach(y => expect(y.principal).toBeCloseTo(30000, 6)) // W11..AF11 (2500 × 12)
      const gotInterest = red.years.map(y => y.interest)
      const cached = [58643.75, 56993.75, 55343.75, 53693.75, 52043.75,
        50393.75, 48743.75, 47093.75, 45443.75, 43793.75] // W5..AF5
      cached.forEach((v, i) => expect(gotInterest[i]).toBeCloseTo(v, 5))
      expect(red.totals.interest).toBeCloseTo(512187.5, 5) // formula-derived (sheet caches the Table basis)
    })

    it('Reducing basis — the corrected balance row (owner ruling 2026-07-23)', () => {
      // Years 1–4 match the sheet's W8..Z8 as-is. Years 5–10 assert the values
      // the sheet SHOULD show — its own column-N balances (N90..N150) — not the
      // impossible cached 276718.75/180000/…/300000 that AA8..AF8 displayed by
      // reading O90/P102..P150. Source workbook corrected in the same commit.
      const got = red.years.map(y => y.closingBalance)
      const cached = [1050000, 1020000, 990000, 960000, //   W8..Z8 (and N42..N78)
        930000, 900000, 870000, 840000, 810000, 780000] //   N90..N150 (corrected AA8..AF8)
      cached.forEach((v, i) => expect(got[i]).toBeCloseTo(v, 6))
    })

    it('Interest Only — a payment figure, no schedule (the sheet has none)', () => {
      const io = computeRepaymentSchedule(Object.assign({}, DEFAULT_LOAN_INPUTS, { basis: 'Interest Only' }))
      expect(io.monthlyRepayment).toBeCloseTo(4950, 6) // corrected G24
      expect(io.years).toBeNull()
      expect(io.totals).toBeNull()
    })

    it('input discipline — defaults declared, unknown basis throws', () => {
      expect(t.defaultedInputs).toEqual([])
      const demo = computeRepaymentSchedule({})
      expect(demo.defaultedInputs).toEqual(['purchasePrice', 'deposit', 'annualRate', 'term', 'termUnit', 'basis'])
      expect(demo.monthlyRepayment).toBeCloseTo(5747.094633, 5) // and still computes the sample
      expect(() => computeRepaymentSchedule({ basis: 'Balloon' })).toThrow(/Unknown repayment basis/)
    })
  })

  describe('serviceability (Serviceability Input — Part C, Phase 3)', () => {
    // The Ripper household: two incomes, two rentals, 3+1 dependants, a
    // $500,000 new property loan, real living costs.
    const s = computeServiceability(DEFAULT_SERVICEABILITY_INPUTS)

    it('taxes both customers to net through the central tax-band feeder', () => {
      expect(s.income.customer1.tax).toBeCloseTo(18422.5, 6) //       AN4 (86,500 gross)
      expect(s.income.customer1.net).toBeCloseTo(68077.5, 6) //       BC6 / H25
      expect(s.income.customer1.netMonthly).toBeCloseTo(5673.125, 6) // J25
      expect(s.income.customer2.tax).toBeCloseTo(5908, 6) //          BB9 (40,000 gross)
      expect(s.income.customer2.net).toBeCloseTo(34092, 6) //         BC8 / H27
      expect(s.taxTable.country).toBe('NZ')
    })

    it('taxes rentals at the marginal band of the stacked total — the CORRECTED rule', () => {
      // AL13 as ruled (Mike 2026-07-23): 33,800 stacked to 160,300 → 33% band.
      // The sheet's missing-parens branch cached 8,027 (= 33,800 − 78,100×33%);
      // corrected in the source .xlsx in the same commit.
      expect(s.income.rental1.annual).toBeCloseTo(33800, 6) //        AI13 (650/wk × 52)
      expect(s.income.rental1.tax).toBeCloseTo(11154, 6) //           AL13 corrected (was 8,027)
      expect(s.income.rental1.net).toBeCloseTo(22646, 6) //           AM13 corrected (was 25,773)
      // AL16 fell in its clean band-5 branch, so its cached value was already right:
      expect(s.income.rental2.tax).toBeCloseTo(11154, 6) //           AL16 (28,600 × 39%)
      expect(s.income.rental2.netMonthly).toBeCloseTo(1453.833333, 5) // J33 (unchanged)
      expect(s.income.totalNetMonthly).toBeCloseTo(11855.125, 6) //   N25 corrected (was 12,115.70833)
    })

    it('reprices every loan row at the bank\'s worst case (max rate, min term)', () => {
      expect(s.loanMinimums.newPropertyLoans).toBeCloseTo(4178.875443, 5) // N16/AO25: PMT(8.95%/12, 25y, 500,000)
      expect(s.loanMinimums.total).toBeCloseTo(4178.875443, 5) //           N9 (the other three rows are 0 on the sample)
      // The personal-term row uses the ACTUAL rate alone (AI29) — prove it prices at 13.95%:
      const withPersonal = computeServiceability(Object.assign({}, DEFAULT_SERVICEABILITY_INPUTS, {
        loans: Object.assign({}, DEFAULT_SERVICEABILITY_INPUTS.loans, {
          personalTermLoans: { balance: 10000, actualRate: 0.1395, assessmentTermYears: 7, actualTermYears: 5 }
        })
      }))
      expect(withPersonal.loanMinimums.personalTermLoans).toBeCloseTo(232.423371153, 5) // hand-derived: PMT(13.95%/12, 60, 10,000)
    })

    it('sums the actual expenses as the sheet does', () => {
      expect(s.expenses.studentLoans).toBeCloseTo(1654, 6) //         J40+J41 (1002 + 652)
      expect(s.expenses.overdraftMin).toBeCloseTo(8.75, 6) //         J43 (500 × 1.75%)
      expect(s.expenses.creditCardMin).toBeCloseTo(210, 6) //         J44 (7,000 × 3%)
      expect(s.expenses.rentMonthly).toBeCloseTo(2166.666667, 5) //   J52
      expect(s.expenses.total).toBeCloseTo(7831.083333, 5) //         N40
    })

    it('builds the bank\'s minimum-allowances floor', () => {
      expect(s.allowances.dependantsUnder18Monthly).toBeCloseTo(1841.666667, 5) // AM38 (175 + 2×125 = 425/wk)
      expect(s.allowances.dependantsOver18Monthly).toBeCloseTo(411.6666667, 5) //  AM44 (95/wk)
      expect(s.allowances.vehiclesMonthly).toBeCloseTo(600, 6) //                  J50 (2 × 300)
      expect(s.allowances.adultLivingMonthly).toBeCloseTo(1776.666667, 5) //       AE53 (joint → 2 × 205/wk)
      expect(s.allowances.floor).toBeCloseTo(4630, 6) //                           AE55
    })

    it('the corrected surplus — the household actually fails the test', () => {
      // N64 corrected: 11,855.125 − 4,178.875443 − 7,831.083333. The sheet's
      // cached 105.7495571 included the rental-tax defect; the delta is exactly
      // (25,773 − 22,646)/12 = 260.5833. Source .xlsx corrected in this commit.
      expect(s.surplus).toBeCloseTo(-154.833776247, 5)
      expect(s.verdictPass).toBe(false) // J64's test (> 250): fails either way on the sample
    })

    it('the floor binds when actual expenses are lower (N64\'s other branch)', () => {
      const lean = computeServiceability(Object.assign({}, DEFAULT_SERVICEABILITY_INPUTS, {
        studentLoan1Monthly: 0, studentLoan2Monthly: 0, overdraftLimits: 0, creditCardLimits: 0, rentPaidWeekly: 0, generalLivingWeekly: 0, additionalLivingWeekly: 0
      }))
      // expenses 0 < floor 4,630 → the floor is charged instead
      expect(lean.surplus).toBeCloseTo(11855.125 - 4178.875442914 - 4630, 5)
    })

    it('the verdict flips above the configured 250 threshold', () => {
      const noRent = computeServiceability(Object.assign({}, DEFAULT_SERVICEABILITY_INPUTS, { rentPaidWeekly: 0 }))
      expect(noRent.surplus).toBeCloseTo(-154.833776247 + 2166.666666667, 5) // ≈ 2,011.83
      expect(noRent.verdictPass).toBe(true)
    })

    it('the tax feeder: marginal maths verified, absent countries fail loudly', () => {
      expect(incomeTax(15600, getTaxBands('NZ').bands)).toBeCloseTo(1638, 6) //   first band exactly
      expect(incomeTax(200000, getTaxBands('NZ').bands)).toBeCloseTo(57077.5, 6) // hand-derived, all five bands
      // Australia is deliberately ABSENT until a verified table exists (ruling
      // 2026-07-23) — visibly missing beats the workbook's present-and-zero:
      expect(() => getTaxBands('AU')).toThrow(/No verified tax-band table/)
    })

    it('input discipline — defaults declared per field (R8)', () => {
      expect(s.defaultedInputs).toEqual([])
      const demo = computeServiceability({})
      expect(demo.defaultedInputs).toContain('customer1GrossIncome')
      expect(demo.defaultedInputs).toContain('loans')
      expect(demo.surplus).toBeCloseTo(-154.833776247, 5) // and still computes the sample
    })

    // APP-ORIGINAL formula (Mike, 2026-07-23) — no workbook cell to anchor to,
    // so it is proven by ROUND TRIP: the reported maximum, fed back in as the
    // New Property Loans balance, must land the surplus exactly on the
    // 250 threshold (the edge of passing).
    describe('maxAffordableNewLoan (app-original — indication only)', () => {
      /** @param {number} balance @returns {Object} the sample with the new loan set to `balance`. */
      function withNewLoan (balance) {
        const loans = JSON.parse(JSON.stringify(DEFAULT_SERVICEABILITY_INPUTS.loans))
        loans.newPropertyLoans.balance = balance
        return Object.assign({}, DEFAULT_SERVICEABILITY_INPUTS, { loans })
      }

      it('round-trips: borrowing the reported maximum lands surplus exactly on the threshold', () => {
        const max = s.maxAffordableNewLoan
        // The sample fails on 500,000, so the affordable figure must be below it.
        expect(max).toBeGreaterThan(0)
        expect(max).toBeLessThan(500000)
        const atMax = computeServiceability(withNewLoan(max))
        expect(atMax.surplus).toBeCloseTo(250, 6) // the configured verdict threshold
        // A dollar less than the edge passes; the edge itself is the boundary (> 250).
        expect(computeServiceability(withNewLoan(max - 1)).verdictPass).toBe(true)
      })

      it('floors at zero when the household cannot afford any new borrowing', () => {
        const broke = computeServiceability(Object.assign({}, DEFAULT_SERVICEABILITY_INPUTS, {
          customer1GrossIncome: 0, customer2GrossIncome: 0, currentRentalWeekly: 0, newRentalWeekly: 0
        }))
        expect(broke.maxAffordableNewLoan).toBe(0)
      })
    })
  })

  describe('business block (Serviceability Input — Part E, Phase 6)', () => {
    // The Ripper business: EBIT 342,000, 14 full-time + 3 part-time staff,
    // 25,000 tax due, and the nine commercial securities (Capital Input rows
    // 23–39). Every anchor below is the workbook's own cached value EXCEPT the
    // two the double-count correction moved — flagged inline.
    const b = computeBusinessBlock(DEFAULT_BUSINESS_INPUTS)

    it('carries each commercial class through at its adjusted value, debt, security and Year-1 interest', () => {
      const plant = b.items.find(it => it.key === 'plantEquipment')
      expect(plant.adjustedValue).toBeCloseTo(44640, 6) //       E78 (= Capital Input M23)
      expect(plant.currentDebt).toBeCloseTo(12000, 6) //         G78
      expect(plant.availableSecurity).toBeCloseTo(1392, 6) //    H78
      expect(plant.year1Interest).toBeCloseTo(-135.72, 4) //     J78 (= 1392 × 9.75%, sign kept)

      const farm = b.items.find(it => it.key === 'farmDairy')
      expect(farm.availableSecurity).toBeCloseTo(592500, 6) //   H86
      expect(farm.year1Interest).toBeCloseTo(-50362.5, 3) //     J86 (= 592500 × 8.5%)

      const fonterra = b.items.find(it => it.key === 'fonterraShares')
      expect(fonterra.year1Interest).toBeCloseTo(-7704.09375, 4) // J94 (= 83287.5 × 9.25%)
    })

    it('gates Year-1 interest to zero when a class has no lending headroom (Horticulture)', () => {
      // H90 = −265,478 (debt exceeds the lending limit). The sheet's
      // IF(remainingSecurity > 1, …, 0) contributes nothing — but H96 STILL
      // sums the negative headroom into the security total, so both are asserted.
      const hort = b.items.find(it => it.key === 'horticulture')
      expect(hort.availableSecurity).toBeCloseTo(-265478, 6) //  H90 (negative, reported not clamped)
      expect(hort.year1Interest).toBe(0) //                      J90 (gated out)
    })

    it('rolls the nine classes up to the source totals', () => {
      expect(b.totals.adjustedValue).toBeCloseTo(11551190, 4) //   E96
      expect(b.totals.currentDebt).toBeCloseTo(4409478, 4) //      G96
      expect(b.totals.availableSecurity).toBeCloseTo(2065001.5, 4) // H96 (includes Horticulture's −265,478)
      expect(b.totals.year1Interest).toBeCloseTo(-200942.81375, 3) // J96
    })

    it('covers EBIT against first-year interest (N96)', () => {
      expect(b.ebitToInterestRatio).toBeCloseTo(1.701976765, 7) // N96 (= |342,000 ÷ −200,942.81|)
    })

    it('adjusts the security for staff and tax — CORRECTED: staff counted once', () => {
      // The source double-counted the staff cost (Loan Criteria Z43 added
      // Z39+Z40 AND their sum Z41): 211,000 → bank-adjusted security 1,854,001.5.
      // Corrected in code and the source .xlsx in this commit: staff once.
      expect(b.securityAdjustment).toBeCloseTo(118000, 6) //             Z43 corrected (was 211,000): 84,000 + 9,000 + 25,000
      expect(b.bankAdjustedMaxSecurity).toBeCloseTo(1947001.5, 4) //     H98 corrected (was 1,854,001.5)
    })

    it('prices the EBIT-serviced maximum loan and its monthly payment', () => {
      expect(b.coverageDivisor).toBe(3) //                          Z45 (Commercial Business → else branch)
      expect(b.ebitServiceableAnnual).toBeCloseTo(114000, 6) //     AB40 (= 342,000 ÷ 3)
      expect(b.maxBankAdjustedLoan).toBeCloseTo(-977191.0856, 3) // D40/G102 (PV(9.5%, 15y, 114,000), annuity due, negative)
      expect(b.monthlyPaymentRequired).toBeCloseTo(10204.07051, 4) // L101 (PMT(9.5%/12, 180, |loan|))
    })

    it('a Farm business services more per dollar of EBIT — divisor 1.5 (Loan Criteria Z45)', () => {
      // No cached anchor (the sample is a Commercial Business); hand-derived
      // from the Z45 formula's Farm branch (Z47 = 1.5).
      const farm = computeBusinessBlock(Object.assign({}, DEFAULT_BUSINESS_INPUTS, { businessType: 'Farm' }))
      expect(farm.coverageDivisor).toBe(1.5)
      expect(farm.ebitServiceableAnnual).toBeCloseTo(228000, 6) // = 342,000 ÷ 1.5
      expect(farm.maxBankAdjustedLoan).toBeCloseTo(-977191.0856 * 2, 3) // PV is linear in the payment
    })

    it('reports the pass-through figures the screen shows', () => {
      expect(b.ebit).toBe(342000) //          N72
      expect(b.fullTimeStaff).toBe(14) //      E100
      expect(b.partTimeStaff).toBe(3) //       E101
      expect(b.currentTaxDue).toBe(25000) //   E103
      expect(b.businessType).toBe('Commercial Business') // E74
    })

    it('input discipline — defaults declared per field (R8)', () => {
      expect(b.defaultedInputs).toEqual([])
      const demo = computeBusinessBlock({})
      expect(demo.defaultedInputs).toContain('ebit')
      expect(demo.defaultedInputs).toContain('securities')
      expect(demo.bankAdjustedMaxSecurity).toBeCloseTo(1947001.5, 4) // still computes the (corrected) sample
    })
  })

  describe('input discipline', () => {
    it('an unknown security class fails loudly, never computes on guessed rules', () => {
      expect(() => computeSecurityItem({ key: 'cryptoWallet', value: 100000 })).toThrow(/Unknown security class/)
    })

    it('defaults never substitute silently — omitted blocks are named (R8 ruling)', () => {
      expect(r.defaultedInputs).toEqual([]) // fully-supplied inputs declare nothing
      const demo = computeLoanEstimator({})
      expect(demo.defaultedInputs).toEqual(['securities', 'subCalculations', 'overdraft'])
      expect(demo.totals.combined.adjustedValue).toBeCloseTo(17181122.67, 1) // and still computes the sample (M43)
    })

    it('numeric fields arriving as JSON strings coerce, never concatenate', () => {
      const it_ = computeSecurityItem({ key: 'residentialHome', value: '1350000', currentDebt: '1080000' })
      expect(it_.currentEquity).toBeCloseTo(270000, 6) // R6
      expect(it_.loanLimit).toBeCloseTo(1080000, 6) //   Z6
    })
  })

  describe('the assembled report (what /api/report/loan-estimator returns)', () => {
    it('all three hand-verified anchors land through the assembler', () => {
      const rep = computeLoanEstimatorReport({
        securityPosition: DEFAULT_INPUTS,
        repayment: DEFAULT_LOAN_INPUTS,
        serviceability: DEFAULT_SERVICEABILITY_INPUTS
      })
      const home = rep.securityPosition.items.find(it => it.key === 'residentialHome')
      expect(home.stressTestedPayment).toBeCloseTo(9026.370957, 5) //  AB6
      expect(rep.repayment.monthlyRepayment).toBeCloseTo(5747.094633, 5) // C29/C31
      expect(rep.serviceability.surplus).toBeCloseTo(-154.833776247, 5) // N64 corrected
      expect(rep.serviceability.verdictPass).toBe(false)
    })

    it('a missing block computes on the sample and SAYS so, per part (R8)', () => {
      const rep = computeLoanEstimatorReport({ repayment: DEFAULT_LOAN_INPUTS })
      expect(rep.repayment.defaultedInputs).toEqual([])
      expect(rep.securityPosition.defaultedInputs).toEqual(['securities', 'subCalculations', 'overdraft'])
      expect(rep.serviceability.defaultedInputs).toContain('customer1GrossIncome')
    })

    it('a bad block fails the whole call loudly — no partial payload', () => {
      expect(() => computeLoanEstimatorReport({ serviceability: { country: 'AU' } })).toThrow(/No verified tax-band table/)
      expect(() => computeLoanEstimatorReport({ securityPosition: { securities: [{ key: 'cryptoWallet' }] } })).toThrow(/Unknown security class/)
    })
  })
})
