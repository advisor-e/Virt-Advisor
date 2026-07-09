'use strict'

const { computeDebtorDrag, computeDebtorScenario, DEFAULT_INPUTS, DEFAULT_MONTHLY_SALES, DEFAULT_SCENARIO_A, DEFAULT_SCENARIO_B } = require('../../server/report/debtorDragModel')

/**
 * Golden values from GE.4b.Debtor Business Drag Model.xlsx (Cash Movement Figures sheet):
 *   Scenario A — Z8 gross diff 157852.39, Z9 write-off 100722.39, Z11 debtor drag 57130,
 *                S7 sales 3357413, S10 funds banked 3199560.61.
 *   Scenario B — Z52 gross diff 218222.39, Z55 debtor drag 117500 (banked 3139190.61).
 *   Z14 drag difference (Z55 - Z11) 60370.
 * Verified against the workbook's cached values 2026-07-09.
 */
describe('Debtor Drag model — golden values (matches source spreadsheet)', () => {
  const r = computeDebtorDrag(DEFAULT_INPUTS)

  test('Scenario A — sales, banked, write-off, gross diff, drag', () => {
    expect(r.scenarioA.totalSales).toBeCloseTo(3357413, 2)
    expect(r.scenarioA.fundsBanked).toBeCloseTo(3199560.61, 2)
    expect(r.scenarioA.writeOff).toBeCloseTo(100722.39, 2)
    expect(r.scenarioA.grossCashDiff).toBeCloseTo(157852.39, 2)
    expect(r.scenarioA.debtorDrag).toBeCloseTo(57130, 2)
  })

  test('Scenario B — banked, gross diff, drag', () => {
    expect(r.scenarioB.fundsBanked).toBeCloseTo(3139190.61, 2)
    expect(r.scenarioB.grossCashDiff).toBeCloseTo(218222.39, 2)
    expect(r.scenarioB.debtorDrag).toBeCloseTo(117500, 2)
  })

  test('drag difference (Z14) reproduces the spreadsheet', () => {
    expect(r.dragDifference).toBeCloseTo(60370, 2)
  })
})

describe('Debtor Drag model — behaviour', () => {
  test('faster same-month collection lowers the drag', () => {
    const slow = computeDebtorScenario(DEFAULT_MONTHLY_SALES, DEFAULT_SCENARIO_B) // 72% same month
    const fast = computeDebtorScenario(DEFAULT_MONTHLY_SALES, DEFAULT_SCENARIO_A) // 85% same month
    expect(fast.debtorDrag).toBeLessThan(slow.debtorDrag)
  })

  test('collecting everything in the sale month leaves zero drag', () => {
    const s = computeDebtorScenario(DEFAULT_MONTHLY_SALES, { sameMonth: 1, month1: 0, month2: 0, month3: 0, month4: 0, writeOff: 0 })
    expect(s.debtorDrag).toBeCloseTo(0, 6)
    expect(s.writeOff).toBeCloseTo(0, 6)
  })

  test('a higher write-off increases money lost but is separate from drag', () => {
    const base = computeDebtorScenario(DEFAULT_MONTHLY_SALES, DEFAULT_SCENARIO_A)
    const worse = computeDebtorScenario(DEFAULT_MONTHLY_SALES, Object.assign({}, DEFAULT_SCENARIO_A, { sameMonth: 0.80, writeOff: 0.08 }))
    expect(worse.writeOff).toBeGreaterThan(base.writeOff)
  })
})
