/**
 * @jest-environment jsdom
 */
'use strict'

// FirmMeetingObservations — the slice-3 addition only: marking a point that a recording
// cannot hear, and the optional words that hint it happened.
//
// Per the testing ruling (2026-08-24) nothing here asserts wording or CSS. What UAT cannot
// see, and these tests pin:
//
// - 🔴 `cannotHear: false` is SENT, not omitted. An override exists so a tier can switch off
//   what it inherited; a false dropped as "empty" leaves the inherited true standing while
//   this screen shows the box unticked. Both states look correct on screen — only the
//   advisor's report months later would reveal it, by asking them to confirm something the
//   model could have found;
// - the hint words are dropped when the box is unticked, so a point that CAN be heard never
//   carries stale phrases waiting to reappear;
// - editing one point does not inherit the previous point's settings, which is the classic
//   shared-draft-state fault and is invisible unless you edit two points in a row.

const FirmMeetingObservations = require('../../components/firm/FirmMeetingObservations.vue').default
const { mountWithBuefy } = require('../helpers/mountComponent')

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

const SCENARIOS = {
  scenarios: [{
    id: 'eoy_meeting',
    name: 'End of year meeting',
    points: [
      { id: 'mo-eoy-1', text: 'The meeting was framed.', source: 'inherited' },
      { id: 'mo-eoy-9', text: 'The numbers were drawn out.', source: 'inherited', cannotHear: true, hintWords: ['let me sketch this out'] }
    ]
  }],
  own: { declines: {}, overrides: {}, own: {} },
  inherited: {}
}

function mountScreen () {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      ...SCENARIOS,
      resolved: { months: 18, source: 'platform' },
      ownMonths: null,
      min: 1,
      max: 120,
      phrase: '18 months'
    })
  }))
  return mountWithBuefy(FirmMeetingObservations, {
    propsData: { apiToken: 'test-token' },
    mocks: { $buefy: { toast: { open: jest.fn() }, dialog: { confirm: jest.fn() } } }
  })
}

afterEach(() => {
  delete global.fetch
  jest.clearAllMocks()
})

describe('marking a point a recording cannot hear', () => {
  it('reads the existing setting when an author opens a point', async () => {
    const wrapper = mountScreen()
    await flush()
    wrapper.vm.startEdit(SCENARIOS.scenarios[0].points[1])
    expect(wrapper.vm.draftCannotHear).toBe(true)
    expect(wrapper.vm.draftHints).toEqual(['let me sketch this out'])
  })

  it('🔴 does not carry one point’s settings onto the next one opened', async () => {
    // Shared draft state across rows is the classic fault here, and it is invisible unless
    // somebody edits two points in a row — which nobody does in a five-minute pass.
    const wrapper = mountScreen()
    await flush()
    wrapper.vm.startEdit(SCENARIOS.scenarios[0].points[1])
    wrapper.vm.startEdit(SCENARIOS.scenarios[0].points[0])
    expect(wrapper.vm.draftCannotHear).toBe(false)
    expect(wrapper.vm.draftHints).toEqual([])
  })

  it('🔴 sends an explicit false rather than omitting the field', async () => {
    const wrapper = mountScreen()
    await flush()
    wrapper.vm.draftCannotHear = false
    const body = wrapper.vm.withHearability({ text: 'The meeting was framed.' })
    expect(body).toHaveProperty('cannotHear', false)
  })

  it('sends the phrases when the point is marked un-hearable', async () => {
    const wrapper = mountScreen()
    await flush()
    wrapper.vm.draftCannotHear = true
    wrapper.vm.draftHints = ['let me sketch this out']
    expect(wrapper.vm.withHearability({ text: 'x' }).hintWords).toEqual(['let me sketch this out'])
  })

  it('drops the phrases when the box is unticked, so none lie in wait', async () => {
    const wrapper = mountScreen()
    await flush()
    wrapper.vm.draftHints = ['let me sketch this out']
    wrapper.vm.draftCannotHear = false
    expect(wrapper.vm.withHearability({ text: 'x' }).hintWords).toEqual([])
  })

  it('clears the settings when an edit is abandoned', async () => {
    const wrapper = mountScreen()
    await flush()
    wrapper.vm.startEdit(SCENARIOS.scenarios[0].points[1])
    wrapper.vm.cancelEdit()
    expect(wrapper.vm.draftCannotHear).toBe(false)
    expect(wrapper.vm.draftHints).toEqual([])
  })

  it('carries the setting through when a point is saved', async () => {
    const wrapper = mountScreen()
    await flush()
    wrapper.vm.startEdit(SCENARIOS.scenarios[0].points[1])
    wrapper.vm.draft = 'The numbers were drawn out.'
    await wrapper.vm.saveEdit(SCENARIOS.scenarios[0].points[1])

    const call = global.fetch.mock.calls.find(c => c[1] && c[1].method === 'PUT')
    expect(JSON.parse(call[1].body).cannotHear).toBe(true)
  })
})
