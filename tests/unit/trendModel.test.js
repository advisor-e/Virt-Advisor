'use strict'

/**
 * The Three-Way Forecast's two-year trend read (item 4.61 phase (b)).
 *
 * WHAT THESE TESTS ARE FOR. A person in UAT can see that a table has six rows and that a
 * chip is amber. What they cannot see is that debtor days were divided by the cost of
 * sales instead of by sales, that a band fired one point early, or that a missing figure
 * became a plausible zero — and every one of those reaches a document a lender reads.
 * That is the whole of what is asserted here: arithmetic, band boundaries, and the
 * refusals. No wording, no classes.
 *
 * THE WORKED EXAMPLE IS THE APPROVED DRAWING'S OWN. `design/mockups/three-way-forecast-trend.html`
 * states its constructed inputs at the head of the file precisely so they can be checked,
 * and the first test below checks them. If the drawing and this test ever disagree, one of
 * them is wrong and it matters which.
 */

const {
  computeTrend,
  periodEndOf,
  periodsComparable,
  valuesFor,
  bandLevel,
  bandMovement,
  MEASURES
} = require('../../server/report/trendModel')

/** The drawing's constructed client, both years. */
const PRIOR = {
  reportDate: '1 April 2024 to 31 March 2025',
  sales: 824000,
  costOfSales: 478000,
  operatingExpenses: 268000,
  accountsReceivable: 101500,
  accountsPayable: 55000,
  inventory: 92000
}
const CURRENT = {
  reportDate: '1 April 2025 to 31 March 2026',
  sales: 890000,
  costOfSales: 529762,
  operatingExpenses: 302000,
  accountsReceivable: 142000,
  accountsPayable: 68500,
  inventory: 148000
}

/** The platform file as it ships: Mike's debtor-day numbers, nothing else set. */
const MIKES_THRESHOLDS = {
  levels: {
    debtorDays: { green: 35, amber: 45 },
    creditorDays: { green: null, amber: null },
    stockDays: { green: null, amber: null }
  },
  movements: {
    salesGrowth: { warn: null, crit: null },
    grossMargin: { warn: null, crit: null },
    overheadRatio: { warn: null, crit: null }
  }
}

/** Pull one measure out of a result by key. */
function measure (result, key) {
  return result.measures.filter(m => m.key === key)[0]
}

describe('trendModel — the approved drawing’s worked example', () => {
  const result = computeTrend({ current: CURRENT, prior: PRIOR, thresholds: MIKES_THRESHOLDS })

  test('all six measures are computable from two complete years', () => {
    expect(result.available).toBe(true)
    expect(result.blocked).toBeNull()
    expect(result.measures.map(m => m.key)).toEqual(MEASURES.map(m => m.key))
  })

  test('sales growth is the movement itself, not a difference of two growths', () => {
    const m = measure(result, 'salesGrowth')
    expect(m.prior).toBe(824000)
    expect(m.current).toBe(890000)
    expect(m.movement).toBeCloseTo(8.0097, 3)
  })

  test('gross margin is measured against sales, and fell 1.5 points', () => {
    const m = measure(result, 'grossMargin')
    expect(m.prior).toBeCloseTo(41.9903, 3)
    expect(m.current).toBeCloseTo(40.4762, 3)
    expect(m.movement).toBeCloseTo(-1.5141, 3)
  })

  test('overheads are measured against sales, and rose 1.4 points', () => {
    const m = measure(result, 'overheadRatio')
    expect(m.prior).toBeCloseTo(32.5243, 3)
    expect(m.current).toBeCloseTo(33.9326, 3)
    expect(m.movement).toBeCloseTo(1.4083, 3)
  })

  // 🔴 THE DIVISOR IS THE POINT OF THIS ONE. Debtors are measured against SALES and the
  // other two against COST OF SALES, which is the standard and is not interchangeable:
  // running stock days off sales would understate them by the whole gross margin — here
  // 102 days would read as 61, and nothing on screen would look odd.
  test('debtor days run off sales; creditor and stock days run off cost of sales', () => {
    expect(measure(result, 'debtorDays').current).toBeCloseTo(58.2360, 3)
    expect(measure(result, 'creditorDays').current).toBeCloseTo(47.1958, 3)
    expect(measure(result, 'stockDays').current).toBeCloseTo(101.9703, 3)
  })

  test('a day-count reports its movement even though its band ignores it', () => {
    const m = measure(result, 'debtorDays')
    expect(m.basis).toBe('level')
    expect(m.prior).toBeCloseTo(44.9606, 3)
    expect(m.movement).toBeCloseTo(13.2754, 3)
  })

  // This is the sentence the drawing makes on screen, pinned to the arithmetic.
  test('on Mike’s numbers debtor days is the only banded measure, and it is red', () => {
    expect(measure(result, 'debtorDays').band).toBe('crit')
    expect(measure(result, 'creditorDays').band).toBeNull()
    expect(measure(result, 'stockDays').band).toBeNull()
    expect(measure(result, 'salesGrowth').band).toBeNull()
    expect(result.counts).toEqual({ good: 0, warn: 0, crit: 1, unbanded: 5 })
  })
})

describe('trendModel — level bands, on Mike’s 0-35 / 36-45 / 46+ scale', () => {
  const t = { green: 35, amber: 45 }

  test('the boundaries are the TOP of each band', () => {
    expect(bandLevel(0, t)).toBe('good')
    expect(bandLevel(35, t)).toBe('good')
    expect(bandLevel(35.5, t)).toBe('warn')
    expect(bandLevel(45, t)).toBe('warn')
    expect(bandLevel(45.5, t)).toBe('crit')
    expect(bandLevel(58.236, t)).toBe('crit')
  })

  // Both are required on purpose: an amber with no green cannot say where good ends, and
  // guessing the missing half would be inventing the part of his judgement he withheld.
  test('one boundary alone bands nothing', () => {
    expect(bandLevel(50, { green: 35, amber: null })).toBeNull()
    expect(bandLevel(50, { green: null, amber: 45 })).toBeNull()
    expect(bandLevel(50, null)).toBeNull()
    expect(bandLevel(50, {})).toBeNull()
  })
})

describe('trendModel — movement bands, one per shape', () => {
  test('“growth falls below” bands low growth, not high', () => {
    const t = { warn: 0, crit: -5 }
    expect(bandMovement(8.01, 'below', t)).toBe('good')
    expect(bandMovement(0, 'below', t)).toBe('good')
    expect(bandMovement(-1, 'below', t)).toBe('warn')
    expect(bandMovement(-5, 'below', t)).toBe('warn')
    expect(bandMovement(-6, 'below', t)).toBe('crit')
  })

  test('“falls by more than” bands a drop, and a rise is always good', () => {
    const t = { warn: 1, crit: 3 }
    expect(bandMovement(-1.5141, 'fallBy', t)).toBe('warn')
    expect(bandMovement(-3.5, 'fallBy', t)).toBe('crit')
    expect(bandMovement(-1, 'fallBy', t)).toBe('good')
    expect(bandMovement(2, 'fallBy', t)).toBe('good')
  })

  test('“rises by more than” bands a rise, and a fall is always good', () => {
    const t = { warn: 1, crit: 3 }
    expect(bandMovement(1.4083, 'riseBy', t)).toBe('warn')
    expect(bandMovement(4, 'riseBy', t)).toBe('crit')
    expect(bandMovement(-4, 'riseBy', t)).toBe('good')
  })

  // Unlike a level, one threshold IS meaningful here — a firm may want a red line only.
  test('a single threshold fires alone, and none at all bands nothing', () => {
    expect(bandMovement(-4, 'fallBy', { warn: null, crit: 3 })).toBe('crit')
    expect(bandMovement(-2, 'fallBy', { warn: null, crit: 3 })).toBe('good')
    expect(bandMovement(-2, 'fallBy', { warn: 1, crit: null })).toBe('warn')
    expect(bandMovement(-2, 'fallBy', { warn: null, crit: null })).toBeNull()
    expect(bandMovement(-2, 'fallBy', null)).toBeNull()
  })
})

describe('trendModel — reading the period each report covers', () => {
  test('the END of the period is what is read, not the start', () => {
    expect(periodEndOf('1 April 2025 to 31 March 2026')).toEqual({ year: 2026, month: 3 })
    expect(periodEndOf('As at 31 March 2026')).toEqual({ year: 2026, month: 3 })
    expect(periodEndOf('As of December 31, 2025')).toEqual({ year: 2025, month: 12 })
    expect(periodEndOf('January - December 2026')).toEqual({ year: 2026, month: 12 })
    expect(periodEndOf('For the year ended 30 June 2026')).toEqual({ year: 2026, month: 6 })
  })

  test('a line naming no month or no year gives up rather than guessing', () => {
    expect(periodEndOf('As at 31/03/2026')).toEqual({ year: 2026, month: null })
    expect(periodEndOf(null)).toEqual({ year: null, month: null })
    expect(periodEndOf('')).toEqual({ year: null, month: null })
  })

  test('consecutive years ending in the same month are comparable', () => {
    expect(periodsComparable({ year: 2026, month: 3 }, { year: 2025, month: 3 }))
      .toEqual({ comparable: true, certain: true })
  })

  // 🔴 A nine-month period against a twelve-month one produces a growth figure that is
  // completely believable and completely wrong. Both refusals below are that one risk.
  test('a gap of two years, or a different month-end, is refused', () => {
    expect(periodsComparable({ year: 2026, month: 3 }, { year: 2024, month: 3 }).comparable).toBe(false)
    expect(periodsComparable({ year: 2026, month: 3 }, { year: 2025, month: 12 }).comparable).toBe(false)
  })

  test('too little information to judge proceeds, but says it is not certain', () => {
    expect(periodsComparable({ year: 2026, month: 3 }, { year: null, month: null }))
      .toEqual({ comparable: true, certain: false })
    expect(periodsComparable({ year: 2026, month: null }, { year: 2025, month: null }))
      .toEqual({ comparable: true, certain: false })
  })
})

describe('trendModel — what it refuses to do', () => {
  test('no prior year at all is blocked, not half-drawn', () => {
    const r = computeTrend({ current: CURRENT, prior: null, thresholds: MIKES_THRESHOLDS })
    expect(r.available).toBe(false)
    expect(r.blocked).toBe('NO_PRIOR_YEAR')
    expect(r.measures).toEqual([])
  })

  test('two periods that are not a like-for-like year apart are blocked', () => {
    const r = computeTrend({
      current: CURRENT,
      prior: Object.assign({}, PRIOR, { reportDate: '1 April 2024 to 31 December 2024' }),
      thresholds: MIKES_THRESHOLDS
    })
    expect(r.available).toBe(false)
    expect(r.blocked).toBe('PERIODS_NOT_COMPARABLE')
  })

  test('an unreadable date line still compares, and flags that it could not be checked', () => {
    const r = computeTrend({
      current: Object.assign({}, CURRENT, { reportDate: null }),
      prior: Object.assign({}, PRIOR, { reportDate: null }),
      thresholds: MIKES_THRESHOLDS
    })
    expect(r.available).toBe(true)
    expect(r.periodsCertain).toBe(false)
  })

  // The state the drawing calls "only last year's Profit and Loss was dropped".
  test('P&Ls without balance sheets give three measures and say so', () => {
    const pl = y => ({ reportDate: y.reportDate, sales: y.sales, costOfSales: y.costOfSales, operatingExpenses: y.operatingExpenses })
    const r = computeTrend({ current: pl(CURRENT), prior: pl(PRIOR), thresholds: MIKES_THRESHOLDS })
    expect(r.available).toBe(true)
    expect(r.needsBalanceSheet).toBe(true)
    expect(r.measures.map(m => m.key)).toEqual(['salesGrowth', 'grossMargin', 'overheadRatio'])
  })

  // 🔴 THE ASYMMETRIC CASE, AND THE ONE MOST LIKELY TO ARRIVE. A day-count bands on THIS
  // year's level alone, so it could be drawn with last year's cell empty — and it must not
  // be. In a table headed by two years, a blank cell reads as a zero.
  test('this year’s balance sheet without last year’s draws no day-counts at all', () => {
    const noBalanceSheet = { reportDate: PRIOR.reportDate, sales: PRIOR.sales, costOfSales: PRIOR.costOfSales, operatingExpenses: PRIOR.operatingExpenses }
    const r = computeTrend({ current: CURRENT, prior: noBalanceSheet, thresholds: MIKES_THRESHOLDS })
    expect(r.available).toBe(true)
    expect(r.needsBalanceSheet).toBe(true)
    expect(r.measures.map(m => m.key)).toEqual(['salesGrowth', 'grossMargin', 'overheadRatio'])
    expect(r.counts.crit).toBe(0)
  })

  test('a client with no stock simply has no stock days — never a zero', () => {
    const drop = (y) => { const c = Object.assign({}, y); delete c.inventory; return c }
    const r = computeTrend({ current: drop(CURRENT), prior: drop(PRIOR), thresholds: MIKES_THRESHOLDS })
    expect(measure(r, 'stockDays')).toBeUndefined()
    expect(measure(r, 'creditorDays')).toBeDefined()
    expect(r.needsBalanceSheet).toBe(false)
    // 🔴 AND IT SAYS WHY. The approved drawing's rule: a row that cannot be worked out is
    // left out and the reason given once — never a zero, never a dash to interpret.
    // Without this the client with no stock has a shorter table than the next one and
    // nothing accounts for the difference.
    expect(r.omitted).toEqual([{ key: 'stockDays', missing: 'inventory' }])
  })

  test('an absent row names the FIRST figure it wanted, in the order worth reporting', () => {
    const drop = (y) => { const c = Object.assign({}, y); delete c.costOfSales; delete c.inventory; return c }
    const r = computeTrend({ current: drop(CURRENT), prior: drop(PRIOR), thresholds: MIKES_THRESHOLDS })
    // Stock days needs cost of sales AND stock; cost of sales is the one named, because it
    // is the figure whose absence also took gross margin and creditor days with it.
    expect(r.omitted).toEqual([
      { key: 'grossMargin', missing: 'costOfSales' },
      { key: 'creditorDays', missing: 'costOfSales' },
      { key: 'stockDays', missing: 'costOfSales' }
    ])
  })

  test('a figure present this year but not last is as missing as one absent from both', () => {
    const noPriorStock = Object.assign({}, PRIOR)
    delete noPriorStock.inventory
    const r = computeTrend({ current: CURRENT, prior: noPriorStock, thresholds: MIKES_THRESHOLDS })
    expect(measure(r, 'stockDays')).toBeUndefined()
    expect(r.omitted).toEqual([{ key: 'stockDays', missing: 'inventory' }])
  })

  // 🔴 No cost of sales takes THREE measures with it, and quietly: gross margin, creditor
  // days and stock days all divide by it. Reading them off sales instead would be the
  // believable-but-wrong failure this whole module is written to avoid.
  test('no cost of sales removes gross margin, creditor days and stock days together', () => {
    const drop = (y) => { const c = Object.assign({}, y); delete c.costOfSales; return c }
    const r = computeTrend({ current: drop(CURRENT), prior: drop(PRIOR), thresholds: MIKES_THRESHOLDS })
    expect(r.measures.map(m => m.key)).toEqual(['salesGrowth', 'overheadRatio', 'debtorDays'])
  })

  test('a denominator of zero produces no measure rather than Infinity', () => {
    const zero = y => Object.assign({}, y, { sales: 0, costOfSales: 0 })
    const r = computeTrend({ current: zero(CURRENT), prior: zero(PRIOR), thresholds: MIKES_THRESHOLDS })
    expect(r.available).toBe(false)
    expect(r.blocked).toBe('NOTHING_COMPUTABLE')
  })

  test('a negative cost of sales is treated as absent, not as a valid divisor', () => {
    const v = valuesFor({ sales: 100000, costOfSales: -5000, inventory: 20000, accountsPayable: 8000 })
    expect(v.stockDays).toBeNull()
    expect(v.creditorDays).toBeNull()
  })

  test('a non-finite figure from a file is treated as absent', () => {
    const v = valuesFor({ sales: NaN, costOfSales: 50000, inventory: 10000 })
    expect(v.debtorDays).toBeNull()
    expect(v.grossMargin).toBeNull()
    expect(v.stockDays).toBeCloseTo(73, 6)
  })

  test('no thresholds at all still reads every measure, banding none', () => {
    const r = computeTrend({ current: CURRENT, prior: PRIOR })
    expect(r.measures).toHaveLength(6)
    expect(r.counts).toEqual({ good: 0, warn: 0, crit: 0, unbanded: 6 })
  })

  test('called with nothing it refuses rather than throwing', () => {
    expect(computeTrend().blocked).toBe('NO_PRIOR_YEAR')
    expect(computeTrend({}).blocked).toBe('NO_PRIOR_YEAR')
  })
})
