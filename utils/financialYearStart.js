/**
 * The first month of the financial year a date falls in, as the `YYYY-MM` string a
 * `type="month"` input takes.
 *
 * Both budget screens opened at a hardcoded `'2021-04'` — the sample workbook's own year —
 * so in 2026 a new client budget arrived five years out of date, and every month label on
 * it was wrong until the advisor noticed and changed it. April is not the mistake: the New
 * Zealand tax year runs 1 April to 31 March, and both workbooks run Apr→Mar. Only the year
 * was, and typing a fresh one in would just go stale again next April.
 *
 * The month is the caller's, because it is a jurisdiction's rule rather than a fact about
 * this app; the two budget screens pass April. Nothing here reads a clock — the date comes
 * in, so the server and the browser cannot disagree about it, and the boundary is testable.
 *
 * CommonJS, no DOM, shared by the components and their tests.
 */

'use strict'

/**
 * @param {Date} now any date inside the wanted financial year
 * @param {number} startMonth first month of the financial year, 1-12 (April = 4)
 * @returns {string} `YYYY-MM` — that year's start month, or the previous year's when `now`
 *   falls before it. April 2026 for any date from 1 Apr 2026 to 31 Mar 2027.
 */
function financialYearStart (now, startMonth) {
  const d = now instanceof Date && !isNaN(now.getTime()) ? now : new Date()
  const m = Number.isInteger(startMonth) && startMonth >= 1 && startMonth <= 12 ? startMonth : 1
  // getMonth() is 0-based; startMonth is not.
  const year = d.getMonth() + 1 >= m ? d.getFullYear() : d.getFullYear() - 1
  return year + '-' + String(m).padStart(2, '0')
}

module.exports = { financialYearStart }
