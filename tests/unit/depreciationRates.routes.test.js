'use strict'

/**
 * The depreciation-rates routes — item 4.78, slice 2.
 *
 * 🔴 THE THREE THAT MATTER, and none of them is visible to a person in UAT:
 *
 *   1. `approvedBy` COMES FROM THE VERIFIED TOKEN, NEVER THE BODY. It is the name that
 *      appears beside a rate on a document a lender reads. A body-supplied approver would
 *      let anyone with the route sign somebody else's name to a tax table, and the screen
 *      would look perfectly normal.
 *
 *   2. APPROVING RATES CANNOT ADOPT A TAX SCHEME, AND ADOPTING ONE CANNOT CHANGE A RATE.
 *      Mike's ruling of 2026-09-09 put them on two buttons; two routes are what make that
 *      true rather than merely drawn. A manager confirming 41 rates has not thereby signed
 *      off a 20% first-year write-off on every qualifying purchase their clients make.
 *
 *   3. A READ NEVER BLOCKS AN ADVISOR. His words, 2026-09-08: "Never block the advisor."
 *      A storage failure degrades to the app's own six rates and a 200, because the
 *      alternative is stopping someone mid-report over a document a manager elsewhere has
 *      not loaded.
 *
 * Written the way the sibling route guards are — each fails if the protection it names is
 * removed, rather than passing on the shape of the response alone.
 */

// firmOverlay is the production persistence path — mocked so tests never touch MySQL, and
// so a save never falls through to the dev JSON file and writes to the repository.
jest.mock('../../server/utils/firmOverlay', () => ({
  loadFirmConfig: jest.fn(),
  saveFirmConfig: jest.fn(),
  getVersionHistory: jest.fn(),
  restoreVersion: jest.fn()
}))

const overlay = require('../../server/utils/firmOverlay')
const routes = require('../../server/routes/depreciationRates')
const { BASE_DEPRECIATION_RATES } = require('../../server/utils/depreciationRates')
const { setFirmMembership } = require('../../server/utils/tierChain')

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

function entry (over) {
  return Object.assign({
    label: 'Motor vehicles (up to 12 seats)',
    method: 'dv',
    dvRate: 0.5,
    slRate: 0.4,
    lifeYears: 4,
    source: { document: 'IR265', page: '61', published: '2023-10' }
  }, over || {})
}

function boost (over) {
  return Object.assign({
    name: 'Investment Boost',
    rate: 0.2,
    startsOn: '2025-05-22',
    source: { document: 'Inland Revenue — New assets: Investment Boost', published: '2025-05' }
  }, over || {})
}

/** What the store holds for this firm, as the routes would read it back. */
function stored (tables) {
  overlay.loadFirmConfig.mockImplementation(scopeId =>
    Promise.resolve(scopeId === FIRM ? tables : null))
}

beforeEach(() => {
  jest.clearAllMocks()
  overlay.loadFirmConfig.mockResolvedValue(null)
  overlay.saveFirmConfig.mockResolvedValue(undefined)
  setFirmMembership({})
})

describe('reading the rates an advisor works to', () => {
  test('a country nobody has approved gets the app’s six rates, and a 200', async () => {
    const res = makeRes()
    await routes.get(makeReq({ query: { country: 'NZ' } }), res)
    expect(res._status).toBe(200)
    expect(res._body.isDefault).toBe(true)
    expect(res._body.categories.vehicles.dvRate).toBe(BASE_DEPRECIATION_RATES.vehicles.dvRate)
  })

  // 🔴 "Never block the advisor" — Mike, 2026-09-08. A storage failure must not stop someone
  // mid-report, so it degrades rather than erroring.
  test('a storage failure still answers 200 with the defaults', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    overlay.loadFirmConfig.mockRejectedValue(
      Object.assign(new Error('refused'), { code: 'ER_NO', sqlState: '23000' })
    )
    const res = makeRes()
    await routes.get(makeReq({ query: { country: 'NZ' } }), res)
    expect(res._status).toBe(200)
    expect(res._body.isDefault).toBe(true)
    spy.mockRestore()
  })

  test('an absent country is not an error — it resolves to the defaults', async () => {
    const res = makeRes()
    await routes.get(makeReq({ query: {} }), res)
    expect(res._status).toBe(200)
    expect(res._body.country).toBeNull()
  })
})

describe('approving a country’s rates', () => {
  // 🔴 THE FORGERY GUARD. The body's approver is ignored entirely.
  test('approvedBy comes from the verified token, never from the body', async () => {
    const res = makeRes()
    await routes.approveRates(makeReq({
      body: { country: 'NZ', categories: { vehicles: entry() }, approvedBy: 'someone.else@example.com' }
    }), res)

    expect(res._status).toBe(200)
    const written = overlay.saveFirmConfig.mock.calls[0][2]
    expect(written.NZ.approvedBy).toBe(MANAGER)
    expect(JSON.stringify(written)).not.toContain('someone.else@example.com')
  })

  test('it writes to the caller’s own verified scope, not one named in the body', async () => {
    const res = makeRes()
    await routes.approveRates(makeReq({
      body: { country: 'NZ', categories: { vehicles: entry() }, firmId: 'some-other-firm' }
    }), res)
    expect(overlay.saveFirmConfig.mock.calls[0][0]).toBe(FIRM)
  })

  test('a rate typed in the wrong unit is refused, and nothing is written', async () => {
    const res = makeRes()
    await routes.approveRates(makeReq({
      body: { country: 'NZ', categories: { vehicles: entry({ dvRate: 50 }) } }
    }), res)
    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('INVALID_RATES')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('a country that is not a two-letter code is refused', async () => {
    const res = makeRes()
    await routes.approveRates(makeReq({ body: { country: 'New Zealand', categories: { vehicles: entry() } } }), res)
    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('INVALID_COUNTRY')
  })

  test('approving one country leaves another country’s table untouched', async () => {
    stored({
      AU: {
        approvedAt: '2026-09-01T00:00:00.000Z',
        approvedBy: 'someone@example.com',
        categories: { other: entry({ label: 'Other', source: { document: 'TR 2025/1', published: '2025-07' } }) }
      }
    })
    const res = makeRes()
    await routes.approveRates(makeReq({ body: { country: 'NZ', categories: { vehicles: entry() } } }), res)

    const written = overlay.saveFirmConfig.mock.calls[0][2]
    expect(written.AU.categories.other).toBeDefined()
    expect(written.NZ.categories.vehicles.dvRate).toBe(0.5)
  })

  // 🔴 RULING OF 2026-09-09, MADE STRUCTURAL. Confirming a rate table cannot adopt a tax
  // scheme, and cannot quietly re-sign one already adopted.
  test('it never adopts a first-year rule, and never re-approves one', async () => {
    stored({
      NZ: {
        approvedAt: '2026-09-01T00:00:00.000Z',
        approvedBy: 'earlier@example.com',
        categories: { other: entry() },
        firstYearRule: Object.assign(boost(), {
          approvedAt: '2026-09-02T00:00:00.000Z',
          approvedBy: 'adopter@example.com'
        })
      }
    })
    const res = makeRes()
    await routes.approveRates(makeReq({ body: { country: 'NZ', categories: { vehicles: entry() } } }), res)

    const written = overlay.saveFirmConfig.mock.calls[0][2]
    // Carried through untouched — same approver, same date.
    expect(written.NZ.firstYearRule.approvedBy).toBe('adopter@example.com')
    expect(written.NZ.firstYearRule.approvedAt).toBe('2026-09-02T00:00:00.000Z')
    // And the rates it was asked to approve did change.
    expect(written.NZ.approvedBy).toBe(MANAGER)
  })

  test('a body carrying no categories at all is refused', async () => {
    const res = makeRes()
    await routes.approveRates(makeReq({ body: { country: 'NZ' } }), res)
    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })
})

describe('adopting a country’s first-year rule', () => {
  test('the rule carries its OWN approver, from the verified token', async () => {
    const res = makeRes()
    await routes.approveFirstYearRule(makeReq({
      body: { country: 'NZ', rule: Object.assign(boost(), { approvedBy: 'forged@example.com' }) }
    }), res)

    expect(res._status).toBe(200)
    const written = overlay.saveFirmConfig.mock.calls[0][2]
    expect(written.NZ.firstYearRule.approvedBy).toBe(MANAGER)
    expect(JSON.stringify(written)).not.toContain('forged@example.com')
  })

  // The other half of ruling 2026-09-09: the two decisions cannot contaminate each other.
  test('adopting a rule does not disturb rates already approved', async () => {
    stored({
      NZ: {
        approvedAt: '2026-09-01T00:00:00.000Z',
        approvedBy: 'earlier@example.com',
        categories: { vehicles: entry({ dvRate: 0.5 }) }
      }
    })
    const res = makeRes()
    await routes.approveFirstYearRule(makeReq({ body: { country: 'NZ', rule: boost() } }), res)

    const written = overlay.saveFirmConfig.mock.calls[0][2]
    expect(written.NZ.categories.vehicles.dvRate).toBe(0.5)
    expect(written.NZ.approvedBy).toBe('earlier@example.com')
    expect(written.NZ.approvedAt).toBe('2026-09-01T00:00:00.000Z')
  })

  test('a share typed in the wrong unit is refused, and nothing is written', async () => {
    const res = makeRes()
    await routes.approveFirstYearRule(makeReq({ body: { country: 'NZ', rule: boost({ rate: 20 }) } }), res)
    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('INVALID_RULE')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  // Mike's own point of 2026-09-09: a month cannot decide eligibility at the boundary.
  test('a start date given as a month is refused', async () => {
    const res = makeRes()
    await routes.approveFirstYearRule(makeReq({ body: { country: 'NZ', rule: boost({ startsOn: '2025-05' }) } }), res)
    expect(res._status).toBe(400)
  })

  test('withdrawing a rule leaves the rates in place', async () => {
    stored({
      NZ: {
        approvedAt: '2026-09-01T00:00:00.000Z',
        approvedBy: 'earlier@example.com',
        categories: { vehicles: entry() },
        firstYearRule: Object.assign(boost(), {
          approvedAt: '2026-09-02T00:00:00.000Z', approvedBy: 'adopter@example.com'
        })
      }
    })
    const res = makeRes()
    await routes.approveFirstYearRule(makeReq({ body: { country: 'NZ', rule: null } }), res)

    expect(res._status).toBe(200)
    const written = overlay.saveFirmConfig.mock.calls[0][2]
    expect(written.NZ.firstYearRule).toBeUndefined()
    expect(written.NZ.categories.vehicles).toBeDefined()
  })

  // A table holding only a rule has nothing left to say once the rule goes — leaving an
  // empty table behind would claim on screen to be this scope's own.
  test('withdrawing the only thing a country held removes the country', async () => {
    stored({
      NZ: {
        approvedAt: '2026-09-01T00:00:00.000Z',
        approvedBy: 'earlier@example.com',
        categories: {},
        firstYearRule: Object.assign(boost(), {
          approvedAt: '2026-09-02T00:00:00.000Z', approvedBy: 'adopter@example.com'
        })
      }
    })
    const res = makeRes()
    await routes.approveFirstYearRule(makeReq({ body: { country: 'NZ', rule: null } }), res)
    expect(overlay.saveFirmConfig.mock.calls[0][2].NZ).toBeUndefined()
  })

  test('withdrawing where nothing was ever adopted is a 404, not a silent success', async () => {
    const res = makeRes()
    await routes.approveFirstYearRule(makeReq({ body: { country: 'NZ', rule: null } }), res)
    expect(res._status).toBe(404)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })
})

describe('what a manager is shown', () => {
  test('it separates what is inherited from what this scope approved itself', async () => {
    stored({
      NZ: {
        approvedAt: '2026-09-01T00:00:00.000Z',
        approvedBy: MANAGER,
        categories: { vehicles: entry({ dvRate: 0.5 }) }
      }
    })
    const res = makeRes()
    await routes.getForManager(makeReq({ query: { country: 'NZ' } }), res)

    expect(res._status).toBe(200)
    expect(res._body.hasOwn).toBe(true)
    expect(res._body.own.categories.vehicles.dvRate).toBe(0.5)
    // Nothing above this firm has approved anything, so the layer above is the app's own.
    expect(res._body.inherited.categories.vehicles.dvRate).toBe(BASE_DEPRECIATION_RATES.vehicles.dvRate)
    expect(res._body.resolved.categories.vehicles.dvRate).toBe(0.5)
    expect(res._body.countries).toEqual(['NZ'])
  })

  test('a scope that has approved nothing says so rather than inventing a table', async () => {
    const res = makeRes()
    await routes.getForManager(makeReq({ query: { country: 'NZ' } }), res)
    expect(res._body.hasOwn).toBe(false)
    expect(res._body.own).toBeNull()
    expect(res._body.countries).toEqual([])
  })

  test('with no country asked for, it still lists the countries held', async () => {
    stored({
      NZ: { approvedAt: '2026-09-01T00:00:00.000Z', approvedBy: MANAGER, categories: { vehicles: entry() } },
      AU: { approvedAt: '2026-09-01T00:00:00.000Z', approvedBy: MANAGER, categories: { other: entry() } }
    })
    const res = makeRes()
    await routes.getForManager(makeReq({ query: {} }), res)
    expect(res._body.country).toBeNull()
    expect(res._body.countries).toEqual(['AU', 'NZ'])
  })

  test('a storage refusal surfaces as a 500 rather than an empty screen', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    overlay.loadFirmConfig.mockRejectedValue(
      Object.assign(new Error('refused'), { code: 'ER_NO', sqlState: '23000' })
    )
    const res = makeRes()
    await routes.getForManager(makeReq({ query: { country: 'NZ' } }), res)
    expect(res._status).toBe(500)
    spy.mockRestore()
  })
})

describe('history and restore', () => {
  test('history reads this scope’s own versions', async () => {
    overlay.getVersionHistory.mockResolvedValue([{ id: 7 }])
    const res = makeRes()
    await routes.history(makeReq(), res)
    expect(overlay.getVersionHistory).toHaveBeenCalledWith(FIRM, 'depreciation-rates')
    expect(res._body.history).toEqual([{ id: 7 }])
  })

  test('restore without a version is refused', async () => {
    const res = makeRes()
    await routes.restore(makeReq({ body: {} }), res)
    expect(res._status).toBe(400)
    expect(overlay.restoreVersion).not.toHaveBeenCalled()
  })

  test('restore names this scope, never one from the body', async () => {
    overlay.restoreVersion.mockResolvedValue(undefined)
    const res = makeRes()
    await routes.restore(makeReq({ body: { versionId: 4, firmId: 'other-firm', country: 'NZ' } }), res)
    expect(overlay.restoreVersion).toHaveBeenCalledWith(FIRM, 'depreciation-rates', 4)
    expect(res._body.restored).toBe(true)
  })
})
