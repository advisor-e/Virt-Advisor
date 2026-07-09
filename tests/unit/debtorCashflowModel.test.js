'use strict'

const { computeDebtorCashflow, DEFAULT_CASHFLOW_INPUTS } = require('../../server/report/debtorDragModel')

/**
 * Golden monthly closing bank balances from GE.4b.Debtor Business Drag Model.xlsx
 * (Cash Movement Figures, Scenario A, cells F36..Q36). Verified against the workbook's
 * cached values 2026-07-09. The engine must reproduce the month-by-month bank balance —
 * the overdraft dip is the whole point of the report.
 */
const GOLDEN_CLOSING = [
  -1562.89355, -22128.9304, -10948.66984, -26997.86102, -34891.37417, 32036.45692,
  52110.26553, 121656.8278, 73949.16639, 81855.72271, 118715.6508, 106607.3861
]

describe('Debtor cashflow — monthly bank balance (matches source spreadsheet)', () => {
  const r = computeDebtorCashflow(DEFAULT_CASHFLOW_INPUTS)

  GOLDEN_CLOSING.forEach((expected, m) => {
    test(`month ${m + 1} closing balance`, () => {
      expect(r.monthlyClosing[m]).toBeCloseTo(expected, 2)
    })
  })

  test('deepest low is May and it is an overdraft', () => {
    expect(r.deepestLow.month).toBe(4) // May (0-indexed)
    expect(r.deepestLow.value).toBeCloseTo(-34891.37417, 2)
  })

  test('five months in overdraft', () => {
    expect(r.monthsInOverdraft).toBe(5)
  })

  test('fixed monthly cost derives to the model value', () => {
    expect(r.fixedMonthly).toBeCloseTo(73519.41529, 2)
  })
})

describe('Debtor cashflow — behaviour', () => {
  test('collecting faster (more same-month) lifts the deepest low', () => {
    const base = computeDebtorCashflow(DEFAULT_CASHFLOW_INPUTS)
    const faster = computeDebtorCashflow(Object.assign({}, DEFAULT_CASHFLOW_INPUTS, { debtor: [0.97, 0, 0, 0, 0] }))
    expect(faster.deepestLow.value).toBeGreaterThan(base.deepestLow.value)
  })

  test('paying suppliers slower also lifts the deepest low', () => {
    const base = computeDebtorCashflow(DEFAULT_CASHFLOW_INPUTS)
    const slowerPay = computeDebtorCashflow(Object.assign({}, DEFAULT_CASHFLOW_INPUTS, { creditor: [0.5, 0.5, 0, 0, 0] }))
    expect(slowerPay.deepestLow.value).toBeGreaterThan(base.deepestLow.value)
  })
})
