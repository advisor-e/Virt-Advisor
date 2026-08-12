'use strict'

/**
 * @file Single read path for a firm's advisory-distinction state.
 * @module server/utils/firmDistinctions
 *
 * A firm's distinction state has three parts, each stored under its own firmOverlay
 * config key (so the existing firm-own storage is untouched and the new cascade
 * state is additive — DISTINCTIONS-CASCADE-PLAN.md, Stages 1-2):
 *
 *   - advisory-distinctions   -> the firm's OWN added rows           (array)
 *   - distinction-declines    -> platform ids the firm switched off  (array of pd-N)
 *   - distinction-overrides   -> firm edits keyed by platform id     (object)
 *
 * Both the advisor engine (read, to resolve the effective list) and the Firm
 * Manager routes (read + write) load through this one function so they can never
 * disagree about what a firm has configured. `loadFirmConfig` is injected — the
 * engine passes its lazy firmOverlay wrapper, the routes pass overlay.loadFirmConfig
 * — which also keeps this module unit-testable without a database.
 *
 * In development `loadFirmConfig` rejects (no MySQL); we then fall back to the
 * gitignored dev-JSON maps (keyed by firmId), mirroring the existing own-rows dev
 * fallback. These dev files are TEST-ONLY (no version history) and are replaced by
 * real MySQL persistence before production — see the shared ACTIONS.md P2 item.
 * THE FALLBACK IS DEV-ONLY: in production an unreachable store is thrown to the
 * caller. See `_load` below for why.
 */

const fs = require('fs')
const path = require('path')

// See server/utils/dbFailure.js — also refuses the fallback when a live server
// REFUSED the statement, so a rejected read cannot answer with stale dev data.
const { devFallbackAllowed: IS_DEV } = require('./dbFailure')

const CONFIG_KEYS = {
  own: 'advisory-distinctions',
  declines: 'distinction-declines',
  overrides: 'distinction-overrides'
}

const DEV_FILES = {
  own: 'data/dev-firm-distinctions.json',
  declines: 'data/dev-firm-distinction-declines.json',
  overrides: 'data/dev-firm-distinction-overrides.json'
}

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
 * THE FALLBACK IS DEV-ONLY, DELIBERATELY — matching firmStaircase.js, which was
 * tightened first. In production an unreachable store is a real fault and is thrown
 * to the caller: the Firm Manager route turns it into a 500 the manager can see, and
 * the advisor engine logs it and runs on the platform set. Returning "this firm has
 * declined nothing and edited nothing" instead would hide an outage behind an answer
 * that looks deliberate, and a stray dev file on a production box would be served as
 * that firm's live configuration.
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
    if (!IS_DEV(err)) { throw err }
    const map = _readDevMap(devFile)
    return Object.prototype.hasOwnProperty.call(map, firmId) ? map[firmId] : fallback
  }
}

/**
 * Load and shape a firm's full distinction state for the resolver.
 * @param {string|null} firmId - the authenticated firm id (never client-supplied)
 * @param {Function} loadFirmConfig - async (firmId, key) => stored value
 * @returns {Promise<{ownRows: Array, declinedIds: string[], overrides: Object}>}
 * @throws in production, when the store cannot be read (never in development)
 */
async function loadFirmDistinctionState (firmId, loadFirmConfig) {
  if (!firmId) { return { ownRows: [], declinedIds: [], overrides: {} } }

  const own = await _load(loadFirmConfig, firmId, CONFIG_KEYS.own, DEV_FILES.own, [])
  const declines = await _load(loadFirmConfig, firmId, CONFIG_KEYS.declines, DEV_FILES.declines, [])
  const overrides = await _load(loadFirmConfig, firmId, CONFIG_KEYS.overrides, DEV_FILES.overrides, {})

  return {
    ownRows: Array.isArray(own) ? own : [],
    declinedIds: Array.isArray(declines) ? declines : [],
    overrides: (overrides && typeof overrides === 'object' && !Array.isArray(overrides)) ? overrides : {}
  }
}

// DEV_FILES is intentionally NOT exported — it is used only internally (the dev-JSON
// fallback paths); no external consumer needs it.
module.exports = { loadFirmDistinctionState, CONFIG_KEYS }
