/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const VolatilityReport = require('~/components/VolatilityReport.vue').default
const { computeVolatility, DEFAULT_INPUTS } = require('~/server/report/volatilityModel')

/**
 * The Volatility Report screen.
 *
 * Approved artefact: design/mockups/volatility-report.html (wording approved 2026-08-31).
 *
 * The shared frame, banner, stale behaviour and badge are already covered by the five report
 * guards, and the arithmetic by volatilityModel.test.js. What is tested HERE is the wiring
 * only this screen has, and only where it could be wrong without anybody seeing it:
 *
 *   1. The needle's ANGLE. A dial pointing at the wrong number is the single most visible
 *      thing on the screen and the easiest to get silently wrong — it is trigonometry, not
 *      a figure passed through. Nothing else in the suite touches it.
 *   2. The window control resizes the typed months and asks the backend for the new window.
 *      Getting this wrong would measure twelve months while the screen says twenty-four.
 *   3. An emptied input becomes zero, never NaN. One NaN blanks the average, every band and
 *      the dial at once, and the screen would simply go empty.
 *   4. A floored band is not drawn as a line on the chart, because at zero it would sit on
 *      the baseline and assert a boundary that is not real.
 *
 * Deliberately NOT tested: labels, headings, CSS classes and the presence of files — a
 * person in UAT sees all of those in five seconds (CLAUDE.md, "What a test must earn").
 * Assertions use i18n KEYS, not English (tests/helpers/mountComponent.js).
 */

/** Mount with the backend answering, and let the first result land. */
async function mountWith (data) {
  global.fetch = jest.fn(() => Promise.resolve({
    json: () => Promise.resolve({ success: true, data })
  }))
  const wrapper = mountWithBuefy(VolatilityReport, { propsData: {} })
  for (let i = 0; i < 3; i++) {
    await wrapper.vm.$nextTick()
    await Promise.resolve()
  }
  return wrapper
}

const sample = window => computeVolatility({ sales: DEFAULT_INPUTS.sales, window })

afterEach(() => { delete global.fetch; jest.clearAllMocks() })

describe('Volatility Report screen', () => {
  it('points the needle at the score, on the workbook geometry', async () => {
    const wrapper = await mountWith(sample(12))
    const { needle } = wrapper.vm

    // 0 sits at 225 degrees and 100 at -45, sweeping 270 clockwise. A score of 77.7268
    // is therefore 225 - 209.86 = 15.13 degrees, up and to the right of centre.
    const angle = Math.atan2(110 - needle.tipY, needle.tipX - 110) * 180 / Math.PI
    expect(angle).toBeCloseTo(15.13, 1)
    // …and the tip is out near the rim, not sitting on the hub.
    const r = Math.hypot(needle.tipX - 110, 110 - needle.tipY)
    expect(r).toBeCloseTo(64, 6)
  })

  it('pegs a score over 100 at the end stop rather than swinging back round', async () => {
    // A wildly volatile business can score past 100. Left unclamped the needle would wrap
    // past the bottom-right and point back into the green, reading as calm.
    const wrapper = await mountWith(sample(12))
    wrapper.setData({ data: Object.assign({}, sample(12), { score: 260 }) })
    await wrapper.vm.$nextTick()

    const { needle } = wrapper.vm
    const angle = Math.atan2(110 - needle.tipY, needle.tipX - 110) * 180 / Math.PI
    expect(angle).toBeCloseTo(-45, 1) // the 100 end stop
  })

  it('resizes the typed months and asks the backend for the new window', async () => {
    const wrapper = await mountWith(sample(12))
    expect(wrapper.vm.form.sales).toHaveLength(12)

    wrapper.vm.setWindow(24)
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.form.window).toBe(24)
    expect(wrapper.vm.form.sales).toHaveLength(24)
    // Growing keeps the months already on screen as the most recent ones.
    expect(wrapper.vm.form.sales.slice(12)).toEqual(DEFAULT_INPUTS.sales.slice(12))

    wrapper.vm.setWindow(12)
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.form.sales).toHaveLength(12)
    expect(wrapper.vm.form.sales).toEqual(DEFAULT_INPUTS.sales.slice(12))
  })

  it('sends the typed months and the window to the backend', async () => {
    const wrapper = await mountWith(sample(12))
    const req = wrapper.vm.recomputeRequest()
    expect(req.url).toBe('/api/report/volatility')
    expect(req.body.window).toBe(12)
    expect(req.body.sales).toEqual(DEFAULT_INPUTS.sales.slice(12))
  })

  it('turns an emptied box into zero, never NaN', async () => {
    const wrapper = await mountWith(sample(12))
    wrapper.vm.setMonth(0, '')
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.form.sales[0]).toBe(0)
    expect(wrapper.vm.form.sales.every(v => Number.isFinite(v))).toBe(true)
    // …and editing drops the sample notice, because the figures are now the client's.
    expect(wrapper.vm.isSample).toBe(false)
  })

  it('draws no chart line for a band the zero floor moved', async () => {
    // At 12 months the third lower band computes to -9,421.65 and is floored to 0. Drawing
    // it would put a labelled "3rd deviation" line on the baseline, asserting a boundary
    // that is not real.
    const wrapper = await mountWith(sample(12))
    const lines = wrapper.vm.chart.bandLines

    expect(lines.filter(l => l.k === 3 && l.side === 'down')).toHaveLength(0)
    expect(lines.filter(l => l.k === 3 && l.side === 'up')).toHaveLength(1)
    // The bands that were not floored keep both edges.
    expect(lines.filter(l => l.k === 1)).toHaveLength(2)
    expect(wrapper.vm.flooredBand.k).toBe(3)
  })

  it('renders nothing rather than crashing before the first result lands', () => {
    global.fetch = jest.fn(() => new Promise(() => {}))
    const wrapper = mountWithBuefy(VolatilityReport, { propsData: {} })
    expect(wrapper.vm.data).toBeNull()
    expect(wrapper.vm.chart.dots).toEqual([])
    expect(wrapper.vm.rangeText).toBe('')
    expect(wrapper.vm.outsideMonths).toEqual([])
  })

  it('survives a month series the chart cannot scale', async () => {
    // All-zero sales give a top of zero. Without a guard every y would be Infinity and the
    // SVG would silently render nothing at all.
    const wrapper = await mountWith(computeVolatility({ sales: new Array(12).fill(0), window: 12 }))
    expect(wrapper.vm.chart.dots).toEqual([])
    expect(wrapper.vm.chart.points).toBe('')
  })
})
