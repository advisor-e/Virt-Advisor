/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const BusinessPerformanceReport = require('~/components/BusinessPerformanceReport.vue').default

/**
 * Working Capital Cycle adopts the saved-report seam (item 4.62, Brief §5). What UAT
 * cannot see: a saved row is hostile data, and a figure of the wrong type or an unknown
 * key must never reach the sliders, while a well-formed row must land whole.
 */
const DEFAULTS = {
  initialInvestment: 200,
  plantEquipmentPct: 0.4,
  unitCost: 1,
  markupPct: 1.5,
  discountPct: 0.15,
  fullPricePct: 1,
  daysDeliverable: 4,
  daysOnHand: 6,
  daysReceivable: 35,
  daysPayable: 15,
  fixedCostsMonthly: 180,
  priorScenarioAnnualRevenue: 2543
}

async function settle (wrapper) {
  for (let i = 0; i < 4; i++) { await wrapper.vm.$nextTick() }
}

function mountScreen () {
  global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
  return mountWithBuefy(BusinessPerformanceReport, { mocks: { $route: { path: '/business-performance-report' } } })
}

afterEach(() => { delete global.fetch })

describe('BusinessPerformanceReport — the saved-report seam', () => {
  it('reportInputs is exactly the twelve slider figures', async () => {
    const wrapper = mountScreen()
    await settle(wrapper)
    expect(wrapper.vm.reportInputs()).toEqual(DEFAULTS)
  })

  it('applyReportInputs takes known numeric keys only and recomputes once', async () => {
    const wrapper = mountScreen()
    await settle(wrapper)
    const calls = global.fetch.mock.calls.length
    wrapper.vm.applyReportInputs({ daysReceivable: 50, unitCost: 'two', markupPct: NaN, daysPayable: null, bogus: 1 })
    await settle(wrapper)
    expect(wrapper.vm.inputs).toEqual(Object.assign({}, DEFAULTS, { daysReceivable: 50 }))
    expect(wrapper.vm.inputs.bogus).toBeUndefined()
    expect(global.fetch.mock.calls.length).toBe(calls + 1)
  })
})
