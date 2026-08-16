'use strict'

/**
 * @file Turn the Firm Manager coaching read into the two lists the tab draws.
 * @module utils/coachingRows
 *
 * WHY THIS DOES NOT RESOLVE ANYTHING. The merge — which platform entry a firm has
 * edited, switched off, or added — is the one firm-editable mechanism, and it lives
 * server-side in `server/utils/resolveInheritedRows.js`. `GET /api/firm-manager/
 * coaching` already sends back the resolved list, and it is the SAME list
 * `server/utils/coaching.js` renders into the prompt that chooses a template. A second
 * copy of that logic in the browser is precisely how a management screen and a live
 * session come to disagree, so this file re-implements none of it.
 *
 * What it adds is the one thing the resolver deliberately leaves out: the entries the
 * firm has switched OFF. They are absent from the resolved list by design, but the
 * manager has to see them to switch one back on. A row that vanishes with no way back
 * reads as data loss.
 *
 * ONE DIFFERENCE FROM utils/staircaseRows.js, and it is an absence rather than a
 * variation: there is no `driftIds`. The staircase stamps the platform wording a firm
 * edited against, so it can offer Adopt / Keep mine when that wording later changes.
 * `server/utils/coachingConfig.js` stores no such baseline, so this screen cannot
 * honestly claim anything changed, and it does not pretend to.
 *
 * Pure: no I/O, no Vue, no knowledge of how any of it is drawn.
 */

/**
 * The resolver's `source` tag → the badge kind the tab shows. The four kinds mirror the
 * Advisory Staircase and Advisory Distinctions tabs, so a reader who knows those screens
 * knows this one (ruled 2026-07-31).
 * @type {Object.<string, string>}
 */
const KIND_BY_SOURCE = {
  platform: 'platform',
  'firm-override': 'customised',
  'firm-own': 'firm-own'
}

/**
 * The fields the edit form collects. Mirrors EDITABLE_COACHING_FIELDS on the backend,
 * which is the side that enforces it.
 *
 * `template` is absent on purpose: it names a template in the library, and letting a
 * firm retitle an inherited entry would leave Advisor-e's id attached to guidance
 * pointing somewhere else. A firm's OWN entry carries it — see OWN_EDIT_FIELDS.
 * @type {string[]}
 */
const EDIT_FIELDS = ['howItHelps', 'whatToLookFor', 'whereMayLead', 'deliveryNotes', 'scenarios']

/**
 * The fields an entry the firm added itself collects. Its template IS editable: no
 * platform id sits behind it pointing at wording that has moved.
 * @type {string[]}
 */
const OWN_EDIT_FIELDS = ['template', ...EDIT_FIELDS]

/**
 * Split the coaching reference into the entries that are live and those switched off.
 *
 * @param {Array<Object>} resolvedRows - `resolved` from the GET: the firm's effective
 *   entries, already tagged with `source`. A firm that has decided nothing gets the
 *   platform entries with no `source` at all — those read as platform.
 * @param {Array<Object>} baseRows - Advisor-e's entries. A switched-off row is drawn
 *   from these and shows ADVISOR-E'S wording even where the firm has edited the entry.
 *   That is a display choice, not a statement about what is stored: the firm's edit
 *   survives and comes back with the entry. Showing a firm's private wording under an
 *   entry it has switched off would suggest that wording was doing something. It is
 *   not. `hasFirmEdit` is what tells the reader the edit is still held.
 * @param {Array<string>} declinedIds - the platform ids this firm switched off.
 * @param {Array<string>} [overriddenIds] - the platform ids this firm holds an edit for.
 *   Only used for the switched-off list: a live row already declares an edit through its
 *   `customised` kind, but a switched-off row is built from the platform entry and would
 *   otherwise give a firm no way to tell that its version is still being held.
 * @returns {{live: Array<Object>, switchedOff: Array<Object>}} each row carries a `kind`
 *   of 'platform' | 'customised' | 'firm-own' | 'declined'; switched-off rows
 *   additionally carry `hasFirmEdit`.
 */
function buildCoachingRows (resolvedRows, baseRows, declinedIds, overriddenIds) {
  const resolved = Array.isArray(resolvedRows) ? resolvedRows : []
  const base = Array.isArray(baseRows) ? baseRows : []
  const declined = new Set(Array.isArray(declinedIds) ? declinedIds : [])
  const overridden = new Set(Array.isArray(overriddenIds) ? overriddenIds : [])

  const live = resolved
    .filter(row => row && row.id !== null && row.id !== undefined)
    // A declined id should never reach here — the resolver drops it. Filtering anyway
    // costs nothing and stops inconsistent storage from drawing one entry in both
    // lists, where switching it "off" from the top list would look like it did nothing.
    .filter(row => !declined.has(row.id))
    .map(row => ({ ...row, kind: KIND_BY_SOURCE[row.source] || 'platform' }))

  const switchedOff = base
    .filter(row => row && row.id !== null && row.id !== undefined && declined.has(row.id))
    .map(row => ({ ...row, kind: 'declined', hasFirmEdit: overridden.has(row.id) }))

  return { live, switchedOff }
}

/**
 * Are two scenario lists the same, in the same order?
 *
 * Order matters and is not sorted away: the list is rendered into the prompt in the
 * order it is stored, so a firm that reorders its situations has made a change.
 *
 * @param {*} a
 * @param {*} b
 * @returns {boolean}
 */
function sameScenarios (a, b) {
  const left = Array.isArray(a) ? a : []
  const right = Array.isArray(b) ? b : []
  return left.length === right.length && left.every((item, i) => item === right[i])
}

/**
 * Work out what to send when a firm saves an edit to one of Advisor-e's entries.
 *
 * SEND ONLY WHAT CHANGED. The save route records exactly the fields it receives, and a
 * recorded field stops tracking Advisor-e's wording for good. Posting the whole form
 * would therefore freeze the four fields the firm never touched at today's text — the
 * firm rewrites one and silently stops receiving improvements to the rest. That is the
 * defect the whole mechanism exists to prevent, and it would come back at the browser
 * rather than the store.
 *
 * WHEN NOTHING DIFFERS, THE ANSWER IS RESET, NOT SAVE. A firm that edits its version
 * back to Advisor-e's wording in every field is asking for Advisor-e's entry again, and
 * only dropping the override delivers that — a save of identical text would leave the
 * row frozen at wording that merely happens to match today.
 *
 * BLANK SCENARIOS ARE DROPPED HERE AS WELL AS ON THE ROUTE. The form always carries one
 * empty box for the next situation, so without this every save would differ from the
 * platform by one empty string and a firm that changed nothing would still be recorded
 * as having overridden the entry.
 *
 * @param {Object} form - the edit form's values
 * @param {Object|null} platformRow - Advisor-e's current version of this entry, or null
 *   for an entry the firm owns (nothing to track, so everything is sent)
 * @param {boolean} [isCustomised] - whether this firm already holds an override. Without
 *   it, a manager who opened Edit on an untouched entry and changed nothing would fire a
 *   reset and be told their version had been discarded.
 * @returns {{action: string, body: Object}} action is 'save' (PUT the body), 'reset'
 *   (DELETE the override) or 'none' (nothing to do)
 */
function buildCoachingEdit (form, platformRow, isCustomised) {
  const src = (form && typeof form === 'object') ? form : {}
  const body = {}

  for (const field of EDIT_FIELDS) {
    if (field === 'scenarios') {
      if (src.scenarios === undefined) { continue }
      const cleaned = (Array.isArray(src.scenarios) ? src.scenarios : [])
        .map(s => (typeof s === 'string' ? s.trim() : s))
        .filter(s => typeof s === 'string' && s.length > 0)
      if (!platformRow || !sameScenarios(cleaned, platformRow.scenarios)) {
        body.scenarios = cleaned
      }
      continue
    }
    const value = typeof src[field] === 'string' ? src[field].trim() : src[field]
    if (value === undefined) { continue }
    // A platform entry that omits a field entirely (deliveryNotes on fourteen of the
    // fifteen) compares against '' rather than undefined, or an untouched empty box
    // would read as a change on every single save.
    const platformValue = platformRow
      ? (platformRow[field] === null || platformRow[field] === undefined ? '' : platformRow[field])
      : undefined
    if (!platformRow || value !== platformValue) { body[field] = value }
  }

  if (Object.keys(body).length > 0) { return { action: 'save', body } }
  return { action: isCustomised ? 'reset' : 'none', body: {} }
}

/**
 * The whole body for an entry the firm owns — no diffing, because there is no platform
 * version behind it to keep tracking.
 *
 * @param {Object} form - the edit form's values
 * @returns {Object} the body to POST or PUT
 */
function buildOwnCoachingBody (form) {
  const src = (form && typeof form === 'object') ? form : {}
  const body = {}
  for (const field of OWN_EDIT_FIELDS) {
    if (field === 'scenarios') {
      body.scenarios = (Array.isArray(src.scenarios) ? src.scenarios : [])
        .map(s => (typeof s === 'string' ? s.trim() : s))
        .filter(s => typeof s === 'string' && s.length > 0)
      continue
    }
    body[field] = typeof src[field] === 'string' ? src[field].trim() : ''
  }
  return body
}

module.exports = {
  buildCoachingRows,
  buildCoachingEdit,
  buildOwnCoachingBody,
  sameScenarios,
  KIND_BY_SOURCE,
  EDIT_FIELDS,
  OWN_EDIT_FIELDS
}
