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
 * Convert a Xero-style figure string to a number, or null when it isn't one (R16).
 * Accepts exactly the formats a real export prints: plain numbers, decimals,
 * minus-sign negatives, accounting-bracket negatives `(1,234.56)`, a `$` prefix,
 * and PROPER thousands grouping only — `1,2,3` is text, never silently 123.
 * @param {string} s - a trimmed cell value.
 * @returns {number|null}
 */
function toFigure (s) {
  let t = s
  let neg = false
  const bracket = /^\((.+)\)$/.exec(t)
  if (bracket) { neg = true; t = bracket[1].trim() }
  if (t.charAt(0) === '$') { t = t.slice(1).trim() }
  if (t.charAt(0) === '-') {
    if (neg) { return null } // "(-500)" is no printed format — stay text, never guess a sign
    neg = true
    t = t.slice(1).trim()
    if (t.charAt(0) === '$') { t = t.slice(1).trim() } // "-$500"
  }
  if (!/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/.test(t) && !/^\.\d+$/.test(t)) { return null }
  const n = parseFloat(t.replace(/,/g, ''))
  return Number.isFinite(n) ? (neg ? -n : n) : null
}

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
    const n = trimmed === '' ? null : toFigure(trimmed)
    row.push(n !== null ? n : trimmed)
    field = ''
  }
  const pushRow = () => {
    pushField()
    // drop fully-empty rows but keep the grid's row numbering compact
    if (row.some(c => c !== '')) {
      // FILE_TOO_LARGE keeps these authored messages on the intake allowlist (R6)
      if (rows.length >= MAX_ROWS) { const e = new Error('CSV holds more rows than any report export'); e.code = 'FILE_TOO_LARGE'; throw e }
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
      if (row.length >= MAX_COLS) { const e = new Error('CSV holds more columns than any report export'); e.code = 'FILE_TOO_LARGE'; throw e }
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
