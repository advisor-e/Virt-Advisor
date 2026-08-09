'use strict'

/**
 * The cascade, four levels deep: mentor -> global -> group -> firm.
 *
 * design/MENTOR-TIER-CHAIN-PLAN.md §4 step 5. tierChain.test.js proves the CHAIN is
 * right; these prove the BLOCKS actually walk it — that content authored two tiers
 * up arrives, that a middle tier can edit and switch off what it inherited, and
 * that the tiers' own rows cannot collide.
 *
 * ⚠ THE HONEST LIMIT, stated here rather than left to be discovered. None of this
 * can be demonstrated by logging in as a group manager, because no such login
 * exists: roles.js maps no JWT role value to `global_manager` or `group_manager`,
 * and Advisor-e's login is what issues roles. So this is evidence from a seeded
 * membership map, which is weaker than a live screen. Plan §5.
 */

process.env.JWT_SECRET = 'test-secret'
process.env.MYSQL_DATABASE = 'virt_advisor_test'
process.env.MYSQL_PASSWORD = 'test'

jest.mock('../../server/utils/db', () => ({ execute: jest.fn(), getConnection: jest.fn() }))

const db = require('../../server/utils/db')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')
const {
  setFirmMembership, globalScopeId, groupScopeId
} = require('../../server/utils/tierChain')
const { loadFirmConfig } = require('../../server/utils/firmOverlay')
const { loadBlendedStaircase } = require('../../server/utils/staircaseConfig')
const { CONFIG_KEYS, ownStepPrefix } = require('../../server/utils/firmStaircase')
const { ownQuestionPrefix } = require('../../server/utils/firmQuizzes')

const FIRM = 'firm-berlin'
const GLOBAL = globalScopeId('Advisor-e')
const GROUP = groupScopeId('Advisor-e', 'DE')
const CASCADING = 'domain-support'

const row = value => [[{ config_json: JSON.stringify(value) }]]
const noRow = () => [[]]

beforeEach(() => {
  db.execute.mockReset()
  setFirmMembership({ [FIRM]: { globalGroup: 'Advisor-e', country: 'DE' } })
})
afterEach(() => setFirmMembership({}))

// ── The overlay fold, four levels ────────────────────────────────────────────

describe('a cascading key folds every tier, lowest wins', () => {
  // Read order is bottom-up and pinned by cascadingConfig.test.js: firm, group,
  // global, mentor. These stubs answer in that order.
  test('content the MENTOR authored reaches a firm two tiers below', async () => {
    db.execute
      .mockResolvedValueOnce(noRow()) // firm  — stored nothing
      .mockResolvedValueOnce(noRow()) // group — stored nothing
      .mockResolvedValueOnce(noRow()) // global— stored nothing
      .mockResolvedValueOnce(row({ tax: { summary: 'mentor' } }))

    await expect(loadFirmConfig(FIRM, CASCADING))
      .resolves.toEqual({ tax: { summary: 'mentor' } })
  })

  test('each tier overrides the one above it, and the firm wins outright', async () => {
    db.execute
      .mockResolvedValueOnce(row({ tax: { summary: 'firm' } }))
      .mockResolvedValueOnce(row({ tax: { summary: 'group' }, vat: { summary: 'group' } }))
      .mockResolvedValueOnce(row({ tax: { summary: 'global' }, payroll: { summary: 'global' } }))
      .mockResolvedValueOnce(row({ tax: { summary: 'mentor' }, audit: { summary: 'mentor' } }))

    await expect(loadFirmConfig(FIRM, CASCADING)).resolves.toEqual({
      tax: { summary: 'firm' }, // the lowest tier that spoke wins
      vat: { summary: 'group' }, // and each field falls through to whoever last set it
      payroll: { summary: 'global' },
      audit: { summary: 'mentor' }
    })
  })

  test('a MIDDLE tier overrides the mentor for everyone below it', async () => {
    db.execute
      .mockResolvedValueOnce(noRow()) // firm stored nothing
      .mockResolvedValueOnce(row({ tax: { summary: 'the German group' } }))
      .mockResolvedValueOnce(noRow())
      .mockResolvedValueOnce(row({ tax: { summary: 'mentor' } }))

    // This is the whole point of the middle tiers: a country manager's wording
    // reaches their firms without the mentor or the firm doing anything.
    await expect(loadFirmConfig(FIRM, CASCADING))
      .resolves.toEqual({ tax: { summary: 'the German group' } })
  })

  test('all four scopes are asked, bottom-up, and each is asked exactly once', async () => {
    db.execute.mockResolvedValue(noRow())
    await loadFirmConfig(FIRM, CASCADING)

    expect(db.execute.mock.calls.map(c => c[1][0]))
      .toEqual([FIRM, GROUP, GLOBAL, PLATFORM_SCOPE])
  })

  test('a firm with NO membership still reads two scopes — today, unchanged', async () => {
    db.execute.mockResolvedValue(noRow())
    await loadFirmConfig('firm-unlisted', CASCADING)

    expect(db.execute.mock.calls.map(c => c[1][0]))
      .toEqual(['firm-unlisted', PLATFORM_SCOPE])
  })

  test('reading AT a middle tier folds only what is above it', async () => {
    db.execute.mockResolvedValue(noRow())
    await loadFirmConfig(GROUP, CASCADING)

    expect(db.execute.mock.calls.map(c => c[1][0]))
      .toEqual([GROUP, GLOBAL, PLATFORM_SCOPE])
  })

  test('nothing stored at any tier is null, not an empty object', async () => {
    db.execute.mockResolvedValue(noRow())
    await expect(loadFirmConfig(FIRM, CASCADING)).resolves.toBeNull()
  })
})

// ── The staircase, four levels ───────────────────────────────────────────────

describe('the staircase walks the same chain', () => {
  /** Answer per (scopeId, configKey), as the real store does. */
  function mockScopes (byScope) {
    return jest.fn((scopeId, key) => {
      const forScope = byScope[scopeId] || {}
      return Promise.resolve(
        Object.prototype.hasOwnProperty.call(forScope, key) ? forScope[key] : null)
    })
  }

  test('a step the MENTOR added arrives at a firm two tiers below', async () => {
    const loader = mockScopes({
      [PLATFORM_SCOPE]: {
        [CONFIG_KEYS.own]: [{ id: 'ms-1', name: 'Mentor Step', selectorDescription: 'from the top' }]
      }
    })

    const resolved = await loadBlendedStaircase(FIRM, loader)
    expect(resolved.steps.map(s => s.id)).toContain('ms-1')
  })

  test('a step the GROUP added arrives at its firms, and carries its own prefix', async () => {
    const loader = mockScopes({
      [GROUP]: {
        [CONFIG_KEYS.own]: [{ id: 'gs-1', name: 'German Step', selectorDescription: 'country rule' }]
      }
    })

    const resolved = await loadBlendedStaircase(FIRM, loader)
    const step = resolved.steps.find(s => s.id === 'gs-1')
    expect(step).toBeDefined()
    expect(step.name).toBe('German Step')
  })

  test('a middle tier can switch off an Advisor-e step for everyone below it', async () => {
    const declined = 'as-compilation-verification'
    const loader = mockScopes({ [GROUP]: { [CONFIG_KEYS.declines]: [declined] } })

    const resolved = await loadBlendedStaircase(FIRM, loader)
    expect(resolved.steps.map(s => s.id)).not.toContain(declined)
  })

  test('a firm can switch off a step the GROUP added — a decline reaches upward one tier', async () => {
    const loader = mockScopes({
      [GROUP]: { [CONFIG_KEYS.own]: [{ id: 'gs-1', name: 'German Step', selectorDescription: 'x' }] },
      [FIRM]: { [CONFIG_KEYS.declines]: ['gs-1'] }
    })

    const resolved = await loadBlendedStaircase(FIRM, loader)
    expect(resolved.steps.map(s => s.id)).not.toContain('gs-1')
  })

  test('the lowest tier to edit a step wins, and the higher edit is not also emitted', async () => {
    const id = 'as-assimilation'
    const loader = mockScopes({
      [GROUP]: { [CONFIG_KEYS.overrides]: { [id]: { name: 'Group Wording' } } },
      [FIRM]: { [CONFIG_KEYS.overrides]: { [id]: { name: 'Firm Wording' } } }
    })

    const resolved = await loadBlendedStaircase(FIRM, loader)
    const matches = resolved.steps.filter(s => s.id === id)
    // Exactly one row, or anything scored per step would be counted twice.
    expect(matches).toHaveLength(1)
    expect(matches[0].name).toBe('Firm Wording')
  })

  test('a firm with no membership resolves against the mentor, exactly as before', async () => {
    const loader = mockScopes({
      [PLATFORM_SCOPE]: { [CONFIG_KEYS.own]: [{ id: 'ms-1', name: 'Mentor Step', selectorDescription: 'x' }] },
      [GROUP]: { [CONFIG_KEYS.own]: [{ id: 'gs-1', name: 'Should never appear', selectorDescription: 'x' }] }
    })

    const resolved = await loadBlendedStaircase('firm-unlisted', loader)
    expect(resolved.steps.map(s => s.id)).toContain('ms-1')
    expect(resolved.steps.map(s => s.id)).not.toContain('gs-1')
  })
})

// ── The id-collision trap, one tier wider ────────────────────────────────────

describe('no two tiers mint the same own-row id', () => {
  const SCOPES = [PLATFORM_SCOPE, GLOBAL, GROUP, FIRM]

  test('every tier has its own staircase prefix', () => {
    const prefixes = SCOPES.map(ownStepPrefix)
    expect(new Set(prefixes).size).toBe(SCOPES.length)
    expect(prefixes).toEqual(['ms-', 'xs-', 'gs-', 'fs-'])
  })

  test('every tier has its own quiz prefix', () => {
    const prefixes = SCOPES.map(ownQuestionPrefix)
    expect(new Set(prefixes).size).toBe(SCOPES.length)
    expect(prefixes).toEqual(['mq-', 'xq-', 'gq-', 'fq-'])
  })

  test('the two adjacent middle tiers do not share a letter', () => {
    // The near-miss this guards: `gs-` for both global and group would put two
    // different steps under one id in a group manager's own resolved list, and
    // every decision in the mechanism is keyed to an id. That is the Phase 5
    // defect, returning with two new ways to hit it.
    expect(ownStepPrefix(GLOBAL)).not.toBe(ownStepPrefix(GROUP))
    expect(ownQuestionPrefix(GLOBAL)).not.toBe(ownQuestionPrefix(GROUP))
  })

  test('an unknown scope mints as a firm rather than throwing mid-save', () => {
    expect(ownStepPrefix('some-real-firm')).toBe('fs-')
    expect(ownQuestionPrefix('some-real-firm')).toBe('fq-')
  })
})
