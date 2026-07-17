'use strict'

/**
 * Quiz scoring rules for the course builder (CB-03, design/COURSE-BUILDER-PLAN.md).
 *
 * Business rule: a quiz answer that could not be graded (AI/network failure) is
 * recorded as UNGRADED — it must never be given an invented score or pass flag,
 * because quiz scores flow into the session record, the course certificate and
 * firm-level reporting. Ungraded answers are excluded from every average; a quiz
 * with no graded answers yields a null score (the same value the existing
 * skip-quiz path stores), and the advisor's progress is never blocked.
 *
 * Pure (no I/O) so the honesty rules are unit-testable outside the component.
 */

// Shown in place of AI feedback when grading failed. Wording approved by Mike 2026-07-15.
const UNGRADED_FEEDBACK = "We couldn't assess this answer due to a technical problem. It won't count towards your score."

/**
 * Build the result object recorded when grading an answer failed.
 *
 * @param {string} question - the quiz question text
 * @param {string} answer - the advisor's answer as submitted
 * @returns {{ungraded: boolean, passed: null, score: null, feedback: string, question: string, answer: string}}
 */
function ungradedResult (question, answer) {
  return { ungraded: true, passed: null, score: null, feedback: UNGRADED_FEEDBACK, question, answer }
}

/**
 * The subset of results that were genuinely graded by the AI.
 *
 * @param {Array<object>} results - quiz result objects (graded or ungraded)
 * @returns {Array<object>}
 */
function gradedResults (results) {
  return (results || []).filter(r => r && !r.ungraded && typeof r.score === 'number')
}

/**
 * Average score across graded answers only.
 *
 * @param {Array<object>} results - quiz result objects (graded or ungraded)
 * @returns {number|null} rounded 0-100 average, or null when nothing was graded
 */
function overallQuizScore (results) {
  const graded = gradedResults(results)
  if (!graded.length) { return null }
  return Math.round(graded.reduce((sum, r) => sum + r.score, 0) / graded.length)
}

/**
 * Pass/fail verdict for the whole quiz — graded answers only, 70+ passes.
 * A fully ungraded quiz is neither passed nor failed (see quizFullyUngraded).
 *
 * @param {Array<object>} results - quiz result objects (graded or ungraded)
 * @returns {boolean}
 */
function quizPassed (results) {
  const score = overallQuizScore(results)
  return score !== null && score >= 70
}

/**
 * True when the quiz finished but not a single answer could be graded —
 * the results screen then explains the marking failure instead of a verdict.
 *
 * @param {Array<object>} results - quiz result objects (graded or ungraded)
 * @returns {boolean}
 */
function quizFullyUngraded (results) {
  return (results || []).length > 0 && gradedResults(results).length === 0
}

module.exports = { UNGRADED_FEEDBACK, ungradedResult, gradedResults, overallQuizScore, quizPassed, quizFullyUngraded }
