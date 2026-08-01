'use strict'

// Covers server/routes/translate.js — the locale-translation backend route.
// The outbound MyMemory call uses the Node-14 `https` module (NOT global fetch);
// https is mocked here so no real network call is made.

const EventEmitter = require('events')

jest.mock('https')
const https = require('https')
const { post, buildChunks } = require('../../server/routes/translate')

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

describe('buildChunks — caps on ACCUMULATED length, not per-value', () => {
  const SEP = '\n\n---SPLIT---\n\n'.length // 15
  const combinedLen = (chunk, texts) =>
    chunk.reduce((a, k) => a + texts[k].length, 0) + (chunk.length - 1) * SEP

  test('empty input yields no chunks', () => {
    expect(buildChunks([], {})).toEqual([])
  })

  test('many small strings are split so each chunk stays within the limit (the bug)', () => {
    const texts = {}
    const keys = []
    for (let i = 0; i < 40; i++) { const k = 'k' + i; keys.push(k); texts[k] = 'x'.repeat(30) }
    // ~40*30 + 39*15 ≈ 1785 chars total — the old code put ALL of it in one chunk.
    const chunks = buildChunks(keys, texts, 200)
    expect(chunks.length).toBeGreaterThan(1)
    chunks.forEach(c => expect(combinedLen(c, texts)).toBeLessThanOrEqual(200))
    expect(chunks.flat()).toEqual(keys) // every key preserved, in order, none dropped
  })

  test('a run that fits stays in a single chunk', () => {
    const texts = { a: 'x'.repeat(20), b: 'y'.repeat(20), c: 'z'.repeat(20) }
    expect(buildChunks(['a', 'b', 'c'], texts, 200)).toEqual([['a', 'b', 'c']])
  })

  test('a single value larger than the limit gets its own chunk', () => {
    const texts = { a: 'short', big: 'z'.repeat(500), b: 'tail' }
    const chunks = buildChunks(['a', 'big', 'b'], texts, 200)
    expect(chunks).toContainEqual(['big'])
    expect(chunks.flat()).toEqual(['a', 'big', 'b'])
  })

  test('the separator counts toward the accumulated length', () => {
    // 95 + 15(sep) + 95 = 205 > 200 → must split (190 without the separator would not)
    const texts = { a: 'x'.repeat(95), b: 'y'.repeat(95) }
    expect(buildChunks(['a', 'b'], texts, 200)).toEqual([['a'], ['b']])
  })
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

    test('many small strings split across multiple calls, not one oversized URL', async () => {
      const texts = {}
      for (let i = 0; i < 80; i++) { texts['k' + i] = 'hello world ' + i } // ~1000+ chars total
      queueHttpsResponses([mmSuccess('x')])
      const res = makeRes()
      await post({ body: { texts, langCode: 'fr' } }, res)
      // The bug produced a single call (one 1 KB+ URL that MyMemory 414s → all English).
      expect(https.get.mock.calls.length).toBeGreaterThan(1)
      expect(Object.keys(res.body)).toHaveLength(80) // every key returned, none dropped
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

  // The two behaviours this route gained when Collaborate's copy was folded into
  // it (2026-08-01). Neither repo's tests covered them: Collaborate's route had
  // both, but its tests only ever exercised the English default and never looked
  // at what was actually put on the wire.
  describe('merged in from Collaborate', () => {
    test('translates OUT of the language given in `from`, not always English', async () => {
      // Collaborate's chat translates a message written in any language into the
      // reader's. Losing this would silently tell MyMemory the source is English,
      // and it would return the message barely changed — a wrong translation that
      // looks like a working feature.
      queueHttpsResponses([mmSuccess('Hello')])
      const res = makeRes()
      await post({ body: { texts: { greeting: 'Bonjour' }, langCode: 'en', from: 'fr' } }, res)

      expect(https.get.mock.calls[0][0]).toContain('langpair=fr%7Cen')
      expect(res.body).toEqual({ greeting: 'Hello' })
    })

    test('defaults the source language to English when `from` is absent', async () => {
      queueHttpsResponses([mmSuccess('Bonjour')])
      await post({ body: { texts: { greeting: 'Hello' }, langCode: 'fr' } }, makeRes())

      expect(https.get.mock.calls[0][0]).toContain('langpair=en%7Cfr')
    })

    test('sanitises untrusted text before it leaves for the third party', async () => {
      // Control characters are stripped and the value is capped at 5,000 chars, so
      // nothing hostile or unbounded is handed to an external service.
      queueHttpsResponses([mmSuccess('ok')])
      const res = makeRes()
      // Built from char codes, not typed literally — a control character pasted
      // into source is invisible to the next reader and easily 'tidied' away.
      const hostile = 'He' + String.fromCharCode(0) + 'llo' + String.fromCharCode(7)
      await post({ body: { texts: { a: hostile }, langCode: 'fr' } }, res)

      const sentUrl = https.get.mock.calls[0][0]
      expect(sentUrl).toContain('Hello')
      expect(sentUrl).not.toContain('%00')
      expect(sentUrl).not.toContain('%07')
    })

    test('caps an oversized value rather than sending it whole', async () => {
      queueHttpsResponses([mmSuccess('ok')])
      await post({ body: { texts: { a: 'x'.repeat(9000) }, langCode: 'fr' } }, makeRes())

      const sentUrl = https.get.mock.calls[0][0]
      expect(sentUrl).toContain('x'.repeat(5000))
      expect(sentUrl).not.toContain('x'.repeat(5001))
    })

    test('drops prototype-polluting keys instead of forwarding them', async () => {
      queueHttpsResponses([mmSuccess('Bonjour')])
      const res = makeRes()
      const hostile = JSON.parse('{"greeting":"Hello","__proto__":"evil","constructor":"evil"}')
      await post({ body: { texts: hostile, langCode: 'fr' } }, res)

      expect(Object.keys(res.body)).toEqual(['greeting'])
    })
  })
})
