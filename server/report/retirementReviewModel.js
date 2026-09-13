/**
 * Retirement Review — the maths model.
 *
 * Source workbook: `design/report-source-models/Exposure.Retirement.Review (1).xlsx`.
 * Six sheets, four of them visible, ported here as two pure compute functions:
 *
 *   `computeQuickCalculator`  ← sheet "Quick Calculator"
 *       Ten retirement-philosophy answers, then the savings gap: the lump sum the
 *       client must have saved (`PV` of the income they want), less the assets they
 *       would sell, turned into a monthly savings target (`PMT`).
 *
 *   `computeRetirementReview` ← sheets "Use of Assets in Retirement" (the current
 *       position), "Asset & Cash Transactions" (the twenty-year engine), "Report"
 *       (the output series), and the two hidden "Mtg Calcs" sheets (a monthly
 *       amortisation table per property per mortgage type).
 *
 * Calculation is backend-only (Stack Constitution). No I/O, no state.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THREE RULED DEPARTURES FROM THE WORKBOOK — ALL MIKE, 2026-09-13
 * ─────────────────────────────────────────────────────────────────────────────
 * This model does NOT reproduce the workbook's figures, and the three reasons are
 * below. They ride on every result as `workbookCorrections` so a screen can say
 * why its numbers differ from a spreadsheet the adviser may have open beside it.
 *
 * The port was proved faithful BEFORE any of them was applied — every cached value
 * on all six sheets, all twenty years, matched exactly. That proof is what makes
 * these three deliberate rather than accidental, and the golden test still pins
 * every figure the corrections do not touch directly against the workbook.
 *
 *   1. TAX READS THE CURRENT BANDS. The workbook hardcodes New Zealand thresholds
 *      that the 2024 change superseded (14,000 / 48,000 / 70,000 / 180,000). This
 *      model reads `data/tax-bands.json` — the single source for every model that
 *      computes income tax, Mike's ruling of 2026-07-23 — which carries the
 *      current 15,600 / 53,500 / 78,100 / 180,000, verified against IRD. The
 *      average rate falls from 12.926% to 12.582%, and that rate is applied to
 *      rental income in all twenty years.
 *
 *   2. THE PENSION IS TAXED IN THE PROJECTION. The workbook's summary sheet
 *      applies the pension tax rate (`Use of Assets` J19, 14%) and shows 612.32 a
 *      week; its twenty-year engine ignored it and used the gross 712 (`Asset &
 *      Cash Transactions` G26 = `F19*52`). One workbook, two answers, 99.68 a week
 *      apart in year 1 — and the engine's figure then compounded at CPI for twenty
 *      years. The client cannot spend tax they owe, so the summary sheet was right
 *      and the projection is now taxed to match it.
 *
 *   3. EVERY PROPERTY RUNS FROM YEAR 1. The sixth property's rows on the engine
 *      sheet started at column K (year 5) where the other five start at column G.
 *      Three consequences from one slip: it earned no rent and paid no mortgage in
 *      years 1–4; its whole series ran four years late; and — worst — the "Value
 *      Realised" row carried the same shift, so selling it in year 17 read year 21,
 *      past the end of the sheet. The property dropped out of the projection and
 *      the client was credited with nothing for it, roughly 915,000 of equity gone.
 *      That the author did not intend this is provable on the same sheet: the
 *      house-asset line (G37) reaches across to `K97` specifically to pick the
 *      sixth property up at year 1, and the year-1 tax rate includes its rental
 *      surplus. Correcting it was a deletion — there is no offset here at all.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TWO WORKBOOK QUIRKS THAT ARE NOT DEFECTS — PORTED WITHOUT COMMENT ELSEWHERE
 * ─────────────────────────────────────────────────────────────────────────────
 *   - The cash row's rate, term and end balance (`Use of Assets` H15/J15/L15)
 *     feed a monthly-withdrawal figure that nothing consumes. Cash is the buffer
 *     account: only its opening balance (F15) enters the engine. Carried as
 *     `quickCalcs.cashMonthlyWithdrawal` because the sheet shows it.
 *   - A property sold in year N still earns a full year's rent and pays a full
 *     year's mortgage in year N, and is sold for its year-N value. The workbook
 *     does this deliberately (`if(previousYear = "Sell", 0, …)` — the zero lands
 *     the year AFTER), so it is reproduced.
 *
 * The workbook also carries a State/Federal tax block alongside the New Zealand
 * one with every rate set to zero. It computes nothing and is not ported.
 */

const { getTaxBands, incomeTax } = require('./loanEstimatorModel')

/** The projection's length, in years — the engine and Report sheets both run G..Z. */
const YEARS = 20

/** The workbook allows six properties (`Use of Assets` rows 29–39, step 2). */
const MAX_PROPERTIES = 6

/** Constant instalment; principal and interest (`Mtg Calcs` C-column block). */
const MORTGAGE_TABLE = 'Table'
/** Constant principal; interest on the declining balance (`Mtg Calcs` K-column block). */
const MORTGAGE_REDUCING = 'Reducing'
/** Interest only; the balance never moves (`Mtg Calcs` S-column block). */
const MORTGAGE_INTEREST_ONLY = 'Interest Only'

/** The three mortgage types, in the order the workbook's dropdown offers them. */
const MORTGAGE_TYPES = [MORTGAGE_TABLE, MORTGAGE_REDUCING, MORTGAGE_INTEREST_ONLY]

/**
 * Where this model deliberately differs from the source workbook, and on whose
 * ruling. Carried on every result so a screen can explain why its figures do not
 * match a spreadsheet the adviser may have open beside it — a difference nobody
 * can account for is worse than no difference at all.
 * @type {Array<{key: string, ruledBy: string, ruledOn: string, cells: string, summary: string}>}
 */
const WORKBOOK_CORRECTIONS = [
  {
    key: 'currentTaxBands',
    ruledBy: 'Mike',
    ruledOn: '2026-09-13',
    cells: "'Use of Assets in Retirement' AJ8:AJ11 and AL8:AL12",
    summary: 'Income tax is charged on the current New Zealand thresholds from the central rate table, not the superseded ones the workbook carries. The average rate falls from 12.926 to 12.582 per cent.'
  },
  {
    key: 'pensionTaxedInProjection',
    ruledBy: 'Mike',
    ruledOn: '2026-09-13',
    cells: "'Asset & Cash Transactions' G26",
    summary: 'The government pension is counted after tax across all twenty years. The workbook counted it after tax on its summary sheet but before tax in its projection, a difference of 99.68 a week in year one.'
  },
  {
    key: 'sixthPropertyRunsFromYearOne',
    ruledBy: 'Mike',
    ruledOn: '2026-09-13',
    cells: "'Asset & Cash Transactions' rows 97–104, which started at column K",
    summary: 'The sixth property earns and is paid for from year one like the other five. In the workbook its rows sat four years out, so it earned nothing for four years and, when sold, credited the client with nothing at all.'
  }
]

/** Coerce to a finite number; anything else is 0, never NaN. */
function num (v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Guard every division: a zero denominator yields 0, never NaN/Infinity. */
function div (a, b) {
  return b ? a / b : 0
}

/**
 * Excel `PMT(rate, nper, pv, fv, type)` — the level payment on an annuity.
 * Returned with Excel's sign convention (negative for a positive present value),
 * so callers negate or take the magnitude exactly as the workbook's cells do.
 *
 * Used four ways here: the Table mortgage instalment (`Mtg Calcs` C23), the
 * superannuation and other-investment drawdowns (`Use of Assets` N17/N24), and
 * the Quick Calculator's monthly savings target (F29, `type` 1).
 *
 * @param {number} rate per period
 * @param {number} nper number of periods
 * @param {number} pv present value
 * @param {number} [fv] future value at the end of the term
 * @param {number} [type] 0 = payment in arrears, 1 = annuity due
 * @returns {number}
 */
function excelPmt (rate, nper, pv, fv, type) {
  const n = num(nper)
  if (!n) { return 0 }
  const r = num(rate)
  const f = num(fv)
  const due = num(type) ? 1 : 0
  if (!r) { return -div(num(pv) + f, n) }
  const growth = Math.pow(1 + r, n)
  return -(num(pv) * growth + f) / (div(growth - 1, r) * (1 + r * due))
}

/**
 * Excel `PV(rate, nper, pmt, fv, type)` — the present value of an annuity.
 * Returned with Excel's sign convention.
 *
 * The Quick Calculator needs the annuity-DUE form WITH a future value (F23:
 * `-PV(F20/12, F21*12, F19, F22, 1)` — income drawn at the start of each month,
 * plus a lump sum retained at the end). `loanEstimatorModel` exports a
 * `presentValueAnnuityDue`, but it fixes the future value at zero and is pinned
 * by that model's tests; widening it is a change to a shipped file and needs its
 * own approval, so this model carries the general form. Consolidating the two is
 * a follow-up, not something to do silently here.
 *
 * @param {number} rate per period
 * @param {number} nper number of periods
 * @param {number} pmt payment per period
 * @param {number} [fv] future value at the end of the term
 * @param {number} [type] 0 = payment in arrears, 1 = annuity due
 * @returns {number}
 */
function excelPv (rate, nper, pmt, fv, type) {
  const n = num(nper)
  if (!n) { return 0 }
  const r = num(rate)
  const p = num(pmt)
  const f = num(fv)
  const due = num(type) ? 1 : 0
  if (!r) { return -(f + p * n) }
  const growth = Math.pow(1 + r, n)
  return -(f + p * (1 + r * due) * div(growth - 1, r)) / growth
}

/**
 * One property's mortgage, resolved to the two annual series the engine consumes:
 * the debt still owing at each year end, and the total paid during each year.
 *
 * This replaces the workbook's two hidden sheets, which lay out 240 monthly rows
 * per property per mortgage type and then read off the year boundaries. The two
 * guards below are theirs, and the difference between them is deliberate:
 *
 *   - DEBT is floored at zero (`if(F41 <= 0, 0, F41)`).
 *   - The YEAR'S PAYMENTS are zeroed only once the balance is past −1
 *     (`if(F41 < -1, 0, sum(...))`), so the year that clears the loan still
 *     counts a full twelve instalments — which is what the client actually pays.
 *
 * Note the workbook labels these rows "Table Principle" / "Reducing Principle".
 * They are not principal; they are the whole instalment, principal and interest
 * together. The engine uses them as the mortgage outgoing, so the label is wrong
 * and the maths is right.
 *
 * @param {object} property one entry of `inputs.position.properties`
 * @returns {{monthlyPayment: number, annualPayment: number[], debtAtYearEnd: number[]}}
 *   each array is length `YEARS`, index 0 = year 1
 */
function mortgageSchedule (property) {
  const debt = num(property && property.debt)
  const rate = num(property && property.rate)
  const termMonths = Math.round(num(property && property.termYears) * 12)
  const endTermDebt = num(property && property.endTermDebt)
  const type = (property && property.mortgageType) || MORTGAGE_TABLE

  const annualPayment = new Array(YEARS).fill(0)
  const debtAtYearEnd = new Array(YEARS).fill(0)

  if (!debt || !termMonths) {
    return { monthlyPayment: 0, annualPayment, debtAtYearEnd }
  }

  // Interest only never touches the principal, so it needs no month-by-month walk:
  // the balance stands still until the term is served, then the loan is gone.
  // (`Mtg Calcs` C6 = `if(paymentsMade > termMonths, 0, debt)`, C11 = debt * rate.)
  if (type === MORTGAGE_INTEREST_ONLY) {
    const monthlyPayment = debt * rate / 12
    for (let y = 0; y < YEARS; y++) {
      const live = (y + 1) * 12 <= termMonths
      debtAtYearEnd[y] = live ? debt : 0
      annualPayment[y] = live ? debt * rate : 0
    }
    return { monthlyPayment, annualPayment, debtAtYearEnd }
  }

  // Table: one constant instalment for the life of the loan (`Mtg Calcs` C23).
  // Reducing: constant principal, interest on what is left, so the instalment falls.
  // The workbook writes this as `pmt(rate/12, termMonths, -debt, endTermDebt, 0)`
  // and reads the result straight off, positive — a negative present value already
  // yields a positive payment under Excel's sign convention, so it is NOT negated.
  const constantInstalment = type === MORTGAGE_REDUCING
    ? 0
    : excelPmt(rate / 12, termMonths, -debt, endTermDebt, 0)
  const constantPrincipal = type === MORTGAGE_REDUCING ? div(debt, termMonths) : 0

  let balance = debt
  for (let y = 0; y < YEARS; y++) {
    let paidThisYear = 0
    for (let m = 0; m < 12; m++) {
      const interest = balance * rate / 12
      const payment = type === MORTGAGE_REDUCING
        ? constantPrincipal + interest
        : constantInstalment
      paidThisYear += payment
      // The workbook lets the balance run negative past the end of the term rather
      // than stopping; the year guards below are what actually close the loan out.
      balance = balance + interest - payment
    }
    debtAtYearEnd[y] = balance <= 0 ? 0 : balance
    annualPayment[y] = balance < -1 ? 0 : paidThisYear
  }

  return {
    monthlyPayment: type === MORTGAGE_REDUCING ? constantPrincipal + debt * rate / 12 : constantInstalment,
    annualPayment,
    debtAtYearEnd
  }
}

/**
 * The household's average tax rate — the single number the engine applies to
 * rental income in every one of the twenty years (`Use of Assets` BM7).
 *
 * The workbook taxes two people separately over the band table, then divides the
 * combined tax by the combined income. Client 1 carries the business income plus
 * their share of the rental surplus; the spouse carries the rest of that surplus.
 *
 * Exported so the golden test can drive it with the WORKBOOK's own superseded
 * bands and reproduce its cached figures exactly — the proof that the band maths
 * is faithful, separate from the ruled decision to ship current rates.
 *
 * @param {object} p
 * @param {number} p.client1Income annual, gross
 * @param {number} p.spouseIncome annual, gross
 * @param {Array<{upTo: (number|null), rate: number}>} p.bands bottom-up
 * @returns {{client1Tax: number, spouseTax: number, combinedIncome: number, combinedTax: number, rate: number}}
 */
function averageTaxRate (p) {
  const bands = (p && p.bands) || []
  const client1Income = num(p && p.client1Income)
  const spouseIncome = num(p && p.spouseIncome)
  const client1Tax = incomeTax(client1Income, bands)
  const spouseTax = incomeTax(spouseIncome, bands)
  const combinedIncome = client1Income + spouseIncome
  const combinedTax = client1Tax + spouseTax
  return {
    client1Tax,
    spouseTax,
    combinedIncome,
    combinedTax,
    rate: div(combinedTax, combinedIncome)
  }
}

/**
 * The workbook's sample scenario, cell by cell. Every figure below is the
 * workbook's own, so the golden test can check the port against the spreadsheet
 * rather than against itself.
 *
 * @type {object}
 */
const DEFAULT_INPUTS = {
  country: 'NZ',

  // ── Sheet "Quick Calculator" ────────────────────────────────────────────────
  // The first ten are the retirement-philosophy answers. Four are free text and
  // feed no calculation — they are the adviser's conversation, and the workbook
  // prints them beside the numbers, so they travel with the model.
  quickCalculator: {
    retirementMeaning: 'Freedom', //             F5  (free text)
    retirementAge: 65, //                        F6
    householdMonthlyIncomeAfterTax: 12000, //    F7
    monthlySavings: 1000, //                     F8
    bareMinimumMonthlyIncome: 6000, //           F9
    wouldHateToMiss: 'Sleep', //                 F11 (free text)
    desiredMonthlyIncome: 7500, //               F12
    lookingForwardTo: 'Golf', //                 F13 (free text)
    provisionsRemoveNeed: 'No', //               F14 (free text)
    assetsToSellNetValue: 10000, //              F15
    returnRateInRetirement: 0.017, //            F20 (net of inflation, tax and fees)
    yearsOfIncomeRequired: 20, //                F21
    lumpSumToRetain: 8000, //                    F22
    yearsBeforeRetirement: 7, //                 F24
    returnRateWhileSaving: 0.04, //              F25
    kickStartLumpSum: 50 //                      F26
  },

  // ── Sheet "Use of Assets in Retirement" ─────────────────────────────────────
  position: {
    currentWeeklyIncomeRequired: 1700, //        F4
    // Z13, Z14, Z15, Z16 — the fourth rate repeats for years 5–20.
    inflation: [0.12, 0.09, 0.11, 0.03],
    business: {
      monthlyIncome: 1500, //                    F13 (gross)
      yearsExpected: 6 //                        L13
    },
    cash: {
      balance: 35000, //                         F15 — the only one the engine reads
      rate: 0.045, //                            H15 \
      termYears: 3, //                           J15  } display-only quick calc
      endBalance: 5000 //                        L15 /
    },
    superannuation: {
      balance: 265000, //                        F17
      rate: 0.045, //                            H17
      termYears: 10, //                          J17
      endBalance: 15000 //                       L17
    },
    otherInvestments: {
      balance: 27500, //                         F24
      rate: 0.045, //                            H24
      termYears: 3, //                           J24
      endBalance: 7500 //                        L24
    },
    pension: {
      qualifies: true, //                        F21 ("Yes")
      weekly: 712, //                            F19 (gross)
      cpiAdjustment: 0.03, //                    H19
      taxRate: 0.14 //                           J19
    },
    // AF15 — how the rental surplus is split between the two people for tax.
    rentalIncomeTaxSplit: 0.5,
    // Rows 29–39. `sellInYear` is the engine sheet's per-year "Sell/Retain"
    // dropdown (row 57, 66, 75, 84, 93, 102), flattened to the year it fires.
    properties: [
      { name: 'Home 1', value: 375000, debt: 300000, rate: 0.05, termYears: 15, monthlyRent: 1650, mortgageType: MORTGAGE_INTEREST_ONLY, endTermDebt: 0, growthRate: 0.0495, rentGrowthRate: 0.055, sellInYear: null },
      { name: 'Home 2', value: 650000, debt: 312000, rate: 0.0535, termYears: 15, monthlyRent: 2200, mortgageType: MORTGAGE_TABLE, endTermDebt: 0, growthRate: 0.04, rentGrowthRate: 0.04, sellInYear: 4 },
      { name: 'Home 3', value: 725000, debt: 285000, rate: 0.0605, termYears: 14, monthlyRent: 2400, mortgageType: MORTGAGE_REDUCING, endTermDebt: 0, growthRate: 0.06, rentGrowthRate: 0.06, sellInYear: null },
      { name: 'Home 4', value: 489000, debt: 65000, rate: 0.0565, termYears: 16, monthlyRent: 1650, mortgageType: MORTGAGE_INTEREST_ONLY, endTermDebt: 0, growthRate: 0.035, rentGrowthRate: 0.035, sellInYear: null },
      { name: 'Home 5', value: 562000, debt: 250000, rate: 0.05, termYears: 18, monthlyRent: 1900, mortgageType: MORTGAGE_TABLE, endTermDebt: 0, growthRate: 0.045, rentGrowthRate: 0.045, sellInYear: 15 },
      { name: 'Home 6', value: 635000, debt: 213456, rate: 0.0545, termYears: 20, monthlyRent: 1850, mortgageType: MORTGAGE_TABLE, endTermDebt: 0, growthRate: 0.04, rentGrowthRate: 0.04, sellInYear: 17 }
    ]
  }
}

/**
 * Sheet "Quick Calculator" — the savings gap.
 *
 * Self-contained: it shares no figure with the twenty-year projection, which is
 * why the workbook keeps it on its own sheet and why it computes separately here.
 * An adviser can run it in a first meeting before any of the position is known.
 *
 * @param {object} [inputs] `DEFAULT_INPUTS.quickCalculator` shape; missing fields
 *   fall back to the workbook's sample
 * @returns {object} the ten answers, plus the six computed figures
 */
function computeQuickCalculator (inputs) {
  const q = Object.assign({}, DEFAULT_INPUTS.quickCalculator, inputs || {})

  const monthlyIncomeRequired = num(q.desiredMonthlyIncome) //                    F19 = F12
  const returnInRetirement = num(q.returnRateInRetirement) //                     F20
  const yearsOfIncome = num(q.yearsOfIncomeRequired) //                           F21
  const lumpSumToRetain = num(q.lumpSumToRetain) //                               F22

  // F23 — the lump sum needed at the moment of retirement to pay that income for
  // that many years and still leave the retained sum behind. Annuity DUE: the
  // income is drawn at the start of each month.
  const lumpSumRequired = -excelPv(
    returnInRetirement / 12,
    yearsOfIncome * 12,
    monthlyIncomeRequired,
    lumpSumToRetain,
    1
  )

  // F28 — less whatever they are willing to sell to fund it.
  const savingsTarget = lumpSumRequired - num(q.assetsToSellNetValue)

  // F29 — what that target costs per month between now and retirement, given a
  // kick-start lump sum already in hand.
  const monthlySavingsRequired = -excelPmt(
    num(q.returnRateWhileSaving) / 12,
    num(q.yearsBeforeRetirement) * 12,
    -num(q.kickStartLumpSum),
    savingsTarget,
    1
  )

  return {
    answers: {
      retirementMeaning: q.retirementMeaning,
      retirementAge: num(q.retirementAge),
      householdMonthlyIncomeAfterTax: num(q.householdMonthlyIncomeAfterTax),
      monthlySavings: num(q.monthlySavings),
      bareMinimumMonthlyIncome: num(q.bareMinimumMonthlyIncome),
      wouldHateToMiss: q.wouldHateToMiss,
      desiredMonthlyIncome: num(q.desiredMonthlyIncome),
      lookingForwardTo: q.lookingForwardTo,
      provisionsRemoveNeed: q.provisionsRemoveNeed,
      assetsToSellNetValue: num(q.assetsToSellNetValue)
    },
    monthlyIncomeRequired, //     F19
    lumpSumRequired, //           F23
    savingsTarget, //             F28
    monthlySavingsRequired, //    F29
    // The shortfall the client is carrying today: what they must save each month
    // against what they do save (F8). The workbook shows both figures and leaves
    // the reader to subtract; the gap is the point of the sheet.
    monthlySavingsShortfall: monthlySavingsRequired - num(q.monthlySavings)
  }
}

/**
 * The inflation rate that lifts year `y` to year `y + 1` (`Use of Assets` Z13:Z16).
 * The workbook names four and then repeats the fourth for the rest of the run.
 * @param {number[]} inflation
 * @param {number} yearIndex zero-based index of the year being left
 * @returns {number}
 */
function inflationForYear (inflation, yearIndex) {
  const list = Array.isArray(inflation) && inflation.length ? inflation : [0]
  return num(list[Math.min(yearIndex, list.length - 1)])
}

/**
 * One property's twenty years: value, debt, rent, mortgage payment, and the
 * proceeds if it is sold (`Asset & Cash Transactions` rows 52–59 and its repeats).
 *
 * The sale rule is the workbook's: the zero lands the year AFTER the sale, so the
 * property earns a full year's rent and pays a full year's mortgage in the year it
 * is sold, and is sold for that year's value less that year's debt.
 *
 * @param {object} property
 * @returns {{value: number[], debt: number[], rent: number[], mortgage: number[], saleProceeds: number[]}}
 */
function projectProperty (property) {
  const schedule = mortgageSchedule(property)
  const growth = num(property.growthRate)
  const rentGrowth = num(property.rentGrowthRate)
  const sellInYear = property.sellInYear === null || property.sellInYear === undefined
    ? null
    : Math.round(num(property.sellInYear))

  const value = new Array(YEARS).fill(0)
  const debt = new Array(YEARS).fill(0)
  const rent = new Array(YEARS).fill(0)
  const mortgage = new Array(YEARS).fill(0)
  const saleProceeds = new Array(YEARS).fill(0)

  for (let y = 0; y < YEARS; y++) {
    // The zero lands the year AFTER the sale, so a property sold in year N still
    // earns and still pays through year N. That is the workbook's own rule.
    if (sellInYear !== null && (y + 1) > sellInYear) { continue }

    if (y === 0) {
      value[y] = num(property.value)
      rent[y] = num(property.monthlyRent) * 12
    } else {
      value[y] = value[y - 1] * (1 + growth)
      rent[y] = rent[y - 1] * (1 + rentGrowth)
    }
    debt[y] = schedule.debtAtYearEnd[y]
    mortgage[y] = schedule.annualPayment[y]
  }

  if (sellInYear !== null) {
    const soldIndex = sellInYear - 1
    if (soldIndex >= 0 && soldIndex < YEARS) {
      saleProceeds[soldIndex] = value[soldIndex] - debt[soldIndex]
    }
  }

  return { value, debt, rent, mortgage, saleProceeds }
}

/**
 * The whole Retirement Review: the current position, the twenty-year projection
 * and the year-one readings the workbook's summary sheet shows.
 *
 * @param {object} [inputs] `DEFAULT_INPUTS` shape; missing fields fall back to the
 *   workbook's sample so the model always returns a coherent scenario
 * @returns {object}
 */
function computeRetirementReview (inputs) {
  const given = inputs || {}
  const position = Object.assign({}, DEFAULT_INPUTS.position, given.position || {})
  const country = given.country || DEFAULT_INPUTS.country
  const taxTable = getTaxBands(country)

  const properties = (Array.isArray(position.properties) ? position.properties : [])
    .slice(0, MAX_PROPERTIES)

  // ── Year-one property readings (`Use of Assets` rows 29–41) ─────────────────
  // These drive the tax rate, and the tax rate drives everything else, so they
  // are computed across ALL properties before the projection starts. Defect 2
  // lives in the projection, not here — which is precisely why the two disagree.
  const perProperty = properties.map((p) => {
    const schedule = mortgageSchedule(p)
    return {
      name: p.name,
      value: num(p.value),
      debt: num(p.debt),
      monthlyRent: num(p.monthlyRent),
      mortgageType: p.mortgageType,
      monthlyMortgagePayment: schedule.monthlyPayment, //        T-column
      monthlyRentalSurplus: num(p.monthlyRent) - schedule.monthlyPayment // V-column
    }
  })

  const totalPropertyValue = perProperty.reduce((s, p) => s + p.value, 0) //       F41
  const totalPropertyDebt = perProperty.reduce((s, p) => s + p.debt, 0) //         H41
  const monthlyRentalSurplus = perProperty.reduce((s, p) => s + p.monthlyRentalSurplus, 0) // V41

  // ── The average tax rate (`Use of Assets` AH8:BM18) ─────────────────────────
  const split = num(position.rentalIncomeTaxSplit)
  const business = Object.assign({}, DEFAULT_INPUTS.position.business, position.business || {})
  const tax = averageTaxRate({
    // AI15 — business income plus this person's share of the rental surplus.
    client1Income: num(business.monthlyIncome) * 12 + monthlyRentalSurplus * 12 * split,
    // AI16 — the rest of the rental surplus.
    spouseIncome: monthlyRentalSurplus * 12 * (1 - split),
    bands: taxTable.bands
  })

  // ── The drawdown accounts (`Use of Assets` N15/N17/N24) ─────────────────────
  // Each is a balance run down to an end balance over a term, at a rate. Cash's
  // figure is display-only: only its opening balance enters the projection.
  const cash = Object.assign({}, DEFAULT_INPUTS.position.cash, position.cash || {})
  const superannuation = Object.assign({}, DEFAULT_INPUTS.position.superannuation, position.superannuation || {})
  const otherInvestments = Object.assign({}, DEFAULT_INPUTS.position.otherInvestments, position.otherInvestments || {})
  const pension = Object.assign({}, DEFAULT_INPUTS.position.pension, position.pension || {})

  const drawdown = acct => Math.abs(excelPmt(
    num(acct.rate) / 12,
    num(acct.termYears) * 12,
    -num(acct.balance),
    num(acct.endBalance),
    0
  ))

  const cashMonthlyWithdrawal = drawdown(cash) //                                 N15
  const superMonthlyWithdrawal = drawdown(superannuation) //                      N17
  const otherMonthlyWithdrawal = drawdown(otherInvestments) //                    N24
  const pensionWeeklyNet = num(pension.weekly) * (1 - num(pension.taxRate)) //     N19
  const businessNetMonthly = num(business.monthlyIncome) * (1 - tax.rate) //       J13

  // ── The twenty-year projection ─────────────────────────────────────────────
  // CORRECTION 3: every property runs from year 1. The workbook's sixth property
  // started at year 5 — see the header.
  const projected = properties.map(p => projectProperty(p))

  const sumOver = pick => Array.from({ length: YEARS }, (unused, y) =>
    projected.reduce((s, series) => s + pick(series)[y], 0))

  const grossRent = sumOver(s => s.rent) //                                        G54+G63+…
  const mortgagePayments = sumOver(s => s.mortgage) //                             row 33
  const saleProceeds = sumOver(s => s.saleProceeds) //                             row 17
  const propertyValue = sumOver(s => s.value)
  const propertyDebt = sumOver(s => s.debt)

  // Row 31 — rent is taxed at the average rate computed in year one and held flat
  // for the whole run. That is the workbook's choice, not an approximation here.
  const rentAfterTax = grossRent.map(r => r - r * tax.rate)
  const netRentalIncome = rentAfterTax.map((r, y) => r - mortgagePayments[y]) //   row 35

  // Row 4 — what the household needs, lifted by inflation each year.
  const weeklyIncomeRequired = new Array(YEARS).fill(0)
  weeklyIncomeRequired[0] = num(position.currentWeeklyIncomeRequired)
  for (let y = 1; y < YEARS; y++) {
    weeklyIncomeRequired[y] = weeklyIncomeRequired[y - 1] * (1 + inflationForYear(position.inflation, y - 1))
  }

  // Rows 22, 24, 28 — each income stream runs for its own term and then stops.
  const runsFor = (termYears, amount) => Array.from({ length: YEARS }, (unused, y) =>
    (num(termYears) >= y + 1 ? amount : 0))

  const businessIncome = runsFor(business.yearsExpected, businessNetMonthly * 12)
  const superIncome = runsFor(superannuation.termYears, superMonthlyWithdrawal * 12)
  const otherInvestmentIncome = runsFor(otherInvestments.termYears, otherMonthlyWithdrawal * 12)

  // Row 26 — CORRECTION 2: taxed, at the rate the summary sheet already applies.
  // The workbook's projection took the pension gross; the client cannot spend the
  // tax, so the projection would have overstated their income for twenty years.
  const pensionIncome = new Array(YEARS).fill(0)
  pensionIncome[0] = pension.qualifies ? pensionWeeklyNet * 52 : 0
  for (let y = 1; y < YEARS; y++) {
    pensionIncome[y] = pensionIncome[y - 1] * (1 + num(pension.cpiAdjustment))
  }

  // Row 6 — everything but rent arrives as an annual figure and is spread over
  // 52 weeks; rent arrives already net of tax and mortgage (row 36).
  const weeklyIncomeGenerated = Array.from({ length: YEARS }, (unused, y) =>
    (businessIncome[y] + superIncome[y] + pensionIncome[y] + otherInvestmentIncome[y]) / 52 +
    netRentalIncome[y] / 52)

  const weeklySurplus = weeklyIncomeGenerated.map((g, y) => g - weeklyIncomeRequired[y]) // row 8
  const annualSurplus = weeklySurplus.map(w => w * 52) //                           row 10

  // Rows 15–20 — the cash account. It opens with what the client holds, takes the
  // year's surplus or deficit, and takes the proceeds of anything sold.
  const cashOpening = new Array(YEARS).fill(0)
  const cashClosing = new Array(YEARS).fill(0)
  cashOpening[0] = num(cash.balance)
  for (let y = 0; y < YEARS; y++) {
    if (y > 0) { cashOpening[y] = cashClosing[y - 1] }
    cashClosing[y] = annualSurplus[y] + cashOpening[y] + saleProceeds[y]
  }

  // ── The verdict ────────────────────────────────────────────────────────────
  // The workbook draws no conclusion — it prints the series and leaves the
  // adviser to read them. These two are the readings an adviser takes off the
  // chart, named rather than left to the eye: whether the plan ever runs the
  // client out of cash, and how many of the twenty years fall short.
  const firstYearCashExhausted = cashClosing.findIndex(c => c < 0)
  const yearsInDeficit = annualSurplus.filter(s => s < 0).length

  return {
    country,
    taxYearLabel: taxTable.taxYearLabel,
    taxBandsEffectiveFrom: taxTable.effectiveFrom,
    workbookCorrections: WORKBOOK_CORRECTIONS,

    quickCalculator: computeQuickCalculator(given.quickCalculator),

    // Year-one readings — the workbook's summary sheet, computed across ALL
    // six properties.
    position: {
      weeklyIncomeRequired: weeklyIncomeRequired[0], //                            F4
      pensionWeeklyNet, //                                                         N19
      cashMonthlyWithdrawal, //                                                    N15 (display only)
      superMonthlyWithdrawal, //                                                   N17
      otherMonthlyWithdrawal, //                                                   N24
      businessNetMonthly, //                                                       J13
      monthlyRentalSurplus, //                                                     V41
      totalPropertyValue, //                                                       F41
      totalPropertyDebt, //                                                        H41
      totalAssets: num(cash.balance) + num(superannuation.balance) + num(otherInvestments.balance) + totalPropertyValue, // Z23
      totalDebts: totalPropertyDebt, //                                            Z24
      netWorth: num(cash.balance) + num(superannuation.balance) + num(otherInvestments.balance) + totalPropertyValue - totalPropertyDebt, // Z25
      properties: perProperty
    },

    tax: {
      client1Income: num(business.monthlyIncome) * 12 + monthlyRentalSurplus * 12 * split,
      spouseIncome: monthlyRentalSurplus * 12 * (1 - split),
      client1Tax: tax.client1Tax,
      spouseTax: tax.spouseTax,
      combinedIncome: tax.combinedIncome,
      combinedTax: tax.combinedTax,
      averageRate: tax.rate,
      monthlyTax: tax.combinedTax / 12, //                                         BM16
      weeklyTax: tax.combinedTax / 52 //                                           BM18
    },

    years: Array.from({ length: YEARS }, (unused, y) => y + 1),

    projection: {
      weeklyIncomeRequired, //     row 4      / Report AE6:AX6 (× 52)
      weeklyIncomeGenerated, //    row 6      / Report AE8:AX8 (× 52)
      weeklySurplus, //            row 8
      annualIncomeRequired: weeklyIncomeRequired.map(w => w * 52),
      annualIncomeGenerated: weeklyIncomeGenerated.map(w => w * 52),
      annualSurplus, //            row 10     / Report AE12:AX12
      businessIncome, //           row 22
      superIncome, //              row 24
      pensionIncome, //            row 26
      otherInvestmentIncome, //    row 28
      grossRent,
      rentAfterTax, //             row 31     / Report AE16:AX16
      mortgagePayments, //         row 33     / Report AE18:AX18
      netRentalIncome, //          row 35     / Report AE20:AX20
      propertyValue,
      propertyDebt,
      saleProceeds, //             row 17
      cashOpening, //              row 15
      cashClosing //               row 20
    },

    verdict: {
      cashEverExhausted: firstYearCashExhausted !== -1,
      firstYearCashExhausted: firstYearCashExhausted === -1 ? null : firstYearCashExhausted + 1,
      yearsInDeficit,
      closingCash: cashClosing[YEARS - 1]
    }
  }
}

module.exports = {
  DEFAULT_INPUTS,
  YEARS,
  MAX_PROPERTIES,
  MORTGAGE_TABLE,
  MORTGAGE_REDUCING,
  MORTGAGE_INTEREST_ONLY,
  MORTGAGE_TYPES,
  WORKBOOK_CORRECTIONS,
  excelPmt,
  excelPv,
  mortgageSchedule,
  averageTaxRate,
  projectProperty,
  computeQuickCalculator,
  computeRetirementReview
}
