'use strict'

/**
 * @file The observation points a scope actually works to — the platform's shipped points
 *   for each meeting scenario, resolved through every tier's own decisions.
 * @module server/utils/meetingObservations
 *
 * Design: `design/features/meeting-review.md` §3. Artefact:
 * `design/mockups/meeting-review.html` Stage A (the firm's screen) and Stage B1 (the
 * advisor's pre-set), approved by Mike 2026-09-01.
 *
 * 🔴 WHAT THESE ARE FOR, because it decides how carefully they are treated. The Brief's
 * §1 argument is that asking a model "how did this advisor perform?" produces fluent
 * invention, while asking it "quote where they framed the meeting, or answer NOT FOUND"
 * is a search with a citation. These points ARE that question. Everything the coaching
 * notes can honestly say is a consequence of what is stored here, which is why they get a
 * screen (the hub-page rule) rather than living inside a prompt builder.
 *
 * ⚠ THE MECHANISM IS `resolveInheritedRows`, NOT `deepMerge` — the same choice the
 * Advisory Staircase, Quizzes and Distinctions made. These are LISTS OF ROWS inherited
 * from above, where "switch this one off" and "add my own" both mean something. Map-shaped
 * settings (`aiPrompts`, `propertyTaxRules`) use deepMerge instead. Picking the wrong one
 * is how a firm holding a one-item list blanks the mentor's whole set for itself.
 *
 * ⚠ WHICH TIERS EDIT THESE, stated rather than assumed (`CLAUDE.md`, Mike 2026-08-16 and
 * the default-is-mentor-alone ruling of 2026-08-24). The MENTOR authors the platform list.
 * The FIRM gets its own editing view as well, because Brief §3 names a firm's own scripts
 * and standards as the whole of the request — "a firm gets its own editing view because a
 * firm's scripts and standards genuinely differ from the platform's".
 *
 * ⚠ THE TWO MIDDLE TIERS ARE EXCLUDED BY THAT JUDGEMENT ALONE — NOT BY ANY LIMIT OF THE
 * PLATFORM. `loadResolvedObservations` already resolves through all four, their hub pages
 * exist and are approved (CLAUDE.md § "The four tiers are settled"), and other tabs list
 * all four (`aiPrompts`, in Mike's own words). Giving this feature the middle tiers is ONE
 * LINE — `meetingObservations` in `TAB_TIERS`, components/FirmManagerHub.vue — and it is
 * Mike's call, not a build blocked on anything.
 *
 * Node 14, CommonJS.
 */

const fs = require('fs')
const path = require('path')
const BASE_FILE = require('../../data/meeting-observations.json')
const LOGIC_TREES = require('../../data/logic_trees.json')
const { resolveInheritedRows } = require('./resolveInheritedRows')
const { parentScopeOf, tierOfScope } = require('./tierChain')
const { devFallbackAllowed: IS_DEV } = require('./dbFailure')

/**
 * The overlay addresses these decisions are stored under, at every tier.
 *
 * SEPARATE AND ADDITIVE, mirroring `firmStaircase.CONFIG_KEYS` exactly. Three keys rather
 * than one whole-config blob, so a tier's stored decisions are never rewritten wholesale
 * and a shape change never has to migrate what a firm already saved.
 *
 * Each is keyed by SCENARIO ID first, because a firm edits the end-of-year list without
 * touching the conflict-meeting list.
 *
 *   - meeting-observation-declines  -> { scenarioId: [pointId] }        inherited points off
 *   - meeting-observation-overrides -> { scenarioId: { pointId: {…} } } edited fields
 *   - meeting-observation-own       -> { scenarioId: [ {id, text} ] }   points added here
 *   - meeting-observation-next-seq  -> { scenarioId: n }                ids already minted
 *
 * 🔴 `nextSeq` IS A COUNTER, NOT A DECISION, and the distinction is load-bearing twice over.
 * It is deliberately absent from `loadScopeObservationState`, so `hasAnyDecision` cannot
 * count it — a scope that added a point and removed it again has decided nothing, and must
 * still see the layer above by identity. And it is absent from the history endpoint, because
 * restoring an earlier `own` version must NOT wind the counter back: the ids in the restored
 * version were already issued once. See `nextOwnPointId`.
 *
 * @type {Object.<string, string>}
 */
const CONFIG_KEYS = {
  declines: 'meeting-observation-declines',
  overrides: 'meeting-observation-overrides',
  own: 'meeting-observation-own',
  nextSeq: 'meeting-observation-next-seq'
}

/** Dev-only stand-ins, used when there is no MySQL. See `_load` for why they are dev-only. */
const DEV_FILES = {
  declines: 'data/dev-meeting-observation-declines.json',
  overrides: 'data/dev-meeting-observation-overrides.json',
  own: 'data/dev-meeting-observation-own.json',
  nextSeq: 'data/dev-meeting-observation-next-seq.json'
}

/**
 * The fields a tier may edit on a point it inherited.
 *
 * `id` is deliberately absent: it is identity, every decline and override is keyed to it,
 * and an editable id would let a tier's edit silently re-file itself against another point.
 * @type {string[]}
 */
const EDITABLE_POINT_FIELDS = ['text', 'advisorText', 'cannotHear', 'hintWords']

/** Longest a point may be. Long enough for the approved four; short enough to stay a check. */
const MAX_POINT_LENGTH = 300

/**
 * `cannotHear` and `hintWords` — the two fields slice 3 added, and why they are here rather
 * than in the report generator.
 *
 * 🔴 WHETHER A POINT CAN BE HEARD IS A PROPERTY OF THE POINT, NOT OF A MEETING. *"I drew the
 * numbers out for the client"* is un-hearable in every meeting that will ever happen, so it is
 * marked once by whoever wrote the point and never re-decided. Mike's ruling, 2026-09-02, on
 * the alternative of letting the model classify it: that would turn a stable fact into a fresh
 * guess each month, answered inconsistently, with nothing to inspect when somebody asks why.
 *
 * ⚠ AND LEAVING IT OUT WAS WORSE THAN EITHER. Without this flag a drawing point comes back
 * "Not found" — telling an advisor they failed to do something when the truth is the software
 * could not tell. That is the confident-and-wrong failure the Brief names as most likely.
 *
 * `hintWords` are optional. When the author supplies none, the card simply says the thing
 * cannot be heard and asks the advisor, with no guess at all — which is the honest floor.
 */
const MAX_HINT_WORDS = 10
const MAX_HINT_LENGTH = 120

/**
 * Own-row prefixes, one per tier.
 *
 * ⚠ NOT A STYLE CHOICE. Own-row ids are minted per scope from the rows that scope already
 * holds, so without distinct prefixes the mentor's first added point and a firm's first
 * added point would both be `1`. They meet the moment the mentor's point arrives at a firm
 * as an inherited row with the firm's own appended beside it — one resolved list, two
 * different points, one identity, and the firm switching off "its" point drops the
 * mentor's. This is `firmStaircase.js`'s Phase 5 defect, avoided rather than repeated.
 *
 * `xm-` for the global tier rather than `gm-`: a near-miss between two ADJACENT tiers is
 * worse than an unmemorable letter, and those two are exactly the ones whose rows sit
 * beside each other in a group manager's resolved list.
 * @type {Object.<string, string>}
 */
const POINT_PREFIX_BY_TIER = {
  mentor: 'mm-',
  global_group_manager: 'xm-',
  group_manager: 'gm-',
  firm_manager: 'fm-'
}

/** Prefix marking a point shipped by the platform in `data/meeting-observations.json`. */
const PLATFORM_POINT_PREFIX = 'mo-'

/** How a resolved point is badged for the screen. */
const OBSERVATION_SOURCE_LABELS = {
  inherited: 'inherited',
  override: 'edited-here',
  own: 'added-here'
}

/**
 * The own-row prefix a scope mints under.
 * @param {string|null} scopeId - a firm id, or a reserved tier scope id
 * @returns {string}
 */
function ownPointPrefix (scopeId) {
  return POINT_PREFIX_BY_TIER[tierOfScope(scopeId)] || POINT_PREFIX_BY_TIER.firm_manager
}

// ── The scenarios ────────────────────────────────────────────────────────────────────

/**
 * Tree id → its name, from `data/logic_trees.json`.
 *
 * ⚠ A FALLBACK ONLY, since slice 1. A type carries its own `name`; this covers a type
 * written before names existed, so an old stored list cannot lose its words. Nothing
 * authored from now on relies on it.
 */
const TREE_NAME_BY_ID = (Array.isArray(LOGIC_TREES.trees) ? LOGIC_TREES.trees : [])
  .reduce((out, t) => {
    if (t && typeof t.id === 'string') { out[t.id] = t.name }
    return out
  }, {})

/**
 * The meeting scenarios, in the order `data/meeting-observations.json` declares them.
 *
 * 🔴 THE NAME IS THE TYPE'S OWN (slice 1, 2026-09-02, `design/MEETING-TYPES-CASCADE.md`,
 * approved by Mike). It used to be looked up from the logic trees, and a type whose id
 * named no tree was DROPPED — which made the trees the gatekeeper of what meetings exist.
 * That was the deleted P12, a rule nobody had asked for. A type now exists because it is
 * registered here, and its words are its own.
 *
 * ⚠ `treeId` IS AN OPTIONAL COACHING LINK, NEVER IDENTITY AND NEVER A NAME SOURCE. It is
 * carried through untouched for whatever wants it later; nothing in this module reads it.
 *
 * A type with no usable name at all is still dropped — a nameless row is not something to
 * put in front of an advisor — but that is now the only way to fall out of this list.
 *
 * @returns {Array.<{id: string, name: string, treeId: (string|null)}>}
 */
function meetingScenarios () {
  return (BASE_FILE.scenarios || [])
    .filter(s => s && typeof s.id === 'string')
    .map(s => ({
      id: s.id,
      name: (typeof s.name === 'string' && s.name.trim()) ? s.name : TREE_NAME_BY_ID[s.id],
      treeId: (typeof s.treeId === 'string' && s.treeId) ? s.treeId : null
    }))
    .filter(s => typeof s.name === 'string' && s.name)
}

/** Registered scenario ids, including any that fail to resolve — the test reads this. */
function registeredScenarioIds () {
  return (BASE_FILE.scenarios || []).filter(s => s && typeof s.id === 'string').map(s => s.id)
}

/**
 * The platform's shipped points for one scenario.
 * @param {string} scenarioId
 * @returns {Array.<object>} a copy, so a caller cannot mutate the shipped file
 */
function basePointsFor (scenarioId) {
  const found = (BASE_FILE.scenarios || []).find(s => s && s.id === scenarioId)
  return (found && Array.isArray(found.points)) ? found.points.map(p => ({ ...p })) : []
}

// ── Validation ───────────────────────────────────────────────────────────────────────

/**
 * Checks one point's editable fields.
 *
 * Fails closed: an unknown field is an error rather than a value quietly kept. A point the
 * store accepts and nothing renders is a check a manager believes their advisors are held
 * to and they are not — the same reasoning as `aiPrompts.validateAiPromptOverrides`.
 *
 * @param {*} value - the submitted `{ text?, advisorText? }`
 * @param {object} [opts]
 * @param {boolean} [opts.requireText] - true when creating a point, which must have words
 * @returns {{ok: boolean, errors: string[], value: object}}
 */
function validatePointFields (value, opts) {
  const errors = []
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, errors: ['a point must be a JSON object'], value: {} }
  }

  const out = {}
  Object.keys(value).forEach((field) => {
    if (!EDITABLE_POINT_FIELDS.includes(field)) {
      errors.push('unknown field: ' + field)
      return
    }
    const raw = value[field]
    if (raw === null || raw === undefined) { return }

    // A boolean is stored as given, INCLUDING false — an override exists precisely so a tier
    // can switch off something it inherited, and a false that is dropped as "empty" would
    // leave the inherited true standing while the screen showed the box unticked.
    if (field === 'cannotHear') {
      if (typeof raw !== 'boolean') {
        errors.push('cannotHear must be true or false')
        return
      }
      out.cannotHear = raw
      return
    }

    if (field === 'hintWords') {
      if (!Array.isArray(raw)) {
        errors.push('hintWords must be a list')
        return
      }
      if (raw.length > MAX_HINT_WORDS) {
        errors.push('hintWords must be ' + MAX_HINT_WORDS + ' phrases or fewer')
        return
      }
      const phrases = []
      let bad = false
      raw.forEach((p) => {
        if (bad) { return }
        if (typeof p !== 'string') { errors.push('each hint phrase must be text'); bad = true; return }
        const trimmedPhrase = p.trim()
        if (!trimmedPhrase) { return }
        if (trimmedPhrase.length > MAX_HINT_LENGTH) {
          errors.push('each hint phrase must be ' + MAX_HINT_LENGTH + ' characters or fewer')
          bad = true
          return
        }
        phrases.push(trimmedPhrase)
      })
      if (!bad) { out.hintWords = phrases }
      return
    }

    if (typeof raw !== 'string') {
      errors.push(field + ' must be text')
      return
    }
    const trimmed = raw.trim()
    if (trimmed.length > MAX_POINT_LENGTH) {
      errors.push(field + ' must be ' + MAX_POINT_LENGTH + ' characters or fewer')
      return
    }
    // Whitespace-only is stored as absent rather than as an empty check: a blank point
    // would render as an empty row the advisor cannot act on and the model cannot look for.
    if (trimmed) { out[field] = trimmed }
  })

  if (opts && opts.requireText && !out.text) {
    errors.push('text is required')
  }

  return { ok: errors.length === 0, errors, value: out }
}

/**
 * Validates a whole stored decision map, keeping only what is well-formed.
 *
 * NEVER THROWS AND NEVER REJECTS A WHOLE SCOPE FOR ONE BAD ROW. Malformed storage for one
 * scenario must not stop a manager opening the screen or an advisor seeing the other ten
 * lists — the recovery is to show what is readable, not to fail the page.
 *
 * @param {*} stored - whatever came back from the overlay
 * @param {'declines'|'overrides'|'own'} kind
 * @returns {object} `{ scenarioId: <shape for that kind> }`, always an object
 */
function readDecisionMap (stored, kind) {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) { return {} }

  const out = {}
  Object.keys(stored).forEach((scenarioId) => {
    const entry = stored[scenarioId]

    if (kind === 'declines') {
      if (Array.isArray(entry)) {
        const ids = entry.filter(id => typeof id === 'string' && id)
        if (ids.length) { out[scenarioId] = ids }
      }
      return
    }

    if (kind === 'own') {
      if (!Array.isArray(entry)) { return }
      const rows = entry
        .filter(r => r && typeof r === 'object' && typeof r.id === 'string' && r.id)
        .map((r) => {
          const { value } = validatePointFields(
            { text: r.text, advisorText: r.advisorText }, { requireText: false }
          )
          return { id: r.id, ...value }
        })
        .filter(r => typeof r.text === 'string' && r.text)
      if (rows.length) { out[scenarioId] = rows }
      return
    }

    // overrides
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) { return }
    const kept = {}
    Object.keys(entry).forEach((pointId) => {
      const { value } = validatePointFields(entry[pointId], { requireText: false })
      if (Object.keys(value).length) { kept[pointId] = value }
    })
    if (Object.keys(kept).length) { out[scenarioId] = kept }
  })

  return out
}

// ── Reading a scope's stored decisions ───────────────────────────────────────────────

function _readDevMap (file) {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), file), 'utf8'))
  } catch (_e) {
    return {}
  }
}

/**
 * Load one config value, preferring the injected loader and falling back to the dev-JSON
 * map keyed by scope id.
 *
 * THE FALLBACK IS DEV-ONLY, DELIBERATELY — `dbFailure.devFallbackAllowed` refuses it when a
 * live server REFUSED the statement. Dressing a production outage up as "this firm has no
 * override" hides the outage behind wording that looks deliberate, and a false pass gets
 * signed off where a failure gets fixed.
 *
 * @param {Function} loadFirmConfig - async (scopeId, key) => stored value
 * @param {string} scopeId
 * @param {string} key
 * @param {string} devFile
 * @returns {Promise<*>} the stored value, or `{}` when nothing is stored
 * @throws in production, when the store cannot be read
 */
async function _load (loadFirmConfig, scopeId, key, devFile) {
  try {
    const value = await loadFirmConfig(scopeId, key)
    return (value === null || value === undefined) ? {} : value
  } catch (err) {
    if (!IS_DEV(err)) { throw err }
    const map = _readDevMap(devFile)
    return Object.prototype.hasOwnProperty.call(map, scopeId) ? map[scopeId] : {}
  }
}

/**
 * One scope's own decisions across every scenario. No cascade — the raw read.
 *
 * @param {string|null} scopeId - the authenticated scope, never client-supplied (a
 *   body-supplied id would let one firm read another's configuration — IDOR)
 * @param {Function} loadFirmConfig - async (scopeId, key) => stored value
 * @returns {Promise<{declines: object, overrides: object, own: object}>}
 */
async function loadScopeObservationState (scopeId, loadFirmConfig) {
  const none = { declines: {}, overrides: {}, own: {} }
  if (!scopeId) { return none }

  const declines = await _load(loadFirmConfig, scopeId, CONFIG_KEYS.declines, DEV_FILES.declines)
  const overrides = await _load(loadFirmConfig, scopeId, CONFIG_KEYS.overrides, DEV_FILES.overrides)
  const own = await _load(loadFirmConfig, scopeId, CONFIG_KEYS.own, DEV_FILES.own)

  return {
    declines: readDecisionMap(declines, 'declines'),
    overrides: readDecisionMap(overrides, 'overrides'),
    own: readDecisionMap(own, 'own')
  }
}

/** True when a scope has decided anything at all — used to return the layer above by identity. */
function hasAnyDecision (state) {
  return Object.keys(state.declines).length > 0 ||
    Object.keys(state.overrides).length > 0 ||
    Object.keys(state.own).length > 0
}

// ── Resolution ───────────────────────────────────────────────────────────────────────

/**
 * Mark the rows THIS level changed with the tier that changed them.
 *
 * 🔴 WHY THIS EXISTS, and why it is here rather than in `resolveInheritedRows` (item 4.76).
 * Every level restamps `source` relative to whoever is looking — itself the fix for item
 * 4.59 — so by the time a point reaches a firm, the fact that a GLOBAL or GROUP manager
 * reworded it has been erased by design: it arrives carrying the platform's `mo-` id and the
 * badge `inherited`, and the advisor is told Advisor-e wrote words a group manager wrote.
 *
 * ⚠ THE FIX DOES NOT NEED THE SHARED MECHANISM. The item predicted a change to
 * `resolveInheritedRows`, which domain support, quizzes, the staircase and the distinctions
 * all resolve through. It is not required: the information is lost in the RECURSION, which
 * lives here, so keeping it here leaves every other block untouched.
 *
 * A row this level merely inherited keeps whatever mark came from above — the shallow copies
 * `resolveInheritedRows` returns carry it through — so the mark always names the LAST tier to
 * change a point, not the first.
 *
 * @param {Array<object>} rows - one level's resolved rows
 * @param {string} tier - the tier that just resolved them
 * @returns {Array<object>}
 */
function stampChangedAtTier (rows, tier) {
  return rows.map((p) => {
    const changedHere = p.source === OBSERVATION_SOURCE_LABELS.override ||
      p.source === OBSERVATION_SOURCE_LABELS.own
    return changedHere ? { ...p, changedAtTier: tier } : p
  })
}

/**
 * The observation points in force at a scope, per scenario.
 *
 * Recurses up the tier chain exactly as `staircaseConfig.loadBlendedStaircase` does: the
 * base a firm resolves against is the MENTOR'S RESOLVED LIST, which is the shipped file
 * resolved through the mentor's own decisions. Same mechanism applied twice, rather than a
 * second rule for the tier above.
 *
 * NEVER REJECTS. A storage fault falls back to the layer above and logs — an advisor must
 * not be left with no list to walk in holding, and Brief §3 makes the point that the list
 * pays before a word is recorded.
 *
 * @param {string|null} scopeId
 * @param {Function} loadFirmConfig - async (scopeId, key) => stored value
 * @returns {Promise<Object.<string, {id: string, name: string, points: Array<object>}>>}
 *   keyed by scenario id
 */
async function loadResolvedObservations (scopeId, loadFirmConfig) {
  const scenarios = meetingScenarios()

  const shipped = () => scenarios.reduce((out, s) => {
    out[s.id] = { id: s.id, name: s.name, treeId: s.treeId || null, points: basePointsFor(s.id) }
    return out
  }, {})

  if (!scopeId) { return shipped() }

  const parent = parentScopeOf(scopeId)
  const base = parent === null
    ? shipped()
    : await loadResolvedObservations(parent, loadFirmConfig)

  let state
  try {
    state = await loadScopeObservationState(scopeId, loadFirmConfig)
  } catch (err) {
    console.error('[meeting-observations] scope read failed:', err.message)
    return base
  }

  // A scope that has decided nothing sees the layer above — but the BADGE is relative to the
  // viewer, so it is restamped.
  //
  // 🔴 WHY THIS IS NOT A PLAIN PASSTHROUGH. `source` is stamped by whichever level applied
  // decisions, so a point the MENTOR added arrives here still marked `added-here`. On a firm
  // manager's screen that reads "Added here" against something the mentor wrote — and the
  // badge is not decoration: FirmMeetingObservations.vue reads it to choose between "Switch
  // off" and "Remove", and to route an edit to the own-row endpoint, which answers 404 for a
  // point the firm does not own. A level that has decided nothing has, by definition,
  // inherited everything it can see.
  //
  // ⚠ THE OTHER PATH ALREADY AGREES: below, `resolveInheritedRows` stamps every row it did
  // not itself override or add as inherited. Without this the badge FLIPPED when the scope
  // made any unrelated decision, because that switched it from this branch to that one.
  //
  // Fixed 2026-09-04 (item 4.59). This is the fix meetingTypes.js already carries.
  if (!hasAnyDecision(state)) {
    const stamped = {}
    Object.keys(base).forEach((scenarioId) => {
      const s = base[scenarioId]
      stamped[scenarioId] = {
        ...s,
        points: (Array.isArray(s.points) ? s.points : [])
          .map(p => ({ ...p, source: OBSERVATION_SOURCE_LABELS.inherited }))
      }
    })
    return stamped
  }

  const out = {}
  scenarios.forEach((s) => {
    const inherited = (base[s.id] && base[s.id].points) || []
    out[s.id] = {
      id: s.id,
      // The name is the type's own (slice 1). No tier can rename one YET — that is slice 2
      // for the mentor and slice 3 for the tiers below, per MEETING-TYPES-CASCADE.md §7.
      // When they can, the rename is a stored decision resolved here exactly as a point is;
      // the ID stays fixed, because every decline, override and recorded meeting keys to it.
      name: s.name,
      // Carried through, never read here — the optional coaching link.
      treeId: s.treeId || null,
      // Stamped with the tier that changed each row, so a middle tier's rewording is not
      // erased by the restamping above it — see `stampChangedAtTier`.
      points: stampChangedAtTier(
        resolveInheritedRows(
          inherited,
          {
            declinedIds: state.declines[s.id] || [],
            overrides: state.overrides[s.id] || {},
            ownRows: state.own[s.id] || []
          },
          { sourceLabels: OBSERVATION_SOURCE_LABELS }
        ),
        tierOfScope(scopeId)
      )
    }
  })

  return out
}

/**
 * One scenario's points as the ADVISOR reads them — first person where the author wrote a
 * first-person form, and the manager's wording verbatim where they did not.
 *
 * 🔴 THE FALLBACK IS HONEST BY DESIGN. Stage A and Stage B1 of the approved drawing show
 * the same points in two voices, so both are stored. A point added by a manager carries one
 * form; showing those words unchanged is right, and rewriting them into "I …" by rule would
 * be the app putting words in a manager's mouth.
 *
 * @param {object} scenario - a resolved entry from `loadResolvedObservations`
 * @returns {Array.<{id: string, text: string, source: string}>}
 */
function asAdvisorPreset (scenario) {
  const points = (scenario && Array.isArray(scenario.points)) ? scenario.points : []
  return points.map(p => ({
    id: p.id,
    text: (typeof p.advisorText === 'string' && p.advisorText) ? p.advisorText : p.text,
    source: p.source,
    // Carried through for slice 3: the report generator holds an un-hearable point back from
    // the model entirely and asks the advisor instead, so it has to know which those are
    // before it builds a prompt.
    cannotHear: Boolean(p.cannotHear),
    hintWords: Array.isArray(p.hintWords) ? p.hintWords : [],
    // Carried through for the advisor's own level (2026-09-08): which tier the advisor is
    // told a point came from, and the approved words for it. Absent until
    // `meetingObservationsAdvisor.applyAdvisorLayer` has stamped them, which is why these
    // are conditional rather than defaulted — a screen that has not been through that layer
    // must show no source line at all, never an empty or guessed one.
    ...(p.sourceTier ? { sourceTier: p.sourceTier } : {}),
    ...(p.sourceLabel ? { sourceLabel: p.sourceLabel } : {})
  }))
}

/**
 * The stored high-water marks, keyed by scenario. Anything that is not a whole number above
 * zero is dropped rather than trusted — a corrupt mark must degrade to the live rows, never
 * mint a negative or fractional id.
 *
 * @param {*} stored - whatever came back from the overlay
 * @returns {Object.<string, number>}
 */
function readNextSeqMap (stored) {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) { return {} }
  const out = {}
  Object.keys(stored).forEach((scenarioId) => {
    const n = stored[scenarioId]
    if (Number.isInteger(n) && n > 0) { out[scenarioId] = n }
  })
  return out
}

/**
 * Mint the next own-point id for a scope within one scenario.
 *
 * 🔴 IT TAKES A STORED HIGH-WATER MARK AS WELL AS THE LIVE ROWS, AND IT NEEDS BOTH. Counting
 * from the ids currently held is not enough: remove the HIGHEST one and the next point added
 * takes its id straight back. A reused id would match the removed point in any coaching
 * report already stored against it — a report about a point the firm no longer checks,
 * reading as one about the point just written — and would deliver a brand-new point to every
 * advisor who had set the removed one aside, already set aside. Nothing on any screen would
 * look wrong.
 *
 * ⚠ THE JSDOC HERE USED TO CLAIM THIS AND THE CODE DID NOT DO IT (item 4.72, fixed
 * 2026-09-08). The test that guarded it deleted a MIDDLE id, which the old version handled
 * correctly; only deleting the highest exposed the fault. The fix is the one
 * `meetingObservationsAdvisor.nextAdvisorPointId` was given a day earlier, ported up.
 *
 * The mark only ever goes up, and the live rows are still read — so a mark lost to a
 * hand-edited dev file, or absent from data written before the mark existed, degrades to the
 * old behaviour rather than colliding with a point that is right there.
 *
 * @param {string} scopeId
 * @param {Array<object>} existingOwnRows - this scope's own rows for the scenario
 * @param {number} [lastSeq] - the stored high-water mark for this scenario, if any
 * @returns {{id: string, seq: number}}
 */
function nextOwnPointId (scopeId, existingOwnRows, lastSeq) {
  const prefix = ownPointPrefix(scopeId)
  const used = (Array.isArray(existingOwnRows) ? existingOwnRows : [])
    .map(r => (r && typeof r.id === 'string' && r.id.indexOf(prefix) === 0)
      ? parseInt(r.id.slice(prefix.length), 10)
      : NaN)
    .filter(n => Number.isInteger(n) && n > 0)
  const highestHeld = used.length ? Math.max(...used) : 0
  const mark = (Number.isInteger(lastSeq) && lastSeq > 0) ? lastSeq : 0
  const seq = Math.max(highestHeld, mark) + 1
  return { id: prefix + seq, seq }
}

module.exports = {
  CONFIG_KEYS,
  DEV_FILES,
  EDITABLE_POINT_FIELDS,
  MAX_POINT_LENGTH,
  MAX_HINT_WORDS,
  MAX_HINT_LENGTH,
  POINT_PREFIX_BY_TIER,
  PLATFORM_POINT_PREFIX,
  OBSERVATION_SOURCE_LABELS,
  ownPointPrefix,
  meetingScenarios,
  registeredScenarioIds,
  basePointsFor,
  stampChangedAtTier,
  validatePointFields,
  readDecisionMap,
  readNextSeqMap,
  loadScopeObservationState,
  loadResolvedObservations,
  asAdvisorPreset,
  nextOwnPointId
}
