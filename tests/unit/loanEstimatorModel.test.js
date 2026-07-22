'use strict'

const {
  DEFAULT_INPUTS,
  DEFAULT_LOAN_INPUTS,
  computeLoanEstimator,
  computeRepaymentSchedule,
  computeSecurityItem,
  capBasedPropertyValue,
  fonterraShareValue,
  overdraftMonthlyInterest
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
})
