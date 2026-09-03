/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const EightLeversReport = require('~/components/EightLeversReport.vue').default

/**
 * Eight Levers adopts the saved-report seam (item 4.62, Brief §5). What UAT cannot see:
 * a saved row is hostile data, and a figure of the wrong type or an unknown key must
 * never reach the levers, while a well-formed row must land whole — and it is saved in
 * screen units (whole-number percentages), never the fractions the backend receives.
 */
const DEFAULTS = {
  marketSize: 32500,
  footTrafficPct: 9,
  prospectsPct: 7,
  customersPct: 25,
  averageSpend: 215,
  averageFrequency: 3,
  marginPct: 36,
  activityCostPct: 7,
  fixedCostPct: 25,
  totalWages: 197456,
  workers: 3,
  weeksAnnualLeave: 4,
  sickAndPublicHolidayDays: 22,
  weeklyHours: 40,
  hourlyChargeOutRate: 67.5,
  productivityPct: 85
}

async function settle (wrapper) {
  for (let i = 0; i < 4; i++) { await wrapper.vm.$nextTick() }
}

function mountScreen () {
  global.fetch = jest.fn(() => Promise.reject(new Error('offline')))
  return mountWithBuefy(EightLeversReport, { mocks: { $route: { path: '/eight-levers' } } })
}

afterEach(() => { delete global.fetch })

describe('EightLeversReport — the saved-report seam', () => {
  it('reportInputs is the sixteen lever figures in screen units', async () => {
    const wrapper = mountScreen()
    await settle(wrapper)
    expect(wrapper.vm.reportInputs()).toEqual(DEFAULTS)
  })

  it('applyReportInputs takes known numeric keys only and recomputes once', async () => {
    const wrapper = mountScreen()
    await settle(wrapper)
    const calls = global.fetch.mock.calls.length
    wrapper.vm.applyReportInputs({ marginPct: 40, marketSize: 'lots', workers: NaN, weeklyHours: null, bogus: 1 })
    await settle(wrapper)
    expect(wrapper.vm.f).toEqual(Object.assign({}, DEFAULTS, { marginPct: 40 }))
    expect(wrapper.vm.f.bogus).toBeUndefined()
    expect(global.fetch.mock.calls.length).toBe(calls + 1)
  })
})
