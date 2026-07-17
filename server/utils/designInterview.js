'use strict'

/**
 * Course-design interview helpers (CB-06, design/COURSE-BUILDER-PLAN.md
 * Phase 4). Code-only pattern matching, mirroring the intake's frustration
 * detector: narrow on purpose, capped by the caller so it can never loop.
 *
 * Three jobs:
 *  - isClarificationRequest: is this reply a question about the question
 *    (re-ask it in plainer words) rather than an answer to store?
 *  - prefillDesignState: pre-fill interview fields the advisor's OPENING
 *    message already answers, so those questions are never asked. Only
 *    confident matches fill — anything ambiguous still gets asked.
 *  - requestedSessionCount: extract the session count the advisor asked for
 *    (CB-26), so code — not the AI — can notice a delivered outline that
 *    ignores it. Conservative: ambiguity (ranges, conflicting counts) parses
 *    as null, which simply disables the check.
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

module.exports = { isClarificationRequest, prefillDesignState, requestedSessionCount }
