'use strict'

/**
 * The single home for the standard error envelope mandated by CLAUDE.md
 * (§Error handling): { success: false, error: { code, message }, timestamp }.
 *
 * Two senders share one builder so the shape can never drift between the raw
 * Node http proxy and the Restify routes:
 *   - sendError()    — raw Node http (server-middleware/api.js): writeHead + end
 *   - sendApiError() — Restify routes/middleware: res.send(status, envelope)
 */

/**
 * Build the standard error envelope.
 * @param {string} code     - Machine-readable error code (SCREAMING_SNAKE_CASE)
 * @param {string} message  - Human-readable, safe description (no stack/SQL/paths)
 * @returns {{ success: false, error: { code: string, message: string }, timestamp: string }}
 */
function errorEnvelope (code, message) {
  return { success: false, error: { code, message }, timestamp: new Date().toISOString() }
}

/**
 * Raw Node http: write the envelope and end the response. No-op if headers are
 * already sent (used by the Nuxt server-middleware proxy).
 *
 * @param {object} res      - Node.js ServerResponse
 * @param {number} status   - HTTP status code (400, 413, 500, …)
 * @param {string} code     - Machine-readable error code
 * @param {string} message  - Human-readable description
 */
function sendError (res, status, code, message) {
  if (res.headersSent) { return }
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(errorEnvelope(code, message)))
}

/**
 * Restify: send the envelope via res.send(status, body). Used by the API routes
 * and the auth middleware so every route error carries the mandated timestamp.
 *
 * @param {object} res      - Restify response
 * @param {number} status   - HTTP status code
 * @param {string} code     - Machine-readable error code
 * @param {string} message  - Human-readable description
 */
function sendApiError (res, status, code, message) {
  res.send(status, errorEnvelope(code, message))
}

module.exports = { sendError, sendApiError, errorEnvelope }
