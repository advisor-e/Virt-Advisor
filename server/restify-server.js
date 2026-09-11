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

// ── Local .env loading ────────────────────────────────────────────────────────
// MUST run before config/integration.js, which reads process.env at require time.
//
// Loaded HERE at the entry point rather than via a `node -r dotenv/config` flag in
// the npm script, so it works however the process is started — the documented
// recipes start this server by direct path, not always through `npm run backend`.
// Before this, .env was written and never read: the OpenAI key, the JWT secret and
// the CA bundle path all sat in the file while the process reported them missing.
//
// dotenv never overwrites a variable already present in the environment, so a real
// deployment's injected config always wins. The require is guarded because env may
// legitimately be supplied by the platform with no .env file or package present —
// a missing loader must degrade to "use the real environment", never stop the boot.
try {
  require('dotenv').config()
} catch (err) {
  process.stderr.write('[startup] NOTE: dotenv unavailable — using the process environment as-is.\n')
}

const restify = require('restify')

// ── Startup guards — fail fast on placeholder config in production ────────────
;(function assertConfig () {
  const { AUTH, DB } = require('../config/integration')
  const { productionStartupViolations } = require('./collaborate/utils/productionGuard')
  const { loadDevFirmMembership } = require('./utils/devFirmMembership')
  const isProd = process.env.NODE_ENV === 'production'

  // The three production blockers — dev-auth left on, a placeholder JWT secret, a
  // placeholder DB password — are decided by a pure, unit-tested function rather
  // than inline ifs, and it reports ALL of them at once instead of the first. It
  // came across with Collaborate, which had the same three checks; one copy now
  // guards the one server. No-op outside production, so the dev warnings below
  // still do the talking on a developer machine.
  const violations = productionStartupViolations(process.env, { AUTH, DB })
  if (violations.length) {
    console.error(
      '[startup] FATAL: refusing to boot in production — insecure configuration:\n' +
      violations.map(v => '  - ' + v).join('\n')
    )
    process.exit(1)
  }

  // JWT secret is always required — without it, firm auth cannot verify tokens.
  if (AUTH.secret === 'REPLACE_ME_WITH_ADVISOR_E_JWT_SECRET') {
    console.error('[startup] WARNING: JWT_SECRET is placeholder — firm auth will not work in dev.')
  }

  // DB password — fatal in production (above), warning in dev (MySQL may not be local).
  if (!isProd && DB.password === 'REPLACE_ME') {
    // Says what actually happens now. The old wording ("routes will return empty
    // data") predates the dev-file fallback and would have a developer read a
    // working screen as a broken one.
    console.error('[startup] WARNING: MYSQL_PASSWORD is placeholder — no MySQL. Stores fall back to their DEV-ONLY JSON files (data/dev-*.json); this is not production persistence.')
  }

  // DEV/TEST ONLY — seed which firm sits under which brand and country, so the two
  // middle-tier hubs have something below them to show. Inert unless ALLOW_DEV_AUTH
  // is set AND this is not production; see server/utils/devFirmMembership.js for why
  // it is gated on exactly the same condition as the dev tokens.
  //
  // It ANNOUNCES itself on purpose. A hub quietly full of invented firms reads
  // identically to a hub full of real ones, and that is how a reviewer signs off a
  // screen believing they have seen live data.
  const seeded = loadDevFirmMembership()
  if (seeded.loaded) {
    console.error(`[startup] DEV-ONLY: firm membership seeded from data/dev-firm-membership.json — ${seeded.firms} INVENTED firms are mapped to brand/country. The Global Group and Group hubs will show test data, not real firms.`)
  }
})()

const healthRoute = require('./routes/health')
const translateRoute = require('./routes/translate')
const firmManagerRoute = require('./routes/firmManager')
const activityRoute = require('./routes/activity')
const casesRoute = require('./routes/cases')
const clientsRoute = require('./routes/clients')
const coursesRoute = require('./routes/courses')
const mentorRoute = require('./routes/mentor')
const reportRoute = require('./routes/report')
const economicAnalysisRoute = require('./routes/economicAnalysis')
const nextStepsDraftRoute = require('./routes/nextStepsDraft')
const currencyRoute = require('./routes/currency')
const propertyTaxRulesRoute = require('./routes/propertyTaxRules')
const trendThresholdsRoute = require('./routes/forecastTrendThresholds')
const depreciationRatesRoute = require('./routes/depreciationRates')
// Item 4.92 — a COUNTRY's whole published schedule, loaded once at the global group manager
// tier and searched by every firm beneath it.
const countrySchedulesRoute = require('./routes/countrySchedules')
const taxRatesRoute = require('./routes/taxRates')
const sellDownRoute = require('./routes/forecastSellDown')
const benchmarkerRoute = require('./routes/benchmarker')
const aiPromptsRoute = require('./routes/aiPrompts')
const promptCheckRoute = require('./routes/promptCheck')
const promptContributionsRoute = require('./routes/promptContributions')
const staircaseRoute = require('./routes/staircase')
const meetingObservationsRoute = require('./routes/meetingObservations')
const meetingReviewRoute = require('./routes/meetingReview')
const clientCopyRequestsRoute = require('./routes/clientCopyRequests')
const complianceRoute = require('./routes/compliance')
const hubTabsRoute = require('./routes/hubTabs')
// Both sides of the 2026-09-10 merge: this machine's compliance routes, and the desktop's
// `firmOrEntityAuth` in the guard list.
const { firmAuth, entityAuth, firmOrEntityAuth, collaborateAuth, requireManagerRole, requireMentorRole, requireManagingTier } = require('./middleware/firmAuth')
const clientReportsRoute = require('./routes/clientReports')
// Collaborate — the people layer and its template catalogue. Merged in from what
// was a separate application with its own Restify server on this same port; see
// design/COLLABORATE-MERGE-PLAN.md. Its routes are registered below, under
// collaborateAuth, alongside ours.
const peopleRoute = require('./collaborate/routes/people')
const templatesRoute = require('./collaborate/routes/templates')
// Advisor + course engines — migrated from Nuxt server-middleware per the
// coding-team Req 7 ruling (OpenAI logic + key backend-only). Connect-style
// (req, res, next) handlers that read the raw body and stream SSE themselves.
const advisorEngine = require('./advisorEngine')
const courseEngine = require('./courseEngine')

const PORT = process.env.BACKEND_PORT || 4000
// Bind IPv4 loopback explicitly. With no host, Node binds `::` (IPv6-only on
// Windows), so the Nuxt proxies — which target `http://127.0.0.1:4000` — get
// ECONNREFUSED whenever `localhost` resolves to IPv4. This is the backend twin
// of the nuxt.config `server.host: '127.0.0.1'` fix. Deployments that need a
// different interface (e.g. cross-host) set BACKEND_HOST (0.0.0.0 for all IPv4).
const HOST = process.env.BACKEND_HOST || '127.0.0.1'

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
  // The template push reads its own body under the 10 MB upload cap (Cascade Phase 4);
  // a 337 KB export fits the 1 MB parser today, but the cap is the upload's, not this one's.
  if (p === '/api/advisor/query' || p === '/api/course' || p === '/api/integration/templates') { return next() }
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
// The firm's Advisory Staircase wording for the in-session selector. READ open to
// any firm user (every advisor is asked the staircase question); the WRITE lives on
// the manager-only /api/firm-manager/staircase. Same blend the engine uses.
server.get('/api/advisor/staircase', firmAuth, staircaseRoute.get)
server.post('/api/course', firmAuth, courseEngine)
server.post('/api/report/working-capital-cycle', reportRoute.workingCapitalCycle)
server.post('/api/report/debtor-drag', reportRoute.debtorDrag)
server.post('/api/report/margin-breakeven', reportRoute.marginBreakeven)
server.post('/api/report/eight-levers', reportRoute.eightLevers)
// The Business Performance Report's ratio hub (item 4.70, stage 1) — calc-only, anonymous.
server.post('/api/report/dashboard-reports', reportRoute.dashboardReports)
// The report's pages (stage 2). Guarded, unlike the hub above, because the cash drivers and
// the health score band on the FIRM'S thresholds, resolved from the token — a client reading
// their saved report is a business entity of the same firm, so both are admitted.
server.post('/api/report/dashboard-reports/pages', firmOrEntityAuth, reportRoute.dashboardReportPages)
server.post('/api/report/quick-position', reportRoute.quickPosition)
server.post('/api/report/ebitda-dcf', reportRoute.ebitdaDcf)
server.post('/api/report/loan-estimator', reportRoute.loanEstimator)
server.post('/api/report/lease-vs-buy', reportRoute.leaseVsBuy)
server.post('/api/report/cost-of-capital', reportRoute.costOfCapital)
server.post('/api/report/multiple-property', reportRoute.multipleProperty)
server.post('/api/report/volatility', reportRoute.volatility)
// The Import & Retail shipment calculator (item 4.64 slice 2). Anonymous like the
// volatility read beside it — dates and numbers in, dates and numbers out. It is a route
// rather than a computed property because the date rules are business logic, and one
// implementation cannot drift from another.
server.post('/api/report/import-shipments', reportRoute.importShipments)
// What the imported stock will sell for as it ages down the price ladder (item 4.64). Step 3
// seeds its twelve revenue boxes from this. Anonymous and calculation-only, like the two above.
server.post('/api/report/imported-revenue', reportRoute.importedRevenue)
server.post('/api/report/three-way-forecast', reportRoute.threeWayForecast)
server.post('/api/report/three-way-forecast/three-years', reportRoute.threeYearForecast)
// The Model Guide screen. Same records the AI is given, from the same file — see the
// route's own note. Platform content, no client data, so no firmAuth (as above).
server.get('/api/report/model-guide', reportRoute.modelGuide)
// firmAuth deliberately ON for the intake (unlike the calc-only report routes): it accepts file uploads
server.post('/api/report/quick-position/intake', firmAuth, reportRoute.quickPositionIntake)
server.post('/api/report/ebitda-dcf/intake', firmAuth, reportRoute.ebitdaDcfIntake)
server.post('/api/report/volatility/intake', firmAuth, reportRoute.volatilityIntake)
server.post('/api/report/three-way-forecast/intake', firmAuth, reportRoute.threeWayForecastIntake)
server.post('/api/report/dashboard-reports/intake', firmAuth, reportRoute.dashboardReportsIntake)
server.post('/api/report/dashboard-reports/inventory', firmAuth, reportRoute.dashboardReportsInventory)
server.post('/api/report/dashboard-reports/monthly', firmAuth, reportRoute.dashboardReportsMonthly)
// Item 4.70 stage 6 — the AI draft of the three next steps, and the tick that approves them.
server.post('/api/report/dashboard-reports/next-steps', firmAuth, nextStepsDraftRoute.startDraft)
server.post('/api/report/dashboard-reports/next-steps/ready', firmAuth, nextStepsDraftRoute.setReady)
server.get('/api/report/dashboard-reports/next-steps/:runId', firmAuth, nextStepsDraftRoute.getDraft)
// Economic Analysis (item 4.66) — the Three-Way Forecast's optional market research, and
// the first AI call in the report area. firmAuth on all three: the run belongs to the
// advisor who started it, and the route checks BOTH identities, not just the firm.
// It returns a run to poll because a research pass takes 83–102 seconds.
server.post('/api/report/economic-analysis', firmAuth, economicAnalysisRoute.startResearch)
server.get('/api/report/economic-analysis/:runId', firmAuth, economicAnalysisRoute.getRun)
server.post('/api/report/economic-analysis/:runId/include', firmAuth, economicAnalysisRoute.setInclude)
// Firm preferred currency: READ open to any firm user — an advisor OR a client of the firm,
// because the client's page renders the same reports (item 4.68); WRITE managers only
// (account-wide setting). Persistence via firmOverlay (config_key 'currency').
server.get('/api/report/currency', firmOrEntityAuth, currencyRoute.get)
server.post('/api/report/currency', firmAuth, requireManagerRole, currencyRoute.set)
// The property model's tax rules, resolved through the tier chain. READ open to any
// signed-in user — every advisor opening the Multiple Property Assessment needs it, and
// they may type over any of it for the client in front of them (Mike, 2026-08-17); a
// client of the firm opening the same screen needs it too (item 4.68). The WRITE lives
// on the manager-only /api/firm-manager route below.
server.get('/api/report/property-tax-rules', firmOrEntityAuth, propertyTaxRulesRoute.get)
// The bands the Three-Way Forecast's two-year trend read draws (Mike, 2026-09-03, item
// 4.61b). Same asymmetry and same reason as the tax rules above: every advisor building a
// forecast needs to READ them, and the write is manager-only on /api/firm-manager below.
server.get('/api/report/trend-thresholds', firmAuth, trendThresholdsRoute.get)
// The depreciation rates a client's forecast writes assets down at, for the client's own
// country (item 4.78). Same asymmetry and the same reason once more, and here Mike stated it
// himself on 2026-09-08: "Never block the advisor." The read degrades to the app's own six
// rates rather than failing, and the write is manager-only on /api/firm-manager below.
server.get('/api/report/depreciation-rates', firmAuth, depreciationRatesRoute.get)
// 🔴 AN ADVISOR MAY LOAD A DOCUMENT; ONLY A FIRM MANAGER APPROVES ONE. Mike's ruling of
// 2026-09-08, from his own question: "does the advisor have the ability to enter a tax doc for
// the client with the different country?" As the manager's screen was first drawn the answer
// was no, which left an advisor with an overseas client stuck behind their manager.
//
// IT IS THE SAME HANDLER AS THE MANAGER'S, deliberately, because what it writes is a PROPOSAL
// — held in a store the rate resolver never reads (Brief P1). Nothing an advisor loads can
// reach a forecast until a manager approves it, and the role gate stays exactly where it was,
// on approve and reject below. `firmAuth` resolves the storage scope once, so an advisor's
// document lands in their own firm's store and can land nowhere else.
//
// ⚠ IT WIDENS WHO CAN SPEND AN AI CALL, from managers to every advisor — AND THAT SPENDING
// IS NOW CAPPED (item 4.82, Mike's rulings of 2026-09-11): 20 readings per firm in any
// rolling 24 hours, counted across this route and the manager's together, refused before the
// model is called. The file must still be a real PDF of 20 MB or less. See
// `server/utils/aiLoadBudget.js`, which carries the reasoning for each part of the cap.
server.post('/api/report/depreciation-rates/documents', firmAuth, depreciationRatesRoute.loadDocument)
// The company tax rate, GST rate, filing cycle and accounting basis a client's forecast uses,
// for the client's own country (item 4.81). A SIBLING OF THE LINE ABOVE, NOT PART OF IT — a
// tax rate turns profit into tax owed, a depreciation rate writes an asset down, and Mike
// renamed that feature on 2026-09-09 because one screen was promising both. Same asymmetry
// and the same "never block the advisor": the read degrades to the app's own four figures,
// which are what every forecast uses today, and the write is manager-only below.
server.get('/api/report/tax-rates', firmAuth, taxRatesRoute.get)
// The prices imported stock sells down at as it ages (item 4.64). Same asymmetry and same
// reason again: the advisor's step 3 seeds its ladder from this, so the read must never
// require a manager role, and the write is manager-only on /api/firm-manager below. A
// client editing the forecast seeds the same ladder, so the read admits a client too (4.68).
server.get('/api/report/sell-down', firmOrEntityAuth, sellDownRoute.get)
// The Stats NZ benchmarker (item 4.70 stage 3, Brief P9). The finder and an industry's bands
// are open to any signed-in reader, a client included — nothing here is a firm's own data.
server.get('/api/report/benchmarker/industries', firmOrEntityAuth, benchmarkerRoute.industries)
server.get('/api/report/benchmarker/industries/:code', firmOrEntityAuth, benchmarkerRoute.industry)
// /api/firm/advisors and /api/firm/insights were removed 2026-07-29 with the
// FirmDashboard mock they existed for. Both were stubs returning empty data, and
// proposed a three-table schema (advisors/courses/course_sessions) that was never
// built — while the real data has always been in advisor_va_sessions,
// advisor_course_completions and va_courses. The team view is now a Firm Manager Hub
// tab reading /api/activity/team.
server.post('/api/activity/log-course', firmAuth, activityRoute.logCourse)
server.get('/api/activity/progression', firmAuth, activityRoute.getProgression)
server.get('/api/activity/team', firmAuth, requireManagerRole, activityRoute.getTeam)
// One advisor's quiz detail, for their manager. Same guard pair as the team overview:
// the firm comes from the token, and the advisor id in the path is confined to that
// firm by the query — see the SECURITY note on getAdvisorQuestions.
server.get('/api/activity/team/advisor/:advisorId', firmAuth, requireManagerRole, activityRoute.getAdvisorQuestions)
// CPD record. firmAuth only, no manager role: these are the caller's OWN claims, and
// there is deliberately no manager-facing view of another advisor's CPD in this slice.
server.get('/api/activity/cpd', firmAuth, activityRoute.getCpd)
server.post('/api/activity/cpd/record', firmAuth, activityRoute.recordCpd)
server.post('/api/activity/cpd/withdraw', firmAuth, activityRoute.withdrawCpd)

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

// ── Business Entity Reports — which models a client may open (stub, part 1) ──
// design/features/business-entity-reports.md, approved by Mike 2026-09-03. The advisor's
// two routes are firmAuth (a client token is refused there by name); the client's own
// read is entityAuth, which admits ONLY a client and scopes it to the firm and client id
// in its verified token. Not in routes/report.js — that file is the laptop's under 4.61.
server.get('/api/client-reports/mine', entityAuth, clientReportsRoute.getMine)
server.get('/api/client-reports/access/:clientId', firmAuth, clientReportsRoute.getAccessForClient)
server.put('/api/client-reports/access/:clientId', firmAuth, clientReportsRoute.setAccess)
// Saved reports (part 2, item 4.62): the figures kept per client per model. The advisor
// reads, saves and restores for a client of the firm; the client reads and saves its own,
// and its save is refused in the store unless the advisor opened that model to it.
server.get('/api/client-reports/mine/saved', entityAuth, clientReportsRoute.getMineSaved)
server.put('/api/client-reports/mine/saved', entityAuth, clientReportsRoute.putMineSaved)
server.get('/api/client-reports/saved/:clientId', firmAuth, clientReportsRoute.getSaved)
server.put('/api/client-reports/saved/:clientId', firmAuth, clientReportsRoute.putSaved)
server.post('/api/client-reports/saved/:clientId/restore', firmAuth, clientReportsRoute.restoreSaved)

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
server.get('/api/firm-manager/storage', ...fmGuard, fm.getStorageUsage)
server.get('/api/firm-manager/templates', ...fmGuard, fm.getTemplateImport)
server.get('/api/firm-manager/templates/library', ...fmGuard, fm.getTemplateLibraryView)
server.post('/api/firm-manager/templates', ...fmGuard, fm.importTemplates)
server.post('/api/firm-manager/templates/restore', ...fmGuard, fm.restoreTemplateImport)
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
// The property model's tax rules — a GROUP (normally a country) sets them and a FIRM may
// correct them (Mike, 2026-08-17, §8 Q6). One set of routes for every tier: the scope is
// `req.firmId` from the verified JWT, never an id from the request.
server.get('/api/firm-manager/property-tax-rules', ...fmGuard, propertyTaxRulesRoute.getForManager)
server.post('/api/firm-manager/property-tax-rules', ...fmGuard, propertyTaxRulesRoute.save)
server.get('/api/firm-manager/property-tax-rules/history', ...fmGuard, propertyTaxRulesRoute.history)
server.post('/api/firm-manager/property-tax-rules/restore', ...fmGuard, propertyTaxRulesRoute.restore)
// The forecast's trend thresholds (Mike, 2026-09-03). Same shape and same guard as the tax
// rules above — one set of routes for every tier, scoped to `req.firmId` from the verified
// JWT. Only the MENTOR's screen is switched on today (TAB_TIERS), per the
// default-is-mentor-alone ruling of 2026-08-24; the routes carry every tier already so
// that switching one on later is a line in that matrix and nothing here.
// The depreciation rates and each country's first-year rule (item 4.78). Same shape and same
// guard as the blocks around it — one set of routes for every tier, scoped to `req.firmId`
// from the verified JWT.
//
// 🔴 TWO APPROVE ROUTES, AND THAT IS MIKE'S RULING OF 2026-09-09 MADE STRUCTURAL. A
// first-year rule gets its own Approve, separate from the rates', because approving 41 rates
// is a routine review and adopting a 20% first-year write-off is not. Two routes mean
// approving rates CANNOT adopt a tax scheme as a side effect: the handler that writes rates
// cannot reach `firstYearRule` and the one that writes the rule cannot reach the rates.
server.get('/api/firm-manager/depreciation-rates', ...fmGuard, depreciationRatesRoute.getForManager)
server.post('/api/firm-manager/depreciation-rates', ...fmGuard, depreciationRatesRoute.approveRates)
server.post('/api/firm-manager/depreciation-rates/first-year-rule', ...fmGuard, depreciationRatesRoute.approveFirstYearRule)
server.get('/api/firm-manager/depreciation-rates/history', ...fmGuard, depreciationRatesRoute.history)
server.post('/api/firm-manager/depreciation-rates/restore', ...fmGuard, depreciationRatesRoute.restore)
// Slice 3 — loading a tax authority's schedule and having the model read it. The proposal
// these produce is stored apart from the approved tables and the resolver never reads it, so
// a document loaded here changes no forecast until `documents/approve` is called.
//
// ⚠ MANAGER-ONLY TODAY BY SLICE, NOT BY RULING. Mike settled that an advisor may LOAD and
// only a manager may APPROVE (FR-017); the advisor's screen is drawn and unbuilt, so until it
// exists these sit behind the same guard as everything else here.
//
// The upload parses its own multipart body per-route (formidable), which is why it is not
// affected by the JSON body limit above.
server.post('/api/firm-manager/depreciation-rates/documents', ...fmGuard, depreciationRatesRoute.loadDocument)
server.get('/api/firm-manager/depreciation-rates/documents', ...fmGuard, depreciationRatesRoute.listDocuments)
server.post('/api/firm-manager/depreciation-rates/documents/approve', ...fmGuard, depreciationRatesRoute.approveDocument)
server.post('/api/firm-manager/depreciation-rates/documents/reject', ...fmGuard, depreciationRatesRoute.rejectDocument)
// Item 4.88 — delete a failed read, so twenty of them cannot push a firm's real documents
// off the end of a list that keeps twenty. UNREADABLE DOCUMENTS ONLY: the route refuses
// every other status, so the record of what was approved can never be erased by a request.
server.post('/api/firm-manager/depreciation-rates/documents/remove', ...fmGuard, depreciationRatesRoute.removeDocument)
// Item 4.92 — Country Rate Schedules. A country's WHOLE published schedule, not one firm's
// document: about 2,800 classes for IR265 against the six categories a forecast depreciates.
//
// 🔴 LOADING AND DECIDING ARE THE GLOBAL GROUP MANAGER'S ALONE — Mike's ruling of 2026-09-11,
// which OVERRIDES the default-is-mentor-alone rule for this feature. `fmGuard` gets any
// manager through the door, so the tier check is INSIDE each handler, taken from the caller's
// own verified scope (`countrySchedules.mayLoadSchedules`). A firm manager who finds these
// URLs is refused with 403, exactly as an advisor is refused the sibling's approve routes.
//
// ⚠ `classes` IS THE EXCEPTION AND THE ASYMMETRY IS THE FEATURE: one person loads a country's
// schedule, and EVERY manager beneath them searches it from their own class picker. It
// resolves through the caller's own scope chain, so no group can read another's.
//
// ⚠ THE LOAD ANSWERS 202, NOT 200. One schedule is a survey plus a request per eight pages,
// each of which may take minutes of model time; the read runs on after the response and the
// screen watches `country-schedules/read`. The upload parses its own multipart body
// (formidable), so the JSON body limit above does not reach it.
server.post('/api/firm-manager/country-schedules', ...fmGuard, countrySchedulesRoute.loadSchedule)
server.get('/api/firm-manager/country-schedules', ...fmGuard, countrySchedulesRoute.listSchedules)
server.get('/api/firm-manager/country-schedules/read', ...fmGuard, countrySchedulesRoute.getRead)
server.post('/api/firm-manager/country-schedules/approve', ...fmGuard, countrySchedulesRoute.approveSchedule)
server.post('/api/firm-manager/country-schedules/reject', ...fmGuard, countrySchedulesRoute.rejectSchedule)
server.get('/api/firm-manager/country-schedules/classes', ...fmGuard, countrySchedulesRoute.searchClasses)
// The four tax figures a country's clients are taxed on (item 4.81). Same shape and same
// guard as the block above, and ONE approve route rather than two: a first-year rule is a tax
// scheme a manager adopts, which is why it earned its own button next door, whereas these
// four are the same kind of decision taken together off the same document.
server.get('/api/firm-manager/tax-rates', ...fmGuard, taxRatesRoute.getForManager)
server.post('/api/firm-manager/tax-rates', ...fmGuard, taxRatesRoute.approveFigures)
server.get('/api/firm-manager/tax-rates/history', ...fmGuard, taxRatesRoute.history)
server.post('/api/firm-manager/tax-rates/restore', ...fmGuard, taxRatesRoute.restore)
// Compliance (item 4.83, slice 1) — what a tier publishes about a firm's legal obligations,
// and what every tier beneath it receives. Asked for by Mike on 2026-09-10, naming all four
// manager tiers himself. Same guard as the blocks above: managers only, at every tier, and no
// advisor-facing read at all — compliance is a firm's obligation rather than an individual
// advisor's, and the one screen an advisor meets is the locked state on /meeting-record.
//
// 🔴 THERE IS NO ROUTE HERE THAT EDITS OR HIDES AN ITEM A TIER ABOVE PUBLISHED, and that is
// Mike's two rulings of 2026-09-10 made structural rather than checked. Every write addresses
// `req.firmId`'s own row; a republish refuses an id the caller does not already own. Adding a
// route that takes a scope from the body would undo both rulings at once.
server.get('/api/firm-manager/compliance', ...fmGuard, complianceRoute.getForManager)
server.post('/api/firm-manager/compliance', ...fmGuard, complianceRoute.publish)
server.get('/api/firm-manager/compliance/history', ...fmGuard, complianceRoute.history)
server.post('/api/firm-manager/compliance/restore', ...fmGuard, complianceRoute.restore)
// The firm's OWN compliance evidence (slice 2) — its lawyer's opinion, its privacy statement,
// its engagement terms. Advisor-e holds these and does not read them, and a tier above sees
// only that a document exists. The upload parses its own multipart body per-route
// (formidable), which is why it is not affected by the JSON body limit above. Download rides
// the document library's existing route, whose cross-firm gate already covers these rows.
// The declaration itself — the ONLY thing that opens Meeting Review for a firm (slice 3).
server.post('/api/firm-manager/compliance/declaration', ...fmGuard, complianceRoute.declare)
// 🔴 `firmAuth` AND NOT `fmGuard`, DELIBERATELY. The person who meets the locked recorder is an
// ADVISOR; behind the manager guard they would be told nothing at all and would meet a screen
// that simply fails. This read says whether their firm has declared and nothing else.
server.get('/api/compliance/gate', firmAuth, complianceRoute.gate)
// Who beneath this tier has declared, and who therefore cannot record. STATUS ONLY — a firm's
// documents are the firm's, and no route here returns one.
server.get('/api/firm-manager/compliance/firms', ...fmGuard, complianceRoute.listFirmsStatus)
server.get('/api/firm-manager/compliance/evidence', ...fmGuard, complianceRoute.listEvidence)
server.post('/api/firm-manager/compliance/evidence', ...fmGuard, complianceRoute.uploadEvidence)
server.del('/api/firm-manager/compliance/evidence/:fileId', ...fmGuard, complianceRoute.deleteEvidence)
// 🔴 THE COMPLETENESS CHECK, ON A BUTTON AND NEVER AUTOMATICALLY (Mike, 2026-09-10). It is
// sent DOCUMENT NAMES ONLY — the artefact promises three times that we do not read a firm's
// documents. It reports what appears to be missing; it never gates anything, and it never says
// what the law requires.
server.post('/api/firm-manager/compliance/check', ...fmGuard, complianceRoute.runCheck)
// ── Hub tab notification dots (item 4.84, slice 1) ──
// When this manager last opened each hub tab — the record the BLUE and ORANGE dots are drawn
// from. Keyed to the manager's own identity on the verified token, so nobody reads or clears
// anybody else's; one row per manager per tab, which is what stops two windows of one hub
// overwriting each other (item 4.75). RED is not here: it is raised by the individual tab that
// knows what "new" means for itself, which today is Compliance alone.
server.get('/api/firm-manager/hub-tabs/opened', ...fmGuard, hubTabsRoute.getOpened)
server.post('/api/firm-manager/hub-tabs/opened', ...fmGuard, hubTabsRoute.markOpened)
server.get('/api/firm-manager/trend-thresholds', ...fmGuard, trendThresholdsRoute.getForManager)
server.post('/api/firm-manager/trend-thresholds', ...fmGuard, trendThresholdsRoute.save)
server.get('/api/firm-manager/trend-thresholds/history', ...fmGuard, trendThresholdsRoute.history)
server.post('/api/firm-manager/trend-thresholds/restore', ...fmGuard, trendThresholdsRoute.restore)
// The sell-down ladder (item 4.64). Same shape, same guard and same reasoning as the trend
// thresholds directly above — one set of routes for every tier, scoped to `req.firmId` from
// the verified JWT, with only the MENTOR's screen switched on today (TAB_TIERS).
server.get('/api/firm-manager/sell-down', ...fmGuard, sellDownRoute.getForManager)
server.post('/api/firm-manager/sell-down', ...fmGuard, sellDownRoute.save)
server.get('/api/firm-manager/sell-down/history', ...fmGuard, sellDownRoute.history)
server.post('/api/firm-manager/sell-down/restore', ...fmGuard, sellDownRoute.restore)
// The instructions the AI is given when it builds a model, and the three settings a
// manager may change on them (Mike, 2026-08-21). Same shape and same guard as the tax
// rules above: one set of routes for every tier, scoped to `req.firmId` from the verified
// JWT and never to an id in the request. design/AI-PROMPTS-PAGE.md.
server.get('/api/firm-manager/ai-prompts', ...fmGuard, aiPromptsRoute.getForManager)
server.post('/api/firm-manager/ai-prompts', ...fmGuard, aiPromptsRoute.save)
server.get('/api/firm-manager/ai-prompts/history', ...fmGuard, aiPromptsRoute.history)
server.post('/api/firm-manager/ai-prompts/restore', ...fmGuard, aiPromptsRoute.restore)

// ── Meeting Review — the observation points (slice 1) ──
// What an advisor is checked on in a meeting of each kind. The mentor authors the
// platform list; a firm inherits it and may edit, switch off, or add its own beside it.
// Design design/features/meeting-review.md §3; artefact design/mockups/meeting-review.html
// Stage A, approved by Mike 2026-09-01.
//
// ⚠ NOTHING ELSE OF MEETING REVIEW IS BUILT — no recording, no transcript, no report, no
// audio anywhere in this repository. These points stand on their own: Brief §3 makes the
// point that the list pays before a word is recorded.
//
// `history` and `restore` are literal segments in the same position as a :scenarioId
// would be, but no `GET /:scenarioId` route exists, so neither can be shadowed by a
// scenario. Registered first anyway, matching the logic-trees `probe` precedent above.
const mo = meetingObservationsRoute
server.get('/api/firm-manager/meeting-observations/history', ...fmGuard, mo.history)
server.post('/api/firm-manager/meeting-observations/restore', ...fmGuard, mo.restore)
server.get('/api/firm-manager/meeting-observations', ...fmGuard, mo.getForManager)
server.put('/api/firm-manager/meeting-observations/:scenarioId/point/:pointId', ...fmGuard, mo.setPointOverride)
server.del('/api/firm-manager/meeting-observations/:scenarioId/point/:pointId', ...fmGuard, mo.resetPointOverride)
server.put('/api/firm-manager/meeting-observations/:scenarioId/point/:pointId/decline', ...fmGuard, mo.setPointDecline)
server.post('/api/firm-manager/meeting-observations/:scenarioId/own', ...fmGuard, mo.addOwnPoint)
server.put('/api/firm-manager/meeting-observations/:scenarioId/own/:pointId', ...fmGuard, mo.updateOwnPoint)
server.del('/api/firm-manager/meeting-observations/:scenarioId/own/:pointId', ...fmGuard, mo.deleteOwnPoint)

// The KINDS of meeting — create, rename, reorder, switch off (MEETING-TYPES-CASCADE.md
// §7 slice 2, approved by Mike 2026-09-02). Manager-guarded and scoped to req.firmId, so a
// scope can only ever write its own row — the mechanical half of P14, "NOBODY can edit a
// level ABOVE their own".
const mt = require('./routes/meetingTypes')
server.get('/api/firm-manager/meeting-types', ...fmGuard, mt.getTypes)
server.post('/api/firm-manager/meeting-types', ...fmGuard, mt.addType)
server.put('/api/firm-manager/meeting-types/order', ...fmGuard, mt.saveOrder)
server.put('/api/firm-manager/meeting-types/own/:typeId', ...fmGuard, mt.editOwnType)
server.del('/api/firm-manager/meeting-types/own/:typeId', ...fmGuard, mt.removeOwnType)
server.put('/api/firm-manager/meeting-types/:typeId', ...fmGuard, mt.overrideType)
server.del('/api/firm-manager/meeting-types/:typeId/override', ...fmGuard, mt.resetType)
server.put('/api/firm-manager/meeting-types/:typeId/declined', ...fmGuard, mt.declineType)

// The manager's aggregate — are the points landing across the firm this month? Counts only,
// and only above Mike's threshold of 5 advisors and 20 meetings (2026-09-01).
//
// 🔴 IT DOES NOT CASCADE UPWARD, AND THAT IS THE POINT. Brief P13 keeps everything derived
// from a recorded meeting inside the firm it came from, because the consent line promises a
// named client exactly that. The handler answers any tier above the firm 403.
const mp = require('./routes/meetingPatterns')
server.get('/api/firm-manager/meeting-patterns', ...fmGuard, mp.getPatterns)

// What a FIRM MANAGER can see of their advisors' own decisions — ordered by Mike on
// 2026-09-08 in the same breath as permitting them: "yes but fix the issue - build it so the
// manager can see". Firm tier ONLY, and that is a judgement stated rather than assumed: the
// decisions live on each firm's own row, so a scope above the firm has no advisors beneath it
// to summarise and would see an empty section every time. The handler answers 403 above the
// firm. It is a MIRROR, not a control — there is deliberately no route by which a manager
// puts a point back on an advisor's own list, because P14 runs downward only.
server.get('/api/firm-manager/meeting-observations/set-aside', ...fmGuard, mo.getSetAside)

// The advisor's own level — their pre-set, in the first person, and since 2026-09-08 their
// own decisions on it. firmAuth ONLY, because every advisor needs it; there is deliberately
// no manager guard on these five.
//
// 🔴 THE WRITES ARE KEYED TO `req.advisorId` FROM THE VERIFIED TOKEN, never from a body. One
// advisor cannot reach another's list, in this firm or any other, because no request shape
// can express it — the same property that makes one set of manager routes safe for four
// tiers. What an advisor changes binds their own level ONLY: nothing here writes to the
// firm's standing list, which is Mike's P14 ("NOBODY can edit a level ABOVE their own")
// running in the direction it always did.
//
// Mike ruled on 2026-09-08 that an advisor MAY set aside a point their firm set — and
// ordered in the same breath that a manager be able to see it. That is why the advisor's
// display name is stored beside the decision: this app holds no advisors table to join one
// out of later (config/db-schema.sql). Design: design/mockups/meeting-preset-advisor-level.html.
//
server.get('/api/meeting/observations', firmAuth, mo.getForAdvisor)
server.post('/api/meeting/observations/decline', firmAuth, mo.setAdvisorDecline)
server.post('/api/meeting/observations/own', firmAuth, mo.addAdvisorPoint)
server.put('/api/meeting/observations/own', firmAuth, mo.updateAdvisorPoint)
server.post('/api/meeting/observations/own/remove', firmAuth, mo.deleteAdvisorPoint)

// ── The BUSINESS-ENTITY level — "how I run meetings with THIS client" (2026-09-10) ──
// The bottom of the cascade, MEETING-TYPES-CASCADE.md §7 slice 4 second half, built from
// design/mockups/meeting-preset-client-level.html with all five questions ruled by Mike
// the same day. ONE SHARED LIST PER CLIENT that any advisor in the firm may edit, every
// entry named; it can only remove or add on top of the advisor's own layer, never put back
// what an advisor set aside for themselves. NO MANAGER ROUTES, on his ruling: a firm
// manager opens the same screen. The client is checked against the firm's register on
// every call, so another firm's client id is a 404.
const moEntity = require('./routes/meetingObservationsEntity')
server.get('/api/meeting/observations/client/:clientId', firmAuth, moEntity.getForClient)
server.post('/api/meeting/observations/client/decline', firmAuth, moEntity.setClientDecline)
server.post('/api/meeting/observations/client/own', firmAuth, moEntity.addClientPoint)
server.put('/api/meeting/observations/client/own', firmAuth, moEntity.updateClientPoint)
server.post('/api/meeting/observations/client/own/remove', firmAuth, moEntity.deleteClientPoint)

// ── Meeting Review — consent, capture, transcription and deletion (slice 2) ──
// Asked for by Mike 2026-09-01 ("4.56 - slice 2"). Design design/features/meeting-review.md;
// wording design/MEETING-CONSENT-WORDING.md; screens design/mockups/meeting-review.html
// Stage B2–B4, approved 2026-09-01.
//
// 🔴 THE RETENTION DIAL IS A MANAGER ROUTE AND THE CONSENT FIGURE IS AN ADVISOR ONE, and
// they must stay that way. A firm sets how long transcripts live (P8); every advisor has to
// READ that figure because the approved consent wording quotes it aloud to the client. If
// the advisor's read were behind the manager guard, the consent screen would fail for
// exactly the people who need it.
//
// 🔴 THE RECORDING ROUTES ARE `firmAuth` ONLY, AND THEY GUARD THEMSELVES ON THE ADVISOR.
// Brief P2: a recording belongs to the advisor who made it, so a colleague at the same firm
// must not reach it. `req.firmId` alone cannot express that, so every handler checks the
// meeting's stored owner against `req.advisorId` as well — see `ownedMeeting`.
const mr = meetingReviewRoute
server.get('/api/firm-manager/meeting-retention', ...fmGuard, mr.getRetention)
server.put('/api/firm-manager/meeting-retention', ...fmGuard, mr.setRetention)
server.del('/api/firm-manager/meeting-retention', ...fmGuard, mr.resetRetention)

server.get('/api/meeting/consent', firmAuth, mr.getConsentContext)
// 🔴 THE COMPLIANCE GATE, AND IT SITS ON EXACTLY ONE ROUTE (item 4.83, slice 3). Mike's ruling
// of 2026-09-10: "they have to tick a box before the feature becomes active." Until a firm
// manager records the declaration on the Compliance tab, no advisor at that firm can start a
// recording. `pages/meeting-record.vue` shows the locked state, but a screen is not a control —
// that page's own comment says its access check is UI-only because the server re-checks.
//
// ⚠ STARTING A RECORDING IS THE CHOKE POINT. Consent, chunks, finish and both reports all
// address a meeting that already exists, so nothing can come into being without passing here.
// Repeating the guard on all seven would add six places for it to drift.
//
// ⚠ THE DECLARATION IS THE ONLY THING THAT GATES. Not the evidence pack — an empty pack blocks
// nothing — not the completeness check, and not a published update, which notifies with a dot
// and suspends nothing. A second condition added here has undone a ruling.
server.post('/api/meeting/recordings', firmAuth, complianceRoute.requireDeclaration, mr.startRecording)
server.post('/api/meeting/recordings/:meetingId/consent', firmAuth, mr.confirmConsent)
server.post('/api/meeting/recordings/:meetingId/chunk', firmAuth, mr.uploadChunk)
server.post('/api/meeting/recordings/:meetingId/finish', firmAuth, mr.finishRecording)
server.get('/api/meeting/recordings/:meetingId', firmAuth, mr.getRecording)
server.del('/api/meeting/recordings/:meetingId', firmAuth, mr.deleteRecording)

// Slice 3 — the two reports. `firmAuth` only, like the recording routes above: each of these
// guards on the ADVISOR as well as the firm inside `ownedMeeting`, because Brief P2 gives a
// recording and its coaching notes to the advisor who made it, not to their colleagues.
server.post('/api/meeting/recordings/:meetingId/reports', firmAuth, mr.generateReports)
server.get('/api/meeting/recordings/:meetingId/reports', firmAuth, mr.getReports)
server.put('/api/meeting/recordings/:meetingId/reports/summary', firmAuth, mr.saveSummaryEdit)
server.post('/api/meeting/recordings/:meetingId/reports/summary/approve', firmAuth, mr.approveSummary)
server.post('/api/meeting/recordings/:meetingId/reports/coaching/dispute', firmAuth, mr.disputeFinding)
server.post('/api/meeting/recordings/:meetingId/reports/coaching/heard', firmAuth, mr.answerCannotHear)

// ── A client asks for a copy of what was recorded about them ────────────────────────────
// design/mockups/client-record-request.html, ruled by Mike 2026-09-10. IPP6 access, IPP7
// correction — finding B of MEETING-REVIEW-DPIA.md §10.
//
// 🔴 `firmAuth` ONLY ON THE REQUEST ROUTES, NOT `fmGuard`, AND THAT IS RULING 2. The advisor
// alone releases a meeting, so an advisor must be able to open the request they are being
// waited on for. Each handler then checks the meeting's stored owner against `req.advisorId`,
// exactly as `ownedMeeting` does above — a caller sees every meeting on a request, because it
// is the CLIENT's request, and may act only on the ones they recorded.
//
// 🔴 THE ONE EXCEPTION IS `release-absent`, THE BREAK-GLASS OF RULING 2b — manager-gated, and
// refused without the declaration that the recording advisor can no longer act.
const ccrRoute = clientCopyRequestsRoute
server.get('/api/firm-manager/client-copy-deadline', ...fmGuard, ccrRoute.getDeadline)
server.put('/api/firm-manager/client-copy-deadline', ...fmGuard, ccrRoute.setDeadline)
server.post('/api/firm-manager/client-copy-deadline/reset', ...fmGuard, ccrRoute.resetDeadline)

server.get('/api/client-copy-requests', firmAuth, ccrRoute.listRequests)
server.post('/api/client-copy-requests', firmAuth, ccrRoute.logRequest)
server.get('/api/client-copy-requests/:requestId', firmAuth, ccrRoute.getRequest)
server.post('/api/client-copy-requests/:requestId/close', firmAuth, ccrRoute.closeRequest)
server.post('/api/client-copy-requests/:requestId/meetings/:meetingId/release',
  firmAuth, ccrRoute.releaseMeeting)
server.post('/api/client-copy-requests/:requestId/meetings/:meetingId/release-absent',
  ...fmGuard, ccrRoute.releaseAbsent)
server.post('/api/client-copy-requests/:requestId/meetings/:meetingId/correction',
  firmAuth, ccrRoute.attachCorrection)
server.post('/api/client-copy-requests/:requestId/meetings/:meetingId/delete',
  firmAuth, ccrRoute.deleteMeetingText)

// Screen E — what the advisor is told about their own meeting. `firmAuth` only, and the
// handler guards on `req.advisorId` as well: P2 gives a recording and its notices to the
// advisor who made it.
server.get('/api/meeting/recordings/:meetingId/client-notices',
  firmAuth, ccrRoute.meetingNotices)

// Share a prompt — Lane A (item 4.31, steps 1–3). Checks a pasted prompt and stores
// nothing. That route is deliberately incapable of writing anywhere; Lane B below is a
// separate file so this one's promise stays true.
server.post('/api/firm-manager/prompt-check', ...fmGuard, promptCheckRoute.check)

// Lane B (item 4.31) — a level's own material. Pushed down and in force at the levels
// below, where it may be edited, switched off, or held against a later change from above.
server.get('/api/firm-manager/prompt-contributions', ...fmGuard, promptContributionsRoute.list)
server.post('/api/firm-manager/prompt-contributions', ...fmGuard, promptContributionsRoute.add)
server.get('/api/firm-manager/prompt-contributions/history', ...fmGuard, promptContributionsRoute.history)
server.post('/api/firm-manager/prompt-contributions/restore', ...fmGuard, promptContributionsRoute.restore)
server.put('/api/firm-manager/prompt-contributions/:id', ...fmGuard, promptContributionsRoute.update)
server.post('/api/firm-manager/prompt-contributions/:id/off', ...fmGuard, promptContributionsRoute.setOff)
server.post('/api/firm-manager/prompt-contributions/:id/adopt', ...fmGuard, promptContributionsRoute.adopt)
server.post('/api/firm-manager/prompt-contributions/:id/keep-mine', ...fmGuard, promptContributionsRoute.keepMine)
server.get('/api/firm-manager/staircase', ...fmGuard, fm.getStaircase)
server.post('/api/firm-manager/staircase', ...fmGuard, fm.saveStaircase)
// The staircase cascade — one decision per request, mirroring the distinction routes
// above (2026-07-31, the staircase joining the one firm-editable mechanism).
server.put('/api/firm-manager/staircase/platform/:id', ...fmGuard, fm.setStaircaseOverride)
server.del('/api/firm-manager/staircase/platform/:id', ...fmGuard, fm.resetStaircaseOverride)
server.put('/api/firm-manager/staircase/platform/:id/decline', ...fmGuard, fm.setStaircaseDecline)
// Phase 3 — keep the firm's version of a step the platform has since changed. The
// Adopt half of that choice is the reset route above, which needs no second endpoint.
server.post('/api/firm-manager/staircase/platform/:id/keep-mine', ...fmGuard, fm.keepMineStaircaseStep)
server.post('/api/firm-manager/staircase/own', ...fmGuard, fm.addOwnStaircaseStep)
server.put('/api/firm-manager/staircase/own/:id', ...fmGuard, fm.updateOwnStaircaseStep)
server.del('/api/firm-manager/staircase/own/:id', ...fmGuard, fm.deleteOwnStaircaseStep)
// 🔴 The coaching-reference cascade (item 4.9) was REMOVED on 2026-08-20 with the
// fifteen platform rows it served — item 4.24, Mike's Option D. What was worth keeping
// in those rows was folded into the logic trees that superseded them; the tab went with
// them on his instruction. The firm's PROMOTED CASE OBSERVATIONS are a different
// mechanism under a different key and are untouched — see server/utils/coaching.js.
server.get('/api/firm-manager/quizzes', ...fmGuard, fm.getQuizzes)
server.post('/api/firm-manager/quizzes', ...fmGuard, fm.saveQuizzes)
// The quiz cascade — one decision per request about ONE question, mirroring the
// staircase routes above (2026-07-31 Phase 3).
server.put('/api/firm-manager/quizzes/platform/:qid', ...fmGuard, fm.setQuizOverride)
server.del('/api/firm-manager/quizzes/platform/:qid', ...fmGuard, fm.resetQuizOverride)
server.put('/api/firm-manager/quizzes/platform/:qid/decline', ...fmGuard, fm.setQuizDecline)
// Phase 4 — keep the firm's version of a question Advisor-e has since changed. The
// Adopt half of that choice is the reset route above, which needs no second endpoint.
server.post('/api/firm-manager/quizzes/platform/:qid/keep-mine', ...fmGuard, fm.keepMineQuizQuestion)
server.post('/api/firm-manager/quizzes/own', ...fmGuard, fm.addOwnQuizQuestion)
server.put('/api/firm-manager/quizzes/own/:id', ...fmGuard, fm.updateOwnQuizQuestion)
server.del('/api/firm-manager/quizzes/own/:id', ...fmGuard, fm.deleteOwnQuizQuestion)
server.get('/api/firm-manager/domain-support', ...fmGuard, fm.getDomainSupport)
server.get('/api/firm-manager/domain-support/:domainId', ...fmGuard, fm.getDomainSupportDetail)
server.post('/api/firm-manager/domain-support/:domainId', ...fmGuard, fm.saveDomainSupport)
server.del('/api/firm-manager/domain-support/:domainId', ...fmGuard, fm.resetDomainSupport)
server.get('/api/firm-manager/domain-support/:domainId/history', ...fmGuard, fm.getDomainSupportHistory)
server.post('/api/firm-manager/domain-support/:domainId/restore', ...fmGuard, fm.restoreDomainSupport)
// Display-only re-file into another master section (firm-scoped; AI unaffected).
server.post('/api/firm-manager/domain-support/:domainId/section', ...fmGuard, fm.setDomainSupportSection)
// The thirteen method guides (item 4.16 F, 2026-08-17). Same guard as the domain
// support routes above, deliberately: the guide opens from a framework row on that
// tab and Mike ruled it visible to the same tiers as the table around it, so there
// is no second list of tier names here that could drift away from that one.
server.get('/api/firm-manager/method-guides', ...fmGuard, fm.getMethodGuides)
server.get('/api/firm-manager/method-guides/:guideId', ...fmGuard, fm.getMethodGuideDetail)
server.post('/api/firm-manager/method-guides/:guideId', ...fmGuard, fm.saveMethodGuide)
server.del('/api/firm-manager/method-guides/:guideId', ...fmGuard, fm.resetMethodGuide)
server.get('/api/firm-manager/method-guides/:guideId/history', ...fmGuard, fm.getMethodGuideHistory)
// Logic Tables (FIRM-EDITABLE-TABLES-PLAN.md Phase 3). Slice A: read; Slice B:
// save/reset/history on the single `logic-trees` bundle the advisor engine reads
// (firm-authored branch text is fenced in logicTrees.formatLogicTreeForPrompt).
server.get('/api/firm-manager/logic-trees', ...fmGuard, fm.getLogicTrees)
// Read-only phrase probe + trigger-change preview (design/ACTIONS.md →
// trigger-vocabulary-sweep). Neither writes anything. `probe` is registered
// BEFORE the `:treeId` routes deliberately: it is a literal segment sitting in
// the same position as a tree id, so a firm can never own a table called
// "probe" that shadows it.
server.post('/api/firm-manager/logic-trees/probe', ...fmGuard, fm.probeLogicTreePhrase)
server.get('/api/firm-manager/logic-trees/:treeId', ...fmGuard, fm.getLogicTreeDetail)
server.post('/api/firm-manager/logic-trees/:treeId/preview-triggers', ...fmGuard, fm.previewLogicTreeTriggers)
server.post('/api/firm-manager/logic-trees/:treeId', ...fmGuard, fm.saveLogicTree)
server.del('/api/firm-manager/logic-trees/:treeId', ...fmGuard, fm.resetLogicTree)
server.get('/api/firm-manager/logic-trees/:treeId/history', ...fmGuard, fm.getLogicTreeHistory)
server.post('/api/firm-manager/logic-trees/:treeId/section', ...fmGuard, fm.setLogicTreeSection)
// Logic-Lab — the Decision Logic page (ACTIONS #logic-lab-decision-logic-build;
// the spec is design/mockups/decision-logic-map-mockup.html). The first three are
// READ-ONLY: they explain the firm's own configuration and what the engine does
// with a sentence. The page's Move/Copy actions reuse the existing distinction
// routes above rather than growing write paths of their own.
server.get('/api/firm-manager/logic-lab/summary', ...fmGuard, fm.getLogicLabSummary)
server.get('/api/firm-manager/logic-lab/templates', ...fmGuard, fm.getLogicLabTemplateTitles)
server.post('/api/firm-manager/logic-lab/diagnose', ...fmGuard, fm.diagnoseDecision)
// The one route here that WRITES (ACTIONS #logic-lab-accept-and-push; the spec is
// design/LOGIC-LAB-ACCEPT-AND-PUSH.md). It attaches the template the firm expected
// to the distinction that already matched — the single fully-determined idea the
// page offers — and records the accepted idea in the same handler, so a change to
// live template selection can never be made without leaving a trace.
server.post('/api/firm-manager/logic-lab/accept', ...fmGuard, fm.acceptLogicLabIdea)
// Manager case-review feed: the firm's shared case studies (with their decision
// traces) for review. Manager-gated + firm-scoped; private cases never surface.
server.get('/api/firm-manager/cases', ...fmGuard, casesRoute.listFirmCases)
// Mentor-share: (part 2) anonymise a firm-shared case for the manager to preview;
// (part 3) approve+persist the share, or withdraw it. Manager-gated, firm-scoped.
server.post('/api/firm-manager/cases/:id/anonymise-preview', ...fmGuard, casesRoute.anonymiseCasePreview)
server.post('/api/firm-manager/cases/:id/share-with-mentor', ...fmGuard, casesRoute.shareCaseWithMentor)
server.del('/api/firm-manager/cases/:id/share-with-mentor', ...fmGuard, casesRoute.withdrawCaseFromMentor)

// ── Cross-firm reports (every managing tier above a firm) ──
// 🔴 THESE THREE MOVED OFF requireMentorRole ON 2026-08-11, and the reason is not a
// widening. AUTH.mentorRole and AUTH.adminRole are the SAME value ('platform_admin')
// while Advisor-e issues no mentor role, so a role check cannot tell the mentor from
// a middle tier holding that value — and the dev sign-ins for the two new hubs hold
// exactly it. Under the old guard those three reports handed a single group's screen
// every brand's data. requireManagingTier reads the RESOLVED SCOPE instead, and each
// handler filters its rows to the firms beneath that scope. Two controls: this one
// decides who may ask, the filter decides what comes back.
//
// A firm manager and an advisor are refused here exactly as before.
//
// The one read that crosses the firm boundary — only mentor-approved, anonymised
// cases, and only those from the caller's own channel.
server.get('/api/mentor/cases', firmAuth, requireManagingTier, mentorRoute.listMentorCases)

// ── Adoption (mentor) ──
// The THIRD read that deliberately crosses the firm boundary. Counts only — how
// many advisers, how many sessions, how recently — enforced at the boundary by
// mentorAdoption.assertNoPersonalFields, which throws rather than filtering. It
// REPLACES Team Progress at mentor level rather than widening it: that tab lists a
// firm's advisers BY NAME, which is a firm manager's view of their own people.
// Design: design/mockups/mentor-adoption-view.html (ruled by Mike 2026-08-09).
server.get('/api/mentor/adoption', firmAuth, requireManagingTier, mentorRoute.getAdoption)

// Mentor Advisory Distinctions — the cascade ORIGIN (DISTINCTIONS-CASCADE-PLAN.md §6).
// The mentor authors the platform set every firm receives as its default; plain CRUD
// (no decline/override at this tier). Global scope — handlers never read req.firmId.
const mentorGuard = [firmAuth, requireMentorRole]
// The benchmarker's release is one national table, replaced each year: the MENTOR uploads it
// and it is stored at the platform scope. No tier below has a different Stats NZ.
server.get('/api/firm-manager/benchmarker', ...mentorGuard, benchmarkerRoute.summary)
server.post('/api/firm-manager/benchmarker', ...mentorGuard, benchmarkerRoute.upload)
server.get('/api/firm-manager/benchmarker/history', ...mentorGuard, benchmarkerRoute.history)
server.post('/api/firm-manager/benchmarker/restore', ...mentorGuard, benchmarkerRoute.restore)
server.get('/api/mentor/distinctions', ...mentorGuard, mentorRoute.listMentorDistinctions)
server.post('/api/mentor/distinctions', ...mentorGuard, mentorRoute.createMentorDistinction)
server.put('/api/mentor/distinctions/:id', ...mentorGuard, mentorRoute.updateMentorDistinction)
server.del('/api/mentor/distinctions/:id', ...mentorGuard, mentorRoute.deleteMentorDistinction)

// ── Master template library (MENTOR ONLY — the upload doorway) ──
// SEARCH-CONTENT-CASCADE-PLAN.md Phase 1: the mentor uploads the Advisor-e master
// export here instead of a developer mirroring it into data/templates.json by hand.
// Stored INERT under the reserved platform scope — nothing reads it until Phase 2
// rewires the loader, so these routes change nothing an advisor sees today.
server.get('/api/mentor/templates', ...mentorGuard, mentorRoute.getPlatformTemplates)
server.post('/api/mentor/templates/import', ...mentorGuard, mentorRoute.importPlatformTemplates)
server.post('/api/mentor/templates/restore', ...mentorGuard, mentorRoute.restorePlatformTemplates)

// ── Master template library — the PUSH doorway (Cascade Phase 4, our half) ──
// Advisor-e posts the export here when Mike publishes. Not behind a user token:
// a shared secret (config/integration.js PUSH) guards it, and the route answers
// 404 while that secret is unset. Same validator, same platform scope, same
// history and cache clear as the mentor's upload above — one store, two doors.
const integrationTemplates = require('./routes/integrationTemplates')
server.post('/api/integration/templates', integrationTemplates.requirePushSecret, integrationTemplates.pushPlatformTemplates)

// ── Template Check (MENTOR ONLY — and it stays that way) ──
// Every tool a logic table names, checked against the templates the app can open.
// Read-only scan + the mentor's rulings; applying a ruling to a logic table is a
// separate, later step (design/MENTOR-HUB-CONSOLIDATED-NOTES.md §6).
//
// 🔴 RULED BY THE OWNER 2026-08-11, when the three reports above were opened to the
// middle tiers and this one was NOT: "template check should only be for the mentor
// since we use it to improve the overall system. it does not relate to
// people/advisor performance or group manager selection/access permission to
// templates." So it keeps requireMentorRole, and the tab was removed from the two
// middle hubs — TAB_TIERS in components/FirmManagerHub.vue, pinned by
// tests/unit/hubTabTiers.test.js. It is also the one report with no firm dimension
// to scope: it scans the shared catalogue, not anybody's data.
server.get('/api/mentor/template-check', ...mentorGuard, mentorRoute.getTemplateCheck)
// What "Apply it" leads to: the exact edits the applied rulings add up to, each
// classified. It RETURNS the patch and never writes it — ruled by Mike 2026-08-09,
// because a stored override would fence the table in the AI prompt and go stale,
// and because this same fix has twice been made as a reviewed commit already.
server.get('/api/mentor/template-check/patch', ...mentorGuard, mentorRoute.getTemplateCheckPatch)
server.put('/api/mentor/template-check/rulings/:key', ...mentorGuard, mentorRoute.saveTemplateCheckRuling)
server.del('/api/mentor/template-check/rulings/:key', ...mentorGuard, mentorRoute.deleteTemplateCheckRuling)

// ── Logic Lab Report (mentor) ──
// The second read that deliberately crosses the firm boundary. Configuration and
// counts only — no client name, no advisor name, no session text — enforced at the
// boundary by mentorLogicLabReport.assertNoPersonalFields, which throws rather
// than filtering. Artefact: design/mockups/mentor-logic-lab-report-mockup.html.
server.get('/api/mentor/logic-lab-report', firmAuth, requireManagingTier, mentorRoute.getLogicLabReport)

// ── Collaborate: template catalogue + people layer ──
// Merged in 2026-08-01 from the standalone Collaborate app, which ran its OWN
// Restify server on this same port — so the two could never have run together.
// Identity comes from collaborateAuth (the same verified token as firmAuth; see
// server/middleware/firmAuth.js for why the two dev doors stay separate).
//
// SCOPE NOTE (COLLABORATE-MERGE-PLAN.md §4.4): these routes already resolve the
// caller's TIER server-side rather than assuming a firm is the top level, which is
// the model this repo's own Hub tabs still have to be widened to. Nothing here
// should be narrowed to a bare firmId to match them.
const ca = collaborateAuth
server.get('/api/templates', ca, templatesRoute.list)

server.get('/api/people/me', ca, peopleRoute.getMe)
server.put('/api/people/me', ca, peopleRoute.updateMe)
server.get('/api/people/advisors', ca, peopleRoute.listAdvisors)
server.get('/api/people/advisors/:id', ca, peopleRoute.getAdvisor)
server.get('/api/people/groups', ca, peopleRoute.listGroups)
server.post('/api/people/groups', ca, peopleRoute.createGroup)
server.get('/api/people/my-groups', ca, peopleRoute.listMyGroups)
server.get('/api/people/groups/:id', ca, peopleRoute.getGroup)
server.post('/api/people/groups/:id/join', ca, peopleRoute.joinGroup)
server.get('/api/people/groups/:id/requests', ca, peopleRoute.listGroupRequests)
server.post('/api/people/group-requests/:id/accept', ca, peopleRoute.acceptGroupRequest)
server.post('/api/people/group-requests/:id/decline', ca, peopleRoute.declineGroupRequest)
server.post('/api/people/groups/:id/shared-pages', ca, peopleRoute.addSharedPage)
server.del('/api/people/groups/:id/shared-pages/:pageId', ca, peopleRoute.removeSharedPage)
server.post('/api/people/groups/:id/message', ca, peopleRoute.messageGroup)
server.post('/api/people/groups/:id/chat', ca, peopleRoute.openGroupChat)
server.post('/api/people/groups/:id/invite', ca, peopleRoute.inviteToGroup)
server.post('/api/people/groups/:id/invite-many', ca, peopleRoute.inviteManyToGroup)
server.post('/api/people/invitations/:id/accept', ca, peopleRoute.acceptInvitation)
server.post('/api/people/invitations/:id/decline', ca, peopleRoute.declineInvitation)
server.post('/api/people/outreach', ca, peopleRoute.sendOutreach)
server.post('/api/people/advisors/:id/thread', ca, peopleRoute.messageAdvisor)
server.get('/api/people/messages', ca, peopleRoute.listMessages)
server.get('/api/people/messages/:id', ca, peopleRoute.getThread)
server.post('/api/people/messages/:id/reply', ca, peopleRoute.replyThread)
server.post('/api/people/messages/:id/shared-pages', ca, peopleRoute.addThreadSharedPage)
server.del('/api/people/messages/:id/shared-pages/:pageId', ca, peopleRoute.removeThreadSharedPage)
server.get('/api/people/connections', ca, peopleRoute.listConnections)
server.get('/api/people/connecting', ca, peopleRoute.listConnecting)
server.post('/api/people/advisors/:id/connect', ca, peopleRoute.connect)
server.post('/api/people/connections/:id/accept', ca, peopleRoute.acceptConnection)
server.post('/api/people/connections/:id/decline', ca, peopleRoute.declineConnection)
server.get('/api/people/notifications', ca, peopleRoute.listNotifications)
server.post('/api/people/notifications/read', ca, peopleRoute.markNotificationsRead)
// Audit trail (admin/compliance). Admin-gated (Mentor super-admin) in the route;
// the /preview variant is dev-only (refused unless ALLOW_DEV_AUTH) for the show-home.
server.get('/api/people/audit', ca, peopleRoute.getAuditLog)
server.get('/api/people/audit/preview', ca, peopleRoute.getAuditLogPreview)
// Firm Manager console (RBAC SEAM: manager-gated in the repository). This is the
// screen that becomes a Firm Manager Hub tab in the next slice of the merge.
server.get('/api/people/firm', ca, peopleRoute.getFirmConsole)
server.post('/api/people/firm/posture', ca, peopleRoute.setFirmPosture)
// View-as: a manager assumes an adviser's view (gated + re-checked server-side).
server.post('/api/people/firm/view-as', ca, peopleRoute.startViewAs)
server.del('/api/people/firm/view-as', ca, peopleRoute.exitViewAs)
// Lazy per-branch adviser loader for the console tree (PERF-CONSOLE-TREE).
server.get('/api/people/console/advisers', ca, peopleRoute.getConsoleAdvisers)
// Console previews (show-home only; the handler refuses unless ALLOW_DEV_AUTH).
server.get('/api/people/console/preview/:tier', ca, peopleRoute.getConsolePreview)
server.get('/api/people/console/preview/:tier/advisers', ca, peopleRoute.getConsoleAdvisersPreview)
server.get('/api/people/marketplace', ca, peopleRoute.listMarketplace)
server.post('/api/people/marketplace', ca, peopleRoute.createListing)
server.get('/api/people/marketplace/:id', ca, peopleRoute.getListing)
server.post('/api/people/marketplace/:id/purchase', ca, peopleRoute.purchaseListing)

// Dev-only demo audit trail so the show-home audit viewer (FEAT-AUDIT-UI) has
// content on a fresh boot. Real entries accrue as the app is used; these seed a
// realistic mix (incl. security events). Never runs outside dev (ALLOW_DEV_AUTH).
;(function seedDemoAudit () {
  if (process.env.ALLOW_DEV_AUTH !== 'true') { return }
  const audit = require('./collaborate/data/auditLog')
  ;[
    { actorId: 'me', action: 'profile.update', targetType: 'advisor', targetId: 'me', meta: { fields: ['about'] } },
    { actorId: 'anna-r', action: 'group.create', targetType: 'group', targetId: 'seafood-modelling' },
    { actorId: 'sara-okafor', action: 'connection.request', targetType: 'advisor', targetId: 'me' },
    { actorId: 'bob-lindt', action: 'outreach.blocked', targetType: 'advisor', targetId: 'me', meta: { reason: 'cross_org' } },
    { actorId: 'sofia-marchetti', action: 'listing.create', targetType: 'listing', targetId: 'm-trucking' },
    { actorId: 'me', action: 'purchase.record', targetType: 'listing', targetId: 'm-trucking' }
  ].forEach(e => audit.record(e))
}())

// ── Start ──
server.listen(PORT, HOST, () => {
  console.error(`[restify] virt-advisor-api listening on ${HOST}:${PORT}`)

  // Meeting Review P8, the other half: a firm sets how long transcripts are kept and the
  // client is SHOWN that figure before they agree, so something has to make the number true.
  // Each meeting expires against the period stored on its own record — what the client was
  // told that day — never against the firm's current dial.
  //
  // It starts here rather than at import so that requiring this file (serverWiring.test.js
  // does) never deletes anything, and it is skipped under test outright. The timer is
  // unref'd, so it cannot hold a shutting-down server open.
  if (process.env.NODE_ENV !== 'test') {
    require('./utils/meetingPurge').startSweeping()
  }
})
