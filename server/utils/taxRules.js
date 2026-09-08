'use strict'

/**
 * @file The depreciation rates one scope works to for one country — the app's own six
 *   defaults, with each tier's APPROVED tax table laid over them.
 * @module server/utils/taxRules
 *
 * Item 4.78, slice 1. Asked for by Mike on 2026-09-08 — *"is it worth having a field in
 * the firm manager hub where tax pdfs can be loaded to be read by the AI so it can be
 * accurate per country?"* — and filed on his yes, after he overturned the recommendation
 * against it. The artefacts are `design/mockups/tax-rules-upload.html` (the firm manager's
 * screen) and `design/mockups/tax-rules-advisor.html` (the advisor's), both approved.
 *
 * 🔴 NOTHING IN THIS MODULE CAN READ AN UNAPPROVED TABLE, AND THAT IS STRUCTURAL RATHER
 * THAN A CHECK SOMEBODY REMEMBERED TO WRITE. `CLAUDE.md` requires `isApproved: true`
 * before AI output reaches a financial operation, so the store holds APPROVED TABLES ONLY:
 * a country entry without `approvedAt` and `approvedBy` fails `validateTaxRules` and is
 * dropped by the resolver like any other malformed value. A proposal the AI has extracted
 * and nobody has accepted is not stored here at all — it lives with its document, which is
 * slice 3. There is therefore no flag to forget to test and no state in which an
 * unapproved rate can reach a forecast.
 *
 * 🔴 RATES ARE DECIMALS, 0..1 — 50% is 0.5, never 50. Same convention as
 * `propertyTaxRules.js`, and it is the ENGINE's: `threeWayForecastModel.assetSchedule`
 * multiplies the book value by this number directly. A `50` accepted here would depreciate
 * an asset by 5000% a year and the forecast would still balance, which is exactly the
 * failure the item was filed against. It is refused, never clamped.
 *
 * ⚠ EVERY TABLE IS TAGGED WITH ITS COUNTRY AND APPLIES ONLY TO CLIENTS IN IT — Mike's
 * ruling 4 of 2026-09-08. That is why `country` is a parameter of the resolver rather than
 * a property of the scope: one firm has clients in more than one, which is the whole reason
 * the advisor's half of this feature exists.
 *
 * ⚠ A COUNTRY NOBODY HAS LOADED A DOCUMENT FOR GETS THE APP'S SIX DEFAULTS, badged as such,
 * and the advisor is never blocked — ruling 3, in his words: *"Never block the advisor."*
 * Stopping someone mid-report because a manager has not loaded a document punishes the
 * wrong person.
 *
 * 🔴 WHY THIS RESOLVES TOP-DOWN INSTEAD OF RECURSING UP LIKE ITS THREE SIBLINGS.
 * `propertyTaxRules`, `forecastTrendThresholds` and `forecastSellDown` recurse upward and
 * `deepMerge` the result, which is correct for them and would lose the one thing this
 * screen exists to show. The approved advisor drawing badges EACH ROW with where its rate
 * came from — *your firm · IR265*, *group manager · NZ*, *app default* — three origins in
 * one table. A merged object cannot say which layer supplied which key, so this walks
 * `scopeChain` from the mentor down and records the origin as it overwrites. Same
 * inheritance, same result, plus the provenance the artefact requires.
 */

const BASE_FILE = require('../../data/tax-rules.json')
const { scopeChain, tierOfScope } = require('./tierChain')

/**
 * The app's own six rates.
 *
 * `_`-prefixed keys are the data file's own documentation and are stripped here rather
 * than in the file, so the note explaining that these are a GUESS stays beside the guess
 * it explains and never reaches an API response or the model.
 */
const BASE_TAX_RULES = BASE_FILE.categories

/** The six fixed-asset categories the forecast has, in the order the engine holds them. */
const CATEGORY_KEYS = Object.keys(BASE_TAX_RULES)

/** The overlay address an approved table is stored under, at every tier. */
const CONFIG_KEY = 'tax-rules'

/** How a rate is applied. `dv` reduces the book value; `sl` writes off original cost. */
const METHODS = ['dv', 'sl']

/**
 * The longest chain of superseded figures kept beside a rate. Ruling 1 says the older
 * figure is SHOWN rather than dropped, so the firm sees a disagreement between two
 * documents; a cap stops a table that has been reloaded thirty times from carrying thirty
 * dead rates into every forecast response.
 */
const MAX_SUPERSEDED = 5

/** Longest an asset-class label or document name may be, in characters. */
const MAX_LABEL = 120

/** The oldest publication year worth believing, and the newest. */
const MIN_YEAR = 1980
const MAX_YEAR = 2100

/**
 * A country code, normalised — two letters, upper case (`NZ`, `AU`), or null.
 *
 * ISO 3166-1 alpha-2, which is what the rest of the app already speaks: advisor records
 * carry `country: 'DE'` (`server/collaborate/data/repository.js`) and a group manager's
 * scope id is composed from the same value (`tierChain.groupScopeId`). A full country NAME
 * is refused rather than guessed at — "New Zealand", "NZL" and "nz" are three spellings of
 * one country and a store holding all three has three tables where a firm approved one.
 *
 * @param {*} value
 * @returns {string|null} the code, or null when it is not one
 */
function normaliseCountry (value) {
  if (typeof value !== 'string') { return null }
  const code = value.trim().toUpperCase()
  return /^[A-Z]{2}$/.test(code) ? code : null
}

/** A finite number, or null for anything that is not one — including '' from a blank input. */
function num (v) {
  if (v === null || v === undefined || v === '') { return null }
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : null
}

/**
 * A publication date as a sortable integer, for ruling 1's "the newer document wins".
 *
 * Accepts `YYYY-MM` and `YYYY-MM-DD`, which is how tax authorities date a guide — IR265 is
 * *October 2023* and has no day. A missing day sorts as the 1st, so `2024-04` and
 * `2024-04-01` compare equal rather than one silently beating the other.
 *
 * @param {*} published
 * @returns {number|null} `YYYYMMDD` as a number, or null when it is not a date we can rank
 */
function publishedKey (published) {
  if (typeof published !== 'string') { return null }
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(published.trim())
  if (!m) { return null }
  const year = Number(m[1])
  const month = Number(m[2])
  const day = m[3] === undefined ? 1 : Number(m[3])
  if (year < MIN_YEAR || year > MAX_YEAR) { return null }
  if (month < 1 || month > 12) { return null }
  if (day < 1 || day > 31) { return null }
  return (year * 10000) + (month * 100) + day
}

/**
 * Validate one rate's source document.
 *
 * 🔴 A SOURCE IS MANDATORY ON A STORED RATE AND THERE IS NO WAY TO STORE ONE WITHOUT IT.
 * Both approved drawings show every figure with its document and date beneath it, and the
 * reason is not presentation: an unsourced number in an approved table is indistinguishable
 * from a sourced one on the page a lender reads. A rate with no document is an app default,
 * and app defaults live in `data/tax-rules.json`, not in a firm's approved table.
 *
 * @param {*} value
 * @param {string} where - for the error message
 * @param {string[]} errors - collected in place
 * @returns {object|null} the cleaned source, or null when it was refused
 */
function cleanSource (value, where, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${where}.source is required — an approved rate must name the document it came from`)
    return null
  }
  const document = typeof value.document === 'string' ? value.document.trim() : ''
  if (!document || document.length > MAX_LABEL) {
    errors.push(`${where}.source.document must be a document name of 1 to ${MAX_LABEL} characters`)
    return null
  }
  const key = publishedKey(value.published)
  if (key === null) {
    errors.push(`${where}.source.published must be a date like 2023-10 or 2023-10-31`)
    return null
  }
  const page = value.page === null || value.page === undefined ? null : String(value.page).trim().slice(0, 20)
  return { document, page: page || null, published: value.published.trim() }
}

/**
 * Validate one category's rate entry.
 *
 * @param {*} value
 * @param {string} where - for the error message
 * @param {string[]} errors - collected in place
 * @param {boolean} allowSuperseded - false inside a `superseded` entry, so the older
 *   figures cannot themselves carry older figures and nest without limit
 * @returns {object|null} the cleaned entry, or null when it was refused
 */
function cleanEntry (value, where, errors, allowSuperseded) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${where} must be a non-array JSON object`)
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
    // and reading it as 5000% puts a wrong figure into a forecast that still balances.
    if (n < 0 || n > 1) {
      errors.push(`${where}.${field} must be a rate between 0 and 1 (50% is 0.5, not 50)`)
      bad = true
      return
    }
    rates[field] = n
  })
  if (bad) { return null }

  // The rate the method names has to exist, or the entry says how to apply a number it
  // does not have — and the resolver would fall through to the app default while the
  // screen showed an approved row. A silent no-op is the one outcome nobody can see.
  const operative = method === 'dv' ? rates.dvRate : rates.slRate
  if (operative === null) {
    errors.push(`${where}.${method === 'dv' ? 'dvRate' : 'slRate'} is required when method is '${method}'`)
    return null
  }

  const lifeYears = num(value.lifeYears)
  if (lifeYears !== null && (lifeYears <= 0 || lifeYears > 100)) {
    errors.push(`${where}.lifeYears must be a number of years between 0 and 100`)
    return null
  }

  const label = typeof value.label === 'string' ? value.label.trim().slice(0, MAX_LABEL) : null

  const source = cleanSource(value.source, where, errors)
  if (source === null) { return null }

  const entry = { label: label || null, method, dvRate: rates.dvRate, slRate: rates.slRate, lifeYears, source }

  if (allowSuperseded && value.superseded !== undefined && value.superseded !== null) {
    if (!Array.isArray(value.superseded)) {
      errors.push(`${where}.superseded must be an array of the figures this one replaced`)
      return null
    }
    if (value.superseded.length > MAX_SUPERSEDED) {
      errors.push(`${where}.superseded may hold at most ${MAX_SUPERSEDED} earlier figures`)
      return null
    }
    const older = []
    for (let i = 0; i < value.superseded.length; i++) {
      const one = cleanEntry(value.superseded[i], `${where}.superseded[${i}]`, errors, false)
      if (one === null) { return null }
      older.push(one)
    }
    if (older.length) { entry.superseded = older }
  }

  return entry
}

/**
 * Validate a scope's OWN approved tax tables — the whole stored value at one tier.
 *
 * The shape is `{ <COUNTRY>: { approvedAt, approvedBy, categories: { <key>: entry } } }`.
 * A tier holds only the countries it has approved something for; an absent country means
 * "keep taking this from the level above", exactly as an absent field does in every other
 * cascading block here.
 *
 * An UNKNOWN category key is an error rather than a silent drop. The forecast has six
 * categories and no seventh is read by anything, so a rate stored under a name the engine
 * has never heard of is a rate a firm manager believes they approved and which can never
 * reach a single forecast.
 *
 * @param {*} value - the candidate object, from a request body or the store.
 * @returns {{ok: boolean, errors: string[], value: object}} `value` holds only the
 *   recognised, in-range countries and is meaningful only when `ok` is true.
 */
function validateTaxRules (value) {
  const errors = []
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, errors: ['tax rules must be a non-array JSON object'], value: {} }
  }

  const clean = {}

  Object.keys(value).forEach((rawCountry) => {
    const country = normaliseCountry(rawCountry)
    if (country === null) {
      errors.push(`${rawCountry} is not a two-letter country code (NZ, AU)`)
      return
    }
    const table = value[rawCountry]
    if (!table || typeof table !== 'object' || Array.isArray(table)) {
      errors.push(`${country} must be a non-array JSON object`)
      return
    }

    // The approval gate, and the only one there is. See this file's header: an approved
    // table is the only thing this store can hold, so a table that cannot name who
    // approved it and when is not a table.
    const approvedBy = typeof table.approvedBy === 'string' ? table.approvedBy.trim() : ''
    if (!approvedBy || approvedBy.length > MAX_LABEL) {
      errors.push(`${country}.approvedBy must name the manager who approved this table`)
      return
    }
    const approvedAt = typeof table.approvedAt === 'string' ? table.approvedAt.trim() : ''
    if (!approvedAt || Number.isNaN(Date.parse(approvedAt))) {
      errors.push(`${country}.approvedAt must be the date the table was approved`)
      return
    }

    const categories = table.categories
    if (!categories || typeof categories !== 'object' || Array.isArray(categories)) {
      errors.push(`${country}.categories must be a non-array JSON object`)
      return
    }

    const cleanCategories = {}
    let bad = false
    Object.keys(categories).forEach((key) => {
      if (!CATEGORY_KEYS.includes(key)) {
        errors.push(`${country}.categories.${key} is not one of the forecast's asset categories`)
        bad = true
        return
      }
      const entry = cleanEntry(categories[key], `${country}.categories.${key}`, errors, true)
      if (entry === null) { bad = true; return }
      cleanCategories[key] = entry
    })
    if (bad) { return }

    // A country approved with no rates in it would inherit every figure from the layer
    // above while claiming on screen to be this firm's own table.
    if (Object.keys(cleanCategories).length === 0) {
      errors.push(`${country} has no rates in it`)
      return
    }

    clean[country] = { approvedAt, approvedBy, categories: cleanCategories }
  })

  return { ok: errors.length === 0, errors, value: clean }
}

/**
 * Two documents give one asset class a different rate. Which one does the firm use?
 *
 * 🔴 RULED BY MIKE, 2026-09-08 (ruling 1): **the newer publication date wins, and the
 * older figure is shown beside it** — never silently dropped, so the firm sees the
 * disagreement and can overrule it. In his drawing's words, silent selection is how a
 * wrong rate becomes invisible.
 *
 * Two guards on top of the ruling, both deliberate:
 *   - EQUAL DATES KEEP THE INCUMBENT. Two documents published the same month do not rank,
 *     and inventing an order between them would be the silent selection the ruling forbids.
 *     The newcomer is still recorded beside it, so the disagreement is on the screen.
 *   - THE LOSER'S OWN superseded HISTORY IS CARRIED THROUGH, oldest figures dropped past
 *     the cap. A rate that has been superseded twice keeps both predecessors.
 *
 * @param {object|null} current - the figure in hand, already validated
 * @param {object} incoming - the figure from the newly read document, already validated
 * @returns {object} the figure to store, with the other in its `superseded` list
 */
function pickNewer (current, incoming) {
  if (!current) { return incoming }

  const currentKey = publishedKey(current.source && current.source.published)
  const incomingKey = publishedKey(incoming.source && incoming.source.published)
  const incomingWins = currentKey === null
    ? incomingKey !== null
    : (incomingKey !== null && incomingKey > currentKey)

  const winner = incomingWins ? incoming : current
  const loser = incomingWins ? current : incoming

  const idOf = entry => String(entry.source && entry.source.document) + '|' +
    String(entry.source && entry.source.published) + '|' +
    String(entry.method === 'dv' ? entry.dvRate : entry.slRate)

  const history = []
  // Seeded with the WINNER, so a figure can never appear in its own superseded list —
  // which is what reloading the same document twice would otherwise produce, and it
  // would read on screen as a document disagreeing with itself.
  const seen = { [idOf(winner)]: true }
  const push = (entry) => {
    if (!entry) { return }
    const id = idOf(entry)
    if (seen[id]) { return }
    seen[id] = true
    history.push(entry)
  }

  const bare = { ...loser }
  delete bare.superseded
  push(bare)
  ;(loser.superseded || []).forEach(push)
  ;(winner.superseded || []).forEach(push)

  const out = { ...winner }
  delete out.superseded
  if (history.length) { out.superseded = history.slice(0, MAX_SUPERSEDED) }
  return out
}

/**
 * The depreciation rates one scope works to for one country, with every tier above it
 * already applied, and each rate saying where it came from.
 *
 * @param {string|null} scopeId - the scope to resolve for, taken from the verified JWT and
 *   NEVER from a request body — a body-supplied id would let one firm read another's
 *   configuration (`tier-cascade.md` P6).
 * @param {*} country - the CLIENT's country. An unrecognised or absent one is not an
 *   error: it resolves to the app's own six defaults, because ruling 3 is that an advisor
 *   is never blocked by a country nobody has loaded a document for.
 * @param {function(string, string): Promise<Object|null>} loadFirmConfig - the overlay
 *   reader, injected rather than imported so tests need no database.
 * @returns {Promise<{country: string|null, categories: object, isDefault: boolean}>} every
 *   one of the six categories, each carrying `originTier` and `originScopeId` (both null
 *   when the figure is the app's own). NEVER REJECTS: a tax-table read must not stop an
 *   advisor building a forecast, and the worst case is the six defaults — which is what
 *   every firm gets today.
 */
async function loadResolvedTaxRules (scopeId, country, loadFirmConfig) {
  const code = normaliseCountry(country)

  const categories = {}
  CATEGORY_KEYS.forEach((key) => {
    categories[key] = { ...BASE_TAX_RULES[key], originTier: null, originScopeId: null }
  })
  const flat = { country: code, categories, isDefault: true }

  if (!scopeId || code === null) { return flat }

  // Mentor first, this scope last, so a nearer tier simply overwrites a further one and
  // the last writer is the origin. `scopeChain` is the same seam every cascading block
  // asks — see `tierChain.js`.
  const chain = scopeChain(scopeId)
  let touched = false

  for (let i = 0; i < chain.length; i++) {
    const at = chain[i]
    let stored = null
    try {
      stored = await loadFirmConfig(at, CONFIG_KEY)
    } catch (err) {
      // One unreachable tier must not lose the tiers already applied, and must not stop
      // the ones below it being asked. The worst case stays "the layer above".
      console.error('[tax-rules] scope read failed:', err.message)
      continue
    }

    const { ok, value } = validateTaxRules(stored)
    if (!ok) { continue }
    const table = value[code]
    if (!table) { continue }

    const tier = tierOfScope(at)
    Object.keys(table.categories).forEach((key) => {
      categories[key] = {
        ...table.categories[key],
        originTier: tier,
        originScopeId: at,
        approvedAt: table.approvedAt,
        approvedBy: table.approvedBy
      }
      touched = true
    })
  }

  flat.isDefault = !touched
  return flat
}

module.exports = {
  BASE_TAX_RULES,
  CATEGORY_KEYS,
  CONFIG_KEY,
  METHODS,
  MAX_SUPERSEDED,
  normaliseCountry,
  publishedKey,
  validateTaxRules,
  pickNewer,
  loadResolvedTaxRules
}
