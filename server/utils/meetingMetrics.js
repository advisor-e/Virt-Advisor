'use strict'

/**
 * @file The measured half of My Coaching Notes — arithmetic over a timed, speaker-labelled
 *   transcript. No model is called from this file and none ever should be.
 * @module server/utils/meetingMetrics
 *
 * Design: `design/features/meeting-review.md` P9 and §3 ("the mechanical set is cheap,
 * credible and should ship first"). Screens: `design/mockups/meeting-review.html` C2,
 * approved by Mike 2026-09-01.
 *
 * 🔴 P9 IS THE WHOLE POINT OF THIS MODULE, AND THE SCREEN SAYS SO OUT LOUD. The approved
 * drawing prints *"Counted from the transcript by arithmetic. No AI is involved, and none of
 * these can be wrong"* underneath these figures. That sentence is a promise to the advisor,
 * so anything this module returns must be derivable from segment timings and text alone.
 * Routing one of these through a model would convert a fact that cannot be wrong into a claim
 * that can — while the caption on screen still said otherwise.
 *
 * ⚠ WHICH IS WHY "ACTIONS AGREED" IS NOT HERE, THOUGH THE DRAWING PUTS IT IN THIS BLOCK.
 * Whether the meeting reached agreed actions cannot be counted; it has to be understood. It is
 * produced by the Meeting Summary generator with a citation and rendered OUTSIDE this block,
 * because leaving it inside would have printed "no AI is involved" above a figure an AI
 * produced. Named as a deviation in `design/ARTEFACTS.md`.
 *
 * ⚠ AND WHY THERE IS NO JARGON COUNT. The drawing's sixth tile counts terms from the firm's
 * glossary. No glossary exists in this application, and writing a default word-list here would
 * be inventing Mike's advisory content — the thing slice 1 refused to do when it left ten
 * meeting scenarios empty. Removed from slice 3 on his ruling of 2026-09-02; the tile is
 * absent rather than empty, because a permanently blank figure reads as a bug.
 *
 * Node 14, CommonJS.
 */

/**
 * A pause is only a pause if it is long enough to be one. Gaps below this are the ordinary
 * seam between two turns of speech, not silence anybody experienced.
 */
const MIN_GAP_SECONDS = 0.25

/**
 * How long a run of advisor speech may be interrupted and still count as one stretch. A
 * client saying "mm" does not end a four-minute monologue, and treating it as though it did
 * would report the flattering number rather than the true one.
 */
const MONOLOGUE_TOLERANCE_SECONDS = 2

/**
 * The openings that make a question open. Deliberately a small, checkable list rather than a
 * clever classifier: an advisor reading "9 open against 23 closed" is owed a number they
 * could verify by hand from their own transcript.
 */
const OPEN_OPENERS = [
  'who', 'what', 'when', 'where', 'why', 'how',
  'tell me', 'talk me', 'walk me', 'describe', 'explain'
]

/** Seconds as m:ss, the form the approved drawing prints. */
function asClock (seconds) {
  const whole = Math.max(0, Math.round(seconds))
  const mins = Math.floor(whole / 60)
  const secs = whole % 60
  return mins + ':' + String(secs).padStart(2, '0')
}

/**
 * Only the segments this module can safely measure.
 *
 * A segment with no usable timing is dropped rather than defaulted, because a zero-length
 * turn silently deflates every ratio computed from it.
 *
 * @param {*} transcript
 * @returns {Array<{role: string, start: number, end: number, text: string}>}
 */
function usableSegments (transcript) {
  const raw = (transcript && Array.isArray(transcript.segments)) ? transcript.segments : []
  const rows = []
  raw.forEach((s) => {
    if (s === null || typeof s !== 'object') { return }
    const start = Number(s.start)
    const end = Number(s.end)
    if (!isFinite(start) || !isFinite(end) || start < 0 || end < start) { return }
    rows.push({
      role: (s.role === 'advisor' || s.role === 'client') ? s.role : 'unknown',
      start,
      end,
      text: typeof s.text === 'string' ? s.text : ''
    })
  })
  rows.sort((a, b) => a.start - b.start)
  return rows
}

/**
 * Who spoke, as a share of the time anybody was speaking.
 *
 * ⚠ THE DENOMINATOR IS SPEECH, NOT WALL-CLOCK. Silence belongs to neither party, and counting
 * it against both would make a thoughtful meeting look like a quiet one.
 *
 * @param {Array<object>} segments
 * @returns {{advisorSeconds: number, clientSeconds: number, advisorPercent: (number|null),
 *   clientPercent: (number|null)}}
 */
function talkTime (segments) {
  let advisorSeconds = 0
  let clientSeconds = 0
  segments.forEach((s) => {
    const dur = s.end - s.start
    if (s.role === 'advisor') { advisorSeconds += dur }
    if (s.role === 'client') { clientSeconds += dur }
  })

  const total = advisorSeconds + clientSeconds
  if (total <= 0) {
    return { advisorSeconds: 0, clientSeconds: 0, advisorPercent: null, clientPercent: null }
  }

  // Rounded so the two always sum to 100 on screen — a split reading 78% / 21% invites a
  // question about the missing point that has nothing to do with the meeting.
  const advisorPercent = Math.round((advisorSeconds / total) * 100)
  return {
    advisorSeconds,
    clientSeconds,
    advisorPercent,
    clientPercent: 100 - advisorPercent
  }
}

/**
 * The longest unbroken run of advisor speech.
 *
 * @param {Array<object>} segments
 * @returns {{seconds: number, clock: string, startedAt: (number|null)}}
 */
function longestMonologue (segments) {
  let best = 0
  let bestStart = null
  let runStart = null
  let runEnd = null

  segments.forEach((s) => {
    if (s.role !== 'advisor') {
      // A client turn only ends the run if it was long enough to be a turn.
      if (runStart !== null && (s.end - s.start) > MONOLOGUE_TOLERANCE_SECONDS) {
        runStart = null
        runEnd = null
      }
      return
    }
    if (runStart === null) {
      runStart = s.start
    }
    runEnd = s.end
    const length = runEnd - runStart
    if (length > best) {
      best = length
      bestStart = runStart
    }
  })

  return { seconds: best, clock: asClock(best), startedAt: bestStart }
}

/**
 * Split one turn of speech into sentences that are questions.
 *
 * @param {string} text
 * @returns {Array<string>}
 */
function questionsIn (text) {
  if (typeof text !== 'string' || !text.includes('?')) { return [] }
  // Split on sentence ends, keeping the mark, then take the ones that end in a question.
  const parts = text.split(/(?<=[.!?])\s+/)
  const found = []
  parts.forEach((p) => {
    const trimmed = p.trim()
    if (trimmed.length && trimmed.charAt(trimmed.length - 1) === '?') { found.push(trimmed) }
  })
  // A turn containing "?" but no sentence boundary the splitter recognised is still one
  // question — losing it would under-count rather than fail visibly.
  if (!found.length && text.trim().length) { found.push(text.trim()) }
  return found
}

/** True when a question opens with one of the words that invites more than yes or no. */
function isOpenQuestion (sentence) {
  const cleaned = String(sentence).toLowerCase().replace(/^[^a-z]+/, '')
  for (let i = 0; i < OPEN_OPENERS.length; i += 1) {
    const opener = OPEN_OPENERS[i]
    if (cleaned.indexOf(opener) === 0) { return true }
  }
  return false
}

/**
 * The advisor's questions, split open from closed.
 *
 * @param {Array<object>} segments
 * @returns {{open: number, closed: number, total: number}}
 */
function questionMix (segments) {
  let open = 0
  let closed = 0
  segments.forEach((s) => {
    if (s.role !== 'advisor') { return }
    questionsIn(s.text).forEach((q) => {
      if (isOpenQuestion(q)) { open += 1 } else { closed += 1 }
    })
  })
  return { open, closed, total: open + closed }
}

/**
 * How long the advisor leaves after their own question before filling the silence.
 *
 * 🔴 THIS DELIBERATELY MEASURES ADVISOR → ADVISOR ONLY, and the approved drawing's own
 * sub-label is why: *"before you spoke again"*. A question the client answered has no such
 * gap, and folding those in would report a comfortable average over the cases where the
 * advisor did wait — which is the opposite of what an advisor needs to see.
 *
 * @param {Array<object>} segments
 * @returns {{medianSeconds: (number|null), occasions: number}}
 */
function pauseAfterAsking (segments) {
  const gaps = []
  for (let i = 0; i < segments.length - 1; i += 1) {
    const here = segments[i]
    const next = segments[i + 1]
    if (here.role !== 'advisor' || next.role !== 'advisor') { continue }
    if (!questionsIn(here.text).length) { continue }
    const gap = next.start - here.end
    if (gap >= MIN_GAP_SECONDS) { gaps.push(gap) }
  }

  if (!gaps.length) { return { medianSeconds: null, occasions: 0 } }

  gaps.sort((a, b) => a - b)
  const mid = Math.floor(gaps.length / 2)
  const median = gaps.length % 2
    ? gaps[mid]
    : (gaps[mid - 1] + gaps[mid]) / 2

  return { medianSeconds: Math.round(median * 10) / 10, occasions: gaps.length }
}

/**
 * Wall-clock length of the meeting, from the first word to the last.
 *
 * @param {Array<object>} segments
 * @returns {{seconds: number, clock: string}}
 */
function meetingLength (segments) {
  if (!segments.length) { return { seconds: 0, clock: asClock(0) } }
  let last = 0
  segments.forEach((s) => { if (s.end > last) { last = s.end } })
  const seconds = last - segments[0].start
  return { seconds, clock: asClock(seconds) }
}

/**
 * Every mechanical figure for one meeting.
 *
 * ⚠ `attributionConfident: false` MEANS THE SPLIT AND THE MONOLOGUE ARE NOT TRUSTWORTHY, and
 * it is carried out of here rather than swallowed. §5 trap 1: a degraded diarization must fail
 * visibly, because every role-dependent figure below silently becomes a coin toss while still
 * rendering as a confident percentage. The screen is responsible for saying so; this module is
 * responsible for not hiding it.
 *
 * @param {object} transcript - as written by `runTranscription`
 * @returns {{usable: boolean, attributionConfident: boolean, segmentCount: number,
 *   talkTime: object, longestMonologue: object, questions: object, pauseAfterAsking: object,
 *   length: object}}
 */
function computeMetrics (transcript) {
  const segments = usableSegments(transcript)
  return {
    usable: segments.length > 0,
    // A transcript that never recorded the flag is treated as NOT confident. The safe default
    // for "we do not know whether we could tell the speakers apart" is that we could not.
    attributionConfident: Boolean(transcript && transcript.attributionConfident),
    segmentCount: segments.length,
    talkTime: talkTime(segments),
    longestMonologue: longestMonologue(segments),
    questions: questionMix(segments),
    pauseAfterAsking: pauseAfterAsking(segments),
    length: meetingLength(segments)
  }
}

module.exports = {
  MIN_GAP_SECONDS,
  MONOLOGUE_TOLERANCE_SECONDS,
  OPEN_OPENERS,
  asClock,
  usableSegments,
  talkTime,
  longestMonologue,
  questionsIn,
  isOpenQuestion,
  questionMix,
  pauseAfterAsking,
  meetingLength,
  computeMetrics
}
