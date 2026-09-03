'use strict'

/**
 * clientReportAccess — which report models an advisor has OPENED to which client.
 *
 * Mike, 2026-09-03 (design/features/business-entity-reports.md, D1–D6): per client, per
 * model, one switch held by the advisor — `hidden` by default, `open` once terms are
 * agreed. Hidden is the absence of a row, so a client nobody has touched sees nothing
 * open and no code path has to remember to write "hidden".
 *
 * STORAGE. One firm-scoped config key through firmOverlay, so version history and
 * restore come for free and nothing new is invented:
 *
 *   { clients: { [clientId]: { [modelRoute]: { state: 'open', by, at } } } }
 *
 * The model is keyed by its ROUTE ('/three-way-forecast'), not its name. The catalogue
 * (utils/reportModelCatalogue.js) is an ES module the Restify backend cannot require on
 * Node 14, and the route is the one identity both sides already share — it is what the
 * client's library links to. A route that stops matching a catalogue row simply never
 * shows; it cannot open anything.
 *
 * The client id is the firm's own register id (va_clients.id). Every function takes
 * the firm id from the verified token, never from the request — the same rule as the
 * client register itself.
 */

const overlay = require('./firmOverlay')

const CONFIG_KEY = 'client-report-access'
const STATES = ['open', 'hidden']
/** A catalogue route: one path segment, lowercase, digits and hyphens. */
const ROUTE_SHAPE = /^\/[a-z0-9-]+$/

/**
 * The whole switch table for a firm, in the stored shape. Never null.
 * @param {string} firmId - from the verified token
 * @returns {Promise<{clients: object}>}
 */
async function loadTable (firmId) {
  const stored = await overlay.loadFirmConfig(firmId, CONFIG_KEY)
  const table = stored && typeof stored === 'object' ? stored : {}
  if (!table.clients || typeof table.clients !== 'object') { table.clients = {} }
  return table
}

/**
 * What is open to one client: route → 'open'. Absent routes are hidden (D1).
 * @param {string} firmId
 * @param {string} clientId
 * @returns {Promise<Object<string, {state: string, by: string, at: string}>>}
 */
async function listForClient (firmId, clientId) {
  const table = await loadTable(firmId)
  const rows = table.clients[clientId]
  const out = {}
  if (!rows || typeof rows !== 'object') { return out }
  Object.keys(rows).forEach((route) => {
    if (rows[route] && rows[route].state === 'open') { out[route] = rows[route] }
  })
  return out
}

/**
 * Is one model open to one client? The single question the client's page asks.
 * @param {string} firmId
 * @param {string} clientId
 * @param {string} route
 * @returns {Promise<boolean>}
 */
async function isOpen (firmId, clientId, route) {
  const open = await listForClient(firmId, clientId)
  return Object.prototype.hasOwnProperty.call(open, route)
}

/**
 * Flip the switch for one client and one model. 'hidden' deletes the row, so the
 * stored table never grows with defaults.
 *
 * @param {string} firmId - from the verified token
 * @param {string} clientId - a client of that firm (the ROUTE checks it belongs)
 * @param {string} route - catalogue route, e.g. '/volatility'
 * @param {string} state - 'open' | 'hidden'
 * @param {string} savedBy - the advisor's email, for the audit trail
 * @returns {Promise<{route: string, state: string}>}
 * @throws {Error} err.code 'BAD_ROUTE' | 'BAD_STATE'
 */
async function setState (firmId, clientId, route, state, savedBy) {
  if (!ROUTE_SHAPE.test(String(route || ''))) {
    const e = new Error('A model is named by its route, like /volatility.'); e.code = 'BAD_ROUTE'; throw e
  }
  if (!STATES.includes(state)) {
    const e = new Error('The state is open or hidden.'); e.code = 'BAD_STATE'; throw e
  }
  const table = await loadTable(firmId)
  const rows = table.clients[clientId] || {}
  if (state === 'open') {
    rows[route] = { state: 'open', by: savedBy || 'unknown', at: new Date().toISOString() }
  } else {
    delete rows[route]
  }
  if (Object.keys(rows).length) { table.clients[clientId] = rows } else { delete table.clients[clientId] }
  await overlay.saveFirmConfig(firmId, CONFIG_KEY, table, savedBy)
  return { route, state }
}

module.exports = { CONFIG_KEY, STATES, ROUTE_SHAPE, loadTable, listForClient, isOpen, setState }
