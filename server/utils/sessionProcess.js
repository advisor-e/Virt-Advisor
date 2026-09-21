'use strict'

/**
 * @file The standard planning session a tier writes and every tier beneath inherits.
 * @module server/utils/sessionProcess
 *
 * Item 15.1. Approved artefact: `design/mockups/strategy-session-process.html`, its four
 * decisions ruled by Mike 2026-09-21 and the drawing itself approved by him the same day.
 *
 * 🔴 INHERIT-OR-OWN, THE WHOLE PROCESS — NOT ROW-BY-ROW. The Advisory Staircase resolves
 * through `resolveInheritedRows`, where a firm may decline one step of the platform's list
 * and keep the rest. A planning session is not that shape and must not be built as if it
 * were: the steps are an ORDER, and overriding step 3 of somebody else's order produces a
 * process nobody designed. So a tier either has written its own session or it inherits the
 * nearest one above it, entire. Decision C, ruled 2026-09-21.
 *
 * 🔴 AND THE VIEWER IS ALWAYS TOLD WHOSE IT IS. Same ruling: "a tier that has written
 * nothing shows what it inherits and says whose it is". Every resolve returns `source`, so
 * an inherited process can never be mistaken for an authored one — on the advisor's screen
 * or on a manager's.
 *
 * 🔴 ALL FOUR MANAGING TIERS AUTHOR, THE ADVISOR NEVER DOES. Decision C is a STATED
 * JUDGEMENT AGAINST the default-is-mentor-alone ruling of 2026-08-24, and the reason is on
 * the drawing: a firm's planning method is exactly what one firm does differently from
 * another. The advisor edits the session in front of him and his changes never travel back
 * up — that is the session store's business, not this module's.
 *
 * ⚠ THE CASCADE NEEDS NO NEW PLUMBING. `parentScopeOf` is the same ladder every cascading
 * block already climbs, so mentor → global group → group → firm works here without this
 * file knowing how many tiers there are. With no membership data every firm's parent is the
 * platform scope, which is the safe direction to fail: a firm whose group we do not know
 * inherits the mentor's session rather than a guessed brand's.
 *
 * ⚠ WHAT COMES BACK FROM STORAGE IS UNTRUSTED. A stored process was typed by a manager into
 * a browser. Every read goes through `validateProcess` before anything uses it, so a
 * malformed row degrades to the layer above instead of reaching a screen or a client's plan.
 *
 * Node 14, CommonJS.
 */

const fs = require('fs')
const path = require('path')

const BASE = require('../../data/session-processes.json')
const { parentScopeOf, tierOfScope } = require('./tierChain')
const { PLATFORM_SCOPE } = require('./platformScope')
const { devFallbackAllowed } = require('./dbFailure')

/**
 * `firm_framework_versions.config_key` for a tier's own standard session.
 *
 * ⚠ DELIBERATELY NOT IN `CASCADING_CONFIG_KEYS`. That set makes `loadFirmConfig` fold every
 * layer together with `deepMerge`, which is the row-by-row shape this module exists not to
 * be. The read here must be the RAW value at one scope; the walk up the ladder is done
 * below, one whole process at a time.
 */
const CONFIG_KEY = 'session-process'

/**
 * Dev-only store, for a developer machine with no MySQL.
 *
 * ⚠ THE GUARD IS `devFallbackAllowed`, NEVER A BARE NODE_ENV TEST. A live MySQL that
 * REFUSES a write carries a `sqlState`; treating that as "no database" would write a
 * manager's session to a scratch file and report it saved. See `server/utils/dbFailure.js`.
 */
const DEV_FILE = path.resolve(__dirname, '../../data/dev-session-processes.json')

/** A session of more steps than this is not a planning session; it is a paste. */
const MAX_STEPS = 24

/** Pivot's largest step holds four concepts; 60 clears a whole session in one step. */
const MAX_ITEMS_PER_STEP = 60

/** Mike's own step titles run long — "Assess current position by reviewing…" is 78. */
const MAX_NAME = 200

/** The advisor-facing tooltip. Long enough for a sentence or two, not for an essay. */
const MAX_PURPOSE = 600

/** A card key is `<conceptId>#<part>` or `fw-<id>`; nothing legitimate is near this. */
const MAX_KEY = 120

/**
 * The shipped platform session — a fresh copy every time.
 *
 * Returned by value because callers put it on a response and a shared mutable default
 * would let one request's edit reach the next one's screen.
 *
 * @returns {{name: string, steps: Array<{name: string, purpose: string, items: string[]}>}}
 */
function baseProcess () {
  return JSON.parse(JSON.stringify(BASE.process))
}

/**
 * Accept a process only if it is one, and return it stripped to the fields we store.
 *
 * 🔴 THIS IS THE TRUST BOUNDARY. The input is whatever a manager's browser sent, or
 * whatever a row in `firm_framework_versions` happens to hold — including a row written by
 * an older shape of this feature. Unknown fields are DROPPED rather than preserved: a field
 * we do not understand cannot be rendered safely and must not ride along into a client's
 * plan.
 *
 * ⚠ AN EMPTY STEP IS VALID AND IS NEVER PRUNED. Mike's ruling of 2026-09-20: Pivot's step 5
 * "Do It & Review It" has no slides behind it and still appears on the agenda a client
 * reads. A validator that dropped empty steps would quietly delete it.
 *
 * ⚠ A PROCESS WITH NO STEPS IS REFUSED. It is not a customisation, it is a dead end — the
 * advisor would receive a session with nothing in it and no way to tell that from a fault.
 *
 * @param {*} input - anything at all
 * @returns {{ok: true, process: object}|{ok: false, error: string}}
 */
function validateProcess (input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'A session process must be an object' }
  }

  const steps = input.steps
  if (!Array.isArray(steps)) {
    return { ok: false, error: 'A session process must carry a steps array' }
  }
  if (steps.length === 0) {
    return { ok: false, error: 'A session process must have at least one step' }
  }
  if (steps.length > MAX_STEPS) {
    return { ok: false, error: `A session process may hold at most ${MAX_STEPS} steps` }
  }

  const clean = []
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    if (!step || typeof step !== 'object' || Array.isArray(step)) {
      return { ok: false, error: `Step ${i + 1} is not a step` }
    }
    if (typeof step.name !== 'string') {
      return { ok: false, error: `Step ${i + 1} must carry a name` }
    }
    if (step.name.length > MAX_NAME) {
      return { ok: false, error: `Step ${i + 1}'s name is longer than ${MAX_NAME} characters` }
    }

    const purpose = step.purpose === undefined || step.purpose === null ? '' : step.purpose
    if (typeof purpose !== 'string') {
      return { ok: false, error: `Step ${i + 1}'s purpose must be text` }
    }
    if (purpose.length > MAX_PURPOSE) {
      return { ok: false, error: `Step ${i + 1}'s purpose is longer than ${MAX_PURPOSE} characters` }
    }

    const items = step.items === undefined ? [] : step.items
    if (!Array.isArray(items)) {
      return { ok: false, error: `Step ${i + 1}'s items must be a list` }
    }
    if (items.length > MAX_ITEMS_PER_STEP) {
      return { ok: false, error: `Step ${i + 1} holds more than ${MAX_ITEMS_PER_STEP} concepts` }
    }
    for (let j = 0; j < items.length; j++) {
      if (typeof items[j] !== 'string' || items[j].length === 0 || items[j].length > MAX_KEY) {
        return { ok: false, error: `Step ${i + 1} holds a concept reference that is not a key` }
      }
    }

    clean.push({
      name: step.name,
      purpose,
      // De-duplicated: a card belongs to exactly one step, so the same key twice in one
      // step is a save artefact rather than an intention, and it would render twice.
      items: items.filter((key, at) => items.indexOf(key) === at)
    })
  }

  // 🔴 ACROSS STEPS TOO. The advisor's own screen moves a card out of one step when it is
  // dropped into another, so a key in two steps can only arrive from a hand-edited payload
  // — and it would put one concept on two pages of the client's plan.
  const seen = {}
  for (let i = 0; i < clean.length; i++) {
    for (let j = 0; j < clean[i].items.length; j++) {
      const key = clean[i].items[j]
      if (seen[key]) {
        return { ok: false, error: `The same concept appears in more than one step (${key})` }
      }
      seen[key] = true
    }
  }

  const name = typeof input.name === 'string' && input.name.length <= MAX_NAME
    ? input.name
    : BASE.process.name

  return { ok: true, process: { name, steps: clean } }
}

/** Dev-only: the whole `{ scopeId: process }` map. @returns {object} */
function _readDevMap () {
  try {
    return JSON.parse(fs.readFileSync(DEV_FILE, 'utf8'))
  } catch (_e) {
    // Absent or unreadable is the normal state on a fresh machine — no session has been
    // authored yet, which is exactly what an empty map says.
    return {}
  }
}

/**
 * One scope's OWN stored session, or null — no cascade, the raw read.
 *
 * Never rejects. A scope whose storage cannot be read is treated as having written
 * nothing, so the resolve below falls through to the layer above rather than failing the
 * advisor's screen mid-session.
 *
 * @param {string} scopeId - a firm id, or a reserved tier scope id
 * @param {function(string, string): Promise<object|null>} loadFirmConfig - the overlay
 *   reader, injected rather than imported so tests need no database
 * @returns {Promise<object|null>} a validated process, or null
 */
async function readOwnProcess (scopeId, loadFirmConfig) {
  if (!scopeId || typeof scopeId !== 'string') { return null }

  let stored = null
  try {
    stored = await loadFirmConfig(scopeId, CONFIG_KEY)
  } catch (err) {
    if (!devFallbackAllowed(err)) {
      // A live server refused the read. Serving the layer above is still the right
      // behaviour for the caller, but this is a real fault and must be visible.
      console.error('[session-process] read refused by the database:', err.message)
      return null
    }
    stored = _readDevMap()[scopeId] || null
  }

  if (!stored) { return null }

  const checked = validateProcess(stored)
  if (!checked.ok) {
    // 🔴 A MALFORMED STORED ROW DEGRADES TO THE LAYER ABOVE, LOUDLY. Silently serving half
    // of it would put a session in front of a client with steps missing and nothing saying
    // so — the failure the validator exists to stop.
    console.error(`[session-process] stored process at ${scopeId} is malformed: ${checked.error}`)
    return null
  }
  return checked.process
}

/**
 * The session this scope actually works to, and whose it is.
 *
 * Walks the tier ladder from this scope upward and stops at the first level that has
 * written one. Nobody having written one is the normal state and gives the shipped
 * platform session.
 *
 * @param {string|null} scopeId - the caller's resolved scope, from the verified token and
 *   never from a request body
 * @param {function(string, string): Promise<object|null>} loadFirmConfig
 * @returns {Promise<{process: object, source: {scopeId: string, tier: string, shipped: boolean}, inherited: boolean}>}
 *   `inherited` is true when the process was written above the caller's own level, or is
 *   the shipped default and the caller is not the mentor. Never rejects.
 */
async function resolveProcess (scopeId, loadFirmConfig) {
  let cursor = scopeId && typeof scopeId === 'string' ? scopeId : null

  while (cursor) {
    // eslint-disable-next-line no-await-in-loop -- the ladder is four deep and each rung
    // decides whether the next is asked at all; a parallel read would query scopes we do
    // not need and would not be faster for it.
    const own = await readOwnProcess(cursor, loadFirmConfig)
    if (own) {
      return {
        process: own,
        source: { scopeId: cursor, tier: tierOfScope(cursor), shipped: false },
        inherited: cursor !== scopeId
      }
    }
    cursor = parentScopeOf(cursor)
  }

  return {
    process: baseProcess(),
    // The shipped file is the mentor's starting point, so it is attributed to the mentor
    // — with `shipped` saying it was never authored, which is a different sentence and one
    // a screen may want to say differently.
    source: { scopeId: PLATFORM_SCOPE, tier: 'mentor', shipped: true },
    inherited: scopeId !== PLATFORM_SCOPE
  }
}

/**
 * Save this scope's OWN standard session.
 *
 * @param {string} scopeId - the caller's resolved scope, from the verified token
 * @param {object} process - already through `validateProcess`
 * @param {string} savedBy - the advisor/manager id, for the version history
 * @param {function(string, string, object, string): Promise<*>} saveFirmConfig
 * @returns {Promise<void>}
 * @throws {Error} when a live database refuses the write — never swallowed, because a
 *   save that did not happen must not be reported as one
 */
async function saveOwnProcess (scopeId, process, savedBy, saveFirmConfig) {
  try {
    await saveFirmConfig(scopeId, CONFIG_KEY, process, savedBy)
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    const all = _readDevMap()
    all[scopeId] = process
    fs.writeFileSync(DEV_FILE, JSON.stringify(all, null, 2))
  }
}

/**
 * Stop holding a session of this scope's own, and inherit the level above again.
 *
 * 🔴 IT WRITES A TOMBSTONE RATHER THAN DELETING ROWS, and that is deliberate. Deleting
 * would take the scope's whole history with it, and the drawing's promise is that
 * overriding brings version history and restore. A `null` active version reads as "nothing
 * of my own" to `readOwnProcess` — which rejects it at the validator and falls through —
 * while every earlier version stays in `firm_framework_versions` to be restored.
 *
 * @param {string} scopeId
 * @param {function(string, string, object, string): Promise<*>} saveFirmConfig
 * @param {string} [savedBy] - who returned this scope to inheriting
 * @returns {Promise<void>}
 * @throws {Error} when a live database refuses the write
 */
async function clearOwnProcess (scopeId, saveFirmConfig, savedBy) {
  try {
    await saveFirmConfig(scopeId, CONFIG_KEY, null, savedBy || 'unknown')
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    const all = _readDevMap()
    delete all[scopeId]
    fs.writeFileSync(DEV_FILE, JSON.stringify(all, null, 2))
  }
}

module.exports = {
  CONFIG_KEY,
  MAX_STEPS,
  MAX_ITEMS_PER_STEP,
  baseProcess,
  validateProcess,
  readOwnProcess,
  resolveProcess,
  saveOwnProcess,
  clearOwnProcess
}
