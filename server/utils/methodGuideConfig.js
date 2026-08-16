'use strict'

/**
 * @file The method-guide wording a scope actually works to — the platform guides
 *   resolved through that scope's edits, and through every tier above it.
 * @module server/utils/methodGuideConfig
 *
 * To-do item 4.16 F. Modelled directly on staircaseConfig.loadBlendedStaircase and
 * coachingConfig.loadResolvedCoaching — same recursion up the tier chain, same "a
 * scope that has decided nothing gets the layer above untouched", same refusal to
 * let a storage fault stop a session. Copying the proven shape is deliberate; a
 * second way of doing inheritance is how two blocks drift apart.
 *
 * 🔴 WHO SEES IT — ruled by Mike 2026-08-17: the SAME TIERS as the materials table
 * the guide opens from. The mentor authors; global group manager, group manager and
 * firm manager each inherit and may reword their own copy; the advisor and the
 * client receive the result and author nothing.
 *
 * That is the OPPOSITE of the diagnostic block's ruling a day earlier ("too
 * technical for a firm or global manager"), and deliberately so: that reasoning was
 * about ROUTING LOGIC, while a method guide is ordinary advisory prose sitting in
 * the very panel where a firm already edits the materials table. It was asked rather
 * than inherited, and the answer came out the other way. **Do not assume the next
 * block on that tab inherits either ruling.**
 *
 * ⚠ THE TWO MIDDLE TIERS CANNOT BE EXERCISED YET and that is not ours: roles.js
 * issues no `global_group_manager` or `group_manager`, and no firm→brand/country
 * membership exists, so `parentScopeOf` returns the platform scope and the chain
 * stays mentor → firm. It fails toward today's behaviour, never toward a guess, and
 * lights up when the master team delivers.
 */

const { loadFirmMethodGuides } = require('./firmContent')
const { deepMerge } = require('./deepMerge')
const { parentScopeOf } = require('./tierChain')

const isPlainObject = v => typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * The method-guide overrides one scope should be read with: this scope's own edits
 * layered over everything the tiers above it typed.
 *
 * Returns the OVERRIDE MAP, not the merged guides — the platform base is merged in
 * at the point of use by methodGuides.resolveGuide, so the base file is read once
 * and cached while the per-scope merge stays uncached (the cross-firm isolation
 * rule).
 *
 * @param {string|null} scopeId - the scope to resolve for: a firm id, or the
 *   reserved PLATFORM_SCOPE for the mentor's own level. Taken from the verified JWT
 *   and NEVER from a request body — a body-supplied id would let one firm read
 *   another's configuration.
 * @param {function(string, string): Promise<Object|null>} loadFirmConfig - the
 *   overlay reader, injected rather than imported so the engine reuses the client it
 *   already has and tests need no database.
 * @returns {Promise<Object|null>} the resolved override map keyed by guide id, or
 *   null when nothing anywhere in the chain has been edited. NEVER REJECTS: a
 *   storage problem must not stop an advisor's session, and the worst case is the
 *   shipped guides — which is exactly what every firm gets today.
 */
async function loadResolvedGuideOverrides (scopeId, loadFirmConfig) {
  if (!scopeId) { return null }

  // The layer this scope inherits from — asked of tierChain rather than assumed, so
  // one recursion serves mentor → global → group → firm without knowing how many
  // tiers there are. The mentor has nothing above it, and that null ends it.
  const parent = parentScopeOf(scopeId)
  const base = parent === null ? null : await loadResolvedGuideOverrides(parent, loadFirmConfig)

  let own
  try {
    own = await loadFirmMethodGuides(scopeId, loadFirmConfig)
  } catch (err) {
    // In production an unreachable store is a real fault: log it, serve the layer
    // above. (In development the loader falls back to the dev JSON itself, so
    // reaching here at all means production.)
    console.error('[methodGuides] scope read failed:', err.message)
    return base
  }

  if (!isPlainObject(own)) { return base }
  if (!isPlainObject(base)) { return own }

  // Guide by guide, so a firm that rewords Ratio Analysis still inherits the
  // mentor's Conflict Meeting rather than silently reverting it to the shipped file.
  const out = Object.assign({}, base)
  for (const guideId of Object.keys(own)) {
    out[guideId] = isPlainObject(base[guideId])
      ? deepMerge(base[guideId], own[guideId])
      : own[guideId]
  }
  return out
}

module.exports = { loadResolvedGuideOverrides }
