'use strict'

const {
  DEFAULT_INPUTS,
  YEARS,
  MORTGAGE_TABLE,
  MORTGAGE_REDUCING,
  WORKBOOK_CORRECTIONS,
  excelPmt,
  excelPv,
  mortgageSchedule,
  averageTaxRate,
  projectProperty,
  computeQuickCalculator,
  computeRetirementReview
} = require('../../server/report/retirementReviewModel')

/**
 * GOLDEN TEST — Retirement Review.
 *
 * Source workbook: `design/report-source-models/Exposure.Retirement.Review (1).xlsx`.
 * Every expected number is the workbook's OWN cached value with its cell reference
 * beside it, EXCEPT inside "Ruled corrections", where both figures are given —
 * the workbook's and ours — so the difference is checkable rather than asserted.
 *
 * 🔴 THIS MODEL DELIBERATELY DOES NOT REPRODUCE THE WORKBOOK. Three ruled
 * corrections (Mike, 2026-09-13) stand between the two, listed in the model's
 * header and carried on every result as `workbookCorrections`.
 *
 * That raises the obvious question: if the output differs, what proves the port is
 * faithful rather than merely different? Three things, in order of strength.
 *
 *   1. IT WAS PROVED BEFORE THE CORRECTIONS WERE APPLIED. Every cached value on all
 *      six sheets, all twenty years of all twelve series, matched exactly. The
 *      corrections were then applied one at a time on Mike's ruling.
 *   2. EVERYTHING THE CORRECTIONS DO NOT TOUCH IS STILL PINNED TO THE WORKBOOK —
 *      the Quick Calculator, all three mortgage types, the year-one position, the
 *      tax arithmetic, and the series for income required, superannuation and
 *      other investments.
 *   3. THE ONE STRUCTURAL CORRECTION IS PINNED TO THE WORKBOOK'S OWN NUMBERS.
 *      Realigning the sixth property is a pure shift, so its corrected series must
 *      equal the workbook's shifted series exactly — thirteen years of the
 *      workbook's own cached values, read back four columns earlier. A correction
 *      that changed anything else would fail that.
 */

// The workbook stores full floating-point values; 6dp is far tighter than anything the
// report displays, while tolerating IEEE noise.
const P = 6
// Twenty-year series compound through twenty steps, so later years carry more float
// drift than early ones. A tenth of a cent is still far below anything displayed.
const SERIES_P = 3

/**
 * The workbook's own tax bands — New Zealand BEFORE the 2024 threshold change.
 * Superseded, and deliberately NOT what the model ships; they live here only so the
 * band arithmetic can be proved against the workbook's cached figures.
 * (`Use of Assets in Retirement` AJ8:AJ11 thresholds, AL8:AL12 rates.)
 */
const WORKBOOK_BANDS = [
  { upTo: 14000, rate: 0.105 },
  { upTo: 48000, rate: 0.175 },
  { upTo: 70000, rate: 0.3 },
  { upTo: 180000, rate: 0.33 },
  { upTo: null, rate: 0.39 }
]

/** `Use of Assets in Retirement` BM7 — the workbook's own average tax rate. */
const WORKBOOK_TAX_RATE = 0.1292620422

const model = computeRetirementReview()
const projection = model.projection

/** Assert a whole 20-year series against a cached row. */
function expectSeries (got, want, precision) {
  expect(got).toHaveLength(YEARS)
  want.forEach((expected, i) => {
    expect(got[i]).toBeCloseTo(expected, precision === undefined ? SERIES_P : precision)
  })
}

describe('Retirement Review — golden values from Exposure.Retirement.Review (1).xlsx', () => {
  // ───────────────────────────────────────────────────────────────────────────
  describe('Sheet "Quick Calculator" — the savings gap', () => {
    const quick = computeQuickCalculator()

    it('carries the income the client says they want (F19 = F12)', () => {
      expect(quick.monthlyIncomeRequired).toBeCloseTo(7500, P)
    })

    it('prices the lump sum that income needs, as an annuity due with a retained sum (F23)', () => {
      // -PV(F20/12, F21*12, F19, F22, 1) — 1.7% net, 20 years, 7,500/month, 8,000 left.
      expect(quick.lumpSumRequired).toBeCloseTo(1532871.031, 2)
    })

    it('takes off the assets the client would sell (F28 = F23 - F15)', () => {
      expect(quick.savingsTarget).toBeCloseTo(1522871.031, 2)
    })

    it('turns the target into a monthly savings figure (F29)', () => {
      // -PMT(F25/12, F24*12, -F26, F28, 1) — 4% while saving, 7 years, 50 in hand.
      expect(quick.monthlySavingsRequired).toBeCloseTo(15686.62026, 2)
    })

    it('names the shortfall against what the client actually saves (F29 less F8)', () => {
      // The workbook prints both figures and leaves the reader to subtract. That
      // subtraction is the whole point of the sheet, so the model does it.
      expect(quick.monthlySavingsShortfall).toBeCloseTo(15686.62026 - 1000, 2)
    })

    it('carries the free-text answers through untouched, because the adviser reads them', () => {
      expect(quick.answers.retirementMeaning).toBe('Freedom') // F5
      expect(quick.answers.wouldHateToMiss).toBe('Sleep') //     F11
      expect(quick.answers.lookingForwardTo).toBe('Golf') //     F13
      expect(quick.answers.provisionsRemoveNeed).toBe('No') //   F14
      expect(quick.answers.retirementAge).toBe(65) //            F6
    })

    it('is self-contained — it shares no figure with the projection', () => {
      // The two halves answer different questions and the workbook keeps them on
      // separate sheets. An adviser can run the calculator in a first meeting,
      // before any of the client's position is known.
      const other = computeQuickCalculator({ desiredMonthlyIncome: 9000 })
      expect(other.lumpSumRequired).toBeGreaterThan(quick.lumpSumRequired)
      expect(computeRetirementReview().projection.weeklyIncomeRequired[0]).toBe(1700)
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  describe('The mortgage engine — replacing two hidden sheets of monthly rows', () => {
    const [home1, home2, home3] = DEFAULT_INPUTS.position.properties

    it('prices a Table mortgage as a constant instalment (Mtg Calcs C23)', () => {
      // Home 2: 312,000 at 5.35% over 15 years.
      expect(mortgageSchedule(home2).monthlyPayment).toBeCloseTo(2524.533819, 4)
    })

    it('prices a Reducing mortgage as constant principal plus falling interest', () => {
      // Home 3: 285,000 at 6.05% over 14 years. Month 1 only — the payment falls.
      expect(mortgageSchedule(home3).monthlyPayment).toBeCloseTo(3133.303571, 4)
    })

    it('prices an Interest Only mortgage as debt times rate (Use of Assets T29)', () => {
      // Home 1: 300,000 at 5% — 1,250 a month, and the principal never moves.
      expect(mortgageSchedule(home1).monthlyPayment).toBeCloseTo(1250, P)
      expect(mortgageSchedule(home1).debtAtYearEnd[0]).toBeCloseTo(300000, P)
      expect(mortgageSchedule(home1).debtAtYearEnd[13]).toBeCloseTo(300000, P)
    })

    it('runs a Table loan down to nothing over its term (Mtg Calcs C4 / D4 / E4)', () => {
      // Home 1's own figures are read as Interest Only, but the hidden sheet computes
      // all three types for every property. These are its Table column, years 1–3.
      const asTable = mortgageSchedule(Object.assign({}, home1, { mortgageType: MORTGAGE_TABLE }))
      expect(asTable.debtAtYearEnd[0]).toBeCloseTo(286218.4474, 3)
      expect(asTable.debtAtYearEnd[1]).toBeCloseTo(271731.8043, 3)
      expect(asTable.debtAtYearEnd[2]).toBeCloseTo(256503.9972, 3)
      // 15-year term: cleared at year 15, and nothing is paid after it.
      expect(asTable.debtAtYearEnd[14]).toBeCloseTo(0, P)
      expect(asTable.annualPayment[14]).toBeCloseTo(28468.57056, 3)
      expect(asTable.annualPayment[15]).toBe(0)
    })

    it('runs a Reducing loan down by an equal slice each month (Mtg Calcs C5 / C10)', () => {
      const asReducing = mortgageSchedule(Object.assign({}, home1, { mortgageType: MORTGAGE_REDUCING }))
      expect(asReducing.debtAtYearEnd[0]).toBeCloseTo(280000, P) // 300,000 less 20,000
      expect(asReducing.debtAtYearEnd[1]).toBeCloseTo(260000, P)
      expect(asReducing.annualPayment[0]).toBeCloseTo(34541.66667, 4)
      expect(asReducing.annualPayment[1]).toBeCloseTo(33541.66667, 4) // interest falls
    })

    it('closes an Interest Only loan the year its term is served (Mtg Calcs C6)', () => {
      const io = mortgageSchedule(home1)
      expect(io.debtAtYearEnd[14]).toBeCloseTo(300000, P)
      expect(io.annualPayment[14]).toBeCloseTo(15000, P) // 300,000 × 5%
      expect(io.debtAtYearEnd[15]).toBe(0)
      expect(io.annualPayment[15]).toBe(0)
    })

    it('counts a full twelve instalments in the year that clears the loan, and none after', () => {
      // The workbook floors the DEBT at zero but only zeroes the YEAR'S PAYMENTS once
      // the balance is past -1, so the final year still costs the client twelve
      // payments. The two guards differ on purpose; this pins the difference.
      const asTable = mortgageSchedule(Object.assign({}, home1, { mortgageType: MORTGAGE_TABLE }))
      expect(asTable.annualPayment[14]).toBeGreaterThan(0)
      expect(asTable.debtAtYearEnd[14]).toBe(0)
    })

    it('returns an empty schedule for a property with no mortgage', () => {
      const none = mortgageSchedule({ debt: 0, rate: 0.05, termYears: 15, mortgageType: MORTGAGE_TABLE })
      expect(none.monthlyPayment).toBe(0)
      expect(none.annualPayment.every(v => v === 0)).toBe(true)
      expect(none.debtAtYearEnd.every(v => v === 0)).toBe(true)
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  describe('The year-one position — Use of Assets in Retirement', () => {
    const position = model.position

    it('prices each property\'s monthly mortgage payment (T29 … T39)', () => {
      const paid = position.properties.map(p => p.monthlyMortgagePayment)
      const want = [1250, 2524.533819, 3133.303571, 306.0416667, 1757.58463, 1462.315294]
      want.forEach((expected, i) => expect(paid[i]).toBeCloseTo(expected, 4))
    })

    it('totals the rental surplus across all six properties (V41)', () => {
      expect(position.monthlyRentalSurplus).toBeCloseTo(1216.221018, 4)
    })

    it('draws each investment account down to its end balance (N15 / N17 / N24)', () => {
      expect(position.cashMonthlyWithdrawal).toBeCloseTo(911.1577344, 4) //  N15 — display only
      expect(position.superMonthlyWithdrawal).toBeCloseTo(2647.210219, 4) // N17
      expect(position.otherMonthlyWithdrawal).toBeCloseTo(623.0634896, 4) // N24
    })

    it('takes tax off the government pension (N19)', () => {
      expect(position.pensionWeeklyNet).toBeCloseTo(612.32, P) // 712 gross less 14%
    })

    it('totals assets, debts and net worth (Z23 / Z24 / Z25)', () => {
      expect(position.totalPropertyValue).toBeCloseTo(3436000, P) //  F41
      expect(position.totalPropertyDebt).toBeCloseTo(1425456, P) //   H41
      expect(position.totalAssets).toBeCloseTo(3763500, P) //         Z23
      expect(position.totalDebts).toBeCloseTo(1425456, P) //          Z24
      expect(position.netWorth).toBeCloseTo(2338044, P) //            Z25
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  describe('The tax maths, driven with the WORKBOOK\'s own superseded bands', () => {
    // Correction 1 changes which bands are used, not how they are applied. This
    // exercises the arithmetic against the spreadsheet directly, so the correction
    // cannot hide a fault in it.
    const surplus = 1216.221018 // V41
    const workbook = averageTaxRate({
      client1Income: 1500 * 12 + surplus * 12 * 0.5, // AI15
      spouseIncome: surplus * 12 * 0.5, //              AI16
      bands: WORKBOOK_BANDS
    })

    it('splits the rental surplus between the two people (AI15 / AI16 / AJ16)', () => {
      expect(workbook.combinedIncome).toBeCloseTo(32594.65222, 3)
    })

    it('taxes each person over the band table (AS8 / AS12)', () => {
      expect(workbook.client1Tax).toBeCloseTo(3447.032069, 3)
      expect(workbook.spouseTax).toBeCloseTo(766.2192415, 3)
    })

    it('reaches the workbook\'s average tax rate exactly (BM7 = BI16 / BG16)', () => {
      expect(workbook.combinedTax).toBeCloseTo(4213.251311, 3) // BI16
      expect(workbook.rate).toBeCloseTo(WORKBOOK_TAX_RATE, 9) // BM7
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  describe('Series the corrections do not touch — still pinned to the workbook', () => {
    it('lifts the income required by each year\'s inflation (row 4, Z13:Z16)', () => {
      // 12%, 9%, 11%, then 3% for the rest of the run.
      expectSeries(projection.weeklyIncomeRequired, [
        1700, 1904, 2075.36, 2303.6496, 2372.759088, 2443.941861, 2517.260116,
        2592.77792, 2670.561258, 2750.678095, 2833.198438, 2918.194391, 3005.740223,
        3095.91243, 3188.789803, 3284.453497, 3382.987102, 3484.476715, 3589.011016,
        3696.681347
      ])
    })

    it('runs the superannuation drawdown for its term and then stops (row 24)', () => {
      expectSeries(projection.superIncome, [
        31766.52263, 31766.52263, 31766.52263, 31766.52263, 31766.52263, 31766.52263,
        31766.52263, 31766.52263, 31766.52263, 31766.52263, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
      ])
    })

    it('runs the other-investment drawdown for three years (row 28)', () => {
      expectSeries(projection.otherInvestmentIncome, [
        7476.761875, 7476.761875, 7476.761875, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0
      ])
    })

    it('runs the business income net of tax for six years (row 22, at the workbook rate)', () => {
      // Correction 1 moves this figure, so it is rebuilt at the workbook's own rate
      // and pinned there — which tests the formula with the one ruled input held.
      const atWorkbookRate = projection.businessIncome
        .map(v => (v ? 1500 * (1 - WORKBOOK_TAX_RATE) * 12 : 0))
      expectSeries(atWorkbookRate, [
        15673.28324, 15673.28324, 15673.28324, 15673.28324, 15673.28324, 15673.28324,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
      ])
    })

    it('keeps each of the first five properties exactly as the workbook has them', () => {
      // Correction 3 touches only the sixth. Home 2's own rows — value (61), debt (62),
      // rent (63) and mortgage (64) — for its four years before it is sold in year 4.
      const home2 = projectProperty(DEFAULT_INPUTS.position.properties[1])
      expect(home2.value.slice(0, 4)).toEqual(
        expect.arrayContaining([650000]) // G61
      )
      const wantValue = [650000, 676000, 703040, 731161.6]
      const wantDebt = [298059.045, 283353.6856, 267842.0086, 251479.8021]
      const wantRent = [26400, 27456, 28554.24, 29696.4096]
      wantValue.forEach((v, i) => expect(home2.value[i]).toBeCloseTo(v, 3))
      wantDebt.forEach((v, i) => expect(home2.debt[i]).toBeCloseTo(v, 3))
      wantRent.forEach((v, i) => expect(home2.rent[i]).toBeCloseTo(v, 3))
      home2.mortgage.slice(0, 4).forEach(v => expect(v).toBeCloseTo(30294.40583, 3)) // G64
      // Sold in year 4: gone from year 5, and the proceeds land in year 4 (J17).
      expect(home2.value[4]).toBe(0)
      expect(home2.saleProceeds[3]).toBeCloseTo(479681.7979, 2)
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  describe('Ruled corrections — Mike, 2026-09-13', () => {
    // 🔴 Each case gives BOTH figures: the workbook's own cached value and ours.
    // A deviation nobody can check is indistinguishable from a mistake.

    it('lists all three on every result, so a screen can explain the difference', () => {
      expect(model.workbookCorrections).toBe(WORKBOOK_CORRECTIONS)
      expect(WORKBOOK_CORRECTIONS.map(c => c.key)).toEqual([
        'currentTaxBands',
        'pensionTaxedInProjection',
        'sixthPropertyRunsFromYearOne'
      ])
      WORKBOOK_CORRECTIONS.forEach((c) => {
        expect(c.ruledBy).toBe('Mike')
        expect(c.ruledOn).toBe('2026-09-13')
        expect(c.cells).toBeTruthy() // or it cannot be checked against the workbook
        expect(c.summary).toBeTruthy()
      })
    })

    it('1. taxes on the current bands, not the workbook\'s superseded ones', () => {
      // Workbook 14,000/48,000/70,000 → average rate 12.926%.
      // Ours     15,600/53,500/78,100 → average rate 12.582%.
      expect(model.tax.averageRate).toBeCloseTo(0.1258258957, 9)
      expect(model.tax.averageRate).toBeLessThan(WORKBOOK_TAX_RATE)
      expect(model.tax.client1Tax).toBeCloseTo(3335.032069, 3) // workbook: 3447.032069
      expect(model.tax.spouseTax).toBeCloseTo(766.219242, 3) //   workbook:  766.219242
      expect(model.tax.combinedTax).toBeCloseTo(4101.251311, 3) // workbook: 4213.251311
      expect(model.country).toBe('NZ')
      expect(model.taxYearLabel).toBeTruthy()
      expect(model.taxBandsEffectiveFrom).toBeTruthy()
    })

    it('2. counts the pension after tax in the projection, as the summary sheet does', () => {
      // Workbook row 26 began at 37,024 (712 gross × 52). Ours begins at 31,840.64
      // (612.32 net × 52) — the figure the workbook's OWN summary sheet already used.
      expect(projection.pensionIncome[0]).toBeCloseTo(612.32 * 52, P)
      expect(projection.pensionIncome[0]).toBeCloseTo(31840.64, P)
      expect(37024 - projection.pensionIncome[0]).toBeCloseTo(99.68 * 52, P)
      // It still compounds at CPI, so the gap widens every year of the run.
      expect(projection.pensionIncome[19]).toBeCloseTo(55832.754974, 3) // workbook: 64921.80811
      // And it now agrees with the year-one summary instead of contradicting it.
      expect(projection.pensionIncome[0] / 52).toBeCloseTo(model.position.pensionWeeklyNet, P)
    })

    it('3. realigns the sixth property — and the workbook\'s own numbers prove it is a pure shift', () => {
      // The strongest evidence available that this correction changed nothing else.
      // The workbook held the sixth property four columns right, so its cached rows
      // ARE its own years 1..13 — read back four columns, they must equal ours.
      const home6 = projectProperty(DEFAULT_INPUTS.position.properties[5])

      // 'Asset & Cash Transactions' row 97 (value), columns K..W = its years 1..13.
      const workbookValue = [
        635000, 660400, 686816, 714288.64, 742860.1856, 772574.593, 803477.5767,
        835616.6798, 869041.347, 903803.0009, 939955.1209, 977553.3258, 1016655.459
      ]
      workbookValue.forEach((v, i) => expect(home6.value[i]).toBeCloseTo(v, 3))

      // Row 98 (debt) and row 99 (rent), the same thirteen years.
      const workbookDebt = [
        207391.5713, 200988.249, 194227.0952, 187088.1132, 179550.1893, 171591.0298,
        163187.095, 154313.53, 144944.0908, 135051.0668, 124605.199, 113575.5933,
        101929.6291
      ]
      workbookDebt.forEach((v, i) => expect(home6.debt[i]).toBeCloseTo(v, 3))

      const workbookRent = [
        22200, 23088, 24011.52, 24971.9808, 25970.86003, 27009.69443, 28090.08221,
        29213.6855, 30382.23292, 31597.52224, 32861.42313, 34175.88005, 35542.91525
      ]
      workbookRent.forEach((v, i) => expect(home6.rent[i]).toBeCloseTo(v, 3))

      // Row 100 (mortgage) — a Table loan, so the instalment is flat.
      home6.mortgage.slice(0, 13).forEach(v => expect(v).toBeCloseTo(17547.78353, 3))
    })

    it('3. and the sale of the sixth property now actually pays the client', () => {
      // The workbook's "Value Realised" row carried the same shift, so a sale in
      // year 17 read year 21 — past the end of the sheet — and paid nothing.
      const home6 = projectProperty(DEFAULT_INPUTS.position.properties[5])
      expect(DEFAULT_INPUTS.position.properties[5].sellInYear).toBe(17)
      expect(home6.saleProceeds[16]).toBeCloseTo(1140879.295803, 2) // workbook: 0
      expect(projection.saleProceeds[16]).toBeCloseTo(1140879.295803, 2)
      // All six properties are now in the projection from year 1, so it agrees with
      // the year-one summary. The workbook's projection held five (2,801,000).
      expect(projection.propertyValue[0]).toBeCloseTo(3436000, P)
      expect(projection.propertyValue[0]).toBeCloseTo(model.position.totalPropertyValue, P)
    })

    it('3. adds the sixth property\'s mortgage to the first four years and nothing else', () => {
      // Years 5–20 of the mortgage row are IDENTICAL to the workbook's, because its
      // Table instalment is flat and it was present from year 5 either way. Years
      // 1–4 gain exactly that instalment. Anything else would be a second change.
      const workbookRow33 = [
        107093.0776, 105861.4705, 104629.8634, 103398.2562, 89420.02677, 88188.41963,
        86956.81249, 85725.20534, 84493.5982, 83261.99106, 82030.38392, 80798.77677,
        79567.16963, 78335.56249, 57311.29909, 21220.28353, 17547.78353, 0, 0, 0
      ]
      const home6Instalment = 17547.78353 // row 100
      workbookRow33.forEach((workbookValue, y) => {
        const expected = y < 4 ? workbookValue + home6Instalment : workbookValue
        expect(projection.mortgagePayments[y]).toBeCloseTo(expected, 3)
      })
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  describe('The shipped contract, after all three corrections', () => {
    it('projects the twenty years the adviser actually reads', () => {
      expectSeries(projection.weeklyIncomeGenerated, [
        1622.841096, 1773.830991, 1930.612984, 1949.68117, 2182.283355, 2337.398292,
        2196.074633, 2363.815048, 2538.341836, 2719.992695, 2298.228216, 2495.211498,
        2700.441145, 2914.330983, 3517.944509, 3679.079541, 3935.21574, 3740.260017,
        3915.243699, 4099.065387
      ])
      expectSeries(projection.annualSurplus, [
        -4012.263014, -6768.788475, -7526.844841, -18406.358335, -9904.738128,
        -5540.265594, -16701.645121, -11906.069341, -6875.409903, -1595.64083,
        -27818.451552, -21995.110447, -15875.552051, -9442.235215, 17116.044753,
        20520.554296, 28715.889191, 13300.7317, 16964.099513, 20923.970115
      ], 2)
      expectSeries(projection.cashClosing, [
        30987.736986, 24218.948511, 16692.10367, 477967.543256, 468062.805128,
        462522.539534, 445820.894413, 433914.825072, 427039.415168, 425443.774338,
        397625.322786, 375630.212339, 359754.660289, 350312.425073, 1349578.47203,
        1370099.026326, 2539694.21132, 2552994.94302, 2569959.042533, 2590883.012648
      ], 2)
    })

    it('derives the rent net of tax from its own rate, not a second copy of it', () => {
      projection.rentAfterTax.forEach((net, y) => {
        expect(net).toBeCloseTo(projection.grossRent[y] * (1 - model.tax.averageRate), SERIES_P)
      })
    })

    it('reads the verdict off the projection: fourteen years short, but never broke', () => {
      // The client falls short of what they need in fourteen of the twenty years; the
      // cash account absorbs it and never goes negative. Both are readings an adviser
      // takes off the chart, so the model names them rather than leaving them to the eye.
      expect(model.verdict.yearsInDeficit).toBe(14)
      expect(model.verdict.cashEverExhausted).toBe(false)
      expect(model.verdict.firstYearCashExhausted).toBeNull()
      expect(model.verdict.closingCash).toBeCloseTo(2590883.012648, 2)
      expect(projection.annualSurplus.filter(s => s < 0)).toHaveLength(14)
    })

    it('the corrections leave the client better off overall, and worse off each year', () => {
      // Worth stating, because the two pull in opposite directions and an adviser
      // will be asked why. Taxing the pension costs income in every single year
      // (thirteen deficit years became fourteen); recovering the sixth property adds
      // a little over a million at the end. Both are the truth, not a net figure.
      expect(model.verdict.yearsInDeficit).toBeGreaterThan(13) // was 13 before
      expect(model.verdict.closingCash).toBeGreaterThan(1522255) // was 1,522,255
    })

    it('flags a plan that does run out of cash', () => {
      // The verdict has to be able to say the bad thing, or it is decoration.
      const broke = computeRetirementReview({
        position: Object.assign({}, DEFAULT_INPUTS.position, { currentWeeklyIncomeRequired: 9000 })
      })
      expect(broke.verdict.cashEverExhausted).toBe(true)
      expect(broke.verdict.firstYearCashExhausted).toBeGreaterThan(0)
      expect(broke.verdict.closingCash).toBeLessThan(0)
    })
  })

  // ───────────────────────────────────────────────────────────────────────────
  describe('Robustness — the model never returns NaN', () => {
    it('falls back to the workbook sample when called with nothing', () => {
      expect(computeRetirementReview().verdict.closingCash)
        .toBeCloseTo(model.verdict.closingCash, P)
      expect(computeRetirementReview({}).verdict.closingCash)
        .toBeCloseTo(model.verdict.closingCash, P)
    })

    it('survives a client with no properties at all', () => {
      const noProperty = computeRetirementReview({
        position: Object.assign({}, DEFAULT_INPUTS.position, { properties: [] })
      })
      expect(noProperty.position.totalPropertyValue).toBe(0)
      expect(noProperty.projection.grossRent.every(v => v === 0)).toBe(true)
      expect(noProperty.projection.mortgagePayments.every(v => v === 0)).toBe(true)
      // With no rental surplus the only taxable income is the business.
      expect(noProperty.tax.combinedIncome).toBeCloseTo(18000, P)
      expect(Number.isFinite(noProperty.verdict.closingCash)).toBe(true)
    })

    it('ignores properties beyond the workbook\'s six', () => {
      const seven = DEFAULT_INPUTS.position.properties
        .concat([Object.assign({}, DEFAULT_INPUTS.position.properties[0], { name: 'Home 7' })])
      const capped = computeRetirementReview({
        position: Object.assign({}, DEFAULT_INPUTS.position, { properties: seven })
      })
      expect(capped.position.properties).toHaveLength(6)
      expect(capped.position.totalPropertyValue).toBeCloseTo(3436000, P)
    })

    it('returns zeroes rather than NaN when every figure is missing', () => {
      const empty = computeRetirementReview({
        position: {
          currentWeeklyIncomeRequired: null,
          inflation: [],
          business: { monthlyIncome: null, yearsExpected: null },
          cash: { balance: null, rate: null, termYears: null, endBalance: null },
          superannuation: { balance: null, rate: null, termYears: null, endBalance: null },
          otherInvestments: { balance: null, rate: null, termYears: null, endBalance: null },
          pension: { qualifies: false, weekly: null, cpiAdjustment: null, taxRate: null },
          rentalIncomeTaxSplit: 0,
          properties: []
        }
      })
      const everyNumber = [].concat(
        empty.projection.weeklyIncomeRequired,
        empty.projection.weeklyIncomeGenerated,
        empty.projection.annualSurplus,
        empty.projection.cashClosing,
        [empty.tax.averageRate, empty.verdict.closingCash]
      )
      everyNumber.forEach(v => expect(Number.isFinite(v)).toBe(true))
    })

    it('handles a zero interest rate without dividing by it', () => {
      // Both Excel functions special-case a zero rate; so must these.
      expect(excelPmt(0, 12, -1200, 0, 0)).toBeCloseTo(100, P)
      expect(excelPv(0, 12, 100, 0, 0)).toBeCloseTo(-1200, P)
      const free = mortgageSchedule({
        debt: 120000, rate: 0, termYears: 10, mortgageType: MORTGAGE_TABLE, endTermDebt: 0
      })
      expect(free.monthlyPayment).toBeCloseTo(1000, P)
      expect(free.debtAtYearEnd[9]).toBeCloseTo(0, P)
    })

    it('treats an unknown mortgage type as Table rather than charging nothing', () => {
      // Silently charging no mortgage would flatter the client. The default has to be
      // the one that costs money.
      const unknown = mortgageSchedule({
        debt: 312000, rate: 0.0535, termYears: 15, mortgageType: 'Something else'
      })
      expect(unknown.monthlyPayment).toBeCloseTo(2524.533819, 4)
    })

    it('refuses a country with no verified tax table rather than taxing at zero', () => {
      // `data/tax-bands.json` holds a country only when a real table exists. Falling
      // back to zero tax would overstate every client's retirement income.
      expect(() => computeRetirementReview({ country: 'ZZ' })).toThrow(/tax-band table/)
    })

    it('never sells a property it does not hold', () => {
      const past = projectProperty(Object.assign(
        {}, DEFAULT_INPUTS.position.properties[0], { sellInYear: 25 }
      ))
      expect(past.saleProceeds.every(v => v === 0)).toBe(true)
      expect(past.value[19]).toBeGreaterThan(0) // still held at the end of the run
    })
  })
})
