'use strict'

/**
 * Minimal CSV reader (RFC-4180 quoting) — zero dependencies.
 *
 * Xero offers every report as CSV as well as Excel; both land on the same grid
 * shape so the Xero report parser doesn't care which format was dropped.
 * Numeric-looking fields are converted to numbers so the grid matches what the
 * xlsx reader produces.
 *
 * Untrusted input → hard caps on rows and columns; tested alongside the parser.
 */

const MAX_ROWS = 5000
const MAX_COLS = 256

/**
 * Parse CSV text into a dense row grid.
 * @param {string} text - the file's decoded content.
 * @returns {Array<Array<string|number>>}
 */
function parseCsv (text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  const pushField = () => {
    const trimmed = field.trim()
    if (trimmed !== '' && /^-?[\d,]*\.?\d+$/.test(trimmed)) {
      const n = parseFloat(trimmed.replace(/,/g, ''))
      row.push(Number.isFinite(n) ? n : trimmed)
    } else {
      row.push(trimmed)
    }
    field = ''
  }
  const pushRow = () => {
    pushField()
    // drop fully-empty rows but keep the grid's row numbering compact
    if (row.some(c => c !== '')) {
      if (rows.length >= MAX_ROWS) { throw new Error('CSV holds more rows than any report export') }
      rows.push(row)
    }
    row = []
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i)
    if (inQuotes) {
      if (ch === '"') {
        if (text.charAt(i + 1) === '"') { field += '"'; i++ } else { inQuotes = false }
      } else { field += ch }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      if (row.length >= MAX_COLS) { throw new Error('CSV holds more columns than any report export') }
      pushField()
    } else if (ch === '\n') {
      pushRow()
    } else if (ch !== '\r') {
      field += ch
    }
  }
  if (field !== '' || row.length) { pushRow() }
  return rows
}

module.exports = { parseCsv }
