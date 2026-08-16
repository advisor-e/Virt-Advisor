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
 * dev-JSON maps keyed by firmId, mirroring firmDistinctions. That fallback is
 * DEV-ONLY: in production an unreachable store is thrown to the caller (see
 * `_load`). Anything malformed loads as null — a bad save must never take down
 * a session.
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
  logicTrees: 'logic-trees',
  // The thirteen method guides (item 4.16 F). Keyed by GUIDE id, not by domain:
  // three of the guides are shown on two domain pages, and storing per domain
  // would make the same document diverge between them — which is precisely what
  // the on-screen "an edit here changes it there too" line promises it will not do.
  methodGuides: 'method-guides'
}

const DEV_FILES = {
  domainSupport: 'data/dev-firm-domain-support.json',
  logicTrees: 'data/dev-firm-logic-trees.json',
  methodGuides: 'data/dev-firm-method-guides.json'
}

// See server/utils/dbFailure.js — also refuses the fallback when a live server
// REFUSED the statement, so a rejected read cannot answer with stale dev data.
const { devFallbackAllowed: IS_DEV } = require('./dbFailure')

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
 *
 * THE FALLBACK IS DEV-ONLY, DELIBERATELY — matching firmStaircase.js and
 * firmDistinctions.js. In production an unreachable store is thrown to the caller:
 * the Firm Manager route turns it into a 500 the manager can see, and the engines
 * log it and run on the platform content. Returning null instead would tell a
 * session "this firm has edited nothing", which is indistinguishable from the truth
 * and hides the outage; and a stray dev file on a production box would be served as
 * that firm's live domain-support and logic-tree wording.
 *
 * @param {Function} loadFirmConfig - async (firmId, key) => stored value
 * @param {string|null} firmId - the authenticated firm id (never client-supplied)
 * @param {string} key - firmOverlay config key
 * @param {string} devFile - dev-JSON fallback path
 * @returns {Promise<Object|null>} the override map, or null when none/malformed
 * @throws in production, when the store cannot be read
 */
async function _load (loadFirmConfig, firmId, key, devFile) {
  if (!firmId) { return null }
  let value
  try {
    value = await loadFirmConfig(firmId, key)
  } catch (err) {
    if (!IS_DEV(err)) { throw err }
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
 * @throws in production, when the store cannot be read (never in development)
 */
function loadFirmDomainSupport (firmId, loadFirmConfig) {
  return _load(loadFirmConfig, firmId, CONFIG_KEYS.domainSupport, DEV_FILES.domainSupport)
}

/**
 * The firm's logic-tree edits, keyed by tree id — or null.
 * @param {string|null} firmId
 * @param {Function} loadFirmConfig - async (firmId, key) => stored value
 * @returns {Promise<Object|null>}
 * @throws in production, when the store cannot be read (never in development)
 */
function loadFirmLogicTrees (firmId, loadFirmConfig) {
  return _load(loadFirmConfig, firmId, CONFIG_KEYS.logicTrees, DEV_FILES.logicTrees)
}

/**
 * One scope's method-guide edits, keyed by guide id — or null.
 *
 * ONE LEVEL ONLY. Use methodGuideConfig.loadResolvedGuideOverrides for the value a
 * session should actually read: this returns what THIS scope typed, and a firm must
 * also inherit what the mentor typed.
 *
 * @param {string|null} firmId - a firm id, or the reserved PLATFORM_SCOPE
 * @param {Function} loadFirmConfig - async (firmId, key) => stored value
 * @returns {Promise<Object|null>}
 * @throws in production, when the store cannot be read (never in development)
 */
function loadFirmMethodGuides (firmId, loadFirmConfig) {
  return _load(loadFirmConfig, firmId, CONFIG_KEYS.methodGuides, DEV_FILES.methodGuides)
}

/**
 * Session-safe wrapper around either reader above, for the ENGINES only.
 *
 * The readers reject in production so a storage fault cannot be mistaken for "this
 * firm has edited nothing" — but a live advisor or course session must not die for
 * it. This logs the fault and answers null, which the merge points already treat as
 * "no override", so the session runs on the platform content. One wrapper rather
 * than a try/catch copied to each call site, so the rule cannot drift between them.
 *
 * ROUTES MUST NOT USE THIS. A firm manager needs the error — an empty editing screen
 * that looks like their saved work vanished is exactly the failure being removed.
 *
 * @param {Function} read - loadFirmDomainSupport or loadFirmLogicTrees
 * @param {string|null} firmId
 * @param {Function} loadFirmConfig - async (firmId, key) => stored value
 * @param {string} label - log prefix identifying the engine ('advisor' | 'course')
 * @returns {Promise<Object|null>} the override map, or null on any failure
 */
async function readForSession (read, firmId, loadFirmConfig, label) {
  try {
    return await read(firmId, loadFirmConfig)
  } catch (err) {
    console.error(`[${label}] firm content read failed — using platform content:`, err.message)
    return null
  }
}

module.exports = {
  CONFIG_KEYS,
  mergeEntry,
  loadFirmDomainSupport,
  loadFirmLogicTrees,
  loadFirmMethodGuides,
  readForSession
}
