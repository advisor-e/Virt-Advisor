'use strict'

const fs = require('fs')
const path = require('path')
const { costOfCapital } = require('../../server/routes/report')

/**
 * Route test — POST /api/report/cost-of-capital.
 *
 * The maths itself is golden-tested in costOfCapitalModel.test.js; this suite proves the
 * HTTP layer: the standard { success, data, timestamp } envelope, the safe
 * { code, message } failure shape (never a stack trace, path or the model's own error
 * text), and that the route is actually registered — an unregistered handler fails
 * silently at the screen, not here. The model is defensive and never throws on input, so
 * the failure branch is exercised by mocking it to throw.
 */

/** Minimal Restify res double capturing what the handler sends. */
function makeRes () {
  const res = { statusCode: null, body: null }
  res.send = (status, body) => { res.statusCode = status; res.body = body }
  return res
}

describe('POST /api/report/cost-of-capital', () => {
  afterEach(() => { jest.resetModules(); jest.dontMock('../../server/report/costOfCapitalModel') })

  it('returns the standard envelope with the corrected WACC and both betas', () => {
    const res = makeRes()
    const next = jest.fn()
    costOfCapital({ body: {} }, res, next)

    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
    expect(new Date(res.body.timestamp).toString()).not.toBe('Invalid Date')
    expect(next).toHaveBeenCalled()

    const data = res.body.data
    expect(data.wacc.wacc).toBeCloseTo(0.06162727725, 9) //        E26, corrected
    expect(data.beta.growthRate).toBeCloseTo(0.04245666083, 9) //  AE42, corrected
    expect(data.betaSuggestions.roi).toBeCloseTo(0.47226541524, 8) //     I9
    expect(data.betaSuggestions.volatility).toBeCloseTo(0.36173857867, 8) // I15
    expect(data.growthSource).toBe('betaHelper') //  E10 = 'Beta Calcs'!F9

    // R8: an empty body computes the sample and DECLARES it
    expect(data.wacc.defaultedInputs).toContain('beta')
    expect(data.beta.defaultedInputs).toContain('equityValues')
  })

  it('SENTINEL: the route never serves the workbook\'s defective 1.62%', () => {
    // The defect this model exists to correct: the published WACC was the debt cost
    // alone. If it ever reappears it must fail at the boundary the screen actually calls.
    const res = makeRes()
    costOfCapital({ body: {} }, res, jest.fn())
    expect(res.body.data.wacc.wacc).not.toBeCloseTo(0.0162, 4)
    expect(res.body.data.wacc.equityComponent).toBeGreaterThan(0)
  })

  it('passes supplied inputs through to the maths', () => {
    const res = makeRes()
    costOfCapital({ body: { beta: 1.5, growthRate: 0 } }, res, jest.fn())

    expect(res.statusCode).toBe(200)
    expect(res.body.data.growthSource).toBe('supplied')
    expect(res.body.data.betaSuggestions.inUse).toBe(1.5)
    // A riskier company costs more to fund than the sample's beta of 0.52.
    expect(res.body.data.wacc.wacc).toBeGreaterThan(0.06162727725)
  })

  it('carries the hurdle test through when an investment is supplied, and omits it when not', () => {
    // The route passes the whole body to the model, so the hurdle needs no wiring of its
    // own — which is exactly why it needs a test: nothing here would fail if a future
    // refactor started forwarding a hand-picked list of fields instead.
    const bare = makeRes()
    costOfCapital({ body: {} }, bare, jest.fn())
    expect(bare.body.data.hurdle).toBeNull()

    const res = makeRes()
    costOfCapital({ body: { investmentCost: 250000, annualReturn: 22000 } }, res, jest.fn())
    expect(res.statusCode).toBe(200)
    expect(res.body.data.hurdle.verdict).toBe('CLEARS')
    expect(res.body.data.hurdle.returnRate).toBeCloseTo(0.088, 12)
    expect(res.body.data.hurdle.requiredAnnualReturn).toBeCloseTo(15406.819312, 5)
    // judged against the wacc this same response carries
    expect(res.body.data.hurdle.hurdleRate).toBe(res.body.data.wacc.wacc)
  })

  it('a non-object body computes the declared sample, never crashes', () => {
    const res = makeRes()
    costOfCapital({ body: 'not-json' }, res, jest.fn())
    expect(res.statusCode).toBe(200)
    expect(res.body.data.wacc.wacc).toBeCloseTo(0.06162727725, 9)
  })

  it('a compute failure returns the safe 400 shape and leaks nothing', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      jest.resetModules()
      jest.doMock('../../server/report/costOfCapitalModel', () => ({
        computeCostOfCapital: () => { throw new Error('boom at /srv/secret/costOfCapitalModel.js:99') }
      }))
      const route = require('../../server/routes/report')
      const res = makeRes()
      const next = jest.fn()
      route.costOfCapital({ body: {} }, res, next)

      expect(res.statusCode).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toEqual({
        code: 'COST_OF_CAPITAL_COMPUTE_FAILED',
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

  it('source tripwire — the route is registered in restify-server.js, anonymous by design', () => {
    // Registration is wiring the unit tests cannot see, so pin the line itself.
    // Calc-only route: NO firmAuth (numbers in, numbers out, no uploads).
    const src = fs.readFileSync(path.join(__dirname, '../../server/restify-server.js'), 'utf8')
    expect(src).toMatch(/server\.post\('\/api\/report\/cost-of-capital', reportRoute\.costOfCapital\)/)
    expect(src).not.toMatch(/'\/api\/report\/cost-of-capital',\s*firmAuth/)
  })
})
