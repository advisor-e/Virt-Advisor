'use strict'

/**
 * Screen 4 of a recorded strategy session — each section's words placed under the box that was
 * open when they were spoken, and the advisor's Keep / Reject / Move (item 8.4).
 *
 * 🔴 WHAT UAT CANNOT SEE, AND WHY EACH TEST BELOW EXISTS:
 *
 *   1. **Keep adds below, never replaces** (Decision F). A box that lost the advisor's own typing
 *      looks perfectly tidy on screen.
 *   2. **The record and the box agree.** A passage marked kept whose box write failed would claim
 *      a sentence the plan does not hold.
 *   3. **Placement never depends on the AI.** A failed tidy still leaves every passage under its
 *      box, with no suggestion rather than a guessed one.
 *   4. **Only this recording's own planning session**, and only its own card's boxes.
 *   5. **A second run never undoes a decision** already made.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'msw-test-'))
process.env.MEETING_AUDIO_DIR = ROOT

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn().mockResolvedValue(null),
  saveFirmConfig: jest.fn(),
  loadFirmConfigsByPrefix: jest.fn().mockResolvedValue({})
}))
jest.mock('../../server/utils/strategySessionStore', () => ({
  getSession: jest.fn(),
  loadTimeline: jest.fn(),
  loadEntries: jest.fn(),
  saveEntry: jest.fn()
}))
jest.mock('../../server/routes/strategyPlanner', () => ({ unknownBoxes: jest.fn() }))

const strategyStore = require('../../server/utils/strategySessionStore')
const planner = require('../../server/routes/strategyPlanner')
const passageTidy = require('../../server/utils/passageTidy')
const store = require('../../server/utils/meetingAudioStore')
const seg = require('../../server/routes/meetingSegments')

const FIRM = 'firm-words'
const ADVISOR = 'adv-words'
const CLIENT = 'client-words'
const SESSION = 41
const CONCEPT = 'porters-5-forces'
const BOX = 't0r1c0'

function makeRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { this._body = JSON.parse(body) }
  }
}

function req (meetingId, extra = {}) {
  return { firmId: FIRM, advisorId: extra.advisorId || ADVISOR, params: { meetingId, ...(extra.params || {}) }, body: extra.body || {} }
}

/**
 * A recorded Porter's section, transcribed, with a timeline whose Customers box opened ten
 * seconds in. The first row falls before it (tray), the other two inside it.
 */
function transcribedSection (over = {}) {
  const meetingId = store.createMeeting({
    firmId: FIRM,
advisor: ADVISOR,
clientId: CLIENT,
retentionMonths: 18,
segmented: true,
    strategySessionId: over.noSession ? null : SESSION
  }).meetingId
  const opened = store.openSegment(meetingId, { conceptId: CONCEPT, label: 'Porter\'s 5 Forces' })
  const n = opened.n
  const startedAt = opened.meta.segments.filter(s => s.n === n)[0].startedAt
  const at = s => new Date(Date.parse(startedAt) + s * 1000).toISOString().replace('T', ' ').replace('Z', '')
  strategyStore.loadTimeline.mockResolvedValue([{ frameworkId: CONCEPT, fieldKey: BOX, openedAt: at(10), closedAt: null }])
  store.writeSegmentTranscript(meetingId, n, {
    segments: over.rows || [
      { start: 1, end: 4, text: 'so this one is Porter\'s', role: 'advisor' },
      { start: 12, end: 16, text: 'they buy on price', role: 'client' },
      { start: 17, end: 19, text: 'loyal to the brand not us', role: 'client' }
    ]
  })
  store.updateSegment(meetingId, n, { state: 'done' })
  return { meetingId, n }
}

async function placed (over) {
  const s = transcribedSection(over)
  await seg.runSegmentWords(s.meetingId, s.n)
  return s
}

function passagesOf (s) {
  return store.readSegmentWords(s.meetingId, s.n).passages
}

async function decide (s, passageId, body, extra) {
  const res = makeRes()
  await seg.decideWords(req(s.meetingId, { params: { n: String(s.n), passageId }, body, ...(extra || {}) }), res)
  return res
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(passageTidy, 'suggest').mockResolvedValue({ model: 'test', provider: 'test', wordings: { p1: null, p2: 'Customers buy on price; loyal to the brand, not to us.' } })
  strategyStore.getSession.mockResolvedValue({ id: SESSION, clientId: CLIENT, advisorId: ADVISOR })
  strategyStore.loadEntries.mockResolvedValue([{ frameworkId: CONCEPT, fieldKey: BOX, value: 'Price-led' }])
  strategyStore.saveEntry.mockResolvedValue(true)
  planner.unknownBoxes.mockResolvedValue([])
})
afterEach(() => jest.restoreAllMocks())
afterAll(() => { try { fs.rmdirSync(ROOT, { recursive: true }) } catch (e) { /* temp dir */ } })

describe('placing a section\'s words', () => {
  it('places by the clock: before the first box to the tray, the rest under the open box', async () => {
    const s = await placed()
    const [tray, box] = passagesOf(s)
    expect(tray.box).toBeNull()
    expect(box.box).toEqual({ frameworkId: CONCEPT, fieldKey: BOX })
    expect(box.heard.map(h => h.text)).toEqual(['they buy on price', 'loyal to the brand not us'])
    expect(box).toMatchObject({ suggestion: 'Customers buy on price; loyal to the brand, not to us.', state: 'waiting', final: null })
    expect(strategyStore.loadTimeline).toHaveBeenCalledWith(SESSION, FIRM)
  })

  it('🔴 keeps every passage under its box when the AI fails — with no suggestion, never a guess', async () => {
    passageTidy.suggest.mockRejectedValue(new Error('timeout'))
    const s = await placed()
    expect(passagesOf(s).map(p => [p.box && p.box.fieldKey, p.suggestion])).toEqual([[null, null], [BOX, null]])
    expect(store.readSegmentWords(s.meetingId, s.n).tidyState).toBe('failed')
    expect(store.readMeta(s.meetingId).segments[0].wordsState).toBe('ready')
  })

  it('asks no AI about a silent section', async () => {
    const s = await placed({ rows: [] })
    expect(passagesOf(s)).toEqual([])
    expect(passageTidy.suggest).not.toHaveBeenCalled()
  })

  it('places nothing for a recording not tied to a planning session', async () => {
    const s = await placed({ noSession: true })
    expect(store.readSegmentWords(s.meetingId, s.n)).toBeNull()
    expect(passageTidy.suggest).not.toHaveBeenCalled()
  })

  it('🔴 never writes a section\'s words twice — a decision already made survives a second run', async () => {
    const s = await placed()
    await decide(s, 'p2', { action: 'reject' })
    await seg.runSegmentWords(s.meetingId, s.n)
    expect(passagesOf(s)[1].state).toBe('rejected')
    expect(passageTidy.suggest).toHaveBeenCalledTimes(1)
  })
})

describe('Keep', () => {
  it('🔴 adds the suggestion BELOW what the advisor typed, and records all three versions', async () => {
    const s = await placed()
    const res = await decide(s, 'p2', { action: 'keep' })
    expect(res._status).toBe(200)
    const value = 'Price-led\nCustomers buy on price; loyal to the brand, not to us.'
    expect(res._body.box).toEqual({ frameworkId: CONCEPT, fieldKey: BOX, value })
    expect(strategyStore.saveEntry).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: SESSION,
firmId: FIRM,
frameworkId: CONCEPT,
fieldKey: BOX,
value,
      source: 'transcript',
originalText: 'they buy on price loyal to the brand not us'
    }))
    expect(passagesOf(s)[1]).toMatchObject({
      state: 'kept', final: 'Customers buy on price; loyal to the brand, not to us.', edited: false, isApproved: true
    })
    expect(res._body.waiting).toBe(1)
  })

  it('fills an empty box without a leading blank line', async () => {
    strategyStore.loadEntries.mockResolvedValue([])
    const s = await placed()
    expect((await decide(s, 'p2', { action: 'keep' }))._body.box.value)
      .toBe('Customers buy on price; loyal to the brand, not to us.')
  })

  it('keeps the advisor\'s own edit and records that it was edited', async () => {
    const s = await placed()
    await decide(s, 'p2', { action: 'keep', text: 'Price buyers.' })
    expect(passagesOf(s)[1]).toMatchObject({ final: 'Price buyers.', edited: true })
  })

  it('🔴 puts the passage back to waiting when the box could not be written', async () => {
    strategyStore.saveEntry.mockResolvedValue(false)
    const s = await placed()
    expect((await decide(s, 'p2', { action: 'keep' }))._status).toBe(404)
    expect(passagesOf(s)[1]).toMatchObject({ state: 'waiting', final: null, isApproved: false })
  })

  it('refuses to keep a tray passage until it has been moved to a box', async () => {
    const s = await placed()
    expect((await decide(s, 'p1', { action: 'keep', text: 'x' }))._status).toBe(409)
    expect(strategyStore.saveEntry).not.toHaveBeenCalled()
  })

  it('refuses a passage with nothing to keep', async () => {
    passageTidy.suggest.mockResolvedValue({ model: 't', provider: 't', wordings: {} })
    const s = await placed()
    expect((await decide(s, 'p2', { action: 'keep' }))._status).toBe(400)
  })
})

describe('the other decisions, and who may make them', () => {
  it('moves a tray passage into a box on this card, where it can then be kept', async () => {
    const s = await placed()
    const res = await decide(s, 'p1', { action: 'move', fieldKey: 't0r1c2' })
    expect(res._body.passage.box).toEqual({ frameworkId: CONCEPT, fieldKey: 't0r1c2' })
    expect(planner.unknownBoxes).toHaveBeenCalledWith(FIRM, [{ frameworkId: CONCEPT, fieldKey: 't0r1c2' }])
  })

  it('🔴 refuses a move to a box that is not on this card', async () => {
    planner.unknownBoxes.mockResolvedValue([{}])
    const s = await placed()
    expect((await decide(s, 'p1', { action: 'move', fieldKey: 'invented' }))._status).toBe(400)
    expect(passagesOf(s)[0].box).toBeNull()
  })

  it('leaves a tray passage in the transcript only, and rejects a box passage', async () => {
    const s = await placed()
    await decide(s, 'p1', { action: 'transcript-only' })
    const res = await decide(s, 'p2', { action: 'reject' })
    expect(passagesOf(s).map(p => p.state)).toEqual(['transcript-only', 'rejected'])
    expect(res._body.waiting).toBe(0)
  })

  it('refuses a second decision on the same passage, and an action it does not know', async () => {
    const s = await placed()
    await decide(s, 'p2', { action: 'reject' })
    expect((await decide(s, 'p2', { action: 'keep' }))._status).toBe(409)
    expect((await decide(s, 'p1', { action: 'delete' }))._status).toBe(400)
  })

  it('🔴 refuses to keep into a planning session that is no longer this client\'s', async () => {
    strategyStore.getSession.mockResolvedValue({ id: SESSION, clientId: 'someone-else', advisorId: ADVISOR })
    const s = await placed()
    expect((await decide(s, 'p2', { action: 'keep' }))._status).toBe(404)
    expect(strategyStore.saveEntry).not.toHaveBeenCalled()
  })

  it('refuses a colleague at the same firm (owner only)', async () => {
    const s = await placed()
    expect((await decide(s, 'p2', { action: 'reject' }, { advisorId: 'another-advisor' }))._status).toBe(404)
    expect(passagesOf(s)[1].state).toBe('waiting')
  })

  it('lists every placed section with the meeting-wide waiting count', async () => {
    const s = await placed()
    const res = makeRes()
    seg.getWords(req(s.meetingId), res, () => {})
    expect(res._body.waiting).toBe(2)
    expect(res._body.segments[0]).toMatchObject({ n: s.n, conceptId: CONCEPT, wordsState: 'ready', tidyState: 'ok' })
  })
})

describe('the placed words die with the transcript', () => {
  it('🔴 are removed by the transcript\'s expiry, as the summaries are', async () => {
    const s = await placed()
    const proof = store.destroyTranscript(s.meetingId)
    expect(proof.textRemains).toBe(false)
    expect(store.readSegmentWords(s.meetingId, s.n)).toBeNull()
  })
})
