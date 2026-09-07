'use strict'

const {
  quickFireYears, marginFromMarkup, markupFromMargin, MAX_MARGIN_PCT
} = require('../../utils/quickFireForecast')

/**
 * The quick-fire option — item 4.71, approved 2026-09-07.
 *
 * 🔴 WHAT THESE TESTS ARE FOR. Quick-fire decides the `sales`, `markup` and `overheads` a
 * client's forecast is built from. Every fault it can have is a **plausible wrong number**:
 * a growth applied once instead of compounding, a margin converted the wrong way round, an
 * overhead line grown twice. None of those looks wrong on screen — the forecast still
 * balances and the totals still add up — which is precisely the class of fault UAT cannot
 * catch and this suite exists for.
 *
 * The figures below are the APPROVED DRAWING'S OWN
 * (`design/mockups/three-way-forecast-quick-fire.html`), so the code and the artefact Mike
 * approved are pinned to each other. If they ever disagree, one of the two is wrong and
 * this file says which.
 */

/** The drawing's example last year: sales 890,000, cost of sales 530,000, overheads 210,000. */
const BASE = {
  // A deliberately uneven twelve months totalling 890,000, so "keeps last year's shape"
  // is testable rather than asserted. A flat twelfth would pass a broken implementation.
  sales: [60000, 62000, 95000, 70000, 71000, 68000, 74000, 80000, 88000, 77000, 73000, 72000],
  markup: 67.9245283, // 530,000 cost → 360,000 gross profit, i.e. a 40.449% margin
  overheads: { rent: 90000, wages: 100000, power: 20000 }
}

/** The drawing's nine percentages. */
const ENTRIES = [
  { salesGrowth: 8, grossMargin: 41, overheadsIncrease: 4 },
  { salesGrowth: 6, grossMargin: 42, overheadsIncrease: 3 },
  { salesGrowth: 5, grossMargin: 42, overheadsIncrease: 3 }
]

const round = (n, dp) => Math.round(n * Math.pow(10, dp)) / Math.pow(10, dp)

describe('the margin ⇄ mark-up conversion, which the engine needs and the advisor does not', () => {
  test('41% margin is a 69.49% mark-up on cost, and 42% is 72.41%', () => {
    // Mike ruled the row reads "Gross margin" (2026-09-07, question 1) precisely because
    // these are different numbers for the same thing; the screen shows both.
    expect(round(markupFromMargin(41), 2)).toBe(69.49)
    expect(round(markupFromMargin(42), 2)).toBe(72.41)
  })

  test('it round-trips, so nothing drifts between the two units', () => {
    [0, 10, 33.3, 40.449, 55, 80].forEach((margin) => {
      expect(round(marginFromMarkup(markupFromMargin(margin)), 6)).toBe(round(margin, 6))
    })
  })

  test('the drawing\'s base mark-up of 67.9% is a 40.4% margin', () => {
    expect(round(marginFromMarkup(67.9), 1)).toBe(40.4)
  })

  test('🔴 a 100% margin is capped, never returned as an infinite mark-up', () => {
    // An Infinity here reaches the engine, and a forecast built on it still balances —
    // which is why it is capped rather than left to be noticed.
    expect(isFinite(markupFromMargin(100))).toBe(true)
    expect(markupFromMargin(100)).toBe(markupFromMargin(MAX_MARGIN_PCT))
    expect(isFinite(markupFromMargin(1000))).toBe(true)
  })
})

describe('three years from nine percentages — the drawing\'s own figures', () => {
  const years = quickFireYears(BASE, ENTRIES)

  test('sales compound year on year, never all off the base', () => {
    // 890,000 → +8% → +6% → +5%. A common way to get this wrong is to apply each
    // percentage to the base, which would give 961,200 / 943,400 / 934,500.
    expect(round(years[0].totals.sales, 0)).toBe(961200)
    expect(round(years[1].totals.sales, 0)).toBe(1018872)
    expect(round(years[2].totals.sales, 0)).toBe(1069816)
  })

  test('🔴 growth keeps last year\'s monthly SHAPE, month against the same month', () => {
    // The load-bearing one. A three-way forecast is read for its cash line, and an even
    // twelfth would hand a seasonal business a cash curve that cannot happen. March is the
    // drawing's heavy month and must still be the heavy month after growth.
    expect(round(years[0].sales[2], 0)).toBe(102600) // 95,000 × 1.08
    expect(round(years[0].sales[0], 0)).toBe(64800) //  60,000 × 1.08
    const flatTwelfth = years[0].totals.sales / 12
    expect(round(years[0].sales[2], 0)).not.toBe(round(flatTwelfth, 0))
    // and the shape is preserved exactly — every month grows by the same ratio
    years[0].sales.forEach((v, m) => {
      expect(round(v / BASE.sales[m], 6)).toBe(1.08)
    })
  })

  test('gross profit and cost of sales follow the margin typed for that year', () => {
    expect(round(years[0].totals.grossProfit, 0)).toBe(394092) // 961,200 × 41%
    expect(round(years[0].totals.costOfSales, 0)).toBe(567108)
    expect(round(years[1].totals.grossProfit, 0)).toBe(427926) // 1,018,872 × 42%
    expect(round(years[2].totals.grossProfit, 0)).toBe(449323)
  })

  test('overheads compound too, and every line moves together', () => {
    expect(round(years[0].totals.overheads, 0)).toBe(218400) // 210,000 × 1.04
    expect(round(years[1].totals.overheads, 0)).toBe(224952)
    expect(round(years[2].totals.overheads, 0)).toBe(231701)
    // per line, not just the total — a total can be right while a line is wrong
    expect(round(years[0].overheads.rent, 0)).toBe(93600) // 90,000 × 1.04
    expect(round(years[0].overheads.wages, 0)).toBe(104000)
    expect(round(years[0].overheads.power, 0)).toBe(20800)
  })

  test('the net profit the grid previews matches the drawing', () => {
    expect(round(years[0].totals.netProfit, 0)).toBe(175692)
    expect(round(years[1].totals.netProfit, 0)).toBe(202974)
    expect(round(years[2].totals.netProfit, 0)).toBe(217622)
  })

  test('the mark-up handed to the engine is the converted margin, as a percentage', () => {
    // `form.markup` holds a percentage and `buildInputs()` divides by 100, so this must be
    // in the same units or the forecast is out by a factor of a hundred.
    expect(round(years[0].markup, 2)).toBe(69.49)
    expect(round(years[1].markup, 2)).toBe(72.41)
  })
})

describe('a blank year means "the same again" — never zero, never the sample workbook', () => {
  test('a blank growth and increase leave the figures where they were', () => {
    const years = quickFireYears(BASE, [{}, {}, {}])
    expect(round(years[0].totals.sales, 0)).toBe(890000)
    expect(round(years[2].totals.sales, 0)).toBe(890000)
    expect(round(years[0].totals.overheads, 0)).toBe(210000)
  })

  test('a blank margin inherits the year before it, and does not sell at cost', () => {
    // 0 and blank are different answers: 0 would forecast selling everything at cost.
    const years = quickFireYears(BASE, [{ grossMargin: 41 }, {}, {}])
    expect(round(years[0].grossMargin, 2)).toBe(41)
    expect(round(years[1].grossMargin, 2)).toBe(41)
    expect(round(years[2].grossMargin, 2)).toBe(41)
    const zeroed = quickFireYears(BASE, [{ grossMargin: 0 }])
    expect(zeroed[0].totals.grossProfit).toBe(0)
  })

  test('year 1 blank inherits the BASE margin, read from the file\'s own mark-up', () => {
    const years = quickFireYears(BASE, [{}])
    expect(round(years[0].grossMargin, 3)).toBe(round(marginFromMarkup(BASE.markup), 3))
  })
})

describe('a minus sign is a decline, which is half of what Mike asked for', () => {
  test('negative growth shrinks the year, and compounds downward', () => {
    const years = quickFireYears(BASE, [
      { salesGrowth: -10 }, { salesGrowth: -5 }, {}
    ])
    expect(round(years[0].totals.sales, 0)).toBe(801000) // 890,000 × 0.90
    expect(round(years[1].totals.sales, 0)).toBe(760950) // × 0.95
    expect(round(years[2].totals.sales, 0)).toBe(760950) // blank — the same again
  })

  test('overheads can be cut as well as raised', () => {
    const years = quickFireYears(BASE, [{ overheadsIncrease: -20 }])
    expect(round(years[0].totals.overheads, 0)).toBe(168000)
  })
})

describe('it refuses to invent figures it was not given', () => {
  test('no entries yields no years', () => {
    expect(quickFireYears(BASE, [])).toEqual([])
    expect(quickFireYears(BASE, null)).toEqual([])
  })

  test('fewer entries yields fewer years — it never pads to three', () => {
    expect(quickFireYears(BASE, [{ salesGrowth: 8 }])).toHaveLength(1)
  })

  test('an empty base produces zeroes rather than throwing or defaulting', () => {
    const years = quickFireYears({}, [{ salesGrowth: 8, grossMargin: 41 }])
    expect(years[0].totals.sales).toBe(0)
    expect(years[0].sales).toHaveLength(12)
    expect(years[0].totals.overheads).toBe(0)
  })

  test('a twelve-month array always comes back, whatever the base held', () => {
    const years = quickFireYears({ sales: [100, 200] }, [{}])
    expect(years[0].sales).toHaveLength(12)
    expect(round(years[0].totals.sales, 0)).toBe(300)
  })

  test('text and nonsense in a field are read as blank, not as NaN', () => {
    // A NaN reaching the engine produces a forecast of NaNs that still renders.
    const years = quickFireYears(BASE, [{ salesGrowth: 'abc', overheadsIncrease: undefined }])
    expect(round(years[0].totals.sales, 0)).toBe(890000)
    expect(isNaN(years[0].totals.netProfit)).toBe(false)
  })
})
