'use strict'

/**
 * templateLibrary — the cascade-aware read side of the template library.
 * SEARCH-CONTENT-CASCADE-PLAN.md Phase 2 (approved by Mike 2026-09-01).
 *
 * Answers ONE question for a scope: "which template library is in force here?"
 * Walked nearest-tier-first — firm → group → global → platform — and the first
 * tier that has UPLOADED a set supplies the WHOLE library (Mike's ruling,
 * 2026-08-31: wholesale replace, never merged — each export is a complete
 * firm-specific library, and merging two would create near-duplicate pages).
 *
 * ⚠ WHY 'templates' IS NOT IN CASCADING_CONFIG_KEYS (firmOverlay). That set
 * exists for map-shaped values, where deepMerge expresses a per-field delta;
 * its own header names array-valued keys as deliberately absent because an
 * array cannot express field inheritance. This library is an array and its
 * semantics are first-found-wins — a different rule, expressed here rather
 * than bent into the merge fold.
 *
 * Returns null when NO tier has uploaded — the caller falls through to the
 * committed data/templates.json seed (getOrgTemplates does this already),
 * which is the same behaviour the app has had since day one.
 *
 * The ~60-second cache replaces the loader's old forever-cache: a new upload
 * is live everywhere within a minute, and MySQL is not hit on every request.
 * Stated as a decision, not an accident (plan §5); tune TTL_MS if it bites.
 */

const overlay = require('./firmOverlay')
const { scopeChain } = require('./tierChain')
const { PLATFORM_SCOPE } = require('./platformScope')
const { devFallbackAllowed } = require('./dbFailure')

const TTL_MS = 60 * 1000

/** @type {Map<string, {at: number, value: Array|null}>} scopeId → cached read */
const _cache = new Map()

/**
 * DEV/TEST ONLY — the same single dev file the upload routes write when MySQL
 * is absent (data/dev-firm-templates.json, keyed by scope id). Walked with the
 * same nearest-tier-first rule so a dev machine behaves like the real store.
 * Never reached in production: devFallbackAllowed refuses there.
 * @param {string[]} chain - scopeChain order, top first
 * @returns {Array|null}
 */
function _devReadEffective (chain) {
  const { readFileSync } = require('fs')
  const { resolve } = require('path')
  let all
  try {
    all = JSON.parse(readFileSync(resolve(__dirname, '../../data/dev-firm-templates.json'), 'utf8'))
  } catch { return null }
  for (let i = chain.length - 1; i >= 0; i--) {
    const set = all[chain[i]]
    if (Array.isArray(set) && set.length > 0) { return set }
  }
  return null
}

/**
 * The template library in force for a scope, or null for the committed seed.
 *
 * NEVER REJECTS. Every store fault is absorbed here (dev fallback or the loud
 * seed fallback), so a caller needs no .catch — a template read must never be
 * what kills an advisor session.
 *
 * @param {string|null} scopeId - the authenticated firm/tier scope (req.firmId),
 *   or null for the platform's own view. Never client-supplied.
 * @returns {Promise<Array|null>} the nearest uploaded library, whole; null when
 *   no tier has uploaded one (caller falls back to data/templates.json)
 */
async function loadEffectiveTemplates (scopeId) {
  const key = (scopeId && typeof scopeId === 'string') ? scopeId : PLATFORM_SCOPE
  const hit = _cache.get(key)
  if (hit && (Date.now() - hit.at) < TTL_MS) { return hit.value }

  const chain = scopeChain(key)
  let effective = null
  try {
    // Nearest tier first: the scope itself, then each level above it. First
    // non-empty upload wins whole — see the wholesale-replace ruling above.
    for (let i = chain.length - 1; i >= 0; i--) {
      const layer = await overlay.loadFirmConfig(chain[i], 'templates')
      if (Array.isArray(layer) && layer.length > 0) { effective = layer; break }
    }
  } catch (err) {
    if (devFallbackAllowed(err)) {
      effective = _devReadEffective(chain)
    } else {
      // The loud fallback the plan demands: never silently serve the file
      // while the store is unreachable. At most once a minute per scope (TTL).
      console.error('[templateLibrary] store unreachable — serving the committed data/templates.json seed:', err.message)
      effective = null
    }
  }

  _cache.set(key, { at: Date.now(), value: effective })
  return effective
}

/**
 * Drop every cached read. The upload/restore routes call this so the mentor's
 * (or a firm's) new library is live on the NEXT request rather than after the
 * TTL — the "within a minute" promise becomes "immediately" on the machine
 * that took the upload. Other backend instances still converge via the TTL.
 * Also used by tests.
 * @returns {void}
 */
function clearTemplateCache () {
  _cache.clear()
}

module.exports = { loadEffectiveTemplates, clearTemplateCache, TTL_MS }
