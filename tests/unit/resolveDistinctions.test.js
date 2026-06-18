'use strict'

const { resolveEffectiveDistinctions } = require('../../server/utils/resolveDistinctions')

// Minimal platform set mirroring the shape of data/advisory-distinctions.json rows.
const PLATFORM = [
  { id: 'pd-1', domain: 'conflict', triggers: ['fight'], description: 'Active conflict', templates: ['Force Field Analysis'], boost: 5 },
  { id: 'pd-2', domain: 'conflict', triggers: ['dispute'], description: 'Owner dispute', templates: ['Partner Accountability'], boost: 5 },
  { id: 'pd-3', domain: 'profit', triggers: ['margins'], description: 'Thin margins', templates: ['Lite Feasibility'], boost: 5 }
]

const ownRow = (over = {}) => ({ id: 1, domain: 'conflict', triggers: ['alignment'], description: 'Owners not aligned', templates: ['Lite Strategy'], boost: 7, ...over })

describe('resolveEffectiveDistinctions', () => {
  describe('no firm changes', () => {
    it('returns every platform row, in order, tagged source=platform', () => {
      const out = resolveEffectiveDistinctions(PLATFORM, undefined)
      expect(out.map(r => r.id)).toEqual(['pd-1', 'pd-2', 'pd-3'])
      expect(out.every(r => r.source === 'platform')).toBe(true)
    })

    it('does not mutate the input rows', () => {
      const snapshot = JSON.parse(JSON.stringify(PLATFORM))
      resolveEffectiveDistinctions(PLATFORM, { overrides: { 'pd-1': { boost: 20 } } })
      expect(PLATFORM).toEqual(snapshot)
    })
  })

  describe('decline (Stage 1)', () => {
    it('removes a declined platform row and keeps the rest', () => {
      const out = resolveEffectiveDistinctions(PLATFORM, { declinedIds: ['pd-2'] })
      expect(out.map(r => r.id)).toEqual(['pd-1', 'pd-3'])
    })

    it('ignores a decline of an unknown id', () => {
      const out = resolveEffectiveDistinctions(PLATFORM, { declinedIds: ['pd-999'] })
      expect(out.map(r => r.id)).toEqual(['pd-1', 'pd-2', 'pd-3'])
    })
  })

  describe('override / edit (Stage 2)', () => {
    it('replaces the platform row with the firm version — appears exactly once', () => {
      const out = resolveEffectiveDistinctions(PLATFORM, { overrides: { 'pd-1': { boost: 12, templates: ['Custom Tool'] } } })
      const matches = out.filter(r => r.id === 'pd-1')
      // Exactly one row for pd-1 — the platform original is NOT also present, so its
      // boost cannot stack with the firm's (the core double-boost guarantee).
      expect(matches).toHaveLength(1)
      expect(matches[0].boost).toBe(12)
      expect(matches[0].templates).toEqual(['Custom Tool'])
      expect(matches[0].source).toBe('firm-override')
      expect(matches[0].overridesId).toBe('pd-1')
    })

    it('keeps the platform fields the override did not touch', () => {
      const out = resolveEffectiveDistinctions(PLATFORM, { overrides: { 'pd-1': { boost: 9 } } })
      const row = out.find(r => r.id === 'pd-1')
      expect(row.description).toBe('Active conflict') // untouched platform field
      expect(row.boost).toBe(9) // firm's change
    })

    it('never lets an override change the row id', () => {
      const out = resolveEffectiveDistinctions(PLATFORM, { overrides: { 'pd-1': { id: 'hacked', boost: 9 } } })
      expect(out.find(r => r.source === 'firm-override').id).toBe('pd-1')
      expect(out.some(r => r.id === 'hacked')).toBe(false)
    })

    it('ignores an override keyed to an unknown id (no phantom row)', () => {
      const out = resolveEffectiveDistinctions(PLATFORM, { overrides: { 'pd-999': { boost: 9 } } })
      expect(out.map(r => r.id)).toEqual(['pd-1', 'pd-2', 'pd-3'])
      expect(out.every(r => r.source === 'platform')).toBe(true)
    })
  })

  describe('firm-own rows', () => {
    it('appends own rows after the platform rows, tagged firm-own', () => {
      const out = resolveEffectiveDistinctions(PLATFORM, { ownRows: [ownRow()] })
      expect(out).toHaveLength(4)
      expect(out[3].source).toBe('firm-own')
      expect(out[3].id).toBe(1)
    })
  })

  describe('precedence and combinations', () => {
    it('decline wins over an override of the same id', () => {
      const out = resolveEffectiveDistinctions(PLATFORM, {
        declinedIds: ['pd-1'],
        overrides: { 'pd-1': { boost: 20 } }
      })
      expect(out.some(r => r.id === 'pd-1')).toBe(false)
    })

    it('resolves declines, overrides and own rows together', () => {
      const out = resolveEffectiveDistinctions(PLATFORM, {
        declinedIds: ['pd-2'],
        overrides: { 'pd-3': { boost: 15 } },
        ownRows: [ownRow()]
      })
      expect(out.map(r => `${r.id}:${r.source}`)).toEqual([
        'pd-1:platform',
        'pd-3:firm-override',
        '1:firm-own'
      ])
      expect(out.find(r => r.id === 'pd-3').boost).toBe(15)
    })
  })

  describe('defensive handling', () => {
    it('returns [] when platform rows are missing', () => {
      expect(resolveEffectiveDistinctions(undefined, undefined)).toEqual([])
      expect(resolveEffectiveDistinctions(null, { ownRows: [] })).toEqual([])
    })

    it('tolerates malformed firmState fields without throwing', () => {
      const out = resolveEffectiveDistinctions(PLATFORM, { declinedIds: 'nope', overrides: [], ownRows: 'x' })
      expect(out.map(r => r.id)).toEqual(['pd-1', 'pd-2', 'pd-3'])
    })

    it('ignores a null/array override value (emits the platform row unchanged)', () => {
      const out = resolveEffectiveDistinctions(PLATFORM, { overrides: { 'pd-1': null, 'pd-2': ['bad'] } })
      expect(out.find(r => r.id === 'pd-1').source).toBe('platform')
      expect(out.find(r => r.id === 'pd-2').source).toBe('platform')
    })

    it('skips platform rows with no id', () => {
      const out = resolveEffectiveDistinctions([{ domain: 'x', boost: 1 }, PLATFORM[0]], undefined)
      expect(out.map(r => r.id)).toEqual(['pd-1'])
    })
  })
})
