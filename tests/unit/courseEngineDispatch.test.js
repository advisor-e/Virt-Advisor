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

// Default: real behaviour (the shipped course-quizzes.json overrides section
// has no live entries, so the AI path runs). A test sets
// `mockOverrideQuestions` / `mockBank` to exercise the authored-override and
// CB-30 bank branches.
let mockOverrideQuestions = null
let mockBank = null
jest.mock('../../server/utils/quizOverrides', () => ({
  findQuizOverride: (...args) =>
    mockOverrideQuestions !== null
      ? mockOverrideQuestions
      : jest.requireActual('../../server/utils/quizOverrides').findQuizOverride(...args),
  findQuizBank: (...args) =>
    mockBank !== null
      ? mockBank
      : jest.requireActual('../../server/utils/quizOverrides').findQuizBank(...args)
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
  mockBank = null
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

describe('quiz-generate with a firm question bank (CB-30)', () => {
  const THE_BANK = {
    source: 'Course Builder Quiz/Working Capital Cycle quiz.pdf',
    entries: [
      { id: 1, question: 'BANK-Q-ONE?', answer: 'A1.', keyPoint: 'BANK-KEYPOINT-ONE' },
      { id: 2, question: 'BANK-Q-TWO?', answer: 'A2.', keyPoint: 'BANK-KEYPOINT-TWO' }
    ]
  }
  const generateBody = () => ({
    type: 'quiz-generate',
    sessionContext: { title: 'Foundations', objectives: ['understand the basics'], resources: ['Working Capital Cycle'] },
    sessionHistory: [{ role: 'assistant', content: 'We covered the basics.' }]
  })
  const bankQuestions = () => JSON.stringify({
    questions: [
      { id: 1, question: 'Tailored 1?', objective: 'o', bankRef: 1 },
      { id: 2, question: 'Tailored 2?', objective: 'o', bankRef: 2 },
      { id: 3, question: 'Tailored 3?', objective: 'o', bankRef: 1 }
    ]
  })

  test('the prompt carries the bank entries and demands bankRef tagging', async () => {
    mockBank = THE_BANK
    mockCreate = jest.fn(() => Promise.resolve({ choices: [{ message: { content: bankQuestions() } }] }))
    const res = makeRes()
    await courseEngine(makeReq(generateBody()), res)

    const prompt = mockCreate.mock.calls[0][0].messages[0].content
    expect(prompt).toContain('mandatory source material')
    expect(prompt).toContain('BANK-Q-ONE?')
    expect(prompt).toContain('BANK-KEYPOINT-TWO')
    expect(prompt).toContain('"bankRef"')
    expect(prompt).toContain('never ask anything the bank does not cover')
    expect(res.statusCode).toBe(200)
    expect(res.body.questions.map(q => q.bankRef)).toEqual([1, 2, 1])
  })

  test('the model answers stay out of the generate prompt (only the grader sees them)', async () => {
    mockBank = THE_BANK
    mockCreate = jest.fn(() => Promise.resolve({ choices: [{ message: { content: bankQuestions() } }] }))
    await courseEngine(makeReq(generateBody()), makeRes())

    const prompt = mockCreate.mock.calls[0][0].messages[0].content
    expect(prompt).not.toContain('A1.')
    expect(prompt).not.toContain('A2.')
  })

  test('an authored override still wins over a bank — served verbatim, no AI call', async () => {
    mockOverrideQuestions = [{ id: 1, question: 'Authored?', objective: 'o' }]
    mockBank = THE_BANK
    const res = makeRes()
    await courseEngine(makeReq(generateBody()), res)
    expect(res.body.questions).toEqual(mockOverrideQuestions)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  test('without a bank the prompt is the plain session-content one', async () => {
    mockCreate = jest.fn(() => Promise.resolve({
      choices: [{ message: { content: JSON.stringify({ questions: [{ id: 1, question: 'Q1?', objective: 'o' }] }) } }]
    }))
    await courseEngine(makeReq({
      type: 'quiz-generate',
      sessionContext: { title: 'Foundations', objectives: ['understand the basics'] },
      sessionHistory: [{ role: 'assistant', content: 'We covered the basics.' }]
    }), makeRes())

    const prompt = mockCreate.mock.calls[0][0].messages[0].content
    expect(prompt).not.toContain('mandatory source material')
    expect(prompt).not.toContain('bankRef')
    expect(prompt).toContain('Questions 1 and 2 must test the specific facts')
  })

  test('a non-integer bankRef from the AI is stripped, the quiz still serves', async () => {
    mockBank = THE_BANK
    mockCreate = jest.fn(() => Promise.resolve({
      choices: [{
        message: {
          content: JSON.stringify({
            questions: [
              { id: 1, question: 'Q1?', objective: 'o', bankRef: 'one' },
              { id: 2, question: 'Q2?', objective: 'o', bankRef: 2 }
            ]
          })
        }
      }]
    }))
    const res = makeRes()
    await courseEngine(makeReq(generateBody()), res)

    expect(res.statusCode).toBe(200)
    expect(res.body.questions[0].bankRef).toBeUndefined()
    expect(res.body.questions[1].bankRef).toBe(2)
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
