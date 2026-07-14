'use strict'

const { sendError } = require('../utils/sendError')
const clientStore = require('../utils/clientStore')

/**
 * /api/clients — the firm's client register (client knowledge base, design
 * 2026-07-14). All routes derive identity from the verified JWT (firmAuth
 * attaches req.advisorId / req.firmId); ids in the body/params are NEVER
 * trusted for ownership — the same rule that closed the cases IDOR.
 *
 * The register is FIRM-scoped: one list per firm, so the same client is never
 * registered twice. Reading a client's CASES stays governed by the case
 * visibility model — these routes expose names only.
 */

/**
 * GET /api/clients — the firm's client register, alphabetical. This is the
 * list the advisor picks from at session start ("Who is this session for?").
 * @route GET /api/clients
 * @returns {200} { success: true, clients: object[] }
 * @returns {403} NO_FIRM_IDENTITY · {500} DB_ERROR
 */
async function listClients (req, res) {
  const firmId = req.firmId
  if (!firmId) {
    return sendError(res, 403, 'NO_FIRM_IDENTITY', 'Your session does not identify a firm')
  }
  try {
    const clients = await clientStore.listForFirm(firmId)
    res.send(200, { success: true, clients })
  } catch (err) {
    console.error('[clients] listClients failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not load the client list')
  }
}

/**
 * POST /api/clients — register a new client for the firm.
 *
 * The "did you mean…?" guard: unless the body carries `confirmed: true`, the
 * name is first checked against the existing register (normalised — case,
 * punctuation and diacritic variants collapse). On a near-miss the client is
 * NOT created; the possible duplicates are returned so the UI can ask. The
 * advisor either picks the existing client or resubmits with confirmed: true —
 * two genuinely distinct businesses CAN share a name, so the server warns but
 * never hard-blocks (product owner design, 2026-07-14).
 *
 * @route POST /api/clients
 * @param {string} req.body.name - the business name (becomes the editable label)
 * @param {boolean} [req.body.confirmed] - true = create despite near-duplicates
 * @returns {200} { success: true, created: true, client }
 * @returns {200} { success: true, created: false, possibleDuplicates } - needs confirmation
 * @returns {400} MISSING_NAME · {403} NO_ADVISOR_IDENTITY · {500} DB_ERROR
 */
async function createClient (req, res) {
  const advisorId = req.advisorId
  const firmId = req.firmId
  if (!advisorId || !firmId) {
    return sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify an advisor')
  }
  const body = req.body || {}
  const name = String(body.name || '').trim()
  if (!name) {
    return sendError(res, 400, 'MISSING_NAME', 'A business name is required')
  }
  try {
    if (body.confirmed !== true) {
      const register = await clientStore.listForFirm(firmId)
      const possibleDuplicates = clientStore.findSimilar(register, name)
      if (possibleDuplicates.length > 0) {
        // Not an error: the advisor is being asked "did you mean…?". They pick
        // an existing client, or resubmit with confirmed: true.
        return res.send(200, { success: true, created: false, possibleDuplicates })
      }
    }
    const client = await clientStore.create({ firmId, name, createdBy: advisorId })
    res.send(200, { success: true, created: true, client })
  } catch (err) {
    console.error('[clients] createClient failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not save the client')
  }
}

/**
 * PUT /api/clients/:id — rename a client. The label changes, the hidden
 * identity does not, so every linked case keeps its history. Firm-scoped: a
 * client id belonging to another firm 404s exactly as if it did not exist.
 * @route PUT /api/clients/:id
 * @param {string} req.body.name - the new display name
 * @returns {200} { success: true, client } · {400} MISSING_NAME
 * @returns {404} NOT_FOUND · {403} NO_FIRM_IDENTITY · {500} DB_ERROR
 */
async function renameClient (req, res) {
  const firmId = req.firmId
  if (!firmId) {
    return sendError(res, 403, 'NO_FIRM_IDENTITY', 'Your session does not identify a firm')
  }
  const name = String((req.body || {}).name || '').trim()
  if (!name) {
    return sendError(res, 400, 'MISSING_NAME', 'A business name is required')
  }
  try {
    const ok = await clientStore.rename(req.params.id, firmId, name)
    if (!ok) { return sendError(res, 404, 'NOT_FOUND', 'Client not found') }
    const client = await clientStore.getById(req.params.id, firmId)
    res.send(200, { success: true, client })
  } catch (err) {
    console.error('[clients] renameClient failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not rename the client')
  }
}

module.exports = { listClients, createClient, renameClient }
