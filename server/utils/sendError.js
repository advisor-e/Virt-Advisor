'use strict'

/**
 * Writes a standardised JSON error envelope to the response and ends it.
 *
 * Envelope: { success: false, error: { code, message }, timestamp }
 *
 * @param {object} res      - Node.js ServerResponse
 * @param {number} status   - HTTP status code (400, 413, 500, …)
 * @param {string} code     - Machine-readable error code (SCREAMING_SNAKE_CASE)
 * @param {string} message  - Human-readable description
 * @param {object} [extra]  - further fields for `error`, built by the caller from known-safe
 *   parts only — e.g. a moderation report (`moderationReport.errorExtra`). Never an Error object.
 */
function sendError (res, status, code, message, extra) {
  if (res.headersSent) { return }
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({
    success: false,
    error: Object.assign({}, extra, { code, message }),
    timestamp: new Date().toISOString()
  }))
}

module.exports = { sendError }
