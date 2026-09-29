'use strict'

/**
 * Add Concept's two stores — item 15.20.
 *
 * WHAT UAT CANNOT SEE: that a concept added at a middle tier reaches only the firms beneath it,
 * that one malformed stored concept hides the rest, that two tiers can mint the same id, or that
 * a live database refusing a PDF sends it to a local folder instead of failing the save.
 */

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  loadFirmConfigsByPrefix: jest.fn(),
  deleteFirmConfigsByPrefix: jest.fn()
}))
jest.mock('../../server/utils/db', () => ({ getConnection: jest.fn(), execute: jest.fn() }))

const fs = require('fs')
const overlay = require('../../server/utils/firmOverlay')
const db = require('../../server/utils/db')
const ic = require('../../server/utils/importedConcepts')
const store = require('../../server/utils/conceptSourceStore')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')
const { setFirmMembership, globalScopeId, groupScopeId } = require('../../server/utils/tierChain')

const GLOBAL = globalScopeId('acme')
const GROUP = groupScopeId('acme', 'NZ')
const PAGE = { svg: '<svg/>', width: 960, height: 540, title: 'T' }
const BOX = { label: 'Values', x: 0.1, y: 0.1, w: 0.5, h: 0.3 }

function record (id, addedAt) {
  return ic.buildRecord(id, { name: 'C ' + id, planningDomain: 'organisational-review', helpsClientTo: null },
    [PAGE], PAGE, [BOX], 'm@x', new Date(addedAt || '2026-09-29T00:00:00Z'))
}

let held
beforeEach(() => {
  jest.clearAllMocks()
  held = {}
  overlay.loadFirmConfigsByPrefix.mockImplementation((scope, prefix) => {
    const out = {}
    Object.keys(held[scope] || {}).forEach((k) => { if (k.indexOf(prefix) === 0) { out[k.slice(prefix.length)] = held[scope][k] } })
    return Promise.resolve(out)
  })
  setFirmMembership({ 'firm-nz': { globalGroup: 'acme', country: 'NZ' } })
})
afterEach(() => setFirmMembership({}))

const put = (scope, r, keyId) => { held[scope] = Object.assign({}, held[scope], { ['imported-concept:' + (keyId || r.id) + ':record']: r }) }

describe('the cascade', () => {
  test('🔴 a group manager’s concept reaches the firm beneath it and not a firm outside it', async () => {
    put(PLATFORM_SCOPE, record('im-m1'))
    put(GLOBAL, record('im-x1'))
    put(GROUP, record('im-g1'))
    put('firm-nz', record('im-f1'))

    const inside = await ic.listForScope('firm-nz')
    expect(inside.map(c => [c.id, c.addedAtTier, c.here])).toEqual([
      ['im-m1', 'mentor', false],
      ['im-x1', 'global_group_manager', false],
      ['im-g1', 'group_manager', false],
      ['im-f1', 'firm_manager', true]
    ])
    expect((await ic.listForScope('firm-elsewhere')).map(c => c.id)).toEqual(['im-m1'])
  })

  test('one malformed stored concept is dropped and the rest still list', async () => {
    put(PLATFORM_SCOPE, record('im-m1'))
    put(PLATFORM_SCOPE, Object.assign(record('im-m2'), { boxes: [] }))
    // A record whose own id disagrees with the key it is stored under.
    put(PLATFORM_SCOPE, Object.assign(record('im-m3'), { id: 'im-m9' }), 'im-m3')
    expect((await ic.listForScope(PLATFORM_SCOPE)).map(c => c.id)).toEqual(['im-m1'])
  })
})

describe('ids', () => {
  test('🔴 each tier mints under its own prefix, so no two tiers can hold the same id', () => {
    expect([PLATFORM_SCOPE, GLOBAL, GROUP, 'firm-nz'].map(s => ic.nextId(s, [], 0).id)).toEqual(['im-m1', 'im-x1', 'im-g1', 'im-f1'])
  })

  test('the stored high-water mark wins over the live ids, so a removed id is not reissued', () => {
    expect(ic.nextId('firm-nz', ['im-f1'], 4).id).toBe('im-f5')
    expect(ic.nextId('firm-nz', ['im-f7'], 4).id).toBe('im-f8')
  })
})

describe('boxes', () => {
  test('a box touching the page edge is kept; one past it, or a sliver, is refused', () => {
    expect(ic.checkBoxes([{ label: 'All', x: 0, y: 0, w: 1, h: 1 }]).ok).toBe(true)
    expect(ic.checkBoxes([{ label: 'Past', x: 0.5, y: 0, w: 0.6, h: 0.2 }]).code).toBe('INVALID_BOX')
    expect(ic.checkBoxes([{ label: 'Sliver', x: 0.5, y: 0, w: 0.001, h: 0.2 }]).code).toBe('INVALID_BOX')
    expect(ic.checkBoxes([{ label: 'NaN', x: NaN, y: 0, w: 0.1, h: 0.2 }]).code).toBe('INVALID_BOX')
    expect(ic.checkBoxes([{ x: 0, y: 0, w: 0.1, h: 0.2 }]).code).toBe('INVALID_LABEL')
  })

  test('the drawn order is kept and nothing but the five fields is stored', () => {
    const out = ic.checkBoxes([Object.assign({ onclick: 'x' }, BOX), Object.assign({}, BOX, { label: 'Second' })])
    expect(out.value.map(b => b.label)).toEqual(['Values', 'Second'])
    expect(Object.keys(out.value[0]).sort()).toEqual(['h', 'label', 'w', 'x', 'y'])
  })
})

describe('the PDF store', () => {
  function connection (failOn) {
    const conn = {
      beginTransaction: jest.fn().mockResolvedValue(),
      execute: jest.fn().mockImplementation(() => (failOn ? Promise.reject(failOn) : Promise.resolve([{}]))),
      commit: jest.fn().mockResolvedValue(),
      rollback: jest.fn().mockResolvedValue(),
      release: jest.fn()
    }
    db.getConnection.mockResolvedValue(conn)
    return conn
  }
  const FILES = [
    { role: 'teaching', position: 1, filename: 'C:\\decks\\teach.pdf', bytes: Buffer.from('%PDF-a') },
    { role: 'response', position: 1, filename: 'resp\u0000.pdf', bytes: Buffer.from('%PDF-b') }
  ]

  test('writes every file in one transaction, with its fingerprint and a cleaned file name', async () => {
    const conn = connection()
    await store.saveSources('firm-a', 'im-f1', 1, FILES, 'm@x')
    expect(conn.execute).toHaveBeenCalledTimes(2)
    const params = conn.execute.mock.calls[0][1]
    expect(params.slice(0, 7)).toEqual(['firm-a', 'im-f1', 1, 'teaching', 1, 'teach.pdf', 6])
    expect(params[7]).toMatch(/^[0-9a-f]{64}$/)
    expect(conn.execute.mock.calls[1][1][5]).toBe('resp.pdf')
    expect(conn.commit).toHaveBeenCalled()
  })

  test('🔴 a live database that refuses the write throws and rolls back — nothing lands in a local folder', async () => {
    const refusal = Object.assign(new Error('ER_NET_PACKET_TOO_LARGE'), { sqlState: '08S01' })
    const conn = connection(refusal)
    const spy = jest.spyOn(fs, 'writeFileSync')
    await expect(store.saveSources('firm-a', 'im-f1', 1, FILES, 'm@x')).rejects.toBe(refusal)
    expect(conn.rollback).toHaveBeenCalled()
    expect(conn.release).toHaveBeenCalled()
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  test('a malformed file is refused before any SQL runs', async () => {
    const conn = connection()
    await expect(store.saveSources('firm-a', 'im-f1', 1, [{ role: 'appendix', position: 1, bytes: Buffer.from('x') }], 'm@x')).rejects.toThrow()
    expect(conn.execute).not.toHaveBeenCalled()
  })

  test('removal deletes by scope and concept, every version', async () => {
    db.execute.mockResolvedValue([{}])
    await store.removeForConcept('firm-a', 'im-f1')
    expect(db.execute).toHaveBeenCalledWith('DELETE FROM strategy_concept_sources WHERE firm_id = ? AND concept_id = ?', ['firm-a', 'im-f1'])
  })
})
