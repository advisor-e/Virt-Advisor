'use strict'

/**
 * Monthly-series assembler — joins up to two by-month exports into ONE oldest-first run
 * of monthly sales for the Volatility Report, and says plainly what it set aside.
 *
 * WHY TWO FILES. A Xero "Current financial year by month" export covers a single
 * financial year, so one file gives twelve months. The report offers 12, 18 and 24, and
 * its Year-on-Year table needs a full 24 — Mike's ruling, 2026-08-31: "two files, up to
 * 24 months". This module is where the join happens, and the join is the risky part:
 * two exports read separately are two correct halves; joined wrongly they are one
 * confident, wrong series.
 *
 * WHAT IT REFUSES vs WHAT IT WARNS ABOUT — the distinction matters:
 *  - It THROWS only when nothing usable can come out: more than two files, or a file
 *    that is not a by-month P&L. Nothing is half-parsed (the no-partial-parse rule).
 *  - It WARNS and still returns a series when the files disagree in a way the advisor
 *    can see and judge: a gap between them, an overlap, or two different companies. A
 *    gap is not fatal — the newer file alone still gives twelve months — so refusing
 *    outright would take away a usable report to punish a fixable mistake.
 *
 * WHAT "USABLE" MEANS. Months the parser marked incomplete — empty months after the data
 * cut-off, and the partial month at the cut-off itself — are removed from the END of the
 * run, and the window slides back over the earlier complete months. This is the whole
 * point of the second file: with 24 months in hand, dropping two still leaves a full
 * twelve. See monthlySalesParser.js for why those months are poison to this model.
 */

const MAX_FILES = 2

/** Month names for a human-readable range ("Sep 2023 – Aug 2024"). */
const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

/** "Aug 2024" from an ordinal. @param {number} ordinal */
function ordinalLabel (ordinal) {
  return MONTH_LABELS[ordinal % 12].slice(0, 3) + ' ' + Math.floor(ordinal / 12)
}

/**
 * Join parsed by-month exports into one series.
 *
 * @param {Array<object>} parsed - parseMonthlyUpload results, in upload order.
 * @returns {object} {
 *   files: [{ companyName, reportDate, monthsRead, monthsComplete, range, warnings }],
 *   series: [{ label, ordinal, value, complete, reason }],   // oldest-first, joined
 *   usable: [{ label, ordinal, value }],                     // trailing incomplete removed
 *   setAside: [{ label, ordinal, value, reason }],           // what came off, and why
 *   warnings: string[]
 * }
 * @throws {Error} err.code ∈ TOO_MANY_FILES | WRONG_REPORT_KIND
 */
function assembleMonthlySeries (parsed) {
  const list = Array.isArray(parsed) ? parsed : []
  if (list.length > MAX_FILES) {
    const e = new Error('This report reads up to ' + MAX_FILES + ' accounts files — ' + list.length + ' were sent. Please drop this year\'s by-month export and, if you want more than twelve months, last year\'s.')
    e.code = 'TOO_MANY_FILES'
    throw e
  }

  const wrongKind = []
  list.forEach((p, idx) => {
    if (!p || p.kind !== 'profitLossByMonth') { wrongKind.push(idx + 1) }
  })
  if (wrongKind.length) {
    const e = new Error('File ' + wrongKind.join(', file ') + ' is not a by-month Profit and Loss export. No figures were read.')
    e.code = 'WRONG_REPORT_KIND'
    throw e
  }

  const warnings = []
  const files = list.map((p) => {
    const months = p.months || []
    for (const w of (p.warnings || [])) { warnings.push(w) }
    return {
      companyName: p.companyName || null,
      reportDate: p.reportDate || null,
      monthsRead: months.length,
      monthsComplete: months.filter(m => m.complete).length,
      range: months.length ? (ordinalLabel(months[0].ordinal) + ' – ' + ordinalLabel(months[months.length - 1].ordinal)) : null,
      warnings: p.warnings || []
    }
  })

  const names = new Set(files.map(f => f.companyName).filter(Boolean))
  if (names.size > 1) {
    warnings.push('The files name different companies — check that both exports belong to the same client.')
  }

  // Oldest file first, so "the newer file wins" below is a single, stated rule.
  const withMonths = list.filter(p => (p.months || []).length)
  const ordered = withMonths.slice().sort((a, b) => a.months[0].ordinal - b.months[0].ordinal)

  // Overlap: the older file's figure is kept, because its financial year has closed and
  // been reconciled, whereas the newer export restates the same month while it is still
  // open. Approved wording, 2026-08-31: "Last year's figures were used for those months
  // and this year's ignored."
  const byOrdinal = new Map()
  const overlap = []
  for (const p of ordered) {
    for (const m of p.months) {
      if (byOrdinal.has(m.ordinal)) { overlap.push(m.ordinal); continue }
      byOrdinal.set(m.ordinal, m)
    }
  }
  if (overlap.length) {
    const from = ordinalLabel(Math.min.apply(null, overlap))
    const to = ordinalLabel(Math.max.apply(null, overlap))
    warnings.push('The two files overlap. Both exports cover ' + (from === to ? from : from + ' to ' + to) + '. The older file\'s figures were used for those months and the newer file\'s ignored. If that is the wrong way round, replace the older file.')
  }

  let series = Array.from(byOrdinal.values()).sort((a, b) => a.ordinal - b.ordinal)
    .map(m => ({ label: m.label, ordinal: m.ordinal, value: m.value, complete: m.complete, reason: m.reason }))

  // A gap means the series is not twenty-four consecutive months, whatever its length
  // says. Keep the most recent unbroken run — the months the advisor can actually use —
  // and say what was dropped, rather than measuring a swing across a hole.
  let gapAt = -1
  for (let i = series.length - 1; i > 0; i--) {
    if (series[i].ordinal !== series[i - 1].ordinal + 1) { gapAt = i; break }
  }
  if (gapAt !== -1) {
    const missingFrom = ordinalLabel(series[gapAt - 1].ordinal + 1)
    const missingTo = ordinalLabel(series[gapAt].ordinal - 1)
    const missingCount = series[gapAt].ordinal - series[gapAt - 1].ordinal - 1
    warnings.push('The two files do not meet. ' + missingCount + ' month' + (missingCount === 1 ? ' is' : 's are') + ' missing between them (' + (missingFrom === missingTo ? missingFrom : missingFrom + ' to ' + missingTo) + '), so only the months after the gap were used. Export the missing period, or measure a shorter window.')
    series = series.slice(gapAt)
  }

  // Trailing incomplete months come off the end; the window slides back over the
  // complete months before them. `series` keeps every month that was read, so the screen
  // can still show a set-aside month in its own box for the advisor to overtype.
  let end = series.length
  while (end > 0 && !series[end - 1].complete) { end-- }
  const usable = series.slice(0, end).map(m => ({ label: m.label, ordinal: m.ordinal, value: m.value }))
  const setAside = series.slice(end).map(m => ({ label: m.label, ordinal: m.ordinal, value: m.value, reason: m.reason }))

  // An incomplete month INSIDE the run is NOT dropped. Removing it would splice two
  // non-adjacent months together — the same fault as reading across a gap, and invisible
  // once done. It is named instead and left in place for the advisor to overtype.
  const inside = series.slice(0, end).filter(m => !m.complete)
  if (inside.length) {
    warnings.push(inside.length + ' month' + (inside.length === 1 ? '' : 's') + ' inside the series (' + inside.map(m => ordinalLabel(m.ordinal)).join(', ') + ') read as zero in the export. They have been left in place, because a month with no sales and a month with no data look identical here — please check them and type the real figures over any that are wrong.')
  }

  return { files, series, usable, setAside, warnings }
}

module.exports = { assembleMonthlySeries, MAX_FILES, ordinalLabel }
