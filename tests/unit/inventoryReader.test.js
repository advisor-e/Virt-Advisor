'use strict'

/**
 * The inventory-export reader (item 4.70, stage 4) — Cin7 Core and Unleashed
 * stock-on-hand exports, built to Mike's target layouts of 2026-09-07.
 *
 * Both packages are `expected`, not `verified`: these fixtures are reconstructions of
 * the published layouts, and prove the reader copes with the shape as documented — never
 * that the shape is right. A real export is what moves either to 'verified'.
 */

const { INVENTORY_PACKAGES, readInventoryUpload, summariseInventory, UNGROUPED } = require('../../server/report/intake/inventoryReader')

const CIN7 = [
  'SKU,Product Name,Category,Brand,Barcode,Default Location,OnHand,Allocated,Available,OnOrder,Unit Cost,Total Value',
  'KB-100,Kettle Black,Kitchen,Acme,111,Auckland,100,20,80,50,12.50,1250',
  'KB-200,Kettle Red,Kitchen,Acme,112,Auckland,40,0,40,0,12.50,500',
  'PL-1,Plate Set,Dining,Acme,113,Christchurch,10,10,0,0,30,300',
  'GL-1,Glass,,Acme,114,,5,0,5,0,4,20'
].join('\n')

const UNLEASHED = currency => [
  'Product Code,Product Description,Group Name,Warehouse Code,Bin Location,Qty On Hand,Qty Allocated,Qty Available,Average Cost,Total Cost On Hand,Base Currency Code',
  'A1,Widget,Parts,WH1,B-01,200,50,150,2.5,500,' + currency,
  'A2,Gadget,Parts,WH2,B-02,100,0,100,3,300,' + currency,
  'B1,Gizmo,Tools,WH1,B-03,10,5,5,20,200,' + currency
].join('\n')

const read = text => readInventoryUpload(Buffer.from(text, 'utf8'))

describe('the packages list', () => {
  test('both packages are expected, never verified, until a real export is read', () => {
    expect(INVENTORY_PACKAGES.map(p => p.name)).toEqual(['Cin7 Core', 'Unleashed'])
    for (const p of INVENTORY_PACKAGES) {
      expect(p.confidence).toBe('expected')
      expect(p.evidence).toMatch(/No real export has been read/)
    }
  })
})

describe('reading a Cin7 Core export', () => {
  test('detects the package, the cost basis and the on-order column, and reads every line', () => {
    const r = read(CIN7)
    expect(r.package).toBe('Cin7 Core')
    expect(r.costBasis).toBe('unitCost')
    expect(r.hasOnOrder).toBe(true)
    expect(r.hasCurrency).toBe(false)
    expect(r.lines).toHaveLength(4)
    expect(r.lines[0]).toEqual({
      code: 'KB-100',
      name: 'Kettle Black',
      category: 'Kitchen',
      location: 'Auckland',
      onHand: 100,
      allocated: 20,
      available: 80,
      onOrder: 50,
      unitCost: 12.5,
      value: 1250,
      currency: null
    })
  })

  test('a blank category or location is grouped under one named label, never dropped', () => {
    const r = read(CIN7)
    expect(r.lines[3].category).toBe(UNGROUPED)
    expect(r.lines[3].location).toBe(UNGROUPED)
  })

  test('the header may sit under a title line or two, and its case and spacing do not matter', () => {
    const text = 'Stock On Hand Report\nAs at today\n' + CIN7.replace('Product Name', 'PRODUCT NAME').replace('OnHand', 'On Hand')
    const r = read(text)
    expect(r.package).toBe('Cin7 Core')
    expect(r.lines).toHaveLength(4)
  })

  test('blank rows and footer rows with no code and no name are skipped', () => {
    const r = read(CIN7 + '\n\n,,,,,,155,30,125,50,,2070\n')
    expect(r.lines).toHaveLength(4)
  })

  test('a line with no total value is rebuilt from units and cost; one with neither is unvalued, not zero', () => {
    const text = CIN7 + '\nX1,Rebuilt,Kitchen,Acme,1,Auckland,4,0,4,0,2.5,\nX2,Unvalued,Kitchen,Acme,2,Auckland,n/a,0,0,0,n/a,'
    const r = read(text)
    expect(r.lines[4].value).toBe(10)
    expect(r.lines[5].value).toBeNull()
    expect(r.lines[5].onHand).toBeNull()
  })
})

describe('reading an Unleashed export', () => {
  test('detects the package, the average-cost basis and the currency column; on-order is absent', () => {
    const r = read(UNLEASHED('NZD'))
    expect(r.package).toBe('Unleashed')
    expect(r.costBasis).toBe('averageCost')
    expect(r.hasOnOrder).toBe(false)
    expect(r.hasCurrency).toBe(true)
    expect(r.lines[0]).toEqual({
      code: 'A1',
      name: 'Widget',
      category: 'Parts',
      location: 'WH1',
      onHand: 200,
      allocated: 50,
      available: 150,
      onOrder: null,
      unitCost: 2.5,
      value: 500,
      currency: 'NZD'
    })
  })
})

describe('refusals, by the columns the file lacks', () => {
  test('a file nearest to Cin7 is refused naming Cin7 and the missing columns', () => {
    const text = 'SKU,Product Name,Category,OnHand,Allocated,Available\nA,B,C,1,0,1'
    expect(() => read(text)).toThrow(expect.objectContaining({ code: 'UNRECOGNISED_INVENTORY' }))
    expect(() => read(text)).toThrow(/nearest to Cin7 Core but has no Unit Cost, Total Value column/)
  })

  test('a file with none of the columns is refused naming both packages', () => {
    expect(() => read('Shopping list\nEggs,12')).toThrow(/stock-on-hand export from Cin7 Core or Unleashed.*Expected the column headings/)
  })

  test('an empty file is refused, not read as nothing', () => {
    expect(() => read('   \n')).toThrow(expect.objectContaining({ code: 'UNRECOGNISED_INVENTORY' }))
  })

  test('a header with no product lines under it is refused', () => {
    expect(() => read(CIN7.split('\n')[0] + '\n')).toThrow(/column headings but no product lines/)
  })

  test('the file readers\' own refusals pass through unchanged', () => {
    expect(() => readInventoryUpload(Buffer.from('%PDF-1.4 stock'))).toThrow(expect.objectContaining({ code: 'PDF_REJECTED' }))
  })
})

describe('summariseInventory — the totals the page prints', () => {
  test('Cin7: the file total, the units, categories and locations largest first with shares, and the currency assumed to be the firm\'s', () => {
    const s = summariseInventory(read(CIN7), 'nzd')
    expect(s.package).toBe('Cin7 Core')
    expect(s.confidence).toBe('expected')
    expect(s.costBasis).toBe('unitCost')
    expect(s.currency).toBe('NZD')
    expect(s.currencyAssumed).toBe(true)
    expect(s.lineCount).toBe(4)
    expect(s.linesWithoutValue).toBe(0)
    expect(s.totalValue).toBe(2070)
    expect(s.units).toEqual({ onHand: 155, allocated: 30, available: 125, onOrder: 50 })
    expect(s.allocatedShare).toBeCloseTo(30 / 155, 10)
    expect(s.categories.map(c => [c.name, c.value, c.lines])).toEqual([['Kitchen', 1750, 2], ['Dining', 300, 1], [UNGROUPED, 20, 1]])
    expect(s.categories[0].share).toBeCloseTo(1750 / 2070, 10)
    expect(s.categories[0]).toMatchObject({ onHand: 140, allocated: 20, available: 120 })
    expect(s.locations.map(l => [l.name, l.value])).toEqual([['Auckland', 1750], ['Christchurch', 300], [UNGROUPED, 20]])
  })

  test('Unleashed in the firm\'s currency: read as that currency, not assumed; on-order is null because the file has none', () => {
    const s = summariseInventory(read(UNLEASHED('NZD')), 'NZD')
    expect(s.currency).toBe('NZD')
    expect(s.currencyAssumed).toBe(false)
    expect(s.costBasis).toBe('averageCost')
    expect(s.totalValue).toBe(1000)
    expect(s.units.onOrder).toBeNull()
    expect(s.categories.map(c => c.name)).toEqual(['Parts', 'Tools'])
    expect(s.locations.map(l => [l.name, l.value])).toEqual([['WH1', 700], ['WH2', 300]])
  })

  test('Unleashed in another currency is refused by name, never summed as the firm\'s', () => {
    expect(() => summariseInventory(read(UNLEASHED('AUD')), 'NZD'))
      .toThrow(expect.objectContaining({ code: 'INVENTORY_CURRENCY_MISMATCH', message: expect.stringMatching(/is in AUD but the firm reports in NZD/) }))
  })

  test('Unleashed holding two currencies is refused naming both', () => {
    const mixed = UNLEASHED('NZD').replace('300,NZD', '300,USD')
    expect(() => summariseInventory(read(mixed), 'NZD'))
      .toThrow(expect.objectContaining({ code: 'INVENTORY_CURRENCY_MISMATCH', message: expect.stringMatching(/more than one currency \(NZD, USD\)/) }))
  })

  test('an Unleashed file whose currency cells are blank falls back to the firm\'s currency, assumed', () => {
    const blank = UNLEASHED('').replace(/,$/gm, ',')
    const s = summariseInventory(read(blank), 'GBP')
    expect(s.currency).toBe('GBP')
    expect(s.currencyAssumed).toBe(true)
  })

  test('unvalued lines are counted and left out of the total; nothing on hand gives no allocated share; equal values sort by name', () => {
    const text = [
      'SKU,Product Name,Category,Default Location,OnHand,Allocated,Available,Unit Cost,Total Value',
      'A,One,Zed,L,n/a,n/a,n/a,n/a,',
      'B,Two,Alpha,L,n/a,n/a,n/a,n/a,'
    ].join('\n')
    const s = summariseInventory(read(text), 'NZD')
    expect(s.linesWithoutValue).toBe(2)
    expect(s.totalValue).toBe(0)
    expect(s.allocatedShare).toBeNull()
    expect(s.units.onOrder).toBeNull()
    expect(s.categories.map(c => [c.name, c.share])).toEqual([['Alpha', null], ['Zed', null]])
  })
})
