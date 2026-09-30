/**
 * @jest-environment jsdom
 */
'use strict'

/**
 * The printed forecast as a board paper (item 44.4; drawing, rulings and wording approved by
 * Mike 2026-09-30, design/mockups/three-way-forecast-board-pack.html).
 *
 * What this guards is what a person reading the print cannot check at a glance: that the
 * summary page's figures are the statements' own, that a tile's words follow the figures,
 * that the Year column never adds up a balance, and that the contents never lists a section
 * the pack does not hold.
 */

const { mountWithBuefy, englishMocks } = require('../helpers/mountComponent')
const { computeThreeYearForecast } = require('../../server/report/threeWayForecastModel')
const Glance = require('~/components/ThreeWayForecastGlance.vue').default
const Cover = require('~/components/ThreeWayForecastCover.vue').default
const Report = require('~/components/ThreeWayForecastReport.vue').default

const sum = a => a.reduce((x, v) => x + v, 0)

function glance (result, props) {
  return mountWithBuefy(Glance, {
    propsData: Object.assign({ result, currency: 'NZD' }, props),
    mocks: englishMocks()
  })
}

/** A one-year result with only what the page reads, for the variants the sample never hits. */
function fakeYear (pbtMonths, bank, opening) {
  const isoDates = Array.from({ length: 12 }, (_, i) => `2025-${String(i + 1).padStart(2, '0')}-01`)
  const zero = Array(12).fill(0)
  return {
    years: [{
      months: { isoDates },
      profitAndLoss: { revenue: Array(12).fill(1000), grossSurplus: Array(12).fill(400), netSurplusBeforeTax: pbtMonths },
      cashFlow: { openingBalance: [opening], closingBalance: bank, byActivity: { operating: zero, investing: zero, financing: zero } },
      balanceSheet: { months: { workingCapital: Array(12).fill(5000) } }
    }]
  }
}

describe('the forecast at a glance is the statements\' own figures', () => {
  const result = computeThreeYearForecast({ yearCount: 1 })
  const y = result.years[0]

  it('the sample: every tile, and the cash that went, match the model', () => {
    const w = glance(result)
    const g = w.vm.g
    expect(g.revenue).toBe(sum(y.profitAndLoss.revenue))
    expect(g.pbt).toBe(sum(y.profitAndLoss.netSurplusBeforeTax))
    expect(g.closing).toBe(y.cashFlow.closingBalance[11])
    // The three activities add to the year's movement in the bank.
    expect(Math.round(g.movement)).toBe(Math.round(g.closing - g.opening))
    const text = w.text()
    expect(text).toContain('($400,760)')
    expect(text).toContain('a loss in every month')
    expect(text).toContain('overdrawn; lowest in Mar 2025')
    expect(text).toContain('the business · 12 months to 31 March 2025 · NZD')
  })

  it('three years: the page covers the whole forecast', () => {
    const three = computeThreeYearForecast({ yearCount: 3 })
    const w = glance(three, { yearCount: 3 })
    expect(w.vm.g.revenue).toBe(sum(three.years.map(yr => sum(yr.profitAndLoss.revenue))))
    expect(w.vm.g.months.length).toBe(36)
    expect(w.text()).toContain('Sales over 3 years')
  })

  it('a tile\'s words follow the figures', () => {
    const up = Array(12).fill(100)
    const mixed = up.slice(0, 9).concat([-50, -50, -50])
    expect(glance(fakeYear(up, Array(12).fill(10000), 5000)).text()).toContain('a surplus in every month')
    expect(glance(fakeYear(mixed, Array(12).fill(10000), 5000)).text()).toContain('a loss in 3 of 12 months')
    // In funds throughout, and in funds at the end having been overdrawn on the way.
    expect(glance(fakeYear(up, [9000].concat(Array(11).fill(12000)), 5000)).text())
      .toContain('in funds throughout; lowest $9,000 in Jan 2025')
    const dipped = glance(fakeYear(up, [-2000].concat(Array(11).fill(12000)), 5000))
    expect(dipped.text()).toContain('in funds; overdrawn at its lowest, ($2,000) in Jan 2025')
    expect(dipped.find('.twg-tile.caution').exists()).toBe(true)
  })
})

describe('the printed statements\' Year column', () => {
  const yearOf = Report.methods.yearOf
  it('adds the months, except cash at month end, which is where the year closes', () => {
    expect(yearOf({ key: 'rev', values: [1, 2, 3] })).toBe(6)
    expect(yearOf({ key: 'close', values: [-100, -200, -300] })).toBe(-300)
  })
})

describe('the printed profit and loss shows deductions in brackets', () => {
  const p = computeThreeYearForecast({ yearCount: 1 }).years[0].profitAndLoss
  const rows = [
    { key: 'open-stock', values: p.openingInventory },
    { key: 'purch', values: p.purchases },
    { key: 'frt', values: p.freight },
    { key: 'comm', values: p.commissions },
    { key: 'dir2', values: p.otherDirectTwo },
    { key: 'dirx', values: p.otherDirectExpensesExempt },
    { key: 'close-stock', values: p.closingInventory },
    { key: 'cos', values: p.costOfSales, signed: true },
    { key: 'rev', values: p.revenue }
  ]
  const out = Report.methods.asDeductions(rows)
  const byKey = k => out.find(r => r.key === k)

  it('the lines of cost of sales still add down to it, month by month', () => {
    const parts = ['open-stock', 'purch', 'frt', 'comm', 'dir2', 'dirx', 'close-stock']
    for (let m = 0; m < 12; m++) {
      const added = parts.reduce((a, k) => a + byKey(k).values[m], 0)
      expect(added).toBeCloseTo(byKey('cos').values[m], 6)
    }
    expect(byKey('cos').values[0]).toBeLessThan(0)
  })

  it('revenue and closing stock keep their sign; a cost loses the red of a bad result', () => {
    expect(byKey('rev').values).toEqual(p.revenue)
    expect(byKey('close-stock').values).toEqual(p.closingInventory)
    expect(byKey('cos').signed).toBe(false)
  })
})

describe('the cover and contents', () => {
  function cover (props) {
    return mountWithBuefy(Cover, { propsData: Object.assign({ startIso: '2024-04-01' }, props), mocks: englishMocks() }).text()
  }

  it('states the period, one year or several', () => {
    expect(cover({})).toContain('Forecast for the 12 months from 1 April 2024 to 31 March 2025')
    expect(cover({ yearCount: 3 })).toContain('Forecast for the 3 years from 1 April 2024 to 31 March 2027')
  })

  it('names the firm only when the Notes do, and lists the economic analysis only when it prints', () => {
    const bare = cover({})
    expect(bare).not.toContain('Prepared by')
    expect(bare).not.toContain('Economic analysis')
    const full = cover({ preparedBy: 'Smith & Co', clientName: 'Acme Ltd', economicInPack: true })
    expect(full).toContain('Prepared by Smith & Co')
    expect(full).toContain('Prepared for the directors of Acme Ltd')
    expect(full).toContain('Economic analysis')
  })
})
