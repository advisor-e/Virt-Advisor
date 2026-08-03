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

// Firm entries are unbounded by design: appendFirmCoachingEntry pushes, and
// nothing ever expires. Measured 2026-08-03 — left whole, a firm promoting one
// case a week adds ~18,400 tokens to EVERY eligible prompt within a year, and
// the newest lesson competes with forty-nine older ones for the model's
// attention. So: this session's topic only, newest first, eight at most.
//
// The PLATFORM base is deliberately NOT filtered or capped (see
// formatCoachingForPrompt). It is not the growth problem — only a developer adds
// to it — and it is the menu the AI picks a template FROM, so hiding part of it
// by topic could suppress a template that should have been weighed. That would
// be a correctness risk taken against a cost problem that does not exist.
const MAX_FIRM_COACHING_ENTRIES = 8

/**
 * Choose which of a firm's promoted entries reach the prompt.
 *
 * Topic filter: an entry tagged with a DIFFERENT domain is dropped; an entry
 * with no domain always passes, because a missing tag is not evidence of
 * irrelevance — entries promoted from a case that never recorded one have none.
 * When the caller knows no domain, the filter is skipped and only the ordering
 * and the cap apply: discover/plan/learn run past the point where any domain is
 * detected, so there is genuinely no topic to filter on, and pretending
 * otherwise would silently drop every tagged entry in those modes.
 *
 * @param {object[]} entries - from loadFirmCoaching, oldest first (append order)
 * @param {string|null} domain - the session's detected domain id, or null
 * @returns {{selected: object[], considered: number, onTopic: number, droppedByCap: number}}
 */
function selectFirmCoaching (entries, domain) {
  const all = Array.isArray(entries) ? entries : []
  const onTopic = domain
    ? all.filter(e => e && (!e.domain || e.domain === domain))
    : all.filter(Boolean)
  // Newest first — the append order puts the newest last.
  const selected = onTopic.slice().reverse().slice(0, MAX_FIRM_COACHING_ENTRIES)
  return {
    selected,
    considered: all.length,
    onTopic: onTopic.length,
    droppedByCap: onTopic.length - selected.length
  }
}

/**
 * Render the firm's promoted entries for the prompt, FENCED: the text is the
 * advisor's own review words about a real client — hostile prompt input under
 * the governance rules, same as the prior-engagement summary.
 * @param {object[]} entries - from loadFirmCoaching
 * @param {string|null} [domain] - the session's detected domain id; omit or pass
 *   null where the mode never detects one
 * @returns {string|null} guard line + fenced block, or null when nothing qualifies
 */
function formatFirmCoachingForPrompt (entries, domain = null) {
  const { selected, considered, onTopic, droppedByCap } = selectFirmCoaching(entries, domain)
  if (droppedByCap > 0) {
    // Never a silent trim. This line is the only way anyone learns the cap is
    // biting — and that a firm's older lessons are no longer reaching the AI.
    console.warn(
      `[coaching] firm entries capped at ${MAX_FIRM_COACHING_ENTRIES}: used ${selected.length} of ${onTopic} on-topic ` +
      `(topic: ${domain || 'none detected'}), ${droppedByCap} left out, ${considered} promoted in total`
    )
  }
  if (selected.length === 0) { return null }
  return fenceUntrusted(selected.map(formatEntry).join('\n\n'))
}

module.exports = {
  formatCoachingForPrompt,
  resetCoachingCache,
  loadFirmCoaching,
  appendFirmCoachingEntry,
  formatFirmCoachingForPrompt,
  selectFirmCoaching,
  MAX_FIRM_COACHING_ENTRIES,
  FIRM_COACHING_KEY
}
