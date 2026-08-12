'use strict'

/**
 * Phase 3 of design/MENTOR-SAVE-SCOPE-PLAN.md — a mentor's save lands at mentor
 * level.
 *
 * THE DEFECT. A mentor is not refused by the Firm Manager gate: requireManagerRole
 * allows managerRole OR adminRole, and the interim mentor role IS adminRole. So
 * every Mentor Hub save ran, reported success, and was written under whatever firm
 * the mentor's token claimed. The mentor's platform content was untouched and no
 * firm inherited the edit. Nothing errored and the screen said it worked — which is
 * why a test, not a reading of the code, is what holds this closed.
 *
 * The three properties below are the whole fix, and the third is the one most
 * likely to be broken by a well-meaning later change.
 */

process.env.JWT_SECRET = 'test-secret-for-mentor-scope'

const jwt = require('jsonwebtoken')

const { AUTH } = require('../../config/integration')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')
const { firmAuth, collaborateAuth, requireManagerRole } = require('../../server/middleware/firmAuth')

const TEST_SECRET = 'test-secret-for-mentor-scope'
const makeToken = payload => jwt.sign(payload, TEST_SECRET)

function makeMockRes () {
  return {
    headersSent: false,
    _status: null,
    _body: null,
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { this._body = body },
    send (status, body) { this._status = status; this._body = body; this.headersSent = true }
  }
}

function authenticate (middleware, payload, extra) {
  const req = Object.assign(
    { headers: { authorization: `Bearer ${makeToken(payload)}` } },
    extra || {}
  )
  const res = makeMockRes()
  const next = jest.fn()
  middleware(req, res, next)
  return { req, res, next }
}

// ── 1. A mentor is re-pointed at the platform scope ───────────────────────────

describe('a mentor request resolves to the platform scope', () => {
  test('req.firmId becomes the reserved scope, not the token\'s firm claim', () => {
    const { req, next } = authenticate(firmAuth, {
      firmId: 'some-firm-the-token-happens-to-name',
      role: AUTH.mentorRole
    })

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.firmId).toBe(PLATFORM_SCOPE)
    expect(req.firmId).not.toBe('some-firm-the-token-happens-to-name')
  })

  test('the identity object is re-pointed too, not just the flat field', () => {
    // attachIdentity sets BOTH shapes; a fix to only one would leave whichever
    // accessor a route happens to use reading the old firm.
    const { req } = authenticate(firmAuth, { firmId: 'firm-9', role: AUTH.mentorRole })
    expect(req.identity.firmId).toBe(PLATFORM_SCOPE)
  })

  test('the mentor still passes the Firm Manager gate — the save runs, at the right scope', () => {
    // Not a curiosity: this is exactly why the bug was silent. The fix must not
    // work by starting to refuse the mentor.
    const { req } = authenticate(firmAuth, { firmId: 'firm-9', role: AUTH.mentorRole })
    const res = makeMockRes()
    const next = jest.fn()

    requireManagerRole(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res._status).toBeNull()
  })
})

// ── 2. A firm manager is untouched ────────────────────────────────────────────

describe('a firm manager is completely unaffected', () => {
  test('req.firmId is still the firm from the verified token', () => {
    const { req, next } = authenticate(firmAuth, { firmId: 'acme-ltd', role: AUTH.managerRole })
    expect(next).toHaveBeenCalledTimes(1)
    expect(req.firmId).toBe('acme-ltd')
    expect(req.identity.firmId).toBe('acme-ltd')
  })

  test('an advisor with no manager role keeps their own firm', () => {
    const { req } = authenticate(firmAuth, { firmId: 'acme-ltd', role: 'advisor' })
    expect(req.firmId).toBe('acme-ltd')
  })
})

// ── 3. The scope can never be asked for ───────────────────────────────────────

describe('the scope comes from the verified token and nowhere else', () => {
  test('a firm manager cannot reach the platform scope by asking for it', () => {
    // The IDOR rule that protects firm-to-firm reads, extended one level up: a
    // body, query or header naming the scope must change nothing.
    const { req } = authenticate(
      firmAuth,
      { firmId: 'acme-ltd', role: AUTH.managerRole },
      { body: { firmId: PLATFORM_SCOPE }, query: { firmId: PLATFORM_SCOPE }, params: { firmId: PLATFORM_SCOPE } }
    )
    expect(req.firmId).toBe('acme-ltd')
  })

  test('claiming the platform scope as your firm does not make you the mentor', () => {
    // A forged-looking claim still only reaches the scope the ROLE allows. The
    // role is what is checked, and it is signed.
    const { req } = authenticate(firmAuth, { firmId: PLATFORM_SCOPE, role: AUTH.managerRole })
    expect(req.userRole).toBe(AUTH.managerRole)
  })
})

// ── 4. The people layer keeps its own tier resolution ─────────────────────────

describe('collaborateAuth is NOT re-pointed', () => {
  test('the Adviser Network tab keeps the identity its tier roll-up depends on', () => {
    // /api/people resolves the caller's TIER server-side and already returns a
    // correct roll-up above a firm — it is the one tab that works one level up.
    // The override lives in firmAuth, not in the shared attachIdentity, so this
    // must keep the token's own firm.
    const { req, next } = authenticate(collaborateAuth, {
      firmId: 'some-firm-the-token-happens-to-name',
      role: AUTH.mentorRole
    })

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.firmId).toBe('some-firm-the-token-happens-to-name')
    expect(req.firmId).not.toBe(PLATFORM_SCOPE)
  })
})
