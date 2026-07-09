'use strict'

// The limiter is security-load-bearing: it throttles the OpenAI-backed routes.
// Regression guard for the spoof bug — it used to key on the client-controlled
// X-Forwarded-For header, so rotating that value bypassed the limit entirely.
// By default it must now key on the real socket peer and ignore the header.

const { createLimiter } = require('../../server/utils/rateLimit')

function makeReq (remoteAddress, headers = {}) {
  return { socket: { remoteAddress }, headers }
}

function makeRes () {
  return { _status: null, writeHead (s) { this._status = s }, end () {} }
}

describe('createLimiter', () => {
  test('allows up to the limit, then blocks with 429', () => {
    const limited = createLimiter(2)
    const res1 = makeRes(); const res2 = makeRes(); const res3 = makeRes()
    expect(limited(makeReq('1.1.1.1'), res1)).toBe(true)
    expect(limited(makeReq('1.1.1.1'), res2)).toBe(true)
    expect(limited(makeReq('1.1.1.1'), res3)).toBe(false)
    expect(res3._status).toBe(429)
  })

  test('counts different socket peers in separate windows', () => {
    const limited = createLimiter(1)
    expect(limited(makeReq('1.1.1.1'), makeRes())).toBe(true)
    expect(limited(makeReq('2.2.2.2'), makeRes())).toBe(true) // different peer, own window
    expect(limited(makeReq('1.1.1.1'), makeRes())).toBe(false) // first peer over limit
  })

  test('SPOOF GUARD: rotating X-Forwarded-For does NOT create fresh windows', () => {
    const limited = createLimiter(2)
    // Same socket peer, but a different spoofed XFF on every request. Before the
    // fix each landed in a new bucket and never tripped the limit.
    expect(limited(makeReq('9.9.9.9', { 'x-forwarded-for': '10.0.0.1' }), makeRes())).toBe(true)
    expect(limited(makeReq('9.9.9.9', { 'x-forwarded-for': '10.0.0.2' }), makeRes())).toBe(true)
    const blocked = makeRes()
    expect(limited(makeReq('9.9.9.9', { 'x-forwarded-for': '10.0.0.3' }), blocked)).toBe(false)
    expect(blocked._status).toBe(429)
  })
})
