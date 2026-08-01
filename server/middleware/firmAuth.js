'use strict'

/**
 * The login seam — Restify request middleware. ONE place reads the Advisory.com
 * session token for the whole application (the AI coach, the performance reports
 * and Collaborate), so a claim-name change or an RS256 switch happens once.
 *
 * Identity ALWAYS comes from the verified token, never from the request body.
 *
 * Two guards are exported because the two halves of the app admit developers
 * differently, and only in DEVELOPMENT:
 *
 *   firmAuth         — a token is required. In dev, one of two explicit magic
 *                      tokens stands in for a real login (nothing else passes).
 *   collaborateAuth  — in dev, a request with NO token falls back to a fixed dev
 *                      identity, so Collaborate's screens work before Advisory
 *                      auth is wired.
 *
 * IN PRODUCTION THE TWO ARE IDENTICAL: a valid Advisory JWT or 401. The dev
 * doors are kept apart deliberately — collapsing them would either loosen the
 * firm-manager routes or break every Collaborate screen in dev. Both are refused
 * outright in production, twice over: by DEV_AUTH_ENABLED below, and by the
 * startup guard in server/restify-server.js, which will not boot with
 * ALLOW_DEV_AUTH=true.
 *
 * INTEGRATION NOTE (for the Advisor-e team):
 *   1. Set AUTH.secret in config/integration.js to the JWT signing secret.
 *   2. Set AUTH.firmIdClaim / AUTH.roleClaim / AUTH.emailClaim to the correct
 *      field names used in the Advisor-e JWT payload.
 *   3. If Advisor-e signs tokens with RS256 (asymmetric), replace the
 *      jwt.verify(token, AUTH.secret) call in verifyToken() below with:
 *        jwt.verify(token, fs.readFileSync(AUTH.publicKeyPath))
 *      and add AUTH.publicKeyPath to config/integration.js. ONE call site.
 *
 * Usage in restify-server.js:
 *   const { firmAuth, requireManagerRole, collaborateAuth } = require('./middleware/firmAuth')
 *   server.get('/api/firm-manager/...', firmAuth, requireManagerRole, handler)
 *   server.get('/api/people/...', collaborateAuth, handler)
 */

const jwt = require('jsonwebtoken')
const { AUTH } = require('../../config/integration')
const { sendError } = require('../utils/sendError')
// Both helpers write the SAME envelope { success, error: { code, message }, timestamp };
// they differ only in how they put it on the wire (writeHead/end vs res.send), and
// each half's tests assert its own. The two sendError modules are a known duplicate
// pair, folded together with the data layers in the Collaborate merge's later slice.
const { sendApiError } = require('../collaborate/utils/sendError')

// Fail-CLOSED dev bypass: off by default, and never available in production.
// It activates ONLY when ALLOW_DEV_AUTH is explicitly set to 'true' AND the
// environment is not production — so simply forgetting NODE_ENV can never expose
// the bypass. The dev npm scripts set ALLOW_DEV_AUTH=true; production never does.
const DEV_AUTH_ENABLED = process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_AUTH === 'true'
const DEV_TOKEN = 'dev-local-bypass'
const DEV_MENTOR_TOKEN = 'dev-local-mentor' // dev-only: authenticate as the mentor (platform_admin)
const DEV_FIRM_ID = 'dev-firm-001'
const DEV_ADVISOR_ID = 'dev-advisor-001'

// Identity used by collaborateAuth in dev when no valid token is present. The ids
// are the ones Collaborate's in-memory repository seeds its demo data against, so
// changing them empties every Collaborate screen in dev.
const DEV_IDENTITY = {
  advisorId: 'me',
  firmId: 'dev-firm',
  role: AUTH.adminRole,
  email: 'mike@advisor-e.com'
}

/**
 * Read the Advisory token from a request.
 *
 * @param {object} req            - Restify request
 * @param {boolean} [allowCookie] - also accept a `token` cookie. Collaborate's
 *   screens are browser-driven and carry the session that way; the firm-manager
 *   and report routes are Bearer-only, as they have always been. Widening those
 *   to cookies is an auth change, not plumbing — it is NOT done here.
 * @returns {string|null} the raw token, or null when absent
 */
function extractToken (req, allowCookie) {
  const header = req.headers.authorization || ''
  if (header.startsWith('Bearer ')) { return header.slice(7).trim() }
  if (allowCookie) {
    const cookie = req.headers.cookie || ''
    const match = cookie.match(/(?:^|;\s*)token=([^;]+)/)
    if (match) { return decodeURIComponent(match[1]) }
  }
  return null
}

/**
 * Verify a token and lift the claims out of it. The ONLY jwt.verify() call in
 * the application — see the RS256 note in the file header.
 *
 * @param {string} token
 * @returns {object} the decoded JWT payload
 * @throws {Error} jsonwebtoken's own error when the token is invalid or expired
 */
function verifyToken (token) {
  return jwt.verify(token, AUTH.secret)
}

/**
 * Map a decoded JWT payload onto the canonical identity object.
 *
 * @param {object} payload - decoded JWT payload
 * @returns {{ advisorId: string, firmId: string, role: string, email: string }}
 */
function identityFromPayload (payload) {
  return {
    advisorId: payload[AUTH.advisorIdClaim],
    firmId: payload[AUTH.firmIdClaim],
    role: payload[AUTH.roleClaim],
    email: payload[AUTH.emailClaim] || payload.sub
  }
}

/**
 * Attach an identity to the request in BOTH shapes the app uses: the flat fields
 * the AI-coach and report routes read, and the `identity` object Collaborate's
 * routes read. One verified source, two accessors — so neither half of the app
 * has to be rewritten to read the other's.
 *
 * @param {object} req
 * @param {{ advisorId: ?string, firmId: ?string, role: ?string, email: ?string }} identity
 * @param {?string} [name] - display name, when the token carries one
 */
function attachIdentity (req, identity, name) {
  req.identity = identity
  req.firmId = identity.firmId
  req.advisorId = identity.advisorId
  req.userRole = identity.role
  req.userEmail = identity.email
  req.advisorName = name || null
}

/**
 * firmAuth — the AI coach, performance reports and firm-manager routes.
 * Bearer token required; the dev bypass needs an explicit magic token.
 */
function firmAuth (req, res, next) {
  const token = extractToken(req, false)

  if (!token) {
    return sendError(res, 401, 'MISSING_TOKEN', 'Authorization Bearer token required')
  }

  // Dev bypass — opt-in via ALLOW_DEV_AUTH, never active in production (see above)
  if (DEV_AUTH_ENABLED && token === DEV_TOKEN) {
    attachIdentity(req, {
      advisorId: DEV_ADVISOR_ID,
      firmId: DEV_FIRM_ID,
      role: AUTH.managerRole,
      email: 'dev@local'
    }, 'Dev Advisor')
    return next()
  }
  // Dev mentor bypass — authenticate as the cross-firm mentor (platform_admin)
  // so the Mentor view is testable locally. Never active in production.
  if (DEV_AUTH_ENABLED && token === DEV_MENTOR_TOKEN) {
    attachIdentity(req, {
      advisorId: null,
      firmId: DEV_FIRM_ID, // placeholder; the mentor view is not firm-scoped
      role: AUTH.mentorRole,
      email: 'dev-mentor@local'
    })
    return next()
  }

  let payload
  try {
    payload = verifyToken(token)
  } catch (err) {
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
    return sendError(res, 401, code, err.message)
  }

  const identity = identityFromPayload(payload)

  if (!identity.firmId) {
    return sendError(res, 401, 'MISSING_FIRM_CLAIM',
      `JWT is missing the '${AUTH.firmIdClaim}' claim — check AUTH.firmIdClaim in config/integration.js`)
  }

  // Advisor ID is read where present (falling back to the JWT 'sub' subject claim).
  // It is NOT required here — the team-overview route needs only firmId; the routes
  // that key on an individual advisor enforce its presence themselves.
  identity.advisorId = identity.advisorId || payload.sub || null
  identity.role = identity.role || null
  identity.email = identity.email || 'unknown'
  // Display name, when Advisor-e includes one. Null is a valid answer: screens fall
  // back to the advisor ID rather than inventing or guessing a name.
  attachIdentity(req, identity, payload[AUTH.nameClaim])

  return next()
}

/**
 * collaborateAuth — the Collaborate people layer (/api/people, /api/templates).
 * Accepts a Bearer header or a `token` cookie. In dev only, a request with no
 * valid token falls back to DEV_IDENTITY so the screens are usable before real
 * Advisory auth is wired.
 */
function collaborateAuth (req, res, next) {
  const token = extractToken(req, true)

  if (token) {
    try {
      attachIdentity(req, identityFromPayload(verifyToken(token)))
      return next()
    } catch (e) {
      if (!DEV_AUTH_ENABLED) {
        sendApiError(res, 401, 'INVALID_TOKEN', 'Authentication failed.')
        return
      }
      // dev: fall through to the dev identity
    }
  }

  if (DEV_AUTH_ENABLED) {
    attachIdentity(req, Object.assign({}, DEV_IDENTITY))
    return next()
  }

  sendApiError(res, 401, 'NO_TOKEN', 'Authentication required.')
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

module.exports = { firmAuth, collaborateAuth, requireManagerRole, requireMentorRole, DEV_IDENTITY }
