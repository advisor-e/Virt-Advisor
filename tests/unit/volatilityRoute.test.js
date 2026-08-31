'use strict'

const fs = require('fs')
const path = require('path')
const { volatility } = require('../../server/routes/report')
const { DEFAULT_INPUTS } = require('../../server/report/volatilityModel')

/**
 * Route test — POST /api/report/volatility.
 *
 * The maths itself is golden-tested in volatilityModel.test.js; this suite proves the HTTP
 * layer: the standard { success, data, timestamp } envelope, the safe { code, message }
 * failure shape (never a stack trace, path or the model's own error text), and that the
 * route is actually registered — an unregistered handler fails silently at the screen, not
 * here. The model is defensive and never throws on input, so the failure branch is
 * exercised by mocking it to throw.
 */

/** Minimal Restify res double capturing what the handler sends. */
function makeRes () {
  const res = { statusCode: null, body: null }
  res.send = (status, body) => { res.statusCode = status; res.body = body }
  return res
}

describe('POST /api/report/volatility', () => {
  afterEach(() => { jest.resetModules(); jest.dontMock('../../server/report/volatilityModel') })

  it('returns the standard envelope with the workbook figures', () => {
    const res = makeRes()
    const next = jest.fn()
    volatility({ body: { sales: DEFAULT_INPUTS.sales, window: 12 } }, res, next)

    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
    expect(new Date(res.body.timestamp).toString()).not.toBe('Invalid Date')
    expect(next).toHaveBeenCalled()

    const data = res.body.data
    expect(data.average).toBeCloseTo(56790.5, 6) //              '12 Volatility Calcs'!C14
    expect(data.standardDeviation).toBeCloseTo(22070.71515, 4) // C26
    expect(data.score).toBeCloseTo(77.72678582, 6) //             '12 Volatility Graph'!AH2
    expect(data.scoreBand).toBe('crit')
    expect(data.insideFirstBand).toBe(8)
  })

  it('carries the window through, and each window gives its own sheet\'s answer', () => {
    const w = (n) => {
      const res = makeRes()
      volatility({ body: { sales: DEFAULT_INPUTS.sales, window: n } }, res, jest.fn())
      return res.body.data
    }
    expect(w(12).score).toBeCloseTo(77.72678582, 6)
    expect(w(18).score).toBeCloseTo(85.11894667, 6) // '18 Volatility Graph'!AH4
    expect(w(24).score).toBeCloseTo(95.13075218, 6) // '24 Volatility Graph'!AH4
    expect(w(24).monthsUsed).toBe(24)
  })

  it('SENTINEL: the lower band it serves is never negative', () => {
    // Mike's ruling 2026-08-31 — "stop it at zero". This is the boundary the screen calls,
    // so a regression in the model must fail HERE, not be caught by eye in a client meeting.
    const res = makeRes()
    volatility({ body: { sales: DEFAULT_INPUTS.sales, window: 12 } }, res, jest.fn())

    res.body.data.bands.forEach(b => expect(b.lower).toBeGreaterThanOrEqual(0))
    // …while the workbook's own arithmetic is still carried, so nothing is lost.
    expect(res.body.data.bands[2].lowerUnfloored).toBeCloseTo(-9421.645451, 4) // C20
    expect(res.body.data.bands[2].lower).toBe(0)
  })

  it('an empty body computes the empty case rather than crashing', () => {
    const res = makeRes()
    volatility({ body: {} }, res, jest.fn())
    expect(res.statusCode).toBe(200)
    expect(res.body.data.monthsUsed).toBe(0)
    expect(Number.isFinite(res.body.data.score)).toBe(true)
  })

  it('a non-object body computes the empty case, never crashes', () => {
    const res = makeRes()
    volatility({ body: 'not-json' }, res, jest.fn())
    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('a compute failure returns the safe 400 shape and leaks nothing', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      jest.resetModules()
      jest.doMock('../../server/report/volatilityModel', () => ({
        computeVolatility: () => { throw new Error('boom at /srv/secret/volatilityModel.js:99') }
      }))
      const route = require('../../server/routes/report')
      const res = makeRes()
      const next = jest.fn()
      route.volatility({ body: {} }, res, next)

      expect(res.statusCode).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toEqual({
        code: 'VOLATILITY_COMPUTE_FAILED',
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
    expect(src).toMatch(/server\.post\('\/api\/report\/volatility', reportRoute\.volatility\)/)
    expect(src).not.toMatch(/'\/api\/report\/volatility',\s*firmAuth/)
  })
})
