'use strict'

// Must be set before any require so config/integration.js picks it up
process.env.JWT_SECRET = 'test-secret-for-auth-tests'

const jwt = require('jsonwebtoken')

const TEST_SECRET = 'test-secret-for-auth-tests'
const WRONG_SECRET = 'wrong-secret'

const { firmAuth, requireManagerRole, requireMentorRole } = require('../../server/middleware/firmAuth')

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMockRes () {
  return {
    headersSent: false,
    _status: null,
    _body: null,
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { this._body = body }
  }
}

function makeToken (payload, secret = TEST_SECRET, options = {}) {
  return jwt.sign(payload, secret, options)
}

// ── firmAuth ──────────────────────────────────────────────────────────────────

describe('firmAuth', () => {
  test('calls next() and sets req.firmId when token is valid', () => {
    const token = makeToken({ firmId: 'firm-1', role: 'firm_manager' })
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = makeMockRes()
    const next = jest.fn()

    firmAuth(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.firmId).toBe('firm-1')
  })

  test('IGNORES a token in a cookie — these routes are Bearer-only', () => {
    // The 2026-08-01 merge folded Collaborate's login seam into this file, and
    // Collaborate's screens DO authenticate by cookie. Sharing one token reader
    // must not quietly widen how the firm-manager, coach and report routes admit
    // a caller: widening those to cookies is an auth decision, not plumbing.
    const token = makeToken({ firmId: 'firm-1', role: 'firm_manager' })
    const req = { headers: { cookie: `token=${token}` } }
    const res = makeMockRes()
    const next = jest.fn()

    firmAuth(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(401)
    expect(JSON.parse(res._body).error.code).toBe('MISSING_TOKEN')
    expect(req.firmId).toBeUndefined()
  })

  test('sets the identity object as well as the flat fields', () => {
    // Both halves of the merged app read one verified identity: Collaborate's
    // routes take req.identity, ours take the flat fields. A guard that set only
    // its own half would break every route belonging to the other.
    const token = makeToken({ firmId: 'firm-1', advisorId: 'adv-9', role: 'firm_manager', email: 'm@acme.com' })
    const req = { headers: { authorization: `Bearer ${token}` } }

    firmAuth(req, makeMockRes(), jest.fn())

    expect(req.identity).toEqual({
      advisorId: 'adv-9', firmId: 'firm-1', role: 'firm_manager', email: 'm@acme.com'
    })
  })

  test('sets req.userRole from JWT role claim', () => {
    const token = makeToken({ firmId: 'firm-1', role: 'platform_admin' })
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = makeMockRes()
    const next = jest.fn()

    firmAuth(req, res, next)

    expect(req.userRole).toBe('platform_admin')
  })

  test('sets req.userEmail from JWT email claim', () => {
    const token = makeToken({ firmId: 'firm-1', role: 'firm_manager', email: 'mgr@acme.com' })
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = makeMockRes()
    const next = jest.fn()

    firmAuth(req, res, next)

    expect(req.userEmail).toBe('mgr@acme.com')
  })

  test('falls back to sub claim when email claim is absent', () => {
    const token = makeToken({ firmId: 'firm-1', role: 'firm_manager', sub: 'user-id-42' })
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = makeMockRes()
    const next = jest.fn()

    firmAuth(req, res, next)

    expect(req.userEmail).toBe('user-id-42')
  })

  test('returns 401 when Authorization header is missing', () => {
    const req = { headers: {} }
    const res = makeMockRes()
    const next = jest.fn()

    firmAuth(req, res, next)

    expect(res._status).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  test('returns 401 when Authorization header has no Bearer prefix', () => {
    const token = makeToken({ firmId: 'firm-1', role: 'firm_manager' })
    const req = { headers: { authorization: token } } // missing 'Bearer '
    const res = makeMockRes()
    const next = jest.fn()

    firmAuth(req, res, next)

    expect(res._status).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  test('returns 401 when token is signed with wrong secret', () => {
    const token = makeToken({ firmId: 'firm-1', role: 'firm_manager' }, WRONG_SECRET)
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = makeMockRes()
    const next = jest.fn()

    firmAuth(req, res, next)

    expect(res._status).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  test('returns 401 when token is malformed (not a JWT)', () => {
    const req = { headers: { authorization: 'Bearer not.a.jwt' } }
    const res = makeMockRes()
    const next = jest.fn()

    firmAuth(req, res, next)

    expect(res._status).toBe(401)
  })

  test('returns 401 when token is expired', () => {
    const token = makeToken(
      { firmId: 'firm-1', role: 'firm_manager' },
      TEST_SECRET,
      { expiresIn: -1 } // already expired
    )
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = makeMockRes()
    const next = jest.fn()

    firmAuth(req, res, next)

    expect(res._status).toBe(401)
    const body = JSON.parse(res._body)
    expect(body.error.code).toBe('TOKEN_EXPIRED')
  })

  test('returns 401 when JWT payload is missing firmId claim', () => {
    const token = makeToken({ role: 'firm_manager' }) // no firmId
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = makeMockRes()
    const next = jest.fn()

    firmAuth(req, res, next)

    expect(res._status).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  test('sets userRole to null when role claim is absent', () => {
    const token = makeToken({ firmId: 'firm-1' }) // no role
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = makeMockRes()
    const next = jest.fn()

    firmAuth(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(req.userRole).toBeNull()
  })
})

// ── Dev auth bypass (fail-closed) ───────────────────────────────────────────────
// The bypass must be OFF unless ALLOW_DEV_AUTH is explicitly 'true' AND the
// environment is not production. DEV_AUTH_ENABLED is evaluated at module load, so
// each scenario re-requires firmAuth with the env set via jest.isolateModules.

describe('dev auth bypass', () => {
  // Re-require firmAuth in an isolated module registry with the given env, so the
  // module-load-time DEV_AUTH_ENABLED const reflects this scenario's env.
  function setEnv (key, value) {
    if (value === undefined) { delete process.env[key] } else { process.env[key] = value }
  }

  function firmAuthWithEnv ({ allowDevAuth, nodeEnv }) {
    let fn
    // Snapshot so we restore EXACTLY (including absence) and never leak state into
    // other suites — assigning `undefined` would write the string "undefined".
    const prevAllow = process.env.ALLOW_DEV_AUTH
    const prevNode = process.env.NODE_ENV
    setEnv('ALLOW_DEV_AUTH', allowDevAuth)
    setEnv('NODE_ENV', nodeEnv)
    jest.isolateModules(() => { fn = require('../../server/middleware/firmAuth').firmAuth })
    setEnv('ALLOW_DEV_AUTH', prevAllow)
    setEnv('NODE_ENV', prevNode)
    return fn
  }

  const DEV_TOKEN = 'dev-local-bypass'

  test('rejects the dev token by default (ALLOW_DEV_AUTH unset)', () => {
    const fn = firmAuthWithEnv({ allowDevAuth: undefined, nodeEnv: 'development' })
    const req = { headers: { authorization: `Bearer ${DEV_TOKEN}` } }
    const res = makeMockRes()
    const next = jest.fn()

    fn(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(401)
  })

  test('accepts the dev token only when ALLOW_DEV_AUTH=true and not production', () => {
    const fn = firmAuthWithEnv({ allowDevAuth: 'true', nodeEnv: 'development' })
    const req = { headers: { authorization: `Bearer ${DEV_TOKEN}` } }
    const res = makeMockRes()
    const next = jest.fn()

    fn(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.firmId).toBe('dev-firm-001')
  })

  test('rejects the dev token in production even when ALLOW_DEV_AUTH=true', () => {
    const fn = firmAuthWithEnv({ allowDevAuth: 'true', nodeEnv: 'production' })
    const req = { headers: { authorization: `Bearer ${DEV_TOKEN}` } }
    const res = makeMockRes()
    const next = jest.fn()

    fn(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(401)
  })

  // The SECOND dev bypass — authenticating as the cross-firm mentor (platform_admin) —
  // had no test at all, though it grants a strictly wider identity than the one above:
  // the mentor view is not firm-scoped. It must fail closed on exactly the same terms.
  const DEV_MENTOR_TOKEN = 'dev-local-mentor'

  test('rejects the dev MENTOR token by default (ALLOW_DEV_AUTH unset)', () => {
    const fn = firmAuthWithEnv({ allowDevAuth: undefined, nodeEnv: 'development' })
    const req = { headers: { authorization: `Bearer ${DEV_MENTOR_TOKEN}` } }
    const res = makeMockRes()
    const next = jest.fn()

    fn(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(401)
  })

  test('rejects the dev MENTOR token in production even when ALLOW_DEV_AUTH=true', () => {
    const fn = firmAuthWithEnv({ allowDevAuth: 'true', nodeEnv: 'production' })
    const req = { headers: { authorization: `Bearer ${DEV_MENTOR_TOKEN}` } }
    const res = makeMockRes()
    const next = jest.fn()

    fn(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(401)
  })

  test('accepts the dev MENTOR token in dev, as the mentor rather than a firm advisor', () => {
    const fn = firmAuthWithEnv({ allowDevAuth: 'true', nodeEnv: 'development' })
    const req = { headers: { authorization: `Bearer ${DEV_MENTOR_TOKEN}` } }
    const res = makeMockRes()
    const next = jest.fn()

    fn(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.userRole).toBe('platform_admin')
    expect(req.userEmail).toBe('dev-mentor@local')
    // advisorId must be null — the mentor is not an advisor, and anything that reads
    // advisorId to scope a query must see the absence rather than a borrowed id.
    expect(req.advisorId).toBeNull()
  })
})

// ── requireManagerRole ────────────────────────────────────────────────────────

describe('requireManagerRole', () => {
  test('calls next() when role is firm_manager', () => {
    const req = { userRole: 'firm_manager' }
    const res = makeMockRes()
    const next = jest.fn()

    requireManagerRole(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
  })

  test('calls next() when role is platform_admin', () => {
    const req = { userRole: 'platform_admin' }
    const res = makeMockRes()
    const next = jest.fn()

    requireManagerRole(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
  })

  test('returns 403 when role is advisor', () => {
    const req = { userRole: 'advisor' }
    const res = makeMockRes()
    const next = jest.fn()

    requireManagerRole(req, res, next)

    expect(res._status).toBe(403)
    expect(next).not.toHaveBeenCalled()
  })

  test('returns 403 when role is null', () => {
    const req = { userRole: null }
    const res = makeMockRes()

    requireManagerRole(req, res, jest.fn())

    expect(res._status).toBe(403)
  })

  test('returns 403 when role is an empty string', () => {
    const req = { userRole: '' }
    const res = makeMockRes()

    requireManagerRole(req, res, jest.fn())

    expect(res._status).toBe(403)
  })

  test('returns 403 when role is an unknown string', () => {
    const req = { userRole: 'super_user' }
    const res = makeMockRes()

    requireManagerRole(req, res, jest.fn())

    expect(res._status).toBe(403)
  })
})

// ── requireMentorRole ─────────────────────────────────────────────────────────
// This gate had NO tests, and it guards the one path that deliberately crosses the
// firm boundary: the mentor reads anonymised cases shared from every firm. Where
// requireManagerRole admits two roles, this one admits exactly one — a firm_manager
// must NOT pass, or a firm's own manager could read across firms.

describe('requireMentorRole', () => {
  test('calls next() when role is the mentor role (platform_admin)', () => {
    const req = { userRole: 'platform_admin' }
    const res = makeMockRes()
    const next = jest.fn()

    requireMentorRole(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
  })

  test('returns 403 for a firm_manager — manager rights do not cross firms', () => {
    const req = { userRole: 'firm_manager' }
    const res = makeMockRes()
    const next = jest.fn()

    requireMentorRole(req, res, next)

    expect(res._status).toBe(403)
    expect(next).not.toHaveBeenCalled()
  })

  test('returns 403 for an advisor', () => {
    const res = makeMockRes()

    requireMentorRole({ userRole: 'advisor' }, res, jest.fn())

    expect(res._status).toBe(403)
  })

  test.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['an unknown string', 'super_user']
  ])('returns 403 when role is %s', (_label, userRole) => {
    const res = makeMockRes()
    const next = jest.fn()

    requireMentorRole({ userRole }, res, next)

    expect(res._status).toBe(403)
    expect(next).not.toHaveBeenCalled()
  })

  test('names the required role in the error envelope', () => {
    const res = makeMockRes()

    requireMentorRole({ userRole: 'advisor' }, res, jest.fn())

    // This file's mock keeps the raw body written by sendError, so parse it here.
    const body = JSON.parse(res._body)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('FORBIDDEN')
    expect(body.error.message).toContain('platform_admin')
  })
})
