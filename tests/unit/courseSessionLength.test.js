'use strict'

// End-to-end through the design handler: the session length an advisor is shown
// is computed from the resources the AI chose, not copied from what the AI said.
//
// The defect this pins: the design prompt instructs the model to "set
// estimatedMinutes to match the session length the advisor requested", so the
// number was an echo of the request and nothing ever compared it to the work.
// A 30-minute session could prescribe 99 minutes of video, reading and
// rehearsal and no part of the system noticed.
//
// The template library is mocked, as it is in cpdCatalogue's and courseEffort's
// tests — the real export is replaced wholesale on every master release.

let mockCreate
jest.mock('../../server/utils/openaiClient', () => ({
  createOpenAIClient: () => ({
    chat: { completions: { create: (...args) => mockCreate(...args) } }
  })
}))

jest.mock('../../server/utils/templates', () => ({
  getOrgTemplates: jest.fn(() => []),
  filterTemplatesByQuery: jest.fn(list => list),
  formatTemplatesForPrompt: jest.fn(() => '')
}))

const { EventEmitter } = require('events')
const { getOrgTemplates } = require('../../server/utils/templates')
const cpd = require('../../server/utils/cpdCatalogue')
const courseEngine = require('../../server/courseEngine')

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
    chunks: [],
    writeHead () { res.headersSent = true },
    write (chunk) { res.chunks.push(String(chunk)) },
    end () { res.writableEnded = true }
  }
  return res
}

function sseEvents (res) {
  return res.chunks.join('').split('\n\n')
    .filter(f => f.startsWith('data: '))
    .map(f => JSON.parse(f.slice(6)))
}

function stateOf (res) {
  const states = sseEvents(res).filter(e => e.type === 'state')
  return states[states.length - 1].state
}

function makeStream (text) {
  return { async * [Symbol.asyncIterator] () { yield { choices: [{ delta: { content: text } }] } } }
}

/** The library used by every test here. */
const LIBRARY = [
  // 9 + 60 + 30 = 99 minutes — the shape that started this work.
  {
    page: 'p1',
    title: 'E.O.Y Meeting',
    section: 'Do the Job',
    subSection: 'Meetings',
    cpd: { isHidden: false, watchedVideo: 9, reviewTemplate: 60, reheasedTemplate: 30 }
  },
  // 5 + 15 + 10 = 30 minutes — a session that fits a 30-minute request exactly.
  {
    page: 'p2',
    title: 'Sales Psychology',
    section: 'Get the Job',
    subSection: 'Selling',
    cpd: { isHidden: false, watchedVideo: 5, reviewTemplate: 15, reheasedTemplate: 10 }
  },
  // A hidden, untimed industry model — 30 minutes by Mike's ruling, not zero.
  {
    page: 'p3',
    title: 'Cafe',
    section: 'Do the Job',
    subSection: 'Revenue & Feasibility Models',
    cpd: { isHidden: true, watchedVideo: 0, reviewTemplate: 0, reheasedTemplate: 0 }
  },
  // Visible, not a model, no authored time — unknown, never zero.
  {
    page: 'p4',
    title: 'Dashboard Report',
    section: 'Do the Job',
    subSection: 'Reporting',
    cpd: { isHidden: false, watchedVideo: 0, reviewTemplate: 0, reheasedTemplate: 0 }
  }
]

/** An outline reply as the model streams it, with the AI's own minute claims. */
function outlineReply (sessions) {
  const outline = {
    title: 'T',
    topic: 'x',
    intensity: 'consistent',
    totalSessions: sessions.length,
    sessions: sessions.map((s, i) => ({
      id: i + 1,
      title: `S${i + 1}`,
      focus: 'F',
      resources: s.resources,
      objectives: ['o'],
      // What the AI always wrote: the number the advisor asked for.
      estimatedMinutes: s.claimed
    }))
  }
  return `Here is your course.\n[COURSE_OUTLINE]${JSON.stringify(outline)}[/COURSE_OUTLINE]\nDoes this look right?`
}

const FULL_STATE = {
  goalsPrimary: 'Learn to run end-of-year meetings',
  currentLevel: 'complete beginner',
  intensity: 'consistent'
}

/** Drive the design handler to the outline step with one session-format answer. */
async function design (answer, reply) {
  mockCreate = jest.fn(() => makeStream(reply))
  const res = makeRes()
  await courseEngine(makeReq({
    type: 'design',
    query: answer,
    courseState: { ...FULL_STATE, sessionDetails: 'pending' }
  }), res)
  return stateOf(res)
}

let warn
beforeEach(() => {
  jest.clearAllMocks()
  getOrgTemplates.mockReturnValue(LIBRARY)
  cpd.resetCache()
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => warn.mockRestore())

describe('session length is computed, not accepted from the AI', () => {
  test("the AI's claimed 30 minutes is replaced by the real 99", async () => {
    const state = await design(
      '30 minutes per session, 1 session',
      outlineReply([{ resources: ['E.O.Y Meeting'], claimed: 30 }])
    )
    expect(state.pendingOutline.sessions[0].estimatedMinutes).toBe(99)
    expect(state.courseMinutes).toBe(99)
  })

  test('the breakdown reaches the state, so a screen can show where the time goes', async () => {
    const state = await design(
      '30 minutes per session, 1 session',
      outlineReply([{ resources: ['E.O.Y Meeting'], claimed: 30 }])
    )
    expect(state.pendingOutline.sessions[0].sessionEffort)
      .toMatchObject({ minutes: 99, video: 9, reading: 60, rehearsal: 30, unknown: [] })
  })

  test('an untimed industry model counts 30 minutes rather than nothing', async () => {
    const state = await design(
      '30 minutes per session, 1 session',
      outlineReply([{ resources: ['Cafe'], claimed: 30 }])
    )
    expect(state.pendingOutline.sessions[0].estimatedMinutes).toBe(30)
    expect(state.pendingOutline.sessions[0].sessionEffort.modelMinutes).toBe(30)
  })

  test('a session with nothing published carries no estimate, and says which resource', async () => {
    const state = await design(
      '30 minutes per session, 1 session',
      outlineReply([{ resources: ['Dashboard Report'], claimed: 30 }])
    )
    const session = state.pendingOutline.sessions[0]
    expect('estimatedMinutes' in session).toBe(false)
    expect(session.sessionEffort.unknown).toEqual(['Dashboard Report'])
    expect(state.courseUnknownCount).toBe(1)
  })

  test('the course total is the sum across sessions', async () => {
    const state = await design(
      '30 minutes per session, 2 sessions',
      outlineReply([
        { resources: ['E.O.Y Meeting'], claimed: 30 },
        { resources: ['Sales Psychology'], claimed: 30 }
      ])
    )
    expect(state.courseMinutes).toBe(129)
  })
})

describe('the length mismatch is flagged by code', () => {
  test('99 minutes of work against a 30-minute request raises the notice', async () => {
    const state = await design(
      '30 minutes per session, 1 session',
      outlineReply([{ resources: ['E.O.Y Meeting'], claimed: 30 }])
    )
    expect(state.sessionLengthNotice).toEqual({
      requested: 30,
      sessions: [{ id: 1, title: 'S1', minutes: 99 }]
    })
  })

  test('a session that genuinely fits raises nothing', async () => {
    const state = await design(
      '30 minutes per session, 1 session',
      outlineReply([{ resources: ['Sales Psychology'], claimed: 30 }])
    )
    expect(state.sessionLengthNotice).toBeUndefined()
  })

  test('only the offending session is named when the rest of the course fits', async () => {
    const state = await design(
      '30 minutes per session, 2 sessions',
      outlineReply([
        { resources: ['Sales Psychology'], claimed: 30 },
        { resources: ['E.O.Y Meeting'], claimed: 30 }
      ])
    )
    expect(state.sessionLengthNotice.sessions).toEqual([{ id: 2, title: 'S2', minutes: 99 }])
  })

  test('an unparseable length disables the check rather than guessing', async () => {
    const state = await design(
      'say 20 to 30 minutes per session and 1 session please',
      outlineReply([{ resources: ['E.O.Y Meeting'], claimed: 30 }])
    )
    // The length still gets computed and shown — only the comparison stands down.
    expect(state.pendingOutline.sessions[0].estimatedMinutes).toBe(99)
    expect(state.sessionLengthNotice).toBeUndefined()
  })

  test('the notice is code-owned — a value posted from the browser is discarded', async () => {
    mockCreate = jest.fn(() => makeStream(outlineReply([{ resources: ['Sales Psychology'], claimed: 30 }])))
    const res = makeRes()
    await courseEngine(makeReq({
      type: 'design',
      query: '30 minutes per session, 1 session',
      courseState: {
        ...FULL_STATE,
        sessionDetails: 'pending',
        sessionLengthNotice: { requested: 5, sessions: [{ id: 9, title: 'FAKE', minutes: 1 }] },
        courseMinutes: 99999
      }
    }), res)

    const state = stateOf(res)
    expect(state.sessionLengthNotice).toBeUndefined()
    expect(state.courseMinutes).toBe(30)
  })
})
