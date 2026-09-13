'use strict'

/**
 * Mid Level Budget — calculation engine.
 *
 * Port of `design/report-source-models/Mid Level Budget.xlsx` — all five sheets:
 *
 *   1. `Assumptions`         — two cash-timing profiles. What share of a month's SALES is
 *                              collected in that month and the next four (rows 8–12), and what
 *                              share of a month's PURCHASES is paid over the same span (rows
 *                              23–27). Each carries a `balance` cell — 100% less the entered
 *                              shares — so an advisor can see the profile is complete. The GST
 *                              rate lives here too, at F34, and `Budget Figures` V3 reads it.
 *   2. `Budget Figures`      — a forecast monthly cashflow over one financial year: six deposit
 *                              lines, a Material/Product Purchases line with its own timed
 *                              PAYMENTS MADE and a GROSS PROFIT line, twenty-seven GST-bearing
 *                              expense lines, a separate non-GST block (wages, interest-only loan
 *                              payments), the GST input/output calculation, and a bank balance
 *                              rolled forward month to month.
 *   3. `Actual Figures`      — the identical row set, actuals entered against it.
 *   4. `Cashflow Variances`  — actual less budget, line by line, BLANK where no actual has been
 *                              entered yet (the source's `IF(actual<>"", actual-budget, "")`).
 *   5. `Reports`             — two comparisons drawn as charts: budget vs actual revenue, and
 *                              budget vs actual expenses.
 *
 * The sample year is April 2021 to March 2022 (`Budget Figures` D6:O6, Excel serials
 * 44287–44621) and GST is 15%.
 *
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 * WHAT THIS MODEL ADDS OVER ITS SIBLING, `highLevelBudgetModel.js`
 *
 * The two workbooks share their line set exactly. Mid Level adds the timing: High Level banks a
 * month's sales in the month they are made, whereas here the `Assumptions` profile spreads them
 * across up to five months, and the same for paying suppliers. That is the whole point of the
 * model, and it is why the BUDGET side's deposits and payments are computed rather than entered.
 *
 * 🔴 **THE TWO SIDES ARE DELIBERATELY ASYMMETRIC, AND THIS IS THE SOURCE'S OWN DESIGN.** On the
 * budget side `SUBTOTAL DEPOSITS RECEIVED` (row 16) reads the timed collection and `PAYMENTS MADE`
 * (row 22) reads the timed payment. On the actuals side row 16 is `sum(D9:D14)` and row 22 is
 * simply `=D20` — no timing at all, because an actual is what really happened. The consequence
 * for whoever builds the screen: on the ACTUALS side the advisor enters **cash received** and
 * **cash paid**, not invoiced amounts. Label wording is Mike's to rule and lives in `locales/`.
 * ═════════════════════════════════════════════════════════════════════════════════════════════
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * 🔴 THREE RULED DEVIATIONS FROM THE SOURCE — Mike, 2026-09-13.
 *
 * **1 · The fourth-month collection bucket is applied in EVERY month, not only the first.**
 *
 * Every timing row in the workbook locks its percentage with an absolute reference — `$L$8`,
 * `$L$9`, `$L$10`, `$L$11`, and all five rows of the creditors block, `$L$23` to `$L$27`. One row
 * does not. `Assumptions` row 12, *Debtors collected in the fourth month following sale*, is a
 * shared formula over Q12:X12 whose master reads `M6*L12` — a RELATIVE reference. Expanded, R12
 * becomes `N6*M12`, S12 becomes `O6*N12`, and so on, every one of them pointing at an empty cell.
 * The bucket therefore contributes in its first applicable month and nowhere else.
 *
 * The size of it, on the workbook's own sample year: a client who collects 10% of sales four
 * months later should see **21,250** of cash across the year. The sheet computes **2,500**. The
 * missing **18,750** is 5.4% of the year's revenue, and the sheet's own `balance` cell still
 * reads zero throughout — it reports the profile as adding to 100% while ignoring a fifth of it.
 *
 * This moves NO figure in the sample, where the bucket is empty. It bites only for a client who
 * actually uses it, which is exactly when the source was wrong. Its creditor twin is written
 * correctly, which is how we know this is a slip rather than an intention.
 *
 * **2 · The entered figures are GST-INCLUSIVE, and the GST block does not feed the bank.**
 * Mike's ruling of 2026-09-12 on the High Level workbook, which carries here unchanged because
 * these are the same rows with the same formulas. The source extracts GST from figures that
 * already contain it (rows 70/71, `D67-(D67/(1+rate))`) and then ADDS that same GST back when
 * rolling the bank forward (rows 74, 77 and 79). Both cannot be true, and the withdrawals side
 * settles it: an owner budgeting "Car: 500 a month" means 500 leaving the bank, GST and all.
 *
 * Rows 77 and 79 are now the subtotals alone, and `NET CHANGE IN BANK BALANCE` (row 74) is simply
 * deposits less payments and withdrawals. The GST rows survive as a **reading** — `gstHeld` is
 * the GST collected less the GST paid, the money sitting in the bank that belongs to Inland
 * Revenue — and the GST return itself is entered as a withdrawal when it is paid.
 *
 * This one moves real figures. On the sample year the budgeted closing balance falls from
 * **−39,697.39 to −54,040** and the actual from **−15,008.70 to −32,200**, the source having
 * overstated each by exactly the year's net GST held (14,342.61 and 17,191.30).
 *
 * **3 · Income that bears no GST is out of the GST base.** The source's `GST Related Deposits`
 * (row 66) is `D16-D14` — every deposit except Non GST Related Sales. That leaves **Tax Rebates,
 * Interest Received and Capital Introduced** in the base: a rebate carries no GST, interest is an
 * exempt financial supply (already ruled out of the High Level model on 2026-09-12), and capital
 * introduced is not a supply at all. The base is now the sales cash collected, plus Other.
 *
 * **This moves no figure in the sample**, where all three rows are empty on both sides.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 *
 * FIDELITY NOTES — reproduced exactly as the source has them, NOT "corrected":
 *
 *   - **The source's own spellings** — "Stationary & Supplies", "Travelling & Accomodation",
 *     "Principle Loan Repayments" — are recorded here for provenance only. Screen wording is
 *     Mike's to rule and lives in `locales/`, never here.
 *   - **A profile whose shares do not add to 100% is NOT normalised.** The workbook reports the
 *     shortfall in its `balance` cell and computes with what it was given; so does this. Silently
 *     scaling a client's assumptions to fit would hide the very thing the balance cell exists to
 *     show.
 *   - **Cash falling outside the twelve months is not carried.** Sales made in month 10 and
 *     collected in month 13 leave the year, exactly as they do in the sheet. A one-year grid
 *     cannot hold them and none is invented.
 *   - **The bank block (rows 76–80) has no year-to-date column in the source** and none is
 *     invented: the year's figure for a balance is simply the closing balance of the last month.
 *
 * Class: **Report** (see `design/MODEL-CLASSIFICATION.md`) — a client's real budget and real
 * actuals. Never badged "Illustrative".
 *
 * Pure, side-effect free, backend-only per the Stack Constitution.
 */

/** How many months the model covers. The source is a single financial year. */
const MONTHS = 12

/**
 * How many months a sale (or a purchase) can take to turn into cash: the month itself plus the
 * next four. `Assumptions` rows 8–12 and 23–27.
 */
const TIMING_BUCKETS = 5

/**
 * Coerce a value to a finite number (accepts JSON-string numbers), else the fallback.
 * The route receives raw JSON, so a numeric field arriving as text must not string-concatenate.
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

/**
 * Whether a cell was actually filled in.
 *
 * This is the whole of the variance sheet's behaviour and it is NOT the same as "is it zero":
 * the source writes `IF('Actual Figures'!D9<>"", …, "")`, so a month nobody has entered yet
 * produces a blank variance rather than showing the entire budget as a shortfall. An entered
 * zero is a real zero and does produce a variance.
 *
 * @param {*} v
 * @returns {boolean}
 */
function entered (v) {
  if (v === null || v === undefined || v === '') { return false }
  if (typeof v === 'number') { return Number.isFinite(v) }
  return Number.isFinite(parseFloat(v))
}

/** Sum an array of numbers. */
function total (arr) {
  return arr.reduce((s, n) => s + n, 0)
}

/**
 * Deposit lines — `Budget Figures` rows 9 to 14.
 *
 * `gst` marks the rows that carry GST. The source's `GST Related Deposits` (row 66) is `D16-D14`,
 * which sweeps in Tax Rebates, Interest Received and Capital Introduced; all three are excluded
 * here on Mike's ruling of 2026-09-13. See deviation 3 in the header.
 *
 * 🔴 `sales` is the one line the timing profile acts on. On the budget side the figure entered is
 * the sale; the cash is `salesCashCollected`. On the actuals side there is no timing and the
 * figure entered IS the cash.
 */
const DEPOSIT_LINES = [
  { key: 'sales', row: 9, gst: true }, //              Sales
  { key: 'taxRebates', row: 10, gst: false }, //       Tax Rebates          — no GST on a rebate
  { key: 'interestReceived', row: 11, gst: false }, // Interest Received    — exempt supply
  { key: 'capitalIntroduced', row: 12, gst: false }, // Capital Introduced  — not a supply
  { key: 'other', row: 13, gst: true }, //             Other
  { key: 'nonGstSales', row: 14, gst: false } //       Non GST Related Sales
]

/**
 * Variable (job related) costs — `Budget Figures` row 20, under the sheet's own heading at row 18.
 *
 * The only line the creditor timing profile acts on. Its timed cash is `PAYMENTS MADE` (row 22),
 * and it is NOT part of `SUBTOTAL WITHDRAWALS` (row 64, `SUM(D28:D62)`) — the sheet keeps it
 * separate so that `GROSS PROFIT` (row 24) can be struck above the expense block.
 */
const VARIABLE_COST_LINES = [
  { key: 'materialPurchases', row: 20 } //             Material/Product Purchases
]

/**
 * GST-bearing expense lines — `Budget Figures` rows 28 to 54. These, plus `PAYMENTS MADE`, are
 * the base for `GST Related Withdrawals` (row 67, `sum(D28:D54)+D22`).
 */
const GST_EXPENSE_LINES = [
  { key: 'car', row: 28 }, //                      Car
  { key: 'bankFees', row: 29 }, //                 Bank Fees
  { key: 'creditCardCharges', row: 30 }, //        Credit Card Charges
  { key: 'computer', row: 31 }, //                 Computer ( Hardware & Software)
  { key: 'entertainment', row: 32 }, //            Entertainment
  { key: 'generalExpenses', row: 33 }, //          General Expenses
  { key: 'printing', row: 34 }, //                 Printing
  { key: 'stationeryAndSupplies', row: 35 }, //    Stationary & Supplies  [source spelling]
  { key: 'vehicleLeases', row: 36 }, //            Vehicle Leases
  { key: 'telephone', row: 37 }, //                Telephone, Tolls & E-Mail
  { key: 'cellPhone', row: 38 }, //                Cell Phone
  { key: 'travelAndAccommodation', row: 39 }, //   Travelling & Accomodation  [source spelling]
  { key: 'insurance', row: 40 }, //                Insurance
  { key: 'accounting', row: 41 }, //               Accounting
  { key: 'provisionForTaxation', row: 42 }, //     Provision for Taxation
  { key: 'fringeBenefitTax', row: 43 }, //         Fringe Benefit Tax
  { key: 'legal', row: 44 }, //                    Legal
  { key: 'lowCostAssets', row: 45 }, //            Low Cost Assets
  { key: 'plantAndEquipment', row: 46 }, //        Plant & Equipment
  { key: 'drawings', row: 47 }, //                 Drawings
  { key: 'principalLoanRepayments', row: 48 }, //  Principle Loan Repayments  [source spelling]
  { key: 'other1', row: 49 }, //                   Other 1
  { key: 'other2', row: 50 }, //                   Other 2
  { key: 'other3', row: 51 }, //                   Other 3
  { key: 'other4', row: 52 }, //                   Other 4
  { key: 'other5', row: 53 }, //                   Other 5
  { key: 'other6', row: 54 } //                    Other 6
]

/**
 * Non-GST expense lines — `Budget Figures` rows 58 to 62, under the sheet's own
 * "NON GST RELATED WITHDRAWALS" heading (row 56).
 */
const NON_GST_EXPENSE_LINES = [
  { key: 'wages', row: 58 }, //                        Wages
  { key: 'interestOnlyLoanPayments', row: 59 }, //     Interest Only Loan Payments
  { key: 'otherNonGst1', row: 60 }, //                 Other 1
  { key: 'otherNonGst2', row: 61 }, //                 Other 2
  { key: 'otherNonGst3', row: 62 } //                  Other 3
]

/** Every line inside `SUBTOTAL WITHDRAWALS` — the sheet's `SUM(D28:D62)`. */
const EXPENSE_LINES = GST_EXPENSE_LINES.concat(NON_GST_EXPENSE_LINES)

/** Every line the model holds, in sheet order. */
const ALL_LINES = DEPOSIT_LINES.concat(VARIABLE_COST_LINES).concat(EXPENSE_LINES)

/**
 * The line list as the SCREEN consumes it — key, sheet row, and which block it belongs to.
 *
 * It rides on the response rather than being re-declared in the component, so there is exactly
 * one list of these 39 lines in the codebase. A second copy in the screen would be free to drift
 * from this one with nothing to catch it, which is the fault `single-source-wiring` exists to
 * prevent. `group` is what the screen draws its four sub-headings from.
 */
const LINE_ORDER = DEPOSIT_LINES.map(l => ({ key: l.key, row: l.row, group: 'deposit' }))
  .concat(VARIABLE_COST_LINES.map(l => ({ key: l.key, row: l.row, group: 'variableCost' })))
  .concat(GST_EXPENSE_LINES.map(l => ({ key: l.key, row: l.row, group: 'gstExpense' })))
  .concat(NON_GST_EXPENSE_LINES.map(l => ({ key: l.key, row: l.row, group: 'nonGstExpense' })))

/**
 * The sample year, `Budget Figures` D6:O6 — Excel serials 44287 to 44621, which is the first of
 * each month from April 2021 to March 2022. Held as ISO dates so nothing downstream has to know
 * about Excel's epoch.
 */
const DEFAULT_MONTHS = [
  '2021-04-01', '2021-05-01', '2021-06-01', '2021-07-01', '2021-08-01', '2021-09-01',
  '2021-10-01', '2021-11-01', '2021-12-01', '2022-01-01', '2022-02-01', '2022-03-01'
]

/**
 * `Assumptions` F8:F12 — the collection profile. 20% in the month of sale, 45% the month after,
 * 30% the month after that, 5% the month after that, nothing in the fifth.
 */
const DEFAULT_DEBTOR_PROFILE = [0.2, 0.45, 0.3, 0.05, 0]

/** `Assumptions` F23:F27 — the supplier payment profile. */
const DEFAULT_CREDITOR_PROFILE = [0.3, 0.65, 0.05, 0, 0]

/** Repeat one figure across all twelve months — most of the sample budget is flat. */
function flat (v) {
  const out = []
  for (let m = 0; m < MONTHS; m++) { out.push(v) }
  return out
}

/** `Budget Figures` — the sheet's own sample figures. Blank rows are simply absent. */
const DEFAULT_BUDGET = {
  openingBalance: 10000, // D76
  lines: {
    sales: [25000, 35000, 45000, 15000, 25000, 30000, 12500, 25000, 35000, 40000, 25000, 35800], // D9:O9
    nonGstSales: flat(250), //             D14:O14
    materialPurchases: [13000, 15000, 18000, 12000, 20000, 15000, 5600, 12000, 15000, 22000, 13000, 20000], // D20:O20
    car: flat(500), //                     D28:O28
    entertainment: flat(150), //           D32:O32
    vehicleLeases: flat(1000), //          D36:O36
    accounting: flat(600), //              D41:O41
    principalLoanRepayments: flat(500), // D48:O48
    wages: flat(14000), //                 D58:O58
    interestOnlyLoanPayments: flat(750) // D59:O59
  }
}

/**
 * `Actual Figures` — the sheet's own sample figures.
 *
 * Remember the asymmetry in the header: `sales` and `materialPurchases` here are CASH received
 * and CASH paid, because the actuals side applies no timing.
 */
const DEFAULT_ACTUAL = {
  openingBalance: 10000, // D76
  lines: {
    sales: [25000, 35000, 45000, 15000, 25000, 30000, 12500, 25000, 35000, 40000, 25000, 35800], // D9:O9
    nonGstSales: flat(250), //             D14:O14
    materialPurchases: [13000, 15000, 18000, 12000, 20000, 15000, 5600, 12000, 15000, 22000, 13000, 20000], // D20:O20
    car: [500, 750, 500, 500, 1500, 500, 500, 500, 850, 500, 500, 500], //        D28:O28
    entertainment: [150, 300, 150, 150, 250, 150, 150, 150, 450, 150, 150, 150], // D32:O32
    vehicleLeases: flat(1000), //          D36:O36
    accounting: flat(600), //              D41:O41
    principalLoanRepayments: [500, 500, 750, 500, 500, 1000, 500, 500, 500, 500, 500, 500], // D48:O48
    wages: flat(14000), //                 D58:O58
    interestOnlyLoanPayments: flat(750) // D59:O59
  }
}

const DEFAULT_INPUTS = {
  gstRate: 0.15, // Assumptions F34, read by Budget Figures V3
  months: DEFAULT_MONTHS.slice(),
  assumptions: {
    debtors: DEFAULT_DEBTOR_PROFILE.slice(),
    creditors: DEFAULT_CREDITOR_PROFILE.slice()
  },
  budget: { openingBalance: DEFAULT_BUDGET.openingBalance, lines: Object.assign({}, DEFAULT_BUDGET.lines) },
  actual: { openingBalance: DEFAULT_ACTUAL.openingBalance, lines: Object.assign({}, DEFAULT_ACTUAL.lines) }
}

/**
 * Normalise one timing profile into exactly five shares.
 *
 * Deliberately NOT scaled to 100%: the workbook reports the shortfall rather than correcting it,
 * and so does `balanceOf` below. A client's assumptions are theirs.
 *
 * @param {*} raw - an array of up to five fractions
 * @returns {number[]} five finite numbers
 */
function normaliseProfile (raw) {
  const given = Array.isArray(raw) ? raw : []
  const out = []
  for (let k = 0; k < TIMING_BUCKETS; k++) { out.push(num(given[k])) }
  return out
}

/**
 * `Assumptions` G13 / G28 — 100% less the shares entered. Zero means the profile is complete;
 * anything else is the share of a month's sales (or purchases) the client has not accounted for.
 *
 * @param {number[]} profile
 * @returns {number}
 */
function balanceOf (profile) {
  return 1 - total(profile)
}

/**
 * Spread a line across the months by a timing profile — `Assumptions` rows 8–12 (and 23–27).
 *
 * Month `m` receives `values[m-k] * profile[k]` for each bucket `k`. Cash that would land beyond
 * the twelfth month simply leaves the year, exactly as it does in the sheet.
 *
 * 🔴 Bucket 4 is applied in every month it reaches, not only the first — deviation 1 in the
 * header. The source's `M6*L12` was a relative reference where its four siblings and all five
 * creditor rows are absolute.
 *
 * @param {number[]} values - the twelve entered figures
 * @param {number[]} profile - five shares
 * @returns {number[]} twelve months of cash
 */
function applyTiming (values, profile) {
  const out = []
  for (let m = 0; m < MONTHS; m++) {
    let cash = 0
    for (let k = 0; k < TIMING_BUCKETS; k++) {
      if (m - k >= 0) { cash += values[m - k] * profile[k] }
    }
    out.push(cash)
  }
  return out
}

/**
 * One figure broken into its five instalments — `Assumptions` M8:M12, where the sheet shows a
 * single month's sale turning into cash rather than the whole year at once.
 *
 * Kept here rather than in the screen because calculation is backend-only (Stack Constitution),
 * and because these are real cells: M8 is `M6*$L$8`, M9 is `M6*$L$9`, and so on.
 *
 * @param {number} value - the month's sales
 * @param {number[]} profile - five shares
 * @returns {{ invoiced: number, amounts: number[] }}
 */
function spreadOne (value, profile) {
  const v = num(value)
  return { invoiced: v, amounts: profile.map(share => v * share) }
}

/**
 * Normalise one side's raw input into twelve months per line, keeping a record of which cells
 * were actually filled in — the variance sheet needs that and a bare zero cannot carry it.
 *
 * @param {object} [side] - { openingBalance, lines: { <key>: number[] } }
 * @returns {{ openingBalance: number, values: object, filled: object }}
 */
function normaliseSide (side) {
  const s = (side && typeof side === 'object') ? side : {}
  const raw = (s.lines && typeof s.lines === 'object') ? s.lines : {}
  const values = {}
  const filled = {}

  ALL_LINES.forEach((line) => {
    const given = Array.isArray(raw[line.key]) ? raw[line.key] : []
    const v = []
    const f = []
    for (let m = 0; m < MONTHS; m++) {
      v.push(num(given[m]))
      f.push(entered(given[m]))
    }
    values[line.key] = v
    filled[line.key] = f
  })

  return { openingBalance: num(s.openingBalance), values, filled }
}

/**
 * Compute one side of the model — the `Budget Figures` or `Actual Figures` sheet.
 *
 * Row references are the source's.
 *
 * 🔴 `timing` is what separates the two sides, and passing it is the whole difference between
 * them. With a profile, sales become cash over up to five months and purchases are paid the same
 * way (the budget sheet). Without one, the figures entered ARE the cash (the actuals sheet, whose
 * row 16 is `sum(D9:D14)` and row 22 `=D20`). See the header.
 *
 * @param {object} [side] - { openingBalance, lines }
 * @param {number} [gstRate] - the rate in Assumptions F34, as a fraction
 * @param {object} [timing] - { debtors: number[], creditors: number[] }, or omitted for none
 * @returns {object} every row the sheet computes, as twelve-month arrays
 */
function computeSide (side, gstRate, timing) {
  const rate = num(gstRate, 0.15)
  const { openingBalance, values, filled } = normaliseSide(side)

  const profiles = (timing && typeof timing === 'object') ? timing : null
  const debtors = profiles ? normaliseProfile(profiles.debtors) : null
  const creditors = profiles ? normaliseProfile(profiles.creditors) : null

  // Rows 16 and 22 read these. Without a profile the entered figure is already the cash.
  const salesCashCollected = debtors ? applyTiming(values.sales, debtors) : values.sales.slice()
  const paymentsMade = creditors //                                              row 22
    ? applyTiming(values.materialPurchases, creditors)
    : values.materialPurchases.slice()

  const sumLines = (lines, m) => lines.reduce((s, l) => s + values[l.key][m], 0)

  const subtotalDeposits = [] //        row 16 — Assumptions!M14 + D10:D14
  const grossProfit = [] //             row 24 — D16-D22
  const subtotalWithdrawals = [] //     row 64 — SUM(D28:D62)
  const gstRelatedDeposits = [] //      row 66 — D16-D14, narrowed per deviation 3
  const gstRelatedWithdrawals = [] //   row 67 — sum(D28:D54)+D22
  const gstInput = [] //                row 70 — D67-(D67/(1+rate))
  const gstOutput = [] //               row 71 — D66-(D66/(1+rate))
  const netCashRelatedToGst = [] //     row 72 — D70-D71
  const gstHeld = [] //                 not a source row — GST collected less GST paid
  const netChangeInBank = [] //         row 74 — deposits less payments and withdrawals
  const openingBankBalance = [] //      row 76 — typed, then the prior month's closing
  const addTotalNetDeposits = [] //     row 77 — the deposits subtotal alone
  const fundsAvailable = [] //          row 78 — SUM(D76:D77)
  const lessTotalNetWithdrawals = [] // row 79 — payments plus the withdrawals subtotal
  const closingBankBalance = [] //      row 80 — D78-D79

  // Rows 9 and 13 only — see deviation 3. `sales` contributes its CASH, not the sale.
  const otherGstDepositLines = DEPOSIT_LINES.filter(l => l.gst && l.key !== 'sales')
  // Every deposit line except sales, which is banked as timed cash rather than as entered.
  const nonSalesDepositLines = DEPOSIT_LINES.filter(l => l.key !== 'sales')

  for (let m = 0; m < MONTHS; m++) {
    const deposits = salesCashCollected[m] + sumLines(nonSalesDepositLines, m)
    const payments = paymentsMade[m]
    const withdrawals = sumLines(EXPENSE_LINES, m)
    const gstDeposits = salesCashCollected[m] + sumLines(otherGstDepositLines, m)
    const gstWithdrawals = sumLines(GST_EXPENSE_LINES, m) + payments

    // The entered figures are GST-INCLUSIVE (deviation 2), so extraction is the right formula —
    // this is the GST already sitting inside the figures above, not an addition to them. It is a
    // reading; it does NOT move the bank.
    const input = gstWithdrawals - (gstWithdrawals / (1 + rate))
    const output = gstDeposits - (gstDeposits / (1 + rate))

    const opening = m === 0 ? openingBalance : closingBankBalance[m - 1]
    // Rows 77 and 79 are the subtotals alone. The source added `output` to one and `input` to the
    // other, counting GST a second time when it was already inside the figures.
    const added = deposits
    const available = opening + added
    const taken = payments + withdrawals

    subtotalDeposits.push(deposits)
    grossProfit.push(deposits - payments)
    subtotalWithdrawals.push(withdrawals)
    gstRelatedDeposits.push(gstDeposits)
    gstRelatedWithdrawals.push(gstWithdrawals)
    gstInput.push(input)
    gstOutput.push(output)
    netCashRelatedToGst.push(input - output)
    // The GST collected less the GST paid: money in the bank that belongs to Inland Revenue.
    // A reading, not a movement — the return itself is entered as a withdrawal when it is paid.
    gstHeld.push(output - input)
    netChangeInBank.push(deposits - taken)
    openingBankBalance.push(opening)
    addTotalNetDeposits.push(added)
    fundsAvailable.push(available)
    lessTotalNetWithdrawals.push(taken)
    closingBankBalance.push(available - taken)
  }

  // Column Q — the source totals the line rows, the subtotals, the GST rows and the net change.
  // It does NOT total the bank block, and none is invented here.
  const yearToDate = {
    salesCashCollected: total(salesCashCollected),
    subtotalDeposits: total(subtotalDeposits),
    paymentsMade: total(paymentsMade),
    grossProfit: total(grossProfit),
    subtotalWithdrawals: total(subtotalWithdrawals),
    gstInput: total(gstInput),
    gstOutput: total(gstOutput),
    netCashRelatedToGst: total(netCashRelatedToGst),
    gstHeld: total(gstHeld),
    netChangeInBank: total(netChangeInBank),
    lines: {}
  }
  ALL_LINES.forEach((l) => { yearToDate.lines[l.key] = total(values[l.key]) })

  return {
    openingBalance,
    lines: values,
    filled,
    salesCashCollected,
    subtotalDeposits,
    paymentsMade,
    grossProfit,
    subtotalWithdrawals,
    gstRelatedDeposits,
    gstRelatedWithdrawals,
    gstInput,
    gstOutput,
    netCashRelatedToGst,
    gstHeld,
    netChangeInBank,
    openingBankBalance,
    addTotalNetDeposits,
    fundsAvailable,
    lessTotalNetWithdrawals,
    closingBankBalance,
    // Not a source cell: the year's closing balance is simply the last month's. Named rather
    // than left for a caller to index, so nobody has to know the array is twelve long.
    closingBalance: closingBankBalance[MONTHS - 1],
    yearToDate
  }
}

/**
 * Compute the `Cashflow Variances` sheet — actual less budget.
 *
 * A line-month with no actual entered yields `null`, exactly as the source yields "". A null is
 * skipped by the subtotals, so an unentered March does not read as a shortfall of March's whole
 * budget. The computed rows are always numbers, because both sheets compute them from formulas
 * that always produce one — which is the source's own behaviour: its `IF(actual<>"", …)` test on
 * a computed cell can never be false.
 *
 * @param {object} budget - the output of computeSide()
 * @param {object} actual - the output of computeSide()
 * @returns {object}
 */
function computeVariance (budget, actual) {
  const lines = {}
  ALL_LINES.forEach((l) => {
    const row = []
    for (let m = 0; m < MONTHS; m++) {
      row.push(actual.filled[l.key][m] ? actual.lines[l.key][m] - budget.lines[l.key][m] : null)
    }
    lines[l.key] = row
  })

  const diff = (a, b) => {
    const row = []
    for (let m = 0; m < MONTHS; m++) { row.push(a[m] - b[m]) }
    return row
  }

  // Rows 16, 22 and 64 are computed on both sheets, so the source takes them as
  // actual-computed less budget-computed rather than by summing the variance lines. Row 24 is
  // the variance sheet's own `D16-D22`.
  const subtotalDeposits = diff(actual.subtotalDeposits, budget.subtotalDeposits)
  const paymentsMade = diff(actual.paymentsMade, budget.paymentsMade)
  const subtotalWithdrawals = diff(actual.subtotalWithdrawals, budget.subtotalWithdrawals)
  const grossProfit = []
  for (let m = 0; m < MONTHS; m++) { grossProfit.push(subtotalDeposits[m] - paymentsMade[m]) }

  const yearToDate = { lines: {} }
  ALL_LINES.forEach((l) => {
    const any = lines[l.key].some(v => v !== null)
    yearToDate.lines[l.key] = any ? lines[l.key].reduce((s, v) => s + (v === null ? 0 : v), 0) : null
  })
  yearToDate.subtotalDeposits = total(subtotalDeposits)
  yearToDate.paymentsMade = total(paymentsMade)
  yearToDate.grossProfit = total(grossProfit)
  yearToDate.subtotalWithdrawals = total(subtotalWithdrawals)

  return {
    lines,
    salesCashCollected: diff(actual.salesCashCollected, budget.salesCashCollected),
    subtotalDeposits,
    paymentsMade,
    grossProfit,
    subtotalWithdrawals,
    gstRelatedDeposits: diff(actual.gstRelatedDeposits, budget.gstRelatedDeposits),
    gstRelatedWithdrawals: diff(actual.gstRelatedWithdrawals, budget.gstRelatedWithdrawals),
    gstInput: diff(actual.gstInput, budget.gstInput),
    gstOutput: diff(actual.gstOutput, budget.gstOutput),
    netCashRelatedToGst: diff(actual.netCashRelatedToGst, budget.netCashRelatedToGst),
    gstHeld: diff(actual.gstHeld, budget.gstHeld),
    netChangeInBank: diff(actual.netChangeInBank, budget.netChangeInBank),
    openingBankBalance: diff(actual.openingBankBalance, budget.openingBankBalance),
    addTotalNetDeposits: diff(actual.addTotalNetDeposits, budget.addTotalNetDeposits),
    fundsAvailable: diff(actual.fundsAvailable, budget.fundsAvailable),
    lessTotalNetWithdrawals: diff(actual.lessTotalNetWithdrawals, budget.lessTotalNetWithdrawals),
    closingBankBalance: diff(actual.closingBankBalance, budget.closingBankBalance),
    yearToDate
  }
}

/**
 * The whole model — all five sheets.
 *
 * 🔴 **CALLED WITH NOTHING, THIS COMPUTES NOTHING — never the workbook sample.** This is a
 * Report-class model: the figures belong to a real client, so a body that arrives empty must
 * produce an empty budget, not a plausible-looking one. (The same fault was found live on the
 * dashboard-reports route on 2026-09-07, where Restify hands an absent JSON body over as `{}`
 * and sample figures could have reached a client's page.) The workbook's own sample is reached
 * only by passing `DEFAULT_INPUTS` deliberately, which is what the golden test does.
 *
 * `gstRate` and `months` do default, because a rate and a set of axis labels are not client
 * figures and the model cannot divide by an absent rate. **The timing profiles do NOT default**:
 * they are the client's own assumptions, and an absent profile banks nothing rather than
 * inventing a collection pattern nobody agreed to.
 *
 * @param {object} [input] - { gstRate, months, assumptions: { debtors, creditors },
 *   budget: { openingBalance, lines }, actual: { openingBalance, lines } }
 * @returns {object} { gstRate, months, lineOrder, assumptions, budget, actual, variance, reports }
 */
function computeMidLevelBudget (input) {
  const i = (input && typeof input === 'object') ? input : {}
  const gstRate = i.gstRate === undefined ? DEFAULT_INPUTS.gstRate : num(i.gstRate, DEFAULT_INPUTS.gstRate)
  const months = Array.isArray(i.months) && i.months.length === MONTHS ? i.months.slice() : DEFAULT_MONTHS.slice()

  const raw = (i.assumptions && typeof i.assumptions === 'object') ? i.assumptions : {}
  const debtors = normaliseProfile(raw.debtors)
  const creditors = normaliseProfile(raw.creditors)

  // The budget side is timed; the actuals side is not. See the header.
  const budget = computeSide(i.budget, gstRate, { debtors, creditors })
  const actual = computeSide(i.actual, gstRate)
  const variance = computeVariance(budget, actual)

  return {
    gstRate,
    months,
    // The 39 lines in sheet order, so the screen never holds a second copy of this list.
    lineOrder: LINE_ORDER.map(l => ({ key: l.key, row: l.row, group: l.group })),
    // Sheet 1, `Assumptions` — the profiles, each one's balance cell (G13 / G28), and the
    // first month's sale broken into its five instalments (M8:M12), which is the one place the
    // sheet shows the timing working on a single figure rather than on the whole year.
    assumptions: {
      debtors,
      creditors,
      debtorsBalance: balanceOf(debtors),
      creditorsBalance: balanceOf(creditors),
      firstMonthSpread: spreadOne(budget.lines.sales[0], debtors)
    },
    budget,
    actual,
    variance,
    // Sheet 5, `Reports` — the two comparisons it charts, rows 65/66 and 71/72. Expenses are
    // `SUBTOTAL WITHDRAWALS` plus `PAYMENTS MADE`, which is the source's own E71/E72.
    reports: {
      budgetRevenue: budget.subtotalDeposits.slice(),
      actualRevenue: actual.subtotalDeposits.slice(),
      budgetExpenses: budget.lessTotalNetWithdrawals.slice(),
      actualExpenses: actual.lessTotalNetWithdrawals.slice()
    }
  }
}

module.exports = {
  MONTHS,
  TIMING_BUCKETS,
  DEPOSIT_LINES,
  VARIABLE_COST_LINES,
  GST_EXPENSE_LINES,
  NON_GST_EXPENSE_LINES,
  EXPENSE_LINES,
  ALL_LINES,
  LINE_ORDER,
  DEFAULT_MONTHS,
  DEFAULT_DEBTOR_PROFILE,
  DEFAULT_CREDITOR_PROFILE,
  DEFAULT_INPUTS,
  applyTiming,
  balanceOf,
  spreadOne,
  computeSide,
  computeVariance,
  computeMidLevelBudget
}
