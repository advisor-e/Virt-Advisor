'use strict'

/**
 * Intake error → safe client response (R6, 2026-07-19).
 *
 * The intake catch blocks were designed to echo the parsers' authored-safe refusal
 * messages, but they also trap unexpected failures — an fs read error carries the
 * server's real temp-file path in `err.message` (ENOENT: ... open 'C:\...'), which
 * must never reach the browser (error standard: no paths, no internals). Only codes
 * on the allowlist below pass their message through; everything else returns the
 * route's generic sentence. The map is prototype-less so an engineered
 * `code: "constructor"` probes nothing inherited.
 */

/** Every authored-safe intake error code → HTTP status. Anything else is a 400 generic. */
const INTAKE_STATUS = Object.assign(Object.create(null), {
  // xlsxReader
  NOT_XLSX: 415,
  CORRUPT_FILE: 422,
  FILE_TOO_LARGE: 413,
  TOO_MANY_PARTS: 413,
  // xeroReportParser
  PDF_REJECTED: 415,
  UNRECOGNISED_FILE: 415,
  UNRECOGNISED_REPORT: 422,
  MULTI_PERIOD_COLUMNS: 422,
  // monthlySalesParser — the mirror of MULTI_PERIOD_COLUMNS: that one refuses a by-month
  // export to an annual model, this one refuses an annual export to the by-month model.
  NOT_BY_MONTH: 422,
  // annualAssembler + monthlySeriesAssembler (same codes, same authored shape)
  TOO_MANY_FILES: 400,
  WRONG_REPORT_KIND: 422,
  // The forecast intake's own count of BY-MONTH files, which is separate from the drop's
  // total. Added 2026-09-03: the message had been raised since the third slot was built and
  // never reached anyone, because a code missing from this map has its sentence replaced by
  // the route's generic one. It names no path, filename or internals — same shape as the
  // two above.
  TOO_MANY_MONTHLY_FILES: 400,
  // inventoryReader (4.70 stage 4): a file matching neither stock-export map, refused by
  // the columns it lacks; and an Unleashed file whose Base Currency Code is not the firm's.
  // Both messages name packages, columns and currency codes only.
  UNRECOGNISED_INVENTORY: 422,
  INVENTORY_CURRENCY_MISMATCH: 422,
  // salesSheetReader: a file matching no sales layout, refused BY THE COLUMNS IT LACKS. Same
  // authored shape as UNRECOGNISED_INVENTORY above — it names column headings and nothing else.
  //
  // 🔴 Added 2026-09-13 with the Sales Dashboard (4.95), and it was missing since the reader was
  // written the same day: the sentence "It has no Entry Date column" was authored, raised, and
  // then replaced by the route's generic one before it reached anybody. That is the identical
  // fault recorded for TOO_MANY_MONTHLY_FILES above. It matters more here than it did, because
  // the required columns are now PER MODEL — the whole point of Decision 9 is that a file is
  // refused by what THIS model needs, and a generic sentence cannot say that.
  UNRECOGNISED_SALES: 422
})

/**
 * @param {Error} err - whatever the intake pipeline threw.
 * @param {string} fallbackMessage - the route's generic refusal sentence.
 * @returns {{status:number, body:{success:false, error:{code:string, message:string}, timestamp:string}}}
 */
function intakeErrorResponse (err, fallbackMessage) {
  const code = (err && err.code) || 'INTAKE_PARSE_FAILED'
  const status = INTAKE_STATUS[code]
  const known = status !== undefined && typeof (err && err.message) === 'string' && err.message !== ''
  return {
    status: known ? status : 400,
    body: {
      success: false,
      error: {
        code: known ? code : 'INTAKE_PARSE_FAILED',
        message: known ? err.message : fallbackMessage
      },
      timestamp: new Date().toISOString()
    }
  }
}

module.exports = { intakeErrorResponse, INTAKE_STATUS }
