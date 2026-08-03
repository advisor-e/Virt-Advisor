'use strict'

/**
 * @file Input sanitisation utility — strips, caps, and type-coerces all
 * client-supplied fields before they reach a prompt or any downstream logic.
 * @module server/utils/sanitiseInput
 */

const MAX_QUERY = 4000
const MAX_HISTORY_MESSAGES = 20
const MAX_FIELD = 2000

/**
 * @typedef {Object} SanitisedInput
 * @property {string}   query               - The user's message, capped to MAX_QUERY chars
 * @property {string}   mode                - Interaction mode ('client', 'advisor', 'plan', etc.)
 * @property {string}   language            - BCP-47 language code (e.g. 'en')
 * @property {string}   languageName        - Human-readable language name (e.g. 'English')
 * @property {Array}    conversationHistory - Last MAX_HISTORY_MESSAGES messages, each capped to MAX_FIELD
 * @property {Object|null} advisorProfile   - Advisor profile fields, each capped to MAX_FIELD, or null
 *   (There is deliberately no case-summaries field. Past cases are read from the
 *   database on the verified JWT identity — advisorEngine.loadPromptCases —
 *   because a body-supplied list let any authenticated caller write the prompt's
 *   "real sessions saved by advisors in your firm" block. A `caseSummaries` key
 *   in the body is now simply an unknown key: dropped here, never read.)
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

  return {
    query,
    mode: String(mode).slice(0, 50),
    language: String(language).slice(0, 10),
    languageName: String(languageName).slice(0, 100),
    conversationHistory,
    advisorProfile,
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
  MAX_FIELD
}
