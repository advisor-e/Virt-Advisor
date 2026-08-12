'use strict'

/**
 * clientStore — the firm's client register (MySQL `va_clients`).
 *
 * A client record is the anchor for the client knowledge base (design
 * 2026-07-14): every saved case can carry a `client_id`, so "what did we
 * recommend for THIS client last time, and how did it go?" becomes answerable.
 *
 * The NAME IS A LABEL, NOT THE KEY. The stable identity is a generated UUID the
 * advisor never sees; `name` is freely editable and renaming never orphans a
 * case. `name_key` is a normalised form of the name used ONLY for duplicate
 * detection and the "did you mean…?" check — never as the identity.
 *
 * The register is FIRM-scoped: every advisor at the firm selects from one list,
 * so the same client is never created twice. What an advisor can READ about a
 * client stays governed by the case visibility model (caseStore) — sharing a
 * client's name is not sharing their cases.
 *
 * DEV/TEST fallback: when the DB is unavailable outside production, reads and
 * writes go to a gitignored JSON file (data/dev-clients.json; override via
 * CLIENT_DEV_FILE for hermetic tests) — the same convention as caseStore. In
 * production a DB failure propagates so an outage is never silently masked.
 */

const path = require('path')
const fs = require('fs')
const db = require('./db')
const { generateId } = require('./caseStore')
const { devFallbackAllowed } = require('./dbFailure')

// Default dev fallback file; overridable via CLIENT_DEV_FILE so tests can point
// at an isolated temp file. Production never sets this — it uses MySQL.
const DEV_CLIENTS_FILE = process.env.CLIENT_DEV_FILE
  ? path.resolve(process.env.CLIENT_DEV_FILE)
  : path.resolve(__dirname, '../../data/dev-clients.json')

/** Same rule as caseStore: the JSON fallback may never stand in for production. */
// See server/utils/dbFailure.js — also refuses the fallback when a live server
// REFUSED the statement, so a rejected write cannot report success.
function devFallbackEnabled (err) {
  return devFallbackAllowed(err)
}

/**
 * Normalise a business name to its duplicate-detection key: lowercase, strip
 * diacritics ("Café Río" → "cafe rio" territory), then drop everything that is
 * not a letter or digit. "Vanoss Scaffolding Ltd." and "vanoss-scaffolding ltd"
 * both become "vanossscaffoldingltd". Used ONLY for matching — never as identity.
 * @param {string} name
 * @returns {string}
 */
function normaliseNameKey (name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

/**
 * The "did you mean…?" check, as a pure function so it is trivially testable
 * and does not force a second DB round trip (the caller already has the firm's
 * list). A candidate matches when one normalised key contains the other —
 * catching "Vanoss" vs "Vanoss Scaffolding" and punctuation/spacing variants.
 * Very short keys (< 4 chars) only match exactly, so "AB" doesn't flag half the
 * register.
 * @param {object[]} clients - existing firm clients (shape from rowToClient)
 * @param {string} name - the name the advisor is about to create
 * @returns {object[]} possible duplicates, exact key matches first
 */
function findSimilar (clients, name) {
  const key = normaliseNameKey(name)
  if (!key) { return [] }
  const hits = (clients || []).filter((c) => {
    const existing = c.nameKey || normaliseNameKey(c.name)
    if (!existing) { return false }
    if (existing === key) { return true }
    if (key.length < 4 || existing.length < 4) { return false }
    return existing.includes(key) || key.includes(existing)
  })
  return hits.sort((a, b) => {
    const aExact = (a.nameKey || normaliseNameKey(a.name)) === key ? 0 : 1
    const bExact = (b.nameKey || normaliseNameKey(b.name)) === key ? 0 : 1
    return aExact - bExact
  })
}

/** Map a DB row (snake_case) to the shape the frontend uses (camelCase). */
function rowToClient (row) {
  return {
    id: row.id,
    firmId: row.firm_id,
    name: row.name,
    nameKey: row.name_key,
    createdBy: row.created_by || null,
    createdAt: row.created_at || null
  }
}

/**
 * The firm's client register, alphabetical — the list the advisor picks from at
 * session start.
 * @param {string} firmId - from the verified JWT, never the request body
 * @returns {Promise<object[]>}
 */
async function listForFirm (firmId) {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM va_clients
        WHERE firm_id = ?
        ORDER BY name ASC
        LIMIT 1000`,
      [firmId]
    )
    return rows.map(rowToClient)
  } catch (err) {
    if (devFallbackEnabled(err)) { return _devList(firmId) }
    throw err
  }
}

/**
 * Fetch ONE client, scoped to the caller's firm. The IDOR guard for every
 * feature that receives a client_id from the browser: a client id that exists
 * but belongs to another firm returns null, exactly as if it did not exist.
 * @param {string} id
 * @param {string} firmId - from the verified JWT
 * @returns {Promise<object|null>}
 */
async function getById (id, firmId) {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM va_clients WHERE id = ? AND firm_id = ? LIMIT 1',
      [id, firmId]
    )
    return rows.length ? rowToClient(rows[0]) : null
  } catch (err) {
    if (devFallbackEnabled(err)) { return _devGet(id, firmId) }
    throw err
  }
}

/**
 * Insert a new client. Identity (firmId/createdBy) is the caller's verified
 * identity — never trusted from the request body. The duplicate check
 * (findSimilar) is the ROUTE's job before calling this: two genuinely distinct
 * businesses can share a name, so the store never hard-blocks on it.
 * @param {object} input - { firmId, name, createdBy, id? }
 * @returns {Promise<object>} the stored client
 */
async function create (input) {
  const name = String(input.name || '').trim().slice(0, 255)
  if (!name) { throw new Error('client name is required') }
  const row = {
    id: (typeof input.id === 'string' && input.id) ? input.id.slice(0, 64) : generateId(),
    firm_id: String(input.firmId).slice(0, 64),
    name,
    name_key: normaliseNameKey(name).slice(0, 255),
    created_by: String(input.createdBy || '').slice(0, 64)
  }
  try {
    await db.execute(
      `INSERT INTO va_clients (id, firm_id, name, name_key, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [row.id, row.firm_id, row.name, row.name_key, row.created_by]
    )
    return rowToClient({ ...row, created_at: new Date().toISOString() })
  } catch (err) {
    if (devFallbackEnabled(err)) { return _devCreate(row) }
    throw err
  }
}

/**
 * Rename a client — the label changes, the identity does not, so every linked
 * case keeps its history (the design's "renaming never orphans" guarantee).
 * Firm-scoped: any advisor at the firm can fix a typo in their shared register.
 * @param {string} id
 * @param {string} firmId - from the verified JWT
 * @param {string} name - the new display name
 * @returns {Promise<boolean>} true if a firm-owned row was updated
 */
async function rename (id, firmId, name) {
  const clean = String(name || '').trim().slice(0, 255)
  if (!clean) { return false }
  const key = normaliseNameKey(clean).slice(0, 255)
  try {
    const [result] = await db.execute(
      'UPDATE va_clients SET name = ?, name_key = ? WHERE id = ? AND firm_id = ?',
      [clean, key, id, firmId]
    )
    return result.affectedRows > 0
  } catch (err) {
    if (devFallbackEnabled(err)) { return _devRename(id, firmId, clean, key) }
    throw err
  }
}

// ── DEV/TEST-ONLY JSON fallback (gitignored data/dev-clients.json) ────────────
// Only reached when the DB is unavailable AND devFallbackEnabled(). Stores the
// camelCase client shape directly. Not production-safe (no locking).

function _devReadAll () {
  try { return JSON.parse(fs.readFileSync(DEV_CLIENTS_FILE, 'utf8')) } catch (e) { return [] }
}

function _devWriteAll (all) {
  fs.writeFileSync(DEV_CLIENTS_FILE, JSON.stringify(all, null, 2))
}

function _devList (firmId) {
  return _devReadAll()
    .filter(c => c.firmId === firmId)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
}

function _devGet (id, firmId) {
  return _devReadAll().find(c => c.id === id && c.firmId === firmId) || null
}

function _devCreate (row) {
  const all = _devReadAll()
  // Mirror the DB primary-key constraint: a duplicate id is rejected.
  if (all.some(c => c.id === row.id)) {
    throw new Error(`duplicate client id: ${row.id}`)
  }
  const entry = rowToClient({ ...row, created_at: new Date().toISOString() })
  all.unshift(entry)
  _devWriteAll(all)
  return entry
}

function _devRename (id, firmId, name, nameKey) {
  const all = _devReadAll()
  const c = all.find(x => x.id === id && x.firmId === firmId)
  if (!c) { return false }
  c.name = name
  c.nameKey = nameKey
  _devWriteAll(all)
  return true
}

module.exports = {
  listForFirm,
  getById,
  create,
  rename,
  // pure helpers (also used by routes / tests)
  normaliseNameKey,
  findSimilar
}
