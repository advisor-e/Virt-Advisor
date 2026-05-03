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
 */
function sendError (res, status, code, message) {
  if (res.headersSent) { return }
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({
    success: false,
    error: { code, message },
    timestamp: new Date().toISOString()
  }))
}

module.exports = { sendError }
