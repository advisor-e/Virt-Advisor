/**
 * @jest-environment jsdom
 */
'use strict'

// MeetingPreset — the advisor's own level, built 2026-09-08 from
// design/mockups/meeting-preset-advisor-level.html (all six questions ruled that day).
//
// Per the testing ruling (2026-08-24) nothing here asserts wording or CSS. What UAT cannot
// see, and these pin:
//
// - 🔴 NO ADVISOR ID IS EVER SENT. The backend takes identity from the verified token; a
//   client that helpfully included one would be handing every advisor in the firm a way to
//   edit a colleague's list — and, because the display name is stored beside the decision,
//   to put that colleague's name against a decision they never made. On screen this looks
//   perfect from the advisor's own seat.
// - a half-finished draft does NOT follow the advisor to another meeting type. The classic
//   shared-draft fault: invisible unless you edit, switch and save, at which point wording
//   meant for one kind of meeting is written onto a point in another.
// - the screen re-reads after every write instead of patching its own state, so what is
//   shown is what was stored — the list is resolved from four tiers plus this advisor's
//   layer, and a local guess is how a screen and a store drift apart silently.
// - a scenario arriving without `setAside` does not throw during render and take the whole
//   page down, including the points that did arrive.

const MeetingPreset = require('../../components/MeetingPreset.vue').default
const { mountWithBuefy } = require('../helpers/mountComponent')

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

const EOY = 'eoy_meeting'

const PAYLOAD = {
  maxOwnPerScenario: 20,
  scenarios: [
    {
      id: EOY,
      name: 'End of Year Meeting',
      points: [
        { id: 'mo-eoy-1', text: 'The meeting was framed.', sourceTier: 'platform', sourceLabel: 'From Advisor-e', hintWords: [] },
        { id: 'fm-2', text: "Our firm's own question.", sourceTier: 'firm', sourceLabel: 'From your firm', hintWords: [] },
        { id: 'ao-1', text: 'I asked about home.', sourceTier: 'advisor', sourceLabel: 'Added by you', hintWords: ['at home'] }
      ],
      setAside: [
        { id: 'mo-eoy-4', text: 'Named actions were agreed.', sourceTier: 'firm', sourceLabel: 'From your firm', hintWords: [] }
      ]
    },
    { id: 'client_sales', name: 'Client Sales', points: [], setAside: [] }
  ]
}

function mountScreen (payload) {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve(payload || PAYLOAD)
  }))
  return mountWithBuefy(MeetingPreset, {
    propsData: { apiToken: 'test-token' },
    mocks: { $buefy: { toast: { open: jest.fn() }, dialog: { confirm: jest.fn() } } }
  })
}

/** The parsed body of the last non-GET call. */
function lastWrite () {
  const call = global.fetch.mock.calls.filter(c => c[1] && c[1].method && c[1].method !== 'GET').pop()
  return call ? { url: call[0], method: call[1].method, body: JSON.parse(call[1].body) } : null
}

afterEach(() => {
  delete global.fetch
  jest.clearAllMocks()
})

describe('the advisor reads their own list', () => {
  it('shows the points in force and what they have set aside', async () => {
    const wrapper = mountScreen()
    await flush()
    expect(wrapper.vm.current.points).toHaveLength(3)
    expect(wrapper.vm.current.setAside).toHaveLength(1)
  })

  it('survives a scenario that arrives without setAside, rather than taking the page down', async () => {
    const wrapper = mountScreen({ scenarios: [{ id: EOY, name: 'End of Year', points: [] }] })
    await flush()
    // The template iterates it; one missing array would throw during render and lose the
    // points that did arrive.
    expect(wrapper.vm.current.setAside).toEqual([])
  })
})

describe('setting a point aside', () => {
  it('🔴 sends no advisor id — identity is the backend\'s to decide', async () => {
    const wrapper = mountScreen()
    await flush()
    await wrapper.vm.setAside({ id: 'mo-eoy-1' }, true)

    const write = lastWrite()
    expect(write.method).toBe('POST')
    expect(write.body).toEqual({ scenario: EOY, pointId: 'mo-eoy-1', declined: true })
    // Named explicitly rather than only by the toEqual above, because this is the property
    // a well-meaning later change is most likely to break.
    expect(write.body.advisorId).toBeUndefined()
  })

  it('re-reads after saving instead of guessing the new list', async () => {
    const wrapper = mountScreen()
    await flush()
    const before = global.fetch.mock.calls.length
    await wrapper.vm.setAside({ id: 'mo-eoy-1' }, true)
    // Two more calls: the write, then the read.
    expect(global.fetch.mock.calls.length).toBe(before + 2)
  })

  it('reports a refusal rather than leaving the screen looking saved', async () => {
    const wrapper = mountScreen()
    await flush()
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: { code: 'NOT_FOUND', message: 'No such point' } })
    })
    await wrapper.vm.setAside({ id: 'nope' }, true)
    expect(wrapper.vm.saveError).toContain('No such point')
  })
})

describe('a point of my own', () => {
  it('sends the text and the hint phrases split on the middle dot', async () => {
    const wrapper = mountScreen()
    await flush()
    wrapper.vm.startAdd()
    wrapper.vm.newText = 'I asked what had changed at home.'
    // ⚠ Split on the middle dot ALONE. A hint is often a spoken clause — "so, what has
    // changed at home" — and splitting on commas would cut it in two, leaving the model
    // hunting for "so" in every transcript.
    wrapper.vm.newHints = 'how are things at home · outside the business, and at home'
    await wrapper.vm.addOwn()

    expect(lastWrite().body).toEqual({
      scenario: EOY,
      text: 'I asked what had changed at home.',
      hintWords: ['how are things at home', 'outside the business, and at home']
    })
  })

  it('keeps the id when editing, and sends no advisor id', async () => {
    const wrapper = mountScreen()
    await flush()
    wrapper.vm.startEdit(PAYLOAD.scenarios[0].points[2])
    expect(wrapper.vm.editText).toBe('I asked about home.')
    expect(wrapper.vm.editHints).toBe('at home')

    wrapper.vm.editText = 'I asked about home and health.'
    await wrapper.vm.saveEdit({ id: 'ao-1' })

    const write = lastWrite()
    expect(write.method).toBe('PUT')
    expect(write.body.pointId).toBe('ao-1')
    expect(write.body.advisorId).toBeUndefined()
  })

  it('closes the form only when the save actually succeeded', async () => {
    const wrapper = mountScreen()
    await flush()
    wrapper.vm.startAdd()
    wrapper.vm.newText = 'mine'

    global.fetch.mockResolvedValueOnce({
      ok: false, json: () => Promise.resolve({ error: { message: 'nope' } })
    })
    await wrapper.vm.addOwn()
    // Losing an advisor's typing on a failed save is how somebody stops trying to use a
    // feature at all.
    expect(wrapper.vm.adding).toBe(true)
    expect(wrapper.vm.newText).toBe('mine')
  })
})

describe('changing meeting type', () => {
  it('🔴 drops a half-finished edit, so a draft cannot land on another type\'s point', async () => {
    const wrapper = mountScreen()
    await flush()
    wrapper.vm.startEdit(PAYLOAD.scenarios[0].points[2])
    wrapper.vm.editText = 'meant for the end of year meeting'

    wrapper.vm.scenarioId = 'client_sales'
    await flush()

    expect(wrapper.vm.editingId).toBe('')
    expect(wrapper.vm.editText).toBe('')
  })

  it('drops a half-finished new point too', async () => {
    const wrapper = mountScreen()
    await flush()
    wrapper.vm.startAdd()
    wrapper.vm.newText = 'meant for the end of year meeting'

    wrapper.vm.scenarioId = 'client_sales'
    await flush()

    expect(wrapper.vm.adding).toBe(false)
    expect(wrapper.vm.newText).toBe('')
  })

  it('keeps the advisor on the type they were reading when the list reloads', async () => {
    const wrapper = mountScreen()
    await flush()
    wrapper.vm.scenarioId = 'client_sales'
    await wrapper.vm.load()
    // A reload that snapped back to the first type would throw an advisor out of the meeting
    // they are about to walk into, every time they changed anything.
    expect(wrapper.vm.scenarioId).toBe('client_sales')
  })
})
