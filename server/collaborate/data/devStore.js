'use strict'

/**
 * devStore — DEV-ONLY snapshot persistence for the Collaborate people store.
 * @module server/collaborate/data/devStore
 *
 * `repository.js` holds the people layer in memory, so every restart forgets not
 * only who the advisers are but any decision a manager made on the Adviser
 * Network tab (cross-firm posture, a join request approved, an invitation sent).
 * That is fine for a demo and useless for building against. This module writes
 * the store to one gitignored JSON file after each change and reads it back on
 * boot.
 *
 * ⚠ THIS IS NOT PERSISTENCE FOR PRODUCTION, and must never be mistaken for it.
 * Durable storage is MySQL — the "SQL SEAM" notes in repository.js and the
 * COLLABORATE section of config/db-schema.sql. This file exists so a developer's
 * machine stops forgetting; it is the same DEV-ONLY bargain server/utils/firmContent.js
 * already makes, and it is deliberately inert in production:
 *
 *   - NODE_ENV=production reads nothing and writes nothing, whatever else is set.
 *     The store holds people data (names, emails, phone numbers). A JSON file of
 *     that on a live server would be personal data at rest with none of a
 *     database's controls, so the production path must not create one.
 *   - Under Jest it is off unless a test names its own file. A store that
 *     hydrated from whatever happened to be on the machine would make the
 *     Collaborate suite depend on local state and stop being repeatable — the
 *     trap that bit the firm-distinctions dev fallback before it was hardened.
 *
 * Every failure here is swallowed on purpose: a developer convenience must never
 * be the reason a request fails. An unreadable or malformed file simply leaves
 * the seeded demo store standing.
 */

const fs = require('fs')
const path = require('path')

/** Default location, relative to the repo root. Gitignored. */
const DEFAULT_FILE = 'data/dev-collaborate-people.json'

/**
 * Where the snapshot lives. `COLLAB_DEV_STORE_FILE` overrides it so a test can
 * point at its own temp file instead of the developer's real one.
 * @returns {string} absolute path
 */
function filePath () {
  return path.resolve(process.cwd(), process.env.COLLAB_DEV_STORE_FILE || DEFAULT_FILE)
}

/**
 * Whether the snapshot may be read or written at all.
 *
 * Production loses to nothing — the check is first and unconditional, so a test
 * can prove that even an explicitly configured path writes no file there.
 * @returns {boolean}
 */
function isEnabled () {
  if (process.env.NODE_ENV === 'production') { return false }
  if (process.env.COLLAB_DEV_STORE_FILE) { return true }
  if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined) { return false }
  return true
}

/**
 * Read the snapshot.
 * @returns {Object|null} the parsed snapshot, or null when disabled, absent or
 *   malformed — in every one of those cases the caller keeps its seeded store.
 */
function load () {
  if (!isEnabled()) { return null }
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath(), 'utf8'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) { return null }
    return parsed
  } catch (_e) {
    return null
  }
}

/**
 * Write the snapshot.
 * @param {Object} snapshot - the whole store, as built by repository._snapshot()
 * @returns {boolean} true when written; false when disabled or the write failed
 */
function save (snapshot) {
  if (!isEnabled()) { return false }
  try {
    fs.writeFileSync(filePath(), JSON.stringify(snapshot, null, 2), 'utf8')
    return true
  } catch (_e) {
    return false
  }
}

module.exports = { isEnabled, load, save, filePath, DEFAULT_FILE }
