'use strict'

/**
 * activityLogger — fire-and-forget writes for advisor activity tracking.
 *
 * Both functions swallow errors internally so a storage failure never interrupts
 * an active advisor session or course. Errors are logged to console only. This
 * asymmetry with the READ path is deliberate: a read that fails must say so on
 * screen, a write that fails must never take an advisor's session down with it.
 *
 * Persistence (and the dev-file fallback that makes this work without MySQL) lives
 * in activityStore — see that file for why the fallback exists.
 *
 * IDENTITY: advisorId and firmId are derived by the route from the verified JWT
 * (firmAuth) and passed in. They are NOT taken from the client request body — an
 * earlier version of this comment said they were, which misdescribed the security
 * posture of the whole feature.
 */

const activityStore = require('./activityStore')
const { getHighestTier } = require('./tierLookup')

/**
 * Logs a completed VA client session to advisor_va_sessions.
 * Called once when happyConfirmed transitions to true in advisor.js.
 *
 * @param {string}   advisorId            - Advisor identifier (JWT-derived, from the route)
 * @param {string}   firmId               - Firm identifier (JWT-derived, from the route)
 * @param {string|null} domain            - Detected advisory domain (e.g. 'profit', 'staff')
 * @param {string[]} recommendedTemplates - Template titles extracted from Phase 3 response
 */
async function logVASession (advisorId, firmId, domain, recommendedTemplates) {
  if (!advisorId || !firmId) { return }
  try {
    const templates = Array.isArray(recommendedTemplates) ? recommendedTemplates : []
    await activityStore.recordVASession({
      advisorId: String(advisorId).slice(0, 64),
      firmId: String(firmId).slice(0, 64),
      domain: domain ? String(domain).slice(0, 128) : null,
      templates,
      // Computed at WRITE time and stored, never at read time: the catalogue changes,
      // and a session done in March must not silently change tier in July.
      tier: getHighestTier(templates)
    })
  } catch (err) {
    console.error('[activityLogger] logVASession failed:', err.message)
  }
}

/**
 * Logs a completed course session to advisor_course_completions.
 * Called when an advisor finishes (or skips) a quiz in CourseBuilder.
 * Uses INSERT IGNORE so a duplicate save attempt (e.g. double-click) is silently skipped.
 *
 * @param {object} params
 * @param {string}   params.advisorId       - Advisor identifier
 * @param {string}   params.firmId          - Firm identifier
 * @param {string}   params.courseId        - Course UUID from CourseBuilder
 * @param {string}   params.courseTitle     - Course title
 * @param {string}   [params.courseTopic]   - Course topic (outline.topic)
 * @param {number}   params.sessionIndex    - Zero-based session index
 * @param {string}   params.sessionTitle    - Session title
 * @param {string[]} [params.sessionResources] - Template names used as resources
 * @param {number|null} [params.quizScore]  - Quiz score 0–100, or null if skipped
 */
async function logCourseSession (params) {
  const {
 advisorId, firmId, courseId, courseTitle, courseTopic,
    sessionIndex, sessionTitle, sessionResources, quizScore
} = params || {}

  if (!advisorId || !firmId || !courseId) { return }
  try {
    const resources = Array.isArray(sessionResources) ? sessionResources : []
    await activityStore.recordCourseSession({
      advisorId: String(advisorId).slice(0, 64),
      firmId: String(firmId).slice(0, 64),
      courseId: String(courseId).slice(0, 64),
      courseTitle: String(courseTitle || '').slice(0, 255),
      courseTopic: courseTopic ? String(courseTopic).slice(0, 255) : null,
      sessionIndex: Number(sessionIndex),
      sessionTitle: String(sessionTitle || '').slice(0, 255),
      resources,
      quizScore: (quizScore !== null && quizScore !== undefined) ? Number(quizScore) : null,
      tier: getHighestTier(resources)
    })
  } catch (err) {
    console.error('[activityLogger] logCourseSession failed:', err.message)
  }
}

module.exports = { logVASession, logCourseSession }
