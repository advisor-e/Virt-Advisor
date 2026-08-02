'use strict'

/**
 * Course-design interview helpers (CB-06, design/COURSE-BUILDER-PLAN.md
 * Phase 4). Code-only pattern matching, mirroring the intake's frustration
 * detector: narrow on purpose, capped by the caller so it can never loop.
 *
 * Four jobs:
 *  - isClarificationRequest: is this reply a question about the question
 *    (re-ask it in plainer words) rather than an answer to store?
 *  - prefillDesignState: pre-fill interview fields the advisor's OPENING
 *    message already answers, so those questions are never asked. Only
 *    confident matches fill — anything ambiguous still gets asked.
 *  - requestedSessionCount: extract the session count the advisor asked for
 *    (CB-26), so code — not the AI — can notice a delivered outline that
 *    ignores it. Conservative: ambiguity (ranges, conflicting counts) parses
 *    as null, which simply disables the check.
 *  - requestedSessionMinutes: the same idea for the OTHER half of the same
 *    answer. The interview asks for length and count in one question, but only
 *    the count was ever read back out; the length went to the AI as prose and
 *    came back as an unchecked echo. Same conservative contract — a range or
 *    two conflicting figures parse as null and stand the check down.
 */

// A question about the question. A miss is safe: the reply is stored and the
// outline-revision loop remains the safety net.
const CLARIFICATION_RE = new RegExp(
  '^(\\?+|huh\\??|what\\??|pardon( me)?\\??|sorry\\??)$' +
  '|\\b(what do(es)? (you|that|this) mean|what does that question mean|what are you asking' +
  '|can you (explain|clarify|rephrase)|could you (explain|clarify|rephrase)|please (explain|clarify|rephrase)' +
  "|i('?m| am)? ?not sure what you mean|i do(n'?t| not) (quite )?understand|not sure (i understand|what you mean)" +
  "|do(n'?t| not) know what you mean)\\b",
  'i'
)

/**
 * @param {string} reply - the advisor's raw reply to a pending question
 * @returns {boolean} true when the reply asks for clarification instead of answering
 */
function isClarificationRequest (reply) {
  return CLARIFICATION_RE.test(String(reply || '').trim())
}

// ── Opening-message pre-fill patterns (conservative by design) ──────────────

// Session format: requires BOTH a session count and a minutes figure.
const SESSION_COUNT_RE = /(\d{1,2})\s*(sessions?|modules?|parts?|lessons?)\b/i
const SESSION_MINUTES_RE = /(\d{1,3})\s*(minutes?|mins?)\b/i

// Intensity: fills only when exactly one side matches.
const PROGRESSIVE_RE = /\b(progressive(ly)?|ramp(s|ing)? up|build(s|ing)? up|(get|gets|getting|becom(e|es|ing))\s+(more\s+)?(challenging|harder|tougher|more advanced)|increasing (difficulty|complexity))\b/i
const CONSISTENT_RE = /\b(consistent( depth| level)?|same (level|depth|difficulty)( throughout)?|steady (level|depth|pace)|constant (depth|level))\b/i

// Experience level: an explicit self-assessment, not an inference.
const BEGINNER_RE = /\b((complete|total|absolute)\s+(beginner|novice)|never (done|sold|delivered|run|used) |no (prior |previous )?(experience|training)|new to (this|the topic|it)|zero experience)\b/i
const EXPERIENCED_RE = /\b(\d{1,2}\+?\s*years?('|s)?\s*(of\s*)?experience|(very|highly)\s+experienced|done (this|it) (for years|many times))\b/i

/**
 * Pre-fill interview fields the opening message already answers. Mutates and
 * returns `state`; fields left null will still be asked one at a time.
 *
 * @param {object} state - the design pipeline state (fields may be null)
 * @param {string} openingMessage - the advisor's first message (their goals)
 * @returns {object} the same state, with any confidently-answered fields filled
 */
function prefillDesignState (state, openingMessage) {
  const text = String(openingMessage || '')

  if (!state.sessionDetails) {
    const count = text.match(SESSION_COUNT_RE)
    const minutes = text.match(SESSION_MINUTES_RE)
    if (count && minutes) {
      state.sessionDetails = `${count[1]} sessions of ${minutes[1]} minutes`
    }
  }

  if (!state.intensity) {
    const progressive = PROGRESSIVE_RE.test(text)
    const consistent = CONSISTENT_RE.test(text)
    if (progressive !== consistent) {
      state.intensity = progressive
        ? 'progressive — sessions should build in difficulty'
        : 'consistent — sessions at the same depth throughout'
    }
  }

  if (!state.currentLevel) {
    const beginner = text.match(BEGINNER_RE)
    const experienced = text.match(EXPERIENCED_RE)
    if (beginner && !experienced) {
      state.currentLevel = beginner[0].trim()
    } else if (experienced && !beginner) {
      state.currentLevel = experienced[0].trim()
    }
  }

  return state
}

// ── Requested session count (CB-26) ─────────────────────────────────────────

const COUNT_WORDS = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20
}

const SESSION_NOUN = '(?:sessions?|modules?|parts?|lessons?)'
const COUNT_TOKEN = '(?:\\d{1,2}|' + Object.keys(COUNT_WORDS).join('|') + ')'

// "6-8 sessions", "six to eight sessions", "6 or 8 sessions" — a range is not
// a request for a specific count; the check stands down.
const RANGE_BEFORE_NOUN_RE = new RegExp(
  COUNT_TOKEN + '\\s*(?:-|–|—|\\bto\\b|\\bor\\b)\\s*' + COUNT_TOKEN + '\\s*' + SESSION_NOUN, 'i'
)
const DIGIT_COUNT_RE = new RegExp('\\b(\\d{1,2})\\s*' + SESSION_NOUN, 'gi')
const WORD_COUNT_RE = new RegExp('\\b(' + Object.keys(COUNT_WORDS).join('|') + ')\\s+' + SESSION_NOUN, 'gi')

/**
 * Extract the specific session count the advisor asked for, or null when no
 * single unambiguous count is present ("a few sessions", "6-8 sessions",
 * conflicting numbers). Word forms ("six sessions") count — the live CB-26
 * case was spelled out and sailed past the digit-only pre-fill.
 * @param {string} text - the advisor's session-format answer (raw typing)
 * @returns {number|null} 1–30, or null to disable the check
 */
function requestedSessionCount (text) {
  const t = String(text || '')
  if (RANGE_BEFORE_NOUN_RE.test(t)) { return null }
  const found = new Set()
  let m
  DIGIT_COUNT_RE.lastIndex = 0
  while ((m = DIGIT_COUNT_RE.exec(t))) { found.add(Number(m[1])) }
  WORD_COUNT_RE.lastIndex = 0
  while ((m = WORD_COUNT_RE.exec(t))) { found.add(COUNT_WORDS[m[1].toLowerCase()]) }
  if (found.size !== 1) { return null }
  const n = found.values().next().value
  return (n >= 1 && n <= 30) ? n : null
}

// ── Requested session LENGTH ────────────────────────────────────────────────

/**
 * Word forms for a duration. Longest-first in the alternation below, or
 * "forty" would match before "forty-five" and read 45 minutes as 40.
 */
const MINUTE_WORDS = Object.assign({}, COUNT_WORDS, {
  fifteen: 15,
  thirty: 30,
  forty: 40,
  'forty-five': 45,
  'forty five': 45,
  fifty: 50,
  sixty: 60,
  ninety: 90
})
const MINUTE_WORD_TOKEN = Object.keys(MINUTE_WORDS)
  .sort((a, b) => b.length - a.length)
  .join('|')

const MINUTE_NOUN = '(?:minutes?|mins?)'
const HOUR_NOUN = '(?:hours?|hrs?)'
const NUM = '(\\d{1,3}(?:\\.\\d+)?)'

// "1 hour 30", "2 hrs and 15 minutes" — read as one duration, not two figures.
const COMPOUND_RE = new RegExp(NUM + '\\s*' + HOUR_NOUN + '\\s*(?:and\\s*)?(\\d{1,2})\\s*' + MINUTE_NOUN + '?', 'gi')
const HOUR_RE = new RegExp('\\b' + NUM + '\\s*' + HOUR_NOUN, 'gi')
const MINUTE_DIGIT_RE = new RegExp('\\b' + NUM + '\\s*' + MINUTE_NOUN, 'gi')
const MINUTE_WORD_RE = new RegExp('\\b(' + MINUTE_WORD_TOKEN + ')\\s*' + MINUTE_NOUN, 'gi')

// "30-45 minutes", "30 to 45 mins", "an hour or two" — a range is not a
// request for a specific length; the check stands down exactly as it does for
// a range of session counts.
const MINUTE_RANGE_RE = new RegExp(
  '(?:\\d{1,3}|' + MINUTE_WORD_TOKEN + ')\\s*(?:-|–|—|\\bto\\b|\\bor\\b)\\s*' +
  '(?:\\d{1,3}|' + MINUTE_WORD_TOKEN + ')\\s*(?:' + MINUTE_NOUN + '|' + HOUR_NOUN + ')', 'i'
)

/** Below this a "session" is not a session; above it, not one sitting. */
const MIN_SESSION_MINUTES = 5
const MAX_SESSION_MINUTES = 480

const HYPHENATED_WORDS_RE = /\b([a-z]+)-([a-z]+)\b/gi

/**
 * "forty-five" is one number, not a range from forty to five. Only hyphenated
 * pairs that are a KNOWN compound are joined; "thirty-forty" is left alone and
 * still reads as the range it is.
 *
 * @param {string} text @returns {string}
 */
function normaliseCompoundWords (text) {
  return text.replace(HYPHENATED_WORDS_RE, (whole, a, b) => (
    Object.prototype.hasOwnProperty.call(MINUTE_WORDS, `${a.toLowerCase()}-${b.toLowerCase()}`)
      ? `${a} ${b}`
      : whole
  ))
}

/**
 * Extract the per-session length the advisor asked for, in whole minutes.
 *
 * Hours are converted ("1 hour" → 60, "1 hour 30" → 90) because advisors state
 * a long session in hours and the comparison downstream is in minutes. As with
 * the session count, anything ambiguous returns null and simply disables the
 * check — a wrong figure here would raise a false warning on a correct course,
 * which is worse than no warning at all.
 *
 * @param {string} text - the advisor's session-format answer (raw typing)
 * @returns {number|null} 5–480 whole minutes, or null to disable the check
 */
function requestedSessionMinutes (text) {
  let t = normaliseCompoundWords(String(text || ''))
  if (MINUTE_RANGE_RE.test(t)) { return null }

  const found = new Set()
  const blank = m => ' '.repeat(m.length)

  // Compounds first, and blanked out, so "1 hour 30 minutes" is not also read
  // as a 1 and a 30.
  COMPOUND_RE.lastIndex = 0
  t = t.replace(COMPOUND_RE, (m, h, mins) => {
    found.add(Math.round(Number(h) * 60 + Number(mins)))
    return blank(m)
  })

  HOUR_RE.lastIndex = 0
  t = t.replace(HOUR_RE, (m, h) => {
    found.add(Math.round(Number(h) * 60))
    return blank(m)
  })

  MINUTE_DIGIT_RE.lastIndex = 0
  t = t.replace(MINUTE_DIGIT_RE, (m, mins) => {
    found.add(Math.round(Number(mins)))
    return blank(m)
  })

  MINUTE_WORD_RE.lastIndex = 0
  t.replace(MINUTE_WORD_RE, (m, word) => {
    found.add(MINUTE_WORDS[word.toLowerCase()])
    return m
  })

  if (found.size !== 1) { return null }
  const n = found.values().next().value
  return (n >= MIN_SESSION_MINUTES && n <= MAX_SESSION_MINUTES) ? n : null
}

module.exports = {
  isClarificationRequest,
  prefillDesignState,
  requestedSessionCount,
  requestedSessionMinutes,
  MIN_SESSION_MINUTES,
  MAX_SESSION_MINUTES
}
