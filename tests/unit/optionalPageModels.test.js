'use strict'

/**
 * The three optional pages' models (item 4.70, slice 2): why profit changed, where the
 * cash went, what moves profit. Every expected number is worked by hand from the two
 * years below — the same figures `dashboardReportPagesModel.test.js` uses — so a step
 * that drifts from its stated definition fails here. A bridge that does not close, a
 * lever ranked wrong, or a break-even worked on the wrong margin all look perfectly
 * plausible on a printed page, which is why the arithmetic is the whole of what is
 * asserted.
 */

const { computeProfitBridge } = require('../../server/report/profitBridgeModel')
const { computeCashBridge } = require('../../server/report/cashBridgeModel')
const { computeProfitSensitivity } = require('../../server/report/profitSensitivityModel')

const CURRENT = {
  bank: 224000,
  accountsReceivable: 365000,
  stock: 200000,
  otherCurrentAssets: 11000,
  fixedAssets: 505000,
  currentLiabilities: 410000,
  accountsPayable: 200000,
  nonCurrentLiabilities: 205000,
  tradingIncome: 3650000,
  otherIncome: 10000,
  costOfSales: 2000000,
  wages: 596000,
  operatingExpenses: 102000,
  depreciation: 38000,
  interestPaid: 32000,
  netCapitalSpend: 85000
}
const PRIOR = {
  bank: 183000,
  accountsReceivable: 250000,
  stock: 150000,
  otherCurrentAssets: 9000,
  fixedAssets: 470000,
  currentLiabilities: 387000,
  accountsPayable: 150000,
  nonCurrentLiabilities: 220000,
  tradingIncome: 3000000,
  otherIncome: 8000,
  costOfSales: 1800000,
  wages: 550000,
  operatingExpenses: 98000,
  depreciation: 35000,
  interestPaid: 30000
}

const step = (r, key) => r.steps.find(s => s.key === key).value

describe('why profit changed — the bridge from 495,000 to 892,000', () => {
  const r = computeProfitBridge({ current: CURRENT, prior: PRIOR })

  test('net profit is the profit-and-loss page\'s own figure, both years', () => {
    // gross profit + other income − wages − operating expenses − depreciation − interest
    expect(r.prior.netProfit).toBe(495000)
    expect(r.current.netProfit).toBe(892000)
    expect(r.change).toBe(397000)
    expect(r.changePct).toBeCloseTo(397000 / 495000, 10)
  })

  test('more sales at LAST year\'s margin, then the margin change on THIS year\'s sales', () => {
    // 650,000 more revenue × last year's 40% = 260,000
    expect(step(r, 'salesGrowth')).toBeCloseTo(260000, 6)
    // margin 40% → 45.2055% on 3,650,000 = 190,000, which with 260,000 is exactly the 450,000 rise in gross profit
    expect(step(r, 'margin')).toBeCloseTo(190000, 6)
    expect(step(r, 'salesGrowth') + step(r, 'margin')).toBeCloseTo(1650000 - 1200000, 6)
  })

  test('costs are signed as their effect on profit, and the steps close to the change exactly', () => {
    expect(step(r, 'otherIncome')).toBe(2000)
    expect(step(r, 'overheads')).toBe(-50000) // 648,000 → 698,000
    expect(step(r, 'belowLine')).toBe(-5000) // 65,000 → 70,000
    const sum = r.steps.reduce((t, s) => t + s.value, 0)
    expect(sum).toBeCloseTo(r.change, 6)
  })

  test('🔴 NO PRIOR YEAR, NO BRIDGE — and no prior revenue means no margin to take', () => {
    expect(computeProfitBridge({ current: CURRENT, prior: null })).toMatchObject({ available: false, blocked: 'NO_PRIOR_YEAR', steps: [] })
    expect(computeProfitBridge({ current: CURRENT, prior: Object.assign({}, PRIOR, { tradingIncome: 0 }) })).toMatchObject({ available: false, blocked: 'NO_PRIOR_REVENUE' })
    expect(computeProfitBridge({ current: {}, prior: PRIOR })).toMatchObject({ available: false, blocked: 'NO_REVENUE' })
    expect(computeProfitBridge()).toMatchObject({ available: false })
  })
})

describe('where the cash went — from 892,000 of profit to 41,000 more in the bank', () => {
  const r = computeCashBridge({ current: CURRENT, prior: PRIOR })

  test('🔴 THE BRIDGE CLOSES TO THE BANK MOVEMENT EXACTLY, because it is the balance-sheet identity', () => {
    expect(r.available).toBe(true)
    expect(r.bankPrior).toBe(183000)
    expect(r.bankCurrent).toBe(224000)
    expect(r.bankMovement).toBe(41000)
    expect(r.steps.reduce((t, s) => t + s.value, 0)).toBeCloseTo(41000, 6)
  })

  test('working capital: a rise in debtors or stock uses cash, a rise in creditors releases it', () => {
    expect(step(r, 'debtors')).toBe(-115000)
    expect(step(r, 'stock')).toBe(-50000)
    expect(step(r, 'otherCurrentAssets')).toBe(-2000)
    expect(step(r, 'creditors')).toBe(50000)
    // current liabilities rose 23,000 of which creditors were 50,000, so the rest fell 27,000
    expect(step(r, 'otherCurrentLiabilities')).toBe(-27000)
    expect(r.workingCapitalAbsorbed).toBe(144000)
    // profit + depreciation − 144,000 absorbed
    expect(r.cashFromTrading).toBe(786000)
  })

  test('capital spend is the rise in fixed assets plus depreciation, and the advisor\'s typed figure is named when it differs', () => {
    expect(r.capitalSpend).toBe(73000) // 35,000 + 38,000
    expect(step(r, 'capitalSpend')).toBe(-73000)
    expect(r.enteredCapitalSpend).toBe(85000)
    const same = computeCashBridge({ current: Object.assign({}, CURRENT, { netCapitalSpend: 73000 }), prior: PRIOR })
    expect(same.enteredCapitalSpend).toBeNull()
  })

  test('borrowing is the change in non-current liabilities; the owners\' figure is the residual of the equity movement', () => {
    expect(step(r, 'borrowing')).toBe(-15000) // 220,000 → 205,000 repaid
    // equity 455,000 → 690,000 is +235,000 against 892,000 of profit: 657,000 went to the owners (and tax)
    expect(r.owners).toBe(-657000)
    expect(step(r, 'owners')).toBe(-657000)
  })

  test('🔴 A MISSING BALANCE-SHEET LINE STOPS THE PAGE AND NAMES THE LINE — never a zero standing in', () => {
    const noStock = Object.assign({}, PRIOR)
    delete noStock.stock
    expect(computeCashBridge({ current: CURRENT, prior: noStock })).toMatchObject({ available: false, blocked: 'MISSING_LINE', missing: 'stock' })
    expect(computeCashBridge({ current: CURRENT, prior: null })).toMatchObject({ available: false, blocked: 'NO_PRIOR_YEAR' })
  })
})

describe('what moves profit — one percent of each, on this year alone', () => {
  const r = computeProfitSensitivity({ current: CURRENT })

  test('the four levers, ranked largest first', () => {
    expect(r.levers.map(l => l.key)).toEqual(['price', 'costOfSales', 'volume', 'overheads'])
    expect(r.levers[0].delta).toBeCloseTo(36500, 6) // 1% of 3,650,000 revenue
    expect(r.levers[1].delta).toBeCloseTo(20000, 6) // 1% of 2,000,000 cost of sales
    expect(r.levers[2].delta).toBeCloseTo(16500, 6) // 1% of the 1,650,000 contribution
    expect(r.levers[3].delta).toBeCloseTo(6980, 6) // 1% of 698,000 wages + operating expenses
    expect(r.levers[0].pctOfProfit).toBeCloseTo(36500 / 892000, 10)
  })

  test('break-even on the contribution margin, with other income offsetting the fixed costs', () => {
    expect(r.contributionMarginPct).toBeCloseTo(1650000 / 3650000, 10)
    expect(r.fixedCosts).toBe(758000) // 698,000 + 70,000 − 10,000
    expect(r.breakEvenSales).toBeCloseTo(758000 * 3650000 / 1650000, 6)
    expect(r.marginOfSafety).toBeCloseTo(3650000 - r.breakEvenSales, 6)
    expect(r.marginOfSafetyPct).toBeCloseTo(1 - r.breakEvenSales / 3650000, 10)
  })

  test('🔴 NO CONTRIBUTION MEANS NO BREAK-EVEN — "never" is not a figure', () => {
    expect(computeProfitSensitivity({ current: Object.assign({}, CURRENT, { costOfSales: 3650000 }) })).toMatchObject({ available: false, blocked: 'NO_CONTRIBUTION', levers: [] })
    expect(computeProfitSensitivity({ current: { tradingIncome: 0 } })).toMatchObject({ available: false, blocked: 'NO_REVENUE' })
    expect(computeProfitSensitivity({})).toMatchObject({ available: false, blocked: 'NO_CURRENT_YEAR' })
  })
})
