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

// Fail-CLOSED dev bypass: off by default, and never available in production.
// It activates ONLY when ALLOW_DEV_AUTH is explicitly set to 'true' AND the
// environment is not production — so simply forgetting NODE_ENV can never expose
// the bypass. The dev npm scripts set ALLOW_DEV_AUTH=true; production never does.
const DEV_AUTH_ENABLED = process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_AUTH === 'true'
const DEV_TOKEN = 'dev-local-bypass'
const DEV_MENTOR_TOKEN = 'dev-local-mentor' // dev-only: authenticate as the mentor (platform_admin)
const DEV_FIRM_ID = 'dev-firm-001'
const DEV_ADVISOR_ID = 'dev-advisor-001'

function firmAuth (req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null

  if (!token) {
    return sendError(res, 401, 'MISSING_TOKEN', 'Authorization Bearer token required')
  }

  // Dev bypass — opt-in via ALLOW_DEV_AUTH, never active in production (see above)
  if (DEV_AUTH_ENABLED && token === DEV_TOKEN) {
    req.firmId = DEV_FIRM_ID
    req.advisorId = DEV_ADVISOR_ID
    req.userRole = AUTH.managerRole
    req.userEmail = 'dev@local'
    return next()
  }
  // Dev mentor bypass — authenticate as the cross-firm mentor (platform_admin)
  // so the Mentor view is testable locally. Never active in production.
  if (DEV_AUTH_ENABLED && token === DEV_MENTOR_TOKEN) {
    req.firmId = DEV_FIRM_ID // placeholder; the mentor view is not firm-scoped
    req.advisorId = null
    req.userRole = AUTH.mentorRole
    req.userEmail = 'dev-mentor@local'
    return next()
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
  // Advisor ID is read where present (falling back to the JWT 'sub' subject claim).
  // It is NOT required here — the team-overview route needs only firmId; the routes
  // that key on an individual advisor enforce its presence themselves.
  req.advisorId = payload[AUTH.advisorIdClaim] || payload.sub || null
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

/**
 * Gate for the cross-firm Mentor view. Only the mentor role (interim:
 * platform_admin — see AUTH.mentorRole) may read mentor-shared cases across
 * firms. This is the one place that deliberately crosses the firm boundary, so
 * the role check is the access boundary.
 */
function requireMentorRole (req, res, next) {
  if (!req.userRole || req.userRole !== AUTH.mentorRole) {
    return sendError(res, 403, 'FORBIDDEN',
      `Mentor access requires role '${AUTH.mentorRole}'`)
  }
  return next()
}

module.exports = { firmAuth, requireManagerRole, requireMentorRole }
