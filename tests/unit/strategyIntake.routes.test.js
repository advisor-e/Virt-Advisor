'use strict'

// POST /api/strategy/suggest with the guided answers, and GET /suggest/questions — item 15.31.
// Approved drawing: design/mockups/strategy-suggest-intake.html (Mike, 2026-09-30).
//
// Own mocks, like strategyPretick.routes.test.js, so a model call cannot leak between suites.
//
// 🔴 WHAT UAT CANNOT SEE:
//   1. THE CEILING HOLDS WHEN THE MODEL IGNORES IT. The screen shows two ticks either way.
//   2. THE TYPED ANSWERS ARE MODERATED, AND NOTHING ELSE NEW IS (rule Z3).
//   3. NO ID REACHES THE MODEL, even one smuggled into the answers.
//   4. A CLIENT WITH HISTORY KEEPS THE MEASURED PATH — answers sent alongside are ignored.

jest.mock('../../server/utils/strategySessionStore', () => ({
  getSession: jest.fn(),
  setScope: jest.fn(),
  saveSuggestion: jest.fn()
}))
jest.mock('../../server/utils/clientStore', () => ({ getById: jest.fn() }))
jest.mock('../../server/utils/caseStore', () => ({ listForClient: jest.fn() }))
jest.mock('../../server/utils/aiProvider', () => ({ getClient: jest.fn() }))
jest.mock('../../server/utils/staircaseConfig', () => {
  const actual = jest.requireActual('../../server/utils/staircaseConfig')
  return Object.assign({}, actual, { loadBlendedStaircase: jest.fn() })
})

const store = require('../../server/utils/strategySessionStore')
const clientStore = require('../../server/utils/clientStore')
const caseStore = require('../../server/utils/caseStore')
const { getClient } = require('../../server/utils/aiProvider')
const { loadBlendedStaircase, BASE_STAIRCASE } = require('../../server/utils/staircaseConfig')
const routes = require('../../server/routes/strategyPlanner')
const frameworks = require('../../server/utils/strategyFrameworks')

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

function req (body) {
  return { query: {}, params: {}, body, firmId: FIRM, advisorId: 'adv-1', advisorName: 'D. Okafor' }
}

function modelReplying (content) {
  const create = jest.fn().mockResolvedValue({ choices: [{ message: { content } }] })
  getClient.mockReturnValue({ chat: { completions: { create } } })
  return create
}

function answers (over) {
  return Object.assign({
    strategyPlanExists: 'No plan yet; the owner is new to planning.',
    growthStage: 'Lifestyle',
    advisoryStaircase: 'Step 2: Assimilation',
    clientRaisedIssue: 'They asked for help before hiring a second crew.',
    clientPersonality: 'Careful; wants numbers first.',
    advisorExperience: 'Three years, comfortable with tools.',
    advisorConfidence: 'A stretch - first full plan.',
    advisorSessionLength: '60 mins'
  }, over || {})
}

// Five real ids, so the validator keeps them and only the ceiling can remove any.
const FIVE = frameworks.listConcepts().slice(0, 5).map(c => c.id)
const FIVE_TICKS = JSON.stringify({ ticks: FIVE.map(id => ({ id, reason: 'Fits.' })) })

beforeEach(() => {
  jest.clearAllMocks()
  clientStore.getById.mockResolvedValue({ id: CLIENT, firmId: FIRM })
  caseStore.listForClient.mockResolvedValue([])
  store.saveSuggestion.mockResolvedValue(true)
  // The session a suggestion is stored on is this client's (item 15.32).
  store.getSession.mockResolvedValue({ id: 's-1', firmId: FIRM, clientId: CLIENT })
  loadBlendedStaircase.mockResolvedValue(BASE_STAIRCASE)
})

describe('a client with no conversation, answered', () => {
  it('holds the model to the session\'s ceiling — 60 minutes is 2, whatever it names', async () => {
    modelReplying(FIVE_TICKS)
    const res = makeRes()
    await routes.postSuggest(req({ clientId: CLIENT, answers: answers() }), res)

    expect(res._status).toBe(200)
    expect(res._body.reason).toBe('ok')
    expect(res._body.suggestion.concepts.map(c => c.id)).toEqual(FIVE.slice(0, 2))
  })

  it('tells the model the ceiling as well as enforcing it', async () => {
    const create = modelReplying(FIVE_TICKS)
    await routes.postSuggest(req({ clientId: CLIENT, answers: answers({ advisorSessionLength: '90 mins' }) }), makeRes())
    const system = create.mock.calls[0][0].messages[0].content
    expect(system).toMatch(/at most 4 concepts/)
  })

  it('moderates the typed answers and not the picker answers', async () => {
    const create = modelReplying(FIVE_TICKS)
    await routes.postSuggest(req({ clientId: CLIENT, answers: answers() }), makeRes())
    const moderated = create.mock.calls[0][1].moderate
    expect(moderated).toContain('Careful; wants numbers first.')
    expect(moderated).not.toContain('Lifestyle')
    expect(moderated).not.toContain('60 mins')
    expect(create.mock.calls[0][1].personal).toBe(true)
  })

  it('sends no id to the model, even one slipped into the answers', async () => {
    const create = modelReplying(FIVE_TICKS)
    await routes.postSuggest(req({
      clientId: CLIENT,
      answers: answers({ clientId: 'client-SECRET', firmId: 'firm-SECRET' })
    }), makeRes())
    const sent = JSON.stringify(create.mock.calls[0][0].messages)
    expect(sent).not.toMatch(/client-SECRET|firm-SECRET|client-1|firm-a|adv-1/)
  })

  it('returns the answers with the suggestion, so the record keeps what was asked', async () => {
    modelReplying(FIVE_TICKS)
    const res = makeRes()
    await routes.postSuggest(req({ clientId: CLIENT, sessionId: 's-1', answers: answers() }), res)
    expect(res._body.suggestion.answers.growthStage).toBe('Lifestyle')
    expect(store.saveSuggestion.mock.calls[0][2].answers.growthStage).toBe('Lifestyle')
  })

  // Mike, 2026-09-30: the frame's time is already counted, so it never takes a slot. Found on
  // the first real run, where it took one of four.
  it('never offers the frame concept, and drops it if the model names it anyway', async () => {
    const frame = require('../../server/utils/strategyIntake').FRAME_CONCEPT_ID
    expect(frameworks.listConcepts().some(c => c.id === frame)).toBe(true) // a rename would silently end the rule

    const create = modelReplying(JSON.stringify({
      ticks: [{ id: frame, reason: 'Sets the scene.' }, { id: FIVE[1], reason: 'Fits.' }]
    }))
    const res = makeRes()
    await routes.postSuggest(req({ clientId: CLIENT, answers: answers() }), res)

    expect(res._body.suggestion.concepts.map(c => c.id)).toEqual([FIVE[1]])
    const catalogue = create.mock.calls[0][0].messages[1].content
    expect(catalogue).not.toContain(frame + ' |')
  })

  it('refuses incomplete answers without calling the model', async () => {
    const create = modelReplying(FIVE_TICKS)
    const res = makeRes()
    await routes.postSuggest(req({ clientId: CLIENT, answers: answers({ clientPersonality: '' }) }), res)
    expect(res._status).toBe(400)
    expect(create).not.toHaveBeenCalled()
  })

  it('still says no-history when nothing was answered, which is what opens the questions', async () => {
    const create = modelReplying(FIVE_TICKS)
    const res = makeRes()
    await routes.postSuggest(req({ clientId: CLIENT }), res)
    expect(res._body.reason).toBe('no-history')
    expect(create).not.toHaveBeenCalled()
  })
})

describe('a client WITH a conversation keeps the measured path', () => {
  it('ignores answers sent alongside, moderates nothing and applies no ceiling', async () => {
    caseStore.listForClient.mockResolvedValue([{ summary: 'Margins are falling fast.' }])
    const create = modelReplying(FIVE_TICKS)
    const res = makeRes()
    await routes.postSuggest(req({ clientId: CLIENT, answers: answers() }), res)

    expect(create.mock.calls[0][1].moderate).toEqual([])
    expect(res._body.suggestion.concepts).toHaveLength(5)
    expect(res._body.suggestion.answers).toBeUndefined()
    expect(JSON.stringify(create.mock.calls[0][0].messages)).not.toMatch(/Careful; wants numbers/)
  })
})

describe('GET /api/strategy/suggest/questions', () => {
  it('reads the caller\'s firm Staircase, never one named in the request', async () => {
    const res = makeRes()
    await routes.getSuggestQuestions(Object.assign(req({}), { query: { firmId: 'firm-b' } }), res)
    expect(loadBlendedStaircase.mock.calls[0][0]).toBe(FIRM)
    expect(res._status).toBe(200)
    expect(res._body.questions[0].field).toBe('strategyPlanExists')
  })

  it('fails with a safe envelope when the firm settings cannot be read', async () => {
    loadBlendedStaircase.mockRejectedValue(new Error('SELECT * FROM secret_table failed'))
    const res = makeRes()
    await routes.getSuggestQuestions(req({}), res)
    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toMatch(/secret_table/)
  })
})
