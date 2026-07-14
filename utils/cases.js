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
  const res = await fetch('/api/cases', { headers: authHeaders(token) })
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
  const res = await fetch('/api/cases', {
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
  const res = await fetch(`/api/cases/${encodeURIComponent(id)}/review`, {
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
  const res = await fetch(`/api/cases/${encodeURIComponent(id)}/visibility`, {
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
  const res = await fetch(`/api/cases/${encodeURIComponent(id)}`, {
    method: 'DELETE', headers: authHeaders(token)
  })
  if (!res.ok) { throw new Error(`Failed to delete case (${res.status})`) }
}

/**
 * Find the case the session-start catch-up card should ask about (Stage 5c,
 * 2026-07-14): the advisor's OWN most recent case for this client that
 * delivered templates but has no per-template outcomes recorded yet. Own cases
 * only — outcome writes are owner-scoped server-side, and an advisor should
 * only vouch for sessions they delivered. Cases arrive newest-first from the
 * backend; returns null when there is nothing to catch up on.
 * @param {object[]} cases - the advisor-visible case list (rowToCase shape)
 * @param {string} advisorId - the authenticated advisor (server-returned)
 * @param {string} clientId - the session's chosen client
 * @returns {object|null}
 */
export function findUnrecordedCase (cases, advisorId, clientId) {
  if (!Array.isArray(cases) || !advisorId || !clientId) { return null }
  return cases.find(c =>
    c &&
    c.advisorId === advisorId &&
    c.clientId === clientId &&
    Array.isArray(c.templates) && c.templates.length > 0 &&
    (!Array.isArray(c.templateOutcomes) || c.templateOutcomes.length === 0)
  ) || null
}

// Legacy localStorage key the cases used to live under, a one-time COMPLETION flag,
// and a per-id record of what has already been migrated (so a retry after a partial
// failure resumes rather than re-sending — or permanently abandoning — cases).
const LEGACY_STORAGE_KEY = 'va_case_studies'
const MIGRATION_FLAG = 'va_case_studies_migrated_at'
const MIGRATED_IDS_KEY = 'va_case_studies_migrated_ids'

// Guards against a re-entrant run: caseMixin calls this from both mounted() and the
// apiToken watcher, which can overlap. A concurrent second call no-ops.
let migrationInFlight = false

/**
 * One-time lift of any cases saved in the browser BEFORE the move to the database
 * (the old localStorage store) up into the shared DB via the API.
 *
 * - Completes at most once per browser. The completion flag is set ONLY when every
 *   legacy case has actually migrated. If some fail (backend down, or the auth token
 *   not yet resolved — see caseMixin), the flag is left unset so the next load retries.
 *   (The previous version set the flag unconditionally, so a first-load failure — the
 *   common production case where migration runs before the real token resolves —
 *   permanently abandoned every un-migrated case.)
 * - Tracks migrated ids and skips them on a retry, so a re-run can never duplicate a
 *   case, independent of the server's duplicate handling.
 * - Keeps the legacy localStorage copy as a backup — nothing is deleted.
 * - Re-entrancy-safe (see migrationInFlight).
 *
 * Safe on the server (no `localStorage`): it returns immediately. Call it from a
 * client lifecycle hook (mounted), never during SSR.
 *
 * @param {string} token - Bearer token
 * @returns {Promise<{migrated:number, total:number, failed?:number, complete?:boolean, skipped?:boolean}>}
 */
export async function migrateLegacyCases (token) {
  if (typeof localStorage === 'undefined') { return { migrated: 0, total: 0, skipped: true } }
  if (localStorage.getItem(MIGRATION_FLAG)) { return { migrated: 0, total: 0, skipped: true } }
  if (migrationInFlight) { return { migrated: 0, total: 0, skipped: true } }
  migrationInFlight = true

  try {
    let legacy
    try { legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || '[]') } catch (e) { legacy = [] }
    if (!Array.isArray(legacy) || legacy.length === 0) {
      localStorage.setItem(MIGRATION_FLAG, new Date().toISOString())
      return { migrated: 0, total: 0, complete: true }
    }

    // Ids already migrated in a previous (possibly partial) run — never re-send them.
    let done
    try { done = new Set(JSON.parse(localStorage.getItem(MIGRATED_IDS_KEY) || '[]')) } catch (e) { done = new Set() }

    let migrated = 0
    let failed = 0
    for (const c of legacy) {
      if (c && c.id && done.has(c.id)) { continue } // already landed in an earlier run
      try {
        await createCase({
          id: c.id, // preserve the original id
          title: c.title,
          mode: c.mode,
          visibility: c.visibility,
          domain: c.domain,
          templates: c.templates,
          summary: c.summary,
          transcript: c.transcript,
          staircaseStep: c.staircaseStep,
          growthStage: c.growthStage,
          finMgtTheme: c.finMgtTheme,
          feedbackPending: c.feedbackPending
        }, token)
        // Carry across a completed post-delivery review, if one was recorded.
        if (c.review && (c.review.wentWell || c.review.wentLess || c.review.changesRecommended)) {
          await updateCaseReview(c.id, c.review, token)
        }
        if (c && c.id) { done.add(c.id) }
        migrated++
      } catch (e) {
        failed++ // leave it for a later retry; the legacy backup is intact
      }
    }

    // Persist per-id progress so a retry resumes where this run stopped.
    localStorage.setItem(MIGRATED_IDS_KEY, JSON.stringify(Array.from(done)))

    // Mark COMPLETE only when every legacy case is accounted for; otherwise leave the
    // flag unset so the next load retries the ones that failed.
    const allDone = legacy.every(c => !c || !c.id || done.has(c.id))
    if (allDone) {
      localStorage.setItem(MIGRATION_FLAG, new Date().toISOString())
      localStorage.removeItem(MIGRATED_IDS_KEY)
    }
    return { migrated, total: legacy.length, failed, complete: allDone }
  } finally {
    migrationInFlight = false
  }
}
