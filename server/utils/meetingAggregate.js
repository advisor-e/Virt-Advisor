'use strict'

/**
 * Meeting Review — the manager's aggregate.
 *
 * @module server/utils/meetingAggregate
 *
 * Managers set the observation points, so they have to learn whether the points are landing —
 * *"framing was missed in 11 of 28 meetings this month"* — and they must never learn WHO missed
 * one. This module is the whole of that arithmetic, kept out of the route so it can be tested
 * against records rather than against HTTP.
 *
 * Asked for by Mike 2026-09-01 as part of *"records the voices and transcribes the meeting, then
 * generates two reports"*; the aggregate is the manager's half of it. Design
 * `design/features/meeting-review.md` P3 and §5 trap 2; artefact
 * `design/mockups/meeting-review.html` screens C3 and C4, approved 2026-09-01.
 *
 * 🔴 THE THRESHOLD IS A DESIGN DECISION, NOT A TUNING CONSTANT. Mike's ruling, 2026-09-01: no
 * figure appears at all until at least 5 advisors and 20 meetings have contributed. Below that a
 * count can be worked backwards to one person, and a count that can be narrowed to an individual
 * is a named report wearing a disguise (P3). **It is never lowered to make a screen look
 * populated**, and the accepted cost is recorded in the Brief: a four-advisor firm sees no
 * manager figures, ever. They still set the points, and their advisors still get their own notes.
 *
 * 🔴 NO ADVISOR IDENTIFIER LEAVES THIS MODULE. Advisors are counted and then forgotten — the
 * returned shape carries a number and never a name, an id or a list. That is enforced by what is
 * built rather than by what a caller remembers to strip.
 *
 * 🔴 AND THE SAME FLOOR APPLIES TO EACH POINT — Mike's ruling, 2026-09-07. His first ruling set
 * the gate for the SCREEN; a point appearing in only three of the month's meetings would still
 * have printed "1 / 3" underneath a screen that had passed it, which is the very reversal the
 * gate exists to prevent. So the 20-meeting half is applied per point as well, and a point below
 * the floor is omitted entirely rather than shown with a caveat. *The cost recorded against it,
 * because it is real:* a newly added observation point shows nothing for its first month or two,
 * and only the whole-screen message explains why — there is no per-row one.
 *
 * Node 14, CommonJS.
 */

/** Mike's ruling, 2026-09-01. Never lowered. */
const MIN_ADVISORS = 5

/** Mike's ruling, 2026-09-01, and per point as well on 2026-09-07. Never lowered. */
const MIN_MEETINGS = 20

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

/**
 * The calendar month a date falls in, read in UTC.
 *
 * 🔴 UTC IS DELIBERATE AND IT IS THE WHOLE OF THE REASON THIS FUNCTION EXISTS. Meeting records
 * store an ISO stamp; reading it with `getMonth()` reads it in the SERVER's timezone, so the same
 * twenty meetings fall into different months on a machine in Auckland and a machine in London.
 * A count that changes when a server moves is a silent data fault — the screen looks identical
 * and the figures are different. UTC gives one answer everywhere.
 *
 * ⚠ THE COST, WHICH IS COSMETIC AND IS RECORDED RATHER THAN HIDDEN: for the hours a local day
 * runs ahead of UTC, a manager opening the screen on the 1st sees the previous month named, and
 * a meeting held late on the last evening of a month counts into that month by UTC. The
 * alternative trades a visible one-day skew for an invisible count that depends on where the
 * server sits, which is the worse of the two.
 *
 * @param {Date} date
 * @returns {{year: number, month: number}} month is 1–12
 */
function periodOf (date) {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 }
}

/**
 * The period as the approved drawing prints it in the screen's chrome — "Aug 2026".
 *
 * @param {{year: number, month: number}} period
 * @returns {string}
 */
function periodLabel (period) {
  return MONTH_NAMES[period.month - 1] + ' ' + period.year
}

/**
 * Was this meeting created inside the period?
 *
 * Uses the meeting's OWN creation stamp rather than when its report was generated: a meeting
 * held on the 31st and reported on the 1st belongs to the month it happened in, which is the
 * month a manager will be thinking about. Read in UTC, for the reason `periodOf` gives.
 *
 * @param {object} meta - the meeting record
 * @param {{year: number, month: number}} period
 * @returns {boolean}
 */
function inPeriod (meta, period) {
  if (!meta || typeof meta.createdAt !== 'string') { return false }
  const when = new Date(meta.createdAt)
  if (isNaN(when.getTime())) { return false }
  const p = periodOf(when)
  return p.year === period.year && p.month === period.month
}

/**
 * Did this finding land, not land, or say nothing either way?
 *
 * The three states the coaching report stores, read for counting:
 *
 * - `found` — the model quoted the advisor saying it, and the quote was verified against the
 *   transcript before storage (P4). It counts as met.
 * - `not_found` — the point was looked for and was not there. It counts as missed.
 * - `cannot_hear` — a point a recording cannot answer (§3), where the ADVISOR answers. Their
 *   answer counts; an unanswered one counts as **nothing at all** and leaves the denominator
 *   as well as the numerator, because "we never asked" is not the same as "it did not happen".
 *
 * @param {object} finding
 * @returns {boolean|null} true met, false missed, null not countable
 */
function outcomeOf (finding) {
  if (!finding || typeof finding !== 'object') { return null }
  if (finding.state === 'found') { return true }
  if (finding.state === 'not_found') { return false }
  if (finding.state === 'cannot_hear') {
    if (finding.advisorAnswer === true) { return true }
    if (finding.advisorAnswer === false) { return false }
    return null
  }
  return null
}

/**
 * The manager's figures for one firm and one month.
 *
 * 🔴 A MEETING CONTRIBUTES ONLY ONCE IT HAS COACHING NOTES. A recording with no report cannot
 * say whether a point landed, so counting it would deflate every percentage on the screen while
 * looking perfectly reasonable. It also keeps the header count and the row denominators the same
 * number, which is what makes "24 / 28" readable.
 *
 * @param {Array<{meta: object, coaching: (object|null)}>} records - every meeting of the firm
 * @param {{year: number, month: number}} period
 * @returns {{
 *   period: {year: number, month: number, label: string},
 *   meetings: number,
 *   advisors: number,
 *   enough: boolean,
 *   minAdvisors: number,
 *   minMeetings: number,
 *   points: Array<{pointId: string, text: string, met: number, of: number}>
 * }}
 */
function summarise (records, period) {
  const rows = Array.isArray(records) ? records : []
  const contributing = rows.filter(r =>
    r && r.meta && r.coaching && Array.isArray(r.coaching.findings) && inPeriod(r.meta, period))

  // Counted, then discarded. The set exists inside this function and nowhere else.
  const advisorSet = {}
  let advisors = 0
  contributing.forEach((r) => {
    const who = r.meta.advisor
    if (typeof who === 'string' && who && !advisorSet[who]) {
      advisorSet[who] = true
      advisors += 1
    }
  })

  const meetings = contributing.length
  const enough = advisors >= MIN_ADVISORS && meetings >= MIN_MEETINGS

  const base = {
    period: { year: period.year, month: period.month, label: periodLabel(period) },
    meetings,
    advisors,
    enough,
    minAdvisors: MIN_ADVISORS,
    minMeetings: MIN_MEETINGS,
    points: []
  }

  // Below the gate NOTHING is computed, not merely nothing rendered. A screen cannot leak a
  // figure that was never worked out, and a later caller cannot reach past the flag for one.
  if (!enough) { return base }

  const byPoint = {}
  const order = []
  contributing.forEach((r) => {
    r.coaching.findings.forEach((f) => {
      const id = f && typeof f.pointId === 'string' ? f.pointId : ''
      if (!id) { return }
      const outcome = outcomeOf(f)
      if (outcome === null) { return }
      if (!byPoint[id]) {
        byPoint[id] = { pointId: id, text: typeof f.text === 'string' ? f.text : '', met: 0, of: 0 }
        order.push(id)
      }
      byPoint[id].of += 1
      if (outcome) { byPoint[id].met += 1 }
    })
  })

  // The per-point floor — Mike's ruling, 2026-09-07. A point below it is dropped rather than
  // shown with a warning beside it. See the module note.
  base.points = order.map(id => byPoint[id]).filter(p => p.of >= MIN_MEETINGS)
  return base
}

module.exports = {
  MIN_ADVISORS,
  MIN_MEETINGS,
  periodOf,
  periodLabel,
  inPeriod,
  outcomeOf,
  summarise
}
