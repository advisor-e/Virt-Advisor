'use strict'

/**
 * Build the API request that moves a near-miss distinction into a target domain.
 *
 * The cross-domain near-miss bridge only ever surfaces the firm's OWN distinctions
 * (server/advisorEngine.js findNearMissDistinctions), in two cascade flavours — and
 * each "moves" differently:
 *
 *  - firm-own (integer id): the firm added this row. A move is just a partial update
 *    of its domain; the backend merges, so triggers/templates/boost are preserved.
 *  - firm-override (platform pd-N id): a platform row the firm edited. The platform
 *    move endpoint recreates it (platform base + the firm's edits) in the target
 *    domain as a firm-own row and switches the platform original off for the firm.
 *
 * Pure (no I/O) so it can be unit-tested; the caller passes the result to its api()
 * helper. encodeURIComponent guards the id in the path.
 *
 * @param {{id: (string|number), source: string}} nearMiss - a trace near-miss row
 * @param {string} targetDomain - the domain to move it into (the case's detected area)
 * @returns {{method: string, path: string, body: object}}
 */
function buildMoveRequest (nearMiss, targetDomain) {
  const hasId = nearMiss && nearMiss.id !== null && nearMiss.id !== undefined
  const id = encodeURIComponent(hasId ? nearMiss.id : '')
  if (nearMiss && nearMiss.source === 'firm-own') {
    return {
      method: 'PUT',
      path: `/api/firm-manager/distinctions/${id}`,
      body: { domain: targetDomain }
    }
  }
  // firm-override (the only other source the near-miss bridge surfaces)
  return {
    method: 'POST',
    path: `/api/firm-manager/distinctions/platform/${id}/move`,
    body: { targetDomain }
  }
}

/**
 * Build the API request that COPIES a near-miss distinction into a target domain,
 * leaving the original exactly where it is.
 *
 * Added for the Logic-Lab page (design/mockups/decision-logic-map-mockup.html),
 * whose near-miss rows offer Move / Copy / Leave. Copy is the answer when the
 * situation genuinely arises in BOTH areas — moving it would fix one and break
 * the other.
 *
 * There is no copy ENDPOINT and there should not be one: a copy is just a new
 * firm-own distinction, which POST /distinctions already creates, for both
 * cascade flavours. A firm-override's copy lands as a firm-own row carrying the
 * firm's edited wording — the same shape the platform move endpoint produces —
 * so the two actions stay consistent with each other.
 *
 * Pure (no I/O). The caller passes the result to its api() helper.
 *
 * @param {{description: string, triggers: string[], templates: string[], boost: number}} nearMiss
 * @param {string} targetDomain - the domain to copy it into (the detected area)
 * @returns {{method: string, path: string, body: object}}
 */
function buildCopyRequest (nearMiss, targetDomain) {
  const row = nearMiss || {}
  return {
    method: 'POST',
    path: '/api/firm-manager/distinctions',
    body: {
      domain: targetDomain,
      description: String(row.description || ''),
      triggers: Array.isArray(row.triggers) ? row.triggers : [],
      templates: Array.isArray(row.templates) ? row.templates : [],
      boost: Number(row.boost) || 5
    }
  }
}

module.exports = { buildMoveRequest, buildCopyRequest }
