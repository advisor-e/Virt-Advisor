'use strict'

/**
 * The Meeting Review routes — slice 2: the retention dial, consent, capture and deletion.
 *
 * 🔴 THE THREE THAT MATTER, and none of them is visible to a person testing in UAT:
 *
 *   1. **A recording belongs to the advisor who made it** (Brief P2). Every recording route
 *      checks the firm AND the advisor, because a colleague at the same firm is as much a
 *      stranger to a client's meeting as another firm is. A shared test login never notices.
 *   2. **A meeting with no confirmed consent cannot be transcribed.** The tick records that
 *      the advisor claims consent; the audio records that it was given. Transcribing without
 *      the first produces a transcript nobody ever said was allowed — and it looks perfectly
 *      normal on screen.
 *   3. **"Stop and delete" takes the transcript too.** `MEETING-CONSENT-WORDING.md` §4: a
 *      meeting the client withdrew consent to must not survive as text because the chunks
 *      happened to be transcribed early. A tester sees "deleted" either way.
 *
 * The retention routes are here for the reason `aiPrompts.routes.test.js` gives: every one is
 * scoped to `req.firmId`, the verified scope from the JWT, and no handler reads a scope from
 * a body or a query (`tier-cascade.md` P6).
 */

const fs = require('fs')
const os = require('os')
const path = require('path')

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'mrr-test-'))
process.env.MEETING_AUDIO_DIR = ROOT

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const routes = require('../../server/routes/meetingReview')
const store = require('../../server/utils/meetingAudioStore')
const { PLATFORM_DEFAULT_MONTHS } = require('../../server/utils/meetingRetention')

const FIRM = 'firm-test-1'
const ADVISOR = 'adv-1'

function makeMockRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { this._body = body }
  }
}

/** `sendError` writes a JSON STRING through writeHead/end — parse it or assertions lie. */
function errorBody (res) {
  return typeof res._body === 'string' ? JSON.parse(res._body) : res._body
}

function makeReq (overrides = {}) {
  return {
    firmId: FIRM,
    advisorId: ADVISOR,
    userRole: 'firm_manager',
    userEmail: 'mgr@testfirm.com',
    body: {},
    params: {},
    query: {},
    ...overrides
  }
}

/** A meeting owned by the default caller, with one chunk and confirmed consent. */
function seedMeeting (opts = {}) {
  const { meetingId } = store.createMeeting({
    firmId: opts.firmId || FIRM,
    advisor: opts.advisor || ADVISOR,
    scenarioId: 'eoy_meeting',
    retentionMonths: 18
  })
  if (opts.chunk !== false) { store.appendChunk(meetingId, 1, Buffer.from('AUDIO')) }
  if (opts.consent !== false) { store.updateMeta(meetingId, { consentConfirmedAt: new Date().toISOString() }) }
  if (opts.transcript) { store.writeTranscript(meetingId, { text: 'what the client said' }) }
  return meetingId
}

beforeEach(() => {
  jest.clearAllMocks()
  overlay.loadFirmConfig.mockResolvedValue(null)
  overlay.saveFirmConfig.mockResolvedValue(undefined)
})

afterAll(() => {
  try { fs.rmdirSync(ROOT, { recursive: true }) } catch (e) { /* temp dir */ }
})

describe('the retention dial', () => {
  test('reads the platform default when nothing is set anywhere', async () => {
    const res = makeMockRes()
    await routes.getRetention(makeReq(), res)
    expect(res._status).toBe(200)
    expect(res._body.resolved.months).toBe(PLATFORM_DEFAULT_MONTHS)
    expect(res._body.ownMonths).toBeNull()
  })

  test('saves a valid period against the caller’s own scope, never a scope from the body', async () => {
    // tier-cascade.md P6. A body-supplied scope would let one firm rewrite another's promise
    // to its clients.
    const res = makeMockRes()
    await routes.setRetention(makeReq({ body: { months: 36, firmId: 'someone-else' } }), res)
    expect(res._status).toBe(200)
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(
      FIRM, 'meeting-retention', { months: 36 }, 'mgr@testfirm.com'
    )
  })

  test.each([
    ['a fraction', 17.5],
    ['zero', 0],
    ['past the ceiling', 121],
    ['a string', '24'],
    ['missing', undefined]
  ])('%s is refused and nothing is stored', async (_label, months) => {
    const res = makeMockRes()
    await routes.setRetention(makeReq({ body: { months } }), res)
    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('INVALID_RETENTION')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('resetting clears this scope so the level above applies again', async () => {
    const res = makeMockRes()
    await routes.resetRetention(makeReq(), res)
    expect(res._status).toBe(200)
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(
      FIRM, 'meeting-retention', null, 'mgr@testfirm.com'
    )
  })
})

describe('the consent screen’s one value', () => {
  test('an advisor is given the figure and the words to render it into', async () => {
    const res = makeMockRes()
    await routes.getConsentContext(makeReq(), res)
    expect(res._status).toBe(200)
    expect(res._body.retentionMonths).toBe(PLATFORM_DEFAULT_MONTHS)
    expect(res._body.retentionPhrase).toBe('18 months')
  })

  test("a firm's own figure is what its advisors are given", async () => {
    // 🔴 THE POINT OF THE WHOLE DIAL. If this returned the platform default regardless, every
    // advisor at a firm that had changed the setting would say the wrong number out loud —
    // and the screen would look completely normal.
    overlay.loadFirmConfig.mockImplementation(scopeId =>
      Promise.resolve(scopeId === FIRM ? { months: 36 } : null))
    const res = makeMockRes()
    await routes.getConsentContext(makeReq(), res)
    expect(res._body.retentionPhrase).toBe('36 months')
  })
})

describe('starting a recording', () => {
  test('creates a meeting owned by the caller, with consent NOT yet claimed', async () => {
    // Record → speak → confirm. A meeting that was born consented would put the client's
    // agreement outside the audio and defeat P1 silently.
    const res = makeMockRes()
    await routes.startRecording(makeReq({ body: { scenarioId: 'eoy_meeting' } }), res)
    expect(res._status).toBe(201)

    const meta = store.readMeta(res._body.meetingId)
    expect(meta.firmId).toBe(FIRM)
    expect(meta.advisor).toBe(ADVISOR)
    expect(meta.consentConfirmedAt).toBeNull()
  })

  test('the retention figure shown to the advisor is stored with the meeting', async () => {
    overlay.loadFirmConfig.mockImplementation(scopeId =>
      Promise.resolve(scopeId === FIRM ? { months: 24 } : null))
    const res = makeMockRes()
    await routes.startRecording(makeReq(), res)
    expect(store.readMeta(res._body.meetingId).retentionMonths).toBe(24)
  })
})

describe('a recording belongs to the advisor who made it', () => {
  const otherAdvisor = makeReq({ advisorId: 'adv-2' })
  const otherFirm = makeReq({ firmId: 'firm-2' })

  test.each([
    ['a colleague at the same firm', otherAdvisor],
    ['the same advisor id at another firm', otherFirm]
  ])('%s cannot read it', (_label, req) => {
    const meetingId = seedMeeting()
    const res = makeMockRes()
    routes.getRecording({ ...req, params: { meetingId } }, res)
    expect(res._status).toBe(404)
  })

  test('a colleague cannot delete it', () => {
    const meetingId = seedMeeting()
    const res = makeMockRes()
    routes.deleteRecording({ ...otherAdvisor, params: { meetingId } }, res)
    expect(res._status).toBe(404)
    // Still there — the refusal was real, not cosmetic.
    expect(store.readMeta(meetingId)).not.toBeNull()
  })

  test('a colleague cannot confirm consent on it', () => {
    const meetingId = seedMeeting({ consent: false })
    const res = makeMockRes()
    routes.confirmConsent({ ...otherAdvisor, params: { meetingId } }, res)
    expect(res._status).toBe(404)
    expect(store.readMeta(meetingId).consentConfirmedAt).toBeNull()
  })

  test('a malformed meeting id answers 404, not 400', () => {
    // Answering 404 declines to tell a prober which ids are even well-formed, and the id
    // never reaches the filesystem — `meetingAudioStore._meetingDir` refuses it first.
    const res = makeMockRes()
    routes.getRecording(makeReq({ params: { meetingId: '../../etc/passwd' } }), res)
    expect(res._status).toBe(404)
  })

  test('the owner can read it', () => {
    const meetingId = seedMeeting()
    const res = makeMockRes()
    routes.getRecording(makeReq({ params: { meetingId } }), res)
    expect(res._status).toBe(200)
    expect(res._body.meetingId).toBe(meetingId)
  })
})

describe('a meeting with no confirmed consent is not transcribed', () => {
  test('finish refuses it', () => {
    // 🔴 The audio records that consent was GIVEN; the tick records that the advisor CLAIMS
    // it. Transcribing without the tick produces a transcript nobody said was allowed.
    const meetingId = seedMeeting({ consent: false })
    const res = makeMockRes()
    routes.finishRecording(makeReq({ params: { meetingId } }), res)
    expect(res._status).toBe(409)
    expect(errorBody(res).error.code).toBe('CONSENT_NOT_CONFIRMED')
  })

  test('finish refuses a meeting where nothing was captured', () => {
    // A tidy "done" for a meeting with no audio is exactly the silent failure P11 forbids.
    const meetingId = seedMeeting({ chunk: false })
    const res = makeMockRes()
    routes.finishRecording(makeReq({ params: { meetingId } }), res)
    expect(res._status).toBe(409)
    expect(errorBody(res).error.code).toBe('NOTHING_CAPTURED')
  })

  test('consent is recorded only after the recording exists', () => {
    const meetingId = seedMeeting({ consent: false })
    const res = makeMockRes()
    routes.confirmConsent(makeReq({ params: { meetingId } }), res)
    expect(res._status).toBe(200)
    expect(store.readMeta(meetingId).consentConfirmedAt).not.toBeNull()
  })
})

describe('stop and delete', () => {
  test('destroys the audio AND any transcript already made from it', () => {
    // 🔴 `MEETING-CONSENT-WORDING.md` §4. Deleting only the audio would honour the letter of
    // a client's refusal and break its substance — the meeting would survive as text because
    // the chunks happened to be transcribed early.
    const meetingId = seedMeeting({ transcript: true })
    const res = makeMockRes()
    routes.deleteRecording(makeReq({ params: { meetingId } }), res)

    expect(res._status).toBe(200)
    expect(res._body.deleted).toBe(true)
    expect(res._body.filesRemoved).toBeGreaterThan(0)
    expect(store.readMeta(meetingId)).toBeNull()
    expect(store.readTranscript(meetingId)).toBeNull()
  })

  test('reports how much it removed rather than answering with a bare success', () => {
    // §5 trap 4: a deletion that reports nothing is indistinguishable from one that did
    // nothing, and this one is a promise made to a firm's clients.
    const meetingId = seedMeeting()
    const res = makeMockRes()
    routes.deleteRecording(makeReq({ params: { meetingId } }), res)
    expect(res._body.bytesRemoved).toBeGreaterThan(0)
  })
})

describe('transcription, and the audio that must not survive it', () => {
  /** A transcription client that answers with two speakers. */
  function goodReply () {
    return (_options, onResponse) => {
      const res = {
        statusCode: 200,
        async * [Symbol.asyncIterator] () {
          yield Buffer.from(JSON.stringify({
            text: 'the meeting',
            segments: [
              { speaker: 'S1', start: 0, end: 5, text: 'consent line' },
              { speaker: 'S2', start: 6, end: 8, text: 'yes' }
            ]
          }))
        }
      }
      return {
        setTimeout () {},
        on () {},
        write () {},
        destroy () {},
        end () { setImmediate(() => onResponse(res)) }
      }
    }
  }

  test('a successful run leaves a transcript and no audio', async () => {
    const meetingId = seedMeeting()
    const https = require('https')
    const spy = jest.spyOn(https, 'request').mockImplementation(goodReply())
    const log = jest.spyOn(console, 'log').mockImplementation(() => {})
    process.env.OPENAI_API_KEY = 'test-key'

    await routes.runTranscription(meetingId)

    expect(store.readTranscript(meetingId)).not.toBeNull()
    expect(store.listChunks(meetingId)).toEqual([])
    expect(store.readMeta(meetingId).audioDeletedAt).toBeTruthy()

    spy.mockRestore()
    log.mockRestore()
  })

  test('a FAILED transcription still destroys the audio', async () => {
    // 🔴 THE ONE THAT WOULD BE EASIEST TO GET WRONG AND HARDEST TO NOTICE. P8 is a promise
    // about the recording, not a reward for a clean run. A failure that left an hour of a
    // client's meeting on disk is precisely the lingering Brief §1 calls a design failure —
    // and the advisor would see an error message either way.
    const meetingId = seedMeeting()
    const https = require('https')
    const spy = jest.spyOn(https, 'request').mockImplementation((_o, onResponse) => {
      const res = {
        statusCode: 500,
        async * [Symbol.asyncIterator] () { yield Buffer.from('upstream is down') }
      }
      return {
        setTimeout () {},
        on () {},
        write () {},
        destroy () {},
        end () { setImmediate(() => onResponse(res)) }
      }
    })
    const log = jest.spyOn(console, 'log').mockImplementation(() => {})
    const err = jest.spyOn(console, 'error').mockImplementation(() => {})
    process.env.OPENAI_API_KEY = 'test-key'

    await routes.runTranscription(meetingId)

    expect(store.readTranscript(meetingId)).toBeNull()
    expect(store.listChunks(meetingId)).toEqual([])
    expect(store.readMeta(meetingId).state).toBe('failed')

    spy.mockRestore()
    log.mockRestore()
    err.mockRestore()
  })

  test('degraded attribution is carried onto the screen rather than hidden', async () => {
    // §5 trap 1: it must fail visibly, not blur. One speaker means the two people were not
    // told apart, and the advisor has to be told before they read anything into the notes.
    const meetingId = seedMeeting()
    const https = require('https')
    const spy = jest.spyOn(https, 'request').mockImplementation((_o, onResponse) => {
      const res = {
        statusCode: 200,
        async * [Symbol.asyncIterator] () {
          yield Buffer.from(JSON.stringify({
            segments: [{ speaker: 'S1', start: 0, end: 5, text: 'only one voice' }]
          }))
        }
      }
      return {
        setTimeout () {},
        on () {},
        write () {},
        destroy () {},
        end () { setImmediate(() => onResponse(res)) }
      }
    })
    const log = jest.spyOn(console, 'log').mockImplementation(() => {})
    process.env.OPENAI_API_KEY = 'test-key'

    await routes.runTranscription(meetingId)

    const res = makeMockRes()
    routes.getRecording(makeReq({ params: { meetingId } }), res)
    expect(res._body.attributionConfident).toBe(false)

    spy.mockRestore()
    log.mockRestore()
  })

  test('the status route returns no transcript text', () => {
    // Slice 2 turns audio into text and destroys the audio. Reading the words back is the
    // reports' job, and those are a later slice — a route that handed them out now would be
    // the first half of a feature nobody has approved the second half of.
    const meetingId = seedMeeting({ transcript: true })
    const res = makeMockRes()
    routes.getRecording(makeReq({ params: { meetingId } }), res)
    expect(res._body.hasTranscript).toBe(true)
    expect(JSON.stringify(res._body)).not.toContain('what the client said')
  })
})
