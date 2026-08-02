'use strict'

const fs = require('fs')
const path = require('path')
const { leaseVsBuy } = require('../../server/routes/report')

/**
 * Route test — POST /api/report/lease-vs-buy.
 *
 * The maths itself is golden-tested in leaseVsBuyModel.test.js; this suite proves the
 * HTTP layer: the standard { success, data, timestamp } envelope, the safe
 * { code, message } failure shape (never a stack trace, path or the model's own error
 * text), and that the route is actually registered — an unregistered handler fails
 * silently at the screen, not here. The model is defensive and never throws on input,
 * so the failure branch is exercised by mocking it to throw.
 */

/** Minimal Restify res double capturing what the handler sends. */
function makeRes () {
  const res = { statusCode: null, body: null }
  res.send = (status, body) => { res.statusCode = status; res.body = body }
  return res
}

describe('POST /api/report/lease-vs-buy', () => {
  afterEach(() => { jest.resetModules(); jest.dontMock('../../server/report/leaseVsBuyModel') })

  it('returns the standard envelope with the verdict and both totals', () => {
    const res = makeRes()
    const next = jest.fn()
    leaseVsBuy({ body: {} }, res, next)

    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
    expect(new Date(res.body.timestamp).toString()).not.toBe('Invalid Date')
    expect(next).toHaveBeenCalled()

    const data = res.body.data
    expect(data.verdict.recommended).toBe('lease') //          corrected verdict (Input!K31)
    expect(data.buy.totalNet).toBeCloseTo(33264.58854, 2) //   Input!I31
    expect(data.lease.totalNet).toBeCloseTo(28725.45, 2) //    Input!I33 (corrected)
    // R8: an empty body computes the sample and DECLARES it
    expect(data.defaultedInputs).toContain('deposit')
  })

  it('a non-object body computes the declared sample, never crashes', () => {
    const res = makeRes()
    leaseVsBuy({ body: 'not-json' }, res, jest.fn())
    expect(res.statusCode).toBe(200)
    expect(res.body.data.verdict.recommended).toBe('lease')
  })

  it('a compute failure returns the safe 400 shape and leaks nothing', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      jest.resetModules()
      jest.doMock('../../server/report/leaseVsBuyModel', () => ({
        computeLeaseVsBuy: () => { throw new Error('boom at /srv/secret/leaseVsBuyModel.js:99') }
      }))
      const route = require('../../server/routes/report')
      const res = makeRes()
      const next = jest.fn()
      route.leaseVsBuy({ body: {} }, res, next)

      expect(res.statusCode).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toEqual({
        code: 'LEASE_VS_BUY_COMPUTE_FAILED',
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
    // Calc-only route: NO firmAuth (numbers in, numbers out).
    const src = fs.readFileSync(path.join(__dirname, '../../server/restify-server.js'), 'utf8')
    expect(src).toMatch(/server\.post\('\/api\/report\/lease-vs-buy', reportRoute\.leaseVsBuy\)/)
  })
})
