'use strict'

/**
 * @file The ADVISOR'S OWN LEVEL of the observation-point cascade — "how I run my meetings".
 * @module server/utils/meetingObservationsAdvisor
 *
 * Design: `design/mockups/meeting-preset-advisor-level.html`, drawn 2026-09-08, all six of
 * its questions ruled by Mike the same day and the drawing itself approved to build from.
 * It is the first half of slice 4 of `design/MEETING-TYPES-CASCADE.md` §7; the per-CLIENT
 * half is not built and is not drawn.
 *
 * 🔴 WHY THIS IS A SEPARATE FILE FROM `meetingObservations.js`. Every level above the
 * advisor is a SCOPE — a row in `firms`, reached through `parentScopeOf`. An advisor is not
 * a scope and can never be one: `firm_id` is a foreign key to `firms`, so a scope id per
 * advisor would mean inventing a fake firm for every advisor a firm employs
 * (MEETING-TYPES-CASCADE.md §5). So this layer is applied ON TOP of the resolved firm list
 * rather than being another turn of the same recursion, and keeping it in its own file is
 * what stops a later reader assuming the tier chain runs one level deeper than it does.
 *
 * ⚠ TWO CONFIG KEYS, NOT THE ONE §5 SKETCHED — a named deviation from the approved design,
 * put to Mike on 2026-09-08 before the build and approved. §5 proposed a single
 * `meeting-observation-advisor` key holding `{declines, overrides, own}` per advisor. Two
 * separate keys instead, because that is what every sibling in this app already does
 * (`firmStaircase.CONFIG_KEYS`, `meetingObservations.CONFIG_KEYS`, `meetingTypes.CONFIG_KEYS`)
 * and because a decline write then cannot clobber a point the advisor added a moment
 * earlier. Same storage location, same firm row, no schema change.
 *
 * ⚠ NO OVERRIDES KEY, AND THAT IS THE DESIGN. An advisor may switch an inherited point off
 * or add one of their own; they may NOT rewrite the firm's words. Editing an inherited
 * point's wording would be editing the firm's list — the thing P14 forbids — and the
 * manager screens offer "Use the inherited wording" rather than a free edit for the same
 * reason one level up.
 *
 * 🔴 THE ADVISOR'S NAME IS CAPTURED AT WRITE TIME, from their own verified JWT, and stored
 * beside their decisions. This is not convenience: **this application holds no advisors
 * table** — `config/db-schema.sql` says so four times ("advisors table belongs to the
 * Advisor-e platform", "this app holds no advisors table to join against") — so there is
 * nothing to join a name out of later. It is the same pattern `advisor_va_sessions.advisor_name`
 * already uses, for the same reason.
 *
 * Node 14, CommonJS.
 */

const { resolveInheritedRows } = require('./resolveInheritedRows')
const {
  PLATFORM_POINT_PREFIX,
  POINT_PREFIX_BY_TIER,
  OBSERVATION_SOURCE_LABELS,
  MAX_POINT_LENGTH,
  MAX_HINT_WORDS,
  MAX_HINT_LENGTH
} = require('./meetingObservations')

/**
 * The overlay addresses an advisor's decisions are stored under — on their OWN FIRM'S row.
 *
 *   meeting-observation-advisor-declines
 *     { advisorId: { name, scenarios: { scenarioId: [pointId] } } }
 *   meeting-observation-advisor-own
 *     { advisorId: { name, scenarios: { scenarioId: [ {id, text, hintWords} ] } } }
 *
 * @type {Object.<string, string>}
 */
const CONFIG_KEYS = {
  advisorDeclines: 'meeting-observation-advisor-declines',
  advisorOwn: 'meeting-observation-advisor-own'
}

/** Dev-only stand-ins, used when there is no MySQL. Same gate as every sibling. */
const DEV_FILES = {
  advisorDeclines: 'data/dev-meeting-observation-advisor-declines.json',
  advisorOwn: 'data/dev-meeting-observation-advisor-own.json'
}

/**
 * The prefix an advisor's own points are minted under.
 *
 * ⚠ It must collide with none of `mo-` (platform), `mm-` (mentor), `xm-` (global), `gm-`
 * (group) or `fm-` (firm), because `sourceTierOf` reads the prefix to decide what a point's
 * badge should say. A collision would tell an advisor their firm wrote something they wrote
 * themselves.
 */
const ADVISOR_POINT_PREFIX = 'ao-'

/**
 * How a point is badged on the advisor's own screen.
 *
 * `override` is present and deliberately unreachable: an advisor has no overrides key, so
 * `resolveInheritedRows` can never stamp it. It is declared rather than omitted because the
 * resolver reads all three, and a missing label would silently become `undefined` on screen
 * if an overrides path were ever added without reading this comment.
 */
const ADVISOR_SOURCE_LABELS = {
  inherited: 'inherited',
  override: 'edited-by-you',
  own: 'added-by-you'
}

/**
 * The three source tiers an advisor is shown, and their approved labels.
 *
 * 🔴 THREE, NOT FIVE — Mike's ruling of 2026-09-08 (question 3). A point can come from the
 * mentor, a global brand group, a country group or the firm, and the middle two COLLAPSE
 * into "From your firm": an advisor has no relationship with a brand or a country tier and
 * would read "From the UK group" as a question rather than an answer.
 *
 * @type {Object.<string, string>}
 */
const SOURCE_TIER_LABELS = {
  platform: 'From Advisor-e',
  firm: 'From your firm',
  advisor: 'Added by you'
}

/** Most own points one advisor may hold in one meeting type. */
const MAX_OWN_POINTS_PER_SCENARIO = 20

// ── Reading stored state ─────────────────────────────────────────────────────────────

/** A display name as stored: a trimmed string, or null. Never an empty string. */
function readName (value) {
  if (typeof value !== 'string') { return null }
  const trimmed = value.trim().slice(0, 128)
  return trimmed || null
}

/**
 * Validate one advisor-authored point.
 *
 * Fails closed on shape, and never throws: malformed storage for one point must not stop an
 * advisor opening the screen they are about to walk into a meeting holding.
 *
 * ⚠ `hintWords` IS ACCEPTED HERE, and that is Mike's ruling of 2026-09-08 (question 5)
 * REVERSING the recommendation. The recommendation was to withhold it — an advisor tuning
 * the phrases the AI listens for in their own assessment is marking their own homework. He
 * took the argument recorded against it instead: a point an advisor wrote themselves is the
 * one the model is LEAST likely to recognise, because it is phrased in their words and
 * nobody else's, so withholding the hints would have made their own additions the weakest
 * entries on their own list. The cost is carried, not solved — see the drawing's question 5.
 *
 * @param {*} value - the submitted `{ text, hintWords? }`
 * @param {object} [opts]
 * @param {boolean} [opts.requireText] - true when creating
 * @returns {{ok: boolean, errors: string[], value: object}}
 */
function validateAdvisorPoint (value, opts) {
  const errors = []
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, errors: ['a point must be a JSON object'], value: {} }
  }

  const out = {}
  const allowed = ['text', 'hintWords']
  Object.keys(value).forEach((field) => {
    if (!allowed.includes(field)) { errors.push('unknown field: ' + field) }
  })

  if (value.text !== undefined && value.text !== null) {
    if (typeof value.text !== 'string') {
      errors.push('text must be text')
    } else {
      const trimmed = value.text.trim()
      if (trimmed.length > MAX_POINT_LENGTH) {
        errors.push('text must be ' + MAX_POINT_LENGTH + ' characters or fewer')
      } else if (trimmed) {
        out.text = trimmed
      }
    }
  }

  if (value.hintWords !== undefined && value.hintWords !== null) {
    if (!Array.isArray(value.hintWords)) {
      errors.push('hintWords must be a list')
    } else {
      const words = value.hintWords
        .filter(w => typeof w === 'string')
        .map(w => w.trim())
        .filter(w => w && w.length <= MAX_HINT_LENGTH)
      if (value.hintWords.length > MAX_HINT_WORDS) {
        errors.push('no more than ' + MAX_HINT_WORDS + ' hint phrases')
      } else {
        out.hintWords = words
      }
    }
  }

  if (opts && opts.requireText && !out.text) { errors.push('text is required') }

  return { ok: errors.length === 0, errors, value: out }
}

/**
 * Read the stored declines map, keeping only what is well-formed.
 *
 * @param {*} stored
 * @returns {Object.<string, {name: (string|null), scenarios: Object.<string, string[]>}>}
 */
function readAdvisorDeclines (stored) {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) { return {} }
  const out = {}
  Object.keys(stored).forEach((advisorId) => {
    const entry = stored[advisorId]
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) { return }
    const scenarios = {}
    const src = (entry.scenarios && typeof entry.scenarios === 'object' && !Array.isArray(entry.scenarios))
      ? entry.scenarios
      : {}
    Object.keys(src).forEach((scenarioId) => {
      if (!Array.isArray(src[scenarioId])) { return }
      const ids = src[scenarioId].filter(id => typeof id === 'string' && id)
      if (ids.length) { scenarios[scenarioId] = ids }
    })
    // An advisor with a name but no decisions left is dropped, so the map does not grow a
    // row every time somebody switches a point off and back on again.
    if (Object.keys(scenarios).length) {
      out[advisorId] = { name: readName(entry.name), scenarios }
    }
  })
  return out
}

/**
 * Read the stored own-points map, keeping only what is well-formed.
 *
 * @param {*} stored
 * @returns {Object.<string, {name: (string|null), scenarios: Object.<string, object[]>}>}
 */
function readAdvisorOwn (stored) {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) { return {} }
  const out = {}
  Object.keys(stored).forEach((advisorId) => {
    const entry = stored[advisorId]
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) { return }
    const scenarios = {}
    const src = (entry.scenarios && typeof entry.scenarios === 'object' && !Array.isArray(entry.scenarios))
      ? entry.scenarios
      : {}
    Object.keys(src).forEach((scenarioId) => {
      if (!Array.isArray(src[scenarioId])) { return }
      const rows = src[scenarioId]
        .filter(r => r && typeof r === 'object' && typeof r.id === 'string' && r.id)
        .map((r) => {
          const { value } = validateAdvisorPoint({ text: r.text, hintWords: r.hintWords }, {})
          return { id: r.id, text: value.text, hintWords: value.hintWords || [] }
        })
        .filter(r => typeof r.text === 'string' && r.text)
        .slice(0, MAX_OWN_POINTS_PER_SCENARIO)
      if (rows.length) { scenarios[scenarioId] = rows }
    })

    // The per-scenario high-water mark for minted ids. Kept even where the scenario now
    // holds no rows: an advisor who removes their only point and writes another must not get
    // the first one's id back. See nextAdvisorPointId.
    const nextSeq = {}
    const seqSrc = (entry.nextSeq && typeof entry.nextSeq === 'object' && !Array.isArray(entry.nextSeq))
      ? entry.nextSeq
      : {}
    Object.keys(seqSrc).forEach((scenarioId) => {
      const n = seqSrc[scenarioId]
      if (Number.isInteger(n) && n > 0) { nextSeq[scenarioId] = n }
    })

    if (Object.keys(scenarios).length || Object.keys(nextSeq).length) {
      out[advisorId] = { name: readName(entry.name), scenarios, nextSeq }
    }
  })
  return out
}

/**
 * One advisor's own slice of the two maps, always defined.
 *
 * @param {object} declinesMap - from `readAdvisorDeclines`
 * @param {object} ownMap - from `readAdvisorOwn`
 * @param {string|null} advisorId
 * @returns {{declines: Object.<string, string[]>, own: Object.<string, object[]>}}
 */
function stateForAdvisor (declinesMap, ownMap, advisorId) {
  const none = { declines: {}, own: {} }
  if (!advisorId) { return none }
  const d = declinesMap && declinesMap[advisorId]
  const o = ownMap && ownMap[advisorId]
  return {
    declines: (d && d.scenarios) || {},
    own: (o && o.scenarios) || {}
  }
}

// ── Which tier a point came from ─────────────────────────────────────────────────────

/**
 * The tier an advisor should be told a point came from: `platform`, `firm` or `advisor`.
 *
 * 🔴 IT READS TWO THINGS, AND NEEDS BOTH. The point's id prefix says who CREATED it; the
 * source the firm's own resolution stamped says whether the firm changed it since. A firm
 * that edits a platform point keeps the platform id — identity is never editable — so the
 * prefix alone would tell an advisor "From Advisor-e" about words their own firm wrote.
 * `firmSource` catches exactly that case, and a point a MIDDLE tier added (which reaches the
 * firm marked `inherited`) is caught by its own prefix instead. Neither signal covers both.
 *
 * ⚠ THE FALLBACK IS `firm`, NOT `platform`. An id whose prefix nobody recognises is far more
 * likely to be something written inside the firm's chain than something Advisor-e shipped,
 * and being wrong towards "your firm" sends an advisor to a person who can actually answer.
 *
 * @param {object} point - a resolved point, carrying `id` and `firmSource`
 * @returns {'platform'|'firm'|'advisor'}
 */
function sourceTierOf (point) {
  if (!point) { return 'firm' }
  if (point.source === ADVISOR_SOURCE_LABELS.own) { return 'advisor' }

  const firmSource = point.firmSource
  if (firmSource === OBSERVATION_SOURCE_LABELS.own ||
      firmSource === OBSERVATION_SOURCE_LABELS.override) {
    return 'firm'
  }

  const id = typeof point.id === 'string' ? point.id : ''
  if (id.indexOf(PLATFORM_POINT_PREFIX) === 0) { return 'platform' }
  if (id.indexOf(POINT_PREFIX_BY_TIER.mentor) === 0) { return 'platform' }
  return 'firm'
}

// ── Applying the advisor's layer ─────────────────────────────────────────────────────

/**
 * The points in force for ONE advisor in one meeting type.
 *
 * Applies the advisor's declines and own rows on top of the firm's resolved list, then
 * stamps each surviving point with the tier an advisor is shown.
 *
 * ⚠ NEVER REJECTS AND NEVER RETURNS NOTHING. If the advisor's stored state is unusable the
 * firm's list is what comes back — an advisor with no list cannot walk into the meeting
 * holding one, and Brief §3 says the list pays before a word is recorded.
 *
 * @param {Array<object>} firmPoints - the firm's resolved points, each carrying `source`
 * @param {{declines: string[], own: object[]}} advisorState - this advisor, this scenario
 * @returns {Array<object>} points carrying `source`, `sourceTier` and `sourceLabel`
 */
function applyAdvisorLayer (firmPoints, advisorState) {
  const base = (Array.isArray(firmPoints) ? firmPoints : [])
    // The firm's own badge is carried under a different name BEFORE the advisor's resolution
    // overwrites `source`. Losing it would cost `sourceTierOf` half of what it reads.
    .map(p => ({ ...p, firmSource: p.source }))

  const state = advisorState && typeof advisorState === 'object' ? advisorState : {}

  const resolved = resolveInheritedRows(
    base,
    {
      declinedIds: Array.isArray(state.declines) ? state.declines : [],
      overrides: {},
      ownRows: Array.isArray(state.own) ? state.own : []
    },
    { sourceLabels: ADVISOR_SOURCE_LABELS }
  )

  return resolved.map((p) => {
    const tier = sourceTierOf(p)
    return { ...p, sourceTier: tier, sourceLabel: SOURCE_TIER_LABELS[tier] }
  })
}

/**
 * The inherited points this advisor has set aside, so the screen can offer them back.
 *
 * 🔴 SHOWN RATHER THAN HIDDEN, for the reason already written into the manager's template
 * one level up: somebody who cannot see what they turned off cannot turn it back on, and
 * would read the shorter list as the whole list.
 *
 * A declined id that no longer exists in the firm's list — the firm removed the point since
 * — is dropped rather than rendered as a bare id. The stored decline is left alone: the firm
 * may put the point back, and an advisor's decision about it should survive that.
 *
 * @param {Array<object>} firmPoints - the firm's resolved points
 * @param {string[]} declinedIds
 * @returns {Array<object>} points carrying `sourceTier` and `sourceLabel`
 */
function setAsidePoints (firmPoints, declinedIds) {
  const declined = new Set(Array.isArray(declinedIds) ? declinedIds : [])
  if (!declined.size) { return [] }
  return (Array.isArray(firmPoints) ? firmPoints : [])
    .filter(p => p && declined.has(p.id))
    .map((p) => {
      const tier = sourceTierOf({ ...p, firmSource: p.source })
      return { ...p, sourceTier: tier, sourceLabel: SOURCE_TIER_LABELS[tier] }
    })
}

/**
 * Mint the next own-point id for one advisor in one scenario.
 *
 * 🔴 IT TAKES A STORED HIGH-WATER MARK AS WELL AS THE LIVE ROWS, AND IT NEEDS BOTH. Counting
 * from the ids currently held is not enough: remove the HIGHEST one and the next point added
 * takes its id straight back. A reused id would match the removed point in any coaching
 * report already stored against it — a report about a point the advisor no longer has,
 * reading as a report about the one they have just written. That is a wrong statement about
 * a named person's meeting, and nothing on any screen would look wrong.
 *
 * The mark is carried per scenario in the advisor's own entry (`nextSeq`) and only ever goes
 * up. The live rows are still read, so a mark lost to a hand-edited dev file, or absent from
 * data written before the mark existed, degrades to the old behaviour rather than colliding
 * with a point that is right there.
 *
 * ⚠ Found by a test on 2026-09-08, not by review: the util test happened to delete a MIDDLE
 * id, which the old version handled correctly. Only the route test, which deleted the
 * highest, exposed it. ⚠ `meetingObservations.nextOwnPointId` — the manager tier's twin —
 * has the same weakness and carries the same claim in its JSDoc. It is NOT fixed here;
 * changing shared manager storage is its own change and its own decision.
 *
 * ⚠ The advisor id is NOT part of the point id. Two advisors in the same firm can both hold
 * `ao-1` for the same scenario and that is correct: the maps are keyed by advisor, so the
 * two never meet. Putting an advisor id into a point id would put a person's identifier into
 * every coaching report that quotes the point.
 *
 * @param {Array<object>} existingOwnRows - the advisor's live rows for this scenario
 * @param {number} [lastSeq] - the stored high-water mark, if any
 * @returns {{id: string, seq: number}}
 */
function nextAdvisorPointId (existingOwnRows, lastSeq) {
  const used = (Array.isArray(existingOwnRows) ? existingOwnRows : [])
    .map(r => (r && typeof r.id === 'string' && r.id.indexOf(ADVISOR_POINT_PREFIX) === 0)
      ? parseInt(r.id.slice(ADVISOR_POINT_PREFIX.length), 10)
      : NaN)
    .filter(n => Number.isInteger(n) && n > 0)
  const highestHeld = used.length ? Math.max(...used) : 0
  const mark = (Number.isInteger(lastSeq) && lastSeq > 0) ? lastSeq : 0
  const seq = Math.max(highestHeld, mark) + 1
  return { id: ADVISOR_POINT_PREFIX + seq, seq }
}

module.exports = {
  CONFIG_KEYS,
  DEV_FILES,
  ADVISOR_POINT_PREFIX,
  ADVISOR_SOURCE_LABELS,
  SOURCE_TIER_LABELS,
  MAX_OWN_POINTS_PER_SCENARIO,
  validateAdvisorPoint,
  readAdvisorDeclines,
  readAdvisorOwn,
  stateForAdvisor,
  sourceTierOf,
  applyAdvisorLayer,
  setAsidePoints,
  nextAdvisorPointId
}
