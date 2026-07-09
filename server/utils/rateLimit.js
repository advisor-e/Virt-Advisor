'use strict'

// Fixed-window per-IP rate limiter for Nuxt server middleware.
// Single-process only — for clustered or multi-process deployments, replace with a Redis-backed solution.

// By default we key on the real TCP peer (req.socket.remoteAddress) and IGNORE
// X-Forwarded-For, because that header is client-controlled: trusting it lets an
// attacker rotate a spoofed value to land every request in a fresh window and
// bypass the limit entirely. Only when TRUST_PROXY is explicitly set (the app
// sits behind a reverse proxy that OVERWRITES the client's XFF) do we read the
// forwarded client IP.
const TRUST_PROXY = process.env.TRUST_PROXY === 'true'

function clientIp (req) {
  const socketIp =
    (req.socket && req.socket.remoteAddress) ||
    (req.connection && req.connection.remoteAddress) ||
    'unknown'
  if (!TRUST_PROXY) { return socketIp }
  const forwarded = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  return forwarded || socketIp
}

function createLimiter (maxPerMinute) {
  const windows = new Map()
  const windowMs = 60000

  return function limited (req, res) {
    const ip = clientIp(req)

    const now = Date.now()
    let slot = windows.get(ip)

    if (!slot || now - slot.start >= windowMs) {
      slot = { start: now, count: 0 }
      windows.set(ip, slot)
    }

    slot.count++

    if (slot.count > maxPerMinute) {
      res.writeHead(429, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded. Please try again in a minute.' }))
      return false
    }

    // Periodic cleanup to prevent unbounded Map growth under sustained load
    if (windows.size > 5000) {
      const cutoff = now - windowMs
      for (const [k, v] of windows) {
        if (v.start < cutoff) { windows.delete(k) }
      }
    }

    return true
  }
}

module.exports = { createLimiter }
