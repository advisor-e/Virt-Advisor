/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const WagesReport = require('../../components/WagesReport.vue').default
const { computeWages, DEFAULT_INPUTS } = require('../../server/report/wagesModel')

/**
 * WagesReport's four charts (item 5.1) — the DATA that reaches them.
 *
 * Built from `design/mockups/wages-report-visuals.html`, approved by Mike 2026-09-15.
 *
 * 🔴 WHY THESE TESTS EXIST, WHEN A CHART IS EXACTLY THE SORT OF THING A PERSON JUDGES ON
 * SIGHT. Nothing below asserts a title, a colour, a class or a shape — Mike's ruling of
 * 2026-08-24 says a person in UAT sees those instantly and an assertion only costs a
 * rewrite. What a person CANNOT see is a chart that is quietly drawing the wrong numbers,
 * and this page has four separate ways for that to happen:
 *
 *   1. SOME OF THE BASE CHARTS ERASE A LOSS. `BandBarChart` still clamps with
 *      `Math.max(value, 0)` — deliberately, its only feed being monthly sales — and
 *      `DoughnutChart` drops negatives from its total and its own legend prints
 *      `Math.max(value, 0)`. A loss handed to either renders as zero or as "0%" and looks
 *      entirely correct. So the tests check that NEGATIVES ARRIVE INTACT at the charts that
 *      can draw them, and that a figure which could be negative never reaches one that cannot.
 *      ⚠ `BarPairChart` AND `HBarChart` WERE IN THAT LIST AND NO LONGER ARE — both were given
 *      a zero line on 2026-09-15 (`barPairChart.component.test.js`, `hBarChart.component.test.js`)
 *      after the clamp was found drawing a loss-making year as break-even on Profit & Loss and
 *      an overdraft as a blank chart on Cash Flow.
 *   2. THE RING COULD BE FED THE WRONG BLOCK. `seasons` and `seasonShare` both hold three
 *      rows keyed by season and both look right on a ring. Only one is parts of a whole.
 *   3. A LOSING SEASON COULD PRINT "0%" rather than saying it contributed nothing.
 *   4. THE SCREEN COULD START DOING ITS OWN ARITHMETIC, which this model's whole design
 *      forbids — the engine owns every figure.
 */
const RESULT = computeWages(JSON.parse(JSON.stringify(DEFAULT_INPUTS)))

async function mountReport (data) {
  global.fetch = jest.fn(() => Promise.resolve({
    json: () => Promise.resolve({ success: true, data: data || RESULT })
  }))
  const wrapper = mountWithBuefy(WagesReport, { propsData: {} })
  for (let i = 0; i < 3; i++) {
    await wrapper.vm.$nextTick()
    await Promise.resolve()
  }
  return wrapper
}

afterEach(() => { delete global.fetch })

describe('the margin line — the one chart that must show a loss', () => {
  it('carries one point per month, in the engine order', async () => {
    const vm = (await mountReport()).vm
    expect(vm.marginPoints.length).toBe(RESULT.months.length)
    expect(vm.marginPoints.map(p => p.label)).toEqual(RESULT.months.map(m => m.name))
  })

  it('passes each month margin through UNCHANGED', async () => {
    const vm = (await mountReport()).vm
    vm.marginPoints.forEach((p, i) => {
      expect(p.value).toBe(RESULT.months[i].margin)
    })
  })

  it('🔴 KEEPS JULY NEGATIVE — a clamp here would draw the tightest month breaking even', async () => {
    const vm = (await mountReport()).vm
    const july = vm.marginPoints.find(p => p.label === 'Jul')
    expect(july.value).toBeLessThan(0)
    expect(july.value).toBeCloseTo(-131.83, 2)
  })
})

describe('the season mix — bills against costs', () => {
  it('reads the seasonComparison block, which is the right one for this question', async () => {
    const vm = (await mountReport()).vm
    expect(vm.seasonMixGroups.map(g => g.label)).toEqual(RESULT.seasons.map(s => s.name))
    vm.seasonMixGroups.forEach((g, i) => {
      expect(g.a).toBe(RESULT.seasons[i].revenue)
      expect(g.b).toBe(RESULT.seasons[i].cost)
    })
  })

  it('sends only figures that cannot be negative, which is why this pairing is safe', async () => {
    // Billings and costs are both always positive; the MARGIN between them is what can go
    // negative, and the margin is deliberately not on this chart — it is chart 1's subject.
    // `BarPairChart` has drawn below zero since 2026-09-15, so this is no longer load-bearing
    // against a clamp; it still pins the intent, which is that this chart compares two
    // quantities rather than reporting a result.
    const vm = (await mountReport()).vm
    vm.seasonMixGroups.forEach((g) => {
      expect(g.a).toBeGreaterThanOrEqual(0)
      expect(g.b).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('the ring — each season share of the year', () => {
  it('reads seasonShare, NOT seasons — the trap the drawing was built around', async () => {
    const vm = (await mountReport()).vm
    expect(vm.shareRows.map(r => r.margin)).toEqual(RESULT.seasonShare.map(s => s.margin))

    // The two blocks must not be interchangeable. seasons[] sums to something that is not
    // the year; if a later change made them agree, this chart's honesty would rest on luck.
    const comparisonSum = RESULT.seasons.reduce((t, s) => t + s.margin, 0)
    const shareSum = vm.shareRows.reduce((t, s) => t + s.margin, 0)
    expect(shareSum).toBeCloseTo(RESULT.totals.margin, 6)
    expect(comparisonSum).not.toBeCloseTo(RESULT.totals.margin, 2)
  })

  it('accounts for every month of the year', async () => {
    const vm = (await mountReport()).vm
    expect(vm.shareRows.reduce((t, r) => t + r.months, 0)).toBe(RESULT.months.length)
  })

  it('🔴 SAYS A LOSING SEASON CONTRIBUTED NOTHING, never "0%"', async () => {
    const vm = (await mountReport()).vm
    const wet = vm.shareRows.find(r => r.margin < 0)
    expect(wet).toBeTruthy()
    expect(wet.share).toBeNull()
    // The words themselves are the locale's and are not pinned here. What is pinned is
    // that the label is NOT a percentage — "0%" claims the season earned none when the
    // truth is that it lost money, and that is a false statement rather than a wording
    // preference.
    expect(wet.shareLabel).not.toMatch(/%/)
  })

  it('gives a profitable season its real percentage of the year', async () => {
    const vm = (await mountReport()).vm
    const dry = vm.shareRows.find(r => r.name === 'Dry n Light')
    expect(dry.share).toBeCloseTo(dry.margin / RESULT.totals.margin, 10)
    expect(dry.shareLabel).toMatch(/%/)
  })

  it('hands the ring the same rows it lists, so the slices and the legend cannot disagree', async () => {
    const vm = (await mountReport()).vm
    expect(vm.shareSlices.length).toBe(vm.shareRows.length)
    vm.shareSlices.forEach((s, i) => {
      expect(s.value).toBe(vm.shareRows[i].margin)
      expect(s.colour).toBe(vm.shareRows[i].colour)
      expect(s.label).toBe(vm.shareRows[i].name)
    })
  })
})

describe('there are THREE charts, not four', () => {
  // The drawing carried a fourth, a WaterfallChart of planned → variance → actual. Mike cut
  // it 2026-09-15: it restated the three headline figures in a different shape rather than
  // adding a fact. Pinned because a later session reading the drawing would find a chart
  // that is deliberately absent, and this says so rather than leaving it to look like a gap.
  it('does not mount a waterfall', async () => {
    const wrapper = await mountReport()
    expect(wrapper.findComponent({ name: 'WaterfallChart' }).exists()).toBe(false)
  })

  it('mounts the three that remain', async () => {
    const wrapper = await mountReport()
    expect(wrapper.findComponent({ name: 'LineChart' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'BarPairChart' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'DoughnutChart' }).exists()).toBe(true)
  })
})

describe('before the first response, and when one fails', () => {
  it('draws no chart data at all rather than zeros that look like figures', async () => {
    global.fetch = jest.fn(() => new Promise(() => {}))
    const wrapper = mountWithBuefy(WagesReport, { propsData: {} })
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.marginPoints).toEqual([])
    expect(wrapper.vm.seasonMixGroups).toEqual([])
    expect(wrapper.vm.shareRows).toEqual([])
  })

  it('survives a payload with no seasonShare block', async () => {
    // An older backend, or a route that has not been redeployed. The screen must not throw
    // — the rest of the report is still true and the stale banner is the right signal.
    const without = JSON.parse(JSON.stringify(RESULT))
    delete without.seasonShare
    const vm = (await mountReport(without)).vm
    expect(vm.shareRows).toEqual([])
    expect(vm.shareSlices).toEqual([])
    expect(vm.marginPoints.length).toBe(RESULT.months.length)
  })
})
