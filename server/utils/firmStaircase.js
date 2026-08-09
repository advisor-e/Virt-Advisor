'use strict'

/**
 * @file Single read path for a firm's Advisory Staircase decisions.
 * @module server/utils/firmStaircase
 *
 * The staircase joins the one firm-editable mechanism (ruled 2026-07-30). A firm's
 * decisions about the platform's five steps are stored the way Advisory Distinctions
 * stores its own — in SEPARATE, ADDITIVE config keys, so the key that already exists
 * is never rewritten and nothing a firm has saved has to be migrated:
 *
 *   - staircase-declines  -> platform step ids (as-*) the firm switched off   (array)
 *   - staircase-overrides -> the firm's edits, keyed by the as-* id they replace (object)
 *   - staircase-own       -> steps the firm added itself                       (array)
 *   - advisory-staircase  -> UNCHANGED, and still the home of defaultCeiling
 *
 * WHY defaultCeiling STAYS WHERE IT IS. The mechanism is for a LIST OF ROWS inherited
 * from above, where "switch this one off" and "add your own" mean something.
 * defaultCeiling is a single setting — the same reason Currency was ruled out of the
 * mechanism entirely. Forcing it through would be cargo-cult consistency.
 *
 * Both the advisor engine and the Firm Manager routes read through this one function,
 * so the management screen and the advisor session can never disagree about what a
 * firm has configured. `loadFirmConfig` is injected rather than imported, so the
 * engine reuses the client it already has and tests need no database.
 *
 * In development `loadFirmConfig` rejects (no MySQL); we then fall back to the
 * gitignored dev-JSON maps keyed by firmId, exactly as firmDistinctions.js does.
 * Without that fallback the feature would look broken in the only environment it can
 * currently be tried in — a firm manager saves, and the read reports "no override".
 * These dev files are TEST-ONLY (no version history) and are replaced by real MySQL
 * persistence before production.
 */

const fs = require('fs')
const path = require('path')
const { isPlatformScope } = require('./platformScope')

const IS_DEV = process.env.NODE_ENV !== 'production'

const CONFIG_KEYS = {
  declines: 'staircase-declines',
  overrides: 'staircase-overrides',
  own: 'staircase-own',
  // The pre-existing whole-config key. Still read (for defaultCeiling) and still
  // written by the ceiling controls — never repurposed.
  settings: 'advisory-staircase'
}

const DEV_FILES = {
  declines: 'data/dev-firm-staircase-declines.json',
  overrides: 'data/dev-firm-staircase-overrides.json',
  own: 'data/dev-firm-staircase-own.json',
  settings: 'data/dev-firm-staircase.json'
}

/**
 * The fields a firm may edit on a step it inherited. complexityCeiling is included
 * because it is what the tab already let a firm set; anything not on this list — most
 * importantly `id` and `step` — is identity or position and is not the firm's to change.
 * @type {string[]}
 */
const EDITABLE_STEP_FIELDS = ['name', 'selectorDescription', 'complexityCeiling']

/**
 * Prefix for a step the firm ADDED. Deliberately not `as-`: the platform's ids and a
 * firm's own ids live under sibling keys and are compared against each other, and two
 * id systems that can collide is how a firm's step later silently replaces one of
 * Advisor-e's. Same reasoning as the coaching reference's `cr-` prefix.
 * @type {string}
 */
const FIRM_STEP_PREFIX = 'fs-'

/**
 * Prefix for a step the MENTOR added, at the reserved platform scope.
 *
 * WHY IT IS NOT `fs-` TOO (2026-08-09, Phase 5). Own-row numbers are minted per scope,
 * from the rows that scope already holds — so the mentor's first added step and a
 * firm's first added step would BOTH be `fs-1`. That was harmless while the two never
 * met. Phase 5 makes them meet: the mentor's step arrives at a firm as an inherited
 * row and the firm's own is appended beside it, giving one resolved list two different
 * steps under one identity. Every decision in the mechanism is keyed to an id, so the
 * firm switching off "its" step would drop the mentor's instead. Sibling id systems
 * that can collide is exactly what FIRM_STEP_PREFIX above exists to prevent — this is
 * the same rule applied to the tier that did not exist when it was written.
 * @type {string}
 */
const MENTOR_STEP_PREFIX = 'ms-'

/**
 * The own-row prefix a scope mints under.
 *
 * @param {string|null} scopeId - a firm id, or the reserved platform scope
 * @returns {string} the prefix new own-step ids take at that scope
 */
function ownStepPrefix (scopeId) {
  return isPlatformScope(scopeId) ? MENTOR_STEP_PREFIX : FIRM_STEP_PREFIX
}

function _readDevMap (file) {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), file), 'utf8'))
  } catch (_e) {
    return {}
  }
}

/**
 * Load one config value, preferring the injected (production) loader and falling back
 * to the dev-JSON map keyed by firmId.
 *
 * THE FALLBACK IS DEV-ONLY, DELIBERATELY. In production an unreachable store is a real
 * fault and is thrown to the caller, which logs it and serves the platform staircase.
 * Reading a gitignored JSON file as though it were a firm's saved configuration is a
 * development convenience, and dressing a production outage up as "this firm has no
 * override" would hide the outage behind wording that looks deliberate.
 *
 * @param {Function} loadFirmConfig - async (firmId, key) => stored value
 * @param {string} firmId
 * @param {string} key - firmOverlay config key
 * @param {string} devFile - dev-JSON fallback path
 * @param {*} fallback - default when nothing is stored
 * @returns {Promise<*>}
 * @throws in production, when the store cannot be read
 */
async function _load (loadFirmConfig, firmId, key, devFile, fallback) {
  try {
    const value = await loadFirmConfig(firmId, key)
    return (value === null || value === undefined) ? fallback : value
  } catch (err) {
    if (!IS_DEV) { throw err }
    const map = _readDevMap(devFile)
    return Object.prototype.hasOwnProperty.call(map, firmId) ? map[firmId] : fallback
  }
}

/**
 * Read a firm's whole-config staircase override into the mechanism's shape.
 *
 * WHY THIS EXISTS AT ALL. Before the staircase joined the mechanism, the Firm Manager
 * tab saved a COMPLETE COPY of every step under `advisory-staircase`. No such row
 * exists in MySQL (never provisioned) and none exists in this machine's dev files —
 * but the old tab is live, the other machine's dev files cannot be read from here, and
 * discarding a firm's saved wording because the storage shape changed underneath them
 * is exactly the failure the whole mechanism is meant to prevent. So a whole-config
 * copy is READ as what it means: an edit of each step it recognises, and an added step
 * for each one it does not.
 *
 * Only consulted when the firm has made NO decision under the new keys — once they
 * save through the mechanism, that is their state and this is ignored.
 *
 * @param {Array<Object>} baseSteps - the platform steps (identity comes from these)
 * @param {*} legacyConfig - whatever was stored under `advisory-staircase`
 * @returns {{overrides: Object, ownRows: Array<Object>}} empty when there is nothing
 *   to carry across
 */
function adaptLegacyWholeConfig (baseSteps, legacyConfig, ownPrefix = FIRM_STEP_PREFIX) {
  const empty = { overrides: {}, ownRows: [] }
  const stored = legacyConfig && typeof legacyConfig === 'object' && !Array.isArray(legacyConfig)
    ? legacyConfig
    : null
  if (!stored || !Array.isArray(stored.steps) || stored.steps.length === 0) { return empty }

  const base = Array.isArray(baseSteps) ? baseSteps : []
  const byId = new Map(base.filter(s => s && s.id !== null && s.id !== undefined).map(s => [s.id, s]))
  const byPosition = new Map(base.filter(s => s && Number.isInteger(s.step)).map(s => [s.step, s]))

  const overrides = {}
  const ownRows = []
  let ownCount = 0

  for (const step of stored.steps) {
    if (!step || typeof step !== 'object') { continue }
    // Identity first, POSITION second — and the position half is not a fallback for
    // tidiness. The whole-config shape predates step ids and was positional by
    // construction: it replaced the array wholesale, so the firm's first row WAS the
    // platform's first row. Reading it any other way would re-file a firm's existing
    // wording under the wrong steps.
    const platformRow = ((step.id !== null && step.id !== undefined) ? byId.get(step.id) : null) ||
      (Number.isInteger(step.step) ? byPosition.get(step.step) : null)

    if (!platformRow) {
      // No platform row to attach to. Only a row that is genuinely usable becomes an
      // added step: it needs a position beyond the platform's and a name. Anything
      // else is malformed storage, and turning junk into a step the advisor can pick
      // would put it in front of a real client.
      const usable = Number.isInteger(step.step) && typeof step.name === 'string' && step.name.trim()
      if (!usable) { continue }
      ownCount += 1
      ownRows.push({
        id: `${ownPrefix}${ownCount}`,
        name: step.name,
        selectorDescription: typeof step.selectorDescription === 'string' ? step.selectorDescription : '',
        complexityCeiling: step.complexityCeiling
      })
      continue
    }

    // Carry across only the fields that actually DIFFER from the platform row. A copy
    // that matches the platform is not an edit, and recording it as one would make the
    // firm's row stop tracking Advisor-e's later wording fixes for no reason.
    const diff = {}
    for (const field of EDITABLE_STEP_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(step, field) && step[field] !== platformRow[field]) {
        diff[field] = step[field]
      }
    }
    if (Object.keys(diff).length > 0) { overrides[platformRow.id] = diff }
  }

  return { overrides, ownRows }
}

/**
 * Load and shape a firm's full staircase state for the resolver.
 *
 * @param {string|null} firmId - the authenticated firm id (never client-supplied: a
 *   body-supplied firm id would let one firm read another's configuration)
 * @param {Function} loadFirmConfig - async (firmId, key) => stored value
 * @param {Array<Object>} [baseSteps] - platform steps, used only by the legacy adapter
 * @returns {Promise<{declinedIds: string[], overrides: Object, ownRows: Array,
 *   defaultCeiling: (string|null), fromLegacy: boolean}>} `defaultCeiling` is null when
 *   the firm has not set one — the caller then keeps the platform's.
 */
async function loadFirmStaircaseState (firmId, loadFirmConfig, baseSteps) {
  const none = { declinedIds: [], overrides: {}, ownRows: [], defaultCeiling: null, fromLegacy: false }
  if (!firmId) { return none }

  const declines = await _load(loadFirmConfig, firmId, CONFIG_KEYS.declines, DEV_FILES.declines, [])
  const overrides = await _load(loadFirmConfig, firmId, CONFIG_KEYS.overrides, DEV_FILES.overrides, {})
  const own = await _load(loadFirmConfig, firmId, CONFIG_KEYS.own, DEV_FILES.own, [])
  const settings = await _load(loadFirmConfig, firmId, CONFIG_KEYS.settings, DEV_FILES.settings, null)

  const state = {
    declinedIds: Array.isArray(declines) ? declines : [],
    overrides: (overrides && typeof overrides === 'object' && !Array.isArray(overrides)) ? overrides : {},
    ownRows: Array.isArray(own) ? own : [],
    defaultCeiling: (settings && typeof settings === 'object' && typeof settings.defaultCeiling === 'string')
      ? settings.defaultCeiling
      : null,
    fromLegacy: false
  }

  // "Has this firm made a decision the mechanism recognises?" An override key that
  // matches no platform step is not a decision — it is leftover or malformed storage,
  // and counting it would silently suppress the legacy read below, losing the firm's
  // saved wording on the strength of junk.
  const baseIds = new Set((Array.isArray(baseSteps) ? baseSteps : [])
    .filter(s => s && s.id !== null && s.id !== undefined)
    .map(s => s.id))
  const hasNewState = state.declinedIds.length > 0 ||
    state.ownRows.length > 0 ||
    Object.keys(state.overrides).some(id => baseIds.has(id))
  if (hasNewState) { return state }

  const legacy = adaptLegacyWholeConfig(baseSteps, settings, ownStepPrefix(firmId))
  if (Object.keys(legacy.overrides).length === 0 && legacy.ownRows.length === 0) { return state }

  return { ...state, overrides: legacy.overrides, ownRows: legacy.ownRows, fromLegacy: true }
}

// DEV_FILES is intentionally NOT exported — the dev-JSON paths are an internal detail
// of this read path, as in firmDistinctions.js.
module.exports = {
  loadFirmStaircaseState,
  adaptLegacyWholeConfig,
  CONFIG_KEYS,
  EDITABLE_STEP_FIELDS,
  FIRM_STEP_PREFIX,
  MENTOR_STEP_PREFIX,
  ownStepPrefix
}
