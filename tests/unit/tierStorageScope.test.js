'use strict'

// Must be set before any require so config/integration.js picks it up
process.env.JWT_SECRET = 'test-secret-for-tier-scope-tests'

const jwt = require('jsonwebtoken')

const TEST_SECRET = 'test-secret-for-tier-scope-tests'

const { firmAuth } = require('../../server/middleware/firmAuth')
const { AUTH } = require('../../config/integration')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')
const { tierOfScope, parentScopeOf } = require('../../server/utils/tierChain')

/**
 * WHICH STORAGE SCOPE DOES A MANAGING TIER WRITE UNDER?
 *
 * The mentor half of this was fixed in 2026 after a mentor's saves ran into a
 * firm's storage for weeks — succeeding every time, and reaching nobody. The two
 * middle tiers arrive with the same hazard and the same answer: the scope is
 * resolved ONCE, in firmAuth, so no route can forget it.
 *
 * The most important tests here are the ones that assert a REFUSAL. A tier whose
 * token does not say which group it manages must be turned away, because the only
 * alternative is a guess, and a guessed brand files one customer's content under
 * another's while the screen reports success.
 */

function makeMockRes () {
  return {
    headersSent: false,
    _status: null,
    _body: null,
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { this._body = body }
  }
}

function run (payload) {
  const token = jwt.sign(payload, TEST_SECRET)
  const req = { headers: { authorization: `Bearer ${token}` } }
  const res = makeMockRes()
  const next = jest.fn()
  firmAuth(req, res, next)
  return { req, res, next, error: res._body ? JSON.parse(res._body).error : null }
}

describe('tier storage scope — the tiers that exist today are untouched', () => {
  test('a firm manager still writes under their own firm id', () => {
    const { req, next } = run({ firmId: 'firm-1', role: AUTH.managerRole })
    expect(next).toHaveBeenCalledTimes(1)
    expect(req.firmId).toBe('firm-1')
    expect(req.identity.firmId).toBe('firm-1')
  })

  test('a mentor is still re-pointed at the reserved platform scope', () => {
    // The claimed firm is deliberately a real-looking one: before the 2026 fix
    // this is exactly where the mentor's content went.
    const { req, next } = run({ firmId: 'firm-1', role: AUTH.mentorRole })
    expect(next).toHaveBeenCalledTimes(1)
    expect(req.firmId).toBe(PLATFORM_SCOPE)
    expect(req.identity.firmId).toBe(PLATFORM_SCOPE)
  })

  test('an advisor with no manager role is untouched', () => {
    const { req, next } = run({ firmId: 'firm-9', role: 'advisor' })
    expect(next).toHaveBeenCalledTimes(1)
    expect(req.firmId).toBe('firm-9')
  })
})

describe('tier storage scope — the two middle tiers FAIL CLOSED today', () => {
  test('the two middle roles are unset, which is what closes the door', () => {
    // If either of these is ever given a value without the claims below being
    // supplied too, this test is the first thing that should be re-read.
    expect(AUTH.globalManagerRole).toBe('')
    expect(AUTH.groupManagerRole).toBe('')
  })

  test('a token claiming to be a global manager gets NO tier scope while the role is unset', () => {
    // It is admitted as an ordinary caller under its own firm claim — it does not
    // silently acquire a brand's storage scope by asserting a role name.
    const { req, next } = run({ firmId: 'firm-1', role: 'global_manager', globalGroup: 'BDO' })
    expect(next).toHaveBeenCalledTimes(1)
    expect(req.firmId).toBe('firm-1')
    expect(req.firmId).not.toContain('__global__')
  })

  test('a token claiming to be a group manager gets NO tier scope while the role is unset', () => {
    const { req } = run({ firmId: 'firm-1', role: 'group_manager', globalGroup: 'BDO', country: 'DE' })
    expect(req.firmId).toBe('firm-1')
    expect(req.firmId).not.toContain('__group__')
  })
})

describe('tier storage scope — once the master team supplies the roles', () => {
  // These drive the real branches by configuring the roles the way Advisor-e
  // eventually will. Restored afterwards so the fail-closed state above is what
  // the rest of the suite — and the running app — sees.
  const savedGlobal = AUTH.globalManagerRole
  const savedGroup = AUTH.groupManagerRole

  beforeEach(() => {
    AUTH.globalManagerRole = 'global_manager'
    AUTH.groupManagerRole = 'group_manager'
  })

  afterEach(() => {
    AUTH.globalManagerRole = savedGlobal
    AUTH.groupManagerRole = savedGroup
  })

  test('a global manager writes under their brand, not under the firm they claim', () => {
    const { req, next } = run({ firmId: 'firm-1', role: 'global_manager', globalGroup: 'BDO' })
    expect(next).toHaveBeenCalledTimes(1)
    expect(req.firmId).toBe('__global__:BDO')
    expect(req.identity.firmId).toBe('__global__:BDO')
    expect(tierOfScope(req.firmId)).toBe('global_manager')
  })

  test('a group manager writes under their brand AND country', () => {
    const { req } = run({ firmId: 'firm-1', role: 'group_manager', globalGroup: 'BDO', country: 'DE' })
    expect(req.firmId).toBe('__group__:BDO:DE')
    expect(tierOfScope(req.firmId)).toBe('group_manager')
  })

  test('the resolved scopes chain upward correctly', () => {
    // A country reports to its brand; a brand reports to the mentor. This is the
    // "stay in their channel" rule expressed as data rather than as a comment.
    expect(parentScopeOf('__group__:BDO:DE')).toBe('__global__:BDO')
    expect(parentScopeOf('__global__:BDO')).toBe(PLATFORM_SCOPE)
    expect(parentScopeOf(PLATFORM_SCOPE)).toBeNull()
  })

  test('two brands never resolve to the same scope', () => {
    const a = run({ firmId: 'firm-1', role: 'global_manager', globalGroup: 'BDO' })
    const b = run({ firmId: 'firm-1', role: 'global_manager', globalGroup: 'Lindt' })
    expect(a.req.firmId).not.toBe(b.req.firmId)
  })

  test('REFUSED: a global manager whose token does not name their group', () => {
    const { res, next, error } = run({ firmId: 'firm-1', role: 'global_manager' })
    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(403)
    expect(error.code).toBe('MISSING_GROUP_CLAIM')
  })

  test('REFUSED: a group manager who names a brand but no country', () => {
    // Falling back to the brand would hand one country's manager the whole brand.
    const { res, next, error } = run({ firmId: 'firm-1', role: 'group_manager', globalGroup: 'BDO' })
    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(403)
    expect(error.code).toBe('MISSING_GROUP_CLAIM')
  })

  test('REFUSED: a brand name containing the separator', () => {
    // Scope ids are taken apart on ':' to find the level above. A name that cannot
    // be taken apart again is refused rather than mangled — the master team needs
    // to know, and a silently escaped name would break the cascade invisibly.
    const { res, next, error } = run({ firmId: 'firm-1', role: 'global_manager', globalGroup: 'BDO:UK' })
    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(403)
    expect(error.code).toBe('INVALID_GROUP_CLAIM')
  })

  test('REFUSED: a group manager whose COUNTRY contains the separator', () => {
    // The same guard as the brand above, on the other half of the composed id. A
    // country is likelier to arrive oddly formatted than a brand ("DE:Bayern"),
    // so the group tier needs its own proof rather than inheriting the global
    // tier's.
    const { res, next, error } = run({ firmId: 'firm-1', role: 'group_manager', globalGroup: 'BDO', country: 'DE:Bayern' })
    expect(next).not.toHaveBeenCalled()
    expect(res._status).toBe(403)
    expect(error.code).toBe('INVALID_GROUP_CLAIM')
  })

  test('the mentor still wins over a middle tier when a role value collides', () => {
    AUTH.globalManagerRole = AUTH.mentorRole
    const { req } = run({ firmId: 'firm-1', role: AUTH.mentorRole, globalGroup: 'BDO' })
    expect(req.firmId).toBe(PLATFORM_SCOPE)
  })
})

// ── The dev bypasses for the two middle tiers ─────────────────────────────────
// They exist because no real role does, so they are the only way either hub can be
// opened at all today. That makes them worth the same fail-closed scrutiny as the
// two that came before: OFF unless ALLOW_DEV_AUTH is explicitly 'true', and never
// in production. DEV_AUTH_ENABLED is evaluated at module load, so each scenario
// re-requires firmAuth with the env set — the pattern from firmAuth.test.js.

describe('dev bypasses — the middle tiers', () => {
  function setEnv (key, value) {
    if (value === undefined) { delete process.env[key] } else { process.env[key] = value }
  }

  function firmAuthWithEnv ({ allowDevAuth, nodeEnv }) {
    let fn
    const prevAllow = process.env.ALLOW_DEV_AUTH
    const prevNode = process.env.NODE_ENV
    setEnv('ALLOW_DEV_AUTH', allowDevAuth)
    setEnv('NODE_ENV', nodeEnv)
    jest.isolateModules(() => { fn = require('../../server/middleware/firmAuth').firmAuth })
    setEnv('ALLOW_DEV_AUTH', prevAllow)
    setEnv('NODE_ENV', prevNode)
    return fn
  }

  function callWith (fn, token) {
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = makeMockRes()
    const next = jest.fn()
    fn(req, res, next)
    return { req, res, next }
  }

  const CASES = [
    { token: 'dev-local-global', scope: '__global__:Advisor-e', tier: 'global_manager' },
    { token: 'dev-local-group', scope: '__group__:Advisor-e:DE', tier: 'group_manager' }
  ]

  for (const c of CASES) {
    test(`${c.token} resolves to ${c.scope} when the bypass is on`, () => {
      const fn = firmAuthWithEnv({ allowDevAuth: 'true', nodeEnv: 'development' })
      const { req, next } = callWith(fn, c.token)

      expect(next).toHaveBeenCalledTimes(1)
      expect(req.firmId).toBe(c.scope)
      expect(req.identity.firmId).toBe(c.scope)
      // The scope id is composed by tierChain, not spelled out by hand here — so a
      // developer exercises the real storage path, not a special case.
      expect(tierOfScope(req.firmId)).toBe(c.tier)
    })

    test(`${c.token} is REFUSED by default (ALLOW_DEV_AUTH unset)`, () => {
      const fn = firmAuthWithEnv({ allowDevAuth: undefined, nodeEnv: 'development' })
      const { res, next } = callWith(fn, c.token)

      expect(next).not.toHaveBeenCalled()
      expect(res._status).toBe(401)
    })

    test(`${c.token} is REFUSED in production even with ALLOW_DEV_AUTH=true`, () => {
      const fn = firmAuthWithEnv({ allowDevAuth: 'true', nodeEnv: 'production' })
      const { res, next } = callWith(fn, c.token)

      expect(next).not.toHaveBeenCalled()
      expect(res._status).toBe(401)
    })
  }

  test('the group dev scope sits under the global dev scope, not beside it', () => {
    // If these two ever stop chaining, a developer testing the group hub would be
    // exercising a tier that inherits from the mentor rather than from its brand —
    // and the cascade they were checking would be the wrong one.
    expect(parentScopeOf('__group__:Advisor-e:DE')).toBe('__global__:Advisor-e')
  })
})
