'use strict'

/**
 * Tests for the group-invitation logic (server/data/repository.js):
 * - listManageableGroups: the groups a viewer can invite into.
 * - inviteToGroup: validation (manage rights, not-already-member, group exists).
 * - respondInvitation: Accept joins the group; Decline does not; idempotent.
 *
 * The repository keeps in-memory state for the whole test file, so the tests are
 * ordered to avoid colliding on that shared state.
 */

const repo = require('../../server/collaborate/data/repository')

const ME = { id: 'me', name: 'Mike Barnes', firm: 'Advisor-e' }

describe('listManageableGroups', () => {
  test('returns groups the viewer is in (mock stands in for owner/manager)', async () => {
    const mine = await repo.listManageableGroups('me')
    expect(mine.some(g => g.id === 'seafood-modelling')).toBe(true)
    // "me" is not a member of the tax group, so it must not appear.
    expect(mine.some(g => g.id === 'tax-automation')).toBe(false)
  })
})

describe('inviteToGroup', () => {
  test('rejects a group that does not exist', async () => {
    const r = await repo.inviteToGroup('no-such-group', ME, 'bob-lindt', '')
    expect(r.error).toBe('GROUP_NOT_FOUND')
  })

  test('rejects when the inviter does not manage the group', async () => {
    const stranger = { id: 'nobody', name: 'Nobody' }
    const r = await repo.inviteToGroup('seafood-modelling', stranger, 'bob-lindt', '')
    expect(r.error).toBe('NOT_MANAGER')
  })

  test('rejects inviting someone already in the group', async () => {
    // bob-lindt is already a member of seafood-modelling, which "me" manages.
    const r = await repo.inviteToGroup('seafood-modelling', ME, 'bob-lindt', '')
    expect(r.error).toBe('ALREADY_MEMBER')
  })

  test('succeeds for a managed group and a non-member invitee', async () => {
    const g = await repo.createGroup({ name: 'Invite Test Group' }, ME)
    const r = await repo.inviteToGroup(g.id, ME, 'bob-lindt', 'We would value your input.')
    expect(r.success).toBe(true)
    expect(typeof r.threadId).toBe('string')
    expect(r.group.id).toBe(g.id)
  })
})

describe('respondInvitation', () => {
  test('Accept adds the invitee to the group', async () => {
    const r = await repo.respondInvitation('t-inv-hosp', 'me', true)
    expect(r).toEqual(expect.objectContaining({ success: true, accepted: true, groupId: 'hospitality-turnaround' }))
    const g = await repo.getGroupById('hospitality-turnaround')
    expect((g.members || []).some(m => m.id === 'me')).toBe(true)
  })

  test('a handled invitation cannot be actioned again', async () => {
    const again = await repo.respondInvitation('t-inv-hosp', 'me', true)
    expect(again).toBeNull()
  })

  test('Decline does not add the invitee to the group', async () => {
    const r = await repo.respondInvitation('t-inv-tax', 'me', false)
    expect(r).toEqual(expect.objectContaining({ success: true, accepted: false, groupId: 'tax-automation' }))
    const g = await repo.getGroupById('tax-automation')
    expect((g.members || []).some(m => m.id === 'me')).toBe(false)
  })

  test('returns null for an unknown invitation', async () => {
    const r = await repo.respondInvitation('does-not-exist', 'me', true)
    expect(r).toBeNull()
  })
})
