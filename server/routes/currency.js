'use strict'

/**
 * Firm preferred-currency — Restify routes.
 *
 * A firm chooses one currency for its whole account on the reports landing page;
 * every report screen then formats money in it (Layer 2). Access is deliberately
 * asymmetric:
 *   - READ  (`get`)  — any signed-in firm user (`firmAuth`). Reports are used by
 *     ordinary advisors, so a read must never require the manager role, and must
 *     never break a report: on any failure it degrades to the platform default.
 *   - WRITE (`set`)  — managers only (`firmAuth` + `requireManagerRole`, wired in
 *     restify-server.js). It is an account-wide setting affecting every advisor.
 *
 * Persistence rides the same `firmOverlay` store as other firm config (config_key
 * `'currency'`), so version history / restore come for free in production. A
 * dev-JSON fallback (`data/dev-firm-currency.json`) keeps it testable before the
 * MySQL table is provisioned — TEST-ONLY, replaced by MySQL in prod, mirroring the
 * firm-distinctions dev fallback.
 *
 * The supported list + default live in `data/currencies.json` — the single source
 * shared with the frontend picker, so the two can never drift.
 *
 * ── A CLIENT'S OWN CURRENCY (item 13.4, Mike's ruling 2026-09-22) ────────────
 * "currency is selected at firm manager level and cascades down to the client
 * level model library but at client level … the currency can again be edited by
 * the advisor." THREE levels, not two, and the client level is a LABEL: it
 * relabels figures exactly as the firm setting does and converts nothing. That
 * is why `relabelNote` (item 13.1) ships beside every picker — a client-level
 * currency reads as a conversion far more readily than a firm-wide one.
 *
 * STORAGE rides the same `firmOverlay` store under `client-currency:<clientId>`,
 * the pattern `savedReports` already proves with `client-report:<id>:<route>`.
 * No schema change: version history and restore come free, and a client's
 * setting is deleted with its firm by the existing cascade.
 *
 * FALLBACK IS THE WHOLE DESIGN. A client with no setting of its own resolves to
 * the firm's, and a firm with none resolves to the platform default. An advisor
 * clearing a client's currency is therefore not a delete of something the report
 * needs — it is a return to the firm's choice.
 *
 * IDOR. Every client-scoped call resolves the client through
 * `clientStore.getById(clientId, firmId)` FIRST, so an id belonging to another
 * firm reads and writes nothing — the same guard `clientReports` uses.
 */

const fs = require('fs')
const path = require('path')
const overlay = require('../utils/firmOverlay')
const { sendError } = require('../utils/sendError')
const { currencies, default: DEFAULT_CURRENCY } = require('../../data/currencies.json')

const clientStore = require('../utils/clientStore')

const CONFIG_KEY = 'currency'
/** One overlay key per client — mirrors savedReports' `client-report:<id>:<route>`. */
const CLIENT_KEY_PREFIX = 'client-currency:'

/** @param {string} clientId @returns {string} the overlay config key for that client. */
function clientKey (clientId) {
  return CLIENT_KEY_PREFIX + clientId
}
// See server/utils/dbFailure.js — the fallback is refused when a live server
// REFUSED the statement, so a rejected save cannot be reported as saved.
const { devFallbackAllowed } = require('../utils/dbFailure')
const devFallbackOk = devFallbackAllowed
const DEV_CURRENCY_FILE = path.resolve(__dirname, '../../data/dev-firm-currency.json')
const SUPPORTED = new Set(currencies.map(c => c.code))

/** @param {*} code @returns {boolean} true only for a code in the supported list. */
function isSupported (code) {
  return typeof code === 'string' && SUPPORTED.has(code)
}

/** Dev-only: read a firm's saved code from the JSON fallback, or null. */
function devRead (firmId) {
  try {
    const all = JSON.parse(fs.readFileSync(DEV_CURRENCY_FILE, 'utf8'))
    return isSupported(all[firmId]) ? all[firmId] : null
  } catch { return null }
}

/** Dev-only: persist a firm's code to the JSON fallback. */
function devWrite (firmId, code) {
  let all = {}
  try { all = JSON.parse(fs.readFileSync(DEV_CURRENCY_FILE, 'utf8')) } catch {}
  all[firmId] = code
  fs.writeFileSync(DEV_CURRENCY_FILE, JSON.stringify(all, null, 2))
}

/**
 * GET /api/report/currency  (firmAuth)
 * @route GET /api/report/currency
 * @returns {{ currency: string, isDefault: boolean }} the firm's currency, or the
 *   platform default when unset. Never fails a report render — degrades to default.
 */
async function get (req, res) {
  const r = await readFirmCurrency(req.firmId)
  res.send(200, r)
}

/**
 * The firm's currency, for any backend caller that must know it — the inventory intake
 * checks an Unleashed file's currency code against it (item 4.70, stage 4). ONE
 * definition of "what currency does this firm report in", shared with `get` above, so the
 * check and the screen can never disagree. Never throws: on any failure it degrades to the
 * platform default, exactly as the read route does.
 * @param {string} firmId
 * @returns {Promise<{currency:string, isDefault:boolean}>}
 */
async function readFirmCurrency (firmId) {
  try {
    const stored = await overlay.loadFirmConfig(firmId, CONFIG_KEY)
    const code = stored && isSupported(stored.code) ? stored.code : null
    return { currency: code || DEFAULT_CURRENCY, isDefault: !code }
  } catch (err) {
    if (devFallbackOk(err)) {
      const code = devRead(firmId)
      return { currency: code || DEFAULT_CURRENCY, isDefault: !code }
    }
    // A display setting must never break the report — log server-side, serve default.
    console.error('[currency] read failed:', err.message)
    return { currency: DEFAULT_CURRENCY, isDefault: true }
  }
}

/**
 * The currency a CLIENT's figures are labelled in — the client's own choice when it
 * has one, otherwise the firm's, otherwise the platform default. The single
 * definition of "what currency does this client report in", so the screen, the
 * report and any backend caller can never disagree.
 *
 * Never throws, for the same reason `readFirmCurrency` never throws: a display
 * setting must not be able to break a report. Every failure degrades one step
 * outward — client → firm → default — and is logged server-side.
 *
 * @param {string} firmId   the firm from the verified JWT
 * @param {string} clientId the client whose report is being shown
 * @returns {Promise<{currency:string, isDefault:boolean, source:('client'|'firm'|'default')}>}
 *   `source` is what the screen needs to say WHOSE choice is showing — an advisor
 *   must be able to tell a client's own currency from the firm's inherited one.
 */
async function readClientCurrency (firmId, clientId) {
  const firm = await readFirmCurrency(firmId)
  if (!clientId) {
    return { ...firm, source: firm.isDefault ? 'default' : 'firm' }
  }
  try {
    // IDOR: an id belonging to another firm resolves to nothing, so its currency
    // is never read. The firm's value is the safe answer, not an error.
    const client = await clientStore.getById(String(clientId), firmId)
    if (!client) {
      return { ...firm, source: firm.isDefault ? 'default' : 'firm' }
    }
    const stored = await overlay.loadFirmConfig(firmId, clientKey(client.id))
    const code = stored && isSupported(stored.code) ? stored.code : null
    if (code) { return { currency: code, isDefault: false, source: 'client' } }
    return { ...firm, source: firm.isDefault ? 'default' : 'firm' }
  } catch (err) {
    console.error('[currency] client read failed:', err.message)
    return { ...firm, source: firm.isDefault ? 'default' : 'firm' }
  }
}

/**
 * GET /api/report/currency/client/:clientId  (firmAuth)
 * @route GET /api/report/currency/client/:clientId
 * @returns {{currency:string, isDefault:boolean, source:string}} the client's
 *   currency, falling back to the firm's. Never fails a report render.
 */
async function getForClient (req, res) {
  const r = await readClientCurrency(req.firmId, req.params.clientId)
  res.send(200, r)
}

/**
 * POST /api/report/currency/client/:clientId  (firmAuth)
 * @route POST /api/report/currency/client/:clientId
 * @param {object} req.body - `{ currency: string }` — a supported code, or `null`
 *   / `''` to CLEAR the client's own choice and inherit the firm's again.
 * @returns {{saved:true, currency:string, source:string}} the currency now in
 *   effect for that client, which after a clear is the firm's.
 *
 * ⚠ ADVISOR-LEVEL, NOT MANAGER. Mike's ruling: the firm manager sets the firm's
 * currency, and at client level "the currency can again be edited by the
 * advisor". So this route is firmAuth WITHOUT requireManagerRole, deliberately
 * unlike the firm-wide `set` above.
 */
async function setForClient (req, res) {
  const raw = req.body && req.body.currency
  const clearing = raw === null || raw === ''
  if (!clearing && !isSupported(raw)) {
    return sendError(res, 400, 'INVALID_CURRENCY',
      'currency must be one of the supported currency codes, or empty to inherit the firm\'s')
  }
  try {
    const client = await clientStore.getById(String(req.params.clientId), req.firmId)
    if (!client) {
      return sendError(res, 404, 'CLIENT_NOT_FOUND', 'No such client for this firm')
    }
    // A clear stores an empty object rather than deleting the row, so the overlay's
    // version history still shows WHO returned this client to the firm's currency.
    const payload = clearing ? {} : { code: raw }
    await overlay.saveFirmConfig(req.firmId, clientKey(client.id), payload, req.userEmail)
    const now = await readClientCurrency(req.firmId, client.id)
    res.send(200, { saved: true, currency: now.currency, source: now.source })
  } catch (err) {
    if (devFallbackOk(err)) {
      return sendError(res, 503, 'DB_UNAVAILABLE',
        'A client currency needs the database; it has no dev-file fallback')
    }
    return sendError(res, 500, 'DB_ERROR', 'Could not save the client currency preference')
  }
}

/**
 * POST /api/report/currency  (firmAuth + requireManagerRole)
 * @route POST /api/report/currency
 * @param {object} req.body - { currency: string } — must be a supported code.
 * @returns {{ saved: true, currency: string }} on success; 400 for an unknown code.
 */
async function set (req, res) {
  const code = req.body && req.body.currency
  if (!isSupported(code)) {
    return sendError(res, 400, 'INVALID_CURRENCY',
      'currency must be one of the supported currency codes')
  }
  try {
    await overlay.saveFirmConfig(req.firmId, CONFIG_KEY, { code }, req.userEmail)
    res.send(200, { saved: true, currency: code })
  } catch (err) {
    if (devFallbackOk(err)) {
      devWrite(req.firmId, code)
      res.send(200, { saved: true, currency: code })
      return
    }
    return sendError(res, 500, 'DB_ERROR', 'Could not save the currency preference')
  }
}

module.exports = {
  get,
  set,
  readFirmCurrency,
  getForClient,
  setForClient,
  readClientCurrency
}
