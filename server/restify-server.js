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
const currencyRoute = require('./routes/currency')
const propertyTaxRulesRoute = require('./routes/propertyTaxRules')
const aiPromptsRoute = require('./routes/aiPrompts')
const staircaseRoute = require('./routes/staircase')
const { firmAuth, collaborateAuth, requireManagerRole, requireMentorRole, requireManagingTier } = require('./middleware/firmAuth')
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
// The firm's Advisory Staircase wording for the in-session selector. READ open to
// any firm user (every advisor is asked the staircase question); the WRITE lives on
// the manager-only /api/firm-manager/staircase. Same blend the engine uses.
server.get('/api/advisor/staircase', firmAuth, staircaseRoute.get)
server.post('/api/course', firmAuth, courseEngine)
server.post('/api/report/working-capital-cycle', reportRoute.workingCapitalCycle)
server.post('/api/report/debtor-drag', reportRoute.debtorDrag)
server.post('/api/report/margin-breakeven', reportRoute.marginBreakeven)
server.post('/api/report/eight-levers', reportRoute.eightLevers)
server.post('/api/report/quick-position', reportRoute.quickPosition)
server.post('/api/report/ebitda-dcf', reportRoute.ebitdaDcf)
server.post('/api/report/loan-estimator', reportRoute.loanEstimator)
server.post('/api/report/lease-vs-buy', reportRoute.leaseVsBuy)
server.post('/api/report/cost-of-capital', reportRoute.costOfCapital)
server.post('/api/report/multiple-property', reportRoute.multipleProperty)
// firmAuth deliberately ON for the intake (unlike the calc-only report routes): it accepts file uploads
server.post('/api/report/quick-position/intake', firmAuth, reportRoute.quickPositionIntake)
server.post('/api/report/ebitda-dcf/intake', firmAuth, reportRoute.ebitdaDcfIntake)
// Firm preferred currency: READ open to any firm user (reports render for advisors);
// WRITE managers only (account-wide setting). Persistence via firmOverlay (config_key 'currency').
server.get('/api/report/currency', firmAuth, currencyRoute.get)
server.post('/api/report/currency', firmAuth, requireManagerRole, currencyRoute.set)
// The property model's tax rules, resolved through the tier chain. READ open to any
// signed-in user — every advisor opening the Multiple Property Assessment needs it, and
// they may type over any of it for the client in front of them (Mike, 2026-08-17). The
// WRITE lives on the manager-only /api/firm-manager route below.
server.get('/api/report/property-tax-rules', firmAuth, propertyTaxRulesRoute.get)
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
// The property model's tax rules — a GROUP (normally a country) sets them and a FIRM may
// correct them (Mike, 2026-08-17, §8 Q6). One set of routes for every tier: the scope is
// `req.firmId` from the verified JWT, never an id from the request.
server.get('/api/firm-manager/property-tax-rules', ...fmGuard, propertyTaxRulesRoute.getForManager)
server.post('/api/firm-manager/property-tax-rules', ...fmGuard, propertyTaxRulesRoute.save)
server.get('/api/firm-manager/property-tax-rules/history', ...fmGuard, propertyTaxRulesRoute.history)
server.post('/api/firm-manager/property-tax-rules/restore', ...fmGuard, propertyTaxRulesRoute.restore)
// The instructions the AI is given when it builds a model, and the three settings a
// manager may change on them (Mike, 2026-08-21). Same shape and same guard as the tax
// rules above: one set of routes for every tier, scoped to `req.firmId` from the verified
// JWT and never to an id in the request. design/AI-PROMPTS-PAGE.md.
server.get('/api/firm-manager/ai-prompts', ...fmGuard, aiPromptsRoute.getForManager)
server.post('/api/firm-manager/ai-prompts', ...fmGuard, aiPromptsRoute.save)
server.get('/api/firm-manager/ai-prompts/history', ...fmGuard, aiPromptsRoute.history)
server.post('/api/firm-manager/ai-prompts/restore', ...fmGuard, aiPromptsRoute.restore)
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
server.get('/api/mentor/distinctions', ...mentorGuard, mentorRoute.listMentorDistinctions)
server.post('/api/mentor/distinctions', ...mentorGuard, mentorRoute.createMentorDistinction)
server.put('/api/mentor/distinctions/:id', ...mentorGuard, mentorRoute.updateMentorDistinction)
server.del('/api/mentor/distinctions/:id', ...mentorGuard, mentorRoute.deleteMentorDistinction)

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
})
