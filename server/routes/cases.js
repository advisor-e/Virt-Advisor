'use strict'

const { appendFirmCoachingEntry } = require('../utils/coaching')
const { sendError } = require('../utils/sendError')
const caseStore = require('../utils/caseStore')
const clientStore = require('../utils/clientStore')
const { anonymiseCaseContent } = require('../utils/anonymiseCase')
const { createOpenAIClient } = require('../utils/openaiClient')

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
 * GET /api/firm-manager/cases — the firm's SHARED case studies across all its
 * advisors, for the manager review area. Manager-gated (requireManagerRole at the
 * mount) and firm-scoped from the verified JWT. Private cases are intentionally
 * excluded: the visibility model is the access boundary, so a manager only ever
 * sees cases an advisor chose to share.
 * @route GET /api/firm-manager/cases
 * @returns {200} { success: true, cases: object[] }
 * @returns {403} NO_FIRM_IDENTITY · {500} DB_ERROR
 */
async function listFirmCases (req, res) {
  const firmId = req.firmId
  if (!firmId) {
    return sendError(res, 403, 'NO_FIRM_IDENTITY', 'Your session does not identify a firm')
  }
  try {
    const cases = await caseStore.listSharedForFirm(firmId)
    res.send(200, { success: true, cases })
  } catch (err) {
    console.error('[cases] listFirmCases failed:', err.message)
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
  // Client-knowledge-base link (design 2026-07-14): a clientId in the body must
  // belong to the caller's OWN firm — reject a foreign/unknown id loudly rather
  // than silently unlinking (the "no silence" principle from the 2026-07-14
  // review). Absent clientId is fine: naming the client is skippable.
  if (body.clientId) {
    try {
      const client = await clientStore.getById(String(body.clientId), firmId)
      if (!client) {
        return sendError(res, 400, 'INVALID_CLIENT', 'That client is not in your firm’s register')
      }
    } catch (err) {
      console.error('[cases] client validation failed:', err.message)
      return sendError(res, 500, 'DB_ERROR', 'Could not verify the client')
    }
  }
  try {
    const saved = await caseStore.create({
      id: body.id, // preserved if the client supplies one (e.g. localStorage migration); else generated
      advisorId, // from JWT, not the body
      firmId, // from JWT, not the body
      clientId: body.clientId, // firm-validated above; undefined saves as NULL
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
      decisionTrace: body.decisionTrace,
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
      changesRecommended: body.changesRecommended,
      // Per-template outcomes (2026-07-14). Validated in the store against the
      // case's OWN template list — unknown titles / bad enums are dropped there.
      templateOutcomes: body.templateOutcomes
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
 * POST /api/firm-manager/cases/:id/anonymise-preview — produce (but do NOT save)
 * an anonymised copy of a firm-shared case, for the manager to preview before
 * deciding to share it with the mentor (part 3 persists on approval).
 *
 * Manager-gated (requireManagerRole at the mount) and firm-scoped: the case must
 * be this firm's AND already firm-`shared`, else 404. The raw summary/transcript
 * are read server-side only and never returned — only the scrubbed copy is.
 * @route POST /api/firm-manager/cases/:id/anonymise-preview
 * @returns {200} { success: true, anonymised: { summary, transcript } }
 * @returns {403} NO_FIRM_IDENTITY · {404} NOT_FOUND · {502} ANONYMISE_FAILED
 */
async function anonymiseCasePreview (req, res) {
  const firmId = req.firmId
  if (!firmId) {
    return sendError(res, 403, 'NO_FIRM_IDENTITY', 'Your session does not identify a firm')
  }
  try {
    const theCase = await caseStore.getSharedForFirm(req.params.id, firmId)
    if (!theCase) {
      return sendError(res, 404, 'NOT_FOUND', 'Case not found or not shared with the firm')
    }
    const client = createOpenAIClient({ apiKey: process.env.OPENAI_API_KEY })
    const started = Date.now()
    const anon = await anonymiseCaseContent(
      { summary: theCase.summary, transcript: theCase.transcript },
      client
    )
    // LLM-call audit (model / tokens / latency) — never logs the raw content.
    console.log(`[cases] anonymise-preview id=${req.params.id} msgs=${(theCase.transcript || []).length} latencyMs=${Date.now() - started} tokens=${anon.usage ? anon.usage.total_tokens : 'n/a'}`)
    res.send(200, { success: true, anonymised: { summary: anon.summary, transcript: anon.transcript } })
  } catch (err) {
    console.error('[cases] anonymiseCasePreview failed:', err.message)
    sendError(res, 502, 'ANONYMISE_FAILED', 'Could not produce an anonymised preview')
  }
}

/**
 * Coerce a client-supplied anonymised payload to a safe shape. The manager is
 * trusted (role-gated) and is approving exactly what they previewed, so we store
 * their approved copy — but still normalise types and roles defensively.
 * @returns {{summary:string, transcript:Array<{role:string,content:string}>}}
 */
function sanitiseAnonInput (anon) {
  const summary = anon && typeof anon.summary === 'string' ? anon.summary : ''
  const rawT = anon && Array.isArray(anon.transcript) ? anon.transcript : []
  const transcript = rawT
    .filter(m => m && typeof m.content === 'string')
    .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
  return { summary, transcript }
}

/**
 * POST /api/firm-manager/cases/:id/share-with-mentor — approve and persist the
 * mentor share. Body carries the manager-approved anonymised copy (from the
 * preview); we store exactly what they approved and flip the share on. Scoped to
 * a firm-`shared` case of the caller's firm.
 * @route POST /api/firm-manager/cases/:id/share-with-mentor
 * @param {object} req.body.anonymised - { summary, transcript } the manager approved
 * @returns {200} { success: true } · {400} INVALID_ANON · {404} NOT_FOUND
 * @returns {403} NO_FIRM_IDENTITY · {500} DB_ERROR
 */
async function shareCaseWithMentor (req, res) {
  const firmId = req.firmId
  const approverId = req.advisorId || req.userEmail
  if (!firmId) {
    return sendError(res, 403, 'NO_FIRM_IDENTITY', 'Your session does not identify a firm')
  }
  const { summary, transcript } = sanitiseAnonInput((req.body || {}).anonymised)
  if (!summary.trim() && transcript.length === 0) {
    return sendError(res, 400, 'INVALID_ANON', 'An anonymised summary or conversation is required')
  }
  try {
    const ok = await caseStore.shareWithMentor(req.params.id, firmId, approverId, summary, transcript)
    if (!ok) { return sendError(res, 404, 'NOT_FOUND', 'Case not found or not shared with the firm') }
    res.send(200, { success: true })
  } catch (err) {
    console.error('[cases] shareCaseWithMentor failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not share the case with the mentor')
  }
}

/**
 * DELETE /api/firm-manager/cases/:id/share-with-mentor — withdraw a mentor share.
 * Flips the share off and clears the stored anonymised copy. Firm-scoped.
 * @route DELETE /api/firm-manager/cases/:id/share-with-mentor
 * @returns {200} { success: true } · {404} NOT_FOUND
 * @returns {403} NO_FIRM_IDENTITY · {500} DB_ERROR
 */
async function withdrawCaseFromMentor (req, res) {
  const firmId = req.firmId
  if (!firmId) {
    return sendError(res, 403, 'NO_FIRM_IDENTITY', 'Your session does not identify a firm')
  }
  try {
    const ok = await caseStore.withdrawFromMentor(req.params.id, firmId)
    if (!ok) { return sendError(res, 404, 'NOT_FOUND', 'Case not found') }
    res.send(200, { success: true })
  } catch (err) {
    console.error('[cases] withdrawCaseFromMentor failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not withdraw the case')
  }
}

/**
 * POST /api/cases/promote — promote a reviewed case's observations into the
 * FIRM's coaching reference (firmOverlay config_key 'coaching-reference'), so
 * the AI picks them up on that firm's next Phase 3 call. Manager-gated
 * (requireManagerRole in restify-server.js).
 *
 * The body carries ONLY { caseId }. The entry is built server-side from the
 * STORED case — the old flow trusted the browser for the promoted text and
 * even the audit stamps, and wrote to a global file shared by every firm.
 * Both closed here: content comes from the database, promotedBy/promotedAt
 * come from the verified JWT and the server clock, and the write is scoped to
 * the caller's firm (with overlay version history).
 *
 * @route POST /api/cases/promote
 * @param {string} req.body.caseId - a case within the caller's visibility
 *   boundary (own, or firm-shared) that has a saved review
 * @returns {200} { success: true, id } · {400} MISSING_CASE_ID | NO_REVIEW
 * @returns {403} NO_ADVISOR_IDENTITY · {404} NOT_FOUND · {500} PROMOTE_FAILED
 */
async function promote (req, res) {
  const advisorId = req.advisorId
  const firmId = req.firmId
  if (!advisorId || !firmId) {
    return sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify an advisor')
  }
  const caseId = (req.body || {}).caseId
  if (!caseId || typeof caseId !== 'string') {
    return sendError(res, 400, 'MISSING_CASE_ID', 'caseId is required')
  }

  try {
    const theCase = await caseStore.getVisibleCase(caseId, advisorId, firmId)
    if (!theCase) {
      return sendError(res, 404, 'NOT_FOUND', 'Case not found')
    }
    const review = theCase.review || {}
    if (!review.wentWell && !review.wentLess && !review.changesRecommended) {
      return sendError(res, 400, 'NO_REVIEW', 'The case needs a saved review before it can be promoted')
    }

    const templateLabel = Array.isArray(theCase.templates) && theCase.templates.length > 0
      ? theCase.templates[0]
      : (theCase.title || 'Case observation')

    const scenarios = []
    if (review.wentWell) { scenarios.push(review.wentWell.slice(0, 200)) }
    if (review.wentLess) { scenarios.push(`Note: ${review.wentLess.slice(0, 200)}`) }

    const entry = {
      template: templateLabel,
      domain: theCase.domain || null,
      whatToLookFor: review.wentWell ? review.wentWell.slice(0, 500) : 'See scenarios',
      scenarios,
      whereMayLead: review.changesRecommended ? review.changesRecommended.slice(0, 500) : 'Advisor observation — no follow-up recorded',
      promotedBy: req.userEmail || advisorId,
      promotedAt: new Date().toISOString(),
      sourceCase: theCase.title
    }

    const id = await appendFirmCoachingEntry(firmId, entry, req.userEmail || advisorId)
    res.send(200, { success: true, id })
  } catch (err) {
    console.error('[cases] promote failed:', err.message)
    sendError(res, 500, 'PROMOTE_FAILED', 'Failed to write coaching reference')
  }
}

module.exports = { promote, listCases, listFirmCases, createCase, reviewCase, setCaseVisibility, deleteCase, anonymiseCasePreview, shareCaseWithMentor, withdrawCaseFromMentor }
