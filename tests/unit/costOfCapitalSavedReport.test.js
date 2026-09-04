/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const CostOfCapital = require('~/components/CostOfCapital.vue').default

/**
 * Cost of Capital adopts the saved-report seam (item 4.62, Brief §5). What UAT cannot
 * see: a saved row is hostile data. A wrong type, an unknown key, a series of the wrong
 * length, or a blank where the form holds a figure must never reach the inputs — while
 * a blank hurdle figure and a blank month must round-trip as blanks, never become 0.
 */
async function settle (wrapper) {
  for (let i = 0; i < 4; i++) { await wrapper.vm.$nextTick() }
}

function mountScreen () {
  global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
  return mountWithBuefy(CostOfCapital, { mocks: { $route: { path: '/cost-of-capital' } } })
}

afterEach(() => { delete global.fetch })

describe('CostOfCapital — the saved-report seam', () => {
  it('reportInputs is the form in display units, blanks kept as null, series copied', async () => {
    const wrapper = mountScreen()
    await settle(wrapper)
    const out = wrapper.vm.reportInputs()
    expect(out.riskFreeRatePct).toBe(3.9)
    expect(out.investmentCost).toBeNull()
    expect(out.equityValues[11]).toBeNull()
    expect(out.equityValues).toHaveLength(12)
    expect(out.indexValues).not.toBe(wrapper.vm.form.indexValues)
  })

  it('applyReportInputs takes each key only in its own shape', async () => {
    const wrapper = mountScreen()
    await settle(wrapper)
    const before = wrapper.vm.reportInputs()
    const twelve = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, null]
    wrapper.vm.applyReportInputs({
      beta: 0.9, //                     a figure — taken
      taxRatePct: null, //              a blank where the form holds a figure — refused
      equity: 'lots', //                wrong type — refused
      investmentCost: 120000, //        a hurdle figure typed — taken
      annualReturn: null, //            a hurdle figure blank — taken as blank
      indexValues: twelve, //           a series with a blank month — taken
      sharesIssued: [1, 2, 3], //       wrong length — refused
      equityValues: [1, 'x', 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], // bad element — refused
      bogus: 1 //                       unknown — ignored
    })
    await settle(wrapper)
    const f = wrapper.vm.form
    expect(f.beta).toBe(0.9)
    expect(f.taxRatePct).toBe(before.taxRatePct)
    expect(f.equity).toBe(before.equity)
    expect(f.investmentCost).toBe(120000)
    expect(f.annualReturn).toBeNull()
    expect(f.indexValues).toEqual(twelve)
    expect(f.sharesIssued).toEqual(before.sharesIssued)
    expect(f.equityValues).toEqual(before.equityValues)
    expect(f.bogus).toBeUndefined()
  })
})
