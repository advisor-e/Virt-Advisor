'use strict'

/**
 * Tests for the health route (server/routes/health.js) — the liveness probe.
 */

const health = require('../../server/collaborate/routes/health')

describe('health route', () => {
  test('responds 200 with ok:true and a timestamp, then calls next', () => {
    const res = { send: jest.fn() }
    const next = jest.fn()

    health.get({}, res, next)

    expect(res.send).toHaveBeenCalledTimes(1)
    const [status, body] = res.send.mock.calls[0]
    expect(status).toBe(200)
    expect(body.ok).toBe(true)
    expect(typeof body.timestamp).toBe('string')
    expect(next).toHaveBeenCalledTimes(1)
  })
})
