/**
 * Course API client — talks to the secured /api/courses backend routes
 * (CB-16/17 Stage D, design/COURSE-BUILDER-PLAN.md).
 *
 * Storage moves from browser localStorage to the firm database so a course
 * follows the advisor across devices, feeds firm reporting, and makes
 * firm-wide sharing possible later. Identity (advisorId/firmId) is derived
 * server-side from the Bearer token and never sent in the body — these
 * functions only carry the token + payload. Calls go through the same-origin
 * Nuxt thin proxy (apiProxy.js), the cases pattern.
 */

function authHeaders (token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

/** Build an Error carrying the HTTP status (the migration treats 409 as "already landed"). */
function httpError (res, verb) {
  const err = new Error(`Failed to ${verb} (${res.status})`)
  err.status = res.status
  return err
}

/**
 * Fetch the signed-in advisor's own courses (all statuses), newest-touched first.
 * @param {string} token - Bearer token
 * @returns {Promise<object[]>}
 */
export async function listCourses (token) {
  const res = await fetch('/api/courses', { headers: authHeaders(token) })
  if (!res.ok) { throw httpError(res, 'load courses') }
  return (await res.json()).courses || []
}

/**
 * Fetch courses OTHER advisors in the caller's firm shared firm-wide (CB-07).
 * Outline-only summaries — never the author's progress or design conversation.
 * @param {string} token - Bearer token
 * @returns {Promise<object[]>} { id, authorAdvisorId, outline, createdAt, updatedAt }
 */
export async function listSharedCourses (token) {
  const res = await fetch('/api/courses/shared', { headers: authHeaders(token) })
  if (!res.ok) { throw httpError(res, 'load shared courses') }
  return (await res.json()).courses || []
}

/**
 * Make the caller's own copy of a firm-shared course (CB-07 personal-copy
 * model): fresh progress, private, owned by the caller.
 * @param {string} id - the shared course's id
 * @param {string} token - Bearer token
 * @returns {Promise<object>} the new course
 */
export async function copySharedCourse (id, token) {
  const res = await fetch(`/api/courses/shared/${encodeURIComponent(id)}/copy`, {
    method: 'POST', headers: authHeaders(token)
  })
  if (!res.ok) { throw httpError(res, 'copy shared course') }
  return (await res.json()).course
}

/**
 * Save a new course. Identity is NOT sent — the backend derives it from the
 * token. A supplied id is preserved (the migration keeps existing ids).
 * @param {object} course - { id?, status?, visibility?, outline, progress?, designHistory? }
 * @param {string} token - Bearer token
 * @returns {Promise<object>} the stored course
 */
export async function createCourse (course, token) {
  const res = await fetch('/api/courses', {
    method: 'POST', headers: authHeaders(token), body: JSON.stringify(course)
  })
  if (!res.ok) { throw httpError(res, 'save course') }
  return (await res.json()).course
}

/**
 * Update an owned course (whole-document per field: status / visibility /
 * outline / progress).
 * @param {string} id
 * @param {object} patch
 * @param {string} token - Bearer token
 * @returns {Promise<object>} the fresh stored course
 */
export async function updateCourse (id, patch, token) {
  const res = await fetch(`/api/courses/${encodeURIComponent(id)}`, {
    method: 'PUT', headers: authHeaders(token), body: JSON.stringify(patch)
  })
  if (!res.ok) { throw httpError(res, 'update course') }
  return (await res.json()).course
}

/**
 * Delete an owned course.
 * @param {string} id
 * @param {string} token - Bearer token
 */
export async function deleteCourse (id, token) {
  const res = await fetch(`/api/courses/${encodeURIComponent(id)}`, {
    method: 'DELETE', headers: authHeaders(token)
  })
  if (!res.ok) { throw httpError(res, 'delete course') }
}

// ── One-time localStorage migration (the hardened cases pattern, 2026-07-10) ──
// Legacy key the courses used to live under ({ courses: [...] }), a COMPLETION
// flag and a per-id record of what already migrated — both PER ADVISOR, because
// the legacy store could hold courses for more than one local advisor id and
// each set must ride its own login.
const LEGACY_STORAGE_KEY = 'va_courses'
const MIGRATION_FLAG_PREFIX = 'va_courses_migrated_at::'
const MIGRATED_IDS_PREFIX = 'va_courses_migrated_ids::'

// Guards a re-entrant run (mounted() and the apiToken watcher can overlap).
let migrationInFlight = false

/**
 * One-time lift of any courses saved in this browser BEFORE the move to the
 * database, up into the DB via the API.
 *
 * - Completes at most once per browser PER ADVISOR. The flag is set ONLY when
 *   every legacy course of that advisor has actually migrated; a partial
 *   failure (backend down, token not yet resolved) leaves it unset so the next
 *   load retries.
 * - Tracks migrated ids and skips them on retry; the server's 409 duplicate
 *   answer also counts as "already landed" — a re-run can never duplicate.
 * - The legacy localStorage copy is NEVER deleted — it stays as a backup.
 * - Re-entrancy-safe; safe on the server (no localStorage → returns at once).
 *
 * @param {string} token - Bearer token
 * @param {string} advisorId - the advisor whose legacy courses to lift (the
 *   legacy store tagged each course with a local advisor id)
 * @returns {Promise<{migrated:number, total:number, failed?:number, complete?:boolean, skipped?:boolean}>}
 */
export async function migrateLegacyCourses (token, advisorId) {
  if (typeof localStorage === 'undefined' || !advisorId) { return { migrated: 0, total: 0, skipped: true } }
  const flagKey = MIGRATION_FLAG_PREFIX + advisorId
  const idsKey = MIGRATED_IDS_PREFIX + advisorId
  if (localStorage.getItem(flagKey)) { return { migrated: 0, total: 0, skipped: true } }
  if (migrationInFlight) { return { migrated: 0, total: 0, skipped: true } }
  migrationInFlight = true

  try {
    let legacy
    try { legacy = (JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || '{}').courses) || [] } catch (e) { legacy = [] }
    const mine = legacy.filter(c => c && c.id && c.advisorId === advisorId && c.outline)
    if (mine.length === 0) {
      localStorage.setItem(flagKey, new Date().toISOString())
      return { migrated: 0, total: 0, complete: true }
    }

    let done
    try { done = new Set(JSON.parse(localStorage.getItem(idsKey) || '[]')) } catch (e) { done = new Set() }

    let migrated = 0
    let failed = 0
    for (const c of mine) {
      if (done.has(c.id)) { continue } // landed in an earlier run
      try {
        await createCourse({
          id: c.id, // preserve the original id
          status: c.status,
          visibility: c.visibility,
          outline: c.outline,
          progress: c.progress,
          designHistory: c.designHistory
        }, token)
        done.add(c.id)
        migrated++
      } catch (e) {
        if (e && e.status === 409) {
          done.add(c.id) // already on the server — counts as migrated
        } else {
          failed++ // leave for a later retry; the legacy backup is intact
        }
      }
    }

    localStorage.setItem(idsKey, JSON.stringify(Array.from(done)))

    const allDone = mine.every(c => done.has(c.id))
    if (allDone) {
      localStorage.setItem(flagKey, new Date().toISOString())
      localStorage.removeItem(idsKey)
    }
    return { migrated, total: mine.length, failed, complete: allDone }
  } finally {
    migrationInFlight = false
  }
}
