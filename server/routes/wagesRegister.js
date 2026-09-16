'use strict'

const { sendError } = require('../utils/sendError')
const clientStore = require('../utils/clientStore')
const caseStore = require('../utils/caseStore')
const gate = require('../utils/wagesRegisterGate')
const store = require('../utils/wagesRegisterStore')
const maths = require('../utils/wagesRegisterMaths')
const registerRetention = require('../utils/registerRetention')
const overlay = require('../utils/firmOverlay')

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
    // 🔴 ALWAYS READ THE SWITCH. It used to be read only when a due-diligence case stood,
    // because without one the register was closed whatever was stored. With that gate gone
    // (Mike, 2026-09-15) most registers are opened with no case at all — and skipping the
    // read would report every one of them as "not open", so the advisor would open it again
    // on every visit and never see the one they already had. The leak the old line guarded
    // against is handled where it belongs: `resolveGate` returns no name and no date unless
    // the register is actually open.
    const stored = await gate.readSwitch(firmId, client.id)
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
 * 🔴 IT REFUSES NOBODY — Mike's ruling, 2026-09-15, and it replaces the due-diligence gate
 * this route used to enforce. The advisor opening the register is the advisor telling us the
 * engagement is under way; the app does not second-guess them. The only thing still required
 * is a client of the caller's own firm, which is a scoping check, not a permission one — an
 * advisor must never open another firm's register.
 *
 * WHAT IS KEPT IS THE RECORD. `openRegister` writes who and when from the VERIFIED TOKEN,
 * never the body, and a client with no case already in the due-diligence domain is recorded
 * as having been opened on the advisor's own say-so. Nothing about that stops anyone; it is
 * what lets the firm answer "who decided to show this client's named staff, and when?".
 *
 * @route POST /api/wages-register/gate/:clientId/open
 * @param {string} req.params.clientId - a client of the caller's firm
 * @returns {200} { success, clientId, gate } — the gate as it now stands, state 'open'
 * @returns {403} NO_FIRM_IDENTITY · {404} NOT_FOUND · {500} DB_ERROR
 */
async function openGate (req, res) {
  const firmId = req.firmId
  if (!firmId) { return sendError(res, 403, 'NO_FIRM_IDENTITY', 'Your session does not identify a firm') }
  try {
    const client = await clientStore.getById(req.params.clientId, firmId)
    if (!client) { return sendError(res, 404, 'NOT_FOUND', 'Client not found') }
    const cases = await caseStore.listForClient(req.advisorId, firmId, client.id)
    const ddCase = gate.findDueDiligenceCase(cases)
    // 🔴 NO REFUSAL HERE ANY MORE — Mike, 2026-09-15: *"i dont need any bullshit gates telling
    // my advisors what they can and cant do. if they're engaged to run a due diligence project
    // they will fucking tell you."* The advisor clicking the button IS the telling. What is
    // kept is the RECORD, not a barrier: who opened it and when, from the verified token. That
    // stops nobody and is what makes the screen answerable afterwards.
    const stored = await gate.openRegister(firmId, client.id, advisorWho(req), !ddCase)
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

/**
 * POST /api/wages-register/gate/:clientId/close — the advisor switches the register off
 * again (Mike, 2026-09-15).
 *
 * NO DUE-DILIGENCE CASE IS REQUIRED HERE, unlike the switch-on. Closing is the safe
 * direction: refusing it because the case has moved on would leave an advisor unable to
 * shut a register the app is already treating as closed. The opening record is kept.
 *
 * @route POST /api/wages-register/gate/:clientId/close
 * @param {string} req.params.clientId - a client of the caller's firm
 * @returns {200} { success, clientId, gate } — the gate as it now stands
 * @returns {403} NO_FIRM_IDENTITY · {404} NOT_FOUND · {500} DB_ERROR
 */
async function closeGate (req, res) {
  const firmId = req.firmId
  if (!firmId) { return sendError(res, 403, 'NO_FIRM_IDENTITY', 'Your session does not identify a firm') }
  try {
    const client = await clientStore.getById(req.params.clientId, firmId)
    if (!client) { return sendError(res, 404, 'NOT_FOUND', 'Client not found') }
    const stored = await gate.closeRegister(firmId, client.id, advisorWho(req))
    // Re-resolved against the live case, so the answer is the whole truth of the gate
    // rather than "we wrote a closedAt" — the same shape the other two routes return.
    const cases = await caseStore.listForClient(req.advisorId, firmId, client.id)
    res.send(200, {
      success: true,
      clientId: client.id,
      gate: gate.resolveGate(gate.findDueDiligenceCase(cases), stored)
    })
  } catch (err) {
    if (err.code === 'BAD_CLIENT') { return sendError(res, 400, err.code, err.message) }
    console.error('[wages-register] closeGate failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not close the staff register')
  }
}

/**
 * The gate, re-resolved from the live case and the stored switch.
 *
 * 🔴 EVERY CONTENTS ROUTE BELOW CALLS THIS FIRST, so that named employees are served only
 * while the register is actually open — never on the strength of a request alone.
 *
 * 🔴 THE SWITCH IS ALWAYS READ. It used to be read only when a due-diligence case stood,
 * because without one the register was shut whatever was stored. With that gate gone (Mike,
 * 2026-09-15) most registers are opened with no case at all — and skipping the read resolved
 * every one of them to `available`, so the sheet rendered and then every contents route
 * answered 403. Found by opening it in a browser; no test saw it, because the tests mock
 * `resolveFor`'s parts separately.
 *
 * @param {object} req @param {object} client
 * @returns {Promise<object>} the resolved gate
 */
async function resolveFor (req, client) {
  const cases = await caseStore.listForClient(req.advisorId, req.firmId, client.id)
  const ddCase = gate.findDueDiligenceCase(cases)
  const stored = await gate.readSwitch(req.firmId, client.id)
  return gate.resolveGate(ddCase, stored)
}

/**
 * POST /api/wages-register/:clientId/view — the register as it stands, priced.
 *
 * A POST because it carries the team: step 1's people are not stored with the register (see
 * `wagesRegisterStore`), so they come up with the request and the server lays the stored
 * entries over them. **The arithmetic is here, not on the screen** — a liability is business
 * logic and belongs on the backend, like every other figure in this app.
 *
 * @route POST /api/wages-register/:clientId/view
 * @param {string} req.params.clientId - a client of the caller's firm
 * @param {Array} req.body.team - step 1's people: { name, division, payRate }
 * @returns {200} { success, gate, register, rows, summary, retention }
 *   `rows` is one per person on the TEAM with their liability (null = not yet priced);
 *   `summary` is the three bands with people/priced/liability/avgYears and the total;
 *   `retention` is { months, source, keptUntil } — the date only, never the setting.
 * @returns {403} NO_FIRM_IDENTITY | REGISTER_NOT_OPEN · {404} NOT_FOUND · {500} DB_ERROR
 */
async function viewRegister (req, res) {
  const firmId = req.firmId
  if (!firmId) { return sendError(res, 403, 'NO_FIRM_IDENTITY', 'Your session does not identify a firm') }
  try {
    const client = await clientStore.getById(req.params.clientId, firmId)
    if (!client) { return sendError(res, 404, 'NOT_FOUND', 'Client not found') }
    const resolved = await resolveFor(req, client)
    if (resolved.state !== gate.STATE_OPEN) {
      // Deliberately the same refusal whether the case is absent or the switch is off: the
      // screen already knows which, from the gate route, and this one owes a caller nothing.
      return sendError(res, 403, 'REGISTER_NOT_OPEN', 'The staff register is not open for this client')
    }
    const stored = await store.read(firmId, client.id)
    const rows = store.merge(req.body && req.body.team, stored.people)
    const retention = await registerRetention.loadResolvedRetention(firmId, overlay.loadFirmConfig)
    res.send(200, {
      success: true,
      gate: resolved,
      register: { hoursInLeaveDay: stored.hoursInLeaveDay, savedAt: stored.savedAt, savedBy: stored.savedBy },
      rows: maths.priceAll(rows, stored.hoursInLeaveDay),
      summary: maths.summarise(rows, stored.hoursInLeaveDay),
      retention: {
        months: retention.months,
        source: retention.source,
        keptUntil: registerRetention.keptUntil(resolved.openedAt, retention.months)
      }
    })
  } catch (err) {
    if (err.code === 'BAD_CLIENT') { return sendError(res, 400, err.code, err.message) }
    console.error('[wages-register] viewRegister failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not read the staff register')
  }
}

/**
 * PUT /api/wages-register/:clientId — save what the advisor typed.
 *
 * Only the three typed fields and the firm's hours-in-a-leave-day survive the way in;
 * `wagesRegisterStore.sanitise` is an allow-list, so a field nobody asked for — sick leave
 * above all, which Mike ruled off on 2026-09-15 — cannot arrive by being added to a body.
 *
 * @route PUT /api/wages-register/:clientId
 * @param {string} req.params.clientId - a client of the caller's firm
 * @param {number|null} req.body.hoursInLeaveDay
 * @param {Array} req.body.people - { name, accruedLeaveDays, yearsEmployed, band }
 * @returns {200} { success, register: { hoursInLeaveDay, savedAt, savedBy } }
 * @returns {403} NO_FIRM_IDENTITY | REGISTER_NOT_OPEN · {404} NOT_FOUND · {500} DB_ERROR
 */
async function saveRegister (req, res) {
  const firmId = req.firmId
  if (!firmId) { return sendError(res, 403, 'NO_FIRM_IDENTITY', 'Your session does not identify a firm') }
  try {
    const client = await clientStore.getById(req.params.clientId, firmId)
    if (!client) { return sendError(res, 404, 'NOT_FOUND', 'Client not found') }
    const resolved = await resolveFor(req, client)
    if (resolved.state !== gate.STATE_OPEN) {
      return sendError(res, 403, 'REGISTER_NOT_OPEN', 'The staff register is not open for this client')
    }
    const saved = await store.save(firmId, client.id, req.body, req.userEmail || null)
    res.send(200, {
      success: true,
      register: { hoursInLeaveDay: saved.hoursInLeaveDay, savedAt: saved.savedAt, savedBy: saved.savedBy }
    })
  } catch (err) {
    if (err.code === 'BAD_CLIENT') { return sendError(res, 400, err.code, err.message) }
    console.error('[wages-register] saveRegister failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not save the staff register')
  }
}

module.exports = { getGate, openGate, closeGate, viewRegister, saveRegister }
