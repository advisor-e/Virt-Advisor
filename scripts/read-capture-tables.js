/**
 * Read the capture tables out of Mike's own fill-in templates.
 *
 * WHY THIS EXISTS. The decks teach and then POINT at a table — the table itself
 * lives in a separate workbook (`design/PLANNING-TEMPLATE-CENSUS.md` §4 finding 2).
 * Those workbooks are the only authority for what an advisor actually fills in, so
 * the app reads them rather than being told about them. Nothing here is authored:
 * every string written to the output file is copied from one of Mike's documents.
 *
 * 🔴 IT EMITS THE GRID, NOT THE FIELDS. Turning a grid into capture fields is a
 * judgement that differs per form — a prompt-answer sheet's first column is
 * structural, a banded grid's second row is one of Mike's worked examples. That
 * judgement lives in `server/utils/strategyCaptureForms.js` where it can be read
 * and corrected. This script only says, faithfully, what is on the page.
 *
 * A .docx, .xlsx and .pptx are all ZIP files holding XML, so this needs no
 * dependency: Node's own `zlib` inflates the entries. That matters under the Stack
 * Constitution — a parser for three Office formats would otherwise be three
 * packages, each with its own Node-engine range to reconcile.
 *
 * Usage:  node scripts/read-capture-tables.js [--check]
 *   --check  re-reads the templates and fails if the committed file has drifted,
 *            without writing anything. This is what the test uses.
 */

'use strict'

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const SOURCE_DIR = path.join(__dirname, '..', 'design', 'planning-templates', 'fill-in-tables')
const OUT_FILE = path.join(__dirname, '..', 'data', 'strategy-capture-tables.json')

/** Spreadsheet calculators, not capture tables — census §3 excludes both by name. */
const NOT_CAPTURE_TABLES = ['BD stages.xlsx', 'BO Expectations.xlsx']

// ---------------------------------------------------------------------------
// ZIP
// ---------------------------------------------------------------------------

/**
 * Read a ZIP container into { entryName: Buffer }.
 *
 * Only the two storage methods Office actually writes are handled — stored (0)
 * and deflate (8). Anything else throws rather than returning half a document.
 *
 * @param {string} file  path to a .docx / .xlsx / .pptx
 * @returns {Object<string, Buffer>}
 */
function readZip (file) {
  const buf = fs.readFileSync(file)

  // The end-of-central-directory record is last, after a comment of unknown
  // length, so it is found by scanning back for its signature.
  let eocd = -1
  const floor = Math.max(0, buf.length - 66000)
  for (let i = buf.length - 22; i >= floor; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) { throw new Error('Not a ZIP container: ' + file) }

  const count = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)
  const out = {}

  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) { break }
    const method = buf.readUInt16LE(p + 10)
    const compSize = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    const localOff = buf.readUInt32LE(p + 42)
    const name = buf.slice(p + 46, p + 46 + nameLen).toString('utf8')

    // The local header repeats the name and extra fields at its own lengths,
    // which are NOT always the central directory's — reading the central copy's
    // lengths here is the classic way to land a few bytes into the data.
    const lNameLen = buf.readUInt16LE(localOff + 26)
    const lExtraLen = buf.readUInt16LE(localOff + 28)
    const start = localOff + 30 + lNameLen + lExtraLen
    const raw = buf.slice(start, start + compSize)

    if (method === 0) { out[name] = raw } else if (method === 8) { out[name] = zlib.inflateRawSync(raw) } else { throw new Error('Unsupported ZIP method ' + method + ' in ' + file) }

    p += 46 + nameLen + extraLen + commentLen
  }
  return out
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

/**
 * The visible text of an XML fragment, from its text nodes in document order.
 *
 * Ligatures and non-breaking spaces are normalised to ASCII and nothing else is
 * altered — the same rule the concept index is held to, so a label read here is
 * character-for-character what an advisor sees on the page.
 *
 * @param {string} xml
 * @param {string} tag  the text element: 'w:t' for Word, 'a:t' for PowerPoint
 * @returns {string}
 */
function textOf (xml, tag) {
  const parts = []
  const re = new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + tag + '>', 'g')
  let m
  while ((m = re.exec(xml))) { parts.push(m[1]) }
  return parts.join('')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, e) => ENTITIES[e])
    .replace(/ /g, ' ')
    .replace(//g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Is this cell a blank line waiting to be written on, rather than words?
 *
 * Mike numbers his blank lines — `1,` `2,` `11` in Porter's, `a` `b` `c` in
 * People vs Process. They look like content to a text reader and are not: they
 * are the ruled lines of the form.
 *
 * @param {string} text
 * @returns {boolean}
 */
function isBlankLine (text) {
  if (!text) { return true }
  return /^\d{1,3}[,.)]?$/.test(text) || /^[a-z][,.)]?$/i.test(text)
}

// ---------------------------------------------------------------------------
// The three formats
// ---------------------------------------------------------------------------

/**
 * Word tables.
 * @param {Object<string, Buffer>} zip
 * @returns {string[][][]}  tables → rows → cells
 */
function docxTables (zip) {
  const xml = zip['word/document.xml'].toString('utf8')
  const tables = []
  const tblRe = /<w:tbl>([\s\S]*?)<\/w:tbl>/g
  let t
  while ((t = tblRe.exec(xml))) {
    const rows = []
    const rowRe = /<w:tr[\s>][\s\S]*?<\/w:tr>/g
    let r
    while ((r = rowRe.exec(t[1]))) {
      const cells = []
      const cellRe = /<w:tc>([\s\S]*?)<\/w:tc>/g
      let c
      while ((c = cellRe.exec(r[0]))) { cells.push(textOf(c[1], 'w:t')) }
      rows.push(cells)
    }
    tables.push(rows)
  }
  return tables
}

/**
 * PowerPoint tables, across every slide in slide-number order.
 * @param {Object<string, Buffer>} zip
 * @returns {string[][][]}
 */
function pptxTables (zip) {
  const slides = Object.keys(zip)
    .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/(\d+)/)[1]) - Number(b.match(/(\d+)/)[1]))

  const tables = []
  slides.forEach((name) => {
    const xml = zip[name].toString('utf8')
    const tblRe = /<a:tbl>([\s\S]*?)<\/a:tbl>/g
    let t
    while ((t = tblRe.exec(xml))) {
      const rows = []
      const rowRe = /<a:tr[\s>][\s\S]*?<\/a:tr>/g
      let r
      while ((r = rowRe.exec(t[1]))) {
        const cells = []
        const cellRe = /<a:tc[\s>]([\s\S]*?)<\/a:tc>/g
        let c
        while ((c = cellRe.exec(r[0]))) { cells.push(textOf(c[1], 'a:t')) }
        rows.push(cells)
      }
      tables.push(rows)
    }
  })
  return tables
}

/**
 * Excel sheets — the FIRST usable one only, which is the form.
 *
 * 🔴 A WORKBOOK IS NOT A WORD DOCUMENT. Every table in a .docx belongs to the one
 * form, continuation tables included, so `docxTables` returns them all. A
 * workbook's later sheets are working area: the Org Chart's second sheet is its
 * first sheet transposed into a chart layout, and read as a form it adds 1,126
 * fields that nobody types into.
 *
 * Trailing empty rows and columns are trimmed: a spreadsheet's used range runs
 * to wherever the cursor has been, and those cells are not part of the form.
 *
 * @param {Object<string, Buffer>} zip
 * @returns {string[][][]}
 */
function xlsxTables (zip) {
  const shared = []
  if (zip['xl/sharedStrings.xml']) {
    const sx = zip['xl/sharedStrings.xml'].toString('utf8')
    const siRe = /<si>([\s\S]*?)<\/si>/g
    let s
    while ((s = siRe.exec(sx))) { shared.push(textOf(s[1], 't')) }
  }

  const sheets = Object.keys(zip)
    .filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/(\d+)/)[1]) - Number(b.match(/(\d+)/)[1]))

  const tables = []
  sheets.forEach((name) => {
    const xml = zip[name].toString('utf8')
    const grid = []
    const rowRe = /<row[\s>][\s\S]*?<\/row>/g
    let r
    while ((r = rowRe.exec(xml))) {
      const cells = []
      const cellRe = /<c\s([^>]*)>([\s\S]*?)<\/c>|<c\s([^>]*)\/>/g
      let c
      while ((c = cellRe.exec(r[0]))) {
        const attrs = c[1] || c[3] || ''
        const body = c[2] || ''
        const ref = (attrs.match(/r="([A-Z]+)\d+"/) || [])[1]
        const type = (attrs.match(/t="([^"]+)"/) || [])[1]
        let text = ''
        if (type === 's') {
          const idx = Number(textOf('<t>' + (body.match(/<v>([\s\S]*?)<\/v>/) || [, ''])[1] + '</t>', 't'))
          text = shared[idx] || ''
        } else if (type === 'inlineStr') {
          text = textOf(body, 't')
        } else {
          text = textOf('<t>' + (body.match(/<v>([\s\S]*?)<\/v>/) || [, ''])[1] + '</t>', 't')
        }
        // Column letters place the cell, so a sparse row keeps its shape.
        const col = colIndex(ref)
        while (cells.length < col) { cells.push('') }
        cells.push(text)
      }
      grid.push(cells)
    }
    const trimmed = trimGrid(grid)
    if (!tables.length && !isMachinery(trimmed)) { tables.push(trimmed) }
  })
  return tables
}

/**
 * 'A' → 0, 'B' → 1, 'AA' → 26.
 * @param {string} [ref]
 * @returns {number}
 */
function colIndex (ref) {
  if (!ref) { return 0 }
  let n = 0
  for (let i = 0; i < ref.length; i++) { n = n * 26 + (ref.charCodeAt(i) - 64) }
  return n - 1
}

/**
 * Drop empty rows, and every column that is empty top to bottom.
 *
 * Interior columns go as well as the edges: a spreadsheet form uses a narrow
 * empty column as a gutter between blocks, and a gutter is not a field.
 *
 * @param {string[][]} grid
 * @returns {string[][]}
 */
function trimGrid (grid) {
  const rows = grid.filter(r => r.some(c => (c || '').length))
  if (!rows.length) { return [] }
  const width = rows.reduce((w, r) => Math.max(w, r.length), 0)

  const keep = []
  for (let c = 0; c < width; c++) {
    if (rows.some(r => (r[c] || '').length)) { keep.push(c) }
  }
  return rows.map(r => keep.map(c => r[c] || ''))
}

/**
 * A worksheet that draws the form rather than being it.
 *
 * The Org Chart workbook has three sheets: the role/reporting list an advisor
 * fills in, and two behind it that lay that list out as a chart. The second two
 * are wall-to-wall `#REF!` and `{{Org.chrt.7}}` merge tokens. Read as a form they
 * produce two thousand fields; they are machinery and they are skipped.
 *
 * @param {string[][]} grid
 * @returns {boolean}
 */
function isMachinery (grid) {
  const filled = []
  grid.forEach(r => r.forEach((c) => { if (c) { filled.push(c) } }))
  if (!filled.length) { return true }
  const noise = filled.filter(c => /^#(REF|VALUE|NAME|DIV\/0|N\/A)/i.test(c) || /^\{\{.*\}\}$/.test(c))
  return (noise.length / filled.length) > 0.2
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

/**
 * Read one template into its grids.
 * @param {string} file  file name within SOURCE_DIR
 * @returns {{file: string, format: string, tables: Array}}
 */
function readTemplate (file) {
  const full = path.join(SOURCE_DIR, file)
  const zip = readZip(full)
  const ext = path.extname(file).toLowerCase()

  let raw
  if (ext === '.docx') { raw = docxTables(zip) } else if (ext === '.pptx') { raw = pptxTables(zip) } else if (ext === '.xlsx') { raw = xlsxTables(zip) } else { throw new Error('Unknown template format: ' + file) }

  const tables = raw
    .map(rows => ({
      columns: rows.reduce((w, r) => Math.max(w, r.length), 0),
      rows: rows.map(cells => ({
        // `blank: true` marks a cell that is a ruled line, not words. It is the
        // one piece of interpretation here, and it is reversible: `text` always
        // carries what the document says, marker and all.
        cells: cells.map(text => (isBlankLine(text) ? { text, blank: true } : { text }))
      }))
    }))
    .filter(t => t.rows.length > 0 && t.columns > 0)

  return { file, format: ext.slice(1), tables }
}

/**
 * Read every capture template in the source folder.
 * @returns {object} the shape written to data/strategy-capture-tables.json
 */
function build () {
  const files = fs.readdirSync(SOURCE_DIR)
    .filter(f => /\.(docx|xlsx|pptx)$/i.test(f))
    .filter(f => NOT_CAPTURE_TABLES.indexOf(f) === -1)
    .sort()

  const templates = {}
  files.forEach((f) => {
    // The template's name is its file name without the extension, which is how
    // `captureTemplate` in data/strategy-frameworks.json already refers to it.
    const name = f.replace(/\.(docx|xlsx|pptx)$/i, '')
    templates[name] = readTemplate(f)
  })

  return {
    _readme: [
      'GENERATED — do not edit. `npm run capture-tables` rewrites this file from',
      "Mike's own fill-in templates in design/planning-templates/fill-in-tables/.",
      '',
      'Every string here is copied from one of those documents. Nothing is authored,',
      'summarised or rephrased, because these are the tables a client fills in.',
      '',
      'A cell marked `blank: true` is a ruled line rather than words — Mike numbers',
      'his blank lines (1, 2, 11 in Porter\'s; a, b, c in People vs Process) and a',
      'reader that takes those for content fills the form with digits.',
      '',
      'This file is the GRID as the document draws it. Which cells become capture',
      'fields is decided in server/utils/strategyCaptureForms.js, per capture form.'
    ],
    generatedFrom: 'design/planning-templates/fill-in-tables',
    templateCount: Object.keys(templates).length,
    templates
  }
}

/**
 * Stable JSON, so a re-run with no change to the templates is a no-op diff.
 * @param {object} data
 * @returns {string}
 */
function serialise (data) {
  return JSON.stringify(data, null, 2) + '\n'
}

function main () {
  const check = process.argv.indexOf('--check') !== -1
  const next = serialise(build())

  if (check) {
    const current = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, 'utf8') : ''
    if (current !== next) {
      console.error('data/strategy-capture-tables.json is out of date.')
      console.error('Run `npm run capture-tables` — the templates have changed.')
      process.exit(1)
    }
    console.log('data/strategy-capture-tables.json matches the templates.')
    return
  }

  fs.writeFileSync(OUT_FILE, next)
  const data = JSON.parse(next)
  const tables = Object.keys(data.templates)
    .reduce((n, k) => n + data.templates[k].tables.length, 0)
  console.log('Read ' + data.templateCount + ' templates, ' + tables + ' tables.')
  console.log('Written to data/strategy-capture-tables.json')
}

if (require.main === module) { main() }

module.exports = { build, readTemplate, readZip, isBlankLine, trimGrid }
