'use strict'

/**
 * @file utils/devHost.js — the check that decides whether a page hands out a dev
 *   bypass token.
 *
 * 🔴 WHY THIS ONE IS TESTED WHEN MOST WORDING AND LAYOUT IS NOT (CLAUDE.md, Mike's
 * ruling of 2026-08-24). A test earns its place when it catches what a person in UAT
 * cannot, and this function decides an AUTHORISATION SHORTCUT. Answering `true` for a
 * host that is not the developer's own machine hands a signed-in session to whoever
 * asked — and it would look perfectly normal on screen, because a working page is
 * exactly what the fault produces.
 *
 * It exists at all because the hardcoded version was wrong in twelve pages at once:
 * the dev server binds the IPv6 loopback only, and no copy of the check recognised it.
 */

const { isDevHost, DEV_HOSTS } = require('../../utils/devHost')

describe('isDevHost — what counts as this machine', () => {
  test.each([
    ['localhost', 'the name a developer types'],
    ['127.0.0.1', 'the IPv4 loopback'],
    ['[::1]', 'what location.hostname returns for the IPv6 loopback — WITH brackets'],
    ['::1', 'the bare form a person writes by hand']
  ])('accepts %s — %s', (host) => {
    expect(isDevHost(host)).toBe(true)
  })

  test('🔴 [::1] is accepted, which is the whole reason this module exists', () => {
    // The dev server binds '::1' and nothing else (nuxt.config.js). Before this, the
    // only address that could reach it was the one the sign-in refused.
    expect(isDevHost('[::1]')).toBe(true)
  })

  test.each([
    ['advisor-e.com', 'the real product'],
    ['uat.advisor-e.com', 'UAT — a real deployment, not a developer machine'],
    ['localhost.evil.com', 'a domain that merely BEGINS with localhost'],
    ['evil.com/localhost', 'a path pretending to be a host'],
    ['192.168.1.10', 'this machine on the LAN — another device could reach it'],
    ['10.0.0.5', 'a private address, still not loopback'],
    ['0.0.0.0', 'the wildcard bind, reachable from off the machine'],
    ['', 'no hostname at all'],
    ['LOCALHOST', 'hostnames arrive lowercased; an uppercase one is not a match we invent']
  ])('refuses %s — %s', (host) => {
    expect(isDevHost(host)).toBe(false)
  })

  test.each([
    [undefined, 'called with nothing, outside a browser'],
    [null, 'an explicit null'],
    [123, 'a number'],
    [{}, 'an object'],
    [['localhost'], 'an array containing a valid host']
  ])('refuses non-string input: %p — %s', (value) => {
    // ⚠ `undefined` falls through to `window.location`, which does not exist under Jest's
    // node environment, so the honest answer is false rather than a thrown error. A page
    // that throws here shows a broken screen; one that answers false shows the sign-in.
    expect(isDevHost(value)).toBe(false)
  })

  test('the accepted list is exactly the four loopback spellings', () => {
    // Pinned deliberately: adding a host here widens an auth shortcut, so it should be a
    // decision someone makes on purpose and not a line that slips in with other work.
    expect(DEV_HOSTS).toEqual(['localhost', '127.0.0.1', '[::1]', '::1'])
  })
})
