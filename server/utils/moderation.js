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
 * 4. 🔴 ONLY WHAT A PERSON PUT IN IS CHECKED — Mike's ruling the same day, on a live measurement.
 *    The first build checked every word of the user side of a request, and ONE advisor reply sent
 *    ~21,800 tokens of moderation against an account limit of 20,000 a minute: the app refused
 *    every AI-written reply, for everyone. 99.9% of it was the app's own templates and context.
 *    Each call site now names the text a person typed, said or uploaded (`openaiClient` refuses a
 *    call that names nothing), and two more measures keep the volume down:
 *      - a sentence already checked is REMEMBERED for 15 minutes, keyed by a one-way hash so no
 *        words are held — a conversation resends its history every turn;
 *      - the whole-text check runs only on a text short enough to send once (MAX_WHOLE_CHARS);
 *        a long transcript is still checked sentence by sentence, but not sent a second time.
 *
 * 🔴 THE WORDS NEVER REACH A LOG. Categories and the feature do; the text does not. A blocked
 * sentence travels back only on the error, to the person who sent it.
 *
 * What a person then SEES is `design/MODERATION-WORDING.md`, approved by Mike 2026-09-24.
 *
 * @module server/utils/moderation
 */

const crypto = require('crypto')

const MODERATION_PATH = '/v1/moderations'
const MODERATION_MODEL = 'omni-moderation-latest'

/** The only categories that refuse a request. See ruling 1 above. */
const BLOCKED_CATEGORIES = ['sexual/minors', 'self-harm/instructions', 'illicit/violent']

/** Inputs per moderation call. 50 per call was measured working on 2026-09-24; 100 stays well inside it. */
const BATCH_SIZE = 100

/** Longest single input, in characters. A longer sentence (a pasted table, a run-on transcript turn) is cut into pieces. */
const MAX_INPUT_CHARS = 2000

/** Longest text that is also scored whole — the cross-sentence check. Longer texts are sentences only (ruling 4). */
const MAX_WHOLE_CHARS = 8000

/** How long a checked sentence is remembered, and how many are kept (ruling 4). */
const CACHE_TTL_MS = 15 * 60 * 1000
const CACHE_MAX = 5000

/** hash → { at, categories }. Keyed by a one-way hash: the words themselves are never held. */
const _cache = new Map()

function _key (text) {
  return crypto.createHash('sha256').update(text).digest('hex')
}

function _cached (text) {
  const hit = _cache.get(_key(text))
  if (!hit) { return null }
  if (Date.now() - hit.at > CACHE_TTL_MS) { _cache.delete(_key(text)); return null }
  return hit.categories
}

function _remember (text, categories) {
  if (_cache.size >= CACHE_MAX) { _cache.delete(_cache.keys().next().value) }
  _cache.set(_key(text), { at: Date.now(), categories })
}

/** Tests only: forget everything remembered. */
function _resetCache () { _cache.clear() }

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
 * The error a blocked request throws. Never retried: the same words would be refused again.
 *
 * `moderationSource` is the whole text the hit came from, so a route can tell "the user's own
 * message" (message 2) from "the app's own material" (message 3) when no single sentence was to
 * blame. 🔴 It is NON-ENUMERABLE on purpose: it can hold the app's templates or a transcript, and
 * a route that sends the error object as it stands must not carry it to a browser.
 *
 * @param {{category: string, sentence: string|null, from?: string}} hit
 * @returns {Error} with `code` AI_MODERATION_BLOCKED and `moderation` { category, sentence }
 */
function blockedError (hit) {
  const err = new Error('AI_MODERATION_BLOCKED: ' + hit.category)
  err.code = 'AI_MODERATION_BLOCKED'
  err.moderation = { category: hit.category, sentence: hit.sentence }
  Object.defineProperty(err, 'moderationSource', { value: hit.from || null, enumerable: false })
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
 * @param {string[]} texts - what a PERSON put into the request: typed, said or uploaded (ruling 4)
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
  const seen = new Set()
  for (const t of texts || []) {
    const sentences = splitSentences(t)
    sentences.forEach((s) => {
      if (!seen.has('s' + s)) { seen.add('s' + s); inputs.push({ kind: 'sentence', text: s, from: t }) }
    })
    // Scored whole as well only when it is more than one sentence and short enough to send once.
    const whole = sentences.join(' ')
    if (sentences.length > 1 && whole.length <= MAX_WHOLE_CHARS && !seen.has('w' + whole)) {
      seen.add('w' + whole)
      inputs.push({ kind: 'whole', text: whole, from: t })
    }
  }
  if (inputs.length === 0) { return { flagged: [] } }

  // What was checked in the last 15 minutes is not sent again (ruling 4).
  const categoriesOf = inputs.map(inp => _cached(inp.text))
  const unsent = inputs.map((inp, i) => i).filter(i => categoriesOf[i] === null)
  for (let b = 0; b < unsent.length; b += BATCH_SIZE) {
    const idx = unsent.slice(b, b + BATCH_SIZE)
    let got
    try {
      got = await post(idx.map(i => inputs[i].text))
    } catch (e) {
      throw unavailableError(String((e && e.message) || e).slice(0, 200))
    }
    if (!Array.isArray(got) || got.length !== idx.length) {
      throw unavailableError('result count did not match the inputs')
    }
    got.forEach((r, j) => {
      const cats = (r && r.categories && typeof r.categories === 'object') ? r.categories : {}
      categoriesOf[idx[j]] = cats
      _remember(inputs[idx[j]].text, cats)
    })
  }

  const flagged = new Set()
  let sentenceHit = null
  let wholeHit = null
  categoriesOf.forEach((cats, i) => {
    if (!cats) { return }
    Object.keys(cats).forEach((k) => { if (cats[k] === true) { flagged.add(k) } })
    const blocked = BLOCKED_CATEGORIES.find(c => cats[c] === true)
    if (!blocked) { return }
    if (inputs[i].kind === 'sentence' && !sentenceHit) { sentenceHit = { category: blocked, sentence: inputs[i].text, from: inputs[i].from } }
    if (inputs[i].kind === 'whole' && !wholeHit) { wholeHit = { category: blocked, sentence: null, from: inputs[i].from } }
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
  MAX_WHOLE_CHARS,
  splitSentences,
  blockedError,
  unavailableError,
  check,
  _resetCache
}
