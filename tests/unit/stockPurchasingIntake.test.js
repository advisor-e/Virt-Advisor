'use strict'

/**
 * The stock-sheet import for Stock Purchasing (item 4.94) — the assembler and the route.
 *
 * Mike, 2026-09-13: "we need to be able to import a stock sheet". It reads through the inventory
 * reader built for 4.70 stage 4, so nothing about either package's layout is re-tested here; what
 * is tested is the thing this module decides — WHAT A STOCK SHEET CAN HONESTLY SAY.
 *
 * 🔴 The rule that matters most, and the reason the module exists: a stock export's units are
 * units HELD, and the model reads `quantity` as units SOLD. Letting one stand in for the other
 * would score a full warehouse as though every unit had sold. `quantity` must come back null.
 *
 * Same harness as dashboardReportsInventoryRoute.test.js: formidable mocked at the module
 * boundary.
 */

jest.mock('formidable', () => ({ formidable: jest.fn() }))

const fs = require('fs')
const os = require('os')
const path = require('path')
const { formidable } = require('formidable')
const { stockPurchasingIntake } = require('../../server/routes/report')
const {
  SCORED_FROM_STOCK,
  NOT_IN_A_STOCK_SHEET,
  assembleStockSheet,
  readStockSheet
} = require('../../server/report/intake/stockSheetAssembler')
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
  const p = path.join(os.tmpdir(), 'sp-intake-test-' + Math.random().toString(36).slice(2) + '.csv')
  fs.writeFileSync(p, content)
  return p
}

function gone (p) {
  return new Promise((resolve) => { setTimeout(() => resolve(!fs.existsSync(p)), 30) })
}

const CIN7 = [
  'SKU,Product Name,Category,Default Location,OnHand,Allocated,Available,OnOrder,Unit Cost,Total Value',
  'KB-100,Kettle Black,Kitchen,Auckland,100,20,80,50,12.50,1250',
  'PL-1,Plate Set,Dining,Christchurch,300,10,290,0,200,60000'
].join('\n')

const UNLEASHED = [
  'Product Code,Product Description,Group Name,Warehouse Code,Qty On Hand,Qty Allocated,Qty Available,Average Cost,Total Cost On Hand,Base Currency Code',
  'A1,Widget,Parts,WH1,200,50,150,2.5,500,NZD'
].join('\n')

beforeEach(() => { jest.spyOn(console, 'error').mockImplementation(() => {}) })
afterEach(() => { jest.restoreAllMocks() })

describe('the stock-sheet assembler — what a stock sheet can honestly say', () => {
  const parsed = readStockSheet(Buffer.from(CIN7))

  it('🔴 leaves `quantity` NULL on every line — units held are not units sold', () => {
    // The inversion this whole module exists to prevent. 100 kettles on a shelf is not 100 sold,
    // and scoring it as "Often" would recommend buying more of what nobody is buying.
    expect(parsed.lines.every(l => l.quantity === null)).toBe(true)
    expect(parsed.lines.map(l => l.unitsHeld)).toEqual([100, 300])
  })

  it('carries unit cost risk and share of stock, and names the three it cannot', () => {
    expect(parsed.carries).toEqual(['unitCostRisk', 'shareOfStock'])
    expect(parsed.missing).toEqual(['margin', 'sold', 'daysOnHand'])
    expect(SCORED_FROM_STOCK).toHaveLength(2)
    expect(NOT_IN_A_STOCK_SHEET).toHaveLength(3)
  })

  it('computes share of stock as this line\'s units over every unit in the file', () => {
    // The workbook has this typed in by hand; a real file can work it out.
    expect(parsed.unitsTotal).toBe(400)
    expect(parsed.lines[0].shareOfStock).toBeCloseTo(0.25, 6)
    expect(parsed.lines[1].shareOfStock).toBeCloseTo(0.75, 6)
  })

  it('passes the file\'s unit cost straight through rather than deriving it', () => {
    // There is no units-sold figure to divide by, so deriving it would divide by the wrong thing.
    expect(parsed.lines[0].avgUnitCost).toBe(12.5)
    expect(parsed.lines[1].avgUnitCost).toBe(200)
  })

  it('fills step 2 whole — what is on the shelf, and what is in transit', () => {
    expect(parsed.shelf).toEqual({ onHand: 400, inTransit: 50 })
    expect(parsed.hasOnOrder).toBe(true)
  })

  it('records which package wrote the file and on what cost basis', () => {
    expect(parsed.package).toBe('Cin7 Core')
    expect(parsed.costBasis).toBe('unitCost')
    const unleashed = readStockSheet(Buffer.from(UNLEASHED))
    expect(unleashed.package).toBe('Unleashed')
    expect(unleashed.costBasis).toBe('averageCost')
    // Unleashed prints no on-order column, and the result says so rather than reporting zero
    // in transit as though it had been checked.
    expect(unleashed.hasOnOrder).toBe(false)
    expect(unleashed.shelf.inTransit).toBe(0)
  })

  it('calls an unknown share null, never zero, when a line has no units', () => {
    // Unknown is not "none". The model scores a null 0 AND says it was not scored.
    const out = assembleStockSheet({ package: 'x', costBasis: 'unitCost', hasOnOrder: false, lines: [{ code: 'A', onHand: null, unitCost: 5, value: null }] })
    expect(out.lines[0].shareOfStock).toBeNull()
  })

  it('calls every share null rather than dividing by zero when the file holds no units', () => {
    const out = assembleStockSheet({ package: 'x', costBasis: 'unitCost', hasOnOrder: false, lines: [{ code: 'A', onHand: 0, unitCost: 5, value: 0 }] })
    expect(out.lines[0].shareOfStock).toBeNull()
    expect(out.unitsTotal).toBe(0)
  })

  it('survives being handed nothing', () => {
    expect(assembleStockSheet(null).lines).toEqual([])
    expect(assembleStockSheet(undefined).shelf).toEqual({ onHand: 0, inTransit: 0 })
  })
})

describe('the imported lines, run through the model', () => {
  const parsed = readStockSheet(Buffer.from(CIN7))
  const model = computeStockPurchasing({ lines: parsed.lines, shelf: parsed.shelf })

  it('scores the two criteria the file carries, and 0 for the three it does not', () => {
    // Kettle: $12.50 a unit is Minor (5); 0.25 of the shelf is Flowing (3). 8 of a possible 25,
    // and the missing 17 is not a bad product — it is a missing file.
    const kettle = model.lines[0]
    expect(kettle.scores.unitCostRisk.points).toBe(5)
    expect(kettle.scores.unitCostRisk.rating).toBe('Minor')
    expect(kettle.scores.shareOfStock.points).toBe(3)
    expect(kettle.scores.shareOfStock.rating).toBe('Flowing')
    expect(kettle.total).toBe(8)
    for (const c of ['margin', 'sold', 'daysOnHand']) {
      expect(kettle.scores[c].points).toBe(0)
      expect(kettle.scores[c].scored).toBe(false)
    }
  })

  it('🔴 never scores "how many sold" off stock held, however much of it there is', () => {
    // 300 plates on the shelf would be "Often" — the top rung — if units held were read as sold.
    const plates = model.lines[1]
    expect(plates.unitsHeld).toBeUndefined() // the model does not carry it, and must not score it
    expect(plates.quantity).toBeNull()
    expect(plates.scores.sold.points).toBe(0)
    expect(plates.scores.sold.scored).toBe(false)
  })

  it('still ranks, on what it does know', () => {
    // The kettle beats the plates: same shelf, far less cash in each unit.
    expect(model.ranked[0].code).toBe('KB-100')
    expect(model.ranked[1].code).toBe('PL-1')
    expect(model.ranked[1].scores.unitCostRisk.rating).toBe('Waking Nights')
  })

  it('takes the shelf straight from the file', () => {
    expect(model.shelf).toEqual({ onHand: 400, inTransit: 50, alreadyCommitted: 450 })
  })
})

describe('POST /api/report/stock-purchasing/intake', () => {
  it('turns one Cin7 export into model inputs and removes the temp file', async () => {
    const p = tempFile(CIN7)
    nextParse(null, { file: { filepath: p } })
    const res = makeRes()
    await stockPurchasingIntake({ firmId: 'firm-1' }, res)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(typeof res.body.timestamp).toBe('string')
    expect(res.body.data.package).toBe('Cin7 Core')
    expect(res.body.data.lines).toHaveLength(2)
    expect(res.body.data.shelf).toEqual({ onHand: 400, inTransit: 50 })
    expect(res.body.data.carries).toEqual(['unitCostRisk', 'shareOfStock'])
    expect(res.body.data.missing).toEqual(['margin', 'sold', 'daysOnHand'])
    expect(await gone(p)).toBe(true)
  })

  it('refuses when no file is attached', async () => {
    nextParse(null, {})
    const res = makeRes()
    await stockPurchasingIntake({ firmId: 'firm-1' }, res)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('NO_FILE')
  })

  it('refuses more than one file, because this step reads one export', async () => {
    const a = tempFile(CIN7)
    const b = tempFile(CIN7)
    nextParse(null, { file: [{ filepath: a }, { filepath: b }] })
    const res = makeRes()
    await stockPurchasingIntake({ firmId: 'firm-1' }, res)
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.body.success).toBe(false)
    expect(await gone(a)).toBe(true)
    expect(await gone(b)).toBe(true)
  })

  it('returns 413 for a file over the 5 MB limit', async () => {
    nextParse(new Error('options.maxFileSize exceeded'), null)
    const res = makeRes()
    await stockPurchasingIntake({ firmId: 'firm-1' }, res)
    expect(res.status).toBe(413)
    expect(res.body.error.code).toBe('FILE_TOO_LARGE')
  })

  it('refuses a file that is not a stock export, by the columns it lacks', async () => {
    const p = tempFile('Date,Amount\n2026-01-01,100')
    nextParse(null, { file: { filepath: p } })
    const res = makeRes()
    await stockPurchasingIntake({ firmId: 'firm-1' }, res)
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.body.success).toBe(false)
    expect(await gone(p)).toBe(true)
  })

  it('🔴 never logs the filename, a product code or a product name when it refuses', async () => {
    // A client's stock list is a list of everything they sell and what it cost them.
    const logged = []
    console.error.mockImplementation((...args) => { logged.push(args.map(String).join(' ')) })
    const p = tempFile('SKU,Product Name\nSECRET-SKU,Secret Product')
    nextParse(null, { file: { filepath: p } })
    await stockPurchasingIntake({ firmId: 'firm-1' }, makeRes())
    const all = logged.join('\n')
    expect(all).not.toContain('SECRET-SKU')
    expect(all).not.toContain('Secret Product')
    expect(all).not.toContain(p)
    expect(all).toContain('stock-purchasing intake rejected')
    await gone(p)
  })

  it('is registered WITH firmAuth, because it accepts an upload', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../server/restify-server.js'), 'utf8')
    const line = src.split('\n').find(l => l.includes("'/api/report/stock-purchasing/intake'"))
    expect(line).toBeDefined()
    expect(line).toMatch(/firmAuth/)
    // And its calc sibling stays anonymous — numbers in, numbers out.
    const calc = src.split('\n').find(l => l.includes("'/api/report/stock-purchasing'"))
    expect(calc).not.toMatch(/firmAuth/)
  })
})
