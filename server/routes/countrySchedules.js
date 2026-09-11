'use strict'

/**
 * @file The routes behind Country Rate Schedules — loading one, watching it read, approving it,
 *   and searching the table it produced.
 * @module server/routes/countrySchedules
 *
 * Item 4.92, slice 3. Built from `design/mockups/depreciation-rates-country-schedules.html`,
 * approved by Mike 2026-09-11 with all three of its decisions ruled.
 *
 * 🔴 LOADING AND APPROVING ARE THE GLOBAL GROUP MANAGER'S ALONE — his ruling of 2026-09-11, and
 * it is enforced by the ROUTE rather than hidden on a screen. `mayLoadSchedules` reads the tier
 * from the caller's own VERIFIED scope; a firm manager who finds the URL is refused, exactly as
 * an advisor is refused the approve routes on the sibling feature.
 *
 * 🔴 SEARCHING IS EVERYONE'S, and that asymmetry is the feature. One person loads a country's
 * schedule; every firm beneath them searches it from their own class picker. The search resolves
 * through `scopeChain` from the caller's own scope, so a group can only ever read the schedule
 * its own chain holds — never another brand's.
 *
 * 🔴 A READ IS A JOB, NOT A REQUEST, AND THAT IS THE ENGINEERING STANDARD RATHER THAN A
 * PREFERENCE. One schedule is a survey plus a request per eight pages, each of which may take
 * minutes of model time; a page-render response has 2000 ms and anything longer returns a job
 * and polls. The drawing says the same thing in the manager's own words — *"you can leave this
 * page"*. So POST starts the read and answers immediately; the screen reads the record.
 *
 * ⚠ THE ALLOWANCE IS SPENT ONE LINE BEFORE THE FIRST MODEL CALL, and it is the SCHEDULE
 * allowance — ten per scope per rolling 24 hours, Mike 2026-09-11 — never the firm's twenty
 * documents. A file refused before that line costs nothing.
 *
 * ⚠ THE PDF IS NEVER KEPT. It is read into memory, sent to the model, and the temporary copy
 * formidable made is deleted. Keeping none removes path traversal, a storage quota and a
 * deletion policy from the attack surface at once.
 *
 * Node 14, CommonJS.
 */

const fs = require('fs')
const path = require('path')
const { formidable } = require('formidable')
const overlay = require('../utils/firmOverlay')
const { sendError } = require('../utils/sendError')
const { devFallbackAllowed } = require('../utils/dbFailure')
const { normaliseCountry } = require('../utils/sourcedFigure')
const schedules = require('../utils/countrySchedules')
const proposals = require('../utils/countryScheduleProposals')
const reader = require('../utils/countryScheduleRead')
const aiLoadBudget = require('../utils/aiLoadBudget')

/** Most classes one search may return. The picker shows a handful; the table is 2,800 rows. */
const SEARCH_LIMIT = 50

/**
 * The dev-JSON fallback, one file for this feature's two stores.
 *
 * 🔴 WHY THIS EXISTS, AND IT WAS FOUND BY RUNNING THE THING (2026-09-11). This file already had
 * `devFallbackAllowed` on both its reads and its writes — the guard was copied from
 * `depreciationRates.js` and THE STORE IT GUARDS WAS NOT. A read therefore returned `null` and a
 * write was swallowed, so on any machine without MySQL the feature could read a schedule and
 * keep nothing. The real IR265 was read here that day — 2,303 classes out of 62 pages, six passes
 * of seven — and every row of it was discarded, after the reading allowance had been spent and
 * recorded. Nothing in the suite could catch it: `countrySchedules.routes.test.js` replaces the
 * whole overlay with mocks, so no test had ever reached the storage layer at all.
 *
 * ⚠ ONE FILE, KEYED BY SCOPE AND THEN BY CONFIG KEY — unlike the sibling's file-per-key, because
 * these keys are PREFIXED (`country-schedule:NZ`, `country-schedule-pending:NZ`) and a country is
 * added by using one. `listSchedules` reads by prefix, which a file-per-key shape cannot answer.
 *
 * ⚠ DEV ONLY, and the guard is `devFallbackAllowed`, never a bare NODE_ENV test: a live MySQL
 * that REFUSES a write must still fail loudly rather than land in a scratch file and report
 * success. That distinction is the whole subject of `utils/dbFailure.js`.
 */
const DEV_FILE = path.resolve(__dirname, '../../data/dev-country-schedules.json')

/** Dev-only: everything this fallback holds, or `{}` when there is no file yet. */
function devAll () {
  try {
    const all = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8'))
    return (all && typeof all === 'object' && !Array.isArray(all)) ? all : {}
  } catch (e) { return {} }
}

/** Dev-only: this scope's own stored value for one key, or null. */
function devRead (scopeId, key) {
  const own = devAll()[scopeId]
  if (!own || typeof own !== 'object' || Array.isArray(own)) { return null }
  const value = own[key]
  return (value === undefined) ? null : value
}

/** Dev-only: persist this scope's own value for one key. */
function devWrite (scopeId, key, value) {
  const all = devAll()
  const own = (all[scopeId] && typeof all[scopeId] === 'object' && !Array.isArray(all[scopeId]))
    ? all[scopeId]
    : {}
  own[key] = value
  all[scopeId] = own
  fs.writeFileSync(DEV_FILE, JSON.stringify(all, null, 2))
}

/**
 * Dev-only: this scope's keys under one prefix, mapped by the part AFTER the prefix — the same
 * shape `overlay.loadFirmConfigsByPrefix` returns, so `listSchedules` cannot tell the two apart.
 */
function devReadByPrefix (scopeId, keyPrefix) {
  const own = devAll()[scopeId]
  const out = {}
  if (!own || typeof own !== 'object' || Array.isArray(own)) { return out }
  Object.keys(own).forEach((key) => {
    if (key.indexOf(keyPrefix) !== 0) { return }
    out[key.slice(keyPrefix.length)] = own[key]
  })
  return out
}

/**
 * One scope's own stored value for a key, with no cascade.
 *
 * ⚠ NEVER `loadFirmConfig` FOR A WRITE-SIDE READ. A country schedule key is not a cascading one
 * (see `countrySchedules.js`), so the two are the same call today — but a read that is about to
 * be written back must be this scope's own row, and saying so here is cheaper than discovering
 * it the day the key list changes.
 *
 * @param {string} scopeId
 * @param {string} key
 * @returns {Promise<*|null>}
 */
async function readOwn (scopeId, key) {
  try {
    return await overlay.loadFirmConfig(scopeId, key)
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    return devRead(scopeId, key)
  }
}

/**
 * Write one scope's value for a key.
 * @param {string} scopeId
 * @param {string} key
 * @param {*} value
 * @param {string} userEmail
 * @returns {Promise<void>}
 */
async function writeOwn (scopeId, key, value, userEmail) {
  try {
    await overlay.saveFirmConfig(scopeId, key, value, userEmail || '')
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    devWrite(scopeId, key, value)
  }
}

/**
 * Every value this scope holds under one prefix, through the overlay or the dev file.
 *
 * ⚠ THE ONE READ IN THIS FILE THAT DID NOT GO THROUGH A GUARD, which is why the schedules screen
 * answered 500 on a machine with no database while every other call on it worked. A storage
 * failure a live server ACTUALLY refused still propagates, and `listSchedules` still reports it:
 * an empty library and a broken one must never look the same.
 *
 * @param {string} scopeId
 * @param {string} keyPrefix
 * @returns {Promise<Object.<string, *>>}
 */
async function readOwnByPrefix (scopeId, keyPrefix) {
  try {
    return await overlay.loadFirmConfigsByPrefix(scopeId, keyPrefix)
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    return devReadByPrefix(scopeId, keyPrefix)
  }
}

/**
 * Reads the multipart body of an upload. formidable v2's `parse` is callback-style, so it is
 * wrapped to keep the `await` shape the handler reads in.
 *
 * @param {object} form
 * @param {object} req
 * @returns {Promise<[object, object]>} `[fields, files]`
 */
function parseForm (form, req) {
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) { reject(err); return }
      resolve([fields, files])
    })
  })
}

/** One field from a formidable v2/v3 body, which may hand back an array. */
function field (fields, name) {
  const v = fields && fields[name]
  return Array.isArray(v) ? v[0] : v
}

/**
 * Run the passes and keep the stored record in step, after the response has already gone.
 *
 * ⚠ IT IS DELIBERATELY NOT AWAITED BY THE HANDLER, and every fault inside it is caught here.
 * An unhandled rejection from a detached promise takes the process down on some Node versions,
 * and a schedule read must never be able to do that — the allowance has already been spent and
 * every other request in flight would go with it.
 *
 * ⚠ IT WRITES PROGRESS ON EVERY PASS, which is a database write per eight pages. That is the
 * price of a screen that can be left and come back to, and it is one write per minute or two
 * rather than per second.
 *
 * @param {object} opts - `{ scopeId, userEmail, key, record, country, filename, buffer }`
 * @returns {Promise<void>} resolves when the read has finished and been recorded
 */
async function _runRead (opts) {
  let record = opts.record

  const persist = async (next) => {
    record = next
    try {
      await writeOwn(opts.scopeId, opts.key, record, opts.userEmail)
    } catch (err) {
      // A progress write that fails must not stop the read: the passes are already paid for and
      // the result is worth far more than the progress bar.
      console.error('[country-schedules] progress write failed:', err.message)
    }
  }

  // Progress arrives synchronously from the reader, so the writes are chained rather than
  // awaited inline — the reader must not be held up by a database round trip between passes.
  let chain = Promise.resolve()
  const onProgress = (p) => {
    chain = chain.then(() => persist(proposals.withProgress(record, p)))
  }

  try {
    const result = await reader.readSchedule({
      scopeId: opts.scopeId,
      country: opts.country,
      filename: opts.filename,
      buffer: opts.buffer,
      loadFirmConfig: (scopeId, key) => overlay.loadFirmConfig(scopeId, key),
      onProgress
    })
    await chain
    await persist(result.ok
      ? proposals.withResult(record, result.reading, null)
      : proposals.withResult(record, null, { code: result.code, message: result.message }))
  } catch (err) {
    console.error('[country-schedules] read failed outright:', err.message)
    try {
      await persist(proposals.withResult(record, null, {
        code: 'READ_FAILED',
        message: 'The reading stopped unexpectedly. Nothing has been stored.'
      }))
    } catch (e) {
      console.error('[country-schedules] could not record the failure:', e.message)
    }
  }
}

/**
 * POST /api/firm-manager/country-schedules  (global group manager)
 *
 * Load one country's published schedule and start reading it. Answers as soon as the read has
 * started; the screen watches the record.
 *
 * @route POST /api/firm-manager/country-schedules
 * @param {object} req - multipart: a `file` part and a `country` field
 * @returns {{started: boolean, read: object}}
 */
async function loadSchedule (req, res) {
  if (!schedules.mayLoadSchedules(req.firmId)) {
    // Refused by the route, never hidden on the screen. A schedule reaches every firm in the
    // group, so who may load one is a permission and not a piece of navigation.
    return sendError(res, 403, 'NOT_PERMITTED',
      'Country schedules are loaded by the global group manager.')
  }

  const form = formidable({
    maxFileSize: reader.MAX_PDF_BYTES,
    filter ({ mimetype }) { return mimetype === reader.PDF_MIME }
  })

  let fields, files
  try {
    ;[fields, files] = await parseForm(form, req)
  } catch (err) {
    console.error('[country-schedules] upload parse failed:', err.message)
    return sendError(res, 400, 'UPLOAD_FAILED',
      'That file could not be read. It must be a PDF of 20 MB or less.')
  }

  const country = normaliseCountry(field(fields, 'country'))
  if (country === null) {
    return sendError(res, 400, 'INVALID_COUNTRY', 'country must be a two-letter code, such as NZ')
  }

  const uploaded = files && files.file
    ? (Array.isArray(files.file) ? files.file[0] : files.file)
    : null
  if (!uploaded) {
    return sendError(res, 400, 'NO_FILE', 'A file field named "file" is required')
  }

  let buffer
  try {
    buffer = fs.readFileSync(uploaded.filepath)
  } catch (err) {
    console.error('[country-schedules] upload read failed:', err.message)
    return sendError(res, 400, 'UPLOAD_FAILED', 'That file could not be read')
  } finally {
    // The temporary copy goes whatever happens next. A failed read must not leave a 20 MB file
    // behind on every attempt.
    try { fs.unlinkSync(uploaded.filepath) } catch (e) { /* already gone */ }
  }

  // The declared MIME type comes from the browser, so the first bytes are checked as well.
  if (buffer.slice(0, 5).toString('latin1') !== '%PDF-') {
    return sendError(res, 400, 'NOT_A_PDF',
      'That file is not a PDF. Load the schedule as it is published by the tax authority.')
  }

  const key = proposals.configKeyFor(country)

  // One in-flight read per country. Two racing reads would each finish by writing a whole
  // schedule over the other's, and the loser would have been paid for.
  let existing = null
  try {
    existing = await readOwn(req.firmId, key)
  } catch (err) {
    console.error('[country-schedules] pending read failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'The schedules held here could not be read')
  }
  const current = existing ? proposals.validateProposal(existing, { expectCountry: country }) : { ok: false }
  if (current.ok && current.value.status === 'reading' && !proposals.isStale(current.value)) {
    return sendError(res, 409, 'ALREADY_READING',
      'This country\'s schedule is being read now. Wait for it to finish, or reject it first.')
  }

  // 🔴 THE ALLOWANCE IS SPENT HERE, ONE LINE BEFORE THE FIRST MODEL CALL, AND THAT POSITION IS
  // THE POINT. A refusal at this line costs nothing — the file is in memory and its temporary
  // copy already deleted, and not a byte has left the building. It is the SCHEDULE allowance,
  // ten per scope per rolling 24 hours, never the firm's twenty documents; the reasoning for
  // both, and for failing closed, is in `utils/aiLoadBudget.js`.
  const budget = await aiLoadBudget.consumeScheduleLoad(req.firmId, req.userEmail)
  if (!budget.ok) {
    return sendError(res, budget.status, budget.code, budget.message)
  }

  const filename = uploaded.originalFilename || uploaded.newFilename || 'schedule.pdf'
  const record = proposals.startedRecord({ filename, country, loadedBy: req.userEmail })

  try {
    await writeOwn(req.firmId, key, record, req.userEmail)
  } catch (err) {
    console.error('[country-schedules] could not record the start of the read:', err.message)
    return sendError(res, 500, 'DB_ERROR',
      'The schedule could not be recorded, so nothing has been read.')
  }

  // Detached on purpose — see `_runRead`. Its own faults are caught inside it.
  _runRead({
    scopeId: req.firmId,
    userEmail: req.userEmail,
    key,
    record,
    country,
    filename,
    buffer
  })

  res.send(202, { started: true, read: record })
}

/**
 * GET /api/firm-manager/country-schedules  (global group manager)
 *
 * Every country this scope holds a schedule for, and every read in flight or waiting.
 *
 * @route GET /api/firm-manager/country-schedules
 * @returns {{schedules: object[], reads: object[], mayLoad: boolean}}
 */
async function listSchedules (req, res) {
  try {
    const [approved, pending] = await Promise.all([
      readOwnByPrefix(req.firmId, schedules.CONFIG_KEY_PREFIX),
      readOwnByPrefix(req.firmId, proposals.CONFIG_KEY_PREFIX)
    ])

    const held = []
    Object.keys(approved || {}).forEach((code) => {
      const { ok, value } = schedules.validateCountrySchedule(approved[code], { expectCountry: code })
      if (!ok) { return }
      // The 2,800 rows never go to a browser. What a list needs is the shape, not the table.
      held.push({
        country: value.country,
        document: value.document,
        published: value.published,
        approvedBy: value.approvedBy,
        approvedAt: value.approvedAt,
        classes: value.classes.length,
        unresolved: value.unresolved.length,
        pagesUnread: value.pagesUnread,
        unreadNote: schedules.unreadPagesSentence(value)
      })
    })

    const reads = []
    Object.keys(pending || {}).forEach((code) => {
      const { ok, value } = proposals.validateProposal(pending[code], { expectCountry: code })
      if (!ok) { return }
      const row = Object.assign({}, value, { stale: proposals.isStale(value) })
      // Same reason: a pending read carries its whole proposed table, and a list does not need
      // it. The table is fetched for the one country a manager opens.
      delete row.reading
      reads.push(row)
    })

    res.send(200, { schedules: held, reads, mayLoad: schedules.mayLoadSchedules(req.firmId) })
  } catch (err) {
    console.error('[country-schedules] list failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'The schedules held here could not be read')
  }
}

/**
 * GET /api/firm-manager/country-schedules/read?country=NZ  (global group manager)
 *
 * One country's read in full — its progress, or the table it is proposing.
 *
 * @route GET /api/firm-manager/country-schedules/read
 * @returns {{read: object|null}}
 */
async function getRead (req, res) {
  const country = normaliseCountry(req.query && req.query.country)
  if (country === null) {
    return sendError(res, 400, 'INVALID_COUNTRY', 'country must be a two-letter code, such as NZ')
  }

  try {
    const stored = await readOwn(req.firmId, proposals.configKeyFor(country))
    if (!stored) { return res.send(200, { read: null }) }
    const { ok, value } = proposals.validateProposal(stored, { expectCountry: country })
    if (!ok) { return res.send(200, { read: null }) }
    res.send(200, { read: Object.assign({}, value, { stale: proposals.isStale(value) }) })
  } catch (err) {
    console.error('[country-schedules] read lookup failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'That read could not be looked up')
  }
}

/**
 * POST /api/firm-manager/country-schedules/approve  (global group manager)
 *
 * Approve one country's proposed schedule into the table every firm beneath searches.
 *
 * 🔴 THE PROPOSAL GOES THROUGH THE APPROVED STORE'S OWN CHECKER ON THE WAY IN, with the
 * approver taken from the VERIFIED token and never from the body. A proposal that has drifted
 * out of shape is refused at this moment rather than serving a broken table afterwards.
 *
 * @route POST /api/firm-manager/country-schedules/approve
 * @param {object} req.body - `{ country: 'NZ' }`
 * @returns {{approved: boolean, schedule: object}}
 */
async function approveSchedule (req, res) {
  if (!schedules.mayLoadSchedules(req.firmId)) {
    return sendError(res, 403, 'NOT_PERMITTED',
      'Country schedules are approved by the global group manager.')
  }

  const country = normaliseCountry(req.body && req.body.country)
  if (country === null) {
    return sendError(res, 400, 'INVALID_COUNTRY', 'country must be a two-letter code, such as NZ')
  }

  const pendingKey = proposals.configKeyFor(country)
  try {
    const stored = await readOwn(req.firmId, pendingKey)
    const current = stored ? proposals.validateProposal(stored, { expectCountry: country }) : { ok: false }
    if (!current.ok) {
      return sendError(res, 404, 'NO_READ', 'There is no read waiting to be approved for that country')
    }

    const approved = proposals.toApproved(current.value, req.userEmail)
    if (!approved.ok) {
      return sendError(res, 400, 'NOT_APPROVABLE',
        'That read cannot be approved: ' + approved.errors.join('; '))
    }

    // The table first, then the decision. In this order a failure between them leaves a
    // pending proposal beside a good table — which a manager can see and act on. The other
    // order would leave a proposal marked approved with no table anywhere.
    await writeOwn(req.firmId, schedules.configKeyFor(country), approved.value, req.userEmail)
    await writeOwn(req.firmId, pendingKey,
      proposals.withDecision(current.value, 'approved', req.userEmail), req.userEmail)

    res.send(200, {
      approved: true,
      schedule: {
        country: approved.value.country,
        document: approved.value.document,
        published: approved.value.published,
        approvedBy: approved.value.approvedBy,
        approvedAt: approved.value.approvedAt,
        classes: approved.value.classes.length,
        unreadNote: schedules.unreadPagesSentence(approved.value)
      }
    })
  } catch (err) {
    console.error('[country-schedules] approve failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'That schedule could not be approved')
  }
}

/**
 * POST /api/firm-manager/country-schedules/reject  (global group manager)
 *
 * Throw a proposed schedule away. Whatever was already approved for that country stays.
 *
 * @route POST /api/firm-manager/country-schedules/reject
 * @param {object} req.body - `{ country: 'NZ' }`
 * @returns {{rejected: boolean}}
 */
async function rejectSchedule (req, res) {
  if (!schedules.mayLoadSchedules(req.firmId)) {
    return sendError(res, 403, 'NOT_PERMITTED',
      'Country schedules are decided by the global group manager.')
  }

  const country = normaliseCountry(req.body && req.body.country)
  if (country === null) {
    return sendError(res, 400, 'INVALID_COUNTRY', 'country must be a two-letter code, such as NZ')
  }

  const key = proposals.configKeyFor(country)
  try {
    const stored = await readOwn(req.firmId, key)
    const current = stored ? proposals.validateProposal(stored, { expectCountry: country }) : { ok: false }
    if (!current.ok) {
      return sendError(res, 404, 'NO_READ', 'There is no read to reject for that country')
    }
    // A read still running is rejectable on purpose: it is how a manager clears a job whose
    // process died, and `withDecision` drops its half-built table with it.
    await writeOwn(req.firmId, key,
      proposals.withDecision(current.value, 'rejected', req.userEmail), req.userEmail)
    res.send(200, { rejected: true })
  } catch (err) {
    console.error('[country-schedules] reject failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'That read could not be rejected')
  }
}

/**
 * GET /api/firm-manager/country-schedules/classes?country=NZ&q=engineering  (any manager)
 *
 * Search the country schedule this scope inherits. THIS is what a firm's class picker calls.
 *
 * 🔴 THE SEARCH IS SERVER-SIDE AND THE WHOLE TABLE NEVER LEAVES THE BACKEND. A country's table
 * is around 2,800 rows and the picker shows a handful; sending it to the browser to filter
 * there would put 400 KB on the wire for every keystroke.
 *
 * ⚠ IT RESOLVES FROM THE CALLER'S OWN VERIFIED SCOPE, so a firm reads the schedule its own
 * chain holds and can never reach another group's.
 *
 * ⚠ IT ALWAYS RETURNS THE UNREAD-PAGES SENTENCE WHEN THERE IS ONE — Mike's second ruling of
 * 2026-09-11, and the condition he attached to it: the gap shows wherever the table is USED,
 * not only where the schedule was loaded. Without it "there is no such class" and "those pages
 * were never read" look identical to the person searching.
 *
 * @route GET /api/firm-manager/country-schedules/classes
 * @returns {{country: string, schedule: object|null, matches: object[], total: number}}
 */
async function searchClasses (req, res) {
  const country = normaliseCountry(req.query && req.query.country)
  if (country === null) {
    return sendError(res, 400, 'INVALID_COUNTRY', 'country must be a two-letter code, such as NZ')
  }

  try {
    // `readOwn`, never the bare overlay call: a firm searching its group's table must reach the
    // same store the global group manager wrote to, with or without a database. Passing the raw
    // reader here left the picker answering 503 on a machine where the schedule had just been
    // loaded successfully — the keeping fixed at one end and not the other.
    const resolved = await schedules.resolveCountrySchedule(req.firmId, country, readOwn)
    const schedule = resolved.schedule

    // 🔴 A STORE WE COULD NOT READ IS NOT A COUNTRY NOBODY HAS LOADED, and reporting the second
    // when the first is true is the absence-looks-like-a-negative failure this whole feature
    // guards against. The manager would be told their group has no schedule, which is a false
    // statement about their own work, and would go and load one that already exists.
    if (!schedule && resolved.unreachable) {
      return sendError(res, 503, 'SCHEDULE_UNAVAILABLE',
        'That country\'s schedule could not be reached just now. Please try again shortly.')
    }

    if (!schedule) {
      // Not an error. A country nobody has loaded a schedule for is the normal case, and the
      // firm's own documents still work exactly as before.
      return res.send(200, { country, schedule: null, matches: [], total: 0, unreadNote: '' })
    }

    const found = schedules.searchScheduleClasses(schedule, req.query && req.query.q, SEARCH_LIMIT)
    res.send(200, {
      country,
      schedule: {
        document: schedule.document,
        published: schedule.published,
        classes: schedule.classes.length,
        originTier: schedule.originTier,
        approvedAt: schedule.approvedAt
      },
      matches: found.matches,
      total: found.total,
      truncated: found.truncated,
      unreadNote: schedules.unreadPagesSentence(schedule)
    })
  } catch (err) {
    console.error('[country-schedules] class search failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'That country\'s classes could not be searched')
  }
}

module.exports = {
  SEARCH_LIMIT,
  loadSchedule,
  listSchedules,
  getRead,
  approveSchedule,
  rejectSchedule,
  searchClasses,
  _runRead
}
