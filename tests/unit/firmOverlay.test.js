'use strict'

// Set env vars before any require so config/integration.js picks them up
process.env.JWT_SECRET = 'test-secret'
process.env.MYSQL_DATABASE = 'virt_advisor_test'
process.env.MYSQL_PASSWORD = 'test'

// Mock the DB pool so no real MySQL connection is needed
jest.mock('../../server/utils/db', () => ({
  execute: jest.fn(),
  getConnection: jest.fn()
}))

const db = require('../../server/utils/db')
const {
  deepMerge,
  loadFirmConfig,
  saveFirmConfig,
  getVersionHistory
} = require('../../server/utils/firmOverlay')

// ── deepMerge (pure function — no mocks needed) ───────────────────────────────

describe('deepMerge', () => {
  test('returns override when base is a primitive', () => {
    expect(deepMerge('base-string', { a: 1 })).toEqual({ a: 1 })
  })

  test('returns override when override is a primitive', () => {
    expect(deepMerge({ a: 1 }, 'override')).toBe('override')
  })

  test('returns null when override is null', () => {
    expect(deepMerge({ a: 1 }, null)).toBeNull()
  })

  test('merges top-level keys — override wins on conflict', () => {
    const result = deepMerge({ a: 1, b: 2 }, { b: 99, c: 3 })
    expect(result).toEqual({ a: 1, b: 99, c: 3 })
  })

  test('adds new keys from override that do not exist in base', () => {
    const result = deepMerge({ a: 1 }, { b: 2 })
    expect(result.a).toBe(1)
    expect(result.b).toBe(2)
  })

  test('does not delete base keys absent from override', () => {
    const result = deepMerge({ a: 1, b: 2, c: 3 }, { c: 30 })
    expect(result.a).toBe(1)
    expect(result.b).toBe(2)
    expect(result.c).toBe(30)
  })

  test('recursively merges nested objects', () => {
    const base = { rules: { minTier: 1, maxResults: 5, active: true } }
    const override = { rules: { maxResults: 10 } }
    expect(deepMerge(base, override)).toEqual({
      rules: { minTier: 1, maxResults: 10, active: true }
    })
  })

  test('replaces arrays wholesale — does not merge element-by-element', () => {
    const base = { tags: ['a', 'b', 'c'] }
    const override = { tags: ['x'] }
    expect(deepMerge(base, override)).toEqual({ tags: ['x'] })
  })

  test('treats override array as full replacement even if base value is an object', () => {
    const base = { config: { key: 'val' } }
    const override = { config: ['item1', 'item2'] }
    expect(deepMerge(base, override)).toEqual({ config: ['item1', 'item2'] })
  })

  test('handles deeply nested structures', () => {
    const base = { a: { b: { c: { d: 1, e: 2 } } } }
    const override = { a: { b: { c: { d: 99 } } } }
    expect(deepMerge(base, override)).toEqual({ a: { b: { c: { d: 99, e: 2 } } } })
  })

  test('does not mutate the base object', () => {
    const base = { a: 1 }
    const override = { a: 2 }
    deepMerge(base, override)
    expect(base.a).toBe(1)
  })
})

// ── loadFirmConfig (DB-mocked) ────────────────────────────────────────────────

describe('loadFirmConfig', () => {
  beforeEach(() => jest.clearAllMocks())

  test('returns null when no matching row found', async () => {
    db.execute.mockResolvedValue([[]])
    const result = await loadFirmConfig('firm-123', 'recommendation-rules')
    expect(result).toBeNull()
  })

  test('returns parsed config object when row found', async () => {
    db.execute.mockResolvedValue([[{ config_json: '{"minTier":2,"maxResults":8}' }]])
    const result = await loadFirmConfig('firm-123', 'recommendation-rules')
    expect(result).toEqual({ minTier: 2, maxResults: 8 })
  })

  test('returns null when config_json is malformed JSON', async () => {
    db.execute.mockResolvedValue([[{ config_json: 'not valid json {{{' }]])
    const result = await loadFirmConfig('firm-123', 'recommendation-rules')
    expect(result).toBeNull()
  })

  test('passes firmId and configKey as query parameters', async () => {
    db.execute.mockResolvedValue([[]])
    await loadFirmConfig('firm-abc', 'domain-weights')
    const [, params] = db.execute.mock.calls[0]
    expect(params).toContain('firm-abc')
    expect(params).toContain('domain-weights')
  })
})

// ── getVersionHistory (DB-mocked) ─────────────────────────────────────────────

describe('getVersionHistory', () => {
  beforeEach(() => jest.clearAllMocks())

  test('returns rows from the DB', async () => {
    const mockRows = [
      { id: 3, version: 3, is_active: 1, saved_by: 'user@test.com', created_at: '2026-01-03' },
      { id: 2, version: 2, is_active: 0, saved_by: 'user@test.com', created_at: '2026-01-02' }
    ]
    db.execute.mockResolvedValue([mockRows])
    const result = await getVersionHistory('firm-123', 'recommendation-rules')
    expect(result).toHaveLength(2)
    expect(result[0].version).toBe(3)
  })

  test('returns empty array when no history exists', async () => {
    db.execute.mockResolvedValue([[]])
    const result = await getVersionHistory('firm-123', 'new-key')
    expect(result).toEqual([])
  })

  test('scopes query to firmId and configKey', async () => {
    db.execute.mockResolvedValue([[]])
    await getVersionHistory('firm-xyz', 'capability-tiers')
    const [, params] = db.execute.mock.calls[0]
    expect(params).toContain('firm-xyz')
    expect(params).toContain('capability-tiers')
  })
})

// ── saveFirmConfig (DB-mocked with transaction) ────────────────────────────────

describe('saveFirmConfig', () => {
  let mockConn

  beforeEach(() => {
    jest.clearAllMocks()
    mockConn = {
      execute: jest.fn(),
      beginTransaction: jest.fn().mockResolvedValue(),
      commit: jest.fn().mockResolvedValue(),
      rollback: jest.fn().mockResolvedValue(),
      release: jest.fn()
    }
    db.getConnection.mockResolvedValue(mockConn)
  })

  test('deactivates previous versions before inserting new one', async () => {
    mockConn.execute
      .mockResolvedValueOnce([]) // UPDATE is_active = 0
      .mockResolvedValueOnce([[{ next_version: 2 }]]) // SELECT next version
      .mockResolvedValueOnce([{ insertId: 10 }]) // INSERT new version
      .mockResolvedValueOnce([[{ row_count: 2 }]]) // SELECT count → under limit, no prune

    await saveFirmConfig('firm-1', 'recommendation-rules', { key: 'val' }, 'user@test.com')

    const updateCall = mockConn.execute.mock.calls[0]
    expect(updateCall[0]).toContain('is_active = 0')
    expect(updateCall[1]).toContain('firm-1')
  })

  test('returns the new version number', async () => {
    mockConn.execute
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([[{ next_version: 3 }]])
      .mockResolvedValueOnce([{ insertId: 11 }])
      .mockResolvedValueOnce([[{ row_count: 3 }]]) // count under limit, no prune

    const version = await saveFirmConfig('firm-1', 'key', { data: true }, 'user@test.com')
    expect(version).toBe(3)
  })

  test('commits the transaction on success', async () => {
    mockConn.execute
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([[{ next_version: 1 }]])
      .mockResolvedValueOnce([{ insertId: 1 }])
      .mockResolvedValueOnce([[{ row_count: 1 }]]) // count under limit, no prune

    await saveFirmConfig('firm-1', 'key', {}, 'user@test.com')
    expect(mockConn.commit).toHaveBeenCalled()
    expect(mockConn.release).toHaveBeenCalled()
  })

  test('rolls back and rethrows on DB error', async () => {
    mockConn.execute
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('DB write failed'))

    await expect(
      saveFirmConfig('firm-1', 'key', {}, 'user@test.com')
    ).rejects.toThrow('DB write failed')

    expect(mockConn.rollback).toHaveBeenCalled()
    expect(mockConn.release).toHaveBeenCalled()
  })

  test('prunes only the excess rows — count-based, never version-number-based', async () => {
    // Long-lived config: high version number (50) but only 12 rows exist. The old bug
    // pruned nextVersion - 11 = 39 (deleting every inactive row); correct behaviour is
    // rowCount - maxVersionHistory = 12 - 10 = 2.
    mockConn.execute
      .mockResolvedValueOnce([]) // UPDATE is_active = 0
      .mockResolvedValueOnce([[{ next_version: 50 }]]) // SELECT next version (high)
      .mockResolvedValueOnce([{ insertId: 99 }]) // INSERT
      .mockResolvedValueOnce([[{ row_count: 12 }]]) // SELECT count → 12 rows
      .mockResolvedValueOnce([]) // DELETE (prune)

    await saveFirmConfig('firm-1', 'key', { data: 1 }, 'user@test.com')

    const deleteCall = mockConn.execute.mock.calls[4]
    expect(deleteCall[0]).toContain('DELETE')
    expect(deleteCall[0]).toContain('is_active = 0')
    expect(deleteCall[1]).toEqual(['firm-1', 'key', 2]) // exactly 2, not 39
  })

  test('never prunes when row count is within the limit, even at a huge version number', async () => {
    mockConn.execute
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([[{ next_version: 200 }]]) // very high version number
      .mockResolvedValueOnce([{ insertId: 5 }])
      .mockResolvedValueOnce([[{ row_count: 10 }]]) // exactly at the limit

    await saveFirmConfig('firm-1', 'key', {}, 'user@test.com')

    // No DELETE issued (4 calls only). The old bug would have pruned 189 rows here,
    // wiping the entire history.
    expect(mockConn.execute).toHaveBeenCalledTimes(4)
  })
})
