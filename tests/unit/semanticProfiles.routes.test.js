'use strict'

/**
 * @file Template Profiles — the mentor's route (item 4.97 / 7.2 US9, task T055/T057).
 *
 * What these tests are FOR, since the suite is meant to catch what UAT cannot
 * (CLAUDE.md → Testing): this route is the only view anyone has of the resolver's
 * dominant lever. A tool missing from the payload is a tool whose profile nobody can
 * inspect — and a person reading a 205-row screen cannot tell that 15 titles are
 * absent. That is precisely the fault item 7.10 names, and it was reproduced once
 * already on 2026-09-16 by reading the page-keyed registry.
 *
 * 🔴 THE OTHER THREE ROUTES ARE NOT BUILT, so nothing here tests them — Mike's ruling
 * of 2026-09-16 holds the authoring half back with T058. Tests for `PUT /:page`,
 * `/:page/history` and `/:page/restore` belong with the release that builds them;
 * writing them now would assert against code that does not exist.
 *
 * Nothing here asserts wording or CSS — the screen is judged on screen.
 */

const routes = require('../../server/routes/semanticProfiles')
const { SIGNAL_REGISTRY } = require('../../server/utils/problemSignals')
const { clearProfileCache } = require('../../server/utils/semanticProfiles')
const LIBRARY = require('../../data/templates.json')

const allTemplates = LIBRARY.templates || LIBRARY
const doTheJob = allTemplates.filter(t => t && t.page && t.menuSection === 'do-the-job')

function makeMockRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { this._body = body }
  }
}
const errorBody = res => (typeof res._body === 'string' ? JSON.parse(res._body) : res._body)

beforeEach(() => clearProfileCache())

describe('the list the screen reads', () => {
  test('🔴 CARRIES EVERY ONE OF MIKE\'S TOOLS, not just the pages they sit on', async () => {
    const res = makeMockRes()
    await routes.list({}, res)
    expect(res._status).toBe(200)
    expect(res._body.success).toBe(true)

    // Item 7.10: the page-keyed registry holds one template per page and loses 15 tools.
    // A row names its page's primary tool plus every other tool sharing that page.
    const named = res._body.templates.flatMap(r => [r.title, ...r.alsoOnPage])
    expect(named.length).toBe(doTheJob.length)
    expect(res._body.total).toBe(doTheJob.length)
    expect(res._body.pages).toBe(res._body.templates.length)
    expect(res._body.total).toBeGreaterThan(res._body.pages)
    for (const t of doTheJob) {
      expect(named).toContain(t.title)
    }
  })

  test('every row carries the five things the screen decides on', async () => {
    const res = makeMockRes()
    await routes.list({}, res)
    for (const row of res._body.templates) {
      expect(typeof row.page).toBe('string')
      expect(row.effective).toBeTruthy()
      expect(typeof row.source).toBe('string')
      expect(typeof row.thin).toBe('boolean')
      // A thin row must SAY WHY. "Thin with no reason" is a row a mentor cannot act on.
      if (row.thin) {
        expect(row.thinReason).toBeTruthy()
      } else {
        expect(row.thinReason).toBeNull()
      }
      expect(row).toHaveProperty('indicators')
      expect(Array.isArray(row.alsoOnPage)).toBe(true)
    }
  })

  test('the thin count matches the rows flagged thin, so the tile cannot lie', async () => {
    const res = makeMockRes()
    await routes.list({}, res)
    const counted = res._body.templates.filter(r => r.thin).length
    expect(res._body.thinCount).toBe(counted)
    // The recompile of 2026-09-16 left 44 pages with no profile at all, so this is
    // never zero today; a zero would mean the thin rules stopped firing.
    expect(res._body.thinCount).toBeGreaterThan(0)
  })

  test('the signals offered are the registry\'s, so a weight cannot name a signal the engine ignores', async () => {
    const res = makeMockRes()
    await routes.list({}, res)
    const offered = res._body.signals.map(s => s.type)
    expect(offered.sort()).toEqual(Object.keys(SIGNAL_REGISTRY).sort())
    for (const signal of res._body.signals) {
      expect(signal.description).toBeTruthy()
    }
  })

  test('every weight already compiled names a signal the engine knows', async () => {
    const res = makeMockRes()
    await routes.list({}, res)
    for (const row of res._body.templates) {
      for (const signal of Object.keys(row.effective)) {
        expect(SIGNAL_REGISTRY).toHaveProperty(signal)
      }
    }
  })
})

describe('the shape Restify will mount', () => {
  // Caught for real on 2026-09-16: the handler was written `async (req, res)`, lint
  // objected that it never awaits, and making it synchronous without adding `next`
  // made Restify refuse the mount outright — the whole backend failed to start.
  // serverMounts.test.js found it; this pins the rule at the handler itself.
  test('a synchronous handler takes three arguments, or Restify refuses to mount it', () => {
    expect(routes.list.constructor.name).toBe('Function')
    expect(routes.list.length).toBe(3)
  })

  test('calls next so the chain continues', async () => {
    const next = jest.fn()
    await routes.list({}, makeMockRes(), next)
    expect(next).toHaveBeenCalledTimes(1)
  })
})

describe('when the store cannot answer', () => {
  test('returns the safe envelope, never a stack trace', async () => {
    const store = require('../../server/utils/semanticProfiles')
    const spy = jest.spyOn(store, 'listTemplateProfiles').mockImplementation(() => {
      throw new Error('C:\\Users\\Mike Barnes\\Projects\\Virt Advisor\\data broke')
    })
    const errs = jest.spyOn(console, 'error').mockImplementation(() => {})
    const res = makeMockRes()

    await routes.list({}, res)

    expect(res._status).toBe(500)
    const body = errorBody(res)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('PROFILES_UNAVAILABLE')
    expect(JSON.stringify(body)).not.toMatch(/Users|Projects|\.js:/)
    spy.mockRestore()
    errs.mockRestore()
  })
})
