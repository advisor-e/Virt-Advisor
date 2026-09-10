'use strict'

/**
 * @file The BUSINESS-ENTITY LEVEL of the meeting pre-set — "how I run meetings with THIS
 * client". Five advisor routes, one shared list per client.
 * @module server/routes/meetingObservationsEntity
 *
 * Design: `design/mockups/meeting-preset-client-level.html`, all five questions ruled by
 * Mike 2026-09-10. The rules that shape every handler here are in
 * `server/utils/meetingObservationsEntity.js`; this file is the storage and the HTTP shape.
 *
 * 🔴 THE CLIENT IS CHECKED AGAINST THE FIRM'S REGISTER ON EVERY CALL. `clientStore.getById`
 * is scoped to `req.firmId`, so a client id of another firm is a 404 and never a read or a
 * write — the same rule the recorder applies when it stores a client on a meeting.
 *
 * 🔴 WHO WROTE IT IS TAKEN FROM THE TOKEN, never a body. Question 4 stamps a name and id on
 * every entry, and question 3 lets any advisor in the firm write; the two together mean the
 * name beside a decision has to be the caller's own or the list becomes a way to sign a
 * colleague's name to a decision they never made.
 *
 * ⚠ A DECLINE IS ACCEPTED ONLY FOR A POINT THE FIRM'S LIST OFFERS. Not the advisor's own
 * points: those are one person's, invisible to every colleague, and a colleague setting one
 * aside "for the client" would be reaching into a list they cannot see. An advisor who wants
 * their own point off for one client removes it at their own level. Stated as a judgement,
 * not assumed.
 */

const fs = require('fs')
const path = require('path')
const overlay = require('../utils/firmOverlay')
const { sendError } = require('../utils/sendError')
const { devFallbackAllowed } = require('../utils/dbFailure')
const clientStore = require('../utils/clientStore')
const {
  meetingScenarios,
  loadResolvedObservations,
  asAdvisorPreset
} = require('../utils/meetingObservations')
const {
  validateAdvisorPoint,
  applyAdvisorLayer
} = require('../utils/meetingObservationsAdvisor')
const {
  DEV_FILES,
  MAX_OWN_POINTS_PER_SCENARIO,
  entityConfigKey,
  readEntityDeclines,
  readEntityOwn,
  applyEntityLayer,
  entitySetAsidePoints,
  nextEntityPointId
} = require('../utils/meetingObservationsEntity')

const KNOWN_SCENARIO_IDS = new Set(meetingScenarios().map(s => s.id))

// ── Storage, with the house dev fallback ─────────────────────────────────────────────

/** Dev-only: one flat file per part, keyed `firmId::clientId`. */
const DEV_SEPARATOR = '::'

function devReadAll (devFile) {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), devFile), 'utf8'))
  } catch (e) { return {} }
}

function devWrite (devFile, id, value) {
  const all = devReadAll(devFile)
  all[id] = value
  fs.writeFileSync(path.resolve(process.cwd(), devFile), JSON.stringify(all, null, 2))
}

/**
 * One client's stored value for one part, validated into shape.
 *
 * ⚠ The fallback is refused when a live server REFUSED the statement (`dbFailure`), so a
 * rejected read can never answer with stale dev data dressed up as "nothing stored".
 *
 * @param {string} firmId
 * @param {'entityDeclines'|'entityOwn'} part
 * @param {string} clientId
 * @returns {Promise<object>}
 */
async function readEntityEntry (firmId, part, clientId) {
  const key = entityConfigKey(part, clientId)
  const reader = part === 'entityOwn' ? readEntityOwn : readEntityDeclines
  if (!key) { return reader(null) }
  let stored
  try {
    stored = await overlay.loadFirmConfig(firmId, key)
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    const all = devReadAll(DEV_FILES[part])
    const id = firmId + DEV_SEPARATOR + clientId
    stored = Object.prototype.hasOwnProperty.call(all, id) ? all[id] : null
  }
  return reader(stored)
}

/**
 * Write one client's entry back. `savedBy` is the advisor who made the change — the row is
 * the client's, and question 3 lets any advisor in the firm write it, so history names them.
 *
 * @param {string} firmId
 * @param {'entityDeclines'|'entityOwn'} part
 * @param {string} clientId
 * @param {object} entry
 * @param {string} savedBy
 * @returns {Promise<void>}
 */
async function writeEntityEntry (firmId, part, clientId, entry, savedBy) {
  const key = entityConfigKey(part, clientId)
  if (!key) { throw new Error('no client to key this write on') }
  try {
    await overlay.saveFirmConfig(firmId, key, entry, savedBy)
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    devWrite(DEV_FILES[part], firmId + DEV_SEPARATOR + clientId, entry)
  }
}

/**
 * Both of a client's slices, always defined. Borrowed by `meetingReview.presetFor` so the
 * report applies the client's layer through exactly the path the screen reads it by.
 *
 * @param {string} firmId
 * @param {string|null} clientId
 * @returns {Promise<{declines: object, own: object}>}
 */
async function loadEntityState (firmId, clientId) {
  if (!clientId) { return { declines: {}, own: {} } }
  const declines = await readEntityEntry(firmId, 'entityDeclines', clientId)
  const own = await readEntityEntry(firmId, 'entityOwn', clientId)
  return { declines: declines.scenarios, own: own.scenarios }
}

// ── Shared pieces ────────────────────────────────────────────────────────────────────

function serverError (res, err, what) {
  console.error('[meeting-observations-entity] could not ' + what + ':', err && err.message)
  return sendError(res, 500, 'SERVER_ERROR', 'Could not ' + what)
}

function badRequest (res, errors) {
  return sendError(res, 400, 'VALIDATION_ERROR', errors.join('; '))
}

function badScenario (res, scenarioId) {
  return sendError(res, 404, 'NOT_FOUND', 'No meeting type with that id' + (scenarioId ? ': ' + scenarioId : ''))
}

/**
 * The client named in a request, checked against the CALLER'S firm. Null means 404.
 *
 * @param {object} req
 * @param {string} rawId - from params or body
 * @returns {Promise<object|null>}
 */
function clientOf (req, rawId) {
  const id = typeof rawId === 'string' ? rawId.trim() : ''
  if (!id || !req.firmId) { return Promise.resolve(null) }
  return clientStore.getById(id, req.firmId)
}

function scenarioOf (value) {
  const id = value ? String(value) : ''
  return KNOWN_SCENARIO_IDS.has(id) ? id : null
}

/** Who is writing, from the verified token. */
function setBy (req) {
  return {
    byId: req.advisorId || null,
    byName: (typeof req.advisorName === 'string' && req.advisorName.trim()) ? req.advisorName.trim().slice(0, 128) : null,
    at: new Date().toISOString()
  }
}

function pointFieldsOf (body) {
  const out = { ...(body || {}) }
  delete out.scenario
  delete out.pointId
  delete out.clientId
  return out
}

/**
 * The list this advisor would walk into a meeting with this client holding: the firm's
 * list, then their own layer, then the client's — through the SAME functions the report uses.
 *
 * @param {object} req
 * @param {string} clientId
 * @param {string|null} wanted - one scenario id, or null for all
 * @returns {Promise<Array<object>>}
 */
async function scenariosFor (req, clientId, wanted) {
  const observationRoutes = require('./meetingObservations')
  const resolved = await loadResolvedObservations(req.firmId, observationRoutes.readScopeConfig)
  const advisorState = await observationRoutes.loadAdvisorState(req.firmId, req.advisorId)
  const entityState = await loadEntityState(req.firmId, clientId)

  return meetingScenarios()
    .filter(s => wanted === null || s.id === wanted)
    .map((s) => {
      const firmPoints = (resolved[s.id] && resolved[s.id].points) || []
      const mine = applyAdvisorLayer(firmPoints, {
        declines: advisorState.declines[s.id] || [],
        own: advisorState.own[s.id] || []
      })
      const client = {
        declines: entityState.declines[s.id] || [],
        own: entityState.own[s.id] || []
      }
      const points = applyEntityLayer(mine, client).map(withSetBy)
      const setAside = entitySetAsidePoints(mine, client.declines).map(withSetBy)
      return { id: s.id, name: s.name, points, setAside }
    })
}

/** `asAdvisorPreset` keeps the fields the report needs; the screen also needs who set it. */
function withSetBy (p) {
  const slim = asAdvisorPreset({ points: [p] })[0]
  return {
    ...slim,
    ...(p.setBy ? { setBy: p.setBy } : {}),
    ...(p.setAsideLabel ? { setAsideLabel: p.setAsideLabel } : {})
  }
}

// ── Routes ───────────────────────────────────────────────────────────────────────────

/**
 * GET /api/meeting/observations/client/:clientId — the list for meetings with this client.
 *
 * @route GET /api/meeting/observations/client/:clientId
 * @param {string} [req.query.scenario]
 * @returns {{client: {id, name}, scenarios: Array.<{id, name, points, setAside}>, maxOwnPerScenario: number}}
 */
async function getForClient (req, res) {
  const wanted = req.query && req.query.scenario ? String(req.query.scenario) : null
  if (wanted !== null && !KNOWN_SCENARIO_IDS.has(wanted)) { return badScenario(res, wanted) }
  try {
    const client = await clientOf(req, req.params && req.params.clientId)
    if (!client) { return sendError(res, 404, 'NOT_FOUND', 'No client with that id in your firm') }
    const scenarios = await scenariosFor(req, client.id, wanted)
    res.send(200, {
      client: { id: client.id, name: client.name },
      scenarios,
      maxOwnPerScenario: MAX_OWN_POINTS_PER_SCENARIO
    })
  } catch (err) {
    return serverError(res, err, 'read the points for this client')
  }
}

/**
 * POST /api/meeting/observations/client/decline — set a point aside for this client, or put
 * it back. Binds every advisor who meets this client (question 1), and names who did it
 * (question 4).
 *
 * @route POST /api/meeting/observations/client/decline
 * @param {string} req.body.clientId
 * @param {string} req.body.scenario
 * @param {string} req.body.pointId
 * @param {boolean} req.body.declined
 * @returns {{success: true, declines: object[]}}
 */
async function setClientDecline (req, res) {
  const body = req.body || {}
  const scenario = scenarioOf(body.scenario)
  if (!scenario) { return badScenario(res, body.scenario) }
  const pointId = typeof body.pointId === 'string' ? body.pointId.trim() : ''
  if (!pointId) { return badRequest(res, ['pointId is required']) }
  if (typeof body.declined !== 'boolean') { return badRequest(res, ['declined must be true or false']) }
  if (!req.advisorId) { return sendError(res, 403, 'FORBIDDEN', 'No advisor on this token') }

  try {
    const client = await clientOf(req, body.clientId)
    if (!client) { return sendError(res, 404, 'NOT_FOUND', 'No client with that id in your firm') }

    // Only a point the FIRM offers — see the file header for why the advisor's own are not.
    const observationRoutes = require('./meetingObservations')
    const resolved = await loadResolvedObservations(req.firmId, observationRoutes.readScopeConfig)
    const firmPoints = (resolved[scenario] && resolved[scenario].points) || []
    if (body.declined && !firmPoints.some(p => p && p.id === pointId)) {
      return sendError(res, 404, 'NOT_FOUND', 'No such point in this meeting type')
    }

    const entry = await readEntityEntry(req.firmId, 'entityDeclines', client.id)
    const current = Array.isArray(entry.scenarios[scenario]) ? entry.scenarios[scenario] : []
    let next
    if (body.declined) {
      next = current.some(d => d.id === pointId) ? current : current.concat([{ id: pointId, ...setBy(req) }])
    } else {
      next = current.filter(d => d.id !== pointId)
    }
    if (next.length) { entry.scenarios[scenario] = next } else { delete entry.scenarios[scenario] }

    await writeEntityEntry(req.firmId, 'entityDeclines', client.id, entry, req.advisorId)
    res.send(200, { success: true, declines: next })
  } catch (err) {
    return serverError(res, err, 'save that change')
  }
}

/**
 * POST /api/meeting/observations/client/own — add a point for meetings with this client.
 *
 * @route POST /api/meeting/observations/client/own
 * @param {string} req.body.clientId
 * @param {string} req.body.scenario
 * @param {string} req.body.text
 * @param {string[]} [req.body.hintWords]
 * @param {boolean} [req.body.cannotHear]
 * @returns {{success: true, point: object}}
 */
async function addClientPoint (req, res) {
  const body = req.body || {}
  const scenario = scenarioOf(body.scenario)
  if (!scenario) { return badScenario(res, body.scenario) }
  if (!req.advisorId) { return sendError(res, 403, 'FORBIDDEN', 'No advisor on this token') }
  const { ok, errors, value } = validateAdvisorPoint(pointFieldsOf(body), { requireText: true })
  if (!ok) { return badRequest(res, errors) }

  try {
    const client = await clientOf(req, body.clientId)
    if (!client) { return sendError(res, 404, 'NOT_FOUND', 'No client with that id in your firm') }

    const entry = await readEntityEntry(req.firmId, 'entityOwn', client.id)
    const current = Array.isArray(entry.scenarios[scenario]) ? entry.scenarios[scenario] : []
    if (current.length >= MAX_OWN_POINTS_PER_SCENARIO) {
      return badRequest(res, ['no more than ' + MAX_OWN_POINTS_PER_SCENARIO + ' points for one client in one meeting type'])
    }

    const minted = nextEntityPointId(current, entry.nextSeq[scenario])
    const point = {
      id: minted.id,
      text: value.text,
      hintWords: value.hintWords || [],
      cannotHear: Boolean(value.cannotHear),
      ...setBy(req)
    }
    entry.scenarios[scenario] = current.concat([point])
    entry.nextSeq[scenario] = minted.seq

    await writeEntityEntry(req.firmId, 'entityOwn', client.id, entry, req.advisorId)
    res.send(200, { success: true, point })
  } catch (err) {
    return serverError(res, err, 'add that point')
  }
}

/**
 * PUT /api/meeting/observations/client/own — edit a point on this client's list.
 *
 * Any advisor in the firm may (question 3). The edit is stamped with the editor, so the
 * screen names who last set it rather than who first wrote it.
 *
 * @route PUT /api/meeting/observations/client/own
 * @returns {{success: true, point: object}}
 */
async function updateClientPoint (req, res) {
  const body = req.body || {}
  const scenario = scenarioOf(body.scenario)
  if (!scenario) { return badScenario(res, body.scenario) }
  const pointId = typeof body.pointId === 'string' ? body.pointId.trim() : ''
  if (!pointId) { return badRequest(res, ['pointId is required']) }
  if (!req.advisorId) { return sendError(res, 403, 'FORBIDDEN', 'No advisor on this token') }
  const { ok, errors, value } = validateAdvisorPoint(pointFieldsOf(body), { requireText: true })
  if (!ok) { return badRequest(res, errors) }

  try {
    const client = await clientOf(req, body.clientId)
    if (!client) { return sendError(res, 404, 'NOT_FOUND', 'No client with that id in your firm') }

    const entry = await readEntityEntry(req.firmId, 'entityOwn', client.id)
    const current = Array.isArray(entry.scenarios[scenario]) ? entry.scenarios[scenario] : []
    const index = current.findIndex(p => p && p.id === pointId)
    if (index === -1) { return sendError(res, 404, 'NOT_FOUND', 'No point for this client with that id') }

    const point = {
      id: pointId,
      text: value.text,
      hintWords: value.hintWords || [],
      cannotHear: Boolean(value.cannotHear),
      ...setBy(req)
    }
    entry.scenarios[scenario] = current.slice(0, index).concat([point], current.slice(index + 1))

    await writeEntityEntry(req.firmId, 'entityOwn', client.id, entry, req.advisorId)
    res.send(200, { success: true, point })
  } catch (err) {
    return serverError(res, err, 'save that point')
  }
}

/**
 * POST /api/meeting/observations/client/own/remove — remove a point from this client's list.
 * A POST because Restify 9 does not parse a DELETE body.
 *
 * @route POST /api/meeting/observations/client/own/remove
 * @returns {{success: true}}
 */
async function deleteClientPoint (req, res) {
  const body = req.body || {}
  const scenario = scenarioOf(body.scenario)
  if (!scenario) { return badScenario(res, body.scenario) }
  const pointId = typeof body.pointId === 'string' ? body.pointId.trim() : ''
  if (!pointId) { return badRequest(res, ['pointId is required']) }
  if (!req.advisorId) { return sendError(res, 403, 'FORBIDDEN', 'No advisor on this token') }

  try {
    const client = await clientOf(req, body.clientId)
    if (!client) { return sendError(res, 404, 'NOT_FOUND', 'No client with that id in your firm') }

    const entry = await readEntityEntry(req.firmId, 'entityOwn', client.id)
    const current = Array.isArray(entry.scenarios[scenario]) ? entry.scenarios[scenario] : []
    if (!current.some(p => p && p.id === pointId)) {
      return sendError(res, 404, 'NOT_FOUND', 'No point for this client with that id')
    }
    const next = current.filter(p => p && p.id !== pointId)
    if (next.length) { entry.scenarios[scenario] = next } else { delete entry.scenarios[scenario] }
    // `nextSeq` stays: the high-water mark that stops a removed point's id being reissued.

    await writeEntityEntry(req.firmId, 'entityOwn', client.id, entry, req.advisorId)
    res.send(200, { success: true })
  } catch (err) {
    return serverError(res, err, 'remove that point')
  }
}

module.exports = {
  getForClient,
  setClientDecline,
  addClientPoint,
  updateClientPoint,
  deleteClientPoint,
  loadEntityState
}
