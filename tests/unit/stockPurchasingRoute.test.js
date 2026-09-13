'use strict'

const util = require('util')

/**
 * POST /api/report/stock-purchasing — the route in front of the Stock Purchasing model.
 *
 * The maths is pinned in stockPurchasingModel.test.js; this checks the route's contract: the
 * response shape, that an empty body computes nothing rather than the workbook sample, that a
 * caller's own product list and financial position reach the model, that the doubled payload is
 * not sent, and that a failure returns the standard safe error while leaking neither a stack trace
 * nor the client's figures.
 */

function fakeRes () {
  const res = { statusCode: null, body: null }
  res.send = (code, body) => { res.statusCode = code; res.body = body }
  return res
}

describe('POST /api/report/stock-purchasing', () => {
  let reportRoute
  beforeEach(() => {
    jest.resetModules()
    reportRoute = require('../../server/routes/report')
  })

  it('computes NOTHING when no body is sent — never the workbook sample — in the standard envelope', () => {
    // Restify hands an empty JSON body over as {}. This is a Report-class model holding a real
    // client's product list, so answering with the sample would put 969 invented lines on their
    // page — the fault found live on the dashboard-reports route, 2026-09-07.
    for (const body of [undefined, {}, null]) {
      const res = fakeRes()
      const next = jest.fn()
      reportRoute.stockPurchasing({ body }, res, next)
      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
      expect(typeof res.body.timestamp).toBe('string')
      expect(res.body.data.ranked).toEqual([])
      expect(res.body.data.totals.linesReviewed).toBe(0)
      expect(res.body.data.totals.salesReviewed).toBe(0)
      expect(res.body.data.totals.averageMargin).toBeNull()
      // And no financial position is invented on the client's behalf.
      expect(res.body.data.affordability.quickRatio).toBeNull()
      expect(res.body.data.affordability.carries).toBeNull()
      expect(next).toHaveBeenCalledTimes(1)
    }
  })

  it('computes the workbook sample only when the caller sends it', () => {
    const { DEFAULT_INPUTS } = require('../../server/report/stockPurchasingModel')
    const res = fakeRes()
    reportRoute.stockPurchasing({ body: DEFAULT_INPUTS }, res, jest.fn())
    expect(res.statusCode).toBe(200)
    expect(res.body.data.totals.linesReviewed).toBe(969)
    expect(res.body.data.totals.salesReviewed).toBeCloseTo(274953.59, 2)
    expect(res.body.data.ranked[0].total).toBe(17)
    // The ruled deviations, reachable through the route.
    const widget3 = res.body.data.ranked.find(l => l.code === 'Widget 3')
    expect(widget3.total).toBe(11) // the workbook caches 6
  })

  it('🔴 does not send `lines` — it is `ranked` again in another order, and doubles the payload', () => {
    const { DEFAULT_INPUTS } = require('../../server/report/stockPurchasingModel')
    const res = fakeRes()
    reportRoute.stockPurchasing({ body: DEFAULT_INPUTS }, res, jest.fn())
    expect(res.body.data.lines).toBeUndefined()
    expect(res.body.data.ranked).toHaveLength(969)
    // Everything the screen needs is still there.
    expect(Object.keys(res.body.data).sort())
      .toEqual(['affordability', 'bands', 'criteria', 'maxScore', 'ranked', 'shelf', 'totals'])
  })

  it('passes a caller\'s own product list, shelf and financial position through to the model', () => {
    const res = fakeRes()
    const body = {
      lines: [
        { code: 'Fast mover', quantity: 40, sales: 4000, cost: 800, entryDate: '2026-01-01', saleDate: '2026-01-06', shareOfStock: 0.7 },
        { code: 'Shelf warmer', quantity: 2, sales: 300, cost: 280, entryDate: '2026-01-01', saleDate: '2026-06-01', shareOfStock: 0.02 }
      ],
      shelf: { onHand: 410, inTransit: 120 },
      exposure: { currentAssetsExStock: 184000, currentLiabilities: 152000, cashCommitted: 60000 }
    }
    reportRoute.stockPurchasing({ body }, res, jest.fn())
    expect(res.statusCode).toBe(200)

    // Fast mover: 80% margin (3), 40 units (5), $20 a unit (5), 5 days (5), 0.7 of stock (5).
    const best = res.body.data.ranked[0]
    expect(best.code).toBe('Fast mover')
    expect(best.total).toBe(23)
    expect(best.daysOnHand).toBe(5)
    expect(best.scores.daysOnHand.rating).toBe('Hot Cakes!')

    // Shelf warmer: 6.7% margin (1), 2 units (1), $140 a unit (2), 151 days (1), 0.02 (1).
    const worst = res.body.data.ranked[1]
    expect(worst.code).toBe('Shelf warmer')
    expect(worst.total).toBe(6)
    expect(worst.scores.daysOnHand.rating).toBe('Dead Wood')

    expect(res.body.data.totals.linesReviewed).toBe(2)
    expect(res.body.data.shelf.alreadyCommitted).toBe(530)
    expect(res.body.data.affordability.quickRatio).toBeCloseTo(1.210526, 6)
    expect(res.body.data.affordability.carries).toBe(false)
  })

  it('treats a non-object body as no body, never as a crash and never as the sample', () => {
    const res = fakeRes()
    reportRoute.stockPurchasing({ body: 'junk' }, res, jest.fn())
    expect(res.statusCode).toBe(200)
    expect(res.body.data.ranked).toEqual([])
    expect(res.body.data.totals.linesReviewed).toBe(0)
  })

  it('returns the safe generic error, with no stack or path, when the model throws', () => {
    jest.resetModules()
    jest.doMock('../../server/report/stockPurchasingModel', () => ({
      computeStockPurchasing: () => { throw new Error('boom at C:/secret/path/model.js') }
    }))
    const route = require('../../server/routes/report')
    const res = fakeRes()
    const next = jest.fn()
    const quiet = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      route.stockPurchasing({ body: {} }, res, next)
    } finally {
      quiet.mockRestore()
      jest.dontMock('../../server/report/stockPurchasingModel')
    }
    expect(res.statusCode).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('STOCK_PURCHASING_COMPUTE_FAILED')
    expect(JSON.stringify(res.body)).not.toMatch(/secret|boom|stack/)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('🔴 never writes the client\'s figures or product names to the server log when it fails', () => {
    // A product list is a client's commercial position — what they sell, at what margin. The
    // handler must log the error and not the request. Rendered with util.inspect rather than
    // String(): String({}) is "[object Object]", so a handler that logged the whole body would
    // sail past a String()-based assertion — the dead alarm found in multiplePropertyRoute.test.js
    // on 2026-09-13.
    jest.resetModules()
    jest.doMock('../../server/report/stockPurchasingModel', () => ({
      computeStockPurchasing: () => { throw new Error('compute failed') }
    }))
    const route = require('../../server/routes/report')
    const res = fakeRes()
    const logged = []
    const quiet = jest.spyOn(console, 'error')
      .mockImplementation((...args) => { logged.push(args.map(a => util.inspect(a, { depth: null })).join(' ')) })
    try {
      route.stockPurchasing({
        body: {
          lines: [{ code: 'SecretProduct', quantity: 987654, sales: 123456, cost: 555444 }],
          exposure: { currentAssetsExStock: 222333, currentLiabilities: 111222, cashCommitted: 999888 }
        }
      }, res, jest.fn())
    } finally {
      quiet.mockRestore()
      jest.dontMock('../../server/report/stockPurchasingModel')
    }
    expect(logged).toHaveLength(1)
    const all = logged.join('\n')
    for (const leak of ['SecretProduct', '987654', '123456', '555444', '222333', '111222', '999888']) {
      expect(all).not.toContain(leak)
    }
    // The log still has to be useful — it names the route that failed.
    expect(all).toContain('stock-purchasing')
  })

  it('is registered on the server, anonymously, as a calc route', () => {
    const src = require('fs').readFileSync(require('path').resolve(__dirname, '../../server/restify-server.js'), 'utf8')
    const line = src.split('\n').find(l => l.includes("'/api/report/stock-purchasing'"))
    expect(line).toBeDefined()
    expect(line).toMatch(/server\.post\(\s*'\/api\/report\/stock-purchasing',\s*reportRoute\.stockPurchasing\s*\)/)
    // Calc routes take numbers and return numbers; only file intakes carry firmAuth.
    expect(line).not.toMatch(/firmAuth/)
  })
})
