'use strict'

/**
 * @file Single read path for a scope's decisions about the COACHING REFERENCE ROWS.
 * @module server/utils/firmCoachingReference
 *
 * The coaching reference is the last of the five blocks named in the 2026-07-30
 * ruling to join the one firm-editable mechanism (see resolveInheritedRows.js). Its
 * fifteen platform rows already carry stable `cr-` ids, which is the precondition the
 * mechanism refuses to work without.
 *
 * Decisions are stored in SEPARATE, ADDITIVE config keys, exactly as the staircase and
 * the quizzes store theirs, so nothing already saved has to be migrated:
 *
 *   - coaching-declines  -> platform row ids (cr-*) this scope switched off  (array)
 *   - coaching-overrides -> this scope's edits, keyed by the cr- id they replace (object)
 *   - coaching-own       -> rows this scope added itself                      (array)
 *
 * 🔴 WHAT THIS FILE MUST NEVER TOUCH: `coaching-reference`.
 *
 * That key already exists and holds something completely different — a firm's PROMOTED
 * CASE OBSERVATIONS, appended by cases.promote (see coaching.appendFirmCoachingEntry).
 * Those are an advisor's own free text about a real client, and they reach the model
 * FENCED by fenceUntrusted(): data to weigh, never instructions to follow. The rows this
 * file governs are the opposite — curated guidance the model is meant to act on, and
 * they are not fenced.
 *
 * Folding the two together would have been the obvious way to wire this up, and it would
 * silently strip the fence off every promoted entry: a prompt-injection hole with nothing
 * on screen to notice it by. The two live under different keys, are resolved by different
 * code paths and are rendered into different prompt sections, and a test in
 * tests/unit/coachingConfig.test.js fails if the promoted entries ever arrive unfenced.
 *
 * In development `loadFirmConfig` rejects (no MySQL) and we fall back to gitignored
 * dev-JSON maps keyed by scope id, exactly as firmStaircase.js does — without it the
 * feature looks broken in the only environment it can currently be tried in. The
 * fallback is DEV-ONLY: in production an unreachable store is a real fault and is thrown
 * to the caller, which logs it and serves the layer above.
 */

const fs = require('fs')
const path = require('path')
const { tierOfScope } = require('./tierChain')
const { devFallbackAllowed: IS_DEV } = require('./dbFailure')

const CONFIG_KEYS = {
  declines: 'coaching-declines',
  overrides: 'coaching-overrides',
  own: 'coaching-own'
}

const DEV_FILES = {
  declines: 'data/dev-firm-coaching-declines.json',
  overrides: 'data/dev-firm-coaching-overrides.json',
  own: 'data/dev-firm-coaching-own.json'
}

/**
 * The fields a scope may edit on a row it inherited.
 *
 * WHY `template` IS NOT ON THIS LIST. Every row's `template` field names a template in
 * the library, and the whole purpose of the block is to steer the model toward picking
 * that template by name. Letting a firm retitle an inherited row would leave the
 * platform's id attached to guidance now pointing somewhere else — the model would be
 * coached toward a template that may not exist. A firm that wants different guidance for
 * a different template declines the inherited row and adds its own, which the mechanism
 * supports directly and which leaves both rows honestly labelled.
 *
 * `id` is identity and is re-applied by the resolver after the override spread, so it
 * cannot be edited even if it appeared here.
 * @type {string[]}
 */
const EDITABLE_COACHING_FIELDS = [
  'howItHelps',
  'whatToLookFor',
  'whereMayLead',
  'deliveryNotes',
  'scenarios'
]

/**
 * Own-row prefixes, one per tier.
 *
 * Not decoration: own-row numbers are minted per scope, from the rows that scope already
 * holds, so without distinct prefixes the mentor's first added row and a firm's first
 * added row would both be `1` — and every decision in the mechanism is keyed to an id,
 * so a firm switching off "its" row would drop the mentor's instead. This is the Phase-5
 * staircase defect (see firmStaircase.MENTOR_STEP_PREFIX), avoided rather than repeated.
 *
 * All four are distinct from each other and from the platform's own `cr-`.
 * @type {Object.<string, string>}
 */
const COACHING_PREFIX_BY_TIER = {
  mentor: 'mc-',
  global_group_manager: 'xc-',
  group_manager: 'gc-',
  firm_manager: 'fc-'
}

const FIRM_COACHING_PREFIX = COACHING_PREFIX_BY_TIER.firm_manager

/**
 * The own-row prefix a scope mints under.
 * @param {string|null} scopeId - a firm id, or a reserved tier scope id
 * @returns {string} the prefix new own-row ids take at that scope
 */
function ownCoachingPrefix (scopeId) {
  return COACHING_PREFIX_BY_TIER[tierOfScope(scopeId)] || FIRM_COACHING_PREFIX
}

function _readDevMap (file) {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), file), 'utf8'))
  } catch (_e) {
    return {}
  }
}

/**
 * Load one config value, preferring the injected (production) loader and falling back to
 * the dev-JSON map keyed by scope id. See the DEV-ONLY note in this file's header.
 *
 * @param {Function} loadFirmConfig - async (scopeId, key) => stored value
 * @param {string} scopeId
 * @param {string} key - firmOverlay config key
 * @param {string} devFile - dev-JSON fallback path
 * @param {*} fallback - default when nothing is stored
 * @returns {Promise<*>}
 * @throws in production, when the store cannot be read
 */
async function _load (loadFirmConfig, scopeId, key, devFile, fallback) {
  try {
    const value = await loadFirmConfig(scopeId, key)
    return (value === null || value === undefined) ? fallback : value
  } catch (err) {
    if (!IS_DEV(err)) { throw err }
    const map = _readDevMap(devFile)
    return Object.prototype.hasOwnProperty.call(map, scopeId) ? map[scopeId] : fallback
  }
}

/**
 * Strip every field a scope is not allowed to edit out of its stored overrides.
 *
 * ENFORCED HERE, ON THE READ, ON PURPOSE. The natural home for this is the save route
 * that will back the Firm Manager screen — but that screen does not exist yet, and a rule
 * that lives only in a route nobody has written is not a rule. Filtering on the way out
 * means a `template` field that reaches storage by any path — a future route with a gap
 * in it, a hand-edited dev file, a direct database write — still cannot repoint an
 * inherited row at a different template.
 *
 * An override left with no editable fields is dropped entirely rather than kept as an
 * empty object, so it does not count as "this scope has made a decision" and quietly
 * detach the row from the layer above.
 *
 * @param {Object} overrides - raw stored overrides, keyed by inherited row id
 * @returns {Object} the same map with only editable fields, empty entries removed
 */
function filterEditableFields (overrides) {
  const clean = {}
  for (const [id, edit] of Object.entries(overrides)) {
    if (!edit || typeof edit !== 'object' || Array.isArray(edit)) { continue }
    const kept = {}
    for (const field of EDITABLE_COACHING_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(edit, field)) { kept[field] = edit[field] }
    }
    if (Object.keys(kept).length > 0) { clean[id] = kept }
  }
  return clean
}

/**
 * Load and shape one scope's coaching-reference state for the resolver.
 *
 * There is deliberately NO legacy adapter here, unlike firmStaircase. The staircase had
 * a pre-existing whole-config key holding firms' saved wording that would have been lost;
 * the coaching rows have never been editable at any tier, so there is nothing saved
 * anywhere to carry across and inventing a reader for it would be guesswork.
 *
 * @param {string|null} scopeId - the authenticated firm id or reserved tier scope, taken
 *   from the verified JWT and never from a request body (a body-supplied id would be an
 *   IDOR: it would let one firm read another's configuration)
 * @param {Function} loadFirmConfig - async (scopeId, key) => stored value
 * @returns {Promise<{declinedIds: string[], overrides: Object, ownRows: Array}>} all three
 *   empty when the scope has decided nothing
 */
async function loadFirmCoachingState (scopeId, loadFirmConfig) {
  const none = { declinedIds: [], overrides: {}, ownRows: [] }
  if (!scopeId) { return none }

  const declines = await _load(loadFirmConfig, scopeId, CONFIG_KEYS.declines, DEV_FILES.declines, [])
  const overrides = await _load(loadFirmConfig, scopeId, CONFIG_KEYS.overrides, DEV_FILES.overrides, {})
  const own = await _load(loadFirmConfig, scopeId, CONFIG_KEYS.own, DEV_FILES.own, [])

  const rawOverrides = (overrides && typeof overrides === 'object' && !Array.isArray(overrides))
    ? overrides
    : {}

  return {
    declinedIds: Array.isArray(declines) ? declines : [],
    overrides: filterEditableFields(rawOverrides),
    ownRows: Array.isArray(own) ? own : []
  }
}

// DEV_FILES is intentionally NOT exported — the dev-JSON paths are an internal detail of
// this read path, as in firmStaircase.js and firmDistinctions.js.
module.exports = {
  loadFirmCoachingState,
  filterEditableFields,
  CONFIG_KEYS,
  EDITABLE_COACHING_FIELDS,
  COACHING_PREFIX_BY_TIER,
  FIRM_COACHING_PREFIX,
  ownCoachingPrefix
}
