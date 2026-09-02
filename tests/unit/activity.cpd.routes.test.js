'use strict'

// The three CPD routes. A claim is a professional declaration an advisor may submit
// to their own body, so these tests are mostly about what the routes REFUSE:
//
//   * nothing that gives a claim its value may come from the browser — the minutes,
//     the real title and the pledge are all resolved server-side;
//   * an advisor may only claim against templates their OWN work has used;
//   * a failed claim is reported, never swallowed, or an advisor believes they have
//     declared something they have not;
//   * a withdrawal cannot reach anyone else's record, and cannot be used to discover
//     that someone else's record exists.
//
// The STORE is mocked; the CATALOGUE is real (over a mocked template library), so the
// route↔catalogue contract is genuinely exercised rather than assumed.

process.env.MYSQL_DATABASE = 'virt_advisor_test'
process.env.MYSQL_PASSWORD = 'test'

jest.mock('../../server/utils/db', () => ({ execute: jest.fn() }))
jest.mock('../../server/utils/activityLogger', () => ({ logCourseSession: jest.fn() }))
jest.mock('../../server/utils/activityStore', () => ({
  readAdvisorSessions: jest.fn(),
  readAdvisorClaims: jest.fn(),
  recordCpdClaim: jest.fn(),
  withdrawCpdClaim: jest.fn()
}))
jest.mock('../../server/utils/templates', () => ({ getOrgTemplates: jest.fn(() => []) }))
// CPD follows the library in force (item 4.56). Resolved to null here — "no tier has
// uploaded" — so the catalogue prices from the mocked seed; the firm-library tests
// below override it. Without this mock the routes would walk the REAL store path and
// price the tests' claims from whatever library this machine's dev file holds.
jest.mock('../../server/utils/templateLibrary', () => ({
  loadEffectiveTemplates: jest.fn(() => Promise.resolve(null))
}))

const activityStore = require('../../server/utils/activityStore')
const { getOrgTemplates } = require('../../server/utils/templates')
const { loadEffectiveTemplates } = require('../../server/utils/templateLibrary')
const cpdCatalogue = require('../../server/utils/cpdCatalogue')
const { getCpd, recordCpd, withdrawCpd } = require('../../server/routes/activity')

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// A request as it looks AFTER firmAuth: identity attached from the verified JWT.
function makeReq (overrides = {}) {
  return {
    advisorId: 'advisor-from-jwt',
    firmId: 'firm-from-jwt',
    advisorName: 'Jordan Reeve',
    query: {},
    body: {},
    ...overrides
  }
}

const EOY = {
  page: 'id-eoy',
  title: 'E.O.Y Meeting',
  cpd: { isHidden: false, watchedVideo: 9, reviewTemplate: 60, reheasedTemplate: 30 }
}
const LOAN = {
  page: 'id-loan',
  title: 'Loan Estimator',
  cpd: { isHidden: false, watchedVideo: 12, reviewTemplate: 30, reheasedTemplate: 20 }
}
const NO_CPD = {
  page: 'id-plain',
  title: 'Plain Worksheet',
  cpd: { isHidden: false, watchedVideo: 0, reviewTemplate: 0, reheasedTemplate: 0 }
}

/** A stored claim row, as the store hands one back. */
const claimRow = over => Object.assign({
  id: 1,
  template_title: 'E.O.Y Meeting',
  template_page: 'id-eoy',
  activity: 'video',
  minutes: 9,
  pledge_key: 'cpd.pledge.video',
  pledge_version: 1,
  claimed_at: '2026-07-29 10:00:00',
  withdrawn_at: null
}, over)

/** What the advisor's own sessions used. */
function sessions ({ va = [], course = [] } = {}) {
  activityStore.readAdvisorSessions.mockResolvedValue({
    vaSessions: va,
    courseSessions: course
  })
}

let errorLog
beforeEach(() => {
  jest.clearAllMocks()
  getOrgTemplates.mockReturnValue([EOY, LOAN, NO_CPD])
  loadEffectiveTemplates.mockResolvedValue(null)
  cpdCatalogue.resetCache()
  activityStore.readAdvisorClaims.mockResolvedValue([])
  sessions()
  errorLog = jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => errorLog.mockRestore())

// ── getCpd ────────────────────────────────────────────────────────────────────

describe('getCpd', () => {
  test('returns 403 when the verified pass carries no advisor identity', async () => {
    const req = makeReq({ advisorId: null })
    const res = makeMockRes()

    await getCpd(req, res)

    expect(res._status).toBe(403)
    expect(res._body.error.code).toBe('NO_ADVISOR_IDENTITY')
    expect(res._body.success).toBe(false)
    expect(res._body.timestamp).toBeDefined()
    expect(activityStore.readAdvisorSessions).not.toHaveBeenCalled()
  })

  test('reads the record with the identity from the token, never the request', async () => {
    const req = makeReq({ query: { advisorId: 'someone-else' }, body: { firmId: 'another-firm' } })

    await getCpd(req, makeMockRes())

    expect(activityStore.readAdvisorSessions).toHaveBeenCalledWith('advisor-from-jwt', 'firm-from-jwt')
    expect(activityStore.readAdvisorClaims).toHaveBeenCalledWith('advisor-from-jwt', 'firm-from-jwt')
  })

  test('offers the three activities of a template the advisor has used', async () => {
    sessions({ va: [{ recommended_templates: ['e.o.y meeting'], completed_at: '2026-07-28 09:00:00' }] })
    const res = makeMockRes()

    await getCpd(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.templates).toHaveLength(1)
    const t = res._body.templates[0]
    expect(t.title).toBe('E.O.Y Meeting')
    expect(t.page).toBe('id-eoy')
    expect(t.lastUsedAt).toBe('2026-07-28 09:00:00')
    expect(t.activities.map(a => [a.activity, a.minutes]))
      .toEqual([['video', 9], ['reading', 60], ['rehearsal', 30]])
    expect(t.activities.map(a => a.pledgeKey))
      .toEqual(['cpd.pledge.video', 'cpd.pledge.reading', 'cpd.pledge.rehearsal'])
  })

  test('reads BOTH sources — client sessions and course sessions', async () => {
    sessions({
      va: [{ recommended_templates: ['e.o.y meeting'], completed_at: '2026-07-01 09:00:00' }],
      course: [{ session_resources: ['Loan Estimator'], completed_at: '2026-07-02 09:00:00' }]
    })
    const res = makeMockRes()

    await getCpd(makeReq(), res)

    expect(res._body.templates.map(t => t.title)).toEqual(['Loan Estimator', 'E.O.Y Meeting'])
  })

  test('parses a JSON column stored as a STRING, as the dev fallback stores it', async () => {
    sessions({ course: [{ session_resources: '["Loan Estimator"]', completed_at: '2026-07-02 09:00:00' }] })
    const res = makeMockRes()

    await getCpd(makeReq(), res)

    expect(res._body.templates.map(t => t.title)).toEqual(['Loan Estimator'])
  })

  test('a template used in several sessions is listed once, dated by its LATEST use', async () => {
    sessions({
      va: [
        { recommended_templates: ['e.o.y meeting'], completed_at: '2026-07-20 09:00:00' },
        { recommended_templates: ['e.o.y meeting'], completed_at: '2026-07-28 09:00:00' }
      ]
    })
    const res = makeMockRes()

    await getCpd(makeReq(), res)

    expect(res._body.templates).toHaveLength(1)
    expect(res._body.templates[0].lastUsedAt).toBe('2026-07-28 09:00:00')
  })

  test('a template carrying no CPD time is not offered', async () => {
    sessions({ va: [{ recommended_templates: ['Plain Worksheet'], completed_at: '2026-07-28 09:00:00' }] })
    const res = makeMockRes()

    await getCpd(makeReq(), res)

    expect(res._body.templates).toEqual([])
    expect(res._body.totalMinutes).toBe(0)
  })

  // The name is here for ONE reason: the record is printed and submitted to a
  // professional body, and a statement with no name on it is not a document. It comes
  // from the verified pass like every other piece of identity on this route.
  test('carries the display name from the verified pass', async () => {
    const res = makeMockRes()

    await getCpd(makeReq(), res)

    expect(res._body.advisorName).toBe('Jordan Reeve')
    expect(res._body.advisorId).toBe('advisor-from-jwt')
  })

  test('reports a missing display name as null rather than inventing one', async () => {
    const res = makeMockRes()

    await getCpd(makeReq({ advisorName: undefined }), res)

    expect(res._body.advisorName).toBeNull()
    // The id is still there, which is what the screen falls back to printing.
    expect(res._body.advisorId).toBe('advisor-from-jwt')
  })

  test('never takes the display name from the request', async () => {
    const res = makeMockRes()

    await getCpd(makeReq({
      advisorName: null,
      query: { advisorName: 'Someone Else' },
      body: { advisorName: 'Someone Else' }
    }), res)

    expect(res._body.advisorName).toBeNull()
  })

  test('an advisor who has done nothing gets an empty record, not an error', async () => {
    const res = makeMockRes()

    await getCpd(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body).toMatchObject({ success: true, totalMinutes: 0, claimedCount: 0, templates: [] })
  })

  test('counts standing claims into the running total', async () => {
    sessions({ va: [{ recommended_templates: ['e.o.y meeting'], completed_at: '2026-07-28 09:00:00' }] })
    activityStore.readAdvisorClaims.mockResolvedValue([
      claimRow({ id: 1 }),
      claimRow({ id: 2, activity: 'reading', minutes: 60 })
    ])
    const res = makeMockRes()

    await getCpd(makeReq(), res)

    expect(res._body.totalMinutes).toBe(69)
    expect(res._body.claimedCount).toBe(2)
  })

  test('a repeat claim counts again — the whole point of the ruling', async () => {
    sessions({ va: [{ recommended_templates: ['e.o.y meeting'], completed_at: '2026-07-28 09:00:00' }] })
    activityStore.readAdvisorClaims.mockResolvedValue([
      claimRow({ id: 1 }), claimRow({ id: 2 }), claimRow({ id: 3 })
    ])
    const res = makeMockRes()

    await getCpd(makeReq(), res)

    expect(res._body.totalMinutes).toBe(27)
    expect(res._body.claimedCount).toBe(3)
    const video = res._body.templates[0].activities.find(a => a.activity === 'video')
    expect(video.claimedCount).toBe(3)
    expect(video.claimedMinutes).toBe(27)
  })

  test('a WITHDRAWN claim stays visible but counts for nothing', async () => {
    // The row is kept deliberately: a figure may already have been submitted, and a
    // record that simply vanishes is worse than one showing a claim later withdrawn.
    sessions({ va: [{ recommended_templates: ['e.o.y meeting'], completed_at: '2026-07-28 09:00:00' }] })
    activityStore.readAdvisorClaims.mockResolvedValue([
      claimRow({ id: 1 }),
      claimRow({ id: 2, withdrawn_at: '2026-07-29 11:00:00' })
    ])
    const res = makeMockRes()

    await getCpd(makeReq(), res)

    expect(res._body.totalMinutes).toBe(9)
    expect(res._body.claimedCount).toBe(1)
    const video = res._body.templates[0].activities.find(a => a.activity === 'video')
    expect(video.claimedCount).toBe(1)
    expect(video.claims).toHaveLength(2)
    expect(video.claims[1].withdrawnAt).toBe('2026-07-29 11:00:00')
  })

  test('a claim survives the template dropping out of the advisor\'s recent work', async () => {
    // 200 sessions is the read cap, and the export gets re-authored. Neither may
    // orphan a standing claim.
    activityStore.readAdvisorClaims.mockResolvedValue([claimRow({ id: 7 })])
    const res = makeMockRes()

    await getCpd(makeReq(), res)

    expect(res._body.templates).toHaveLength(1)
    expect(res._body.templates[0].title).toBe('E.O.Y Meeting')
    expect(res._body.templates[0].lastUsedAt).toBeNull()
    expect(res._body.totalMinutes).toBe(9)
  })

  test('a claim against a template the export no longer carries is still counted', async () => {
    activityStore.readAdvisorClaims.mockResolvedValue([
      claimRow({ id: 9, template_title: 'Retired Template', minutes: 45, activity: 'reading', pledge_key: 'cpd.pledge.reading' })
    ])
    const res = makeMockRes()

    await getCpd(makeReq(), res)

    const t = res._body.templates[0]
    expect(t.title).toBe('Retired Template')
    // Recorded, but not claimable again — there is no allowance to offer.
    expect(t.activities[0].minutes).toBeNull()
    expect(t.activities[0].claimedMinutes).toBe(45)
    expect(res._body.totalMinutes).toBe(45)
  })

  test('the title stored ON the claim is used when the export no longer knows it', async () => {
    activityStore.readAdvisorClaims.mockResolvedValue([
      claimRow({ template_title: 'E.O.Y Meeting (2025 edition)' })
    ])
    const res = makeMockRes()

    await getCpd(makeReq(), res)

    expect(res._body.templates[0].title).toBe('E.O.Y Meeting (2025 edition)')
  })

  test('a claim matches its template regardless of how the name was cased', async () => {
    sessions({ va: [{ recommended_templates: ['e.o.y meeting'], completed_at: '2026-07-28 09:00:00' }] })
    activityStore.readAdvisorClaims.mockResolvedValue([claimRow({ template_title: 'E.O.Y  MEETING' })])
    const res = makeMockRes()

    await getCpd(makeReq(), res)

    expect(res._body.templates).toHaveLength(1)
    expect(res._body.templates[0].activities.find(a => a.activity === 'video').claimedCount).toBe(1)
  })

  test('orders by most recent work first, with claimed-but-unused last', async () => {
    sessions({
      va: [{ recommended_templates: ['e.o.y meeting'], completed_at: '2026-07-28 09:00:00' }],
      course: [{ session_resources: ['Loan Estimator'], completed_at: '2026-07-29 09:00:00' }]
    })
    activityStore.readAdvisorClaims.mockResolvedValue([
      claimRow({ template_title: 'Retired Template', minutes: 5 })
    ])
    const res = makeMockRes()

    await getCpd(makeReq(), res)

    expect(res._body.templates.map(t => t.title))
      .toEqual(['Loan Estimator', 'E.O.Y Meeting', 'Retired Template'])
  })

  test('a malformed template list costs that row, not the whole record', async () => {
    sessions({
      va: [
        { recommended_templates: '{ not json', completed_at: '2026-07-27 09:00:00' },
        { recommended_templates: ['e.o.y meeting'], completed_at: '2026-07-28 09:00:00' }
      ]
    })
    const res = makeMockRes()

    await getCpd(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.templates.map(t => t.title)).toEqual(['E.O.Y Meeting'])
  })

  test('non-string entries in a stored list are ignored', async () => {
    sessions({ va: [{ recommended_templates: [null, 42, {}, 'e.o.y meeting'], completed_at: '2026-07-28 09:00:00' }] })
    const res = makeMockRes()

    await getCpd(makeReq(), res)

    expect(res._body.templates.map(t => t.title)).toEqual(['E.O.Y Meeting'])
  })

  test('a store failure is reported, never rendered as an empty record', async () => {
    // The honest-failure rule: an unreachable store and an advisor with no claims
    // must never produce the same screen.
    activityStore.readAdvisorClaims.mockRejectedValue(new Error('connection refused'))
    const res = makeMockRes()

    await getCpd(makeReq(), res)

    expect(res._status).toBe(500)
    expect(res._body.error.code).toBe('DB_ERROR')
    expect(JSON.stringify(res._body)).not.toContain('connection refused')
    expect(errorLog).toHaveBeenCalled()
  })
})

// ── recordCpd ─────────────────────────────────────────────────────────────────

describe('recordCpd', () => {
  const used = () => sessions({
    va: [{ recommended_templates: ['e.o.y meeting'], completed_at: '2026-07-28 09:00:00' }]
  })

  test('returns 403 when the verified pass carries no advisor identity', async () => {
    const res = makeMockRes()

    await recordCpd(makeReq({ advisorId: null, body: { templateTitle: 'E.O.Y Meeting', activity: 'video' } }), res)

    expect(res._status).toBe(403)
    expect(res._body.error.code).toBe('NO_ADVISOR_IDENTITY')
    expect(activityStore.recordCpdClaim).not.toHaveBeenCalled()
  })

  test('stores the claim with values resolved SERVER-SIDE', async () => {
    used()
    activityStore.recordCpdClaim.mockResolvedValue({ id: 1 })
    const res = makeMockRes()

    await recordCpd(makeReq({ body: { templateTitle: 'e.o.y meeting', activity: 'rehearsal' } }), res)

    expect(res._status).toBe(200)
    expect(activityStore.recordCpdClaim).toHaveBeenCalledWith({
      advisorId: 'advisor-from-jwt',
      advisorName: 'Jordan Reeve',
      firmId: 'firm-from-jwt',
      templateTitle: 'E.O.Y Meeting',
      templatePage: 'id-eoy',
      activity: 'rehearsal',
      minutes: 30,
      pledgeKey: 'cpd.pledge.rehearsal',
      pledgeVersion: 1
    })
  })

  test('a client naming its own minutes cannot inflate the claim', async () => {
    // The one that matters most: a CPD total is a regulated figure.
    used()
    activityStore.recordCpdClaim.mockResolvedValue({ id: 1 })

    await recordCpd(makeReq({
      body: { templateTitle: 'E.O.Y Meeting', activity: 'video', minutes: 9999, pledgeVersion: 99 }
    }), makeMockRes())

    expect(activityStore.recordCpdClaim).toHaveBeenCalledWith(
      expect.objectContaining({ minutes: 9, pledgeVersion: 1 })
    )
  })

  test('a client naming another advisor cannot claim on their behalf', async () => {
    used()
    activityStore.recordCpdClaim.mockResolvedValue({ id: 1 })

    await recordCpd(makeReq({
      body: { templateTitle: 'E.O.Y Meeting', activity: 'video', advisorId: 'someone-else', firmId: 'another-firm' }
    }), makeMockRes())

    expect(activityStore.recordCpdClaim).toHaveBeenCalledWith(
      expect.objectContaining({ advisorId: 'advisor-from-jwt', firmId: 'firm-from-jwt' })
    )
  })

  test('refuses a template the advisor\'s own work has never used', async () => {
    // Otherwise the whole library is claimable by anyone who knows a title.
    used()
    const res = makeMockRes()

    await recordCpd(makeReq({ body: { templateTitle: 'Loan Estimator', activity: 'video' } }), res)

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('NOT_CLAIMABLE')
    expect(activityStore.recordCpdClaim).not.toHaveBeenCalled()
  })

  test('refuses an activity the template carries no time for', async () => {
    sessions({ va: [{ recommended_templates: ['Plain Worksheet'], completed_at: '2026-07-28 09:00:00' }] })
    const res = makeMockRes()

    await recordCpd(makeReq({ body: { templateTitle: 'Plain Worksheet', activity: 'video' } }), res)

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('NOT_CLAIMABLE')
    expect(activityStore.recordCpdClaim).not.toHaveBeenCalled()
  })

  test.each([
    ['an empty body', {}],
    ['no activity', { templateTitle: 'E.O.Y Meeting' }],
    ['an unknown activity', { templateTitle: 'E.O.Y Meeting', activity: 'napping' }],
    ['no template', { activity: 'video' }],
    ['a non-string template', { templateTitle: 42, activity: 'video' }]
  ])('refuses %s with INVALID_CLAIM', async (_label, body) => {
    used()
    const res = makeMockRes()

    await recordCpd(makeReq({ body }), res)

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('INVALID_CLAIM')
    expect(activityStore.readAdvisorSessions).not.toHaveBeenCalled()
    expect(activityStore.recordCpdClaim).not.toHaveBeenCalled()
  })

  test('an advisor with no name on their token still records a claim', async () => {
    used()
    activityStore.recordCpdClaim.mockResolvedValue({ id: 1 })

    await recordCpd(makeReq({ advisorName: undefined, body: { templateTitle: 'E.O.Y Meeting', activity: 'video' } }), makeMockRes())

    expect(activityStore.recordCpdClaim).toHaveBeenCalledWith(
      expect.objectContaining({ advisorName: null })
    )
  })

  test('returns the stored claim so the screen can show it without re-reading', async () => {
    used()
    activityStore.recordCpdClaim.mockResolvedValue({ id: 42, minutes: 9 })
    const res = makeMockRes()

    await recordCpd(makeReq({ body: { templateTitle: 'E.O.Y Meeting', activity: 'video' } }), res)

    expect(res._body).toEqual({ success: true, claim: { id: 42, minutes: 9 } })
  })

  test('a failed write is REPORTED, not swallowed like a session write', async () => {
    // activityLogger deliberately swallows — it must never interrupt a live session.
    // A claim is a deliberate act: an advisor who is not told it failed will believe
    // they have declared something they have not.
    used()
    activityStore.recordCpdClaim.mockRejectedValue(new Error('table advisor_cpd_claims missing'))
    const res = makeMockRes()

    await recordCpd(makeReq({ body: { templateTitle: 'E.O.Y Meeting', activity: 'video' } }), res)

    expect(res._status).toBe(500)
    expect(res._body.error.code).toBe('CPD_RECORD_FAILED')
    expect(JSON.stringify(res._body)).not.toContain('advisor_cpd_claims')
    expect(errorLog).toHaveBeenCalled()
  })
})

// ── withdrawCpd ───────────────────────────────────────────────────────────────

describe('withdrawCpd', () => {
  test('returns 403 when the verified pass carries no advisor identity', async () => {
    const res = makeMockRes()

    await withdrawCpd(makeReq({ advisorId: null, body: { claimId: 1 } }), res)

    expect(res._status).toBe(403)
    expect(activityStore.withdrawCpdClaim).not.toHaveBeenCalled()
  })

  test('withdraws with the identity from the token, never the request', async () => {
    activityStore.withdrawCpdClaim.mockResolvedValue(true)
    const res = makeMockRes()

    await withdrawCpd(makeReq({ body: { claimId: 7, advisorId: 'someone-else' } }), res)

    expect(activityStore.withdrawCpdClaim).toHaveBeenCalledWith(7, 'advisor-from-jwt', 'firm-from-jwt')
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ success: true })
  })

  test('accepts a numeric string, as JSON round-tripping produces', async () => {
    activityStore.withdrawCpdClaim.mockResolvedValue(true)

    await withdrawCpd(makeReq({ body: { claimId: '7' } }), makeMockRes())

    expect(activityStore.withdrawCpdClaim).toHaveBeenCalledWith(7, 'advisor-from-jwt', 'firm-from-jwt')
  })

  test.each([
    ['no id', {}],
    ['null', { claimId: null }],
    ['an empty string', { claimId: '' }],
    ['zero', { claimId: 0 }],
    ['a negative id', { claimId: -1 }],
    ['a fraction', { claimId: 1.5 }],
    ['text', { claimId: 'abc' }],
    ['an object', { claimId: {} }],
    ['an array', { claimId: [1] }],
    ['beyond the column', { claimId: 4294967296 }]
  ])('refuses %s', async (_label, body) => {
    const res = makeMockRes()

    await withdrawCpd(makeReq({ body }), res)

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('INVALID_CLAIM')
    expect(activityStore.withdrawCpdClaim).not.toHaveBeenCalled()
  })

  test('a claim that is not the advisor\'s own reports the same as one that does not exist', async () => {
    // One answer for all three cases, so the route cannot be used to probe for other
    // advisors' claims.
    activityStore.withdrawCpdClaim.mockResolvedValue(false)
    const res = makeMockRes()

    await withdrawCpd(makeReq({ body: { claimId: 999 } }), res)

    expect(res._status).toBe(404)
    expect(res._body.error.code).toBe('CLAIM_NOT_FOUND')
  })

  test('a store failure is reported rather than reading as a successful withdrawal', async () => {
    activityStore.withdrawCpdClaim.mockRejectedValue(new Error('connection refused'))
    const res = makeMockRes()

    await withdrawCpd(makeReq({ body: { claimId: 1 } }), res)

    expect(res._status).toBe(500)
    expect(res._body.error.code).toBe('CPD_WITHDRAW_FAILED')
    expect(JSON.stringify(res._body)).not.toContain('connection refused')
  })

  test('a missing body does not throw', async () => {
    const res = makeMockRes()

    await withdrawCpd(makeReq({ body: undefined }), res)

    expect(res._status).toBe(400)
  })
})

// ── CPD follows the library in force — item 4.56, Mike's ruling 2026-09-01 ────
// A firm that uploads its own library is recommended from it, so what its advisors
// may claim must be priced from the SAME library — never the platform's.

describe('the library in force', () => {
  // The firm's own version of E.O.Y Meeting: different page, different minutes.
  const FIRM_EOY = {
    page: 'firm-eoy',
    title: 'E.O.Y Meeting',
    cpd: { isHidden: false, watchedVideo: 4, reviewTemplate: 20, reheasedTemplate: 0 }
  }

  test('getCpd asks for the library in force for the firm on the TOKEN', async () => {
    await getCpd(makeReq(), makeMockRes())

    expect(loadEffectiveTemplates).toHaveBeenCalledWith('firm-from-jwt')
  })

  test('getCpd prices claimable activities from the firm library, not the seed', async () => {
    loadEffectiveTemplates.mockResolvedValue([FIRM_EOY])
    sessions({ va: [{ recommended_templates: ['e.o.y meeting'], completed_at: '2026-07-28 09:00:00' }] })
    const res = makeMockRes()

    await getCpd(makeReq(), res)

    const t = res._body.templates[0]
    expect(t.page).toBe('firm-eoy')
    // Rehearsal carries no time in the firm's library, so it is not offered — even
    // though the platform seed offers 30 minutes for it.
    expect(t.activities.map(a => [a.activity, a.minutes]))
      .toEqual([['video', 4], ['reading', 20]])
  })

  test('a firm library replaces the seed WHOLESALE — a seed-only template is not claimable', async () => {
    loadEffectiveTemplates.mockResolvedValue([FIRM_EOY])
    // Loan Estimator exists only in the platform seed.
    sessions({ course: [{ session_resources: ['Loan Estimator'], completed_at: '2026-07-02 09:00:00' }] })
    const res = makeMockRes()

    await getCpd(makeReq(), res)

    expect(res._body.templates).toEqual([])
  })

  test('a standing claim survives a library swap as history, minutes frozen', async () => {
    // The claim was recorded under the platform seed (9 minutes of video). The firm
    // then uploads a library with no video time for that template. The claim must
    // stay on the record at its FROZEN figure — never repriced, never dropped.
    loadEffectiveTemplates.mockResolvedValue([{
      page: 'firm-eoy',
      title: 'E.O.Y Meeting',
      cpd: { isHidden: false, watchedVideo: 0, reviewTemplate: 20, reheasedTemplate: 0 }
    }])
    sessions({ va: [{ recommended_templates: ['e.o.y meeting'], completed_at: '2026-07-28 09:00:00' }] })
    activityStore.readAdvisorClaims.mockResolvedValue([claimRow()])
    const res = makeMockRes()

    await getCpd(makeReq(), res)

    const video = res._body.templates[0].activities.find(a => a.activity === 'video')
    // No longer offered by the library in force…
    expect(video.minutes).toBeNull()
    // …but the claim stands at the minutes it was recorded with.
    expect(video.claimedMinutes).toBe(9)
    expect(res._body.totalMinutes).toBe(9)
  })

  test('recordCpd stores the FIRM library\'s minutes, not the seed\'s', async () => {
    loadEffectiveTemplates.mockResolvedValue([FIRM_EOY])
    sessions({ va: [{ recommended_templates: ['e.o.y meeting'], completed_at: '2026-07-28 09:00:00' }] })
    activityStore.recordCpdClaim.mockResolvedValue({ id: 1 })
    const res = makeMockRes()

    await recordCpd(makeReq({ body: { templateTitle: 'E.O.Y Meeting', activity: 'video' } }), res)

    expect(res._status).toBe(200)
    expect(activityStore.recordCpdClaim).toHaveBeenCalledWith(
      expect.objectContaining({ minutes: 4, templatePage: 'firm-eoy' })
    )
  })

  test('recordCpd refuses an activity the library in force does not offer, even though the seed does', async () => {
    loadEffectiveTemplates.mockResolvedValue([FIRM_EOY])
    sessions({ va: [{ recommended_templates: ['e.o.y meeting'], completed_at: '2026-07-28 09:00:00' }] })
    const res = makeMockRes()

    // The seed offers 30 minutes of rehearsal; the firm's library offers none.
    await recordCpd(makeReq({ body: { templateTitle: 'E.O.Y Meeting', activity: 'rehearsal' } }), res)

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('NOT_CLAIMABLE')
    expect(activityStore.recordCpdClaim).not.toHaveBeenCalled()
  })

  test('when no tier has uploaded, behaviour is exactly the platform seed', async () => {
    loadEffectiveTemplates.mockResolvedValue(null)
    sessions({ va: [{ recommended_templates: ['e.o.y meeting'], completed_at: '2026-07-28 09:00:00' }] })
    activityStore.recordCpdClaim.mockResolvedValue({ id: 1 })
    const res = makeMockRes()

    await recordCpd(makeReq({ body: { templateTitle: 'E.O.Y Meeting', activity: 'video' } }), res)

    expect(activityStore.recordCpdClaim).toHaveBeenCalledWith(
      expect.objectContaining({ minutes: 9, templatePage: 'id-eoy' })
    )
  })
})
