'use strict'

/**
 * The method-guide cascade (item 4.16 F, 2026-08-17).
 *
 * WHO SEES IT — ruled by Mike 2026-08-17: the SAME TIERS as the materials table
 * each guide opens from. The mentor authors; global group manager, group manager
 * and firm manager each inherit and may reword their own copy.
 *
 * 🔴 THE TEST THAT MATTERS MOST IS "A FIRM THAT HAS TYPED NOTHING IS UNCHANGED".
 * That is the proof this build is behaviour-preserving for every firm on the
 * platform today, and it is a test run rather than a claim.
 *
 * ⚠ The two middle tiers cannot be exercised end-to-end yet and that is not ours:
 * roles.js issues no `global_group_manager` or `group_manager`, and no firm→brand
 * membership exists, so `parentScopeOf` returns the platform scope and the chain
 * stays mentor → firm. The recursion is tested here with membership supplied
 * directly, so it is ready rather than merely intended.
 */

const { loadResolvedGuideOverrides } = require('../../server/utils/methodGuideConfig')
const { formatGuideForPrompt, loadGuideBase } = require('../../server/utils/methodGuides')
const tierChain = require('../../server/utils/tierChain')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

/** A stand-in overlay store: { scopeId: { guideId: override } }. */
function storeOf (map) {
  return jest.fn((scopeId, key) => {
    expect(key).toBe('method-guides')
    return Promise.resolve(map[scopeId] || null)
  })
}

afterEach(() => {
  tierChain.setFirmMembership({})
})

describe('a scope that has typed nothing', () => {
  test('is unchanged — this is the behaviour-preserving proof', async () => {
    const resolved = await loadResolvedGuideOverrides('firm-a', storeOf({}))
    expect(resolved).toBeNull()
    // And the prompt it produces is byte-for-byte what shipped before this build
    // had a cascade at all.
    expect(formatGuideForPrompt('trial_fit', resolved)).toBe(formatGuideForPrompt('trial_fit'))
  })

  test('with no scope id at all, still nothing', async () => {
    expect(await loadResolvedGuideOverrides(null, storeOf({}))).toBeNull()
  })
})

describe('the mentor authors and a firm inherits', () => {
  test("a firm with no edits of its own reads the mentor's wording", async () => {
    const store = storeOf({ [PLATFORM_SCOPE]: { trial_fit: { objective: "The mentor's objective." } } })
    const resolved = await loadResolvedGuideOverrides('firm-a', store)
    expect(resolved.trial_fit.objective).toBe("The mentor's objective.")
    expect(formatGuideForPrompt('trial_fit', resolved)).toContain("The mentor's objective.")
  })

  test("a firm's own wording wins over the mentor's, line by line", async () => {
    const store = storeOf({
      [PLATFORM_SCOPE]: { trial_fit: { objective: "The mentor's objective.", core_principle: "The mentor's principle." } },
      'firm-a': { trial_fit: { objective: "The firm's objective." } }
    })
    const resolved = await loadResolvedGuideOverrides('firm-a', store)
    expect(resolved.trial_fit.objective).toBe("The firm's objective.")
    // The line the firm did NOT touch still comes from the mentor — not from the
    // shipped file, and not lost.
    expect(resolved.trial_fit.core_principle).toBe("The mentor's principle.")
  })

  test('a firm editing one guide still inherits the mentor on every other', async () => {
    const store = storeOf({
      [PLATFORM_SCOPE]: { conflict_meeting: { objective: "The mentor's conflict objective." } },
      'firm-a': { trial_fit: { objective: "The firm's trial-fit objective." } }
    })
    const resolved = await loadResolvedGuideOverrides('firm-a', store)
    expect(resolved.conflict_meeting.objective).toBe("The mentor's conflict objective.")
    expect(resolved.trial_fit.objective).toBe("The firm's trial-fit objective.")
  })

  test('the mentor has nothing above it, so its own edits resolve to itself', async () => {
    const store = storeOf({ [PLATFORM_SCOPE]: { trial_fit: { objective: 'Mine.' } } })
    const resolved = await loadResolvedGuideOverrides(PLATFORM_SCOPE, store)
    expect(resolved).toEqual({ trial_fit: { objective: 'Mine.' } })
  })
})

describe('the two middle tiers, ready but not yet issued', () => {
  test('mentor → global group → country → firm all fold, once membership exists', async () => {
    tierChain.setFirmMembership({ 'firm-a': { globalGroup: 'acme', country: 'nz' } })
    const globalId = tierChain.globalScopeId('acme')
    const groupId = tierChain.groupScopeId('acme', 'nz')

    const store = storeOf({
      [PLATFORM_SCOPE]: { trial_fit: { objective: 'platform', core_principle: 'platform', description: 'platform' } },
      [globalId]: { trial_fit: { objective: 'global' } },
      [groupId]: { trial_fit: { core_principle: 'group' } },
      'firm-a': { trial_fit: { description: 'firm' } }
    })

    const resolved = await loadResolvedGuideOverrides('firm-a', store)
    // Each tier's own line wins, and every line nobody below touched survives.
    expect(resolved.trial_fit).toEqual({ objective: 'global', core_principle: 'group', description: 'firm' })
  })

  test('with no membership data a firm inherits the mentor directly — it never guesses a tier', async () => {
    const store = storeOf({ [PLATFORM_SCOPE]: { trial_fit: { objective: 'platform' } } })
    const resolved = await loadResolvedGuideOverrides('firm-a', store)
    expect(resolved.trial_fit.objective).toBe('platform')
  })
})

describe('a storage fault', () => {
  /**
   * A live MySQL server that ANSWERED and refused. `sqlState` is the discriminator
   * (server/utils/dbFailure.js): a rejection from a live server always carries one,
   * a connection failure never does. Only this kind reaches the catch below —
   * a plain "no database here" is absorbed by the dev fallback one level down,
   * which is the affordance that lets this app run without MySQL.
   */
  function refusal () {
    const err = new Error('firm_framework_versions foreign key')
    err.sqlState = '23000'
    err.errno = 1452
    return err
  }

  test('never stops a session — it serves the layer above, and says it did', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const store = jest.fn((scopeId) => {
      if (scopeId === 'firm-a') { return Promise.reject(refusal()) }
      return Promise.resolve({ trial_fit: { objective: 'platform' } })
    })
    const resolved = await loadResolvedGuideOverrides('firm-a', store)
    // The mentor's wording still arrives; the firm's is missing and is logged,
    // which is the difference between a degraded session and a silent one.
    expect(resolved.trial_fit.objective).toBe('platform')
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  test('a refusal at every level falls all the way back to the shipped guides', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const store = jest.fn(() => Promise.reject(refusal()))
    const resolved = await loadResolvedGuideOverrides('firm-a', store)
    expect(resolved).toBeNull()
    expect(formatGuideForPrompt('trial_fit', resolved)).toContain(loadGuideBase('trial_fit').objective)
    spy.mockRestore()
  })

  test('a plain "no database here" is absorbed below, so a dev machine sees no error', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const store = jest.fn(() => Promise.reject(new Error('no db in this test')))
    const resolved = await loadResolvedGuideOverrides('firm-a', store)
    expect(resolved).toBeNull()
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
