'use strict'

/**
 * Wordsmith in Run session — the planner panel's routes (item 15.14, screens 1–5).
 *
 * 🔴 WHAT UAT CANNOT SEE, AND WHY EACH TEST BELOW EXISTS:
 *
 *   1. **Only the Alignment Statements words reach a model**, and only with consent. A tester
 *      sees good drafts either way; they cannot see what else was sent.
 *   2. **Nothing reaches a box without the client's agreement, and never without its record.**
 *      A tester sees the words land; they cannot see that the record was written first, or that
 *      a refused request wrote nothing.
 *   3. **A rewrite takes what the client said from the server, never the browser.** A forged
 *      request looks identical on screen.
 *   4. **Owner only**: another advisor at the same firm, another meeting's run, another meeting's
 *      planning session — each refused.
 *   5. **A firm whose content cannot be read gets nothing**, never the mentor's content it switched off.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'wsr-test-'))
process.env.MEETING_AUDIO_DIR = ROOT

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn().mockResolvedValue(null),
  saveFirmConfig: jest.fn()
}))
jest.mock('../../server/utils/strategySessionStore', () => ({
  getSession: jest.fn(),
  saveEntry: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const sessions = require('../../server/utils/strategySessionStore')
const store = require('../../server/utils/meetingAudioStore')
const route = require('../../server/routes/wordsmith')
const { parseMarker } = require('../../utils/wordsmithMarker')

const FIRM = 'firm-ws'
const ADVISOR = 'adv-ws'
const CLIENT = 'client-ws'

const ALIGN_WORDS = 'We want to be the most trusted suspension business in the Bay of Plenty.'
const OTHER_WORDS = 'SENTINEL-OTHER-CONCEPT our suppliers are slow'

function makeRes () {
  return {
    _status: null,
    _body: null,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status },
    end (body) { try { this._body = JSON.parse(body) } catch (e) { this._body = body } }
  }
}
const codeOf = res => res._body && res._body.error && res._body.error.code

function req (meetingId, extra = {}) {
  return {
    firmId: extra.firmId || FIRM,
    advisorId: extra.advisorId || ADVISOR,
    advisorName: 'Ana Adviser',
    userEmail: 'ana@firm.example',
    params: Object.assign({ meetingId }, extra.params || {}),
    body: extra.body || {}
  }
}

async function call (handler, r) {
  const res = makeRes()
  await handler(r, res, () => {})
  return res
}

/** A consented strategy session with an Alignment Statements section and one other, both text. */
function meeting (opts = {}) {
  const clientId = opts.clientId === undefined ? CLIENT : opts.clientId
  const { meetingId } = store.createMeeting({ firmId: FIRM, advisor: ADVISOR, clientId, scenarioId: 'strategy_session', retentionMonths: 18, segmented: true })
  if (opts.consent !== false) { store.updateMeta(meetingId, { consentConfirmedAt: new Date().toISOString() }) }
  const sections = [
    { conceptId: 'porters-5-forces', label: 'Porter', rows: [{ start: 0, role: 'client', text: OTHER_WORDS }] },
    { conceptId: 'alignment-statements', label: 'Alignment Statements', rows: opts.alignRows || [{ start: 0, role: 'client', text: ALIGN_WORDS }], state: opts.alignState }
  ]
  sections.forEach((s) => {
    const { n } = store.openSegment(meetingId, { conceptId: s.conceptId, label: s.label })
    store.updateSegment(meetingId, n, { state: s.state || 'done' })
    store.writeSegmentTranscript(meetingId, n, { segments: s.rows, text: s.rows.map(r => r.text).join(' ') })
  })
  return meetingId
}

const SORT = { statements: [{ name: 'Vision', lines: [1] }] }
const STYLE = { sentenceLength: 'short', formality: 'plain', jargon: 'avoid', voice: 'we', tone: ['warm'], audience: 'staff' }

function fakeClient (replies) {
  const queue = replies.slice()
  return {
    chat: {
      completions: {
        create: jest.fn(() => {
          const next = queue.length > 1 ? queue.shift() : queue[0]
          return Promise.resolve({ choices: [{ message: { content: JSON.stringify(next) } }], usage: {} })
        })
      }
    }
  }
}

async function settle (meetingId, runId) {
  for (let i = 0; i < 50; i++) {
    const res = await call(route.getRun, req(meetingId, { params: { runId } }))
    if (res._body.state !== 'writing') { return res._body }
    await new Promise(resolve => setImmediate(resolve))
  }
  throw new Error('run did not settle')
}

/** A finished first run for this meeting, and the clients it used. */
async function firstRun (meetingId, draft) {
  const read = fakeClient([SORT, STYLE])
  const write = fakeClient([{ draft: draft || 'We are the most trusted suspension business in the Bay of Plenty.' }])
  route._setClients({ read, write })
  const started = await call(route.startRun, req(meetingId, { body: { purpose: 'a staff poster', style: 'humble' } }))
  expect(started._status).toBe(202)
  const done = await settle(meetingId, started._body.runId)
  return { runId: started._body.runId, done, read, write }
}

beforeEach(() => {
  route._reset()
  jest.clearAllMocks()
  overlay.loadFirmConfig.mockResolvedValue(null)
  sessions.getSession.mockResolvedValue({ id: 7, meetingId: null, firmId: FIRM, clientId: CLIENT, advisorId: ADVISOR })
  sessions.saveEntry.mockResolvedValue(true)
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(console, 'log').mockImplementation(() => {})
})
afterEach(() => { jest.restoreAllMocks() })
afterAll(() => { fs.rmSync(ROOT, { recursive: true, force: true }) })

describe('what reaches a model', () => {
  test('🔴 only the Alignment Statements section\'s words are sent — never another concept\'s', async () => {
    const id = meeting()
    const { done, read, write } = await firstRun(id)
    expect(done.state).toBe('done')
    const sent = JSON.stringify(read.chat.completions.create.mock.calls.concat(write.chat.completions.create.mock.calls))
    expect(sent).toContain('most trusted suspension business')
    expect(sent).not.toContain('SENTINEL-OTHER-CONCEPT')
  })

  test.each([
    ['no consent', { consent: false }, 'CONSENT_NOT_CONFIRMED'],
    ['a section still being turned into text', { alignState: 'transcribing' }, 'STILL_TRANSCRIBING'],
    ['a section in which nothing was said', { alignRows: [] }, 'NOTHING_SAID']
  ])('%s: refused, and no model is asked', async (_w, opts, code) => {
    const id = meeting(opts)
    const read = fakeClient([SORT])
    route._setClients({ read, write: read })
    const res = await call(route.startRun, req(id, { body: { purpose: 'p', style: 's' } }))
    expect(res._status).toBe(409)
    expect(codeOf(res)).toBe(code)
    expect(read.chat.completions.create).not.toHaveBeenCalled()
  })

  test('🔴 a firm whose content cannot be read is refused — never handed the mentor\'s', async () => {
    const id = meeting()
    overlay.loadFirmConfig.mockRejectedValue(Object.assign(new Error('ER_ACCESS_DENIED'), { sqlState: '28000' }))
    const res = await call(route.startRun, req(id, { body: { purpose: 'p', style: 's' } }))
    expect(res._status).toBe(503)
    expect(codeOf(res)).toBe('CONTENT_UNAVAILABLE')
    expect(JSON.stringify(res._body)).not.toContain('ER_ACCESS_DENIED')
  })

  test('the purpose and style must both be given, and not be essays', async () => {
    const id = meeting()
    expect(codeOf(await call(route.startRun, req(id, { body: { purpose: 'p' } })))).toBe('BAD_INPUT')
    expect(codeOf(await call(route.startRun, req(id, { body: { purpose: 'p', style: 'x'.repeat(501) } })))).toBe('BAD_INPUT')
  })

  test('the screen gets the drafts and the client\'s words, never the kept sort', async () => {
    const id = meeting()
    const { done } = await firstRun(id)
    expect(done.result.statements.find(s => s.name === 'Vision').draft.text).toContain('most trusted')
    expect(done.result).not.toHaveProperty('sorted')
  })

  test('a failed run says only that Wordsmith could not write', async () => {
    const id = meeting()
    route._setClients({ read: fakeClient(['not json at all']), write: fakeClient([]) })
    const started = await call(route.startRun, req(id, { body: { purpose: 'p', style: 's' } }))
    const done = await settle(id, started._body.runId)
    expect(done).toMatchObject({ state: 'failed', error: { code: 'WORDSMITH_FAILED' } })
  })
})

describe('writing again', () => {
  test('🔴 "Write again with these" takes the four choices from the body and everything else from the server', async () => {
    const id = meeting()
    const { runId } = await firstRun(id)
    const read = fakeClient(['never asked'])
    const write = fakeClient([{ draft: 'The business is the most trusted.' }])
    route._setClients({ read, write })
    const forged = { sentenceLength: 'long', formality: 'formal', jargon: 'allow', voice: 'the-business', tone: ['FORGED-TONE'], audience: 'FORGED-AUDIENCE' }
    const again = await call(route.startRun, req(id, { body: { baseRunId: runId, settings: forged, sorted: { Vision: [{ text: 'FORGED-WORDS' }] } } }))
    const done = await settle(id, again._body.runId)
    expect(done.result.settings).toMatchObject({ voice: 'the-business', tone: ['warm'], audience: 'staff' })
    expect(read.chat.completions.create).not.toHaveBeenCalled()
    const prompt = JSON.stringify(write.chat.completions.create.mock.calls)
    expect(prompt).not.toMatch(/FORGED/)
    expect(prompt).toContain('never \\"we\\"')
  })

  test('🔴 both ways of writing again keep the language the first run heard — never fall back to English', async () => {
    const id = meeting()
    const read = fakeClient([Object.assign({ language: 'de' }, SORT), STYLE])
    route._setClients({ read, write: fakeClient([{ draft: 'Wir sind die Besten.' }]) })
    const started = await call(route.startRun, req(id, { body: { purpose: 'p', style: 's' } }))
    const { runId } = started._body
    await settle(id, runId)

    for (const [handler, body, params] of [
      [route.startRun, { baseRunId: runId }, {}],
      [route.rewriteStatement, { statement: 'Vision' }, { runId }]
    ]) {
      const write = fakeClient([{ draft: 'Wir sind die Besten.' }])
      route._setClients({ read: fakeClient([]), write })
      const again = await call(handler, req(id, { body, params }))
      await settle(id, again._body.runId)
      expect(write.chat.completions.create.mock.calls[0][0].messages[0].content).toContain('Write in Deutsch (de)')
    }
  })

  test('🔴 the firm\'s English spelling, resolved on the server, reaches the draft', async () => {
    const wc = require('../../server/utils/wordsmithContent')
    overlay.loadFirmConfig.mockImplementation((scope, key) => Promise.resolve(key === wc.CONFIG_KEY && scope === FIRM ? { spelling: 'us', spellingBaseline: 'nz' } : null))
    const id = meeting()
    const { write } = await firstRun(id)
    expect(write.chat.completions.create.mock.calls[0][0].messages[0].content).toContain('Write in US English spelling')
  })

  test('settings outside the fixed choices are refused', async () => {
    const id = meeting()
    const { runId } = await firstRun(id)
    const res = await call(route.startRun, req(id, { body: { baseRunId: runId, settings: { sentenceLength: 'epic', formality: 'plain', jargon: 'avoid', voice: 'we' } } }))
    expect(codeOf(res)).toBe('BAD_SETTINGS')
  })

  test('a room answer is written in as the client\'s: one statement, its question answered', async () => {
    const id = meeting()
    const { runId } = await firstRun(id)
    const write = fakeClient([{ draft: 'By 2030 we are the most trusted suspension business in the Bay of Plenty.' }])
    route._setClients({ read: fakeClient([]), write })
    const again = await call(route.rewriteStatement, req(id, { params: { runId }, body: { statement: 'Vision', answers: [{ elementId: 'ws-vision-e1', text: 'By 2030' }] } }))
    const done = await settle(id, again._body.runId)
    const vision = done.result.statements[0]
    expect(done.result.statements.map(s => s.name)).toEqual(['Vision'])
    expect(vision.questions).toEqual([])
    expect(vision.quotes).toContainEqual({ text: 'By 2030', room: true })
  })

  test('a second press while writing returns the same run', async () => {
    const id = meeting()
    route._setClients({ read: { chat: { completions: { create: () => new Promise(() => {}) } } }, write: fakeClient([]) })
    const a = await call(route.startRun, req(id, { body: { purpose: 'p', style: 's' } }))
    const b = await call(route.startRun, req(id, { body: { purpose: 'p', style: 's' } }))
    expect(b._body.runId).toBe(a._body.runId)
  })

  test('the tenth run is the last for a meeting', async () => {
    const id = meeting()
    for (let i = 0; i < route.runs.MAX_RUNS_PER_CONTEXT; i++) {
      route.runs.createRun({ firmId: FIRM, advisorId: ADVISOR, clientRef: id })
    }
    const res = await call(route.startRun, req(id, { body: { purpose: 'p', style: 's' } }))
    expect(res._status).toBe(429)
  })
})

describe('who may see and use it', () => {
  test('a colleague at the same firm cannot start, read or use a run', async () => {
    const id = meeting()
    const { runId } = await firstRun(id)
    const other = { advisorId: 'someone-else' }
    expect((await call(route.startRun, req(id, Object.assign({ body: { purpose: 'p', style: 's' } }, other))))._status).toBe(404)
    expect((await call(route.getRun, req(id, Object.assign({ params: { runId } }, other))))._status).toBe(404)
  })

  test('a run from another meeting is not found here', async () => {
    const a = meeting()
    const b = meeting()
    const { runId } = await firstRun(a)
    expect((await call(route.getRun, req(b, { params: { runId } })))._status).toBe(404)
  })
})

describe('"Use this wording" (Decision D)', () => {
  const use = (id, runId, body) => call(route.useWording, req(id, { params: { runId }, body }))

  test('🔴 without the client\'s agreement, nothing is recorded and nothing is written', async () => {
    const id = meeting()
    const { runId } = await firstRun(id)
    const res = await use(id, runId, { sessionId: 7, statement: 'Vision', text: 'We are trusted.', clientAgreed: 'yes' })
    expect(codeOf(res)).toBe('CLIENT_NOT_AGREED')
    expect(store.readWordsmithRecords(id)).toEqual([])
    expect(sessions.saveEntry).not.toHaveBeenCalled()
  })

  test('🔴 the record is written first — the AI\'s draft, the final words, who agreed — then the box and its stamp', async () => {
    const id = meeting()
    const { runId } = await firstRun(id)
    const res = await use(id, runId, { sessionId: 7, statement: 'Vision', text: 'By 2030, we are the most trusted.', clientAgreed: true })
    expect(res._status).toBe(200)
    const [record] = store.readWordsmithRecords(id)
    expect(record).toMatchObject({
      statement: 'Vision',
      fieldKey: 't0r0c1',
      isApproved: true,
      clientAgreed: true,
      edited: true,
      finalText: 'By 2030, we are the most trusted.',
      approvedBy: { name: 'Ana Adviser' }
    })
    expect(record.aiDraft.text).toContain('most trusted suspension business')
    expect(record.clientWords).toEqual([ALIGN_WORDS])
    const saved = sessions.saveEntry.mock.calls.map(c => c[0])
    expect(saved.map(s => s.fieldKey)).toEqual(['t0r0c1', 'wordsmith:t0r0c1'])
    expect(saved.every(s => s.firmId === FIRM && s.frameworkId === 'alignment-statements')).toBe(true)
    expect(parseMarker(saved[1].value).text).toBe('By 2030, we are the most trusted.')
  })

  test('if the record cannot be written, no box is written', async () => {
    const id = meeting()
    const { runId } = await firstRun(id)
    jest.spyOn(store, 'appendWordsmithRecord').mockImplementation(() => { throw new Error('EACCES /var/secret') })
    const res = await use(id, runId, { sessionId: 7, statement: 'Vision', text: 'We are trusted.', clientAgreed: true })
    expect(res._status).toBe(500)
    expect(JSON.stringify(res._body)).not.toContain('/var/secret')
    expect(sessions.saveEntry).not.toHaveBeenCalled()
  })

  test.each([
    ['another firm\'s session', null],
    ['a session tied to another meeting', { id: 7, meetingId: 'mtg_someone_else', firmId: FIRM, clientId: CLIENT, advisorId: ADVISOR }],
    // 🔴 Item 15.29: same firm, but another client's plan — this client's words never go there.
    ['another client\'s session at the same firm', { id: 7, meetingId: null, firmId: FIRM, clientId: 'client-other', advisorId: ADVISOR }],
    ['another advisor\'s session for the same client', { id: 7, meetingId: null, firmId: FIRM, clientId: CLIENT, advisorId: 'adv-other' }]
  ])('%s is refused and nothing is written', async (_w, session) => {
    const id = meeting()
    const { runId } = await firstRun(id)
    sessions.getSession.mockResolvedValue(session)
    const res = await use(id, runId, { sessionId: 7, statement: 'Vision', text: 'We are trusted.', clientAgreed: true })
    expect(res._status).toBe(404)
    expect(store.readWordsmithRecords(id)).toEqual([])
    expect(sessions.saveEntry).not.toHaveBeenCalled()
  })

  test('🔴 a recording with no client cannot be matched to a plan, so nothing is written', async () => {
    const id = meeting({ clientId: null })
    const { runId } = await firstRun(id)
    const res = await use(id, runId, { sessionId: 7, statement: 'Vision', text: 'We are trusted.', clientAgreed: true })
    expect(res._status).toBe(404)
    expect(store.readWordsmithRecords(id)).toEqual([])
    expect(sessions.saveEntry).not.toHaveBeenCalled()
  })

  test('the record goes when the transcript expires', async () => {
    const id = meeting()
    const { runId } = await firstRun(id)
    await use(id, runId, { sessionId: 7, statement: 'Vision', text: 'We are trusted.', clientAgreed: true })
    expect(store.readWordsmithRecords(id)).toHaveLength(1)
    store.destroyTranscript(id)
    expect(store.readWordsmithRecords(id)).toEqual([])
  })
})
