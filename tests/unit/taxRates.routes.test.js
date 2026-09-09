'use strict'

/**
 * The tax-rates routes — item 4.81, slice 2.
 *
 * 🔴 THE THREE THAT MATTER, and none of them is visible to a person in UAT:
 *
 *   1. `approvedBy` COMES FROM THE VERIFIED TOKEN, NEVER THE BODY. It is the name that
 *      appears beside a tax rate on a document a lender reads. A body-supplied approver
 *      would let anyone with the route sign somebody else's name to a tax table, and the
 *      screen would look perfectly normal.
 *
 *   2. THE SCOPE COMES FROM THE VERIFIED TOKEN TOO. No handler reads a scope from a body or
 *      a query, so one firm can never read or write another's tax figures — `tier-cascade.md`
 *      P6. A leak here is silent by construction: the wrong firm's rate looks like a rate.
 *
 *   3. A READ NEVER BLOCKS AN ADVISOR. Mike's words, 2026-09-08: "Never block the advisor."
 *      A storage failure degrades to the app's own four figures and a 200, because the
 *      alternative is stopping someone mid-report over a document a manager elsewhere has
 *      not loaded. Those four are what every forecast uses today, so the degraded answer is
 *      exactly today's behaviour.
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

const fs = require('fs')
const overlay = require('../../server/utils/firmOverlay')
const routes = require('../../server/routes/taxRates')
const { BASE_TAX_FIGURES } = require('../../server/utils/taxRates')
const { setFirmMembership, parentScopeOf } = require('../../server/utils/tierChain')

const FIRM = 'firm-test-123'
const MANAGER = 'manager@example.com'
const MENTOR = parentScopeOf(FIRM)

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

function source (over) {
  return Object.assign({ document: 'ATO — Company tax rates', page: '1', published: '2025-07' }, over || {})
}

function figures (over) {
  return Object.assign({
    companyTax: { rate: 0.3, appliesTo: 'Base rate entities', source: source() },
    gst: { rate: 0.1, source: source({ page: '2' }) },
    filing: { months: 3, label: 'Quarterly (BAS)', source: source({ page: '4' }) },
    basis: { basis: 'invoice', label: 'Accruals', source: source({ page: '4' }) }
  }, over || {})
}

/** What the store holds for one scope, as the routes would read it back. */
function stored (tables) {
  return tables
}

/**
 * A live MySQL server answering and REFUSING — the failure that must never fall back to a
 * local file. `sqlState` is the discriminator (`server/utils/dbFailure.js`): a connection
 * that never reached a server carries none, a rejection from one always does. A bare Error
 * is treated as "there is no database here" and the dev fallback runs, which is correct
 * behaviour and is why these tests must not use one to mean "the save failed".
 */
function refusal (message) {
  const err = new Error(message || 'refused')
  err.sqlState = '23000'
  err.errno = 1452
  return err
}

function approvedTable (over) {
  return Object.assign({
    approvedAt: '2026-09-09T14:20:00.000Z',
    approvedBy: 'someone.else@example.com',
    figures: figures()
  }, over || {})
}

beforeEach(() => {
  jest.clearAllMocks()
  overlay.loadFirmConfig.mockResolvedValue(null)
  overlay.saveFirmConfig.mockResolvedValue(undefined)
})

afterEach(() => {
  setFirmMembership({})
  // Any fs spy a dev-fallback test installed goes back, so nothing later in the file writes
  // to the repository or reads a stubbed file.
  jest.restoreAllMocks()
})

describe('the advisor’s read', () => {
  test('a firm with nothing approved anywhere gets the app’s own four', async () => {
    const res = makeRes()
    await routes.get(makeReq({ query: { country: 'AU' } }), res)
    expect(res._status).toBe(200)
    expect(res._body.isDefault).toBe(true)
    expect(res._body.figures.companyTax.rate).toBe(BASE_TAX_FIGURES.companyTax.rate)
  })

  test('an approved table reaches the advisor with its origin on every figure', async () => {
    overlay.loadFirmConfig.mockImplementation(scopeId =>
      Promise.resolve(scopeId === FIRM ? stored({ AU: approvedTable() }) : null))
    const res = makeRes()
    await routes.get(makeReq({ query: { country: 'AU' } }), res)
    expect(res._body.figures.companyTax.rate).toBe(0.3)
    expect(res._body.figures.filing.months).toBe(3)
    expect(res._body.figures.companyTax.originScopeId).toBe(FIRM)
  })

  // 🔴 Mike's ruling, 2026-09-08: "Never block the advisor." A store that is down must not
  // stop somebody building a forecast — and the fallback is what they get today anyway.
  test('a storage failure degrades to the defaults and a 200, never an error', async () => {
    overlay.loadFirmConfig.mockRejectedValue(refusal('firms row missing'))
    const res = makeRes()
    await routes.get(makeReq({ query: { country: 'AU' } }), res)
    expect(res._status).toBe(200)
    expect(res._body.isDefault).toBe(true)
    expect(res._body.figures.gst.rate).toBe(BASE_TAX_FIGURES.gst.rate)
  })

  test('a client country nobody has approved anything for is not an error', async () => {
    overlay.loadFirmConfig.mockImplementation(scopeId =>
      Promise.resolve(scopeId === FIRM ? stored({ AU: approvedTable() }) : null))
    const res = makeRes()
    await routes.get(makeReq({ query: { country: 'NZ' } }), res)
    expect(res._status).toBe(200)
    expect(res._body.isDefault).toBe(true)
  })

  test('no country at all is not an error either', async () => {
    const res = makeRes()
    await routes.get(makeReq({ query: {} }), res)
    expect(res._status).toBe(200)
    expect(res._body.country).toBeNull()
  })

  // The scope is the verified one from the JWT. Nothing in the query can move it.
  test('the read is scoped to the token’s firm, never to a query parameter', async () => {
    const res = makeRes()
    await routes.get(makeReq({ query: { country: 'AU', firmId: 'someone-else', scopeId: 'someone-else' } }), res)
    overlay.loadFirmConfig.mock.calls.forEach(([scopeId]) => {
      expect(scopeId).not.toBe('someone-else')
    })
  })
})

describe('the manager’s read', () => {
  test('it separates what is inherited from what this level approved', async () => {
    overlay.loadFirmConfig.mockImplementation(scopeId => Promise.resolve(
      scopeId === MENTOR
        ? stored({ AU: approvedTable() })
        : (scopeId === FIRM
            ? stored({ AU: approvedTable({ figures: { gst: { rate: 0.12, source: source() } } }) })
            : null)
    ))
    const res = makeRes()
    await routes.getForManager(makeReq({ query: { country: 'AU' } }), res)

    expect(res._status).toBe(200)
    expect(res._body.hasOwn).toBe(true)
    // Inherited is the PARENT resolved, not our own values subtracted — subtraction cannot
    // tell "same as above" from "approved here to the same thing".
    expect(res._body.inherited.figures.gst.rate).toBe(0.1)
    expect(res._body.resolved.figures.gst.rate).toBe(0.12)
    expect(res._body.own.figures.gst.rate).toBe(0.12)
  })

  test('a level with nothing of its own says so', async () => {
    const res = makeRes()
    await routes.getForManager(makeReq({ query: { country: 'AU' } }), res)
    expect(res._body.hasOwn).toBe(false)
    expect(res._body.own).toBeNull()
    expect(res._body.countries).toEqual([])
  })

  test('it lists the countries this level has approved something for', async () => {
    overlay.loadFirmConfig.mockImplementation(scopeId =>
      Promise.resolve(scopeId === FIRM ? stored({ NZ: approvedTable(), AU: approvedTable() }) : null))
    const res = makeRes()
    await routes.getForManager(makeReq({ query: { country: 'AU' } }), res)
    expect(res._body.countries).toEqual(['AU', 'NZ'])
  })

  test('no country asked for yields the defaults rather than a guess', async () => {
    const res = makeRes()
    await routes.getForManager(makeReq({ query: {} }), res)
    expect(res._status).toBe(200)
    expect(res._body.country).toBeNull()
    expect(res._body.hasOwn).toBe(false)
  })

  // The manager's read is a manager's screen, not a forecast. It may fail loudly.
  test('a database refusal is reported rather than dressed as defaults', async () => {
    overlay.loadFirmConfig.mockRejectedValue(refusal())
    const res = makeRes()
    await routes.getForManager(makeReq({ query: { country: 'AU' } }), res)
    expect(res._status).toBe(500)
    expect(errorBody(res).error.code).toBe('DB_ERROR')
  })

  test('the error carries no stack trace or storage detail', async () => {
    const err = refusal('ECONNREFUSED 10.0.0.4:3306')
    overlay.loadFirmConfig.mockRejectedValue(err)
    const res = makeRes()
    await routes.getForManager(makeReq({ query: { country: 'AU' } }), res)
    expect(JSON.stringify(errorBody(res))).not.toContain('3306')
  })

  // The affordance the dev fallback exists for: a machine with no MySQL at all still shows
  // the screen. A connection that never reached a server carries no sqlState.
  test('no database at all falls back rather than failing the screen', async () => {
    overlay.loadFirmConfig.mockRejectedValue(new Error('no db on this machine'))
    const res = makeRes()
    await routes.getForManager(makeReq({ query: { country: 'AU' } }), res)
    expect(res._status).toBe(200)
  })
})

describe('approving a country’s figures', () => {
  // 🔴 THE ONE THAT MATTERS MOST. The approver is the name beside a tax rate on a document a
  // lender reads. A body-supplied one would let anyone sign somebody else's name to it.
  test('the approver is the verified token, never the body', async () => {
    const res = makeRes()
    await routes.approveFigures(makeReq({
      body: { country: 'AU', figures: figures(), approvedBy: 'forged@example.com' }
    }), res)

    expect(res._status).toBe(200)
    const [, , written] = overlay.saveFirmConfig.mock.calls[0]
    expect(written.AU.approvedBy).toBe(MANAGER)
    expect(JSON.stringify(written)).not.toContain('forged@example.com')
  })

  test('the scope written to is the verified token, never the body', async () => {
    const res = makeRes()
    await routes.approveFigures(makeReq({
      body: { country: 'AU', figures: figures(), firmId: 'someone-else', scopeId: 'someone-else' }
    }), res)
    expect(res._status).toBe(200)
    expect(overlay.saveFirmConfig.mock.calls[0][0]).toBe(FIRM)
  })

  test('an approval date is stamped on the stored table', async () => {
    const res = makeRes()
    await routes.approveFigures(makeReq({ body: { country: 'AU', figures: figures() } }), res)
    const [, , written] = overlay.saveFirmConfig.mock.calls[0]
    expect(Number.isNaN(Date.parse(written.AU.approvedAt))).toBe(false)
  })

  test('approving one country leaves every other country untouched', async () => {
    overlay.loadFirmConfig.mockImplementation(scopeId =>
      Promise.resolve(scopeId === FIRM ? stored({ NZ: approvedTable() }) : null))
    const res = makeRes()
    await routes.approveFigures(makeReq({ body: { country: 'AU', figures: figures() } }), res)
    const [, , written] = overlay.saveFirmConfig.mock.calls[0]
    expect(written.NZ).toBeDefined()
    expect(written.AU).toBeDefined()
  })

  // A document publishing one figure is the common case, not an error.
  test('a table holding one figure is accepted', async () => {
    const res = makeRes()
    await routes.approveFigures(makeReq({
      body: { country: 'AU', figures: { companyTax: figures().companyTax } }
    }), res)
    expect(res._status).toBe(200)
  })

  test.each([
    ['no country', { figures: figures() }],
    ['a country name rather than a code', { country: 'Australia', figures: figures() }]
  ])('%s is refused before anything is stored', async (_label, body) => {
    const res = makeRes()
    await routes.approveFigures(makeReq({ body }), res)
    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('INVALID_COUNTRY')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test.each([
    ['missing', undefined],
    ['an array', []],
    ['a string', 'thirty percent']
  ])('figures that are %s are refused before anything is stored', async (_label, value) => {
    const res = makeRes()
    await routes.approveFigures(makeReq({ body: { country: 'AU', figures: value } }), res)
    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  // 🔴 A rate typed in the wrong unit would tax a company at 3000% in a forecast that still
  // balances. It is refused at the route, not clamped into something plausible.
  test('a rate given as a percentage is refused and nothing is stored', async () => {
    const res = makeRes()
    await routes.approveFigures(makeReq({
      body: { country: 'AU', figures: { companyTax: { rate: 30, source: source() } } }
    }), res)
    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('INVALID_FIGURES')
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  test('an unsourced figure is refused and nothing is stored', async () => {
    const res = makeRes()
    await routes.approveFigures(makeReq({
      body: { country: 'AU', figures: { gst: { rate: 0.1 } } }
    }), res)
    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  // A cycle that does not divide into twelve leaves a return falling due outside the forecast.
  test('a filing cycle the forecast cannot carry is refused', async () => {
    const res = makeRes()
    await routes.approveFigures(makeReq({
      body: { country: 'AU', figures: { filing: { months: 5, label: 'Every 5 months', source: source() } } }
    }), res)
    expect(res._status).toBe(400)
    expect(overlay.saveFirmConfig).not.toHaveBeenCalled()
  })

  // 🔴 THE FALSE-PASS FAULT `dbFailure.js` EXISTS TO CATCH. A live server that REFUSES the
  // write must never be read as "there is no database here" and quietly redirected to a local
  // scratch file while the manager is told the table was approved. The mentor's own saves ran
  // silently broken for weeks exactly that way.
  test('a database refusal is reported rather than reported as saved', async () => {
    overlay.saveFirmConfig.mockRejectedValue(refusal())
    const res = makeRes()
    await routes.approveFigures(makeReq({ body: { country: 'AU', figures: figures() } }), res)
    expect(res._status).toBe(500)
    expect(errorBody(res).error.code).toBe('DB_ERROR')
    expect(res._body.approved).toBeUndefined()
  })

  test('the resolved result comes back so the screen need not re-read it', async () => {
    const res = makeRes()
    await routes.approveFigures(makeReq({ body: { country: 'AU', figures: figures() } }), res)
    expect(res._body.approved).toBe(true)
    expect(res._body.country).toBe('AU')
    expect(res._body.resolved).toBeDefined()
  })
})

describe('with no database at all — the dev fallback', () => {
  // The affordance in `dbFailure.js`: a developer machine with no MySQL still works, and a
  // connection that never reached a server carries no sqlState. `fs` is spied on so the
  // fallback's read and write run for real without touching the repository.
  test('an approval is written to the local file rather than lost', async () => {
    overlay.saveFirmConfig.mockRejectedValue(new Error('no db on this machine'))
    const write = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {})
    jest.spyOn(fs, 'readFileSync').mockImplementation(() => { throw new Error('no such file') })

    const res = makeRes()
    await routes.approveFigures(makeReq({ body: { country: 'AU', figures: figures() } }), res)

    expect(res._status).toBe(200)
    expect(write).toHaveBeenCalled()
    // Still the verified approver, on the fallback path as much as the real one.
    const written = JSON.parse(write.mock.calls[0][1])
    expect(written[FIRM].AU.approvedBy).toBe(MANAGER)
  })

  test('a local file that cannot be parsed reads as nothing rather than throwing', async () => {
    overlay.loadFirmConfig.mockRejectedValue(new Error('no db on this machine'))
    jest.spyOn(fs, 'readFileSync').mockReturnValue('{ not json')

    const res = makeRes()
    await routes.get(makeReq({ query: { country: 'AU' } }), res)
    expect(res._status).toBe(200)
    expect(res._body.isDefault).toBe(true)
  })

  test('a local file holding this scope’s table is used', async () => {
    overlay.loadFirmConfig.mockRejectedValue(new Error('no db on this machine'))
    jest.spyOn(fs, 'readFileSync')
      .mockReturnValue(JSON.stringify({ [FIRM]: { AU: approvedTable() } }))

    const res = makeRes()
    await routes.get(makeReq({ query: { country: 'AU' } }), res)
    expect(res._body.figures.companyTax.rate).toBe(0.3)
  })
})

describe('the last-resort guard on the advisor’s read', () => {
  // 🔴 "Never block the advisor" has to hold against a fault nobody foresaw, not only the
  // ones the resolver already catches. This forces the resolver itself to reject — which it
  // is written never to do — and proves the route still answers with the app's own four.
  test('an unforeseen failure still answers with the defaults and a 200', async () => {
    jest.resetModules()
    jest.doMock('../../server/utils/taxRates', () => {
      const actual = jest.requireActual('../../server/utils/taxRates')
      return Object.assign({}, actual, {
        loadResolvedTaxRates: () => Promise.reject(new Error('unforeseen'))
      })
    })

    const isolated = require('../../server/routes/taxRates')
    const res = makeRes()
    await isolated.get(makeReq({ query: { country: 'AU' } }), res)

    expect(res._status).toBe(200)
    expect(res._body.isDefault).toBe(true)
    expect(res._body.country).toBe('AU')
    expect(res._body.figures.companyTax.rate).toBe(BASE_TAX_FIGURES.companyTax.rate)

    jest.dontMock('../../server/utils/taxRates')
    jest.resetModules()
  })
})

describe('history and restore', () => {
  test('history is this scope’s own versions', async () => {
    overlay.getVersionHistory.mockResolvedValue([{ versionId: 2 }, { versionId: 1 }])
    const res = makeRes()
    await routes.history(makeReq(), res)
    expect(res._status).toBe(200)
    expect(res._body.history).toHaveLength(2)
    expect(overlay.getVersionHistory.mock.calls[0][0]).toBe(FIRM)
  })

  test('a database refusal is reported, not silently empty', async () => {
    overlay.getVersionHistory.mockRejectedValue(refusal())
    const res = makeRes()
    await routes.history(makeReq(), res)
    expect(res._status).toBe(500)
  })

  test('no database at all yields an empty history rather than an error', async () => {
    overlay.getVersionHistory.mockRejectedValue(new Error('no db on this machine'))
    const res = makeRes()
    await routes.history(makeReq(), res)
    expect(res._status).toBe(200)
    expect(res._body.history).toEqual([])
  })

  test('restore needs a version to restore', async () => {
    const res = makeRes()
    await routes.restore(makeReq({ body: {} }), res)
    expect(res._status).toBe(400)
    expect(errorBody(res).error.code).toBe('MISSING_VERSION')
    expect(overlay.restoreVersion).not.toHaveBeenCalled()
  })

  test('restore is scoped to the token’s firm', async () => {
    overlay.restoreVersion.mockResolvedValue(undefined)
    const res = makeRes()
    await routes.restore(makeReq({ body: { versionId: 4, country: 'AU', firmId: 'someone-else' } }), res)
    expect(res._status).toBe(200)
    expect(overlay.restoreVersion.mock.calls[0][0]).toBe(FIRM)
  })

  test('a restore failure is reported rather than reported as restored', async () => {
    overlay.restoreVersion.mockRejectedValue(new Error('no such version'))
    const res = makeRes()
    await routes.restore(makeReq({ body: { versionId: 99 } }), res)
    expect(res._status).toBe(500)
  })
})
