'use strict'

/**
 * The tier chain — "who is the level above me?"
 *
 * design/MENTOR-TIER-CHAIN-PLAN.md. Four call sites each hardcoded the answer
 * (PLATFORM_SCOPE), which is what made the cascade exactly two levels deep. These
 * tests pin the two things that make widening it safe:
 *
 *   1. WITH NO MEMBERSHIP DATA the answer is byte-identical to the hardcoded one,
 *      so the whole pre-existing suite proves the change is behaviour-preserving.
 *      This is the property the plan rests on (§3.2) — if it breaks, the change is
 *      not safe to ship, whatever else passes.
 *   2. WITH membership data the chain climbs mentor -> global -> group -> firm, and
 *      a malformed or unknown scope falls back UP the tree rather than sideways
 *      into a guessed group.
 */

const {
  TIERS,
  GLOBAL_PREFIX,
  GROUP_PREFIX,
  globalScopeId,
  groupScopeId,
  setFirmMembership,
  getFirmMembership,
  tierOfScope,
  parentScopeOf,
  scopeChain
} = require('../../server/utils/tierChain')

const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

// Every test starts from the real-world state: no membership data at all.
afterEach(() => setFirmMembership({}))

describe('tierChain — the no-membership case (today, and the safety property)', () => {
  test('a real firm resolves to the platform scope, exactly as the four call sites hardcoded', () => {
    expect(parentScopeOf('dev-firm-001')).toBe(PLATFORM_SCOPE)
    expect(parentScopeOf('some-real-advisor-e-firm')).toBe(PLATFORM_SCOPE)
  })

  test('the platform scope has nothing above it — this is what ends every recursion', () => {
    expect(parentScopeOf(PLATFORM_SCOPE)).toBeNull()
  })

  test('the chain for a firm is two levels deep, mentor first', () => {
    expect(scopeChain('dev-firm-001')).toEqual([PLATFORM_SCOPE, 'dev-firm-001'])
  })

  test('no scope id yields no chain rather than a guessed one', () => {
    expect(scopeChain(null)).toEqual([])
    expect(scopeChain('')).toEqual([])
    expect(parentScopeOf(null)).toBeNull()
    expect(parentScopeOf(undefined)).toBeNull()
  })
})

describe('tierChain — with membership data', () => {
  beforeEach(() => setFirmMembership({
    'firm-berlin': { globalGroup: 'Advisor-e', country: 'DE' },
    'firm-munich': { globalGroup: 'Advisor-e', country: 'DE' },
    'firm-dublin': { globalGroup: 'Advisor-e', country: 'IE' },
    // A firm we know the brand of but not the country — a real partial state, and
    // it must climb to the brand rather than invent a country.
    'firm-nowhere': { globalGroup: 'Advisor-e' }
  }))

  test('a firm resolves to its country group', () => {
    expect(parentScopeOf('firm-berlin')).toBe(groupScopeId('Advisor-e', 'DE'))
    expect(parentScopeOf('firm-dublin')).toBe(groupScopeId('Advisor-e', 'IE'))
  })

  test('a country group resolves to its brand', () => {
    expect(parentScopeOf(groupScopeId('Advisor-e', 'DE'))).toBe(globalScopeId('Advisor-e'))
  })

  test('a brand resolves to the mentor, and the mentor to nothing', () => {
    expect(parentScopeOf(globalScopeId('Advisor-e'))).toBe(PLATFORM_SCOPE)
    expect(parentScopeOf(PLATFORM_SCOPE)).toBeNull()
  })

  test('the full chain is mentor -> global -> group -> firm, top first', () => {
    expect(scopeChain('firm-berlin')).toEqual([
      PLATFORM_SCOPE,
      globalScopeId('Advisor-e'),
      groupScopeId('Advisor-e', 'DE'),
      'firm-berlin'
    ])
  })

  test('two firms in one country share a group scope but keep their own', () => {
    expect(parentScopeOf('firm-berlin')).toBe(parentScopeOf('firm-munich'))
    expect(scopeChain('firm-berlin')).not.toEqual(scopeChain('firm-munich'))
  })

  test('a known brand but unknown country climbs to the brand, never a made-up group', () => {
    expect(parentScopeOf('firm-nowhere')).toBe(globalScopeId('Advisor-e'))
    expect(scopeChain('firm-nowhere')).toEqual([
      PLATFORM_SCOPE, globalScopeId('Advisor-e'), 'firm-nowhere'
    ])
  })

  test('a firm absent from the map still behaves exactly as it does today', () => {
    expect(parentScopeOf('firm-unlisted')).toBe(PLATFORM_SCOPE)
  })
})

describe('tierChain — scope ids cannot collide with a real firm', () => {
  test('both reserved prefixes use the double-underscore convention', () => {
    expect(GLOBAL_PREFIX.startsWith('__')).toBe(true)
    expect(GROUP_PREFIX.startsWith('__')).toBe(true)
  })

  test('the two prefixes are distinct, so a group is never read as a brand', () => {
    expect(GLOBAL_PREFIX).not.toBe(GROUP_PREFIX)
    expect(tierOfScope(globalScopeId('X'))).toBe('global_manager')
    expect(tierOfScope(groupScopeId('X', 'DE'))).toBe('group_manager')
  })

  test('every tier a scope can be is a tier the model knows about', () => {
    for (const scope of [PLATFORM_SCOPE, globalScopeId('X'), groupScopeId('X', 'DE'), 'firm-1']) {
      expect(TIERS).toContain(tierOfScope(scope))
    }
  })

  test('a name containing the separator is REFUSED, not quietly mangled', () => {
    // Composed ids are taken apart on ':' to find the level above, so a name
    // carrying one would produce an id that cannot be read back. This arrives from
    // the master team, so it has to be their error to see, not ours to absorb.
    expect(() => globalScopeId('Advisor:e')).toThrow(/must not contain/)
    expect(() => groupScopeId('Advisor-e', 'D:E')).toThrow(/must not contain/)
    expect(() => globalScopeId('')).toThrow(/non-empty/)
  })

  test('a malformed group id climbs to the mentor rather than naming a guessed brand', () => {
    expect(parentScopeOf(GROUP_PREFIX)).toBe(PLATFORM_SCOPE)
    expect(parentScopeOf(GROUP_PREFIX + 'Advisor-e')).toBe(PLATFORM_SCOPE)
  })
})

describe('tierChain — membership is platform data, not request data', () => {
  test('the map cannot be re-parented by mutating what getFirmMembership returned', () => {
    setFirmMembership({ 'firm-a': { globalGroup: 'Advisor-e', country: 'DE' } })
    const copy = getFirmMembership()
    copy['firm-a'] = { globalGroup: 'Someone-else', country: 'FR' }
    expect(parentScopeOf('firm-a')).toBe(groupScopeId('Advisor-e', 'DE'))
  })

  test('rubbish passed to the setter empties the map rather than half-applying it', () => {
    setFirmMembership({ 'firm-a': { globalGroup: 'Advisor-e', country: 'DE' } })
    setFirmMembership(null)
    expect(parentScopeOf('firm-a')).toBe(PLATFORM_SCOPE)
    setFirmMembership([{ nope: true }])
    expect(getFirmMembership()).toEqual({})
  })
})

describe('tierChain — the chain always terminates', () => {
  test('no chain is longer than the tier model', () => {
    setFirmMembership({ 'firm-a': { globalGroup: 'Advisor-e', country: 'DE' } })
    expect(scopeChain('firm-a').length).toBeLessThanOrEqual(TIERS.length)
  })

  test('the top of every chain is the mentor', () => {
    setFirmMembership({ 'firm-a': { globalGroup: 'Advisor-e', country: 'DE' } })
    for (const scope of ['firm-a', 'firm-unlisted', globalScopeId('X'), groupScopeId('X', 'DE')]) {
      expect(scopeChain(scope)[0]).toBe(PLATFORM_SCOPE)
    }
  })
})
