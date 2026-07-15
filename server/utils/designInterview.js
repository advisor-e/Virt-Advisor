'use strict'

/**
 * Course-design interview helpers (CB-06, design/COURSE-BUILDER-PLAN.md
 * Phase 4). Code-only pattern matching, mirroring the intake's frustration
 * detector: narrow on purpose, capped by the caller so it can never loop.
 *
 * Two jobs:
 *  - isClarificationRequest: is this reply a question about the question
 *    (re-ask it in plainer words) rather than an answer to store?
 *  - prefillDesignState: pre-fill interview fields the advisor's OPENING
 *    message already answers, so those questions are never asked. Only
 *    confident matches fill — anything ambiguous still gets asked.
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

module.exports = { isClarificationRequest, prefillDesignState }
