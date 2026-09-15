'use strict'

// GET /api/model-choices — item 7.5. The route, its guard, and the tier scoping.
//
// Design: design/mockups/model-choices.html, all three decisions ruled by Mike
// 2026-09-16. The scan's own behaviour is tests/unit/modelChoiceScan.test.js; this
// file is about the wiring — who may read it, whose rows they get, and that a real
// fault still says so.
//
// 🔴 THE TEST THIS FILE EXISTS FOR IS THE CROSS-FIRM ONE. A firm manager must read
// their own firm's rows and nobody else's. UAT cannot catch that: a tester signs in
// as one firm, sees plausible rows, and has no way to know whether a second firm's
// rows would have been in them.

const fs = require('fs')
const path = require('path')

jest.mock('../../server/utils/activityStore', () => ({ readModelChoices: jest.fn() }))

const activityStore = require('../../server/utils/activityStore')
const { getModelChoices } = require('../../server/routes/modelChoices')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')
const { loadReportModels } = require('../../server/utils/reportModels')

const ROUTE_A = loadReportModels().models[0].route
const NAME_A = loadReportModels().models[0].name
const ROUTE_B = loadReportModels().models[1].route

const MENTOR = { firmId: PLATFORM_SCOPE }
const FIRM_A = { firmId: 'firm-a' }

// Mirrors mentorAdoption.routes.test.js — writeHead/end are not optional, because
// sendError uses them and a stub with only send() throws on the one path the error
// envelope exists for.
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

function row (over) {
  return Object.assign({
    advisor_id: 'adv-1',
    advisor_name: 'A. Advisor',
    firm_id: 'firm-a',
    domain: 'forecasting',
    model_route: ROUTE_A,
    declined: 0,
    source: 'declared',
    phase: 'recommendation',
    chosen_at: '2026-09-16 10:00:00'
  }, over)
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => jest.restoreAllMocks())

describe('the route is mounted behind an auth guard', () => {
  // A source-level tripwire, in the idiom of mentorAdoption.routes.test.js. The whole
  // defence of a read that crosses firms at the top three tiers is the guard in front
  // of it, which lives in one line nothing else would notice losing.
  const server = fs.readFileSync(path.resolve(__dirname, '../../server/restify-server.js'), 'utf8')

  test('GET /api/model-choices requires firmAuth AND requireManagerRole', () => {
    const line = server.split('\n').find(l => l.includes("server.get('/api/model-choices'"))
    expect(line).toBeDefined()
    expect(line).toContain('firmAuth')
    // requireManagerRole, NOT requireManagingTier: Decision 3 put this at all four
    // tiers, and a FIRM manager reads it. Narrowing it back to the managing tiers
    // would silently remove the tier the widening was for.
    expect(line).toContain('requireManagerRole')
  })

  test('the Nuxt proxy carries the path, or the tab is a 404 in the browser', () => {
    // Three features have shipped with every backend route serving and no proxy line.
    const nuxt = fs.readFileSync(path.resolve(__dirname, '../../nuxt.config.js'), 'utf8')
    expect(nuxt).toContain("path: '/api/model-choices'")
  })
})

describe('scoping — whose rows a caller gets', () => {
  test('a firm manager reads their own firm, asked for in the query itself', async () => {
    activityStore.readModelChoices.mockResolvedValue([row()])
    const res = makeRes()
    await getModelChoices(FIRM_A, res)
    // Scoped in SQL rather than filtered after: the firm id is passed down.
    expect(activityStore.readModelChoices).toHaveBeenCalledWith('firm-a')
    expect(res._status).toBe(200)
    expect(res._body.tier).toBe('firm_manager')
  })

  test('the mentor reads every firm', async () => {
    activityStore.readModelChoices.mockResolvedValue([
      row(), row({ firm_id: 'firm-b', model_route: ROUTE_B })
    ])
    const res = makeRes()
    await getModelChoices(MENTOR, res)
    expect(activityStore.readModelChoices).toHaveBeenCalledWith(null)
    expect(res._body.rows).toHaveLength(2)
    expect(res._body.tier).toBe('mentor')
  })

  test('a request carrying no scope is refused rather than answered broadly', async () => {
    const res = makeRes()
    await getModelChoices({}, res)
    expect(res._status).toBe(400)
    expect(activityStore.readModelChoices).not.toHaveBeenCalled()
  })

  test('no firmId is ever read from the request body or query', async () => {
    activityStore.readModelChoices.mockResolvedValue([])
    const res = makeRes()
    // An IDOR attempt: the caller is firm-a and asks for firm-b.
    await getModelChoices({ firmId: 'firm-a', params: { firmId: 'firm-b' }, query: { firmId: 'firm-b' }, body: { firmId: 'firm-b' } }, res)
    expect(activityStore.readModelChoices).toHaveBeenCalledWith('firm-a')
  })
})

describe('the three bands the screen draws', () => {
  test('totals separate named, declined and found-in-prose', async () => {
    activityStore.readModelChoices.mockResolvedValue([
      row(),
      row({ source: 'prose' }),
      row({ model_route: null, declined: 1, domain: 'governance' })
    ])
    const res = makeRes()
    await getModelChoices(FIRM_A, res)
    expect(res._body.totals).toEqual({ named: 2, declined: 1, viaProse: 1 })
  })

  test('a decline never lands in the model pairings', async () => {
    // 🔴 The pairing table answers "which model for which problem". A decline named no
    // model, so a row for it would invent a pairing that never happened.
    activityStore.readModelChoices.mockResolvedValue([
      row({ model_route: null, declined: 1, domain: 'governance' })
    ])
    const res = makeRes()
    await getModelChoices(FIRM_A, res)
    expect(res._body.pairings).toEqual([])
    expect(res._body.declines).toEqual([{ domain: 'governance', count: 1 }])
  })

  test('pairings count the domain-and-model pair, commonest first', async () => {
    activityStore.readModelChoices.mockResolvedValue([
      row(), row(), row({ domain: 'governance' })
    ])
    const res = makeRes()
    await getModelChoices(FIRM_A, res)
    expect(res._body.pairings[0]).toEqual({ domain: 'forecasting', route: ROUTE_A, model: NAME_A, count: 2 })
    expect(res._body.pairings[1].count).toBe(1)
  })

  test('a route no longer in the catalogue renders as itself rather than blank', async () => {
    // A row written before a model was renamed still has to mean something to a reader.
    activityStore.readModelChoices.mockResolvedValue([row({ model_route: '/retired-model' })])
    const res = makeRes()
    await getModelChoices(FIRM_A, res)
    expect(res._body.rows[0].model).toBe('/retired-model')
  })

  test('declined survives as a boolean whether the store returns 1 or true', async () => {
    // MySQL hands back TINYINT 1; the dev-file fallback hands back what it was given.
    // A screen that tested truthiness of the raw value would read them the same, but a
    // strict comparison would not — so the route settles it once, here.
    activityStore.readModelChoices.mockResolvedValue([
      row({ model_route: null, declined: true, domain: 'conflict' })
    ])
    const res = makeRes()
    await getModelChoices(FIRM_A, res)
    expect(res._body.rows[0].declined).toBe(true)
    expect(res._body.totals.declined).toBe(1)
  })
})

describe('the rows carry no advisor text, by construction', () => {
  test('nothing the advisor typed appears in the payload', async () => {
    // Decision 2, and the reason the page can be read across firms at all. The table
    // has no column for it, so this asserts the payload's SHAPE — a future field named
    // situation/query/notes would fail here before it reached a screen.
    activityStore.readModelChoices.mockResolvedValue([row()])
    const res = makeRes()
    await getModelChoices(MENTOR, res)
    expect(Object.keys(res._body.rows[0]).sort()).toEqual(
      ['advisorId', 'advisorName', 'at', 'declined', 'domain', 'firmId', 'model', 'phase', 'route', 'source'].sort()
    )
  })
})

describe('a real fault says so', () => {
  test('a store failure is a 500 with no stack trace', async () => {
    activityStore.readModelChoices.mockRejectedValue(new Error('ER_NO_SUCH_TABLE: /srv/secret/path'))
    const res = makeRes()
    await getModelChoices(FIRM_A, res)
    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toContain('/srv/secret/path')
  })
})
