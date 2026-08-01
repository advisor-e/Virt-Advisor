'use strict'

/**
 * Tests for the Advisor-e template catalogue seam + its use in marketplace
 * create-validation.
 *
 * - advisoryTemplates.list(): loads the read-only snapshot, slim shape, search.
 * - advisoryTemplates.exists(): true only for real page IDs (rejects invented).
 * - templates route: GET /api/templates returns the list (optionally filtered).
 * - repository.createListing(): stores the linked pageId on the listing.
 *
 * The snapshot is real master data (design/reference/…). We assert on a couple of
 * KNOWN page IDs from it, and never modify it.
 */

const templates = require('../../server/collaborate/data/advisoryTemplates')
const route = require('../../server/collaborate/routes/templates')
const repo = require('../../server/collaborate/data/repository')

// A page ID known to exist in the snapshot (Dashboard Report, index 0).
const KNOWN_ID = 'id-4466260146'

describe('advisoryTemplates.list', () => {
  test('returns slim rows with the expected shape', async () => {
    const all = await templates.list()
    expect(Array.isArray(all)).toBe(true)
    expect(all.length).toBeGreaterThan(200)
    const row = all.find(t => t.pageId === KNOWN_ID)
    expect(row).toBeTruthy()
    expect(row).toEqual(expect.objectContaining({
      pageId: KNOWN_ID,
      title: 'Dashboard Report'
    }))
    expect(Array.isArray(row.tags)).toBe(true)
    // `purpose` is included so the listing summary can pre-fill from it.
    expect(typeof row.purpose).toBe('string')
    // …but the deeper record is never exposed.
    expect(row.cpd).toBeUndefined()
    expect(row.growth).toBeUndefined()
    expect(row.status).toBeUndefined()
  })

  test('filters by a search term over title/section/tags', async () => {
    const hits = await templates.list('dashboard')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every(t => JSON.stringify(t).toLowerCase().includes('dashboard'))).toBe(true)
    // Multi-term search is AND (every term must match).
    expect(await templates.list('zzz-nonexistent-term')).toHaveLength(0)
  })
})

describe('advisoryTemplates.exists', () => {
  test('true for a real page ID', async () => {
    expect(await templates.exists(KNOWN_ID)).toBe(true)
  })
  test('false for an invented / empty ID', async () => {
    expect(await templates.exists('id-0000000000')).toBe(false)
    expect(await templates.exists('')).toBe(false)
    expect(await templates.exists(undefined)).toBe(false)
  })
})

describe('GET /api/templates route', () => {
  test('sends 200 with the full list when no query', async () => {
    const res = { send: jest.fn() }
    await route.list({ query: {} }, res)
    const [status, body] = res.send.mock.calls[0]
    expect(status).toBe(200)
    expect(body.length).toBeGreaterThan(200)
  })

  test('applies the q filter', async () => {
    const res = { send: jest.fn() }
    await route.list({ query: { q: 'valuation' } }, res)
    const [, body] = res.send.mock.calls[0]
    expect(body.length).toBeGreaterThan(0)
    expect(body.length).toBeLessThan((await templates.list()).length)
  })

  test('enriches each row with its IP classification (tier/label/locked)', async () => {
    const res = { send: jest.fn() }
    await route.list({ query: {} }, res)
    const [, body] = res.send.mock.calls[0]
    // Every row carries the classification fields.
    expect(body.every(r => typeof r.tier === 'number' && typeof r.locked === 'boolean')).toBe(true)
    // A normal tool is Advisory-owned (Tier 1); the demo-locked framework is Tier 2 locked.
    expect(body.find(r => r.pageId === KNOWN_ID)).toEqual(expect.objectContaining({ tier: 1, locked: false }))
    const locked = body.find(r => r.pageId === '8-profit-levers')
    expect(locked).toEqual(expect.objectContaining({ tier: 2, locked: true }))
  })
})

describe('repository.createListing stores the linked pageId', () => {
  const ME = { id: 'me', name: 'Mike Barnes', firm: 'Advisor-e' }

  test('keeps the pageId on the created listing', async () => {
    const l = await repo.createListing({ title: 'Test Listing', pageId: KNOWN_ID }, ME)
    expect(l.pageId).toBe(KNOWN_ID)
    expect(l.title).toBe('Test Listing')
  })

  test('pageId is null when none supplied (route layer enforces presence)', async () => {
    const l = await repo.createListing({ title: 'No Tool Listing' }, ME)
    expect(l.pageId).toBeNull()
  })
})
