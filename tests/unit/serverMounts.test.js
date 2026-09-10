'use strict'

/**
 * THE APPLICATION STARTS. That is the whole of what this file checks, and on 2026-09-10 it
 * was the one thing 9,748 passing tests did not.
 *
 * 🔴 WHAT HAPPENED. Item 4.83's compliance gate — `requireDeclaration`, correctly placed on
 * the backend where a screen cannot be talked out of it — was written as
 * `async function (req, res, next)`. Restify refuses to MOUNT a handler that is both async and
 * takes `next` (`node_modules/restify/lib/chain.js`), and it asserts at MOUNT time. So the
 * process threw while registering routes and exited: not one broken route, but no server at
 * all. It reached `master` and the `v0.11.0` tag, and it was found by starting the app.
 *
 * 🔴 WHY NOTHING CAUGHT IT, WHICH IS THE POINT OF THIS FILE. Route tests call handlers
 * directly, as plain functions — a signature Restify would reject is a signature a unit test
 * never sees. And `serverWiring.test.js`, the only test that loads the bootstrap, MOCKS
 * RESTIFY AWAY so it can inspect the route table; a stub has no rules to break. Its own header
 * names this failure shape — *"green suite, application that would not start"* — and it still
 * could not catch this one, because the fault is in what real Restify does with a handler
 * rather than in which handler was named.
 *
 * So this file mounts every route against REAL Restify, exactly as `npm run backend` does, and
 * fails if any handler cannot be mounted. Nothing binds a port and no request is made.
 *
 * ⚠ IT IS DELIBERATELY ONE ASSERTION AND NO MORE. What each route does is its own test's job;
 * this one answers "does the server come up", and a file that grew a second purpose would
 * start being skipped for slowness.
 */

// Real Restify, with one exception: `listen` must not bind a port in a test run. Everything
// that decides whether a handler is acceptable — the router, the chain, the assertions — is
// the genuine article, which is the entire value of this file. Never widen this mock.
jest.mock('restify', () => {
  const real = jest.requireActual('restify')
  return Object.assign({}, real, {
    createServer (...args) {
      const server = real.createServer(...args)
      server.listen = function listen () { /* no port is bound in a test run */ }
      return server
    }
  })
})

// The bootstrap reads this at require time; keep the dev doors shut so requiring it here can
// never seed Collaborate's demo audit trail into a test run. Same reason as serverWiring.
process.env.ALLOW_DEV_AUTH = 'false'

describe('the backend can actually start', () => {
  test('🔴 every route mounts against real Restify', () => {
    // If any handler is shaped in a way Restify refuses, this require throws exactly as the
    // running server did — with the offending handler and route named in the message.
    expect(() => require('../../server/restify-server.js')).not.toThrow()
  })
})
