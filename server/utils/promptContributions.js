'use strict'

/**
 * @file A level's own prompt material — stored, cascaded, and reaching the advising AI as
 * fenced reference. Item 4.31, Lane B of `design/PROMPT-CONTRIBUTION-SAFETY.md`.
 * @module server/utils/promptContributions
 *
 * 🔴 WHAT MAKES STORING A FIRM'S FREE PROSE SURVIVABLE IS THE FENCE. Every contribution
 * reaches the model inside `fenceUntrusted()` — a quotation it has been told to read and
 * never obey — exactly like the firm's coaching notes it sits beside. Nothing here adds
 * trust; it adds storage and inheritance to text that is fenced either way.
 *
 * 🔴 EVERY CONTRIBUTION IS CHECKED AT THE POINT OF STORAGE, not only on the screen that
 * sent it. `checkContribution` runs the same six deterministic checks the paste box runs.
 * A route that assumes its caller validated has no validation.
 *
 * ── The cascade ──
 *
 * Material a level writes is pushed down and is **in force immediately** at the levels
 * below. Once it is in place the level below may edit it, switch it off, and refuse a
 * later change to it. That is `resolveInheritedRows` — the one inheritance mechanism
 * every firm-editable block resolves through (`tier-cascade.md` §3) — with the four keys
 * every other block uses: own rows, declines, overrides, and the baselines that drive
 * Adopt / Keep mine.
 *
 * ⚠ IT REACHES AUTHORED MATERIAL ONLY. The Advisory Staircase, Distinctions, Quizzes,
 * Domain Support and Logic Tables are engine configuration with their own resolution;
 * nothing in this file touches any of them.
 *
 * Node 14, CommonJS.
 */

const fs = require('fs')
const path = require('path')
const overlay = require('./firmOverlay')
const { devFallbackAllowed } = require('./dbFailure')
const { fenceUntrusted } = require('./promptSafety')
const { checkContribution, MAX_CHARACTERS } = require('./promptContribution')
const { parentScopeOf, tierOfScope } = require('./tierChain')
const { resolveInheritedRows } = require('./resolveInheritedRows')

/** The four keys, named as every other block names them. */
const OWN_KEY = 'prompt-contributions-own'
const DECLINES_KEY = 'prompt-contributions-declines'
const OVERRIDES_KEY = 'prompt-contributions-overrides'
const BASELINES_KEY = 'prompt-contributions-override-baselines'

/** Badges a screen puts on a resolved row. */
const SOURCE_LABELS = { inherited: 'inherited', override: 'edited-here', own: 'added-here' }

/**
 * The own-row prefix a scope mints under, so two levels can never mint the same id.
 * Distinctness is asserted by a test.
 */
const ID_PREFIX_BY_TIER = {
  mentor: 'pc-',
  global_group_manager: 'xc-',
  group_manager: 'gc-',
  firm_manager: 'fc-'
}

/** How many pieces of material may reach the AI at once. */
const MAX_IN_FORCE = 3

/** The most a title may run to. It is a label on a screen, not a document. */
const MAX_TITLE = 120

/** The fields a level may edit on a row it inherited. `id` is identity and is not one. */
const EDITABLE_FIELDS = ['title', 'text']

const DEV_FILE = process.env.PROMPT_CONTRIBUTIONS_DEV_FILE
  ? path.resolve(process.env.PROMPT_CONTRIBUTIONS_DEV_FILE)
  : path.resolve(__dirname, '../../data/dev-prompt-contributions.json')

function devRead (scopeId, key) {
  try {
    const all = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8'))
    const value = all[scopeId + '::' + key]
    return value === undefined ? null : value
  } catch (err) { return null }
}

function devWrite (scopeId, key, value) {
  let all = {}
  try { all = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8')) } catch (err) { all = {} }
  all[scopeId + '::' + key] = value
  fs.writeFileSync(DEV_FILE, JSON.stringify(all, null, 2))
}

/**
 * Read one scope's stored value, falling back to the dev file only when there is no
 * database at all — never because a live one refused. See `server/utils/dbFailure.js`.
 *
 * @param {string} scopeId
 * @param {string} key
 * @returns {Promise<*>}
 */
async function read (scopeId, key) {
  try {
    return await overlay.loadFirmConfig(scopeId, key)
  } catch (err) {
    if (devFallbackAllowed(err)) { return devRead(scopeId, key) }
    throw err
  }
}

/**
 * Write one scope's own value, under the same rule.
 * @param {string} scopeId
 * @param {string} key
 * @param {*} value
 * @param {string} savedBy
 */
async function write (scopeId, key, value, savedBy) {
  try {
    await overlay.saveFirmConfig(scopeId, key, value, savedBy)
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    devWrite(scopeId, key, value)
  }
}

/**
 * The prefix new rows take at this scope.
 * @param {string|null} scopeId
 * @returns {string}
 */
function ownIdPrefix (scopeId) {
  return ID_PREFIX_BY_TIER[tierOfScope(scopeId)] || ID_PREFIX_BY_TIER.firm_manager
}

/**
 * A fresh id for a row this scope is adding.
 *
 * Ids are never reused: the next number follows the highest ever minted here, so an
 * override or a decline held by a level below can never start pointing at different
 * material.
 *
 * @param {string} scopeId
 * @param {Array<{id: string}>} ownRows
 * @returns {string}
 */
function mintId (scopeId, ownRows) {
  const prefix = ownIdPrefix(scopeId)
  const highest = (Array.isArray(ownRows) ? ownRows : []).reduce((max, row) => {
    const n = Number(String((row && row.id) || '').replace(prefix, ''))
    return Number.isFinite(n) && n > max ? n : max
  }, 0)
  return prefix + (highest + 1)
}

/**
 * What a row says, as one string, so a later change at the level above can be noticed.
 * @param {object} row
 * @returns {string}
 */
function signatureOf (row) {
  return JSON.stringify({ title: (row && row.title) || '', text: (row && row.text) || '' })
}

function asArray (value) { return Array.isArray(value) ? value : [] }

function asObject (value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

/**
 * Validates one contribution as it arrives from a request.
 *
 * @param {*} raw - `{ title, text }`
 * @returns {{ok: boolean, value: (object|null), error: (string|null), refusal: (object|null)}}
 */
function validateContribution (raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, value: null, error: 'A contribution is required', refusal: null }
  }

  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  const text = typeof raw.text === 'string' ? raw.text.trim() : ''

  if (title === '') {
    return { ok: false, value: null, error: 'A name is required', refusal: null }
  }
  if (title.length > MAX_TITLE) {
    return { ok: false, value: null, error: 'That name is too long', refusal: null }
  }
  if (text === '') {
    return { ok: false, value: null, error: 'The material is empty', refusal: null }
  }

  // The refusal travels back whole, so one wording serves this screen and the paste box.
  const checked = checkContribution(text)
  if (!checked.ok) {
    return { ok: false, value: null, error: null, refusal: checked.refusal }
  }

  return { ok: true, value: { title, text: checked.text }, error: null, refusal: null }
}

/**
 * One level's decisions about what it inherited.
 * @param {string} scopeId
 * @param {Function} reader
 * @returns {Promise<{declinedIds: Array, overrides: object, ownRows: Array}>}
 */
async function loadState (scopeId, reader) {
  return {
    declinedIds: asArray(await reader(scopeId, DECLINES_KEY)),
    overrides: asObject(await reader(scopeId, OVERRIDES_KEY)),
    ownRows: asArray(await reader(scopeId, OWN_KEY))
  }
}

/**
 * The effective material at one scope: everything pushed down from above, with this
 * level's edits swapped in, its declines removed, and its own rows appended.
 *
 * @param {string} scopeId
 * @param {Function} reader - `(scopeId, key) => Promise<*>`
 * @returns {Promise<Array<object>>}
 */
async function resolveForScope (scopeId, reader) {
  const parent = parentScopeOf(scopeId)
  const inherited = parent === null ? [] : await resolveForScope(parent, reader)
  const state = await loadState(scopeId, reader)
  return resolveInheritedRows(inherited, state, { sourceLabels: SOURCE_LABELS })
}

/**
 * What one scope inherits before its own decisions are applied — the comparison a screen
 * needs to show what it has switched off, and what the level above has changed.
 *
 * @param {string} scopeId
 * @param {Function} reader
 * @returns {Promise<Array<object>>}
 */
function loadInherited (scopeId, reader) {
  const parent = parentScopeOf(scopeId)
  return parent === null ? Promise.resolve([]) : resolveForScope(parent, reader)
}

/**
 * Which of this level's edits are out of date, because the level above has changed the
 * row underneath them. These are the rows a screen offers Adopt or Keep mine on.
 *
 * @param {string} scopeId
 * @param {Function} reader
 * @returns {Promise<string[]>}
 */
async function findChangedAbove (scopeId, reader) {
  const overrides = asObject(await reader(scopeId, OVERRIDES_KEY))
  const baselines = asObject(await reader(scopeId, BASELINES_KEY))
  const inherited = await loadInherited(scopeId, reader)

  return inherited
    .filter(row => Object.prototype.hasOwnProperty.call(overrides, row.id))
    .filter(row => baselines[row.id] !== undefined && baselines[row.id] !== signatureOf(row))
    .map(row => row.id)
}

/**
 * What a scope has in force, ready for the prompt. Never rejects: a storage fault
 * degrades to "none" and says so, because a live advisor conversation must not die for a
 * piece of reference material.
 *
 * @param {string|null} scopeId
 * @returns {Promise<Array<object>>}
 */
async function loadInForceForSession (scopeId) {
  if (!scopeId) { return [] }
  try {
    return await resolveForScope(scopeId, read)
  } catch (err) {
    console.warn('[prompt-contributions] could not be read for this session:', err.message)
    return []
  }
}

/**
 * Render the material in force for the prompt, FENCED.
 *
 * ⚠ NEVER A SILENT TRIM. When the cap bites it says so — the only way anyone learns that
 * a level's later material stopped reaching the AI.
 *
 * @param {Array<{title: string, text: string}>} rows
 * @returns {string|null} guard line + fenced block, or null when there is nothing
 */
function formatContributionsForPrompt (rows) {
  const all = Array.isArray(rows) ? rows : []
  if (all.length === 0) { return null }

  const selected = all.slice(0, MAX_IN_FORCE)
  if (all.length > selected.length) {
    console.warn(
      `[prompt-contributions] capped at ${MAX_IN_FORCE}: using ${selected.length} of ${all.length} ` +
      `in force, ${all.length - selected.length} not reaching the AI`
    )
  }

  return fenceUntrusted(selected.map(row => row.title + '\n' + row.text).join('\n\n---\n\n'))
}

module.exports = {
  read,
  write,
  loadState,
  loadInherited,
  resolveForScope,
  findChangedAbove,
  loadInForceForSession,
  formatContributionsForPrompt,
  validateContribution,
  signatureOf,
  mintId,
  ownIdPrefix,
  OWN_KEY,
  DECLINES_KEY,
  OVERRIDES_KEY,
  BASELINES_KEY,
  SOURCE_LABELS,
  EDITABLE_FIELDS,
  ID_PREFIX_BY_TIER,
  MAX_IN_FORCE,
  MAX_TITLE,
  MAX_TEXT: MAX_CHARACTERS
}
