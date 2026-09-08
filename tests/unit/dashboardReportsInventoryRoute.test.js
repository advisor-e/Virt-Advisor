'use strict'

/**
 * POST /api/report/dashboard-reports/inventory (item 4.70, stage 4).
 *
 * Same harness as dashboardReportsIntakeRoute.test.js: formidable is mocked at the module
 * boundary, and the firm's currency read is mocked so the route runs without an overlay.
 * The rule these tests pin beyond the envelope: NO PRODUCT CODE OR NAME leaves the server.
 */

jest.mock('formidable', () => ({ formidable: jest.fn() }))
jest.mock('../../server/routes/currency', () => ({ readFirmCurrency: jest.fn() }))

const fs = require('fs')
const os = require('os')
const path = require('path')
const { formidable } = require('formidable')
const { readFirmCurrency } = require('../../server/routes/currency')
const { dashboardReportsInventory } = require('../../server/routes/report')

function makeRes () {
  const res = { status: null, body: null }
  res.send = (status, body) => { res.status = status; res.body = body }
  return res
}

function nextParse (err, files) {
  formidable.mockReturnValue({ parse (req, cb) { cb(err, {}, files) } })
}

function tempFile (content) {
  const p = path.join(os.tmpdir(), 'dr-inventory-test-' + Math.random().toString(36).slice(2) + '.csv')
  fs.writeFileSync(p, content)
  return p
}

function gone (p) {
  return new Promise((resolve) => { setTimeout(() => resolve(!fs.existsSync(p)), 30) })
}

const CIN7 = [
  'SKU,Product Name,Category,Default Location,OnHand,Allocated,Available,OnOrder,Unit Cost,Total Value',
  'KB-100,Kettle Black,Kitchen,Auckland,100,20,80,50,12.50,1250',
  'PL-1,Plate Set,Dining,Christchurch,10,10,0,0,30,300'
].join('\n')

const UNLEASHED_AUD = [
  'Product Code,Product Description,Group Name,Warehouse Code,Qty On Hand,Qty Allocated,Qty Available,Average Cost,Total Cost On Hand,Base Currency Code',
  'A1,Widget,Parts,WH1,200,50,150,2.5,500,AUD'
].join('\n')

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
  readFirmCurrency.mockResolvedValue({ currency: 'NZD', isDefault: true })
})
afterEach(() => { jest.restoreAllMocks() })

describe('POST /api/report/dashboard-reports/inventory', () => {
  test('one Cin7 export becomes the stock totals, no product line leaves, and the temp file is removed', async () => {
    const p = tempFile(CIN7)
    nextParse(null, { file: { filepath: p } })
    const res = makeRes()
    await dashboardReportsInventory({ firmId: 'firm-1' }, res)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    const d = res.body.data
    expect(d.package).toBe('Cin7 Core')
    expect(d.totalValue).toBe(1550)
    expect(d.currency).toBe('NZD')
    expect(d.categories.map(c => c.name)).toEqual(['Kitchen', 'Dining'])
    expect(d.lines).toBeUndefined()
    expect(JSON.stringify(res.body)).not.toMatch(/KB-100|Kettle|Plate/)
    expect(readFirmCurrency).toHaveBeenCalledWith('firm-1')
    expect(await gone(p)).toBe(true)
  })

  test('no file is a 400 with a code, not a crash', async () => {
    nextParse(null, {})
    const res = makeRes()
    await dashboardReportsInventory({ firmId: 'firm-1' }, res)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('NO_FILE')
  })

  test('two files are refused before either is parsed, and both are removed', async () => {
    const paths = [tempFile(CIN7), tempFile(CIN7)]
    nextParse(null, { file: paths.map(p => ({ filepath: p })) })
    const res = makeRes()
    await dashboardReportsInventory({ firmId: 'firm-1' }, res)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('TOO_MANY_FILES')
    expect(res.body.error.message).toMatch(/one stock-on-hand export — 2 files/)
    for (const p of paths) { expect(await gone(p)).toBe(true) }
  })

  test('a file that is not a stock export is refused by the columns it lacks, with no path', async () => {
    const p = tempFile('Shopping list\nEggs,12')
    nextParse(null, { file: { filepath: p } })
    const res = makeRes()
    await dashboardReportsInventory({ firmId: 'firm-1' }, res)
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('UNRECOGNISED_INVENTORY')
    expect(res.body.error.message).not.toMatch(/tmp|Temp|\\/)
    expect(await gone(p)).toBe(true)
  })

  test('an export in another currency than the firm\'s is refused by name', async () => {
    const p = tempFile(UNLEASHED_AUD)
    nextParse(null, { file: { filepath: p } })
    const res = makeRes()
    await dashboardReportsInventory({ firmId: 'firm-1' }, res)
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('INVENTORY_CURRENCY_MISMATCH')
    expect(res.body.error.message).toMatch(/AUD.*NZD/)
  })

  test('an unreadable temp file gives the generic sentence, never the server path', async () => {
    nextParse(null, { file: { filepath: path.join(os.tmpdir(), 'does-not-exist-' + Date.now() + '.csv') } })
    const res = makeRes()
    await dashboardReportsInventory({ firmId: 'firm-1' }, res)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INTAKE_PARSE_FAILED')
    expect(res.body.error.message).toBe('The file could not be read as a stock-on-hand export.')
  })

  test('an oversized upload is 413 and any other multipart failure is 400', async () => {
    nextParse(new Error('options.maxFileSize (5242880 bytes) exceeded'), null)
    let res = makeRes()
    await dashboardReportsInventory({ firmId: 'firm-1' }, res)
    expect(res.status).toBe(413)
    expect(res.body.error.code).toBe('FILE_TOO_LARGE')

    nextParse(new Error('boundary missing'), null)
    res = makeRes()
    await dashboardReportsInventory({ firmId: 'firm-1' }, res)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('UPLOAD_PARSE_FAILED')
  })
})
