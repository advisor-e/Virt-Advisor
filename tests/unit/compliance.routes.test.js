'use strict'

/**
 * The compliance routes — item 4.83, slice 1.
 *
 * 🔴 THE THREE THAT MATTER, and none of them is visible to a person in UAT:
 *
 *   1. A TIER CANNOT REPUBLISH ANOTHER TIER'S ITEM. Mike ruled on 2026-09-10 that a firm may
 *      never edit what a tier above published — *"never edit ours"* — because a firm relying
 *      on an edited version has our name on words we did not write. The screen offers no edit
 *      control, but a screen is not a control: the refusal has to be in the route, and it has
 *      to be checked against the caller's OWN row rather than against the resolved list, which
 *      contains every tier above.
 *
 *   2. `publishedBy` COMES FROM THE VERIFIED TOKEN, NEVER THE BODY. It is the name beside a
 *      compliance statement a firm relies on. A body-supplied publisher would let anyone with
 *      the route sign somebody else's name to it, and the screen would look perfectly normal.
 *
 *   3. THE SCOPE COMES FROM THE VERIFIED TOKEN TOO. No handler reads a scope from a body or a
 *      query, so one firm can never read or write another's compliance material —
 *      `tier-cascade.md` P6. A leak here is silent by construction.
 *
 * Written the way the sibling route guards are — each fails if the protection it names is
 * removed, rather than passing on the shape of the response alone.
 */

// firmOverlay is the production persistence path — mocked so tests never touch MySQL, and so
// a save never falls through to the dev JSON file and writes to the repository.
jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const routes = require('../../server/routes/compliance')
const { CONFIG_KEY, DECLARATION_KEY, MAX_BODY } = require('../../server/utils/compliance')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

const FIRM = 'firm-test-123'
const MANAGER = 'manager@example.com'

function makeRes () {
  return {
    _status: null,
    _body: null,
    headersSent: false,
    send (status, body) { this._status = status; this._body = body },
    writeHead (status) { this._status = status; this.headersSent = true },
    end (body) { this._body = body }
  }
}

/** `sendError` writes a JSON STRING through writeHead/end, so it must be parsed. */
function errorBody (res) {
  return typeof res._body === 'string' ? JSON.parse(res._body) : res._body
}

function makeReq (over) {
  return Object.assign({ firmId: FIRM, userEmail: MANAGER, query: {}, body: {} }, over || {})
}

function item (over) {
  return Object.assign({
    title: 'Meeting consent wording',
    summary: 'The spoken line and the two-step screen',
    body: 'The wording itself.',
    version: 1,
    publishedAt: '2026-09-01T00:00:00.000Z',
    publishedBy: 'mentor@example.com'
  }, over || {})
}

/** Point the mocked store at a `{ scopeId: { configKey: value } }` map. */
function store (byScope) {
  overlay.loadFirmConfig.mockImplementation((scopeId, key) => {
    const forScope = byScope[scopeId]
    return Promise.resolve((forScope && forScope[key]) || null)
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  overlay.saveFirmConfig.mockResolvedValue(1)
  store({})
})

// ── Reading ───────────────────────────────────────────────────────────────────

describe('GET /api/firm-manager/compliance', () => {
  test('returns what was published to this scope, with the tier that published each', async () => {
    store({ [PLATFORM_SCOPE]: { [CONFIG_KEY]: { 'ci-1': item() } } })

    const res = makeRes()
    await routes.getForManager(makeReq(), res)

    expect(res._status).toBe(200)
    expect(res._body.items).toHaveLength(1)
    expect(res._body.items[0].originTier).toBe('mentor')
    expect(res._body.items[0].isOwn).toBe(false)
  })

  test('🔴 the scope read is the token\'s, never a query parameter', async () => {
    // See this file's header, point 3. A handler that honoured `?firmId=` would read another
    // firm's compliance material and look entirely normal doing it.
    store({ [FIRM]: { [CONFIG_KEY]: { 'ci-1': item() } } })

    const res = makeRes()
    await routes.getForManager(makeReq({ query: { firmId: 'firm-somebody-else' } }), res)

    expect(overlay.loadFirmConfig).not.toHaveBeenCalledWith('firm-somebody-else', expect.anything())
    expect(res._body.items[0].isOwn).toBe(true)
  })

  test('with no declaration recorded, everything published to you counts as new', async () => {
    // Nothing writes the declaration until slice 3, so this is today's live behaviour.
    store({ [PLATFORM_SCOPE]: { [CONFIG_KEY]: { 'ci-1': item() } } })

    const res = makeRes()
    await routes.getForManager(makeReq(), res)

    expect(res._body.declaredAt).toBeNull()
    expect(res._body.newCount).toBe(1)
  })

  test('a declaration later than the publication clears the count', async () => {
    store({
      [PLATFORM_SCOPE]: { [CONFIG_KEY]: { 'ci-1': item() } },
      [FIRM]: { [DECLARATION_KEY]: { declaredAt: '2026-09-05T00:00:00.000Z' } }
    })

    const res = makeRes()
    await routes.getForManager(makeReq(), res)

    expect(res._body.newCount).toBe(0)
  })

  test('the field limits travel with the answer, so no screen holds a second copy', async () => {
    const res = makeRes()
    await routes.getForManager(makeReq(), res)
    expect(res._body.limits.body).toBe(MAX_BODY)
  })

  test('a database failure is a safe error, never a stack trace', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const err = new Error('ER_NO_SUCH_TABLE')
    err.sqlState = '42S02'
    overlay.loadFirmConfig.mockRejectedValue(err)

    const res = makeRes()
    await routes.getForManager(makeReq(), res)

    expect(res._status).toBe(500)
    expect(errorBody(res).error.code).toBe('DB_ERROR')
    expect(JSON.stringify(errorBody(res))).not.toContain('ER_NO_SUCH_TABLE')
    console.error.mockRestore()
  })
})

// ── Publishing ────────────────────────────────────────────────────────────────

describe('POST /api/firm-manager/compliance', () => {
  test('publishes a new item as version 1 on this scope\'s own row', async () => {
    const res = makeRes()
    await routes.publish(makeReq({
      body: { title: 'Recording law — Australia', body: 'What it says.' }
    }), res)

    expect(res._status).toBe(200)
    const [scopeId, key, written] = overlay.saveFirmConfig.mock.calls[0]
    expect(scopeId).toBe(FIRM)
    expect(key).toBe(CONFIG_KEY)
    expect(written['ci-1'].version).toBe(1)
  })

  test('🔴 publishedBy comes from the token and a body cannot override it', async () => {
    // See this file's header, point 2.
    const res = makeRes()
    await routes.publish(makeReq({
      body: {
        title: 'Recording law — Australia',
        body: 'What it says.',
        publishedBy: 'somebody.else@example.com'
      }
    }), res)

    const written = overlay.saveFirmConfig.mock.calls[0][2]
    expect(written['ci-1'].publishedBy).toBe(MANAGER)
  })

  test('🔴 an id belonging to a tier ABOVE is refused, not quietly adopted', async () => {
    // See this file's header, point 1. The mentor holds `ci-1`; this firm holds nothing. A
    // route checking the RESOLVED list instead of the caller's own row would accept this and
    // hand the firm its own edited copy of the mentor's material.
    store({ [PLATFORM_SCOPE]: { [CONFIG_KEY]: { 'ci-1': item() } } })

    const res = makeRes()
    await routes.publish(makeReq({
      body: { id: 'ci-1', title: 'Our version', body: 'Reworded.' }
    }), res)

    expect(res._status).toBe(404)
    expect(errorBody(res).error.code).toBe('NOT_YOURS')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('republishing an item this scope DOES own bumps the version', async () => {
    store({ [FIRM]: { [CONFIG_KEY]: { 'ci-1': item({ version: 2 }) } } })

    const res = makeRes()
    await routes.publish(makeReq({
      body: { id: 'ci-1', title: 'Meeting consent wording', body: 'Version three of it.' }
    }), res)

    expect(res._status).toBe(200)
    const written = overlay.saveFirmConfig.mock.calls[0][2]
    expect(written['ci-1'].version).toBe(3)
  })

  test('republishing resets publishedAt, so the tiers beneath are told again', async () => {
    // Not a side effect: an item worth republishing is an item worth re-reading, and the dot
    // returning is the notification working as Mike ruled it.
    store({ [FIRM]: { [CONFIG_KEY]: { 'ci-1': item() } } })

    const res = makeRes()
    await routes.publish(makeReq({ body: { id: 'ci-1', title: 'Same name', body: 'New text.' } }), res)

    const written = overlay.saveFirmConfig.mock.calls[0][2]
    expect(Date.parse(written['ci-1'].publishedAt))
      .toBeGreaterThan(Date.parse(item().publishedAt))
  })

  test('publishing does not disturb the other items on the row', async () => {
    store({ [FIRM]: { [CONFIG_KEY]: { 'ci-1': item(), 'ci-2': item({ title: 'Second' }) } } })

    const res = makeRes()
    await routes.publish(makeReq({ body: { title: 'Third', body: 'Text.' } }), res)

    const written = overlay.saveFirmConfig.mock.calls[0][2]
    expect(Object.keys(written).sort()).toEqual(['ci-1', 'ci-2', 'ci-3'])
  })

  test.each([
    ['no title', { body: 'Text.' }, 'MISSING_TITLE'],
    ['no material', { title: 'A name' }, 'MISSING_BODY'],
    ['blank material', { title: 'A name', body: '   ' }, 'MISSING_BODY']
  ])('refuses a publish with %s', async (_label, body, code) => {
    const res = makeRes()
    await routes.publish(makeReq({ body }), res)

    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe(code)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('material past the cap is refused rather than silently docked', async () => {
    const res = makeRes()
    await routes.publish(makeReq({
      body: { title: 'A name', body: 'x'.repeat(MAX_BODY + 1) }
    }), res)

    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('BODY_TOO_LONG')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('a save failure is a safe error, never a stack trace', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const err = new Error('ER_LOCK_WAIT_TIMEOUT at line 42')
    err.sqlState = 'HY000'
    overlay.saveFirmConfig.mockRejectedValue(err)

    const res = makeRes()
    await routes.publish(makeReq({ body: { title: 'A name', body: 'Text.' } }), res)

    expect(res._status).toBe(500)
    expect(JSON.stringify(errorBody(res))).not.toContain('ER_LOCK_WAIT_TIMEOUT')
    console.error.mockRestore()
  })
})

// ── History and restore ───────────────────────────────────────────────────────

describe('history and restore', () => {
  test('history reads this scope\'s own set and no other', async () => {
    overlay.getVersionHistory.mockResolvedValue([{ id: 3, version: 2 }])

    const res = makeRes()
    await routes.history(makeReq(), res)

    expect(overlay.getVersionHistory).toHaveBeenCalledWith(FIRM, CONFIG_KEY)
    expect(res._body.history).toHaveLength(1)
  })

  test('🔴 restore is confined to this scope\'s own row', async () => {
    // A tier has never held a version of the tier above it, so there is nothing there to
    // restore — but the scope is asserted rather than assumed, because a restore that took a
    // scope from the body would reach one.
    overlay.restoreVersion.mockResolvedValue(4)

    const res = makeRes()
    await routes.restore(makeReq({ body: { versionId: 3, firmId: 'firm-somebody-else' } }), res)

    expect(overlay.restoreVersion).toHaveBeenCalledWith(FIRM, CONFIG_KEY, 3)
    expect(res._status).toBe(200)
  })

  test('restore without a version is refused', async () => {
    const res = makeRes()
    await routes.restore(makeReq({ body: {} }), res)

    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('MISSING_VERSION')
    expect(overlay.restoreVersion).not.toHaveBeenCalled()
  })
})
