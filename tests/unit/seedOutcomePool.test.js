'use strict'

/**
 * The dev seed for the outcome pool (4.87 T030).
 *
 * What UAT cannot see: a seed that writes a row a real review could not produce, a row
 * that names a person, or a seed that runs where it must not.
 */

jest.mock('../../server/utils/firmOverlay', () => ({
  saveFirmConfig: jest.fn(),
  deleteFirmConfigsByPrefix: jest.fn()
}))
jest.mock('../../server/utils/templateLibrary', () => ({ loadEffectiveTemplates: jest.fn() }))

const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')
const { SIGNAL_TYPES } = require('../../server/utils/signals')
const { POOL_PREFIX, guardContribution, computeAdjustments, MIN_FIRMS, MIN_CASES } = require('../../server/utils/outcomeLearning')
const { firmToken } = require('../../server/utils/outcomeConsent')
const SEED_TEMPLATES = require('../../data/templates.json')

const originalSecret = process.env.OUTCOME_POOL_SECRET
const originalEnv = process.env.NODE_ENV

beforeEach(() => {
  // The script decides at load whether it may run at all, so every test loads it fresh.
  jest.resetModules()
  process.env.OUTCOME_POOL_SECRET = 'seed-test-secret'
  process.env.NODE_ENV = 'test'
})

afterEach(() => {
  if (originalSecret === undefined) { delete process.env.OUTCOME_POOL_SECRET } else { process.env.OUTCOME_POOL_SECRET = originalSecret }
  process.env.NODE_ENV = originalEnv
})

/**
 * Load the script and the mocks it will see. After a registry reset the mocks are new
 * instances, so they are taken from the same registry the script requires from.
 */
function load (library) {
  const overlay = require('../../server/utils/firmOverlay')
  const { loadEffectiveTemplates } = require('../../server/utils/templateLibrary')
  loadEffectiveTemplates.mockResolvedValue(library === undefined ? null : library)
  overlay.saveFirmConfig.mockResolvedValue(1)
  overlay.deleteFirmConfigsByPrefix.mockResolvedValue(3)
  const script = require('../../scripts/dev/seed-outcome-pool')
  return { overlay, script }
}

describe('what the seed writes', () => {
  test('every row passes the guard a real review passes, and is saved at the platform scope by a constant', async () => {
    const { overlay, script } = load()
    const result = await script.seed()
    expect(result.written).toBe(31)
    expect(overlay.saveFirmConfig).toHaveBeenCalledTimes(31)
    const libraryTitles = SEED_TEMPLATES.map(t => t.title)
    const signalTypes = Object.values(SIGNAL_TYPES)
    overlay.saveFirmConfig.mock.calls.forEach(([scope, key, row, by]) => {
      expect(scope).toBe(PLATFORM_SCOPE)
      expect(key.startsWith(POOL_PREFIX)).toBe(true)
      expect(by).toBe(script.SEED_SAVED_BY)
      expect(by).not.toContain('@')
      expect(() => guardContribution(row, { libraryTitles, signalTypes })).not.toThrow()
    })
  })

  test('the rows put Break-Even above the floor at hold-back 4 and 7 Cash Drivers below it', async () => {
    const { overlay, script } = load()
    await script.seed()
    const pool = {}
    overlay.saveFirmConfig.mock.calls.forEach(([, key, row]) => { pool[key.slice(POOL_PREFIX.length)] = row })
    const computed = computeAdjustments(pool, {}, SEED_TEMPLATES.map(t => t.title))
    const above = computed.find(a => a.id === 'break-even|domain|profit')
    const below = computed.find(a => a.id === '7-cash-drivers|domain|profit')
    expect(above).toMatchObject({ firms: MIN_FIRMS, cases: 31, less: 12, holdBack: 4, meetsFloor: true, state: 'proposed' })
    expect(below).toMatchObject({ cases: 20, less: 5, holdBack: 3, meetsFloor: false, state: 'below_floor' })
    expect(below.cases).toBeLessThan(MIN_CASES)
  })

  test('firm A is the dev firm, so its own withdrawal takes its rows out', async () => {
    const { overlay, script } = load()
    await script.seed()
    expect(script.SEED_FIRM_IDS[0]).toBe('dev-firm')
    const devPrefix = POOL_PREFIX + firmToken('dev-firm') + ':'
    const devRows = overlay.saveFirmConfig.mock.calls.filter(([, key]) => key.startsWith(devPrefix))
    expect(devRows.length).toBeGreaterThan(0)
    // Five distinct tokens, and no key carries a firm id in clear.
    const tokens = new Set(overlay.saveFirmConfig.mock.calls.map(([, key]) => key.slice(POOL_PREFIX.length).split(':')[0]))
    expect(tokens.size).toBe(5)
    overlay.saveFirmConfig.mock.calls.forEach(([, key]) => {
      expect(key).not.toContain('dev-firm')
      expect(key).not.toContain('seed-firm')
    })
  })

  test('--reset removes exactly the seeded firms\' prefixes at the platform scope first, and nothing wider', async () => {
    const { overlay, script } = load()
    const result = await script.seed({ reset: true })
    expect(overlay.deleteFirmConfigsByPrefix).toHaveBeenCalledTimes(script.SEED_FIRM_IDS.length)
    overlay.deleteFirmConfigsByPrefix.mock.calls.forEach(([scope, prefix], i) => {
      expect(scope).toBe(PLATFORM_SCOPE)
      expect(prefix).toBe(POOL_PREFIX + firmToken(script.SEED_FIRM_IDS[i]) + ':')
    })
    expect(result.removed).toBe(15)
  })

  test('without --reset nothing is deleted', async () => {
    const { overlay, script } = load()
    await script.seed()
    expect(overlay.deleteFirmConfigsByPrefix).not.toHaveBeenCalled()
  })

  test('without the pool secret nothing is written', async () => {
    delete process.env.OUTCOME_POOL_SECRET
    const { overlay, script } = load()
    await expect(script.seed()).rejects.toThrow(/OUTCOME_POOL_SECRET/)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('a library without the two titles writes nothing, loudly', async () => {
    const { overlay, script } = load([{ title: 'Something Else' }])
    await expect(script.seed()).rejects.toThrow(/does not hold/)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })
})

describe('where the seed refuses to run', () => {
  test('NODE_ENV=production exits before requiring anything', () => {
    process.env.NODE_ENV = 'production'
    const exit = jest.spyOn(process, 'exit').mockImplementation((code) => { throw new Error('exit ' + code) })
    const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true)
    expect(() => require('../../scripts/dev/seed-outcome-pool')).toThrow('exit 1')
    expect(stderr.mock.calls[0][0]).toMatch(/refusing to run/)
    exit.mockRestore()
    stderr.mockRestore()
  })
})
