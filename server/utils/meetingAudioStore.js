'use strict'

/**
 * @file The recording, while it briefly exists — chunks on this server's own disk, and the
 *   deletion that has to be provable rather than best effort.
 * @module server/utils/meetingAudioStore
 *
 * Design: `design/features/meeting-review.md` P8, P10, §5 trap 4. Storage location ruled by
 * Mike, 2026-09-01: **this server's own disk**, not the database and not the Google Drive
 * pipeline the firm document library uses.
 *
 * 🔴 WHY NOT DRIVE, RECORDED SO NOBODY "SIMPLIFIES" IT LATER. `firmManager.uploadDocument`
 * already hands firm PDFs to a Google service account, and reusing that here would have been
 * the cheapest route by a wide margin. It was rejected on purpose. The consent line a client
 * hears spoken says *"nothing is shared outside our firm"* — promoted to Brief P13 precisely
 * so a later change could not quietly falsify it — and the reasoning that made OpenAI
 * acceptable was that they are ALREADY this app's contracted processor. Google is not in that
 * argument. An hour of a named client's financial affairs does not go to a third party
 * because a pipe to one happened to exist.
 *
 * 🔴 THE LIABILITY IS THE POINT OF THE DESIGN. Brief §1: *"an hour of a client's private
 * financial affairs is the most dangerous thing this application will ever hold. It exists to
 * be turned into text and then to stop existing."* So this module has exactly one job it must
 * never get wrong — `destroyMeeting` — and it is built to REPORT what it removed rather than
 * to return quietly. A deletion nobody can check is the promise P8 makes, unkept.
 *
 * ⚠ MEETING IDS ARE MINTED HERE AND VALIDATED ON EVERY PATH BUILD. They are 32 hex characters
 * from `crypto.randomBytes`, and `_meetingDir` refuses anything else. That is what makes a
 * path-traversal id (`../../etc`) impossible rather than merely unlikely: the id from a
 * request is never concatenated into a path until it has matched the pattern.
 *
 * ⚠ NOT IN THE REPOSITORY, AND NOT IN A BACKED-UP DIRECTORY BY DEFAULT. The root is
 * `MEETING_AUDIO_DIR` when set, else a directory under the system temp path. A recording must
 * not survive in a backup taken between capture and deletion.
 *
 * Node 14, CommonJS. Deletion is written out longhand rather than with `fs.rmSync(recursive)`
 * so it can COUNT what it removed — the count is the proof.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')

/** A minted meeting id, and the only shape any path builder here accepts. */
const MEETING_ID_PATTERN = /^[0-9a-f]{32}$/

/** Chunk files, in capture order. Zero-padded so a plain sort is capture order. */
const CHUNK_PREFIX = 'chunk-'
const CHUNK_DIGITS = 6

/** The meeting's own record — who it belongs to, and whether consent was confirmed. */
const META_FILE = 'meeting.json'

/** The stitched recording, written at finish and deleted as soon as it is text. */
const ASSEMBLED_FILE = 'assembled.audio'

/** The transcript. Outlives the audio; the retention clock is what removes it. */
const TRANSCRIPT_FILE = 'transcript.json'

/**
 * Size limits.
 *
 * An hour of browser-encoded Opus is roughly 30 MB, so 400 MB is generous for a long meeting
 * and still refuses a client that has stopped chunking and is streaming everything it has.
 * The per-chunk cap is the same guard one level down.
 */
const MAX_CHUNK_BYTES = 10 * 1024 * 1024
const MAX_MEETING_BYTES = 400 * 1024 * 1024

/**
 * The root every meeting directory sits under.
 *
 * Resolved per call rather than captured at require time, so a test can point it somewhere
 * disposable without the module having already decided.
 *
 * @returns {string}
 */
function audioRoot () {
  return process.env.MEETING_AUDIO_DIR ||
    path.join(os.tmpdir(), 'advisor-e-meeting-audio')
}

/**
 * The directory for one meeting, refusing any id this module did not mint.
 *
 * 🔴 THE ONE PLACE A REQUEST-SUPPLIED ID BECOMES A PATH. Everything else in this module goes
 * through here, so the pattern check cannot be bypassed by adding a function later.
 *
 * @param {string} meetingId
 * @returns {string}
 * @throws {Error} when the id is not a minted one
 */
function _meetingDir (meetingId) {
  if (typeof meetingId !== 'string' || !MEETING_ID_PATTERN.test(meetingId)) {
    throw new Error('meetingAudioStore: invalid meeting id')
  }
  return path.join(audioRoot(), meetingId)
}

/** The chunk filename for one sequence number. */
function _chunkName (seq) {
  return CHUNK_PREFIX + String(seq).padStart(CHUNK_DIGITS, '0')
}

/**
 * Start a meeting: mint an id, make its directory, and write down whose it is.
 *
 * 🔴 OWNERSHIP IS WRITTEN AT CREATION AND NEVER TAKEN FROM A LATER REQUEST. Every route
 * checks a caller against this record before touching a byte, which is what stops one firm —
 * or one advisor — reaching another's recording with a guessed id.
 *
 * @param {object} owner
 * @param {string} owner.firmId - the verified scope from the JWT
 * @param {string} owner.advisor - the signed-in advisor's identifier
 * @param {string} [owner.scenarioId] - the meeting type chosen in the pre-set
 * @param {number} owner.retentionMonths - the figure the advisor was shown and spoke aloud
 * @returns {{meetingId: string, meta: object}}
 */
function createMeeting (owner) {
  const meetingId = crypto.randomBytes(16).toString('hex')
  const dir = _meetingDir(meetingId)
  fs.mkdirSync(dir, { recursive: true })

  const meta = {
    meetingId,
    firmId: (owner && owner.firmId) || null,
    advisor: (owner && owner.advisor) || null,
    scenarioId: (owner && owner.scenarioId) || null,
    // Stored because it is what the advisor SAID OUT LOUD. A firm that later moves its dial
    // must not retrospectively change what a client was told at this meeting.
    retentionMonths: (owner && owner.retentionMonths) || null,
    createdAt: new Date().toISOString(),
    // Consent is not claimed at creation. Recording starts first, the advisor speaks, and
    // only then is this set — the order the approved two-step screen exists to enforce.
    consentConfirmedAt: null,
    chunkCount: 0,
    bytes: 0,
    state: 'recording'
  }
  _writeMeta(meetingId, meta)
  return { meetingId, meta }
}

/** Write the meeting record. */
function _writeMeta (meetingId, meta) {
  fs.writeFileSync(path.join(_meetingDir(meetingId), META_FILE), JSON.stringify(meta, null, 2))
}

/**
 * The meeting record, or null when there is no such meeting.
 *
 * Returns null rather than throwing for a well-formed id that does not exist, so a caller can
 * answer 404 without a try/catch; a MALFORMED id still throws, because that is not a missing
 * meeting, it is a request that should never have been built.
 *
 * @param {string} meetingId
 * @returns {object|null}
 */
function readMeta (meetingId) {
  const file = path.join(_meetingDir(meetingId), META_FILE)
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (_e) {
    return null
  }
}

/**
 * Change fields on the meeting record, leaving the rest alone.
 * @param {string} meetingId
 * @param {object} patch
 * @returns {object|null} the updated record, or null when the meeting is gone
 */
function updateMeta (meetingId, patch) {
  const meta = readMeta(meetingId)
  if (!meta) { return null }
  const next = { ...meta, ...patch, meetingId: meta.meetingId }
  _writeMeta(meetingId, next)
  return next
}

/**
 * Is this caller the meeting's owner?
 *
 * BOTH HALVES ARE CHECKED. The firm alone is not enough: Brief P2 gives the advisor's review
 * to the advisor, and a colleague at the same firm is as much a stranger to this recording as
 * another firm is.
 *
 * @param {object|null} meta
 * @param {string} firmId
 * @param {string} advisor
 * @returns {boolean}
 */
function isOwnedBy (meta, firmId, advisor) {
  if (!meta) { return false }
  return Boolean(firmId) && Boolean(advisor) &&
    meta.firmId === firmId && meta.advisor === advisor
}

/**
 * Store one captured chunk.
 *
 * @param {string} meetingId
 * @param {number} seq - the browser's capture sequence, from 1
 * @param {Buffer} buffer
 * @returns {{chunkCount: number, bytes: number}}
 * @throws {Error} on a bad sequence, an oversized chunk, or a meeting over its total
 */
function appendChunk (meetingId, seq, buffer) {
  const meta = readMeta(meetingId)
  if (!meta) { throw new Error('meetingAudioStore: no such meeting') }
  if (meta.state !== 'recording') {
    throw new Error('meetingAudioStore: this meeting is no longer recording')
  }
  if (!Number.isInteger(seq) || seq < 1) {
    throw new Error('meetingAudioStore: chunk sequence must be a positive whole number')
  }
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('meetingAudioStore: chunk is empty')
  }
  if (buffer.length > MAX_CHUNK_BYTES) {
    throw new Error('meetingAudioStore: chunk is too large')
  }
  if (meta.bytes + buffer.length > MAX_MEETING_BYTES) {
    throw new Error('meetingAudioStore: this meeting has reached its size limit')
  }

  fs.writeFileSync(path.join(_meetingDir(meetingId), _chunkName(seq)), buffer)

  // Counted from the directory rather than incremented, so a chunk that arrives twice — a
  // retry after a flaky upload — is one file and one count, not two.
  const counted = listChunks(meetingId)
  const bytes = counted.reduce((sum, c) => sum + c.size, 0)
  updateMeta(meetingId, { chunkCount: counted.length, bytes })
  return { chunkCount: counted.length, bytes }
}

/**
 * Every stored chunk, in capture order.
 * @param {string} meetingId
 * @returns {Array.<{name: string, size: number}>}
 */
function listChunks (meetingId) {
  const dir = _meetingDir(meetingId)
  let names
  try {
    names = fs.readdirSync(dir)
  } catch (_e) {
    return []
  }
  return names
    .filter(n => n.indexOf(CHUNK_PREFIX) === 0)
    .sort()
    .map(n => ({ name: n, size: fs.statSync(path.join(dir, n)).size }))
}

/**
 * Stitch the chunks into one recording, for the single whole-meeting transcription pass.
 *
 * 🔴 WHY ONE PASS OVER THE WHOLE THING AND NOT PER CHUNK. Brief §3 and §5 trap 1: speaker
 * labels are assigned PER REQUEST, so "speaker 1" in one chunk is not "speaker 1" in the
 * next. Stitching chunk-level labels together would quietly swap the advisor and the client
 * over — attribution that reads as confident and is wrong, which is the worst failure this
 * feature has available to it. Chunking still earns its place: it is what makes a crash cost
 * seconds instead of the meeting (P10).
 *
 * @param {string} meetingId
 * @returns {{path: string, bytes: number, chunkCount: number}}
 * @throws {Error} when there is nothing to assemble
 */
function assemble (meetingId) {
  const chunks = listChunks(meetingId)
  if (!chunks.length) {
    throw new Error('meetingAudioStore: nothing was captured')
  }
  const dir = _meetingDir(meetingId)
  const target = path.join(dir, ASSEMBLED_FILE)

  const out = fs.openSync(target, 'w')
  try {
    chunks.forEach((c) => {
      fs.writeSync(out, fs.readFileSync(path.join(dir, c.name)))
    })
  } finally {
    fs.closeSync(out)
  }

  const bytes = fs.statSync(target).size
  updateMeta(meetingId, { state: 'assembled', assembledBytes: bytes })
  return { path: target, bytes, chunkCount: chunks.length }
}

/** The assembled recording as bytes, for the transcription call. */
function readAssembled (meetingId) {
  return fs.readFileSync(path.join(_meetingDir(meetingId), ASSEMBLED_FILE))
}

/**
 * Destroy every byte of audio, keeping the transcript and the meeting record.
 *
 * 🔴 THIS IS P8, AND IT RETURNS ITS PROOF. The caller writes the count to the log and the
 * meeting record; a deletion that reports nothing is indistinguishable from one that did
 * nothing, which is exactly the "best effort" §5 trap 4 names.
 *
 * @param {string} meetingId
 * @returns {{removed: number, bytesRemoved: number, audioRemains: boolean}}
 */
function destroyAudio (meetingId) {
  const dir = _meetingDir(meetingId)
  let names
  try {
    names = fs.readdirSync(dir)
  } catch (_e) {
    return { removed: 0, bytesRemoved: 0, audioRemains: false }
  }

  const audio = names.filter(n => n.indexOf(CHUNK_PREFIX) === 0 || n === ASSEMBLED_FILE)
  let removed = 0
  let bytesRemoved = 0
  audio.forEach((n) => {
    const file = path.join(dir, n)
    try {
      bytesRemoved += fs.statSync(file).size
      fs.unlinkSync(file)
      removed += 1
    } catch (_e) {
      // Counted as not removed. The re-read below is what decides the answer.
    }
  })

  // Verified, not assumed. The whole value of this function is that its answer was checked.
  const after = fs.readdirSync(dir)
    .filter(n => n.indexOf(CHUNK_PREFIX) === 0 || n === ASSEMBLED_FILE)

  return { removed, bytesRemoved, audioRemains: after.length > 0 }
}

/**
 * Destroy the whole meeting — audio, transcript and record alike.
 *
 * 🔴 THIS IS "STOP AND DELETE", AND IT MUST TAKE THE TRANSCRIPT TOO.
 * `MEETING-CONSENT-WORDING.md` §4 is explicit: *"'Delete' here means the audio AND any
 * transcript already derived from it. A meeting the client withdrew consent to must not
 * survive as text because the chunks happened to be transcribed early."* Deleting only the
 * audio here would honour the letter of a client's refusal and break its substance.
 *
 * @param {string} meetingId
 * @returns {{removed: number, bytesRemoved: number, meetingRemains: boolean}}
 */
function destroyMeeting (meetingId) {
  const dir = _meetingDir(meetingId)
  let names
  try {
    names = fs.readdirSync(dir)
  } catch (_e) {
    return { removed: 0, bytesRemoved: 0, meetingRemains: false }
  }

  let removed = 0
  let bytesRemoved = 0
  names.forEach((n) => {
    const file = path.join(dir, n)
    try {
      bytesRemoved += fs.statSync(file).size
      fs.unlinkSync(file)
      removed += 1
    } catch (_e) {
      // Left for the verification below to catch.
    }
  })

  let meetingRemains = true
  try {
    fs.rmdirSync(dir)
    meetingRemains = fs.existsSync(dir)
  } catch (_e) {
    meetingRemains = fs.existsSync(dir)
  }

  return { removed, bytesRemoved, meetingRemains }
}

/** Store the transcript beside the meeting record, once the audio has become text. */
function writeTranscript (meetingId, transcript) {
  fs.writeFileSync(
    path.join(_meetingDir(meetingId), TRANSCRIPT_FILE),
    JSON.stringify(transcript, null, 2)
  )
}

/** The stored transcript, or null when there is none. */
function readTranscript (meetingId) {
  try {
    return JSON.parse(fs.readFileSync(path.join(_meetingDir(meetingId), TRANSCRIPT_FILE), 'utf8'))
  } catch (_e) {
    return null
  }
}

/**
 * The two reports, kept in this same directory.
 *
 * 🔴 THEY LIVE HERE SO "STOP AND DELETE" TAKES THEM. `destroyMeeting` removes every file in
 * the meeting's directory, so a report written here is destroyed with the transcript and the
 * audio by the same single act — no second store to remember, nothing to fall out of step.
 * `MEETING-CONSENT-WORDING.md` §4 says a meeting the client withdrew consent to must not
 * survive as text, and a coaching note quoting that meeting is exactly that text.
 *
 * @param {'summary'|'coaching'} kind
 * @returns {string}
 */
function _reportName (kind) {
  if (kind !== 'summary' && kind !== 'coaching') {
    throw new Error('meetingAudioStore: unknown report kind')
  }
  return 'report-' + kind + '.json'
}

/** Store one report beside the meeting record. */
function writeReport (meetingId, kind, report) {
  fs.writeFileSync(
    path.join(_meetingDir(meetingId), _reportName(kind)),
    JSON.stringify(report, null, 2)
  )
}

/** One stored report, or null when it has not been generated. */
function readReport (meetingId, kind) {
  try {
    return JSON.parse(fs.readFileSync(path.join(_meetingDir(meetingId), _reportName(kind)), 'utf8'))
  } catch (_e) {
    return null
  }
}

module.exports = {
  MEETING_ID_PATTERN,
  CHUNK_PREFIX,
  META_FILE,
  ASSEMBLED_FILE,
  TRANSCRIPT_FILE,
  MAX_CHUNK_BYTES,
  MAX_MEETING_BYTES,
  audioRoot,
  createMeeting,
  readMeta,
  updateMeta,
  isOwnedBy,
  appendChunk,
  listChunks,
  assemble,
  readAssembled,
  destroyAudio,
  destroyMeeting,
  writeTranscript,
  readTranscript,
  writeReport,
  readReport
}
