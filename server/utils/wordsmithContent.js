'use strict'

/**
 * @file What Wordsmith knows — each statement's definition, writing rule, questions for the room
 *   and word limit, and the instruction behind each style choice — as a scope works to them,
 *   resolved through every tier's own decisions.
 * @module server/utils/wordsmithContent
 *
 * Item 15.14. The hub tab of `design/mockups/wordsmith-screens.html` (screens 6 and 7) and the
 * split of `design/mockups/wordsmith-style-settings.html`, both approved by Mike 2026-09-29. The
 * shipped content is `data/wordsmith-statements.json`, the mentor's.
 *
 * 🔴 IT CASCADES ON THE STANDARD RULES (`tier-cascade.md` P3 and P11), exactly as Growth Aspect
 * Questions does — this file is `growthAspects.js`'s shape with Wordsmith's parts. All four
 * manager tiers edit; a tier holds only its decisions; an inherited value a tier has edited is
 * protected, and a later change above it is offered — Use theirs / Keep mine — never applied.
 *
 * WHAT EACH PART ALLOWS, as Mike ruled on the split:
 *   definition rows and questions — edit, switch off, add (a list, as Growth Aspect questions)
 *   the writing rule and the word limit — edit only (one value, as an aspect's description)
 *   style instructions — edit only: the choices are fixed in code, which checks the model
 *     picks from them, so a style row can never be switched off or added.
 *   The five statement names are fixed keys at every tier.
 *
 * WHAT ONE TIER STORES. One versioned record (`CONFIG_KEY`), so one Restore puts back the tab:
 *   { statements: { [name]: {
 *       definition: { declined, overrides: {id: {text, cites}}, baselines: {id: text}, own },
 *       questions:  { declined, overrides: {id: {question}}, baselines: {id: question}, own },
 *       rule, ruleBaseline, maxWords, maxWordsBaseline } },
 *     style: { overrides: {optionId: {instruction}}, baselines: {optionId: instruction} } }
 * and `NEXT_SEQ_KEY`, a counter never restored, so a removed row's id is never handed out again.
 */

const fs = require('fs')
const path = require('path')
const { devFallbackAllowed } = require('./dbFailure')
const { parentScopeOf, tierOfScope } = require('./tierChain')
const { resolveInheritedRows } = require('./resolveInheritedRows')
const ws = require('./wordsmith')

/** The versioned record a tier's decisions are stored under. */
const CONFIG_KEY = 'wordsmith-content'

/** Per `<statement>:<part>`, the high-water mark of ids each tier has minted. Never restored. */
const NEXT_SEQ_KEY = 'wordsmith-content-next-seq'

/** How a resolved row is badged — the hub's words, as Growth Aspect Questions uses them. */
const SOURCE_LABELS = { inherited: 'inherited', override: 'edited-here', own: 'added-here' }

/** Own-row prefixes, one per tier, so two tiers can never mint the same id. */
const ID_PREFIX_BY_TIER = {
  mentor: 'mw-',
  global_group_manager: 'xw-',
  group_manager: 'gw-',
  firm_manager: 'fw-'
}

/** The two list parts, and the letter each own id carries. */
const PARTS = { definition: 'd', questions: 'q' }
const BASES = ['alignment', 'best-practice']

const MAX_DEFINITION = 600
const MAX_QUESTION = 300
const MAX_RULE = 800
const MAX_INSTRUCTION = 400
const MAX_OWN_PER_PART = 20
const MAX_CITES = 5
const MIN_WORDS = 10
const MAX_WORDS = 120

const DEV_FILE = path.resolve(__dirname, '../../data/dev-wordsmith-content.json')

const SHIPPED = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../data/wordsmith-statements.json'), 'utf8'))

/** The mentor's shipped statements in engine shape, frozen. */
const BASE_STATEMENTS = Object.freeze(ws.checkStatements(SHIPPED.statements).map(s => Object.freeze({
  name: s.name,
  maxWords: s.maxWords,
  domain: Object.freeze({ id: s.domain.id, name: s.domain.name, rule: s.domain.rule }),
  definition: Object.freeze(s.definition.map(r => Object.freeze({ id: r.id, basis: r.basis, text: r.text, ...(r.cites ? { cites: r.cites } : {}) }))),
  elements: Object.freeze(s.elements.map(e => Object.freeze({ id: e.id, detect: e.detect, label: e.label, question: e.question })))
})))

/** The shipped style rows, frozen — refused at load by the engine's own check if malformed. */
ws.styleGuideFrom(SHIPPED.styleSettings)
const BASE_STYLE = Object.freeze(SHIPPED.styleSettings.map(row => Object.freeze({
  key: row.key,
  options: Object.freeze(row.options.map(o => Object.freeze({ id: o.id, value: o.value, instruction: o.instruction })))
})))

function overlay () {
  return require('./firmOverlay')
}

// ── Storage ──────────────────────────────────────────────────────────────────────────

function devReadAll () {
  try { return JSON.parse(fs.readFileSync(DEV_FILE, 'utf8')) } catch (e) { return {} }
}

/**
 * Read one scope's stored value, falling back to the dev file only when there is no database at
 * all — never because a live one refused (`dbFailure.devFallbackAllowed`).
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

// ── Validation of what arrives from a request ────────────────────────────────────────

/**
 * @param {*} raw
 * @param {number} max
 * @param {string} what - for the message
 * @returns {{ok: boolean, value: string, error: (string|null)}}
 */
function checkText (raw, max, what) {
  const text = typeof raw === 'string' ? raw.trim() : ''
  if (!text) { return { ok: false, value: '', error: what + ' cannot be blank' } }
  if (text.length > max) { return { ok: false, value: '', error: what + ' is ' + max + ' characters at most' } }
  return { ok: true, value: text, error: null }
}

/**
 * A row's sources. Absent is fine; present must be well-formed, with a web link.
 * @param {*} raw
 * @returns {{ok: boolean, value: (Array<object>|undefined), error: (string|null)}}
 */
function checkCites (raw) {
  if (raw === undefined || raw === null) { return { ok: true, value: undefined, error: null } }
  if (!Array.isArray(raw) || raw.length > MAX_CITES) {
    return { ok: false, value: undefined, error: 'Sources are a list of ' + MAX_CITES + ' at most' }
  }
  const value = []
  for (const c of raw) {
    const author = c && typeof c.author === 'string' ? c.author.trim() : ''
    const title = c && typeof c.title === 'string' ? c.title.trim() : ''
    const url = c && typeof c.url === 'string' ? c.url.trim() : ''
    if (!author || author.length > 120 || !title || title.length > 200 || url.length > 500 ||
        (url && !/^https?:\/\/\S+$/i.test(url))) {
      return { ok: false, value: undefined, error: 'Each source needs an author and a title, and a web link if it has one' }
    }
    value.push(url ? { author, title, url } : { author, title })
  }
  return { ok: true, value, error: null }
}

/**
 * @param {*} raw
 * @returns {{ok: boolean, value: number, error: (string|null)}}
 */
function checkMaxWords (raw) {
  const n = Number(raw)
  if (!Number.isInteger(n) || n < MIN_WORDS || n > MAX_WORDS) {
    return { ok: false, value: 0, error: 'A word limit is a whole number from ' + MIN_WORDS + ' to ' + MAX_WORDS }
  }
  return { ok: true, value: n, error: null }
}

// ── A tier's stored decisions ────────────────────────────────────────────────────────

const isText = v => typeof v === 'string' && v.trim().length > 0
const asObject = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})

function readList (raw, field, ownShape) {
  const p = asObject(raw)
  const overrides = {}
  Object.keys(asObject(p.overrides)).forEach((id) => {
    const o = p.overrides[id]
    if (o && isText(o[field])) {
      overrides[id] = { [field]: o[field] }
      if (field === 'text' && Array.isArray(o.cites)) { overrides[id].cites = o.cites }
    }
  })
  const baselines = {}
  Object.keys(asObject(p.baselines)).forEach((id) => {
    if (typeof p.baselines[id] === 'string') { baselines[id] = p.baselines[id] }
  })
  return {
    declined: (Array.isArray(p.declined) ? p.declined : []).filter(isText),
    overrides,
    baselines,
    own: (Array.isArray(p.own) ? p.own : []).filter(r => r && isText(r.id) && isText(r[field])).map(ownShape)
  }
}

/**
 * One scope's stored decisions, keeping only what is well-formed.
 *
 * NEVER THROWS AND NEVER DROPS A WHOLE SCOPE FOR ONE BAD ENTRY: malformed storage for one
 * statement must not stop a manager opening the tab.
 *
 * @param {*} stored
 * @returns {{statements: Object.<string, object>, style: {overrides: object, baselines: object}}}
 */
function readState (stored) {
  const all = asObject(asObject(stored).statements)
  const statements = {}
  ws.STATEMENT_NAMES.forEach((name) => {
    const s = asObject(all[name])
    const maxWords = Number(s.maxWords)
    statements[name] = {
      definition: readList(s.definition, 'text', r => ({
        id: r.id, basis: BASES.includes(r.basis) ? r.basis : 'best-practice', text: r.text, ...(Array.isArray(r.cites) ? { cites: r.cites } : {})
      })),
      questions: readList(s.questions, 'question', r => ({ id: r.id, question: r.question })),
      rule: isText(s.rule) ? s.rule : undefined,
      ruleBaseline: typeof s.ruleBaseline === 'string' ? s.ruleBaseline : undefined,
      maxWords: Number.isInteger(maxWords) && maxWords >= MIN_WORDS && maxWords <= MAX_WORDS ? maxWords : undefined,
      maxWordsBaseline: Number.isInteger(s.maxWordsBaseline) ? s.maxWordsBaseline : undefined
    }
  })
  const st = asObject(asObject(stored).style)
  const overrides = {}
  Object.keys(asObject(st.overrides)).forEach((id) => {
    const o = st.overrides[id]
    if (o && isText(o.instruction)) { overrides[id] = { instruction: o.instruction } }
  })
  const baselines = {}
  Object.keys(asObject(st.baselines)).forEach((id) => {
    if (typeof st.baselines[id] === 'string') { baselines[id] = st.baselines[id] }
  })
  return { statements, style: { overrides, baselines } }
}

function emptyState () {
  return readState(null)
}

/** The stored shape of a state — only what holds a decision. */
function toStored (state) {
  const keepList = (p) => {
    const kept = {}
    if (p.declined.length) { kept.declined = p.declined }
    if (Object.keys(p.overrides).length) { kept.overrides = p.overrides }
    if (Object.keys(p.baselines).length) { kept.baselines = p.baselines }
    if (p.own.length) { kept.own = p.own }
    return Object.keys(kept).length ? kept : null
  }
  const statements = {}
  Object.keys(state.statements).forEach((name) => {
    const s = state.statements[name]
    const kept = {}
    const d = keepList(s.definition)
    const q = keepList(s.questions)
    if (d) { kept.definition = d }
    if (q) { kept.questions = q }
    if (s.rule !== undefined) { kept.rule = s.rule; kept.ruleBaseline = s.ruleBaseline }
    if (s.maxWords !== undefined) { kept.maxWords = s.maxWords; kept.maxWordsBaseline = s.maxWordsBaseline }
    if (Object.keys(kept).length) { statements[name] = kept }
  })
  const style = {}
  if (Object.keys(state.style.overrides).length) { style.overrides = state.style.overrides }
  if (Object.keys(state.style.baselines).length) { style.baselines = state.style.baselines }
  return { statements, style }
}

// ── Resolution ───────────────────────────────────────────────────────────────────────

/** An edited inherited row is offered the level above's change when its baseline differs. */
function badged (rows, above, baselines, field) {
  const byId = {}
  above.forEach((r) => { byId[r.id] = r })
  return rows.map((r) => {
    const up = byId[r.id]
    const changedAbove = r.source === SOURCE_LABELS.override && up !== undefined &&
      baselines[r.id] !== undefined && baselines[r.id] !== up[field]
    const out = Object.assign({}, r, { changedAbove })
    delete out.overridesId
    if (changedAbove) { out.above = up[field] }
    return out
  })
}

/**
 * Wordsmith's content as a scope's managers see it, with every badge and offer the tab draws.
 *
 * Recurses up the tier chain: a firm resolves against its group's RESOLVED content, which is the
 * mentor's with the group's decisions applied — one mechanism at each level.
 *
 * @param {string|null} scopeId
 * @param {function(string, string): Promise<*>} reader
 * @returns {Promise<{statements: Array<object>, style: Array<object>}>}
 * @throws when the store cannot be read
 */
async function resolveDetailed (scopeId, reader) {
  const above = await loadInherited(scopeId, reader)
  const state = scopeId ? readState(await reader(scopeId, CONFIG_KEY)) : emptyState()

  const statements = above.statements.map((up) => {
    const mine = state.statements[up.name]
    const definition = badged(resolveInheritedRows(
      up.definition,
      { declinedIds: mine.definition.declined, overrides: mine.definition.overrides, ownRows: mine.definition.own },
      { sourceLabels: SOURCE_LABELS }
    ), up.definition, mine.definition.baselines, 'text')
    const questions = badged(resolveInheritedRows(
      up.elements,
      { declinedIds: mine.questions.declined, overrides: mine.questions.overrides, ownRows: mine.questions.own.map(r => ({ id: r.id, detect: 'model', label: r.question, question: r.question })) },
      { sourceLabels: SOURCE_LABELS }
    ), up.elements, mine.questions.baselines, 'question')

    const ruleEdited = mine.rule !== undefined
    const ruleChangedAbove = ruleEdited && mine.ruleBaseline !== undefined && mine.ruleBaseline !== up.domain.rule
    const wordsEdited = mine.maxWords !== undefined
    const wordsChangedAbove = wordsEdited && mine.maxWordsBaseline !== undefined && mine.maxWordsBaseline !== up.maxWords
    const inheritedDefs = {}
    up.definition.forEach((r) => { inheritedDefs[r.id] = r })
    const inheritedQs = {}
    up.elements.forEach((e) => { inheritedQs[e.id] = e })

    return {
      name: up.name,
      domain: {
        id: up.domain.id,
        name: up.domain.name,
        rule: ruleEdited ? mine.rule : up.domain.rule,
        source: ruleEdited ? SOURCE_LABELS.override : SOURCE_LABELS.inherited,
        changedAbove: ruleChangedAbove,
        ...(ruleChangedAbove ? { above: up.domain.rule } : {})
      },
      maxWords: {
        value: wordsEdited ? mine.maxWords : up.maxWords,
        source: wordsEdited ? SOURCE_LABELS.override : SOURCE_LABELS.inherited,
        changedAbove: wordsChangedAbove,
        ...(wordsChangedAbove ? { above: up.maxWords } : {})
      },
      definition,
      definitionDeclined: mine.definition.declined.filter(id => inheritedDefs[id]).map(id => inheritedDefs[id]),
      questions,
      questionsDeclined: mine.questions.declined.filter(id => inheritedQs[id]).map(id => inheritedQs[id])
    }
  })

  const style = above.style.map(row => ({
    key: row.key,
    options: badged(resolveInheritedRows(
      row.options,
      { overrides: state.style.overrides },
      { sourceLabels: SOURCE_LABELS }
    ), row.options, state.style.baselines, 'instruction')
  }))

  return { statements, style }
}

/**
 * What a scope inherits before its own decisions: the level above's resolved content, or the
 * shipped content for the mentor.
 * @param {string|null} scopeId
 * @param {function(string, string): Promise<*>} reader
 * @returns {Promise<{statements: Array<object>, style: Array<object>}>} engine shape, unbadged
 */
async function loadInherited (scopeId, reader) {
  const parent = scopeId ? parentScopeOf(scopeId) : null
  if (parent === null) { return { statements: BASE_STATEMENTS, style: BASE_STYLE } }
  return toEngineShape(await resolveDetailed(parent, reader))
}

const plainRow = (r, keys) => {
  const out = {}
  keys.forEach((k) => { if (r[k] !== undefined) { out[k] = r[k] } })
  return out
}

/** A resolved view with its badges taken off: statements and style rows the engine reads. */
function toEngineShape (detailed) {
  return {
    statements: detailed.statements.map(s => ({
      name: s.name,
      maxWords: s.maxWords.value,
      domain: { id: s.domain.id, name: s.domain.name, rule: s.domain.rule },
      definition: s.definition.map(r => plainRow(r, ['id', 'basis', 'text', 'cites'])),
      elements: s.questions.map(e => plainRow(e, ['id', 'detect', 'label', 'question']))
    })),
    style: detailed.style.map(row => ({ key: row.key, options: row.options.map(o => plainRow(o, ['id', 'value', 'instruction'])) }))
  }
}

/**
 * The content Wordsmith writes with for a scope's advisors.
 *
 * 🔴 IT REJECTS RATHER THAN FALLING BACK (Mike, 2026-09-29, build detail 13): a firm that
 * switched off a row it disagrees with must never quietly get the mentor's version back because
 * its record could not be read. The caller tells the room Wordsmith could not write.
 *
 * @param {string|null} scopeId - from the verified JWT, never a request body.
 * @param {function(string, string): Promise<*>} reader
 * @returns {Promise<{statements: Array<object>, styleSettings: object}>} checked by the engine's
 *   own checks
 * @throws when the store cannot be read or the resolved content fails those checks
 */
async function loadResolvedContent (scopeId, reader) {
  const shaped = toEngineShape(await resolveDetailed(scopeId, reader))
  return { statements: ws.checkStatements(shaped.statements), styleSettings: ws.styleGuideFrom(shaped.style) }
}

/**
 * The next own id this scope mints for one statement's part. It takes the stored high-water mark
 * as well as the live rows: counting only the live rows hands a removed id straight back.
 * @param {string} scopeId
 * @param {string} part - `definition` or `questions`
 * @param {Array<{id: string}>} ownRows
 * @param {number} [lastSeq]
 * @returns {{id: string, seq: number}}
 */
function nextOwnId (scopeId, part, ownRows, lastSeq) {
  const prefix = (ID_PREFIX_BY_TIER[tierOfScope(scopeId)] || ID_PREFIX_BY_TIER.firm_manager) + PARTS[part]
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
  PARTS,
  BASES,
  BASE_STATEMENTS,
  BASE_STYLE,
  MAX_DEFINITION,
  MAX_QUESTION,
  MAX_RULE,
  MAX_INSTRUCTION,
  MAX_OWN_PER_PART,
  MIN_WORDS,
  MAX_WORDS,
  checkText,
  checkCites,
  checkMaxWords,
  readState,
  toStored,
  resolveDetailed,
  loadInherited,
  loadResolvedContent,
  nextOwnId,
  readScopeConfig,
  writeScopeConfig
}
