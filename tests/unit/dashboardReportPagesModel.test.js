'use strict'

const { computeReportPages, toSheet, scoreBand, SCORE_BANDS } = require('../../server/report/dashboardReportPagesModel')

/**
 * The figures the Business Performance Report prints (item 4.70, stage 2).
 *
 * Every expected number below is worked by hand from the two years of lines, so a figure
 * that drifts from its stated definition fails here — the one class of fault a client
 * reading the page cannot see, because a wrong ratio looks exactly like a right one.
 */

/** The platform thresholds, as data/forecast-trend-thresholds.json holds them. */
const THRESHOLDS = {
  levels: {
    debtorDays: { green: 35, amber: 45 },
    creditorDays: { green: 35, amber: 45 },
    stockDays: { green: 30, amber: 60 },
    // The two score ratios (2026-09-08). Current ratio reads the other way up: green is
    // the BOTTOM of green. These are test figures, not Mike's — the shipped file holds nulls.
    currentRatio: { green: 1.5, amber: 1.0 },
    debtToEquity: { green: 0.5, amber: 1.0 }
  },
  movements: {
    salesGrowth: { warn: 0, crit: -5 },
    grossMargin: { warn: 1, crit: 3 },
    overheadRatio: { warn: 1, crit: 3 }
  }
}

const line = (value, source) => ({ value, source: source || 'file' })

const CURRENT = {
  bank: line(224000),
  accountsReceivable: line(365000),
  stock: line(200000),
  otherCurrentAssets: line(11000),
  fixedAssets: line(505000),
  currentLiabilities: line(410000),
  accountsPayable: line(200000),
  nonCurrentLiabilities: line(205000),
  tradingIncome: line(3650000),
  otherIncome: line(10000),
  costOfSales: line(2000000),
  wages: line(596000),
  operatingExpenses: line(102000),
  depreciation: line(38000),
  interestPaid: line(32000),
  netCapitalSpend: line(85000, 'entered')
}

const PRIOR = {
  bank: line(183000),
  accountsReceivable: line(250000),
  stock: line(150000),
  otherCurrentAssets: line(9000),
  fixedAssets: line(470000),
  currentLiabilities: line(387000),
  accountsPayable: line(150000),
  nonCurrentLiabilities: line(220000),
  tradingIncome: line(3000000),
  otherIncome: line(8000),
  costOfSales: line(1800000),
  wages: line(550000),
  operatingExpenses: line(98000),
  depreciation: line(35000),
  interestPaid: line(30000)
}

const INVENTORY = { slowObsolete: 46000, ageing: [128, 84, 52, 32, 26] }

describe('toSheet — the confirm table as the ratio hub reads it', () => {
  const s = toSheet(CURRENT)

  test('🔴 EQUITY IS ASSETS LESS LIABILITIES, so a balance sheet that ties in Xero ties here', () => {
    // assets 224000 + (365000 + 200000 + 11000) + 505000 = 1,305,000; liabilities 615,000
    expect(s.ordinaryShares).toBe(690000)
    expect(s.currentYearEarnings).toBe(0)
    expect(s.retainedEarnings).toBe(0)
  })

  test('current assets carry receivables, stock and the rest; bank stays its own line', () => {
    expect(s.bank).toBe(224000)
    expect(s.accountsReceivable).toBe(365000)
    expect(s.currentAssets).toBe(576000)
    expect(s.nonCurrentAssets).toBe(0)
  })

  test('the sheet\'s expense line is every cost below gross profit, with wages beside it as a memo', () => {
    expect(s.operatingExpenses).toBe(768000) // 596000 + 102000 + 38000 + 32000
    expect(s.wages).toBe(596000)
  })

  test('accepts plain numbers as well as { value, source }', () => {
    expect(toSheet({ bank: 5, tradingIncome: '10' }).bank).toBe(5)
    expect(toSheet({ bank: 5, tradingIncome: '10' }).tradingIncome).toBe(10)
  })
})

describe('the pages, two years', () => {
  const r = computeReportPages({
    current: CURRENT,
    prior: PRIOR,
    currentDates: { balanceSheet: 'As at 30 June 2026', profitLoss: 'For the year ended 30 June 2026' },
    priorDates: { balanceSheet: 'As at 30 June 2025', profitLoss: 'For the year ended 30 June 2025' },
    inventory: INVENTORY,
    thresholds: THRESHOLDS
  })

  test('the profit and loss page', () => {
    const p = r.profitLoss.current
    expect(p.revenue).toBe(3650000)
    expect(p.grossProfit).toBe(1650000)
    expect(p.grossMarginPct).toBeCloseTo(1650000 / 3650000, 10)
    expect(p.operatingExpenses).toBe(698000) // wages + operating expenses
    expect(p.ebitda).toBe(962000) // 1650000 + 10000 − 698000
    expect(p.ebitdaPct).toBeCloseTo(962000 / 3650000, 10)
    expect(p.interestAndDepreciation).toBe(70000)
    expect(p.netProfit).toBe(892000)
    expect(p.netMarginPct).toBeCloseTo(892000 / 3650000, 10)
    expect(r.profitLoss.prior.netProfit).toBe(495000) // 1200000 + 8000 − 713000
  })

  test('the executive summary tiles and their movements', () => {
    const s = r.summary
    expect(s.revenue).toBe(3650000)
    expect(s.revenueChangePct).toBeCloseTo(650000 / 3000000, 10)
    expect(s.netProfit).toBe(892000)
    expect(s.netProfitChangePct).toBeCloseTo((892000 - 495000) / 495000, 10)
    expect(s.netMarginChangePts).toBeCloseTo(892000 / 3650000 - 495000 / 3000000, 10)
    // stock 36.5 + debtor 36.5 − creditor 36.5 this year; 30.4167 + 30.4167 − 30.4167 last
    expect(s.cashCycleDays).toBeCloseTo(36.5, 6)
    expect(s.cashCycleChangeDays).toBeCloseTo(36.5 - (150000 / 1800000) * 365, 6)
  })

  test('the balance sheet page', () => {
    const b = r.balanceSheet.current
    expect(b.currentAssets).toBe(800000)
    expect(b.nonCurrentAssets).toBe(505000)
    expect(b.totalAssets).toBe(1305000)
    expect(b.totalLiabilities).toBe(615000)
    expect(b.equity).toBe(690000)
    expect(b.currentRatio).toBeCloseTo(800000 / 410000, 10)
    expect(b.quickRatio).toBeCloseTo((224000 + 365000) / 410000, 10)
    expect(b.debtToEquity).toBeCloseTo(615000 / 690000, 10)
    expect(b.workingCapital).toBe(390000)
    // prior equity: (183000 + 250000 + 150000 + 9000 + 470000) − (387000 + 220000) = 455,000
    expect(r.balanceSheet.prior.equity).toBe(455000)
    expect(r.balanceSheet.equityChangePct).toBeCloseTo(235000 / 455000, 10)
    // prior working capital: (183000 + 409000) − 387000 = 205,000
    expect(r.balanceSheet.workingCapitalChange).toBe(185000)
  })

  test('the dashboard ratios keep the workbook\'s definitions', () => {
    const d = r.dashboard
    expect(d.grossMarginPct).toBeCloseTo(1650000 / 3650000, 10)
    expect(d.netMarginPct).toBeCloseTo(892000 / 3650000, 10)
    expect(d.currentRatio).toBeCloseTo(800000 / 410000, 10)
    expect(d.stockTurn).toBeCloseTo(3650000 / 576000, 10) // trading income ÷ current assets (T139)
    expect(d.stockDays).toBeCloseTo(36.5, 6)
    expect(d.stockDaysBand).toBe('warn')
    expect(d.revenueVsExpenses.current.expenses).toBe(2768000)
    expect(d.revenueVsExpenses.prior.expenses).toBe(2513000)
  })

  test('where the money went sums to every cost and shares to one', () => {
    expect(r.costs.total).toBe(2768000)
    const shares = r.costs.shares.map(s => s.share)
    expect(shares.reduce((t, s) => t + s, 0)).toBeCloseTo(1, 10)
    expect(r.costs.shares[0]).toEqual({ key: 'costOfSales', value: 2000000, share: 2000000 / 2768000 })
  })

  test('🔴 THE SEVEN CASH DRIVERS CARRY THE CASH DRIVERS RULE: what an increase does to cash', () => {
    const by = {}
    r.cashFlow.drivers.forEach((d) => { by[d.key] = d })
    expect(Object.keys(by)).toEqual(['salesGrowth', 'grossMargin', 'overheadRatio', 'debtorDays', 'stockDays', 'creditorDays', 'netCapitalSpend'])
    expect(by.salesGrowth.movement).toBeCloseTo((650000 / 3000000) * 100, 8)
    expect(by.salesGrowth.direction).toBe('uses')
    expect(by.grossMargin.movement).toBeCloseTo((1650000 / 3650000 - 0.4) * 100, 8)
    expect(by.grossMargin.direction).toBe('releases')
    expect(by.overheadRatio.movement).toBeCloseTo((768000 / 3650000 - 713000 / 3000000) * 100, 8)
    expect(by.overheadRatio.direction).toBe('releases') // it fell
    expect(by.debtorDays.value).toBeCloseTo(36.5, 6)
    expect(by.debtorDays.direction).toBe('uses')
    expect(by.stockDays.direction).toBe('uses')
    expect(by.creditorDays.direction).toBe('releases')
    expect(by.netCapitalSpend).toMatchObject({ value: 85000, direction: 'uses', unit: 'money' })
  })

  test('🔴 THE HEALTH SCORE COUNTS THE BANDED MEASURES AND SAYS HOW MANY — eight when all eight are set', () => {
    // salesGrowth good, grossMargin good, overheadRatio good = 6; three day-counts at
    // 36.5 are all amber = 3; current ratio 800000/410000 = 1.95 is green on a 1.5 floor
    // = 2; debt to equity 615000/690000 = 0.89 is amber between 0.5 and 1.0 = 1.
    // Twelve of sixteen points → 75, and 75 is the first "good".
    expect(r.score.total).toBe(8)
    expect(r.score.green).toBe(4)
    expect(r.score.amber).toBe(4)
    expect(r.score.red).toBe(0)
    expect(r.score.score).toBe(75)
    expect(r.score.band).toBe('good')
    expect(r.score.pulledDown).toEqual(['debtorDays', 'creditorDays', 'stockDays', 'debtToEquity'])
    expect(r.score.measures.find(m => m.key === 'debtorDays').band).toBe('amber')
    expect(r.score.measures.find(m => m.key === 'currentRatio').band).toBe('green')
  })

  test('the two ratios the score reads are the balance-sheet page’s own figures', () => {
    const cr = r.trend.measures.find(m => m.key === 'currentRatio')
    const de = r.trend.measures.find(m => m.key === 'debtToEquity')
    expect(cr.current).toBeCloseTo(r.balanceSheet.current.currentRatio, 10)
    expect(cr.prior).toBeCloseTo(592000 / 387000, 10)
    // total liabilities 615000 over equity (assets less liabilities) 690000
    expect(de.current).toBeCloseTo(615000 / 690000, 10)
    expect(de.current).toBeCloseTo(r.balanceSheet.current.totalLiabilities / r.balanceSheet.current.equity, 10)
  })

  test('🔴 WITH THE TWO RATIO THRESHOLDS EMPTY — as shipped — THE SCORE COUNTS SIX AND SAYS SO', () => {
    const six = computeReportPages({
      current: CURRENT,
      prior: PRIOR,
      currentDates: { balanceSheet: 'As at 30 June 2026', profitLoss: 'For the year ended 30 June 2026' },
      priorDates: { balanceSheet: 'As at 30 June 2025', profitLoss: 'For the year ended 30 June 2025' },
      thresholds: { levels: Object.assign({}, THRESHOLDS.levels, { currentRatio: { green: null, amber: null }, debtToEquity: { green: null, amber: null } }), movements: THRESHOLDS.movements }
    })
    expect(six.score.total).toBe(6)
    expect(six.score.score).toBe(75)
    // The ratios are still READ — the page shows them — they are simply not banded.
    expect(six.trend.measures.find(m => m.key === 'currentRatio').band).toBeNull()
    expect(six.trend.counts.unbanded).toBe(2)
  })

  test('the inventory page from the accounts and the typed figures', () => {
    const i = r.inventory
    expect(i.stockAtCost).toBe(200000)
    expect(i.stockChange).toBe(50000)
    expect(i.stockDays).toBeCloseTo(36.5, 6)
    expect(i.stockDaysPrior).toBeCloseTo((150000 / 1800000) * 365, 6)
    expect(i.slowObsolete).toBe(46000)
    expect(i.slowObsoletePct).toBeCloseTo(0.23, 10)
    expect(i.ageing).toEqual([128, 84, 52, 32, 26])
  })

  test('the three optional pages ride with the figures, each from its own model', () => {
    expect(r.optional.profitBridge.available).toBe(true)
    expect(r.optional.profitBridge.change).toBe(397000)
    expect(r.optional.cashBridge.available).toBe(true)
    expect(r.optional.cashBridge.bankMovement).toBe(41000)
    // the advisor typed 85,000 on the cash page; the balance sheets imply 73,000, and both are named
    expect(r.optional.cashBridge.enteredCapitalSpend).toBe(85000)
    expect(r.optional.profitSensitivity.available).toBe(true)
    expect(r.optional.profitSensitivity.levers[0].key).toBe('price')
    // Stage 4: with no stock export dropped, the stock page is withheld by name
    expect(r.optional.stockVsAccounts.available).toBe(false)
    expect(r.optional.stockVsAccounts.blocked).toBe('NO_STOCK_FILE')
  })

  test('a read stock export reaches the stock page with the balance sheet stock line and page 7 day figures', () => {
    const stockFile = { package: 'Cin7 Core', costBasis: 'unitCost', currency: 'NZD', currencyAssumed: true, lineCount: 3, totalValue: 198000, allocatedValue: 50000, availableValue: 148000, onOrderValue: 9000, categories: [{ name: 'A', value: 198000, share: 1 }], locations: [] }
    const withFile = computeReportPages({ current: CURRENT, prior: PRIOR, inventory: { slowObsolete: null, ageing: null, stockFile }, thresholds: THRESHOLDS })
    const sv = withFile.optional.stockVsAccounts
    expect(sv.available).toBe(true)
    expect(sv.accountsStock).toBe(withFile.inventory.stockAtCost)
    expect(sv.gap).toBe(198000 - withFile.inventory.stockAtCost)
    expect(sv.stockDays).toBe(withFile.cashFlow.stockDays)
    expect(sv.creditorDays).toBe(withFile.cashFlow.creditorDays)
    // Page 6 draws its categories from the same file, name and value only; without a file it has none
    expect(withFile.inventory.categories).toEqual([{ name: 'A', value: 198000 }])
    expect(withFile.inventory.stockFilePackage).toBe('Cin7 Core')
    expect(r.inventory.categories).toBeNull()
    expect(r.inventory.stockFilePackage).toBeNull()
  })

  test('the trends table carries both years for the five rows', () => {
    const rows = {}
    r.trends.rows.forEach((row) => { rows[row.key] = row })
    expect(rows.revenue).toEqual({ key: 'revenue', earlier: null, prior: 3000000, current: 3650000, unit: 'money' })
    expect(rows.netProfit.prior).toBe(495000)
    expect(rows.debtorDays.prior).toBeCloseTo((250000 / 3000000) * 365, 6)
    expect(rows.stockTurn.current).toBeCloseTo(3650000 / 576000, 10)
  })
})

describe('this year alone', () => {
  const r = computeReportPages({ current: CURRENT, inventory: { slowObsolete: null, ageing: [null, null, null, null, null] }, thresholds: THRESHOLDS })

  test('every comparison is null rather than a number invented from nothing', () => {
    expect(r.hasPrior).toBe(false)
    expect(r.trend.available).toBe(false)
    expect(r.summary.revenueChangePct).toBeNull()
    expect(r.summary.cashCycleDays).toBeNull()
    expect(r.balanceSheet.prior).toBeNull()
    expect(r.balanceSheet.equityChangePct).toBeNull()
    expect(r.profitLoss.prior).toBeNull()
    expect(r.dashboard.revenueVsExpenses.prior).toBeNull()
    expect(r.inventory.stockChange).toBeNull()
  })

  test('🔴 NO BANDED MEASURE MEANS NO SCORE, not a score of zero', () => {
    expect(r.score.total).toBe(0)
    expect(r.score.score).toBeNull()
    expect(r.score.band).toBeNull()
  })

  test('the drivers are listed with nothing in them but net capital spend', () => {
    r.cashFlow.drivers.slice(0, 6).forEach((d) => {
      expect(d.value).toBeNull()
      expect(d.direction).toBeNull()
    })
    expect(r.cashFlow.drivers[6].value).toBe(85000)
  })

  test('blank inventory figures leave the ageing chart off and the slow stock unstated', () => {
    expect(r.inventory.ageing).toBeNull()
    expect(r.inventory.slowObsolete).toBeNull()
    expect(r.inventory.slowObsoletePct).toBeNull()
  })

  test('an empty call answers the documented shape', () => {
    const e = computeReportPages()
    expect(e.hasPrior).toBe(false)
    expect(e.score.score).toBeNull()
    expect(e.profitLoss.current.revenue).toBe(0)
  })
})

describe('the band words', () => {
  test('the cut-offs are in one place and cover every score', () => {
    expect(SCORE_BANDS.map(b => b.band)).toEqual(['good', 'steady', 'atRisk'])
    expect(scoreBand(100)).toBe('good')
    expect(scoreBand(75)).toBe('good')
    expect(scoreBand(74)).toBe('steady')
    expect(scoreBand(50)).toBe('steady')
    expect(scoreBand(49)).toBe('atRisk')
    expect(scoreBand(0)).toBe('atRisk')
    expect(scoreBand(null)).toBeNull()
  })
})
