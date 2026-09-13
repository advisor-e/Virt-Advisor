'use strict'

/**
 * The sales-report import for Stock Purchasing (item 4.94) — the reader and the route.
 *
 * The other half of the stock-sheet import. A stock-on-hand export carries two of the five
 * criteria; margin, how many sold and days on hand live in a sales report, which is what the
 * source workbook's own step 1 reads.
 *
 * 🔴 What matters most here is the DATE column. Days on hand is the sale date less the entry
 * date, and it is the criterion an advisor is least able to sanity-check by eye — a serial read
 * as a plain number, or a text date guessed at in the wrong order, produces a days-on-hand score
 * that looks perfectly reasonable and is wrong.
 *
 * Same harness as stockPurchasingIntake.test.js: formidable mocked at the module boundary.
 */

jest.mock('formidable', () => ({ formidable: jest.fn() }))

const fs = require('fs')
const os = require('os')
const path = require('path')
const { formidable } = require('formidable')
const { stockPurchasingSalesIntake } = require('../../server/routes/report')
const { SALES_LAYOUT, isoDate, readSalesSheet } = require('../../server/report/intake/salesSheetReader')
const { computeStockPurchasing } = require('../../server/report/stockPurchasingModel')

function makeRes () {
  const res = { status: null, body: null }
  res.send = (status, body) => { res.status = status; res.body = body }
  return res
}

function nextParse (err, files) {
  formidable.mockReturnValue({ parse (req, cb) { cb(err, {}, files) } })
}

function tempFile (content) {
  const p = path.join(os.tmpdir(), 'sp-sales-test-' + Math.random().toString(36).slice(2) + '.csv')
  fs.writeFileSync(p, content)
  return p
}

function gone (p) {
  return new Promise((resolve) => { setTimeout(() => resolve(!fs.existsSync(p)), 30) })
}

/** The workbook's own `Sales Report` columns, which are the target layout. */
const SALES = [
  'Product Group,Product Code,Quantity,Sales,Cost,Entry Date,Sale Date',
  'Kitchen,KB-100,40,4000,800,2026-01-01,2026-01-06',
  'Dining,PL-1,2,300,280,2026-01-01,2026-06-01'
].join('\n')

beforeEach(() => { jest.spyOn(console, 'error').mockImplementation(() => {}) })
afterEach(() => { jest.restoreAllMocks() })

describe('the sales-sheet reader — the target layout', () => {
  it('is the workbook\'s own sheet, and says so rather than claiming a package', () => {
    // 🔴 No published sales layout has been supplied for any accounting package, and inventing
    // one would produce a reader that looks finished and fails on the first real file — the same
    // honesty rule that keeps both stock packages marked `expected` rather than `verified`.
    expect(SALES_LAYOUT.confidence).toBe('expected')
    expect(SALES_LAYOUT.evidence).toMatch(/Growth Pro\.1a\.Stock Purchasing\.xlsx/)
    expect(SALES_LAYOUT.required)
      .toEqual(['code', 'quantity', 'sales', 'cost', 'entryDate', 'saleDate'])
  })

  it('reads the six required columns and the two optional ones', () => {
    const out = readSalesSheet(Buffer.from(SALES))
    expect(out.linesRead).toBe(2)
    expect(out.lines[0]).toEqual({
      code: 'KB-100',
      group: 'Kitchen',
      quantity: 40,
      sales: 4000,
      cost: 800,
      entryDate: '2026-01-01',
      saleDate: '2026-01-06',
      shareOfStock: null
    })
  })

  it('carries four of the five criteria, and the fifth only when the column is really there', () => {
    // Share of stock is a stock question. Claiming it because the column COULD have been there
    // would put a criterion on screen that nothing filled.
    const out = readSalesSheet(Buffer.from(SALES))
    expect(out.carries).toEqual(['margin', 'sold', 'unitCostRisk', 'daysOnHand'])
    expect(out.missing).toEqual(['shareOfStock'])
    expect(out.hasShareOfStock).toBe(false)

    const withShare = readSalesSheet(Buffer.from([
      'Product Code,Quantity,Sales,Cost,Entry Date,Sale Date,% of Stock Units',
      'KB-100,40,4000,800,2026-01-01,2026-01-06,0.7'
    ].join('\n')))
    expect(withShare.carries).toContain('shareOfStock')
    expect(withShare.missing).toEqual([])
    expect(withShare.lines[0].shareOfStock).toBe(0.7)
  })

  it('refuses a file BY THE COLUMNS IT LACKS, so the advisor knows what to add', () => {
    let err
    try {
      readSalesSheet(Buffer.from('Product Code,Quantity\nKB-100,40'))
    } catch (e) { err = e }
    expect(err.code).toBe('UNRECOGNISED_SALES')
    expect(err.message).toMatch(/Sales/)
    expect(err.message).toMatch(/Entry Date/)
  })

  it('refuses a file with the headings and no lines under them', () => {
    let err
    try {
      readSalesSheet(Buffer.from('Product Code,Quantity,Sales,Cost,Entry Date,Sale Date'))
    } catch (e) { err = e }
    expect(err.code).toBe('UNRECOGNISED_SALES')
  })

  it('skips a row with no product code rather than scoring a blank line', () => {
    const out = readSalesSheet(Buffer.from([
      'Product Code,Quantity,Sales,Cost,Entry Date,Sale Date',
      'KB-100,40,4000,800,2026-01-01,2026-01-06',
      ',,,,,',
      'PL-1,2,300,280,2026-01-01,2026-06-01'
    ].join('\n')))
    expect(out.linesRead).toBe(2)
  })

  it('finds the header when the export prints a title line above it', () => {
    const out = readSalesSheet(Buffer.from([
      'Sales by product — year to date',
      '',
      'Product Code,Quantity,Sales,Cost,Entry Date,Sale Date',
      'KB-100,40,4000,800,2026-01-01,2026-01-06'
    ].join('\n')))
    expect(out.linesRead).toBe(1)
  })

  it('matches a heading whatever its case, spacing or punctuation', () => {
    const out = readSalesSheet(Buffer.from([
      'product code,QUANTITY,Sales ,Cost,entry_date,Sale-Date',
      'KB-100,40,4000,800,2026-01-01,2026-01-06'
    ].join('\n')))
    expect(out.lines[0].code).toBe('KB-100')
    expect(out.lines[0].entryDate).toBe('2026-01-01')
  })
})

describe('🔴 the date column, which decides days on hand', () => {
  it('reads an Excel serial as the date the workbook means by it', () => {
    // 44355 is the entry date on the workbook's own first sample row.
    expect(isoDate(44355)).toBe('2021-06-08')
    expect(isoDate(44391)).toBe('2021-07-14')
  })

  it('reads a Date the spreadsheet reader already parsed', () => {
    expect(isoDate(new Date(Date.UTC(2026, 0, 6)))).toBe('2026-01-06')
  })

  it('reads an ISO string a spreadsheet never recognised as a date', () => {
    expect(isoDate('2026-01-06')).toBe('2026-01-06')
  })

  it('🔴 REFUSES an ambiguous string rather than guessing which half is the month', () => {
    // "03/04/2021" is 3 April or 4 March depending on where you live, and the guess decides a
    // days-on-hand score. Null costs the advisor one criterion; a wrong guess costs them trust.
    expect(isoDate('03/04/2021')).toBeNull()
    expect(isoDate('8 June 2021')).toBeNull()
    expect(isoDate('')).toBeNull()
    expect(isoDate(null)).toBeNull()
  })

  it('🔴 REFUSES a small number rather than turning 5 into 1900-01-04', () => {
    // A date column holding a plain small number is far likelier to hold something that is not a
    // date, and inventing an arrival date invents a days-on-hand score with it.
    expect(isoDate(5)).toBeNull()
    expect(isoDate(1999)).toBeNull()
    expect(isoDate(20000)).toBe('1954-10-03')
  })

  it('leaves days on hand unscored when a date could not be read, rather than scoring it 5', () => {
    const out = readSalesSheet(Buffer.from([
      'Product Code,Quantity,Sales,Cost,Entry Date,Sale Date',
      'KB-100,40,4000,800,03/04/2021,06/04/2021'
    ].join('\n')))
    expect(out.lines[0].entryDate).toBeNull()
    const model = computeStockPurchasing({ lines: out.lines })
    expect(model.lines[0].daysOnHand).toBeNull()
    expect(model.lines[0].scores.daysOnHand.points).toBe(0)
    expect(model.lines[0].scores.daysOnHand.scored).toBe(false)
  })
})

describe('the imported sales lines, run through the model', () => {
  const parsed = readSalesSheet(Buffer.from(SALES))
  const model = computeStockPurchasing({ lines: parsed.lines })

  it('scores the four criteria a sales report carries', () => {
    // KB-100: 80% margin (3), 40 sold (5), $20 a unit (5), 5 days (5). Share is not in the file.
    const best = model.lines[0]
    expect(best.margin).toBeCloseTo(0.8, 6)
    expect(best.daysOnHand).toBe(5)
    expect(best.scores.margin.points).toBe(3)
    expect(best.scores.sold.points).toBe(5)
    expect(best.scores.unitCostRisk.points).toBe(5)
    expect(best.scores.daysOnHand.rating).toBe('Hot Cakes!')
    expect(best.scores.shareOfStock.scored).toBe(false)
    expect(best.total).toBe(18)
  })

  it('ranks the shelf-warmer below it', () => {
    const worst = model.ranked[1]
    expect(worst.code).toBe('PL-1')
    expect(worst.daysOnHand).toBe(151)
    expect(worst.scores.daysOnHand.rating).toBe('Dead Wood')
  })
})

describe('POST /api/report/stock-purchasing/sales-intake', () => {
  it('turns one sales report into model inputs and removes the temp file', async () => {
    const p = tempFile(SALES)
    nextParse(null, { file: { filepath: p } })
    const res = makeRes()
    await stockPurchasingSalesIntake({ firmId: 'firm-1' }, res)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.linesRead).toBe(2)
    expect(res.body.data.carries).toEqual(['margin', 'sold', 'unitCostRisk', 'daysOnHand'])
    expect(await gone(p)).toBe(true)
  })

  it('refuses when no file is attached', async () => {
    nextParse(null, {})
    const res = makeRes()
    await stockPurchasingSalesIntake({ firmId: 'firm-1' }, res)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('NO_FILE')
  })

  it('refuses more than one file', async () => {
    const a = tempFile(SALES)
    const b = tempFile(SALES)
    nextParse(null, { file: [{ filepath: a }, { filepath: b }] })
    const res = makeRes()
    await stockPurchasingSalesIntake({ firmId: 'firm-1' }, res)
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(await gone(a)).toBe(true)
    expect(await gone(b)).toBe(true)
  })

  it('returns 413 for a file over the 5 MB limit', async () => {
    nextParse(new Error('options.maxFileSize exceeded'), null)
    const res = makeRes()
    await stockPurchasingSalesIntake({ firmId: 'firm-1' }, res)
    expect(res.status).toBe(413)
    expect(res.body.error.code).toBe('FILE_TOO_LARGE')
  })

  it('🔴 never logs the filename, a product code or a figure when it refuses', async () => {
    // A sales report is a list of everything a client sells, what it cost them and what they got.
    const logged = []
    console.error.mockImplementation((...args) => { logged.push(args.map(String).join(' ')) })
    const p = tempFile('Product Code,Nothing\nSECRET-SKU,123456')
    nextParse(null, { file: { filepath: p } })
    await stockPurchasingSalesIntake({ firmId: 'firm-1' }, makeRes())
    const all = logged.join('\n')
    expect(all).not.toContain('SECRET-SKU')
    expect(all).not.toContain('123456')
    expect(all).not.toContain(p)
    expect(all).toContain('stock-purchasing sales intake rejected')
    await gone(p)
  })

  it('is registered WITH firmAuth, because it accepts an upload', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../server/restify-server.js'), 'utf8')
    const line = src.split('\n').find(l => l.includes("'/api/report/stock-purchasing/sales-intake'"))
    expect(line).toBeDefined()
    expect(line).toMatch(/firmAuth/)
  })
})
