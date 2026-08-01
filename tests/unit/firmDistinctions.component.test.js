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

  test('every template the picker offers gets a UNIQUE key', async () => {
    // The control, not a note. "Capacity, Capability, Opportunity" appears TWICE inside
    // General Tools in the master export, so a title-keyed list made Vue warn about
    // duplicate keys and could reuse one row's DOM node for the other — landing a tick
    // on the row the manager did not click.
    //
    // Asserted against the list the picker is ACTUALLY handed (the projected, filtered
    // one), not the raw file: the first version of this fix keyed on a field the
    // projection dropped, so every key was `undefined|<title>` and the collision
    // survived. A future master export that reintroduces the clash fails here rather
    // than silently on screen. We never edit that file; we only have to survive it.
    const wrapper = await mountHub()
    wrapper.vm.openDistinctionForm({ ...PLATFORM_ROWS[0], kind: 'platform' })
    await wrapper.vm.$nextTick()

    const form = wrapper.findComponent({ name: 'FirmDistinctionForm' })
    const offered = form.props('allTemplates')
    const keys = offered.map(t => form.vm.pickerKey(t))

    expect(offered.length).toBeGreaterThan(0)
    expect(new Set(keys).size).toBe(offered.length)
    // …and the titles genuinely do collide, so the assertion above is not vacuous.
    expect(new Set(offered.map(t => t.title)).size).toBeLessThan(offered.length)
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

// Finding a mentor update, added 2026-08-01 — the Quizzes rail's answer, applied here.
//
// The banner above the list has always said "N mentor updates since your last visit",
// and its own comment finished the sentence: "switch domains to find the badged rows."
// Fourteen domains, one on screen at a time. A manager was told something had changed
// and then left to hunt for it, which is how a notice stops being read.
describe('the sidebar says which domain holds an update', () => {
  /**
   * The rows above sit in a domain the sidebar does not list, which is fine for the
   * card tests but meaningless for a per-domain count. These are the same two rows in
   * a real domain, with a third in another, so "which one" is a genuine question.
   */
  const CONFLICT_ROWS = PLATFORM_ROWS.map(r => ({ ...r, domain: 'conflict' }))

  /** A platform row in a second domain. */
  const RISK_ROW = {
    id: 'pd-9',
    domain: 'risk',
    description: 'No one has looked at the insurance cover in years',
    triggers: ['insurance'],
    templates: ['Risk Register'],
    boost: 5
  }

  test('a passively-updated row counts against its own domain, and no other', async () => {
    const wrapper = await mountHub({
      livePlatformRows: [...CONFLICT_ROWS, { ...RISK_ROW, mentorUpdated: true, mentorUpdatedAt: '2026-07-30' }],
      selectedDistinctionDomain: 'conflict'
    })

    expect(wrapper.vm.distinctionUpdateCounts.risk).toBe(1)
    expect(wrapper.vm.distinctionUpdateCounts.conflict).toBe(0)
    const items = wrapper.findAll('.dist-domain').wrappers
    const flagged = items.filter(w => w.text().includes('update'))
    expect(flagged.length).toBe(1)
    expect(flagged[0].text()).toContain('Risk Management')
    expect(flagged[0].text()).toContain('1 update')
  })

  test('a row the firm edited that the mentor has since changed counts too', async () => {
    // Both flags mean "the mentor changed something in here". One needs a decision and
    // one is a notice, but the question the sidebar answers — is there anything to look
    // at in this domain? — has the same answer for both.
    const wrapper = await mountHub({
      livePlatformRows: CONFLICT_ROWS,
      selectedDistinctionDomain: 'conflict',
      distinctionState: { ownRows: [], declinedIds: [], overrides: { 'pd-2': { description: 'Our wording' } } },
      distinctionDriftIds: ['pd-2']
    })

    expect(wrapper.vm.distinctionUpdateCounts.conflict).toBe(1)
  })

  test('two updates in one domain read as two, not as a dot', async () => {
    const wrapper = await mountHub({
      livePlatformRows: CONFLICT_ROWS.map(r => ({ ...r, mentorUpdated: true, mentorUpdatedAt: '2026-07-30' })),
      selectedDistinctionDomain: 'conflict'
    })

    expect(wrapper.vm.distinctionUpdateCounts.conflict).toBe(2)
    const flagged = wrapper.findAll('.dist-domain').wrappers.filter(w => w.text().includes('update'))
    expect(flagged[0].text()).toContain('2 updates')
  })

  test('nothing is counted when the mentor has changed nothing', async () => {
    // The control. Without it every assertion above could pass on a sidebar that
    // badged all fourteen domains — which would send a manager into empty ones and
    // teach them the count means nothing.
    const wrapper = await mountHub({
      livePlatformRows: [...CONFLICT_ROWS, RISK_ROW],
      selectedDistinctionDomain: 'conflict'
    })

    expect(Object.values(wrapper.vm.distinctionUpdateCounts).every(n => n === 0)).toBe(true)
    expect(wrapper.findAll('.dist-domain').wrappers.some(w => w.text().includes('update'))).toBe(false)
  })

  test('every domain still shows its name, counted or not', async () => {
    // The count is added to the sidebar; it must not replace what was there. The label
    // moved from a Buefy prop into a slot to make room for it, and Buefy renders one or
    // the other — so this is the assertion that catches the label vanishing.
    const wrapper = await mountHub({
      livePlatformRows: [...CONFLICT_ROWS, { ...RISK_ROW, mentorUpdated: true }],
      selectedDistinctionDomain: 'conflict'
    })

    const names = wrapper.findAll('.dist-domain-name').wrappers.map(w => w.text())
    expect(names.length).toBe(14)
    expect(names).toContain('Conflict & Dispute')
    expect(names).toContain('Risk Management')
  })

  test('the count is the rows the tab will badge, not the rows the firm has touched', async () => {
    // An override the mentor has NOT changed is not an update. Counting overrides would
    // point at a domain where the manager finds nothing badged, and a sidebar that
    // disagrees with the screen it points at is worse than no count at all.
    const wrapper = await mountHub({
      livePlatformRows: CONFLICT_ROWS,
      selectedDistinctionDomain: 'conflict',
      distinctionState: { ownRows: [], declinedIds: [], overrides: { 'pd-2': { description: 'Our wording' } } },
      distinctionDriftIds: []
    })

    expect(wrapper.vm.distinctionUpdateCounts.conflict).toBe(0)
    // …and the card really is drawn, so the zero is about the flag, not an empty domain.
    expect(wrapper.findAll('.distinction').length).toBe(2)
  })
})
