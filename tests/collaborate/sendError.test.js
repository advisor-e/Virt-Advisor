'use strict'

/**
 * Tests for the standard error envelope (server/utils/sendError.js).
 * Guarantees: the envelope shape is exactly { success, error:{code,message},
 * timestamp }, nothing leaks beyond it, and it is a no-op once headers are sent.
 */

const { sendError } = require('../../server/collaborate/utils/sendError')

function mockRes () {
  return { headersSent: false, writeHead: jest.fn(), end: jest.fn() }
}

describe('sendError', () => {
  test('writes a standard error envelope with status, code and message', () => {
    const res = mockRes()
    sendError(res, 400, 'BAD_INPUT', 'Something was wrong')

    expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'application/json' })
    expect(res.end).toHaveBeenCalledTimes(1)

    const payload = JSON.parse(res.end.mock.calls[0][0])
    expect(payload).toMatchObject({
      success: false,
      error: { code: 'BAD_INPUT', message: 'Something was wrong' }
    })
    expect(typeof payload.timestamp).toBe('string')
  })

  test('exposes only success, error and timestamp — no internal leakage', () => {
    const res = mockRes()
    sendError(res, 500, 'INTERNAL', 'Generic message')

    const payload = JSON.parse(res.end.mock.calls[0][0])
    expect(Object.keys(payload).sort()).toEqual(['error', 'success', 'timestamp'])
    expect(Object.keys(payload.error).sort()).toEqual(['code', 'message'])
  })

  test('is a no-op when headers were already sent', () => {
    const res = mockRes()
    res.headersSent = true
    sendError(res, 500, 'X', 'y')

    expect(res.writeHead).not.toHaveBeenCalled()
    expect(res.end).not.toHaveBeenCalled()
  })
})
