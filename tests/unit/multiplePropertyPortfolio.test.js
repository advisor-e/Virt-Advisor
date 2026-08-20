'use strict'

const {
  DEFAULT_INPUTS,
  DEFAULT_HOUSEHOLD,
  defaultProperties,
  apportionLoans,
  computeMultiplePropertyPortfolio,
  MAX_PROPERTIES,
  YEARS
} = require('../../server/report/multiplePropertyModel')

/**
 * GOLDEN TEST — Multiple Property Assessment, Phase 2 (the portfolio).
 *
 * Source: `design/report-source-models/Multiple Property Assessment.xlsx`, sheets
 * `INPUTS` (rows 3–17, the loan apportionment table) and `Consolidated Report`. Design
 * artefact: `design/MULTIPLE-PROPERTY-ASSESSMENT.md`. Item 4.19.
 *
 * 🔴 READ THIS BEFORE CHANGING A NUMBER — the expected values have THREE provenances
 * and each one is labelled where it is used:
 *
 *   - **The workbook's OWN cached values**, with the cell reference beside each. Rows 7,
 *     9 and 11 of the apportionment table, R3, R5 and R9, and — across all ten years —
 *     the consolidated Total Revenue (row 11) and Total Assumed Property Values (row 22).
 *     Those two consolidated rows depend on rents, growth rates and purchase prices and
 *     on NOTHING the five corrections touch, so they must match the spreadsheet exactly.
 *     They are the strongest evidence in this file that the port is faithful.
 *
 *   - **OURS, hand-worked, where a correction bites** — row 15, R17, and every deposit.
 *     Each carries its arithmetic in the comment beside it, and the workbook's own wrong
 *     value is written out next to the right one so the difference is on the page rather
 *     than in a commit message.
 *
 *   - **Structural**, where the consolidation is asserted to be exactly the sum of the
 *     per-property results. That is not a weaker check: `Consolidated Report` C11 is
 *     literally `=MODEL!C10+MODEL!C87+MODEL!C164+MODEL!C241+MODEL!C318`, so summation
 *     IS the specification, and a hardcoded total would only restate arithmetic the
 *     per-property golden test already proves.
 *
 * ✅ WHY THE CONSOLIDATED DEBT AND EQUITY ROWS ARE NOT PINNED TO THE WORKBOOK. They
 * cannot be: `Consolidated Report` row 24 reaches MINUS 68,772 in year 10 — a portfolio
 * with negative debt — because the workbook zeroes each interest-only balance with
 * nothing repaying it (correction 1, ruled by Mike on 2026-08-17 before Phase 1 shipped).
 * Pinning those rows would pin the fault. They are checked against the per-property
 * results instead, which are golden-tested in `multiplePropertyModel.test.js`.
 *
 * PRECISION CONVENTION: as Phase 1's file — each `toBeCloseTo` precision sits one digit
 * inside the cached value's own precision.
 */

// ---------------------------------------------------------------------------
// The workbook's sample, as the table itself holds it (INPUTS rows 3–17).
// ---------------------------------------------------------------------------

/** Purchase prices, `INPUTS` L9..P9 — each `=E31`, `=E97`, `=E163`, `=E229`, `=E295`. */
const PRICES = [649000, 515000, 649000, 864000, 785000]

/** The household as the sample has it. */
const HOUSEHOLD = {
  residenceValue: 1400000, //           E11 / K9
  homeMortgage: 225000, //              E13 / K11
  totalSavings: 315000, //              E15 / R3
  residenceTaxApportionmentPct: 0.6 //  K13
}

/** The table alone, driven by the five sample prices. */
function sampleTable (overrides) {
  return apportionLoans(Object.assign({}, HOUSEHOLD, overrides, {
    properties: PRICES.map(function (purchasePrice) { return { purchasePrice } })
  }))
}

describe('apportionLoans — the table the workbook computes (INPUTS rows 3–17)', () => {
  const t = sampleTable()

  test('the savings pool and the residence are read straight off the sheet', () => {
    expect(t.totalSavings).toBe(315000) //                    R3 = E15
    expect(t.residence.value).toBe(1400000) //                K9 = E11
    expect(t.residence.requiredFunding).toBe(225000) //       K11 = E13
    expect(t.residence.taxApportionmentPct).toBe(0.6) //      K13
    expect(t.residence.loanApportioned).toBe(135000) //       K15 = K11 × K13 = 225,000 × 0.6
  })

  test('row 7 — Balance Available reproduces the workbook cell for cell', () => {
    // The pool is consumed in order, so only the first property ever sees any of it on
    // this sample: 315,000 − 225,000 = 90,000, and the residence plus property 1 have
    // already claimed 874,000 by the time property 2 is reached.
    expect(t.properties.map(p => p.balanceAvailable)).toEqual([
      90000, //  L7 = R3 − K11
      0, //      M7
      0, //      N7
      0, //      O7
      0 //       P7
    ])
  })

  test('row 9 — Value is each property in turn', () => {
    expect(t.properties.map(p => p.value)).toEqual(PRICES) // L9..P9
  })

  test('row 11 — Req\'d Funding reproduces the workbook cell for cell', () => {
    expect(t.properties.map(p => p.requiredFunding)).toEqual([
      559000, //  L11 = L9 − L7 = 649,000 − 90,000
      515000, //  M11 = M9 − M7 = 515,000 − 0
      649000, //  N11
      864000, //  O11
      785000 //   P11
    ])
  })

  test('R9 and R11 — the two totals the sheet carries', () => {
    expect(t.totals.value).toBe(4862000) //            R9  = sum(K9:P9)
    expect(t.totals.requiredFunding).toBe(3597000) //  R11 = sum(K11:P11)
  })

  test('R5 — the LVR is total funding over total value', () => {
    // R5 = R11/R9 = 3,597,000 / 4,862,000
    expect(t.lvr).toBeCloseTo(0.7398190045, 9)
  })
})

describe('CORRECTION 4 — row 15 apportions the FUNDING, never the purchase price', () => {
  const t = sampleTable()

  test('property 1 is apportioned 559,000, not the workbook\'s 649,000', () => {
    // L15 as written is `=L9*L13` — VALUE × 100% = 649,000 — while the residence's own
    // cell K15 is `=K11*K13`, REQUIRED FUNDING × 60%. Read consistently, property 1's
    // apportioned loan is its required funding: 559,000 × 100%.
    expect(t.properties[0].loanApportioned).toBe(559000)
    expect(t.properties[0].loanApportioned).not.toBe(649000) // the workbook's L15
  })

  test('properties 2 to 5 are unchanged — their cells agree under both readings', () => {
    // M15..P15 are hardcoded constants in the sheet, and on this sample row 9 and row 11
    // are equal for all four (no savings remain), so the correction cannot move them.
    expect(t.properties.slice(1).map(p => p.loanApportioned)).toEqual([
      515000, //  M15
      649000, //  N15
      864000, //  O15
      785000 //   P15
    ])
  })

  test('R17 lands on the residence\'s non-deductible share — the proof', () => {
    // "Balance of Loans to Apportion" = R11 − R15. Read row 11 × row 13, what is left
    // unapportioned is exactly the part of the home loan that is NOT deductible:
    //   225,000 × (1 − 0.6) = 90,000
    expect(t.totals.balanceToApportion).toBeCloseTo(90000, 6)
    expect(t.totals.balanceToApportion).toBeCloseTo(HOUSEHOLD.homeMortgage * 0.4, 6)
    // The sheet's own R17 shows 0 here — but only because L7 happens to equal
    // K11 × 40% on these figures. The next test moves them and the 0 evaporates.
  })

  test('...and it still does when the home mortgage moves, where the sheet\'s 0 does not', () => {
    const t2 = sampleTable({ homeMortgage: 300000 })
    // Balance available to property 1 is now 315,000 − 300,000 = 15,000, so its funding
    // is 649,000 − 15,000 = 634,000.
    expect(t2.properties[0].requiredFunding).toBe(634000)
    // R11 = 300,000 + 634,000 + 515,000 + 649,000 + 864,000 + 785,000
    expect(t2.totals.requiredFunding).toBe(3747000)
    // R15 = 180,000 + 3,447,000
    expect(t2.totals.loanApportioned).toBe(3627000)
    // R17 = 120,000 = 300,000 × 40%, the same rule as before.
    expect(t2.totals.balanceToApportion).toBeCloseTo(300000 * 0.4, 6)
    // Read as the sheet has it, R17 here would be 3,747,000 − 3,642,000 = 105,000,
    // which is neither zero nor any share of anything.
  })
})

describe('CORRECTION 5 — the deposit is spent once', () => {
  const t = sampleTable()

  test('each property gets the savings it actually absorbed', () => {
    expect(t.properties.map(p => p.depositApplied)).toEqual([
      90000, //  649,000 − 559,000 — the whole of what was left after the residence
      0, //      nothing remained
      0,
      0,
      0
    ])
    // The workbook hands property 1 the WHOLE pool (`OUTPUTS` C18 = `INPUTS!E15` =
    // 315,000) and property 2 a second helping of the same money (C100 = `INPUTS!L7` =
    // 90,000), for 405,000 of "investor cash" from a 315,000 deposit.
  })

  test('the deposits can never sum past the pool', () => {
    expect(t.totals.depositApplied).toBe(90000)
    expect(t.totals.depositApplied).toBeLessThanOrEqual(HOUSEHOLD.totalSavings)
  })

  test('and still cannot when the pool is large enough to buy outright', () => {
    // No mortgage, and a million to spend on a 649,000 and a 515,000 property: the first
    // is paid for in cash, the second takes what is left and borrows the difference.
    const t2 = apportionLoans({
      residenceValue: 0,
      homeMortgage: 0,
      totalSavings: 1000000,
      residenceTaxApportionmentPct: 1,
      properties: [{ purchasePrice: 649000 }, { purchasePrice: 515000 }]
    })
    expect(t2.properties[0].requiredFunding).toBe(0)
    expect(t2.properties[0].depositApplied).toBe(649000)
    expect(t2.properties[1].requiredFunding).toBe(164000) //  515,000 − 351,000
    expect(t2.properties[1].depositApplied).toBe(351000) //   1,000,000 − 649,000
    // Exactly the pool, to the dollar — never more.
    expect(t2.totals.depositApplied).toBe(1000000)
  })

  test('a property always adds up: what it borrows plus what it puts down is its price', () => {
    t.properties.forEach(function (p) {
      expect(p.requiredFunding + p.depositApplied).toBeCloseTo(p.value, 6)
    })
  })
})

describe('THE GUARD — a home mortgage larger than the savings', () => {
  test('the first property borrows its price, never more than its price', () => {
    const t = sampleTable({ homeMortgage: 400000 })
    // `L7 = R3 − K11` is the only cell of row 7 without the floor its neighbours carry,
    // so the sheet would show −85,000 here and then charge property 1
    // 649,000 − (−85,000) = 734,000 — a loan 85,000 bigger than the house.
    expect(t.properties[0].balanceAvailable).toBe(0)
    expect(t.properties[0].requiredFunding).toBe(649000)
    expect(t.properties[0].requiredFunding).not.toBe(734000)
    expect(t.properties[0].depositApplied).toBe(0)
  })
})

describe('the five sample properties', () => {
  const props = defaultProperties()

  test('there are five of them, and the table holds five', () => {
    expect(props).toHaveLength(5)
    expect(MAX_PROPERTIES).toBe(5)
  })

  test('property 1 is the Phase 1 sample exactly', () => {
    expect(props[0].address).toBe(DEFAULT_INPUTS.address)
    expect(props[0].purchasePrice).toBe(DEFAULT_INPUTS.purchasePrice)
    expect(props[0].rentPerWeek).toBe(DEFAULT_INPUTS.rentPerWeek)
  })

  test('the prices are the five the apportionment table reads', () => {
    expect(props.map(p => p.purchasePrice)).toEqual(PRICES)
  })

  test('every purchase price split reconciles — land + building + chattels', () => {
    // `INPUTS` G32/G98/… — the sheet checks this itself and expects zero.
    props.forEach(function (p, i) {
      expect(p.land + p.building + p.chattels).toBeCloseTo(PRICES[i], 6)
    })
  })

  test('property 3 is property 1 with a different address and P&I term', () => {
    // INPUTS rows 155–216 differ from rows 23–84 in exactly those two places.
    expect(props[2].purchasePrice).toBe(props[0].purchasePrice)
    expect(props[2].rentPerWeek).toBe(props[0].rentPerWeek)
    expect(props[2].piTermYears).toBe(6) //           E204, against property 1's 7
    expect(props[2].address).toBe('35 Average Deal Avenue, Goldentown') // C155
  })

  test('property 5 is the only one not borrowing at 4%', () => {
    expect(props[4].interestOnlyRate).toBe(0.03) //   E338
    expect(props.slice(0, 4).every(p => p.interestOnlyRate === 0.04)).toBe(true)
  })

  test('none of them carries a funding figure or a deposit — the table decides both', () => {
    props.forEach(function (p) {
      expect(p.fundingRequired).toBeUndefined()
      expect(p.cashDeposit).toBeUndefined()
    })
  })

  test('the defaults cannot be mutated through the array handed out', () => {
    defaultProperties()[0].purchasePrice = 1
    expect(defaultProperties()[0].purchasePrice).toBe(DEFAULT_INPUTS.purchasePrice)
  })
})

describe('computeMultiplePropertyPortfolio — the consolidation', () => {
  const r = computeMultiplePropertyPortfolio({})

  test('it runs the workbook\'s own five properties when asked for nothing', () => {
    expect(r.properties).toHaveLength(5)
    expect(r.consolidated.years).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    // Every fallback is named, never silently substituted — the R8 ruling.
    expect(r.defaultedInputs).toContain('properties')
    Object.keys(DEFAULT_HOUSEHOLD).forEach(function (key) {
      expect(r.defaultedInputs).toContain('household.' + key)
    })
  })

  test('Total Revenue matches the workbook for all ten years', () => {
    // `Consolidated Report` row 11 = MODEL!C10+C87+C164+C241+C318. Rents, vacancy and
    // rental growth only — untouched by any of the five corrections, so this is an
    // exact match against the spreadsheet's own cache.
    const expected = [
      149750, //        C11
      154991.25, //     D11
      160415.9438, //   E11
      166030.5018, //   F11
      171841.5693, //   G11
      177856.0243, //   H11
      184080.9851, //   I11
      190523.8196, //   J11
      197192.1533, //   K11
      204093.8787 //    L11
    ]
    expected.forEach(function (v, y) {
      expect(r.consolidated.totalRevenue[y]).toBeCloseTo(v, 3)
    })
  })

  test('Total Assumed Property Values matches the workbook for all ten years', () => {
    // Row 22 = OUTPUTS!C11+C93+C172+C251+C330 — purchase prices grown at 3%, and
    // likewise independent of every correction.
    const expected = [
      3462000, //       C22
      3565860, //       D22
      3672835.8, //     E22
      3783020.874, //   F22
      3896511.5, //     G22
      4013406.845, //   H22
      4133809.051, //   I22
      4257823.322, //   J22
      4385558.022, //   K22
      4517124.762 //    L22
    ]
    expected.forEach(function (v, y) {
      expect(r.consolidated.totalPropertyValue[y]).toBeCloseTo(v, 2)
    })
  })

  test('year 1 revenue is the five rents, net of two vacant weeks each', () => {
    // A hand check on the row above: 610, 485, 610, 645 and 645 a week, each × 50 weeks.
    expect(r.consolidated.totalRevenue[0]).toBeCloseTo((610 + 485 + 610 + 645 + 645) * 50, 6)
  })

  test('Net Operating Profit is revenue less expenses, year by year', () => {
    // Row 15 = C11 − C13.
    for (let y = 0; y < YEARS; y++) {
      expect(r.consolidated.netOperatingProfit[y]).toBeCloseTo(
        r.consolidated.totalRevenue[y] - r.consolidated.totalExpenses[y], 6
      )
    }
  })

  test('every consolidated line is the sum of the five properties', () => {
    // The sheet's own definition — C13 = MODEL!C25+C102+C179+C256+C333, and so on.
    const sum = function (pick) {
      return r.properties.reduce(function (a, p) { return a + pick(p) }, 0)
    }
    for (let y = 0; y < YEARS; y++) {
      expect(r.consolidated.totalExpenses[y]) //                                row 13
        .toBeCloseTo(sum(p => p.profitAndLoss.totalExpenses[y]), 6)
      expect(r.consolidated.totalDebt[y]) //                                    row 24
        .toBeCloseTo(sum(p => p.investmentSummary.totalDebt[y]), 6)
      expect(r.consolidated.netEquity[y]) //                                    row 26
        .toBeCloseTo(sum(p => p.investmentSummary.netEquity[y]), 6)
      expect(r.consolidated.annualCashTopUp[y]) //                              row 30
        .toBeCloseTo(sum(p => p.investmentSummary.annualCashTopUp[y]), 6)
      expect(r.consolidated.cumulativeInvestorFunds[y]) //                      row 32
        .toBeCloseTo(sum(p => p.investmentSummary.cumulativeInvestorFunds[y]), 6)
      expect(r.consolidated.weeklyCashPosition[y]) //                           row 39
        .toBeCloseTo(sum(p => p.profitAndLoss.weeklyCashPosition[y]), 6)
    }
  })

  test('net equity is the portfolio\'s value less its debt', () => {
    for (let y = 0; y < YEARS; y++) {
      expect(r.consolidated.netEquity[y]).toBeCloseTo(
        r.consolidated.totalPropertyValue[y] - r.consolidated.totalDebt[y], 6
      )
    }
  })

  test('the return on investor funds is computed from the totals, not averaged', () => {
    // Row 34 = (C26 − C32)/C32. Averaging the five properties' own percentages would be
    // a mean of ratios — a different number, and a meaningless one.
    for (let y = 0; y < YEARS; y++) {
      expect(r.consolidated.returnOnInvestorFunds[y]).toBeCloseTo(
        (r.consolidated.netEquity[y] - r.consolidated.cumulativeInvestorFunds[y]) /
          r.consolidated.cumulativeInvestorFunds[y], 9
      )
    }
    const meanOfRatios = r.properties.reduce(function (a, p) {
      return a + p.investmentSummary.returnOnInvestorFunds[0]
    }, 0) / r.properties.length
    expect(r.consolidated.returnOnInvestorFunds[0]).not.toBeCloseTo(meanOfRatios, 4)
  })

  test('the consolidated deposit is the household\'s, once — not the workbook\'s 405,000', () => {
    // Row 29 = OUTPUTS!C18+C100+C179+C258+C337, which the sheet caches at 405,000.
    expect(r.consolidated.cashDeposit).toBe(90000)
    expect(r.consolidated.cashDeposit).toBeLessThanOrEqual(r.household.totalSavings)
  })

  test('the four headline figures are read off the portfolio', () => {
    expect(r.headline.weeklyCashPosition).toBeCloseTo(r.consolidated.weeklyCashPosition[0], 6)
    expect(r.headline.totalDebt).toBeCloseTo(r.consolidated.totalDebt[0], 6)
    expect(r.headline.netEquityFinalYear).toBeCloseTo(r.consolidated.netEquity[9], 6)
    expect(r.headline.returnOnInvestorFundsFinalYear)
      .toBeCloseTo(r.consolidated.returnOnInvestorFunds[9], 9)
  })
})

describe('the table reaches the properties', () => {
  const r = computeMultiplePropertyPortfolio({})

  test('property 1 is funded at 559,000, and its P&I loan shrinks to match', () => {
    // `INPUTS` E65 = `L15`, and E69 = E65 − E68. With the corrected apportionment the
    // interest-only slice is unchanged at 350,000 and the P&I loan takes the difference:
    //   559,000 − 350,000 = 209,000, where the workbook had 299,000.
    expect(r.apportionment.properties[0].loanApportioned).toBe(559000)
    expect(r.properties[0].loans.interestOnly.balance[0]).toBeCloseTo(350000, 6)
    expect(r.properties[0].loans.principalAndInterest.openingBalance[0]).toBeCloseTo(209000, 6)
  })

  test('property 1\'s deposit is what the table gave it, not the whole pool', () => {
    expect(r.properties[0].investmentSummary.cashDeposit).toBe(90000)
  })

  test('properties 2 to 5 are funded exactly as the workbook funds them', () => {
    expect(r.properties.slice(1).map(function (p) {
      return p.loans.interestOnly.balance[0] +
        p.loans.principalAndInterest.openingBalance[0]
    }).map(Math.round)).toEqual([515000, 649000, 864000, 785000]) // M15..P15
  })

  test('a property the pool pays for outright is reported, not silently mispriced', () => {
    // Savings big enough that nothing needs borrowing, but a 350,000 interest-only slice
    // still typed in: the maths is left exactly as asked for and the reader is told.
    const odd = computeMultiplePropertyPortfolio({
      household: { residenceValue: 0, homeMortgage: 0, totalSavings: 900000, residenceTaxApportionmentPct: 1 },
      properties: [defaultProperties()[0]]
    })
    expect(odd.apportionment.properties[0].requiredFunding).toBe(0)
    expect(odd.warnings).toHaveLength(1)
    expect(odd.warnings[0].code).toBe('INTEREST_ONLY_EXCEEDS_FUNDING')
    expect(odd.warnings[0].property).toBe(1)
  })

  test('the sample portfolio raises no warnings', () => {
    expect(r.warnings).toEqual([])
  })
})

describe('a portfolio smaller than five', () => {
  test('one property consolidates to itself', () => {
    const r = computeMultiplePropertyPortfolio({
      household: HOUSEHOLD,
      properties: [defaultProperties()[0]]
    })
    expect(r.properties).toHaveLength(1)
    for (let y = 0; y < YEARS; y++) {
      expect(r.consolidated.totalRevenue[y])
        .toBeCloseTo(r.properties[0].profitAndLoss.rental[y], 6)
      expect(r.consolidated.netEquity[y])
        .toBeCloseTo(r.properties[0].investmentSummary.netEquity[y], 6)
    }
  })

  test('two properties still spend the pool in order', () => {
    const r = computeMultiplePropertyPortfolio({
      household: HOUSEHOLD,
      properties: defaultProperties().slice(0, 2)
    })
    expect(r.apportionment.properties.map(p => p.depositApplied)).toEqual([90000, 0])
    expect(r.consolidated.totalRevenue[0]).toBeCloseTo((610 + 485) * 50, 6)
  })
})
