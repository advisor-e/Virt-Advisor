'use strict'

/**
 * The Team roll-up's arithmetic and its firm-wide read — item 17 stage 4.
 *
 * 🔴 THE SOURCE APP'S VERSION OF THIS SCREEN DOES NOT WORK, and these tests are
 * what stop it being reintroduced. `server/api/team/summary.get.js` filters
 * `where: { userId: user.id }` and then groups by `leadStaff` — a team roll-up
 * that only ever sees the manager's own deals. The first test below fails if our
 * read is ever narrowed the same way.
 *
 * The second thing pinned here is the null-on-empty-denominator convention. The
 * source app returns 0 for both its averages, so a staff member who has sent no
 * proposals reads as a 0% close rate rather than as having nothing to judge yet.
 * A manager comparing their team on that number compares a real failure against
 * an absence of data — a wrong number, and exactly what UAT cannot see.
 */

const path = require('path')
const fs = require('fs')
const os = require('os')

const metrics = require('../../server/utils/salesMetrics')

/** One pipeline row, with only the fields the roll-up reads. */
function deal (over) {
  return Object.assign({
    leadStaff: 'Ann',
    prospectStatus: 'Active',
    approachStyle: '',
    approachDate: null,
    secureMeeting: false,
    proposalSent: false,
    jobSecured: false,
    proposalValue: 0,
    jobSecuredValue: 0
  }, over || {})
}

describe('teamSummary — grouping', () => {
  test('groups by the staff member leading the deal', () => {
    const { rows } = metrics.teamSummary([
      deal({ leadStaff: 'Ann' }),
      deal({ leadStaff: 'Bob' }),
      deal({ leadStaff: 'Ann' })
    ])
    expect(rows).toHaveLength(2)
    expect(rows.find(r => r.leadStaff === 'Ann').prospects).toBe(2)
    expect(rows.find(r => r.leadStaff === 'Bob').prospects).toBe(1)
  })

  test('sorts by name so the table does not reorder between loads', () => {
    const { rows } = metrics.teamSummary([
      deal({ leadStaff: 'Zoe' }), deal({ leadStaff: 'Ann' }), deal({ leadStaff: 'Mia' })
    ])
    expect(rows.map(r => r.leadStaff)).toEqual(['Ann', 'Mia', 'Zoe'])
  })

  test('🔴 a deal with no lead staff is bucketed, never dropped', () => {
    const { rows, totals } = metrics.teamSummary([
      deal({ leadStaff: 'Ann' }), deal({ leadStaff: '' }), deal({ leadStaff: null })
    ])
    const unassigned = rows.find(r => r.leadStaff === metrics.UNASSIGNED)
    expect(unassigned.prospects).toBe(2)
    // Every deal in the firm is still counted in the totals.
    expect(totals.prospects).toBe(3)
  })

  test('whitespace-only lead staff is Unassigned, not its own column', () => {
    const { rows } = metrics.teamSummary([deal({ leadStaff: '   ' })])
    expect(rows[0].leadStaff).toBe(metrics.UNASSIGNED)
  })

  test('Unassigned sorts last — it is a bucket, not a colleague', () => {
    const { rows } = metrics.teamSummary([
      deal({ leadStaff: '' }), deal({ leadStaff: 'Zoe' }), deal({ leadStaff: 'Ann' })
    ])
    expect(rows[rows.length - 1].leadStaff).toBe(metrics.UNASSIGNED)
  })

  test('Unassigned is excluded from the team-member count', () => {
    const { totals } = metrics.teamSummary([
      deal({ leadStaff: 'Ann' }), deal({ leadStaff: '' })
    ])
    expect(totals.teamMembers).toBe(1)
  })

  test('no deals gives no rows and zeroed totals, not a crash', () => {
    const { rows, totals } = metrics.teamSummary([])
    expect(rows).toEqual([])
    expect(totals.prospects).toBe(0)
    expect(totals.teamMembers).toBe(0)
  })

  test('a non-array is treated as empty rather than throwing', () => {
    expect(metrics.teamSummary(null).rows).toEqual([])
    expect(metrics.teamSummary(undefined).rows).toEqual([])
  })
})

describe('teamSummary — counting', () => {
  test('🔴 an approach counts on a DATE, not a style — Mike\'s ruling 2026-09-22', () => {
    // The style is filled in when the deal is created, so counting it makes the
    // rate read ~100% for everyone and measure nothing. A date is only there once
    // somebody actually made contact.
    const { rows } = metrics.teamSummary([
      deal({ approachStyle: 'Direct Contact', approachDate: '2026-08-01' }),
      deal({ approachStyle: 'Direct Contact', approachDate: null }),
      deal({ approachStyle: 'Direct Contact', approachDate: '' })
    ])
    expect(rows[0].approachesMade).toBe(1)
    expect(rows[0].prospects).toBe(3)
  })

  test('an unparseable approach date does not count as an approach', () => {
    const { rows } = metrics.teamSummary([deal({ approachDate: 'not a date' })])
    expect(rows[0].approachesMade).toBe(0)
  })

  test('meetings, proposals and wins count their booleans', () => {
    const { rows } = metrics.teamSummary([
      deal({ secureMeeting: true, proposalSent: true, jobSecured: true }),
      deal({ secureMeeting: true, proposalSent: true, jobSecured: false }),
      deal({})
    ])
    expect(rows[0].secureMeetings).toBe(2)
    expect(rows[0].proposalsSent).toBe(2)
    expect(rows[0].engagementsSecured).toBe(1)
  })

  test('the five prospect statuses each land in their own column', () => {
    const { rows } = metrics.teamSummary([
      deal({ prospectStatus: 'Active' }),
      deal({ prospectStatus: 'Await Research' }),
      deal({ prospectStatus: 'Completed' }),
      deal({ prospectStatus: 'Dead' }),
      deal({ prospectStatus: 'On Hold' })
    ])
    const r = rows[0]
    expect([r.active, r.awaitResearch, r.completed, r.dead, r.onHold]).toEqual([1, 1, 1, 1, 1])
  })

  test('an unrecognised status is still a prospect but sits in no status column', () => {
    const { rows } = metrics.teamSummary([deal({ prospectStatus: 'Wandering' })])
    const r = rows[0]
    expect(r.prospects).toBe(1)
    expect(r.active + r.awaitResearch + r.completed + r.dead + r.onHold).toBe(0)
  })

  test('money sums, and a non-numeric value is treated as zero rather than NaN', () => {
    const { rows } = metrics.teamSummary([
      deal({ proposalValue: 1000, jobSecuredValue: 500 }),
      deal({ proposalValue: '2000', jobSecuredValue: null }),
      deal({ proposalValue: 'not a number', jobSecuredValue: undefined })
    ])
    expect(rows[0].totalProposalValue).toBe(3000)
    expect(rows[0].totalSecuredValue).toBe(500)
  })
})

describe('teamSummary — rates, and the empty denominator', () => {
  test('the approach rate is approaches over APPROACHABLE prospects', () => {
    const { rows } = metrics.teamSummary([
      deal({ approachDate: '2026-08-01' }),
      deal({ approachDate: '2026-08-02' }),
      deal({ approachDate: null }),
      deal({ approachDate: null })
    ])
    expect(rows[0].approachRate).toBe(50)
  })

  test('🔴 a prospect still AWAITING RESEARCH is not counted against the advisor', () => {
    // The whole point of the measure: it finds someone who researches and never
    // approaches. Counting a full research queue as a failure would invert it.
    const { rows } = metrics.teamSummary([
      deal({ approachDate: '2026-08-01' }),
      deal({ prospectStatus: 'Await Research', approachDate: null }),
      deal({ prospectStatus: 'Await Research', approachDate: null })
    ])
    expect(rows[0].approachable).toBe(1)
    expect(rows[0].approachRate).toBe(100)
    // Still three prospects — they are excluded from the rate, never from the count.
    expect(rows[0].prospects).toBe(3)
  })

  test('🔴 the advisor who researches and never approaches is visible', () => {
    // Ten found, research done on all of them, two approached.
    const deals = []
    for (let i = 0; i < 10; i++) {
      deals.push(deal({ approachDate: i < 2 ? '2026-08-01' : null }))
    }
    const { rows } = metrics.teamSummary(deals)
    expect(rows[0].approachRate).toBe(20)
  })

  test('an advisor with nothing but research has no rate, not 0%', () => {
    const { rows } = metrics.teamSummary([
      deal({ prospectStatus: 'Await Research', approachDate: null })
    ])
    expect(rows[0].approachable).toBe(0)
    expect(rows[0].approachRate).toBeNull()
  })

  test('the secured rate is wins over PROPOSALS, not over prospects', () => {
    const { rows } = metrics.teamSummary([
      deal({ proposalSent: true, jobSecured: true }),
      deal({ proposalSent: true, jobSecured: false }),
      deal({ proposalSent: false, jobSecured: false }),
      deal({ proposalSent: false, jobSecured: false })
    ])
    // 1 of 2 proposals, not 1 of 4 prospects.
    expect(rows[0].securedRate).toBe(50)
  })

  test('🔴 a staff member with no proposals has a NULL rate, not 0%', () => {
    const { rows } = metrics.teamSummary([deal({ proposalSent: false })])
    expect(rows[0].securedRate).toBeNull()
    expect(rows[0].avgProposalValue).toBeNull()
  })

  test('the average proposal value divides by proposals sent, rounded', () => {
    const { rows } = metrics.teamSummary([
      deal({ proposalSent: true, proposalValue: 1000 }),
      deal({ proposalSent: true, proposalValue: 2001 }),
      deal({ proposalSent: false, proposalValue: 9999 })
    ])
    // (1000 + 2001 + 9999) / 2 proposals = 6500
    expect(rows[0].avgProposalValue).toBe(6500)
  })

  test('firm totals carry their own rates, computed from the firm not averaged', () => {
    const { totals } = metrics.teamSummary([
      deal({ leadStaff: 'Ann', proposalSent: true, jobSecured: true }),
      deal({ leadStaff: 'Bob', proposalSent: true, jobSecured: false }),
      deal({ leadStaff: 'Bob', proposalSent: true, jobSecured: false })
    ])
    // 1 win over 3 proposals = 33.3%, NOT the mean of Ann's 100% and Bob's 0%.
    expect(totals.securedRate).toBe(33.3)
  })

  test('firm totals with nothing to divide by are null, not zero', () => {
    const { totals } = metrics.teamSummary([])
    expect(totals.securedRate).toBeNull()
    expect(totals.approachRate).toBeNull()
  })

  test('totals sum every group, Unassigned included', () => {
    const { totals } = metrics.teamSummary([
      deal({ leadStaff: 'Ann', jobSecuredValue: 100 }),
      deal({ leadStaff: '', jobSecuredValue: 50 })
    ])
    expect(totals.totalSecuredValue).toBe(150)
  })
})

describe('salesTeamStore.listForFirm — the firm-wide read', () => {
  const DEV_FILE = path.join(os.tmpdir(), `sales-team-test-${process.pid}.json`)

  beforeEach(() => {
    jest.resetModules()
    process.env.SALES_PIPELINE_DEV_FILE = DEV_FILE
  })

  afterEach(() => {
    delete process.env.SALES_PIPELINE_DEV_FILE
    try { fs.unlinkSync(DEV_FILE) } catch (e) { /* never written */ }
  })

  function seed (entries) {
    fs.writeFileSync(DEV_FILE, JSON.stringify({ entries }))
  }

  /** Force the dev fallback: the store falls back when the DB is unavailable. */
  function loadStoreWithoutDb () {
    jest.doMock('../../server/utils/db', () => ({
      execute: jest.fn().mockRejectedValue(Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' }))
    }))
    return require('../../server/utils/salesTeamStore')
  }

  test('🔴 returns EVERY advisor\'s deals in the firm — the source app\'s bug is not ported', async () => {
    seed([
      { id: '1', firmId: 'firm-1', advisorId: 'adv-a', visibility: 'private', updatedAt: '2026-09-01' },
      { id: '2', firmId: 'firm-1', advisorId: 'adv-b', visibility: 'private', updatedAt: '2026-09-02' },
      { id: '3', firmId: 'firm-1', advisorId: 'adv-c', visibility: 'firm', updatedAt: '2026-09-03' }
    ])
    const store = loadStoreWithoutDb()
    const rows = await store.listForFirm('firm-1')
    expect(rows.map(r => r.id).sort()).toEqual(['1', '2', '3'])
  })

  test('🔴 a PRIVATE deal belonging to someone else IS returned (Mike, 2026-09-22)', async () => {
    seed([{ id: 'p', firmId: 'firm-1', advisorId: 'someone-else', visibility: 'private', updatedAt: '2026-09-01' }])
    const store = loadStoreWithoutDb()
    const rows = await store.listForFirm('firm-1')
    expect(rows).toHaveLength(1)
  })

  test('🔴 ANOTHER FIRM\'S deals are never returned — the firm is the only boundary left', async () => {
    seed([
      { id: 'mine', firmId: 'firm-1', advisorId: 'adv-a', visibility: 'firm', updatedAt: '2026-09-01' },
      { id: 'theirs', firmId: 'firm-2', advisorId: 'adv-z', visibility: 'firm', updatedAt: '2026-09-02' }
    ])
    const store = loadStoreWithoutDb()
    const rows = await store.listForFirm('firm-1')
    expect(rows.map(r => r.id)).toEqual(['mine'])
  })

  test('newest first', async () => {
    seed([
      { id: 'old', firmId: 'firm-1', advisorId: 'a', updatedAt: '2026-01-01' },
      { id: 'new', firmId: 'firm-1', advisorId: 'a', updatedAt: '2026-09-01' }
    ])
    const store = loadStoreWithoutDb()
    const rows = await store.listForFirm('firm-1')
    expect(rows.map(r => r.id)).toEqual(['new', 'old'])
  })

  test('a missing firm id throws rather than reading every firm', async () => {
    const store = loadStoreWithoutDb()
    await expect(store.listForFirm('')).rejects.toThrow(/firmId is required/)
    await expect(store.listForFirm(undefined)).rejects.toThrow(/firmId is required/)
  })

  test('the firm filter is in the SQL, not applied after the read', async () => {
    jest.doMock('../../server/utils/db', () => ({
      execute: jest.fn().mockResolvedValue([[]])
    }))
    const db = require('../../server/utils/db')
    const store = require('../../server/utils/salesTeamStore')
    await store.listForFirm('firm-1')
    const [sql, params] = db.execute.mock.calls[0]
    expect(sql).toMatch(/WHERE firm_id = \?/)
    expect(params).toEqual(['firm-1'])
    // No advisor filter: that is the whole point of this read.
    expect(sql).not.toMatch(/advisor_id/)
  })
})
