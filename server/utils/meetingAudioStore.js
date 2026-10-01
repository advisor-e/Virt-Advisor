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
 * A client's own correction statements, attached to moments in the transcript.
 *
 * 🔴 ATTACHED, NEVER AN EDIT — Mike's ruling 4 of 2026-09-10,
 * `design/mockups/client-record-request.html`. IPP7 asks you to correct information where you
 * can and, where you decline, to attach the individual's own statement so anyone reading the
 * record afterwards sees it. A transcript is the second case almost every time: it records
 * what was said in a room rather than a claim about the world, and rewriting it would destroy
 * the only thing it is good for. It would also break every coaching finding built on it —
 * each quote is verified against the transcript before it is stored, so an edit would strand
 * findings that still read as evidenced.
 *
 * ⚠ IT LIVES BESIDE THE TRANSCRIPT AND DIES WITH IT. A correction quotes the passage it
 * disputes, so keeping it past the retention clock would preserve the client's words in a file
 * nobody was looking at — the same fault `destroyTranscript` was written to prevent for the
 * two reports. It is in that function's list for exactly that reason.
 */
const CORRECTIONS_FILE = 'corrections.json'

/**
 * Size limits.
 *
 * An hour of browser-encoded Opus is roughly 30 MB, so 400 MB is generous for a long meeting
 * and still refuses a client that has stopped chunking and is streaming everything it has.
 * The per-chunk cap is the same guard one level down.
 */
const MAX_CHUNK_BYTES = 10 * 1024 * 1024
const MAX_MEETING_BYTES = 400 * 1024 * 1024

// ── A strategy session, recorded in concept segments (item 8.4) ─────────────────────
//
// 🔴 WHY SEGMENTS. The diarizing model refuses more than 1400 seconds of audio (proven
// 2026-10-01) and OpenAI any file over 25 MB, and this store otherwise sends a meeting as ONE
// file. A planning session runs for hours. Mike's rulings of 2026-09-28
// (design/mockups/strategy-session-recording.html, approved for build): one segment per
// concept, one consent per session, and a segment closes by itself at 20 minutes (his yes of
// 2026-10-01; first ruled 25, over the model's limit) or 20 MB. The browser rolls over at SEGMENT_ROLL_BYTES; SEGMENT_MAX_BYTES is the
// server's own guard below OpenAI's limit, for a browser that did not.
//
// ⚠ Every segment file name starts with SEGMENT_PREFIX, so the deletions below can find them
// without a list anyone must remember to extend.

/** Where the browser starts the next segment — the 20 MB Mike ruled. */
const SEGMENT_ROLL_BYTES = 20 * 1024 * 1024

/** The server's refusal point: below OpenAI's 25 MB, with room for the form fields and clip. */
const SEGMENT_MAX_BYTES = 24 * 1024 * 1024

/** A session this long is a fault, not a workshop. */
const MAX_SEGMENTS = 200

/** Every segment's audio and text starts with this. */
const SEGMENT_PREFIX = 'seg-'

/** The advisor's voice clip. Audio: it goes with the rest, and never outlives it. */
const VOICE_REFERENCE_FILE = 'voice-reference.audio'

/** 8 seconds of browser audio is tens of kilobytes; this refuses anything that is not a clip. */
const MAX_VOICE_REFERENCE_BYTES = 1024 * 1024

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
 * @param {string} [owner.advisorName] - their name, captured at write time.
 *
 *   🔴 CAPTURED, NOT JOINED, AND FOR THE SAME REASON AS `advisor_va_sessions.advisor_name`:
 *   **this application holds no advisors table** — `config/db-schema.sql` says so four times —
 *   so there is nothing to look a name out of later. Added 2026-09-10 for the client copy
 *   request, whose screen names the advisor a client is waiting on.
 *
 *   ⚠ AND SO IT IS ABSENT ON EVERY MEETING RECORDED BEFORE THAT DAY, which is a named
 *   deviation from `design/mockups/client-record-request.html`: the drawing shows *"Recorded by
 *   Owen Fraser"* and an older meeting can only show his identifier. It cannot be backfilled
 *   from anywhere, and inventing a lookup would be the "4 of 12" fault — a plausible wrong name
 *   is worse than an honest id.
 * @param {string} [owner.scenarioId] - the meeting type chosen in the pre-set
 * @param {string} [owner.clientId] - which client this meeting is with, from the firm's own
 *   register. The ID ONLY, never the name: a firm may rename a client and the record must not
 *   keep a stale label, and this file already holds the most sensitive material in the app.
 *   It is what makes follow-through possible — March's agreed actions can only be checked
 *   against April's meeting if both are known to be with the same business.
 * @param {number} owner.retentionMonths - the figure the advisor was shown and spoke aloud
 * @param {boolean} [owner.segmented] - a strategy session, recorded one concept at a time
 * @param {boolean} [owner.inParts] - an ordinary meeting, segmented by the clock alone
 * @param {number} [owner.strategySessionId] - the planning session it records, already checked
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
    // See the parameter note: captured because there is no advisors table to join, and null
    // on every meeting recorded before 2026-09-10 rather than guessed at afterwards.
    advisorName: (owner && owner.advisorName) || null,
    scenarioId: (owner && owner.scenarioId) || null,
    // Which client, from the firm's own register. Null when the advisor recorded without
    // choosing one — follow-through then has nothing to match on, and says so rather than
    // guessing from the advisor and the meeting type, which would check one client's agreed
    // actions against another client's transcript and look entirely reasonable doing it.
    clientId: (owner && owner.clientId) || null,
    // Stored because it is what the advisor SAID OUT LOUD. A firm that later moves its dial
    // must not retrospectively change what a client was told at this meeting.
    retentionMonths: (owner && owner.retentionMonths) || null,
    // A strategy session records in concept segments rather than as one file (item 8.4).
    segmented: Boolean(owner && owner.segmented),
    // An ordinary meeting recorded in 20-minute parts rather than concepts (item 8.4,
    // design/mockups/meeting-review-long-recording.html): no concept, no concept summary.
    inParts: Boolean(owner && owner.segmented && owner.inParts),
    // The planning session whose box timeline places this recording's words (8.4, screen 4).
    // Checked by the route against the firm, client and advisor before it is written here.
    strategySessionId: (owner && owner.strategySessionId) || null,
    segments: [],
    createdAt: new Date().toISOString(),
    // When audio last arrived. An unfinished recording's audio is held 7 working days from here
    // and then destroyed (item 8.5, `meetingPurge.purgeAbandoned`).
    lastActivityAt: new Date().toISOString(),
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
  // A segmented session's audio goes through `appendSegmentChunk`, whose per-segment cap is
  // what keeps each file under OpenAI's limit. Accepted here, it would bypass that cap.
  if (meta.segmented) {
    throw new Error('meetingAudioStore: this meeting is recorded in segments')
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
  updateMeta(meetingId, { chunkCount: counted.length, bytes, lastActivityAt: new Date().toISOString() })
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

  const audio = names.filter(_isAudioFile)
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
  const after = fs.readdirSync(dir).filter(_isAudioFile)

  return { removed, bytesRemoved, audioRemains: after.length > 0 }
}

/**
 * Does any audio of this meeting remain on disk? What the abandoned-recording sweep asks.
 * @param {string} meetingId
 * @returns {boolean}
 */
function hasAudio (meetingId) {
  try {
    return fs.readdirSync(_meetingDir(meetingId)).some(_isAudioFile)
  } catch (_e) {
    return false
  }
}

/**
 * Is this file audio — anything `destroyAudio` must take?
 *
 * 🔴 ONE TEST FOR "IS THIS AUDIO", USED BY BOTH THE DELETION AND ITS CHECK. A segment's chunks
 * and the advisor's voice clip are audio exactly as a single-file meeting's chunks are; a
 * deletion that knew only the older names would report success and leave them on disk.
 *
 * @param {string} name
 * @returns {boolean}
 */
function _isAudioFile (name) {
  return name.indexOf(CHUNK_PREFIX) === 0 ||
    name === ASSEMBLED_FILE ||
    name === VOICE_REFERENCE_FILE ||
    (name.indexOf(SEGMENT_PREFIX) === 0 && name.includes('-' + CHUNK_PREFIX))
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

/**
 * Every meeting id this store currently holds.
 *
 * 🔴 IDS ONLY, AND DELIBERATELY SO. The manager's aggregate is the only caller, and it still has
 * to go through `readMeta` and prove a firm owns each record before counting it. Returning the
 * records themselves would hand a caller a pile of meetings it had never shown it may see, which
 * is the shape every other function here is built to refuse.
 *
 * Names that do not match a minted id are ignored rather than trusted — the directory is on a
 * real disk and may hold anything.
 *
 * @returns {Array<string>}
 */
function listMeetingIds () {
  try {
    return fs.readdirSync(audioRoot()).filter(n => MEETING_ID_PATTERN.test(n))
  } catch (_e) {
    // No directory yet is not an error: it is a server where no meeting has been recorded.
    return []
  }
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
 * The client's correction statements for this meeting, oldest first.
 *
 * Always an array — a meeting with no corrections and a meeting whose file will not parse both
 * read as none, because a screen that cannot render the transcript is worse than one rendering
 * it without an attachment nobody can read anyway.
 *
 * @param {string} meetingId
 * @returns {Array<object>}
 */
function readCorrections (meetingId) {
  try {
    const rows = JSON.parse(
      fs.readFileSync(path.join(_meetingDir(meetingId), CORRECTIONS_FILE), 'utf8')
    )
    return Array.isArray(rows) ? rows : []
  } catch (_e) {
    return []
  }
}

/**
 * Append one correction statement.
 *
 * 🔴 APPEND-ONLY, AND NOTHING REMOVES ONE. A client's attached statement is the record IPP7
 * asks for; a firm that could take it back down would have a correction facility that corrects
 * nothing. The transcript's own expiry is what removes it, with everything else.
 *
 * @param {string} meetingId
 * @param {object} correction - `{id, at, statement, quote, quoteAt, recordedBy}`
 * @returns {Array<object>} every correction now held
 */
function appendCorrection (meetingId, correction) {
  const rows = readCorrections(meetingId)
  rows.push(correction)
  fs.writeFileSync(
    path.join(_meetingDir(meetingId), CORRECTIONS_FILE),
    JSON.stringify(rows, null, 2)
  )
  return rows
}

/**
 * Destroy the TEXT a meeting left behind — the transcript and both reports — keeping the
 * meeting record itself.
 *
 * 🔴 THIS IS THE OTHER HALF OF P8, AND IT RETURNS ITS PROOF like `destroyAudio` does. A firm
 * sets how long transcripts are kept and the client is shown that figure before they agree;
 * this is what makes that number true rather than decorative.
 *
 * 🔴 THE REPORTS GO WITH THE TRANSCRIPT, and that is the whole point rather than a side effect.
 * Every finding in the coaching notes quotes the transcript verbatim, and the summary is written
 * from it. Expiring `transcript.json` alone would delete the file and keep the client's own words
 * in two others — the letter of the promise kept and its substance broken. It is the same
 * argument `destroyMeeting` already makes for "stop and delete".
 *
 * ⚠ THE MEETING RECORD SURVIVES on purpose. `meeting.json` holds no client content — a firm id,
 * an advisor id, dates and counts — and it is what lets anyone afterwards prove the expiry ran
 * rather than that a directory quietly went missing.
 *
 * @param {string} meetingId
 * @returns {{removed: number, bytesRemoved: number, textRemains: boolean}}
 */
function destroyTranscript (meetingId) {
  const dir = _meetingDir(meetingId)
  // 🔴 THE CORRECTIONS GO TOO, for the reason in `CORRECTIONS_FILE`'s own note: a client's
  // attached statement quotes the passage it disputes, so leaving it behind would keep their
  // words in a file the promise never mentioned. Same argument as the two reports.
  // 🔴 AND EACH SEGMENT'S OWN TEXT (item 8.4). A segmented session's transcript is joined from
  // them, so leaving them would keep every word of the session after the joined copy expired.
  let segmentText = []
  try {
    segmentText = fs.readdirSync(dir).filter(_isSegmentTextFile)
  } catch (_e) { /* no directory: nothing to remove */ }
  const text = [
    TRANSCRIPT_FILE,
    _reportName('summary'),
    _reportName('coaching'),
    CORRECTIONS_FILE,
    // Wordsmith's records quote the client's words and the drafts written from them.
    WORDSMITH_FILE
  ].concat(segmentText)

  let removed = 0
  let bytesRemoved = 0
  text.forEach((n) => {
    const file = path.join(dir, n)
    try {
      bytesRemoved += fs.statSync(file).size
      fs.unlinkSync(file)
      removed += 1
    } catch (_e) {
      // Already gone, or could not be removed. The re-read below decides which.
    }
  })

  // Verified, not assumed — the same reason `destroyAudio` re-reads.
  const textRemains = text.some((n) => {
    try {
      fs.accessSync(path.join(dir, n))
      return true
    } catch (_e) {
      return false
    }
  })

  return { removed, bytesRemoved, textRemains }
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

// ── Segments (item 8.4) ──────────────────────────────────────────────────────────────

/** `seg-003`: the zero-padded stem every file of one segment shares. */
function _segmentStem (n) {
  if (!Number.isInteger(n) || n < 1 || n > MAX_SEGMENTS) {
    throw new Error('meetingAudioStore: invalid segment number')
  }
  return SEGMENT_PREFIX + String(n).padStart(3, '0')
}

/** A segment's text file: `seg-003-text.json`. */
function _segmentTextName (n) { return _segmentStem(n) + '-text.json' }

/** A segment's concept summary: `seg-003-summary.json` (item 8.4, slice 2). */
function _segmentSummaryName (n) { return _segmentStem(n) + '-summary.json' }

/** A segment's passages placed in their boxes: `seg-003-words.json` (item 8.4, screen 4). */
function _segmentWordsName (n) { return _segmentStem(n) + '-words.json' }

/**
 * Is this a segment's text, summary or placed words — anything `destroyTranscript` must take?
 * Summaries and placed words quote the client's own words, so they expire with them.
 */
function _isSegmentTextFile (name) {
  return name.indexOf(SEGMENT_PREFIX) === 0 && /-(text|summary|words)\.json$/.test(name)
}

/** The meeting, refusing one that is not a segmented session still recording. */
function _recordingSegmented (meetingId) {
  const meta = readMeta(meetingId)
  if (!meta) { throw new Error('meetingAudioStore: no such meeting') }
  if (!meta.segmented) { throw new Error('meetingAudioStore: this meeting is not recorded in segments') }
  if (meta.state !== 'recording') { throw new Error('meetingAudioStore: this meeting is no longer recording') }
  return meta
}

/**
 * Open the next segment.
 *
 * ⚠ ONE SEGMENT RECORDS AT A TIME. The caller closes the live one first; this refuses rather
 * than closing it itself, because closing is what starts a transcription, and a store that
 * quietly started one would hide the step the route must log.
 *
 * @param {string} meetingId
 * @param {{conceptId: (string|null), label: string}} what - the concept, and its name as shown
 * @returns {{n: number, meta: object}}
 */
function openSegment (meetingId, what) {
  const meta = _recordingSegmented(meetingId)
  const segments = Array.isArray(meta.segments) ? meta.segments : []
  if (segments.some(s => s.state === 'recording')) {
    throw new Error('meetingAudioStore: a segment is already recording')
  }
  if (segments.length >= MAX_SEGMENTS) {
    throw new Error('meetingAudioStore: this session has reached its segment limit')
  }
  const n = segments.length + 1
  const next = segments.concat([{
    n,
    conceptId: (what && typeof what.conceptId === 'string' && what.conceptId) ? what.conceptId : null,
    label: (what && typeof what.label === 'string') ? what.label.slice(0, 200) : '',
    state: 'recording',
    startedAt: new Date().toISOString(),
    closedAt: null,
    chunkCount: 0,
    bytes: 0
  }])
  return { n, meta: updateMeta(meetingId, { segments: next }) }
}

/**
 * Change fields on one segment, leaving the rest alone.
 * @param {string} meetingId
 * @param {number} n
 * @param {object} patch
 * @returns {object|null} the updated segment, or null when there is no such segment
 */
function updateSegment (meetingId, n, patch) {
  const meta = readMeta(meetingId)
  if (!meta || !Array.isArray(meta.segments)) { return null }
  let found = null
  const segments = meta.segments.map((s) => {
    if (s.n !== n) { return s }
    found = { ...s, ...patch, n: s.n }
    return found
  })
  if (found) { updateMeta(meetingId, { segments }) }
  return found
}

/** Every stored chunk of one segment, in capture order. */
function listSegmentChunks (meetingId, n) {
  const dir = _meetingDir(meetingId)
  const stem = _segmentStem(n) + '-' + CHUNK_PREFIX
  let names
  try {
    names = fs.readdirSync(dir)
  } catch (_e) {
    return []
  }
  return names
    .filter(name => name.indexOf(stem) === 0)
    .sort()
    .map(name => ({ name, size: fs.statSync(path.join(dir, name)).size }))
}

/**
 * Store one chunk of the live segment.
 *
 * 🔴 THE SEGMENT'S OWN CAP IS WHAT KEEPS EVERY FILE UNDER OPENAI'S LIMIT. The browser rolls over
 * at `SEGMENT_ROLL_BYTES`; this refuses at `SEGMENT_MAX_BYTES` so a browser that did not roll
 * over loses one chunk's worth, loudly, instead of a whole segment silently at transcription.
 *
 * @param {string} meetingId
 * @param {number} n - the segment the chunk belongs to; must be the one recording
 * @param {number} seq - the browser's capture sequence within the segment, from 1
 * @param {Buffer} buffer
 * @returns {{segmentBytes: number, bytes: number, rollOver: boolean}}
 */
function appendSegmentChunk (meetingId, n, seq, buffer) {
  const meta = _recordingSegmented(meetingId)
  const seg = (meta.segments || []).filter(s => s.n === n)[0]
  if (!seg || seg.state !== 'recording') {
    throw new Error('meetingAudioStore: that segment is not recording')
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
  if (seg.bytes + buffer.length > SEGMENT_MAX_BYTES) {
    throw new Error('meetingAudioStore: this segment is full')
  }
  if ((meta.bytes || 0) + buffer.length > MAX_MEETING_BYTES) {
    throw new Error('meetingAudioStore: this meeting has reached its size limit')
  }

  const name = _segmentStem(n) + '-' + CHUNK_PREFIX + String(seq).padStart(CHUNK_DIGITS, '0')
  fs.writeFileSync(path.join(_meetingDir(meetingId), name), buffer)

  // Counted from the directory, as `appendChunk` does, so a retried chunk counts once.
  const counted = listSegmentChunks(meetingId, n)
  const segmentBytes = counted.reduce((sum, c) => sum + c.size, 0)
  updateSegment(meetingId, n, { chunkCount: counted.length, bytes: segmentBytes })
  const all = readMeta(meetingId)
  const bytes = (all.segments || []).reduce((sum, s) => sum + (s.bytes || 0), 0)
  updateMeta(meetingId, {
    bytes,
    chunkCount: (all.segments || []).reduce((sum, s) => sum + (s.chunkCount || 0), 0),
    lastActivityAt: new Date().toISOString()
  })
  return { segmentBytes, bytes, rollOver: segmentBytes >= SEGMENT_ROLL_BYTES }
}

/**
 * One segment's recording, stitched in memory for its transcription call.
 * @param {string} meetingId
 * @param {number} n
 * @returns {Buffer}
 * @throws {Error} when the segment captured nothing
 */
function assembleSegment (meetingId, n) {
  const chunks = listSegmentChunks(meetingId, n)
  if (!chunks.length) { throw new Error('meetingAudioStore: nothing was captured in that segment') }
  const dir = _meetingDir(meetingId)
  return Buffer.concat(chunks.map(c => fs.readFileSync(path.join(dir, c.name))))
}

/**
 * Destroy one segment's audio once it is text — P8, per segment.
 *
 * ⚠ NOT THE VOICE CLIP. Later segments still need it; it goes with `destroyAudio` when the
 * session's recording is finished, or with `destroyMeeting` on "Stop and delete everything".
 *
 * @param {string} meetingId
 * @param {number} n
 * @returns {{removed: number, bytesRemoved: number, audioRemains: boolean}}
 */
function destroySegmentAudio (meetingId, n) {
  const dir = _meetingDir(meetingId)
  let removed = 0
  let bytesRemoved = 0
  listSegmentChunks(meetingId, n).forEach((c) => {
    try {
      fs.unlinkSync(path.join(dir, c.name))
      bytesRemoved += c.size
      removed += 1
    } catch (_e) {
      // Counted as not removed. The re-read below is what decides the answer.
    }
  })
  return { removed, bytesRemoved, audioRemains: listSegmentChunks(meetingId, n).length > 0 }
}

/**
 * Keep the advisor's voice clip for the session. See `transcriptionClient.ADVISOR_SPEAKER_NAME`
 * for why it exists and why it is the advisor's voice alone.
 *
 * @param {string} meetingId
 * @param {Buffer} buffer
 * @param {string} mime - checked against the allowed list by the transcription client
 * @returns {{bytes: number}}
 */
function writeVoiceReference (meetingId, buffer, mime) {
  _recordingSegmented(meetingId)
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('meetingAudioStore: the voice clip is empty')
  }
  if (buffer.length > MAX_VOICE_REFERENCE_BYTES) {
    throw new Error('meetingAudioStore: the voice clip is too large')
  }
  fs.writeFileSync(path.join(_meetingDir(meetingId), VOICE_REFERENCE_FILE), buffer)
  updateMeta(meetingId, { voiceReferenceMime: mime, voiceReferenceBytes: buffer.length })
  return { bytes: buffer.length }
}

/** The advisor's clip as the transcription client takes it, or null when there is none. */
function readVoiceReference (meetingId) {
  const meta = readMeta(meetingId)
  try {
    const buffer = fs.readFileSync(path.join(_meetingDir(meetingId), VOICE_REFERENCE_FILE))
    return { buffer, mime: (meta && meta.voiceReferenceMime) || '' }
  } catch (_e) {
    return null
  }
}

/** Store one segment's transcript. It dies with the joined one — see `destroyTranscript`. */
function writeSegmentTranscript (meetingId, n, transcript) {
  fs.writeFileSync(
    path.join(_meetingDir(meetingId), _segmentTextName(n)),
    JSON.stringify(transcript, null, 2)
  )
}

/** Store one segment's concept summary. It expires with the text — see `_isSegmentTextFile`. */
function writeSegmentSummary (meetingId, n, summary) {
  fs.writeFileSync(
    path.join(_meetingDir(meetingId), _segmentSummaryName(n)),
    JSON.stringify(summary, null, 2)
  )
}

/** One segment's concept summary, or null when none has been written. */
function readSegmentSummary (meetingId, n) {
  try {
    return JSON.parse(fs.readFileSync(path.join(_meetingDir(meetingId), _segmentSummaryName(n)), 'utf8'))
  } catch (_e) {
    return null
  }
}

/**
 * Store one segment's placed passages — each with what was heard, the AI's suggested wording and
 * what the advisor finally kept: Original | AI Suggestion | Final Approved Value (CLAUDE.md).
 */
function writeSegmentWords (meetingId, n, words) {
  fs.writeFileSync(
    path.join(_meetingDir(meetingId), _segmentWordsName(n)),
    JSON.stringify(words, null, 2)
  )
}

/** One segment's placed passages, or null when none have been written. */
function readSegmentWords (meetingId, n) {
  try {
    return JSON.parse(fs.readFileSync(path.join(_meetingDir(meetingId), _segmentWordsName(n)), 'utf8'))
  } catch (_e) {
    return null
  }
}

/**
 * Wordsmith's record of each statement put in a box (item 15.14): the AI's draft, the client's
 * words it came from, the final wording and who agreed. It quotes the client, so it lives here
 * and dies with the transcript (`destroyTranscript`), as the concept summaries do — Mike's build
 * detail 1, 2026-09-29.
 */
const WORDSMITH_FILE = 'wordsmith.json'

/** Every Wordsmith record for this meeting, oldest first; none when absent or unreadable. */
function readWordsmithRecords (meetingId) {
  try {
    const rows = JSON.parse(fs.readFileSync(path.join(_meetingDir(meetingId), WORDSMITH_FILE), 'utf8'))
    return Array.isArray(rows) ? rows : []
  } catch (_e) {
    return []
  }
}

/**
 * Append one Wordsmith record. Throws when it cannot be written: the route writes the record
 * before the box, so a statement never reaches a plan without its record.
 * @param {string} meetingId
 * @param {object} record
 * @returns {Array<object>} every record now held
 */
function appendWordsmithRecord (meetingId, record) {
  const rows = readWordsmithRecords(meetingId)
  rows.push(record)
  fs.writeFileSync(path.join(_meetingDir(meetingId), WORDSMITH_FILE), JSON.stringify(rows, null, 2))
  return rows
}

/** Does any segment's text remain? What the expiry sweep asks before skipping a meeting. */
function hasSegmentText (meetingId) {
  try {
    return fs.readdirSync(_meetingDir(meetingId)).some(_isSegmentTextFile)
  } catch (_e) {
    return false
  }
}

/** One segment's transcript, or null when there is none. */
function readSegmentTranscript (meetingId, n) {
  try {
    return JSON.parse(fs.readFileSync(path.join(_meetingDir(meetingId), _segmentTextName(n)), 'utf8'))
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
  CORRECTIONS_FILE,
  MAX_CHUNK_BYTES,
  MAX_MEETING_BYTES,
  SEGMENT_ROLL_BYTES,
  SEGMENT_MAX_BYTES,
  MAX_SEGMENTS,
  VOICE_REFERENCE_FILE,
  MAX_VOICE_REFERENCE_BYTES,
  openSegment,
  updateSegment,
  listSegmentChunks,
  appendSegmentChunk,
  assembleSegment,
  destroySegmentAudio,
  writeVoiceReference,
  readVoiceReference,
  writeSegmentTranscript,
  readSegmentTranscript,
  hasSegmentText,
  hasAudio,
  writeSegmentSummary,
  readSegmentSummary,
  writeSegmentWords,
  readSegmentWords,
  WORDSMITH_FILE,
  readWordsmithRecords,
  appendWordsmithRecord,
  audioRoot,
  createMeeting,
  listMeetingIds,
  readMeta,
  updateMeta,
  isOwnedBy,
  appendChunk,
  listChunks,
  assemble,
  readAssembled,
  destroyAudio,
  destroyMeeting,
  destroyTranscript,
  writeTranscript,
  readTranscript,
  readCorrections,
  appendCorrection,
  writeReport,
  readReport
}
