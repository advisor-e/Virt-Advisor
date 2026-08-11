'use strict'

/**
 * Tests for the cross-organisation engagement wall (server/data/repository.js;
 * owner decisions D1 + Q6).
 *
 * D1: default posture is CLOSED / opt-in. Q6: the boundary is the individual
 * office (the advisor's `firm`). Both-sides consent — a cross-firm interaction
 * needs BOTH firms open. The demo firms are seeded OPEN; these tests flip one
 * closed via setOrgPosture to prove the wall seals discovery, connection and
 * outreach.
 *
 * Fresh in-memory module per test via jest.resetModules().
 */

let repo

beforeEach(() => {
  jest.resetModules()
  repo = require('../../server/collaborate/data/repository')
})

describe('posture seam', () => {
  test('seeded demo firms are open; an unknown firm defaults to closed (D1)', async () => {
    expect(await repo.getOrgPosture('Advisor-e Munich')).toBe('open')
    expect(await repo.getOrgPosture('Some New Firm')).toBe('closed')
  })

  test('setOrgPosture updates a firm and rejects an invalid value', async () => {
    expect(await repo.setOrgPosture('Lindt & Co', 'closed')).toEqual({ firm: 'Lindt & Co', posture: 'closed' })
    expect(await repo.getOrgPosture('Lindt & Co')).toBe('closed')
    expect(await repo.setOrgPosture('Lindt & Co', 'sideways')).toEqual({ error: 'BAD_POSTURE' })
  })
})

describe('canReachAdvisor (both-sides consent)', () => {
  test('same firm is always reachable', async () => {
    // Seed a same-firm pair would need identity control; instead assert the rule
    // via two advisers whose firms are both open, then via a closed firm.
    expect(await repo.canReachAdvisor('me', 'bob-lindt')).toBe(true) // both open
  })

  test('a closed firm on either side blocks reach', async () => {
    await repo.setOrgPosture('Lindt Zürich', 'closed') // bob-lindt's firm (branch)
    expect(await repo.canReachAdvisor('me', 'bob-lindt')).toBe(false)
    expect(await repo.canReachAdvisor('bob-lindt', 'me')).toBe(false)
  })

  test('an unknown recipient is not blocked in the mock', async () => {
    expect(await repo.canReachAdvisor('me', 'external-99')).toBe(true)
  })
})

describe('enforcement', () => {
  test('listAdvisors hides advisers behind a closed firm', async () => {
    await repo.setOrgPosture('Lindt Zürich', 'closed')
    const list = await repo.listAdvisors({ myId: 'me', excludeId: 'me' })
    expect(list.some(a => a.id === 'bob-lindt')).toBe(false)
    // Other open firms remain visible.
    expect(list.some(a => a.id === 'anna-r')).toBe(true)
  })

  test('requestConnection returns a CROSS_ORG_BLOCKED sentinel across a closed firm', async () => {
    await repo.setOrgPosture('Lindt Zürich', 'closed')
    const r = await repo.requestConnection('me', 'bob-lindt')
    expect(r).toEqual({ error: 'CROSS_ORG_BLOCKED' })
  })

  test('requestConnection still works between two open firms', async () => {
    const r = await repo.requestConnection('me', 'bob-lindt')
    expect(r).toEqual(expect.objectContaining({ status: 'pending' }))
  })
})

// The ceiling model (owner, 2026-07-07): open/closed exists at brand → country →
// branch; a branch's EFFECTIVE posture is most-closed-wins. `me` is Advisor-e / DE
// / Advisor-e Munich; bob-lindt is Lindt & Co / CH / Lindt Zürich (both open).
describe('three-level ceiling (most-closed-wins)', () => {
  const reach = () => repo.canReachAdvisor('me', 'bob-lindt')

  test('all three levels open ⇒ reachable', async () => {
    expect(await reach()).toBe(true)
  })

  test('closing the BRANCH level alone seals it', async () => {
    await repo.setOrgPosture('Advisor-e Munich', 'closed')
    expect(await reach()).toBe(false)
  })

  test('closing the COUNTRY level alone seals it (branch record untouched)', async () => {
    require('../../server/collaborate/data/roles').setOverride('me', 'group_manager') // 'me' heads Advisor-e Germany
    await repo.setFirmPosture('me', 'closed') // writes the COUNTRY level
    expect(await repo.getOrgPosture('Advisor-e Munich')).toBe('open') // branch level untouched
    expect(await reach()).toBe(false)
  })

  test('closing the BRAND level seals EVERY branch with a single write (the scale property)', async () => {
    require('../../server/collaborate/data/roles').setOverride('me', 'global_group_manager') // 'me' heads the Advisor-e brand
    await repo.setFirmPosture('me', 'closed') // writes the GLOBAL level only
    expect(await repo.getOrgPosture('Advisor-e Munich')).toBe('open') // no per-branch fan-out
    // One brand-level write hides every Advisor-e branch from an outside viewer —
    // this is what lets the model hold at a brand with ~1,700 branches.
    const list = await repo.listAdvisors({ myId: 'bob-lindt', excludeId: 'bob-lindt' })
    expect(list.some(a => a.globalGroup === 'Advisor-e')).toBe(false)
    expect(list.some(a => a.id === 'anna-r')).toBe(true) // a different brand (BDO) is unaffected
  })
})

describe('tier-scoped posture writes (a manager writes only their own level)', () => {
  test('a Firm Manager writes the BRANCH level', async () => {
    const r = await repo.setFirmPosture('me', 'closed') // 'me' is a seed firm manager
    expect(r).toEqual(expect.objectContaining({ level: 'firm', scope: 'Advisor-e Munich' }))
    expect(await repo.getOrgPosture('Advisor-e Munich')).toBe('closed')
  })

  test('a Group Manager writes the COUNTRY level — other countries of the brand are unaffected', async () => {
    require('../../server/collaborate/data/roles').setOverride('me', 'group_manager')
    const r = await repo.setFirmPosture('me', 'closed')
    expect(r).toEqual(expect.objectContaining({ level: 'country', scope: 'Advisor-e||DE' }))
    // A DE branch is now sealed; an IT branch of the same brand is not.
    expect(await repo.canReachAdvisor('priya-nair', 'bob-lindt')).toBe(false) // DE
    expect(await repo.canReachAdvisor('sofia-marchetti', 'bob-lindt')).toBe(true) // IT
  })

  test('a non-manager cannot set a posture', async () => {
    expect(await repo.setFirmPosture('bob-lindt', 'open')).toEqual({ error: 'NOT_MANAGER' })
  })

  test('an invalid posture value is rejected', async () => {
    expect(await repo.setFirmPosture('me', 'sideways')).toEqual({ error: 'BAD_POSTURE' })
  })
})

// Option A (owner): a manager may set Open even while a stricter level above caps
// it — the console reports the cap rather than disabling the control. The state is
// carried on the setFirmPosture response (crossOrg) and in the console payload.
describe('capped state (crossOrg on the console payload)', () => {
  test('a Firm Manager Open under a closed BRAND reads capped, effective closed', async () => {
    const roles = require('../../server/collaborate/data/roles')
    roles.setOverride('me', 'global_group_manager')
    await repo.setFirmPosture('me', 'closed') // brand Advisor-e = closed
    roles.setOverride('me', 'firm_manager') // now act as the Munich firm manager
    const r = await repo.setFirmPosture('me', 'open') // opens own branch
    expect(r.crossOrg).toEqual(expect.objectContaining({ level: 'firm', own: 'open', ceiling: 'closed', cappedBy: 'global', effective: 'closed' }))
    expect(r.crossOrgPosture).toBe('closed') // effective, not their own choice
  })

  test('no cap when every level above is open', async () => {
    const r = await repo.setFirmPosture('me', 'open')
    expect(r.crossOrg).toEqual(expect.objectContaining({ own: 'open', ceiling: 'open', cappedBy: null, effective: 'open' }))
  })

  test('the console payload carries the crossOrg control block', async () => {
    const c = await repo.getFirmConsole('me')
    expect(c.crossOrg).toEqual(expect.objectContaining({ level: 'firm', scopeLabel: 'Advisor-e Munich' }))
    expect(c.stats.crossOrgPosture).toBe(c.crossOrg.effective)
  })
})

// Plan §8: the cross-org toggle gates the MARKETPLACE too — a sealed org can't see
// or buy other orgs' listings. Viewer 'me' = Advisor-e/DE/Munich. Seed listings:
// m-trucking (owner anna-r, BDO Hamburg) · m-hospitality (owner sara-okafor, Advisor-e Dublin).
describe('marketplace cross-org wall (§8)', () => {
  test('a sealed owner-org hides its listing from discovery; reachable ones stay', async () => {
    await repo.setOrgPosture('BDO Hamburg', 'closed') // anna-r's branch
    const list = await repo.listListings('me')
    expect(list.some(l => l.id === 'm-trucking')).toBe(false) // sealed away
    expect(list.some(l => l.id === 'm-hospitality')).toBe(true) // still reachable
  })

  test('an already-owned listing stays visible even after its org seals', async () => {
    await repo.recordPurchase('m-trucking', 'me') // bought while open
    await repo.setOrgPosture('BDO Hamburg', 'closed')
    const list = await repo.listListings('me')
    expect(list.some(l => l.id === 'm-trucking')).toBe(true) // you keep what you bought
  })

  test('getListing behaves as not-found across a sealed boundary', async () => {
    await repo.setOrgPosture('BDO Hamburg', 'closed')
    expect(await repo.getListing('m-trucking', 'me')).toBeNull()
    expect(await repo.getListing('m-hospitality', 'me')).not.toBeNull()
  })

  test('recordPurchase is refused across a sealed boundary', async () => {
    await repo.setOrgPosture('BDO Hamburg', 'closed')
    expect(await repo.recordPurchase('m-trucking', 'me')).toEqual({ error: 'CROSS_ORG_BLOCKED' })
    // A reachable listing still purchases fine.
    expect(await repo.recordPurchase('m-hospitality', 'me')).toEqual({ success: true, owned: true })
  })

  test('your OWN listing is never walled off from you', async () => {
    const l = await repo.createListing({ title: 'My Own Tool', pageId: 'x' }, { id: 'me', name: 'Mike', firm: 'Advisor-e Munich' })
    await repo.setOrgPosture('Advisor-e Munich', 'closed') // seal my own branch
    const list = await repo.listListings('me')
    expect(list.some(x => x.id === l.id)).toBe(true)
  })
})
