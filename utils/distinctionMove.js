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

module.exports = { buildMoveRequest }
