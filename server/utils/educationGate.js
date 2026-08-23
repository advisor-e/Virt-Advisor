'use strict'

/**
 * @file The education gate — the question an advisor is asked, before any recommendation,
 *   when the engine can see that a client is not comfortable reading their own numbers.
 * @module server/utils/educationGate
 *
 * Item 2.9. Design: `design/EDUCATION-GATE.md`. Artefact: `design/mockups/education-gate.html`.
 *
 * Three rulings, all Mike's:
 *   2026-07-16 — the BEHAVIOUR. A pre-recommendation prompt asks the advisor to choose
 *                between education-first and what is technically needed, with the
 *                reasoning shown either way. Guide, don't replace.
 *   2026-08-16 — the REACH. It fires wherever poor financial literacy shows up, not only
 *                where the app could already see it.
 *   2026-08-24 — the WORDING (verbatim in `data/education-gate.json`) and that the mentor
 *                screen ships in the same change.
 *
 * 🔴 THIS MODULE MUST NEVER CHANGE WHICH TEMPLATES ARE RECOMMENDED. It decides whether the
 * advisor is ASKED something; it never touches selection. Two reasons, both binding:
 *
 *   1. `data/advisory-staircase.json`'s own ruleGuard — "the education decision lives in the
 *      acumen lens", not coupled to the staircase or the engagement type.
 *   2. pd-35 in `data/advisory-distinctions.json` ALREADY boosts templates for this exact
 *      idea inside the forecasting domain. A second scoring lever would double-count it
 *      there and silently change advice this item was never asked to change.
 *
 * That guarantee is structural, not a promise. The phrases live in `gateSignals` — a map
 * `problemSignals.SIGNAL_REGISTRY` does not read — so they cannot reach
 * `templateResolver.getSignalWeight` or `decisionScore` by any path. It is not a weight of
 * zero that could be "fixed" by a later maintainer; there is no wire.
 * `tests/unit/educationGate.test.js` fails if one is ever added.
 *
 * ⚠ WHY THE TRIGGERS LIVE IN TWO PLACES, WHICH IS DELIBERATE AND NOT DRIFT:
 *   - `data/signal-dictionary.json` -> `gateSignals` holds REGULAR EXPRESSIONS, maintained
 *     by a developer, covering the many ways a thing gets said.
 *   - `data/education-gate.json` -> `phrases` holds PLAIN TEXT a mentor types on a screen,
 *     matched literally. This is the half a non-developer owns.
 * Both are checked. Neither is generated from the other, because a regex a mentor cannot
 * read is not an edit target and a plain phrase cannot express "does(n't| not)".
 *
 * Node 14, CommonJS.
 */

const BASE_FILE = require('../../data/education-gate.json')
const DICTIONARY = require('../../data/signal-dictionary.json')
const { deepMerge } = require('./deepMerge')
const { parentScopeOf } = require('./tierChain')

/** The overlay address these settings are stored under, at every tier. */
const CONFIG_KEY = BASE_FILE.configKey

/** The gate's id in the dictionary's `gateSignals` map. */
const GATE_SIGNAL = 'financial_literacy_gap'

/**
 * The shipped default. `_`-prefixed keys are the data file's own documentation — stripped
 * here rather than in the file, so the note explaining a decision stays beside the thing it
 * explains and never reaches an API response or a model.
 */
const BASE_GATE = stripDocKeys(BASE_FILE)

/** The developer-maintained regexes, compiled once at load — not per request. */
const GATE_PATTERNS = (((DICTIONARY.gateSignals || {})[GATE_SIGNAL] || {}).patterns || [])
  .map(p => new RegExp(p, 'i'))

/**
 * Remove `_`-prefixed documentation keys, at every depth.
 *
 * @param {*} value - any JSON value
 * @returns {*} the same shape with `_`-prefixed object keys removed
 */
function stripDocKeys (value) {
  if (Array.isArray(value)) { return value.map(stripDocKeys) }
  if (value === null || typeof value !== 'object') { return value }
  const out = {}
  for (const key of Object.keys(value)) {
    if (key.charAt(0) === '_') { continue }
    out[key] = stripDocKeys(value[key])
  }
  return out
}

/**
 * Escape a mentor-typed phrase so it is matched literally. A mentor types what an advisor
 * would say; they are not writing a regular expression, and a stray `(` from
 * "profit (gross)" must not throw or silently match nothing.
 *
 * @param {string} phrase - plain text
 * @returns {string} the phrase, safe to place inside a RegExp
 */
function escapeLiteral (phrase) {
  return String(phrase).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Does this text show a client who cannot read their own numbers — and if so, on what?
 *
 * Checks the mentor's plain phrases first, because when both match, the phrase a human
 * typed is the one worth showing back to an advisor: it is the vocabulary they recognise,
 * where a regex fragment is not.
 *
 * @param {string} text - everything the advisor has typed in this case
 * @param {Array.<string>} [phrases] - the resolved tier's plain phrases
 * @returns {{detected: boolean, phrase: (string|null)}} `phrase` is the matched text as the
 *   advisor wrote it, for the reason line; null when only a regex matched and no readable
 *   fragment can be named.
 */
function detectLiteracyGap (text, phrases) {
  if (!text || typeof text !== 'string') { return { detected: false, phrase: null } }

  for (const phrase of (phrases || [])) {
    if (!phrase || typeof phrase !== 'string') { continue }
    const found = text.match(new RegExp(escapeLiteral(phrase.trim()), 'i'))
    if (found) { return { detected: true, phrase: found[0] } }
  }

  for (const pattern of GATE_PATTERNS) {
    const found = text.match(pattern)
    // `found[0]` is the advisor's own words, not the pattern — so the reason line quotes
    // them back rather than showing engineering.
    if (found) { return { detected: true, phrase: found[0] } }
  }

  return { detected: false, phrase: null }
}

/**
 * The line shown after the advisor chooses — the acknowledgement plus, when a phrase can be
 * named, why they were asked.
 *
 * 🔴 The reason sentence is DROPPED, not softened, when no phrase is available. The
 * 2026-07-16 ruling requires the reasoning shown either way; a gate that cannot say what
 * triggered it should say nothing rather than something woolly.
 *
 * @param {object} gate - the resolved gate config
 * @param {string} value - the option value the advisor chose
 * @param {string|null} phrase - the matched trigger text, if any
 * @returns {string} the acknowledgement, with the reason appended when one exists
 */
function buildAcknowledgement (gate, value, phrase) {
  const option = (gate.options || []).find(o => o.value === value)
  if (!option) { return '' }
  const ack = option.acknowledgement || ''
  if (!phrase || !gate.reason) { return ack }
  return (ack + ' ' + gate.reason.replace('{phrase}', phrase)).trim()
}

/**
 * Read the advisor's answer and map it to an option value. The advisor may click a button
 * or type; both must work, because the question is asked in a conversation.
 *
 * Unrecognised answers return null, and null means "not answered" — the sequencer asks
 * again rather than guessing. Guessing here would pick a pitch for a client on a coin toss.
 *
 * @param {object} gate - the resolved gate config
 * @param {string} answer - whatever the advisor typed or clicked
 * @returns {string|null} the option value, or null when the answer is not recognisable
 */
function readAnswer (gate, answer) {
  if (!answer || typeof answer !== 'string') { return null }
  const text = answer.trim().toLowerCase()
  if (!text) { return null }

  for (const option of (gate.options || [])) {
    if (text === option.value.toLowerCase()) { return option.value }
    if (text === option.label.toLowerCase()) { return option.value }
  }
  // Typed rather than clicked. Education is the narrower, more deliberate request, so it is
  // tested first — "no education" must not be read as "education".
  if (/\bno\b|not? education|skip|technical|straight to|what'?s needed/.test(text)) { return 'technical' }
  if (/educat|teach|learn|basics|foundation/.test(text)) { return 'education_first' }
  if (/^(y|yes|yep|yeah|please|ok|okay|sure)\b/.test(text)) { return 'education_first' }
  return null
}

/**
 * Validate a tier's stored override before it is merged or saved. Anything unrecognised is
 * rejected whole rather than partially applied — half a gate is worse than none, because the
 * advisor would be asked a question with one answer relabelled and the other not.
 *
 * @param {*} value - the candidate override
 * @returns {{ok: boolean, value: object, error: (string|null)}} `value` is the cleaned override
 */
function validateEducationGate (value) {
  if (value === null || value === undefined) { return { ok: true, value: {}, error: null } }
  if (typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, value: {}, error: 'The education gate must be an object.' }
  }

  const out = {}

  if (value.question !== undefined) {
    if (typeof value.question !== 'string' || !value.question.trim()) {
      return { ok: false, value: {}, error: 'The question cannot be empty.' }
    }
    if (value.question.length > 600) {
      return { ok: false, value: {}, error: 'The question is too long (600 characters maximum).' }
    }
    out.question = value.question.trim()
  }

  if (value.reason !== undefined) {
    if (typeof value.reason !== 'string' || value.reason.length > 300) {
      return { ok: false, value: {}, error: 'The reason line is too long (300 characters maximum).' }
    }
    out.reason = value.reason.trim()
  }

  if (value.options !== undefined) {
    if (!Array.isArray(value.options)) {
      return { ok: false, value: {}, error: 'The answers must be a list.' }
    }
    const allowed = BASE_GATE.options.map(o => o.value)
    const seen = []
    const options = []
    for (const option of value.options) {
      if (!option || typeof option !== 'object' || Array.isArray(option)) {
        return { ok: false, value: {}, error: 'Each answer must be an object.' }
      }
      if (!allowed.includes(option.value)) {
        // The VALUES are the contract with strategyResolver. A tier may rename a button;
        // it may not invent a third path or delete one, because nothing downstream would
        // know what to do with the result.
        return { ok: false, value: {}, error: 'Unknown answer: ' + String(option.value) }
      }
      if (seen.includes(option.value)) {
        return { ok: false, value: {}, error: 'Answer listed twice: ' + option.value }
      }
      seen.push(option.value)
      const cleaned = { value: option.value }
      if (option.label !== undefined) {
        if (typeof option.label !== 'string' || !option.label.trim() || option.label.length > 80) {
          return { ok: false, value: {}, error: 'An answer label must be 1-80 characters.' }
        }
        cleaned.label = option.label.trim()
      }
      if (option.acknowledgement !== undefined) {
        if (typeof option.acknowledgement !== 'string' || option.acknowledgement.length > 400) {
          return { ok: false, value: {}, error: 'An acknowledgement is too long (400 characters maximum).' }
        }
        cleaned.acknowledgement = option.acknowledgement.trim()
      }
      options.push(cleaned)
    }
    if (options.length !== allowed.length) {
      return { ok: false, value: {}, error: 'Both answers must be present.' }
    }
    out.options = options
  }

  if (value.phrases !== undefined) {
    if (!Array.isArray(value.phrases)) {
      return { ok: false, value: {}, error: 'The phrases must be a list.' }
    }
    if (value.phrases.length > 200) {
      return { ok: false, value: {}, error: 'That is more than 200 phrases.' }
    }
    const phrases = []
    for (const phrase of value.phrases) {
      if (typeof phrase !== 'string') {
        return { ok: false, value: {}, error: 'Every phrase must be text.' }
      }
      const trimmed = phrase.trim()
      if (!trimmed) { continue }
      if (trimmed.length > 120) {
        return { ok: false, value: {}, error: 'A phrase is too long (120 characters maximum).' }
      }
      // A one- or two-character phrase would match almost every case and fire the gate on
      // everyone, which is worse than never firing: the advisor learns to dismiss it.
      if (trimmed.length < 3) {
        return { ok: false, value: {}, error: 'A phrase must be at least 3 characters: "' + trimmed + '"' }
      }
      if (!phrases.includes(trimmed)) { phrases.push(trimmed) }
    }
    out.phrases = phrases
  }

  return { ok: true, value: out, error: null }
}

/**
 * The gate this scope actually works to — the platform default with each tier's overrides
 * merged over it, mentor first.
 *
 * ⚠ Mirrors `propertyTaxRules.loadResolvedPropertyTaxRules` line for line, deliberately.
 * A second way of doing tier inheritance is how two ways drift apart (`tier-cascade.md` §3).
 *
 * ⚠ `phrases` is REPLACED by a tier that sets it, not concatenated — `deepMerge` does not
 * merge arrays. That is the intended behaviour: a firm that removes a phrase must actually
 * see it removed, and a list that only ever grows cannot be corrected from a screen.
 *
 * @param {string} scopeId - a firm id or a reserved tier scope
 * @param {Function} loadFirmConfig - overlay reader (firmOverlay.loadFirmConfig)
 * @returns {Promise<object>} the resolved gate config
 */
async function loadResolvedEducationGate (scopeId, loadFirmConfig) {
  if (!scopeId) { return BASE_GATE }

  const parent = parentScopeOf(scopeId)
  const base = parent === null
    ? BASE_GATE
    : await loadResolvedEducationGate(parent, loadFirmConfig)

  let own = null
  try {
    own = await loadFirmConfig(scopeId, CONFIG_KEY)
  } catch (err) {
    // Degraded, and loudly so. The advisor still gets the platform question rather than
    // no question at all — a storage fault must not silently switch the gate off.
    console.error('[education-gate] scope read failed:', err.message)
    return base
  }

  const { ok, value } = validateEducationGate(own)
  if (!ok || Object.keys(value).length === 0) { return base }

  return deepMerge(base, value)
}

module.exports = {
  BASE_GATE,
  CONFIG_KEY,
  GATE_SIGNAL,
  GATE_PATTERNS,
  stripDocKeys,
  detectLiteracyGap,
  buildAcknowledgement,
  readAnswer,
  validateEducationGate,
  loadResolvedEducationGate
}
