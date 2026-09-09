'use strict'

/**
 * @file The BUSINESS-ENTITY LEVEL of the observation-point cascade — "how I run meetings
 * with THIS client". The bottom of the cascade, where it ends at the client the meeting is
 * with.
 * @module server/utils/meetingObservationsEntity
 *
 * Design: `design/mockups/meeting-preset-client-level.html`, drawn 2026-09-10, all five of
 * its questions ruled by Mike the same day. It is the second half of slice 4 of
 * `design/MEETING-TYPES-CASCADE.md` §7; the advisor's own level is the first half and lives
 * in `meetingObservationsAdvisor.js`, which this file follows shape for shape.
 *
 * 🔴 THE FIVE RULINGS, EACH OF WHICH SHAPES THE CODE BELOW:
 *
 *   1. ONE SHARED LIST PER CLIENT, not one per advisor per client — *"a firms internal
 *      proceedings will determine who meets with them but at least everyone is on the same
 *      page"*. So the row is keyed by the CLIENT id alone, and every advisor in the firm
 *      reads and writes the same row.
 *   2. THE CLIENT LIST CANNOT PUT BACK A POINT AN ADVISOR SET ASIDE FOR THEMSELVES — *"the
 *      person responsible for completing that task should be the one to take it off"*. This
 *      is structural, not a check: `applyEntityLayer` runs AFTER the advisor's layer and can
 *      only remove or add, so a point the advisor already removed is not there to restore.
 *   3. ANY ADVISOR IN THE FIRM MAY EDIT IT. The app holds no record of which advisor is
 *      responsible for a client, so a rule saying "only the responsible advisor" is one the
 *      software would have to fake.
 *   4. EVERY ENTRY NAMES WHO SET IT, always. A shared list without the name leaves an
 *      advisor asking "who took that off?" with no answer — the exact failure D1 was ruled
 *      to prevent. The name and id are captured at write time from the verified token,
 *      because this app holds no advisors table to join a name out of later.
 *   5. NO MANAGER SCREEN. A firm manager opens the same pre-set screen, or Advisor-e's own
 *      view-as-advisor. D2 holds in substance without a screen of its own.
 *
 * 🔴 WHY A CLIENT IS NOT A SCOPE, same as the advisor: `firm_id` is a foreign key to
 * `firms`, so a scope id per client would mean inventing a fake firm for every client a
 * firm has (MEETING-TYPES-CASCADE.md §5). The client's decisions live on the FIRM'S OWN row
 * under keys naming the client — no schema change, and another firm cannot address them.
 *
 * ⚠ TWO CONFIG KEYS, NOT ONE, for the reason the advisor level gives: a decline write must
 * not be able to clobber a point somebody added a moment earlier, and one row per client
 * gives each key one writer at a time (item 4.75).
 *
 * Node 14, CommonJS.
 */

const {
  validateAdvisorPoint,
  SOURCE_TIER_LABELS: ADVISOR_SOURCE_TIER_LABELS,
  MAX_OWN_POINTS_PER_SCENARIO
} = require('./meetingObservationsAdvisor')

/**
 * The overlay addresses a client's shared list is stored under — on the FIRM'S row.
 *
 * 🔴 KEY PREFIXES, NOT KEYS. One row per client, and the client id is part of the address:
 * `meeting-observation-entity-own:client-42`. Build one with `entityConfigKey`, never by hand.
 *
 *   meeting-observation-entity-declines:<clientId>
 *     { scenarios: { scenarioId: [ {id, byId, byName, at} ] } }
 *   meeting-observation-entity-own:<clientId>
 *     { scenarios: { scenarioId: [ {id, text, hintWords, cannotHear, byId, byName, at} ] }, nextSeq }
 *
 * @type {Object.<string, string>}
 */
const CONFIG_KEYS = {
  entityDeclines: 'meeting-observation-entity-declines',
  entityOwn: 'meeting-observation-entity-own'
}

/** Same separator as the advisor level and the reserved scope ids. */
const KEY_SEPARATOR = ':'

/**
 * The most client-id characters that reach a config key. `config_key` is `VARCHAR(128)`
 * and the longer prefix is 35 characters; `va_clients.id` is shorter than this in practice.
 */
const MAX_CLIENT_ID_LENGTH = 64

/** Dev-only stand-ins, used when there is no MySQL. Same gate as every sibling. */
const DEV_FILES = {
  entityDeclines: 'data/dev-meeting-observation-entity-declines.json',
  entityOwn: 'data/dev-meeting-observation-entity-own.json'
}

/**
 * The prefix a client-level point is minted under.
 *
 * ⚠ Must collide with none of `mo-`, `mm-`, `xm-`, `gm-`, `fm-` (the manager tiers) or
 * `ao-` (the advisor's own), because the prefix is how a point's badge is decided.
 */
const ENTITY_POINT_PREFIX = 'eo-'

/** The `source` stamped on a client-level point, and the tier the screen colours it by. */
const ENTITY_SOURCE = 'for-this-client'
const ENTITY_TIER = 'client'

/**
 * The approved label stem for a client-level point. The name is appended by
 * `entitySourceLabel`, because question 4 ruled that every entry names who set it.
 */
const ENTITY_LABEL_STEM = 'For this client'

/** The label suffix on a point set aside for this client, before the name. */
const SET_ASIDE_STEM = 'off for this client'

/** How a stored name or id is read: trimmed, capped, or null. Never an empty string. */
function readName (value) {
  if (typeof value !== 'string') { return null }
  const trimmed = value.trim().slice(0, 128)
  return trimmed || null
}

/** An ISO timestamp as stored, or null. Not validated beyond being a string — it is display only. */
function readAt (value) {
  return (typeof value === 'string' && value) ? value.slice(0, 40) : null
}

/**
 * The config key one client's list lives at.
 *
 * @param {'entityDeclines'|'entityOwn'} part
 * @param {string} clientId - a client of the caller's firm, already checked against the register
 * @returns {string|null} null when there is no client to key on
 */
function entityConfigKey (part, clientId) {
  const prefix = CONFIG_KEYS[part]
  if (!prefix) { return null }
  const id = typeof clientId === 'string' ? clientId.trim() : ''
  if (!id) { return null }
  return prefix + KEY_SEPARATOR + id.slice(0, MAX_CLIENT_ID_LENGTH)
}

/**
 * The client id inside a config key, or null when the key is not one of these.
 * Used by the dev-file fallback, which has one flat file per part.
 *
 * @param {string} key
 * @returns {string|null}
 */
function entityIdFromKey (key) {
  const k = typeof key === 'string' ? key : ''
  let found = null
  Object.keys(CONFIG_KEYS).forEach((part) => {
    if (found) { return }
    const prefix = CONFIG_KEYS[part] + KEY_SEPARATOR
    if (k.indexOf(prefix) === 0 && k.length > prefix.length) { found = k.slice(prefix.length) }
  })
  return found
}

/**
 * Who set an entry, as stored: `{ byId, byName, at }`, each null when absent.
 *
 * @param {*} row
 * @returns {{byId: (string|null), byName: (string|null), at: (string|null)}}
 */
function readSetBy (row) {
  return {
    byId: readName(row && row.byId),
    byName: readName(row && row.byName),
    at: readAt(row && row.at)
  }
}

/**
 * The stored declines for one client, keeping only what is well-formed.
 *
 * A decline is an OBJECT here, not a bare id as it is at the advisor level, because
 * question 4 requires the name of whoever set it aside. A bare string is still accepted and
 * read as a decline by nobody named, so a hand-edited dev file does not lose a decision.
 *
 * @param {*} stored
 * @returns {{scenarios: Object.<string, Array.<{id: string, byId: (string|null), byName: (string|null), at: (string|null)}>>}}
 */
function readEntityDeclines (stored) {
  const scenarios = {}
  const src = (stored && typeof stored === 'object' && !Array.isArray(stored) &&
    stored.scenarios && typeof stored.scenarios === 'object' && !Array.isArray(stored.scenarios))
    ? stored.scenarios
    : {}
  Object.keys(src).forEach((scenarioId) => {
    if (!Array.isArray(src[scenarioId])) { return }
    const seen = new Set()
    const rows = []
    src[scenarioId].forEach((r) => {
      const id = typeof r === 'string' ? r : (r && typeof r === 'object' ? r.id : null)
      if (typeof id !== 'string' || !id || seen.has(id)) { return }
      seen.add(id)
      rows.push({ id, ...readSetBy(typeof r === 'object' ? r : null) })
    })
    if (rows.length) { scenarios[scenarioId] = rows }
  })
  return { scenarios }
}

/**
 * The stored client-level points for one client, keeping only what is well-formed.
 *
 * @param {*} stored
 * @returns {{scenarios: Object.<string, object[]>, nextSeq: Object.<string, number>}}
 */
function readEntityOwn (stored) {
  const scenarios = {}
  const nextSeq = {}
  const entry = (stored && typeof stored === 'object' && !Array.isArray(stored)) ? stored : {}
  const src = (entry.scenarios && typeof entry.scenarios === 'object' && !Array.isArray(entry.scenarios))
    ? entry.scenarios
    : {}
  Object.keys(src).forEach((scenarioId) => {
    if (!Array.isArray(src[scenarioId])) { return }
    const rows = src[scenarioId]
      .filter(r => r && typeof r === 'object' && typeof r.id === 'string' && r.id)
      .map((r) => {
        const { value } = validateAdvisorPoint(
          { text: r.text, hintWords: r.hintWords, cannotHear: Boolean(r.cannotHear) }, {})
        return {
          id: r.id,
          text: value.text,
          hintWords: value.hintWords || [],
          cannotHear: Boolean(value.cannotHear),
          ...readSetBy(r)
        }
      })
      .filter(r => typeof r.text === 'string' && r.text)
      .slice(0, MAX_OWN_POINTS_PER_SCENARIO)
    if (rows.length) { scenarios[scenarioId] = rows }
  })
  const seqSrc = (entry.nextSeq && typeof entry.nextSeq === 'object' && !Array.isArray(entry.nextSeq))
    ? entry.nextSeq
    : {}
  Object.keys(seqSrc).forEach((scenarioId) => {
    const n = seqSrc[scenarioId]
    if (Number.isInteger(n) && n > 0) { nextSeq[scenarioId] = n }
  })
  return { scenarios, nextSeq }
}

/**
 * The approved source line for a client-level point: "For this client · added by Tom Boyd".
 * With no name held: "For this client · added by an advisor whose name we do not hold" — the
 * advisor level's own wording for the same gap.
 *
 * @param {{byName: (string|null)}} row
 * @returns {string}
 */
function entitySourceLabel (row) {
  const who = (row && row.byName) ? row.byName : 'an advisor whose name we do not hold'
  return ENTITY_LABEL_STEM + ' · added by ' + who
}

/**
 * The suffix on a set-aside point: "off for this client · set aside by Ruth Kelleher".
 *
 * @param {{byName: (string|null)}} row
 * @returns {string}
 */
function setAsideLabel (row) {
  const who = (row && row.byName) ? row.byName : 'an advisor whose name we do not hold'
  return SET_ASIDE_STEM + ' · set aside by ' + who
}

/**
 * The points in force for ONE advisor meeting ONE client, in one meeting type.
 *
 * 🔴 APPLIED ON TOP OF THE ADVISOR'S LAYER, NEVER INSTEAD OF IT. The input is what
 * `applyAdvisorLayer` produced — the firm's list with this advisor's own set-asides and
 * additions already applied. This layer can only REMOVE (the client's declines) and ADD
 * (the client's own points). It cannot put back a point the advisor set aside for
 * themselves, because that point is not in the input. That is question 2, ruled by Mike on
 * 2026-09-10, held by the shape of the call rather than by a check somebody could forget.
 *
 * ⚠ NEVER REJECTS AND NEVER RETURNS NOTHING. Unusable client state leaves the advisor's
 * list standing — an advisor with no list cannot walk into the meeting holding one.
 *
 * @param {Array<object>} advisorPoints - from `applyAdvisorLayer`, each carrying `sourceTier`
 * @param {{declines: object[], own: object[]}} entityState - this client, this scenario
 * @returns {Array<object>}
 */
function applyEntityLayer (advisorPoints, entityState) {
  const base = Array.isArray(advisorPoints) ? advisorPoints : []
  const state = entityState && typeof entityState === 'object' ? entityState : {}
  const declined = new Set((Array.isArray(state.declines) ? state.declines : [])
    .map(d => (typeof d === 'string' ? d : (d && d.id)))
    .filter(id => typeof id === 'string' && id))

  const kept = base.filter(p => p && !declined.has(p.id))

  const own = (Array.isArray(state.own) ? state.own : [])
    .filter(r => r && typeof r.id === 'string' && r.id && typeof r.text === 'string' && r.text)
    .map(r => ({
      id: r.id,
      text: r.text,
      hintWords: Array.isArray(r.hintWords) ? r.hintWords : [],
      cannotHear: Boolean(r.cannotHear),
      source: ENTITY_SOURCE,
      sourceTier: ENTITY_TIER,
      sourceLabel: entitySourceLabel(r),
      setBy: { byId: r.byId || null, byName: r.byName || null, at: r.at || null }
    }))

  return kept.concat(own)
}

/**
 * The points set aside for this client, so the screen can offer them back — shown rather
 * than hidden, for the reason every level above carries.
 *
 * Only points that are still in the advisor's list are offered: a decline for a point the
 * firm has since removed, or that this advisor has set aside for themselves, is not shown.
 * The stored decline survives — the firm may put the point back.
 *
 * @param {Array<object>} advisorPoints - from `applyAdvisorLayer`
 * @param {object[]} declines - from `readEntityDeclines`, one scenario
 * @returns {Array<object>} points carrying `sourceTier`, `sourceLabel`, `setAsideLabel` and `setBy`
 */
function entitySetAsidePoints (advisorPoints, declines) {
  const byId = {}
  ;(Array.isArray(declines) ? declines : []).forEach((d) => {
    const id = typeof d === 'string' ? d : (d && d.id)
    if (typeof id === 'string' && id && !byId[id]) { byId[id] = typeof d === 'object' ? d : {} }
  })
  if (!Object.keys(byId).length) { return [] }
  return (Array.isArray(advisorPoints) ? advisorPoints : [])
    .filter(p => p && byId[p.id])
    .map((p) => {
      const d = byId[p.id]
      return {
        ...p,
        setAsideLabel: setAsideLabel(d),
        setBy: { byId: d.byId || null, byName: d.byName || null, at: d.at || null }
      }
    })
}

/**
 * Mint the next client-level point id for one client in one scenario.
 *
 * Same high-water-mark rule as `nextAdvisorPointId`, for the same reason: a removed point's
 * id must never be handed to the next one written, or a coaching report stored against the
 * old point would read as a report about the new one.
 *
 * ⚠ The client id is NOT part of the point id: the rows are keyed by client, so two clients
 * can both hold `eo-1` and never meet. A client id inside a point id would put it into every
 * coaching report that quotes the point.
 *
 * @param {Array<object>} existingOwnRows
 * @param {number} [lastSeq]
 * @returns {{id: string, seq: number}}
 */
function nextEntityPointId (existingOwnRows, lastSeq) {
  const used = (Array.isArray(existingOwnRows) ? existingOwnRows : [])
    .map(r => (r && typeof r.id === 'string' && r.id.indexOf(ENTITY_POINT_PREFIX) === 0)
      ? parseInt(r.id.slice(ENTITY_POINT_PREFIX.length), 10)
      : NaN)
    .filter(n => Number.isInteger(n) && n > 0)
  const highestHeld = used.length ? Math.max(...used) : 0
  const mark = (Number.isInteger(lastSeq) && lastSeq > 0) ? lastSeq : 0
  const seq = Math.max(highestHeld, mark) + 1
  return { id: ENTITY_POINT_PREFIX + seq, seq }
}

/**
 * The tier labels an advisor is shown, with the client level added to the advisor level's
 * three. Exported so the screen and the tests read one table.
 *
 * @type {Object.<string, string>}
 */
const SOURCE_TIER_LABELS = { ...ADVISOR_SOURCE_TIER_LABELS, [ENTITY_TIER]: ENTITY_LABEL_STEM }

module.exports = {
  CONFIG_KEYS,
  KEY_SEPARATOR,
  MAX_CLIENT_ID_LENGTH,
  DEV_FILES,
  ENTITY_POINT_PREFIX,
  ENTITY_SOURCE,
  ENTITY_TIER,
  SOURCE_TIER_LABELS,
  MAX_OWN_POINTS_PER_SCENARIO,
  entityConfigKey,
  entityIdFromKey,
  readEntityDeclines,
  readEntityOwn,
  entitySourceLabel,
  setAsideLabel,
  applyEntityLayer,
  entitySetAsidePoints,
  nextEntityPointId
}
