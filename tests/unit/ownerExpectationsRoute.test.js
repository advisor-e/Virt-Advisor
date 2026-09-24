'use strict'

const fs = require('fs')
const path = require('path')
const util = require('util')
const { ownerExpectations } = require('../../server/routes/report')

/**
 * Route test — POST /api/report/owner-expectations (item 5.3).
 *
 * The maths is golden-tested against the workbook in ownerExpectationsModel.test.js; this
 * suite proves the HTTP layer only: the envelope, the safe failure shape, that the route is
 * registered, and that the owners' names and incomes never reach a log line.
 */

function makeRes () {
  const res = { statusCode: null, body: null }
  res.send = (status, body) => { res.statusCode = status; res.body = body }
  return res
}

describe('POST /api/report/owner-expectations', () => {
  afterEach(() => { jest.resetModules(); jest.dontMock('../../server/report/ownerExpectationsModel') })

  it('returns the standard envelope with both steps and the loan calculator', () => {
    const res = makeRes()
    const next = jest.fn()
    ownerExpectations({ body: {} }, res, next)

    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
    expect(new Date(res.body.timestamp).toString()).not.toBe('Invalid Date')
    expect(next).toHaveBeenCalled()

    const data = res.body.data
    expect(data.owners.totals.incomes[3]).toBeCloseTo(475000, 6) //       owners!AF12
    expect(data.development.stages).toHaveLength(4)
    expect(data.development.stages[0].revenue).toBeCloseTo(1311383, 6) // E6
    expect(data.loan.annualRepayment).toBeCloseTo(89105.39343, 4) //     P18
  })

  it('a partial body merges over the workbook sample rather than blanking it', () => {
    const res = makeRes()
    ownerExpectations({ body: { loan: { amount: 100000, rate: 0.05, termMonths: 12, type: 'Table' } } }, res, jest.fn())

    expect(res.statusCode).toBe(200)
    expect(res.body.data.loan.amount).toBe(100000)
    expect(res.body.data.development.stages[3].revenue).toBeCloseTo(1676382, 6) // H6, untouched
  })

  it('a non-object body computes the sample, never crashes', () => {
    const res = makeRes()
    ownerExpectations({ body: 'not-json' }, res, jest.fn())
    expect(res.statusCode).toBe(200)
    expect(res.body.data.owners.owners[0].name).toBe('Andy')
  })

  it('a compute failure returns the safe 400 shape and leaks nothing', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      jest.resetModules()
      jest.doMock('../../server/report/ownerExpectationsModel', () => ({
        computeOwnerExpectationsModel: () => { throw new Error('boom at /srv/secret/ownerExpectationsModel.js:9') }
      }))
      const route = require('../../server/routes/report')
      const res = makeRes()
      const next = jest.fn()
      route.ownerExpectations({ body: {} }, res, next)

      expect(res.statusCode).toBe(400)
      expect(res.body.error).toEqual({
        code: 'OWNER_EXPECTATIONS_COMPUTE_FAILED',
        message: 'Could not compute the model from the supplied inputs.'
      })
      expect(next).toHaveBeenCalled()
      expect(JSON.stringify(res.body)).not.toMatch(/boom|secret|\.js|at /)
      expect(spy).toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })

  it('never logs an owner\'s name, income or plans', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      jest.resetModules()
      jest.doMock('../../server/report/ownerExpectationsModel', () => ({
        computeOwnerExpectationsModel: () => { throw new Error('boom') }
      }))
      const route = require('../../server/routes/report')
      route.ownerExpectations({
        body: {
          owners: [{ name: 'Realname Ownerperson', incomes: [187654, 0, 0, 0] }],
          development: { markets: ['Open a branch in Othertown'] }
        }
      }, makeRes(), jest.fn())

      const logged = spy.mock.calls
        .map(c => c.map(a => util.inspect(a, { depth: null })).join(' '))
        .join('\n')
      expect(logged).not.toMatch(/Realname|Ownerperson|187654|Othertown/)
    } finally {
      spy.mockRestore()
    }
  })

  it('source tripwire — the route is registered in restify-server.js, anonymous by design', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../server/restify-server.js'), 'utf8')
    expect(src).toMatch(/server\.post\('\/api\/report\/owner-expectations', reportRoute\.ownerExpectations\)/)
    expect(src).not.toMatch(/server\.post\('\/api\/report\/owner-expectations', firmAuth/)
  })
})
