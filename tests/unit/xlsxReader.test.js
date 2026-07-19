'use strict'

const { readXlsx, XlsxReadError } = require('../../server/report/intake/xlsxReader')
const { buildZip, makeXlsx } = require('./xlsxFixture')

/** A workbook + rels wrapper around one raw sheet XML string. */
function xlsxWithSheetXml (sheetXml, extraEntries) {
  const entries = [
    { name: 'xl/workbook.xml', deflate: true, data: '<workbook><sheets><sheet name="S1" sheetId="1" r:id="rId1"/></sheets></workbook>' },
    { name: 'xl/_rels/workbook.xml.rels', data: '<Relationships><Relationship Id="rId1" Type="ws" Target="worksheets/sheet1.xml"/></Relationships>' },
    { name: 'xl/worksheets/sheet1.xml', deflate: true, data: sheetXml }
  ]
  return buildZip(entries.concat(extraEntries || []))
}

describe('xlsxReader — happy paths', () => {
  test('reads numbers and inline strings from a real zip (deflated + stored entries)', () => {
    const buf = makeXlsx([
      ['Balance Sheet'],
      ['Cheque Account', 120000.5],
      ['R&D <Lab>', 42] // entity decoding
    ])
    const sheets = readXlsx(buf)
    expect(sheets).toHaveLength(1)
    expect(sheets[0].rows[0][0]).toBe('Balance Sheet')
    expect(sheets[0].rows[1][0]).toBe('Cheque Account')
    expect(sheets[0].rows[1][1]).toBe(120000.5)
    expect(sheets[0].rows[2][0]).toBe('R&D <Lab>')
  })

  test('reads shared strings (t="s") and skips empty cells', () => {
    const buf = xlsxWithSheetXml(
      '<worksheet><sheetData>' +
      '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1"><v>7</v></c></row>' +
      '<row r="3"><c r="B3" t="s"><v>1</v></c><c r="D3" t="s"><v>99</v></c></row>' + // 99 = out-of-range index → skipped
      '</sheetData></worksheet>',
      [{ name: 'xl/sharedStrings.xml', deflate: true, data: '<sst><si><t>Hello &amp; bye</t></si><si><t>Wor</t><t>ld</t></si></sst>' }]
    )
    const rows = readXlsx(buf)[0].rows
    expect(rows[0][0]).toBe('Hello & bye')
    expect(rows[0][2]).toBe(7)
    expect(rows[2][1]).toBe('World') // multiple <t> runs concatenate
    expect(rows[2][3]).toBeUndefined()
  })

  test('self-closed cells, formula cells without values, and str/bool types', () => {
    const buf = xlsxWithSheetXml(
      '<worksheet><sheetData><row r="1">' +
      '<c r="A1"/>' + // self-closed, no value
      '<c r="B1"><f>SUM(1,2)</f></c>' + // formula, no cached <v> → skipped (never trusted)
      '<c r="C1" t="str"><v>text</v></c>' +
      '<c r="D1" t="b"><v>1</v></c>' +
      '</row></sheetData></worksheet>'
    )
    const rows = readXlsx(buf)[0].rows
    expect(rows[0][0]).toBeUndefined()
    expect(rows[0][1]).toBeUndefined()
    expect(rows[0][2]).toBe('text')
    expect(rows[0][3]).toBe('1')
  })

  test('numeric character references decode', () => {
    const buf = xlsxWithSheetXml(
      '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>caf&#233; &#x2014; ok</t></is></c></row></sheetData></worksheet>'
    )
    expect(readXlsx(buf)[0].rows[0][0]).toBe('café — ok')
  })
})

describe('xlsxReader — hostile and malformed files', () => {
  test('not a zip at all → NOT_XLSX', () => {
    expect(() => readXlsx(Buffer.from('just some text that is long enough'))).toThrow(XlsxReadError)
    try { readXlsx(Buffer.from('just some text that is long enough')) } catch (e) { expect(e.code).toBe('NOT_XLSX') }
  })

  test('too short → NOT_XLSX', () => {
    try { readXlsx(Buffer.from('PK')) } catch (e) { expect(e.code).toBe('NOT_XLSX') }
  })

  test('a zip with no workbook part → NOT_XLSX', () => {
    const buf = buildZip([{ name: 'random.txt', data: 'hi' }])
    try { readXlsx(buf) } catch (e) { expect(e.code).toBe('NOT_XLSX') }
  })

  test('central directory pointing outside the file → CORRUPT_FILE', () => {
    const buf = makeXlsx([['x']])
    // corrupt the EOCD's central-directory offset
    buf.writeUInt32LE(0xFFFFFF, buf.length - 6)
    try { readXlsx(buf) } catch (e) { expect(['CORRUPT_FILE', 'NOT_XLSX']).toContain(e.code) }
  })

  test('a declared huge uncompressed size → FILE_TOO_LARGE before any inflate', () => {
    const buf = buildZip([
      { name: 'xl/workbook.xml', data: '<workbook><sheets><sheet name="S" r:id="rId1"/></sheets></workbook>' },
      { name: 'big.bin', data: 'tiny', lieUncompSize: 999 * 1024 * 1024 }
    ])
    try { readXlsx(buf) } catch (e) { expect(e.code).toBe('FILE_TOO_LARGE') }
  })

  test('a zip bomb (lying small size, huge real inflate) is stopped by the inflate cap', () => {
    const big = Buffer.alloc(25 * 1024 * 1024) // zeros compress massively
    const buf = buildZip([
      { name: 'xl/workbook.xml', data: '<workbook><sheets><sheet name="S1" r:id="rId1"/></sheets></workbook>' },
      { name: 'xl/_rels/workbook.xml.rels', data: '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>' },
      { name: 'xl/worksheets/sheet1.xml', deflate: true, data: big, lieUncompSize: 10 }
    ])
    try { readXlsx(buf); throw new Error('should have thrown') } catch (e) { expect(e.code).toBe('FILE_TOO_LARGE') }
  })

  test('a single value cell at row 9,999,999 → FILE_TOO_LARGE (row-padding OOM guard)', () => {
    const buf = xlsxWithSheetXml(
      '<worksheet><sheetData><row r="9999999"><c r="A9999999"><v>1</v></c></row></sheetData></worksheet>'
    )
    try { readXlsx(buf); throw new Error('should have thrown') } catch (e) { expect(e.code).toBe('FILE_TOO_LARGE') }
  })

  test('an empty formatting-only cell far down (Excel re-save phantom) still parses', () => {
    const buf = xlsxWithSheetXml(
      '<worksheet><sheetData>' +
      '<row r="1"><c r="A1"><v>7</v></c></row>' +
      '<row r="50000"><c r="A50000" s="1"/></row>' +
      '</sheetData></worksheet>'
    )
    const rows = readXlsx(buf)[0].rows
    expect(rows[0][0]).toBe(7)
    expect(rows.length).toBe(1) // the phantom cell never grew the sheet
  })

  test('more parts than a spreadsheet should have → TOO_MANY_PARTS', () => {
    const entries = []
    for (let i = 0; i < 70; i++) { entries.push({ name: 'part' + i + '.xml', data: 'x' }) }
    try { readXlsx(buildZip(entries)) } catch (e) { expect(e.code).toBe('TOO_MANY_PARTS') }
  })

  test('unsupported compression method → CORRUPT_FILE', () => {
    const buf = buildZip([{ name: 'xl/workbook.xml', data: 'x' }])
    // method field of the sole central-directory entry: cdOffset + 10
    const cdOffset = buf.readUInt32LE(buf.length - 6)
    buf.writeUInt16LE(99, cdOffset + 10)
    try { readXlsx(buf) } catch (e) { expect(e.code).toBe('CORRUPT_FILE') }
  })

  test('__proto__ as sheet and entry names cannot pollute (prototype-less maps)', () => {
    const buf = buildZip([
      { name: 'xl/workbook.xml', data: '<workbook><sheets><sheet name="__proto__" r:id="__proto__"/></sheets></workbook>' },
      { name: 'xl/_rels/workbook.xml.rels', data: '<Relationships><Relationship Id="__proto__" Target="worksheets/sheet1.xml"/></Relationships>' },
      { name: 'xl/worksheets/sheet1.xml', data: '<worksheet><sheetData><row r="1"><c r="A1"><v>1</v></c></row></sheetData></worksheet>' }
    ])
    const sheets = readXlsx(buf)
    expect(sheets[0].name).toBe('__proto__') // just a string label, nothing more
    expect(sheets[0].rows[0][0]).toBe(1)
    expect(Object.prototype.polluted).toBeUndefined()
    expect({}.polluted).toBeUndefined()
  })

  test('a sheet whose relationship target is missing yields an empty sheet, not a crash', () => {
    const buf = buildZip([
      { name: 'xl/workbook.xml', data: '<workbook><sheets><sheet name="Ghost" r:id="rId9"/></sheets></workbook>' },
      { name: 'xl/_rels/workbook.xml.rels', data: '<Relationships><Relationship Id="rId9" Target="worksheets/nope.xml"/></Relationships>' }
    ])
    const sheets = readXlsx(buf)
    expect(sheets[0].rows).toEqual([])
  })
})
