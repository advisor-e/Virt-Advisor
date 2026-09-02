'use strict'

const { parseUpload, extractBalanceSheet, extractProfitLoss } = require('../../server/report/intake/xeroReportParser')
const { parseCsv } = require('../../server/report/intake/csvReader')
const { makeXlsx } = require('./xlsxFixture')

/** A realistic Xero Balance Sheet grid (shape per REPORT-DATA-MODEL §3/§3.9). */
const BS_GRID = [
  ['Balance Sheet'],
  ['Kinetic Test Ltd'],
  ['As at 31 March 2026'],
  [],
  ['Assets'],
  ['Bank'],
  ['Cheque Account', 120000],
  ['Savings Account', 50000],
  ['Total Bank', 170000],
  ['Current Assets'],
  ['Accounts Receivable', 80000],
  ['Inventory (Unleashed)', 30000],
  ['Hamilton P&A Stock', 5000],
  ['Total Current Assets', 115000],
  ['Total Assets', 285000],
  ['Liabilities'],
  ['Current Liabilities'],
  ['Accounts Payable', 40000],
  ['PAYE Payable', 8000],
  ['Wages Payable', 4000],
  ['Total Current Liabilities', 52000],
  ['Total Liabilities', 52000]
]

/** A realistic Xero P&L grid. */
const PL_GRID = [
  ['Profit and Loss'],
  ['Kinetic Test Ltd'],
  ['For the year ended 31 March 2026'],
  [],
  ['Income'],
  ['Sales', 500000],
  ['Interest Income', 1000],
  ['Total Income', 501000],
  ['Less Operating Expenses'],
  ['Rent', 24000],
  ['Advertising', 32000],
  ['Total Operating Expenses', 56000]
]

describe('Balance Sheet extraction — the verified Xero shape', () => {
  const r = extractBalanceSheet(BS_GRID)

  test('recognises the report and reads its own date', () => {
    expect(r.recognised).toBe(true)
    expect(r.kind).toBe('balanceSheet')
    expect(r.companyName).toBe('Kinetic Test Ltd')
    expect(r.reportDate).toBe('31 March 2026')
  })

  test('cash = the SUM of the bank line items, never the Total row', () => {
    expect(r.proposals.cash.value).toBe(170000)
    expect(r.proposals.cash.source).toBe('file')
    expect(r.proposals.cash.candidates).toHaveLength(2)
  })

  test('stock surfaces MULTI-ROW candidates (the Electric Bikes finding)', () => {
    expect(r.proposals.stock.value).toBe(35000)
    expect(r.proposals.stock.candidates.map(c => c.label)).toEqual(['Inventory (Unleashed)', 'Hamilton P&A Stock'])
  })

  test('debtors, creditors and wages/PAYE due are proposed from the right sections', () => {
    expect(r.proposals.debtors.value).toBe(80000)
    expect(r.proposals.creditors.value).toBe(40000)
    expect(r.proposals.wagesDue.value).toBe(12000) // PAYE + Wages Payable
    expect(r.proposals.wagesDue.candidates).toHaveLength(2)
  })

  test('matching cached totals produce no warnings', () => {
    expect(r.warnings).toEqual([])
  })

  test('a POISONED cached Total is never believed — line items win, advisor warned', () => {
    const poisoned = BS_GRID.map(row => (row[0] === 'Total Bank' ? ['Total Bank', 999999] : row))
    const p = extractBalanceSheet(poisoned)
    expect(p.proposals.cash.value).toBe(170000) // our own sum, not 999999
    expect(p.warnings.some(w => w.includes('Total Bank'))).toBe(true)
  })

  test('an uncalculated (empty) Total row — the demo-file zero-read case — is simply ignored', () => {
    const blankTotals = BS_GRID.map(row => (typeof row[0] === 'string' && row[0].indexOf('Total') === 0 ? [row[0]] : row))
    const p = extractBalanceSheet(blankTotals)
    expect(p.proposals.cash.value).toBe(170000)
    expect(p.warnings).toEqual([])
  })

  test('a Wages row on the ASSET side is never mistaken for wages due (liability-scoped)', () => {
    const grid = BS_GRID.slice()
    grid.splice(13, 0, ['Prepaid Wages', 7000]) // under Current Assets
    const p = extractBalanceSheet(grid)
    expect(p.proposals.wagesDue.value).toBe(12000) // unchanged
  })

  test('figures the file cannot supply are simply absent — never guessed', () => {
    const minimal = [['Balance Sheet'], ['Co'], ['As at 30 June 2026'], ['Assets'], ['Bank'], ['Cheque', 100]]
    const p = extractBalanceSheet(minimal)
    expect(p.proposals.cash.value).toBe(100)
    expect(p.proposals.stock).toBeUndefined()
    expect(p.proposals.creditors).toBeUndefined()
  })

  test('a non-Balance-Sheet grid is not recognised', () => {
    expect(extractBalanceSheet(PL_GRID).recognised).toBe(false)
    expect(extractBalanceSheet([['Random', 1]]).recognised).toBe(false)
  })
})

describe('P&L extraction — seeds the Expenses Review', () => {
  const r = extractProfitLoss(PL_GRID)

  test('recognises the report and its period', () => {
    expect(r.recognised).toBe(true)
    expect(r.kind).toBe('profitLoss')
    expect(r.reportDate).toBe('For the year ended 31 March 2026')
  })

  test('expense LINE ITEMS come out; Total rows never do', () => {
    expect(r.expenseLines).toEqual([
      { name: 'Rent', amount: 24000 },
      { name: 'Advertising', amount: 32000 }
    ])
  })

  test('income is summed from line items', () => {
    expect(r.incomeTotal).toBe(501000)
  })

  test('a Balance Sheet grid is not recognised as a P&L', () => {
    expect(extractProfitLoss(BS_GRID).recognised).toBe(false)
  })
})

describe('parseUpload — sniffing and dispatch', () => {
  test('a real .xlsx Balance Sheet round-trips end to end', () => {
    const r = parseUpload(makeXlsx(BS_GRID, 'Balance Sheet'))
    expect(r.kind).toBe('balanceSheet')
    expect(r.proposals.cash.value).toBe(170000)
    expect(r.proposals.stock.candidates).toHaveLength(2)
  })

  test('a CSV export lands on the same result', () => {
    const csv = BS_GRID.map(row => row.map(c => (typeof c === 'string' && c.includes(',') ? '"' + c + '"' : c)).join(',')).join('\r\n')
    const r = parseUpload(Buffer.from(csv, 'utf8'))
    expect(r.kind).toBe('balanceSheet')
    expect(r.proposals.cash.value).toBe(170000)
  })

  test('a PDF is refused BY NAME with guidance (contract rule 1)', () => {
    try {
      parseUpload(Buffer.from('%PDF-1.7 whatever'))
      throw new Error('should have thrown')
    } catch (e) {
      expect(e.code).toBe('PDF_REJECTED')
      // Contract rule 1 is that the refusal tells the advisor what to do instead, not
      // just that it failed. The guidance is the guard; the vendor named in it is not.
      expect(e.message).toMatch(/\.xlsx\)? or CSV/i)
      expect(e.message).toMatch(/export/i)
    }
  })

  test('binary junk is refused as unrecognised', () => {
    const junk = Buffer.from([0x00, 0x01, 0x02, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A])
    try { parseUpload(junk) } catch (e) { expect(e.code).toBe('UNRECOGNISED_FILE') }
  })

  test('an empty upload is refused', () => {
    try { parseUpload(Buffer.alloc(0)) } catch (e) { expect(e.code).toBe('UNRECOGNISED_FILE') }
  })

  test('a readable file that is NOT a known Xero report names what was expected (no partial parse)', () => {
    try {
      parseUpload(Buffer.from('Hello,World\n1,2\n'))
      throw new Error('should have thrown')
    } catch (e) {
      expect(e.code).toBe('UNRECOGNISED_REPORT')
      expect(e.message).toMatch(/Balance Sheet or Profit and Loss/i)
    }
  })
})

describe('multi-column exports (R4) — comparative warns, by-month refuses', () => {
  const COMPARATIVE_BS = [
    ['Balance Sheet'],
    ['Kinetic Test Ltd'],
    ['As at 31 March 2026'],
    [],
    ['Assets'],
    ['Bank'],
    ['Cheque Account', 120000, 98000],
    ['Total Bank', 120000, 98000],
    ['Liabilities'],
    ['Current Liabilities'],
    ['Accounts Payable', 40000, 31000],
    ['Total Current Liabilities', 40000, 31000]
  ]

  test('a comparative Balance Sheet (2 figure columns) reads the first column and WARNS', () => {
    const r = extractBalanceSheet(COMPARATIVE_BS)
    expect(r.recognised).toBe(true)
    expect(r.proposals.cash.value).toBe(120000) // most recent period, never the prior year
    expect(r.warnings.some(w => /several figure columns/.test(w))).toBe(true)
  })

  test('a by-month P&L (12 months + YTD) is REFUSED with MULTI_PERIOD_COLUMNS', () => {
    const byMonth = [
      ['Profit and Loss'],
      ['Kinetic Test Ltd'],
      ['For the year ended 31 March 2026'],
      [],
      ['Income'],
      ['Sales', 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 780],
      ['Total Income', 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 780]
    ]
    try {
      extractProfitLoss(byMonth)
      throw new Error('should have thrown')
    } catch (e) {
      expect(e.code).toBe('MULTI_PERIOD_COLUMNS')
      expect(e.message).toMatch(/whole-period report/i)
    }
  })

  test('single-figure-column exports raise NO multi-column warning', () => {
    expect(extractBalanceSheet(BS_GRID).warnings.some(w => /figure columns/.test(w))).toBe(false)
    expect(extractProfitLoss(PL_GRID).warnings.some(w => /figure columns/.test(w))).toBe(false)
  })
})

describe('R17 — real accounts named "Total …" survive; true totals never double-count', () => {
  test('a fuel account "Total Oil purchases" is kept as an opex line item', () => {
    const r = extractProfitLoss([
      ['Profit and Loss'],
      ['Fuel Freight Ltd'],
      ['For the year ended 31 March 2025'],
      ['Trading Income'],
      ['Sales', 500000],
      ['Total Trading Income', 500000],
      ['Less Operating Expenses'],
      ['Rent', 24000],
      ['Total Oil purchases', 8000],
      ['Advertising', 13000],
      ['Total Operating Expenses', 45000]
    ])
    expect(r.plFigures.operatingExpenses.value).toBe(45000)
    expect(r.plFigures.operatingExpenses.candidates).toEqual(expect.arrayContaining([{ label: 'Total Oil purchases', value: 8000 }]))
    expect(r.expenseLines).toEqual(expect.arrayContaining([{ name: 'Total Oil purchases', amount: 8000 }]))
    // the section's own cached total (45,000) still cross-checks clean against the new sum
    expect(r.warnings.some(w => /does not match/.test(w))).toBe(false)
  })

  test('a section closed under a DIFFERENT name ("Total COGS") is still a total — never added on top', () => {
    const r = extractProfitLoss([
      ['Profit and Loss'],
      ['Fuel Freight Ltd'],
      ['For the year ended 31 March 2025'],
      ['Trading Income'],
      ['Sales', 500000],
      ['Total Trading Income', 500000],
      ['Cost of Goods Sold'],
      ['Purchases', 300000],
      ['Freight Inwards', 20000],
      ['Total COGS', 320000]
    ])
    expect(r.plFigures.costOfSales.value).toBe(320000)
    expect(r.plFigures.costOfSales.candidates.length).toBe(2)
  })

  test('an orphan grand total outside any open section stays dropped', () => {
    const r = extractBalanceSheet([
      ['Balance Sheet'],
      ['Fuel Freight Ltd'],
      ['As at 31 March 2025'],
      ['Bank'],
      ['Cheque Account', 296155.8],
      ['Total Bank', 296155.8],
      ['Total Assets', 999999]
    ])
    expect(r.proposals.cash.value).toBe(296155.8)
    expect(r.proposals.cash.candidates.length).toBe(1)
  })
})

describe('R18 + R19 — section classification honesty', () => {
  const grid = [
    ['Profit and Loss'],
    ['Fuel Freight Ltd'],
    ['For the year ended 31 March 2025'],
    ['Trading Income'],
    ['Sales', 500000],
    ['Total Trading Income', 500000],
    ['Non-Trading Income'],
    ['Sundry Receipts', 2000],
    ['Total Non-Trading Income', 2000],
    ['Less Operating Expenses'],
    ['Rent', 24000],
    ['Total Operating Expenses', 24000],
    ['Administrative Expenses'],
    ['Office Costs', 6000],
    ['Total Administrative Expenses', 6000]
  ]
  const r = extractProfitLoss(grid)

  test('R18: "Non-Trading Income" never classifies as sales', () => {
    expect(r.plFigures.sales.value).toBe(500000)
    expect(r.plFigures.sales.candidates).toEqual([{ label: 'Sales', value: 500000 }])
  })

  test('R19: an unrecognised valued section raises the on-screen warning, once per section', () => {
    const missed = r.warnings.filter(w => /wasn't recognised/.test(w))
    expect(missed).toEqual([
      "The section 'Non-Trading Income' wasn't recognised, so its lines are not included in any proposed figure — please check the figures and adjust where needed.",
      "The section 'Administrative Expenses' wasn't recognised, so its lines are not included in any proposed figure — please check the figures and adjust where needed."
    ])
    expect(r.plFigures.operatingExpenses.value).toBe(24000)
  })

  test('R19: a fully-recognised report raises no such warning', () => {
    const clean = extractProfitLoss([
      ['Profit and Loss'],
      ['Fuel Freight Ltd'],
      ['For the year ended 31 March 2025'],
      ['Trading Income'],
      ['Sales', 500000],
      ['Total Trading Income', 500000],
      ['Less Operating Expenses'],
      ['Rent', 24000],
      ['Total Operating Expenses', 24000]
    ])
    expect(clean.warnings.some(w => /wasn't recognised/.test(w))).toBe(false)
  })
})

describe('csvReader — quoting and safety caps', () => {
  test('RFC-4180 quoting: commas, escaped quotes, CRLF', () => {
    const rows = parseCsv('a,"b,c","say ""hi""",5\r\nnext,1\n')
    expect(rows[0]).toEqual(['a', 'b,c', 'say "hi"', 5])
    expect(rows[1]).toEqual(['next', 1])
  })

  test('thousands separators become numbers; blank rows are dropped', () => {
    const rows = parseCsv('Cash,"296,155.80"\n\n,\nDebtors,154906\n')
    expect(rows[0]).toEqual(['Cash', 296155.8])
    expect(rows[1]).toEqual(['Debtors', 154906])
  })

  test('R16: accounting-bracket negatives and $ prefixes parse as figures', () => {
    const rows = parseCsv('Overdraft,"(1,234.56)"\nFees,"($2,500)"\nAdj,-$500\nRefund,$-750\nCash,$1,234\n')
    expect(rows[0]).toEqual(['Overdraft', -1234.56])
    expect(rows[1]).toEqual(['Fees', -2500])
    expect(rows[2]).toEqual(['Adj', -500])
    expect(rows[3]).toEqual(['Refund', -750])
    // unquoted $1,234 splits on the comma like any unquoted field — both parts numeric-checked
    expect(rows[4]).toEqual(['Cash', 1, 234])
  })

  test('R16: quoted $ figures with thousands grouping parse whole', () => {
    const rows = parseCsv('Cash,"$1,234"\nSavings,"$1,234,567.89"\n')
    expect(rows[0]).toEqual(['Cash', 1234])
    expect(rows[1]).toEqual(['Savings', 1234567.89])
  })

  test('R16: improper comma grouping stays text — "1,2,3" never silently becomes 123', () => {
    const rows = parseCsv('Codes,"1,2,3"\nOdd,"12,34"\nAmbig,(-500)\n')
    expect(rows[0]).toEqual(['Codes', '1,2,3'])
    expect(rows[1]).toEqual(['Odd', '12,34'])
    expect(rows[2]).toEqual(['Ambig', '(-500)'])
  })

  test('R16: plain figures unchanged — minus signs, decimals, bare fractions', () => {
    const rows = parseCsv('A,-1234\nB,0.5\nC,.5\nD,1000000\n')
    expect(rows[0]).toEqual(['A', -1234])
    expect(rows[1]).toEqual(['B', 0.5])
    expect(rows[2]).toEqual(['C', 0.5])
    expect(rows[3]).toEqual(['D', 1000000])
  })

  test('the row cap trips on absurd input', () => {
    expect(() => parseCsv('x,1\n'.repeat(6000))).toThrow(/more rows/)
  })

  test('the column cap trips on absurd input', () => {
    expect(() => parseCsv('x,'.repeat(300) + '1')).toThrow(/more columns/)
  })
})
