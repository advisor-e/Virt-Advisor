'use strict'

/**
 * auditLog — the append-only activity / audit trail (plan §6; FEAT-AUDITLOG).
 *
 * Records WHO did WHAT, WHEN, to WHICH target — the tamper-evident evidence the
 * plan relies on for shared-IP claims and for security review (blocked cross-firm
 * reach, refused locked-IP listings). The store is APPEND-ONLY by design: this
 * module exposes `record` and `list` only — never update or delete — so history
 * cannot be quietly rewritten.
 *
 * ▶ MASTER / HANDOVER TEAM: today entries live in memory. To persist, replace the
 *   two bodies below with INSERT (append-only) / SELECT against the `audit_log`
 *   table in config/db-schema.sql, keeping the entry shape identical.
 *
 * PRIVACY: keep entries to IDs, action codes and short labels — NEVER PII or
 * secrets. READ ACCESS is admin/compliance-only; the read route is dev-open today
 * and must be gated behind FEAT-RBAC before production (see server/routes/people.js
 * getAuditLog + design/ACTIONS.md).
 *
 * Node 14.15 / CommonJS.
 */

const entries = []
let seq = 1

/**
 * Append one audit entry. Synchronous and non-throwing — auditing must never
 * break the action being audited.
 * @param {object} entry
 * @param {string} entry.actorId    who performed the action
 * @param {string} entry.action     dotted action code (e.g. 'listing.create')
 * @param {string} [entry.targetType] kind of target ('group' | 'advisor' | 'listing' | …)
 * @param {string} [entry.targetId]   the target's id
 * @param {object} [entry.meta]       small non-PII detail (ids/labels only)
 * @returns {object} the stored entry
 */
function record (entry) {
  // SQL SEAM: INSERT INTO audit_log (actor_id, action, target_type, target_id,
  //   meta_json, created_at) VALUES (?, …). APPEND-ONLY — never UPDATE/DELETE.
  const e = {
    id: 'a-' + (seq++),
    at: new Date().toISOString(),
    actorId: (entry && entry.actorId) || 'unknown',
    action: entry && entry.action,
    targetType: (entry && entry.targetType) || null,
    targetId: (entry && entry.targetId) || null,
    meta: (entry && entry.meta) || {}
  }
  entries.push(e)
  return e
}

/**
 * List audit entries, newest first, optionally filtered.
 * @param {object} [opts]
 * @param {string} [opts.actorId] only this actor
 * @param {string} [opts.action]  only this action code
 * @param {number} [opts.limit]   cap (default 100)
 * @returns {Promise<Array>} entries, most recent first
 */
async function list (opts) {
  // SQL SEAM: SELECT * FROM audit_log WHERE … ORDER BY created_at DESC LIMIT ?
  const o = opts || {}
  let rows = entries.slice()
  if (o.actorId) { rows = rows.filter(r => r.actorId === o.actorId) }
  if (o.action) { rows = rows.filter(r => r.action === o.action) }
  rows.reverse() // newest first (entries are appended in chronological order)
  const limit = o.limit && o.limit > 0 ? o.limit : 100
  return rows.slice(0, limit)
}

module.exports = { record, list }
