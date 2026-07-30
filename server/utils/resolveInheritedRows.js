'use strict'

/**
 * @file The one inheritance mechanism every firm-editable block resolves through.
 * @module server/utils/resolveInheritedRows
 *
 * RULED 2026-07-30 (Mike): the Advisory Distinctions mechanism becomes the single
 * firm-editable mechanism everywhere — domain support, logic tables, quizzes, the
 * advisory staircase and the coaching reference all come up to it. This file is that
 * mechanism, lifted out of resolveDistinctions.js and made block-agnostic so the
 * behaviour is defined once instead of re-implemented per block. `resolveDistinctions`
 * is now a thin caller of it and its behaviour is unchanged.
 *
 * A level below receives the level above's rows, modified by what it has done to them:
 *
 *   - declined  : this level switched an inherited row off -> it drops out
 *   - overridden: this level edited an inherited row       -> its version REPLACES the
 *                 original (the two never both appear, so nothing an engine counts per
 *                 row — a score, a boost, a ceiling — can be counted twice)
 *   - own       : this level added a row of its own        -> it comes along
 *
 * WHY A ROW ID IS NON-NEGOTIABLE HERE. Every decision above is keyed to a row's id, so
 * a block whose rows have no stable id cannot use this mechanism: keying on a title
 * means a retitle silently discards the level's decisions and a switched-off row
 * quietly returns, with no error to notice. That is why stable ids were added across
 * the blocks first (`pd-`, `as-`, `cr-`, the domain-support and logic-table ids).
 *
 * TWO LEVELS TODAY, DELIBERATELY. The platform -> firm pair is what exists; the middle
 * management tiers are added here ONCE, later, per the ruled sequencing (unify the
 * mechanism first, then widen it). Nothing outside this file need change when they are.
 *
 * This function is pure — no I/O, no engine coupling, no knowledge of any block. The
 * caller supplies the inherited rows and the level's stored decisions and gets the
 * resolved list back.
 */

/**
 * A row. It must carry an `id`; every other field belongs to the calling block.
 * @typedef {Object} InheritedRow
 * @property {string|number} id - stable identity. NOT a position and NOT a title.
 */

/**
 * What one level has done to the rows it inherited.
 * @typedef {Object} LevelState
 * @property {Array<string|number>} [declinedIds] - inherited ids switched off
 * @property {Object.<string, Object>} [overrides] - edited fields, keyed by the
 *   inherited id they replace (e.g. { 'as-interpretation': { name: 'Insight' } })
 * @property {InheritedRow[]} [ownRows] - rows this level added itself
 */

/**
 * The source tags written onto resolved rows so a UI can badge each one.
 * @typedef {Object} SourceLabels
 * @property {string} inherited - a row taken unchanged from the level above
 * @property {string} override - an inherited row this level has edited
 * @property {string} own - a row this level added
 */

/** Generic defaults. Callers with established tags pass their own (see resolveDistinctions). */
const DEFAULT_SOURCE_LABELS = { inherited: 'platform', override: 'firm-override', own: 'firm-own' }

/**
 * Resolve the effective row list for one level.
 *
 * Order: inherited rows first, in their original order, with declined rows removed and
 * overridden rows swapped in place; then this level's own rows.
 *
 * Resolution rules — each one is a guarantee the callers depend on, not an implementation
 * detail, and each is locked by a test in tests/unit/resolveInheritedRows.test.js:
 *
 *  - a decline beats an override of the same id, so a row switched off stays off even if
 *    a stale override for it survives;
 *  - an override keyed to an id that is not a real inherited row is IGNORED — stored
 *    state can never inject a row that the level above does not have (no phantom rows);
 *  - an override may change a row's editable fields but NEVER its id — the id is identity
 *    and stays pinned to the row it replaces, so a later "the level above changed this"
 *    comparison still knows which row it is about;
 *  - an inherited row with no id is skipped rather than guessed at;
 *  - inputs are never mutated; returned rows are shallow copies.
 *
 * @param {InheritedRow[]} inheritedRows - the rows from the level above
 * @param {LevelState} [levelState] - this level's declines / overrides / own rows
 * @param {Object} [options]
 * @param {SourceLabels} [options.sourceLabels] - tags to write onto resolved rows
 * @returns {Array<InheritedRow & {source: string, overridesId?: string|number}>} the
 *   resolved effective list
 */
function resolveInheritedRows (inheritedRows, levelState, options) {
  const inherited = Array.isArray(inheritedRows) ? inheritedRows : []

  const state = levelState && typeof levelState === 'object' ? levelState : {}
  const declinedIds = new Set(Array.isArray(state.declinedIds) ? state.declinedIds : [])
  const overrides = state.overrides && typeof state.overrides === 'object' && !Array.isArray(state.overrides)
    ? state.overrides
    : {}
  const ownRows = Array.isArray(state.ownRows) ? state.ownRows : []

  const labels = (options && options.sourceLabels) || DEFAULT_SOURCE_LABELS

  const effective = []

  for (const row of inherited) {
    if (!row || row.id === null || row.id === undefined) { continue }
    const id = row.id

    // Declined: this level switched the inherited row off. Decline wins over an
    // override of the same id, so a row stays off until the level re-enables it.
    if (declinedIds.has(id)) { continue }

    const override = Object.prototype.hasOwnProperty.call(overrides, id) ? overrides[id] : null
    if (override && typeof override === 'object' && !Array.isArray(override)) {
      // The level's edited version REPLACES the inherited original — the original is
      // not also emitted, so nothing scored per row can be counted twice. `id` is
      // re-applied AFTER the override spread: identity is never editable.
      effective.push({ ...row, ...override, id, source: labels.override, overridesId: id })
    } else {
      effective.push({ ...row, source: labels.inherited })
    }
  }

  for (const row of ownRows) {
    if (!row || row.id === null || row.id === undefined) { continue }
    effective.push({ ...row, source: labels.own })
  }

  return effective
}

module.exports = { resolveInheritedRows, DEFAULT_SOURCE_LABELS }
