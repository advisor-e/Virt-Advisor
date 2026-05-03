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

module.exports = { validateAIResponse, parseSSELine }
