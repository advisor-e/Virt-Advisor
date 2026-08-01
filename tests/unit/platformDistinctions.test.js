'use strict'

// Hermetic: the seed-fallback assertions below must NOT depend on whether a developer
// has a local dev file (data/dev-platform-distinctions.json), which exists as soon as
// any mentor edit has been made in dev. We surgically make ONLY that file's read fail,
// so _readDevRows() returns null and the loader falls back to the committed seed —
// everything else (incl. the JSON seed load) uses the real fs.
jest.mock('fs', () => {
  const actual = jest.requireActual('fs')
  return {
    ...actual,
    readFileSync: jest.fn((p, ...rest) => {
      if (typeof p === 'string' && p.includes('dev-platform-distinctions.json')) {
        throw Object.assign(new Error('ENOENT (mocked: no dev file in tests)'), { code: 'ENOENT' })
      }
      return actual.readFileSync(p, ...rest)
    })
  }
})

const {
  loadPlatformDistinctions,
  PLATFORM_SCOPE,
  PLATFORM_CONFIG_KEY,
  SEED_PLATFORM_ROWS
} = require('../../server/utils/platformDistinctions')

describe('loadPlatformDistinctions', () => {
  it('returns the committed seed when no loader is provided', async () => {
    const rows = await loadPlatformDistinctions()
    expect(rows).toBe(SEED_PLATFORM_ROWS)
    expect(Array.isArray(rows)).toBe(true)
    expect(rows.length).toBeGreaterThan(0)
  })

  it('queries the reserved global scope and key', async () => {
    const loader = jest.fn(() => Promise.resolve(null))
    await loadPlatformDistinctions(loader)
    expect(loader).toHaveBeenCalledWith(PLATFORM_SCOPE, PLATFORM_CONFIG_KEY)
  })

  it('returns the stored array when the loader has one', async () => {
    const stored = [{ id: 'pd-1', domain: 'conflict', triggers: ['x'], description: 'd', templates: ['T'], boost: 5 }]
    const loader = jest.fn(() => Promise.resolve(stored))
    const rows = await loadPlatformDistinctions(loader)
    expect(rows).toBe(stored)
  })

  it('honours a stored EMPTY array (the mentor cleared the set)', async () => {
    const loader = jest.fn(() => Promise.resolve([]))
    const rows = await loadPlatformDistinctions(loader)
    expect(rows).toEqual([])
  })

  it('falls back to the seed when the store holds null (nothing saved yet)', async () => {
    const loader = jest.fn(() => Promise.resolve(null))
    const rows = await loadPlatformDistinctions(loader)
    expect(rows).toBe(SEED_PLATFORM_ROWS)
  })

  it('falls back to the seed when the stored value is not an array', async () => {
    const loader = jest.fn(() => Promise.resolve({ not: 'an-array' }))
    const rows = await loadPlatformDistinctions(loader)
    expect(rows).toBe(SEED_PLATFORM_ROWS)
  })

  it('falls back to the seed when the loader rejects (no DB in dev)', async () => {
    const loader = jest.fn(() => Promise.reject(new Error('no db')))
    const rows = await loadPlatformDistinctions(loader)
    expect(rows).toBe(SEED_PLATFORM_ROWS)
  })

  it('production rejects a store failure instead of answering with the seed', async () => {
    // Two failures this prevents. (1) A stray dev file on a production box being
    // served as the mentor's live set. (2) The serious one: every mentor edit is a
    // read-modify-write, so answering a failed read with the seed would let one edit
    // overwrite the mentor's whole authored set with the shipped defaults. Every
    // caller already catches — the routes return a 500, the engine logs and degrades.
    const prevEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      const loader = jest.fn(() => Promise.reject(new Error('no db')))
      await expect(loadPlatformDistinctions(loader)).rejects.toThrow('no db')
    } finally {
      process.env.NODE_ENV = prevEnv
    }
  })

  it('every seed row carries a stable string id (cascade prerequisite)', () => {
    for (const row of SEED_PLATFORM_ROWS) {
      expect(typeof row.id).toBe('string')
      expect(row.id).toMatch(/^pd-\d+$/)
    }
  })
})
