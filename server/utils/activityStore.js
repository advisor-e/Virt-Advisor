'use strict'

/**
 * activityStore — persistence for advisor activity (`advisor_va_sessions` and
 * `advisor_course_completions`), with the DEV/TEST-ONLY JSON fallback every other
 * store in this app already had.
 *
 * WHY THIS EXISTS (2026-07-29). Case studies, courses, clients, firm overlays and
 * firm content all try MySQL and, outside production, fall back to a gitignored
 * JSON file so the screens are usable locally. Activity was the ONE store without
 * it — which is the whole reason "My Progress" and "Team Progress" have never shown
 * anything. Two real course sessions completed on 2026-07-28 (scoring 70 and 73)
 * were lost for exactly this reason. Provisioning MySQL was never the only route to
 * a working screen; the missing stub was.
 *
 * The SQL is unchanged and still lives here verbatim, so the routes' aggregation —
 * which is what the tests exercise — is untouched by this change.
 *
 * Fidelity note: the fallback reproduces what mysql2 actually returns, including
 * COUNT/AVG arriving as STRINGS and AVG ignoring NULL scores. Returning tidy
 * numbers instead would let a dropped Number() pass locally and fail in production.
 *
 * DEV/TEST ONLY: this is not production persistence — no concurrency safety, no
 * real access boundary. In production a DB failure propagates untouched, so an
 * outage is never masked (the honest-failure rule, 2026-07-29).
 */

const path = require('path')
const fs = require('fs')
const db = require('./db')

// Default dev fallback file; overridable via ACTIVITY_DEV_FILE so tests can point at
// an isolated temp file (hermetic `npm test`, immune to a live backend writing the
// shared file). Production never sets this — it uses MySQL.
const DEV_ACTIVITY_FILE = process.env.ACTIVITY_DEV_FILE
  ? path.resolve(process.env.ACTIVITY_DEV_FILE)
  : path.resolve(__dirname, '../../data/dev-activity.json')

/**
 * Whether the DEV/TEST-ONLY JSON fallback may stand in for an unavailable DB.
 * Read at call-time so a production DB failure always propagates.
 * @returns {boolean}
 */
function devFallbackEnabled () {
  return process.env.NODE_ENV !== 'production'
}

const SQL_ADVISOR_VA =
  `SELECT highest_tier, domain, completed_at
         FROM advisor_va_sessions
         WHERE advisor_id = ? AND firm_id = ?
         ORDER BY completed_at DESC LIMIT 200`

const SQL_ADVISOR_COURSE =
  `SELECT course_id, course_title, session_index, session_title,
                quiz_score, highest_tier, completed_at
         FROM advisor_course_completions
         WHERE advisor_id = ? AND firm_id = ?
         ORDER BY completed_at DESC LIMIT 200`

// MAX(advisor_name) picks one name per group deterministically rather than the very
// latest. The route then takes the name from whichever group was most recently active,
// which is what matters: names change rarely, and picking a stale one for an advisor
// who has not worked recently is not worth a correlated subquery.
const SQL_TEAM_VA =
  `SELECT advisor_id, MAX(advisor_name) as advisor_name, highest_tier, COUNT(*) as count,
                MAX(completed_at) as last_active
         FROM advisor_va_sessions
         WHERE firm_id = ?
         GROUP BY advisor_id, highest_tier`

const SQL_TEAM_COURSE =
  `SELECT advisor_id, MAX(advisor_name) as advisor_name, highest_tier,
                COUNT(*) as count,
                AVG(quiz_score) as avg_score,
                MAX(completed_at) as last_active
         FROM advisor_course_completions
         WHERE firm_id = ?
         GROUP BY advisor_id, highest_tier`

const SQL_INSERT_VA =
  `INSERT INTO advisor_va_sessions
         (advisor_id, advisor_name, firm_id, domain, recommended_templates, highest_tier)
       VALUES (?, ?, ?, ?, ?, ?)`

const SQL_INSERT_COURSE =
  `INSERT IGNORE INTO advisor_course_completions
         (advisor_id, advisor_name, firm_id, course_id, course_title, course_topic,
          session_index, session_title, session_resources, quiz_score, highest_tier)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

// ── Reads ─────────────────────────────────────────────────────────────────────

/**
 * One advisor's own sessions, newest first, capped at 200 per source.
 *
 * @param {string} advisorId - from the verified JWT, never the client.
 * @param {string} firmId - from the verified JWT.
 * @returns {Promise<{vaSessions: object[], courseSessions: object[]}>} raw rows.
 */
async function readAdvisorSessions (advisorId, firmId) {
  try {
    const [[vaSessions], [courseSessions]] = await Promise.all([
      db.execute(SQL_ADVISOR_VA, [advisorId, firmId]),
      db.execute(SQL_ADVISOR_COURSE, [advisorId, firmId])
    ])
    return { vaSessions, courseSessions }
  } catch (err) {
    if (!devFallbackEnabled()) { throw err }
    _warnFallback('readAdvisorSessions', err)
    const all = _devReadAll()
    return {
      vaSessions: _mine(all.vaSessions, advisorId, firmId),
      courseSessions: _mine(all.courseSessions, advisorId, firmId)
    }
  }
}

/**
 * A firm's sessions grouped per advisor and tier, as the GROUP BY returns them.
 *
 * @param {string} firmId - from the verified JWT.
 * @returns {Promise<{vaRows: object[], courseRows: object[]}>} grouped rows.
 */
async function readFirmSessions (firmId) {
  try {
    const [[vaRows], [courseRows]] = await Promise.all([
      db.execute(SQL_TEAM_VA, [firmId]),
      db.execute(SQL_TEAM_COURSE, [firmId])
    ])
    return { vaRows, courseRows }
  } catch (err) {
    if (!devFallbackEnabled()) { throw err }
    _warnFallback('readFirmSessions', err)
    const all = _devReadAll()
    return {
      vaRows: _group(all.vaSessions.filter(r => r.firm_id === firmId), false),
      courseRows: _group(all.courseSessions.filter(r => r.firm_id === firmId), true)
    }
  }
}

// ── Writes ────────────────────────────────────────────────────────────────────

/**
 * Record a completed VA client session.
 *
 * @param {object} row - { advisorId, firmId, domain, templates, tier }
 * @returns {Promise<void>}
 */
async function recordVASession (row) {
  const templates = row.templates && row.templates.length ? JSON.stringify(row.templates) : null
  try {
    await db.execute(SQL_INSERT_VA,
      [row.advisorId, row.advisorName || null, row.firmId, row.domain, templates, row.tier])
  } catch (err) {
    if (!devFallbackEnabled()) { throw err }
    _warnFallback('recordVASession', err)
    const all = _devReadAll()
    all.vaSessions.push({
      advisor_id: row.advisorId,
      advisor_name: row.advisorName || null,
      firm_id: row.firmId,
      domain: row.domain,
      recommended_templates: templates,
      highest_tier: row.tier,
      completed_at: _now()
    })
    _devWriteAll(all)
  }
}

/**
 * Record a completed course session.
 *
 * The DB has a unique key on (advisor_id, course_id, session_index) and uses
 * INSERT IGNORE, so a double submit is silently skipped. The fallback reproduces
 * that — without it, replaying a session locally would inflate an advisor's record.
 *
 * @param {object} row - { advisorId, firmId, courseId, courseTitle, courseTopic,
 *   sessionIndex, sessionTitle, resources, quizScore, tier }
 * @returns {Promise<void>}
 */
async function recordCourseSession (row) {
  const resources = row.resources && row.resources.length ? JSON.stringify(row.resources) : null
  try {
    await db.execute(SQL_INSERT_COURSE, [
      row.advisorId, row.advisorName || null, row.firmId, row.courseId, row.courseTitle,
      row.courseTopic, row.sessionIndex, row.sessionTitle, resources, row.quizScore, row.tier
    ])
  } catch (err) {
    if (!devFallbackEnabled()) { throw err }
    _warnFallback('recordCourseSession', err)
    const all = _devReadAll()
    const duplicate = all.courseSessions.some(r =>
      r.advisor_id === row.advisorId &&
      r.course_id === row.courseId &&
      r.session_index === row.sessionIndex)
    if (duplicate) { return }
    all.courseSessions.push({
      advisor_id: row.advisorId,
      advisor_name: row.advisorName || null,
      firm_id: row.firmId,
      course_id: row.courseId,
      course_title: row.courseTitle,
      course_topic: row.courseTopic,
      session_index: row.sessionIndex,
      session_title: row.sessionTitle,
      session_resources: resources,
      quiz_score: row.quizScore,
      highest_tier: row.tier,
      completed_at: _now()
    })
    _devWriteAll(all)
  }
}

// ── Dev fallback internals ────────────────────────────────────────────────────
// Only reached when the DB is unavailable AND devFallbackEnabled().

/** Said once per call rather than swallowed: a silent fallback is how data goes missing. */
function _warnFallback (op, err) {
  console.warn(`[activityStore] ${op}: database unavailable (${err.message}) — using the dev file. NOT production persistence.`)
}

/** MySQL DATETIME shape, so dev rows sort and render exactly like real ones. */
function _now () {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

/**
 * Read the dev file, keeping the honest-failure rule (2026-07-29) intact INSIDE the
 * fallback: only a file that does not exist yet is legitimately empty — nothing has
 * been recorded. A file that exists but cannot be read or parsed is a fault, and it
 * is thrown so the screen says so. Swallowing it here would rebuild, one layer down,
 * the exact defect this feature just had: a broken store looking like a new advisor.
 *
 * @returns {{vaSessions: object[], courseSessions: object[]}}
 * @throws when the dev file exists but is unreadable or malformed.
 */
function _devReadAll () {
  let raw
  try {
    raw = fs.readFileSync(DEV_ACTIVITY_FILE, 'utf8')
  } catch (e) {
    if (e.code === 'ENOENT') { return { vaSessions: [], courseSessions: [] } }
    throw e
  }
  const parsed = JSON.parse(raw)
  return {
    vaSessions: Array.isArray(parsed.vaSessions) ? parsed.vaSessions : [],
    courseSessions: Array.isArray(parsed.courseSessions) ? parsed.courseSessions : []
  }
}

function _devWriteAll (all) {
  try {
    fs.writeFileSync(DEV_ACTIVITY_FILE, JSON.stringify(all, null, 2), 'utf8')
  } catch (e) {
    console.error('[activityStore] could not write the dev file:', e.message)
  }
}

/** WHERE advisor_id = ? AND firm_id = ? ORDER BY completed_at DESC LIMIT 200. */
function _mine (rows, advisorId, firmId) {
  return rows
    .filter(r => r.advisor_id === advisorId && r.firm_id === firmId)
    .sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)))
    .slice(0, 200)
}

/**
 * GROUP BY advisor_id, highest_tier — COUNT(*), MAX(completed_at) and, for course
 * rows, AVG(quiz_score).
 *
 * Two behaviours are copied from SQL on purpose: a NULL tier forms its OWN group
 * (which is what makes unclassified sessions countable), and AVG ignores NULL
 * scores entirely rather than treating a skipped quiz as a zero.
 *
 * @param {object[]} rows - rows already filtered to one firm.
 * @param {boolean} withAverage - include AVG(quiz_score).
 * @returns {object[]} grouped rows, counts and averages as STRINGS like mysql2's.
 */
function _group (rows, withAverage) {
  const groups = new Map()
  for (const row of rows) {
    const key = `${row.advisor_id} ${row.highest_tier === undefined ? null : row.highest_tier}`
    let g = groups.get(key)
    if (!g) {
      g = { advisor_id: row.advisor_id, advisor_name: null, highest_tier: row.highest_tier || null, count: 0, last_active: null, _scores: [] }
      groups.set(key, g)
    }
    g.count++
    // MAX(advisor_name) in the SQL; the same deterministic pick here.
    if (row.advisor_name && (!g.advisor_name || row.advisor_name > g.advisor_name)) {
      g.advisor_name = row.advisor_name
    }
    if (!g.last_active || String(row.completed_at) > String(g.last_active)) {
      g.last_active = row.completed_at
    }
    if (row.quiz_score !== null && row.quiz_score !== undefined) { g._scores.push(Number(row.quiz_score)) }
  }

  return Array.from(groups.values()).map((g) => {
    const out = {
      advisor_id: g.advisor_id,
      advisor_name: g.advisor_name,
      highest_tier: g.highest_tier,
      count: String(g.count),
      last_active: g.last_active
    }
    if (withAverage) {
      out.avg_score = g._scores.length
        ? (g._scores.reduce((a, b) => a + b, 0) / g._scores.length).toFixed(4)
        : null
    }
    return out
  })
}

module.exports = {
  readAdvisorSessions,
  readFirmSessions,
  recordVASession,
  recordCourseSession,
  // Exported for tests and for anything needing to reason about the fallback.
  devFallbackEnabled,
  DEV_ACTIVITY_FILE
}
