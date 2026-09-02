'use strict'

const {
  extractForecastBalanceSheet,
  extractBalanceSheet,
  extractProfitLoss
} = require('../../server/report/intake/xeroReportParser')
const {
  PACKAGES, supportedList, supportedSentence, verifiedNames, expectedNames
} = require('../../server/report/intake/supportedPackages')
const en = require('../../locales/en.json')

/**
 * Which accounting packages the intake can read.
 *
 * 🔴 READ THIS BEFORE TRUSTING A PASS. The QuickBooks and MYOB grids below are
 * RECONSTRUCTIONS of each package's published report layout. They are NOT real exports,
 * and no real export from either package has ever been read. A green run here proves
 * the reader copes with the shape as documented — it cannot prove the shape is right,
 * because a real chart of accounts is the thing that surprises you. That is exactly why
 * `supportedPackages.js` marks both `expected` rather than `verified`, and why the
 * screens say so out loud.
 *
 * The Xero grids elsewhere in the suite ARE modelled on real exports supplied by the
 * firm on 2026-07-13 and 2026-07-15.
 *
 * Every assertion here was earned: each one failed before the fix that made it pass,
 * on 2026-09-02, when the reader was first pointed at these layouts.
 */

/* ------------------------------------------------------------ QuickBooks Online -- */
/* Company name ABOVE the title; "As of" not "As at"; A/R and A/P suffixes; uppercase
   headings; LIABILITIES AND EQUITY as one parent; "Common Stock"; "Cost of Goods
   Sold"; computed rows (GROSS PROFIT, NET INCOME) that are not "Total …" rows. */
const QBO_BS = [
  ['Kinetic Test Ltd'],
  ['Balance Sheet'],
  ['As of 31 March 2026'],
  [],
  ['ASSETS'],
  ['Current Assets'],
  ['Bank Accounts'],
  ['Business Cheque Account', 71000],
  ['Total Bank Accounts', 71000],
  ['Accounts Receivable'],
  ['Accounts Receivable (A/R)', 52000],
  ['Total Accounts Receivable', 52000],
  ['Other Current Assets'],
  ['Inventory Asset', 65000],
  ['Prepaid Expenses', 3000],
  ['Total Other Current Assets', 68000],
  ['Total Current Assets', 191000],
  ['Fixed Assets'],
  ['Motor Vehicles', 80000],
  ['Office Equipment', 60000],
  ['Computer Equipment', 70000],
  ['Total Fixed Assets', 210000],
  ['TOTAL ASSETS', 401000],
  ['LIABILITIES AND EQUITY'],
  ['Liabilities'],
  ['Current Liabilities'],
  ['Accounts Payable'],
  ['Accounts Payable (A/P)', 58000],
  ['Total Accounts Payable', 58000],
  ['Other Current Liabilities'],
  ['GST Payable', 5500],
  ['Accrued Liabilities', 5000],
  ['Total Other Current Liabilities', 10500],
  ['Total Current Liabilities', 68500],
  ['Long-Term Liabilities'],
  ['Bank Loan', 80000],
  ['Total Long-Term Liabilities', 80000],
  ['Total Liabilities', 148500],
  ['Equity'],
  ['Common Stock', 200000],
  ['Retained Earnings', 7000],
  ['Total Equity', 207000],
  ['TOTAL LIABILITIES AND EQUITY', 355500]
]

const QBO_PL = [
  ['Kinetic Test Ltd'],
  ['Profit and Loss'],
  ['January - December 2026'],
  [],
  ['Income'],
  ['Sales of Product Income', 890000],
  ['Total Income', 890000],
  ['Cost of Goods Sold'],
  ['Cost of Goods Sold', 530000],
  ['Total Cost of Goods Sold', 530000],
  ['GROSS PROFIT', 360000],
  ['Expenses'],
  ['Advertising', 11000],
  ['Bank Charges', 650],
  ['Insurance', 4500],
  ['Rent or Lease', 8500],
  ['Payroll Expenses', 85000],
  ['Total Expenses', 109650],
  ['NET OPERATING INCOME', 250350],
  ['NET INCOME', 250350]
]

/* ------------------------------------------------------------------------- MYOB -- */
/* "Trade Debtors" / "Trade Creditors"; bank accounts listed with NO "Bank" heading;
   "Profit & Loss Statement" title; a bare date-range period line. */
const MYOB_BS = [
  ['Kinetic Test Ltd'],
  ['Balance Sheet'],
  ['As of 31 March 2026'],
  [],
  ['Assets'],
  ['Current Assets'],
  ['Business Bank Account', 71000],
  ['Trade Debtors', 52000],
  ['Inventory', 65000],
  ['Total Current Assets', 188000],
  ['Fixed Assets'],
  ['Motor Vehicles at Cost', 80000],
  ['Office Equipment at Cost', 60000],
  ['Total Fixed Assets', 140000],
  ['Total Assets', 328000],
  ['Liabilities'],
  ['Current Liabilities'],
  ['Trade Creditors', 58000],
  ['GST Collected', 5500],
  ['Total Current Liabilities', 63500],
  ['Long Term Liabilities'],
  ['Bank Loan', 80000],
  ['Total Long Term Liabilities', 80000],
  ['Total Liabilities', 143500],
  ['Equity'],
  ['Share Capital', 200000],
  ['Retained Earnings', 7000],
  ['Total Equity', 207000]
]

const MYOB_PL = [
  ['Kinetic Test Ltd'],
  ['Profit & Loss Statement'],
  ['1 April 2025 to 31 March 2026'],
  [],
  ['Income'],
  ['Sales', 890000],
  ['Total Income', 890000],
  ['Cost of Sales'],
  ['Purchases', 530000],
  ['Total Cost of Sales', 530000],
  ['Gross Profit', 360000],
  ['Expenses'],
  ['Advertising', 11000],
  ['Bank Charges', 650],
  ['Insurance', 4500],
  ['Rent', 8500],
  ['Wages & Salaries', 85000],
  ['Total Expenses', 109650],
  ['Operating Profit', 250350],
  ['Net Profit', 250350]
]

describe('QuickBooks Online — reconstructed layout, NOT a real export', () => {
  const bs = extractForecastBalanceSheet(QBO_BS)

  test('the Balance Sheet is recognised and its "As of" date is read', () => {
    // Only "As at" and "For the" were matched before; QuickBooks and MYOB both say
    // "As of", so the date was silently lost.
    expect(bs.recognised).toBe(true)
    expect(bs.reportDate).toBe('31 March 2026')
  })

  test('the company name is read from ABOVE the title', () => {
    // Xero puts the company under the title, QuickBooks over it. Row 0 was excluded
    // from the company scan, so the name was never found — and the scan then took the
    // first section heading instead, swallowing that whole section from the parse.
    expect(bs.companyName).toBe('Kinetic Test Ltd')
  })

  test('🔴 liabilities under "LIABILITIES AND EQUITY" are not mistaken for equity', () => {
    // The heading contains the word "equity", so a loose test excluded every liability
    // beneath it: payables, GST, accruals and the loans all disappeared at once.
    expect(bs.figures.accountsPayable.value).toBe(58000)
    expect(bs.figures.gstPayable.value).toBe(5500)
    expect(bs.figures.accruedExpenses.value).toBe(5000)
    expect(bs.loanBalances).toEqual([80000])
  })

  test('the current assets read correctly, A/R suffix and all', () => {
    expect(bs.figures.cashAtBank.value).toBe(71000)
    expect(bs.figures.accountsReceivable.value).toBe(52000)
    expect(bs.figures.inventory.value).toBe(65000)
    expect(bs.figures.prepayments.value).toBe(3000)
  })

  test('"Common Stock" is read as share capital', () => {
    expect(bs.figures.authorisedCapital.value).toBe(200000)
    expect(bs.figures.retainedEarnings.value).toBe(7000)
  })

  test('the fixed assets land in their categories and none is lost', () => {
    const total = Object.keys(bs.assets).reduce((a, k) => a + bs.assets[k].value, 0)
    expect(total).toBe(210000)
    expect(bs.assets.vehicles.value).toBe(80000)
    expect(bs.assets.officeEquipment.value).toBe(60000)
    expect(bs.assets.computerHardware.value).toBe(70000)
  })

  test('the Profit and Loss reads its income, cost of sales and expense lines', () => {
    const pl = extractProfitLoss(QBO_PL)
    expect(pl.recognised).toBe(true)
    expect(pl.reportDate).toBe('January - December 2026')
    expect(pl.year).toBe(2026)
    expect(pl.plFigures.sales.value).toBe(890000)
    expect(pl.plFigures.costOfSales.value).toBe(530000)
    expect(pl.expenseLines.map(l => l.name)).toEqual([
      'Advertising', 'Bank Charges', 'Insurance', 'Rent or Lease', 'Payroll Expenses'
    ])
  })

  test('🔴 the computed rows are NOT counted as income or expenses', () => {
    // "GROSS PROFIT" and "NET INCOME" are subtotals that do not begin with "Total", so
    // nothing structural marks them out. Counting either would double the figures.
    const pl = extractProfitLoss(QBO_PL)
    expect(pl.plFigures.sales.value).toBe(890000) // not 890000 + 360000 + 250350
    const expenseTotal = pl.expenseLines.reduce((a, l) => a + l.amount, 0)
    expect(expenseTotal).toBe(109650)
  })
})

describe('MYOB — reconstructed layout, NOT a real export', () => {
  const bs = extractForecastBalanceSheet(MYOB_BS)

  test('the Balance Sheet is recognised and dated', () => {
    expect(bs.recognised).toBe(true)
    expect(bs.reportDate).toBe('31 March 2026')
    expect(bs.companyName).toBe('Kinetic Test Ltd')
  })

  test('🔴 a bank account with no "Bank" heading above it is still found', () => {
    // Xero and QuickBooks group the accounts under a Bank heading; MYOB lists them
    // straight under Current Assets, so the account has to be recognised by its label.
    expect(bs.figures.cashAtBank.value).toBe(71000)
  })

  test('"Trade Debtors" and "Trade Creditors" are read', () => {
    expect(bs.figures.accountsReceivable.value).toBe(52000)
    expect(bs.figures.accountsPayable.value).toBe(58000)
  })

  test('the rest of the position reads correctly', () => {
    expect(bs.figures.inventory.value).toBe(65000)
    expect(bs.figures.gstPayable.value).toBe(5500)
    expect(bs.figures.authorisedCapital.value).toBe(200000)
    expect(bs.figures.retainedEarnings.value).toBe(7000)
    expect(bs.loanBalances).toEqual([80000])
  })

  test('"Profit & Loss Statement" is recognised and its date range read', () => {
    const pl = extractProfitLoss(MYOB_PL)
    expect(pl.recognised).toBe(true)
    expect(pl.reportDate).toBe('1 April 2025 to 31 March 2026')
    expect(pl.year).toBe(2026)
    expect(pl.plFigures.sales.value).toBe(890000)
    expect(pl.plFigures.costOfSales.value).toBe(530000)
    expect(pl.expenseLines).toHaveLength(5)
  })
})

describe('Xero stays correct — the fixes for the other two changed nothing here', () => {
  // Every change above touched shared code, so the package that IS verified against
  // real exports is re-checked in the same file.
  const XERO_BS = [
    ['Balance Sheet'],
    ['Kinetic Test Ltd'],
    ['As at 31 March 2026'],
    [],
    ['Assets'],
    ['Bank'],
    ['Cheque Account', 71000],
    ['Total Bank', 71000],
    ['Current Assets'],
    ['Accounts Receivable', 52000],
    ['Inventory', 65000],
    ['Total Current Assets', 117000],
    ['Total Assets', 188000],
    ['Liabilities'],
    ['Current Liabilities'],
    ['Accounts Payable', 58000],
    ['Total Current Liabilities', 58000],
    ['Total Liabilities', 58000]
  ]

  test('the Quick Position contract is untouched', () => {
    const qp = extractBalanceSheet(XERO_BS)
    expect(qp.recognised).toBe(true)
    expect(qp.companyName).toBe('Kinetic Test Ltd')
    expect(qp.reportDate).toBe('31 March 2026')
    expect(qp.proposals.cash.value).toBe(71000)
    expect(qp.proposals.debtors.value).toBe(52000)
    expect(qp.proposals.stock.value).toBe(65000)
    expect(qp.proposals.creditors.value).toBe(58000)
  })

  test('the forecast opening position is untouched', () => {
    const f = extractForecastBalanceSheet(XERO_BS)
    expect(f.figures.cashAtBank.value).toBe(71000)
    expect(f.figures.accountsReceivable.value).toBe(52000)
    expect(f.figures.accountsPayable.value).toBe(58000)
  })
})

describe('The supported-package list is one fact, stated once', () => {
  test('every package declares an honest confidence and its evidence', () => {
    expect(PACKAGES.length).toBeGreaterThan(0)
    PACKAGES.forEach((p) => {
      expect(typeof p.name).toBe('string')
      expect(['verified', 'expected']).toContain(p.confidence)
      expect(typeof p.evidence).toBe('string')
      expect(p.evidence.length).toBeGreaterThan(20)
    })
  })

  test('🔴 only a package read from REAL exports may be marked verified', () => {
    // The guard against quiet promotion. Moving a package to `verified` takes a real
    // Balance Sheet and P&L export from it — never more reconstructions. If this list
    // changes, the evidence line must say a real export was read.
    verifiedNames().forEach((name) => {
      const p = PACKAGES.filter(x => x.name === name)[0]
      expect(p.evidence).toMatch(/real/i)
    })
    expect(verifiedNames()).toEqual(['Xero'])
    expect(expectedNames()).toEqual(['QuickBooks Online', 'MYOB'])
  })

  test('an "expected" package says plainly that no real export has been read', () => {
    expectedNames().forEach((name) => {
      const p = PACKAGES.filter(x => x.name === name)[0]
      expect(p.evidence).toMatch(/no real export has been read/i)
    })
  })

  test('🔴 the sentence on screen names exactly the packages the code lists', () => {
    // The screens read a locale string; the refusals build theirs from the module. This
    // is what stops the two drifting — a package added to the code but not the screen
    // (or the reverse) fails here.
    const onScreen = en.report.supportedSoftware
    PACKAGES.forEach((p) => { expect(onScreen).toContain(p.name) })
    expect(onScreen).toContain(supportedList().split(' and ')[1] || '')
    verifiedNames().forEach((n) => { expect(onScreen).toMatch(new RegExp(n + '[^.]*confirmed against real exports')) })
  })

  test('the short list used in refusals reads as a sentence, not an array', () => {
    expect(supportedList()).toBe('Xero, QuickBooks Online and MYOB')
    expect(supportedSentence()).toContain('can be read')
    expect(supportedSentence()).toContain('published layout')
  })
})
