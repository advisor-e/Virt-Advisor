'use strict'

/**
 * A strategy session's routes — recording in concept segments (item 8.4, slice 1).
 *
 * 🔴 WHAT UAT CANNOT SEE, AND WHY EACH TEST BELOW EXISTS:
 *
 *   1. **Nothing is transcribed before consent** — including a segment that closed while the
 *      consent line was still being spoken. On screen, a waiting segment and a transcribed one
 *      both just say "text ready" a moment later.
 *   2. **A segment's audio dies once it is text, even when transcription fails**, and the
 *      advisor's voice clip dies when the session's recording ends. A tester cannot see a disk.
 *   3. **A later segment with no voice clip is never called confident.** Its labels may be
 *      swapped, and the coaching notes would read as certain.
 *   4. **Owner only.** A colleague at the same firm is refused, as in single-file meetings.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'msr-test-'))
process.env.MEETING_AUDIO_DIR = ROOT

// The multipart parser is replaced so the upload routes can be driven without a real request:
// each test hands over the fields and files formidable would have produced.
let mockNextForm = { fields: {}, files: {} }
jest.mock('formidable', () => ({
  formidable: () => ({
    parse (_req, cb) {
      if (mockNextForm.error) { cb(mockNextForm.error); return }
      cb(null, mockNextForm.fields, mockNextForm.files)
    }
  })
}))

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn().mockResolvedValue(null),
  saveFirmConfig: jest.fn(),
  // No imported concepts at any tier (item 15.20).
  loadFirmConfigsByPrefix: jest.fn().mockResolvedValue({})
}))

const https = require('https')
const conceptSummary = require('../../server/utils/conceptSummary')
const store = require('../../server/utils/meetingAudioStore')
const review = require('../../server/routes/meetingReview')
const seg = require('../../server/routes/meetingSegments')

const FIRM = 'firm-seg'
const ADVISOR = 'adv-seg'

function makeRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { this._body = body }
  }
}

function bodyOf (res) {
  return typeof res._body === 'string' ? JSON.parse(res._body) : res._body
}

function req (meetingId, extra = {}) {
  return { firmId: FIRM, advisorId: ADVISOR, params: { meetingId, ...(extra.params || {}) }, body: extra.body || {} }
}

/** A temp file standing in for an upload formidable saved to disk. */
function tempUpload (content, mimetype) {
  const file = path.join(ROOT, 'upload-' + Math.random().toString(16).slice(2))
  fs.writeFileSync(file, content)
  return { filepath: file, mimetype }
}

function newSession () {
  return store.createMeeting({ firmId: FIRM, advisor: ADVISOR, scenarioId: 'strategy_session', retentionMonths: 18, segmented: true }).meetingId
}

/** Open a segment through the route, and put one chunk in it directly. A label that is a real
 * concept id records under it; any other label records as an unlabelled (framing) section. */
function recordSegment (meetingId, label) {
  const res = makeRes()
  const conceptId = require('../../server/utils/strategyFrameworks').getConcept(label) ? label : null
  seg.openNextSegment(req(meetingId, { body: { conceptId, label } }), res)
  const n = res._body.segment
  store.appendSegmentChunk(meetingId, n, 1, Buffer.from('AUDIO-' + n))
  return n
}

/** Make https.request answer every transcription call with this reply. */
function openaiReplies (status, payload) {
  return jest.spyOn(https, 'request').mockImplementation((_o, onResponse) => ({
    setTimeout () {},
    on () {},
    write () {},
    destroy () {},
    end () {
      setImmediate(() => onResponse({
        statusCode: status,
        async * [Symbol.asyncIterator] () { yield Buffer.from(payload) }
      }))
    }
  }))
}

const GOOD = JSON.stringify({
  text: 'words',
  segments: [
    { speaker: 'A', start: 0, end: 3, text: 'the client spoke first' },
    { speaker: 'advisor', start: 4, end: 6, text: 'and the advisor replied' }
  ]
})

/** Wait until every segment and summary job has finished. */
async function drain () {
  for (let i = 0; i < 50 && (seg.segmentJobs.size || seg.summaryJobs.size); i += 1) {
    await new Promise(resolve => setTimeout(resolve, 5))
  }
}

/** A summary as the model call would hand it back, stood in for so no test reaches OpenAI. */
function draftSummary (sections) {
  return {
    generatedAt: '2026-09-28T10:00:00.000Z',
    model: 'test',
    provider: 'test',
    sections: sections || [{ heading: 'How Suppliers May Change', text: 'Only two coating suppliers nearby.' }],
    editedSections: null,
    editedAt: null,
    approvedAt: null,
    clientAgreed: false
  }
}

let spies = []
beforeEach(() => {
  process.env.OPENAI_API_KEY = 'test-key'
  mockNextForm = { fields: {}, files: {} }
  spies = [
    jest.spyOn(console, 'log').mockImplementation(() => {}),
    jest.spyOn(console, 'error').mockImplementation(() => {}),
    jest.spyOn(conceptSummary, 'generate').mockImplementation(() => Promise.resolve(draftSummary()))
  ]
})
afterEach(() => { spies.forEach(s => s.mockRestore()); jest.restoreAllMocks() })
afterAll(() => { try { fs.rmdirSync(ROOT, { recursive: true }) } catch (e) { /* temp dir */ } })

describe('consent before any transcription', () => {
  test('a segment closed before consent waits, and is transcribed the moment consent arrives', async () => {
    openaiReplies(200, GOOD)
    const id = newSession()
    recordSegment(id, 'Our Session Objective')
    recordSegment(id, 'Porter') // closes segment 1 — consent not yet confirmed
    expect(store.readMeta(id).segments[0].state).toBe('closed')
    expect(store.readSegmentTranscript(id, 1)).toBeNull()

    review.confirmConsent(req(id), makeRes())
    await drain()
    expect(store.readMeta(id).segments[0].state).toBe('done')
  })

  test('finishing without confirmed consent is refused', () => {
    const id = newSession()
    recordSegment(id, 'A')
    const res = makeRes()
    review.finishRecording(req(id), res)
    expect(res._status).toBe(409)
    expect(bodyOf(res).error.code).toBe('CONSENT_NOT_CONFIRMED')
  })

  test('finishing a session that captured nothing is refused', () => {
    const id = newSession()
    store.updateMeta(id, { consentConfirmedAt: new Date().toISOString() })
    const res = makeRes()
    review.finishRecording(req(id), res)
    expect(bodyOf(res).error.code).toBe('NOTHING_CAPTURED')
  })
})

describe('a whole session, start to finish', () => {
  test('each segment\'s audio goes once it is text; the clip goes at the end; the reports get one transcript', async () => {
    openaiReplies(200, GOOD)
    const id = newSession()
    store.writeVoiceReference(id, Buffer.from('VOICE'), 'audio/webm')
    store.updateMeta(id, { consentConfirmedAt: new Date().toISOString() })
    recordSegment(id, 'Our Session Objective')
    recordSegment(id, 'Porter')
    await drain()

    // Segment 1 is text and its audio is gone, while the clip waits for segment 2.
    expect(store.listSegmentChunks(id, 1)).toEqual([])
    expect(store.readVoiceReference(id)).not.toBeNull()

    const res = makeRes()
    review.finishRecording(req(id), res)
    expect(res._status).toBe(202)
    await drain()

    const meta = store.readMeta(id)
    expect(meta.state).toBe('transcribed')
    expect(store.readVoiceReference(id)).toBeNull()
    expect(meta.audioDeletedAt).toBeTruthy()
    const transcript = store.readTranscript(id)
    expect(transcript.segments).toHaveLength(4)
    expect(transcript.segments.map(r => r.role)).toEqual(['client', 'advisor', 'client', 'advisor'])
    expect(transcript.attributionConfident).toBe(true)

    // The recorder's poll reads "done", with the segments and never their words.
    const status = makeRes()
    review.getRecording(req(id), status)
    expect(status._body.state).toBe('done')
    expect(status._body.segments.map(s => s.state)).toEqual(['done', 'done'])
    expect(JSON.stringify(status._body.segments)).not.toContain('client spoke first')
  })

  test('a failed segment still loses its audio, and the session finishes with the rest disclosed', async () => {
    const id = newSession()
    store.writeVoiceReference(id, Buffer.from('VOICE'), 'audio/webm')
    store.updateMeta(id, { consentConfirmedAt: new Date().toISOString() })

    let call = 0
    jest.spyOn(https, 'request').mockImplementation((_o, onResponse) => ({
      setTimeout () {},
      on () {},
      write () {},
      destroy () {},
      end () {
        call += 1
        const failing = call === 1
        setImmediate(() => onResponse({
          statusCode: failing ? 500 : 200,
          async * [Symbol.asyncIterator] () { yield Buffer.from(failing ? 'down' : GOOD) }
        }))
      }
    }))

    recordSegment(id, 'A')
    recordSegment(id, 'B')
    await drain()
    expect(store.readMeta(id).segments[0].state).toBe('failed')
    expect(store.listSegmentChunks(id, 1)).toEqual([])

    review.finishRecording(req(id), makeRes())
    await drain()
    const transcript = store.readTranscript(id)
    expect(transcript.missingSegments).toEqual([1])
    expect(store.readMeta(id).state).toBe('transcribed')
  })

  test('a session where every segment failed ends failed, with its audio still destroyed', async () => {
    openaiReplies(500, 'down')
    const id = newSession()
    store.updateMeta(id, { consentConfirmedAt: new Date().toISOString() })
    recordSegment(id, 'A')
    review.finishRecording(req(id), makeRes())
    await drain()
    const meta = store.readMeta(id)
    expect(meta.state).toBe('failed')
    expect(store.readTranscript(id)).toBeNull()
    expect(fs.readdirSync(path.join(ROOT, id)).some(f => /chunk|voice/.test(f))).toBe(false)
  })

  test('a later segment transcribed without a voice clip is never called confident', async () => {
    openaiReplies(200, GOOD)
    const id = newSession()
    store.updateMeta(id, { consentConfirmedAt: new Date().toISOString() })
    recordSegment(id, 'A')
    recordSegment(id, 'B')
    review.finishRecording(req(id), makeRes())
    await drain()
    const meta = store.readMeta(id)
    // Segment 1 opens with the consent line, so its first speaker is the advisor; segment 2
    // has no anchor at all.
    expect(meta.segments.map(s => s.attributionConfident)).toEqual([true, false])
    expect(store.readTranscript(id).attributionConfident).toBe(false)
  })

  test('a card pressed and left at once closes as empty and is never sent', async () => {
    const spy = openaiReplies(200, GOOD)
    const id = newSession()
    store.updateMeta(id, { consentConfirmedAt: new Date().toISOString() })
    const open = makeRes()
    seg.openNextSegment(req(id, { body: { label: 'Empty' } }), open)
    recordSegment(id, 'Real')
    seg.closeSegment(req(id), makeRes())
    await drain()
    expect(store.readMeta(id).segments[0].state).toBe('empty')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  test('a break closes the live segment without opening another', async () => {
    openaiReplies(200, GOOD)
    const id = newSession()
    store.updateMeta(id, { consentConfirmedAt: new Date().toISOString() })
    recordSegment(id, 'A')
    const res = makeRes()
    seg.closeSegment(req(id), res)
    expect(res._body.closed).toBe(1)
    await drain()
    expect(store.readMeta(id).segments.some(s => s.state === 'recording')).toBe(false)

    const again = makeRes()
    seg.closeSegment(req(id), again)
    expect(again._body.closed).toBeNull()
  })

  test('a second finish while the session is finishing is answered, not repeated', () => {
    const id = newSession()
    store.updateMeta(id, { consentConfirmedAt: new Date().toISOString(), state: 'finishing' })
    const res = makeRes()
    seg.finishSegmented(store.readMeta(id), res)
    expect(res._status).toBe(202)
  })
})

describe('who may do what', () => {
  test('a colleague at the same firm cannot open a segment in someone else\'s session', () => {
    const id = newSession()
    const res = makeRes()
    seg.openNextSegment({ firmId: FIRM, advisorId: 'someone-else', params: { meetingId: id }, body: { label: 'A' } }, res)
    expect(res._status).toBe(404)
  })

  test('a single-file meeting cannot take segments', () => {
    const { meetingId } = store.createMeeting({ firmId: FIRM, advisor: ADVISOR, retentionMonths: 18 })
    const res = makeRes()
    seg.openNextSegment(req(meetingId, { body: { label: 'A' } }), res)
    expect(bodyOf(res).error.code).toBe('NOT_SEGMENTED')
  })

  test('a finished session takes no more segments', () => {
    const id = newSession()
    store.updateMeta(id, { state: 'finishing' })
    const res = makeRes()
    seg.openNextSegment(req(id, { body: { label: 'A' } }), res)
    expect(bodyOf(res).error.code).toBe('NOT_RECORDING')
  })

  test('a segment needs its concept\'s name', () => {
    const id = newSession()
    const res = makeRes()
    seg.openNextSegment(req(id, { body: { label: '  ' } }), res)
    expect(bodyOf(res).error.code).toBe('NO_LABEL')
  })

  test('a segment may only be labelled with a real concept or framework — the label gates what reaches a model', async () => {
    const id = newSession()
    const forged = makeRes()
    await seg.openNextSegment(req(id, { body: { conceptId: 'made-up-concept', label: 'Alignment Statements' } }), forged)
    expect(bodyOf(forged).error.code).toBe('UNKNOWN_CONCEPT')
    const notText = makeRes()
    await seg.openNextSegment(req(id, { body: { conceptId: { id: 'alignment-statements' }, label: 'A' } }), notText)
    expect(bodyOf(notText).error.code).toBe('UNKNOWN_CONCEPT')
    // 🔴 An imported concept's id is refused unless THIS meeting's firm can see it (item 15.20).
    const notOurs = makeRes()
    await seg.openNextSegment(req(id, { body: { conceptId: 'im-f99', label: 'Their concept' } }), notOurs)
    expect(bodyOf(notOurs).error.code).toBe('UNKNOWN_CONCEPT')
    expect(store.readMeta(id).segments || []).toHaveLength(0)

    for (const conceptId of ['alignment-statements', 'swot-pest', null]) {
      const ok = makeRes()
      await seg.openNextSegment(req(id, { body: { conceptId, label: 'A' } }), ok)
      expect(ok._status).toBe(201)
    }
  })

  test('opening a segment tells the browser when to roll over', () => {
    const id = newSession()
    const res = makeRes()
    seg.openNextSegment(req(id, { body: { label: 'A' } }), res)
    expect(res._body.rollBytes).toBe(store.SEGMENT_ROLL_BYTES)
    expect(res._body.maxBytes).toBe(store.SEGMENT_MAX_BYTES)
  })

  test('a store fault while opening, closing or finishing answers safely, never with its message', () => {
    const id = newSession()
    store.updateMeta(id, { consentConfirmedAt: new Date().toISOString() })
    recordSegment(id, 'A')
    const boom = new Error('EACCES /var/secret/path')
    jest.spyOn(store, 'openSegment').mockImplementation(() => { throw boom })
    jest.spyOn(store, 'updateSegment').mockImplementation(() => { throw boom })

    const open = makeRes()
    seg.openNextSegment(req(id, { body: { label: 'B' } }), open)
    expect(bodyOf(open).error.code).toBe('SEGMENT_REFUSED')

    const close = makeRes()
    seg.closeSegment(req(id), close)
    expect(close._status).toBe(500)

    const finish = makeRes()
    review.finishRecording(req(id), finish)
    expect(finish._status).toBe(500)
    expect(JSON.stringify(bodyOf(finish))).not.toContain('/var/secret')
  })

  test('audio that survives its deletion is written onto the segment and the session', async () => {
    // §5 trap 4: a deletion that failed must surface, not report success.
    openaiReplies(200, GOOD)
    const id = newSession()
    store.updateMeta(id, { consentConfirmedAt: new Date().toISOString() })
    recordSegment(id, 'A')
    jest.spyOn(store, 'destroySegmentAudio').mockReturnValue({ removed: 0, bytesRemoved: 0, audioRemains: true })
    jest.spyOn(store, 'destroyAudio').mockReturnValue({ removed: 0, bytesRemoved: 0, audioRemains: true })
    review.finishRecording(req(id), makeRes())
    await drain()
    const meta = store.readMeta(id)
    expect(meta.segments[0].audioDeletionFailed).toBe(true)
    expect(meta.audioDeletionFailed).toBe(true)
  })

  test('"Stop and delete everything" leaves nothing of the session', () => {
    const id = newSession()
    store.writeVoiceReference(id, Buffer.from('VOICE'), 'audio/webm')
    recordSegment(id, 'A')
    const res = makeRes()
    review.deleteRecording(req(id), res)
    expect(res._body.deleted).toBe(true)
    expect(fs.existsSync(path.join(ROOT, id))).toBe(false)
  })
})

describe('uploads', () => {
  test('the voice clip is stored with its base audio type', async () => {
    const id = newSession()
    mockNextForm = { fields: {}, files: { clip: [tempUpload('VOICE', 'audio/webm;codecs=opus')] } }
    const res = makeRes()
    await seg.uploadVoiceReference(req(id), res)
    expect(res._status).toBe(201)
    expect(store.readVoiceReference(id).mime).toBe('audio/webm')
  })

  test('a clip that is not an allowed audio type is refused', async () => {
    const id = newSession()
    mockNextForm = { fields: {}, files: { clip: tempUpload('<html>', 'text/html') } }
    const res = makeRes()
    await seg.uploadVoiceReference(req(id), res)
    expect(bodyOf(res).error.code).toBe('CLIP_TYPE')
    expect(store.readVoiceReference(id)).toBeNull()
  })

  test('a clip request with no clip is refused', async () => {
    const id = newSession()
    const res = makeRes()
    await seg.uploadVoiceReference(req(id), res)
    expect(bodyOf(res).error.code).toBe('NO_CLIP')
  })

  test('an unreadable clip form is refused', async () => {
    const id = newSession()
    mockNextForm = { error: new Error('bad form') }
    const res = makeRes()
    await seg.uploadVoiceReference(req(id), res)
    expect(bodyOf(res).error.code).toBe('PARSE_ERROR')
  })

  test('an oversized clip is refused by the store', async () => {
    const id = newSession()
    mockNextForm = { fields: {}, files: { clip: tempUpload(Buffer.alloc(store.MAX_VOICE_REFERENCE_BYTES + 1), 'audio/webm') } }
    const res = makeRes()
    await seg.uploadVoiceReference(req(id), res)
    expect(bodyOf(res).error.code).toBe('CLIP_REJECTED')
  })

  test('a chunk lands in the live segment', async () => {
    const id = newSession()
    const open = makeRes()
    seg.openNextSegment(req(id, { body: { label: 'A' } }), open)
    mockNextForm = { fields: { seq: ['1'] }, files: { chunk: [tempUpload('AUDIO', 'audio/webm')] } }
    const res = makeRes()
    await seg.uploadSegmentChunk(req(id, { params: { n: '1' } }), res)
    expect(res._status).toBe(201)
    expect(res._body.segmentBytes).toBe(5)
  })

  test('a full segment answers SEGMENT_FULL so the browser rolls over to "part 2"', async () => {
    const id = newSession()
    const open = makeRes()
    seg.openNextSegment(req(id, { body: { label: 'A' } }), open)
    store.updateSegment(id, 1, { bytes: store.SEGMENT_MAX_BYTES })
    mockNextForm = { fields: { seq: '1' }, files: { chunk: tempUpload('AUDIO', 'audio/webm') } }
    const res = makeRes()
    await seg.uploadSegmentChunk(req(id, { params: { n: '1' } }), res)
    expect(res._status).toBe(409)
    expect(bodyOf(res).error.code).toBe('SEGMENT_FULL')
  })

  test('a chunk for a segment that is not live is refused', async () => {
    const id = newSession()
    mockNextForm = { fields: { seq: '1' }, files: { chunk: tempUpload('AUDIO', 'audio/webm') } }
    const res = makeRes()
    await seg.uploadSegmentChunk(req(id, { params: { n: '3' } }), res)
    expect(bodyOf(res).error.code).toBe('CHUNK_REJECTED')
  })

  test('a chunk request with no chunk, or an unreadable form, is refused', async () => {
    const id = newSession()
    const none = makeRes()
    await seg.uploadSegmentChunk(req(id, { params: { n: '1' } }), none)
    expect(bodyOf(none).error.code).toBe('NO_CHUNK')

    mockNextForm = { error: new Error('bad') }
    const broken = makeRes()
    await seg.uploadSegmentChunk(req(id, { params: { n: '1' } }), broken)
    expect(bodyOf(broken).error.code).toBe('PARSE_ERROR')
  })
})

describe('🔴 each concept\'s summary, approved by the advisor and client (slice 2)', () => {
  /** A finished, transcribed one-segment session whose summary has been written. */
  async function transcribedSession () {
    openaiReplies(200, GOOD)
    const id = newSession()
    store.writeVoiceReference(id, Buffer.from('VOICE'), 'audio/webm')
    store.updateMeta(id, { consentConfirmedAt: new Date().toISOString() })
    recordSegment(id, 'porters-5-forces')
    seg.closeSegment(req(id), makeRes())
    await drain()
    return id
  }

  function summaryReq (id, extra = {}) {
    return req(id, { params: { n: '1' }, body: extra.body || {} })
  }

  test('a summary is written as soon as the segment is text, from its words alone', async () => {
    const id = await transcribedSession()
    expect(store.readSegmentSummary(id, 1).sections[0].text).toBe('Only two coating suppliers nearby.')
    expect(store.readMeta(id).segments[0].summaryState).toBe('ready')
    const call = conceptSummary.generate.mock.calls[0][0]
    expect(call.segments.map(r => r.text)).toEqual(['the client spoke first', 'and the advisor replied'])
    expect(JSON.stringify(call)).not.toContain(id)
  })

  test('a summary that could not be written says so on the segment', async () => {
    conceptSummary.generate.mockImplementation(() => Promise.reject(new Error('model down')))
    const id = await transcribedSession()
    expect(store.readMeta(id).segments[0].summaryState).toBe('failed')
    expect(store.readSegmentSummary(id, 1)).toBeNull()
  })

  test('approval needs the client\'s agreement ticked — nothing else approves', async () => {
    const id = await transcribedSession()
    const refused = makeRes()
    seg.approveSegmentSummary(summaryReq(id, { body: {} }), refused)
    expect(bodyOf(refused).error.code).toBe('CLIENT_NOT_AGREED')
    expect(store.readSegmentSummary(id, 1).approvedAt).toBeNull()

    const ok = makeRes()
    seg.approveSegmentSummary(summaryReq(id, { body: { clientAgreed: true } }), ok)
    expect(ok._body.approved).toBe(true)
    expect(store.readSegmentSummary(id, 1).clientAgreed).toBe(true)
    expect(store.readMeta(id).segments[0].summaryApprovedAt).toBeTruthy()
  })

  test('an edit changes the words, keeps the AI\'s draft beside them, and clears the approval', async () => {
    const id = await transcribedSession()
    seg.approveSegmentSummary(summaryReq(id, { body: { clientAgreed: true } }), makeRes())
    const res = makeRes()
    seg.saveSegmentSummary(summaryReq(id, { body: { sections: [{ heading: 'How Suppliers May Change', text: 'One coater is full until March.' }] } }), res)
    expect(res._body.saved).toBe(true)
    const stored = store.readSegmentSummary(id, 1)
    expect(stored.editedSections[0].text).toBe('One coater is full until March.')
    expect(stored.sections[0].text).toBe('Only two coating suppliers nearby.')
    expect(stored.approvedAt).toBeNull()
    expect(store.readMeta(id).segments[0].summaryApprovedAt).toBeNull()

    const read = makeRes()
    seg.getSegmentSummary(summaryReq(id), read)
    expect(read._body.sections[0].text).toBe('One coater is full until March.')
  })

  test('an edit cannot invent a heading', async () => {
    const id = await transcribedSession()
    const res = makeRes()
    seg.saveSegmentSummary(summaryReq(id, { body: { sections: [{ heading: 'Our Secret Plan', text: 'x' }] } }), res)
    expect(bodyOf(res).error.code).toBe('BAD_EDIT')
  })

  test('an approved summary is never written over by a second run', async () => {
    const id = await transcribedSession()
    seg.approveSegmentSummary(summaryReq(id, { body: { clientAgreed: true } }), makeRes())
    const res = makeRes()
    seg.regenerateSegmentSummary(summaryReq(id), res)
    expect(bodyOf(res).error.code).toBe('SUMMARY_APPROVED')
    await seg.runSegmentSummary(id, 1)
    expect(conceptSummary.generate).toHaveBeenCalledTimes(1)
  })

  test('a failed summary can be written again', async () => {
    conceptSummary.generate.mockImplementationOnce(() => Promise.reject(new Error('down')))
    const id = await transcribedSession()
    const res = makeRes()
    seg.regenerateSegmentSummary(summaryReq(id), res)
    expect(res._status).toBe(202)
    await drain()
    expect(store.readMeta(id).segments[0].summaryState).toBe('ready')
  })

  test('a section not yet turned into text has no summary to read', () => {
    const id = newSession()
    recordSegment(id, 'A')
    const res = makeRes()
    seg.getSegmentSummary(summaryReq(id), res)
    expect(bodyOf(res).error.code).toBe('NO_SEGMENT')
  })

  test('a single-file meeting has no concept summaries', () => {
    const { meetingId } = store.createMeeting({ firmId: FIRM, advisor: ADVISOR, retentionMonths: 18 })
    const res = makeRes()
    seg.getSegmentSummary(req(meetingId, { params: { n: '1' } }), res)
    expect(bodyOf(res).error.code).toBe('NOT_SEGMENTED')
  })

  test('a colleague cannot read, edit or approve another advisor\'s summaries', async () => {
    const id = await transcribedSession()
    const stranger = { firmId: FIRM, advisorId: 'someone-else', params: { meetingId: id, n: '1' }, body: { clientAgreed: true } }
    const res = makeRes()
    seg.approveSegmentSummary(stranger, res)
    expect(res._status).toBe(404)
  })

  test('editing or approving a summary that was never written is refused', async () => {
    conceptSummary.generate.mockImplementation(() => Promise.reject(new Error('down')))
    const id = await transcribedSession()
    const edit = makeRes()
    seg.saveSegmentSummary(summaryReq(id, { body: { sections: [] } }), edit)
    expect(bodyOf(edit).error.code).toBe('NO_SUMMARY')
    const approve = makeRes()
    seg.approveSegmentSummary(summaryReq(id, { body: { clientAgreed: true } }), approve)
    expect(bodyOf(approve).error.code).toBe('NO_SUMMARY')
  })

  test('🔴 Decision J: the Meeting Summary holds only what the client approved, and no model is asked', async () => {
    const id = await transcribedSession()
    review.finishRecording(req(id), makeRes())
    await drain()

    // Not yet approved: the Meeting Summary is empty, and says one is waiting.
    await review.runReports(id, { points: [], scenarioName: 'Strategy Session' })
    let report = store.readReport(id, 'summary')
    expect(report.covered).toBe('')
    expect(report.waitingForApproval).toBe(1)
    expect(report.model).toBeNull()

    seg.approveSegmentSummary(summaryReq(id, { body: { clientAgreed: true } }), makeRes())
    await review.runReports(id, { points: [], scenarioName: 'Strategy Session' })
    report = store.readReport(id, 'summary')
    expect(report.covered).toContain('Only two coating suppliers nearby.')
    expect(report.actions).toEqual([])
    expect(report.composedFromConcepts.map(c => c.n)).toEqual([1])
  })
})

describe('🔴 screen 11 on the server — pauses and silent sections (Decisions L and N)', () => {
  const SILENT = JSON.stringify({ text: '', segments: [] })

  test('a silent section finishes the session normally, with an empty summary and no model asked', async () => {
    openaiReplies(200, SILENT)
    const id = newSession()
    store.updateMeta(id, { consentConfirmedAt: new Date().toISOString() })
    recordSegment(id, 'A')
    review.finishRecording(req(id), makeRes())
    await drain()
    expect(store.readMeta(id).state).toBe('transcribed')
    expect(store.readTranscript(id).segments).toEqual([])
    expect(conceptSummary.generate).not.toHaveBeenCalled()
    expect(store.readSegmentSummary(id, 1).sections.every(s => s.text === null)).toBe(true)
    expect(store.readMeta(id).segments[0].summaryState).toBe('ready')
  })

  test('a recorded pause moves the later words back to their real time', async () => {
    openaiReplies(200, JSON.stringify({ text: 'x', segments: [{ speaker: 'advisor', start: 50, end: 52, text: 'after the pause' }] }))
    const id = newSession()
    store.writeVoiceReference(id, Buffer.from('VOICE'), 'audio/webm')
    store.updateMeta(id, { consentConfirmedAt: new Date().toISOString() })
    recordSegment(id, 'A')
    const res = makeRes()
    seg.recordPause(req(id, { params: { n: '1' }, body: { at: 40, duration: 240 } }), res)
    expect(res._status).toBe(201)
    seg.closeSegment(req(id), makeRes())
    await drain()
    expect(store.readSegmentTranscript(id, 1).segments[0].start).toBe(290)
  })

  test.each([
    ['no numbers', {}],
    ['a negative place', { at: -1, duration: 10 }],
    ['no length', { at: 5, duration: 0 }],
    ['longer than a day', { at: 5, duration: 90000 }]
  ])('a pause with %s is refused', (_label, body) => {
    const id = newSession()
    recordSegment(id, 'A')
    const res = makeRes()
    seg.recordPause(req(id, { params: { n: '1' }, body }), res)
    expect(bodyOf(res).error.code).toBe('BAD_PAUSE')
  })

  test('a section whose words are back can no longer take a pause', async () => {
    openaiReplies(200, SILENT)
    const id = newSession()
    store.updateMeta(id, { consentConfirmedAt: new Date().toISOString() })
    recordSegment(id, 'A')
    seg.closeSegment(req(id), makeRes())
    await drain()
    const res = makeRes()
    seg.recordPause(req(id, { params: { n: '1' }, body: { at: 1, duration: 5 } }), res)
    expect(bodyOf(res).error.code).toBe('SEGMENT_SETTLED')
  })

  test('a single-file meeting, or a colleague, cannot record a pause', () => {
    const { meetingId } = store.createMeeting({ firmId: FIRM, advisor: ADVISOR, retentionMonths: 18 })
    const one = makeRes()
    seg.recordPause(req(meetingId, { params: { n: '1' }, body: { at: 1, duration: 5 } }), one)
    expect(bodyOf(one).error.code).toBe('NOT_SEGMENTED')
    const id = newSession()
    const two = makeRes()
    seg.recordPause({ firmId: FIRM, advisorId: 'someone-else', params: { meetingId: id, n: '1' }, body: { at: 1, duration: 5 } }, two)
    expect(two._status).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────────
// An ordinary meeting recorded in 20-minute parts (item 8.4, the long-recording drawing,
// approved 2026-10-01). OpenAI refuses more than 1400 seconds of audio, so a meeting past
// 23 min 20 s that is sent whole loses its transcript AND its audio — no tester records that
// long. What these pin: the parts are joined into ONE transcript with no concept summaries
// asked of a model, and a part that failed is disclosed by the minutes it covered (Decision E),
// never closed up as if nothing were missing.
describe('an ordinary meeting in parts', () => {
  /** Answer the Nth transcription call with `replies[N]`, the last one repeating. */
  function openaiSequence (replies) {
    let call = 0
    return jest.spyOn(https, 'request').mockImplementation((_o, onResponse) => ({
      setTimeout () {},
      on () {},
      write () {},
      destroy () {},
      end () {
        const [status, payload] = replies[Math.min(call, replies.length - 1)]
        call += 1
        setImmediate(() => onResponse({
          statusCode: status,
          async * [Symbol.asyncIterator] () { yield Buffer.from(payload) }
        }))
      }
    }))
  }

  /** Open the next part through the route, give it audio, and set when it began. */
  function recordPart (meetingId, startedAt) {
    const res = makeRes()
    seg.openNextSegment(req(meetingId, { body: { label: 'part' } }), res)
    const n = res._body.segment
    store.appendSegmentChunk(meetingId, n, 1, Buffer.from('AUDIO-' + n))
    store.updateSegment(meetingId, n, { startedAt })
    return n
  }

  async function startInParts (body) {
    const res = makeRes()
    await review.startRecording({ firmId: FIRM, advisorId: ADVISOR, body }, res)
    return res
  }

  test('a recording started in parts is segmented, and marked as parts rather than concepts', async () => {
    const res = await startInParts({ scenarioId: 'discovery', segmented: true, parts: true })
    expect(res._status).toBe(201)
    const meta = store.readMeta(res._body.meetingId)
    expect(meta.segmented).toBe(true)
    expect(meta.inParts).toBe(true)
  })

  test('a recording in parts cannot also claim a planning session', async () => {
    const res = await startInParts({ segmented: true, parts: true, strategySessionId: 41 })
    expect(res._status).toBe(400)
  })

  test('a part may not name a concept', async () => {
    const started = await startInParts({ segmented: true, parts: true })
    const res = makeRes()
    seg.openNextSegment(req(started._body.meetingId, { body: { conceptId: 'porters-5-forces', label: 'part' } }), res)
    expect(bodyOf(res).error.code).toBe('UNKNOWN_CONCEPT')
  })

  test('three parts join into one transcript, each part on the meeting\'s clock, and no concept summary is asked for', async () => {
    openaiSequence([[200, GOOD]])
    const id = (await startInParts({ segmented: true, parts: true }))._body.meetingId
    store.writeVoiceReference(id, Buffer.from('VOICE'), 'audio/webm')
    store.updateMeta(id, { consentConfirmedAt: new Date().toISOString() })
    recordPart(id, '2026-10-01T09:00:00.000Z')
    recordPart(id, '2026-10-01T09:20:00.000Z')
    recordPart(id, '2026-10-01T09:40:00.000Z')
    review.finishRecording(req(id), makeRes())
    await drain()

    const transcript = store.readTranscript(id)
    expect(transcript.segments.map(r => r.start)).toEqual([0, 4, 1200, 1204, 2400, 2404])
    expect(transcript.missingRanges).toEqual([])
    expect(conceptSummary.generate).not.toHaveBeenCalled()
    expect(store.readMeta(id).state).toBe('transcribed')
  })

  test('a part that failed is kept out and named by the minutes it covered; the parts that worked survive', async () => {
    openaiSequence([[200, GOOD], [500, '{"error":"down"}'], [200, GOOD]])
    const id = (await startInParts({ segmented: true, parts: true }))._body.meetingId
    store.writeVoiceReference(id, Buffer.from('VOICE'), 'audio/webm')
    store.updateMeta(id, { consentConfirmedAt: new Date().toISOString() })
    recordPart(id, '2026-10-01T09:00:00.000Z')
    await drain()
    recordPart(id, '2026-10-01T09:20:00.000Z')
    await drain()
    recordPart(id, '2026-10-01T09:40:00.000Z')
    await drain()
    // The second part closed when the third opened, at the test's real time; pin it to the clock.
    store.updateSegment(id, 2, { closedAt: '2026-10-01T09:40:00.000Z' })
    review.finishRecording(req(id), makeRes())
    await drain()

    const transcript = store.readTranscript(id)
    expect(transcript.missingSegments).toEqual([2])
    expect(transcript.missingRanges).toEqual([{ segment: 2, from: 1200, to: 2400 }])
    expect(transcript.segments.map(r => r.segment)).toEqual([1, 1, 3, 3])
    expect(store.readMeta(id).state).toBe('transcribed')
  })
})
