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
 * firm_manager, so no role value produces `global_manager` or `group_manager`. That
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
 * Canonical tier names, highest authority first. Deliberately the same strings as
 * roles.js TIERS so the two models can never drift into disagreeing about what a
 * tier is called.
 */
const TIERS = ['mentor', 'global_manager', 'group_manager', 'firm_manager']

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
  if (typeof scopeId === 'string' && scopeId.indexOf(GLOBAL_PREFIX) === 0) { return 'global_manager' }
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
  scopeChain
}
