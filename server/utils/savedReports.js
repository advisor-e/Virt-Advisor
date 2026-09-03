'use strict'

/**
 * savedReports — a report's FIGURES kept per client, per model, so a client can edit
 * what an advisor opened to them and everyone can see who typed what.
 *
 * design/features/business-entity-reports.md §5, item 4.62, approved by Mike 2026-09-03:
 * "once advisor has been involved and secured terms, we DO want them to be involved and
 * can edit thereafter — so long as any changes are made clear they are edited by the
 * client."
 *
 * STORAGE. One firmOverlay config key per client per model —
 * `client-report:<clientId>:<route>` — so version history and restore ride the store
 * every other firm setting uses. The current row:
 *
 *   { inputs, savedBy: { tier, name }, savedAt, advisorVersion: { inputs, savedBy, savedAt } | null }
 *
 * `advisorVersion` is the advisor's LAST save, carried forward untouched through every
 * client save. That is what makes the three signals of D4 possible without stamping a
 * figure at a time: a figure the client changed is one whose value differs from the
 * advisor's version (`changedKeys`), the banner reads `savedBy`, and Restore writes the
 * advisor's version back as a fresh save.
 *
 * WHO MAY WRITE. An advisor of the firm, for a client of the firm (the route checks the
 * client belongs). A client, only for a model the advisor has OPENED to it — checked here
 * against the switch table, not only on the screen, so a client whose access was hidden
 * again cannot keep saving.
 *
 * INPUTS ARE HOSTILE. A client's figures are stored and later rendered on an advisor's
 * screen, so `validateInputs` admits only what a report's controls can produce: a flat
 * object of finite numbers, booleans, short strings, or arrays of finite numbers, under
 * a size cap. Anything else is refused, never trimmed into shape.
 */

const overlay = require('./firmOverlay')
const access = require('./clientReportAccess')

const KEY_PREFIX = 'client-report:'
const TIER_ADVISOR = 'advisor'
const TIER_CLIENT = 'business_entity'

const MAX_KEYS = 200
const MAX_ARRAY = 120
const MAX_STRING = 200
const KEY_SHAPE = /^[A-Za-z0-9_.-]{1,64}$/
/** firm_framework_versions.config_key is VARCHAR(128); a client id longer than this cannot be keyed. */
const MAX_CLIENT_ID = 64

function fail (code, message) {
  const e = new Error(message); e.code = code; return e
}

/**
 * The firmOverlay key for one client's copy of one model.
 * @param {string} clientId
 * @param {string} route - catalogue route, e.g. '/volatility'
 * @returns {string}
 * @throws {Error} err.code 'BAD_ROUTE' | 'BAD_CLIENT'
 */
function configKey (clientId, route) {
  if (!access.ROUTE_SHAPE.test(String(route || ''))) {
    throw fail('BAD_ROUTE', 'A model is named by its route, like /volatility.')
  }
  const id = String(clientId || '')
  if (!id || id.length > MAX_CLIENT_ID || id.includes(':')) {
    throw fail('BAD_CLIENT', 'The client id cannot be used as a storage key.')
  }
  return KEY_PREFIX + id + ':' + route
}

function isFiniteNumber (v) { return typeof v === 'number' && Number.isFinite(v) }

/**
 * Admit only what a report's controls can produce. Returns a fresh copy so a caller
 * cannot smuggle a prototype or a getter through.
 * @param {*} inputs
 * @returns {object}
 * @throws {Error} err.code 'BAD_INPUTS'
 */
function validateInputs (inputs) {
  if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) {
    throw fail('BAD_INPUTS', 'The figures must be an object of named values.')
  }
  const keys = Object.keys(inputs)
  if (keys.length === 0 || keys.length > MAX_KEYS) {
    throw fail('BAD_INPUTS', `The figures must hold between 1 and ${MAX_KEYS} values.`)
  }
  const out = {}
  keys.forEach((k) => {
    if (!KEY_SHAPE.test(k)) { throw fail('BAD_INPUTS', `"${k}" is not a figure name.`) }
    const v = inputs[k]
    if (isFiniteNumber(v) || typeof v === 'boolean') { out[k] = v; return }
    if (typeof v === 'string') {
      if (v.length > MAX_STRING) { throw fail('BAD_INPUTS', `"${k}" is too long.`) }
      out[k] = v; return
    }
    if (Array.isArray(v)) {
      if (v.length > MAX_ARRAY || !v.every(isFiniteNumber)) {
        throw fail('BAD_INPUTS', `"${k}" must be a list of up to ${MAX_ARRAY} numbers.`)
      }
      out[k] = v.slice(); return
    }
    throw fail('BAD_INPUTS', `"${k}" is not a figure.`)
  })
  return out
}

function sameValue (a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i])
  }
  return a === b
}

/**
 * Which figures differ from the advisor's version — the `client` badge list (D4). With
 * no advisor version every figure counts as the client's, which is the truth: the
 * advisor never saved one.
 * @param {object|null} row
 * @returns {string[]}
 */
function changedKeys (row) {
  if (!row || !row.inputs) { return [] }
  if (!row.savedBy || row.savedBy.tier !== TIER_CLIENT) { return [] }
  const base = row.advisorVersion && row.advisorVersion.inputs
  return Object.keys(row.inputs).filter(k => !base || !sameValue(row.inputs[k], base[k]))
}

/**
 * The current saved row for one client and one model, or null when nothing was saved.
 * @param {string} firmId - from the verified token
 * @param {string} clientId
 * @param {string} route
 * @returns {Promise<object|null>}
 */
async function load (firmId, clientId, route) {
  const stored = await overlay.loadFirmConfig(firmId, configKey(clientId, route))
  if (!stored || typeof stored !== 'object' || !stored.inputs || typeof stored.inputs !== 'object') { return null }
  return stored
}

async function _write (firmId, clientId, route, row, savedBy) {
  await overlay.saveFirmConfig(firmId, configKey(clientId, route), row, savedBy)
  return row
}

/**
 * An advisor saves the figures for a client. This save BECOMES the advisor's version.
 * @param {string} firmId - from the verified token
 * @param {string} clientId - a client of that firm (the route checks it belongs)
 * @param {string} route
 * @param {object} inputs - validated here
 * @param {{name: string, email: string}} who
 * @returns {Promise<object>} the row as stored
 * @throws {Error} err.code 'BAD_ROUTE' | 'BAD_CLIENT' | 'BAD_INPUTS'
 */
function saveAsAdvisor (firmId, clientId, route, inputs, who) {
  let clean
  try { clean = validateInputs(inputs) } catch (e) { return Promise.reject(e) }
  const stamp = { tier: TIER_ADVISOR, name: (who && who.name) || (who && who.email) || 'unknown' }
  const savedAt = new Date().toISOString()
  const row = { inputs: clean, savedBy: stamp, savedAt, advisorVersion: { inputs: clean, savedBy: stamp, savedAt } }
  return _write(firmId, clientId, route, row, (who && who.email) || 'unknown')
}

/**
 * A client saves its own edits to a model the advisor OPENED to it. The advisor's
 * version is carried forward untouched so it can be compared with and restored.
 * @param {string} firmId - from the verified token
 * @param {string} clientId - from the verified token
 * @param {string} route
 * @param {object} inputs - validated here
 * @param {{name: string, email: string}} who - the business entity's own name
 * @returns {Promise<object>} the row as stored
 * @throws {Error} err.code 'NOT_OPEN' | 'BAD_ROUTE' | 'BAD_CLIENT' | 'BAD_INPUTS'
 */
async function saveAsClient (firmId, clientId, route, inputs, who) {
  const clean = validateInputs(inputs)
  if (!(await access.isOpen(firmId, clientId, route))) {
    throw fail('NOT_OPEN', 'Your advisor has not opened this report to you.')
  }
  const existing = await load(firmId, clientId, route)
  const row = {
    inputs: clean,
    savedBy: { tier: TIER_CLIENT, name: (who && who.name) || 'the client' },
    savedAt: new Date().toISOString(),
    advisorVersion: existing && existing.advisorVersion ? existing.advisorVersion : null
  }
  return _write(firmId, clientId, route, row, (who && who.email) || 'business-entity')
}

/**
 * Put the advisor's last version back as the current figures — one click after a wrong
 * client edit (D4). A fresh save, so the client's version stays in the history.
 * @returns {Promise<object>} the restored row
 * @throws {Error} err.code 'NO_ADVISOR_VERSION' when the advisor never saved one
 */
async function restoreAdvisorVersion (firmId, clientId, route, who) {
  const existing = await load(firmId, clientId, route)
  if (!existing || !existing.advisorVersion || !existing.advisorVersion.inputs) {
    throw fail('NO_ADVISOR_VERSION', 'There is no advisor version to restore.')
  }
  return saveAsAdvisor(firmId, clientId, route, existing.advisorVersion.inputs, who)
}

module.exports = {
  KEY_PREFIX,
  TIER_ADVISOR,
  TIER_CLIENT,
  configKey,
  validateInputs,
  changedKeys,
  load,
  saveAsAdvisor,
  saveAsClient,
  restoreAdvisorVersion
}
