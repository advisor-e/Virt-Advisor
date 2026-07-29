'use strict'

/**
 * Activity routes — capability progression data for advisors and firm managers.
 *
 * POST /api/activity/log-course        — log a completed course session
 * GET  /api/activity/progression       — advisor's own tier progression view
 * GET  /api/activity/team              — firm manager's team overview
 *
 * SECURITY: advisorId and firmId are derived from the verified JWT (firmAuth
 * middleware attaches req.advisorId / req.firmId) — never trusted from the
 * client request. This prevents one advisor or firm reading another's data.
 * The team-overview route additionally requires a firm-manager role.
 */

const activityStore = require('../utils/activityStore')
const { logCourseSession } = require('../utils/activityLogger')
const { sendError } = require('../utils/sendError')

const TIERS = ['entry-level', 'intermediate', 'advanced']

function emptyTier () {
  return { vaSessions: 0, courseSessions: 0, avgQuizScore: null, lastActive: null }
}

/**
 * Log a completed course session for the authenticated advisor.
 *
 * @route POST /api/activity/log-course
 * @param {object} req.body - session detail only (no identity): { courseId, courseTitle,
 *   courseTopic, sessionIndex, sessionTitle, sessionResources, quizScore }
 * @param {string} req.advisorId - advisor identity from the verified JWT (firmAuth)
 * @param {string} req.firmId - firm identity from the verified JWT (firmAuth)
 * @returns {200} { success: true }
 * @returns {403} NO_ADVISOR_IDENTITY · {400} MISSING_FIELDS (standard error envelope)
 */
async function logCourse (req, res) {
  // Identity comes from the verified JWT, not the request body.
  const advisorId = req.advisorId
  const firmId = req.firmId
  const {
    courseId, courseTitle, courseTopic,
    sessionIndex, sessionTitle, sessionResources, quizScore
  } = req.body || {}

  if (!advisorId) {
    sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify an advisor')
    return
  }

  if (!courseId || sessionIndex === undefined) {
    sendError(res, 400, 'MISSING_FIELDS', 'courseId and sessionIndex are required')
    return
  }

  await logCourseSession({
    advisorId: String(advisorId).slice(0, 64),
    // From the verified JWT, like the ids — never from the body.
    advisorName: req.advisorName || null,
    firmId: String(firmId).slice(0, 64),
    courseId: String(courseId).slice(0, 64),
    courseTitle: String(courseTitle || '').slice(0, 255),
    courseTopic: courseTopic ? String(courseTopic).slice(0, 255) : null,
    sessionIndex: Number(sessionIndex),
    sessionTitle: String(sessionTitle || '').slice(0, 255),
    sessionResources: Array.isArray(sessionResources) ? sessionResources : [],
    quizScore: (quizScore !== null && quizScore !== undefined) ? Number(quizScore) : null
  })

  res.send(200, { success: true })
}

/**
 * Return the authenticated advisor's own tier-progression view.
 *
 * @route GET /api/activity/progression
 * @param {string} req.advisorId - advisor identity from the verified JWT (firmAuth); the
 *   only advisor whose data is returned — a client cannot request another advisor's record
 * @param {string} req.firmId - firm identity from the verified JWT (firmAuth)
 * @returns {200} { success: true, advisorId, tiers, unclassifiedSessions, recentActivity }
 *   — `unclassifiedSessions` counts completed sessions the tier lookup could not place;
 *   they appear in `recentActivity` with a null tier and in no tier's counts.
 * @returns {403} NO_ADVISOR_IDENTITY · {500} DB_ERROR (standard error envelope)
 */
async function getProgression (req, res) {
  // Advisor and firm both come from the verified JWT — an advisor can only
  // ever read their own progression, never another's.
  const advisorId = req.advisorId
  const firmId = req.firmId

  if (!advisorId) {
    sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify an advisor')
    return
  }

  try {
    const { vaSessions, courseSessions } = await activityStore.readAdvisorSessions(advisorId, firmId)

    // Aggregate per tier
    const tiers = Object.fromEntries(TIERS.map(t => [t, emptyTier()]))
    // Sessions the tier lookup could not place. Counted and reported rather than
    // dropped: a session with no recommended tool, or one built only on the
    // role-based "Get Organised" pages, has no capability tier by design
    // (server/utils/tierLookup.js) — but it is still work the advisor did, and
    // silently omitting it understates their record.
    let unclassifiedSessions = 0

    for (const row of vaSessions) {
      const t = row.highest_tier
      if (!t || !tiers[t]) { unclassifiedSessions++; continue }
      tiers[t].vaSessions++
      if (!tiers[t].lastActive || row.completed_at > tiers[t].lastActive) {
        tiers[t].lastActive = row.completed_at
      }
    }

    const courseScores = {}
    for (const row of courseSessions) {
      const t = row.highest_tier
      if (!t || !tiers[t]) { unclassifiedSessions++; continue }
      tiers[t].courseSessions++
      if (!tiers[t].lastActive || row.completed_at > tiers[t].lastActive) {
        tiers[t].lastActive = row.completed_at
      }
      if (row.quiz_score !== null) {
        if (!courseScores[t]) { courseScores[t] = [] }
        courseScores[t].push(row.quiz_score)
      }
    }

    for (const t of TIERS) {
      if (courseScores[t] && courseScores[t].length) {
        const sum = courseScores[t].reduce((a, b) => a + b, 0)
        tiers[t].avgQuizScore = Math.round(sum / courseScores[t].length)
      }
    }

    // Recent combined activity (last 10 across both sources)
    const recentVA = vaSessions.slice(0, 20).map(r => ({
      type: 'va', domain: r.domain, tier: r.highest_tier, completedAt: r.completed_at
    }))
    const recentCourse = courseSessions.slice(0, 20).map(r => ({
      type: 'course',
courseTitle: r.course_title,
sessionTitle: r.session_title,
      quizScore: r.quiz_score,
tier: r.highest_tier,
completedAt: r.completed_at
    }))
    const recentActivity = [...recentVA, ...recentCourse]
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
      .slice(0, 10)

    res.send(200, { success: true, advisorId, tiers, unclassifiedSessions, recentActivity })
  } catch (err) {
    console.error('[activity] getProgression error:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not load progression data')
  }
}

/**
 * Return the authenticated manager's firm-wide team progression overview.
 * Manager/admin role is enforced upstream by the requireManagerRole middleware.
 *
 * @route GET /api/activity/team
 * @param {string} req.firmId - firm identity from the verified JWT (firmAuth); the only
 *   firm whose team is returned — a client cannot request another firm's data
 * @returns {200} { success: true, firmId, advisors } — each advisor carries per-tier
 *   counts, an `unclassifiedSessions` tally for work no tier could hold, a `totalSessions`
 *   figure that includes it, and the date they were last active at anything.
 * @returns {400} MISSING_PARAMS · {500} DB_ERROR (standard error envelope)
 */
async function getTeam (req, res) {
  // Firm comes from the verified JWT — a manager can only ever see their own
  // firm's team. Role is already enforced by requireManagerRole middleware.
  const firmId = req.firmId

  if (!firmId) {
    sendError(res, 400, 'MISSING_PARAMS', 'firmId is required')
    return
  }

  try {
    const { vaRows, courseRows } = await activityStore.readFirmSessions(firmId)

    // Build per-advisor map
    const advisorMap = {}

    const ensureAdvisor = (id) => {
      if (!advisorMap[id]) {
        advisorMap[id] = {
          advisorId: id,
          // Display name captured when this advisor did the work, from their own
          // verified token. NOT looked up at read time: the manager's token carries
          // the manager's name, never a colleague's. Null until Advisor-e includes a
          // name claim, and the screen falls back to the ID rather than inventing one.
          advisorName: null,
          tiers: Object.fromEntries(TIERS.map(t => [t, { vaSessions: 0, courseSessions: 0, avgQuizScore: null }])),
          // Sessions with no capability tier (see getProgression above for why they
          // occur). Counted here so an advisor whose work is ALL unclassified is
          // listed with their real activity instead of reading as someone who has
          // done nothing — which is what a manager saw before 2026-07-29.
          unclassifiedSessions: 0,
          lastActive: null
        }
      }
      return advisorMap[id]
    }

    /**
     * Fold one grouped row into an advisor's summary: when they were last active, and
     * the display name to show them by.
     *
     * Both live outside the tier check on purpose. A session with no capability tier
     * is still a session — before 2026-07-29 the date was read inside that check, so
     * an advisor's most recent work was invisible if it happened to be unclassified,
     * and the same would be true of their name.
     *
     * The name from the MOST RECENTLY ACTIVE group wins, so an advisor who changed
     * their name is shown the current one. Any name is better than none, so a name on
     * an older row is still taken when nothing newer carries one.
     *
     * @param {object} a - the advisor summary being built.
     * @param {object} row - one grouped row from the store.
     */
    const noteActivity = (a, row) => {
      if (!a.lastActive || row.last_active > a.lastActive) {
        a.lastActive = row.last_active
        if (row.advisor_name) { a.advisorName = row.advisor_name }
      }
      if (!a.advisorName && row.advisor_name) { a.advisorName = row.advisor_name }
    }

    for (const row of vaRows) {
      const a = ensureAdvisor(row.advisor_id)
      const t = row.highest_tier
      if (t && a.tiers[t]) {
        a.tiers[t].vaSessions = Number(row.count)
      } else {
        a.unclassifiedSessions += Number(row.count)
      }
      noteActivity(a, row)
    }

    for (const row of courseRows) {
      const a = ensureAdvisor(row.advisor_id)
      const t = row.highest_tier
      if (t && a.tiers[t]) {
        a.tiers[t].courseSessions = Number(row.count)
        if (row.avg_score !== null) {
          a.tiers[t].avgQuizScore = Math.round(Number(row.avg_score))
        }
      } else {
        // Counted, but its quiz scores are not averaged anywhere: an average
        // belongs to a capability tier, and these rows have none.
        a.unclassifiedSessions += Number(row.count)
      }
      noteActivity(a, row)
    }

    const advisors = Object.values(advisorMap).map(a => ({
      ...a,
      // Everything the advisor did, including the sessions no tier could hold.
      totalSessions: TIERS.reduce(
        (sum, t) => sum + a.tiers[t].vaSessions + a.tiers[t].courseSessions, 0
      ) + a.unclassifiedSessions
    })).sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive))

    res.send(200, { success: true, firmId, advisors })
  } catch (err) {
    console.error('[activity] getTeam error:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not load team data')
  }
}

module.exports = { logCourse, getProgression, getTeam }
