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
 * 🔴 AUTHORING IS LIVE — Mike's ruling, 2026-09-16, taken twice. He first stopped the build
 * to ask whether it interferes with the working model; it does, and he was told exactly how
 * before he turned it on: an authored profile OVERRIDES the compiled guess and changes which
 * tool an advisor is recommended, on the resolver's dominant lever, and **no test can say a
 * weight is right**. A wrong weight here is invisible to the suite and to UAT — it surfaces
 * only as an advisor being sent somewhere odd. That is the trade he accepted, because 44 tools
 * have no profile at all and he knows these tools better than a keyword script does.
 *
 * WHAT PROTECTS IT INSTEAD OF A TEST: every save is a version with its author and reason, the
 * compiled row is always restorable ("Restore to here" on the Generated line), and the trace
 * says `semantic:` when a profile carried a recommendation. The guard is reversibility, not
 * assertion.
 *
 * 🔴 ONE PROFILE PER PAGE, AND THAT IS CORRECT — Mike's ruling, 2026-09-16. Advisor-e issues
 * an ID per PAGE, and a page legitimately holds several templates: 220 client tools sit on 205
 * pages. Templates sharing a page SHARE one profile, because an advisor opening that page gets
 * them all. This is not a collision to be keyed away (item 7.10) — what item 7.10 carries is the
 * other half: naming every tool on a page, so a reader can see that one profile governs both
 * `Working Capital Cycle` and `Activity Ratios`. `listTemplateProfiles` does that here.
 */

const COMPILED = require('../../data/semantic-profiles.json')
const LIBRARY = require('../../data/templates.json')
const { SIGNAL_REGISTRY } = require('./problemSignals')
const { getEntry } = require('./templateRegistry')
const { PLATFORM_SCOPE } = require('./platformScope')
const overlay = require('./firmOverlay')

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
 * An AUTHORED row read from the overlay store at `PLATFORM_SCOPE` wins over the compiled
 * entry for that page; a page with neither resolves to `{}`. This is the function the engine
 * reads, so what a mentor saves on the screen is what an advisor is recommended from.
 *
 * 🔴 IT NEVER THROWS, AND THAT IS DELIBERATE. If the overlay store is unreachable the
 * compiled file still answers: a database blip must degrade to the script's guesses, never
 * empty the resolver's dominant lever mid-conversation. The failure is logged, not raised.
 *
 * An authored profile with no signals is kept, not discarded — saving an empty tick list is a
 * deliberate "this tool answers no client problem" (data-model §6). It stays thin, but its
 * source is `authored`, so it is no longer *unreviewed*.
 *
 * @returns {Promise<Map<string, {profile: object, source: string, title: string}>>}
 */
async function loadEffectiveProfiles () {
  const compiled = compiledByPage()
  let authored = null
  try {
    authored = await overlay.loadFirmConfigsByPrefix(PLATFORM_SCOPE, PROFILE_PREFIX)
  } catch (err) {
    console.error('[semantic-profiles] authored rows unavailable, using compiled:', err.message)
    return compiled
  }
  if (!authored || Object.keys(authored).length === 0) { return compiled }

  const merged = new Map(compiled)
  for (const [page, row] of Object.entries(authored)) {
    if (!row || typeof row !== 'object') { continue }
    merged.set(page, {
      profile: row.profile || {},
      source: 'authored',
      title: (compiled.get(page) || {}).title || null,
      authoredBy: row.savedBy || null,
      authoredAt: row.savedAt || null,
      note: row.note || null
    })
  }
  return merged
}

/**
 * Every client tool the engine can recommend, with the profile in force for its page.
 *
 * ONE ROW PER PAGE, NAMING EVERY TOOL ON IT. The library holds 220 `do-the-job` tools on
 * 205 pages; a row's `templates` array carries all of them so no tool of Mike's is absent
 * from the screen, and `title` is the first — the page's primary tool.
 *
 * @returns {Promise<{rows: Array<object>, total: number, pages: number, thinCount: number}>}
 *   `rows` one per page; `total` the tool count (220), `pages` the row count (205).
 */
async function listTemplateProfiles () {
  const effective = await loadEffectiveProfiles()
  const compiled = compiledByPage()
  const byPage = new Map()

  // 🔴 READ THE LIBRARY ARRAY, NOT THE REGISTRY. `templateRegistry` is a Map keyed by page,
  // so it holds ONE template per page and the other 15 never arrive (item 7.10). Reading
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
      indicators: row.indicators,
      // Who last saved this and why — present only on an authored row, so the screen can
      // show the mentor their own reason beside the ticks rather than a bare "Authored".
      authoredBy: entry.authoredBy || null,
      authoredAt: entry.authoredAt || null,
      note: entry.note || null,
      // What the compiler wrote, kept beside the authored profile so the editor's history
      // can offer "Restore to here" on the Generated line without a second call.
      compiled: (compiled.get(row.page) || {}).profile || {}
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

/**
 * The effective profiles in the shape `templateResolver` scores from: page → the profile
 * object itself, with the source and authorship stripped.
 *
 * 🔴 THIS IS THE FUNCTION THE ENGINE CALLS, so what a mentor saves reaches an advisor
 * through here. It never throws for the same reason `loadEffectiveProfiles` does not: a
 * store failure degrades to the compiled guesses rather than emptying the dominant lever.
 *
 * @returns {Promise<Map<string, object>>} page → `{ signal: weight }`
 */
async function effectiveProfileMap () {
  const effective = await loadEffectiveProfiles()
  const map = new Map()
  for (const [page, entry] of effective) {
    map.set(page, (entry && entry.profile) || {})
  }
  return map
}

/**
 * Every page id the library holds a client tool on — what a PUT is validated against, so a
 * profile can never be saved for a page that does not exist.
 * @returns {Set<string>}
 */
function libraryPages () {
  const all = LIBRARY.templates || LIBRARY
  const pages = new Set()
  for (const t of all) {
    if (t && t.page && t.menuSection === 'do-the-job') { pages.add(t.page) }
  }
  return pages
}

/**
 * Store one page's authored profile. Every save is a new version carrying its author and
 * reason — the reversibility that stands in for a test nobody can write (see the header).
 *
 * @param {string} page - the page id, already validated against `libraryPages()`
 * @param {{profile: object, note: string|null}} value - the validated profile
 * @param {string} savedBy - the mentor's verified email, from the token and never the body
 * @returns {Promise<{version: number}>}
 */
async function saveProfile (page, value, savedBy) {
  const row = {
    profile: value.profile,
    note: value.note,
    savedBy,
    savedAt: new Date().toISOString()
  }
  const saved = await overlay.saveFirmConfig(PLATFORM_SCOPE, PROFILE_PREFIX + page, row, savedBy)
  clearProfileCache()
  return saved
}

module.exports = {
  PROFILE_PREFIX,
  PLATFORM_SCOPE,
  NOTE_MAX,
  THIN_WEIGHT_FLOOR,
  CACHE_TTL_MS,
  clearProfileCache,
  loadEffectiveProfiles,
  effectiveProfileMap,
  listTemplateProfiles,
  libraryPages,
  saveProfile,
  isThin,
  validateProfile
}
