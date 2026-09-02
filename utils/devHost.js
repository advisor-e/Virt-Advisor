/**
 * @file Is the page being served from this developer's own machine?
 * @module utils/devHost
 *
 * The one question every page's dev auto-login asks before it hands out a bypass token.
 * It was a hardcoded two-value comparison copied into TWELVE pages, and all twelve were
 * wrong in the same way.
 *
 * 🔴 WHY IT WAS WRONG, AND IT DEADLOCKED THE APP ON THIS MACHINE (found 2026-09-02, by
 * opening it). `nuxt.config.js` binds the dev server to the IPv6 loopback ONLY — `::1`,
 * a deliberate choice with its own long note there, because binding wider made the server
 * network-facing and produced an hour of connection resets. But every dev sign-in
 * recognised only `localhost` and `127.0.0.1`. So on a machine where the browser resolves
 * `localhost` to the IPv4 address first:
 *
 *   - `127.0.0.1:3000`  nothing is listening
 *   - `localhost:3000`  hangs silently, with no error to read
 *   - `[::1]:3000`      loads, and then refuses to sign you in
 *
 * The only address that could reach the server was the one the sign-in rejected.
 *
 * ⚠ `location.hostname` KEEPS THE BRACKETS for an IPv6 literal — it is `[::1]`, not
 * `::1`. Both are accepted here because the bare form is what a person types when they
 * add a case by hand, and a check that quietly fails on the obvious spelling is how this
 * gap survived twelve copies.
 *
 * ⚠ THIS IS A DEVELOPER AFFORDANCE AND NOTHING ELSE. It never widens real access: a
 * deployed app is served from a domain name, and no production hostname is a loopback
 * address. The bypass token it guards is refused by the backend anyway unless
 * `ALLOW_DEV_AUTH=true` is set, which production never sets — so this is the outer of two
 * gates, not the only one.
 *
 * `Array.includes` is fine on the Node 14 target and in every browser this app supports —
 * it is `Array.at` and `Object.hasOwn` that are out (CLAUDE.md, Node 14.15 compatibility).
 */

/**
 * Every spelling of "this machine" that can reach a dev server started from this repo.
 * @type {string[]}
 */
const DEV_HOSTS = ['localhost', '127.0.0.1', '[::1]', '::1']

/**
 * True when the page is served from the developer's own machine.
 *
 * Takes the hostname rather than reading `window` itself, so it is callable from a test
 * without a DOM and cannot break SSR — `window` does not exist while Nuxt renders on the
 * server, and every caller is inside `mounted()` for that reason.
 *
 * @param {string} [hostname] - defaults to the current page's hostname when there is one
 * @returns {boolean}
 */
export function isDevHost (hostname) {
  const host = (typeof hostname === 'string')
    ? hostname
    : (typeof window !== 'undefined' && window.location ? window.location.hostname : '')
  return DEV_HOSTS.includes(host)
}

export default isDevHost
export { DEV_HOSTS }
