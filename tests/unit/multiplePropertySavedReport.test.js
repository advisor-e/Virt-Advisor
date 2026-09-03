/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const MultiplePropertyAssessment = require('~/components/MultiplePropertyAssessment.vue').default

/**
 * Multiple Property adopts the saved-report seam (item 4.62, Brief §5). The screen is
 * three blocks and up to five property records; the saved row is flat. What UAT cannot
 * see: the flattening must round-trip a whole portfolio, a hostile row must be taken
 * only in each field's own shape, a blank must never become 0, and the firm's tax-rule
 * seed — which lands after the page opens — must not undo the rules a saved report
 * carried for this client.
 */
async function settle (wrapper) {
  for (let i = 0; i < 4; i++) { await wrapper.vm.$nextTick() }
}

function mountScreen () {
  global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({ success: true, data: null }) }))
  return mountWithBuefy(MultiplePropertyAssessment, { mocks: { $route: { path: '/multiple-property' } } })
}

afterEach(() => { delete global.fetch })

describe('MultiplePropertyAssessment — the saved-report seam', () => {
  it('reportInputs flattens the three blocks and every property, blanks as null', async () => {
    const wrapper = mountScreen()
    await settle(wrapper)
    const out = wrapper.vm.reportInputs()
    expect(out.propertyCount).toBe(5)
    expect(out['household.homeMortgage']).toBe(225000)
    expect(out['household.maxLvrPct']).toBeNull()
    expect(out['taxRules.phasingPct']).toEqual([100, 75, 50, 25, 0])
    expect(out['p1.address']).toBe('56 Big Deal Avenue, Goldentown')
    expect(out['p1.depositApplied']).toBeNull()
    expect(out['p5.purchasePrice']).toBe(wrapper.vm.properties[4].purchasePrice)
    expect(Object.keys(out).length).toBeLessThanOrEqual(200)
  })

  it('a saved portfolio round-trips whole: three properties load as three', async () => {
    const wrapper = mountScreen()
    await settle(wrapper)
    const saved = wrapper.vm.reportInputs()
    saved.propertyCount = 3
    saved['p2.rentPerWeek'] = 700
    saved['household.maxLvrPct'] = 65
    saved['taxRules.interestDeductibility'] = 'No'
    wrapper.vm.selected = 4
    wrapper.vm.applyReportInputs(saved)
    await settle(wrapper)
    expect(wrapper.vm.properties).toHaveLength(3)
    expect(wrapper.vm.selected).toBe(2)
    expect(wrapper.vm.properties[1].rentPerWeek).toBe(700)
    expect(wrapper.vm.household.maxLvrPct).toBe(65)
    expect(wrapper.vm.taxRules.interestDeductibility).toBe('No')
  })

  it('applyReportInputs takes each field only in its own shape', async () => {
    const wrapper = mountScreen()
    await settle(wrapper)
    const before = wrapper.vm.reportInputs()
    wrapper.vm.applyReportInputs({
      propertyCount: 9, //                      out of range — portfolio unchanged
      'household.residenceValue': 'big', //     wrong type — refused
      'household.homeMortgage': null, //        blank where a figure is required — refused
      'household.maxLvrPct': null, //           a blank where a blank is allowed — empty box
      'taxRules.depreciationMethod': 'zz', //   not an option — refused
      'taxRules.phasingPct': [1, 2], //         wrong length — refused
      'p1.address': 'x'.repeat(201), //         too long — refused
      'p1.depositApplied': null, //             blank allowed — empty box
      'p1.endOfInterestOnly': 'repay', //       a real option — taken
      'p1.purchasePrice': 700000, //            a figure — taken
      'p1.rentPerWeek': NaN, //                 refused
      bogus: 1
    })
    await settle(wrapper)
    expect(wrapper.vm.properties).toHaveLength(5)
    expect(wrapper.vm.household.residenceValue).toBe(before['household.residenceValue'])
    expect(wrapper.vm.household.homeMortgage).toBe(before['household.homeMortgage'])
    expect(wrapper.vm.household.maxLvrPct).toBe('')
    expect(wrapper.vm.taxRules.depreciationMethod).toBe(before['taxRules.depreciationMethod'])
    expect(wrapper.vm.taxRules.phasingPct).toEqual(before['taxRules.phasingPct'])
    expect(wrapper.vm.properties[0].address).toBe(before['p1.address'])
    expect(wrapper.vm.properties[0].depositApplied).toBe('')
    expect(wrapper.vm.properties[0].endOfInterestOnly).toBe('repay')
    expect(wrapper.vm.properties[0].purchasePrice).toBe(700000)
    expect(wrapper.vm.properties[0].rentPerWeek).toBe(before['p1.rentPerWeek'])
  })

  it('🔴 the firm seed arriving after a saved report does not overwrite its tax rules', async () => {
    const wrapper = mountScreen()
    await settle(wrapper)
    const saved = wrapper.vm.reportInputs()
    saved['taxRules.lossTreatment'] = 'offset'
    wrapper.vm.applyReportInputs(saved)
    wrapper.vm.applyTaxRuleDefaults({ lossTreatment: 'ringFenced', maxLvr: 0.8 })
    expect(wrapper.vm.taxRules.lossTreatment).toBe('offset')
    expect(wrapper.vm.household.maxLvrPct).toBe(saved['household.maxLvrPct'] === null ? '' : saved['household.maxLvrPct'])
  })
})
