'use strict'

/**
 * @file Layer 3 of `design/PROMPT-CONTRIBUTION-SAFETY.md` — the AI review of a prompt a
 * firm manager pasted. Item 4.31, step 3.
 * @module server/utils/promptReview
 *
 * 🔴 THE REVIEW IS AN ADVISOR AND NEVER A GATE. The design is blunt about it: *"If we
 * ever let 'the AI said it was fine' be the thing that admits text into a prompt, we have
 * built the unwinnable design and given it a green tick."* Nothing in this module returns
 * a verdict. It returns findings a person reads, and the deterministic checks that
 * actually protect the platform (`./promptContribution`) have already run and do not
 * consult it.
 *
 * 🔴 THE MODEL'S OWN OUTPUT IS UNTRUSTED, AND THIS IS THE LOOPHOLE THAT CLOSES. The design
 * names it: *"Anything the AI suggests and the accountant accepts is itself new text, and
 * goes back through Layers 1 and 2."* Accepting a suggestion must not become a way to
 * write unchecked content into a prompt, so every finding this module returns has been
 * put back through `checkContribution` and is discarded whole if it fails. A model talked
 * into emitting a web address produces a finding that never reaches the screen.
 *
 * 🔴 THE PROMPT ITSELF IS NOT IN THIS FILE. It is a document on the Mentor Hub's AI
 * Prompts tab (`data/ai-prompts.json` → `prompt-review`), assembled by
 * `aiPrompts.assemblePrompt`, because content that shapes what the AI is shown must be
 * on a screen somebody can read — never hardcoded inside a prompt builder (CLAUDE.md →
 * "AI FIXES SURFACE ON A HUB PAGE"). This is that function's first production caller.
 *
 * Node 14, CommonJS.
 */

const { fenceUntrusted } = require('./promptSafety')
const { assemblePrompt } = require('./aiPrompts')
const { checkContribution } = require('./promptContribution')

/** The document on the Mentor Hub that holds every word the reviewer is given. */
const REVIEW_PROMPT_ID = 'prompt-review'

/**
 * At most eight findings reach the screen.
 *
 * Not a safety limit — a reading one. A report of twenty findings is a report nobody
 * acts on, and the prompt asks for the important ones first, so a longer list is the
 * model padding rather than the reader gaining.
 */
const MAX_FINDINGS = 8

/** The three labels the screen knows how to draw. Anything else is not a finding. */
const KINDS = ['good', 'gap', 'clash']

const LIMITS = { title: 160, body: 1200, suggestion: 800, quote: 400 }

/**
 * The messages for the completion call.
 *
 * The manager's text goes in FENCED, in its own user message, and the instructions are
 * assembled from the mentor's document — so the words the reviewer is given can be read
 * on a screen rather than found in this file.
 *
 * @param {string} text - The pasted prompt, already through the deterministic checks
 * @param {object} [resolvedOverrides] - from `loadResolvedAiPromptOverrides`
 * @returns {{messages: object[]}} ready for `chat.completions.create`
 */
function buildReviewMessages (text, resolvedOverrides) {
  const assembled = assemblePrompt(REVIEW_PROMPT_ID, resolvedOverrides)
  return {
    messages: [
      { role: 'system', content: assembled.text },
      { role: 'user', content: fenceUntrusted(text) }
    ]
  }
}

/**
 * Pulls the JSON object out of whatever the model actually said.
 *
 * Models intermittently wrap a reply in prose or a code fence however firmly they are
 * told not to — the same behaviour `advisorEngine` already works around. Taking the
 * outermost braces is tolerant of that and of nothing else.
 *
 * @param {*} raw - the completion's text content
 * @returns {object|null} the parsed object, or null if there was nothing readable
 */
function parseReview (raw) {
  const text = String(raw === null || raw === undefined ? '' : raw)
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) { return null }
  try {
    const parsed = JSON.parse(match[0])
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : null
  } catch (err) {
    return null
  }
}

/**
 * A string field, or null if it is not usable.
 * @param {*} value
 * @param {number} limit
 * @returns {string|null}
 */
function textField (value, limit) {
  if (typeof value !== 'string') { return null }
  const trimmed = value.trim()
  if (trimmed === '') { return null }
  return trimmed.length > limit ? trimmed.slice(0, limit) : trimmed
}

/**
 * Validates one finding and returns it in the shape the screen draws, or null.
 *
 * ⚠ A FINDING IS DROPPED, NEVER REPAIRED. Guessing at a missing `kind` or inventing a
 * title would put words on an accountant's screen that no one wrote — neither the model
 * nor us. Losing one finding costs a sentence of advice; inventing one costs the whole
 * feature's credibility.
 *
 * @param {*} raw
 * @returns {object|null}
 */
function validateFinding (raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { return null }
  if (!KINDS.includes(raw.kind)) { return null }

  const title = textField(raw.title, LIMITS.title)
  const body = textField(raw.body, LIMITS.body)
  if (title === null || body === null) { return null }

  return {
    kind: raw.kind,
    title,
    body,
    suggestion: textField(raw.suggestion, LIMITS.suggestion),
    quote: textField(raw.quote, LIMITS.quote)
  }
}

/**
 * Every word of a finding, as one string, for the re-check.
 * @param {object} finding
 * @returns {string}
 */
function wordsOf (finding) {
  return [finding.title, finding.body, finding.suggestion, finding.quote]
    .filter(part => typeof part === 'string')
    .join('\n')
}

/**
 * Validates a whole reply and returns only findings safe to display.
 *
 * @param {*} parsed - the object from `parseReview`
 * @returns {{ok: boolean, findings: object[], dropped: number}} `ok:false` means the
 *   reply could not be read at all — which is reported as a FAILURE and never as "the
 *   prompt was fine", the same defect `advisorEngine` records for its own classifiers.
 */
function validateReview (parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, findings: [], dropped: 0 }
  }
  if (!Array.isArray(parsed.findings)) {
    return { ok: false, findings: [], dropped: 0 }
  }

  let dropped = 0
  const findings = []

  parsed.findings.forEach((raw) => {
    if (findings.length >= MAX_FINDINGS) { dropped++; return }

    const finding = validateFinding(raw)
    if (finding === null) { dropped++; return }

    // 🔴 The model's own words go back through Layer 2. This is the loophole the design
    // names — accepting a suggestion must never be a route for unchecked text.
    if (!checkContribution(wordsOf(finding)).ok) { dropped++; return }

    findings.push(finding)
  })

  return { ok: true, findings, dropped }
}

module.exports = {
  buildReviewMessages,
  parseReview,
  validateReview,
  REVIEW_PROMPT_ID,
  MAX_FINDINGS,
  KINDS
}
