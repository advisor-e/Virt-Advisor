'use strict'

/**
 * Coaching reference — the template-selection guidance injected into the
 * Phase 3 prompt. Two layers, deliberately separate:
 *
 *   1. PLATFORM BASE — data/coaching-reference.json. Curated, developer-placed
 *      guidance every firm receives. READ-ONLY at runtime: the app never
 *      appends to it (the old promote flow did — that made one firm's client
 *      observations visible in every other firm's prompts, and the unlocked
 *      file write had no history and no concurrency safety).
 *
 *   2. FIRM ENTRIES — promoted case observations, stored PER FIRM in the
 *      firm_framework_versions overlay under config_key 'coaching-reference'
 *      (version history + restore for free, same as Advisory Distinctions).
 *      These are the advisor's own free-text words about a real client, so
 *      they are fenced with fenceUntrusted() before reaching the AI — data to
 *      weigh, never instructions to follow.
 *
 * DEV/TEST-ONLY fallback: when MySQL is unavailable AND not production, firm
 * entries live in gitignored data/dev-firm-coaching.json (keyed by firmId) —
 * the same convention as firmManager's _devReadDistinctions. Not production
 * persistence; in production a DB failure propagates to the caller.
 */

const { readFileSync, writeFileSync } = require('fs')
const { resolve } = require('path')
const overlay = require('./firmOverlay')
const { fenceUntrusted } = require('./promptSafety')

let _coaching = null

const COACHING_FILE = resolve(process.cwd(), 'data/coaching-reference.json')
const FIRM_COACHING_KEY = 'coaching-reference'
// Overridable via FIRM_COACHING_DEV_FILE so tests use an isolated temp file
// (the CASE_DEV_FILE convention). Production never sets this — it uses MySQL.
const DEV_FIRM_COACHING_FILE = process.env.FIRM_COACHING_DEV_FILE
  ? resolve(process.env.FIRM_COACHING_DEV_FILE)
  : resolve(__dirname, '../../data/dev-firm-coaching.json')

function devFallbackEnabled () {
  return process.env.NODE_ENV !== 'production'
}

function loadCoaching () {
  if (_coaching) { return _coaching }
  try {
    _coaching = JSON.parse(readFileSync(COACHING_FILE, 'utf8'))
  } catch (err) {
    console.error('[coaching] Failed to load coaching-reference.json:', err.message)
    _coaching = []
  }
  return _coaching
}

function resetCoachingCache () {
  _coaching = null
}

/** Render one coaching entry (platform or firm shape) as prompt text. */
function formatEntry (c) {
  const scenarios = (c.scenarios || []).map(s => `  - ${s}`).join('\n')
  return `**${c.template}**
What to look for: ${c.whatToLookFor}
Scenarios: \n${scenarios}
Where it leads: ${c.whereMayLead}`
}

function formatCoachingForPrompt () {
  return loadCoaching().map(formatEntry).join('\n\n')
}

// ── Firm-scoped promoted entries (overlay-backed) ─────────────────────────────

function _devReadFirmCoaching (firmId) {
  try {
    const all = JSON.parse(readFileSync(DEV_FIRM_COACHING_FILE, 'utf8'))
    return Array.isArray(all[firmId]) ? all[firmId] : []
  } catch (e) { return [] }
}

function _devWriteFirmCoaching (firmId, rows) {
  let all = {}
  try { all = JSON.parse(readFileSync(DEV_FIRM_COACHING_FILE, 'utf8')) } catch (e) {}
  all[firmId] = rows
  writeFileSync(DEV_FIRM_COACHING_FILE, JSON.stringify(all, null, 2))
}

/**
 * The firm's own promoted coaching entries, newest last (append order).
 * @param {string} firmId - from the verified JWT, never the request body
 * @returns {Promise<object[]>} [] when the firm has none
 */
async function loadFirmCoaching (firmId) {
  try {
    const stored = await overlay.loadFirmConfig(firmId, FIRM_COACHING_KEY)
    return Array.isArray(stored) ? stored : []
  } catch (err) {
    if (devFallbackEnabled()) { return _devReadFirmCoaching(firmId) }
    throw err
  }
}

/**
 * Append one promoted entry to the firm's coaching list. The whole list is
 * saved as a new overlay version, so every promotion is restorable.
 * @param {string} firmId - from the verified JWT
 * @param {object} entry - server-built entry (see cases.promote); id assigned here
 * @param {string} savedBy - the promoting manager (overlay version audit)
 * @returns {Promise<number>} the new entry's id
 */
async function appendFirmCoachingEntry (firmId, entry, savedBy) {
  const existing = await loadFirmCoaching(firmId)
  const nextId = existing.length > 0 ? Math.max(...existing.map(r => r.id || 0)) + 1 : 1
  const rows = [...existing, { ...entry, id: nextId }]
  try {
    await overlay.saveFirmConfig(firmId, FIRM_COACHING_KEY, rows, savedBy)
  } catch (err) {
    if (devFallbackEnabled()) { _devWriteFirmCoaching(firmId, rows); return nextId }
    throw err
  }
  return nextId
}

/**
 * Render the firm's promoted entries for the prompt, FENCED: the text is the
 * advisor's own review words about a real client — hostile prompt input under
 * the governance rules, same as the prior-engagement summary.
 * @param {object[]} entries - from loadFirmCoaching
 * @returns {string|null} guard line + fenced block, or null when empty
 */
function formatFirmCoachingForPrompt (entries) {
  if (!Array.isArray(entries) || entries.length === 0) { return null }
  return fenceUntrusted(entries.map(formatEntry).join('\n\n'))
}

module.exports = {
  formatCoachingForPrompt,
  resetCoachingCache,
  loadFirmCoaching,
  appendFirmCoachingEntry,
  formatFirmCoachingForPrompt,
  FIRM_COACHING_KEY
}
