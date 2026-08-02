'use strict'

/**
 * Lease vs Buy model — faithful port of `design/report-source-models/CM.Lease vs. Buy.xlsx`.
 *
 * Tells a client whether LEASING or BUYING an asset (a vehicle) is cheaper, by
 * building the whole-of-life cost of each and naming the smaller. The workbook's
 * verdict cell is `Input!K31 = if(I31 > I33, "Lease!", "Buy!")` — i.e. it prints
 * the CHEAPER option (if Buy costs more, recommend Lease).
 *
 * The two headline totals each sit on top of a small engine:
 *   - Interest  — a month-by-month amortisation of the loan, in two selectable
 *                 methods (Table = equal instalments / Reducing = equal principal).
 *   - Depreciation — a year-by-year asset-value schedule, Straight-Line or
 *                 Diminishing-Value, feeding the depreciation tax rebate.
 *   - Buy      — a 10-year cost build-up: payments + cost-of-capital + running
 *                 costs, less four tax rebates (`Buy` sheet).
 *   - Lease    — a term-length cost build-up plus lease-end costs (`Lease` sheet).
 *
 * SCOPE (owner-approved 2026-07-27): this first build ports the Buy-vs-Lease
 * verdict only. The workbook's separate "FBT vs Reimbursement" sheet does NOT feed
 * the verdict (verified: neither Input!I31 nor I33 references it) and is left out.
 *
 * CORRECTED FROM THE SOURCE — one owner ruling (Mike, 2026-07-27), also to be fixed
 * in the source .xlsx so the two cannot diverge:
 *   - The lease-end costs (`Lease!D37`, the refurb + excess-km levy = 9,700.17) are
 *     added TWICE in the workbook: once inside `Lease!K3` (= sum(D3:I3)+D37) and
 *     again in `Input!D33` (= Lease!K3 + Lease!D37). The Buy side has no such
 *     double-count, so the bug inflates the Lease total and — on the sample — flips
 *     the recommendation from the honest "Lease!" to a wrong "Buy!". We count the
 *     lease-end costs ONCE: Total Lease Cost = Lease!K3 − leaseResidual.
 *
 * FIDELITY NOTES — reproduced exactly as the source has them, NOT bugs that fire on
 * any in-range scenario:
 *   - Buy/Lease per-year net cost is gated on the payment being > 1 (`Buy!D3`,
 *     `Lease!D3`), so running costs are only counted while the loan / lease is still
 *     being paid. After payoff the yearly cost is 0. Kept.
 *   - Straight-Line depreciation charges a FLAT cost×rate every year for tax
 *     (`Depreciation!C15:M15`), which would over-depreciate beyond the asset's life;
 *     but only years within the loan term are ever summed, so on any real loan
 *     (≤ life) it never fires. Reproduced, not corrected.
 *   - The workbook caps Buy at 10 years and Lease at 6 by its column layout; both
 *     zero-out past the loan / lease term, so the caps never bind. Kept.
 *
 * Defaults NEVER substitute silently (the R8 ruling, 2026-07-19): any input that
 * fell back to the workbook's sample value is named in the result's `defaultedInputs`.
 *
 * Class: **Decision** (see `design/MODEL-CLASSIFICATION.md`) — the client's real
 * figures, typed in. No file intake, nothing goes to an LLM.
 *
 * Pure, side-effect free, backend-only per the Stack Constitution.
 */

/** How many years the Buy build-up runs (workbook `Buy` columns D–M). */
const BUY_YEARS = 10
/** How many years the Lease build-up runs (workbook `Lease` columns D–I). */
const LEASE_YEARS = 6

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

/** Guard every division: a zero denominator yields 0, never NaN/Infinity. */
function div (a, b) {
  return b ? a / b : 0
}

/**
 * Standard annuity payment (Excel `-PMT(rate, nper, pv)`), returned positive — the
 * equal monthly instalment on a Table loan (`Input!D16`).
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
 * The workbook's own sample scenario — every leaf INPUT on the `Input` sheet, plus
 * the per-year repair estimates the workbook hard-codes onto the `Buy` sheet
 * (`Buy!D21:M21`). Cell references are given so each can be checked by hand.
 * @type {object}
 */
const DEFAULT_INPUTS = {
  // Loan block (Input col D)
  loanType: 'T', //              D6  — 'T' Table (equal instalments) / 'R' Reducing (equal principal)
  deposit: 8500, //              D8  ($)
  interestRate: 0.095, //        D10 (9.5%)
  termMonths: 48, //             D12 (months)
  purchasePrice: 55000, //       D14 ($, GST-exclusive)

  // Depreciation block (Input col D)
  depreciationMethod: 'dv', //   D20 — 'sl' Straight-Line / 'dv' Diminishing-Value
  depreciationRate: 0.23, //     D22 (23%)

  // "Other" block (Input col I)
  companyTaxRate: 0.28, //       I6  (28%)
  gstRate: 0.15, //              I8  (15%)
  kmPerMonth: 2500, //           I10 (km/month)
  inflationRate: 0.015, //       I16 (1.5%)
  servicePeriodKm: 15000, //     I18 (km between services)
  warrantyServiceCost: 450, //   I20 ($ per service)
  insurancePerYear: 850, //      I21 ($/yr)
  tyresCost: 1300, //            I22 ($ per set)
  tyreLifeKm: 55000, //          I24 (km per set)

  // Lease block (Input cols M/N)
  leaseTermMonths: 36, //        N6  (months)
  annualLeaseKm: 13333, //       M8  (km/yr allowance)
  costPerKmOver: 0.17, //        N10 ($/km over the allowance)
  costPerPanel: 300, //          N12 ($ per panel re-spray)
  numPanels: 4, //               N14 (panels to refurbish at lease end)
  monthlyLeasePayment: 734, //   N18 ($/month)
  includesServicing: 'yes', //   N20 ('yes'/'no')
  includesInsurance: 'yes', //   N21 ('yes'/'no')
  includesTyres: 'yes', //       N22 ('yes'/'no')

  // Verdict residuals (Input col F)
  assetResaleValue: 19500, //    F31 ($ — estimated resale of the bought asset at term end)
  leaseResidual: 0, //           F33 ($ — any residual credited against the lease)

  // Per-year repair estimates, hard-coded on the Buy sheet (Buy!D21:M21, years 1–10)
  buyRepairs: [250, 250, 1500, 250, 250, 500, 3500, 2000, 1500, 1000]
}

/**
 * Build the loan's annual interest, annual principal and year-end balance from a
 * month-by-month amortisation (workbook `Interest` sheet).
 *
 *   - Table    (loanType 'T'): equal instalments (annuity). interest = balance ×
 *              rate/12; principal = payment − interest. (`Interest` cols F/G, rows 14/7)
 *   - Reducing (loanType 'R'): equal principal = loan/term; interest = balance ×
 *              rate/12; the payment declines. (`Interest` cols N/O, rows 13/6)
 *
 * @param {boolean} isReducing
 * @param {number} principal      amount financed (purchasePrice − deposit)
 * @param {number} monthlyRate    annual rate / 12
 * @param {number} termMonths
 * @param {number} years          how many yearly buckets to return
 * @returns {{annualInterest: number[], annualPrincipal: number[], yearEndBalance: number[]}}
 *   each array is length `years`, index 0 = year 1
 */
function amortise (isReducing, principal, monthlyRate, termMonths, years) {
  const annualInterest = new Array(years).fill(0)
  const annualPrincipal = new Array(years).fill(0)
  const yearEndBalance = new Array(years).fill(0)

  const payment = isReducing ? 0 : annuityPayment(monthlyRate, termMonths, principal)
  const levelPrincipal = div(principal, termMonths)
  let balance = principal

  for (let m = 1; m <= termMonths; m++) {
    const interest = balance * monthlyRate
    const principalPaid = isReducing ? levelPrincipal : (payment - interest)
    balance -= principalPaid
    const y = Math.ceil(m / 12) - 1
    if (y < years) {
      annualInterest[y] += interest
      annualPrincipal[y] += principalPaid
    }
  }

  // Year-end balances: replay the running balance at each 12-month boundary, floored
  // at 0 exactly as the sheet does (`Interest` W9/W10 use if(bal<0,0,bal)).
  let bal = principal
  for (let y = 0; y < years; y++) {
    const monthsThisYear = Math.min(12, Math.max(0, termMonths - y * 12))
    for (let k = 0; k < monthsThisYear; k++) {
      const interest = bal * monthlyRate
      const principalPaid = isReducing ? levelPrincipal : (payment - interest)
      bal -= principalPaid
    }
    yearEndBalance[y] = bal > 0 ? bal : 0
  }

  return { annualInterest, annualPrincipal, yearEndBalance }
}

/**
 * Build the asset's depreciation schedule (workbook `Depreciation` sheet).
 *   - Straight-Line ('sl'): flat charge = cost × rate every year; remaining value
 *     declines by that charge, floored at 0. (`Depreciation` rows 15/16)
 *   - Diminishing-Value ('dv'): charge = prior written-down value × rate; the WDV
 *     declines by each year's charge. (`Depreciation` rows 18/19)
 *
 * @param {boolean} isDiminishing
 * @param {number} cost           purchase price
 * @param {number} rate           depreciation rate
 * @param {number} years
 * @returns {{charge: number[], remainingValue: number[]}} each length `years`, index 0 = year 1
 */
function depreciate (isDiminishing, cost, rate, years) {
  const charge = new Array(years).fill(0)
  const remainingValue = new Array(years).fill(0)
  let wdv = cost

  for (let y = 0; y < years; y++) {
    if (isDiminishing) {
      charge[y] = wdv * rate //                    C18 = cost×rate; D18 = prior-WDV×rate
    } else {
      charge[y] = cost * rate //                   C15:M15 flat cost×rate (fidelity note in header)
    }
    const next = wdv - charge[y]
    remainingValue[y] = next > 0 ? next : 0 //     if(prev − charge < 0, 0, …)
    wdv = remainingValue[y]
  }

  return { charge, remainingValue }
}

/**
 * Compute the full Lease vs Buy comparison from a flat inputs object.
 *
 * @param {object} inputs  any subset of DEFAULT_INPUTS' keys; missing keys fall back
 *                         to the workbook sample and are named in `defaultedInputs`.
 * @returns {object} the assembled payload (see the return statement).
 */
function computeLeaseVsBuy (inputs) {
  const src = (inputs && typeof inputs === 'object') ? inputs : {}
  const defaultedInputs = []

  /** Pick a numeric field, recording a fallback in `defaultedInputs`. */
  const n = (key) => {
    if (src[key] === undefined || src[key] === null || src[key] === '') {
      defaultedInputs.push(key)
      return DEFAULT_INPUTS[key]
    }
    return num(src[key], DEFAULT_INPUTS[key])
  }
  /** Pick a lower-cased text field ('t'/'r', 'sl'/'dv', 'yes'/'no'), recording fallbacks. */
  const txt = (key) => {
    if (src[key] === undefined || src[key] === null || src[key] === '') {
      defaultedInputs.push(key)
      return String(DEFAULT_INPUTS[key]).toLowerCase()
    }
    return String(src[key]).toLowerCase()
  }

  // ---- inputs ----
  const loanType = txt('loanType')
  const deposit = n('deposit')
  const interestRate = n('interestRate')
  const termMonths = n('termMonths')
  const purchasePrice = n('purchasePrice')
  const depreciationMethod = txt('depreciationMethod')
  const depreciationRate = n('depreciationRate')
  const companyTaxRate = n('companyTaxRate')
  const gstRate = n('gstRate')
  const kmPerMonth = n('kmPerMonth')
  const inflationRate = n('inflationRate')
  const servicePeriodKm = n('servicePeriodKm')
  const warrantyServiceCost = n('warrantyServiceCost')
  const insurancePerYear = n('insurancePerYear')
  const tyresCost = n('tyresCost')
  const tyreLifeKm = n('tyreLifeKm')
  const leaseTermMonths = n('leaseTermMonths')
  const annualLeaseKm = n('annualLeaseKm')
  const costPerKmOver = n('costPerKmOver')
  const costPerPanel = n('costPerPanel')
  const numPanels = n('numPanels')
  const monthlyLeasePayment = n('monthlyLeasePayment')
  const includesServicing = txt('includesServicing')
  const includesInsurance = txt('includesInsurance')
  const includesTyres = txt('includesTyres')
  const assetResaleValue = n('assetResaleValue')
  const leaseResidual = n('leaseResidual')

  // Per-year repairs: an array, else fall back to the workbook's series (either a
  // missing or a wrong-typed value falls back — and is flagged, never silently used).
  let buyRepairs = DEFAULT_INPUTS.buyRepairs
  if (Array.isArray(src.buyRepairs)) {
    buyRepairs = src.buyRepairs
  } else {
    defaultedInputs.push('buyRepairs')
  }

  // ---- shared quantities ----
  const kmAnnual = kmPerMonth * 12 //                              Input!I12 = I10×12
  const isReducing = loanType === 'r' //                           anything not 'r' → Table (annuity)
  const isDiminishing = depreciationMethod !== 'sl' //             anything not 'sl' → Diminishing
  const financed = purchasePrice - deposit //                      loan principal (Interest C21−C15)
  const monthlyRate = div(interestRate, 12)

  const loan = amortise(isReducing, financed, monthlyRate, termMonths, BUY_YEARS)
  const dep = depreciate(isDiminishing, purchasePrice, depreciationRate, BUY_YEARS)

  // Flat annual running costs (same every year the loan is live).
  const buyServicing = div(kmAnnual, servicePeriodKm) * warrantyServiceCost //  Buy!D18
  const buyTyres = div(tyresCost, tyreLifeKm) * kmPerMonth * 12 //              Buy!D20

  // ================= BUY =================
  const buyYears = []
  let buyGross = 0
  let costOfCapital = deposit * interestRate //                    Buy!D12 = deposit×rate; then ×(1+rate)/yr
  let salesTaxRebate = (purchasePrice * gstRate) * interestRate //  Buy!D25; then declines by inflation/yr
  for (let y = 0; y < BUY_YEARS; y++) {
    const whatYouvePaid = loan.annualInterest[y] + loan.annualPrincipal[y] //   Buy!D8
    const pmtsPlusCapital = whatYouvePaid + costOfCapital //                    Buy!D14
    const manualRepairs = num(buyRepairs[y], 0) //                              Buy!D21:M21
    const servicingCosts = buyServicing + insurancePerYear + buyTyres + manualRepairs // Buy!D23
    const interestTaxDeduction = loan.annualInterest[y] * companyTaxRate //     Buy!D26
    const depreciationTaxRebate = dep.charge[y] * companyTaxRate //             Buy!D27
    const servicingTaxDeduction = servicingCosts * companyTaxRate //            Buy!D28
    const totalTaxRebates = salesTaxRebate + interestTaxDeduction +
      depreciationTaxRebate + servicingTaxDeduction //                         Buy!D30
    // Net cost only accrues while the loan is still being paid (Buy!D3 gate D8>1).
    const netCost = whatYouvePaid > 1
      ? (pmtsPlusCapital + servicingCosts) - totalTaxRebates
      : 0
    buyGross += netCost

    buyYears.push({
      year: y + 1,
      whatYouvePaid, //         paid this year (interest + principal)
      owed: loan.yearEndBalance[y], //   Buy!D9 — remaining loan balance at year end
      worth: dep.remainingValue[y], //   Buy!D10 — depreciated asset value (display)
      costOfCapital,
      servicingCosts,
      totalTaxRebates,
      netCost
    })

    costOfCapital = costOfCapital + (costOfCapital * interestRate) //           Buy!E12…
    salesTaxRebate = salesTaxRebate - (salesTaxRebate * inflationRate) //       Buy!E25…
  }
  const buyTotalNet = buyGross - assetResaleValue //               Input!I31 = D31 − F31

  // ================= LEASE =================
  const leaseTermYears = leaseTermMonths / 12
  const annualLease = monthlyLeasePayment * 12 //                  Lease!D11 (= 734×12), net of GST
  const leaseYears = []
  let leaseGrossYears = 0
  for (let y = 0; y < LEASE_YEARS; y++) {
    const withinTerm = (y + 1) <= leaseTermYears
    const netLeasePayment = withinTerm ? annualLease : 0 //         Lease!D11
    const leaseServicing = (withinTerm && includesServicing !== 'yes') //         Lease!D21
      ? div(kmAnnual, servicePeriodKm) * warrantyServiceCost
      : 0
    const leaseInsurance = (withinTerm && includesInsurance !== 'yes') //         Lease!D22
      ? insurancePerYear
      : 0
    const leaseTyres = (withinTerm && includesTyres !== 'yes') //                 Lease!D23
      ? div(tyresCost, tyreLifeKm) * kmPerMonth * 12
      : 0
    const leaseServicingCosts = leaseServicing + leaseInsurance + leaseTyres // Lease!D26
    const leaseTaxRebateOnPmt = netLeasePayment > 1 ? netLeasePayment * companyTaxRate : 0 // Lease!D28
    const leaseServicingTaxRebate = leaseServicingCosts * companyTaxRate //     Lease!D29
    const leaseTaxRebate = leaseTaxRebateOnPmt + leaseServicingTaxRebate //     Lease!D31
    // Net cost only accrues while the lease is live (Lease!D3 gate D11>1).
    const netCost = netLeasePayment > 1
      ? (netLeasePayment + leaseServicingCosts) - leaseTaxRebate
      : 0
    leaseGrossYears += netCost
    leaseYears.push({ year: y + 1, netLeasePayment, servicingCosts: leaseServicingCosts, netCost })
  }

  // Lease-end costs (Lease!D34/D35/D37).
  const leaseEndRefurb = costPerPanel * numPanels //               Lease!D34 = N12×N14
  const kmDrivenOverTerm = kmPerMonth * leaseTermMonths //         Lease!U28 = I10×N6
  const kmAllowedOverTerm = annualLeaseKm * leaseTermYears //      Lease!W28 = N8 = M8×(N6/12)
  const excessKmLevy = kmDrivenOverTerm > kmAllowedOverTerm //      Lease!D35
    ? (kmDrivenOverTerm - kmAllowedOverTerm) * costPerKmOver
    : 0
  const leaseEndCosts = excessKmLevy + leaseEndRefurb //           Lease!D37

  // Total Lease Cost — lease-end costs counted ONCE (the corrected Lease!K3), then
  // the residual subtracted (Input!I33 = D33 − F33). See the header CORRECTION note.
  const leaseGross = leaseGrossYears + leaseEndCosts //            corrected Lease!K3
  const leaseTotalNet = leaseGross - leaseResidual //             Input!I33 (corrected)

  // ================= VERDICT =================
  // Input!K31 = if(I31 > I33, "Lease!", "Buy!") — name the cheaper option.
  const recommended = buyTotalNet > leaseTotalNet ? 'lease' : 'buy'
  const cheaperCost = Math.min(buyTotalNet, leaseTotalNet)
  const dearerCost = Math.max(buyTotalNet, leaseTotalNet)

  return {
    verdict: {
      recommended, //           'lease' | 'buy' — the cheaper choice
      cheaperCost, //           whole-of-life cost of the recommended option
      dearerCost, //            whole-of-life cost of the other option
      saving: dearerCost - cheaperCost //  how much the recommendation saves
    },
    buy: {
      grossTotal: buyGross, //       Input!D31 = Buy!O3
      resaleValue: assetResaleValue, // Input!F31
      totalNet: buyTotalNet, //      Input!I31
      loanMethod: isReducing ? 'reducing' : 'table',
      years: buyYears
    },
    lease: {
      grossTotal: leaseGross, //     corrected Lease!K3 (lease-end costs counted once)
      residual: leaseResidual, //    Input!F33
      totalNet: leaseTotalNet, //    Input!I33 (corrected)
      endCosts: {
        refurb: leaseEndRefurb, //   Lease!D34
        excessKmLevy, //             Lease!D35
        total: leaseEndCosts //      Lease!D37
      },
      years: leaseYears
    },
    defaultedInputs
  }
}

module.exports = {
  DEFAULT_INPUTS,
  computeLeaseVsBuy,
  amortise,
  depreciate,
  annuityPayment,
  BUY_YEARS,
  LEASE_YEARS
}
