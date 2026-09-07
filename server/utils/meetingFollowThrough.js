'use strict'

/**
 * Meeting Review — follow-through: last meeting's agreed actions, checked against this one.
 *
 * @module server/utils/meetingFollowThrough
 *
 * The actions agreed in March, checked against April's transcript. Brief §3 calls this the
 * strongest argument for the feature and notes it is only possible because the actions were
 * extracted with citations in the first place — which is why P4 is load-bearing.
 *
 * Asked for by Mike 2026-09-07 — *"finish the meeting review"*, then *"yes"* to building it.
 *
 * 🔴 IT MATCHES ON THE CLIENT, AND THAT IS WHY THE CLIENT IS NOW ON THE MEETING RECORD.
 * Matching on the advisor and the meeting type alone would check one client's agreed actions
 * against a different client's transcript, and the result would read as a perfectly ordinary
 * report. A meeting recorded without a client is not matched at all — it is reported as
 * unmatchable, never guessed at.
 *
 * 🔴 SAME ADVISOR AS WELL AS SAME CLIENT, because of P2. A recording belongs to the advisor who
 * made it; reading a colleague's summary to build this report would hand one advisor another's
 * material, which the recording routes already refuse for exactly this reason.
 *
 * 🔴 THE CHECK RIDES THE COACHING CALL RATHER THAN ADDING A THIRD PROMPT. Each prior action
 * becomes one more point in the same request, so the citation guard in `meetingReports.js`
 * applies unchanged: an answer must quote this meeting's transcript or say NOT FOUND, and an
 * invented quote is dropped before it can be shown. A second prompt shape would be a second
 * thing to keep honest.
 *
 * ⚠ AND THE QUOTE MUST BE THE ADVISER'S, which the existing guard already enforces. That is
 * right rather than incidental: this is a coaching report about the adviser's practice, so
 * "did they raise the action they agreed to" is the question — a client mentioning it
 * unprompted is not the adviser following it through.
 *
 * ⚠ THE LOOK-BACK IS BOUNDED BY THE RETENTION CLOCK. Transcripts and their reports expire on
 * the period each client was shown (`meetingPurge.js`), so a firm on a six-month dial has a
 * six-month memory. When the previous meeting's summary has gone, that is reported in those
 * words rather than shown as a meeting with no agreed actions.
 *
 * Node 14, CommonJS.
 */

/**
 * Prefix marking a follow-through point inside the coaching request.
 *
 * It is a prefix rather than a flag because the points travel to the model as a flat list and
 * come back keyed by id; anything else would need the two kinds kept in step by hand.
 * `nextOwnPointId` mints observation-point ids that cannot begin with this, so the two spaces
 * cannot collide.
 */
const FOLLOW_PREFIX = 'followup:'

/** No more than this many prior actions are checked, so one long meeting cannot bloat a prompt. */
const MAX_ACTIONS = 12

/**
 * The most recent earlier meeting with the same client, whose summary still exists.
 *
 * Walks the store rather than querying, because meetings are files (Brief §5 Known state 2).
 * The set is one firm's meetings, so this stays small; a later slice that needs to query across
 * meetings should revisit where transcripts live, which that note already flags.
 *
 * @param {object} store - `meetingAudioStore`
 * @param {object} current - the meeting record being reported on
 * @returns {{meetingId: string, at: string, actions: Array<object>, expired: boolean}|null}
 *   null when there is no earlier meeting with this client at all
 */
function findPrevious (store, current) {
  if (!current || !current.clientId || !current.firmId || !current.advisor) { return null }

  const born = new Date(current.createdAt)
  if (isNaN(born.getTime())) { return null }

  let best = null
  store.listMeetingIds().forEach((id) => {
    if (id === current.meetingId) { return }
    let meta = null
    try {
      meta = store.readMeta(id)
    } catch (_e) {
      return
    }
    if (!meta || !meta.createdAt) { return }
    if (meta.firmId !== current.firmId) { return }
    if (meta.advisor !== current.advisor) { return }
    if (meta.clientId !== current.clientId) { return }

    const when = new Date(meta.createdAt)
    if (isNaN(when.getTime()) || when.getTime() >= born.getTime()) { return }
    if (best && new Date(best.createdAt).getTime() >= when.getTime()) { return }
    best = meta
  })

  if (!best) { return null }

  let summary = null
  try {
    summary = store.readReport(best.meetingId, 'summary')
  } catch (_e) {
    summary = null
  }

  // The meeting is known to have happened — its record survives an expiry — but its text is
  // gone. Saying "no actions were agreed" here would be a different and untrue statement.
  if (!summary) {
    return { meetingId: best.meetingId, at: best.createdAt, actions: [], expired: true }
  }

  const actions = Array.isArray(summary.actions) ? summary.actions.slice(0, MAX_ACTIONS) : []
  return { meetingId: best.meetingId, at: best.createdAt, actions, expired: false }
}

/**
 * Turn prior actions into points the coaching request can ask about.
 *
 * @param {Array<{who: string, what: string, when: string}>} actions
 * @returns {Array<{id: string, text: string}>}
 */
function actionPoints (actions) {
  const rows = Array.isArray(actions) ? actions : []
  return rows.map((a, i) => {
    const what = (a && typeof a.what === 'string') ? a.what.trim() : ''
    if (!what) { return null }
    const who = (a && typeof a.who === 'string' && a.who.trim()) ? a.who.trim() : ''
    const when = (a && typeof a.when === 'string' && a.when.trim()) ? a.when.trim() : ''
    const tail = [who && ('agreed by ' + who), when && ('by ' + when)].filter(Boolean).join(', ')
    return {
      id: FOLLOW_PREFIX + i,
      text: 'The adviser returned to the action agreed last time: "' + what + '"' +
        (tail ? ' (' + tail + ')' : '')
    }
  }).filter(Boolean)
}

/**
 * Split a mixed findings list back into observation findings and follow-through ones.
 *
 * @param {Array<object>} findings
 * @returns {{findings: Array<object>, followThrough: Array<object>}}
 */
function splitFindings (findings) {
  const rows = Array.isArray(findings) ? findings : []
  const out = { findings: [], followThrough: [] }
  rows.forEach((f) => {
    const id = (f && typeof f.pointId === 'string') ? f.pointId : ''
    if (id.indexOf(FOLLOW_PREFIX) === 0) {
      out.followThrough.push(f)
    } else {
      out.findings.push(f)
    }
  })
  return out
}

/**
 * The stored follow-through block, pairing each prior action with what this meeting did about it.
 *
 * 🔴 THE BLOCK IS ALWAYS PRESENT, AND ITS EMPTY STATES SAY WHICH KIND OF EMPTY THEY ARE. The
 * approved drawing (2026-09-07) turns on this: an EXPIRED previous meeting must not render like a
 * meeting where nothing was agreed, or an advisor reads "no actions" as a fact about their client
 * rather than a fact about the retention clock. Returning null for every empty case would have
 * left the screen unable to tell the three apart.
 *
 * @param {object|null} previous - from `findPrevious`
 * @param {Array<object>} followFindings - from `splitFindings`
 * @param {object} [context]
 * @param {string} [context.reason] - why there is no previous meeting: `first` or `no_client`
 * @param {string} [context.retentionPhrase] - the firm's own period, rendered for the expired
 *   panel. Mike's ruling, 2026-09-07: the expired panel names it, and it is never hardcoded.
 * @returns {object} always an object — `none` marks the two empty cases
 */
function buildBlock (previous, followFindings, context) {
  const ctx = context || {}

  if (!previous) {
    return { none: true, reason: ctx.reason === 'no_client' ? 'no_client' : 'first', items: [] }
  }

  if (previous.expired) {
    return {
      from: { meetingId: previous.meetingId, at: previous.at },
      expired: true,
      retentionPhrase: ctx.retentionPhrase || '',
      items: []
    }
  }

  const byId = {}
  ;(followFindings || []).forEach((f) => {
    if (f && typeof f.pointId === 'string') { byId[f.pointId] = f }
  })

  const items = previous.actions.map((a, i) => {
    const f = byId[FOLLOW_PREFIX + i] || null
    return {
      who: (a && a.who) || '',
      what: (a && a.what) || '',
      when: (a && a.when) || '',
      state: f ? f.state : 'not_found',
      quote: f ? f.quote : null,
      at: f ? f.at : null,
      atSeconds: f ? f.atSeconds : null
    }
  })

  return {
    from: { meetingId: previous.meetingId, at: previous.at },
    expired: false,
    items
  }
}

module.exports = {
  FOLLOW_PREFIX,
  MAX_ACTIONS,
  findPrevious,
  actionPoints,
  splitFindings,
  buildBlock
}
