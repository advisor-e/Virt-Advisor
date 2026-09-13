'use strict'

/**
 * The Sales Dashboard's two routes (item 4.95) — the calc route, and the sales-report import.
 *
 * 🔴 WHAT MATTERS MOST HERE IS THE PER-MODEL REQUIRED LIST. Mike named it on Decision 9 as the
 * one real cost of adding dates: the shared reader demands `Entry Date` and `Sale Date` because
 * Stock Purchasing derives days on hand from the gap between them, and this model uses neither
 * to decide anything. Shared unchanged, the reader would refuse a perfectly good file for a
 * missing column nothing here reads — so the required list became per model, and these tests
 * pin both halves: this model accepts a file Stock Purchasing would refuse, and Stock Purchasing
 * still refuses it.
 *
 * Same harness as stockPurchasingSalesIntake.test.js: formidable mocked at the module boundary.
 */

jest.mock('formidable', () => ({ formidable: jest.fn() }))

const fs = require('fs')
const os = require('os')
const path = require('path')
const { formidable } = require('formidable')
const {
  salesDashboard,
  salesDashboardIntake,
  stockPurchasingSalesIntake
} = require('../../server/routes/report')
const { REQUIRED_BY_MODEL, readSalesSheet } = require('../../server/report/intake/salesSheetReader')

function makeRes () {
  const res = { status: null, body: null }
  res.send = (status, body) => { res.status = status; res.body = body }
  return res
}

function nextParse (err, files) {
  formidable.mockReturnValue({ parse (req, cb) { cb(err, {}, files) } })
}

function tempFile (content) {
  const p = path.join(os.tmpdir(), 'sd-test-' + Math.random().toString(36).slice(2) + '.csv')
  fs.writeFileSync(p, content)
  return p
}

function gone (p) {
  return new Promise((resolve) => { setTimeout(() => resolve(!fs.existsSync(p)), 30) })
}

/** The Sales Dashboard workbook's own `Sales Data Input` columns, which are the target layout. */
const DASHBOARD_SHEET = [
  'Product Brand,Product Name,Product Category,Sales Revenue,Product Cost,Region,Sales Person,Sale Date',
  'Smith,Coco,Full Auto,15250,6850,Auckland,Billy,2026-01-14',
  'Toyota,Zoco,Semi Auto,8750,5478,Dunedin,Bobby,2026-02-03'
].join('\n')

beforeEach(() => { jest.spyOn(console, 'error').mockImplementation(() => {}) })
afterEach(() => { jest.restoreAllMocks() })

describe('the calc route', () => {
  it('answers with the workbook sample when no rows are sent — which is how the screen opens', () => {
    const res = makeRes()
    salesDashboard({ body: {} }, res, () => {})
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.totals.salesValue).toBe(269683)
    expect(res.body.data.transactionsRead).toBe(140)
  })

  it('🔴 but an EMPTY LIST is not the same thing, and never becomes the sample', () => {
    // A caller that sent rows and had none read must see an empty page. The sample wearing a
    // real client's name, on a screen that has stopped saying "Sample data", is the worst
    // outcome this route can produce.
    const res = makeRes()
    salesDashboard({ body: { sales: [] } }, res, () => {})
    expect(res.body.data.totals.salesValue).toBe(0)
    expect(res.body.data.transactionsRead).toBe(0)
  })

  it('returns the whole answer the screen renders from', () => {
    const res = makeRes()
    salesDashboard({ body: { sales: [{ revenue: 900, cost: 300, brand: 'Smith' }] } }, res, () => {})
    expect(Object.keys(res.body.data).sort()).toEqual([
      'available', 'bands', 'ceilings', 'dimensions', 'focus', 'hasDates',
      'totals', 'transactionsRead', 'trend', 'unbanded'
    ])
    expect(res.body.timestamp).toEqual(expect.any(String))
  })

  it('never leaks a stack trace when the inputs cannot be computed', () => {
    const res = makeRes()
    // A getter that throws is the one shape that reaches the catch: the model tolerates every
    // malformed VALUE by design, so this proves the envelope rather than a reachable bug.
    const body = { get sales () { throw new Error('C:\\secret\\path.js exploded') } }
    salesDashboard({ body }, res, () => {})
    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      success: false,
      error: {
        code: 'SALES_DASHBOARD_COMPUTE_FAILED',
        message: 'Could not compute the model from the supplied inputs.'
      },
      timestamp: expect.any(String)
    })
    expect(JSON.stringify(res.body)).not.toMatch(/secret/)
  })

  it('calls next() so the route chain completes', () => {
    const next = jest.fn()
    salesDashboard({ body: {} }, makeRes(), next)
    expect(next).toHaveBeenCalled()
  })
})

describe('the required columns are per model — Decision 9', () => {
  it('asks for revenue and cost, and nothing else', () => {
    expect(REQUIRED_BY_MODEL.salesDashboard).toEqual(['sales', 'cost'])
  })

  it('leaves Stock Purchasing\'s own list exactly as it was', () => {
    expect(REQUIRED_BY_MODEL.stockPurchasing)
      .toEqual(['code', 'quantity', 'sales', 'cost', 'entryDate', 'saleDate'])
  })

  it('reads a file that has no Entry Date, which this model never uses', () => {
    const out = readSalesSheet(Buffer.from(DASHBOARD_SHEET), {
      required: REQUIRED_BY_MODEL.salesDashboard
    })
    expect(out.linesRead).toBe(2)
    expect(out.lines[0]).toMatchObject({
      code: 'Coco',
      brand: 'Smith',
      category: 'Full Auto',
      sales: 15250,
      cost: 6850,
      region: 'Auckland',
      salesperson: 'Billy',
      saleDate: '2026-01-14',
      entryDate: null
    })
  })

  it('🔴 and Stock Purchasing still refuses that same file, by the column IT lacks', () => {
    // The proof that the list is genuinely per model rather than simply loosened for everyone.
    expect(() => readSalesSheet(Buffer.from(DASHBOARD_SHEET))).toThrow(/Entry Date/)
  })

  it('names what THIS model lacks when a file is refused', () => {
    const noMoney = 'Product Brand,Region\nSmith,Auckland'
    expect(() => readSalesSheet(Buffer.from(noMoney), { required: REQUIRED_BY_MODEL.salesDashboard }))
      .toThrow(/Sales, Cost/)
  })

  it('reads both spellings of the same column, because the two workbooks differ', () => {
    // `Sales Report` says Sales/Cost/Product Code; `Sales Data Input` says Sales Revenue/
    // Product Cost/Product Name. Without the aliases this reader would refuse the very workbook
    // the Sales Dashboard ports.
    const shortForm = 'Product Code,Sales,Cost\nCoco,900,300'
    const out = readSalesSheet(Buffer.from(shortForm), { required: REQUIRED_BY_MODEL.salesDashboard })
    expect(out.lines[0]).toMatchObject({ code: 'Coco', sales: 900, cost: 300 })
  })

  it('keeps a row that names nothing, because a dashboard still bands its money', () => {
    // Stock Purchasing drops a line with no product code — it cannot put a nameless row on a buy
    // list. Here the same row is a real sale and dropping it would lose its money from every
    // total on the page.
    const nameless = 'Sales,Cost\n900,300\n100,40'
    const out = readSalesSheet(Buffer.from(nameless), { required: REQUIRED_BY_MODEL.salesDashboard })
    expect(out.linesRead).toBe(2)
    expect(out.lines[0].code).toBeNull()
  })

  it('says which cuts the file genuinely supports, and never claims an empty column', () => {
    const emptyRegion = 'Product Brand,Sales,Cost,Region\nSmith,900,300,\nJones,100,40,'
    const out = readSalesSheet(Buffer.from(emptyRegion), { required: REQUIRED_BY_MODEL.salesDashboard })
    expect(out.dimensions).toEqual(['brand'])
  })
})

describe('the intake route', () => {
  it('reads a sales report and hands back the rows the model wants', async () => {
    const p = tempFile(DASHBOARD_SHEET)
    nextParse(null, { file: { filepath: p } })
    const res = makeRes()
    await salesDashboardIntake({}, res)

    expect(res.status).toBe(200)
    expect(res.body.data.linesRead).toBe(2)
    expect(res.body.data.sales[0]).toEqual({
      brand: 'Smith',
      product: 'Coco',
      category: 'Full Auto',
      region: 'Auckland',
      salesperson: 'Billy',
      revenue: 15250,
      cost: 6850,
      date: '2026-01-14'
    })
    expect(res.body.data.dimensions).toEqual(['brand', 'product', 'category', 'region', 'salesperson'])
    expect(res.body.data.hasDates).toBe(true)
    expect(await gone(p)).toBe(true)
  })

  it('reads the SALE date and never the entry date', async () => {
    // An entry date is a stock arrival. Putting one on a sales trend would draw the month the
    // goods turned up rather than the month they sold.
    const withBoth = [
      'Product Name,Sales,Cost,Entry Date,Sale Date',
      'Coco,900,300,2026-01-01,2026-05-20'
    ].join('\n')
    const p = tempFile(withBoth)
    nextParse(null, { file: { filepath: p } })
    const res = makeRes()
    await salesDashboardIntake({}, res)
    expect(res.body.data.sales[0].date).toBe('2026-05-20')
    expect(await gone(p)).toBe(true)
  })

  it('says a file carries no dates rather than inventing them', async () => {
    const p = tempFile('Product Brand,Sales,Cost\nSmith,900,300')
    nextParse(null, { file: { filepath: p } })
    const res = makeRes()
    await salesDashboardIntake({}, res)
    expect(res.body.data.hasDates).toBe(false)
    expect(res.body.data.sales[0].date).toBeNull()
    expect(await gone(p)).toBe(true)
  })

  it('refuses a file that is not a sales report, naming the column THIS model lacks', async () => {
    // 🔴 The authored sentence reaches the browser only because UNRECOGNISED_SALES is on the
    // intake allowlist — it was missing until 2026-09-13, so this refusal used to arrive as the
    // generic one and told nobody which column to add.
    const p = tempFile('Employee,Start Date\nBob,2020-01-01')
    nextParse(null, { file: { filepath: p } })
    const res = makeRes()
    await salesDashboardIntake({}, res)

    expect(res.status).toBe(422)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('UNRECOGNISED_SALES')
    expect(res.body.error.message).toMatch(/Sales/)
    expect(res.body.error.message).not.toMatch(/Entry Date/) // not this model's business
    expect(res.body.error.message).not.toMatch(/sd-test-/) // and never the filename
    expect(await gone(p)).toBe(true)
  })

  it('refuses when no file was attached', async () => {
    nextParse(null, {})
    const res = makeRes()
    await salesDashboardIntake({}, res)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('NO_FILE')
  })

  it('refuses more than one file, and still deletes both', async () => {
    const a = tempFile(DASHBOARD_SHEET)
    const b = tempFile(DASHBOARD_SHEET)
    nextParse(null, { file: [{ filepath: a }, { filepath: b }] })
    const res = makeRes()
    await salesDashboardIntake({}, res)

    expect(res.status).toBe(400)
    expect(await gone(a)).toBe(true)
    expect(await gone(b)).toBe(true)
  })

  it('answers 413 on a file over the cap', async () => {
    nextParse(Object.assign(new Error('options.maxFileSize exceeded'), {}), null)
    const res = makeRes()
    await salesDashboardIntake({}, res)
    expect(res.status).toBe(413)
    expect(res.body.error.code).toBe('FILE_TOO_LARGE')
  })

  it('answers 400 when the upload itself cannot be parsed', async () => {
    nextParse(new Error('boom'), null)
    const res = makeRes()
    await salesDashboardIntake({}, res)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('UPLOAD_PARSE_FAILED')
  })

  it('🔴 logs the stable code alone — never the filename, the staff names or the content', async () => {
    // A sales report names a client's staff, their customers' regions and what every line
    // earned. None of it belongs in a server log.
    const p = tempFile('Employee,Start Date\nBob,2020-01-01')
    nextParse(null, { file: { filepath: p } })
    await salesDashboardIntake({}, makeRes())

    const logged = console.error.mock.calls.map(c => c.join(' ')).join('\n')
    expect(logged).toMatch(/UNRECOGNISED_SALES/)
    expect(logged).not.toMatch(/Bob/)
    expect(logged).not.toMatch(/sd-test-/)
    expect(await gone(p)).toBe(true)
  })

  it('leaves the Stock Purchasing intake behaving exactly as it did', async () => {
    // The reader is shared, so this is the regression that matters: its own file still reads,
    // and its own refusal still names its own columns.
    const p = tempFile([
      'Product Group,Product Code,Quantity,Sales,Cost,Entry Date,Sale Date',
      'Kitchen,KB-100,40,4000,800,2026-01-01,2026-01-06'
    ].join('\n'))
    nextParse(null, { file: { filepath: p } })
    const res = makeRes()
    await stockPurchasingSalesIntake({}, res)

    expect(res.status).toBe(200)
    expect(res.body.data.linesRead).toBe(1)
    expect(res.body.data.carries).toEqual(['margin', 'sold', 'unitCostRisk', 'daysOnHand'])
    expect(await gone(p)).toBe(true)
  })
})
