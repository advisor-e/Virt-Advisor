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
 *   - Not ported yet: the rule table's "y1 Interest" column (feeds off the
 *     business block — Phase 6).
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

module.exports = {
  DEFAULT_INPUTS,
  DEFAULT_LOAN_INPUTS,
  computeLoanEstimator,
  computeRepaymentSchedule,
  computeSecurityItem,
  capBasedPropertyValue,
  fonterraShareValue,
  overdraftMonthlyInterest
}
