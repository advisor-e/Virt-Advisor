'use strict'

/**
 * Tests for the translation route (server/routes/translate.js) — the backend's
 * single home for the third-party MyMemory call (architecture boundary).
 *
 * The outbound `https` module is mocked so these tests make NO real network
 * calls. The key guarantees under test: missing params are rejected, and an
 * upstream failure degrades GRACEFULLY (falls back to the original text rather
 * than dropping strings or failing the whole request).
 */

jest.mock('https')
const https = require('https')
// Collaborate's own copy of this route was folded into server/routes/translate.js
// when the two back-ends merged. These tests point at the surviving route and are
// kept as they are: they pin the half of the behaviour that came FROM Collaborate
// (graceful degradation and shape validation), so a regression in it still fails here.
const translate = require('../../server/routes/translate')

/**
 * Make https.get(url, cb) invoke `cb` with a fake response that emits the given
 * body then 'end', and return a fake request object with on()/setTimeout().
 */
function mockHttpsResponse (statusCode, body) {
  https.get.mockImplementation((url, cb) => {
    const fakeRes = {
      statusCode,
      on (event, handler) {
        if (event === 'data' && body) { handler(body) }
        if (event === 'end') { handler() }
        return fakeRes
      }
    }
    cb(fakeRes)
    return { on: jest.fn(), setTimeout: jest.fn() }
  })
}

/**
 * Make https.get reject at the transport level: the request object's 'error'
 * handler fires (no response is ever delivered), so httpsGet rejects.
 */
function mockHttpsNetworkError () {
  https.get.mockImplementation(() => ({
    on (event, handler) { if (event === 'error') { handler(new Error('Network down')) } return this },
    setTimeout: jest.fn()
  }))
}

describe('translate route', () => {
  beforeEach(() => { https.get.mockReset() })

  test('returns 400 PARAMS_REQUIRED when texts or langCode are missing', async () => {
    const res = { send: jest.fn() }
    await translate.post({ body: { langCode: 'de' } }, res)

    expect(res.send).toHaveBeenCalledWith(400, expect.objectContaining({
      success: false,
      error: expect.objectContaining({ code: 'PARAMS_REQUIRED' })
    }))
    expect(https.get).not.toHaveBeenCalled()
  })

  test('returns the translated text on a successful MyMemory response', async () => {
    mockHttpsResponse(200, JSON.stringify({
      responseStatus: 200,
      responseData: { translatedText: 'Hallo' }
    }))

    const res = { send: jest.fn() }
    await translate.post({ body: { texts: { greeting: 'Hello' }, langCode: 'de' } }, res)

    const [status, payload] = res.send.mock.calls[0]
    expect(status).toBe(200)
    expect(payload.greeting).toBe('Hallo')
  })

  test('falls back to the original text when MyMemory returns a non-200', async () => {
    mockHttpsResponse(500, '')

    const res = { send: jest.fn() }
    await translate.post({ body: { texts: { greeting: 'Hello' }, langCode: 'de' } }, res)

    const [status, payload] = res.send.mock.calls[0]
    expect(status).toBe(200)
    expect(payload.greeting).toBe('Hello') // original preserved — nothing dropped
  })

  test('falls back to the original text when MyMemory returns non-JSON', async () => {
    mockHttpsResponse(200, 'this is not json')

    const res = { send: jest.fn() }
    await translate.post({ body: { texts: { greeting: 'Hello' }, langCode: 'de' } }, res)

    const [, payload] = res.send.mock.calls[0]
    expect(payload.greeting).toBe('Hello')
  })

  test('falls back when the JSON is valid but the shape is wrong', async () => {
    // 200 + parseable JSON, but responseData.translatedText is missing — the
    // shape validator must reject it rather than trust malformed output.
    mockHttpsResponse(200, JSON.stringify({ responseStatus: 200, responseData: {} }))

    const res = { send: jest.fn() }
    await translate.post({ body: { texts: { greeting: 'Hello' }, langCode: 'de' } }, res)

    const [, payload] = res.send.mock.calls[0]
    expect(payload.greeting).toBe('Hello')
  })

  test('falls back to the original text on a transport/network error', async () => {
    mockHttpsNetworkError()

    const res = { send: jest.fn() }
    await translate.post({ body: { texts: { greeting: 'Hello' }, langCode: 'de' } }, res)

    const [status, payload] = res.send.mock.calls[0]
    expect(status).toBe(200)
    expect(payload.greeting).toBe('Hello') // nothing dropped despite the outage
  })

  test('splits a large payload into multiple chunked requests', async () => {
    mockHttpsResponse(200, JSON.stringify({
      responseStatus: 200,
      responseData: { translatedText: 'Übersetzt' }
    }))

    // Three values each longer than CHUNK_CHARS (900) force one request per key.
    const big = 'x'.repeat(950)
    const texts = { a: big, b: big, c: big }

    const res = { send: jest.fn() }
    await translate.post({ body: { texts, langCode: 'de' } }, res)

    const [status, payload] = res.send.mock.calls[0]
    expect(status).toBe(200)
    expect(https.get).toHaveBeenCalledTimes(3) // one request per oversized key
    expect(payload).toEqual({ a: 'Übersetzt', b: 'Übersetzt', c: 'Übersetzt' })
  })
})
