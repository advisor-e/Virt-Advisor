'use strict'

// CB-13 Phase 5 (design/COURSE-BUILDER-PLAN.md): back-fill the untested
// course-engine paths to the ≥90% route standard — quiz generation (AI path,
// malformed AI output, authored-override branch), the progress stub, the
// dispatcher's rejection branches, the rate limit, the SSE CORS branch and a
// mid-stream failure.

let mockCreate
jest.mock('../../server/utils/openaiClient', () => ({
  createOpenAIClient: () => ({
    chat: { completions: { create: (...args) => mockCreate(...args) } }
  })
}))

// Default: real behaviour (the shipped course-quizzes.json has no live
// entries, so the AI path runs). A test sets `mockOverrideQuestions` to
// exercise the authored-override branch.
let mockOverrideQuestions = null
jest.mock('../../server/utils/quizOverrides', () => ({
  findQuizOverride: (...args) =>
    mockOverrideQuestions !== null
      ? mockOverrideQuestions
      : jest.requireActual('../../server/utils/quizOverrides').findQuizOverride(...args)
}))

const { EventEmitter } = require('events')
const courseEngine = require('../../server/courseEngine')
const CourseReminderService = require('../../server/services/CourseReminderService')

let reqCount = 0
function makeReq (body, opts) {
  const req = new EventEmitter()
  req.headers = (opts && opts.headers) || {}
  // firmAuth attaches the verified identity; tests set it explicitly where needed.
  req.advisorId = opts && opts.advisorId
  req.socket = { remoteAddress: (opts && opts.ip) || `10.0.4.${++reqCount}`, destroy () {} }
  process.nextTick(() => {
    req.emit('data', Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)))
    req.emit('end')
  })
  return req
}

function makeRes () {
  const res = {
    headersSent: false,
    writableEnded: false,
    statusCode: null,
    headers: null,
    chunks: [],
    body: null,
    writeHead (status, headers) { res.statusCode = status; res.headers = headers || null; res.headersSent = true },
    write (chunk) { res.chunks.push(String(chunk)) },
    end (payload) {
      if (payload) { try { res.body = JSON.parse(payload) } catch (e) { res.body = payload } }
      res.writableEnded = true
    }
  }
  return res
}

function makeStream (text) {
  return {
    async * [Symbol.asyncIterator] () {
      yield { choices: [{ delta: { content: text } }] }
    }
  }
}

beforeEach(() => {
  mockOverrideQuestions = null
  mockCreate = jest.fn(() => makeStream('reply'))
})

describe('quiz-generate (CB-13 back-fill)', () => {
  const generateBody = () => ({
    type: 'quiz-generate',
    sessionContext: { title: 'Foundations', objectives: ['understand the basics'] },
    sessionHistory: [{ role: 'assistant', content: 'We covered the basics.' }]
  })

  test('valid AI questions come back as success', async () => {
    mockCreate = jest.fn(() => Promise.resolve({
      choices: [{ message: { content: JSON.stringify({ questions: [{ id: 1, question: 'Q1?', objective: 'o' }] }) } }]
    }))
    const res = makeRes()
    await courseEngine(makeReq(generateBody()), res)
    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.questions).toHaveLength(1)
  })

  test('malformed AI output is rejected, never served', async () => {
    mockCreate = jest.fn(() => Promise.resolve({
      choices: [{ message: { content: JSON.stringify({ questions: [{ id: 1 }] }) } }]
    }))
    const res = makeRes()
    await courseEngine(makeReq(generateBody()), res)
    expect(res.statusCode).toBe(500)
    expect(res.body.success).toBe(false)
  })

  test('an authored override is served without calling the AI', async () => {
    mockOverrideQuestions = [{ id: 1, question: 'Authored?', objective: 'o' }]
    const res = makeRes()
    await courseEngine(makeReq(generateBody()), res)
    expect(res.statusCode).toBe(200)
    expect(res.body.questions).toEqual(mockOverrideQuestions)
    expect(mockCreate).not.toHaveBeenCalled()
  })
})

describe('progress (CB-13 back-fill + CB-16 Stage C identity hardening)', () => {
  test('responds success; advisor identity comes from the verified pass, never the body', async () => {
    const spy = jest.spyOn(CourseReminderService, 'markComplete').mockImplementation(() => {})
    const res = makeRes()
    await courseEngine(makeReq(
      { type: 'progress', advisorId: 'ATTACKER', courseId: 'c1', sessionId: 2, score: 85 },
      { advisorId: 'advisor-from-jwt' }
    ), res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ success: true })
    expect(spy).toHaveBeenCalledWith({ advisorId: 'advisor-from-jwt', courseId: 'c1', sessionId: 2, score: 85 })
    spy.mockRestore()
  })

  test('a request with no verified advisor identity is refused', async () => {
    const spy = jest.spyOn(CourseReminderService, 'markComplete').mockImplementation(() => {})
    const res = makeRes()
    await courseEngine(makeReq({ type: 'progress', courseId: 'c1', sessionId: 1, score: 70 }), res)
    expect(res.statusCode).toBe(403)
    expect(res.body.error.code).toBe('NO_ADVISOR_IDENTITY')
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('dispatcher rejection branches (CB-13 back-fill)', () => {
  test('unknown type → 400 INVALID_TYPE', async () => {
    const res = makeRes()
    await courseEngine(makeReq({ type: 'nonsense' }), res)
    expect(res.statusCode).toBe(400)
    expect(res.body.error.code).toBe('INVALID_TYPE')
  })

  test('non-object JSON body → 400 INVALID_BODY', async () => {
    const res = makeRes()
    await courseEngine(makeReq('"just a string"'), res)
    expect(res.statusCode).toBe(400)
    expect(res.body.error.code).toBe('INVALID_BODY')
  })

  test('unparseable body → 400 INVALID_JSON', async () => {
    const res = makeRes()
    await courseEngine(makeReq('not json at all'), res)
    expect(res.statusCode).toBe(400)
    expect(res.body.error.code).toBe('INVALID_JSON')
  })

  test('the query is capped at 4000 characters', async () => {
    const res = makeRes()
    await courseEngine(makeReq({ type: 'design', query: 'x'.repeat(5000), courseState: {} }), res)
    const states = res.chunks.join('').split('\n\n')
      .filter(f => f.startsWith('data: ')).map(f => JSON.parse(f.slice(6)))
      .filter(e => e.type === 'state')
    expect(states[states.length - 1].state.goalsPrimary.length).toBe(4000)
  })

  test('the 16th request in a minute from one address is rate-limited', async () => {
    const ip = '10.99.99.99'
    for (let i = 0; i < 15; i++) {
      const res = makeRes()
      await courseEngine(makeReq({ type: 'nonsense' }, { ip }), res)
      expect(res.statusCode).toBe(400) // through the limiter, rejected by type
    }
    const res = makeRes()
    await courseEngine(makeReq({ type: 'nonsense' }, { ip }), res)
    expect(res.statusCode).toBe(429)
  })
})

describe('SSE plumbing (CB-13 back-fill)', () => {
  const designBody = () => ({ type: 'design', query: 'Help me with succession planning', courseState: {} })

  test('a localhost origin gets the CORS header; anything else does not', async () => {
    const resLocal = makeRes()
    await courseEngine(makeReq(designBody(), { headers: { origin: 'http://localhost:3000' } }), resLocal)
    expect(resLocal.headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000')

    const resEvil = makeRes()
    await courseEngine(makeReq(designBody(), { headers: { origin: 'https://evil.example' } }), resEvil)
    expect(resEvil.headers['Access-Control-Allow-Origin']).toBeUndefined()
  })

  test('a mid-stream failure still ends the response cleanly with a done event', async () => {
    mockCreate = jest.fn(() => ({
      async * [Symbol.asyncIterator] () {
        yield { choices: [{ delta: { content: 'partial ' } }] }
        throw new Error('stream died')
      }
    }))
    const res = makeRes()
    await courseEngine(makeReq({
      type: 'design',
      query: 'ready',
      courseState: {
        goalsPrimary: 'Improve profit and cash flow conversations',
        currentLevel: 'beginner',
        intensity: 'consistent',
        sessionDetails: '4 sessions of 30 minutes'
      }
    }), res)

    const events = res.chunks.join('').split('\n\n')
      .filter(f => f.startsWith('data: ')).map(f => JSON.parse(f.slice(6)))
    expect(events.some(e => e.type === 'done')).toBe(true)
    expect(res.writableEnded).toBe(true)
  })
})
