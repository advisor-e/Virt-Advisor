'use strict'

/**
 * sessionIndex — the one place that decides whether a course session index is storable.
 *
 * Lives in its own module (like deepMerge) so both the route and the write path can share
 * a single definition: the route mocks `activityLogger` wholesale in its tests, so a helper
 * exported from there would vanish under the mock and the two copies would drift.
 */

// `session_index TINYINT UNSIGNED NOT NULL` (config/db-schema.sql) — 0..255 inclusive.
const MAX_SESSION_INDEX = 255

/**
 * True only for a value the `session_index` column can actually hold.
 *
 * WHY THIS EXISTS, AND WHY IT IS NOT `Number(value)`. The route used to accept anything
 * that was not `undefined` and then call `Number()` on it, which fails two ways and
 * announces neither:
 *
 *   - `Number(null)`, `Number([])` and `Number('')` are all **0** — a legitimate index —
 *     so a missing index was written as session one: a session the advisor never sat,
 *     appearing in their CPD record as fact.
 *   - Anything else non-numeric becomes `NaN`. MySQL refuses that row outright, and
 *     because `logCourseSession` catches its own errors and only writes a console line,
 *     the refusal was invisible: the session simply vanished from the record. `NaN` also
 *     never equals `NaN`, so the unique key on (advisor_id, course_id, session_index)
 *     could not fire and the same session could be written repeatedly.
 *
 * Same defect family as `quizRecord.safeInt` — a MISSING quiz score stored as a real zero,
 * fixed 2026-07-29. One column across, the identical trap.
 *
 * Booleans are refused deliberately: `Number(true)` is 1, which would silently file a
 * session against index one.
 *
 * @param {*} value - whatever the client sent as `sessionIndex`
 * @returns {boolean} true only for a whole number in 0..255
 */
function isStorableSessionIndex (value) {
  if (typeof value !== 'number' && typeof value !== 'string') { return false }
  if (typeof value === 'string' && value.trim() === '') { return false }
  const n = Number(value)
  return Number.isInteger(n) && n >= 0 && n <= MAX_SESSION_INDEX
}

module.exports = { isStorableSessionIndex, MAX_SESSION_INDEX }
