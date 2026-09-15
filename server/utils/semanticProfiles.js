'use strict'

/**
 * @file Every client tool the engine can recommend, with the semantic profile in force
 *   for it — what the AI understands that tool to be *about* (item 4.97 / 7.2, US9).
 * @module server/utils/semanticProfiles
 *
 * The profile is the resolver's dominant lever: a template's `{ signal: weight }` map is
 * matched against the signals read out of the advisor's conversation. Today every profile
 * is COMPILED — `scripts/build-semantic-profiles.js` scans each tool's written summary for
 * keyword phrases and scores them. That is a proxy for Mike's expertise, and for the 44
 * tools with no summary at all it is not even that: the compiler has nothing to read.
 *
 * 🔴 READ-ONLY IN THIS RELEASE — Mike's ruling, 2026-09-16. He stopped the build to ask
 * whether it interferes with the working model. It would have, in one place: wiring authored
 * profiles into `advisorEngine.js` (T058) changes what every advisor is recommended, on the
 * dominant lever, with no test able to judge whether a weight is right. So the mentor's screen
 * ships where he can LOOK and not yet CHANGE, and `loadEffectiveProfiles` reads the compiled
 * file alone. The authored-overlay branch below is deliberately present and deliberately
 * unreachable until he has seen the screen and decided the authoring is worth his time.
 *
 * 🔴 ONE PROFILE PER PAGE, AND THAT IS CORRECT — Mike's ruling, 2026-09-16. Advisor-e issues
 * an ID per PAGE, and a page legitimately holds several templates: 220 client tools sit on 205
 * pages. Templates sharing a page SHARE one profile, because an advisor opening that page gets
 * them all. This is not a collision to be keyed away (item 7.5) — what item 7.5 carries is the
 * other half: naming every tool on a page, so a reader can see that one profile governs both
 * `Working Capital Cycle` and `Activity Ratios`. `listTemplateProfiles` does that here.
 */

const COMPILED = require('../../data/semantic-profiles.json')
const LIBRARY = require('../../data/templates.json')
const { SIGNAL_REGISTRY } = require('./problemSignals')
const { getEntry } = require('./templateRegistry')
const { PLATFORM_SCOPE } = require('./platformScope')

/** The overlay address one page's authored profile is stored under. */
const PROFILE_PREFIX = 'semantic-profile:'

/** Longest a mentor's reason may be, per data-model §6. */
const NOTE_MAX = 300

/** Weights sum below this and the profile is too weak to carry a recommendation. */
const THIN_WEIGHT_FLOOR = 4

/** How long a compiled read is reused before the file is consulted again. */
const CACHE_TTL_MS = 60 * 1000

let _cache = null
let _cachedAt = 0

/** Drop the memoised compiled map. Tests call this; nothing in the request path does. */
function clearProfileCache () {
  _cache = null
  _cachedAt = 0
}

/**
 * The compiled profile for every page, keyed by page id.
 * @returns {Map<string, {profile: object, source: string, title: string}>}
 */
function compiledByPage () {
  if (_cache && (Date.now() - _cachedAt) < CACHE_TTL_MS) { return _cache }
  const map = new Map()
  for (const row of COMPILED) {
    if (!row || !row.page) { continue }
    map.set(row.page, {
      profile: row.profile || {},
      // A row carrying `note` is one the compiler wrote with no summary to read.
      source: row.note ? 'none' : (row.source || 'none'),
      title: row.title || null
    })
  }
  _cache = map
  _cachedAt = Date.now()
  return map
}

/**
 * Is this profile too weak to be trusted, and why?
 *
 * The four reasons are Mike's, approved on `design/mockups/template-profiles.html`
 * 2026-09-14 — the original three plus **"No profile at all"**, which the recompile of
 * 2026-09-16 made the largest group of the four (44 of 205 pages).
 *
 * @param {{profile: object, source: string}} entry - the effective profile and its source
 * @returns {{thin: boolean, reason: string|null}} `reason` is one of `no_entry`,
 *   `no_signals`, `weak`, `keyword_only`, else null
 */
function isThin (entry) {
  if (!entry || entry.source === 'none') { return { thin: true, reason: 'no_entry' } }
  const weights = Object.values(entry.profile || {})
  if (weights.length === 0) { return { thin: true, reason: 'no_signals' } }
  const total = weights.reduce((sum, n) => sum + (Number(n) || 0), 0)
  if (total < THIN_WEIGHT_FLOOR) { return { thin: true, reason: 'weak' } }
  if (entry.source === 'keyword') { return { thin: true, reason: 'keyword_only' } }
  return { thin: false, reason: null }
}

/**
 * The profile in force for every page, keyed by page id.
 *
 * READ-ONLY RELEASE: this is the compiled file. When authoring is turned on, an authored
 * row read from the overlay store at `PLATFORM_SCOPE` wins over the compiled entry for that
 * page, and a page with neither resolves to `{}`.
 *
 * @returns {Map<string, {profile: object, source: string, title: string}>}
 */
function loadEffectiveProfiles () {
  return compiledByPage()
}

/**
 * Every client tool the engine can recommend, with the profile in force for its page.
 *
 * ONE ROW PER PAGE, NAMING EVERY TOOL ON IT. The library holds 220 `do-the-job` tools on
 * 205 pages; a row's `templates` array carries all of them so no tool of Mike's is absent
 * from the screen, and `title` is the first — the page's primary tool.
 *
 * @returns {{rows: Array<object>, total: number, pages: number, thinCount: number}}
 *   `rows` one per page; `total` the tool count (220), `pages` the row count (205).
 */
function listTemplateProfiles () {
  const effective = loadEffectiveProfiles()
  const byPage = new Map()

  // 🔴 READ THE LIBRARY ARRAY, NOT THE REGISTRY. `templateRegistry` is a Map keyed by page,
  // so it holds ONE template per page and the other 15 never arrive (item 7.5). Reading
  // `templates.json` directly is what lets a row name every tool on its page — the whole
  // point of Mike's ruling. Its summary still comes through the registry, which is keyed by
  // page and therefore correct for a value the tools share.
  const all = LIBRARY.templates || LIBRARY

  for (const template of all) {
    if (!template || !template.page || template.menuSection !== 'do-the-job') { continue }
    if (!byPage.has(template.page)) {
      const entry = getEntry(template.page)
      byPage.set(template.page, {
        page: template.page,
        subSection: template.subSection || null,
        templates: [],
        indicators: (entry && entry.summary && entry.summary.indicators) || null
      })
    }
    byPage.get(template.page).templates.push(template.title)
  }

  let total = 0
  let thinCount = 0
  const rows = []

  for (const row of byPage.values()) {
    const entry = effective.get(row.page) || { profile: {}, source: 'none', title: null }
    const verdict = isThin(entry)
    total += row.templates.length
    if (verdict.thin) { thinCount++ }
    rows.push({
      page: row.page,
      title: row.templates[0],
      alsoOnPage: row.templates.slice(1),
      subSection: row.subSection,
      effective: entry.profile,
      source: entry.source,
      thin: verdict.thin,
      thinReason: verdict.reason,
      indicators: row.indicators
    })
  }

  rows.sort((a, b) => {
    const ss = (a.subSection || '').localeCompare(b.subSection || '')
    return ss !== 0 ? ss : (a.title || '').localeCompare(b.title || '')
  })

  return { rows, total, pages: rows.length, thinCount }
}

/**
 * Validate an authored profile before it is stored.
 *
 * Present and fully tested ahead of the authoring release: a validator for untrusted input
 * carries the project's 100% bar (CLAUDE.md → Testing), and writing it beside the rules it
 * enforces is cheaper than reconstructing them later.
 *
 * @param {*} body - whatever the request carried
 * @param {Set<string>|Array<string>} [signalTypes] - the permitted signals; defaults to the registry
 * @param {Map<string, *>|Set<string>} [library] - pages that exist; a page outside it is refused
 * @returns {{ok: true, value: {profile: object, note: string|null}} | {ok: false, code: string, message: string}}
 */
function validateProfile (body, signalTypes, library) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, code: 'INVALID_PROFILE', message: 'A profile must be an object' }
  }
  const permitted = signalTypes
    ? (signalTypes instanceof Set ? signalTypes : new Set(signalTypes))
    : new Set(Object.keys(SIGNAL_REGISTRY))

  const profile = body.profile
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    return { ok: false, code: 'INVALID_PROFILE', message: 'A profile must carry a profile object' }
  }
  // A Set or a Map both answer `has`, which is every shape a caller has: the route passes
  // the page index built from the library.
  if (body.page !== undefined && library) {
    if (!library.has(body.page)) {
      return { ok: false, code: 'INVALID_PROFILE', message: 'Unknown template page' }
    }
  }
  for (const [signal, weight] of Object.entries(profile)) {
    if (!permitted.has(signal)) {
      return { ok: false, code: 'INVALID_PROFILE', message: `Unknown signal: ${signal}` }
    }
    if (typeof weight !== 'number' || !Number.isInteger(weight) || weight < 1 || weight > 10) {
      return { ok: false, code: 'INVALID_PROFILE', message: `Weight for ${signal} must be a whole number 1-10` }
    }
  }
  const note = body.note === undefined || body.note === null ? null : String(body.note)
  if (note !== null && note.length > NOTE_MAX) {
    return { ok: false, code: 'INVALID_PROFILE', message: `A note must be ${NOTE_MAX} characters or fewer` }
  }
  return { ok: true, value: { profile, note } }
}

module.exports = {
  PROFILE_PREFIX,
  PLATFORM_SCOPE,
  NOTE_MAX,
  THIN_WEIGHT_FLOOR,
  CACHE_TTL_MS,
  clearProfileCache,
  loadEffectiveProfiles,
  listTemplateProfiles,
  isThin,
  validateProfile
}
