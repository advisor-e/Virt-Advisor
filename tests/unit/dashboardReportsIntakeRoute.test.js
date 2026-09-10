'use strict'

/**
 * The Business Performance Report's two stage-2 routes (item 4.70).
 *
 * Same harness as threeWayForecastIntakeRoute.test.js: formidable is mocked at the module
 * boundary so the intake handler runs without real multipart plumbing, and the thresholds
 * resolver is mocked so the pages handler runs without a firm overlay behind it.
 */

jest.mock('formidable', () => ({ formidable: jest.fn() }))
jest.mock('../../server/utils/forecastTrendThresholds', () => ({
  loadResolvedTrendThresholds: jest.fn()
}))

const fs = require('fs')
const os = require('os')
const path = require('path')
const { formidable } = require('formidable')
const { loadResolvedTrendThresholds } = require('../../server/utils/forecastTrendThresholds')
const { dashboardReportsIntake, dashboardReportPages } = require('../../server/routes/report')

const THRESHOLDS = {
  levels: { debtorDays: { green: 35, amber: 45 }, creditorDays: { green: 35, amber: 45 }, stockDays: { green: 30, amber: 60 } },
  movements: { salesGrowth: { warn: 0, crit: -5 }, grossMargin: { warn: 1, crit: 3 }, overheadRatio: { warn: 1, crit: 3 } }
}

function makeRes () {
  const res = { status: null, body: null }
  res.send = (status, body) => { res.status = status; res.body = body }
  return res
}

function nextParse (err, files) {
  formidable.mockReturnValue({ parse (req, cb) { cb(err, {}, files) } })
}

function tempFile (content) {
  const p = path.join(os.tmpdir(), 'dr-intake-test-' + Math.random().toString(36).slice(2) + '.csv')
  fs.writeFileSync(p, content)
  return p
}

function gone (p) {
  return new Promise((resolve) => { setTimeout(() => resolve(!fs.existsSync(p)), 30) })
}

const bsCsv = (date, bank) => [
  'Balance Sheet', 'Kinetic Test Ltd', 'As at ' + date, '',
  'Assets', 'Current Assets', 'Bank', 'Cheque Account,' + bank, 'Total Bank,' + bank,
  'Accounts Receivable,52000', 'Inventory,40000', 'Total Current Assets,' + (bank + 92000),
  'Total Assets,' + (bank + 92000),
  'Liabilities', 'Current Liabilities', 'Accounts Payable,58000', 'Total Current Liabilities,58000',
  'Total Liabilities,58000',
  'Equity', 'Share Capital,20000', 'Total Equity,20000'
].join('\n')

const plCsv = (date, sales) => [
  'Profit and Loss', 'Kinetic Test Ltd', 'For the year ended ' + date, '',
  'Income', 'Sales,' + sales, 'Total Income,' + sales,
  'Less Cost of Sales', 'Purchases,400000', 'Total Cost of Sales,400000',
  'Less Operating Expenses', 'Rent,8500', 'Wages and Salaries,85000', 'Total Operating Expenses,93500'
].join('\n')

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
  loadResolvedTrendThresholds.mockResolvedValue(THRESHOLDS)
})
afterEach(() => { jest.restoreAllMocks() })

describe('POST /api/report/dashboard-reports/intake', () => {
  test('four exports become two years, this year by the newer date, and every temp file is removed', async () => {
    const paths = [
      tempFile(bsCsv('31 March 2025', 60000)),
      tempFile(plCsv('31 March 2026', 890000)),
      tempFile(bsCsv('31 March 2026', 71000)),
      tempFile(plCsv('31 March 2025', 800000))
    ]
    nextParse(null, { file: paths.map(p => ({ filepath: p })) })
    const res = makeRes()
    await dashboardReportsIntake({}, res)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    const d = res.body.data
    expect(d.blocked).toBeNull()
    expect(d.current.figures.bank.value).toBe(71000)
    expect(d.current.figures.tradingIncome.value).toBe(890000)
    expect(d.prior.figures.bank.value).toBe(60000)
    expect(d.prior.figures.tradingIncome.value).toBe(800000)
    expect(d.current.figures.wages.value).toBe(85000)
    expect(d.companyName).toBe('Kinetic Test Ltd')
    for (const p of paths) { expect(await gone(p)).toBe(true) }
  })

  test('no file is a 400 with a code, not a crash', async () => {
    nextParse(null, {})
    const res = makeRes()
    await dashboardReportsIntake({}, res)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('NO_FILE')
  })

  test('seven files are refused before any is parsed, and still removed', async () => {
    const paths = [1, 2, 3, 4, 5, 6, 7].map(() => tempFile('not a report'))
    nextParse(null, { file: paths.map(p => ({ filepath: p })) })
    const res = makeRes()
    await dashboardReportsIntake({}, res)
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.error.message).toMatch(/up to 6 files/)
    for (const p of paths) { expect(await gone(p)).toBe(true) }
  })

  test('six exports become three years, the year before last by its date (stage 5)', async () => {
    const paths = [
      tempFile(bsCsv('31 March 2024', 52000)),
      tempFile(plCsv('31 March 2024', 700000)),
      tempFile(bsCsv('31 March 2025', 60000)),
      tempFile(plCsv('31 March 2026', 890000)),
      tempFile(bsCsv('31 March 2026', 71000)),
      tempFile(plCsv('31 March 2025', 800000))
    ]
    nextParse(null, { file: paths.map(p => ({ filepath: p })) })
    const res = makeRes()
    await dashboardReportsIntake({}, res)
    expect(res.status).toBe(200)
    const d = res.body.data
    expect(d.current.figures.tradingIncome.value).toBe(890000)
    expect(d.prior.figures.tradingIncome.value).toBe(800000)
    expect(d.earlier.figures.tradingIncome.value).toBe(700000)
    expect(d.earlier.figures.bank.value).toBe(52000)
    for (const p of paths) { expect(await gone(p)).toBe(true) }
  })

  test('a file that is not a report fails with a safe message and no path', async () => {
    const p = tempFile('Shopping list\nEggs,12')
    nextParse(null, { file: { filepath: p } })
    const res = makeRes()
    await dashboardReportsIntake({}, res)
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.body.success).toBe(false)
    expect(JSON.stringify(res.body)).not.toContain(p)
    expect(JSON.stringify(res.body)).not.toMatch(/\.js:\d+/)
  })

  test('an oversize upload is a 413', async () => {
    nextParse(new Error('options.maxFileSize exceeded'), null)
    const res = makeRes()
    await dashboardReportsIntake({}, res)
    expect(res.status).toBe(413)
    expect(res.body.error.code).toBe('FILE_TOO_LARGE')
  })
})

describe('POST /api/report/dashboard-reports/pages', () => {
  const body = {
    current: { bank: 224000, accountsReceivable: 365000, stock: 200000, fixedAssets: 505000, currentLiabilities: 410000, accountsPayable: 200000, nonCurrentLiabilities: 205000, tradingIncome: 3650000, costOfSales: 2000000, wages: 596000, operatingExpenses: 102000, depreciation: 38000, interestPaid: 32000 },
    prior: { bank: 183000, accountsReceivable: 250000, stock: 150000, fixedAssets: 470000, currentLiabilities: 387000, accountsPayable: 150000, nonCurrentLiabilities: 220000, tradingIncome: 3000000, costOfSales: 1800000, wages: 550000, operatingExpenses: 98000, depreciation: 35000, interestPaid: 30000 }
  }

  test('🔴 THE FIRM\'S THRESHOLDS COME FROM THE TOKEN, never from the body', async () => {
    const res = makeRes()
    await dashboardReportPages({ firmId: 'firm-77', body: Object.assign({ thresholds: { levels: { debtorDays: { green: 1, amber: 2 } }, movements: {} } }, body) }, res)
    expect(res.status).toBe(200)
    expect(loadResolvedTrendThresholds).toHaveBeenCalledWith('firm-77', expect.any(Function))
    // With the body's thresholds a 36.5-day debtor book would be red; with the firm's it is amber.
    expect(res.body.data.score.measures.find(m => m.key === 'debtorDays').band).toBe('amber')
    expect(res.body.data.score.score).toBe(75)
  })

  test('an empty body answers the documented shape rather than a sample', async () => {
    const res = makeRes()
    await dashboardReportPages({ firmId: 'firm-77', body: {} }, res)
    expect(res.status).toBe(200)
    expect(res.body.data.profitLoss.current.revenue).toBe(0)
    expect(res.body.data.score.score).toBeNull()
  })

  test('a failure is a safe envelope with a code and no stack', async () => {
    loadResolvedTrendThresholds.mockRejectedValue(new Error('overlay down at /srv/db.js:12'))
    const res = makeRes()
    await dashboardReportPages({ firmId: 'firm-77', body }, res)
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ success: false, error: { code: 'DASHBOARD_REPORT_PAGES_FAILED' } })
    expect(JSON.stringify(res.body)).not.toContain('/srv/db.js')
    expect(res.body.timestamp).toBeTruthy()
  })
})
