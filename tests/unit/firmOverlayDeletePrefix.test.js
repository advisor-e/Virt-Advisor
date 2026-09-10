'use strict'

/**
 * deleteFirmConfigsByPrefix — the ONE hard delete in an append-only store.
 *
 * Outcome Learning (specs/002-outcome-learning, T007/T008) withdraws a firm's pooled
 * contributions by deleting `outcome-pool:<token>:` at the platform scope. The danger
 * is not the delete that runs; it is the delete that runs WIDER than it was asked to.
 * These tests pin the three ways it could: an unterminated prefix, an empty prefix,
 * and a scope other than the one named.
 */

process.env.JWT_SECRET = 'test-secret'
process.env.MYSQL_DATABASE = 'virt_advisor_test'
process.env.MYSQL_PASSWORD = 'test'

jest.mock('../../server/utils/db', () => ({
  execute: jest.fn(),
  getConnection: jest.fn()
}))

const db = require('../../server/utils/db')
const { deleteFirmConfigsByPrefix } = require('../../server/utils/firmOverlay')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

beforeEach(() => {
  db.execute.mockReset()
})

describe('deleteFirmConfigsByPrefix', () => {
  test('deletes only under the given prefix at only the given scope, every version', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 3 }])

    const removed = await deleteFirmConfigsByPrefix(PLATFORM_SCOPE, 'outcome-pool:abc123:')

    expect(removed).toBe(3)
    expect(db.execute).toHaveBeenCalledTimes(1)
    const [sql, params] = db.execute.mock.calls[0]
    expect(sql).toMatch(/^\s*DELETE FROM firm_framework_versions/)
    expect(sql).toMatch(/firm_id = \?/)
    expect(sql).toMatch(/config_key LIKE \?/)
    // Every version goes: no is_active filter, or history would survive the withdrawal.
    expect(sql).not.toMatch(/is_active/)
    expect(params).toEqual([PLATFORM_SCOPE, 'outcome-pool:abc123:%'])
  })

  test('escapes LIKE wildcards inside the prefix so it cannot widen', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 0 }])

    await deleteFirmConfigsByPrefix('firm-1', 'a%b_c:')

    const [sql, params] = db.execute.mock.calls[0]
    expect(sql).toMatch(/ESCAPE/)
    expect(params[1]).toBe('a\\%b\\_c:%')
  })

  test('refuses an empty prefix before touching the database', async () => {
    await expect(deleteFirmConfigsByPrefix('firm-1', '')).rejects.toThrow(/non-empty/)
    await expect(deleteFirmConfigsByPrefix('firm-1', undefined)).rejects.toThrow(/non-empty/)
    await expect(deleteFirmConfigsByPrefix('firm-1', null)).rejects.toThrow(/non-empty/)
    expect(db.execute).not.toHaveBeenCalled()
  })

  test('refuses a prefix that does not end in ":" before touching the database', async () => {
    await expect(deleteFirmConfigsByPrefix('firm-1', 'outcome-pool:abc')).rejects.toThrow(/end in ":"/)
    expect(db.execute).not.toHaveBeenCalled()
  })

  test('refuses a missing scope id before touching the database', async () => {
    await expect(deleteFirmConfigsByPrefix('', 'outcome-pool:abc:')).rejects.toThrow(/firmId/)
    await expect(deleteFirmConfigsByPrefix(undefined, 'outcome-pool:abc:')).rejects.toThrow(/firmId/)
    expect(db.execute).not.toHaveBeenCalled()
  })

  test('a database error surfaces to the caller, never swallowed', async () => {
    db.execute.mockRejectedValue(new Error('ER_LOCK_DEADLOCK'))

    await expect(deleteFirmConfigsByPrefix(PLATFORM_SCOPE, 'outcome-pool:abc:'))
      .rejects.toThrow('ER_LOCK_DEADLOCK')
  })

  test('returns zero when nothing matched', async () => {
    db.execute.mockResolvedValue([{ affectedRows: 0 }])
    expect(await deleteFirmConfigsByPrefix(PLATFORM_SCOPE, 'outcome-pool:nobody:')).toBe(0)
  })
})
