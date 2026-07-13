/**
 * Client register API client — talks to the secured /api/clients backend routes
 * (client knowledge base, design 2026-07-14).
 *
 * Identity (advisorId/firmId) is derived server-side from the Bearer token and
 * is never sent in the body — the same rule as utils/cases.js. Routes live on
 * the Restify backend with no Nuxt proxy, so they are called at the absolute
 * backend URL.
 */

const BACKEND = 'http://localhost:4000'

function authHeaders (token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

/**
 * Fetch the firm's client register (alphabetical) — the list the advisor picks
 * from at session start.
 * @param {string} token - Bearer token
 * @returns {Promise<object[]>}
 */
export async function listClients (token) {
  const res = await fetch(`${BACKEND}/api/clients`, { headers: authHeaders(token) })
  if (!res.ok) { throw new Error(`Failed to load clients (${res.status})`) }
  return (await res.json()).clients || []
}

/**
 * Register a new client. Without `confirmed`, a near-duplicate name is NOT
 * created — the server returns { created: false, possibleDuplicates } so the
 * UI can ask "did you mean…?". Resubmit with confirmed: true to create anyway
 * (two genuinely distinct businesses can share a name).
 * @param {string} name - the business name
 * @param {boolean} confirmed - create despite near-duplicates
 * @param {string} token - Bearer token
 * @returns {Promise<{created: boolean, client?: object, possibleDuplicates?: object[]}>}
 */
export async function createClient (name, confirmed, token) {
  const res = await fetch(`${BACKEND}/api/clients`, {
    method: 'POST', headers: authHeaders(token), body: JSON.stringify({ name, confirmed: confirmed === true })
  })
  if (!res.ok) { throw new Error(`Failed to save client (${res.status})`) }
  return await res.json()
}
