'use strict'

const util = require('util')

/**
 * POST /api/report/mid-level-budget — the route in front of the Mid Level Budget model
 * (item 4.93). The maths is pinned in midLevelBudgetModel.test.js; this checks the route's
 * contract: the response shape, that an empty body computes nothing rather than the workbook
 * sample, that a caller's figures and timing assumptions reach the model, and that a failure
 * returns the standard safe error while leaking neither a stack trace nor the client's figures.
 */

function fakeRes () {
  const res = { statusCode: null, body: null }
  res.send = (code, body) => { res.statusCode = code; res.body = body }
  return res
}

/** Twelve months of one figure — most of these fixtures are flat. */
const flat = v => Array(12).fill(v)

describe('POST /api/report/mid-level-budget', () => {
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
      reportRoute.midLevelBudget({ body }, res, next)
      expect(res.statusCode).toBe(200)
      expect(res.body.success).toBe(true)
      expect(typeof res.body.timestamp).toBe('string')
      expect(res.body.data.budget.subtotalDeposits.every(v => v === 0)).toBe(true)
      expect(res.body.data.budget.paymentsMade.every(v => v === 0)).toBe(true)
      expect(res.body.data.actual.subtotalWithdrawals.every(v => v === 0)).toBe(true)
      expect(res.body.data.budget.closingBalance).toBe(0)
      // And no collection pattern is invented on the client's behalf.
      expect(res.body.data.assumptions.debtors).toEqual([0, 0, 0, 0, 0])
      expect(next).toHaveBeenCalledTimes(1)
    }
  })

  it('computes the workbook sample only when the caller sends it', () => {
    const { DEFAULT_INPUTS } = require('../../server/report/midLevelBudgetModel')
    const res = fakeRes()
    reportRoute.midLevelBudget({ body: DEFAULT_INPUTS }, res, jest.fn())
    expect(res.statusCode).toBe(200)
    expect(res.body.data.budget.subtotalDeposits[0]).toBeCloseTo(5250, 6) //          D16
    expect(res.body.data.budget.paymentsMade[0]).toBeCloseTo(3900, 6) //              D22
    expect(res.body.data.budget.grossProfit[0]).toBeCloseTo(1350, 6) //               D24
    expect(res.body.data.budget.yearToDate.subtotalWithdrawals).toBeCloseTo(210000, 6) // Q64
    expect(res.body.data.variance.subtotalDeposits[0]).toBeCloseTo(20000, 6) //       Variances D16
    // The ruled deviations, reachable through the route: GST stays out of the bank.
    expect(res.body.data.budget.closingBalance).toBeCloseTo(-54040, 6)
  })

  it('passes a caller\'s own figures AND their timing assumptions through to the model', () => {
    const res = fakeRes()
    const body = {
      gstRate: 0.15,
      assumptions: { debtors: [0.5, 0.5, 0, 0, 0], creditors: [1, 0, 0, 0, 0] },
      budget: {
        openingBalance: 1000,
        lines: { sales: flat(5000), materialPurchases: flat(1000), wages: flat(2000) }
      },
      actual: {
        openingBalance: 1000,
        lines: { sales: [4000, null, null, null, null, null, null, null, null, null, null, null] }
      }
    }
    reportRoute.midLevelBudget({ body }, res, jest.fn())
    expect(res.statusCode).toBe(200)
    // Half of April's sales in April; half of April's plus half of May's in May.
    expect(res.body.data.budget.salesCashCollected[0]).toBeCloseTo(2500, 6)
    expect(res.body.data.budget.salesCashCollected[1]).toBeCloseTo(5000, 6)
    // Purchases paid in full in the month they are made.
    expect(res.body.data.budget.paymentsMade[0]).toBeCloseTo(1000, 6)
    expect(res.body.data.budget.subtotalWithdrawals[0]).toBeCloseTo(2000, 6)
    expect(res.body.data.assumptions.debtorsBalance).toBeCloseTo(0, 6)
    // The actuals side takes no timing — 4,000 entered is 4,000 received.
    expect(res.body.data.actual.subtotalDeposits[0]).toBeCloseTo(4000, 6)
    expect(res.body.data.variance.subtotalDeposits[0]).toBeCloseTo(1500, 6)
    // A month with no actual entered stays blank rather than reading as a shortfall.
    expect(res.body.data.variance.lines.sales[1]).toBeNull()
  })

  it('treats a non-object body as no body, never as a crash and never as the sample', () => {
    const res = fakeRes()
    reportRoute.midLevelBudget({ body: 'junk' }, res, jest.fn())
    expect(res.statusCode).toBe(200)
    expect(res.body.data.budget.subtotalDeposits.every(v => v === 0)).toBe(true)
  })

  it('returns the safe generic error, with no stack or path, when the model throws', () => {
    jest.resetModules()
    jest.doMock('../../server/report/midLevelBudgetModel', () => ({
      computeMidLevelBudget: () => { throw new Error('boom at C:/secret/path/model.js') }
    }))
    const route = require('../../server/routes/report')
    const res = fakeRes()
    const next = jest.fn()
    const quiet = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      route.midLevelBudget({ body: {} }, res, next)
    } finally {
      quiet.mockRestore()
      jest.dontMock('../../server/report/midLevelBudgetModel')
    }
    expect(res.statusCode).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('MID_LEVEL_BUDGET_COMPUTE_FAILED')
    expect(JSON.stringify(res.body)).not.toMatch(/secret|boom|stack/)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('🔴 never writes the client\'s figures to the server log when it fails', () => {
    // A budget is a client's real financial position. The handler must log the error and not the
    // request. Rendered with util.inspect rather than String(): String({}) is "[object Object]",
    // so a handler that logged the whole body would sail past a String()-based assertion — the
    // dead alarm found in multiplePropertyRoute.test.js on 2026-09-13.
    jest.resetModules()
    jest.doMock('../../server/report/midLevelBudgetModel', () => ({
      computeMidLevelBudget: () => { throw new Error('compute failed') }
    }))
    const route = require('../../server/routes/report')
    const res = fakeRes()
    const logged = []
    const quiet = jest.spyOn(console, 'error')
      .mockImplementation((...args) => { logged.push(args.map(a => util.inspect(a, { depth: null })).join(' ')) })
    try {
      route.midLevelBudget({
        body: {
          budget: { openingBalance: 987654, lines: { sales: flat(123456) } },
          actual: { openingBalance: 555444, lines: { sales: flat(222333) } }
        }
      }, res, jest.fn())
    } finally {
      quiet.mockRestore()
      jest.dontMock('../../server/report/midLevelBudgetModel')
    }
    expect(logged).toHaveLength(1)
    const all = logged.join('\n')
    for (const figure of ['987654', '123456', '555444', '222333']) {
      expect(all).not.toContain(figure)
    }
    // The log still has to be useful — it names the route that failed.
    expect(all).toContain('mid-level-budget')
  })

  it('is registered on the server, anonymously, as a calc route', () => {
    const src = require('fs').readFileSync(require('path').resolve(__dirname, '../../server/restify-server.js'), 'utf8')
    const line = src.split('\n').find(l => l.includes("'/api/report/mid-level-budget'"))
    expect(line).toBeDefined()
    expect(line).toMatch(/server\.post\(\s*'\/api\/report\/mid-level-budget',\s*reportRoute\.midLevelBudget\s*\)/)
    // Calc routes take numbers and return numbers; only file intakes carry firmAuth.
    expect(line).not.toMatch(/firmAuth/)
  })
})
