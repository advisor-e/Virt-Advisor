'use strict'

/**
 * @file AI response validation utilities.
 * Governance framework §5.2 — LLM output must never be trusted as valid structured data.
 * Parse and validate the shape of every AI response before saving to state or the database.
 * @module server/utils/validateAIResponse
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean}  valid  - True when the response passes all checks
 * @property {string[]} errors - List of validation failure messages (empty when valid)
 * @property {Object|null} data - The validated response object, or null on failure
 */

/**
 * Validates a quiz-generation AI response and normalises the questions key.
 * Accepts the key variations the model may use (questions / quiz_questions /
 * quiz / items). Valid = a non-empty array of question objects, each carrying a
 * non-empty `question` string. The whole batch is rejected if any item is
 * malformed, so a partially-broken quiz is never served.
 *
 * @param {*} response - The parsed AI response to validate
 * @returns {ValidationResult} `data` is `{ questions: Array }` when valid
 */
function validateQuizGenerate (response) {
  if (response === null || typeof response !== 'object' || Array.isArray(response)) {
    return { valid: false, errors: ['Response must be a plain object'], data: null }
  }

  const questions = response.questions || response.quiz_questions || response.quiz || response.items
  if (!Array.isArray(questions) || questions.length === 0) {
    return { valid: false, errors: ['Missing or empty questions array'], data: null }
  }

  for (const q of questions) {
    if (q === null || typeof q !== 'object' || Array.isArray(q)) {
      return { valid: false, errors: ['Each question must be a plain object'], data: null }
    }
    if (typeof q.question !== 'string' || q.question.trim() === '') {
      return { valid: false, errors: ['Each question must have a non-empty question string'], data: null }
    }
  }

  return { valid: true, errors: [], data: { questions } }
}

/**
 * Validates a quiz-grade AI response. Valid = a boolean `passed`, a numeric
 * `score` in [0, 100], and a non-empty `feedback` string. Used before an
 * advisor's course pass/fail is recorded — an invalid grade must never be
 * trusted (it could otherwise mark a pass on malformed model output).
 *
 * @param {*} response - The parsed AI response to validate
 * @returns {ValidationResult} `data` is `{ passed, score, feedback }` when valid
 */
function validateQuizGrade (response) {
  if (response === null || typeof response !== 'object' || Array.isArray(response)) {
    return { valid: false, errors: ['Response must be a plain object'], data: null }
  }

  const errors = []

  if (typeof response.passed !== 'boolean') {
    errors.push(`Field 'passed' must be a boolean, got ${typeof response.passed}`)
  }

  if (typeof response.score !== 'number' || Number.isNaN(response.score) || response.score < 0 || response.score > 100) {
    errors.push("Field 'score' must be a number between 0 and 100")
  }

  if (typeof response.feedback !== 'string' || response.feedback.trim() === '') {
    errors.push("Field 'feedback' must be a non-empty string")
  }

  if (errors.length > 0) {
    return { valid: false, errors, data: null }
  }

  return { valid: true, errors: [], data: { passed: response.passed, score: response.score, feedback: response.feedback } }
}

/**
 * Validates a course-outline AI response (the [COURSE_OUTLINE] JSON emitted by
 * the design stream). Valid = an object with a non-empty `title` string and a
 * non-empty `sessions` array whose every item is an object carrying a non-empty
 * `title`. These are the fields the Course Builder screen actually depends on
 * (`pendingOutline.title`, the `v-for` over `pendingOutline.sessions`, and later
 * `activeCourse.outline.sessions.length`/index access), so a wrong-shape outline
 * must never reach state — it would render a broken or blank course view. The
 * whole outline is rejected if any session is malformed.
 *
 * @param {*} response - The parsed AI response to validate
 * @returns {ValidationResult} `data` is the validated outline object when valid
 */
function validateCourseOutline (response) {
  if (response === null || typeof response !== 'object' || Array.isArray(response)) {
    return { valid: false, errors: ['Response must be a plain object'], data: null }
  }

  const errors = []

  if (typeof response.title !== 'string' || response.title.trim() === '') {
    errors.push("Field 'title' must be a non-empty string")
  }

  if (!Array.isArray(response.sessions) || response.sessions.length === 0) {
    errors.push("Field 'sessions' must be a non-empty array")
  } else {
    for (const s of response.sessions) {
      if (s === null || typeof s !== 'object' || Array.isArray(s)) {
        errors.push('Each session must be a plain object')
        break
      }
      if (typeof s.title !== 'string' || s.title.trim() === '') {
        errors.push('Each session must have a non-empty title string')
        break
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, data: null }
  }

  return { valid: true, errors: [], data: response }
}

module.exports = { validateQuizGenerate, validateQuizGrade, validateCourseOutline }
