'use strict'

const {
  DEFAULT_INPUTS,
  DEPOSIT_LINES,
  GST_EXPENSE_LINES,
  NON_GST_EXPENSE_LINES,
  computeSide,
  computeVariance,
  computeHighLevelBudget
} = require('../../server/report/highLevelBudgetModel')

/**
 * GOLDEN TEST — High Level Budget.
 *
 * Every expected number below is the source workbook's OWN cached value, read straight out of
 * `design/report-source-models/High Level Budget.xlsx` (all four sheets), EXCEPT where a case is
 * explicitly marked as the ruled deviation. Cell references are given so any figure can be
 * checked against the workbook by hand.
 *
 * 🔴 THE RULED DEVIATION — Mike, 2026-09-12.
 *
 * The workbook computes its two subtotal rows three different ways across its three sheets, and
 * the Actuals sheet's `SUBTOTAL WITHDRAWALS` (`SUM(D20:D46)`) omits rows 50–54 — Wages and
 * Interest Only Loan Payments. All three sides now use the Budget sheet's full ranges
 * (`SUM(D9:D14)` and `SUM(D20:D54)`). The block "Deviations from the workbook" at the foot of
 * this file lists every figure that moves, with the workbook's own cached value beside ours, so
 * the difference is checkable rather than asserted.
 */

// The workbook stores full floating-point values; 6dp is comfortably tighter than any figure
// the report displays, while tolerating IEEE noise.
const P = 6

// The sample is reached by asking for it. Called with nothing this model computes nothing —
// see the "computes nothing when asked for nothing" case below.
const model = computeHighLevelBudget(DEFAULT_INPUTS)
const budget = model.budget
const actual = model.actual
const variance = model.variance

// Column D is April, the first month — index 0. Column O is March, the last — index 11.
const APR = 0
const MAR = 11

describe('High Level Budget — golden values from High Level Budget.xlsx', () => {
  describe('The line set matches the sheet', () => {
    it('holds the six deposit rows, 9 to 14', () => {
      expect(DEPOSIT_LINES.map(l => l.row)).toEqual([9, 10, 11, 12, 13, 14])
    })

    it('holds the twenty-seven GST-bearing expense rows, 20 to 46', () => {
      expect(GST_EXPENSE_LINES).toHaveLength(27)
      expect(GST_EXPENSE_LINES[0].row).toBe(20)
      expect(GST_EXPENSE_LINES[26].row).toBe(46)
    })

    it('holds the five non-GST expense rows, 50 to 54', () => {
      expect(NON_GST_EXPENSE_LINES.map(l => l.row)).toEqual([50, 51, 52, 53, 54])
    })

    it('rides the line list on the response, so the screen holds no second copy', () => {
      // A screen that re-declared these 32 keys would be free to drift from the model with
      // nothing to catch it. The list travels with the figures instead.
      expect(model.lineOrder).toHaveLength(38) // 6 deposits + 27 GST expenses + 5 non-GST
      expect(model.lineOrder[0]).toEqual({ key: 'sales', row: 9, group: 'deposit' })
      expect(model.lineOrder.filter(l => l.group === 'deposit')).toHaveLength(6)
      expect(model.lineOrder.filter(l => l.group === 'gstExpense')).toHaveLength(27)
      expect(model.lineOrder.filter(l => l.group === 'nonGstExpense')).toHaveLength(5)
      // Every line it names is a line the model actually returns figures for.
      model.lineOrder.forEach((l) => {
        expect(Array.isArray(model.budget.lines[l.key])).toBe(true)
        expect(model.budget.lines[l.key]).toHaveLength(12)
      })
    })

    it('🔴 takes GST on deposits from rows 9 and 13 ONLY — interest is an exempt supply', () => {
      // Row 58 is `D9+D11+D13` in the source. Row 11, Interest Received, is out on Mike's
      // ruling of 2026-09-12 (4.89): interest bears no GST here, so including it computed
      // output tax on income that never carried any.
      expect(DEPOSIT_LINES.filter(l => l.gst).map(l => l.row)).toEqual([9, 13])
      // Tax Rebates and Capital Introduced were already out, and stay out.
      expect(DEPOSIT_LINES.filter(l => !l.gst).map(l => l.row)).toEqual([10, 11, 12, 14])
    })

    it('moves no figure in the sample by taking interest out of the GST base', () => {
      // Interest Received is empty on both sides of the workbook's own year, so this ruling
      // changes nothing here — it bites only for a client who actually earns interest.
      const withInterest = computeSide({
        openingBalance: 0,
        lines: { sales: [1000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], interestReceived: [500, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
      }, 0.15)
      // The interest is banked in full and none of it is treated as carrying GST.
      expect(withInterest.subtotalDeposits[APR]).toBeCloseTo(1500, P)
      expect(withInterest.gstRelatedDeposits[APR]).toBeCloseTo(1000, P)
      expect(withInterest.gstOutput[APR]).toBeCloseTo(1000 - (1000 / 1.15), P)
    })
  })

  describe('Sheet 1: Budget Figures — April (column D)', () => {
    it('subtotals the deposits and withdrawals', () => {
      expect(budget.subtotalDeposits[APR]).toBeCloseTo(25250, P) //       D16
      expect(budget.subtotalWithdrawals[APR]).toBeCloseTo(17500, P) //    D56
    })

    it('splits the GST-related deposits and withdrawals out', () => {
      expect(budget.gstRelatedDeposits[APR]).toBeCloseTo(25000, P) //     D58
      expect(budget.gstRelatedWithdrawals[APR]).toBeCloseTo(2750, P) //   D59
    })

    it('computes the GST movements at the sheet\'s 15%', () => {
      expect(budget.gstInput[APR]).toBeCloseTo(358.6956522, P) //         D62
      expect(budget.gstOutput[APR]).toBeCloseTo(3260.869565, P) //        D63
      expect(budget.netCashRelatedToGst[APR]).toBeCloseTo(-2902.173913, P) // D64
    })

    it('computes the net change in the bank balance', () => {
      // D66 — workbook 10,652.17391, which added the GST a second time. See the 4.89 block.
      expect(budget.netChangeInBank[APR]).toBeCloseTo(7750, P)
    })

    it('rolls the bank balance forward', () => {
      expect(budget.openingBankBalance[APR]).toBeCloseTo(10000, P) //     D68
      // D69/D70/D71/D72 — workbook 28,510.86957 / 38,510.86957 / 17,858.69565 / 20,652.17391.
      expect(budget.addTotalNetDeposits[APR]).toBeCloseTo(25250, P) //    D69
      expect(budget.fundsAvailable[APR]).toBeCloseTo(35250, P) //         D70
      expect(budget.lessTotalNetWithdrawals[APR]).toBeCloseTo(17500, P) // D71
      expect(budget.closingBankBalance[APR]).toBeCloseTo(17750, P) //     D72
    })

    it('carries each month\'s closing balance into the next month\'s opening', () => {
      expect(budget.openingBankBalance[1]).toBeCloseTo(17750, P) //       E68 = D72
      expect(budget.closingBankBalance[1]).toBeCloseTo(35500, P) //       E72
      expect(budget.openingBankBalance[MAR]).toBeCloseTo(132750, P) //    O68
    })

    it('closes the year on the ruled figure, not the workbook\'s', () => {
      // O72 — workbook 192,426.087. The difference is the whole year's net GST, 41,126.09.
      expect(budget.closingBankBalance[MAR]).toBeCloseTo(151300, P)
      expect(budget.closingBalance).toBeCloseTo(151300, P)
    })

    it('totals the year in column Q', () => {
      expect(budget.yearToDate.lines.sales).toBeCloseTo(348300, P) //     Q9
      expect(budget.yearToDate.lines.nonGstSales).toBeCloseTo(3000, P) // Q14
      expect(budget.yearToDate.subtotalDeposits).toBeCloseTo(351300, P) // Q16
      expect(budget.yearToDate.lines.car).toBeCloseTo(6000, P) //         Q20
      expect(budget.yearToDate.lines.wages).toBeCloseTo(168000, P) //     Q50
      expect(budget.yearToDate.subtotalWithdrawals).toBeCloseTo(210000, P) // Q56
      expect(budget.yearToDate.gstInput).toBeCloseTo(4304.347826, P) //   Q62
      expect(budget.yearToDate.gstOutput).toBeCloseTo(45430.43478, 5) //  Q63
      expect(budget.yearToDate.netCashRelatedToGst).toBeCloseTo(-41126.08696, 5) // Q64
      // Q66 — workbook 182,426.087, which is this figure plus the year's net GST.
      expect(budget.yearToDate.netChangeInBank).toBeCloseTo(141300, P)
    })

    it('reconciles: opening plus the year\'s net change equals the closing balance', () => {
      // Not a source cell — a cross-check that the two routes through the sheet agree. This is
      // what makes the GST oddity in the header note harmless to the roll-forward: rows 66 and
      // 69/71 embed the same treatment, so they stay consistent with each other.
      expect(budget.openingBalance + budget.yearToDate.netChangeInBank)
        .toBeCloseTo(budget.closingBalance, 3)
    })
  })

  describe('Sheet 2: Actual Figures — the figures the sheet and the port agree on', () => {
    it('subtotals the deposits', () => {
      // D16. The Actuals sheet sums D9:D13 and ours sums D9:D14, but no actual Non GST Related
      // Sales were entered, so the two agree here. The range still matters — see the deviation
      // block below for what happens the moment that row is used.
      expect(actual.subtotalDeposits[APR]).toBeCloseTo(15000, P)
      expect(actual.yearToDate.subtotalDeposits).toBeCloseTo(299000, P) // Q16
    })

    it('splits the GST-related deposits and withdrawals out', () => {
      expect(actual.gstRelatedDeposits[APR]).toBeCloseTo(15000, P) //     D58
      expect(actual.gstRelatedWithdrawals[APR]).toBeCloseTo(3025, P) //   D59
    })

    it('computes the GST movements', () => {
      expect(actual.gstInput[APR]).toBeCloseTo(394.5652174, P) //         D62
      expect(actual.gstOutput[APR]).toBeCloseTo(1956.521739, P) //        D63
      expect(actual.netCashRelatedToGst[APR]).toBeCloseTo(-1561.956522, P) // D64
      expect(actual.yearToDate.gstInput).toBeCloseTo(4734.782609, P) //   Q62
    })

    it('keeps the wages and interest lines themselves, in full', () => {
      // The lines were never wrong in the source — only the subtotal that skipped them.
      expect(actual.yearToDate.lines.wages).toBeCloseTo(150000, P) //     Q50
      expect(actual.yearToDate.lines.interestOnlyLoanPayments).toBeCloseTo(9900, P) // Q51
    })

    it('opens the year on the sheet\'s own opening balance', () => {
      expect(actual.openingBankBalance[APR]).toBeCloseTo(6500, P) //      D68
      // D69/D70 — workbook 16,956.52174 / 23,456.52174, both carrying the double-counted GST.
      expect(actual.addTotalNetDeposits[APR]).toBeCloseTo(15000, P) //    D69
      expect(actual.fundsAvailable[APR]).toBeCloseTo(21500, P) //         D70
    })
  })

  describe('Sheet 3: Cashflow Variances — April', () => {
    it('computes each line as actual less budget', () => {
      expect(variance.lines.sales[APR]).toBeCloseTo(-10000, P) //         D9
      expect(variance.lines.car[APR]).toBeCloseTo(-50, P) //              D20
      expect(variance.lines.entertainment[APR]).toBeCloseTo(100, P) //    D24
      expect(variance.lines.printing[APR]).toBeCloseTo(175, P) //         D26
      expect(variance.lines.vehicleLeases[APR]).toBeCloseTo(50, P) //     D28
      expect(variance.lines.accounting[APR]).toBeCloseTo(0, P) //         D33
      expect(variance.lines.principalLoanRepayments[APR]).toBeCloseTo(0, P) // D40
      expect(variance.lines.wages[APR]).toBeCloseTo(-1500, P) //          D50
      expect(variance.lines.interestOnlyLoanPayments[APR]).toBeCloseTo(75, P) // D51
    })

    it('leaves a line blank where no actual was entered — not zero', () => {
      // The source's IF(actual<>"", …, ""). A budgeted line with no actual yet must not read as
      // a shortfall of its whole budget.
      expect(variance.lines.taxRebates[APR]).toBeNull() //                D10
      expect(variance.lines.nonGstSales[APR]).toBeNull() //               D14 (budget 250, no actual)
      expect(variance.lines.insurance[APR]).toBeNull() //                 D32
    })

    it('subtotals the variances', () => {
      expect(variance.subtotalDeposits[APR]).toBeCloseTo(-10000, P) //    D16
      expect(variance.subtotalWithdrawals[APR]).toBeCloseTo(-1150, P) //  D56
    })

    it('computes the GST and second-month variances the sheet shows', () => {
      expect(variance.gstRelatedDeposits[APR]).toBeCloseTo(-10000, P) //  D58
      expect(variance.gstRelatedWithdrawals[APR]).toBeCloseTo(275, P) //  D59
      expect(variance.gstInput[APR]).toBeCloseTo(35.86956522, P) //       D62
      expect(variance.gstOutput[APR]).toBeCloseTo(-1304.347826, P) //     D63
      expect(variance.netCashRelatedToGst[APR]).toBeCloseTo(1340.217391, 5) // D64
      expect(variance.lines.sales[1]).toBeCloseTo(-17000, P) //           E9
      expect(variance.subtotalDeposits[1]).toBeCloseTo(-17000, P) //      E16
      expect(variance.gstOutput[1]).toBeCloseTo(-2217.391304, P) //       E63
    })

    it('opens April on the sheet\'s own opening-balance variance', () => {
      expect(variance.openingBankBalance[APR]).toBeCloseTo(-3500, P) //   D68 (6,500 − 10,000)
    })
  })

  describe('Sheet 4: Reports — the two comparisons it charts', () => {
    it('pairs budget and actual revenue, month by month', () => {
      // E65:P65 and E66:P66.
      expect(model.reports.budgetRevenue).toEqual(budget.subtotalDeposits)
      expect(model.reports.budgetRevenue[APR]).toBeCloseTo(25250, P) //   E65
      expect(model.reports.budgetRevenue[MAR]).toBeCloseTo(36050, P) //   P65
      expect(model.reports.actualRevenue[APR]).toBeCloseTo(15000, P) //   E66
      expect(model.reports.actualRevenue[MAR]).toBeCloseTo(33000, P) //   P66
    })

    it('pairs budget and actual expenses, month by month', () => {
      expect(model.reports.budgetExpenses[APR]).toBeCloseTo(17500, P) //  E71
      expect(model.reports.actualExpenses).toEqual(actual.subtotalWithdrawals)
    })
  })

  describe('🔴 Deviations from the workbook — the ruled subtotal ranges (Mike, 2026-09-12)', () => {
    // Each case gives OUR figure and, in the comment, the workbook's own cached value beside it.
    // The whole of the difference is rows 50–54 on the Actuals sheet: Wages and Interest Only
    // Loan Payments, 12,500 + 825 a month and 159,900 for the year.

    it('counts wages and interest in the actual withdrawals subtotal', () => {
      // D56 — workbook 3,025, which is rows 20–46 alone. Ours adds wages 12,500 and
      // interest-only 825.
      expect(actual.subtotalWithdrawals[APR]).toBeCloseTo(16350, P)
      // Q56 — workbook 36,300. Ours: 36,300 + 150,000 + 9,900.
      expect(actual.yearToDate.subtotalWithdrawals).toBeCloseTo(196200, P)
    })

    it('carries the correction through the actual bank roll-forward', () => {
      // These figures carry BOTH rulings — the wages correction (4.88) and the GST one (4.89).
      // D71 — workbook 3,419.565217.
      expect(actual.lessTotalNetWithdrawals[APR]).toBeCloseTo(16350, P)
      // D66 — workbook 13,536.95652. The sheet had the bank rising by 13,537 in a month the
      // business paid 12,500 of wages it never counted and banked GST it did not own.
      expect(actual.netChangeInBank[APR]).toBeCloseTo(-1350, P)
      // D72 — workbook 20,036.95652.
      expect(actual.closingBankBalance[APR]).toBeCloseTo(5150, P)
      // Q66 — workbook 296,965.2174.
      expect(actual.yearToDate.netChangeInBank).toBeCloseTo(102800, P)
      expect(actual.closingBalance).toBeCloseTo(109300, P)
    })

    it('reconciles the actual side on its own terms, as the budget side does', () => {
      expect(actual.openingBalance + actual.yearToDate.netChangeInBank)
        .toBeCloseTo(actual.closingBalance, 3)
    })

    it('makes the Reports expense comparison like for like', () => {
      // The reason the ruling was taken. The workbook charts 210,000 against 36,300 — an
      // apparent saving of 173,700 where the true variance is 13,800.
      const budgetYear = budget.yearToDate.subtotalWithdrawals
      const actualYear = actual.yearToDate.subtotalWithdrawals
      expect(budgetYear - actualYear).toBeCloseTo(13800, P)
    })

    it('🔴 treats the entered figures as GST-INCLUSIVE and keeps GST out of the bank', () => {
      // Mike's second ruling of 2026-09-12 (4.89). The source extracted GST as if the figures
      // were inclusive (row 63) and then added it back as if they were exclusive (row 69),
      // counting it twice. The bank now moves by deposits less withdrawals and nothing else.
      for (const m of [APR, 5, MAR]) {
        expect(budget.netChangeInBank[m])
          .toBeCloseTo(budget.subtotalDeposits[m] - budget.subtotalWithdrawals[m], P)
        expect(budget.addTotalNetDeposits[m]).toBeCloseTo(budget.subtotalDeposits[m], P)
        expect(budget.lessTotalNetWithdrawals[m]).toBeCloseTo(budget.subtotalWithdrawals[m], P)
      }
    })

    it('reports the GST being held as a reading, rather than banking it', () => {
      // The money in the account that belongs to Inland Revenue. April: 3,260.87 collected less
      // 358.70 paid. Over the year it is 41,126.09 — exactly what the source added to the bank.
      expect(budget.gstHeld[APR]).toBeCloseTo(2902.173913, 5)
      expect(budget.yearToDate.gstHeld).toBeCloseTo(41126.08696, 5)
      // And that is precisely the gap between the workbook's closing balance and ours.
      expect(192426.087 - budget.closingBalance).toBeCloseTo(budget.yearToDate.gstHeld, 3)
    })

    it('leaves the variance subtotals exactly as the workbook had them', () => {
      // The Variances sheet already summed rows 20–51, so the ruling moves nothing here. Stated
      // as a test because it is the easiest thing to assume changed, and it did not.
      expect(variance.subtotalWithdrawals[APR]).toBeCloseTo(-1150, P) //  D56
      expect(variance.subtotalDeposits[APR]).toBeCloseTo(-10000, P) //    D16
    })

    it('counts Non GST Related Sales in the deposits subtotal on every side', () => {
      // The Actuals and Variances sheets sum D9:D13 and drop row 14. Nothing in the sample uses
      // it on the actual side, so no cached value moves — but a firm that enters actual non-GST
      // sales would have seen them vanish from the actual total while the budget counted them.
      const withNonGst = computeSide({
        openingBalance: 0,
        lines: { sales: [1000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], nonGstSales: [250, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
      }, 0.15)
      expect(withNonGst.subtotalDeposits[APR]).toBeCloseTo(1250, P)
      // And it stays out of the GST base, which is rows 9, 11 and 13.
      expect(withNonGst.gstRelatedDeposits[APR]).toBeCloseTo(1000, P)
    })
  })

  describe('computeHighLevelBudget — the whole model', () => {
    it('returns all four sheets', () => {
      const r = computeHighLevelBudget(DEFAULT_INPUTS)
      expect(r.budget.subtotalDeposits[APR]).toBeCloseTo(25250, P)
      expect(r.actual.subtotalWithdrawals[APR]).toBeCloseTo(16350, P)
      expect(r.variance.subtotalWithdrawals[APR]).toBeCloseTo(-1150, P)
      expect(r.reports.budgetExpenses[APR]).toBeCloseTo(17500, P)
    })

    it('🔴 computes NOTHING when asked for nothing — never the workbook sample', () => {
      // A Report-class model holds a real client's figures. Restify hands an absent JSON body
      // over as {}, so an empty call must produce an empty budget rather than a plausible one.
      // This is the fault found live on the dashboard-reports route, 2026-09-07.
      for (const called of [computeHighLevelBudget(), computeHighLevelBudget({}), computeHighLevelBudget(null)]) {
        expect(called.budget.subtotalDeposits.every(v => v === 0)).toBe(true)
        expect(called.actual.subtotalWithdrawals.every(v => v === 0)).toBe(true)
        expect(called.budget.closingBalance).toBe(0)
        expect(called.reports.budgetRevenue.every(v => v === 0)).toBe(true)
        // And no variance is invented where nothing was entered.
        expect(called.variance.lines.sales.every(v => v === null)).toBe(true)
      }
    })

    it('runs the sample year April 2021 to March 2022', () => {
      expect(model.months).toHaveLength(12)
      expect(model.months[APR]).toBe('2021-04-01') // D6, Excel serial 44287
      expect(model.months[MAR]).toBe('2022-03-01') // O6, Excel serial 44621
      expect(model.gstRate).toBeCloseTo(0.15, P) //  V3
    })

    it('applies a different GST rate without disturbing the lines', () => {
      const r = computeHighLevelBudget(Object.assign({}, DEFAULT_INPUTS, { gstRate: 0.10 }))
      expect(r.budget.gstOutput[APR]).toBeCloseTo(25000 - (25000 / 1.1), P)
      expect(r.budget.subtotalDeposits[APR]).toBeCloseTo(25250, P)
    })

    it('takes one side without inventing the other', () => {
      const r = computeHighLevelBudget({
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
      const r = computeHighLevelBudget({
        budget: { openingBalance: '10000', lines: { sales: ['25000', '35000'] } }
      })
      expect(r.budget.subtotalDeposits[APR]).toBeCloseTo(25000, P)
      expect(r.budget.openingBankBalance[APR]).toBeCloseTo(10000, P)
    })

    it('treats an entered zero as entered, and a blank as blank', () => {
      const r = computeHighLevelBudget({
        budget: { lines: { sales: [100, 100] } },
        actual: { lines: { sales: [0, null] } }
      })
      expect(r.variance.lines.sales[APR]).toBeCloseTo(-100, P) // entered zero → a real variance
      expect(r.variance.lines.sales[1]).toBeNull() //             blank → blank
    })

    it('pads a short month array rather than producing holes', () => {
      const r = computeHighLevelBudget({ budget: { lines: { sales: [100] } } })
      expect(r.budget.lines.sales).toHaveLength(12)
      expect(r.budget.subtotalDeposits[MAR]).toBeCloseTo(0, P)
    })

    it('never produces NaN or Infinity', () => {
      const r = computeHighLevelBudget({
        gstRate: 0,
        budget: { openingBalance: 0, lines: {} },
        actual: { openingBalance: 0, lines: {} }
      })
      // JSON.stringify turns NaN and Infinity into null; the only legitimate nulls in this model
      // are blank variance cells, and with no actuals entered every one of them is blank.
      expect(JSON.stringify(r.budget)).not.toMatch(/null/)
      expect(r.budget.gstInput[APR]).toBe(0)
    })

    it('survives malformed input rather than throwing', () => {
      expect(() => computeHighLevelBudget(null)).not.toThrow()
      expect(() => computeHighLevelBudget({ budget: 'nonsense', actual: 42 })).not.toThrow()
      expect(() => computeHighLevelBudget({ budget: { lines: { sales: 'nonsense' } } })).not.toThrow()
      expect(() => computeVariance(computeSide(null, 0.15), computeSide(null, 0.15))).not.toThrow()
    })
  })
})
