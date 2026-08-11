'use strict'

/**
 * "NOT CONNECTED YET" IS NOT THE SAME STATEMENT AS "NOBODY IS USING IT".
 *
 * Five reports reach a middle-tier hub with nothing in them, and until this change
 * all five drew the same blank panel. A blank panel in front of a brand's own
 * senior manager says their firms are not using the app. That is false — no firm
 * has been PUT beneath them yet, because the master team has not supplied the
 * firm-to-group mapping. Mike's standing rule, artefact §4.4 and
 * COLLABORATE-MERGE-PLAN.md §4.3: "Where a stub is the honest answer, it says so on
 * screen rather than showing an empty roll-up that looks like real data with
 * nothing in it."
 *
 * 🔴 THE FLAG IS COMPUTED ON THE BACKEND AND NEVER INFERRED ON THE SCREEN, and that
 * is the part worth protecting. A component could reach the same answer today by
 * asking "am I a middle tier?" — and it would be right until the day a mapping
 * arrives, at which point it would keep apologising for firms that are connected.
 * Only the backend knows what the mapping holds, so only the backend decides.
 *
 * The tests that matter most here are the ones asserting the flag is FALSE: a
 * "not connected yet" banner on the mentor's live screens, or on a firm manager's,
 * would be a new false statement replacing the old one.
 */

process.env.JWT_SECRET = 'test-secret-for-awaiting-firms'

const {
  setFirmMembership,
  globalScopeId,
  groupScopeId,
  isAwaitingFirms,
  firmsUnderScope
} = require('../../server/utils/tierChain')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

const BRAND = 'Advisor-e'

afterEach(() => setFirmMembership({}))

describe('isAwaitingFirms — who gets the notice', () => {
  test('🔴 THE MENTOR NEVER DOES, even with no membership data at all', () => {
    // Every firm chains up to the platform scope whether or not its group is known,
    // so the mentor always has firms beneath it and an empty mentor report honestly
    // means no activity. Three live screens depend on this staying false.
    expect(isAwaitingFirms(PLATFORM_SCOPE)).toBe(false)
  })

  test('🔴 A FIRM MANAGER NEVER DOES', () => {
    // A firm is the bottom of the chain. Its Team Progress tab is about its own
    // advisers, and this question does not apply to it. Team Progress and Team Case
    // Studies are live in UAT at firm level, so a banner appearing there would be a
    // visible regression on a screen that was working.
    expect(isAwaitingFirms('firm-a')).toBe(false)
    expect(isAwaitingFirms('some-real-advisor-e-firm')).toBe(false)
  })

  test('both middle tiers DO, while nothing is mapped beneath them', () => {
    expect(isAwaitingFirms(globalScopeId(BRAND))).toBe(true)
    expect(isAwaitingFirms(groupScopeId(BRAND, 'DE'))).toBe(true)
  })

  test('and they STOP as soon as one firm is mapped beneath them', () => {
    // The screen must correct itself the moment the integration lands — with no
    // code change, no deploy and nobody remembering to remove a banner.
    setFirmMembership({ 'firm-berlin': { globalGroup: BRAND, country: 'DE' } })
    expect(isAwaitingFirms(groupScopeId(BRAND, 'DE'))).toBe(false)
    expect(isAwaitingFirms(globalScopeId(BRAND))).toBe(false)
  })

  test('a tier whose SIBLING has firms is still awaiting its own', () => {
    // The notice is about this manager's own channel. A German group being mapped
    // says nothing about the Irish one, and reading it as "connected" would show an
    // empty report to a manager who has genuinely not been set up.
    setFirmMembership({ 'firm-berlin': { globalGroup: BRAND, country: 'DE' } })
    expect(isAwaitingFirms(groupScopeId(BRAND, 'IE'))).toBe(true)
  })

  test('a firm mapped to ANOTHER brand does not connect this one', () => {
    setFirmMembership({ 'firm-leeds': { globalGroup: 'BDO', country: 'UK' } })
    expect(isAwaitingFirms(globalScopeId(BRAND))).toBe(true)
  })

  test('a missing or malformed scope does not produce a notice', () => {
    for (const bad of [undefined, null, '', 0]) {
      expect(isAwaitingFirms(bad)).toBe(false)
    }
  })
})

describe('firmsUnderScope', () => {
  beforeEach(() => setFirmMembership({
    'firm-berlin': { globalGroup: BRAND, country: 'DE' },
    'firm-munich': { globalGroup: BRAND, country: 'DE' },
    'firm-dublin': { globalGroup: BRAND, country: 'IE' },
    'firm-leeds': { globalGroup: 'BDO', country: 'UK' }
  }))

  test('a country group lists only its own firms', () => {
    expect(firmsUnderScope(groupScopeId(BRAND, 'DE')).sort())
      .toEqual(['firm-berlin', 'firm-munich'])
  })

  test('a brand lists every country in it, and nobody else\'s', () => {
    expect(firmsUnderScope(globalScopeId(BRAND)).sort())
      .toEqual(['firm-berlin', 'firm-dublin', 'firm-munich'])
  })

  test('it answers from MEMBERSHIP, not from the firms table', () => {
    // A real firm that nobody has mapped is invisible here — which is why
    // isAwaitingFirms asks the tier first and never asks this about the mentor.
    expect(firmsUnderScope(PLATFORM_SCOPE).sort())
      .toEqual(['firm-berlin', 'firm-dublin', 'firm-leeds', 'firm-munich'])
    expect(firmsUnderScope(PLATFORM_SCOPE)).not.toContain('firm-never-mapped')
  })

  test('an empty or malformed scope lists nothing', () => {
    expect(firmsUnderScope('')).toEqual([])
    expect(firmsUnderScope(null)).toEqual([])
  })
})
