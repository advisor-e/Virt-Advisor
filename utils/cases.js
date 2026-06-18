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

// Legacy localStorage key the cases used to live under, + a one-time migration flag.
const LEGACY_STORAGE_KEY = 'va_case_studies'
const MIGRATION_FLAG = 'va_case_studies_migrated_at'

/**
 * One-time lift of any cases saved in the browser BEFORE the move to the database
 * (the old localStorage store) up into the shared DB via the API.
 *
 * - Runs at most once per browser (guarded by a localStorage flag), then no-ops.
 * - Preserves each case's original id, so a re-run can't create duplicates (the
 *   server rejects a duplicate id; such errors are caught and skipped).
 * - Keeps the legacy localStorage copy as a backup — nothing is deleted — so a
 *   case is never lost even if an upload fails.
 *
 * Safe on the server (no `localStorage`): it returns immediately. Call it from a
 * client lifecycle hook (mounted), never during SSR.
 *
 * @param {string} token - Bearer token
 * @returns {Promise<{migrated:number, total:number, skipped?:boolean}>}
 */
export async function migrateLegacyCases (token) {
  if (typeof localStorage === 'undefined') { return { migrated: 0, total: 0, skipped: true } }
  if (localStorage.getItem(MIGRATION_FLAG)) { return { migrated: 0, total: 0, skipped: true } }

  let legacy
  try { legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || '[]') } catch (e) { legacy = [] }
  if (!Array.isArray(legacy) || legacy.length === 0) {
    localStorage.setItem(MIGRATION_FLAG, new Date().toISOString())
    return { migrated: 0, total: 0 }
  }

  let migrated = 0
  for (const c of legacy) {
    try {
      await createCase({
        id: c.id, // preserve the original id so a re-run cannot duplicate
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
      migrated++
    } catch (e) {
      // Leave the legacy copy intact and continue; the backup remains recoverable.
    }
  }

  // Record that we've run (exactly once) — the legacy data stays as a backup.
  localStorage.setItem(MIGRATION_FLAG, new Date().toISOString())
  return { migrated, total: legacy.length }
}
