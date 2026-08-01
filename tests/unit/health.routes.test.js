'use strict'

// The /health route — three lines, and the only endpoint that answers before auth.
// It had no test: it is what a deploy check, a load balancer, or the master app pings
// to decide the backend is alive, so its shape (200 + ok:true) is a contract with
// things outside this repo, not an internal detail.

const { get } = require('../../server/routes/health')

function makeMockRes () {
  return {
    _status: null,
    _body: null,
    send (status, body) { this._status = status; this._body = body }
  }
}

describe('GET /health', () => {
  test('responds 200 with ok:true', () => {
    const res = makeMockRes()
    const next = jest.fn()

    get({}, res, next)

    expect(res._status).toBe(200)
    expect(res._body.ok).toBe(true)
  })

  test('stamps an ISO-8601 timestamp', () => {
    const res = makeMockRes()

    get({}, res, jest.fn())

    expect(typeof res._body.timestamp).toBe('string')
    expect(res._body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/)
    expect(Number.isNaN(Date.parse(res._body.timestamp))).toBe(false)
  })

  test('calls next() so the restify chain continues', () => {
    const next = jest.fn()

    get({}, makeMockRes(), next)

    expect(next).toHaveBeenCalledTimes(1)
  })

  test('leaks nothing beyond ok and timestamp — no versions, paths or env', () => {
    const res = makeMockRes()

    get({}, res, jest.fn())

    expect(Object.keys(res._body).sort()).toEqual(['ok', 'timestamp'])
  })
})
