'use strict'

/**
 * @file Turn the Firm Manager staircase read into the two lists the tab draws.
 * @module utils/staircaseRows
 *
 * WHY THIS DOES NOT RESOLVE ANYTHING. The merge — which platform step a firm has
 * edited, switched off, or added — is the one firm-editable mechanism, and it lives
 * server-side in `server/utils/resolveInheritedRows.js`. `GET /api/firm-manager/
 * staircase` already sends back the resolved list, and it is the SAME list the
 * advisor's selector and the engine's complexity ceiling read. A second copy of that
 * logic in the browser is precisely how a management screen and a live session come
 * to disagree, so this file re-implements none of it.
 *
 * What it adds is the one thing the resolver deliberately leaves out: the steps the
 * firm has switched OFF. They are absent from the resolved list by design (an advisor
 * must never be offered them), but the manager has to see them to switch one back on.
 * A row that vanishes with no way back reads as data loss.
 *
 * Pure: no I/O, no Vue, no knowledge of how any of it is drawn.
 */

/**
 * The resolver's `source` tag → the badge kind the tab shows. The tab's four kinds
 * mirror the Advisory Distinctions tab's, so a reader who knows that screen knows
 * this one (ruled 2026-07-31).
 * @type {Object.<string, string>}
 */
const KIND_BY_SOURCE = {
  platform: 'platform',
  'firm-override': 'customised',
  'firm-own': 'firm-own'
}

/**
 * Split the staircase into the steps that are live and the steps switched off.
 *
 * @param {Array<Object>} resolvedSteps - `resolved` from the GET: the firm's effective
 *   steps, already renumbered 1..n and tagged with `source`. A firm that has decided
 *   nothing gets the platform steps with no `source` at all — those read as platform.
 * @param {Array<Object>} baseSteps - Advisor-e's steps, the only place a switched-off
 *   step's wording still exists (the firm's own edit of it, if any, is not shown: what
 *   comes back on is Advisor-e's current version).
 * @param {Array<string>} declinedIds - the platform ids this firm switched off.
 * @param {Array<string>} [driftIds] - edited steps the platform has changed since the
 *   firm last stated its version. Those rows carry `hasUpdate`, which is what puts a
 *   Review update button on them, and `platformVersion` — the platform's current
 *   wording — for the side-by-side compare.
 * @returns {{live: Array<Object>, switchedOff: Array<Object>}} each row carries a
 *   `kind` of 'platform' | 'customised' | 'firm-own' | 'declined'.
 */
function buildStaircaseRows (resolvedSteps, baseSteps, declinedIds, driftIds) {
  const resolved = Array.isArray(resolvedSteps) ? resolvedSteps : []
  const base = Array.isArray(baseSteps) ? baseSteps : []
  const declined = new Set(Array.isArray(declinedIds) ? declinedIds : [])
  const drifted = new Set(Array.isArray(driftIds) ? driftIds : [])
  const byId = new Map(base.filter(s => s && s.id !== null && s.id !== undefined).map(s => [s.id, s]))

  const live = resolved
    .filter(row => row && row.id !== null && row.id !== undefined)
    // A declined id should never reach here — the resolver drops it. Filtering anyway
    // costs nothing and stops inconsistent storage from drawing one step in both
    // lists, where switching it "off" from the top list would look like it did nothing.
    .filter(row => !declined.has(row.id))
    .map((row) => {
      const kind = KIND_BY_SOURCE[row.source] || 'platform'
      // Only an EDITED step can have an update to review: a step the firm has not
      // touched already takes the platform's new wording, so there is nothing to
      // choose between. Flagging one would offer a decision that has been made.
      const hasUpdate = kind === 'customised' && drifted.has(row.id)
      return {
        ...row,
        kind,
        hasUpdate,
        // The platform's CURRENT version, for the side-by-side compare. Carried on the
        // row so the panel never has to re-look-up an id and risk showing one step's
        // wording beside another's.
        platformVersion: hasUpdate ? (byId.get(row.id) || null) : null
      }
    })

  const switchedOff = base
    .filter(row => row && row.id !== null && row.id !== undefined && declined.has(row.id))
    // No `step` number is carried through: the numbers belong to the live list, and a
    // switched-off step showing "Step 3" beside a live list that runs 1, 2, 3 would
    // claim a position it does not hold.
    .map(row => ({ ...row, step: null, kind: 'declined' }))

  return { live, switchedOff }
}

/**
 * The fields the edit form collects. Mirrors EDITABLE_STEP_FIELDS on the backend,
 * which is the side that enforces it — `id` and `step` are identity and position and
 * are not the firm's to send.
 * @type {string[]}
 */
const EDIT_FIELDS = ['name', 'selectorDescription', 'complexityCeiling']

/**
 * Work out what to send when a firm saves an edit to one of Advisor-e's steps.
 *
 * SEND ONLY WHAT CHANGED. The save route records exactly the fields it receives, and a
 * recorded field stops tracking Advisor-e's wording for good. Posting the whole form
 * would therefore freeze the two fields the firm never touched at today's text — the
 * firm renames one step and silently stops receiving improvements to the other two.
 * That is the defect the whole mechanism exists to prevent, and it would come back at
 * the browser rather than the store.
 *
 * WHEN NOTHING DIFFERS, THE ANSWER IS RESET, NOT SAVE. A firm that edits its version
 * back to Advisor-e's wording in every field is asking for Advisor-e's step again, and
 * only dropping the override delivers that — a save of identical text would leave the
 * row frozen at wording that merely happens to match today.
 *
 * HONEST LIMIT: the routes merge, so a single field cannot be un-overridden on its own.
 * A firm wanting that presses Reset to platform and edits again. Adding a
 * remove-one-field verb for a case no one has hit yet would be guessing.
 *
 * @param {Object} form - the edit form's values
 * @param {Object|null} platformRow - Advisor-e's current version of this step, or null
 *   for a step the firm owns (nothing to track, so everything is sent)
 * @param {boolean} [isCustomised] - whether this firm already holds an override of the
 *   step. Without it, a manager who opened Edit on an untouched step and changed
 *   nothing would fire a reset and be told their version had been discarded.
 * @returns {{action: string, body: Object}} action is 'save' (PUT the body), 'reset'
 *   (DELETE the override) or 'none' (nothing to do)
 */
function buildStepEdit (form, platformRow, isCustomised) {
  const src = (form && typeof form === 'object') ? form : {}
  const body = {}
  for (const field of EDIT_FIELDS) {
    const value = typeof src[field] === 'string' ? src[field].trim() : src[field]
    if (value === undefined) { continue }
    if (!platformRow || value !== platformRow[field]) { body[field] = value }
  }

  if (Object.keys(body).length > 0) { return { action: 'save', body } }
  // Every field now matches Advisor-e's. If the firm holds an override, this is a
  // reset; if it does not, they changed nothing and there is nothing to send.
  return { action: isCustomised ? 'reset' : 'none', body: {} }
}

module.exports = { buildStaircaseRows, buildStepEdit, KIND_BY_SOURCE, EDIT_FIELDS }
