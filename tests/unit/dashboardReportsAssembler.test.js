'use strict'

const { extractForecastBalanceSheet, extractProfitLoss } = require('../../server/report/intake/xeroReportParser')
const {
  assembleDashboardIntake, dateKey, LINES, MAX_FILES
} = require('../../server/report/intake/dashboardReportsAssembler')

/**
 * The Business Performance Report's intake (item 4.70, stage 2).
 *
 * What UAT cannot see: which of two files became "this year", a loan that landed on the
 * wrong liability line, wages counted twice (once as wages, once inside operating
 * expenses), and a net capital spend figure presented as read from a file when no file
 * carries one.
 */

/** A parsed forecast Balance Sheet, as the reader returns it. */
function bs (reportDate, over) {
  return Object.assign({
    kind: 'forecastBalanceSheet',
    companyName: 'Harbourside Kitchen Supplies Ltd',
    reportDate,
    figures: {
      cashAtBank: { value: 224000, source: 'file' },
      accountsReceivable: { value: 334000, source: 'file' },
      inventory: { value: 322000, source: 'file' },
      prepayments: { value: 6000, source: 'file' },
      gstRefund: { value: 4000, source: 'file' },
      accountsPayable: { value: 210000, source: 'file' },
      gstPayable: { value: 30000, source: 'file' },
      otherCurrentLiability: { value: 20000, source: 'file' },
      otherNonCurrentLiability: { value: 5000, source: 'file' }
    },
    assets: { vehicles: { value: 105000, source: 'file' }, plantEquipment: { value: 400000, source: 'file' } },
    loanBalances: [150000, 200000],
    loanTerms: ['current', 'nonCurrent'],
    shareholderBalances: [],
    shareholderSides: [],
    warnings: []
  }, over || {})
}

/** A parsed Profit and Loss, as the reader returns it. */
function pl (reportDate, over) {
  return Object.assign({
    kind: 'profitLoss',
    companyName: 'Harbourside Kitchen Supplies Ltd',
    reportDate,
    plFigures: {
      sales: { value: 2840000, source: 'file' },
      otherIncome: { value: 3000, source: 'file' },
      interestReceived: { value: 500, source: 'file' },
      costOfSales: { value: 1676000, source: 'file' },
      operatingExpenses: { value: 768000, source: 'file' },
      loanInterestPaid: { value: 32000, source: 'file' }
    },
    expenseLines: [
      { name: 'Wages and Salaries', amount: 560000 },
      { name: 'Shareholder Salaries', amount: 36000 },
      { name: 'Depreciation', amount: 38000 },
      { name: 'Interest Paid', amount: 32000 },
      { name: 'Rent', amount: 102000 }
    ],
    warnings: []
  }, over || {})
}

describe('dateKey — a report is dated by its own line', () => {
  test('reads "As at" and "For the year ended" alike', () => {
    expect(dateKey('As at 30 June 2026')).toBe(20260630)
    expect(dateKey('For the year ended 30 June 2026')).toBe(20260630)
    expect(dateKey('31 Mar 2025')).toBe(20250331)
  })
  test('is null for an unreadable line', () => {
    expect(dateKey(null)).toBeNull()
    expect(dateKey('Balance Sheet')).toBeNull()
    expect(dateKey('30 Smarch 2026')).toBeNull()
  })
})

describe('the balance-sheet lines', () => {
  const r = assembleDashboardIntake([bs('As at 30 June 2026')])
  const f = r.current.figures

  test('every read line is marked from file, and the memo line accounts payable is kept', () => {
    expect(f.bank).toEqual({ value: 224000, source: 'file' })
    expect(f.accountsReceivable.value).toBe(334000)
    expect(f.stock.value).toBe(322000)
    expect(f.accountsPayable.value).toBe(210000)
    LINES.forEach((k) => { if (f[k]) { expect(['file', 'entered']).toContain(f[k].source) } })
  })

  test('other current assets is the sum of the small current lines', () => {
    expect(f.otherCurrentAssets.value).toBe(10000) // 6000 + 4000
  })

  test('fixed assets is every non-current asset category summed', () => {
    expect(f.fixedAssets.value).toBe(505000)
  })

  test('🔴 A LOAN LANDS ON THE LIABILITY LINE ITS SECTION SAYS, not on both and not on neither', () => {
    // current: AP 210000 + GST 30000 + other 20000 + the current loan 150000
    expect(f.currentLiabilities.value).toBe(410000)
    // non-current: other 5000 + the term loan 200000
    expect(f.nonCurrentLiabilities.value).toBe(205000)
  })

  test('a shareholder account follows its side: a liability adds to liabilities, an overdrawn one is a current asset', () => {
    const r2 = assembleDashboardIntake([bs('As at 30 June 2026', {
      shareholderBalances: [50000, 8000, 12000],
      shareholderSides: ['nonCurrentLiability', 'asset', 'equity']
    })])
    expect(r2.current.figures.nonCurrentLiabilities.value).toBe(255000)
    expect(r2.current.figures.otherCurrentAssets.value).toBe(18000)
    // Equity-side rows are not a line: equity is assets less liabilities, derived on the page.
    expect(r2.current.figures.currentLiabilities.value).toBe(410000)
  })

  test('a line the file did not carry is absent, never zero', () => {
    const r2 = assembleDashboardIntake([bs('As at 30 June 2026', { figures: { cashAtBank: { value: 1, source: 'file' } }, assets: {}, loanBalances: [], loanTerms: [] })])
    expect(r2.current.figures.stock).toBeUndefined()
    expect(r2.current.figures.fixedAssets).toBeUndefined()
    expect(r2.current.figures.currentLiabilities).toBeUndefined()
  })
})

describe('the profit-and-loss lines', () => {
  const r = assembleDashboardIntake([pl('For the year ended 30 June 2026')])
  const f = r.current.figures

  test('trading income, cost of sales and interest paid read straight across', () => {
    expect(f.tradingIncome.value).toBe(2840000)
    expect(f.costOfSales.value).toBe(1676000)
    expect(f.interestPaid.value).toBe(32000)
  })

  test('other income gathers interest and dividends received with it', () => {
    expect(f.otherIncome.value).toBe(3500)
  })

  test('🔴 WAGES ARE COUNTED ONCE: taken out of operating expenses, which the deck shows without them', () => {
    expect(f.wages.value).toBe(596000) // wages 560000 + shareholder salaries 36000
    expect(f.depreciation.value).toBe(38000)
    // 768000 − 596000 wages − 38000 depreciation − 32000 interest
    expect(f.operatingExpenses.value).toBe(102000)
  })
})

describe('which year is which', () => {
  test('🔴 THIS YEAR IS THE NEWER DATE LINE, whatever order the files arrived in', () => {
    const r = assembleDashboardIntake([
      bs('As at 30 June 2025', { figures: { cashAtBank: { value: 183000, source: 'file' } }, assets: {}, loanBalances: [], loanTerms: [] }),
      pl('For the year ended 30 June 2025', { plFigures: { sales: { value: 2527000, source: 'file' } }, expenseLines: [] }),
      pl('For the year ended 30 June 2026'),
      bs('As at 30 June 2026')
    ])
    expect(r.blocked).toBeNull()
    expect(r.current.figures.bank.value).toBe(224000)
    expect(r.current.figures.tradingIncome.value).toBe(2840000)
    expect(r.prior.figures.bank.value).toBe(183000)
    expect(r.prior.figures.tradingIncome.value).toBe(2527000)
    expect(r.current.balanceSheetDate).toBe('As at 30 June 2026')
    expect(r.prior.profitLossDate).toBe('For the year ended 30 June 2025')
  })

  test('two Balance Sheets that cannot be dated apart are refused, never ordered by upload', () => {
    const r = assembleDashboardIntake([bs('As at 30 June 2026'), bs('As at 30 June 2026')])
    expect(r.blocked).toMatch(/could not be told apart/)
    expect(r.current).toBeNull()
    const r2 = assembleDashboardIntake([pl(null), pl('For the year ended 30 June 2026')])
    expect(r2.blocked).toMatch(/could not be told apart/)
  })

  test('more than two of a kind, or more than four files, is refused by name', () => {
    expect(assembleDashboardIntake([bs('1 Jan 2024'), bs('1 Jan 2025'), bs('1 Jan 2026')]).blocked).toMatch(/More than two Balance Sheets/)
    expect(assembleDashboardIntake([pl('1 Jan 2024'), pl('1 Jan 2025'), pl('1 Jan 2026')]).blocked).toMatch(/More than two Profit and Loss/)
    const five = [bs('1 Jan 2026'), bs('1 Jan 2025'), pl('1 Jan 2026'), pl('1 Jan 2025'), pl('1 Jan 2024')]
    expect(five.length).toBe(MAX_FILES + 1)
    expect(assembleDashboardIntake(five).blocked).toMatch(/at most 4 files/)
  })

  test('nothing read is said so', () => {
    expect(assembleDashboardIntake([]).blocked).toBe('No file was read.')
  })
})

describe('the figure no export carries', () => {
  test('🔴 NET CAPITAL SPEND IS PROPOSED AS THE ADVISOR\'S, never as read from a file', () => {
    const r = assembleDashboardIntake([
      bs('As at 30 June 2026'),
      bs('As at 30 June 2025', { assets: { vehicles: { value: 100000, source: 'file' }, plantEquipment: { value: 358000, source: 'file' } } }),
      pl('For the year ended 30 June 2026')
    ])
    // (505000 − 458000) + depreciation 38000
    expect(r.current.figures.netCapitalSpend).toEqual({ value: 85000, source: 'entered' })
    expect(r.warnings.some(w => /Net capital spend/.test(w))).toBe(true)
  })

  test('without last year or without depreciation it is not proposed at all', () => {
    const r = assembleDashboardIntake([bs('As at 30 June 2026'), pl('For the year ended 30 June 2026')])
    expect(r.current.figures.netCapitalSpend).toBeUndefined()
  })
})

describe('the warnings', () => {
  test('this year alone says the comparison and the cash drivers are missing', () => {
    const r = assembleDashboardIntake([bs('As at 30 June 2026'), pl('For the year ended 30 June 2026')])
    expect(r.prior).toBeNull()
    expect(r.warnings.some(w => /this year alone/.test(w))).toBe(true)
  })

  test('a Balance Sheet and a Profit and Loss ending on different days are named', () => {
    const r = assembleDashboardIntake([bs('As at 31 March 2026'), pl('For the year ended 30 June 2026')])
    expect(r.warnings.some(w => /same year/.test(w))).toBe(true)
  })

  test('files naming different organisations are named, and the file warnings ride along', () => {
    const r = assembleDashboardIntake([bs('As at 30 June 2026', { warnings: ['from the file'] }), pl('For the year ended 30 June 2026', { companyName: 'Someone Else Ltd' })])
    expect(r.warnings).toContain('from the file')
    expect(r.warnings.some(w => /different organisations/.test(w))).toBe(true)
    expect(r.companyName).toBe('Harbourside Kitchen Supplies Ltd')
  })
})

describe('end to end from a real grid', () => {
  const BS_GRID = [
    ['Balance Sheet'], ['Kinetic Test Ltd'], ['As at 31 March 2026'], [],
    ['Assets'], ['Current Assets'], ['Bank'], ['Cheque Account', 71000], ['Total Bank', 71000],
    ['Accounts Receivable', 52000], ['Inventory', 40000], ['Total Current Assets', 163000],
    ['Non-Current Assets'], ['Motor Vehicles', 80000], ['Total Non-Current Assets', 80000],
    ['Total Assets', 243000],
    ['Liabilities'], ['Current Liabilities'], ['Accounts Payable', 58000], ['Short Term Loan', 12000], ['Total Current Liabilities', 70000],
    ['Non-Current Liabilities'], ['XYZ Bank Loan', 100000], ['Total Non-Current Liabilities', 100000],
    ['Total Liabilities', 170000],
    ['Equity'], ['Share Capital', 50000], ['Retained Earnings', 23000], ['Total Equity', 73000]
  ]
  const PL_GRID = [
    ['Profit and Loss'], ['Kinetic Test Ltd'], ['For the year ended 31 March 2026'], [],
    ['Income'], ['Sales', 890000], ['Total Income', 890000],
    ['Less Cost of Sales'], ['Purchases', 400000], ['Total Cost of Sales', 400000],
    ['Less Operating Expenses'], ['Rent', 8500], ['Wages and Salaries', 85000], ['Depreciation', 6000], ['Interest Paid', 4000], ['Total Operating Expenses', 103500]
  ]

  test('the reader\'s loan sides reach the two liability lines', () => {
    const r = assembleDashboardIntake([extractForecastBalanceSheet(BS_GRID), extractProfitLoss(PL_GRID)])
    const f = r.current.figures
    expect(f.bank.value).toBe(71000)
    expect(f.currentLiabilities.value).toBe(70000)
    expect(f.nonCurrentLiabilities.value).toBe(100000)
    expect(f.accountsPayable.value).toBe(58000)
    expect(f.fixedAssets.value).toBe(80000)
    expect(f.tradingIncome.value).toBe(890000)
    expect(f.costOfSales.value).toBe(400000)
    expect(f.wages.value).toBe(85000)
    expect(f.depreciation.value).toBe(6000)
    expect(f.interestPaid.value).toBe(4000)
    expect(f.operatingExpenses.value).toBe(8500)
    expect(r.companyName).toBe('Kinetic Test Ltd')
  })
})
