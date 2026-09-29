'use strict'

/**
 * @file The Strategy Planner concepts a manager has added by uploading PDFs, as each scope sees
 *   them through the tier cascade.
 * @module server/utils/importedConcepts
 *
 * Item 15.20, Add Concept. The approved drawing is `design/mockups/add-concept.html`; every
 * ruling behind this file is in `design/features/strategy-planner.md` §9.
 *
 * 🔴 IT CASCADES, AND ONLY ONE WAY (questions 5 and 6, ruled 2026-09-23). A concept is authored
 * at one of the four manager tiers and appears AT ONCE at every tier beneath it — no opt-in. The
 * client is where it is delivered, never a fifth place to author, so `tierChain.TIERS` is the
 * whole of the cascade. A tier may remove only what it added itself; replacing an inherited one
 * has no screen yet and is not offered here.
 *
 * WHAT ONE TIER STORES. One versioned record per concept, `imported-concept:<id>:record`, so each
 * concept has its own history and a removal deletes exactly one concept's rows. The key ends in
 * `:record` so its prefix, `imported-concept:<id>:`, ends in ':' — which
 * `firmOverlay.deleteFirmConfigsByPrefix` requires, so that removing `im-f1` can never also match
 * `im-f10`. `NEXT_SEQ_KEY` is a counter that is never reused, so a removed concept's id is never
 * handed out again.
 *
 * 🔴 THE DRAWINGS HERE ARE THE SERVER'S OWN CONVERSION, NEVER THE BROWSER'S. `buildRecord` takes
 * the pages `pdfConvert.convertPdf` returned for the PDFs that were uploaded with the save — a
 * drawing sent back from a preview is never accepted, so nothing a browser returns can put
 * altered content in front of a client.
 *
 * Node 14, CommonJS.
 */

const fs = require('fs')
const path = require('path')
const { devFallbackAllowed } = require('./dbFailure')
const { scopeChain, tierOfScope } = require('./tierChain')
const { PLANNING_DOMAINS } = require('./strategyFrameworks')

const CONFIG_PREFIX = 'imported-concept:'
const RECORD_SUFFIX = ':record'
const NEXT_SEQ_KEY = 'imported-concept-next-seq'

/** Own-concept id prefixes, one per tier, so two tiers can never mint the same id. */
const ID_PREFIX_BY_TIER = {
  mentor: 'im-m',
  global_group_manager: 'im-x',
  group_manager: 'im-g',
  firm_manager: 'im-f'
}

const ID_PATTERN = /^im-[mxgf][1-9][0-9]{0,6}$/

/** The drawing's upload cap, per file: "PDF only · up to 20 MB each". */
const MAX_PDF_BYTES = 20 * 1024 * 1024
const MAX_TEACHING_FILES = 5
const MAX_TEACHING_PAGES = 10
const MAX_NAME = 120
const MAX_HELPS = 200
const MAX_BOXES = 30
const MAX_LABEL = 80

/** A box narrower or shorter than 1% of the page is a slip of the mouse, not a space to write. */
const MIN_BOX = 0.01

const DEV_FILE = path.resolve(__dirname, '../../data/dev-imported-concepts.json')

function overlay () {
  return require('./firmOverlay')
}

// ── Storage ──────────────────────────────────────────────────────────────────────────

function devReadAll () {
  try { return JSON.parse(fs.readFileSync(DEV_FILE, 'utf8')) } catch (e) { return {} }
}

function devWriteAll (all) {
  fs.writeFileSync(DEV_FILE, JSON.stringify(all, null, 2))
}

/**
 * Every value one scope holds under a key prefix, as `{ suffix: value }`.
 * Falls back to the dev file only when there is no database at all.
 * @param {string} scopeId
 * @param {string} prefix
 * @returns {Promise<Object.<string, *>>}
 */
async function readScopePrefix (scopeId, prefix) {
  try {
    return await overlay().loadFirmConfigsByPrefix(scopeId, prefix)
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    const own = devReadAll()[scopeId] || {}
    const out = {}
    Object.keys(own).forEach((k) => {
      if (k.indexOf(prefix) === 0 && k.length > prefix.length) { out[k.slice(prefix.length)] = own[k] }
    })
    return out
  }
}

/**
 * One scope's own value for one key, under the same rule.
 * @param {string} scopeId
 * @param {string} key
 * @returns {Promise<*>}
 */
async function readScopeConfig (scopeId, key) {
  try {
    return await overlay().loadFirmConfig(scopeId, key)
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    const v = (devReadAll()[scopeId] || {})[key]
    return v === undefined ? null : v
  }
}

/**
 * Write one scope's own value, under the same rule.
 * @param {string} scopeId - from the verified JWT, never a request body
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
    all[scopeId] = Object.assign({}, all[scopeId], { [key]: value })
    devWriteAll(all)
  }
}

/**
 * Delete every version of one concept's record at one scope.
 * @param {string} scopeId - from the verified JWT, never a request body
 * @param {string} conceptId
 * @returns {Promise<void>}
 */
async function deleteRecord (scopeId, conceptId) {
  const prefix = CONFIG_PREFIX + conceptId + ':'
  try {
    await overlay().deleteFirmConfigsByPrefix(scopeId, prefix)
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    const all = devReadAll()
    const own = Object.assign({}, all[scopeId])
    Object.keys(own).forEach((k) => { if (k.indexOf(prefix) === 0) { delete own[k] } })
    all[scopeId] = own
    devWriteAll(all)
  }
}

// ── Checking what arrives ────────────────────────────────────────────────────────────

const isText = v => typeof v === 'string' && v.trim().length > 0
const isFraction = v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1

/**
 * The name, section and one-line description a manager typed.
 * @param {{name: *, planningDomain: *, helpsClientTo: *}} raw
 * @returns {{ok: true, value: object}|{ok: false, code: string, message: string}}
 */
function checkDetails (raw) {
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  if (!name || name.length > MAX_NAME) {
    return { ok: false, code: 'INVALID_NAME', message: 'A concept name is 1 to ' + MAX_NAME + ' characters' }
  }
  if (!PLANNING_DOMAINS.includes(raw.planningDomain)) {
    return { ok: false, code: 'INVALID_SECTION', message: 'That is not one of the four planning sections' }
  }
  const helps = typeof raw.helpsClientTo === 'string' ? raw.helpsClientTo.trim() : ''
  if (helps.length > MAX_HELPS) {
    return { ok: false, code: 'INVALID_HELPS', message: 'The one-line description is ' + MAX_HELPS + ' characters at most' }
  }
  return { ok: true, value: { name, planningDomain: raw.planningDomain, helpsClientTo: helps || null } }
}

/**
 * The boxes the client writes in, marked by hand on the Response Form page.
 *
 * Each is a fraction of the page, so a box is inside the page by construction and survives any
 * size the page is drawn at. Kept in the order they were drawn — the order the advisor is taken
 * through them (drawing §5b).
 *
 * @param {*} raw - an array of `{label, x, y, w, h}`
 * @returns {{ok: true, value: Array<object>}|{ok: false, code: string, message: string}}
 */
function checkBoxes (raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, code: 'NO_BOXES', message: 'At least one box must be marked' }
  }
  if (raw.length > MAX_BOXES) {
    return { ok: false, code: 'TOO_MANY_BOXES', message: 'A Response Form takes ' + MAX_BOXES + ' boxes at most' }
  }
  const value = []
  for (const b of raw) {
    const label = b && typeof b.label === 'string' ? b.label.trim() : ''
    if (!label || label.length > MAX_LABEL) {
      return { ok: false, code: 'INVALID_LABEL', message: 'Every box needs a label of 1 to ' + MAX_LABEL + ' characters' }
    }
    const sound = b && [b.x, b.y, b.w, b.h].every(isFraction) &&
      b.w >= MIN_BOX && b.h >= MIN_BOX && b.x + b.w <= 1 && b.y + b.h <= 1
    if (!sound) {
      return { ok: false, code: 'INVALID_BOX', message: 'Every box must lie inside the page' }
    }
    value.push({ label, x: b.x, y: b.y, w: b.w, h: b.h })
  }
  return { ok: true, value }
}

// ── Records ──────────────────────────────────────────────────────────────────────────

const pageOf = p => ({ svg: p.svg, width: p.width, height: p.height, title: p.title })

/**
 * The record one save stores.
 *
 * @param {string} id
 * @param {object} details - from `checkDetails`
 * @param {Array<object>} teachingPages - `pdfConvert.convertPdf` output, every teaching file in order
 * @param {object} responsePage - the Response Form's single converted page
 * @param {Array<object>} boxes - from `checkBoxes`
 * @param {string} addedBy - from the verified JWT
 * @param {Date} [now]
 * @returns {object}
 */
function buildRecord (id, details, teachingPages, responsePage, boxes, addedBy, now) {
  return {
    id,
    version: 1,
    name: details.name,
    planningDomain: details.planningDomain,
    helpsClientTo: details.helpsClientTo,
    teachingPages: teachingPages.map(pageOf),
    responsePage: pageOf(responsePage),
    boxes,
    addedBy,
    addedAt: (now || new Date()).toISOString()
  }
}

const isPage = p => p && isText(p.svg) && typeof p.width === 'number' && p.width > 0 &&
  typeof p.height === 'number' && p.height > 0

/**
 * Is a stored record one we can use? Malformed storage for one concept is dropped from the
 * list rather than stopping a manager opening the tab.
 * @param {*} r
 * @param {string} id - the id its key names
 * @returns {boolean}
 */
function isSoundRecord (r, id) {
  return Boolean(r && r.id === id && ID_PATTERN.test(id) && isText(r.name) &&
    PLANNING_DOMAINS.includes(r.planningDomain) &&
    Array.isArray(r.teachingPages) && r.teachingPages.length > 0 && r.teachingPages.every(isPage) &&
    isPage(r.responsePage) && checkBoxes(r.boxes).ok)
}

/**
 * One scope's own concepts, keyed by id.
 * @param {string} scopeId
 * @returns {Promise<Object.<string, object>>}
 */
async function readOwn (scopeId) {
  const raw = await readScopePrefix(scopeId, CONFIG_PREFIX)
  const out = {}
  Object.keys(raw).forEach((suffix) => {
    if (suffix.slice(-RECORD_SUFFIX.length) !== RECORD_SUFFIX) { return }
    const id = suffix.slice(0, -RECORD_SUFFIX.length)
    if (isSoundRecord(raw[suffix], id)) { out[id] = raw[suffix] }
  })
  return out
}

/**
 * Every imported concept a scope sees: what each tier above it added, then its own.
 *
 * The drawings are left out — a library row needs the name and the counts, and a list of
 * forty concepts carrying their pages would move megabytes to draw a table.
 *
 * @param {string} scopeId - from the verified JWT
 * @returns {Promise<Array<{id: string, name: string, planningDomain: string,
 *   helpsClientTo: (string|null), teachingPageCount: number, boxCount: number, addedAt: string,
 *   addedAtTier: string, here: boolean}>>} top tier first, each tier in the order it added them
 */
async function listForScope (scopeId) {
  const out = []
  for (const scope of scopeChain(scopeId)) {
    const own = await readOwn(scope)
    Object.keys(own)
      .map(id => own[id])
      .sort((a, b) => String(a.addedAt).localeCompare(String(b.addedAt)))
      .forEach((r) => {
        out.push({
          id: r.id,
          name: r.name,
          planningDomain: r.planningDomain,
          helpsClientTo: r.helpsClientTo || null,
          teachingPageCount: r.teachingPages.length,
          boxCount: r.boxes.length,
          addedAt: r.addedAt,
          addedAtTier: tierOfScope(scope),
          here: scope === scopeId
        })
      })
  }
  return out
}

/**
 * The next id this scope mints. It takes the stored high-water mark as well as the live ids:
 * counting only the live ones hands a removed id straight back.
 * @param {string} scopeId
 * @param {string[]} ownIds
 * @param {*} lastSeq
 * @returns {{id: string, seq: number}}
 */
function nextId (scopeId, ownIds, lastSeq) {
  const prefix = ID_PREFIX_BY_TIER[tierOfScope(scopeId)] || ID_PREFIX_BY_TIER.firm_manager
  const held = ownIds
    .map(id => (id.indexOf(prefix) === 0 ? parseInt(id.slice(prefix.length), 10) : NaN))
    .filter(n => Number.isInteger(n) && n > 0)
  const mark = Number.isInteger(lastSeq) && lastSeq > 0 ? lastSeq : 0
  const seq = Math.max(held.length ? Math.max(...held) : 0, mark) + 1
  return { id: prefix + seq, seq }
}

/**
 * Mint an id and move the counter past it, before anything else is stored — so a save that
 * fails part-way can never leave its id to be handed out a second time.
 * @param {string} scopeId
 * @param {string} savedBy
 * @returns {Promise<string>}
 */
async function mintId (scopeId, savedBy) {
  const own = await readOwn(scopeId)
  const stored = await readScopeConfig(scopeId, NEXT_SEQ_KEY)
  const minted = nextId(scopeId, Object.keys(own), stored && stored.seq)
  await writeScopeConfig(scopeId, NEXT_SEQ_KEY, { seq: minted.seq }, savedBy)
  return minted.id
}

// ── In the planner (piece 3) ─────────────────────────────────────────────────────────

/**
 * The capture form an imported concept's card is laid out by: its labelled boxes, one under
 * another, in the order the manager drew them (drawing §5b: "The capture card lists the labelled
 * boxes as fields, in their drawn order").
 */
const IMPORTED_FORM = 'imported'

/**
 * Every imported concept a scope can see — its own and every tier's above it — with its pages.
 *
 * @param {string} scopeId - from the verified JWT
 * @returns {Promise<Object.<string, object>>} id → record; a lower tier wins on a clash, which the
 *   tier-prefixed ids make impossible in practice
 */
async function loadVisible (scopeId) {
  const out = {}
  for (const scope of scopeChain(scopeId)) {
    Object.assign(out, await readOwn(scope))
  }
  return out
}

/**
 * One imported concept this scope can see, or null. An id that is not shaped like an imported
 * one is answered without reading anything.
 *
 * @param {string} scopeId - from the verified JWT
 * @param {*} id
 * @returns {Promise<object|null>}
 */
async function findVisible (scopeId, id) {
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) { return null }
  return (await loadVisible(scopeId))[id] || null
}

/**
 * An imported concept in the shape the planner gives every concept (`strategyFrameworks`
 * `buildConcept`), so the menu, the session and the plan treat it as any other. It has no deck
 * page, no summary line and no instruction pages — only what the manager supplied.
 *
 * @param {object} record
 * @returns {object}
 */
function plannerConcept (record) {
  return {
    id: record.id,
    name: record.name,
    planningDomain: record.planningDomain,
    deck: null,
    document: null,
    page: null,
    source: 'imported',
    conceptSummary: null,
    conceptSummaryRef: null,
    helpsClientTo: record.helpsClientTo || null,
    helpsClientToRef: null,
    teachingForm: null,
    captureForm: IMPORTED_FORM,
    captureTemplate: null,
    captureFormBasis: 'measured',
    responsePage: null,
    lastPage: null,
    pageWords: [],
    model: null,
    importReport: null,
    imported: true
  }
}

/**
 * An imported concept's capture card. Each box is a field keyed as a one-column table
 * (`t0r<i>c0`), which is the key shape the capture card and the save guard already read, so the
 * card needs no special path to lay it out. The teaching pages travel with it, as a drawn
 * concept's drawing does.
 *
 * @param {object} record
 * @returns {{supplied: true, form: string, fields: Array<object>, teachingPages: Array<object>}}
 */
function captureOf (record) {
  return {
    supplied: true,
    form: IMPORTED_FORM,
    tableForms: [IMPORTED_FORM],
    // The label is the COLUMN label: the card heads each block with it and prints a field's row
    // label again beneath, so carried as a row label it showed twice (walked 2026-09-29).
    fields: record.boxes.map((b, i) => ({
      key: 't0r' + i + 'c0',
      row: i,
      column: 0,
      columnLabel: b.label,
      rowLabel: '',
      example: ''
    })),
    teachingPages: record.teachingPages.map(p => ({ svg: p.svg, width: p.width, height: p.height })),
    importReport: null
  }
}

/**
 * Is this a real box on this imported concept's card? The save guard's whitelist, as
 * `strategyCaptureForms.hasCaptureField` is for a shipped concept.
 *
 * @param {object} record
 * @param {*} fieldKey
 * @returns {boolean}
 */
function hasBox (record, fieldKey) {
  const m = /^t0r(\d+)c0$/.exec(String(fieldKey || ''))
  return Boolean(m) && Number(m[1]) < record.boxes.length
}

/**
 * Store one concept's record.
 * @param {string} scopeId - from the verified JWT
 * @param {object} record - from `buildRecord`
 * @param {string} savedBy
 * @returns {Promise<void>}
 */
async function saveRecord (scopeId, record, savedBy) {
  await writeScopeConfig(scopeId, CONFIG_PREFIX + record.id + RECORD_SUFFIX, record, savedBy)
}

module.exports = {
  CONFIG_PREFIX,
  NEXT_SEQ_KEY,
  ID_PREFIX_BY_TIER,
  ID_PATTERN,
  MAX_PDF_BYTES,
  MAX_TEACHING_FILES,
  MAX_TEACHING_PAGES,
  MAX_NAME,
  MAX_HELPS,
  MAX_BOXES,
  MAX_LABEL,
  MIN_BOX,
  checkDetails,
  checkBoxes,
  buildRecord,
  isSoundRecord,
  readOwn,
  listForScope,
  nextId,
  mintId,
  saveRecord,
  deleteRecord,
  IMPORTED_FORM,
  loadVisible,
  findVisible,
  plannerConcept,
  captureOf,
  hasBox
}
