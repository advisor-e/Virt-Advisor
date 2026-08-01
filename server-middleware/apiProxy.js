'use strict'

/**
 * Nuxt server-middleware — generic THIN PROXY for the non-streaming backend API
 * groups (cases, activity, firm-manager, mentor).
 *
 * Registered against several path prefixes in nuxt.config.js. It forwards the
 * request — method, full path + query string, headers and body — to the Restify
 * backend and streams the response straight back. The browser therefore only
 * ever talks to its own origin: no CORS is required and the backend URL is never
 * exposed to the client. Binary downloads and multipart uploads pass through
 * untouched because the body is piped, never parsed here.
 *
 * This replaces the former hardcoded `http://localhost:4000` fetches in the
 * frontend, which only worked on the developer's own machine.
 *
 * NOTE: No optional chaining / nullish coalescing — the Nuxt 2.14 server-
 * middleware loader cannot parse `?.`/`??`. Keep this file plain.
 */

const http = require('http')
const https = require('https')
const { URL } = require('url')

const BACKEND = process.env.API_BASE_URL || 'http://127.0.0.1:4000'

module.exports = function apiProxy (req, res, next) {
  // connect strips the mount prefix from req.url, so req.originalUrl carries the
  // full '/api/...' path (with query string); fall back to req.url if absent.
  const fullPath = req.originalUrl || req.url || ''

  let target
  try {
    target = new URL(fullPath, BACKEND)
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: false, error: { code: 'BAD_BACKEND_URL', message: 'Invalid backend URL' }, timestamp: new Date().toISOString() }))
    return
  }

  const lib = target.protocol === 'https:' ? https : http
  const opts = {
    hostname: target.hostname,
    port: target.port || (target.protocol === 'https:' ? 443 : 80),
    path: target.pathname + target.search,
    method: req.method,
    headers: req.headers
  }

  const backendReq = lib.request(opts, function (backendRes) {
    res.writeHead(backendRes.statusCode || 502, backendRes.headers)
    backendRes.pipe(res)
  })

  backendReq.on('error', function (err) {
    console.error('[api-proxy] backend error:', err.message)
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: false, error: { code: 'BACKEND_UNAVAILABLE', message: 'Backend unavailable' }, timestamp: new Date().toISOString() }))
    } else {
      try { res.end() } catch (e) {}
    }
  })

  // Abort the upstream request if the client disconnects (refresh / navigate away)
  // so an abandoned connection can't leak — same hygiene as the advisor proxy.
  res.on('close', function () { backendReq.destroy() })

  req.pipe(backendReq)
}
