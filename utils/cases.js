/**
 * Case study API client — talks to the secured /api/cases backend routes.
 *
 * Storage moved from browser localStorage to the firm database (2026-06-19, see
 * design memory `design-case-study-visibility-model`) so a case follows the
 * advisor across devices and a "shared" case actually reaches the firm.
 *
 * Identity (advisorId/firmId) is derived server-side from the Bearer token and is
 * never sent in the body — so these functions only carry the token + payload.
 *
 * The cases routes live on the Restify backend with no Nuxt proxy, so they are
 * called at the absolute backend URL (the same pattern as the promote button).
 */

const BACKEND = 'http://localhost:4000'

function authHeaders (token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

/**
 * Fetch the cases visible to the signed-in advisor (their own, any visibility,
 * plus their firm's shared cases). Returns the authenticated advisorId too, so
 * the caller can tell which cases are the advisor's own.
 * @param {string} token - Bearer token
 * @returns {Promise<{cases: object[], advisorId: string|null}>}
 */
export async function listCases (token) {
  const res = await fetch(`${BACKEND}/api/cases`, { headers: authHeaders(token) })
  if (!res.ok) { throw new Error(`Failed to load cases (${res.status})`) }
  const data = await res.json()
  return { cases: data.cases || [], advisorId: data.advisorId || null }
}

/**
 * Save a new case. advisorId/firmId are NOT sent — the backend derives them from
 * the token. Returns the stored case (with its server-assigned fields).
 * @param {object} caseData
 * @param {string} token - Bearer token
 * @returns {Promise<object>}
 */
export async function createCase (caseData, token) {
  const res = await fetch(`${BACKEND}/api/cases`, {
    method: 'POST', headers: authHeaders(token), body: JSON.stringify(caseData)
  })
  if (!res.ok) { throw new Error(`Failed to save case (${res.status})`) }
  return (await res.json()).case
}

/**
 * Record the post-delivery review on an owned case.
 * @param {string} id
 * @param {{wentWell?:string, wentLess?:string, changesRecommended?:string}} review
 * @param {string} token - Bearer token
 */
export async function updateCaseReview (id, review, token) {
  const res = await fetch(`${BACKEND}/api/cases/${encodeURIComponent(id)}/review`, {
    method: 'PUT', headers: authHeaders(token), body: JSON.stringify(review)
  })
  if (!res.ok) { throw new Error(`Failed to save review (${res.status})`) }
}

/**
 * Flip an owned case between 'private' and 'shared'.
 * @param {string} id
 * @param {'private'|'shared'} visibility
 * @param {string} token - Bearer token
 * @returns {Promise<string>} the new visibility
 */
export async function setCaseVisibility (id, visibility, token) {
  const res = await fetch(`${BACKEND}/api/cases/${encodeURIComponent(id)}/visibility`, {
    method: 'PUT', headers: authHeaders(token), body: JSON.stringify({ visibility })
  })
  if (!res.ok) { throw new Error(`Failed to change visibility (${res.status})`) }
  return (await res.json()).visibility
}

/**
 * Delete an owned case.
 * @param {string} id
 * @param {string} token - Bearer token
 */
export async function deleteCase (id, token) {
  const res = await fetch(`${BACKEND}/api/cases/${encodeURIComponent(id)}`, {
    method: 'DELETE', headers: authHeaders(token)
  })
  if (!res.ok) { throw new Error(`Failed to delete case (${res.status})`) }
}
