'use strict'

/**
 * @file Item 7.21 — the AI's own replies, kept on the server so a follow-up sees them whole.
 *
 * The conversation history arrives from the browser, and sanitiseInput cuts every message in
 * it to MAX_FIELD characters, because anything in it could have been written by the caller.
 * A client-chat recommendation runs 3,500-5,800 characters, so a follow-up was answered with
 * about half of the advice gone. The cut stays; instead the server keeps what it sent, and a
 * cut AI message is replaced by the server's copy ONLY where that copy begins with exactly
 * what the browser sent back. Nothing the AI did not write can be lengthened this way.
 *
 * Design: design/FOLLOW-UP-FULL-REPLIES.md
 * @module server/utils/followUpReplies
 */

const { MAX_FIELD } = require('./sanitiseInput')

/** The history replays at most 20 messages, so at most 10 are the AI's. */
const MAX_KEPT_REPLIES = 10
/** A recommendation may be 2,500 tokens, about 10,000 characters. */
const MAX_KEPT_CHARS = 12000

/**
 * The kept replies with one more added, oldest dropped past the cap.
 * @param {string[]|undefined} replies
 * @param {string} text - the reply exactly as the advisor received it
 * @returns {string[]}
 */
function rememberReply (replies, text) {
  const kept = Array.isArray(replies) ? replies : []
  if (typeof text !== 'string' || !text) { return kept }
  return kept.concat(text.slice(0, MAX_KEPT_CHARS)).slice(-MAX_KEPT_REPLIES)
}

/**
 * The history with each cut AI message restored from the server's own copy. A message is
 * touched only when it was actually cut (it is MAX_FIELD long) and a kept reply begins with
 * it; leading whitespace is ignored on both sides because the screen trims a reply when it
 * removes a selector marker. Anything else passes through exactly as the browser sent it.
 *
 * @param {Array<{role: string, content: string}>} history - already sanitised
 * @param {string[]|undefined} replies - this session's kept replies, oldest first
 * @returns {Array<{role: string, content: string}>}
 */
function restoreFullReplies (history, replies) {
  if (!Array.isArray(history) || !Array.isArray(replies) || replies.length === 0) { return history }
  return history.map((m) => {
    if (m.role !== 'assistant' || typeof m.content !== 'string' || m.content.length < MAX_FIELD) { return m }
    const sent = m.content.trimStart()
    for (let i = replies.length - 1; i >= 0; i--) {
      const kept = replies[i].trimStart()
      if (kept.length > sent.length && kept.startsWith(sent)) { return { role: m.role, content: kept } }
    }
    return m
  })
}

/**
 * Who a conversation session belongs to: the verified firm and advisor, never the body.
 * @param {{firmId: ?string, advisorId: ?string}|undefined} identity
 * @returns {string}
 */
function sessionOwnerKey (identity) {
  const who = identity || {}
  return JSON.stringify([who.firmId || null, who.advisorId || null])
}

module.exports = { rememberReply, restoreFullReplies, sessionOwnerKey, MAX_KEPT_REPLIES, MAX_KEPT_CHARS }
