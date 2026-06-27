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

const ADVISORY_DISTINCTIONS = require('../../data/advisory-distinctions.json')

// Reserved global scope for the mentor-authored platform set. `__platform__` is
// not a real firm id, so it can never collide with a firm's own overlay rows; the
// dedicated config key keeps it separate from firms' `advisory-distinctions`
// (their OWN rows) stored under the same table.
const PLATFORM_SCOPE = '__platform__'
const PLATFORM_CONFIG_KEY = 'advisory-distinctions-platform'

// The committed seed — the fallback returned when the store holds nothing.
const SEED_PLATFORM_ROWS = Array.isArray(ADVISORY_DISTINCTIONS.platform)
  ? ADVISORY_DISTINCTIONS.platform
  : []

/**
 * Load the platform (mentor) distinction rows. Prefers the stored mentor set from
 * the global overlay scope; falls back to the committed seed when nothing is
 * stored, the stored value is not an array, or the loader is unavailable/throws
 * (e.g. no MySQL in dev). A stored EMPTY array is honoured (the mentor genuinely
 * cleared the set) — only null/undefined/non-array/throw falls through to the seed.
 *
 * @param {Function} [loadFirmConfig] - async (firmId, key) => stored value
 *   (firmOverlay.loadFirmConfig). When omitted, the seed is returned.
 * @returns {Promise<Array>} the platform distinction rows
 */
async function loadPlatformDistinctions (loadFirmConfig) {
  if (typeof loadFirmConfig === 'function') {
    try {
      const stored = await loadFirmConfig(PLATFORM_SCOPE, PLATFORM_CONFIG_KEY)
      if (Array.isArray(stored)) { return stored }
    } catch (_e) {
      // No DB (dev) or a read error -> fall through to the committed seed.
    }
  }
  return SEED_PLATFORM_ROWS
}

module.exports = {
  loadPlatformDistinctions,
  PLATFORM_SCOPE,
  PLATFORM_CONFIG_KEY,
  SEED_PLATFORM_ROWS
}
