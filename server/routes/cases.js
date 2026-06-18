'use strict'

const { appendCoachingEntry } = require('../utils/coaching')
const { sendError } = require('../utils/sendError')
const caseStore = require('../utils/caseStore')

/**
 * All case routes derive identity from the verified JWT (firmAuth attaches
 * req.advisorId / req.firmId). IDs in the request body/params are NEVER trusted
 * for ownership — this is what closes the legacy localStorage IDOR.
 */

/**
 * GET /api/cases — the cases visible to the authenticated advisor: their own
 * (any visibility) plus their firm's shared cases. The authenticated `advisorId`
 * is echoed back so the client can tell which cases are the advisor's own (it
 * must not rely on a client-held id — identity is server-derived here).
 * @route GET /api/cases
 * @returns {200} { success: true, advisorId: string, cases: object[] }
 * @returns {403} NO_ADVISOR_IDENTITY · {500} DB_ERROR
 */
async function listCases (req, res) {
  const advisorId = req.advisorId
  const firmId = req.firmId
  if (!advisorId) {
    return sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify an advisor')
  }
  try {
    const cases = await caseStore.listForAdvisor(advisorId, firmId)
    res.send(200, { success: true, advisorId, cases })
  } catch (err) {
    console.error('[cases] listCases failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not load case studies')
  }
}

/**
 * POST /api/cases — save a new case study for the authenticated advisor.
 * The advisor/firm identity is taken from the JWT; any ids in the body are ignored.
 * @route POST /api/cases
 * @returns {200} { success: true, case }
 * @returns {403} NO_ADVISOR_IDENTITY · {400} MISSING_FIELDS · {500} DB_ERROR
 */
async function createCase (req, res) {
  const advisorId = req.advisorId
  const firmId = req.firmId
  if (!advisorId) {
    return sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify an advisor')
  }
  const body = req.body || {}
  if (!body.title || !String(body.title).trim()) {
    return sendError(res, 400, 'MISSING_FIELDS', 'A case title is required')
  }
  try {
    const saved = await caseStore.create({
      id: body.id, // preserved if the client supplies one (e.g. localStorage migration); else generated
      advisorId, // from JWT, not the body
      firmId, // from JWT, not the body
      title: body.title,
      mode: body.mode,
      visibility: body.visibility,
      domain: body.domain,
      staircaseStep: body.staircaseStep,
      growthStage: body.growthStage,
      finMgtTheme: body.finMgtTheme,
      templates: body.templates,
      summary: body.summary,
      transcript: body.transcript,
      feedbackPending: body.feedbackPending
    })
    res.send(200, { success: true, case: saved })
  } catch (err) {
    console.error('[cases] createCase failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not save the case study')
  }
}

/**
 * PUT /api/cases/:id/review — record the post-delivery review on an owned case.
 * @route PUT /api/cases/:id/review
 * @returns {200} { success: true } · {404} NOT_FOUND (missing or not owned)
 * @returns {403} NO_ADVISOR_IDENTITY · {500} DB_ERROR
 */
async function reviewCase (req, res) {
  const advisorId = req.advisorId
  if (!advisorId) {
    return sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify an advisor')
  }
  const body = req.body || {}
  try {
    const ok = await caseStore.updateReview(req.params.id, advisorId, {
      wentWell: body.wentWell,
      wentLess: body.wentLess,
      changesRecommended: body.changesRecommended
    })
    if (!ok) { return sendError(res, 404, 'NOT_FOUND', 'Case not found') }
    res.send(200, { success: true })
  } catch (err) {
    console.error('[cases] reviewCase failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not save the review')
  }
}

/**
 * PUT /api/cases/:id/visibility — flip an owned case between private and shared.
 * @route PUT /api/cases/:id/visibility
 * @param {string} req.body.visibility - 'private' | 'shared'
 * @returns {200} { success: true, visibility } · {400} INVALID_VISIBILITY
 * @returns {404} NOT_FOUND · {403} NO_ADVISOR_IDENTITY · {500} DB_ERROR
 */
async function setCaseVisibility (req, res) {
  const advisorId = req.advisorId
  if (!advisorId) {
    return sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify an advisor')
  }
  const visibility = (req.body || {}).visibility
  if (!caseStore.VISIBILITIES.includes(visibility)) {
    return sendError(res, 400, 'INVALID_VISIBILITY', "Visibility must be 'private' or 'shared'")
  }
  try {
    const ok = await caseStore.updateVisibility(req.params.id, advisorId, visibility)
    if (!ok) { return sendError(res, 404, 'NOT_FOUND', 'Case not found') }
    res.send(200, { success: true, visibility })
  } catch (err) {
    console.error('[cases] setCaseVisibility failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not change visibility')
  }
}

/**
 * DELETE /api/cases/:id — delete an owned case.
 * @route DELETE /api/cases/:id
 * @returns {200} { success: true } · {404} NOT_FOUND (missing or not owned)
 * @returns {403} NO_ADVISOR_IDENTITY · {500} DB_ERROR
 */
async function deleteCase (req, res) {
  const advisorId = req.advisorId
  if (!advisorId) {
    return sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify an advisor')
  }
  try {
    const ok = await caseStore.remove(req.params.id, advisorId)
    if (!ok) { return sendError(res, 404, 'NOT_FOUND', 'Case not found') }
    res.send(200, { success: true })
  } catch (err) {
    console.error('[cases] deleteCase failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not delete the case study')
  }
}

/**
 * POST /api/cases/promote
 *
 * Promotes a case review observation to data/coaching-reference.json so the
 * AI picks it up on the next Phase 3 call. Requires firm_manager or
 * platform_admin role (enforced by requireManagerRole middleware in restify-server.js).
 *
 * Body:
 *   caseTitle    {string}   — original case study title (used as the template label)
 *   domain       {string}   — detected advisory domain
 *   templates    {string[]} — recommended templates from the session
 *   wentWell     {string}   — what landed well (from post-delivery review)
 *   wentLess     {string}   — what was harder than expected
 *   changesRecommended {string} — what the advisor would do differently
 *   promotedBy   {string}   — advisor/manager email for auditability
 *   promotedAt   {string}   — ISO timestamp
 */
function promote (req, res, next) {
  const { caseTitle, domain, templates, wentWell, wentLess, changesRecommended, promotedBy, promotedAt } = req.body || {}

  if (!caseTitle || (!wentWell && !wentLess && !changesRecommended)) {
    return sendError(res, 400, 'INVALID_PAYLOAD', 'caseTitle and at least one review field are required')
  }

  const templateLabel = Array.isArray(templates) && templates.length > 0
    ? templates[0]
    : (caseTitle || 'Case observation')

  const scenarios = []
  if (wentWell) { scenarios.push(wentWell.slice(0, 200)) }
  if (wentLess) { scenarios.push(`Note: ${wentLess.slice(0, 200)}`) }

  const entry = {
    template: templateLabel,
    domain: domain || null,
    whatToLookFor: wentWell ? wentWell.slice(0, 500) : 'See scenarios',
    scenarios,
    whereMayLead: changesRecommended ? changesRecommended.slice(0, 500) : 'Advisor observation — no follow-up recorded',
    promotedBy: promotedBy || 'unknown',
    promotedAt: promotedAt || new Date().toISOString(),
    sourceCase: caseTitle
  }

  try {
    appendCoachingEntry(entry)
    res.send(200, { ok: true })
  } catch (err) {
    console.error('[cases] promote failed:', err.message)
    return sendError(res, 500, 'PROMOTE_FAILED', 'Failed to write coaching reference')
  }

  return next()
}

module.exports = { promote, listCases, createCase, reviewCase, setCaseVisibility, deleteCase }
