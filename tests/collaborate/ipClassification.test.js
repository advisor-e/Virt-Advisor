'use strict'

/**
 * Tests for the IP-ownership classification seam (server/data/ipClassification.js;
 * plan §6, T3 MVP). A catalogue tool defaults to Advisory-owned (Tier 1); the
 * demo-locked set is Tier 2 with locked=true; tierLabel maps tiers to labels.
 */

const ip = require('../../server/collaborate/data/ipClassification')

describe('classify', () => {
  test('a normal catalogue tool defaults to Advisory-owned (Tier 1), not locked', async () => {
    const r = await ip.classify('id-4466260146') // Dashboard Report — not in the locked set
    expect(r).toEqual({ tier: 1, label: 'Advisory-owned', locked: false })
  })

  test('a locked framework is Tier 2 and locked', async () => {
    const r = await ip.classify('8-profit-levers')
    expect(r).toEqual({ tier: 2, label: 'Protected (locked)', locked: true })
  })

  test('an unknown id still classifies (Advisory-owned default, not locked)', async () => {
    const r = await ip.classify('no-such-id')
    expect(r.tier).toBe(1)
    expect(r.locked).toBe(false)
  })
})

describe('tierLabel', () => {
  test('maps each tier to its label and defaults unknown tiers to Advisory-owned', () => {
    expect(ip.tierLabel(1)).toBe('Advisory-owned')
    expect(ip.tierLabel(2)).toBe('Protected (locked)')
    expect(ip.tierLabel(3)).toBe('Co-developed')
    expect(ip.tierLabel(4)).toBe('Group-owned')
    expect(ip.tierLabel(99)).toBe('Advisory-owned')
  })
})
