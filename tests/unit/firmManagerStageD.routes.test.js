'use strict'

// Stage D — mentor delete → "keep theirs" cross-firm promotion.
// promoteOverridesForDeletedRow: every firm that OVERRODE the deleted master row keeps
// its version as a standalone firm-own row (with the master's domain), and its override +
// drift baseline are dropped. firmOverlay is mocked STATEFULLY (a save is visible to the
// next load) with listFirmIdsWithConfigKey controllable so we choose which firms override.

jest.mock('../../server/utils/firmOverlay', () => {
  const store = {}
  const k = (firmId, key) => `${firmId}::${key}`
  return {
    loadFirmConfig: jest.fn((firmId, key) => {
      const v = store[k(firmId, key)]
      return Promise.resolve(v === undefined ? null : v)
    }),
    saveFirmConfig: jest.fn((firmId, key, value) => { store[k(firmId, key)] = value; return Promise.resolve(1) }),
    listFirmIdsWithConfigKey: jest.fn(() => Promise.resolve([])),
    __store: store,
    __reset: () => { for (const kk of Object.keys(store)) { delete store[kk] } }
  }
})

const overlay = require('../../server/utils/firmOverlay')
const { promoteOverridesForDeletedRow } = require('../../server/routes/firmManager')

const OWN = f => `${f}::advisory-distinctions`
const OVR = f => `${f}::distinction-overrides`
const BASE = f => `${f}::distinction-override-baselines`
const DECL = f => `${f}::distinction-declines`

const DELETED = { id: 'pd-5', domain: 'profit', description: 'Master desc', triggers: ['m1', 'm2'], templates: ['MasterT'], boost: 5 }

beforeEach(() => {
  overlay.__reset()
  overlay.listFirmIdsWithConfigKey.mockResolvedValue([])
})

describe('promoteOverridesForDeletedRow — keep theirs', () => {
  test('a customising firm keeps its version as a firm-own row; override + baseline dropped', async () => {
    overlay.__store[OVR('f1')] = { 'pd-5': { description: 'Firm desc', boost: 9 } }
    overlay.__store[BASE('f1')] = { 'pd-5': 'some-old-signature' }
    overlay.listFirmIdsWithConfigKey.mockResolvedValue(['f1'])

    const result = await promoteOverridesForDeletedRow(DELETED, 'mentor@x')

    expect(result.promoted).toEqual(['f1'])
    const own = overlay.__store[OWN('f1')]
    expect(own).toHaveLength(1)
    const kept = own[0]
    expect(kept.domain).toBe('profit') // the MASTER's domain
    expect(kept.description).toBe('Firm desc') // override wins
    expect(kept.boost).toBe(9) // override wins
    expect(kept.triggers).toEqual(['m1', 'm2']) // unedited field carried from master
    expect(kept.templates).toEqual(['MasterT'])
    expect(kept.movedFrom).toBe('pd-5')
    expect(kept.keptOnMentorDelete).toBe(true)
    // override + baseline for pd-5 are gone
    expect(overlay.__store[OVR('f1')]['pd-5']).toBeUndefined()
    expect(overlay.__store[BASE('f1')]['pd-5']).toBeUndefined()
  })

  test('a firm that did NOT override the row is never touched (not enumerated)', async () => {
    overlay.__store[DECL('f2')] = ['pd-5'] // f2 only declined — no override
    overlay.listFirmIdsWithConfigKey.mockResolvedValue([]) // enumeration finds no overriding firm

    const result = await promoteOverridesForDeletedRow(DELETED, 'mentor@x')

    expect(result.promoted).toEqual([])
    expect(overlay.__store[OWN('f2')]).toBeUndefined() // no firm-own row created
    expect(overlay.__store[DECL('f2')]).toEqual(['pd-5']) // decline left as-is (inert)
  })

  test('idempotent: a firm that already has a copy (prior Move) is not duplicated; override still dropped', async () => {
    overlay.__store[OWN('f1')] = [{ id: 1, domain: 'profit', description: 'Existing copy', triggers: ['x'], templates: ['T'], boost: 7, movedFrom: 'pd-5' }]
    overlay.__store[OVR('f1')] = { 'pd-5': { description: 'Firm desc' } }
    overlay.listFirmIdsWithConfigKey.mockResolvedValue(['f1'])

    const result = await promoteOverridesForDeletedRow(DELETED, 'mentor@x')

    expect(result.promoted).toEqual([]) // no new row
    expect(overlay.__store[OWN('f1')]).toHaveLength(1) // unchanged
    expect(overlay.__store[OVR('f1')]['pd-5']).toBeUndefined() // override still cleared
  })

  test('promotes across multiple firms; appends a new id alongside existing own rows', async () => {
    overlay.__store[OWN('f1')] = [{ id: 3, domain: 'staff', description: 'unrelated own row', triggers: ['y'], templates: ['T'], boost: 5 }]
    overlay.__store[OVR('f1')] = { 'pd-5': { boost: 12 } }
    overlay.__store[OVR('fA')] = { 'pd-5': { description: 'Firm A wording' } }
    overlay.listFirmIdsWithConfigKey.mockResolvedValue(['f1', 'fA'])

    const result = await promoteOverridesForDeletedRow(DELETED, 'mentor@x')

    expect(result.promoted.sort()).toEqual(['f1', 'fA'])
    // f1: new row id = max(3)+1 = 4; boost overridden to 12; description from master
    const f1own = overlay.__store[OWN('f1')]
    expect(f1own).toHaveLength(2)
    const f1kept = f1own.find(r => r.movedFrom === 'pd-5')
    expect(f1kept.id).toBe(4)
    expect(f1kept.boost).toBe(12)
    expect(f1kept.description).toBe('Master desc')
    // fA: first own row id = 1; description overridden
    const fAkept = overlay.__store[OWN('fA')].find(r => r.movedFrom === 'pd-5')
    expect(fAkept.id).toBe(1)
    expect(fAkept.description).toBe('Firm A wording')
  })

  test('no id / no firms → no-op', async () => {
    expect(await promoteOverridesForDeletedRow({}, 'x')).toEqual({ promoted: [] })
    expect(await promoteOverridesForDeletedRow(DELETED, 'x')).toEqual({ promoted: [] })
  })
})
