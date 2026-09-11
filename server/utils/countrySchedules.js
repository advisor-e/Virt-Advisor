'use strict'

/**
 * @file A country's WHOLE published depreciation schedule, approved once at the global
 *   group manager tier and searched by everyone beneath it.
 * @module server/utils/countrySchedules
 *
 * Item 4.92, slice 1. Asked for by Mike on 2026-09-11 — *"if a single source of truth doc is
 * available for a country - with ALL depreciation rates in it - we need the capability to
 * store it, save it, translate it into a serachable table so it can be used in our models"* —
 * and the artefact is `design/mockups/depreciation-rates-country-schedules.html`, approved by
 * him the same day with all three of its decisions ruled.
 *
 * 🔴 IT LOADS AT THE GLOBAL GROUP MANAGER TIER, AND THAT IS HIS RULING. One person loads the
 * schedules for every country their brand operates in; group managers and firms inherit the
 * one matching their client and load none. It OVERRIDES the default-is-mentor-alone rule of
 * 2026-08-24 for this feature. Nothing here enforces the tier — a store cannot — but the route
 * that writes it does, and `TIERS_THAT_MAY_LOAD` below is the single place that says which.
 *
 * 🔴 WHAT THIS IS NOT. It is NOT the six rates a forecast computes with. Those live in
 * `depreciationRates.js`, are approved per firm, and are untouched by this module. A country
 * schedule is the LIBRARY a manager picks a published class out of — about 2,800 classes for
 * New Zealand's IR265 against the forecast's six categories. Nothing in this file can reach a
 * forecast, and that separation is the reason a 2,800-row table is safe to hold at all.
 *
 * 🔴 APPROVED SCHEDULES ONLY, structurally rather than by a flag — the same property that
 * makes `depreciationRates.js` safe. A schedule that cannot name its approver and the date
 * fails validation and is dropped by the resolver like any other malformed value. A read that
 * is still running, or finished and not yet approved, is not stored here at all: it lives in
 * its own store (slice 2), which this module never reads.
 *
 * ⚠ ONE CONFIG KEY PER COUNTRY — `country-schedule:NZ`, not one key holding every country.
 * A single country's table is around 400 KB of JSON, and a brand may operate in a dozen.
 * Holding them in one row would mean reading every country to answer a question about one,
 * on every screen load. `config_json` is LONGTEXT so the size itself is not the problem; the
 * read amplification is. Per-country keys also give each country its own version history and
 * its own last-known-good, which is what a manager restoring a bad load actually wants.
 *
 * ⚠ THE KEY IS NOT A CASCADING ONE (see `firmOverlay.CASCADING_CONFIG_KEYS`) AND MUST NOT
 * BECOME ONE. `deepMerge` expresses a delta for map-shaped values; a schedule's `classes` is
 * an ARRAY, and arrays replace wholesale, so a group manager holding a one-class array would
 * blank the brand's whole schedule for everyone beneath them. Inheritance here is the same
 * top-down `scopeChain` walk `depreciationRates.js` uses, which records WHICH tier supplied
 * the table instead of losing it in a merge.
 *
 * Node 14, CommonJS.
 */

const { scopeChain, tierOfScope } = require('./tierChain')
const {
  MAX_LABEL,
  normaliseCountry,
  num,
  publishedKey,
  cleanSource
} = require('./sourcedFigure')

/**
 * The overlay address one country's schedule is stored under, per scope.
 * @see configKeyFor
 */
const CONFIG_KEY_PREFIX = 'country-schedule:'

/**
 * The tiers allowed to load and approve a country schedule.
 *
 * 🔴 ONE ENTRY, AND IT IS MIKE'S RULING OF 2026-09-11 rather than a default. It is a list so
 * the day a second tier is genuinely given the power, the change is this line and the reason
 * beside it — never an `if` added to a route where nobody would find it.
 */
const TIERS_THAT_MAY_LOAD = ['global_group_manager']

/** How a rate is applied. `dv` reduces the book value; `sl` writes off original cost. */
const METHODS = ['dv', 'sl']

/**
 * How many published classes one country's schedule may hold.
 *
 * ⚠ A CEILING ON A RUNAWAY ANSWER, NOT A TARGET, AND IT IS ABOVE THE REAL DOCUMENTS.
 * IR265 publishes about 2,800 classes across 52 table pages — item 4.90 was filed because the
 * per-document cap was 250 and both the code comment and the Brief claimed the real figure was
 * "about 156". Five thousand clears the largest schedule anyone has produced with room to
 * spare, while stopping a confused read from filling a brand's stored record.
 *
 * 🔴 CLASSES PAST THE CAP ARE REFUSED, NOT SILENTLY DROPPED. Dropping them is what produced
 * 4.90: a picker that ends part-way through the document with nothing on screen saying so.
 * A schedule that will not fit is a schedule somebody has to look at.
 */
const MAX_SCHEDULE_CLASSES = 5000

/**
 * How many unsettled entries one schedule may carry.
 *
 * These are not rates and nothing is ever taken from them: each names a class, the pages it
 * appears on and what differs, so a manager can settle it against the document themselves.
 * Higher than the per-document cap of 50 because a whole schedule read in nine passes
 * accumulates what nine documents would.
 */
const MAX_UNRESOLVED = 200

/** How many page ranges a schedule may name as read, or as not read. */
const MAX_PAGE_RANGES = 64

/** The highest page number worth believing in a published schedule. */
const MAX_PAGE = 20000

/**
 * The config key for one country.
 *
 * @param {*} country - anything; normalised, and refused if it is not a code
 * @returns {string|null} `country-schedule:NZ`, or null when the country is not a code
 */
function configKeyFor (country) {
  const code = normaliseCountry(country)
  return code === null ? null : CONFIG_KEY_PREFIX + code
}

/**
 * Trimmed text within a cap, or null when there is none.
 * @param {*} value
 * @param {number} cap
 * @returns {string|null}
 */
function text (value, cap) {
  if (typeof value !== 'string') { return null }
  const t = value.trim()
  return t ? t.slice(0, cap) : null
}

/**
 * Validate one published class — one row of the stored table.
 *
 * 🔴 HELD TO THE SAME BAR AS AN APPROVED RATE, because a class a manager picks out of this
 * table is written straight into their firm's approved rates. A class that could not carry a
 * rate, a page and a document would put an unsourced figure in front of a lender by a
 * different door from the one every other check is watching.
 *
 * ⚠ THE PAGE IS MANDATORY HERE, where `cleanSource` treats it as optional. Mike's own wording
 * for this feature is that each row *"names the document and page it came from"*, and a
 * schedule is the one place where a page is the only way to check a figure against 52 pages
 * of print.
 *
 * @param {*} value
 * @param {string} where - for the error message
 * @param {string[]} errors - collected in place
 * @returns {object|null} the cleaned class, or null when it was refused
 */
function cleanClass (value, where, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${where} must be a non-array JSON object`)
    return null
  }

  const label = text(value.label, MAX_LABEL)
  if (!label) {
    errors.push(`${where}.label must be the tax authority's own wording for the class`)
    return null
  }

  const method = value.method
  if (!METHODS.includes(method)) {
    errors.push(`${where}.method must be one of: ${METHODS.join(', ')}`)
    return null
  }

  const rates = {}
  let bad = false
  ;['dvRate', 'slRate'].forEach((field) => {
    const n = num(value[field])
    if (n === null) { rates[field] = null; return }
    // Refused, never clamped: `50` is not a bad 50%, it is a rate typed in the wrong unit,
    // and reading it as 5000% would depreciate an asset to nothing in a forecast that still
    // balances. Same rule, same reason, as depreciationRates.cleanEntry.
    if (n <= 0 || n > 1) {
      errors.push(`${where}.${field} must be a rate between 0 and 1 (50% is 0.5, not 50)`)
      bad = true
    } else {
      rates[field] = n
    }
  })
  if (bad) { return null }

  // The rate the method names has to exist, or the row says how to apply a number it does not
  // have — and a manager picking it would approve a rate that resolves to nothing.
  const operative = method === 'dv' ? rates.dvRate : rates.slRate
  if (operative === null || operative === undefined) {
    errors.push(`${where}.${method === 'dv' ? 'dvRate' : 'slRate'} is required when method is '${method}'`)
    return null
  }

  const lifeYears = num(value.lifeYears)
  if (lifeYears !== null && (lifeYears <= 0 || lifeYears > 100)) {
    errors.push(`${where}.lifeYears must be a number of years between 0 and 100`)
    return null
  }

  const source = cleanSource(value.source, where, errors, 'class')
  if (source === null) { return null }
  if (!source.page) {
    errors.push(`${where}.source.page is required — a class in a country schedule must name the page it was printed on`)
    return null
  }

  return {
    label,
    method,
    dvRate: rates.dvRate === undefined ? null : rates.dvRate,
    slRate: rates.slRate === undefined ? null : rates.slRate,
    lifeYears,
    source
  }
}

/**
 * Validate a list of page ranges — which pages were read, and which were not.
 *
 * 🔴 `pagesUnread` IS THE SECOND OF MIKE'S THREE RULINGS, MADE STORABLE. He ruled on
 * 2026-09-11 that a pass which will not read after a retry does not throw the schedule away:
 * the rest is stored and the page range is NAMED. A schedule with an unnamed hole in it is
 * exactly the state that let a session conclude New Zealand has no first-year rule — an
 * absence and a negative look identical unless one of them says so.
 *
 * @param {*} value
 * @param {string} where - for the error message
 * @param {string[]} errors - collected in place
 * @returns {Array<{from: number, to: number}>|null} null when the list was refused
 */
function cleanPageRanges (value, where, errors) {
  if (value === null || value === undefined) { return [] }
  if (!Array.isArray(value)) {
    errors.push(`${where} must be an array of page ranges`)
    return null
  }
  if (value.length > MAX_PAGE_RANGES) {
    errors.push(`${where} may hold at most ${MAX_PAGE_RANGES} page ranges`)
    return null
  }

  const out = []
  for (let i = 0; i < value.length; i++) {
    const one = value[i]
    if (!one || typeof one !== 'object' || Array.isArray(one)) {
      errors.push(`${where}[${i}] must be a non-array JSON object with from and to`)
      return null
    }
    const from = num(one.from)
    const to = num(one.to)
    if (from === null || to === null || !Number.isInteger(from) || !Number.isInteger(to)) {
      errors.push(`${where}[${i}] must name whole page numbers in from and to`)
      return null
    }
    if (from < 1 || to < 1 || from > MAX_PAGE || to > MAX_PAGE) {
      errors.push(`${where}[${i}] pages must be between 1 and ${MAX_PAGE}`)
      return null
    }
    if (to < from) {
      errors.push(`${where}[${i}].to cannot fall before .from`)
      return null
    }
    out.push({ from, to })
  }
  return out
}

/**
 * Validate the unsettled entries — what the document itself could not decide.
 *
 * ⚠ NOTHING IS EVER TAKEN FROM THIS LIST. It carries no rate and no category. It exists so a
 * dropped entry is VISIBLE rather than silently absent, which is P3 of the Depreciation Rates
 * Brief applied to the rows instead of to the categories. IR265 produces three of them, all
 * real: powder dryer buildings printed at two rates on pages 14 and 46, microwave ovens twice
 * on page 36, and Southern Cross Cable capacity as a sliding scale split across pages 39–40.
 *
 * @param {*} value
 * @param {string} where - for the error message
 * @param {string[]} errors - collected in place
 * @returns {Array<{label: string, pages: string, differs: string}>|null}
 */
function cleanUnresolved (value, where, errors) {
  if (value === null || value === undefined) { return [] }
  if (!Array.isArray(value)) {
    errors.push(`${where} must be an array of the entries the document could not settle`)
    return null
  }
  if (value.length > MAX_UNRESOLVED) {
    errors.push(`${where} may hold at most ${MAX_UNRESOLVED} unsettled entries`)
    return null
  }

  const out = []
  value.forEach((one) => {
    if (!one || typeof one !== 'object' || Array.isArray(one)) { return }
    const label = text(one.label, MAX_LABEL)
    if (!label) { return }
    out.push({
      label,
      pages: text(one.pages, 40) || '',
      differs: text(one.differs, MAX_LABEL * 2) || ''
    })
  })
  return out
}

/**
 * Validate one country's whole stored schedule.
 *
 * The shape is one country per config key, so the stored value IS the schedule rather than a
 * map of them — which is the difference from `validateDepreciationRates`, and it is why the
 * country is carried inside the value as well as in the key: a value read from the wrong key
 * can then be caught rather than trusted.
 *
 * @param {*} value - the candidate, from the store or a request
 * @param {object} [opts]
 * @param {*} [opts.expectCountry] - the country the caller believes this is, from the config
 *   key. A stored value naming a different one is refused rather than relabelled.
 * @returns {{ok: boolean, errors: string[], value: object|null}} `value` is meaningful only
 *   when `ok` is true.
 */
function validateCountrySchedule (value, opts) {
  const errors = []
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, errors: ['a country schedule must be a non-array JSON object'], value: null }
  }

  const country = normaliseCountry(value.country)
  if (country === null) {
    return { ok: false, errors: ['country must be a two-letter code, such as NZ'], value: null }
  }
  const expected = opts && opts.expectCountry !== undefined ? normaliseCountry(opts.expectCountry) : null
  if (expected !== null && expected !== country) {
    // A schedule filed under the wrong country would depreciate one country's clients at
    // another's rates, in a forecast that balances. Refused, never relabelled.
    return {
      ok: false,
      errors: [`this schedule names ${country} but is stored under ${expected}`],
      value: null
    }
  }

  const document = text(value.document, MAX_LABEL)
  if (!document) {
    errors.push('document must name the published schedule, such as IR265')
  }

  const published = text(value.published, 20)
  if (published === null || publishedKey(published) === null) {
    errors.push('published must be the edition date, like 2023-10 or 2023-10-31')
  }

  // The approval gate, and the only one there is — see this file's header. A schedule that
  // cannot say who approved it and when is not a schedule.
  const approvedBy = text(value.approvedBy, MAX_LABEL)
  if (!approvedBy) {
    errors.push('approvedBy must name the manager who approved this schedule')
  }
  const approvedAt = text(value.approvedAt, 40)
  if (!approvedAt || Number.isNaN(Date.parse(approvedAt))) {
    errors.push('approvedAt must be the date the schedule was approved')
  }

  const pagesRead = cleanPageRanges(value.pagesRead, 'pagesRead', errors)
  const pagesUnread = cleanPageRanges(value.pagesUnread, 'pagesUnread', errors)
  const unresolved = cleanUnresolved(value.unresolved, 'unresolved', errors)

  const rawClasses = value.classes
  let classes = null
  if (!Array.isArray(rawClasses)) {
    errors.push('classes must be an array of the published classes read from the schedule')
  } else if (rawClasses.length > MAX_SCHEDULE_CLASSES) {
    errors.push(`classes may hold at most ${MAX_SCHEDULE_CLASSES} entries; this schedule has ${rawClasses.length}`)
  } else {
    classes = []
    const seen = {}
    for (let i = 0; i < rawClasses.length; i++) {
      const one = cleanClass(rawClasses[i], `classes[${i}]`, errors)
      if (one === null) { return { ok: false, errors, value: null } }
      // Two entries with the same wording are one class listed twice: a picker offering both
      // asks a manager to choose between two things they cannot tell apart. The FIRST wins,
      // so the order the document prints them in is the order that survives.
      const key = one.label.toLowerCase()
      if (seen[key]) { continue }
      seen[key] = true
      classes.push(one)
    }
    // A schedule with no classes at all is item 4.91 stored rather than caught: a read that
    // succeeded, named its document, and proposed nothing. It is not an approvable schedule.
    if (classes.length === 0) {
      errors.push('classes is empty — a schedule that published no classes is a read that failed, not a table')
    }
  }

  if (errors.length > 0 || classes === null || pagesRead === null || pagesUnread === null || unresolved === null) {
    return { ok: false, errors, value: null }
  }

  return {
    ok: true,
    errors: [],
    value: {
      country,
      document,
      published,
      approvedBy,
      approvedAt,
      pagesRead,
      pagesUnread,
      classes,
      unresolved
    }
  }
}

/**
 * Which pages of this schedule were NOT read, as one sentence a person can act on.
 *
 * 🔴 THE CONDITION MIKE ATTACHED TO HIS SECOND RULING, and it is why this lives in the store
 * rather than in one screen: *the gap shows WHEREVER THAT TABLE IS USED*, not only where the
 * schedule was loaded. Every caller that renders a class picker or a rate origin asks this,
 * so there is one sentence rather than four that drift.
 *
 * @param {object|null} schedule - a validated schedule, or null
 * @returns {string} '' when every page was read, which is the normal case
 */
function unreadPagesSentence (schedule) {
  if (!schedule || !Array.isArray(schedule.pagesUnread) || schedule.pagesUnread.length === 0) {
    return ''
  }
  const parts = schedule.pagesUnread.map(r => (r.from === r.to ? String(r.from) : r.from + '–' + r.to))
  const pages = parts.length === 1
    ? 'page ' + parts[0]
    : 'pages ' + parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1]
  return 'Some of this schedule could not be read: ' + pages + ' of ' + schedule.document +
    ' were not read, so a class printed there is missing from this list.'
}

/**
 * The country schedule one scope works to, with the tier that supplied it named.
 *
 * ⚠ NEAREST TIER WINS, exactly as it does for the six rates, and for the same reason: a level
 * that has approved its own schedule should not be overruled by what the level above did.
 * Today only the global group manager tier may approve one, so in practice this finds the
 * brand's — but the walk is the general one, so the day a tier is added the resolver does not
 * change.
 *
 * ⚠ IT NEVER REJECTS, and an advisor is never blocked — Mike's standing ruling for this whole
 * feature. But it does not hide a failure either.
 *
 * 🔴 `unreachable` IS WHY THIS RETURNS AN OBJECT RATHER THAN THE SCHEDULE. A store that cannot
 * be read and a country nobody has loaded both produce no table, and on screen they are the
 * same empty picker. That is the absence-looks-like-a-negative failure this feature guards
 * against everywhere else — the one that had a session conclude New Zealand has no first-year
 * rule — and it would be built straight back in by returning null for both. A caller that only
 * wants the table ignores the flag; a caller putting words on a screen must not.
 *
 * @param {string|null} scopeId - the caller's VERIFIED scope, never a request body
 * @param {*} country - the client's country
 * @param {function(string, string): Promise<Object|null>} loadFirmConfig - the overlay reader,
 *   injected rather than imported so tests need no database
 * @returns {Promise<{schedule: object|null, unreachable: boolean}>} the schedule carries
 *   `originTier` and `originScopeId`; `unreachable` is true when a tier could not be read, so a
 *   caller can tell "nothing is loaded" from "we could not look"
 */
async function resolveCountrySchedule (scopeId, country, loadFirmConfig) {
  const code = normaliseCountry(country)
  if (!scopeId || code === null) { return { schedule: null, unreachable: false } }

  const configKey = configKeyFor(code)
  const chain = scopeChain(scopeId)
  let found = null
  let unreachable = false

  // Mentor first, this scope last, so a nearer tier simply overwrites a further one and the
  // last writer is the origin — the same walk depreciationRates.js makes.
  for (let i = 0; i < chain.length; i++) {
    const at = chain[i]
    let stored = null
    try {
      stored = await loadFirmConfig(at, configKey)
    } catch (err) {
      // One unreachable tier must not lose the tiers already applied, and must not stop the
      // ones below it being asked — but it IS recorded, so a screen never reports a store it
      // could not read as a country nobody has loaded.
      console.error('[country-schedules] scope read failed:', err.message)
      unreachable = true
      continue
    }
    if (stored === null || stored === undefined) { continue }

    const { ok, value, errors } = validateCountrySchedule(stored, { expectCountry: code })
    if (!ok) {
      // Logged rather than swallowed: a stored schedule that no longer validates is a manager's
      // approved work becoming invisible, and nothing on a screen would otherwise say why.
      console.error('[country-schedules] stored schedule refused for ' + at + ' ' + code + ': ' + errors.join('; '))
      continue
    }

    found = { ...value, originTier: tierOfScope(at), originScopeId: at }
  }

  return { schedule: found, unreachable }
}

/**
 * The classes in a schedule whose wording matches a query.
 *
 * 🔴 THE SEARCH IS SERVER-SIDE AND THE CAP IS NOT NEGOTIABLE. A country's table is around
 * 2,800 rows; sending it to a browser to be filtered there would put 400 KB on the wire for
 * every keystroke, and the picker only ever shows a handful. The whole table never leaves the
 * backend.
 *
 * Matching is a case-insensitive substring of the tax authority's own wording — not a fuzzy
 * match. A manager searching a published schedule is looking for words that are printed in it,
 * and a fuzzy hit that quietly reorders results is the kind of silent selection this feature
 * refuses everywhere else.
 *
 * @param {object|null} schedule - a validated schedule, or null
 * @param {*} query - what the manager typed
 * @param {number} [limit] - most rows to return; defaults to 50
 * @returns {{matches: object[], total: number, truncated: boolean}} `total` is how many
 *   matched in all, so the screen can say "50 of 214" rather than implying there were 50.
 */
function searchScheduleClasses (schedule, query, limit) {
  const cap = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 200) : 50
  const classes = (schedule && Array.isArray(schedule.classes)) ? schedule.classes : []
  const needle = typeof query === 'string' ? query.trim().toLowerCase() : ''

  // An empty query returns the head of the schedule rather than nothing, so a picker opens
  // showing the document's own first classes instead of an empty box.
  const matched = needle === ''
    ? classes
    : classes.filter(c => c.label.toLowerCase().includes(needle))

  return {
    matches: matched.slice(0, cap),
    total: matched.length,
    truncated: matched.length > cap
  }
}

/**
 * May a scope at this tier load and approve a country schedule?
 *
 * @param {string|null} scopeId - the caller's VERIFIED scope
 * @returns {boolean}
 */
function mayLoadSchedules (scopeId) {
  if (!scopeId || typeof scopeId !== 'string') { return false }
  return TIERS_THAT_MAY_LOAD.includes(tierOfScope(scopeId))
}

module.exports = {
  CONFIG_KEY_PREFIX,
  TIERS_THAT_MAY_LOAD,
  METHODS,
  MAX_SCHEDULE_CLASSES,
  MAX_UNRESOLVED,
  MAX_PAGE_RANGES,
  MAX_PAGE,
  configKeyFor,
  cleanClass,
  cleanPageRanges,
  cleanUnresolved,
  validateCountrySchedule,
  unreadPagesSentence,
  resolveCountrySchedule,
  searchScheduleClasses,
  mayLoadSchedules
}
