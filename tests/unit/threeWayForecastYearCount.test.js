/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const ThreeWayForecastIntake = require('~/components/ThreeWayForecastIntake.vue').default
const ThreeWayForecastReport = require('~/components/ThreeWayForecastReport.vue').default
const {
  computeThreeYearForecast,
  computeThreeWayForecast,
  MAX_FORECAST_YEARS
} = require('~/server/report/threeWayForecastModel')

/**
 * How long a forecast — item 4.71 slice 2.
 *
 * Mike's ruling of 2026-09-07, which replaced the recommendation put to him ("three years,
 * always"): *"good point - you should be able to choose 1, 2 or 3 year forecast please"*.
 * Built from `design/mockups/three-way-forecast-three-years.html`, approved the same day
 * with all six questions ruled.
 *
 * 🔴 WHAT THESE TESTS ARE FOR, AND IT IS ONE THING. The obvious way to build this was to
 * compute three years and show fewer. Every screen would have looked right: the statements
 * would show the years asked for, the tabs would be correct, the print would be the right
 * length. And the four figures at the top — the ones a lender reads first — would have
 * carried a three-year revenue and a low point in a year nobody asked about, because the
 * summary totals whatever the engine built. A person in UAT sees a plausible number and
 * moves on. That is the whole class of error here, and it is why the year count has to
 * reach the engine rather than stop at the screen.
 *
 * Nothing here asserts wording or a CSS class: `$t()` returns the key, and the wording is
 * Mike's to change without breaking a test.
 */

/* ────────────────────────────────────────────────────── the engine ── */

describe('the engine builds only the years it was asked for', () => {
  test.each([[1, 1], [2, 2], [3, 3]])('yearCount %i builds %i year(s)', (asked, built) => {
    expect(computeThreeYearForecast({ yearCount: asked }).years).toHaveLength(built)
  })

  test('every year it builds ties in every month', () => {
    for (const yearCount of [1, 2, 3]) {
      computeThreeYearForecast({ yearCount }).years.forEach((y) => {
        y.balanceSheet.months.balanceCheck.forEach((v) => {
          // The sample opening balance sheet is itself out by 164,000 and the engine
          // reports that faithfully; what matters is that it does not MOVE, which is what
          // a broken hand-over between years would look like.
          expect(v).toBe(164000)
        })
      })
    }
  })

  /**
   * 🔴 THE ONE THAT MATTERS. Computing three and displaying one would leave every one of
   * these reading the three-year figure.
   */
  test('the summary totals ONLY the years asked for', () => {
    const one = computeThreeYearForecast({ yearCount: 1 }).summary
    const two = computeThreeYearForecast({ yearCount: 2 }).summary
    const three = computeThreeYearForecast({ yearCount: 3 }).summary

    expect(Math.round(one.revenue)).toBe(890000)
    expect(Math.round(two.revenue)).toBe(1780000)
    expect(Math.round(three.revenue)).toBe(2670000)
    expect(two.revenue).toBeCloseTo(one.revenue * 2, 6)
  })

  test('the closing position is the end of the LAST year asked for, not of year three', () => {
    const one = computeThreeYearForecast({ yearCount: 1 })
    const three = computeThreeYearForecast({ yearCount: 3 })
    const lastMonthOfYearOne = one.years[0].cashFlow.closingBalance[11]

    expect(one.summary.closingCash).toBe(lastMonthOfYearOne)
    expect(three.summary.closingCash).toBe(three.years[2].cashFlow.closingBalance[11])
    expect(one.summary.closingCash).not.toBe(three.summary.closingCash)
  })

  test('the lowest cash point is found across the whole forecast and no further', () => {
    const one = computeThreeYearForecast({ yearCount: 1 }).summary.lowestCash
    const three = computeThreeYearForecast({ yearCount: 3 }).summary.lowestCash

    expect(one.year).toBe(1)
    // On the sample the bank keeps sinking, so the worst month of three years is in the
    // third — a one-year forecast must not report it.
    expect(three.year).toBe(3)
    expect(one.value).toBeGreaterThan(three.value)
  })

  test('a one-year forecast is the same arithmetic as year 1 of a three-year one', () => {
    // Otherwise choosing a shorter forecast would quietly change the figures in it.
    const one = computeThreeYearForecast({ yearCount: 1 })
    const three = computeThreeYearForecast({ yearCount: 3 })
    expect(one.years[0]).toEqual(three.years[0])
  })

  describe('the count arrives in a request body, so it is clamped rather than trusted', () => {
    test.each([
      ['absent', undefined],
      ['zero', 0],
      ['four', 4],
      ['negative', -1],
      ['a word', 'two'],
      ['null', null],
      ['NaN', NaN]
    ])('%s falls back to the full three years', (_label, value) => {
      expect(computeThreeYearForecast({ yearCount: value }).years).toHaveLength(3)
    })

    test('a fraction takes the whole years it covers, never more', () => {
      expect(computeThreeYearForecast({ yearCount: 2.7 }).years).toHaveLength(2)
    })
  })

  test('every caller written before the choice existed still gets three years', () => {
    // The golden tests and both routes call it with no count at all.
    expect(computeThreeYearForecast({}).years).toHaveLength(3)
    expect(computeThreeYearForecast({ years: [{}, {}, {}] }).years).toHaveLength(3)
  })
})

/* ─────────────────────────────────────────────── the intake screen ── */

describe('step 3 — how long a forecast', () => {
  test('the screen offers exactly the years the engine can build', () => {
    const w = mountWithBuefy(ThreeWayForecastIntake, { propsData: {} })
    // The component holds its own copy of the constant to keep the engine out of the
    // client bundle. This is the pin that stops the two drifting apart.
    expect(w.vm.maxForecastYears).toBe(MAX_FORECAST_YEARS)
    w.destroy()
  })

  test('it starts at one year, so nothing changes under an advisor who never touches it', () => {
    const w = mountWithBuefy(ThreeWayForecastIntake, { propsData: {} })
    expect(w.vm.form.yearCount).toBe(1)
    expect(w.vm.buildInputs().yearCount).toBe(1)
    expect(w.vm.buildInputs().laterYears).toEqual([])
    w.destroy()
  })

  test('the count reaches the payload', () => {
    const w = mountWithBuefy(ThreeWayForecastIntake, { propsData: {} })
    w.vm.setYearCount(3)
    expect(w.vm.buildInputs().yearCount).toBe(3)
    expect(w.vm.buildInputs().laterYears).toHaveLength(2)
    w.destroy()
  })

  test('an out-of-range count is refused rather than rounded into something plausible', () => {
    const w = mountWithBuefy(ThreeWayForecastIntake, { propsData: {} })
    w.vm.setYearCount(2)
    ;[0, 4, -1, 2.5, 'three', null].forEach((bad) => {
      w.vm.setYearCount(bad)
      expect(w.vm.form.yearCount).toBe(2)
    })
    w.destroy()
  })

  /**
   * 🔴 SHORTENING A FORECAST MUST NOT EAT TYPING. Nobody reports this as a bug — they
   * retype the figures and trust the screen a little less.
   */
  test('dropping to one year and back again keeps the percentages that were typed', () => {
    const w = mountWithBuefy(ThreeWayForecastIntake, { propsData: {} })
    w.vm.setYearCount(3)
    w.vm.form.quickFire.years[2].salesGrowth = 7
    w.vm.setYearCount(1)
    expect(w.vm.quickFireVisibleYears).toHaveLength(1)
    w.vm.setYearCount(3)
    expect(w.vm.form.quickFire.years[2].salesGrowth).toBe(7)
    w.destroy()
  })

  test('the grid shows one column per year of the forecast', () => {
    const w = mountWithBuefy(ThreeWayForecastIntake, { propsData: {} })
    for (const n of [1, 2, 3]) {
      w.vm.setYearCount(n)
      expect(w.vm.quickFireVisibleYears).toHaveLength(n)
    }
    w.destroy()
  })

  /**
   * With nothing typed for years 2 and 3 they are sent EMPTY, which the engine reads as
   * "the same again". Sending year 1's sixty figures instead would look identical on
   * screen and freeze the later years' tax rate, debtor profile and depreciation at year
   * 1's values.
   */
  test('a later year nobody described is sent empty, not filled in with year 1', () => {
    const w = mountWithBuefy(ThreeWayForecastIntake, { propsData: {} })
    w.vm.setYearCount(3)
    expect(w.vm.buildInputs().laterYears).toEqual([{}, {}])
    w.destroy()
  })
})

/* ─────────────────────────────────────────────── the report screen ── */

/** One year in the shape the three-years route returns. */
function asForecast (d) {
  const total = s => s.reduce((a, v) => a + v, 0)
  const cash = d.cashFlow.closingBalance
  return {
    years: [d],
    summary: {
      revenue: total(d.profitAndLoss.revenue),
      grossSurplus: total(d.profitAndLoss.grossSurplus),
      netSurplusAfterTax: total(d.profitAndLoss.netSurplusAfterTax),
      closingCash: cash[11],
      lowestCash: { value: Math.min.apply(null, cash), year: 1, month: 1, date: d.months.isoDates[0] }
    }
  }
}

/** Mount the report with the backend answering, and let the first result land. */
async function mountReport (result, propsData) {
  global.fetch = jest.fn(() => Promise.resolve({
    json: () => Promise.resolve({ success: true, data: result })
  }))
  const w = mountWithBuefy(ThreeWayForecastReport, { propsData: propsData || {} })
  await w.vm.$nextTick()
  await w.vm.$nextTick()
  return w
}

describe('step 4 — the forecast across its years', () => {
  const THREE = computeThreeYearForecast({ yearCount: 3 })

  test('it asks the backend for the years the advisor chose', async () => {
    const seed = { sales: new Array(12).fill(1000), yearCount: 3, laterYears: [{}, {}] }
    const w = await mountReport(THREE, { seed })
    const body = w.vm.payload()
    expect(body.yearCount).toBe(3)
    expect(body.years).toHaveLength(3)
    // The two carrier fields are lifted off, so year 1 is the shape the engine takes.
    expect(body.years[0].yearCount).toBeUndefined()
    expect(body.years[0].laterYears).toBeUndefined()
    w.destroy()
  })

  test('a missing later year stays missing — the request never invents one', async () => {
    const seed = { sales: new Array(12).fill(1000), yearCount: 3, laterYears: [{}, {}] }
    const w = await mountReport(THREE, { seed })
    expect(w.vm.payload().years[1]).toEqual({})
    expect(w.vm.payload().years[2]).toEqual({})
    w.destroy()
  })

  /**
   * 🔴 THE LEVER RULE, AND WHY IT IS NOT UNIFORM. Sales and overheads are shifts, so they
   * scale every year. Mark-up is one absolute figure: written into every year it would
   * flatten years 2 and 3 to year 1's margin — silently undoing the per-year percentages
   * step 3 exists to collect, with no sign of it on screen.
   */
  test('a relative lever reaches every year; an absolute one only year 1', async () => {
    const seed = {
      sales: new Array(12).fill(1000),
      overheads: { wages: 12000 },
      markup: 0.5,
      yearCount: 3,
      laterYears: [
        { sales: new Array(12).fill(2000), markup: 0.6, overheads: { wages: 20000 } },
        { sales: new Array(12).fill(3000), markup: 0.7, overheads: { wages: 30000 } }
      ]
    }
    const w = await mountReport(THREE, { seed })
    w.vm.setField('salesShift', 50)
    w.vm.setField('overheadShift', -10)
    w.vm.setField('markup', 40)
    const years = w.vm.payload().years

    expect(years[0].sales.every(v => v === 1500)).toBe(true)
    expect(years[1].sales.every(v => v === 3000)).toBe(true)
    expect(years[2].sales.every(v => v === 4500)).toBe(true)
    expect(years[0].overheads.wages).toBeCloseTo(10800, 6)
    expect(years[1].overheads.wages).toBeCloseTo(18000, 6)
    expect(years[2].overheads.wages).toBeCloseTo(27000, 6)

    expect(years[0].markup).toBeCloseTo(0.4, 10)
    expect(years[1].markup).toBeCloseTo(0.6, 10)
    expect(years[2].markup).toBeCloseTo(0.7, 10)
    w.destroy()
  })

  test('the seed is never mutated, so a second recompute cannot compound a lever', async () => {
    const seed = {
      sales: new Array(12).fill(1000),
      yearCount: 2,
      laterYears: [{ sales: new Array(12).fill(2000), overheads: { wages: 20000 } }]
    }
    const w = await mountReport(THREE, { seed })
    w.vm.setField('salesShift', 50)
    w.vm.payload()
    w.vm.payload()
    expect(seed.laterYears[0].sales.every(v => v === 2000)).toBe(true)
    w.destroy()
  })

  test('the headline reads the whole forecast, not year 1', async () => {
    const w = await mountReport(THREE)
    expect(w.vm.yearCount).toBe(3)
    expect(w.vm.headline.revenue).toBe(THREE.summary.revenue)
    expect(w.vm.headline.closingCash).toBe(THREE.summary.closingCash)
    // The one that earns the change: the worst month of all thirty-six.
    expect(w.vm.headline.lowest.value).toBe(THREE.summary.lowestCash.value)
    expect(w.vm.headline.lowest.year).toBe(THREE.summary.lowestCash.year)
    expect(w.vm.headline.lowest.value).not.toBe(
      Math.min.apply(null, THREE.years[0].cashFlow.closingBalance))
    w.destroy()
  })

  test('a one-year forecast reads exactly as it always has', async () => {
    const one = asForecast(computeThreeWayForecast({}))
    const w = await mountReport(one)
    expect(w.vm.isMultiYear).toBe(false)
    expect(w.vm.headline.revenue).toBe(one.summary.revenue)
    expect(w.vm.summaryRows.map(r => r.values.length)).toEqual(new Array(12).fill(1))
    w.destroy()
  })

  test('switching year re-points the statements without asking the backend again', async () => {
    const w = await mountReport(THREE)
    const calls = global.fetch.mock.calls.length
    w.vm.selectYear(2)
    await w.vm.$nextTick()
    expect(w.vm.data).toBe(THREE.years[2])
    expect(global.fetch.mock.calls.length).toBe(calls)
    w.destroy()
  })

  test('a shorter forecast cannot leave the statements pointed past the end of it', async () => {
    const w = await mountReport(THREE)
    w.vm.selectYear(2)
    w.vm.applyResult(computeThreeYearForecast({ yearCount: 1 }))
    expect(w.vm.yearIndex).toBe(0)
    expect(w.vm.data).not.toBeNull()
    w.destroy()
  })

  /**
   * 🔴 THE PRINT IS WHAT REACHES A LENDER. Mike's ruling of 2026-09-07 extends his own
   * 2026-09-06 one: a lender given one statement of three cannot check that they tie, and
   * a lender given one year of three cannot check the year being lent against. Nobody sees
   * a regression here without generating a PDF and counting.
   */
  test('the printed pack carries three statements for every year', async () => {
    const w = await mountReport(THREE)
    expect(w.vm.printStatements).toHaveLength(9)
    expect(w.vm.printStatements.map(s => s.key)).toEqual([
      'cash-0', 'profit-0', 'balance-0',
      'cash-1', 'profit-1', 'balance-1',
      'cash-2', 'profit-2', 'balance-2'
    ])
    w.destroy()
  })

  test('each printed statement carries its OWN year’s figures', async () => {
    const w = await mountReport(THREE)
    const cashOf = key => w.vm.printStatements.find(s => s.key === key)
      .rows.find(r => r.key === 'close').values
    expect(cashOf('cash-0')).toBe(THREE.years[0].cashFlow.closingBalance)
    expect(cashOf('cash-1')).toBe(THREE.years[1].cashFlow.closingBalance)
    expect(cashOf('cash-2')).toBe(THREE.years[2].cashFlow.closingBalance)
    w.destroy()
  })

  test('a one-year forecast still prints the four pages it printed before', async () => {
    const w = await mountReport(asForecast(computeThreeWayForecast({})))
    expect(w.vm.printStatements).toHaveLength(3)
    w.destroy()
  })

  test('the print does not follow the tab on screen', async () => {
    const w = await mountReport(THREE)
    w.vm.tab = 'balance'
    await w.vm.$nextTick()
    expect(w.vm.printStatements).toHaveLength(9)
    w.destroy()
  })

  /**
   * A total that adds three closing bank balances together is a number no accountant
   * would recognise, and it would look entirely ordinary in the column.
   */
  test('the summary totals flows and repeats positions', async () => {
    const w = await mountReport(THREE)
    const by = {}
    w.vm.summaryRows.forEach((r) => { by[r.key] = r })

    expect(by.revenue.total).toBeCloseTo(by.revenue.values.reduce((a, v) => a + v, 0), 6)
    expect(by.revenue.total).toBeCloseTo(THREE.summary.revenue, 6)
    expect(by.closingCash.isPosition).toBe(true)
    expect(by.closingCash.total).toBe(by.closingCash.values[2])
    expect(by.netAssets.total).toBe(by.netAssets.values[2])
    w.destroy()
  })

  /**
   * The summary column has to agree with the statement behind it — the two sit on one
   * screen, and a reader comparing them is the whole point of showing both.
   */
  test('each summary row agrees with the year’s own statement', async () => {
    const w = await mountReport(THREE)
    const total = s => s.reduce((a, v) => a + v, 0)
    const by = {}
    w.vm.summaryRows.forEach((r) => { by[r.key] = r })

    THREE.years.forEach((y, i) => {
      expect(by.revenue.values[i]).toBeCloseTo(total(y.profitAndLoss.revenue), 6)
      expect(by.netAfterTax.values[i]).toBeCloseTo(total(y.profitAndLoss.netSurplusAfterTax), 6)
      expect(by.closingCash.values[i]).toBe(y.cashFlow.closingBalance[11])
      // Gross profit less overheads, interest and depreciation must land on the operating
      // surplus shown — the three deductions are drawn out of one engine total, and
      // double-counting any of them would still add up down the column.
      expect(by.operatingSurplus.values[i]).toBeCloseTo(
        by.grossSurplus.values[i] - by.overheads.values[i] -
        by.interest.values[i] - by.depreciation.values[i], 6)
      expect(by.netBeforeTax.values[i]).toBeCloseTo(
        by.operatingSurplus.values[i] + by.otherIncome.values[i], 6)
    })
    w.destroy()
  })

  test('a year nobody described is marked as inherited; one that was is not', async () => {
    const seed = {
      yearCount: 3,
      laterYears: [{ sales: new Array(12).fill(2000) }, {}]
    }
    const w = await mountReport(THREE, { seed })
    expect(w.vm.inheritedYears).toEqual([false, false, true])
    w.destroy()
  })
})
