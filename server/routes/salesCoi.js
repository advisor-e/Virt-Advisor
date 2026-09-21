'use strict'

const { sendError } = require('../utils/sendError')
const store = require('../utils/salesCoiStore')
const pipelineStore = require('../utils/salesPipelineStore')
const metrics = require('../utils/salesMetrics')

/**
 * /api/sales/coi — an advisor's centres of influence, and
 * /api/sales/metrics — the dashboard's figures (item 17 stage 3).
 *
 * All routes derive identity from the verified JWT (firmAuth attaches
 * req.advisorId / req.firmId); ids in the body are NEVER trusted for ownership.
 * The reasoning is `salesPipeline.js`'s, and is not repeated here.
 */

/** Fields the caller may set, with their kind, taken from the store. */
const FIELD_KINDS = store.COLUMNS.reduce((out, [js, , kind]) => {
  out[js] = kind
  return out
}, {})

/** A COI needs a name. Everything else is optional. */
const REQUIRED_ON_CREATE = ['coiName']

/**
 * Validate and narrow a request body to the fields this resource owns.
 *
 * Unknown keys are DROPPED silently — a client sending `advisorId` or `firmId`
 * must not be able to set them, and must not learn that it tried.
 *
 * @param {object} body
 * @param {boolean} isCreate
 * @returns {{ value?: object, error?: {code: string, message: string} }}
 */
function validate (body, isCreate) {
  const src = body && typeof body === 'object' ? body : {}
  const out = {}

  if (isCreate) {
    for (const f of REQUIRED_ON_CREATE) {
      if (!String(src[f] || '').trim()) {
        return { error: { code: 'MISSING_FIELD', message: 'A name is required' } }
      }
    }
  }

  for (const key of Object.keys(src)) {
    const kind = FIELD_KINDS[key]
    if (!kind) { continue }
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
      if (n > 999999999999.99) {
        return { error: { code: 'INVALID_NUMBER', message: 'That amount is too large' } }
      }
      out[key] = n
      continue
    }

    if (kind === 'score' || kind === 'count') {
      const n = Number(v)
      if (!Number.isFinite(n)) {
        return { error: { code: 'INVALID_NUMBER', message: 'That must be a number' } }
      }
      if (n < 0) {
        return { error: { code: 'INVALID_NUMBER', message: 'That cannot be negative' } }
      }
      // INT column. A larger value is refused rather than wrapped by MySQL into
      // a different number.
      if (n > 2147483647) {
        return { error: { code: 'INVALID_NUMBER', message: 'That number is too large' } }
      }
      out[key] = Math.round(n)
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
 * GET /api/sales/coi — the referral partners this advisor may see.
 * @route GET /api/sales/coi
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
    console.error('[salesCoi] listEntries failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not load your referral partners')
  }
}

/**
 * POST /api/sales/coi — add a referral partner, private unless the body says
 * otherwise.
 * @route POST /api/sales/coi
 * @param {string} req.body.coiName - required
 * @returns {200} { success: true, item }
 * @returns {400} MISSING_FIELD · INVALID_NUMBER · INVALID_TEXT · INVALID_VISIBILITY
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
    console.error('[salesCoi] createEntry failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not save the referral partner')
  }
}

/**
 * PUT /api/sales/coi/:id — change a partner the caller OWNS. The body is a
 * partial update; a field left out is left alone and an explicit null clears it.
 * A row that is not the caller's answers 404, the same as one that does not exist.
 * @route PUT /api/sales/coi/:id
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
  if (!id) { return sendError(res, 400, 'MISSING_ID', 'No referral partner was named') }
  const { value, error } = validate(req.body, false)
  if (error) { return sendError(res, 400, error.code, error.message) }
  try {
    const item = await store.update(id, advisorId, firmId, value)
    if (!item) { return sendError(res, 404, 'NOT_FOUND', 'That referral partner is not one of yours') }
    res.send(200, { success: true, item })
  } catch (err) {
    console.error('[salesCoi] updateEntry failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not save the change')
  }
}

/**
 * DELETE /api/sales/coi/:id — remove a partner the caller OWNS.
 * @route DELETE /api/sales/coi/:id
 * @returns {200} { success: true, deleted: true }
 * @returns {400} MISSING_ID · {403} NO_ADVISOR_IDENTITY · {404} NOT_FOUND · {500} DB_ERROR
 */
async function deleteEntry (req, res) {
  const { advisorId, firmId } = identityOf(req)
  if (!advisorId || !firmId) {
    return sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify an advisor')
  }
  const id = String((req.params && req.params.id) || '').trim()
  if (!id) { return sendError(res, 400, 'MISSING_ID', 'No referral partner was named') }
  try {
    const deleted = await store.remove(id, advisorId, firmId)
    if (!deleted) { return sendError(res, 404, 'NOT_FOUND', 'That referral partner is not one of yours') }
    res.send(200, { success: true, deleted: true })
  } catch (err) {
    console.error('[salesCoi] deleteEntry failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not delete the referral partner')
  }
}

/**
 * GET /api/sales/metrics — the dashboard's figures.
 *
 * 🔴 IT AGGREGATES ROWS THE TWO STORES ALREADY FILTERED, and never queries the
 * tables itself. So the dashboard can only ever summarise what this advisor may
 * already see, and the access rule cannot drift between the list screens and the
 * summary of them. The source app computes its dashboard with separate aggregate
 * queries carrying no user filter at all — a second place to get it wrong, and it
 * did.
 *
 * @route GET /api/sales/metrics
 * @returns {200} { success: true, metrics: object }
 * @returns {403} NO_ADVISOR_IDENTITY · {500} DB_ERROR
 */
async function getMetrics (req, res) {
  const { advisorId, firmId } = identityOf(req)
  if (!advisorId || !firmId) {
    return sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify an advisor')
  }
  try {
    const [deals, cois] = await Promise.all([
      pipelineStore.listForAdvisor(advisorId, firmId),
      store.listForAdvisor(advisorId, firmId)
    ])
    res.send(200, { success: true, metrics: metrics.compute(deals, cois) })
  } catch (err) {
    console.error('[salesCoi] getMetrics failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not work out your figures')
  }
}

module.exports = { listEntries, createEntry, updateEntry, deleteEntry, getMetrics, validate }
