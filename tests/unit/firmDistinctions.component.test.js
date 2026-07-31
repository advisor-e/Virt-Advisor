/**
 * @jest-environment jsdom
 */
'use strict'

// The Advisory Distinctions tab as a manager actually meets it.
//
// WHY THIS FILE EXISTS. This tab had NO component test at all, and on 2026-08-01 it was
// rebuilt from a Buefy table into cards so that clicking Edit opens the form in the row
// clicked — Mike's ruling that every Firm Manager tab behaves the way Quizzes does,
// after a form at the foot of a panel read as "the button does nothing". A rebuild with
// no test is the same bet that lost last time: the suite cannot see a screen.
//
// These tests assert POSITION, not just presence.

const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmManagerHub = require('../../components/FirmManagerHub.vue').default

const PLATFORM_ROWS = [
  {
    id: 'pd-1',
    domain: 'growth',
    description: 'The owners are not aligned on where the business is heading',
    triggers: ['they disagree', 'no shared plan'],
    templates: ['Vision Builder'],
    boost: 5
  },
  {
    id: 'pd-2',
    domain: 'growth',
    description: 'Revenue is growing but cash is not',
    triggers: ['cash is tight'],
    templates: ['Cash Flow Forecast'],
    boost: 5
  }
]

/**
 * Mount the Hub with every network call stubbed, then put the distinctions state in
 * directly. The loaders are not what these tests are about, and driving five endpoints
 * to reach one screen would make the test fail for reasons that have nothing to do with
 * the layout it is guarding.
 */
async function mountHub (state) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))
  const wrapper = mountWithBuefy(FirmManagerHub, {
    propsData: { firmId: 'firm-1', apiToken: 'test-token', userEmail: 'm@x.com' }
  })
  await new Promise(resolve => setTimeout(resolve, 0))
  wrapper.setData(Object.assign({
    loadingFirmDistinctions: false,
    livePlatformRows: PLATFORM_ROWS,
    selectedDistinctionDomain: 'growth',
    distinctionState: { ownRows: [], declinedIds: [], overrides: {} }
  }, state))
  await wrapper.vm.$nextTick()
  return wrapper
}

afterEach(() => { delete global.fetch })

describe('editing a distinction happens in the distinction', () => {
  test('the domain\'s distinctions are drawn as cards', async () => {
    const wrapper = await mountHub()
    const cards = wrapper.findAll('.distinction')
    expect(cards.length).toBe(2)
    expect(cards.at(0).text()).toContain('The owners are not aligned')
  })

  test('clicking Edit opens the form INSIDE that card, not at the foot of the panel', async () => {
    const wrapper = await mountHub()

    wrapper.vm.openDistinctionForm({ ...PLATFORM_ROWS[1], kind: 'platform' })
    await wrapper.vm.$nextTick()

    const edited = wrapper.findAll('.distinction').at(1)
    expect(edited.classes()).toContain('is-editing')
    expect(edited.find('.distinction-fields').exists()).toBe(true)

    // …and NOT in the add-form box at the bottom. Before the rebuild both were the
    // same box, so this is the assertion that pins the change.
    expect(wrapper.find('.box.distinction-form').exists()).toBe(false)
  })

  test('only the distinction being edited becomes a form', async () => {
    const wrapper = await mountHub()
    wrapper.vm.openDistinctionForm({ ...PLATFORM_ROWS[0], kind: 'platform' })
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.distinction-fields').length).toBe(1)
    expect(wrapper.findAll('.distinction').at(0).classes()).toContain('is-editing')
    expect(wrapper.findAll('.distinction').at(1).classes()).not.toContain('is-editing')
  })

  test('adding a distinction still opens the form at the END of the list', async () => {
    const wrapper = await mountHub()
    wrapper.vm.openDistinctionForm(null)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.box.distinction-form').exists()).toBe(true)
    expect(wrapper.findAll('.distinction.is-editing').length).toBe(0)
  })

  test('a switched-off distinction is still listed, muted, with a way back', async () => {
    // The rebuild must not lose what the table showed: a declined row is set aside,
    // not gone, or switching one off reads as deleting it.
    const wrapper = await mountHub({
      distinctionState: { ownRows: [], declinedIds: ['pd-1'], overrides: {} }
    })
    const first = wrapper.findAll('.distinction').at(0)
    expect(first.classes()).toContain('distinction-off')
    expect(first.text()).toContain('Switch on')
  })

  test('a customised distinction shows the firm\'s wording and offers Reset to platform', async () => {
    const wrapper = await mountHub({
      distinctionState: {
        ownRows: [],
        declinedIds: [],
        overrides: { 'pd-1': { description: 'Our own wording', triggers: ['ours'], templates: ['Vision Builder'], boost: 7 } }
      }
    })
    const first = wrapper.findAll('.distinction').at(0)
    expect(first.text()).toContain('Our own wording')
    expect(first.text()).toContain('Reset to platform')
  })
})

describe('the extracted form keeps the parent in charge of the values', () => {
  test('ticking a template emits a NEW templates array rather than mutating the row', async () => {
    // An in-place push would change the parent's object with no `input` event, which is
    // how a save comes to disagree with what is on screen.
    const wrapper = await mountHub()
    wrapper.vm.openDistinctionForm({ ...PLATFORM_ROWS[0], kind: 'platform' })
    await wrapper.vm.$nextTick()

    const before = wrapper.vm.distinctionForm.templates
    const form = wrapper.findComponent({ name: 'FirmDistinctionForm' })
    form.vm.toggleTemplate('Cash Flow Forecast')
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.distinctionForm.templates).toContain('Cash Flow Forecast')
    expect(wrapper.vm.distinctionForm.templates).not.toBe(before)
    expect(before).not.toContain('Cash Flow Forecast')
  })

  test('the picker opens with fresh filters each time a form is opened', async () => {
    // The parent used to have to remember to reset these on open AND on close. A fresh
    // child mounts with fresh filters, so a stale search cannot follow the manager from
    // one distinction to the next.
    const wrapper = await mountHub()
    wrapper.vm.openDistinctionForm({ ...PLATFORM_ROWS[0], kind: 'platform' })
    await wrapper.vm.$nextTick()

    const form = wrapper.findComponent({ name: 'FirmDistinctionForm' })
    form.setData({ pickerSearch: 'cash' })
    await wrapper.vm.$nextTick()

    wrapper.vm.closeDistinctionForm()
    await wrapper.vm.$nextTick()
    wrapper.vm.openDistinctionForm({ ...PLATFORM_ROWS[1], kind: 'platform' })
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent({ name: 'FirmDistinctionForm' }).vm.pickerSearch).toBe('')
  })
})
