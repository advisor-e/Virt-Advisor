'use strict'

/**
 * Loan Estimator model — Phase 1: the bank rule table + security position
 * (Parts A + B of `design/report-source-models/The Loan Estimator.xlsx`).
 *
 * Faithful port of the `Capital Input` security grids (personal rows 6–14,
 * commercial rows 21–39) and the `Loan Criteria` rule table that drives them.
 * The rule table itself (lend %, max term, assessment rate per security class,
 * plus the overdraft criteria) lives in `data/loan-criteria.json` as config —
 * a later Firm Manager edit target — and this model is its only reader.
 *
 * The business rule, per security item the client owns:
 *
 *   adjustedValue            what the bank treats the asset as worth: the market
 *                            value nudged by the advisor's "% Value Adjustment"
 *                            when Growth Prospects is Growth/Decline, untouched
 *                            when Static (`Capital Input` M6 formula)
 *   currentEquity            adjustedValue − current debt                  (R col)
 *   loanLimit                adjustedValue × the class's lend %            (Z col)
 *   availableSecurity        loanLimit − current debt: the UNUSED lending
 *                            headroom this asset could still secure        (AB col)
 *   stressedDepositRequired  adjustedValue − loanLimit: the equity the bank
 *                            insists the client keeps in the asset         (AD col)
 *   stressTestedPayment      the monthly payment on the FULL loanLimit at the
 *                            class's ASSESSMENT rate over its max term — the
 *                            bank's worst-case affordability figure, not the
 *                            client's actual loan terms                    (AH col)
 *   stressPaymentGap         current monthly payments − stressTestedPayment;
 *                            negative means the stress payment exceeds what
 *                            the client pays today                         (AL col)
 *
 * Groups roll up exactly as the sheet does: personal (row 16), commercial
 * (row 41), combined (row 43), with each group's ratios against its own
 * asset-value total (rows 17 and 42 — the sheet has no combined ratio row,
 * so neither do we).
 *
 * Phase 2 adds the repayment engine (Part D, the `Interest` sheet): the Table
 * and Reducing monthly worksheets (rows 31–150), their 10-year roll-ups
 * (rows 5–12), and the three quick figures the `Capital Input` Quick
 * Calculator shows (D18/G24 · C29 · K29).
 *
 * FIDELITY NOTES — reproduced exactly as the source has them:
 *   - The Growth-Prospects formula's else-branch is Decline: any value that is
 *     not exactly "Static" or "Growth" adjusts DOWN (`Capital Input` M6). A
 *     missing prospects field defaults to "Static" (no adjustment) — the sheet's
 *     dropdown always holds a value, so "missing" has no workbook equivalent.
 *   - The overdraft monthly interest is NEGATIVE, as the sheet displays it
 *     (`Capital Input` C38 → `Loan Criteria` J47, IPMT period 1). Sign kept.
 *   - The 10-year totals row sums the year-END balances (`Interest` N10) — an
 *     odd metric, but it is the sheet's own total row, so it is reproduced.
 *   - An Interest-Only loan has no annual schedule on the sheet (its picker
 *     formula renders FALSE); we return `years: null` rather than nonsense.
 *   - The rule table's "y1 Interest" column (`Loan Criteria` J16–J32) is used by
 *     the Part E business block (Phase 6, `computeBusinessBlock`).
 *
 * CORRECTED FROM THE SOURCE — two owner rulings (Mike, 2026-07-23), both also
 * fixed in the source .xlsx so the two cannot diverge:
 *   - `Interest` AA8:AF8 (Reducing year-5..10 balances) read O90/P102..P150
 *     (cumulative interest/principal) where years 1–4 correctly read column N.
 *     A balance that collapses then climbs is impossible. Corrected: all ten
 *     year-end balances read the balance column (960,000 → 930,000 → … → 780,000).
 *   - `Interest` G24 (Interest-Only monthly payment) read the PURCHASE PRICE
 *     (C22×rate/12 = 6,187.50 on the sample). Ruled wrong: interest accrues on
 *     the borrowed balance. Corrected to loanAmount×rate/12 (= 4,950).
 *
 * Defaults NEVER substitute silently (the R8 ruling, 2026-07-19): any input
 * block that fell back to the workbook's sample scenario is named in the
 * result's `defaultedInputs`.
 *
 * Class: **Decision** (see `design/MODEL-CLASSIFICATION.md`) — the client's
 * real figures, typed in. No file intake in this phase, nothing goes to an LLM.
 *
 * Pure, side-effect free, backend-only per the Stack Constitution.
 */

const LOAN_CRITERIA = require('../../data/loan-criteria.json')

/** Rule-table rows keyed by security class, prototype-less. */
const CRITERIA_BY_KEY = Object.create(null)
LOAN_CRITERIA.securityClasses.forEach((row) => { CRITERIA_BY_KEY[row.key] = row })

/**
 * Coerce a value to a finite number (accepts JSON-string numbers), else the fallback.
 * The route will receive raw JSON, so a numeric field arriving as text must not
 * string-concatenate.
 * @param {*} v
 * @param {number} [fallback]
 * @returns {number}
 */
function num (v, fallback) {
  if (fallback === undefined) { fallback = 0 }
  if (typeof v === 'number') { return Number.isFinite(v) ? v : fallback }
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : fallback
}

/** Guard every division in the model: a zero denominator yields 0, never NaN/Infinity. */
function div (a, b) {
  return b ? a / b : 0
}

/**
 * Standard annuity payment (Excel `-PMT(rate, nper, pv)`), returned positive.
 * @param {number} ratePerPeriod
 * @param {number} periods
 * @param {number} principal
 * @returns {number}
 */
function annuityPayment (ratePerPeriod, periods, principal) {
  if (!periods) { return 0 }
  if (!ratePerPeriod) { return principal / periods }
  return principal * ratePerPeriod / (1 - Math.pow(1 + ratePerPeriod, -periods))
}

/**
 * Excel `PV(rate, nper, pmt, 0, 1)` — the present value of an annuity DUE (payments
 * at the start of each period), future value 0. Returns NEGATIVE for a positive
 * payment, exactly as the workbook's `Loan Criteria` D40 stores the business's
 * maximum loan (`Capital Input`/`Serviceability Input` G102).
 * @param {number} ratePerPeriod
 * @param {number} periods
 * @param {number} payment per period
 * @returns {number}
 */
function presentValueAnnuityDue (ratePerPeriod, periods, payment) {
  if (!periods) { return 0 }
  if (!ratePerPeriod) { return -payment * periods }
  return -payment * (1 + ratePerPeriod) * (1 - Math.pow(1 + ratePerPeriod, -periods)) / ratePerPeriod
}

/**
 * `Capital Input` D26 — commercial property valued off its rental yield:
 * net rental income ÷ capitalisation rate.
 * @param {number} netRentalIncome annual, net of GST & outgoings (D22)
 * @param {number} capRate e.g. 0.0505 (D25)
 * @returns {number}
 */
function capBasedPropertyValue (netRentalIncome, capRate) {
  return div(num(netRentalIncome), num(capRate))
}

/**
 * `Capital Input` D31 — Fonterra shareholding valued at the latest trading price.
 * @param {number} shares (D29)
 * @param {number} tradingValue per share (D30)
 * @returns {number}
 */
function fonterraShareValue (shares, tradingValue) {
  return num(shares) * num(tradingValue)
}

/**
 * `Loan Criteria` J47 (shown at `Capital Input` C38) — the overdraft's monthly
 * interest cost: IPMT period 1, which reduces to −(drawn × rate ÷ 12). Negative,
 * as the sheet displays it. Secured/unsecured picks the rate (`Loan Criteria`
 * H45: F45 = 15.39% secured, F46 = 22% unsecured).
 * @param {number} fundsDrawn (`Capital Input` D35)
 * @param {boolean} secured (`Capital Input` C36 === "Secured")
 * @returns {number}
 */
function overdraftMonthlyInterest (fundsDrawn, secured) {
  const rate = secured ? LOAN_CRITERIA.overdraft.securedRate : LOAN_CRITERIA.overdraft.unsecuredRate
  return -(num(fundsDrawn) * rate / 12)
}

/**
 * @typedef {Object} SecurityItemInput
 * @property {string} key security class key from `data/loan-criteria.json`
 * @property {number} value market value (`Capital Input` G col)
 * @property {number} [adjustmentPct] "% Value Adjustment", e.g. 0.07 (I col)
 * @property {string} [prospects] "Static" | "Growth" | "Decline" (K col; default "Static")
 * @property {number} [currentDebt] (P col)
 * @property {number} [currentMonthlyPayments] (V col)
 */

/**
 * One security row of the `Capital Input` grid.
 * @param {SecurityItemInput} raw
 * @returns {Object} the row's seven computed figures plus its identity
 */
function computeSecurityItem (raw) {
  const item = (raw && typeof raw === 'object') ? raw : {}
  const criteria = item.key ? CRITERIA_BY_KEY[item.key] : undefined
  if (!criteria) {
    // Loud failure over silent nonsense: an unknown class has no lend rules.
    throw new Error('Unknown security class: ' + String(item.key))
  }
  const value = num(item.value)
  const adjustmentPct = num(item.adjustmentPct)
  const prospects = typeof item.prospects === 'string' ? item.prospects : 'Static'
  const currentDebt = num(item.currentDebt)
  const currentMonthlyPayments = num(item.currentMonthlyPayments)

  // `Capital Input` M col: =if(K="Static",G,if(K="Growth",G+(G*I),G-(G*I)))
  let adjustedValue
  if (prospects === 'Static') {
    adjustedValue = value
  } else if (prospects === 'Growth') {
    adjustedValue = value + (value * adjustmentPct)
  } else {
    adjustedValue = value - (value * adjustmentPct)
  }

  const loanLimit = adjustedValue * criteria.lendPct
  const stressTestedPayment = annuityPayment(
    criteria.assessmentRate / 12, criteria.maxTermYears * 12, loanLimit
  )

  return {
    key: criteria.key,
    label: criteria.label,
    group: criteria.group,
    value,
    adjustedValue,
    currentDebt,
    currentMonthlyPayments,
    currentEquity: adjustedValue - currentDebt,
    loanLimit,
    availableSecurity: loanLimit - currentDebt,
    stressedDepositRequired: adjustedValue - loanLimit,
    stressTestedPayment,
    stressPaymentGap: currentMonthlyPayments - stressTestedPayment
  }
}

/**
 * Sum a list of computed items into a totals row (`Capital Input` rows 16/41/43).
 * @param {Object[]} items
 * @returns {Object}
 */
function totalsRow (items) {
  const t = {
    value: 0,
    adjustedValue: 0,
    currentDebt: 0,
    currentEquity: 0,
    currentMonthlyPayments: 0,
    loanLimit: 0,
    availableSecurity: 0,
    stressedDepositRequired: 0,
    stressTestedPayments: 0,
    stressPaymentGap: 0
  }
  items.forEach((it) => {
    t.value += it.value
    t.adjustedValue += it.adjustedValue
    t.currentDebt += it.currentDebt
    t.currentEquity += it.currentEquity
    t.currentMonthlyPayments += it.currentMonthlyPayments
    t.loanLimit += it.loanLimit
    t.availableSecurity += it.availableSecurity
    t.stressedDepositRequired += it.stressedDepositRequired
    t.stressTestedPayments += it.stressTestedPayment
    t.stressPaymentGap += it.stressPaymentGap
  })
  return t
}

/**
 * Group ratios against the group's own asset-value total (`Capital Input`
 * rows 17 and 42 — every denominator is that group's G-column total).
 * @param {Object} totals a totalsRow result
 * @returns {Object}
 */
function ratiosRow (totals) {
  return {
    debtToValue: div(totals.currentDebt, totals.value),
    equityToValue: div(totals.currentEquity, totals.value),
    loanLimitToValue: div(totals.loanLimit, totals.value),
    availableSecurityToValue: div(totals.availableSecurity, totals.value)
  }
}

/**
 * The workbook's own sample scenario (`Capital Input`), used as the demo
 * default — every figure carries its source cell. The commercial property and
 * Fonterra values are wired from their sub-calculations exactly as the sheet
 * wires G21=D26 and G39=D31.
 */
const DEFAULT_INPUTS = {
  securities: [
    // Personal items (rows 6–14): value G, adjustment I, prospects K, debt P, payments V
    { key: 'residentialHome', value: 1350000, adjustmentPct: 0.02, prospects: 'Static', currentDebt: 1080000, currentMonthlyPayments: 6632 }, //   r6
    { key: 'rentalProperty', value: 865000, adjustmentPct: 0.07, prospects: 'Decline', currentDebt: 350000, currentMonthlyPayments: 2321.16 }, //  r8
    { key: 'boat', value: 1350000, adjustmentPct: 0.02, prospects: 'Static', currentDebt: 1080000, currentMonthlyPayments: 6632 }, //              r10
    { key: 'classicCars', value: 450000, adjustmentPct: 0.07, prospects: 'Static', currentDebt: 350000, currentMonthlyPayments: 2321.16 }, //      r12
    { key: 'artworks', value: 375000, adjustmentPct: 0.07, prospects: 'Decline', currentDebt: 350000, currentMonthlyPayments: 2321.16 }, //        r14
    // Commercial items (rows 21–39)
    { key: 'commercialProperty', value: capBasedPropertyValue(67000, 0.0505), adjustmentPct: 0.07, prospects: 'Static', currentDebt: 440000, currentMonthlyPayments: 0 }, // r21 (G21=D26)
    { key: 'plantEquipment', value: 48000, adjustmentPct: 0.07, prospects: 'Decline', currentDebt: 12000, currentMonthlyPayments: 0 }, //          r23
    { key: 'vehicles', value: 65000, adjustmentPct: 0.07, prospects: 'Static', currentDebt: 18000, currentMonthlyPayments: 0 }, //                 r25
    { key: 'inventoryStock', value: 122000, adjustmentPct: 0.07, prospects: 'Static', currentDebt: 32000, currentMonthlyPayments: 5574 }, //       r27
    { key: 'debtors90', value: 89000, adjustmentPct: 0.07, prospects: 'Static', currentDebt: 0, currentMonthlyPayments: 0 }, //                    r29
    { key: 'farmDairy', value: 3750000, adjustmentPct: 0.07, prospects: 'Decline', currentDebt: 1500000, currentMonthlyPayments: 13356.95 }, //    r31
    { key: 'farmSheepBeef', value: 2569800, adjustmentPct: 0.07, prospects: 'Static', currentDebt: 120000, currentMonthlyPayments: 0 }, //         r33
    { key: 'horticulture', value: 3500000, adjustmentPct: 0.07, prospects: 'Static', currentDebt: 2365478, currentMonthlyPayments: 0 }, //         r35
    { key: 'glasshouseHorticulture', value: 1500000, adjustmentPct: 0.07, prospects: 'Static', currentDebt: 350000, currentMonthlyPayments: 0 }, // r37
    { key: 'fonterraShares', value: fonterraShareValue(45000, 3.85), adjustmentPct: 0.07, prospects: 'Static', currentDebt: 12000, currentMonthlyPayments: 0 } // r39 (G39=D31)
  ],
  subCalculations: {
    commercialPropertyRentalIncome: 67000, // D22
    propertyCapRate: 0.0505, //               D25
    fonterraShares: 45000, //                 D29
    fonterraTradingValue: 3.85 //             D30
  },
  overdraft: {
    fundsDrawn: 25000, // D35
    secured: true //      C36
  }
}

/**
 * Parts A + B: the full security position.
 * @param {Object} inputs { securities, subCalculations, overdraft } — any block
 *   omitted falls back to the workbook sample AND is named in `defaultedInputs`.
 * @returns {Object} { items, totals: {personal, commercial, combined},
 *   ratios: {personal, commercial}, subCalculations, defaultedInputs }
 */
function computeLoanEstimator (inputs) {
  const src = (inputs && typeof inputs === 'object') ? inputs : {}
  const defaultedInputs = []

  let securities = src.securities
  if (!Array.isArray(securities)) { securities = DEFAULT_INPUTS.securities; defaultedInputs.push('securities') }
  let sub = src.subCalculations
  if (!sub || typeof sub !== 'object') { sub = DEFAULT_INPUTS.subCalculations; defaultedInputs.push('subCalculations') }
  let overdraft = src.overdraft
  if (!overdraft || typeof overdraft !== 'object') { overdraft = DEFAULT_INPUTS.overdraft; defaultedInputs.push('overdraft') }

  const items = securities.map(computeSecurityItem)
  const personalItems = items.filter(it => it.group === 'personal')
  const commercialItems = items.filter(it => it.group === 'commercial')

  const personal = totalsRow(personalItems)
  const commercial = totalsRow(commercialItems)
  const combined = totalsRow(items)

  return {
    items,
    totals: { personal, commercial, combined },
    ratios: { personal: ratiosRow(personal), commercial: ratiosRow(commercial) },
    subCalculations: {
      capBasedPropertyValue: capBasedPropertyValue(sub.commercialPropertyRentalIncome, sub.propertyCapRate),
      fonterraShareValue: fonterraShareValue(sub.fonterraShares, sub.fonterraTradingValue),
      overdraftMonthlyInterest: overdraftMonthlyInterest(overdraft.fundsDrawn, overdraft.secured === true || overdraft.secured === 'Secured')
    },
    defaultedInputs
  }
}

/**
 * The Quick Calculator's own sample loan (`Capital Input` D6–D16) — the demo
 * default for the repayment engine. Cells noted per field.
 */
const DEFAULT_LOAN_INPUTS = {
  purchasePrice: 1350000, // D16
  deposit: 270000, //        D8
  annualRate: 0.055, //      D10
  term: 36, //               D12
  termUnit: 'Years', //      D13
  basis: 'Table' //          D6
}

/** The `Interest` sheet's yearly roll-up reads rows 42..150 — a fixed 10-year window. */
const SCHEDULE_YEARS = 10

/**
 * Part D — the repayment engine (`Interest` sheet). Simulates both monthly
 * worksheets exactly as the sheet's recurrences do, then rolls them up to the
 * 10-year interest / principal / closing-balance table with the sheet's own
 * clamping rules (a paid-off loan shows 0, never a negative).
 *
 * The business rule per basis:
 *   Table          constant payment -PMT(rate/12, termMonths, loan) (C31);
 *                  interest accrues on the falling balance, principal is the
 *                  remainder of the payment.
 *   Reducing       constant principal loan/termMonths (L31); interest accrues
 *                  on the falling balance, so the payment itself falls.
 *   Interest Only  no schedule (the sheet has none); monthly payment only.
 *
 * @param {Object} inputs { purchasePrice, deposit, annualRate, term,
 *   termUnit ("Years"|"Months"), basis ("Table"|"Reducing"|"Interest Only") } —
 *   any omitted field falls back to the sample AND is named in `defaultedInputs`.
 * @returns {Object} { loanAmount, termMonths, basis, monthlyRepayment,
 *   payments: { table, reducingFirstMonth, interestOnly },
 *   years: [{year, interest, principal, closingBalance}] | null,
 *   totals: { interest, principal, closingBalances } | null, defaultedInputs }
 */
function computeRepaymentSchedule (inputs) {
  const src = (inputs && typeof inputs === 'object') ? inputs : {}
  const defaultedInputs = []
  const take = (name) => {
    if (src[name] === undefined || src[name] === null) { defaultedInputs.push(name); return DEFAULT_LOAN_INPUTS[name] }
    return src[name]
  }
  const purchasePrice = num(take('purchasePrice'))
  const deposit = num(take('deposit'))
  const annualRate = num(take('annualRate'))
  const term = num(take('term'))
  const termUnit = take('termUnit')
  const basis = take('basis')
  if (basis !== 'Table' && basis !== 'Reducing' && basis !== 'Interest Only') {
    // The sheet's dropdown (AI2:AI4) only offers these three; anything else is a caller bug.
    throw new Error('Unknown repayment basis: ' + String(basis))
  }

  const termMonths = termUnit === 'Years' ? term * 12 : term // C20
  const loanAmount = purchasePrice - deposit //                 G22
  const monthlyRate = annualRate / 12

  const tablePayment = annuityPayment(monthlyRate, termMonths, loanAmount) // C31
  const reducingPrincipal = div(loanAmount, termMonths) //                    L31

  // Both monthly worksheets, exactly as rows 31..150 recur. The roll-up window
  // is 10 years regardless of term; the sheet's own IF-guards handle overrun.
  const months = SCHEDULE_YEARS * 12
  const table = { balance: loanAmount, rollingInterest: 0, rollingPrincipal: 0 }
  const reducing = { balance: loanAmount, rollingInterest: 0, rollingPrincipal: 0 }
  // Year-end snapshots (rows 42, 54, … 150)
  const tableSnaps = []
  const reducingSnaps = []
  for (let m = 1; m <= months; m++) {
    const tInterest = table.balance * monthlyRate //                 E col
    const tPrincipal = tablePayment - tInterest //                   D col
    table.balance -= tPrincipal //                                   F col
    table.rollingInterest = tInterest <= 0 ? 0 : table.rollingInterest + tInterest //       G col
    table.rollingPrincipal = table.rollingInterest === 0 ? 0 : tPrincipal + table.rollingPrincipal // H col

    const rInterest = reducing.balance * monthlyRate //              M col
    reducing.balance -= reducingPrincipal //                         N col
    reducing.rollingInterest = rInterest <= 0 ? 0 : reducing.rollingInterest + rInterest // O col
    reducing.rollingPrincipal = reducing.rollingInterest === 0 ? 0 : reducingPrincipal + reducing.rollingPrincipal // P col

    if (m % 12 === 0) {
      tableSnaps.push({ balance: table.balance, rollingInterest: table.rollingInterest, rollingPrincipal: table.rollingPrincipal })
      reducingSnaps.push({ balance: reducing.balance, rollingInterest: reducing.rollingInterest, rollingPrincipal: reducing.rollingPrincipal })
    }
  }

  // Rows 5–12: each year is the rolling total's step-up over the years already
  // shown (themselves clamped), guarded exactly as the sheet guards them.
  const yearRows = (snaps) => {
    let interestShown = 0
    let principalShown = 0
    return snaps.map((snap, i) => {
      const interest = snap.rollingInterest < 1 ? 0 : snap.rollingInterest - interestShown //   W5/W6 pattern
      const principal = snap.rollingPrincipal < 1 ? 0 : snap.rollingPrincipal - principalShown // W11/W12 pattern
      interestShown += interest
      principalShown += principal
      return {
        year: i + 1,
        interest,
        principal,
        closingBalance: snap.balance < 0 ? 0 : snap.balance // W8/W9 pattern (corrected col-N read for years 5–10)
      }
    })
  }

  let years = null
  if (basis === 'Table') { years = yearRows(tableSnaps) }
  if (basis === 'Reducing') { years = yearRows(reducingSnaps) }

  // Quick figures (`Capital Input` D18 picks by basis; K29 is Reducing month 1)
  const payments = {
    table: tablePayment, //                                                C29
    reducingFirstMonth: reducingPrincipal + loanAmount * monthlyRate, //   K29 (= L31 + M31)
    interestOnly: loanAmount * monthlyRate //                              G24 — CORRECTED (was purchasePrice×rate/12)
  }
  let monthlyRepayment = payments.reducingFirstMonth
  if (basis === 'Interest Only') { monthlyRepayment = payments.interestOnly }
  if (basis === 'Table') { monthlyRepayment = payments.table }

  let totals = null
  if (years) {
    totals = {
      interest: years.reduce((s, y) => s + y.interest, 0), //          N6
      principal: years.reduce((s, y) => s + y.principal, 0), //        N8
      closingBalances: years.reduce((s, y) => s + y.closingBalance, 0) // N10 (the sheet's own odd total row)
    }
  }

  return { loanAmount, termMonths, basis, monthlyRepayment, payments, years, totals, defaultedInputs }
}

const TAX_BANDS = require('../../data/tax-bands.json')

/**
 * Resolve a country's tax-band table from the central feeder
 * (`data/tax-bands.json` — the single tax source for ALL models, owner ruling
 * 2026-07-23). A country with no verified table is ABSENT and throws loudly —
 * visibly missing beats silently zero (the workbook's zeroed Australian
 * federal table is exactly the failure this prevents).
 * @param {string} country ISO-ish key, e.g. "NZ"
 * @returns {Object} { label, taxYearLabel, effectiveFrom, bands }
 */
function getTaxBands (country) {
  const entry = TAX_BANDS.countries[country]
  if (!entry) { throw new Error('No verified tax-band table for country: ' + String(country)) }
  return entry
}

/**
 * Marginal income tax over a band table: each band taxes only the income
 * inside it. Reproduces the workbook's band-slice grid (`Serviceability`
 * AI4:AN6) exactly for whole-dollar incomes.
 * @param {number} gross annual gross income
 * @param {Array} bands [{ upTo, rate }] bottom-up, last upTo null
 * @returns {number} annual tax
 */
function incomeTax (gross, bands) {
  const g = num(gross)
  let tax = 0
  let lower = 0
  for (let i = 0; i < bands.length; i++) {
    const upper = bands[i].upTo === null ? g : bands[i].upTo
    if (g > lower) { tax += (Math.min(g, upper) - lower) * bands[i].rate }
    lower = upper
  }
  return tax
}

/**
 * The marginal rate of the band a total income lands in (used to tax rental
 * income stacked on top of the household's other income — `Serviceability`
 * AL13/AL16, as CORRECTED: see the ruling note below).
 * @param {number} total
 * @param {Array} bands
 * @returns {number}
 */
function marginalRate (total, bands) {
  const t = num(total)
  for (let i = 0; i < bands.length; i++) {
    if (bands[i].upTo === null || t <= bands[i].upTo) { return bands[i].rate }
  }
  return bands[bands.length - 1].rate
}

/**
 * Dependants-under-18 weekly allowance, tiered per the sheet's own formulas
 * (`Serviceability` AH40:AJ40): #1 at 175/wk, #2–#4 at 125/wk, #5+ at 105/wk.
 * @param {number} count
 * @returns {number} weekly total
 */
function dependantsUnder18Weekly (count) {
  const tiers = LOAN_CRITERIA.serviceability.dependantsUnder18WeeklyTiers
  const n = num(count)
  let weekly = 0
  let lower = 0
  tiers.forEach((tier) => {
    const upper = tier.upToCount === null ? n : tier.upToCount
    if (n > lower) { weekly += (Math.min(n, upper) - lower) * tier.weeklyEach }
    lower = upper
  })
  return weekly
}

/**
 * The Ripper household — the workbook's sample scenario (`Serviceability
 * Input`), cells per field. Student-loan monthly figures are the CUSTOMERS'
 * OWN payments (the sheet parks them in `Loan Criteria` W11/W12); they are
 * inputs here, not rules.
 */
const DEFAULT_SERVICEABILITY_INPUTS = {
  country: 'NZ',
  jointApplication: true, //           E5 ("Yes")
  dependantsUnder18: 3, //             E7
  dependantsOver18: 1, //              L7
  numberOfVehicles: 2, //              L5
  customer1GrossIncome: 86500, //      E25
  customer2GrossIncome: 40000, //      E27
  otherMonthlyTaxPaidIncome: 0, //     J29
  currentRentalWeekly: 650, //         H31
  newRentalWeekly: 550, //             H33
  boarders: { number: 0, weeklyCharge: 260, termWeeks: 40 }, // E35 / G35 / H35
  loans: {
    revolvingCredit: { balance: 0, actualRate: 0, assessmentTermYears: 30, actualTermYears: 10 }, //      E12 / H12 / J12 / L12
    currentPropertyLoans: { balance: 0, actualRate: 0, assessmentTermYears: 30, actualTermYears: 25 }, // E14 / H14 / J14 / L14
    newPropertyLoans: { balance: 500000, actualRate: 0, assessmentTermYears: 30, actualTermYears: 25 }, // E16 / H16 / J16 / L16
    personalTermLoans: { balance: 0, actualRate: 0.1395, assessmentTermYears: 7, actualTermYears: 5 } //  E20 / H20 / J20 / L20
  },
  studentLoan1Monthly: 1002, //        E40 "Yes" → the customer's own figure (Loan Criteria W11)
  studentLoan2Monthly: 652, //         E41 "Yes" → W12
  overdraftLimits: 500, //             E43
  creditCardLimits: 7000, //           E44
  rentPaidWeekly: 500, //              E52
  generalLivingWeekly: 750, //         E54
  additionalLivingWeekly: 125 //       E57
}

/**
 * Part C — serviceability (`Serviceability Input`): can the household afford
 * the repayments after tax, living costs and the bank's minimums?
 *
 * The business rule, as the sheet computes it:
 *   income      both customers taxed to net through the CENTRAL tax-band
 *               feeder (`data/tax-bands.json`), plus other tax-paid income,
 *               both rentals taxed at the marginal band of the running total
 *               (other income + rentals so far), plus boarder income (N25)
 *   loan mins   each loan row repriced at max(assessment rate, actual rate)
 *               over min(assessment term, actual term) — the bank's
 *               worst-case, not the client's actual terms (N9, AO20:AO29)
 *   expenses    student loans, overdraft & credit-card minimums, rent and
 *               living costs (N40) — but never less than the bank's FLOOR of
 *               minimum allowances (dependants, vehicles, adult living, AE55)
 *   surplus     income − loan minimums − max(actual expenses, floor)  (N64)
 *
 * CORRECTED FROM THE SOURCE — owner ruling (Mike, 2026-07-23), fixed in the
 * source .xlsx in the same commit: the sheet's rental-tax formulas (AL13/AL16)
 * were missing parentheses in their band-2/3/4 branches, computing
 * `rental − threshold×rate` (dimensional nonsense) instead of `rental×rate`;
 * bands 1 and 5 show the intended clean multiply. On the sample this
 * under-taxed the 650/wk rental ($8,027 vs $11,154) and flipped the surplus
 * from the sheet's cached 105.7495571 to the correct −154.83… — the household
 * actually FAILS the affordability test once rental income is taxed properly.
 *
 * FIDELITY NOTES:
 *   - Hire-purchase limits/balances (E46/G46) are captured by the sheet but
 *     never costed into any total. Reproduced: they are not inputs here.
 *   - The verdict WORDING ("Looking Good!" / "Doesn't Look Good") is an open
 *     Phase 4 decision; this model returns `verdictPass` (surplus > the
 *     configured threshold) and no words.
 *
 * @param {Object} inputs see DEFAULT_SERVICEABILITY_INPUTS — any omitted field
 *   falls back to the sample AND is named in `defaultedInputs`.
 * @returns {Object} { income, loanMinimums, expenses, allowances, surplus,
 *   verdictPass, maxAffordableNewLoan, taxTable: {country, taxYearLabel},
 *   defaultedInputs }
 */
function computeServiceability (inputs) {
  const src = (inputs && typeof inputs === 'object') ? inputs : {}
  const defaultedInputs = []
  const take = (name) => {
    if (src[name] === undefined || src[name] === null) { defaultedInputs.push(name); return DEFAULT_SERVICEABILITY_INPUTS[name] }
    return src[name]
  }

  const country = take('country')
  const taxTable = getTaxBands(country)
  const bands = taxTable.bands
  const svc = LOAN_CRITERIA.serviceability

  const jointApplication = take('jointApplication') === true || take2Bool(src.jointApplication)
  const dependantsUnder18 = num(take('dependantsUnder18'))
  const dependantsOver18 = num(take('dependantsOver18'))
  const numberOfVehicles = num(take('numberOfVehicles'))
  const customer1Gross = num(take('customer1GrossIncome'))
  const customer2Gross = num(take('customer2GrossIncome'))
  const otherMonthly = num(take('otherMonthlyTaxPaidIncome'))
  const rental1Weekly = num(take('currentRentalWeekly'))
  const rental2Weekly = num(take('newRentalWeekly'))
  const boarders = take('boarders')
  const loans = take('loans')
  const studentLoan1 = num(take('studentLoan1Monthly'))
  const studentLoan2 = num(take('studentLoan2Monthly'))
  const overdraftLimits = num(take('overdraftLimits'))
  const creditCardLimits = num(take('creditCardLimits'))
  const rentWeekly = num(take('rentPaidWeekly'))
  const generalWeekly = num(take('generalLivingWeekly'))
  const additionalWeekly = num(take('additionalLivingWeekly'))

  // Income (N23 block). Rentals stack on the combined gross in sheet order:
  // current rental first (AJ13), then the new rental on top (AJ16).
  const c1Tax = incomeTax(customer1Gross, bands) //        AN4 (18,422.50 on the sample)
  const c2Tax = incomeTax(customer2Gross, bands) //        AN8
  const combinedGross = customer1Gross + customer2Gross // AE12
  const rental1Annual = rental1Weekly * 52 //              AI13
  const rental1Stack = combinedGross + rental1Annual //    AJ13
  const rental1Tax = rental1Annual * marginalRate(rental1Stack, bands) // AL13 (corrected)
  const rental2Annual = rental2Weekly * 52 //              AI16
  const rental2Stack = rental1Stack + rental2Annual //     AJ16
  const rental2Tax = rental2Annual * marginalRate(rental2Stack, bands) // AL16 (corrected)
  const boarderMonthly = (num(boarders && boarders.weeklyCharge) * num(boarders && boarders.termWeeks) / 12) * num(boarders && boarders.number) // J35

  const income = {
    customer1: { gross: customer1Gross, tax: c1Tax, net: customer1Gross - c1Tax, netMonthly: (customer1Gross - c1Tax) / 12 }, // E25/AN4/H25/J25
    customer2: { gross: customer2Gross, tax: c2Tax, net: customer2Gross - c2Tax, netMonthly: (customer2Gross - c2Tax) / 12 },
    rental1: { annual: rental1Annual, tax: rental1Tax, net: rental1Annual - rental1Tax, netMonthly: (rental1Annual - rental1Tax) / 12 }, // AI13/AL13/AM13/J31
    rental2: { annual: rental2Annual, tax: rental2Tax, net: rental2Annual - rental2Tax, netMonthly: (rental2Annual - rental2Tax) / 12 },
    boarderMonthly,
    otherMonthly,
    totalNetMonthly: 0 // set below
  }
  income.totalNetMonthly = income.customer1.netMonthly + income.customer2.netMonthly +
    income.rental1.netMonthly + income.rental2.netMonthly + boarderMonthly + otherMonthly // N25

  // Loan minimums (N9): rate = max(assessment, actual), term = min(assessment, actual).
  // The personal-term row has no bank assessment rate — the sheet uses the actual alone (AI29).
  const residentialAssessmentRate = CRITERIA_BY_KEY.residentialHome.assessmentRate // G12/G14/G16 = 'Loan Criteria'!H4
  const minPayment = (row, assessmentRate) => {
    const r = row || {}
    const rate = Math.max(assessmentRate, num(r.actualRate)) //                       AI col
    const termYears = Math.min(num(r.assessmentTermYears), num(r.actualTermYears)) // AM col
    return annuityPayment(rate / 12, termYears * 12, num(r.balance)) //               |AO PMT|
  }
  const loanMinimums = {
    revolvingCredit: minPayment(loans.revolvingCredit, residentialAssessmentRate), //           N12
    currentPropertyLoans: minPayment(loans.currentPropertyLoans, residentialAssessmentRate), // N14
    newPropertyLoans: minPayment(loans.newPropertyLoans, residentialAssessmentRate), //         N16
    personalTermLoans: minPayment(loans.personalTermLoans, 0), //                               N20
    total: 0
  }
  loanMinimums.total = loanMinimums.revolvingCredit + loanMinimums.currentPropertyLoans +
    loanMinimums.newPropertyLoans + loanMinimums.personalTermLoans // N9

  // Actual expenses (N40)
  const expenses = {
    studentLoans: studentLoan1 + studentLoan2, //                       J40 + J41
    overdraftMin: overdraftLimits * svc.overdraftMinMonthlyPct, //      J43
    creditCardMin: creditCardLimits * svc.creditCardMinMonthlyPct, //   J44
    rentMonthly: rentWeekly * 52 / 12, //                               J52
    generalMonthly: generalWeekly * 52 / 12, //                         J54
    additionalMonthly: additionalWeekly * 52 / 12, //                   J57
    total: 0
  }
  expenses.total = expenses.studentLoans + expenses.overdraftMin + expenses.creditCardMin +
    expenses.rentMonthly + expenses.generalMonthly + expenses.additionalMonthly // N40

  // The bank's minimum-allowances floor (AE55)
  const adults = jointApplication ? 2 : 1 // AE53
  const allowances = {
    dependantsUnder18Monthly: dependantsUnder18Weekly(dependantsUnder18) * 52 / 12, //      AM38
    dependantsOver18Monthly: dependantsOver18 * svc.dependantOver18Weekly * 52 / 12, //     AM44
    vehiclesMonthly: numberOfVehicles * svc.minVehicleMonthlyCost, //                       J50
    adultLivingMonthly: adults * svc.adultWeeklyLivingMin * 52 / 12, //                     AE53
    floor: 0
  }
  allowances.floor = allowances.dependantsUnder18Monthly + allowances.dependantsOver18Monthly +
    allowances.vehiclesMonthly + allowances.adultLivingMonthly // AE55 (= AE52 + AE53)

  // N64: actual expenses count only when they exceed the floor
  const expensesUsed = Math.max(expenses.total, allowances.floor)
  const surplus = income.totalNetMonthly - loanMinimums.total - expensesUsed

  // APP-ORIGINAL FORMULA (Mike, 2026-07-23) — NOT a workbook cell, so it has no
  // golden anchor; it is proven by round-trip test instead (plug the answer back
  // in as the balance → surplus lands exactly on the threshold). The largest
  // "New Property Loans" balance whose bank-assessed minimum payment still
  // leaves the household at the affordability threshold, everything else as
  // entered. The minimum payment is linear in the balance, so solve directly:
  // per-dollar payment at the same worst-case repricing as the N16 row itself.
  const perDollar = minPayment(
    Object.assign({}, loans.newPropertyLoans, { balance: 1 }), residentialAssessmentRate
  )
  const paymentHeadroom = income.totalNetMonthly -
    (loanMinimums.total - loanMinimums.newPropertyLoans) -
    expensesUsed - svc.verdictSurplusThreshold
  const maxAffordableNewLoan = perDollar > 0 ? Math.max(0, paymentHeadroom / perDollar) : null

  return {
    income,
    loanMinimums,
    expenses,
    allowances,
    surplus, //                                              N64
    verdictPass: surplus > svc.verdictSurplusThreshold, //   J64's test; wording is a Phase 4 decision
    maxAffordableNewLoan, //                                 app-original — indication only
    taxTable: { country, taxYearLabel: taxTable.taxYearLabel, effectiveFrom: taxTable.effectiveFrom },
    defaultedInputs
  }
}

/** Coerce the sheet's "Yes"/"No" strings to a boolean (E5-style cells). */
function take2Bool (v) {
  return typeof v === 'string' && v.toLowerCase() === 'yes'
}

/**
 * The Ripper business — the workbook's sample business block (`Serviceability
 * Input` rows 71–103), cells per field. The nine commercial securities are the
 * SAME `Capital Input` commercial grid the security position uses (the sheet's
 * business block references rows 23–39), so it defaults to that one list and
 * selects the nine internally — a change to a commercial asset flows to both.
 */
const DEFAULT_BUSINESS_INPUTS = {
  ebit: 342000, //                       N72
  businessType: 'Commercial Business', // E74 (Loan Criteria Z45 picks the divisor: "Farm" → ÷1.5, else ÷3)
  fullTimeStaff: 14, //                  E100
  partTimeStaff: 3, //                   E101
  currentTaxDue: 25000, //               E103
  securities: DEFAULT_INPUTS.securities // Capital Input commercial grid (rows 23–39 used; commercial property excluded)
}

/**
 * Part E — the business block (`Serviceability Input` rows 71–103): the trading
 * entity's own securities and whether its EBIT services a business loan.
 *
 * The business rule, as the sheet computes it:
 *   securities   the nine COMMERCIAL classes the client's business owns
 *                (`Capital Input` rows 23–39 = the commercial grid MINUS
 *                commercial property), each carried through at its bank-adjusted
 *                value, current debt and remaining lending security
 *   year1Interest  per class, IF(remainingSecurity > 1, IPMT(rate,1,term,
 *                security), 0) — which for period 1 is remainingSecurity × the
 *                class's assessment rate, negative as the sheet's IPMT shows it;
 *                a class with no headroom (or negative, e.g. Horticulture on the
 *                sample) contributes nothing (`Loan Criteria` J16–J32)
 *   ebitToInterestRatio  |EBIT ÷ total Year-1 interest| — how many times profit
 *                covers first-year interest (N96)
 *   bankAdjustedMaxSecurity  total remaining security − a staff-and-tax
 *                adjustment (`Loan Criteria` Z43 → `Serviceability` H98)
 *   maxBankAdjustedLoan  the bank takes a share of EBIT as the affordable ANNUAL
 *                repayment — Farm ÷1.5, else ÷3 (Z45) — and prices the largest
 *                loan it supports at the business rate over the business term
 *                (annuity-due present value; negative as the sheet shows it,
 *                `Loan Criteria` D40 / `Serviceability` G102)
 *   monthlyPaymentRequired  the monthly repayment on that loan (L101)
 *
 * CORRECTED FROM THE SOURCE — owner ruling (Mike, 2026-07-24: "fix as we go, do
 * it right first time"), fixed in the source .xlsx in the same commit: the
 * security adjustment (`Loan Criteria` Z43 = Z39+Z40+Z41+X42) DOUBLE-COUNTED the
 * staff cost, because Z41 is itself SUM(Z39:Z40). On the sample it charged
 * 211,000 (staff 93,000 counted twice + tax 25,000) instead of 118,000, so the
 * bank-adjusted maximum security read 1,854,001.5 where it should read
 * 1,947,001.5. Corrected here to count each staff member ONCE.
 *
 * FIDELITY NOTES:
 *   - The business entity NAME (E72) is personal data; it is not an input here
 *     and never logged (`design/LOAN-ESTIMATOR-PLAN.md` §5).
 *   - The remaining-security total SUMS a class's negative headroom (Horticulture
 *     −265,478 on the sample) even though that class's Year-1 interest is gated
 *     to 0 — the sheet's H96 does exactly this, so it is reproduced.
 *
 * @param {Object} inputs see DEFAULT_BUSINESS_INPUTS — any omitted field falls
 *   back to the sample AND is named in `defaultedInputs` (R8).
 * @returns {Object} { items, totals, ebit, businessType, fullTimeStaff,
 *   partTimeStaff, currentTaxDue, ebitToInterestRatio, securityAdjustment,
 *   bankAdjustedMaxSecurity, coverageDivisor, ebitServiceableAnnual,
 *   maxBankAdjustedLoan, monthlyPaymentRequired, loanRate, loanTermYears,
 *   defaultedInputs }
 */
function computeBusinessBlock (inputs) {
  const src = (inputs && typeof inputs === 'object') ? inputs : {}
  const defaultedInputs = []
  const take = (name) => {
    if (src[name] === undefined || src[name] === null) { defaultedInputs.push(name); return DEFAULT_BUSINESS_INPUTS[name] }
    return src[name]
  }
  const ebit = num(take('ebit'))
  const businessType = take('businessType')
  const fullTimeStaff = num(take('fullTimeStaff'))
  const partTimeStaff = num(take('partTimeStaff'))
  const currentTaxDue = num(take('currentTaxDue'))
  let securities = take('securities')
  if (!Array.isArray(securities)) { securities = DEFAULT_BUSINESS_INPUTS.securities }
  const cfg = LOAN_CRITERIA.business

  // The nine commercial securities the block assesses (`Serviceability` rows
  // 78–94 = `Capital Input` rows 23–39): the commercial grid minus commercial
  // property, each already computed by computeSecurityItem. Columns mapped:
  // adjustedValue = E ("Market Value"), currentDebt = G, availableSecurity = H
  // ("Remaining Security"), year1Interest = J.
  const items = securities.map(computeSecurityItem)
    .filter(it => it.group === 'commercial' && it.key !== 'commercialProperty')
    .map((it) => {
      const rate = CRITERIA_BY_KEY[it.key].assessmentRate
      const year1Interest = it.availableSecurity > 1 ? -(it.availableSecurity * rate) : 0 // J78–J94 (gated, sign kept)
      return {
        key: it.key,
        label: it.label,
        adjustedValue: it.adjustedValue, //         E78–E94
        currentDebt: it.currentDebt, //             G78–G94
        availableSecurity: it.availableSecurity, // H78–H94
        year1Interest //                            J78–J94
      }
    })

  const totals = items.reduce((t, it) => {
    t.adjustedValue += it.adjustedValue
    t.currentDebt += it.currentDebt
    t.availableSecurity += it.availableSecurity // H96 (sums negative headroom too, as the sheet does)
    t.year1Interest += it.year1Interest //         J96
    return t
  }, { adjustedValue: 0, currentDebt: 0, availableSecurity: 0, year1Interest: 0 })

  const ebitToInterestRatio = totals.year1Interest ? Math.abs(div(ebit, totals.year1Interest)) : 0 // N96

  // The staff-and-tax security adjustment (Z43) — CORRECTED to count each staff
  // member ONCE (the source double-counted; see the header note and config _note).
  const securityAdjustment = fullTimeStaff * cfg.perFullTimeStaffSecurity +
    partTimeStaff * cfg.perPartTimeStaffSecurity + currentTaxDue
  const bankAdjustedMaxSecurity = totals.availableSecurity - securityAdjustment // H98 (corrected)

  // EBIT-serviced maximum loan (D40 / G102): Farm ÷1.5, else ÷3 (Z45).
  const coverageDivisor = businessType === 'Farm' ? cfg.ebitCoverageDivisorFarm : cfg.ebitCoverageDivisorDefault
  const ebitServiceableAnnual = div(ebit, coverageDivisor) //                                      AB40
  const maxBankAdjustedLoan = presentValueAnnuityDue(cfg.loanRate, cfg.loanTermYears, ebitServiceableAnnual) // D40/G102
  // The loan is stored negative (as the sheet shows), so the payment is on its size.
  const monthlyPaymentRequired = annuityPayment(cfg.loanRate / 12, cfg.loanTermYears * 12, Math.abs(maxBankAdjustedLoan)) // L101

  return {
    items,
    totals,
    ebit,
    businessType,
    fullTimeStaff,
    partTimeStaff,
    currentTaxDue,
    ebitToInterestRatio, //        N96
    securityAdjustment, //         Z43 (corrected — staff counted once)
    bankAdjustedMaxSecurity, //    H98 (corrected)
    coverageDivisor, //            Z45 (1.5 Farm / 3 other)
    ebitServiceableAnnual, //      AB40
    maxBankAdjustedLoan, //        D40 / G102 (negative, as the sheet shows)
    monthlyPaymentRequired, //     L101
    loanRate: cfg.loanRate, //          J101 (business rate the loan is priced at)
    loanTermYears: cfg.loanTermYears, // J103 (business term the loan is priced over)
    defaultedInputs
  }
}

/**
 * The whole assessment in one call — the payload the /api/report/loan-estimator
 * route returns. Assembled here, not in the route, so the golden test exercises
 * exactly what the screen receives (the marginBreakeven lesson).
 *
 * Each part keeps its own `defaultedInputs` (R8): a missing block computes on
 * the workbook sample and says so, never silently.
 *
 * @param {Object} inputs { securityPosition, repayment, serviceability, business }
 *   — each block passed through to its Part's compute; any block may be omitted.
 * @returns {Object} { securityPosition, repayment, serviceability, business }
 */
function computeLoanEstimatorReport (inputs) {
  const src = (inputs && typeof inputs === 'object') ? inputs : {}
  return {
    securityPosition: computeLoanEstimator(src.securityPosition),
    repayment: computeRepaymentSchedule(src.repayment),
    serviceability: computeServiceability(src.serviceability),
    business: computeBusinessBlock(src.business)
  }
}

module.exports = {
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
  presentValueAnnuityDue,
  getTaxBands,
  incomeTax,
  marginalRate
}
