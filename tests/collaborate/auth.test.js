'use strict'

/**
 * Tests for the login seam (server/middleware/firmAuth.js → collaborateAuth) —
 * the security-critical boundary where identity is established from the
 * Advisory.com session token and NEVER from the request body.
 *
 * Collaborate's own auth middleware was folded into firmAuth.js when the two
 * back-ends became one; these tests moved with it unchanged, because the
 * behaviour they pin — cookie or Bearer, and the dev-identity fallback — is
 * exactly what must not drift during that merge.
 *
 * The signing secret is locked here BEFORE requiring the module, so the config
 * it loads (config/integration.js → AUTH.secret) uses a known value we can sign
 * valid test tokens against.
 */

process.env.JWT_SECRET = 'test-secret-for-unit-tests'
process.env.ALLOW_DEV_AUTH = 'false'

const jwt = require('jsonwebtoken')
const { collaborateAuth: auth, DEV_IDENTITY } = require('../../server/middleware/firmAuth')

const SECRET = 'test-secret-for-unit-tests'

function mockRes () {
  return { send: jest.fn() }
}

function sign (payload) {
  return jwt.sign(payload, SECRET)
}

/**
 * Load a fresh copy of the middleware with the dev-auth flag set to `value`.
 *
 * The flag is read ONCE, when the module is first required — a deliberate
 * security property: nothing at runtime can flip the bypass on in a live
 * process. So a test that wants the dev door open has to re-require behind it,
 * exactly as tests/unit/firmAuth.test.js does for the firm-manager guard.
 *
 * @param {string} value - value for ALLOW_DEV_AUTH while the module loads
 * @returns {Function} the collaborateAuth middleware from that fresh copy
 */
function authWithDevFlag (value) {
  const previous = process.env.ALLOW_DEV_AUTH
  process.env.ALLOW_DEV_AUTH = value
  let fn
  jest.isolateModules(() => { fn = require('../../server/middleware/firmAuth').collaborateAuth })
  if (previous === undefined) { delete process.env.ALLOW_DEV_AUTH } else { process.env.ALLOW_DEV_AUTH = previous }
  return fn
}

describe('auth middleware (login seam)', () => {
  const originalDevFlag = process.env.ALLOW_DEV_AUTH

  afterEach(() => {
    if (originalDevFlag === undefined) {
      delete process.env.ALLOW_DEV_AUTH
    } else {
      process.env.ALLOW_DEV_AUTH = originalDevFlag
    }
  })

  test('verifies a valid Bearer token and sets identity from the claims', () => {
    delete process.env.ALLOW_DEV_AUTH
    const token = sign({ advisorId: 'a1', firmId: 'f1', role: 'advisor', email: 'a@b.com' })
    const req = { headers: { authorization: 'Bearer ' + token } }
    const res = mockRes()
    const next = jest.fn()

    auth(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.send).not.toHaveBeenCalled()
    // businessEntityId is always present, null for anyone who is not a client
    // (business-entity-reports, 2026-09-03).
    expect(req.identity).toEqual({ advisorId: 'a1', firmId: 'f1', role: 'advisor', email: 'a@b.com', businessEntityId: null })
  })

  test('reads the token from a `token` cookie when there is no Bearer header', () => {
    delete process.env.ALLOW_DEV_AUTH
    const token = sign({ advisorId: 'a2', firmId: 'f2', role: 'advisor', email: 'c@d.com' })
    const req = { headers: { cookie: 'foo=bar; token=' + token } }
    const res = mockRes()
    const next = jest.fn()

    auth(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.identity.advisorId).toBe('a2')
  })

  test('rejects with 401 NO_TOKEN when no token is present and dev auth is off', () => {
    delete process.env.ALLOW_DEV_AUTH
    const req = { headers: {} }
    const res = mockRes()
    const next = jest.fn()

    auth(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.send).toHaveBeenCalledWith(401, expect.objectContaining({
      success: false,
      error: expect.objectContaining({ code: 'NO_TOKEN' })
    }))
  })

  test('rejects with 401 INVALID_TOKEN when the token is bad and dev auth is off', () => {
    delete process.env.ALLOW_DEV_AUTH
    const req = { headers: { authorization: 'Bearer not.a.real.token' } }
    const res = mockRes()
    const next = jest.fn()

    auth(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.send).toHaveBeenCalledWith(401, expect.objectContaining({
      error: expect.objectContaining({ code: 'INVALID_TOKEN' })
    }))
  })

  test('falls back to the dev identity when ALLOW_DEV_AUTH=true and no token', () => {
    const devAuth = authWithDevFlag('true')
    const req = { headers: {} }
    const res = mockRes()
    const next = jest.fn()

    devAuth(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.send).not.toHaveBeenCalled()
    expect(req.identity).toEqual(DEV_IDENTITY)
  })

  test('falls back to the dev identity when a token is invalid but dev auth is on', () => {
    const devAuth = authWithDevFlag('true')
    const req = { headers: { authorization: 'Bearer garbage' } }
    const res = mockRes()
    const next = jest.fn()

    devAuth(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.identity).toEqual(DEV_IDENTITY)
  })

  // The bypass is refused in production even when the flag is on — the second of
  // the two locks (the first is the startup guard, which will not boot the server
  // with ALLOW_DEV_AUTH=true in production). Collaborate's own copy of this
  // middleware checked only the flag and relied on the guard alone; folding it
  // into firmAuth brought this check with it.
  test('refuses the dev identity in production even when ALLOW_DEV_AUTH=true', () => {
    const previousNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    const prodAuth = authWithDevFlag('true')
    process.env.NODE_ENV = previousNodeEnv

    const req = { headers: {} }
    const res = mockRes()
    const next = jest.fn()

    prodAuth(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.send).toHaveBeenCalledWith(401, expect.objectContaining({
      error: expect.objectContaining({ code: 'NO_TOKEN' })
    }))
  })

  // Both halves of the app now read ONE verified identity. Collaborate's routes
  // take req.identity; the AI-coach and report routes take the flat fields. A
  // token that set only one of the two would break whichever half read the other.
  test('attaches the identity in both shapes from a single verified token', () => {
    delete process.env.ALLOW_DEV_AUTH
    const token = sign({ advisorId: 'a9', firmId: 'f9', role: 'firm_manager', email: 'e@f.com' })
    const req = { headers: { authorization: 'Bearer ' + token } }

    auth(req, mockRes(), jest.fn())

    expect(req.identity).toEqual({ advisorId: 'a9', firmId: 'f9', role: 'firm_manager', email: 'e@f.com', businessEntityId: null })
    expect(req.firmId).toBe('f9')
    expect(req.advisorId).toBe('a9')
    expect(req.userRole).toBe('firm_manager')
    expect(req.userEmail).toBe('e@f.com')
  })
})
