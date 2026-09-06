'use strict'

/**
 * @file Minimal Node-14-compatible OpenAI REST client — NO SDK.
 *
 * The coding-team ruling (2026-06-15, amends Stack Constitution Req 7): the
 * `openai` SDK is not used (it cannot run on the locked Node 14.15); call the
 * OpenAI REST API directly from the backend, key backend-only.
 *
 * Exposes only the surface this app uses, with the SAME shapes the SDK returned
 * (the SDK is a thin wrapper over the same REST API), so call sites are a
 * drop-in swap of `new OpenAI({apiKey})` → `createOpenAIClient({apiKey})`:
 *
 *   const client = createOpenAIClient({ apiKey })
 *   client.chat.completions.create({ model, messages, max_tokens, temperature,
 *                                    response_format, stream })
 *     - stream falsy → resolves to { choices: [{ message: { content } }], usage, ... }
 *     - stream true  → resolves to an async-iterable of SSE chunks,
 *                      each { choices: [{ delta: { content }, finish_reason }] }
 *
 *   client.responses.create({ model, input, tools, stream })
 *     - the /v1/responses endpoint, added 2026-09-06 for the Economic Analysis
 *       (item 4.66) — the one call in this app that needs the model's own web
 *       search and its `url_citation` annotations, neither of which the chat
 *       completions endpoint returns.
 *     - stream falsy → resolves to the response object { output: [...], usage, ... }
 *     - stream true  → resolves to an async-iterable of SSE events, each carrying
 *                      its own `type` (`response.output_text.delta`,
 *                      `response.web_search_call.searching`, `response.completed`, …)
 *
 *   ⚠ THE RESEARCH CALL MUST STREAM, and that is not a preference. A web-search run
 *   takes 83–102 seconds (`design/ECONOMIC-ANALYSIS-TEST-RUNS.md`), and a non-streamed
 *   POST spends nearly all of it with no bytes on the socket — which is exactly what
 *   the inactivity guard below exists to kill. Streaming keeps traffic flowing AND is
 *   what lets a screen say which search is running.
 *
 * Every piece of model text leaving this client has invisible characters removed
 * first — see `stripStreamContent` below for why that happens here rather than at
 * each call site.
 *
 * Node 14 only: uses the built-in `https` module (no global `fetch`, which is
 * Node 18+) and async generators (Node 10+). CommonJS.
 *
 * @module server/utils/openaiClient
 */

const https = require('https')
const { stripInvisible } = require('./promptSafety')

const DEFAULT_HOST = 'api.openai.com'
const COMPLETIONS_PATH = '/v1/chat/completions'
const RESPONSES_PATH = '/v1/responses'

// Inactivity timeout applied when a caller passes none. This is a per-socket
// idle guard (see postToOpenAI), NOT a total-duration cap, so it is safe for
// long streaming replies — active token traffic keeps resetting it, and only a
// genuine stall (no bytes for this long) trips it.
const DEFAULT_TIMEOUT_MS = 60000

/**
 * Parses a raw OpenAI SSE byte stream into completion chunk objects.
 * Yields each parsed `data:` payload; stops at the `[DONE]` sentinel; silently
 * skips comments, blank lines, and any unparseable line (never throws on a bad
 * chunk — a malformed line must not crash the stream).
 *
 * Exported for unit testing; accepts any async-iterable of Buffer/string.
 *
 * @param {AsyncIterable<Buffer|string>} source - The HTTP response body stream
 * @returns {AsyncGenerator<object>} parsed chunk objects
 */
async function * parseSSEStream (source) {
  let buffer = ''
  for await (const piece of source) {
    buffer += typeof piece === 'string' ? piece : piece.toString('utf8')
    let nl
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl).trim()
      buffer = buffer.slice(nl + 1)
      if (line === '' || line.startsWith(':')) { continue }
      if (!line.startsWith('data:')) { continue }
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') { return }
      try {
        yield JSON.parse(payload)
      } catch (e) {
        // Ignore an unparseable SSE line rather than killing the stream.
      }
    }
  }
}

/**
 * Removes invisible characters from a non-streamed completion's message content.
 * Mutates and returns the same object, so the SDK-shaped result is unchanged in
 * every other respect.
 *
 * @param {object} completion - parsed completion
 * @returns {object} the same completion, content cleaned
 */
function stripCompletionContent (completion) {
  const choices = completion && completion.choices
  if (!Array.isArray(choices)) { return completion }
  for (const choice of choices) {
    const message = choice && choice.message
    if (message && typeof message.content === 'string') {
      message.content = stripInvisible(message.content)
    }
  }
  return completion
}

/**
 * Removes invisible characters from each streamed chunk's content, rejoining a
 * character that arrives split across two chunks before testing it.
 *
 * 🔴 WHY THE CARRY EXISTS. A Unicode tag character (U+E0000..U+E007F — the channel
 * most often used to smuggle text past a human reviewer) is stored as TWO code
 * units. A stream delivers a reply a few characters at a time, so those two halves
 * can land in different chunks; a filter reading one chunk at a time then matches
 * neither half, passes both through, and the browser rejoins them on screen. Holding
 * a trailing half-character back until the next chunk closes that case.
 *
 * It is safe in both directions: a lone half is never valid text by itself, so
 * deferring it is always correct, and an ordinary astral character — an emoji —
 * split the same way is rejoined rather than broken.
 *
 * A half still held when the stream ends is dropped: no partner is coming, and
 * alone it is not a character.
 *
 * ⚠ The carry is kept PER CHOICE INDEX. Chat completions return one choice in
 * practice, but mixing two choices' held halves would corrupt both.
 *
 * @param {AsyncIterable<object>} chunks - parsed completion chunks
 * @returns {AsyncGenerator<object>} the same chunks, content cleaned
 */
async function * stripStreamContent (chunks) {
  const carry = []
  for await (const chunk of chunks) {
    const choices = chunk && chunk.choices
    if (!Array.isArray(choices)) { yield chunk; continue }
    for (let i = 0; i < choices.length; i++) {
      const delta = choices[i] && choices[i].delta
      if (!delta || typeof delta.content !== 'string') { continue }
      let text = (carry[i] || '') + delta.content
      carry[i] = ''
      const last = text.length ? text.charCodeAt(text.length - 1) : 0
      if (last >= 0xD800 && last <= 0xDBFF) {
        carry[i] = text.slice(-1)
        text = text.slice(0, -1)
      }
      delta.content = stripInvisible(text)
    }
    yield chunk
  }
}

/**
 * Performs the HTTPS POST to an OpenAI endpoint.
 * Resolves with the raw `http.IncomingMessage` once headers arrive, so the
 * caller can either buffer it (non-stream) or iterate it (stream).
 *
 * @param {object}  cfg
 * @param {string}  cfg.apiKey
 * @param {string}  cfg.host
 * @param {string}  [cfg.path]        - endpoint path; defaults to chat completions
 * @param {object}  cfg.body          - request body (will be JSON-stringified)
 * @param {number}  [cfg.timeout]     - socket inactivity timeout in ms (0/absent = none)
 * @param {Function} cfg.requestImpl  - https.request-compatible fn (injectable for tests)
 * @returns {Promise<import('http').IncomingMessage>}
 */
function postToOpenAI (cfg) {
  const payload = JSON.stringify(cfg.body)
  return new Promise((resolve, reject) => {
    const req = cfg.requestImpl(
      {
        hostname: cfg.host,
        path: cfg.path || COMPLETIONS_PATH,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.apiKey}`,
          'Content-Length': Buffer.byteLength(payload)
        }
      },
      res => resolve(res)
    )
    // Inactivity guard: abort if the socket sees no traffic for `timeout` ms.
    // Fires on a stalled connect AND a mid-stream stall (any byte resets it), so
    // a hung OpenAI connection can never block the caller forever. Destroying the
    // request rejects this promise (connect phase) or errors the response stream
    // (streaming/buffering phase), which surfaces to the caller as a throw.
    // (Guarded so injected test doubles without setTimeout still work.)
    if (cfg.timeout && cfg.timeout > 0 && typeof req.setTimeout === 'function') {
      req.setTimeout(cfg.timeout, () => {
        const err = new Error(`OpenAI request timed out after ${cfg.timeout}ms of inactivity`)
        if (typeof req.destroy === 'function') { req.destroy(err) } else { reject(err) }
      })
    }
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

/**
 * Removes invisible characters from every text part of a /v1/responses response.
 *
 * The Responses API nests its text differently from chat completions —
 * `output[].content[]` items of type `output_text`, each with its own `text` and
 * `annotations` — so the chat-shaped stripper above does not reach it. Same
 * guarantee, different shape: no model text leaves this client uncleaned.
 *
 * ⚠ ANNOTATIONS ARE NOT TOUCHED. A `url_citation` carries `start_index` /
 * `end_index` into the text, and stripping is what makes those indices
 * trustworthy: invisible characters removed here would otherwise shift every
 * offset after them. `stripInvisible` only ever deletes characters a reader
 * cannot see, so an index computed against the cleaned text is the index a
 * reader would point at — which is the whole basis of the section mapping in
 * `server/report/economicAnalysis/researchResult.js`.
 *
 * @param {object} response - parsed /v1/responses response
 * @returns {object} the same response, text cleaned
 */
function stripResponseOutput (response) {
  if (!response || typeof response !== 'object') { return response }

  const output = response.output
  if (Array.isArray(output)) {
    for (const item of output) {
      const content = item && item.content
      if (!Array.isArray(content)) { continue }
      for (const part of content) {
        if (part && typeof part.text === 'string') {
          part.text = stripInvisible(part.text)
        }
      }
    }
  }

  // Handled outside the block above, not inside it: the SDK-style `output_text`
  // convenience field can arrive on a response carrying no `output` array at all,
  // and an early return would have left that one uncleaned.
  if (typeof response.output_text === 'string') {
    response.output_text = stripInvisible(response.output_text)
  }

  return response
}

/**
 * Removes invisible characters from a streamed /v1/responses event sequence.
 *
 * Two event shapes carry model text and both are cleaned: the incremental
 * `response.output_text.delta`, and the terminal `response.completed` /
 * `response.incomplete`, which repeat the whole response object. Every other
 * event — the `response.web_search_call.*` progress the research screen reads —
 * passes through untouched.
 *
 * The surrogate carry is the same guard, and exists for the same reason, as
 * `stripStreamContent` above: a Unicode tag character split across two chunks
 * would otherwise pass both halves through. It is kept per output item so two
 * concurrent items cannot corrupt each other's held half.
 *
 * @param {AsyncIterable<object>} events - parsed SSE events
 * @returns {AsyncGenerator<object>} the same events, text cleaned
 */
async function * stripResponsesStream (events) {
  const carry = {}
  for await (const event of events) {
    if (!event || typeof event !== 'object') { yield event; continue }

    if (event.type === 'response.output_text.delta' && typeof event.delta === 'string') {
      const slot = String(event.item_id || '') + ':' + String(event.content_index || 0)
      let text = (carry[slot] || '') + event.delta
      carry[slot] = ''
      const last = text.length ? text.charCodeAt(text.length - 1) : 0
      if (last >= 0xD800 && last <= 0xDBFF) {
        carry[slot] = text.slice(-1)
        text = text.slice(0, -1)
      }
      event.delta = stripInvisible(text)
    } else if (event.response && typeof event.response === 'object') {
      stripResponseOutput(event.response)
    }

    yield event
  }
}

/**
 * Reads an entire response stream into a string.
 * @param {AsyncIterable<Buffer|string>} res
 * @returns {Promise<string>}
 */
async function readBody (res) {
  let data = ''
  for await (const piece of res) {
    data += typeof piece === 'string' ? piece : piece.toString('utf8')
  }
  return data
}

/**
 * Creates a minimal OpenAI REST client.
 *
 * @param {object}   opts
 * @param {string}   opts.apiKey            - OpenAI API key (backend env only)
 * @param {string}   [opts.host]            - override host (tests)
 * @param {Function} [opts.requestImpl]     - https.request-compatible fn (tests)
 * @returns {{ chat: { completions: { create: Function } },
 *            responses: { create: Function } }}
 */
function createOpenAIClient (opts) {
  const apiKey = opts && opts.apiKey
  const host = (opts && opts.host) || DEFAULT_HOST
  const requestImpl = (opts && opts.requestImpl) || https.request

  /**
   * @param {object} params - OpenAI chat-completions params (model, messages,
   *   max_tokens, temperature, response_format, stream, …)
   * @param {object} [options] - per-call options
   * @param {number} [options.timeout] - socket inactivity timeout in ms; defaults
   *   to DEFAULT_TIMEOUT_MS when omitted. Pass 0 to disable.
   * @returns {Promise<object|AsyncIterable<object>>} parsed completion, or an
   *   async-iterable of chunks when `params.stream` is true
   */
  async function create (params, options) {
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set')
    }

    const timeout = (options && typeof options.timeout === 'number') ? options.timeout : DEFAULT_TIMEOUT_MS

    const res = await postToOpenAI({ apiKey, host, path: COMPLETIONS_PATH, body: params, requestImpl, timeout })
    const status = res.statusCode || 0

    if (status < 200 || status >= 300) {
      const errBody = await readBody(res)
      throw new Error(`OpenAI API error ${status}: ${errBody.slice(0, 500)}`)
    }

    if (params && params.stream) {
      return stripStreamContent(parseSSEStream(res))
    }

    const raw = await readBody(res)
    return stripCompletionContent(JSON.parse(raw))
  }

  /**
   * POSTs to /v1/responses — the endpoint that can run the model's own web search
   * and return `url_citation` annotations.
   *
   * @param {object} params - Responses API params (model, input, tools, stream, …)
   * @param {object} [options] - per-call options
   * @param {number} [options.timeout] - socket inactivity timeout in ms; defaults
   *   to DEFAULT_TIMEOUT_MS when omitted. Pass 0 to disable.
   * @returns {Promise<object|AsyncIterable<object>>} the response object, or an
   *   async-iterable of SSE events when `params.stream` is true
   */
  async function createResponse (params, options) {
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set')
    }

    const timeout = (options && typeof options.timeout === 'number') ? options.timeout : DEFAULT_TIMEOUT_MS

    const res = await postToOpenAI({ apiKey, host, path: RESPONSES_PATH, body: params, requestImpl, timeout })
    const status = res.statusCode || 0

    if (status < 200 || status >= 300) {
      const errBody = await readBody(res)
      throw new Error(`OpenAI API error ${status}: ${errBody.slice(0, 500)}`)
    }

    if (params && params.stream) {
      return stripResponsesStream(parseSSEStream(res))
    }

    const raw = await readBody(res)
    return stripResponseOutput(JSON.parse(raw))
  }

  return {
    chat: { completions: { create } },
    responses: { create: createResponse }
  }
}

module.exports = {
  createOpenAIClient,
  parseSSEStream,
  stripResponseOutput,
  stripResponsesStream,
  COMPLETIONS_PATH,
  RESPONSES_PATH
}
