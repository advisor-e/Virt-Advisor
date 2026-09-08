'use strict'

/**
 * Depreciation rates per country — Restify routes.
 *
 * Item 4.78, slice 2. The rates a client's forecast writes assets down at, read from that
 * client's own tax authority's documents and approved by a firm manager before anything uses
 * them. Design: `design/features/depreciation-rates.md`;
 * `specs/001-depreciation-rates-per-country/spec.md`.
 *
 * Access is asymmetric, exactly as the property tax rules and the trend thresholds are:
 *   - READ  (`get`)      — any signed-in user (`firmAuth`). Every advisor building a
 *     forecast needs it, so it must never require a manager role and must never break the
 *     forecast: on any failure it degrades to the app's own six rates. Mike's ruling of
 *     2026-09-08, in his words: *"Never block the advisor."*
 *   - MANAGE (`getForManager` / `approveRates` / `approveFirstYearRule` / `history` /
 *     `restore`) — managers only (`firmAuth` + the managing-tier guard, wired in
 *     restify-server.js).
 *
 * 🔴 EVERY ROUTE IS SCOPED TO `req.firmId`, THE VERIFIED SCOPE FROM THE JWT. No handler here
 * reads a scope from a body or a query, so one firm can never read or write another's tables
 * (`tier-cascade.md` P6).
 *
 * 🔴 AND `approvedBy` IS TAKEN FROM THE VERIFIED TOKEN, NEVER FROM THE BODY. It is the name
 * that appears beside a rate on a document a lender reads; a body-supplied approver would let
 * anyone with the route sign somebody else's name to a tax table.
 *
 * 🔴 TWO APPROVE ROUTES, NOT ONE, AND THAT IS THE RULING RATHER THAN A CONVENIENCE. Mike,
 * 2026-09-09: a first-year rule gets its own Approve, separate from the rates'. Two routes
 * make that structural — approving a rate table cannot adopt a tax scheme as a side effect,
 * because the handler that writes rates never touches `firstYearRule` and vice versa. A
 * single route with a flag would have put that guarantee in a caller's hands.
 *
 * Persistence rides the same `firmOverlay` store as the rest of the config (`config_key`
 * `'depreciation-rates'`), so version history and restore come for free. A dev-JSON fallback
 * keeps it usable before the MySQL table is provisioned.
 */

const fs = require('fs')
const path = require('path')
const overlay = require('../utils/firmOverlay')
const { sendError } = require('../utils/sendError')
const { devFallbackAllowed } = require('../utils/dbFailure')
const { parentScopeOf } = require('../utils/tierChain')
const {
  BASE_DEPRECIATION_RATES,
  CONFIG_KEY,
  normaliseCountry,
  validateDepreciationRates,
  loadResolvedDepreciationRates
} = require('../utils/depreciationRates')

const DEV_FILE = path.resolve(__dirname, '../../data/dev-depreciation-rates.json')

/** Dev-only: this scope's own stored tables from the JSON fallback, or null. */
function devRead (scopeId) {
  try {
    const all = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8'))
    const own = all[scopeId]
    return (own && typeof own === 'object' && !Array.isArray(own)) ? own : null
  } catch (e) { return null }
}

/** Dev-only: persist this scope's own tables to the JSON fallback. */
function devWrite (scopeId, value) {
  let all = {}
  try { all = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8')) } catch (e) { all = {} }
  all[scopeId] = value
  fs.writeFileSync(DEV_FILE, JSON.stringify(all, null, 2))
}

/**
 * The overlay reader the resolver walks the tier chain with, falling back to the dev file so
 * the cascade behaves the same way with and without a database.
 * @param {string} scopeId
 * @param {string} key
 * @returns {Promise<object|null>}
 */
async function readScopeConfig (scopeId, key) {
  try {
    return await overlay.loadFirmConfig(scopeId, key)
  } catch (err) {
    if (devFallbackAllowed(err)) { return devRead(scopeId) }
    throw err
  }
}

/** This scope's OWN stored tables, validated, or {} when it has none we can use. */
async function ownTables (scopeId) {
  const stored = await readScopeConfig(scopeId, CONFIG_KEY)
  const { ok, value } = validateDepreciationRates(stored)
  return ok ? value : {}
}

/** Write this scope's own tables, through the overlay or the dev file. */
async function writeTables (scopeId, tables, userEmail) {
  try {
    await overlay.saveFirmConfig(scopeId, CONFIG_KEY, tables, userEmail)
  } catch (err) {
    if (!devFallbackAllowed(err)) { throw err }
    devWrite(scopeId, tables)
  }
}

/** The everything-defaults answer, for a read that cannot be served. */
function defaultsFor (country) {
  const categories = {}
  Object.keys(BASE_DEPRECIATION_RATES).forEach((key) => {
    categories[key] = { ...BASE_DEPRECIATION_RATES[key], originTier: null, originScopeId: null }
  })
  return { country: normaliseCountry(country), categories, firstYearRule: null, isDefault: true }
}

/**
 * GET /api/report/depreciation-rates?country=NZ  (firmAuth)
 *
 * The rates this scope works to for one country, with every tier above it already applied and
 * each rate saying where it came from. The forecast's assets step draws its badges from this.
 *
 * @route GET /api/report/depreciation-rates
 * @param {string} req.query.country - the CLIENT's country, two letters. An absent or
 *   unrecognised one is not an error: it resolves to the app's own six rates, because an
 *   advisor is never blocked by a country nobody has loaded a document for.
 * @returns {{country: string|null, categories: object, firstYearRule: object|null, isDefault: boolean}}
 */
async function get (req, res) {
  const country = req.query && req.query.country
  try {
    const resolved = await loadResolvedDepreciationRates(req.firmId, country, readScopeConfig)
    res.send(200, resolved)
  } catch (err) {
    // A rate read must never stop an advisor building a forecast. The worst case is the six
    // app defaults, which is what every firm gets today anyway.
    console.error('[depreciation-rates] read failed:', err.message)
    res.send(200, defaultsFor(country))
  }
}

/**
 * GET /api/firm-manager/depreciation-rates?country=NZ  (manager)
 *
 * What this tier is working to for one country, split three ways so the screen can show the
 * difference rather than assert it: what it INHERITS, what it has APPROVED itself, and the
 * RESOLVED result the advisors under it actually get. `countries` lists every country this
 * scope has approved something for, so the screen can offer them without a second call.
 *
 * @route GET /api/firm-manager/depreciation-rates
 * @returns {{country: string|null, inherited: object, own: object|null, resolved: object,
 *   hasOwn: boolean, countries: string[]}}
 */
async function getForManager (req, res) {
  const country = normaliseCountry(req.query && req.query.country)
  try {
    const mine = await ownTables(req.firmId)
    const countries = Object.keys(mine).sort()

    if (country === null) {
      res.send(200, {
        country: null,
        inherited: defaultsFor(null),
        own: null,
        resolved: defaultsFor(null),
        hasOwn: false,
        countries
      })
      return
    }

    // The layer above, asked for by resolving the PARENT rather than subtracting our own
    // values from the result — subtraction cannot tell "same as above" from "approved here to
    // the same thing", and those are different decisions.
    const parent = parentScopeOf(req.firmId)
    const inherited = parent === null
      ? defaultsFor(country)
      : await loadResolvedDepreciationRates(parent, country, readScopeConfig)

    const resolved = await loadResolvedDepreciationRates(req.firmId, country, readScopeConfig)

    res.send(200, {
      country,
      inherited,
      own: mine[country] || null,
      resolved,
      hasOwn: Boolean(mine[country]),
      countries
    })
  } catch (err) {
    console.error('[depreciation-rates] manager read failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read the depreciation rates')
  }
}

/**
 * POST /api/firm-manager/depreciation-rates  (manager)
 *
 * Approve a country's RATE TABLE. Replaces this scope's own table for that country and
 * leaves every other country untouched.
 *
 * ⚠ IT NEVER TOUCHES `firstYearRule`. A rule already adopted for this country survives an
 * approval of the rates, and a rule is never adopted by one — that is the second Approve
 * button, and it is a different route. See this file's header.
 *
 * @route POST /api/firm-manager/depreciation-rates
 * @param {object} req.body - `{ country: 'NZ', categories: { <key>: entry } }`
 * @returns {{approved: true, country: string, resolved: object}}
 */
async function approveRates (req, res) {
  const body = req.body || {}
  const country = normaliseCountry(body.country)
  if (country === null) {
    return sendError(res, 400, 'INVALID_COUNTRY', 'country must be a two-letter code, such as NZ')
  }
  if (!body.categories || typeof body.categories !== 'object' || Array.isArray(body.categories)) {
    return sendError(res, 400, 'INVALID_RATES', 'categories must be a non-array JSON object')
  }

  try {
    const mine = await ownTables(req.firmId)
    const existing = mine[country] || {}

    const candidate = {
      approvedAt: new Date().toISOString(),
      // From the verified token, never the body — see this file's header.
      approvedBy: req.userEmail || '',
      categories: body.categories
    }
    // Carried forward rather than re-approved: the rule keeps its own approver and date.
    if (existing.firstYearRule) { candidate.firstYearRule = existing.firstYearRule }

    const next = { ...mine, [country]: candidate }
    const { ok, errors } = validateDepreciationRates(next)
    if (!ok) {
      return sendError(res, 400, 'INVALID_RATES', errors.join('; '))
    }

    await writeTables(req.firmId, next, req.userEmail)
    const resolved = await loadResolvedDepreciationRates(req.firmId, country, readScopeConfig)
    res.send(200, { approved: true, country, resolved })
  } catch (err) {
    console.error('[depreciation-rates] approve failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not save the depreciation rates')
  }
}

/**
 * POST /api/firm-manager/depreciation-rates/first-year-rule  (manager)
 *
 * Adopt, replace or withdraw a country's FIRST-YEAR RULE — New Zealand's Investment Boost,
 * and whatever another country calls its own. A null rule withdraws it.
 *
 * 🔴 A SEPARATE ROUTE BECAUSE IT IS A SEPARATE DECISION (Mike, 2026-09-09). Approving 41
 * depreciation rates is a routine review; adopting a 20% first-year write-off changes one
 * year's tax on every qualifying purchase a firm's clients make. The rates handler above
 * cannot reach this field and this one cannot reach the rates.
 *
 * ⚠ WITHDRAWING IS ALLOWED AND LEAVES THE RATES ALONE. A country whose table holds only a
 * rule is emptied entirely rather than left as a table with nothing in it.
 *
 * @route POST /api/firm-manager/depreciation-rates/first-year-rule
 * @param {object} req.body - `{ country: 'NZ', rule: object|null }`
 * @returns {{approved: true, country: string, resolved: object}}
 */
async function approveFirstYearRule (req, res) {
  const body = req.body || {}
  const country = normaliseCountry(body.country)
  if (country === null) {
    return sendError(res, 400, 'INVALID_COUNTRY', 'country must be a two-letter code, such as NZ')
  }

  try {
    const mine = await ownTables(req.firmId)
    const existing = mine[country]
    const next = { ...mine }

    if (body.rule === null || body.rule === undefined) {
      if (!existing) {
        return sendError(res, 404, 'NO_RULE', 'There is no first-year rule here to withdraw')
      }
      const stripped = { ...existing }
      delete stripped.firstYearRule
      // A table that held only a rule has nothing left to say once the rule goes.
      if (Object.keys(stripped.categories || {}).length === 0) {
        delete next[country]
      } else {
        next[country] = stripped
      }
    } else {
      const candidate = {
        approvedAt: (existing && existing.approvedAt) || new Date().toISOString(),
        approvedBy: (existing && existing.approvedBy) || req.userEmail || '',
        categories: (existing && existing.categories) || {},
        firstYearRule: {
          ...body.rule,
          // The rule's OWN approval, from the verified token. This is the second signature,
          // and it is what makes the second button mean something.
          approvedAt: new Date().toISOString(),
          approvedBy: req.userEmail || ''
        }
      }
      next[country] = candidate
    }

    const { ok, errors } = validateDepreciationRates(next)
    if (!ok) {
      return sendError(res, 400, 'INVALID_RULE', errors.join('; '))
    }

    await writeTables(req.firmId, next, req.userEmail)
    const resolved = await loadResolvedDepreciationRates(req.firmId, country, readScopeConfig)
    res.send(200, { approved: true, country, resolved })
  } catch (err) {
    console.error('[depreciation-rates] rule approve failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not save the first-year rule')
  }
}

/**
 * GET /api/firm-manager/depreciation-rates/history  (manager)
 * @route GET /api/firm-manager/depreciation-rates/history
 * @returns {{history: Array<object>}} every saved version of THIS scope's own tables.
 */
async function history (req, res) {
  try {
    const rows = await overlay.getVersionHistory(req.firmId, CONFIG_KEY)
    res.send(200, { history: rows })
  } catch (err) {
    if (devFallbackAllowed(err)) { res.send(200, { history: [] }); return }
    console.error('[depreciation-rates] history failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read the change history')
  }
}

/**
 * POST /api/firm-manager/depreciation-rates/restore  (manager)
 * @route POST /api/firm-manager/depreciation-rates/restore
 * @param {object} req.body - `{ versionId: number, country: string }`
 * @returns {{restored: true, resolved: object}}
 */
async function restore (req, res) {
  const versionId = req.body && req.body.versionId
  if (!versionId) {
    return sendError(res, 400, 'MISSING_VERSION', 'versionId is required')
  }
  try {
    await overlay.restoreVersion(req.firmId, CONFIG_KEY, Number(versionId))
    const resolved = await loadResolvedDepreciationRates(
      req.firmId, req.body && req.body.country, readScopeConfig
    )
    res.send(200, { restored: true, resolved })
  } catch (err) {
    console.error('[depreciation-rates] restore failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not restore that version')
  }
}

module.exports = {
  get,
  getForManager,
  approveRates,
  approveFirstYearRule,
  history,
  restore,
  readScopeConfig
}
