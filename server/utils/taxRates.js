'use strict'

/**
 * @file The tax figures one scope works to for one country — the app's own four, with each
 *   tier's APPROVED table laid over them.
 * @module server/utils/taxRates
 *
 * Item 4.81, slice 1. Asked for by Mike on 2026-09-08 — *"is it worth having a field in the
 * firm manager hub where tax pdfs can be loaded to be read by the AI so it can be accurate
 * per country?"* — and confirmed by him on 2026-09-09 when a session reported the tax rate as
 * a gap he had not asked for: *"of course i want the tax rate made contry aware - i literally
 * asked for that!"* The artefact is `design/mockups/tax-rates.html`, approved 2026-09-09.
 *
 * 🔴 A SEPARATE FEATURE FROM DEPRECIATION RATES, ON PURPOSE. A tax rate turns something into
 * tax owed; a depreciation rate writes an asset's book value down. Mike renamed item 4.78 on
 * 2026-09-09 precisely because one tab was promising both and delivering one. The two share
 * this machinery — one country table, one cascade, one approve-before-use gate — and nothing
 * on screen. See `design/features/depreciation-rates.md`, whose Brief says in terms that it
 * does not cover what is in this file.
 *
 * 🔴 NOTHING HERE CAN READ AN UNAPPROVED TABLE, AND IT IS STRUCTURAL RATHER THAN A CHECK
 * SOMEBODY REMEMBERED TO WRITE. `CLAUDE.md` requires `isApproved: true` before AI output
 * reaches a financial operation, so the store holds APPROVED TABLES ONLY: a country entry
 * without `approvedAt` and `approvedBy` fails `validateTaxRates` and is dropped by the
 * resolver like any other malformed value. A proposal the model has extracted and nobody has
 * accepted is not stored here at all. There is therefore no flag to forget to test and no
 * state in which an unapproved figure can reach a forecast.
 *
 * ⚠ EVERY TABLE IS TAGGED WITH ITS COUNTRY AND APPLIES ONLY TO CLIENTS IN IT, and a country
 * nobody has loaded a document for gets the app's own four, badged as defaults. The advisor is
 * never blocked — Mike's ruling of 2026-09-08, in his words: *"Never block the advisor."*
 *
 * 🔴 THE FOUR FIGURES, AND WHY IT IS FOUR RATHER THAN THE TWO THE ITEM WAS FILED FOR. Drawing
 * the screen found that the forecast's GST section fixes three things, not one: the rate, how
 * often a return is filed, and whether GST follows the invoice or the payment. All three were
 * New Zealand's. **A right rate on a wrong filing cycle is still a wrong cash flow**, so the
 * cycle and the basis are figures here like the rates are.
 */

const BASE_FILE = require('../../data/tax-rates.json')
const { scopeChain, tierOfScope } = require('./tierChain')
const {
  MAX_LABEL,
  normaliseCountry,
  num,
  publishedKey,
  cleanSource,
  cleanRate,
  cleanText
} = require('./sourcedFigure')

/**
 * The app's own four figures.
 *
 * `_`-prefixed keys are the data file's own documentation and are stripped by reading
 * `figures` alone, so the note explaining that these are New Zealand's stays beside the
 * figures it explains and never reaches an API response or the model.
 */
const BASE_TAX_FIGURES = BASE_FILE.figures

/** The four figures the forecast has, in the order a manager reads them. */
const FIGURE_KEYS = ['companyTax', 'gst', 'filing', 'basis']

/** The overlay address an approved table is stored under, at every tier. */
const CONFIG_KEY = 'tax-rates'

/**
 * The filing cycles a forecast can actually carry, as numbers of months.
 *
 * 🔴 DIVISORS OF TWELVE, AND THAT IS AN ENGINEERING CONSTRAINT RATHER THAN A PREFERENCE. The
 * forecast runs for twelve months. A cycle that does not divide into twelve leaves a partial
 * period at the end whose return falls due outside the forecast, so the last filing is either
 * dropped or paid early — and both are wrong in a way that still balances. Every real cycle
 * fits: New Zealand's one-, two- and six-monthly, Australia's and the United Kingdom's
 * quarterly, and an annual return.
 *
 * ⚠ `2` and `6` are the two the engine already computes; `1` is its third. The rest are why
 * item 4.81 exists — before it, a three-month cycle could not be expressed at all.
 */
const FILING_MONTHS = [1, 2, 3, 4, 6, 12]

/**
 * How GST is accounted for, canonically.
 *
 * New Zealand says *Invoice*, Australia says *Accruals*, and they are the same rule. The
 * country's own word is kept beside this in `label`; storing the word alone would hand the
 * engine two spellings of one behaviour, which is the fault `normaliseCountry` exists to stop
 * one level up.
 */
const BASIS_VALUES = ['invoice', 'cash']

/**
 * The longest chain of superseded figures kept beside a figure. The older figure is SHOWN
 * rather than dropped, so a firm sees a disagreement between two documents; a cap stops a
 * table reloaded thirty times from carrying thirty dead figures into every forecast response.
 */
const MAX_SUPERSEDED = 5

/**
 * Longest the company tax rate's "which entities this applies to" line may be.
 *
 * 🔴 IT IS A SENTENCE, NOT A RULE ENGINE — Mike's approval of 2026-09-09. Australia has two
 * company rates behind a turnover and passive-income test; New Zealand has one for companies
 * and another for trusts. The forecast applies ONE flat rate to monthly profit
 * (`taxOnMonthProfit[m] = netSurplusBeforeTax[m] * taxRate`) and has no concept of bands,
 * entity types or eligibility. Modelling that is a different and much larger piece of work.
 * So the manager writes *"base rate entities — turnover under $50m"* in their own words, the
 * advisor reads it beside the rate, and the app claims nothing it cannot support.
 */
const MAX_APPLIES_TO = 200

/**
 * Validate the parts every figure shares, and return the tail of a cleaned entry.
 *
 * @param {*} value
 * @param {string} where - for the error message
 * @param {string[]} errors - collected in place
 * @returns {object|null} `{ source }`, or null when the figure was refused
 */
function cleanCommon (value, where, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${where} must be a non-array JSON object`)
    return null
  }
  const source = cleanSource(value.source, where, errors)
  if (source === null) { return null }
  return { source }
}

/**
 * Validate the COMPANY TAX RATE — the flat rate applied to profit before tax.
 *
 * @param {*} value
 * @param {string} where
 * @param {string[]} errors
 * @returns {object|null}
 */
function cleanCompanyTax (value, where, errors) {
  const common = cleanCommon(value, where, errors)
  if (common === null) { return null }
  const rate = cleanRate(value.rate, `${where}.rate`, errors)
  if (rate === null) { return null }
  return { rate, appliesTo: cleanText(value.appliesTo, MAX_APPLIES_TO), source: common.source }
}

/**
 * Validate the GST / VAT RATE — charged on sales, reclaimed on purchases.
 *
 * @param {*} value
 * @param {string} where
 * @param {string[]} errors
 * @returns {object|null}
 */
function cleanGst (value, where, errors) {
  const common = cleanCommon(value, where, errors)
  if (common === null) { return null }
  const rate = cleanRate(value.rate, `${where}.rate`, errors)
  if (rate === null) { return null }
  return { rate, source: common.source }
}

/**
 * Validate the FILING CYCLE — a number of months, and the country's own name for it.
 *
 * The label is mandatory rather than derived. *Quarterly*, *BAS* and *Two-monthly* are what a
 * manager approved and what an advisor reads; deriving "every 3 months" from the number would
 * put words on a lender-facing screen that no document ever used.
 *
 * @param {*} value
 * @param {string} where
 * @param {string[]} errors
 * @returns {object|null}
 */
function cleanFiling (value, where, errors) {
  const common = cleanCommon(value, where, errors)
  if (common === null) { return null }

  const months = num(value.months)
  if (months === null || !FILING_MONTHS.includes(months)) {
    errors.push(`${where}.months must be one of: ${FILING_MONTHS.join(', ')} — a cycle that does not divide into twelve leaves a return falling due outside the forecast`)
    return null
  }

  const label = cleanText(value.label, MAX_LABEL)
  if (label === null) {
    errors.push(`${where}.label must be the country's own name for the cycle, such as Quarterly`)
    return null
  }

  return { months, label, source: common.source }
}

/**
 * Validate the ACCOUNTING BASIS — whether GST follows the invoice or the payment.
 *
 * @param {*} value
 * @param {string} where
 * @param {string[]} errors
 * @returns {object|null}
 */
function cleanBasis (value, where, errors) {
  const common = cleanCommon(value, where, errors)
  if (common === null) { return null }

  const basis = typeof value.basis === 'string' ? value.basis.trim().toLowerCase() : ''
  if (!BASIS_VALUES.includes(basis)) {
    errors.push(`${where}.basis must be one of: ${BASIS_VALUES.join(', ')}`)
    return null
  }

  const label = cleanText(value.label, MAX_LABEL)
  if (label === null) {
    errors.push(`${where}.label must be the country's own word for the basis, such as Accruals`)
    return null
  }

  return { basis, label, source: common.source }
}

/** The validator for each figure, by key. An unknown key has none, which is the point. */
const CLEANERS = {
  companyTax: cleanCompanyTax,
  gst: cleanGst,
  filing: cleanFiling,
  basis: cleanBasis
}

/**
 * Validate one figure, with the superseded figures it replaced.
 *
 * @param {string} key - one of FIGURE_KEYS
 * @param {*} value
 * @param {string} where
 * @param {string[]} errors
 * @param {boolean} allowSuperseded - false inside a `superseded` entry, so the older figures
 *   cannot themselves carry older figures and nest without limit
 * @returns {object|null}
 */
function cleanFigure (key, value, where, errors, allowSuperseded) {
  const entry = CLEANERS[key](value, where, errors)
  if (entry === null) { return null }

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
      const one = cleanFigure(key, value.superseded[i], `${where}.superseded[${i}]`, errors, false)
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
 * The shape is `{ <COUNTRY>: { approvedAt, approvedBy, figures: { <key>: entry } } }`. A tier
 * holds only the countries it has approved something for; an absent country means "keep taking
 * this from the level above", exactly as an absent field does in every other cascading block.
 *
 * ⚠ A PARTIAL TABLE IS LEGITIMATE AND IS THE COMMON CASE. A document that publishes the
 * company tax rate and nothing else yields a table with one figure in it, and the other three
 * keep coming from the layer above. That is why the figures are validated one at a time rather
 * than as a set of four.
 *
 * An UNKNOWN figure key is an error rather than a silent drop. The forecast reads four figures
 * and no fifth, so a figure stored under a name the engine has never heard of is a figure a
 * manager believes they approved and which can never reach a single forecast.
 *
 * @param {*} value - the candidate object, from a request body or the store.
 * @returns {{ok: boolean, errors: string[], value: object}} `value` holds only the recognised,
 *   in-range countries and is meaningful only when `ok` is true.
 */
function validateTaxRates (value) {
  const errors = []
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, errors: ['Tax Rates must be a non-array JSON object'], value: {} }
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

    // The approval gate, and the only one there is. See this file's header: an approved table
    // is the only thing this store can hold, so a table that cannot name who approved it and
    // when is not a table.
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

    const figures = table.figures
    if (!figures || typeof figures !== 'object' || Array.isArray(figures)) {
      errors.push(`${country}.figures must be a non-array JSON object`)
      return
    }

    const cleanFigures = {}
    let bad = false
    Object.keys(figures).forEach((key) => {
      if (!FIGURE_KEYS.includes(key)) {
        errors.push(`${country}.figures.${key} is not one of the forecast's tax figures`)
        bad = true
        return
      }
      const entry = cleanFigure(key, figures[key], `${country}.figures.${key}`, errors, true)
      if (entry === null) { bad = true; return }
      cleanFigures[key] = entry
    })
    if (bad) { return }

    // A country approved with nothing in it would inherit every figure from the layer above
    // while claiming on screen to be this scope's own table.
    if (Object.keys(cleanFigures).length === 0) {
      errors.push(`${country} has no tax figures in it`)
      return
    }

    clean[country] = { approvedAt, approvedBy, figures: cleanFigures }
  })

  return { ok: errors.length === 0, errors, value: clean }
}

/**
 * Two documents give one figure a different value. Which one does the firm use?
 *
 * 🔴 THE NEWER PUBLICATION DATE WINS, AND THE OLDER FIGURE IS SHOWN BESIDE IT — Mike's ruling
 * of 2026-09-08 for the sibling feature, and it governs here for the same reason: silent
 * selection is how a wrong figure becomes invisible.
 *
 * Two guards on top of the ruling, both deliberate:
 *   - EQUAL DATES KEEP THE INCUMBENT. Two documents published the same month do not rank, and
 *     inventing an order between them would be the silent selection the ruling forbids. The
 *     newcomer is still recorded beside it, so the disagreement is on the screen.
 *   - THE LOSER'S OWN superseded HISTORY IS CARRIED THROUGH, oldest dropped past the cap.
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

  // The value is part of the identity so that the SAME document reloaded does not read on
  // screen as disagreeing with itself, while a genuinely changed figure from a re-issued
  // document still records both.
  const valueOf = entry => [entry.rate, entry.months, entry.basis]
    .filter(v => v !== undefined && v !== null).join('/')
  const idOf = entry => String(entry.source && entry.source.document) + '|' +
    String(entry.source && entry.source.published) + '|' + valueOf(entry)

  const history = []
  // Seeded with the WINNER, so a figure can never appear in its own superseded list.
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
 * The tax figures one scope works to for one country, with every tier above it already
 * applied, and each figure saying where it came from.
 *
 * 🔴 WHY THIS RESOLVES TOP-DOWN INSTEAD OF RECURSING UP AND MERGING. `propertyTaxRules`,
 * `forecastTrendThresholds` and `forecastSellDown` recurse upward and `deepMerge` the result,
 * which is correct for them and would lose the one thing this screen exists to show. The
 * approved drawing badges EACH FIGURE with where it came from — *your firm · ATO Jul 2025*,
 * *group manager*, *app default* — several origins in one table. A merged object cannot say
 * which layer supplied which key, so this walks `scopeChain` from the mentor down and records
 * the origin as it overwrites. Same inheritance, same result, plus the provenance the artefact
 * requires. It is the sibling feature's reasoning and its shape, deliberately.
 *
 * @param {string|null} scopeId - the scope to resolve for, taken from the verified JWT and
 *   NEVER from a request body — a body-supplied id would let one firm read another's
 *   configuration (`tier-cascade.md` P6).
 * @param {*} country - the CLIENT's country. An unrecognised or absent one is not an error: it
 *   resolves to the app's own four figures, because an advisor is never blocked by a country
 *   nobody has loaded a document for.
 * @param {function(string, string): Promise<Object|null>} loadFirmConfig - the overlay reader,
 *   injected rather than imported so tests need no database.
 * @returns {Promise<{country: string|null, figures: object, isDefault: boolean}>} all four
 *   figures, each carrying `originTier` and `originScopeId` (both null when the figure is the
 *   app's own). NEVER REJECTS: a tax read must not stop an advisor building a forecast, and
 *   the worst case is the four defaults — which is what every firm gets today.
 */
async function loadResolvedTaxRates (scopeId, country, loadFirmConfig) {
  const code = normaliseCountry(country)

  const figures = {}
  FIGURE_KEYS.forEach((key) => {
    figures[key] = { ...BASE_TAX_FIGURES[key], originTier: null, originScopeId: null }
  })
  const flat = { country: code, figures, isDefault: true }

  if (!scopeId || code === null) { return flat }

  // Mentor first, this scope last, so a nearer tier simply overwrites a further one and the
  // last writer is the origin. `scopeChain` is the same seam every cascading block asks.
  const chain = scopeChain(scopeId)
  let touched = false

  for (let i = 0; i < chain.length; i++) {
    const at = chain[i]
    let stored = null
    try {
      stored = await loadFirmConfig(at, CONFIG_KEY)
    } catch (err) {
      // One unreachable tier must not lose the tiers already applied, and must not stop the
      // ones below it being asked. The worst case stays "the layer above".
      console.error('[tax-rates] scope read failed:', err.message)
      continue
    }

    const { ok, value } = validateTaxRates(stored)
    if (!ok) { continue }
    const table = value[code]
    if (!table) { continue }

    const tier = tierOfScope(at)
    Object.keys(table.figures).forEach((key) => {
      figures[key] = {
        ...table.figures[key],
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
  BASE_TAX_FIGURES,
  FIGURE_KEYS,
  CONFIG_KEY,
  FILING_MONTHS,
  BASIS_VALUES,
  MAX_SUPERSEDED,
  MAX_APPLIES_TO,
  validateTaxRates,
  pickNewer,
  loadResolvedTaxRates
}
