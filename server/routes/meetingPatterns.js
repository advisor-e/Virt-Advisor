'use strict'

/**
 * Meeting Review — the manager's aggregate, Restify route.
 *
 * One read: are the observation points landing across this firm, this month? Counts only, and
 * only above the threshold Mike set.
 *
 * Design `design/features/meeting-review.md` P3, P13 and §5 trap 2; artefact
 * `design/mockups/meeting-review.html` screens C3 and C4, approved by Mike 2026-09-01. The
 * arithmetic is `server/utils/meetingAggregate.js`, kept out of this file so it can be tested
 * against records rather than against HTTP.
 *
 * 🔴 THIS IS A FIRM-TIER READ AND IT DOES NOT CASCADE UPWARD — the one place in this codebase
 * where that is the point rather than an omission. Brief **P13**: *"No transcript, observation,
 * quotation or figure derived from a recorded meeting travels beyond the firm."* The consent line
 * says so out loud to a named client, so a global or group manager reading a firm's meeting
 * figures would break a promise somebody heard spoken. `tierOfScope` decides, and every tier that
 * is not `firm_manager` is answered 403 rather than answered with zeroes — a screen full of
 * zeroes reads as "your firm did nothing", which is a different and untrue statement.
 *
 * 🔴 SCOPED TO `req.firmId`, THE VERIFIED SCOPE FROM THE JWT, like every sibling route. No firm
 * is ever named in a query or a body, so one firm cannot ask for another's figures.
 *
 * ⚠ WHAT IS DELIBERATELY NOT HERE. No advisor identifier reaches the response — see the
 * aggregate module, which counts advisors and then forgets them. No dispute count either: a
 * dispute is the advisor's (P5) and belongs in their own notes, and a per-point dispute tally is
 * a step back toward the individual this whole screen exists to protect.
 *
 * Node 14, CommonJS.
 */

const store = require('../utils/meetingAudioStore')
const { summarise, periodOf } = require('../utils/meetingAggregate')
const { sendError } = require('../utils/sendError')
const { tierOfScope } = require('../utils/tierChain')

/**
 * Every meeting belonging to this firm, with its coaching notes where they exist.
 *
 * Ownership is checked against each meeting's OWN record — the one written at creation and never
 * taken from a later request — so a firm collects its own meetings and cannot collect anybody
 * else's, however the directory happens to be laid out.
 *
 * @param {string} firmId
 * @returns {Array<{meta: object, coaching: (object|null)}>}
 */
function recordsForFirm (firmId) {
  const out = []
  store.listMeetingIds().forEach((id) => {
    let meta = null
    try {
      meta = store.readMeta(id)
    } catch (_e) {
      // A directory this store did not mint, or an unreadable record. Not this firm's.
      return
    }
    if (!meta || meta.firmId !== firmId) { return }
    let coaching = null
    try {
      coaching = store.readReport(id, 'coaching')
    } catch (_e) {
      coaching = null
    }
    out.push({ meta, coaching })
  })
  return out
}

/**
 * GET /api/firm-manager/meeting-patterns
 *
 * The firm's figures for the current calendar month.
 *
 * ⚠ THE PERIOD IS THE CURRENT MONTH AND THERE IS NO CONTROL TO CHANGE IT, because the approved
 * drawing has none — its chrome states the month and offers no picker. A period selector is a
 * deviation from an approved artefact, so it is named in the Brief rather than added here.
 *
 * @route GET /api/firm-manager/meeting-patterns
 * @returns {object} `{ tier, period, meetings, advisors, enough, minAdvisors, minMeetings, points }`
 */
function getPatterns (req, res) {
  try {
    const firmId = req.firmId
    if (!firmId) {
      sendError(res, 401, 'NO_SCOPE', 'Sign in again to see your firm\'s meeting figures.')
      return
    }

    const tier = tierOfScope(firmId)
    if (tier !== 'firm_manager') {
      sendError(res, 403, 'NOT_FIRM_TIER',
        'Meeting figures stay inside the firm they came from.')
      return
    }

    const summary = summarise(recordsForFirm(firmId), periodOf(new Date()))
    res.send(200, Object.assign({ tier }, summary))
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('meeting-patterns: read failed', err)
    sendError(res, 500, 'PATTERNS_FAILED', 'Could not read the meeting figures just now.')
  }
}

/** Restify calls the next handler itself; these read-only handlers do not. */
function mountable (fn) {
  return function (req, res, next) {
    fn(req, res)
    if (typeof next === 'function') { next() }
  }
}

module.exports = {
  recordsForFirm,
  getPatterns: mountable(getPatterns)
}
