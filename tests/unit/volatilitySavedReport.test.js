/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const VolatilityReport = require('~/components/VolatilityReport.vue').default
const ClientChangedBadge = require('~/components/base/ClientChangedBadge.vue').default
const { computeVolatility, DEFAULT_INPUTS } = require('~/server/report/volatilityModel')
const saved = require('~/server/utils/savedReports')

/**
 * Volatility adopts the saved-report seam (item 4.62, Brief §5). What UAT cannot see: the
 * screen's one structural invariant — a workbook figure is on screen only with the sample
 * notice — depends on each month's SOURCE travelling with its figure. A saved row that
 * carried the figures alone, or a partial series, would break it silently. So the 24
 * months round-trip with their sources or not at all, and a loaded row cannot credit a
 * file that did not supply it.
 */
async function mountWith () {
  global.fetch = jest.fn(() => Promise.resolve({
    json: () => Promise.resolve({ success: true, data: computeVolatility({ sales: DEFAULT_INPUTS.sales, window: 12 }) })
  }))
  const wrapper = mountWithBuefy(VolatilityReport, { propsData: {}, mocks: { $route: { path: '/volatility' } } })
  for (let i = 0; i < 3; i++) {
    await wrapper.vm.$nextTick()
    await Promise.resolve()
  }
  return wrapper
}

afterEach(() => { delete global.fetch; jest.clearAllMocks() })

describe('Volatility Report — the saved-report seam', () => {
  it('reportInputs is the whole buffer, month by month with its source, and the store admits it', async () => {
    const wrapper = await mountWith()
    const row = wrapper.vm.reportInputs()
    expect(Object.keys(row)).toHaveLength(24 * 2 + 3)
    expect(row['month.23']).toBe(DEFAULT_INPUTS.sales[23])
    expect(row['source.0']).toBe('sample')
    expect(row.window).toBe(12)
    expect(row.startMonth).toBe('sep')
    expect(row.startYear).toBeNull() // no file ever dated the typed months
    expect(saved.validateInputs(row)).toEqual(row)
  })

  it('a saved row round-trips the months with their sources, the window, and the dates', async () => {
    const wrapper = await mountWith()
    const row = wrapper.vm.reportInputs()
    for (let i = 6; i < 24; i++) { row['month.' + i] = 1000 + i; row['source.' + i] = 'file' }
    row.window = 18
    row.startMonth = 'mar'
    row.startYear = 2024
    wrapper.vm.applyReportInputs(row)
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.form.window).toBe(18)
    expect(wrapper.vm.form.sales).toHaveLength(18)
    expect(wrapper.vm.form.sales[0]).toBe(1006)
    expect(wrapper.vm.sources.every(s => s === 'file')).toBe(true)
    expect(wrapper.vm.isSample).toBe(false)
    expect(wrapper.vm.startMonth).toBe('mar')
    expect(wrapper.vm.startYear).toBe(2024)
    expect(wrapper.vm.reportInputs()).toEqual(row)
  })

  it('one bad month refuses the whole series — nothing half-loads', async () => {
    const wrapper = await mountWith()
    const before = wrapper.vm.reportInputs()
    const row = wrapper.vm.reportInputs()
    row['month.3'] = 'lots'
    wrapper.vm.applyReportInputs(row)
    expect(wrapper.vm.reportInputs()).toEqual(before)
    const row2 = wrapper.vm.reportInputs()
    row2['source.9'] = 'client' // a comparison, never a stored source
    wrapper.vm.applyReportInputs(row2)
    expect(wrapper.vm.reportInputs()).toEqual(before)
    wrapper.vm.applyReportInputs('junk')
    expect(wrapper.vm.reportInputs()).toEqual(before)
  })

  it('THE INVARIANT HOLDS ON LOAD: a window the loaded sources cannot fill is not taken, and the notice follows the months', async () => {
    const wrapper = await mountWith()
    const row = wrapper.vm.reportInputs()
    // Twelve real months in the tail, twelve workbook months behind them, and a 24 window asked for.
    for (let i = 12; i < 24; i++) { row['source.' + i] = 'entered' }
    row.window = 24
    wrapper.vm.applyReportInputs(row)
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.form.window).toBe(12) // twelve entered months cannot fill twenty-four
    expect(wrapper.vm.isSample).toBe(false)
    // A window and a start month of the wrong shape are left alone.
    row.window = 13
    row.startMonth = 'xyz'
    row.startYear = 2024.5
    wrapper.vm.applyReportInputs(row)
    expect(wrapper.vm.form.window).toBe(12)
    expect(wrapper.vm.startMonth).toBe('sep')
    expect(wrapper.vm.startYear).toBeNull()
  })

  it('a loaded row clears the accounts files on screen, so nothing credits a file that did not supply the figures', async () => {
    const wrapper = await mountWith()
    wrapper.vm.files = [{ name: 'a.xlsx' }]
    wrapper.vm.fileSummaries = [{ monthsRead: 12 }]
    wrapper.vm.setAside = [{ label: 'Sep 2025', reason: 'partial', value: 0 }]
    wrapper.vm.applyReportInputs(wrapper.vm.reportInputs())
    expect(wrapper.vm.files).toEqual([])
    expect(wrapper.vm.fileSummaries).toEqual([])
    expect(wrapper.vm.setAside).toEqual([])
  })

  it('a month the client changed is badged on that month and no other', async () => {
    const wrapper = await mountWith()
    // The visible 12 months are buffer slots 12..23; the client changed slot 20.
    wrapper.vm.savedReport.clientChanges = ['month.20', 'month.2']
    await wrapper.vm.$nextTick()
    const badges = wrapper.findAllComponents(ClientChangedBadge)
    expect(badges).toHaveLength(1) // slot 2 is outside the 12-month window
    expect(wrapper.vm.bufferIndex(8)).toBe(20)
  })
})
