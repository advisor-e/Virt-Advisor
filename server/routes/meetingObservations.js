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
 * ⚠ THIS FILE NOW SERVES TWO AUDIENCES. The manager routes above cover all four manager
 * tiers; the ADVISOR'S OWN LEVEL at the foot of the file is slice 4 of
 * MEETING-TYPES-CASCADE.md §7, built 2026-09-08 from
 * `design/mockups/meeting-preset-advisor-level.html`. They share this file's storage helpers
 * deliberately — a second way of reading the same overlay is how two ways drift apart.
 *
 * *(A note here read "NOTHING ELSE OF MEETING REVIEW EXISTS YET — no recording, no
 * transcript, no report and no audio". That was true on 2026-09-01 and stopped being true
 * the same week: recording, transcription, both reports, the manager aggregate, transcript
 * expiry and follow-through are all built. Replaced rather than dated, per the one-fact-one-
 * home rule.)*
 *
 * Node 14, CommonJS.
 */

const fs = require('fs')
const path = require('path')
const overlay = require('../utils/firmOverlay')
const { sendError } = require('../utils/sendError')
const { devFallbackAllowed } = require('../utils/dbFailure')
const { parentScopeOf, tierOfScope } = require('../utils/tierChain')
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
  nextOwnPointId,
  readNextSeqMap
} = require('../utils/meetingObservations')
const {
  CONFIG_KEYS: ADVISOR_KEYS,
  KEY_SEPARATOR: ADVISOR_KEY_SEPARATOR,
  advisorConfigKey,
  advisorIdFromKey,
  DEV_FILES: ADVISOR_DEV_FILES,
  MAX_OWN_POINTS_PER_SCENARIO,
  validateAdvisorPoint,
  readAdvisorDeclines,
  readAdvisorOwn,
  applyAdvisorLayer,
  setAsidePoints,
  setAsideSummary,
  nextAdvisorPointId
} = require('../utils/meetingObservationsAdvisor')

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
 * What separates a firm from an advisor inside a dev file's flat key.
 *
 * There is one dev file per config PART, not per row, so the advisor that the real config key
 * carries has to be put back into the address here or every advisor in a firm would share one
 * slot — reintroducing, in the dev store, the exact overwrite this change removed from MySQL.
 */
const DEV_ADVISOR_SEPARATOR = '::'

/**
 * The address one config key occupies in its dev file: the scope alone for a normal key, and
 * scope-plus-advisor for a per-advisor one.
 *
 * @param {string} scopeId
 * @param {string} key
 * @returns {string}
 */
function devIdForKey (scopeId, key) {
  const advisorId = advisorIdFromKey(key)
  return advisorId ? scopeId + DEV_ADVISOR_SEPARATOR + advisorId : scopeId
}

/**
 * Dev-only: every advisor's stored value for one scope, as `{ advisorId: value }` — the dev
 * twin of `overlay.loadFirmConfigsByPrefix`.
 *
 * @param {string} devFile
 * @param {string} scopeId
 * @returns {Object.<string, *>}
 */
function devReadAllForScope (devFile, scopeId) {
  const all = devReadAll(devFile)
  const prefix = scopeId + DEV_ADVISOR_SEPARATOR
  const out = {}
  Object.keys(all).forEach((id) => {
    if (id.indexOf(prefix) === 0) { out[id.slice(prefix.length)] = all[id] }
  })
  return out
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
    const devFile = devFileForKey(key)
    if (!devFile) { throw err }
    const all = devReadAll(devFile)
    const id = devIdForKey(scopeId, key)
    return Object.prototype.hasOwnProperty.call(all, id) ? all[id] : null
  }
}

/**
 * The dev stand-in file for one config key, across BOTH key sets this file serves.
 *
 * ⚠ It searches the advisor keys as well as the manager ones. Before the advisor's level
 * existed this was a one-line lookup over `CONFIG_KEYS`; an advisor key reaching it would
 * have found nothing, re-thrown, and turned a routine dev read into a 500 — with the
 * misleading message that the database was at fault.
 *
 * ⚠ AN ADVISOR KEY IS MATCHED BY PREFIX, because it carries the advisor id: an exact match
 * over `ADVISOR_KEYS` stopped finding anything the moment storage went to a row per advisor,
 * with the same misleading 500 as the fault above.
 *
 * @param {string} key
 * @returns {string|null}
 */
function devFileForKey (key) {
  const managerPart = Object.keys(CONFIG_KEYS).filter(k => CONFIG_KEYS[k] === key)[0]
  if (managerPart) { return DEV_FILES[managerPart] }
  const advisorPart = Object.keys(ADVISOR_KEYS).filter((k) => {
    return key === ADVISOR_KEYS[k] || String(key).indexOf(ADVISOR_KEYS[k] + ADVISOR_KEY_SEPARATOR) === 0
  })[0]
  if (advisorPart) { return ADVISOR_DEV_FILES[advisorPart] }
  return null
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

/**
 * This scope's minted-id high-water marks, keyed by scenario.
 *
 * ⚠ NOT `readPart`. `readDecisionMap` knows three kinds and would fall through to its
 * overrides branch for a fourth, quietly mangling the numbers into `{}`.
 *
 * @param {string} scopeId
 * @returns {Promise<Object.<string, number>>}
 */
async function readSeqPart (scopeId) {
  return readNextSeqMap(await readScopeConfig(scopeId, CONFIG_KEYS.nextSeq))
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
      // The caller's own tier, so the screen can gate the firm-only "Set aside by advisors"
      // panel without inferring a tier from the token itself.
      tier: tierOfScope(req.firmId),
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
 * 🔴 THE HIGH-WATER MARK IS SAVED BEFORE THE POINT, AND THAT ORDER IS THE GUARANTEE (item
 * 4.72). Two keys cannot be written atomically, so the order decides what a half-completed
 * write leaves behind. Mark first: if it fails, nothing is added at all; if the point then
 * fails, the mark is merely ahead of reality and the next id skips a number. Written the
 * other way round, a crash between the two would reissue the id that was just used — which
 * is the whole fault this closes.
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
    const seqs = await readSeqPart(req.firmId)
    const minted = nextOwnPointId(req.firmId, rows, seqs[scenarioId])

    await writeScopeConfig(req.firmId, 'nextSeq', { ...seqs, [scenarioId]: minted.seq }, req.userEmail)

    const next = { ...own, [scenarioId]: [...rows, { id: minted.id, ...checked.value }] }
    await writeScopeConfig(req.firmId, 'own', next, req.userEmail)
    res.send(201, { added: true, scenarioId, pointId: minted.id })
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
 * ✅ NO LONGER READ-ONLY (2026-09-08). It was, and the reason recorded here was wrong in
 * part: it said letting an advisor write "would let one person quietly edit what every
 * advisor in the firm is checked on". That is true of the FIRM's list and remains enforced —
 * nothing below writes upward. It was never true of the advisor's OWN level, which did not
 * exist yet. Mike corrected the same confusion on 2026-09-02: *"NOBODY can edit a level
 * ABOVE their own"*, which leaves an advisor free at their own.
 *
 * 🔴 EVERY WRITE BELOW IS KEYED TO `req.advisorId` FROM THE VERIFIED TOKEN, never from a
 * body or a query. One advisor cannot read or write another's list, in the same firm or any
 * other, because there is no request shape that can express it.
 *
 * @route GET /api/meeting/observations
 * @param {string} [req.query.scenario] - a logic-tree scenario id
 * @returns {{scenarios: Array.<{id, name, points, setAside}>, maxOwnPerScenario: number}}
 */
async function getForAdvisor (req, res) {
  const wanted = req.query && req.query.scenario ? String(req.query.scenario) : null
  if (wanted !== null && !KNOWN_SCENARIO_IDS.has(wanted)) { return badScenario(res, wanted) }

  try {
    const resolved = await loadResolvedObservations(req.firmId, readScopeConfig)
    const state = await loadAdvisorState(req.firmId, req.advisorId)

    const scenarios = meetingScenarios()
      .filter(s => wanted === null || s.id === wanted)
      .map((s) => {
        const firmPoints = (resolved[s.id] && resolved[s.id].points) || []
        const mine = {
          declines: state.declines[s.id] || [],
          own: state.own[s.id] || []
        }
        return {
          id: s.id,
          name: s.name,
          points: asAdvisorPreset({ points: applyAdvisorLayer(firmPoints, mine) }),
          // What this advisor has set aside, so the screen can offer it back. Shown rather
          // than hidden — see setAsidePoints for why.
          setAside: asAdvisorPreset({ points: setAsidePoints(firmPoints, mine.declines) })
        }
      })

    res.send(200, { scenarios, maxOwnPerScenario: MAX_OWN_POINTS_PER_SCENARIO })
  } catch (err) {
    return serverError(res, err, 'read the observation points')
  }
}

/**
 * GET /api/firm-manager/meeting-observations/set-aside  (firm manager)
 *
 * What Mike ordered on 2026-09-08 — *"yes but fix the issue - build it so the manager can
 * see"* — when he ruled that an advisor may set aside a point their firm set. Per meeting
 * type, per point: how many advisors have taken it off their own list, and which.
 *
 * 🔴 FIRM TIER ONLY, AND THIS IS A JUDGEMENT STATED RATHER THAN ASSUMED (the hub-page rule).
 * It is NOT a permission decision and not P13: an advisor's decisions are stored on their own
 * firm's row, so a scope above the firm has no advisors beneath it to summarise and would see
 * an empty section every time. An always-empty section is indistinguishable from a broken
 * one, which is the argument this screen's own design makes about listing untouched points.
 * A middle tier wanting this would need it rolled up from the firms below, which is a
 * different screen and a different decision.
 *
 * ⚠ NO DENOMINATOR. See `setAsideSummary` — this app holds no advisors table, so a firm's
 * headcount is unknowable here and a plausible wrong one is worse than none.
 *
 * @route GET /api/firm-manager/meeting-observations/set-aside
 * @returns {{scenarios: Array.<{id, name, points}>}}
 */
async function getSetAside (req, res) {
  if (tierOfScope(req.firmId) !== 'firm_manager') {
    return sendError(res, 403, 'FORBIDDEN', 'Only a firm sees what its own advisors have set aside')
  }

  try {
    const resolved = await loadResolvedObservations(req.firmId, readScopeConfig)
    // Every advisor's row, in one query. Each advisor writes only their own, so what is
    // assembled here can never be missing a change one of them was told had saved.
    const declines = readAdvisorDeclines(
      await readAdvisorMapForFirm(req.firmId, 'advisorDeclines')
    )

    const scenarios = meetingScenarios().map(s => ({
      id: s.id,
      name: s.name,
      points: setAsideSummary((resolved[s.id] && resolved[s.id].points) || [], declines, s.id)
    }))

    res.send(200, { scenarios })
  } catch (err) {
    return serverError(res, err, 'read what advisors have set aside')
  }
}

// ── The advisor's own level ──────────────────────────────────────────────────────────

/**
 * ONE advisor's stored entry for one part, always an object.
 *
 * 🔴 IT READS ONE ROW, NOT THE FIRM'S. That is item 4.75 and the whole of this change: while
 * every advisor read and rewrote a single firm-wide row, two saving inside the same
 * read-modify-write silently discarded one another's work, both answered 200. One row per
 * advisor gives each row one writer.
 *
 * The map validators are handed a map of one rather than a per-entry reader being written
 * beside them — see `readAdvisorDeclines` for why.
 *
 * @param {string} firmId - the verified scope
 * @param {'advisorDeclines'|'advisorOwn'} part
 * @param {string} advisorId - the verified advisor
 * @returns {Promise<object>} the entry, or an empty one of the right shape
 */
async function readAdvisorEntry (firmId, part, advisorId) {
  const empty = part === 'advisorOwn'
    ? { name: null, scenarios: {}, nextSeq: {} }
    : { name: null, scenarios: {} }

  const key = advisorConfigKey(part, advisorId)
  if (!key) { return empty }

  const stored = await readScopeConfig(firmId, key)
  const reader = part === 'advisorOwn' ? readAdvisorOwn : readAdvisorDeclines
  const map = reader({ [advisorId]: stored })
  return map[advisorId] || empty
}

/**
 * EVERY advisor's stored entry for one part in a firm, as `{ advisorId: stored }`.
 *
 * One query rather than one per advisor, and there is no list of a firm's advisors to iterate
 * anyway — this app holds no advisors table. Unvalidated on purpose: the caller passes it
 * straight to the same map reader it always used.
 *
 * @param {string} firmId
 * @param {'advisorDeclines'|'advisorOwn'} part
 * @returns {Promise<Object.<string, *>>}
 */
async function readAdvisorMapForFirm (firmId, part) {
  const prefix = ADVISOR_KEYS[part] + ADVISOR_KEY_SEPARATOR
  try {
    return await overlay.loadFirmConfigsByPrefix(firmId, prefix)
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    return devReadAllForScope(ADVISOR_DEV_FILES[part], firmId)
  }
}

/**
 * Write ONE advisor's entry back, with the house dev fallback.
 *
 * `savedBy` is the advisor id, as it was before: the row is theirs and nobody else writes it.
 *
 * @param {string} firmId
 * @param {'advisorDeclines'|'advisorOwn'} part
 * @param {string} advisorId
 * @param {object} entry
 * @returns {Promise<void>}
 */
async function writeAdvisorEntry (firmId, part, advisorId, entry) {
  const key = advisorConfigKey(part, advisorId)
  if (!key) { throw new Error('no advisor to key this write on') }
  try {
    await overlay.saveFirmConfig(firmId, key, entry, advisorId)
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    devWrite(ADVISOR_DEV_FILES[part], devIdForKey(firmId, key), entry)
  }
}

/**
 * Both of this advisor's slices, always defined.
 *
 * @param {string} firmId - the verified scope
 * @param {string|null} advisorId - the verified advisor
 * @returns {Promise<{declines: object, own: object}>}
 */
async function loadAdvisorState (firmId, advisorId) {
  if (!advisorId) { return { declines: {}, own: {} } }
  const declines = await readAdvisorEntry(firmId, 'advisorDeclines', advisorId)
  const own = await readAdvisorEntry(firmId, 'advisorOwn', advisorId)
  return { declines: declines.scenarios, own: own.scenarios }
}

/**
 * The entry about to be written, with the display name refreshed.
 *
 * ⚠ THE NAME IS REWRITTEN ON EVERY WRITE, deliberately. This app holds no advisors table to
 * join a name out of (`config/db-schema.sql`), so the stored copy is all the manager's screen
 * will ever have. Refreshing it means a change of name in Advisor-e reaches this screen the
 * next time that advisor touches their list, rather than never.
 */
function withName (entry, advisorName) {
  if (typeof advisorName === 'string' && advisorName.trim()) {
    entry.name = advisorName.trim().slice(0, 128)
  }
  return entry
}

/** 400 with the reasons, matching the manager routes' shape. */
function badRequest (res, errors) {
  return sendError(res, 400, 'VALIDATION_ERROR', errors.join('; '))
}

/**
 * The scenario id from a body, or null when it is not one the platform registers.
 *
 * @param {object} body
 * @returns {string|null}
 */
function scenarioFromBody (body) {
  const id = body && body.scenario ? String(body.scenario) : ''
  return KNOWN_SCENARIO_IDS.has(id) ? id : null
}

/**
 * The body minus the routing fields, so the validator sees everything else and can refuse
 * what it does not know.
 *
 * 🔴 IT PASSES THE REST OF THE BODY THROUGH ON PURPOSE. Picking out `text` and `hintWords`
 * by name — which this did until a test caught it on 2026-09-08 — makes the validator's
 * fail-closed rule unreachable: an `id`, a `cannotHear` or an `advisorText` in the body was
 * silently dropped and the advisor got a 200 saying their point was saved as sent. The id is
 * still minted server-side either way, so nothing was ever at risk; what was wrong is that
 * the app answered "yes, as you asked" to something it had not done.
 *
 * @param {object} body
 * @returns {object} the candidate point fields
 */
function pointFieldsOf (body) {
  const out = { ...(body || {}) }
  delete out.scenario
  delete out.pointId
  return out
}

/**
 * POST /api/meeting/observations/decline — take an inherited point off MY list, or put it back.
 *
 * ⚠ IT DOES NOT TOUCH THE FIRM'S LIST, and cannot: it writes only into this advisor's entry
 * of the advisor map. Mike ruled on 2026-09-08 that an advisor may set aside a point their
 * firm set, and ordered in the same breath that the manager be able to see it — which is why
 * the advisor's display name is stored beside the decision rather than the id alone.
 *
 * @route POST /api/meeting/observations/decline
 * @param {string} req.body.scenario - a registered scenario id
 * @param {string} req.body.pointId - the inherited point
 * @param {boolean} req.body.declined - true to set aside, false to put back
 * @returns {{success: true, declines: string[]}}
 */
async function setAdvisorDecline (req, res) {
  const body = req.body || {}
  const scenario = scenarioFromBody(body)
  if (!scenario) { return badScenario(res, body.scenario) }
  const pointId = typeof body.pointId === 'string' ? body.pointId.trim() : ''
  if (!pointId) { return badRequest(res, ['pointId is required']) }
  if (typeof body.declined !== 'boolean') { return badRequest(res, ['declined must be true or false']) }
  if (!req.advisorId) { return sendError(res, 403, 'FORBIDDEN', 'No advisor on this token') }

  try {
    // 🔴 A point may only be set aside if the FIRM actually offers it. Without this an
    // advisor could store a decline for any string, which would sit in the firm's config
    // for ever and appear on the manager's screen as a point nobody recognises.
    const resolved = await loadResolvedObservations(req.firmId, readScopeConfig)
    const firmPoints = (resolved[scenario] && resolved[scenario].points) || []
    if (body.declined && !firmPoints.some(p => p && p.id === pointId)) {
      return sendError(res, 404, 'NOT_FOUND', 'No such point in this meeting type')
    }

    const entry = withName(
      await readAdvisorEntry(req.firmId, 'advisorDeclines', req.advisorId), req.advisorName)
    const current = Array.isArray(entry.scenarios[scenario]) ? entry.scenarios[scenario] : []

    let next
    if (body.declined) {
      next = current.includes(pointId) ? current : current.concat([pointId])
    } else {
      next = current.filter(id => id !== pointId)
    }

    if (next.length) {
      entry.scenarios[scenario] = next
    } else {
      delete entry.scenarios[scenario]
    }

    // An advisor with nothing set aside leaves no row on the MANAGER'S SCREEN, so it never
    // has to filter out people who changed their mind. Since 2026-09-08 the emptied row is
    // written rather than deleted from a map — an advisor now owns a row of their own and
    // there is no delete on the overlay — and `readAdvisorDeclines` drops an entry holding no
    // scenarios, so what the manager is shown is unchanged.

    await writeAdvisorEntry(req.firmId, 'advisorDeclines', req.advisorId, entry)
    res.send(200, { success: true, declines: next })
  } catch (err) {
    return serverError(res, err, 'save that change')
  }
}

/**
 * POST /api/meeting/observations/own — add a point only I am checked on.
 *
 * `hintWords` is accepted: Mike's ruling of 2026-09-08 reversed the recommendation to
 * withhold it. See `validateAdvisorPoint` for the argument he accepted.
 *
 * @route POST /api/meeting/observations/own
 * @param {string} req.body.scenario
 * @param {string} req.body.text
 * @param {string[]} [req.body.hintWords]
 * @returns {{success: true, point: object}}
 */
async function addAdvisorPoint (req, res) {
  const body = req.body || {}
  const scenario = scenarioFromBody(body)
  if (!scenario) { return badScenario(res, body.scenario) }
  if (!req.advisorId) { return sendError(res, 403, 'FORBIDDEN', 'No advisor on this token') }

  const { ok, errors, value } = validateAdvisorPoint(pointFieldsOf(body), { requireText: true })
  if (!ok) { return badRequest(res, errors) }

  try {
    const entry = withName(
      await readAdvisorEntry(req.firmId, 'advisorOwn', req.advisorId), req.advisorName)
    const current = Array.isArray(entry.scenarios[scenario]) ? entry.scenarios[scenario] : []

    if (current.length >= MAX_OWN_POINTS_PER_SCENARIO) {
      return badRequest(res, ['no more than ' + MAX_OWN_POINTS_PER_SCENARIO + ' points of your own in one meeting type'])
    }

    const minted = nextAdvisorPointId(current, entry.nextSeq[scenario])
    const point = { id: minted.id, text: value.text, hintWords: value.hintWords || [], cannotHear: Boolean(value.cannotHear) }
    entry.scenarios[scenario] = current.concat([point])
    entry.nextSeq[scenario] = minted.seq

    await writeAdvisorEntry(req.firmId, 'advisorOwn', req.advisorId, entry)
    res.send(200, { success: true, point })
  } catch (err) {
    return serverError(res, err, 'add that point')
  }
}

/**
 * PUT /api/meeting/observations/own — edit a point I added.
 *
 * ⚠ ONLY MY OWN. There is no route by which an advisor edits an inherited point's wording,
 * and that is the design rather than an omission: rewriting the firm's words would be
 * editing a level above, which P14 forbids.
 *
 * @route PUT /api/meeting/observations/own
 * @returns {{success: true, point: object}}
 */
async function updateAdvisorPoint (req, res) {
  const body = req.body || {}
  const scenario = scenarioFromBody(body)
  if (!scenario) { return badScenario(res, body.scenario) }
  const pointId = typeof body.pointId === 'string' ? body.pointId.trim() : ''
  if (!pointId) { return badRequest(res, ['pointId is required']) }
  if (!req.advisorId) { return sendError(res, 403, 'FORBIDDEN', 'No advisor on this token') }

  const { ok, errors, value } = validateAdvisorPoint(pointFieldsOf(body), { requireText: true })
  if (!ok) { return badRequest(res, errors) }

  try {
    const entry = withName(
      await readAdvisorEntry(req.firmId, 'advisorOwn', req.advisorId), req.advisorName)
    const current = Array.isArray(entry.scenarios[scenario]) ? entry.scenarios[scenario] : []
    const index = current.findIndex(p => p && p.id === pointId)
    // 404 rather than a silent create: a point this advisor does not own is not theirs to
    // write, and answering 200 would tell them an edit landed that never happened.
    if (index === -1) { return sendError(res, 404, 'NOT_FOUND', 'No point of yours with that id') }

    const point = { id: pointId, text: value.text, hintWords: value.hintWords || [], cannotHear: Boolean(value.cannotHear) }
    entry.scenarios[scenario] = current.slice(0, index).concat([point], current.slice(index + 1))

    await writeAdvisorEntry(req.firmId, 'advisorOwn', req.advisorId, entry)
    res.send(200, { success: true, point })
  } catch (err) {
    return serverError(res, err, 'save that point')
  }
}

/**
 * POST /api/meeting/observations/own/remove — remove a point I added.
 *
 * A POST rather than a DELETE with a body, matching the manager routes in this file: Restify
 * 9 does not parse a DELETE body, so a delete that carried one would silently act on
 * `undefined`.
 *
 * @route POST /api/meeting/observations/own/remove
 * @returns {{success: true}}
 */
async function deleteAdvisorPoint (req, res) {
  const body = req.body || {}
  const scenario = scenarioFromBody(body)
  if (!scenario) { return badScenario(res, body.scenario) }
  const pointId = typeof body.pointId === 'string' ? body.pointId.trim() : ''
  if (!pointId) { return badRequest(res, ['pointId is required']) }
  if (!req.advisorId) { return sendError(res, 403, 'FORBIDDEN', 'No advisor on this token') }

  try {
    const entry = withName(
      await readAdvisorEntry(req.firmId, 'advisorOwn', req.advisorId), req.advisorName)
    const current = Array.isArray(entry.scenarios[scenario]) ? entry.scenarios[scenario] : []
    if (!current.some(p => p && p.id === pointId)) {
      return sendError(res, 404, 'NOT_FOUND', 'No point of yours with that id')
    }

    const next = current.filter(p => p && p.id !== pointId)
    if (next.length) {
      entry.scenarios[scenario] = next
    } else {
      delete entry.scenarios[scenario]
    }

    // 🔴 `nextSeq` IS WRITTEN BACK EVEN WHEN NO POINTS REMAIN. It is the high-water mark that
    // stops a removed point's id being handed to the next one written. Dropping it to keep
    // storage tidy would reintroduce the exact collision nextAdvisorPointId exists to
    // prevent — and `readAdvisorOwn` keeps an entry that holds only a mark, for this reason.

    await writeAdvisorEntry(req.firmId, 'advisorOwn', req.advisorId, entry)
    res.send(200, { success: true })
  } catch (err) {
    return serverError(res, err, 'remove that point')
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
  getSetAside,
  getForAdvisor,
  setAdvisorDecline,
  addAdvisorPoint,
  updateAdvisorPoint,
  deleteAdvisorPoint,
  readScopeConfig,
  // Borrowed by meetingReview.js's `presetFor`, for the same reason `readScopeConfig` is: the
  // dev-fallback rules for the two advisor config keys live here, and report generation must
  // read the advisor's level through exactly the same path the screen does or the two drift.
  loadAdvisorState
}
