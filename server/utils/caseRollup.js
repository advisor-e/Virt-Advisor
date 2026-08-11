'use strict'

/**
 * The one way a case study travels UP a tier, shared by every report that shows one.
 *
 * @module server/utils/caseRollup
 *
 * WHY THIS MODULE EXISTS. ADVISOR-E-DESIGN-LOGIC.md §4.1: "EVERY report rolls up. No
 * exceptions." Two reports now show cases above the firm — Case Reviews and Team Case
 * Studies — and §4.3 says the origin-path shape built for the first "is the shape any
 * later cross-firm report should reuse rather than reinvent". Two copies of this
 * mapping would drift, and nothing would say so: the same failure the shared
 * toolNameScan was extracted to stop.
 *
 * 🔴 THE CONSENT GATE IS NOT IMPLEMENTED HERE, AND MUST NOT BE. Callers choose which
 * set of cases to pass in, and only caseStore.listSharedWithMentor returns the
 * firm-manager-approved, anonymised copies. This module decorates; it never widens.
 * If a caller hands it raw firm cases, it will happily decorate those too — so the
 * caller is where the double opt-in is decided (§4.3: "the adviser decides whether a
 * case is visible to their firm; the firm manager separately decides whether it goes
 * further").
 */

const { originPathOf, labelOfScope } = require('./tierChain')
const { listFirms } = require('./firmsDirectory')

/**
 * Firm id -> display name, from the one place that reads the `firms` table.
 *
 * ⚠ IT NEVER THROWS, AND THAT IS A DELIBERATE DIFFERENCE FROM listFirms ITSELF,
 * which rejects in production so the adoption page cannot silently under-report a
 * platform. Here the directory is decoration on a report whose job is to show a
 * manager who needs help: losing the names should cost the reader a nice label, not
 * the whole feed. A firm with no name shows as its id — visibly an id, so a reader
 * can tell "we could not read the directory" from "this firm has no name", which is
 * the same distinction the directory's own contract insists on.
 *
 * @returns {Promise<Object.<string, string>>} id -> name, or {} when unreadable
 */
async function firmNameMap () {
  try {
    const rows = await listFirms()
    const map = {}
    ;(Array.isArray(rows) ? rows : []).forEach((f) => {
      if (f && f.id && f.name) { map[String(f.id)] = f.name }
    })
    return map
  } catch (err) {
    console.warn('[caseRollup] firm names unavailable, falling back to ids:', err.message)
    return {}
  }
}

/**
 * Attach the origin path to each case, as the viewer at `viewerScopeId` needs it.
 *
 * Element 0 is the level immediately below the viewer — what the screen GROUPS by
 * (rule 7) — and the remainder is the address inside that group, which is what lets
 * a manager act on it (§2, "who is failing so we can offer help"). A report that
 * shows something is wrong without showing where is an alarm with no address.
 *
 * @param {object[]} cases - already scope-filtered and consent-filtered by the caller
 * @param {string} viewerScopeId - the caller's scope, from the verified token
 * @param {Object.<string, string>} names - firm id -> display name
 * @returns {object[]} the same cases, each with `origin: [{scopeId, tier, label}]`
 */
function attachOrigin (cases, viewerScopeId, names) {
  const safeNames = names || {}
  return (Array.isArray(cases) ? cases : []).map(c => Object.assign({}, c, {
    origin: originPathOf(c.firmId, viewerScopeId).map(step => ({
      scopeId: step.scopeId,
      tier: step.tier,
      // A brand/country names itself inside its scope id; a firm's name comes from
      // the directory, and its id is the honest last resort.
      label: labelOfScope(step.scopeId) || safeNames[step.scopeId] || step.scopeId
    }))
  }))
}

/**
 * The whole upward journey in one call: name the firms, attach the origin.
 *
 * @param {object[]} cases - already scope- and consent-filtered by the caller
 * @param {string} viewerScopeId
 * @returns {Promise<object[]>}
 */
async function withOrigin (cases, viewerScopeId) {
  const names = await firmNameMap()
  return attachOrigin(cases, viewerScopeId, names)
}

module.exports = {
  firmNameMap,
  attachOrigin,
  withOrigin
}
