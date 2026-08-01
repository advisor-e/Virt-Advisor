'use strict'

const { resolveInheritedRows, DEFAULT_SOURCE_LABELS } = require('../../server/utils/resolveInheritedRows')

// Deliberately NOT distinction rows. The mechanism is block-agnostic, so it is proved
// against a block that does not exist yet: rows that carry an id and some fields.
const INHERITED = [
  { id: 'r-1', name: 'First', detail: 'one', weight: 1 },
  { id: 'r-2', name: 'Second', detail: 'two', weight: 2 },
  { id: 'r-3', name: 'Third', detail: 'three', weight: 3 }
]

const ownRow = (over = {}) => ({ id: 'own-1', name: 'Ours', detail: 'added here', weight: 9, ...over })

describe('resolveInheritedRows', () => {
  describe('nothing changed at this level', () => {
    it('returns every inherited row, in order, tagged as inherited', () => {
      const out = resolveInheritedRows(INHERITED, undefined)
      expect(out.map(r => r.id)).toEqual(['r-1', 'r-2', 'r-3'])
      expect(out.every(r => r.source === DEFAULT_SOURCE_LABELS.inherited)).toBe(true)
    })

    it('does not mutate the inputs', () => {
      const rowsBefore = JSON.parse(JSON.stringify(INHERITED))
      const state = { overrides: { 'r-1': { weight: 20 } }, ownRows: [ownRow()], declinedIds: ['r-2'] }
      const stateBefore = JSON.parse(JSON.stringify(state))
      resolveInheritedRows(INHERITED, state)
      expect(INHERITED).toEqual(rowsBefore)
      expect(state).toEqual(stateBefore)
    })
  })

  describe('source labels', () => {
    it('uses the caller vocabulary when one is supplied', () => {
      const labels = { inherited: 'mentor', override: 'group-edit', own: 'group-own' }
      const out = resolveInheritedRows(INHERITED, {
        overrides: { 'r-2': { weight: 5 } },
        ownRows: [ownRow()]
      }, { sourceLabels: labels })
      expect(out.map(r => r.source)).toEqual(['mentor', 'group-edit', 'mentor', 'group-own'])
    })
  })

  describe('decline', () => {
    it('removes a declined row and keeps the rest in order', () => {
      const out = resolveInheritedRows(INHERITED, { declinedIds: ['r-2'] })
      expect(out.map(r => r.id)).toEqual(['r-1', 'r-3'])
    })

    it('ignores a decline of an id that no longer exists above', () => {
      const out = resolveInheritedRows(INHERITED, { declinedIds: ['r-999'] })
      expect(out.map(r => r.id)).toEqual(['r-1', 'r-2', 'r-3'])
    })
  })

  describe('override', () => {
    it('replaces the inherited row — it appears exactly once', () => {
      const out = resolveInheritedRows(INHERITED, { overrides: { 'r-1': { weight: 12, name: 'Renamed' } } })
      const matches = out.filter(r => r.id === 'r-1')
      // Exactly one row: the inherited original is NOT also emitted, so anything an
      // engine scores per row cannot be counted twice.
      expect(matches).toHaveLength(1)
      expect(matches[0].weight).toBe(12)
      expect(matches[0].name).toBe('Renamed')
      expect(matches[0].source).toBe(DEFAULT_SOURCE_LABELS.override)
      expect(matches[0].overridesId).toBe('r-1')
    })

    it('keeps the inherited fields the override did not touch', () => {
      const out = resolveInheritedRows(INHERITED, { overrides: { 'r-1': { weight: 9 } } })
      const row = out.find(r => r.id === 'r-1')
      expect(row.detail).toBe('one') // untouched
      expect(row.weight).toBe(9) // changed here
    })

    // IDENTITY IS NOT EDITABLE. Stored state is the untrusted side of this boundary: if
    // an override could rewrite the id, a level could re-point its edit at a different
    // inherited row, and every later "has the level above changed this row?" comparison
    // would be asking about the wrong row.
    it('never lets an override change the row id', () => {
      const out = resolveInheritedRows(INHERITED, { overrides: { 'r-1': { id: 'hacked', weight: 9 } } })
      expect(out.find(r => r.source === DEFAULT_SOURCE_LABELS.override).id).toBe('r-1')
      expect(out.some(r => r.id === 'hacked')).toBe(false)
    })

    // NO PHANTOM ROWS. An override is a modification of something inherited, never a
    // way to introduce one — otherwise stored state could conjure a row the level above
    // does not have (and adding a row of your own is what ownRows is for).
    it('ignores an override keyed to an id that is not inherited', () => {
      const out = resolveInheritedRows(INHERITED, { overrides: { 'r-999': { weight: 9 } } })
      expect(out.map(r => r.id)).toEqual(['r-1', 'r-2', 'r-3'])
      expect(out.every(r => r.source === DEFAULT_SOURCE_LABELS.inherited)).toBe(true)
    })
  })

  describe('own rows', () => {
    it('appends this level own rows after the inherited ones', () => {
      const out = resolveInheritedRows(INHERITED, { ownRows: [ownRow()] })
      expect(out).toHaveLength(4)
      expect(out[3].source).toBe(DEFAULT_SOURCE_LABELS.own)
      expect(out[3].id).toBe('own-1')
    })

    it('accepts an own-row id of a different type from the inherited ids', () => {
      // Distinctions numbers its firm-own rows while platform rows are pd-N strings;
      // the mechanism must not assume one id type.
      const out = resolveInheritedRows(INHERITED, { ownRows: [ownRow({ id: 1 })] })
      expect(out[3].id).toBe(1)
    })

    it('skips an own row with no id', () => {
      const out = resolveInheritedRows(INHERITED, { ownRows: [{ name: 'no id' }, ownRow()] })
      expect(out.map(r => r.id)).toEqual(['r-1', 'r-2', 'r-3', 'own-1'])
    })
  })

  describe('precedence and combinations', () => {
    it('a decline beats an override of the same id', () => {
      const out = resolveInheritedRows(INHERITED, {
        declinedIds: ['r-1'],
        overrides: { 'r-1': { weight: 20 } }
      })
      expect(out.some(r => r.id === 'r-1')).toBe(false)
    })

    it('resolves declines, overrides and own rows together', () => {
      const out = resolveInheritedRows(INHERITED, {
        declinedIds: ['r-2'],
        overrides: { 'r-3': { weight: 15 } },
        ownRows: [ownRow()]
      })
      expect(out.map(r => `${r.id}:${r.source}`)).toEqual([
        'r-1:platform',
        'r-3:firm-override',
        'own-1:firm-own'
      ])
      expect(out.find(r => r.id === 'r-3').weight).toBe(15)
    })
  })

  describe('defensive handling', () => {
    it('returns [] when there are no inherited rows', () => {
      expect(resolveInheritedRows(undefined, undefined)).toEqual([])
      expect(resolveInheritedRows(null, { ownRows: [] })).toEqual([])
    })

    it('tolerates malformed state fields without throwing', () => {
      const out = resolveInheritedRows(INHERITED, { declinedIds: 'nope', overrides: [], ownRows: 'x' })
      expect(out.map(r => r.id)).toEqual(['r-1', 'r-2', 'r-3'])
    })

    it('ignores a null or array override value and emits the inherited row unchanged', () => {
      const out = resolveInheritedRows(INHERITED, { overrides: { 'r-1': null, 'r-2': ['bad'] } })
      expect(out.find(r => r.id === 'r-1').source).toBe(DEFAULT_SOURCE_LABELS.inherited)
      expect(out.find(r => r.id === 'r-2').source).toBe(DEFAULT_SOURCE_LABELS.inherited)
    })

    it('skips inherited rows with no id', () => {
      const out = resolveInheritedRows([{ name: 'anonymous' }, INHERITED[0]], undefined)
      expect(out.map(r => r.id)).toEqual(['r-1'])
    })

    // A row id of 0 is a real id. The absence check is explicitly null/undefined rather
    // than falsiness, so a block that numbers its rows from zero is not silently dropped.
    it('keeps a row whose id is 0, and can decline and override it', () => {
      const rows = [{ id: 0, name: 'Zero' }, { id: 1, name: 'One' }]
      expect(resolveInheritedRows(rows, undefined).map(r => r.id)).toEqual([0, 1])
      expect(resolveInheritedRows(rows, { declinedIds: [0] }).map(r => r.id)).toEqual([1])
      const overridden = resolveInheritedRows(rows, { overrides: { 0: { name: 'Edited' } } })
      expect(overridden[0].name).toBe('Edited')
      expect(overridden[0].source).toBe(DEFAULT_SOURCE_LABELS.override)
    })
  })
})
