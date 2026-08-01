'use strict'

/**
 * People-layer routes — thin HTTP handlers over server/data/repository.js.
 *
 * Identity comes from req.identity (set by server/middleware/auth.js), never the
 * request body. All data access goes through the repository, which is the single
 * seam for connecting MySQL (see server/data/repository.js).
 *
 * NOTE: these are async handlers. Restify 9 requires async handlers to take
 * (req, res) only — it advances the chain when the promise resolves. Do NOT add
 * a `next` argument here (that triggers a startup assertion).
 */

const repo = require('../data/repository')
const templates = require('../data/advisoryTemplates')
const ipClass = require('../data/ipClassification')
const audit = require('../data/auditLog')
const { OUTREACH, INVITE } = require('../../../config/integration')
const { sendApiError } = require('../utils/sendError')

function ok (res, data) { res.send(200, data) }
// Standard error envelope (incl. the mandated timestamp) — see server/utils/sendError.js.
function fail (res, status, code, message) { sendApiError(res, status, code, message) }

// The REAL signed-in advisor id (never the view-as target). The auth middleware
// sets req.identity from the token/dev; only currentAdvisor() applies view-as, so
// this always yields the true caller — safe to authorise a view-as against.
function realAdvisorId (req) {
  return (req.identity && req.identity.advisorId) || 'me'
}

// Read a cookie value from the request header.
function readCookie (req, name) {
  const raw = (req.headers && req.headers.cookie) || ''
  const m = raw.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : null
}

// A firm manager "viewing as" one of their advisers. Returns { realId, realName,
// target } when a VALID view-as is active, else null.
//
// SECURITY: this is re-checked on EVERY request (currentAdvisor calls it), so the
// button is never the gate — a tampered cookie, a cross-firm id, a non-manager, or
// an adviser who has since switched on "Block firm manager view" all resolve to
// null and the caller silently reverts to their own identity. See SEC-THREAD-ACL /
// design/ACTIONS.md for the parallel message-ACL seam.
async function viewAsContext (req) {
  const realId = realAdvisorId(req)
  const asId = readCookie(req, 'viewAs')
  if (!asId || asId === realId) { return null }
  const manager = await repo.getAdvisorById(realId)
  if (!manager || !repo.isManager(realId)) { return null }
  const target = await repo.getAdvisorById(asId)
  // A manager may view-as only within their own scope (roles.canManage: firm for a
  // Firm Manager, country for a Group Manager, all for Global/Mentor) — Q-ROLES. And
  // only an ADVISER, never another manager/admin: otherwise a manager could assume a
  // more-senior colleague who happens to sit in their scope and inherit admin gates
  // (they run on the effective/impersonated identity). Security hardening 2026-07-07.
  if (!target || !repo.canManage(manager, target) || repo.isManager(target.id) || target.blockFirmManagerView) { return null }
  return { realId, realName: manager.name, target }
}

// Resolve the EFFECTIVE advisor for the request: the view-as target when a manager
// is validly viewing as them, otherwise the real signed-in advisor (dev = 'me').
async function currentAdvisor (req) {
  const ctx = await viewAsContext(req)
  if (ctx) { return ctx.target }
  const id = realAdvisorId(req)
  return (await repo.getAdvisorById(id)) || { id, name: 'You', firm: 'Advisor-e' }
}

async function getMe (req, res) {
  const ctx = await viewAsContext(req)
  const me = ctx ? ctx.target : await currentAdvisor(req)
  // When viewing-as, tell the frontend so it can show the persistent banner.
  const viewingAs = ctx ? { realName: ctx.realName, asName: ctx.target.name, asId: ctx.target.id } : null
  ok(res, Object.assign({}, me, { crossOrgPosture: await repo.getOrgPosture(me.firm), viewingAs }))
}

// Start viewing as one of the manager's advisers. Validates against the REAL
// caller (a firm manager, same firm, target hasn't blocked) then sets the viewAs
// cookie; every subsequent request re-validates in viewAsContext.
async function startViewAs (req, res) {
  const realId = realAdvisorId(req)
  const manager = await repo.getAdvisorById(realId)
  if (!manager || !repo.isManager(realId)) { fail(res, 403, 'NOT_MANAGER', 'Only a firm manager can view as an adviser.'); return }
  const asId = (req.body || {}).advisorId
  const target = await repo.getAdvisorById(asId)
  // Scope check (Q-ROLES): a manager may only view-as someone within their branch.
  if (!target || !repo.canManage(manager, target)) { fail(res, 404, 'NOT_FOUND', 'That adviser is not in your firm.'); return }
  if (target.id === realId) { fail(res, 400, 'SELF', "That's your own account."); return }
  // View-as is for advisers only — never another manager/admin (privilege-escalation guard).
  if (repo.isManager(target.id)) { fail(res, 403, 'NOT_ADVISER', 'You can only view as an adviser, not another manager.'); return }
  if (target.blockFirmManagerView) { fail(res, 403, 'BLOCKED', 'This adviser has blocked the firm manager view.'); return }
  res.setHeader('Set-Cookie', 'viewAs=' + encodeURIComponent(target.id) + '; Path=/; SameSite=Lax; HttpOnly')
  audit.record({ actorId: realId, action: 'firm.view_as_start', targetType: 'advisor', targetId: target.id })
  ok(res, { success: true, asId: target.id, asName: target.name })
}

// Stop viewing-as: clear the cookie. Returns to the manager's own view.
// eslint-disable-next-line require-await -- async signature required by the Restify 9 handler contract
async function exitViewAs (req, res) {
  res.setHeader('Set-Cookie', 'viewAs=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly')
  audit.record({ actorId: realAdvisorId(req), action: 'firm.view_as_exit' })
  ok(res, { success: true })
}

async function updateMe (req, res) {
  const me = await currentAdvisor(req)
  const updated = await repo.updateAdvisorInterest(me.id, req.body || {})
  const result = updated || me
  audit.record({ actorId: me.id, action: 'profile.update', targetType: 'advisor', targetId: me.id, meta: { fields: Object.keys(req.body || {}) } })
  ok(res, Object.assign({}, result, { crossOrgPosture: await repo.getOrgPosture(result.firm) }))
}

async function listAdvisors (req, res) {
  const q = (req.query && req.query.q) || ''
  const availableOnly = req.query && (req.query.available === 'true' || req.query.available === '1')
  const me = await currentAdvisor(req)
  ok(res, await repo.listAdvisors({ q, availableOnly, excludeId: me.id, myId: me.id }))
}

async function getAdvisor (req, res) {
  const a = await repo.getAdvisorById(req.params.id)
  if (!a) { fail(res, 404, 'NOT_FOUND', 'Advisor not found'); return }
  const me = await currentAdvisor(req)
  // Cross-org wall: don't expose an adviser outside your organisation's reach.
  if (!(await repo.canReachAdvisor(me.id, a.id))) {
    fail(res, 403, 'CROSS_ORG_BLOCKED', 'This adviser is outside your organisation and not available for cross-firm collaboration.')
    return
  }
  ok(res, a)
}

async function listGroups (req, res) {
  const me = await currentAdvisor(req)
  ok(res, await repo.listGroups({ q: (req.query && req.query.q) || '', viewerId: me.id }))
}

async function getGroup (req, res) {
  const g = await repo.getGroupById(req.params.id)
  if (!g) { fail(res, 404, 'NOT_FOUND', 'Group not found'); return }
  const me = await currentAdvisor(req)
  // Attach the viewer's join status so the page can show Request Pending / Member.
  ok(res, Object.assign({}, g, { joinStatus: repo.groupJoinStatus(g.id, me.id) }))
}

async function createGroup (req, res) {
  const body = req.body || {}
  if (!(body.name || '').trim()) { fail(res, 400, 'MISSING_NAME', 'A group needs a name.'); return }
  const me = await currentAdvisor(req)
  const group = await repo.createGroup(body, me)
  audit.record({ actorId: me.id, action: 'group.create', targetType: 'group', targetId: group.id, meta: { name: group.name } })
  ok(res, group)
}

async function joinGroup (req, res) {
  const me = await currentAdvisor(req)
  const r = await repo.requestJoinGroup(req.params.id, me.id)
  if (!r) { fail(res, 404, 'NOT_FOUND', 'Group not found'); return }
  // Consent-based: a request is recorded; no auto-join. Owner/manager approves.
  audit.record({ actorId: me.id, action: 'group.join_request', targetType: 'group', targetId: req.params.id })
  ok(res, Object.assign({ success: true }, r))
}

// A group's pending join requests — visible only to someone who manages it.
async function listGroupRequests (req, res) {
  const me = await currentAdvisor(req)
  ok(res, { requests: await repo.listGroupJoinRequests(req.params.id, me.id) })
}

// Approve or decline a pending join request (manager only).
async function respondGroupRequest (req, res, accept) {
  const me = await currentAdvisor(req)
  const r = await repo.respondJoinRequest(me.id, req.params.id, accept)
  if (r.error === 'NOT_FOUND') { fail(res, 404, 'NOT_FOUND', 'Request not found.'); return }
  if (r.error === 'NOT_MANAGER') { fail(res, 403, 'NOT_MANAGER', 'Only a group manager can respond to join requests.'); return }
  audit.record({ actorId: me.id, action: accept ? 'group.join_approved' : 'group.join_declined', targetType: 'group', targetId: r.groupId, meta: { advisorId: r.advisorId } })
  ok(res, { success: true, status: r.status })
}
async function acceptGroupRequest (req, res) { await respondGroupRequest(req, res, true) }
async function declineGroupRequest (req, res) { await respondGroupRequest(req, res, false) }

// Attach an Advisor-e catalogue tool to a group's Shared workspace (members only).
// Collaboration only — NOT a marketplace listing (on-sell is a separate action).
async function addSharedPage (req, res) {
  const me = await currentAdvisor(req)
  const body = req.body || {}
  if (!(body.pageId || '').trim()) { fail(res, 400, 'MISSING_TOOL', 'Choose a tool to add.'); return }
  if (!(await templates.exists(body.pageId))) { fail(res, 400, 'UNKNOWN_TOOL', 'That tool is not in the Advisor-e catalogue.'); return }
  const r = await repo.addGroupSharedPage(req.params.id, me.id, body)
  if (r.error === 'GROUP_NOT_FOUND') { fail(res, 404, 'NOT_FOUND', 'Group not found.'); return }
  if (r.error === 'NOT_MEMBER') { fail(res, 403, 'NOT_MEMBER', 'Only a group member can add a tool.'); return }
  audit.record({ actorId: me.id, action: 'group.shared_page_added', targetType: 'group', targetId: req.params.id, meta: { pageId: body.pageId } })
  ok(res, { success: true, sharedPages: r.sharedPages })
}

// Detach a tool from a group's Shared workspace (members only). Removes only the
// stored reference — the Advisor-e page itself is untouched. Mirror of addSharedPage.
async function removeSharedPage (req, res) {
  const me = await currentAdvisor(req)
  const r = await repo.removeGroupSharedPage(req.params.id, me.id, req.params.pageId)
  if (r.error === 'GROUP_NOT_FOUND') { fail(res, 404, 'NOT_FOUND', 'Group not found.'); return }
  if (r.error === 'NOT_MEMBER') { fail(res, 403, 'NOT_MEMBER', 'Only a group member can remove a tool.'); return }
  audit.record({ actorId: me.id, action: 'group.shared_page_removed', targetType: 'group', targetId: req.params.id, meta: { pageId: req.params.pageId } })
  ok(res, { success: true, sharedPages: r.sharedPages })
}

// Groups the viewer can invite people into (owner/manager).
async function listMyGroups (req, res) {
  const me = await currentAdvisor(req)
  ok(res, await repo.listManageableGroups(me.id))
}

// Invite a found specialist into one of my groups. Consent-based — they accept.
async function inviteToGroup (req, res) {
  const me = await currentAdvisor(req)
  const body = req.body || {}
  const inviteeId = body.advisorId || body.toId
  if (!inviteeId) { fail(res, 400, 'MISSING_ADVISOR', 'Choose who to invite.'); return }
  const r = await repo.inviteToGroup(req.params.id, me, inviteeId, body.note)
  if (r.error === 'GROUP_NOT_FOUND') { fail(res, 404, 'NOT_FOUND', 'Group not found.'); return }
  if (r.error === 'NOT_MANAGER') { fail(res, 403, 'NOT_MANAGER', 'You can only invite into a group you manage.'); return }
  if (r.error === 'ALREADY_MEMBER') { fail(res, 409, 'ALREADY_MEMBER', 'They are already in this group.'); return }
  if (r.error === 'CROSS_ORG_BLOCKED') { fail(res, 403, 'CROSS_ORG_BLOCKED', 'This person is at an organisation outside your current reach.'); return }
  audit.record({ actorId: me.id, action: 'group.invite', targetType: 'group', targetId: req.params.id, meta: { invitee: inviteeId } })
  ok(res, r)
}

// Manager bulk-invite (FEAT-BULKINVITE): invite several advisers into one group at
// once. Each invitation is still individual + consent-based (every invitee accepts);
// already-members are skipped, not fatal. Returns a per-invitee summary.
async function inviteManyToGroup (req, res) {
  const me = await currentAdvisor(req)
  const body = req.body || {}
  const ids = Array.isArray(body.advisorIds) ? body.advisorIds : []
  if (!ids.length) { fail(res, 400, 'NO_ADVISERS', 'Choose at least one adviser to invite.'); return }
  // Guardrail: cap the batch size (an oversized/abusive array). Cross-org invitees
  // are walled per-invitee inside repo.inviteToGroup (skipped in the summary).
  if (ids.length > INVITE.bulkMax) { fail(res, 400, 'TOO_MANY', 'Too many advisers at once — invite up to ' + INVITE.bulkMax + '.'); return }
  const r = await repo.inviteManyToGroup(req.params.id, me, ids, body.note)
  if (r.error === 'GROUP_NOT_FOUND') { fail(res, 404, 'NOT_FOUND', 'Group not found.'); return }
  if (r.error === 'NOT_MANAGER') { fail(res, 403, 'NOT_MANAGER', 'You can only invite into a group you manage.'); return }
  audit.record({ actorId: me.id, action: 'group.invite_bulk', targetType: 'group', targetId: req.params.id, meta: { count: r.invited.length, skipped: r.skipped.length } })
  ok(res, r)
}

// Recipient accepts/declines a group invitation. Accept joins the group.
async function acceptInvitation (req, res) {
  const me = await currentAdvisor(req)
  const r = await repo.respondInvitation(req.params.id, me.id, true)
  if (!r) { fail(res, 404, 'NOT_FOUND', 'Invitation not found.'); return }
  audit.record({ actorId: me.id, action: 'group.invitation_accept', targetType: 'group', targetId: r.groupId })
  ok(res, r)
}

async function declineInvitation (req, res) {
  const me = await currentAdvisor(req)
  const r = await repo.respondInvitation(req.params.id, me.id, false)
  if (!r) { fail(res, 404, 'NOT_FOUND', 'Invitation not found.'); return }
  audit.record({ actorId: me.id, action: 'group.invitation_decline', targetType: 'group', targetId: r.groupId })
  ok(res, r)
}

async function messageGroup (req, res) {
  const g = await repo.getGroupById(req.params.id)
  if (!g) { fail(res, 404, 'NOT_FOUND', 'Group not found'); return }
  const text = ((req.body || {}).text || '').trim()
  if (!text) { fail(res, 400, 'EMPTY', 'Message is empty.'); return }
  const t = await repo.findOrCreateGroupThread(g)
  await repo.appendMessage(t.id, { from: 'Me', text })
  ok(res, { success: true, threadId: t.id })
}

// Open (or lazily create) the group's shared chat room without posting a
// message — backs the one-click "Open group chat" on the group page.
async function openGroupChat (req, res) {
  const g = await repo.getGroupById(req.params.id)
  if (!g) { fail(res, 404, 'NOT_FOUND', 'Group not found'); return }
  const t = await repo.findOrCreateGroupThread(g)
  ok(res, { success: true, threadId: t.id })
}

async function sendOutreach (req, res) {
  const body = req.body || {}
  // Purposeful cold-outreach: a reason ("context") is required by design.
  if (!body.toId || !body.context) { fail(res, 400, 'MISSING_REASON', 'An outreach must name a recipient and explain why you are reaching out.'); return }
  const me = await currentAdvisor(req)
  // Cross-org wall: refuse cold outreach outside your organisation's reach.
  if (!(await repo.canReachAdvisor(me.id, body.toId))) {
    audit.record({ actorId: me.id, action: 'outreach.blocked', targetType: 'advisor', targetId: body.toId, meta: { reason: 'cross_org' } })
    fail(res, 403, 'CROSS_ORG_BLOCKED', "You can only reach advisers within your own firm — cross-firm collaboration isn't open between your organisations.")
    return
  }
  // Anti-spam (plan §4): one outreach per person — direct repeats into the thread.
  if (await repo.hasOutgoingOutreach(me.id, body.toId)) {
    audit.record({ actorId: me.id, action: 'outreach.blocked', targetType: 'advisor', targetId: body.toId, meta: { reason: 'duplicate' } })
    fail(res, 409, 'ONE_OUTREACH', 'You already have an outreach with this person — continue the conversation in Messages.')
    return
  }
  const advisor = await repo.getAdvisorById(body.toId)
  // Respect availability (plan §4): don't cold-outreach someone who has marked
  // themselves unavailable. Unknown/external recipients are not gated.
  if (OUTREACH.respectAvailability && advisor && advisor.available === false) {
    audit.record({ actorId: me.id, action: 'outreach.blocked', targetType: 'advisor', targetId: body.toId, meta: { reason: 'unavailable' } })
    fail(res, 403, 'UNAVAILABLE', "This adviser isn't taking new outreach right now — try again once they're available.")
    return
  }
  // Daily rate-limit (plan §4): cap NEW cold outreaches per calendar day.
  const startOfDay = new Date().setHours(0, 0, 0, 0)
  if (await repo.countOutgoingOutreachSince(me.id, startOfDay) >= OUTREACH.dailyCap) {
    audit.record({ actorId: me.id, action: 'outreach.blocked', targetType: 'advisor', targetId: body.toId, meta: { reason: 'rate_limit' } })
    fail(res, 429, 'RATE_LIMIT', 'You have reached your daily outreach limit — please continue tomorrow.')
    return
  }
  const text = body.context + (body.ask ? '\n\n' + body.ask : '')
  const t = await repo.createOutreachThread({ toId: body.toId, toName: advisor ? advisor.name : body.toId, text, fromName: me.name })
  audit.record({ actorId: me.id, action: 'outreach.send', targetType: 'advisor', targetId: body.toId })
  ok(res, { success: true, sent: true, threadId: t.id })
}

// Open (or reuse) a direct conversation with a connection, then the frontend
// navigates to it. Frictionless — no cold-outreach reason required here.
async function messageAdvisor (req, res) {
  const me = await currentAdvisor(req)
  const other = await repo.getAdvisorById(req.params.id)
  if (!other) { fail(res, 404, 'NOT_FOUND', 'Advisor not found'); return }
  const t = await repo.findOrCreateDirectThread(me.id, { id: other.id, name: other.name })
  ok(res, { success: true, threadId: t.id })
}

async function listMessages (req, res) {
  const me = await currentAdvisor(req)
  ok(res, { threads: await repo.listThreads(me.id) })
}

async function getThread (req, res) {
  // AUTH SEAM (SEC-THREAD-ACL): before returning, verify `me` is a participant of a
  // 1:1 thread or a member of the group thread — else 403. Not enforced in the
  // single-user mock; MUST be added at real auth/MySQL wiring or it leaks other
  // people's (and non-member group) conversations. See design/ACTIONS.md.
  const t = await repo.getThreadById(req.params.id)
  if (!t) { fail(res, 404, 'NOT_FOUND', 'Conversation not found'); return }
  ok(res, t)
}

async function replyThread (req, res) {
  const text = ((req.body || {}).text || '').trim()
  if (!text) { fail(res, 400, 'EMPTY', 'Message is empty.'); return }
  const me = await currentAdvisor(req)
  // AUTH SEAM (SEC-THREAD-ACL): before appending, verify `me` may post to this
  // thread (1:1 participant or group member) — else 403. Not enforced in the
  // single-user mock; MUST be added at real auth/MySQL wiring. See design/ACTIONS.md.
  const t = await repo.appendMessage(req.params.id, { from: 'Me', fromName: me.name, text })
  if (!t) { fail(res, 404, 'NOT_FOUND', 'Conversation not found'); return }
  ok(res, t)
}

// Attach a catalogue tool to a 1:1 conversation's Shared workspace (thread-level
// mirror of addSharedPage). 1:1 only — group tools are managed on the group page.
async function addThreadSharedPage (req, res) {
  const me = await currentAdvisor(req)
  const body = req.body || {}
  if (!(body.pageId || '').trim()) { fail(res, 400, 'MISSING_TOOL', 'Choose a tool to add.'); return }
  if (!(await templates.exists(body.pageId))) { fail(res, 400, 'UNKNOWN_TOOL', 'That tool is not in the Advisor-e catalogue.'); return }
  const r = await repo.addThreadSharedPage(req.params.id, body)
  if (r.error === 'THREAD_NOT_FOUND') { fail(res, 404, 'NOT_FOUND', 'Conversation not found.'); return }
  if (r.error === 'NOT_DIRECT') { fail(res, 400, 'NOT_DIRECT', 'Tools can be shared on a 1:1 conversation; group tools live on the group page.'); return }
  audit.record({ actorId: me.id, action: 'thread.shared_page_added', targetType: 'thread', targetId: req.params.id, meta: { pageId: body.pageId } })
  ok(res, { success: true, sharedPages: r.sharedPages })
}

// Detach a tool from a 1:1 conversation's Shared workspace. Removes only the
// stored reference — nothing in Advisor-e is deleted.
async function removeThreadSharedPage (req, res) {
  const me = await currentAdvisor(req)
  const r = await repo.removeThreadSharedPage(req.params.id, req.params.pageId)
  if (r.error === 'THREAD_NOT_FOUND') { fail(res, 404, 'NOT_FOUND', 'Conversation not found.'); return }
  if (r.error === 'NOT_DIRECT') { fail(res, 400, 'NOT_DIRECT', 'Group tools live on the group page.'); return }
  audit.record({ actorId: me.id, action: 'thread.shared_page_removed', targetType: 'thread', targetId: req.params.id, meta: { pageId: req.params.pageId } })
  ok(res, { success: true, sharedPages: r.sharedPages })
}

async function listNotifications (req, res) {
  const me = await currentAdvisor(req)
  ok(res, await repo.listNotifications(me.id))
}

async function markNotificationsRead (req, res) {
  const me = await currentAdvisor(req)
  ok(res, await repo.markNotificationsRead(me.id))
}

async function listConnections (req, res) {
  const me = await currentAdvisor(req)
  ok(res, await repo.listConnections(me.id))
}

// Unified "Connecting" inbox (Q-CONN-MSG-IA → Option B): one merged, type-tagged
// list of conversations + connections for the single screen that supersedes the
// standalone Connections page. Read-only; the actions reuse the existing routes.
async function listConnecting (req, res) {
  const me = await currentAdvisor(req)
  ok(res, await repo.listConnecting(me.id))
}

async function connect (req, res) {
  const me = await currentAdvisor(req)
  if (req.params.id === me.id) { fail(res, 400, 'SELF', 'You cannot connect with yourself.'); return }
  const c = await repo.requestConnection(me.id, req.params.id)
  if (c && c.error === 'CROSS_ORG_BLOCKED') {
    audit.record({ actorId: me.id, action: 'connection.blocked', targetType: 'advisor', targetId: req.params.id, meta: { reason: 'cross_org' } })
    fail(res, 403, 'CROSS_ORG_BLOCKED', "You can only connect within your own firm — cross-firm collaboration isn't open between your organisations.")
    return
  }
  if (!c) { fail(res, 400, 'BAD_REQUEST', 'Could not create the request.'); return }
  audit.record({ actorId: me.id, action: 'connection.request', targetType: 'advisor', targetId: req.params.id })
  ok(res, { success: true, status: c.status })
}

async function acceptConnection (req, res) {
  const me = await currentAdvisor(req)
  const c = await repo.respondConnection(req.params.id, me.id, true)
  if (!c) { fail(res, 404, 'NOT_FOUND', 'Request not found.'); return }
  audit.record({ actorId: me.id, action: 'connection.accept', targetType: 'connection', targetId: req.params.id })
  ok(res, { success: true, status: c.status })
}

async function declineConnection (req, res) {
  const me = await currentAdvisor(req)
  const c = await repo.respondConnection(req.params.id, me.id, false)
  if (!c) { fail(res, 404, 'NOT_FOUND', 'Request not found.'); return }
  audit.record({ actorId: me.id, action: 'connection.decline', targetType: 'connection', targetId: req.params.id })
  ok(res, { success: true, status: c.status })
}

async function listMarketplace (req, res) {
  const me = await currentAdvisor(req)
  ok(res, await repo.listListings(me.id))
}

async function getListing (req, res) {
  const me = await currentAdvisor(req)
  const l = await repo.getListing(req.params.id, me.id)
  if (!l) { fail(res, 404, 'NOT_FOUND', 'Listing not found'); return }
  ok(res, l)
}

async function createListing (req, res) {
  const body = req.body || {}
  if (!(body.title || '').trim()) { fail(res, 400, 'MISSING_TITLE', 'A listing needs a title.'); return }
  // Every listing must link to a real Advisor-e tool (page ID from the master
  // catalogue). Reject a missing or unknown ID — never trust the client (CLAUDE.md
  // security rule). The ID itself is generated by Advisory, never by this app.
  if (!(body.pageId || '').trim()) { fail(res, 400, 'MISSING_TOOL', 'Choose the Advisor-e tool this listing is for.'); return }
  if (!(await templates.exists(body.pageId))) { fail(res, 400, 'UNKNOWN_TOOL', 'That tool is not in the Advisor-e catalogue.'); return }
  // IP governance (plan §6): a locked / non-derivable framework (Tier 2) cannot be
  // listed or re-sold. Enforce the lock flag before anything is created.
  const ip = await ipClass.classify(body.pageId)
  const me = await currentAdvisor(req)
  if (ip.locked) {
    audit.record({ actorId: me.id, action: 'listing.locked_blocked', targetType: 'template', targetId: body.pageId, meta: { reason: 'locked_ip' } })
    fail(res, 400, 'LOCKED_IP', 'This is a locked Advisor-e framework and cannot be listed or derived.')
    return
  }
  const listing = await repo.createListing(body, me)
  audit.record({ actorId: me.id, action: 'listing.create', targetType: 'listing', targetId: listing.id, meta: { pageId: body.pageId } })
  ok(res, listing)
}

async function purchaseListing (req, res) {
  const me = await currentAdvisor(req)
  const r = await repo.recordPurchase(req.params.id, me.id)
  if (!r) { fail(res, 404, 'NOT_FOUND', 'Listing not found'); return }
  // Cross-org wall (plan §8): a sealed org can't buy across the boundary.
  if (r.error === 'CROSS_ORG_BLOCKED') {
    audit.record({ actorId: me.id, action: 'purchase.blocked', targetType: 'listing', targetId: req.params.id, meta: { reason: 'cross_org' } })
    fail(res, 403, 'CROSS_ORG_BLOCKED', 'This tool is from an organisation outside your current reach.')
    return
  }
  audit.record({ actorId: me.id, action: 'purchase.record', targetType: 'listing', targetId: req.params.id })
  ok(res, r)
}

// Add the actor's display name to an audit entry (the store keeps ids only).
function enrichAuditEntry (e) {
  return Object.assign({}, e, { actorName: repo.advisorLabel(e.actorId) })
}

// Read the audit trail (admin/compliance evidence). ADMIN-GATED (FEAT-AUDIT-UI):
// only the platform super-admin (Mentor tier) may read the whole network trail —
// re-checked server-side every request. Lower tiers see their own scope's activity
// in their console, never this. Optional actor/action/limit filters are a repo seam.
async function getAuditLog (req, res) {
  const me = await currentAdvisor(req)
  if (!repo.isAdmin(me.id)) { fail(res, 403, 'NOT_ADMIN', 'Only a platform administrator can view the audit log.'); return }
  const q = req.query || {}
  const limit = q.limit ? parseInt(q.limit, 10) : 100
  const entries = await audit.list({ actorId: q.actorId, action: q.action, limit })
  ok(res, { entries: entries.map(enrichAuditEntry) })
}

// Audit-log PREVIEW (show-home only): the same trail without the admin gate, so
// the audit viewer can be demonstrated without a real super-admin login. DEV-ONLY
// — refused in production, where the real /api/people/audit (admin-gated) serves it.
async function getAuditLogPreview (req, res) {
  if (process.env.ALLOW_DEV_AUTH !== 'true') { fail(res, 404, 'NOT_FOUND', 'Not found.'); return }
  const q = req.query || {}
  const limit = q.limit ? parseInt(q.limit, 10) : 100
  const entries = await audit.list({ actorId: q.actorId, action: q.action, limit })
  ok(res, { entries: entries.map(enrichAuditEntry), preview: true })
}

// ── Firm Manager console ─────────────────────────────────────────────────────
// The manager's firm dashboard: advisers (with availability + whether they've
// blocked the manager view), headline stats, pending join requests, and a recent
// activity feed drawn from the (real) audit trail, scoped to the firm's advisers.
// Gated to a Firm Manager (RBAC SEAM in repo.getFirmConsole).
// The recent activity feed for a console, scoped to the manager's reach via the
// server-produced `scope` (repo.actorInScope) — never the shipped adviser list,
// which is now empty for higher tiers (PERF-CONSOLE-TREE). Names resolve on demand.
async function scopedActivity (scope) {
  return (await audit.list({ limit: 100 }))
    .filter(e => repo.actorInScope(scope, e.actorId))
    .slice(0, 8)
    .map(e => ({ at: e.at, actorName: repo.advisorLabel(e.actorId), action: e.action, meta: e.meta }))
}

// Pagination options for the lazy per-branch adviser loaders.
function pageOpts (req) {
  const q = req.query || {}
  return { offset: q.offset ? parseInt(q.offset, 10) : 0, limit: q.limit ? parseInt(q.limit, 10) : 100 }
}

async function getFirmConsole (req, res) {
  const me = await currentAdvisor(req)
  const data = await repo.getFirmConsole(me.id)
  if (data.error === 'NOT_MANAGER') { fail(res, 403, 'NOT_MANAGER', 'Only a firm manager can open the firm console.'); return }
  if (data.error) { fail(res, 404, 'NOT_FOUND', 'Firm not found.'); return }
  ok(res, Object.assign({}, data, { activity: await scopedActivity(data.scope) }))
}

// Console PREVIEW (show-home only): render a given tier's console as a seeded demo
// manager, so each tier's view can be seen without a real login. DEV-ONLY — refused
// in production, where the single role-gated /firm page serves every tier by login.
async function getConsolePreview (req, res) {
  if (process.env.ALLOW_DEV_AUTH !== 'true') { fail(res, 404, 'NOT_FOUND', 'Not found.'); return }
  const data = await repo.getConsolePreview(req.params.tier)
  if (data.error) { fail(res, 404, 'NOT_FOUND', 'Unknown preview.'); return }
  ok(res, Object.assign({}, data, { activity: await scopedActivity(data.scope), preview: true }))
}

// Lazy per-branch adviser loader (PERF-CONSOLE-TREE): the advisers in one branch,
// within the caller's console scope, paginated. Manager-gated; the client sends only
// the `firm` filter — scope is re-derived server-side, never trusted from the client.
async function getConsoleAdvisers (req, res) {
  const me = await currentAdvisor(req)
  const r = await repo.listConsoleAdvisers(me.id, (req.query || {}).firm || '', pageOpts(req))
  if (r.error === 'NOT_MANAGER') { fail(res, 403, 'NOT_MANAGER', 'Only a manager can open the console.'); return }
  ok(res, r)
}

// Dev-only preview variant of the lazy loader (show-home; refused in production).
async function getConsoleAdvisersPreview (req, res) {
  if (process.env.ALLOW_DEV_AUTH !== 'true') { fail(res, 404, 'NOT_FOUND', 'Not found.'); return }
  const r = await repo.listConsoleAdvisersPreview(req.params.tier, (req.query || {}).firm || '', pageOpts(req))
  if (r.error) { fail(res, 404, 'NOT_FOUND', 'Unknown preview.'); return }
  ok(res, Object.assign({}, r, { preview: true }))
}

// A manager sets the cross-org posture at their OWN tier level (the console
// toggle) — Firm→branch, Group→country, Global/Mentor→brand (repo.setFirmPosture
// routes the write). A lower level may only tighten; the response carries the
// EFFECTIVE state (capped by any stricter level above).
async function setFirmPosture (req, res) {
  const me = await currentAdvisor(req)
  const posture = (req.body || {}).posture
  const r = await repo.setFirmPosture(me.id, posture)
  if (r.error === 'NOT_MANAGER') { fail(res, 403, 'NOT_MANAGER', 'Only a manager can change this.'); return }
  if (r.error === 'BAD_POSTURE') { fail(res, 400, 'BAD_POSTURE', 'Posture must be "open" or "closed".'); return }
  audit.record({ actorId: me.id, action: 'firm.posture_set', targetType: 'org', targetId: r.scope, meta: { posture, level: r.level, scope: r.scope } })
  ok(res, r)
}

module.exports = {
  getFirmConsole,
  getConsolePreview,
  getConsoleAdvisers,
  getConsoleAdvisersPreview,
  setFirmPosture,
  startViewAs,
  exitViewAs,
  getMe,
  updateMe,
  listAdvisors,
  getAdvisor,
  listGroups,
  getGroup,
  createGroup,
  joinGroup,
  listGroupRequests,
  acceptGroupRequest,
  declineGroupRequest,
  addSharedPage,
  removeSharedPage,
  messageGroup,
  openGroupChat,
  listMyGroups,
  inviteToGroup,
  inviteManyToGroup,
  acceptInvitation,
  declineInvitation,
  sendOutreach,
  messageAdvisor,
  listMessages,
  getThread,
  replyThread,
  addThreadSharedPage,
  removeThreadSharedPage,
  listConnections,
  listConnecting,
  connect,
  acceptConnection,
  declineConnection,
  listMarketplace,
  getListing,
  createListing,
  purchaseListing,
  listNotifications,
  markNotificationsRead,
  getAuditLog,
  getAuditLogPreview
}
