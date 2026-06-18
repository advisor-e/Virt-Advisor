'use strict'

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
})
