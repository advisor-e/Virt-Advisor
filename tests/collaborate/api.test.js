'use strict'

/**
 * Tests for the Nuxt server-middleware proxy (server-middleware/api.js).
 *
 * The proxy only relays /api/* to the Restify backend, so `http`/`https` are
 * mocked — no socket is ever opened. Each case loads the middleware in an
 * isolated module registry so the backend base URL (read at module load) can be
 * varied, and asserts on the request options, the piped response, and the
 * 500/502 error branches.
 */

jest.mock('http')
jest.mock('https')

const ORIGINAL_BASE = process.env.API_BASE_URL

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  if (ORIGINAL_BASE === undefined) { delete process.env.API_BASE_URL } else { process.env.API_BASE_URL = ORIGINAL_BASE }
  jest.restoreAllMocks()
})

// Load the proxy against a chosen backend base URL, in a fresh module registry so
// the module-load-time `BACKEND` constant reflects that base. Returns the proxy
// plus the (mocked) http/https it captured from the same registry.
function loadProxy (base) {
  let proxy, http, https
  jest.isolateModules(() => {
    if (base === undefined) { delete process.env.API_BASE_URL } else { process.env.API_BASE_URL = base }
    http = require('http')
    https = require('https')
    proxy = require('../../server-middleware/collaborate/api')
  })
  return { proxy, http, https }
}

function mkRes (headersSent) {
  return { writeHead: jest.fn(), end: jest.fn(), headersSent: !!headersSent }
}

test('proxies a request to the http backend and pipes the response back', () => {
  const { proxy, http } = loadProxy(undefined) // default http://localhost:4000
  const backendRes = { statusCode: 200, headers: { 'content-type': 'application/json' }, pipe: jest.fn() }
  const backendReq = { on: jest.fn() }
  http.request.mockImplementation((opts, onResponse) => { onResponse(backendRes); return backendReq })

  const req = { url: '/people/advisors', method: 'GET', headers: { 'x-test': '1' }, pipe: jest.fn() }
  const res = mkRes(false)
  proxy(req, res, jest.fn())

  expect(http.request).toHaveBeenCalledTimes(1)
  expect(http.request.mock.calls[0][0]).toMatchObject({
    hostname: 'localhost', port: '4000', path: '/api/people/advisors', method: 'GET'
  })
  expect(res.writeHead).toHaveBeenCalledWith(200, backendRes.headers)
  expect(backendRes.pipe).toHaveBeenCalledWith(res)
  expect(req.pipe).toHaveBeenCalledWith(backendReq)
})

test('carries the query string through to the backend path', () => {
  const { proxy, http } = loadProxy(undefined)
  http.request.mockImplementation((opts, onResponse) => { onResponse({ statusCode: 200, headers: {}, pipe: jest.fn() }); return { on: jest.fn() } })

  const req = { url: '/people/advisors?q=seafood&available=true', method: 'GET', headers: {}, pipe: jest.fn() }
  proxy(req, mkRes(false), jest.fn())

  expect(http.request.mock.calls[0][0].path).toBe('/api/people/advisors?q=seafood&available=true')
})

test('uses https and the default port 443 for an https backend', () => {
  const { proxy, http, https } = loadProxy('https://backend.local')
  const backendReq = { on: jest.fn() }
  https.request.mockImplementation((opts, onResponse) => { onResponse({ statusCode: 200, headers: {}, pipe: jest.fn() }); return backendReq })

  proxy({ url: '/health', method: 'GET', headers: {}, pipe: jest.fn() }, mkRes(false), jest.fn())

  expect(https.request).toHaveBeenCalledTimes(1)
  expect(http.request).not.toHaveBeenCalled()
  expect(https.request.mock.calls[0][0].port).toBe(443)
})

test('returns 500 BAD_BACKEND_URL when the backend base URL is invalid', () => {
  const { proxy, http } = loadProxy('not a url') // invalid base → new URL throws
  const res = mkRes(false)
  proxy({ url: '/x', method: 'GET', headers: {}, pipe: jest.fn() }, res, jest.fn())

  expect(res.writeHead).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' })
  expect(JSON.parse(res.end.mock.calls[0][0]).error.code).toBe('BAD_BACKEND_URL')
  expect(http.request).not.toHaveBeenCalled()
})

test('returns 502 BACKEND_UNAVAILABLE when the backend connection errors', () => {
  const { proxy, http } = loadProxy(undefined)
  let errHandler
  const backendReq = { on: jest.fn((ev, h) => { if (ev === 'error') { errHandler = h } }) }
  http.request.mockImplementation(() => backendReq) // never calls the response cb

  const res = mkRes(false)
  proxy({ url: '/x', method: 'GET', headers: {}, pipe: jest.fn() }, res, jest.fn())
  errHandler(new Error('ECONNREFUSED'))

  expect(res.writeHead).toHaveBeenCalledWith(502, { 'Content-Type': 'application/json' })
  expect(JSON.parse(res.end.mock.calls[0][0]).error.code).toBe('BACKEND_UNAVAILABLE')
})

test('ends the response quietly when the backend errors after headers were sent', () => {
  const { proxy, http } = loadProxy(undefined)
  let errHandler
  http.request.mockImplementation(() => ({ on: jest.fn((ev, h) => { if (ev === 'error') { errHandler = h } }) }))

  const res = mkRes(true) // headersSent
  proxy({ url: '/x', method: 'GET', headers: {}, pipe: jest.fn() }, res, jest.fn())
  errHandler(new Error('boom'))

  expect(res.end).toHaveBeenCalledTimes(1)
  expect(res.writeHead).not.toHaveBeenCalledWith(502, expect.anything())
})
