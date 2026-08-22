'use strict'

const fs = require('fs')
const path = require('path')
const { multipleProperty } = require('../../server/routes/report')

/**
 * Route test — POST /api/report/multiple-property.
 *
 * The maths itself is golden-tested in multiplePropertyModel.test.js; this suite proves
 * the HTTP layer: the standard { success, data, timestamp } envelope, the safe
 * { code, message } failure shape (never a stack trace, path or the model's own error
 * text), and that the route is actually registered — an unregistered handler fails
 * silently at the screen, not here. The model is defensive and never throws on input, so
 * the failure branch is exercised by mocking it to throw.
 *
 * It also pins the one thing this report can leak that the others cannot: a client's real
 * property address is an input, and it must not reach a log line.
 */

/** Minimal Restify res double capturing what the handler sends. */
function makeRes () {
  const res = { statusCode: null, body: null }
  res.send = (status, body) => { res.statusCode = status; res.body = body }
  return res
}

describe('POST /api/report/multiple-property', () => {
  afterEach(() => { jest.resetModules(); jest.dontMock('../../server/report/multiplePropertyModel') })

  it('returns the standard envelope with the four headline figures', () => {
    const res = makeRes()
    const next = jest.fn()
    multipleProperty({ body: {} }, res, next)

    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
    expect(new Date(res.body.timestamp).toString()).not.toBe('Invalid Date')
    expect(next).toHaveBeenCalled()

    const data = res.body.data
    expect(data.headline.weeklyCashPosition).toBeCloseTo(-929.0269038, 4) //  MODEL C33
    expect(data.headline.totalDebt).toBeCloseTo(611143.726, 2) //             OUTPUTS C13
    expect(data.headline.netEquityFinalYear).toBeCloseTo(517406.9061527, 2)
    expect(data.headline.returnOnInvestorFundsFinalYear).toBeCloseTo(-0.1674522227, 6)
    // R8: an empty body computes the sample and DECLARES it
    expect(data.defaultedInputs).toContain('rentPerWeek')
  })

  it('carries the ten-year detail and the rules the figures were built on', () => {
    const res = makeRes()
    multipleProperty({ body: {} }, res, jest.fn())
    const data = res.body.data

    expect(data.years).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(data.profitAndLoss.rental).toHaveLength(10)
    expect(data.taxPosition.depreciation).toHaveLength(10)
    expect(data.loans.interestOnly.balance).toHaveLength(10)
    expect(data.investmentSummary.capitalIntroduced).toHaveLength(10)
    // The screen must be able to state the tax rules rather than assume New Zealand,
    // including what the management fee actually costs once GST is inside it.
    expect(data.taxRules.effectiveManagementFeePct).toBeCloseTo(0.08625, 6)
    expect(data.endOfInterestOnly).toBe('convert')
  })

  it('accepts the settings the workbook has no cell for', () => {
    const res = makeRes()
    multipleProperty({ body: { endOfInterestOnly: 'repay', lossTreatment: 'offset' } }, res, jest.fn())
    const data = res.body.data

    expect(data.endOfInterestOnly).toBe('repay')
    expect(data.investmentSummary.capitalIntroduced[8]).toBe(350000)
    expect(data.taxRules.lossTreatment).toBe('offset')
    expect(data.profitAndLoss.taxPayable[0]).toBeLessThan(0) // the refund
  })

  it('a non-object body computes the declared sample, never crashes', () => {
    const res = makeRes()
    multipleProperty({ body: 'not-json' }, res, jest.fn())
    expect(res.statusCode).toBe(200)
    expect(res.body.data.headline.weeklyCashPosition).toBeCloseTo(-929.0269038, 4)
  })

  it('a compute failure returns the safe 400 shape and leaks nothing', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      jest.resetModules()
      jest.doMock('../../server/report/multiplePropertyModel', () => ({
        computeMultiplePropertyAssessment: () => {
          throw new Error('boom at /srv/secret/multiplePropertyModel.js:99')
        }
      }))
      const route = require('../../server/routes/report')
      const res = makeRes()
      const next = jest.fn()
      route.multipleProperty({ body: {} }, res, next)

      expect(res.statusCode).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toEqual({
        code: 'MULTIPLE_PROPERTY_COMPUTE_FAILED',
        message: 'Could not compute the model from the supplied inputs.'
      })
      expect(next).toHaveBeenCalled()
      // the model's own error text stays server-side (logged), never in the response
      expect(JSON.stringify(res.body)).not.toMatch(/boom|secret|\.js|at /)
      expect(spy).toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })

  it('never logs the client\'s property address, even when the compute fails', () => {
    // Decision class: the address is a real one. It is echoed back to the caller who
    // sent it, but it must not end up in a server log line where it outlives the request.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      jest.resetModules()
      jest.doMock('../../server/report/multiplePropertyModel', () => ({
        computeMultiplePropertyAssessment: () => { throw new Error('boom') }
      }))
      const route = require('../../server/routes/report')
      route.multipleProperty({ body: { address: '14 Real Client Road, Actualtown' } }, makeRes(), jest.fn())

      const logged = spy.mock.calls.map(c => c.map(String).join(' ')).join('\n')
      expect(logged).not.toMatch(/Real Client Road|Actualtown/)
    } finally {
      spy.mockRestore()
    }
  })

  // -------------------------------------------------------------------------
  // PHASE 2 — the same route, the portfolio shape (item 4.19, 2026-08-20)
  // -------------------------------------------------------------------------

  it('🔴 the ORIGINAL body still computes ONE property, byte for byte', () => {
    // The Phase 1 screen is LIVE in UAT and calls this route. Phase 2 must be invisible
    // to it. This is the test that fails the build if the old contract ever moves.
    const before = makeRes()
    multipleProperty({ body: { rentPerWeek: 700, purchasePrice: 700000, land: 300000, building: 370000, chattels: 30000 } }, before, jest.fn())

    expect(before.body.data.properties).toBeUndefined() //     no portfolio keys leak in
    expect(before.body.data.consolidated).toBeUndefined()
    expect(before.body.data.apportionment).toBeUndefined()
    // and the single-property shape is all still there
    expect(before.body.data.address).toBeDefined()
    expect(before.body.data.investmentSummary.propertyValue[0]).toBeCloseTo(700000, 6)
    expect(before.body.data.taxRules.effectiveManagementFeePct).toBeCloseTo(0.08625, 9)
  })

  it('an EMPTY body is still one property, not a five-property portfolio', () => {
    // The most likely accident in the whole change: "no properties supplied" must not be
    // read as "give me the sample portfolio".
    const res = makeRes()
    multipleProperty({ body: {} }, res, jest.fn())
    expect(res.body.data.consolidated).toBeUndefined()
    expect(res.body.data.headline.totalDebt).toBeCloseTo(611143.726, 2) //  OUTPUTS C13
  })

  it('a body with `properties` computes the portfolio', () => {
    const res = makeRes()
    multipleProperty({ body: { properties: [{ purchasePrice: 649000, land: 260000, building: 359168, chattels: 29832 }] } }, res, jest.fn())

    expect(res.statusCode).toBe(200)
    expect(res.body.data.properties).toHaveLength(1)
    expect(res.body.data.consolidated.years).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(res.body.data.apportionment.totals.value).toBeGreaterThan(0)
  })

  it('a body with only a `household` computes the sample portfolio', () => {
    const res = makeRes()
    multipleProperty({ body: { household: { totalSavings: 500000 } } }, res, jest.fn())

    expect(res.body.data.properties).toHaveLength(5)
    expect(res.body.data.household.totalSavings).toBe(500000)
    // Consolidated Report row 22 — five purchase prices, and it matches the workbook.
    expect(res.body.data.consolidated.totalPropertyValue[0]).toBeCloseTo(3462000, 2)
  })

  it('carries the consolidation, the servicing demand and the warnings', () => {
    const res = makeRes()
    multipleProperty({ body: { household: {} } }, res, jest.fn())
    const data = res.body.data

    // Consolidated Report row 11 — Total Revenue, matching the sheet's own cache.
    expect(data.consolidated.totalRevenue[0]).toBeCloseTo(149750, 3)
    expect(data.consolidated.servicing.totalDemand).toHaveLength(10)
    expect(data.consolidated.servicing.peakYear).toBeGreaterThanOrEqual(1)
    // The sample caps property 1's typed interest-only loan; the route must carry it out.
    expect(data.warnings.map(w => w.code)).toContain('INTEREST_ONLY_CAPPED')
  })

  it('the lending ceiling arrives on the household and is TESTED, not assumed', () => {
    // It is resolved by the authenticated GET /api/report/property-tax-rules and passed
    // back in here, so this anonymous route never reads a firm's configuration.
    const off = makeRes()
    multipleProperty({ body: { household: {} } }, off, jest.fn())
    expect(off.body.data.apportionment.maxLvr).toBeNull()
    expect(off.body.data.warnings.filter(w => /LVR/.test(w.code))).toHaveLength(0)

    const on = makeRes()
    multipleProperty({ body: { household: { maxLvr: 0.8 } } }, on, jest.fn())
    expect(on.body.data.warnings.map(w => w.code)).toContain('INVESTMENT_LVR_EXCEEDED')
  })

  it('the family hold-back survives the round trip', () => {
    const res = makeRes()
    multipleProperty({ body: { household: {}, properties: [{ purchasePrice: 649000, land: 260000, building: 359168, chattels: 29832, depositApplied: 215000 }] } }, res, jest.fn())

    const slot = res.body.data.apportionment.properties[0]
    expect(slot.depositApplied).toBe(215000)
    expect(slot.requiredFunding).toBe(434000) //          649,000 − 215,000
    expect(res.body.data.apportionment.depositHeldBack).toBe(100000)
  })

  it('never logs ANY of the five property addresses when the portfolio fails', () => {
    // Phase 1 could leak one real address; a portfolio request carries five.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      jest.resetModules()
      jest.doMock('../../server/report/multiplePropertyModel', () => ({
        computeMultiplePropertyAssessment: () => { throw new Error('boom') },
        computeMultiplePropertyPortfolio: () => { throw new Error('boom') }
      }))
      const route = require('../../server/routes/report')
      route.multipleProperty({
        body: {
          household: { residenceValue: 1400000 },
          properties: [
            { address: '1 Alpha Street, Onetown' },
            { address: '2 Bravo Road, Twotown' },
            { address: '3 Charlie Lane, Threetown' },
            { address: '4 Delta Drive, Fourtown' },
            { address: '5 Echo Avenue, Fivetown' }
          ]
        }
      }, makeRes(), jest.fn())

      const logged = spy.mock.calls.map(c => c.map(String).join(' ')).join(' ')
      const addresses = /Alpha Street|Onetown|Bravo Road|Twotown|Charlie Lane|Threetown|Delta Drive|Fourtown|Echo Avenue|Fivetown/
      expect(logged).not.toMatch(addresses)
    } finally {
      spy.mockRestore()
    }
  })

  it('fails safely on the portfolio shape too, with the same envelope', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      jest.resetModules()
      jest.doMock('../../server/report/multiplePropertyModel', () => ({
        computeMultiplePropertyAssessment: () => ({}),
        computeMultiplePropertyPortfolio: () => { throw new Error('boom') }
      }))
      const route = require('../../server/routes/report')
      const res = makeRes()
      route.multipleProperty({ body: { household: {} } }, res, jest.fn())

      expect(res.statusCode).toBe(400)
      expect(res.body.error.code).toBe('MULTIPLE_PROPERTY_COMPUTE_FAILED')
      expect(JSON.stringify(res.body)).not.toMatch(/boom|\.js|at /)
    } finally {
      spy.mockRestore()
    }
  })

  it('source tripwire — the route is registered in restify-server.js, anonymous by design', () => {
    // Registration is wiring the unit tests cannot see, so pin the line itself.
    // Calc-only route: NO firmAuth (numbers in, numbers out).
    const src = fs.readFileSync(path.join(__dirname, '../../server/restify-server.js'), 'utf8')
    expect(src).toMatch(/server\.post\('\/api\/report\/multiple-property', reportRoute\.multipleProperty\)/)
    expect(src).not.toMatch(/server\.post\('\/api\/report\/multiple-property', firmAuth/)
  })
})
