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
const { allSettled, joinTranscripts, publicSegments } = require('../utils/meetingSegments')

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

    store.writeSegmentTranscript(meetingId, n, {
      model: result.model,
      createdAt: new Date().toISOString(),
      segments: result.segments,
      text: result.text,
      droppedSegments: result.dropped,
      speakerCount: result.speakerCount,
      attributionConfident: confident
    })
    store.updateSegment(meetingId, n, { state: 'done', attributionConfident: confident })
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
    const transcribedAny = joined.segments.length > 0
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
function openNextSegment (req, res) {
  const meta = recordingSession(req, res)
  if (!meta) { return }
  const body = req.body || {}
  const label = typeof body.label === 'string' ? body.label.trim() : ''
  if (!label) { return sendError(res, 400, 'NO_LABEL', 'A segment needs the name of its concept') }

  try {
    closeLiveSegment(meta.meetingId)
    const opened = store.openSegment(meta.meetingId, { conceptId: body.conceptId, label })
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
  openNextSegment: mountable(openNextSegment),
  closeSegment: mountable(closeSegment),
  finishSegmented,
  startPending,
  closeLiveSegment,
  runSegmentTranscription,
  settle,
  segmentJobs
}
