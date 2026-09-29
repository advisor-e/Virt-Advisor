'use strict'

/**
 * The Three-Way Forecast's balance sheet against the accounting standards (item 44.1).
 * Basis: design/CALCULATION-ASSUMPTIONS.md §2.4 and §2.6.
 *
 * A lender tests working capital. Both figures here move it, and neither is visible as wrong
 * on a screen: every number still adds up and the balance check still reads zero. That is
 * why they are pinned here rather than left to UAT.
 */

const { computeThreeWayForecast, computeThreeYearForecast } = require('../../server/report/threeWayForecastModel')

const sum = list => list.reduce((a, v) => a + v, 0)

describe('term loans: the part due within twelve months is current (IAS 1.69, 71)', () => {
  const f = computeThreeWayForecast({})
  const opening = f.balanceSheet.opening
  const bs = f.balanceSheet.months
  const loans = f.schedules.loans

  it('at the opening date, each loan’s current part is exactly the capital its own schedule repays in the next twelve months', () => {
    // The sample has no drawdowns or lump sums, so the schedule's own year of repayments IS
    // what falls due within twelve months of the opening date.
    opening.nonCurrentLiabilities.forEach((l, k) => {
      expect(l.currentPortion).toBeCloseTo(sum(loans[k].capitalRepaid), 6)
      expect(l.balance + l.currentPortion).toBe(loans[k].openingBalance[0])
    })
    expect(opening.currentPortionTermLoans).toBeCloseTo(sum(opening.nonCurrentLiabilities.map(l => l.currentPortion)), 6)
  })

  it('counts it among current liabilities, so working capital falls by it and net assets do not move', () => {
    const due = bs.currentPortionTermLoans[0]
    expect(due).toBeGreaterThan(0)
    const whole = sum(loans.map(l => l.closingBalance[0]))
    const nonCurrent = sum(bs.nonCurrentLiabilities.map(l => l.balance[0]))
    expect(nonCurrent + due).toBeCloseTo(whole, 6)
    // Flat, not zero: the sample's own opening balance sheet carries a residual, and the
    // statements articulate when the check never MOVES from it (see the model's header).
    bs.balanceCheck.forEach(v => expect(v).toBe(opening.balanceCheck))
  })

  it('a loan that will be repaid within the year is current in full', () => {
    const small = computeThreeWayForecast({
      loans: [{ name: 'Short', type: 'term', opening: 5000, monthlyRepayment: 1000, interestRate: 0.06 }]
    })
    const l = small.balanceSheet.opening.nonCurrentLiabilities[0]
    expect(l.currentPortion).toBe(5000)
    expect(l.balance).toBe(0)
  })

  it('a lump sum this year names counts in the twelve months it falls in', () => {
    const lump = new Array(12).fill(0)
    lump[3] = 20000
    const withLump = computeThreeWayForecast({
      loans: [{ name: 'Lump', type: 'term', opening: 100000, monthlyRepayment: 0, interestRate: 0.05, lumpSumRepayments: lump }]
    })
    expect(withLump.balanceSheet.opening.nonCurrentLiabilities[0].currentPortion).toBe(20000)
  })

  it('source-fidelity mode keeps the workbook’s whole-loan presentation, so the port stays provable', () => {
    const asWritten = computeThreeWayForecast({}, { sourceFidelity: true })
    expect(asWritten.balanceSheet.months.currentPortionTermLoans.every(v => v === 0)).toBe(true)
  })

  it('the three-year chain still articulates every month', () => {
    const three = computeThreeYearForecast({})
    const residual = three.years[0].balanceSheet.opening.balanceCheck
    three.years.forEach(y => y.balanceSheet.months.balanceCheck.forEach(v => expect(v).toBe(residual)))
  })
})

describe('the statements laid out as IFRS 18 and IAS 7 set them out (item 44.2)', () => {
  // An importer whose supplier charges interest for waiting — the one interest charge that
  // used to ride inside another line, on both statements.
  const importer = computeThreeWayForecast({
    overseas: {
      enabled: true,
      landings: [{ value: 40000, landsInMonth: 3, depositPct: 0.5, depositMonth: 1, balanceMonth: 5, interest: 600 }]
    }
  })
  const forecasts = { sample: computeThreeWayForecast({}), importer }

  Object.keys(forecasts).forEach((name) => {
    const f = forecasts[name]
    const p = f.profitAndLoss
    const a = f.cashFlow.byActivity

    it(`${name}: operating, investing and financing add to each month's movement`, () => {
      a.operating.forEach((v, m) => {
        expect(v + a.investing[m] + a.financing[m]).toBeCloseTo(f.cashFlow.netMovement[m], 6)
      })
    })

    it(`${name}: regrouping the profit and loss moves no profit`, () => {
      p.operatingProfit.forEach((v, m) => {
        expect(p.profitBeforeFinancingAndTax[m]).toBeCloseTo(v + p.investingIncome[m], 6)
        expect(p.profitBeforeFinancingAndTax[m] - p.financingCosts[m]).toBeCloseTo(p.netSurplusBeforeTax[m], 6)
      })
    })
  })

  it('every interest charge is a financing cost, and none is left in the overheads', () => {
    const p = importer.profitAndLoss
    expect(sum(p.interestSuppliers)).toBe(600)
    p.financingCosts.forEach((v, m) => {
      expect(v).toBeCloseTo(p.interestBankOverdraft[m] + p.interestTermLoans[m] + p.interestFacilities[m] +
        p.interestSuppliers[m] + p.interestOverdueTax[m], 6)
      expect(p.operatingOverheads[m]).toBeCloseTo(p.totalOverheads[m] - v, 6)
    })
  })

  it('the supplier’s interest leaves operating cash and is paid under financing', () => {
    const a = importer.cashFlow.byActivity
    const paid = importer.cashFlow.payments
    expect(sum(a.interestPaid) - sum(paid.interestPaid)).toBeCloseTo(600, 6)
    expect(sum(paid.overseasSupplierBalance) - sum(a.overseasSupplierBalance)).toBeCloseTo(600, 6)
  })
})

describe('shareholder current accounts are shown gross, never netted (IAS 1.32)', () => {
  // The sample: Bob +25,000 and John +18,000 are owed BY the company; Mary −32,000 and
  // Joan −25,000 owe it. Netted, they read as one 14,000 asset.
  const opening = computeThreeWayForecast({}).balanceSheet.opening

  it('owed to the company and owed by it are two figures', () => {
    expect(opening.shareholderCurrentAssets).toBe(57000)
    expect(opening.shareholderCurrentLiabilities).toBe(43000)
  })

  it('source-fidelity mode keeps the workbook’s single netted figure', () => {
    const asWritten = computeThreeWayForecast({}, { sourceFidelity: true }).balanceSheet.opening
    expect(asWritten.shareholderCurrentAssets).toBe(14000)
    expect(asWritten.shareholderCurrentLiabilities).toBe(0)
  })
})
