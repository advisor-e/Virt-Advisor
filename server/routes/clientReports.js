'use strict'

const { sendError } = require('../utils/sendError')
const clientStore = require('../utils/clientStore')
const access = require('../utils/clientReportAccess')

/**
 * /api/client-reports — which report models a client may open.
 *
 * design/features/business-entity-reports.md, approved by Mike 2026-09-03. Two sides of
 * one switch table:
 *   - the ADVISOR reads and flips it for a client of their firm (firmAuth — a business
 *     entity token is refused there by name, so a client can never reach these two);
 *   - the BUSINESS ENTITY reads its own row (entityAuth — the client id comes from the
 *     verified token, never from the request, so no client can ask for another's).
 *
 * Deliberately NOT in server/routes/report.js: that file is in hand on the laptop under
 * item 4.61 and this feature has no business in it.
 */

/**
 * GET /api/client-reports/access/:clientId — what is open to this client, for the advisor.
 * @route GET /api/client-reports/access/:clientId
 * @returns {200} { success: true, clientId, open: { [route]: { state, by, at } } }
 * @returns {403} NO_FIRM_IDENTITY · {404} NOT_FOUND (a client of another firm looks absent) · {500} DB_ERROR
 */
async function getAccessForClient (req, res) {
  const firmId = req.firmId
  if (!firmId) { return sendError(res, 403, 'NO_FIRM_IDENTITY', 'Your session does not identify a firm') }
  try {
    const client = await clientStore.getById(req.params.clientId, firmId)
    if (!client) { return sendError(res, 404, 'NOT_FOUND', 'Client not found') }
    const open = await access.listForClient(firmId, client.id)
    res.send(200, { success: true, clientId: client.id, clientName: client.name, open })
  } catch (err) {
    console.error('[client-reports] getAccessForClient failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not load the client\'s report access')
  }
}

/**
 * PUT /api/client-reports/access/:clientId — open or hide one model for this client.
 * @route PUT /api/client-reports/access/:clientId
 * @param {string} req.body.route - the model's catalogue route, e.g. '/volatility'
 * @param {string} req.body.state - 'open' | 'hidden'
 * @returns {200} { success: true, clientId, route, state }
 * @returns {400} BAD_ROUTE | BAD_STATE · {403} NO_FIRM_IDENTITY · {404} NOT_FOUND · {500} DB_ERROR
 */
async function setAccess (req, res) {
  const firmId = req.firmId
  if (!firmId) { return sendError(res, 403, 'NO_FIRM_IDENTITY', 'Your session does not identify a firm') }
  const body = req.body || {}
  try {
    const client = await clientStore.getById(req.params.clientId, firmId)
    if (!client) { return sendError(res, 404, 'NOT_FOUND', 'Client not found') }
    const result = await access.setState(firmId, client.id, body.route, body.state, req.userEmail)
    res.send(200, { success: true, clientId: client.id, route: result.route, state: result.state })
  } catch (err) {
    if (err.code === 'BAD_ROUTE' || err.code === 'BAD_STATE') {
      return sendError(res, 400, err.code, err.message)
    }
    console.error('[client-reports] setAccess failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not save the client\'s report access')
  }
}

/**
 * GET /api/client-reports/mine — the business entity's own row. The firm and the client
 * id are BOTH from the verified token (entityAuth); nothing in the request is read.
 * @route GET /api/client-reports/mine
 * @returns {200} { success: true, open: { [route]: { state, by, at } } }
 * @returns {403} NO_ENTITY_IDENTITY · {500} DB_ERROR
 */
async function getMine (req, res) {
  const firmId = req.firmId
  const clientId = req.businessEntityId
  if (!firmId || !clientId) {
    return sendError(res, 403, 'NO_ENTITY_IDENTITY', 'Your session does not identify a business entity')
  }
  try {
    const open = await access.listForClient(firmId, clientId)
    res.send(200, { success: true, open })
  } catch (err) {
    console.error('[client-reports] getMine failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not load your reports')
  }
}

module.exports = { getAccessForClient, setAccess, getMine }
