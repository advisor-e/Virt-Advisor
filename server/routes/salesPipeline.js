'use strict'

const { sendError } = require('../utils/sendError')
const store = require('../utils/salesPipelineStore')

/**
 * /api/sales/pipeline — an advisor's own sales pipeline (item 17 stage 2).
 *
 * All four routes derive identity from the verified JWT (firmAuth attaches
 * req.advisorId / req.firmId); ids in the body are NEVER trusted for ownership —
 * the same rule that closed the cases IDOR.
 *
 * ⚠ THE SOURCE APP'S ROUTES CANNOT BE PORTED AS THEY ARE, and the reasons are
 * recorded here rather than rediscovered:
 *
 *   - Its list and update routes carry the comment "Pipeline is shared across the
 *     firm - no userId filter". Here a deal belongs to the advisor who entered it
 *     (Mike's ruling 2026-09-21) inside a tenant, so the store scopes both.
 *   - Its `[id].patch.js` runs `updateMany({ where: { id } })` behind a plain
 *     "is signed in" check, on an auto-increment integer id. Any signed-in person
 *     could edit any deal by guessing a number. Our mutations are ownership-checked
 *     AND the ids are UUIDs.
 *   - Its PATCH schema accepts 16 of the 34 business fields, so `industry`,
 *     `meetingDate`, `dateSecured`, `supportStaff` and 13 others can be created and
 *     never edited. Ours drives validation off the store's single COLUMNS list, so
 *     the two cannot drift.
 *
 * ⚠ A FIRM MANAGER READING THEIR ADVISORS' PIPELINES is Mike's ruling of 2026-09-22
 * and belongs to the Team roll-up (stage 4), behind a manager-role guard. It is
 * deliberately absent here: these routes are the advisor's own view, and widening
 * them would give every advisor the manager's reach.
 */

/** Fields the caller may set, with their kind, taken from the store so one list governs. */
const FIELD_KINDS = store.COLUMNS.reduce((out, [js, , kind]) => {
  out[js] = kind
  return out
}, {})

/** The two fields the schema requires on create. Everything else is optional. */
const REQUIRED_ON_CREATE = ['prospectName', 'prospectStatus']

/**
 * Validate and narrow a request body to the fields this resource owns.
 *
 * Returns `{ error }` on the first problem rather than a list: the screen sends a
 * whole form, so the first bad field is the one to name. Unknown keys are DROPPED
 * silently rather than rejected — a client sending `advisorId` or `firmId` in the
 * body must not be able to set them, and must not learn that it tried.
 *
 * @param {object} body
 * @param {boolean} isCreate - true applies REQUIRED_ON_CREATE
 * @returns {{ value?: object, error?: {code: string, message: string} }}
 */
function validate (body, isCreate) {
  const src = body && typeof body === 'object' ? body : {}
  const out = {}

  if (isCreate) {
    for (const f of REQUIRED_ON_CREATE) {
      if (!String(src[f] || '').trim()) {
        return { error: { code: 'MISSING_FIELD', message: 'A prospect name and a status are required' } }
      }
    }
  }

  for (const key of Object.keys(src)) {
    const kind = FIELD_KINDS[key]
    if (!kind) { continue } // unknown or identity field — dropped, never set
    const v = src[key]
    if (v === null) { out[key] = null; continue }

    if (kind === 'money') {
      const n = Number(v)
      if (!Number.isFinite(n)) {
        return { error: { code: 'INVALID_NUMBER', message: 'A money value must be a number' } }
      }
      if (n < 0) {
        return { error: { code: 'INVALID_NUMBER', message: 'A money value cannot be negative' } }
      }
      // DECIMAL(14,2) holds 12 digits before the point. A larger number is
      // REFUSED rather than truncated by MySQL into a different figure.
      if (n > 999999999999.99) {
        return { error: { code: 'INVALID_NUMBER', message: 'That amount is too large' } }
      }
      out[key] = n
      continue
    }

    if (kind === 'bool') {
      if (typeof v !== 'boolean') {
        return { error: { code: 'INVALID_FLAG', message: 'A yes/no value must be true or false' } }
      }
      out[key] = v
      continue
    }

    if (kind === 'date') {
      if (v === '') { out[key] = null; continue }
      if (isNaN(new Date(v).getTime())) {
        return { error: { code: 'INVALID_DATE', message: 'That date could not be read' } }
      }
      out[key] = v
      continue
    }

    if (typeof v !== 'string') {
      return { error: { code: 'INVALID_TEXT', message: 'That field must be text' } }
    }
    out[key] = v
  }

  if (Object.prototype.hasOwnProperty.call(src, 'visibility')) {
    if (!store.VISIBILITIES.includes(src.visibility)) {
      return { error: { code: 'INVALID_VISIBILITY', message: 'Visibility must be private or firm' } }
    }
    out.visibility = src.visibility
  }

  return { value: out }
}

/** Both ids come from the verified token. No route reads either from the request. */
function identityOf (req) {
  return { advisorId: req.advisorId, firmId: req.firmId }
}

/**
 * GET /api/sales/pipeline — the deals this advisor may see: their own at any
 * visibility, plus their firm's deals marked 'firm'. Most recently updated first.
 * @route GET /api/sales/pipeline
 * @returns {200} { success: true, items: object[] }
 * @returns {403} NO_ADVISOR_IDENTITY · {500} DB_ERROR
 */
async function listEntries (req, res) {
  const { advisorId, firmId } = identityOf(req)
  if (!advisorId || !firmId) {
    return sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify an advisor')
  }
  try {
    const items = await store.listForAdvisor(advisorId, firmId)
    res.send(200, { success: true, items })
  } catch (err) {
    console.error('[salesPipeline] listEntries failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not load your pipeline')
  }
}

/**
 * POST /api/sales/pipeline — add a deal. It is PRIVATE unless the body says
 * otherwise, so a new deal is the advisor's own until they choose to share it.
 * @route POST /api/sales/pipeline
 * @param {string} req.body.prospectName - required
 * @param {string} req.body.prospectStatus - required
 * @returns {200} { success: true, item }
 * @returns {400} MISSING_FIELD · INVALID_NUMBER · INVALID_DATE · INVALID_FLAG ·
 *                INVALID_TEXT · INVALID_VISIBILITY
 * @returns {403} NO_ADVISOR_IDENTITY · {500} DB_ERROR
 */
async function createEntry (req, res) {
  const { advisorId, firmId } = identityOf(req)
  if (!advisorId || !firmId) {
    return sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify an advisor')
  }
  const { value, error } = validate(req.body, true)
  if (error) { return sendError(res, 400, error.code, error.message) }
  try {
    const item = await store.create(Object.assign({}, value, { advisorId, firmId }))
    res.send(200, { success: true, item })
  } catch (err) {
    console.error('[salesPipeline] createEntry failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not save the deal')
  }
}

/**
 * PUT /api/sales/pipeline/:id — change a deal the caller OWNS.
 *
 * The body is a PARTIAL update — any subset of the fields — even though the verb
 * is PUT. That follows this app's own convention: every partial update in
 * restify-server.js is a PUT and PATCH appears nowhere. A field left out is left
 * alone; an explicit null clears it.
 *
 * A deal shared to the firm is readable by a colleague and still editable only by
 * its owner. A deal that is not the caller's answers 404 — the same answer as one
 * that does not exist, because telling the two apart discloses that it exists.
 *
 * @route PUT /api/sales/pipeline/:id
 * @param {object} req.body - any subset of the business fields, plus `visibility`
 * @returns {200} { success: true, item }
 * @returns {400} MISSING_ID and the validation codes · {403} NO_ADVISOR_IDENTITY
 * @returns {404} NOT_FOUND · {500} DB_ERROR
 */
async function updateEntry (req, res) {
  const { advisorId, firmId } = identityOf(req)
  if (!advisorId || !firmId) {
    return sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify an advisor')
  }
  const id = String((req.params && req.params.id) || '').trim()
  if (!id) { return sendError(res, 400, 'MISSING_ID', 'No deal was named') }
  const { value, error } = validate(req.body, false)
  if (error) { return sendError(res, 400, error.code, error.message) }
  try {
    const item = await store.update(id, advisorId, firmId, value)
    if (!item) { return sendError(res, 404, 'NOT_FOUND', 'That deal is not one of yours') }
    res.send(200, { success: true, item })
  } catch (err) {
    console.error('[salesPipeline] updateEntry failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not save the change')
  }
}

/**
 * DELETE /api/sales/pipeline/:id — remove a deal the caller OWNS. Same boundary
 * and the same 404 as the update above.
 * @route DELETE /api/sales/pipeline/:id
 * @returns {200} { success: true, deleted: true }
 * @returns {400} MISSING_ID · {403} NO_ADVISOR_IDENTITY · {404} NOT_FOUND · {500} DB_ERROR
 */
async function deleteEntry (req, res) {
  const { advisorId, firmId } = identityOf(req)
  if (!advisorId || !firmId) {
    return sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify an advisor')
  }
  const id = String((req.params && req.params.id) || '').trim()
  if (!id) { return sendError(res, 400, 'MISSING_ID', 'No deal was named') }
  try {
    const deleted = await store.remove(id, advisorId, firmId)
    if (!deleted) { return sendError(res, 404, 'NOT_FOUND', 'That deal is not one of yours') }
    res.send(200, { success: true, deleted: true })
  } catch (err) {
    console.error('[salesPipeline] deleteEntry failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not delete the deal')
  }
}

module.exports = { listEntries, createEntry, updateEntry, deleteEntry, validate }
