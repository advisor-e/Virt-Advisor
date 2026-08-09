'use strict'

// GET /api/mentor/adoption — the route, its guard, and the two reads that fail
// differently on purpose.
//
// Design: design/mockups/mentor-adoption-view.html (ruled by Mike 2026-08-09).
// The maths lives in tests/unit/mentorAdoption.test.js; this file is about the
// wiring — that the route is mentor-gated, that the firms directory is an
// enrichment rather than a dependency, and that a real fault still says so.

const fs = require('fs')
const path = require('path')

jest.mock('../../server/utils/activityStore', () => ({ readAdoptionByFirm: jest.fn() }))
jest.mock('../../server/utils/firmsDirectory', () => ({ listFirms: jest.fn() }))

const activityStore = require('../../server/utils/activityStore')
const { listFirms } = require('../../server/utils/firmsDirectory')
const { getAdoption } = require('../../server/routes/mentor')

// Mirrors mentor.routes.test.js. writeHead/end are not optional: sendError uses
// them for the error path, so a stub with only send() passes every happy-path test
// and throws on the one case the error envelope exists for.
function makeRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { try { this._body = JSON.parse(body) } catch (e) { this._body = body } }
  }
}

const read = rel => fs.readFileSync(path.resolve(__dirname, '../../', rel), 'utf8')

const SOME_ACTIVITY = {
  vaRows: [{ firm_id: 'firm-a', sessions: 40, last_active: new Date().toISOString() }],
  courseRows: [{ firm_id: 'firm-a', courses: 9, avg_score: 71, last_active: new Date().toISOString() }],
  adviserRows: [{ firm_id: 'firm-a', advisers: 4 }]
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => jest.restoreAllMocks())

describe('the route is mounted behind the mentor guard', () => {
  // A source-level tripwire, matching the one on the quiz fencing. The whole
  // defence of a cross-firm read is the role gate in front of it, and that gate
  // lives in one line of restify-server.js that nothing else would notice losing.
  const server = read('server/restify-server.js')

  test('GET /api/mentor/adoption requires firmAuth AND requireMentorRole', () => {
    expect(server).toContain(
      "server.get('/api/mentor/adoption', firmAuth, requireMentorRole, mentorRoute.getAdoption)"
    )
  })

  test('it is not registered anywhere as a firm-manager route', () => {
    // The firm-manager guard allows a manager OR an admin. Mounting this there would
    // hand every firm manager a read of every other firm's activity.
    expect(server).not.toMatch(/fmGuard[^\n]*getAdoption/)
  })
})

describe('getAdoption', () => {
  test('returns the report, with a row per firm', async () => {
    activityStore.readAdoptionByFirm.mockResolvedValue(SOME_ACTIVITY)
    listFirms.mockResolvedValue([{ id: 'firm-a', name: 'Hartley & Vine' }])
    const res = makeRes()

    await getAdoption({}, res)

    expect(res._status).toBe(200)
    expect(res._body.success).toBe(true)
    expect(res._body.report.firms).toHaveLength(1)
    expect(res._body.report.firms[0].firmName).toBe('Hartley & Vine')
    expect(res._body.report.quietAfterDays).toBe(60)
  })

  test('a firm that has never started comes from the directory, not the activity', async () => {
    activityStore.readAdoptionByFirm.mockResolvedValue(SOME_ACTIVITY)
    listFirms.mockResolvedValue([
      { id: 'firm-a', name: 'Hartley & Vine' },
      { id: 'firm-z', name: 'Pentland Fiscal' }
    ])
    const res = makeRes()

    await getAdoption({}, res)

    const never = res._body.report.firms.find(f => f.firmId === 'firm-z')
    expect(never.status).toBe('never')
    expect(res._body.report.directoryRead).toBe(true)
  })

  test('THE DIRECTORY IS AN ENRICHMENT — if it fails, the page still renders', async () => {
    // The activity is the page. Losing the firms list costs the never-started rows
    // and the names, which is the information the mentor had before this page
    // existed — so it degrades rather than fails.
    activityStore.readAdoptionByFirm.mockResolvedValue(SOME_ACTIVITY)
    listFirms.mockRejectedValue(new Error('no firms table'))
    const res = makeRes()

    await getAdoption({}, res)

    expect(res._status).toBe(200)
    expect(res._body.report.firms).toHaveLength(1)
    // ...and it SAYS the list is short, rather than letting a shorter list read as a
    // healthier platform. This flag is the whole reason the degrade is honest.
    expect(res._body.report.directoryRead).toBe(false)
    expect(console.error).toHaveBeenCalled()
  })

  test('an empty directory reads as unknown, not as a platform with no firms', async () => {
    activityStore.readAdoptionByFirm.mockResolvedValue(SOME_ACTIVITY)
    listFirms.mockResolvedValue([])
    const res = makeRes()

    await getAdoption({}, res)

    expect(res._body.report.directoryRead).toBe(false)
    // The firm with activity survives — the directory never filters.
    expect(res._body.report.firms.map(f => f.firmId)).toEqual(['firm-a'])
  })

  test('THE ACTIVITY IS THE PAGE — if it fails, the route fails, in the standard envelope', async () => {
    activityStore.readAdoptionByFirm.mockRejectedValue(new Error('db down'))
    const res = makeRes()

    await getAdoption({}, res)

    expect(res._status).toBe(500)
    expect(res._body.success).toBe(false)
    expect(res._body.error.code).toBe('DB_ERROR')
    // No stack trace, file path or raw SQL error reaches the browser.
    expect(JSON.stringify(res._body)).not.toContain('db down')
  })

  test('no adviser identity reaches the response', async () => {
    activityStore.readAdoptionByFirm.mockResolvedValue({
      ...SOME_ACTIVITY,
      // A column nobody should be selecting, present anyway.
      adviserRows: [{ firm_id: 'firm-a', advisers: 4, advisor_name: 'Jo Smith' }]
    })
    listFirms.mockResolvedValue([{ id: 'firm-a', name: 'A' }])
    const res = makeRes()

    await getAdoption({}, res)

    expect(res._status).toBe(200)
    expect(JSON.stringify(res._body)).not.toContain('Jo Smith')
  })
})

describe('the SQL selects counts, and never a person', () => {
  // The safest way for a name not to reach a cross-firm payload is for it never to
  // be read. Asserted against the source because that is where the decision lives.
  const store = read('server/utils/activityStore.js')
  const adoptionSql = store.slice(
    store.indexOf('const SQL_ADOPTION_VA'),
    store.indexOf('const SQL_INSERT_VA')
  )

  test('advisor_name is never selected by any adoption query', () => {
    expect(adoptionSql).not.toContain('advisor_name')
  })

  test('advisor_id is counted, never returned', () => {
    // It HAS to be read to be counted, and the UNION subquery legitimately selects
    // it — that inner select is what makes "advisers" a count of people rather than
    // of rows. What must never happen is an OUTER select returning it. Every outer
    // select in this block starts `SELECT firm_id, COUNT(`, which is the property
    // worth pinning; the route test above proves nothing personal reaches the wire.
    expect(adoptionSql).toContain('COUNT(DISTINCT advisor_id)')
    const outerSelects = adoptionSql.match(/`SELECT[^\n]*/g) || []
    expect(outerSelects).toHaveLength(3)
    for (const sel of outerSelects) {
      expect(sel).toMatch(/^`SELECT firm_id, COUNT\(/)
    }
  })
})
