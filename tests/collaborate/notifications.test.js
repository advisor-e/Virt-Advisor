'use strict'

/**
 * Tests for the in-app notifications layer (server/data/repository.js):
 * - the read side (listNotifications / markNotificationsRead) and the seeded
 *   dev notifications for the "me" user;
 * - that the four events each record a notification for the correct RECIPIENT
 *   (connection request, group invitation, message, purchase).
 *
 * The repository is an in-memory module with mutable seed state, so each test
 * runs against a FRESH copy via jest.resetModules() — tests are order-independent
 * and never leak state into one another.
 */

let repo

beforeEach(() => {
  jest.resetModules()
  repo = require('../../server/collaborate/data/repository')
})

describe('read side', () => {
  test('listNotifications returns the seeded unread notifications for "me"', async () => {
    const { items, unread } = await repo.listNotifications('me')
    expect(items.length).toBe(6)
    expect(unread).toBe(6)
    // Every returned row belongs to the caller — no cross-user leakage.
    expect(items.every(n => n.userId === 'me')).toBe(true)
    expect(items.some(n => n.type === 'connection_request')).toBe(true)
    expect(items.some(n => n.type === 'group_invitation')).toBe(true)
    expect(items.some(n => n.type === 'message')).toBe(true)
    expect(items.some(n => n.type === 'purchase')).toBe(true)
    expect(items.some(n => n.type === 'group_join_request')).toBe(true)
  })

  test('an unknown user has no notifications', async () => {
    const { items, unread } = await repo.listNotifications('ghost')
    expect(items).toEqual([])
    expect(unread).toBe(0)
  })

  test('markNotificationsRead clears the unread count and reports how many it marked', async () => {
    const first = await repo.markNotificationsRead('me')
    expect(first).toEqual({ success: true, marked: 6 })
    const after = await repo.listNotifications('me')
    expect(after.unread).toBe(0)
    // Idempotent: a second call marks nothing.
    const second = await repo.markNotificationsRead('me')
    expect(second.marked).toBe(0)
  })

  test('marking one user read does not affect another user', async () => {
    // Create a request so bob-lindt gains a notification, then clear "me".
    await repo.requestConnection('me', 'bob-lindt')
    await repo.markNotificationsRead('me')
    const bob = await repo.listNotifications('bob-lindt')
    expect(bob.unread).toBe(1)
  })
})

describe('event wiring', () => {
  test('a new connection request notifies the addressee', async () => {
    await repo.requestConnection('sara-okafor', 'bob-lindt')
    const bob = await repo.listNotifications('bob-lindt')
    const n = bob.items.find(x => x.type === 'connection_request')
    expect(n).toBeTruthy()
    expect(n.params).toEqual({ name: 'Sara Okafor' })
    expect(n.link).toBe('/connecting')
  })

  test('a group-join request notifies the group owner', async () => {
    // tax-automation is owned by Bob Lindt (its only seeded member).
    await repo.requestJoinGroup('tax-automation', 'sara-okafor')
    const bob = await repo.listNotifications('bob-lindt')
    const n = bob.items.find(x => x.type === 'group_join_request')
    expect(n).toBeTruthy()
    expect(n.params).toEqual({ name: 'Sara Okafor', group: 'Tax Automation Lab' })
    expect(n.link).toBe('/groups/tax-automation')
  })

  test('approving a group-join request notifies the requester', async () => {
    const me = { id: 'me', name: 'Mike Barnes', firm: 'Advisor-e' }
    const g = await repo.createGroup({ name: 'Notify Approve Group' }, me)
    await repo.requestJoinGroup(g.id, 'bob-lindt')
    const reqs = await repo.listGroupJoinRequests(g.id, 'me')
    await repo.respondJoinRequest('me', reqs[0].id, true)
    const bob = await repo.listNotifications('bob-lindt')
    const n = bob.items.find(x => x.type === 'group_join_accepted')
    expect(n).toBeTruthy()
    expect(n.params).toEqual({ group: 'Notify Approve Group' })
    expect(n.link).toBe('/groups/' + g.id)
  })

  test('a duplicate connection request does not create a second notification', async () => {
    await repo.requestConnection('sara-okafor', 'bob-lindt')
    await repo.requestConnection('sara-okafor', 'bob-lindt')
    const bob = await repo.listNotifications('bob-lindt')
    expect(bob.items.filter(x => x.type === 'connection_request').length).toBe(1)
  })

  test('a group invitation notifies the invitee', async () => {
    const me = { id: 'me', name: 'Mike Barnes', firm: 'Advisor-e' }
    const g = await repo.createGroup({ name: 'Notify Test Group' }, me)
    await repo.inviteToGroup(g.id, me, 'bob-lindt', 'Join us')
    const bob = await repo.listNotifications('bob-lindt')
    const n = bob.items.find(x => x.type === 'group_invitation')
    expect(n).toBeTruthy()
    expect(n.params).toEqual({ inviter: 'Mike Barnes', group: 'Notify Test Group' })
    expect(n.link).toBe('/connecting')
  })

  test('a reply on a 1:1 outreach thread notifies the counterpart, using fromName', async () => {
    const t = await repo.createOutreachThread({ toId: 'bob-lindt', toName: 'Bob Lindt', text: 'Hi', fromName: 'Mike Barnes' })
    await repo.appendMessage(t.id, { from: 'Me', fromName: 'Mike Barnes', text: 'Following up' })
    const bob = await repo.listNotifications('bob-lindt')
    const msgs = bob.items.filter(x => x.type === 'message')
    // One for the outreach creation, one for the reply.
    expect(msgs.length).toBe(2)
    expect(msgs.every(m => m.params.name === 'Mike Barnes')).toBe(true)
  })

  test('a group message does NOT raise a per-user notification (group fan-out is future work)', async () => {
    const g = await repo.getGroupById('seafood-modelling')
    const t = await repo.findOrCreateGroupThread(g)
    const before = (await repo.listNotifications('me')).items.length
    await repo.appendMessage(t.id, { from: 'Me', text: 'Hello group' })
    const after = (await repo.listNotifications('me')).items.length
    expect(after).toBe(before)
  })

  test('a purchase notifies the listing owner', async () => {
    // m-trucking was created by anna-r (createdById).
    await repo.recordPurchase('m-trucking', 'me')
    const anna = await repo.listNotifications('anna-r')
    const n = anna.items.find(x => x.type === 'purchase')
    expect(n).toBeTruthy()
    expect(n.params).toEqual({ buyer: 'Mike Barnes', tool: 'Trucking Firm Valuation Model' })
    expect(n.link).toBe('/marketplace')
  })

  test('re-purchasing the same listing does not notify the owner twice', async () => {
    await repo.recordPurchase('m-trucking', 'me')
    await repo.recordPurchase('m-trucking', 'me')
    const anna = await repo.listNotifications('anna-r')
    expect(anna.items.filter(x => x.type === 'purchase').length).toBe(1)
  })
})
