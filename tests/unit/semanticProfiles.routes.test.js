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

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfigsByPrefix: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const routes = require('../../server/routes/semanticProfiles')
const { SIGNAL_REGISTRY } = require('../../server/utils/problemSignals')
const { clearProfileCache } = require('../../server/utils/semanticProfiles')
const LIBRARY = require('../../data/templates.json')

const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

const allTemplates = LIBRARY.templates || LIBRARY
const doTheJob = allTemplates.filter(t => t && t.page && t.menuSection === 'do-the-job')
/** A real page from the real library, so a refusal cannot pass by naming a fake one. */
const KNOWN_PAGE = doTheJob[0].page

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

beforeEach(() => {
  jest.clearAllMocks()
  overlay.loadFirmConfigsByPrefix.mockResolvedValue({})
  clearProfileCache()
})

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
  // Caught for real on 2026-09-16: a non-async handler that omits `next` is refused at
  // mount and the WHOLE BACKEND fails to boot, not just this route. serverMounts.test.js
  // found it; this pins the rule at the handlers themselves. All four are async now that
  // the store reads the overlay, so all four take exactly (req, res).
  test('every handler is async and takes (req, res)', () => {
    for (const name of ['list', 'save', 'history', 'restore']) {
      expect(routes[name].constructor.name).toBe('AsyncFunction')
      expect(routes[name].length).toBe(2)
    }
  })
})

describe('saving a profile — this is what changes an advisor\'s recommendations', () => {
  test('🔴 STORES IT AT THE PLATFORM SCOPE, keyed by page, authored by the TOKEN not the body', async () => {
    overlay.saveFirmConfig.mockResolvedValue({ version: 3 })
    const res = makeMockRes()
    await routes.save({
      params: { page: KNOWN_PAGE },
      body: { profile: { cash_flow_gap: 8 }, note: 'a cash tool', savedBy: 'impostor@x' },
      userEmail: 'mentor@x'
    }, res)

    expect(res._status).toBe(200)
    const [scope, key, value, by] = overlay.saveFirmConfig.mock.calls[0]
    expect(scope).toBe(PLATFORM_SCOPE)
    expect(key).toBe('semantic-profile:' + KNOWN_PAGE)
    expect(value.profile).toEqual({ cash_flow_gap: 8 })
    // The author is the verified token's. A body claiming otherwise is ignored.
    expect(by).toBe('mentor@x')
    expect(value.savedBy).toBe('mentor@x')
  })

  test('an empty tick list is valid — "authored as none", not a rejection', async () => {
    overlay.saveFirmConfig.mockResolvedValue({ version: 1 })
    const res = makeMockRes()
    await routes.save({ params: { page: KNOWN_PAGE }, body: { profile: {} }, userEmail: 'm@x' }, res)
    expect(res._status).toBe(200)
    expect(overlay.saveFirmConfig.mock.calls[0][2].profile).toEqual({})
  })

  test.each([
    ['an unknown signal', { not_a_signal: 5 }],
    ['a weight of 0', { cash_flow_gap: 0 }],
    ['a weight of 11', { cash_flow_gap: 11 }],
    ['a fractional weight', { cash_flow_gap: 4.5 }]
  ])('refuses %s, and writes nothing', async (_label, profile) => {
    const res = makeMockRes()
    await routes.save({ params: { page: KNOWN_PAGE }, body: { profile }, userEmail: 'm@x' }, res)
    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('INVALID_PROFILE')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('refuses a page the library does not hold', async () => {
    const res = makeMockRes()
    await routes.save({ params: { page: 'not-a-real-page' }, body: { profile: { cash_flow_gap: 5 } }, userEmail: 'm@x' }, res)
    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('a store failure returns the safe envelope, never a stack trace', async () => {
    overlay.saveFirmConfig.mockRejectedValue(new Error('C:\\Users\\Mike Barnes\\db.js:42 refused'))
    const errs = jest.spyOn(console, 'error').mockImplementation(() => {})
    const res = makeMockRes()
    await routes.save({ params: { page: KNOWN_PAGE }, body: { profile: { cash_flow_gap: 5 } }, userEmail: 'm@x' }, res)
    expect(res._status).toBe(500)
    expect(JSON.stringify(errorBody(res))).not.toMatch(/Users|\.js:/)
    errs.mockRestore()
  })
})

describe('history and restore — the reversibility that stands in for a test', () => {
  test('history reads the page\'s own key at the platform scope', async () => {
    overlay.getVersionHistory.mockResolvedValue([{ id: 'v2', version: 2, is_active: 1 }])
    const res = makeMockRes()
    await routes.history({ params: { page: KNOWN_PAGE } }, res)
    expect(res._status).toBe(200)
    expect(res._body.history).toHaveLength(1)
    expect(overlay.getVersionHistory).toHaveBeenCalledWith(PLATFORM_SCOPE, 'semantic-profile:' + KNOWN_PAGE)
  })

  test('restore puts a named version back and drops the cache', async () => {
    overlay.restoreVersion.mockResolvedValue({ version: 4 })
    const res = makeMockRes()
    await routes.restore({ params: { page: KNOWN_PAGE }, body: { versionId: 'v1' } }, res)
    expect(res._status).toBe(200)
    expect(overlay.restoreVersion).toHaveBeenCalledWith(PLATFORM_SCOPE, 'semantic-profile:' + KNOWN_PAGE, 'v1')
  })

  test('restore with no version named writes nothing', async () => {
    const res = makeMockRes()
    await routes.restore({ params: { page: KNOWN_PAGE }, body: {} }, res)
    expect(res._status).toBe(400)
    expect(overlay.restoreVersion).not.toHaveBeenCalled()
  })
})

describe('an authored row wins over the compiled one', () => {
  test('🔴 WHAT THE MENTOR SAVED IS WHAT THE LIST REPORTS, and its source says authored', async () => {
    overlay.loadFirmConfigsByPrefix.mockResolvedValue({
      [KNOWN_PAGE]: { profile: { staff_problem: 9 }, note: 'mine', savedBy: 'mentor@x', savedAt: '2026-09-16T00:00:00Z' }
    })
    const res = makeMockRes()
    await routes.list({}, res)
    const row = res._body.templates.find(r => r.page === KNOWN_PAGE)
    expect(row.effective).toEqual({ staff_problem: 9 })
    expect(row.source).toBe('authored')
    expect(row.authoredBy).toBe('mentor@x')
    // The compiled row is kept beside it so the editor can offer "Restore to here".
    expect(row.compiled).toBeTruthy()
  })

  test('🔴 A STORE FAILURE FALLS BACK TO THE COMPILED FILE — the lever never empties', async () => {
    overlay.loadFirmConfigsByPrefix.mockRejectedValue(new Error('db down'))
    const errs = jest.spyOn(console, 'error').mockImplementation(() => {})
    const res = makeMockRes()
    await routes.list({}, res)
    expect(res._status).toBe(200)
    expect(res._body.total).toBe(doTheJob.length)
    // Not an empty map: a blip must degrade to the script's guesses, never to nothing.
    expect(res._body.templates.some(r => Object.keys(r.effective).length > 0)).toBe(true)
    errs.mockRestore()
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
