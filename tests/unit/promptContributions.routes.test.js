'use strict'

/**
 * The routes behind a level's own prompt material — item 4.31, Lane B.
 *
 * 🔴 THE THREE THAT MATTER, and none is visible to a person in UAT:
 *
 *   1. A LEVEL WRITES ONLY ITS OWN SCOPE. Every handler takes the scope from `req.firmId`,
 *      the verified value from the JWT, and no handler reads one from a body or a query.
 *   2. AN EDIT IS STORED AS AN OVERRIDE, NOT AS A COPY. The level above keeps its own
 *      version; the edit replaces it here and downward, keyed to the same id, so a later
 *      change above can still be matched to the row it is about.
 *   3. THE MATERIAL IS CHECKED AT THE POINT OF STORAGE, not only on the screen.
 *
 * ⚠ `firmOverlay` IS MOCKED, so these never touch MySQL. A failure WITHOUT a sqlState
 * means "there is no database here" and may fall back to the dev file; a live refusal must
 * surface as a 500 — `server/utils/dbFailure.js`.
 */

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const routes = require('../../server/routes/promptContributions')
const {
  signatureOf,
  OWN_KEY,
  DECLINES_KEY,
  OVERRIDES_KEY,
  BASELINES_KEY
} = require('../../server/utils/promptContributions')

const PLATFORM = '__platform__'
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

function refusal (message) {
  return Object.assign(new Error(message), { code: 'ER_NO_REFERENCED_ROW_2', sqlState: '23000' })
}

function store (seed) {
  const data = Object.assign({}, seed)
  overlay.loadFirmConfig.mockImplementation((scopeId, key) =>
    Promise.resolve(data[scopeId + '::' + key] === undefined ? null : data[scopeId + '::' + key]))
  overlay.saveFirmConfig.mockImplementation((scopeId, key, value) => {
    data[scopeId + '::' + key] = value
    return Promise.resolve()
  })
  return data
}

function row (id, title, text) {
  return { id, title, text, addedBy: 'manager@example.com', addedAt: '2026-08-25T00:00:00.000Z' }
}

beforeEach(() => { jest.clearAllMocks(); store({}) })

describe('reading the screen', () => {
  it('returns what is in force, what was inherited, and what is switched off', async () => {
    store({
      [PLATFORM + '::' + OWN_KEY]: [row('pc-1', 'Platform method', 'The mentor way.')],
      [GROUP + '::' + DECLINES_KEY]: ['pc-1']
    })
    const res = makeMockRes()
    await routes.list(makeReq(GROUP), res)

    expect(res._status).toBe(200)
    expect(res._body.resolved).toEqual([])
    expect(res._body.inherited.map(r => r.title)).toEqual(['Platform method'])
    expect(res._body.declinedIds).toEqual(['pc-1'])
  })

  it('tells the screen the limits rather than the screen guessing them', async () => {
    const res = makeMockRes()
    await routes.list(makeReq(FIRM), res)
    expect(res._body.limits.maxText).toBe(6000)
    expect(res._body.limits.maxInForce).toBeGreaterThan(0)
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
    await routes.add(makeReq(FIRM, { body: { title: 'Our method', text: 'Show the funding line.' } }), res)

    expect(res._body.saved).toBe(true)
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(FIRM, OWN_KEY, expect.any(Array), 'manager@example.com')
    expect(data[FIRM + '::' + OWN_KEY][0].title).toBe('Our method')
    expect(res._body.resolved.map(r => r.title)).toEqual(['Our method'])
  })

  it('🔴 ignores any scope in the body — the scope is the JWT\'s and nothing else', async () => {
    store({})
    await routes.add(makeReq(FIRM, {
      body: { title: 'Ours', text: 'Our way.', firmId: 'firm-99', scopeId: PLATFORM }
    }), makeMockRes())

    expect(overlay.saveFirmConfig).toHaveBeenCalledTimes(1)
    expect(overlay.saveFirmConfig.mock.calls[0][0]).toBe(FIRM)
  })

  it('stamps who added it and when, because material must be attributable', async () => {
    const data = store({})
    await routes.add(makeReq(FIRM, { body: { title: 'Ours', text: 'Our way.' } }), makeMockRes())
    expect(data[FIRM + '::' + OWN_KEY][0].addedBy).toBe('manager@example.com')
    expect(typeof data[FIRM + '::' + OWN_KEY][0].addedAt).toBe('string')
  })

  it('🔴 refuses material the paste box would have refused', async () => {
    const res = makeMockRes()
    await routes.add(makeReq(FIRM, { body: { title: 'Ours', text: 'See https://example.com/x' } }), res)

    expect(res._status).toBe(200)
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
})

describe('editing', () => {
  it('edits a row this level added, in place', async () => {
    const data = store({ [FIRM + '::' + OWN_KEY]: [row('fc-1', 'Old', 'Old body.')] })
    const res = makeMockRes()
    await routes.update(makeReq(FIRM, { params: { id: 'fc-1' }, body: { title: 'New', text: 'New body.' } }), res)

    expect(res._body.saved).toBe(true)
    expect(data[FIRM + '::' + OWN_KEY][0].title).toBe('New')
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(FIRM, OWN_KEY, expect.any(Array), 'manager@example.com')
  })

  it('🔴 edits an INHERITED row as an override, leaving the level above untouched', async () => {
    const data = store({ [PLATFORM + '::' + OWN_KEY]: [row('pc-1', 'Platform method', 'The mentor way.')] })
    const res = makeMockRes()
    await routes.update(makeReq(GROUP, { params: { id: 'pc-1' }, body: { title: 'Ours', text: 'Our way.' } }), res)

    expect(data[GROUP + '::' + OVERRIDES_KEY]['pc-1'].title).toBe('Ours')
    expect(data[PLATFORM + '::' + OWN_KEY][0].title).toBe('Platform method')
    expect(res._body.resolved[0].title).toBe('Ours')
    expect(res._body.resolved[0].id).toBe('pc-1')
  })

  it('stamps the baseline, so a later change above is noticed', async () => {
    const data = store({ [PLATFORM + '::' + OWN_KEY]: [row('pc-1', 'Platform method', 'The mentor way.')] })
    await routes.update(makeReq(GROUP, { params: { id: 'pc-1' }, body: { title: 'Ours', text: 'Our way.' } }), makeMockRes())

    expect(data[GROUP + '::' + BASELINES_KEY]['pc-1'])
      .toBe(signatureOf({ title: 'Platform method', text: 'The mentor way.' }))
  })

  it('404s on a row that exists nowhere', async () => {
    store({})
    const res = makeMockRes()
    await routes.update(makeReq(GROUP, { params: { id: 'pc-9' }, body: { title: 'x', text: 'y' } }), res)
    expect(res._status).toBe(404)
  })

  it('refuses an edit the paste box would have refused', async () => {
    store({ [FIRM + '::' + OWN_KEY]: [row('fc-1', 'Old', 'Old body.')] })
    const res = makeMockRes()
    await routes.update(makeReq(FIRM, { params: { id: 'fc-1' }, body: { title: 'x', text: 'mail me at a@b.com' } }), res)
    expect(res._body.refused).toBe(true)
  })
})

describe('switching material off', () => {
  it('declines an inherited row, leaving it in place above', async () => {
    const data = store({ [PLATFORM + '::' + OWN_KEY]: [row('pc-1', 'Platform method', 'The mentor way.')] })
    const res = makeMockRes()
    await routes.setOff(makeReq(GROUP, { params: { id: 'pc-1' }, body: { off: true } }), res)

    expect(data[GROUP + '::' + DECLINES_KEY]).toEqual(['pc-1'])
    expect(data[PLATFORM + '::' + OWN_KEY]).toHaveLength(1)
    expect(res._body.resolved).toEqual([])
  })

  it('switches a declined row back on', async () => {
    const data = store({
      [PLATFORM + '::' + OWN_KEY]: [row('pc-1', 'Platform method', 'The mentor way.')],
      [GROUP + '::' + DECLINES_KEY]: ['pc-1']
    })
    const res = makeMockRes()
    await routes.setOff(makeReq(GROUP, { params: { id: 'pc-1' }, body: { off: false } }), res)

    expect(data[GROUP + '::' + DECLINES_KEY]).toEqual([])
    expect(res._body.resolved.map(r => r.id)).toEqual(['pc-1'])
  })

  it('declining twice does not list the row twice', async () => {
    const data = store({
      [PLATFORM + '::' + OWN_KEY]: [row('pc-1', 'Platform method', 'The mentor way.')]
    })
    await routes.setOff(makeReq(GROUP, { params: { id: 'pc-1' }, body: { off: true } }), makeMockRes())
    await routes.setOff(makeReq(GROUP, { params: { id: 'pc-1' }, body: { off: true } }), makeMockRes())
    expect(data[GROUP + '::' + DECLINES_KEY]).toEqual(['pc-1'])
  })

  it('deletes a row this level added rather than declining it', async () => {
    const data = store({ [FIRM + '::' + OWN_KEY]: [row('fc-1', 'Ours', 'Our way.')] })
    await routes.setOff(makeReq(FIRM, { params: { id: 'fc-1' }, body: { off: true } }), makeMockRes())
    expect(data[FIRM + '::' + OWN_KEY]).toEqual([])
  })

  it('says so rather than silently doing nothing when asked to restore its own deleted row', async () => {
    store({ [FIRM + '::' + OWN_KEY]: [row('fc-1', 'Ours', 'Our way.')] })
    const res = makeMockRes()
    await routes.setOff(makeReq(FIRM, { params: { id: 'fc-1' }, body: { off: false } }), res)
    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('NOT_DECLINABLE')
  })

  it('400s when the request does not say on or off', async () => {
    const res = makeMockRes()
    await routes.setOff(makeReq(GROUP, { params: { id: 'pc-1' }, body: {} }), res)
    expect(res._status).toBe(400)
  })

  it('404s on a row that exists nowhere', async () => {
    store({})
    const res = makeMockRes()
    await routes.setOff(makeReq(GROUP, { params: { id: 'pc-9' }, body: { off: true } }), res)
    expect(res._status).toBe(404)
  })
})

describe('🔴 a later change from above', () => {
  function edited () {
    const data = store({ [PLATFORM + '::' + OWN_KEY]: [row('pc-1', 'Platform method', 'The mentor way.')] })
    data[GROUP + '::' + OVERRIDES_KEY] = { 'pc-1': { title: 'Ours', text: 'Our way.' } }
    data[GROUP + '::' + BASELINES_KEY] = {
      'pc-1': signatureOf({ title: 'Platform method', text: 'The mentor way.' })
    }
    return data
  }

  it('is reported once the level above rewrites the row', async () => {
    const data = edited()
    data[PLATFORM + '::' + OWN_KEY] = [row('pc-1', 'Platform method', 'A NEW mentor way.')]
    const res = makeMockRes()
    await routes.list(makeReq(GROUP), res)
    expect(res._body.changedAbove).toEqual(['pc-1'])
  })

  it('adopting drops this level\'s edit and takes the newer version', async () => {
    const data = edited()
    data[PLATFORM + '::' + OWN_KEY] = [row('pc-1', 'Platform method', 'A NEW mentor way.')]
    const res = makeMockRes()
    await routes.adopt(makeReq(GROUP, { params: { id: 'pc-1' } }), res)

    expect(data[GROUP + '::' + OVERRIDES_KEY]['pc-1']).toBeUndefined()
    expect(res._body.resolved[0].text).toBe('A NEW mentor way.')
  })

  it('🔴 keeping mine leaves the edit alone and stops the row being reported', async () => {
    const data = edited()
    data[PLATFORM + '::' + OWN_KEY] = [row('pc-1', 'Platform method', 'A NEW mentor way.')]
    const res = makeMockRes()
    await routes.keepMine(makeReq(GROUP, { params: { id: 'pc-1' } }), res)

    expect(data[GROUP + '::' + OVERRIDES_KEY]['pc-1'].text).toBe('Our way.')
    expect(res._body.changedAbove).toEqual([])
  })

  it('404s when the level has not edited that row at all', async () => {
    store({ [PLATFORM + '::' + OWN_KEY]: [row('pc-1', 'Platform method', 'The mentor way.')] })
    const a = makeMockRes()
    await routes.adopt(makeReq(GROUP, { params: { id: 'pc-1' } }), a)
    expect(a._status).toBe(404)

    const b = makeMockRes()
    await routes.keepMine(makeReq(GROUP, { params: { id: 'pc-1' } }), b)
    expect(b._status).toBe(404)
  })

  it('🔴 writes only to the deciding scope, never to the one above', async () => {
    const data = edited()
    data[PLATFORM + '::' + OWN_KEY] = [row('pc-1', 'Platform method', 'A NEW mentor way.')]
    await routes.keepMine(makeReq(GROUP, { params: { id: 'pc-1' } }), makeMockRes())
    overlay.saveFirmConfig.mock.calls.forEach((call) => { expect(call[0]).toBe(GROUP) })
  })
})

describe('version history, which is what makes bad material undoable', () => {
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
  it('🔴 offers no handler that writes to another scope', () => {
    expect(Object.keys(routes).sort())
      .toEqual(['add', 'adopt', 'history', 'keepMine', 'list', 'restore', 'setOff', 'update'])
  })

  it('🔴 never logs the material itself', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    overlay.loadFirmConfig.mockRejectedValue(refusal('denied'))

    await routes.add(makeReq(FIRM, {
      body: { title: 'Ours', text: 'Our confidential house method, in full.' }
    }), makeMockRes())

    expect(spy.mock.calls.map(a => a.join(' ')).join(' | ')).not.toContain('confidential house method')
    spy.mockRestore()
  })
})
