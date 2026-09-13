'use strict'

const fs = require('fs')
const path = require('path')
const util = require('util')
const { retirementReview } = require('../../server/routes/report')

/**
 * Route test — POST /api/report/retirement-review (item 4.90).
 *
 * The maths is golden-tested against the workbook in retirementReviewModel.test.js; this
 * suite proves the HTTP layer only: the standard { success, data, timestamp } envelope,
 * the safe { code, message } failure shape (never a stack trace, a path or the model's own
 * error text), and that the route is actually registered — an unregistered handler fails
 * silently at the screen, not here. The model is defensive and never throws on input, so
 * the failure branch is exercised by mocking it to throw.
 *
 * Two things this route can leak that the calculators cannot, and both are pinned below:
 * a household's real position, and the four free-text answers about what the client wants
 * their retirement to be. Neither may reach a log line.
 */

/** Minimal Restify res double capturing what the handler sends. */
function makeRes () {
  const res = { statusCode: null, body: null }
  res.send = (status, body) => { res.statusCode = status; res.body = body }
  return res
}

describe('POST /api/report/retirement-review', () => {
  afterEach(() => { jest.resetModules(); jest.dontMock('../../server/report/retirementReviewModel') })

  it('returns the standard envelope with the year-one position', () => {
    const res = makeRes()
    const next = jest.fn()
    retirementReview({ body: {} }, res, next)

    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
    expect(new Date(res.body.timestamp).toString()).not.toBe('Invalid Date')
    expect(next).toHaveBeenCalled()

    const data = res.body.data
    expect(data.position.totalPropertyValue).toBeCloseTo(3436000, 2) //  F41
    expect(data.position.totalPropertyDebt).toBeCloseTo(1425456, 2) //   H41
    expect(data.position.netWorth).toBeCloseTo(2338044, 2) //            Z25
    expect(data.tax.averageRate).toBeCloseTo(0.1258258957, 9)
  })

  it('carries all twenty years of the projection and the verdict', () => {
    const res = makeRes()
    retirementReview({ body: {} }, res, jest.fn())
    const data = res.body.data

    expect(data.years).toHaveLength(20)
    expect(data.years[0]).toBe(1)
    expect(data.projection.weeklyIncomeRequired).toHaveLength(20)
    expect(data.projection.cashClosing).toHaveLength(20)
    expect(data.projection.netRentalIncome).toHaveLength(20)
    expect(data.projection.weeklyIncomeRequired[0]).toBe(1700) //        row 4
    // The two readings the workbook leaves to the adviser's eye.
    expect(data.verdict.yearsInDeficit).toBe(14)
    expect(data.verdict.cashEverExhausted).toBe(false)
    expect(data.verdict.closingCash).toBeCloseTo(2590883.012648, 2)
  })

  it('carries the Quick Calculator, which shares no figure with the projection', () => {
    // Its own sheet in the workbook, and its own answer here: an adviser can run it in a
    // first meeting before any of the position is known.
    const res = makeRes()
    retirementReview({ body: { quickCalculator: { desiredMonthlyIncome: 7500 } } }, res, jest.fn())
    const quick = res.body.data.quickCalculator

    expect(quick.lumpSumRequired).toBeCloseTo(1532871.031, 2) //         F23
    expect(quick.monthlySavingsRequired).toBeCloseTo(15686.62026, 2) //  F29
    expect(quick.answers.lookingForwardTo).toBe('Golf') //               F13, free text
  })

  it('🔴 carries the three workbook corrections, each with what it changed and who ruled it', () => {
    // The screen has to be ABLE to say why its figures differ from the spreadsheet the
    // adviser may have open beside it. If the route dropped these, no screen could.
    const res = makeRes()
    retirementReview({ body: {} }, res, jest.fn())
    const corrections = res.body.data.workbookCorrections

    expect(corrections.map(c => c.key)).toEqual([
      'currentTaxBands', 'pensionTaxedInProjection', 'sixthPropertyRunsFromYearOne'
    ])
    corrections.forEach((c) => {
      expect(c.ruledBy).toBe('Mike')
      expect(c.ruledOn).toBe('2026-09-13')
      expect(typeof c.cells).toBe('string')
      expect(c.summary.length).toBeGreaterThan(0)
    })
  })

  it('names the tax table the average rate was read from', () => {
    const res = makeRes()
    retirementReview({ body: {} }, res, jest.fn())

    expect(res.body.data.country).toBe('NZ')
    expect(typeof res.body.data.taxYearLabel).toBe('string')
    expect(res.body.data.taxYearLabel.length).toBeGreaterThan(0)
  })

  it('a partial body merges over the workbook sample rather than blanking it', () => {
    const res = makeRes()
    retirementReview({ body: { position: { currentWeeklyIncomeRequired: 2200 } } }, res, jest.fn())

    expect(res.statusCode).toBe(200)
    expect(res.body.data.projection.weeklyIncomeRequired[0]).toBe(2200)
    // everything not supplied still computes
    expect(res.body.data.position.totalPropertyValue).toBeCloseTo(3436000, 2)
  })

  it('a non-object body computes the declared sample, never crashes', () => {
    const res = makeRes()
    retirementReview({ body: 'not-json' }, res, jest.fn())

    expect(res.statusCode).toBe(200)
    expect(res.body.data.verdict.closingCash).toBeCloseTo(2590883.012648, 2)
  })

  it('a compute failure returns the safe 400 shape and leaks nothing', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      jest.resetModules()
      jest.doMock('../../server/report/retirementReviewModel', () => ({
        computeRetirementReview: () => {
          throw new Error('boom at /srv/secret/retirementReviewModel.js:530')
        }
      }))
      const route = require('../../server/routes/report')
      const res = makeRes()
      const next = jest.fn()
      route.retirementReview({ body: {} }, res, next)

      expect(res.statusCode).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toEqual({
        code: 'RETIREMENT_REVIEW_COMPUTE_FAILED',
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

  it('never logs the household position or what the client wants from retirement', () => {
    // Decision class, and the most personal request in the library: two real incomes, a
    // pension, a superannuation balance, six real property names — and four free-text
    // answers about the client's own life. None of it may outlive the request in a log.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      jest.resetModules()
      jest.doMock('../../server/report/retirementReviewModel', () => ({
        computeRetirementReview: () => { throw new Error('boom') }
      }))
      const route = require('../../server/routes/report')
      route.retirementReview({
        body: {
          quickCalculator: {
            retirementMeaning: 'Time with my grandchildren',
            wouldHateToMiss: 'The sailing club',
            lookingForwardTo: 'Walking the Camino',
            provisionsRemoveNeed: 'My late father left a trust'
          },
          position: {
            superannuation: { balance: 812345 },
            pension: { weekly: 731 },
            properties: [
              { name: '14 Real Client Road, Actualtown', value: 1250000 },
              { name: '9 Second Street, Othertown', value: 890000 }
            ]
          }
        }
      }, makeRes(), jest.fn())

      // util.inspect, NOT String(): an object argument stringifies to "[object Object]",
      // which passes this assertion while the body it holds sits in the log. Verified by
      // mutation — a handler that logs `req.body` is caught here and was not before.
      const logged = spy.mock.calls
        .map(c => c.map(a => util.inspect(a, { depth: null })).join(' '))
        .join('\n')
      expect(logged).not.toMatch(/Real Client Road|Actualtown|Second Street|Othertown/)
      expect(logged).not.toMatch(/grandchildren|sailing club|Camino|trust/)
      expect(logged).not.toMatch(/812345|1250000|890000|731/)
    } finally {
      spy.mockRestore()
    }
  })

  it('source tripwire — the route is registered in restify-server.js, anonymous by design', () => {
    // Registration is wiring the unit tests cannot see, so pin the line itself.
    // Calc-only route: NO firmAuth (numbers in, numbers out).
    const src = fs.readFileSync(path.join(__dirname, '../../server/restify-server.js'), 'utf8')
    expect(src).toMatch(/server\.post\('\/api\/report\/retirement-review', reportRoute\.retirementReview\)/)
    expect(src).not.toMatch(/server\.post\('\/api\/report\/retirement-review', firmAuth/)
  })
})
