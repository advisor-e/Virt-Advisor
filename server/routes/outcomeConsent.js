'use strict'

/**
 * Outcome Sharing — the firm manager's routes (item 4.87, specs/002-outcome-learning
 * contracts §Firm manager). Design: `design/mockups/outcome-learning-consent.html`,
 * approved 2026-09-10. The tab is the FIRM TIER ALONE: consent is a firm's own undertaking,
 * as its compliance declaration is, and the mentor has nothing to switch.
 *
 * 🔴 EVERY ROUTE IS SCOPED TO `req.firmId`, THE VERIFIED SCOPE FROM THE JWT, and `setBy` /
 * `requestedBy` COME FROM THE VERIFIED TOKEN, NEVER THE BODY. A consent is a signature on
 * behalf of a firm; a body-supplied name would let anyone with the route sign it for them.
 *
 * 🔴 WITHDRAWAL DELETES EXACTLY `outcome-pool:<this firm's token>:` AT THE PLATFORM SCOPE,
 * and nothing wider — the store refuses an unterminated prefix, and the test pins the
 * argument. Consent state is unchanged by a withdrawal (data-model §1): the switch stays
 * where the manager put it, and the withdrawal is appended to the record.
 *
 * No dev-file fallback here, deliberately: a consent that only existed in a JSON file on a
 * developer's machine would be a consent nobody could audit.
 */

const overlay = require('../utils/firmOverlay')
const { PLATFORM_SCOPE } = require('../utils/platformScope')
const { sendError } = require('../utils/sendError')
const { CONFIG_KEY, CONSENT_WORDING, readConsent, firmToken } = require('../utils/outcomeConsent')
const { POOL_PREFIX } = require('../utils/outcomeLearning')
const { recomputeAndPersist } = require('./outcomeLearning')

function _secretMissing (err) {
  return err && err.code === 'OUTCOME_POOL_SECRET_MISSING'
}

/**
 * GET /api/firm-manager/outcome-consent — the switch's state and what a withdrawal would remove.
 * @route GET /api/firm-manager/outcome-consent
 * @returns {200} { success, consent, wording, pooledCount } — `pooledCount` is null when the
 *   server has no OUTCOME_POOL_SECRET, so the screen can say the pool is not configured
 * @returns {500} DB_ERROR
 */
async function read (req, res) {
  const firmId = req.firmId
  try {
    const consent = readConsent(await overlay.loadFirmConfig(firmId, CONFIG_KEY))
    let pooledCount = null
    try {
      const rows = await overlay.loadFirmConfigsByPrefix(PLATFORM_SCOPE, POOL_PREFIX + firmToken(firmId) + ':')
      pooledCount = Object.keys(rows || {}).length
    } catch (err) {
      if (!_secretMissing(err)) { throw err }
      console.error('[outcome-consent] OUTCOME_POOL_SECRET is not set; the pooled count is unavailable')
    }
    res.send(200, { success: true, consent, wording: CONSENT_WORDING, pooledCount })
  } catch (err) {
    console.error('[outcome-consent] read failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not read the sharing setting')
  }
}

/**
 * POST /api/firm-manager/outcome-consent — switch sharing on or off.
 * @route POST /api/firm-manager/outcome-consent
 * @param {boolean} req.body.on - the only field read; anything else in the body is ignored
 * @returns {200} { success, consent } · {400} INVALID_CONSENT · {403} NO_USER_IDENTITY · {500} DB_ERROR
 */
async function set (req, res) {
  const on = (req.body || {}).on
  if (typeof on !== 'boolean') {
    return sendError(res, 400, 'INVALID_CONSENT', 'on must be true or false')
  }
  if (!req.userEmail) {
    // The record must name who switched it; an unnamed consent is not a consent.
    return sendError(res, 403, 'NO_USER_IDENTITY', 'Your session does not identify you')
  }
  const firmId = req.firmId
  try {
    const existing = readConsent(await overlay.loadFirmConfig(firmId, CONFIG_KEY))
    const record = {
      on,
      setBy: req.userEmail,
      setAt: new Date().toISOString(),
      // The words this manager saw, kept with the record rather than looked up later.
      wording: CONSENT_WORDING,
      withdrawals: existing ? existing.withdrawals : []
    }
    await overlay.saveFirmConfig(firmId, CONFIG_KEY, record, req.userEmail)
    res.send(200, { success: true, consent: readConsent(record) })
  } catch (err) {
    console.error('[outcome-consent] set failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not save the sharing setting')
  }
}

/**
 * POST /api/firm-manager/outcome-consent/withdraw — delete this firm's pooled rows.
 * @route POST /api/firm-manager/outcome-consent/withdraw
 * @param {true} req.body.confirm - must be exactly true
 * @returns {200} { success, removed, consent } · {400} CONFIRM_REQUIRED · {403} NO_USER_IDENTITY
 * @returns {503} POOL_UNAVAILABLE (no secret on this server) · {500} DB_ERROR
 */
async function withdraw (req, res) {
  if ((req.body || {}).confirm !== true) {
    return sendError(res, 400, 'CONFIRM_REQUIRED', 'confirm must be true')
  }
  if (!req.userEmail) {
    return sendError(res, 403, 'NO_USER_IDENTITY', 'Your session does not identify you')
  }
  const firmId = req.firmId
  try {
    const removed = await overlay.deleteFirmConfigsByPrefix(PLATFORM_SCOPE, POOL_PREFIX + firmToken(firmId) + ':')

    const existing = readConsent(await overlay.loadFirmConfig(firmId, CONFIG_KEY))
    let consent = existing
    if (existing) {
      const record = Object.assign({}, existing, {
        withdrawals: existing.withdrawals.concat([{ requestedBy: req.userEmail, requestedAt: new Date().toISOString(), removed }])
      })
      await overlay.saveFirmConfig(firmId, CONFIG_KEY, record, req.userEmail)
      consent = readConsent(record)
    }

    // The rows are gone whatever happens next. A recompute failure is logged, not returned:
    // the mentor's next page load recomputes anyway, and a 500 here would tell the manager
    // their withdrawal failed when it did not.
    try {
      await recomputeAndPersist(req.userEmail)
    } catch (err) {
      console.error('[outcome-consent] recompute after withdrawal failed:', err.message)
    }

    res.send(200, { success: true, removed, consent })
  } catch (err) {
    if (_secretMissing(err)) {
      return sendError(res, 503, 'POOL_UNAVAILABLE', 'The outcome pool is not configured on this server')
    }
    console.error('[outcome-consent] withdraw failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not withdraw the shared outcomes')
  }
}

module.exports = { read, set, withdraw }
