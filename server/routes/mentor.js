'use strict'

const { sendError } = require('../utils/sendError')
const caseStore = require('../utils/caseStore')

/**
 * Mentor routes — the cross-firm review surface. These deliberately cross the
 * firm boundary (every other case read is firm-scoped), so they are gated to the
 * mentor role at the mount (requireMentorRole) and only ever return cases a firm
 * manager explicitly approved for the mentor, in their anonymised form.
 */

/**
 * GET /api/mentor/cases — every mentor-shared case across all firms, anonymised
 * and advisor-stripped, most-recently-shared first. For the Mentor view, where
 * the mentor reviews real sessions to improve the app's accuracy.
 * @route GET /api/mentor/cases
 * @returns {200} { success: true, cases: object[] }
 * @returns {500} DB_ERROR
 */
async function listMentorCases (req, res) {
  try {
    const cases = await caseStore.listSharedWithMentor()
    res.send(200, { success: true, cases })
  } catch (err) {
    console.error('[mentor] listMentorCases failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not load shared case studies')
  }
}

module.exports = { listMentorCases }
