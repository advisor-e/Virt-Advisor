'use strict'

/**
 * The Business Performance Report's monthly view intake (item 4.70, stage 5).
 *
 * What UAT cannot see: a cost line classified into the wrong quarter's bar, an overdraft
 * counted as cash, an empty month summed as a zero month, and a by-month export that a
 * reader takes for a different report. Each produces a chart that looks right.
 */

const { extractMonthlySales, extractMonthlyBank, parseDashboardMonthlyUpload } = require('../../server/report/intake/monthlySalesParser')
const { assembleDashboardMonthly, MAX_FILES } = require('../../server/report/intake/dashboardMonthlyAssembler')
const { INTAKE_STATUS } = require('../../server/report/intakeError')
const { makeXlsx } = require('./xlsxFixture')

/** Jul→Jun financial year headers, dated. */
function headers (startYear) {
  const names = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  return names.map((n, i) => n + ' ' + (i < 6 ? startYear : startYear + 1))
}

const SALES = [198, 212, 226, 241, 262, 289, 171, 218, 247, 236, 259, 281].map(v => v * 1000)
const ytd = list => list.reduce((t, v) => t + v, 0)

/** A by-month P&L with every section the report reads, in Xero's layout. */
function plGrid (opts) {
  const o = opts || {}
  const sales = o.sales || SALES
  const head = headers(o.startYear || 2025)
  const cos = sales.map(v => Math.round(v * 0.59))
  const rent = sales.map(() => 8500)
  const wages = sales.map(() => 49000)
  return [
    ['Profit and Loss'],
    ['Harbourside Kitchen Supplies Ltd'],
    ['For the year ended 30 June ' + ((o.startYear || 2025) + 1)],
    [],
    ['Account'].concat(head).concat(['Total']),
    ['Income'],
    ['Sales'].concat(sales).concat([ytd(sales)]),
    ['Interest Income'].concat(sales.map(() => 40)).concat([480]),
    ['Total Income'].concat(sales.map(v => v + 40)).concat([ytd(sales) + 480]),
    ['Less Cost of Sales'],
    ['Purchases'].concat(cos).concat([ytd(cos)]),
    ['Total Cost of Sales'].concat(cos).concat([ytd(cos)]),
    ['Gross Profit'].concat(sales.map((v, i) => v + 40 - cos[i])).concat([ytd(sales) + 480 - ytd(cos)]),
    ['Other Income'],
    ['Rent Received'].concat(sales.map(() => 900)).concat([10800]),
    ['Total Other Income'].concat(sales.map(() => 900)).concat([10800]),
    ['Less Operating Expenses'],
    ['Rent'].concat(rent).concat([ytd(rent)]),
    ['Wages and Salaries'].concat(wages).concat([ytd(wages)]),
    ['Total Operating Expenses'].concat(rent.map((r, i) => r + wages[i])).concat([ytd(rent) + ytd(wages)]),
    ['Net Profit'].concat(sales.map((v, i) => v + 40 + 900 - cos[i] - rent[i] - wages[i])).concat([0])
  ]
}

/** A by-month Balance Sheet: two bank accounts, an overdraft under liabilities, blanks after May. */
function bsGrid (opts) {
  const o = opts || {}
  const head = headers(2025)
  const cheque = [180, 192, 201, 188, 176, 148, 163, 171, 180, 196, 210, 224].map(v => v * 1000)
  const savings = cheque.map(() => 20000)
  const overdraft = cheque.map(() => 5000)
  const blank = i => (o.blankFrom !== undefined && i >= o.blankFrom)
  const cells = list => list.map((v, i) => (blank(i) ? null : v))
  return [
    ['Balance Sheet'],
    ['Harbourside Kitchen Supplies Ltd'],
    ['As at 30 June 2026'],
    [],
    ['Account'].concat(head),
    ['Assets'],
    ['Current Assets'],
    ['Bank'],
    ['Cheque Account'].concat(cells(cheque)),
    ['Savings Account'].concat(cells(savings)),
    ['Total Bank'].concat(cells(cheque.map((v, i) => v + savings[i]))),
    ['Accounts Receivable'].concat(cells(cheque.map(() => 334000))),
    ['Total Current Assets'].concat(cells(cheque.map((v, i) => v + savings[i] + 334000))),
    ['Total Assets'].concat(cells(cheque.map((v, i) => v + savings[i] + 334000))),
    ['Liabilities'],
    ['Current Liabilities'],
    ['Bank Overdraft'].concat(cells(overdraft)),
    ['Bank Loan'].concat(cells(cheque.map(() => 150000))),
    ['Total Current Liabilities'].concat(cells(overdraft.map(v => v + 150000))),
    ['Total Liabilities'].concat(cells(overdraft.map(v => v + 150000))),
    ['Equity'],
    ['Share Capital'].concat(cells(cheque.map(() => 20000))),
    ['Total Equity'].concat(cells(cheque.map(() => 20000)))
  ]
}

describe('the by-month Profit and Loss, read for the monthly view', () => {
  const r = extractMonthlySales(plGrid())

  test('🔴 SALES IS UNCHANGED — the Volatility Report\'s figure is still trading income alone', () => {
    expect(r.months.map(m => m.value)).toEqual(SALES)
  })

  test('cost of sales and operating expenses follow the annual parser\'s sections', () => {
    expect(r.months[0].costOfSales).toBe(Math.round(198000 * 0.59))
    expect(r.months[0].operatingExpenses).toBe(8500 + 49000)
  })

  test('other income is the Other Income section PLUS the interest the sales figure excludes', () => {
    expect(r.months[0].otherIncome).toBe(900 + 40)
  })

  test('the Gross Profit and Net Profit rows are neither sales nor a cost — each figure is its section\'s rows alone', () => {
    const gp = 198000 + 40 - Math.round(198000 * 0.59)
    expect(r.months[0].value).toBe(198000)
    expect(r.months[0].value).not.toBe(gp)
    // Cost of sales is exactly the Purchases row; a Gross Profit row summed in would move it.
    expect(r.months[0].costOfSales).toBe(Math.round(198000 * 0.59))
    expect(r.months[0].operatingExpenses).toBe(57500)
  })
})

describe('the by-month Balance Sheet, read for the bank line', () => {
  test('sums the bank accounts and takes an overdraft under liabilities off', () => {
    const r = extractMonthlyBank(bsGrid())
    expect(r.recognised).toBe(true)
    expect(r.kind).toBe('balanceSheetByMonth')
    expect(r.months).toHaveLength(12)
    expect(r.months[0].label).toBe('Jul 2025')
    expect(r.months[0].bank).toBe(180000 + 20000 - 5000)
    expect(r.months[11].bank).toBe(224000 + 20000 - 5000)
    expect(r.months.every(m => m.complete)).toBe(true)
  })

  test('🔴 A BANK LOAN IS NOT CASH — a liability named "Bank …" never reaches the bank figure', () => {
    const r = extractMonthlyBank(bsGrid())
    expect(r.months[0].bank).toBeLessThan(180000 + 20000)
  })

  test('a month with no balance is empty, never a zero bank balance', () => {
    const r = extractMonthlyBank(bsGrid({ blankFrom: 11 }))
    expect(r.months[11].bank).toBeNull()
    expect(r.months[11].complete).toBe(false)
    expect(r.months[11].reason).toBe('empty')
    expect(r.months[10].complete).toBe(true)
  })

  test('an annual Balance Sheet is not a by-month one', () => {
    expect(extractMonthlyBank([['Balance Sheet'], ['Co'], ['As at 30 June 2026'], ['Bank'], ['Cheque Account', 1000]]).recognised).toBe(false)
  })

  test('a by-month P&L is not a by-month Balance Sheet, and the other way round', () => {
    expect(extractMonthlyBank(plGrid()).recognised).toBe(false)
    expect(extractMonthlySales(bsGrid()).recognised).toBe(false)
  })
})

describe('parseDashboardMonthlyUpload — real file bytes', () => {
  test('recognises each of the two reports from an .xlsx', () => {
    expect(parseDashboardMonthlyUpload(makeXlsx(plGrid())).kind).toBe('profitLossByMonth')
    expect(parseDashboardMonthlyUpload(makeXlsx(bsGrid())).kind).toBe('balanceSheetByMonth')
  })

  test('refuses an annual export by name, with a code the error map knows', () => {
    let err = null
    try { parseDashboardMonthlyUpload(makeXlsx([['Profit and Loss'], ['Co'], ['For the year ended 30 June 2026'], ['Income'], ['Sales', 100]])) } catch (e) { err = e }
    expect(err.code).toBe('NOT_BY_MONTH')
    expect(INTAKE_STATUS.NOT_BY_MONTH).toBe(422)
  })
})

describe('assembleDashboardMonthly — the two series', () => {
  const pl = extractMonthlySales(plGrid())
  const bs = extractMonthlyBank(bsGrid())

  test('one of each gives both series, twelve months, nothing blocked', () => {
    const r = assembleDashboardMonthly([bs, pl])
    expect(r.blocked).toBeNull()
    expect(r.profitLoss.months).toHaveLength(12)
    expect(r.profitLoss.months[0]).toMatchObject({ label: 'Jul 2025', sales: 198000, complete: true })
    expect(r.bank.months).toHaveLength(12)
    expect(r.bank.months[11].bank).toBe(239000)
    expect(r.companyName).toBe('Harbourside Kitchen Supplies Ltd')
    expect(r.warnings).toEqual([])
  })

  test('a Profit and Loss alone leaves the bank series null', () => {
    const r = assembleDashboardMonthly([pl])
    expect(r.bank).toBeNull()
    expect(r.profitLoss.months).toHaveLength(12)
  })

  test('two years of Profit and Loss join oldest first; on an overlap the older file wins', () => {
    const last = extractMonthlySales(plGrid({ startYear: 2024, sales: SALES.map(v => v - 20000) }))
    const r = assembleDashboardMonthly([pl, last])
    expect(r.profitLoss.months).toHaveLength(24)
    expect(r.profitLoss.months[0].label).toBe('Jul 2024')
    expect(r.profitLoss.months[23].label).toBe('Jun 2026')
    // An overlapping month: the older file's figure stands.
    const same = extractMonthlySales(plGrid({ startYear: 2025, sales: SALES.map(v => v + 1) }))
    const o = assembleDashboardMonthly([pl, same])
    expect(o.profitLoss.months.find(m => m.label === 'Jul 2025').sales).toBe(198000)
    expect(o.warnings.some(w => /overlap/.test(w))).toBe(true)
  })

  test('fewer than twelve complete months is said, not hidden', () => {
    const midYear = SALES.slice(0, 9).concat([0, 0, 0])
    const r = assembleDashboardMonthly([extractMonthlySales(plGrid({ sales: midYear }))])
    expect(r.profitLoss.months.filter(m => m.complete)).toHaveLength(8)
    expect(r.warnings.some(w => /8 complete months/.test(w))).toBe(true)
  })

  test('refuses more than the limit, two balance sheets, or a third Profit and Loss — by name', () => {
    expect(MAX_FILES).toBe(3)
    expect(assembleDashboardMonthly([pl, pl, pl, bs]).blocked).toMatch(/at most 3/)
    expect(assembleDashboardMonthly([bs, bs]).blocked).toMatch(/More than one by-month Balance Sheet/)
    expect(assembleDashboardMonthly([pl, pl, pl]).blocked).toMatch(/More than two by-month Profit and Loss/)
    expect(assembleDashboardMonthly([]).blocked).toMatch(/No file/)
  })

  test('nothing identifying leaves: no account row name anywhere in the answer', () => {
    const text = JSON.stringify(assembleDashboardMonthly([bs, pl]))
    expect(text).not.toMatch(/Cheque Account|Savings Account|Wages and Salaries|Rent Received/)
  })
})
