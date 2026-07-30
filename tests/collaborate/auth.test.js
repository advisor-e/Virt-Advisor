'use strict'

/**
 * Tests for the login seam (server/middleware/auth.js) — the security-critical
 * boundary where identity is established from the Advisory.com session token and
 * NEVER from the request body.
 *
 * The signing secret is locked here BEFORE requiring the module, so the config
 * it loads (config/integration.js → AUTH.secret) uses a known value we can sign
 * valid test tokens against.
 */

process.env.JWT_SECRET = 'test-secret-for-unit-tests'

const jwt = require('jsonwebtoken')
const { auth, DEV_IDENTITY } = require('../../server/collaborate/middleware/auth')

const SECRET = 'test-secret-for-unit-tests'

function mockRes () {
  return { send: jest.fn() }
}

function sign (payload) {
  return jwt.sign(payload, SECRET)
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
    expect(req.identity).toEqual({ advisorId: 'a1', firmId: 'f1', role: 'advisor', email: 'a@b.com' })
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
    process.env.ALLOW_DEV_AUTH = 'true'
    const req = { headers: {} }
    const res = mockRes()
    const next = jest.fn()

    auth(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.send).not.toHaveBeenCalled()
    expect(req.identity).toEqual(DEV_IDENTITY)
  })

  test('falls back to the dev identity when a token is invalid but dev auth is on', () => {
    process.env.ALLOW_DEV_AUTH = 'true'
    const req = { headers: { authorization: 'Bearer garbage' } }
    const res = mockRes()
    const next = jest.fn()

    auth(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.identity).toEqual(DEV_IDENTITY)
  })
})
