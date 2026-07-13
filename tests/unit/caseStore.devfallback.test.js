'use strict'

// Exercises caseStore's DEV/TEST-ONLY JSON fallback (reached when the DB is
// unavailable and not in production). Locks: round-trip, the duplicate-id
// rejection that mirrors the DB primary key, and the privacy scoping (a private
// case is invisible to a firm colleague; a shared one is visible).
//
// Uses an ISOLATED temp dev file (via CASE_DEV_FILE) rather than the shared
// data/dev-cases.json — so this suite is hermetic: a clean `npm test` is unaffected by
// local dev state or a live backend writing the real file concurrently. (Mocking the
// core 'fs' module is avoided because it breaks jest's own transformer.)

process.env.NODE_ENV = 'development'

const fs = require('fs')
const path = require('path')
const os = require('os')

// Set BEFORE requiring caseStore — DEV_CASES_FILE is resolved at module load.
const DEV_FILE = path.join(os.tmpdir(), `va-test-dev-cases-${process.pid}.json`)
process.env.CASE_DEV_FILE = DEV_FILE

// DB always rejects → forces the dev fallback path.
jest.mock('../../server/utils/db', () => ({
  execute: jest.fn(() => Promise.reject(new Error('no db in this test')))
}))

const caseStore = require('../../server/utils/caseStore')

function clean () { try { fs.unlinkSync(DEV_FILE) } catch (e) { /* not there — fine */ } }

const base = { advisorId: 'a1', firmId: 'f1', title: 'T', mode: 'client' }

beforeEach(clean)
afterAll(clean)

describe('caseStore dev fallback', () => {
  test('create then list round-trips through the JSON store', async () => {
    const saved = await caseStore.create({ ...base, id: 'x1', visibility: 'private' })
    expect(saved.id).toBe('x1')

    const mine = await caseStore.listForAdvisor('a1', 'f1')
    expect(mine).toHaveLength(1)
    expect(mine[0].id).toBe('x1')
  })

  test('rejects a duplicate id (mirrors the DB primary key)', async () => {
    await caseStore.create({ ...base, id: 'dup', visibility: 'private' })
    await expect(
      caseStore.create({ ...base, id: 'dup', title: 'second', visibility: 'private' })
    ).rejects.toThrow(/duplicate/)

    const mine = await caseStore.listForAdvisor('a1', 'f1')
    expect(mine).toHaveLength(1)
  })

  test('a private case is hidden from a firm colleague; a shared one is visible', async () => {
    await caseStore.create({ ...base, id: 'priv', visibility: 'private' })
    await caseStore.create({ ...base, id: 'shared', visibility: 'shared' })

    // Same firm, different advisor.
    const colleagueView = await caseStore.listForAdvisor('a2', 'f1')
    expect(colleagueView.map(c => c.id)).toEqual(['shared'])

    // The owner sees both.
    const ownerView = await caseStore.listForAdvisor('a1', 'f1')
    expect(ownerView.map(c => c.id).sort()).toEqual(['priv', 'shared'])
  })

  test('an advisor in another firm sees nothing', async () => {
    await caseStore.create({ ...base, id: 'shared', visibility: 'shared' })
    const otherFirm = await caseStore.listForAdvisor('a9', 'f-other')
    expect(otherFirm).toHaveLength(0)
  })

  test('the decision trace round-trips intact', async () => {
    const trace = {
      domain: { id: 'profitability', label: 'Profitability & Feasibility' },
      lenses: { engagementType: 'advice' },
      distinctions: { nearMisses: [{ id: 7, description: 'margin erosion', domain: 'sales' }] }
    }
    const saved = await caseStore.create({ ...base, id: 'tr1', visibility: 'shared', decisionTrace: trace })
    expect(saved.decisionTrace).toEqual(trace)

    const [listed] = await caseStore.listForAdvisor('a1', 'f1')
    expect(listed.decisionTrace).toEqual(trace)
    expect(listed.decisionTrace.distinctions.nearMisses[0].description).toBe('margin erosion')
  })

  test('a case saved without a trace has decisionTrace null', async () => {
    const saved = await caseStore.create({ ...base, id: 'notrace', visibility: 'private' })
    expect(saved.decisionTrace).toBeNull()

    const [listed] = await caseStore.listForAdvisor('a1', 'f1')
    expect(listed.decisionTrace).toBeNull()
  })

  test('listSharedForFirm returns the firm shared cases only — never private, never another firm', async () => {
    // Two advisors in firm f1, plus an unrelated firm.
    await caseStore.create({ ...base, id: 's1', advisorId: 'a1', visibility: 'shared' })
    await caseStore.create({ ...base, id: 'p1', advisorId: 'a1', visibility: 'private' })
    await caseStore.create({ ...base, id: 's2', advisorId: 'a2', visibility: 'shared' })
    await caseStore.create({ ...base, id: 'other', firmId: 'f-other', advisorId: 'a9', visibility: 'shared' })

    const review = await caseStore.listSharedForFirm('f1')
    // Both advisors' shared cases, no private, no other firm.
    expect(review.map(c => c.id).sort()).toEqual(['s1', 's2'])
  })
})

// Client-knowledge-base link (design 2026-07-14): a case may carry a clientId,
// and listForClient reuses listForAdvisor's EXACT visibility boundary — a
// client's history is built from the cases the advisor can already see.
describe('caseStore clientId + listForClient', () => {
  test('clientId round-trips; a case saved without one has clientId null', async () => {
    const withClient = await caseStore.create({ ...base, id: 'c1', visibility: 'private', clientId: 'client-9' })
    expect(withClient.clientId).toBe('client-9')

    const without = await caseStore.create({ ...base, id: 'c2', visibility: 'private' })
    expect(without.clientId).toBeNull()
  })

  test("listForClient returns only that client's cases, newest last-created first", async () => {
    await caseStore.create({ ...base, id: 'v1', visibility: 'private', clientId: 'vanoss' })
    await caseStore.create({ ...base, id: 'k1', visibility: 'private', clientId: 'kirkby' })
    await caseStore.create({ ...base, id: 'v2', visibility: 'private', clientId: 'vanoss' })

    const history = await caseStore.listForClient('a1', 'f1', 'vanoss')
    expect(history.map(c => c.id).sort()).toEqual(['v1', 'v2'])
  })

  test("a colleague sees only the SHARED slice of a client's history (the 5b rule)", async () => {
    await caseStore.create({ ...base, id: 'priv', visibility: 'private', clientId: 'vanoss' })
    await caseStore.create({ ...base, id: 'shared', visibility: 'shared', clientId: 'vanoss' })

    // Same firm, different advisor: private stays invisible.
    const colleague = await caseStore.listForClient('a2', 'f1', 'vanoss')
    expect(colleague.map(c => c.id)).toEqual(['shared'])

    // The owner sees the full history.
    const owner = await caseStore.listForClient('a1', 'f1', 'vanoss')
    expect(owner.map(c => c.id).sort()).toEqual(['priv', 'shared'])
  })

  test('another firm sees nothing of the client history, even for shared cases', async () => {
    await caseStore.create({ ...base, id: 'shared', visibility: 'shared', clientId: 'vanoss' })
    expect(await caseStore.listForClient('a9', 'f-other', 'vanoss')).toHaveLength(0)
  })

  test('unlinked cases (clientId null) never appear in any client history', async () => {
    await caseStore.create({ ...base, id: 'legacy', visibility: 'shared' }) // pre-feature case
    await caseStore.create({ ...base, id: 'linked', visibility: 'shared', clientId: 'vanoss' })

    const history = await caseStore.listForClient('a1', 'f1', 'vanoss')
    expect(history.map(c => c.id)).toEqual(['linked'])
  })
})
