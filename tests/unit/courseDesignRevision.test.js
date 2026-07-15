'use strict'

// CB-01 (design/COURSE-BUILDER-PLAN.md): a failed outline revision must never
// destroy the advisor's approved outline. The revision flow clears
// state.pendingOutline before streaming, so if the AI's reply carries no valid
// replacement outline the engine must restore the previous one in the final
// state event — commit-only-on-success.

// The engine caches one OpenAI client per process (singleton), so the mock
// must expose a STABLE client whose create() delegates to the current test's
// stub — a per-test client object would only ever be picked up once.
let mockCreate
jest.mock('../../server/utils/openaiClient', () => ({
  createOpenAIClient: () => ({
    chat: { completions: { create: (...args) => mockCreate(...args) } }
  })
}))

const { EventEmitter } = require('events')
const courseEngine = require('../../server/courseEngine')

/** Async-iterable stream of OpenAI-style delta chunks. */
function makeStream (text) {
  return {
    async * [Symbol.asyncIterator] () {
      yield { choices: [{ delta: { content: text } }] }
    }
  }
}

function stubOpenAI (impl) {
  mockCreate = jest.fn(impl)
}

/** Fake request carrying a JSON body; unique IP per call to sidestep the rate limiter. */
let reqCount = 0
function makeReq (body) {
  const req = new EventEmitter()
  req.headers = {}
  req.socket = { remoteAddress: `10.0.0.${++reqCount}`, destroy () {} }
  process.nextTick(() => {
    req.emit('data', Buffer.from(JSON.stringify(body)))
    req.emit('end')
  })
  return req
}

/** Fake response capturing SSE frames. */
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

/** Parse captured SSE frames back into event objects. */
function sseEvents (res) {
  return res.chunks
    .join('')
    .split('\n\n')
    .filter(f => f.startsWith('data: '))
    .map(f => JSON.parse(f.slice(6)))
}

const APPROVED_OUTLINE = {
  title: 'Approved Course',
  topic: 'Selling advisory services',
  intensity: 'consistent',
  totalSessions: 2,
  sessions: [
    { id: 1, title: 'Session One', focus: 'Basics', resources: [], objectives: [], estimatedMinutes: 30 },
    { id: 2, title: 'Session Two', focus: 'Practice', resources: [], objectives: [], estimatedMinutes: 30 }
  ]
}

// courseState mid-revision: all discovery fields answered, outline pending.
function revisionBody () {
  return {
    type: 'design',
    query: 'Please make session two more advanced.',
    courseState: {
      goalsPrimary: 'Learn to sell advisory services',
      currentLevel: 'Beginner',
      intensity: 'Consistent please',
      sessionDetails: '2 sessions of 30 minutes',
      pendingOutline: APPROVED_OUTLINE
    }
  }
}

function finalStateEvent (res) {
  const states = sseEvents(res).filter(e => e.type === 'state')
  return states[states.length - 1]
}

describe('courseEngine design revision — CB-01 outline preservation', () => {
  test('a valid revised outline replaces the approved one', async () => {
    const revised = { ...APPROVED_OUTLINE, title: 'Revised Course' }
    stubOpenAI(() => makeStream(
      `Here is the update.\n[COURSE_OUTLINE]\n${JSON.stringify(revised)}\n[/COURSE_OUTLINE]`
    ))
    const res = makeRes()
    await courseEngine(makeReq(revisionBody()), res)

    expect(finalStateEvent(res).state.pendingOutline.title).toBe('Revised Course')
    expect(res.writableEnded).toBe(true)
  })

  test('a malformed revision restores the approved outline instead of destroying it', async () => {
    stubOpenAI(() => makeStream(
      'Sure, here is the update.\n[COURSE_OUTLINE]\nnot valid json {{{\n[/COURSE_OUTLINE]'
    ))
    const res = makeRes()
    await courseEngine(makeReq(revisionBody()), res)

    expect(finalStateEvent(res).state.pendingOutline).toEqual(APPROVED_OUTLINE)
  })

  test('a revision that fails shape validation restores the approved outline', async () => {
    stubOpenAI(() => makeStream(
      `Updated!\n[COURSE_OUTLINE]\n${JSON.stringify({ title: 'No Sessions', sessions: [] })}\n[/COURSE_OUTLINE]`
    ))
    const res = makeRes()
    await courseEngine(makeReq(revisionBody()), res)

    expect(finalStateEvent(res).state.pendingOutline).toEqual(APPROVED_OUTLINE)
  })

  test('an OpenAI failure during a revision restores the approved outline', async () => {
    stubOpenAI(() => { throw new Error('boom') })
    const res = makeRes()
    await courseEngine(makeReq(revisionBody()), res)

    expect(finalStateEvent(res).state.pendingOutline).toEqual(APPROVED_OUTLINE)
    expect(res.writableEnded).toBe(true)
  })

  test('an OpenAI failure emits a user-facing error message, never a silent done (CB-10)', async () => {
    stubOpenAI(() => { throw new Error('boom') })
    const res = makeRes()
    await courseEngine(makeReq(revisionBody()), res)

    const errorEvent = sseEvents(res).find(e => e.type === 'error')
    expect(errorEvent).toBeDefined()
    expect(errorEvent.message).toBe('AI response timed out. Please try again.')
  })

  test('first-time outline generation (no revision) still carries no fallback', async () => {
    stubOpenAI(() => makeStream('Prose only, no outline markers.'))
    const res = makeRes()
    const body = revisionBody()
    body.courseState.pendingOutline = null
    await courseEngine(makeReq(body), res)

    expect(finalStateEvent(res).state.pendingOutline).toBeNull()
  })
})
