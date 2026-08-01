'use strict'

/**
 * Tests for the append-only audit trail (server/data/auditLog.js; FEAT-AUDITLOG):
 * record() appends a well-shaped entry, list() returns newest-first with optional
 * actor/action filters and a limit, and the module is append-only (no update or
 * delete is exposed).
 *
 * Fresh in-memory module per test via jest.resetModules().
 */

let audit

beforeEach(() => {
  jest.resetModules()
  audit = require('../../server/collaborate/data/auditLog')
})

describe('record', () => {
  test('appends a well-shaped entry', () => {
    const e = audit.record({ actorId: 'me', action: 'group.create', targetType: 'group', targetId: 'g1', meta: { name: 'X' } })
    expect(e).toEqual(expect.objectContaining({
      id: expect.any(String),
      at: expect.any(String),
      actorId: 'me',
      action: 'group.create',
      targetType: 'group',
      targetId: 'g1',
      meta: { name: 'X' }
    }))
    // `at` is an ISO timestamp.
    expect(new Date(e.at).toISOString()).toBe(e.at)
  })

  test('defaults a missing actor and target', () => {
    const e = audit.record({ action: 'system.event' })
    expect(e.actorId).toBe('unknown')
    expect(e.targetType).toBeNull()
    expect(e.targetId).toBeNull()
    expect(e.meta).toEqual({})
  })

  test('is append-only — exposes only record and list', () => {
    expect(Object.keys(audit).sort()).toEqual(['list', 'record'])
  })
})

describe('list', () => {
  test('returns entries newest-first', async () => {
    audit.record({ actorId: 'me', action: 'a.one' })
    audit.record({ actorId: 'me', action: 'a.two' })
    const rows = await audit.list()
    expect(rows.map(r => r.action)).toEqual(['a.two', 'a.one'])
  })

  test('filters by actor and by action', async () => {
    audit.record({ actorId: 'me', action: 'x' })
    audit.record({ actorId: 'bob', action: 'y' })
    audit.record({ actorId: 'me', action: 'y' })
    expect((await audit.list({ actorId: 'me' })).length).toBe(2)
    expect((await audit.list({ action: 'y' })).length).toBe(2)
    expect((await audit.list({ actorId: 'me', action: 'y' })).length).toBe(1)
  })

  test('caps results at the given limit', async () => {
    for (let i = 0; i < 5; i++) { audit.record({ actorId: 'me', action: 'a' + i }) }
    expect((await audit.list({ limit: 2 })).length).toBe(2)
    // A non-positive limit falls back to the default (all 5 here).
    expect((await audit.list({ limit: 0 })).length).toBe(5)
  })
})
