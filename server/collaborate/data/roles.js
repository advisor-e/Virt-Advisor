'use strict'

/**
 * roles — the role/tier resolver. The SINGLE seam that answers the two questions
 * used everywhere management is gated: "what tier is this advisor?" (resolveTier)
 * and "may this manager see/act on that advisor?" (canManage). Implements the
 * Q-ROLES decision (owner, 2026-07-06; plan §13, HANDOVER §8.5).
 *
 * HYBRID SOURCE OF TRUTH (Q-ROLES):
 *   • Firm tier       ← the advisor's `firm`    (= Advisory `branch`,          Q3/Q6)
 *   • Group/country   ← the advisor's `country` (= Advisory `country-address`, Q3)
 *   • Manager/Mentor DESIGNATIONS ← the Advisory JWT `role` claim
 *       (config/integration.js → AUTH.*Role) in production; until that is wired,
 *       from the interim local OVERRIDE table below + the legacy `firmManager`
 *       seed flag. Unknown ⇒ 'advisor'.
 *
 * SECURITY (this is an authorization surface — handle with care):
 *   • resolveTier + canManage are PURE and are re-evaluated server-side on every
 *     request (never trusted from the client) — the same discipline the view-as
 *     gate already uses (the button is never the gate).
 *   • The override table is INTERIM and admin-only: it must never let a user
 *     promote themselves. Only the Mentor/super-admin writes it (enforced where it
 *     is set, not here). In the mock it is seeded with one demo country manager.
 *   • This is a SEAM: demonstrable on mock data, NOT a substitute for the real
 *     Advisory JWT role the master team still wires (Q-ROLES "still master-team").
 */

const { AUTH } = require('../../../config/collaborate/integration')

// Canonical tiers, highest authority first. Index 0 = top of the tree (§5).
const TIERS = ['mentor', 'global_manager', 'group_manager', 'firm_manager', 'advisor', 'client']
// The tiers that manage people below them (used to gate the console / view-as).
const MANAGER_TIERS = ['mentor', 'global_manager', 'group_manager', 'firm_manager']

// Interim local override table: advisorId → canonical tier. Augments/overrides the
// JWT role until AUTH.roleClaim is wired. Admin-set only (no self-promotion).
const ROLE_OVERRIDES = {}

/**
 * Set an interim role override. This is the admin-only mechanism (the
 * Mentor/super-admin path) — callers must gate it; it does not self-authorise.
 * @param {string} advisorId - the advisor to designate
 * @param {string} tier - one of TIERS (ignored if not a known tier)
 */
function setOverride (advisorId, tier) {
  if (TIERS.indexOf(tier) === -1) { return }
  ROLE_OVERRIDES[advisorId] = tier
}

/**
 * Map an Advisory JWT `role` value (config/integration.js → AUTH) to a canonical
 * tier. `platform_admin` ⇒ mentor (top of tree / sees all); the firm-manager role
 * ⇒ firm_manager. Returns null when the role is absent/unrecognised, so the caller
 * can fall back to the override table / seed flag.
 * @param {string} role - the raw role claim value
 * @returns {string|null} a value from TIERS, or null
 */
function tierFromRoleClaim (role) {
  if (!role) { return null }
  if (role === AUTH.mentorRole || role === AUTH.adminRole) { return 'mentor' }
  if (role === AUTH.managerRole) { return 'firm_manager' }
  return null
}

/**
 * Resolve an advisor's canonical tier. Precedence (mock-first, production-ready):
 *   1. explicit `tier` on the advisor record (seed convenience)
 *   2. the interim ROLE_OVERRIDES table (admin-set)
 *   3. the Advisory JWT `role` claim (production path; read from `identity`)
 *   4. the legacy `firmManager` seed flag ⇒ 'firm_manager'
 *   5. default ⇒ 'advisor'
 * @param {object} advisor - the advisor record (may carry `tier` / `firmManager`)
 * @param {object} [identity] - the auth identity (may carry the `role` claim)
 * @returns {string} a value from TIERS
 */
function resolveTier (advisor, identity) {
  if (!advisor) { return 'advisor' }
  if (advisor.tier && TIERS.indexOf(advisor.tier) !== -1) { return advisor.tier }
  if (ROLE_OVERRIDES[advisor.id]) { return ROLE_OVERRIDES[advisor.id] }
  const fromClaim = tierFromRoleClaim(identity && identity.role)
  if (fromClaim) { return fromClaim }
  if (advisor.firmManager) { return 'firm_manager' }
  return 'advisor'
}

/**
 * Is this tier a managing tier (i.e. may it have people below it)?
 * @param {string} tier - a value from TIERS
 * @returns {boolean}
 */
function isManagerTier (tier) {
  return MANAGER_TIERS.indexOf(tier) !== -1
}

/**
 * May `manager` see/act on `target`, per the resolved hierarchy + scope? The tree
 * is Global group (brand) → Country → Firm (branch) → Advisor (Q-ROLES / plan §5),
 * so a manager reaches everyone AT OR BELOW them WITHIN their own branch:
 *   • mentor         → everyone
 *   • global_manager → same global group / brand (all its countries + branches)
 *   • group_manager  → same brand AND same country (head of a country; all its branches)
 *   • firm_manager   → same firm / branch (= office)
 *   • advisor / client → no-one
 * (Cross-org posture is a SEPARATE gate — this is management scope, not outreach.)
 * @param {object} manager - the acting advisor record
 * @param {object} target - the advisor being managed
 * @param {object} [identity] - the manager's auth identity (for the role claim)
 * @returns {boolean}
 */
function canManage (manager, target, identity) {
  if (!manager || !target) { return false }
  const tier = resolveTier(manager, identity)
  if (tier === 'mentor') { return true }
  if (tier === 'global_manager') { return !!manager.globalGroup && manager.globalGroup === target.globalGroup }
  if (tier === 'group_manager') {
    return !!manager.globalGroup && manager.globalGroup === target.globalGroup &&
      !!manager.country && manager.country === target.country
  }
  if (tier === 'firm_manager') { return !!manager.firm && manager.firm === target.firm }
  return false
}

module.exports = {
  TIERS,
  MANAGER_TIERS,
  ROLE_OVERRIDES,
  setOverride,
  tierFromRoleClaim,
  resolveTier,
  isManagerTier,
  canManage
}
