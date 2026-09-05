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

/** The drawing's worked example: a container landing in September, one in January. */
const IMPORTING = computeThreeWayForecast({
  overseas: {
    enabled: true,
    importedPurchases: [0, 0, 0, 0, 0, 90000, 0, 0, 0, 60000, 0, 0]
  }
})

/**
 * 🔴 THE FIVE ROWS ARE THE POINT OF THE SECTION. Mike, 2026-09-04: "the whole point of
 * this section is to show when deposits are due, freight is paid, border gst etc -
 * BEFORE the business can even start selling them". The engine computed them correctly
 * from the first commit and the screen showed a single "Money out" total, which is
 * precisely the concealment he was describing — so this guards the SCREEN, not the maths.
 */
describe('Three-Way Forecast screen — the five overseas cash rows (4.64)', () => {
  test('a domestic forecast keeps the compact four-row cash tab', async () => {
    const w = await mountWithResult(SAMPLE)
    expect(w.vm.hasOverseasTrade).toBe(false)
    expect(w.vm.overseasCashRows).toEqual([])
    expect(w.vm.cashRows.map(r => r.key)).toEqual(['in', 'out', 'move', 'close'])
  })

  test('an importing forecast shows all five, under Money out', async () => {
    const w = await mountWithResult(IMPORTING)
    expect(w.vm.hasOverseasTrade).toBe(true)
    expect(w.vm.cashRows.map(r => r.key)).toEqual([
      'in', 'out', 'os-dep', 'os-frt', 'os-duty', 'os-gst', 'os-bal', 'move', 'close'
    ])
  })

  test('each row carries the engine\'s own series, not the screen\'s arithmetic', async () => {
    const w = await mountWithResult(IMPORTING)
    const by = {}
    w.vm.cashRows.forEach((r) => { by[r.key] = r.values })
    const p = IMPORTING.cashFlow.payments
    expect(by['os-dep']).toBe(p.overseasDeposits)
    expect(by['os-frt']).toBe(p.overseasFreight)
    expect(by['os-duty']).toBe(p.overseasDuty)
    expect(by['os-gst']).toBe(p.overseasBorderGst)
    expect(by['os-bal']).toBe(p.overseasSupplierBalance)
  })

  test('the deposit is visible in MAY, four months before the stock lands', async () => {
    // The whole reason the rows exist. Inside Money out this figure is invisible.
    const w = await mountWithResult(IMPORTING)
    const deposits = w.vm.cashRows.find(r => r.key === 'os-dep').values
    expect(deposits[1]).toBeCloseTo(59400, 6)
    expect(IMPORTING.schedules.overseas.importedRevenue[1]).toBe(0)
  })

  test('a section filled in and then unticked shows nothing', async () => {
    // Asked of the figures rather than of the tick, which is also what the engine does.
    const unticked = computeThreeWayForecast({
      overseas: {
        enabled: false,
        importedPurchases: [0, 0, 0, 0, 0, 90000, 0, 0, 0, 60000, 0, 0]
      }
    })
    const w = await mountWithResult(unticked)
    expect(w.vm.hasOverseasTrade).toBe(false)
    expect(w.vm.cashRows.map(r => r.key)).toEqual(['in', 'out', 'move', 'close'])
  })
})

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

describe('the out-of-balance warning rests on an EXACT zero', () => {
  /**
   * Mike ruled 2026-09-03 that an unbalanced opening warns rather than blocking, and that
   * the warning is a full-width band so it survives into the print. The band fires on
   * `balanceCheck !== 0`, so a balanced book must produce a clean zero and not a floating
   * -point speck — otherwise every client gets a red band announcing a gap "of 0", which
   * is worse than no band at all. The arithmetic cancels identically today; this is what
   * fails if that ever stops being true.
   */
  const zeroes = () => new Array(12).fill(0)

  /** A balanced opening, with the awkward fractions a real chart of accounts carries. */
  function balancedInputs () {
    return {
      sales: [33333.33, 71428.57, 12345.67, 98765.43, 55555.55, 11111.11,
        22222.22, 44444.44, 66666.66, 88888.88, 99999.99, 10101.01],
      purchases: [1111.11, 2222.22, 3333.33, 4444.44, 5555.55, 6666.66,
        7777.77, 8888.88, 9999.99, 1010.10, 2020.20, 3030.30],
      markup: 0.6789,
      openingBalanceSheet: {
        authorisedCapital: 123456.78,
        capitalGain: 0,
        retainedEarnings: 0,
        cashAtBank: 123456.78,
        accountsReceivable: 0,
        inventory: 0,
        incomeTaxRefundDue: 0,
        gstRefund: 0,
        prepayments: 0,
        otherCurrentAsset: 0,
        bankOverdraft: 0,
        accountsPayable: 0,
        incomeTaxPayable: 0,
        gstPayable: 0,
        accruedExpenses: 0,
        otherCurrentLiability: 0,
        otherNonCurrentLiability: 0
      },
      assets: [0, 1, 2, 3, 4, 5].map(() => ({ opening: 0, depreciationRate: 0.1234, additions: zeroes(), disposals: zeroes() })),
      loans: [1, 2, 3].map(() => ({ opening: 0, monthlyRepayment: 0, interestRate: 0.0725, drawdowns: zeroes(), lumpSumRepayments: zeroes() })),
      shareholders: [1, 2, 3, 4].map(() => ({ opening: 0, advances: zeroes(), drawings: zeroes() }))
    }
  }

  test('🔴 a balanced book checks to exactly zero, fractions and all', () => {
    const checks = computeThreeWayForecast(balancedInputs()).balanceSheet.months.balanceCheck
    checks.forEach(v => expect(v).toBe(0))
  })

  test('the screen reads the last month’s check, and the sample is genuinely out', async () => {
    const w = await mountWithResult(SAMPLE)
    const checks = SAMPLE.balanceSheet.months.balanceCheck
    expect(w.vm.balanceCheck).toBe(checks[checks.length - 1])
    expect(w.vm.balanceCheck).not.toBe(0)
    w.destroy()
  })
})

/**
 * Fix 2 — stock already paid for at the opening date. Same argument as the five rows
 * above and the same guard: the engine moves real cash in the landing month (the balance
 * to the supplier, and the GST Customs charges on arrival), and rolled into one "Money
 * out" total it would be a lump in a month with nothing accounting for it.
 *
 * ⚠ These two rows are an ADDITION to the approved drawing, which drew no cash rows for
 * this fix. Named here as well as in the code so the deviation is on the record.
 */
describe('Three-Way Forecast screen — stock in transit lands in the cash tab', () => {
  const IN_TRANSIT = computeThreeWayForecast({
    openingBalanceSheet: { stockInTransitDeposits: 825629 },
    stockInTransit: { balanceOwing: 550419, landing: [0, 825629, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
  })

  test('a forecast with nothing on the water gains no rows at all', async () => {
    const w = await mountWithResult(SAMPLE)
    w.vm.tab = 'cash'
    expect(w.vm.stockInTransitCashRows).toEqual([])
    w.destroy()
  })

  test('a landing shows the balance and its border GST as their own lines', async () => {
    const w = await mountWithResult(IN_TRANSIT)
    w.vm.tab = 'cash'
    const rows = w.vm.stockInTransitCashRows
    expect(rows.map(r => r.key)).toEqual(['tr-bal', 'tr-gst'])
    // Each reads the series the engine actually filled, in the month it filled it.
    expect(rows[0].values[1]).toBeCloseTo(550419, 6)
    expect(rows[1].values[1]).toBeCloseTo((825629 + 550419) * 0.15, 6)
    // And both are inside the Money out total rather than beside it — they are part of it.
    expect(w.vm.cashRows.map(r => r.key)).toContain('tr-bal')
    w.destroy()
  })
})

/**
 * Summary / Every line — approved by Mike 2026-09-05 from
 * design/mockups/three-way-forecast-report-detail.html, after his request that the app
 * suit junior accountants: "most of the accountants using this will be junior in terms of
 * experience".
 *
 * 🔴 THE FIRST TEST IS THE ONE THAT MATTERS. The whole basis on which this was approved is
 * that the screen still OPENS on the four rows he approved on 2026-09-02 — an addition, not
 * a redesign. If a later change flips the default, every advisor content with today's
 * screen is handed a forty-row one and nobody would think to check.
 *
 * The rest guard what a person cannot: that a row reads the series it claims to, and that
 * the count of hidden overheads matches what was actually hidden.
 */
describe('Summary / Every line', () => {
  test('🔴 the screen opens on Summary, and Summary is unchanged', async () => {
    const w = await mountWithResult(SAMPLE)
    expect(w.vm.detail).toBe('summary')
    w.vm.tab = 'profit'
    expect(w.vm.visibleRows.map(r => r.key)).toEqual(['rev', 'gross', 'oh', 'net'])
    w.vm.tab = 'balance'
    expect(w.vm.visibleRows.map(r => r.key)).toEqual(['ar', 'stock', 'ap', 'na'])
    w.destroy()
  })

  test('every line opens all three statements, not just the one on screen', async () => {
    const w = await mountWithResult(SAMPLE)
    w.vm.detail = 'every'
    const counts = {}
    const tabs = ['profit', 'balance', 'cash']
    tabs.forEach((t) => { w.vm.tab = t; counts[t] = w.vm.visibleRows.length })
    // Mike's ruling: one setting governs all three, because an advisor who finds it on one
    // tab will look for it on the others.
    tabs.forEach((t) => { expect(counts[t]).toBeGreaterThan(8) })
    w.destroy()
  })

  test('a full statement reads the engine’s own series, not a re-derived one', async () => {
    const w = await mountWithResult(SAMPLE)
    w.vm.detail = 'every'
    w.vm.tab = 'profit'
    const byKey = {}
    w.vm.visibleRows.forEach((r) => { byKey[r.key] = r })
    expect(byKey.cos.values).toBe(SAMPLE.profitAndLoss.costOfSales)
    expect(byKey.op.values).toBe(SAMPLE.profitAndLoss.operatingSurplus)
    expect(byKey.pbt.values).toBe(SAMPLE.profitAndLoss.netSurplusBeforeTax)
    // Facility interest has a row at last. It was engine-only when the facility was built
    // earlier the same day, for want of anywhere on this screen to put it.
    expect(byKey['int-fac'].values).toBe(SAMPLE.profitAndLoss.interestFacilities)
    w.destroy()
  })

  test('the balance sheet shows both halves of the check it prints', async () => {
    const w = await mountWithResult(SAMPLE)
    w.vm.detail = 'every'
    w.vm.tab = 'balance'
    const keys = w.vm.visibleRows.map(r => r.key)
    // The point of the change: a junior can see WHY the check is what it is.
    expect(keys).toContain('net-a')
    expect(keys).toContain('teq')
    expect(keys[keys.length - 1]).toBe('na')
    w.destroy()
  })

  test('🔴 an overhead with no figure is hidden, and the note counts exactly those', async () => {
    const w = await mountWithResult(SAMPLE)
    w.vm.detail = 'every'
    w.vm.tab = 'profit'
    const oh = SAMPLE.profitAndLoss.overheads
    const withFigures = Object.keys(oh).filter(k => oh[k].some(v => Math.abs(v) >= 0.005))
    const shown = w.vm.visibleRows.filter(r => r.key.indexOf('oh-') === 0)
    expect(shown).toHaveLength(withFigures.length)
    // The count in the note is the rest of them — not a number typed into the sentence.
    expect(w.vm.hiddenOverheadCount).toBe(Object.keys(oh).length - withFigures.length)
    expect(w.vm.overheadCount).toBe(Object.keys(oh).length)
    w.destroy()
  })

  test('the hidden-overheads note stays off the other tabs and off Summary', async () => {
    const w = await mountWithResult(SAMPLE)
    w.vm.tab = 'profit'
    // Nothing to explain when the advisor is looking at four rows.
    expect(w.vm.hiddenOverheadCount).toBe(0)
    w.vm.detail = 'every'
    w.vm.tab = 'cash'
    expect(w.vm.hiddenOverheadCount).toBe(0)
    w.destroy()
  })

  test('a loan row carries the name the advisor gave it, not a translation key', async () => {
    const named = computeThreeWayForecast({
      loans: [{ name: 'Kiwibank term loan', type: 'term', opening: 80000, monthlyRepayment: 2450, interestRate: 0.07 }]
    })
    const w = await mountWithResult(named)
    w.vm.detail = 'every'
    w.vm.tab = 'balance'
    const row = w.vm.visibleRows.find(r => r.rawLabel === 'Kiwibank term loan')
    expect(row).toBeTruthy()
    expect(row.label).toBeUndefined()
    w.destroy()
  })
})
