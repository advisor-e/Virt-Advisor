'use strict'

/**
 * Multiple Property Assessment — a five-property rental portfolio over ten years.
 *
 * A faithful port of `design/report-source-models/Multiple Property Assessment.xlsx`
 * (`INPUTS`, `MODEL`, `OUTPUTS` and `Consolidated Report`) — the design artefact is
 * `design/MULTIPLE-PROPERTY-ASSESSMENT.md` and every rule below is §6 of it.
 *
 * TWO ENTRY POINTS, and the difference matters:
 *
 *   `computeMultiplePropertyAssessment(inputs)` — ONE property. It answers "is this
 *      rental property worth buying?" and builds a ten-year profit & loss, a ten-year
 *      tax position with ring-fenced losses carried forward, both loans amortised, and
 *      the investment summary the four headline figures come off. Its funding and its
 *      deposit are typed in. Everything from here to the Phase 2 banner is this.
 *
 *   `computeMultiplePropertyPortfolio(inputs)` — the HOUSEHOLD and up to five of them.
 *      It answers "does this portfolio work?", which is the question the workbook was
 *      built for. It adds the family home, the loan apportionment table that decides
 *      each property's mortgage, and the consolidation. It calls the function above
 *      once per property, unchanged. See the Phase 2 banner further down.
 *
 * Built in two phases (owner-approved 2026-08-17): Phase 1 the single property, Phase 2
 * the portfolio (`to-do.md` item 4.19, closed 2026-08-20). Phase 1 held all of the
 * mathematical difficulty; properties 2–5 are its block repeated.
 *
 * CORRECTED FROM THE SOURCE — five in all. Three are here and the first is an owner
 * ruling; corrections 4 and 5 are both in the apportionment table and are documented at
 * the Phase 2 banner.
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
 * FOUR NEW ZEALAND RULES ARE SETTINGS, NOT ASSUMPTIONS (Mike, 2026-08-17; §6 rule 10).
 * Asked whether the year-1 cost add-back could be configurable — "can this be made a
 * variable input to allow for different tax treatements around the world?" — he extended
 * it to all four rules the workbook had baked into its formulas:
 *
 *   `yearOneAddBack`     which year-1 costs are non-deductible   (`MODEL` C46)
 *   `managementFeeGstRate`  the GST inside the management fee    (`MODEL` row 14)
 *   `depreciableAssets` + `depreciationMethod`  what may be depreciated, and how
 *                                                                (`MODEL` row 42)
 *   `lossTreatment`      ring-fenced, or offset against other income (`MODEL` rows 48–54)
 *
 * 🔴 EVERY DEFAULT REPRODUCES THE WORKBOOK EXACTLY, so a firm that changes nothing sees
 * what it saw before and the golden values are untouched. The GST one is why this could
 * not stay as it was: an advisor reading "7.5%" on screen had no way to know the model
 * charged 8.625%, because the 1.15 lived inside the formula.
 *
 * ⚠ `lossTreatment: 'offset'` is the one with teeth. Ring-fenced holds a loss until the
 * property itself makes money; offset reduces the client's OTHER income in the same year,
 * so `taxPayable` goes NEGATIVE — a refund — and the cash flow improves immediately
 * (about 6,881 in year 1 on the sample). It is standard, and it is wrong for New Zealand.
 *
 * NOT CORRECTED — one open question, deliberately left as the workbook has it:
 *   - `MODEL` C46 adds back Setup Costs only (`+C19`), while the workbook's own note at
 *     `INPUTS` H46 reads "Setup Costs / Purchase Costs - Non Deductible". If the note is
 *     right, the 2,000 of purchase costs should be added back too and year 1's taxable
 *     loss is 2,000 smaller. That is a tax-treatment judgement, not an arithmetic slip,
 *     so it is reproduced exactly and raised with Mike rather than decided here.
 *     ⚠ His ruling turned it into `yearOneAddBack`, so the model no longer DEPENDS on the
 *     answer — but the answer still decides what the New Zealand default should be.
 *
 * FIDELITY NOTES — reproduced exactly, and each would be wrong if assumed:
 *   - The management fee carries GST INSIDE the calculation: `rental × (fee% × 1.15)`.
 *     The 15% is hardcoded in `MODEL` row 14, not an input.
 *   - Rental income is net of vacancy: `rent PW × ((52 − vacancy) / 52) × 52`.
 *   - Depreciation is diminishing-value on CHATTELS ONLY, the base shrinking by the
 *     depreciation already claimed (`MODEL` row 42) — now the DEFAULT of a setting.
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

/** Weeks in the workbook's year, for the weekly cash figure (`MODEL` row 33). */
const WEEKS_PER_YEAR = 52

/** What happens to the interest-only loan when its term ends — §6 rule 9. */
const END_CONVERT = 'convert'
const END_REPAY = 'repay'

/** Which year-1 costs are non-deductible and added back — §6 rule 10. */
const ADD_BACK_SETUP = 'setup' //                       the workbook's own behaviour
const ADD_BACK_SETUP_AND_PURCHASE = 'setupAndPurchase' // what its note at INPUTS H46 says
const ADD_BACK_NONE = 'none'

/** What may be depreciated — §6 rule 10. New Zealand allows chattels only. */
const DEPRECIABLE_CHATTELS = 'chattels'
const DEPRECIABLE_CHATTELS_AND_BUILDING = 'chattelsAndBuilding'

/** How it is depreciated — §6 rule 10. */
const METHOD_DIMINISHING_VALUE = 'dv'
const METHOD_STRAIGHT_LINE = 'sl'

/**
 * What happens to a rental loss — §6 rule 10.
 *
 * `ringFenced` holds it against the property's own future income (New Zealand, and the
 * workbook). `offset` sets it against the client's other income in the same year, so tax
 * payable goes negative — a refund — and no loss is carried forward.
 */
const LOSSES_RING_FENCED = 'ringFenced'
const LOSSES_OFFSET = 'offset'

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

  // Assumptions (INPUTS rows 52–60)
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
  // Tax rules — §6 rule 10. NOT fields in the workbook: these were assumptions inside its
  // formulas. Every default below reproduces it exactly.
  yearOneAddBack: ADD_BACK_SETUP, //              MODEL C46 adds back Setup Costs only
  managementFeeGstRate: 0.15, //                  the 1.15 hardcoded inside MODEL row 14
  depreciableAssets: DEPRECIABLE_CHATTELS, //     MODEL row 42 — chattels, never the building
  depreciationMethod: METHOD_DIMINISHING_VALUE, // MODEL row 42
  depreciationRateChattels: 0.28, //              E50 (28%)
  buildingDepreciationRate: 0, //                 no such rate exists in the workbook, and
  //                                              there is no honest default — it differs by
  //                                              country. Zero means "none", and the screen
  //                                              shows the field so it cannot be missed.
  lossTreatment: LOSSES_RING_FENCED, //           MODEL rows 48–54
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
 * Depreciate one asset over the ten years.
 *
 *   Diminishing value — the base shrinks by everything already claimed, so it is NOT a
 *   flat percentage of the original figure: year 1 is `cost × rate`, year 2
 *   `(cost − year 1) × rate`. It never reaches zero, which is why no cap is needed.
 *
 *   Straight line — a flat `cost × rate` every year, STOPPED once the asset is fully
 *   written down. The stop is ours: a flat charge run past the asset's life would claim
 *   more than the asset ever cost (28% × 10 years = 280% of the chattels), which no tax
 *   authority allows and which the workbook never has to face, having only ever done
 *   diminishing value.
 *
 * @param {number} cost
 * @param {number} rate
 * @param {string} method  METHOD_DIMINISHING_VALUE | METHOD_STRAIGHT_LINE
 * @returns {number[]} length `YEARS`, index 0 = year 1
 */
function depreciateAsset (cost, rate, method) {
  const out = new Array(YEARS).fill(0)
  if (!(cost > 0)) { return out }
  let claimed = 0
  for (let y = 0; y < YEARS; y++) {
    const charge = method === METHOD_STRAIGHT_LINE
      ? Math.min(cost * rate, cost - claimed) //  flat, and it stops when nothing is left
      : (cost - claimed) * rate //                diminishing value
    // The clamp does two jobs: it stops straight line once the asset is written off, and
    // it stops a zero or negative rate ever ADDING value back as a negative expense —
    // which would raise taxable income and invent a tax bill. It is the only guard the
    // rate needs; an `if (rate > 0)` above it would be dead code.
    out[y] = charge > 0 ? charge : 0
    claimed += out[y]
  }
  return out
}

/**
 * The whole depreciation expense, per year (`MODEL` row 42) — §6 rule 10.
 *
 * New Zealand allows chattels only, which is the workbook's own behaviour and the
 * default. Where the building may be depreciated too, both are charged and added.
 *
 * @param {object} p
 * @param {number} p.chattels
 * @param {number} p.building
 * @param {number} p.chattelsRate
 * @param {number} p.buildingRate
 * @param {string} p.assets   DEPRECIABLE_CHATTELS | DEPRECIABLE_CHATTELS_AND_BUILDING
 * @param {string} p.method
 * @returns {number[]} length `YEARS`, index 0 = year 1
 */
function depreciationSchedule (p) {
  const chattels = depreciateAsset(p.chattels, p.chattelsRate, p.method)
  if (p.assets !== DEPRECIABLE_CHATTELS_AND_BUILDING) { return chattels }
  const building = depreciateAsset(p.building, p.buildingRate, p.method)
  return chattels.map((v, i) => v + building[i])
}

/**
 * Diminishing-value depreciation on chattels only — the New Zealand case, and what the
 * workbook does. Kept as a named entry point because it is the default everything else
 * is measured against.
 *
 * @param {number} chattels
 * @param {number} rate
 * @returns {number[]} length `YEARS`, index 0 = year 1
 */
function chattelsDepreciation (chattels, rate) {
  return depreciateAsset(chattels, rate, METHOD_DIMINISHING_VALUE)
}

/**
 * The year-1 costs that are non-deductible and so added back to taxable income
 * (`MODEL` C46's `+C19`) — §6 rule 10.
 *
 * @param {string} mode  ADD_BACK_SETUP | ADD_BACK_SETUP_AND_PURCHASE | ADD_BACK_NONE
 * @param {number} setupCosts
 * @param {number} purchaseCosts
 * @returns {number}
 */
function yearOneAddBackAmount (mode, setupCosts, purchaseCosts) {
  if (mode === ADD_BACK_NONE) { return 0 }
  if (mode === ADD_BACK_SETUP_AND_PURCHASE) { return setupCosts + purchaseCosts }
  return setupCosts
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
  /**
   * Pick a setting from a fixed list of allowed values, case-insensitively.
   *
   * A value that is missing OR unrecognised falls back to the default AND is named in
   * `defaultedInputs` — the R8 ruling applied to settings. A mistyped `'ringfence'` must
   * never quietly become New Zealand's rules without saying so.
   */
  const pick = (key, allowed) => {
    const want = (src[key] === undefined || src[key] === null) ? '' : String(src[key]).toLowerCase()
    for (let i = 0; i < allowed.length; i++) {
      if (allowed[i].toLowerCase() === want) { return allowed[i] }
    }
    defaultedInputs.push(key)
    return DEFAULT_INPUTS[key]
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

  // ---- the four tax rules (§6 rule 10) — every default is the workbook's behaviour ----
  const yearOneAddBack = pick('yearOneAddBack',
    [ADD_BACK_SETUP, ADD_BACK_SETUP_AND_PURCHASE, ADD_BACK_NONE])
  const managementFeeGstRate = n('managementFeeGstRate')
  const depreciableAssets = pick('depreciableAssets',
    [DEPRECIABLE_CHATTELS, DEPRECIABLE_CHATTELS_AND_BUILDING])
  const depreciationMethod = pick('depreciationMethod',
    [METHOD_DIMINISHING_VALUE, METHOD_STRAIGHT_LINE])
  const depreciationRateChattels = n('depreciationRateChattels')
  const buildingDepreciationRate = n('buildingDepreciationRate')
  const lossTreatment = pick('lossTreatment', [LOSSES_RING_FENCED, LOSSES_OFFSET])

  // The phasing table: an array, else the workbook's series — flagged, never silently used.
  let phasingTable = DEFAULT_INPUTS.phasingTable
  if (Array.isArray(src.phasingTable)) {
    phasingTable = src.phasingTable.map(v => num(v, 0))
  } else {
    defaultedInputs.push('phasingTable')
  }

  // What happens when the interest-only period ends (§6 rule 9). Missing or unrecognised
  // converts — the safer of the two, because it never clears a debt for free.
  const endOfInterestOnly = pick('endOfInterestOnly', [END_CONVERT, END_REPAY])

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

  const depreciation = depreciationSchedule({
    chattels,
    building,
    chattelsRate: depreciationRateChattels,
    buildingRate: buildingDepreciationRate,
    assets: depreciableAssets,
    method: depreciationMethod
  })

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
    expenseRows.managementFee[y] = rental[y] * (managementFeePct * (1 + managementFeeGstRate)) // row 14
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

    // Year 1 adds its non-deductible costs back; no other year does. Which costs those
    // are is a setting — the workbook's own answer, Setup Costs only, is the default.
    taxableOperatingIncome[y] = netOperatingProfit[y] - depreciation[y] -
      addBackDeductibleInterest[y] +
      (y === 0 ? yearOneAddBackAmount(yearOneAddBack, setupCosts, purchaseCosts) : 0) // row 46

    if (lossTreatment === LOSSES_OFFSET) {
      // The loss goes against the client's OTHER income in the same year, so nothing is
      // carried forward and tax payable goes NEGATIVE — a refund, which the cash flow
      // picks up immediately. Rows 48 and 54 have nothing to hold.
      priorYearTaxLoss[y] = 0
      netTaxableIncome[y] = taxableOperatingIncome[y]
      taxPayable[y] = netTaxableIncome[y] * taxRate
      lossToCarryForward[y] = 0
    } else {
      // Ring-fenced (New Zealand, and the workbook): the loss waits for the property's
      // own future income, so no tax is payable until the cumulative position turns.
      priorYearTaxLoss[y] = y === 0 ? 0 : lossToCarryForward[y - 1] //             row 48
      netTaxableIncome[y] = taxableOperatingIncome[y] + priorYearTaxLoss[y] //     row 50
      taxPayable[y] = netTaxableIncome[y] > 0 ? netTaxableIncome[y] * taxRate : 0 // row 52
      lossToCarryForward[y] = netTaxableIncome[y] < 0 ? netTaxableIncome[y] : 0 //  row 54
    }

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

    // The tax rules these figures were built on, so the screen can state them rather than
    // leave a reader to assume New Zealand — §6 rule 10.
    taxRules: {
      yearOneAddBack,
      managementFeeGstRate,
      // What the fee ACTUALLY costs: 7.5% with 15% GST is 8.625%. Computed here rather
      // than in the component, and shown, because its invisibility was the whole problem.
      effectiveManagementFeePct: managementFeePct * (1 + managementFeeGstRate),
      depreciableAssets,
      depreciationMethod,
      depreciationRateChattels,
      buildingDepreciationRate,
      lossTreatment
    },

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

/* ========================================================================== *
 * PHASE 2 — the household, the loan apportionment table, and the consolidation
 *
 * `INPUTS` rows 3–17 (the apportionment table), the four remaining property blocks
 * (rows 89, 155, 221 and 287 — the same block at a 66-row pitch), and the
 * `Consolidated Report` sheet. Item 4.19; the artefact is `design/MULTIPLE-PROPERTY-
 * ASSESSMENT.md` §1–§2.
 *
 * The apportionment table is NOT a display. `INPUTS` E65 — property 1's Funding
 * Required — is literally `=L15`, and E131, E197, E263 and E329 are `=M15`, `=N15`,
 * `=O15` and `=P15`. That table decides every property's mortgage. The consolidation,
 * by contrast, adds up lines the per-property model already returns and introduces no
 * arithmetic of its own (`Consolidated Report` C11 = `MODEL!C10+C87+C164+C241+C318`).
 *
 * TWO MORE SOURCE CORRECTIONS, both owner-approved 2026-08-20, and both in the table:
 *
 *   4. THE FIRST INVESTMENT WAS CHARGED FOR A LOAN IT DID NOT NEED. Row 15 ("Loan
 *      Apportioned") is `req'd funding × tax apportionment %` in the residence's own
 *      column (`K15 = K11*K13`) but `VALUE × %` in Invest 1's (`L15 = L9*L13`), so
 *      property 1 borrows the full 649,000 purchase price and the 90,000 of savings
 *      available to it is ignored. Invest 2–5's cells are hardcoded constants that
 *      happen to equal both readings on the sample, so `L15` is the only cell that
 *      distinguishes them.
 *      PROOF — the workbook's own check cell R17 ("Balance of Loans to Apportion",
 *      `=R11-R15`). Read as row 11 × row 13, R17 lands on EXACTLY the non-deductible
 *      share of the home loan every time: 90,000 = 225,000 × 40% on the sample, and
 *      120,000 = 300,000 × 40% when the home mortgage is raised to 300,000. Read as
 *      written it gives 0 and then 105,000 — and the 0 that makes the sheet look
 *      reconciled is a coincidence of the sample figures, `L7` happening to equal
 *      `K11 × 40%`. Here EVERY column uses row 11 × row 13.
 *
 *   5. THE DEPOSIT WAS COUNTED TWICE. `OUTPUTS` C18 hands property 1 the WHOLE savings
 *      pool (`INPUTS!E15`, 315,000) while C100 hands property 2 `INPUTS!L7` (90,000) —
 *      but L7 is the part of that same 315,000 left after the residence. The
 *      `Consolidated Report` therefore reports 405,000 of investor cash for a household
 *      holding 315,000 (C29), and that flows through Cumulative Investor Funds (C32)
 *      into the Projected Return on Investor Funds headline (C34). The columns are off
 *      by one as well: property 2 reads Invest 1's balance, property 3 reads Invest 2's.
 *      Here a property's deposit is the money ACTUALLY put into it, the pool is spent
 *      once, and the two identities below are enforced rather than hoped for.
 *
 * 🔴 THE DEPOSIT IS CHOSEN, NOT IMPOSED (Mike, 2026-08-20). Asked whether the home
 * mortgage should reduce the money available for rentals, he ruled that the real answer
 * is neither: *"if there is an option for a family to 'hold-back' some of their cash
 * deposit then that's fine but the remaining math still has to work — I think the sheet
 * was trying to provide the option as to how much got used on this property but still
 * met equity lending and servicing requirements."*
 *
 * He is right that the sheet was reaching for it. `M15:P15` — the apportioned loans for
 * properties 2 to 5 — are not formulas at all but HAND-TYPED constants: somebody was
 * overriding that row by hand, which is this option done manually and unrecorded.
 *
 * So `depositApplied` is now an optional per-property input. Omit it and the property
 * takes what is left of the pool, in order, exactly as before; supply it and the family
 * holds the rest back. Whatever they choose, TWO IDENTITIES HOLD, and the golden test
 * fails the build if either is ever broken:
 *
 *     requiredFunding + depositApplied === purchasePrice     (for every property)
 *     Σ depositApplied <= totalSavings                       (across the portfolio)
 *
 * ⚠ AND THE HOME MORTGAGE NO LONGER EATS THE POOL. `L7 = R3 − K11` subtracted the home
 * MORTGAGE from the savings, so a 225,000 mortgage consumed 225,000 of a 315,000 deposit
 * and only 90,000 ever reached the investments — while `INPUTS` B15 calls that very
 * figure "Total Savings for (Combined) Investment Property's Deposit". With the deposit
 * chosen there is nothing left for that subtraction to express: a family who wants to
 * keep 225,000 back now says so. The mortgage stays in the table for the tax
 * apportionment (K13) and the LVR, where it belongs. The workbook's own allocation is
 * still reachable — pass `depositApplied: 90000` on property 1 — and the golden test
 * does exactly that to keep the sheet's row 11 as an anchor.
 * ⚠ This also retires a guard the previous revision needed: `L7` was the only cell of
 * row 7 without the floor its neighbours carry, so a mortgage larger than the savings
 * drove the balance NEGATIVE and charged property 1 more than the house cost. Nothing
 * subtracts from the pool now, so it cannot go negative in the first place.
 *
 * THE LENDING TEST THE WORKBOOK NEVER RAN. It computes an LVR at `R5` (`=R11/R9`) and
 * then NOTHING READS IT — verified across all seven sheets: no formula references that
 * cell, there is no ceiling to compare it against, and no conditional formatting marks
 * it. Here `maxLvr` is an input, both LVRs are reported — all-in as `R5` has it, and
 * investments-only, which is what an investor's lender actually tests — and a breach is
 * named in `warnings` rather than left for a reader to spot.
 *
 * ⚠ SERVICING IS SHOWN, NOT TESTED, AND THE DIFFERENCE IS DELIBERATE. `consolidated.
 * servicing` reports what the portfolio DEMANDS of the family each year — the cash
 * top-up it cannot fund itself, plus any capital introduced under the 'repay' ending.
 * It does not say whether they can afford it, because the workbook collects no income
 * and no living costs on any sheet. An income box invented here would produce a
 * serviceability verdict that nothing had earned.
 *
 * NOT PORTED — `Import Range` and `Imported Report`. They are a Google Sheets
 * `IMPORTRANGE()` workaround for combining a SECOND copy of the workbook when a client
 * holds more than five properties, and `Imported Report` is a byte-for-byte copy of
 * `Consolidated Report` with a note saying its cells still need linking by hand. The
 * mechanism has no meaning outside a spreadsheet.
 * ========================================================================== */

/** The apportionment table holds five investments — `INPUTS` columns L..P. */
const MAX_PROPERTIES = 5

/**
 * The household — `INPUTS` rows 11–15, and the residence's column of the table.
 * @type {object}
 */
const DEFAULT_HOUSEHOLD = {
  residenceValue: 1400000, //           E11 — Value of Residential Home (if owned)
  homeMortgage: 225000, //              E13 — Home Mortgage (if any)
  totalSavings: 315000, //              E15 — Total Savings for (Combined) Investment
  //                                          Property's Deposit; R3 of the table
  residenceTaxApportionmentPct: 0.6, // K13 — the deductible share of the home loan
  // 🔴 DELIBERATELY UNSET, and it is the only field here that is. The workbook has no
  // ceiling anywhere (see the banner), so any figure shipped as a default would be a
  // lending policy nobody chose — and it would arrive wearing the authority of a
  // calculated result. `null` means the LVRs are still computed and shown but nothing
  // is judged, until a mentor sets the real number and it cascades to everyone
  // (`data/property-tax-rules.json`, Mike's ruling of 2026-08-20: "it needs to be an
  // editable input").
  maxLvr: null
}

/**
 * The workbook's own five properties, as OVERRIDES on `DEFAULT_INPUTS`.
 *
 * Properties 2–5 are the same block at a 66-row pitch (`INPUTS` 89, 155, 221, 287), and
 * only the fields that genuinely differ are listed — property 3, for instance, is
 * property 1 with a different address and a six-year P&I term. Listing the differences
 * rather than five near-identical copies is what makes a wrong figure visible.
 *
 * 🔴 `fundingRequired` and `cashDeposit` are ABSENT from every entry by design. In a
 * portfolio the apportionment table decides both, and `computeMultiplePropertyPortfolio`
 * supplies them. They stay typed inputs on the single-property model, which has no
 * table to read them from.
 * @type {object[]}
 */
const PROPERTY_OVERRIDES = [
  {}, // Property 1 IS `DEFAULT_INPUTS` — INPUTS rows 23–84.
  { // Property 2 — INPUTS rows 89–150
    address: '51 Someday Street, Sometown', //  C89
    purchasePrice: 515000, //                   E97
    land: 189312, //                            E100
    building: 301568, //                        E101
    chattels: 24120, //                         E102
    rentPerWeek: 485, //                        E104
    insurance: 2500, //                         E108
    rates: 1250, //                             E109
    interestOnlyTermYears: 9 //                 E137 (the P&I term, E138, is 7 as property 1)
  },
  { // Property 3 — INPUTS rows 155–216. Property 1 but for the address and the P&I term.
    address: '35 Average Deal Avenue, Goldentown', // C155
    piTermYears: 6 //                                 E204
  },
  { // Property 4 — INPUTS rows 221–282
    address: '55 Small Deal Avenue, Goldentown', // C221
    purchasePrice: 864000, //                       E229
    land: 390557, //                                E232
    building: 423568, //                            E233
    chattels: 49875, //                             E234
    rentPerWeek: 645, //                            E236
    managementFeePct: 0.0725, //                    E239
    insurance: 4800, //                             E240
    bodyCorp: 1425, //                              E242
    interestOnlyTermYears: 9, //                    E269
    piTermYears: 9 //                               E270
  },
  { // Property 5 — INPUTS rows 287–348
    address: '45 Rock n Roll Ave, Swingtown', // C287
    purchasePrice: 785000, //                    E295
    land: 395000, //                             E298
    building: 360158, //                         E299
    chattels: 29842, //                          E300
    rentPerWeek: 645, //                         E302
    managementFeePct: 0.06, //                   E305
    interestOnlyTermYears: 4, //                 E335
    piTermYears: 5, //                           E336
    interestOnlyRate: 0.03 //                    E338 — the only property not on 4%
  }
]

/**
 * The five properties as whole input objects, each one `DEFAULT_INPUTS` with its own
 * overrides applied. Rebuilt on every call so a caller cannot mutate the defaults.
 * @returns {object[]} five property input objects, without funding or deposit
 */
function defaultProperties () {
  return PROPERTY_OVERRIDES.map(function (overrides) {
    const p = Object.assign({}, DEFAULT_INPUTS, overrides)
    // Both are decided by the table — see PROPERTY_OVERRIDES.
    delete p.fundingRequired
    delete p.cashDeposit
    return p
  })
}

/**
 * The loan apportionment table — `INPUTS` rows 3–17, with the deposit chosen rather
 * than imposed and the lending test the workbook never ran.
 *
 * It walks the row once: residence, then Invest 1..5. Each property in turn either
 * takes the deposit the family chose for it or, if none was chosen, whatever is left of
 * the pool — so the money is spent once, in order, and whatever is not spent is held
 * back and reported. Corrections 4 and 5 both live here.
 *
 * Nothing is ever clamped silently: a deposit bigger than the pool or bigger than the
 * house is reduced to fit AND named in `warnings`.
 *
 * @param {object} input
 * @param {number} input.residenceValue - `E11`/`K9`
 * @param {number} input.homeMortgage - `E13`/`K11`; given, never derived
 * @param {number} input.totalSavings - `E15`/`R3`, the combined deposit pool
 * @param {number} input.residenceTaxApportionmentPct - `K13`, the home loan's deductible share
 * @param {number} [input.maxLvr] - the highest loan-to-value the lender will go to; not
 *   the workbook's, which has no ceiling. Omitted or unusable means no test is run.
 * @param {object[]} input.properties - in order:
 *   `[{ purchasePrice, taxApportionmentPct, depositApplied }]`, the last optional
 * @returns {object} `residence`, `properties[]`, `totals`, both LVRs, `depositHeldBack`
 *   and `warnings`
 */
function apportionLoans (input) {
  const src = (input && typeof input === 'object') ? input : {}
  const totalSavings = num(src.totalSavings, DEFAULT_HOUSEHOLD.totalSavings)
  const residenceValue = num(src.residenceValue, DEFAULT_HOUSEHOLD.residenceValue)
  const homeMortgage = num(src.homeMortgage, DEFAULT_HOUSEHOLD.homeMortgage)
  const residencePct = usable(src.residenceTaxApportionmentPct)
    ? num(src.residenceTaxApportionmentPct, DEFAULT_HOUSEHOLD.residenceTaxApportionmentPct)
    : DEFAULT_HOUSEHOLD.residenceTaxApportionmentPct
  // No ceiling means no test — never a default ceiling smuggled in as a pass.
  const maxLvr = usable(src.maxLvr) ? num(src.maxLvr, 0) : null
  const list = Array.isArray(src.properties) ? src.properties : []
  const warnings = []

  const residence = {
    value: residenceValue, //                        K9
    requiredFunding: homeMortgage, //                K11 — the mortgage as it stands
    taxApportionmentPct: residencePct, //            K13
    loanApportioned: homeMortgage * residencePct, // K15 = K11 × K13
    lvr: div(homeMortgage, residenceValue)
  }

  // The pool is spent, never reduced by anything else — see the banner. It starts whole
  // and each property takes from it in turn.
  let pool = totalSavings
  const properties = []
  for (let i = 0; i < list.length; i++) {
    const p = (list[i] && typeof list[i] === 'object') ? list[i] : {}
    const value = num(p.purchasePrice, 0)
    const pct = usable(p.taxApportionmentPct) ? num(p.taxApportionmentPct, 1) : 1
    const available = pool //                        what row 7 was reaching for
    // The most this property could absorb: it cannot swallow more than the pool holds,
    // and it cannot put down more than the house costs.
    const ceiling = Math.min(available, value)

    const chose = usable(p.depositApplied)
    let depositApplied
    if (chose) {
      const wanted = num(p.depositApplied, 0)
      depositApplied = Math.min(Math.max(wanted, 0), ceiling)
      if (wanted > value) {
        warnings.push({
          code: 'DEPOSIT_EXCEEDS_PRICE', property: i + 1, wanted, applied: depositApplied, purchasePrice: value
        })
      } else if (wanted > available) {
        warnings.push({
          code: 'DEPOSIT_EXCEEDS_SAVINGS', property: i + 1, wanted, applied: depositApplied, available
        })
      } else if (wanted < 0) {
        warnings.push({ code: 'DEPOSIT_NEGATIVE', property: i + 1, wanted, applied: depositApplied })
      }
    } else {
      // Nothing chosen: take what is there, in order, exactly as the table did.
      depositApplied = ceiling
    }
    pool -= depositApplied

    // Identity 1, and it holds by construction rather than by hope.
    const requiredFunding = value - depositApplied //  L11..P11
    const lvr = div(requiredFunding, value)
    const lvrBreach = maxLvr !== null && lvr > maxLvr
    if (lvrBreach) {
      warnings.push({ code: 'LVR_EXCEEDED', property: i + 1, lvr, maxLvr })
    }

    properties.push({
      value, //                                      L9..P9
      depositAvailable: available, //                 what row 7 meant to say
      depositApplied,
      depositChosen: chose, //                       did the family set this, or did it fall out?
      requiredFunding,
      taxApportionmentPct: pct, //                   L13..P13
      // Correction 4: row 11 × row 13, as the residence's own column already does.
      loanApportioned: requiredFunding * pct, //     L15..P15
      lvr,
      lvrBreach
    })
  }

  const sum = function (key) {
    return properties.reduce(function (a, p) { return a + p[key] }, 0)
  }
  const investmentValue = sum('value')
  const investmentRequiredFunding = sum('requiredFunding')
  const totalValue = residenceValue + investmentValue //                    R9
  const totalRequiredFunding = homeMortgage + investmentRequiredFunding //  R11
  const totalLoanApportioned = residence.loanApportioned + sum('loanApportioned') // R15

  const lvr = div(totalRequiredFunding, totalValue) //                      R5 = R11/R9
  // What an investor's lender actually tests: the rentals on their own, with the family
  // home and its mortgage left out of both halves of the fraction.
  const investmentLvr = div(investmentRequiredFunding, investmentValue)
  const lvrBreach = maxLvr !== null && lvr > maxLvr
  const investmentLvrBreach = maxLvr !== null && investmentLvr > maxLvr
  if (lvrBreach) { warnings.push({ code: 'PORTFOLIO_LVR_EXCEEDED', lvr, maxLvr }) }
  if (investmentLvrBreach) {
    warnings.push({ code: 'INVESTMENT_LVR_EXCEEDED', lvr: investmentLvr, maxLvr })
  }

  return {
    totalSavings, //                                                        R3
    // Identity 2: what the family kept. Never negative — the pool cannot be overspent.
    depositHeldBack: pool,
    maxLvr,
    residence,
    properties,
    totals: {
      value: totalValue, //                                                 R9
      requiredFunding: totalRequiredFunding, //                             R11
      loanApportioned: totalLoanApportioned, //                             R15
      // R17. Under correction 4 this is always the residence's NON-deductible share —
      // the part of the home loan that is not apportioned to the investments.
      balanceToApportion: totalRequiredFunding - totalLoanApportioned,
      depositApplied: sum('depositApplied'),
      investmentValue,
      investmentRequiredFunding
    },
    lvr,
    lvrBreach,
    investmentLvr,
    investmentLvrBreach,
    warnings
  }
}

/**
 * The whole portfolio: the household, up to five properties, and the consolidation.
 *
 * Each property is run through `computeMultiplePropertyAssessment` UNCHANGED — the
 * per-property maths is Phase 1's, already golden-tested — with only its funding and
 * its deposit supplied from the apportionment table, exactly as `INPUTS` E65 reads
 * `=L15` and `OUTPUTS` C18 reads a deposit it did not calculate itself.
 *
 * @param {object} inputs
 * @param {object} inputs.household - `residenceValue`, `homeMortgage`, `totalSavings`,
 *   `residenceTaxApportionmentPct`, `maxLvr`
 * @param {object[]} inputs.properties - up to five per-property input objects; each may
 *   also carry a `taxApportionmentPct` (default 1 — an investment loan is fully
 *   deductible) and a `depositApplied` (omit it and the property simply takes what is
 *   left of the pool; supply it and the family holds the rest back)
 * @returns {object} `household`, `apportionment`, `properties[]`, `consolidated`
 *   (including `servicing`), `headline`, `warnings` and `defaultedInputs`
 */
function computeMultiplePropertyPortfolio (inputs) {
  const src = (inputs && typeof inputs === 'object') ? inputs : {}
  const defaultedInputs = []

  const hSrc = (src.household && typeof src.household === 'object') ? src.household : {}
  const h = {}
  Object.keys(DEFAULT_HOUSEHOLD).forEach(function (key) {
    if (!usable(hSrc[key])) {
      defaultedInputs.push('household.' + key)
      h[key] = DEFAULT_HOUSEHOLD[key]
    } else {
      h[key] = num(hSrc[key], DEFAULT_HOUSEHOLD[key])
    }
  })

  let list = src.properties
  if (!Array.isArray(list) || !list.length) {
    defaultedInputs.push('properties')
    list = defaultProperties()
  }

  // The apportionment must price each property at the SAME purchase price the
  // per-property model will use, so the fallback is resolved once, here, rather than
  // twice with two chances to disagree.
  const resolvedPrice = list.map(function (p) {
    const v = (p && typeof p === 'object') ? p.purchasePrice : undefined
    return usable(v) ? num(v, DEFAULT_INPUTS.purchasePrice) : DEFAULT_INPUTS.purchasePrice
  })

  const apportionment = apportionLoans({
    residenceValue: h.residenceValue,
    homeMortgage: h.homeMortgage,
    totalSavings: h.totalSavings,
    residenceTaxApportionmentPct: h.residenceTaxApportionmentPct,
    maxLvr: h.maxLvr,
    properties: list.map(function (p, i) {
      const o = (p && typeof p === 'object') ? p : {}
      return {
        purchasePrice: resolvedPrice[i],
        taxApportionmentPct: o.taxApportionmentPct,
        depositApplied: o.depositApplied //  the hold-back, if the family chose one
      }
    })
  })

  // The table's own findings travel with the portfolio's — one list for the screen to
  // read, so a deposit that was quietly reduced cannot be lost between two of them.
  const warnings = apportionment.warnings.slice()
  const properties = list.map(function (p, i) {
    const slot = apportionment.properties[i]
    const o = (p && typeof p === 'object') ? p : {}

    // IDENTITY 3 — the two loans always sum to the funding required, because `INPUTS`
    // E69 is `=E65−E68` and nothing may break that. Once a deposit reduces the funding,
    // a typed interest-only slice can exceed the whole loan: the workbook's own sample
    // types 350,000 against a property that, with the deposit applied, needs only
    // 334,000. Capped so the P&I loan cannot go NEGATIVE and every figure below it turn
    // to nonsense — and never silently: the reduction is named in `warnings`, because
    // it is a signal that the loan split needs revisiting, not a detail to swallow.
    const typedIo = usable(o.interestOnlyLoan)
      ? num(o.interestOnlyLoan, DEFAULT_INPUTS.interestOnlyLoan)
      : DEFAULT_INPUTS.interestOnlyLoan
    const interestOnlyLoan = Math.max(0, Math.min(typedIo, slot.loanApportioned))
    if (interestOnlyLoan < typedIo) {
      warnings.push({
        code: 'INTEREST_ONLY_CAPPED',
        property: i + 1,
        typed: typedIo,
        applied: interestOnlyLoan,
        fundingRequired: slot.loanApportioned
      })
    }

    return computeMultiplePropertyAssessment(Object.assign({}, o, {
      purchasePrice: resolvedPrice[i],
      fundingRequired: slot.loanApportioned, //  INPUTS E65 = L15
      cashDeposit: slot.depositApplied, //       OUTPUTS C18, corrected
      interestOnlyLoan
    }))
  })

  // ---- the consolidation (`Consolidated Report` rows 11–39) ----
  // Every line is a straight sum across the properties, exactly as the sheet has it.
  const sumYears = function (pick) {
    const out = new Array(YEARS).fill(0)
    for (let i = 0; i < properties.length; i++) {
      const series = pick(properties[i])
      for (let y = 0; y < YEARS; y++) { out[y] += series[y] }
    }
    return out
  }

  const totalRevenue = sumYears(function (r) { return r.profitAndLoss.rental }) //          row 11
  const totalExpenses = sumYears(function (r) { return r.profitAndLoss.totalExpenses }) //  row 13
  const totalPropertyValue = sumYears(function (r) { return r.investmentSummary.propertyValue }) // row 22
  const totalDebt = sumYears(function (r) { return r.investmentSummary.totalDebt }) //      row 24
  const netEquity = sumYears(function (r) { return r.investmentSummary.netEquity }) //      row 26
  const annualCashTopUp = sumYears(function (r) { return r.investmentSummary.annualCashTopUp }) // row 30
  const capitalIntroduced = sumYears(function (r) { return r.investmentSummary.capitalIntroduced }) // §6 rule 9
  const cumulativeInvestorFunds = sumYears(function (r) { return r.investmentSummary.cumulativeInvestorFunds }) // row 32
  const weeklyCashPosition = sumYears(function (r) { return r.profitAndLoss.weeklyCashPosition }) // row 39

  const netOperatingProfit = new Array(YEARS).fill(0) //                                    row 15
  const returnOnInvestorFunds = new Array(YEARS).fill(0) //                                 row 34
  for (let y = 0; y < YEARS; y++) {
    netOperatingProfit[y] = totalRevenue[y] - totalExpenses[y]
    // C34 = (C26−C32)/C32 — computed FROM the consolidated totals, never the sum of the
    // per-property percentages, which would be an average of ratios and meaningless.
    returnOnInvestorFunds[y] = div(netEquity[y] - cumulativeInvestorFunds[y], cumulativeInvestorFunds[y])
  }

  const cashDeposit = properties.reduce(function (a, r) { //                                row 29
    return a + r.investmentSummary.cashDeposit
  }, 0)

  // ---- servicing: what the portfolio DEMANDS, which is not a test of affordability ----
  // The workbook collects no household income and no living costs on any sheet, so the
  // demand is all that can honestly be stated. See the banner.
  const servicingTotal = new Array(YEARS).fill(0)
  const servicingWeekly = new Array(YEARS).fill(0)
  let peakAnnualDemand = 0
  let peakYear = 1
  for (let y = 0; y < YEARS; y++) {
    servicingTotal[y] = annualCashTopUp[y] + capitalIntroduced[y]
    servicingWeekly[y] = div(servicingTotal[y], WEEKS_PER_YEAR)
    if (servicingTotal[y] > peakAnnualDemand) {
      peakAnnualDemand = servicingTotal[y]
      peakYear = y + 1
    }
  }

  const last = YEARS - 1
  return {
    household: h,
    apportionment,
    properties,

    consolidated: {
      years: Array.from({ length: YEARS }, function (_, i) { return i + 1 }),
      totalRevenue,
      totalExpenses,
      netOperatingProfit,
      totalPropertyValue,
      totalDebt,
      netEquity,
      cashDeposit,
      annualCashTopUp,
      capitalIntroduced,
      cumulativeInvestorFunds,
      returnOnInvestorFunds,
      weeklyCashPosition,

      // A demand on the family, NOT a verdict on whether they can meet it.
      servicing: {
        annualDemand: annualCashTopUp, //      the cash the portfolio cannot find itself
        capitalDemand: capitalIntroduced, //   lump sums under the 'repay' ending
        totalDemand: servicingTotal, //        the two together, which is what they pay
        weeklyDemand: servicingWeekly,
        peakAnnualDemand,
        peakYear,
        tenYearDemand: servicingTotal.reduce(function (a, v) { return a + v }, 0)
      }
    },

    // The same four figures Phase 1 says out loud, read off the portfolio instead of
    // off one property, so the two screens answer the same question at both scales.
    headline: {
      weeklyCashPosition: weeklyCashPosition[0],
      totalDebt: totalDebt[0],
      netEquityFinalYear: netEquity[last],
      returnOnInvestorFundsFinalYear: returnOnInvestorFunds[last]
    },

    warnings,
    defaultedInputs
  }
}

module.exports = {
  DEFAULT_INPUTS,
  DEFAULT_HOUSEHOLD,
  PROPERTY_OVERRIDES,
  defaultProperties,
  apportionLoans,
  computeMultiplePropertyPortfolio,
  MAX_PROPERTIES,
  computeMultiplePropertyAssessment,
  interestRateSeries,
  interestOnlySchedule,
  principalAndInterestSchedule,
  depreciateAsset,
  depreciationSchedule,
  chattelsDepreciation,
  yearOneAddBackAmount,
  deductibilityFactor,
  amortiseYear,
  annuityPayment,
  YEARS,
  RESIDUAL_THRESHOLD,
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
}
