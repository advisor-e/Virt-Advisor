'use strict'

/**
 * Report thin proxy (R24, 2026-07-20): the backend path must carry the query
 * string, not drop it. http is mocked at the module boundary — the assertion
 * is on the request options the proxy builds.
 */

jest.mock('http', () => ({ request: jest.fn(() => ({ on: jest.fn(), end: jest.fn() })) }))

const http = require('http')
const reportProxy = require('../../server-middleware/report')

describe('report proxy — R24 query-string forwarding', () => {
  test('the query string reaches the backend path', () => {
    const req = { method: 'POST', url: '/quick-position?debug=1', headers: {}, pipe: jest.fn() }
    reportProxy(req, {}, jest.fn())
    expect(http.request).toHaveBeenCalled()
    expect(http.request.mock.calls[0][0].path).toBe('/api/report/quick-position?debug=1')
  })

  test('a plain path is unchanged', () => {
    http.request.mockClear()
    const req = { method: 'POST', url: '/quick-position', headers: {}, pipe: jest.fn() }
    reportProxy(req, {}, jest.fn())
    expect(http.request.mock.calls[0][0].path).toBe('/api/report/quick-position')
  })
})
