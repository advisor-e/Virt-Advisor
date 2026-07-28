'use strict'

/**
 * @file Firm content overlays — Phase 0 of design/FIRM-EDITABLE-TABLES-PLAN.md.
 * @module server/utils/firmContent
 *
 * Loads a firm's stored edits to the two engine content sources:
 *
 *   - domain-support -> object keyed by domain id, each value a sparse
 *                       override of that domain's *-domain-support.json file
 *   - logic-trees    -> object keyed by tree id, each value a sparse
 *                       override of that tree in data/logic_trees.json
 *
 * Both ride the firmOverlay store (firm_framework_versions) — the same
 * machinery as templates, the staircase and distinctions — so version history
 * and restore come free. `loadFirmConfig` is injected by the caller (the
 * engines pass their lazy firmOverlay wrapper, exactly as firmDistinctions
 * does), which keeps this module free of the MySQL pool at require time and
 * unit-testable without a database.
 *
 * In development the store rejects (no MySQL); we fall back to gitignored
 * dev-JSON maps keyed by firmId, mirroring firmDistinctions. Anything
 * malformed loads as null — a bad save must never take down a session.
 *
 * The merge itself happens in domainSupport.js / logicTrees.js AT THE POINT
 * OF USE, per request. Merged copies are never written into either module's
 * process-wide cache: the caches hold the platform base only, so one firm's
 * edits cannot be served to another firm. This no-new-cache rule is the
 * Phase 0 security property — do not "optimise" it away.
 */

const fs = require('fs')
const path = require('path')
const { deepMerge } = require('./deepMerge')

const CONFIG_KEYS = {
  domainSupport: 'domain-support',
  logicTrees: 'logic-trees'
}

const DEV_FILES = {
  domainSupport: 'data/dev-firm-domain-support.json',
  logicTrees: 'data/dev-firm-logic-trees.json'
}

const isPlainObject = v => typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Merge one firm override over one platform base entry. Overlay rule (see
 * deepMerge): nested objects merge recursively, arrays replace wholesale,
 * keys can be added but never deleted. Returns a NEW object every call —
 * callers must never cache the result.
 * @param {Object} base - the platform entry
 * @param {Object} override - the firm's sparse override
 * @returns {Object}
 */
function mergeEntry (base, override) {
  return deepMerge(base, override)
}

function _readDevMap (file) {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), file), 'utf8'))
  } catch (_e) {
    return {}
  }
}

/**
 * Load one firm content overlay, preferring the injected (production) loader
 * and falling back to the dev-JSON map keyed by firmId.
 * @param {Function} loadFirmConfig - async (firmId, key) => stored value
 * @param {string|null} firmId - the authenticated firm id (never client-supplied)
 * @param {string} key - firmOverlay config key
 * @param {string} devFile - dev-JSON fallback path
 * @returns {Promise<Object|null>} the override map, or null when none/malformed
 */
async function _load (loadFirmConfig, firmId, key, devFile) {
  if (!firmId) { return null }
  let value
  try {
    value = await loadFirmConfig(firmId, key)
  } catch (_e) {
    const map = _readDevMap(devFile)
    value = Object.prototype.hasOwnProperty.call(map, firmId) ? map[firmId] : null
  }
  return isPlainObject(value) ? value : null
}

/**
 * The firm's domain-support edits, keyed by domain id — or null.
 * @param {string|null} firmId
 * @param {Function} loadFirmConfig - async (firmId, key) => stored value
 * @returns {Promise<Object|null>}
 */
function loadFirmDomainSupport (firmId, loadFirmConfig) {
  return _load(loadFirmConfig, firmId, CONFIG_KEYS.domainSupport, DEV_FILES.domainSupport)
}

/**
 * The firm's logic-tree edits, keyed by tree id — or null.
 * @param {string|null} firmId
 * @param {Function} loadFirmConfig - async (firmId, key) => stored value
 * @returns {Promise<Object|null>}
 */
function loadFirmLogicTrees (firmId, loadFirmConfig) {
  return _load(loadFirmConfig, firmId, CONFIG_KEYS.logicTrees, DEV_FILES.logicTrees)
}

module.exports = { CONFIG_KEYS, mergeEntry, loadFirmDomainSupport, loadFirmLogicTrees }
