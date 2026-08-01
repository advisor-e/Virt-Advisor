'use strict'

// Quiz provenance — every generated question must be traceable back to the
// firm's own material. `bankRef` alone is an entry NUMBER: "entry 5" cannot be
// acted on without knowing "entry 5 of WHICH bank", so quiz-generate returns
// the bank's identity alongside the questions.
//
// The security line this must not cross: the firm's model answers are revealed
// only AFTER grading (handleQuizGrade), so the browser never holds the answers
// while the advisor is writing theirs. Identity is safe to send; entries are
// not. The last test in this file locks that.

let mockCreate
jest.mock('../../server/utils/openaiClient', () => ({
  createOpenAIClient: () => ({
    chat: { completions: { create: (...args) => mockCreate(...args) } }
  })
}))

const fs = require('fs')
const path = require('path')
const { EventEmitter } = require('events')
const courseEngine = require('../../server/courseEngine')

const quizzes = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../data/course-quizzes.json'), 'utf8')
)
const BANK_KEY = 'Ratio Analysis' // shipped bank, locked by quizBankKeys.test.js

let reqCount = 0
function makeReq (body) {
  const req = new EventEmitter()
  req.headers = {}
  req.socket = { remoteAddress: `10.0.9.${++reqCount}`, destroy () {} }
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
    statusCode: null,
    body: null,
    writeHead (status) { res.statusCode = status; res.headersSent = true },
    write () {},
    end (payload) { res.body = payload ? JSON.parse(payload) : null; res.writableEnded = true }
  }
  return res
}

function generateBody (resource) {
  return {
    type: 'quiz-generate',
    sessionContext: {
      title: 'Session 2: an AI-invented title that is not a page name',
      resources: [resource],
      objectives: ['Interpret benchmark data safely']
    },
    sessionHistory: [{ role: 'assistant', content: 'We covered common size analysis.' }]
  }
}

function aiQuestions (withBankRefs) {
  return {
    choices: [{
      message: {
        content: JSON.stringify({
          questions: [1, 2, 3].map(n => Object.assign(
            { id: n, question: `Question ${n}?`, objective: 'An objective' },
            withBankRefs ? { bankRef: n } : {}
          ))
        })
      }
    }]
  }
}

async function run (body) {
  const res = makeRes()
  await courseEngine(makeReq(body), res)
  return res
}

beforeEach(() => {
  mockCreate = jest.fn().mockResolvedValue(aiQuestions(true))
})

describe('quiz-generate returns the bank that fed the questions', () => {
  test('a session teaching from a banked page names the bank and its source', async () => {
    const res = await run(generateBody(BANK_KEY))

    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.bank).toEqual({
      key: BANK_KEY,
      source: quizzes.banks[BANK_KEY].source,
      origin: 'platform'
    })
  })

  test('the key is the exact library title, so it can be looked up', () => {
    const templates = require('../../data/templates.json')
    expect(templates.some(t => t.title === BANK_KEY)).toBe(true)
  })

  test('questions still carry their entry number, which the bank key makes usable', async () => {
    const res = await run(generateBody(BANK_KEY))
    expect(res.body.questions.map(q => q.bankRef)).toEqual([1, 2, 3])
  })

  test('a page with no bank reports null rather than implying a firm source', async () => {
    mockCreate = jest.fn().mockResolvedValue(aiQuestions(false))
    const res = await run(generateBody('A Page That Does Not Exist Anywhere'))

    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.bank).toBeNull()
  })

  test('SECURITY: the model answers are never sent with the questions', async () => {
    const res = await run(generateBody(BANK_KEY))

    const wire = JSON.stringify(res.body)
    for (const entry of quizzes.banks[BANK_KEY].entries) {
      expect(wire).not.toContain(entry.answer)
    }
    expect(res.body.bank.entries).toBeUndefined()
  })
})
