'use strict'

/**
 * Activity routes — capability progression data for advisors and firm managers.
 *
 * POST /api/activity/log-course              — log a completed course session
 * GET  /api/activity/progression             — advisor's own tier progression view
 * GET  /api/activity/team                    — firm manager's team overview
 * GET  /api/activity/team/advisor/:advisorId — one advisor's quiz detail, for a manager
 * GET  /api/activity/cpd                     — advisor's own CPD record
 * POST /api/activity/cpd/record              — pledge one completed CPD activity
 * POST /api/activity/cpd/withdraw            — withdraw one of your own claims
 *
 * SECURITY: advisorId and firmId are derived from the verified JWT (firmAuth
 * middleware attaches req.advisorId / req.firmId) — never trusted from the
 * client request. This prevents one advisor or firm reading another's data.
 * The team-overview route additionally requires a firm-manager role.
 */

const activityStore = require('../utils/activityStore')
const { logCourseSession } = require('../utils/activityLogger')
const { normaliseQuizQuestions } = require('../utils/quizRecord')
const { isStorableSessionIndex } = require('../utils/sessionIndex')
const cpdCatalogue = require('../utils/cpdCatalogue')
const { sendError } = require('../utils/sendError')

const TIERS = ['entry-level', 'intermediate', 'advanced']

function emptyTier () {
  return { vaSessions: 0, courseSessions: 0, avgQuizScore: null, lastActive: null }
}

/**
 * Read the stored per-question record back out.
 *
 * mysql2 hands back a JSON column already parsed, while the dev-file fallback stores
 * the same value as a JSON string — so both shapes arrive here. Anything unreadable
 * becomes an empty list rather than throwing: a malformed record is a missing detail,
 * not a reason to fail the whole progress screen.
 *
 * @param {*} value - the raw column value.
 * @returns {object[]}
 */
function parseQuizQuestions (value) {
  if (Array.isArray(value)) { return value }
  if (typeof value !== 'string' || !value) { return [] }
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    return []
  }
}

/**
 * Log a completed course session for the authenticated advisor.
 *
 * @route POST /api/activity/log-course
 * @param {object} req.body - session detail only (no identity): { courseId, courseTitle,
 *   courseTopic, sessionIndex, sessionTitle, sessionResources, quizScore, quizQuestions }.
 *   `quizQuestions` is per-question detail — bank, entry number, pass/fail, score — and
 *   is normalised through quizRecord before storage; the advisor's written answer is
 *   deliberately not accepted (owner recommendation, ADVISOR-PROGRESS-HANDOVER §6).
 * @param {string} req.advisorId - advisor identity from the verified JWT (firmAuth)
 * @param {string} req.firmId - firm identity from the verified JWT (firmAuth)
 * @returns {200} { success: true }
 * @returns {403} NO_ADVISOR_IDENTITY · {400} MISSING_FIELDS · {400} INVALID_SESSION_INDEX
 *   (standard error envelope)
 */
async function logCourse (req, res) {
  // Identity comes from the verified JWT, not the request body.
  const advisorId = req.advisorId
  const firmId = req.firmId
  const {
    courseId, courseTitle, courseTopic,
    sessionIndex, sessionTitle, sessionResources, quizScore, quizQuestions
  } = req.body || {}

  if (!advisorId) {
    sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify an advisor')
    return
  }

  if (!courseId || sessionIndex === undefined) {
    sendError(res, 400, 'MISSING_FIELDS', 'courseId and sessionIndex are required')
    return
  }

  // Refused HERE rather than coerced downstream: `Number(null)` is 0, a real session the
  // advisor never sat, and `Number('abc')` is NaN, which MySQL discards silently because
  // the write path swallows its own error. See utils/sessionIndex for the full reasoning.
  if (!isStorableSessionIndex(sessionIndex)) {
    sendError(res, 400, 'INVALID_SESSION_INDEX', 'sessionIndex must be a whole number, 0 or greater')
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
    quizScore: (quizScore !== null && quizScore !== undefined) ? Number(quizScore) : null,
    // Client-supplied detail, so normalised before it goes anywhere near storage.
    // Bank, entry number, pass/fail and score only — never the advisor's own words.
    quizQuestions: normaliseQuizQuestions(quizQuestions)
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
      // The advisor's own per-question detail. Safe on THIS route because it returns
      // only the caller's own record; a manager-facing version would be a cross-advisor
      // read and needs the same firmAuth treatment before it exists.
      quizQuestions: parseQuizQuestions(r.quiz_questions),
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

/**
 * Order the topic rollup so the weakest sits at the top — the whole point of the
 * view is "what should I coach this person on", and that answer should not have to
 * be hunted for down a list.
 *
 * Two deliberate choices: the correct-rate is measured over MARKED questions only
 * (an unmarked question is not evidence of anything, so it must not read as a fail),
 * and a topic whose questions were all unmarked scores as 1 so it sinks rather than
 * heading the list on no evidence at all. A question whose bank was never recorded
 * is not a topic and always sits last, however it scored.
 *
 * @param {object} a - one rolled-up topic.
 * @param {object} b - another.
 * @returns {number} standard comparator result.
 */
function compareTopics (a, b) {
  if ((a.bankKey === null) !== (b.bankKey === null)) { return a.bankKey === null ? 1 : -1 }
  const rate = (t) => {
    const marked = t.asked - t.notMarked
    return marked > 0 ? t.correct / marked : 1
  }
  const rateA = rate(a)
  const rateB = rate(b)
  if (rateA !== rateB) { return rateA - rateB }
  // Same rate: the topic they were asked about more is the better-evidenced one.
  if (a.asked !== b.asked) { return b.asked - a.asked }
  return String(a.bankKey).localeCompare(String(b.bankKey))
}

/**
 * Group every question across a set of sessions by the bank it came from.
 *
 * `notMarked` is kept as its own tally rather than folded into either side: a question
 * the marker never scored is neither right nor wrong, and counting it as wrong would
 * invent a weakness the advisor never showed.
 *
 * @param {object[]} sessions - sessions already carrying a normalised `questions` array.
 * @returns {Array<{bankKey: string|null, asked: number, correct: number,
 *   notMarked: number, avgScore: number|null}>} weakest topic first.
 */
function rollUpTopics (sessions) {
  const byBank = new Map()

  for (const session of sessions) {
    for (const q of session.questions) {
      const key = q.bankKey || null
      let topic = byBank.get(key)
      if (!topic) {
        topic = { bankKey: key, asked: 0, correct: 0, notMarked: 0, scores: [] }
        byBank.set(key, topic)
      }
      topic.asked++
      if (q.ungraded === true) { topic.notMarked++; continue }
      if (q.passed === true) { topic.correct++ }
      if (typeof q.score === 'number') { topic.scores.push(q.score) }
    }
  }

  return Array.from(byBank.values()).map(t => ({
    bankKey: t.bankKey,
    asked: t.asked,
    correct: t.correct,
    notMarked: t.notMarked,
    avgScore: t.scores.length
      ? Math.round(t.scores.reduce((sum, n) => sum + n, 0) / t.scores.length)
      : null
  })).sort(compareTopics)
}

/**
 * Return one advisor's per-question quiz record for their firm manager.
 *
 * SECURITY — the one client-supplied value on this route is the advisor id, and it is
 * the reason this route needs reading carefully. The firm still comes from the verified
 * JWT, and `readAdvisorSessions` filters on advisor AND firm together, so a manager
 * asking for an advisor outside their own firm gets an empty record rather than someone
 * else's data — and learns nothing about whether that advisor exists. Manager/admin role
 * is enforced upstream by requireManagerRole, exactly as on the team overview.
 *
 * PRIVACY — this is the first place one person's question-level results are shown to
 * another person, so the read is narrowed on the way out as well as on the way in: every
 * question is put back through `normaliseQuizQuestions`, which passes only bank, entry
 * number, score, pass/fail and unmarked. Even if a future write path (or a hand-edited
 * dev file) ever stored an advisor's own words, they could not reach a manager's screen
 * through here.
 *
 * @route GET /api/activity/team/advisor/:advisorId
 * @param {string} req.params.advisorId - the advisor to look at; constrained to the
 *   manager's own firm by the query, never trusted on its own
 * @param {string} req.firmId - firm identity from the verified JWT (firmAuth)
 * @returns {200} { success: true, advisorId, topics, sessions } — `topics` is the
 *   per-bank rollup, weakest first; `sessions` is every course session newest-first,
 *   each with its own questions (empty for sessions completed before this record existed)
 * @returns {400} MISSING_PARAMS · {500} DB_ERROR (standard error envelope)
 */
async function getAdvisorQuestions (req, res) {
  // Firm from the verified token; advisor from the URL, capped like every other
  // stored identifier so an oversized parameter cannot reach the query.
  const firmId = req.firmId
  const rawAdvisorId = (req.params && req.params.advisorId) || ''
  const advisorId = String(rawAdvisorId).slice(0, 64)

  if (!firmId) {
    sendError(res, 400, 'MISSING_PARAMS', 'firmId is required')
    return
  }

  if (!advisorId) {
    sendError(res, 400, 'MISSING_PARAMS', 'advisorId is required')
    return
  }

  try {
    // Reuses the advisor's own read deliberately: it is the function that already
    // filters on advisor AND firm together, so the firm boundary here is the same
    // proven one rather than a second query that could drift away from it. It also
    // reads the VA sessions, which this view does not use — client cases carry no
    // quiz — a cheap indexed read in exchange for not duplicating the scoping.
    const { courseSessions } = await activityStore.readAdvisorSessions(advisorId, firmId)

    const sessions = courseSessions.map(r => ({
      courseTitle: r.course_title,
      sessionTitle: r.session_title,
      quizScore: (r.quiz_score === null || r.quiz_score === undefined) ? null : Number(r.quiz_score),
      tier: r.highest_tier || null,
      completedAt: r.completed_at,
      // Normalised on the way out as well as in — see the PRIVACY note above.
      questions: normaliseQuizQuestions(parseQuizQuestions(r.quiz_questions))
    }))

    res.send(200, { success: true, advisorId, topics: rollUpTopics(sessions), sessions })
  } catch (err) {
    console.error('[activity] getAdvisorQuestions error:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not load advisor quiz data')
  }
}

// ── CPD record ────────────────────────────────────────────────────────────────
// An advisor's CPD claims are their own professional record. Every route below is
// the caller's own record only — there is deliberately no manager-facing view in
// this slice, and adding one would be a privacy decision, not a code change.

/** A claim id is a row id, not an identifier the advisor types. */
const MAX_CLAIM_ID = 4294967295

/**
 * Read a JSON column of template names back out as a list of strings.
 *
 * mysql2 hands back a JSON column already parsed while the dev-file fallback stores
 * it as a string, so both shapes arrive here — the same seam as parseQuizQuestions.
 * Anything unreadable is an empty list: a malformed row costs that row's templates,
 * never the whole screen.
 *
 * @param {*} value - the raw column value.
 * @returns {string[]}
 */
function parseNameList (value) {
  const raw = Array.isArray(value) ? value : parseQuizQuestions(value)
  return raw.filter(n => typeof n === 'string' && n.trim())
}

/**
 * Every template the advisor's own work has used, with when they last used it.
 *
 * The date drives display order — most recent work first — and is also what tells a
 * template the advisor has genuinely used apart from one they have merely claimed
 * against in the past.
 *
 * @param {object[]} vaSessions - the advisor's client sessions.
 * @param {object[]} courseSessions - the advisor's course sessions.
 * @returns {Map<string, {name: string, lastUsedAt: *}>} keyed by normalised title.
 */
function collectTemplateUse (vaSessions, courseSessions) {
  const use = new Map()
  const add = (names, when) => {
    for (const name of names) {
      const key = cpdCatalogue.normaliseTitle(name)
      if (!key) { continue }
      const held = use.get(key)
      if (!held) {
        use.set(key, { name, lastUsedAt: when || null })
      } else if (when && (!held.lastUsedAt || String(when) > String(held.lastUsedAt))) {
        held.lastUsedAt = when
      }
    }
  }
  for (const row of vaSessions) { add(parseNameList(row.recommended_templates), row.completed_at) }
  for (const row of courseSessions) { add(parseNameList(row.session_resources), row.completed_at) }
  return use
}

/**
 * Group an advisor's stored claims by template and activity.
 *
 * The title stored ON THE CLAIM is carried through, not looked up again: it is the
 * spelling the advisor pledged against, and the export may since have renamed it.
 *
 * @param {object[]} rows - claim rows.
 * @returns {Map<string, {title: string, byActivity: Map<string, object[]>}>} keyed by
 *   normalised title.
 */
function groupClaims (rows) {
  const byTemplate = new Map()
  for (const row of rows) {
    const key = cpdCatalogue.normaliseTitle(row.template_title)
    if (!key) { continue }
    let held = byTemplate.get(key)
    if (!held) { held = { title: row.template_title, byActivity: new Map() }; byTemplate.set(key, held) }
    const byActivity = held.byActivity
    const list = byActivity.get(row.activity) || []
    list.push({
      id: Number(row.id),
      minutes: Number(row.minutes),
      claimedAt: row.claimed_at,
      withdrawnAt: row.withdrawn_at || null,
      pledgeKey: row.pledge_key,
      pledgeVersion: Number(row.pledge_version)
    })
    byActivity.set(row.activity, list)
  }
  return byTemplate
}

/**
 * Return the authenticated advisor's own CPD record — what they may claim, what they
 * have claimed, and the running total.
 *
 * The claimable list is built from the templates their own sessions actually used, so
 * an advisor can never record CPD against the library at large. A template they have
 * claimed against in the past is listed even if it no longer appears in their recent
 * sessions: a standing claim must never disappear from the record that carries it.
 *
 * @route GET /api/activity/cpd
 * @param {string} req.advisorId - advisor identity from the verified JWT (firmAuth)
 * @param {string} req.firmId - firm identity from the verified JWT (firmAuth)
 * @param {?string} [req.advisorName] - display name from the same verified token
 * @returns {200} { success: true, advisorId, advisorName, totalMinutes, claimedCount, templates }
 *   — `totalMinutes` and `claimedCount` count STANDING claims only; withdrawn ones
 *   remain visible on their activity as history. `advisorName` is null when the token
 *   carries no name; the screen falls back to the id rather than inventing one, which
 *   matters here because this record is printed and submitted to a professional body.
 * @returns {403} NO_ADVISOR_IDENTITY · {500} DB_ERROR (standard error envelope)
 */
async function getCpd (req, res) {
  const advisorId = req.advisorId
  const firmId = req.firmId

  if (!advisorId) {
    sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify an advisor')
    return
  }

  try {
    const [{ vaSessions, courseSessions }, claimRows] = await Promise.all([
      activityStore.readAdvisorSessions(advisorId, firmId),
      activityStore.readAdvisorClaims(advisorId, firmId)
    ])

    const use = collectTemplateUse(vaSessions, courseSessions)
    const claims = groupClaims(claimRows)

    // Templates the advisor has used, plus any they hold a claim against — the union,
    // so a claim can never be orphaned by a template dropping out of recent work.
    const keys = new Set([...use.keys(), ...claims.keys()])

    let totalMinutes = 0
    let claimedCount = 0
    const templates = []

    for (const key of keys) {
      const used = use.get(key)
      const entry = cpdCatalogue.lookupTemplate(used ? used.name : key)
      const held = claims.get(key)
      const claimedHere = held ? held.byActivity : null
      if (!entry && !claimedHere) { continue }

      const activities = []
      // The activities the export still offers, in catalogue order…
      for (const a of (entry ? entry.activities : [])) {
        const list = (claimedHere && claimedHere.get(a.activity)) || []
        const standing = list.filter(c => !c.withdrawnAt)
        totalMinutes += standing.reduce((sum, c) => sum + c.minutes, 0)
        claimedCount += standing.length
        activities.push({
          activity: a.activity,
          minutes: a.minutes,
          pledgeKey: a.pledgeKey,
          claimedCount: standing.length,
          claimedMinutes: standing.reduce((sum, c) => sum + c.minutes, 0),
          claims: list
        })
      }
      // …plus any activity that only exists as history. A re-authored export must not
      // silently drop a claim an advisor may already have submitted.
      if (claimedHere) {
        for (const [activity, list] of claimedHere) {
          if (activities.some(a => a.activity === activity)) { continue }
          const standing = list.filter(c => !c.withdrawnAt)
          const standingMinutes = standing.reduce((sum, c) => sum + c.minutes, 0)
          totalMinutes += standingMinutes
          claimedCount += standing.length
          activities.push({
            activity,
            // No longer offered by the export — recorded, but not claimable again.
            minutes: null,
            pledgeKey: list[0].pledgeKey,
            claimedCount: standing.length,
            claimedMinutes: standingMinutes,
            claims: list
          })
        }
      }
      if (!activities.length) { continue }

      templates.push({
        // The catalogue's spelling when it still knows the template; otherwise the
        // one stored on the claim, which is what the advisor actually pledged against.
        title: entry ? entry.title : (held ? held.title : used.name),
        page: entry ? entry.page : null,
        lastUsedAt: used ? used.lastUsedAt : null,
        activities
      })
    }

    // Most recently used first; never-used-but-claimed sink to the bottom, then by
    // title so the order is stable rather than dependent on Map insertion.
    templates.sort((a, b) => {
      if (a.lastUsedAt && b.lastUsedAt && a.lastUsedAt !== b.lastUsedAt) {
        return String(b.lastUsedAt).localeCompare(String(a.lastUsedAt))
      }
      if (a.lastUsedAt && !b.lastUsedAt) { return -1 }
      if (!a.lastUsedAt && b.lastUsedAt) { return 1 }
      return a.title.localeCompare(b.title)
    })

    res.send(200, {
      success: true,
      advisorId,
      // From the verified pass, never the request — the name printed on a CPD
      // statement must come from the same place the record itself is scoped by.
      advisorName: req.advisorName || null,
      totalMinutes,
      claimedCount,
      templates
    })
  } catch (err) {
    console.error('[activity] getCpd error:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not load your CPD record')
  }
}

/**
 * Record one CPD claim — the advisor's pledge that they completed the activity.
 *
 * NOTHING THAT GIVES THE CLAIM ITS VALUE COMES FROM THE REQUEST. The body names a
 * template and one of three activities; the minutes, the template's real title and
 * page, and the wording of the pledge are all resolved server-side from the master
 * export (cpdCatalogue). A claim is a professional declaration, so a client that
 * could name its own figure could inflate a regulated record.
 *
 * @route POST /api/activity/cpd/record
 * @param {object} req.body - { templateTitle, activity } — 'video' | 'reading' | 'rehearsal'
 * @param {string} req.advisorId - advisor identity from the verified JWT (firmAuth)
 * @param {string} req.firmId - firm identity from the verified JWT (firmAuth)
 * @param {string} [req.advisorName] - display name from the same verified token
 * @returns {200} { success: true, claim } — the stored row, including its id
 * @returns {403} NO_ADVISOR_IDENTITY · {400} INVALID_CLAIM · {400} NOT_CLAIMABLE ·
 *   {500} CPD_RECORD_FAILED (standard error envelope)
 */
async function recordCpd (req, res) {
  const advisorId = req.advisorId
  const firmId = req.firmId

  if (!advisorId) {
    sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify an advisor')
    return
  }

  const request = cpdCatalogue.normaliseClaimRequest(req.body)
  if (!request) {
    sendError(res, 400, 'INVALID_CLAIM', 'A CPD claim needs a template and one of the three activities')
    return
  }

  try {
    // An advisor may only claim against templates their own work has used. Checked
    // against their stored sessions, not against anything the request asserts.
    const { vaSessions, courseSessions } = await activityStore.readAdvisorSessions(advisorId, firmId)
    const use = collectTemplateUse(vaSessions, courseSessions)
    if (!use.has(cpdCatalogue.normaliseTitle(request.templateTitle))) {
      sendError(res, 400, 'NOT_CLAIMABLE', 'You can only record CPD for a template your own work has used')
      return
    }

    const resolved = cpdCatalogue.resolveClaim(request.templateTitle, request.activity)
    if (!resolved) {
      sendError(res, 400, 'NOT_CLAIMABLE', 'That template carries no CPD time for that activity')
      return
    }

    const claim = await activityStore.recordCpdClaim({
      advisorId,
      advisorName: req.advisorName || null,
      firmId,
      templateTitle: resolved.title,
      templatePage: resolved.page,
      activity: resolved.activity,
      minutes: resolved.minutes,
      pledgeKey: resolved.pledgeKey,
      pledgeVersion: resolved.pledgeVersion
    })

    res.send(200, { success: true, claim })
  } catch (err) {
    // Never swallowed, unlike the mid-session write in activityLogger: an advisor who
    // is not told their pledge failed will believe they have declared something.
    console.error('[activity] recordCpd error:', err.message)
    sendError(res, 500, 'CPD_RECORD_FAILED', 'Could not record your CPD claim')
  }
}

/**
 * Withdraw one of the authenticated advisor's own standing CPD claims.
 *
 * The row is kept and stamped withdrawn rather than deleted — the claim may already
 * have been submitted elsewhere, and a record that vanishes is worse than one showing
 * a claim made and later withdrawn.
 *
 * @route POST /api/activity/cpd/withdraw
 * @param {object} req.body - { claimId }
 * @param {string} req.advisorId - advisor identity from the verified JWT (firmAuth)
 * @param {string} req.firmId - firm identity from the verified JWT (firmAuth)
 * @returns {200} { success: true }
 * @returns {403} NO_ADVISOR_IDENTITY · {400} INVALID_CLAIM · {404} CLAIM_NOT_FOUND ·
 *   {500} CPD_WITHDRAW_FAILED (standard error envelope)
 */
async function withdrawCpd (req, res) {
  const advisorId = req.advisorId
  const firmId = req.firmId

  if (!advisorId) {
    sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify an advisor')
    return
  }

  const raw = req.body && req.body.claimId
  const claimId = (typeof raw === 'number' || (typeof raw === 'string' && raw.trim() !== ''))
    ? Number(raw)
    : NaN
  if (!Number.isFinite(claimId) || claimId < 1 || claimId > MAX_CLAIM_ID ||
      Math.round(claimId) !== claimId) {
    sendError(res, 400, 'INVALID_CLAIM', 'That is not a CPD claim reference')
    return
  }

  try {
    const withdrawn = await activityStore.withdrawCpdClaim(claimId, advisorId, firmId)
    if (!withdrawn) {
      // One answer for "already withdrawn", "does not exist" and "belongs to someone
      // else" — so the route cannot be used to discover other advisors' claims.
      sendError(res, 404, 'CLAIM_NOT_FOUND', 'That CPD claim is not one of yours to withdraw')
      return
    }
    res.send(200, { success: true })
  } catch (err) {
    console.error('[activity] withdrawCpd error:', err.message)
    sendError(res, 500, 'CPD_WITHDRAW_FAILED', 'Could not withdraw your CPD claim')
  }
}

module.exports = {
  logCourse,
  getProgression,
  getTeam,
  getAdvisorQuestions,
  getCpd,
  recordCpd,
  withdrawCpd
}
