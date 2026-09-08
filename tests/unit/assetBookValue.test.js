'use strict'

/**
 * What one asset is carried at in the month it is sold — item 4.65, question 1, ruled by Mike
 * 2026-09-08.
 *
 * 🔴 WHY THESE EXIST. The figure this produces becomes the disposal the engine removes from the
 * category pool. Get it wrong and the gain or loss on sale moves, which moves the tax, which
 * moves retained earnings and closing cash — and every one of those still balances. There is
 * nothing on any screen for a person in UAT to notice.
 */

const { bookValueAtSale, excelRound } = require('../../utils/assetBookValue')
const model = require('../../server/report/threeWayForecastModel')

describe('the rounding mirrors the engine', () => {
  test('🔴 agrees with the engine across the range, so the screen cannot drift from the forecast', () => {
    // This module reproduces `excelRound` because the engine is backend CommonJS and this runs
    // in the browser. A silent divergence would put a figure on screen that the forecast then
    // disagreed with — and neither would look wrong. This is the test that forbids it, and it
    // compares against the engine's OWN exported function rather than a transcription of it.
    expect(typeof model.excelRound).toBe('function')
    for (let i = -20000; i <= 20000; i += 3) {
      const x = i / 4
      expect(excelRound(x)).toBe(model.excelRound(x))
    }
    // and the awkward ones by name
    ;[0, -0, 0.5, -0.5, 516.25, 1e15 + 0.5, -1e15 - 0.5].forEach((x) => {
      expect(excelRound(x)).toBe(model.excelRound(x))
    })
  })

  test('🔴 rounds to WHOLE units, not to the penny', () => {
    // Every figure in the forecast's asset schedules is a whole number. A disposal carrying
    // pennies would be the only fractional value in them.
    expect(excelRound(516.25)).toBe(516)
    expect(excelRound(0.4)).toBe(0)
    expect(excelRound(0.5)).toBe(1)
  })

  test('never returns negative zero', () => {
    // A balance line reading "-0" on screen is a defect. The engine normalises it and so must
    // this, or the two disagree on a value a reader can see.
    expect(Object.is(excelRound(-0.2), -0)).toBe(false)
    expect(excelRound(-0.2)).toBe(0)
  })

  test('leaves a non-finite value alone rather than inventing one', () => {
    expect(excelRound(Infinity)).toBe(Infinity)
    expect(Number.isNaN(excelRound(NaN))).toBe(true)
  })
})

describe('the book value at the month of sale', () => {
  // The worked example on the approved drawing: the 2018 Ford Ranger Utility, carried at
  // 31,500 on Mike's own MYOB schedule, in the Vehicles category at 20%.
  const RANGER = 31500
  const VEHICLES = 0.2

  test('🔴 a sale in month 1 uses the schedule figure untouched', () => {
    // Nothing has been charged yet. Depreciating here would understate the asset in the one
    // month where the schedule's own figure is exactly right.
    const r = bookValueAtSale(RANGER, VEHICLES, 1)
    expect(r.bookValue).toBe(31500)
    expect(r.monthsCharged).toBe(0)
    expect(r.depreciation).toBe(0)
  })

  test('🔴 a sale in March charges January and February, and NOT March', () => {
    // The engine removes a disposal from the pool BEFORE charging that month's depreciation,
    // so the sale month itself is never charged against the asset being sold. Charging it
    // would understate the book value and overstate the gain.
    const r = bookValueAtSale(RANGER, VEHICLES, 3)
    expect(r.monthsCharged).toBe(2)
    // 31,500 − 525 = 30,975; 30,975 − 516 = 30,459
    expect(r.bookValue).toBe(30459)
    expect(r.depreciation).toBe(1041)
  })

  test('the later the sale, the further it is written down', () => {
    const march = bookValueAtSale(RANGER, VEHICLES, 3).bookValue
    const december = bookValueAtSale(RANGER, VEHICLES, 12).bookValue
    expect(december).toBeLessThan(march)
    // Eleven months charged by December — the gap the year-end figure would have hidden.
    expect(bookValueAtSale(RANGER, VEHICLES, 12).monthsCharged).toBe(11)
    expect(RANGER - december).toBeGreaterThan(5000)
  })

  test('🔴 the CATEGORY rate governs, not the asset\'s own', () => {
    // MYOB says 10% diminishing value for this van; the Vehicles category says 20%. Question 4
    // ruled the category rate. The two differ by enough to matter, which is why the screen
    // prints which rate it used.
    const atCategory = bookValueAtSale(RANGER, 0.2, 3).bookValue
    const atAssetsOwn = bookValueAtSale(RANGER, 0.1, 3).bookValue
    expect(atCategory).not.toBe(atAssetsOwn)
    expect(atAssetsOwn).toBeGreaterThan(atCategory)
  })

  test('a fully written-down asset stays at zero rather than going negative', () => {
    const r = bookValueAtSale(0, VEHICLES, 12)
    expect(r.bookValue).toBe(0)
    expect(r.depreciation).toBe(0)
  })

  test('a zero rate writes nothing down', () => {
    expect(bookValueAtSale(RANGER, 0, 12).bookValue).toBe(31500)
  })

  test('a month outside 1-12 falls back to charging nothing, never to a wrong figure', () => {
    // The screen only offers twelve months, so this is a guard rather than a path. Falling
    // back to the schedule's own figure is the safe direction: it is a number the advisor can
    // see on their own paperwork.
    expect(bookValueAtSale(RANGER, VEHICLES, 0).bookValue).toBe(31500)
    expect(bookValueAtSale(RANGER, VEHICLES, 13).bookValue).toBe(31500)
    expect(bookValueAtSale(RANGER, VEHICLES, -4).bookValue).toBe(31500)
  })

  test('never throws on rubbish, and never returns NaN', () => {
    // An unusable figure must not put NaN into a form the advisor is about to submit.
    ;[null, undefined, 'x', NaN, {}].forEach((bad) => {
      const r = bookValueAtSale(bad, VEHICLES, 3)
      expect(Number.isFinite(r.bookValue)).toBe(true)
      const r2 = bookValueAtSale(RANGER, bad, 3)
      expect(Number.isFinite(r2.bookValue)).toBe(true)
      const r3 = bookValueAtSale(RANGER, VEHICLES, bad)
      expect(Number.isFinite(r3.bookValue)).toBe(true)
    })
  })
})
