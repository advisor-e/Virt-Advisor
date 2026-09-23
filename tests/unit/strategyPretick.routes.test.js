'use strict'

// POST /api/strategy/suggest — the AI pre-tick, item 15.1 stage 6.
// Decision C, ruled by Mike 2026-09-17 on design/mockups/strategy-session-menu.html.
//
// The validator's own behaviour is tests/unit/strategyPretick.test.js. This file is about
// what the HTTP layer lets through, and it has its own mocks rather than sharing
// strategyPlanner.routes.test.js's, so a model call can never leak into the other suite.
//
// 🔴 THE FOUR THINGS UAT CANNOT SEE, WHICH IS WHY THEY ARE TESTED HERE:
//
//   1. A CLIENT IN ANOTHER FIRM IS 404. The client id arrives in the BODY — the only id on
//      this route that does — so `clientStore.getById` being firm-scoped is the whole of
//      the boundary. A tester signed in as one firm has no way to discover that a crafted
//      body would have reached another firm's client.
//   2. THE SUGGESTION IS NEVER THE SCOPE (Decision C(a)). On screen a pre-tick and a tick
//      look identical; only the absence of a `setScope` call proves the AI saved nothing.
//   3. NO TRANSCRIPT AND NO ID REACHES THE MODEL. Both look like a working button.
//   4. A MODEL THAT FAILS DOES NOT TAKE THE SCREEN WITH IT. The advisor is standing in
//      front of a client and needs the menu, not a stack trace.

jest.mock('../../server/utils/strategySessionStore', () => ({
  getSession: jest.fn(),
  setScope: jest.fn(),
  saveSuggestion: jest.fn()
}))
jest.mock('../../server/utils/clientStore', () => ({ getById: jest.fn() }))
jest.mock('../../server/utils/caseStore', () => ({ listForClient: jest.fn() }))
// A real aiProvider would put a charged model call inside `npm test`.
jest.mock('../../server/utils/aiProvider', () => ({ getClient: jest.fn() }))

const store = require('../../server/utils/strategySessionStore')
const clientStore = require('../../server/utils/clientStore')
const caseStore = require('../../server/utils/caseStore')
const { getClient } = require('../../server/utils/aiProvider')
const routes = require('../../server/routes/strategyPlanner')

// writeHead/end are not optional: sendError uses them, and a stub with only send() throws
// on the one path the error envelope exists for.
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
const CLIENT = 'client-1'
const ADVISOR = { firmId: FIRM, advisorId: 'adv-1', advisorName: 'D. Okafor' }

function req (over) {
  return Object.assign({ query: {}, params: {}, body: {} }, ADVISOR, over || {})
}

/** Points the mocked provider at a reply, and hands back the spy that took the call. */
function modelReplying (content) {
  const create = jest.fn().mockResolvedValue({ choices: [{ message: { content } }] })
  getClient.mockReturnValue({ chat: { completions: { create } } })
  return create
}

// `porters-5-forces` is a real id in data/strategy-frameworks.json. It has to be: the
// route validates every id the model names against the loaded catalogue, so a made-up
// fixture id would be dropped and the test would prove the opposite of what it says.
const REAL_CONCEPT = 'porters-5-forces'

beforeEach(() => {
  jest.clearAllMocks()
  clientStore.getById.mockResolvedValue({ id: CLIENT, firmId: FIRM })
  caseStore.listForClient.mockResolvedValue([{ summary: 'Margins are falling fast.' }])
  store.saveSuggestion.mockResolvedValue(true)
})

describe('what comes back', () => {
  it('returns the concepts the model named, each with its reason', async () => {
    modelReplying(JSON.stringify({
      ticks: [{ id: REAL_CONCEPT, reason: 'Competitive pressure is the issue.' }]
    }))
    const res = makeRes()
    await routes.postSuggest(req({ body: { clientId: CLIENT } }), res)

    expect(res._status).toBe(200)
    expect(res._body.reason).toBe('ok')
    expect(res._body.suggestion.concepts).toEqual([
      { id: REAL_CONCEPT, reason: 'Competitive pressure is the issue.' }
    ])
  })

  it('drops a concept the model invented, and returns the rest', async () => {
    modelReplying(JSON.stringify({
      ticks: [
        { id: REAL_CONCEPT, reason: 'Real.' },
        { id: 'the-nine-levers-of-doom', reason: 'Invented.' }
      ]
    }))
    const res = makeRes()
    await routes.postSuggest(req({ body: { clientId: CLIENT } }), res)

    expect(res._body.suggestion.concepts.map(c => c.id)).toEqual([REAL_CONCEPT])
  })

  it('distinguishes "read them and matched nothing" from "had nothing to read"', async () => {
    modelReplying(JSON.stringify({ ticks: [] }))
    const res = makeRes()
    await routes.postSuggest(req({ body: { clientId: CLIENT } }), res)

    expect(res._body.reason).toBe('nothing-matched')
  })

  // ⚠ A CLIENT WITH NO HISTORY IS NOT AN ERROR, AND NOT A GUESS EITHER. The drawing's
  // input is "this client's last two conversations"; with none, the model is never asked.
  it('says so when the client has no conversations, without asking the model', async () => {
    caseStore.listForClient.mockResolvedValue([])
    const create = modelReplying('{}')
    const res = makeRes()
    await routes.postSuggest(req({ body: { clientId: CLIENT } }), res)

    expect(res._status).toBe(200)
    expect(res._body.reason).toBe('no-history')
    expect(res._body.suggestion.concepts).toEqual([])
    expect(create).not.toHaveBeenCalled()
  })
})

describe('Decision C — it proposes, and it changes nothing', () => {
  it('NEVER saves a scope, even with a session in hand', async () => {
    modelReplying(JSON.stringify({ ticks: [{ id: REAL_CONCEPT, reason: 'Because.' }] }))
    await routes.postSuggest(req({ body: { clientId: CLIENT, sessionId: 7 } }), makeRes())

    expect(store.setScope).not.toHaveBeenCalled()
  })

  it('stores the suggestion beside the ticks when a session exists', async () => {
    modelReplying(JSON.stringify({ ticks: [{ id: REAL_CONCEPT, reason: 'Because.' }] }))
    await routes.postSuggest(req({ body: { clientId: CLIENT, sessionId: 7 } }), makeRes())

    expect(store.saveSuggestion).toHaveBeenCalledTimes(1)
    const call = store.saveSuggestion.mock.calls[0]
    expect(call[0]).toBe(7)
    expect(call[1]).toBe(FIRM)
    expect(call[2].concepts[0].id).toBe(REAL_CONCEPT)
  })

  // The button sits on Scope session, which an advisor opens before pressing
  // "Build the session" — so usually there is no session to hang the suggestion on.
  it('works with no session at all, and stores nothing when there is none', async () => {
    modelReplying(JSON.stringify({ ticks: [{ id: REAL_CONCEPT, reason: 'Because.' }] }))
    const res = makeRes()
    await routes.postSuggest(req({ body: { clientId: CLIENT } }), res)

    expect(res._status).toBe(200)
    expect(store.saveSuggestion).not.toHaveBeenCalled()
  })
})

describe('the firm boundary', () => {
  it('is 404 for a client belonging to another firm, never 403', async () => {
    clientStore.getById.mockResolvedValue(null)
    const res = makeRes()
    await routes.postSuggest(req({ body: { clientId: 'client-in-firm-b' } }), res)

    expect(res._status).toBe(404)
    expect(res._body.error.code).toBe('NOT_FOUND')
  })

  it('looks the client up scoped to the token firm, never to anything in the body', async () => {
    modelReplying(JSON.stringify({ ticks: [] }))
    await routes.postSuggest(req({ body: { clientId: CLIENT, firmId: 'firm-b' } }), makeRes())

    expect(clientStore.getById).toHaveBeenCalledWith(CLIENT, FIRM)
  })

  it('refuses a request naming no client', async () => {
    const res = makeRes()
    await routes.postSuggest(req({ body: {} }), res)

    expect(res._status).toBe(400)
  })

  it('refuses when the token carried no firm', async () => {
    const res = makeRes()
    await routes.postSuggest({ query: {}, params: {}, body: { clientId: CLIENT } }, res)

    expect(res._status).toBe(400)
    expect(res._body.error.code).toBe('MISSING_SCOPE')
  })
})

describe('what reaches the model', () => {
  // 🔴 THE PRIVACY LINE AT THE HTTP BOUNDARY. The util's test proves a transcript never
  // enters the prompt; this proves the route does not reach past it to fetch one, and that
  // no internal id travels with the summary.
  it('sends the summary and no identifier of any kind', async () => {
    caseStore.listForClient.mockResolvedValue([{
      id: 'case-99',
      clientId: CLIENT,
      advisorId: 'adv-1',
      firmId: FIRM,
      summary: 'Margins are falling fast.',
      transcript: [{ role: 'user', content: 'Our finance director is unwell.' }]
    }])
    const create = modelReplying(JSON.stringify({ ticks: [] }))
    await routes.postSuggest(req({ body: { clientId: CLIENT } }), makeRes())

    const sent = create.mock.calls[0][0].messages.map(m => m.content).join('\n')
    expect(sent).toContain('Margins are falling fast.')
    expect(sent).not.toContain('finance director')
    expect(sent).not.toContain('case-99')
    expect(sent).not.toContain(CLIENT)
    expect(sent).not.toContain(FIRM)
  })

  // `personal` is required by aiProvider and decides whether a second provider may ever
  // see this content. It is false because nothing personal is sent — see above.
  it('declares the call as carrying nothing personal', async () => {
    const create = modelReplying(JSON.stringify({ ticks: [] }))
    await routes.postSuggest(req({ body: { clientId: CLIENT } }), makeRes())

    // moderate: [] — saved case summaries, nothing typed here (item 8.2, 2026-09-24).
    expect(create.mock.calls[0][1]).toEqual({ personal: false, moderate: [] })
  })
})

describe('when things go wrong', () => {
  it('returns 502 with a usable message when the model cannot be reached', async () => {
    const create = jest.fn().mockRejectedValue(new Error('OpenAI API error 429'))
    getClient.mockReturnValue({ chat: { completions: { create } } })
    const res = makeRes()
    await routes.postSuggest(req({ body: { clientId: CLIENT } }), res)

    expect(res._status).toBe(502)
    expect(res._body.error.code).toBe('SUGGEST_UNAVAILABLE')
  })

  // Losing the audit row is a real fault and is logged as one. Withholding a suggestion
  // the advisor is waiting for, in front of a client, is the worse of the two.
  it('still returns the suggestion when storing it fails', async () => {
    modelReplying(JSON.stringify({ ticks: [{ id: REAL_CONCEPT, reason: 'Because.' }] }))
    store.saveSuggestion.mockRejectedValue(new Error('DB gone'))
    const res = makeRes()
    await routes.postSuggest(req({ body: { clientId: CLIENT, sessionId: 7 } }), res)

    expect(res._status).toBe(200)
    expect(res._body.suggestion.concepts).toHaveLength(1)
  })

  it('returns the standard envelope, not a stack trace, when a store throws', async () => {
    clientStore.getById.mockRejectedValue(new Error('DB gone'))
    const res = makeRes()
    await routes.postSuggest(req({ body: { clientId: CLIENT } }), res)

    expect(res._status).toBe(500)
    expect(res._body.success).toBe(false)
    expect(res._body.error.code).toBe('SUGGEST_ERROR')
    expect(res._body.error.message).not.toContain('DB gone')
  })

  it('survives a reply with no choices at all', async () => {
    const create = jest.fn().mockResolvedValue({})
    getClient.mockReturnValue({ chat: { completions: { create } } })
    const res = makeRes()
    await routes.postSuggest(req({ body: { clientId: CLIENT } }), res)

    expect(res._status).toBe(200)
    expect(res._body.reason).toBe('nothing-matched')
  })
})
