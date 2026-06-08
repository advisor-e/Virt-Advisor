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

const db = require('../utils/db')
const { logCourseSession } = require('../utils/activityLogger')

const TIERS = ['entry-level', 'intermediate', 'advanced']

function emptyTier () {
  return { vaSessions: 0, courseSessions: 0, avgQuizScore: null, lastActive: null }
}

// ── POST /api/activity/log-course ─────────────────────────────────────────────

async function logCourse (req, res) {
  // Identity comes from the verified JWT, not the request body.
  const advisorId = req.advisorId
  const firmId = req.firmId
  const {
    courseId, courseTitle, courseTopic,
    sessionIndex, sessionTitle, sessionResources, quizScore
  } = req.body || {}

  if (!advisorId) {
    res.send(403, { success: false, error: { code: 'NO_ADVISOR_IDENTITY', message: 'Your session does not identify an advisor' } })
    return
  }

  if (!courseId || sessionIndex === undefined) {
    res.send(400, { success: false, error: { code: 'MISSING_FIELDS', message: 'courseId and sessionIndex are required' } })
    return
  }

  await logCourseSession({
    advisorId: String(advisorId).slice(0, 64),
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
  return
}

// ── GET /api/activity/progression (advisor + firm from verified JWT) ─────────

async function getProgression (req, res) {
  // Advisor and firm both come from the verified JWT — an advisor can only
  // ever read their own progression, never another's.
  const advisorId = req.advisorId
  const firmId = req.firmId

  if (!advisorId) {
    res.send(403, { success: false, error: { code: 'NO_ADVISOR_IDENTITY', message: 'Your session does not identify an advisor' } })
    return
  }

  try {
    const [[vaSessions], [courseSessions]] = await Promise.all([
      db.execute(
        `SELECT highest_tier, domain, completed_at
         FROM advisor_va_sessions
         WHERE advisor_id = ? AND firm_id = ?
         ORDER BY completed_at DESC LIMIT 200`,
        [advisorId, firmId]
      ).catch(() => [[]]),
      db.execute(
        `SELECT course_id, course_title, session_index, session_title,
                quiz_score, highest_tier, completed_at
         FROM advisor_course_completions
         WHERE advisor_id = ? AND firm_id = ?
         ORDER BY completed_at DESC LIMIT 200`,
        [advisorId, firmId]
      ).catch(() => [[]])
    ])

    // Aggregate per tier
    const tiers = Object.fromEntries(TIERS.map(t => [t, emptyTier()]))

    for (const row of vaSessions) {
      const t = row.highest_tier
      if (!t || !tiers[t]) { continue }
      tiers[t].vaSessions++
      if (!tiers[t].lastActive || row.completed_at > tiers[t].lastActive) {
        tiers[t].lastActive = row.completed_at
      }
    }

    const courseScores = {}
    for (const row of courseSessions) {
      const t = row.highest_tier
      if (!t || !tiers[t]) { continue }
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

    res.send(200, { success: true, advisorId, tiers, recentActivity })
  } catch (err) {
    console.error('[activity] getProgression error:', err.message)
    res.send(500, { success: false, error: { code: 'DB_ERROR', message: 'Could not load progression data' } })
  }

  return
}

// ── GET /api/activity/team (firm from verified JWT; manager role required) ───

async function getTeam (req, res) {
  // Firm comes from the verified JWT — a manager can only ever see their own
  // firm's team. Role is already enforced by requireManagerRole middleware.
  const firmId = req.firmId

  if (!firmId) {
    res.send(400, { success: false, error: { code: 'MISSING_PARAMS', message: 'firmId is required' } })
    return
  }

  try {
    const [[vaRows], [courseRows]] = await Promise.all([
      db.execute(
        `SELECT advisor_id, highest_tier, COUNT(*) as count,
                MAX(completed_at) as last_active
         FROM advisor_va_sessions
         WHERE firm_id = ?
         GROUP BY advisor_id, highest_tier`,
        [firmId]
      ).catch(() => [[]]),
      db.execute(
        `SELECT advisor_id, highest_tier,
                COUNT(*) as count,
                AVG(quiz_score) as avg_score,
                MAX(completed_at) as last_active
         FROM advisor_course_completions
         WHERE firm_id = ?
         GROUP BY advisor_id, highest_tier`,
        [firmId]
      ).catch(() => [[]])
    ])

    // Build per-advisor map
    const advisorMap = {}

    const ensureAdvisor = (id) => {
      if (!advisorMap[id]) {
        advisorMap[id] = {
          advisorId: id,
          tiers: Object.fromEntries(TIERS.map(t => [t, { vaSessions: 0, courseSessions: 0, avgQuizScore: null }])),
          lastActive: null
        }
      }
      return advisorMap[id]
    }

    for (const row of vaRows) {
      const a = ensureAdvisor(row.advisor_id)
      const t = row.highest_tier
      if (t && a.tiers[t]) {
        a.tiers[t].vaSessions = Number(row.count)
        if (!a.lastActive || row.last_active > a.lastActive) { a.lastActive = row.last_active }
      }
    }

    for (const row of courseRows) {
      const a = ensureAdvisor(row.advisor_id)
      const t = row.highest_tier
      if (t && a.tiers[t]) {
        a.tiers[t].courseSessions = Number(row.count)
        if (row.avg_score !== null) {
          a.tiers[t].avgQuizScore = Math.round(Number(row.avg_score))
        }
        if (!a.lastActive || row.last_active > a.lastActive) { a.lastActive = row.last_active }
      }
    }

    const advisors = Object.values(advisorMap).map(a => ({
      ...a,
      totalSessions: TIERS.reduce((sum, t) => sum + a.tiers[t].vaSessions + a.tiers[t].courseSessions, 0)
    })).sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive))

    res.send(200, { success: true, firmId, advisors })
  } catch (err) {
    console.error('[activity] getTeam error:', err.message)
    res.send(500, { success: false, error: { code: 'DB_ERROR', message: 'Could not load team data' } })
  }

  return
}

module.exports = { logCourse, getProgression, getTeam }
