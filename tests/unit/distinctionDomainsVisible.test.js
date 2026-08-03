'use strict'

/**
 * THE SCREEN AND THE ENGINE MUST AGREE ON WHERE A DISTINCTION CAN LIVE.
 *
 * On 2026-08-03 the Logic-Lab accept button wrote a live distinction into
 * `org-board-pack` — a domain the backend accepts (it is in data/domains.json)
 * but the Advisory Distinctions screen does not show. The row was active in the
 * engine and invisible to the firm: nothing on any screen could display,
 * correct, or delete it.
 *
 * The fix is a single source: domains a firm may file distinctions under carry
 * `distinctions: true` in data/domains.json. The accept route refuses anything
 * else (DOMAIN_NOT_VISIBLE), and this test holds the screen's own list to the
 * same flag — so the gap the write fell through cannot silently reopen when a
 * domain is added to either side.
 */

const DOMAINS = require('../../data/domains.json')
const { DISTINCTION_DOMAINS } = require('../../components/FirmManagerHub.vue')

const flagged = DOMAINS.filter(d => d.distinctions === true).map(d => d.id)

describe('distinction-visible domains — one source, two readers', () => {
  it('the Advisory Distinctions screen shows exactly the flagged domains', () => {
    const screenIds = DISTINCTION_DOMAINS.map(d => d.id)
    expect([...screenIds].sort()).toEqual([...flagged].sort())
  })

  it('every screen entry carries a human label, never a raw id', () => {
    for (const d of DISTINCTION_DOMAINS) {
      expect(typeof d.label).toBe('string')
      expect(d.label.trim().length).toBeGreaterThan(0)
      expect(d.label).not.toBe(d.id)
    }
  })

  it('the invisible domains stay invisible — org-board-pack above all', () => {
    // The specific domain the 2026-08-03 defect wrote into. If someone flags it
    // deliberately, they must also give it a screen entry; this test is the
    // reminder.
    expect(flagged).not.toContain('org-board-pack')
  })

  it('flagging is deliberate: only known ids carry the flag', () => {
    const allIds = new Set(DOMAINS.map(d => d.id))
    for (const id of flagged) {
      expect(allIds.has(id)).toBe(true)
    }
  })
})
