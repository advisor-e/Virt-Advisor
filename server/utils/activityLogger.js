'use strict'

/**
 * activityLogger — fire-and-forget DB writes for advisor activity tracking.
 *
 * Both functions swallow errors internally so a DB failure never interrupts
 * an active advisor session or course. Errors are logged to console only.
 *
 * INTEGRATION NOTE (for Advisor-e team):
 *   advisorId and firmId currently come from the client request body.
 *   Replace with JWT-derived values once the auth layer is wired in.
 */

const db = require('./db')
const { getHighestTier } = require('./tierLookup')

/**
 * Logs a completed VA client session to advisor_va_sessions.
 * Called once when happyConfirmed transitions to true in advisor.js.
 *
 * @param {string}   advisorId            - Advisor identifier (client-supplied; upgrade to JWT)
 * @param {string}   firmId               - Firm identifier (client-supplied; upgrade to JWT)
 * @param {string|null} domain            - Detected advisory domain (e.g. 'profit', 'staff')
 * @param {string[]} recommendedTemplates - Template titles extracted from Phase 3 response
 */
async function logVASession (advisorId, firmId, domain, recommendedTemplates) {
  if (!advisorId || !firmId) { return }
  try {
    const templates = Array.isArray(recommendedTemplates) ? recommendedTemplates : []
    const tier = getHighestTier(templates)
    await db.execute(
      `INSERT INTO advisor_va_sessions
         (advisor_id, firm_id, domain, recommended_templates, highest_tier)
       VALUES (?, ?, ?, ?, ?)`,
      [
        String(advisorId).slice(0, 64),
        String(firmId).slice(0, 64),
        domain ? String(domain).slice(0, 128) : null,
        templates.length ? JSON.stringify(templates) : null,
        tier
      ]
    )
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
    const tier = getHighestTier(resources)
    await db.execute(
      `INSERT IGNORE INTO advisor_course_completions
         (advisor_id, firm_id, course_id, course_title, course_topic,
          session_index, session_title, session_resources, quiz_score, highest_tier)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(advisorId).slice(0, 64),
        String(firmId).slice(0, 64),
        String(courseId).slice(0, 64),
        String(courseTitle || '').slice(0, 255),
        courseTopic ? String(courseTopic).slice(0, 255) : null,
        Number(sessionIndex),
        String(sessionTitle || '').slice(0, 255),
        resources.length ? JSON.stringify(resources) : null,
        (quizScore !== null && quizScore !== undefined) ? Number(quizScore) : null,
        tier
      ]
    )
  } catch (err) {
    console.error('[activityLogger] logCourseSession failed:', err.message)
  }
}

module.exports = { logVASession, logCourseSession }
