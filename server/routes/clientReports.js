'use strict'

const { sendError } = require('../utils/sendError')
const clientStore = require('../utils/clientStore')
const access = require('../utils/clientReportAccess')
const saved = require('../utils/savedReports')

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

// ── Saved reports (part 2, item 4.62) — the figures kept per client per model ──

function storeError (res, err, fallbackMessage) {
  const known = {
    BAD_ROUTE: 400, BAD_CLIENT: 400, BAD_INPUTS: 400, NOT_OPEN: 403, NO_ADVISOR_VERSION: 409
  }
  if (known[err.code]) { return sendError(res, known[err.code], err.code, err.message) }
  console.error('[client-reports] saved-report call failed:', err.message)
  return sendError(res, 500, 'DB_ERROR', fallbackMessage)
}

function advisorWho (req) {
  return { name: req.advisorName || req.userEmail, email: req.userEmail }
}

/**
 * GET /api/client-reports/saved/:clientId?route=/x — the advisor reads the saved figures.
 * @route GET /api/client-reports/saved/:clientId
 * @param {string} req.query.route - the model's catalogue route
 * @returns {200} { success: true, clientId, clientName, route, report: row|null, clientChanges: string[] }
 * @returns {400} BAD_ROUTE · {403} NO_FIRM_IDENTITY · {404} NOT_FOUND · {500} DB_ERROR
 */
async function getSaved (req, res) {
  const firmId = req.firmId
  if (!firmId) { return sendError(res, 403, 'NO_FIRM_IDENTITY', 'Your session does not identify a firm') }
  const route = (req.query && req.query.route) || ''
  try {
    const client = await clientStore.getById(req.params.clientId, firmId)
    if (!client) { return sendError(res, 404, 'NOT_FOUND', 'Client not found') }
    const report = await saved.load(firmId, client.id, route)
    res.send(200, { success: true, clientId: client.id, clientName: client.name, route, report, clientChanges: saved.changedKeys(report) })
  } catch (err) {
    storeError(res, err, 'Could not load the saved report')
  }
}

/**
 * PUT /api/client-reports/saved/:clientId — the advisor saves the figures for a client.
 * @route PUT /api/client-reports/saved/:clientId
 * @param {string} req.body.route @param {object} req.body.inputs
 * @returns {200} { success: true, clientId, route, report, clientChanges: [] }
 * @returns {400} BAD_ROUTE | BAD_INPUTS · {403} NO_FIRM_IDENTITY · {404} NOT_FOUND · {500} DB_ERROR
 */
async function putSaved (req, res) {
  const firmId = req.firmId
  if (!firmId) { return sendError(res, 403, 'NO_FIRM_IDENTITY', 'Your session does not identify a firm') }
  const body = req.body || {}
  try {
    const client = await clientStore.getById(req.params.clientId, firmId)
    if (!client) { return sendError(res, 404, 'NOT_FOUND', 'Client not found') }
    const report = await saved.saveAsAdvisor(firmId, client.id, body.route, body.inputs, advisorWho(req))
    res.send(200, { success: true, clientId: client.id, route: body.route, report, clientChanges: [] })
  } catch (err) {
    storeError(res, err, 'Could not save the report')
  }
}

/**
 * POST /api/client-reports/saved/:clientId/restore — put the advisor's version back (D4).
 * @route POST /api/client-reports/saved/:clientId/restore
 * @param {string} req.body.route
 * @returns {200} { success: true, clientId, route, report, clientChanges: [] }
 * @returns {409} NO_ADVISOR_VERSION · {403} NO_FIRM_IDENTITY · {404} NOT_FOUND · {500} DB_ERROR
 */
async function restoreSaved (req, res) {
  const firmId = req.firmId
  if (!firmId) { return sendError(res, 403, 'NO_FIRM_IDENTITY', 'Your session does not identify a firm') }
  const body = req.body || {}
  try {
    const client = await clientStore.getById(req.params.clientId, firmId)
    if (!client) { return sendError(res, 404, 'NOT_FOUND', 'Client not found') }
    const report = await saved.restoreAdvisorVersion(firmId, client.id, body.route, advisorWho(req))
    res.send(200, { success: true, clientId: client.id, route: body.route, report, clientChanges: [] })
  } catch (err) {
    storeError(res, err, 'Could not restore the report')
  }
}

/**
 * GET /api/client-reports/mine/saved?route=/x — the business entity reads its own copy.
 * Firm and client id from the token (entityAuth); only the route is read from the request.
 * @route GET /api/client-reports/mine/saved
 * @returns {200} { success: true, route, report: row|null, clientChanges: string[] }
 * @returns {400} BAD_ROUTE · {403} NO_ENTITY_IDENTITY · {500} DB_ERROR
 */
async function getMineSaved (req, res) {
  const firmId = req.firmId
  const clientId = req.businessEntityId
  if (!firmId || !clientId) {
    return sendError(res, 403, 'NO_ENTITY_IDENTITY', 'Your session does not identify a business entity')
  }
  const route = (req.query && req.query.route) || ''
  try {
    const report = await saved.load(firmId, clientId, route)
    res.send(200, { success: true, route, report, clientChanges: saved.changedKeys(report) })
  } catch (err) {
    storeError(res, err, 'Could not load your report')
  }
}

/**
 * PUT /api/client-reports/mine/saved — the business entity saves its edits. Refused with
 * NOT_OPEN unless the advisor has opened this model to it (D1/D5, enforced in the store).
 * @route PUT /api/client-reports/mine/saved
 * @param {string} req.body.route @param {object} req.body.inputs
 * @returns {200} { success: true, route, report, clientChanges: string[] }
 * @returns {400} BAD_ROUTE | BAD_INPUTS · {403} NO_ENTITY_IDENTITY | NOT_OPEN · {500} DB_ERROR
 */
async function putMineSaved (req, res) {
  const firmId = req.firmId
  const clientId = req.businessEntityId
  if (!firmId || !clientId) {
    return sendError(res, 403, 'NO_ENTITY_IDENTITY', 'Your session does not identify a business entity')
  }
  const body = req.body || {}
  try {
    const client = await clientStore.getById(clientId, firmId)
    const who = { name: client ? client.name : 'the client', email: req.userEmail }
    const report = await saved.saveAsClient(firmId, clientId, body.route, body.inputs, who)
    res.send(200, { success: true, route: body.route, report, clientChanges: saved.changedKeys(report) })
  } catch (err) {
    storeError(res, err, 'Could not save your changes')
  }
}

module.exports = { getAccessForClient, setAccess, getMine, getSaved, putSaved, restoreSaved, getMineSaved, putMineSaved }
