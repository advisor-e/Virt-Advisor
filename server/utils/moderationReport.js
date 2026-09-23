'use strict'

/**
 * @file Turns a moderation block into what a person may be told — item 8.2, second half.
 *
 * `openaiClient` throws AI_MODERATION_BLOCKED with `{ category, sentence }`. A route calls this
 * with what the user TYPED in that request (or the meeting's transcript segments) and gets back
 * a small report the screen turns into one of the five messages Mike approved on 2026-09-24
 * (`design/MODERATION-WORDING.md`). The screen side is `mixins/moderationMessage.js`.
 *
 * 🔴 A SENTENCE IS ONLY QUOTED BACK TO THE PERSON WHO WROTE OR SAID IT. The flagged sentence can
 * come from the app's own material — templates, earlier turns, course content — because those
 * travel in the same part of the request. When it is not in what this person typed, the report
 * is `app` and carries NO sentence: the screen says it was the app's material, and nothing of
 * that material reaches a browser.
 *
 * @module server/utils/moderationReport
 */

const { clock, normalise } = require('./meetingReports')
const { sendError } = require('./sendError')

/** A transcript line as the reports' prompt writes it: `[m:ss] ROLE: text`. */
const TRANSCRIPT_LINE = /^\[\d+:\d{2}\]\s+(?:ADVISOR|CLIENT|UNKNOWN):\s*/

/** The HTTP status a JSON route answers with. 422: the request was understood and refused. */
const BLOCKED_STATUS = 422

/** The plain message beside the report, for logs and for any caller that cannot read the report. */
const BLOCKED_MESSAGE = 'This request was blocked by the AI safety check'

/**
 * @param {*} err - whatever a caller caught
 * @returns {boolean} whether it is a moderation block
 */
function isBlocked (err) {
  return !!(err && err.code === 'AI_MODERATION_BLOCKED' && err.moderation)
}

/**
 * @param {*} err
 * @param {object} [ctx]
 * @param {string[]} [ctx.typed] - what the person typed in THIS request, each field on its own
 * @param {Array<{start: number, role: string, text: string}>} [ctx.segments] - a meeting's transcript
 * @returns {object|null} `{ kind, category, sentence?, speaker?, time? }`, or null when `err` is
 *   not a block. `kind` is one of typed | typedWhole | app | meeting | meetingWhole.
 */
function moderationReport (err, ctx) {
  if (!isBlocked(err)) { return null }
  const category = err.moderation.category
  const sentence = err.moderation.sentence
  const opts = ctx || {}

  if (Array.isArray(opts.segments)) {
    if (!sentence) { return { kind: 'meetingWhole', category } }
    const said = sentence.replace(TRANSCRIPT_LINE, '')
    const needle = normalise(said)
    const seg = needle ? opts.segments.find(s => normalise(s && s.text).includes(needle)) : null
    // A flagged line that is not in the transcript came from the prompt's own framing.
    if (!seg) { return { kind: 'app', category } }
    const role = seg.role === 'advisor' || seg.role === 'client' ? seg.role : 'unknown'
    return { kind: 'meeting', category, sentence: said, speaker: role, time: clock(seg.start) }
  }

  const typed = (Array.isArray(opts.typed) ? opts.typed : [])
    .filter(t => typeof t === 'string' && t.trim())
    .map(normalise)

  if (sentence) {
    const needle = normalise(sentence)
    if (needle && typed.some(t => t.includes(needle))) { return { kind: 'typed', category, sentence } }
    return { kind: 'app', category }
  }

  // No single sentence was to blame. Only the person's own message may be called theirs: when
  // the text that was flagged as a whole IS what they typed. Anything wider held the app's
  // material too, and cannot be pinned on them.
  const source = normalise(err.moderationSource)
  if (source && typed.includes(source)) { return { kind: 'typedWhole', category } }
  return { kind: 'app', category }
}

/**
 * The JSON envelope field a route adds beside `{ code, message }` — see `sendError`'s `extra`.
 * @param {object} report - from moderationReport
 * @returns {{moderation: object}}
 */
function errorExtra (report) {
  return { moderation: report }
}

/**
 * For a JSON route's catch block: answers a moderation block with its report and says so, or
 * does nothing and returns false so the route's own error handling carries on as before.
 *
 * @param {object} res
 * @param {*} err
 * @param {object} [ctx] - as moderationReport
 * @returns {boolean} true when the response was sent
 */
function sendBlocked (res, err, ctx) {
  const report = moderationReport(err, ctx)
  if (!report) { return false }
  sendError(res, BLOCKED_STATUS, 'AI_MODERATION_BLOCKED', BLOCKED_MESSAGE, errorExtra(report))
  return true
}

module.exports = {
  BLOCKED_STATUS,
  BLOCKED_MESSAGE,
  isBlocked,
  moderationReport,
  errorExtra,
  sendBlocked
}
