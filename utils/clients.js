/**
 * Client register API client — talks to the secured /api/clients backend routes
 * (client knowledge base, design 2026-07-14).
 *
 * Identity (advisorId/firmId) is derived server-side from the Bearer token and
 * is never sent in the body — the same rule as utils/cases.js.
 *
 * Called through the Nuxt thin proxy (`/api/clients`), like every other feature.
 * This file previously hardcoded an absolute backend address, so the client register
 * only worked where the browser and the backend shared a host — fine on a developer
 * laptop, broken in UAT or production. The frontend is not supposed to know where the
 * backend lives: that is the proxy's job (CLAUDE.md → Architecture boundary).
 */

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
  const res = await fetch('/api/clients', { headers: authHeaders(token) })
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
  const res = await fetch('/api/clients', {
    method: 'POST', headers: authHeaders(token), body: JSON.stringify({ name, confirmed: confirmed === true })
  })
  if (!res.ok) { throw new Error(`Failed to save client (${res.status})`) }
  return await res.json()
}

/**
 * Normalise a business name for matching — MIRRORS the backend's
 * clientStore.normaliseNameKey (which cannot be imported into the browser
 * bundle: it sits beside the MySQL client). Keep the two in sync: lowercase,
 * strip diacritics, drop everything that is not a letter or digit.
 * @param {string} name
 * @returns {string}
 */
export function normaliseClientKey (name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

/**
 * Order + filter the client register for the session-start picker (design
 * approved 2026-07-14: "recent clients first, type-to-filter across all").
 *
 * Empty query → the advisor's RECENTLY-WORKED clients first (last case
 * activity, computed from the visible case list which arrives newest-first),
 * then never-worked clients newest-registered first; capped at `limit` with
 * `truncated` set so the UI can say "type to search all N".
 *
 * Non-empty query → every client whose normalised name CONTAINS the
 * normalised query (punctuation/case/diacritic-insensitive), same ordering,
 * no cap. Zero matches means the typed text is a NEW client name — the same
 * box creates it.
 * @param {object[]} register - the firm client list
 * @param {object[]} cases - advisor-visible cases (for recency)
 * @param {string} query - the current input text
 * @param {number} limit - max shown when the query is empty
 * @returns {{clients: object[], truncated: boolean}}
 */
export function filterClientRegister (register, cases, query, limit) {
  // Cases arrive newest-first, so the first case seen per client is its latest.
  const lastActivity = {}
  for (const c of (cases || [])) {
    if (c && c.clientId && c.createdAt && !lastActivity[c.clientId]) {
      lastActivity[c.clientId] = c.createdAt
    }
  }
  const sorted = [...(register || [])].sort((a, b) => {
    const aAct = lastActivity[a.id] || null
    const bAct = lastActivity[b.id] || null
    if (aAct && bAct) { return new Date(bAct) - new Date(aAct) }
    if (aAct) { return -1 }
    if (bAct) { return 1 }
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  })
  const q = normaliseClientKey(query)
  if (!q) {
    const cap = (typeof limit === 'number' && limit > 0) ? limit : 8
    return { clients: sorted.slice(0, cap), truncated: sorted.length > cap }
  }
  const matches = sorted.filter(c => (c.nameKey || normaliseClientKey(c.name)).includes(q))
  return { clients: matches, truncated: false }
}
