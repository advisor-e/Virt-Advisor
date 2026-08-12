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
 */

const fs = require('fs')
const path = require('path')
const overlay = require('../utils/firmOverlay')
const { sendError } = require('../utils/sendError')
const { currencies, default: DEFAULT_CURRENCY } = require('../../data/currencies.json')

const CONFIG_KEY = 'currency'
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
  try {
    const stored = await overlay.loadFirmConfig(req.firmId, CONFIG_KEY)
    const code = stored && isSupported(stored.code) ? stored.code : null
    res.send(200, { currency: code || DEFAULT_CURRENCY, isDefault: !code })
  } catch (err) {
    if (devFallbackOk(err)) {
      const code = devRead(req.firmId)
      res.send(200, { currency: code || DEFAULT_CURRENCY, isDefault: !code })
      return
    }
    // A display setting must never break the report — log server-side, serve default.
    console.error('[currency] read failed:', err.message)
    res.send(200, { currency: DEFAULT_CURRENCY, isDefault: true })
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

module.exports = { get, set }
