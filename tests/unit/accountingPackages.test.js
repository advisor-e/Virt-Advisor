'use strict'

const {
  extractForecastBalanceSheet,
  extractBalanceSheet,
  extractProfitLoss
} = require('../../server/report/intake/xeroReportParser')
const {
  PACKAGES, supportedList, supportedSentence, sentenceFor, verifiedNames, expectedNames
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

/**
 * 🔴 THE SAME MYOB REPORTS WITH MYOB'S OWN "Account No." COLUMN — the column the two
 * fixtures above leave out, and the whole reason they passed while the reader extracted
 * nothing at all.
 *
 * Found 2026-09-07 by running a fuller reference workbook through the real parser. Every
 * label arrived as an account code, so the sections came through as `4-0000` / `5-0000`,
 * nothing matched, and an MYOB balance sheet produced `proposals: {}` — no figures, and
 * no error on screen saying the file had not been read. `supportedPackages.js` recorded
 * MYOB as handling its published layout at the time; it did not handle it at all.
 *
 * These tests earn their place because no MYOB file has ever reached UAT, and the failure
 * they guard is silent: the screen accepts the upload and simply seeds nothing.
 */
describe('MYOB with its Account No. column — the shape that read as nothing', () => {
  const CODED_BS = [
    ['Apex Test Ltd'],
    ['Balance Sheet Summary'],
    ['As of December 31, 2025'],
    [],
    ['Account No.', 'Account Name', 'Selected Period', 'Prior Year'],
    ['1-0000', 'ASSETS'],
    ['1-1000', 'Current Assets'],
    ['1-1100', 'Cheque Account - Operating', 64500, 42100],
    ['1-1120', 'Online Saver Account', 25000, 15000],
    ['1-1200', 'Trade Debtors', 34200, 28900],
    ['1-1300', 'Stock on Hand', 45800, 39400],
    [null, 'Total Current Assets', 173000, 128200],
    ['2-0000', 'LIABILITIES'],
    ['2-1000', 'Current Liabilities'],
    ['2-1100', 'Trade Creditors', 22400, 18500],
    [null, 'Total Current Liabilities', 22400, 18500]
  ]

  const CODED_PL = [
    ['Apex Test Ltd'],
    ['Profit & Loss (With Year to Date)'],
    ['January 2025 through December 2025'],
    [],
    ['Account No.', 'Account Name', 'Selected Period', '% of Income', 'YTD Amount'],
    ['4-0000', 'INCOME'],
    ['4-1000', 'Service & Repair Revenue', 285400, 0.592, 285400],
    ['4-1100', 'Parts Sales', 142100, 0.295, 142100],
    ['4-1200', 'Custom Fabrication', 54300, 0.113, 54300],
    [null, 'Total INCOME', 481800, 1, 481800],
    ['6-0000', 'EXPENSES'],
    ['6-1000', 'Advertising & Marketing', 4200, 0.009, 4200],
    ['6-1400', 'Rent & Lease Premises', 48000, 0.1, 48000],
    [null, 'Total EXPENSES', 52200, 0.109, 52200]
  ]

  test('🔴 the account NAME is the label, never the account code', () => {
    const bs = extractForecastBalanceSheet(CODED_BS)
    // Before the fix every one of these was absent: the labels were "1-1200" and friends,
    // so no figure matched anything and the whole position came back empty.
    expect(bs.figures.accountsReceivable.value).toBe(34200)
    expect(bs.figures.inventory.value).toBe(45800)
    expect(bs.figures.accountsPayable.value).toBe(22400)
  })

  test('🔴 a coded P&L yields named expense lines and its income total', () => {
    const pl = extractProfitLoss(CODED_PL)
    expect(pl.incomeTotal).toBe(481800)
    const names = pl.expenseLines.map(l => l.name)
    expect(names).toContain('Advertising & Marketing')
    expect(names).toContain('Rent & Lease Premises')
    // The codes must not survive as names — that was the visible symptom.
    expect(names.some(n => /^\d-\d{4}$/.test(n))).toBe(false)
  })

  test('no section is reported unrecognised by its account code', () => {
    const pl = extractProfitLoss(CODED_PL)
    const coded = (pl.warnings || []).filter(w => /'\d-\d{4}'/.test(w))
    expect(coded).toEqual([])
  })

  test('the figure taken is the period, not the % of income beside it', () => {
    const pl = extractProfitLoss(CODED_PL)
    const rent = pl.expenseLines.find(l => l.name === 'Rent & Lease Premises')
    // 48000, never 0.1 — the first figure column is the period, and the reader takes it.
    expect(rent.amount).toBe(48000)
  })

  /**
   * 🔴 THIS ONE GUARDS A WRONG NUMBER, NOT A MISSING ONE. `BANK_ACCOUNT_RE` matched
   * "savings account" but not MYOB's own "Online **Saver** Account", so cash came through
   * as 64,500 of a real 89,500 — one of the two accounts, silently. A short cash figure
   * looks entirely reasonable on screen, which is precisely why it needs a test.
   */
  test('🔴 every bank account is counted, "Saver" as well as "Savings"', () => {
    const bs = extractForecastBalanceSheet(CODED_BS)
    expect(bs.figures.cashAtBank.value).toBe(89500)
    expect(bs.figures.cashAtBank.candidates.map(c => c.label))
      .toEqual(['Cheque Account - Operating', 'Online Saver Account'])
  })

  test('cash is found with no "Bank Accounts" heading above it', () => {
    // The Quick Position path filtered by section only, so an MYOB file showed no cash at
    // all there. The fallback reads the accounts by name when no such section exists.
    const qp = extractBalanceSheet(CODED_BS)
    expect(qp.proposals.cash.value).toBe(89500)
  })

  test('🔴 "Month YYYY through Month YYYY" is a period, so the report has a year', () => {
    // Without this the P&L had no date and no year at all, and the forecast reads the
    // year to know which period it is seeding.
    const pl = extractProfitLoss(CODED_PL)
    expect(pl.reportDate).toBe('January 2025 through December 2025')
    expect(pl.year).toBe(2025)
  })

  /**
   * 🔴 A WRONG NUMBER AGAIN, AND A WHOLE YEAR'S DEPRECIATION WITH IT. MYOB heads its
   * fixed assets "Property, Plant & Equipment" — the accounting standard's own wording —
   * and never says "fixed" or "non-current". The section test knew only those two words,
   * so every asset row fell through to the CURRENT side: `assets` came back empty and the
   * net 145,300 was swept into the other-current-asset catch-all.
   *
   * The balance sheet still tied, which is why nothing complained. But the forecast opens
   * all six asset rows at zero, charges no depreciation for the year, and overstates
   * working capital by the same amount. The identical figures through QuickBooks split
   * correctly — same company, different package, different answer.
   */
  test('🔴 "Property, Plant & Equipment" is a FIXED asset section, not a current one', () => {
    const PPE_BS = [
      ['Apex Test Ltd'],
      ['Balance Sheet Summary'],
      ['As of December 31, 2025'],
      [],
      ['Account No.', 'Account Name', 'Selected Period', 'Prior Year'],
      ['1-0000', 'ASSETS'],
      ['1-1000', 'Current Assets'],
      ['1-1100', 'Cheque Account - Operating', 64500, 42100],
      [null, 'Total Current Assets', 64500, 42100],
      ['1-2000', 'Property, Plant & Equipment'],
      ['1-2100', 'Workshop Machinery & Tools', 125000, 110000],
      ['1-2110', 'Accum Dep - Workshop Machinery', -45000, -32500],
      ['1-2200', 'Motor Vehicles', 85000, 85000],
      ['1-2210', 'Accum Dep - Motor Vehicles', -28000, -19500],
      ['1-2300', 'Office Equipment', 14500, 12000],
      ['1-2310', 'Accum Dep - Office Equipment', -6200, -4200],
      [null, 'Total Property, Plant & Equipment', 145300, 150800],
      [null, 'TOTAL ASSETS', 209800, 192800]
    ]
    const bs = extractForecastBalanceSheet(PPE_BS)
    // Each category net of its own accumulated depreciation.
    expect(bs.assets.plantEquipment.value).toBe(80000)
    expect(bs.assets.vehicles.value).toBe(57000)
    expect(bs.assets.officeEquipment.value).toBe(8300)
    // And the money is NOT also sitting on the current side — the symptom that made this
    // invisible was that the total still tied while 145,300 was in the wrong place.
    expect(bs.figures.otherCurrentAsset).toBeUndefined()
    expect(bs.figures.cashAtBank.value).toBe(64500)
  })

  test('a label that is genuinely only a code keeps the code', () => {
    // The swap needs a real name after it; with nothing to swap to, nothing changes.
    const bs = extractForecastBalanceSheet([
      ['Apex Test Ltd'], ['Balance Sheet'], ['As of December 31, 2025'], [],
      ['1-1200', 34200]
    ])
    expect(bs.recognised).toBe(true)
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
      expect(p.evidence).toMatch(/real\b[^.]*export/i)
    })
    // ALL THREE since 2026-09-07, when Mike supplied QuickBooks Online and MYOB exports.
    // They were misrecorded as reconstructions for a day and he corrected it on 2026-09-08.
    expect(verifiedNames()).toEqual(['Xero', 'QuickBooks Online', 'MYOB'])
    expect(expectedNames()).toEqual([])
  })

  test('an "expected" package says plainly that no real export has been read', () => {
    // No package is `expected` today. The rule still holds for the next one added, and this
    // is what stops it arriving marked verified with nothing behind it.
    expectedNames().forEach((name) => {
      const p = PACKAGES.filter(x => x.name === name)[0]
      expect(p.evidence).toMatch(/no real export has been read/i)
    })
  })

  test('🔴 the MYOB evidence keeps the four faults its real export exposed', () => {
    // Not decoration, and not wording for its own sake: these four are the reason the file
    // is known to be genuine software output rather than a reconstruction — a reconstruction
    // reflects what its author expected and cannot surprise the reader that reads it. They
    // are also the regression list, each one a wrong figure that looked perfectly fine.
    const myob = PACKAGES.filter(p => p.name === 'MYOB')[0]
    expect(myob.evidence).toMatch(/Account No\./)
    expect(myob.evidence).toMatch(/89,500/)
    expect(myob.evidence).toMatch(/Property, Plant & Equipment/)
    expect(myob.evidence).toMatch(/145,300/)
  })

  test('🔴 the sentence on screen names exactly the packages the code lists', () => {
    // The screens read a locale string; the refusals build theirs from the module. This
    // is what stops the two drifting — a package added to the code but not the screen
    // (or the reverse) fails here.
    const onScreen = en.report.supportedSoftware
    PACKAGES.forEach((p) => { expect(onScreen).toContain(p.name) })
    expect(onScreen).toContain(supportedList().split(' and ')[1] || '')
    // 🔴 THE SCREEN AND THE MODULE MUST SAY THE SAME THING. The locale string is written by
    // hand and the refusals are generated, so this is the only thing standing between a
    // package promoted in code and a screen still carrying yesterday's caveat — which is
    // exactly the state the record was in for a day before 2026-09-08.
    expect(onScreen).toBe(supportedSentence())
  })

  test('the short list used in refusals reads as a sentence, not an array', () => {
    expect(supportedList()).toBe('Xero, QuickBooks Online and MYOB')
    expect(supportedSentence()).toContain('can be read')
  })

  test('🔴 an unconfirmed package still puts the caveat back on the screen', () => {
    // The caveat is absent because nothing is unconfirmed, NOT because it was deleted — and
    // since 2026-09-07 nothing on the live list can prove that. An advisor being told to check
    // the figures is the whole safety margin for a package read only from its published
    // layout, so the next package added must not be the thing that discovers the line is gone.
    const withOne = sentenceFor([
      { name: 'Xero', confidence: 'verified' },
      { name: 'Sage', confidence: 'expected' }
    ])
    expect(withOne).toContain('Sage is supported from its published layout')
    expect(withOne).toContain('check the figures on the next step')

    // And when nothing has been confirmed at all, the sentence says that too.
    expect(sentenceFor([{ name: 'Sage', confidence: 'expected' }]))
      .toContain('None has yet been confirmed against a real export')
  })
})
