'use strict'

const fs = require('fs')
const path = require('path')
const { wagesReview } = require('../../server/routes/report')
const { DEFAULT_INPUTS } = require('../../server/report/wagesModel')

/**
 * Route test — POST /api/report/wages-review.
 *
 * The maths is golden-tested in wagesModel.test.js; this suite proves the HTTP layer: the
 * standard { success, data, timestamp } envelope, the safe { code, message } failure shape
 * (never a stack trace, path or the model's own error text), and that the route is actually
 * registered — an unregistered handler fails silently at the screen, not here. The model is
 * defensive and never throws on input, so the failure branch is exercised by mocking it.
 */

/** Minimal Restify res double capturing what the handler sends. */
function makeRes () {
  const res = { statusCode: null, body: null }
  res.send = (status, body) => { res.statusCode = status; res.body = body }
  return res
}

describe('POST /api/report/wages-review', () => {
  afterEach(() => { jest.resetModules(); jest.dontMock('../../server/report/wagesModel') })

  it('returns the standard envelope with the corrected workbook figures', () => {
    const res = makeRes()
    const next = jest.fn()
    wagesReview({ body: {} }, res, next)

    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
    expect(new Date(res.body.timestamp).toString()).not.toBe('Invalid Date')
    expect(next).toHaveBeenCalled()

    const data = res.body.data
    expect(data.basis).toBe('seasonal')
    expect(data.months).toHaveLength(12)
    expect(data.totals.seasonalRevenue).toBeCloseTo(1362740.231, 2) // Cash Report R15
    expect(data.totals.wageCost).toBeCloseTo(1073804.97, 2) // R20, defect corrected
    expect(data.totals.margin).toBeCloseTo(288935.26, 2) // R22, defect corrected
    expect(data.totals.actual).toBe(97946) // R24
    expect(data.headcount).toBe(26)
  })

  it('switches to the shutdown basis when asked, changing both sides', () => {
    const res = makeRes()
    wagesReview({ body: { basis: 'shutdown' } }, res, jest.fn())
    expect(res.body.data.basis).toBe('shutdown')
    expect(res.body.data.totals.revenue).toBeCloseTo(973328.4208, 2) // Cash Report R17
  })

  it('serves the workbook sample when no team is sent, and nothing when an empty one is', () => {
    // The distinction matters in front of a client: a caller who sent a team and had none
    // read must see an empty year, never the sample company wearing their client's name.
    const sample = makeRes()
    wagesReview({ body: {} }, sample, jest.fn())
    expect(sample.body.data.headcount).toBe(26)

    const empty = makeRes()
    wagesReview({ body: { people: [] } }, empty, jest.fn())
    expect(empty.body.data.headcount).toBe(0)
    expect(empty.body.data.totals.seasonalRevenue).toBe(0)
  })

  it('computes a supplied team rather than the sample', () => {
    const one = JSON.parse(JSON.stringify(DEFAULT_INPUTS.people.find(p => p.name === 'Barry')))
    const res = makeRes()
    wagesReview({ body: { people: [one] } }, res, jest.fn())
    expect(res.body.data.headcount).toBe(1)
    expect(res.body.data.totals.seasonalRevenue).toBeGreaterThan(0)
    expect(res.body.data.totals.seasonalRevenue).toBeLessThan(1362740.231)
  })

  it('a non-object body computes the sample rather than crashing', () => {
    const res = makeRes()
    wagesReview({ body: 'not-json' }, res, jest.fn())
    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.months).toHaveLength(12)
  })

  it('a compute failure returns the safe 400 shape and leaks nothing', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      jest.resetModules()
      jest.doMock('../../server/report/wagesModel', () => ({
        computeWages: () => { throw new Error('boom at /srv/secret/wagesModel.js:99') },
        DEFAULT_INPUTS: { people: [], months: [] }
      }))
      const route = require('../../server/routes/report')
      const res = makeRes()
      const next = jest.fn()
      route.wagesReview({ body: {} }, res, next)

      expect(res.statusCode).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toEqual({
        code: 'WAGES_REVIEW_COMPUTE_FAILED',
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
    expect(src).toMatch(/server\.post\('\/api\/report\/wages-review', reportRoute\.wagesReview\)/)
    expect(src).not.toMatch(/'\/api\/report\/wages-review',\s*firmAuth/)
  })

  it('SENTINEL: the staff register never travels through this route', () => {
    // Decision 6 (Mike, 2026-09-14): the register opens only inside a due-diligence project
    // and has its own seam. This model is pay rates and hours; if a future change ever
    // routes a named employee's leave, service or rating through here, it fails HERE rather
    // than in a privacy review after the fact.
    const res = makeRes()
    wagesReview({ body: {} }, res, jest.fn())
    const serialised = JSON.stringify(res.body.data)
    expect(serialised).not.toMatch(/dateOfBirth|accruedLeave|sickLeave|keyPersonRisk|yearsOfService/i)
  })
})
