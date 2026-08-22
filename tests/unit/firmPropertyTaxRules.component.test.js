/**
 * @jest-environment jsdom
 */
'use strict'

// The Property Tax Rules tab as a manager actually meets it.
//
// WHY THIS FILE EXISTS. This tab had NO component test at all — it was built on
// 2026-08-18 with no artefact to check it against either, which the artefact's own §10
// records as a Save-the-Artefact failure, and Mike has still never opened it. On
// 2026-08-20 a LENDING ceiling was added to it. Adding a field to an untested,
// unreviewed screen is how the last three faults on this project reached a branch, so
// the test comes with the field.
//
// 🔴 THE ONE THING THAT MUST NOT BREAK: a blank ceiling means "no limit set". It must
// never be sent as 0, because a maximum LVR of zero refuses every loan ever written —
// and it would do it silently, on a screen where every other blank number legitimately
// means zero.

const { mountWithBuefy } = require('../helpers/mountComponent')
const FirmPropertyTaxRules = require('../../components/firm/FirmPropertyTaxRules.vue').default

/** Mount the tab with its one network call stubbed to whatever the test needs. */
async function mountTab (resolved, own) {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ resolved: resolved || {}, own: own || {} })
  }))
  const wrapper = mountWithBuefy(FirmPropertyTaxRules, {
    propsData: { apiToken: 'test-token' }
  })
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()
  return wrapper
}

const NZ = {
  yearOneAddBack: 'setup',
  managementFeeGstRate: 0.15,
  depreciableAssets: 'chattels',
  depreciationMethod: 'dv',
  depreciationRateChattels: 0.28,
  buildingDepreciationRate: 0,
  lossTreatment: 'ringFenced',
  interestDeductibility: 'Phasing',
  phasingTable: [1, 0.75, 0.5, 0.25, 0]
}

afterEach(() => { delete global.fetch })

describe('the lending ceiling on the tab', () => {
  it('is offered as a field, with its own label and its own help', async () => {
    const wrapper = await mountTab(NZ)
    const field = wrapper.vm.fields.find(f => f.key === 'maxLvrPct')
    expect(field).toBeDefined()
    expect(field.label).toBe('Maximum Loan to Value Ratio (%)')
    expect(field.help).toMatch(/Leave blank for no limit/)
    // The label reaches the screen, not just the array.
    expect(wrapper.text()).toContain('Maximum Loan to Value Ratio (%)')
  })

  it('shows blank when nobody up the chain has set one', async () => {
    const wrapper = await mountTab(NZ) //  the shipped set carries no ceiling
    expect(wrapper.vm.form.maxLvrPct).toBe('')
  })

  it('shows an inherited ceiling as a percentage, not a decimal', async () => {
    const wrapper = await mountTab(Object.assign({}, NZ, { maxLvr: 0.7 }))
    expect(wrapper.vm.form.maxLvrPct).toBe(70)
  })

  it('reads 0.655 back as 65.5, without a rounding tail', async () => {
    const wrapper = await mountTab(Object.assign({}, NZ, { maxLvr: 0.655 }))
    expect(wrapper.vm.form.maxLvrPct).toBe(65.5)
  })

  it('says whether THIS level set it or inherited it', async () => {
    const inherited = await mountTab(Object.assign({}, NZ, { maxLvr: 0.7 }), {})
    expect(inherited.vm.isOwn('maxLvrPct')).toBe(false)

    // The badge reads the BACKEND's key through `ownKey`, not the form's `maxLvrPct`.
    const setHere = await mountTab(Object.assign({}, NZ, { maxLvr: 0.65 }), { maxLvr: 0.65 })
    expect(setHere.vm.isOwn('maxLvrPct')).toBe(true)
  })
})

describe('🔴 what gets SENT — blank is not zero', () => {
  it('omits the ceiling entirely when the field is left blank', async () => {
    const wrapper = await mountTab(NZ)
    const payload = wrapper.vm.payload()
    expect(Object.prototype.hasOwnProperty.call(payload, 'maxLvr')).toBe(false)
    // Everything else is still sent whole — the manager decided all of it.
    expect(payload.managementFeeGstRate).toBeCloseTo(0.15, 9)
    expect(payload.lossTreatment).toBe('ringFenced')
  })

  it('sends a decimal when a figure IS typed', async () => {
    const wrapper = await mountTab(NZ)
    wrapper.vm.form.maxLvrPct = 70
    expect(wrapper.vm.payload().maxLvr).toBeCloseTo(0.7, 9)
  })

  it('sends ZERO only when zero was actually typed', async () => {
    // Absurd as a lending policy, but it is a decision and it is not a blank. The
    // difference between the two is the whole reason this field is handled apart.
    const wrapper = await mountTab(NZ)
    wrapper.vm.form.maxLvrPct = 0
    expect(wrapper.vm.payload().maxLvr).toBe(0)
  })

  it('omits it again when a typed figure is cleared back to blank', async () => {
    const wrapper = await mountTab(Object.assign({}, NZ, { maxLvr: 0.7 }))
    expect(wrapper.vm.payload().maxLvr).toBeCloseTo(0.7, 9)
    wrapper.vm.form.maxLvrPct = ''
    expect(Object.prototype.hasOwnProperty.call(wrapper.vm.payload(), 'maxLvr')).toBe(false)
  })

  it('omits it rather than sending rubbish when the box holds something unusable', async () => {
    const wrapper = await mountTab(NZ)
    wrapper.vm.form.maxLvrPct = 'seventy'
    expect(Object.prototype.hasOwnProperty.call(wrapper.vm.payload(), 'maxLvr')).toBe(false)
  })
})

describe('the tab still describes itself correctly', () => {
  it('says it covers lending as well as tax, now that it does', async () => {
    const wrapper = await mountTab(NZ)
    expect(wrapper.text()).toContain('treats tax and lending')
  })

  it('did not lose a single tax setting when the lending one arrived', async () => {
    const wrapper = await mountTab(NZ)
    const keys = wrapper.vm.fields.map(f => f.ownKey || f.key)
    expect(keys).toEqual(expect.arrayContaining([
      'yearOneAddBack',
      'managementFeeGstRate',
      'depreciableAssets',
      'depreciationMethod',
      'depreciationRateChattels',
      'buildingDepreciationRate',
      'lossTreatment',
      'interestDeductibility'
    ]))
    expect(wrapper.vm.payload().phasingTable).toEqual([1, 0.75, 0.5, 0.25, 0])
  })
})
