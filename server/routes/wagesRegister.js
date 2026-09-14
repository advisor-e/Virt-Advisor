'use strict'

const { sendError } = require('../utils/sendError')
const clientStore = require('../utils/clientStore')
const caseStore = require('../utils/caseStore')
const gate = require('../utils/wagesRegisterGate')

/**
 * /api/wages-register — the gate on the Wages/Salary Review's staff register.
 *
 * design/mockups/wages-model.html Decision 6, ruled by Mike 2026-09-14. The register holds
 * a client's NAMED employees with pay, accrued leave, service and a key-person-risk band,
 * so it opens only while a due-diligence project is under way AND an advisor has switched
 * it on. The reasoning is in `server/utils/wagesRegisterGate.js`; this file is the seam.
 *
 * 🔴 EVERY ANSWER IS COMPUTED FROM THE VERIFIED TOKEN, NEVER THE REQUEST. The firm and the
 * advisor come from `firmAuth`; the client id in the path is checked to belong to that firm
 * before anything else happens, and a client of another firm is reported as absent rather
 * than refused — the same shape `clientReports.js` uses, so a caller cannot map which
 * client ids exist by reading the difference between 403 and 404.
 *
 * Deliberately NOT in `server/routes/report.js`: that file holds the wages COMPUTE route,
 * which is numbers in and numbers out with nothing stored. This one reads a client's cases
 * and writes an attributable record, and the two have no business sharing a file — the
 * same judgement `clientReports.js` records in its own header.
 */

/**
 * The advisor making the call, from the verified token. Never the request body: this pair
 * becomes the permanent record of who opened a register, so a body-supplied name would make
 * the one field Decision 6 asks for worthless.
 * @param {object} req
 * @returns {{name: string, email: string}}
 */
function advisorWho (req) {
  return { name: req.advisorName || req.userEmail || '', email: req.userEmail || '' }
}

/**
 * GET /api/wages-register/gate/:clientId — may the staff register be opened for this
 * client, and who opened it.
 *
 * @route GET /api/wages-register/gate/:clientId
 * @param {string} req.params.clientId - a client of the caller's firm
 * @returns {200} { success, clientId, clientName, gate: { state, reason, case, openedBy, openedAt } }
 *   where `state` is 'open' (both conditions met) | 'available' (a due-diligence case, not
 *   switched on) | 'closed' (no due-diligence case — and NO switch is offered)
 * @returns {403} NO_FIRM_IDENTITY · {404} NOT_FOUND · {500} DB_ERROR
 */
async function getGate (req, res) {
  const firmId = req.firmId
  if (!firmId) { return sendError(res, 403, 'NO_FIRM_IDENTITY', 'Your session does not identify a firm') }
  try {
    const client = await clientStore.getById(req.params.clientId, firmId)
    if (!client) { return sendError(res, 404, 'NOT_FOUND', 'Client not found') }
    // The advisor's own cases plus the firm's shared ones — caseStore's existing boundary,
    // not a new permission model. A case another advisor kept private does not open the
    // register for this one.
    const cases = await caseStore.listForClient(req.advisorId, firmId, client.id)
    const ddCase = gate.findDueDiligenceCase(cases)
    // Read the switch ONLY when a due-diligence case stands. With none, the register is
    // closed whatever was stored, and reporting an old record would leak that the client
    // was once in a transaction.
    const stored = ddCase ? await gate.readSwitch(firmId, client.id) : null
    res.send(200, {
      success: true,
      clientId: client.id,
      clientName: client.name,
      gate: gate.resolveGate(ddCase, stored)
    })
  } catch (err) {
    console.error('[wages-register] getGate failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not check whether the staff register is available')
  }
}

/**
 * POST /api/wages-register/gate/:clientId/open — the advisor switches the register on.
 *
 * 🔴 THE DUE-DILIGENCE CASE IS CHECKED HERE TOO, not only on the screen. Condition 1 is not
 * a hint to the frontend; a switch-on for a client with no due-diligence case is refused,
 * so the register cannot be opened by calling this route directly.
 *
 * @route POST /api/wages-register/gate/:clientId/open
 * @param {string} req.params.clientId - a client of the caller's firm
 * @returns {200} { success, clientId, gate } — the gate as it now stands, state 'open'
 * @returns {403} NO_FIRM_IDENTITY | NO_DUE_DILIGENCE_CASE · {404} NOT_FOUND · {500} DB_ERROR
 */
async function openGate (req, res) {
  const firmId = req.firmId
  if (!firmId) { return sendError(res, 403, 'NO_FIRM_IDENTITY', 'Your session does not identify a firm') }
  try {
    const client = await clientStore.getById(req.params.clientId, firmId)
    if (!client) { return sendError(res, 404, 'NOT_FOUND', 'Client not found') }
    const cases = await caseStore.listForClient(req.advisorId, firmId, client.id)
    const ddCase = gate.findDueDiligenceCase(cases)
    if (!ddCase) {
      return sendError(res, 403, 'NO_DUE_DILIGENCE_CASE', 'The staff register opens only while a due-diligence project is open on the case')
    }
    const stored = await gate.openRegister(firmId, client.id, advisorWho(req))
    res.send(200, {
      success: true,
      clientId: client.id,
      gate: gate.resolveGate(ddCase, stored)
    })
  } catch (err) {
    if (err.code === 'BAD_CLIENT') { return sendError(res, 400, err.code, err.message) }
    console.error('[wages-register] openGate failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not open the staff register')
  }
}

module.exports = { getGate, openGate }
