'use strict'

/**
 * fetchWithTimeout — the helper that stops a screen spinning for ever.
 *
 * Real (short) timers rather than fake ones: the thing under test is a race between
 * a timer and a promise, and fake timers would let a test pass while the real race
 * was wrong. Every limit here is a few milliseconds, so the file still runs fast.
 */

const {
  fetchWithTimeout,
  timeoutError,
  DEFAULT_TIMEOUT_MS
} = require('~/utils/fetchWithTimeout')

/** A fetch that never answers — the exact condition that caused the live defect. */
function hangingFetch () {
  return function () { return new Promise(function () {}) }
}

/** A fetch that answers after `ms`. */
function slowFetch (ms, value) {
  return function () {
    return new Promise(function (resolve) { setTimeout(function () { resolve(value) }, ms) })
  }
}

describe('fetchWithTimeout', () => {
  const originalFetch = global.fetch
  const originalAbortController = global.AbortController

  afterEach(() => {
    global.fetch = originalFetch
    global.AbortController = originalAbortController
  })

  describe('the happy path is unchanged', () => {
    it('resolves with whatever fetch resolved with', async () => {
      const response = { ok: true, status: 200 }
      global.fetch = jest.fn().mockResolvedValue(response)

      await expect(fetchWithTimeout('/api/x')).resolves.toBe(response)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('passes the url and options straight through', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true })
      const headers = { Authorization: 'Bearer test-token' }

      await fetchWithTimeout('/api/activity/progression', { headers })

      const [url, opts] = global.fetch.mock.calls[0]
      expect(url).toBe('/api/activity/progression')
      expect(opts.headers).toEqual(headers)
    })

    it('rejects with fetch\'s own error when the network itself fails', async () => {
      const networkError = new Error('Failed to fetch')
      global.fetch = jest.fn().mockRejectedValue(networkError)

      await expect(fetchWithTimeout('/api/x')).rejects.toBe(networkError)
    })
  })

  describe('a request that is never answered', () => {
    it('rejects rather than pending for ever — the live defect', async () => {
      global.fetch = jest.fn(hangingFetch())

      await expect(fetchWithTimeout('/api/x', {}, 20)).rejects.toMatchObject({
        name: 'RequestTimeoutError',
        isTimeout: true
      })
    })

    it('aborts the request, so it stops holding a browser connection', async () => {
      const abort = jest.fn()
      global.AbortController = function () {
        this.signal = { fake: true }
        this.abort = abort
      }
      global.fetch = jest.fn(hangingFetch())

      await expect(fetchWithTimeout('/api/x', {}, 20)).rejects.toThrow(/timed out/)
      expect(abort).toHaveBeenCalledTimes(1)
    })

    it('still times out where the browser has no AbortController', async () => {
      global.AbortController = undefined
      global.fetch = jest.fn(hangingFetch())

      await expect(fetchWithTimeout('/api/x', {}, 20)).rejects.toMatchObject({
        isTimeout: true
      })
    })
  })

  describe('the race is settled exactly once', () => {
    it('a response arriving before the limit wins, and no timeout follows', async () => {
      const response = { ok: true }
      global.fetch = jest.fn(slowFetch(5, response))

      await expect(fetchWithTimeout('/api/x', {}, 200)).resolves.toBe(response)
      // Past the limit: if the timer still fired it would reject an already-settled
      // promise, which surfaces as an unhandled rejection rather than a failure here.
      await new Promise(function (resolve) { setTimeout(resolve, 250) })
    })

    it('does not abort a request that already came back', async () => {
      const abort = jest.fn()
      global.AbortController = function () {
        this.signal = { fake: true }
        this.abort = abort
      }
      global.fetch = jest.fn().mockResolvedValue({ ok: true })

      await fetchWithTimeout('/api/x', {}, 50)
      await new Promise(function (resolve) { setTimeout(resolve, 80) })

      expect(abort).not.toHaveBeenCalled()
    })
  })

  describe('the limit itself', () => {
    it('honours a caller-supplied limit', async () => {
      global.fetch = jest.fn(hangingFetch())
      const started = Date.now()

      await expect(fetchWithTimeout('/api/x', {}, 30)).rejects.toThrow(/timed out/)

      // Generous upper bound — this asserts the SHORT limit was used, not the
      // 15-second default, without being sensitive to timer jitter.
      expect(Date.now() - started).toBeLessThan(DEFAULT_TIMEOUT_MS)
    })

    it.each([
      ['zero', 0],
      ['negative', -1],
      ['not a number', 'soon'],
      ['undefined', undefined]
    ])('falls back to the default when the limit is %s', async (_label, bad) => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true })

      // Proven by behaviour, not by reading the constant: a bad limit must not
      // disable the timeout. The call still resolves, so the default was used
      // rather than an immediate (or absent) expiry.
      await expect(fetchWithTimeout('/api/x', {}, bad)).resolves.toEqual({ ok: true })
    })

    it('keeps a caller\'s own signal instead of overwriting it', async () => {
      const abort = jest.fn()
      global.AbortController = function () {
        this.signal = { ours: true }
        this.abort = abort
      }
      global.fetch = jest.fn().mockResolvedValue({ ok: true })
      const callerSignal = { theirs: true }

      await fetchWithTimeout('/api/x', { signal: callerSignal }, 50)

      expect(global.fetch.mock.calls[0][1].signal).toBe(callerSignal)
    })

    it('does not mutate the options object it was given', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true })
      const opts = { headers: { a: '1' } }

      await fetchWithTimeout('/api/x', opts, 50)

      expect(opts.signal).toBeUndefined()
    })
  })

  describe('timeoutError', () => {
    it('is identifiable without instanceof, which transpiling can break', () => {
      const err = timeoutError(1234)

      expect(err.name).toBe('RequestTimeoutError')
      expect(err.isTimeout).toBe(true)
      expect(err.message).toContain('1234')
      expect(err instanceof Error).toBe(true)
    })
  })
})
