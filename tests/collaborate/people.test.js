'use strict'

/**
 * Tests for the people-layer routes (server/routes/people.js).
 *
 * Handlers are thin async wrappers over server/data/repository.js. They are called
 * directly with a mock req/res (no restify server is started) — the same pattern as
 * tests/templates.test.js. `res.send` records [status, body].
 *
 * The repository is an in-memory module with mutable seed data, so each test runs
 * against a FRESH copy via jest.resetModules() in beforeEach — tests are therefore
 * order-independent and never leak state into one another.
 *
 * Covers, for every handler, the success path plus each error/guard branch the
 * route maps (400/403/404/409). A page ID known to exist in the read-only Advisory
 * snapshot is used for the marketplace create-validation happy path.
 */

// A page ID known to exist in the Advisory snapshot (see tests/templates.test.js).
const KNOWN_PAGE_ID = 'id-4466260146'

let route

beforeEach(() => {
  jest.resetModules()
  route = require('../../server/collaborate/routes/people')
})

function mkRes () { return { send: jest.fn() } }
// A response that also captures Set-Cookie (for the view-as cookie tests).
function mkResH () { return { send: jest.fn(), setHeader: jest.fn() } }
function setCookieOf (res) { return (res.setHeader.mock.calls.find(c => c[0] === 'Set-Cookie') || [])[1] || '' }
// Return [status, body] of the first res.send call.
function sent (res) { return res.send.mock.calls[0] }

describe('me', () => {
  test('getMe returns the logged-in advisor', async () => {
    const res = mkRes()
    await route.getMe({}, res)
    const [status, body] = sent(res)
    expect(status).toBe(200)
    expect(body).toEqual(expect.objectContaining({ id: 'me', name: 'Mike Barnes' }))
  })

  test('getMe falls back to a placeholder when the identity is unknown', async () => {
    const res = mkRes()
    await route.getMe({ identity: { advisorId: 'ghost' } }, res)
    const [status, body] = sent(res)
    expect(status).toBe(200)
    // The placeholder firm 'Advisor-e' is opted-in, so posture resolves to 'open'.
    expect(body).toEqual({ id: 'ghost', name: 'You', firm: 'Advisor-e', crossOrgPosture: 'closed', viewingAs: null })
  })

  test('updateMe applies advertised-interest fields and returns the updated advisor', async () => {
    const res = mkRes()
    await route.updateMe({ body: { available: false, about: 'Updated bio' } }, res)
    const [status, body] = sent(res)
    expect(status).toBe(200)
    expect(body.available).toBe(false)
    expect(body.about).toBe('Updated bio')
  })

  test('updateMe returns the current advisor when there is nothing to update against', async () => {
    const res = mkRes()
    await route.updateMe({ identity: { advisorId: 'ghost' }, body: { available: true } }, res)
    const [status, body] = sent(res)
    expect(status).toBe(200)
    expect(body).toEqual(expect.objectContaining({ id: 'ghost', name: 'You' }))
  })
})

describe('advisors', () => {
  test('listAdvisors excludes the viewer and carries a connectionStatus', async () => {
    const res = mkRes()
    await route.listAdvisors({ query: {} }, res)
    const [status, body] = sent(res)
    expect(status).toBe(200)
    expect(body.some(a => a.id === 'me')).toBe(false)
    expect(body.every(a => typeof a.connectionStatus === 'string')).toBe(true)
  })

  test('listAdvisors filters by search term', async () => {
    const res = mkRes()
    await route.listAdvisors({ query: { q: 'seafood' } }, res)
    const [, body] = sent(res)
    expect(body.length).toBeGreaterThan(0)
    expect(body.some(a => a.id === 'anna-r')).toBe(true)
  })

  test('listAdvisors availableOnly hides unavailable advisors', async () => {
    const res = mkRes()
    await route.listAdvisors({ query: { available: 'true' } }, res)
    const [, body] = sent(res)
    expect(body.every(a => a.available === true)).toBe(true)
    expect(body.some(a => a.id === 'anna-r')).toBe(false) // anna is unavailable
  })

  test('getAdvisor returns a known advisor', async () => {
    const res = mkRes()
    await route.getAdvisor({ params: { id: 'bob-lindt' } }, res)
    const [status, body] = sent(res)
    expect(status).toBe(200)
    expect(body.name).toBe('Bob Lindt')
  })

  test('getAdvisor 404s for an unknown id', async () => {
    const res = mkRes()
    await route.getAdvisor({ params: { id: 'nobody' } }, res)
    const [status, body] = sent(res)
    expect(status).toBe(404)
    expect(body.error.code).toBe('NOT_FOUND')
  })
})

describe('groups', () => {
  test('listGroups returns listed groups and filters by q', async () => {
    const all = mkRes()
    await route.listGroups({ query: {} }, all)
    expect(sent(all)[1].length).toBeGreaterThan(0)

    const filtered = mkRes()
    await route.listGroups({ query: { q: 'tax' } }, filtered)
    expect(sent(filtered)[1].some(g => g.id === 'tax-automation')).toBe(true)
  })

  test('getGroup returns a group / 404s for unknown', async () => {
    const okRes = mkRes()
    await route.getGroup({ params: { id: 'seafood-modelling' } }, okRes)
    expect(sent(okRes)[0]).toBe(200)

    const missing = mkRes()
    await route.getGroup({ params: { id: 'no-group' } }, missing)
    expect(sent(missing)[0]).toBe(404)
  })

  test('getGroup exposes the shared workspace as Advisor-e deep-links', async () => {
    const res = mkRes()
    await route.getGroup({ params: { id: 'seafood-modelling' } }, res)
    const body = sent(res)[1]
    expect(body.sharedPages.length).toBeGreaterThan(0)
    // Each shared page carries an openUrl built from the seam base + its pageId.
    expect(body.sharedPages[0].openUrl).toMatch(/^https?:\/\//)
    expect(body.sharedPages[0].openUrl).toContain(body.sharedPages[0].pageId)
  })

  test('a member can add a catalogue tool to the group Shared workspace', async () => {
    const res = mkRes()
    await route.addSharedPage({ params: { id: 'seafood-modelling' }, body: { pageId: KNOWN_PAGE_ID, title: 'Added Tool' } }, res)
    const body = sent(res)[1]
    expect(body.success).toBe(true)
    const added = body.sharedPages.find(p => p.pageId === KNOWN_PAGE_ID)
    expect(added).toBeTruthy()
    expect(added.openUrl).toContain(KNOWN_PAGE_ID) // it's a real deep-link
  })

  test('addSharedPage rejects a missing tool, an unknown tool, and a non-member', async () => {
    const noTool = mkRes()
    await route.addSharedPage({ params: { id: 'seafood-modelling' }, body: {} }, noTool)
    expect(sent(noTool)[0]).toBe(400)
    expect(sent(noTool)[1].error.code).toBe('MISSING_TOOL')

    const unknown = mkRes()
    await route.addSharedPage({ params: { id: 'seafood-modelling' }, body: { pageId: 'id-0000000000' } }, unknown)
    expect(sent(unknown)[0]).toBe(400)
    expect(sent(unknown)[1].error.code).toBe('UNKNOWN_TOOL')

    const notMember = mkRes()
    // me is not a member of tax-automation.
    await route.addSharedPage({ params: { id: 'tax-automation' }, body: { pageId: KNOWN_PAGE_ID } }, notMember)
    expect(sent(notMember)[0]).toBe(403)
    expect(sent(notMember)[1].error.code).toBe('NOT_MEMBER')
  })

  test('a member can remove a tool from the group Shared workspace', async () => {
    // Add it, then remove it — the remove leaves it gone from the list.
    await route.addSharedPage({ params: { id: 'seafood-modelling' }, body: { pageId: KNOWN_PAGE_ID, title: 'Temp Tool' } }, mkRes())
    const res = mkRes()
    await route.removeSharedPage({ params: { id: 'seafood-modelling', pageId: KNOWN_PAGE_ID } }, res)
    const body = sent(res)[1]
    expect(body.success).toBe(true)
    expect(body.sharedPages.some(p => p.pageId === KNOWN_PAGE_ID)).toBe(false)
  })

  test('removeSharedPage 404s for unknown group and 403s for a non-member', async () => {
    const missing = mkRes()
    await route.removeSharedPage({ params: { id: 'no-group', pageId: KNOWN_PAGE_ID } }, missing)
    expect(sent(missing)[0]).toBe(404)

    const notMember = mkRes()
    // me is not a member of tax-automation.
    await route.removeSharedPage({ params: { id: 'tax-automation', pageId: KNOWN_PAGE_ID } }, notMember)
    expect(sent(notMember)[0]).toBe(403)
    expect(sent(notMember)[1].error.code).toBe('NOT_MEMBER')
  })

  test('createGroup requires a name', async () => {
    const res = mkRes()
    await route.createGroup({ body: { name: '   ' } }, res)
    const [status, body] = sent(res)
    expect(status).toBe(400)
    expect(body.error.code).toBe('MISSING_NAME')
  })

  test('createGroup creates a group owned by the viewer', async () => {
    const res = mkRes()
    await route.createGroup({ body: { name: 'Coastal Cashflow', tags: ['cashflow'] } }, res)
    const [status, body] = sent(res)
    expect(status).toBe(200)
    expect(body.name).toBe('Coastal Cashflow')
    expect(body.members).toEqual([{ id: 'me', name: 'Mike Barnes' }])
  })

  test('joinGroup records a consent-based request / 404s for unknown group', async () => {
    const okRes = mkRes()
    await route.joinGroup({ params: { id: 'tax-automation' } }, okRes)
    const [status, body] = sent(okRes)
    expect(status).toBe(200)
    expect(body).toEqual(expect.objectContaining({ success: true, status: 'requested' }))

    const missing = mkRes()
    await route.joinGroup({ params: { id: 'no-group' } }, missing)
    expect(sent(missing)[0]).toBe(404)
  })

  test('listMyGroups returns groups the viewer manages', async () => {
    const res = mkRes()
    await route.listMyGroups({}, res)
    const [status, body] = sent(res)
    expect(status).toBe(200)
    expect(body.some(g => g.id === 'seafood-modelling')).toBe(true)
  })

  test('listGroups tags each group with the viewer joinStatus', async () => {
    const res = mkRes()
    await route.listGroups({ query: {} }, res)
    const [, body] = sent(res)
    // me is a member of seafood-modelling, and not of tax-automation.
    expect(body.find(g => g.id === 'seafood-modelling').joinStatus).toBe('member')
    expect(body.find(g => g.id === 'tax-automation').joinStatus).toBe('none')
  })

  test('requesting to join records a pending request (idempotent); getGroup reflects it', async () => {
    await route.joinGroup({ params: { id: 'tax-automation' } }, mkRes())
    await route.joinGroup({ params: { id: 'tax-automation' } }, mkRes()) // duplicate — no double record
    const res = mkRes()
    await route.getGroup({ params: { id: 'tax-automation' } }, res)
    expect(sent(res)[1].joinStatus).toBe('requested')
  })

  test('joining a group you are already in returns member, not a request', async () => {
    const res = mkRes()
    await route.joinGroup({ params: { id: 'seafood-modelling' } }, res) // me is a member
    expect(sent(res)[1]).toEqual(expect.objectContaining({ success: true, status: 'member' }))
  })
})

describe('group invitations', () => {
  async function makeGroup () {
    const res = mkRes()
    await route.createGroup({ body: { name: 'Invite Test Group' } }, res)
    return sent(res)[1].id
  }

  test('inviteToGroup invites a non-member into a group the viewer owns', async () => {
    const gid = await makeGroup()
    const res = mkRes()
    await route.inviteToGroup({ params: { id: gid }, body: { advisorId: 'bob-lindt' } }, res)
    const [status, body] = sent(res)
    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.invitee).toEqual({ id: 'bob-lindt', name: 'Bob Lindt' })
  })

  test('inviteToGroup requires an invitee', async () => {
    const gid = await makeGroup()
    const res = mkRes()
    await route.inviteToGroup({ params: { id: gid }, body: {} }, res)
    expect(sent(res)[0]).toBe(400)
    expect(sent(res)[1].error.code).toBe('MISSING_ADVISOR')
  })

  test('inviteToGroup 404s for an unknown group', async () => {
    const res = mkRes()
    await route.inviteToGroup({ params: { id: 'no-group' }, body: { advisorId: 'bob-lindt' } }, res)
    expect(sent(res)[0]).toBe(404)
  })

  test('inviteToGroup 403s when the viewer does not manage the group', async () => {
    const res = mkRes()
    // tax-automation's only member is bob-lindt, not the viewer.
    await route.inviteToGroup({ params: { id: 'tax-automation' }, body: { advisorId: 'anna-r' } }, res)
    expect(sent(res)[0]).toBe(403)
    expect(sent(res)[1].error.code).toBe('NOT_MANAGER')
  })

  test('inviteToGroup 409s when the invitee is already a member', async () => {
    const res = mkRes()
    // seafood-modelling already contains bob-lindt, and the viewer is a member.
    await route.inviteToGroup({ params: { id: 'seafood-modelling' }, body: { advisorId: 'bob-lindt' } }, res)
    expect(sent(res)[0]).toBe(409)
    expect(sent(res)[1].error.code).toBe('ALREADY_MEMBER')
  })

  test('inviteManyToGroup invites several at once; already-members are skipped, not fatal', async () => {
    const res = mkRes()
    // seafood-modelling: viewer 'me' manages it; anna-r is already a member, tom-fischer is not.
    await route.inviteManyToGroup({ params: { id: 'seafood-modelling' }, body: { advisorIds: ['tom-fischer', 'anna-r'] } }, res)
    const [status, body] = sent(res)
    expect(status).toBe(200)
    expect(body.invited.map(a => a.id)).toEqual(['tom-fischer'])
    expect(body.skipped).toEqual([{ id: 'anna-r', reason: 'ALREADY_MEMBER' }])
  })

  test('inviteManyToGroup 400s with no advisers, 403s when not a manager, 400s over the cap', async () => {
    const none = mkRes()
    await route.inviteManyToGroup({ params: { id: 'seafood-modelling' }, body: { advisorIds: [] } }, none)
    expect(sent(none)[0]).toBe(400)
    expect(sent(none)[1].error.code).toBe('NO_ADVISERS')

    const nm = mkRes()
    await route.inviteManyToGroup({ params: { id: 'tax-automation' }, body: { advisorIds: ['anna-r'] } }, nm)
    expect(sent(nm)[0]).toBe(403)

    const tooMany = mkRes()
    const ids = Array.from({ length: 51 }, (_, i) => 'a-' + i)
    await route.inviteManyToGroup({ params: { id: 'seafood-modelling' }, body: { advisorIds: ids } }, tooMany)
    expect(sent(tooMany)[0]).toBe(400)
    expect(sent(tooMany)[1].error.code).toBe('TOO_MANY')
  })

  test('inviteToGroup is blocked (403) across a sealed org boundary (plan §8)', async () => {
    require('../../server/collaborate/data/repository').setOrgPosture('Lindt Zürich', 'closed') // bob-lindt's branch
    const res = mkRes()
    // cashflow-clinic: 'me' manages it, bob-lindt is not a member.
    await route.inviteToGroup({ params: { id: 'cashflow-clinic' }, body: { advisorId: 'bob-lindt' } }, res)
    expect(sent(res)[0]).toBe(403)
    expect(sent(res)[1].error.code).toBe('CROSS_ORG_BLOCKED')
  })

  test('inviteManyToGroup skips a cross-org invitee, invites the reachable one', async () => {
    require('../../server/collaborate/data/repository').setOrgPosture('Lindt Zürich', 'closed')
    const res = mkRes()
    await route.inviteManyToGroup({ params: { id: 'cashflow-clinic' }, body: { advisorIds: ['tom-fischer', 'bob-lindt'] } }, res)
    const body = sent(res)[1]
    expect(body.invited.map(a => a.id)).toEqual(['tom-fischer']) // Advisor-e, reachable
    expect(body.skipped).toEqual([{ id: 'bob-lindt', reason: 'CROSS_ORG_BLOCKED' }]) // sealed
  })

  test('acceptInvitation joins the group / 404s for unknown', async () => {
    const okRes = mkRes()
    await route.acceptInvitation({ params: { id: 't-inv-hosp' } }, okRes)
    const [status, body] = sent(okRes)
    expect(status).toBe(200)
    expect(body).toEqual(expect.objectContaining({ success: true, accepted: true }))

    const missing = mkRes()
    await route.acceptInvitation({ params: { id: 'no-thread' } }, missing)
    expect(sent(missing)[0]).toBe(404)
  })

  test('declineInvitation records a decline / 404s for unknown', async () => {
    const okRes = mkRes()
    await route.declineInvitation({ params: { id: 't-inv-tax' } }, okRes)
    expect(sent(okRes)[1]).toEqual(expect.objectContaining({ success: true, accepted: false }))

    const missing = mkRes()
    await route.declineInvitation({ params: { id: 'no-thread' } }, missing)
    expect(sent(missing)[0]).toBe(404)
  })
})

describe('group join approval', () => {
  // Create a group owned by the viewer, with one outsider (bob) requesting to join.
  async function ownedGroupWithRequest () {
    const made = mkRes()
    await route.createGroup({ body: { name: 'Approval Test Group' } }, made)
    const gid = sent(made)[1].id
    await require('../../server/collaborate/data/repository').requestJoinGroup(gid, 'bob-lindt')
    return gid
  }

  test('a manager sees pending join requests; a non-manager sees none', async () => {
    const gid = await ownedGroupWithRequest()
    const mgr = mkRes()
    await route.listGroupRequests({ params: { id: gid } }, mgr) // me owns it
    expect(sent(mgr)[1].requests.length).toBe(1)
    expect(sent(mgr)[1].requests[0].advisor.id).toBe('bob-lindt')

    const outsider = mkRes()
    await route.listGroupRequests({ params: { id: 'tax-automation' } }, outsider) // me is not a member
    expect(sent(outsider)[1].requests).toEqual([])
  })

  test('approving a request adds the requester as a member', async () => {
    const gid = await ownedGroupWithRequest()
    const lr = mkRes(); await route.listGroupRequests({ params: { id: gid } }, lr)
    const reqId = sent(lr)[1].requests[0].id
    const ar = mkRes(); await route.acceptGroupRequest({ params: { id: reqId } }, ar)
    expect(sent(ar)[1]).toEqual({ success: true, status: 'accepted' })
    const gr = mkRes(); await route.getGroup({ params: { id: gid } }, gr)
    expect(sent(gr)[1].members.some(m => m.id === 'bob-lindt')).toBe(true)
  })

  test('declining a request clears it without adding a member', async () => {
    const gid = await ownedGroupWithRequest()
    const lr = mkRes(); await route.listGroupRequests({ params: { id: gid } }, lr)
    const reqId = sent(lr)[1].requests[0].id
    await route.declineGroupRequest({ params: { id: reqId } }, mkRes())
    const after = mkRes(); await route.listGroupRequests({ params: { id: gid } }, after)
    expect(sent(after)[1].requests).toEqual([])
    const gr = mkRes(); await route.getGroup({ params: { id: gid } }, gr)
    expect(sent(gr)[1].members.some(m => m.id === 'bob-lindt')).toBe(false)
  })

  test('accept 404s for an unknown request and 403s for a non-manager', async () => {
    const unknown = mkRes()
    await route.acceptGroupRequest({ params: { id: 'gjr-999' } }, unknown)
    expect(sent(unknown)[0]).toBe(404)

    // A request into tax-automation, which the viewer does NOT manage.
    const repo = require('../../server/collaborate/data/repository')
    await repo.requestJoinGroup('tax-automation', 'sara-okafor')
    const reqs = await repo.listGroupJoinRequests('tax-automation', 'bob-lindt') // bob manages tax
    const forbidden = mkRes()
    await route.acceptGroupRequest({ params: { id: reqs[0].id } }, forbidden) // me tries
    expect(sent(forbidden)[0]).toBe(403)
    expect(sent(forbidden)[1].error.code).toBe('NOT_MANAGER')
  })
})

describe('messages & outreach', () => {
  test('messageGroup posts to a group thread', async () => {
    const res = mkRes()
    await route.messageGroup({ params: { id: 'seafood-modelling' }, body: { text: 'Hello group' } }, res)
    const [status, body] = sent(res)
    expect(status).toBe(200)
    expect(body).toEqual(expect.objectContaining({ success: true, threadId: expect.any(String) }))
  })

  test('messageGroup creates a fresh thread for a group that has none yet', async () => {
    // tax-automation has no seeded group thread, so this exercises the create path.
    const res = mkRes()
    await route.messageGroup({ params: { id: 'tax-automation' }, body: { text: 'First message' } }, res)
    const [status, body] = sent(res)
    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.threadId).toEqual(expect.any(String))
  })

  test('messageGroup 404s for unknown group and 400s for empty text', async () => {
    const missing = mkRes()
    await route.messageGroup({ params: { id: 'no-group' }, body: { text: 'hi' } }, missing)
    expect(sent(missing)[0]).toBe(404)

    const empty = mkRes()
    await route.messageGroup({ params: { id: 'seafood-modelling' }, body: { text: '   ' } }, empty)
    expect(sent(empty)[0]).toBe(400)
    expect(sent(empty)[1].error.code).toBe('EMPTY')
  })

  test('openGroupChat returns the group thread id (create if none yet)', async () => {
    // tax-automation has no seeded group thread, so this exercises the create path.
    const res = mkRes()
    await route.openGroupChat({ params: { id: 'tax-automation' } }, res)
    const [status, body] = sent(res)
    expect(status).toBe(200)
    expect(body).toEqual(expect.objectContaining({ success: true, threadId: expect.any(String) }))
  })

  test('openGroupChat 404s for an unknown group', async () => {
    const res = mkRes()
    await route.openGroupChat({ params: { id: 'no-group' } }, res)
    expect(sent(res)[0]).toBe(404)
  })

  test('addThreadSharedPage attaches a tool to a 1:1 conversation', async () => {
    const res = mkRes()
    await route.addThreadSharedPage({ params: { id: 't-anna' }, body: { pageId: KNOWN_PAGE_ID, title: 'Joint Tool' } }, res)
    const body = sent(res)[1]
    expect(body.success).toBe(true)
    const added = body.sharedPages.find(p => p.pageId === KNOWN_PAGE_ID)
    expect(added).toBeTruthy()
    expect(added.openUrl).toContain(KNOWN_PAGE_ID) // real deep-link
  })

  test('addThreadSharedPage rejects a group thread (NOT_DIRECT), an unknown tool, and a missing thread', async () => {
    const group = mkRes()
    await route.addThreadSharedPage({ params: { id: 't-seafood-grp' }, body: { pageId: KNOWN_PAGE_ID } }, group)
    expect(sent(group)[0]).toBe(400)
    expect(sent(group)[1].error.code).toBe('NOT_DIRECT')

    const unknown = mkRes()
    await route.addThreadSharedPage({ params: { id: 't-anna' }, body: { pageId: 'id-0000000000' } }, unknown)
    expect(sent(unknown)[0]).toBe(400)
    expect(sent(unknown)[1].error.code).toBe('UNKNOWN_TOOL')

    const missing = mkRes()
    await route.addThreadSharedPage({ params: { id: 'no-thread' }, body: { pageId: KNOWN_PAGE_ID } }, missing)
    expect(sent(missing)[0]).toBe(404)
  })

  test('removeThreadSharedPage detaches a tool from a 1:1 conversation', async () => {
    await route.addThreadSharedPage({ params: { id: 't-anna' }, body: { pageId: KNOWN_PAGE_ID, title: 'Temp' } }, mkRes())
    const res = mkRes()
    await route.removeThreadSharedPage({ params: { id: 't-anna', pageId: KNOWN_PAGE_ID } }, res)
    const body = sent(res)[1]
    expect(body.success).toBe(true)
    expect(body.sharedPages.some(p => p.pageId === KNOWN_PAGE_ID)).toBe(false)
  })

  test('sendOutreach requires a recipient and a reason', async () => {
    const res = mkRes()
    await route.sendOutreach({ body: { toId: 'bob-lindt' } }, res) // no context
    expect(sent(res)[0]).toBe(400)
    expect(sent(res)[1].error.code).toBe('MISSING_REASON')
  })

  test('sendOutreach sends a purposeful outreach, including the optional ask', async () => {
    const res = mkRes()
    await route.sendOutreach({ body: { toId: 'bob-lindt', context: 'Building a seafood model', ask: 'Open to collaborate?' } }, res)
    const [status, body] = sent(res)
    expect(status).toBe(200)
    expect(body).toEqual(expect.objectContaining({ success: true, sent: true, threadId: expect.any(String) }))
  })

  test('sendOutreach still works when the recipient is not a known advisor', async () => {
    const res = mkRes()
    await route.sendOutreach({ body: { toId: 'external-42', context: 'Intro' } }, res)
    expect(sent(res)[0]).toBe(200)
  })

  test('sendOutreach enforces one outreach per person (409 on a repeat)', async () => {
    await route.sendOutreach({ body: { toId: 'bob-lindt', context: 'First contact' } }, mkRes())
    const repeat = mkRes()
    await route.sendOutreach({ body: { toId: 'bob-lindt', context: 'Second contact' } }, repeat)
    expect(sent(repeat)[0]).toBe(409)
    expect(sent(repeat)[1].error.code).toBe('ONE_OUTREACH')
  })

  test('sendOutreach blocks reaching an adviser marked unavailable (403)', async () => {
    // anna-r has available:false; her firm (BDO Germany) is open, so the cross-org
    // wall passes and we reach the availability guard.
    const res = mkRes()
    await route.sendOutreach({ body: { toId: 'anna-r', context: 'Keen to collaborate' } }, res)
    expect(sent(res)[0]).toBe(403)
    expect(sent(res)[1].error.code).toBe('UNAVAILABLE')
  })

  test('sendOutreach enforces the daily cap (429 once the limit is reached)', async () => {
    // Fire outreaches to distinct new recipients up to the cap (20); each succeeds.
    for (let i = 0; i < 20; i++) {
      const r = mkRes()
      await route.sendOutreach({ body: { toId: 'ext-cap-' + i, context: 'Intro ' + i } }, r)
      expect(sent(r)[0]).toBe(200)
    }
    // The next one tips over the daily cap and is blocked.
    const blocked = mkRes()
    await route.sendOutreach({ body: { toId: 'ext-cap-final', context: 'One more' } }, blocked)
    expect(sent(blocked)[0]).toBe(429)
    expect(sent(blocked)[1].error.code).toBe('RATE_LIMIT')
  })

  test('messageAdvisor opens a direct thread / 404s unknown / reuses on repeat', async () => {
    const okRes = mkRes()
    await route.messageAdvisor({ params: { id: 'sara-okafor' } }, okRes)
    const [status, body] = sent(okRes)
    expect(status).toBe(200)
    expect(body).toEqual(expect.objectContaining({ success: true, threadId: expect.any(String) }))

    // Repeat reuses the same thread (no duplicates).
    const again = mkRes()
    await route.messageAdvisor({ params: { id: 'sara-okafor' } }, again)
    expect(sent(again)[1].threadId).toBe(body.threadId)

    const missing = mkRes()
    await route.messageAdvisor({ params: { id: 'nobody' } }, missing)
    expect(sent(missing)[0]).toBe(404)
  })

  test('listMessages returns the viewer thread summaries', async () => {
    const res = mkRes()
    await route.listMessages({}, res)
    const [status, body] = sent(res)
    expect(status).toBe(200)
    expect(Array.isArray(body.threads)).toBe(true)
    expect(body.threads.length).toBeGreaterThan(0)
  })

  test('getThread returns a thread / 404s for unknown', async () => {
    const okRes = mkRes()
    await route.getThread({ params: { id: 't-bob' } }, okRes)
    expect(sent(okRes)[0]).toBe(200)

    const missing = mkRes()
    await route.getThread({ params: { id: 'no-thread' } }, missing)
    expect(sent(missing)[0]).toBe(404)
  })

  test('getThread exposes a 1:1 shared workspace as Advisor-e deep-links', async () => {
    const res = mkRes()
    await route.getThread({ params: { id: 't-anna' } }, res) // seeded with a shared page
    const body = sent(res)[1]
    expect(body.sharedPages[0].title).toBe('Joint Forecast Model')
    expect(body.sharedPages[0].openUrl).toContain('ae-anna-forecast-01')
  })

  test('replyThread appends / 400s empty / 404s unknown', async () => {
    const okRes = mkRes()
    await route.replyThread({ params: { id: 't-bob' }, body: { text: 'Reply' } }, okRes)
    expect(sent(okRes)[0]).toBe(200)

    const empty = mkRes()
    await route.replyThread({ params: { id: 't-bob' }, body: { text: '' } }, empty)
    expect(sent(empty)[0]).toBe(400)

    const missing = mkRes()
    await route.replyThread({ params: { id: 'no-thread' }, body: { text: 'x' } }, missing)
    expect(sent(missing)[0]).toBe(404)
  })
})

describe('connections', () => {
  test('listConnections buckets incoming/outgoing/connected + groups', async () => {
    const res = mkRes()
    await route.listConnections({}, res)
    const [status, body] = sent(res)
    expect(status).toBe(200)
    expect(body).toEqual(expect.objectContaining({
      incoming: expect.any(Array),
outgoing: expect.any(Array),
      connected: expect.any(Array),
groups: expect.any(Array)
    }))
    expect(body.connected.some(c => c.advisor.id === 'sara-okafor')).toBe(true)
  })

  test('connect rejects connecting to yourself', async () => {
    const res = mkRes()
    await route.connect({ params: { id: 'me' } }, res)
    expect(sent(res)[0]).toBe(400)
    expect(sent(res)[1].error.code).toBe('SELF')
  })

  test('connect creates a pending request', async () => {
    const res = mkRes()
    await route.connect({ params: { id: 'bob-lindt' } }, res)
    const [status, body] = sent(res)
    expect(status).toBe(200)
    expect(body).toEqual({ success: true, status: 'pending' })
  })

  test('acceptConnection accepts an incoming request / 404s unknown', async () => {
    const okRes = mkRes()
    await route.acceptConnection({ params: { id: 'c-anna' } }, okRes) // anna -> me (incoming)
    expect(sent(okRes)[1]).toEqual({ success: true, status: 'accepted' })

    const missing = mkRes()
    await route.acceptConnection({ params: { id: 'c-none' } }, missing)
    expect(sent(missing)[0]).toBe(404)
  })

  test('declineConnection declines an incoming request / 404s unknown', async () => {
    const okRes = mkRes()
    await route.declineConnection({ params: { id: 'c-anna' } }, okRes)
    expect(sent(okRes)[1]).toEqual({ success: true, status: 'declined' })

    const missing = mkRes()
    await route.declineConnection({ params: { id: 'c-none' } }, missing)
    expect(sent(missing)[0]).toBe(404)
  })
})

describe('connecting (unified inbox — Q-CONN-MSG-IA Option B)', () => {
  // Return the merged rows for the viewer ('me').
  async function connecting () {
    const res = mkRes()
    await route.listConnecting({}, res)
    const [status, body] = sent(res)
    expect(status).toBe(200)
    return body
  }

  test('merges threads + requests + connections into one type-tagged list with counts', async () => {
    const body = await connecting()
    expect(Array.isArray(body.rows)).toBe(true)
    // Seed for 'me': 2 chats (bob, anna), 1 group thread (seafood), 2 invitations,
    // 1 incoming request (anna), 1 connected-without-thread (sara).
    const types = body.rows.map(r => r.type)
    expect(types).toContain('chat')
    expect(types).toContain('group')
    expect(types).toContain('invitation')
    expect(types).toContain('request-incoming')
    expect(types).toContain('connection')
    // Counts are self-consistent with the rows.
    expect(body.counts.all).toBe(body.rows.length)
    expect(body.counts.chats).toBe(body.rows.filter(r => r.type === 'chat').length)
    expect(body.counts.requests).toBe(body.rows.filter(r => r.type === 'request-incoming' || r.type === 'request-outgoing').length)
  })

  test('a group you asked to join (but are not in) appears as a group-request row under Requests', async () => {
    await route.joinGroup({ params: { id: 'tax-automation' } }, mkRes())
    const body = await connecting()
    const row = body.rows.find(r => r.type === 'group-request' && r.groupId === 'tax-automation')
    expect(row).toBeTruthy()
    expect(row.name).toBe('Tax Automation Lab')
    expect(body.counts.requests).toBeGreaterThanOrEqual(1)
  })

  test('a connected person without a 1:1 thread appears as a standalone connection row', async () => {
    const body = await connecting()
    // Sara is connected (c-sara) but has no 1:1 outreach thread in the seed.
    const sara = body.rows.find(r => r.type === 'connection' && r.advisorId === 'sara-okafor')
    expect(sara).toBeTruthy()
    expect(sara.connectionId).toBe('c-sara')
    expect(sara.firm).toBe('Advisor-e Dublin')
  })

  test('a connected person WITH a 1:1 thread collapses to a single chat row (no duplicate)', async () => {
    // Open a direct thread with Sara, then re-fetch: she should now be a chat row
    // carrying her connectionId — and NOT also appear as a separate connection row.
    await route.messageAdvisor({ params: { id: 'sara-okafor' } }, mkRes())
    const body = await connecting()
    const saraRows = body.rows.filter(r => r.advisorId === 'sara-okafor')
    expect(saraRows).toHaveLength(1)
    expect(saraRows[0].type).toBe('chat')
    expect(saraRows[0].connectionId).toBe('c-sara')
  })

  test('an outgoing pending request surfaces as a request-outgoing row', async () => {
    await route.connect({ params: { id: 'bob-lindt' } }, mkRes()) // me -> bob (pending)
    const body = await connecting()
    const out = body.rows.find(r => r.type === 'request-outgoing' && r.advisorId === 'bob-lindt')
    expect(out).toBeTruthy()
    expect(typeof out.connectionId).toBe('string')
    expect(out.name).toBe('Bob Lindt')
  })

  test('a group with no thread yet appears as a group row with a null threadId', async () => {
    // A freshly-created group has the viewer as its only member and no group thread.
    const made = mkRes()
    await route.createGroup({ body: { name: 'No-Thread Group' } }, made)
    const gid = sent(made)[1].id
    const body = await connecting()
    const row = body.rows.find(r => r.type === 'group' && r.groupId === gid)
    expect(row).toBeTruthy()
    expect(row.threadId).toBeNull()
  })
})

describe('marketplace', () => {
  test('listMarketplace returns listings with an owned flag', async () => {
    const res = mkRes()
    await route.listMarketplace({}, res)
    const [status, body] = sent(res)
    expect(status).toBe(200)
    expect(body.every(l => typeof l.owned === 'boolean')).toBe(true)
  })

  test('an unowned listing has no openUrl; a purchased one gets an Advisor-e deep-link', async () => {
    const before = mkRes()
    await route.listMarketplace({}, before)
    const pre = sent(before)[1].find(l => l.id === 'm-trucking')
    expect(pre.owned).toBe(false)
    expect(pre.openUrl).toBeNull()

    await route.purchaseListing({ params: { id: 'm-trucking' } }, mkRes())
    const after = mkRes()
    await route.listMarketplace({}, after)
    const post = sent(after)[1].find(l => l.id === 'm-trucking')
    expect(post.owned).toBe(true)
    expect(typeof post.openUrl).toBe('string')
    expect(post.openUrl).toContain('id-4466260146') // base + pageId
  })

  test('getListing returns a listing / 404s unknown', async () => {
    const okRes = mkRes()
    await route.getListing({ params: { id: 'm-trucking' } }, okRes)
    expect(sent(okRes)[0]).toBe(200)

    const missing = mkRes()
    await route.getListing({ params: { id: 'm-none' } }, missing)
    expect(sent(missing)[0]).toBe(404)
  })

  test('createListing requires a title', async () => {
    const res = mkRes()
    await route.createListing({ body: { pageId: KNOWN_PAGE_ID } }, res)
    expect(sent(res)[0]).toBe(400)
    expect(sent(res)[1].error.code).toBe('MISSING_TITLE')
  })

  test('createListing requires a linked tool', async () => {
    const res = mkRes()
    await route.createListing({ body: { title: 'My Tool' } }, res)
    expect(sent(res)[0]).toBe(400)
    expect(sent(res)[1].error.code).toBe('MISSING_TOOL')
  })

  test('createListing rejects a tool that is not in the catalogue', async () => {
    const res = mkRes()
    await route.createListing({ body: { title: 'My Tool', pageId: 'id-0000000000' } }, res)
    expect(sent(res)[0]).toBe(400)
    expect(sent(res)[1].error.code).toBe('UNKNOWN_TOOL')
  })

  test('createListing succeeds with a valid catalogue tool and tags it group-owned (Tier 4)', async () => {
    const res = mkRes()
    await route.createListing({ body: { title: 'Real Tool', pageId: KNOWN_PAGE_ID } }, res)
    const [status, body] = sent(res)
    expect(status).toBe(200)
    expect(body.pageId).toBe(KNOWN_PAGE_ID)
    expect(body.title).toBe('Real Tool')
    expect(body.ipTier).toBe(4)
  })

  test('createListing refuses a locked / non-derivable framework (LOCKED_IP)', async () => {
    const res = mkRes()
    // '8-profit-levers' is a real catalogue id classified as a locked Tier-2 framework.
    await route.createListing({ body: { title: 'Locked Tool', pageId: '8-profit-levers' } }, res)
    expect(sent(res)[0]).toBe(400)
    expect(sent(res)[1].error.code).toBe('LOCKED_IP')
  })

  test('purchaseListing records a purchase / 404s unknown', async () => {
    const okRes = mkRes()
    await route.purchaseListing({ params: { id: 'm-trucking' } }, okRes)
    expect(sent(okRes)[1]).toEqual({ success: true, owned: true })

    const missing = mkRes()
    await route.purchaseListing({ params: { id: 'm-none' } }, missing)
    expect(sent(missing)[0]).toBe(404)
  })

  test('purchaseListing is blocked (403) across a sealed org boundary (plan §8)', async () => {
    require('../../server/collaborate/data/repository').setOrgPosture('BDO Hamburg', 'closed') // m-trucking's owner org
    const res = mkRes()
    await route.purchaseListing({ params: { id: 'm-trucking' } }, res)
    expect(sent(res)[0]).toBe(403)
    expect(sent(res)[1].error.code).toBe('CROSS_ORG_BLOCKED')
  })
})

describe('cross-org wall', () => {
  test('connect is blocked (403) when the target firm has opted out', async () => {
    require('../../server/collaborate/data/repository').setOrgPosture('Lindt Zürich', 'closed')
    const res = mkRes()
    await route.connect({ params: { id: 'bob-lindt' } }, res)
    expect(sent(res)[0]).toBe(403)
    expect(sent(res)[1].error.code).toBe('CROSS_ORG_BLOCKED')
  })

  test('getAdvisor is blocked (403) across a closed firm', async () => {
    require('../../server/collaborate/data/repository').setOrgPosture('BDO Hamburg', 'closed')
    const res = mkRes()
    await route.getAdvisor({ params: { id: 'anna-r' } }, res)
    expect(sent(res)[0]).toBe(403)
    expect(sent(res)[1].error.code).toBe('CROSS_ORG_BLOCKED')
  })

  test('sendOutreach is blocked (403) across a closed firm', async () => {
    require('../../server/collaborate/data/repository').setOrgPosture('Lindt Zürich', 'closed')
    const res = mkRes()
    await route.sendOutreach({ body: { toId: 'bob-lindt', context: 'Hello' } }, res)
    expect(sent(res)[0]).toBe(403)
    expect(sent(res)[1].error.code).toBe('CROSS_ORG_BLOCKED')
  })

  test('listAdvisors hides advisers behind a closed firm', async () => {
    require('../../server/collaborate/data/repository').setOrgPosture('Lindt Zürich', 'closed')
    const res = mkRes()
    await route.listAdvisors({ query: {} }, res)
    expect(sent(res)[1].some(a => a.id === 'bob-lindt')).toBe(false)
  })
})

describe('notifications', () => {
  test('listNotifications returns the viewer notifications with an unread count', async () => {
    const res = mkRes()
    await route.listNotifications({}, res)
    const [status, body] = sent(res)
    expect(status).toBe(200)
    expect(Array.isArray(body.items)).toBe(true)
    expect(body.items.length).toBeGreaterThan(0)
    expect(body.unread).toBe(body.items.filter(n => !n.read).length)
    expect(body.items.every(n => n.userId === 'me')).toBe(true)
  })

  test('markNotificationsRead clears the unread count for the viewer', async () => {
    const before = mkRes()
    await route.listNotifications({}, before)
    const unread = sent(before)[1].unread
    expect(unread).toBeGreaterThan(0)

    const mark = mkRes()
    await route.markNotificationsRead({}, mark)
    expect(sent(mark)[1]).toEqual({ success: true, marked: unread })

    const after = mkRes()
    await route.listNotifications({}, after)
    expect(sent(after)[1].unread).toBe(0)
  })
})

describe('audit trail', () => {
  test('a significant action writes an audit entry', async () => {
    const audit = require('../../server/collaborate/data/auditLog')
    await route.createGroup({ body: { name: 'Audited Group' } }, mkRes())
    const rows = await audit.list({ action: 'group.create' })
    expect(rows.length).toBe(1)
    expect(rows[0]).toEqual(expect.objectContaining({ actorId: 'me', targetType: 'group' }))
  })

  test('a blocked cross-firm connection is audited as a security event', async () => {
    require('../../server/collaborate/data/repository').setOrgPosture('Lindt Zürich', 'closed')
    const audit = require('../../server/collaborate/data/auditLog')
    await route.connect({ params: { id: 'bob-lindt' } }, mkRes())
    const rows = await audit.list({ action: 'connection.blocked' })
    expect(rows.length).toBe(1)
    expect(rows[0].meta).toEqual({ reason: 'cross_org' })
  })

  test('a refused locked-IP listing is audited', async () => {
    const audit = require('../../server/collaborate/data/auditLog')
    await route.createListing({ body: { title: 'Locked', pageId: '8-profit-levers' } }, mkRes())
    expect((await audit.list({ action: 'listing.locked_blocked' })).length).toBe(1)
  })

  test('getAuditLog is admin-gated: a non-admin (firm manager) is refused (403)', async () => {
    const res = mkRes() // dev identity 'me' is a firm manager, not the super-admin
    await route.getAuditLog({ query: {} }, res)
    expect(sent(res)[0]).toBe(403)
    expect(sent(res)[1].error.code).toBe('NOT_ADMIN')
  })

  test('getAuditLog returns the trail (admin) newest-first, enriched, with an action filter', async () => {
    require('../../server/collaborate/data/roles').setOverride('me', 'mentor') // platform super-admin
    await route.createGroup({ body: { name: 'G1' } }, mkRes())
    await route.connect({ params: { id: 'bob-lindt' } }, mkRes())

    const all = mkRes()
    await route.getAuditLog({ query: {} }, all)
    const [status, body] = sent(all)
    expect(status).toBe(200)
    expect(Array.isArray(body.entries)).toBe(true)
    expect(body.entries.length).toBeGreaterThanOrEqual(2)
    // Newest first: the connection request was recorded after the group create.
    expect(body.entries[0].action).toBe('connection.request')
    // Entries are enriched with the actor's display name (store keeps ids only).
    expect(body.entries[0].actorName).toBe('Mike Barnes')

    const filtered = mkRes()
    await route.getAuditLog({ query: { action: 'group.create' } }, filtered)
    expect(sent(filtered)[1].entries.every(e => e.action === 'group.create')).toBe(true)
  })

  test('getAuditLogPreview is dev-only: 404 without ALLOW_DEV_AUTH, 200 with it', async () => {
    const prev = process.env.ALLOW_DEV_AUTH
    delete process.env.ALLOW_DEV_AUTH
    const off = mkRes()
    await route.getAuditLogPreview({ query: {} }, off)
    expect(sent(off)[0]).toBe(404)

    process.env.ALLOW_DEV_AUTH = 'true'
    await route.createGroup({ body: { name: 'Seeded' } }, mkRes())
    const on = mkRes()
    await route.getAuditLogPreview({ query: {} }, on)
    expect(sent(on)[0]).toBe(200)
    expect(sent(on)[1].preview).toBe(true)
    expect(sent(on)[1].entries[0].actorName).toBe('Mike Barnes')

    if (prev === undefined) { delete process.env.ALLOW_DEV_AUTH } else { process.env.ALLOW_DEV_AUTH = prev }
  })
})

describe('firm manager console', () => {
  test('getFirmConsole returns the firm, advisers, stats and approvals for a manager', async () => {
    const res = mkRes()
    await route.getFirmConsole({}, res) // dev identity = 'me' (a firm manager)
    const [status, body] = sent(res)
    expect(status).toBe(200)
    expect(body.firm).toBe('Advisor-e Munich')
    expect(body.advisers.some(a => a.id === 'me' && a.isMe)).toBe(true)
    // James has switched on "block firm manager view".
    expect(body.advisers.some(a => a.id === 'james-obrien' && a.blocked)).toBe(true)
    expect(body.stats.advisers).toBe(3) // the Advisor-e Munich branch: me, priya, james
    expect(Array.isArray(body.approvals)).toBe(true)
    expect(Array.isArray(body.activity)).toBe(true)
  })

  test('getFirmConsole 403s for a non-manager', async () => {
    const res = mkRes()
    await route.getFirmConsole({ identity: { advisorId: 'bob-lindt' } }, res)
    expect(sent(res)[0]).toBe(403)
    expect(sent(res)[1].error.code).toBe('NOT_MANAGER')
  })

  test('an advisor blocking the manager view (via updateMe) shows as blocked in the console', async () => {
    // Priya starts unblocked; she switches "Block firm manager view" on.
    await route.updateMe({ identity: { advisorId: 'priya-nair' }, body: { blockFirmManagerView: true } }, mkRes())
    const res = mkRes()
    await route.getFirmConsole({}, res)
    const priya = sent(res)[1].advisers.find(a => a.id === 'priya-nair')
    expect(priya.blocked).toBe(true)
  })

  test('startViewAs sets the view-as cookie for a valid firm adviser', async () => {
    const res = mkResH()
    await route.startViewAs({ body: { advisorId: 'priya-nair' } }, res)
    expect(sent(res)[0]).toBe(200)
    expect(sent(res)[1].asName).toBe('Priya Nair')
    expect(setCookieOf(res)).toMatch(/viewAs=priya-nair/)
  })

  test('startViewAs refuses a non-manager, a cross-firm adviser, a blocked adviser and self', async () => {
    const nm = mkResH()
    await route.startViewAs({ identity: { advisorId: 'bob-lindt' }, body: { advisorId: 'priya-nair' } }, nm)
    expect(sent(nm)[0]).toBe(403)
    expect(sent(nm)[1].error.code).toBe('NOT_MANAGER')

    const xfirm = mkResH()
    await route.startViewAs({ body: { advisorId: 'anna-r' } }, xfirm) // anna-r is BDO Germany, not Advisor-e
    expect(sent(xfirm)[0]).toBe(404)

    const blocked = mkResH()
    await route.startViewAs({ body: { advisorId: 'james-obrien' } }, blocked) // James blocks the manager view
    expect(sent(blocked)[0]).toBe(403)
    expect(sent(blocked)[1].error.code).toBe('BLOCKED')

    const self = mkResH()
    await route.startViewAs({ body: { advisorId: 'me' } }, self)
    expect(sent(self)[0]).toBe(400)
  })

  test('startViewAs refuses to impersonate another MANAGER (privilege-escalation guard)', async () => {
    require('../../server/collaborate/data/roles').setOverride('priya-nair', 'group_manager') // now a manager, still in me's firm
    const res = mkResH()
    await route.startViewAs({ body: { advisorId: 'priya-nair' } }, res) // 'me' (firm mgr) tries to view-as her
    expect(sent(res)[0]).toBe(403)
    expect(sent(res)[1].error.code).toBe('NOT_ADVISER')
    expect(setCookieOf(res)).toBe('') // no cookie set
  })

  test('a view-as cookie targeting a manager is ignored (reverts to the real manager)', async () => {
    require('../../server/collaborate/data/roles').setOverride('priya-nair', 'group_manager')
    const res = mkRes()
    await route.getMe({ headers: { cookie: 'viewAs=priya-nair' } }, res)
    expect(sent(res)[1].id).toBe('me') // reverted — not viewing as the manager
    expect(sent(res)[1].viewingAs).toBeNull()
  })

  test('getMe reflects an active view-as: target profile + viewingAs banner info', async () => {
    const res = mkResH()
    await route.getMe({ headers: { cookie: 'viewAs=priya-nair' } }, res)
    const body = sent(res)[1]
    expect(body.id).toBe('priya-nair')
    expect(body.viewingAs).toEqual(expect.objectContaining({ asName: 'Priya Nair', realName: 'Mike Barnes' }))
  })

  test('a view-as cookie for a blocked adviser is ignored (reverts to the real manager)', async () => {
    const res = mkResH()
    await route.getMe({ headers: { cookie: 'viewAs=james-obrien' } }, res)
    const body = sent(res)[1]
    expect(body.id).toBe('me')
    expect(body.viewingAs).toBeNull()
  })

  test('the identity really switches: manager-only routes are denied while viewing-as a non-manager', async () => {
    const res = mkResH()
    await route.getFirmConsole({ headers: { cookie: 'viewAs=priya-nair' } }, res)
    expect(sent(res)[0]).toBe(403) // effective identity is Priya (not a manager)
  })

  test('exitViewAs clears the view-as cookie', async () => {
    const res = mkResH()
    await route.exitViewAs({}, res)
    expect(sent(res)[0]).toBe(200)
    expect(setCookieOf(res)).toMatch(/viewAs=;.*Max-Age=0/)
  })

  test('setFirmPosture toggles the firm posture and it shows in the console + activity', async () => {
    const closed = mkRes()
    await route.setFirmPosture({ body: { posture: 'closed' } }, closed)
    expect(sent(closed)[0]).toBe(200)
    expect(sent(closed)[1].crossOrgPosture).toBe('closed')

    const res = mkRes()
    await route.getFirmConsole({}, res)
    expect(sent(res)[1].stats.crossOrgPosture).toBe('closed')
    // The posture change was audited and surfaces in the firm activity feed.
    expect(sent(res)[1].activity.some(e => e.action === 'firm.posture_set')).toBe(true)
  })

  test('setFirmPosture rejects a bad posture (400) and a non-manager (403)', async () => {
    const bad = mkRes()
    await route.setFirmPosture({ body: { posture: 'sideways' } }, bad)
    expect(sent(bad)[0]).toBe(400)
    expect(sent(bad)[1].error.code).toBe('BAD_POSTURE')

    const nm = mkRes()
    await route.setFirmPosture({ identity: { advisorId: 'bob-lindt' }, body: { posture: 'open' } }, nm)
    expect(sent(nm)[0]).toBe(403)
    expect(sent(nm)[1].error.code).toBe('NOT_MANAGER')
  })
})

describe('role hierarchy (Q-ROLES) — Group (country) Manager scope', () => {
  // Make Priya a Group Manager (head of Advisor-e Germany). She then oversees every
  // Advisor-e BRANCH in Germany (Munich + Berlin + Hamburg), but not other brands
  // (BDO/Lindt) or other countries (IT/IE). Interim override — the real designation
  // comes from the Advisory JWT role.
  function makePriyaGroupManager () {
    require('../../server/collaborate/data/roles').setOverride('priya-nair', 'group_manager')
  }

  test('getFirmConsole for a Group Manager rolls up the brand+country across its branches (counts only)', async () => {
    makePriyaGroupManager()
    const res = mkRes()
    await route.getFirmConsole({ identity: { advisorId: 'priya-nair' } }, res)
    const [status, body] = sent(res)
    expect(status).toBe(200)
    expect(body.scope.tier).toBe('group_manager')
    expect(body.stats.advisers).toBe(5)
    // Higher tiers ship the tree of COUNTS, not a flat adviser list (PERF-CONSOLE-TREE).
    expect(body.advisers).toEqual([])
    const branches = body.tree.children.map(n => n.value).sort()
    expect(branches).toEqual(['Advisor-e Berlin', 'Advisor-e Hamburg', 'Advisor-e Munich']) // DE branches
    expect(body.tree.children.reduce((s, n) => s + n.advisers, 0)).toBe(5) // counts sum to the total
    expect(body.tree.children.every(n => !n.people)).toBe(true) // no adviser rows inlined
  })

  test('the lazy per-branch loader returns a branch\'s advisers within scope, and re-checks scope', async () => {
    makePriyaGroupManager()
    const res = mkRes()
    await route.getConsoleAdvisers({ identity: { advisorId: 'priya-nair' }, query: { firm: 'Advisor-e Munich' } }, res)
    const [status, body] = sent(res)
    expect(status).toBe(200)
    expect(body.firm).toBe('Advisor-e Munich')
    expect(body.total).toBe(3)
    expect(body.advisers.map(a => a.id).sort()).toEqual(['james-obrien', 'me', 'priya-nair'])
    // A branch OUTSIDE the manager's scope yields nobody (scope re-derived server-side).
    const out = mkRes()
    await route.getConsoleAdvisers({ identity: { advisorId: 'priya-nair' }, query: { firm: 'Advisor-e Dublin' } }, out)
    expect(sent(out)[1].advisers).toEqual([]) // IE — other country
    // A non-manager is refused.
    const nm = mkRes()
    await route.getConsoleAdvisers({ identity: { advisorId: 'bob-lindt' }, query: { firm: 'Lindt Zürich' } }, nm)
    expect(sent(nm)[0]).toBe(403)
  })

  test('a Firm Manager still sees ONLY their own branch (the Group tier does not leak down)', async () => {
    const res = mkRes()
    await route.getFirmConsole({}, res) // dev identity = 'me' (Advisor-e Munich firm manager)
    const [status, body] = sent(res)
    expect(status).toBe(200)
    expect(body.scope.tier).toBe('firm_manager')
    const ids = body.advisers.map(a => a.id)
    expect(ids).toContain('priya-nair') // same branch (Advisor-e Munich)
    expect(ids).not.toContain('tom-fischer') // Advisor-e Berlin — a different branch
  })

  test('a Group Manager can view-as an adviser in ANOTHER branch of their brand+country', async () => {
    makePriyaGroupManager()
    const res = mkResH()
    await route.startViewAs({ identity: { advisorId: 'priya-nair' }, body: { advisorId: 'tom-fischer' } }, res)
    expect(sent(res)[0]).toBe(200) // Tom is Advisor-e Berlin — same brand + country (DE)
    expect(setCookieOf(res)).toMatch(/viewAs=tom-fischer/)
  })

  test('a Group Manager cannot view-as an adviser in another country', async () => {
    makePriyaGroupManager()
    const res = mkResH()
    await route.startViewAs({ identity: { advisorId: 'priya-nair' }, body: { advisorId: 'sara-okafor' } }, res) // IE
    expect(sent(res)[0]).toBe(404)
  })
})

describe('console previews (show-home, dev-gated)', () => {
  const orig = process.env.ALLOW_DEV_AUTH
  afterEach(() => {
    if (orig === undefined) { delete process.env.ALLOW_DEV_AUTH } else { process.env.ALLOW_DEV_AUTH = orig }
  })

  test('a preview is refused (404) unless dev-auth is on (hidden in production)', async () => {
    delete process.env.ALLOW_DEV_AUTH
    const res = mkRes()
    await route.getConsolePreview({ params: { tier: 'group' } }, res)
    expect(sent(res)[0]).toBe(404)
  })

  test('the group preview rolls up a brand+country across its branches', async () => {
    process.env.ALLOW_DEV_AUTH = 'true'
    const res = mkRes()
    await route.getConsolePreview({ params: { tier: 'group' } }, res)
    const [status, body] = sent(res)
    expect(status).toBe(200)
    expect(body.preview).toBe(true)
    expect(body.scope.tier).toBe('group_manager')
    expect(body.advisers).toEqual([]) // counts-only tree (PERF-CONSOLE-TREE)
    expect(body.stats.advisers).toBe(5)
    expect(body.tree.children.length).toBe(3) // Munich, Berlin, Hamburg
  })

  test('the preview lazy loader returns a branch\'s advisers, dev-gated', async () => {
    process.env.ALLOW_DEV_AUTH = 'true'
    const res = mkRes()
    await route.getConsoleAdvisersPreview({ params: { tier: 'group' }, query: { firm: 'Advisor-e Munich' } }, res)
    expect(sent(res)[0]).toBe(200)
    expect(sent(res)[1].preview).toBe(true)
    expect(sent(res)[1].advisers.map(a => a.id)).toEqual(expect.arrayContaining(['me', 'priya-nair']))

    delete process.env.ALLOW_DEV_AUTH
    const off = mkRes()
    await route.getConsoleAdvisersPreview({ params: { tier: 'group' }, query: { firm: 'Advisor-e Munich' } }, off)
    expect(sent(off)[0]).toBe(404)
  })

  test('the global preview covers a whole brand; the mentor preview the whole network', async () => {
    process.env.ALLOW_DEV_AUTH = 'true'
    const g = mkRes()
    await route.getConsolePreview({ params: { tier: 'global' } }, g)
    expect(sent(g)[1].scope.tier).toBe('global_manager')
    expect(sent(g)[1].stats.advisers).toBe(7) // the whole Advisor-e brand (all countries)
    expect(sent(g)[1].tree.children.length).toBe(3) // countries: DE, IT, IE

    const m = mkRes()
    await route.getConsolePreview({ params: { tier: 'mentor' } }, m)
    expect(sent(m)[1].scope.tier).toBe('mentor')
    expect(sent(m)[1].stats.advisers).toBe(9) // everyone
    expect(sent(m)[1].tree.children.length).toBe(3) // global groups: Advisor-e, BDO, Lindt & Co
  })

  test('an unknown preview tier is 404', async () => {
    process.env.ALLOW_DEV_AUTH = 'true'
    const res = mkRes()
    await route.getConsolePreview({ params: { tier: 'nope' } }, res)
    expect(sent(res)[0]).toBe(404)
  })
})
