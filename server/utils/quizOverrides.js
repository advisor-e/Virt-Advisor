'use strict'

/**
 * Quiz override lookup (CB-12, design/COURSE-BUILDER-PLAN.md Phase 2).
 *
 * Hand-written quiz questions (data/course-quizzes.json — the firm's IP) used
 * to be matched on the exact AI-written session title, which the AI invents
 * fresh per course — so overrides never fired. Overrides are now matched, in
 * order, against the session title (documented legacy behaviour) and then each
 * of the session's resources. Resources are the reliable key: since CB-02 they
 * are guaranteed to be exact template-library titles. Matching is
 * case/whitespace-insensitive; keys starting with "_" are documentation
 * placeholders and never match.
 */

const { resolveTemplateName } = require('./resolveTemplateName')

function normalise (name) {
  return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase()
}

// Orphan bank keys are reported once per key per process — loud enough to be
// seen in the log, quiet enough not to repeat on every quiz request.
const _reportedOrphans = new Set()

/**
 * Resolve a name to its canonical template title, or null when the resolver
 * refuses (ambiguous / no match) or the template library cannot be read.
 *
 * Never throws: a missing or unreadable templates.json degrades this whole
 * layer back to plain exact-title matching rather than breaking quizzes.
 *
 * @param {string} name - a bank key or a session resource title
 * @param {Array} [templates] - injectable template list (tests)
 * @returns {{title: string, reason: null}|{title: null, reason: Object}}
 */
function canonicalise (name, templates) {
  try {
    const result = resolveTemplateName(name, templates)
    return result.ok ? { title: result.title, reason: null } : { title: null, reason: result }
  } catch (e) {
    return { title: null, reason: null }
  }
}

/**
 * Log a bank whose key matches no template — the failure mode this layer
 * exists to end. Before CB-34 pt 2 an orphan bank simply returned null and the
 * firm's authored questions were silently replaced by AI-invented ones.
 *
 * @param {string} key - the bank key as authored
 * @param {Object|null} reason - the resolver's refusal (reason + candidates)
 */
function reportOrphanBank (key, reason) {
  if (_reportedOrphans.has(key)) { return }
  _reportedOrphans.add(key)
  // eslint-disable-next-line no-console
  console.error(`[quizBanks] ORPHAN BANK: "${key}" matches no template in the library — its authored questions can never be used.`)
  const candidates = (reason && reason.candidates) || []
  if (candidates.length > 0) {
    // eslint-disable-next-line no-console
    console.error('[quizBanks]   closest titles: ' + candidates.map(c => `"${c.title}"`).join(', '))
  }
}

function matchSession (byKey, sessionContext) {
  if (byKey.size === 0) { return null }
  const candidates = [
    sessionContext.title,
    ...(Array.isArray(sessionContext.resources) ? sessionContext.resources : [])
  ]
  for (const candidate of candidates) {
    const hit = byKey.get(normalise(candidate))
    if (hit) { return hit }
  }
  return null
}

/**
 * Find the override question set for a session, if one is authored.
 *
 * @param {Object<string, Array>} overrides - the overrides map from course-quizzes.json
 * @param {{title?: string, resources?: Array<string>}} sessionContext - the session being quizzed
 * @returns {Array|null} the authored questions, or null to fall through to AI generation
 */
function findQuizOverride (overrides, sessionContext) {
  if (!overrides || typeof overrides !== 'object' || !sessionContext) { return null }

  const byKey = new Map()
  for (const [key, value] of Object.entries(overrides)) {
    if (!key.startsWith('_') && Array.isArray(value) && value.length > 0) {
      byKey.set(normalise(key), value)
    }
  }
  return matchSession(byKey, sessionContext)
}

/**
 * Find the CB-30 question bank for a session, if one is authored.
 *
 * Banks (course-quizzes.json `banks`) are keyed by exact template-library
 * title and matched by the same rules as overrides. Unlike an override
 * (served verbatim), a bank is SOURCE MATERIAL: its entries feed the
 * quiz-generate prompt and its model answers feed the grader.
 *
 * CB-34 pt 2 — near-miss tolerance. The repo's own banks are held to the exact
 * title by a locking test, but a bank authored by a firm manager (CB-31) is
 * saved at runtime with no such gate. A key one word off used to match nothing
 * and return null, so the firm's questions were silently swapped for
 * AI-invented ones. Both the bank key and the session's resources are now put
 * through `resolveTemplateName`, so they meet on the canonical template title;
 * a key that resolves to nothing is logged by name instead of vanishing.
 * Exact matching runs first and is unchanged, so no working lookup shifts.
 *
 * The session TITLE is deliberately excluded from the tolerant pass — it is
 * AI-written per course and would invite a confident bind to the wrong
 * template. Resources are the reliable key (CB-02 guarantees exact titles).
 *
 * @param {Object<string, {source: string, entries: Array}>} banks - the banks map from course-quizzes.json
 * @param {{title?: string, resources?: Array<string>}} sessionContext - the session being quizzed
 * @param {Array<{page: string, title: string}>} [templates] - injectable template list (tests)
 * @returns {{source: string, entries: Array}|null} the bank, or null when the session has none
 */
function findQuizBank (banks, sessionContext, templates) {
  if (!banks || typeof banks !== 'object' || !sessionContext) { return null }

  const byKey = new Map()
  const live = []
  for (const [key, value] of Object.entries(banks)) {
    if (!key.startsWith('_') && value && typeof value === 'object' && !Array.isArray(value) &&
        Array.isArray(value.entries) && value.entries.length > 0) {
      byKey.set(normalise(key), value)
      live.push([key, value])
    }
  }

  const exact = matchSession(byKey, sessionContext)
  if (exact) { return exact }

  // Tolerant pass — canonicalise every live bank key, then every resource.
  const byCanonical = new Map()
  for (const [key, value] of live) {
    const { title, reason } = canonicalise(key, templates)
    if (title === null) {
      reportOrphanBank(key, reason)
    } else if (!byCanonical.has(normalise(title))) {
      byCanonical.set(normalise(title), value)
    }
  }
  if (byCanonical.size === 0) { return null }

  const resources = Array.isArray(sessionContext.resources) ? sessionContext.resources : []
  for (const resource of resources) {
    const { title } = canonicalise(resource, templates)
    if (title !== null) {
      const hit = byCanonical.get(normalise(title))
      if (hit) { return hit }
    }
  }
  return null
}

module.exports = { findQuizOverride, findQuizBank }
