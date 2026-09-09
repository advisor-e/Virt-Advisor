'use strict'

/**
 * @file A client's request for a copy of what was recorded about them — the record of the
 *   request, and of each meeting released against it.
 * @module server/utils/clientCopyRequests
 *
 * Design: `design/mockups/client-record-request.html`, drawn 2026-09-10, all eight of its
 * questions ruled by Mike the same day and built on his word *"go build it"*. It closes
 * finding **B** of `design/MEETING-REVIEW-DPIA.md` §10 and item 7 of
 * `design/features/meeting-review.md` §4 — **IPP6** (access) and **IPP7** (correction).
 *
 * 🔴 THIS IS NOT A CLIENT PORTAL AND NOTHING HERE IS CLIENT-FACING. There is no client
 * sign-in anywhere in this application. A request arrives by email, by phone, or in the room;
 * somebody at the firm records it here. Every function takes the firm id from a verified
 * token, never from a request body — the same rule as the client register itself.
 *
 * 🔴 THE ADVISOR ALONE RELEASES A MEETING (Mike's ruling 2, which REVERSED the drawing's own
 * recommendation): *"the advisor alone can send. The firm manager will never have the time to
 * check every interaction of their advisors and in many cases, those advisors will in fact be
 * senior partners."* A client's request therefore reaches across EVERY advisor who ever met
 * them, and **no one person can answer it**. It is shared work under a single clock, closed
 * when the last advisor has released their part. ⚠ **A route that lets one caller release
 * every meeting on a request has not built what was ruled.**
 *
 * 🔴 THE ONE EXCEPTION IS THE BREAK-GLASS (ruling 2b): a firm manager may release a meeting
 * ONLY by declaring that its advisor can no longer act. `va_clients` is firm-scoped with no
 * owning advisor, so there is no "current advisor" to fall back on and a client's right does
 * not lapse because a partner retired. ⚠ **The declaration is UNVERIFIABLE and that is stated
 * on the screen** — this app holds no advisors table and does not handle sign-in, so it cannot
 * know somebody has left. It is permanent and visible in the record, which is the whole of the
 * deterrent; the same shape as the consent tick, which this app has never been able to verify
 * either.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * 🔴 STORAGE: TWO KEY PREFIXES, ONE ROW PER WRITER. NEVER ONE ROW HOLDING EVERYTHING.
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * This is item 4.75's lost-update fault, and ruling 2 walks straight into it: two advisors
 * releasing their own meetings against one request at the same moment would read-modify-write
 * the same row and one release would vanish, leaving a client's meeting unsent with the screen
 * showing it sent. So a RELEASE is addressed by request AND meeting — `<requestId>:<meetingId>`
 * — and exactly one advisor can ever write any given row. `loadFirmConfigsByPrefix` reads the
 * whole set back in one query; its own header says this is what it exists for.
 *
 * The REQUEST row is written when it is logged and again when it is closed, both by one person
 * at one moment, so it carries no such hazard.
 *
 * Version history and restore come free from `firmOverlay`, and there is no schema change.
 *
 * Node 14, CommonJS.
 */

const crypto = require('crypto')

/**
 * The overlay addresses. 🔴 THESE ARE KEY PREFIXES, NOT KEYS. Build one with `requestConfigKey`
 * or `releaseConfigKey`, never by hand.
 * @type {Object.<string, string>}
 */
const CONFIG_KEYS = {
  request: 'client-copy-request:',
  release: 'client-copy-release:'
}

/** Separates a release's two ids inside its key suffix. Both ids are hex, so this is safe. */
const KEY_SEPARATOR = ':'

/** Dev-only stand-ins, used when there is no MySQL. */
const DEV_FILES = {
  request: 'data/dev-client-copy-requests.json',
  release: 'data/dev-client-copy-releases.json'
}

/** A request id, and the shape every id is checked against before it reaches storage. */
const REQUEST_ID_PATTERN = /^[0-9a-f]{32}$/

/**
 * What a client asked for.
 *
 * 🔴 THREE KINDS, AND THEY ARE NOT INTERCHANGEABLE. `copy` is IPP6 access. `correction` is
 * IPP7 — an attached statement, never an edit (ruling 4). `deletion` is early destruction
 * before the retention date (ruling 5), a courtesy in New Zealand and a hard right with a
 * one-month deadline in the UK and EU.
 * @type {Object.<string, string>}
 */
const KINDS = {
  copy: 'copy',
  correction: 'correction',
  deletion: 'deletion'
}

const KIND_VALUES = [KINDS.copy, KINDS.correction, KINDS.deletion]

/**
 * How the request reached the firm. Recorded because "who asked, and how" is the first thing
 * anybody checks when a request is later questioned — and because there is no other trace of
 * it: this application never receives the request itself.
 */
const CHANNELS = ['email', 'phone', 'in-person', 'letter', 'other']

/**
 * The documents a release may carry.
 *
 * 🔴 `coaching` IS ABSENT AND MUST STAY ABSENT. Ruling 1, in Mike's own words: *"they don't get
 * the advisor feedback notes. The advisor is covered by their terms of engagement... our
 * performance report is part of the advisors training and quality control for the firm -
 * clients never get these notes."* The drawing's own fallback — releasing the client's
 * quotations from the coaching notes without the observations around them — is **dropped, not
 * deferred**, and no session revives it as a compromise. This list is the enforcement.
 */
const RELEASABLE = ['transcript', 'summary']

/** A request is open until every meeting on it is settled, then closed by hand. */
const STATES = { open: 'open', closed: 'closed' }

/** Caps. A note is a reminder of a phone call, not a case file. */
const MAX_NOTE_LENGTH = 500
const MAX_NAME_LENGTH = 128
const MAX_CLIENT_ID_LENGTH = 64

/** @returns {string} a fresh request id */
function newRequestId () {
  return crypto.randomBytes(16).toString('hex')
}

/**
 * The overlay key one request is stored under.
 * @param {string} requestId
 * @returns {string}
 */
function requestConfigKey (requestId) {
  if (!REQUEST_ID_PATTERN.test(String(requestId))) {
    throw new Error('bad request id')
  }
  return CONFIG_KEYS.request + requestId
}

/**
 * The overlay key one meeting's release is stored under.
 *
 * 🔴 BOTH IDS ARE IN THE ADDRESS. That is what makes the row single-writer — see this file's
 * storage note. A key built from the request alone would reinstate the lost update.
 *
 * @param {string} requestId
 * @param {string} meetingId - 32 hex, as `meetingAudioStore` mints them
 * @returns {string}
 */
function releaseConfigKey (requestId, meetingId) {
  if (!REQUEST_ID_PATTERN.test(String(requestId))) {
    throw new Error('bad request id')
  }
  if (!REQUEST_ID_PATTERN.test(String(meetingId))) {
    throw new Error('bad meeting id')
  }
  return CONFIG_KEYS.release + requestId + KEY_SEPARATOR + meetingId
}

/**
 * Split a release key's suffix back into its two ids.
 * @param {string} suffix - what `loadFirmConfigsByPrefix` returns as the key
 * @returns {{requestId: string, meetingId: string}|null} null when it is not one of ours
 */
function releaseIdsFromSuffix (suffix) {
  const parts = String(suffix || '').split(KEY_SEPARATOR)
  if (parts.length !== 2) { return null }
  if (!REQUEST_ID_PATTERN.test(parts[0]) || !REQUEST_ID_PATTERN.test(parts[1])) { return null }
  return { requestId: parts[0], meetingId: parts[1] }
}

/** Trim and cap, returning '' for anything unusable. */
function _text (value, max) {
  if (typeof value !== 'string') { return '' }
  return value.trim().slice(0, max)
}

/**
 * Checks a request being logged.
 *
 * Fails closed. A request with no client cannot be served — the meetings are found BY client —
 * so it is refused rather than stored as a note nobody can action.
 *
 * @param {object} input - `{clientId, kind, receivedAt, channel, note}`
 * @returns {{ok: boolean, errors: string[], value: (object|null)}}
 */
function validateNewRequest (input) {
  const errors = []
  const body = input && typeof input === 'object' ? input : {}

  const clientId = _text(body.clientId, MAX_CLIENT_ID_LENGTH)
  if (!clientId) { errors.push('a client is required') }

  const kind = typeof body.kind === 'string' ? body.kind : ''
  if (!KIND_VALUES.includes(kind)) {
    errors.push('kind must be one of: ' + KIND_VALUES.join(', '))
  }

  const channel = typeof body.channel === 'string' ? body.channel : ''
  if (!CHANNELS.includes(channel)) {
    errors.push('channel must be one of: ' + CHANNELS.join(', '))
  }

  // The date the CLIENT asked, which is when the clock starts — not the date somebody got
  // round to typing it in. A request logged a week late is already a week into its allowance,
  // and a screen that pretended otherwise would hide exactly the lateness it exists to show.
  let receivedAt = null
  if (body.receivedAt === undefined || body.receivedAt === null || body.receivedAt === '') {
    errors.push('the date the client asked is required')
  } else {
    const when = new Date(String(body.receivedAt))
    if (isNaN(when.getTime())) {
      errors.push('the date the client asked is not a date')
    } else {
      receivedAt = when.toISOString()
    }
  }

  const note = _text(body.note, MAX_NOTE_LENGTH)

  if (errors.length) { return { ok: false, errors, value: null } }
  return { ok: true, errors: [], value: { clientId, kind, channel, receivedAt, note } }
}

/**
 * Reads a stored request back, keeping only what is well-formed.
 *
 * NEVER THROWS. A malformed row reads as absent so the tab still opens — a manager who cannot
 * open the screen cannot answer the client waiting on it.
 *
 * @param {*} stored
 * @param {string} requestId - the id from the key, which is the identity
 * @returns {object|null}
 */
function readStoredRequest (stored, requestId) {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) { return null }
  if (!REQUEST_ID_PATTERN.test(String(requestId))) { return null }

  const checked = validateNewRequest(stored)
  if (!checked.ok) { return null }

  const state = stored.state === STATES.closed ? STATES.closed : STATES.open
  return {
    id: requestId,
    clientId: checked.value.clientId,
    kind: checked.value.kind,
    channel: checked.value.channel,
    receivedAt: checked.value.receivedAt,
    note: checked.value.note,
    loggedBy: _text(stored.loggedBy, MAX_NAME_LENGTH),
    loggedAt: typeof stored.loggedAt === 'string' ? stored.loggedAt : checked.value.receivedAt,
    state,
    closedAt: state === STATES.closed && typeof stored.closedAt === 'string' ? stored.closedAt : null,
    closedBy: state === STATES.closed ? _text(stored.closedBy, MAX_NAME_LENGTH) : '',
    outcome: state === STATES.closed ? _text(stored.outcome, MAX_NOTE_LENGTH) : ''
  }
}

/**
 * Reads a stored release back.
 *
 * 🔴 `documents` IS FILTERED AGAINST `RELEASABLE`, not trusted. A stored row naming `coaching`
 * — however it got there — is read back without it. Ruling 1 is enforced on the way out as
 * well as on the way in, because a rule that only guards the entrance is one migration away
 * from being untrue.
 *
 * @param {*} stored
 * @param {{requestId: string, meetingId: string}} ids - from the key
 * @returns {object|null}
 */
function readStoredRelease (stored, ids) {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) { return null }
  if (!ids || !REQUEST_ID_PATTERN.test(ids.requestId) ||
      !REQUEST_ID_PATTERN.test(ids.meetingId)) {
    return null
  }
  if (typeof stored.at !== 'string' || isNaN(new Date(stored.at).getTime())) { return null }

  const documents = Array.isArray(stored.documents)
    ? stored.documents.filter(d => RELEASABLE.includes(d))
    : []

  let breakGlass = null
  if (stored.breakGlass && typeof stored.breakGlass === 'object') {
    const declaredBy = _text(stored.breakGlass.declaredBy, MAX_NAME_LENGTH)
    // A break-glass with nobody's name against it is not a break-glass. Reading it back as an
    // ordinary release would erase the one fact it exists to preserve, so the whole row is
    // refused instead.
    if (!declaredBy) { return null }
    breakGlass = {
      absentAdvisor: _text(stored.breakGlass.absentAdvisor, MAX_NAME_LENGTH),
      declaredBy,
      at: typeof stored.breakGlass.at === 'string' ? stored.breakGlass.at : stored.at
    }
  }

  return {
    requestId: ids.requestId,
    meetingId: ids.meetingId,
    advisor: _text(stored.advisor, MAX_NAME_LENGTH),
    releasedBy: _text(stored.releasedBy, MAX_NAME_LENGTH),
    at: stored.at,
    documents,
    breakGlass
  }
}

/**
 * Every request a firm holds, newest first.
 *
 * @param {string} firmId - from the verified token
 * @param {Function} loadByPrefix - async (firmId, prefix) => `{suffix: value}`
 * @returns {Promise<Array<object>>} never null; an unreadable store reads as none
 */
async function listRequests (firmId, loadByPrefix) {
  if (!firmId) { return [] }
  let rows
  try {
    rows = await loadByPrefix(firmId, CONFIG_KEYS.request)
  } catch (err) {
    console.error('[client-copy-requests] list failed:', err.message)
    return []
  }

  const out = []
  Object.keys(rows || {}).forEach((suffix) => {
    const req = readStoredRequest(rows[suffix], suffix)
    if (req) { out.push(req) }
  })

  out.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
  return out
}

/**
 * Every release recorded against one request.
 *
 * @param {string} firmId
 * @param {string} requestId
 * @param {Function} loadByPrefix
 * @returns {Promise<Array<object>>}
 */
async function listReleases (firmId, requestId, loadByPrefix) {
  if (!firmId || !REQUEST_ID_PATTERN.test(String(requestId))) { return [] }
  let rows
  try {
    rows = await loadByPrefix(firmId, CONFIG_KEYS.release)
  } catch (err) {
    console.error('[client-copy-requests] releases read failed:', err.message)
    return []
  }

  const out = []
  Object.keys(rows || {}).forEach((suffix) => {
    const ids = releaseIdsFromSuffix(suffix)
    if (!ids || ids.requestId !== requestId) { return }
    const rel = readStoredRelease(rows[suffix], ids)
    if (rel) { out.push(rel) }
  })

  out.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  return out
}

/**
 * Build the row stored when an advisor releases one meeting.
 *
 * 🔴 `documents` IS NOT TAKEN FROM THE CALLER. It is `RELEASABLE` intersected with what the
 * meeting actually still holds, so a release can never claim to have handed over a Meeting
 * Summary that was never approved, or a transcript that has expired. The client is told what
 * they actually got.
 *
 * @param {object} args
 * @param {string} args.advisor - who took the meeting, from its record
 * @param {string} args.releasedBy - the caller's own verified name
 * @param {Array<string>} args.holds - what the meeting still holds, from `documentsHeld`
 * @param {object|null} [args.breakGlass] - `{absentAdvisor, declaredBy}` when ruling 2b applies
 * @param {Date} [args.now]
 * @returns {object} the row to store
 */
function buildRelease (args) {
  const a = args || {}
  const at = (a.now instanceof Date ? a.now : new Date()).toISOString()
  const holds = Array.isArray(a.holds) ? a.holds : []

  const row = {
    advisor: _text(a.advisor, MAX_NAME_LENGTH),
    releasedBy: _text(a.releasedBy, MAX_NAME_LENGTH),
    at,
    documents: RELEASABLE.filter(d => holds.includes(d)),
    breakGlass: null
  }

  if (a.breakGlass && typeof a.breakGlass === 'object') {
    row.breakGlass = {
      absentAdvisor: _text(a.breakGlass.absentAdvisor, MAX_NAME_LENGTH),
      declaredBy: _text(a.breakGlass.declaredBy, MAX_NAME_LENGTH),
      at
    }
  }

  return row
}

/**
 * What one meeting still holds that a client could be given.
 *
 * 🔴 THE COACHING NOTES ARE NEVER CONSIDERED. `RELEASABLE` does not name them and this does
 * not look for them — ruling 1.
 *
 * @param {object} store - `meetingAudioStore`
 * @param {string} meetingId
 * @returns {Array<string>} some subset of `RELEASABLE`
 */
function documentsHeld (store, meetingId) {
  const held = []
  try {
    if (store.readTranscript(meetingId)) { held.push('transcript') }
  } catch (_e) { /* absent reads as not held */ }
  try {
    const summary = store.readReport(meetingId, 'summary')
    // 🔴 AN UNAPPROVED SUMMARY IS NOT RELEASABLE. P7 makes the summary a DRAFT until the
    // advisor approves it — "the app writes; the advisor publishes". Handing a client an
    // unapproved draft would publish on the advisor's behalf, which is the one thing P7
    // exists to prevent, and the draft may contain wording they were about to change.
    if (summary && summary.approvedAt) { held.push('summary') }
  } catch (_e) { /* absent reads as not held */ }
  return held
}

/**
 * Every meeting this firm holds for one client, newest first, with what each still holds.
 *
 * 🔴 IT DOES NOT FILTER ON ADVISOR, and that is the difference from
 * `meetingFollowThrough.findPrevious`, which walks the same set. A client's request is about
 * the CLIENT: every meeting anybody at the firm recorded with them is in scope, whoever took
 * it. Filtering by the caller here would quietly answer half a request.
 *
 * @param {object} store - `meetingAudioStore`
 * @param {string} firmId - from the verified token
 * @param {string} clientId - the firm's own register id
 * @returns {Array<object>} `{meetingId, advisor, createdAt, retentionMonths, transcriptPurgedAt,
 *   scenarioId, holds}`
 */
function meetingsForClient (store, firmId, clientId) {
  if (!firmId || !clientId) { return [] }

  const out = []
  store.listMeetingIds().forEach((id) => {
    let meta = null
    try {
      meta = store.readMeta(id)
    } catch (_e) {
      return
    }
    if (!meta || meta.firmId !== firmId || meta.clientId !== clientId) { return }

    out.push({
      meetingId: meta.meetingId,
      advisor: meta.advisor || '',
      // ⚠ NULL ON EVERY MEETING RECORDED BEFORE 2026-09-10 — a named deviation from the
      // drawing, which shows "Recorded by Owen Fraser". `createMeeting` says why it cannot be
      // recovered. The screen falls back to the identifier rather than inventing a name.
      advisorName: meta.advisorName || null,
      createdAt: meta.createdAt || null,
      scenarioId: meta.scenarioId || null,
      retentionMonths: typeof meta.retentionMonths === 'number' ? meta.retentionMonths : null,
      transcriptPurgedAt: typeof meta.transcriptPurgedAt === 'string' ? meta.transcriptPurgedAt : null,
      deletedForClientAt: typeof meta.deletedForClientAt === 'string' ? meta.deletedForClientAt : null,
      holds: documentsHeld(store, meta.meetingId)
    })
  })

  out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return out
}

module.exports = {
  CONFIG_KEYS,
  KEY_SEPARATOR,
  DEV_FILES,
  REQUEST_ID_PATTERN,
  KINDS,
  KIND_VALUES,
  CHANNELS,
  RELEASABLE,
  STATES,
  MAX_NOTE_LENGTH,
  MAX_NAME_LENGTH,
  newRequestId,
  requestConfigKey,
  releaseConfigKey,
  releaseIdsFromSuffix,
  validateNewRequest,
  readStoredRequest,
  readStoredRelease,
  listRequests,
  listReleases,
  buildRelease,
  documentsHeld,
  meetingsForClient
}
