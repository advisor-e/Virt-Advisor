'use strict'

// Fixed-window rate limiter for the Restify routes that call the AI.
// Single-process only — for clustered or multi-process deployments, replace with a Redis-backed solution.

// Counted per signed-in person, not per address (item 7.27). Every browser request
// reaches the backend through the Nuxt server, so the socket address is the same
// for everybody — and even a real browser address is shared by a whole office.
// Every limited route runs firmAuth first, so the verified identity is already on
// the request; nothing from the body or a header is trusted for the key.
// Design: design/RATE-LIMIT-PER-ADVISOR.md

// The address is the last resort, used only when a request carries no identity.
// By default it is the real TCP peer (req.socket.remoteAddress) and X-Forwarded-For
// is IGNORED, because that header is client-controlled: trusting it lets an
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

/**
 * The window a request is counted in: the advisor within their firm, else the
 * email within the firm (manager and mentor sign-ins can carry no advisor id),
 * else the address. The firm is part of the key so one advisor id in two firms
 * never shares a count; JSON keeps a ':' inside an id from colliding two keys.
 *
 * @param {object} req - a request firmAuth may have attached identity to
 * @returns {string}
 */
function limitKey (req) {
  if (req.firmId && req.advisorId) { return JSON.stringify(['advisor', req.firmId, req.advisorId]) }
  if (req.firmId && req.userEmail) { return JSON.stringify(['email', req.firmId, req.userEmail]) }
  return JSON.stringify(['address', clientIp(req)])
}

function createLimiter (maxPerMinute) {
  const windows = new Map()
  const windowMs = 60000

  return function limited (req, res) {
    const key = limitKey(req)

    const now = Date.now()
    let slot = windows.get(key)

    if (!slot || now - slot.start >= windowMs) {
      slot = { start: now, count: 0 }
      windows.set(key, slot)
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
