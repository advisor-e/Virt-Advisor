'use strict'

/**
 * Tier 2 — fabrication watch (detection + visible-correction enforcement).
 *
 * Detects quoted, script-like wording in an AI response that does NOT trace back
 * to the firm reference material the model was given, nor to anything the advisor
 * said in the conversation — i.e. the model putting invented words in the firm's
 * mouth. This is the safety net behind the Tier 1 prompt guardrail
 * (see server/utils/promptGuardrail.js).
 *
 * Detection shipped log-only 2026-06-22 pending precision evidence. The gate was
 * met 2026-07-16 (live Learn threads: every flagged span was a genuinely invented
 * script line, zero false positives), and enforcement shipped 2026-07-18 with
 * Mike's approved wording: responses STREAM, so an invented quote can't be
 * unprinted — instead a visible correction note is APPENDED to the same reply
 * (buildCorrectionNote / appendCorrectionNote below). The note names a document
 * only when that is safe (see the doc-name rules below); on any ambiguity it
 * falls back to the generic wording, so the correction itself can never
 * misattribute. (design/ACTIONS.md Tier 2; memory: feedback-never-invent-firm-ip.)
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

// ── Enforcement (wording approved by Mike 2026-07-18) ──────────────────────

/**
 * Harvest "known document" names from the source text the model was given.
 * A known document is a multi-word Title-Case phrase our own reference
 * material refers to as "the X document" (e.g. "the EOY Scripts Only
 * document"). Names come from the SOURCE text only — neither the AI nor the
 * client can inject one into the correction note.
 * @param {string} sourceText
 * @returns {string[]} distinct names, e.g. ['EOY Scripts Only']
 */
function _knownDocNames (sourceText) {
  const re = /\bthe\s+((?:[A-Z][A-Za-z0-9&.'-]*)(?:\s+[A-Z][A-Za-z0-9&.'-]*){1,7})\s+document\b/g
  const names = new Set()
  let m
  while ((m = re.exec(String(sourceText || ''))) !== null) {
    names.add(m[1])
  }
  return [...names]
}

// A document name only counts as "what the AI misattributed" when it appears
// within this many characters of a flagged quote — a name mentioned elsewhere
// in a long answer is not evidence of attribution.
const NEAR_CHARS = 500

/**
 * Build the advisor-facing correction note for a set of flagged spans.
 * The document-named variant is used ONLY when exactly one known document
 * (harvested from our own reference text) is mentioned near a flagged span;
 * any ambiguity — zero or several candidates — falls back to the generic
 * variant, so the note can never itself misname a source.
 *
 * @param {string[]} flagged - spans from findUnverifiedQuotes/logUnverifiedQuotes
 * @param {string} responseText - the model's raw output the spans came from
 * @param {Array<{role:string,content:string}>} sourceMessages - what the model was given
 * @returns {string|null} the note, or null when nothing was flagged
 */
function buildCorrectionNote (flagged, responseText, sourceMessages) {
  if (!Array.isArray(flagged) || flagged.length === 0) { return null }
  const text = String(responseText || '')
  const lower = text.toLowerCase()
  const sourceText = (Array.isArray(sourceMessages) ? sourceMessages : [])
    .filter(msg => msg && msg.role !== 'assistant')
    .map(msg => msg.content || '')
    .join('\n')

  const spanAt = flagged.map(s => text.indexOf(s)).filter(i => i >= 0)
  const named = new Set()
  for (const doc of _knownDocNames(sourceText)) {
    const needle = doc.toLowerCase()
    let idx = lower.indexOf(needle)
    while (idx >= 0) {
      if (spanAt.some(at => Math.abs(at - idx) <= NEAR_CHARS)) { named.add(doc); break }
      idx = lower.indexOf(needle, idx + 1)
    }
  }

  if (named.size === 1) {
    const doc = [...named][0]
    return `⚠️ Correction: the script above is an illustration I wrote — it is **not** the actual wording of *${doc}*. The firm's real wording is in *${doc}*, available in Advisor-e.`
  }
  return '⚠️ Correction: the quoted wording above is an illustration I wrote — it is not taken from the firm\'s materials.'
}

/**
 * Append the correction note to the display text when spans were flagged;
 * return the text untouched otherwise. This is the single call-site helper —
 * the divider keeps the note visually separate from the answer and is plain
 * markdown, so the locked rendering pipeline is unaffected.
 *
 * @param {string} displayText - the post-processed text about to be sent
 * @param {string[]} flagged - result of logUnverifiedQuotes for this response
 * @param {string} responseText - the model's raw output
 * @param {Array<{role:string,content:string}>} sourceMessages
 * @returns {string}
 */
function appendCorrectionNote (displayText, flagged, responseText, sourceMessages) {
  const note = buildCorrectionNote(flagged, responseText, sourceMessages)
  return note ? `${displayText}\n\n---\n\n${note}` : displayText
}

module.exports = { detectFabricatedQuotes, findUnverifiedQuotes, logUnverifiedQuotes, buildCorrectionNote, appendCorrectionNote, MIN_QUOTE_WORDS }
