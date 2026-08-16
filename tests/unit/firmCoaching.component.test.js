/**
 * @jest-environment jsdom
 */
'use strict'

// The Coaching Reference tab as a manager actually meets it.
//
// These assert POSITION and STATE, not just presence — "a form exists somewhere on the
// page" is exactly what was true on the day Mike reported that clicking Edit appeared to
// do nothing on the Quizzes tab. His 2026-08-01 ruling is that every Firm Manager tab
// opens the edit box WHERE YOU CLICKED, and a test that only counts forms cannot see it.
//
// The rows-closed-by-default behaviour is the one place this tab departs from its
// siblings' layout. It was approved that way against
// design/mockups/firm-coaching-reference.html, so it is pinned here rather than left as
// an implementation detail somebody later "tidies" into a flat list.

const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmCoachingReference = require('../../components/firm/FirmCoachingReference.vue').default

const BASE = [
  {
    id: 'cr-growth',
    template: 'Growth Fundamentals Framework',
    howItHelps: 'A superb way to create self-relevance for your clients, and the fastest way to capture attention.',
    whatToLookFor: 'Any client that can fog a mirror.',
    whereMayLead: 'Advisory services.',
    scenarios: ['Client is unsure where to start', 'First advisory conversation']
  },
  {
    id: 'cr-eoy',
    template: 'EOY Meeting',
    howItHelps: 'Two bites at the cherry, without high pressure tactics.',
    whatToLookFor: 'Compliance-only clients.',
    whereMayLead: 'Advisory services.',
    scenarios: ['Annual accounts meeting']
  }
]

function payload (overrides) {
  return Object.assign({
    base: BASE,
    state: { declinedIds: [], overrides: {}, ownRows: [] },
    resolved: BASE.map(r => ({ ...r, source: 'platform' })),
    hasOverride: false
  }, overrides)
}

/** Let load() settle — several microtask turns, as in the sibling suites. */
async function settle (wrapper) {
  await new Promise(resolve => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()
  await new Promise(resolve => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()
}

async function mountTab (body, fetchImpl) {
  const data = payload(body)
  global.fetch = fetchImpl || jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(data) }))
  const wrapper = mountWithBuefy(FirmCoachingReference, { propsData: { apiToken: 'test-token' } })
  await settle(wrapper)
  return wrapper
}

afterEach(() => { delete global.fetch })

describe('the list a manager arrives at', () => {
  test('every entry is drawn, and every one starts CLOSED', async () => {
    // Fifteen entries of five prose fields laid flat is a wall of text. Approved as a
    // closed list that opens where you click.
    const wrapper = await mountTab()

    const rows = wrapper.findAll('.coach-row')
    expect(rows).toHaveLength(2)
    expect(wrapper.findAll('.coach-body')).toHaveLength(0)
    expect(wrapper.text()).toContain('Growth Fundamentals Framework')
    expect(wrapper.text()).toContain('EOY Meeting')
  })

  test('a closed row shows the opening words, so a closed list is still readable', async () => {
    const wrapper = await mountTab()

    const summary = wrapper.findAll('.coach-sum').at(0)
    expect(summary.text()).toContain('A superb way to create self-relevance')
    // Truncated, so a row stays one line high.
    expect(summary.text().endsWith('…')).toBe(true)
  })

  test('clicking a row opens THAT row and leaves the others closed', async () => {
    const wrapper = await mountTab()

    wrapper.findAll('.coach-head').at(1).trigger('click')
    await wrapper.vm.$nextTick()

    const opened = wrapper.findAll('.coach-row').at(1)
    expect(opened.classes()).toContain('coach-row--open')
    expect(opened.find('.coach-body').exists()).toBe(true)
    expect(wrapper.findAll('.coach-row').at(0).find('.coach-body').exists()).toBe(false)
  })

  test('an open row shows all five fields', async () => {
    const wrapper = await mountTab()

    wrapper.findAll('.coach-head').at(0).trigger('click')
    await wrapper.vm.$nextTick()

    const body = wrapper.findAll('.coach-row').at(0).find('.coach-body')
    expect(body.text()).toContain('Any client that can fog a mirror.')
    expect(body.text()).toContain('Advisory services.')
    expect(body.text()).toContain('Client is unsure where to start')
  })

  test('a field the entry does not carry says so rather than rendering blank', async () => {
    // Fourteen of the fifteen real entries have no delivery notes. That is correct, it
    // looks exactly like a bug, and the screen says which.
    const wrapper = await mountTab()

    wrapper.findAll('.coach-head').at(0).trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.coach-row').at(0).find('.coach-empty').exists()).toBe(true)
  })

  test('a failed load shows the error, not an empty screen', async () => {
    const wrapper = await mountTab(undefined, jest.fn(() => Promise.resolve({
      ok: false, status: 500, json: () => Promise.resolve({ error: { message: 'boom' } })
    })))

    expect(wrapper.find('.coach-row').exists()).toBe(false)
    // Asserted as the KEY, not the English. The test harness stubs $t to return the
    // key, and pinning English here would redden this suite the day the wording is
    // translated — the rule the Advisor Progress work earned on 2026-07-29.
    expect(wrapper.text()).toContain('firmCoaching.loadFailed')
  })

  test('an HTTP failure that still returns JSON is a failure', async () => {
    // Where a screen checks BOTH the status and the payload, one test must break them
    // apart — a fixture that trips two guards can only ever prove one. This is the
    // third sighting of that blind spot in this app's history.
    const wrapper = await mountTab(undefined, jest.fn(() => Promise.resolve({
      ok: false, status: 502, json: () => Promise.resolve(payload())
    })))

    expect(wrapper.text()).toContain('firmCoaching.loadFailed')
    expect(wrapper.find('.coach-row').exists()).toBe(false)
  })
})

describe('editing happens in the entry you clicked', () => {
  test('the form opens INSIDE that entry, not at the foot of the panel', async () => {
    const wrapper = await mountTab()

    wrapper.vm.openForm({ ...BASE[1], kind: 'platform' })
    await wrapper.vm.$nextTick()

    const edited = wrapper.findAll('.coach-row').at(1)
    expect(edited.classes()).toContain('coach-row--editing')
    expect(edited.find('.coach-entry-form').exists()).toBe(true)
    // …and nowhere else on the page.
    expect(wrapper.findAll('.coach-entry-form')).toHaveLength(1)
  })

  test('opening the form also opens the entry, so the manager sees what they are editing', async () => {
    const wrapper = await mountTab()

    wrapper.vm.openForm({ ...BASE[0], kind: 'platform' })
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.isOpen(BASE[0])).toBe(true)
  })

  test('the form is seeded with a COPY of the situations, so cancelling changes nothing', async () => {
    // Referencing the row's own array would let typing mutate the list being drawn, and
    // a cancelled edit would leave its changes on screen.
    const wrapper = await mountTab()

    wrapper.vm.openForm({ ...BASE[0], kind: 'platform' })
    wrapper.vm.form.scenarios.push('typed but not saved')

    expect(BASE[0].scenarios).toHaveLength(2)
  })

  test('Add opens an empty form at the FOOT of the list, where the new entry will appear', async () => {
    const wrapper = await mountTab()

    wrapper.vm.openForm(null)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.coach-form').exists()).toBe(true)
    expect(wrapper.vm.form.template).toBe('')
    // No existing row is in edit mode.
    expect(wrapper.findAll('.coach-row--editing')).toHaveLength(0)
  })
})

describe('what a save actually sends', () => {
  test('an edit to one field of an Advisor-e entry PUTs only that field', async () => {
    const calls = []
    const fetchImpl = jest.fn((path, opts) => {
      calls.push({ path, opts })
      return Promise.resolve({ ok: true, json: () => Promise.resolve(payload()) })
    })
    const wrapper = await mountTab(undefined, fetchImpl)

    const row = { ...BASE[0], kind: 'platform' }
    wrapper.vm.openForm(row)
    wrapper.vm.form.howItHelps = 'Our own take.'
    await wrapper.vm.saveEntry(row)

    const put = calls.find(c => c.opts.method === 'PUT')
    expect(put.path).toBe('/api/firm-manager/coaching/platform/cr-growth')
    expect(JSON.parse(put.opts.body)).toEqual({ howItHelps: 'Our own take.' })
  })

  test('an own entry with no template name is refused before any request', async () => {
    const fetchImpl = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(payload()) }))
    const wrapper = await mountTab(undefined, fetchImpl)
    const before = fetchImpl.mock.calls.length

    wrapper.vm.openForm(null)
    await wrapper.vm.saveEntry(null)

    expect(fetchImpl.mock.calls).toHaveLength(before)
  })

  test('switching an entry off PUTs the decline and nothing else', async () => {
    const calls = []
    const fetchImpl = jest.fn((path, opts) => {
      calls.push({ path, opts: opts || {} })
      return Promise.resolve({ ok: true, json: () => Promise.resolve(payload()) })
    })
    const wrapper = await mountTab(undefined, fetchImpl)

    await wrapper.vm.switchOff('cr-growth')

    const put = calls.find(c => c.opts.method === 'PUT')
    expect(put.path).toBe('/api/firm-manager/coaching/platform/cr-growth/decline')
    expect(JSON.parse(put.opts.body)).toEqual({ declined: true })
  })

  test('the backend refusal message is shown as it is, never reworded here', async () => {
    // A friendlier message invented in the browser could disagree with the rule the
    // backend is actually enforcing.
    const wrapper = await mountTab(undefined, jest.fn((path, opts) => {
      if (opts && opts.method === 'PUT') {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: { code: 'LAST_ENTRY', message: 'At least one entry must stay switched on' } })
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(payload()) })
    }))
    const toast = jest.fn()
    wrapper.vm.$buefy.toast.open = toast

    await wrapper.vm.switchOff('cr-growth')

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'At least one entry must stay switched on', type: 'is-danger' })
    )
  })
})

describe('the switched-off list', () => {
  test('an entry switched off leaves the live list and appears below, with a way back', async () => {
    const wrapper = await mountTab({
      state: { declinedIds: ['cr-growth'], overrides: {}, ownRows: [] },
      resolved: [{ ...BASE[1], source: 'platform' }],
      hasOverride: true
    })

    expect(wrapper.vm.rows.live.map(r => r.id)).toEqual(['cr-eoy'])
    expect(wrapper.vm.rows.switchedOff.map(r => r.id)).toEqual(['cr-growth'])
    expect(wrapper.findAll('.coach-row--off')).toHaveLength(1)
  })

  test('a switched-off entry the firm edited is badged so its version is not lost silently', async () => {
    const wrapper = await mountTab({
      state: { declinedIds: ['cr-growth'], overrides: { 'cr-growth': { howItHelps: 'ours' } }, ownRows: [] },
      resolved: [{ ...BASE[1], source: 'platform' }],
      hasOverride: true
    })

    expect(wrapper.vm.rows.switchedOff[0].hasFirmEdit).toBe(true)
    expect(wrapper.findAll('.coach-row--off').at(0).text()).toContain('firmCoaching.tagCustomised')
  })
})

describe('the badges tell a manager where each entry came from', () => {
  test('platform, customised and the firm own read differently', async () => {
    const wrapper = await mountTab({
      resolved: [
        { ...BASE[0], source: 'firm-override' },
        { id: 'fc-1', template: 'Succession Readiness Review', howItHelps: 'Ours.', scenarios: [], source: 'firm-own' }
      ],
      state: { declinedIds: [], overrides: { 'cr-growth': { howItHelps: 'x' } }, ownRows: [{ id: 'fc-1' }] },
      hasOverride: true
    })

    const rows = wrapper.findAll('.coach-row')
    expect(rows.at(0).text()).toContain('firmCoaching.tagCustomised')
    expect(rows.at(1).text()).toContain('firmCoaching.tagFirm')
    expect(rows.at(0).classes()).toContain('coach-row--customised')
    expect(rows.at(1).classes()).toContain('coach-row--own')
  })
})
