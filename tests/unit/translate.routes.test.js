'use strict'

// Covers server/routes/translate.js — the locale-translation backend route.
// The outbound MyMemory call uses the Node-14 `https` module (NOT global fetch);
// https is mocked here so no real network call is made.

const EventEmitter = require('events')

jest.mock('https')
const https = require('https')
const { post } = require('../../server/routes/translate')

function makeRes () {
  return {
    statusCode: null,
    body: null,
    send (status, body) { this.statusCode = status; this.body = body }
  }
}

// Queue of https.get responses. Each entry is { statusCode, body } for a normal
// response, or { error: 'msg' } to simulate a transport-level error.
function queueHttpsResponses (responses) {
  let i = 0
  https.get.mockImplementation((url, cb) => {
    const cfg = responses[Math.min(i, responses.length - 1)]
    i++
    const reqEmitter = new EventEmitter()
    reqEmitter.setTimeout = jest.fn()
    reqEmitter.destroy = jest.fn()
    if (cfg.error) {
      process.nextTick(() => reqEmitter.emit('error', new Error(cfg.error)))
      return reqEmitter
    }
    const resEmitter = new EventEmitter()
    resEmitter.statusCode = cfg.statusCode
    process.nextTick(() => {
      cb(resEmitter)
      if (cfg.body !== undefined) { resEmitter.emit('data', cfg.body) }
      resEmitter.emit('end')
    })
    return reqEmitter
  })
}

function mmSuccess (translatedText) {
  return { statusCode: 200, body: JSON.stringify({ responseStatus: 200, responseData: { translatedText } }) }
}

beforeEach(() => {
  https.get.mockReset()
  delete process.env.MYMEMORY_EMAIL
})

describe('translate route POST /api/translate/locale', () => {
  describe('parameter validation', () => {
    test('400 when texts is missing — and makes no outbound call', async () => {
      const res = makeRes()
      await post({ body: { langCode: 'fr' } }, res)
      expect(res.statusCode).toBe(400)
      expect(res.body.error.code).toBe('PARAMS_REQUIRED')
      expect(https.get).not.toHaveBeenCalled()
    })
    test('400 when langCode is missing', async () => {
      const res = makeRes()
      await post({ body: { texts: { a: 'Hello' } } }, res)
      expect(res.statusCode).toBe(400)
    })
    test('400 when the body is absent entirely', async () => {
      const res = makeRes()
      await post({}, res)
      expect(res.statusCode).toBe(400)
    })
  })

  describe('happy path (uses https, not fetch)', () => {
    test('translates a single key', async () => {
      queueHttpsResponses([mmSuccess('Bonjour')])
      const res = makeRes()
      await post({ body: { texts: { greeting: 'Hello' }, langCode: 'fr' } }, res)
      expect(res.statusCode).toBe(200)
      expect(res.body).toEqual({ greeting: 'Bonjour' })
      expect(https.get).toHaveBeenCalledTimes(1)
    })

    test('translates multiple keys in one chunk and splits on the separator', async () => {
      queueHttpsResponses([mmSuccess('Bonjour\n\n---SPLIT---\n\nAu revoir')])
      const res = makeRes()
      await post({ body: { texts: { hi: 'Hello', bye: 'Goodbye' }, langCode: 'fr' } }, res)
      expect(res.body).toEqual({ hi: 'Bonjour', bye: 'Au revoir' })
    })

    test('passes MYMEMORY_EMAIL as the de param when set', async () => {
      process.env.MYMEMORY_EMAIL = 'me@example.com'
      queueHttpsResponses([mmSuccess('Bonjour')])
      const res = makeRes()
      await post({ body: { texts: { greeting: 'Hello' }, langCode: 'fr' } }, res)
      expect(https.get.mock.calls[0][0]).toContain('de=me%40example.com')
    })
  })

  describe('chunking large payloads', () => {
    test('splits an oversized payload into multiple https calls', async () => {
      const long = 'x'.repeat(1000) // forces a second chunk after the first key
      queueHttpsResponses([mmSuccess('S'), mmSuccess('L')])
      const res = makeRes()
      await post({ body: { texts: { a: 'short', b: long }, langCode: 'fr' } }, res)
      expect(https.get).toHaveBeenCalledTimes(2)
      expect(res.body).toEqual({ a: 'S', b: 'L' })
    })
  })

  describe('graceful fallback to original text', () => {
    test('falls back on a transport error', async () => {
      queueHttpsResponses([{ error: 'ECONNRESET' }])
      const res = makeRes()
      await post({ body: { texts: { greeting: 'Hello' }, langCode: 'fr' } }, res)
      expect(res.statusCode).toBe(200)
      expect(res.body).toEqual({ greeting: 'Hello' })
    })
    test('falls back on a non-200 HTTP status', async () => {
      queueHttpsResponses([{ statusCode: 429, body: 'Too Many Requests' }])
      const res = makeRes()
      await post({ body: { texts: { greeting: 'Hello' }, langCode: 'fr' } }, res)
      expect(res.body).toEqual({ greeting: 'Hello' })
    })
    test('falls back when MyMemory responseStatus is not 200', async () => {
      queueHttpsResponses([{ statusCode: 200, body: JSON.stringify({ responseStatus: 403, responseDetails: 'quota exceeded' }) }])
      const res = makeRes()
      await post({ body: { texts: { greeting: 'Hello' }, langCode: 'fr' } }, res)
      expect(res.body).toEqual({ greeting: 'Hello' })
    })
    test('falls back on a non-JSON body', async () => {
      queueHttpsResponses([{ statusCode: 200, body: '<html>error</html>' }])
      const res = makeRes()
      await post({ body: { texts: { greeting: 'Hello' }, langCode: 'fr' } }, res)
      expect(res.body).toEqual({ greeting: 'Hello' })
    })
  })
})
