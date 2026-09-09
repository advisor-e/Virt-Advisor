'use strict'

/**
 * @file /api/client-copy-requests — a client asks for a copy of what was recorded about them.
 * @module server/routes/clientCopyRequests
 *
 * Design: `design/mockups/client-record-request.html`, drawn 2026-09-10, all eight questions
 * ruled by Mike the same day and built on his word *"go build it"*. Closes finding **B** of
 * `design/MEETING-REVIEW-DPIA.md` §10 — **IPP6** access and **IPP7** correction.
 *
 * 🔴 EVERY ROUTE IS SCOPED TO `req.firmId` FROM THE VERIFIED TOKEN, never a body. P13 keeps
 * everything derived from a recorded meeting inside the firm it came from, and a named client
 * heard that promised aloud.
 *
 * 🔴 RELEASE IS THE RECORDING ADVISOR'S, CHECKED AGAINST THE MEETING RECORD (ruling 2). The
 * one exception is `releaseAbsent` — the break-glass of ruling 2b, which a manager may use
 * ONLY by declaring the advisor can no longer act, and which writes that declaration into the
 * record permanently.
 *
 * ⚠ THIS FEATURE CALLS NO MODEL. Nothing here is generated, summarised or classified. It moves
 * text a firm already holds, which is why there is no citation guard, no prompt and no
 * `isApproved` gate in this file — and why item 4.82's uncapped-AI-reading hazard does not
 * reach it.
 *
 * Node 14, CommonJS.
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const overlay = require('../utils/firmOverlay')
const { devFallbackAllowed } = require('../utils/dbFailure')
const { sendError } = require('../utils/sendError')
const store = require('../utils/meetingAudioStore')
const clientStore = require('../utils/clientStore')
const ccr = require('../utils/clientCopyRequests')
const deadline = require('../utils/copyRequestDeadline')

/** 500 with the fault logged server-side and nothing internal returned. */
function serverError (res, err, what) {
  console.error('[client-copy-requests] ' + what + ':', err.message)
  return sendError(res, 500, 'COPY_REQUEST_ERROR', 'Could not ' + what)
}

// ── Storage, with the same dev fallback every sibling uses ───────────────────────────────

function _devRead (file) {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), file), 'utf8'))
  } catch (_e) { return {} }
}

function _devWrite (file, scopeId, key, value) {
  const all = _devRead(file)
  if (!all[scopeId] || typeof all[scopeId] !== 'object') { all[scopeId] = {} }
  if (value === null) { delete all[scopeId][key] } else { all[scopeId][key] = value }
  fs.writeFileSync(path.resolve(process.cwd(), file), JSON.stringify(all, null, 2))
}

/** Which dev file a config key belongs in, or null when it is not one of ours. */
function _devFileFor (key) {
  if (key.indexOf(ccr.CONFIG_KEYS.request) === 0) { return ccr.DEV_FILES.request }
  if (key.indexOf(ccr.CONFIG_KEYS.release) === 0) { return ccr.DEV_FILES.release }
  if (key === deadline.CONFIG_KEY) { return deadline.DEV_FILE }
  return null
}

/**
 * Read one config, falling back to the dev file when there is no MySQL.
 *
 * ⚠ The fallback is refused when a live server REFUSED the statement (`dbFailure`), so an
 * outage can never be answered as "this firm holds no requests" — which on this screen would
 * read as a client having asked for nothing.
 */
async function readScopeConfig (scopeId, key) {
  try {
    return await overlay.loadFirmConfig(scopeId, key)
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    const file = _devFileFor(key)
    if (!file) { throw err }
    if (file === deadline.DEV_FILE) {
      const all = _devRead(file)
      return Object.prototype.hasOwnProperty.call(all, scopeId) ? all[scopeId] : null
    }
    const all = _devRead(file)
    const scope = all[scopeId] || {}
    return Object.prototype.hasOwnProperty.call(scope, key) ? scope[key] : null
  }
}

async function writeScopeConfig (scopeId, key, value, savedBy) {
  try {
    await overlay.saveFirmConfig(scopeId, key, value, savedBy)
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    const file = _devFileFor(key)
    if (!file) { throw err }
    if (file === deadline.DEV_FILE) {
      deadline._writeDevMap(scopeId, value)
      return
    }
    _devWrite(file, scopeId, key, value)
  }
}

/** Every config under a prefix, with the same dev fallback. */
async function readScopeConfigsByPrefix (scopeId, prefix) {
  try {
    return await overlay.loadFirmConfigsByPrefix(scopeId, prefix)
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    const file = _devFileFor(prefix)
    if (!file) { throw err }
    const scope = _devRead(file)[scopeId] || {}
    const out = {}
    Object.keys(scope).forEach((key) => {
      if (key.indexOf(prefix) !== 0) { return }
      const suffix = key.slice(prefix.length)
      if (suffix) { out[suffix] = scope[key] }
    })
    return out
  }
}

// ── The deadline dial ────────────────────────────────────────────────────────────────────

/**
 * GET /api/firm-manager/client-copy-deadline  (manager)
 *
 * What this scope answers within, what it set itself, and the units it may choose.
 *
 * @route GET /api/firm-manager/client-copy-deadline
 * @returns {{resolved: object, own: (object|null), platformDefault: object, units: string[],
 *   limits: object, phrase: string}}
 */
async function getDeadline (req, res) {
  try {
    const resolved = await deadline.loadResolvedDeadline(req.firmId, readScopeConfig)
    const own = await deadline.loadOwnDeadline(req.firmId, readScopeConfig)
    res.send(200, {
      resolved,
      own,
      platformDefault: deadline.PLATFORM_DEFAULT,
      units: deadline.UNIT_VALUES,
      unitWords: deadline.UNIT_WORDS,
      limits: deadline.LIMITS,
      phrase: deadline.deadlinePhrase(resolved)
    })
  } catch (err) {
    return serverError(res, err, 'read the response time')
  }
}

/**
 * PUT /api/firm-manager/client-copy-deadline  (manager)
 *
 * @route PUT /api/firm-manager/client-copy-deadline
 * @param {object} req.body - `{count: number, unit: string}`
 * @returns {{resolved: object, phrase: string}}
 */
async function setDeadline (req, res) {
  const body = req.body || {}
  const checked = deadline.validateDeadline(body.count, body.unit)
  if (!checked.ok) {
    return sendError(res, 400, 'BAD_DEADLINE', checked.errors.join('; '))
  }
  try {
    await writeScopeConfig(req.firmId, deadline.CONFIG_KEY, checked.value,
      req.advisorName || req.advisorId || 'unknown')
    const resolved = await deadline.loadResolvedDeadline(req.firmId, readScopeConfig)
    res.send(200, { resolved, phrase: deadline.deadlinePhrase(resolved) })
  } catch (err) {
    return serverError(res, err, 'save the response time')
  }
}

/**
 * POST /api/firm-manager/client-copy-deadline/reset  (manager)
 *
 * Drop this scope's own figure so it tracks the level above again.
 *
 * @route POST /api/firm-manager/client-copy-deadline/reset
 * @returns {{resolved: object, phrase: string}}
 */
async function resetDeadline (req, res) {
  try {
    await writeScopeConfig(req.firmId, deadline.CONFIG_KEY, null,
      req.advisorName || req.advisorId || 'unknown')
    const resolved = await deadline.loadResolvedDeadline(req.firmId, readScopeConfig)
    res.send(200, { resolved, phrase: deadline.deadlinePhrase(resolved) })
  } catch (err) {
    return serverError(res, err, 'reset the response time')
  }
}

// ── The requests ─────────────────────────────────────────────────────────────────────────

/** The clock for one request, or null when the deadline cannot be computed. */
function _clockFor (request, resolved, now) {
  const remaining = deadline.timeRemaining(request.receivedAt, resolved, now)
  if (!remaining) { return null }
  return {
    due: remaining.due.toISOString(),
    remaining: remaining.remaining,
    unit: remaining.unit,
    overdue: remaining.overdue,
    phrase: deadline.remainingPhrase(remaining)
  }
}

/**
 * GET /api/client-copy-requests  (any advisor at the firm)
 *
 * Every request the firm holds, open first, each with its clock and its client's name.
 *
 * ⚠ NOT MANAGER-ONLY. Ruling 2 makes the advisor the person who releases, so an advisor has to
 * be able to see the request they are being waited on for.
 *
 * @route GET /api/client-copy-requests
 * @returns {{requests: Array<object>, deadline: object, phrase: string}}
 */
async function listRequests (req, res) {
  try {
    const resolved = await deadline.loadResolvedDeadline(req.firmId, readScopeConfig)
    const requests = await ccr.listRequests(req.firmId, readScopeConfigsByPrefix)
    const now = new Date()

    const decorated = []
    for (let i = 0; i < requests.length; i += 1) {
      const request = requests[i]
      let clientName = ''
      try {
        const client = await clientStore.getById(request.clientId, req.firmId)
        clientName = client ? client.name : ''
      } catch (_e) {
        // A register read that fails leaves the row nameless rather than removing it — a
        // request that vanished because a lookup failed is the worst outcome on this screen.
        clientName = ''
      }
      const releases = await ccr.listReleases(req.firmId, request.id, readScopeConfigsByPrefix)
      decorated.push(Object.assign({}, request, {
        clientName,
        releaseCount: releases.length,
        clock: request.state === ccr.STATES.open ? _clockFor(request, resolved, now) : null
      }))
    }

    // Open first, then by how they already sort (newest received first).
    decorated.sort((a, b) => {
      if (a.state !== b.state) { return a.state === ccr.STATES.open ? -1 : 1 }
      return 0
    })

    res.send(200, {
      requests: decorated,
      deadline: resolved,
      phrase: deadline.deadlinePhrase(resolved)
    })
  } catch (err) {
    return serverError(res, err, 'list the requests')
  }
}

/**
 * POST /api/client-copy-requests  (any advisor at the firm)
 *
 * Log a request that arrived by email, phone or in the room.
 *
 * 🔴 THE CLIENT IS CHECKED AGAINST THE FIRM'S OWN REGISTER, never trusted from the body —
 * `getById` is scoped to `req.firmId`, so an id belonging to another firm resolves to nothing.
 * The same IDOR-safe shape `startRecording` uses.
 *
 * @route POST /api/client-copy-requests
 * @param {object} req.body - `{clientId, kind, channel, receivedAt, note}`
 * @returns {{request: object}}
 */
async function logRequest (req, res) {
  const checked = ccr.validateNewRequest(req.body || {})
  if (!checked.ok) {
    return sendError(res, 400, 'BAD_REQUEST_RECORD', checked.errors.join('; '))
  }

  try {
    const client = await clientStore.getById(checked.value.clientId, req.firmId)
    if (!client) {
      return sendError(res, 404, 'NO_SUCH_CLIENT',
        'That client is not on your firm\'s register. Choose one from the list.')
    }

    const id = ccr.newRequestId()
    const row = Object.assign({}, checked.value, {
      clientId: client.id,
      loggedBy: req.advisorName || req.advisorId || '',
      loggedAt: new Date().toISOString(),
      state: ccr.STATES.open
    })

    await writeScopeConfig(req.firmId, ccr.requestConfigKey(id), row,
      req.advisorName || req.advisorId || 'unknown')

    res.send(201, { request: Object.assign({ id }, row, { clientName: client.name }) })
  } catch (err) {
    return serverError(res, err, 'log that request')
  }
}

/** One request from storage, or null with the error already sent. */
async function _requestOr404 (req, res) {
  const id = String(req.params.requestId || '')
  if (!ccr.REQUEST_ID_PATTERN.test(id)) {
    sendError(res, 404, 'NOT_FOUND', 'No such request')
    return null
  }
  const stored = await readScopeConfig(req.firmId, ccr.requestConfigKey(id))
  const request = ccr.readStoredRequest(stored, id)
  if (!request) {
    sendError(res, 404, 'NOT_FOUND', 'No such request')
    return null
  }
  return request
}

/**
 * GET /api/client-copy-requests/:requestId  (any advisor at the firm)
 *
 * One request: its clock, its client, every meeting this firm holds for that client, what each
 * still holds, who must release it, and what has been released already.
 *
 * 🔴 `yours` IS COMPUTED PER MEETING, and it is what ruling 2 looks like on a screen. A caller
 * sees every meeting — a client's request is about the client — but may act only on the ones
 * they recorded.
 *
 * @route GET /api/client-copy-requests/:requestId
 * @returns {{request: object, meetings: Array<object>, releases: Array<object>, clock: object}}
 */
async function getRequest (req, res) {
  try {
    const request = await _requestOr404(req, res)
    if (!request) { return }

    let clientName = ''
    try {
      const client = await clientStore.getById(request.clientId, req.firmId)
      clientName = client ? client.name : ''
    } catch (_e) { clientName = '' }

    const resolved = await deadline.loadResolvedDeadline(req.firmId, readScopeConfig)
    const releases = await ccr.listReleases(req.firmId, request.id, readScopeConfigsByPrefix)
    const releasedIds = releases.map(r => r.meetingId)

    const meetings = ccr.meetingsForClient(store, req.firmId, request.clientId).map((m) => {
      const expired = !!m.transcriptPurgedAt || !!m.deletedForClientAt
      return Object.assign({}, m, {
        yours: m.advisor === req.advisorId,
        released: releasedIds.includes(m.meetingId),
        // 🔴 AN EXPIRED MEETING NAMES ITS OWN PERIOD, never the firm's current dial — ruling 7,
        // and `meetingPurge`'s own rule. A firm that later extended to 24 months still reports
        // 18 here, because 18 is what that client was told on that day.
        expired,
        expiredAt: m.transcriptPurgedAt || m.deletedForClientAt || null,
        expiredReason: m.deletedForClientAt ? 'client-asked' : (m.transcriptPurgedAt ? 'retention' : null)
      })
    })

    res.send(200, {
      request: Object.assign({}, request, { clientName }),
      meetings,
      releases,
      deadline: resolved,
      clock: request.state === ccr.STATES.open ? _clockFor(request, resolved, new Date()) : null
    })
  } catch (err) {
    return serverError(res, err, 'read that request')
  }
}

/**
 * The meeting named in the URL, once it is proven to be this firm's and on this request's
 * client — or null with the error already sent.
 */
function _meetingOnRequest (req, res, request) {
  let meta = null
  try {
    meta = store.readMeta(String(req.params.meetingId || ''))
  } catch (_e) {
    sendError(res, 404, 'NOT_FOUND', 'No such meeting')
    return null
  }
  // Scoped to the firm AND to this request's client: a meeting id guessed from elsewhere can
  // never be released under somebody else's request.
  if (!meta || meta.firmId !== req.firmId || meta.clientId !== request.clientId) {
    sendError(res, 404, 'NOT_FOUND', 'No such meeting')
    return null
  }
  return meta
}

/** Store one release row, refusing to overwrite a release already recorded. */
async function _storeRelease (req, res, request, meta, breakGlass) {
  const key = ccr.releaseConfigKey(request.id, meta.meetingId)
  const existing = ccr.readStoredRelease(
    await readScopeConfig(req.firmId, key),
    { requestId: request.id, meetingId: meta.meetingId }
  )
  if (existing) {
    sendError(res, 409, 'ALREADY_RELEASED', 'This meeting has already been released.')
    return null
  }

  const holds = ccr.documentsHeld(store, meta.meetingId)
  if (!holds.length) {
    // Nothing to hand over. Refused rather than recorded as a release of nothing, which would
    // close a client's request having sent them an empty envelope.
    sendError(res, 409, 'NOTHING_TO_RELEASE',
      'This meeting holds nothing that can be provided.')
    return null
  }

  const row = ccr.buildRelease({
    advisor: meta.advisorName || meta.advisor || '',
    releasedBy: req.advisorName || req.advisorId || '',
    holds,
    breakGlass
  })

  await writeScopeConfig(req.firmId, key, row, req.advisorName || req.advisorId || 'unknown')
  return row
}

/**
 * POST /api/client-copy-requests/:requestId/meetings/:meetingId/release  (recording advisor)
 *
 * 🔴 THE CALLER MUST BE THE ADVISOR WHO RECORDED IT — ruling 2. A manager calling this is
 * refused and must use the break-glass, which records why.
 *
 * @route POST /api/client-copy-requests/:requestId/meetings/:meetingId/release
 * @returns {{release: object}}
 */
async function releaseMeeting (req, res) {
  try {
    // 🔴 THE TWO TICKS OF THE DRAWING'S SCREEN B, AND THEY ARE THE CONTROL RULING 8 RESTS ON.
    // Ruling 8 is "warn, and remove nothing automatically" — so the warning has to be
    // something a person actually passed through, not a paragraph beside a button. `contentRead`
    // is the firm stating they read what they are about to send, which is the only thing
    // standing between a client and a transcript naming a third party; `identityConfirmed` is
    // the firm stating who they are dealing with, which this application cannot check.
    //
    // ⚠ ENFORCED ON THE ROUTE, NOT THE SCREEN. A disabled button is not a control.
    const body = req.body || {}
    if (body.identityConfirmed !== true || body.contentRead !== true) {
      return sendError(res, 400, 'CONFIRMATION_REQUIRED',
        'Confirm who you are dealing with, and that you have read what is being provided.')
    }

    const request = await _requestOr404(req, res)
    if (!request) { return }
    if (request.state === ccr.STATES.closed) {
      return sendError(res, 409, 'REQUEST_CLOSED', 'This request is already closed.')
    }

    const meta = _meetingOnRequest(req, res, request)
    if (!meta) { return }

    if (meta.advisor !== req.advisorId) {
      return sendError(res, 403, 'NOT_YOUR_MEETING',
        'Only the advisor who recorded this meeting can release it.')
    }

    const row = await _storeRelease(req, res, request, meta, null)
    if (!row) { return }
    res.send(201, { release: Object.assign({ meetingId: meta.meetingId }, row) })
  } catch (err) {
    return serverError(res, err, 'release that meeting')
  }
}

/**
 * POST /api/client-copy-requests/:requestId/meetings/:meetingId/release-absent  (manager)
 *
 * 🔴 THE BREAK-GLASS OF RULING 2b. A firm manager releases a meeting they did not record, and
 * ONLY by declaring the advisor can no longer act. The declaration is stored with their name
 * and is permanent.
 *
 * ⚠ THE DECLARATION CANNOT BE CHECKED. This app holds no advisors table and does not handle
 * sign-in, so it cannot know whether anybody has left. The tick is the firm's statement, the
 * record is the deterrent, and both are said out loud on the screen.
 *
 * @route POST /api/client-copy-requests/:requestId/meetings/:meetingId/release-absent
 * @param {object} req.body - `{declared: true}`
 * @returns {{release: object}}
 */
async function releaseAbsent (req, res) {
  try {
    const body = req.body || {}
    if (body.declared !== true) {
      return sendError(res, 400, 'DECLARATION_REQUIRED',
        'Releasing another advisor\'s meeting requires the declaration that they can no longer act.')
    }
    // Screen B2's second tick. The break-glass does not excuse the reading — if anything it
    // matters more here, because the person releasing was not in the room.
    if (body.contentRead !== true) {
      return sendError(res, 400, 'CONFIRMATION_REQUIRED',
        'Confirm that you have read what is being released.')
    }

    const request = await _requestOr404(req, res)
    if (!request) { return }
    if (request.state === ccr.STATES.closed) {
      return sendError(res, 409, 'REQUEST_CLOSED', 'This request is already closed.')
    }

    const meta = _meetingOnRequest(req, res, request)
    if (!meta) { return }

    if (meta.advisor === req.advisorId) {
      // Their own meeting needs no break-glass, and recording one would put a permanent
      // declaration about an absent colleague on a meeting the caller took themselves.
      return sendError(res, 400, 'YOUR_OWN_MEETING',
        'This is your own meeting — release it directly.')
    }

    const row = await _storeRelease(req, res, request, meta, {
      absentAdvisor: meta.advisorName || meta.advisor || '',
      declaredBy: req.advisorName || req.advisorId || ''
    })
    if (!row) { return }
    res.send(201, { release: Object.assign({ meetingId: meta.meetingId }, row) })
  } catch (err) {
    return serverError(res, err, 'release that meeting')
  }
}

/**
 * POST /api/client-copy-requests/:requestId/meetings/:meetingId/correction
 *
 * Attach a client's correction statement to a moment in the transcript — IPP7, ruling 4.
 *
 * 🔴 IT NEVER TOUCHES THE TRANSCRIPT. The statement is stored beside it and travels with it.
 * The quoted passage is stored with the statement so the record still makes sense to a reader
 * who has only the attachment in front of them.
 *
 * @route POST /api/client-copy-requests/:requestId/meetings/:meetingId/correction
 * @param {object} req.body - `{statement, quote, quoteAt}`
 * @returns {{correction: object}}
 */
async function attachCorrection (req, res) {
  try {
    const request = await _requestOr404(req, res)
    if (!request) { return }

    const meta = _meetingOnRequest(req, res, request)
    if (!meta) { return }

    if (meta.advisor !== req.advisorId) {
      return sendError(res, 403, 'NOT_YOUR_MEETING',
        'Only the advisor who recorded this meeting can attach a correction to it.')
    }

    const body = req.body || {}
    const statement = typeof body.statement === 'string' ? body.statement.trim() : ''
    if (!statement) {
      return sendError(res, 400, 'STATEMENT_REQUIRED',
        'A correction needs the client\'s own words.')
    }
    if (statement.length > ccr.MAX_NOTE_LENGTH * 4) {
      return sendError(res, 400, 'STATEMENT_TOO_LONG', 'That statement is too long to attach.')
    }

    if (!store.readTranscript(meta.meetingId)) {
      // Nothing to attach it to. A statement against a transcript that has expired would sit
      // on a record whose text is gone, disputing words nobody can read.
      return sendError(res, 409, 'NO_TRANSCRIPT',
        'This meeting\'s transcript has been deleted, so there is nothing to attach a correction to.')
    }

    const correction = {
      id: crypto.randomBytes(8).toString('hex'),
      at: new Date().toISOString(),
      statement,
      quote: typeof body.quote === 'string' ? body.quote.trim().slice(0, 1000) : '',
      quoteAt: typeof body.quoteAt === 'string' ? body.quoteAt.slice(0, 32) : '',
      recordedBy: req.advisorName || req.advisorId || '',
      requestId: request.id
    }

    store.appendCorrection(meta.meetingId, correction)
    res.send(201, { correction })
  } catch (err) {
    return serverError(res, err, 'attach that correction')
  }
}

/**
 * POST /api/client-copy-requests/:requestId/meetings/:meetingId/delete  (recording advisor)
 *
 * Destroy a meeting's text early, at the client's request — ruling 5.
 *
 * 🔴 IT CALLS `destroyTranscript`, THE SAME REMOVAL THE RETENTION CLOCK CALLS. One deletion
 * path, not two that must agree — so the transcript, both reports and any attached correction
 * go together. Deleting the transcript alone would leave the client's words in the reports.
 *
 * 🔴 THE MEETING RECORD SURVIVES, stamped `deletedForClientAt`. A firm has to be able to prove
 * the deletion happened rather than show an empty folder and ask to be believed — P8's rule,
 * and `meetingPurge` stamps `transcriptPurgedAt` for the same reason.
 *
 * @route POST /api/client-copy-requests/:requestId/meetings/:meetingId/delete
 * @param {object} req.body - `{confirmed: true}`
 * @returns {{deleted: true, filesRemoved: number, at: string}}
 */
async function deleteMeetingText (req, res) {
  try {
    // 🔴 THE DRAWING'S SCREEN D HAS TWO TICKS AND THEY SAY DIFFERENT THINGS. One is that the
    // CLIENT asked — without it a firm could destroy a record for its own reasons and have it
    // read afterwards as a client's request. The other is that the person knows it cannot be
    // undone. Collapsing them into one would lose the first, which is the one a later reader
    // of the stub relies on.
    const body = req.body || {}
    if (body.clientAsked !== true) {
      return sendError(res, 400, 'CONFIRMATION_REQUIRED',
        'Confirm that your client asked for this, and that you know who you are dealing with.')
    }
    if (body.confirmed !== true) {
      return sendError(res, 400, 'CONFIRMATION_REQUIRED',
        'Deleting a meeting early requires confirmation. It cannot be undone.')
    }

    const request = await _requestOr404(req, res)
    if (!request) { return }

    const meta = _meetingOnRequest(req, res, request)
    if (!meta) { return }

    if (meta.advisor !== req.advisorId) {
      return sendError(res, 403, 'NOT_YOUR_MEETING',
        'Only the advisor who recorded this meeting can delete it.')
    }

    const outcome = store.destroyTranscript(meta.meetingId)
    if (outcome.textRemains) {
      // P8 is a promise. A file that would not delete has to surface rather than being
      // reported as a deletion that probably worked.
      return sendError(res, 500, 'DELETE_INCOMPLETE',
        'Some of this meeting could not be deleted. Nothing has been reported as removed.')
    }

    const at = new Date().toISOString()
    store.updateMeta(meta.meetingId, { deletedForClientAt: at, deletedForRequestId: request.id })

    res.send(200, {
      deleted: true,
      filesRemoved: outcome.removed,
      bytesRemoved: outcome.bytesRemoved,
      at
    })
  } catch (err) {
    return serverError(res, err, 'delete that meeting')
  }
}

/**
 * POST /api/client-copy-requests/:requestId/close
 *
 * Close a request once it has been answered. Closed requests are kept — being able to show
 * that a request was answered, and how quickly, is the evidence half of the all-care basis.
 *
 * @route POST /api/client-copy-requests/:requestId/close
 * @param {object} req.body - `{outcome: string}`
 * @returns {{request: object}}
 */
async function closeRequest (req, res) {
  try {
    const request = await _requestOr404(req, res)
    if (!request) { return }
    if (request.state === ccr.STATES.closed) {
      return sendError(res, 409, 'REQUEST_CLOSED', 'This request is already closed.')
    }

    const body = req.body || {}
    const row = Object.assign({}, request, {
      state: ccr.STATES.closed,
      closedAt: new Date().toISOString(),
      closedBy: req.advisorName || req.advisorId || '',
      outcome: typeof body.outcome === 'string'
        ? body.outcome.trim().slice(0, ccr.MAX_NOTE_LENGTH)
        : ''
    })
    delete row.id

    await writeScopeConfig(req.firmId, ccr.requestConfigKey(request.id), row,
      req.advisorName || req.advisorId || 'unknown')

    res.send(200, { request: Object.assign({ id: request.id }, row) })
  } catch (err) {
    return serverError(res, err, 'close that request')
  }
}

/**
 * GET /api/meeting/recordings/:meetingId/client-notices
 *
 * The two things an advisor must be told about their own meeting — Screen E of the drawing.
 *
 * 🔴 REDRAWN AFTER RULING 2, AND SMALLER THAN FIRST DRAWN. As drawn, both banners told an
 * advisor about something done without them. That case has mostly gone: the advisor IS the one
 * who releases, so nothing needs announcing.
 *
 * What survives, and why each earns its place:
 *   - **A correction always does.** A client can dispute a passage months later, and a coaching
 *     finding whose evidence is now disputed must not read as settled.
 *   - **A release only when the BREAK-GLASS was used** (ruling 2b). An advisor who released
 *     their own meeting does not need telling that they did; one whose meeting went out under
 *     a firm manager's declaration is owed the fact.
 *
 * @route GET /api/meeting/recordings/:meetingId/client-notices
 * @returns {{corrections: Array<object>, releasedWithoutYou: (object|null)}}
 */
async function meetingNotices (req, res) {
  try {
    let meta = null
    try {
      meta = store.readMeta(String(req.params.meetingId || ''))
    } catch (_e) {
      return sendError(res, 404, 'NOT_FOUND', 'No such meeting')
    }
    // P2: a recording belongs to the advisor who made it, so these notices are theirs alone.
    if (!store.isOwnedBy(meta, req.firmId, req.advisorId)) {
      return sendError(res, 404, 'NOT_FOUND', 'No such meeting')
    }

    const rows = await readScopeConfigsByPrefix(req.firmId, ccr.CONFIG_KEYS.release)
    let releasedWithoutYou = null
    Object.keys(rows || {}).forEach((suffix) => {
      const ids = ccr.releaseIdsFromSuffix(suffix)
      if (!ids || ids.meetingId !== meta.meetingId) { return }
      const rel = ccr.readStoredRelease(rows[suffix], ids)
      // Only a break-glass release is a notice. Their own release is not news to them.
      if (rel && rel.breakGlass) { releasedWithoutYou = rel }
    })

    res.send(200, {
      corrections: store.readCorrections(meta.meetingId),
      releasedWithoutYou
    })
  } catch (err) {
    return serverError(res, err, 'read the notices for that meeting')
  }
}

module.exports = {
  readScopeConfig,
  writeScopeConfig,
  readScopeConfigsByPrefix,
  getDeadline,
  setDeadline,
  resetDeadline,
  listRequests,
  logRequest,
  getRequest,
  releaseMeeting,
  releaseAbsent,
  attachCorrection,
  deleteMeetingText,
  closeRequest,
  meetingNotices
}
