'use strict'

/**
 * "Stock against the accounts" (item 4.70, stage 4). Every expected number is worked by
 * hand from the summary below, so a share taken of the wrong total, a gap with the wrong
 * sign, or a page printing when the balance sheet has no stock line — each plausible on
 * paper — fails here.
 */

const { computeStockVsAccounts, AGREES_WITHIN } = require('../../server/report/stockVsAccountsModel')

/** A Cin7 summary as the reader returns it: 309,000 in the file, 87,000 of it allocated. */
const FILE = {
  package: 'Cin7 Core',
  confidence: 'expected',
  costBasis: 'unitCost',
  currency: 'NZD',
  currencyAssumed: true,
  lineCount: 412,
  linesWithoutValue: 0,
  totalValue: 309000,
  allocatedValue: 87000,
  availableValue: 222000,
  onOrderValue: 41000,
  units: { onHand: 13770, allocated: 635, available: 13135, onOrder: 1200 },
  allocatedShare: 635 / 13770,
  categories: [
    { name: 'Cookware', value: 128000, share: 128000 / 309000, lines: 96 },
    { name: 'Appliances', value: 71000, share: 71000 / 309000, lines: 88 },
    { name: 'Cutlery', value: 64000, share: 64000 / 309000, lines: 74 },
    { name: 'Table', value: 46000, share: 46000 / 309000, lines: 61 }
  ],
  locations: [
    { name: 'Auckland', value: 231000, share: 231000 / 309000, lines: 300 },
    { name: 'Christchurch', value: 78000, share: 78000 / 309000, lines: 112 }
  ]
}

describe('the comparison, worked by hand', () => {
  const r = computeStockVsAccounts({ stockFile: FILE, accountsStock: 322000, stockDays: 70, creditorDays: 66 })

  test('the file total sits against the balance sheet, and a 13,000 shortfall is a gap, not agreement', () => {
    expect(r.available).toBe(true)
    expect(r.fileTotal).toBe(309000)
    expect(r.accountsStock).toBe(322000)
    expect(r.gap).toBe(-13000)
    expect(r.gapPct).toBeCloseTo(-13000 / 322000, 10)
    expect(r.agrees).toBe(false)
  })

  test('already sold and not yet sold are the file\'s allocated and available value, as shares of the file', () => {
    expect(r.alreadySold).toBe(87000)
    expect(r.alreadySoldShare).toBeCloseTo(87000 / 309000, 10)
    expect(r.notYetSold).toBe(222000)
    expect(r.notYetSoldShare).toBeCloseTo(222000 / 309000, 10)
    expect(r.onOrderValue).toBe(41000)
  })

  test('the categories and locations come through with name, value and share only', () => {
    expect(r.categories).toEqual([
      { name: 'Cookware', value: 128000, share: 128000 / 309000 },
      { name: 'Appliances', value: 71000, share: 71000 / 309000 },
      { name: 'Cutlery', value: 64000, share: 64000 / 309000 },
      { name: 'Table', value: 46000, share: 46000 / 309000 }
    ])
    expect(r.locations.map(l => l.name)).toEqual(['Auckland', 'Christchurch'])
  })

  test('who funds the shelf: suppliers carry 66 of the 70 days, the owner the other four', () => {
    expect(r.daysFundedBySuppliers).toBe(66)
    expect(r.daysCarried).toBe(4)
  })

  test('the file\'s own facts ride through: package, cost basis, currency and whether it was assumed', () => {
    expect(r.package).toBe('Cin7 Core')
    expect(r.costBasis).toBe('unitCost')
    expect(r.currency).toBe('NZD')
    expect(r.currencyAssumed).toBe(true)
    expect(r.lineCount).toBe(412)
  })
})

describe('agreement and the edges', () => {
  test('within 0.1% of the balance sheet the two agree; one part in a thousand further and they do not', () => {
    const within = computeStockVsAccounts({ stockFile: Object.assign({}, FILE, { totalValue: 322000 * (1 - AGREES_WITHIN) }), accountsStock: 322000 })
    expect(within.agrees).toBe(true)
    const beyond = computeStockVsAccounts({ stockFile: Object.assign({}, FILE, { totalValue: 322000 * (1 - AGREES_WITHIN * 2) }), accountsStock: 322000 })
    expect(beyond.agrees).toBe(false)
  })

  test('suppliers waiting longer than the stock sits funds all of it, and the owner carries none', () => {
    const r = computeStockVsAccounts({ stockFile: FILE, accountsStock: 309000, stockDays: 40, creditorDays: 66 })
    expect(r.daysFundedBySuppliers).toBe(40)
    expect(r.daysCarried).toBe(0)
  })

  test('without both day figures the funding read is null, never a guess', () => {
    const r = computeStockVsAccounts({ stockFile: FILE, accountsStock: 309000, stockDays: 70, creditorDays: null })
    expect(r.daysFundedBySuppliers).toBeNull()
    expect(r.daysCarried).toBeNull()
  })

  test('an Unleashed file has no on-order figure, and it stays null rather than zero', () => {
    const r = computeStockVsAccounts({ stockFile: Object.assign({}, FILE, { package: 'Unleashed', onOrderValue: null, currencyAssumed: false }), accountsStock: 309000 })
    expect(r.onOrderValue).toBeNull()
    expect(r.currencyAssumed).toBe(false)
  })

  test('a zero balance-sheet stock line gives no percentage gap, and agreement only when the file is empty too', () => {
    const r = computeStockVsAccounts({ stockFile: Object.assign({}, FILE, { totalValue: 0, allocatedValue: 0, availableValue: 0 }), accountsStock: 0 })
    expect(r.gapPct).toBeNull()
    expect(r.agrees).toBe(true)
    expect(r.alreadySoldShare).toBeNull()
    const gapped = computeStockVsAccounts({ stockFile: FILE, accountsStock: 0 })
    expect(gapped.agrees).toBe(false)
  })

  test('malformed buckets are dropped rather than printed', () => {
    const r = computeStockVsAccounts({ stockFile: Object.assign({}, FILE, { categories: [{ name: 'Ok', value: 1 }, { value: 2 }, null, { name: 'NaN', value: 'x' }], locations: 'none' }), accountsStock: 309000 })
    expect(r.categories).toEqual([{ name: 'Ok', value: 1, share: null }])
    expect(r.locations).toEqual([])
  })
})

describe('refusals', () => {
  test('no stock file, or one with no usable total, is NO_STOCK_FILE', () => {
    expect(computeStockVsAccounts({}).blocked).toBe('NO_STOCK_FILE')
    expect(computeStockVsAccounts({ stockFile: null, accountsStock: 1 }).blocked).toBe('NO_STOCK_FILE')
    expect(computeStockVsAccounts({ stockFile: { totalValue: 'n/a' }, accountsStock: 1 }).blocked).toBe('NO_STOCK_FILE')
    expect(computeStockVsAccounts().available).toBe(false)
  })

  test('no stock line on the balance sheet is NO_STOCK_LINE — half a comparison does not print', () => {
    const r = computeStockVsAccounts({ stockFile: FILE, accountsStock: null })
    expect(r.blocked).toBe('NO_STOCK_LINE')
    expect(r.available).toBe(false)
    expect(r.fileTotal).toBeNull()
  })
})
