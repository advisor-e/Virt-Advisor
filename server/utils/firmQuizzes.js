'use strict'

/**
 * Firm quiz overlay (CB-31 Phase 2) — the layered-override model for quiz banks.
 *
 * Platform base = the banks shipped in data/course-quizzes.json (the firm's IP,
 * transcribed from the authored PDFs). Firm overlay = a firm's edits and
 * additions, stored per firm in firm_framework_versions under config_key
 * 'quiz-banks' — the same machinery behind Advisory Distinctions and the
 * Advisory Staircase, so version history and restore come free.
 *
 * Mike's ruling (2026-07-21): a firm MAY edit the platform's own questions.
 * The edit is stored as an overlay and the base is never touched, so
 * "back to the original" is always possible.
 *
 * Two rules made the ORIGINAL whole-bank merge safe:
 *   1. A bank is replaced WHOLESALE, never merged entry-by-entry. Merging
 *      arrays element-by-element would let a firm's 3-question edit silently
 *      inherit the tail of a 10-question platform bank.
 *   2. Every merged bank carries `origin` — 'platform' or 'firm'. The course
 *      engine fences firm-authored text before it reaches the AI: a question
 *      typed into a browser form is untrusted input, however trusted the
 *      manager who typed it, and prompt injection is the standard attack on
 *      exactly this path. Platform banks are repo data and stay unfenced, so
 *      the tuned CB-29/CB-30 prompt behaviour is unchanged.
 *
 * ── 2026-07-31: QUIZZES JOIN THE ONE MECHANISM, PER QUESTION (Mike's ruling) ──
 *
 * Rule 1 above solved the position problem by giving up granularity, and the
 * price was the defect the whole mechanism exists to prevent: a firm that
 * reworded ONE question stopped receiving Advisor-e's improvements to the other
 * nine in that bank, permanently, with nothing on screen to say so.
 *
 * The mechanism avoids positions a different way — it keys every decision to a
 * STABLE ROW ID, so nothing is ever matched by where it sits in a list. Quiz
 * questions gained `qid` (qz-N) for exactly this. A firm's decisions now live in
 * SEPARATE, ADDITIVE config keys, the same shape the Advisory Staircase uses:
 *
 *   - quiz-declines  -> qids the firm switched off                    (array)
 *   - quiz-overrides -> the firm's edits, keyed by the qid they replace (object)
 *   - quiz-own       -> questions the firm added, each naming its bank  (array)
 *   - quiz-banks     -> UNCHANGED. The old whole-bank shape, still read
 *                       by adaptLegacyWholeConfig so no firm loses saved work.
 *
 * Rule 2 survives but becomes finer: fencing is now PER QUESTION, because a
 * single bank can hold Advisor-e's questions and the firm's side by side. A
 * bank with no firm content produces byte-identical prompt text to before —
 * locked by a test, because that is what keeps the tuned prompt behaviour.
 */

const fs = require('fs')
const path = require('path')
const { resolveTemplateName } = require('./resolveTemplateName')

const IS_DEV = process.env.NODE_ENV !== 'production'

const CONFIG_KEY = 'quiz-banks'

/** The mechanism's keys. `settings` is the pre-existing whole-bank key. */
const CONFIG_KEYS = {
  declines: 'quiz-declines',
  overrides: 'quiz-overrides',
  own: 'quiz-own',
  legacy: CONFIG_KEY
}

const DEV_FILES = {
  declines: 'data/dev-firm-quiz-declines.json',
  overrides: 'data/dev-firm-quiz-overrides.json',
  own: 'data/dev-firm-quiz-own.json',
  legacy: 'data/dev-firm-quizzes.json'
}

/**
 * The fields a firm may edit on a question it inherited. `id` and `qid` are
 * absent on purpose: `qid` is identity and `id` is a POSITION the resolver
 * reassigns whenever a question above is switched off.
 * @type {string[]}
 */
const EDITABLE_QUESTION_FIELDS = ['question', 'answer', 'keyPoint']

/**
 * Prefix for a question the FIRM added. Deliberately not `qz-`: platform ids and
 * firm ids are compared against each other, and two id systems that can collide
 * is how a firm's question later silently replaces one of Advisor-e's. Same
 * reasoning as the staircase's `fs-` and the coaching reference's `cr-`.
 * @type {string}
 */
const FIRM_QUESTION_PREFIX = 'fq-'

// Bounds on firm-supplied content. The global 1 MB body cap stops a giant
// payload; these stop a merely large one from becoming an unreadable screen or
// an oversized prompt.
const LIMITS = {
  banks: 300, // the master export holds 281 pages
  entriesPerBank: 100,
  keyChars: 200,
  textChars: 2000,
  sourceChars: 300
}

const RESERVED_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

const isPlainObject = v => typeof v === 'object' && v !== null && !Array.isArray(v)
const isFilledString = (v, max) =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= max

/**
 * Validate a firm-supplied quiz overlay and return a canonical copy of it.
 *
 * Nothing from the request is stored as-is: the returned object is rebuilt
 * field by field from validated values, so unknown fields, prototype-polluting
 * keys and stray types cannot reach the database.
 *
 * @param {*} override - the raw body value (untrusted)
 * @param {Array<{page: string, title: string}>} [templates] - injectable template list (tests)
 * @returns {{ok: true, value: Object} | {ok: false, error: string, candidates?: Array}}
 */
function validateQuizOverride (override, templates) {
  if (!isPlainObject(override)) {
    return { ok: false, error: 'Quizzes must be sent as a JSON object keyed by page name.' }
  }

  const keys = Object.keys(override).filter(k => !k.startsWith('_'))
  if (keys.length === 0) {
    return { ok: false, error: 'No quizzes were sent.' }
  }
  if (keys.length > LIMITS.banks) {
    return { ok: false, error: `Too many quizzes in one save (limit ${LIMITS.banks}).` }
  }

  const value = {}
  for (const key of keys) {
    if (RESERVED_KEYS.has(key)) {
      return { ok: false, error: 'That page name cannot be used.' }
    }
    if (key.length > LIMITS.keyChars) {
      return { ok: false, error: 'A page name is too long.' }
    }

    // The page must exist. The resolver refuses on a near-miss rather than
    // guessing, so a typo can never silently attach a quiz to the wrong page.
    let resolved
    try {
      resolved = resolveTemplateName(key, templates)
    } catch (e) {
      return { ok: false, error: 'The page library could not be read, so quizzes cannot be saved right now.' }
    }
    if (!resolved.ok) {
      return {
        ok: false,
        error: `"${key}" does not match a page in your library.`,
        candidates: (resolved.candidates || []).map(c => c.title)
      }
    }

    const bank = override[key]
    if (!isPlainObject(bank) || !Array.isArray(bank.entries)) {
      return { ok: false, error: `The quiz for "${resolved.title}" is not in the expected shape.` }
    }
    if (bank.entries.length === 0) {
      return { ok: false, error: `The quiz for "${resolved.title}" has no questions.` }
    }
    if (bank.entries.length > LIMITS.entriesPerBank) {
      return { ok: false, error: `The quiz for "${resolved.title}" has too many questions (limit ${LIMITS.entriesPerBank}).` }
    }

    const seenIds = new Set()
    const entries = []
    for (const entry of bank.entries) {
      if (!isPlainObject(entry)) {
        return { ok: false, error: `A question in "${resolved.title}" is not in the expected shape.` }
      }
      if (!Number.isInteger(entry.id) || entry.id < 1) {
        return { ok: false, error: `A question in "${resolved.title}" is missing its number.` }
      }
      if (seenIds.has(entry.id)) {
        return { ok: false, error: `Two questions in "${resolved.title}" share the number ${entry.id}.` }
      }
      seenIds.add(entry.id)
      for (const field of ['question', 'answer', 'keyPoint']) {
        if (!isFilledString(entry[field], LIMITS.textChars)) {
          return { ok: false, error: `A question in "${resolved.title}" is missing its ${field === 'keyPoint' ? 'key point' : field}, or it is too long.` }
        }
      }
      entries.push({
        id: entry.id,
        question: entry.question,
        answer: entry.answer,
        keyPoint: entry.keyPoint
      })
    }

    const canonical = { entries }
    if (isFilledString(bank.source, LIMITS.sourceChars)) {
      canonical.source = bank.source
    }
    // Key on the resolved page title, not what was typed, so the stored key is
    // always a real page name however the author spelled it.
    value[resolved.title] = canonical
  }

  return { ok: true, value }
}

/**
 * Merge the platform base with a firm's overlay.
 *
 * @param {Object} base - banks from data/course-quizzes.json
 * @param {Object|null} override - the firm's stored overlay
 * @returns {Object} merged banks, each tagged with `origin`
 */
function mergeQuizBanks (base, override) {
  const merged = {}
  for (const [key, bank] of Object.entries(base || {})) {
    if (key.startsWith('_')) { continue }
    merged[key] = { ...bank, origin: 'platform' }
  }
  for (const [key, bank] of Object.entries(override || {})) {
    if (key.startsWith('_') || RESERVED_KEYS.has(key)) { continue }
    // Wholesale replacement — see rule 1 in the file header.
    merged[key] = { ...bank, origin: 'firm' }
  }
  return merged
}

// ── The mechanism: a firm's quiz decisions ───────────────────────────────────

function _readDevMap (file) {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), file), 'utf8'))
  } catch (_e) {
    return {}
  }
}

/**
 * Load one config value, preferring the injected (production) loader and falling
 * back to the dev-JSON map keyed by firmId.
 *
 * THE FALLBACK IS DEV-ONLY, DELIBERATELY — the rule applied across every firm read
 * path on 2026-07-31. In production an unreachable store is thrown to the caller,
 * which logs it and serves the platform banks. Answering "this firm has decided
 * nothing" would hide an outage behind a reply that looks deliberate.
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
 * Read a firm's OLD whole-bank overlay into the mechanism's shape.
 *
 * WHY THIS EXISTS. Before quizzes joined the mechanism, a save stored a COMPLETE
 * COPY of a bank's questions under `quiz-banks`, replacing the platform bank
 * outright. No such row is known to exist — MySQL has never been provisioned and
 * no screen has ever posted one — but the save route is live and reachable, the
 * other machine's dev files cannot be read from here, and discarding a firm's
 * saved wording because the storage shape changed underneath them is precisely
 * the failure the mechanism exists to prevent.
 *
 * HOW A WHOLE COPY IS READ AS DECISIONS. The old shape had no qids and replaced
 * the array wholesale, so it was POSITIONAL by construction: the firm's first
 * question was the platform's first question. So position i maps to platform
 * question i, and the three consequences follow honestly:
 *
 *   - fields that differ from the platform question  -> an override on its qid
 *   - stored questions beyond the platform's list    -> the firm's own questions
 *   - platform questions the copy does NOT contain   -> DECLINED. Wholesale
 *     replacement means anything absent was removed on purpose; carrying it back
 *     in would resurrect a question the firm deliberately dropped.
 *
 * @param {Object} baseBanks - the platform banks (identity comes from these)
 * @param {*} legacyConfig - whatever was stored under `quiz-banks`
 * @returns {{declinedIds: string[], overrides: Object, ownRows: Array}} empty when
 *   there is nothing to carry across
 */
function adaptLegacyWholeConfig (baseBanks, legacyConfig) {
  const empty = { declinedIds: [], overrides: {}, ownRows: [] }
  const stored = isPlainObject(legacyConfig) ? legacyConfig : null
  if (!stored) { return empty }

  const base = isPlainObject(baseBanks) ? baseBanks : {}
  const declinedIds = []
  const overrides = {}
  const ownRows = []
  let ownCount = 0

  for (const [bankKey, storedBank] of Object.entries(stored)) {
    if (bankKey.startsWith('_')) { continue }
    if (!isPlainObject(storedBank) || !Array.isArray(storedBank.entries)) { continue }

    const baseEntries = (base[bankKey] && Array.isArray(base[bankKey].entries))
      ? base[bankKey].entries
      : []

    storedBank.entries.forEach((entry, i) => {
      if (!isPlainObject(entry)) { return }
      const platformEntry = baseEntries[i]

      if (!platformEntry || !platformEntry.qid) {
        // Beyond the platform's list (or a bank the platform does not have) —
        // the firm's own question. Only a usable one becomes a row: a question
        // with no text would otherwise be put in front of an advisor.
        const usable = ['question', 'answer', 'keyPoint']
          .every(f => typeof entry[f] === 'string' && entry[f].trim())
        if (!usable) { return }
        ownCount += 1
        ownRows.push({
          id: `${FIRM_QUESTION_PREFIX}${ownCount}`,
          bank: bankKey,
          question: entry.question,
          answer: entry.answer,
          keyPoint: entry.keyPoint
        })
        return
      }

      // Carry across only the fields that actually DIFFER. A copy that matches
      // the platform is not an edit, and recording it as one would stop that
      // question tracking Advisor-e's later wording fixes for no reason.
      const diff = {}
      for (const field of EDITABLE_QUESTION_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(entry, field) && entry[field] !== platformEntry[field]) {
          diff[field] = entry[field]
        }
      }
      if (Object.keys(diff).length > 0) { overrides[platformEntry.qid] = diff }
    })

    // Platform questions the stored copy does not reach were removed by the firm.
    for (let i = storedBank.entries.length; i < baseEntries.length; i++) {
      if (baseEntries[i] && baseEntries[i].qid) { declinedIds.push(baseEntries[i].qid) }
    }
  }

  return { declinedIds, overrides, ownRows }
}

/**
 * Load and shape a firm's full quiz state for the resolver.
 *
 * @param {string|null} firmId - the authenticated firm id (never client-supplied: a
 *   body-supplied firm id would let one firm read another's questions)
 * @param {Function} loadFirmConfig - async (firmId, key) => stored value
 * @param {Object} [baseBanks] - platform banks, used only by the legacy adapter
 * @returns {Promise<{declinedIds: string[], overrides: Object, ownRows: Array,
 *   fromLegacy: boolean}>}
 * @throws in production, when the store cannot be read
 */
async function loadFirmQuizState (firmId, loadFirmConfig, baseBanks) {
  const none = { declinedIds: [], overrides: {}, ownRows: [], fromLegacy: false }
  if (!firmId) { return none }

  const declines = await _load(loadFirmConfig, firmId, CONFIG_KEYS.declines, DEV_FILES.declines, [])
  const overrides = await _load(loadFirmConfig, firmId, CONFIG_KEYS.overrides, DEV_FILES.overrides, {})
  const own = await _load(loadFirmConfig, firmId, CONFIG_KEYS.own, DEV_FILES.own, [])

  const state = {
    declinedIds: Array.isArray(declines) ? declines : [],
    overrides: isPlainObject(overrides) ? overrides : {},
    ownRows: Array.isArray(own) ? own : [],
    fromLegacy: false
  }

  // "Has this firm made a decision the mechanism recognises?" An override keyed to
  // a qid no platform question carries is not a decision — it is leftover or
  // malformed storage, and counting it would suppress the legacy read below,
  // losing the firm's saved questions on the strength of junk.
  const baseQids = new Set()
  for (const bank of Object.values(isPlainObject(baseBanks) ? baseBanks : {})) {
    for (const entry of (bank && Array.isArray(bank.entries)) ? bank.entries : []) {
      if (entry && entry.qid) { baseQids.add(entry.qid) }
    }
  }
  const hasNewState = state.declinedIds.length > 0 ||
    state.ownRows.length > 0 ||
    Object.keys(state.overrides).some(qid => baseQids.has(qid))
  if (hasNewState) { return state }

  const legacyConfig = await _load(loadFirmConfig, firmId, CONFIG_KEYS.legacy, DEV_FILES.legacy, null)
  const legacy = adaptLegacyWholeConfig(baseBanks, legacyConfig)
  if (legacy.declinedIds.length === 0 && Object.keys(legacy.overrides).length === 0 && legacy.ownRows.length === 0) {
    return state
  }

  return { ...legacy, fromLegacy: true }
}

// DEV_FILES is intentionally NOT exported — the dev-JSON paths are an internal
// detail of this read path, as in firmStaircase.js and firmDistinctions.js.
module.exports = {
  CONFIG_KEY,
  CONFIG_KEYS,
  LIMITS,
  EDITABLE_QUESTION_FIELDS,
  FIRM_QUESTION_PREFIX,
  validateQuizOverride,
  mergeQuizBanks,
  adaptLegacyWholeConfig,
  loadFirmQuizState
}
