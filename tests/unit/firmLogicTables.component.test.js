/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmLogicTables = require('~/components/firm/FirmLogicTables.vue').default

/**
 * Component tests for the firm Logic Tables screen (FIRM-EDITABLE-TABLES-PLAN.md
 * Phase 3, §0.6) — the IF→THEN branch tables the advisors' AI reads.
 *
 * This is the LIVE-PREVIEW read pass (Slice A): the rail groups load, a table
 * opens into the four-column IF→THEN grid, an empty table says so, the preview
 * banner is present and Save is inert (nothing persists yet), and on-screen
 * edits touch the local copy only.
 *
 * Assertions use i18n KEYS, not English (tests/helpers/mountComponent.js).
 */

function defaultList () {
  return {
    advisory: [
      { id: 'eoy_meeting', label: 'End of Year Meeting', count: 5, origin: 'platform' },
      { id: 'conflict_meeting', label: 'Conflict Meeting', count: 6, origin: 'firm' }
    ],
    getSellers: [
      { id: 'get_marketing', label: 'Get Marketing', count: 5, origin: 'platform' }
    ]
  }
}

function eoyDetail () {
  return {
    id: 'eoy_meeting',
    label: 'End of Year Meeting — Planning and Delivery',
    origin: 'platform',
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
    if (/\/logic-trees\/([^/?]+)$/.test(u)) {
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
  test('lists the two groups with their tables', async () => {
    const wrapper = await mountScreen()
    expect(wrapper.text()).toContain('firmLogicTables.groupAdvisory')
    expect(wrapper.text()).toContain('firmLogicTables.groupSellers')
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

  test('shows the preview banner and an inert (disabled) Save', async () => {
    const wrapper = await openTable(await mountScreen(), 'eoy_meeting', 'End of Year Meeting')
    expect(wrapper.text()).toContain('firmLogicTables.previewNotice')
    const save = wrapper.findAll('button').wrappers.find(w => w.text().includes('firmLogicTables.save'))
    expect(save).toBeTruthy()
    expect(save.attributes('disabled')).toBeTruthy()
  })

  test('never posts — this pass persists nothing', async () => {
    const wrapper = await openTable(await mountScreen(), 'eoy_meeting', 'End of Year Meeting')
    wrapper.vm.form.branches[0].action = 'Firm edit on screen.'
    await wrapper.vm.$nextTick()
    const anyWrite = global.fetch.mock.calls.find(c => c[1] && c[1].method && c[1].method !== 'GET')
    expect(anyWrite).toBeFalsy()
  })
})
