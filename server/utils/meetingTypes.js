'use strict'

/**
 * @file The kinds of meeting a scope works to — the platform's shipped list, resolved
 *   through every tier's own decisions.
 * @module server/utils/meetingTypes
 *
 * Design: `design/MEETING-TYPES-CASCADE.md`, approved by Mike 2026-09-02 with all four of
 * its decisions ruled. This is slice 2 of four.
 *
 * 🔴 WHY MEETING TYPES ARE CONTENT AND NOT A CONSTANT. Until 2026-09-02 the eleven types
 * were fixed at build time and had to be ids in `data/logic_trees.json` — a rule nobody
 * asked for, which made the coaching trees the gatekeeper of what meetings can exist. Mike:
 * *"the creation of meeting types must be dynamic, editable and cascading from mentor — all
 * down thru the layers until reaching the business entity level"*. Slice 1 gave each type
 * its own name; this module lets a scope change the list.
 *
 * ⚠ THE MECHANISM IS `resolveInheritedRows`, THE SAME ONE THE POINTS USE, and for the same
 * reason: a list of rows inherited from above where "switch this one off" and "add my own"
 * both mean something. `meetingObservations.js` is the sibling to read first — this file is
 * deliberately its shape, one level up, so a reader learns one pattern rather than two.
 *
 * ⚠ FOUR KEYS, NOT THREE. The points need declines / overrides / own; types need those plus
 * ORDER, because a manager can move a kind of meeting up the list and position is not a
 * property of any single row. It is a separate key so that reordering never rewrites what a
 * scope has edited, and a shape change to one never has to migrate the other.
 *
 * Node 14, CommonJS.
 */

const fs = require('fs')
const path = require('path')
const { resolveInheritedRows } = require('./resolveInheritedRows')
const { parentScopeOf, tierOfScope } = require('./tierChain')
const { devFallbackAllowed: IS_DEV } = require('./dbFailure')
const { meetingScenarios } = require('./meetingObservations')

/**
 * The overlay addresses a scope's type decisions are stored under.
 *
 * Separate and additive, mirroring `meetingObservations.CONFIG_KEYS` exactly.
 *
 *   - meeting-type-declines  -> [typeId]                 inherited types switched off
 *   - meeting-type-overrides -> { typeId: {name?, …} }   edited fields
 *   - meeting-type-own       -> [ {id, name, treeId?} ]  types added here
 *   - meeting-type-order     -> [typeId]                 this scope's running order
 *
 * @type {Object.<string, string>}
 */
const CONFIG_KEYS = {
  declines: 'meeting-type-declines',
  overrides: 'meeting-type-overrides',
  own: 'meeting-type-own',
  order: 'meeting-type-order'
}

/** Dev-only stand-ins, used when there is no MySQL. Same gate as the points. */
const DEV_FILES = {
  declines: 'data/dev-meeting-type-declines.json',
  overrides: 'data/dev-meeting-type-overrides.json',
  own: 'data/dev-meeting-type-own.json',
  order: 'data/dev-meeting-type-order.json'
}

/**
 * The fields a scope may edit on a type it inherited.
 *
 * `id` is absent for the same reason it is absent on a point: it is identity, every
 * decline, override, order entry AND every recorded meeting is keyed to it. A renameable
 * id would re-file a scope's decisions against a different type, and orphan the meetings.
 * @type {string[]}
 */
const EDITABLE_TYPE_FIELDS = ['name', 'treeId']

/** Longest a name may be. Long enough for the shipped eleven; short enough to stay a label. */
const MAX_NAME_LENGTH = 120

/** Own-row prefixes, one per tier — the same collision guard as the points' `mm-`/`fm-`. */
const TYPE_PREFIX_BY_TIER = {
  mentor: 'mt-',
  global_group_manager: 'xt-',
  group_manager: 'gt-',
  firm_manager: 'ft-'
}

/** How a resolved type is badged for the screen. */
const TYPE_SOURCE_LABELS = {
  inherited: 'inherited',
  override: 'edited-here',
  own: 'added-here'
}

/**
 * The own-type prefix a scope mints under.
 * @param {string|null} scopeId
 * @returns {string}
 */
function ownTypePrefix (scopeId) {
  return TYPE_PREFIX_BY_TIER[tierOfScope(scopeId)] || TYPE_PREFIX_BY_TIER.firm_manager
}

// ── Validation ───────────────────────────────────────────────────────────────────────

/**
 * Checks one type's editable fields.
 *
 * Fails closed: an unknown field is an error rather than a value quietly kept, matching
 * `meetingObservations.validatePointFields`. A field the store accepts and no screen
 * renders is a manager believing they have changed something they have not.
 *
 * ⚠ `treeId` MAY BE CLEARED, and that is not the same as omitting it. An explicit `null`
 * means "this meeting has no coaching material", and it must survive — otherwise a scope
 * can attach a tree and never detach it. Omitting the field leaves whatever is inherited.
 *
 * @param {*} value - the submitted `{ name?, treeId? }`
 * @param {object} [opts]
 * @param {boolean} [opts.requireName] - true when creating, which must have a name
 * @returns {{ok: boolean, errors: string[], value: object}}
 */
function validateTypeFields (value, opts) {
  const errors = []
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, errors: ['a meeting type must be a JSON object'], value: {} }
  }

  const out = {}
  Object.keys(value).forEach((field) => {
    if (!EDITABLE_TYPE_FIELDS.includes(field)) {
      errors.push('unknown field: ' + field)
      return
    }
    const raw = value[field]

    if (field === 'treeId') {
      if (raw === null) { out.treeId = null; return }
      if (raw === undefined) { return }
      if (typeof raw !== 'string') { errors.push('treeId must be text or null'); return }
      const trimmedTree = raw.trim()
      out.treeId = trimmedTree || null
      return
    }

    if (raw === null || raw === undefined) { return }
    if (typeof raw !== 'string') { errors.push(field + ' must be text'); return }
    const trimmed = raw.trim()
    if (trimmed.length > MAX_NAME_LENGTH) {
      errors.push(field + ' must be ' + MAX_NAME_LENGTH + ' characters or fewer')
      return
    }
    // Whitespace-only is stored as absent rather than as an empty name: a type with no
    // words is dropped from the list on the way to the screen, so accepting one here
    // would make a manager's new meeting silently fail to appear.
    if (trimmed) { out[field] = trimmed }
  })

  if (opts && opts.requireName && !out.name) {
    errors.push('name is required')
  }

  return { ok: errors.length === 0, errors, value: out }
}

/**
 * Validates a whole stored decision value, keeping only what is well-formed.
 *
 * Never throws and never rejects a whole scope for one bad row — malformed storage for one
 * type must not stop a manager opening the screen. Same discipline as the points.
 *
 * @param {*} stored
 * @param {'declines'|'overrides'|'own'|'order'} kind
 * @returns {object|Array} the shape for that kind, always defined
 */
function readTypeDecisions (stored, kind) {
  if (kind === 'declines' || kind === 'order') {
    if (!Array.isArray(stored)) { return [] }
    return stored.filter(id => typeof id === 'string' && id)
  }

  if (kind === 'own') {
    if (!Array.isArray(stored)) { return [] }
    return stored
      .filter(r => r && typeof r === 'object' && typeof r.id === 'string' && r.id)
      .map((r) => {
        const { value } = validateTypeFields({ name: r.name, treeId: r.treeId }, {})
        return { id: r.id, ...value }
      })
      .filter(r => typeof r.name === 'string' && r.name)
  }

  // overrides
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) { return {} }
  const kept = {}
  Object.keys(stored).forEach((typeId) => {
    const { value } = validateTypeFields(stored[typeId], {})
    if (Object.keys(value).length) { kept[typeId] = value }
  })
  return kept
}

// ── Reading a scope's stored decisions ───────────────────────────────────────────────

function _readDevMap (file) {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), file), 'utf8'))
  } catch (_e) {
    return {}
  }
}

/**
 * Load one stored value, preferring the injected loader and falling back to the dev JSON.
 *
 * The fallback is dev-only, deliberately — `dbFailure.devFallbackAllowed` refuses it when a
 * live server REFUSED the statement, so a production outage cannot be dressed up as "this
 * scope has no overrides".
 *
 * @param {Function} loadFirmConfig
 * @param {string} scopeId
 * @param {string} key
 * @param {string} devFile
 * @returns {Promise<*>}
 */
async function _load (loadFirmConfig, scopeId, key, devFile) {
  try {
    const value = await loadFirmConfig(scopeId, key)
    return (value === null || value === undefined) ? null : value
  } catch (err) {
    if (!IS_DEV(err)) { throw err }
    const map = _readDevMap(devFile)
    return Object.prototype.hasOwnProperty.call(map, scopeId) ? map[scopeId] : null
  }
}

/**
 * One scope's own type decisions. No cascade — the raw read.
 *
 * @param {string|null} scopeId - the authenticated scope, never client-supplied (a
 *   body-supplied id would let one scope read another's configuration — IDOR)
 * @param {Function} loadFirmConfig
 * @returns {Promise<{declines: string[], overrides: object, own: object[], order: string[]}>}
 */
async function loadScopeTypeState (scopeId, loadFirmConfig) {
  const none = { declines: [], overrides: {}, own: [], order: [] }
  if (!scopeId) { return none }

  const declines = await _load(loadFirmConfig, scopeId, CONFIG_KEYS.declines, DEV_FILES.declines)
  const overrides = await _load(loadFirmConfig, scopeId, CONFIG_KEYS.overrides, DEV_FILES.overrides)
  const own = await _load(loadFirmConfig, scopeId, CONFIG_KEYS.own, DEV_FILES.own)
  const order = await _load(loadFirmConfig, scopeId, CONFIG_KEYS.order, DEV_FILES.order)

  return {
    declines: readTypeDecisions(declines, 'declines'),
    overrides: readTypeDecisions(overrides, 'overrides'),
    own: readTypeDecisions(own, 'own'),
    order: readTypeDecisions(order, 'order')
  }
}

/** True when a scope has decided anything — used to return the layer above by identity. */
function hasAnyTypeDecision (state) {
  return state.declines.length > 0 ||
    Object.keys(state.overrides).length > 0 ||
    state.own.length > 0 ||
    state.order.length > 0
}

/**
 * Apply a scope's running order to a resolved list.
 *
 * 🔴 IT IS A PREFERENCE, NOT A SCHEMA. A stored order can name a type that has since been
 * switched off above, and can be missing one added since — both are normal, neither is an
 * error. Named-and-present types lead in the stored order; everything else follows in the
 * order it arrived. So a stale order degrades into a partial preference rather than losing
 * a manager's meetings, which is the failure that would actually matter.
 *
 * @param {Array<object>} rows
 * @param {string[]} order
 * @returns {Array<object>}
 */
function applyOrder (rows, order) {
  if (!Array.isArray(order) || !order.length) { return rows }
  const byId = {}
  rows.forEach((r) => { byId[r.id] = r })

  const led = []
  const seen = {}
  order.forEach((id) => {
    if (byId[id] && !seen[id]) { led.push(byId[id]); seen[id] = true }
  })
  rows.forEach((r) => { if (!seen[r.id]) { led.push(r) } })
  return led
}

/**
 * The meeting types in force at a scope.
 *
 * Recurses up the tier chain exactly as `loadResolvedObservations` does: the base a firm
 * resolves against is the mentor's resolved list. Same mechanism applied at each level
 * rather than a second rule for the tier above.
 *
 * ⚠ NEVER REJECTS. A storage fault falls back to the layer above and logs — an advisor
 * with no list of meetings cannot record one at all, so failing closed here would take out
 * a working feature to protect a preference.
 *
 * @param {string|null} scopeId
 * @param {Function} loadFirmConfig
 * @returns {Promise<Array.<{id: string, name: string, treeId: (string|null), source: string}>>}
 */
async function loadResolvedTypes (scopeId, loadFirmConfig) {
  const shipped = () => meetingScenarios().map(s => ({
    id: s.id, name: s.name, treeId: s.treeId || null
  }))

  if (!scopeId) { return shipped() }

  const parent = parentScopeOf(scopeId)
  const base = parent === null ? shipped() : await loadResolvedTypes(parent, loadFirmConfig)

  let state
  try {
    state = await loadScopeTypeState(scopeId, loadFirmConfig)
  } catch (err) {
    console.error('[meeting-types] scope read failed:', err.message)
    return base
  }

  // A scope that has decided nothing sees the layer above — but the BADGE is relative to
  // the viewer, so it is restamped.
  //
  // 🔴 WHY THIS IS NOT A PLAIN PASSTHROUGH, found while testing the resolver. `source` is
  // stamped by whichever level applied decisions, so a type the MENTOR added arrives here
  // still marked `added-here`. On a firm manager's screen that reads "Added here" against
  // something the mentor wrote — telling them they authored a type they cannot even edit.
  // A level that has decided nothing has, by definition, inherited everything it can see.
  if (!hasAnyTypeDecision(state)) {
    return base.map(t => ({ ...t, source: TYPE_SOURCE_LABELS.inherited }))
  }

  const resolved = resolveInheritedRows(
    base,
    { declinedIds: state.declines, overrides: state.overrides, ownRows: state.own },
    { sourceLabels: TYPE_SOURCE_LABELS }
  )

  // A type whose name was emptied somewhere up the chain is dropped here rather than
  // rendered as a blank row in a picker — the same rule slice 1 put on the shipped list.
  return applyOrder(resolved.filter(t => typeof t.name === 'string' && t.name), state.order)
}

/**
 * Mint the next own-type id for a scope.
 *
 * Counts from the ids the scope already holds rather than from the list length, so
 * deleting a type never hands its id to the next one added — a reused id would inherit the
 * deleted type's declines, overrides and, worse, its recorded meetings.
 *
 * @param {string} scopeId
 * @param {Array<object>} existingOwnRows
 * @returns {string}
 */
function nextOwnTypeId (scopeId, existingOwnRows) {
  const prefix = ownTypePrefix(scopeId)
  const used = (Array.isArray(existingOwnRows) ? existingOwnRows : [])
    .map(r => (r && typeof r.id === 'string' && r.id.indexOf(prefix) === 0)
      ? parseInt(r.id.slice(prefix.length), 10)
      : NaN)
    .filter(n => Number.isInteger(n) && n > 0)
  const highest = used.length ? Math.max(...used) : 0
  return prefix + (highest + 1)
}

module.exports = {
  CONFIG_KEYS,
  DEV_FILES,
  EDITABLE_TYPE_FIELDS,
  MAX_NAME_LENGTH,
  TYPE_PREFIX_BY_TIER,
  TYPE_SOURCE_LABELS,
  ownTypePrefix,
  validateTypeFields,
  readTypeDecisions,
  loadScopeTypeState,
  hasAnyTypeDecision,
  applyOrder,
  loadResolvedTypes,
  nextOwnTypeId
}
