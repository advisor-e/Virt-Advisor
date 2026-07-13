'use strict'

// Exercises clientStore's DEV/TEST-ONLY JSON fallback and its pure helpers.
// Locks the design guarantees from 2026-07-14:
//   - the NAME is a label, not the key (rename keeps the id → history survives)
//   - name_key normalisation collapses punctuation/case/diacritic variants
//   - findSimilar catches near-duplicates for the "did you mean…?" check
//   - the register is firm-scoped (and getById is the IDOR guard)
//
// Uses an ISOLATED temp dev file (via CLIENT_DEV_FILE) — hermetic, same
// convention as caseStore.devfallback.test.js.

process.env.NODE_ENV = 'development'

const fs = require('fs')
const path = require('path')
const os = require('os')

// Set BEFORE requiring clientStore — DEV_CLIENTS_FILE is resolved at module load.
const DEV_FILE = path.join(os.tmpdir(), `va-test-dev-clients-${process.pid}.json`)
process.env.CLIENT_DEV_FILE = DEV_FILE

// DB always rejects → forces the dev fallback path.
jest.mock('../../server/utils/db', () => ({
  execute: jest.fn(() => Promise.reject(new Error('no db in this test')))
}))

const clientStore = require('../../server/utils/clientStore')

function clean () { try { fs.unlinkSync(DEV_FILE) } catch (e) { /* not there — fine */ } }

beforeEach(clean)
afterAll(clean)

describe('normaliseNameKey — the duplicate-detection key', () => {
  test.each([
    ['Vanoss Scaffolding Ltd.', 'vanossscaffoldingltd'],
    ['vanoss-scaffolding ltd', 'vanossscaffoldingltd'],
    ['VANOSS   SCAFFOLDING, LTD', 'vanossscaffoldingltd'],
    ['Café Río', 'caferio'], // diacritics stripped
    ['Smith & Sons (Plumbing)', 'smithsonsplumbing'],
    ['', ''],
    [null, '']
  ])('%s → %s', (input, expected) => {
    expect(clientStore.normaliseNameKey(input)).toBe(expected)
  })
})

describe('findSimilar — the "did you mean…?" check (pure)', () => {
  const register = [
    { id: 'c1', name: 'Vanoss Scaffolding', nameKey: 'vanossscaffolding' },
    { id: 'c2', name: 'Kirkby Joinery', nameKey: 'kirkbyjoinery' },
    { id: 'c3', name: 'AB', nameKey: 'ab' }
  ]

  test('an exact variant matches (punctuation/case differences)', () => {
    const hits = clientStore.findSimilar(register, 'vanoss-scaffolding')
    expect(hits.map(c => c.id)).toEqual(['c1'])
  })

  test('a shortened form matches ("Vanoss" → "Vanoss Scaffolding")', () => {
    const hits = clientStore.findSimilar(register, 'Vanoss')
    expect(hits.map(c => c.id)).toEqual(['c1'])
  })

  test('an extended form matches ("Vanoss Scaffolding Ltd" → existing record)', () => {
    const hits = clientStore.findSimilar(register, 'Vanoss Scaffolding Ltd')
    expect(hits.map(c => c.id)).toEqual(['c1'])
  })

  test('an unrelated name matches nothing', () => {
    expect(clientStore.findSimilar(register, "Dave's Bakery")).toEqual([])
  })

  test('very short keys only match exactly (no false flags across the register)', () => {
    expect(clientStore.findSimilar(register, 'AB').map(c => c.id)).toEqual(['c3'])
    // "Ka" is a substring of nothing and too short to fuzzy-match anything.
    expect(clientStore.findSimilar(register, 'Ka')).toEqual([])
  })
})

describe('clientStore dev fallback', () => {
  test('create then list round-trips, alphabetical', async () => {
    await clientStore.create({ firmId: 'f1', name: 'Zebra Ltd', createdBy: 'a1' })
    await clientStore.create({ firmId: 'f1', name: 'Acme Co', createdBy: 'a1' })

    const list = await clientStore.listForFirm('f1')
    expect(list.map(c => c.name)).toEqual(['Acme Co', 'Zebra Ltd'])
    expect(list[0].nameKey).toBe('acmeco')
  })

  test('the register is firm-scoped — firm B never sees firm A clients', async () => {
    await clientStore.create({ firmId: 'f1', name: 'Vanoss Scaffolding', createdBy: 'a1' })
    expect(await clientStore.listForFirm('f-other')).toHaveLength(0)
  })

  test('getById is the IDOR guard — a real id under the WRONG firm returns null', async () => {
    const saved = await clientStore.create({ firmId: 'f1', name: 'Vanoss Scaffolding', createdBy: 'a1' })
    expect(await clientStore.getById(saved.id, 'f1')).not.toBeNull()
    expect(await clientStore.getById(saved.id, 'f-attacker')).toBeNull()
  })

  test('rename changes the label but keeps the id — history survives a rebrand', async () => {
    const saved = await clientStore.create({ firmId: 'f1', name: 'Vanoss', createdBy: 'a1' })
    const ok = await clientStore.rename(saved.id, 'f1', 'Vanoss Scaffolding Group')
    expect(ok).toBe(true)

    const after = await clientStore.getById(saved.id, 'f1')
    expect(after.id).toBe(saved.id) // identity unchanged
    expect(after.name).toBe('Vanoss Scaffolding Group')
    expect(after.nameKey).toBe('vanossscaffoldinggroup')
  })

  test('rename is firm-scoped — another firm cannot rename the client', async () => {
    const saved = await clientStore.create({ firmId: 'f1', name: 'Vanoss', createdBy: 'a1' })
    expect(await clientStore.rename(saved.id, 'f-attacker', 'Hijacked')).toBe(false)
    expect((await clientStore.getById(saved.id, 'f1')).name).toBe('Vanoss')
  })

  test('a blank name is rejected on create and ignored on rename', async () => {
    await expect(clientStore.create({ firmId: 'f1', name: '   ', createdBy: 'a1' })).rejects.toThrow(/required/)
    const saved = await clientStore.create({ firmId: 'f1', name: 'Vanoss', createdBy: 'a1' })
    expect(await clientStore.rename(saved.id, 'f1', '  ')).toBe(false)
  })

  test('rejects a duplicate id (mirrors the DB primary key)', async () => {
    await clientStore.create({ id: 'dup', firmId: 'f1', name: 'One', createdBy: 'a1' })
    await expect(
      clientStore.create({ id: 'dup', firmId: 'f1', name: 'Two', createdBy: 'a1' })
    ).rejects.toThrow(/duplicate/)
  })
})
