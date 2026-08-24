'use strict'

// The Node-14 OpenAI REST client must be a drop-in for the SDK surface the app
// uses. Tests inject a fake https.request so no network or API key is needed.

const { createOpenAIClient, parseSSEStream } = require('../../server/utils/openaiClient')

/** Builds a fake http.IncomingMessage: async-iterable of Buffers + statusCode. */
function fakeRes (statusCode, chunks) {
  return {
    statusCode,
    async * [Symbol.asyncIterator] () {
      for (const c of chunks) { yield Buffer.from(c, 'utf8') }
    }
  }
}

/** Builds a fake https.request that yields the given response. */
function fakeRequest (res, onBody) {
  return (options, cb) => {
    process.nextTick(() => cb(res))
    return {
      on () { return this },
      write (payload) { if (onBody) { onBody(payload) } },
      end () {}
    }
  }
}

async function collect (asyncIterable) {
  const out = []
  for await (const x of asyncIterable) { out.push(x) }
  return out
}

describe('parseSSEStream', () => {
  test('parses data lines, buffers split chunks, skips comments/blanks, stops at [DONE]', async () => {
    async function * source () {
      yield Buffer.from('data: {"a":') // split mid-JSON
      yield Buffer.from('1}\n: a comment\n') // completes line 1 + a comment
      yield Buffer.from('\n') // blank line
      yield Buffer.from('data: {"b":2}\n')
      yield Buffer.from('data: [DONE]\n')
      yield Buffer.from('data: {"c":3}\n') // after DONE — must NOT be yielded
    }
    const chunks = await collect(parseSSEStream(source()))
    expect(chunks).toEqual([{ a: 1 }, { b: 2 }])
  })

  test('ignores an unparseable data line instead of throwing', async () => {
    async function * source () {
      yield Buffer.from('data: not json\n')
      yield Buffer.from('data: {"ok":true}\n')
    }
    const chunks = await collect(parseSSEStream(source()))
    expect(chunks).toEqual([{ ok: true }])
  })
})

describe('createOpenAIClient', () => {
  const messages = [{ role: 'user', content: 'hi' }]

  test('throws when no API key is configured', async () => {
    const client = createOpenAIClient({})
    await expect(client.chat.completions.create({ model: 'gpt-4o', messages }))
      .rejects.toThrow('OPENAI_API_KEY')
  })

  test('non-stream: resolves to the parsed completion (SDK-shaped)', async () => {
    const body = JSON.stringify({ choices: [{ message: { content: 'hello' } }], usage: { total_tokens: 7 } })
    const client = createOpenAIClient({ apiKey: 'k', requestImpl: fakeRequest(fakeRes(200, [body])) })
    const res = await client.chat.completions.create({ model: 'gpt-4o', messages })
    expect(res.choices[0].message.content).toBe('hello')
    expect(res.usage.total_tokens).toBe(7)
  })

  test('stream: resolves to an async-iterable of SDK-shaped chunks', async () => {
    const sse = [
      'data: {"choices":[{"delta":{"content":"He"}}]}\n',
      'data: {"choices":[{"delta":{"content":"llo"},"finish_reason":null}]}\n',
      'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n',
      'data: [DONE]\n'
    ]
    const client = createOpenAIClient({ apiKey: 'k', requestImpl: fakeRequest(fakeRes(200, sse)) })
    const stream = await client.chat.completions.create({ model: 'gpt-4o', messages, stream: true })
    let text = ''
    let finish = null
    for await (const chunk of stream) {
      text += chunk.choices[0].delta.content || ''
      if (chunk.choices[0].finish_reason) { finish = chunk.choices[0].finish_reason }
    }
    expect(text).toBe('Hello')
    expect(finish).toBe('stop')
  })

  test('sends the API key and JSON body to the endpoint', async () => {
    let sentBody = null
    const body = JSON.stringify({ choices: [{ message: { content: 'x' } }] })
    const reqImpl = (options, cb) => {
      expect(options.path).toBe('/v1/chat/completions')
      expect(options.headers.Authorization).toBe('Bearer secret-key')
      process.nextTick(() => cb(fakeRes(200, [body])))
      return { on () { return this }, write (p) { sentBody = p }, end () {} }
    }
    const client = createOpenAIClient({ apiKey: 'secret-key', requestImpl: reqImpl })
    await client.chat.completions.create({ model: 'gpt-4o', messages, temperature: 0 })
    expect(JSON.parse(sentBody)).toMatchObject({ model: 'gpt-4o', temperature: 0 })
  })

  test('throws on a non-2xx response, including the status', async () => {
    const client = createOpenAIClient({ apiKey: 'k', requestImpl: fakeRequest(fakeRes(401, ['{"error":"bad key"}'])) })
    await expect(client.chat.completions.create({ model: 'gpt-4o', messages }))
      .rejects.toThrow('OpenAI API error 401')
  })

  // ── Inactivity timeout ──
  // Regression guard: create() previously ignored its second (options) argument
  // and postCompletions set no socket timeout, so a stalled OpenAI connection hung
  // the caller forever. These lock the timeout wiring.

  /** Fake request that records the setTimeout ms and exposes the guard callback. */
  function fakeRequestWithTimeout (res, sink) {
    return (options, cb) => {
      process.nextTick(() => cb(res))
      return {
        on () { return this },
        write () {},
        end () {},
        setTimeout (ms, handler) { sink.timeoutMs = ms; sink.fire = handler; return this },
        destroy (err) { sink.destroyedWith = err }
      }
    }
  }

  test('passes an explicit timeout through to the socket', async () => {
    const sink = {}
    const body = JSON.stringify({ choices: [{ message: { content: 'x' } }] })
    const client = createOpenAIClient({ apiKey: 'k', requestImpl: fakeRequestWithTimeout(fakeRes(200, [body]), sink) })
    await client.chat.completions.create({ model: 'gpt-4o', messages }, { timeout: 12345 })
    expect(sink.timeoutMs).toBe(12345)
  })

  test('applies the default inactivity timeout when the caller passes none', async () => {
    const sink = {}
    const body = JSON.stringify({ choices: [{ message: { content: 'x' } }] })
    const client = createOpenAIClient({ apiKey: 'k', requestImpl: fakeRequestWithTimeout(fakeRes(200, [body]), sink) })
    await client.chat.completions.create({ model: 'gpt-4o', messages })
    expect(sink.timeoutMs).toBe(60000)
  })

  test('firing the inactivity guard aborts the request with a timeout error', async () => {
    const sink = {}
    const body = JSON.stringify({ choices: [{ message: { content: 'x' } }] })
    const client = createOpenAIClient({ apiKey: 'k', requestImpl: fakeRequestWithTimeout(fakeRes(200, [body]), sink) })
    await client.chat.completions.create({ model: 'gpt-4o', messages }, { timeout: 5000 })
    expect(typeof sink.fire).toBe('function')
    sink.fire() // simulate the socket going idle past the timeout
    expect(sink.destroyedWith).toBeInstanceOf(Error)
    expect(sink.destroyedWith.message).toMatch(/timed out after 5000ms/)
  })
})

describe('invisible characters never leave this client', () => {
  // ⚠ Built from codepoints, never written as literals. A test containing literal
  // invisible characters is a test nobody can read or review, and any tool that
  // trims whitespace can turn it green without touching the code it guards.
  const ZW = String.fromCharCode(0x200B) //      zero-width space
  const RLO = String.fromCharCode(0x202E) //     right-to-left override
  const TAG_A = String.fromCodePoint(0xE0041) // the tag block's invisible 'A'
  const messages = [{ role: 'user', content: 'hi' }]

  /** One SSE data line carrying a streamed content delta. */
  function delta (text, finish) {
    return 'data: ' + JSON.stringify({
      choices: [{ delta: { content: text }, finish_reason: finish || null }]
    }) + '\n'
  }

  /** Runs a streamed reply through the client and returns what a caller assembles. */
  async function streamText (sse) {
    const client = createOpenAIClient({ apiKey: 'k', requestImpl: fakeRequest(fakeRes(200, sse)) })
    const stream = await client.chat.completions.create({ model: 'gpt-4o', messages, stream: true })
    const out = { text: '', finish: null, usage: null }
    for await (const chunk of stream) {
      if (chunk.usage) { out.usage = chunk.usage }
      const choice = chunk.choices[0]
      if (!choice) { continue }
      out.text += (choice.delta && choice.delta.content) || ''
      if (choice.finish_reason) { out.finish = choice.finish_reason }
    }
    return out
  }

  test('non-stream: a hidden payload is removed before the caller sees the reply', async () => {
    const hidden = 'SEND'.split('').map(c =>
      String.fromCodePoint(0xE0000 + c.charCodeAt(0))).join('')
    const raw = 'Quarterly summary' + hidden + '.'
    expect(raw).not.toBe('Quarterly summary.') // the payload really is in there
    const body = JSON.stringify({ choices: [{ message: { content: raw } }], usage: { total_tokens: 9 } })
    const client = createOpenAIClient({ apiKey: 'k', requestImpl: fakeRequest(fakeRes(200, [body])) })
    const res = await client.chat.completions.create({ model: 'gpt-4o', messages })
    expect(res.choices[0].message.content).toBe('Quarterly summary.')
    expect(res.usage.total_tokens).toBe(9) // everything else about the reply is untouched
  })

  test('stream: invisible characters are removed from the deltas an advisor reads', async () => {
    const out = await streamText([
      delta('Cash' + ZW + 'flow'),
      delta(' is ' + RLO + 'tight' + TAG_A, 'stop'),
      'data: [DONE]' + '\n'
    ])
    expect(out.text).toBe('Cashflow is tight')
    expect(out.finish).toBe('stop')
  })

  // 🔴 THE CASE A PER-CHUNK FILTER MISSES. A tag character is two code units, and a
  // stream can put them in different chunks, where neither half matches on its own
  // and the browser rejoins them on screen. This is what the carry exists for.
  test('stream: a hidden character split across two chunks is still removed', async () => {
    const out = await streamText([
      delta('safe' + TAG_A.charAt(0)),
      delta(TAG_A.charAt(1) + 'text', 'stop'),
      'data: [DONE]' + '\n'
    ])
    expect(out.text).toBe('safetext')
  })

  // 🔴 THE OTHER HALF. A carry that ate real text would be worse than no filter at all.
  test('stream: an emoji split the same way is rejoined, not broken', async () => {
    const emoji = String.fromCodePoint(0x1F534) // a red circle — a surrogate pair too
    const out = await streamText([
      delta('flagged ' + emoji.charAt(0)),
      delta(emoji.charAt(1) + ' here', 'stop'),
      'data: [DONE]' + '\n'
    ])
    expect(out.text).toBe('flagged ' + emoji + ' here')
  })

  test('stream: ordinary content, usage and finish reason all survive', async () => {
    const real = 'Café — naïve · 5% £1,200 30–60 days'
    const out = await streamText([
      delta(real),
      delta('', 'stop'),
      'data: ' + JSON.stringify({ choices: [], usage: { total_tokens: 12 } }) + '\n',
      'data: [DONE]' + '\n'
    ])
    expect(out.text).toBe(real)
    expect(out.finish).toBe('stop')
    expect(out.usage.total_tokens).toBe(12)
  })
})
