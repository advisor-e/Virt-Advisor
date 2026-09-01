'use strict'

/**
 * Meeting Review — the retention dial, consent, capture, transcription and deletion.
 * Restify routes, slice 2.
 *
 * Asked for by Mike 2026-09-01 (*"build the meeting review feature"*, then *"4.56 - slice
 * 2"*). Design `design/features/meeting-review.md`; wording artefact
 * `design/MEETING-CONSENT-WORDING.md`; screens `design/mockups/meeting-review.html`
 * Stage B2–B4, approved 2026-09-01.
 *
 * 🔴 THE ORDER OF THIS FLOW IS THE FEATURE, NOT AN IMPLEMENTATION DETAIL.
 * **Record → speak → confirm.** A meeting is created and chunks start arriving BEFORE
 * consent is confirmed, because the consent has to be captured INSIDE the audio — that is
 * P1, and it is the correction Mike caught while checking the flow back
 * (`MEETING-CONSENT-WORDING.md` §3). A route order that took the tick first would put the
 * client's agreement outside the recording and quietly defeat the whole design, while every
 * screen still looked right.
 *
 * 🔴 AND IT IS WHY `finish` REFUSES A MEETING WITH NO CONFIRMED CONSENT. The tick records
 * that the advisor claims consent; the audio records that it was given. Transcribing without
 * the first would produce a transcript nobody ever said was allowed.
 *
 * 🔴 EVERY RECORDING ROUTE CHECKS BOTH THE FIRM AND THE ADVISOR. Brief P2 gives the
 * advisor's own material to the advisor: a colleague at the same firm is as much a stranger
 * to this recording as another firm is, so `req.firmId` alone is not the guard here — unlike
 * the observation points, which are firm-wide by design.
 *
 * ⚠ WHERE THE TRANSCRIPT LIVES, AND WHY IT IS A FILE. It sits beside the meeting record in
 * the same directory the audio occupied, under `MEETING_AUDIO_DIR`. No table was added to
 * `config/db-schema.sql` because a schema change was not asked for and is not needed to make
 * this slice honest — and keeping the transcript in the one place the audio was is what makes
 * "stop and delete" a single provable act rather than two systems that must agree. The
 * retention purge that will sweep these on their clock is deliberately NOT in this slice
 * (Mike's ruling, 2026-09-01): destroying the AUDIO once it is text is the promise the
 * consent line makes and it is here; expiring the TRANSCRIPT is its own piece of work.
 *
 * Node 14, CommonJS.
 */

const fs = require('fs')
const path = require('path')
const { formidable } = require('formidable')
const overlay = require('../utils/firmOverlay')
const { sendError } = require('../utils/sendError')
const { devFallbackAllowed } = require('../utils/dbFailure')
const store = require('../utils/meetingAudioStore')
const {
  CONFIG_KEY: RETENTION_KEY,
  DEV_FILE: RETENTION_DEV_FILE,
  PLATFORM_DEFAULT_MONTHS,
  MIN_MONTHS,
  MAX_MONTHS,
  validateRetentionMonths,
  loadOwnRetention,
  loadResolvedRetention,
  retentionPhrase
} = require('../utils/meetingRetention')
const {
  DIARIZING_MODEL,
  createTranscriptionClient
} = require('../utils/transcriptionClient')
const obs = require('../utils/meetingObservations')
const { computeMetrics } = require('../utils/meetingMetrics')
const { generateSummary, generateCoachingNotes } = require('../utils/meetingReports')

// formidable v2's parse() is callback-style, matching the wrapper in firmManager.js. The
// same pinned 2.1.2 — see that file's note on why the version is held there.
function parseForm (form, req) {
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) { reject(err); return }
      resolve([fields, files])
    })
  })
}

/** 500 with the fault logged server-side and nothing internal returned. */
function serverError (res, err, what) {
  console.error('[meeting-review] ' + what + ':', err.message)
  return sendError(res, 500, 'MEETING_ERROR', 'Could not ' + what)
}

// ── The retention dial ───────────────────────────────────────────────────────────────

function devReadAll () {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), RETENTION_DEV_FILE), 'utf8'))
  } catch (_e) { return {} }
}

function devWrite (scopeId, value) {
  const all = devReadAll()
  if (value === null) { delete all[scopeId] } else { all[scopeId] = value }
  fs.writeFileSync(path.resolve(process.cwd(), RETENTION_DEV_FILE), JSON.stringify(all, null, 2))
}

/**
 * The overlay reader the cascade walks with, falling back to the dev file so the tier chain
 * behaves the same way with and without a database.
 *
 * ⚠ The fallback is refused when a live server REFUSED the statement (`dbFailure`), so a
 * rejected read can never answer with the platform default dressed up as a firm's choice.
 */
async function readScopeConfig (scopeId, key) {
  try {
    return await overlay.loadFirmConfig(scopeId, key)
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    if (key !== RETENTION_KEY) { throw err }
    const all = devReadAll()
    return Object.prototype.hasOwnProperty.call(all, scopeId) ? all[scopeId] : null
  }
}

async function writeScopeConfig (scopeId, value, savedBy) {
  try {
    await overlay.saveFirmConfig(scopeId, RETENTION_KEY, value, savedBy)
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    devWrite(scopeId, value)
  }
}

/**
 * GET /api/firm-manager/meeting-retention  (manager)
 *
 * What this scope keeps transcripts for, what it set itself, and the range it may choose.
 *
 * @route GET /api/firm-manager/meeting-retention
 * @returns {{resolved: object, ownMonths: (number|null), platformDefault: number,
 *   min: number, max: number, phrase: string}}
 */
async function getRetention (req, res) {
  try {
    const resolved = await loadResolvedRetention(req.firmId, readScopeConfig)
    const ownMonths = await loadOwnRetention(req.firmId, readScopeConfig)
    res.send(200, {
      resolved,
      ownMonths,
      platformDefault: PLATFORM_DEFAULT_MONTHS,
      min: MIN_MONTHS,
      max: MAX_MONTHS,
      phrase: retentionPhrase(resolved.months)
    })
  } catch (err) {
    return serverError(res, err, 'read the retention period')
  }
}

/**
 * PUT /api/firm-manager/meeting-retention  (manager)
 *
 * ⚠ THIS CHANGES WHAT ADVISORS SAY OUT LOUD TO CLIENTS. The approved consent line quotes the
 * figure back, so a save here alters a sentence spoken in a real meeting tomorrow. That is
 * exactly why the value is validated to a whole number inside a sane range rather than stored
 * as typed — see `validateRetentionMonths`.
 *
 * @route PUT /api/firm-manager/meeting-retention
 * @param {object} req.body - `{ months: number }`
 * @returns {{saved: true, months: number, phrase: string}}
 */
async function setRetention (req, res) {
  const checked = validateRetentionMonths((req.body || {}).months)
  if (!checked.ok) {
    return sendError(res, 400, 'INVALID_RETENTION', checked.errors.join('; '))
  }
  try {
    await writeScopeConfig(req.firmId, { months: checked.value }, req.userEmail)
    res.send(200, {
      saved: true,
      months: checked.value,
      phrase: retentionPhrase(checked.value)
    })
  } catch (err) {
    return serverError(res, err, 'save the retention period')
  }
}

/**
 * DELETE /api/firm-manager/meeting-retention  (manager)
 *
 * Drop this scope's figure so the level above applies again — and keeps applying as that
 * level changes it. Idempotent.
 *
 * @route DELETE /api/firm-manager/meeting-retention
 * @returns {{reset: true, resolved: object}}
 */
async function resetRetention (req, res) {
  try {
    await writeScopeConfig(req.firmId, null, req.userEmail)
    const resolved = await loadResolvedRetention(req.firmId, readScopeConfig)
    res.send(200, { reset: true, resolved, phrase: retentionPhrase(resolved.months) })
  } catch (err) {
    return serverError(res, err, 'reset the retention period')
  }
}

// ── The advisor's consent screen ─────────────────────────────────────────────────────

/**
 * GET /api/meeting/consent  (any signed-in advisor)
 *
 * The one value the fixed consent wording needs.
 *
 * 🔴 THE WORDS THEMSELVES ARE NOT SERVED FROM HERE. They are a locale string, because they
 * must be translated per market by someone competent in the local law
 * (`MEETING-CONSENT-WORDING.md` §5) — not assembled on a server. This route supplies the
 * retention figure and nothing else, which is the only part that varies.
 *
 * @route GET /api/meeting/consent
 * @returns {{retentionMonths: number, retentionPhrase: string, source: string}}
 */
async function getConsentContext (req, res) {
  try {
    const resolved = await loadResolvedRetention(req.firmId, readScopeConfig)
    res.send(200, {
      retentionMonths: resolved.months,
      retentionPhrase: retentionPhrase(resolved.months),
      source: resolved.source
    })
  } catch (err) {
    return serverError(res, err, 'read the retention period')
  }
}

// ── Recording ────────────────────────────────────────────────────────────────────────

/**
 * Transcription jobs in flight, keyed by meeting id.
 *
 * In-process on purpose: the audio is on THIS server's disk (Mike's ruling), so the job that
 * reads it belongs to the same process. A shared queue would imply shared storage, which is
 * the design this feature deliberately does not have.
 * @type {Map<string, {state: string, startedAt: number, error: (string|null)}>}
 */
const jobs = new Map()

/** The meeting, once ownership is proven — or an error already sent. */
function ownedMeeting (req, res) {
  let meta
  try {
    meta = store.readMeta(String(req.params.meetingId || ''))
  } catch (_e) {
    // A malformed id never reaches the filesystem — see `_meetingDir`. Answering 404 rather
    // than 400 also declines to tell a prober which ids are well-formed.
    sendError(res, 404, 'NOT_FOUND', 'No such meeting')
    return null
  }
  if (!store.isOwnedBy(meta, req.firmId, req.advisorId)) {
    sendError(res, 404, 'NOT_FOUND', 'No such meeting')
    return null
  }
  return meta
}

/**
 * POST /api/meeting/recordings  (advisor)
 *
 * Start a meeting. Called when the advisor presses "Start recording" on consent step one —
 * BEFORE they speak the consent line, because the line has to land inside the audio.
 *
 * @route POST /api/meeting/recordings
 * @param {object} req.body - `{ scenarioId?: string }`
 * @returns {{meetingId: string, retentionMonths: number, retentionPhrase: string}}
 */
async function startRecording (req, res) {
  try {
    const resolved = await loadResolvedRetention(req.firmId, readScopeConfig)
    const { meetingId, meta } = store.createMeeting({
      firmId: req.firmId,
      advisor: req.advisorId,
      scenarioId: (req.body || {}).scenarioId || null,
      retentionMonths: resolved.months
    })
    res.send(201, {
      meetingId,
      retentionMonths: meta.retentionMonths,
      retentionPhrase: retentionPhrase(meta.retentionMonths)
    })
  } catch (err) {
    return serverError(res, err, 'start the recording')
  }
}

/**
 * POST /api/meeting/recordings/:meetingId/consent  (advisor)
 *
 * Consent step two's "Yes — continue": the advisor's undertaking that everyone present
 * agreed, recorded AFTER the words were spoken into the running recording.
 *
 * ⚠ "No — stop and delete" is NOT this route. It is the DELETE below, because refusing
 * consent destroys the recording rather than recording a refusal — `MEETING-CONSENT-WORDING.md`
 * §4. Two outcomes, two verbs, and no way for a mis-set boolean to keep audio a client
 * asked to end.
 *
 * @route POST /api/meeting/recordings/:meetingId/consent
 * @returns {{confirmed: true, at: string}}
 */
function confirmConsent (req, res) {
  const meta = ownedMeeting(req, res)
  if (!meta) { return }
  try {
    const at = new Date().toISOString()
    store.updateMeta(meta.meetingId, { consentConfirmedAt: at })
    res.send(200, { confirmed: true, at })
  } catch (err) {
    return serverError(res, err, 'record that confirmation')
  }
}

/**
 * POST /api/meeting/recordings/:meetingId/chunk  (advisor)
 *
 * One captured piece of audio. P10: the recording streams continuously so a crash costs
 * seconds rather than the meeting.
 *
 * @route POST /api/meeting/recordings/:meetingId/chunk
 * @param {object} req - multipart: field `seq`, file `chunk`
 * @returns {{stored: true, chunkCount: number, bytes: number}}
 */
async function uploadChunk (req, res) {
  const meta = ownedMeeting(req, res)
  if (!meta) { return }

  const form = formidable({ maxFileSize: store.MAX_CHUNK_BYTES })
  let fields, files
  try {
    ;[fields, files] = await parseForm(form, req)
  } catch (err) {
    console.error('[meeting-review] chunk parse failed:', err.message)
    return sendError(res, 400, 'PARSE_ERROR', 'That piece of the recording could not be read')
  }

  const rawSeq = Array.isArray(fields.seq) ? fields.seq[0] : fields.seq
  const seq = parseInt(rawSeq, 10)
  const uploaded = files.chunk
    ? (Array.isArray(files.chunk) ? files.chunk[0] : files.chunk)
    : null

  if (!uploaded) { return sendError(res, 400, 'NO_CHUNK', 'A file field named "chunk" is required') }

  try {
    const buffer = fs.readFileSync(uploaded.filepath)
    const result = store.appendChunk(meta.meetingId, seq, buffer)
    res.send(201, { stored: true, ...result })
  } catch (err) {
    console.error('[meeting-review] chunk rejected:', err.message)
    return sendError(res, 400, 'CHUNK_REJECTED', 'That piece of the recording could not be saved')
  } finally {
    if (uploaded && uploaded.filepath) { fs.unlink(uploaded.filepath, () => {}) }
  }
}

/**
 * Assemble, transcribe, and destroy the audio. The job behind `finish`.
 *
 * 🔴 THE AUDIO IS DESTROYED IN A `finally`, SO IT GOES WHETHER OR NOT TRANSCRIPTION
 * SUCCEEDED. P8 is a promise about the recording, not a reward for a clean run — and a
 * failed transcription that left an hour of a client's meeting on disk is precisely the
 * lingering the Brief calls a design failure. A failure is reported to the advisor with the
 * audio already gone, which is the honest trade: they lose the recording, not the client's
 * privacy.
 *
 * @param {string} meetingId
 * @returns {Promise<void>}
 */
async function runTranscription (meetingId) {
  jobs.set(meetingId, { state: 'transcribing', startedAt: Date.now(), error: null })

  let audio = null
  try {
    const assembled = store.assemble(meetingId)
    audio = store.readAssembled(meetingId)

    const client = createTranscriptionClient({ apiKey: process.env.OPENAI_API_KEY })
    const result = await client.transcribe({ buffer: audio })

    // Every LLM call logs model, size, latency and result (CLAUDE.md). No transcript text and
    // no client words are logged — the log is not a place a meeting gets a second home.
    console.log('[meeting-review] transcribed: model=' + result.model +
      ' bytes=' + result.bytes + ' latencyMs=' + result.latencyMs +
      ' segments=' + result.segments.length + ' dropped=' + result.dropped +
      ' speakers=' + result.speakerCount + ' confident=' + result.confident)

    store.writeTranscript(meetingId, {
      meetingId,
      model: result.model,
      createdAt: new Date().toISOString(),
      sourceBytes: assembled.bytes,
      chunkCount: assembled.chunkCount,
      segments: result.segments,
      text: result.text,
      droppedSegments: result.dropped,
      speakerCount: result.speakerCount,
      // Carried onto the screen rather than hidden: §5 trap 1 says degraded attribution must
      // fail visibly, never blur into confident-looking prose.
      attributionConfident: result.confident
    })

    store.updateMeta(meetingId, { state: 'transcribed', transcribedAt: new Date().toISOString() })
    jobs.set(meetingId, { state: 'done', startedAt: Date.now(), error: null })
  } catch (err) {
    console.error('[meeting-review] transcription failed:', err.message)
    store.updateMeta(meetingId, { state: 'failed', failedReason: 'transcription' })
    jobs.set(meetingId, { state: 'failed', startedAt: Date.now(), error: 'transcription failed' })
  } finally {
    try {
      const proof = store.destroyAudio(meetingId)
      console.log('[meeting-review] audio destroyed: meeting=' + meetingId +
        ' files=' + proof.removed + ' bytes=' + proof.bytesRemoved +
        ' remains=' + proof.audioRemains)
      if (proof.audioRemains) {
        // Trap 4: a deletion that failed must surface. It is logged as an error and written
        // onto the meeting record, so the next read of that meeting says so too.
        console.error('[meeting-review] AUDIO STILL PRESENT after deletion: ' + meetingId)
        store.updateMeta(meetingId, { audioDeletionFailed: true })
      } else {
        store.updateMeta(meetingId, { audioDeletedAt: new Date().toISOString() })
      }
    } catch (delErr) {
      console.error('[meeting-review] audio deletion errored:', delErr.message)
    }
  }
}

/**
 * POST /api/meeting/recordings/:meetingId/finish  (advisor)
 *
 * Ends capture and starts the single whole-recording transcription pass. Returns immediately
 * with a job to poll: transcribing an hour of audio is far past the 2000 ms page-render rule
 * in `CLAUDE.md`, which is why §5 says both long operations return a job id.
 *
 * @route POST /api/meeting/recordings/:meetingId/finish
 * @returns {{started: true, meetingId: string}}
 */
function finishRecording (req, res) {
  const meta = ownedMeeting(req, res)
  if (!meta) { return }

  if (!meta.consentConfirmedAt) {
    return sendError(res, 409, 'CONSENT_NOT_CONFIRMED',
      'This recording has no confirmed consent, so it cannot be transcribed. Confirm that everyone agreed, or stop and delete it.')
  }
  if (!store.listChunks(meta.meetingId).length) {
    return sendError(res, 409, 'NOTHING_CAPTURED',
      'Nothing was captured, so there is nothing to transcribe.')
  }

  const existing = jobs.get(meta.meetingId)
  if (existing && existing.state === 'transcribing') {
    return res.send(202, { started: true, meetingId: meta.meetingId })
  }

  // Deliberately not awaited: the reply goes back now and the advisor polls. An unhandled
  // rejection here would take the process down, so the job swallows its own errors and
  // records them on the meeting instead.
  runTranscription(meta.meetingId)
  res.send(202, { started: true, meetingId: meta.meetingId })
}

/**
 * GET /api/meeting/recordings/:meetingId  (advisor)
 *
 * Where this meeting has got to. What the recorder polls after `finish`.
 *
 * ⚠ IT RETURNS NO TRANSCRIPT TEXT. Slice 2 turns audio into text and destroys the audio;
 * reading a transcript back is the reports' job, and those are a later slice. A route that
 * handed the words out now would be the first half of a feature nobody has approved the
 * second half of.
 *
 * @route GET /api/meeting/recordings/:meetingId
 * @returns {{meetingId: string, state: string, chunkCount: number, bytes: number,
 *   consentConfirmed: boolean, hasTranscript: boolean, attributionConfident: (boolean|null),
 *   audioDeleted: boolean, audioDeletionFailed: boolean}}
 */
function getRecording (req, res) {
  const meta = ownedMeeting(req, res)
  if (!meta) { return }

  const transcript = store.readTranscript(meta.meetingId)
  const job = jobs.get(meta.meetingId)

  res.send(200, {
    meetingId: meta.meetingId,
    state: job ? job.state : meta.state,
    error: job ? job.error : null,
    chunkCount: meta.chunkCount || 0,
    bytes: meta.bytes || 0,
    consentConfirmed: Boolean(meta.consentConfirmedAt),
    retentionMonths: meta.retentionMonths,
    hasTranscript: Boolean(transcript),
    attributionConfident: transcript ? transcript.attributionConfident : null,
    audioDeleted: Boolean(meta.audioDeletedAt),
    audioDeletionFailed: Boolean(meta.audioDeletionFailed)
  })
}

/**
 * DELETE /api/meeting/recordings/:meetingId  (advisor)
 *
 * "Stop and delete" — available for the whole recording, not only at consent step two
 * (`MEETING-CONSENT-WORDING.md` §3). It answers a client who says *"actually, can you turn
 * that off?"*, and a client who declines at the start.
 *
 * 🔴 IT TAKES THE TRANSCRIPT TOO. §4 of the wording page: a meeting the client withdrew
 * consent to must not survive as text because the chunks happened to be transcribed early.
 *
 * @route DELETE /api/meeting/recordings/:meetingId
 * @returns {{deleted: true, filesRemoved: number, bytesRemoved: number}}
 */
function deleteRecording (req, res) {
  const meta = ownedMeeting(req, res)
  if (!meta) { return }

  try {
    const proof = store.destroyMeeting(meta.meetingId)
    jobs.delete(meta.meetingId)

    console.log('[meeting-review] meeting destroyed: meeting=' + meta.meetingId +
      ' files=' + proof.removed + ' bytes=' + proof.bytesRemoved +
      ' remains=' + proof.meetingRemains)

    if (proof.meetingRemains) {
      console.error('[meeting-review] MEETING STILL PRESENT after deletion: ' + meta.meetingId)
      return sendError(res, 500, 'DELETE_INCOMPLETE',
        'Some of this recording could not be deleted. It has been reported — do not treat it as gone.')
    }

    res.send(200, {
      deleted: true,
      filesRemoved: proof.removed,
      bytesRemoved: proof.bytesRemoved
    })
  } catch (err) {
    return serverError(res, err, 'delete that recording')
  }
}

// ── The two reports ──────────────────────────────────────────────────────────────────

/**
 * Report generation in flight, keyed by meeting id. Separate from `jobs` above because a
 * meeting can be transcribed once and have its reports regenerated after, and one map would
 * make the second overwrite the record of the first.
 * @type {Map<string, {state: string, startedAt: number, error: (string|null)}>}
 */
const reportJobs = new Map()

/**
 * The advisor's pre-set for this meeting, resolved through the tier cascade.
 *
 * ⚠ The observations reader is borrowed from `meetingObservations.js` rather than rebuilt:
 * the dev-fallback rules for those three config keys live there, and a second copy here would
 * be one more thing to keep in step with them. That module does not require this one, so
 * there is no cycle.
 *
 * @param {object} req
 * @param {string|null} scenarioId
 * @returns {Promise<{points: Array<object>, scenarioName: (string|null)}>}
 */
async function presetFor (req, scenarioId) {
  if (!scenarioId) { return { points: [], scenarioName: null } }
  const observationRoutes = require('./meetingObservations')
  const resolved = await obs.loadResolvedObservations(req.firmId, observationRoutes.readScopeConfig)
  const scenario = resolved && resolved[scenarioId] ? resolved[scenarioId] : null
  if (!scenario) { return { points: [], scenarioName: null } }
  return { points: obs.asAdvisorPreset(scenario), scenarioName: scenario.name || null }
}

/**
 * Generate both reports. The job behind `POST .../reports`.
 *
 * 🔴 TWO CALLS, IN SEQUENCE, AND A FAILURE OF ONE DOES NOT DISCARD THE OTHER. P6 keeps the
 * client's copy and the coaching notes apart so coaching language cannot leak into what a
 * client reads. Storing each as it succeeds means a failed coaching call still leaves the
 * advisor their client summary, and the screen says plainly which one is missing — P11.
 *
 * @param {string} meetingId
 * @param {object} ctx - `{ points, scenarioName }`
 * @returns {Promise<void>}
 */
async function runReports (meetingId, ctx) {
  reportJobs.set(meetingId, { state: 'generating', startedAt: Date.now(), error: null })

  const transcript = store.readTranscript(meetingId)
  const metrics = computeMetrics(transcript)
  const failures = []

  try {
    const summary = await generateSummary({
      transcript,
      scenarioName: ctx.scenarioName,
      apiKey: process.env.OPENAI_API_KEY
    })
    store.writeReport(meetingId, 'summary', summary)
  } catch (err) {
    console.error('[meeting-review] summary generation failed:', err.message)
    failures.push('summary')
  }

  try {
    const coaching = await generateCoachingNotes({
      transcript,
      points: ctx.points,
      metrics,
      apiKey: process.env.OPENAI_API_KEY
    })
    store.writeReport(meetingId, 'coaching', coaching)
  } catch (err) {
    console.error('[meeting-review] coaching generation failed:', err.message)
    failures.push('coaching')
  }

  if (failures.length === 2) {
    reportJobs.set(meetingId, { state: 'failed', startedAt: Date.now(), error: 'both reports failed' })
  } else if (failures.length === 1) {
    reportJobs.set(meetingId, { state: 'partial', startedAt: Date.now(), error: failures[0] + ' failed' })
  } else {
    reportJobs.set(meetingId, { state: 'done', startedAt: Date.now(), error: null })
  }
}

/**
 * POST /api/meeting/recordings/:meetingId/reports  (advisor)
 *
 * Start generating both reports. Returns a job to poll, for the same reason `finish` does:
 * two model calls over an hour of transcript is far past the 2000 ms page-render rule.
 *
 * @route POST /api/meeting/recordings/:meetingId/reports
 * @returns {{started: true, meetingId: string}}
 */
async function generateReports (req, res) {
  const meta = ownedMeeting(req, res)
  if (!meta) { return }

  if (!store.readTranscript(meta.meetingId)) {
    return sendError(res, 409, 'NO_TRANSCRIPT',
      'This meeting has no transcript, so there is nothing to write a report from.')
  }

  const existing = reportJobs.get(meta.meetingId)
  if (existing && existing.state === 'generating') {
    return res.send(202, { started: true, meetingId: meta.meetingId })
  }

  let ctx
  try {
    ctx = await presetFor(req, meta.scenarioId)
  } catch (err) {
    return serverError(res, err, 'read the observation points')
  }

  // Not awaited: the reply goes back now and the advisor polls. The job records its own
  // failures rather than rejecting into the process.
  runReports(meta.meetingId, ctx)
  res.send(202, { started: true, meetingId: meta.meetingId })
}

/**
 * GET /api/meeting/recordings/:meetingId/reports  (advisor)
 *
 * Both reports and where generation has got to.
 *
 * 🔴 P2 IS ENFORCED BY `ownedMeeting`, WHICH CHECKS THE ADVISOR AND NOT ONLY THE FIRM. My
 * Coaching Notes belong to the advisor who made the recording; a colleague at the same firm is
 * as much a stranger to it as another firm is.
 *
 * ⚠ `attributionConfident: false` is passed straight out. §5 trap 1: degraded speaker
 * separation must fail visibly, and the screen says so above the figures that depend on it.
 *
 * @route GET /api/meeting/recordings/:meetingId/reports
 * @returns {{state: string, error: (string|null), summary: (object|null),
 *   coaching: (object|null), attributionConfident: (boolean|null)}}
 */
function getReports (req, res) {
  const meta = ownedMeeting(req, res)
  if (!meta) { return }

  const transcript = store.readTranscript(meta.meetingId)
  const job = reportJobs.get(meta.meetingId)
  const summary = store.readReport(meta.meetingId, 'summary')
  const coaching = store.readReport(meta.meetingId, 'coaching')

  res.send(200, {
    meetingId: meta.meetingId,
    state: job ? job.state : (summary || coaching ? 'done' : 'none'),
    error: job ? job.error : null,
    hasTranscript: Boolean(transcript),
    attributionConfident: transcript ? Boolean(transcript.attributionConfident) : null,
    // 🔴 THE TRANSCRIPT COMES BACK HERE, AND ONLY HERE. `getRecording` deliberately refuses to
    // hand out transcript text; slice 2's note says reading it back is the reports' job. This
    // is that job: Mike's ruling of 2026-09-02 replaced the drawing's "Play this moment" with
    // showing the surrounding lines, because P8 has already destroyed the audio and there is
    // nothing to play. Checking a citation in context is the whole purpose of that control, so
    // the words have to reach the screen. It stays inside the firm (P13) and inside the one
    // advisor (P2) — `ownedMeeting` above is what makes both true.
    transcript: transcript ? { segments: transcript.segments || [] } : null,
    summary,
    coaching
  })
}

/** The stored report, or an error already sent. */
function reportOr404 (req, res, meta, kind) {
  const report = store.readReport(meta.meetingId, kind)
  if (!report) {
    sendError(res, 404, 'NO_REPORT', 'That report has not been generated yet')
    return null
  }
  return report
}

/**
 * PUT /api/meeting/recordings/:meetingId/reports/summary  (advisor)
 *
 * The advisor's edit of the client summary. P7 — the app writes, the advisor publishes.
 *
 * ⚠ AN EDIT CLEARS ANY EXISTING APPROVAL. Approving text and then changing it must not leave
 * the record saying the new words were approved.
 *
 * @route PUT /api/meeting/recordings/:meetingId/reports/summary
 * @param {object} req.body - `{ text: string }`
 * @returns {{saved: true}}
 */
function saveSummaryEdit (req, res) {
  const meta = ownedMeeting(req, res)
  if (!meta) { return }
  const report = reportOr404(req, res, meta, 'summary')
  if (!report) { return }

  const text = (req.body || {}).text
  if (typeof text !== 'string' || text.trim() === '') {
    return sendError(res, 400, 'EMPTY_SUMMARY', 'A summary cannot be saved empty')
  }

  try {
    report.editedText = text
    report.editedAt = new Date().toISOString()
    report.approvedAt = null
    store.writeReport(meta.meetingId, 'summary', report)
    res.send(200, { saved: true })
  } catch (err) {
    return serverError(res, err, 'save that summary')
  }
}

/**
 * POST /api/meeting/recordings/:meetingId/reports/summary/approve  (advisor)
 *
 * The advisor signs the summary off. There is deliberately no send: this application has no
 * mail channel, and adding one would put a named client's financial affairs through a company
 * nobody has assessed — the same argument that kept the audio off Google Drive. Mike's ruling,
 * 2026-09-02: the advisor approves here and sends it from their own email.
 *
 * @route POST /api/meeting/recordings/:meetingId/reports/summary/approve
 * @returns {{approved: true, at: string}}
 */
function approveSummary (req, res) {
  const meta = ownedMeeting(req, res)
  if (!meta) { return }
  const report = reportOr404(req, res, meta, 'summary')
  if (!report) { return }

  try {
    const at = new Date().toISOString()
    report.approvedAt = at
    store.writeReport(meta.meetingId, 'summary', report)
    res.send(200, { approved: true, at })
  } catch (err) {
    return serverError(res, err, 'approve that summary')
  }
}

/**
 * POST /api/meeting/recordings/:meetingId/reports/coaching/dispute  (advisor)
 *
 * 🔴 P5 — THE DISPUTE STAYS IN THE RECORD, AND IT DOES NOT DELETE THE FINDING. This is the
 * line between coaching and surveillance: the advisor can say the software got it wrong, that
 * disagreement is kept beside the finding rather than instead of it, and it is the only honest
 * source of data for improving the observation points themselves.
 *
 * @route POST /api/meeting/recordings/:meetingId/reports/coaching/dispute
 * @param {object} req.body - `{ pointId: string, note?: string }`
 * @returns {{recorded: true}}
 */
function disputeFinding (req, res) {
  const meta = ownedMeeting(req, res)
  if (!meta) { return }
  const report = reportOr404(req, res, meta, 'coaching')
  if (!report) { return }

  const body = req.body || {}
  const pointId = typeof body.pointId === 'string' ? body.pointId.trim() : ''
  const known = (report.findings || []).some(f => f.pointId === pointId)
  if (!pointId || !known) {
    return sendError(res, 400, 'UNKNOWN_POINT', 'That observation is not in this report')
  }

  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 1000) : ''

  try {
    report.disputes = report.disputes || {}
    report.disputes[pointId] = { at: new Date().toISOString(), note }
    store.writeReport(meta.meetingId, 'coaching', report)
    res.send(200, { recorded: true })
  } catch (err) {
    return serverError(res, err, 'record that disagreement')
  }
}

/**
 * POST /api/meeting/recordings/:meetingId/reports/coaching/heard  (advisor)
 *
 * The advisor settles a point a recording cannot hear.
 *
 * 🔴 WHAT IS STORED IS THE ADVISOR'S ANSWER, NEVER THE GUESS. Mike's ruling, 2026-09-01. The
 * hint words may have raised the question; they never answer it, or a maybe hardens into a
 * fact on its way to a manager's figures.
 *
 * @route POST /api/meeting/recordings/:meetingId/reports/coaching/heard
 * @param {object} req.body - `{ pointId: string, answer: boolean }`
 * @returns {{recorded: true, answer: boolean}}
 */
function answerCannotHear (req, res) {
  const meta = ownedMeeting(req, res)
  if (!meta) { return }
  const report = reportOr404(req, res, meta, 'coaching')
  if (!report) { return }

  const body = req.body || {}
  const pointId = typeof body.pointId === 'string' ? body.pointId.trim() : ''
  if (typeof body.answer !== 'boolean') {
    return sendError(res, 400, 'ANSWER_REQUIRED', 'Answer yes or no')
  }

  const finding = (report.findings || []).find(f => f.pointId === pointId && f.state === 'cannot_hear')
  if (!finding) {
    return sendError(res, 400, 'UNKNOWN_POINT', 'That observation is not one this recording could not hear')
  }

  try {
    finding.advisorAnswer = body.answer
    finding.answeredAt = new Date().toISOString()
    store.writeReport(meta.meetingId, 'coaching', report)
    res.send(200, { recorded: true, answer: body.answer })
  } catch (err) {
    return serverError(res, err, 'record that answer')
  }
}

module.exports = {
  DIARIZING_MODEL,
  getRetention,
  setRetention,
  resetRetention,
  getConsentContext,
  startRecording,
  confirmConsent,
  uploadChunk,
  finishRecording,
  getRecording,
  deleteRecording,
  runTranscription,
  readScopeConfig,
  jobs,
  generateReports,
  getReports,
  saveSummaryEdit,
  approveSummary,
  disputeFinding,
  answerCannotHear,
  runReports,
  presetFor,
  reportJobs
}
