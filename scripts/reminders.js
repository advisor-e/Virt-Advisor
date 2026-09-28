/**
 * reminders.js — the dated questions for Mike that fall due (design/features/reminders.json).
 *
 * Why this exists (Mike, 2026-09-28, parking item 8.3): "mark this as parked with an
 * automated reminder to ask me again on December 15". Nothing in the project could do that,
 * so `check-branch-state.js --report`, which every /startup runs, now prints what has come
 * due at the top of its report, on either machine.
 *
 * REPORT ONLY, like active-items.js — nothing here exits, throws past its caller, or is
 * reachable from the rules that block a push.
 *
 * Node 14.15 / CommonJS per the Stack Constitution. No dependencies.
 */

'use strict'

var ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Today on this computer's own calendar, as YYYY-MM-DD — the day Mike means by a date.
 * @param {Date} [now]
 * @returns {string}
 */
function todayIso (now) {
  var d = now || new Date()
  var pad = function (n) { return (n < 10 ? '0' : '') + n }
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

/**
 * Whether one entry can be relied on to fire: a ref, a real date, and a question.
 * @param {object} r
 * @returns {boolean}
 */
function isWellFormed (r) {
  if (!r || typeof r !== 'object') { return false }
  if (typeof r.ref !== 'string' || !r.ref) { return false }
  if (typeof r.ask !== 'string' || !r.ask.trim()) { return false }
  if (typeof r.on !== 'string' || !ISO_DATE.test(r.on)) { return false }
  var d = new Date(r.on + 'T00:00:00')
  return !isNaN(d.getTime()) && todayIso(d) === r.on
}

/**
 * The reminders due on or before today. An entry that is not well formed is reported as
 * such rather than dropped, so a mistyped date cannot silently never fire.
 *
 * @param {object} data the parsed reminders.json
 * @param {string} today YYYY-MM-DD
 * @returns {Array<string>|null} the box's lines, or null when nothing is due or broken
 */
function dueLines (data, today) {
  var list = data && Array.isArray(data.reminders) ? data.reminders : []
  var out = []
  list.forEach(function (r) {
    if (!isWellFormed(r)) {
      out.push('  ⚠ A reminder in design/features/reminders.json is malformed and cannot fire:')
      out.push('    ' + JSON.stringify(r))
      return
    }
    if (r.on > today) { return }
    out.push('  ' + r.ref + '  due ' + r.on + ' — PUT THIS TO MIKE BEFORE ANY OTHER WORK:')
    out.push('    ' + r.ask)
    if (r.where) { out.push('    His answer goes in: ' + r.where) }
    out.push('    Then remove this entry from design/features/reminders.json.')
  })
  return out.length ? out : null
}

module.exports = {
  todayIso: todayIso,
  isWellFormed: isWellFormed,
  dueLines: dueLines
}
