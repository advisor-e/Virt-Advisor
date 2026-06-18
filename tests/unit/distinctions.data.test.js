'use strict'

// Platform advisory distinctions carry a stable string `id` (pd-N). These IDs are
// IDENTITY — once assigned they must never change or be reused, because the firm
// override/decline cascade (DISTINCTIONS-CASCADE-PLAN.md, Stages 1–2) keys a firm's
// edited/declined version to the specific platform id it replaces. A duplicate or
// missing id would let a firm override silently target the wrong row, so these
// invariants are asserted as a guard against future edits to the data file.
const distinctions = require('../../data/advisory-distinctions.json')

describe('advisory-distinctions.json — platform row IDs', () => {
  const rows = distinctions.platform

  it('platform is a non-empty array', () => {
    expect(Array.isArray(rows)).toBe(true)
    expect(rows.length).toBeGreaterThan(0)
  })

  it('every platform row has a non-empty string id', () => {
    const missing = rows.filter(r => typeof r.id !== 'string' || r.id.trim() === '')
    expect(missing).toEqual([])
  })

  it('every id matches the pd-N scheme', () => {
    const bad = rows.filter(r => !/^pd-\d+$/.test(r.id))
    expect(bad.map(r => r.id)).toEqual([])
  })

  it('ids are unique across all platform rows', () => {
    const ids = rows.map(r => r.id)
    const seen = new Set(ids)
    expect(seen.size).toBe(ids.length)
  })
})
