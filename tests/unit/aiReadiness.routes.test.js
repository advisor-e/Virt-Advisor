'use strict'

/**
 * GET /api/advisor/ai-readiness — whether a backup AI provider is connected, so the advisor
 * is warned BEFORE a conversation rather than when one fails halfway through (item 4.97 US8,
 * Mike's ruling of 2026-09-15: "always give warning but let the user continue").
 *
 * 🔴 WHAT UAT CANNOT SEE, WHICH IS WHY THIS IS TESTED AT ALL. A person can see the banner.
 * What a person cannot see is the THREE things pinned here: that the route leaks no provider
 * name, host or key; that it fails towards SILENCE rather than towards a warning nobody can
 * act on; and that the wiring exists in both files, because on 2026-09-02 and again on
 * 2026-09-11 a route that answered 200 directly was a 404 in the browser for want of one
 * proxy line. The banner's wording is deliberately NOT asserted — Mike's ruling of
 * 2026-08-24: a wrong word is seen instantly in UAT and costs a rewrite in a test.
 */

jest.mock('../../server/utils/aiProvider', () => ({ hasFallback: jest.fn() }))

const fs = require('fs')
const path = require('path')
const { hasFallback } = require('../../server/utils/aiProvider')
const { get } = require('../../server/routes/aiReadiness')

function makeRes () {
  return { _status: null, _body: null, send (status, body) { this._status = status; this._body = body } }
}
const req = () => ({ firmId: 'firm-test-123', userEmail: 'adviser@testfirm.com' })
// Restify hands every callback-based handler a `next`; calling without one is not a case
// the server can produce, so the tests pass one exactly as the chain does.
const next = () => {}

describe('GET /api/advisor/ai-readiness', () => {
  beforeEach(() => { hasFallback.mockReset(); jest.spyOn(console, 'error').mockImplementation(() => {}) })
  afterEach(() => { console.error.mockRestore() })

  test('a configured fallback answers true — no warning is raised', () => {
    hasFallback.mockReturnValue(true)
    const res = makeRes()
    get(req(), res, next)
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ backupProvider: true })
  })

  test('no fallback answers false — this is the case the warning exists for', () => {
    hasFallback.mockReturnValue(false)
    const res = makeRes()
    get(req(), res, next)
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ backupProvider: false })
  })

  // 🔴 A boolean is the whole answer. Which providers a deployment uses is configuration,
  // not something to publish to every signed-in browser.
  test('it names no provider, host or key — only the boolean', () => {
    hasFallback.mockReturnValue(false)
    const res = makeRes()
    get(req(), res, next)
    expect(Object.keys(res._body)).toEqual(['backupProvider'])
  })

  // 🔴 The direction of failure is a decision, not an accident. A warning shown when we do
  // not actually know is a warning advisors learn to scroll past — and then miss the real one.
  test('a failure answers 200 saying a backup IS present — it fails towards silence', () => {
    hasFallback.mockImplementation(() => { throw new Error('config exploded') })
    const res = makeRes()
    get(req(), res, next)
    expect(res._status).toBe(200)
    expect(res._body).toEqual({ backupProvider: true })
    expect(console.error).toHaveBeenCalled()
    expect(JSON.stringify(res._body)).not.toContain('exploded')
  })

  // Synchronous by design (`hasFallback` reads config already in memory), so this asserts
  // it does not THROW rather than that it rejects — a throw here would break the session.
  test('it never throws, so it can never break a session', () => {
    hasFallback.mockImplementation(() => { throw new Error('boom') })
    expect(() => get(req(), makeRes(), next)).not.toThrow()
  })

  // 🔴 THE SHAPE RESTIFY DEMANDS, AND THE ONE A UNIT TEST CANNOT SEE. A handler that is
  // neither `async (req, res)` nor `(req, res, next)` is refused AT MOUNT and the server does
  // not start — the whole reason serverMounts.test.js exists. This route was written async,
  // lint removed the async (nothing to await), and the mount guard caught it the same hour.
  test('it is callback-shaped, and it always calls next', () => {
    expect(get.length).toBe(3)
    expect(get.constructor.name).toBe('Function')
    hasFallback.mockReturnValue(true)
    const spy = jest.fn()
    get(req(), makeRes(), spy)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  test('next is called even when the read fails, so the chain never stalls', () => {
    hasFallback.mockImplementation(() => { throw new Error('boom') })
    const spy = jest.fn()
    get(req(), makeRes(), spy)
    expect(spy).toHaveBeenCalledTimes(1)
  })
})

describe('the wiring — a route the browser is never allowed to ask for is not a route', () => {
  const root = path.join(__dirname, '../../')
  const read = f => fs.readFileSync(path.join(root, f), 'utf8')

  test('mounted on the backend behind firmAuth, as the vocabulary read is', () => {
    expect(read('server/restify-server.js'))
      .toMatch(/server\.get\('\/api\/advisor\/ai-readiness', firmAuth, aiReadinessRoute\.get\)/)
  })

  test('registered on the Nuxt proxy through the shared thin proxy, ABOVE the SSE entry', () => {
    const lines = read('nuxt.config.js').split('\n')
    const ours = lines.findIndex(l => l.includes("path: '/api/advisor/ai-readiness'"))
    const sse = lines.findIndex(l => l.includes("path: '/api/advisor', handler"))
    expect(ours).toBeGreaterThan(-1)
    expect(lines[ours]).toContain('apiProxy.js')
    // The SSE proxy forwards only POST /query and calls next() for anything else, so a
    // GET mounted below it falls through to a Nuxt 404 — the /api/advisor/staircase rule.
    expect(sse).toBeGreaterThan(ours)
  })

  test('the screen asks for the proxy path with the session token and reads the flag', () => {
    const src = read('components/VirtualAdvisor.vue')
    expect(src).toMatch(/fetch\('\/api\/advisor\/ai-readiness'/)
    expect(src).toMatch(/data\.backupProvider === false/)
  })

  // Once per conversation, not per message (Mike, 2026-09-15). `selectMode` is the single
  // entry to every conversation, so the call belongs there and nowhere else.
  test('it is asked once when a mode is chosen, never per message', () => {
    const src = read('components/VirtualAdvisor.vue')
    expect(src).toMatch(/this\.loadAiReadiness\(\)/)
    expect((src.match(/this\.loadAiReadiness\(\)/g) || []).length).toBe(1)
  })
})
