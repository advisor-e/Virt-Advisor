'use strict'

/**
 * The Lane B routes — item 4.31, step 4.
 *
 * 🔴 THE THREE THAT MATTER, and none of them is visible to a person in UAT:
 *
 *   1. A LEVEL CAN ONLY EVER WRITE ITS OWN MATERIAL. Every handler is scoped to
 *      `req.firmId`, the verified scope from the JWT, and no handler reads a scope from a
 *      body or a query. This is the first block in the app where one level's free text
 *      can reach another level's advice at all, so the IDOR rule is load-bearing here
 *      rather than precautionary.
 *   2. A FORGED OFFER ID NAMES NOTHING. Accepting is matched against the offers this
 *      scope was actually made, resolved server-side by walking the verified chain — so a
 *      request naming another level's material is a 404 and not a quiet acceptance.
 *   3. THE MATERIAL IS RE-CHECKED AT THE POINT OF STORAGE. The screen having run the
 *      checks is not a reason to trust the request that follows.
 *
 * ⚠ `firmOverlay` IS MOCKED, so these never touch MySQL. The dev-file fallback is
 * exercised separately — a failure WITHOUT a sqlState means "there is no database here"
 * and is allowed to fall back; a live refusal must surface as a 500. That distinction is
 * `server/utils/dbFailure.js`, and it exists because weeks of mentor saves once vanished
 * into a dev file.
 */

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const routes = require('../../server/routes/promptContributions')
const { OWN_KEY, ACCEPTED_KEY } = require('../../server/utils/promptContributions')

const PLATFORM = '__platform__'
const GLOBAL = '__global__:kirkwood'
const GROUP = '__group__:kirkwood::nz'
const FIRM = 'firm-42'

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

function errorBody (res) {
  return typeof res._body === 'string' ? JSON.parse(res._body) : res._body
}

function makeReq (scopeId, extra) {
  return Object.assign({
    firmId: scopeId,
    userEmail: 'manager@example.com',
    userRole: 'firm_manager',
    body: {},
    params: {}
  }, extra || {})
}

/** A failure a LIVE MySQL answered and refused — no dev fallback is allowed for it. */
function refusal (message) {
  return Object.assign(new Error(message), { code: 'ER_NO_REFERENCED_ROW_2', sqlState: '23000' })
}

/** Point the mocked overlay at an in-memory store keyed `scope::key`. */
function store (seed) {
  const data = Object.assign({}, seed)
  overlay.loadFirmConfig.mockImplementation((scopeId, key) =>
    Promise.resolve(data[scopeId + '::' + key] || null))
  overlay.saveFirmConfig.mockImplementation((scopeId, key, value) => {
    data[scopeId + '::' + key] = value
    return Promise.resolve()
  })
  return data
}

function contribution (id, title, text) {
  return { id, title, text, addedBy: 'manager@example.com', addedAt: '2026-08-25T00:00:00.000Z' }
}

beforeEach(() => { jest.clearAllMocks(); store({}) })

describe('reading what a level has', () => {
  it('returns its own material, what it has been offered, and what is in force', async () => {
    store({
      [PLATFORM + '::' + OWN_KEY]: [contribution(1, 'Platform method', 'The mentor way.')],
      [GROUP + '::' + OWN_KEY]: [contribution(1, 'Our method', 'Our way.')]
    })
    const res = makeMockRes()
    await routes.list(makeReq(GROUP), res)

    expect(res._status).toBe(200)
    expect(res._body.own.map(r => r.title)).toEqual(['Our method'])
    // The global group is walked and has written nothing, so it offers nothing. Only
    // levels that actually hold material appear — an empty level is not an empty offer.
    expect(res._body.offered.map(o => o.offeredBy)).toEqual([PLATFORM])
    expect(res._body.inForce.map(r => r.title)).toEqual(['Our method'])
  })

  it('tells the screen the limits rather than the screen guessing them', async () => {
    const res = makeMockRes()
    await routes.list(makeReq(FIRM), res)
    expect(res._body.limits.maxInForce).toBeGreaterThan(0)
    expect(res._body.limits.maxText).toBe(6000)
  })

  it('500s on a live database refusal rather than answering "you have none"', async () => {
    overlay.loadFirmConfig.mockRejectedValue(refusal('denied'))
    const res = makeMockRes()
    await routes.list(makeReq(FIRM), res)
    expect(res._status).toBe(500)
    expect(errorBody(res).error.code).toBe('DB_ERROR')
  })
})

describe('adding material', () => {
  it('stores it against the caller\'s own scope and puts it in force at once', async () => {
    const data = store({})
    const res = makeMockRes()
    await routes.add(makeReq(FIRM, { body: { title: 'Our method', text: 'Always show the funding line.' } }), res)

    expect(res._body.saved).toBe(true)
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(FIRM, OWN_KEY, expect.any(Array), 'manager@example.com')
    expect(data[FIRM + '::' + OWN_KEY][0].title).toBe('Our method')
  })

  it('🔴 ignores any scope in the body — the firm is the JWT\'s and nothing else', async () => {
    store({})
    const res = makeMockRes()
    await routes.add(makeReq(FIRM, {
      body: { title: 'Ours', text: 'Our way.', firmId: 'firm-99', scopeId: PLATFORM }
    }), res)

    expect(overlay.saveFirmConfig).toHaveBeenCalledTimes(1)
    expect(overlay.saveFirmConfig.mock.calls[0][0]).toBe(FIRM)
  })

  it('stamps who added it and when, because a bad contribution must be attributable', async () => {
    const data = store({})
    await routes.add(makeReq(FIRM, { body: { title: 'Ours', text: 'Our way.' } }), makeMockRes())
    const row = data[FIRM + '::' + OWN_KEY][0]
    expect(row.addedBy).toBe('manager@example.com')
    expect(typeof row.addedAt).toBe('string')
  })

  it('🔴 refuses material the paste box would have refused', async () => {
    const res = makeMockRes()
    await routes.add(makeReq(FIRM, { body: { title: 'Ours', text: 'See https://example.com/x' } }), res)

    expect(res._status).toBe(200)
    expect(res._body.saved).toBe(false)
    expect(res._body.refused).toBe(true)
    expect(res._body.refusal.kind).toBe('link')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  it('400s on a request that is simply malformed', async () => {
    const res = makeMockRes()
    await routes.add(makeReq(FIRM, { body: { title: '', text: 'x' } }), res)
    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('INVALID_CONTRIBUTION')
  })

  it('appends rather than replacing, and never reuses an id', async () => {
    const data = store({ [FIRM + '::' + OWN_KEY]: [contribution(4, 'First', 'One.')] })
    await routes.add(makeReq(FIRM, { body: { title: 'Second', text: 'Two.' } }), makeMockRes())
    expect(data[FIRM + '::' + OWN_KEY].map(r => r.id)).toEqual([4, 5])
  })
})

describe('removing material', () => {
  it('removes only the row named, from the caller\'s own scope', async () => {
    const data = store({
      [FIRM + '::' + OWN_KEY]: [contribution(1, 'One', 'a'), contribution(2, 'Two', 'b')]
    })
    const res = makeMockRes()
    await routes.remove(makeReq(FIRM, { params: { id: '1' } }), res)

    expect(res._body.removed).toBe(true)
    expect(data[FIRM + '::' + OWN_KEY].map(r => r.id)).toEqual([2])
  })

  it('404s rather than silently succeeding on something that is not there', async () => {
    store({ [FIRM + '::' + OWN_KEY]: [contribution(1, 'One', 'a')] })
    const res = makeMockRes()
    await routes.remove(makeReq(FIRM, { params: { id: '99' } }), res)
    expect(res._status).toBe(404)
  })

  it('400s on an id that is not one', async () => {
    const res = makeMockRes()
    await routes.remove(makeReq(FIRM, { params: { id: 'all' } }), res)
    expect(res._status).toBe(400)
  })
})

describe('🔴 accepting an offer — P11\'s polarity, enforced at the door', () => {
  const seeded = () => store({
    [PLATFORM + '::' + OWN_KEY]: [contribution(1, 'Platform method', 'The mentor way.')],
    [GLOBAL + '::' + OWN_KEY]: [contribution(1, 'Brand method', 'The brand way.')]
  })

  it('accepts an offer this level was actually made', async () => {
    const data = seeded()
    const res = makeMockRes()
    await routes.setAccepted(makeReq(GROUP, { body: { offerId: GLOBAL + '#1', accepted: true } }), res)

    expect(res._status).toBe(200)
    expect(data[GROUP + '::' + ACCEPTED_KEY]).toEqual([GLOBAL + '#1'])
    expect(res._body.inForce.map(r => r.title)).toEqual(['Brand method'])
  })

  it('un-accepts, and the material stops reaching the AI immediately', async () => {
    const data = seeded()
    data[GROUP + '::' + ACCEPTED_KEY] = [GLOBAL + '#1']
    const res = makeMockRes()
    await routes.setAccepted(makeReq(GROUP, { body: { offerId: GLOBAL + '#1', accepted: false } }), res)

    expect(data[GROUP + '::' + ACCEPTED_KEY]).toEqual([])
    expect(res._body.inForce).toEqual([])
  })

  it('🔴 404s on an offer id naming a level this scope does not sit under', async () => {
    seeded()
    const res = makeMockRes()
    await routes.setAccepted(makeReq(GROUP, {
      body: { offerId: '__group__:kirkwood::au#1', accepted: true }
    }), res)

    expect(res._status).toBe(404)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  it('🔴 404s on an offer id naming another firm', async () => {
    const data = seeded()
    data['firm-99::' + OWN_KEY] = [contribution(1, 'Rival method', 'Their way.')]
    const res = makeMockRes()
    await routes.setAccepted(makeReq(FIRM, { body: { offerId: 'firm-99#1', accepted: true } }), res)

    expect(res._status).toBe(404)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  it('404s on an offer that has since been withdrawn', async () => {
    store({})
    const res = makeMockRes()
    await routes.setAccepted(makeReq(GROUP, { body: { offerId: GLOBAL + '#1', accepted: true } }), res)
    expect(res._status).toBe(404)
  })

  it('400s when the request names no offer, or does not say accept or decline', async () => {
    seeded()
    const a = makeMockRes()
    await routes.setAccepted(makeReq(GROUP, { body: { accepted: true } }), a)
    expect(a._status).toBe(400)

    const b = makeMockRes()
    await routes.setAccepted(makeReq(GROUP, { body: { offerId: GLOBAL + '#1' } }), b)
    expect(b._status).toBe(400)

    const c = makeMockRes()
    await routes.setAccepted(makeReq(GROUP, { body: { offerId: GLOBAL + '#1', accepted: 'yes' } }), c)
    expect(c._status).toBe(400)
  })

  it('accepting twice does not list the same offer twice', async () => {
    const data = seeded()
    await routes.setAccepted(makeReq(GROUP, { body: { offerId: GLOBAL + '#1', accepted: true } }), makeMockRes())
    await routes.setAccepted(makeReq(GROUP, { body: { offerId: GLOBAL + '#1', accepted: true } }), makeMockRes())
    expect(data[GROUP + '::' + ACCEPTED_KEY]).toEqual([GLOBAL + '#1'])
  })

  it('🔴 writes the acceptance to the ACCEPTING scope, never to the offering one', async () => {
    seeded()
    await routes.setAccepted(makeReq(GROUP, { body: { offerId: GLOBAL + '#1', accepted: true } }), makeMockRes())
    expect(overlay.saveFirmConfig.mock.calls[0][0]).toBe(GROUP)
    expect(overlay.saveFirmConfig.mock.calls[0][1]).toBe(ACCEPTED_KEY)
  })
})

describe('version history, which is what makes a bad contribution undoable', () => {
  it('returns the versions of this scope\'s own material', async () => {
    overlay.getVersionHistory.mockResolvedValue([{ id: 7, version: 2, created_by: 'a@b.c' }])
    const res = makeMockRes()
    await routes.history(makeReq(FIRM), res)
    expect(res._body.history).toHaveLength(1)
    expect(overlay.getVersionHistory).toHaveBeenCalledWith(FIRM, OWN_KEY)
  })

  it('restores one, scoped to the caller', async () => {
    overlay.restoreVersion.mockResolvedValue()
    store({})
    const res = makeMockRes()
    await routes.restore(makeReq(FIRM, { body: { versionId: 7 } }), res)
    expect(res._body.restored).toBe(true)
    expect(overlay.restoreVersion).toHaveBeenCalledWith(FIRM, OWN_KEY, 7)
  })

  it('400s when no version is named', async () => {
    const res = makeMockRes()
    await routes.restore(makeReq(FIRM, { body: {} }), res)
    expect(res._status).toBe(400)
  })
})

describe('what these routes do NOT expose', () => {
  it('🔴 offers no way to write to another scope', () => {
    // Every handler takes its scope from req.firmId. If a handler ever appears that reads
    // one from a body, this list is where it shows up first.
    expect(Object.keys(routes).sort())
      .toEqual(['add', 'history', 'list', 'remove', 'restore', 'setAccepted'])
  })

  it('🔴 never logs the material itself', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    overlay.loadFirmConfig.mockRejectedValue(refusal('denied'))

    await routes.add(makeReq(FIRM, {
      body: { title: 'Ours', text: 'Our confidential house method, in full.' }
    }), makeMockRes())

    const written = spy.mock.calls.map(a => a.join(' ')).join(' | ')
    expect(written).not.toContain('confidential house method')
    spy.mockRestore()
  })
})
