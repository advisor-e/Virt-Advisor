'use strict'

/**
 * Escapes the HTML-significant characters in a plain-text value so it can be
 * safely interpolated into a string that will be rendered as HTML.
 *
 * WHY THIS EXISTS (security, load-bearing): Buefy renders `$buefy.dialog` /
 * `$buefy.toast` `message` content with `v-html`. Any firm- or mentor-authored
 * value (document name, video title, distinction description) placed into a
 * dialog message is otherwise a stored-XSS vector. Escape the untrusted value
 * with this helper before interpolating; leave the surrounding static markup
 * (e.g. `<strong>…</strong>`) untouched.
 *
 * @param {*} value - the untrusted value (coerced to string; null/undefined → '')
 * @returns {string} the value with `&`, `<`, `>` replaced by HTML entities
 */
function escapeHtml (value) {
  if (value === null || value === undefined) { return '' }
  // Order matters: replace `&` first so we don't double-escape the entities below.
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

module.exports = { escapeHtml }
