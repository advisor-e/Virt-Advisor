'use strict'

/**
 * Tests for the ROUTE TABLE in server/restify-server.js.
 *
 * That file is excluded from coverage (it is a process bootstrap, never imported
 * by a feature test), which left the whole route table unproven: a mistyped
 * handler name registers `undefined`, Restify throws on boot, and every one of
 * the 3,400 other tests still passes. Session 18 lost a session to exactly that
 * shape of defect — green suite, application that would not start.
 *
 * This matters most right after the Collaborate merge (2026-08-01), which put two
 * previously separate servers' route tables into one file: the new failure mode is
 * two apps quietly claiming the same path.
 *
 * Restify is mocked, so nothing binds a port and no request is made.
 */

const registered = []

jest.mock('restify', () => {
  const record = method => (path, ...handlers) => {
    registered.push({ method, path, handlers })
  }
  return {
    createServer: () => ({
      get: record('get'),
      post: record('post'),
      put: record('put'),
      del: record('del'),
      opts: record('opts'),
      use: () => {},
      listen: () => {}
    }),
    plugins: {
      jsonBodyParser: () => [function jsonParser (req, res, next) { next() }],
      queryParser: () => function queryParser (req, res, next) { next() }
    }
  }
})

// The bootstrap reads this at require time; keep the dev doors shut so requiring
// it here can never seed Collaborate's demo audit trail into a test run.
process.env.ALLOW_DEV_AUTH = 'false'

require('../../server/restify-server')

const { firmAuth, collaborateAuth } = require('../../server/middleware/firmAuth')

/** @returns {Array<{method: string, path: string, handlers: Function[]}>} */
function routesUnder (prefix) {
  return registered.filter(r => r.path.indexOf(prefix) === 0)
}

describe('restify-server route table', () => {
  test('every registered handler is a function', () => {
    // A mistyped export (peopleRoute.getFirmConsol) arrives here as `undefined`
    // and takes the whole backend down at boot. This is the check that fails
    // first, and by name, instead of at 4 a.m. on someone's dev server.
    const broken = registered
      .filter(r => r.handlers.some(h => typeof h !== 'function'))
      .map(r => `${r.method.toUpperCase()} ${r.path}`)

    expect(broken).toEqual([])
    expect(registered.length).toBeGreaterThan(100)
  })

  test('no path is claimed twice by the same method', () => {
    // The merge risk in one assertion: two applications' route tables now live in
    // one file, and Restify silently keeps only the FIRST registration for a
    // duplicated path — so the loser's screen breaks with no error anywhere.
    const seen = new Set()
    const duplicates = []
    registered.forEach((r) => {
      const key = `${r.method} ${r.path}`
      if (seen.has(key)) { duplicates.push(key) }
      seen.add(key)
    })

    expect(duplicates).toEqual([])
  })

  describe('Collaborate routes (merged 2026-08-01)', () => {
    test('the people layer and the template catalogue are registered', () => {
      expect(routesUnder('/api/people').length).toBeGreaterThanOrEqual(40)
      expect(registered.some(r => r.method === 'get' && r.path === '/api/templates')).toBe(true)
    })

    test('the manager console the Hub tab will call is registered', () => {
      // These five are what ManagerConsole.vue actually fetches. If the tab ever
      // shows an empty console, this test says whether the route table is the cause.
      const paths = registered.map(r => `${r.method} ${r.path}`)
      expect(paths).toContain('get /api/people/firm')
      expect(paths).toContain('post /api/people/firm/posture')
      expect(paths).toContain('post /api/people/firm/view-as')
      expect(paths).toContain('get /api/people/my-groups')
      expect(paths).toContain('post /api/people/groups/:id/invite-many')
    })

    test('every Collaborate route requires authentication', () => {
      // Identity must come from the verified token on every one of them. A route
      // added without its guard is an unauthenticated read of another firm's people.
      const unguarded = routesUnder('/api/people')
        .concat(registered.filter(r => r.path === '/api/templates'))
        .filter(r => !r.handlers.includes(collaborateAuth))
        .map(r => `${r.method.toUpperCase()} ${r.path}`)

      expect(unguarded).toEqual([])
    })
  })

  test('our own firm-manager routes still sit behind firmAuth', () => {
    // The merge rewrote firmAuth.js. This proves the routes that depended on it
    // are still holding the guard they had before, and did not quietly acquire
    // Collaborate's more permissive dev door.
    const unguarded = routesUnder('/api/firm-manager')
      .filter(r => !r.handlers.includes(firmAuth))
      .map(r => `${r.method.toUpperCase()} ${r.path}`)

    expect(unguarded).toEqual([])
    expect(routesUnder('/api/firm-manager').length).toBeGreaterThan(20)
  })
})
