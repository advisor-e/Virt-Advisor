/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const LeaseVsBuy = require('~/components/LeaseVsBuy.vue').default

/**
 * Lease vs Buy adopts the saved-report seam (item 4.62, Brief §5). What UAT cannot see:
 * a saved row is hostile data. A select must take only its own option codes, a typed
 * field only a finite number, and the repair assumptions the screen never shows must
 * be neither saved nor loadable.
 */
async function settle (wrapper) {
  for (let i = 0; i < 4; i++) { await wrapper.vm.$nextTick() }
}

function mountScreen () {
  global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
  return mountWithBuefy(LeaseVsBuy, { mocks: { $route: { path: '/lease-vs-buy' } } })
}

afterEach(() => { delete global.fetch })

describe('LeaseVsBuy — the saved-report seam', () => {
  it('reportInputs is every on-screen field and nothing the screen does not show', async () => {
    const wrapper = mountScreen()
    await settle(wrapper)
    const out = wrapper.vm.reportInputs()
    expect(out.buyRepairs).toBeUndefined()
    expect(Object.keys(out)).toHaveLength(Object.keys(wrapper.vm.form).length - 1)
    expect(out.loanType).toBe('T')
    expect(out.purchasePrice).toBe(55000)
  })

  it('applyReportInputs takes a select only from its own codes, a field only as a number', async () => {
    const wrapper = mountScreen()
    await settle(wrapper)
    const before = wrapper.vm.reportInputs()
    const repairs = wrapper.vm.form.buyRepairs.slice()
    wrapper.vm.applyReportInputs({
      loanType: 'R', //                  a real option — taken
      depreciationMethod: 'x', //        not an option — refused
      includesTyres: 1, //               wrong type — refused
      purchasePrice: 61000, //           a figure — taken
      deposit: 'nine', //                wrong type — refused
      termMonths: null, //               a blank where a figure is required — refused
      buyRepairs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // not on screen — ignored
      bogus: 1
    })
    await settle(wrapper)
    const f = wrapper.vm.form
    expect(f.loanType).toBe('R')
    expect(f.depreciationMethod).toBe(before.depreciationMethod)
    expect(f.includesTyres).toBe(before.includesTyres)
    expect(f.purchasePrice).toBe(61000)
    expect(f.deposit).toBe(before.deposit)
    expect(f.termMonths).toBe(before.termMonths)
    expect(f.buyRepairs).toEqual(repairs)
    expect(f.bogus).toBeUndefined()
  })
})
