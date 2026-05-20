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
const firmRoute = require('./routes/firm')
const firmManagerRoute = require('./routes/firmManager')
const activityRoute = require('./routes/activity')
const { firmAuth, requireManagerRole } = require('./middleware/firmAuth')

const PORT = process.env.BACKEND_PORT || 4000

const server = restify.createServer({
  name: 'virt-advisor-api',
  version: '1.0.0'
})

// ── Middleware ──
server.use(restify.plugins.jsonBodyParser({ mapParams: false }))
server.use(restify.plugins.queryParser())
// Note: multipart/form-data (file uploads) is parsed per-route by formidable
// inside firmManager.js — it bypasses jsonBodyParser intentionally.

// CORS — allow Nuxt frontend on port 4001 in development
server.use((req, res, next) => {
  const origin = req.headers.origin || ''
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) {
    res.header('Access-Control-Allow-Origin', origin)
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
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
server.get('/api/firm/advisors', firmRoute.getAdvisors)
server.post('/api/firm/insights', firmRoute.postInsights)
server.post('/api/activity/log-course', activityRoute.logCourse)
server.get('/api/activity/progression', activityRoute.getProgression)
server.get('/api/activity/team', activityRoute.getTeam)

// ── Firm Manager routes (firm_manager or platform_admin role required) ──
const fm = firmManagerRoute
const fmGuard = [firmAuth, requireManagerRole]
server.get('/api/firm-manager/documents', ...fmGuard, fm.listDocuments)
server.post('/api/firm-manager/documents', ...fmGuard, fm.uploadDocument)
server.get('/api/firm-manager/documents/download', ...fmGuard, fm.downloadDocument)
server.del('/api/firm-manager/documents/:fileId', ...fmGuard, fm.deleteDocument)
server.get('/api/firm-manager/framework', ...fmGuard, fm.getFramework)
server.post('/api/firm-manager/framework', ...fmGuard, fm.saveFramework)
server.get('/api/firm-manager/framework/history', ...fmGuard, fm.getFrameworkHistory)
server.post('/api/firm-manager/framework/restore', ...fmGuard, fm.restoreFramework)
server.get('/api/firm-manager/videos', ...fmGuard, fm.listVideos)
server.post('/api/firm-manager/videos', ...fmGuard, fm.addVideo)
server.del('/api/firm-manager/videos/:id', ...fmGuard, fm.deleteVideo)
server.get('/api/firm-manager/profile', ...fmGuard, fm.getProfile)
server.put('/api/firm-manager/profile', ...fmGuard, fm.updateProfile)
server.get('/api/firm-manager/storage', ...fmGuard, fm.getStorageUsage)

// ── Start ──
server.listen(PORT, () => {
  console.error(`[restify] virt-advisor-api listening on port ${PORT}`)
})
