'use strict'

/**
 * @file Effective advisory-distinction list resolver.
 * @module server/utils/resolveDistinctions
 *
 * Implements the mentor->firm->advisor cascade (design/DISTINCTIONS-CASCADE-PLAN.md,
 * Stages 1-2). A firm's advisors should see ONE list — the platform (mentor)
 * distinctions, modified by what the firm has done to them:
 *
 *   - declined  : the firm switched a platform row off  -> it drops out
 *   - overridden: the firm edited a platform row        -> the firm's version
 *                 REPLACES the platform original (firm wins; the two never both
 *                 fire, so a matched template's boost is never double-counted)
 *   - own       : the firm added its own row            -> it comes along
 *
 * This function is pure (no I/O, no engine coupling): the caller supplies the
 * platform rows and the firm's stored changes, and gets the resolved list back.
 * The engine and the Firm Manager UI both read from this single resolver so the
 * advisor session and the management screen can never disagree.
 */

/**
 * A distinction row. Platform rows carry a stable string id (pd-N); firm-own rows
 * carry an integer id. Shape: { id, domain, triggers[], description, templates[], boost }.
 * @typedef {Object} DistinctionRow
 */

/**
 * The firm's stored changes against the platform set.
 * @typedef {Object} FirmDistinctionState
 * @property {string[]} [declinedIds] - platform ids (pd-N) the firm switched off
 * @property {Object.<string, Object>} [overrides] - firm-edited fields keyed by the
 *   platform id they replace (e.g. { 'pd-3': { boost: 9, templates: [...] } })
 * @property {DistinctionRow[]} [ownRows] - the firm's own added rows
 */

/** @typedef {'platform'|'firm-override'|'firm-own'} DistinctionSource */

/**
 * Build a firm's effective distinction list from the platform rows and the firm's
 * changes. Order: platform rows first (in their original order, with declined rows
 * removed and overridden rows swapped in place), then the firm's own rows.
 *
 * Resolution rules:
 *  - decline takes precedence over an override of the same id (a row the firm
 *    switched off stays off, even if a stale override exists for it);
 *  - an override keyed to an id that is not a real platform row is ignored (a stale
 *    or bad override can never inject a phantom row);
 *  - an override can change a platform row's editable fields but never its id — the
 *    id is identity and stays pinned to the platform row it replaces.
 *
 * Every returned row gains a non-enumerable-free `source` tag so the UI can badge
 * it (platform / firm-override / firm-own). Returned rows are shallow copies; the
 * inputs are not mutated.
 *
 * @param {DistinctionRow[]} platformRows - the platform (mentor) distinctions
 * @param {FirmDistinctionState} [firmState] - the firm's declines/overrides/own rows
 * @returns {Array<DistinctionRow & {source: DistinctionSource, overridesId?: string}>}
 *   the resolved effective list
 */
function resolveEffectiveDistinctions (platformRows, firmState) {
  const platform = Array.isArray(platformRows) ? platformRows : []

  const state = firmState && typeof firmState === 'object' ? firmState : {}
  const declinedIds = new Set(Array.isArray(state.declinedIds) ? state.declinedIds : [])
  const overrides = state.overrides && typeof state.overrides === 'object' && !Array.isArray(state.overrides)
    ? state.overrides
    : {}
  const ownRows = Array.isArray(state.ownRows) ? state.ownRows : []

  const effective = []

  for (const row of platform) {
    if (!row || row.id === null || row.id === undefined) { continue }
    const id = row.id

    // Declined: the firm switched this platform row off. Decline wins over an
    // override of the same id, so a row stays off until the firm re-enables it.
    if (declinedIds.has(id)) { continue }

    const override = Object.prototype.hasOwnProperty.call(overrides, id) ? overrides[id] : null
    if (override && typeof override === 'object' && !Array.isArray(override)) {
      // Firm's edited version REPLACES the platform original — the platform row is
      // not also emitted, so its boost cannot stack with the firm's.
      effective.push({ ...row, ...override, id, source: 'firm-override', overridesId: id })
    } else {
      effective.push({ ...row, source: 'platform' })
    }
  }

  for (const row of ownRows) {
    if (!row || row.id === null || row.id === undefined) { continue }
    effective.push({ ...row, source: 'firm-own' })
  }

  return effective
}

module.exports = { resolveEffectiveDistinctions }
