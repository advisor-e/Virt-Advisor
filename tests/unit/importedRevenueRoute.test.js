'use strict'

const fs = require('fs')
const path = require('path')
const { importedRevenue } = require('../../server/routes/report')

/**
 * Route test — POST /api/report/imported-revenue (item 4.64).
 *
 * The ladder arithmetic itself is pinned in threeWayForecastModel.test.js against Mike's own
 * workbook; this suite proves the HTTP layer: the standard { success, data, timestamp }
 * envelope, the safe { code, message } failure shape (never a stack trace, a path, or the
 * model's own error text), and that the route is actually registered — an unregistered
 * handler fails silently at the screen, not here.
 *
 * 🔴 THE ROUTE EXISTS BECAUSE THE PRICE LADDER IS BUSINESS LOGIC. It could have been a
 * computed property on the intake screen, and then there would be two implementations of
 * "what will this stock sell for" — one the forecast uses and one the advisor reads.
 */

/** Minimal Restify res double capturing what the handler sends. */
function makeRes () {
  const res = { statusCode: null, body: null }
  res.send = (status, body) => { res.statusCode = status; res.body = body }
  return res
}

/** The drawing's own worked example: 90,000 landing in September, 60,000 in January. */
const BODY = {
  gstRate: 0.15,
  overseas: {
    enabled: true,
    importedPurchases: [0, 0, 0, 0, 0, 90000, 0, 0, 0, 60000, 0, 0],
    readyAfterMonths: 1
  }
}

describe('POST /api/report/imported-revenue', () => {
  afterEach(() => { jest.resetModules(); jest.dontMock('../../server/report/threeWayForecastModel') })

  it('returns the standard envelope with twelve months of revenue', () => {
    const res = makeRes()
    const next = jest.fn()
    importedRevenue({ body: BODY }, res, next)

    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
    expect(new Date(res.body.timestamp).toString()).not.toBe('Invalid Date')
    expect(next).toHaveBeenCalled()

    expect(res.body.data.importedRevenue).toHaveLength(12)
    // September's container is ready the month after it lands, so nothing sells before then.
    res.body.data.importedRevenue.slice(0, 6).forEach(v => expect(v).toBe(0))
    expect(res.body.data.importedRevenue[6]).toBeGreaterThan(0)
  })

  it('reports the revenue that falls after the twelfth month', () => {
    // January's container only reaches its later selling bands next year, and the screen
    // says so rather than letting the revenue quietly vanish.
    const res = makeRes()
    importedRevenue({ body: BODY }, res, jest.fn())
    expect(res.body.data.revenueBeyondYear).toBeGreaterThan(0)
  })

  it('answers the tick being off with twelve zeroes rather than refusing', () => {
    const res = makeRes()
    importedRevenue({ body: { overseas: { enabled: false, importedPurchases: [0, 0, 0, 0, 0, 90000, 0, 0, 0, 0, 0, 0] } } }, res, jest.fn())
    expect(res.statusCode).toBe(200)
    res.body.data.importedRevenue.forEach(v => expect(v).toBe(0))
    expect(res.body.data.revenueBeyondYear).toBe(0)
  })

  it('a body with nothing in it is answered, not refused', () => {
    // The screen posts as the advisor types, so an empty or half-typed state is the normal
    // case rather than an error.
    const res = makeRes()
    importedRevenue({ body: {} }, res, jest.fn())
    expect(res.statusCode).toBe(200)
    expect(res.body.data.importedRevenue).toHaveLength(12)
  })

  it('no body at all is handled', () => {
    const res = makeRes()
    importedRevenue({}, res, jest.fn())
    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('a failure returns a safe code and message, never the internals', () => {
    jest.resetModules()
    jest.doMock('../../server/report/threeWayForecastModel', () => ({
      importedRevenuePreview: () => { throw new Error('ENOENT /srv/secret/path/model.js') },
      computeThreeWayForecast: () => ({}),
      computeThreeYearForecast: () => ({})
    }))
    const route = require('../../server/routes/report')
    const res = makeRes()
    const next = jest.fn()
    route.importedRevenue({ body: BODY }, res, next)

    expect(res.statusCode).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('IMPORTED_REVENUE_COMPUTE_FAILED')
    // The thrown text names a path. None of it may reach the client.
    expect(JSON.stringify(res.body)).not.toMatch(/srv|ENOENT|model\.js/)
    expect(next).toHaveBeenCalled()
  })

  it('is registered on the server, or the screen would fail silently', () => {
    const wiring = fs.readFileSync(path.resolve(__dirname, '../../server/restify-server.js'), 'utf8')
    expect(wiring).toContain("server.post('/api/report/imported-revenue', reportRoute.importedRevenue)")
  })
})
