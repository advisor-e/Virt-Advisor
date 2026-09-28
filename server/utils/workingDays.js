'use strict'

/**
 * @file Working days — Monday to Friday.
 * @module server/utils/workingDays
 *
 * Item 8.5. Mike's ruling, 2026-09-28: an unfinished recording is held **7 working days**,
 * counted **Monday to Friday, weekends skipped, public holidays counted as ordinary days** — no
 * holiday calendar, because holidays differ by country and this app holds none.
 *
 * ⚠ THE WEEKDAY IS READ IN UTC. The server's own time zone is whatever it was deployed with, and
 * a count that moved with it would give two servers two different deadlines for one recording.
 * UTC can shift the boundary by a few hours for a firm far from Greenwich, always in the
 * direction of the whole-day count below; it never shortens the hold by a day.
 *
 * Node 14, CommonJS.
 */

const DAY_MS = 24 * 60 * 60 * 1000

/** Saturday or Sunday, in UTC. */
function isWeekend (date) {
  const day = date.getUTCDay()
  return day === 0 || day === 6
}

/**
 * The moment `count` working days after `from`, at the same time of day.
 *
 * A start on a weekend counts from the Monday: Saturday + 1 working day is Monday's end, not
 * Monday's start, because a working day must actually pass.
 *
 * @param {Date|string|number} from
 * @param {number} count - whole working days, 0 or more
 * @returns {Date|null} null when `from` is not a real date or `count` is not a whole number ≥ 0
 */
function addWorkingDays (from, count) {
  const start = from instanceof Date ? new Date(from.getTime()) : new Date(from)
  if (isNaN(start.getTime())) { return null }
  if (!Number.isInteger(count) || count < 0) { return null }

  let at = start
  let left = count
  while (left > 0) {
    at = new Date(at.getTime() + DAY_MS)
    if (!isWeekend(at)) { left -= 1 }
  }
  return at
}

module.exports = { isWeekend, addWorkingDays }
