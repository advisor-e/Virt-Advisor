'use strict'

/**
 * aiProvider — one seam in front of every backend chat call, with a once-only fallback
 * (item 4.97 US8, specs/003-engine-middle-learning-true contracts §Provider seam).
 *
 * Mike asked for this on 2026-09-14, after the OpenAI account ran out of credit on
 * 11 September and every AI feature in the product stopped at once. His ruling was a
 * FALLBACK, not a second opinion: one provider answers, and the other is tried only when the
 * first cannot. The "two perspectives" idea he raised the same day is item 4.98.
 *
 * 🔴 PERSONAL DATA GOES ONLY TO A CLEARED PROVIDER. Every caller states `personal: true|false`
 * and the flag is REQUIRED — a call that forgets it throws rather than defaulting, because a
 * default would silently decide a privacy question. With `personal: true` and no clearance in
 * config the fallback is not tried at all and the primary's own error is rethrown, so the
 * feature fails exactly as it does today rather than routing a client's words somewhere new.
 *
 * 🔴 NOTHING HERE NAMES A PROVIDER. Both come from `config/integration.js` → `AI`, which reads
 * the environment. A provider's model per role comes from the same place.
 *
 * 🔴 A REPLY IS NOT TRUSTED ANY MORE THAN BEFORE. This seam chooses who answers; every
 * existing validator still decides whether the answer may be used.
 *
 * What it does NOT cover, by construction, and the four call sites say so themselves: the
 * Responses API (web search with citations, base64 PDF input) and the audio transcription
 * endpoint. No second provider offers those, so those calls stay on the primary and log
 * `fallback=none`.
 */

const { AI } = require('../../config/integration')
const { createOpenAIClient } = require('./openaiClient')

/** Roles a call site may ask for. A role names WHAT the call does, not which model runs it. */
const ROLES = ['classify', 'narrative', 'course', 'report', 'reading', 'review', 'compliance', 'draft', 'research', 'extract']

/** What happened to the fallback on one call, for the log line. */
const FALLBACK_NONE = 'none'
const FALLBACK_USED = 'used'
const FALLBACK_REFUSED = 'refused-personal'

/**
 * HTTP statuses worth trying the other provider for: the key was rejected, the account is out
 * of credit, the rate limit is hit, or the service is broken. A 400 is not here — a malformed
 * request will be just as malformed at the second provider.
 */
const RETRYABLE_STATUS = /\b(401|402|403|429|5\d\d)\b/

function _configured (p) {
  return !!(p && p.name && p.host && p.apiKey)
}

/**
 * Whether a thrown error or an empty reply is worth a second attempt.
 * `openaiClient` throws `OpenAI API error <status>: <body>` for a non-2xx, and a plain
 * socket error otherwise; a socket error means the service could not be reached at all,
 * which is exactly what a fallback is for.
 * @param {Error} err
 * @returns {boolean}
 */
function isRetryable (err) {
  if (!err) { return false }
  const msg = String(err.message || '')
  if (msg.indexOf('OpenAI API error') === 0) { return RETRYABLE_STATUS.test(msg) }
  // Not an HTTP status: a timeout, a DNS failure, a dropped socket. Worth the other provider.
  return true
}

/**
 * A chat reply with no usable content. The provider answered, so nothing threw, but there is
 * nothing to validate — and every call site would report a failure anyway.
 * @param {Object} reply
 * @returns {boolean}
 */
function isEmptyReply (reply) {
  if (!reply || !Array.isArray(reply.choices) || reply.choices.length === 0) { return true }
  const msg = reply.choices[0] && reply.choices[0].message
  return !msg || typeof msg.content !== 'string' || msg.content.trim() === ''
}

/**
 * The model a provider uses for a role, or null when it declares none.
 * @param {Object} provider - AI.primary or AI.fallback
 * @param {string} role
 * @returns {string|null}
 */
function modelFor (provider, role) {
  const m = provider && provider.models ? provider.models[role] : null
  return (typeof m === 'string' && m) ? m : null
}

/**
 * Build a client for one provider. Kept separate so tests can replace it.
 * @param {Object} provider
 * @returns {Object} an openaiClient-shaped client
 */
function _clientFor (provider) {
  return createOpenAIClient({ apiKey: provider.apiKey, host: provider.host })
}

let _factory = _clientFor
/** Tests only: replace how a provider's client is built. */
function _setClientFactory (fn) { _factory = typeof fn === 'function' ? fn : _clientFor }

/**
 * The client a call site uses.
 *
 * @param {string} role - one of ROLES; decides the model at each provider
 * @returns {{chat: {completions: {create: Function}}}} a client whose `create` takes the same
 *   params as `openaiClient`'s, plus `options.personal` (required) and `options.stream`
 *   handled exactly as before. Every reply carries `provider` (the name that answered) and
 *   `fallbackState` (none | used | refused-personal) for the caller's log line.
 * @throws {Error} AI_UNKNOWN_ROLE for a role that is not declared
 */
function getClient (role) {
  if (!ROLES.includes(role)) {
    const err = new Error('aiProvider: unknown role "' + role + '"')
    err.code = 'AI_UNKNOWN_ROLE'
    throw err
  }

  const create = async (params, options) => {
    const opts = options || {}
    if (typeof opts.personal !== 'boolean') {
      // A default here would decide a privacy question silently. The caller states it.
      const err = new Error('aiProvider: options.personal is required (true or false)')
      err.code = 'AI_PERSONAL_FLAG_MISSING'
      throw err
    }

    const primary = AI.primary
    const fallback = AI.fallback
    const primaryModel = modelFor(primary, role)
    const _passthrough = Object.assign({}, opts)
    delete _passthrough.personal

    let primaryError = null
    try {
      const reply = await _factory(primary).chat.completions.create(
        Object.assign({}, params, primaryModel ? { model: primaryModel } : {}),
        _passthrough
      )
      // A streamed reply is an async iterable, not a message object: it cannot be inspected
      // for emptiness without consuming it, so it is returned as it is. The fallback for a
      // stream is therefore only ever the connection failing before the first token, which
      // is the case the throw above already covers.
      if (params && params.stream) {
        return _tag(reply, primary.name, FALLBACK_NONE)
      }
      if (!isEmptyReply(reply)) {
        return _tag(reply, primary.name, FALLBACK_NONE)
      }
      primaryError = new Error('OpenAI API error 502: empty reply')
    } catch (err) {
      primaryError = err
    }

    // From here the primary did not answer usefully.
    if (!_configured(fallback)) { throw primaryError }
    if (!isRetryable(primaryError)) { throw primaryError }
    if (opts.personal && !AI.fallbackPersonalCleared) {
      // 🔴 The refusal that makes the privacy promise real. The caller sees the primary's own
      // error and reports the failure it already reports; nothing personal leaves for a
      // provider nobody cleared.
      primaryError.fallbackState = FALLBACK_REFUSED
      primaryError.provider = primary.name
      throw primaryError
    }

    const fallbackModel = modelFor(fallback, role) || primaryModel
    const reply = await _factory(fallback).chat.completions.create(
      Object.assign({}, params, fallbackModel ? { model: fallbackModel } : {}),
      _passthrough
    )
    return _tag(reply, fallback.name, FALLBACK_USED)
  }

  return { chat: { completions: { create } } }
}

/**
 * Mark a reply with who answered. A stream is an async iterable and cannot take a property
 * without being consumed, so its facts are returned alongside it instead.
 * @param {*} reply
 * @param {string} provider
 * @param {string} fallbackState
 * @returns {*} the same reply
 */
function _tag (reply, provider, fallbackState) {
  if (reply && typeof reply === 'object' && !reply[Symbol.asyncIterator]) {
    reply.provider = provider
    reply.fallbackState = fallbackState
  }
  return reply
}

/**
 * The suffix every AI log line carries, so a session's provider is readable afterwards.
 * @param {Object|null} reply - a reply from getClient, or null on a failure
 * @param {Error} [err] - the error, when the call failed
 * @returns {string} e.g. "provider=openai fallback=none"
 */
function logSuffix (reply, err) {
  const src = reply || err || {}
  const provider = src.provider || AI.primary.name || 'unknown'
  const state = src.fallbackState || FALLBACK_NONE
  return 'provider=' + provider + ' fallback=' + state
}

/**
 * The line the four no-fallback call sites use, so their logs read the same way and say why.
 * @returns {string}
 */
function logSuffixNoFallback () {
  return 'provider=' + (AI.primary.name || 'openai') + ' fallback=' + FALLBACK_NONE
}

/** Whether a second provider is configured at all — for a startup line, never for a decision. */
function hasFallback () { return _configured(AI.fallback) }

module.exports = {
  ROLES,
  FALLBACK_NONE,
  FALLBACK_USED,
  FALLBACK_REFUSED,
  getClient,
  modelFor,
  isRetryable,
  isEmptyReply,
  logSuffix,
  logSuffixNoFallback,
  hasFallback,
  _setClientFactory
}
