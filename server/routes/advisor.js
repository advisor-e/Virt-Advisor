'use strict'

/**
 * POST /api/advisor/query
 *
 * Restify route stub — migration target for server-middleware/advisor.js.
 *
 * Phase 2 of the Restify migration (governance §4.2) will move the full
 * SSE streaming logic here. Until then, the Nuxt server-middleware at
 * server-middleware/advisor.js continues to handle all advisor traffic.
 *
 * SSE requires raw Node http.ServerResponse; Restify's res.send() is not
 * suitable. Phase 2 will use res.socket / res.connection directly and
 * disable Restify's response buffering for this route.
 */

function post (req, res, next) {
  res.send(501, {
    success: false,
    error: {
      code: 'NOT_MIGRATED',
      message: 'Advisor SSE route pending phase-2 migration — use /api/advisor/query via Nuxt server-middleware'
    }
  })
  return next()
}

module.exports = { post }
