'use strict'

/**
 * Nuxt server-middleware — THIN PROXY for /api/report/*.
 *
 * Forwards report calc requests to the Restify backend (server/routes/report.js) and
 * returns the JSON response. All logic stays on the backend per the Stack Constitution.
 *
 * NOTE: No optional chaining / nullish coalescing — the Nuxt 2.14 server-middleware
 * loader cannot parse `?.`/`??`. Keep this file plain ES5.
 */

const http = require('http')
const https = require('https')
const { URL } = require('url')

const BACKEND = process.env.API_BASE_URL || 'http://localhost:4000'

module.exports = function reportProxy (req, res, next) {
  // POST: calc + intake routes. GET: the firm currency read (firmAuth). Anything
  // else has no backend route under /api/report, so let Nuxt handle it.
  if (req.method !== 'POST' && req.method !== 'GET') {
    return next()
  }

  let target
  try {
    // req.url is relative to the mounted path (/api/report), so re-prefix it.
    target = new URL('/api/report' + (req.url || ''), BACKEND)
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: false, error: { code: 'BAD_BACKEND_URL', message: 'Invalid backend URL' }, timestamp: new Date().toISOString() }))
    return
  }

  const lib = target.protocol === 'https:' ? https : http
  const opts = {
    hostname: target.hostname,
    port: target.port || (target.protocol === 'https:' ? 443 : 80),
    path: target.pathname + (target.search || ''), // R24: query string forwarded, not dropped
    method: req.method,
    headers: req.headers
  }

  const backendReq = lib.request(opts, function (backendRes) {
    res.writeHead(backendRes.statusCode || 502, backendRes.headers)
    backendRes.pipe(res)
  })

  backendReq.on('error', function (err) {
    console.error('[report-proxy] backend error:', err.message)
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: false, error: { code: 'BACKEND_UNAVAILABLE', message: 'Report backend unavailable' }, timestamp: new Date().toISOString() }))
    } else {
      try { res.end() } catch (e) {}
    }
  })

  req.pipe(backendReq)
}
