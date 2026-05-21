'use strict'

// Fixed-window per-IP rate limiter for Nuxt server middleware.
// Single-process only — for clustered or multi-process deployments, replace with a Redis-backed solution.

function createLimiter (maxPerMinute) {
  const windows = new Map()
  const windowMs = 60000

  return function limited (req, res) {
    const forwarded = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    const ip = forwarded ||
      (req.connection && req.connection.remoteAddress) ||
      (req.socket && req.socket.remoteAddress) ||
      'unknown'

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
