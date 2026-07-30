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
 * THE RULES NOW LIVE IN ONE PLACE. Those three behaviours were ruled (Mike,
 * 2026-07-30) to be the single firm-editable mechanism for every block, so they were
 * lifted verbatim into server/utils/resolveInheritedRows.js and this file became a
 * thin caller of it. Distinctions behaviour is UNCHANGED — tests/unit/
 * resolveDistinctions.test.js passed untouched across the move, which is what proves
 * it. Change the mechanism there, not here; this file's job is only to supply the
 * distinction vocabulary (its source tags) and its documented shape.
 *
 * This function is pure (no I/O, no engine coupling): the caller supplies the
 * platform rows and the firm's stored changes, and gets the resolved list back.
 * The engine and the Firm Manager UI both read from this single resolver so the
 * advisor session and the management screen can never disagree.
 */

const { resolveInheritedRows } = require('./resolveInheritedRows')

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
 * The tags this feature's UI badges rows with. Passed explicitly rather than relying
 * on the shared module's defaults, so a change to those defaults for a newer block
 * can never silently re-label the distinctions screen.
 * @type {{inherited: string, override: string, own: string}}
 */
const DISTINCTION_SOURCE_LABELS = { inherited: 'platform', override: 'firm-override', own: 'firm-own' }

/**
 * Build a firm's effective distinction list from the platform rows and the firm's
 * changes. Order: platform rows first (in their original order, with declined rows
 * removed and overridden rows swapped in place), then the firm's own rows.
 *
 * Resolution rules (guaranteed by resolveInheritedRows):
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
  return resolveInheritedRows(platformRows, firmState, { sourceLabels: DISTINCTION_SOURCE_LABELS })
}

module.exports = { resolveEffectiveDistinctions }
