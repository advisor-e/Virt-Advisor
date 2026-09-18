'use strict'

// The Strategy Planner's routes — item 15.1. The wiring, the guards, and the firm boundary.
//
// Design: design/mockups/strategy-planner.html, eleven decisions ruled by Mike 2026-09-16.
// The store's own behaviour is tests/unit/strategySessionStore.test.js and the framework
// loader's is tests/unit/strategyFrameworks.test.js; this file is about what the HTTP layer
// lets through.
//
// 🔴 THE TESTS THIS FILE EXISTS FOR:
//
//   1. THE FIRM COMES FROM THE TOKEN, NEVER THE REQUEST. A firmId in a body would be an
//      IDOR straight into another firm's client plans. A tester signs in as one firm, sees
//      their own sessions, and has no way to discover that a crafted body would have
//      reached someone else's.
//   2. A BOX NOBODY AUTHORED IS REFUSED. Without that check a malformed or hostile body
//      invents rows in a client's plan that no screen will ever render and nobody will
//      ever find.
//   3. A SESSION IN ANOTHER FIRM IS 404, NOT 403. A 403 confirms the id exists, so ids
//      could be probed one number at a time.
//
// None of the three is visible to a person testing the screen.

jest.mock('../../server/utils/strategySessionStore', () => ({
  createSession: jest.fn(),
  getSession: jest.fn(),
  listSessionsForClient: jest.fn(),
  setScope: jest.fn(),
  saveEntry: jest.fn(),
  loadEntries: jest.fn(),
  loadTimeline: jest.fn(),
  openField: jest.fn(),
  closeOpenField: jest.fn()
}))

const store = require('../../server/utils/strategySessionStore')
const routes = require('../../server/routes/strategyPlanner')

// Mirrors modelChoices.routes.test.js — writeHead/end are not optional, because sendError
// uses them and a stub with only send() throws on the one path the error envelope is for.
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

const FIRM = 'firm-a'
const ADVISOR = { firmId: FIRM, advisorId: 'adv-1', advisorName: 'D. Okafor' }

function req (over) {
  return Object.assign({ query: {}, params: {}, body: {} }, ADVISOR, over || {})
}

beforeEach(() => {
  jest.clearAllMocks()
  // A session that exists and belongs to FIRM, unless a test says otherwise.
  store.getSession.mockResolvedValue({ id: 7, firmId: FIRM, clientId: 'client-1' })
  store.loadEntries.mockResolvedValue([])
  store.loadTimeline.mockResolvedValue([])
})

describe('GET /api/strategy/frameworks', () => {
  it('returns the frameworks and the four Planning Domains', () => {
    const res = makeRes()
    routes.getFrameworks(req(), res)

    expect(res._status).toBe(200)
    expect(res._body.frameworks).toHaveLength(3)
    expect(res._body.planningDomains).toHaveLength(4)
    // The two that close every session come back separately — never in `frameworks`,
    // which is what screen 1 builds its Session Scope table from.
    expect(res._body.closingFrameworks).toHaveLength(2)
    expect(res._body.frameworks.some(f => f.closesTheSession)).toBe(false)
    // The nine Growth Aspects for the coverage check, from growth-fundamentals.json.
    expect(res._body.growthAspects).toHaveLength(9)
  })

  it('filters to one Planning Domain when asked', () => {
    const res = makeRes()
    routes.getFrameworks(req({ query: { planningDomain: 'business-targets' } }), res)

    expect(res._body.frameworks.map(f => f.id)).toEqual(['profit-levers'])
  })

  it('answers an unknown domain with an empty list, not an error', () => {
    const res = makeRes()
    routes.getFrameworks(req({ query: { planningDomain: 'nope' } }), res)

    expect(res._status).toBe(200)
    expect(res._body.frameworks).toEqual([])
  })
})

describe('GET /api/strategy/concepts — the session scope menu', () => {
  it('returns the five panels, in Mike\'s order, holding all 52 concepts', () => {
    const res = makeRes()
    routes.getConcepts(req(), res)

    expect(res._status).toBe(200)
    expect(res._body.decks).toHaveLength(5)
    expect(res._body.conceptCount).toBe(52)
    expect(res._body.decks.reduce((n, d) => n + d.concepts.length, 0)).toBe(52)
  })

  it('🔴 groups by DECK, so Pivot\'s eleven are reachable in one pass', () => {
    // Strategic Orientation is one Planning Domain in two decks, and Pivot takes nine
    // concepts from the second of them and two from Sales & Marketing. Grouping by domain
    // would put nine of them under a heading shared with another deck's agenda rows.
    const res = makeRes()
    routes.getConcepts(req(), res)

    const ids = res._body.decks.map(d => d.id)
    expect(ids).toEqual([
      'business-targets',
      'strategic-orientation-1',
      'strategic-orientation-2',
      'sales-marketing',
      'organisational-review'
    ])
    const so = ids.filter(id => id.indexOf('strategic-orientation') === 0)
    expect(so).toHaveLength(2)
  })

  it('🔴 returns an unwritten description as null rather than filling it', () => {
    // Decision B: an agenda row's description is Mike's to write. A generated or inferred
    // sentence would look exactly like his and could not be told apart afterwards.
    const res = makeRes()
    routes.getConcepts(req(), res)

    const agenda = res._body.decks.filter(d => d.rowSource === 'agenda')
    expect(agenda).toHaveLength(3)
    agenda.forEach((deck) => {
      deck.concepts.forEach((c) => {
        expect(c.helpsClientTo).toBeNull()
      })
    })
  })

  it('resolves a shared cell rather than returning an empty one', () => {
    // Decision E: Price For Delivery Medium holds no text of its own — both its columns
    // are one cell in the deck, shared with the row above. A screen that rendered the raw
    // record would show two blanks where Mike wrote a sentence.
    const res = makeRes()
    routes.getConcepts(req(), res)

    const so2 = res._body.decks.find(d => d.id === 'strategic-orientation-2')
    const shared = so2.concepts.find(c => c.id === 'price-for-delivery-medium')
    expect(shared.conceptSummary).toBeTruthy()
    expect(shared.conceptSummarySharedWith).toBe('price-for-problem-solving')
  })
})

describe('the firm comes from the token, never from the request', () => {
  it('🔴 ignores a firmId in the body when opening a session', async () => {
    store.createSession.mockResolvedValue(11)
    const res = makeRes()

    await routes.createSession(req({
      body: { clientId: 'client-1', firmId: 'firm-somebody-else' }
    }), res)

    expect(store.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ firmId: FIRM }))
    expect(store.createSession).not.toHaveBeenCalledWith(
      expect.objectContaining({ firmId: 'firm-somebody-else' }))
  })

  it('🔴 ignores a firmId in the query when listing sessions', async () => {
    store.listSessionsForClient.mockResolvedValue([])
    const res = makeRes()

    await routes.listSessions(req({
      query: { clientId: 'client-1', firmId: 'firm-somebody-else' }
    }), res)

    expect(store.listSessionsForClient).toHaveBeenCalledWith('client-1', FIRM)
  })

  it('🔴 ignores a firmId in the body when saving an entry', async () => {
    store.saveEntry.mockResolvedValue(true)
    const res = makeRes()

    await routes.putEntries(req({
      params: { id: 7 },
      body: {
        firmId: 'firm-somebody-else',
        entries: [{ frameworkId: 'swot-pest', fieldKey: 'strengths', value: 'x' }]
      }
    }), res)

    expect(store.saveEntry).toHaveBeenCalledWith(
      expect.objectContaining({ firmId: FIRM }))
  })

  it('refuses a request whose token carried no firm at all', async () => {
    const res = makeRes()
    await routes.createSession({ query: {}, params: {}, body: {}, firmId: null }, res)

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('MISSING_SCOPE')
    expect(store.createSession).not.toHaveBeenCalled()
  })
})

describe('a session in another firm is absent, not forbidden', () => {
  it('answers 404 rather than 403 when the store finds nothing', async () => {
    // 403 would confirm the id exists, so ids could be probed one number at a time.
    store.getSession.mockResolvedValue(null)
    const res = makeRes()

    await routes.getSession(req({ params: { id: 999 } }), res)

    expect(res._status).toBe(404)
    expect(res._body.error.code).toBe('NOT_FOUND')
  })

  it('does not load entries for a session it could not read', async () => {
    store.getSession.mockResolvedValue(null)
    await routes.getSession(req({ params: { id: 999 } }), makeRes())

    expect(store.loadEntries).not.toHaveBeenCalled()
    expect(store.loadTimeline).not.toHaveBeenCalled()
  })

  it('answers 404 when a scope save reaches nothing this firm owns', async () => {
    store.setScope.mockResolvedValue(false)
    const res = makeRes()

    await routes.putScope(req({ params: { id: 999 }, body: { frameworks: [] } }), res)

    expect(res._status).toBe(404)
  })

  it('answers 404 when an entry save reaches nothing this firm owns', async () => {
    store.saveEntry.mockResolvedValue(false)
    const res = makeRes()

    await routes.putEntries(req({
      params: { id: 999 },
      body: { entries: [{ frameworkId: 'swot-pest', fieldKey: 'strengths', value: 'x' }] }
    }), res)

    expect(res._status).toBe(404)
  })
})

describe('a box nobody authored is refused', () => {
  it('🔴 refuses an entry whose field does not belong to its framework', async () => {
    const res = makeRes()

    await routes.putEntries(req({
      params: { id: 7 },
      body: {
        entries: [{ frameworkId: 'swot-pest', fieldKey: 'suppliers', value: 'wrong card' }]
      }
    }), res)

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('UNKNOWN_FIELD')
    expect(store.saveEntry).not.toHaveBeenCalled()
  })

  it('refuses the whole save when ONE of several entries is invalid', async () => {
    // Partial acceptance would leave the advisor's card half saved with no sign of it.
    const res = makeRes()

    await routes.putEntries(req({
      params: { id: 7 },
      body: {
        entries: [
          { frameworkId: 'swot-pest', fieldKey: 'strengths', value: 'fine' },
          { frameworkId: 'swot-pest', fieldKey: 'invented', value: 'not fine' }
        ]
      }
    }), res)

    expect(res._status).toBe(400)
    expect(store.saveEntry).not.toHaveBeenCalled()
  })

  it('refuses a scope naming a framework that does not exist', async () => {
    const res = makeRes()

    await routes.putScope(req({
      params: { id: 7 },
      body: { frameworks: ['swot-pest', 'invented-framework'] }
    }), res)

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('UNKNOWN_FRAMEWORK')
    expect(store.setScope).not.toHaveBeenCalled()
  })

  it('refuses an empty save rather than reporting success for nothing', async () => {
    const res = makeRes()
    await routes.putEntries(req({ params: { id: 7 }, body: { entries: [] } }), res)

    expect(res._status).toBe(400)
  })

  it('bounds how many boxes one request may save, above a whole Action Plan', async () => {
    const many = new Array(61).fill(null)
      .map(() => ({ frameworkId: 'swot-pest', fieldKey: 'strengths', value: 'x' }))
    const res = makeRes()

    await routes.putEntries(req({ params: { id: 7 }, body: { entries: many } }), res)

    expect(res._status).toBe(400)
    expect(store.saveEntry).not.toHaveBeenCalled()
  })
})

describe('the navigation timeline — Decision 11\'s mechanism', () => {
  it('opens a box the framework really has', async () => {
    store.openField.mockResolvedValue(true)
    const res = makeRes()

    await routes.postTimeline(req({
      params: { id: 7 },
      body: { frameworkId: 'porters-five-forces', fieldKey: 'suppliers' }
    }), res)

    expect(res._status).toBe(200)
    expect(store.openField).toHaveBeenCalledWith(
      expect.objectContaining({ firmId: FIRM, fieldKey: 'suppliers' }))
  })

  it('refuses to open a box that framework does not have', async () => {
    const res = makeRes()

    await routes.postTimeline(req({
      params: { id: 7 },
      body: { frameworkId: 'porters-five-forces', fieldKey: 'strengths' }
    }), res)

    expect(res._status).toBe(400)
    expect(store.openField).not.toHaveBeenCalled()
  })

  it('closes whatever is open without needing a field', async () => {
    store.closeOpenField.mockResolvedValue(true)
    const res = makeRes()

    await routes.postTimeline(req({ params: { id: 7 }, body: { close: true } }), res)

    expect(res._status).toBe(200)
    expect(store.closeOpenField).toHaveBeenCalledWith(7, FIRM)
  })
})

describe('a real fault still says so', () => {
  it('turns a store BAD_INPUT into a 400 rather than a 500', async () => {
    const bad = new Error('The client id is missing or too long.')
    bad.code = 'BAD_INPUT'
    store.createSession.mockRejectedValue(bad)
    const res = makeRes()

    await routes.createSession(req({ body: { clientId: '' } }), res)

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('BAD_INPUT')
  })

  it('returns a safe generic message on a database failure, never the raw error', async () => {
    // The standard: never a stack trace, file path or raw SQL error to the client.
    store.createSession.mockRejectedValue(new Error('ER_NO_SUCH_TABLE: strategy_sessions'))
    const res = makeRes()

    await routes.createSession(req({ body: { clientId: 'client-1' } }), res)

    expect(res._status).toBe(500)
    expect(res._body.error.message).toBe('Could not open the planning session')
    expect(JSON.stringify(res._body)).not.toContain('ER_NO_SUCH_TABLE')
  })

  it('does the same on a failed read', async () => {
    store.getSession.mockRejectedValue(new Error('ECONNREFUSED 127.0.0.1:3306'))
    const res = makeRes()

    await routes.getSession(req({ params: { id: 7 } }), res)

    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toContain('ECONNREFUSED')
  })
})

describe('every route handles both kinds of failure', () => {
  // Restify routes are held to >= 90% here for this reason: the error paths are the ones
  // nobody exercises by hand, and they are where a raw SQL error or a stack trace leaks.
  const frameworksModule = require('../../server/utils/strategyFrameworks')

  afterEach(() => { jest.restoreAllMocks() })

  it('reports a framework library that cannot be read, without leaking why', () => {
    jest.spyOn(frameworksModule, 'listFrameworks').mockImplementation(() => {
      throw new Error('ENOENT: data/strategy-frameworks.json')
    })
    const res = makeRes()

    routes.getFrameworks(req(), res)

    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toContain('ENOENT')
  })

  it('reports a session scope menu that cannot be read, without leaking why', () => {
    jest.spyOn(frameworksModule, 'listDecks').mockImplementation(() => {
      throw new Error('ENOENT: data/strategy-frameworks.json')
    })
    const res = makeRes()

    routes.getConcepts(req(), res)

    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toContain('ENOENT')
  })

  it('turns a bad client id on the session list into a 400', async () => {
    const bad = new Error('The client id is missing or too long.')
    bad.code = 'BAD_INPUT'
    store.listSessionsForClient.mockRejectedValue(bad)
    const res = makeRes()

    await routes.listSessions(req({ query: { clientId: '' } }), res)
    expect(res._status).toBe(400)
  })

  it('reports a failed session list as a generic 500', async () => {
    store.listSessionsForClient.mockRejectedValue(new Error('ER_BAD_FIELD_ERROR client_id'))
    const res = makeRes()

    await routes.listSessions(req({ query: { clientId: 'client-1' } }), res)
    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toContain('ER_BAD_FIELD_ERROR')
  })

  it('turns a bad session id on a read into a 400, not a 500', async () => {
    const bad = new Error('The session id is not valid.')
    bad.code = 'BAD_INPUT'
    store.getSession.mockRejectedValue(bad)
    const res = makeRes()

    await routes.getSession(req({ params: { id: 'abc' } }), res)
    expect(res._status).toBe(400)
  })

  it('turns a bad scope into a 400 and reports a failed one as 500', async () => {
    const bad = new Error('The session scope names too many entries.')
    bad.code = 'BAD_INPUT'
    store.setScope.mockRejectedValueOnce(bad)
    const res1 = makeRes()
    await routes.putScope(req({ params: { id: 7 }, body: { frameworks: [] } }), res1)
    expect(res1._status).toBe(400)

    store.setScope.mockRejectedValueOnce(new Error('ER_LOCK_WAIT_TIMEOUT'))
    const res2 = makeRes()
    await routes.putScope(req({ params: { id: 7 }, body: { frameworks: [] } }), res2)
    expect(res2._status).toBe(500)
    expect(JSON.stringify(res2._body)).not.toContain('ER_LOCK_WAIT_TIMEOUT')
  })

  it('turns a refused transcript entry into a 400, and a failed write into a 500', async () => {
    const bad = new Error('A transcript entry must carry the original spoken passage.')
    bad.code = 'BAD_INPUT'
    store.saveEntry.mockRejectedValueOnce(bad)
    const entry = { frameworkId: 'swot-pest', fieldKey: 'strengths', value: 'x' }

    const res1 = makeRes()
    await routes.putEntries(req({ params: { id: 7 }, body: { entries: [entry] } }), res1)
    expect(res1._status).toBe(400)

    store.saveEntry.mockRejectedValueOnce(new Error('ER_DATA_TOO_LONG value'))
    const res2 = makeRes()
    await routes.putEntries(req({ params: { id: 7 }, body: { entries: [entry] } }), res2)
    expect(res2._status).toBe(500)
    expect(JSON.stringify(res2._body)).not.toContain('ER_DATA_TOO_LONG')
  })

  it('answers 404 when the timeline names a session this firm does not own', async () => {
    store.openField.mockResolvedValue(false)
    const res = makeRes()

    await routes.postTimeline(req({
      params: { id: 999 },
      body: { frameworkId: 'swot-pest', fieldKey: 'strengths' }
    }), res)

    expect(res._status).toBe(404)
  })

  it('turns a bad timeline write into a 400, and a failed one into a 500', async () => {
    const bad = new Error('The session id is not valid.')
    bad.code = 'BAD_INPUT'
    store.closeOpenField.mockRejectedValueOnce(bad)
    const res1 = makeRes()
    await routes.postTimeline(req({ params: { id: 'abc' }, body: { close: true } }), res1)
    expect(res1._status).toBe(400)

    store.closeOpenField.mockRejectedValueOnce(new Error('ECONNRESET'))
    const res2 = makeRes()
    await routes.postTimeline(req({ params: { id: 7 }, body: { close: true } }), res2)
    expect(res2._status).toBe(500)
    expect(JSON.stringify(res2._body)).not.toContain('ECONNRESET')
  })

  it('refuses every write when the token carried no firm', async () => {
    // One assertion per route, because a missing guard on ONE of them is the whole risk.
    const noFirm = { query: {}, params: { id: 7 }, body: {}, firmId: null }

    for (const handler of [routes.getSession, routes.listSessions, routes.putScope,
      routes.putEntries, routes.postTimeline]) {
      const res = makeRes()
      await handler(noFirm, res)
      expect(res._status).toBe(400)
      expect(res._body.error.code).toBe('MISSING_SCOPE')
    }
  })
})

describe('the happy paths a screen depends on', () => {
  it('opens a session and returns its id', async () => {
    store.createSession.mockResolvedValue(11)
    const res = makeRes()

    await routes.createSession(req({ body: { clientId: 'client-1' } }), res)

    expect(res._status).toBe(201)
    expect(res._body.sessionId).toBe(11)
  })

  it('returns a session with its entries and its timeline in one read', async () => {
    store.loadEntries.mockResolvedValue([{ frameworkId: 'swot-pest', fieldKey: 'strengths', value: 'Own kiln' }])
    store.loadTimeline.mockResolvedValue([{ frameworkId: 'swot-pest', fieldKey: 'strengths', openedAt: 'x', closedAt: null }])
    const res = makeRes()

    await routes.getSession(req({ params: { id: 7 } }), res)

    expect(res._status).toBe(200)
    expect(res._body.entries).toHaveLength(1)
    expect(res._body.timeline).toHaveLength(1)
  })

  it('saves several boxes from one card in a single request', async () => {
    store.saveEntry.mockResolvedValue(true)
    const res = makeRes()

    await routes.putEntries(req({
      params: { id: 7 },
      body: {
        entries: [
          { frameworkId: 'swot-pest', fieldKey: 'strengths', value: 'A' },
          { frameworkId: 'swot-pest', fieldKey: 'weaknesses', value: 'B' }
        ]
      }
    }), res)

    expect(res._status).toBe(200)
    expect(res._body.saved).toBe(2)
  })

  it('records the scope screen 1 ticked', async () => {
    store.setScope.mockResolvedValue(true)
    const res = makeRes()

    await routes.putScope(req({
      params: { id: 7 },
      body: { domains: ['strategic-orientation'], frameworks: ['swot-pest'] }
    }), res)

    expect(res._status).toBe(200)
    expect(store.setScope).toHaveBeenCalledWith(7, FIRM, {
      domains: ['strategic-orientation'],
      frameworks: ['swot-pest']
    })
  })
})
