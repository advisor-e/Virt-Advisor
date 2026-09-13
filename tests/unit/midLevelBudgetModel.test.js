'use strict'

const {
  DEFAULT_INPUTS,
  DEFAULT_DEBTOR_PROFILE,
  DEFAULT_CREDITOR_PROFILE,
  DEPOSIT_LINES,
  VARIABLE_COST_LINES,
  GST_EXPENSE_LINES,
  NON_GST_EXPENSE_LINES,
  applyTiming,
  balanceOf,
  computeSide,
  computeVariance,
  computeMidLevelBudget
} = require('../../server/report/midLevelBudgetModel')

/**
 * GOLDEN TEST — Mid Level Budget.
 *
 * Every expected number below is the source workbook's OWN cached value, read straight out of
 * `design/report-source-models/Mid Level Budget.xlsx` (all five sheets), EXCEPT where a case is
 * explicitly marked as a ruled deviation. Cell references are given so any figure can be checked
 * against the workbook by hand.
 *
 * 🔴 THE THREE RULED DEVIATIONS — Mike, 2026-09-13. Each is stated in full in the model's header;
 * the block "Deviations from the workbook" at the foot of this file pins every figure that moves,
 * with the workbook's own cached value beside ours.
 *
 *   1. The fourth-month collection bucket applies in every month it reaches, not only the first.
 *   2. The entered figures are GST-inclusive, so the GST block is a reading and does not move
 *      the bank (carried unchanged from the High Level ruling of 2026-09-12).
 *   3. Tax Rebates, Interest Received and Capital Introduced are out of the GST base.
 *
 * Deviations 1 and 3 move NO figure in the workbook's own sample — they bite only for a client
 * who uses the rows in question, which is exactly when the source was wrong. Both are therefore
 * proved on constructed cases as well as asserted on the sample.
 */

// The workbook stores full floating-point values; 6dp is comfortably tighter than any figure
// the report displays, while tolerating IEEE noise.
const P = 6

// The sample is reached by asking for it. Called with nothing this model computes nothing —
// see the "computes nothing when asked for nothing" case below.
const model = computeMidLevelBudget(DEFAULT_INPUTS)
const budget = model.budget
const actual = model.actual
const variance = model.variance

// Column D is April, the first month — index 0. Column O is March, the last — index 11.
const APR = 0
const MAY = 1
const MAR = 11

/** `Budget Figures` D9:O9 — the sample year's sales, used by the constructed cases below. */
const SAMPLE_SALES = [25000, 35000, 45000, 15000, 25000, 30000, 12500, 25000, 35000, 40000, 25000, 35800]

const sum = arr => arr.reduce((s, n) => s + n, 0)

describe('Mid Level Budget — golden values from Mid Level Budget.xlsx', () => {
  describe('The line set matches the sheet', () => {
    it('holds the six deposit rows, 9 to 14', () => {
      expect(DEPOSIT_LINES.map(l => l.row)).toEqual([9, 10, 11, 12, 13, 14])
    })

    it('holds the variable-cost row, 20, on its own above the gross profit line', () => {
      // Row 20 is deliberately NOT part of SUBTOTAL WITHDRAWALS (row 64, SUM(D28:D62)) — the
      // sheet keeps it separate so GROSS PROFIT can be struck at row 24.
      expect(VARIABLE_COST_LINES.map(l => l.row)).toEqual([20])
    })

    it('holds the twenty-seven GST-bearing expense rows, 28 to 54', () => {
      expect(GST_EXPENSE_LINES).toHaveLength(27)
      expect(GST_EXPENSE_LINES[0].row).toBe(28)
      expect(GST_EXPENSE_LINES[26].row).toBe(54)
    })

    it('holds the five non-GST expense rows, 58 to 62', () => {
      expect(NON_GST_EXPENSE_LINES.map(l => l.row)).toEqual([58, 59, 60, 61, 62])
    })

    it('rides the line list on the response, so the screen holds no second copy', () => {
      // A screen that re-declared these 39 keys would be free to drift from the model with
      // nothing to catch it. The list travels with the figures instead.
      expect(model.lineOrder).toHaveLength(39) // 6 deposits + 1 variable cost + 27 GST + 5 non-GST
      expect(model.lineOrder[0]).toEqual({ key: 'sales', row: 9, group: 'deposit' })
      expect(model.lineOrder.filter(l => l.group === 'deposit')).toHaveLength(6)
      expect(model.lineOrder.filter(l => l.group === 'variableCost')).toHaveLength(1)
      expect(model.lineOrder.filter(l => l.group === 'gstExpense')).toHaveLength(27)
      expect(model.lineOrder.filter(l => l.group === 'nonGstExpense')).toHaveLength(5)
      // Every line it names is a line the model actually returns figures for.
      model.lineOrder.forEach((l) => {
        expect(Array.isArray(model.budget.lines[l.key])).toBe(true)
        expect(model.budget.lines[l.key]).toHaveLength(12)
      })
    })
  })

  describe('Sheet 1: Assumptions — the two timing profiles', () => {
    it('reads the collection profile the sheet ships with', () => {
      expect(model.assumptions.debtors).toEqual([0.2, 0.45, 0.3, 0.05, 0]) //   F8:F12
      expect(DEFAULT_DEBTOR_PROFILE).toEqual([0.2, 0.45, 0.3, 0.05, 0])
    })

    it('reads the supplier payment profile the sheet ships with', () => {
      expect(model.assumptions.creditors).toEqual([0.3, 0.65, 0.05, 0, 0]) //   F23:F27
      expect(DEFAULT_CREDITOR_PROFILE).toEqual([0.3, 0.65, 0.05, 0, 0])
    })

    it('breaks the first month\'s sale into its five instalments', () => {
      // M8:M12 — April's 25,000 at 20/45/30/5/0. The one place the sheet shows the timing
      // working on a single figure, and the model computes it so the screen never has to.
      expect(model.assumptions.firstMonthSpread.invoiced).toBeCloseTo(25000, P) // M6
      expect(model.assumptions.firstMonthSpread.amounts[0]).toBeCloseTo(5000, P) //  M8
      expect(model.assumptions.firstMonthSpread.amounts[1]).toBeCloseTo(11250, P) // M9
      expect(model.assumptions.firstMonthSpread.amounts[2]).toBeCloseTo(7500, P) //  M10
      expect(model.assumptions.firstMonthSpread.amounts[3]).toBeCloseTo(1250, P) //  M11
      expect(model.assumptions.firstMonthSpread.amounts[4]).toBeCloseTo(0, P) //     M12
      // They add back to the month's sale, because the sample profile is complete.
      expect(sum(model.assumptions.firstMonthSpread.amounts)).toBeCloseTo(25000, P)
    })

    it('reports each profile\'s balance, and both sample profiles are complete', () => {
      expect(model.assumptions.debtorsBalance).toBeCloseTo(0, P) //             G13
      expect(model.assumptions.creditorsBalance).toBeCloseTo(0, P) //           G28
    })

    it('reports an incomplete profile rather than scaling it to fit', () => {
      // The sheet computes with what it was given and shows the shortfall. Silently normalising
      // a client's assumptions would hide the very thing the balance cell exists to show.
      expect(balanceOf([0.2, 0.45, 0.3, 0, 0])).toBeCloseTo(0.05, P)
      const short = computeMidLevelBudget({
        assumptions: { debtors: [0.2, 0.45, 0.3, 0, 0], creditors: [] },
        budget: { lines: { sales: [1000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] } }
      })
      expect(short.assumptions.debtorsBalance).toBeCloseTo(0.05, P)
      // 95% banked, not 100% — the missing 5% is reported, never invented.
      expect(short.budget.yearToDate.salesCashCollected).toBeCloseTo(950, P)
    })

    it('collects each month\'s sales across the following months', () => {
      // M14:X14 — the column totals of rows 8 to 12.
      expect(budget.salesCashCollected[APR]).toBeCloseTo(5000, P) //            M14
      expect(budget.salesCashCollected[MAY]).toBeCloseTo(18250, P) //           N14
      expect(budget.salesCashCollected[2]).toBeCloseTo(32250, P) //             O14
      expect(budget.salesCashCollected[3]).toBeCloseTo(35000, P) //             P14
      expect(budget.salesCashCollected[MAR]).toBeCloseTo(32160, P) //           X14
      expect(budget.yearToDate.salesCashCollected).toBeCloseTo(308910, P) //    Y14
    })

    it('pays each month\'s purchases across the following months', () => {
      expect(budget.paymentsMade[APR]).toBeCloseTo(3900, P) //                  M29 / D22
      expect(budget.paymentsMade[MAY]).toBeCloseTo(12950, P) //                 N29 / E22
      expect(budget.paymentsMade[2]).toBeCloseTo(15800, P) //                   O29 / F22
      expect(budget.paymentsMade[MAR]).toBeCloseTo(15550, P) //                 X29 / O22
      expect(budget.yearToDate.paymentsMade).toBeCloseTo(165950, P) //          Q22
    })

    it('lets cash falling beyond the twelfth month leave the year, as the sheet does', () => {
      // 348,300 of sales, 308,910 collected. The 39,390 difference is what a one-year grid
      // cannot hold: sales made late in the year and collected after it. None is invented.
      expect(budget.yearToDate.lines.sales).toBeCloseTo(348300, P) //           Q9
      expect(budget.yearToDate.lines.sales - budget.yearToDate.salesCashCollected)
        .toBeCloseTo(39390, P)
    })
  })

  describe('Sheet 2: Budget Figures — April (column D)', () => {
    it('banks the timed collection, not the sales invoiced', () => {
      expect(budget.subtotalDeposits[APR]).toBeCloseTo(5250, P) //              D16
      expect(budget.subtotalDeposits[MAY]).toBeCloseTo(18500, P) //             E16
      expect(budget.subtotalDeposits[MAR]).toBeCloseTo(32410, P) //             O16
      expect(budget.yearToDate.subtotalDeposits).toBeCloseTo(311910, P) //      Q16
    })

    it('strikes the gross profit above the expense block', () => {
      expect(budget.grossProfit[APR]).toBeCloseTo(1350, P) //                   D24
      expect(budget.grossProfit[MAY]).toBeCloseTo(5550, P) //                   E24
      expect(budget.grossProfit[MAR]).toBeCloseTo(16860, P) //                  O24
      expect(budget.yearToDate.grossProfit).toBeCloseTo(145960, P) //           Q24
    })

    it('subtotals the withdrawals without the purchases line', () => {
      expect(budget.subtotalWithdrawals[APR]).toBeCloseTo(17500, P) //          D64
      expect(budget.yearToDate.subtotalWithdrawals).toBeCloseTo(210000, P) //   Q64
    })

    it('splits the GST-related deposits and withdrawals out', () => {
      expect(budget.gstRelatedDeposits[APR]).toBeCloseTo(5000, P) //            D66
      expect(budget.gstRelatedDeposits[MAY]).toBeCloseTo(18250, P) //           E66
      // The purchases actually PAID are in the base, not the purchases invoiced.
      expect(budget.gstRelatedWithdrawals[APR]).toBeCloseTo(6650, P) //         D67
      expect(budget.gstRelatedWithdrawals[MAY]).toBeCloseTo(15700, P) //        E67
    })

    it('computes the GST movements at the sheet\'s 15%', () => {
      expect(budget.gstInput[APR]).toBeCloseTo(867.3913043478, P) //            D70
      expect(budget.gstOutput[APR]).toBeCloseTo(652.1739130435, P) //           D71
      expect(budget.netCashRelatedToGst[APR]).toBeCloseTo(215.2173913043, P) // D72
      expect(budget.yearToDate.gstInput).toBeCloseTo(25950, P) //               Q70
      expect(budget.yearToDate.gstOutput).toBeCloseTo(40292.6086956522, P) //   Q71
      expect(budget.yearToDate.netCashRelatedToGst).toBeCloseTo(-14342.6086956522, P) // Q72
    })

    it('opens the year on the sheet\'s own opening balance', () => {
      expect(budget.openingBankBalance[APR]).toBeCloseTo(10000, P) //           D76
    })

    it('totals the year in column Q', () => {
      expect(budget.yearToDate.lines.nonGstSales).toBeCloseTo(3000, P) //       Q14
      expect(budget.yearToDate.lines.materialPurchases).toBeCloseTo(180600, P) // Q20
      expect(budget.yearToDate.lines.car).toBeCloseTo(6000, P) //               Q28
      expect(budget.yearToDate.lines.wages).toBeCloseTo(168000, P) //           Q58
      expect(budget.yearToDate.lines.interestOnlyLoanPayments).toBeCloseTo(9000, P) // Q59
    })

    it('reconciles: opening plus the year\'s net change equals the closing balance', () => {
      // Not a source cell — a cross-check that the two routes through the sheet agree.
      expect(budget.openingBalance + budget.yearToDate.netChangeInBank)
        .toBeCloseTo(budget.closingBalance, 3)
    })
  })

  describe('Sheet 3: Actual Figures — no timing, because an actual is what happened', () => {
    it('banks the figures entered, exactly as the sheet\'s sum(D9:D14) does', () => {
      expect(actual.subtotalDeposits[APR]).toBeCloseTo(25250, P) //             D16
      expect(actual.subtotalDeposits[MAR]).toBeCloseTo(36050, P) //             O16
      expect(actual.yearToDate.subtotalDeposits).toBeCloseTo(351300, P) //      Q16
    })

    it('pays the purchases entered, exactly as the sheet\'s =D20 does', () => {
      expect(actual.paymentsMade[APR]).toBeCloseTo(13000, P) //                 D22
      expect(actual.yearToDate.paymentsMade).toBeCloseTo(180600, P) //          Q22
    })

    it('🔴 differs from the budget side on identical figures, and that is the design', () => {
      // The same sales are entered on both sheets. The budget's are collected over five months
      // and the actuals' are not, so the two subtotals must NOT agree — the gap is the cash
      // still owed at year end. Stated as a test because it is the easiest thing to mistake for
      // a bug. See the asymmetry note in the model's header.
      expect(budget.yearToDate.lines.sales).toBeCloseTo(actual.yearToDate.lines.sales, P)
      expect(actual.yearToDate.subtotalDeposits - budget.yearToDate.subtotalDeposits)
        .toBeCloseTo(39390, P)
    })

    it('strikes its gross profit and subtotals the withdrawals', () => {
      expect(actual.grossProfit[APR]).toBeCloseTo(12250, P) //                  D24
      expect(actual.yearToDate.grossProfit).toBeCloseTo(170700, P) //           Q24
      expect(actual.subtotalWithdrawals[APR]).toBeCloseTo(17500, P) //          D64
      expect(actual.yearToDate.subtotalWithdrawals).toBeCloseTo(212900, P) //   Q64
    })

    it('computes the GST movements', () => {
      expect(actual.gstRelatedDeposits[APR]).toBeCloseTo(25000, P) //           D66
      expect(actual.gstRelatedWithdrawals[APR]).toBeCloseTo(15750, P) //        D67
      expect(actual.gstInput[APR]).toBeCloseTo(2054.347826087, P) //            D70
      expect(actual.gstOutput[APR]).toBeCloseTo(3260.8695652174, P) //          D71
      expect(actual.netCashRelatedToGst[APR]).toBeCloseTo(-1206.5217391304, P) // D72
      expect(actual.yearToDate.gstInput).toBeCloseTo(28239.1304347826, P) //    Q70
      expect(actual.yearToDate.gstOutput).toBeCloseTo(45430.4347826087, P) //   Q71
      expect(actual.yearToDate.netCashRelatedToGst).toBeCloseTo(-17191.3043478261, P) // Q72
    })

    it('keeps the lines that vary month to month', () => {
      expect(actual.yearToDate.lines.car).toBeCloseTo(7600, P) //               Q28
      expect(actual.yearToDate.lines.entertainment).toBeCloseTo(2350, P) //     Q32
      expect(actual.yearToDate.lines.principalLoanRepayments).toBeCloseTo(6750, P) // Q48
    })

    it('opens the year on the sheet\'s own opening balance', () => {
      expect(actual.openingBankBalance[APR]).toBeCloseTo(10000, P) //           D76
    })
  })

  describe('Sheet 4: Cashflow Variances — April', () => {
    it('computes each line as actual less budget', () => {
      expect(variance.lines.sales[APR]).toBeCloseTo(0, P) //                    D9
      expect(variance.lines.materialPurchases[APR]).toBeCloseTo(0, P) //        D20
      expect(variance.lines.car[APR]).toBeCloseTo(0, P) //                      D28
      expect(variance.lines.car[MAY]).toBeCloseTo(250, P) //                    E28
      expect(variance.lines.entertainment[MAY]).toBeCloseTo(150, P) //          E32
      expect(variance.lines.principalLoanRepayments[2]).toBeCloseTo(250, P) //  F48
      expect(variance.lines.wages[APR]).toBeCloseTo(0, P) //                    D58
    })

    it('leaves a line blank where no actual was entered — not zero', () => {
      // The source's IF(actual<>"", …, ""). A budgeted line with no actual yet must not read as
      // a shortfall of its whole budget.
      expect(variance.lines.taxRebates[APR]).toBeNull() //                      D10
      expect(variance.lines.interestReceived[APR]).toBeNull() //                D11
      expect(variance.lines.insurance[APR]).toBeNull() //                       D40
    })

    it('takes the computed rows as actual-computed less budget-computed', () => {
      expect(variance.subtotalDeposits[APR]).toBeCloseTo(20000, P) //           D16
      expect(variance.paymentsMade[APR]).toBeCloseTo(9100, P) //                D22
      expect(variance.grossProfit[APR]).toBeCloseTo(10900, P) //                D24
      expect(variance.subtotalWithdrawals[APR]).toBeCloseTo(0, P) //            D64
      expect(variance.gstRelatedDeposits[APR]).toBeCloseTo(20000, P) //         D66
      expect(variance.gstRelatedWithdrawals[APR]).toBeCloseTo(9100, P) //       D67
      expect(variance.gstInput[APR]).toBeCloseTo(1186.9565217391, P) //         D70
      expect(variance.gstOutput[APR]).toBeCloseTo(2608.6956521739, P) //        D71
      expect(variance.netCashRelatedToGst[APR]).toBeCloseTo(-1421.7391304348, P) // D72
      expect(variance.openingBankBalance[APR]).toBeCloseTo(0, P) //             D76
    })
  })

  describe('Sheet 5: Reports — the two comparisons it charts', () => {
    it('pairs budget and actual revenue, month by month', () => {
      // E65:P65 and E66:P66.
      expect(model.reports.budgetRevenue).toEqual(budget.subtotalDeposits)
      expect(model.reports.budgetRevenue[APR]).toBeCloseTo(5250, P) //          E65
      expect(model.reports.budgetRevenue[MAR]).toBeCloseTo(32410, P) //         P65
      expect(model.reports.actualRevenue[APR]).toBeCloseTo(25250, P) //         E66
      expect(model.reports.actualRevenue[MAR]).toBeCloseTo(36050, P) //         P66
    })

    it('counts the purchases paid in the expense comparison, as the sheet does', () => {
      // E71 is `'Budget Figures'!D64+'Budget Figures'!D22` — withdrawals PLUS payments made.
      expect(model.reports.budgetExpenses[APR]).toBeCloseTo(21400, P) //        E71
      expect(model.reports.budgetExpenses[MAR]).toBeCloseTo(33050, P) //        P71
      expect(model.reports.actualExpenses[APR]).toBeCloseTo(30500, P) //        E72
      expect(model.reports.actualExpenses[MAR]).toBeCloseTo(37500, P) //        P72
    })
  })

  describe('🔴 Deviation 1 — the fourth-month collection bucket (Mike, 2026-09-13)', () => {
    // `Assumptions` row 12 is a shared formula over Q12:X12 whose master reads `M6*L12` — a
    // relative reference where its four siblings, and all five creditor rows, are absolute.
    // Expanded, R12 becomes `N6*M12` and so on, every one pointing at an empty cell.

    it('applies the bucket in every month it reaches, not only the first', () => {
      const tail = applyTiming(SAMPLE_SALES, [0, 0, 0, 0, 0.10])
      // The first three months are before the bucket can reach anything.
      expect(tail[0]).toBeCloseTo(0, P)
      expect(tail[3]).toBeCloseTo(0, P)
      // Month 5 (Q12) — the one month the workbook also gets right: 10% of April's 25,000.
      expect(tail[4]).toBeCloseTo(2500, P)
      // Month 6 (R12) — 10% of May's 35,000. The workbook computes ZERO here, and in every
      // month after it.
      expect(tail[5]).toBeCloseTo(3500, P)
      expect(tail[MAR]).toBeCloseTo(2500, P) //  10% of November's 25,000
    })

    it('recovers 18,750 of real cash on the workbook\'s own sample year', () => {
      // The whole of the bucket across the year is 10% of the first eight months' sales.
      const tail = applyTiming(SAMPLE_SALES, [0, 0, 0, 0, 0.10])
      expect(sum(tail)).toBeCloseTo(21250, P)
      // The workbook computes 2,500 of that — one month. The missing 18,750 is 5.4% of the
      // year's 348,300 of revenue, and the sheet's balance cell reports the profile complete
      // throughout.
      expect(sum(tail) - 2500).toBeCloseTo(18750, P)
    })

    it('reports the profile as complete either way, which is why nothing catches it', () => {
      // G13 reads zero whether the bucket works or not: it sums the percentages, not the cash.
      expect(balanceOf([0.2, 0.45, 0.2, 0.05, 0.10])).toBeCloseTo(0, P)
    })

    it('moves no figure in the sample, where the bucket is empty', () => {
      expect(model.assumptions.debtors[4]).toBe(0)
      expect(budget.yearToDate.salesCashCollected).toBeCloseTo(308910, P) //    Y14
    })
  })

  describe('🔴 Deviation 2 — GST-inclusive figures, and GST out of the bank', () => {
    // Mike's ruling of 2026-09-12 on the High Level workbook, carried here unchanged: these are
    // the same rows with the same formulas. Each case gives OUR figure with the workbook's own
    // cached value in the comment.

    it('moves the bank by deposits less payments and withdrawals, and nothing else', () => {
      for (const m of [APR, 5, MAR]) {
        expect(budget.netChangeInBank[m]).toBeCloseTo(
          budget.subtotalDeposits[m] - budget.paymentsMade[m] - budget.subtotalWithdrawals[m], P)
        expect(budget.addTotalNetDeposits[m]).toBeCloseTo(budget.subtotalDeposits[m], P)
        expect(budget.lessTotalNetWithdrawals[m])
          .toBeCloseTo(budget.paymentsMade[m] + budget.subtotalWithdrawals[m], P)
      }
    })

    it('rolls the budget bank forward on the ruled figures', () => {
      // D74 — workbook −16,365.21739.
      expect(budget.netChangeInBank[APR]).toBeCloseTo(-16150, P)
      // D77/D78/D79/D80 — workbook 5,902.173913 / 15,902.17391 / 22,267.3913 / −6,365.217391.
      expect(budget.addTotalNetDeposits[APR]).toBeCloseTo(5250, P)
      expect(budget.fundsAvailable[APR]).toBeCloseTo(15250, P)
      expect(budget.lessTotalNetWithdrawals[APR]).toBeCloseTo(21400, P)
      expect(budget.closingBankBalance[APR]).toBeCloseTo(-6150, P)
      // E76 = D80 — each month opens on the last month's close.
      expect(budget.openingBankBalance[MAY]).toBeCloseTo(-6150, P)
      // E80 — workbook −17,982.6087.
      expect(budget.closingBankBalance[MAY]).toBeCloseTo(-18100, P)
    })

    it('closes the budget year on the ruled figure, not the workbook\'s', () => {
      // Q74 — workbook −49,697.3913.
      expect(budget.yearToDate.netChangeInBank).toBeCloseTo(-64040, P)
      // O80 — workbook −39,697.3913. The difference is the whole year's net GST held.
      expect(budget.closingBankBalance[MAR]).toBeCloseTo(-54040, P)
      expect(budget.closingBalance).toBeCloseTo(-54040, P)
    })

    it('closes the actual year on the ruled figure, not the workbook\'s', () => {
      // D74 — workbook −4,043.478261.
      expect(actual.netChangeInBank[APR]).toBeCloseTo(-5250, P)
      // D80 — workbook 5,956.521739.
      expect(actual.closingBankBalance[APR]).toBeCloseTo(4750, P)
      // Q74 — workbook −25,008.69565.
      expect(actual.yearToDate.netChangeInBank).toBeCloseTo(-42200, P)
      // O80 — workbook −15,008.69565.
      expect(actual.closingBalance).toBeCloseTo(-32200, P)
    })

    it('reports the GST being held as a reading, rather than banking it', () => {
      // The money in the account that belongs to Inland Revenue: GST collected less GST paid.
      expect(budget.gstHeld[APR]).toBeCloseTo(-215.2173913043, P)
      expect(budget.yearToDate.gstHeld).toBeCloseTo(14342.6086956522, P)
      expect(actual.yearToDate.gstHeld).toBeCloseTo(17191.3043478261, P)
      // And each side's gap to the workbook's closing balance is precisely that figure.
      expect(-39697.3913043478 - budget.closingBalance).toBeCloseTo(budget.yearToDate.gstHeld, 3)
      expect(-15008.6956521739 - actual.closingBalance).toBeCloseTo(actual.yearToDate.gstHeld, 3)
    })

    it('reconciles both sides on their own terms', () => {
      expect(actual.openingBalance + actual.yearToDate.netChangeInBank)
        .toBeCloseTo(actual.closingBalance, 3)
    })
  })

  describe('🔴 Deviation 3 — income that bears no GST is out of the base', () => {
    it('takes GST on deposits from rows 9 and 13 only', () => {
      // The source's row 66 is `D16-D14` — every deposit except Non GST Related Sales, which
      // sweeps in Tax Rebates, Interest Received and Capital Introduced.
      expect(DEPOSIT_LINES.filter(l => l.gst).map(l => l.row)).toEqual([9, 13])
      expect(DEPOSIT_LINES.filter(l => !l.gst).map(l => l.row)).toEqual([10, 11, 12, 14])
    })

    it('moves no figure in the sample, where all three rows are empty', () => {
      expect(budget.gstRelatedDeposits[APR]).toBeCloseTo(5000, P) //            D66
      expect(actual.gstRelatedDeposits[APR]).toBeCloseTo(25000, P) //           D66
    })

    it('banks a rebate, interest and introduced capital in full, and taxes none of them', () => {
      const withExempt = computeSide({
        openingBalance: 0,
        lines: {
          sales: [1000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          taxRebates: [200, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          interestReceived: [300, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          capitalIntroduced: [500, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          nonGstSales: [250, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        }
      }, 0.15)
      // Every one of them reaches the bank.
      expect(withExempt.subtotalDeposits[APR]).toBeCloseTo(2250, P)
      // The workbook's base would be 2,000 here — everything but the non-GST sales. Ours is the
      // 1,000 of sales alone, and the output tax follows it.
      expect(withExempt.gstRelatedDeposits[APR]).toBeCloseTo(1000, P)
      expect(withExempt.gstOutput[APR]).toBeCloseTo(1000 - (1000 / 1.15), P)
    })

    it('keeps Other in the base, as the source has it', () => {
      const withOther = computeSide({
        openingBalance: 0,
        lines: {
          sales: [1000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          other: [400, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        }
      }, 0.15)
      expect(withOther.gstRelatedDeposits[APR]).toBeCloseTo(1400, P)
    })
  })

  describe('computeMidLevelBudget — the whole model', () => {
    it('returns all five sheets', () => {
      const r = computeMidLevelBudget(DEFAULT_INPUTS)
      expect(r.assumptions.debtors).toEqual([0.2, 0.45, 0.3, 0.05, 0])
      expect(r.budget.subtotalDeposits[APR]).toBeCloseTo(5250, P)
      expect(r.actual.subtotalWithdrawals[APR]).toBeCloseTo(17500, P)
      expect(r.variance.subtotalDeposits[APR]).toBeCloseTo(20000, P)
      expect(r.reports.budgetExpenses[APR]).toBeCloseTo(21400, P)
    })

    it('🔴 computes NOTHING when asked for nothing — never the workbook sample', () => {
      // A Report-class model holds a real client's figures. Restify hands an absent JSON body
      // over as {}, so an empty call must produce an empty budget rather than a plausible one.
      // This is the fault found live on the dashboard-reports route, 2026-09-07.
      for (const called of [computeMidLevelBudget(), computeMidLevelBudget({}), computeMidLevelBudget(null)]) {
        expect(called.budget.subtotalDeposits.every(v => v === 0)).toBe(true)
        expect(called.budget.paymentsMade.every(v => v === 0)).toBe(true)
        expect(called.actual.subtotalWithdrawals.every(v => v === 0)).toBe(true)
        expect(called.budget.closingBalance).toBe(0)
        expect(called.reports.budgetRevenue.every(v => v === 0)).toBe(true)
        // And no variance is invented where nothing was entered.
        expect(called.variance.lines.sales.every(v => v === null)).toBe(true)
      }
    })

    it('🔴 invents no collection pattern when the client has not given one', () => {
      // The profiles deliberately do NOT default. A budget with sales but no assumptions banks
      // nothing, which is visible and wrong-looking, rather than quietly assuming 100% cash.
      const noProfile = computeMidLevelBudget({ budget: { lines: { sales: SAMPLE_SALES } } })
      expect(noProfile.assumptions.debtors).toEqual([0, 0, 0, 0, 0])
      expect(noProfile.assumptions.debtorsBalance).toBeCloseTo(1, P)
      expect(noProfile.budget.yearToDate.salesCashCollected).toBeCloseTo(0, P)
    })

    it('runs the sample year April 2021 to March 2022', () => {
      expect(model.months).toHaveLength(12)
      expect(model.months[APR]).toBe('2021-04-01') // D6, Excel serial 44287
      expect(model.months[MAR]).toBe('2022-03-01') // O6, Excel serial 44621
      expect(model.gstRate).toBeCloseTo(0.15, P) //  Assumptions F34
    })

    it('applies a different GST rate without disturbing the lines', () => {
      const r = computeMidLevelBudget(Object.assign({}, DEFAULT_INPUTS, { gstRate: 0.10 }))
      expect(r.budget.gstOutput[APR]).toBeCloseTo(5000 - (5000 / 1.1), P)
      expect(r.budget.subtotalDeposits[APR]).toBeCloseTo(5250, P)
    })

    it('takes one side without inventing the other', () => {
      const r = computeMidLevelBudget({
        assumptions: { debtors: [1, 0, 0, 0, 0], creditors: [1, 0, 0, 0, 0] },
        budget: { openingBalance: 0, lines: { sales: [10000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] } }
      })
      expect(r.budget.subtotalDeposits[APR]).toBeCloseTo(10000, P)
      // A budget with no actuals yet is empty on the actual side, not the workbook's.
      expect(r.actual.subtotalDeposits[APR]).toBe(0)
      expect(r.variance.lines.sales[APR]).toBeNull()
    })
  })

  describe('input hardening', () => {
    it('coerces numeric strings arriving as JSON text', () => {
      const r = computeMidLevelBudget({
        assumptions: { debtors: ['1', '0', '0', '0', '0'], creditors: [] },
        budget: { openingBalance: '10000', lines: { sales: ['25000', '35000'] } }
      })
      expect(r.budget.subtotalDeposits[APR]).toBeCloseTo(25000, P)
      expect(r.budget.openingBankBalance[APR]).toBeCloseTo(10000, P)
    })

    it('treats an entered zero as entered, and a blank as blank', () => {
      const r = computeMidLevelBudget({
        budget: { lines: { sales: [100, 100] } },
        actual: { lines: { sales: [0, null] } }
      })
      expect(r.variance.lines.sales[APR]).toBeCloseTo(-100, P) // entered zero → a real variance
      expect(r.variance.lines.sales[MAY]).toBeNull() //           blank → blank
    })

    it('pads a short month array rather than producing holes', () => {
      const r = computeMidLevelBudget({
        assumptions: { debtors: [1, 0, 0, 0, 0], creditors: [] },
        budget: { lines: { sales: [100] } }
      })
      expect(r.budget.lines.sales).toHaveLength(12)
      expect(r.budget.salesCashCollected).toHaveLength(12)
      expect(r.budget.subtotalDeposits[MAR]).toBeCloseTo(0, P)
    })

    it('pads a short timing profile rather than producing holes', () => {
      const r = computeMidLevelBudget({
        assumptions: { debtors: [0.5], creditors: [0.5] },
        budget: { lines: { sales: [100, 100] } }
      })
      expect(r.assumptions.debtors).toEqual([0.5, 0, 0, 0, 0])
      expect(r.assumptions.debtorsBalance).toBeCloseTo(0.5, P)
      expect(r.budget.salesCashCollected[APR]).toBeCloseTo(50, P)
    })

    it('never produces NaN or Infinity', () => {
      const r = computeMidLevelBudget({
        gstRate: 0,
        assumptions: { debtors: [1, 0, 0, 0, 0], creditors: [1, 0, 0, 0, 0] },
        budget: { openingBalance: 0, lines: {} },
        actual: { openingBalance: 0, lines: {} }
      })
      // JSON.stringify turns NaN and Infinity into null; the only legitimate nulls in this model
      // are blank variance cells, and with no actuals entered every one of them is blank.
      expect(JSON.stringify(r.budget)).not.toMatch(/null/)
      expect(r.budget.gstInput[APR]).toBe(0)
    })

    it('survives malformed input rather than throwing', () => {
      expect(() => computeMidLevelBudget(null)).not.toThrow()
      expect(() => computeMidLevelBudget({ budget: 'nonsense', actual: 42 })).not.toThrow()
      expect(() => computeMidLevelBudget({ assumptions: 'nonsense' })).not.toThrow()
      expect(() => computeMidLevelBudget({ assumptions: { debtors: 'nonsense' } })).not.toThrow()
      expect(() => computeMidLevelBudget({ budget: { lines: { sales: 'nonsense' } } })).not.toThrow()
      expect(() => computeVariance(computeSide(null, 0.15), computeSide(null, 0.15))).not.toThrow()
    })
  })
})
