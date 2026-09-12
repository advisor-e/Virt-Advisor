'use strict'

/**
 * High Level Budget — calculation engine.
 *
 * Port of `design/report-source-models/High Level Budget.xlsx` — all four sheets:
 *
 *   1. `Budget Figures`      — a forecast monthly cashflow over one financial year: six deposit
 *                              lines, twenty-seven GST-bearing expense lines, a separate non-GST
 *                              block (wages, interest-only loan payments), the GST input/output
 *                              calculation, and a bank balance rolled forward month to month.
 *   2. `Actual Figures`      — the identical row set, actuals entered against it.
 *   3. `Cashflow Variances`  — actual less budget, line by line, BLANK where no actual has been
 *                              entered yet (the source's `IF(actual<>"", actual-budget, "")`).
 *   4. `Reports`             — two comparisons drawn as charts: budget vs actual revenue, and
 *                              budget vs actual expenses.
 *
 * The sample year is April 2021 to March 2022 (`Budget Figures` D6:O6, Excel serials
 * 44287–44621) and GST is one cell, V3, at 15%.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * 🔴 ONE RULED DEVIATION FROM THE SOURCE — Mike, 2026-09-12.
 *
 * The workbook adds up its two subtotal rows THREE DIFFERENT WAYS across its three sheets:
 *
 *   Subtotal Deposits (row 16)     Budget `SUM(D9:D14)` · Actuals `SUM(D9:D13)` · Variances `SUM(D9:D13)`
 *   Subtotal Withdrawals (row 56)  Budget `SUM(D20:D54)` · Actuals `SUM(D20:D46)` · Variances `SUM(D20:D51)`
 *
 * The consequence is not cosmetic. The Actuals sheet's withdrawals subtotal excludes rows 50–54 —
 * **Wages (150,000 a year in the sample) and Interest Only Loan Payments (9,900)** — so those
 * 159,900 never reduce the actual bank balance either, and the `Reports` sheet charts budget
 * expenses of 210,000 against actual expenses of 36,300: an apparent saving of 173,700 where the
 * true variance is 13,800.
 *
 * That is a like-for-like failure in the one comparison the model exists to make, so it is NOT
 * reproduced. **Every individual line is ported exactly as the workbook has it; the two subtotals
 * are computed once, on the `Budget Figures` sheet's full ranges, on all three sides.** Each
 * figure this moves is listed against the workbook's own cached value in
 * `tests/unit/highLevelBudgetModel.test.js`.
 *
 * Note what the ruling does NOT change: the variance subtotals are unaffected, because the
 * `Cashflow Variances` sheet already summed the wages and interest rows. It is the Actuals sheet
 * alone that was dropping them.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * 🔴 TWO FURTHER RULED DEVIATIONS — Mike, 2026-09-12 (item 4.89), both in the GST block.
 *
 * **1 · Interest Received is NOT in the GST base.** The source's `GST Related Deposits` (row 58)
 * is `D9+D11+D13` — Sales, Interest Received and Other. It rightly leaves out Tax Rebates and
 * Capital Introduced, but interest is an **exempt financial supply** in New Zealand and carries
 * no GST, so including it computes output tax on income that never bore any. The base is now
 * Sales and Other. **This moves no figure in the sample**, where Interest Received is empty on
 * both sides — it bites only for a client who actually has interest income, which is exactly
 * when the source was wrong.
 *
 * **2 · The entered figures are GST-INCLUSIVE, and the GST block no longer feeds the bank.**
 * The source could not decide: `Output (Income Related)` (row 63) extracts GST from a figure that
 * already contains it (`D58-(D58/(1+rate))`), and then `Add Total (Net) Deposits` (row 69) ADDS
 * that same GST on top — which is only right if the figure had been GST-exclusive, in which case
 * the GST would be `D58*rate`. Both cannot be true. The withdrawals side settles it: an owner
 * budgeting "Car: 500 a month" means 500 leaving the bank, GST and all. So the extraction is the
 * right formula and rows 66, 69 and 71 were counting the GST a second time.
 *
 * Rows 69 and 71 are now the subtotals alone, and `NET CHANGE IN BANK BALANCE` (row 66) is simply
 * deposits less withdrawals. The GST rows survive as a **reading** — `gstHeld` is the GST
 * collected less the GST paid, the money sitting in the bank that belongs to Inland Revenue — and
 * the GST return itself is entered as a withdrawal when it is paid, like any other payment.
 *
 * **This one moves real figures**, and they are listed against the workbook's own cached values
 * in the golden test: on the sample year the budgeted closing balance falls from **192,426 to
 * 151,300** and the actual from **143,565 to 109,300**, the source having overstated the year-end
 * cash position by the whole of the net GST — about 27%.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 *
 * FIDELITY NOTES — reproduced exactly as the source has them, NOT "corrected":
 *
 *   - **The source's own spellings** — "Stationary & Supplies", "Travelling & Accomodation",
 *     "Principle Loan Repayments" — are recorded here for provenance only. Screen wording is
 *     Mike's to rule and lives in `locales/`, never here.
 *   - **The bank block (rows 68–72) has no year-to-date column in the source** and none is
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
 * `gst` marks the rows that carry GST. The source's `GST Related Deposits` (row 58) is
 * `D9+D11+D13`; row 11, Interest Received, is excluded here on Mike's ruling of 2026-09-12 —
 * interest is an exempt financial supply and bears no GST. See the header.
 */
const DEPOSIT_LINES = [
  { key: 'sales', row: 9, gst: true }, //              Sales
  { key: 'taxRebates', row: 10, gst: false }, //       Tax Rebates
  { key: 'interestReceived', row: 11, gst: false }, // Interest Received — exempt supply (4.89)
  { key: 'capitalIntroduced', row: 12, gst: false }, // Capital Introduced
  { key: 'other', row: 13, gst: true }, //             Other
  { key: 'nonGstSales', row: 14, gst: false } //       Non GST Related Sales
]

/**
 * GST-bearing expense lines — `Budget Figures` rows 20 to 46. These, and only these, are the
 * base for `GST Related Withdrawals` (row 59, `sum(D20:D46)`).
 */
const GST_EXPENSE_LINES = [
  { key: 'car', row: 20 }, //                      Car
  { key: 'bankFees', row: 21 }, //                 Bank Fees
  { key: 'creditCardCharges', row: 22 }, //        Credit Card Charges
  { key: 'computer', row: 23 }, //                 Computer ( Hardware & Software)
  { key: 'entertainment', row: 24 }, //            Entertainment
  { key: 'generalExpenses', row: 25 }, //          General Expenses
  { key: 'printing', row: 26 }, //                 Printing
  { key: 'stationeryAndSupplies', row: 27 }, //    Stationary & Supplies  [source spelling]
  { key: 'vehicleLeases', row: 28 }, //            Vehicle Leases
  { key: 'telephone', row: 29 }, //                Telephone, Tolls & E-Mail
  { key: 'cellPhone', row: 30 }, //                Cell Phone
  { key: 'travelAndAccommodation', row: 31 }, //   Travelling & Accomodation  [source spelling]
  { key: 'insurance', row: 32 }, //                Insurance
  { key: 'accounting', row: 33 }, //               Accounting
  { key: 'provisionForTaxation', row: 34 }, //     Provision for Taxation
  { key: 'fringeBenefitTax', row: 35 }, //         Fringe Benefit Tax
  { key: 'legal', row: 36 }, //                    Legal
  { key: 'lowCostAssets', row: 37 }, //            Low Cost Assets
  { key: 'plantAndEquipment', row: 38 }, //        Plant & Equipment
  { key: 'drawings', row: 39 }, //                 Drawings
  { key: 'principalLoanRepayments', row: 40 }, //  Principle Loan Repayments  [source spelling]
  { key: 'other1', row: 41 }, //                   Other 1
  { key: 'other2', row: 42 }, //                   Other 2
  { key: 'other3', row: 43 }, //                   Other 3
  { key: 'other4', row: 44 }, //                   Other 4
  { key: 'other5', row: 45 }, //                   Other 5
  { key: 'other6', row: 46 } //                    Other 6
]

/**
 * Non-GST expense lines — `Budget Figures` rows 50 to 54, under the sheet's own
 * "NON GST RELATED WITHDRAWALS" heading (row 48).
 *
 * 🔴 These are the rows the Actuals sheet drops from its subtotal. See the ruled deviation above.
 */
const NON_GST_EXPENSE_LINES = [
  { key: 'wages', row: 50 }, //                        Wages
  { key: 'interestOnlyLoanPayments', row: 51 }, //     Interest Only Loan Payments
  { key: 'otherNonGst1', row: 52 }, //                 Other 1
  { key: 'otherNonGst2', row: 53 }, //                 Other 2
  { key: 'otherNonGst3', row: 54 } //                  Other 3
]

/** Every expense line, in sheet order — the full `SUM(D20:D54)` range of the Budget sheet. */
const EXPENSE_LINES = GST_EXPENSE_LINES.concat(NON_GST_EXPENSE_LINES)

/** Every line the model holds, in sheet order. */
const ALL_LINES = DEPOSIT_LINES.concat(EXPENSE_LINES)

/**
 * The line list as the SCREEN consumes it — key, sheet row, and which block it belongs to.
 *
 * It rides on the response rather than being re-declared in the component, so there is exactly
 * one list of these 32 lines in the codebase. A second copy in the screen would be free to drift
 * from this one with nothing to catch it, which is the fault `single-source-wiring` exists to
 * prevent. `group` is what the screen draws its three sub-headings from.
 */
const LINE_ORDER = DEPOSIT_LINES.map(l => ({ key: l.key, row: l.row, group: 'deposit' }))
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

/** Repeat one figure across all twelve months — most of the sample budget is flat. */
function flat (v) {
  const out = []
  for (let m = 0; m < MONTHS; m++) { out.push(v) }
  return out
}

/** `Budget Figures` — the sheet's own sample figures. Blank rows are simply absent. */
const DEFAULT_BUDGET = {
  openingBalance: 10000, // D68
  lines: {
    sales: [25000, 35000, 45000, 15000, 25000, 30000, 12500, 25000, 35000, 40000, 25000, 35800], // D9:O9
    nonGstSales: flat(250), //             D14:O14
    car: flat(500), //                     D20:O20
    entertainment: flat(150), //           D24:O24
    vehicleLeases: flat(1000), //          D28:O28
    accounting: flat(600), //              D33:O33
    principalLoanRepayments: flat(500), // D40:O40
    wages: flat(14000), //                 D50:O50
    interestOnlyLoanPayments: flat(750) // D51:O51
  }
}

/** `Actual Figures` — the sheet's own sample figures. */
const DEFAULT_ACTUAL = {
  openingBalance: 6500, // D68
  lines: {
    sales: [15000, 18000, 20000, 14000, 25000, 26000, 27000, 28000, 30000, 31000, 32000, 33000], // D9:O9
    car: flat(450), //                     D20:O20
    entertainment: flat(250), //           D24:O24
    printing: flat(175), //                D26:O26
    vehicleLeases: flat(1050), //          D28:O28
    accounting: flat(600), //              D33:O33
    principalLoanRepayments: flat(500), // D40:O40
    wages: flat(12500), //                 D50:O50
    interestOnlyLoanPayments: flat(825) // D51:O51
  }
}

const DEFAULT_INPUTS = {
  gstRate: 0.15, // V3
  months: DEFAULT_MONTHS.slice(),
  budget: { openingBalance: DEFAULT_BUDGET.openingBalance, lines: Object.assign({}, DEFAULT_BUDGET.lines) },
  actual: { openingBalance: DEFAULT_ACTUAL.openingBalance, lines: Object.assign({}, DEFAULT_ACTUAL.lines) }
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
 * Row references are the source's. Note `subtotalDeposits` and `subtotalWithdrawals` use the
 * Budget sheet's full ranges on BOTH sides, per the ruled deviation in this file's header.
 *
 * @param {object} [side] - { openingBalance, lines }
 * @param {number} [gstRate] - the rate in V3, as a fraction
 * @returns {object} every row the sheet computes, as twelve-month arrays
 */
function computeSide (side, gstRate) {
  const rate = num(gstRate, 0.15)
  const { openingBalance, values, filled } = normaliseSide(side)

  const sumLines = (lines, m) => lines.reduce((s, l) => s + values[l.key][m], 0)

  const subtotalDeposits = [] //        row 16 — SUM(D9:D14)
  const subtotalWithdrawals = [] //     row 56 — SUM(D20:D54)
  const gstRelatedDeposits = [] //      row 58 — D9+D11+D13
  const gstRelatedWithdrawals = [] //   row 59 — sum(D20:D46)
  const gstInput = [] //                row 62 — D59-(D59/(1+rate))
  const gstOutput = [] //               row 63 — D58-(D58/(1+rate))
  const netCashRelatedToGst = [] //     row 64 — D62-D63
  const gstHeld = [] //                 not a source row — GST collected less GST paid (4.89)
  const netChangeInBank = [] //         row 66 — D16-(D56+D64)
  const openingBankBalance = [] //      row 68 — typed, then the prior month's closing
  const addTotalNetDeposits = [] //     row 69 — D16+D63
  const fundsAvailable = [] //          row 70 — SUM(D68:D69), unlabelled in the sheet
  const lessTotalNetWithdrawals = [] // row 71 — D56+D62
  const closingBankBalance = [] //      row 72 — D70-D71

  const gstDepositLines = DEPOSIT_LINES.filter(l => l.gst)

  for (let m = 0; m < MONTHS; m++) {
    const deposits = sumLines(DEPOSIT_LINES, m)
    const withdrawals = sumLines(EXPENSE_LINES, m)
    const gstDeposits = sumLines(gstDepositLines, m)
    const gstWithdrawals = sumLines(GST_EXPENSE_LINES, m)

    // The entered figures are GST-INCLUSIVE (Mike, 2026-09-12), so extraction is the right
    // formula — this is the GST already sitting inside the figures above, not an addition to
    // them. It is a reading; it does NOT move the bank. See the header.
    const input = gstWithdrawals - (gstWithdrawals / (1 + rate))
    const output = gstDeposits - (gstDeposits / (1 + rate))
    const netGst = input - output

    const opening = m === 0 ? openingBalance : closingBankBalance[m - 1]
    // Rows 69 and 71 are the subtotals alone. The source added `output` here and `input` below,
    // counting GST a second time when it was already inside the figures — which overstated the
    // sample year's closing balance by 41,126 (about 27%).
    const added = deposits
    const available = opening + added
    const taken = withdrawals

    subtotalDeposits.push(deposits)
    subtotalWithdrawals.push(withdrawals)
    gstRelatedDeposits.push(gstDeposits)
    gstRelatedWithdrawals.push(gstWithdrawals)
    gstInput.push(input)
    gstOutput.push(output)
    netCashRelatedToGst.push(netGst)
    // The GST collected less the GST paid: money in the bank that belongs to Inland Revenue.
    // A reading, not a movement — the return itself is entered as a withdrawal when it is paid.
    gstHeld.push(output - input)
    netChangeInBank.push(deposits - withdrawals)
    openingBankBalance.push(opening)
    addTotalNetDeposits.push(added)
    fundsAvailable.push(available)
    lessTotalNetWithdrawals.push(taken)
    closingBankBalance.push(available - taken)
  }

  // Column Q — the source totals the line rows, the two subtotals, the GST rows and the net
  // change. It does NOT total the bank block, and none is invented here.
  const yearToDate = {
    subtotalDeposits: total(subtotalDeposits),
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
    subtotalDeposits,
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
 * budget. The computed rows are always numbers, because the sheets compute them from formulas
 * that always produce one.
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

  // The subtotals sum the line VARIANCES (the source's own `SUM(D9:D13)` / `SUM(D20:D51)` over
  // the variance rows), not actual-subtotal less budget-subtotal — which is what keeps a blank
  // month blank. The ranges are the full ones, per the ruled deviation.
  const sumVariance = (group, m) => group.reduce((s, l) => s + (lines[l.key][m] === null ? 0 : lines[l.key][m]), 0)

  const diff = (a, b) => {
    const row = []
    for (let m = 0; m < MONTHS; m++) { row.push(a[m] - b[m]) }
    return row
  }

  const subtotalDeposits = []
  const subtotalWithdrawals = []
  for (let m = 0; m < MONTHS; m++) {
    subtotalDeposits.push(sumVariance(DEPOSIT_LINES, m))
    subtotalWithdrawals.push(sumVariance(EXPENSE_LINES, m))
  }

  const yearToDate = { lines: {} }
  ALL_LINES.forEach((l) => {
    const any = lines[l.key].some(v => v !== null)
    yearToDate.lines[l.key] = any ? lines[l.key].reduce((s, v) => s + (v === null ? 0 : v), 0) : null
  })
  yearToDate.subtotalDeposits = total(subtotalDeposits)
  yearToDate.subtotalWithdrawals = total(subtotalWithdrawals)

  return {
    lines,
    subtotalDeposits,
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
 * The whole model — all four sheets.
 *
 * 🔴 **CALLED WITH NOTHING, THIS COMPUTES NOTHING — never the workbook sample.** This is a
 * Report-class model: the figures belong to a real client, so a body that arrives empty must
 * produce an empty budget, not a plausible-looking one. (The same fault was found live on the
 * dashboard-reports route on 2026-09-07, where Restify hands an absent JSON body over as `{}`
 * and sample figures could have reached a client's page.) The workbook's own sample is reached
 * only by passing `DEFAULT_INPUTS` deliberately, which is what the golden test does.
 *
 * `gstRate` and `months` do default, because a rate and a set of axis labels are not client
 * figures and the model cannot divide by an absent rate.
 *
 * @param {object} [input] - { gstRate, months, budget: { openingBalance, lines },
 *   actual: { openingBalance, lines } }
 * @returns {object} { gstRate, months, budget, actual, variance, reports }
 */
function computeHighLevelBudget (input) {
  const i = (input && typeof input === 'object') ? input : {}
  const gstRate = i.gstRate === undefined ? DEFAULT_INPUTS.gstRate : num(i.gstRate, DEFAULT_INPUTS.gstRate)
  const months = Array.isArray(i.months) && i.months.length === MONTHS ? i.months.slice() : DEFAULT_MONTHS.slice()

  const budget = computeSide(i.budget, gstRate)
  const actual = computeSide(i.actual, gstRate)
  const variance = computeVariance(budget, actual)

  return {
    gstRate,
    months,
    // The 32 lines in sheet order, so the screen never holds a second copy of this list.
    lineOrder: LINE_ORDER.map(l => ({ key: l.key, row: l.row, group: l.group })),
    budget,
    actual,
    variance,
    // Sheet 4, `Reports` — the two comparisons it charts, rows 65/66 and 71/72.
    reports: {
      budgetRevenue: budget.subtotalDeposits.slice(),
      actualRevenue: actual.subtotalDeposits.slice(),
      budgetExpenses: budget.subtotalWithdrawals.slice(),
      actualExpenses: actual.subtotalWithdrawals.slice()
    }
  }
}

module.exports = {
  MONTHS,
  DEPOSIT_LINES,
  GST_EXPENSE_LINES,
  NON_GST_EXPENSE_LINES,
  EXPENSE_LINES,
  ALL_LINES,
  LINE_ORDER,
  DEFAULT_MONTHS,
  DEFAULT_INPUTS,
  computeSide,
  computeVariance,
  computeHighLevelBudget
}
