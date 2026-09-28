'use strict'

/**
 * @file A strategy session's concept segments — which have settled, and how their transcripts
 *   join into the one meeting transcript Meeting Review's reports already read.
 * @module server/utils/meetingSegments
 *
 * Item 8.4. Drawing `design/mockups/strategy-session-recording.html`, APPROVED FOR BUILD by
 * Mike 2026-09-28 (as committed in 976533c2); rulings in `design/features/strategy-planner.md`
 * §9b. Pure functions: the store holds the files, `server/routes/meetingSegments.js` runs the
 * jobs, and nothing here touches either.
 *
 * Node 14, CommonJS.
 */

/** A segment in one of these states will not change again. */
const SETTLED_STATES = ['done', 'failed', 'empty']

/**
 * Has every segment finished — transcribed, failed, or closed with nothing in it?
 *
 * @param {Array<object>} segments - `meta.segments`
 * @returns {boolean}
 */
function allSettled (segments) {
  const rows = Array.isArray(segments) ? segments : []
  return rows.every(s => SETTLED_STATES.includes(s.state))
}

/**
 * Join the segments' transcripts into one meeting transcript.
 *
 * 🔴 EACH SEGMENT IS SHIFTED BY WHEN IT STARTED ON THE CLOCK, NOT BY THE SUM OF THE ONES
 * BEFORE. A break sits between two segments (Mike's ruling, 2026-09-28), and timing each row
 * from the wall clock keeps a quote's time true to the meeting — the same clock the planner's
 * navigation timeline records — rather than quietly closing up the lunch hour.
 *
 * 🔴 ATTRIBUTION IS CONFIDENT ONLY IF EVERY TRANSCRIBED SEGMENT WAS. One segment whose voice
 * clip matched nobody has `unknown` roles, and a whole-session "confident" would hide it from
 * the coaching notes, which print that flag above every figure that depends on it (§5 trap 1).
 *
 * ⚠ A FAILED OR EMPTY SEGMENT CONTRIBUTES NO ROWS, and is counted so the reports can say so.
 * Its audio is already gone (P8); there is nothing to recover, only something to disclose.
 *
 * @param {Array<object>} segments - `meta.segments`, each `{n, conceptId, label, state, startedAt}`
 * @param {function(number): (object|null)} readText - one segment's stored transcript by number
 * @returns {{segments: Array<object>, text: string, speakerCount: number,
 *   attributionConfident: boolean, segmentCount: number, missingSegments: Array<number>}}
 */
function joinTranscripts (segments, readText) {
  const rows = (Array.isArray(segments) ? segments : []).slice().sort((a, b) => a.n - b.n)
  const origin = rows.length ? Date.parse(rows[0].startedAt) : NaN

  const joined = []
  const texts = []
  const missing = []
  let confident = true
  let transcribed = 0
  let speakerCount = 0

  rows.forEach((seg) => {
    const text = seg.state === 'done' ? readText(seg.n) : null
    if (!text || !Array.isArray(text.segments)) {
      if (seg.state !== 'empty') { missing.push(seg.n) }
      return
    }
    transcribed += 1
    const started = Date.parse(seg.startedAt)
    const offset = (isFinite(started) && isFinite(origin)) ? Math.max(0, (started - origin) / 1000) : 0
    text.segments.forEach((row) => {
      joined.push({
        ...row,
        start: (Number(row.start) || 0) + offset,
        end: (Number(row.end) || 0) + offset,
        // Which concept the words were said under, so a later reader can place them.
        segment: seg.n,
        conceptId: seg.conceptId || null
      })
    })
    if (typeof text.text === 'string' && text.text) { texts.push(text.text) }
    if (text.attributionConfident !== true) { confident = false }
    speakerCount = Math.max(speakerCount, Number(text.speakerCount) || 0)
  })

  return {
    segments: joined,
    text: texts.join('\n'),
    speakerCount,
    attributionConfident: transcribed > 0 && confident,
    segmentCount: rows.length,
    missingSegments: missing
  }
}

/**
 * The segments as the advisor's screen may see them.
 *
 * ⚠ NO TRANSCRIPT TEXT, for the reason `getRecording` gives: reading words back is the
 * reports' job. The screen needs to know where each segment has got to, nothing more.
 *
 * @param {object} meta
 * @returns {Array<object>}
 */
function publicSegments (meta) {
  return ((meta && meta.segments) || []).map(s => ({
    n: s.n,
    conceptId: s.conceptId || null,
    label: s.label || '',
    state: s.state,
    startedAt: s.startedAt || null,
    closedAt: s.closedAt || null,
    bytes: s.bytes || 0,
    audioDeleted: Boolean(s.audioDeletedAt),
    attributionConfident: typeof s.attributionConfident === 'boolean' ? s.attributionConfident : null
  }))
}

module.exports = {
  SETTLED_STATES,
  allSettled,
  joinTranscripts,
  publicSegments
}
