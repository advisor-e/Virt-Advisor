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

function normalise (name) {
  return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase()
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
 * @param {Object<string, {source: string, entries: Array}>} banks - the banks map from course-quizzes.json
 * @param {{title?: string, resources?: Array<string>}} sessionContext - the session being quizzed
 * @returns {{source: string, entries: Array}|null} the bank, or null when the session has none
 */
function findQuizBank (banks, sessionContext) {
  if (!banks || typeof banks !== 'object' || !sessionContext) { return null }

  const byKey = new Map()
  for (const [key, value] of Object.entries(banks)) {
    if (!key.startsWith('_') && value && typeof value === 'object' && !Array.isArray(value) &&
        Array.isArray(value.entries) && value.entries.length > 0) {
      byKey.set(normalise(key), value)
    }
  }
  return matchSession(byKey, sessionContext)
}

module.exports = { findQuizOverride, findQuizBank }
