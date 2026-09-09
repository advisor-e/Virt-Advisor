'use strict'

/**
 * Tax rates per country — Restify routes.
 *
 * Item 4.81, slice 2. The company tax rate, GST rate, filing cycle and accounting basis a
 * client's forecast uses, taken from that client's own country and approved by a manager
 * before anything reads them. Design: `design/mockups/tax-rates.html`, approved 2026-09-09.
 *
 * 🔴 A SEPARATE TAB FROM DEPRECIATION RATES, WHICH IS THE ONE THING MIKE APPROVED BEFORE THE
 * DRAWING WAS MADE. He renamed that feature on 2026-09-09 because a tab called *Tax Rules*
 * promised GST and company tax and delivered a depreciation schedule. These routes are shaped
 * like its routes and share the store's machinery; they are not the same screen and must
 * never be merged into one.
 *
 * Access is asymmetric, exactly as the property tax rules, the trend thresholds and the
 * depreciation rates are:
 *   - READ  (`get`)      — any signed-in user (`firmAuth`). Every advisor building a forecast
 *     needs it, so it must never require a manager role and must never break the forecast: on
 *     any failure it degrades to the app's own four figures. Mike's ruling of 2026-09-08, in
 *     his words: *"Never block the advisor."*
 *   - MANAGE (`getForManager` / `approveFigures` / `history` / `restore`) — managers only
 *     (`firmAuth` + the managing-tier guard, wired in restify-server.js).
 *
 * 🔴 EVERY ROUTE IS SCOPED TO `req.firmId`, THE VERIFIED SCOPE FROM THE JWT. No handler here
 * reads a scope from a body or a query, so one firm can never read or write another's tables
 * (`tier-cascade.md` P6).
 *
 * 🔴 AND `approvedBy` IS TAKEN FROM THE VERIFIED TOKEN, NEVER FROM THE BODY. It is the name
 * that appears beside a tax rate on a document a lender reads; a body-supplied approver would
 * let anyone with the route sign somebody else's name to a tax table.
 *
 * Persistence rides the same `firmOverlay` store as the rest of the config (`config_key`
 * `'tax-rates'`), so version history and restore come for free. A dev-JSON fallback keeps it
 * usable before the MySQL table is provisioned.
 *
 * ⚠ NOT BUILT HERE: loading a document and having the model read it. That is slice 3, and it
 * is why there is no `documents` route in this file yet — a manager approves figures they
 * have typed or corrected, and the extraction that proposes them comes next.
 */

const fs = require('fs')
const path = require('path')
const overlay = require('../utils/firmOverlay')
const { sendError } = require('../utils/sendError')
const { devFallbackAllowed } = require('../utils/dbFailure')
const { parentScopeOf } = require('../utils/tierChain')
const { normaliseCountry } = require('../utils/sourcedFigure')
const {
  BASE_TAX_FIGURES,
  FIGURE_KEYS,
  CONFIG_KEY,
  validateTaxRates,
  loadResolvedTaxRates
} = require('../utils/taxRates')

/** The dev-JSON fallback, used only when there is no database to talk to. */
const DEV_FILE = path.resolve(__dirname, '../../data/dev-tax-rates.json')

/** Dev-only: this scope's own stored value from the JSON fallback, or null. */
function devRead (scopeId) {
  try {
    const all = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8'))
    const own = all[scopeId]
    return (own && typeof own === 'object' && !Array.isArray(own)) ? own : null
  } catch (e) { return null }
}

/** Dev-only: persist this scope's own value to the JSON fallback. */
function devWrite (scopeId, value) {
  let all = {}
  try { all = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8')) } catch (e) { all = {} }
  all[scopeId] = value
  fs.writeFileSync(DEV_FILE, JSON.stringify(all, null, 2))
}

/**
 * The overlay reader the resolver walks the tier chain with, falling back to the dev file so
 * the cascade behaves the same way with and without a database.
 *
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
  const { ok, value } = validateTaxRates(stored)
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
  const figures = {}
  FIGURE_KEYS.forEach((key) => {
    figures[key] = { ...BASE_TAX_FIGURES[key], originTier: null, originScopeId: null }
  })
  return { country: normaliseCountry(country), figures, isDefault: true }
}

/**
 * GET /api/report/tax-rates?country=AU  (firmAuth)
 *
 * The tax figures this scope works to for one country, with every tier above it already
 * applied and each figure saying where it came from. The forecast's assumptions step draws
 * its badges from this.
 *
 * @route GET /api/report/tax-rates
 * @param {string} req.query.country - the CLIENT's country, two letters. An absent or
 *   unrecognised one is not an error: it resolves to the app's own four figures, because an
 *   advisor is never blocked by a country nobody has approved anything for.
 * @returns {{country: string|null, figures: object, isDefault: boolean}}
 */
async function get (req, res) {
  const country = req.query && req.query.country
  try {
    const resolved = await loadResolvedTaxRates(req.firmId, country, readScopeConfig)
    res.send(200, resolved)
  } catch (err) {
    // A tax read must never stop an advisor building a forecast. The worst case is the four
    // app defaults, which is what every firm gets today anyway.
    console.error('[tax-rates] read failed:', err.message)
    res.send(200, defaultsFor(country))
  }
}

/**
 * GET /api/firm-manager/tax-rates?country=AU  (manager)
 *
 * What this tier is working to for one country, split three ways so the screen can show the
 * difference rather than assert it: what it INHERITS, what it has APPROVED itself, and the
 * RESOLVED result the advisors under it actually get. `countries` lists every country this
 * scope has approved something for, so the screen can offer them without a second call.
 *
 * @route GET /api/firm-manager/tax-rates
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
      : await loadResolvedTaxRates(parent, country, readScopeConfig)

    const resolved = await loadResolvedTaxRates(req.firmId, country, readScopeConfig)

    res.send(200, {
      country,
      inherited,
      own: mine[country] || null,
      resolved,
      hasOwn: Boolean(mine[country]),
      countries
    })
  } catch (err) {
    console.error('[tax-rates] manager read failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read the tax rates')
  }
}

/**
 * POST /api/firm-manager/tax-rates  (manager)
 *
 * Approve a country's tax figures. Replaces this scope's own table for that country and
 * leaves every other country untouched.
 *
 * ⚠ THE FIGURES WRITTEN ARE THE MANAGER'S — whatever they have on screen when they press the
 * button, corrections included. Nothing here trusts a proposal the model made; a proposal is
 * not stored in this table at all.
 *
 * ⚠ A PARTIAL TABLE IS LEGITIMATE. A document that publishes the company tax rate and nothing
 * else yields a table with one figure in it, and the other three keep coming from the layer
 * above. The store validates figure by figure for exactly this reason.
 *
 * @route POST /api/firm-manager/tax-rates
 * @param {object} req.body - `{ country: 'AU', figures: { <key>: entry } }`
 * @returns {{approved: true, country: string, resolved: object}}
 */
async function approveFigures (req, res) {
  const body = req.body || {}
  const country = normaliseCountry(body.country)
  if (country === null) {
    return sendError(res, 400, 'INVALID_COUNTRY', 'country must be a two-letter code, such as NZ')
  }
  if (!body.figures || typeof body.figures !== 'object' || Array.isArray(body.figures)) {
    return sendError(res, 400, 'INVALID_FIGURES', 'figures must be a non-array JSON object')
  }

  try {
    const mine = await ownTables(req.firmId)
    const next = Object.assign({}, mine, {
      [country]: {
        approvedAt: new Date().toISOString(),
        // From the verified token, never the body — see this file's header.
        approvedBy: req.userEmail || '',
        figures: body.figures
      }
    })

    const { ok, errors } = validateTaxRates(next)
    if (!ok) {
      return sendError(res, 400, 'INVALID_FIGURES', errors.join('; '))
    }

    await writeTables(req.firmId, next, req.userEmail)
    const resolved = await loadResolvedTaxRates(req.firmId, country, readScopeConfig)
    res.send(200, { approved: true, country, resolved })
  } catch (err) {
    console.error('[tax-rates] approve failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not save the tax rates')
  }
}

/**
 * GET /api/firm-manager/tax-rates/history  (manager)
 * @route GET /api/firm-manager/tax-rates/history
 * @returns {{history: Array<object>}} every saved version of THIS scope's own tables.
 */
async function history (req, res) {
  try {
    const rows = await overlay.getVersionHistory(req.firmId, CONFIG_KEY)
    res.send(200, { history: rows })
  } catch (err) {
    if (devFallbackAllowed(err)) { res.send(200, { history: [] }); return }
    console.error('[tax-rates] history failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not read the change history')
  }
}

/**
 * POST /api/firm-manager/tax-rates/restore  (manager)
 * @route POST /api/firm-manager/tax-rates/restore
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
    const resolved = await loadResolvedTaxRates(
      req.firmId, req.body && req.body.country, readScopeConfig
    )
    res.send(200, { restored: true, resolved })
  } catch (err) {
    console.error('[tax-rates] restore failed:', err.message)
    return sendError(res, 500, 'DB_ERROR', 'Could not restore that version')
  }
}

module.exports = {
  get,
  getForManager,
  approveFigures,
  history,
  restore,
  readScopeConfig
}
