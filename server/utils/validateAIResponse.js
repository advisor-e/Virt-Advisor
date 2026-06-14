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
 * Validates the shape of a completed AI response object.
 * Used before committing any AI-generated content to application state.
 *
 * Test coverage requirement: 100% branches (governance framework §11.2).
 *
 * @param {*} response - The parsed AI response to validate
 * @returns {ValidationResult}
 */
function validateAIResponse (response) {
  if (response === null || response === undefined) {
    return { valid: false, errors: ['Response is null or undefined'], data: null }
  }

  if (typeof response !== 'object' || Array.isArray(response)) {
    return { valid: false, errors: ['Response must be a plain object'], data: null }
  }

  const errors = []

  if (!('content' in response)) {
    errors.push('Missing required field: content')
  } else if (typeof response.content !== 'string') {
    errors.push(`Field 'content' must be a string, got ${typeof response.content}`)
  }

  if (errors.length > 0) {
    return { valid: false, errors, data: null }
  }

  return { valid: true, errors: [], data: response }
}

/**
 * Parses a single Server-Sent Events data line from the advisor stream.
 * Returns null for any line that cannot be safely parsed — callers must
 * handle null without crashing (governance framework §12.3).
 *
 * @param {*} line - Raw SSE line (expected: "data: {...}")
 * @returns {{ type: string, [key: string]: * } | null} Parsed event object, or null
 */
function parseSSELine (line) {
  if (typeof line !== 'string') { return null }

  const trimmed = line.trim()
  if (!trimmed.startsWith('data: ')) { return null }

  const jsonPart = trimmed.slice('data: '.length)
  let parsed
  try {
    parsed = JSON.parse(jsonPart)
  } catch {
    return null
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null
  }

  return parsed
}

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

module.exports = { validateAIResponse, parseSSELine, validateQuizGenerate, validateQuizGrade }
