'use strict'

/**
 * Test fixture builder: constructs real, minimal .xlsx buffers (a ZIP of XML parts)
 * so the intake readers are tested against genuine file bytes, not mocks.
 * Not a test file itself (no `.test.` suffix — outside jest's testMatch).
 */

const zlib = require('zlib')

/**
 * Build a ZIP buffer from entries. Stored (method 0) by default; `deflate: true`
 * compresses with method 8. `lieUncompSize` lets hostile-file tests declare a
 * false uncompressed size in the central directory.
 * @param {Array<{name:string, data:string|Buffer, deflate?:boolean, lieUncompSize?:number}>} entries
 * @returns {Buffer}
 */
function buildZip (entries) {
  const locals = []
  const centrals = []
  let offset = 0
  for (const e of entries) {
    const raw = Buffer.isBuffer(e.data) ? e.data : Buffer.from(String(e.data), 'utf8')
    const stored = e.deflate ? zlib.deflateRawSync(raw) : raw
    const method = e.deflate ? 8 : 0
    const name = Buffer.from(e.name, 'utf8')
    const uncomp = (e.lieUncompSize !== undefined) ? e.lieUncompSize : raw.length

    const local = Buffer.alloc(30 + name.length)
    local.writeUInt32LE(0x04034B50, 0)
    local.writeUInt16LE(20, 4) // version needed
    local.writeUInt16LE(0, 6) // flags
    local.writeUInt16LE(method, 8)
    local.writeUInt32LE(0, 10) // time+date
    local.writeUInt32LE(0, 14) // crc (reader does not verify)
    local.writeUInt32LE(stored.length, 18)
    local.writeUInt32LE(uncomp, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)
    name.copy(local, 30)
    locals.push(local, stored)

    const central = Buffer.alloc(46 + name.length)
    central.writeUInt32LE(0x02014B50, 0)
    central.writeUInt16LE(20, 4) // version made by
    central.writeUInt16LE(20, 6) // version needed
    central.writeUInt16LE(0, 8) // flags
    central.writeUInt16LE(method, 10)
    central.writeUInt32LE(0, 12) // time+date
    central.writeUInt32LE(0, 16) // crc
    central.writeUInt32LE(stored.length, 20)
    central.writeUInt32LE(uncomp, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt16LE(0, 30) // extra
    central.writeUInt16LE(0, 32) // comment
    central.writeUInt16LE(0, 34) // disk start
    central.writeUInt16LE(0, 36) // internal attrs
    central.writeUInt32LE(0, 38) // external attrs
    central.writeUInt32LE(offset, 42)
    name.copy(central, 46)
    centrals.push(central)

    offset += local.length + stored.length
  }

  const cd = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054B50, 0)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(cd.length, 12)
  eocd.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, cd, eocd])
}

/** XML-escape a string for the fixture parts. @param {string} s */
function esc (s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Column index (0-based) to letters. @param {number} n */
function colLetters (n) {
  let s = ''
  n += 1
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26) }
  return s
}

/**
 * Turn a grid (array of row arrays of string|number) into worksheet XML using
 * inline strings, so no sharedStrings part is needed.
 * @param {Array<Array<string|number|null>>} grid
 */
function gridToSheetXml (grid) {
  let body = ''
  grid.forEach((row, r) => {
    if (!row) { return }
    let cells = ''
    row.forEach((val, c) => {
      if (val === null || val === undefined || val === '') { return }
      const ref = colLetters(c) + (r + 1)
      if (typeof val === 'number') {
        cells += '<c r="' + ref + '"><v>' + val + '</v></c>'
      } else {
        cells += '<c r="' + ref + '" t="inlineStr"><is><t>' + esc(val) + '</t></is></c>'
      }
    })
    if (cells) { body += '<row r="' + (r + 1) + '">' + cells + '</row>' }
  })
  return '<?xml version="1.0"?><worksheet><sheetData>' + body + '</sheetData></worksheet>'
}

/**
 * Build a complete one-sheet .xlsx buffer from a grid (deflated entries, like real files).
 * @param {Array<Array<string|number|null>>} grid @param {string} [sheetName]
 */
function makeXlsx (grid, sheetName) {
  return buildZip([
    {
      name: 'xl/workbook.xml',
      deflate: true,
      data: '<?xml version="1.0"?><workbook><sheets><sheet name="' + esc(sheetName || 'Sheet1') + '" sheetId="1" r:id="rId1"/></sheets></workbook>'
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      deflate: true,
      data: '<?xml version="1.0"?><Relationships><Relationship Id="rId1" Type="ws" Target="worksheets/sheet1.xml"/></Relationships>'
    },
    { name: 'xl/worksheets/sheet1.xml', deflate: true, data: gridToSheetXml(grid) }
  ])
}

module.exports = { buildZip, makeXlsx, gridToSheetXml }
