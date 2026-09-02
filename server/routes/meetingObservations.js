'use strict'

/**
 * Meeting Review — observation points, Restify routes.
 *
 * What an advisor is checked on in a meeting of each kind. The mentor authors the platform
 * list; a firm inherits it and may edit a point, switch one off, or add its own beside it.
 *
 * Asked for by Mike 2026-09-01 — *"records the voices and transcribes the meeting, then
 * generates two reports"* — and this is slice 1 of that build: the points the second report
 * is checked against. Design `design/features/meeting-review.md` §3; artefact
 * `design/mockups/meeting-review.html` Stage A (manager) and Stage B1 (advisor), approved
 * 2026-09-01.
 *
 * 🔴 THIS FILE DELIBERATELY MIRRORS THE STAIRCASE ROUTES IN `firmManager.js` — the same
 * override / reset / decline / own-row set, over the same `resolveInheritedRows` mechanism.
 * A second way of doing inheritance is how two ways drift apart (`tier-cascade.md` §3).
 * It lives here rather than in `firmManager.js` because that file is already very large and
 * the Brief §5 puts Meeting Review's server code in files of its own.
 *
 * 🔴 EVERY ROUTE IS SCOPED TO `req.firmId`, THE VERIFIED SCOPE FROM THE JWT. No handler
 * reads a scope from a body or a query, so one tier can never read or write another's
 * points — `tier-cascade.md` P6, and the open IDOR item. That is why ONE set of routes
 * serves the mentor and every manager tier below it.
 *
 * ⚠ NOTHING ELSE OF MEETING REVIEW EXISTS YET. There is no recording, no transcript, no
 * report and no audio anywhere in this repository. These points are useful on their own —
 * Brief §3: the list "pays before a word is recorded" — which is why they are built first.
 *
 * Node 14, CommonJS.
 */

const fs = require('fs')
const path = require('path')
const overlay = require('../utils/firmOverlay')
const { sendError } = require('../utils/sendError')
const { devFallbackAllowed } = require('../utils/dbFailure')
const { parentScopeOf } = require('../utils/tierChain')
const {
  CONFIG_KEYS,
  DEV_FILES,
  MAX_POINT_LENGTH,
  meetingScenarios,
  validatePointFields,
  readDecisionMap,
  loadScopeObservationState,
  loadResolvedObservations,
  asAdvisorPreset,
  nextOwnPointId
} = require('../utils/meetingObservations')

/** Scenario ids that exist, so a request can never open a scenario that does not. */
const KNOWN_SCENARIO_IDS = new Set(meetingScenarios().map(s => s.id))

// ── Storage, with the house dev fallback ─────────────────────────────────────────────

/** Dev-only: the whole `{ scopeId: value }` map for one config key. */
function devReadAll (devFile) {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), devFile), 'utf8'))
  } catch (e) { return {} }
}

/** Dev-only: persist this scope's value into the JSON stand-in. */
function devWrite (devFile, scopeId, value) {
  const all = devReadAll(devFile)
  all[scopeId] = value
  fs.writeFileSync(path.resolve(process.cwd(), devFile), JSON.stringify(all, null, 2))
}

/**
 * The overlay reader the resolver walks the tier chain with, falling back to the dev files
 * so the cascade behaves the same way with and without a database.
 *
 * ⚠ The fallback is refused when a live server REFUSED the statement (`dbFailure`), so a
 * rejected read can never answer with stale dev data dressed up as "nothing stored".
 *
 * @param {string} scopeId
 * @param {string} key
 * @returns {Promise<object|null>}
 */
async function readScopeConfig (scopeId, key) {
  try {
    return await overlay.loadFirmConfig(scopeId, key)
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    const devFile = Object.keys(CONFIG_KEYS).filter(k => CONFIG_KEYS[k] === key).map(k => DEV_FILES[k])[0]
    if (!devFile) { throw err }
    const all = devReadAll(devFile)
    return Object.prototype.hasOwnProperty.call(all, scopeId) ? all[scopeId] : null
  }
}

/**
 * Write one config key for this scope, falling back to the dev file.
 *
 * @param {string} scopeId
 * @param {'declines'|'overrides'|'own'} part
 * @param {object} value
 * @param {string} savedBy
 * @returns {Promise<void>}
 */
async function writeScopeConfig (scopeId, part, value, savedBy) {
  try {
    await overlay.saveFirmConfig(scopeId, CONFIG_KEYS[part], value, savedBy)
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    devWrite(DEV_FILES[part], scopeId, value)
  }
}

/** This scope's stored map for one part, always an object. */
async function readPart (scopeId, part) {
  const stored = await readScopeConfig(scopeId, CONFIG_KEYS[part])
  return readDecisionMap(stored, part)
}

/** 500 with the fault logged server-side and nothing internal returned. */
function serverError (res, err, what) {
  console.error('[meeting-observations] ' + what + ':', err.message)
  return sendError(res, 500, 'DB_ERROR', 'Could not ' + what)
}

/** 404 unless the scenario is one the platform registers. */
function badScenario (res, scenarioId) {
  return sendError(res, 404, 'NOT_FOUND', 'No meeting scenario with that id')
}

// ── Manager routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/firm-manager/meeting-observations  (manager)
 *
 * Everything the tab draws: every meeting scenario with the points in force here, what this
 * tier decided ITSELF, and what it would see if it decided nothing.
 *
 * 🔴 `inherited` IS RESOLVED FROM THE PARENT, NOT SUBTRACTED FROM OUR OWN RESULT.
 * Subtraction cannot tell "same as the level above" from "set here to the same words", and
 * those are different decisions — one keeps tracking the mentor's later corrections and one
 * is protected from them. Same reasoning as `aiPrompts.getForManager`.
 *
 * @route GET /api/firm-manager/meeting-observations
 * @returns {{scenarios: object[], own: object, hasOwn: boolean, inherited: object,
 *   maxPointLength: number}}
 */
async function getForManager (req, res) {
  try {
    const parent = parentScopeOf(req.firmId)
    const inherited = parent === null
      ? await loadResolvedObservations(null, readScopeConfig)
      : await loadResolvedObservations(parent, readScopeConfig)

    const resolved = await loadResolvedObservations(req.firmId, readScopeConfig)
    const own = await loadScopeObservationState(req.firmId, readScopeConfig)

    const hasOwn = Object.keys(own.declines).length > 0 ||
      Object.keys(own.overrides).length > 0 ||
      Object.keys(own.own).length > 0

    res.send(200, {
      scenarios: meetingScenarios().map(s => resolved[s.id]),
      inherited,
      own,
      hasOwn,
      maxPointLength: MAX_POINT_LENGTH
    })
  } catch (err) {
    return serverError(res, err, 'read the observation points')
  }
}

/**
 * PUT /api/firm-manager/meeting-observations/:scenarioId/point/:pointId  (manager)
 *
 * Edit a point inherited from above, for this tier. Fields the body does not carry are NOT
 * recorded, so they keep tracking the level above's wording rather than being frozen at
 * today's text — the whole point of the mechanism.
 *
 * ⚠ The point must exist in the INHERITED list. An override keyed to something the level
 * above does not have is dropped by the resolver anyway (no phantom rows); refusing it here
 * is the half that can explain itself to the person who asked for it.
 *
 * @route PUT /api/firm-manager/meeting-observations/:scenarioId/point/:pointId
 * @param {object} req.body - `{ text?: string, advisorText?: string }`
 * @returns {{updated: true, scenarioId: string, pointId: string}}
 */
async function setPointOverride (req, res) {
  const scenarioId = String(req.params.scenarioId || '')
  const pointId = String(req.params.pointId || '')
  if (!KNOWN_SCENARIO_IDS.has(scenarioId)) { return badScenario(res, scenarioId) }

  const checked = validatePointFields(req.body || {}, { requireText: false })
  if (!checked.ok) { return sendError(res, 400, 'INVALID_POINT', checked.errors.join('; ')) }
  if (Object.keys(checked.value).length === 0) {
    return sendError(res, 400, 'INVALID_POINT', 'Nothing to change')
  }

  try {
    const parent = parentScopeOf(req.firmId)
    const above = await loadResolvedObservations(parent, readScopeConfig)
    const inheritedIds = ((above[scenarioId] && above[scenarioId].points) || []).map(p => p.id)
    if (!inheritedIds.includes(pointId)) {
      return sendError(res, 404, 'NOT_FOUND', 'No inherited point with that id — a point you added is edited on its own route')
    }

    const overrides = await readPart(req.firmId, 'overrides')
    const forScenario = { ...(overrides[scenarioId] || {}) }
    forScenario[pointId] = { ...(forScenario[pointId] || {}), ...checked.value }
    await writeScopeConfig(req.firmId, 'overrides', { ...overrides, [scenarioId]: forScenario }, req.userEmail)

    res.send(200, { updated: true, scenarioId, pointId })
  } catch (err) {
    return serverError(res, err, 'save that change')
  }
}

/**
 * DELETE /api/firm-manager/meeting-observations/:scenarioId/point/:pointId  (manager)
 *
 * Drop this tier's version of an inherited point, so the level above's wording applies
 * again — and keeps applying as that level changes it. Idempotent.
 *
 * @route DELETE /api/firm-manager/meeting-observations/:scenarioId/point/:pointId
 * @returns {{reset: true, scenarioId: string, pointId: string}}
 */
async function resetPointOverride (req, res) {
  const scenarioId = String(req.params.scenarioId || '')
  const pointId = String(req.params.pointId || '')
  if (!KNOWN_SCENARIO_IDS.has(scenarioId)) { return badScenario(res, scenarioId) }

  try {
    const overrides = await readPart(req.firmId, 'overrides')
    const forScenario = { ...(overrides[scenarioId] || {}) }
    if (Object.prototype.hasOwnProperty.call(forScenario, pointId)) {
      delete forScenario[pointId]
      const next = { ...overrides }
      if (Object.keys(forScenario).length) { next[scenarioId] = forScenario } else { delete next[scenarioId] }
      await writeScopeConfig(req.firmId, 'overrides', next, req.userEmail)
    }
    res.send(200, { reset: true, scenarioId, pointId })
  } catch (err) {
    return serverError(res, err, 'reset that point')
  }
}

/**
 * PUT /api/firm-manager/meeting-observations/:scenarioId/point/:pointId/decline  (manager)
 *
 * Switch an inherited point off for this tier, or back on. Only the declines key is
 * written — this tier's edit of the same point survives — so switching it back on returns
 * THIS TIER'S wording, not the level above's. Dropping an edit is the reset route; the two
 * are separate on purpose.
 *
 * ⚠ NO "LAST POINT" GUARD, deliberately, and it is not an oversight. An empty observation
 * list is a legitimate state here — ten of the eleven scenarios ship empty, awaiting the
 * mentor — so refusing the last decline would invent a rule the data itself breaks. The
 * staircase has such a guard because an advisor mid-session must have a step to choose.
 *
 * @route PUT /api/firm-manager/meeting-observations/:scenarioId/point/:pointId/decline
 * @param {boolean} req.body.declined
 * @returns {{declined: boolean, scenarioId: string, pointId: string}}
 */
async function setPointDecline (req, res) {
  const scenarioId = String(req.params.scenarioId || '')
  const pointId = String(req.params.pointId || '')
  if (!KNOWN_SCENARIO_IDS.has(scenarioId)) { return badScenario(res, scenarioId) }

  const declined = (req.body || {}).declined
  if (typeof declined !== 'boolean') {
    return sendError(res, 400, 'INVALID_DECLINED', 'declined must be a boolean')
  }

  try {
    const declines = await readPart(req.firmId, 'declines')
    const set = new Set(declines[scenarioId] || [])
    if (declined) { set.add(pointId) } else { set.delete(pointId) }
    const next = { ...declines }
    if (set.size) { next[scenarioId] = [...set] } else { delete next[scenarioId] }
    await writeScopeConfig(req.firmId, 'declines', next, req.userEmail)
    res.send(200, { declined, scenarioId, pointId })
  } catch (err) {
    return serverError(res, err, 'save that change')
  }
}

/**
 * POST /api/firm-manager/meeting-observations/:scenarioId/own  (manager)
 *
 * Add a point of this tier's own, after the ones it inherited.
 *
 * 🔴 THE ID IS ASSIGNED HERE AND NEVER TAKEN FROM THE BODY. An id from the browser could
 * collide with an inherited point and silently replace it, and every decline and override
 * in the mechanism is keyed to an id.
 *
 * @route POST /api/firm-manager/meeting-observations/:scenarioId/own
 * @param {object} req.body - `{ text: string, advisorText?: string }`
 * @returns {{added: true, scenarioId: string, pointId: string}}
 */
async function addOwnPoint (req, res) {
  const scenarioId = String(req.params.scenarioId || '')
  if (!KNOWN_SCENARIO_IDS.has(scenarioId)) { return badScenario(res, scenarioId) }

  const checked = validatePointFields(req.body || {}, { requireText: true })
  if (!checked.ok) { return sendError(res, 400, 'INVALID_POINT', checked.errors.join('; ')) }

  try {
    const own = await readPart(req.firmId, 'own')
    const rows = own[scenarioId] || []
    const pointId = nextOwnPointId(req.firmId, rows)
    const next = { ...own, [scenarioId]: [...rows, { id: pointId, ...checked.value }] }
    await writeScopeConfig(req.firmId, 'own', next, req.userEmail)
    res.send(201, { added: true, scenarioId, pointId })
  } catch (err) {
    return serverError(res, err, 'add that point')
  }
}

/**
 * PUT /api/firm-manager/meeting-observations/:scenarioId/own/:pointId  (manager)
 * @route PUT /api/firm-manager/meeting-observations/:scenarioId/own/:pointId
 * @param {object} req.body - `{ text?: string, advisorText?: string }`
 * @returns {{updated: true, scenarioId: string, pointId: string}}
 */
async function updateOwnPoint (req, res) {
  const scenarioId = String(req.params.scenarioId || '')
  const pointId = String(req.params.pointId || '')
  if (!KNOWN_SCENARIO_IDS.has(scenarioId)) { return badScenario(res, scenarioId) }

  const checked = validatePointFields(req.body || {}, { requireText: false })
  if (!checked.ok) { return sendError(res, 400, 'INVALID_POINT', checked.errors.join('; ')) }

  try {
    const own = await readPart(req.firmId, 'own')
    const rows = own[scenarioId] || []
    const index = rows.findIndex(r => r && r.id === pointId)
    if (index === -1) {
      return sendError(res, 404, 'NOT_FOUND', 'No point of your own with that id')
    }
    // `id` is re-applied after the spread: identity is never editable.
    const nextRows = rows.map((r, i) => (i === index ? { ...r, ...checked.value, id: pointId } : r))
    await writeScopeConfig(req.firmId, 'own', { ...own, [scenarioId]: nextRows }, req.userEmail)
    res.send(200, { updated: true, scenarioId, pointId })
  } catch (err) {
    return serverError(res, err, 'save that change')
  }
}

/**
 * DELETE /api/firm-manager/meeting-observations/:scenarioId/own/:pointId  (manager)
 * @route DELETE /api/firm-manager/meeting-observations/:scenarioId/own/:pointId
 * @returns {{deleted: true, scenarioId: string, pointId: string}}
 */
async function deleteOwnPoint (req, res) {
  const scenarioId = String(req.params.scenarioId || '')
  const pointId = String(req.params.pointId || '')
  if (!KNOWN_SCENARIO_IDS.has(scenarioId)) { return badScenario(res, scenarioId) }

  try {
    const own = await readPart(req.firmId, 'own')
    const rows = own[scenarioId] || []
    const remaining = rows.filter(r => r && r.id !== pointId)
    if (remaining.length === rows.length) {
      return sendError(res, 404, 'NOT_FOUND', 'No point of your own with that id')
    }
    const next = { ...own }
    if (remaining.length) { next[scenarioId] = remaining } else { delete next[scenarioId] }
    await writeScopeConfig(req.firmId, 'own', next, req.userEmail)
    res.send(200, { deleted: true, scenarioId, pointId })
  } catch (err) {
    return serverError(res, err, 'delete that point')
  }
}

/**
 * GET /api/firm-manager/meeting-observations/history  (manager)
 *
 * Every saved version of THIS scope's own decisions, per storage key. Version history and
 * restore come free with `firmOverlay`; they are surfaced rather than rebuilt.
 *
 * @route GET /api/firm-manager/meeting-observations/history
 * @returns {{history: Object.<string, Array<object>>}} keyed by `declines` · `overrides` · `own`
 */
async function history (req, res) {
  try {
    const out = {}
    for (const part of ['declines', 'overrides', 'own']) {
      out[part] = await overlay.getVersionHistory(req.firmId, CONFIG_KEYS[part])
    }
    res.send(200, { history: out })
  } catch (err) {
    if (devFallbackAllowed(err)) {
      res.send(200, { history: { declines: [], overrides: [], own: [] } })
      return
    }
    return serverError(res, err, 'read the change history')
  }
}

/**
 * POST /api/firm-manager/meeting-observations/restore  (manager)
 * @route POST /api/firm-manager/meeting-observations/restore
 * @param {object} req.body - `{ part: 'declines'|'overrides'|'own', versionId: number }`
 * @returns {{restored: true, part: string}}
 */
async function restore (req, res) {
  const part = String((req.body || {}).part || '')
  const versionId = (req.body || {}).versionId
  if (!Object.prototype.hasOwnProperty.call(CONFIG_KEYS, part)) {
    return sendError(res, 400, 'INVALID_PART', 'part must be declines, overrides or own')
  }
  if (!versionId) {
    return sendError(res, 400, 'MISSING_VERSION', 'versionId is required')
  }
  try {
    await overlay.restoreVersion(req.firmId, CONFIG_KEYS[part], Number(versionId))
    res.send(200, { restored: true, part })
  } catch (err) {
    return serverError(res, err, 'restore that version')
  }
}

// ── The advisor's route ──────────────────────────────────────────────────────────────

/**
 * GET /api/meeting/observations  (any signed-in advisor in the firm)
 *
 * The pre-set: what this advisor will be checked on, in their own voice, for the scenario
 * they pick. With no `scenario` query it returns every scenario, which is what the picker
 * on Stage B1 of the drawing needs before one is chosen.
 *
 * ⚠ READ-ONLY, AND THAT IS A DESIGN DECISION rather than an omission. An advisor may add
 * an objective of their own for one meeting (Brief §3, drawn as "Added by me, this
 * meeting") — that belongs to the MEETING, not to the firm's standing list, so it is
 * stored with the meeting when meetings exist. Letting an advisor write here would let one
 * person quietly edit what every advisor in the firm is checked on.
 *
 * @route GET /api/meeting/observations
 * @param {string} [req.query.scenario] - a logic-tree scenario id
 * @returns {{scenarios: Array.<{id: string, name: string, points: object[]}>}}
 */
async function getForAdvisor (req, res) {
  const wanted = req.query && req.query.scenario ? String(req.query.scenario) : null
  if (wanted !== null && !KNOWN_SCENARIO_IDS.has(wanted)) { return badScenario(res, wanted) }

  try {
    const resolved = await loadResolvedObservations(req.firmId, readScopeConfig)
    const scenarios = meetingScenarios()
      .filter(s => wanted === null || s.id === wanted)
      .map(s => ({
        id: s.id,
        name: s.name,
        points: asAdvisorPreset(resolved[s.id])
      }))
    res.send(200, { scenarios })
  } catch (err) {
    return serverError(res, err, 'read the observation points')
  }
}

module.exports = {
  getForManager,
  setPointOverride,
  resetPointOverride,
  setPointDecline,
  addOwnPoint,
  updateOwnPoint,
  deleteOwnPoint,
  history,
  restore,
  getForAdvisor,
  readScopeConfig
}
