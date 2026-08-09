'use strict'

/**
 * The Advisory Staircase a firm actually works to — the platform steps resolved
 * through that firm's decisions.
 *
 * ONE function, TWO readers, deliberately. The advisor engine reads it to set the
 * complexity ceiling; `GET /api/advisor/staircase` reads it to give the on-screen
 * selector its wording. Until 2026-07-31 the engine blended inline and the selector
 * read the raw platform file, so a firm could rename a step in Firm Manager, save
 * it, and see it in version history while every advisor still chose from Advisor-e's
 * wording. Two readers of one config must never blend it two ways — that is the
 * whole reason this file exists rather than a second copy of three lines.
 *
 * WHAT CHANGED 2026-07-31 (Phase 2 of the one-mechanism ruling). The blend was
 * `deepMerge(BASE, override)`, which replaces the steps array WHOLESALE. That made a
 * firm's saved staircase a frozen private copy: a step Advisor-e later added, or a
 * wording fix it made, could never reach a firm that had customised anything, and
 * there was no way to switch a step off or add one. The staircase now resolves
 * through server/utils/resolveInheritedRows.js — the single firm-editable mechanism —
 * so a step the firm has not touched stays current automatically, while the ones it
 * has edited are protected.
 *
 * A firm that has customised nothing gets the platform base object itself, so
 * behaviour is identical to before for those firms.
 *
 * WHAT CHANGED 2026-08-09 (Phase 5 of the Mentor Hub save-scope plan). A firm's
 * staircase used to resolve against the SHIPPED FILE. The mentor's own edits are
 * stored one level up, under the reserved platform scope — so a step the mentor
 * wrote at /mentor saved correctly, appeared on the mentor's own screen, and
 * reached no firm at all. The base a firm resolves against is now the MENTOR'S
 * RESOLVED STAIRCASE, which is the shipped file resolved through the mentor's own
 * decisions. Same mechanism, applied twice, rather than a second rule for the new
 * tier. design/MENTOR-SAVE-SCOPE-PLAN.md §Phase 4 names this as Phase 5.
 */

const BASE_STAIRCASE = require('../../data/advisory-staircase.json')
const { resolveInheritedRows } = require('./resolveInheritedRows')
const { loadFirmStaircaseState, CONFIG_KEYS } = require('./firmStaircase')
const { PLATFORM_SCOPE, isPlatformScope } = require('./platformScope')

// Kept for callers that reference the whole-config key by name (the Firm Manager
// save route and its version history). It is still the home of defaultCeiling.
const CONFIG_KEY = CONFIG_KEYS.settings

/** How a resolved step is badged for the Firm Manager screen. */
const STAIRCASE_SOURCE_LABELS = { inherited: 'platform', override: 'firm-override', own: 'firm-own' }

/**
 * Renumber the resolved steps 1..n.
 *
 * The `step` number is a POSITION, not an identity — it is what the selector prints
 * ("Step 3: …") and what the engine reads back to find a ceiling. Once a firm can
 * switch a step off or add one, the platform's stored numbers no longer describe the
 * list: declining step 2 would otherwise show the advisor "Step 1, Step 3, Step 4",
 * which reads as a bug. Renumbering keeps the printed list contiguous and keeps the
 * engine's round trip (resolve a step -> take its number -> look the number up in
 * this same list) self-consistent.
 *
 * @param {Array<Object>} steps - resolved rows, in display order
 * @returns {Array<Object>} the same rows with contiguous `step` numbers
 */
function renumber (steps) {
  return steps.map((s, i) => ({ ...s, step: i + 1 }))
}

/**
 * Load a firm's effective staircase.
 *
 * @param {string|null} firmId - the scope to resolve for: a firm id, or the
 *   reserved PLATFORM_SCOPE for the mentor's own level. Taken from the verified JWT
 *   and never from a request body (a body-supplied firmId would be an IDOR — it
 *   would let one firm read another's config).
 * @param {function(string, string): Promise<Object|null>} loadFirmConfig - the
 *   overlay reader, injected rather than imported so the engine reuses the client
 *   it already has and tests need no database. Mirrors loadFirmDomainSupport.
 * @returns {Promise<Object>} the resolved staircase config. Falls back to the layer
 *   above when this level has decided nothing, has no scope id, or the store cannot
 *   be reached. Never rejects: a storage problem must not stop a session or leave
 *   the advisor with no staircase to choose from.
 */
async function loadBlendedStaircase (firmId, loadFirmConfig) {
  if (!firmId) { return BASE_STAIRCASE }

  // The layer this level inherits from. A firm inherits the MENTOR'S resolved
  // staircase, not the shipped file — that is the whole of Phase 5. The mentor
  // inherits the shipped file, which is what ends the recursion: the platform
  // scope is the only level with nothing above it.
  //
  // A store fault one level up is already absorbed there (this function never
  // rejects), so the worst case is a firm resolving against the shipped file —
  // which is exactly the behaviour that shipped before Phase 5.
  const base = isPlatformScope(firmId)
    ? BASE_STAIRCASE
    : await loadBlendedStaircase(PLATFORM_SCOPE, loadFirmConfig)

  let state
  try {
    // The base steps are what the legacy adapter reads identity from, so they must
    // be the MENTOR'S steps: a firm's stored wording for a step the mentor added
    // has no platform row to attach to, and would be discarded as malformed.
    state = await loadFirmStaircaseState(firmId, loadFirmConfig, base.steps)
  } catch (err) {
    // In production an unreachable store is a real fault: log it, serve the base.
    // (In development the state loader falls back to the JSON stand-ins itself, so
    // reaching here at all means production.)
    console.error('[staircase] firm state read failed:', err.message)
    return base
  }

  const hasDecisions = state.declinedIds.length > 0 ||
    Object.keys(state.overrides).length > 0 ||
    state.ownRows.length > 0
  if (!hasDecisions && !state.defaultCeiling) { return base }

  const resolved = renumber(resolveInheritedRows(
    base.steps, state, { sourceLabels: STAIRCASE_SOURCE_LABELS }
  ))

  return {
    ...base,
    defaultCeiling: state.defaultCeiling || base.defaultCeiling,
    // A staircase with no steps is not a customisation, it is a dead end: the advisor
    // would be asked to choose from nothing. Storage should never hold that shape;
    // this is the second lock, matching the route's own fallback.
    steps: resolved.length > 0 ? resolved : renumber(base.steps)
  }
}

/**
 * Resolve the advisor's staircase answer to a step in their firm's staircase.
 *
 * WHAT THE ANSWER LOOKS LIKE. The selector submits its label plus the step's
 * description as ordinary chat text — "Step 3: Interpretation — The conversation
 * has broadened…". That text is what gets stored on the case's decision trace and
 * read back for a returning client, so it is the only identity the engine has.
 * It carries the step's POSITION and its NAME, but no id: the id lives in the data
 * file and cannot travel this route without changing what the advisor types.
 *
 * WHY NAME FIRST. The engine used to take the position number and trust it. Insert
 * or reorder a step in the platform file and every stored "Step 3" silently means a
 * different step — a different complexity ceiling, and different templates
 * recommended, with nothing to notice. Matching the name first survives exactly
 * that: a step that moved from 3 to 4 but kept its name still resolves correctly.
 * It matters more now than when it was written: a firm declining a step renumbers
 * every step below it, so name-first is what carries that firm's stored answers
 * across the change.
 *
 * WHY IT STILL FALLS BACK TO THE NUMBER. A firm renaming a step is the common
 * event — it is the whole point of the Firm Manager tab. After a rename the stored
 * name matches nothing, and refusing to resolve would degrade every returning
 * client of every firm that has ever edited a word. The number is what the engine
 * used before, so the fallback is never worse than the old behaviour; the name
 * match is strictly a gain on top of it.
 *
 * HONEST LIMIT: a step that was BOTH renamed and moved cannot be recovered from
 * this text by any rule, and will resolve by position as it does today. Closing
 * that needs the id to travel with the answer, which belongs with the firm-editable
 * cascade — see tests/unit/advisoryStaircaseRowIds.test.js.
 *
 * @param {string|null} answerText - the advisor's stored staircase answer.
 * @param {Object} [staircase] - the firm's resolved staircase (defaults to the base).
 * @returns {Object|null} the matched step row, or null when nothing matches — the
 *   caller then falls back to the config's defaultCeiling, as it always has.
 */
function resolveStaircaseStep (answerText, staircase = BASE_STAIRCASE) {
  if (!answerText || typeof answerText !== 'string' || answerText === 'pending') { return null }

  const steps = (staircase && Array.isArray(staircase.steps)) ? staircase.steps : []
  if (!steps.length) { return null }

  // No [1-5] here, deliberately: the old pattern could not read a sixth step, so a
  // staircase grown by one silently lost its top rung to the default ceiling.
  const match = /Step\s*(\d+)\s*:?\s*([^\n]*)/i.exec(answerText)
  if (!match) { return null }

  const position = parseInt(match[1], 10)
  // The label runs up to the dash that separates it from the description. Only the
  // FIRST separator is honoured — a description may contain dashes of its own.
  const label = String(match[2] || '').split(/\s[—–-]\s/)[0].trim().toLowerCase()

  if (label) {
    const byName = steps.filter(s => s && typeof s.name === 'string' && s.name.trim().toLowerCase() === label)
    // Only an unambiguous name wins; two steps sharing a name prove nothing.
    if (byName.length === 1) { return byName[0] }
  }

  return steps.find(s => s && s.step === position) || null
}

module.exports = {
  loadBlendedStaircase,
  resolveStaircaseStep,
  CONFIG_KEY,
  BASE_STAIRCASE,
  STAIRCASE_SOURCE_LABELS
}
