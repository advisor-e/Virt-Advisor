'use strict'

const { appendCoachingEntry } = require('../utils/coaching')
const { sendError } = require('../utils/sendError')

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

module.exports = { promote }
