'use strict'

/**
 * courseEffort — how many minutes of advisor work a course session actually is.
 *
 * Mike's ruling 2026-08-03: a session's length is the TOTAL work the advisor
 * does — watching the tutorial video, reading the template, and rehearsing it
 * with a colleague, added together. His worked example: a template carrying 17
 * minutes of video, 30 of reading and 30 of rehearsal is 1 hour 17 minutes of
 * course time on its own.
 *
 * WHY THIS IS NOT A NEW SUM. `cpdCatalogue` already adds those same three
 * authored fields, under rules that took real defects to settle: fractional
 * allowances rounded, hidden records skipped, and — where the export gives one
 * title two different times — the LOWER figure kept. That number values a
 * regulated CPD claim. A second, independent sum living here would drift from
 * it, and an advisor would eventually see a course state one length while
 * their CPD record stated another. So this module ASKS cpdCatalogue, and adds
 * exactly one rule of its own.
 *
 * THE ONE RULE OF ITS OWN — the revenue models. The library holds 89 revenue
 * and feasibility models (Cafe, Break-Even, Labour Only, Car Importer…), and
 * 85 of them are marked hidden in the export and carry no authored time at
 * all. Left alone each would count as ZERO, so a session built from six of
 * them would report itself as no work whatsoever. Mike's ruling, same day: a
 * revenue model always counts 30 minutes.
 *
 * AUTHORED TIME STILL WINS over that allowance. The 30 minutes is a fallback
 * for a model the export never timed, not an override of one it did —
 * discarding a real authored figure in favour of a flat 30 would throw away
 * the better number. Against the current export this changes nothing for the
 * 85 real models (all untimed); it only preserves the four reference items
 * that happen to share the subsection ("Assumptions", "Section Overview",
 * "Section Brief", "EBITDA").
 *
 * UNKNOWN IS NEVER ZERO. Thirteen visible templates carry no authored time and
 * are not models. Counting them as 0 would tell an advisor the session is
 * free. They are counted and named separately, so the screen can say the time
 * is unknown rather than imply there is none.
 *
 * NOTHING HERE IS TAKEN FROM THE AI. The AI chooses resources; the minutes are
 * resolved from the export afterwards, in code — the same division of labour
 * as the CB-02 resource grounding and the CB-26 session-count check.
 */

const cpdCatalogue = require('./cpdCatalogue')

/**
 * The master export's subsection for the industry revenue/feasibility models.
 * `templateResolver.js` already keys on this exact string for the same set, so
 * this is an established identifier rather than a new one invented here.
 */
const MODEL_SUBSECTION = 'revenue & feasibility models'

/** Mike's ruling 2026-08-03 — an untimed revenue model is 30 minutes of work. */
const MODEL_ALLOWANCE_MINUTES = 30

/**
 * How far a session may sit from the requested length before it is flagged.
 * ±20%: a 30-minute request accepts 24–36. Tight enough to catch the 99-minute
 * session that started this work, loose enough not to nag over five minutes.
 */
const LENGTH_TOLERANCE = 0.2

/** Where a template's minutes came from. 'unknown' carries no minutes at all. */
const SOURCE_AUTHORED = 'authored'
const SOURCE_MODEL = 'model'
const SOURCE_UNKNOWN = 'unknown'

/**
 * Is this template record one of the revenue/feasibility models?
 *
 * @param {object} template - a record from the template library.
 * @returns {boolean}
 */
function isRevenueModel (template) {
  const sub = template && template.subSection
  return typeof sub === 'string' && sub.trim().toLowerCase() === MODEL_SUBSECTION
}

/**
 * Index the org's templates by the same normalised title cpdCatalogue uses, so
 * a name that resolves in one resolves in the other.
 *
 * @param {Array<object>} templates - the firm's template set (getOrgTemplates).
 * @returns {Map<string, object>}
 */
function indexByTitle (templates) {
  const byTitle = new Map()
  for (const t of (templates || [])) {
    if (!t || typeof t.title !== 'string') { continue }
    const key = cpdCatalogue.normaliseTitle(t.title)
    // First record wins: matches cpdCatalogue's own precedence, where a later
    // duplicate only displaces the held one by carrying a LOWER time.
    if (key && !byTitle.has(key)) { byTitle.set(key, t) }
  }
  return byTitle
}

/**
 * The advisor work one named template represents.
 *
 * Resolution order — authored time, then the model allowance, then unknown.
 *
 * @param {*} name - a resource name, already grounded to a real library title.
 * @param {Map<string, object>|Array<object>} templates - the org's templates,
 *   or a prebuilt index from `indexByTitle` (the per-session caller passes the
 *   index so the library is walked once per outline, not once per resource).
 * @returns {{title: string, minutes: number, source: string, video: number,
 *   reading: number, rehearsal: number}} `minutes` is 0 only when `source` is
 *   'unknown' — which means "not published", never "no work".
 */
function templateEffort (name, templates) {
  const index = templates instanceof Map ? templates : indexByTitle(templates)
  const key = cpdCatalogue.normaliseTitle(name)
  const record = index.get(key) || null
  const title = (record && record.title) || String(name || '').trim()

  const base = { title, minutes: 0, source: SOURCE_UNKNOWN, video: 0, reading: 0, rehearsal: 0 }

  // 1. Authored time, straight from the CPD catalogue — one source, one answer.
  const entry = cpdCatalogue.lookupTemplate(key)
  if (entry && entry.totalMinutes > 0) {
    const byActivity = { video: 0, reading: 0, rehearsal: 0 }
    for (const a of entry.activities) { byActivity[a.activity] = a.minutes }
    return {
      title: entry.title,
      minutes: entry.totalMinutes,
      source: SOURCE_AUTHORED,
      video: byActivity.video,
      reading: byActivity.reading,
      rehearsal: byActivity.rehearsal
    }
  }

  // 2. A revenue model the export never timed — Mike's flat allowance.
  if (record && isRevenueModel(record)) {
    return { ...base, minutes: MODEL_ALLOWANCE_MINUTES, source: SOURCE_MODEL }
  }

  // 3. Genuinely unpublished. Reported, never counted as zero work.
  return base
}

/**
 * The advisor work one session represents, from its grounded resources.
 *
 * @param {object} session - a session from a grounded outline.
 * @param {Map<string, object>|Array<object>} templates - org templates or index.
 * @returns {{minutes: number, video: number, reading: number, rehearsal: number,
 *   modelMinutes: number, unknown: string[]}} `unknown` names the resources
 *   carrying no published time, so the caller can say so out loud.
 */
function sessionEffort (session, templates) {
  const index = templates instanceof Map ? templates : indexByTitle(templates)
  const totals = { minutes: 0, video: 0, reading: 0, rehearsal: 0, modelMinutes: 0, unknown: [] }
  const resources = (session && Array.isArray(session.resources)) ? session.resources : []

  for (const name of resources) {
    const effort = templateEffort(name, index)
    if (effort.source === SOURCE_UNKNOWN) {
      totals.unknown.push(effort.title)
      continue
    }
    totals.minutes += effort.minutes
    totals.video += effort.video
    totals.reading += effort.reading
    totals.rehearsal += effort.rehearsal
    if (effort.source === SOURCE_MODEL) { totals.modelMinutes += effort.minutes }
  }
  return totals
}

/**
 * Attach the real length to every session of an outline, replacing whatever
 * `estimatedMinutes` the AI wrote.
 *
 * The AI's figure was only ever an echo of the number the advisor typed — the
 * design prompt literally instructs it to copy that back — so it could state
 * 30 minutes over 99 minutes of prescribed material and nothing noticed. The
 * figure is therefore computed here and overwritten, never accepted.
 *
 * A session whose resources are ALL unpublished keeps no minutes at all
 * (`estimatedMinutes` is removed rather than set to 0): an unknown length must
 * not render as a claim of zero work.
 *
 * @param {object} outline - a grounded, shape-validated course outline.
 * @param {Array<object>} templates - the firm's template set (getOrgTemplates).
 * @returns {{outline: object, totalMinutes: number, unknownCount: number}}
 */
function applyOutlineEffort (outline, templates) {
  const index = indexByTitle(templates)
  let totalMinutes = 0
  let unknownCount = 0

  const sessions = ((outline && outline.sessions) || []).map((s) => {
    const effort = sessionEffort(s, index)
    totalMinutes += effort.minutes
    unknownCount += effort.unknown.length

    const session = { ...s, sessionEffort: effort }
    if (effort.minutes > 0) {
      session.estimatedMinutes = effort.minutes
    } else {
      // No published time for anything in this session — say nothing rather
      // than say zero.
      delete session.estimatedMinutes
    }
    return session
  })

  return { outline: { ...outline, sessions }, totalMinutes, unknownCount }
}

/**
 * Which sessions miss the length the advisor asked for.
 *
 * Code checks this, not the AI — the same reason the session-count check
 * exists: a model asked to confess its own deviation frequently does not.
 * Sessions with no published time are never flagged as short; an unknown
 * length is not evidence of a wrong one.
 *
 * THE REQUEST IS A BAND, NOT A POINT. "15 to 20 minutes" is a budget with two
 * ends, and the tolerance is applied OUTWARD from each end rather than around a
 * single figure — so 15–20 accepts 12–24, and a plain "30 minutes" (the range
 * 30–30) accepts 24–36 exactly as before. This function originally took one
 * number and was never called for a range at all, which is how Mike's live test
 * on 2026-08-03 drew a 70-minute session against a 15–20 minute request in
 * silence.
 *
 * @param {object} outline - an outline already through `applyOutlineEffort`.
 * @param {{min: number, max: number}|null} requested - the advisor's budget from
 *   `requestedSessionLength`, or null when they did not say (disables the check).
 * @returns {{requested: {min: number, max: number}, sessions: Array<{id: number,
 *   title: string, minutes: number}>}|null} null when everything fits, or when
 *   there is nothing to check.
 */
function lengthNotice (outline, requested) {
  if (!requested || !Number.isFinite(requested.min) || !Number.isFinite(requested.max)) { return null }
  if (requested.min <= 0 || requested.max < requested.min) { return null }
  const sessions = (outline && outline.sessions) || []
  const low = requested.min * (1 - LENGTH_TOLERANCE)
  const high = requested.max * (1 + LENGTH_TOLERANCE)

  const off = []
  for (const s of sessions) {
    const minutes = s && s.sessionEffort ? s.sessionEffort.minutes : 0
    // Nothing published for this session — not evidence of a wrong length.
    if (!minutes) { continue }
    if (minutes < low || minutes > high) {
      off.push({ id: s.id, title: s.title, minutes })
    }
  }
  return off.length ? { requested: { min: requested.min, max: requested.max }, sessions: off } : null
}

module.exports = {
  isRevenueModel,
  indexByTitle,
  templateEffort,
  sessionEffort,
  applyOutlineEffort,
  lengthNotice,
  MODEL_SUBSECTION,
  MODEL_ALLOWANCE_MINUTES,
  LENGTH_TOLERANCE,
  SOURCE_AUTHORED,
  SOURCE_MODEL,
  SOURCE_UNKNOWN
}
