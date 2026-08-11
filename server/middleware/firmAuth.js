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
const { PLATFORM_SCOPE } = require('../utils/platformScope')
const { globalScopeId, groupScopeId, tierOfScope } = require('../utils/tierChain')
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
// dev-only: the two middle management tiers. They exist because Advisor-e issues
// no role for either yet, so WITHOUT these the two new hubs could not be opened by
// anyone, including us — see design/mockups/tier-hub-pages.html §6. The brand and
// country are the mockup's own examples; nothing reads them as real membership.
const DEV_GLOBAL_TOKEN = 'dev-local-global'
const DEV_GROUP_TOKEN = 'dev-local-group'
const DEV_GLOBAL_GROUP = 'Advisor-e'
const DEV_COUNTRY = 'DE'
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
      firmId: PLATFORM_SCOPE, // the mentor is not a firm — see tierStorageScope below
      role: AUTH.mentorRole,
      email: 'dev-mentor@local'
    })
    return next()
  }
  // Dev middle-tier bypasses — the ONLY way either new hub can be opened today,
  // because Advisor-e issues no role for them (AUTH.globalManagerRole and
  // AUTH.groupManagerRole are deliberately empty). The scope id is composed by the
  // same tierChain helpers a real token will use, so what a developer exercises is
  // the real storage path and not a special case.
  if (DEV_AUTH_ENABLED && token === DEV_GLOBAL_TOKEN) {
    attachIdentity(req, {
      advisorId: null,
      firmId: globalScopeId(DEV_GLOBAL_GROUP),
      role: AUTH.adminRole, // dev only: passes requireManagerRole, as the mentor's does
      email: 'dev-global@local'
    })
    return next()
  }
  if (DEV_AUTH_ENABLED && token === DEV_GROUP_TOKEN) {
    attachIdentity(req, {
      advisorId: null,
      firmId: groupScopeId(DEV_GLOBAL_GROUP, DEV_COUNTRY),
      role: AUTH.adminRole,
      email: 'dev-group@local'
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

  const scoped = tierStorageScope(req, payload)
  if (!scoped.ok) {
    return sendError(res, 403, scoped.code, scoped.message)
  }

  return next()
}

/**
 * Re-point a MANAGING TIER's request at the storage scope that tier writes under.
 *
 * Extended 2026-08-11 from `mentorStorageScope` to cover the two middle tiers
 * (design/mockups/tier-hub-pages.html part 3). The mentor branch is unchanged in
 * behaviour; the reasoning that put it here in the first place still holds for all
 * three tiers and is kept below.
 *
 * design/MENTOR-SAVE-SCOPE-PLAN.md Phase 3 — the fix for a save that succeeded
 * into the wrong place. A mentor is not refused by requireManagerRole (it allows
 * managerRole OR adminRole, and the interim mentor role IS adminRole), so before
 * this every Mentor Hub save ran, reported success, and landed under whatever
 * firm the mentor's token happened to claim. The mentor's own platform content
 * was untouched and no firm inherited the edit. Nothing errored; the screen said
 * it worked.
 *
 * ⚠ ONE POINT, NOT 156. `req.firmId` is read in ~156 places across the firm
 * routes. Resolving the scope here means no call site can forget it — the same
 * reason listFirmIdsWithConfigKey excludes the scope in SQL. A per-call-site fix
 * would work today and drift the first time someone adds a route.
 *
 * ⚠ DELIBERATELY NOT IN attachIdentity, which collaborateAuth also uses. The
 * Collaborate people layer (/api/people — the Adviser Network tab) already
 * resolves the caller's TIER server-side and returns a correct roll-up for the
 * levels above a firm. Overriding its identity would break the one tab that
 * already works one level up.
 *
 * ⚠ THE FIRM CLAIM IS STILL REQUIRED of every token, including a mentor's and a
 * group manager's (the check above runs first). None of them genuinely has a firm,
 * so that will eventually be the wrong rule — but loosening an auth check before
 * the real roles exist upstream would be a security change made on speculation.
 * Failing closed is the conservative answer; revisit when AUTH.mentorRole stops
 * being platform_admin and the two middle roles arrive.
 *
 * 🔴 FAIL CLOSED, AND IT IS THE POINT OF THE FUNCTION. AUTH.globalManagerRole and
 * AUTH.groupManagerRole are empty strings until Advisor-e issues real values, and
 * an empty configured role matches nothing — so today no real token reaches either
 * branch below. When the values arrive, a manager whose token omits the claim their
 * tier needs is REFUSED (403) rather than defaulted to a firm or to the platform.
 * Guessing would file one customer's content under another's, and the screen would
 * report success while doing it.
 *
 * @param {object} req - request with an identity already attached
 * @param {object} payload - the verified JWT payload, for the tier's own claims
 * @returns {{ok: boolean, code?: string, message?: string}}
 */
function tierStorageScope (req, payload) {
  const role = req.userRole

  // The mentor first: it is checked before the middle tiers because its interim
  // role value (platform_admin) is the same one the dev bypasses use, and the
  // mentor's meaning must win.
  if (role && role === AUTH.mentorRole) {
    setScope(req, PLATFORM_SCOPE)
    return { ok: true }
  }

  if (AUTH.globalManagerRole && role === AUTH.globalManagerRole) {
    const brand = payload[AUTH.globalGroupClaim]
    if (!brand) {
      return {
        ok: false,
        code: 'MISSING_GROUP_CLAIM',
        message: `JWT is missing the '${AUTH.globalGroupClaim}' claim — a global group manager must name the group they manage`
      }
    }
    try {
      setScope(req, globalScopeId(String(brand)))
    } catch (err) {
      return { ok: false, code: 'INVALID_GROUP_CLAIM', message: err.message }
    }
    return { ok: true }
  }

  if (AUTH.groupManagerRole && role === AUTH.groupManagerRole) {
    const brand = payload[AUTH.globalGroupClaim]
    const country = payload[AUTH.countryClaim]
    if (!brand || !country) {
      return {
        ok: false,
        code: 'MISSING_GROUP_CLAIM',
        message: `JWT is missing the '${AUTH.globalGroupClaim}' or '${AUTH.countryClaim}' claim — a group manager must name the group and country they manage`
      }
    }
    try {
      setScope(req, groupScopeId(String(brand), String(country)))
    } catch (err) {
      return { ok: false, code: 'INVALID_GROUP_CLAIM', message: err.message }
    }
    return { ok: true }
  }

  // A firm manager or an advisor — their firm id from the token is already the
  // scope they write under, so there is nothing to re-point.
  return { ok: true }
}

/**
 * Write a resolved scope into BOTH places the app reads a firm id from.
 * @param {object} req
 * @param {string} scopeId
 */
function setScope (req, scopeId) {
  req.firmId = scopeId
  req.identity.firmId = scopeId
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

/**
 * Gate for the CROSS-FIRM REPORTS that every managing tier reads — Case Reviews,
 * Adoption and the Logic Lab Report. Admits the mentor and the two middle tiers;
 * refuses a firm manager and an advisor, exactly as requireMentorRole did.
 *
 * 🔴 IT READS THE RESOLVED SCOPE, NOT THE ROLE STRING, AND THAT IS THE WHOLE POINT.
 * `AUTH.mentorRole` and `AUTH.adminRole` are the same value today — 'platform_admin'
 * — because Advisor-e has never issued a mentor role and the mentor borrows the
 * admin one. So a role check cannot tell a mentor apart from anyone else holding
 * that value, and the developer sign-ins for the two middle tiers hold exactly it.
 * Under requireMentorRole those sign-ins passed as THE MENTOR and the three reports
 * handed a single group's screen every brand's data — the opposite of empty, and
 * against the owner's ruling of 2026-08-11 that a tier stays in its own channel.
 * Reachable only in development today, because no real token can carry a middle
 * tier; the code path is the one that goes live when it can.
 *
 * By the time this runs, tierStorageScope has already resolved req.firmId to the
 * scope this caller writes and reads under, and it FAILS CLOSED — a manager whose
 * token does not name their group is refused there rather than defaulted here. So
 * the scope is the trustworthy fact about a caller and the role is not.
 *
 * ⚠ THIS DOES NOT MAKE THE DATA SAFE BY ITSELF. It decides who may ask; each of the
 * three routes still filters its rows with tierChain.isWithinScope. Two controls,
 * because this one admits three tiers and only the filter knows which firms belong
 * to which.
 *
 * ⚠ NOT USED FOR TEMPLATE CHECK. Ruled by the owner 2026-08-11: it is mentor-only,
 * "since we use it to improve the overall system. it does not relate to
 * people/advisor performance or group manager selection/access permission to
 * templates". Those routes keep requireMentorRole and the tab is gone from the two
 * middle hubs — see TAB_TIERS in components/FirmManagerHub.vue.
 */
function requireManagingTier (req, res, next) {
  const allowed = ['mentor', 'global_group_manager', 'group_manager']
  if (!req.firmId || !allowed.includes(tierOfScope(req.firmId))) {
    return sendError(res, 403, 'FORBIDDEN',
      'This report is for managing tiers above a firm')
  }
  return next()
}

module.exports = { firmAuth, collaborateAuth, requireManagerRole, requireMentorRole, requireManagingTier, DEV_IDENTITY }
