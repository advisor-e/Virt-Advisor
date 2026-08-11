'use strict'

/**
 * TWO REPORTS WERE SHOWN AT TIERS THEY COULD NOT READ, AND SAID SO IN WORDS.
 *
 * ADVISOR-E-DESIGN-LOGIC.md §4.1: "EVERY report rolls up. No exceptions." Team
 * Progress and Team Case Studies were both ruled up on 2026-08-10 and their TABS were
 * added at the two middle tiers — but the routes behind them kept matching `firm_id`
 * exactly, so a group manager received an empty list.
 *
 * 🔴 WHY NO TEST CAUGHT IT, AND WHY THESE ONES CAN. While no firm was mapped to a
 * middle tier, `isAwaitingFirms` was true and the screens honestly said "not connected
 * yet". The emptiness was therefore INDISTINGUISHABLE from correct behaviour. The day
 * membership arrives — in dev on 2026-08-12, in UAT whenever the master team supplies
 * it — the banner stops firing and the same empty list starts reading as "no advisor
 * has shared anything", to a manager whose advisers have shared several. §4.4 records
 * this family of mistake being made twice before.
 *
 * So every test here sets membership FIRST. A test that forgot to would pass against
 * the very bug it is meant to hold shut.
 *
 * The privacy assertions are not decoration. §4.3 puts the line in an exact place:
 * naming a FIRM to the manager above it is not a disclosure — they are their firms —
 * but a flat roster of every adviser in a country is "the level below is the limit"
 * being broken. So: firm names present, adviser identities absent.
 */

process.env.JWT_SECRET = 'test-secret-for-team-rollup'

const { setFirmMembership, globalScopeId, groupScopeId } = require('../../server/utils/tierChain')

const BRAND = 'Advisor-e'
const GLOBAL = globalScopeId(BRAND)
const GROUP_DE = groupScopeId(BRAND, 'DE')

const MEMBERSHIP = {
  'firm-berlin': { globalGroup: BRAND, country: 'DE' },
  'firm-munich': { globalGroup: BRAND, country: 'DE' },
  'firm-london': { globalGroup: BRAND, country: 'UK' }
}

beforeEach(() => setFirmMembership(MEMBERSHIP))
afterEach(() => {
  setFirmMembership({})
  jest.restoreAllMocks()
})

/** Minimal res double capturing what the route sent. */
function makeRes () {
  return {
    statusCode: null,
    body: null,
    send (code, body) { this.statusCode = code; this.body = body }
  }
}

describe('Team Progress — the level immediately below, summarised', () => {
  const activityStore = require('../../server/utils/activityStore')
  const activity = require('../../server/routes/activity')

  /**
   * Two firms in Germany, one in the UK. Rows arrive per firm + capability tier,
   * exactly as both the SQL and the dev fallback group them.
   */
  function stubStore () {
    jest.spyOn(activityStore, 'readSessionsUnderScope').mockResolvedValue({
      vaRows: [
        { firm_id: 'firm-berlin', highest_tier: 'advanced', count: '4', advisers: '2', last_active: '2026-08-10 09:00:00' },
        { firm_id: 'firm-berlin', highest_tier: 'entry-level', count: '1', advisers: '1', last_active: '2026-08-01 09:00:00' },
        { firm_id: 'firm-munich', highest_tier: 'entry-level', count: '3', advisers: '1', last_active: '2026-08-09 09:00:00' },
        { firm_id: 'firm-london', highest_tier: 'intermediate', count: '2', advisers: '1', last_active: '2026-08-08 09:00:00' }
      ],
      courseRows: [
        { firm_id: 'firm-berlin', highest_tier: 'advanced', count: '2', advisers: '2', avg_score: '80', last_active: '2026-08-11 09:00:00' }
      ]
    })
  }

  test('a GROUP manager gets one row per FIRM, not a list of advisers', async () => {
    stubStore()
    const res = makeRes()
    await activity.getTeam({ firmId: GROUP_DE }, res)

    expect(res.statusCode).toBe(200)
    const labels = res.body.groups.map(g => g.label).sort()
    expect(labels).toEqual(['firm-berlin', 'firm-munich'])
    // Every row is a firm — the level immediately below a country.
    res.body.groups.forEach(g => expect(g.tier).toBe('firm_manager'))
    // The UK firm belongs to another country and must not appear.
    expect(JSON.stringify(res.body.groups)).not.toContain('london')
  })

  test('a GLOBAL GROUP manager gets one row per COUNTRY, one level up from firms', async () => {
    stubStore()
    const res = makeRes()
    await activity.getTeam({ firmId: GLOBAL }, res)

    const labels = res.body.groups.map(g => g.label).sort()
    expect(labels).toEqual(['DE', 'UK'])
    res.body.groups.forEach(g => expect(g.tier).toBe('group_manager'))
  })

  test('🔴 ADVISERS ARE ADDED ACROSS FIRMS BUT NOT WITHIN ONE', async () => {
    // Berlin's 2 advisers appear on three separate rows (two tiers, two tables) and
    // must count once; Munich's 1 must still be added on top. Summing every row gives
    // 6, taking one maximum gives 2, and the answer is 3. Both wrong ways were
    // written during this change, which is why the case is pinned.
    stubStore()
    const res = makeRes()
    await activity.getTeam({ firmId: GROUP_DE }, res)

    const de = res.body.groups.reduce((n, g) => n + g.advisers, 0)
    expect(de).toBe(3)
  })

  test('🔴 NO ADVISER IDENTITY REACHES A TIER ABOVE THE FIRM', async () => {
    stubStore()
    const res = makeRes()
    await activity.getTeam({ firmId: GLOBAL }, res)

    const payload = JSON.stringify(res.body)
    expect(payload).not.toMatch(/advisor_id|advisorId|advisor_name|advisorName/)
    // `advisors` stays present and empty so the response shape never changes between
    // tiers — a screen reading it cannot crash on a missing key.
    expect(res.body.advisors).toEqual([])
  })

  test('the quietest group sorts FIRST — §2, "who is failing so we can offer help"', async () => {
    stubStore()
    const res = makeRes()
    await activity.getTeam({ firmId: GROUP_DE }, res)

    const totals = res.body.groups.map(g => g.totalSessions)
    expect(totals).toEqual([...totals].sort((a, b) => a - b))
  })

  test('a firm with no firms mapped beneath it is told so, not shown an empty team', async () => {
    setFirmMembership({})
    jest.spyOn(activityStore, 'readSessionsUnderScope').mockResolvedValue({ vaRows: [], courseRows: [] })
    const res = makeRes()
    await activity.getTeam({ firmId: GROUP_DE }, res)

    expect(res.body.groups).toEqual([])
    expect(res.body.awaitingFirms).toBe(true)
  })

  test('a FIRM manager still gets the adviser roster, untouched by this change', async () => {
    jest.spyOn(activityStore, 'readFirmSessions').mockResolvedValue({
      vaRows: [{ advisor_id: 'a1', advisor_name: 'Ada', highest_tier: 'advanced', count: '2', last_active: '2026-08-10 09:00:00' }],
      courseRows: []
    })
    const res = makeRes()
    await activity.getTeam({ firmId: 'firm-berlin' }, res)

    expect(res.body.advisors).toHaveLength(1)
    expect(res.body.advisors[0].advisorId).toBe('a1')
    expect(res.body.groups).toBeUndefined()
  })
})

describe('Team Case Studies — the second opt-in is what makes rolling it up safe', () => {
  const caseStore = require('../../server/utils/caseStore')
  const cases = require('../../server/routes/cases')

  test('🔴 A MANAGING TIER READS THE MENTOR-SHARED SET, NEVER THE RAW FIRM SET', async () => {
    // This is the whole consent argument. listSharedForFirm returns un-anonymised
    // text that only ever passed the ADVISER's opt-in; the firm manager's separate
    // decision to send a case onward is what listSharedWithMentor filters on. Calling
    // the wrong one would carry raw client detail past a gate a human never opened.
    const raw = jest.spyOn(caseStore, 'listSharedForFirm').mockResolvedValue([])
    const shared = jest.spyOn(caseStore, 'listSharedWithMentor').mockResolvedValue([
      { id: 'c1', firmId: 'firm-munich', title: 'A case' }
    ])

    const res = makeRes()
    await cases.listFirmCases({ firmId: GROUP_DE }, res)

    expect(shared).toHaveBeenCalledWith(GROUP_DE)
    expect(raw).not.toHaveBeenCalled()
  })

  test('a FIRM manager reads its own shared cases in full, as before', async () => {
    const raw = jest.spyOn(caseStore, 'listSharedForFirm').mockResolvedValue([{ id: 'c1' }])
    const shared = jest.spyOn(caseStore, 'listSharedWithMentor').mockResolvedValue([])

    const res = makeRes()
    await cases.listFirmCases({ firmId: 'firm-berlin' }, res)

    expect(raw).toHaveBeenCalledWith('firm-berlin')
    expect(shared).not.toHaveBeenCalled()
    expect(res.body.cases).toHaveLength(1)
  })

  test('every rolled-up case carries an origin path, nearest level below first', async () => {
    // A cross-firm row with no address is an alarm nobody can act on (§4.3).
    jest.spyOn(caseStore, 'listSharedWithMentor').mockResolvedValue([
      { id: 'c1', firmId: 'firm-munich', title: 'A case' }
    ])

    const res = makeRes()
    await cases.listFirmCases({ firmId: GLOBAL }, res)

    const origin = res.body.cases[0].origin
    expect(origin[0].tier).toBe('group_manager')
    expect(origin[0].label).toBe('DE')
    expect(origin[origin.length - 1].tier).toBe('firm_manager')
  })
})
