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

// ⚠ WHAT CHANGED HERE, AND WHY (2026-08-03, later the same day).
//
// When these tests were written, a named session length produced the AI's own
// grouping with a computed length attached, and a session that missed the
// request was FLAGGED. The slicer replaced that: a named length now means code
// writes the timetable, so a 99-minute session against a 30-minute request can
// no longer be built at all — the material is cut into 30-minute slices, or the
// advisor is asked which of length and count should give.
//
// The guarantee these tests exist for is unchanged and stronger: THE ADVISOR IS
// NEVER SHOWN A SESSION LENGTH THAT NOTHING CHECKED. Each test below now pins
// it in whichever form applies to its path — sliced, or the AI grouping that
// still runs when no length is named. Nothing here was relaxed to make the
// slicer pass; where a rule was superseded, the replacement is asserted.

describe('session length is computed, not accepted from the AI', () => {
  test("the AI's claimed 30 minutes never reaches the advisor — 99 of work is stated instead", async () => {
    const state = await design(
      '30 minutes per session, 1 session',
      outlineReply([{ resources: ['E.O.Y Meeting'], claimed: 30 }])
    )
    // 99 minutes cannot be one 30-minute session, so the app asks rather than
    // showing either number as though it were settled.
    expect(state.pendingFit.totalMinutes).toBe(99)
    expect(state.pendingOutline).toBeNull()
    // And neither option offers the AI's figure as a session length.
    expect(state.pendingFit.options.every(o => o.sessions >= 3)).toBe(true)
  })

  test('with no length named, the AI grouping is timed and its claim replaced', async () => {
    // The path that still runs the original behaviour: nothing to slice to.
    const state = await design(
      'as long as it takes, 1 session',
      outlineReply([{ resources: ['E.O.Y Meeting'], claimed: 30 }])
    )
    expect(state.pendingOutline.sessions[0].estimatedMinutes).toBe(99)
    expect(state.courseMinutes).toBe(99)
  })

  test('the breakdown reaches the state, so a screen can show where the time goes', async () => {
    const state = await design(
      'as long as it takes, 1 session',
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
      'as long as it takes, 2 sessions',
      outlineReply([
        { resources: ['E.O.Y Meeting'], claimed: 30 },
        { resources: ['Sales Psychology'], claimed: 30 }
      ])
    )
    expect(state.courseMinutes).toBe(129)
  })

  test('the same total is stated when the course is sliced instead', async () => {
    const state = await design(
      '30 minutes per session, 2 sessions',
      outlineReply([
        { resources: ['E.O.Y Meeting'], claimed: 30 },
        { resources: ['Sales Psychology'], claimed: 30 }
      ])
    )
    // Cutting the material differently never changes how much of it there is.
    expect(state.pendingFit.totalMinutes).toBe(129)
  })
})

describe('an over-long session can no longer be built at all', () => {
  // SUPERSEDED, NOT DROPPED. This block used to prove the app FLAGGED a session
  // that missed the request. The slicer prevents it instead, so each test now
  // proves the stronger thing: the session the notice would have warned about
  // does not exist.

  test('99 minutes of work against a 30-minute request is never shown as one session', async () => {
    const state = await design(
      '30 minutes per session, 1 session',
      outlineReply([{ resources: ['E.O.Y Meeting'], claimed: 30 }])
    )
    // Nothing to flag, because nothing over-long was built: the app asked.
    expect(state.sessionLengthNotice).toBeUndefined()
    expect(state.pendingOutline).toBeNull()
    expect(state.pendingFit.options[0].label).toContain('30 minutes each')
  })

  test('after the advisor picks, every session honours the length they asked for', async () => {
    const asked = await design(
      '30 minutes per session, 1 session',
      outlineReply([{ resources: ['E.O.Y Meeting'], claimed: 30 }])
    )
    mockCreate = jest.fn(() => makeStream('THE AI SHOULD NOT BE CALLED'))
    const res = makeRes()
    await courseEngine(makeReq({
      type: 'design',
      query: 'that one',
      fitChoice: 'keep-length',
      courseState: { ...FULL_STATE, sessionDetails: '30 minutes per session, 1 session', pendingFit: asked.pendingFit }
    }), res)

    const outline = stateOf(res).pendingOutline
    expect(outline.sessions.every(s => s.estimatedMinutes <= 30)).toBe(true)
    expect(outline.sessions.reduce((n, s) => n + s.estimatedMinutes, 0)).toBe(99)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  // 🔴 THE LIVE FAILURE, 2026-08-03. Mike answered "15 to 20 minutes per session
  // and say four sessions please" and was drawn sessions of 70/63/30 minutes in
  // silence. This drives his exact words through the real handler.
  test("MIKE'S LIVE ANSWER — his words now produce a question, never a 70-minute session", async () => {
    const state = await design(
      '15 to 20 minutes per session and say four sessions please',
      outlineReply([
        { resources: ['E.O.Y Meeting'], claimed: 20 }, // 99 min
        { resources: ['Sales Psychology'], claimed: 20 } // 30 min
      ])
    )
    expect(state.pendingFit.budget).toEqual({ min: 15, max: 20 })
    expect(state.pendingFit.requestedCount).toEqual({ min: 4, max: 4 })
    expect(state.pendingFit.totalMinutes).toBe(129)
    // Both numbers he gave are quoted back; neither is silently overridden.
    expect(state.pendingFit.options[0].label).toContain('15–20 minutes each')
    expect(state.pendingFit.options[1].label).toContain('as short as possible')
  })

  test('a session inside the requested band raises nothing', async () => {
    const state = await design(
      '25 to 40 minutes per session, 1 session',
      outlineReply([{ resources: ['Sales Psychology'], claimed: 30 }]) // 30 min
    )
    expect(state.sessionLengthNotice).toBeUndefined()
  })

  test('a session that genuinely fits raises nothing', async () => {
    const state = await design(
      '30 minutes per session, 1 session',
      outlineReply([{ resources: ['Sales Psychology'], claimed: 30 }])
    )
    expect(state.sessionLengthNotice).toBeUndefined()
  })

  test('the long template is cut down rather than named in a warning', async () => {
    const asked = await design(
      '30 minutes per session, 2 sessions',
      outlineReply([
        { resources: ['Sales Psychology'], claimed: 30 },
        { resources: ['E.O.Y Meeting'], claimed: 30 }
      ])
    )
    mockCreate = jest.fn(() => makeStream('THE AI SHOULD NOT BE CALLED'))
    const res = makeRes()
    await courseEngine(makeReq({
      type: 'design',
      query: 'that one',
      fitChoice: 'keep-length',
      courseState: { ...FULL_STATE, sessionDetails: '30 minutes per session, 2 sessions', pendingFit: asked.pendingFit }
    }), res)

    const outline = stateOf(res).pendingOutline
    // The 99-minute template becomes its own sessions; nothing is over-long, so
    // there is no offending session left to name.
    expect(stateOf(res).sessionLengthNotice).toBeUndefined()
    expect(outline.sessions.every(s => s.estimatedMinutes <= 30)).toBe(true)
    expect(outline.sessions.filter(s => s.slice.resource === 'E.O.Y Meeting').length).toBeGreaterThan(1)
  })

  test('the slicer never breaks its own budget — the invariant guard stays quiet', async () => {
    const state = await design(
      'about 20 minutes a session',
      outlineReply([{ resources: ['E.O.Y Meeting'], claimed: 20 }])
    )
    expect(state.sessionLengthNotice).toBeUndefined()
    expect(state.pendingOutline.sessions.every(s => s.estimatedMinutes <= 20)).toBe(true)
  })

  test('an unparseable length disables the check rather than guessing', async () => {
    const state = await design(
      'as long as it takes, 1 session',
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
