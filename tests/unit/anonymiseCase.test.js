'use strict'

const {
  anonymiseCaseContent,
  parseAnonymisedResponse
} = require('../../server/utils/anonymiseCase')

/**
 * A fake OpenAI client whose single completion returns `reply` (a string) as the
 * message content. Records calls so tests can assert the API was / wasn't hit.
 */
function fakeClient (reply) {
  const calls = []
  return {
    calls,
    chat: {
      completions: {
        create: (params) => {
          calls.push(params)
          return Promise.resolve({
            choices: [{ message: { content: reply } }],
            usage: { total_tokens: 42 }
          })
        }
      }
    }
  }
}

/** A client that throws — simulates an API/network failure. */
function throwingClient () {
  return {
    chat: { completions: { create: () => Promise.reject(new Error('network down')) } }
  }
}

describe('parseAnonymisedResponse (AI-output validation)', () => {
  test('valid reply → returns summary + content-by-index', () => {
    const raw = JSON.stringify({
      summary: 'The owner runs a small company.',
      messages: [{ i: 0, content: 'scrubbed A' }, { i: 1, content: 'scrubbed B' }]
    })
    const out = parseAnonymisedResponse(raw, 2)
    expect(out.summary).toBe('The owner runs a small company.')
    expect(out.byIndex.get(0)).toBe('scrubbed A')
    expect(out.byIndex.get(1)).toBe('scrubbed B')
  })

  test('malformed JSON → throws ANONYMISE_BAD_JSON', () => {
    expect(() => parseAnonymisedResponse('not json {', 1)).toThrow('ANONYMISE_BAD_JSON')
  })

  test('JSON array (wrong root shape) → throws ANONYMISE_BAD_SHAPE', () => {
    expect(() => parseAnonymisedResponse('[]', 0)).toThrow('ANONYMISE_BAD_SHAPE')
  })

  test('missing summary field → throws ANONYMISE_BAD_SUMMARY', () => {
    const raw = JSON.stringify({ messages: [] })
    expect(() => parseAnonymisedResponse(raw, 0)).toThrow('ANONYMISE_BAD_SUMMARY')
  })

  test('summary present but messages not an array → throws ANONYMISE_BAD_MESSAGES', () => {
    const raw = JSON.stringify({ summary: 'x', messages: 'nope' })
    expect(() => parseAnonymisedResponse(raw, 0)).toThrow('ANONYMISE_BAD_MESSAGES')
  })

  test('a required message index is missing → throws ANONYMISE_INCOMPLETE', () => {
    const raw = JSON.stringify({ summary: 'x', messages: [{ i: 0, content: 'a' }] })
    expect(() => parseAnonymisedResponse(raw, 2)).toThrow('ANONYMISE_INCOMPLETE')
  })

  test('content of wrong type is dropped → throws ANONYMISE_INCOMPLETE', () => {
    const raw = JSON.stringify({ summary: 'x', messages: [{ i: 0, content: 123 }] })
    expect(() => parseAnonymisedResponse(raw, 1)).toThrow('ANONYMISE_INCOMPLETE')
  })

  test('out-of-range / unknown indexes are ignored when all required present', () => {
    const raw = JSON.stringify({
      summary: 'x',
      messages: [{ i: 0, content: 'a' }, { i: 9, content: 'ignored' }]
    })
    const out = parseAnonymisedResponse(raw, 1)
    expect(out.byIndex.get(0)).toBe('a')
    expect(out.byIndex.has(9)).toBe(false)
  })

  test('count 0 → empty map, summary returned', () => {
    const raw = JSON.stringify({ summary: 'just a summary', messages: [] })
    const out = parseAnonymisedResponse(raw, 0)
    expect(out.summary).toBe('just a summary')
    expect(out.byIndex.size).toBe(0)
  })
})

describe('anonymiseCaseContent', () => {
  test('empty case → returns empty without calling the API', async () => {
    const client = fakeClient('SHOULD NOT BE USED')
    const out = await anonymiseCaseContent({ summary: '', transcript: [] }, client)
    expect(out).toEqual({ summary: '', transcript: [], usage: null })
    expect(client.calls.length).toBe(0)
  })

  test('valid → roles preserved from ORIGINAL, content from the model', async () => {
    const reply = JSON.stringify({
      summary: 'The owner is frustrated.',
      messages: [{ i: 0, content: 'advisor words' }, { i: 1, content: 'VA reply' }]
    })
    const client = fakeClient(reply)
    const out = await anonymiseCaseContent({
      summary: 'Dave at Acme Ltd is frustrated.',
      transcript: [
        { role: 'user', content: 'Dave said...' },
        { role: 'assistant', content: 'The VA suggested...' }
      ]
    }, client)

    expect(out.summary).toBe('The owner is frustrated.')
    expect(out.transcript).toEqual([
      { role: 'user', content: 'advisor words' },
      { role: 'assistant', content: 'VA reply' }
    ])
    expect(out.usage).toEqual({ total_tokens: 42 })
    expect(client.calls.length).toBe(1)
    // json_object mode requested
    expect(client.calls[0].response_format).toEqual({ type: 'json_object' })
  })

  test('summary only (no transcript) → still anonymised, empty transcript', async () => {
    const reply = JSON.stringify({ summary: 'A de-identified summary.', messages: [] })
    const client = fakeClient(reply)
    const out = await anonymiseCaseContent({ summary: 'Acme made £2m.', transcript: [] }, client)
    expect(out.summary).toBe('A de-identified summary.')
    expect(out.transcript).toEqual([])
  })

  test('empty model content → throws ANONYMISE_EMPTY', async () => {
    const client = fakeClient('   ')
    await expect(anonymiseCaseContent({ summary: 'x', transcript: [] }, client))
      .rejects.toThrow('ANONYMISE_EMPTY')
  })

  test('model reply missing an index → throws ANONYMISE_INCOMPLETE', async () => {
    const reply = JSON.stringify({ summary: 'x', messages: [{ i: 0, content: 'a' }] })
    const client = fakeClient(reply)
    await expect(anonymiseCaseContent({
      summary: 's',
      transcript: [{ role: 'user', content: 'one' }, { role: 'user', content: 'two' }]
    }, client)).rejects.toThrow('ANONYMISE_INCOMPLETE')
  })

  test('API failure propagates (route turns it into a safe error)', async () => {
    await expect(anonymiseCaseContent({ summary: 'x', transcript: [] }, throwingClient()))
      .rejects.toThrow('network down')
  })
})
