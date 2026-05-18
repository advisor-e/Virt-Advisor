'use strict'

// Must be set before any require so config/integration.js picks it up
process.env.JWT_SECRET = 'test-secret-for-auth-tests'

const jwt = require('jsonwebtoken')

const TEST_SECRET = 'test-secret-for-auth-tests'
const WRONG_SECRET = 'wrong-secret'

const { firmAuth, requireManagerRole } = require('../../server/middleware/firmAuth')

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
