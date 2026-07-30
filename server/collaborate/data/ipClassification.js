'use strict'

/**
 * ipClassification — the IP-ownership classification seam (plan §6; T3 MVP).
 *
 * Every co-developable tool carries one of FOUR ownership tiers, and Tier-2
 * frameworks carry a LOCKED / non-derivable flag so that editing or re-listing
 * can't quietly downgrade them into shared or group IP. This module is the single
 * place that says, for an Advisor-e catalogue tool (by pageId), which tier + lock
 * applies.
 *
 * ▶ MASTER / HANDOVER TEAM: today the tier/lock come from a small in-code map (the
 *   DEMO set below) with an Advisory-owned default. Replace `classify` with a
 *   lookup against Advisory's real IP register, keeping the return shape identical
 *   — the marketplace create-guard (server/routes/people.js) and the tool picker
 *   (frontend) then need NO changes.
 *
 * HARD RULE (CLAUDE.md): the source catalogue JSON is NEVER edited. This is a
 * SEPARATE classification layer keyed by the catalogue's page ID — it reads the
 * id, it does not touch the master data.
 *
 * The four tiers (plan §6):
 *   1 Advisory-owned (base)  — Advisory retains full IP (default for catalogue tools)
 *   2 Protected / locked     — Advisory only; LOCKED / non-derivable; not listable
 *   3 Co-developed (shared)  — Advisory + the co-developers
 *   4 Group-owned (net-new)  — the group owns it (marketplace listings)
 */

const TIER = {
  1: 'Advisory-owned',
  2: 'Protected (locked)',
  3: 'Co-developed',
  4: 'Group-owned'
}

// DEMO classification — a couple of real catalogue tools marked as locked Tier-2
// frameworks so the lock enforcement is demonstrable in the show-home. The master
// team replaces this with Advisory's real IP register (see the file header). These
// IDs exist in the read-only snapshot; they are referenced here, never edited.
const LOCKED_DEMO = {
  '8-profit-levers': true,
  'advanced-sales-marketing-review': true
}

function tierLabel (tier) {
  return TIER[tier] || TIER[1]
}

/**
 * Classify an Advisor-e catalogue tool by its page ID.
 * @param {string} pageId the catalogue page ID (the listing's `link`)
 * @returns {Promise<{tier:number,label:string,locked:boolean}>}
 */
async function classify (pageId) {
  // SQL/API SEAM: SELECT tier, is_locked FROM ip_register WHERE page_id = ?
  const locked = !!LOCKED_DEMO[pageId]
  const tier = locked ? 2 : 1 // catalogue tools default to Advisory-owned (Tier 1)
  return { tier: tier, label: tierLabel(tier), locked: locked }
}

module.exports = { classify, tierLabel, TIER }
