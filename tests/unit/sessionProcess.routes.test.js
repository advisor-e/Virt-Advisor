'use strict'

// The standard planning session's routes — item 15.1, Decision C (Mike, 2026-09-21).
//
// The cascade's own behaviour is tests/unit/sessionProcess.test.js; this file is about what
// the HTTP layer lets through.
//
// 🔴 THE TESTS THIS FILE EXISTS FOR:
//
//   1. THE TIER COMES FROM THE TOKEN, NEVER THE REQUEST. One screen serves all four
//      managing tiers, and which one a save lands on is `req.firmId`. A scope read from a
//      body would let a firm manager overwrite the mentor's session for every firm on the
//      platform — and the screen would look identical while doing it.
//   2. A MALFORMED SAVE IS REFUSED WITH 400, NOT STORED. What is stored here is handed to
//      every advisor beneath; a broken one reaches a client meeting.
//   3. A STORE FAILURE ON A WRITE IS REPORTED, NEVER REPORTED AS SAVED. A save that
//      silently did not happen is the worst outcome, because the manager stops checking.
//
// None of the three is visible to a person testing the screen.

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const routes = require('../../server/routes/strategyPlanner')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

function makeRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { try { this._body = JSON.parse(body) } catch (e) { this._body = body } }
  }
}

const FIRM = 'firm-a'

function req (over) {
  return Object.assign({ query: {}, params: {}, body: {}, firmId: FIRM, advisorId: 'mgr-1' }, over || {})
}

/** A valid body a manager's screen would send. */
const GOOD_BODY = { steps: [{ name: 'Identify the Resistance', purpose: '', items: ['porters'] }] }

beforeEach(() => {
  jest.clearAllMocks()
  overlay.loadFirmConfig.mockResolvedValue(null)
  overlay.saveFirmConfig.mockResolvedValue(undefined)
  overlay.getVersionHistory.mockResolvedValue([])
  overlay.restoreVersion.mockResolvedValue(undefined)
})

describe('GET /api/strategy/session-process', () => {
  it('serves the shipped session when nothing is stored, and says it is inherited', async () => {
    const res = makeRes()
    await routes.getSessionProcess(req(), res)

    expect(res._status).toBe(200)
    expect(res._body.success).toBe(true)
    expect(res._body.source.shipped).toBe(true)
    expect(res._body.inherited).toBe(true)
    expect(res._body.ownedHere).toBe(false)
  })

  it('reports ownedHere only when THIS tier holds one of its own', async () => {
    overlay.loadFirmConfig.mockImplementation(scope => Promise.resolve(
      scope === FIRM ? { name: 'Ours', steps: [{ name: 'One', items: [] }] } : null
    ))

    const res = makeRes()
    await routes.getSessionProcess(req(), res)

    expect(res._body.ownedHere).toBe(true)
    expect(res._body.source.scopeId).toBe(FIRM)
  })

  it('🔴 asks the store for the caller\'s OWN scope, never one from the request', async () => {
    const res = makeRes()
    // A crafted body naming another tier. It must not reach the store.
    await routes.getSessionProcess(req({ body: { firmId: PLATFORM_SCOPE, scopeId: PLATFORM_SCOPE } }), res)

    const scopesAsked = overlay.loadFirmConfig.mock.calls.map(c => c[0])
    expect(scopesAsked[0]).toBe(FIRM)
  })
})

describe('PUT /api/strategy/session-process', () => {
  it('saves a valid session against the tier on the token', async () => {
    const res = makeRes()
    await routes.putSessionProcess(req({ body: GOOD_BODY }), res)

    expect(res._status).toBe(200)
    const [scope, , stored] = overlay.saveFirmConfig.mock.calls[0]
    expect(scope).toBe(FIRM)
    expect(stored.steps[0].name).toBe('Identify the Resistance')
  })

  it('🔴 ignores a scope in the body — one screen, four tiers, and the token decides', async () => {
    const res = makeRes()
    await routes.putSessionProcess(req({ body: Object.assign({ firmId: PLATFORM_SCOPE }, GOOD_BODY) }), res)

    expect(overlay.saveFirmConfig.mock.calls[0][0]).toBe(FIRM)
  })

  it('refuses a malformed session with 400 and stores nothing', async () => {
    const res = makeRes()
    await routes.putSessionProcess(req({ body: { steps: [] } }), res)

    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  it('🔴 reports a failed write rather than reporting it as saved', async () => {
    // A live server refusing the statement — it carries a sqlState, so no dev fallback.
    const refused = new Error('FK constraint')
    refused.sqlState = '23000'
    overlay.saveFirmConfig.mockRejectedValue(refused)

    const res = makeRes()
    await routes.putSessionProcess(req({ body: GOOD_BODY }), res)

    expect(res._status).toBe(500)
    expect(res._body.success).toBe(false)
  })
})

describe('DELETE /api/strategy/session-process', () => {
  it('returns the tier to inheriting and answers with what it now receives', async () => {
    const res = makeRes()
    await routes.deleteSessionProcess(req(), res)

    expect(res._status).toBe(200)
    expect(overlay.saveFirmConfig.mock.calls[0][0]).toBe(FIRM)
    // A tombstone, not a delete: the history stays restorable.
    expect(overlay.saveFirmConfig.mock.calls[0][2]).toBeNull()
    expect(res._body.ownedHere).toBe(false)
  })
})

describe('the version history', () => {
  it('reads and restores against the caller\'s own scope only', async () => {
    const res = makeRes()
    await routes.getSessionProcessVersions(req(), res)
    expect(overlay.getVersionHistory.mock.calls[0][0]).toBe(FIRM)

    const res2 = makeRes()
    await routes.restoreSessionProcessVersion(req({ params: { id: '7' } }), res2)
    expect(overlay.restoreVersion.mock.calls[0][0]).toBe(FIRM)
    expect(overlay.restoreVersion.mock.calls[0][2]).toBe('7')
  })
})

describe('GET /api/strategy/session-process/cards', () => {
  it('offers every concept once, with no key repeated', async () => {
    const res = makeRes()
    await routes.getSessionProcessCards(req(), res)

    expect(res._status).toBe(200)
    const keys = res._body.cards.map(c => c.key)
    expect(keys.length).toBeGreaterThan(0)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('🔴 never offers a concept both as a framework card and as a concept card', async () => {
    const res = makeRes()
    await routes.getSessionProcessCards(req(), res)

    // Mike's ruling of 2026-09-21: a concept appears once. Two keys for one concept would
    // let a manager put the same concept in two steps under two names.
    const conceptIds = res._body.cards.map(c => c.conceptId).filter(Boolean)
    expect(new Set(conceptIds).size).toBe(conceptIds.length)
  })

  it('offers no closing block, which Decision D took off this screen', async () => {
    const res = makeRes()
    await routes.getSessionProcessCards(req(), res)

    expect(res._body.cards.filter(c => c.key.indexOf('close-') === 0)).toEqual([])
  })

  it('names each card\'s deck rather than its id, which would read as gibberish', async () => {
    const res = makeRes()
    await routes.getSessionProcessCards(req(), res)

    const withDeck = res._body.cards.filter(c => c.deck)
    expect(withDeck.length).toBeGreaterThan(0)
    withDeck.forEach((c) => {
      expect(c.deck).not.toMatch(/^[a-z0-9-]+$/)
    })
  })
})
