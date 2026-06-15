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
 * Node 14 only: uses the built-in `https` module (no global `fetch`, which is
 * Node 18+) and async generators (Node 10+). CommonJS.
 *
 * @module server/utils/openaiClient
 */

const https = require('https')

const DEFAULT_HOST = 'api.openai.com'
const COMPLETIONS_PATH = '/v1/chat/completions'

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
 * Performs the HTTPS POST to the OpenAI completions endpoint.
 * Resolves with the raw `http.IncomingMessage` once headers arrive, so the
 * caller can either buffer it (non-stream) or iterate it (stream).
 *
 * @param {object}  cfg
 * @param {string}  cfg.apiKey
 * @param {string}  cfg.host
 * @param {object}  cfg.body          - request body (will be JSON-stringified)
 * @param {Function} cfg.requestImpl  - https.request-compatible fn (injectable for tests)
 * @returns {Promise<import('http').IncomingMessage>}
 */
function postCompletions (cfg) {
  const payload = JSON.stringify(cfg.body)
  return new Promise((resolve, reject) => {
    const req = cfg.requestImpl(
      {
        hostname: cfg.host,
        path: COMPLETIONS_PATH,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.apiKey}`,
          'Content-Length': Buffer.byteLength(payload)
        }
      },
      res => resolve(res)
    )
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
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
 * @returns {{ chat: { completions: { create: Function } } }}
 */
function createOpenAIClient (opts) {
  const apiKey = opts && opts.apiKey
  const host = (opts && opts.host) || DEFAULT_HOST
  const requestImpl = (opts && opts.requestImpl) || https.request

  /**
   * @param {object} params - OpenAI chat-completions params (model, messages,
   *   max_tokens, temperature, response_format, stream, …)
   * @returns {Promise<object|AsyncIterable<object>>} parsed completion, or an
   *   async-iterable of chunks when `params.stream` is true
   */
  async function create (params) {
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set')
    }

    const res = await postCompletions({ apiKey, host, body: params, requestImpl })
    const status = res.statusCode || 0

    if (status < 200 || status >= 300) {
      const errBody = await readBody(res)
      throw new Error(`OpenAI API error ${status}: ${errBody.slice(0, 500)}`)
    }

    if (params && params.stream) {
      return parseSSEStream(res)
    }

    const raw = await readBody(res)
    return JSON.parse(raw)
  }

  return { chat: { completions: { create } } }
}

module.exports = { createOpenAIClient, parseSSEStream }
