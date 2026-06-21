'use strict'

// Exercises caseStore's DEV/TEST-ONLY JSON fallback (reached when the DB is
// unavailable and not in production). Locks: round-trip, the duplicate-id
// rejection that mirrors the DB primary key, and the privacy scoping (a private
// case is invisible to a firm colleague; a shared one is visible).
//
// Uses the real gitignored data/dev-cases.json (cleaned around each test) rather
// than mocking 'fs' — mocking the core fs module breaks jest's own transformer.
// This matches the firm-manager route tests' dev-fallback convention.

process.env.NODE_ENV = 'development'

// DB always rejects → forces the dev fallback path.
jest.mock('../../server/utils/db', () => ({
  execute: jest.fn(() => Promise.reject(new Error('no db in this test')))
}))

const fs = require('fs')
const path = require('path')
const caseStore = require('../../server/utils/caseStore')

const DEV_FILE = path.resolve(__dirname, '../../data/dev-cases.json')
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
})
