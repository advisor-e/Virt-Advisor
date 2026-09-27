'use strict'

/**
 * @file The nine Growth Aspects — each one's description and Mike's questions behind it —
 *   as a scope works to them, resolved through every tier's own decisions.
 * @module server/utils/growthAspects
 *
 * Item 15.2. Screens 3 and 3b of `design/mockups/growth-aspect-questions.html`, approved by
 * Mike 2026-09-27 and 2026-09-28. The shipped wording is `data/growth-fundamentals.json`.
 *
 * 🔴 IT CASCADES ON THE STANDARD RULES, WHICH NEVER CHANGE (`tier-cascade.md` P3 and P11;
 * Mike, 2026-09-28: "this is the same rules as every other cascade item"). All four manager
 * tiers edit, switch off and add; what a tier does reaches it and the tiers below; a tier
 * holds only its decisions; an inherited question a tier has edited is protected, and a
 * later change above it is offered — Use theirs / Keep mine — never applied.
 *
 * ⚠ THE MECHANISM IS `resolveInheritedRows`, as Meeting Review's observation points use.
 * Questions are LISTS OF ROWS where "switch this one off" and "add my own" both mean
 * something. A whole-list save — what this file did for a day, mentor alone — lets a firm
 * holding a one-question list blank the mentor's whole set for itself.
 *
 * ⚠ THE NINE NAMES ARE NOT EDITABLE AT ANY TIER. They are the key everything joins on: the
 * planner's actions table offers them as a fixed list, objectives are counted on the wheel
 * by them, and the AI's aspect-naming answer is checked against them.
 *
 * WHAT ONE TIER STORES. One versioned record (`CONFIG_KEY`), so one Restore puts back every
 * change on the tab together, as the drawing's single history shows:
 *   { aspects: { [name]: {
 *       declined:  [id],               inherited questions switched off here
 *       overrides: { id: { text } },   inherited questions edited here
 *       baselines: { id: text },       what each edited question said above when edited
 *       own:       [{ id, text }],     questions added here
 *       description, descriptionBaseline   the same two ideas for the description
 *   } } }
 * and, separately, `NEXT_SEQ_KEY` — a counter, not a decision, so restoring an earlier version
 * can never wind it back and hand a removed question's id to a new one (the defect
 * `meetingObservations.nextOwnPointId` records, item 4.72).
 */

const fs = require('fs')
const path = require('path')
const { devFallbackAllowed } = require('./dbFailure')
const { parentScopeOf, tierOfScope } = require('./tierChain')
const { resolveInheritedRows } = require('./resolveInheritedRows')

/** The versioned record a tier's decisions are stored under. */
const CONFIG_KEY = 'growth-aspect-questions'

/** The per-aspect high-water mark of ids each tier has minted. Never restored. */
const NEXT_SEQ_KEY = 'growth-aspect-questions-next-seq'

/** How a resolved question is badged for the screen. */
const SOURCE_LABELS = { inherited: 'inherited', override: 'edited-here', own: 'added-here' }

/**
 * Own-question prefixes, one per tier, so two tiers can never mint the same id — the
 * mentor's first added question and a firm's would otherwise both be `1`, and a firm
 * switching off "its" question would drop the mentor's. `xq-` for the global tier, as the
 * sibling blocks use `xm-`/`xc-`, to keep the two adjacent middle tiers visibly apart.
 * @type {Object.<string, string>}
 */
const ID_PREFIX_BY_TIER = {
  mentor: 'mq-',
  global_group_manager: 'xq-',
  group_manager: 'gq-',
  firm_manager: 'fq-'
}

/** Prefix of a question shipped in the data file. */
const SHIPPED_PREFIX = 'ga-'

/**
 * Length limits. Generous against the real content — the longest shipped description is 157
 * characters and the longest question 358 — and there so a pasted document cannot be stored
 * as one "question" and sent to the model on every client session.
 */
const MAX_DESCRIPTION = 400
const MAX_QUESTION = 1000
const MAX_OWN_PER_ASPECT = 40

const DEV_FILE = path.resolve(__dirname, '../../data/dev-growth-aspect-questions.json')

/**
 * The overlay store, required on first use. advisorEngine.js loads this module, and it keeps
 * the MySQL pool out of its own load for the same reason it lazy-loads `loadFirmConfig`.
 * @returns {object}
 */
function overlay () {
  return require('./firmOverlay')
}

/** A slug of an aspect's name — `Sales (Process)` → `sales-process`. */
function slugOf (name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/**
 * The shipped nine, each question given its identity: `ga-<aspect>-<n>`, numbered in the
 * data file's order. ⚠ THAT ORDER IS IDENTITY — every decline and edit below keys to it — and
 * `growthAspectQuestions.test.js` pins it by fingerprint, so it cannot move unnoticed.
 */
const BASE_ASPECTS = Object.freeze(
  (require('../../data/growth-fundamentals.json').growthAspects || [])
    .map(a => Object.freeze({
      name: a.name,
      description: a.description,
      questions: Object.freeze((a.questions || []).map((text, i) =>
        Object.freeze({ id: SHIPPED_PREFIX + slugOf(a.name) + '-' + (i + 1), text })))
    }))
)

/** The nine names — the only aspects a decision may name. */
const ASPECT_NAMES = BASE_ASPECTS.map(a => a.name)

// ── Storage ──────────────────────────────────────────────────────────────────────────

function devReadAll () {
  try { return JSON.parse(fs.readFileSync(DEV_FILE, 'utf8')) } catch (e) { return {} }
}

/**
 * Read one scope's stored value, falling back to the dev file only when there is no
 * database at all — never because a live one refused (`dbFailure.devFallbackAllowed`).
 * Shared by the hub routes, the planner route and the Virtual Advisor.
 * @param {string} scopeId
 * @param {string} key
 * @returns {Promise<*>}
 */
async function readScopeConfig (scopeId, key) {
  try {
    return await overlay().loadFirmConfig(scopeId, key)
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    const v = devReadAll()[scopeId + '::' + key]
    return v === undefined ? null : v
  }
}

/**
 * Write one scope's own value, under the same rule.
 * @param {string} scopeId - from the verified JWT, never a request body.
 * @param {string} key
 * @param {*} value
 * @param {string} savedBy
 * @returns {Promise<void>}
 */
async function writeScopeConfig (scopeId, key, value, savedBy) {
  try {
    await overlay().saveFirmConfig(scopeId, key, value, savedBy)
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    const all = devReadAll()
    all[scopeId + '::' + key] = value
    fs.writeFileSync(DEV_FILE, JSON.stringify(all, null, 2))
  }
}

// ── Validation ───────────────────────────────────────────────────────────────────────

/**
 * One piece of question text as it arrives from a request.
 * @param {*} raw
 * @returns {{ok: boolean, value: string, error: (string|null)}}
 */
function checkQuestionText (raw) {
  const text = typeof raw === 'string' ? raw.trim() : ''
  if (!text) { return { ok: false, value: '', error: 'A question cannot be blank' } }
  if (text.length > MAX_QUESTION) {
    return { ok: false, value: '', error: `A question is ${MAX_QUESTION} characters at most` }
  }
  return { ok: true, value: text, error: null }
}

/**
 * One description as it arrives from a request.
 * @param {*} raw
 * @returns {{ok: boolean, value: string, error: (string|null)}}
 */
function checkDescriptionText (raw) {
  const text = typeof raw === 'string' ? raw.trim() : ''
  if (!text) { return { ok: false, value: '', error: 'A description cannot be blank' } }
  if (text.length > MAX_DESCRIPTION) {
    return { ok: false, value: '', error: `A description is ${MAX_DESCRIPTION} characters at most` }
  }
  return { ok: true, value: text, error: null }
}

const isText = v => typeof v === 'string' && v.trim().length > 0
const asObject = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})

/**
 * One scope's stored decisions, keeping only what is well-formed.
 *
 * NEVER THROWS AND NEVER DROPS A WHOLE SCOPE FOR ONE BAD ENTRY: malformed storage for one
 * aspect must not stop a manager opening the tab or an advisor seeing the other eight.
 *
 * @param {*} stored - whatever came back from the overlay
 * @returns {Object.<string, {declined: string[], overrides: object, baselines: object,
 *   own: Array<{id: string, text: string}>, description: (string|undefined),
 *   descriptionBaseline: (string|undefined)}>} keyed by aspect name; every name present
 */
function readState (stored) {
  const aspects = asObject(asObject(stored).aspects)
  const out = {}
  ASPECT_NAMES.forEach((name) => {
    const a = asObject(aspects[name])
    const overrides = {}
    Object.keys(asObject(a.overrides)).forEach((id) => {
      const o = a.overrides[id]
      if (o && isText(o.text)) { overrides[id] = { text: o.text } }
    })
    const baselines = {}
    Object.keys(asObject(a.baselines)).forEach((id) => {
      if (typeof a.baselines[id] === 'string') { baselines[id] = a.baselines[id] }
    })
    out[name] = {
      declined: (Array.isArray(a.declined) ? a.declined : []).filter(isText),
      overrides,
      baselines,
      own: (Array.isArray(a.own) ? a.own : [])
        .filter(r => r && isText(r.id) && isText(r.text))
        .map(r => ({ id: r.id, text: r.text })),
      description: isText(a.description) ? a.description : undefined,
      descriptionBaseline: typeof a.descriptionBaseline === 'string' ? a.descriptionBaseline : undefined
    }
  })
  return out
}

/** A state with every aspect present and empty — what a scope that decided nothing holds. */
function emptyState () {
  return readState(null)
}

/** The stored shape of a state — only aspects with a decision in them. */
function toStored (state) {
  const aspects = {}
  Object.keys(state).forEach((name) => {
    const a = state[name]
    const kept = {}
    if (a.declined.length) { kept.declined = a.declined }
    if (Object.keys(a.overrides).length) { kept.overrides = a.overrides }
    if (Object.keys(a.baselines).length) { kept.baselines = a.baselines }
    if (a.own.length) { kept.own = a.own }
    if (a.description !== undefined) {
      kept.description = a.description
      kept.descriptionBaseline = a.descriptionBaseline
    }
    if (Object.keys(kept).length) { aspects[name] = kept }
  })
  return { aspects }
}

// ── Resolution ───────────────────────────────────────────────────────────────────────

/**
 * The nine as a scope's managers see them, with every badge and offer the screen draws.
 *
 * Recurses up the tier chain: what a firm resolves against is its group's RESOLVED list,
 * which is the mentor's resolved list with the group's decisions applied, and so on — the
 * same mechanism applied at each level rather than a second rule for the tier above.
 *
 * @param {string|null} scopeId
 * @param {function(string, string): Promise<*>} reader
 * @returns {Promise<Array<object>>} per aspect: `{ name, description, descriptionSource,
 *   descriptionChangedAbove, descriptionAbove, questions: [{id, text, source, changedAbove,
 *   above}], declined: [{id, text}] }`
 * @throws when the store cannot be read — callers that must not fail use
 *   `loadResolvedAspects`, which never rejects.
 */
async function resolveDetailed (scopeId, reader) {
  const inheritedList = await loadInherited(scopeId, reader)
  const state = scopeId ? readState(await reader(scopeId, CONFIG_KEY)) : emptyState()

  return inheritedList.map((above) => {
    const mine = state[above.name]
    const byId = {}
    above.questions.forEach((q) => { byId[q.id] = q })

    const questions = resolveInheritedRows(
      above.questions.map(q => ({ id: q.id, text: q.text })),
      { declinedIds: mine.declined, overrides: mine.overrides, ownRows: mine.own },
      { sourceLabels: SOURCE_LABELS }
    ).map((q) => {
      const up = byId[q.id]
      const changedAbove = q.source === SOURCE_LABELS.override && up !== undefined &&
        mine.baselines[q.id] !== undefined && mine.baselines[q.id] !== up.text
      return {
        id: q.id,
        text: q.text,
        source: q.source,
        changedAbove,
        ...(changedAbove ? { above: up.text } : {})
      }
    })

    const descriptionEdited = mine.description !== undefined
    const descriptionChangedAbove = descriptionEdited &&
      mine.descriptionBaseline !== undefined && mine.descriptionBaseline !== above.description

    return {
      name: above.name,
      description: descriptionEdited ? mine.description : above.description,
      descriptionSource: descriptionEdited ? SOURCE_LABELS.override : SOURCE_LABELS.inherited,
      descriptionChangedAbove,
      ...(descriptionChangedAbove ? { descriptionAbove: above.description } : {}),
      questions,
      declined: mine.declined
        .filter(id => byId[id])
        .map(id => ({ id, text: byId[id].text }))
    }
  })
}

/**
 * What a scope inherits before its own decisions: the level above's resolved nine, or the
 * shipped nine for the mentor.
 * @param {string|null} scopeId
 * @param {function(string, string): Promise<*>} reader
 * @returns {Promise<Array<{name: string, description: string, questions: Array<{id, text}>}>>}
 */
async function loadInherited (scopeId, reader) {
  const parent = scopeId ? parentScopeOf(scopeId) : null
  if (parent === null) { return BASE_ASPECTS }
  const detailed = await resolveDetailed(parent, reader)
  return detailed.map(a => ({
    name: a.name,
    description: a.description,
    questions: a.questions.map(q => ({ id: q.id, text: q.text }))
  }))
}

/**
 * The nine as an advisor under this scope is shown them — plain wording, no badges.
 *
 * @param {string|null} scopeId - from the verified JWT, never a request body.
 * @param {function(string, string): Promise<*>} reader - injected so tests need no database.
 * @returns {Promise<Array<{name: string, description: string, questions: string[]}>>}
 *   NEVER REJECTS: the planner and the Virtual Advisor must not fail for it, and the worst
 *   case is the shipped wording — what every firm had before this tab existed.
 */
async function loadResolvedAspects (scopeId, reader) {
  try {
    const detailed = await resolveDetailed(scopeId, reader)
    return detailed.map(a => ({ name: a.name, description: a.description, questions: a.questions.map(q => q.text) }))
  } catch (err) {
    console.error('[growth-aspects] scope read failed:', err.message)
    return BASE_ASPECTS.map(a => ({ name: a.name, description: a.description, questions: a.questions.map(q => q.text) }))
  }
}

/**
 * The next id this scope mints for an aspect. It takes the stored high-water mark as well as
 * the live rows: counting only the live rows hands the highest removed id straight back.
 * @param {string} scopeId
 * @param {Array<{id: string}>} ownRows
 * @param {number} [lastSeq]
 * @returns {{id: string, seq: number}}
 */
function nextOwnId (scopeId, ownRows, lastSeq) {
  const prefix = ID_PREFIX_BY_TIER[tierOfScope(scopeId)] || ID_PREFIX_BY_TIER.firm_manager
  const held = ownRows
    .map(r => (r.id.indexOf(prefix) === 0 ? parseInt(r.id.slice(prefix.length), 10) : NaN))
    .filter(n => Number.isInteger(n) && n > 0)
  const mark = Number.isInteger(lastSeq) && lastSeq > 0 ? lastSeq : 0
  const seq = Math.max(held.length ? Math.max(...held) : 0, mark) + 1
  return { id: prefix + seq, seq }
}

module.exports = {
  CONFIG_KEY,
  NEXT_SEQ_KEY,
  SOURCE_LABELS,
  ID_PREFIX_BY_TIER,
  SHIPPED_PREFIX,
  BASE_ASPECTS,
  ASPECT_NAMES,
  MAX_DESCRIPTION,
  MAX_QUESTION,
  MAX_OWN_PER_ASPECT,
  slugOf,
  checkQuestionText,
  checkDescriptionText,
  readState,
  toStored,
  resolveDetailed,
  loadInherited,
  loadResolvedAspects,
  nextOwnId,
  readScopeConfig,
  writeScopeConfig
}
