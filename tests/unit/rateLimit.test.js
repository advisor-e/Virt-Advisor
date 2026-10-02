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

// Item 7.27. Every request reaches the backend from the Nuxt server, so all share one
// address; the count must follow the signed-in person firmAuth attached instead.
describe('createLimiter — counted per signed-in person', () => {
  const NUXT = '10.0.0.5'
  function signedIn (firmId, advisorId, address = NUXT, userEmail = null) {
    return { ...makeReq(address), firmId, advisorId, userEmail }
  }

  test('five advisors behind one address each get their own limit — 10 of 40 were refused before', () => {
    const limited = createLimiter(30)
    const advisors = [['f1', 'a1'], ['f1', 'a2'], ['f2', 'b1'], ['f2', 'b2'], ['f3', 'c1']]
    let refused = 0
    for (let i = 0; i < 8; i++) {
      for (const [firm, advisor] of advisors) {
        if (!limited(signedIn(firm, advisor), makeRes())) { refused++ }
      }
    }
    expect(refused).toBe(0)
  })

  test('one advisor is refused past the limit, even from different addresses', () => {
    const limited = createLimiter(2)
    expect(limited(signedIn('f1', 'a1', '1.1.1.1'), makeRes())).toBe(true)
    expect(limited(signedIn('f1', 'a1', '2.2.2.2'), makeRes())).toBe(true)
    const blocked = makeRes()
    expect(limited(signedIn('f1', 'a1', '3.3.3.3'), blocked)).toBe(false)
    expect(blocked._status).toBe(429)
  })

  test('the same advisor id in two firms counts separately', () => {
    const limited = createLimiter(1)
    expect(limited(signedIn('f1', 'shared-id'), makeRes())).toBe(true)
    expect(limited(signedIn('f2', 'shared-id'), makeRes())).toBe(true)
    expect(limited(signedIn('f1', 'shared-id'), makeRes())).toBe(false)
  })

  test('a colon inside an id cannot make two people share a count', () => {
    const limited = createLimiter(1)
    expect(limited(signedIn('a:b', 'c'), makeRes())).toBe(true)
    expect(limited(signedIn('a', 'b:c'), makeRes())).toBe(true)
  })

  test('a sign-in with no advisor id is counted by its email within the firm', () => {
    const limited = createLimiter(1)
    expect(limited(signedIn('f1', null, NUXT, 'one@firm.test'), makeRes())).toBe(true)
    expect(limited(signedIn('f1', null, NUXT, 'two@firm.test'), makeRes())).toBe(true)
    expect(limited(signedIn('f1', null, '9.9.9.9', 'one@firm.test'), makeRes())).toBe(false)
  })

  test('identity in the body or a header is never read — only what firmAuth attached', () => {
    const limited = createLimiter(1)
    const forged = advisorId => ({ ...makeReq(NUXT, { 'x-advisor-id': advisorId }), body: { advisorId } })
    expect(limited(forged('x1'), makeRes())).toBe(true)
    expect(limited(forged('x2'), makeRes())).toBe(false) // same address window, forged ids ignored
  })
})
