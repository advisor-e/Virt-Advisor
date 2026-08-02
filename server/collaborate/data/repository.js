'use strict'

/**
 * repository — the SINGLE data-access layer for the people layer.
 *
 * ▶ MASTER TEAM: this is the ONLY file to change to connect MySQL. Every function
 *   runs against an in-memory store today (dev fallback). To go live, replace each
 *   function body with the query in its "SQL SEAM" note, using the pool from
 *   server/utils/db.js and the schema in config/db-schema.sql. Keep the function
 *   names, parameters, and return shapes identical — the routes
 *   (server/routes/people.js) and the frontend then need no changes.
 *
 * All functions are async, so swapping in `await pool.execute(...)` is drop-in.
 * Wrap the SQL versions in try/catch and return safe errors (CLAUDE.md error rule).
 *
 * NOTE: advisor IDENTITY (name/title/firm/email/phone/location) is Advisory's
 * system of record — the in-memory `advisors` list stands in for it. In
 * production, read identity from Advisory and JOIN this app's advisor_interest /
 * advisor_tag tables for the advertised fields (available, about, strengths,
 * industries, topics).
 */

// const pool = require('../../utils/db')   // <-- uncomment when wiring SQL
// (There is ONE pool for the whole app: server/utils/db.js. Collaborate's
//  identical copy was deleted 2026-08-02 — two pools onto the same database was
//  a latent bug waiting for whoever uncommented this line.)

const { CROSS_ORG, ADVISOR_E } = require('../../../config/integration')
const roles = require('./roles') // role/tier resolver (Q-ROLES) — the RBAC seam

// ── In-memory dev store ──────────────────────────────────────────────────────

// Demo org tree (mock data — the protected catalogue is untouched). The role
// hierarchy (Q-ROLES / plan §5) is: Mentor → Global group/brand → Country →
// Firm(branch) → Advisor. Each advisor therefore carries `globalGroup` (the brand,
// e.g. BDO), `country`, and `firm` (= the BRANCH within that country/brand, e.g.
// "Advisor-e Munich"). Cross-org sealing is per branch (Q6).
//   Advisor-e: DE(Munich: me, priya, james · Berlin: tom · Hamburg: lena) · IT(Milan: sofia) · IE(Dublin: sara)
//   BDO:       DE(Hamburg: anna)
//   Lindt & Co: CH(Zürich: bob)
const advisors = [
  {
    id: 'me', name: 'Mike Barnes', title: 'Partner',
    globalGroup: 'Advisor-e', country: 'DE', firm: 'Advisor-e Munich',
    city: 'Munich', timezone: 'CET',
    linkedin: 'https://linkedin.com/in/mikebarnes', email: 'mike@advisor-e.com', phone: '+49 89 5550 1234',
    available: true, strengths: ['capital raising', 'tax'], industries: ['seafood', 'hospitality'],
    topics: ['M&A', 'valuations'], about: '20 yrs helping owner-managed firms with growth and exit.',
    // RBAC SEAM: the dev user is the Firm Manager of the Advisor-e Munich branch.
    // Real role comes from the Advisory JWT (AUTH.managerRole) once wired — see design/ACTIONS.md.
    firmManager: true
  },
  {
    id: 'priya-nair', name: 'Priya Nair', title: 'Senior Advisor',
    globalGroup: 'Advisor-e', country: 'DE', firm: 'Advisor-e Munich',
    city: 'Munich', timezone: 'CET', linkedin: '',
    available: true, strengths: ['restructuring', 'cashflow'], industries: ['retail', 'manufacturing'],
    topics: ['turnaround'], about: 'Hands-on restructuring and 13-week cashflow work.',
    blockFirmManagerView: false, lastActive: 'Today'
  },
  {
    id: 'james-obrien', name: "James O'Brien", title: 'Associate',
    globalGroup: 'Advisor-e', country: 'DE', firm: 'Advisor-e Munich',
    city: 'Munich', timezone: 'CET', linkedin: '',
    available: false, strengths: ['bookkeeping', 'onboarding'], industries: ['retail'],
    topics: ['client onboarding'], about: 'Associate supporting onboarding and client setup.',
    // James has switched "block firm manager view" on — shows the blocked state.
    blockFirmManagerView: true, lastActive: '1 week ago'
  },
  {
    id: 'tom-fischer', name: 'Tom Fischer', title: 'Advisor',
    globalGroup: 'Advisor-e', country: 'DE', firm: 'Advisor-e Berlin',
    city: 'Berlin', timezone: 'CET', linkedin: '',
    available: false, strengths: ['tax', 'compliance'], industries: ['professional services'],
    topics: ['tax automation'], about: 'Tax and compliance adviser; building automation workflows.',
    blockFirmManagerView: false, lastActive: '2 days ago'
  },
  {
    id: 'lena-vogel', name: 'Lena Vogel', title: 'Advisor',
    globalGroup: 'Advisor-e', country: 'DE', firm: 'Advisor-e Hamburg',
    city: 'Hamburg', timezone: 'CET', linkedin: '',
    available: true, strengths: ['forecasting', 'reporting'], industries: ['seafood', 'logistics'],
    topics: ['forecasting'], about: 'Forecasting and management reporting specialist.',
    blockFirmManagerView: false, lastActive: 'Yesterday'
  },
  {
    id: 'sofia-marchetti', name: 'Sofia Marchetti', title: 'Advisor',
    globalGroup: 'Advisor-e', country: 'IT', firm: 'Advisor-e Milan',
    city: 'Milan', timezone: 'CET', linkedin: '',
    available: true, strengths: ['valuation', 'M&A'], industries: ['food production', 'hospitality'],
    topics: ['valuations'], about: 'Valuation and deal support across food & hospitality.',
    blockFirmManagerView: false, lastActive: 'Today'
  },
  {
    id: 'sara-okafor', name: 'Sara Okafor', title: 'Senior Advisor',
    globalGroup: 'Advisor-e', country: 'IE', firm: 'Advisor-e Dublin',
    city: 'Dublin', timezone: 'GMT', linkedin: '',
    available: true, strengths: ['business coaching', 'succession'], industries: ['hospitality', 'retail'],
    topics: ['exit planning'], about: 'Coaches owner-managers through scale-up and succession.'
  },
  {
    id: 'anna-r', name: 'Anna Richter', title: 'Director',
    globalGroup: 'BDO', country: 'DE', firm: 'BDO Hamburg',
    city: 'Hamburg', timezone: 'CET', linkedin: '',
    available: false, strengths: ['financial modelling', 'valuation'], industries: ['seafood', 'food production'],
    topics: ['forecasting'], about: 'Builds valuation models for food-production businesses.'
  },
  {
    id: 'bob-lindt', name: 'Bob Lindt', title: 'Partner',
    globalGroup: 'Lindt & Co', country: 'CH', firm: 'Lindt Zürich',
    city: 'Zürich', timezone: 'CET', linkedin: '',
    available: true, strengths: ['capital raising', 'debt structuring'], industries: ['manufacturing'],
    topics: ['funding rounds'], about: 'Corporate finance specialist focused on growth funding.'
  }
]

const groups = [
  {
    id: 'seafood-modelling', name: 'Seafood Financial Modelling', icon: '🐟',
    createdBy: 'Anna Richter (BDO DE)', firms: 5, memberCount: 12,
    visibility: 'listed', joinPolicy: 'request-approval',
    tags: ['seafood', 'valuation', 'capital raising'],
    summary: 'Building a shared valuation + capital-raising model for seafood processors. We would love capital-raising experience.',
    members: [{ id: 'me', name: 'Mike Barnes' }, { id: 'anna-r', name: 'Anna Richter' }, { id: 'sara-okafor', name: 'Sara Okafor' }, { id: 'bob-lindt', name: 'Bob Lindt' }],
    // DEMO page IDs (fake). Real IDs + the URL pattern are the master-team seam
    // Q-PAGE-URL; Advisor-e enforces the actual access. See design/ACTIONS.md.
    sharedPages: [{ pageId: 'ae-seafood-valuation-01', title: 'Seafood Valuation Model' }, { pageId: 'ae-capital-raise-deck-02', title: 'Capital-Raising Deck' }]
  },
  {
    id: 'hospitality-turnaround', name: 'Hospitality Turnaround Toolkit', icon: '🍽️',
    createdBy: 'Sara Okafor (Okafor Advisory)', firms: 3, memberCount: 7,
    visibility: 'listed', joinPolicy: 'request-approval',
    tags: ['hospitality', 'turnaround', 'cashflow'],
    summary: 'Templates and playbooks for rescuing struggling hospitality businesses.',
    members: [{ id: 'sara-okafor', name: 'Sara Okafor' }]
  },
  {
    id: 'tax-automation', name: 'Tax Automation Lab', icon: '🧮',
    createdBy: 'Bob Lindt (Lindt & Co)', firms: 4, memberCount: 9,
    visibility: 'listed', joinPolicy: 'request-approval',
    tags: ['tax', 'automation', 'workflow'],
    summary: 'Building shared tax-automation workflows and templates.',
    members: [{ id: 'bob-lindt', name: 'Bob Lindt' }],
    sharedPages: [{ pageId: 'ae-tax-workflow-01', title: 'Tax Automation Workflow' }]
  },
  // Demo: a group the dev user OWNS, so the group-owner approval UI is
  // demonstrable in the show-home (a pending request is seeded below).
  {
    id: 'cashflow-clinic', name: 'Cashflow Clinic', icon: '💧',
    createdBy: 'Mike Barnes (Advisor-e)', firms: 1, memberCount: 3,
    visibility: 'listed', joinPolicy: 'request-approval',
    tags: ['cashflow', 'forecasting'],
    summary: 'A small working group building a shared 13-week cashflow toolkit.',
    members: [{ id: 'me', name: 'Mike Barnes' }, { id: 'priya-nair', name: 'Priya Nair' }, { id: 'sofia-marchetti', name: 'Sofia Marchetti' }],
    sharedPages: [{ pageId: 'ae-cashflow-13week-01', title: '13-Week Cashflow Model' }, { pageId: 'ae-onboarding-checklist-02', title: 'Client Onboarding Checklist' }]
  }
]

const threads = [
  { id: 't-bob', kind: 'outreach', withId: 'bob-lindt', withName: 'Bob Lindt', status: 'request', direction: 'incoming', messages: [{ from: 'Bob Lindt', text: 'Gerne! Wann passt es Ihnen?', lang: 'de' }] },
  { id: 't-anna', kind: 'outreach', withId: 'anna-r', withName: 'Anna Richter', status: 'request', direction: 'incoming', messages: [{ from: 'Anna Richter', text: 'Would you be open to joining the seafood modelling group?', lang: 'en' }], sharedPages: [{ pageId: 'ae-anna-forecast-01', title: 'Joint Forecast Model' }] },
  { id: 't-seafood-grp', kind: 'group', withId: 'seafood-modelling', withName: 'Seafood Financial Modelling', status: 'active', direction: 'outgoing', messages: [{ from: 'Anna Richter', text: 'Welcome — glad to have you looking at this!', lang: 'en' }] },
  // Incoming group invitations (someone invited "me" to join) — Accept joins the group.
  { id: 't-inv-hosp', kind: 'invitation', withId: 'hospitality-turnaround', withName: 'Hospitality Turnaround Toolkit', groupId: 'hospitality-turnaround', inviterName: 'Sara Okafor', status: 'request', direction: 'incoming', messages: [{ from: 'Sara Okafor', text: 'We would love your capital-raising experience on the Hospitality Turnaround group — would you join us?', lang: 'en' }] },
  { id: 't-inv-tax', kind: 'invitation', withId: 'tax-automation', withName: 'Tax Automation Lab', groupId: 'tax-automation', inviterName: 'Bob Lindt', status: 'request', direction: 'incoming', messages: [{ from: 'Bob Lindt', text: 'Would you like to join the Tax Automation Lab? Your workflow experience would help.', lang: 'en' }] }
]
let threadSeq = 1

const connections = [
  { id: 'c-anna', requesterId: 'anna-r', addresseeId: 'me', status: 'pending' },     // Anna -> me (incoming request)
  { id: 'c-sara', requesterId: 'me', addresseeId: 'sara-okafor', status: 'accepted' } // me <-> Sara (connected)
]
let connSeq = 1

// Group-join requests (viewer asked to join a group; consent-based). One row per
// (group, advisor). A group's manager approves/declines (see respondJoinRequest).
// SQL SEAM: a `group_join_request` table. The seed row lets the dev user (owner of
// "Cashflow Clinic") see the approval UI in the show-home; production starts empty.
const groupJoinRequests = [
  { id: 'gjr-seed-1', groupId: 'cashflow-clinic', advisorId: 'anna-r', status: 'requested' },
  { id: 'gjr-seed-2', groupId: 'cashflow-clinic', advisorId: 'bob-lindt', status: 'requested' }
]
let gjrSeq = 1

// Marketplace listings are group-owned IP → IP Tier 4 (plan §6). The tier travels
// with the listing so the marketplace can badge ownership.
const listings = [
  { id: 'm-trucking', title: 'Trucking Firm Valuation Model', summary: 'A valuation + capital-raising model built by five firms for road-transport businesses.', groupId: 'seafood-modelling', groupName: 'Seafood Financial Modelling', tags: ['trucking', 'valuation'], price: '€450', createdBy: 'Anna Richter (BDO DE)', createdById: 'anna-r', ipTier: 4, pageId: 'id-4466260146' },
  { id: 'm-hospitality', title: 'Hospitality Turnaround Toolkit', summary: 'Templates and playbooks for rescuing struggling hospitality businesses.', groupId: 'hospitality-turnaround', groupName: 'Hospitality Turnaround Toolkit', tags: ['hospitality', 'turnaround'], price: 'Free', createdBy: 'Sara Okafor', createdById: 'sara-okafor', ipTier: 4, pageId: '6-keys-notes' }
]
const purchases = []
let listingSeq = 1

// ── Notifications (in-app; strictly per recipient) ───────────────────────────
// Each notification targets ONE recipient (userId); a route only ever returns
// the caller's own rows, so no cross-user data is exposed. The frontend renders
// the visible text from `type` + `params` via i18n (locale keys), so no English
// string lives here. Event functions below call pushNotification(recipientId, …)
// at the moment the event happens — in production each becomes an INSERT.
const notifications = []
let notifSeq = 1

function advisorName (id) {
  const a = advisors.find(x => x.id === id)
  return a ? a.name : id
}

/**
 * Record an in-app notification for a single recipient.
 * @param {string} userId recipient advisor id
 * @param {'connection_request'|'group_invitation'|'message'|'purchase'} type event type
 * @param {object} params interpolation values for the i18n string (e.g. { name })
 * @param {string} link in-app route to open when the notification is clicked
 * @returns {object} the created notification
 */
function pushNotification (userId, type, params, link) {
  // SQL SEAM: INSERT INTO notification (user_id, type, params_json, link, is_read=0, created_at=NOW())
  const n = { id: 'n-' + (notifSeq++), userId: userId, type: type, params: params || {}, link: link, read: false }
  notifications.unshift(n)
  return n
}

// Seed a few unread notifications for the dev user so the bell is demonstrable
// in the show-home. These mirror the pre-seeded incoming state (a connection
// request, two group invitations, a message) plus one illustrative marketplace
// purchase. In production the store starts empty and fills from live events —
// this is clearly seed/demo data, not business logic.
;(function seedNotifications () {
  pushNotification('me', 'connection_request', { name: 'Anna Richter' }, '/connecting')
  pushNotification('me', 'group_invitation', { inviter: 'Sara Okafor', group: 'Hospitality Turnaround Toolkit' }, '/connecting')
  pushNotification('me', 'group_invitation', { inviter: 'Bob Lindt', group: 'Tax Automation Lab' }, '/connecting')
  pushNotification('me', 'message', { name: 'Bob Lindt' }, '/connecting')
  pushNotification('me', 'purchase', { buyer: 'Sara Okafor', tool: 'Trucking Firm Valuation Model' }, '/marketplace')
  // Mirrors the seeded Cashflow Clinic join request so the owner sees it in the bell.
  pushNotification('me', 'group_join_request', { name: 'Anna Richter', group: 'Cashflow Clinic' }, '/groups/cashflow-clinic')
}())

// ── Cross-org engagement postures — three-level ceiling (plan §8; D1/Q6; Q-ROLES) ─
// The open/closed control exists at THREE stacked levels; a lower level may only
// ever TIGHTEN, never loosen — the "ceiling" model (owner decision, 2026-07-07):
//   • global[brand]                — set by a Global Manager (or the Mentor)
//   • country[brand '||' country]  — set by a Group (country) Manager
//   • firm[branch]                 — set by a Firm Manager
// A branch's EFFECTIVE posture = MOST-CLOSED-WINS across the three: open only when
// all three are open; any one level closed ⇒ closed. Each manager writes exactly
// ONE key at their own level (O(1)), and a reachability check is three lookups —
// so this holds at a brand with ~1,700 branches without ever iterating the tree.
// Default at every level is CLOSED / opt-in (config/integration.js → D1).
//
// SQL SEAM: three small tables keyed by scope (org_posture_global / _country /
// _firm). The demo below OPTS IN the show-home brands/countries/branches at every
// level so the network stays navigable; anything unseeded falls back to closed.
const postures = {
  global: {
    'Advisor-e': 'open',
    BDO: 'open',
    'Lindt & Co': 'open'
  },
  country: {
    'Advisor-e||DE': 'open',
    'Advisor-e||IT': 'open',
    'Advisor-e||IE': 'open',
    'BDO||DE': 'open',
    'Lindt & Co||CH': 'open'
  },
  firm: {
    'Advisor-e Munich': 'open',
    'Advisor-e Berlin': 'open',
    'Advisor-e Hamburg': 'open',
    'Advisor-e Milan': 'open',
    'Advisor-e Dublin': 'open',
    'BDO Hamburg': 'open',
    'Lindt Zürich': 'open'
  }
}

// The composite key for the country level: a brand's country unit (Advisor-e
// Germany ≠ BDO Germany — see the console "Groups" tile).
const countryKey = (brand, country) => (brand || '') + '||' + (country || '')

// Posture stored at one level for one key, defaulting to the opt-in default (D1).
function postureAt (level, key) {
  return (postures[level] && postures[level][key]) || CROSS_ORG.defaultPosture
}

// Firm-level accessor kept for back-compat (the Profile posture indicator + the
// existing wall tests read/write the FIRM scope through getOrgPosture/setOrgPosture).
function orgPostureFor (firm) {
  return postureAt('firm', firm)
}

// A branch's effective posture = most-closed across brand → country → branch.
function effectivePostureForOrg (brand, country, firm) {
  const g = postureAt('global', brand)
  const c = postureAt('country', countryKey(brand, country))
  const f = postureAt('firm', firm)
  return (g === 'open' && c === 'open' && f === 'open') ? 'open' : 'closed'
}

function effectivePostureFor (advisor) {
  if (!advisor) { return CROSS_ORG.defaultPosture }
  return effectivePostureForOrg(advisor.globalGroup, advisor.country, advisor.firm)
}

// Both-sides consent (plan §8): a cross-branch interaction needs BOTH advisers'
// orgs to be EFFECTIVELY open. Same branch is always allowed (internal). Takes the
// advisor RECORDS (they carry globalGroup + country + firm).
function canReach (from, to) {
  if (!from || !to) { return false }
  if (from.firm && from.firm === to.firm) { return true }
  return effectivePostureFor(from) === 'open' && effectivePostureFor(to) === 'open'
}

// Which posture level a manager CONTROLS (their own tier) + the storage key/label:
//   • Firm Manager  → the firm/branch level
//   • Group Manager → the country level (their brand's country unit)
//   • Global / Mentor → the brand (global) level
// A manager writes exactly this one key — never a per-child fan-out (scale).
function postureScopeFor (me) {
  const tier = roles.resolveTier(me)
  if (tier === 'firm_manager') { return { level: 'firm', key: me.firm, label: me.firm } }
  if (tier === 'group_manager') { return { level: 'country', key: countryKey(me.globalGroup, me.country), label: me.globalGroup + ' · ' + (me.country || '') } }
  return { level: 'global', key: me.globalGroup, label: me.globalGroup }
}

// The cross-org control state for a manager's console: what they've set at their
// OWN level, the ceiling handed down from ABOVE (the nearest stricter level), and
// the resulting effective state — with `cappedBy` naming the level currently
// overriding an Open choice (drives the Option-A "capped" note, owner 2026-07-07).
function crossOrgStateFor (me) {
  const scope = postureScopeFor(me)
  const own = postureAt(scope.level, scope.key)
  let ceiling = 'open'
  let cappedBy = null
  if (scope.level === 'firm') {
    const country = postureAt('country', countryKey(me.globalGroup, me.country))
    const global = postureAt('global', me.globalGroup)
    if (country === 'closed' || global === 'closed') {
      ceiling = 'closed'
      cappedBy = country === 'closed' ? 'country' : 'global' // report the nearest
    }
  } else if (scope.level === 'country') {
    if (postureAt('global', me.globalGroup) === 'closed') { ceiling = 'closed'; cappedBy = 'global' }
  }
  // global / mentor: nothing sits above them, so the ceiling is always open.
  const effective = (own === 'open' && ceiling === 'open') ? 'open' : 'closed'
  return { level: scope.level, scopeLabel: scope.label, own, ceiling, cappedBy, effective }
}

function connectionStatusFor (myId, otherId) {
  const c = connections.find(x => (x.requesterId === myId && x.addresseeId === otherId) || (x.requesterId === otherId && x.addresseeId === myId))
  if (!c) { return 'none' }
  if (c.status === 'accepted') { return 'connected' }
  if (c.status === 'pending') { return c.requesterId === myId ? 'pending_out' : 'pending_in' }
  return 'none'
}

function matchesQuery (a, q) {
  if (!q) { return true }
  const hay = [a.name, a.firm, a.city, a.about].concat(a.strengths || [], a.industries || [], a.topics || [], a.tags || []).join(' ').toLowerCase()
  return q.toLowerCase().split(/\s+/).every(term => hay.includes(term))
}

function threadSummary (t) {
  const last = t.messages[t.messages.length - 1] || null
  return { id: t.id, kind: t.kind, withId: t.withId, withName: t.withName, status: t.status, direction: t.direction, lastText: last ? last.text : '', lastFrom: last ? last.from : '' }
}

// ── Advisors ─────────────────────────────────────────────────────────────────

async function getAdvisorById (id) {
  // SQL SEAM: advisor identity from Advisory + LEFT JOIN advisor_interest/advisor_tag WHERE advisor_id = ?
  return advisors.find(a => a.id === id) || null
}

async function listAdvisors (opts) {
  // SQL SEAM: SELECT … WHERE id<>? AND (search match) AND (available=1 if filtered) — joined w/ Advisory
  //           identity; LEFT JOIN connection to derive each advisor's status vs the viewer.
  const o = opts || {}
  const viewer = o.myId || o.excludeId
  const viewerAdvisor = advisors.find(a => a.id === viewer)
  return advisors
    .filter(a => a.id !== o.excludeId)
    // Cross-org wall (plan §8; D1/Q6): hide advisers your firm can't reach — now
    // via the three-level effective posture (most-closed-wins). A viewer with no
    // resolved record (e.g. an unresolved dev identity) is not filtered.
    .filter(a => (viewerAdvisor ? canReach(viewerAdvisor, a) : true))
    .filter(a => matchesQuery(a, o.q))
    .filter(a => (o.availableOnly ? a.available : true))
    .map(a => Object.assign({}, a, { connectionStatus: connectionStatusFor(viewer, a.id) }))
}

async function updateAdvisorInterest (id, fields) {
  // SQL SEAM: UPSERT advisor_interest(available, about); REPLACE advisor_tag rows for strengths/industries/topics
  const a = advisors.find(x => x.id === id)
  if (!a) { return null }
  ;['available', 'strengths', 'industries', 'topics', 'about', 'blockFirmManagerView'].forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(fields, k)) { a[k] = fields[k] }
  })
  return a
}

// ── Groups ───────────────────────────────────────────────────────────────────

async function listGroups (opts) {
  // SQL SEAM: SELECT * FROM `group` (+ group_tag) WHERE visibility='listed' AND (search match)
  //           LEFT JOIN group_member / group_join_request to derive the viewer's joinStatus.
  const o = opts || {}
  return groups
    .filter(g => matchesQuery(g, o.q))
    .map(g => Object.assign({}, g, { joinStatus: groupJoinStatus(g.id, o.viewerId) }))
}

// Turn each shared Advisor-e page/tool into a deep-link, using the same seam the
// marketplace uses (config/integration.js → pageBaseUrl + pageId). This app only
// stores the page ID; the link opens Advisor-e, which enforces its OWN access
// (Q-PAGE-URL / Q-ACCESS-CASCADE). Returns a shallow copy so seed data isn't mutated.
function enrichShared (entity) {
  if (!entity || !entity.sharedPages) { return entity }
  return Object.assign({}, entity, {
    sharedPages: entity.sharedPages.map(p => Object.assign({}, p, { openUrl: ADVISOR_E.pageBaseUrl + p.pageId }))
  })
}

async function getGroupById (id) {
  // SQL SEAM: SELECT `group` + group_tag + group_member (+ group_shared_page) WHERE id = ?
  return enrichShared(groups.find(g => g.id === id) || null)
}

// Attach an Advisor-e catalogue tool/page to a group's Shared workspace so members
// can collaborate on it. This is INTERNAL collaboration only — separate from
// on-selling (the marketplace listing), which goes to advisers outside the group.
// Any member may add (the same "member manages" approximation; RBAC SEAM).
async function addGroupSharedPage (groupId, memberId, page) {
  // SQL SEAM: verify membership; INSERT INTO group_shared_page (group_id, page_id, title).
  const g = groups.find(x => x.id === groupId)
  if (!g) { return { error: 'GROUP_NOT_FOUND' } }
  if (!(g.members || []).some(m => m.id === memberId)) { return { error: 'NOT_MEMBER' } }
  const pageId = ((page && page.pageId) || '').trim()
  if (!pageId) { return { error: 'MISSING_TOOL' } }
  if (!g.sharedPages) { g.sharedPages = [] }
  if (!g.sharedPages.some(p => p.pageId === pageId)) {
    g.sharedPages.push({ pageId: pageId, title: ((page.title || '').trim()) || pageId })
  }
  return { success: true, sharedPages: enrichShared(g).sharedPages }
}

// Detach a tool from a group's Shared workspace — the mirror of the add. Removes
// ONLY the stored reference; it does not touch the Advisor-e page itself. Any
// member may remove (the same "member manages" approximation; RBAC SEAM).
async function removeGroupSharedPage (groupId, memberId, pageId) {
  // SQL SEAM: verify membership; DELETE FROM group_shared_page WHERE group_id=? AND page_id=?
  const g = groups.find(x => x.id === groupId)
  if (!g) { return { error: 'GROUP_NOT_FOUND' } }
  if (!(g.members || []).some(m => m.id === memberId)) { return { error: 'NOT_MEMBER' } }
  const id = (pageId || '').trim()
  if (g.sharedPages) { g.sharedPages = g.sharedPages.filter(p => p.pageId !== id) }
  return { success: true, sharedPages: enrichShared(g).sharedPages }
}

async function createGroup (input, creator) {
  // SQL SEAM: INSERT INTO `group` (…); INSERT group_tag rows; INSERT group_member (owner)
  const name = (input.name || '').trim()
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
  const group = {
    id: slug + '-' + (groups.length + 1), name: name, icon: input.icon || '✨',
    createdBy: creator.name + ' (' + creator.firm + ')', firms: 1, memberCount: 1,
    visibility: input.visibility || 'listed', joinPolicy: input.joinPolicy || 'request-approval',
    tags: Array.isArray(input.tags) ? input.tags : [], summary: (input.summary || '').trim(),
    members: [{ id: creator.id, name: creator.name }]
  }
  groups.unshift(group)
  return group
}

// The viewer's relationship to a group: already in it, asked to join, or neither.
// Powers the "Request Pending" state on the group card + the pending row in
// Connecting. @returns {'member'|'requested'|'none'}
function groupJoinStatus (groupId, advisorId) {
  const g = groups.find(x => x.id === groupId)
  if (g && (g.members || []).some(m => m.id === advisorId)) { return 'member' }
  if (groupJoinRequests.some(r => r.groupId === groupId && r.advisorId === advisorId)) { return 'requested' }
  return 'none'
}

async function requestJoinGroup (groupId, advisorId) {
  // SQL SEAM: INSERT INTO group_join_request (group_id, advisor_id, 'requested') ON DUPLICATE KEY UPDATE …
  const g = groups.find(x => x.id === groupId)
  if (!g) { return null }
  // Already in the group → nothing to request.
  if ((g.members || []).some(m => m.id === advisorId)) { return { status: 'member', groupId: g.id } }
  // Record the request once (idempotent) and notify the group's owner so it's
  // consistent with connection requests / invitations. Owner approval is a
  // tracked follow-up (see design/ACTIONS.md).
  if (!groupJoinRequests.some(r => r.groupId === groupId && r.advisorId === advisorId)) {
    groupJoinRequests.push({ id: 'gjr-' + (gjrSeq++), groupId: groupId, advisorId: advisorId, status: 'requested' })
    // Owner id isn't stored explicitly in the mock; derive it by matching the
    // `createdBy` label to a member (holds for seeded + user-created groups).
    const owner = (g.members || []).find(m => (g.createdBy || '').startsWith(m.name))
    if (owner) {
      pushNotification(owner.id, 'group_join_request', { name: advisorName(advisorId), group: g.name }, '/groups/' + g.id)
    }
  }
  return { status: 'requested', groupId: g.id, joinPolicy: g.joinPolicy }
}

// A group manager's pending incoming join requests for one group. "Manage" is
// approximated as membership — the same rule inviteToGroup already uses — until
// per-member roles land (RBAC SEAM: replace with role IN ('owner','admin')). A
// non-manager sees nothing.
async function listGroupJoinRequests (groupId, managerId) {
  // SQL SEAM: SELECT r.*, advisor … FROM group_join_request r WHERE r.group_id=? AND r.status='requested'
  const g = groups.find(x => x.id === groupId)
  if (!g || !(g.members || []).some(m => m.id === managerId)) { return [] }
  return groupJoinRequests
    .filter(r => r.groupId === groupId)
    .map(r => ({ id: r.id, advisor: advisors.find(a => a.id === r.advisorId) || { id: r.advisorId, name: r.advisorId } }))
}

// Approve or decline a join request. Only a manager (member — see above) may act.
// Accept adds the requester as a member and notifies them; decline just clears it.
async function respondJoinRequest (managerId, requestId, accept) {
  // SQL SEAM: verify manager role; DELETE the request; on accept INSERT group_member.
  const req = groupJoinRequests.find(r => r.id === requestId)
  if (!req) { return { error: 'NOT_FOUND' } }
  const g = groups.find(x => x.id === req.groupId)
  if (!g) { return { error: 'NOT_FOUND' } }
  if (!(g.members || []).some(m => m.id === managerId)) { return { error: 'NOT_MANAGER' } }
  groupJoinRequests.splice(groupJoinRequests.indexOf(req), 1)
  if (accept) {
    if (!(g.members || []).some(m => m.id === req.advisorId)) {
      g.members.push({ id: req.advisorId, name: advisorName(req.advisorId) })
      g.memberCount = (g.memberCount || g.members.length) + 1
    }
    // Tell the requester they're in. Text is rendered from type+params via i18n.
    pushNotification(req.advisorId, 'group_join_accepted', { group: g.name }, '/groups/' + g.id)
  }
  return { success: true, status: accept ? 'accepted' : 'declined', groupId: g.id, advisorId: req.advisorId }
}

// ── Group invitations (group owner/manager → adviser; consent required) ───────
// The mirror of requestJoinGroup: here the group side invites a person it found.
// No top-down placement — the invitee must ACCEPT before they become a member
// (plan §"invitation + consent"). "Manage" is approximated as membership in the
// mock until per-member roles + RBAC land (see design/ACTIONS.md).

async function listManageableGroups (advisorId) {
  // SQL SEAM: SELECT g.* FROM `group` g JOIN group_member m ON m.group_id=g.id
  //           WHERE m.advisor_id=? AND m.role IN ('owner','admin')
  return groups
    .filter(g => (g.members || []).some(m => m.id === advisorId))
    .map(g => ({ id: g.id, name: g.name, icon: g.icon }))
}

async function inviteToGroup (groupId, inviter, inviteeId, note) {
  // SQL SEAM: verify inviter manages the group; INSERT INTO group_invitation
  //   (group_id, advisor_id, invited_by, note, 'invited'); create an incoming
  //   'invitation' thread for the invitee. Returns {error} sentinels the route maps.
  const g = groups.find(x => x.id === groupId)
  if (!g) { return { error: 'GROUP_NOT_FOUND' } }
  if (!(g.members || []).some(m => m.id === inviter.id)) { return { error: 'NOT_MANAGER' } }
  if ((g.members || []).some(m => m.id === inviteeId)) { return { error: 'ALREADY_MEMBER' } }
  // Cross-org wall (plan §8): a group invitation is cross-org reach — refuse it across
  // a sealed org boundary (same firm / both orgs effectively open). Unknown ids aren't
  // blocked (mirrors canReachAdvisor). Added 2026-07-07 (review hardening).
  if (!(await canReachAdvisor(inviter.id, inviteeId))) { return { error: 'CROSS_ORG_BLOCKED' } }

  const invitee = advisors.find(a => a.id === inviteeId) || { id: inviteeId, name: inviteeId }
  const text = (note && note.trim()) ? note.trim() : ('We would love you to join ' + g.name + '.')
  const t = {
    id: 't-inv-' + (threadSeq++), kind: 'invitation', withId: groupId, withName: g.name,
    groupId: groupId, inviterName: inviter.name, inviteeName: invitee.name,
    status: 'active', direction: 'outgoing',
    messages: [{ from: 'Me', text: text, lang: 'en' }]
  }
  threads.unshift(t)
  // Notify the invitee (recipient = the person being invited).
  pushNotification(inviteeId, 'group_invitation', { inviter: inviter.name, group: g.name }, '/connecting')
  return { success: true, threadId: t.id, group: { id: g.id, name: g.name }, invitee: { id: invitee.id, name: invitee.name } }
}

// Manager bulk-invite (FEAT-BULKINVITE, plan §4): invite MANY advisers into one
// group at once — but each invitation is still individual + consent-based (every
// invitee must accept; no top-down placement). Reuses inviteToGroup per invitee, so
// an already-member (or any per-invitee guard) is skipped, not fatal. Manager +
// group are validated ONCE up front.
async function inviteManyToGroup (groupId, inviter, inviteeIds, note) {
  const g = groups.find(x => x.id === groupId)
  if (!g) { return { error: 'GROUP_NOT_FOUND' } }
  if (!(g.members || []).some(m => m.id === inviter.id)) { return { error: 'NOT_MANAGER' } }
  const invited = []
  const skipped = []
  const ids = Array.isArray(inviteeIds) ? inviteeIds : []
  for (let i = 0; i < ids.length; i++) {
    const r = await inviteToGroup(groupId, inviter, ids[i], note)
    if (r.success) { invited.push(r.invitee) } else { skipped.push({ id: ids[i], reason: r.error }) }
  }
  return { success: true, group: { id: g.id, name: g.name }, invited: invited, skipped: skipped }
}

async function respondInvitation (threadId, advisorId, accept) {
  // SQL SEAM: UPDATE group_invitation SET status=? WHERE id=? AND advisor_id=? AND
  //   status='invited'; if accepted INSERT INTO group_member (group_id, advisor_id, 'member')
  const t = threads.find(x => x.id === threadId && x.kind === 'invitation' && x.direction === 'incoming')
  if (!t || t.status !== 'request') { return null }
  t.status = 'active'
  if (accept) {
    const g = groups.find(x => x.id === t.groupId)
    if (g && !(g.members || []).some(m => m.id === advisorId)) {
      const me = advisors.find(a => a.id === advisorId) || { id: advisorId, name: advisorId }
      g.members.push({ id: advisorId, name: me.name })
      g.memberCount = (g.memberCount || 0) + 1
    }
  }
  return { success: true, accepted: !!accept, groupId: t.groupId, groupName: t.withName }
}

// ── Threads / messages ───────────────────────────────────────────────────────

async function listThreads (ownerId) {
  // SQL SEAM: SELECT thread (+ last message) WHERE owner_id = ? ORDER BY created_at DESC
  // AUTH SEAM (SEC-THREAD-ACL): this mock ignores `ownerId` and returns ALL threads.
  // The real query MUST scope to threads `ownerId` participates in (1:1 party or
  // group member) — otherwise every user sees everyone's conversations. See design/ACTIONS.md.
  return threads.map(threadSummary)
}

async function getThreadById (id) {
  // SQL SEAM: SELECT thread + messages (+ thread_shared_page) WHERE thread.id = ? ORDER BY message.created_at
  return enrichShared(threads.find(t => t.id === id) || null)
}

async function appendMessage (threadId, msg) {
  // SQL SEAM: INSERT INTO message (thread_id, sender_id, sender_name, body, lang); UPDATE thread.status if 'request'
  const t = threads.find(x => x.id === threadId)
  if (!t) { return null }
  t.messages.push({ from: msg.from, text: msg.text, lang: msg.lang || 'en' })
  if (t.status === 'request') { t.status = 'active' }
  // Notify the 1:1 counterpart of a new inbound message. Group fan-out (one
  // notification per member) is future work — see design/ACTIONS.md T2.
  if (t.kind === 'outreach' && t.withId) {
    pushNotification(t.withId, 'message', { name: msg.fromName || msg.from }, '/connecting')
  }
  return enrichShared(t)
}

// Anti-spam guard (plan §4): does the sender already have an OUTGOING outreach to
// this person? Used to enforce "one outreach per person" — continue in-thread
// rather than sending repeat cold outreach.
async function hasOutgoingOutreach (ownerId, toId) {
  // SQL SEAM: SELECT 1 FROM thread WHERE owner_id=? AND kind='outreach' AND direction='outgoing' AND with_id=?
  return threads.some(t => t.kind === 'outreach' && t.direction === 'outgoing' && t.withId === toId)
}

// Anti-spam rate-limit (plan §4): how many OUTGOING cold outreaches has this
// person started since `sinceMs`? Used to enforce the per-day cap. Seeded threads
// have no `createdAt` and are treated as older than any window.
async function countOutgoingOutreachSince (ownerId, sinceMs) {
  // SQL SEAM: SELECT COUNT(*) FROM thread WHERE owner_id=? AND kind='outreach'
  //   AND direction='outgoing' AND created_at >= ?  (owner scoping arrives with auth+MySQL)
  return threads.filter(t => t.kind === 'outreach' && t.direction === 'outgoing' && (t.createdAt || 0) >= sinceMs).length
}

async function createOutreachThread (input) {
  // SQL SEAM: INSERT INTO thread (kind='outreach', direction='outgoing', …); INSERT first message
  const t = {
    id: 't-out-' + (threadSeq++), kind: 'outreach', withId: input.toId, withName: input.toName,
    status: 'active', direction: 'outgoing', createdAt: Date.now(),
    messages: [{ from: 'Me', text: input.text, lang: 'en' }]
  }
  threads.unshift(t)
  // Notify the recipient of the new incoming outreach.
  pushNotification(input.toId, 'message', { name: input.fromName || 'Someone' }, '/connecting')
  return t
}

// Open (or reuse) a 1:1 conversation with a connection — used by the "Message"
// action on Connections so an advisor can chat without composing a fresh cold
// outreach. Reuses any existing 1:1 thread with that person.
async function findOrCreateDirectThread (ownerId, other) {
  // SQL SEAM: SELECT thread WHERE owner_id=? AND kind='outreach' AND with_id=? ; INSERT if none
  let t = threads.find(x => x.kind === 'outreach' && x.withId === other.id)
  if (!t) {
    t = { id: 't-dm-' + (threadSeq++), kind: 'outreach', withId: other.id, withName: other.name, status: 'active', direction: 'outgoing', messages: [] }
    threads.unshift(t)
  }
  return t
}

async function findOrCreateGroupThread (group) {
  // SQL SEAM: SELECT thread WHERE kind='group' AND with_id=? ; INSERT if none
  let t = threads.find(x => x.kind === 'group' && x.withId === group.id)
  if (!t) {
    t = { id: 't-grp-' + (threadSeq++), kind: 'group', withId: group.id, withName: group.name, status: 'active', direction: 'outgoing', messages: [] }
    threads.unshift(t)
  }
  return t
}

// Attach/detach an Advisor-e catalogue tool to a 1:1 conversation's Shared
// workspace — the thread-level mirror of the group functions. Allowed on 1:1
// (kind 'outreach') threads only; group tools are managed on the group page.
// Stores only the reference. AUTH SEAM (SEC-THREAD-ACL): the real query must
// confirm the caller is one of the two parties before mutating.
async function addThreadSharedPage (threadId, page) {
  // SQL SEAM: verify caller is a party; INSERT INTO thread_shared_page (thread_id, page_id, title)
  const t = threads.find(x => x.id === threadId)
  if (!t) { return { error: 'THREAD_NOT_FOUND' } }
  if (t.kind !== 'outreach') { return { error: 'NOT_DIRECT' } }
  const pageId = ((page && page.pageId) || '').trim()
  if (!pageId) { return { error: 'MISSING_TOOL' } }
  if (!t.sharedPages) { t.sharedPages = [] }
  if (!t.sharedPages.some(p => p.pageId === pageId)) {
    t.sharedPages.push({ pageId: pageId, title: ((page.title || '').trim()) || pageId })
  }
  return { success: true, sharedPages: enrichShared(t).sharedPages }
}

async function removeThreadSharedPage (threadId, pageId) {
  // SQL SEAM: verify caller is a party; DELETE FROM thread_shared_page WHERE thread_id=? AND page_id=?
  const t = threads.find(x => x.id === threadId)
  if (!t) { return { error: 'THREAD_NOT_FOUND' } }
  if (t.kind !== 'outreach') { return { error: 'NOT_DIRECT' } }
  const id = (pageId || '').trim()
  if (t.sharedPages) { t.sharedPages = t.sharedPages.filter(p => p.pageId !== id) }
  return { success: true, sharedPages: enrichShared(t).sharedPages }
}

// ── Connections (1:1, mutual accept) ─────────────────────────────────────────

// Can `fromId` initiate contact with `toId` under the cross-org policy? Same firm
// is always allowed; an unknown recipient (e.g. an external id) is not blocked in
// the mock. Used by the connection/outreach/profile guards.
async function canReachAdvisor (fromId, toId) {
  const from = advisors.find(a => a.id === fromId)
  const to = advisors.find(a => a.id === toId)
  if (!from || !to) { return true }
  return canReach(from, to)
}

async function getOrgPosture (firm) {
  // SQL SEAM: SELECT posture FROM org_posture_firm WHERE firm = ? (default from config).
  // Firm-level scope — used by the Profile posture indicator.
  return orgPostureFor(firm)
}

async function setOrgPosture (firm, posture) {
  // SQL SEAM: UPSERT org_posture_firm(firm, posture). Firm-level write. The
  // tier-scoped manager entry point is setFirmPosture (below), which routes the
  // write to the caller's OWN level and is guarded to a managing tier.
  if (posture !== 'open' && posture !== 'closed') { return { error: 'BAD_POSTURE' } }
  postures.firm[firm] = posture
  return { firm: firm, posture: posture }
}

// ── Managers (role hierarchy · Q-ROLES) ──────────────────────────────────────
// RBAC SEAM: "is this advisor a Firm Manager?" Kept for back-compat; the console
// and view-as now gate on isManager (any managing tier) via the roles resolver.
function isFirmManager (advisorId) {
  const a = advisors.find(x => x.id === advisorId)
  return !!(a && a.firmManager)
}

// "Is this advisor a manager of anyone?" — true for any managing tier
// (mentor/global/group/firm), resolved through roles.js (Q-ROLES). Everything
// manager-gated (the console, view-as) funnels through here.
function isManager (advisorId) {
  const a = advisors.find(x => x.id === advisorId)
  return roles.isManagerTier(roles.resolveTier(a))
}

// May `manager` see/act on `target` per the resolved hierarchy + scope (roles.js)?
// `manager`/`target` are advisor RECORDS (the routes already hold them). Firm
// Manager ⇒ same firm; Group Manager ⇒ same country; Global/Mentor ⇒ all.
function canManage (manager, target) {
  return roles.canManage(manager, target)
}

// Platform super-admin (Q-ROLES): the Mentor tier. Gates the network-wide audit
// viewer (FEAT-AUDIT-UI) — lower tiers see only their own scope's activity in the
// console, never the whole trail.
function isAdmin (advisorId) {
  const a = advisors.find(x => x.id === advisorId)
  return roles.resolveTier(a) === 'mentor'
}

// A display label for an actor id (their name, or the id if unknown) — used to
// enrich audit entries, which store ids only (privacy: no names persisted).
function advisorLabel (advisorId) {
  const a = advisors.find(x => x.id === advisorId)
  return a ? a.name : advisorId
}

// The Firm Manager console payload: the manager's firm, its advisers (with each
// one's availability + whether they've blocked the manager view), headline stats,
// and the pending join requests to the firm's groups. Read-only assembly over the
// in-memory store; activity/audit is added by the route from server/data/auditLog.
// The grouping levels each tier rolls up, top to bottom (Q-ROLES / plan §5). A
// manager shows the level immediately below them, drilling down to advisers.
const CONSOLE_LEVELS = {
  mentor: ['globalGroup', 'country', 'firm'],
  global_manager: ['country', 'firm'],
  group_manager: ['firm'],
  firm_manager: [] // leaf: advisers directly (the base console)
}

// Assemble the console payload for a given manager record. Scope = the advisers the
// manager oversees (roles.canManage). ONE shape serves every tier; the frontend
// labels itself from `scope.tier` and renders the cascade from `tree`. `me` may be a
// real advisor OR a synthetic demo manager (preview) — it needs id/name + its
// place in the tree (globalGroup/country/firm/tier).
function buildConsole (me) {
  const firm = me.firm
  const managed = advisors.filter(a => roles.canManage(me, a))
  const managedIds = new Set(managed.map(a => a.id))
  const managedGroups = groups.filter(g => (g.members || []).some(m => managedIds.has(m.id)))
  const managedGroupIds = new Set(managedGroups.map(g => g.id))
  const approvals = groupJoinRequests
    .filter(r => r.status === 'requested' && managedGroupIds.has(r.groupId))
    .map((r) => {
      const adv = advisors.find(a => a.id === r.advisorId) || { id: r.advisorId, name: r.advisorId, firm: '' }
      const g = groups.find(x => x.id === r.groupId)
      return { id: r.id, advisor: { id: adv.id, name: adv.name, firm: adv.firm }, groupId: r.groupId, groupName: g ? g.name : r.groupId }
    })
  const tier = roles.resolveTier(me)
  const levels = CONSOLE_LEVELS[tier] || []
  const crossOrg = crossOrgStateFor(me)
  return {
    firm,
    // The manager's tier + where they sit in the tree (Q-ROLES). The frontend uses
    // `scope.tier` to pick the title / scope chip / subtitle for the view.
    scope: { tier, globalGroup: me.globalGroup, country: me.country, firm: me.firm },
    manager: { id: me.id, name: me.name },
    stats: {
      globalGroups: new Set(managed.map(a => a.globalGroup)).size,
      // A "group" is a brand's country unit (e.g. Advisor-e Germany vs BDO Germany
      // are two groups) — so count distinct globalGroup+country pairs, not countries.
      orgGroups: new Set(managed.map(a => a.globalGroup + '||' + a.country)).size,
      firms: new Set(managed.map(a => a.firm)).size,
      advisers: managed.length,
      groups: managedGroups.length, // specialty (SIG) collaboration groups
      pendingApprovals: approvals.length,
      // The manager's EFFECTIVE cross-org state (their own level capped by any
      // stricter level above) — what the console tile/summary shows.
      crossOrgPosture: crossOrg.effective
    },
    // The three-level cross-org control for this manager: own level, inherited
    // ceiling, effective result, and which level (if any) is capping an Open choice.
    crossOrg,
    // Flat adviser table — ONLY the Firm tier (one bounded branch). Higher tiers
    // ship the tree of COUNTS and lazy-load each branch's advisers on expand
    // (listConsoleAdvisers), so the payload never scales with the subtree size
    // (~1,700 branches at a real brand) — PERF-CONSOLE-TREE.
    advisers: levels.length ? [] : managed.map(a => consoleAdviserRow(a, me.id)),
    // The cascading roll-up for higher tiers (null at the Firm tier). COUNTS ONLY —
    // no adviser rows at the leaves; a branch's advisers are fetched on demand.
    tree: levels.length ? buildBreakdown(managed, levels) : null,
    approvals
  }
}

// One adviser row for the console (id / name / status / group count). Module-level
// so the lazy per-branch loader and buildConsole share the exact same shape.
function consoleGroupCount (id) {
  return groups.filter(g => (g.members || []).some(m => m.id === id)).length
}
function consoleAdviserRow (a, meId) {
  return {
    id: a.id, name: a.name, title: a.title, available: !!a.available,
    blocked: !!a.blockFirmManagerView, isMe: a.id === meId,
    groupCount: consoleGroupCount(a.id), lastActive: a.lastActive || null
  }
}

// Recursively roll `list` up by `levels` (e.g. ['globalGroup','country','firm']).
// Each node: { level, value, label, advisers (count), childLevel, childCount,
// children[] }. The leaf (a branch) carries counts only — its advisers are loaded
// on expand via listConsoleAdvisers (PERF-CONSOLE-TREE), never inlined here.
function buildBreakdown (list, levels) {
  if (!levels.length) { return {} } // leaf branch — advisers fetched on demand
  const head = levels[0]
  const rest = levels.slice(1)
  const buckets = new Map()
  list.forEach((a) => {
    const v = a[head] || '—'
    if (!buckets.has(v)) { buckets.set(v, []) }
    buckets.get(v).push(a)
  })
  const children = Array.from(buckets.keys()).sort().map((v) => {
    const grp = buckets.get(v)
    const childLevel = rest[0] || 'advisor'
    const childCount = rest.length ? new Set(grp.map(a => a[rest[0]])).size : grp.length
    return Object.assign(
      { level: head, value: v, label: v, advisers: grp.length, childLevel, childCount },
      buildBreakdown(grp, rest)
    )
  })
  return { children }
}

// Lazy per-branch adviser loader (PERF-CONSOLE-TREE): the advisers a manager
// oversees WITHIN one firm/branch, paginated. Re-checks scope every call
// (roles.canManage), so a firm outside the manager's scope simply yields nobody —
// the client only sends the `firm` filter, never a scope it could widen.
function consoleAdvisersForScope (me, firm, opts) {
  const o = opts || {}
  const all = advisors.filter(a => a.firm === firm && roles.canManage(me, a))
  const offset = o.offset > 0 ? o.offset : 0
  const limit = o.limit > 0 ? o.limit : 100
  return { firm: firm, total: all.length, advisers: all.slice(offset, offset + limit).map(a => consoleAdviserRow(a, me.id)) }
}

async function listConsoleAdvisers (managerId, firm, opts) {
  // SQL SEAM: SELECT advisers WHERE firm=? AND <in manager's managed scope> LIMIT/OFFSET.
  const me = advisors.find(a => a.id === managerId)
  if (!me || !roles.isManagerTier(roles.resolveTier(me))) { return { error: 'NOT_MANAGER' } }
  return consoleAdvisersForScope(me, firm, opts)
}

// Is an audit actor within a console scope? Used to scope the activity feed without
// shipping the (potentially huge) managed set to the client — rebuilds a pseudo
// manager from the server-produced `scope` and re-checks canManage.
function actorInScope (scope, actorId) {
  if (!scope) { return false }
  const act = advisors.find(a => a.id === actorId)
  if (!act) { return false }
  return roles.canManage({ tier: scope.tier, globalGroup: scope.globalGroup, country: scope.country, firm: scope.firm }, act)
}

async function getFirmConsole (managerId) {
  // SQL SEAM: JOINs over advisor(+interest), group_member, group_join_request scoped
  // to the manager's managed set. Guarded to a managing tier (Q-ROLES).
  const me = advisors.find(a => a.id === managerId)
  if (!me) { return { error: 'NOT_FOUND' } }
  if (!roles.isManagerTier(roles.resolveTier(me))) { return { error: 'NOT_MANAGER' } }
  return buildConsole(me)
}

// ── Console previews (show-home only; the route is dev-gated) ─────────────────
// Render the console AS a seeded demo manager of a given tier, so each tier's view
// can be previewed without a real login. PRODUCTION collapses to the single
// role-gated page (getFirmConsole) — these demo personas are never reachable there.
// Fixed synthetic personas positioned in the tree so each tier's roll-up is
// demonstrable: group = head of Advisor-e Germany (its branches), global = head of
// the Advisor-e brand (its countries), mentor = the whole network (all brands).
const DEMO_MANAGERS = {
  group: () => ({ id: 'demo-group', name: 'Demo Group Manager', title: 'Head of Advisor-e Germany', globalGroup: 'Advisor-e', country: 'DE', firm: 'Advisor-e Germany', tier: 'group_manager' }),
  global: () => ({ id: 'demo-global', name: 'Demo Global Manager', title: 'Head of Advisor-e', globalGroup: 'Advisor-e', country: 'DE', firm: 'Advisor-e', tier: 'global_manager' }),
  mentor: () => ({ id: 'demo-mentor', name: 'Demo Mentor', title: 'Mentor', globalGroup: 'Advisor-e', country: 'DE', firm: '—', tier: 'mentor' })
}

async function getConsolePreview (tier) {
  const resolver = DEMO_MANAGERS[tier]
  const me = resolver ? resolver() : null
  if (!me || !roles.isManagerTier(roles.resolveTier(me))) { return { error: 'NOT_FOUND' } }
  return buildConsole(me)
}

// Lazy per-branch adviser loader for a PREVIEW tier (show-home; dev-gated in the
// route). Same shape as listConsoleAdvisers, scoped to the demo manager for the tier.
async function listConsoleAdvisersPreview (tier, firm, opts) {
  const resolver = DEMO_MANAGERS[tier]
  const me = resolver ? resolver() : null
  if (!me || !roles.isManagerTier(roles.resolveTier(me))) { return { error: 'NOT_FOUND' } }
  return consoleAdvisersForScope(me, firm, opts)
}

// A manager sets the cross-org posture at their OWN tier level — a Firm Manager
// the branch, a Group Manager their country, a Global Manager/Mentor the brand
// (postureScopeFor). ONE key is written; a lower level may only tighten, and the
// returned crossOrgPosture is the EFFECTIVE state (their choice capped by any
// stricter level above). Guarded to a managing tier (Q-ROLES); the write itself is
// scoped to what this manager controls, so it can never touch a sibling or parent.
async function setFirmPosture (managerId, posture) {
  const me = advisors.find(a => a.id === managerId)
  if (!me || !roles.isManagerTier(roles.resolveTier(me))) { return { error: 'NOT_MANAGER' } }
  if (posture !== 'open' && posture !== 'closed') { return { error: 'BAD_POSTURE' } }
  const scope = postureScopeFor(me)
  postures[scope.level][scope.key] = posture
  const crossOrg = crossOrgStateFor(me)
  return { success: true, firm: me.firm, level: scope.level, scope: scope.key, own: posture, crossOrgPosture: crossOrg.effective, crossOrg }
}

async function requestConnection (fromId, toId) {
  // SQL SEAM: INSERT INTO connection (requester_id, addressee_id, 'pending') ON DUPLICATE KEY UPDATE …
  if (fromId === toId) { return null }
  // Cross-org wall: refuse a new cross-firm request unless both firms have opted in.
  if (!(await canReachAdvisor(fromId, toId))) { return { error: 'CROSS_ORG_BLOCKED' } }
  let c = connections.find(x => (x.requesterId === fromId && x.addresseeId === toId) || (x.requesterId === toId && x.addresseeId === fromId))
  if (!c) {
    c = { id: 'c-' + (connSeq++), requesterId: fromId, addresseeId: toId, status: 'pending' }
    connections.push(c)
    // Notify the addressee of the new request (recipient = the OTHER party).
    pushNotification(toId, 'connection_request', { name: advisorName(fromId) }, '/connecting')
  }
  return c
}

async function listConnections (myId) {
  // SQL SEAM: SELECT * FROM connection WHERE requester_id=? OR addressee_id=? (join Advisory identity)
  const enrich = (c) => {
    const otherId = c.requesterId === myId ? c.addresseeId : c.requesterId
    return { id: c.id, status: c.status, advisor: advisors.find(x => x.id === otherId) || { id: otherId, name: otherId } }
  }
  const mine = connections.filter(c => c.requesterId === myId || c.addresseeId === myId)
  // Groups the user belongs to, each with its OTHER members (so they can see who
  // else is in a group they've joined). 1:1 connections are separate (above).
  const myGroups = groups
    .filter(g => (g.members || []).some(m => m.id === myId))
    .map(g => ({ id: g.id, name: g.name, icon: g.icon, members: (g.members || []).filter(m => m.id !== myId) }))
  return {
    incoming: mine.filter(c => c.status === 'pending' && c.addresseeId === myId).map(enrich),
    outgoing: mine.filter(c => c.status === 'pending' && c.requesterId === myId).map(enrich),
    connected: mine.filter(c => c.status === 'accepted').map(enrich),
    groups: myGroups
  }
}

// ── Unified "Connecting" inbox (Q-CONN-MSG-IA → Option B) ─────────────────────
/**
 * Compose ONE merged list for the unified "Connecting" screen: conversations
 * (1:1 + group threads), pending connection requests, connected people, and
 * group rooms — each row tagged with `type` so the frontend can filter
 * (chat / group / invitation / connection / request-*) without a second
 * round-trip. A person who is both a connection AND already has a 1:1 thread
 * collapses to a single (chat) row rather than appearing twice.
 *
 * SQL SEAM: the real query builds the same shape from the thread/connection/group
 *   tables and ORDER BYs a real activity timestamp. The mock has no timestamps,
 *   so order follows the threads' existing (newest-first) array order, then
 *   requests, connections and groups — `lastActivity` is omitted here, not faked.
 * AUTH SEAM (SEC-THREAD-ACL): this reuses listThreads, which in the mock returns
 *   ALL threads; once real auth lands the seam scopes threads to `myId`.
 * @param {string} myId viewer advisor id
 * @returns {Promise<{rows: object[], counts: object}>} merged rows + per-type counts
 */
async function listConnecting (myId) {
  const rows = []
  const oneToOneByPerson = {} // advisorId -> chat row (for de-dup + enrichment)
  const groupByGroupId = {} // groupId -> group row (for de-dup + enrichment)

  // 1) Conversations first (threads are already newest-first in the mock).
  for (const t of await listThreads(myId)) {
    if (t.kind === 'group') {
      const row = { type: 'group', rowKey: 'thread:' + t.id, threadId: t.id, groupId: t.withId, name: t.withName, subtitle: t.lastText || '', status: t.status }
      groupByGroupId[t.withId] = row
      rows.push(row)
    } else if (t.kind === 'invitation') {
      rows.push({ type: 'invitation', rowKey: 'thread:' + t.id, threadId: t.id, groupId: t.withId, name: t.withName, subtitle: t.lastText || '', status: t.status, direction: t.direction })
    } else {
      const row = { type: 'chat', rowKey: 'thread:' + t.id, threadId: t.id, advisorId: t.withId, name: t.withName, subtitle: t.lastText || '', status: t.status, direction: t.direction }
      if (t.withId) { oneToOneByPerson[t.withId] = row }
      rows.push(row)
    }
  }

  const conns = await listConnections(myId)

  // 2) Pending requests — actionable (accept/decline or ⏳), surfaced even without a thread.
  for (const c of conns.incoming) {
    rows.push({ type: 'request-incoming', rowKey: 'conn:' + c.id, connectionId: c.id, advisorId: c.advisor.id, name: c.advisor.name, subtitle: c.advisor.firm || '', firm: c.advisor.firm || '', strengths: c.advisor.strengths || [] })
  }
  for (const c of conns.outgoing) {
    rows.push({ type: 'request-outgoing', rowKey: 'conn:' + c.id, connectionId: c.id, advisorId: c.advisor.id, name: c.advisor.name, subtitle: c.advisor.firm || '', firm: c.advisor.firm || '' })
  }

  // 3) Connected people: enrich an existing chat row, else add a standalone
  //    connection row so the viewer can start the conversation.
  for (const c of conns.connected) {
    const existing = oneToOneByPerson[c.advisor.id]
    if (existing) {
      existing.connectionId = c.id
      existing.firm = c.advisor.firm || ''
      existing.strengths = c.advisor.strengths || []
    } else {
      rows.push({ type: 'connection', rowKey: 'conn:' + c.id, connectionId: c.id, advisorId: c.advisor.id, name: c.advisor.name, subtitle: c.advisor.firm || '', firm: c.advisor.firm || '', strengths: c.advisor.strengths || [] })
    }
  }

  // 4) Groups the viewer belongs to: enrich an existing group thread row, else add
  //    a group row (threadId null → the room opens/creates on first message).
  for (const g of conns.groups) {
    const existing = groupByGroupId[g.id]
    if (existing) {
      existing.icon = g.icon
      existing.members = g.members
    } else {
      rows.push({ type: 'group', rowKey: 'group:' + g.id, threadId: null, groupId: g.id, name: g.name, icon: g.icon, subtitle: '', members: g.members })
    }
  }

  // 5) Groups the viewer asked to join but isn't in yet → a pending "Group request"
  //    row (under the Requests tab) so the viewer has a record of it.
  for (const req of groupJoinRequests) {
    if (req.advisorId !== myId) { continue }
    const g = groups.find(x => x.id === req.groupId)
    if (!g || (g.members || []).some(m => m.id === myId)) { continue } // gone / already joined
    rows.push({ type: 'group-request', rowKey: 'gjr:' + g.id, groupId: g.id, name: g.name, icon: g.icon, subtitle: '' })
  }

  const countBy = type => rows.filter(r => r.type === type).length
  return {
    rows: rows,
    counts: {
      all: rows.length,
      chats: countBy('chat'),
      groups: countBy('group'),
      invitations: countBy('invitation'),
      connections: countBy('connection'),
      requests: countBy('request-incoming') + countBy('request-outgoing') + countBy('group-request')
    }
  }
}

async function respondConnection (connId, myId, accept) {
  // SQL SEAM: UPDATE connection SET status=? WHERE id=? AND addressee_id=? AND status='pending'
  const c = connections.find(x => x.id === connId)
  if (!c || c.addresseeId !== myId || c.status !== 'pending') { return null }
  c.status = accept ? 'accepted' : 'declined'
  return c
}

// ── Marketplace (group-owned IP; record-only transactions, no Advisory fee) ───

// Deep-link an OWNED tool to its Advisor-e page (Q-PAGE-URL seam). Only owned
// listings get a URL — "open what you own"; Advisor-e still enforces its own access.
function openUrlFor (listing, owned) {
  return owned && listing.pageId ? (ADVISOR_E.pageBaseUrl + listing.pageId) : null
}

// Cross-org wall for the marketplace (plan §8: the toggle gates marketplace too, so
// a sealed org is genuinely sealed). A listing is reachable to a viewer when it is
// ALREADY OWNED (you keep what you bought), their OWN listing, or the viewer can
// reach the listing owner's org (canReach — same branch, or both orgs effectively
// open). An owner we can't resolve (external/legacy) is not blocked, and an
// unresolved viewer (dev) is not filtered — mirrors canReachAdvisor's leniency.
function canReachListing (viewer, listing, owned) {
  if (owned) { return true }
  if (!viewer) { return true }
  if (!listing.createdById || listing.createdById === viewer.id) { return true }
  const owner = advisors.find(a => a.id === listing.createdById)
  if (!owner) { return true }
  return canReach(viewer, owner)
}

async function listListings (myId) {
  // SQL SEAM: SELECT listing (+ tags) ; owned = EXISTS(purchase by myId) ; then the
  // §8 cross-org filter (in SQL: JOIN the owner's org posture; keep owned/own/reachable).
  const viewer = advisors.find(a => a.id === myId) || null
  return listings
    .map(l => ({ l, owned: purchases.some(p => p.listingId === l.id && p.buyerId === myId) }))
    .filter(({ l, owned }) => canReachListing(viewer, l, owned))
    .map(({ l, owned }) => Object.assign({}, l, { owned: owned, openUrl: openUrlFor(l, owned) }))
}

async function getListing (id, myId) {
  // SQL SEAM: SELECT listing WHERE id=? (+ owned flag)
  const l = listings.find(x => x.id === id)
  if (!l) { return null }
  const owned = purchases.some(p => p.listingId === l.id && p.buyerId === myId)
  const viewer = advisors.find(a => a.id === myId) || null
  // Cross-org wall (§8): a sealed listing behaves as not-found — don't reveal it.
  if (!canReachListing(viewer, l, owned)) { return null }
  return Object.assign({}, l, { owned: owned, openUrl: openUrlFor(l, owned) })
}

async function createListing (input, creator) {
  // SQL SEAM: INSERT INTO marketplace_listing (…, page_id); INSERT marketplace_listing_tag rows
  const title = (input.title || '').trim()
  if (!title) { return null }
  const l = {
    id: 'm-' + (listingSeq++), title: title, summary: (input.summary || '').trim(),
    // Read-only link to the Advisor-e-hosted page (the `link`/page ID from the
    // master catalogue). The route validates it exists before we get here.
    pageId: (input.pageId || '').trim() || null,
    groupId: input.groupId || null, groupName: input.groupName || '',
    tags: Array.isArray(input.tags) ? input.tags : [],
    price: ((input.price || '').trim()) || 'Free',
    createdBy: creator.name + ' (' + creator.firm + ')',
    createdById: creator.id, // owner id — drives the §8 cross-org gate + seller notify
    ipTier: 4 // group-owned IP (plan §6)
  }
  listings.unshift(l)
  return l
}

async function recordPurchase (listingId, buyerId) {
  // SQL SEAM: INSERT INTO marketplace_purchase (listing_id, buyer_id) ON DUPLICATE KEY UPDATE …
  //   Record-only: Advisory takes no fee and is not party to the transaction — this row is the
  //   analytics record. The buyer gains an unlimited-client usage licence + ongoing updates;
  //   ownership stays with the group (plan §3d).
  const l = listings.find(x => x.id === listingId)
  if (!l) { return null }
  const alreadyOwned = purchases.some(p => p.listingId === listingId && p.buyerId === buyerId)
  // Cross-org wall (§8): refuse a purchase across a sealed org boundary.
  const viewer = advisors.find(a => a.id === buyerId) || null
  if (!canReachListing(viewer, l, alreadyOwned)) { return { error: 'CROSS_ORG_BLOCKED' } }
  if (!purchases.some(p => p.listingId === listingId && p.buyerId === buyerId)) {
    purchases.push({ id: 'p-' + (purchases.length + 1), listingId: listingId, buyerId: buyerId })
    // Notify the listing's creator (the seller) — record-only, informational.
    if (l.createdById) {
      pushNotification(l.createdById, 'purchase', { buyer: advisorName(buyerId), tool: l.title }, '/marketplace')
    }
  }
  return { success: true, owned: true }
}

// ── Notifications (read side) ────────────────────────────────────────────────

async function listNotifications (userId) {
  // SQL SEAM: SELECT * FROM notification WHERE user_id=? ORDER BY created_at DESC LIMIT 50
  const mine = notifications.filter(n => n.userId === userId)
  return { items: mine, unread: mine.filter(n => !n.read).length }
}

async function markNotificationsRead (userId) {
  // SQL SEAM: UPDATE notification SET is_read=1 WHERE user_id=? AND is_read=0
  let marked = 0
  notifications.forEach((n) => {
    if (n.userId === userId && !n.read) { n.read = true; marked++ }
  })
  return { success: true, marked: marked }
}

// ── Dev-only persistence (see ./devStore) ────────────────────────────────────
// The store above is seeded demo data held in memory, so a restart forgets both
// the people and any decision a manager made about them. In DEVELOPMENT ONLY the
// whole store is snapshotted to a gitignored JSON file after each change and read
// back on boot. Production reads and writes nothing — durable storage is MySQL,
// via the "SQL SEAM" notes above. devStore's docblock carries the full reasoning.

const devStore = require('./devStore')

/**
 * The whole store as one plain object. The `seq` counters travel WITH the
 * collections and are not an afterthought: restore the rows without them and the
 * next created row reuses an id that is already taken.
 * @returns {Object}
 */
function _snapshot () {
  return {
    advisors: advisors,
    groups: groups,
    threads: threads,
    connections: connections,
    groupJoinRequests: groupJoinRequests,
    listings: listings,
    purchases: purchases,
    notifications: notifications,
    postures: postures,
    seq: { threadSeq: threadSeq, connSeq: connSeq, gjrSeq: gjrSeq, listingSeq: listingSeq, notifSeq: notifSeq }
  }
}

/** Replace an array's contents in place — the collections are `const`. */
function _replaceArray (target, next) {
  if (!Array.isArray(next)) { return }
  target.splice(0, target.length, ...next)
}

/**
 * Load a saved snapshot over the seeded store. Absent, unreadable or malformed
 * leaves the seed exactly as it is.
 *
 * Postures MERGE per level rather than replacing the level wholesale, so a brand
 * or branch added to the seed after a snapshot was written is not silently lost
 * from a developer's network.
 * @returns {boolean} whether a snapshot was applied
 */
function _hydrate () {
  const saved = devStore.load()
  if (!saved) { return false }
  _replaceArray(advisors, saved.advisors)
  _replaceArray(groups, saved.groups)
  _replaceArray(threads, saved.threads)
  _replaceArray(connections, saved.connections)
  _replaceArray(groupJoinRequests, saved.groupJoinRequests)
  _replaceArray(listings, saved.listings)
  _replaceArray(purchases, saved.purchases)
  _replaceArray(notifications, saved.notifications)
  if (saved.postures && typeof saved.postures === 'object') {
    Object.keys(postures).forEach((level) => {
      const next = saved.postures[level]
      if (next && typeof next === 'object' && !Array.isArray(next)) { Object.assign(postures[level], next) }
    })
  }
  const seq = saved.seq || {}
  if (Number.isInteger(seq.threadSeq)) { threadSeq = seq.threadSeq }
  if (Number.isInteger(seq.connSeq)) { connSeq = seq.connSeq }
  if (Number.isInteger(seq.gjrSeq)) { gjrSeq = seq.gjrSeq }
  if (Number.isInteger(seq.listingSeq)) { listingSeq = seq.listingSeq }
  if (Number.isInteger(seq.notifSeq)) { notifSeq = seq.notifSeq }
  return true
}

/**
 * Every export that CHANGES the store. Each is wrapped below so the snapshot is
 * written after it returns — one list to keep right, instead of a save call
 * sprinkled through 21 mutation sites where a missed one is silent data loss.
 *
 * NAMING RULE, enforced by tests/collaborate/devStore.test.js: a function that
 * changes the store is named with one of the verbs in MUTATING_VERBS. Add a
 * mutator without adding it here and that test fails.
 */
const MUTATING_VERBS = ['create', 'update', 'set', 'add', 'remove', 'respond', 'request', 'append', 'record', 'mark', 'invite', 'findOrCreate']

const MUTATORS = [
  'updateAdvisorInterest',
  'createGroup', 'requestJoinGroup', 'respondJoinRequest',
  'addGroupSharedPage', 'removeGroupSharedPage',
  'inviteToGroup', 'inviteManyToGroup', 'respondInvitation',
  'appendMessage', 'createOutreachThread', 'findOrCreateGroupThread', 'findOrCreateDirectThread',
  'addThreadSharedPage', 'removeThreadSharedPage',
  'requestConnection', 'respondConnection',
  'createListing', 'recordPurchase',
  'markNotificationsRead',
  'setOrgPosture', 'setFirmPosture'
]

const api = {
  getAdvisorById, listAdvisors, updateAdvisorInterest,
  listGroups, getGroupById, createGroup, requestJoinGroup, groupJoinStatus,
  listGroupJoinRequests, respondJoinRequest, addGroupSharedPage, removeGroupSharedPage,
  listManageableGroups, inviteToGroup, inviteManyToGroup, respondInvitation,
  listThreads, getThreadById, appendMessage, createOutreachThread, findOrCreateGroupThread, findOrCreateDirectThread, hasOutgoingOutreach, countOutgoingOutreachSince,
  addThreadSharedPage, removeThreadSharedPage,
  requestConnection, listConnections, listConnecting, respondConnection,
  listListings, getListing, createListing, recordPurchase,
  listNotifications, markNotificationsRead,
  canReachAdvisor, getOrgPosture, setOrgPosture,
  isFirmManager, isManager, isAdmin, advisorLabel, canManage, getFirmConsole, getConsolePreview, setFirmPosture,
  listConsoleAdvisers, listConsoleAdvisersPreview, actorInScope
}

// Wrap the mutators. Every one is async, so the wrapper awaits and returns the
// SAME value — the routes and their tests cannot tell the difference. The save
// happens after the change lands, never before, so a rejected call writes nothing.
MUTATORS.forEach((name) => {
  const fn = api[name]
  api[name] = async function (...args) {
    const result = await fn.apply(this, args)
    if (devStore.isEnabled()) { devStore.save(_snapshot()) }
    return result
  }
})

_hydrate()

module.exports = api

// Internals, exported for the tests that prove the snapshot round-trips.
module.exports._snapshot = _snapshot
module.exports._hydrate = _hydrate
module.exports._MUTATORS = MUTATORS
module.exports._MUTATING_VERBS = MUTATING_VERBS
