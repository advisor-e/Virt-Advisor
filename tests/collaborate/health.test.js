'use strict'

/**
 * Tests for the health route (server/routes/health.js) — the liveness probe.
 */

// Collaborate's copy of this route was byte-identical to ours and was removed when
// the two back-ends merged; these tests now cover the surviving one.
const health = require('../../server/routes/health')

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
