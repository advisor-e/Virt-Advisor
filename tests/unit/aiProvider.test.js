'use strict'

/**
 * The provider seam and its once-only fallback (item 4.97 US8, task T012).
 *
 * Held at 100%: this module decides WHERE A CLIENT'S WORDS MAY GO. UAT cannot see any of it —
 * a tester watching a meeting report appear has no way to tell which company's servers wrote
 * it, and the one case that matters most is the one where nothing visible happens at all
 * (personal data, primary down, fallback uncleared: the feature fails exactly as it does
 * today and nothing leaves).
 */

jest.mock('../../server/utils/openaiClient', () => ({
  createOpenAIClient: jest.fn(() => ({ chat: { completions: { create: jest.fn() } } }))
}))

jest.mock('../../config/integration', () => ({
  AI: {
    primary: { name: 'openai', host: 'api.openai.com', apiKey: 'k-primary', models: { classify: 'gpt-4o-mini', narrative: 'gpt-4o-mini', report: 'gpt-4o-mini', course: 'gpt-4o', reading: 'gpt-4o-mini', review: 'gpt-4o-mini', compliance: 'gpt-6-astra', draft: 'gpt-6-astra', research: 'gpt-6-astra', extract: 'gpt-6-astra', translate: 'gpt-4o-mini' } },
    fallback: { name: '', host: '', apiKey: '', chatPath: '/v1/chat/completions', models: {} },
    fallbackPersonalCleared: false
  }
}))

const { AI } = require('../../config/integration')
const { createOpenAIClient } = require('../../server/utils/openaiClient')
const provider = require('../../server/utils/aiProvider')
const {
  getClient, modelFor, isRetryable, isEmptyReply, logSuffix, logSuffixNoFallback, hasFallback,
  ROLES, FALLBACK_NONE, FALLBACK_USED, FALLBACK_REFUSED, _setClientFactory
} = provider

const reply = (content = 'hello') => ({ choices: [{ message: { content } }] })

/** Record every call and answer as scripted, so "who was asked" is testable. */
const scripted = (answers) => {
  const calls = []
  const factory = p => ({
    chat: {
      completions: {
        // Not async: the seam awaits whatever comes back, so a scripted answer may be a
        // value, a promise, or a throw — which is what the real clients do too.
        create: (params, options) => {
          calls.push({ provider: p.name, model: params.model, params, options })
          const next = answers[p.name]
          if (typeof next === 'function') { return next(params, options) }
          return next
        }
      }
    }
  })
  _setClientFactory(factory)
  return calls
}

const withFallback = (over = {}) => {
  AI.fallback = Object.assign({ name: 'acme', host: 'api.acme.test', apiKey: 'k-fallback', chatPath: '/v1/chat/completions', models: { classify: 'acme-small', narrative: 'acme-large' } }, over)
}

const noFallback = () => { AI.fallback = { name: '', host: '', apiKey: '', chatPath: '/v1/chat/completions', models: {} } }

beforeEach(() => {
  noFallback()
  AI.fallbackPersonalCleared = false
})

afterEach(() => { _setClientFactory(null) })

// ── the required flag ─────────────────────────────────────────────────────────

describe('options.personal is required', () => {
  test('a call that omits it throws rather than choosing for the caller', async () => {
    scripted({ openai: reply() })
    await expect(getClient('classify').chat.completions.create({ messages: [] }, {}))
      .rejects.toMatchObject({ code: 'AI_PERSONAL_FLAG_MISSING' })
    await expect(getClient('classify').chat.completions.create({ messages: [] }))
      .rejects.toMatchObject({ code: 'AI_PERSONAL_FLAG_MISSING' })
  })

  test('a non-boolean is not a statement of intent', async () => {
    scripted({ openai: reply() })
    await expect(getClient('classify').chat.completions.create({ messages: [] }, { personal: 'false' }))
      .rejects.toMatchObject({ code: 'AI_PERSONAL_FLAG_MISSING' })
    await expect(getClient('classify').chat.completions.create({ messages: [] }, { personal: 0 }))
      .rejects.toMatchObject({ code: 'AI_PERSONAL_FLAG_MISSING' })
  })

  test('nothing is sent to any provider when the flag is missing', async () => {
    const calls = scripted({ openai: reply() })
    await expect(getClient('classify').chat.completions.create({ messages: [] }, {})).rejects.toThrow()
    expect(calls).toHaveLength(0)
  })
})

// ── the happy path ────────────────────────────────────────────────────────────

describe('the primary answers', () => {
  test('the reply comes back tagged with who answered and no fallback', async () => {
    scripted({ openai: reply('ok') })
    const out = await getClient('classify').chat.completions.create({ messages: [] }, { personal: false })
    expect(out.choices[0].message.content).toBe('ok')
    expect(out.provider).toBe('openai')
    expect(out.fallbackState).toBe(FALLBACK_NONE)
    expect(logSuffix(out)).toBe('provider=openai fallback=none')
  })

  test('the role decides the model, and the caller never names one', async () => {
    const calls = scripted({ openai: reply() })
    await getClient('course').chat.completions.create({ messages: [] }, { personal: false })
    expect(calls[0].model).toBe('gpt-4o')
    await getClient('compliance').chat.completions.create({ messages: [] }, { personal: false })
    expect(calls[1].model).toBe('gpt-6-astra')
  })

  test('the personal flag is not forwarded to the provider', async () => {
    const calls = scripted({ openai: reply() })
    await getClient('report').chat.completions.create({ messages: [] }, { personal: true, timeout: 5000 })
    // `feature` is the role, forwarded so the moderation log can name who asked (item 8.2).
    expect(calls[0].options).toEqual({ timeout: 5000, feature: 'report' })
    expect(calls[0].options.personal).toBeUndefined()
  })

  test('a request the moderation check blocked is never retried on the backup provider (8.2)', () => {
    const blocked = Object.assign(new Error('AI_MODERATION_BLOCKED: self-harm/instructions'), { code: 'AI_MODERATION_BLOCKED' })
    expect(isRetryable(blocked)).toBe(false)
    // A check that could not be REACHED is an outage like any other, and may fall back.
    const unreachable = Object.assign(new Error('moderation unavailable: timeout'), { code: 'AI_MODERATION_UNAVAILABLE' })
    expect(isRetryable(unreachable)).toBe(true)
  })

  test('the fallback is never called when the primary answers', async () => {
    withFallback()
    const calls = scripted({ openai: reply(), acme: reply('WRONG') })
    await getClient('classify').chat.completions.create({ messages: [] }, { personal: false })
    expect(calls.map(c => c.provider)).toEqual(['openai'])
  })
})

// ── the fallback ──────────────────────────────────────────────────────────────

describe('the fallback is tried once, and only once', () => {
  const failWith = msg => () => { throw new Error(msg) }

  test.each([
    ['a rejected key', 'OpenAI API error 401: invalid key'],
    ['no credit', 'OpenAI API error 402: quota exceeded'],
    ['forbidden', 'OpenAI API error 403: forbidden'],
    ['a rate limit', 'OpenAI API error 429: slow down'],
    ['a broken service', 'OpenAI API error 500: internal'],
    ['a bad gateway', 'OpenAI API error 502: bad gateway'],
    ['a dropped socket', 'socket hang up'],
    ['a timeout', 'Request timed out']
  ])('%s sends the call to the fallback', async (_label, msg) => {
    withFallback()
    const calls = scripted({ openai: failWith(msg), acme: reply('from-acme') })
    const out = await getClient('classify').chat.completions.create({ messages: [] }, { personal: false })
    expect(out.choices[0].message.content).toBe('from-acme')
    expect(out.provider).toBe('acme')
    expect(out.fallbackState).toBe(FALLBACK_USED)
    expect(calls.map(c => c.provider)).toEqual(['openai', 'acme'])
    expect(logSuffix(out)).toBe('provider=acme fallback=used')
  })

  test('an empty reply counts as no answer', async () => {
    withFallback()
    const calls = scripted({ openai: reply('   '), acme: reply('real') })
    const out = await getClient('classify').chat.completions.create({ messages: [] }, { personal: false })
    expect(out.provider).toBe('acme')
    expect(calls).toHaveLength(2)
  })

  test('the fallback uses its OWN model for the role', async () => {
    withFallback()
    const calls = scripted({ openai: failWith('socket hang up'), acme: reply() })
    await getClient('narrative').chat.completions.create({ messages: [] }, { personal: false })
    expect(calls[0].model).toBe('gpt-4o-mini')
    expect(calls[1].model).toBe('acme-large')
  })

  test('a fallback that declares no model for the role uses the primary\'s', async () => {
    withFallback({ models: {} })
    const calls = scripted({ openai: failWith('socket hang up'), acme: reply() })
    await getClient('report').chat.completions.create({ messages: [] }, { personal: false })
    expect(calls[1].model).toBe('gpt-4o-mini')
  })

  test('a malformed request is NOT retried — it would be malformed there too', async () => {
    withFallback()
    const calls = scripted({ openai: failWith('OpenAI API error 400: bad request'), acme: reply() })
    await expect(getClient('classify').chat.completions.create({ messages: [] }, { personal: false }))
      .rejects.toThrow('400')
    expect(calls.map(c => c.provider)).toEqual(['openai'])
  })

  test('a failing fallback surfaces its own error, never a third attempt', async () => {
    withFallback()
    const calls = scripted({ openai: failWith('socket hang up'), acme: failWith('OpenAI API error 500: also down') })
    await expect(getClient('classify').chat.completions.create({ messages: [] }, { personal: false }))
      .rejects.toThrow('also down')
    expect(calls).toHaveLength(2)
  })
})

// ── the privacy gate ──────────────────────────────────────────────────────────

describe('personal data reaches only a cleared provider', () => {
  const failWith = msg => () => { throw new Error(msg) }

  test('uncleared: the fallback is NOT called and the feature fails as it does today', async () => {
    withFallback()
    AI.fallbackPersonalCleared = false
    const calls = scripted({ openai: failWith('OpenAI API error 402: quota exceeded'), acme: reply('LEAKED') })
    await expect(getClient('report').chat.completions.create({ messages: [] }, { personal: true }))
      .rejects.toThrow('402')
    expect(calls.map(c => c.provider)).toEqual(['openai'])
  })

  test('the refusal is recorded on the error, so the log line says why', async () => {
    withFallback()
    const calls = scripted({ openai: failWith('socket hang up'), acme: reply() })
    let caught = null
    try {
      await getClient('report').chat.completions.create({ messages: [] }, { personal: true })
    } catch (err) { caught = err }
    expect(caught.fallbackState).toBe(FALLBACK_REFUSED)
    expect(logSuffix(null, caught)).toBe('provider=openai fallback=refused-personal')
    expect(calls).toHaveLength(1)
  })

  test('cleared: personal data may use the fallback', async () => {
    withFallback()
    AI.fallbackPersonalCleared = true
    const calls = scripted({ openai: failWith('socket hang up'), acme: reply('from-acme') })
    const out = await getClient('report').chat.completions.create({ messages: [] }, { personal: true })
    expect(out.provider).toBe('acme')
    expect(calls).toHaveLength(2)
  })

  test('non-personal data is unaffected by the clearance either way', async () => {
    withFallback()
    AI.fallbackPersonalCleared = false
    const calls = scripted({ openai: failWith('socket hang up'), acme: reply() })
    const out = await getClient('classify').chat.completions.create({ messages: [] }, { personal: false })
    expect(out.provider).toBe('acme')
    expect(calls).toHaveLength(2)
  })
})

// ── no fallback configured ────────────────────────────────────────────────────

describe('with no second provider, behaviour is exactly as before', () => {
  test('a failure is rethrown untouched', async () => {
    scripted({ openai: () => { throw new Error('OpenAI API error 500: down') } })
    await expect(getClient('classify').chat.completions.create({ messages: [] }, { personal: false }))
      .rejects.toThrow('OpenAI API error 500: down')
  })

  test.each([
    ['no name', { name: '', host: 'h', apiKey: 'k' }],
    ['no host', { name: 'acme', host: '', apiKey: 'k' }],
    ['no key', { name: 'acme', host: 'h', apiKey: '' }]
  ])('a half-configured fallback (%s) is no fallback', async (_label, cfg) => {
    AI.fallback = Object.assign({ chatPath: '/v1/chat/completions', models: {} }, cfg)
    const calls = scripted({ openai: () => { throw new Error('socket hang up') }, acme: reply() })
    await expect(getClient('classify').chat.completions.create({ messages: [] }, { personal: false }))
      .rejects.toThrow('socket hang up')
    expect(calls).toHaveLength(1)
  })

  test('hasFallback reports the configuration honestly', () => {
    expect(hasFallback()).toBe(false)
    withFallback()
    expect(hasFallback()).toBe(true)
  })
})

// ── streaming ─────────────────────────────────────────────────────────────────

describe('a streamed reply', () => {
  test('is returned untouched, and a connection failure still falls back', async () => {
    withFallback()
    const stream = (async function * () { yield 'a' })()
    const calls = scripted({ openai: () => { throw new Error('socket hang up') }, acme: stream })
    const out = await getClient('narrative').chat.completions.create({ messages: [], stream: true }, { personal: false })
    expect(out).toBe(stream)
    expect(calls).toHaveLength(2)
  })

  test('a stream from the primary is not inspected for emptiness', async () => {
    const stream = (async function * () { yield 'a' })()
    const calls = scripted({ openai: stream })
    const out = await getClient('narrative').chat.completions.create({ messages: [], stream: true }, { personal: false })
    expect(out).toBe(stream)
    expect(calls).toHaveLength(1)
  })
})

// ── roles and helpers ─────────────────────────────────────────────────────────

describe('roles and helpers', () => {
  test('an unknown role is refused at the door', () => {
    expect(() => getClient('nonsense')).toThrow(/unknown role/)
    expect(() => getClient('')).toThrow(/unknown role/)
    expect(() => getClient(null)).toThrow(/unknown role/)
    try { getClient('nonsense') } catch (e) { expect(e.code).toBe('AI_UNKNOWN_ROLE') }
  })

  test('every declared role resolves to a model on the primary', () => {
    ROLES.forEach((role) => {
      expect(typeof modelFor(AI.primary, role)).toBe('string')
      expect(() => getClient(role)).not.toThrow()
    })
  })

  test('modelFor reports nothing rather than an empty string', () => {
    expect(modelFor({ models: { classify: '' } }, 'classify')).toBeNull()
    expect(modelFor({ models: {} }, 'classify')).toBeNull()
    expect(modelFor({}, 'classify')).toBeNull()
    expect(modelFor(null, 'classify')).toBeNull()
    expect(modelFor({ models: { classify: 42 } }, 'classify')).toBeNull()
  })

  test('isRetryable separates a broken service from a bad request', () => {
    expect(isRetryable(new Error('OpenAI API error 401: x'))).toBe(true)
    expect(isRetryable(new Error('OpenAI API error 503: x'))).toBe(true)
    expect(isRetryable(new Error('OpenAI API error 400: x'))).toBe(false)
    expect(isRetryable(new Error('OpenAI API error 404: x'))).toBe(false)
    expect(isRetryable(new Error('ECONNRESET'))).toBe(true)
    expect(isRetryable(null)).toBe(false)
    expect(isRetryable(undefined)).toBe(false)
    // An error carrying no message at all is still a failure to reach the service.
    expect(isRetryable({})).toBe(true)
    expect(isRetryable({ message: null })).toBe(true)
  })

  test('neither provider declaring a model for the role leaves the caller\'s params alone', async () => {
    withFallback({ models: {} })
    const models = AI.primary.models
    AI.primary.models = {}
    try {
      const calls = scripted({ openai: () => { throw new Error('socket hang up') }, acme: reply() })
      await getClient('classify').chat.completions.create({ messages: [] }, { personal: false })
      expect(calls[1].provider).toBe('acme')
      expect(calls[1].model).toBeUndefined()
    } finally { AI.primary.models = models }
  })

  test('isEmptyReply catches every shape a useless answer takes', () => {
    expect(isEmptyReply(null)).toBe(true)
    expect(isEmptyReply({})).toBe(true)
    expect(isEmptyReply({ choices: [] })).toBe(true)
    expect(isEmptyReply({ choices: [{}] })).toBe(true)
    expect(isEmptyReply({ choices: [{ message: {} }] })).toBe(true)
    expect(isEmptyReply({ choices: [{ message: { content: '' } }] })).toBe(true)
    expect(isEmptyReply({ choices: [{ message: { content: '  \n ' } }] })).toBe(true)
    expect(isEmptyReply({ choices: [{ message: { content: 42 } }] })).toBe(true)
    expect(isEmptyReply(reply('x'))).toBe(false)
  })

  test('logSuffix reads the primary when it has neither a reply nor an error', () => {
    expect(logSuffix(null)).toBe('provider=openai fallback=none')
    expect(logSuffix(undefined, undefined)).toBe('provider=openai fallback=none')
  })

  test('the four no-fallback call sites say so in one line', () => {
    expect(logSuffixNoFallback()).toBe('provider=openai fallback=none')
  })

  test('logSuffix falls back to "unknown" when even the primary has no name', () => {
    const name = AI.primary.name
    AI.primary.name = ''
    try {
      expect(logSuffix(null)).toBe('provider=unknown fallback=none')
      expect(logSuffixNoFallback()).toBe('provider=openai fallback=none')
    } finally { AI.primary.name = name }
  })

  test('a provider that declares no model for the role is called without one', async () => {
    const models = AI.primary.models
    AI.primary.models = {}
    try {
      const calls = scripted({ openai: reply() })
      await getClient('classify').chat.completions.create({ messages: [], model: 'caller-choice' }, { personal: false })
      // Nothing is substituted, so whatever the caller passed stands.
      expect(calls[0].model).toBe('caller-choice')
    } finally { AI.primary.models = models }
  })

  test('a reply that is not an object is returned as it is', async () => {
    // Defensive: a client returning a string would otherwise take a property assignment.
    scripted({ openai: reply() })
    const calls = scripted({ openai: () => 'plain-string' })
    // An unusable reply counts as empty, and with no fallback the error surfaces.
    await expect(getClient('classify').chat.completions.create({ messages: [] }, { personal: false }))
      .rejects.toThrow('empty reply')
    expect(calls).toHaveLength(1)
  })
})

// ── the real client factory ───────────────────────────────────────────────────

describe('the default factory builds a real client from the provider config', () => {
  test('it passes the provider\'s own key and host, and nothing else', async () => {
    // The one line no scripted factory ever reaches. It must hand each provider ITS OWN
    // credentials — a fallback called with the primary's key would authenticate as the
    // wrong account and fail in a way no test elsewhere would explain.
    createOpenAIClient.mockClear()
    const created = { chat: { completions: { create: jest.fn().mockResolvedValue(reply('real')) } } }
    createOpenAIClient.mockReturnValue(created)
    _setClientFactory(null) // restore the real _clientFor
    const out = await getClient('classify').chat.completions.create({ messages: [] }, { personal: false })
    expect(createOpenAIClient).toHaveBeenCalledWith({ apiKey: 'k-primary', host: 'api.openai.com' })
    expect(out.provider).toBe('openai')
  })

  test('the fallback is built with the FALLBACK\'s key and host', async () => {
    withFallback()
    createOpenAIClient.mockClear()
    createOpenAIClient
      .mockReturnValueOnce({ chat: { completions: { create: jest.fn().mockRejectedValue(new Error('socket hang up')) } } })
      .mockReturnValueOnce({ chat: { completions: { create: jest.fn().mockResolvedValue(reply('from-acme')) } } })
    _setClientFactory(null)
    const out = await getClient('classify').chat.completions.create({ messages: [] }, { personal: false })
    expect(createOpenAIClient).toHaveBeenNthCalledWith(1, { apiKey: 'k-primary', host: 'api.openai.com' })
    expect(createOpenAIClient).toHaveBeenNthCalledWith(2, { apiKey: 'k-fallback', host: 'api.acme.test' })
    expect(out.provider).toBe('acme')
  })
})
