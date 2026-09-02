'use strict'

/**
 * @file The KINDS of meeting — the resolver, the validator, and the manager routes.
 *
 * Design `design/MEETING-TYPES-CASCADE.md` §7 slice 2, approved by Mike 2026-09-02.
 *
 * 🔴 WHAT THESE TESTS ARE FOR, since CLAUDE.md's rule is that a test earns its place by
 * catching what a person in UAT cannot. Three things here are invisible on screen and
 * wrong in a way that looks fine:
 *
 *   1. AN ID IS NEVER TAKEN FROM THE BROWSER, and a removed id is never reissued. A reused
 *      id inherits the removed type's declines and overrides at every level below — and its
 *      recorded meetings, which is a report attached to the wrong kind of meeting.
 *   2. EVERY ROUTE IS SCOPED TO `req.firmId`, the verified scope. This is the mechanical
 *      half of Mike's P14, "NOBODY can edit a level ABOVE their own": no handler reads a
 *      scope from a body or a query, so a scope can only write its own row.
 *   3. A LIVE MySQL REFUSAL MUST SURFACE AS A 500 and never fall through to the dev JSON,
 *      or an outage is signed off as "this scope has no overrides".
 *
 * The wording of the labels is NOT tested — Mike approved it, a person sees it in five
 * seconds, and pinning it would cost a rewrite every time a word changes.
 */

jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const routes = require('../../server/routes/meetingTypes')
const mt = require('../../server/utils/meetingTypes')
const { PLATFORM_SCOPE } = require('../../server/utils/platformScope')

const FIRM = 'firm-test-123'
const EOY = 'eoy_meeting'

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

/** The error envelope, whichever way the handler wrote it. `sendError` writes a STRING. */
function errorBody (res) {
  return typeof res._body === 'string' ? JSON.parse(res._body) : res._body
}

/** A failure a LIVE MySQL answered and refused — the sqlState is the whole point. */
function refusal (message) {
  return Object.assign(new Error(message), { code: 'ER_NO_REFERENCED_ROW_2', sqlState: '23000' })
}

function makeReq (overrides = {}) {
  return {
    firmId: FIRM,
    userEmail: 'manager@firm.test',
    params: {},
    body: {},
    ...overrides
  }
}

/** A stored-config reader over a plain `{ scopeId: { key: value } }` map. */
function readerFor (byScope) {
  return (scopeId, key) => {
    const forScope = byScope[scopeId]
    if (!forScope) { return Promise.resolve(null) }
    return Promise.resolve(
      Object.prototype.hasOwnProperty.call(forScope, key) ? forScope[key] : null
    )
  }
}

const NOTHING = readerFor({})

beforeEach(() => {
  jest.clearAllMocks()
  overlay.loadFirmConfig.mockResolvedValue(null)
  overlay.saveFirmConfig.mockResolvedValue(undefined)
})

// ── The validator, at the 100% bar ───────────────────────────────────────────────────

describe('validateTypeFields', () => {
  test('accepts a name and trims it', () => {
    const r = mt.validateTypeFields({ name: '  Bad news conversation  ' }, {})
    expect(r.ok).toBe(true)
    expect(r.value.name).toBe('Bad news conversation')
  })

  test('refuses an unknown field rather than dropping it quietly', () => {
    // A field the store accepts and no screen renders is a manager believing they changed
    // something they did not.
    const r = mt.validateTypeFields({ colour: 'red' }, {})
    expect(r.ok).toBe(false)
    expect(r.errors.join()).toMatch(/unknown field/)
  })

  test('refuses a name that is not text', () => {
    expect(mt.validateTypeFields({ name: 42 }, {}).ok).toBe(false)
  })

  test('refuses a name over the limit', () => {
    const r = mt.validateTypeFields({ name: 'x'.repeat(mt.MAX_NAME_LENGTH + 1) }, {})
    expect(r.ok).toBe(false)
    expect(r.errors.join()).toMatch(/characters or fewer/)
  })

  test('a whitespace-only name is stored as absent, not as an empty name', () => {
    // A type with no words is dropped on the way to the screen, so accepting one here
    // would make a manager's new meeting silently fail to appear.
    const r = mt.validateTypeFields({ name: '   ' }, {})
    expect(r.value.name).toBeUndefined()
  })

  test('requireName fails when there is no name', () => {
    const r = mt.validateTypeFields({ treeId: 'x' }, { requireName: true })
    expect(r.ok).toBe(false)
    expect(r.errors.join()).toMatch(/name is required/)
  })

  test('🔴 an explicit null treeId SURVIVES — it is how coaching material is detached', () => {
    const r = mt.validateTypeFields({ treeId: null }, {})
    expect(r.ok).toBe(true)
    expect(r.value).toHaveProperty('treeId', null)
  })

  test('an empty-string treeId becomes null rather than an empty link', () => {
    expect(mt.validateTypeFields({ treeId: '  ' }, {}).value.treeId).toBeNull()
  })

  test('an omitted treeId leaves whatever is inherited', () => {
    expect(mt.validateTypeFields({ name: 'A' }, {}).value).not.toHaveProperty('treeId')
  })

  test('refuses a treeId that is neither text nor null', () => {
    expect(mt.validateTypeFields({ treeId: 7 }, {}).ok).toBe(false)
  })

  test.each([[null], [undefined], ['a string'], [['a']]])('refuses %p as a whole type', (v) => {
    expect(mt.validateTypeFields(v, {}).ok).toBe(false)
  })
})

// ── Stored decisions ─────────────────────────────────────────────────────────────────

describe('readTypeDecisions never throws and never loses the readable rows', () => {
  test('declines and order keep only non-empty strings', () => {
    expect(mt.readTypeDecisions(['a', '', 3, null, 'b'], 'declines')).toEqual(['a', 'b'])
    expect(mt.readTypeDecisions('nonsense', 'order')).toEqual([])
  })

  test('own rows without an id or a name are dropped, the rest survive', () => {
    const rows = mt.readTypeDecisions([
      { id: 'mt-1', name: 'Kept' },
      { name: 'No id' },
      { id: 'mt-2' },
      { id: 'mt-3', name: '   ' }
    ], 'own')
    expect(rows).toEqual([{ id: 'mt-1', name: 'Kept' }])
  })

  test('one malformed override does not discard the others', () => {
    const kept = mt.readTypeDecisions({
      good: { name: 'Fine' },
      bad: { nonsense: true }
    }, 'overrides')
    expect(kept).toEqual({ good: { name: 'Fine' } })
  })
})

// ── Resolution ───────────────────────────────────────────────────────────────────────

describe('loadResolvedTypes', () => {
  test('a scope that has decided nothing gets the shipped list', async () => {
    const types = await mt.loadResolvedTypes(FIRM, NOTHING)
    expect(types.length).toBeGreaterThan(0)
    expect(types.map(t => t.id)).toContain(EOY)
  })

  test('🔴 a rename at the MENTOR reaches a firm — the cascade, in one assertion', async () => {
    const reader = readerFor({
      [PLATFORM_SCOPE]: { [mt.CONFIG_KEYS.overrides]: { [EOY]: { name: 'The annual review' } } }
    })
    const types = await mt.loadResolvedTypes(FIRM, reader)
    expect(types.filter(t => t.id === EOY)[0].name).toBe('The annual review')
  })

  test('a type switched off above does not reach the level below', async () => {
    const reader = readerFor({
      [PLATFORM_SCOPE]: { [mt.CONFIG_KEYS.declines]: [EOY] }
    })
    const types = await mt.loadResolvedTypes(FIRM, reader)
    expect(types.map(t => t.id)).not.toContain(EOY)
  })

  test('🔴 a type added at the mentor reads as INHERITED at a firm, not "added here"', async () => {
    // The badge is relative to the viewer. `source` is stamped by whichever level applied
    // decisions, so without this the mentor's `added-here` travels down and a firm manager
    // is told they wrote a type they cannot even edit. Caught by this test, not on screen.
    const reader = readerFor({
      [PLATFORM_SCOPE]: { [mt.CONFIG_KEYS.own]: [{ id: 'mt-1', name: 'Bad news conversation' }] }
    })
    const atMentor = await mt.loadResolvedTypes(PLATFORM_SCOPE, reader)
    expect(atMentor.filter(t => t.id === 'mt-1')[0].source).toBe('added-here')

    const atFirm = await mt.loadResolvedTypes(FIRM, reader)
    const row = atFirm.filter(t => t.id === 'mt-1')[0]
    expect(row.name).toBe('Bad news conversation')
    expect(row.source).toBe('inherited')
  })

  test('a firm that HAS decided something still reads the mentor\'s additions as inherited', async () => {
    // The other half: the restamp above covers the passthrough, and resolveInheritedRows
    // covers this path. Both have to agree or the badge flickers with unrelated edits.
    const reader = readerFor({
      [PLATFORM_SCOPE]: { [mt.CONFIG_KEYS.own]: [{ id: 'mt-1', name: 'Bad news conversation' }] },
      [FIRM]: { [mt.CONFIG_KEYS.own]: [{ id: 'ft-1', name: 'Ours' }] }
    })
    const atFirm = await mt.loadResolvedTypes(FIRM, reader)
    expect(atFirm.filter(t => t.id === 'mt-1')[0].source).toBe('inherited')
    expect(atFirm.filter(t => t.id === 'ft-1')[0].source).toBe('added-here')
  })

  test('a storage fault falls back to the layer above rather than leaving no list at all', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const reader = (scopeId) => {
      if (scopeId === FIRM) { return Promise.reject(refusal('nope')) }
      return Promise.resolve(null)
    }
    const types = await mt.loadResolvedTypes(FIRM, reader)
    expect(types.length).toBeGreaterThan(0)
    spy.mockRestore()
  })
})

describe('applyOrder is a preference, not a schema', () => {
  const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

  test('named ids lead, in the stored order', () => {
    expect(mt.applyOrder(rows, ['c', 'a']).map(r => r.id)).toEqual(['c', 'a', 'b'])
  })

  test('an id that no longer resolves is ignored rather than rejected', () => {
    // A type switched off above may be switched back on; dropping its position would
    // silently move a manager's list.
    expect(mt.applyOrder(rows, ['gone', 'b']).map(r => r.id)).toEqual(['b', 'a', 'c'])
  })

  test('an empty or absent order changes nothing', () => {
    expect(mt.applyOrder(rows, []).map(r => r.id)).toEqual(['a', 'b', 'c'])
    expect(mt.applyOrder(rows, null).map(r => r.id)).toEqual(['a', 'b', 'c'])
  })

  test('a duplicated id is placed once', () => {
    expect(mt.applyOrder(rows, ['b', 'b']).map(r => r.id)).toEqual(['b', 'a', 'c'])
  })
})

describe('nextOwnTypeId', () => {
  test('mints under the tier prefix', () => {
    expect(mt.nextOwnTypeId(PLATFORM_SCOPE, [])).toBe('mt-1')
    expect(mt.nextOwnTypeId(FIRM, [])).toBe('ft-1')
  })

  test('🔴 a removed id is never reissued — it would inherit the old type\'s meetings', () => {
    const held = [{ id: 'mt-1' }, { id: 'mt-3' }]
    expect(mt.nextOwnTypeId(PLATFORM_SCOPE, held)).toBe('mt-4')
  })

  test('ignores ids minted by another tier', () => {
    expect(mt.nextOwnTypeId(PLATFORM_SCOPE, [{ id: 'ft-9' }])).toBe('mt-1')
  })
})

// ── Routes ───────────────────────────────────────────────────────────────────────────

describe('the manager routes', () => {
  test('GET returns the list, this scope\'s own decisions, and its tier', async () => {
    const res = makeMockRes()
    await routes.getTypes(makeReq(), res)
    expect(res._status).toBe(200)
    expect(res._body.types.length).toBeGreaterThan(0)
    expect(res._body.tier).toBe('firm_manager')
    expect(res._body.hasOwn).toBe(false)
  })

  test('🔴 the MENTOR can rename a shipped type — the top of the chain has a base too', async () => {
    // This failed when written: the route treated "no parent" as "inherits nothing", so the
    // mentor could not rename any of the eleven. Found by driving the live routes.
    const res = makeMockRes()
    await routes.overrideType(
      makeReq({ firmId: PLATFORM_SCOPE, params: { typeId: EOY }, body: { name: 'The annual review' } }),
      res
    )
    expect(res._status).toBe(200)
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(
      PLATFORM_SCOPE, mt.CONFIG_KEYS.overrides, { [EOY]: { name: 'The annual review' } }, 'manager@firm.test'
    )
  })

  test('an override for a type that does not reach this scope is refused', async () => {
    const res = makeMockRes()
    await routes.overrideType(
      makeReq({ params: { typeId: 'no_such_type' }, body: { name: 'X' } }), res
    )
    expect(res._status).toBe(404)
  })

  test('an override with nothing in it is refused rather than stored empty', async () => {
    const res = makeMockRes()
    await routes.overrideType(makeReq({ params: { typeId: EOY }, body: {} }), res)
    expect(res._status).toBe(400)
    expect(errorBody(res).error.message).toMatch(/Nothing to change/)
  })

  test('an invalid field is refused with the reason', async () => {
    const res = makeMockRes()
    await routes.overrideType(
      makeReq({ params: { typeId: EOY }, body: { colour: 'red' } }), res
    )
    expect(res._status).toBe(400)
    expect(errorBody(res).error.message).toMatch(/unknown field/)
  })

  test('resetting an override that was never set is a 404', async () => {
    const res = makeMockRes()
    await routes.resetType(makeReq({ params: { typeId: EOY } }), res)
    expect(res._status).toBe(404)
  })

  test('resetting drops only that type\'s edit', async () => {
    overlay.loadFirmConfig.mockResolvedValue({ [EOY]: { name: 'Mine' }, other: { name: 'Keep' } })
    const res = makeMockRes()
    await routes.resetType(makeReq({ params: { typeId: EOY } }), res)
    expect(res._status).toBe(200)
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(
      FIRM, mt.CONFIG_KEYS.overrides, { other: { name: 'Keep' } }, 'manager@firm.test'
    )
  })

  test('switching off adds the id once, and switching on removes it', async () => {
    overlay.loadFirmConfig.mockResolvedValue([EOY])
    const on = makeMockRes()
    await routes.declineType(makeReq({ params: { typeId: EOY }, body: { declined: true } }), on)
    expect(overlay.saveFirmConfig).toHaveBeenLastCalledWith(
      FIRM, mt.CONFIG_KEYS.declines, [EOY], 'manager@firm.test'
    )

    const off = makeMockRes()
    await routes.declineType(makeReq({ params: { typeId: EOY }, body: { declined: false } }), off)
    expect(overlay.saveFirmConfig).toHaveBeenLastCalledWith(
      FIRM, mt.CONFIG_KEYS.declines, [], 'manager@firm.test'
    )
  })

  test('declined must be a boolean — a missing one is not read as false', async () => {
    const res = makeMockRes()
    await routes.declineType(makeReq({ params: { typeId: EOY }, body: {} }), res)
    expect(res._status).toBe(400)
  })

  test('🔴 adding mints the id and IGNORES one sent from the browser', async () => {
    // A supplied id could collide with an inherited type and silently replace it.
    const res = makeMockRes()
    await routes.addType(makeReq({ body: { id: 'eoy_meeting', name: 'Bad news conversation' } }), res)
    expect(res._status).toBe(400)
    expect(errorBody(res).error.message).toMatch(/unknown field: id/)
  })

  test('adding without a name is refused', async () => {
    const res = makeMockRes()
    await routes.addType(makeReq({ body: {} }), res)
    expect(res._status).toBe(400)
  })

  test('adding stores the minted id and returns it', async () => {
    const res = makeMockRes()
    await routes.addType(makeReq({ body: { name: 'Bad news conversation' } }), res)
    expect(res._status).toBe(201)
    expect(res._body.typeId).toBe('ft-1')
  })

  test('editing a type this scope did not add is a 404', async () => {
    const res = makeMockRes()
    await routes.editOwnType(makeReq({ params: { typeId: 'ft-9' }, body: { name: 'X' } }), res)
    expect(res._status).toBe(404)
  })

  test('editing an own type keeps its id whatever the body says', async () => {
    overlay.loadFirmConfig.mockResolvedValue([{ id: 'ft-1', name: 'Old' }])
    const res = makeMockRes()
    await routes.editOwnType(makeReq({ params: { typeId: 'ft-1' }, body: { name: 'New' } }), res)
    expect(res._status).toBe(200)
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(
      FIRM, mt.CONFIG_KEYS.own, [{ id: 'ft-1', name: 'New' }], 'manager@firm.test'
    )
  })

  test('removing a type this scope did not add is a 404', async () => {
    overlay.loadFirmConfig.mockResolvedValue([])
    const res = makeMockRes()
    await routes.removeOwnType(makeReq({ params: { typeId: 'ft-1' } }), res)
    expect(res._status).toBe(404)
  })

  test('removing an own type leaves the others', async () => {
    overlay.loadFirmConfig.mockResolvedValue([{ id: 'ft-1', name: 'A' }, { id: 'ft-2', name: 'B' }])
    const res = makeMockRes()
    await routes.removeOwnType(makeReq({ params: { typeId: 'ft-1' } }), res)
    expect(res._status).toBe(200)
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(
      FIRM, mt.CONFIG_KEYS.own, [{ id: 'ft-2', name: 'B' }], 'manager@firm.test'
    )
  })

  test('the order must be a list of ids', async () => {
    const res = makeMockRes()
    await routes.saveOrder(makeReq({ body: { order: 'a,b' } }), res)
    expect(res._status).toBe(400)

    const res2 = makeMockRes()
    await routes.saveOrder(makeReq({ body: { order: ['a', 3] } }), res2)
    expect(res2._status).toBe(400)
  })

  test('the order is stored whole', async () => {
    const res = makeMockRes()
    await routes.saveOrder(makeReq({ body: { order: ['b', 'a'] } }), res)
    expect(res._status).toBe(200)
    expect(overlay.saveFirmConfig).toHaveBeenCalledWith(
      FIRM, mt.CONFIG_KEYS.order, ['b', 'a'], 'manager@firm.test'
    )
  })
})

describe('🔴 a live MySQL refusal surfaces as a 500, never as "nothing stored"', () => {
  test('getTypes answers 500 rather than an empty list', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    overlay.loadFirmConfig.mockRejectedValue(refusal('refused'))
    const res = makeMockRes()
    await routes.getTypes(makeReq(), res)
    expect(res._status).toBe(500)
    expect(errorBody(res).error.code).toBe('DB_ERROR')
    spy.mockRestore()
  })

  test('a save that MySQL refuses answers 500 rather than reporting success', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    overlay.saveFirmConfig.mockRejectedValue(refusal('refused'))
    const res = makeMockRes()
    await routes.addType(makeReq({ body: { name: 'A' } }), res)
    expect(res._status).toBe(500)
    spy.mockRestore()
  })
})
