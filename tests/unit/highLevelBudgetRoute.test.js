'use strict'

/**
 * POST /api/report/high-level-budget — the route in front of the High Level Budget model
 * (item 4.88). The maths is pinned in highLevelBudgetModel.test.js; this checks the route's
 * contract: the response shape, that an empty body computes nothing rather than the workbook
 * sample, that a caller's figures reach the model, and that a failure returns the standard safe
 * error and never a stack trace or a file path.
 */

function fakeRes () {
  const res = { statusCode: null, body: null }
  res.send = (code, body) => { res.statusCode = code; res.body = body }
  return res
}

describe('POST /api/report/high-level-budget', () => {
  let reportRoute
  beforeEach(() => {
    jest.resetModules()
    reportRoute = require('../../server/routes/report')
  })

  it('computes NOTHING when no body is sent — never the workbook sample — in the standard envelope', () => {
    // Restify hands an empty JSON body over as {}. This is a Report-class model holding a real
    // client's budget, so answering with the sample would put invented figures on their page —
    // the fault found live on the dashboard-reports route, 2026-09-07.
    for (const body of [undefined, {}, null]) {
      const res = fakeRes()
      const next = jest.fn()
      reportRoute.highLevelBudget({ body }, res, next)
      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
      expect(typeof res.body.timestamp).toBe('string')
      expect(res.body.data.budget.subtotalDeposits.every(v => v === 0)).toBe(true)
      expect(res.body.data.actual.subtotalWithdrawals.every(v => v === 0)).toBe(true)
      expect(res.body.data.budget.closingBalance).toBe(0)
      expect(next).toHaveBeenCalledTimes(1)
    }
  })

  it('computes the workbook sample only when the caller sends it', () => {
    const { DEFAULT_INPUTS } = require('../../server/report/highLevelBudgetModel')
    const res = fakeRes()
    reportRoute.highLevelBudget({ body: DEFAULT_INPUTS }, res, jest.fn())
    expect(res.statusCode).toBe(200)
    expect(res.body.data.budget.subtotalDeposits[0]).toBeCloseTo(25250, 6) //     D16
    expect(res.body.data.budget.yearToDate.subtotalWithdrawals).toBeCloseTo(210000, 6) // Q56
    expect(res.body.data.variance.subtotalWithdrawals[0]).toBeCloseTo(-1150, 6) // Variances D56
    // The ruled deviation, reachable through the route: the actual subtotal counts wages.
    expect(res.body.data.actual.subtotalWithdrawals[0]).toBeCloseTo(16350, 6)
  })

  it('passes a caller\'s own figures through to the model', () => {
    const res = fakeRes()
    const body = {
      gstRate: 0.15,
      budget: { openingBalance: 1000, lines: { sales: [5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000], wages: [2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000] } },
      actual: { openingBalance: 1000, lines: { sales: [4000, null, null, null, null, null, null, null, null, null, null, null] } }
    }
    reportRoute.highLevelBudget({ body }, res, jest.fn())
    expect(res.statusCode).toBe(200)
    expect(res.body.data.budget.subtotalDeposits[0]).toBeCloseTo(5000, 6)
    expect(res.body.data.budget.subtotalWithdrawals[0]).toBeCloseTo(2000, 6)
    expect(res.body.data.variance.lines.sales[0]).toBeCloseTo(-1000, 6)
    // A month with no actual entered stays blank rather than reading as a shortfall.
    expect(res.body.data.variance.lines.sales[1]).toBeNull()
  })

  it('treats a non-object body as no body, never as a crash and never as the sample', () => {
    const res = fakeRes()
    reportRoute.highLevelBudget({ body: 'junk' }, res, jest.fn())
    expect(res.statusCode).toBe(200)
    expect(res.body.data.budget.subtotalDeposits.every(v => v === 0)).toBe(true)
  })

  it('returns the safe generic error, with no stack or path, when the model throws', () => {
    jest.resetModules()
    jest.doMock('../../server/report/highLevelBudgetModel', () => ({
      computeHighLevelBudget: () => { throw new Error('boom at C:/secret/path/model.js') }
    }))
    const route = require('../../server/routes/report')
    const res = fakeRes()
    const next = jest.fn()
    const quiet = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      route.highLevelBudget({ body: {} }, res, next)
    } finally {
      quiet.mockRestore()
      jest.dontMock('../../server/report/highLevelBudgetModel')
    }
    expect(res.statusCode).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('HIGH_LEVEL_BUDGET_COMPUTE_FAILED')
    expect(JSON.stringify(res.body)).not.toMatch(/secret|boom|stack/)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('is registered on the server, anonymously, as a calc route', () => {
    const src = require('fs').readFileSync(require('path').resolve(__dirname, '../../server/restify-server.js'), 'utf8')
    const line = src.split('\n').find(l => l.includes("'/api/report/high-level-budget'"))
    expect(line).toBeDefined()
    expect(line).toMatch(/server\.post\(\s*'\/api\/report\/high-level-budget',\s*reportRoute\.highLevelBudget\s*\)/)
    // Calc routes take numbers and return numbers; only file intakes carry firmAuth.
    expect(line).not.toMatch(/firmAuth/)
  })
})
