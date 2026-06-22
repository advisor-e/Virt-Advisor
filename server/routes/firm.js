'use strict'

/**
 * Firm manager API routes.
 *
 * GET  /api/firm/advisors  — returns all advisors + course progress for a firm
 * POST /api/firm/insights  — returns AI-generated team learning insight
 *
 * TODO (database hookup):
 *   Both handlers are stubbed. Replace the placeholder logic in each with
 *   a real MySQL query using the db connection from server/utils/db.js (TBD).
 *   Suggested schema:
 *
 *   advisors          (id, firm_id, name, email, role)
 *   courses           (id, advisor_id, firm_id, title, status, visibility, created_at)
 *   course_sessions   (id, course_id, session_num, title, focus, status, quiz_score, completed_at)
 *
 * TODO (OpenAI hookup):
 *   The insights handler currently returns a placeholder. Wire it to OpenAI
 *   using the backend REST client (server/utils/openaiClient.js -> createOpenAIClient),
 *   NOT the openai SDK (Stack Constitution Req 7). The prompt should receive
 *   summaryStats + per-advisor progress as context (strip DB IDs/PII first).
 */

const { sendError } = require('../utils/sendError')

// ── GET /api/firm/advisors ──────────────────────────────────────────────────

function getAdvisors (req, res, next) {
  // req.firmId available for DB query when stubs are wired up
  try {
    // TODO: replace with DB query
    // const advisors = await db.query(
    //   `SELECT a.id, a.name, a.email,
    //           c.id AS course_id, c.title, c.status, c.updated_at AS last_active,
    //           cs.session_num, cs.title AS session_title, cs.status AS session_status, cs.quiz_score
    //    FROM advisors a
    //    LEFT JOIN courses c ON c.advisor_id = a.id AND c.firm_id = ?
    //    LEFT JOIN course_sessions cs ON cs.course_id = c.id
    //    WHERE a.firm_id = ?
    //    ORDER BY a.name, c.id, cs.session_num`,
    //   [firmId, firmId]
    // )
    // return res.json(shapeFirmData(advisors))

    // Stub — returns empty; FirmDashboard.vue uses its own mock data for now
    res.json({ advisors: [] })
    return next()
  } catch (err) {
    console.error('[firm:advisors]', err.message)
    return sendError(res, 500, 'Failed to load advisor data')
  }
}

// ── POST /api/firm/insights ─────────────────────────────────────────────────

function postInsights (req, res, next) {
  // req.firmId available for OpenAI/DB hookup when stubs are wired up
  try {
    // TODO: wire to OpenAI via the backend REST client (server/utils/openaiClient.js ->
    // createOpenAIClient) — NOT the openai SDK (Stack Constitution Req 7). Build the prompt
    // with buildInsightPrompt(summaryStats, advisors), call chat-completions, and return
    // { insight }. Strip DB IDs/PII from the stats before sending to the model.

    // Stub — FirmDashboard.vue generates its own mock insight for now
    res.json({ insight: '' })
    return next()
  } catch (err) {
    console.error('[firm:insights]', err.message)
    return sendError(res, 500, 'Failed to generate insights')
  }
}

// ── Prompt builder (ready for OpenAI hookup) ────────────────────────────────
// Called by postInsights once the DB/OpenAI wiring is in place.
// Receives summaryStats { activeLearners, coursesRunning, completionRate, avgQuizScore }
// and advisors array matching the DB schema shape.

function buildInsightPrompt (stats, advisorList) {
  const lines = [
    'You are a learning analytics assistant for a financial advisory firm.',
    'Write a 2-3 sentence plain-English summary of the team\'s learning progress below.',
    'Be specific. Note any advisors who may need a follow-up. Do not use bullet points.',
    '',
    `Active learners: ${stats.activeLearners}`,
    `Courses running: ${stats.coursesRunning}`,
    `Completion rate: ${stats.completionRate}%`,
    `Average quiz score: ${stats.avgQuizScore}%`,
    '',
    'Advisor breakdown:'
  ]
  for (const a of (advisorList || [])) {
    for (const c of (a.courses || [])) {
      const done = (c.sessions || []).filter(s => s.status === 'complete').length
      const total = (c.sessions || []).length
      lines.push(`- ${a.name}: "${c.title}" — ${done}/${total} sessions complete, status: ${c.status}`)
    }
  }
  return lines.join('\n')
}

module.exports = { getAdvisors, postInsights, buildInsightPrompt }
