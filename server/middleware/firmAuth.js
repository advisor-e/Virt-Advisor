'use strict'

/**
 * firmAuth — Restify request middleware.
 *
 * Reads the Bearer token from the Authorization header, verifies it, and
 * attaches req.firmId, req.userRole, and req.userEmail to the request object
 * so downstream route handlers can use them safely.
 *
 * INTEGRATION NOTE (for Advisor-e team):
 *   1. Set AUTH.secret in config/integration.js to the JWT signing secret.
 *   2. Set AUTH.firmIdClaim / AUTH.roleClaim / AUTH.emailClaim to the correct
 *      field names used in the Advisor-e JWT payload.
 *   3. If Advisor-e signs tokens with RS256 (asymmetric), replace the
 *      jwt.verify(token, AUTH.secret) call below with:
 *        jwt.verify(token, fs.readFileSync(AUTH.publicKeyPath))
 *      and add AUTH.publicKeyPath to config/integration.js.
 *
 * Usage in restify-server.js:
 *   const { firmAuth, requireManagerRole } = require('./middleware/firmAuth')
 *   server.get('/api/firm-manager/...', firmAuth, requireManagerRole, handler)
 */

const jwt = require('jsonwebtoken')
const { AUTH } = require('../../config/integration')
const { sendError } = require('../utils/sendError')

function firmAuth (req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null

  if (!token) {
    return sendError(res, 401, 'MISSING_TOKEN', 'Authorization Bearer token required')
  }

  let payload
  try {
    payload = jwt.verify(token, AUTH.secret)
  } catch (err) {
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
    return sendError(res, 401, code, err.message)
  }

  const firmId = payload[AUTH.firmIdClaim]
  const role = payload[AUTH.roleClaim]

  if (!firmId) {
    return sendError(res, 401, 'MISSING_FIRM_CLAIM',
      `JWT is missing the '${AUTH.firmIdClaim}' claim — check AUTH.firmIdClaim in config/integration.js`)
  }

  req.firmId = firmId
  req.userRole = role || null
  req.userEmail = payload[AUTH.emailClaim] || payload.sub || 'unknown'

  return next()
}

function requireManagerRole (req, res, next) {
  const allowed = [AUTH.managerRole, AUTH.adminRole]
  if (!req.userRole || !allowed.includes(req.userRole)) {
    return sendError(res, 403, 'FORBIDDEN',
      `Firm Manager access requires role '${AUTH.managerRole}' or '${AUTH.adminRole}'`)
  }
  return next()
}

module.exports = { firmAuth, requireManagerRole }
