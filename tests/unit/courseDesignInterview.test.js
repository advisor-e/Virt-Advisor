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
