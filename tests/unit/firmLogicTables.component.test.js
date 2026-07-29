/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmLogicTables = require('~/components/firm/FirmLogicTables.vue').default

/**
 * Component tests for the firm Logic Tables screen (FIRM-EDITABLE-TABLES-PLAN.md
 * Phase 3, Slice B) — the live, editable IF→THEN branch tables the advisors' AI
 * reads. The claims that matter: the rail groups load, a table opens into the
 * editable four-column grid (or says so when empty), Save is inert until an edit
 * and then posts the cleaned branches (id kept, on-screen origin stripped),
 * reset is offered only for a firm-authored table, and add/remove edit the
 * local copy.
 *
 * Assertions use i18n KEYS, not English (tests/helpers/mountComponent.js).
 */

function defaultList () {
  return {
    doTheJob: [
      { id: 'eoy_meeting', label: 'End of Year Meeting', count: 5, origin: 'platform' },
      { id: 'conflict_meeting', label: 'Conflict Meeting', count: 6, origin: 'firm' }
    ],
    getTheJob: [
      { id: 'get_marketing', label: 'Get Marketing', count: 5, origin: 'platform' }
    ],
    getOrganised: [
      { id: 'org_leadership', label: 'Leadership & Partner Development', count: 4, origin: 'platform' }
    ]
  }
}

function eoyDetail (origin) {
  return {
    id: 'eoy_meeting',
    label: 'End of Year Meeting — Planning and Delivery',
    origin: origin || 'platform',
    branches: [
      { id: 'eoy_stage1', branch_name: 'Stage 1 — Pre-Meeting Outreach', condition: 'Advisor is preparing.', action: 'Direct to the EOY Approach Resources.', notes: 'SMS beats email.' },
      { id: 'eoy_stage2', branch_name: 'Stage 2 — Client Audit', condition: 'Meeting is booked.', action: 'Run the audit.', notes: '' }
    ]
  }
}

function emptyDetail () {
  return { id: 'empty_tree', label: 'Empty', origin: 'platform', branches: [] }
}

function stubFetch (list, details) {
  global.fetch = jest.fn((url) => {
    const u = String(url)
    let data = {}
    if (/\/logic-trees\/[^/]+\/history/.test(u)) {
      data = { history: [] }
    } else if (/\/logic-trees\/([^/?]+)$/.test(u)) {
      const id = decodeURIComponent(u.match(/\/logic-trees\/([^/?]+)$/)[1])
      data = details[id] || {}
    } else if (/\/logic-trees$/.test(u)) {
      data = list
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(data) })
  })
}

async function settle (wrapper) {
  await new Promise(resolve => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()
  await new Promise(resolve => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()
}

async function mountScreen (list, details) {
  stubFetch(list || defaultList(), details || { eoy_meeting: eoyDetail(), empty_tree: emptyDetail() })
  const wrapper = mountWithBuefy(FirmLogicTables, { propsData: { apiToken: 'test-token' } })
  await settle(wrapper)
  return wrapper
}

async function openTable (wrapper, id, label, origin) {
  await wrapper.vm.select({ id, label, origin: origin || 'platform' })
  await wrapper.vm.$nextTick()
  return wrapper
}

afterEach(() => { delete global.fetch })

describe('reordering branches (only where order is presentation, not flow)', () => {
  // eoyDetail() carries no `reorderable`, standing in for a nodes-shaped tree.
  const flatDetail = () => Object.assign(eoyDetail(), { reorderable: true })

  test('no move controls on a table the backend will not let the firm reorder', async () => {
    const wrapper = await openTable(await mountScreen(), 'eoy_meeting', 'End of Year Meeting')
    expect(wrapper.vm.current.reorderable).toBe(false)
    expect(wrapper.findAll('.lt-branch-move').length).toBe(0)
  })

  test('move controls appear on a reorderable table', async () => {
    const wrapper = await mountScreen(undefined, { eoy_meeting: flatDetail() })
    await openTable(wrapper, 'eoy_meeting', 'End of Year Meeting')
    expect(wrapper.vm.current.reorderable).toBe(true)
    expect(wrapper.findAll('.lt-branch-move').length).toBeGreaterThan(0)
  })

  test('moveBranch reorders on a reorderable table and survives the save payload', async () => {
    const wrapper = await mountScreen(undefined, { eoy_meeting: flatDetail() })
    await openTable(wrapper, 'eoy_meeting', 'End of Year Meeting')
    const wasSecond = wrapper.vm.form.branches[1].id

    wrapper.vm.moveBranch(1, -1)
    expect(wrapper.vm.form.branches[0].id).toBe(wasSecond)

    await wrapper.vm.save()
    const post = global.fetch.mock.calls.find(c => c[1] && c[1].method === 'POST')
    expect(JSON.parse(post[1].body).branches[0].id).toBe(wasSecond)
  })

  // The guard, not the hidden buttons, is what protects the flow.
  test('moveBranch refuses to act on a non-reorderable table even if called directly', async () => {
    const wrapper = await openTable(await mountScreen(), 'eoy_meeting', 'End of Year Meeting')
    const before = wrapper.vm.form.branches.map(b => b.id)
    wrapper.vm.moveBranch(1, -1)
    expect(wrapper.vm.form.branches.map(b => b.id)).toEqual(before)
  })

  test('a move off either end is ignored rather than losing a branch', async () => {
    const wrapper = await mountScreen(undefined, { eoy_meeting: flatDetail() })
    await openTable(wrapper, 'eoy_meeting', 'End of Year Meeting')
    const before = wrapper.vm.form.branches.map(b => b.id)
    wrapper.vm.moveBranch(0, -1)
    wrapper.vm.moveBranch(before.length - 1, 1)
    expect(wrapper.vm.form.branches.map(b => b.id)).toEqual(before)
  })
})

describe('loading', () => {
  test('asks the backend for the logic-table list, with the bearer token', async () => {
    await mountScreen()
    expect(global.fetch.mock.calls[0][0]).toBe('/api/firm-manager/logic-trees')
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer test-token')
  })

  test('a failed load says so rather than rendering an empty screen', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, statusText: 'boom', json: () => Promise.resolve({}) }))
    const wrapper = mountWithBuefy(FirmLogicTables, { propsData: { apiToken: 't' } })
    await settle(wrapper)
    expect(wrapper.text()).toContain('firmLogicTables.loadFailed')
  })
})

describe('the rail', () => {
  test('lists the three master-section groups with their tables', async () => {
    const wrapper = await mountScreen()
    expect(wrapper.text()).toContain('firmLogicTables.groupDoTheJob')
    expect(wrapper.text()).toContain('firmLogicTables.groupGetTheJob')
    expect(wrapper.text()).toContain('firmLogicTables.groupGetOrganised')
    expect(wrapper.text()).toContain('End of Year Meeting')
    expect(wrapper.text()).toContain('Get Marketing')
  })

  test('before a table is picked, the panel invites a choice', async () => {
    const wrapper = await mountScreen()
    expect(wrapper.text()).toContain('firmLogicTables.pickPrompt')
  })

  test('search filters the table list', async () => {
    const wrapper = await mountScreen()
    wrapper.setData({ query: 'conflict' })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Conflict Meeting')
    expect(wrapper.text()).not.toContain('End of Year Meeting')
  })
})

describe('opening a table', () => {
  test('renders the four-column IF→THEN table with the branches', async () => {
    const wrapper = await openTable(await mountScreen(), 'eoy_meeting', 'End of Year Meeting')
    expect(wrapper.text()).toContain('firmLogicTables.colBranch')
    expect(wrapper.text()).toContain('firmLogicTables.colIf')
    expect(wrapper.text()).toContain('firmLogicTables.colThen')
    expect(wrapper.vm.form.branches).toHaveLength(2)
    expect(wrapper.vm.form.branches[0].branch_name).toContain('Pre-Meeting Outreach')
  })

  test('a table with no branches says so instead of an empty grid', async () => {
    const wrapper = await openTable(await mountScreen(), 'empty_tree', 'Empty')
    expect(wrapper.text()).toContain('firmLogicTables.noBranches')
    expect(wrapper.vm.hasBranches).toBe(false)
  })

  test('Save is disabled until a branch is edited, then enabled', async () => {
    const wrapper = await openTable(await mountScreen(), 'eoy_meeting', 'End of Year Meeting')
    const findSave = () => wrapper.findAll('button').wrappers.find(w => w.text().includes('firmLogicTables.save'))
    expect(wrapper.vm.dirty).toBe(false)
    expect(findSave().attributes('disabled')).toBeTruthy()
    wrapper.vm.form.branches[0].condition = 'Reworded by the firm.'
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.dirty).toBe(true)
    expect(findSave().attributes('disabled')).toBeFalsy()
  })
})

describe('saving and resetting', () => {
  test('save posts the cleaned branches (trimmed, id kept, origin stripped)', async () => {
    const wrapper = await openTable(await mountScreen(), 'eoy_meeting', 'End of Year Meeting')
    wrapper.vm.form.branches[0].condition = '  Firm condition.  '
    await wrapper.vm.save()
    const post = global.fetch.mock.calls.find(c => c[1] && c[1].method === 'POST')
    expect(post).toBeTruthy()
    expect(post[0]).toBe('/api/firm-manager/logic-trees/eoy_meeting')
    const body = JSON.parse(post[1].body)
    expect(body.branches[0].condition).toBe('Firm condition.') // trimmed
    expect(body.branches[0].id).toBe('eoy_stage1') // id kept so the backend merges by id
    expect(body.branches[0].origin).toBeUndefined() // on-screen-only field stripped
  })

  test('after save the table is firm-authored and the rail tag follows', async () => {
    const wrapper = await openTable(await mountScreen(), 'eoy_meeting', 'End of Year Meeting')
    wrapper.vm.form.branches[0].condition = 'Firm condition.'
    await wrapper.vm.save()
    expect(wrapper.vm.current.origin).toBe('firm')
    expect(wrapper.vm.doTheJob.find(d => d.id === 'eoy_meeting').origin).toBe('firm')
  })

  test('reset is offered only for a firm-authored table, and deletes the override', async () => {
    const list = defaultList()
    list.doTheJob[0].origin = 'firm'
    const wrapper = await openTable(
      await mountScreen(list, { eoy_meeting: eoyDetail('firm') }),
      'eoy_meeting', 'End of Year Meeting', 'firm'
    )
    expect(wrapper.vm.canReset).toBe(true)
    await wrapper.vm.reset()
    const del = global.fetch.mock.calls.find(c => c[1] && c[1].method === 'DELETE')
    expect(del).toBeTruthy()
    expect(del[0]).toBe('/api/firm-manager/logic-trees/eoy_meeting')
    expect(wrapper.vm.current.origin).toBe('platform')
  })

  test('a platform table cannot be reset', async () => {
    const wrapper = await openTable(await mountScreen(), 'eoy_meeting', 'End of Year Meeting')
    expect(wrapper.vm.canReset).toBe(false)
  })
})

describe('on-screen editing (local only)', () => {
  test('add branch appends a firm-origin blank row; remove drops it', async () => {
    const wrapper = await openTable(await mountScreen(), 'eoy_meeting', 'End of Year Meeting')
    wrapper.vm.addBranch()
    expect(wrapper.vm.form.branches).toHaveLength(3)
    expect(wrapper.vm.form.branches[2].origin).toBe('firm')
    wrapper.vm.removeBranch(2)
    expect(wrapper.vm.form.branches).toHaveLength(2)
  })
})

describe('re-filing into another section (drag / Move to)', () => {
  test('moveTo posts to the section route and re-buckets the rail', async () => {
    const wrapper = await mountScreen()
    expect(wrapper.vm.doTheJob.some(d => d.id === 'eoy_meeting')).toBe(true)
    await wrapper.vm.moveTo('eoy_meeting', 'getTheJob')
    const post = global.fetch.mock.calls.find(c => c[1] && c[1].method === 'POST' && String(c[0]).endsWith('/section'))
    expect(post).toBeTruthy()
    expect(post[0]).toBe('/api/firm-manager/logic-trees/eoy_meeting/section')
    expect(JSON.parse(post[1].body)).toEqual({ section: 'getTheJob' })
    // Optimistically moved on screen.
    expect(wrapper.vm.doTheJob.some(d => d.id === 'eoy_meeting')).toBe(false)
    expect(wrapper.vm.getTheJob.some(d => d.id === 'eoy_meeting')).toBe(true)
  })

  test('moving to the section it already sits in is a no-op (no post)', async () => {
    const wrapper = await mountScreen()
    await wrapper.vm.moveTo('eoy_meeting', 'doTheJob')
    const post = global.fetch.mock.calls.find(c => c[1] && c[1].method === 'POST' && String(c[0]).endsWith('/section'))
    expect(post).toBeFalsy()
  })

  test('a failed save reverts the optimistic move', async () => {
    const wrapper = await mountScreen()
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, statusText: 'boom', json: () => Promise.resolve({}) }))
    await wrapper.vm.moveTo('eoy_meeting', 'getOrganised')
    expect(wrapper.vm.doTheJob.some(d => d.id === 'eoy_meeting')).toBe(true) // put back
    expect(wrapper.vm.getOrganised.some(d => d.id === 'eoy_meeting')).toBe(false)
  })
})
