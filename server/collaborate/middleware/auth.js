'use strict'

/**
 * auth — verifies the Advisory.com session so identity comes from the token,
 * never the request body. This is the login "seam":
 *
 *   - PRODUCTION: a valid Advisory JWT (Bearer header or `token` cookie) is
 *     required. Claims are read using the names in config/integration.js → AUTH,
 *     and verified against AUTH.secret. No token / bad token => 401.
 *   - DEVELOPMENT: when ALLOW_DEV_AUTH=true, a request without a valid token
 *     falls back to a fixed dev identity so the app is usable before the real
 *     Advisory auth is wired. This bypass is refused in production by
 *     restify-server.js's startup guard.
 *
 * TO GO LIVE (needs the Advisor-e auth team): set JWT_SECRET (or the public key
 * for RS256 + switch jwt.verify), confirm the claim names in integration.js,
 * and have the Nuxt layer forward the Advisory session cookie/header.
 */

const jwt = require('jsonwebtoken')
const { AUTH } = require('../../../config/collaborate/integration')
const { sendApiError } = require('../utils/sendError')

// Identity used in dev when ALLOW_DEV_AUTH=true and no valid token is present.
const DEV_IDENTITY = {
  advisorId: 'me',
  firmId: 'dev-firm',
  role: AUTH.adminRole,
  email: 'mike@advisor-e.com'
}

function extractToken (req) {
  const header = req.headers.authorization || ''
  if (header.indexOf('Bearer ') === 0) { return header.slice(7).trim() }
  const cookie = req.headers.cookie || ''
  const match = cookie.match(/(?:^|;\s*)token=([^;]+)/)
  if (match) { return decodeURIComponent(match[1]) }
  return null
}

function identityFromPayload (payload) {
  return {
    advisorId: payload[AUTH.advisorIdClaim],
    firmId: payload[AUTH.firmIdClaim],
    role: payload[AUTH.roleClaim],
    email: payload[AUTH.emailClaim] || payload.sub
  }
}

function auth (req, res, next) {
  const devAllowed = process.env.ALLOW_DEV_AUTH === 'true'
  const token = extractToken(req)

  if (token) {
    try {
      req.identity = identityFromPayload(jwt.verify(token, AUTH.secret))
      return next()
    } catch (e) {
      if (!devAllowed) {
        sendApiError(res, 401, 'INVALID_TOKEN', 'Authentication failed.')
        return
      }
      // dev: fall through to the dev identity
    }
  }

  if (devAllowed) {
    req.identity = Object.assign({}, DEV_IDENTITY)
    return next()
  }

  sendApiError(res, 401, 'NO_TOKEN', 'Authentication required.')
}

module.exports = { auth, DEV_IDENTITY }
