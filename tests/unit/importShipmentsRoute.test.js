'use strict'

const fs = require('fs')
const path = require('path')
const { importShipments } = require('../../server/routes/report')

/**
 * Route test — POST /api/report/import-shipments (item 4.64 slice 2).
 *
 * The arithmetic itself is pinned in importShipmentModel.test.js against Mike's own
 * workbook; this suite proves the HTTP layer: the standard { success, data, timestamp }
 * envelope, the safe { code, message } failure shape (never a stack trace, a path, or the
 * model's own error text), and that the route is actually registered — an unregistered
 * handler fails silently at the screen, not here.
 *
 * 🔴 THE ROUTE EXISTS BECAUSE THE DATE RULES ARE BUSINESS LOGIC. They could have been a
 * computed property on the intake screen, and then there would be two implementations of
 * "when does this container land" — one the forecast uses and one the advisor reads.
 */

/** Minimal Restify res double capturing what the handler sends. */
function makeRes () {
  const res = { statusCode: null, body: null }
  res.send = (status, body) => { res.statusCode = status; res.body = body }
  return res
}

/** The drawing's own worked example: both ordered in May, eighteen days apart, by sea. */
const BODY = {
  startDate: '2026-04-01',
  shipments: [
    { description: 'Container 1', cost: 90000, orderDate: '2026-05-02', depositPct: 0.6, speed: 'Sea' },
    { description: 'Container 2', cost: 60000, orderDate: '2026-05-20', depositPct: 0.6, speed: 'Sea' }
  ]
}

describe('POST /api/report/import-shipments', () => {
  afterEach(() => { jest.resetModules(); jest.dontMock('../../server/report/importShipmentModel') })

  it('returns the standard envelope with the worked-out dates', () => {
    const res = makeRes()
    const next = jest.fn()
    importShipments({ body: BODY }, res, next)

    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
    expect(new Date(res.body.timestamp).toString()).not.toBe('Invalid Date')
    expect(next).toHaveBeenCalled()

    const data = res.body.data
    expect(data.rows[0].landsOn).toBe('2026-09-24')
    expect(data.rows[1].landsOn).toBe('2026-10-12')
    // The two ordered in one month land in different ones — the panel's whole point.
    expect(data.importedPurchases).toEqual([0, 0, 0, 0, 0, 90000, 60000, 0, 0, 0, 0, 0])
    expect(data.landings).toHaveLength(2)
  })

  it('carries the interest cover the engine will charge', () => {
    const res = makeRes()
    importShipments({ body: BODY }, res, jest.fn())
    // 36,000 and 24,000 of balance at 6% over 91/360.
    expect(res.body.data.rows[0].interest).toBeCloseTo(546, 6)
    expect(res.body.data.rows[1].interest).toBeCloseTo(364, 6)
    expect(res.body.data.landings[0].interest).toBeCloseTo(546, 6)
  })

  it('a body with nothing in it is answered, not refused', () => {
    // The screen posts as the advisor types, so an empty or half-typed state is the normal
    // case rather than an error. It must come back as an empty result, not a 400.
    const res = makeRes()
    importShipments({ body: {} }, res, jest.fn())
    expect(res.statusCode).toBe(200)
    expect(res.body.data.rows).toEqual([])
    expect(res.body.data.landings).toEqual([])
  })

  it('no body at all is handled', () => {
    const res = makeRes()
    importShipments({}, res, jest.fn())
    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('a failure returns a safe code and message, never the internals', () => {
    jest.resetModules()
    jest.doMock('../../server/report/importShipmentModel', () => ({
      computeImportShipments: () => { throw new Error('ENOENT /srv/secret/path/model.js') }
    }))
    const route = require('../../server/routes/report')
    const res = makeRes()
    const next = jest.fn()
    route.importShipments({ body: BODY }, res, next)

    expect(res.statusCode).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('IMPORT_SHIPMENTS_COMPUTE_FAILED')
    // The thrown text names a path. None of it may reach the client.
    expect(JSON.stringify(res.body)).not.toMatch(/srv|ENOENT|model\.js/)
    expect(next).toHaveBeenCalled()
  })

  it('is registered on the server, or the screen would fail silently', () => {
    const wiring = fs.readFileSync(path.resolve(__dirname, '../../server/restify-server.js'), 'utf8')
    expect(wiring).toContain("server.post('/api/report/import-shipments', reportRoute.importShipments)")
  })
})
