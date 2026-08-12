'use strict'

/**
 * @file Single read path for the platform (mentor) advisory-distinction set.
 * @module server/utils/platformDistinctions
 *
 * The platform set is the ORIGIN of the mentor->firm->advisor cascade
 * (design/DISTINCTIONS-CASCADE-PLAN.md §6): the rows the mentor authors, which
 * every firm receives as their default and may then decline / override / extend.
 *
 * Historically these rows were a hand-edited committed file
 * (`data/advisory-distinctions.json` -> `.platform`). To let the mentor edit them
 * from a UI (Stage B), they move into the existing firmOverlay store under one
 * reserved GLOBAL scope — a `firm_id` no real firm uses — so the mentor set gains
 * version history + one-click restore for free, with no new table. The committed
 * JSON stays as the SEED / fallback: it is what this loader returns whenever the
 * store holds nothing yet, or when there is no database (dev). That makes Stage A
 * behaviour byte-identical to the previous static `require` until a mentor edit
 * actually writes rows.
 *
 * Both the advisor engine (to resolve a firm's effective list) and the Firm
 * Manager routes (to validate platform ids and read platform content) load through
 * this one function, so they can never disagree about what the platform set is.
 * `loadFirmConfig` is injected — callers pass firmOverlay.loadFirmConfig — which
 * also keeps this module unit-testable without a database.
 */

const fs = require('fs')
const path = require('path')

const ADVISORY_DISTINCTIONS = require('../../data/advisory-distinctions.json')

// Reserved global scope for the mentor-authored platform set. `__platform__` is
// not a real firm id, so it can never collide with a firm's own overlay rows; the
// dedicated config key keeps it separate from firms' `advisory-distinctions`
// (their OWN rows) stored under the same table. The id lives in ./platformScope —
// one home for the string, and the place that explains why the seeded `firms` row
// exists and why "which firms…" readers must skip it.
const { PLATFORM_SCOPE } = require('./platformScope')
const { devFallbackAllowed } = require('./dbFailure')
const PLATFORM_CONFIG_KEY = 'advisory-distinctions-platform'

// The committed seed — the fallback returned when the store holds nothing.
const SEED_PLATFORM_ROWS = Array.isArray(ADVISORY_DISTINCTIONS.platform)
  ? ADVISORY_DISTINCTIONS.platform
  : []

// Dev-JSON fallback: when MySQL is unavailable (dev), the mentor set is persisted
// to this gitignored file (a plain array — there is only one global scope, so no
// firmId keying). TEST-ONLY: no version history; replaced by real MySQL before
// production. Mirrors the firm-distinctions dev fallback (server/utils/firmDistinctions.js).
const DEV_FILE = path.resolve(process.cwd(), 'data/dev-platform-distinctions.json')

// Evaluated at call time (not module load) so the dev fallback honours the env in
// force when a write actually happens — never silently swallows a production error.
// See server/utils/dbFailure.js. Pass the caught error inside a catch block and
// the fallback ALSO refuses to run when a live server refused the statement —
// the mentor's own saves are stored here, and they ran silently broken for
// weeks because a foreign-key rejection was read as "no database". Called with
// no argument (outside a catch) it keeps the original meaning: not production.
function _isDev (err) { return devFallbackAllowed(err) }

function _readDevRows () {
  try {
    const arr = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8'))
    return Array.isArray(arr) ? arr : null
  } catch (_e) {
    return null
  }
}

function _writeDevRows (rows) {
  fs.writeFileSync(DEV_FILE, JSON.stringify(rows, null, 2))
}

/**
 * Load the platform (mentor) distinction rows. Prefers the stored mentor set from
 * the global overlay scope; on a clean miss (null) returns the committed seed; on a
 * loader error IN DEVELOPMENT tries the dev-JSON fallback, then the seed. A stored
 * EMPTY array is honoured (the mentor genuinely cleared the set) — only
 * null/undefined/non-array/throw falls through to the dev file or seed.
 *
 * IN PRODUCTION A READ ERROR IS RE-THROWN, matching the save path below rather than
 * quietly answering with the seed. Two reasons, and the second is the serious one:
 * a stray dev file on a production box must never be served as the mentor's live
 * set; and every mentor edit is a READ-MODIFY-WRITE (`loadPlatformDistinctions` ->
 * splice -> `savePlatformDistinctions`), so answering a failed read with the seed
 * would let one edit overwrite the mentor's whole authored set with the shipped
 * defaults. Every caller already handles the rejection — the mentor and Firm
 * Manager routes return a 500, and the advisor engine logs it and uses the seed.
 *
 * @param {Function} [loadFirmConfig] - async (firmId, key) => stored value
 *   (firmOverlay.loadFirmConfig). When omitted, the dev file (if any) then the seed.
 * @returns {Promise<Array>} the platform distinction rows
 * @throws in production, when the store cannot be read
 */
async function loadPlatformDistinctions (loadFirmConfig) {
  if (typeof loadFirmConfig === 'function') {
    try {
      const stored = await loadFirmConfig(PLATFORM_SCOPE, PLATFORM_CONFIG_KEY)
      if (Array.isArray(stored)) { return stored }
      return SEED_PLATFORM_ROWS // clean miss (null) — production: nothing stored yet
    } catch (err) {
      if (!_isDev(err)) { throw err }
      // No DB (dev) or read error — try the dev-JSON fallback before the seed.
      const dev = _readDevRows()
      if (dev) { return dev }
      return SEED_PLATFORM_ROWS
    }
  }
  // No loader injected — dev file (if any) then seed. Production never takes this
  // path: both callers inject firmOverlay.loadFirmConfig.
  if (!_isDev()) { return SEED_PLATFORM_ROWS }
  const dev = _readDevRows()
  return dev || SEED_PLATFORM_ROWS
}

/**
 * Persist the platform (mentor) distinction set. Writes to the global overlay scope
 * (version history + restore come for free); on a save error in DEV, falls back to
 * the dev-JSON file. In production a save error is re-thrown so it surfaces — it is
 * never silently swallowed.
 *
 * @param {Array} rows - the full platform set to persist
 * @param {Function} saveFirmConfig - async (firmId, key, json, savedBy) => version
 *   (firmOverlay.saveFirmConfig)
 * @param {string} savedBy - audit attribution (the mentor's email)
 * @returns {Promise<void>}
 */
async function savePlatformDistinctions (rows, saveFirmConfig, savedBy) {
  try {
    await saveFirmConfig(PLATFORM_SCOPE, PLATFORM_CONFIG_KEY, rows, savedBy)
  } catch (err) {
    if (_isDev(err)) { _writeDevRows(rows); return }
    throw err
  }
}

module.exports = {
  loadPlatformDistinctions,
  savePlatformDistinctions,
  PLATFORM_SCOPE,
  PLATFORM_CONFIG_KEY,
  SEED_PLATFORM_ROWS
}
