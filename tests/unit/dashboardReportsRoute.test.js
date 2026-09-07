'use strict'

/**
 * POST /api/report/dashboard-reports — the route in front of the Dashboard Reports model
 * (item 4.70, stage 1). The maths is pinned in dashboardReportsModel.test.js; this checks the
 * route's contract: the response shape, the default when no body is sent, that a caller's
 * figures reach the model, and that a failure returns the standard safe error and never a
 * stack trace.
 */

function fakeRes () {
  const res = { statusCode: null, body: null }
  res.send = (code, body) => { res.statusCode = code; res.body = body }
  return res
}

describe('POST /api/report/dashboard-reports', () => {
  let reportRoute
  beforeEach(() => {
    jest.resetModules()
    reportRoute = require('../../server/routes/report')
  })

  it('computes NOTHING when no body is sent — never the workbook sample — in the standard envelope', () => {
    // Found live 2026-09-07: Restify hands an empty JSON body over as {}, and a route that
    // answered {} or an absent body with the sample could put sample figures on a client's page.
    for (const body of [undefined, {}, null]) {
      const res = fakeRes()
      const next = jest.fn()
      reportRoute.dashboardReports({ body }, res, next)
      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
      expect(typeof res.body.timestamp).toBe('string')
      expect(res.body.data.yearly).toEqual([])
      expect(res.body.data.monthly).toEqual([])
      expect(res.body.data.quarterly).toEqual([])
      expect(res.body.data.cashMovement).toBeNull()
      expect(next).toHaveBeenCalledTimes(1)
    }
  })

  it('computes the workbook sample only when the caller sends it', () => {
    const { DEFAULT_INPUTS } = require('../../server/report/dashboardReportsModel')
    const res = fakeRes()
    reportRoute.dashboardReports({ body: DEFAULT_INPUTS }, res, jest.fn())
    expect(res.body.data.yearly).toHaveLength(5)
    expect(res.body.data.monthly).toHaveLength(12)
    expect(res.body.data.yearly[0].quickRatio).toBeCloseTo(1.463790447, 6) // T53
    expect(res.body.data.cashMovement.netCashFlow).toBeCloseTo(49404, 6) //   U131
  })

  it('passes a caller\'s own periods through to the model', () => {
    const res = fakeRes()
    const body = {
      yearly: [
        { label: 'FY26', bank: 224000, accountsReceivable: 334000, currentAssets: 322000, fixedAssets: 505000, nonCurrentAssets: 0, currentLiabilities: 410000, nonCurrentLiabilities: 205000, ordinaryShares: 100, currentYearEarnings: 396000, retainedEarnings: 363900, tradingIncome: 2840000, otherIncome: 0, costOfSales: 1676000, wages: 596000, operatingExpenses: 172000 }
      ],
      monthly: []
    }
    reportRoute.dashboardReports({ body }, res, jest.fn())
    expect(res.statusCode).toBe(200)
    expect(res.body.data.yearly).toHaveLength(1)
    expect(res.body.data.yearly[0].label).toBe('FY26')
    expect(res.body.data.yearly[0].grossProfit).toBe(2840000 - 1676000)
    expect(res.body.data.cashMovement).toBeNull() // one year: no movement to show
    expect(res.body.data.quarterly).toEqual([])
  })

  it('treats a non-object body as no body, never as a crash and never as the sample', () => {
    const res = fakeRes()
    reportRoute.dashboardReports({ body: 'junk' }, res, jest.fn())
    expect(res.statusCode).toBe(200)
    expect(res.body.data.yearly).toEqual([])
  })

  it('returns the safe generic error, with no stack or path, when the model throws', () => {
    jest.resetModules()
    jest.doMock('../../server/report/dashboardReportsModel', () => ({
      computeDashboardReports: () => { throw new Error('boom at C:/secret/path/model.js') }
    }))
    const route = require('../../server/routes/report')
    const res = fakeRes()
    const next = jest.fn()
    const quiet = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      route.dashboardReports({ body: {} }, res, next)
    } finally {
      quiet.mockRestore()
      jest.dontMock('../../server/report/dashboardReportsModel')
    }
    expect(res.statusCode).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('DASHBOARD_REPORTS_COMPUTE_FAILED')
    expect(JSON.stringify(res.body)).not.toMatch(/secret|boom|stack/)
    expect(next).toHaveBeenCalledTimes(1)
  })
})
