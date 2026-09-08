'use strict'

const {
  emptyState, flattenDashboardReport, applySavedDashboardReport, pagesRequestFrom, MAX_TEXT, OPTIONAL_PAGES
} = require('../../utils/dashboardReportsSavedShape')
const { validateInputs } = require('../../server/utils/savedReports')
const { LINES } = require('../../server/report/intake/dashboardReportsAssembler')

/**
 * The Business Performance Report's saved row (item 4.70, P8).
 *
 * What UAT cannot see: a figure saved without where it came from, a row the store refuses
 * for its shape after the advisor pressed Save, and a loaded row that reaches the page
 * half-typed — none of which shows on a screen until a client opens a report and finds a
 * typed figure wearing a "from your accounts" mark.
 */

function filledState () {
  const s = emptyState()
  s.setup = Object.assign({}, s.setup, { financialYear: '1 July 2025 – 30 June 2026', dateIssued: '2026-09-08', preparedBy: 'Jordan Reid', industryCode: 'H451100', industryName: 'Cafes and restaurants', sizeBand: 'small' })
  s.hasPrior = true
  s.current.balanceSheetDate = 'As at 30 June 2026'
  s.current.profitLossDate = 'For the year ended 30 June 2026'
  s.current.figures.bank = { value: 224000, source: 'file' }
  s.current.figures.tradingIncome = { value: 2840000, source: 'file' }
  s.current.figures.netCapitalSpend = { value: 85000, source: 'entered' }
  s.prior.figures.bank = { value: 183000, source: 'file' }
  s.inventory = { slowObsolete: 46000, ageing: [128, 84, 52, 32, 26], stockFile: null }
  s.words.summary = 'A strong year with one watch-point'
  s.words.wentWell = ['Sales grew in all four quarters', 'Gross margin held at 41%']
  s.words.watch = ['Stock grew faster than sales', 'Customers pay 5 days slower']
  s.words.profitInsight = 'Every $1 of sales returned 13.9c'
  s.words.cashWatch = 'The December dip'
  s.words.steps = [{ title: 'Free up cash from stock', body: 'Run down slow lines' }, { title: 'Tighten debtors', body: '14-day terms' }, { title: 'Protect the margin', body: 'Review suppliers' }]
  s.words.nextReview = 'December 2026 quarter'
  s.pages.added = ['outlook', 'notAPage']
  return s
}

describe('the flat row', () => {
  const row = flattenDashboardReport(filledState())

  test('🔴 THE STORE ADMITS IT — every value a type the store takes, nothing nested', () => {
    expect(() => validateInputs(row)).not.toThrow()
  })

  test('every line carries its value AND its source, both years', () => {
    expect(row.cur_bank).toBe(224000)
    expect(row.cur_bank_src).toBe('file')
    expect(row.cur_netCapitalSpend_src).toBe('entered')
    expect(row.pri_bank).toBe(183000)
    expect(row.cur_stock).toBeNull()
    expect(row.cur_stock_src).toBe('entered')
    LINES.forEach((k) => {
      expect(row).toHaveProperty('cur_' + k)
      expect(row).toHaveProperty('pri_' + k + '_src')
    })
  })

  test('the words travel as strings and short homogeneous arrays', () => {
    expect(row.words_wentWell).toEqual(['Sales grew in all four quarters', 'Gross margin held at 41%'])
    expect(row.steps_title).toEqual(['Free up cash from stock', 'Tighten debtors', 'Protect the margin'])
    expect(row.steps_body[2]).toBe('Review suppliers')
    expect(row.inv_ageing).toEqual([128, 84, 52, 32, 26])
  })

  test('a page the dropdown does not offer is dropped from the row', () => {
    expect(row.pages_added).toEqual(['outlook'])
    expect(OPTIONAL_PAGES).toContain('outlook')
  })

  test('a line of words is cut to the store\'s limit rather than refused at Save', () => {
    const s = filledState()
    s.words.summary = 'x'.repeat(MAX_TEXT + 50)
    const r = flattenDashboardReport(s)
    expect(r.words_summary).toHaveLength(MAX_TEXT)
    expect(() => validateInputs(r)).not.toThrow()
  })

  test('an empty state still flattens to a row the store admits', () => {
    expect(() => validateInputs(flattenDashboardReport(emptyState()))).not.toThrow()
  })
})

describe('loading a row back', () => {
  test('round-trips the whole state', () => {
    const s = filledState()
    s.pages.added = ['outlook']
    const back = applySavedDashboardReport(emptyState(), flattenDashboardReport(s))
    expect(back).toEqual(s)
  })

  test('🔴 A SOURCE THAT IS NOT ONE OF THE TWO NEVER LOADS as "from file"', () => {
    const row = flattenDashboardReport(filledState())
    row.cur_bank_src = 'ai'
    row.cur_tradingIncome_src = 12
    const back = applySavedDashboardReport(emptyState(), row)
    expect(back.current.figures.bank.source).toBe('entered')
    expect(back.current.figures.tradingIncome.source).toBe('entered')
  })

  test('takes only what it knows, in its own type', () => {
    const back = applySavedDashboardReport(emptyState(), {
      cur_bank: '224000', words_summary: 99, steps_title: ['A', 7, 'C'], pages_added: ['profitBridge', 'valuation', 'x'], inv_ageing: [1, 'two', null, 4, 5], stray: { deep: true }
    })
    expect(back.current.figures.bank.value).toBe(224000)
    expect(back.words.summary).toBe('')
    expect(back.words.steps.map(x => x.title)).toEqual(['A', '', 'C'])
    // 'valuation' came off the dropdown on 2026-09-08; a row still naming it must not print it
    expect(back.pages.added).toEqual(['profitBridge'])
    expect(back.inventory.ageing).toEqual([1, null, null, 4, 5])
    expect(back.stray).toBeUndefined()
  })

  test('a row with nothing in it leaves the state as it was', () => {
    const base = filledState()
    expect(applySavedDashboardReport(base, {})).toEqual(base)
    expect(applySavedDashboardReport(base, null)).toEqual(base)
  })
})

describe('the read stock export (stage 4)', () => {
  const STOCK = {
    package: 'Cin7 Core',
    confidence: 'expected',
    costBasis: 'unitCost',
    currency: 'NZD',
    currencyAssumed: true,
    lineCount: 4,
    linesWithoutValue: 0,
    totalValue: 2070,
    allocatedValue: 550,
    availableValue: 1520,
    onOrderValue: 625,
    units: { onHand: 155, allocated: 30, available: 125, onOrder: 50 },
    allocatedShare: 30 / 155,
    categories: [
      { name: 'Kitchen', lines: 2, value: 1750, onHand: 140, allocated: 20, available: 120, share: 1750 / 2070, allocatedValue: 250, availableValue: 1500, onOrderValue: 625 },
      { name: 'Dining', lines: 1, value: 300, onHand: 10, allocated: 10, available: 0, share: 300 / 2070, allocatedValue: 300, availableValue: 0, onOrderValue: 0 }
    ],
    locations: [{ name: 'Auckland', lines: 3, value: 2050, onHand: 145, allocated: 30, available: 115, share: 2050 / 2070, allocatedValue: 550, availableValue: 1500, onOrderValue: 625 }]
  }

  test('a read export is saved flat, the store admits it, and it comes back whole with the shares rebuilt', () => {
    const s = filledState()
    s.inventory.stockFile = STOCK
    const row = flattenDashboardReport(s)
    expect(() => validateInputs(row)).not.toThrow()
    expect(row.stock_package).toBe('Cin7 Core')
    expect(row.stock_totalValue).toBe(2070)
    expect(row.stock_catNames).toEqual(['Kitchen', 'Dining'])
    expect(row.stock_cat_value).toEqual([1750, 300])
    expect(row.stock_share).toBeUndefined()
    const back = applySavedDashboardReport(emptyState(), row)
    const f = back.inventory.stockFile
    expect(f.package).toBe('Cin7 Core')
    expect(f.units).toEqual({ onHand: 155, allocated: 30, available: 125, onOrder: 50 })
    expect(f.allocatedShare).toBeCloseTo(30 / 155, 10)
    expect(f.categories.map(c => [c.name, c.value, c.lines, c.onHand])).toEqual([['Kitchen', 1750, 2, 140], ['Dining', 300, 1, 10]])
    expect(f.categories[0].share).toBeCloseTo(1750 / 2070, 10)
    expect(f.locations[0].name).toBe('Auckland')
    expect(f.onOrderValue).toBe(625)
  })

  test('with no export read, no stock key is written and a loaded row holds null', () => {
    const row = flattenDashboardReport(filledState())
    expect(Object.keys(row).some(k => k.startsWith('stock_'))).toBe(false)
    expect(applySavedDashboardReport(emptyState(), row).inventory.stockFile).toBeNull()
    expect(applySavedDashboardReport(emptyState(), { stock_package: 'Cin7 Core' }).inventory.stockFile).toBeNull()
  })

  test('more groups than the store can hold are cut from the tail, never refused at Save', () => {
    const s = filledState()
    s.inventory.stockFile = Object.assign({}, STOCK, { categories: [...Array(150).keys()].map(i => ({ name: 'C' + i, value: 150 - i, lines: 1, onHand: 1, allocated: 0, available: 1 })) })
    const row = flattenDashboardReport(s)
    expect(row.stock_catNames.length).toBe(60)
    expect(row.stock_catNames[0]).toBe('C0')
    expect(() => validateInputs(row)).not.toThrow()
  })

  test('the pages request carries the read export whole', () => {
    const s = filledState()
    s.inventory.stockFile = STOCK
    expect(pagesRequestFrom(s).inventory.stockFile).toBe(STOCK)
  })
})

describe('the request the pages route takes', () => {
  test('carries only the lines that have a value, with their source, and the dates', () => {
    const req = pagesRequestFrom(filledState())
    expect(req.current.bank).toEqual({ value: 224000, source: 'file' })
    expect(req.current.stock).toBeUndefined()
    expect(req.prior.bank.value).toBe(183000)
    expect(req.currentDates.balanceSheet).toBe('As at 30 June 2026')
    expect(req.inventory).toEqual({ slowObsolete: 46000, ageing: [128, 84, 52, 32, 26], stockFile: null })
  })

  test('with no last year the prior block is null, so nothing is compared against zeros', () => {
    const s = filledState()
    s.hasPrior = false
    expect(pagesRequestFrom(s).prior).toBeNull()
  })
})
