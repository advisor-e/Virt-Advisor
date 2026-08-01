'use strict'

/**
 * quizRecord — normalise the per-question detail a course session reports.
 *
 * WHAT IS STORED, AND WHAT DELIBERATELY IS NOT (owner recommendation on file,
 * design/ADVISOR-PROGRESS-HANDOVER.md §6): the question's BANK, its entry NUMBER,
 * pass/fail and the score. **Never the advisor's written answer, the question text,
 * or the marker's feedback.** Advisors write differently once they believe a manager
 * reads their words, which would degrade the very signal the record exists to collect.
 * Text can be added later; it cannot be un-stored.
 *
 * Everything here arrives from the BROWSER. Identity never does — the route takes
 * advisorId/firmId from the verified JWT — but this detail is client-supplied and is
 * therefore treated as hostile: unknown fields are dropped rather than passed through,
 * every value is coerced to its expected type, and both the array and each string are
 * capped so a crafted payload cannot bloat a row or the JSON column.
 */

/** A quiz is a handful of questions; anything beyond this is not a real session. */
const MAX_QUESTIONS = 25
/** Bank keys are page titles from the library — generous, but bounded. */
const MAX_KEY_LENGTH = 160
/** Entry numbers are positions in a bank, not identifiers. */
const MAX_BANK_REF = 9999

/**
 * Clamp an untrusted value to a string of at most `max` characters, or null.
 *
 * @param {*} value @param {number} max @returns {string|null}
 */
function safeString (value, max) {
  if (typeof value !== 'string') { return null }
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

/**
 * Clamp an untrusted value to a whole number within [min, max], or null.
 * Rejects NaN, Infinity, and numeric strings' surprises by requiring a finite number.
 *
 * MISSING IS NOT ZERO (fixed 2026-07-29, found by mutation testing). `Number(null)`,
 * `Number('')`, `Number([])` and `Number(false)` are all **0**, and 0 is a legitimate
 * score — so a question that arrived with no mark at all was being recorded as zero
 * out of 100, indistinguishable from an advisor who genuinely scored nothing. That is
 * a fabricated failure, and the manager-facing view shows it against a named topic.
 * Only a number, or a string with something numeric in it, can be a score; everything
 * else is "no score", exactly as an out-of-range 900 already was.
 *
 * @param {*} value @param {number} min @param {number} max @returns {number|null}
 */
function safeInt (value, min, max) {
  if (typeof value !== 'number' && (typeof value !== 'string' || value.trim() === '')) {
    return null
  }
  const n = Number(value)
  if (!Number.isFinite(n)) { return null }
  const rounded = Math.round(n)
  if (rounded < min || rounded > max) { return null }
  return rounded
}

/**
 * Normalise the per-question detail for one completed course session.
 *
 * @param {*} raw - whatever the client sent as `quizQuestions`.
 * @returns {Array<{bankKey: string|null, bankRef: number|null, score: number|null,
 *   passed: boolean, ungraded: boolean}>} a clean, capped array — empty when the input
 *   is absent or unusable, never null, so callers need no special case.
 */
function normaliseQuizQuestions (raw) {
  if (!Array.isArray(raw)) { return [] }

  const out = []
  for (const item of raw.slice(0, MAX_QUESTIONS)) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) { continue }

    // An ungraded question has no score, and a score of 0 is a real score — so
    // `ungraded` is read from the flag, never inferred from a falsy score.
    const ungraded = item.ungraded === true
    const score = ungraded ? null : safeInt(item.score, 0, 100)

    out.push({
      bankKey: safeString(item.bankKey, MAX_KEY_LENGTH),
      bankRef: safeInt(item.bankRef, 1, MAX_BANK_REF),
      score,
      // Only an explicit true passes. An absent flag is not a pass.
      passed: item.passed === true,
      ungraded
    })
  }
  return out
}

module.exports = { normaliseQuizQuestions, MAX_QUESTIONS, MAX_KEY_LENGTH, MAX_BANK_REF }
