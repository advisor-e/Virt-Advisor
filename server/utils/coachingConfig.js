'use strict'

/**
 * @file The coaching reference a scope actually works to — the platform rows resolved
 *   through that scope's decisions, and through every tier above it.
 * @module server/utils/coachingConfig
 *
 * The fifth and last block to join the one firm-editable mechanism (ruled 2026-07-30,
 * and named in resolveInheritedRows.js's own header). Before this, the fifteen rows in
 * data/coaching-reference.json went to the model exactly as shipped for every firm on the
 * platform: the mentor could not edit them, a group could not, and a firm could only ever
 * ADD to them through promotion. The cascade had a hole in it and this closes it.
 *
 * Modelled directly on staircaseConfig.loadBlendedStaircase — same recursion up the tier
 * chain, same "a scope that has decided nothing gets the layer above untouched", same
 * refusal to let a storage fault stop a session. Copying the proven shape is deliberate;
 * a second way of doing inheritance is how the two drift apart.
 *
 * 🔴 THE ONE THING THAT IS NOT LIKE THE STAIRCASE. A firm's PROMOTED CASE OBSERVATIONS
 * are stored under a different key (`coaching-reference`), resolved by a different
 * function (coaching.loadFirmCoaching) and rendered into a different prompt section,
 * FENCED as untrusted. They are not inherited, they are not overridable, and they do not
 * pass through this file. See the header of firmCoachingReference.js for why folding the
 * two together would be a prompt-injection hole rather than a tidy-up.
 */

const BASE_COACHING = require('../../data/coaching-reference.json')
const { resolveInheritedRows } = require('./resolveInheritedRows')
const { loadFirmCoachingState } = require('./firmCoachingReference')
const { parentScopeOf } = require('./tierChain')

/** How a resolved row is badged for a management screen. Mirrors the staircase's tags. */
const COACHING_SOURCE_LABELS = { inherited: 'platform', override: 'firm-override', own: 'firm-own' }

/**
 * Load the coaching reference rows one scope should be coached by.
 *
 * @param {string|null} scopeId - the scope to resolve for: a firm id, or the reserved
 *   PLATFORM_SCOPE for the mentor's own level. Taken from the verified JWT and never from
 *   a request body — a body-supplied id would let one firm read another's configuration.
 * @param {function(string, string): Promise<Object|null>} loadFirmConfig - the overlay
 *   reader, injected rather than imported so the engine reuses the client it already has
 *   and tests need no database. Mirrors loadBlendedStaircase.
 * @returns {Promise<Array<Object>>} the resolved rows, in order. Falls back to the layer
 *   above when this scope has decided nothing, has no scope id, or the store cannot be
 *   reached. NEVER REJECTS: a storage problem must not stop an advisor's session, and the
 *   worst case is the shipped rows — which is exactly what every firm gets today.
 */
async function loadResolvedCoaching (scopeId, loadFirmConfig) {
  if (!scopeId) { return BASE_COACHING }

  // The layer this scope inherits from — asked of tierChain rather than assumed, so one
  // recursion serves mentor -> global -> group -> firm without knowing how many tiers
  // there are. With no membership data parentScopeOf returns the platform scope, which
  // resolves to the shipped file, so behaviour is unchanged until the master team
  // supplies that data. The mentor has nothing above it, and that null ends the
  // recursion. A fault one level up is already absorbed there.
  const parent = parentScopeOf(scopeId)
  const base = parent === null
    ? BASE_COACHING
    : await loadResolvedCoaching(parent, loadFirmConfig)

  let state
  try {
    state = await loadFirmCoachingState(scopeId, loadFirmConfig)
  } catch (err) {
    // In production an unreachable store is a real fault: log it, serve the base.
    // (In development the state loader falls back to the dev JSON itself, so reaching
    // here at all means production.)
    console.error('[coaching] scope state read failed:', err.message)
    return base
  }

  const hasDecisions = state.declinedIds.length > 0 ||
    Object.keys(state.overrides).length > 0 ||
    state.ownRows.length > 0
  // Identity, not merely an optimisation: a scope that has decided nothing gets the
  // array from the layer above itself, so "unchanged" is provable by reference.
  if (!hasDecisions) { return base }

  const resolved = resolveInheritedRows(base, state, { sourceLabels: COACHING_SOURCE_LABELS })

  // An empty coaching reference is not a customisation, it is a dead end — the model
  // would be asked to choose a template with no guidance at all, which is worse than the
  // platform's. Storage should never hold that shape; this is the second lock, matching
  // the staircase's own refusal to resolve to zero steps.
  return resolved.length > 0 ? resolved : base
}

module.exports = {
  loadResolvedCoaching,
  BASE_COACHING,
  COACHING_SOURCE_LABELS
}
