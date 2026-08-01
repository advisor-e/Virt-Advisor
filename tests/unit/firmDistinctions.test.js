'use strict'

const fs = require('fs')
const { loadFirmDistinctionState, CONFIG_KEYS } = require('../../server/utils/firmDistinctions')

// A loader stub that returns a value per config key (mirrors firmOverlay.loadFirmConfig).
const loaderFor = byKey => jest.fn((firmId, key) => Promise.resolve(byKey[key]))

describe('loadFirmDistinctionState', () => {
  it('returns an empty state when firmId is absent (no loader call)', async () => {
    const loader = jest.fn()
    const state = await loadFirmDistinctionState(null, loader)
    expect(state).toEqual({ ownRows: [], declinedIds: [], overrides: {} })
    expect(loader).not.toHaveBeenCalled()
  })

  it('shapes own rows, declines and overrides from the loader', async () => {
    const loader = loaderFor({
      [CONFIG_KEYS.own]: [{ id: 1, domain: 'conflict' }],
      [CONFIG_KEYS.declines]: ['pd-2', 'pd-5'],
      [CONFIG_KEYS.overrides]: { 'pd-1': { boost: 9 } }
    })
    const state = await loadFirmDistinctionState('firm-A', loader)
    expect(state).toEqual({
      ownRows: [{ id: 1, domain: 'conflict' }],
      declinedIds: ['pd-2', 'pd-5'],
      overrides: { 'pd-1': { boost: 9 } }
    })
  })

  it('defaults each part when the loader returns null/undefined', async () => {
    const loader = loaderFor({}) // every key resolves undefined
    const state = await loadFirmDistinctionState('firm-A', loader)
    expect(state).toEqual({ ownRows: [], declinedIds: [], overrides: {} })
  })

  it('coerces wrong-typed stored values to safe empties', async () => {
    const loader = loaderFor({
      [CONFIG_KEYS.own]: 'not-an-array',
      [CONFIG_KEYS.declines]: { not: 'an-array' },
      [CONFIG_KEYS.overrides]: ['not', 'an', 'object']
    })
    const state = await loadFirmDistinctionState('firm-A', loader)
    expect(state).toEqual({ ownRows: [], declinedIds: [], overrides: {} })
  })

  it('falls back to defaults when the loader rejects and no dev file matches', async () => {
    const loader = jest.fn(() => Promise.reject(new Error('no db')))
    // A firmId that does not appear in any dev-JSON map -> defaults, no throw.
    const state = await loadFirmDistinctionState('firm-not-in-any-dev-file', loader)
    expect(state).toEqual({ ownRows: [], declinedIds: [], overrides: {} })
  })

  it('production rejects on a store failure — it never reads a stand-in file', async () => {
    // The defect this closes: in production the dev-JSON fallback answered "this firm
    // has declined nothing and edited nothing", which is indistinguishable from the
    // truth, so a database outage looked deliberate. Worse, a stray dev file on the
    // server would have been served as that firm's live configuration.
    jest.resetModules()
    const prevEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      const prod = require('../../server/utils/firmDistinctions')
      // Plant a stray dev file. Only the dev paths are faked — everything else reads
      // for real, so jest's own internals are untouched (and are why this asserts on
      // the dev-file calls rather than on the spy having no calls at all).
      const realRead = fs.readFileSync
      const isDevFile = p => typeof p === 'string' && p.includes('dev-firm-distinction')
      const readSpy = jest.spyOn(fs, 'readFileSync').mockImplementation((p, ...rest) =>
        isDevFile(p) ? JSON.stringify({ 'firm-A': ['pd-1'] }) : realRead(p, ...rest))

      await expect(
        prod.loadFirmDistinctionState('firm-A', () => Promise.reject(new Error('no db')))
      ).rejects.toThrow('no db')
      expect(readSpy.mock.calls.filter(([p]) => isDevFile(p))).toHaveLength(0)

      readSpy.mockRestore()
    } finally {
      process.env.NODE_ENV = prevEnv
      jest.resetModules()
    }
  })
})
