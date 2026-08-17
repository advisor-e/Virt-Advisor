'use strict'

/**
 * Multiple Property Assessment — Phase 1: ONE investment property, ten years.
 *
 * A faithful port of `design/report-source-models/Multiple Property Assessment.xlsx`
 * (`INPUTS`, `MODEL` and `OUTPUTS` sheets, the first property's block) — the design
 * artefact is `design/MULTIPLE-PROPERTY-ASSESSMENT.md` and every rule below is §6 of it.
 *
 * It answers ONE question: is this rental property worth buying? It builds a ten-year
 * profit & loss, a ten-year tax position with ring-fenced losses carried forward, both
 * loans amortised, and the investment summary the four headline figures come off.
 *
 * SCOPE — Phase 1 (owner-approved 2026-08-17). Properties 2 to 5, the family home, the
 * loan apportionment table and the consolidated report are Phase 2 (`to-do.md` item
 * 4.19). Phase 1 holds all of the mathematical difficulty; 2–5 are this block repeated.
 *
 * CORRECTED FROM THE SOURCE — three, and the first is an owner ruling:
 *
 *   1. THE INTEREST-ONLY LOAN NO LONGER REPAYS ITSELF (Mike, 2026-08-17; §6 rule 9).
 *      `MODEL` row 60 is `=if(term >= year, ioLoan, 0)`, so on the sample the 350,000
 *      balance is set to ZERO in year 9 with nothing repaying it — no repayment in the
 *      cash flow, no sale, no refinance. Total debt goes 350,000 → 0 and net equity
 *      448,188 → 822,134 in one step, and TWO of the four headline figures ride on it
 *      (net equity year 10, and the return on investor funds). Mike ruled that the
 *      advisor chooses what happens instead — `endOfInterestOnly`:
 *        'convert' — it amortises over the loan's remaining term (`interestOnlyTotalTermYears`
 *                    − `interestOnlyTermYears`), interest continuing on a reducing balance.
 *        'repay'   — it is cleared by the client's own money, which is COUNTED, on the
 *                    new `capitalIntroduced` line of the investment summary. This is the
 *                    workbook's own behaviour done honestly: the fault was never the
 *                    zeroing, it was zeroing without recording where the money came from.
 *
 *   2. THE LAST RESIDUAL REPAYMENT HAD ITS SIGN FLIPPED. `MODEL` row 68 is
 *      `=IF(opening < 250, opening, -PMT(...))` — the normal branch returns the payment
 *      NEGATIVE, the residual branch returns it POSITIVE. Row 28 then negates both, so on
 *      the sample the final 112.89 of the P&I loan is ADDED to the client's cash instead
 *      of subtracted (year 8 net cash 9,002.09 where it should be 8,776.31). Corrected
 *      under the standing rule that a proven source defect is fixed, not reproduced.
 *
 *   3. YEAR 1's WEEKLY FIGURE WOULD HAVE PRINTED ZERO ON A PROFITABLE PROPERTY.
 *      `MODEL` C33 is `=IF(C31 < 0, C31/52, 0)` while D33:L33 are `=IF(x<0, x/52, x/52)`
 *      — i.e. always ÷52. Year 1 alone throws away a POSITIVE result. Latent on the
 *      sample (year 1 is negative there, so no golden value moves); corrected because a
 *      cash-positive property would report $0 a week in its first year.
 *
 * NOT CORRECTED — one open question, deliberately left as the workbook has it:
 *   - `MODEL` C46 adds back Setup Costs only (`+C19`), while the workbook's own note at
 *     `INPUTS` H46 reads "Setup Costs / Purchase Costs - Non Deductible". If the note is
 *     right, the 2,000 of purchase costs should be added back too and year 1's taxable
 *     loss is 2,000 smaller. That is a tax-treatment judgement, not an arithmetic slip,
 *     so it is reproduced exactly and raised with Mike rather than decided here.
 *
 * FIDELITY NOTES — reproduced exactly, and each would be wrong if assumed:
 *   - The management fee carries GST INSIDE the calculation: `rental × (fee% × 1.15)`.
 *     The 15% is hardcoded in `MODEL` row 14, not an input.
 *   - Rental income is net of vacancy: `rent PW × ((52 − vacancy) / 52) × 52`.
 *   - Depreciation is diminishing-value on CHATTELS ONLY, the base shrinking by the
 *     depreciation already claimed (`MODEL` row 42).
 *   - Year 1's taxable income adds Setup Costs back; no other year does (`MODEL` C46).
 *   - Tax losses RING-FENCE and carry forward: tax is payable only once cumulative net
 *     taxable income turns positive — year 10 on the sample, not year 5 where the
 *     operating profit does.
 *   - Interest deductibility phases 100/75/50/25/0 over five years on "Phasing", and
 *     years 6–10 all use the fifth entry (`MODEL` H44:L44 all point at `INPUTS` E84).
 *   - Purchase Costs and Setup Costs are year-1 only; the workbook leaves the rest blank.
 *   - Interest-rate inflation compounds by YEAR INDEX, not cumulatively: year 3's rate is
 *     `rate + (rate × inflation × 2)`, year 4 `× 3` (`MODEL` rows 64 and 72).
 *   - `MODEL` row 75 ("Expenses and depreciation") is referenced by nothing in the
 *     workbook — verified across all seven sheets — and is not ported.
 *
 * Defaults NEVER substitute silently (the R8 ruling, 2026-07-19): any input that fell
 * back to the workbook's sample value is named in the result's `defaultedInputs`.
 *
 * Class: **Decision** (`design/MODEL-CLASSIFICATION.md`) — the client's real figures,
 * typed in. No file intake, no "Illustrative" badge, nothing goes to an LLM.
 *
 * Pure, side-effect free, backend-only per the Stack Constitution.
 */

/** The projection window — `MODEL` columns C..L, "Yr1".."Yr10". */
const YEARS = 10

/**
 * Below this opening balance the loan is simply paid out rather than amortised
 * (`MODEL` row 68's `IF(opening < 250, …)`). It exists so a rounding tail of a few
 * dollars does not schedule another full year's instalment.
 */
const RESIDUAL_THRESHOLD = 250

/** GST inside the rental management fee — hardcoded in `MODEL` row 14, not an input. */
const MANAGEMENT_FEE_GST_MULTIPLIER = 1.15

/** Weeks in the workbook's year, for the weekly cash figure (`MODEL` row 33). */
const WEEKS_PER_YEAR = 52

/** What happens to the interest-only loan when its term ends — §6 rule 9. */
const END_CONVERT = 'convert'
const END_REPAY = 'repay'

/**
 * Coerce a value to a finite number (accepts JSON-string numbers), else the fallback.
 * The route receives raw JSON, so a numeric field arriving as text must not
 * string-concatenate.
 * @param {*} v
 * @param {number} fallback
 * @returns {number}
 */
function num (v, fallback) {
  if (typeof v === 'number') { return Number.isFinite(v) ? v : fallback }
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : fallback
}

/**
 * The R8 test for "the caller actually supplied this figure".
 *
 * A value that is PRESENT but unusable — `'six hundred'`, `NaN`, `Infinity`, `''` — is
 * not a supplied figure; it falls back to the sample exactly as an absent one does, so
 * it must be named in `defaultedInputs` exactly as an absent one is.
 * @param {*} v
 * @returns {boolean}
 */
function usable (v) {
  if (typeof v === 'number') { return Number.isFinite(v) }
  if (v === null || v === undefined || v === '') { return false }
  return Number.isFinite(parseFloat(v))
}

/** Guard every division: a zero denominator yields 0, never NaN/Infinity. */
function div (a, b) {
  return b ? a / b : 0
}

/**
 * Standard annuity payment (Excel `-PMT(rate, nper, pv)`), returned positive — the
 * equal annual instalment on the P&I loan (`MODEL` row 68).
 * @param {number} ratePerPeriod
 * @param {number} periods
 * @param {number} principal
 * @returns {number}
 */
function annuityPayment (ratePerPeriod, periods, principal) {
  if (!periods) { return 0 }
  if (!ratePerPeriod) { return div(principal, periods) }
  return principal * ratePerPeriod / (1 - Math.pow(1 + ratePerPeriod, -periods))
}

/**
 * The workbook's own sample scenario — every leaf INPUT on the `INPUTS` sheet for the
 * first property. Cell references are given so each can be checked by hand.
 * @type {object}
 */
const DEFAULT_INPUTS = {
  // Property (INPUTS rows 23–56)
  address: '56 Big Deal Avenue, Goldentown', //   E23
  taxRate: 0.28, //                               E27 (28%)
  purchasePrice: 649000, //                       E31 ($)
  land: 260000, //                                E34 ($)
  building: 359168, //                            E35 ($)
  chattels: 29832, //                             E36 ($ — the only depreciable part)
  rentPerWeek: 610, //                            E38 ($/week)
  vacancyWeeks: 2, //                             E56 (weeks per annum)

  // Annual costs (INPUTS rows 40–48)
  accountingFees: 1500, //                        E40 ($/yr)
  managementFeePct: 0.075, //                     E41 (7.5%, GST added inside MODEL row 14)
  insurance: 3600, //                             E42 ($/yr)
  rates: 1850, //                                 E43 ($/yr)
  bodyCorp: 1387.5, //                            E44 ($/yr)
  purchaseCosts: 2000, //                         E45 ($, year 1 only)
  setupCosts: 1500, //                            E46 ($, year 1 only)
  repairs: 500, //                                E47 ($/yr)
  other: 25, //                                   E48 ($/yr)

  // Assumptions (INPUTS rows 50–60)
  depreciationRateChattels: 0.28, //              E50 (28% diminishing value)
  rentalGrowth: 0.035, //                         E52 (3.5%/yr)
  capitalGrowth: 0.03, //                         E54 (3.0%/yr)
  expenseInflation: 0.05, //                      E58 (5.0%/yr)
  interestRateInflation: 0.001, //                E60 (0.1%, compounds by year index)

  // Funding structure (INPUTS rows 15, 65–84)
  cashDeposit: 315000, //                         E15 — Phase 1 input; see §4 of the artefact
  fundingRequired: 649000, //                     E65 ($)
  interestOnlyLoan: 350000, //                    E68 ($; the P&I loan is the remainder)
  interestOnlyTermYears: 8, //                    E71 (the interest-only PERIOD, not the loan's life)
  piTermYears: 7, //                              E72
  interestOnlyRate: 0.04, //                      E74 (4%)
  piRate: 0.04, //                                E76 (4%)
  interestDeductibility: 'Phasing', //            E78 — 'Yes' | 'No' | 'Phasing'
  phasingTable: [1, 0.75, 0.5, 0.25, 0], //       E80:E84 (yr1..yr5; yr5's entry also covers yr6–10)

  // NOT in the workbook — added by Mike's ruling of 2026-08-17 (§6 rule 9)
  endOfInterestOnly: END_CONVERT, //              'convert' | 'repay'
  interestOnlyTotalTermYears: 30 //               the loan's FULL term; 'convert' amortises the balance
  //                                              over what is left of it (30 − 8 = 22 years)
}

/**
 * The per-year interest rate series (`MODEL` rows 64 and 72).
 *
 * Year 1 is the base rate exactly; every later year adds the inflation figure multiplied
 * by the YEAR INDEX — `rate + (rate × inflation × (year − 1))`. It does NOT compound.
 *
 * @param {number} baseRate
 * @param {number} inflation
 * @param {number} years
 * @returns {number[]} length `years`, index 0 = year 1
 */
function interestRateSeries (baseRate, inflation, years) {
  const out = new Array(years)
  for (let y = 0; y < years; y++) {
    out[y] = baseRate + (baseRate * inflation * y)
  }
  return out
}

/**
 * One year of an amortising loan (`MODEL` rows 67–70).
 *
 * The residual branch fires once the opening balance drops below `RESIDUAL_THRESHOLD`:
 * the remainder is simply paid out, no interest is charged and the loan closes.
 *
 * CORRECTION 2 (see the header): the workbook returns the residual POSITIVE where the
 * normal branch is negative, so the caller ends up adding it to the client's cash. Here
 * `repayment` is always a positive magnitude and the caller always subtracts it.
 *
 * @param {number} opening
 * @param {number} payment    the scheduled instalment (positive)
 * @param {number} rate       this year's interest rate
 * @returns {{opening: number, repayment: number, interest: number, closing: number}}
 */
function amortiseYear (opening, payment, rate) {
  if (opening < RESIDUAL_THRESHOLD) {
    return { opening, repayment: opening, interest: 0, closing: 0 }
  }
  const interest = opening * rate
  return { opening, repayment: payment, interest, closing: opening - payment + interest }
}

/**
 * Build the interest-only loan's ten years.
 *
 * Years 1..`termYears` are interest-only: the balance stands still and interest is
 * charged on it (`MODEL` rows 60–62). What happens AFTER that is Mike's ruling — see
 * correction 1 in the header. Under 'repay' the balance is cleared by capital the client
 * introduces, which the caller records on the investment summary.
 *
 * @param {object} p
 * @param {number} p.loan
 * @param {number} p.termYears        the interest-only PERIOD
 * @param {number} p.totalTermYears   the loan's full life ('convert' only)
 * @param {number} p.baseRate
 * @param {number[]} p.rates          per-year rates, index 0 = year 1
 * @param {string} p.ending           END_CONVERT | END_REPAY
 * @returns {{balance: number[], interest: number[], repayment: number[], capitalIntroduced: number[]}}
 *   `balance` is the year-END balance; each array is length `YEARS`.
 */
function interestOnlySchedule (p) {
  const balance = new Array(YEARS).fill(0)
  const interest = new Array(YEARS).fill(0)
  const repayment = new Array(YEARS).fill(0)
  const capitalIntroduced = new Array(YEARS).fill(0)

  // The interest-only period itself — the balance stands still (MODEL row 60).
  for (let y = 0; y < YEARS && (y + 1) <= p.termYears; y++) {
    balance[y] = p.loan
    interest[y] = p.loan * p.rates[y]
  }

  const firstYearAfter = p.termYears // zero-based index of year `termYears + 1`
  if (firstYearAfter >= YEARS) { return { balance, interest, repayment, capitalIntroduced } }

  if (p.ending === END_REPAY) {
    // Cleared outright by the client's own money. Interest stops; the amount is carried
    // to the investment summary so the return figure counts what actually went in.
    capitalIntroduced[firstYearAfter] = p.loan
    return { balance, interest, repayment, capitalIntroduced }
  }

  // 'convert' — amortise what is left of the loan's life. A total term at or below the
  // interest-only period means the balance falls due immediately, which is one period.
  const periods = Math.max(1, p.totalTermYears - p.termYears)
  const payment = annuityPayment(p.baseRate, periods, p.loan)
  let opening = p.loan
  for (let y = firstYearAfter; y < YEARS; y++) {
    const yr = amortiseYear(opening, payment, p.rates[y])
    interest[y] = yr.interest
    repayment[y] = yr.repayment
    balance[y] = yr.closing
    opening = yr.closing
  }
  return { balance, interest, repayment, capitalIntroduced }
}

/**
 * Build the principal & interest loan's ten years (`MODEL` rows 67–72).
 *
 * The instalment is computed ONCE from the base rate and the term, exactly as the
 * workbook does (`-PMT(INPUTS!E76, INPUTS!E72, -INPUTS!E69)` is repeated unchanged in
 * every column), while each year's INTEREST uses that year's inflated rate.
 *
 * @param {object} p
 * @param {number} p.loan
 * @param {number} p.termYears
 * @param {number} p.baseRate
 * @param {number[]} p.rates
 * @returns {{opening: number[], repayment: number[], interest: number[], closing: number[]}}
 */
function principalAndInterestSchedule (p) {
  const opening = new Array(YEARS).fill(0)
  const repayment = new Array(YEARS).fill(0)
  const interest = new Array(YEARS).fill(0)
  const closing = new Array(YEARS).fill(0)

  const payment = annuityPayment(p.baseRate, p.termYears, p.loan)
  let balance = p.loan
  for (let y = 0; y < YEARS; y++) {
    const yr = amortiseYear(balance, payment, p.rates[y])
    opening[y] = yr.opening
    repayment[y] = yr.repayment
    interest[y] = yr.interest
    closing[y] = yr.closing
    balance = yr.closing
  }
  return { opening, repayment, interest, closing }
}

/**
 * Diminishing-value depreciation on chattels only (`MODEL` row 42).
 *
 * The base shrinks by everything already claimed, so it is NOT a flat percentage of the
 * original figure: year 1 is `chattels × rate`, year 2 `(chattels − year 1) × rate`, and
 * so on.
 *
 * @param {number} chattels
 * @param {number} rate
 * @returns {number[]} length `YEARS`, index 0 = year 1
 */
function chattelsDepreciation (chattels, rate) {
  const out = new Array(YEARS).fill(0)
  let claimed = 0
  for (let y = 0; y < YEARS; y++) {
    out[y] = (chattels - claimed) * rate
    claimed += out[y]
  }
  return out
}

/**
 * The share of interest added back as non-deductible, per year (`MODEL` row 44).
 *
 *   'Yes'     — all of it is deductible, so the add-back is the full tax effect.
 *   'Phasing' — the deductible share steps down through `phasingTable`; years beyond the
 *               table all use its LAST entry, exactly as `MODEL` H44:L44 all point at
 *               `INPUTS` E84.
 *   anything else ('No') — nothing is added back.
 *
 * @param {string} mode
 * @param {number[]} table
 * @param {number} year   1-based
 * @returns {number} the multiplier applied to `taxRate`
 */
function deductibilityFactor (mode, table, year) {
  const m = String(mode).toLowerCase()
  if (m === 'yes') { return 1 }
  if (m !== 'phasing') { return 0 }
  if (!table.length) { return 0 }
  const idx = Math.min(year - 1, table.length - 1)
  return num(table[idx], 0)
}

/**
 * The principal repaid on a loan in one year — the instalment less the interest already
 * charged as an expense (`MODEL` row 28).
 *
 * A year with no instalment repays no principal. Without that guard an interest-only
 * year would report a NEGATIVE repayment equal to its interest, which then flatters the
 * client's cash by that amount.
 *
 * @param {{repayment: number[], interest: number[]}} schedule
 * @param {number} y  zero-based year index
 * @returns {number}
 */
function principalRepaid (schedule, y) {
  return schedule.repayment[y] > 0 ? schedule.repayment[y] - schedule.interest[y] : 0
}

/**
 * Compute the whole Phase 1 assessment from a flat inputs object.
 *
 * @param {object} inputs  any subset of DEFAULT_INPUTS' keys; a key that is missing — or
 *                         present but unusable as a number — falls back to the workbook
 *                         sample and is named in `defaultedInputs`.
 * @returns {object} the assembled payload (see the return statement).
 */
function computeMultiplePropertyAssessment (inputs) {
  const src = (inputs && typeof inputs === 'object') ? inputs : {}
  const defaultedInputs = []

  /** Pick a numeric field, recording a fallback in `defaultedInputs` — see `usable()`. */
  const n = (key) => {
    if (!usable(src[key])) {
      defaultedInputs.push(key)
      return DEFAULT_INPUTS[key]
    }
    return num(src[key], DEFAULT_INPUTS[key])
  }
  /** Pick a text field, recording fallbacks the same way. */
  const txt = (key) => {
    if (src[key] === undefined || src[key] === null || src[key] === '') {
      defaultedInputs.push(key)
      return DEFAULT_INPUTS[key]
    }
    return String(src[key])
  }

  // ---- inputs ----
  const address = txt('address')
  const taxRate = n('taxRate')
  const purchasePrice = n('purchasePrice')
  const land = n('land')
  const building = n('building')
  const chattels = n('chattels')
  const rentPerWeek = n('rentPerWeek')
  const vacancyWeeks = n('vacancyWeeks')
  const accountingFees = n('accountingFees')
  const managementFeePct = n('managementFeePct')
  const insurance = n('insurance')
  const rates = n('rates')
  const bodyCorp = n('bodyCorp')
  const purchaseCosts = n('purchaseCosts')
  const setupCosts = n('setupCosts')
  const repairs = n('repairs')
  const other = n('other')
  const depreciationRateChattels = n('depreciationRateChattels')
  const rentalGrowth = n('rentalGrowth')
  const capitalGrowth = n('capitalGrowth')
  const expenseInflation = n('expenseInflation')
  const interestRateInflation = n('interestRateInflation')
  const cashDeposit = n('cashDeposit')
  const fundingRequired = n('fundingRequired')
  const interestOnlyLoan = n('interestOnlyLoan')
  const interestOnlyTermYears = n('interestOnlyTermYears')
  const piTermYears = n('piTermYears')
  const interestOnlyRate = n('interestOnlyRate')
  const piRate = n('piRate')
  const interestDeductibility = txt('interestDeductibility')
  const interestOnlyTotalTermYears = n('interestOnlyTotalTermYears')

  // The phasing table: an array, else the workbook's series — flagged, never silently used.
  let phasingTable = DEFAULT_INPUTS.phasingTable
  if (Array.isArray(src.phasingTable)) {
    phasingTable = src.phasingTable.map(v => num(v, 0))
  } else {
    defaultedInputs.push('phasingTable')
  }

  // What happens when the interest-only period ends (§6 rule 9). Anything that is not
  // 'repay' converts — the safer of the two, because it never clears a debt for free.
  let endOfInterestOnly = DEFAULT_INPUTS.endOfInterestOnly
  if (src.endOfInterestOnly === undefined || src.endOfInterestOnly === null || src.endOfInterestOnly === '') {
    defaultedInputs.push('endOfInterestOnly')
  } else {
    endOfInterestOnly = String(src.endOfInterestOnly).toLowerCase() === END_REPAY ? END_REPAY : END_CONVERT
  }

  // The P&I loan is what is left of the funding once the interest-only slice is taken
  // (INPUTS E69 = E65 − E68). It is derived, never typed.
  const piLoan = fundingRequired - interestOnlyLoan

  // ---- the two loans ----
  const ioRates = interestRateSeries(interestOnlyRate, interestRateInflation, YEARS)
  const piRates = interestRateSeries(piRate, interestRateInflation, YEARS)
  const io = interestOnlySchedule({
    loan: interestOnlyLoan,
    termYears: interestOnlyTermYears,
    totalTermYears: interestOnlyTotalTermYears,
    baseRate: interestOnlyRate,
    rates: ioRates,
    ending: endOfInterestOnly
  })
  const pi = principalAndInterestSchedule({
    loan: piLoan,
    termYears: piTermYears,
    baseRate: piRate,
    rates: piRates
  })

  const depreciation = chattelsDepreciation(chattels, depreciationRateChattels)

  // ---- the ten years ----
  const rental = new Array(YEARS).fill(0)
  const expenseRows = {
    accountingFees: new Array(YEARS).fill(0),
    managementFee: new Array(YEARS).fill(0),
    insurance: new Array(YEARS).fill(0),
    rates: new Array(YEARS).fill(0),
    bodyCorp: new Array(YEARS).fill(0),
    purchaseCosts: new Array(YEARS).fill(0),
    setupCosts: new Array(YEARS).fill(0),
    repairs: new Array(YEARS).fill(0),
    other: new Array(YEARS).fill(0)
  }
  const totalExpenses = new Array(YEARS).fill(0)
  const netOperatingProfit = new Array(YEARS).fill(0)
  const loanRepayments = new Array(YEARS).fill(0)
  const taxPayable = new Array(YEARS).fill(0)
  const netCashPosition = new Array(YEARS).fill(0)
  const weeklyCashPosition = new Array(YEARS).fill(0)

  const addBackDeductibleInterest = new Array(YEARS).fill(0)
  const taxableOperatingIncome = new Array(YEARS).fill(0)
  const priorYearTaxLoss = new Array(YEARS).fill(0)
  const netTaxableIncome = new Array(YEARS).fill(0)
  const lossToCarryForward = new Array(YEARS).fill(0)

  const propertyValue = new Array(YEARS).fill(0)
  const totalDebt = new Array(YEARS).fill(0)
  const netEquity = new Array(YEARS).fill(0)
  const annualCashTopUp = new Array(YEARS).fill(0)
  const cumulativeInvestorFunds = new Array(YEARS).fill(0)
  const returnOnInvestorFunds = new Array(YEARS).fill(0)

  // Rental is net of vacancy in year 1, then grows (MODEL row 10).
  rental[0] = rentPerWeek * (div(WEEKS_PER_YEAR - vacancyWeeks, WEEKS_PER_YEAR) * WEEKS_PER_YEAR)
  for (let y = 1; y < YEARS; y++) { rental[y] = rental[y - 1] * (1 + rentalGrowth) }

  for (let y = 0; y < YEARS; y++) {
    const inflator = Math.pow(1 + expenseInflation, y)

    expenseRows.accountingFees[y] = accountingFees * inflator //   MODEL row 13
    expenseRows.managementFee[y] = rental[y] * (managementFeePct * MANAGEMENT_FEE_GST_MULTIPLIER) // row 14
    expenseRows.insurance[y] = insurance * inflator //             row 15
    expenseRows.rates[y] = rates * inflator //                     row 16
    expenseRows.bodyCorp[y] = bodyCorp * inflator //               row 17
    expenseRows.purchaseCosts[y] = y === 0 ? purchaseCosts : 0 //  row 18 — year 1 only
    expenseRows.setupCosts[y] = y === 0 ? setupCosts : 0 //        row 19 — year 1 only
    expenseRows.repairs[y] = repairs * inflator //                 row 20
    expenseRows.other[y] = other * inflator //                     row 21

    totalExpenses[y] = expenseRows.accountingFees[y] + expenseRows.managementFee[y] +
      expenseRows.insurance[y] + expenseRows.rates[y] + expenseRows.bodyCorp[y] +
      expenseRows.purchaseCosts[y] + expenseRows.setupCosts[y] + expenseRows.repairs[y] +
      expenseRows.other[y] + io.interest[y] + pi.interest[y] //    row 25 = SUM(C13:C23)

    netOperatingProfit[y] = rental[y] - totalExpenses[y] //        row 26

    // ---- tax position (MODEL rows 40–54) ----
    const factor = deductibilityFactor(interestDeductibility, phasingTable, y + 1)
    addBackDeductibleInterest[y] = (io.interest[y] + pi.interest[y]) * (taxRate * factor) // row 44

    // Year 1 adds Setup Costs back because they are non-deductible; no other year does.
    // (The workbook does NOT add Purchase Costs back — see the open question in the header.)
    taxableOperatingIncome[y] = netOperatingProfit[y] - depreciation[y] -
      addBackDeductibleInterest[y] + (y === 0 ? setupCosts : 0) //  row 46

    priorYearTaxLoss[y] = y === 0 ? 0 : lossToCarryForward[y - 1] // row 48
    netTaxableIncome[y] = taxableOperatingIncome[y] + priorYearTaxLoss[y] // row 50
    taxPayable[y] = netTaxableIncome[y] > 0 ? netTaxableIncome[y] * taxRate : 0 // row 52
    lossToCarryForward[y] = netTaxableIncome[y] < 0 ? netTaxableIncome[y] : 0 //  row 54

    // ---- cash (MODEL rows 28–33) ----
    // The principal repaid on both loans: the instalment less the interest already
    // charged as an expense above (`MODEL` row 28 = −C68 − C69). A loan making no
    // repayment this year contributes NOTHING — its interest is an expense, not a
    // repayment, which is the whole point of an interest-only period. Correction 2
    // lives in `amortiseYear`.
    loanRepayments[y] = principalRepaid(pi, y) + principalRepaid(io, y) //  row 28
    netCashPosition[y] = netOperatingProfit[y] - loanRepayments[y] - taxPayable[y] //            row 31
    weeklyCashPosition[y] = div(netCashPosition[y], WEEKS_PER_YEAR) //                           row 33 (correction 3)

    // ---- investment summary (OUTPUTS rows 11–23) ----
    propertyValue[y] = y === 0 ? purchasePrice : propertyValue[y - 1] * (1 + capitalGrowth) //   row 11
    totalDebt[y] = io.balance[y] + pi.closing[y] //                                              row 13
    netEquity[y] = propertyValue[y] - totalDebt[y] //                                            row 15
    annualCashTopUp[y] = netCashPosition[y] < 0 ? -netCashPosition[y] : 0 //                      row 19
    const opening = y === 0 ? cashDeposit : cumulativeInvestorFunds[y - 1] //                     row 18 seeds row 21
    cumulativeInvestorFunds[y] = opening + annualCashTopUp[y] + io.capitalIntroduced[y] //        row 21 (+ §6 rule 9)
    returnOnInvestorFunds[y] = div(netEquity[y] - cumulativeInvestorFunds[y], cumulativeInvestorFunds[y]) // row 23
  }

  // The purchase-price split must reconcile: land + building + chattels = price
  // (INPUTS G32 = E31 − G36, which the workbook expects to be 0). The screen shows the
  // difference and will not compute while it is non-zero; the model reports it and
  // computes anyway, so the caller decides rather than the maths silently guessing.
  const splitTotal = land + building + chattels

  const last = YEARS - 1
  return {
    address,
    endOfInterestOnly, //  which ending the figures below are built on
    years: Array.from({ length: YEARS }, (_, i) => i + 1),

    headline: {
      weeklyCashPosition: weeklyCashPosition[0], //         MODEL C33 — the figure said out loud
      totalDebt: totalDebt[0], //                           OUTPUTS C13
      netEquityFinalYear: netEquity[last], //               OUTPUTS L15
      returnOnInvestorFundsFinalYear: returnOnInvestorFunds[last] // OUTPUTS L23
    },

    purchasePriceSplit: {
      land,
      building,
      chattels,
      total: splitTotal,
      difference: purchasePrice - splitTotal, //            INPUTS G32 — zero when it reconciles
      reconciles: Math.abs(purchasePrice - splitTotal) < 0.005
    },

    profitAndLoss: {
      rental,
      accountingFees: expenseRows.accountingFees,
      managementFee: expenseRows.managementFee,
      insurance: expenseRows.insurance,
      rates: expenseRows.rates,
      bodyCorp: expenseRows.bodyCorp,
      purchaseCosts: expenseRows.purchaseCosts,
      setupCosts: expenseRows.setupCosts,
      repairs: expenseRows.repairs,
      other: expenseRows.other,
      interestInterestOnly: io.interest, //                 MODEL row 22
      interestPrincipalAndInterest: pi.interest, //         MODEL row 23
      totalExpenses,
      netOperatingProfit,
      loanRepayments,
      taxPayable,
      netCashPosition,
      weeklyCashPosition
    },

    taxPosition: {
      netOperatingProfit,
      depreciation,
      addBackDeductibleInterest,
      taxableOperatingIncome,
      priorYearTaxLoss,
      netTaxableIncome,
      taxPayable,
      lossToCarryForward
    },

    loans: {
      interestOnly: {
        balance: io.balance, //                             MODEL row 60 (year-end)
        annualInterest: io.interest, //                     MODEL row 62
        repayment: io.repayment, //                         zero until the ending bites — §6 rule 9
        rate: ioRates //                                    MODEL row 64
      },
      principalAndInterest: {
        openingBalance: pi.opening, //                      MODEL row 67
        repayment: pi.repayment, //                         MODEL row 68 (positive; correction 2)
        annualInterest: pi.interest, //                     MODEL row 69
        closingBalance: pi.closing, //                      MODEL row 70
        rate: piRates //                                    MODEL row 72
      }
    },

    investmentSummary: {
      propertyValue,
      totalDebt,
      netEquity,
      cashDeposit, //                                       OUTPUTS C18 — year 1 only
      annualCashTopUp,
      capitalIntroduced: io.capitalIntroduced, //           new line — §6 rule 9
      cumulativeInvestorFunds,
      returnOnInvestorFunds,
      weeklyCashPosition
    },

    defaultedInputs
  }
}

module.exports = {
  DEFAULT_INPUTS,
  computeMultiplePropertyAssessment,
  interestRateSeries,
  interestOnlySchedule,
  principalAndInterestSchedule,
  chattelsDepreciation,
  deductibilityFactor,
  amortiseYear,
  annuityPayment,
  YEARS,
  RESIDUAL_THRESHOLD,
  END_CONVERT,
  END_REPAY
}
