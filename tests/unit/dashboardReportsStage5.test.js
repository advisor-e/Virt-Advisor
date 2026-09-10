'use strict'

/**
 * The Business Performance Report's stage 5 — the monthly view and the third year (item
 * 4.70): the intake assemblers, the monthly route, the pages model and the saved row.
 *
 * What UAT cannot see: a quarter summed over a month the export had not reached, a bank
 * line that falls to zero where a month was blank, a volatility score taken on eleven
 * months, a third-year debtor-days figure divided the other way up, and a saved row the
 * store refuses because a boolean sat in a list. Every one looks right on the page.
 */

jest.mock('formidable', () => ({ formidable: jest.fn() }))

const fs = require('fs')
const os = require('os')
const path = require('path')
const { formidable } = require('formidable')
const { dashboardReportsMonthly } = require('../../server/routes/report')
const { assembleDashboardIntake, MAX_FILES } = require('../../server/report/intake/dashboardReportsAssembler')
const { computeReportPages, monthlyView, endOrdinalOf } = require('../../server/report/dashboardReportPagesModel')
const {
  emptyState, flattenDashboardReport, applySavedDashboardReport, pagesRequestFrom, MAX_MONTHS
} = require('../../utils/dashboardReportsSavedShape')
const { validateInputs } = require('../../server/utils/savedReports')

const THRESHOLDS = {
  levels: { debtorDays: { green: 35, amber: 45 }, creditorDays: { green: 35, amber: 45 }, stockDays: { green: 30, amber: 60 } },
  movements: { salesGrowth: { warn: 0, crit: -5 }, grossMargin: { warn: 1, crit: 3 }, overheadRatio: { warn: 1, crit: 3 } }
}
const line = (value, source) => ({ value, source: source || 'file' })
const CURRENT = { bank: line(224000), accountsReceivable: line(365000), stock: line(200000), otherCurrentAssets: line(11000), fixedAssets: line(505000), currentLiabilities: line(410000), accountsPayable: line(200000), nonCurrentLiabilities: line(205000), tradingIncome: line(3650000), otherIncome: line(10000), costOfSales: line(2000000), wages: line(596000), operatingExpenses: line(102000), depreciation: line(38000), interestPaid: line(32000), netCapitalSpend: line(85000, 'entered') }
const PRIOR = { bank: line(183000), accountsReceivable: line(250000), stock: line(150000), otherCurrentAssets: line(9000), fixedAssets: line(470000), currentLiabilities: line(387000), accountsPayable: line(150000), nonCurrentLiabilities: line(220000), tradingIncome: line(3000000), otherIncome: line(8000), costOfSales: line(1800000), wages: line(550000), operatingExpenses: line(98000), depreciation: line(35000), interestPaid: line(30000) }
const EARLIER = { bank: line(150000), accountsReceivable: line(228000), stock: line(120000), fixedAssets: line(440000), currentLiabilities: line(350000), nonCurrentLiabilities: line(240000), tradingIncome: line(2310000), otherIncome: line(5000), costOfSales: line(1400000), wages: line(500000), operatingExpenses: line(90000), depreciation: line(30000), interestPaid: line(28000) }

const LABELS = ['Jul 2025', 'Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026']
const SALES = [198, 212, 226, 241, 262, 289, 171, 218, 247, 236, 259, 281].map(v => v * 1000)
const BANK = [180, 192, 201, 188, 176, 148, 163, 171, 180, 196, 210, 224].map(v => v * 1000)
const FIRST = 2025 * 12 + 6 // July 2025
const END = 2026 * 12 + 5 // June 2026
const plMonths = () => LABELS.map((label, i) => ({ label, ordinal: FIRST + i, sales: SALES[i], costOfSales: Math.round(SALES[i] * 0.59), otherIncome: 940, operatingExpenses: 57500, complete: true, reason: null }))
const bankMonths = () => LABELS.map((label, i) => ({ label, ordinal: FIRST + i, bank: BANK[i], complete: true, reason: null }))

/* ── the third year through the annual assembler ─────────────────────────────────── */

function bs (reportDate, over) {
  return Object.assign({
    kind: 'forecastBalanceSheet',
    companyName: 'Harbourside Kitchen Supplies Ltd',
    reportDate,
    figures: { cashAtBank: { value: 224000, source: 'file' }, accountsReceivable: { value: 334000, source: 'file' }, inventory: { value: 322000, source: 'file' }, accountsPayable: { value: 210000, source: 'file' } },
    assets: { vehicles: { value: 105000, source: 'file' } },
    loanBalances: [],
    loanTerms: [],
    shareholderBalances: [],
    shareholderSides: [],
    warnings: []
  }, over || {})
}
function pl (reportDate, over) {
  return Object.assign({
    kind: 'profitLoss',
    companyName: 'Harbourside Kitchen Supplies Ltd',
    reportDate,
    plFigures: { sales: { value: 2840000, source: 'file' }, costOfSales: { value: 1676000, source: 'file' }, operatingExpenses: { value: 768000, source: 'file' } },
    expenseLines: [{ name: 'Wages and Salaries', amount: 560000 }, { name: 'Rent', amount: 102000 }],
    warnings: []
  }, over || {})
}

describe('the year before last — a third pair for the trend table', () => {
  test('three pairs become three years by their dates, the oldest as `earlier`', () => {
    const r = assembleDashboardIntake([
      pl('For the year ended 30 June 2024', { plFigures: { sales: { value: 2310000, source: 'file' } } }),
      bs('As at 30 June 2026'),
      pl('For the year ended 30 June 2026'),
      bs('As at 30 June 2024', { figures: { cashAtBank: { value: 150000, source: 'file' }, accountsReceivable: { value: 228000, source: 'file' } } }),
      bs('As at 30 June 2025'),
      pl('For the year ended 30 June 2025', { plFigures: { sales: { value: 2527000, source: 'file' } } })
    ])
    expect(r.blocked).toBeNull()
    expect(r.current.figures.tradingIncome.value).toBe(2840000)
    expect(r.prior.figures.tradingIncome.value).toBe(2527000)
    expect(r.earlier.figures.tradingIncome.value).toBe(2310000)
    expect(r.earlier.figures.accountsReceivable.value).toBe(228000)
    expect(r.earlier.balanceSheetDate).toBe('As at 30 June 2024')
  })

  test('with two pairs `earlier` is null, exactly as before stage 5', () => {
    const r = assembleDashboardIntake([bs('As at 30 June 2026'), pl('For the year ended 30 June 2026'), bs('As at 30 June 2025'), pl('For the year ended 30 June 2025')])
    expect(r.earlier).toBeNull()
  })

  test('a fourth Balance Sheet is refused by name; three dated alike are refused rather than guessed', () => {
    expect(assembleDashboardIntake([bs('As at 30 June 2026'), bs('As at 30 June 2025'), bs('As at 30 June 2024'), bs('As at 30 June 2023')]).blocked).toMatch(/More than three Balance Sheets/)
    expect(assembleDashboardIntake([bs('As at 30 June 2026'), bs('As at 30 June 2025'), bs('As at 30 June 2025')]).blocked).toMatch(/could not be told apart/)
    expect(MAX_FILES).toBe(6)
  })

  test('only one of the third pair is said, and the year still comes through', () => {
    const r = assembleDashboardIntake([bs('As at 30 June 2026'), pl('For the year ended 30 June 2026'), bs('As at 30 June 2025'), pl('For the year ended 30 June 2025'), pl('For the year ended 30 June 2024')])
    expect(r.earlier.profitLossDate).toBe('For the year ended 30 June 2024')
    expect(r.earlier.balanceSheetDate).toBeNull()
    expect(r.warnings.some(w => /year before last/.test(w))).toBe(true)
  })
})

/* ── the monthly view ────────────────────────────────────────────────────────────── */

describe('the monthly view', () => {
  test('the period line gives the year end ordinal', () => {
    expect(endOrdinalOf('For the year ended 30 June 2026')).toBe(END)
    expect(endOrdinalOf('As at 31 March 2025')).toBe(2025 * 12 + 2)
    expect(endOrdinalOf(null)).toBeNull()
  })

  test('four quarters, each the workbook\'s sums, labelled by the last month', () => {
    const v = monthlyView({ profitLoss: { months: plMonths() } }, END)
    expect(v.quarters.available).toBe(true)
    expect(v.quarters.completeCount).toBe(4)
    const q1 = v.quarters.rows[0]
    expect(q1.endLabel).toBe('Sep 2025')
    expect(q1.sales).toBe(636000)
    expect(q1.expenses).toBe(116820 + 125080 + 133340 + 3 * 57500)
    expect(q1.grossProfit).toBe(636000 - (116820 + 125080 + 133340))
    expect(q1.netProfit).toBe(q1.grossProfit + 3 * 940 - 3 * 57500)
  })

  test('🔴 A QUARTER WITH AN EMPTY MONTH IS NOT DRAWN — never summed as if the month were zero', () => {
    const months = plMonths()
    months[11] = Object.assign(months[11], { sales: 0, complete: false, reason: 'empty' })
    const v = monthlyView({ profitLoss: { months } }, END)
    expect(v.quarters.completeCount).toBe(3)
    expect(v.quarters.rows[3]).toMatchObject({ index: 4, complete: false, sales: null })
    expect(v.salesVolatility.available).toBe(false)
    expect(v.salesVolatility.blocked).toBe('NEEDS_TWELVE_MONTHS')
    expect(v.salesVolatility.monthsComplete).toBe(11)
  })

  test('the bank line keeps a gap as a gap and names the lowest month', () => {
    const months = bankMonths()
    months[3] = Object.assign(months[3], { bank: null, complete: false, reason: 'empty' })
    const v = monthlyView({ bank: { months } }, END)
    expect(v.bank.available).toBe(true)
    expect(v.bank.points).toHaveLength(12)
    expect(v.bank.points[3].value).toBeNull()
    expect(v.bank.lowest).toEqual({ label: 'Dec 2025', value: 148000 })
    expect(v.bank.latest.value).toBe(224000)
  })

  test('the Sales Volatility page is the Volatility Report\'s arithmetic on the last twelve complete months', () => {
    const s = monthlyView({ profitLoss: { months: plMonths() } }, END).salesVolatility
    expect(s.available).toBe(true)
    expect(s.total).toBe(2840000)
    expect(s.average).toBeCloseTo(236666.67, 0)
    expect(s.standardDeviation).toBeCloseTo(32722, -1)
    expect(s.score).toBeCloseTo(27.65, 1)
    expect(s.scoreBand).toBe('good')
    expect(s.insideFirstBand).toBe(8)
    expect(s.highest).toEqual({ label: 'Dec 2025', value: 289000 })
    expect(s.lowest).toEqual({ label: 'Jan 2026', value: 171000 })
    expect(s.months.filter(m => m.outside).map(m => m.label)).toEqual(['Jul 2025', 'Dec 2025', 'Jan 2026', 'Jun 2026'])
    expect(s.months.find(m => m.label === 'Dec 2025').above).toBe(true)
  })

  test('two files: the window is the LAST twelve complete months, whichever year they fall in', () => {
    const last = LABELS.map((label, i) => ({ label: label.replace('2025', '2024').replace('2026', '2025'), ordinal: FIRST - 12 + i, sales: 150000, costOfSales: 90000, otherIncome: 0, operatingExpenses: 50000, complete: true, reason: null }))
    const thisYear = plMonths().map((m, i) => (i >= 9 ? Object.assign(m, { sales: 0, complete: false, reason: 'empty' }) : m))
    const v = monthlyView({ profitLoss: { months: last.concat(thisYear) } }, END)
    expect(v.salesVolatility.available).toBe(true)
    expect(v.salesVolatility.from).toBe('Apr 2025')
    expect(v.salesVolatility.to).toBe('Mar 2026')
    expect(v.quarters.completeCount).toBe(3)
  })

  test('with nothing dropped, nothing is available and nothing is a zero', () => {
    const v = monthlyView(null, END)
    expect(v.available).toBe(false)
    expect(v.quarters.available).toBe(false)
    expect(v.bank.available).toBe(false)
    expect(v.salesVolatility).toEqual({ available: false, blocked: 'NO_MONTHLY_FILE', monthsComplete: 0 })
  })

  test('computeReportPages carries the monthly view and the volatility page as an optional block', () => {
    const r = computeReportPages({ current: CURRENT, prior: PRIOR, currentDates: { profitLoss: 'For the year ended 30 June 2026' }, monthly: { profitLoss: { months: plMonths() }, bank: { months: bankMonths() } }, thresholds: THRESHOLDS })
    expect(r.monthly.quarters.completeCount).toBe(4)
    expect(r.monthly.bank.lowest.label).toBe('Dec 2025')
    expect(r.optional.salesVolatility.available).toBe(true)
    const none = computeReportPages({ current: CURRENT, prior: PRIOR, thresholds: THRESHOLDS })
    expect(none.monthly.available).toBe(false)
    expect(none.optional.salesVolatility.available).toBe(false)
  })
})

describe('the year before last on the trend table', () => {
  test('each row gains the earlier figure by the same definitions as the other two', () => {
    const r = computeReportPages({ current: CURRENT, prior: PRIOR, earlier: EARLIER, thresholds: THRESHOLDS })
    expect(r.hasEarlier).toBe(true)
    expect(r.trends.hasEarlier).toBe(true)
    const row = key => r.trends.rows.find(x => x.key === key)
    expect(row('revenue').earlier).toBe(2310000)
    expect(row('netProfit').earlier).toBe(2310000 - 1400000 + 5000 - (500000 + 90000 + 30000 + 28000))
    expect(row('netMargin').earlier).toBeCloseTo(row('netProfit').earlier / 2310000, 10)
    expect(row('stockTurn').earlier).toBeCloseTo(2310000 / (228000 + 120000), 10)
    expect(row('debtorDays').earlier).toBeCloseTo((228000 / 2310000) * 365, 6)
  })

  test('without it every row\'s earlier is null and the flag is off — the two-year table as before', () => {
    const r = computeReportPages({ current: CURRENT, prior: PRIOR, thresholds: THRESHOLDS })
    expect(r.hasEarlier).toBe(false)
    expect(r.trends.rows.every(x => x.earlier === null)).toBe(true)
  })

  test('a third year missing a line prints a blank for that row, never a zero', () => {
    const r = computeReportPages({ current: CURRENT, prior: PRIOR, earlier: { tradingIncome: line(2310000), costOfSales: line(1400000) }, thresholds: THRESHOLDS })
    const row = key => r.trends.rows.find(x => x.key === key)
    expect(row('revenue').earlier).toBe(2310000)
    expect(row('debtorDays').earlier).toBeNull()
  })
})

/* ── the saved row ───────────────────────────────────────────────────────────────── */

describe('the saved row — the by-month series and the year before last', () => {
  function monthlyState () {
    const s = emptyState()
    s.hasPrior = true
    s.current.profitLossDate = 'For the year ended 30 June 2026'
    s.current.figures.tradingIncome = { value: 2840000, source: 'file' }
    s.hasEarlier = true
    s.earlier.balanceSheetDate = 'As at 30 June 2024'
    s.earlier.figures.tradingIncome = { value: 2310000, source: 'file' }
    s.monthly = {
      plDate: 'For the year ended 30 June 2026',
      bsDate: 'As at 30 June 2026',
      months: [
        { label: 'Jul 2025', ordinal: FIRST, sales: 198000, costOfSales: 116820, otherIncome: 940, operatingExpenses: 57500, complete: true, reason: null },
        { label: 'Aug 2025', ordinal: FIRST + 1, sales: 0, costOfSales: 0, otherIncome: 0, operatingExpenses: 0, complete: false, reason: null }
      ],
      bank: [
        { label: 'Jul 2025', ordinal: FIRST, bank: 195000, complete: true, reason: null },
        { label: 'Aug 2025', ordinal: FIRST + 1, bank: null, complete: false, reason: null }
      ]
    }
    return s
  }

  test('🔴 THE STORE ADMITS IT — completeness travels as 1/0, never a boolean in a list', () => {
    const row = flattenDashboardReport(monthlyState())
    expect(() => validateInputs(row)).not.toThrow()
    expect(row.m_sales).toEqual([198000, 0])
    expect(row.m_complete).toEqual([1, 0])
    expect(row.mb_bank).toEqual([195000, null])
    expect(row.mb_complete).toEqual([1, 0])
    expect(row.ear_tradingIncome).toBe(2310000)
    expect(row.hasEarlier).toBe(true)
  })

  test('a row without the stage 5 keys loads exactly as before', () => {
    const row = flattenDashboardReport(emptyState())
    expect(row.m_ordinals).toBeUndefined()
    expect(row.mb_ordinals).toBeUndefined()
    const back = applySavedDashboardReport(emptyState(), row)
    expect(back.monthly).toEqual({ plDate: null, bsDate: null, months: [], bank: [] })
    expect(back.hasEarlier).toBe(false)
  })

  test('round trip: what comes back is what went in, source and completeness included', () => {
    const s = monthlyState()
    const back = applySavedDashboardReport(emptyState(), flattenDashboardReport(s))
    expect(back.monthly.months).toEqual(s.monthly.months)
    expect(back.monthly.bank).toEqual(s.monthly.bank)
    expect(back.monthly.plDate).toBe(s.monthly.plDate)
    expect(back.earlier.figures.tradingIncome).toEqual({ value: 2310000, source: 'file' })
    expect(back.earlier.balanceSheetDate).toBe('As at 30 June 2024')
  })

  test('the newest months are kept when a series outgrows the row', () => {
    const s = monthlyState()
    s.monthly.months = Array.from({ length: MAX_MONTHS + 5 }, (_, i) => ({ label: 'M' + i, ordinal: 24000 + i, sales: i, costOfSales: 0, otherIncome: 0, operatingExpenses: 0, complete: true, reason: null }))
    const row = flattenDashboardReport(s)
    expect(row.m_ordinals).toHaveLength(MAX_MONTHS)
    expect(row.m_ordinals[0]).toBe(24005)
  })

  test('the pages request carries the series and the third year only when they exist', () => {
    const req = pagesRequestFrom(monthlyState())
    expect(req.monthly.profitLoss.months).toHaveLength(2)
    expect(req.monthly.bank.months).toHaveLength(2)
    expect(req.earlier.tradingIncome.value).toBe(2310000)
    const bare = pagesRequestFrom(emptyState())
    expect(bare.monthly).toBeNull()
    expect(bare.earlier).toBeNull()
  })
})

/* ── the monthly route ───────────────────────────────────────────────────────────── */

describe('POST /api/report/dashboard-reports/monthly', () => {
  function makeRes () {
    const res = { status: null, body: null }
    res.send = (status, body) => { res.status = status; res.body = body }
    return res
  }
  function nextParse (err, files) {
    formidable.mockReturnValue({ parse (req, cb) { cb(err, {}, files) } })
  }
  function tempFile (content) {
    const p = path.join(os.tmpdir(), 'dr-monthly-test-' + Math.random().toString(36).slice(2) + '.csv')
    fs.writeFileSync(p, content)
    return p
  }
  function gone (p) {
    return new Promise((resolve) => { setTimeout(() => resolve(!fs.existsSync(p)), 30) })
  }
  const row = (label, values) => [label].concat(values).join(',')
  const total = SALES.reduce((t, v) => t + v, 0)
  const plByMonthCsv = [
    'Profit and Loss', 'Harbourside Kitchen Supplies Ltd', 'For the year ended 30 June 2026', '',
    row('Account', LABELS.concat(['Total'])),
    'Income',
    row('Sales', SALES.concat([total])),
    row('Total Income', SALES.concat([total])),
    'Less Cost of Sales',
    row('Purchases', SALES.map(v => v * 0.5).concat([total * 0.5])),
    row('Total Cost of Sales', SALES.map(v => v * 0.5).concat([total * 0.5])),
    'Less Operating Expenses',
    row('Rent', SALES.map(() => 8500).concat([102000])),
    row('Total Operating Expenses', SALES.map(() => 8500).concat([102000]))
  ].join('\n')
  const annualCsv = ['Profit and Loss', 'Harbourside Kitchen Supplies Ltd', 'For the year ended 30 June 2026', '', 'Income', 'Sales,2840000', 'Total Income,2840000'].join('\n')

  beforeEach(() => { jest.spyOn(console, 'error').mockImplementation(() => {}) })
  afterEach(() => { jest.restoreAllMocks() })

  test('a by-month Profit and Loss becomes twelve months of the four figures, and the temp file goes', async () => {
    const p = tempFile(plByMonthCsv)
    nextParse(null, { file: { filepath: p } })
    const res = makeRes()
    await dashboardReportsMonthly({}, res)
    expect(res.status).toBe(200)
    const d = res.body.data
    expect(d.blocked).toBeNull()
    expect(d.profitLoss.months).toHaveLength(12)
    expect(d.profitLoss.months[0]).toMatchObject({ label: 'Jul 2025', sales: 198000, costOfSales: 99000, operatingExpenses: 8500, complete: true })
    expect(d.bank).toBeNull()
    expect(JSON.stringify(d)).not.toMatch(/Purchases|Rent/)
    expect(await gone(p)).toBe(true)
  })

  test('an annual export is refused by name with a 422, and no path leaks', async () => {
    const p = tempFile(annualCsv)
    nextParse(null, { file: { filepath: p } })
    const res = makeRes()
    await dashboardReportsMonthly({}, res)
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('NOT_BY_MONTH')
    expect(JSON.stringify(res.body)).not.toContain(p)
  })

  test('four files are refused before any is parsed', async () => {
    const paths = [1, 2, 3, 4].map(() => tempFile('not a report'))
    nextParse(null, { file: paths.map(p => ({ filepath: p })) })
    const res = makeRes()
    await dashboardReportsMonthly({}, res)
    expect(res.status).toBe(400)
    expect(res.body.error.message).toMatch(/up to 3 by-month files/)
    for (const p of paths) { expect(await gone(p)).toBe(true) }
  })

  test('no file is a 400 with a code', async () => {
    nextParse(null, {})
    const res = makeRes()
    await dashboardReportsMonthly({}, res)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('NO_FILE')
  })
})
