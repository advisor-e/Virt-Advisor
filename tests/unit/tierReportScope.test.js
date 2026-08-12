'use strict'

/**
 * WHOSE FIRMS DOES A CROSS-FIRM REPORT SHOW? — the scoping of Case Reviews,
 * Adoption and the Logic Lab Report to the tier that asked for them.
 *
 * 🔴 WHAT WAS WRONG, AND WHY NO TEST CAUGHT IT. The three reports above were
 * mounted behind `requireMentorRole`, a check on the ROLE STRING. But
 * `AUTH.mentorRole` and `AUTH.adminRole` are the SAME value — 'platform_admin' —
 * because Advisor-e has never issued a mentor role and the mentor borrows the admin
 * one. So the guard could not tell a mentor from anyone else carrying that value,
 * and the developer sign-ins for the two new middle hubs carry exactly it. Opening
 * a Group Manager Hub returned EVERY brand's cases, activity and configuration into
 * one country manager's screen.
 *
 * Nothing errored, and no test failed, because every existing test called those
 * handlers AS the mentor — for whom the answer "everything" is correct. The bug
 * lived entirely in the question nobody had asked yet: what should a tier that is
 * not the mentor see?
 *
 * The owner's ruling, 2026-08-11: "it needs to stay in their channel — only firms
 * data that are member of that group (country) goes to that group manager. only
 * group managers aligned with the global group manager above report."
 *
 * TWO CONTROLS, AND THIS FILE TESTS BOTH:
 *   1. requireManagingTier — who may ask. Reads the RESOLVED SCOPE, which tells the
 *      three tiers apart where the role string cannot.
 *   2. tierChain.isWithinScope — what comes back. Applied per row, in each handler.
 *
 * The refusals and the cross-brand cases are the tests that matter here. A report
 * showing too little is a screen someone complains about; a report showing another
 * customer's data is a breach.
 */

process.env.JWT_SECRET = 'test-secret-for-tier-report-scope'

const {
  setFirmMembership,
  globalScopeId,
  groupScopeId,
  isWithinScope
} = require('../../server/utils/tierChain')
const { requireManagingTier } = require('../../server/middleware/firmAuth')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

const BRAND = 'Advisor-e'
const OTHER_BRAND = 'BDO'

function makeMockRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { try { this._body = JSON.parse(body) } catch (e) { this._body = body } }
  }
}

afterEach(() => setFirmMembership({}))

// ── 1 · isWithinScope — what comes back ───────────────────────────────────────

describe('isWithinScope — with no membership data, which is today', () => {
  test('THE MENTOR STILL SEES EVERY FIRM — the reports it has today do not move', () => {
    // This is the property the whole change rests on. A firm with no known
    // membership chains up to the platform scope, so the mentor matches it. If this
    // ever fails, three live mentor reports have silently emptied.
    expect(isWithinScope('firm-a', PLATFORM_SCOPE)).toBe(true)
    expect(isWithinScope('some-real-advisor-e-firm', PLATFORM_SCOPE)).toBe(true)
  })

  test('a middle tier sees NOTHING — never everything', () => {
    // The direction of the failure is the point. Empty is a screen that says so;
    // "everything" is one brand reading another's cases.
    expect(isWithinScope('firm-a', globalScopeId(BRAND))).toBe(false)
    expect(isWithinScope('firm-a', groupScopeId(BRAND, 'DE'))).toBe(false)
  })
})

describe('isWithinScope — once the master team supplies membership', () => {
  beforeEach(() => setFirmMembership({
    'firm-berlin': { globalGroup: BRAND, country: 'DE' },
    'firm-munich': { globalGroup: BRAND, country: 'DE' },
    'firm-dublin': { globalGroup: BRAND, country: 'IE' },
    'firm-leeds': { globalGroup: OTHER_BRAND, country: 'UK' }
  }))

  test('a country manager sees their own country, and not the neighbouring one', () => {
    const de = groupScopeId(BRAND, 'DE')
    expect(isWithinScope('firm-berlin', de)).toBe(true)
    expect(isWithinScope('firm-munich', de)).toBe(true)
    expect(isWithinScope('firm-dublin', de)).toBe(false)
  })

  test('a brand manager sees every country in their brand', () => {
    const brand = globalScopeId(BRAND)
    expect(isWithinScope('firm-berlin', brand)).toBe(true)
    expect(isWithinScope('firm-dublin', brand)).toBe(true)
  })

  test('🔴 NO CROSS-BRAND READ, IN EITHER DIRECTION', () => {
    // The owner's "strictly own branch" ruling, asserted as the thing it protects:
    // one customer's firms never appear beneath another customer's manager.
    expect(isWithinScope('firm-leeds', globalScopeId(BRAND))).toBe(false)
    expect(isWithinScope('firm-leeds', groupScopeId(BRAND, 'DE'))).toBe(false)
    expect(isWithinScope('firm-berlin', globalScopeId(OTHER_BRAND))).toBe(false)
  })

  test('a country manager does NOT see up into their own brand', () => {
    // Authority runs downward. A country manager is not a brand manager.
    expect(isWithinScope('firm-dublin', groupScopeId(BRAND, 'DE'))).toBe(false)
  })

  test('the mentor still sees all of it', () => {
    for (const f of ['firm-berlin', 'firm-dublin', 'firm-leeds']) {
      expect(isWithinScope(f, PLATFORM_SCOPE)).toBe(true)
    }
  })
})

describe('isWithinScope — the inputs that must not become a wildcard', () => {
  test('a missing scope matches nothing', () => {
    // A handler that forgot to pass req.firmId must show an empty report, not the
    // whole platform. Failing toward silence is the only safe direction here.
    expect(isWithinScope('firm-a', undefined)).toBe(false)
    expect(isWithinScope('firm-a', '')).toBe(false)
    expect(isWithinScope('firm-a', null)).toBe(false)
  })

  test('a missing firm id matches nothing', () => {
    expect(isWithinScope(undefined, PLATFORM_SCOPE)).toBe(false)
    expect(isWithinScope('', PLATFORM_SCOPE)).toBe(false)
    expect(isWithinScope(null, PLATFORM_SCOPE)).toBe(false)
  })
})

// ── 2 · requireManagingTier — who may ask ─────────────────────────────────────

describe('requireManagingTier — the guard that reads the scope, not the role', () => {
  test('the mentor is admitted', () => {
    let called = false
    requireManagingTier({ firmId: PLATFORM_SCOPE }, makeMockRes(), () => { called = true })
    expect(called).toBe(true)
  })

  test('both middle tiers are admitted', () => {
    for (const scope of [globalScopeId(BRAND), groupScopeId(BRAND, 'DE')]) {
      let called = false
      requireManagingTier({ firmId: scope }, makeMockRes(), () => { called = true })
      expect(called).toBe(true)
    }
  })

  test('🔴 A FIRM MANAGER IS REFUSED — unchanged from requireMentorRole', () => {
    // The boundary this guard replaced still holds. A firm reading across firms is
    // the breach the old guard existed to prevent, and moving guards must not have
    // cost it.
    const res = makeMockRes()
    let called = false
    requireManagingTier({ firmId: 'firm-a' }, res, () => { called = true })
    expect(called).toBe(false)
    expect(res._status).toBe(403)
    expect(res._body.error.code).toBe('FORBIDDEN')
  })

  test('a caller with no scope at all is refused', () => {
    const res = makeMockRes()
    let called = false
    requireManagingTier({}, res, () => { called = true })
    expect(called).toBe(false)
    expect(res._status).toBe(403)
  })

  test('the refusal carries no stack trace, path or internal detail', () => {
    const res = makeMockRes()
    requireManagingTier({ firmId: 'firm-a' }, res, () => {})
    expect(JSON.stringify(res._body)).not.toMatch(/at |\.js|Error:/)
  })

  test('🔴 THE ROLE STRING IS NOT CONSULTED — this is the bug that was fixed', () => {
    // A middle tier whose token carries 'platform_admin' (which is what the dev
    // sign-ins carry, because AUTH.adminRole and AUTH.mentorRole are the same
    // value) is admitted as its OWN tier. Under the old role check it was admitted
    // as the mentor and handed every brand's data.
    const res = makeMockRes()
    let called = false
    requireManagingTier(
      { firmId: groupScopeId(BRAND, 'DE'), userRole: 'platform_admin' },
      res, () => { called = true }
    )
    expect(called).toBe(true)

    // ...and the same role on a FIRM's scope is still refused, which is the half a
    // role check could never express.
    const res2 = makeMockRes()
    let called2 = false
    requireManagingTier({ firmId: 'firm-a', userRole: 'platform_admin' }, res2, () => { called2 = true })
    expect(called2).toBe(false)
    expect(res2._status).toBe(403)
  })
})
