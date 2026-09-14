/**
 * Staff-register gate API client — Wages/Salary Review, item 4.100, Decision 6
 * (design/mockups/wages-register-gate.html, approved by Mike 2026-09-15).
 *
 * Identity is derived server-side from the Bearer token and is never sent in the body, the
 * same rule as utils/clientReports.js. Called through the Nuxt thin proxy
 * (`/api/wages-register`), like every other feature.
 *
 * ⚠ THE ANSWER FROM HERE IS A DISPLAY HINT, NOT A PERMISSION. The screen asks so it knows
 * what to render; the server re-checks the due-diligence case on the switch-on, so nothing
 * this module returns can open a register on its own.
 */

function authHeaders (token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
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
 * May the staff register be opened for this client, and who opened it.
 * @param {string} clientId - a client of the advisor's own firm
 * @param {string} token - Bearer token
 * @returns {Promise<{clientId: string, clientName: string, gate: {state: 'open'|'available'|'closed', reason: string, case: object|null, openedBy: object|null, openedAt: string|null}}>}
 */
export async function getRegisterGate (clientId, token) {
  const res = await fetch(`/api/wages-register/gate/${encodeURIComponent(clientId)}`, { headers: authHeaders(token) })
  return parse(res, 'Failed to check the staff register')
}

/**
 * The advisor switches the register on. Recorded with who and when — Decision 6.
 * @param {string} clientId @param {string} token
 * @returns {Promise<{clientId: string, gate: object}>}
 */
export async function openRegisterGate (clientId, token) {
  const res = await fetch(`/api/wages-register/gate/${encodeURIComponent(clientId)}/open`, {
    method: 'POST', headers: authHeaders(token)
  })
  return parse(res, 'Failed to open the staff register')
}

/**
 * The advisor switches the register off again. Recorded the same way the opening was, and
 * the opening itself is kept (Mike, 2026-09-15).
 * @param {string} clientId @param {string} token
 * @returns {Promise<{clientId: string, gate: object}>}
 */
export async function closeRegisterGate (clientId, token) {
  const res = await fetch(`/api/wages-register/gate/${encodeURIComponent(clientId)}/close`, {
    method: 'POST', headers: authHeaders(token)
  })
  return parse(res, 'Failed to close the staff register')
}
