'use strict'

/**
 * Tier 2 (LOG-ONLY) — fabrication watch.
 *
 * Detects quoted, script-like wording in an AI response that does NOT trace back
 * to the firm reference material the model was given, nor to anything the advisor
 * said in the conversation — i.e. the model putting invented words in the firm's
 * mouth. This is the safety net behind the Tier 1 prompt guardrail
 * (see server/utils/promptGuardrail.js).
 *
 * IMPORTANT: this module ONLY observes and logs. It never mutates the response.
 * Enforcement (redacting an invented quote) is a deliberate, evidence-gated
 * follow-on once the logs show detection precision is high enough — the model
 * usually paraphrases real scripts rather than quoting them verbatim, so an
 * exact-match miss is NOT yet proof of fabrication. (design/ACTIONS.md Tier 2;
 * memory: feedback-never-invent-firm-ip.)
 */

// Curly quotes/apostrophes → straight, so smart-quoted AI output normalises the
// same way as the plain-text reference material.
const _SMART = /[‘’“”]/g

function _normalise (s) {
  return String(s || '')
    .replace(_SMART, c => (c === '‘' || c === '’') ? "'" : '"')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // drop punctuation so quoting differences don't matter
    .replace(/\s+/g, ' ')
    .trim()
}

// Minimum words for a quoted span to count as "script-like". Short quoted terms
// (e.g. "Personal Zone", "Start/Stop/Keep") are concept labels, not scripts, and
// would only create noise.
const MIN_QUOTE_WORDS = 5

/**
 * @param {string} responseText - the model's raw output
 * @param {string} sourceText   - all reference + conversation text the model had
 * @returns {string[]} quoted script-like spans found in responseText that do NOT
 *                      appear in sourceText (candidate fabrications)
 */
function detectFabricatedQuotes (responseText, sourceText) {
  const source = _normalise(sourceText)
  const text = String(responseText || '')
  const flagged = []

  // Match both straight ("...") and curly ("...") double-quoted spans.
  const patterns = [/"([^"]{1,400})"/g, /“([^”]{1,400})”/g]
  for (const re of patterns) {
    let m
    while ((m = re.exec(text)) !== null) {
      const raw = m[1].trim()
      if (raw.split(/\s+/).filter(Boolean).length < MIN_QUOTE_WORDS) { continue }
      const norm = _normalise(raw)
      if (norm && !source.includes(norm)) { flagged.push(raw) }
    }
  }
  return flagged
}

/**
 * Build the allowed-source text from the message array sent to the model
 * (everything EXCEPT the model's own prior assistant turns) and run detection.
 * @param {string} responseText
 * @param {Array<{role:string,content:string}>} sourceMessages
 * @returns {string[]}
 */
function findUnverifiedQuotes (responseText, sourceMessages) {
  const sourceText = (Array.isArray(sourceMessages) ? sourceMessages : [])
    .filter(msg => msg && msg.role !== 'assistant')
    .map(msg => msg.content || '')
    .join('\n')
  return detectFabricatedQuotes(responseText, sourceText)
}

/**
 * Detect and LOG (stderr) any unverified quoted wording. Returns the flagged
 * list so callers/tests can assert. Never alters the response.
 * @param {string} label - which path produced the response (for the log line)
 */
function logUnverifiedQuotes (label, responseText, sourceMessages) {
  const flagged = findUnverifiedQuotes(responseText, sourceMessages)
  if (flagged.length) {
    console.warn(`[fabrication-watch] ${label}: ${flagged.length} quoted span(s) not found in the firm reference or conversation — possible invented wording:`)
    flagged.forEach(s => console.warn(`[fabrication-watch]   • "${s}"`))
  }
  return flagged
}

module.exports = { detectFabricatedQuotes, findUnverifiedQuotes, logUnverifiedQuotes, MIN_QUOTE_WORDS }
