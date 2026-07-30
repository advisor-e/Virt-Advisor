'use strict'

/**
 * Restify backend for Advisor-e Collaborate — runs on port 4000 (separate
 * process from Nuxt on 3000). Start: node server/restify-server.js (npm run backend).
 *
 * Locked runtime: Node 14.15 (CLAUDE.md Stack Constitution). Node 22+ breaks
 * Restify via a missing spdy binding. CommonJS only (no ESM).
 *
 * DEV NOTE: the people-layer routes currently serve in-memory mock data and are
 * unauthenticated. Real Advisory auth (firmAuth/JWT) + MySQL persistence wire in
 * later — see design/advisor-collaboration-platform-plan.md §12.
 */

;(function checkNodeVersion () {
  const major = Number(process.version.slice(1).split('.')[0])
  if (major >= 22) {
    process.stderr.write(
      '\n[STARTUP ERROR] Node ' + process.version + ' is not supported (Restify needs < 22). Use Node 14.15.\n\n'
    )
    process.exit(1)
  }
  if (major !== 14) {
    process.stderr.write(
      '\n[WARNING] Node ' + process.version + ' is not the locked runtime (Node 14.15).\n\n'
    )
  }
}())

const restify = require('restify')
const { AUTH, DB } = require('../../config/collaborate/integration')
const { productionStartupViolations } = require('./utils/productionGuard')
const health = require('./routes/health')
const translate = require('./routes/translate')
const people = require('./routes/people')
const templates = require('./routes/templates')
const { auth } = require('./middleware/auth')
const pool = require('./utils/db')

// Production startup guard (design/ACTIONS.md P1-PROD-GUARD): refuse to boot in
// production while dev-auth is on or secrets are still placeholders. No-op in
// dev/test. The check lives in a pure, tested util; here we act on its result.
;(function checkProductionSafety () {
  const violations = productionStartupViolations(process.env, { AUTH, DB })
  if (violations.length) {
    process.stderr.write(
      '\n[STARTUP ERROR] Refusing to boot in production — insecure configuration:\n' +
      violations.map(v => '  - ' + v).join('\n') + '\n\n'
    )
    process.exit(1)
  }
}())

const PORT = process.env.BACKEND_PORT || 4000

const server = restify.createServer({ name: 'advisor-collaborate-api', version: '1.0.0' })

// jsonBodyParser returns an ARRAY of handlers in Restify 9 — register each.
const jsonParsers = restify.plugins.jsonBodyParser({ mapParams: false })
;(Array.isArray(jsonParsers) ? jsonParsers : [jsonParsers]).forEach(function (fn) { server.use(fn) })
server.use(restify.plugins.queryParser())

// CORS — allow the Nuxt frontend on localhost during development.
server.use((req, res, next) => {
  const origin = req.headers.origin || ''
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) {
    res.header('Access-Control-Allow-Origin', origin)
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  return next()
})
server.opts('/*', (req, res, next) => { res.send(204); return next() })

// ── Routes ──
server.get('/api/health', health.get)
server.post('/api/translate/locale', translate.post)

// Advisor-e template catalogue (read-only master data) — feeds the marketplace
// "Choose the Advisor-e tool" picker. See server/data/advisoryTemplates.js.
server.get('/api/templates', auth, templates.list)

// People layer — identity comes from the Advisory session (auth middleware).
// In dev (ALLOW_DEV_AUTH=true) auth falls back to a dev identity; data is still
// the in-memory mock until MySQL is provisioned.
server.get('/api/people/me', auth, people.getMe)
server.put('/api/people/me', auth, people.updateMe)
server.get('/api/people/advisors', auth, people.listAdvisors)
server.get('/api/people/advisors/:id', auth, people.getAdvisor)
server.get('/api/people/groups', auth, people.listGroups)
server.post('/api/people/groups', auth, people.createGroup)
server.get('/api/people/my-groups', auth, people.listMyGroups)
server.get('/api/people/groups/:id', auth, people.getGroup)
server.post('/api/people/groups/:id/join', auth, people.joinGroup)
server.get('/api/people/groups/:id/requests', auth, people.listGroupRequests)
server.post('/api/people/group-requests/:id/accept', auth, people.acceptGroupRequest)
server.post('/api/people/group-requests/:id/decline', auth, people.declineGroupRequest)
server.post('/api/people/groups/:id/shared-pages', auth, people.addSharedPage)
server.del('/api/people/groups/:id/shared-pages/:pageId', auth, people.removeSharedPage)
server.post('/api/people/groups/:id/message', auth, people.messageGroup)
server.post('/api/people/groups/:id/chat', auth, people.openGroupChat)
server.post('/api/people/groups/:id/invite', auth, people.inviteToGroup)
server.post('/api/people/groups/:id/invite-many', auth, people.inviteManyToGroup)
server.post('/api/people/invitations/:id/accept', auth, people.acceptInvitation)
server.post('/api/people/invitations/:id/decline', auth, people.declineInvitation)
server.post('/api/people/outreach', auth, people.sendOutreach)
server.post('/api/people/advisors/:id/thread', auth, people.messageAdvisor)
server.get('/api/people/messages', auth, people.listMessages)
server.get('/api/people/messages/:id', auth, people.getThread)
server.post('/api/people/messages/:id/reply', auth, people.replyThread)
server.post('/api/people/messages/:id/shared-pages', auth, people.addThreadSharedPage)
server.del('/api/people/messages/:id/shared-pages/:pageId', auth, people.removeThreadSharedPage)
server.get('/api/people/connections', auth, people.listConnections)
server.get('/api/people/connecting', auth, people.listConnecting)
server.post('/api/people/advisors/:id/connect', auth, people.connect)
server.post('/api/people/connections/:id/accept', auth, people.acceptConnection)
server.post('/api/people/connections/:id/decline', auth, people.declineConnection)
server.get('/api/people/notifications', auth, people.listNotifications)
server.post('/api/people/notifications/read', auth, people.markNotificationsRead)
// Audit trail (admin/compliance). Admin-gated (Mentor super-admin) in the route;
// the /preview variant is dev-only (refused unless ALLOW_DEV_AUTH) for the show-home.
server.get('/api/people/audit', auth, people.getAuditLog)
server.get('/api/people/audit/preview', auth, people.getAuditLogPreview)
// Firm Manager console (RBAC SEAM: manager-gated in the repository).
server.get('/api/people/firm', auth, people.getFirmConsole)
server.post('/api/people/firm/posture', auth, people.setFirmPosture)
// View-as: a manager assumes an adviser's view (gated + re-checked server-side).
server.post('/api/people/firm/view-as', auth, people.startViewAs)
server.del('/api/people/firm/view-as', auth, people.exitViewAs)
// Lazy per-branch adviser loader for the console tree (PERF-CONSOLE-TREE).
server.get('/api/people/console/advisers', auth, people.getConsoleAdvisers)
// Console previews (show-home only; the handler refuses unless ALLOW_DEV_AUTH).
server.get('/api/people/console/preview/:tier', auth, people.getConsolePreview)
server.get('/api/people/console/preview/:tier/advisers', auth, people.getConsoleAdvisersPreview)
server.get('/api/people/marketplace', auth, people.listMarketplace)
server.post('/api/people/marketplace', auth, people.createListing)
server.get('/api/people/marketplace/:id', auth, people.getListing)
server.post('/api/people/marketplace/:id/purchase', auth, people.purchaseListing)

// Dev-only demo audit trail so the show-home audit viewer (FEAT-AUDIT-UI) has
// content on a fresh boot. Real entries accrue as the app is used; these seed a
// realistic mix (incl. security events). Never runs outside dev (ALLOW_DEV_AUTH).
;(function seedDemoAudit () {
  if (process.env.ALLOW_DEV_AUTH !== 'true') { return }
  const audit = require('./data/auditLog')
  ;[
    { actorId: 'me', action: 'profile.update', targetType: 'advisor', targetId: 'me', meta: { fields: ['about'] } },
    { actorId: 'anna-r', action: 'group.create', targetType: 'group', targetId: 'seafood-modelling' },
    { actorId: 'sara-okafor', action: 'connection.request', targetType: 'advisor', targetId: 'me' },
    { actorId: 'bob-lindt', action: 'outreach.blocked', targetType: 'advisor', targetId: 'me', meta: { reason: 'cross_org' } },
    { actorId: 'sofia-marchetti', action: 'listing.create', targetType: 'listing', targetId: 'm-trucking' },
    { actorId: 'me', action: 'purchase.record', targetType: 'listing', targetId: 'm-trucking' }
  ].forEach(e => audit.record(e))
}())

server.listen(PORT, () => {
  console.error('[restify] advisor-collaborate-api listening on port ' + PORT)
  // Non-fatal DB probe: confirm MySQL, or fall back to the in-memory dev store.
  pool.query('SELECT 1')
    .then(() => console.error('[db] MySQL connected (' + DB.database + ')'))
    .catch(e => console.error('[db] MySQL unavailable — using in-memory dev store (' + (e && e.code ? e.code : e.message) + ')'))
})
