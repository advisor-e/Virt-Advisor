'use strict'

const fs = require('fs')
const path = require('path')
const { loanEstimator } = require('../../server/routes/report')

/**
 * Route test — POST /api/report/loan-estimator (Loan Estimator Phase 4, chunk A).
 *
 * The maths itself is golden-tested in loanEstimatorModel.test.js; this suite
 * proves the HTTP layer: the standard { success, data, timestamp } envelope, the
 * safe { code, message } failure shape (never a stack trace, path or the model's
 * own error text), and that the route is actually registered — an unregistered
 * handler fails silently at the screen, not here.
 */

/** Minimal Restify res double capturing what the handler sends. */
function makeRes () {
  const res = { statusCode: null, body: null }
  res.send = (status, body) => { res.statusCode = status; res.body = body }
  return res
}

describe('POST /api/report/loan-estimator', () => {
  it('returns the standard envelope with all three parts', () => {
    const res = makeRes()
    const next = jest.fn()
    loanEstimator({ body: {} }, res, next)

    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
    expect(new Date(res.body.timestamp).toString()).not.toBe('Invalid Date')
    expect(next).toHaveBeenCalled()

    const data = res.body.data
    expect(data.securityPosition.totals.combined.adjustedValue).toBeCloseTo(17181122.67, 1) // M43
    expect(data.repayment.monthlyRepayment).toBeCloseTo(5747.094633, 5) //                     C29/C31
    expect(data.serviceability.surplus).toBeCloseTo(-154.833776247, 5) //                      N64 corrected
    // R8: an empty body computes the sample and DECLARES it, per part
    expect(data.securityPosition.defaultedInputs).toContain('securities')
    expect(data.repayment.defaultedInputs).toContain('purchasePrice')
    expect(data.serviceability.defaultedInputs).toContain('customer1GrossIncome')
  })

  it('a compute failure returns the safe 400 shape and leaks nothing', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const res = makeRes()
      const next = jest.fn()
      // AU has no verified tax table — getTaxBands throws (ruling 2026-07-23)
      loanEstimator({ body: { serviceability: { country: 'AU' } } }, res, next)

      expect(res.statusCode).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toEqual({
        code: 'LOAN_ESTIMATOR_COMPUTE_FAILED',
        message: 'Could not compute the model from the supplied inputs.'
      })
      expect(next).toHaveBeenCalled()
      // the model's own error text stays server-side (logged), never in the response
      expect(JSON.stringify(res.body)).not.toMatch(/tax-band|AU|stack|at /)
      expect(spy).toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })

  it('a non-object body computes the declared sample, never crashes', () => {
    const res = makeRes()
    loanEstimator({ body: 'not-json' }, res, jest.fn())
    expect(res.statusCode).toBe(200)
    expect(res.body.data.serviceability.defaultedInputs).toContain('loans')
  })

  it('source tripwire — the route is registered in restify-server.js', () => {
    // Same pattern as jsonBodyLimit.test.js: registration is wiring the unit
    // tests cannot see, so pin the line itself. Anonymous by design (calc-only).
    const src = fs.readFileSync(path.join(__dirname, '../../server/restify-server.js'), 'utf8')
    expect(src).toMatch(/server\.post\('\/api\/report\/loan-estimator', reportRoute\.loanEstimator\)/)
  })
})
