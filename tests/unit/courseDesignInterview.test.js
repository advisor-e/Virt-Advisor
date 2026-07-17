'use strict'

// CB-06 (design/COURSE-BUILDER-PLAN.md Phase 4) — end-to-end through the
// design handler: a clarification reply triggers the plainer re-ask (once,
// never stored as the answer); a fully-specified opening message skips
// straight to outline generation with no questions asked.

let mockCreate
jest.mock('../../server/utils/openaiClient', () => ({
  createOpenAIClient: () => ({
    chat: { completions: { create: (...args) => mockCreate(...args) } }
  })
}))

const { EventEmitter } = require('events')
const courseEngine = require('../../server/courseEngine')

let reqCount = 0
function makeReq (body) {
  const req = new EventEmitter()
  req.headers = {}
  req.socket = { remoteAddress: `10.0.3.${++reqCount}`, destroy () {} }
  process.nextTick(() => {
    req.emit('data', Buffer.from(JSON.stringify(body)))
    req.emit('end')
  })
  return req
}

function makeRes () {
  const res = {
    headersSent: false,
    writableEnded: false,
    chunks: [],
    writeHead () { res.headersSent = true },
    write (chunk) { res.chunks.push(String(chunk)) },
    end () { res.writableEnded = true }
  }
  return res
}

function sseEvents (res) {
  return res.chunks
    .join('')
    .split('\n\n')
    .filter(f => f.startsWith('data: '))
    .map(f => JSON.parse(f.slice(6)))
}

function makeStream (text) {
  return {
    async * [Symbol.asyncIterator] () {
      yield { choices: [{ delta: { content: text } }] }
    }
  }
}

function deltaText (res) {
  return sseEvents(res).filter(e => e.type === 'delta').map(e => e.text).join('')
}

function stateOf (res) {
  const states = sseEvents(res).filter(e => e.type === 'state')
  return states[states.length - 1].state
}

const REASK_LEVEL = "No problem — put simply: how much have you already done in this area? For example 'complete beginner', or 'some experience but no formal training'."

describe('courseEngine design interview — CB-06', () => {
  beforeEach(() => {
    mockCreate = jest.fn(() => makeStream('Should not be called'))
  })

  test('a clarification reply gets the plainer re-ask, not stored as the answer', async () => {
    const res = makeRes()
    await courseEngine(makeReq({
      type: 'design',
      query: 'What do you mean?',
      courseState: { goalsPrimary: 'Learn valuation conversations', currentLevel: 'pending' }
    }), res)

    expect(deltaText(res)).toBe(REASK_LEVEL)
    const state = stateOf(res)
    expect(state.currentLevel).toBe('pending') // still awaiting a real answer
    expect(state.currentLevelReasked).toBe(true)
    expect(mockCreate).not.toHaveBeenCalled() // hardcoded question — no AI call
  })

  test('a second unclear reply is accepted as the answer (one re-ask cap, no loop)', async () => {
    const res = makeRes()
    await courseEngine(makeReq({
      type: 'design',
      query: 'I still do not understand',
      courseState: { goalsPrimary: 'Learn valuation conversations', currentLevel: 'pending', currentLevelReasked: true }
    }), res)

    const state = stateOf(res)
    expect(state.currentLevel).toBe('I still do not understand') // stored — advisor stays in control
    expect(state.intensity).toBe('pending') // pipeline moved on to the next question
  })

  test('a real answer is stored normally and the next question follows', async () => {
    const res = makeRes()
    await courseEngine(makeReq({
      type: 'design',
      query: 'Complete beginner, never sold this before',
      courseState: { goalsPrimary: 'Learn valuation conversations', currentLevel: 'pending' }
    }), res)

    const state = stateOf(res)
    expect(state.currentLevel).toBe('Complete beginner, never sold this before')
    expect(state.intensity).toBe('pending')
  })

  test('a fully-specified opening message skips all three questions → straight to the outline', async () => {
    mockCreate = jest.fn(() => makeStream('Here is your course outline.'))
    const res = makeRes()
    await courseEngine(makeReq({
      type: 'design',
      query: "I'm a complete beginner at selling valuation services. 4 sessions of 30 minutes, consistent depth throughout please.",
      courseState: {}
    }), res)

    expect(mockCreate).toHaveBeenCalledTimes(1)
    const userMessage = mockCreate.mock.calls[0][0].messages[1].content
    expect(userMessage).toContain('complete picture')
    expect(userMessage).toContain('4 sessions of 30 minutes')
  })

  test('a partially-specified opening message asks only what is missing', async () => {
    const res = makeRes()
    await courseEngine(makeReq({
      type: 'design',
      query: 'I am a complete beginner and want 4 sessions of 30 minutes on succession planning.',
      courseState: {}
    }), res)

    const state = stateOf(res)
    expect(state.currentLevel).toBe('complete beginner')
    expect(state.sessionDetails).toBe('4 sessions of 30 minutes')
    expect(state.intensity).toBe('pending') // the one thing not stated → the one question asked
    expect(deltaText(res)).toContain('consistent level of depth')
    expect(mockCreate).not.toHaveBeenCalled()
  })
})

// ── CB-26: requested session count — parser ──────────────────────────────────

const { requestedSessionCount } = require('../../server/utils/designInterview')

describe('requestedSessionCount (CB-26)', () => {
  test('the live failure case parses: spelled-out count amid a minutes range', () => {
    expect(requestedSessionCount('say 20 to 30 minutes per session and six sessions in total please')).toBe(6)
  })

  test('digit and word forms, all session nouns', () => {
    expect(requestedSessionCount('8 sessions')).toBe(8)
    expect(requestedSessionCount('eight sessions in total')).toBe(8)
    expect(requestedSessionCount('4 modules please')).toBe(4)
    expect(requestedSessionCount('three lessons')).toBe(3)
    expect(requestedSessionCount('twenty sessions')).toBe(20)
  })

  test('ranges and alternatives are not a specific request → null', () => {
    expect(requestedSessionCount('6-8 sessions')).toBeNull()
    expect(requestedSessionCount('six to eight sessions')).toBeNull()
    expect(requestedSessionCount('6 or 8 sessions would work')).toBeNull()
  })

  test('conflicting counts → null; a repeated identical count still parses', () => {
    expect(requestedSessionCount('6 sessions... actually make it 8 sessions')).toBeNull()
    expect(requestedSessionCount('6 sessions — yes, 6 sessions')).toBe(6)
  })

  test('no count, noun-first ordinals, zero, and junk → null', () => {
    expect(requestedSessionCount('a few sessions')).toBeNull()
    expect(requestedSessionCount('drop session 2')).toBeNull()
    expect(requestedSessionCount('0 sessions')).toBeNull()
    expect(requestedSessionCount('')).toBeNull()
    expect(requestedSessionCount(null)).toBeNull()
  })
})

// ── CB-26: session-count mismatch — code-owned flag through the handler ──────

function outlineJSON (n) {
  const sessions = Array.from({ length: n }, (_, i) => (
    { id: i + 1, title: `S${i + 1}`, focus: 'F', resources: [], objectives: [], estimatedMinutes: 30 }
  ))
  return JSON.stringify({ title: 'T', topic: 'x', intensity: 'consistent', totalSessions: n, sessions })
}

function outlineReply (n) {
  return `Here is your course.\n[COURSE_OUTLINE]${outlineJSON(n)}[/COURSE_OUTLINE]\nDoes this look right?`
}

const FULL_STATE = {
  goalsPrimary: 'Learn to sell advisory services',
  currentLevel: 'complete beginner',
  intensity: 'progressive'
}

describe('session-count mismatch flag (CB-26)', () => {
  test('requested six (spelled out), delivered 4 → the engine flags it; the AI is not trusted to confess', async () => {
    mockCreate = jest.fn(() => makeStream(outlineReply(4)))
    const res = makeRes()
    await courseEngine(makeReq({
      type: 'design',
      // The final interview answer — stored as sessionDetails, then the outline generates.
      query: 'say 20 to 30 minutes per session and six sessions in total please',
      courseState: { ...FULL_STATE, sessionDetails: 'pending' }
    }), res)

    const state = stateOf(res)
    expect(state.pendingOutline.totalSessions).toBe(4)
    expect(state.sessionCountNotice).toEqual({ requested: 6, delivered: 4 })
  })

  test('requested four, delivered 4 → no notice', async () => {
    mockCreate = jest.fn(() => makeStream(outlineReply(4)))
    const res = makeRes()
    await courseEngine(makeReq({
      type: 'design',
      query: 'four sessions of 30 minutes please',
      courseState: { ...FULL_STATE, sessionDetails: 'pending' }
    }), res)

    const state = stateOf(res)
    expect(state.pendingOutline.totalSessions).toBe(4)
    expect(state.sessionCountNotice).toBeUndefined()
  })

  test('an ambiguous request (range) disables the check', async () => {
    mockCreate = jest.fn(() => makeStream(outlineReply(4)))
    const res = makeRes()
    await courseEngine(makeReq({
      type: 'design',
      query: '6-8 sessions of 30 minutes',
      courseState: { ...FULL_STATE, sessionDetails: 'pending' }
    }), res)

    expect(stateOf(res).sessionCountNotice).toBeUndefined()
  })

  test('a revision naming a count is checked against the revised outline', async () => {
    mockCreate = jest.fn(() => makeStream(outlineReply(4)))
    const res = makeRes()
    await courseEngine(makeReq({
      type: 'design',
      query: 'make it six sessions please',
      courseState: {
        ...FULL_STATE,
        sessionDetails: '20 minutes per session',
        pendingOutline: JSON.parse(outlineJSON(4))
      }
    }), res)

    expect(stateOf(res).sessionCountNotice).toEqual({ requested: 6, delivered: 4 })
  })

  test('a revision NOT naming a count never re-flags a previously accepted deviation', async () => {
    mockCreate = jest.fn(() => makeStream(outlineReply(4)))
    const res = makeRes()
    await courseEngine(makeReq({
      type: 'design',
      query: 'add a video resource to the last session',
      courseState: {
        ...FULL_STATE,
        sessionDetails: 'six sessions of 30 minutes', // the ORIGINAL ask — deliberately not re-checked
        pendingOutline: JSON.parse(outlineJSON(4))
      }
    }), res)

    expect(stateOf(res).sessionCountNotice).toBeUndefined()
  })

  test('a client-supplied stale notice is stripped — the flag is code-owned per generation', async () => {
    mockCreate = jest.fn(() => makeStream('Should not be called')) // fresh mock — no leaked calls
    const res = makeRes()
    await courseEngine(makeReq({
      type: 'design',
      query: 'complete beginner',
      courseState: {
        goalsPrimary: 'Learn pricing',
        currentLevel: 'pending',
        sessionCountNotice: { requested: 99, delivered: 1 } // hostile/stale round-trip
      }
    }), res)

    expect(stateOf(res).sessionCountNotice).toBeUndefined()
    expect(mockCreate).not.toHaveBeenCalled() // question turn — no AI involved
  })
})
