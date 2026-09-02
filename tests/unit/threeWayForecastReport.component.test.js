/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const ThreeWayForecastReport = require('~/components/ThreeWayForecastReport.vue').default
const { computeThreeWayForecast } = require('~/server/report/threeWayForecastModel')

/**
 * Three-Way Forecast — the result screen.
 *
 * These tests guard what a person in UAT cannot see: a figure read from the wrong series,
 * an impossible stock balance rendered as an ordinary number, the boolean `error` flag
 * printed as the word "true", and a screen that hand-rolls what the shared blocks provide.
 *
 * `$t()` returns the KEY, so assertions pin WHICH message a screen shows rather than its
 * wording — the wording is Mike's and moves without these tests breaking.
 */

/** Mount with the backend answering, and let the first result land. */
async function mountWithResult (data, propsData) {
  global.fetch = jest.fn(() => Promise.resolve({
    json: () => Promise.resolve({ success: true, data })
  }))
  const wrapper = mountWithBuefy(ThreeWayForecastReport, { propsData: propsData || {} })
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()
  return wrapper
}

const SAMPLE = computeThreeWayForecast({})

describe('Three-Way Forecast screen — the headline', () => {
  test('reads the four figures from the model, not from its own arithmetic', async () => {
    const w = await mountWithResult(SAMPLE)
    const h = w.vm.headline
    const cash = SAMPLE.cashFlow.closingBalance
    expect(h.closingCash).toBe(cash[cash.length - 1])
    expect(h.afterTax).toBeCloseTo(SAMPLE.profitAndLoss.netSurplusAfterTax.reduce((a, v) => a + v, 0), 6)
    expect(h.revenue).toBeCloseTo(SAMPLE.profitAndLoss.revenue.reduce((a, v) => a + v, 0), 6)
    // The lowest point is the lowest of the twelve, not the last.
    expect(h.lowest.value).toBe(Math.min.apply(null, cash))
    w.destroy()
  })

  test('a negative cash position is toned as critical, never quietly', async () => {
    const w = await mountWithResult(SAMPLE)
    // The sample ends overdrawn; the banner figure must say so in its tone.
    expect(SAMPLE.cashFlow.closingBalance[11]).toBeLessThan(0)
    const figures = w.findAllComponents({ name: 'HeroFigure' })
    expect(figures.at(0).props('tone')).toBe('crit')
    w.destroy()
  })

  test('the gross margin is a percentage of revenue, and zero revenue does not divide by zero', async () => {
    const flat = computeThreeWayForecast({ sales: new Array(12).fill(0) })
    const w = await mountWithResult(flat)
    expect(w.vm.headline.grossMarginPct).toBe(0)
    expect(isFinite(w.vm.headline.grossMarginPct)).toBe(true)
    w.destroy()
  })
})

describe('Three-Way Forecast screen — the impossible is named', () => {
  test('🔴 a stock balance below zero is called out, not shown as a number among numbers', async () => {
    const w = await mountWithResult(SAMPLE)
    // The workbook's own sample buys less than it sells in two months.
    const negatives = SAMPLE.balanceSheet.months.inventory.filter(v => v < 0)
    expect(negatives.length).toBeGreaterThan(0)
    expect(w.vm.stockOutMonths.length).toBe(negatives.length)
    expect(w.find('.tw-impossible').exists()).toBe(true)
    w.destroy()
  })

  test('those cells carry the impossible class, not merely the negative one', async () => {
    const w = await mountWithResult(SAMPLE)
    const stockRow = w.vm.workingCapitalRows.filter(r => r.key === 'wc-stock')[0]
    const negative = stockRow.values.filter(v => v < 0)[0]
    expect(w.vm.cellClass(stockRow, negative)).toBe('impossible')
    // A merely-negative figure on another row is not dressed as impossible.
    const cashRow = { signed: true }
    expect(w.vm.cellClass(cashRow, -100)).toBe('neg')
    w.destroy()
  })

  test('a forecast that never runs out of stock says nothing about it', async () => {
    const healthy = computeThreeWayForecast({ purchases: new Array(12).fill(60000) })
    const w = await mountWithResult(healthy)
    expect(healthy.balanceSheet.months.inventory.every(v => v >= 0)).toBe(true)
    expect(w.vm.stockOutMonths).toEqual([])
    expect(w.find('.tw-impossible').exists()).toBe(false)
    w.destroy()
  })
})

describe('Three-Way Forecast screen — the three statements', () => {
  test('each tab reads its own series from the model', async () => {
    const w = await mountWithResult(SAMPLE)
    w.vm.tab = 'cash'
    expect(w.vm.visibleRows.filter(r => r.key === 'close')[0].values)
      .toEqual(SAMPLE.cashFlow.closingBalance)
    w.vm.tab = 'profit'
    expect(w.vm.visibleRows.filter(r => r.key === 'rev')[0].values)
      .toEqual(SAMPLE.profitAndLoss.revenue)
    w.vm.tab = 'balance'
    expect(w.vm.visibleRows.filter(r => r.key === 'stock')[0].values)
      .toEqual(SAMPLE.balanceSheet.months.inventory)
    w.destroy()
  })

  test('the month headings come from the model\'s own dates', async () => {
    const w = await mountWithResult(SAMPLE)
    // R9: calendar months. The sample opens in April.
    expect(w.vm.monthLabels).toEqual(['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'])
    w.destroy()
  })

  test('twelve months of figures are rendered, not a truncated set', async () => {
    const w = await mountWithResult(SAMPLE)
    w.vm.visibleRows.forEach(row => expect(row.values).toHaveLength(12))
    w.destroy()
  })
})

describe('Three-Way Forecast screen — the balance check is shown plainly', () => {
  test('an out-of-balance opening is reported rather than hidden', async () => {
    const w = await mountWithResult(SAMPLE)
    expect(SAMPLE.balanceSheet.months.balanceCheck[11]).not.toBe(0)
    expect(w.vm.balanceCheck).toBe(SAMPLE.balanceSheet.months.balanceCheck[11])
    w.destroy()
  })

  test('a position that ties says so', async () => {
    const tied = computeThreeWayForecast({
      openingBalanceSheet: { retainedEarnings: 7000 - 164000 }
    })
    const w = await mountWithResult(tied)
    expect(w.vm.balanceCheck).toBe(0)
    w.destroy()
  })
})

describe('Three-Way Forecast screen — the shared blocks do the work', () => {
  test('it composes the shared header, banner and figures rather than its own', async () => {
    const w = await mountWithResult(SAMPLE)
    expect(w.findComponent({ name: 'ReportHeader' }).exists()).toBe(true)
    expect(w.findComponent({ name: 'HeroStrip' }).exists()).toBe(true)
    expect(w.findAllComponents({ name: 'HeroFigure' })).toHaveLength(4)
    w.destroy()
  })

  test('no local money formatter — currencyMixin owns it', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'components', 'ThreeWayForecastReport.vue'), 'utf8')
    expect(/methods:[\s\S]*\bmoney\s*\(/.test(src)).toBe(false)
    expect(src).toContain('currencyMixin')
    expect(src).toContain('reportRecompute')
  })

  test('🔴 the boolean error flag is never rendered', async () => {
    // `error` from reportRecompute is a FLAG, not a message. Rendering it printed the
    // literal word "true" at advisors on Eight Levers for a day.
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'components', 'ThreeWayForecastReport.vue'), 'utf8')
    expect(/\{\{\s*error\s*\}\}/.test(src)).toBe(false)
    const w = await mountWithResult(SAMPLE)
    w.vm.error = true
    await w.vm.$nextTick()
    expect(w.text()).not.toContain('true')
    w.destroy()
  })

  test('a failed recompute raises the stale banner rather than leaving figures bright', async () => {
    const w = await mountWithResult(SAMPLE)
    w.vm.error = true
    await w.vm.$nextTick()
    expect(w.findComponent({ name: 'StaleBanner' }).exists()).toBe(true)
    expect(w.findComponent({ name: 'HeroStrip' }).props('stale')).toBe(true)
    w.destroy()
  })
})

describe('Three-Way Forecast screen — the levers', () => {
  test('a lever moves the request body, not the rendered figures directly', async () => {
    const w = await mountWithResult(SAMPLE)
    w.vm.setField('salesShift', 10)
    const body = w.vm.payload()
    // With no seed the body carries the levers; sales scale only once seeded.
    expect(body.markup).toBeCloseTo(0.68, 10)
    w.vm.setField('markup', 40)
    expect(w.vm.payload().markup).toBeCloseTo(0.4, 10)
    w.destroy()
  })

  test('a sales lever scales seeded sales and leaves the rest alone', async () => {
    const seed = { sales: new Array(12).fill(1000), overheads: { wages: 12000 } }
    const w = await mountWithResult(SAMPLE, { seed })
    w.vm.setField('salesShift', 50)
    const body = w.vm.payload()
    expect(body.sales.every(v => v === 1500)).toBe(true)
    expect(body.overheads.wages).toBe(12000)
    // The seed itself must not be mutated — a second recompute would compound it.
    expect(seed.sales.every(v => v === 1000)).toBe(true)
    w.destroy()
  })

  test('the debtor profile still totals 100% after the lever moves', async () => {
    const w = await mountWithResult(SAMPLE, { seed: { debtorCollection: [0.1, 0.55, 0.3, 0.05, 0] } })
    for (const after of [0, 25, 55, 90, 100]) {
      w.vm.setField('debtorMonthAfter', after)
      const buckets = w.vm.payload().debtorCollection
      const total = buckets.reduce((a, v) => a + v, 0)
      expect(total).toBeCloseTo(1, 9)
      expect(buckets[1]).toBeCloseTo(after / 100, 9)
      buckets.forEach(v => expect(v).toBeGreaterThanOrEqual(0))
    }
    w.destroy()
  })

  test('it posts to the calculation route', async () => {
    const w = await mountWithResult(SAMPLE)
    expect(w.vm.recomputeRequest().url).toBe('/api/report/three-way-forecast')
    w.destroy()
  })
})
