'use strict'

/**
 * Input sanitisation for untrusted, user-supplied text before it leaves the
 * backend (e.g. to a third-party API) or is embedded in a prompt.
 *
 * CLAUDE.md §Security: "Treat user input in prompts as hostile" and never send
 * raw external input onward. Pure functions — no side effects, no I/O — so they
 * are trivially testable to the 100% target (CLAUDE.md §Testing).
 */

const DEFAULT_MAX_LENGTH = 5000
const FORBIDDEN_KEYS = ['__proto__', 'constructor', 'prototype']

/**
 * Remove ASCII control characters, keeping tab (9), newline (10) and carriage
 * return (13) which are legitimate in multi-line user text. Filtering by char
 * code avoids a control-character regex (and ESLint's no-control-regex rule).
 *
 * @param {string} s
 * @returns {string}
 */
function stripControlChars (s) {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i)
    if ((code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127) { continue }
    out += s[i]
  }
  return out
}

/**
 * Coerce a value to a safe, length-bounded string: drop control characters,
 * trim surrounding whitespace, and cap the length.
 *
 * @param {*} value - any value (coerced to string; null/undefined → '')
 * @param {{ maxLength?: number }} [options]
 * @returns {string} sanitised text
 */
function sanitiseText (value, options) {
  const opts = options || {}
  const maxLength = typeof opts.maxLength === 'number' ? opts.maxLength : DEFAULT_MAX_LENGTH
  if (value === null || value === undefined) { return '' }
  let s = stripControlChars(String(value)).trim()
  if (s.length > maxLength) { s = s.slice(0, maxLength) }
  return s
}

/**
 * Sanitise every value of a flat object, skipping prototype-polluting keys.
 * Non-object input (null, array, primitive) yields an empty object.
 *
 * @param {Object} obj - flat key→value map of untrusted values
 * @param {{ maxLength?: number }} [options] - passed to sanitiseText
 * @returns {Object} new object of sanitised string values
 */
function sanitiseValues (obj, options) {
  const out = {}
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) { return out }
  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_KEYS.includes(key)) { continue }
    out[key] = sanitiseText(obj[key], options)
  }
  return out
}

module.exports = { sanitiseText, sanitiseValues, stripControlChars, DEFAULT_MAX_LENGTH }
