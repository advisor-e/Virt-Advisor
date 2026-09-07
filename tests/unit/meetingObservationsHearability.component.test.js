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

// ── Set aside by advisors (2026-09-08) ─────────────────────────────────────────────────
//
// 🔴 Ordered by Mike in the same breath as permitting the thing it shows: "yes but fix the
// issue - build it so the manager can see". What UAT cannot see, and these pin:
//
// - the panel is FIRM TIER ONLY. Above the firm the route answers 403 and the panel is not
//   drawn — advisors' choices live on their own firm's row, so a higher scope has none
//   beneath it and would see an empty panel that looks exactly like a broken one;
// - 🔴 A FAILED READ IS NEVER SHOWN AS "nobody has set this aside". A manager taking a fault
//   as reassurance is the one wrong answer this panel must never give;
// - a failure here does not blank the editor above it, which is what the manager came for.

describe('what advisors have set aside', () => {
  function mountAtTier (tier, setAsideResponse) {
    global.fetch = jest.fn((url) => {
      if (String(url).includes('/set-aside')) {
        return Promise.resolve(setAsideResponse || {
          ok: true,
          json: () => Promise.resolve({
            scenarios: [{
              id: 'eoy_meeting',
              name: 'End of year meeting',
              points: [
                { id: 'mo-eoy-1', text: 'The meeting was framed.', count: 2, setAsideBy: [{ advisorId: 'a1', name: 'Ruth Kelleher' }, { advisorId: 'a2', name: null }] },
                { id: 'mo-eoy-9', text: 'The numbers were drawn out.', count: 0, setAsideBy: [] }
              ]
            }]
          })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          ...SCENARIOS,
          tier,
          resolved: { months: 18, source: 'platform' },
          ownMonths: null,
          min: 1,
          max: 120,
          phrase: '18 months'
        })
      })
    })
    return mountWithBuefy(FirmMeetingObservations, {
      propsData: { apiToken: 'test-token' },
      mocks: { $buefy: { toast: { open: jest.fn() }, dialog: { confirm: jest.fn() } } }
    })
  }

  afterEach(() => { delete global.fetch })

  it('is drawn at the firm, with the count and the names', async () => {
    const wrapper = mountAtTier('firm_manager')
    await flush()
    expect(wrapper.vm.showsSetAside).toBe(true)
    const rows = wrapper.vm.setAsideForCurrent
    expect(rows).toHaveLength(2)
    expect(rows[0].count).toBe(2)
    expect(rows[0].setAsideBy[0].name).toBe('Ruth Kelleher')
    // Every point is listed, including the one nobody has touched — a panel of exceptions
    // only cannot be read as reassurance.
    expect(rows[1].count).toBe(0)
  })

  it('is not drawn above the firm, where it could only ever be empty', async () => {
    for (const tier of ['mentor', 'global_group_manager', 'group_manager']) {
      const wrapper = mountAtTier(tier)
      await flush()
      expect(wrapper.vm.showsSetAside).toBe(false)
      // And it does not even ask: the route answers 403 there.
      expect(global.fetch.mock.calls.some(c => String(c[0]).includes('/set-aside'))).toBe(false)
    }
  })

  it('🔴 reports a failed read instead of showing it as nobody having set anything aside', async () => {
    const wrapper = mountAtTier('firm_manager', {
      ok: false,
      json: () => Promise.resolve({ error: { code: 'DB_ERROR', message: 'store down' } })
    })
    await flush()
    expect(wrapper.vm.setAsideError).toContain('store down')
    expect(wrapper.vm.setAsideForCurrent).toEqual([])
    // 🔴 And the editor above it still works: this panel failing must not blank the part of
    // the tab the manager actually came for.
    expect(wrapper.vm.loadError).toBe('')
    expect(wrapper.vm.scenarios.length).toBeGreaterThan(0)
  })
})
