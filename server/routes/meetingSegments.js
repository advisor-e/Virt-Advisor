'use strict'

/**
 * A strategy session recorded in concept segments — the routes, and the per-segment
 * transcription jobs behind them. Item 8.4, slice 1.
 *
 * Drawing `design/mockups/strategy-session-recording.html`, APPROVED FOR BUILD by Mike on
 * 2026-09-28 (as committed in 976533c2). Rulings in `design/features/strategy-planner.md` §9b:
 * one segment per concept, framing and agenda first (A); a segment starts only on the
 * advisor's press (B); one consent per session (C); a segment closes itself at 25 minutes or
 * 20 MB (E); breaks close the recording.
 *
 * 🔴 EVERY PROMISE MEETING REVIEW MAKES STILL HOLDS, PER SEGMENT:
 *   - **Consent first.** Nothing is transcribed until consent is confirmed. Segment 1 records
 *     while the line is spoken (record → speak → confirm); a segment closed before the tick
 *     waits, and is transcribed the moment it arrives (`startPending`).
 *   - **Audio dies once it is text** (P8) — each segment's audio is destroyed in a `finally`
 *     the moment ITS transcription returns, whether or not it worked. The advisor's voice clip
 *     lives until the session's recording finishes, and goes then.
 *   - **Owner only** (P2). Every route goes through `ownedMeeting`, which checks the advisor
 *     as well as the firm.
 *
 * ⚠ A FAILED SEGMENT FAILS ALONE. The rest of the session keeps recording, and the advisor
 * sees it within minutes while the client is still in the room (the gain Mike named on 8.4).
 *
 * Node 14, CommonJS.
 */

const fs = require('fs')
const { formidable } = require('formidable')
const { sendError } = require('../utils/sendError')
const store = require('../utils/meetingAudioStore')
const { createTranscriptionClient, REFERENCE_MIME_TYPES } = require('../utils/transcriptionClient')
const { logSuffixNoFallback } = require('../utils/aiProvider')
const { allSettled, joinTranscripts, restorePausedTime, publicSegments } = require('../utils/meetingSegments')
// Called through the module object so a test can stand in for the model call.
const conceptSummary = require('../utils/conceptSummary')
const frameworks = require('../utils/strategyFrameworks')
const captureForms = require('../utils/strategyCaptureForms')
const importedConcepts = require('../utils/importedConcepts')

/** The same callback wrapper `meetingReview.js` uses around formidable v2's parse(). */
function parseForm (form, req) {
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) { reject(err); return }
      resolve([fields, files])
    })
  })
}

/** Meeting Review's ownership check — the firm AND the advisor (P2). Required lazily: that
 * file requires this one for `finishSegmented`. */
function ownedMeeting (req, res) {
  return require('./meetingReview').ownedMeeting(req, res)
}

/** The first value of a formidable field or file, which v2 may hand over as an array. */
function first (value) {
  return Array.isArray(value) ? value[0] : value
}

/**
 * Per-segment transcription jobs in flight, keyed `<meetingId>:<n>`. In-process for the
 * reason `meetingReview.jobs` gives: the audio is on this server's disk.
 * @type {Map<string, string>}
 */
const segmentJobs = new Map()

/**
 * Transcribe one closed segment, then destroy its audio whatever happened.
 *
 * 🔴 WITHOUT THE VOICE CLIP, ONLY SEGMENT 1 CAN BE TRUSTED. Segment 1 opens with the consent
 * line, so its first speaker is the advisor. Every later segment has no such anchor, and the
 * first-speaker rule would swap its labels whenever the client spoke first — confidently. So a
 * later segment transcribed without a clip is recorded as NOT confident, whatever the
 * transcription says, and the coaching notes then say so above every figure that depends on it.
 *
 * @param {string} meetingId
 * @param {number} n
 * @returns {Promise<void>}
 */
async function runSegmentTranscription (meetingId, n) {
  const key = meetingId + ':' + n
  if (segmentJobs.has(key)) { return }
  segmentJobs.set(key, 'transcribing')
  store.updateSegment(meetingId, n, { state: 'transcribing' })

  try {
    const audio = store.assembleSegment(meetingId, n)
    const reference = store.readVoiceReference(meetingId)
    const client = createTranscriptionClient({ apiKey: process.env.OPENAI_API_KEY })
    const result = await client.transcribe({ buffer: audio, advisorReference: reference || undefined })
    const confident = Boolean(result.confident) && (Boolean(reference) || n === 1)

    // Model, size, latency and result — never a word of what was said (CLAUDE.md).
    console.log('[meeting-segments] transcribed: ' + logSuffixNoFallback() + ' model=' + result.model +
      ' segment=' + n + ' bytes=' + result.bytes + ' latencyMs=' + result.latencyMs +
      ' rows=' + result.segments.length + ' dropped=' + result.dropped +
      ' speakers=' + result.speakerCount + ' clip=' + (reference ? 'yes' : 'no') +
      ' confident=' + confident)

    // Decision L: the minutes the browser paused for are added back, so every quote keeps its
    // real time on the clock.
    const seg = ((store.readMeta(meetingId) || {}).segments || []).filter(s => s.n === n)[0]
    store.writeSegmentTranscript(meetingId, n, {
      model: result.model,
      createdAt: new Date().toISOString(),
      segments: restorePausedTime(result.segments, seg && seg.pauses),
      text: result.text,
      droppedSegments: result.dropped,
      speakerCount: result.speakerCount,
      attributionConfident: confident
    })
    store.updateSegment(meetingId, n, { state: 'done', attributionConfident: confident })
    // Slice 2: the concept's summary is written as soon as its words exist, so the advisor and
    // client can approve it while the concept is fresh (screen 10).
    runSegmentSummary(meetingId, n)
  } catch (err) {
    console.error('[meeting-segments] segment ' + n + ' transcription failed:', err.message)
    store.updateSegment(meetingId, n, { state: 'failed' })
  } finally {
    try {
      const proof = store.destroySegmentAudio(meetingId, n)
      console.log('[meeting-segments] segment audio destroyed: meeting=' + meetingId + ' segment=' + n +
        ' files=' + proof.removed + ' bytes=' + proof.bytesRemoved + ' remains=' + proof.audioRemains)
      if (proof.audioRemains) {
        console.error('[meeting-segments] SEGMENT AUDIO STILL PRESENT after deletion: ' + meetingId + ' ' + n)
        store.updateSegment(meetingId, n, { audioDeletionFailed: true })
      } else {
        store.updateSegment(meetingId, n, { audioDeletedAt: new Date().toISOString() })
      }
    } catch (delErr) {
      console.error('[meeting-segments] segment audio deletion errored:', delErr.message)
    }
    segmentJobs.delete(key)
    settle(meetingId)
  }
}

/**
 * Concept-summary jobs in flight, keyed `<meetingId>:<n>`.
 * @type {Map<string, string>}
 */
const summaryJobs = new Map()

/**
 * The headings a segment's summary is written under, from its concept's own capture table.
 *
 * An imported concept's headings are the box labels its manager typed, and its name — Mike's
 * ruling of 2026-09-29. Its PDF is never read here and never sent (strategy-planner.md §9).
 *
 * @param {object} seg - one entry of `meta.segments`
 * @param {string|null} firmId - the meeting's own firm, whose imported concepts it can see
 * @returns {Promise<{headings: Array<string>, conceptName: string}>}
 */
async function headingsForSegment (seg, firmId) {
  let concept = seg.conceptId ? frameworks.getConcept(seg.conceptId) : null
  let capture = concept ? captureForms.captureForConcept(concept) : null
  if (!concept && seg.conceptId && firmId) {
    const record = await importedConcepts.findVisible(firmId, seg.conceptId)
    if (record) {
      concept = { name: record.name }
      capture = importedConcepts.captureOf(record)
    }
  }
  return {
    headings: conceptSummary.headingsFor(concept, capture, seg.label),
    conceptName: (concept && concept.name) || seg.label
  }
}

/**
 * Write one segment's concept summary (item 8.4, slice 2).
 *
 * ⚠ AN APPROVED SUMMARY IS NEVER OVERWRITTEN. A second run — a retry, a regenerate pressed
 * twice — must not replace words the client has agreed to with fresh ones they have not seen.
 *
 * @param {string} meetingId
 * @param {number} n
 * @returns {Promise<void>}
 */
async function runSegmentSummary (meetingId, n) {
  const key = meetingId + ':' + n
  if (summaryJobs.has(key)) { return }
  const meta = store.readMeta(meetingId)
  const seg = ((meta && meta.segments) || []).filter(s => s.n === n)[0]
  const text = store.readSegmentTranscript(meetingId, n)
  const existing = store.readSegmentSummary(meetingId, n)
  if (!seg || !text || (existing && existing.approvedAt)) { return }

  summaryJobs.set(key, 'writing')
  store.updateSegment(meetingId, n, { summaryState: 'writing' })
  try {
    const { headings, conceptName } = await headingsForSegment(seg, meta.firmId)
    const spoken = text.segments || []
    // Decision N: nothing was said, so there is nothing to summarise and no model is asked —
    // every heading reads "Nothing was said about this."
    const summary = spoken.length
      ? await conceptSummary.generate({ segments: spoken, conceptName, headings })
      : conceptSummary.emptySummary(headings)
    store.writeSegmentSummary(meetingId, n, summary)
    store.updateSegment(meetingId, n, { summaryState: 'ready', summaryApprovedAt: null })
  } catch (err) {
    console.error('[meeting-segments] segment ' + n + ' summary failed:', err.message)
    store.updateSegment(meetingId, n, { summaryState: 'failed' })
  } finally {
    summaryJobs.delete(key)
  }
}

/**
 * Close the live segment. It is transcribed now if consent is confirmed, and waits if not.
 *
 * @param {string} meetingId
 * @returns {object|null} the closed segment, or null when none was recording
 */
function closeLiveSegment (meetingId) {
  const meta = store.readMeta(meetingId)
  const live = ((meta && meta.segments) || []).filter(s => s.state === 'recording')[0]
  if (!live) { return null }
  const closedAt = new Date().toISOString()
  // A segment that captured nothing — a card pressed and left at once — is settled as empty
  // rather than sent to OpenAI, which would refuse a zero-length file anyway.
  const closed = store.updateSegment(meetingId, live.n, {
    state: store.listSegmentChunks(meetingId, live.n).length ? 'closed' : 'empty',
    closedAt
  })
  if (closed.state === 'closed' && meta.consentConfirmedAt) {
    runSegmentTranscription(meetingId, live.n)
  }
  return closed
}

/**
 * Transcribe every segment that closed before consent was confirmed.
 * Called from `meetingReview.confirmConsent` the moment the tick arrives.
 *
 * @param {string} meetingId
 */
function startPending (meetingId) {
  const meta = store.readMeta(meetingId)
  if (!meta || !meta.segmented || !meta.consentConfirmedAt) { return }
  ;(meta.segments || [])
    .filter(s => s.state === 'closed')
    .forEach(s => runSegmentTranscription(meetingId, s.n))
}

/**
 * Once the recording is finished and every segment has settled, join them, destroy the voice
 * clip, and hand Meeting Review one transcript exactly as a single-file meeting would.
 *
 * @param {string} meetingId
 */
function settle (meetingId) {
  const meta = store.readMeta(meetingId)
  if (!meta || !meta.segmented || meta.state !== 'finishing') { return }
  if (!allSettled(meta.segments)) { return }

  try {
    const joined = joinTranscripts(meta.segments, n => store.readSegmentTranscript(meetingId, n))
    // Decision N: a session whose sections were turned into text has finished, even if some —
    // or all — were silent. Only a session where nothing could be transcribed has failed.
    const transcribedAny = joined.transcribedSegments > 0
    if (transcribedAny) {
      store.writeTranscript(meetingId, {
        meetingId,
        createdAt: new Date().toISOString(),
        segments: joined.segments,
        text: joined.text,
        speakerCount: joined.speakerCount,
        attributionConfident: joined.attributionConfident,
        segmentCount: joined.segmentCount,
        // Disclosed rather than hidden: which segments could not be turned into text.
        missingSegments: joined.missingSegments
      })
    }
    store.updateMeta(meetingId, transcribedAny
      ? { state: 'transcribed', transcribedAt: new Date().toISOString() }
      : { state: 'failed', failedReason: 'transcription' })
  } catch (err) {
    console.error('[meeting-segments] join failed:', err.message)
    store.updateMeta(meetingId, { state: 'failed', failedReason: 'join' })
  } finally {
    // The voice clip, and anything a failed deletion left, goes now — the session's audio is
    // finished with. Checked, and written onto the record, as runTranscription does.
    try {
      const proof = store.destroyAudio(meetingId)
      console.log('[meeting-segments] session audio destroyed: meeting=' + meetingId +
        ' files=' + proof.removed + ' bytes=' + proof.bytesRemoved + ' remains=' + proof.audioRemains)
      store.updateMeta(meetingId, proof.audioRemains
        ? { audioDeletionFailed: true }
        : { audioDeletedAt: new Date().toISOString() })
    } catch (delErr) {
      console.error('[meeting-segments] session audio deletion errored:', delErr.message)
    }
  }
}

/** The meeting, once owned AND segmented and still recording — or an error already sent. */
function recordingSession (req, res) {
  const meta = ownedMeeting(req, res)
  if (!meta) { return null }
  if (!meta.segmented) {
    sendError(res, 409, 'NOT_SEGMENTED', 'This recording is not a strategy session.')
    return null
  }
  if (meta.state !== 'recording') {
    sendError(res, 409, 'NOT_RECORDING', 'This session has finished recording.')
    return null
  }
  return meta
}

/**
 * POST /api/meeting/recordings/:meetingId/voice-reference  (advisor)
 *
 * The advisor's voice clip, cut by the browser from the first seconds of the consent line.
 * See `transcriptionClient.ADVISOR_SPEAKER_NAME` for why it exists and how long it lives.
 *
 * @route POST /api/meeting/recordings/:meetingId/voice-reference
 * @param {object} req - multipart: file `clip`
 * @returns {{stored: true, bytes: number}}
 */
async function uploadVoiceReference (req, res) {
  const meta = recordingSession(req, res)
  if (!meta) { return }

  const form = formidable({ maxFileSize: store.MAX_VOICE_REFERENCE_BYTES })
  let files
  try {
    ;[, files] = await parseForm(form, req)
  } catch (err) {
    console.error('[meeting-segments] clip parse failed:', err.message)
    return sendError(res, 400, 'PARSE_ERROR', 'The voice clip could not be read')
  }

  const uploaded = files.clip ? first(files.clip) : null
  if (!uploaded) { return sendError(res, 400, 'NO_CLIP', 'A file field named "clip" is required') }

  // "audio/webm;codecs=opus" from the browser is audio/webm; anything off the list is refused.
  const mime = String(uploaded.mimetype || '').split(';')[0].trim().toLowerCase()
  try {
    if (!REFERENCE_MIME_TYPES.includes(mime)) {
      return sendError(res, 400, 'CLIP_TYPE', 'The voice clip is not an audio type this app accepts')
    }
    const result = store.writeVoiceReference(meta.meetingId, fs.readFileSync(uploaded.filepath), mime)
    res.send(201, { stored: true, bytes: result.bytes })
  } catch (err) {
    console.error('[meeting-segments] clip rejected:', err.message)
    return sendError(res, 400, 'CLIP_REJECTED', 'The voice clip could not be saved')
  } finally {
    if (uploaded.filepath) { fs.unlink(uploaded.filepath, () => {}) }
  }
}

/**
 * POST /api/meeting/recordings/:meetingId/segments  (advisor)
 *
 * The advisor pressed "Record this section" on a concept card, or a segment reached 25
 * minutes or 20 MB and the browser rolled it over as "part 2". Closes the live segment — which
 * starts its transcription — and opens the next.
 *
 * @route POST /api/meeting/recordings/:meetingId/segments
 * @param {object} req.body - `{ conceptId?: string, label: string }`
 * @returns {{segment: number, rollBytes: number, maxBytes: number, segments: Array<object>}}
 */
async function openNextSegment (req, res) {
  const meta = recordingSession(req, res)
  if (!meta) { return }
  const body = req.body || {}
  const label = typeof body.label === 'string' ? body.label.trim() : ''
  if (!label) { return sendError(res, 400, 'NO_LABEL', 'A segment needs the name of its concept') }
  // The label decides which words may reach a model: Wordsmith sends only the Alignment
  // Statements segment (CLAUDE.md's privacy exception). An unchecked name from the browser
  // would make that rule the browser's to keep. A card sends a concept's id or, for a
  // framework card, the framework's; none means the framing and agenda section. An imported
  // concept counts only where this meeting's own firm can see it (item 15.20).
  const conceptId = body.conceptId === undefined || body.conceptId === null ? null : body.conceptId
  if (conceptId !== null && !(typeof conceptId === 'string' && (frameworks.getConcept(conceptId) || frameworks.getFramework(conceptId)))) {
    let record = null
    try { record = await importedConcepts.findVisible(meta.firmId, conceptId) } catch (err) {
      console.error('[meeting-segments] imported concept could not be read:', err.message)
    }
    if (!record) {
      return sendError(res, 400, 'UNKNOWN_CONCEPT', 'That section is not part of the Strategy Planner')
    }
  }

  try {
    closeLiveSegment(meta.meetingId)
    const opened = store.openSegment(meta.meetingId, { conceptId, label })
    res.send(201, {
      segment: opened.n,
      rollBytes: store.SEGMENT_ROLL_BYTES,
      maxBytes: store.SEGMENT_MAX_BYTES,
      segments: publicSegments(opened.meta)
    })
  } catch (err) {
    console.error('[meeting-segments] open failed:', err.message)
    return sendError(res, 409, 'SEGMENT_REFUSED', 'The next section could not be started')
  }
}

/**
 * POST /api/meeting/recordings/:meetingId/segments/close  (advisor)
 *
 * Close the live segment without opening another — a break. Nothing records over lunch.
 *
 * @route POST /api/meeting/recordings/:meetingId/segments/close
 * @returns {{closed: (number|null), segments: Array<object>}}
 */
function closeSegment (req, res) {
  const meta = recordingSession(req, res)
  if (!meta) { return }
  try {
    const closed = closeLiveSegment(meta.meetingId)
    res.send(200, { closed: closed ? closed.n : null, segments: publicSegments(store.readMeta(meta.meetingId)) })
  } catch (err) {
    console.error('[meeting-segments] close failed:', err.message)
    return sendError(res, 500, 'MEETING_ERROR', 'Could not close that section')
  }
}

/**
 * POST /api/meeting/recordings/:meetingId/segments/:n/chunk  (advisor)
 *
 * One captured piece of the live segment.
 *
 * ⚠ A FULL SEGMENT ANSWERS 409 SEGMENT_FULL, NOT A GENERIC 400, so the browser knows to roll
 * over to "part 2" rather than report a broken recording.
 *
 * @route POST /api/meeting/recordings/:meetingId/segments/:n/chunk
 * @param {object} req - multipart: field `seq`, file `chunk`
 * @returns {{stored: true, segmentBytes: number, bytes: number, rollOver: boolean}}
 */
async function uploadSegmentChunk (req, res) {
  const meta = recordingSession(req, res)
  if (!meta) { return }
  const n = parseInt(req.params.n, 10)

  const form = formidable({ maxFileSize: store.MAX_CHUNK_BYTES })
  let fields, files
  try {
    ;[fields, files] = await parseForm(form, req)
  } catch (err) {
    console.error('[meeting-segments] chunk parse failed:', err.message)
    return sendError(res, 400, 'PARSE_ERROR', 'That piece of the recording could not be read')
  }

  const seq = parseInt(first(fields.seq), 10)
  const uploaded = files.chunk ? first(files.chunk) : null
  if (!uploaded) { return sendError(res, 400, 'NO_CHUNK', 'A file field named "chunk" is required') }

  try {
    const result = store.appendSegmentChunk(meta.meetingId, n, seq, fs.readFileSync(uploaded.filepath))
    res.send(201, { stored: true, ...result })
  } catch (err) {
    console.error('[meeting-segments] chunk rejected:', err.message)
    if (/segment is full/.test(err.message)) {
      return sendError(res, 409, 'SEGMENT_FULL', 'This section is full. Recording carries on in the next part.')
    }
    return sendError(res, 400, 'CHUNK_REJECTED', 'That piece of the recording could not be saved')
  } finally {
    if (uploaded.filepath) { fs.unlink(uploaded.filepath, () => {}) }
  }
}

/** A section's pauses past this are a fault, not a quiet room. */
const MAX_PAUSES = 100

/**
 * POST /api/meeting/recordings/:meetingId/segments/:n/pauses  (advisor)
 *
 * One finished pause: where it fell in the section's RECORDED audio and how long it lasted, so
 * the paused minutes can be added back to every later word's time (screen 11, Decision L).
 *
 * @route POST /api/meeting/recordings/:meetingId/segments/:n/pauses
 * @param {object} req.body - `{ at: number, duration: number }`, both seconds
 * @returns {{recorded: true, pauses: number}}
 */
function recordPause (req, res) {
  const meta = ownedMeeting(req, res)
  if (!meta) { return }
  if (!meta.segmented) { return sendError(res, 409, 'NOT_SEGMENTED', 'This recording is not a strategy session.') }
  const n = parseInt(req.params.n, 10)
  const seg = (meta.segments || []).filter(s => s.n === n)[0]
  // Only a section whose words have not come back yet can still have its times corrected.
  if (!seg || !['recording', 'closed'].includes(seg.state)) {
    return sendError(res, 409, 'SEGMENT_SETTLED', 'That section can no longer take a pause.')
  }
  const body = req.body || {}
  const at = Number(body.at)
  const duration = Number(body.duration)
  if (!isFinite(at) || !isFinite(duration) || at < 0 || duration <= 0 || duration > 24 * 60 * 60) {
    return sendError(res, 400, 'BAD_PAUSE', 'A pause needs where it fell and how long it lasted, in seconds')
  }
  const pauses = (seg.pauses || []).slice(0, MAX_PAUSES - 1).concat([{ at, duration }])
  try {
    store.updateSegment(meta.meetingId, n, { pauses })
    res.send(201, { recorded: true, pauses: pauses.length })
  } catch (err) {
    console.error('[meeting-segments] pause not recorded:', err.message)
    return sendError(res, 500, 'MEETING_ERROR', 'Could not record that pause')
  }
}

/**
 * "End recording" on a strategy session — the segmented half of
 * `meetingReview.finishRecording`, which hands over here.
 *
 * @param {object} meta - the owned meeting
 * @param {object} res
 */
function finishSegmented (meta, res) {
  if (!meta.consentConfirmedAt) {
    return sendError(res, 409, 'CONSENT_NOT_CONFIRMED',
      'This recording has no confirmed consent, so it cannot be transcribed. Confirm that everyone agreed, or stop and delete it.')
  }
  if (meta.state !== 'recording') {
    return res.send(202, { started: true, meetingId: meta.meetingId })
  }
  if (!(meta.segments || []).some(s => (s.chunkCount || 0) > 0)) {
    return sendError(res, 409, 'NOTHING_CAPTURED', 'Nothing was captured, so there is nothing to transcribe.')
  }

  try {
    closeLiveSegment(meta.meetingId)
    store.updateMeta(meta.meetingId, { state: 'finishing', finishedAt: new Date().toISOString() })
    startPending(meta.meetingId)
    settle(meta.meetingId)
    res.send(202, { started: true, meetingId: meta.meetingId })
  } catch (err) {
    console.error('[meeting-segments] finish failed:', err.message)
    return sendError(res, 500, 'MEETING_ERROR', 'Could not finish the recording')
  }
}

// ── Concept summaries (slice 2, screen 10) ──────────────────────────────────────────

/**
 * The owned, segmented meeting and one of its transcribed segments — or an error already sent.
 * Unlike the recording routes, these work after the recording has finished: an advisor may
 * finish approving summaries after the client has left.
 */
function transcribedSegment (req, res) {
  const meta = ownedMeeting(req, res)
  if (!meta) { return null }
  if (!meta.segmented) {
    sendError(res, 409, 'NOT_SEGMENTED', 'This recording is not a strategy session.')
    return null
  }
  const n = parseInt(req.params.n, 10)
  const seg = (meta.segments || []).filter(s => s.n === n)[0]
  if (!seg || seg.state !== 'done') {
    sendError(res, 404, 'NO_SEGMENT', 'That section has not been turned into text.')
    return null
  }
  return { meta, seg, n }
}

/**
 * GET /api/meeting/recordings/:meetingId/segments/:n/summary  (advisor)
 *
 * One concept's summary, and where writing it has got to.
 *
 * @route GET /api/meeting/recordings/:meetingId/segments/:n/summary
 * @returns {{state: (string|null), summary: (object|null), sections: Array<object>}}
 */
function getSegmentSummary (req, res) {
  const found = transcribedSegment(req, res)
  if (!found) { return }
  const summary = store.readSegmentSummary(found.meta.meetingId, found.n)
  res.send(200, {
    state: found.seg.summaryState || null,
    summary,
    // What the screen shows: the edited words if the advisor and client changed them.
    sections: conceptSummary.currentSections(summary)
  })
}

/**
 * PUT /api/meeting/recordings/:meetingId/segments/:n/summary  (advisor)
 *
 * The advisor's and client's edit. The words under each heading change; the headings do not.
 *
 * ⚠ AN EDIT CLEARS ANY EXISTING APPROVAL, as Meeting Review's own summary does: words approved
 * and then changed must never still read as approved.
 *
 * @route PUT /api/meeting/recordings/:meetingId/segments/:n/summary
 * @param {object} req.body - `{ sections: [{heading, text}] }`
 * @returns {{saved: true, sections: Array<object>}}
 */
function saveSegmentSummary (req, res) {
  const found = transcribedSegment(req, res)
  if (!found) { return }
  const summary = store.readSegmentSummary(found.meta.meetingId, found.n)
  if (!summary) { return sendError(res, 404, 'NO_SUMMARY', 'This section has no summary yet.') }

  const headings = (summary.sections || []).map(s => s.heading)
  const checked = conceptSummary.validateEdit((req.body || {}).sections, headings)
  if (!checked.ok) { return sendError(res, 400, 'BAD_EDIT', checked.error) }

  try {
    store.writeSegmentSummary(found.meta.meetingId, found.n, {
      ...summary,
      editedSections: checked.sections,
      editedAt: new Date().toISOString(),
      approvedAt: null,
      clientAgreed: false
    })
    store.updateSegment(found.meta.meetingId, found.n, { summaryApprovedAt: null })
    res.send(200, { saved: true, sections: checked.sections })
  } catch (err) {
    console.error('[meeting-segments] summary edit failed:', err.message)
    return sendError(res, 500, 'MEETING_ERROR', 'Could not save that summary')
  }
}

/**
 * POST /api/meeting/recordings/:meetingId/segments/:n/summary/approve  (advisor)
 *
 * The advisor approves one concept's summary, confirming the client has read and agrees with it.
 *
 * 🔴 THE CLIENT'S AGREEMENT IS REQUIRED, NOT ASSUMED. The screen's tick — *"The client has read
 * this summary and agrees with it"* (approved 2026-09-28) — arrives as `clientAgreed: true`, and
 * nothing else approves. This app has no client login, so this is the advisor's confirmation that
 * the client agreed, in the same way the consent tick is.
 *
 * @route POST /api/meeting/recordings/:meetingId/segments/:n/summary/approve
 * @param {object} req.body - `{ clientAgreed: true }`
 * @returns {{approved: true, at: string}}
 */
function approveSegmentSummary (req, res) {
  const found = transcribedSegment(req, res)
  if (!found) { return }
  if ((req.body || {}).clientAgreed !== true) {
    return sendError(res, 400, 'CLIENT_NOT_AGREED', 'Tick that the client has read and agrees with this summary first.')
  }
  const summary = store.readSegmentSummary(found.meta.meetingId, found.n)
  if (!summary) { return sendError(res, 404, 'NO_SUMMARY', 'This section has no summary yet.') }

  try {
    const at = new Date().toISOString()
    store.writeSegmentSummary(found.meta.meetingId, found.n, { ...summary, approvedAt: at, clientAgreed: true })
    store.updateSegment(found.meta.meetingId, found.n, { summaryApprovedAt: at })
    res.send(200, { approved: true, at })
  } catch (err) {
    console.error('[meeting-segments] summary approval failed:', err.message)
    return sendError(res, 500, 'MEETING_ERROR', 'Could not approve that summary')
  }
}

/**
 * POST /api/meeting/recordings/:meetingId/segments/:n/summary  (advisor)
 *
 * Write the summary again — when the first attempt failed, or the draft missed the point. Refused
 * once approved: the client has agreed to those words.
 *
 * @route POST /api/meeting/recordings/:meetingId/segments/:n/summary
 * @returns {{started: true}}
 */
function regenerateSegmentSummary (req, res) {
  const found = transcribedSegment(req, res)
  if (!found) { return }
  const existing = store.readSegmentSummary(found.meta.meetingId, found.n)
  if (existing && existing.approvedAt) {
    return sendError(res, 409, 'SUMMARY_APPROVED', 'This summary is approved. Edit it instead.')
  }
  runSegmentSummary(found.meta.meetingId, found.n)
  res.send(202, { started: true })
}

/** See `meetingReview.mountable`: Restify asserts a synchronous handler takes `next`. */
function mountable (fn) {
  return function (req, res, next) {
    fn(req, res)
    if (typeof next === 'function') { next() }
  }
}

module.exports = {
  uploadVoiceReference,
  uploadSegmentChunk,
  // Async since item 15.20 (it may read the firm's imported concepts), so it is mounted as the
  // uploads above are — `mountable` would answer before the handler had.
  openNextSegment,
  closeSegment: mountable(closeSegment),
  recordPause: mountable(recordPause),
  getSegmentSummary: mountable(getSegmentSummary),
  saveSegmentSummary: mountable(saveSegmentSummary),
  approveSegmentSummary: mountable(approveSegmentSummary),
  regenerateSegmentSummary: mountable(regenerateSegmentSummary),
  runSegmentSummary,
  summaryJobs,
  finishSegmented,
  startPending,
  closeLiveSegment,
  runSegmentTranscription,
  settle,
  segmentJobs
}
