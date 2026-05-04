'use strict'

/**
 * CourseReminderService — integration point for the platform's email/SMS notification system.
 *
 * Platform team: replace the stub methods below with calls to the existing
 * notification infrastructure. The data contract for each method is documented
 * in the JSDoc comments. Do not change the method signatures — the course
 * middleware calls these directly.
 *
 * Phase 1: stubs only (logs to console, no messages sent).
 * Phase 2: platform team wires to existing email/SMS pipeline.
 */

class CourseReminderService {
  /**
   * Schedule a reminder for an advisor who has an outstanding course session.
   * Called when a session has not been completed within the expected window.
   *
   * @param {object} params
   * @param {string} params.advisorId    - Platform account ID of the advisor
   * @param {string} params.courseId     - UUID of the course
   * @param {number} params.sessionId    - 1-based session index that is overdue
   * @param {string} params.sessionTitle - Human-readable session name for the notification body
   * @param {string} params.dueDate      - ISO 8601 date string when the session was expected
   */
  static scheduleReminder ({ advisorId, courseId, sessionId, sessionTitle, dueDate }) {
    // TODO: Platform team — wire to existing email/SMS notification system.
    // Example payload to send to your notification API:
    // POST /platform-api/notifications/schedule
    // { advisorId, type: 'course_session_reminder', courseId, sessionId, sessionTitle, dueDate }
    console.log('[CourseReminderService] scheduleReminder (stub — not connected to platform)', {
      advisorId, courseId, sessionId, sessionTitle, dueDate
    })
  }

  /**
   * Cancel a previously scheduled reminder.
   * Called when an advisor completes a session before the reminder fires.
   *
   * @param {object} params
   * @param {string} params.advisorId - Platform account ID
   * @param {string} params.courseId  - Course UUID
   * @param {number} params.sessionId - Session index to cancel reminder for
   */
  static cancelReminder ({ advisorId, courseId, sessionId }) {
    // TODO: Platform team — cancel the scheduled notification.
    // Example: DELETE /platform-api/notifications/course/{courseId}/session/{sessionId}
    console.log('[CourseReminderService] cancelReminder (stub — not connected to platform)', {
      advisorId, courseId, sessionId
    })
  }

  /**
   * Mark a session as complete and cancel any pending reminder.
   * Convenience method — calls cancelReminder internally.
   *
   * @param {object} params
   * @param {string} params.advisorId - Platform account ID
   * @param {string} params.courseId  - Course UUID
   * @param {number} params.sessionId - Session index completed
   * @param {number} params.score     - Quiz score (0–100)
   */
  static markComplete ({ advisorId, courseId, sessionId, score }) {
    this.cancelReminder({ advisorId, courseId, sessionId })
    // TODO: Platform team — optionally post completion event to reporting API.
    // POST /platform-api/courses/progress
    // { advisorId, courseId, sessionId, score, completedAt: new Date().toISOString() }
    console.log('[CourseReminderService] markComplete (stub — not connected to platform)', {
      advisorId, courseId, sessionId, score
    })
  }
}

module.exports = CourseReminderService
