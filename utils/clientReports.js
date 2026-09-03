/**
 * Business Entity Reports API client — the advisor's per-client switch and the
 * client's own read (design/features/business-entity-reports.md, approved 2026-09-03).
 *
 * Identity is derived server-side from the Bearer token and is never sent in the body,
 * the same rule as utils/clients.js. Called through the Nuxt thin proxy
 * (`/api/client-reports`), like every other feature.
 */

function authHeaders (token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

/**
 * The advisor's view: which models are open to one client of the firm.
 * @param {string} clientId - a register id of the advisor's own firm
 * @param {string} token - Bearer token
 * @returns {Promise<{clientId: string, clientName: string, open: object}>}
 */
export async function getClientAccess (clientId, token) {
  const res = await fetch(`/api/client-reports/access/${encodeURIComponent(clientId)}`, { headers: authHeaders(token) })
  if (!res.ok) { throw new Error(`Failed to load client access (${res.status})`) }
  return await res.json()
}

/**
 * Open or hide one model for one client.
 * @param {string} clientId
 * @param {string} route - the model's catalogue route, e.g. '/volatility'
 * @param {'open'|'hidden'} state
 * @param {string} token
 * @returns {Promise<{clientId: string, route: string, state: string}>}
 */
export async function setClientAccess (clientId, route, state, token) {
  const res = await fetch(`/api/client-reports/access/${encodeURIComponent(clientId)}`, {
    method: 'PUT', headers: authHeaders(token), body: JSON.stringify({ route, state })
  })
  if (!res.ok) { throw new Error(`Failed to save client access (${res.status})`) }
  return await res.json()
}

async function parse (res, what) {
  if (!res.ok) {
    const err = new Error(`${what} (${res.status})`)
    err.status = res.status
    try { err.code = (await res.json()).error.code } catch (e) { /* no body */ }
    throw err
  }
  return await res.json()
}

/**
 * The advisor's read of a client's saved figures for one model (part 2, item 4.62).
 * @param {string} clientId @param {string} route @param {string} token
 * @returns {Promise<{clientId: string, clientName: string, report: object|null, clientChanges: string[]}>}
 */
export async function getSavedReport (clientId, route, token) {
  const res = await fetch(`/api/client-reports/saved/${encodeURIComponent(clientId)}?route=${encodeURIComponent(route)}`, { headers: authHeaders(token) })
  return parse(res, 'Failed to load the saved report')
}

/**
 * The advisor saves a client's figures for one model. Becomes the advisor's version.
 * @param {string} clientId @param {string} route @param {object} inputs @param {string} token
 * @returns {Promise<{report: object, clientChanges: string[]}>}
 */
export async function saveReportForClient (clientId, route, inputs, token) {
  const res = await fetch(`/api/client-reports/saved/${encodeURIComponent(clientId)}`, {
    method: 'PUT', headers: authHeaders(token), body: JSON.stringify({ route, inputs })
  })
  return parse(res, 'Failed to save the report')
}

/**
 * Put the advisor's last version back after a client edit (D4).
 * @param {string} clientId @param {string} route @param {string} token
 * @returns {Promise<{report: object, clientChanges: string[]}>}
 */
export async function restoreReportForClient (clientId, route, token) {
  const res = await fetch(`/api/client-reports/saved/${encodeURIComponent(clientId)}/restore`, {
    method: 'POST', headers: authHeaders(token), body: JSON.stringify({ route })
  })
  return parse(res, 'Failed to restore the report')
}

/**
 * The business entity's own saved copy of one model. Identity from the token.
 * @param {string} route @param {string} token
 * @returns {Promise<{report: object|null, clientChanges: string[]}>}
 */
export async function getMySavedReport (route, token) {
  const res = await fetch(`/api/client-reports/mine/saved?route=${encodeURIComponent(route)}`, { headers: authHeaders(token) })
  return parse(res, 'Failed to load your report')
}

/**
 * The business entity saves its own edits. A 403 with code NOT_OPEN means the advisor
 * has not opened this model to them.
 * @param {string} route @param {object} inputs @param {string} token
 * @returns {Promise<{report: object, clientChanges: string[]}>}
 */
export async function saveMyReport (route, inputs, token) {
  const res = await fetch('/api/client-reports/mine/saved', {
    method: 'PUT', headers: authHeaders(token), body: JSON.stringify({ route, inputs })
  })
  return parse(res, 'Failed to save your changes')
}

/**
 * The client's own read: which models are open to them. The firm and client come from
 * the token. A 403 means the sign-in is not a business entity's.
 * @param {string} token
 * @returns {Promise<{open: object}>}
 * @throws {Error} with `status` set, so the screen can tell 403 from a network failure
 */
export async function getMyReports (token) {
  const res = await fetch('/api/client-reports/mine', { headers: authHeaders(token) })
  if (!res.ok) {
    const err = new Error(`Failed to load your reports (${res.status})`)
    err.status = res.status
    throw err
  }
  return await res.json()
}
