/**
 * @jest-environment jsdom
 */
'use strict'
/* eslint-env browser, jest */

/**
 * Component tests for components/shared/ManagerConsole.vue — the shared management
 * console that serves every role tier (Q-ROLES). pages/firm.vue is a thin wrapper
 * around it. Loads the payload, renders advisers (incl. the blocked tag), toggles
 * the cross-firm posture, approves/declines a request, and — in preview mode —
 * shows the ribbon + disables the interactive actions.
 */

import { mount, createLocalVue } from '@vue/test-utils'
import ManagerConsole from '../../components/collaborate/shared/ManagerConsole.vue'

const localVue = createLocalVue()
const Stub = { render (h) { return h('div', this.$slots.default) } }
;['b-message', 'b-button', 'b-input', 'b-checkbox', 'b-select', 'b-modal', 'b-field', 'nuxt-link'].forEach(n => localVue.component(n, Stub))

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

const CONSOLE = {
  firm: 'Advisor-e',
  scope: { tier: 'firm_manager', firm: 'Advisor-e' },
  manager: { id: 'me', name: 'Mike Barnes' },
  stats: { advisers: 6, groups: 2, pendingApprovals: 1, crossOrgPosture: 'open' },
  advisers: [
    { id: 'me', name: 'Mike Barnes', title: 'Partner', available: true, blocked: false, isMe: true, groupCount: 2, lastActive: 'Today' },
    { id: 'james-obrien', name: "James O'Brien", title: 'Associate', available: false, blocked: true, isMe: false, groupCount: 0, lastActive: '1 week ago' }
  ],
  approvals: [{ id: 'gjr-1', advisor: { id: 'anna-r', name: 'Anna Richter', firm: 'BDO' }, groupId: 'cashflow-clinic', groupName: 'Cashflow Clinic' }],
  activity: [{ at: '2026-07-06T09:14:00.000Z', actorName: 'Sofia Marchetti', action: 'listing.create', meta: {} }]
}

function factory (propsData) {
  return mount(ManagerConsole, {
    localVue,
    propsData: propsData || {},
    mocks: {
      $t: (k, p) => (p && p.firm ? k + ':' + p.firm : (p && p.country ? k + ':' + p.country : k)),
      $buefy: { toast: { open: jest.fn() } }
    }
  })
}

describe('firm console page', () => {
  afterEach(() => { delete global.fetch })

  test('loads and renders the firm, advisers, the blocked tag and activity', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(CONSOLE) }))
    const w = factory()
    await flush(); await w.vm.$nextTick()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/firm')
    expect(w.vm.postureOpen).toBe(true)
    expect(w.text()).toContain('Advisor-e')
    expect(w.text()).toContain('Mike Barnes')
    expect(w.text()).toContain("James O'Brien")
  })

  test('setPosture posts the new posture and updates state', async () => {
    global.fetch = jest.fn((url) => {
      const payload = url.includes('/firm/posture') ? { success: true, crossOrgPosture: 'closed' } : CONSOLE
      return Promise.resolve({ ok: true, json: () => Promise.resolve(payload) })
    })
    const w = factory()
    await flush()
    await w.vm.setPosture('closed')
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/firm/posture', expect.objectContaining({ method: 'POST' }))
    expect(w.vm.c.stats.crossOrgPosture).toBe('closed')
  })

  test('respondApproval accepts a request via the shared endpoint and reloads', async () => {
    global.fetch = jest.fn((url) => {
      const payload = url.includes('/group-requests/') ? { success: true } : CONSOLE
      return Promise.resolve({ ok: true, json: () => Promise.resolve(payload) })
    })
    const w = factory()
    await flush()
    await w.vm.respondApproval({ id: 'gjr-1' }, true)
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/group-requests/gjr-1/accept', expect.objectContaining({ method: 'POST' }))
  })

  test('search narrows the advisers list (scales to a large firm)', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(CONSOLE) }))
    const w = factory()
    await flush()
    expect(w.vm.filteredAdvisers).toHaveLength(2)
    w.vm.advSearch = "o'brien"
    expect(w.vm.filteredAdvisers).toHaveLength(1)
    expect(w.vm.filteredAdvisers[0].id).toBe('james-obrien')
    w.vm.advSearch = 'partner' // matches Mike's title
    expect(w.vm.filteredAdvisers.map(a => a.id)).toEqual(['me'])
    w.vm.advSearch = 'zzz'
    expect(w.vm.filteredAdvisers).toHaveLength(0)
  })

  test('viewAs posts the target and reloads as that adviser', async () => {
    global.fetch = jest.fn((url) => {
      const payload = url.includes('/view-as') ? { success: true, asId: 'priya-nair', asName: 'Priya Nair' } : CONSOLE
      return Promise.resolve({ ok: true, json: () => Promise.resolve(payload) })
    })
    const w = factory()
    await flush()
    const reload = jest.spyOn(w.vm, 'reloadTo').mockImplementation(() => {})
    await w.vm.viewAs({ id: 'priya-nair' })
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/firm/view-as', expect.objectContaining({ method: 'POST' }))
    expect(reload).toHaveBeenCalledWith('/')
  })

  test('viewAs surfaces a refusal (e.g. blocked) without reloading', async () => {
    global.fetch = jest.fn((url) => {
      const payload = url.includes('/view-as')
        ? { success: false, error: { code: 'BLOCKED', message: 'blocked' } }
        : CONSOLE
      return Promise.resolve({ ok: !url.includes('/view-as'), json: () => Promise.resolve(payload) })
    })
    const w = factory()
    await flush()
    const reload = jest.spyOn(w.vm, 'reloadTo').mockImplementation(() => {})
    await w.vm.viewAs({ id: 'james-obrien' })
    await flush()
    expect(reload).not.toHaveBeenCalled()
    expect(w.vm.$buefy.toast.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'is-warning' }))
  })

  test('humanize and formatWhen behave', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(CONSOLE) }))
    const w = factory()
    await flush()
    expect(w.vm.humanize('group.shared_page_added')).toBe('group shared page added')
    expect(typeof w.vm.formatWhen('2026-07-06T09:14:00.000Z')).toBe('string')
    expect(w.vm.formatWhen('')).toBe('')
  })

  test('labels itself by tier: a Group payload reads its country + shows the roll-up', async () => {
    const GROUP = Object.assign({}, CONSOLE, { firm: 'BDO Germany', scope: { tier: 'group_manager', country: 'DE' } })
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(GROUP) }))
    const w = factory({ endpoint: '/api/people/console/preview/group', preview: true })
    await flush(); await w.vm.$nextTick()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/console/preview/group')
    expect(w.vm.tier).toBe('group_manager')
    expect(w.vm.isFirm).toBe(false) // drives the flat table vs the cascading roll-up
    expect(w.vm.scopeChip).toContain('Germany') // country name, not the firm
    expect(w.vm.preview).toBe(true)
    expect(w.vm.advisersSub).toContain('Germany') // "Everyone in Germany"
  })

  // Option A (owner): a manager may set Open even while a stricter level above caps
  // it — the console shows the cap rather than disabling the control.
  test('bulk-invite: toggleAll selects all visible advisers; clearSelection empties', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(CONSOLE) }))
    const w = factory()
    await flush()
    w.vm.toggleAll(true)
    expect(w.vm.selectedIds.slice().sort()).toEqual(['james-obrien', 'me'])
    expect(w.vm.allSelected).toBe(true)
    w.vm.toggleSelect('me') // untick one
    expect(w.vm.selectedIds).toEqual(['james-obrien'])
    w.vm.clearSelection()
    expect(w.vm.selectedIds).toEqual([])
  })

  test('bulk-invite: select advisers, load groups, send invitations, clear on success', async () => {
    global.fetch = jest.fn((url) => {
      let payload
      if (url === '/api/people/my-groups') { payload = [{ id: 'g1', name: 'Cashflow Clinic' }] } else if (url.includes('/invite-many')) { payload = { success: true, invited: [{ id: 'james-obrien' }], skipped: [] } } else { payload = CONSOLE }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(payload) })
    })
    const w = factory()
    await flush(); await w.vm.$nextTick()
    w.vm.toggleSelect('james-obrien')
    await w.vm.openBulkInvite()
    await flush()
    expect(w.vm.myGroups).toHaveLength(1)
    w.vm.bulkGroupId = 'g1'
    await w.vm.sendBulkInvites()
    await flush()
    expect(global.fetch).toHaveBeenCalledWith('/api/people/groups/g1/invite-many', expect.objectContaining({ method: 'POST' }))
    expect(w.vm.bulkOpen).toBe(false)
    expect(w.vm.selectedIds).toEqual([]) // cleared after success
  })

  test('a capped Open shows the cap note; the toggle reflects the manager\'s own choice', async () => {
    const CAPPED = Object.assign({}, CONSOLE, {
      stats: Object.assign({}, CONSOLE.stats, { crossOrgPosture: 'closed' }),
      crossOrg: { level: 'firm', scopeLabel: 'Advisor-e Munich', own: 'open', ceiling: 'closed', cappedBy: 'global', effective: 'closed' }
    })
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(CAPPED) }))
    const w = factory()
    await flush(); await w.vm.$nextTick()
    expect(w.vm.crossOrg.cappedBy).toBe('global')
    expect(w.vm.ownOpen).toBe(true) // their own switch is Open…
    expect(w.vm.postureOpen).toBe(false) // …but the effective state is capped closed
    expect(w.vm.hasCeiling).toBe(true)
    expect(w.vm.cappedNote).toBe('console.crossOrg.capped')
  })
})
