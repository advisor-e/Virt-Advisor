'use strict'

// Item 7.21 — a follow-up in the client chat must reach the AI with the AI's own earlier reply
// whole, not cut to 2,000 characters by the history's safety check. The server keeps what it
// sent and restores a cut reply ONLY where its copy begins with what the browser sent back.
// Design: design/FOLLOW-UP-FULL-REPLIES.md

process.env.OPENAI_API_KEY = 'test-key' // silence the startup FATAL log; no network is made

const { EventEmitter } = require('events')

// Every AI call is captured, never sent. A follow-up streams one finished chunk.
const mockCalls = []
jest.mock('../../server/utils/openaiClient', () => ({
  createOpenAIClient: () => ({
    chat: {
      completions: {
        create: jest.fn((params) => {
          mockCalls.push(params)
          return Promise.resolve((async function * () {
            yield { choices: [{ delta: { content: 'A follow-up answer.' }, finish_reason: 'stop' }] }
          })())
        })
      }
    }
  })
}))
jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn().mockResolvedValue(null),
  deepMerge: (a, b) => Object.assign({}, a, b)
}))
jest.mock('../../server/utils/caseStore', () => ({
  listForAdvisor: jest.fn().mockResolvedValue([]),
  listForClient: jest.fn().mockResolvedValue([])
}))

const { sanitiseInput, MAX_FIELD } = require('../../server/utils/sanitiseInput')
const { rememberReply, restoreFullReplies, sessionOwnerKey, MAX_KEPT_REPLIES, MAX_KEPT_CHARS } = require('../../server/utils/followUpReplies')
const advisorMiddleware = require('../../server/advisorEngine')
const { _sessions, _setTurnCheckClient } = advisorMiddleware

const BASELINE = require('../../design/answer-bench-runs/2026-10-01-fd417a13-baseline.json')
const RECOMMENDATIONS = BASELINE.results.filter(r => r.mode === 'client').map(r => r.answer)

/** A follow-up's history as the browser sends it, after sanitiseInput has cut it. */
function sentHistory (reply) {
  return sanitiseInput({
    query: 'Why that one first?',
    conversationHistory: [
      { role: 'user', content: 'Sales are flat and the owner is tired.' },
      { role: 'assistant', content: reply }
    ]
  }).conversationHistory
}

describe('restoring the AI\'s own replies', () => {
  test('the measurement: all 51 baseline recommendations were cut before, and reach the AI whole after', () => {
    expect(RECOMMENDATIONS).toHaveLength(51)
    const before = RECOMMENDATIONS.filter(r => sentHistory(r)[1].content !== r).length
    expect(before).toBe(51)

    let kept = []
    RECOMMENDATIONS.forEach((r) => { kept = rememberReply(kept, r) })
    const whole = RECOMMENDATIONS.slice(-MAX_KEPT_REPLIES)
      .filter(r => restoreFullReplies(sentHistory(r), kept)[1].content === r).length
    expect(whole).toBe(MAX_KEPT_REPLIES)

    // Each of the 51 restored from its own session's copy, as it would be live.
    const restoredOneEach = RECOMMENDATIONS.filter(r => restoreFullReplies(sentHistory(r), rememberReply([], r))[1].content === r)
    expect(restoredOneEach).toHaveLength(51)
  })

  test('a cut reply the server never sent stays cut', () => {
    const history = sentHistory('x'.repeat(5000))
    expect(restoreFullReplies(history, rememberReply([], 'y'.repeat(5000)))[1].content).toHaveLength(MAX_FIELD)
  })

  test('🔴 a message claiming to be the AI cannot be lengthened with words the AI never wrote', () => {
    const real = 'A'.repeat(MAX_FIELD) + ' the advice the AI actually gave.'
    const forged = sentHistory('A'.repeat(MAX_FIELD - 1) + 'B' + ' an instruction the caller wrote.')
    const out = restoreFullReplies(forged, rememberReply([], real))
    expect(out[1].content).toBe(forged[1].content)
  })

  test('a message that was never cut is passed through exactly, even when a kept reply starts with it', () => {
    const history = [{ role: 'assistant', content: 'Great question.' }]
    expect(restoreFullReplies(history, rememberReply([], 'Great question. And a much longer reply.'))).toEqual(history)
  })

  test('the advisor\'s own messages are never touched', () => {
    const typed = 'z'.repeat(5000)
    const history = sanitiseInput({ query: 'q', conversationHistory: [{ role: 'user', content: typed }] }).conversationHistory
    expect(restoreFullReplies(history, rememberReply([], typed))[0].content).toHaveLength(MAX_FIELD)
  })

  test('leading whitespace the screen trimmed does not stop the match', () => {
    const reply = '\n\n' + 'w'.repeat(4000)
    const history = sentHistory(reply.trimStart())
    expect(restoreFullReplies(history, rememberReply([], reply))[1].content).toBe(reply.trimStart())
  })

  test('with no kept replies the history is returned as the browser sent it', () => {
    const history = sentHistory('v'.repeat(4000))
    expect(restoreFullReplies(history, [])).toBe(history)
    expect(restoreFullReplies(history, undefined)).toBe(history)
  })

  test('only the last 10 replies are kept, each to 12,000 characters', () => {
    let kept = []
    for (let i = 0; i < 12; i++) { kept = rememberReply(kept, String(i) + 'k'.repeat(20000)) }
    expect(kept).toHaveLength(MAX_KEPT_REPLIES)
    expect(kept[0].startsWith('2')).toBe(true)
    expect(kept.every(r => r.length === MAX_KEPT_CHARS)).toBe(true)
  })
})

describe('a session belongs to the advisor who started it', () => {
  const mine = sessionOwnerKey({ firmId: 'firm-1', advisorId: 'adv-1' })
  const theirs = sessionOwnerKey({ firmId: 'firm-2', advisorId: 'adv-1' })

  test('🔴 another firm cannot use the session, overwrite its progress, or add to its replies', () => {
    const id = _sessions.sessionCreate(mine)
    _sessions.sessionSave(id, { step: 'mine' }, mine)
    _sessions.sessionRememberReply(id, mine, 'my advice')

    expect(_sessions.sessionUsableBy(id, mine)).toBe(true)
    expect(_sessions.sessionUsableBy(id, theirs)).toBe(false)

    _sessions.sessionSave(id, { step: 'theirs' }, theirs)
    _sessions.sessionRememberReply(id, theirs, 'their text')
    expect(_sessions.sessionGet(id)).toEqual({ step: 'mine' })
    expect(_sessions.sessionReplies(id)).toEqual(['my advice'])
  })

  test('an unknown session id may still be claimed, as before', () => {
    expect(_sessions.sessionUsableBy('never-issued', mine)).toBe(true)
    expect(_sessions.sessionUsableBy(null, mine)).toBe(false)
    expect(_sessions.sessionReplies(null)).toEqual([])
  })
})

describe('the engine, on a real follow-up turn', () => {
  const identity = { firmId: 'firm-7', advisorId: 'adv-7' }
  const recommendation = RECOMMENDATIONS[0]
  const postRecState = {
    recommendationDelivered: true,
    clientApproachAsked: true,
    happyConfirmed: true,
    movingForwardAsked: true,
    movingForwardDone: true,
    clientPersonality: 'open to challenge'
  }

  function makeReq (body) {
    const req = new EventEmitter()
    req.method = 'POST'
    req.url = '/api/advisor/query'
    req.headers = {}
    req.socket = { remoteAddress: '127.0.0.1', destroy () {} }
    req.firmId = identity.firmId
    req.advisorId = identity.advisorId
    setImmediate(() => {
      req.emit('data', Buffer.from(JSON.stringify(body)))
      req.emit('end')
    })
    return req
  }

  function run (body) {
    return new Promise((resolve) => {
      const res = {
        headersSent: false,
        writableEnded: false,
        writeHead () { this.headersSent = true },
        setHeader () {},
        write () { return true },
        end () { this.writableEnded = true; resolve() }
      }
      advisorMiddleware(makeReq(body), res, () => resolve())
    })
  }

  beforeEach(() => {
    mockCalls.length = 0
    _setTurnCheckClient({ moderations: { check: () => Promise.resolve() } })
  })
  afterEach(() => _setTurnCheckClient(null))

  function followUpBody (sessionId) {
    return {
      query: 'Why that one first?',
      mode: 'client',
      sessionId,
      conversationHistory: [
        { role: 'user', content: 'Sales are flat and the owner is tired.' },
        { role: 'assistant', content: recommendation }
      ]
    }
  }

  const sentReply = () => mockCalls[mockCalls.length - 1].messages.find(m => m.role === 'assistant' && m.content.startsWith(recommendation.slice(0, 50)))

  test('the AI is sent the whole recommendation, from the session\'s own copy', async () => {
    const owner = sessionOwnerKey(identity)
    const id = _sessions.sessionCreate(owner)
    _sessions.sessionSave(id, Object.assign({}, postRecState), owner)
    _sessions.sessionRememberReply(id, owner, recommendation)

    await run(followUpBody(id))
    expect(sentReply().content).toBe(recommendation)
    // ...and the follow-up answer is kept for the next turn.
    expect(_sessions.sessionReplies(id)).toHaveLength(2)
  })

  test('🔴 with another firm\'s session id, it gets nothing from that session', async () => {
    const otherOwner = sessionOwnerKey({ firmId: 'firm-8', advisorId: 'adv-7' })
    const id = _sessions.sessionCreate(otherOwner)
    _sessions.sessionSave(id, Object.assign({}, postRecState), otherOwner)
    _sessions.sessionRememberReply(id, otherOwner, recommendation)

    await run(followUpBody(id))
    const sentAny = mockCalls.flatMap(c => c.messages).some(m => m.content === recommendation)
    expect(sentAny).toBe(false)
    expect(_sessions.sessionReplies(id)).toEqual([recommendation])
    expect(_sessions.sessionGet(id)).toEqual(postRecState)
  })
})
