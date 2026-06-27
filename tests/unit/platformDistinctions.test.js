'use strict'

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

  it('every seed row carries a stable string id (cascade prerequisite)', () => {
    for (const row of SEED_PLATFORM_ROWS) {
      expect(typeof row.id).toBe('string')
      expect(row.id).toMatch(/^pd-\d+$/)
    }
  })
})
