'use strict'

/**
 * Minimal .xlsx cell reader — zero dependencies, built on Node's own zlib.
 *
 * WHY THIS EXISTS (owner ruling 2026-07-16, plan decision log): the npm `xlsx`
 * library's newest registry version (0.18.5) carries CVE-2023-30533 — high-severity
 * prototype pollution triggered by READING crafted files, which is exactly what this
 * intake does with advisor uploads — and no fixed version exists on npm. Rather than
 * ship a known-vulnerable parser into the upload path, this reader implements the
 * small subset of the format the intake needs: cell values (strings + numbers) from
 * each worksheet. No formulas, no styles, no writing.
 *
 * An .xlsx is a ZIP of XML parts. This file reads the ZIP central directory with
 * bounds-checking, inflates only the parts it needs under hard size caps, and
 * extracts cells with linear scans (index-based, not backtracking-prone regex).
 *
 * Untrusted-input hardening:
 *  - every offset is bounds-checked; anything out of range → CORRUPT_FILE
 *  - per-entry and total inflate caps (zip-bomb guard) via zlib maxOutputLength
 *  - entry-count and sheet-count caps
 *  - all keyed lookups use prototype-less objects (Object.create(null))
 *
 * Processes untrusted input → tested to the 100% bar (see xlsxReader.test.js).
 */

const zlib = require('zlib')

const MAX_ENTRIES = 64 // a Xero export has ~10 parts
const MAX_INFLATED_PER_ENTRY = 20 * 1024 * 1024
const MAX_INFLATED_TOTAL = 40 * 1024 * 1024
const MAX_SHEETS = 16
const MAX_CELLS_PER_SHEET = 200000

/** Error with a stable machine code; the route maps it to a safe client message. */
class XlsxReadError extends Error {
  /** @param {string} code @param {string} message */
  constructor (code, message) {
    super(message)
    this.name = 'XlsxReadError'
    this.code = code
  }
}

/** @param {Buffer} buf @param {number} offset @param {number} length */
function assertRange (buf, offset, length) {
  if (offset < 0 || length < 0 || offset + length > buf.length) {
    throw new XlsxReadError('CORRUPT_FILE', 'ZIP structure points outside the file')
  }
}

/**
 * Parse the ZIP central directory into { name → entry } (prototype-less).
 * @param {Buffer} buf
 * @returns {Object<string,{method:number, compSize:number, uncompSize:number, localOffset:number}>}
 */
function readCentralDirectory (buf) {
  // End-of-central-directory record: signature 0x06054b50, within the last 64KB+22.
  const scanFrom = Math.max(0, buf.length - 65557)
  let eocd = -1
  for (let i = buf.length - 22; i >= scanFrom; i--) {
    if (buf.readUInt32LE(i) === 0x06054B50) { eocd = i; break }
  }
  if (eocd < 0) { throw new XlsxReadError('NOT_XLSX', 'No ZIP directory found — not a valid .xlsx file') }

  const count = buf.readUInt16LE(eocd + 10)
  const cdOffset = buf.readUInt32LE(eocd + 16)
  if (count > MAX_ENTRIES) { throw new XlsxReadError('TOO_MANY_PARTS', 'File contains more parts than a spreadsheet export should') }

  const entries = Object.create(null)
  let p = cdOffset
  for (let n = 0; n < count; n++) {
    assertRange(buf, p, 46)
    if (buf.readUInt32LE(p) !== 0x02014B50) { throw new XlsxReadError('CORRUPT_FILE', 'Central directory entry is malformed') }
    const method = buf.readUInt16LE(p + 10)
    const compSize = buf.readUInt32LE(p + 20)
    const uncompSize = buf.readUInt32LE(p + 24)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    const localOffset = buf.readUInt32LE(p + 42)
    assertRange(buf, p + 46, nameLen)
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen)
    if (uncompSize > MAX_INFLATED_PER_ENTRY) { throw new XlsxReadError('FILE_TOO_LARGE', 'A part of this file is unreasonably large for a spreadsheet export') }
    entries[name] = { method, compSize, uncompSize, localOffset }
    p += 46 + nameLen + extraLen + commentLen
  }
  return entries
}

/**
 * Extract one ZIP entry's bytes (stored or deflated), under the inflate caps.
 * @param {Buffer} buf @param {{method:number, compSize:number, localOffset:number}} entry
 * @param {{total:number}} budget - running total-inflated counter (mutated).
 * @returns {Buffer}
 */
function readEntry (buf, entry, budget) {
  const lo = entry.localOffset
  assertRange(buf, lo, 30)
  if (buf.readUInt32LE(lo) !== 0x04034B50) { throw new XlsxReadError('CORRUPT_FILE', 'Local file header is malformed') }
  const nameLen = buf.readUInt16LE(lo + 26)
  const extraLen = buf.readUInt16LE(lo + 28)
  const dataStart = lo + 30 + nameLen + extraLen
  assertRange(buf, dataStart, entry.compSize)
  const raw = buf.slice(dataStart, dataStart + entry.compSize)

  let out
  if (entry.method === 0) {
    out = raw
  } else if (entry.method === 8) {
    try {
      out = zlib.inflateRawSync(raw, { maxOutputLength: MAX_INFLATED_PER_ENTRY })
    } catch (err) {
      // Node signals a tripped maxOutputLength as ERR_BUFFER_TOO_LARGE
      const tooBig = err && (err.code === 'ERR_BUFFER_TOO_LARGE' || /maxOutputLength|larger than/i.test(err.message || ''))
      throw new XlsxReadError(tooBig ? 'FILE_TOO_LARGE' : 'CORRUPT_FILE',
        tooBig ? 'A part of this file decompresses far larger than any spreadsheet export' : 'A part of this file is corrupt')
    }
  } else {
    throw new XlsxReadError('CORRUPT_FILE', 'Unsupported compression method inside the file')
  }
  budget.total += out.length
  if (budget.total > MAX_INFLATED_TOTAL) { throw new XlsxReadError('FILE_TOO_LARGE', 'The file decompresses far larger than any spreadsheet export') }
  return out
}

/** Decode the five XML entities plus numeric character references. @param {string} s */
function decodeXml (s) {
  if (!s.includes('&')) { return s }
  return s
    .replace(/&#x([0-9a-fA-F]{1,6});/g, (m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d{1,7});/g, (m, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, '&')
}

/**
 * Collect the text of every <t> run between two indices of an XML string.
 * Index-based scan — no backtracking regex over attacker-controlled input.
 * @param {string} xml @param {number} from @param {number} to @returns {string}
 */
function textRuns (xml, from, to) {
  let out = ''
  let i = from
  while (i < to) {
    const open = xml.indexOf('<t', i)
    if (open === -1 || open >= to) { break }
    const afterTag = xml.charAt(open + 2)
    if (afterTag !== '>' && afterTag !== ' ' && afterTag !== '/') { i = open + 2; continue } // <table etc.
    const gt = xml.indexOf('>', open)
    if (gt === -1 || gt >= to) { break }
    if (xml.charAt(gt - 1) === '/') { i = gt + 1; continue } // self-closed <t/>
    const close = xml.indexOf('</t>', gt)
    if (close === -1 || close > to) { break }
    out += decodeXml(xml.slice(gt + 1, close))
    i = close + 4
  }
  return out
}

/** Parse xl/sharedStrings.xml into an array of strings. @param {string} xml */
function parseSharedStrings (xml) {
  const out = []
  let i = 0
  for (;;) {
    const open = xml.indexOf('<si>', i)
    const openAttr = xml.indexOf('<si ', i)
    const start = (open === -1) ? openAttr : (openAttr === -1 ? open : Math.min(open, openAttr))
    if (start === -1) { break }
    const gt = xml.indexOf('>', start)
    const close = xml.indexOf('</si>', gt)
    if (gt === -1 || close === -1) { break }
    out.push(textRuns(xml, gt + 1, close))
    i = close + 5
  }
  return out
}

/** Read one attribute value from a tag string. @param {string} tag @param {string} name */
function attr (tag, name) {
  const at = tag.indexOf(name + '="')
  if (at === -1) { return null }
  const start = at + name.length + 2
  const end = tag.indexOf('"', start)
  return end === -1 ? null : decodeXml(tag.slice(start, end))
}

/** Convert a column letter run ("A", "AB") to a 0-based index. @param {string} letters */
function colIndex (letters) {
  let n = 0
  for (let i = 0; i < letters.length; i++) { n = n * 26 + (letters.charCodeAt(i) - 64) }
  return n - 1
}

/**
 * Parse one worksheet XML into a dense row grid of cell values.
 * @param {string} xml @param {string[]} shared
 * @returns {Array<Array<string|number|null>>}
 */
function parseSheet (xml, shared) {
  const rows = []
  let cells = 0
  let i = 0
  for (;;) {
    const open = xml.indexOf('<c ', i)
    if (open === -1) { break }
    const gt = xml.indexOf('>', open)
    if (gt === -1) { break }
    const tag = xml.slice(open, gt + 1)
    const selfClosed = xml.charAt(gt - 1) === '/'
    let bodyEnd = gt + 1
    let body = ''
    if (!selfClosed) {
      const close = xml.indexOf('</c>', gt)
      if (close === -1) { break }
      body = xml.slice(gt + 1, close)
      bodyEnd = close + 4
    }
    i = bodyEnd

    const ref = attr(tag, 'r')
    if (!ref) { continue }
    const m = /^([A-Z]{1,3})(\d{1,7})$/.exec(ref)
    if (!m) { continue }
    const col = colIndex(m[1])
    const row = parseInt(m[2], 10) - 1
    if (row < 0 || col < 0 || col > 255) { continue }

    let value = null
    const type = attr(tag, 't')
    if (type === 'inlineStr') {
      value = textRuns(body, 0, body.length)
    } else {
      const vOpen = body.indexOf('<v')
      if (vOpen !== -1) {
        const vGt = body.indexOf('>', vOpen)
        const vClose = body.indexOf('</v>', vGt)
        if (vGt !== -1 && vClose !== -1) {
          const rawVal = decodeXml(body.slice(vGt + 1, vClose))
          if (type === 's') {
            const idx = parseInt(rawVal, 10)
            value = (idx >= 0 && idx < shared.length) ? shared[idx] : null
          } else if (type === 'str' || type === 'b' || type === 'e') {
            value = rawVal
          } else {
            const n = parseFloat(rawVal)
            value = Number.isFinite(n) ? n : rawVal
          }
        }
      }
    }
    if (value === null || value === '') { continue }

    if (++cells > MAX_CELLS_PER_SHEET) { throw new XlsxReadError('FILE_TOO_LARGE', 'The sheet holds more cells than any report export') }
    while (rows.length <= row) { rows.push([]) }
    rows[row][col] = value
  }
  return rows
}

/**
 * Read every worksheet's cells from an .xlsx buffer.
 * @param {Buffer} buf - the uploaded file.
 * @returns {Array<{name:string, rows:Array<Array<string|number|null>>}>} sheets in workbook order.
 * @throws {XlsxReadError} NOT_XLSX | CORRUPT_FILE | FILE_TOO_LARGE | TOO_MANY_PARTS
 */
function readXlsx (buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 22) { throw new XlsxReadError('NOT_XLSX', 'Not a valid .xlsx file') }
  if (buf.readUInt32LE(0) !== 0x04034B50) { throw new XlsxReadError('NOT_XLSX', 'Not a valid .xlsx file') }

  const entries = readCentralDirectory(buf)
  const budget = { total: 0 }
  const part = name => entries[name] ? readEntry(buf, entries[name], budget).toString('utf8') : null

  const workbookXml = part('xl/workbook.xml')
  if (!workbookXml) { throw new XlsxReadError('NOT_XLSX', 'The file has no workbook — not a spreadsheet export') }

  // rId → target path, from the workbook relationships part
  const relsXml = part('xl/_rels/workbook.xml.rels') || ''
  const relTargets = Object.create(null)
  const relRe = /<Relationship\s[^>]*\/?>/g
  let rm
  while ((rm = relRe.exec(relsXml)) !== null) {
    const id = attr(rm[0], 'Id')
    let target = attr(rm[0], 'Target')
    if (!id || !target) { continue }
    if (target.charAt(0) === '/') { target = target.slice(1) } else if (target.indexOf('xl/') !== 0) { target = 'xl/' + target }
    relTargets[id] = target
  }

  const sharedXml = part('xl/sharedStrings.xml')
  const shared = sharedXml ? parseSharedStrings(sharedXml) : []

  const sheets = []
  const sheetRe = /<sheet\s[^>]*\/?>/g
  let sm
  while ((sm = sheetRe.exec(workbookXml)) !== null) {
    if (sheets.length >= MAX_SHEETS) { break }
    const name = attr(sm[0], 'name') || ('Sheet' + (sheets.length + 1))
    const rid = attr(sm[0], 'r:id')
    const target = (rid && relTargets[rid]) || ('xl/worksheets/sheet' + (sheets.length + 1) + '.xml')
    const sheetXml = part(target)
    sheets.push({ name, rows: sheetXml ? parseSheet(sheetXml, shared) : [] })
  }
  if (!sheets.length) { throw new XlsxReadError('NOT_XLSX', 'The workbook lists no sheets') }
  return sheets
}

module.exports = { readXlsx, XlsxReadError }
