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
const { firmsUnderScope } = require('./tierChain')

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

// recommended_templates / session_resources are selected for the CPD record, which
// works out what an advisor may claim from the templates their own work actually
// used. Additive: the progression and quiz-detail aggregations read named fields and
// are unaffected by the extra column.
const SQL_ADVISOR_VA =
  `SELECT highest_tier, domain, recommended_templates, completed_at
         FROM advisor_va_sessions
         WHERE advisor_id = ? AND firm_id = ?
         ORDER BY completed_at DESC LIMIT 200`

const SQL_ADVISOR_COURSE =
  `SELECT course_id, course_title, session_index, session_title, session_resources,
                quiz_score, quiz_questions, highest_tier, completed_at
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

// ── Adoption (mentor, cross-firm) ────────────────────────────────────────────
// COUNTS ONLY, and no advisor_id or advisor_name is selected by any of the three.
// The distinction matters: this is the one aggregation in this file that leaves
// the firm boundary, and the safest way for a name not to reach that payload is
// for it never to be read. See server/utils/mentorAdoption.js.
//
// THREE QUERIES, NOT ONE, and the third is not redundant. The two kinds of work
// live in different tables, and ADVISERS CANNOT BE ADDED UP — an adviser who did
// both a session and a course is one person, so summing the per-table counts
// would inflate every firm that uses the product properly. The UNION is what
// makes "advisers taking part" a count of people rather than of table rows.
const SQL_ADOPTION_VA =
  `SELECT firm_id, COUNT(*) as sessions, MAX(completed_at) as last_active
         FROM advisor_va_sessions
         GROUP BY firm_id`

const SQL_ADOPTION_COURSE =
  `SELECT firm_id, COUNT(*) as courses, AVG(quiz_score) as avg_score,
                MAX(completed_at) as last_active
         FROM advisor_course_completions
         GROUP BY firm_id`

const SQL_ADOPTION_ADVISERS =
  `SELECT firm_id, COUNT(DISTINCT advisor_id) as advisers
         FROM (
           SELECT firm_id, advisor_id FROM advisor_va_sessions
           UNION
           SELECT firm_id, advisor_id FROM advisor_course_completions
         ) t
         GROUP BY firm_id`

const SQL_INSERT_VA =
  `INSERT INTO advisor_va_sessions
         (advisor_id, advisor_name, firm_id, domain, recommended_templates, highest_tier)
       VALUES (?, ?, ?, ?, ?, ?)`

// CPD claims. No de-duplication and no INSERT IGNORE: a repeat is a genuine second
// claim (owner ruling 2026-07-29), not an accidental double submit.
const SQL_ADVISOR_CPD =
  `SELECT id, template_title, template_page, activity, minutes,
                pledge_key, pledge_version, claimed_at, withdrawn_at
         FROM advisor_cpd_claims
         WHERE advisor_id = ? AND firm_id = ?
         ORDER BY claimed_at DESC LIMIT 500`

const SQL_INSERT_CPD =
  `INSERT INTO advisor_cpd_claims
         (advisor_id, advisor_name, firm_id, template_title, template_page,
          activity, minutes, pledge_key, pledge_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`

// Withdrawal is scoped to the claimant AND their firm, and only ever touches a claim
// that is still standing — so a replayed withdrawal cannot rewrite the date on one
// already withdrawn, and nobody can withdraw a claim that is not theirs.
const SQL_WITHDRAW_CPD =
  `UPDATE advisor_cpd_claims
         SET withdrawn_at = NOW()
         WHERE id = ? AND advisor_id = ? AND firm_id = ? AND withdrawn_at IS NULL`

const SQL_INSERT_COURSE =
  `INSERT IGNORE INTO advisor_course_completions
         (advisor_id, advisor_name, firm_id, course_id, course_title, course_topic,
          session_index, session_title, session_resources, quiz_score, quiz_questions,
          highest_tier)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

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

/**
 * Team Progress for a MANAGING tier — every firm beneath `scopeId`, grouped by firm
 * and capability tier.
 *
 * WHY THIS IS NOT readFirmSessions WITH A DIFFERENT ARGUMENT. That one matches
 * `firm_id = ?` exactly, so a country scope like `__group__:Advisor-e:DE` matches no
 * row and returns nothing — which is precisely the bug this fixes
 * (ADVISOR-E-DESIGN-LOGIC.md §4.1, "every report rolls up, no exceptions"). The
 * caller turns these per-firm rows into the level-immediately-below summary rule 7
 * asks for; this function's only job is to read the right firms.
 *
 * 🔴 IT GROUPS BY FIRM, NEVER BY ADVISER, and that is the privacy line, not an
 * optimisation. §4.3: naming a firm to the manager above it is not a disclosure —
 * they are their firms — but a flat roster of every adviser in a country is exactly
 * the "level below is the limit" rule being broken. No advisor_id or advisor_name is
 * selected here, so a caller cannot leak one by accident.
 *
 * The firm list comes from tierChain's membership rather than from a LIKE on the
 * scope id: membership is the one place that knows the shape of the tree, and a
 * pattern match would silently include a firm whose id merely looked similar.
 *
 * @param {string} scopeId - the viewer's scope, from the verified token
 * @returns {Promise<{vaRows: object[], courseRows: object[]}>} rows keyed by
 *   firm_id + highest_tier. EMPTY when no firm is mapped beneath the scope — the
 *   caller distinguishes that from "no activity" with isAwaitingFirms.
 */
async function readSessionsUnderScope (scopeId) {
  const firmIds = firmsUnderScope(scopeId)
  if (firmIds.length === 0) { return { vaRows: [], courseRows: [] } }

  try {
    const placeholders = firmIds.map(() => '?').join(', ')
    const [[vaRows], [courseRows]] = await Promise.all([
      db.execute(
        `SELECT firm_id, highest_tier, COUNT(*) as count,
                COUNT(DISTINCT advisor_id) as advisers,
                MAX(completed_at) as last_active
           FROM advisor_va_sessions
          WHERE firm_id IN (${placeholders})
          GROUP BY firm_id, highest_tier`, firmIds),
      db.execute(
        `SELECT firm_id, highest_tier, COUNT(*) as count,
                COUNT(DISTINCT advisor_id) as advisers,
                AVG(quiz_score) as avg_score,
                MAX(completed_at) as last_active
           FROM advisor_course_completions
          WHERE firm_id IN (${placeholders})
          GROUP BY firm_id, highest_tier`, firmIds)
    ])
    return { vaRows, courseRows }
  } catch (err) {
    if (!devFallbackEnabled()) { throw err }
    _warnFallback('readSessionsUnderScope', err)
    const all = _devReadAll()
    const mine = new Set(firmIds)
    return {
      vaRows: _groupByFirmTier(all.vaSessions.filter(r => mine.has(r.firm_id)), false),
      courseRows: _groupByFirmTier(all.courseSessions.filter(r => mine.has(r.firm_id)), true)
    }
  }
}

/**
 * The dev-file equivalent of the two queries above: group by firm + tier, counting
 * distinct advisers, and shape the numbers as STRINGS exactly as mysql2 hands them
 * back — so the caller cannot accidentally depend on which source it read from.
 *
 * @param {object[]} rows
 * @param {boolean} withAverage - include the quiz-score average
 * @returns {object[]}
 */
function _groupByFirmTier (rows, withAverage) {
  const groups = new Map()
  for (const row of rows) {
    if (!row || !row.firm_id) { continue }
    const tier = row.highest_tier || null
    const key = row.firm_id + ' ' + String(tier)
    if (!groups.has(key)) {
      groups.set(key, {
        firm_id: row.firm_id,
        highest_tier: tier,
        count: 0,
        _advisers: new Set(),
        last_active: null,
        _scores: []
      })
    }
    const g = groups.get(key)
    g.count++
    if (row.advisor_id) { g._advisers.add(row.advisor_id) }
    if (!g.last_active || String(row.completed_at) > String(g.last_active)) {
      g.last_active = row.completed_at
    }
    if (withAverage && row.quiz_score !== null && row.quiz_score !== undefined) {
      g._scores.push(Number(row.quiz_score))
    }
  }

  return Array.from(groups.values()).map((g) => {
    const out = {
      firm_id: g.firm_id,
      highest_tier: g.highest_tier,
      count: String(g.count),
      advisers: String(g._advisers.size),
      last_active: g.last_active
    }
    if (withAverage) {
      out.avg_score = g._scores.length
        ? String(g._scores.reduce((a, b) => a + b, 0) / g._scores.length)
        : null
    }
    return out
  })
}

/**
 * Every firm's activity, counted — the mentor's adoption view.
 *
 * THE ONE READ IN THIS FILE THAT IS NOT FIRM-SCOPED, deliberately and by design:
 * a mentor is not a firm and has no firm's sessions to show. It is defensible
 * only because it carries counts. No advisor id or name is selected (see the SQL
 * above), and mentorAdoption.assertNoPersonalFields throws at the boundary if one
 * ever appears anyway.
 *
 * Callers must be mentor-role gated. That is enforced at the route, not here.
 *
 * @returns {Promise<{vaRows: object[], courseRows: object[], adviserRows: object[]}>}
 *   grouped rows, as mentorAdoption.mergeActivityRows expects them.
 */
async function readAdoptionByFirm () {
  try {
    const [[vaRows], [courseRows], [adviserRows]] = await Promise.all([
      db.execute(SQL_ADOPTION_VA),
      db.execute(SQL_ADOPTION_COURSE),
      db.execute(SQL_ADOPTION_ADVISERS)
    ])
    return { vaRows, courseRows, adviserRows }
  } catch (err) {
    if (!devFallbackEnabled()) { throw err }
    _warnFallback('readAdoptionByFirm', err)
    return _groupAdoption(_devReadAll())
  }
}

/**
 * The dev-file stand-in for the three adoption queries.
 *
 * Kept beside them so the two cannot drift: if the SQL learns a column, this has
 * to as well, and a reviewer sees both in one place. The adviser count is a Set
 * across BOTH session kinds, which is the JSON equivalent of the SQL's UNION —
 * the one part of this that is easy to get subtly wrong.
 *
 * @param {object} all - the parsed dev activity file.
 * @returns {{vaRows: object[], courseRows: object[], adviserRows: object[]}}
 */
function _groupAdoption (all) {
  const va = new Map()
  const course = new Map()
  const advisers = new Map()

  const noteAdviser = (row) => {
    if (!row || !row.firm_id || !row.advisor_id) { return }
    if (!advisers.has(row.firm_id)) { advisers.set(row.firm_id, new Set()) }
    advisers.get(row.firm_id).add(row.advisor_id)
  }

  for (const row of all.vaSessions) {
    if (!row || !row.firm_id) { continue }
    if (!va.has(row.firm_id)) { va.set(row.firm_id, { firm_id: row.firm_id, sessions: 0, last_active: null }) }
    const g = va.get(row.firm_id)
    g.sessions++
    if (!g.last_active || String(row.completed_at) > String(g.last_active)) { g.last_active = row.completed_at }
    noteAdviser(row)
  }

  for (const row of all.courseSessions) {
    if (!row || !row.firm_id) { continue }
    if (!course.has(row.firm_id)) {
      course.set(row.firm_id, { firm_id: row.firm_id, courses: 0, avg_score: null, _scores: [] })
    }
    const g = course.get(row.firm_id)
    g.courses++
    if (!g.last_active || String(row.completed_at) > String(g.last_active)) { g.last_active = row.completed_at }
    if (row.quiz_score !== null && row.quiz_score !== undefined) { g._scores.push(Number(row.quiz_score)) }
    noteAdviser(row)
  }

  return {
    vaRows: Array.from(va.values()),
    courseRows: Array.from(course.values()).map(({ _scores, ...g }) => ({
      ...g,
      avg_score: _scores.length ? _scores.reduce((a, b) => a + b, 0) / _scores.length : null
    })),
    // The KEY stays snake_case because it stands in for a database column; only the
    // local binding is renamed, so this matches what the SQL path returns.
    adviserRows: Array.from(advisers.entries()).map(([firmId, set]) => ({ firm_id: firmId, advisers: set.size }))
  }
}

/**
 * One advisor's own CPD claims, newest first — withdrawn ones included, because a
 * withdrawal is part of the record rather than an erasure.
 *
 * @param {string} advisorId - from the verified JWT, never the client.
 * @param {string} firmId - from the verified JWT.
 * @returns {Promise<object[]>} raw rows.
 */
async function readAdvisorClaims (advisorId, firmId) {
  try {
    const [rows] = await db.execute(SQL_ADVISOR_CPD, [advisorId, firmId])
    return rows
  } catch (err) {
    if (!devFallbackEnabled()) { throw err }
    _warnFallback('readAdvisorClaims', err)
    const all = _devReadAll()
    return all.cpdClaims
      .filter(r => r.advisor_id === advisorId && r.firm_id === firmId)
      .sort((a, b) => String(b.claimed_at).localeCompare(String(a.claimed_at)))
      .slice(0, 500)
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
  const questions = row.quizQuestions && row.quizQuestions.length ? JSON.stringify(row.quizQuestions) : null
  try {
    await db.execute(SQL_INSERT_COURSE, [
      row.advisorId, row.advisorName || null, row.firmId, row.courseId, row.courseTitle,
      row.courseTopic, row.sessionIndex, row.sessionTitle, resources, row.quizScore,
      questions, row.tier
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
      quiz_questions: questions,
      highest_tier: row.tier,
      completed_at: _now()
    })
    _devWriteAll(all)
  }
}

/**
 * Record one CPD claim — an advisor's pledge that they completed the activity.
 *
 * DELIBERATELY NOT FIRE-AND-FORGET, unlike the session writes in activityLogger.
 * A session write happens mid-conversation and must never interrupt an advisor, so it
 * swallows its errors. A CPD claim is a deliberate act with a button behind it: if it
 * cannot be stored, the advisor has to be told, or they will believe they have
 * declared something they have not. So this throws and the route reports it.
 *
 * @param {object} row - { advisorId, advisorName, firmId, templateTitle, templatePage,
 *   activity, minutes, pledgeKey, pledgeVersion } — every value except identity is
 *   resolved server-side by cpdCatalogue, never taken from the request.
 * @returns {Promise<object>} the stored row, including its new id and claimed_at.
 */
async function recordCpdClaim (row) {
  const values = [
    row.advisorId, row.advisorName || null, row.firmId, row.templateTitle,
    row.templatePage || null, row.activity, row.minutes, row.pledgeKey, row.pledgeVersion
  ]
  try {
    const [result] = await db.execute(SQL_INSERT_CPD, values)
    return {
      id: result.insertId,
      template_title: row.templateTitle,
      template_page: row.templatePage || null,
      activity: row.activity,
      minutes: row.minutes,
      pledge_key: row.pledgeKey,
      pledge_version: row.pledgeVersion,
      claimed_at: _now(),
      withdrawn_at: null
    }
  } catch (err) {
    if (!devFallbackEnabled()) { throw err }
    _warnFallback('recordCpdClaim', err)
    const all = _devReadAll()
    const stored = {
      id: _nextClaimId(all.cpdClaims),
      advisor_id: row.advisorId,
      advisor_name: row.advisorName || null,
      firm_id: row.firmId,
      template_title: row.templateTitle,
      template_page: row.templatePage || null,
      activity: row.activity,
      minutes: row.minutes,
      pledge_key: row.pledgeKey,
      pledge_version: row.pledgeVersion,
      claimed_at: _now(),
      withdrawn_at: null
    }
    all.cpdClaims.push(stored)
    _devWriteAll(all)
    return stored
  }
}

/**
 * Withdraw one standing claim, if it belongs to this advisor and this firm.
 *
 * The row is kept and stamped rather than deleted: a claim may already have been
 * submitted to a professional body, and a record that simply vanishes is worse than
 * one that shows a claim made and later withdrawn.
 *
 * @param {*} claimId - the claim's id (already validated by the route).
 * @param {string} advisorId - from the verified JWT.
 * @param {string} firmId - from the verified JWT.
 * @returns {Promise<boolean>} true when a standing claim was withdrawn; false when
 *   there was none to withdraw — which covers "already withdrawn", "does not exist"
 *   and "belongs to someone else" identically, so the route cannot be used to probe.
 */
async function withdrawCpdClaim (claimId, advisorId, firmId) {
  try {
    const [result] = await db.execute(SQL_WITHDRAW_CPD, [claimId, advisorId, firmId])
    return result.affectedRows > 0
  } catch (err) {
    if (!devFallbackEnabled()) { throw err }
    _warnFallback('withdrawCpdClaim', err)
    const all = _devReadAll()
    const claim = all.cpdClaims.find(r =>
      String(r.id) === String(claimId) &&
      r.advisor_id === advisorId &&
      r.firm_id === firmId &&
      !r.withdrawn_at)
    if (!claim) { return false }
    claim.withdrawn_at = _now()
    _devWriteAll(all)
    return true
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
    if (e.code === 'ENOENT') { return { vaSessions: [], courseSessions: [], cpdClaims: [] } }
    throw e
  }
  const parsed = JSON.parse(raw)
  return {
    vaSessions: Array.isArray(parsed.vaSessions) ? parsed.vaSessions : [],
    courseSessions: Array.isArray(parsed.courseSessions) ? parsed.courseSessions : [],
    // Absent in every dev file written before CPD claims existed — an older file is
    // simply an advisor with no claims yet, not a fault.
    cpdClaims: Array.isArray(parsed.cpdClaims) ? parsed.cpdClaims : []
  }
}

/**
 * The next dev-file claim id, standing in for AUTO_INCREMENT.
 *
 * Derived from the highest id present rather than the row count, so ids stay unique
 * after a withdrawal or a hand-edit of the file.
 *
 * @param {object[]} claims @returns {number}
 */
function _nextClaimId (claims) {
  let highest = 0
  for (const c of claims) {
    const n = Number(c && c.id)
    if (Number.isFinite(n) && n > highest) { highest = n }
  }
  return highest + 1
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
  readSessionsUnderScope,
  readAdoptionByFirm,
  readAdvisorClaims,
  recordVASession,
  recordCourseSession,
  recordCpdClaim,
  withdrawCpdClaim,
  // Exported for tests and for anything needing to reason about the fallback.
  devFallbackEnabled,
  DEV_ACTIVITY_FILE
}
