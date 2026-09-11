'use strict'

/**
 * @file A country schedule that is being read, or has been read and not yet approved — the
 *   PROPOSAL, which reaches no picker and no forecast and never can.
 * @module server/utils/countryScheduleProposals
 *
 * Item 4.92, slice 3. The approved schedules live in `countrySchedules.js`; this is the other
 * side of the same feature and they are deliberately two stores, for the same reason
 * `depreciationProposals.js` is separate from `depreciationRates.js`.
 *
 * 🔴 WHY A PROPOSAL CANNOT LIVE IN THE APPROVED STORE. That store holds APPROVED SCHEDULES
 * ONLY: one that cannot name its approver and the date fails validation and is dropped by the
 * resolver. That is what makes "nothing unapproved is searchable" structural rather than a flag
 * somebody has to remember to test. A pending proposal kept in the same store would need a
 * flag, and the guarantee would go with it.
 *
 * 🔴 WHY A READ IS A JOB AND NOT A REQUEST. One schedule is a survey plus a request per eight
 * pages — seven for IR265, nine for a 71-page schedule — each of which may take minutes of
 * model time. The Engineering Standards give a page-render response 2000 ms and say that
 * anything longer returns a job id and polls, and the approved drawing says the same thing in
 * the manager's own words: *"you can leave this page"*. So the route starts the read, this
 * record is written as it goes, and the screen reads the record.
 *
 * ⚠ ONE IN-FLIGHT READ PER COUNTRY, and that is a design decision rather than a limitation.
 * Two reads of the same country racing would each finish by writing a whole schedule over the
 * other's, and the loser would have been paid for. A manager who wants to replace a schedule
 * waits for the first to finish or rejects it.
 *
 * ⚠ WHAT IS KEPT, AND WHAT IS NOT. The document's name, its edition, its country, who loaded
 * it and when, how far the read got, and what was read out of it. NOT THE FILE ITSELF: the PDF
 * is sent to the model, read, and discarded. Keeping firm-uploaded binaries would need a
 * storage home this feature does not have, and keeping none removes path traversal, storage
 * limits and a deletion policy from the attack surface entirely. A manager who needs the
 * document again has it — it is published on their tax authority's website.
 *
 * ⚠ A READ INTERRUPTED BY A RESTART STAYS `reading` FOR EVER UNLESS SOMETHING SAYS OTHERWISE.
 * The passes run in one process; a restart loses them, and the allowance was already spent.
 * `isStale` is how a screen tells that apart from a read still going, and it is stated here
 * rather than discovered by a manager watching a progress bar that never moves.
 *
 * Node 14, CommonJS.
 */

const crypto = require('crypto')
const { normaliseCountry, publishedKey } = require('./sourcedFigure')
const { MAX_LABEL, validateCountrySchedule } = require('./countrySchedules')

/** The overlay address one country's pending read is stored under, per scope. */
const CONFIG_KEY_PREFIX = 'country-schedule-pending:'

/**
 * Where a loaded schedule has got to.
 *   `reading`    — passes are running; nothing is approvable yet
 *   `pending`    — read, proposing a table, waiting for a manager
 *   `failed`     — the read did not produce a table. It proposes nothing
 *   `approved`   — a manager approved it; the table moved to the approved store
 *   `rejected`   — a manager threw the proposal away
 */
const STATUSES = ['reading', 'pending', 'failed', 'approved', 'rejected']

/**
 * How long a `reading` record may go without progress before a screen should call it stale.
 *
 * ⚠ IT IS GENEROUS ON PURPOSE. A single pass over eight dense pages can take minutes of model
 * time, and calling a live read dead would send a manager to spend another allowance on a read
 * that was about to finish. Twenty minutes is longer than any pass has taken and far shorter
 * than a manager's patience with a bar that never moves.
 */
const STALE_AFTER_MS = 20 * 60 * 1000

/** A new read's id. Random rather than sequential: an id is quoted in a URL by the screen. */
function newReadId () {
  return crypto.randomBytes(12).toString('hex')
}

/**
 * The config key for one country's pending read.
 * @param {*} country
 * @returns {string|null}
 */
function configKeyFor (country) {
  const code = normaliseCountry(country)
  return code === null ? null : CONFIG_KEY_PREFIX + code
}

/** Trimmed text within a cap, or '' for anything that is not usable text. */
function text (value, cap) {
  if (typeof value !== 'string') { return '' }
  return value.trim().slice(0, cap || MAX_LABEL)
}

/** A finite, non-negative whole number, or 0. */
function count (value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

/**
 * Validate one stored pending-read record.
 *
 * Written as strictly as the approved store's own validation and for the same reason: this
 * object goes out to a screen, and its `reading` is what a manager approves into a table that
 * every firm beneath them searches. A record that cannot be trusted is dropped rather than
 * repaired — a repaired record is a record nobody chose.
 *
 * @param {*} value
 * @param {object} [opts]
 * @param {*} [opts.expectCountry] - the country the caller believes this is, from the config key
 * @returns {{ok: boolean, errors: string[], value: object|null}}
 */
function validateProposal (value, opts) {
  const errors = []
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, errors: ['a pending read must be a non-array JSON object'], value: null }
  }

  const id = text(value.id, 64)
  if (!id) { errors.push('id is required') }

  const country = normaliseCountry(value.country)
  if (country === null) { errors.push('country must be a two-letter code, such as NZ') }

  const expected = opts && opts.expectCountry !== undefined ? normaliseCountry(opts.expectCountry) : null
  if (expected !== null && country !== null && expected !== country) {
    // Filed under the wrong country, the same way an approved schedule can be. Refused rather
    // than relabelled — the country decides which clients a table ever reaches.
    return { ok: false, errors: ['this read names ' + country + ' but is stored under ' + expected], value: null }
  }

  const status = STATUSES.includes(value.status) ? value.status : null
  if (status === null) { errors.push('status must be one of: ' + STATUSES.join(', ')) }

  const filename = text(value.filename)
  if (!filename) { errors.push('filename is required') }

  const loadedAt = text(value.loadedAt, 40)
  if (!loadedAt || Number.isNaN(Date.parse(loadedAt))) {
    errors.push('loadedAt must be the date the schedule was loaded')
  }

  const published = text(value.published, 20)
  if (published && publishedKey(published) === null) {
    errors.push('published must be an edition date like 2023-10 or 2023-10-31')
  }

  if (errors.length > 0) { return { ok: false, errors, value: null } }

  // The proposal itself is held as the reading left it, and is validated ONLY when a manager
  // approves it — at which point `validateCountrySchedule` is the single gate it passes
  // through, with the approver's name and the date added. Validating it here as well would be
  // two definitions of what a schedule is, and the one that matters is the one at the gate.
  const reading = (value.reading && typeof value.reading === 'object' && !Array.isArray(value.reading))
    ? value.reading
    : null

  const error = (value.error && typeof value.error === 'object' && !Array.isArray(value.error))
    ? { code: text(value.error.code, 40), message: text(value.error.message, 400) }
    : null

  return {
    ok: true,
    errors: [],
    value: {
      id,
      country,
      filename,
      documentName: text(value.documentName) || filename,
      published: published || null,
      totalPages: count(value.totalPages),
      loadedBy: text(value.loadedBy),
      loadedAt,
      updatedAt: text(value.updatedAt, 40) || loadedAt,
      status,
      passesPlanned: count(value.passesPlanned),
      passesDone: count(value.passesDone),
      passesFailed: count(value.passesFailed),
      classesSoFar: count(value.classesSoFar),
      reading,
      error,
      decidedBy: text(value.decidedBy),
      decidedAt: text(value.decidedAt, 40) || null
    }
  }
}

/**
 * The record for a read that has just started.
 *
 * @param {object} opts
 * @param {string} opts.filename
 * @param {string} opts.country
 * @param {string} opts.loadedBy - from the verified token, never a body
 * @param {Date} [opts.now]
 * @returns {object}
 */
function startedRecord (opts) {
  const now = opts.now || new Date()
  const at = now.toISOString()
  return {
    id: newReadId(),
    country: normaliseCountry(opts.country),
    filename: text(opts.filename) || 'schedule.pdf',
    documentName: text(opts.filename) || 'schedule.pdf',
    published: null,
    totalPages: 0,
    loadedBy: text(opts.loadedBy),
    loadedAt: at,
    updatedAt: at,
    status: 'reading',
    passesPlanned: 0,
    passesDone: 0,
    passesFailed: 0,
    classesSoFar: 0,
    reading: null,
    error: null,
    decidedBy: '',
    decidedAt: null
  }
}

/**
 * The record with one progress report applied.
 *
 * ⚠ IT NEVER MOVES A RECORD OUT OF `reading`. Progress is progress; finishing is a separate
 * act with its own function, so a malformed report can never mark a half-read schedule as
 * ready for a manager to approve.
 *
 * @param {object} record - the record so far
 * @param {object} progress - as `countryScheduleRead` emits it
 * @param {Date} [now]
 * @returns {object} a new record; the input is not mutated
 */
function withProgress (record, progress, now) {
  const at = (now || new Date()).toISOString()
  const next = Object.assign({}, record, { updatedAt: at })
  if (!progress || typeof progress !== 'object') { return next }

  if (progress.state === 'surveyed') {
    next.documentName = text(progress.document) || next.documentName
    next.published = text(progress.published, 20) || next.published
    next.totalPages = count(progress.totalPages)
    next.passesPlanned = count(progress.passes)
    return next
  }

  if (progress.state === 'pass-done' || progress.state === 'pass-failed') {
    next.passesDone = count(progress.pass)
    next.classesSoFar = count(progress.classes)
    if (progress.state === 'pass-failed') { next.passesFailed = count(record.passesFailed) + 1 }
  }
  return next
}

/**
 * The record with a finished reading on it.
 *
 * @param {object} record
 * @param {object|null} reading - from `countryScheduleRead.readSchedule`, or null
 * @param {{code: string, message: string}|null} [error]
 * @param {Date} [now]
 * @returns {object} a new record; the input is not mutated
 */
function withResult (record, reading, error, now) {
  const at = (now || new Date()).toISOString()
  if (!reading) {
    return Object.assign({}, record, {
      updatedAt: at,
      status: 'failed',
      reading: null,
      error: error ? { code: text(error.code, 40), message: text(error.message, 400) } : null
    })
  }
  return Object.assign({}, record, {
    updatedAt: at,
    status: 'pending',
    documentName: text(reading.document) || record.documentName,
    published: text(reading.published, 20) || record.published,
    totalPages: count(reading.totalPages),
    passesPlanned: count(reading.passesPlanned),
    classesSoFar: Array.isArray(reading.classes) ? reading.classes.length : 0,
    reading,
    error: null
  })
}

/**
 * The record marked decided.
 *
 * @param {object} record
 * @param {string} status - `approved` or `rejected`
 * @param {string} by - from the verified token
 * @param {Date} [now]
 * @returns {object} a new record; the input is not mutated
 */
function withDecision (record, status, by, now) {
  const at = (now || new Date()).toISOString()
  return Object.assign({}, record, {
    updatedAt: at,
    status,
    decidedBy: text(by),
    decidedAt: at,
    // An approved or rejected proposal keeps its shape but not its 2,800 rows: the approved
    // copy lives in the approved store, and holding a second one here would double every
    // country's storage for a record nobody reads twice.
    reading: null
  })
}

/**
 * Has a read stopped without saying so?
 *
 * 🔴 IT SEPARATES TWO STATES THAT LOOK IDENTICAL ON SCREEN — a read still working through a
 * long schedule, and one whose process died half way. Shown as the same progress bar, the
 * second is a manager watching a bar that will never move, and their allowance has already been
 * spent. Naming it is what lets the screen say so.
 *
 * @param {object|null} record - a validated record
 * @param {Date} [now]
 * @returns {boolean} true only for a `reading` record with no progress inside the window
 */
function isStale (record, now) {
  if (!record || record.status !== 'reading') { return false }
  const at = Date.parse(record.updatedAt)
  if (Number.isNaN(at)) { return true }
  return ((now || new Date()).getTime() - at) >= STALE_AFTER_MS
}

/**
 * Turn a pending proposal into the shape the APPROVED store accepts.
 *
 * 🔴 THE APPROVAL GATE, AND THERE IS ONLY ONE. The approver's name and the date are added here,
 * from the VERIFIED token, and the whole thing is then put through
 * `validateCountrySchedule` — the same checker the resolver trusts. Nothing can enter the
 * approved store by another door, and a proposal that has drifted out of shape is refused at
 * the moment of approval rather than silently serving a broken table afterwards.
 *
 * @param {object|null} record - a validated pending record
 * @param {string} approvedBy - from the verified token, never a request body
 * @param {Date} [now]
 * @returns {{ok: boolean, errors: string[], value: object|null}}
 */
function toApproved (record, approvedBy, now) {
  if (!record || record.status !== 'pending' || !record.reading) {
    return { ok: false, errors: ['there is no read waiting to be approved'], value: null }
  }
  const by = text(approvedBy, MAX_LABEL)
  if (!by) {
    return { ok: false, errors: ['the approver could not be identified'], value: null }
  }

  const reading = record.reading
  return validateCountrySchedule({
    country: record.country,
    document: reading.document,
    published: reading.published,
    approvedBy: by,
    approvedAt: (now || new Date()).toISOString(),
    pagesRead: reading.pagesRead,
    pagesUnread: reading.pagesUnread,
    classes: reading.classes,
    unresolved: reading.unresolved
  }, { expectCountry: record.country })
}

module.exports = {
  CONFIG_KEY_PREFIX,
  STATUSES,
  STALE_AFTER_MS,
  newReadId,
  configKeyFor,
  validateProposal,
  startedRecord,
  withProgress,
  withResult,
  withDecision,
  isStale,
  toApproved
}
