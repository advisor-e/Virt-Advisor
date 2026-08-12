'use strict'

/**
 * @file Which firms are actually using the product — the mentor's adoption view.
 * @module server/utils/mentorAdoption
 *
 * THE ARTEFACT IS design/mockups/mentor-adoption-view.html, ruled by Mike on
 * 2026-08-09. Its §3 holds the four decisions this file implements, including the
 * approved wording; build differences belong there, not in a commit message.
 *
 * WHY THIS EXISTS RATHER THAN A ROLL-UP OF TEAM PROGRESS. The Team Progress tab
 * lists a firm's advisers BY NAME. Widening it one level would have put every
 * firm's advisers in front of Advisor-e, against a boundary this codebase already
 * enforces in code (see mentorLogicLabReport.assertNoPersonalFields, and the case
 * feed, which is double opt-in). The same activity counted one level up and
 * stripped of WHO did it answers the question a mentor actually has and crosses
 * nothing.
 *
 * THE PRIVACY LINE. This is the third read in the app that crosses the firm
 * boundary. It is defensible only because it carries COUNTS: how many advisers,
 * how many sessions, how recently. No advisor name, no client name, no session
 * text. `assertNoPersonalFields` enforces that at the boundary rather than
 * trusting the upstream shape, and throws rather than filtering — a silent filter
 * would hide the day the shape changed.
 *
 * WHY THE FIRMS LIST IS AN INPUT AT ALL (ruled: read it). Activity lives in the
 * session tables, which only ever hold rows for firms that have DONE something. A
 * firm that has never opened the product leaves no trace there — so "who has not
 * adopted this", the more useful half of the question, is unanswerable without the
 * list of firms. Every firm on that list appears here, active or not.
 *
 * This function is pure — no I/O, no database, no clock. The caller supplies the
 * firms, the activity and `now`, which is what makes the 60-day line testable.
 */

/**
 * Days of silence before a firm is flagged. RULED by Mike 2026-08-09: 60, chosen
 * over 30 so that a badge on this page means "act", not "glance". The artefact
 * shows the consequence rather than stating it — a firm last seen six weeks ago
 * still reads Active.
 * @type {number}
 */
const QUIET_AFTER_DAYS = 60

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * The three states a firm can be in, and the approved wording for each.
 * The labels themselves live in the locale file; these are the machine values.
 * @type {{active: string, slowed: string, never: string}}
 */
const STATUS = { active: 'active', slowed: 'slowed', never: 'never' }

/**
 * One firm's row, as this page may publish it.
 * @typedef {Object} AdoptionRow
 * @property {string} firmId - the firm's id. Never a person.
 * @property {string} firmName - its name, or the id where the firms table has none.
 * @property {boolean} named - false when firmName fell back to the id, so the
 *   screen can present it as a code rather than pretending it is a name.
 * @property {number} advisers - distinct advisers who did ANY work, both kinds counted once.
 * @property {number} sessions - advisor sessions.
 * @property {number} courses - completed courses.
 * @property {number|null} avgQuiz - average quiz score as a percentage, or null.
 * @property {string|null} lastSeen - ISO stamp of the most recent activity, or null.
 * @property {string} status - one of STATUS.
 */

/**
 * Throw if anything that could identify a person reached the payload.
 *
 * Belt and braces at the boundary, copied deliberately from
 * mentorLogicLabReport rather than reinvented — two cross-firm reads should fail
 * the same way. The aggregation below selects counts and never touches a name
 * column, but this page is one of the few that would publish one across firms if
 * it ever did, and a privacy failure discovered afterwards cannot be undone.
 *
 * @param {object} report - the payload about to cross the boundary.
 * @throws {Error} when a forbidden field is present.
 */
function assertNoPersonalFields (report) {
  const FORBIDDEN = [
    'advisorName', 'advisor_name', 'advisorId', 'advisor_id',
    'clientName', 'transcript', 'summary', 'caseId', 'userEmail', 'by'
  ]
  const seen = JSON.stringify(report)
  for (const field of FORBIDDEN) {
    if (new RegExp(`"${field}"\\s*:`).test(seen)) {
      throw new Error(`mentorAdoption: forbidden field "${field}" reached the cross-firm payload`)
    }
  }
}

/**
 * Where a firm sits, given when it was last seen.
 *
 * @param {string|null} lastSeen - ISO stamp, or null for a firm with no activity.
 * @param {number} nowMs - the caller's clock, injected so this is testable.
 * @returns {string} one of STATUS
 */
function statusFor (lastSeen, nowMs) {
  if (!lastSeen) { return STATUS.never }
  const seenMs = Date.parse(lastSeen)
  // An unparseable stamp is not evidence of activity. Treating it as "active"
  // would hide a firm that needs chasing behind a data fault.
  if (Number.isNaN(seenMs)) { return STATUS.never }
  return (nowMs - seenMs) <= QUIET_AFTER_DAYS * MS_PER_DAY ? STATUS.active : STATUS.slowed
}

/**
 * Fold the store's three grouped row sets into one row per firm.
 *
 * Kept here rather than in the store so the SQL stays in the store and the
 * arithmetic stays testable without a database. Three queries rather than one
 * because the two kinds of work live in different tables, and because ADVISERS
 * CANNOT BE ADDED UP: an adviser who did both a session and a course is one
 * person, and summing the two tables' counts would inflate every firm that uses
 * the product properly. The store's third query does that DISTINCT across a UNION.
 *
 * @param {object} rows
 * @param {Array<object>} [rows.vaRows] - { firm_id, sessions, last_active }
 * @param {Array<object>} [rows.courseRows] - { firm_id, courses, avg_score, last_active }
 * @param {Array<object>} [rows.adviserRows] - { firm_id, advisers }
 * @returns {Array<object>} one { firmId, advisers, sessions, courses, avgQuiz, lastSeen } per firm
 */
function mergeActivityRows (rows) {
  const src = rows && typeof rows === 'object' ? rows : {}
  const out = new Map()

  const bucket = (firmId) => {
    const id = String(firmId || '')
    if (!id) { return null }
    if (!out.has(id)) {
      out.set(id, { firmId: id, advisers: 0, sessions: 0, courses: 0, avgQuiz: null, lastSeen: null })
    }
    return out.get(id)
  }

  // The most recent stamp across BOTH tables — a firm whose only recent work is a
  // course must not read as last seen months ago.
  const noteSeen = (b, stamp) => {
    if (!stamp) { return }
    const s = String(stamp)
    if (!b.lastSeen || s > String(b.lastSeen)) { b.lastSeen = s }
  }

  for (const r of Array.isArray(src.vaRows) ? src.vaRows : []) {
    const b = bucket(r && r.firm_id); if (!b) { continue }
    b.sessions += Number(r.sessions) || 0
    noteSeen(b, r.last_active)
  }
  for (const r of Array.isArray(src.courseRows) ? src.courseRows : []) {
    const b = bucket(r && r.firm_id); if (!b) { continue }
    b.courses += Number(r.courses) || 0
    if (r.avg_score !== null && r.avg_score !== undefined) { b.avgQuiz = Number(r.avg_score) }
    noteSeen(b, r.last_active)
  }
  for (const r of Array.isArray(src.adviserRows) ? src.adviserRows : []) {
    const b = bucket(r && r.firm_id); if (!b) { continue }
    b.advisers = Number(r.advisers) || 0
  }

  return Array.from(out.values())
}

/**
 * Build the adoption view.
 *
 * @param {object} input
 * @param {Array<{id: string, name: (string|null)}>} [input.firms] - every firm on
 *   the platform. A firm absent from here but present in the activity still
 *   appears: the list is how we learn about the SILENT ones, not a filter on the
 *   loud ones, and dropping a firm with real sessions because a directory read
 *   missed it would under-report adoption without a word.
 * @param {Array<object>} [input.activity] - per-firm aggregates:
 *   { firmId, advisers, sessions, courses, avgQuiz, lastSeen }
 * @param {number|string|Date} input.now - the caller's clock. Required: this
 *   module never reads the time itself, so the 60-day line can be tested.
 * @returns {{generatedAt: string, quietAfterDays: number, totals: object,
 *   firms: AdoptionRow[]}} the payload, already checked at the boundary.
 */
function buildAdoptionView (input) {
  const nowMs = new Date((input && input.now) || 0).getTime()
  const firms = (input && Array.isArray(input.firms)) ? input.firms : []
  const activity = (input && Array.isArray(input.activity)) ? input.activity : []

  const byFirm = new Map()
  for (const a of activity) {
    if (!a || !a.firmId) { continue }
    byFirm.set(String(a.firmId), a)
  }

  // Start from the directory, then add any firm that has activity but no directory
  // row — see the @param note above for why that is an addition and not a filter.
  const ids = []
  const seenIds = new Set()
  for (const f of firms) {
    const id = f && f.id ? String(f.id) : ''
    if (!id || seenIds.has(id)) { continue }
    seenIds.add(id)
    ids.push(id)
  }
  for (const id of byFirm.keys()) {
    if (!seenIds.has(id)) { seenIds.add(id); ids.push(id) }
  }

  const nameById = new Map()
  for (const f of firms) {
    if (f && f.id && typeof f.name === 'string' && f.name.trim()) {
      nameById.set(String(f.id), f.name.trim())
    }
  }

  const rows = ids.map((firmId) => {
    const a = byFirm.get(firmId) || {}
    const name = nameById.get(firmId) || null
    const lastSeen = a.lastSeen || null
    return {
      firmId,
      // Falls back to the id rather than to an empty cell or an invented name. In
      // the master app the firms table may be Advisor-e's rather than ours, so a
      // missing name is an expected state, not a fault.
      firmName: name || firmId,
      named: !!name,
      advisers: Number(a.advisers) || 0,
      sessions: Number(a.sessions) || 0,
      courses: Number(a.courses) || 0,
      avgQuiz: (a.avgQuiz === null || a.avgQuiz === undefined) ? null : Math.round(Number(a.avgQuiz)),
      lastSeen,
      status: statusFor(lastSeen, nowMs)
    }
  })

  // Busiest first, as the artefact shows. A firm that has never started sorts to
  // the bottom by having nothing — no special case needed.
  rows.sort((x, y) => (y.sessions + y.courses) - (x.sessions + x.courses) ||
    String(x.firmName).localeCompare(String(y.firmName)))

  const report = {
    generatedAt: new Date(nowMs).toISOString(),
    quietAfterDays: QUIET_AFTER_DAYS,
    totals: {
      activeFirms: rows.filter(r => r.status === STATUS.active).length,
      slowedFirms: rows.filter(r => r.status === STATUS.slowed).length,
      neverStartedFirms: rows.filter(r => r.status === STATUS.never).length,
      // Summed across firms. An adviser belongs to one firm, so this does not
      // double-count; the per-firm figure is already deduplicated across the two
      // kinds of work by the store's UNION.
      advisers: rows.reduce((n, r) => n + r.advisers, 0),
      sessionsAndCourses: rows.reduce((n, r) => n + r.sessions + r.courses, 0)
    },
    firms: rows
  }

  assertNoPersonalFields(report)
  return report
}

module.exports = {
  QUIET_AFTER_DAYS,
  STATUS,
  statusFor,
  mergeActivityRows,
  assertNoPersonalFields,
  buildAdoptionView
}
