'use strict'

/**
 * @file The starting list of Focus Tasks/Duties every owner begins with on the Business
 *   Owner Expectations model — written by a tier, inherited by every tier beneath.
 * @module server/utils/ownerFocusTasks
 *
 * Item 5.4. Mike's ruling, 2026-09-24: *"each owner may do different tasks - they all start
 * with the same (as it cascades down from mentor thru the levels to firm manager and now -
 * client/entity level) - BUT each owner may record different tasks"*.
 *
 * So there are two halves and this module is only the first:
 *   - THE STARTING LIST cascades mentor → global group manager → group manager → firm
 *     manager. All four managing tiers author, in his own words.
 *   - EACH OWNER'S OWN LIST lives on the model screen, starts as a copy of the starting list,
 *     and is saved against the client through the shared saved-report store. Nothing an
 *     advisor types there travels back up.
 *
 * 🔴 INHERIT-OR-OWN, THE WHOLE LIST — the Session Processes shape (`sessionProcess.js`), not
 * row-by-row. A tier that writes its own list replaces the one above entire; one that writes
 * nothing inherits the nearest one above, and the response always says whose it is.
 *
 * ⚠ WHAT COMES BACK FROM STORAGE IS UNTRUSTED — every read goes through `validateTasks`, so
 * a malformed row degrades to the layer above instead of reaching a screen.
 *
 * Node 14, CommonJS.
 */

const fs = require('fs')
const path = require('path')

const BASE = require('../../data/owner-focus-tasks.json')
const { parentScopeOf, tierOfScope } = require('./tierChain')
const { PLATFORM_SCOPE } = require('./platformScope')
const { devFallbackAllowed } = require('./dbFailure')

/**
 * `firm_framework_versions.config_key` for a tier's own starting list. Deliberately NOT in
 * `CASCADING_CONFIG_KEYS`: that set deep-merges layers, and a list must replace, not merge.
 */
const CONFIG_KEY = 'owner-focus-tasks'

/** Dev-only store for a machine with no MySQL — guarded by `devFallbackAllowed`. */
const DEV_FILE = path.resolve(__dirname, '../../data/dev-owner-focus-tasks.json')

/**
 * The most tasks one list may hold. The workbook has ten rows; twenty leaves room for a
 * firm's own and is still one screen. The model enforces the same ceiling per owner.
 */
const MAX_TASKS = 20

/** A task is a short name — the workbook's longest is 27 characters. */
const MAX_NAME = 80

/** The shipped list — a fresh copy every time, so no caller can mutate the next request's. */
function baseTasks () {
  return BASE.tasks.slice()
}

/**
 * Accept a list only if it is one, trimmed and de-duplicated.
 *
 * 🔴 THE TRUST BOUNDARY. The input is a manager's browser, or a stored row.
 * ⚠ AN EMPTY LIST IS REFUSED — every owner would start with no rows and nothing saying why.
 *
 * @param {*} input - expected `{ tasks: string[] }`
 * @returns {{ok: true, tasks: string[]}|{ok: false, error: string}}
 */
function validateTasks (input) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.tasks)) {
    return { ok: false, error: 'A task list must carry a tasks array' }
  }
  const out = []
  for (let i = 0; i < input.tasks.length; i++) {
    const t = input.tasks[i]
    if (typeof t !== 'string') {
      return { ok: false, error: `Task ${i + 1} is not text` }
    }
    const name = t.trim()
    if (name.length > MAX_NAME) {
      return { ok: false, error: `Task ${i + 1} is longer than ${MAX_NAME} characters` }
    }
    // A blank row is an unfinished edit, not a task; the same name twice is a slip.
    if (name && !out.some(x => x.toLowerCase() === name.toLowerCase())) { out.push(name) }
  }
  if (out.length === 0) {
    return { ok: false, error: 'A task list must hold at least one task' }
  }
  if (out.length > MAX_TASKS) {
    return { ok: false, error: `A task list may hold at most ${MAX_TASKS} tasks` }
  }
  return { ok: true, tasks: out }
}

function _readDevMap () {
  try {
    return JSON.parse(fs.readFileSync(DEV_FILE, 'utf8'))
  } catch (_e) {
    // Absent is the normal state on a fresh machine: nobody has written a list yet.
    return {}
  }
}

/**
 * One scope's OWN stored list, or null. Never rejects: unreadable storage reads as "wrote
 * nothing", so the resolve falls through to the layer above.
 *
 * @param {string} scopeId
 * @param {function(string, string): Promise<object|null>} loadFirmConfig - injected
 * @returns {Promise<string[]|null>}
 */
async function readOwnTasks (scopeId, loadFirmConfig) {
  if (!scopeId || typeof scopeId !== 'string') { return null }
  let stored = null
  try {
    stored = await loadFirmConfig(scopeId, CONFIG_KEY)
  } catch (err) {
    if (!devFallbackAllowed(err)) {
      console.error('[owner-focus-tasks] read refused by the database:', err.message)
      return null
    }
    stored = _readDevMap()[scopeId] || null
  }
  if (!stored) { return null }
  const checked = validateTasks(stored)
  if (!checked.ok) {
    console.error(`[owner-focus-tasks] stored list at ${scopeId} is malformed: ${checked.error}`)
    return null
  }
  return checked.tasks
}

/**
 * The starting list this scope works to, and whose it is. Never rejects.
 *
 * @param {string|null} scopeId - from the verified token, never a request body
 * @param {function(string, string): Promise<object|null>} loadFirmConfig
 * @returns {Promise<{tasks: string[], source: {scopeId: string, tier: string, shipped: boolean}, inherited: boolean}>}
 */
async function resolveTasks (scopeId, loadFirmConfig) {
  let cursor = scopeId && typeof scopeId === 'string' ? scopeId : null
  while (cursor) {
    // eslint-disable-next-line no-await-in-loop -- four rungs, each deciding whether the next is asked
    const own = await readOwnTasks(cursor, loadFirmConfig)
    if (own) {
      return {
        tasks: own,
        source: { scopeId: cursor, tier: tierOfScope(cursor), shipped: false },
        inherited: cursor !== scopeId
      }
    }
    cursor = parentScopeOf(cursor)
  }
  return {
    tasks: baseTasks(),
    source: { scopeId: PLATFORM_SCOPE, tier: 'mentor', shipped: true },
    inherited: scopeId !== PLATFORM_SCOPE
  }
}

/**
 * Save this scope's OWN list.
 * @throws {Error} when a live database refuses the write — a save that did not happen must
 *   never be reported as one
 */
async function saveOwnTasks (scopeId, tasks, savedBy, saveFirmConfig) {
  const value = { tasks }
  try {
    await saveFirmConfig(scopeId, CONFIG_KEY, value, savedBy)
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    const all = _readDevMap()
    all[scopeId] = value
    fs.writeFileSync(DEV_FILE, JSON.stringify(all, null, 2))
  }
}

/**
 * Go back to inheriting the level above. Writes a null version rather than deleting, so the
 * scope's history survives and can be restored — the Session Processes tombstone.
 * @throws {Error} when a live database refuses the write
 */
async function clearOwnTasks (scopeId, saveFirmConfig, savedBy) {
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
  MAX_TASKS,
  MAX_NAME,
  baseTasks,
  validateTasks,
  readOwnTasks,
  resolveTasks,
  saveOwnTasks,
  clearOwnTasks
}
