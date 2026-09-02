'use strict'

/**
 * @file Manager routes for the KINDS of meeting — create, rename, reorder, switch off.
 * @module server/routes/meetingTypes
 *
 * Design: `design/MEETING-TYPES-CASCADE.md` §7 slice 2, approved by Mike 2026-09-02.
 * The sibling to read first is `server/routes/meetingObservations.js`, which does the same
 * job one level down (the points inside a type); this file is deliberately its shape.
 *
 * 🔴 EVERY ROUTE IS SCOPED TO `req.firmId`, THE VERIFIED SCOPE FROM THE JWT. No handler
 * reads a scope from a body or a query, so one tier cannot touch another's types even if it
 * asks to — the rule that closed the cases IDOR, and the mechanical half of Mike's P14:
 * *"NOBODY can edit a level ABOVE their own."* A scope can only ever write its own row.
 *
 * ⚠ SWITCHING A TYPE OFF IS NOT DELETING IT (D4, ruled 2026-09-02). It leaves the picker at
 * this level and below; a meeting already recorded against it stays readable, because the
 * meeting stores the id and the report needs to say what kind of meeting it was. Nothing
 * here destroys a type, and the route is named `decline` rather than `delete` for that
 * reason. A type a scope ADDED can be removed outright, because nothing above inherits it.
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
  MAX_NAME_LENGTH,
  validateTypeFields,
  readTypeDecisions,
  loadScopeTypeState,
  loadResolvedTypes,
  nextOwnTypeId
} = require('../utils/meetingTypes')

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
 * The overlay reader the resolver walks the tier chain with.
 *
 * ⚠ The fallback is refused when a live server REFUSED the statement (`dbFailure`), so a
 * rejected read can never answer with stale dev data dressed up as "nothing stored".
 *
 * @param {string} scopeId
 * @param {string} key
 * @returns {Promise<*>}
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
 * @param {string} scopeId
 * @param {'declines'|'overrides'|'own'|'order'} part
 * @param {*} value
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

/** This scope's stored value for one part, always the right shape. */
async function readPart (scopeId, part) {
  const stored = await readScopeConfig(scopeId, CONFIG_KEYS[part])
  return readTypeDecisions(stored, part)
}

/** 500 with the fault logged server-side and nothing internal returned. */
function serverError (res, err, what) {
  console.error('[meeting-types] ' + what + ':', err.message)
  return sendError(res, 500, 'DB_ERROR', 'Could not ' + what)
}

// ── Routes ───────────────────────────────────────────────────────────────────────────

/**
 * GET /api/firm-manager/meeting-types  (manager)
 *
 * Everything the section draws: the types in force here, what this scope decided itself,
 * and what it would see if it decided nothing.
 *
 * 🔴 `inherited` IS RESOLVED FROM THE PARENT, NOT SUBTRACTED FROM OUR OWN RESULT.
 * Subtraction cannot tell "same as the level above" from "set here to the same words", and
 * those are different decisions — one keeps tracking the mentor's later corrections and one
 * is protected from them.
 *
 * @route GET /api/firm-manager/meeting-types
 * @returns {{types: object[], own: object, hasOwn: boolean, inherited: object[],
 *   maxNameLength: number}}
 */
async function getTypes (req, res) {
  try {
    // ⚠ NOT `parent === null ? [] : …`. At the MENTOR the parent is null and the base is
    // the SHIPPED FILE, which `loadResolvedTypes` returns for a null scope. Treating the
    // top of the chain as inheriting nothing made the mentor unable to rename any of the
    // eleven — caught by driving the live routes, not by a test.
    const inherited = await loadResolvedTypes(parentScopeOf(req.firmId), readScopeConfig)
    const types = await loadResolvedTypes(req.firmId, readScopeConfig)
    const own = await loadScopeTypeState(req.firmId, readScopeConfig)

    const hasOwn = own.declines.length > 0 ||
      Object.keys(own.overrides).length > 0 ||
      own.own.length > 0 ||
      own.order.length > 0

    // The caller's own tier, so the screen can say which level it is editing rather than
    // guessing from a token it must never inspect. Slice 2 shows the editing controls at
    // the MENTOR only; slice 3 opens them to the other three, and the resolver already
    // handles all four, so that is a screen change and not a backend one.
    res.send(200, {
      tier: tierOfScope(req.firmId),
      types,
      own,
      hasOwn,
      inherited,
      maxNameLength: MAX_NAME_LENGTH
    })
  } catch (err) {
    return serverError(res, err, 'read the meeting types')
  }
}

/**
 * PUT /api/firm-manager/meeting-types/:typeId  (manager)
 *
 * Rename a type this scope INHERITED, or point it at different coaching material. Stored as
 * an override so the original is never lost and a reset restores it.
 *
 * ⚠ 404 UNLESS THE TYPE IS ACTUALLY INHERITED. A scope may not invent an override for a
 * type that does not reach it — that would be a decision with nothing to apply to, and it
 * would silently start applying the day the name appeared above.
 *
 * @route PUT /api/firm-manager/meeting-types/:typeId
 * @param {object} req.body - `{ name?: string, treeId?: string|null }`
 * @returns {{saved: true}}
 */
async function overrideType (req, res) {
  const typeId = String(req.params.typeId || '')
  const checked = validateTypeFields(req.body || {}, {})
  if (!checked.ok) { return sendError(res, 400, 'INVALID', checked.errors.join('; ')) }
  if (!Object.keys(checked.value).length) {
    return sendError(res, 400, 'INVALID', 'Nothing to change')
  }

  try {
    // The base this scope resolves against. For the mentor that is the shipped file, which
    // `loadResolvedTypes` returns for a null scope — see the note in `getTypes`.
    const above = await loadResolvedTypes(parentScopeOf(req.firmId), readScopeConfig)
    if (!above.some(t => t.id === typeId)) {
      return sendError(res, 404, 'NOT_FOUND', 'No inherited meeting type with that id')
    }

    const overrides = await readPart(req.firmId, 'overrides')
    const next = { ...overrides, [typeId]: { ...(overrides[typeId] || {}), ...checked.value } }
    await writeScopeConfig(req.firmId, 'overrides', next, req.userEmail || 'unknown')
    res.send(200, { saved: true })
  } catch (err) {
    return serverError(res, err, 'save that change')
  }
}

/**
 * DELETE /api/firm-manager/meeting-types/:typeId/override  (manager)
 *
 * Drop this scope's edit and go back to inheriting whatever the level above says.
 *
 * @route DELETE /api/firm-manager/meeting-types/:typeId/override
 * @returns {{reset: true}}
 */
async function resetType (req, res) {
  const typeId = String(req.params.typeId || '')
  try {
    const overrides = await readPart(req.firmId, 'overrides')
    if (!Object.prototype.hasOwnProperty.call(overrides, typeId)) {
      return sendError(res, 404, 'NOT_FOUND', 'Nothing is set here for that meeting type')
    }
    const next = { ...overrides }
    delete next[typeId]
    await writeScopeConfig(req.firmId, 'overrides', next, req.userEmail || 'unknown')
    res.send(200, { reset: true })
  } catch (err) {
    return serverError(res, err, 'reset that meeting type')
  }
}

/**
 * PUT /api/firm-manager/meeting-types/:typeId/declined  (manager)
 *
 * "Not used here" — and its opposite. D4 (Mike, 2026-09-02): switching a type off removes
 * the WHOLE type from the picker at this level and below, rather than leaving it present
 * with nothing to check.
 *
 * @route PUT /api/firm-manager/meeting-types/:typeId/declined
 * @param {object} req.body - `{ declined: boolean }`
 * @returns {{declined: boolean}}
 */
async function declineType (req, res) {
  const typeId = String(req.params.typeId || '')
  const declined = (req.body || {}).declined
  if (typeof declined !== 'boolean') {
    return sendError(res, 400, 'INVALID', 'declined must be true or false')
  }

  try {
    const declines = await readPart(req.firmId, 'declines')
    const set = declines.filter(id => id !== typeId)
    if (declined) { set.push(typeId) }
    await writeScopeConfig(req.firmId, 'declines', set, req.userEmail || 'unknown')
    res.send(200, { declined })
  } catch (err) {
    return serverError(res, err, 'save that change')
  }
}

/**
 * POST /api/firm-manager/meeting-types  (manager)
 *
 * A new kind of meeting, added at this scope and inherited by everything below it.
 *
 * ⚠ THE ID IS MINTED HERE AND NEVER TAKEN FROM THE BODY. A supplied id could collide with
 * an inherited type and silently replace it, and every decline, override, order entry and
 * recorded meeting is keyed to an id.
 *
 * @route POST /api/firm-manager/meeting-types
 * @param {object} req.body - `{ name: string, treeId?: string|null }`
 * @returns {{typeId: string}}
 */
async function addType (req, res) {
  const checked = validateTypeFields(req.body || {}, { requireName: true })
  if (!checked.ok) { return sendError(res, 400, 'INVALID', checked.errors.join('; ')) }

  try {
    const own = await readPart(req.firmId, 'own')
    const typeId = nextOwnTypeId(req.firmId, own)
    const next = [...own, { id: typeId, ...checked.value }]
    await writeScopeConfig(req.firmId, 'own', next, req.userEmail || 'unknown')
    res.send(201, { typeId })
  } catch (err) {
    return serverError(res, err, 'add that meeting type')
  }
}

/**
 * PUT /api/firm-manager/meeting-types/own/:typeId  (manager)
 *
 * Edit a type this scope added itself.
 *
 * @route PUT /api/firm-manager/meeting-types/own/:typeId
 * @returns {{saved: true}}
 */
async function editOwnType (req, res) {
  const typeId = String(req.params.typeId || '')
  const checked = validateTypeFields(req.body || {}, {})
  if (!checked.ok) { return sendError(res, 400, 'INVALID', checked.errors.join('; ')) }

  try {
    const own = await readPart(req.firmId, 'own')
    const index = own.findIndex(r => r && r.id === typeId)
    if (index === -1) {
      return sendError(res, 404, 'NOT_FOUND', 'No meeting type added here with that id')
    }
    const nextRows = own.map((r, i) => (i === index ? { ...r, ...checked.value, id: typeId } : r))
    await writeScopeConfig(req.firmId, 'own', nextRows, req.userEmail || 'unknown')
    res.send(200, { saved: true })
  } catch (err) {
    return serverError(res, err, 'save that meeting type')
  }
}

/**
 * DELETE /api/firm-manager/meeting-types/own/:typeId  (manager)
 *
 * Remove a type this scope ADDED. Only an own row can go outright — an inherited one is
 * switched off instead (D4), because this scope does not own it.
 *
 * ⚠ THE ID IS NOT FREED. `nextOwnTypeId` counts from the ids already held, so a removed
 * type's id is never handed to the next one added: a reused id would inherit the removed
 * type's decisions at every level below, and its recorded meetings.
 *
 * @route DELETE /api/firm-manager/meeting-types/own/:typeId
 * @returns {{removed: true}}
 */
async function removeOwnType (req, res) {
  const typeId = String(req.params.typeId || '')
  try {
    const own = await readPart(req.firmId, 'own')
    const remaining = own.filter(r => r && r.id !== typeId)
    if (remaining.length === own.length) {
      return sendError(res, 404, 'NOT_FOUND', 'No meeting type added here with that id')
    }
    await writeScopeConfig(req.firmId, 'own', remaining, req.userEmail || 'unknown')
    res.send(200, { removed: true })
  } catch (err) {
    return serverError(res, err, 'remove that meeting type')
  }
}

/**
 * PUT /api/firm-manager/meeting-types/order  (manager)
 *
 * This scope's running order for the list.
 *
 * ⚠ STORED AS A PREFERENCE, NOT A SCHEMA. Ids that no longer resolve are kept rather than
 * rejected — a type switched off above may be switched back on, and dropping its position
 * would silently move a manager's list. `applyOrder` ignores what it cannot place.
 *
 * @route PUT /api/firm-manager/meeting-types/order
 * @param {object} req.body - `{ order: string[] }`
 * @returns {{saved: true}}
 */
async function saveOrder (req, res) {
  const order = (req.body || {}).order
  if (!Array.isArray(order) || order.some(id => typeof id !== 'string' || !id)) {
    return sendError(res, 400, 'INVALID', 'order must be a list of meeting type ids')
  }
  try {
    await writeScopeConfig(req.firmId, 'order', order, req.userEmail || 'unknown')
    res.send(200, { saved: true })
  } catch (err) {
    return serverError(res, err, 'save that order')
  }
}

module.exports = {
  getTypes,
  overrideType,
  resetType,
  declineType,
  addType,
  editOwnType,
  removeOwnType,
  saveOrder,
  readScopeConfig
}
