'use strict'

/**
 * strategySessionStore — what a strategy planning session holds, and where it is kept.
 *
 * @module server/utils/strategySessionStore
 *
 * Design: `design/mockups/strategy-planner.html`, eleven decisions ruled by Mike
 * 2026-09-16 and registered in `design/ARTEFACTS.md`. To-do item 15.1.
 *
 * WHY THIS EXISTS, MEASURED RATHER THAN ASSERTED. Before any of this was designed, the
 * four Planning Domains were counted from Mike's own Session Scope tables: 45 frameworks,
 * of which an advisor could capture **0** in the app, with **0** answers surviving to the
 * next session. The decks carry tables forward between sessions, so the absence of a store
 * was the feature's central defect. This module is the half that moves both zeroes.
 *
 * 🔴 WHAT IT HOLDS. A client's commercial plan, and named individuals — Decision 4 keeps
 * the capture as free text, Task/Whom/When names staff by name, and an Organisational
 * Review records judgements about them. EVERY READ IS SCOPED BY firm_id for that reason,
 * and there is no unscoped read in this module. Nothing here is sent to a model on its
 * own: the only AI that touches it is Decision 11's wording tidy, which runs on a Meeting
 * Review transcript already inside that feature's consent.
 *
 * 🔴 THESE ROWS DO NOT EXPIRE, DELIBERATELY. A transcript runs on Meeting Review's clock
 * and is destroyed; the plan built from it is the firm's working document and is carried
 * into the next session by design. Do not add a purge job here by analogy with
 * `meetingPurge.js` — they are different kinds of record with different promises attached.
 *
 * 🔴 THE TIMELINE IS NOT BOOKKEEPING. Decision 11 apportions spoken words to fields by
 * asking which box was open when they were said — never by asking a model to sort a
 * transcript. `openField`/`closeField` are what make that possible, so a build that skips
 * them has quietly broken the ruling and left AI judgement as the only route.
 *
 * ⚠ NOT PROVED AGAINST A REAL DATABASE. Written on the laptop, which has no MySQL. The
 * dev-file fallback below is exercised by `tests/unit/strategySessionStore.test.js`; the
 * MySQL path is not. That check is desktop or UAT work and is recorded as outstanding in
 * the handover rather than left to look finished.
 *
 * Node 14, CommonJS.
 */

const fs = require('fs')
const path = require('path')
const db = require('./db')
const { devFallbackAllowed } = require('./dbFailure')

/**
 * Dev-only stand-in for a machine with no MySQL — the affordance every store here carries.
 * Overridable so tests point at an isolated temp file and `npm test` stays hermetic.
 * Production never sets this.
 */
const DEV_FILE = process.env.STRATEGY_SESSION_DEV_FILE
  ? path.resolve(process.env.STRATEGY_SESSION_DEV_FILE)
  : path.resolve(__dirname, '../../data/dev-strategy-sessions.json')

/** Column widths from `config/db-schema.sql`. A longer value cannot be stored. */
const MAX_ID = 64
const MAX_NAME = 128
const MAX_KEY = 128

/**
 * A bound on one save. Generous against any real capture box — the longest deck prompt
 * invites a paragraph, not an essay — and small enough that a runaway client cannot post
 * a megabyte into a TEXT column.
 */
const MAX_VALUE = 20000

/** More frameworks than the four Planning Domains hold, and a bound on one scope write. */
const MAX_SCOPE_ENTRIES = 200

/**
 * A bound on the steps an advisor names. Pivot runs five; forty is far more than a session
 * a human can hold and still small enough that a runaway client cannot fill the column.
 */
const MAX_STEPS = 40

/** The two values `strategy_session_entries.source` accepts. */
const SOURCES = ['typed', 'transcript']

/**
 * A bound on one edited block of a concept page (item 15.25). A page's paragraphs run to
 * about 250 characters and the screen refuses an edit the page cannot hold — Mike's ruling,
 * 2026-09-25 — so this is a ceiling on a runaway client, never on an advisor.
 */
const MAX_EDIT = 2000

/** A bound on edited blocks per page. Blue Ocean Strategy, the densest drawn, has 12. */
const MAX_EDITS_PER_SHEET = 200

/** Names an edited page: `<conceptId>#<sheet>`, as `components/strategy/concepts` ids it. */
const SHEET_KEY = /^[a-z0-9][a-z0-9-]{0,110}#\d{1,2}$/

/** Names a block on that page: its position and a hash of its original words. */
const BLOCK_KEY = /^b\d{1,4}-[0-9a-z]{1,13}$/

function fail (code, message) {
  const e = new Error(message)
  e.code = code
  return e
}

/**
 * Null or undefined. A named helper rather than `== null`, because `eqeqeq` is an ESLint
 * error here and spelling both comparisons out at every call site buries the intent.
 * @param {*} value
 * @returns {boolean}
 */
function isNil (value) {
  return value === null || value === undefined
}

/**
 * Whether the DEV/TEST-ONLY JSON fallback may stand in for an unavailable DB.
 * Read at call time so a production DB failure always propagates, and so a live server
 * that REFUSED a statement can never be mistaken for an absent one.
 * @param {Error} err
 * @returns {boolean}
 */
function devFallbackEnabled (err) {
  return devFallbackAllowed(err)
}

/**
 * Trim and bound an identifier.
 * @param {string} value
 * @param {string} label used in the error message
 * @param {number} [max] defaults to MAX_ID
 * @returns {string}
 * @throws {Error} err.code 'BAD_INPUT'
 */
function requireId (value, label, max) {
  const s = String(isNil(value) ? '' : value).trim()
  if (!s || s.length > (max || MAX_ID)) {
    throw fail('BAD_INPUT', 'The ' + label + ' is missing or too long.')
  }
  return s
}

/**
 * A positive integer session id, whatever shape it arrived in.
 * @param {number|string} value
 * @returns {number}
 * @throws {Error} err.code 'BAD_INPUT'
 */
function requireSessionId (value) {
  const n = Number(value)
  if (!Number.isInteger(n) || n <= 0) {
    throw fail('BAD_INPUT', 'The session id is not valid.')
  }
  return n
}

/**
 * One named step and the cards the advisor placed in it, bounded.
 *
 * 🔴 A STEP HOLDING NOTHING IS A REAL STEP, NOT AN EMPTY VALUE. Mike's ruling of
 * 2026-09-20: he names the steps, and one with nothing in it still prints on the agenda —
 * Pivot's step 5 "Do It & Review It" has no slides behind it at all. Anything here that
 * dropped an empty `items` array would silently delete that step on the next save.
 *
 * @param {*} raw
 * @returns {{name: string, items: string[]}}
 */
function normaliseStep (raw) {
  const step = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {}
  const items = Array.isArray(step.items) ? step.items : []
  return {
    name: String(isNil(step.name) ? '' : step.name).slice(0, MAX_NAME),
    items: items.slice(0, MAX_SCOPE_ENTRIES).map(k => String(k).slice(0, MAX_KEY))
  }
}

/**
 * The chosen domains and framework ids from screen 1, the steps the advisor named on
 * screen 2, bounded and stringified.
 *
 * An empty scope is a REAL state, not a missing value: Decision 1 pre-ticks nothing, so a
 * session exists before anything is chosen.
 *
 * ⚠ THE STEPS' ITEM KEYS ARE NOT CHECKED AGAINST THE SCOPE HERE, AND THAT IS DELIBERATE.
 * A key names a *card* — `fw-<id>`, `<conceptId>#<part>`, `close-<id>` — and which cards
 * exist depends on the concept records the frontend has loaded, which this module does not
 * see. A key naming something no longer scoped simply renders nothing, which is the safe
 * direction: the alternative is refusing a whole save because one concept was unticked.
 *
 * @param {object} scope
 * @returns {string|null}
 * @throws {Error} err.code 'BAD_INPUT'
 */
function encodeScope (scope) {
  if (isNil(scope)) { return null }
  if (typeof scope !== 'object' || Array.isArray(scope)) {
    throw fail('BAD_INPUT', 'The session scope must be an object.')
  }
  const frameworks = Array.isArray(scope.frameworks) ? scope.frameworks : []
  const domains = Array.isArray(scope.domains) ? scope.domains : []
  const steps = Array.isArray(scope.steps) ? scope.steps : []
  if (frameworks.length > MAX_SCOPE_ENTRIES || domains.length > MAX_SCOPE_ENTRIES) {
    throw fail('BAD_INPUT', 'The session scope names too many entries.')
  }
  if (steps.length > MAX_STEPS) {
    throw fail('BAD_INPUT', 'The session names too many steps.')
  }
  const encoded = {
    domains: domains.map(d => String(d).slice(0, MAX_KEY)),
    frameworks: frameworks.map(f => String(f).slice(0, MAX_KEY)),
    steps: steps.map(normaliseStep)
  }
  // 🔴 DECISION C(b): THE SUGGESTION AND THE TICKS ARE BOTH KEPT. Item 15.1 stage 6.
  // The AI's pre-tick is the "AI Suggestion" half of the Original / AI Suggestion / Final
  // Approved Value trail the engineering standards require, and `frameworks` above is the
  // Final Approved Value. Keeping only the ticks would destroy the advisor's ability to
  // see what was proposed and what they did with it, which is the whole point of storing
  // it. It rides `scope_json` exactly as `steps` does — no schema change.
  const suggestion = normaliseSuggestion(scope.suggestion)
  if (suggestion) { encoded.suggestion = suggestion }
  const edits = normaliseEdits(scope.edits)
  if (Object.keys(edits).length) { encoded.edits = edits }
  return JSON.stringify(encoded)
}

/**
 * The advisor's own wording on this session's concept pages, bounded. Item 15.25.
 *
 * 🔴 THESE BELONG TO THE SESSION AND TO NOTHING ELSE. Mike's Decision C, 2026-09-21: *"The
 * advisor edits only the session in front of him, and his changes never become the firm's
 * standard by accident."* The drawings are never touched; an edit is a replacement for one
 * block's words, applied wherever this session's pages are drawn.
 *
 * ⚠ AN ENTRY THAT FAILS ITS SHAPE IS DROPPED, NEVER REFUSED HERE. The route refuses a bad
 * single edit with a reason; this is the ceiling on the whole map, and a stored row must
 * always decode. A malformed key cannot be applied to a page anyway — it names no block.
 *
 * @param {*} raw - `{ '<conceptId>#<sheet>': { '<blockKey>': 'text' } }`
 * @returns {Object<string, Object<string, string>>}
 */
function normaliseEdits (raw) {
  const out = {}
  if (isNil(raw) || typeof raw !== 'object' || Array.isArray(raw)) { return out }
  Object.keys(raw).slice(0, MAX_SCOPE_ENTRIES).forEach((sheetKey) => {
    const blocks = raw[sheetKey]
    if (!SHEET_KEY.test(sheetKey) || isNil(blocks) || typeof blocks !== 'object' || Array.isArray(blocks)) { return }
    const kept = {}
    Object.keys(blocks).slice(0, MAX_EDITS_PER_SHEET).forEach((blockKey) => {
      const text = blocks[blockKey]
      if (BLOCK_KEY.test(blockKey) && typeof text === 'string' && text.trim() && text.length <= MAX_EDIT) {
        kept[blockKey] = text
      }
    })
    if (Object.keys(kept).length) { out[sheetKey] = kept }
  })
  return out
}

/**
 * One stored AI suggestion, or null when there is none.
 *
 * ⚠ A SUGGESTION IS A RECORD OF WHAT WAS PROPOSED, NOT A SCOPE. Nothing here is ever read
 * back as the session's ticks — Decision C(a). It is bounded by the same ceiling the
 * validator applies, so a stored row cannot outgrow what the screen would ever show.
 *
 * @param {*} raw - `{ at, concepts: [{id, reason}] }`
 * @returns {{at: string, concepts: Array<{id: string, reason: string}>}|null}
 */
function normaliseSuggestion (raw) {
  if (isNil(raw) || typeof raw !== 'object' || Array.isArray(raw)) { return null }
  const concepts = Array.isArray(raw.concepts) ? raw.concepts : []
  return {
    at: String(raw.at || '').slice(0, 40),
    concepts: concepts.slice(0, MAX_SCOPE_ENTRIES).map(c => ({
      id: String((c && c.id) || '').slice(0, MAX_KEY),
      reason: String((c && c.reason) || '').slice(0, MAX_VALUE)
    })).filter(c => c.id)
  }
}

/**
 * mysql2 returns a JSON column already parsed on some driver versions and as a string on
 * others. Accept both rather than letting a driver upgrade change what callers receive.
 * @param {*} raw
 * @returns {{domains: string[], frameworks: string[], steps: Array<{name: string, items: string[]}>}}
 */
function decodeScope (raw) {
  // ⚠ `steps: []` IS THE RIGHT EMPTY, AND IT IS NOT THE SAME AS "ONE STEP". A session
  // saved before the step builder existed has no `steps` key at all; it comes back as an
  // empty list and the page decides what to do with that, rather than this module
  // inventing a step nobody named.
  const empty = { domains: [], frameworks: [], steps: [], suggestion: null, edits: {} }
  if (isNil(raw)) { return empty }
  let parsed = raw
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw) } catch (err) { return empty }
  }
  if (!parsed || typeof parsed !== 'object') { return empty }
  return {
    domains: Array.isArray(parsed.domains) ? parsed.domains : [],
    frameworks: Array.isArray(parsed.frameworks) ? parsed.frameworks : [],
    steps: Array.isArray(parsed.steps) ? parsed.steps.map(normaliseStep) : [],
    // A session that has never been suggested for has no `suggestion` key at all, and
    // comes back as null — distinct from a suggestion that returned nothing.
    suggestion: normaliseSuggestion(parsed.suggestion),
    // A session nobody has edited has no `edits` key, and comes back as an empty map.
    edits: normaliseEdits(parsed.edits)
  }
}

// ── the dev fallback file ────────────────────────────────────────────────────
// Shape: { nextId, sessions: [], entries: [], timeline: [] }. It reproduces what the
// tables hold, including the UNIQUE key on an entry, so a missing upsert cannot pass
// locally and fail in production.

/** @returns {{nextId: number, sessions: object[], entries: object[], timeline: object[]}} */
function readDev () {
  const empty = { nextId: 1, sessions: [], entries: [], timeline: [] }
  try {
    if (!fs.existsSync(DEV_FILE)) { return empty }
    const parsed = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8'))
    return {
      nextId: Number(parsed.nextId) > 0 ? Number(parsed.nextId) : 1,
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      timeline: Array.isArray(parsed.timeline) ? parsed.timeline : []
    }
  } catch (err) {
    return empty
  }
}

/** @param {object} state @returns {void} */
function writeDev (state) {
  fs.mkdirSync(path.dirname(DEV_FILE), { recursive: true })
  fs.writeFileSync(DEV_FILE, JSON.stringify(state, null, 2), 'utf8')
}

/** ISO-ish local timestamp with milliseconds, matching DATETIME(3). */
function now () {
  return new Date().toISOString().replace('T', ' ').replace('Z', '')
}

// ── SQL, kept verbatim so the shape is readable beside the schema ────────────

const SQL_CREATE_SESSION =
  `INSERT INTO strategy_sessions
     (client_id, advisor_id, advisor_name, firm_id, scope_json, meeting_id)
   VALUES (?, ?, ?, ?, ?, ?)`

const SQL_GET_SESSION =
  `SELECT id, client_id, advisor_id, advisor_name, firm_id, scope_json, meeting_id,
          status, started_at, last_opened_at
     FROM strategy_sessions
    WHERE id = ? AND firm_id = ?`

// ⚠ `id DESC` IS THE TIE-BREAK AND IT IS NOT DECORATION. started_at is DATETIME —
// second precision — so two sessions opened in the same second have NO defined order
// without it, in MySQL exactly as in the fallback. Found by the round-trip test, which
// opened two sessions in the same millisecond and got them back in the wrong order.
const SQL_LIST_FOR_CLIENT =
  `SELECT id, client_id, advisor_id, advisor_name, firm_id, scope_json, meeting_id,
          status, started_at, last_opened_at
     FROM strategy_sessions
    WHERE firm_id = ? AND client_id = ?
    ORDER BY started_at DESC, id DESC
    LIMIT 200`

const SQL_SET_SCOPE =
  `UPDATE strategy_sessions
      SET scope_json = ?, last_opened_at = CURRENT_TIMESTAMP
    WHERE id = ? AND firm_id = ?`

// The UNIQUE key on (session_id, framework_id, field_key) makes this an upsert: a box is
// a live worksheet the advisor edits, so a save REPLACES what it holds.
const SQL_SAVE_ENTRY =
  `INSERT INTO strategy_session_entries
     (session_id, framework_id, field_key, value, source, original_text)
   VALUES (?, ?, ?, ?, ?, ?)
   ON DUPLICATE KEY UPDATE
     value = VALUES(value),
     source = VALUES(source),
     original_text = VALUES(original_text)`

const SQL_LOAD_ENTRIES =
  `SELECT e.framework_id, e.field_key, e.value, e.source, e.original_text, e.updated_at
     FROM strategy_session_entries e
     JOIN strategy_sessions s ON s.id = e.session_id
    WHERE e.session_id = ? AND s.firm_id = ?
    ORDER BY e.framework_id, e.field_key`

const SQL_OPEN_FIELD =
  `INSERT INTO strategy_session_timeline
     (session_id, framework_id, field_key, opened_at)
   VALUES (?, ?, ?, ?)`

const SQL_CLOSE_OPEN_FIELDS =
  `UPDATE strategy_session_timeline
      SET closed_at = ?
    WHERE session_id = ? AND closed_at IS NULL`

// `t.id` breaks the tie for the same reason as the session list: two fields opened in
// the same millisecond must still come back in the order they happened, because this is
// what a transcript is apportioned against.
const SQL_LOAD_TIMELINE =
  `SELECT t.framework_id, t.field_key, t.opened_at, t.closed_at
     FROM strategy_session_timeline t
     JOIN strategy_sessions s ON s.id = t.session_id
    WHERE t.session_id = ? AND s.firm_id = ?
    ORDER BY t.opened_at, t.id`

// ── the API ──────────────────────────────────────────────────────────────────

/**
 * Open a planning session for one client.
 *
 * @param {object} params
 * @param {string} params.clientId
 * @param {string} params.advisorId
 * @param {string} [params.advisorName] from the advisor's verified JWT; NULL until the
 *   token carries a name claim, exactly as `advisor_va_sessions` records it.
 * @param {string} params.firmId
 * @param {object} [params.scope] `{ domains: string[], frameworks: string[] }`
 * @param {string} [params.meetingId] set ONLY when Meeting Review is recording this
 *   session (Decision 10). The Planner never records anything itself.
 * @returns {Promise<number>} the new session id
 * @throws {Error} err.code 'BAD_INPUT'
 */
async function createSession (params) {
  const p = params || {}
  const clientId = requireId(p.clientId, 'client id')
  const advisorId = requireId(p.advisorId, 'advisor id')
  const firmId = requireId(p.firmId, 'firm id')
  const advisorName = p.advisorName
    ? String(p.advisorName).trim().slice(0, MAX_NAME)
    : null
  const meetingId = p.meetingId ? requireId(p.meetingId, 'meeting id') : null
  const scopeJson = encodeScope(p.scope)

  try {
    const [res] = await db.execute(SQL_CREATE_SESSION,
      [clientId, advisorId, advisorName, firmId, scopeJson, meetingId])
    return res.insertId
  } catch (err) {
    if (!devFallbackEnabled(err)) { throw err }
    const state = readDev()
    const id = state.nextId
    state.nextId = id + 1
    state.sessions.push({
      id,
      client_id: clientId,
      advisor_id: advisorId,
      advisor_name: advisorName,
      firm_id: firmId,
      scope_json: scopeJson,
      meeting_id: meetingId,
      status: 'open',
      started_at: now(),
      last_opened_at: now()
    })
    writeDev(state)
    return id
  }
}

/**
 * One session, or null. Scoped by firm: a session belonging to another firm reads as
 * absent rather than forbidden, so an id cannot be probed for existence.
 *
 * @param {number} sessionId
 * @param {string} firmId
 * @returns {Promise<object|null>}
 */
async function getSession (sessionId, firmId) {
  const id = requireSessionId(sessionId)
  const firm = requireId(firmId, 'firm id')
  try {
    const [rows] = await db.execute(SQL_GET_SESSION, [id, firm])
    return rows.length ? shapeSession(rows[0]) : null
  } catch (err) {
    if (!devFallbackEnabled(err)) { throw err }
    const row = readDev().sessions
      .find(s => s.id === id && s.firm_id === firm)
    return row ? shapeSession(row) : null
  }
}

/**
 * Every session this firm holds for one client, newest first. The decks carry tables
 * forward between sessions, so this is how the next session finds the last one.
 *
 * @param {string} clientId
 * @param {string} firmId
 * @returns {Promise<object[]>}
 */
async function listSessionsForClient (clientId, firmId) {
  const client = requireId(clientId, 'client id')
  const firm = requireId(firmId, 'firm id')
  try {
    const [rows] = await db.execute(SQL_LIST_FOR_CLIENT, [firm, client])
    return rows.map(shapeSession)
  } catch (err) {
    if (!devFallbackEnabled(err)) { throw err }
    return readDev().sessions
      .filter(s => s.firm_id === firm && s.client_id === client)
      // Same tie-break as SQL_LIST_FOR_CLIENT: a fallback that ordered differently
      // would let a bug pass locally and appear in production, or the reverse.
      .sort((a, b) =>
        String(b.started_at).localeCompare(String(a.started_at)) || (b.id - a.id))
      .map(shapeSession)
  }
}

/**
 * Record what screen 1 ticked.
 *
 * 🔴 A SCOPE SAVE NEVER ERASES THE AI'S SUGGESTION. The two are written by different
 * screens at different moments — the suggestion by the "Suggest for this client" button,
 * the ticks whenever the advisor changes one — and `scope_json` is replaced whole on every
 * save. Without this the first tick after a suggestion would delete the record of what was
 * proposed, which is exactly the half of Decision C(b) that makes the trail a trail. A
 * caller that means to replace the suggestion passes one; a caller that says nothing keeps
 * what is there.
 *
 * 🔴 AND IT NEVER ERASES THE ADVISOR'S PAGE EDITS, FOR THE SAME REASON (item 15.25). Every
 * tick, rename and drag saves the scope whole, and none of those screens carries the edits.
 * Without this, renaming a step would silently put every edited page back to the original.
 *
 * @param {number} sessionId
 * @param {string} firmId
 * @param {object} scope `{ domains: string[], frameworks: string[], steps?, suggestion?, edits? }`
 * @returns {Promise<boolean>} false when no such session belongs to this firm
 */
async function setScope (sessionId, firmId, scope) {
  const id = requireSessionId(sessionId)
  const firm = requireId(firmId, 'firm id')

  let toEncode = scope
  const isObject = scope && typeof scope === 'object' && !Array.isArray(scope)
  if (isObject && (isNil(scope.suggestion) || isNil(scope.edits))) {
    const existing = await getSession(id, firm)
    const stored = existing && existing.scope ? existing.scope : {}
    const keep = {}
    if (isNil(scope.suggestion) && stored.suggestion) { keep.suggestion = stored.suggestion }
    if (isNil(scope.edits) && stored.edits) { keep.edits = stored.edits }
    toEncode = Object.assign({}, scope, keep)
  }

  const scopeJson = encodeScope(toEncode)
  try {
    const [res] = await db.execute(SQL_SET_SCOPE, [scopeJson, id, firm])
    return res.affectedRows > 0
  } catch (err) {
    if (!devFallbackEnabled(err)) { throw err }
    const state = readDev()
    const row = state.sessions.find(s => s.id === id && s.firm_id === firm)
    if (!row) { return false }
    row.scope_json = scopeJson
    row.last_opened_at = now()
    writeDev(state)
    return true
  }
}

/**
 * Record what the AI proposed, leaving the advisor's ticks exactly as they are.
 *
 * The mirror image of `setScope`: that one keeps the suggestion while the ticks change,
 * this one keeps the ticks while the suggestion changes. Decision C(a) — the saved scope
 * follows the ticks and never the suggestion — is why this function cannot write
 * `frameworks`, and a build where it does has broken the ruling.
 *
 * @param {number} sessionId
 * @param {string} firmId
 * @param {{at: string, concepts: Array<{id: string, reason: string}>}} suggestion
 * @returns {Promise<boolean>} false when no such session belongs to this firm
 */
async function saveSuggestion (sessionId, firmId, suggestion) {
  const id = requireSessionId(sessionId)
  const firm = requireId(firmId, 'firm id')

  const existing = await getSession(id, firm)
  if (!existing) { return false }

  return setScope(id, firm, {
    domains: existing.scope.domains,
    frameworks: existing.scope.frameworks,
    steps: existing.scope.steps,
    suggestion
  })
}

/**
 * Save the advisor's wording for one block of one concept page, or put it back to the
 * original. Item 15.25; approved to build by Mike 2026-09-25 from
 * `design/mockups/strategy-edit-text-test.html`.
 *
 * 🔴 THE SERVER DOES NOT JUDGE WHETHER THE WORDS FIT THE PAGE, AND CANNOT. Mike ruled the
 * same day that an edit which does not fit is not saved; that is measured in the browser,
 * against the drawing's own shapes, before this is ever called. What this enforces is the
 * shape and the ceiling — a page, a block, a bounded string — and that the session is this
 * firm's.
 *
 * ⚠ `text` null, empty, or identical to nothing stored all mean the same: no edit. "Put back
 * the original" removes the entry rather than storing the original's words, so a drawing
 * corrected later shows its correction instead of an old copy.
 *
 * @param {object} params
 * @param {number} params.sessionId
 * @param {string} params.firmId
 * @param {string} params.sheetKey `<conceptId>#<sheet>`
 * @param {string} params.blockKey the block's name on that page
 * @param {string|null} params.text the advisor's words, or null to put back the original
 * @returns {Promise<boolean>} false when no such session belongs to this firm
 * @throws {Error} err.code 'BAD_INPUT'
 */
async function saveTextEdit (params) {
  const p = params || {}
  const id = requireSessionId(p.sessionId)
  const firm = requireId(p.firmId, 'firm id')
  if (!SHEET_KEY.test(String(p.sheetKey || ''))) { throw fail('BAD_INPUT', 'The page is not named correctly.') }
  if (!BLOCK_KEY.test(String(p.blockKey || ''))) { throw fail('BAD_INPUT', 'The block is not named correctly.') }
  const text = isNil(p.text) ? '' : p.text
  if (typeof text !== 'string') { throw fail('BAD_INPUT', 'The edited text must be text.') }
  if (text.length > MAX_EDIT) { throw fail('BAD_INPUT', 'The edited text is too long.') }

  const existing = await getSession(id, firm)
  if (!existing) { return false }

  const edits = JSON.parse(JSON.stringify(existing.scope.edits || {}))
  const sheet = edits[p.sheetKey] || {}
  if (text.trim()) {
    if (!sheet[p.blockKey] && Object.keys(sheet).length >= MAX_EDITS_PER_SHEET) {
      throw fail('BAD_INPUT', 'This page has too many edits.')
    }
    sheet[p.blockKey] = text
  } else {
    delete sheet[p.blockKey]
  }
  if (Object.keys(sheet).length) { edits[p.sheetKey] = sheet } else { delete edits[p.sheetKey] }

  return setScope(id, firm, {
    domains: existing.scope.domains,
    frameworks: existing.scope.frameworks,
    steps: existing.scope.steps,
    suggestion: existing.scope.suggestion,
    edits
  })
}

/**
 * Save one capture box. A save REPLACES what that box holds — it is a live worksheet an
 * advisor edits in the room, not an append-only log.
 *
 * 🔴 `originalText` IS THE AUDIT TRAIL, NOT A CONVENIENCE. When `source` is 'transcript'
 * the AI has tidied a spoken passage into the sentence an advisor would have typed, and
 * the raw passage belongs beside it: Original Value | AI Suggestion | Final Approved
 * Value. Saving the tidy version alone destroys the advisor's ability to see what was
 * actually said.
 *
 * @param {object} params
 * @param {number} params.sessionId
 * @param {string} params.firmId
 * @param {string} params.frameworkId id in the domain support file
 * @param {string} params.fieldKey which box within that framework
 * @param {string} params.value what the box now holds
 * @param {'typed'|'transcript'} [params.source] defaults to 'typed'
 * @param {string} [params.originalText] the raw spoken passage, when source is transcript
 * @returns {Promise<boolean>} false when no such session belongs to this firm
 * @throws {Error} err.code 'BAD_INPUT'
 */
async function saveEntry (params) {
  const p = params || {}
  const id = requireSessionId(p.sessionId)
  const firm = requireId(p.firmId, 'firm id')
  const frameworkId = requireId(p.frameworkId, 'framework id', MAX_KEY)
  const fieldKey = requireId(p.fieldKey, 'field key', MAX_KEY)
  const source = isNil(p.source) ? 'typed' : String(p.source)
  if (!SOURCES.includes(source)) {
    throw fail('BAD_INPUT', 'The entry source is not recognised.')
  }
  const value = isNil(p.value) ? null : String(p.value).slice(0, MAX_VALUE)
  const originalText = isNil(p.originalText)
    ? null
    : String(p.originalText).slice(0, MAX_VALUE)
  if (source === 'transcript' && !originalText) {
    throw fail('BAD_INPUT',
      'A transcript entry must carry the original spoken passage.')
  }

  // The firm check is a separate read rather than a join, because ON DUPLICATE KEY
  // UPDATE cannot carry one. Without it an entry could be written against another
  // firm's session by id alone.
  const session = await getSession(id, firm)
  if (!session) { return false }

  try {
    await db.execute(SQL_SAVE_ENTRY,
      [id, frameworkId, fieldKey, value, source, originalText])
    return true
  } catch (err) {
    if (!devFallbackEnabled(err)) { throw err }
    const state = readDev()
    const found = state.entries.find(e =>
      e.session_id === id && e.framework_id === frameworkId && e.field_key === fieldKey)
    if (found) {
      found.value = value
      found.source = source
      found.original_text = originalText
      found.updated_at = now()
    } else {
      state.entries.push({
        session_id: id,
        framework_id: frameworkId,
        field_key: fieldKey,
        value,
        source,
        original_text: originalText,
        updated_at: now()
      })
    }
    writeDev(state)
    return true
  }
}

/**
 * Everything captured in one session.
 * @param {number} sessionId
 * @param {string} firmId
 * @returns {Promise<object[]>}
 */
async function loadEntries (sessionId, firmId) {
  const id = requireSessionId(sessionId)
  const firm = requireId(firmId, 'firm id')
  try {
    const [rows] = await db.execute(SQL_LOAD_ENTRIES, [id, firm])
    return rows.map(shapeEntry)
  } catch (err) {
    if (!devFallbackEnabled(err)) { throw err }
    const state = readDev()
    const owned = state.sessions.some(s => s.id === id && s.firm_id === firm)
    if (!owned) { return [] }
    return state.entries
      .filter(e => e.session_id === id)
      .sort((a, b) =>
        String(a.framework_id).localeCompare(String(b.framework_id)) ||
        String(a.field_key).localeCompare(String(b.field_key)))
      .map(shapeEntry)
  }
}

/**
 * The advisor moved to a box. Closes whatever was open first, so the timeline never holds
 * two open fields at once — a passage of speech belongs to exactly one box.
 *
 * 🔴 THIS IS DECISION 11'S MECHANISM. Skip it and the only way left to apportion a
 * transcript is to ask a model where each passage belongs, which that ruling forbids.
 *
 * @param {object} params
 * @param {number} params.sessionId
 * @param {string} params.firmId
 * @param {string} params.frameworkId
 * @param {string} params.fieldKey
 * @param {string} [params.at] millisecond timestamp; defaults to now
 * @returns {Promise<boolean>} false when no such session belongs to this firm
 */
async function openField (params) {
  const p = params || {}
  const id = requireSessionId(p.sessionId)
  const firm = requireId(p.firmId, 'firm id')
  const frameworkId = requireId(p.frameworkId, 'framework id', MAX_KEY)
  const fieldKey = requireId(p.fieldKey, 'field key', MAX_KEY)
  const at = p.at ? String(p.at) : now()

  const session = await getSession(id, firm)
  if (!session) { return false }

  try {
    await db.execute(SQL_CLOSE_OPEN_FIELDS, [at, id])
    await db.execute(SQL_OPEN_FIELD, [id, frameworkId, fieldKey, at])
    return true
  } catch (err) {
    if (!devFallbackEnabled(err)) { throw err }
    const state = readDev()
    state.timeline.forEach((t) => {
      if (t.session_id === id && isNil(t.closed_at)) { t.closed_at = at }
    })
    state.timeline.push({
      session_id: id,
      framework_id: frameworkId,
      field_key: fieldKey,
      opened_at: at,
      closed_at: null
    })
    writeDev(state)
    return true
  }
}

/**
 * Close whatever field is open — the advisor left the session or finished.
 * @param {number} sessionId
 * @param {string} firmId
 * @param {string} [at] millisecond timestamp; defaults to now
 * @returns {Promise<boolean>} false when no such session belongs to this firm
 */
async function closeOpenField (sessionId, firmId, at) {
  const id = requireSessionId(sessionId)
  const firm = requireId(firmId, 'firm id')
  const when = at ? String(at) : now()

  const session = await getSession(id, firm)
  if (!session) { return false }

  try {
    await db.execute(SQL_CLOSE_OPEN_FIELDS, [when, id])
    return true
  } catch (err) {
    if (!devFallbackEnabled(err)) { throw err }
    const state = readDev()
    state.timeline.forEach((t) => {
      if (t.session_id === id && isNil(t.closed_at)) { t.closed_at = when }
    })
    writeDev(state)
    return true
  }
}

/**
 * Which box was open, and when, oldest first. What a transcript is apportioned against.
 * @param {number} sessionId
 * @param {string} firmId
 * @returns {Promise<object[]>}
 */
async function loadTimeline (sessionId, firmId) {
  const id = requireSessionId(sessionId)
  const firm = requireId(firmId, 'firm id')
  try {
    const [rows] = await db.execute(SQL_LOAD_TIMELINE, [id, firm])
    return rows.map(shapeTimeline)
  } catch (err) {
    if (!devFallbackEnabled(err)) { throw err }
    const state = readDev()
    const owned = state.sessions.some(s => s.id === id && s.firm_id === firm)
    if (!owned) { return [] }
    return state.timeline
      .filter(t => t.session_id === id)
      // Array.prototype.sort is stable from Node 11, so a tie on opened_at keeps
      // insertion order — which is the fallback's equivalent of SQL_LOAD_TIMELINE's
      // `, t.id`. Do not "optimise" this into an unstable sort.
      .sort((a, b) => String(a.opened_at).localeCompare(String(b.opened_at)))
      .map(shapeTimeline)
  }
}

// ── row shaping, so MySQL and the fallback return the same thing ─────────────

/** @param {object} row @returns {object} */
function shapeSession (row) {
  return {
    id: Number(row.id),
    clientId: row.client_id,
    advisorId: row.advisor_id,
    advisorName: row.advisor_name || null,
    firmId: row.firm_id,
    scope: decodeScope(row.scope_json),
    meetingId: row.meeting_id || null,
    status: row.status,
    startedAt: row.started_at,
    lastOpenedAt: row.last_opened_at
  }
}

/** @param {object} row @returns {object} */
function shapeEntry (row) {
  return {
    frameworkId: row.framework_id,
    fieldKey: row.field_key,
    value: isNil(row.value) ? '' : row.value,
    source: row.source,
    originalText: row.original_text || null,
    updatedAt: row.updated_at
  }
}

/** @param {object} row @returns {object} */
function shapeTimeline (row) {
  return {
    frameworkId: row.framework_id,
    fieldKey: row.field_key,
    openedAt: row.opened_at,
    closedAt: row.closed_at || null
  }
}

module.exports = {
  createSession,
  getSession,
  listSessionsForClient,
  setScope,
  saveSuggestion,
  saveTextEdit,
  saveEntry,
  loadEntries,
  openField,
  closeOpenField,
  loadTimeline,
  // exported for tests only
  DEV_FILE
}
