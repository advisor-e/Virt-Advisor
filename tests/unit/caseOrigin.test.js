/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * WHERE DID THIS CASE COME FROM — the address on a shared case study.
 *
 * Ruled 2026-08-11. Until then the feed carried `firmId` in its payload and NO
 * SCREEN DISPLAYED IT, so every manager read a stack of anonymous cards and could
 * act on none of them. That is the opposite of what this app is for
 * (ADVISOR-E-DESIGN-LOGIC.md §2 — "who is failing so we can offer help"): a report
 * with no origin is an alarm with no address.
 *
 * The fix has to satisfy TWO rules that pull against each other, which is why the
 * answer is a path rather than a label:
 *   - §2, the purpose — a manager must be able to see WHO needs help; and
 *   - rule 7 / §4.1 — each level sees THE LEVEL IMMEDIATELY BELOW IT, summarised,
 *     never a flat roster of the bottom of the tree.
 *
 * `origin[0]` is rule 7's level and is what the screen groups by; the rest is the
 * address inside that group. So nothing is flattened and nothing is hidden from a
 * manager about their own firms.
 *
 * 🔴 THE PROPERTY THAT MAKES IT SAFE TO SHIP TODAY. It is built on scopeChain, so
 * with no membership data every firm sits directly beneath the mentor and the path
 * is exactly [firm] — the mentor sees firm names because the firm genuinely IS the
 * level below it right now. The day the master team supplies the mapping the same
 * code returns three steps and the screen groups by global group, with no second change.
 * Both halves are asserted below; the second is the one no live screen can show yet.
 */

process.env.JWT_SECRET = 'test-secret-for-case-origin'

jest.mock('../../server/utils/db', () => ({ execute: jest.fn() }))
jest.mock('../../server/utils/firmsDirectory', () => ({ listFirms: jest.fn() }))

const db = require('../../server/utils/db')
const { listFirms } = require('../../server/utils/firmsDirectory')
const { listMentorCases } = require('../../server/routes/mentor')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')
const {
  setFirmMembership,
  globalScopeId,
  groupScopeId,
  originPathOf,
  labelOfScope
} = require('../../server/utils/tierChain')
const { mountWithBuefy } = require('../helpers/mountComponent')

const BRAND = 'Advisor-e'
const MENTOR = { firmId: PLATFORM_SCOPE }
const GLOBAL_MANAGER = { firmId: globalScopeId(BRAND) }
const GROUP_MANAGER = { firmId: groupScopeId(BRAND, 'Germany') }

const SHARED_CASE = {
  id: 'c1',
  advisor_id: 'advisor-x',
  firm_id: 'firm-a',
  title: 'A failing café',
  mode: 'client',
  domain: 'profit',
  mentor_anon_summary: 'The owner fears closure.',
  mentor_shared_at: '2026-06-26T00:00:00.000Z',
  created_at: '2026-06-25T00:00:00.000Z'
}

function makeMockRes () {
  return {
    _status: null,
    _body: null,
    send (status, body) { this._status = status; this._body = body }
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  listFirms.mockResolvedValue([{ id: 'firm-a', name: 'Müller & Partner' }])
})

afterEach(() => {
  jest.restoreAllMocks()
  setFirmMembership({})
})

// ── The path itself ───────────────────────────────────────────────────────────

describe('originPathOf — the level below the viewer, down to the firm', () => {
  test('TODAY: the mentor sees exactly one step, the firm', () => {
    // No membership data, so the firm IS the level immediately below the mentor.
    // This is the same fact isWithinScope rests on, not a special case.
    expect(originPathOf('firm-a', PLATFORM_SCOPE)).toEqual([
      { scopeId: 'firm-a', tier: 'firm_manager' }
    ])
  })

  test('WITH the mapping: the mentor sees brand, then country, then firm', () => {
    setFirmMembership({ 'firm-a': { globalGroup: BRAND, country: 'Germany' } })

    expect(originPathOf('firm-a', PLATFORM_SCOPE)).toEqual([
      { scopeId: globalScopeId(BRAND), tier: 'global_group_manager' },
      { scopeId: groupScopeId(BRAND, 'Germany'), tier: 'group_manager' },
      { scopeId: 'firm-a', tier: 'firm_manager' }
    ])
  })

  test('a global group manager sees the country first — rule 7, not the firm', () => {
    setFirmMembership({ 'firm-a': { globalGroup: BRAND, country: 'Germany' } })

    const path = originPathOf('firm-a', globalScopeId(BRAND))
    expect(path[0]).toEqual({ scopeId: groupScopeId(BRAND, 'Germany'), tier: 'group_manager' })
    // …and the firm is still reachable inside it. Rule 7 limits what a list is
    // GROUPED by; it does not blindfold a manager to their own firms.
    expect(path[path.length - 1]).toEqual({ scopeId: 'firm-a', tier: 'firm_manager' })
  })

  test('a group manager sees the firm and nothing beneath it', () => {
    setFirmMembership({ 'firm-a': { globalGroup: BRAND, country: 'Germany' } })

    expect(originPathOf('firm-a', groupScopeId(BRAND, 'Germany'))).toEqual([
      { scopeId: 'firm-a', tier: 'firm_manager' }
    ])
  })

  test('🔴 a viewer OUTSIDE the firm\'s chain gets nothing — never a guess', () => {
    setFirmMembership({ 'firm-a': { globalGroup: BRAND, country: 'Germany' } })

    // The second lock on a door isWithinScope already holds shut: an unscoped row
    // cannot pick up an address here even if a caller forgot to filter it out.
    expect(originPathOf('firm-a', groupScopeId(BRAND, 'Ireland'))).toEqual([])
    expect(originPathOf('firm-a', globalScopeId('BDO'))).toEqual([])
  })

  test('junk in, empty out', () => {
    expect(originPathOf('', PLATFORM_SCOPE)).toEqual([])
    expect(originPathOf('firm-a', null)).toEqual([])
    expect(originPathOf(null, null)).toEqual([])
  })
})

describe('labelOfScope — the name a reserved scope id carries', () => {
  test('a global scope names its brand, a group scope names its country', () => {
    expect(labelOfScope(globalScopeId(BRAND))).toBe(BRAND)
    expect(labelOfScope(groupScopeId(BRAND, 'Germany'))).toBe('Germany')
  })

  test('🔴 a firm returns null — its name is not in its id and is not ours to invent', () => {
    // It comes from firmsDirectory. Returning the id dressed as a name here would
    // give one firm two spellings on two tabs of the same hub, which is already
    // true between Adoption and the Logic-Lab Report and is not to be repeated.
    expect(labelOfScope('firm-a')).toBeNull()
    expect(labelOfScope(PLATFORM_SCOPE)).toBeNull()
    expect(labelOfScope(null)).toBeNull()
  })
})

// ── The feed ──────────────────────────────────────────────────────────────────

describe('GET /api/mentor/cases — every case carries its origin', () => {
  test('the firm is named from the directory, not printed as an id', async () => {
    db.execute.mockResolvedValue([[SHARED_CASE]])
    const res = makeMockRes()

    await listMentorCases(MENTOR, res)

    expect(res._status).toBe(200)
    expect(res._body.cases[0].origin).toEqual([
      { scopeId: 'firm-a', tier: 'firm_manager', label: 'Müller & Partner' }
    ])
  })

  test('with the mapping, the mentor is grouped by global group and can still read down', async () => {
    setFirmMembership({ 'firm-a': { globalGroup: BRAND, country: 'Germany' } })
    db.execute.mockResolvedValue([[SHARED_CASE]])
    const res = makeMockRes()

    await listMentorCases(MENTOR, res)

    expect(res._body.cases[0].origin.map(s => s.label))
      .toEqual([BRAND, 'Germany', 'Müller & Partner'])
  })

  test('a group manager gets the firm alone', async () => {
    setFirmMembership({ 'firm-a': { globalGroup: BRAND, country: 'Germany' } })
    db.execute.mockResolvedValue([[SHARED_CASE]])
    const res = makeMockRes()

    await listMentorCases(GROUP_MANAGER, res)

    expect(res._body.cases[0].origin.map(s => s.label)).toEqual(['Müller & Partner'])
  })

  test('a global group manager gets the country first', async () => {
    setFirmMembership({ 'firm-a': { globalGroup: BRAND, country: 'Germany' } })
    db.execute.mockResolvedValue([[SHARED_CASE]])
    const res = makeMockRes()

    await listMentorCases(GLOBAL_MANAGER, res)

    expect(res._body.cases[0].origin.map(s => s.label)).toEqual(['Germany', 'Müller & Partner'])
  })

  test('a firm with no name in the directory shows as its id, visibly', async () => {
    listFirms.mockResolvedValue([{ id: 'firm-a', name: null }])
    db.execute.mockResolvedValue([[SHARED_CASE]])
    const res = makeMockRes()

    await listMentorCases(MENTOR, res)

    expect(res._body.cases[0].origin[0].label).toBe('firm-a')
  })

  test('🔴 an unreadable directory costs the NAMES, never the feed', async () => {
    // listFirms rejects in production by design, so the adoption page cannot
    // under-report a platform. Here the names are decoration on a report whose job
    // is to show who needs help — killing the whole feed over a label would be the
    // worse failure, and an id on screen is visibly an id.
    listFirms.mockRejectedValue(new Error('firms table unreachable'))
    db.execute.mockResolvedValue([[SHARED_CASE]])
    const res = makeMockRes()

    await listMentorCases(MENTOR, res)

    expect(res._status).toBe(200)
    expect(res._body.cases[0].origin[0].label).toBe('firm-a')
  })

  test('the adviser is still stripped — the origin names a FIRM, never a person', async () => {
    db.execute.mockResolvedValue([[SHARED_CASE]])
    const res = makeMockRes()

    await listMentorCases(MENTOR, res)

    const c = res._body.cases[0]
    expect(c.advisorId).toBeUndefined()
    expect(JSON.stringify(c.origin)).not.toContain('advisor-x')
  })
})

// ── The screen ────────────────────────────────────────────────────────────────

describe('MentorReview — grouped by the level below, openable', () => {
  const MentorReview = require('~/components/MentorReview.vue').default

  const CASE = (id, title, origin) => ({
    id,
    title,
    domain: 'profit',
    mentorSharedAt: '2026-06-26T00:00:00.000Z',
    origin
  })

  const FIRM_A = [{ scopeId: 'firm-a', tier: 'firm_manager', label: 'Müller & Partner' }]
  const FIRM_B = [{ scopeId: 'firm-b', tier: 'firm_manager', label: 'Schmidt GmbH' }]
  const DEEP = [
    { scopeId: groupScopeId(BRAND, 'Germany'), tier: 'group_manager', label: 'Germany' },
    { scopeId: 'firm-a', tier: 'firm_manager', label: 'Müller & Partner' }
  ]

  /**
   * Mount the screen and let it load its OWN feed, rather than mounting and then
   * overwriting `cases` with setData. The first attempt did the latter and the
   * component's own mounted() fetch resolved afterwards and emptied the list again
   * — a test that passed only because it asserted before the promise settled.
   */
  async function screen (cases) {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, cases, awaitingFirms: false })
    }))
    const wrapper = mountWithBuefy(MentorReview, { propsData: { apiToken: 't' } })
    await new Promise(resolve => setTimeout(resolve, 0))
    await wrapper.vm.$nextTick()
    return wrapper
  }

  it('gathers cases under the firm they came from, and counts them', async () => {
    const wrapper = await screen([
      CASE('c1', 'A failing café', FIRM_A),
      CASE('c2', 'A second one', FIRM_A),
      CASE('c3', 'Another firm entirely', FIRM_B)
    ])

    expect(wrapper.vm.groups.map(g => g.label)).toEqual(['Müller & Partner', 'Schmidt GmbH'])
    expect(wrapper.vm.groups.map(g => g.cases.length)).toEqual([2, 1])

    const text = wrapper.text()
    expect(text).toContain('Müller & Partner')
    expect(text).toContain('Schmidt GmbH')
    // The pattern is the point: two cases from one firm is what a manager acts on.
    expect(text).toContain('2')
  })

  it('shows the address INSIDE the group when there is one below it', async () => {
    const wrapper = await screen([CASE('c1', 'A failing café', DEEP)])

    // Grouped by Germany (rule 7 for a global group manager), and the card still
    // names the firm — otherwise the group is not worth opening.
    expect(wrapper.vm.groups[0].label).toBe('Germany')
    expect(wrapper.vm.originPrefix(wrapper.vm.cases[0])).toBe('Müller & Partner · ')
    expect(wrapper.text()).toContain('Müller & Partner')
  })

  it('adds no prefix for a group manager, whose heading already names the firm', async () => {
    const wrapper = await screen([CASE('c1', 'A failing café', FIRM_A)])
    expect(wrapper.vm.originPrefix(wrapper.vm.cases[0])).toBe('')
  })

  it('groups are OPEN by default — this screen is live as a flat list', async () => {
    const wrapper = await screen([CASE('c1', 'A failing café', FIRM_A)])
    expect(wrapper.text()).toContain('A failing café')
  })

  it('closing a group hides its cases and keeps its heading', async () => {
    const wrapper = await screen([CASE('c1', 'A failing café', FIRM_A)])

    wrapper.vm.toggleGroup('firm-a')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).not.toContain('A failing café')
    expect(wrapper.text()).toContain('Müller & Partner')

    wrapper.vm.toggleGroup('firm-a')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('A failing café')
  })

  it('a case with no origin still renders rather than vanishing', async () => {
    // Should not happen — the scope filter removes unscoped rows first. Losing a
    // case silently is worse than showing one without an address.
    const wrapper = await screen([CASE('c1', 'An orphan case', [])])

    expect(wrapper.vm.groups).toHaveLength(1)
    expect(wrapper.vm.groups[0].label).toBeNull()
    expect(wrapper.text()).toContain('An orphan case')
  })
})
