'use strict'

/**
 * @file Who is the level above me? The one seam every cascading block asks.
 * @module server/utils/tierChain
 *
 * design/MENTOR-TIER-CHAIN-PLAN.md. Until now four call sites each hardcoded the
 * same sentence — "the level above me is the platform scope" — which is what made
 * the cascade exactly two levels deep. This module replaces that sentence with a
 * question, so the mentor -> global -> group -> firm chain the owner asked for on
 * 2026-08-10 is expressed ONCE instead of four times.
 *
 * The hierarchy itself is not invented here. It is the tree already modelled in
 * server/collaborate/data/roles.js (Q-ROLES, owner 2026-07-06):
 *
 *     Mentor -> Global group (brand) -> Country -> Firm (branch) -> Advisor
 *
 * 🔴 THE SAFETY PROPERTY THIS FILE RESTS ON. With no membership data — which is
 * today, because the `firms` table has no country or group column and the master
 * team has not supplied one — `parentScopeOf(aFirmId)` returns PLATFORM_SCOPE, i.e.
 * EXACTLY what the four call sites hardcoded before. The fold stays two levels deep
 * and every pre-existing test passes unmodified. That is the proof this change is
 * behaviour-preserving, and it is a test run rather than a claim.
 *
 * It fails toward today's behaviour, never toward a guess: a firm whose group we do
 * not know inherits the mentor's content, which is what it does now. It never
 * invents a middle tier to slot the firm into.
 *
 * ⚠ WHAT IS STILL MISSING, AND WHOSE IT IS. A real group or global manager cannot
 * log in: roles.js maps only `platform_admin` -> mentor and `firm_manager` ->
 * firm_manager, so no role value produces `global_group_manager` or `group_manager`. That
 * role is issued by Advisor-e's login, not by us. This module is ready for it; it
 * cannot supply it. See the plan §2.
 *
 * ⚠ NOT THE `group` TABLE. config/db-schema.sql has a `group` table — it is a
 * Special Interest Group (group_member, group_tag, marketplace_listing), a social
 * group in Collaborate. It is NOT a management tier and must never be read as one.
 */

const { PLATFORM_SCOPE, isPlatformScope } = require('./platformScope')

/**
 * Scope-id prefixes for the two middle tiers. The double underscores are what make
 * a collision with a real Advisor-e firm id impossible — the same reasoning that
 * protects `__platform__`, and the same reason each must exist as a row in `firms`
 * (firm_framework_versions.firm_id is foreign-keyed to it).
 */
const GLOBAL_PREFIX = '__global__:'
const GROUP_PREFIX = '__group__:'

/** The separator inside a composed scope id. A name containing it is refused. */
const SEP = ':'

/**
 * The four MANAGING tiers, highest authority first — the same strings as roles.js
 * TIERS, which is the canonical vocabulary (mentor · global_group_manager ·
 * group_manager · firm_manager · advisor · business_entity).
 *
 * 🔴 THIS COMMENT USED TO SAY THE TWO LISTS "CAN NEVER DRIFT", AND NOTHING CHECKED
 * IT. They are two literals in two files; only a test can hold them together.
 * `tests/unit/tierVocabulary.test.js` now does, and also fails the build if either
 * superseded spelling reappears anywhere in the source — the shortened global-group
 * name, or a tier named after one person instead of the entity. The old spellings
 * are not written out here on purpose: that file is the only place allowed to name
 * them, or the scan would have to exempt whatever quoted them. Renaming a tier means
 * changing the vocabulary in roles.js — never inventing a variant here.
 */
const TIERS = ['mentor', 'global_group_manager', 'group_manager', 'firm_manager']

/**
 * Firm membership: firmId -> { globalGroup, country }.
 *
 * EMPTY, and empty is correct today — the master team has not supplied the data
 * (plan §2). It is deliberately not seeded with demo values: a stand-in here would
 * make the middle tiers appear to work while routing real firms' content into
 * fictional groups, which is the failure family that has already cost this codebase
 * twice (the dev fallback that silently absorbed a foreign-key rejection, session
 * 37; the firms-table read that has still never met real data, session 38).
 *
 * @type {Object.<string, {globalGroup: string, country: string}>}
 */
let membership = {}

/**
 * Refuse a name that would make a scope id ambiguous.
 *
 * Scope ids are composed by joining on ':', so a globalGroup or country containing
 * ':' would produce an id that cannot be taken apart again — and taking it apart is
 * how parentScopeOf finds the level above. Throwing is right rather than escaping:
 * this data arrives from the master team, and a name we cannot represent is
 * something they must know about, not something we quietly mangle.
 *
 * @param {string} value
 * @param {string} field - for the error message
 * @returns {string} the value, unchanged
 * @throws {Error} when the value is empty or contains the separator
 */
function assertNameable (value, field) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`tierChain: ${field} must be a non-empty string`)
  }
  if (value.includes(SEP)) {
    throw new Error(`tierChain: ${field} must not contain '${SEP}' (got '${value}')`)
  }
  return value
}

/**
 * The scope id for a global group (brand).
 * @param {string} globalGroup
 * @returns {string}
 */
function globalScopeId (globalGroup) {
  return GLOBAL_PREFIX + assertNameable(globalGroup, 'globalGroup')
}

/**
 * The scope id for a country group within a brand.
 * @param {string} globalGroup
 * @param {string} country
 * @returns {string}
 */
function groupScopeId (globalGroup, country) {
  return GROUP_PREFIX + assertNameable(globalGroup, 'globalGroup') +
    SEP + assertNameable(country, 'country')
}

/**
 * Replace the firm membership map.
 *
 * ADMIN / SEED ONLY, and it does not self-authorise — the caller gates it, exactly
 * as roles.setOverride does. Nothing in a request path may call this: membership is
 * platform data, and letting a request write it would let one firm re-parent itself
 * under another's group and read that group's content.
 *
 * @param {Object.<string, {globalGroup: string, country: string}>} map
 * @returns {void}
 */
function setFirmMembership (map) {
  membership = (map && typeof map === 'object' && !Array.isArray(map)) ? map : {}
}

/**
 * The membership currently in force. Returned as a copy so a caller cannot mutate
 * the map in place and re-parent a firm without going through setFirmMembership.
 * @returns {Object.<string, {globalGroup: string, country: string}>}
 */
function getFirmMembership () {
  return { ...membership }
}

/**
 * Which tier does a scope id belong to?
 * @param {string} scopeId
 * @returns {string} one of TIERS
 */
function tierOfScope (scopeId) {
  if (isPlatformScope(scopeId)) { return 'mentor' }
  if (typeof scopeId === 'string' && scopeId.indexOf(GLOBAL_PREFIX) === 0) { return 'global_group_manager' }
  if (typeof scopeId === 'string' && scopeId.indexOf(GROUP_PREFIX) === 0) { return 'group_manager' }
  return 'firm_manager'
}

/**
 * The scope one level up, or null at the top of the tree.
 *
 * A firm with no known membership resolves to PLATFORM_SCOPE — today's hardcoded
 * behaviour, preserved exactly (see the safety property in this file's header).
 *
 * @param {string|null} scopeId - a firm id, or a reserved tier scope id
 * @returns {string|null} the parent scope id, or null when there is nothing above
 */
function parentScopeOf (scopeId) {
  if (!scopeId || typeof scopeId !== 'string') { return null }

  // The mentor is the origin. Nothing is above it, and that is what ends every
  // recursion in the calling blocks.
  if (isPlatformScope(scopeId)) { return null }

  if (scopeId.indexOf(GLOBAL_PREFIX) === 0) { return PLATFORM_SCOPE }

  if (scopeId.indexOf(GROUP_PREFIX) === 0) {
    const rest = scopeId.slice(GROUP_PREFIX.length)
    const cut = rest.indexOf(SEP)
    // A malformed group id (no country part) has no global group to name, so the
    // honest answer is the mentor rather than a guessed brand.
    if (cut <= 0) { return PLATFORM_SCOPE }
    return GLOBAL_PREFIX + rest.slice(0, cut)
  }

  // A real firm. Its parent depends on what we know about it, and knowing nothing
  // is the normal case today.
  const m = membership[scopeId]
  if (m && m.globalGroup && m.country) { return groupScopeId(m.globalGroup, m.country) }
  if (m && m.globalGroup) { return globalScopeId(m.globalGroup) }
  return PLATFORM_SCOPE
}

/**
 * Is this tier still waiting for the master team to say which firms are its own?
 *
 * 🔴 IT SEPARATES TWO EMPTIES THAT LOOK IDENTICAL ON SCREEN. A middle-tier report
 * returns no rows for two completely different reasons: nobody beneath this manager
 * has used the app yet, or NOBODY HAS BEEN PUT BENEATH THIS MANAGER AT ALL. The
 * first is news; the second is an unfinished integration. Shown as the same blank
 * panel, the second reads as "nobody is using it" — a false and discouraging
 * statement about a customer's own firms, and the exact failure the standing rule
 * in COLLABORATE-MERGE-PLAN.md §4.3 exists to prevent: "Where a stub is the honest
 * answer, it says so on screen rather than showing an empty roll-up that looks like
 * real data with nothing in it."
 *
 * ⚠ THE MENTOR IS NEVER AWAITING ANYTHING, and that is not a special case — it is
 * the same fact isWithinScope rests on. Every firm chains up to the platform scope
 * whether or not its membership is known, so the mentor always has firms beneath
 * it, and an empty mentor report genuinely means no activity. Answering true here
 * would put a "not connected yet" banner on three screens that are connected.
 *
 * ⚠ SO IS A FIRM. A firm manager is the bottom of the chain and has no firms
 * beneath them; their reports are about their own advisers, and this question does
 * not apply.
 *
 * @param {string} scopeId - the caller's resolved scope (req.firmId after firmAuth)
 * @returns {boolean} true only for a middle tier with no firm mapped beneath it
 */
function isAwaitingFirms (scopeId) {
  const tier = tierOfScope(scopeId)
  if (tier !== 'global_group_manager' && tier !== 'group_manager') { return false }
  return firmsUnderScope(scopeId).length === 0
}

/**
 * Every KNOWN firm sitting beneath a scope, from the membership map.
 *
 * ⚠ IT ANSWERS FROM MEMBERSHIP, NOT FROM THE FIRMS TABLE, so it lists what we have
 * been TOLD about rather than what exists. Today that is nothing, for every scope
 * including the platform's — which is why isAwaitingFirms above asks the tier
 * first and never asks this about the mentor.
 *
 * @param {string} scopeId
 * @returns {string[]} firm ids, or [] when none are mapped there
 */
function firmsUnderScope (scopeId) {
  if (!scopeId || typeof scopeId !== 'string') { return [] }
  return Object.keys(membership).filter(firmId => isWithinScope(firmId, scopeId))
}

/**
 * Does a firm sit AT or BENEATH a managing tier's scope? The question every
 * cross-firm report has to answer before it shows a row.
 *
 * 🔴 WHY THIS IS ONE FUNCTION AND NOT THREE `if`s IN THREE ROUTES. Case Reviews,
 * Adoption and the Logic Lab Report each read across firms, and each would
 * otherwise write its own version of "is this one mine". That is the repeated
 * sentence this whole module exists to delete — four call sites hardcoding "the
 * level above me is the platform scope" is what made the cascade two levels deep.
 * A fourth report added later asks the same question here or it does not ship.
 *
 * 🔴 THE SAFETY PROPERTY, AND IT IS THE SAME ONE AS parentScopeOf. It is expressed
 * with scopeChain rather than with membership directly, which means:
 *   - the MENTOR (`__platform__`) answers TRUE for every firm, because a firm with
 *     no known membership chains up to the platform. The mentor's three reports are
 *     therefore byte-for-byte what they were, and the pre-existing tests prove it
 *     rather than being edited to agree with it.
 *   - a MIDDLE TIER with no membership answers FALSE for every firm. It sees
 *     nothing — never everything. Guessing the other way would put one brand's
 *     cases in another brand's screen, which is precisely what the owner's ruling
 *     of 2026-08-11 forbids: "it needs to stay in their channel — only firms data
 *     that are member of that group (country) goes to that group manager."
 *
 * Empty is the honest answer while the master team has not said which firms sit
 * where. Saying so on screen is a separate piece of work; returning nothing is this
 * one's job.
 *
 * @param {string} firmId - a real firm id, from a data row
 * @param {string} scopeId - the caller's resolved scope (req.firmId after firmAuth)
 * @returns {boolean}
 */
function isWithinScope (firmId, scopeId) {
  if (!firmId || typeof firmId !== 'string') { return false }
  if (!scopeId || typeof scopeId !== 'string') { return false }
  return scopeChain(firmId).includes(scopeId)
}

/**
 * WHERE DID THIS ROW COME FROM, as the viewer needs to hear it — the path from the
 * level immediately below them down to the firm itself.
 *
 * 🔴 WHY A PATH AND NOT A LABEL. This app exists so that managers can SEE WHO NEEDS
 * HELP (ADVISOR-E-DESIGN-LOGIC.md §2: "who is failing so we can offer help"). A
 * cross-firm row with no origin is an alarm with no address — the manager learns
 * something is wrong and cannot act. But rule 7 (§4.1) is equally firm: each level
 * sees THE LEVEL IMMEDIATELY BELOW IT, summarised, not a flat roster of the bottom.
 *
 * A path satisfies both, and the two rules stop competing:
 *   - element 0 is the level immediately below the viewer — what the screen GROUPS by;
 *   - the remainder is the address inside that group, which is what makes the group
 *     worth opening.
 *
 * So a group manager gets [firm]; a global manager gets [group, firm]; the mentor
 * gets [global, group, firm]. One function, no per-tier branch, nothing hidden from
 * a manager about their own people.
 *
 * 🔴 AND IT DEEPENS BY ITSELF. Expressed with scopeChain, so today — no membership
 * data — every firm sits directly beneath the mentor and the path is exactly [firm].
 * The mentor sees firm names now because the firm genuinely IS the level below it
 * now. The day the master team supplies the mapping, the same code returns three
 * steps and the screen groups by global group. No second change, and no rule to revisit.
 *
 * ⚠ A VIEWER OUTSIDE THE FIRM'S CHAIN GETS [] — not a guess and not the whole path.
 * Callers already filter with isWithinScope, so this is the second lock on the same
 * door rather than the first: an unscoped row cannot acquire an address here.
 *
 * @param {string} firmId - the firm a data row belongs to
 * @param {string} viewerScopeId - the caller's resolved scope (req.firmId)
 * @returns {Array<{scopeId: string, tier: string}>} nearest level below the viewer
 *   first, the firm last; [] when the firm is not beneath this viewer
 */
function originPathOf (firmId, viewerScopeId) {
  if (!firmId || typeof firmId !== 'string') { return [] }
  if (!viewerScopeId || typeof viewerScopeId !== 'string') { return [] }

  const chain = scopeChain(firmId)
  const at = chain.indexOf(viewerScopeId)
  if (at === -1) { return [] }

  return chain.slice(at + 1).map(scopeId => ({ scopeId, tier: tierOfScope(scopeId) }))
}

/**
 * The display name carried INSIDE a reserved scope id — the brand for a global
 * scope, the country for a group scope.
 *
 * 🔴 A FIRM RETURNS null, DELIBERATELY. A firm's name is not in its id and is not
 * ours to invent; it lives in the `firms` table and is read through
 * firmsDirectory.listFirms(). Returning the id dressed as a name here is exactly the
 * fabrication this codebase has been bitten by before, and it would also give the
 * same firm two spellings on two tabs of one hub — which is already true between
 * Adoption (real names) and the Logic-Lab Report (raw ids), and is not to be
 * repeated a third time. The caller substitutes a real name, or shows the id
 * visibly as an id.
 *
 * @param {string} scopeId
 * @returns {string|null} the brand or country name, or null for a firm/platform scope
 */
function labelOfScope (scopeId) {
  if (!scopeId || typeof scopeId !== 'string') { return null }

  if (scopeId.indexOf(GLOBAL_PREFIX) === 0) {
    return scopeId.slice(GLOBAL_PREFIX.length) || null
  }

  if (scopeId.indexOf(GROUP_PREFIX) === 0) {
    const rest = scopeId.slice(GROUP_PREFIX.length)
    const cut = rest.indexOf(SEP)
    // A malformed group id names no country; the honest answer is "we cannot say",
    // matching parentScopeOf's refusal to guess a brand from the same input.
    return cut > 0 ? (rest.slice(cut + 1) || null) : null
  }

  return null
}

/**
 * The full fold order for a scope: the top of the tree first, the scope itself last.
 *
 * Callers that fold layer-over-layer (firmOverlay.loadFirmConfig) walk this in
 * order; callers that recurse upward (staircaseConfig, quizConfig) use
 * parentScopeOf directly and never need it.
 *
 * A cycle is impossible by construction — each step strictly climbs a fixed
 * four-deep tree — but the guard is kept anyway, because the cost of being wrong is
 * a hung request rather than a wrong answer, and membership arrives from outside.
 *
 * @param {string|null} scopeId
 * @returns {string[]} [top … scopeId], or [] when there is no scope
 */
function scopeChain (scopeId) {
  if (!scopeId || typeof scopeId !== 'string') { return [] }

  const chain = [scopeId]
  const seen = new Set([scopeId])
  let cursor = parentScopeOf(scopeId)

  while (cursor && !seen.has(cursor) && chain.length <= TIERS.length) {
    chain.unshift(cursor)
    seen.add(cursor)
    cursor = parentScopeOf(cursor)
  }

  return chain
}

module.exports = {
  TIERS,
  GLOBAL_PREFIX,
  GROUP_PREFIX,
  globalScopeId,
  groupScopeId,
  setFirmMembership,
  getFirmMembership,
  tierOfScope,
  parentScopeOf,
  scopeChain,
  isWithinScope,
  firmsUnderScope,
  isAwaitingFirms,
  originPathOf,
  labelOfScope
}
