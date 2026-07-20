'use strict'

/**
 * Annual-reports assembler — turns 1..5 parsed P&L results (one per year) into the
 * EBITDA & DCF intake payload: per-file proposals plus, when every year is known,
 * the oldest-first aligned arrays the calc engine takes.
 *
 * Pure and side-effect free so the multi-file rules are fully unit-testable; the
 * upload route is a thin wrapper around parseUpload + this. No-partial-parse rule:
 * enforcing "every file is a P&L" happens HERE, loudly, before anything assembles.
 */

const MAX_FILES = 5

/** The period-end "day month" token from a report's own date line ("…31 March 2025" → "31 March"). @param {string|null} reportDate */
function periodEndOf (reportDate) {
  if (!reportDate) { return null }
  const m = /(\d{1,2})\s+([A-Za-z]+)\s+(?:19|20)\d{2}\s*$/.exec(String(reportDate).trim())
  return m ? (m[1] + ' ' + m[2]) : null
}

/** The plFigures keys that map straight onto the calc engine's per-year arrays. */
const SERIES_KEYS = ['sales', 'costOfSales', 'operatingExpenses', 'loanInterestPaid']
/** plFigures keys that live inside the engine's `sundry` group. */
const SUNDRY_KEYS = ['otherIncome', 'interestReceived', 'dividendsReceived', 'badDebtsRecovered']

/**
 * @param {Array<object>} parsed - parseUpload results, one per uploaded file, in upload order.
 * @returns {object} {
 *   files: [{ kind, companyName, reportDate, year, figures, warnings }],  // upload order
 *   assembled: { years, sales, costOfSales, operatingExpenses, loanInterestPaid,
 *                sundry: { otherIncome, interestReceived, dividendsReceived, badDebtsRecovered } } | null,
 *   warnings: string[]
 * } - assembled is null when any year is unknown or duplicated (the screen resolves it).
 * @throws {Error} code TOO_MANY_FILES | WRONG_REPORT_KIND (message names the file positions)
 */
function assembleAnnualReports (parsed) {
  const list = Array.isArray(parsed) ? parsed : []
  if (list.length > MAX_FILES) {
    const e = new Error('This model reads up to ' + MAX_FILES + ' years — ' + list.length + ' files were sent. Please drop one Profit and Loss export per year.')
    e.code = 'TOO_MANY_FILES'
    throw e
  }

  const wrongKind = []
  list.forEach((p, idx) => {
    if (!p || p.kind !== 'profitLoss') { wrongKind.push(idx + 1) }
  })
  if (wrongKind.length) {
    const e = new Error('File ' + wrongKind.join(', file ') + ' is not a Profit and Loss export — this model reads P&L exports only (the Balance Sheet is not needed). No figures were read.')
    e.code = 'WRONG_REPORT_KIND'
    throw e
  }

  const warnings = []
  const files = list.map((p, idx) => {
    const perFile = (p.warnings || []).map(w => 'File ' + (idx + 1) + ': ' + w)
    for (const w of perFile) { warnings.push(w) }
    if (p.year === null || p.year === undefined) {
      warnings.push('File ' + (idx + 1) + ': the report\'s own date line did not carry a year — assign its year on screen.')
    }
    return {
      kind: p.kind,
      companyName: p.companyName || null,
      reportDate: p.reportDate || null,
      year: (p.year === undefined) ? null : p.year,
      figures: p.plFigures || {},
      warnings: p.warnings || []
    }
  })

  const known = files.filter(f => f.year !== null)
  const seen = Object.create(null)
  let duplicate = false
  for (const f of known) {
    if (seen[f.year]) { duplicate = true; warnings.push('Two files carry the year ' + f.year + ' — check the exports; assign the years on screen.') }
    seen[f.year] = true
  }

  const names = new Set(files.map(f => f.companyName).filter(Boolean))
  if (names.size > 1) {
    warnings.push('The files name different companies — check that every export belongs to the same client.')
  }

  // R20: the year-number check alone passes a 31-March-2024 + 30-June-2025 pair as
  // "consecutive" (15 months apart) — the files must also share a fiscal period-end.
  const ends = new Map()
  for (const f of files) {
    const end = periodEndOf(f.reportDate)
    if (end && !ends.has(end.toLowerCase())) { ends.set(end.toLowerCase(), end) }
  }
  if (ends.size > 1) {
    warnings.push('The files end their years on different dates (' + Array.from(ends.values()).join(', ') + ') — year-on-year comparisons may be out of step. Please check the exports.')
  }

  let assembled = null
  if (files.length && known.length === files.length && !duplicate) {
    const ordered = known.slice().sort((a, b) => a.year - b.year) // oldest-first, the engine's orientation
    const years = ordered.map(f => f.year)
    for (let i = 1; i < years.length; i++) {
      if (years[i] !== years[i - 1] + 1) {
        warnings.push('The years are not consecutive (' + years.join(', ') + ') — the growth rates will span the gap.')
        break
      }
    }
    const valueOf = (f, key) => (f.figures[key] ? f.figures[key].value : null)
    assembled = {
      years,
      sundry: {}
    }
    for (const key of SERIES_KEYS) { assembled[key] = ordered.map(f => valueOf(f, key)) }
    for (const key of SUNDRY_KEYS) { assembled.sundry[key] = ordered.map(f => valueOf(f, key)) }
  }

  return { files, assembled, warnings }
}

module.exports = { assembleAnnualReports, MAX_FILES }
