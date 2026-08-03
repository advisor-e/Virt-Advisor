'use strict'

/**
 * @file Input sanitisation utility — strips, caps, and type-coerces all
 * client-supplied fields before they reach a prompt or any downstream logic.
 * @module server/utils/sanitiseInput
 */

const MAX_QUERY = 4000
const MAX_HISTORY_MESSAGES = 20
const MAX_FIELD = 2000
const MAX_CASE_SUMMARY = 800
const MAX_CASES = 6

/**
 * @typedef {Object} SanitisedInput
 * @property {string}   query               - The user's message, capped to MAX_QUERY chars
 * @property {string}   mode                - Interaction mode ('client', 'advisor', 'plan', etc.)
 * @property {string}   language            - BCP-47 language code (e.g. 'en')
 * @property {string}   languageName        - Human-readable language name (e.g. 'English')
 * @property {Array}    conversationHistory - Last MAX_HISTORY_MESSAGES messages, each capped to MAX_FIELD
 * @property {Object|null} advisorProfile   - Advisor profile fields, each capped to MAX_FIELD, or null
 * @property {Array}    caseContext         - Up to MAX_CASES case summaries, each capped to MAX_CASE_SUMMARY.
 *   ACCEPTED BUT IGNORED — the advisor engine reads past cases from the database
 *   using the verified JWT identity (advisorEngine.loadPromptCases), because a
 *   body-supplied list let any authenticated caller write the prompt's "real
 *   sessions saved by advisors in your firm" block. Kept so an older frontend
 *   still gets a 200; removed in a later release.
 * @property {Object}   conversationState   - Raw conversation state object
 * @property {Array|undefined} orgTemplateIds - Organisation template ID filter list
 */

/**
 * Sanitises and caps all client-supplied request body fields.
 * Prevents prompt injection and token cost inflation from oversized payloads.
 * Must be called on every inbound request body before any prompt construction.
 *
 * @param {*} raw - Parsed JSON from request body
 * @returns {SanitisedInput|null} Sanitised fields, or null if input is not a plain object
 */
function sanitiseInput (raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null
  }

  const {
    query: rawQuery,
    mode = 'client',
    orgTemplateIds,
    conversationHistory: rawHistory = [],
    advisorProfile: rawProfile,
    language = 'en',
    languageName = 'English',
    caseSummaries: rawCases = [],
    sessionId: rawSessionId,
    advisorId: rawAdvisorId,
    firmId: rawFirmId,
    clientId: rawClientId
  } = raw

  const query = typeof rawQuery === 'string' ? rawQuery.slice(0, MAX_QUERY) : ''

  const conversationHistory = Array.isArray(rawHistory)
    ? rawHistory.slice(-MAX_HISTORY_MESSAGES).map(m => ({
      role: ['user', 'assistant'].includes(String(m.role)) ? m.role : 'user',
      content: typeof m.content === 'string' ? m.content.slice(0, MAX_FIELD) : ''
    }))
    : []

  const advisorProfile = rawProfile && typeof rawProfile === 'object' && !Array.isArray(rawProfile)
    ? {
      advisorRole: String(rawProfile.advisorRole || '').slice(0, MAX_FIELD),
      experience: String(rawProfile.experience || '').slice(0, MAX_FIELD),
      clientDemographic: String(rawProfile.clientDemographic || '').slice(0, MAX_FIELD),
      enjoyment: String(rawProfile.enjoyment || '').slice(0, MAX_FIELD),
      technicalStrengths: String(rawProfile.technicalStrengths || '').slice(0, MAX_FIELD),
      toolsComfort: String(rawProfile.toolsComfort || '').slice(0, MAX_FIELD),
      notes: String(rawProfile.notes || '').slice(0, MAX_FIELD)
    }
    : null

  const caseContext = Array.isArray(rawCases)
    ? rawCases.slice(0, MAX_CASES).map(c => ({
      title: String(c.title || '').slice(0, 200),
      mode: String(c.mode || '').slice(0, 20),
      visibility: String(c.visibility || '').slice(0, 20),
      summary: String(c.summary || '').slice(0, MAX_CASE_SUMMARY),
      date: String(c.date || c.createdAt || '').slice(0, 30),
      review: c.review && typeof c.review === 'object'
        ? {
          wentWell: String(c.review.wentWell || '').slice(0, 500),
          wentLess: String(c.review.wentLess || '').slice(0, 500),
          changesRecommended: String(c.review.changesRecommended || '').slice(0, 500)
        }
        : null
    }))
    : []

  return {
    query,
    mode: String(mode).slice(0, 50),
    language: String(language).slice(0, 10),
    languageName: String(languageName).slice(0, 100),
    conversationHistory,
    advisorProfile,
    caseContext,
    sessionId: rawSessionId ? String(rawSessionId).slice(0, 64) : null,
    // Client-register id from the session's client step (design 2026-07-14).
    // An id only — the engine must still firm-validate it (clientStore.getById)
    // before reading any history against it.
    clientId: rawClientId ? String(rawClientId).slice(0, 64) : null,
    orgTemplateIds,
    advisorId: rawAdvisorId ? String(rawAdvisorId).slice(0, 64) : null,
    firmId: rawFirmId ? String(rawFirmId).slice(0, 64) : null
  }
}

module.exports = {
  sanitiseInput,
  MAX_QUERY,
  MAX_HISTORY_MESSAGES,
  MAX_FIELD,
  MAX_CASE_SUMMARY,
  MAX_CASES
}
