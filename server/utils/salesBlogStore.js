'use strict'

/**
 * salesBlogStore — the blog tool's three tables (item 17 stage 5).
 *
 *   va_sales_blog_input      the brief an advisor fills in before generating
 *   va_sales_blog_post       a generated post, draft or final
 *   va_sales_blog_reference  source material the advisor supplies to write from
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE ACCESS MODEL IS THE PIPELINE'S AND THE COI'S — WITH ONE DIFFERENCE
 * ─────────────────────────────────────────────────────────────────────────────
 * Every row here is the advisor's OWN, and there is no `visibility` column on
 * any of the three tables. That is not an omission: the source app scopes all
 * three by `userId` alone, and a half-written draft is not something a colleague
 * has any reason to read. Reads and writes are both `advisor_id = ? AND
 * firm_id = ?`.
 *
 * `firm_id` is in every WHERE clause even though ids are UUIDs, for the reason
 * `salesCoiStore` gives: a guessed id from another tenant must MISS, not merely
 * be unlikely.
 *
 * ⚠ `outline_text` and `final_text` ARE MODEL OUTPUT. They are stored as the
 * model produced them and are untrusted on the way OUT as well as in — the
 * screen sanitises before any `v-html`, per `CLAUDE.md`. This file does not
 * sanitise them, because a store that silently rewrites what it was given makes
 * the stored text disagree with what the advisor approved.
 */

const path = require('path')
const fs = require('fs')
const db = require('./db')
const { generateId } = require('./caseStore')
const { devFallbackAllowed } = require('./dbFailure')

const DEV_FILE = process.env.SALES_BLOG_DEV_FILE
  ? path.resolve(process.env.SALES_BLOG_DEV_FILE)
  : path.resolve(__dirname, '../../data/dev-sales-blog.json')

function devFallbackEnabled (err) {
  return devFallbackAllowed(err)
}

const KINDS = ['draft', 'final']

/** Fail-safe to 'draft': an unrecognised kind must never publish as final. */
function normaliseKind (k) {
  return !KINDS.includes(k) ? 'draft' : k
}

const REFERENCE_TYPES = ['document', 'url']

/** Fail-safe to 'document': an unrecognised type must not be treated as a URL. */
function normaliseReferenceType (t) {
  return !REFERENCE_TYPES.includes(t) ? 'document' : t
}

/**
 * Every business column per table, as [jsName, sqlName, kind] — one list driving
 * the row mapper, the insert and the update, for the reason the pipeline has
 * one: three hand-maintained copies is three chances to drop a field.
 *
 *   text  — string or null, truncated to its column width
 *   long  — LONGTEXT; not truncated, because it holds an article
 *   json  — a small authored structure, stored as JSON
 *   bool  — TINYINT(1) in MySQL, boolean in JavaScript
 */
const INPUT_COLUMNS = [
  ['signature', 'signature', 'text'],
  ['topic', 'topic', 'text'],
  ['audience', 'audience', 'text'],
  ['objective', 'objective', 'text'],
  ['tone', 'tone', 'text'],
  ['length', 'length', 'text'],
  ['cta', 'cta', 'text'],
  ['principles', 'principles_json', 'json'],
  ['selectedPerson', 'selected_person', 'text'],
  ['targetMode', 'target_mode', 'text'],
  ['styleStrength', 'style_strength', 'text'],
  ['styleTitles', 'style_titles_json', 'json'],
  ['lengthRanges', 'length_ranges_json', 'json'],
  ['styleThresholds', 'style_thresholds_json', 'json']
]

const POST_COLUMNS = [
  ['kind', 'kind', 'text'],
  ['title', 'title', 'text'],
  ['topic', 'topic', 'text'],
  ['audience', 'audience', 'text'],
  ['objective', 'objective', 'text'],
  ['tone', 'tone', 'text'],
  ['length', 'length', 'text'],
  ['cta', 'cta', 'text'],
  ['selectedPerson', 'selected_person', 'text'],
  ['targetMode', 'target_mode', 'text'],
  ['outlineText', 'outline_text', 'long'],
  ['finalText', 'final_text', 'long'],
  ['isPinned', 'is_pinned', 'bool'],
  ['metadata', 'metadata_json', 'json']
]

const REFERENCE_COLUMNS = [
  ['title', 'title', 'text'],
  ['type', 'type', 'text'],
  ['content', 'content', 'long'],
  ['url', 'url', 'text'],
  ['topic', 'topic', 'text']
]

/** Column widths, matching config/db-migration-sales-tracker.sql exactly. */
const TEXT_LIMITS = {
  signature: 191,
  topic: 255,
  audience: 255,
  objective: 255,
  tone: 80,
  length: 80,
  cta: 255,
  selectedPerson: 255,
  targetMode: 120,
  styleStrength: 40,
  kind: 20,
  title: 255,
  type: 50,
  url: 500
}

/** A DB row → the shape the screen reads. */
function rowToEntry (row, columns) {
  const out = {
    id: row.id,
    advisorId: row.advisor_id,
    firmId: row.firm_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
  columns.forEach(([js, sql, kind]) => {
    const v = row[sql]
    if (kind === 'bool') {
      out[js] = Boolean(Number(v || 0))
    } else if (kind === 'json') {
      // mysql2 parses a JSON column for us; a dev-file row is already an object.
      // A string can still arrive from an older driver, so parse defensively —
      // a malformed value becomes null rather than throwing on the way out.
      if (typeof v === 'string') {
        try { out[js] = JSON.parse(v) } catch (e) { out[js] = null }
      } else {
        out[js] = v === undefined ? null : v
      }
    } else {
      out[js] = v === undefined ? null : v
    }
  })
  return out
}

/** A caller-supplied value → what goes in the statement. */
function toColumn (kind, value, js) {
  if (kind === 'bool') {
    return value ? 1 : 0
  }
  if (kind === 'json') {
    if (value === null || value === undefined) { return null }
    return JSON.stringify(value)
  }
  if (value === null || value === undefined || value === '') { return null }
  const s = String(value)
  if (kind === 'long') { return s }
  const limit = TEXT_LIMITS[js]
  return limit ? s.slice(0, limit) : s
}

/** The columns a table's INSERT and UPDATE share, built once per table. */
function buildInsert (table, columns, id, advisorId, firmId, input) {
  const cols = ['id', 'advisor_id', 'firm_id']
  const vals = [id, advisorId, firmId]
  columns.forEach(([js, sql, kind]) => {
    cols.push(sql)
    vals.push(toColumn(kind, input[js], js))
  })
  return {
    sql: `INSERT INTO ${table} (${cols.map(c => '`' + c + '`').join(', ')})
        VALUES (${cols.map(() => '?').join(', ')})`,
    vals
  }
}

/** The SET clause for a partial update; empty when the patch touches nothing. */
function buildSets (columns, patch) {
  const sets = []
  const vals = []
  columns.forEach(([js, sql, kind]) => {
    if (Object.prototype.hasOwnProperty.call(patch, js) && patch[js] !== undefined) {
      sets.push('`' + sql + '` = ?')
      vals.push(toColumn(kind, patch[js], js))
    }
  })
  return { sets, vals }
}

function requireIdentity (advisorId, firmId) {
  if (!advisorId || !firmId) { throw new Error('advisorId and firmId are required') }
}

// ── INPUTS ───────────────────────────────────────────────────────────────────

/**
 * The briefs this advisor has saved, most recently updated first.
 * @param {string} advisorId - from the verified JWT, never the request body
 * @param {string} firmId - from the verified JWT, never the request body
 * @returns {Promise<object[]>}
 */
async function listInputs (advisorId, firmId) {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM va_sales_blog_input
        WHERE advisor_id = ? AND firm_id = ?
        ORDER BY updated_at DESC
        LIMIT 120`,
      [advisorId, firmId]
    )
    return rows.map(r => rowToEntry(r, INPUT_COLUMNS))
  } catch (err) {
    if (devFallbackEnabled(err)) { return _devList('inputs', advisorId, firmId, 120) }
    throw err
  }
}

/**
 * ONE brief belonging to the caller.
 * @param {string} id
 * @param {string} advisorId - from the verified JWT
 * @param {string} firmId - from the verified JWT
 * @returns {Promise<object|null>}
 */
async function getInput (id, advisorId, firmId) {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM va_sales_blog_input
        WHERE id = ? AND advisor_id = ? AND firm_id = ? LIMIT 1`,
      [id, advisorId, firmId]
    )
    return rows.length ? rowToEntry(rows[0], INPUT_COLUMNS) : null
  } catch (err) {
    if (devFallbackEnabled(err)) { return _devGet('inputs', id, advisorId, firmId) }
    throw err
  }
}

/**
 * Save a brief, replacing the caller's previous one with the same `signature`.
 *
 * 🔴 THE SIGNATURE IS SCOPED TO THE ADVISOR, NOT THE FIRM. It is the source
 * app's own de-duplication key — "have I asked for this before?" — and two
 * advisors in one firm writing about the same topic must not overwrite each
 * other. The source matches on `{ signature, userId }` and this matches on
 * `{ signature, advisor_id, firm_id }`, which is the same rule with tenancy
 * added.
 *
 * @param {object} input - { advisorId, firmId, signature, ...brief fields }
 * @returns {Promise<object>} the stored brief
 */
async function saveInput (input) {
  const advisorId = String(input.advisorId || '').slice(0, 64)
  const firmId = String(input.firmId || '').slice(0, 64)
  requireIdentity(advisorId, firmId)
  const signature = String(input.signature || '').slice(0, 191)
  if (!signature) { throw new Error('signature is required') }

  try {
    const [rows] = await db.execute(
      `SELECT id FROM va_sales_blog_input
        WHERE signature = ? AND advisor_id = ? AND firm_id = ?
        ORDER BY updated_at DESC LIMIT 1`,
      [signature, advisorId, firmId]
    )

    if (rows.length) {
      const existingId = rows[0].id
      const { sets, vals } = buildSets(INPUT_COLUMNS, input)
      if (sets.length) {
        await db.execute(
          `UPDATE va_sales_blog_input SET ${sets.join(', ')}
            WHERE id = ? AND advisor_id = ? AND firm_id = ?`,
          vals.concat([existingId, advisorId, firmId])
        )
      }
      return getInput(existingId, advisorId, firmId)
    }

    const id = generateId()
    const { sql, vals } = buildInsert(
      'va_sales_blog_input', INPUT_COLUMNS, id, advisorId, firmId,
      Object.assign({}, input, { signature })
    )
    await db.execute(sql, vals)
    const saved = await getInput(id, advisorId, firmId)
    if (saved) { return saved }
    throw new Error('Blog input could not be read back after insert')
  } catch (err) {
    if (devFallbackEnabled(err)) { return _devSaveInput(advisorId, firmId, input, signature) }
    throw err
  }
}

/**
 * Delete a brief the caller owns.
 * @param {string} id
 * @param {string} advisorId - from the verified JWT
 * @param {string} firmId - from the verified JWT
 * @returns {Promise<boolean>} true if a row was deleted
 */
async function removeInput (id, advisorId, firmId) {
  try {
    const [res] = await db.execute(
      'DELETE FROM va_sales_blog_input WHERE id = ? AND advisor_id = ? AND firm_id = ?',
      [id, advisorId, firmId]
    )
    return res.affectedRows > 0
  } catch (err) {
    if (devFallbackEnabled(err)) { return _devRemove('inputs', id, advisorId, firmId) }
    throw err
  }
}

// ── POSTS ────────────────────────────────────────────────────────────────────

/**
 * The caller's posts of one kind. Pinned first, then most recently updated.
 *
 * `search` matches title, topic or the named person, and is passed as a bound
 * parameter — never concatenated into the SQL.
 *
 * @param {string} advisorId - from the verified JWT
 * @param {string} firmId - from the verified JWT
 * @param {object} [opts]
 * @param {string} [opts.kind] - 'draft' (default) or 'final'
 * @param {string} [opts.search] - free text; empty means no filter
 * @param {boolean} [opts.pinnedOnly] - true returns only pinned posts
 * @returns {Promise<object[]>}
 */
async function listPosts (advisorId, firmId, opts) {
  const o = opts || {}
  const kind = normaliseKind(o.kind)
  const search = String(o.search || '').trim()
  const pinnedOnly = o.pinnedOnly === true

  const where = ['advisor_id = ?', 'firm_id = ?', 'kind = ?']
  const vals = [advisorId, firmId, kind]
  if (pinnedOnly) { where.push('is_pinned = 1') }
  if (search) {
    where.push('(title LIKE ? OR topic LIKE ? OR selected_person LIKE ?)')
    // The wildcards are added to the VALUE, so the pattern is still bound.
    // LIKE metacharacters in the advisor's own search text are escaped, or a
    // literal % would silently match everything.
    const like = '%' + search.replace(/[\\%_]/g, c => '\\' + c) + '%'
    vals.push(like, like, like)
  }

  try {
    const [rows] = await db.execute(
      `SELECT * FROM va_sales_blog_post
        WHERE ${where.join(' AND ')}
        ORDER BY is_pinned DESC, updated_at DESC
        LIMIT 500`,
      vals
    )
    return rows.map(r => rowToEntry(r, POST_COLUMNS))
  } catch (err) {
    if (devFallbackEnabled(err)) {
      return _devListPosts(advisorId, firmId, kind, search, pinnedOnly)
    }
    throw err
  }
}

/**
 * ONE post belonging to the caller.
 * @param {string} id
 * @param {string} advisorId - from the verified JWT
 * @param {string} firmId - from the verified JWT
 * @returns {Promise<object|null>}
 */
async function getPost (id, advisorId, firmId) {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM va_sales_blog_post
        WHERE id = ? AND advisor_id = ? AND firm_id = ? LIMIT 1`,
      [id, advisorId, firmId]
    )
    return rows.length ? rowToEntry(rows[0], POST_COLUMNS) : null
  } catch (err) {
    if (devFallbackEnabled(err)) { return _devGet('posts', id, advisorId, firmId) }
    throw err
  }
}

/**
 * Store a generated post.
 * @param {object} input - { advisorId, firmId, kind, title, outlineText, ... }
 * @returns {Promise<object>} the stored post
 */
async function createPost (input) {
  const advisorId = String(input.advisorId || '').slice(0, 64)
  const firmId = String(input.firmId || '').slice(0, 64)
  requireIdentity(advisorId, firmId)

  const id = generateId()
  const payload = Object.assign({}, input, {
    kind: normaliseKind(input.kind),
    isPinned: input.isPinned === true
  })
  const { sql, vals } = buildInsert(
    'va_sales_blog_post', POST_COLUMNS, id, advisorId, firmId, payload
  )

  try {
    await db.execute(sql, vals)
    const saved = await getPost(id, advisorId, firmId)
    if (saved) { return saved }
    throw new Error('Blog post could not be read back after insert')
  } catch (err) {
    if (devFallbackEnabled(err)) { return _devCreate('posts', id, advisorId, firmId, payload, POST_COLUMNS) }
    throw err
  }
}

/**
 * Change a post the caller owns — pin it, retitle it, or replace its text.
 * Returns null when nothing matched, which the route reports as 404: it never
 * distinguishes "no such row" from "not yours", because that difference is
 * itself a disclosure.
 * @param {string} id
 * @param {string} advisorId - from the verified JWT
 * @param {string} firmId - from the verified JWT
 * @param {object} patch - any subset of { isPinned, title, outlineText, finalText }
 * @returns {Promise<object|null>}
 */
async function updatePost (id, advisorId, firmId, patch) {
  const { sets, vals } = buildSets(POST_COLUMNS, patch)
  if (!sets.length) { return getPost(id, advisorId, firmId) }

  try {
    const [res] = await db.execute(
      `UPDATE va_sales_blog_post SET ${sets.join(', ')}
        WHERE id = ? AND advisor_id = ? AND firm_id = ?`,
      vals.concat([id, advisorId, firmId])
    )
    if (!res.affectedRows) { return null }
    return getPost(id, advisorId, firmId)
  } catch (err) {
    if (devFallbackEnabled(err)) { return _devUpdate('posts', id, advisorId, firmId, patch, POST_COLUMNS) }
    throw err
  }
}

/**
 * Delete a post the caller owns.
 * @param {string} id
 * @param {string} advisorId - from the verified JWT
 * @param {string} firmId - from the verified JWT
 * @returns {Promise<boolean>} true if a row was deleted
 */
async function removePost (id, advisorId, firmId) {
  try {
    const [res] = await db.execute(
      'DELETE FROM va_sales_blog_post WHERE id = ? AND advisor_id = ? AND firm_id = ?',
      [id, advisorId, firmId]
    )
    return res.affectedRows > 0
  } catch (err) {
    if (devFallbackEnabled(err)) { return _devRemove('posts', id, advisorId, firmId) }
    throw err
  }
}

// ── REFERENCES ───────────────────────────────────────────────────────────────

/**
 * The caller's source material, optionally narrowed to one topic.
 * @param {string} advisorId - from the verified JWT
 * @param {string} firmId - from the verified JWT
 * @param {string} [topic] - exact topic match; empty returns all
 * @returns {Promise<object[]>}
 */
async function listReferences (advisorId, firmId, topic) {
  const where = ['advisor_id = ?', 'firm_id = ?']
  const vals = [advisorId, firmId]
  const t = String(topic || '').trim()
  if (t) { where.push('topic = ?'); vals.push(t) }

  try {
    const [rows] = await db.execute(
      `SELECT * FROM va_sales_blog_reference
        WHERE ${where.join(' AND ')}
        ORDER BY updated_at DESC
        LIMIT 200`,
      vals
    )
    return rows.map(r => rowToEntry(r, REFERENCE_COLUMNS))
  } catch (err) {
    if (devFallbackEnabled(err)) { return _devListReferences(advisorId, firmId, t) }
    throw err
  }
}

/**
 * ONE reference belonging to the caller.
 * @param {string} id
 * @param {string} advisorId - from the verified JWT
 * @param {string} firmId - from the verified JWT
 * @returns {Promise<object|null>}
 */
async function getReference (id, advisorId, firmId) {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM va_sales_blog_reference
        WHERE id = ? AND advisor_id = ? AND firm_id = ? LIMIT 1`,
      [id, advisorId, firmId]
    )
    return rows.length ? rowToEntry(rows[0], REFERENCE_COLUMNS) : null
  } catch (err) {
    if (devFallbackEnabled(err)) { return _devGet('references', id, advisorId, firmId) }
    throw err
  }
}

/**
 * Store source material the advisor supplies.
 *
 * ⚠ `content` REACHES A PROMPT. It is stored verbatim here and wrapped in
 * explicit delimiters by `salesBlogEngine` on the way to the model — never
 * concatenated. See that file's note.
 *
 * @param {object} input - { advisorId, firmId, title, type, content?, url?, topic? }
 * @returns {Promise<object>} the stored reference
 */
async function createReference (input) {
  const advisorId = String(input.advisorId || '').slice(0, 64)
  const firmId = String(input.firmId || '').slice(0, 64)
  requireIdentity(advisorId, firmId)

  const id = generateId()
  const payload = Object.assign({}, input, { type: normaliseReferenceType(input.type) })
  const { sql, vals } = buildInsert(
    'va_sales_blog_reference', REFERENCE_COLUMNS, id, advisorId, firmId, payload
  )

  try {
    await db.execute(sql, vals)
    const saved = await getReference(id, advisorId, firmId)
    if (saved) { return saved }
    throw new Error('Blog reference could not be read back after insert')
  } catch (err) {
    if (devFallbackEnabled(err)) {
      return _devCreate('references', id, advisorId, firmId, payload, REFERENCE_COLUMNS)
    }
    throw err
  }
}

/**
 * Delete a reference the caller owns.
 * @param {string} id
 * @param {string} advisorId - from the verified JWT
 * @param {string} firmId - from the verified JWT
 * @returns {Promise<boolean>} true if a row was deleted
 */
async function removeReference (id, advisorId, firmId) {
  try {
    const [res] = await db.execute(
      'DELETE FROM va_sales_blog_reference WHERE id = ? AND advisor_id = ? AND firm_id = ?',
      [id, advisorId, firmId]
    )
    return res.affectedRows > 0
  } catch (err) {
    if (devFallbackEnabled(err)) { return _devRemove('references', id, advisorId, firmId) }
    throw err
  }
}

// ── DEV/TEST fallback ────────────────────────────────────────────────────────
//
// One file holds all three collections, keyed by name, so a dev machine has one
// file to inspect rather than three.

function _devReadAll () {
  try {
    const parsed = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8'))
    return {
      inputs: parsed.inputs || [],
      posts: parsed.posts || [],
      references: parsed.references || []
    }
  } catch (e) {
    return { inputs: [], posts: [], references: [] }
  }
}

function _devWriteAll (all) {
  fs.writeFileSync(DEV_FILE, JSON.stringify(all, null, 2))
}

/** The same rule as the SQL: the caller's own rows, in their own firm. */
function _devOwn (e, advisorId, firmId) {
  return e.advisorId === advisorId && e.firmId === firmId
}

function _devSort (list) {
  return list.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
}

function _devList (name, advisorId, firmId, limit) {
  return _devSort(_devReadAll()[name].filter(e => _devOwn(e, advisorId, firmId))).slice(0, limit)
}

function _devGet (name, id, advisorId, firmId) {
  return _devReadAll()[name].find(e => e.id === id && _devOwn(e, advisorId, firmId)) || null
}

function _devEntryFrom (id, advisorId, firmId, input, columns) {
  const now = new Date().toISOString()
  const entry = { id, advisorId, firmId, createdAt: now, updatedAt: now }
  columns.forEach(([js, , kind]) => {
    if (kind === 'bool') {
      entry[js] = input[js] === true
    } else if (kind === 'json') {
      entry[js] = input[js] === undefined ? null : input[js]
    } else {
      const v = toColumn(kind, input[js], js)
      entry[js] = v
    }
  })
  return entry
}

function _devCreate (name, id, advisorId, firmId, input, columns) {
  const all = _devReadAll()
  const entry = _devEntryFrom(id, advisorId, firmId, input, columns)
  all[name].push(entry)
  _devWriteAll(all)
  return entry
}

function _devUpdate (name, id, advisorId, firmId, patch, columns) {
  const all = _devReadAll()
  const i = all[name].findIndex(e => e.id === id && _devOwn(e, advisorId, firmId))
  if (i === -1) { return null }
  columns.forEach(([js, , kind]) => {
    if (Object.prototype.hasOwnProperty.call(patch, js) && patch[js] !== undefined) {
      if (kind === 'bool') {
        all[name][i][js] = patch[js] === true
      } else if (kind === 'json') {
        all[name][i][js] = patch[js]
      } else {
        all[name][i][js] = toColumn(kind, patch[js], js)
      }
    }
  })
  all[name][i].updatedAt = new Date().toISOString()
  _devWriteAll(all)
  return all[name][i]
}

function _devRemove (name, id, advisorId, firmId) {
  const all = _devReadAll()
  const i = all[name].findIndex(e => e.id === id && _devOwn(e, advisorId, firmId))
  if (i === -1) { return false }
  all[name].splice(i, 1)
  _devWriteAll(all)
  return true
}

function _devSaveInput (advisorId, firmId, input, signature) {
  const all = _devReadAll()
  const i = all.inputs.findIndex(
    e => e.signature === signature && _devOwn(e, advisorId, firmId)
  )
  if (i === -1) {
    return _devCreate(
      'inputs', generateId(), advisorId, firmId,
      Object.assign({}, input, { signature }), INPUT_COLUMNS
    )
  }
  return _devUpdate('inputs', all.inputs[i].id, advisorId, firmId, input, INPUT_COLUMNS)
}

function _devListPosts (advisorId, firmId, kind, search, pinnedOnly) {
  const needle = search.toLowerCase()
  const matches = e => !needle ||
    String(e.title || '').toLowerCase().includes(needle) ||
    String(e.topic || '').toLowerCase().includes(needle) ||
    String(e.selectedPerson || '').toLowerCase().includes(needle)

  return _devReadAll().posts
    .filter(e => _devOwn(e, advisorId, firmId) && e.kind === kind)
    .filter(e => !pinnedOnly || e.isPinned === true)
    .filter(matches)
    // Pinned first, then most recent — the ORDER BY, in the same order.
    .sort((a, b) => {
      const pin = Number(b.isPinned === true) - Number(a.isPinned === true)
      return pin !== 0 ? pin : String(b.updatedAt).localeCompare(String(a.updatedAt))
    })
    .slice(0, 500)
}

function _devListReferences (advisorId, firmId, topic) {
  return _devSort(
    _devReadAll().references.filter(
      e => _devOwn(e, advisorId, firmId) && (!topic || e.topic === topic)
    )
  ).slice(0, 200)
}

module.exports = {
  listInputs,
  getInput,
  saveInput,
  removeInput,
  listPosts,
  getPost,
  createPost,
  updatePost,
  removePost,
  listReferences,
  getReference,
  createReference,
  removeReference,
  normaliseKind,
  normaliseReferenceType,
  rowToEntry,
  INPUT_COLUMNS,
  POST_COLUMNS,
  REFERENCE_COLUMNS,
  KINDS,
  REFERENCE_TYPES
}
