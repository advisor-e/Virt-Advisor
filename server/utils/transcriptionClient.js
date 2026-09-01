'use strict'

/**
 * @file Turns the recording into text, with the speakers separated — the one call this
 *   feature makes to a third party.
 * @module server/utils/transcriptionClient
 *
 * Design: `design/features/meeting-review.md` §3 and §5. Model confirmed enabled on the
 * account 2026-09-01, which was the Brief's stated pre-build check.
 *
 * 🔴 WHY THIS IS A NEW FILE AND NOT A METHOD ON `openaiClient.js`. That client speaks only to
 * `/v1/chat/completions` with a JSON body. Audio is a different endpoint AND a multipart
 * upload, so there is no version of this that is "a call added to the existing client" —
 * Brief §5 says so, and it is right.
 *
 * 🔴 THE PII EXCEPTION IS HONOURED HERE, NOT ASSUMED. `CLAUDE.md` grants Meeting Review — and
 * only Meeting Review — permission to send a consented meeting transcript to a model, under
 * four conditions. Two of them are this file's to keep:
 *
 *   (b) INTERNAL IDS AND FIRM/ADVISOR IDENTIFIERS ARE STILL STRIPPED. The exception covers the
 *       spoken content alone. So the upload carries a NEUTRAL FILENAME (`UPLOAD_FILENAME`) and
 *       nothing else — no meeting id, no firm id, no advisor, no scenario. A filename is
 *       metadata that travels with the file, and "meeting-<firmId>.webm" would have shipped
 *       exactly the identifier the condition forbids, in the one field nobody inspects.
 *   (d) THE AUDIO IS DESTROYED ONCE TRANSCRIBED. Not this file's to perform — see
 *       `meetingAudioStore.destroyAudio`, called by the route the moment this returns — but
 *       named here because the two halves are only correct together.
 *
 * ⚠ THE MODEL NAME CANNOT BE PINNED TO A DATED SNAPSHOT, AND THAT IS NOT AN OVERSIGHT. Every
 * other transcription model on the account ships dated variants; `gpt-4o-transcribe-diarize`
 * is published as an undated name only (checked 2026-09-01). So OpenAI can change what sits
 * behind it without the name changing. `DIARIZING_MODEL` is the single place it is written,
 * and the shape of what comes back is validated on every call rather than trusted — which is
 * the only defence available while no dated pin exists.
 *
 * Node 14 only: the built-in `https` module (no global `fetch`), CommonJS.
 */

const https = require('https')
const { stripInvisible } = require('./promptSafety')

const DEFAULT_HOST = 'api.openai.com'
const TRANSCRIPTIONS_PATH = '/v1/audio/transcriptions'

/**
 * The model that returns the transcript and the speaker turns from one call.
 * See the header for why there is no dated pin to use.
 */
const DIARIZING_MODEL = 'gpt-4o-transcribe-diarize'

/** The response format that carries speaker labels. */
const DIARIZED_FORMAT = 'diarized_json'

/**
 * The filename the upload carries. Deliberately says nothing — see condition (b) above.
 * The extension is generic because the browser chooses the container, not this app.
 */
const UPLOAD_FILENAME = 'recording.webm'

/**
 * Socket inactivity timeout. Generous: transcribing an hour of audio is not a page render,
 * and this is an IDLE guard rather than a total-duration cap — bytes arriving reset it, so
 * only a genuine stall trips it.
 */
const DEFAULT_TIMEOUT_MS = 600000

/**
 * Builds a multipart/form-data body.
 *
 * Written out rather than taken from a library because the app is on Node 14 with no
 * multipart-encoding dependency (`formidable` PARSES uploads, it does not build them), and
 * because the body is three fields — a case where a dependency costs more than it saves.
 *
 * @param {string} boundary
 * @param {Array.<{name: string, value: string}>} fields
 * @param {{name: string, filename: string, contentType: string, buffer: Buffer}} file
 * @returns {Buffer}
 */
function buildMultipartBody (boundary, fields, file) {
  const parts = []

  fields.forEach((f) => {
    parts.push(Buffer.from(
      '--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="' + f.name + '"\r\n\r\n' +
      f.value + '\r\n',
      'utf8'
    ))
  })

  parts.push(Buffer.from(
    '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="' + file.name + '"; filename="' + file.filename + '"\r\n' +
    'Content-Type: ' + file.contentType + '\r\n\r\n',
    'utf8'
  ))
  parts.push(file.buffer)
  parts.push(Buffer.from('\r\n--' + boundary + '--\r\n', 'utf8'))

  return Buffer.concat(parts)
}

/** Reads an entire response stream into a string. */
async function readBody (res) {
  let data = ''
  for await (const piece of res) {
    data += typeof piece === 'string' ? piece : piece.toString('utf8')
  }
  return data
}

/**
 * One segment of the model's answer, checked rather than trusted.
 *
 * 🔴 THIS IS AN LLM-OUTPUT VALIDATOR AND `CLAUDE.md` PUTS IT AT 100% TEST COVERAGE — valid,
 * malformed, missing fields, wrong types. A segment that fails is DROPPED, not repaired: a
 * repaired timestamp is a fact this app invented about a client's meeting, and Brief P4 would
 * rather have less evidence than invented evidence.
 *
 * @param {*} raw
 * @returns {{speaker: string, start: number, end: number, text: string}|null}
 */
function readSegment (raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { return null }

  const text = typeof raw.text === 'string' ? stripInvisible(raw.text).trim() : ''
  if (!text) { return null }

  const start = Number(raw.start)
  const end = Number(raw.end)
  if (!isFinite(start) || !isFinite(end) || start < 0 || end < start) { return null }

  // A missing speaker is not fatal on its own — the attribution pass below is what decides
  // who is who — but it must be a string, because it is used as an identity to group by.
  const speaker = (typeof raw.speaker === 'string' && raw.speaker.trim())
    ? raw.speaker.trim()
    : null
  if (speaker === null) { return null }

  return { speaker, start, end, text }
}

/**
 * The whole diarized response, validated.
 *
 * NEVER THROWS ON SHAPE. A response with no usable segments comes back as an empty list and
 * the caller reports a failed transcription — Brief P11: a failure says so in those words,
 * rather than presenting a tidy page of nothing.
 *
 * @param {*} parsed - the JSON body OpenAI returned
 * @returns {{segments: Array<object>, text: string, dropped: number}}
 */
function parseDiarizedResponse (parsed) {
  const none = { segments: [], text: '', dropped: 0 }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) { return none }

  const raw = Array.isArray(parsed.segments) ? parsed.segments : []
  const segments = []
  let dropped = 0
  raw.forEach((r) => {
    const seg = readSegment(r)
    if (seg) { segments.push(seg) } else { dropped += 1 }
  })

  segments.sort((a, b) => a.start - b.start)

  const text = typeof parsed.text === 'string'
    ? stripInvisible(parsed.text).trim()
    : segments.map(s => s.text).join(' ')

  return { segments, text, dropped }
}

/**
 * Decide which speaker is the advisor, and label every segment.
 *
 * 🔴 THE ANCHOR IS THE CONSENT LINE, AND THAT IS THE WHOLE DESIGN. Brief §3: the advisor
 * speaks the consent wording, and speaks it FIRST, so whoever opens the recording is the
 * advisor. The legal foundation and the technical anchor are the same sentence. This is why
 * no voice sample is stored anywhere in this feature — a stored sample held so software can
 * recognise a person is biometric data, special-category under UK and EU law, and it is
 * unnecessary.
 *
 * ⚠ AND IT IS WHY THE CONSENT LINE MUST NOT BE SHORTENED, MOVED, OR READ BY THE CLIENT.
 * Any of those three breaks attribution SILENTLY — every "did I use a metaphor" check becomes
 * a coin toss while still reading as certain. `MEETING-CONSENT-WORDING.md` §1 constraint 1
 * records the same fact from the other end.
 *
 * ⚠ A recording with only one speaker is returned UNANCHORED (`confident: false`). It happens
 * when diarization degrades, and it is the failure §5 trap 1 says must be visible rather than
 * blurred — the caller surfaces it instead of quietly attributing the whole meeting to one
 * person.
 *
 * @param {Array<object>} segments - from `parseDiarizedResponse`
 * @returns {{segments: Array<object>, advisorSpeaker: (string|null), speakerCount: number,
 *   confident: boolean}}
 */
function attributeSpeakers (segments) {
  const rows = Array.isArray(segments) ? segments : []
  const speakers = []
  rows.forEach((s) => {
    if (!speakers.includes(s.speaker)) { speakers.push(s.speaker) }
  })

  const advisorSpeaker = rows.length ? rows[0].speaker : null
  const confident = speakers.length >= 2

  return {
    segments: rows.map(s => ({
      ...s,
      role: advisorSpeaker === null
        ? 'unknown'
        : (s.speaker === advisorSpeaker ? 'advisor' : 'client')
    })),
    advisorSpeaker,
    speakerCount: speakers.length,
    confident
  }
}

/**
 * Performs the multipart POST.
 * @returns {Promise<import('http').IncomingMessage>}
 */
function postAudio (cfg) {
  return new Promise((resolve, reject) => {
    const req = cfg.requestImpl(
      {
        hostname: cfg.host,
        path: TRANSCRIPTIONS_PATH,
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data; boundary=' + cfg.boundary,
          Authorization: 'Bearer ' + cfg.apiKey,
          'Content-Length': cfg.body.length
        }
      },
      res => resolve(res)
    )
    if (cfg.timeout && cfg.timeout > 0 && typeof req.setTimeout === 'function') {
      req.setTimeout(cfg.timeout, () => {
        const err = new Error('Transcription request timed out after ' + cfg.timeout + 'ms of inactivity')
        if (typeof req.destroy === 'function') { req.destroy(err) } else { reject(err) }
      })
    }
    req.on('error', reject)
    req.write(cfg.body)
    req.end()
  })
}

/**
 * Creates the transcription client.
 *
 * @param {object} opts
 * @param {string} opts.apiKey - backend env only, never read in Nuxt
 * @param {string} [opts.host] - override host (tests)
 * @param {Function} [opts.requestImpl] - https.request-compatible fn (tests)
 * @returns {{transcribe: Function}}
 */
function createTranscriptionClient (opts) {
  const apiKey = opts && opts.apiKey
  const host = (opts && opts.host) || DEFAULT_HOST
  const requestImpl = (opts && opts.requestImpl) || https.request

  /**
   * Transcribe one whole recording, with the speakers separated and attributed.
   *
   * @param {object} params
   * @param {Buffer} params.buffer - the assembled recording
   * @param {string} [params.model] - defaults to DIARIZING_MODEL
   * @param {number} [params.timeout] - socket inactivity ms
   * @returns {Promise<{segments: Array<object>, text: string, dropped: number,
   *   advisorSpeaker: (string|null), speakerCount: number, confident: boolean,
   *   model: string, bytes: number, latencyMs: number}>}
   * @throws {Error} on a missing key, an empty recording, or a non-2xx reply
   */
  async function transcribe (params) {
    if (!apiKey) { throw new Error('OPENAI_API_KEY is not set') }
    const buffer = params && params.buffer
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new Error('transcriptionClient: there is no audio to transcribe')
    }

    const model = (params && params.model) || DIARIZING_MODEL
    const timeout = (params && typeof params.timeout === 'number')
      ? params.timeout
      : DEFAULT_TIMEOUT_MS
    const boundary = '----advisorE' + Date.now().toString(16)

    const body = buildMultipartBody(
      boundary,
      [
        { name: 'model', value: model },
        { name: 'response_format', value: DIARIZED_FORMAT }
      ],
      {
        name: 'file',
        filename: UPLOAD_FILENAME,
        contentType: 'application/octet-stream',
        buffer
      }
    )

    const startedAt = Date.now()
    const res = await postAudio({ apiKey, host, boundary, body, requestImpl, timeout })
    const status = res.statusCode || 0
    const raw = await readBody(res)
    const latencyMs = Date.now() - startedAt

    if (status < 200 || status >= 300) {
      // The reply is truncated: an error body from a third party is not something to log
      // whole when the request that produced it carried a client's meeting.
      throw new Error('Transcription API error ' + status + ': ' + raw.slice(0, 300))
    }

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch (_e) {
      throw new Error('Transcription API returned a reply that is not JSON')
    }

    const read = parseDiarizedResponse(parsed)
    const attributed = attributeSpeakers(read.segments)

    return {
      segments: attributed.segments,
      text: read.text,
      dropped: read.dropped,
      advisorSpeaker: attributed.advisorSpeaker,
      speakerCount: attributed.speakerCount,
      confident: attributed.confident,
      model,
      bytes: buffer.length,
      latencyMs
    }
  }

  return { transcribe }
}

module.exports = {
  DIARIZING_MODEL,
  DIARIZED_FORMAT,
  UPLOAD_FILENAME,
  TRANSCRIPTIONS_PATH,
  buildMultipartBody,
  readSegment,
  parseDiarizedResponse,
  attributeSpeakers,
  createTranscriptionClient
}
