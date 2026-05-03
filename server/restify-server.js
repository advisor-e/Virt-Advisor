'use strict'

/**
 * Restify backend — runs on port 4000 (separate process from Nuxt on port 4001).
 *
 * Start: node server/restify-server.js
 * Requires Node 14.15 LTS as per governance framework §3.1.
 *
 * Development: run alongside Nuxt with `npm run backend` in a second terminal.
 * When the Nuxt server-middleware proxy (phase 2 of the Restify migration) is
 * ready, all /api/* traffic from the frontend will route through here.
 */

const restify = require('restify')
const healthRoute = require('./routes/health')
const translateRoute = require('./routes/translate')
const advisorRoute = require('./routes/advisor')

const PORT = process.env.BACKEND_PORT || 4000

const server = restify.createServer({
  name: 'virt-advisor-api',
  version: '1.0.0'
})

// ── Middleware ──
server.use(restify.plugins.jsonBodyParser({ mapParams: false }))
server.use(restify.plugins.queryParser())

// CORS — allow Nuxt frontend on port 4001 in development
server.use((req, res, next) => {
  const origin = req.headers.origin || ''
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) {
    res.header('Access-Control-Allow-Origin', origin)
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') {
    res.send(204)
    return
  }
  return next()
})

// ── Routes ──
server.get('/api/health', healthRoute.get)
server.post('/api/translate/locale', translateRoute.post)
server.post('/api/advisor/query', advisorRoute.post)

// ── Start ──
server.listen(PORT, () => {
  console.error(`[restify] virt-advisor-api listening on port ${PORT}`)
})
