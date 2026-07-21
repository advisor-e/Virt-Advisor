'use strict'

/**
 * Restify backend — runs on port 4000 (separate process from Nuxt on port 3000).
 *
 * Start: node server/restify-server.js
 * Requires Node 14.15 (the locked runtime — CLAUDE.md Stack Constitution req. 9).
 * Node 22+ additionally breaks Restify via a missing spdy binding.
 *
 * Development: run alongside Nuxt with `npm run backend` in a second terminal.
 * When the Nuxt server-middleware proxy (phase 2 of the Restify migration) is
 * ready, all /api/* traffic from the frontend will route through here.
 */

// ── Node version guard ────────────────────────────────────────────────────────
// The locked runtime is Node 14.15 (CLAUDE.md Stack Constitution req. 9) — warn
// when running on anything else so drift is visible, never recommended.
;(function checkNodeVersion () {
  const major = Number(process.version.slice(1).split('.')[0])
  if (major >= 22) {
    process.stderr.write(
      '\n[STARTUP ERROR] Node ' + process.version + ' is not supported.\n' +
      'Node 22+ breaks Restify via a missing spdy binding.\n' +
      'The locked runtime is Node 14.15 — run: nvm use 14.15.0\n\n'
    )
    process.exit(1)
  }
  if (major !== 14) {
    process.stderr.write(
      '\n[WARNING] Node ' + process.version + ' is not the locked runtime.\n' +
      'The team spec requires Node 14.15 — run: nvm use 14.15.0\n\n'
    )
  }
}())

const restify = require('restify')

// ── Startup guards — fail fast on placeholder config in production ────────────
;(function assertConfig () {
  const { AUTH, DB } = require('../config/integration')
  const isProd = process.env.NODE_ENV === 'production'

  // The dev auth bypass must never be enabled in production. This combination
  // can only happen by mistake — refuse to boot rather than run wide open.
  if (isProd && process.env.ALLOW_DEV_AUTH === 'true') {
    console.error('[startup] FATAL: ALLOW_DEV_AUTH=true is set in production — refusing to start.')
    process.exit(1)
  }

  // JWT secret is always required — without it, firm auth cannot verify tokens.
  if (AUTH.secret === 'REPLACE_ME_WITH_ADVISOR_E_JWT_SECRET') {
    if (isProd) {
      console.error('[startup] FATAL: JWT_SECRET is still set to the placeholder value.')
      process.exit(1)
    } else {
      console.error('[startup] WARNING: JWT_SECRET is placeholder — firm auth will not work in dev.')
    }
  }

  // DB password — fatal in production, warning in dev (MySQL may not be local).
  if (DB.password === 'REPLACE_ME') {
    if (isProd) {
      console.error('[startup] FATAL: MYSQL_PASSWORD is still set to the placeholder value.')
      process.exit(1)
    } else {
      console.error('[startup] WARNING: MYSQL_PASSWORD is placeholder — activity/progression routes will return empty data.')
    }
  }
})()

const healthRoute = require('./routes/health')
const translateRoute = require('./routes/translate')
const firmRoute = require('./routes/firm')
const firmManagerRoute = require('./routes/firmManager')
const activityRoute = require('./routes/activity')
const casesRoute = require('./routes/cases')
const clientsRoute = require('./routes/clients')
const coursesRoute = require('./routes/courses')
const mentorRoute = require('./routes/mentor')
const reportRoute = require('./routes/report')
const currencyRoute = require('./routes/currency')
const { firmAuth, requireManagerRole, requireMentorRole } = require('./middleware/firmAuth')
// Advisor + course engines — migrated from Nuxt server-middleware per the
// coding-team Req 7 ruling (OpenAI logic + key backend-only). Connect-style
// (req, res, next) handlers that read the raw body and stream SSE themselves.
const advisorEngine = require('./advisorEngine')
const courseEngine = require('./courseEngine')

const PORT = process.env.BACKEND_PORT || 4000

const server = restify.createServer({
  name: 'virt-advisor-api',
  version: '1.0.0'
})

// ── Middleware ──
// The advisor + course engines read the raw request body themselves (they stream
// SSE), so skip JSON body-parsing for those two routes; parse everything else.
// jsonBodyParser returns an ARRAY of handlers in Restify 9 (not a single fn),
// so run them as a sub-chain. Skip entirely for advisor/course, which read the
// raw body themselves and stream SSE.
// R7 (2026-07-19): absent maxBodySize means UNLIMITED buffering before parse — an
// anonymous client could stream an arbitrary-size body at the no-auth calc routes.
// 1 MB clears the largest legitimate JSON body with ~2x headroom (biggest config
// family: a future firm logic-tree overlay ~551 KB; templates 337 KB; calc bodies
// are a few KB). The SSE engines self-cap at 256 KB and uploads go through
// formidable's own 5 MB caps — neither uses this parser. Oversize → standard 413.
// (tests/unit/jsonBodyLimit.test.js tripwires this wiring — keep them in step.)
const JSON_BODY_LIMIT = 1024 * 1024
const _jsonParsers = restify.plugins.jsonBodyParser({ mapParams: false, maxBodySize: JSON_BODY_LIMIT })
server.use((req, res, next) => {
  const p = (req.url || '').split('?')[0]
  if (p === '/api/advisor/query' || p === '/api/course') { return next() }
  let i = 0
  ;(function runNext (err) {
    if (err || i >= _jsonParsers.length) { return next(err) }
    _jsonParsers[i++](req, res, runNext)
  })()
})
server.use(restify.plugins.queryParser())
// Note: multipart/form-data (file uploads) is parsed per-route by formidable
// inside firmManager.js — it bypasses jsonBodyParser intentionally.

// CORS — allow Nuxt frontend on port 3000 in development
server.use((req, res, next) => {
  const origin = req.headers.origin || ''
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) {
    res.header('Access-Control-Allow-Origin', origin)
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  return next()
})

// OPTIONS preflight — middleware already sets CORS headers, just respond 204
server.opts('/*', (req, res, next) => { res.send(204); return next() })

// ── Routes ──
server.get('/api/health', healthRoute.get)
server.post('/api/translate/locale', translateRoute.post)
server.post('/api/advisor/query', firmAuth, advisorEngine)
server.post('/api/course', firmAuth, courseEngine)
server.post('/api/report/working-capital-cycle', reportRoute.workingCapitalCycle)
server.post('/api/report/debtor-drag', reportRoute.debtorDrag)
server.post('/api/report/margin-breakeven', reportRoute.marginBreakeven)
server.post('/api/report/eight-levers', reportRoute.eightLevers)
server.post('/api/report/quick-position', reportRoute.quickPosition)
server.post('/api/report/ebitda-dcf', reportRoute.ebitdaDcf)
// firmAuth deliberately ON for the intake (unlike the calc-only report routes): it accepts file uploads
server.post('/api/report/quick-position/intake', firmAuth, reportRoute.quickPositionIntake)
server.post('/api/report/ebitda-dcf/intake', firmAuth, reportRoute.ebitdaDcfIntake)
// Firm preferred currency: READ open to any firm user (reports render for advisors);
// WRITE managers only (account-wide setting). Persistence via firmOverlay (config_key 'currency').
server.get('/api/report/currency', firmAuth, currencyRoute.get)
server.post('/api/report/currency', firmAuth, requireManagerRole, currencyRoute.set)
server.get('/api/firm/advisors', firmAuth, firmRoute.getAdvisors)
server.post('/api/firm/insights', firmAuth, firmRoute.postInsights)
server.post('/api/activity/log-course', firmAuth, activityRoute.logCourse)
server.get('/api/activity/progression', firmAuth, activityRoute.getProgression)
server.get('/api/activity/team', firmAuth, requireManagerRole, activityRoute.getTeam)

// ── Cases routes ──
// All firmAuth-guarded: identity (advisorId/firmId) comes from the verified JWT,
// never the request body — closes the legacy localStorage IDOR. Each advisor
// sees their own cases + their firm's shared cases; mutations are owner-only.
server.get('/api/cases', firmAuth, casesRoute.listCases)
server.post('/api/cases', firmAuth, casesRoute.createCase)
server.put('/api/cases/:id/review', firmAuth, casesRoute.reviewCase)
server.put('/api/cases/:id/visibility', firmAuth, casesRoute.setCaseVisibility)
server.del('/api/cases/:id', firmAuth, casesRoute.deleteCase)
server.post('/api/cases/promote', firmAuth, requireManagerRole, casesRoute.promote)

// ── Client register (client knowledge base, design 2026-07-14) ──
// All firmAuth-guarded, firm-scoped from the verified JWT. The register holds
// NAMES only — reading a client's cases stays behind the case visibility model.
server.get('/api/clients', firmAuth, clientsRoute.listClients)
server.post('/api/clients', firmAuth, clientsRoute.createClient)
server.put('/api/clients/:id', firmAuth, clientsRoute.renameClient)

// ── Courses (CB-16/17): the course DOCUMENT, owner-scoped ──
// All firmAuth-guarded; identity from the verified JWT, never the body. An
// advisor reads/writes only their OWN courses; the /shared pair (CB-07,
// personal-copy model) is the one firm-bounded read — outline-only listing +
// copy-to-own, both scoped to the caller's verified firm.
server.get('/api/courses', firmAuth, coursesRoute.listCourses)
server.get('/api/courses/shared', firmAuth, coursesRoute.listShared)
server.post('/api/courses', firmAuth, coursesRoute.createCourse)
server.post('/api/courses/shared/:id/copy', firmAuth, coursesRoute.copyShared)
server.put('/api/courses/:id', firmAuth, coursesRoute.updateCourse)
server.del('/api/courses/:id', firmAuth, coursesRoute.deleteCourse)

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
server.get('/api/firm-manager/templates', ...fmGuard, fm.getTemplateImport)
server.post('/api/firm-manager/templates', ...fmGuard, fm.importTemplates)
server.del('/api/firm-manager/templates', ...fmGuard, fm.resetTemplateImport)
server.get('/api/firm-manager/distinctions', ...fmGuard, fm.listDistinctions)
server.post('/api/firm-manager/distinctions', ...fmGuard, fm.createDistinction)
server.put('/api/firm-manager/distinctions/:id', ...fmGuard, fm.updateDistinction)
server.del('/api/firm-manager/distinctions/:id', ...fmGuard, fm.deleteDistinction)
server.get('/api/firm-manager/distinctions/state', ...fmGuard, fm.getDistinctionState)
server.post('/api/firm-manager/distinctions/mark-reviewed', ...fmGuard, fm.markDistinctionsReviewed)
server.put('/api/firm-manager/distinctions/platform/:id', ...fmGuard, fm.setDistinctionOverride)
server.del('/api/firm-manager/distinctions/platform/:id', ...fmGuard, fm.resetDistinctionOverride)
server.post('/api/firm-manager/distinctions/platform/:id/keep-mine', ...fmGuard, fm.keepMineDistinction)
server.put('/api/firm-manager/distinctions/platform/:id/decline', ...fmGuard, fm.setDistinctionDecline)
server.post('/api/firm-manager/distinctions/platform/:id/move', ...fmGuard, fm.moveDistinction)
server.get('/api/firm-manager/staircase', ...fmGuard, fm.getStaircase)
server.post('/api/firm-manager/staircase', ...fmGuard, fm.saveStaircase)
server.get('/api/firm-manager/quizzes', ...fmGuard, fm.getQuizzes)
server.post('/api/firm-manager/quizzes', ...fmGuard, fm.saveQuizzes)
// Manager case-review feed: the firm's shared case studies (with their decision
// traces) for review. Manager-gated + firm-scoped; private cases never surface.
server.get('/api/firm-manager/cases', ...fmGuard, casesRoute.listFirmCases)
// Mentor-share: (part 2) anonymise a firm-shared case for the manager to preview;
// (part 3) approve+persist the share, or withdraw it. Manager-gated, firm-scoped.
server.post('/api/firm-manager/cases/:id/anonymise-preview', ...fmGuard, casesRoute.anonymiseCasePreview)
server.post('/api/firm-manager/cases/:id/share-with-mentor', ...fmGuard, casesRoute.shareCaseWithMentor)
server.del('/api/firm-manager/cases/:id/share-with-mentor', ...fmGuard, casesRoute.withdrawCaseFromMentor)

// ── Mentor view (cross-firm; mentor role only) ──
// The one read that crosses the firm boundary — only mentor-approved, anonymised
// cases, role-gated to the mentor.
server.get('/api/mentor/cases', firmAuth, requireMentorRole, mentorRoute.listMentorCases)

// Mentor Advisory Distinctions — the cascade ORIGIN (DISTINCTIONS-CASCADE-PLAN.md §6).
// The mentor authors the platform set every firm receives as its default; plain CRUD
// (no decline/override at this tier). Global scope — handlers never read req.firmId.
const mentorGuard = [firmAuth, requireMentorRole]
server.get('/api/mentor/distinctions', ...mentorGuard, mentorRoute.listMentorDistinctions)
server.post('/api/mentor/distinctions', ...mentorGuard, mentorRoute.createMentorDistinction)
server.put('/api/mentor/distinctions/:id', ...mentorGuard, mentorRoute.updateMentorDistinction)
server.del('/api/mentor/distinctions/:id', ...mentorGuard, mentorRoute.deleteMentorDistinction)

// ── Start ──
server.listen(PORT, () => {
  console.error(`[restify] virt-advisor-api listening on port ${PORT}`)
})
