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
 *   - **The workbook's OWN cached values**, with the cell reference beside each. The
 *     first describe block passes the workbook's own deposit allocation and then holds
 *     the port to the sheet cell for cell — rows 7, 9 and 11, R3, R5, R9 and R11. That
 *     block is the anchor, and it is why the deposit being CHOSEN did not cost us the
 *     spreadsheet as a reference: its allocation is simply one of the choices.
 *     The consolidated Total Revenue (row 11) and Total Assumed Property Values (row 22)
 *     are pinned across all ten years for the same reason — they depend on rents,
 *     growth and purchase prices and on nothing any correction touches.
 *
 *   - **OURS, hand-worked, where a correction or a ruling bites** — row 15, R17, every
 *     deposit, and the whole of the default allocation. Each carries its arithmetic in
 *     the comment beside it, and the workbook's own value is written out next to the
 *     new one so the difference is on the page rather than in a commit message.
 *
 *   - **Structural**, where the consolidation is asserted to be exactly the sum of the
 *     per-property results, and where the three identities are asserted to hold under
 *     every input a family can give. `Consolidated Report` C11 is literally
 *     `=MODEL!C10+MODEL!C87+MODEL!C164+MODEL!C241+MODEL!C318`, so summation IS the
 *     specification.
 *
 * 🔴 THE THREE IDENTITIES — Mike's condition of 2026-08-20, *"the math has to add up"*.
 * They are asserted here against ordinary input, deliberate hold-backs, and abuse:
 *
 *     requiredFunding + depositApplied === purchasePrice        (every property)
 *     Σ depositApplied + depositHeldBack === totalSavings       (the portfolio)
 *     interestOnly + principalAndInterest === requiredFunding   (every property)
 *
 * ✅ WHY THE CONSOLIDATED DEBT AND EQUITY ROWS ARE NOT PINNED TO THE WORKBOOK. They
 * cannot be: `Consolidated Report` row 24 reaches MINUS 68,772 in year 10 — a portfolio
 * with negative debt — because the workbook zeroes each interest-only balance with
 * nothing repaying it (correction 1, ruled by Mike on 2026-08-17). Pinning those rows
 * would pin the fault. They are checked against the per-property results instead, which
 * are golden-tested in `multiplePropertyModel.test.js`.
 *
 * PRECISION CONVENTION: as Phase 1's file — each `toBeCloseTo` precision sits one digit
 * inside the cached value's own precision.
 */

/** Purchase prices, `INPUTS` L9..P9 — each `=E31`, `=E97`, `=E163`, `=E229`, `=E295`. */
const PRICES = [649000, 515000, 649000, 864000, 785000]

/** The household as the sample has it. `maxLvr` is ours; the workbook has no ceiling. */
const HOUSEHOLD = {
  residenceValue: 1400000, //           E11 / K9
  homeMortgage: 225000, //              E13 / K11
  totalSavings: 315000, //              E15 / R3
  residenceTaxApportionmentPct: 0.6 //  K13
}

/**
 * The deposits the workbook itself hands out, once its double count is removed: the
 * balance left after the residence goes to property 1 and nothing reaches the rest.
 * `INPUTS` L7 = `R3 − K11` = 90,000.
 */
const WORKBOOK_DEPOSITS = [90000, 0, 0, 0, 0]

/** The table alone, driven by the five sample prices. */
function table (overrides, deposits) {
  return apportionLoans(Object.assign({}, HOUSEHOLD, overrides, {
    properties: PRICES.map(function (purchasePrice, i) {
      return deposits
        ? { purchasePrice, depositApplied: deposits[i] }
        : { purchasePrice }
    })
  }))
}

describe('apportionLoans — the workbook\'s own allocation, reproduced on request', () => {
  // Hand the table the deposits the sheet hands out and it must become the sheet.
  const t = table({}, WORKBOOK_DEPOSITS)

  test('the savings pool and the residence are read straight off the sheet', () => {
    expect(t.totalSavings).toBe(315000) //                    R3 = E15
    expect(t.residence.value).toBe(1400000) //                K9 = E11
    expect(t.residence.requiredFunding).toBe(225000) //       K11 = E13
    expect(t.residence.taxApportionmentPct).toBe(0.6) //      K13
    expect(t.residence.loanApportioned).toBe(135000) //       K15 = K11 × K13
  })

  test('row 9 — Value is each property in turn', () => {
    expect(t.properties.map(p => p.value)).toEqual(PRICES) // L9..P9
  })

  test('row 11 — Req\'d Funding reproduces the workbook cell for cell', () => {
    expect(t.properties.map(p => p.requiredFunding)).toEqual([
      559000, //  L11 = L9 − L7 = 649,000 − 90,000
      515000, //  M11
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
    // R5 = R11/R9 = 3,597,000 / 4,862,000. The sheet computes this and then never reads
    // it again — no formula on any of the seven sheets references the cell.
    expect(t.lvr).toBeCloseTo(0.7398190045, 9)
  })

  test('the family kept the rest, and it is said out loud', () => {
    // The workbook never states this: 315,000 − 90,000 of deposit actually applied.
    expect(t.depositHeldBack).toBe(225000)
  })
})

describe('apportionLoans — the default: the savings ARE the deposit', () => {
  const t = table()

  test('the whole pool reaches the properties, in order, until it runs out', () => {
    // `INPUTS` B15 calls it "Total Savings for (Combined) Investment Property's Deposit",
    // and nothing subtracts the home mortgage from it any more.
    expect(t.properties.map(p => p.depositAvailable)).toEqual([315000, 0, 0, 0, 0])
    expect(t.properties.map(p => p.depositApplied)).toEqual([315000, 0, 0, 0, 0])
    expect(t.depositHeldBack).toBe(0)
  })

  test('property 1 borrows 334,000 where the sheet had it borrowing 559,000', () => {
    // 649,000 − 315,000. The other four are unchanged: nothing was left for them under
    // either reading.
    expect(t.properties.map(p => p.requiredFunding)).toEqual([
      334000, 515000, 649000, 864000, 785000
    ])
  })

  test('the portfolio totals move with it', () => {
    expect(t.totals.value).toBe(4862000) //            R9 — unchanged, no price moved
    expect(t.totals.requiredFunding).toBe(3372000) //  225,000 + 3,147,000
    expect(t.lvr).toBeCloseTo(3372000 / 4862000, 9) // 69.35%, against the sheet's 73.98%
  })
})

describe('CORRECTION 4 — row 15 apportions the FUNDING, never the purchase price', () => {
  test('property 1 is apportioned 559,000, not the workbook\'s 649,000', () => {
    // Under the sheet's own allocation, so the two readings are compared on equal terms.
    // L15 as written is `=L9*L13` — VALUE × 100% = 649,000 — while the residence's own
    // cell K15 is `=K11*K13`, REQUIRED FUNDING × 60%.
    const t = table({}, WORKBOOK_DEPOSITS)
    expect(t.properties[0].loanApportioned).toBe(559000)
    expect(t.properties[0].loanApportioned).not.toBe(649000) // the workbook's L15
  })

  test('properties 2 to 5 are unchanged — their cells agree under both readings', () => {
    // M15..P15 are hardcoded constants in the sheet, and row 9 and row 11 are equal for
    // all four (no savings ever reach them), so the correction cannot move them.
    const t = table({}, WORKBOOK_DEPOSITS)
    expect(t.properties.slice(1).map(p => p.loanApportioned)).toEqual([
      515000, 649000, 864000, 785000 //  M15..P15
    ])
  })

  test('R17 lands on the residence\'s non-deductible share — the proof', () => {
    // "Balance of Loans to Apportion" = R11 − R15. Read row 11 × row 13, what is left
    // unapportioned is exactly the part of the home loan that is NOT deductible:
    //   225,000 × (1 − 0.6) = 90,000
    // The sheet's own R17 shows 0 — but only because L7 happens to equal K11 × 40% on
    // these figures. Move the mortgage and the 0 evaporates; this does not.
    expect(table({}, WORKBOOK_DEPOSITS).totals.balanceToApportion).toBeCloseTo(90000, 6)
    expect(table().totals.balanceToApportion).toBeCloseTo(90000, 6)
  })

  test('...and it holds at any mortgage, and any apportionment percentage', () => {
    expect(table({ homeMortgage: 300000 }).totals.balanceToApportion)
      .toBeCloseTo(300000 * 0.4, 6)
    expect(table({ homeMortgage: 300000, residenceTaxApportionmentPct: 0.25 }).totals.balanceToApportion)
      .toBeCloseTo(300000 * 0.75, 6)
    // A home used wholly for the investments apportions the lot and leaves nothing.
    expect(table({ residenceTaxApportionmentPct: 1 }).totals.balanceToApportion)
      .toBeCloseTo(0, 6)
  })
})

describe('CORRECTION 5 — the deposit is spent once', () => {
  test('the workbook\'s 405,000 of investor cash was 315,000 of actual money', () => {
    // OUTPUTS C18 gives property 1 the WHOLE pool and C100 gives property 2 a second
    // helping of the same money (INPUTS!L7), for 405,000 from a 315,000 deposit.
    expect(table({}, WORKBOOK_DEPOSITS).totals.depositApplied).toBe(90000)
    expect(table().totals.depositApplied).toBe(315000)
    expect(table().totals.depositApplied).toBeLessThanOrEqual(HOUSEHOLD.totalSavings)
  })

  test('and still is when the pool is large enough to buy outright', () => {
    // A million to spend on a 649,000 and a 515,000 property: the first is paid for in
    // cash, the second takes what is left and borrows the difference.
    const t = apportionLoans({
      residenceValue: 0,
      homeMortgage: 0,
      totalSavings: 1000000,
      residenceTaxApportionmentPct: 1,
      properties: [{ purchasePrice: 649000 }, { purchasePrice: 515000 }]
    })
    expect(t.properties[0].requiredFunding).toBe(0)
    expect(t.properties[0].depositApplied).toBe(649000)
    expect(t.properties[1].requiredFunding).toBe(164000) //  515,000 − 351,000
    expect(t.properties[1].depositApplied).toBe(351000) //   1,000,000 − 649,000
    expect(t.totals.depositApplied).toBe(1000000) //         exactly the pool, to the dollar
    expect(t.depositHeldBack).toBe(0)
  })
})

describe('THE HOLD-BACK — the family decides how much of their cash to use', () => {
  test('what is held back is held back, and the borrowing rises to match', () => {
    // 100,000 kept in the bank: property 1 puts down 215,000 and borrows 434,000.
    const t = table({}, [215000, 0, 0, 0, 0])
    expect(t.properties[0].depositApplied).toBe(215000)
    expect(t.properties[0].requiredFunding).toBe(434000)
    expect(t.depositHeldBack).toBe(100000)
  })

  test('a deposit of ZERO is a choice, not a missing field', () => {
    // The trap in this whole design: `0` must mean "put nothing down", never "you did
    // not tell me". Property 1 borrows the lot and the money stays with the family.
    const t = table({}, [0, 0, 0, 0, 0])
    expect(t.properties[0].depositApplied).toBe(0)
    expect(t.properties[0].requiredFunding).toBe(649000)
    expect(t.properties[0].depositChosen).toBe(true)
    expect(t.depositHeldBack).toBe(315000)
  })

  test('spreading it across two properties spends it once', () => {
    const t = table({}, [200000, 115000, 0, 0, 0])
    expect(t.properties[0].requiredFunding).toBe(449000) //  649,000 − 200,000
    expect(t.properties[1].requiredFunding).toBe(400000) //  515,000 − 115,000
    expect(t.totals.depositApplied).toBe(315000)
    expect(t.depositHeldBack).toBe(0)
  })

  test('a later property can be funded while an earlier one is not', () => {
    // Nothing forces the money to the front of the queue.
    const t = table({}, [0, 315000, 0, 0, 0])
    expect(t.properties[0].requiredFunding).toBe(649000)
    expect(t.properties[1].requiredFunding).toBe(200000) //  515,000 − 315,000
    expect(t.depositHeldBack).toBe(0)
  })

  test('more than they have is reduced to what they have, and SAID', () => {
    const t = table({}, [400000, 0, 0, 0, 0])
    expect(t.properties[0].depositApplied).toBe(315000)
    expect(t.warnings.filter(w => w.code === 'DEPOSIT_EXCEEDS_SAVINGS')).toHaveLength(1)
    expect(t.depositHeldBack).toBe(0)
  })

  test('more than the house costs is reduced to the house, and SAID', () => {
    const t = apportionLoans({
      residenceValue: 0,
      homeMortgage: 0,
      totalSavings: 2000000,
      residenceTaxApportionmentPct: 1,
      properties: [{ purchasePrice: 649000, depositApplied: 700000 }]
    })
    expect(t.properties[0].depositApplied).toBe(649000)
    expect(t.properties[0].requiredFunding).toBe(0)
    expect(t.warnings.filter(w => w.code === 'DEPOSIT_EXCEEDS_PRICE')).toHaveLength(1)
  })

  test('a negative deposit is refused, and SAID', () => {
    const t = table({}, [-50000, 0, 0, 0, 0])
    expect(t.properties[0].depositApplied).toBe(0)
    expect(t.warnings.filter(w => w.code === 'DEPOSIT_NEGATIVE')).toHaveLength(1)
  })

  test('an unusable deposit falls back to taking what is there — it is not read as zero', () => {
    // `'a lot'` is not a figure. Treating it as 0 would silently change the answer.
    const t = table({}, ['a lot', 0, 0, 0, 0])
    expect(t.properties[0].depositChosen).toBe(false)
    expect(t.properties[0].depositApplied).toBe(315000)
  })
})

describe('🔴 THE IDENTITIES — "the math has to add up", under anything a family can type', () => {
  const cases = [
    ['the default', undefined],
    ['the workbook\'s own allocation', WORKBOOK_DEPOSITS],
    ['everything held back', [0, 0, 0, 0, 0]],
    ['spread across two', [200000, 115000, 0, 0, 0]],
    ['more than they have', [400000, 0, 0, 0, 0]],
    ['a negative', [-50000, 0, 0, 0, 0]],
    ['loaded onto the last one', [0, 0, 0, 0, 315000]]
  ]

  cases.forEach(function (pair) {
    const label = pair[0]
    const deposits = pair[1]

    test(`${label} — borrowing plus deposit is the purchase price, every property`, () => {
      table({}, deposits).properties.forEach(function (p) {
        expect(p.requiredFunding + p.depositApplied).toBeCloseTo(p.value, 6)
        expect(p.requiredFunding).toBeGreaterThanOrEqual(0)
        expect(p.depositApplied).toBeGreaterThanOrEqual(0)
      })
    })

    test(`${label} — spent plus held back is the pool, and neither goes negative`, () => {
      const t = table({}, deposits)
      expect(t.totals.depositApplied + t.depositHeldBack).toBeCloseTo(t.totalSavings, 6)
      expect(t.depositHeldBack).toBeGreaterThanOrEqual(0)
      expect(t.totals.depositApplied).toBeLessThanOrEqual(t.totalSavings)
    })

    test(`${label} — the two loans sum to the funding, every property`, () => {
      const r = computeMultiplePropertyPortfolio({
        household: HOUSEHOLD,
        properties: defaultProperties().map(function (p, i) {
          return deposits ? Object.assign({}, p, { depositApplied: deposits[i] }) : p
        })
      })
      r.properties.forEach(function (p, i) {
        const io = p.loans.interestOnly.balance[0]
        const pi = p.loans.principalAndInterest.openingBalance[0]
        expect(io + pi).toBeCloseTo(r.apportionment.properties[i].loanApportioned, 6)
        expect(pi).toBeGreaterThanOrEqual(0) //  never a negative P&I loan
      })
    })
  })
})

describe('THE LENDING TEST the workbook never ran', () => {
  test('no ceiling means no verdict — the LVR is still reported', () => {
    const t = table()
    expect(t.maxLvr).toBeNull()
    expect(t.lvrBreach).toBe(false)
    expect(t.warnings.filter(w => /LVR/.test(w.code))).toHaveLength(0)
    expect(t.lvr).toBeGreaterThan(0)
    expect(t.investmentLvr).toBeGreaterThan(0)
  })

  test('the investments are measured on their own, as an investor\'s lender measures them', () => {
    const t = table()
    // 3,147,000 of borrowing against 3,462,000 of rentals — the family home and its
    // mortgage left out of both halves, where R5 puts them in.
    expect(t.investmentLvr).toBeCloseTo(3147000 / 3462000, 9) //  90.9%
    expect(t.lvr).toBeCloseTo(3372000 / 4862000, 9) //            69.4%
  })

  test('a ceiling is tested, and a breach is named rather than left to be spotted', () => {
    const t = table({ maxLvr: 0.8 })
    // All-in the portfolio passes at 69.4%; the rentals alone do not, at 90.9%.
    expect(t.lvrBreach).toBe(false)
    expect(t.investmentLvrBreach).toBe(true)
    expect(t.warnings.map(w => w.code)).toContain('INVESTMENT_LVR_EXCEEDED')
    expect(t.warnings.map(w => w.code)).not.toContain('PORTFOLIO_LVR_EXCEEDED')
  })

  test('each property is tested too', () => {
    const t = table({ maxLvr: 0.8 })
    // Property 1 puts down 315,000 of a 649,000 house — 51.5%, comfortably inside.
    // The other four borrow the whole price, which is 100%.
    expect(t.properties[0].lvr).toBeCloseTo(334000 / 649000, 9)
    expect(t.properties[0].lvrBreach).toBe(false)
    expect(t.properties.slice(1).every(p => p.lvr === 1)).toBe(true)
    expect(t.warnings.filter(w => w.code === 'LVR_EXCEEDED')).toHaveLength(4)
  })

  test('a hold-back is what breaches it, and the model says so', () => {
    // The same family keeping their cash back pushes property 1 to 100% too.
    const t = table({ maxLvr: 0.8 }, [0, 0, 0, 0, 0])
    expect(t.properties[0].lvrBreach).toBe(true)
    expect(t.warnings.filter(w => w.code === 'LVR_EXCEEDED')).toHaveLength(5)
  })

  test('the residence carries its own LVR', () => {
    expect(table().residence.lvr).toBeCloseTo(225000 / 1400000, 9) //  16.1%
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

  test('the household carries a ceiling that is ours, not the workbook\'s', () => {
    expect(DEFAULT_HOUSEHOLD.maxLvr).toBe(0.8)
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
    // rental growth only — untouched by any correction, so this is an exact match
    // against the spreadsheet's own cache.
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
    for (let y = 0; y < YEARS; y++) { //  row 15 = C11 − C13
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

  test('the consolidated deposit is the household\'s money, once', () => {
    // Row 29 = OUTPUTS!C18+C100+C179+C258+C337, which the sheet caches at 405,000 from
    // a 315,000 pool.
    expect(r.consolidated.cashDeposit).toBe(315000)
    expect(r.consolidated.cashDeposit).toBeLessThanOrEqual(r.household.totalSavings)
    expect(r.consolidated.cashDeposit + r.apportionment.depositHeldBack)
      .toBeCloseTo(r.household.totalSavings, 6)
  })

  test('the four headline figures are read off the portfolio', () => {
    expect(r.headline.weeklyCashPosition).toBeCloseTo(r.consolidated.weeklyCashPosition[0], 6)
    expect(r.headline.totalDebt).toBeCloseTo(r.consolidated.totalDebt[0], 6)
    expect(r.headline.netEquityFinalYear).toBeCloseTo(r.consolidated.netEquity[9], 6)
    expect(r.headline.returnOnInvestorFundsFinalYear)
      .toBeCloseTo(r.consolidated.returnOnInvestorFunds[9], 9)
  })
})

describe('SERVICING — what the portfolio demands, which is not a verdict', () => {
  const r = computeMultiplePropertyPortfolio({})
  const s = r.consolidated.servicing

  test('the demand is the cash top-up plus any capital introduced', () => {
    for (let y = 0; y < YEARS; y++) {
      expect(s.totalDemand[y]).toBeCloseTo(s.annualDemand[y] + s.capitalDemand[y], 6)
      expect(s.weeklyDemand[y]).toBeCloseTo(s.totalDemand[y] / 52, 6)
    }
  })

  test('the annual demand is the consolidated top-up the sheet already carries', () => {
    // Row 30 = OUTPUTS!C19+C101+C180+C259+C338.
    expect(s.annualDemand).toEqual(r.consolidated.annualCashTopUp)
  })

  test('the worst year is named, not left to be found', () => {
    const worst = Math.max.apply(null, s.totalDemand)
    expect(s.peakAnnualDemand).toBeCloseTo(worst, 6)
    expect(s.totalDemand[s.peakYear - 1]).toBeCloseTo(worst, 6)
    expect(s.peakYear).toBeGreaterThanOrEqual(1)
    expect(s.peakYear).toBeLessThanOrEqual(YEARS)
  })

  test('the ten-year demand is the ten years added up', () => {
    expect(s.tenYearDemand).toBeCloseTo(
      s.totalDemand.reduce(function (a, v) { return a + v }, 0), 6
    )
  })

  test('it states no affordability verdict, because no income is collected', () => {
    // The workbook holds no household income and no living costs on any sheet. A pass
    // or fail here would be a verdict nothing had earned.
    expect(s.affordable).toBeUndefined()
    expect(s.serviceable).toBeUndefined()
    expect(r.household.income).toBeUndefined()
  })
})

describe('the table reaches the properties', () => {
  const r = computeMultiplePropertyPortfolio({})

  test('property 1 is funded at 334,000, and the deposit it was given is its own', () => {
    // `INPUTS` E65 = `L15`. The sheet had 649,000 and a 315,000 deposit it never spent.
    expect(r.apportionment.properties[0].loanApportioned).toBe(334000)
    expect(r.properties[0].investmentSummary.cashDeposit).toBe(315000)
  })

  test('the typed interest-only loan is capped at the funding, and SAID', () => {
    // The sample types 350,000 against a property that now needs 334,000. Left alone it
    // would make the P&I loan minus 16,000 and everything below it nonsense.
    const capped = r.warnings.filter(w => w.code === 'INTEREST_ONLY_CAPPED')
    expect(capped).toHaveLength(1)
    expect(capped[0].property).toBe(1)
    expect(capped[0].typed).toBe(350000)
    expect(capped[0].applied).toBe(334000)
    expect(r.properties[0].loans.principalAndInterest.openingBalance[0]).toBe(0)
  })

  test('under the workbook\'s own allocation nothing is capped', () => {
    // 559,000 of funding comfortably holds the 350,000 interest-only slice, and the P&I
    // loan takes the 209,000 balance.
    const w = computeMultiplePropertyPortfolio({
      household: HOUSEHOLD,
      properties: defaultProperties().map(function (p, i) {
        return Object.assign({}, p, { depositApplied: WORKBOOK_DEPOSITS[i] })
      })
    })
    expect(w.warnings.filter(x => x.code === 'INTEREST_ONLY_CAPPED')).toHaveLength(0)
    expect(w.properties[0].loans.interestOnly.balance[0]).toBeCloseTo(350000, 6)
    expect(w.properties[0].loans.principalAndInterest.openingBalance[0]).toBeCloseTo(209000, 6)
  })

  test('properties 2 to 5 are funded exactly as the workbook funds them', () => {
    expect(r.properties.slice(1).map(function (p) {
      return p.loans.interestOnly.balance[0] +
        p.loans.principalAndInterest.openingBalance[0]
    }).map(Math.round)).toEqual([515000, 649000, 864000, 785000]) // M15..P15
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
    expect(r.apportionment.properties.map(p => p.depositApplied)).toEqual([315000, 0])
    expect(r.consolidated.totalRevenue[0]).toBeCloseTo((610 + 485) * 50, 6)
  })
})
