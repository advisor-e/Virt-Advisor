/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const MarginBreakevenReport = require('~/components/MarginBreakevenReport.vue').default

/**
 * Margin, Mark-up & Break-even adopts the saved-report seam (item 4.62, Brief §5). What
 * UAT cannot see: a saved row is hostile data, and a figure of the wrong type or an
 * unknown key must never reach the sliders, while a well-formed row must land whole.
 */
async function settle (wrapper) {
  for (let i = 0; i < 4; i++) { await wrapper.vm.$nextTick() }
}

function mountScreen () {
  global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
  return mountWithBuefy(MarginBreakevenReport, { mocks: { $route: { path: '/margin-breakeven' } } })
}

afterEach(() => { delete global.fetch })

describe('MarginBreakevenReport — the saved-report seam', () => {
  it('reportInputs is exactly the five slider figures', async () => {
    const wrapper = mountScreen()
    await settle(wrapper)
    expect(wrapper.vm.reportInputs()).toEqual({ price: 250, cost: 82.5, oh: 11500, draw: 8600, wif: 0 })
  })

  it('applyReportInputs takes known numeric keys only and recomputes once', async () => {
    const wrapper = mountScreen()
    await settle(wrapper)
    const calls = global.fetch.mock.calls.length
    wrapper.vm.applyReportInputs({ price: 300, cost: 'ninety', oh: NaN, draw: null, wif: 12, bogus: 1 })
    await settle(wrapper)
    expect(wrapper.vm.f).toEqual({ price: 300, cost: 82.5, oh: 11500, draw: 8600, wif: 12 })
    expect(wrapper.vm.f.bogus).toBeUndefined()
    expect(global.fetch.mock.calls.length).toBe(calls + 1)
  })
})
