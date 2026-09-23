'use strict'

/**
 * @file Moderation before every request to OpenAI — item 8.2.
 *
 * WHY THIS EXISTS. The Modified Retention Amendment Mike signed on 2026-09-23 binds every request
 * made "with Modified Retention" to clause 4.3: *"Customer will perform moderation by implementing
 * OpenAI's ModAPI or an alternative moderation tooling"*. A project inherits the organisation's ZDR
 * setting by default, so once OpenAI switches it on, EVERY call this app makes is bound — and
 * clause 6 lets them suspend all API access for a breach. Rule Z3 of
 * `design/OPENAI-ZDR-CONSTRAINTS.md`; the contract is verbatim under `design/openai/`.
 *
 * THREE RULINGS SHAPE IT, all Mike's, 2026-09-24 — change none of them without him:
 *
 * 1. 🔴 ONLY THREE CATEGORIES BLOCK. Measured before the build: 0 of 204 scenario-lab sentences
 *    were flagged at all, but OpenAI's general `flagged` marks ordinary business metaphors as
 *    violence — "attack the Auckland market", "would rather kill the business". Blocking on it
 *    would refuse advisors for talking about business. Every other flag is LOGGED and passes; the
 *    log is how a spike of high-severity abuse is noticed and reported, which 4.3 also requires.
 * 2. 🔴 FAIL CLOSED. When the check cannot be reached the request is refused: letting it through
 *    unchecked is the one thing 4.3 rules out. The error is deliberately NOT a blocked-error, so
 *    `aiProvider` still tries the backup provider for non-personal calls, which this contract
 *    does not cover — exactly as it does for any OpenAI outage.
 * 3. 🔴 EVERY SENTENCE IS SCORED ON ITS OWN, in the same call. OpenAI scores whatever it is given
 *    and never points at words; a message that does not say what failed "will only frustrate
 *    users". So each sentence goes in as its own input beside the whole text, and a block names
 *    the sentence. The whole text is scored too, because meaning can build across sentences.
 *
 * 🔴 THE WORDS NEVER REACH A LOG. Categories and the feature do; the text does not. A blocked
 * sentence travels back only on the error, to the person who sent it.
 *
 * What a person then SEES is `design/MODERATION-WORDING.md`, approved by Mike 2026-09-24.
 *
 * @module server/utils/moderation
 */

const MODERATION_PATH = '/v1/moderations'
const MODERATION_MODEL = 'omni-moderation-latest'

/** The only categories that refuse a request. See ruling 1 above. */
const BLOCKED_CATEGORIES = ['sexual/minors', 'self-harm/instructions', 'illicit/violent']

/** Inputs per moderation call. 50 per call was measured working on 2026-09-24; 100 stays well inside it. */
const BATCH_SIZE = 100

/** Longest single input, in characters. A longer sentence (a pasted table, a run-on transcript turn) is cut into pieces. */
const MAX_INPUT_CHARS = 2000

/** Longest whole-text chunk, in characters — the cross-sentence check reads the text in pieces this size. */
const MAX_WHOLE_CHARS = 8000

/**
 * Cuts a long string into pieces no longer than `max`, preferring a space as the cut point.
 * @param {string} text
 * @param {number} max
 * @returns {string[]}
 */
function _cut (text, max) {
  const out = []
  let rest = text
  while (rest.length > max) {
    let at = rest.lastIndexOf(' ', max)
    if (at < max / 2) { at = max }
    out.push(rest.slice(0, at).trim())
    rest = rest.slice(at).trim()
  }
  if (rest) { out.push(rest) }
  return out
}

/**
 * Splits text into sentences: after `.`, `!` or `?` followed by space, and at every line break
 * (a transcript turn, a list item and a heading are each their own line).
 * @param {string} text
 * @returns {string[]} trimmed, non-empty, each at most MAX_INPUT_CHARS
 */
function splitSentences (text) {
  if (typeof text !== 'string') { return [] }
  const out = []
  for (const line of text.split(/\r?\n+/)) {
    for (const s of line.split(/(?<=[.!?])\s+/)) {
      const t = s.trim()
      if (t) { _cut(t, MAX_INPUT_CHARS).forEach(p => out.push(p)) }
    }
  }
  return out
}

/**
 * The whole text in pieces of at most MAX_WHOLE_CHARS, cut between sentences.
 * @param {string[]} sentences
 * @returns {string[]}
 */
function wholeChunks (sentences) {
  const out = []
  let cur = ''
  for (const s of sentences) {
    if (cur && cur.length + 1 + s.length > MAX_WHOLE_CHARS) { out.push(cur); cur = '' }
    cur = cur ? cur + ' ' + s : s
  }
  if (cur) { out.push(cur) }
  return out
}

/**
 * The text a person or a document put into a chat-completions request: every `user` message.
 * System messages are the app's own fixed instructions and are not sent for checking.
 * @param {object} params - chat-completions params
 * @returns {string[]}
 */
function textsFromChat (params) {
  const out = []
  const messages = params && Array.isArray(params.messages) ? params.messages : []
  for (const m of messages) {
    if (!m || m.role !== 'user') { continue }
    if (typeof m.content === 'string') { out.push(m.content); continue }
    if (Array.isArray(m.content)) {
      m.content.forEach((p) => { if (p && p.type === 'text' && typeof p.text === 'string') { out.push(p.text) } })
    }
  }
  return out
}

/**
 * The same for a Responses request: a plain-string `input`, or the text parts of each item that
 * is the user's. A file part (the depreciation PDF) cannot be read by the check and is skipped —
 * the text sent beside it is still checked.
 * @param {object} params - Responses params
 * @returns {string[]}
 */
function textsFromResponses (params) {
  const input = params && params.input
  if (typeof input === 'string') { return [input] }
  const out = []
  if (!Array.isArray(input)) { return out }
  for (const item of input) {
    if (!item || (item.role && item.role !== 'user')) { continue }
    if (typeof item.content === 'string') { out.push(item.content); continue }
    if (Array.isArray(item.content)) {
      item.content.forEach((p) => { if (p && p.type === 'input_text' && typeof p.text === 'string') { out.push(p.text) } })
    }
  }
  return out
}

/**
 * The error a blocked request throws. Never retried: the same words would be refused again.
 * @param {{category: string, sentence: string|null}} hit
 * @returns {Error} with `code` AI_MODERATION_BLOCKED and `moderation` { category, sentence }
 */
function blockedError (hit) {
  const err = new Error('AI_MODERATION_BLOCKED: ' + hit.category)
  err.code = 'AI_MODERATION_BLOCKED'
  err.moderation = { category: hit.category, sentence: hit.sentence }
  return err
}

/**
 * The error when the check cannot be completed. Fail closed — see ruling 2.
 * @param {string} why - a short reason for the server log; never contains the checked text
 * @returns {Error} with `code` AI_MODERATION_UNAVAILABLE
 */
function unavailableError (why) {
  const err = new Error('moderation unavailable: ' + why)
  err.code = 'AI_MODERATION_UNAVAILABLE'
  return err
}

/**
 * Checks the texts and throws when a blocked category fires or the check cannot be completed.
 *
 * @param {string[]} texts - what the request carries from the user side
 * @param {Function} post - async (inputs: string[]) => results[] in the same order, one per input;
 *   the shape of `/v1/moderations` `results`. Injected so this module never touches the network.
 * @param {object} [meta]
 * @param {string} [meta.feature] - who is asking, for the log line (e.g. an aiProvider role)
 * @returns {Promise<{flagged: string[]}>} every category flagged anywhere, when nothing blocked
 * @throws {Error} AI_MODERATION_BLOCKED | AI_MODERATION_UNAVAILABLE
 */
async function check (texts, post, meta) {
  const feature = (meta && meta.feature) || 'unnamed'
  const inputs = []
  for (const t of texts || []) {
    const sentences = splitSentences(t)
    sentences.forEach(s => inputs.push({ kind: 'sentence', text: s }))
    // A text of one sentence is already scored whole; sending it twice changes nothing.
    if (sentences.length > 1) {
      wholeChunks(sentences).forEach(c => inputs.push({ kind: 'whole', text: c }))
    }
  }
  if (inputs.length === 0) { return { flagged: [] } }

  const results = []
  for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
    const batch = inputs.slice(i, i + BATCH_SIZE)
    let got
    try {
      got = await post(batch.map(b => b.text))
    } catch (e) {
      throw unavailableError(String((e && e.message) || e).slice(0, 200))
    }
    if (!Array.isArray(got) || got.length !== batch.length) {
      throw unavailableError('result count did not match the inputs')
    }
    got.forEach(r => results.push(r))
  }

  const flagged = new Set()
  let sentenceHit = null
  let wholeHit = null
  results.forEach((r, i) => {
    const cats = (r && r.categories && typeof r.categories === 'object') ? r.categories : null
    if (!cats) { return }
    Object.keys(cats).forEach((k) => { if (cats[k] === true) { flagged.add(k) } })
    const blocked = BLOCKED_CATEGORIES.find(c => cats[c] === true)
    if (!blocked) { return }
    if (inputs[i].kind === 'sentence' && !sentenceHit) { sentenceHit = { category: blocked, sentence: inputs[i].text } }
    if (inputs[i].kind === 'whole' && !wholeHit) { wholeHit = { category: blocked, sentence: null } }
  })

  const hit = sentenceHit || wholeHit
  if (flagged.size > 0) {
    // 🔴 Categories and the feature only — never the words. This line is how a spike is seen.
    // eslint-disable-next-line no-console
    console.warn('[moderation] feature=' + feature + ' flagged=' + Array.from(flagged).join(',') +
      ' blocked=' + (hit ? hit.category : 'no'))
  }
  if (hit) { throw blockedError(hit) }
  return { flagged: Array.from(flagged) }
}

module.exports = {
  MODERATION_PATH,
  MODERATION_MODEL,
  BLOCKED_CATEGORIES,
  BATCH_SIZE,
  splitSentences,
  wholeChunks,
  textsFromChat,
  textsFromResponses,
  blockedError,
  unavailableError,
  check
}
