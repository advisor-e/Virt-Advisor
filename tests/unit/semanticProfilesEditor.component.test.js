/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * @file The Template Profiles row editor — item 4.97 / 7.2 US9.
 *
 * WHY THIS ONE TEST EXISTS, given the rule against asserting visual properties
 * (CLAUDE.md → Testing): this is not styling. On 2026-09-16 Mike clicked Edit on
 * `Retail` — a row well down the list — and reported that nothing happened. The
 * editor HAD opened, ~1,300px below the fold, behind 25 rows of table. The click
 * did its job invisibly, which to the person using it is indistinguishable from a
 * broken button.
 *
 * Neither the suite nor my own check caught it: I had clicked the FIRST row, where
 * the panel happens to land close enough to notice. So the thing worth pinning is
 * that opening the editor asks the browser to bring it into view — the one step
 * that turns a working feature into a usable one.
 *
 * Nothing here asserts wording, colour or layout.
 */

const { shallowMount } = require('@vue/test-utils')
const Component = require('../../components/mentor/MentorSemanticProfiles.vue').default

const ROW = {
  page: 'some-page',
  title: 'Retail',
  alsoOnPage: [],
  subSection: 'Revenue & Feasibility Models',
  effective: { revenue_modelling: 10 },
  source: 'auto',
  thin: false,
  thinReason: null,
  indicators: 'What this tool is for.',
  authoredBy: null,
  authoredAt: null,
  note: null,
  compiled: { revenue_modelling: 10 }
}

function mountEditor () {
  return shallowMount(Component, {
    propsData: { apiToken: 't' },
    mocks: {
      $t: k => k,
      $i18n: { locale: 'en' },
      $buefy: { toast: { open: jest.fn() } }
    },
    stubs: { 'b-table': true, 'b-table-column': true, 'b-input': true, 'b-button': true, 'b-checkbox': true, 'b-tag': true, 'b-notification': true, 'b-field': true, 'b-radio-button': true, 'b-loading': true }
  })
}

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ success: true, templates: [ROW], signals: [], thinCount: 0, total: 1, pages: 1, history: [] })
  })
})

afterEach(() => { delete global.fetch })

describe('opening the editor', () => {
  test('🔴 ASKS THE BROWSER TO SCROLL TO IT — without this the click looks dead', async () => {
    const wrapper = mountEditor()
    await wrapper.vm.$nextTick()

    const scrollIntoView = jest.fn()
    // The panel only exists once a row is open, so the ref is stubbed the way Vue
    // would have populated it by the time $nextTick runs.
    wrapper.vm.$refs.editor = { scrollIntoView }

    wrapper.vm.openEditor(ROW)
    await wrapper.vm.$nextTick()

    expect(scrollIntoView).toHaveBeenCalled()
  })

  test('survives a browser that has no scrollIntoView, rather than throwing', async () => {
    const wrapper = mountEditor()
    await wrapper.vm.$nextTick()
    wrapper.vm.$refs.editor = {}

    wrapper.vm.openEditor(ROW)
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.editing.page).toBe('some-page')
  })
})

describe('the draft the editor edits', () => {
  test('starts from the profile in force, not blank — the mentor edits what the engine reads', async () => {
    const wrapper = mountEditor()
    await wrapper.vm.$nextTick()
    wrapper.vm.$refs.editor = { scrollIntoView: jest.fn() }

    wrapper.vm.openEditor(ROW)
    expect(wrapper.vm.draft).toEqual({ revenue_modelling: 10 })
  })

  test('a freshly ticked signal starts at 5 — Mike\'s ruling, 2026-09-14', async () => {
    const wrapper = mountEditor()
    await wrapper.vm.$nextTick()
    wrapper.vm.$refs.editor = { scrollIntoView: jest.fn() }
    wrapper.vm.openEditor(ROW)

    wrapper.vm.toggleSignal('cash_flow_gap', true)
    expect(wrapper.vm.draft.cash_flow_gap).toBe(5)
  })

  test('unticking removes the signal rather than zeroing it', async () => {
    const wrapper = mountEditor()
    await wrapper.vm.$nextTick()
    wrapper.vm.$refs.editor = { scrollIntoView: jest.fn() }
    wrapper.vm.openEditor(ROW)

    wrapper.vm.toggleSignal('revenue_modelling', false)
    expect(wrapper.vm.draft.revenue_modelling).toBeUndefined()
  })

  test('a weight is clamped to 1-10, so the box cannot offer what the backend refuses', async () => {
    const wrapper = mountEditor()
    await wrapper.vm.$nextTick()
    wrapper.vm.$refs.editor = { scrollIntoView: jest.fn() }
    wrapper.vm.openEditor(ROW)

    wrapper.vm.setWeight('revenue_modelling', 99)
    expect(wrapper.vm.draft.revenue_modelling).toBe(10)
    wrapper.vm.setWeight('revenue_modelling', 0)
    expect(wrapper.vm.draft.revenue_modelling).toBe(1)
    wrapper.vm.setWeight('revenue_modelling', 4.6)
    expect(wrapper.vm.draft.revenue_modelling).toBe(5)
  })

  test('Cancel really cancels — the draft never wrote back to the row', async () => {
    const wrapper = mountEditor()
    await wrapper.vm.$nextTick()
    wrapper.vm.$refs.editor = { scrollIntoView: jest.fn() }
    wrapper.vm.openEditor(ROW)

    wrapper.vm.toggleSignal('staff_problem', true)
    wrapper.vm.closeEditor()

    expect(wrapper.vm.editing).toBeNull()
    expect(ROW.effective).toEqual({ revenue_modelling: 10 })
  })
})
