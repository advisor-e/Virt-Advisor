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
})
