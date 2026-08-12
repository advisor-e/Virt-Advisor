'use strict'

/**
 * THE THREE CROSS-FIRM REPORTS, ASKED FOR BY A MIDDLE TIER.
 *
 * tierReportScope.test.js proves the two controls in isolation — who may ask, and
 * which firms match. This file proves the handlers actually USE them, which is the
 * part that would rot first: a guard can be correct while a route forgets to call
 * the filter, and the screen would look plausible either way.
 *
 * Each report is asserted twice, and the pair is the point:
 *   - as the MENTOR, the same data comes back as before the change (nothing moved);
 *   - as a GROUP MANAGER with no membership data, nothing comes back (their own
 *     empty channel, not somebody else's full one).
 *
 * The second half of each pair is the one that was broken. Before 2026-08-11 a
 * group manager received the mentor's answer verbatim.
 */

process.env.JWT_SECRET = 'test-secret-for-tier-report-filtering'

jest.mock('../../server/utils/db', () => ({ execute: jest.fn() }))
jest.mock('../../server/utils/activityStore', () => ({ readAdoptionByFirm: jest.fn() }))
jest.mock('../../server/utils/firmsDirectory', () => ({ listFirms: jest.fn() }))
jest.mock('../../server/utils/firmOverlay', () => ({
  listFirmIdsWithConfigKey: jest.fn(),
  loadFirmConfig: jest.fn()
}))

const db = require('../../server/utils/db')
const activityStore = require('../../server/utils/activityStore')
const { listFirms } = require('../../server/utils/firmsDirectory')
const overlay = require('../../server/utils/firmOverlay')
const { listMentorCases, getAdoption, getLogicLabReport } = require('../../server/routes/mentor')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')
const { setFirmMembership, groupScopeId } = require('../../server/utils/tierChain')

const BRAND = 'Advisor-e'
const MENTOR = { firmId: PLATFORM_SCOPE }
const GROUP_MANAGER = { firmId: groupScopeId(BRAND, 'DE') }

function makeMockRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { try { this._body = JSON.parse(body) } catch (e) { this._body = body } }
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
  setFirmMembership({})
})

// ── Case Reviews ──────────────────────────────────────────────────────────────

describe('GET /api/mentor/cases — the shared-case feed', () => {
  const SHARED_CASE = {
    id: 'c1',
    advisor_id: 'advisor-x',
    firm_id: 'firm-a',
    title: 'A failing café',
    mode: 'client',
    domain: 'profit',
    mentor_anon_summary: 'The owner fears closure.',
    mentor_anon_transcript: [{ role: 'user', content: 'scrubbed words' }],
    mentor_shared_at: '2026-06-26T00:00:00.000Z',
    created_at: '2026-06-25T00:00:00.000Z'
  }

  test('the mentor still receives every shared case', async () => {
    db.execute.mockResolvedValue([[SHARED_CASE]])
    const res = makeMockRes()

    await listMentorCases(MENTOR, res)

    expect(res._status).toBe(200)
    expect(res._body.cases).toHaveLength(1)
  })

  test('🔴 a group manager receives NONE of them while no firm is mapped to their group', async () => {
    db.execute.mockResolvedValue([[SHARED_CASE]])
    const res = makeMockRes()

    await listMentorCases(GROUP_MANAGER, res)

    expect(res._status).toBe(200)
    expect(res._body.cases).toHaveLength(0)
  })

  test('once a firm IS mapped to their group, its case reaches them — and only its', async () => {
    setFirmMembership({
      'firm-a': { globalGroup: BRAND, country: 'DE' },
      'firm-b': { globalGroup: BRAND, country: 'IE' }
    })
    db.execute.mockResolvedValue([[
      SHARED_CASE,
      { ...SHARED_CASE, id: 'c2', firm_id: 'firm-b', title: 'A Dublin case' }
    ]])
    const res = makeMockRes()

    await listMentorCases(GROUP_MANAGER, res)

    expect(res._body.cases).toHaveLength(1)
    expect(res._body.cases[0].id).toBe('c1')
  })

  test('the adviser is stripped — and the FIRM is not, which is a live question', async () => {
    setFirmMembership({ 'firm-a': { globalGroup: BRAND, country: 'DE' } })
    db.execute.mockResolvedValue([[SHARED_CASE]])
    const res = makeMockRes()

    await listMentorCases(GROUP_MANAGER, res)

    expect(res._body.cases[0].advisorId).toBeUndefined()

    // ✅ RULED 2026-08-11 — THE FIRM STAYS, AND IS NOW SHOWN.
    //
    // Raised here on 2026-08-11 as an open question: the payload named the firm
    // while the design record described this screen as "anonymised, no adviser, no
    // firm", and MentorReview.vue read the field nowhere. The proposal put to the
    // owner was to REMOVE it. He rejected that, and the reasoning is the product's:
    // "if i am the group manager, how do i recognise which data relates to which
    // firm? how can i help them if i dont know who they are??"
    //
    // ADVISOR-E-DESIGN-LOGIC.md §2 settles it — reports roll up so we can see "who
    // is failing so we can offer help". Anonymisation here protects the CLIENT, not
    // the firm; naming a firm to the manager above it is not a disclosure, because
    // they are their firms. §4.4 records the same mistake being made four days
    // earlier: applying an outside party's privacy boundary to the customer's own
    // senior people.
    //
    // The firm is now shown, as part of `origin` — see caseOrigin.test.js. This
    // line stays as the guard on the raw field the whole feature rests on.
    expect(res._body.cases[0].firmId).toBe('firm-a')
  })
})

// ── Adoption ──────────────────────────────────────────────────────────────────

describe('GET /api/mentor/adoption — how firms are using the app', () => {
  const ACTIVITY = {
    vaRows: [{ firm_id: 'firm-a', sessions: 40, last_active: '2026-08-01T00:00:00.000Z' }],
    courseRows: [{ firm_id: 'firm-a', courses: 9, avg_score: 71, last_active: '2026-08-01T00:00:00.000Z' }],
    adviserRows: [{ firm_id: 'firm-a', advisers: 4 }]
  }

  test('the mentor still sees the firm', async () => {
    activityStore.readAdoptionByFirm.mockResolvedValue(ACTIVITY)
    listFirms.mockResolvedValue([{ id: 'firm-a', name: 'Hartley & Vine' }])
    const res = makeMockRes()

    await getAdoption(MENTOR, res)

    expect(res._body.report.firms).toHaveLength(1)
  })

  test('🔴 a group manager sees no firms, and no counts belonging to one', async () => {
    activityStore.readAdoptionByFirm.mockResolvedValue(ACTIVITY)
    listFirms.mockResolvedValue([{ id: 'firm-a', name: 'Hartley & Vine' }])
    const res = makeMockRes()

    await getAdoption(GROUP_MANAGER, res)

    expect(res._status).toBe(200)
    expect(res._body.report.firms).toHaveLength(0)
    // Not just the rows — the firm's NAME must not survive in the payload either,
    // which is what filtering the directory as well as the activity buys.
    expect(JSON.stringify(res._body)).not.toContain('Hartley & Vine')
  })

  test('all three row-sets are filtered, so a firm cannot return through the merge', async () => {
    // The adviser counts, sessions and courses are merged into one row per firm
    // downstream. A filter missed on any one of them produces a firm with partial
    // numbers rather than an absent firm — a wrong row, which is harder to spot.
    activityStore.readAdoptionByFirm.mockResolvedValue(ACTIVITY)
    listFirms.mockResolvedValue([])
    const res = makeMockRes()

    await getAdoption(GROUP_MANAGER, res)

    expect(res._body.report.firms).toHaveLength(0)
    expect(JSON.stringify(res._body)).not.toContain('firm-a')
  })

  test('a mapped firm reaches its own group manager', async () => {
    setFirmMembership({ 'firm-a': { globalGroup: BRAND, country: 'DE' } })
    activityStore.readAdoptionByFirm.mockResolvedValue(ACTIVITY)
    listFirms.mockResolvedValue([{ id: 'firm-a', name: 'Hartley & Vine' }])
    const res = makeMockRes()

    await getAdoption(GROUP_MANAGER, res)

    expect(res._body.report.firms).toHaveLength(1)
    expect(res._body.report.firms[0].firmName).toBe('Hartley & Vine')
  })
})

// ── Logic Lab Report ──────────────────────────────────────────────────────────

describe('GET /api/mentor/logic-lab-report — how firms have configured the engine', () => {
  beforeEach(() => {
    overlay.listFirmIdsWithConfigKey.mockResolvedValue(['firm-a'])
    overlay.loadFirmConfig.mockResolvedValue([])
  })

  test('the mentor still sees the firm', async () => {
    const res = makeMockRes()

    await getLogicLabReport(MENTOR, res)

    expect(res._status).toBe(200)
    expect(res._body.report.firms).toHaveLength(1)
  })

  test('🔴 a group manager sees no firms', async () => {
    const res = makeMockRes()

    await getLogicLabReport(GROUP_MANAGER, res)

    expect(res._status).toBe(200)
    expect(res._body.report.firms).toHaveLength(0)
    expect(JSON.stringify(res._body)).not.toContain('firm-a')
  })

  test('a mapped firm reaches its own group manager', async () => {
    setFirmMembership({ 'firm-a': { globalGroup: BRAND, country: 'DE' } })
    const res = makeMockRes()

    await getLogicLabReport(GROUP_MANAGER, res)

    expect(res._body.report.firms).toHaveLength(1)
    // firmName, not firmId — this report has never had a firm-name table wired to
    // it, so the id IS the name shown on the page (see the note in the handler).
    expect(res._body.report.firms[0].firmName).toBe('firm-a')
  })
})

// ── The mount lines ───────────────────────────────────────────────────────────

describe('the three routes are mounted behind the managing-tier guard', () => {
  // Source-level tripwires. The filters above are only reached by a caller the
  // guard admitted, so losing a guard line would not fail any test above.
  const fs = require('fs')
  const path = require('path')
  const server = fs.readFileSync(path.resolve(__dirname, '../../server/restify-server.js'), 'utf8')

  test('all three use requireManagingTier', () => {
    expect(server).toContain("server.get('/api/mentor/cases', firmAuth, requireManagingTier, mentorRoute.listMentorCases)")
    expect(server).toContain("server.get('/api/mentor/adoption', firmAuth, requireManagingTier, mentorRoute.getAdoption)")
    expect(server).toContain("server.get('/api/mentor/logic-lab-report', firmAuth, requireManagingTier, mentorRoute.getLogicLabReport)")
  })

  test('🔴 TEMPLATE CHECK STAYS MENTOR-ONLY — all four of its routes', () => {
    // Ruled by the owner 2026-08-11: "template check should only be for the mentor
    // since we use it to improve the overall system. it does not relate to
    // people/advisor performance or group manager selection/access permission to
    // templates." The tab is off the two middle hubs (hubTabTiers.test.js); this is
    // the other half — the routes behind it never moved either, so widening the tab
    // back would not silently find an open door.
    for (const line of [
      "server.get('/api/mentor/template-check', ...mentorGuard, mentorRoute.getTemplateCheck)",
      "server.get('/api/mentor/template-check/patch', ...mentorGuard, mentorRoute.getTemplateCheckPatch)",
      "server.put('/api/mentor/template-check/rulings/:key', ...mentorGuard, mentorRoute.saveTemplateCheckRuling)",
      "server.del('/api/mentor/template-check/rulings/:key', ...mentorGuard, mentorRoute.deleteTemplateCheckRuling)"
    ]) {
      expect(server).toContain(line)
    }
    expect(server).toContain('const mentorGuard = [firmAuth, requireMentorRole]')
  })

  test('the Advisory Distinctions authoring routes stay mentor-only too', () => {
    // The mentor authors the platform set every firm inherits. A middle tier
    // reaching these would let it edit the origin of the cascade rather than its
    // own layer.
    expect(server).toContain("server.post('/api/mentor/distinctions', ...mentorGuard, mentorRoute.createMentorDistinction)")
    expect(server).toContain("server.put('/api/mentor/distinctions/:id', ...mentorGuard, mentorRoute.updateMentorDistinction)")
    expect(server).toContain("server.del('/api/mentor/distinctions/:id', ...mentorGuard, mentorRoute.deleteMentorDistinction)")
  })
})

// ── The honest-empty flag ─────────────────────────────────────────────────────

describe('every scoped report tells the screen WHICH empty it is', () => {
  // The filtering above makes a middle tier's reports empty. On its own that is a
  // blank panel reading "nobody is using it", which is a false statement about a
  // customer's own firms. Each payload therefore carries awaitingFirms so the
  // screen can say the true thing instead. tierAwaitingFirms.test.js proves the
  // flag's logic; these prove the routes actually send it.

  test('Case Reviews sends it — true for an unmapped tier, false for the mentor', async () => {
    db.execute.mockResolvedValue([[]])

    const forGroup = makeMockRes()
    await listMentorCases(GROUP_MANAGER, forGroup)
    expect(forGroup._body.awaitingFirms).toBe(true)

    const forMentor = makeMockRes()
    await listMentorCases(MENTOR, forMentor)
    expect(forMentor._body.awaitingFirms).toBe(false)
  })

  test('Adoption sends it, alongside the directory limit it already had', async () => {
    activityStore.readAdoptionByFirm.mockResolvedValue({ vaRows: [], courseRows: [], adviserRows: [] })
    listFirms.mockResolvedValue([])

    const forGroup = makeMockRes()
    await getAdoption(GROUP_MANAGER, forGroup)
    expect(forGroup._body.report.awaitingFirms).toBe(true)
    // The two limits are different statements and both survive. "The directory is
    // short" is not "there is nothing to read yet".
    expect(forGroup._body.report.directoryRead).toBe(false)

    const forMentor = makeMockRes()
    await getAdoption(MENTOR, forMentor)
    expect(forMentor._body.report.awaitingFirms).toBe(false)
  })

  test('the Logic Lab Report sends it', async () => {
    overlay.listFirmIdsWithConfigKey.mockResolvedValue([])
    overlay.loadFirmConfig.mockResolvedValue([])

    const forGroup = makeMockRes()
    await getLogicLabReport(GROUP_MANAGER, forGroup)
    expect(forGroup._body.report.awaitingFirms).toBe(true)

    const forMentor = makeMockRes()
    await getLogicLabReport(MENTOR, forMentor)
    expect(forMentor._body.report.awaitingFirms).toBe(false)
  })

  test('🔴 a MAPPED tier stops being told it is unconnected', async () => {
    // The banner must clear itself when the integration lands, with no code change.
    setFirmMembership({ 'firm-a': { globalGroup: BRAND, country: 'DE' } })
    db.execute.mockResolvedValue([[]])

    const res = makeMockRes()
    await listMentorCases(GROUP_MANAGER, res)
    expect(res._body.awaitingFirms).toBe(false)
  })
})
