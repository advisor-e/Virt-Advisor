'use strict'

/**
 * Nuxt server-middleware — THIN PROXY for /api/advisor.
 *
 * The advisor engine (OpenAI calls + business logic) now lives on the Restify
 * backend at server/advisorEngine.js, per the coding-team Req 7 ruling (all
 * OpenAI logic + the API key are backend-only). This file only forwards the
 * request to the backend and streams the SSE response straight back.
 *
 * NOTE: No optional chaining / nullish coalescing — the Nuxt 2.14 server-
 * middleware loader cannot parse `?.`/`??`. Keep this file plain.
 */

const http = require('http')
const https = require('https')
const { URL } = require('url')

const BACKEND = process.env.API_BASE_URL || 'http://localhost:4000'

module.exports = function advisorProxy (req, res, next) {
  if (req.method !== 'POST' || !(req.url || '').includes('/query')) {
    return next()
  }

  let target
  try {
    target = new URL('/api/advisor/query', BACKEND)
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: false, error: { code: 'BAD_BACKEND_URL', message: 'Invalid backend URL' }, timestamp: new Date().toISOString() }))
    return
  }

  const lib = target.protocol === 'https:' ? https : http
  const opts = {
    hostname: target.hostname,
    port: target.port || (target.protocol === 'https:' ? 443 : 80),
    path: target.pathname,
    method: 'POST',
    headers: req.headers
  }

  const backendReq = lib.request(opts, function (backendRes) {
    res.writeHead(backendRes.statusCode || 502, backendRes.headers)
    backendRes.pipe(res)
  })

  backendReq.on('error', function (err) {
    console.error('[advisor-proxy] backend error:', err.message)
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: false, error: { code: 'BACKEND_UNAVAILABLE', message: 'Advisor backend unavailable' }, timestamp: new Date().toISOString() }))
    } else {
      try { res.end() } catch (e) {}
    }
  })

  req.pipe(backendReq)
}
