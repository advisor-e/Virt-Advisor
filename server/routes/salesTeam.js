'use strict'

const { sendError } = require('../utils/sendError')
const teamStore = require('../utils/salesTeamStore')
const listsStore = require('../utils/salesListsStore')
const metrics = require('../utils/salesMetrics')

/**
 * /api/sales/team — the firm-wide roll-up, and
 * /api/sales/lists — the dropdown values behind every Sales Tracker screen.
 * Item 17 stage 4.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 WHO MAY CALL WHAT, AND WHERE THAT IS ENFORCED
 * ─────────────────────────────────────────────────────────────────────────────
 * The role gate is `requireManagerRole`, applied at REGISTRATION in
 * `restify-server.js`, not inside these handlers — the same shape every other
 * manager route in this app uses.
 *
 *   GET  /api/sales/team      firmAuth + requireManagerRole
 *   GET  /api/sales/lists     firmAuth                      — any advisor reads
 *   PUT  /api/sales/lists/:key    firmAuth + requireManagerRole
 *   GET  /api/sales/lists/:key/history  firmAuth + requireManagerRole
 *   POST /api/sales/lists/:key/restore  firmAuth + requireManagerRole
 *
 * READING a list is deliberately open to every advisor: the pipeline and COI
 * screens build their dropdowns from it, so gating the read would empty the
 * dropdowns for exactly the people who use them. CHANGING one is the manager's,
 * because a list is firm-wide and one advisor must not retitle everyone's stages.
 *
 * ⚠ THE SOURCE APP GATES THE PAGE, NOT THE DATA. Its `middleware/firm-manager.js`
 * begins `if (process.server) return` — a client-side redirect that hides the
 * screen while `/api/team/summary` stays open to anyone signed in. Ours is a
 * server-side role check in front of the route, so the data is what is protected.
 */

/** Both ids come from the verified token. No route reads either from the request. */
function identityOf (req) {
  return { advisorId: req.advisorId, firmId: req.firmId }
}

/**
 * GET /api/sales/team — every advisor's pipeline in this firm, grouped by the
 * staff member leading each deal.
 *
 * 🔴 PRIVATE DEALS ARE INCLUDED. Mike's ruling, 2026-09-22: a firm manager sees
 * every deal in their firm. That is the one place in the Sales Tracker where one
 * person reads another's private row, which is why the role gate is a server-side
 * check and the firm filter is in the SQL rather than in this handler.
 *
 * @route GET /api/sales/team
 * @returns {200} { success: true, rows, totals, truncated }
 * @returns {403} NO_ADVISOR_IDENTITY (or FORBIDDEN from requireManagerRole)
 * @returns {500} DB_ERROR
 */
async function getTeamSummary (req, res) {
  const { firmId } = identityOf(req)
  if (!firmId) {
    return sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify a firm')
  }
  try {
    const deals = await teamStore.listForFirm(firmId)
    const { rows, totals } = metrics.teamSummary(deals)
    // The store caps at 2000. Saying so is not decoration: a roll-up quietly
    // missing rows reports wrong totals to the person judging their team by them.
    res.send(200, { success: true, rows, totals, truncated: deals.length >= 2000 })
  } catch (err) {
    console.error('[salesTeam] getTeamSummary failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not load the team summary')
  }
}

/**
 * GET /api/sales/lists — all ten dropdown lists for this firm, defaults filled
 * in for any the firm has never customised.
 * @route GET /api/sales/lists
 * @returns {200} { success: true, lists }
 * @returns {403} NO_ADVISOR_IDENTITY · {500} DB_ERROR
 */
async function getLists (req, res) {
  const { firmId } = identityOf(req)
  if (!firmId) {
    return sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify a firm')
  }
  try {
    const lists = await listsStore.getLists(firmId)
    res.send(200, { success: true, lists })
  } catch (err) {
    console.error('[salesTeam] getLists failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not load the lists')
  }
}

/**
 * PUT /api/sales/lists/:key — replace the values in one list.
 *
 * A PUT, not a PATCH, matching every other partial-update route in this app (see
 * salesPipeline.js — `serverWiring.test.js` fails the build on a new verb).
 *
 * @route PUT /api/sales/lists/:key
 * @param {string[]} req.body.items - the complete new list; order is kept
 * @param {object} [req.body.colors] - optional label → colour map
 * @returns {200} { success: true, list }
 * @returns {400} UNKNOWN_LIST · INVALID_ITEMS · {403} NO_ADVISOR_IDENTITY · {500} DB_ERROR
 */
async function saveList (req, res) {
  const { advisorId, firmId } = identityOf(req)
  if (!firmId) {
    return sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify a firm')
  }
  const key = String((req.params && req.params.key) || '').trim()
  if (!listsStore.isKnownKey(key)) {
    return sendError(res, 400, 'UNKNOWN_LIST', 'That is not one of the Sales Tracker lists')
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const { value: items, error } = listsStore.normaliseItems(body.items)
  if (error) { return sendError(res, 400, 'INVALID_ITEMS', error) }

  // Colours are optional and only ever a flat map of text to text. Anything else
  // is refused rather than stored and handed to a screen as a style attribute.
  let colors
  if (body.colors !== undefined && body.colors !== null) {
    if (typeof body.colors !== 'object' || Array.isArray(body.colors)) {
      return sendError(res, 400, 'INVALID_ITEMS', 'Colours must be a set of label and colour pairs')
    }
    colors = {}
    for (const label of Object.keys(body.colors)) {
      const v = body.colors[label]
      if (typeof v !== 'string') {
        return sendError(res, 400, 'INVALID_ITEMS', 'Every colour must be text')
      }
      // A CSS colour, not arbitrary text: a stored value reaches a style binding.
      if (!/^#[0-9a-fA-F]{3,8}$/.test(v.trim())) {
        return sendError(res, 400, 'INVALID_ITEMS', 'Every colour must be a hex value like #dcfce7')
      }
      colors[String(label).slice(0, listsStore.MAX_ITEM_LENGTH)] = v.trim()
    }
  }

  try {
    const list = await listsStore.saveList(firmId, key, { items, colors }, advisorId || 'unknown')
    res.send(200, { success: true, list })
  } catch (err) {
    console.error('[salesTeam] saveList failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not save the list')
  }
}

/**
 * GET /api/sales/lists/:key/history — the saved versions of one list, newest first.
 * @route GET /api/sales/lists/:key/history
 * @returns {200} { success: true, versions }
 * @returns {400} UNKNOWN_LIST · {403} NO_ADVISOR_IDENTITY · {500} DB_ERROR
 */
async function getListHistory (req, res) {
  const { firmId } = identityOf(req)
  if (!firmId) {
    return sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify a firm')
  }
  const key = String((req.params && req.params.key) || '').trim()
  if (!listsStore.isKnownKey(key)) {
    return sendError(res, 400, 'UNKNOWN_LIST', 'That is not one of the Sales Tracker lists')
  }
  try {
    const versions = await listsStore.historyFor(firmId, key)
    res.send(200, { success: true, versions })
  } catch (err) {
    console.error('[salesTeam] getListHistory failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not load the version history')
  }
}

/**
 * POST /api/sales/lists/:key/restore — put one list back to an earlier version.
 * @route POST /api/sales/lists/:key/restore
 * @param {number|string} req.body.versionId - a version of THIS firm's list
 * @returns {200} { success: true, list }
 * @returns {400} UNKNOWN_LIST · MISSING_VERSION · {403} NO_ADVISOR_IDENTITY
 * @returns {404} NOT_FOUND · {500} DB_ERROR
 */
async function restoreList (req, res) {
  const { firmId } = identityOf(req)
  if (!firmId) {
    return sendError(res, 403, 'NO_ADVISOR_IDENTITY', 'Your session does not identify a firm')
  }
  const key = String((req.params && req.params.key) || '').trim()
  if (!listsStore.isKnownKey(key)) {
    return sendError(res, 400, 'UNKNOWN_LIST', 'That is not one of the Sales Tracker lists')
  }
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const versionId = body.versionId
  if (versionId === undefined || versionId === null || versionId === '') {
    return sendError(res, 400, 'MISSING_VERSION', 'No version was named')
  }
  try {
    const list = await listsStore.restoreList(firmId, key, versionId)
    res.send(200, { success: true, list })
  } catch (err) {
    // firmOverlay throws this for a version belonging to another firm or key —
    // which is a 404, not a 500: it is a miss, not a fault.
    if (/version not found/i.test(err.message)) {
      return sendError(res, 404, 'NOT_FOUND', 'That version is not one of this list')
    }
    console.error('[salesTeam] restoreList failed:', err.message)
    sendError(res, 500, 'DB_ERROR', 'Could not restore that version')
  }
}

module.exports = {
  getTeamSummary,
  getLists,
  saveList,
  getListHistory,
  restoreList
}
