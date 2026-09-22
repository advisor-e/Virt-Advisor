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

const { firmAuth, collaborateAuth, requireManagerRole } = require('../../server/middleware/firmAuth')

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

  test('🔴 the translation route is guarded — it spends a metered third-party quota', () => {
    // It sat between /api/health and the first guarded route with NO auth at all,
    // found 2026-09-22. The cost is not only the bill: 20 of our 28 languages are
    // translated through it on demand, so exhausting the daily quota silently
    // reverts those readers to English with nothing on screen to explain it.
    const route = registered.find(r => r.path === '/api/translate/locale')
    expect(route).toBeTruthy()
    expect(route.handlers).toContain(firmAuth)
  })

  test('the Sales Tracker routes sit behind firmAuth — an advisor\'s own deals', () => {
    const unguarded = routesUnder('/api/sales')
      .filter(r => !r.handlers.includes(firmAuth))
      .map(r => `${r.method.toUpperCase()} ${r.path}`)

    expect(unguarded).toEqual([])
    // 4 pipeline + 4 COI + metrics + team + 4 lists + 12 blog (stage 5).
    // A route added without its guard fails above.
    expect(routesUnder('/api/sales')).toHaveLength(26)
  })

  test('🔴 NO blog route carries requireManagerRole — they are the advisor\'s own', () => {
    // The mirror image of the Team roll-up below. A manager reading a colleague's
    // deals is a stated ruling; a manager reading their half-written drafts is
    // not, and nobody asked for it. Adding the role here would be a silent
    // widening, so it fails the build instead.
    const managerGated = routesUnder('/api/sales/blog')
      .filter(r => r.handlers.includes(requireManagerRole))
      .map(r => `${r.method.toUpperCase()} ${r.path}`)

    expect(managerGated).toEqual([])
    expect(routesUnder('/api/sales/blog')).toHaveLength(12)
  })

  test('🔴 the Team roll-up and every list WRITE are behind requireManagerRole', () => {
    // This is the access boundary, not a convenience. The team route returns
    // EVERY deal in the firm including private ones (Mike, 2026-09-22), so the
    // role check is the only thing between one advisor and a colleague's private
    // pipeline. It is asserted HERE because it is applied at registration — a
    // route handler cannot test middleware it never runs.
    //
    // ⚠ The source app gated the PAGE, not the data: its middleware/firm-manager.js
    // opens `if (process.server) return`, so /api/team/summary stayed open to
    // anyone signed in while the screen merely redirected.
    const mustBeManager = [
      'get /api/sales/team',
      'put /api/sales/lists/:key',
      'get /api/sales/lists/:key/history',
      'post /api/sales/lists/:key/restore'
    ]
    for (const wanted of mustBeManager) {
      const [method, path] = wanted.split(' ')
      const route = registered.find(r => r.method === method && r.path === path)
      expect(route).toBeTruthy()
      expect(route.handlers).toContain(requireManagerRole)
    }
  })

  test('reading the lists is open to every advisor — the dropdowns need them', () => {
    // Gating the READ would empty the pipeline and COI dropdowns for exactly the
    // people who use them. Changing a list stays the manager's, above.
    const route = registered.find(r => r.method === 'get' && r.path === '/api/sales/lists')
    expect(route.handlers).toContain(firmAuth)
    expect(route.handlers).not.toContain(requireManagerRole)
  })

  test('🔴 the only unguarded routes are health and the anonymous report maths', () => {
    /**
     * The standing check on who may reach the backend without signing in.
     *
     * TWO KINDS OF OPEN ROUTE ARE LEGITIMATE and both are stated here rather than
     * assumed, so a third kind appearing is a failure rather than a shrug:
     *
     *   - `/api/health`, which answers nothing about anybody.
     *   - `/api/report/*`, the model maths: figures in, figures out. They hold no
     *     identity, read no database and return only arithmetic on what the caller
     *     already sent, so there is nothing to scope. That is a design decision,
     *     not an oversight. `GET /api/report/model-guide` is in the same family and
     *     says so at its wiring — "Platform content, no client data, so no
     *     firmAuth" — the shared model records, identical for every firm.
     *
     * `/api/translate/locale` looked like the second kind and was not: it spends a
     * METERED THIRD-PARTY QUOTA that 20 of our 28 languages depend on. It was open
     * to the whole internet until 2026-09-22, and this test exists because nothing
     * would have noticed.
     */
    const open = registered
      .filter(r => r.path.indexOf('/api/') === 0)
      .filter(r => r.handlers.length === 1)
      .map(r => `${r.method.toUpperCase()} ${r.path}`)
      .filter(p => !p.includes('/api/report/'))

    expect(open).toEqual(['GET /api/health'])
  })

  test('an open report route computes only — it never reaches a store', () => {
    // The justification for the exception above, checked rather than trusted: if a
    // report route ever needed the database or an identity, it would need a guard,
    // and the exception would be hiding it.
    const reportRoute = require('../../server/routes/report')
    const src = require('fs').readFileSync(require.resolve('../../server/routes/report'), 'utf8')
    expect(typeof reportRoute).toBe('object')
    expect(src).not.toMatch(/require\(['"]\.\.\/utils\/db['"]\)/)
  })
})
