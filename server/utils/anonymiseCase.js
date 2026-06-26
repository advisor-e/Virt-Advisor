'use strict'

/**
 * @file Case-study anonymiser — part 2 of mentor case-study review.
 *
 * Produces a de-identified copy of a case's summary + transcript so a platform
 * mentor can review it for app accuracy WITHOUT seeing who the client is. It is
 * an AI transformation, so per the Constitution it is treated as untrusted:
 *   - the client-supplied text is fenced (promptSafety) so it is read as data;
 *   - the model's JSON output is shape-validated before use — a malformed or
 *     incomplete reply throws, it is never partially trusted;
 *   - roles are preserved from the ORIGINAL transcript, never from the model
 *     (the model only ever supplies de-identified text per message index).
 *
 * Design intent (Mike 2026-06-26): strip identity (names, company/brand/place,
 * identifying figures) but DELIBERATELY KEEP tone, frustration, confusion and
 * the exact jargon — that voice is the accuracy signal the mentor needs.
 *
 * The raw text is read server-side only; the scrubbed result is what the manager
 * previews and (on approval, part 3) what is stored for the mentor. The raw
 * summary/transcript never leave the firm.
 *
 * @module server/utils/anonymiseCase
 */

const { fenceUntrusted } = require('./promptSafety')

const MODEL = 'gpt-4o-mini'
const MAX_MESSAGES = 200 // safety cap on transcript length sent in one call
const MAX_CONTENT_CHARS = 4000 // per-field truncation guard

const SYSTEM = [
  'You de-identify advisory case studies so a platform mentor can review them without learning who the client is.',
  'Remove EVERY detail that could identify the client business or any individual: personal names, company / brand / trading names, specific place names, distinctive product names, and exact figures (revenue, headcount, precise dates) that could fingerprint them.',
  'Replace each with a neutral generic term — "the owner", "the company", "a team member", "[a city]", "around £X", "recently".',
  'CRITICAL: preserve the emotional tone, frustration, confusion, and the exact business jargon and wording. Do NOT summarise, soften, rephrase, translate or correct the language — only de-identify. The mentor needs the real voice to judge the conversation.',
  'Return ONLY a JSON object — no commentary, no markdown.'
].join(' ')

/**
 * Render the case as an indexed, fenced prompt and state the exact JSON shape we
 * require back (one entry per input message index, nothing omitted).
 * @param {string} summary
 * @param {Array<{role:string, content:string}>} messages
 * @returns {string}
 */
function buildUserPrompt (summary, messages) {
  const indexed = messages
    .map((m, i) => `[${i}] ${m.role === 'assistant' ? 'VIRTUAL-ADVISER' : 'ADVISER'}: ${String(m.content ?? '').slice(0, MAX_CONTENT_CHARS)}`)
    .join('\n')

  return [
    'De-identify the case study below.',
    '',
    'SUMMARY:',
    fenceUntrusted(String(summary ?? '').slice(0, MAX_CONTENT_CHARS)),
    '',
    'MESSAGES (each line is "[index] SPEAKER: text"):',
    fenceUntrusted(indexed || '(none)'),
    '',
    'Return JSON exactly in this shape:',
    '{"summary": "<de-identified summary>", "messages": [{"i": <index number>, "content": "<de-identified text>"}]}',
    'Include one messages entry for EVERY input index, with the same index numbers, omitting none.'
  ].join('\n')
}

/**
 * Validate and parse the model's JSON reply. Throws on any deviation — the
 * output is never partially trusted. Exported for tests.
 * @param {string} raw - the model's message content
 * @param {number} count - number of input messages that MUST be present
 * @returns {{summary: string, byIndex: Map<number, string>}}
 */
function parseAnonymisedResponse (raw, count) {
  let obj
  try {
    obj = JSON.parse(raw)
  } catch (e) {
    throw new Error('ANONYMISE_BAD_JSON')
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new TypeError('ANONYMISE_BAD_SHAPE')
  }
  if (typeof obj.summary !== 'string') {
    throw new TypeError('ANONYMISE_BAD_SUMMARY')
  }
  if (!Array.isArray(obj.messages)) {
    throw new TypeError('ANONYMISE_BAD_MESSAGES')
  }

  const byIndex = new Map()
  for (const m of obj.messages) {
    if (!m || typeof m !== 'object') { continue }
    const i = m.i
    if (typeof i !== 'number' || !Number.isInteger(i) || i < 0 || i >= count) { continue }
    if (typeof m.content !== 'string') { continue }
    byIndex.set(i, m.content)
  }
  for (let i = 0; i < count; i++) {
    if (!byIndex.has(i)) { throw new Error('ANONYMISE_INCOMPLETE') }
  }
  return { summary: obj.summary, byIndex }
}

/**
 * Anonymise a case's summary + transcript.
 *
 * @param {object} input
 * @param {string} [input.summary]
 * @param {Array<{role:string, content:string}>} [input.transcript]
 * @param {{chat:{completions:{create:Function}}}} client - an OpenAI REST client
 *   (createOpenAIClient); injected so this is unit-testable without a live API.
 * @returns {Promise<{summary:string, transcript:Array<{role:string,content:string}>, usage:(object|null)}>}
 * @throws if the model reply is empty, malformed, or missing any message index.
 */
async function anonymiseCaseContent (input, client) {
  const summary = input && input.summary ? String(input.summary) : ''
  const allMessages = Array.isArray(input && input.transcript) ? input.transcript : []
  const messages = allMessages.slice(0, MAX_MESSAGES)

  // Nothing to de-identify — never spend an API call on an empty case.
  if (!summary.trim() && messages.length === 0) {
    return { summary: '', transcript: [], usage: null }
  }

  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: buildUserPrompt(summary, messages) }
    ]
  })

  const rawContent = response && response.choices && response.choices[0] &&
    response.choices[0].message && response.choices[0].message.content
  if (typeof rawContent !== 'string' || !rawContent.trim()) {
    throw new Error('ANONYMISE_EMPTY')
  }

  const { summary: anonSummary, byIndex } = parseAnonymisedResponse(rawContent, messages.length)

  // Roles come from the ORIGINAL transcript; the model only supplied scrubbed text.
  const transcript = messages.map((m, i) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: byIndex.get(i)
  }))

  return { summary: anonSummary, transcript, usage: (response && response.usage) || null }
}

module.exports = { anonymiseCaseContent, parseAnonymisedResponse, buildUserPrompt, MODEL }
