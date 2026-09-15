'use strict'

/**
 * seasonShare — each season's share of the YEAR's labour margin (item 5.1).
 *
 * Mike asked for a pie of the three seasons as a share of total profit (2026-09-15). These
 * tests exist because that chart can be wrong in two ways a person in UAT cannot see, and
 * both were live possibilities while it was being drawn:
 *
 *   1. IT COULD BE BUILT FROM THE WRONG BLOCK. `seasonComparison` costs ONE REPRESENTATIVE
 *      MONTH of each kind, so its three figures sum to 44,435 against a year of 288,935.
 *      A pie of those renders perfectly and divides a whole into things that are not its
 *      parts. Nothing on screen would look wrong.
 *   2. A LOSING SEASON COULD BE REPORTED AS ZERO. `DoughnutChart` drops negatives from its
 *      total and its own legend prints `Math.max(value, 0)`, so a loss arrives on screen as
 *      "0%" — which reads as EARNED NONE when the truth is LOST MONEY.
 *
 * These are wrong-number and false-claim faults, which is exactly what a test is for here.
 * Nothing below asserts a label, a colour or a class — those a person judges in five
 * seconds, and Mike's ruling of 2026-08-24 says not to write them.
 */

const {
  computeWages,
  seasonShare,
  seasonComparison,
  DEFAULT_INPUTS
} = require('../../server/report/wagesModel')

describe('seasonShare — the twelve months rolled up by their own season', () => {
  const result = computeWages(DEFAULT_INPUTS)
  const rows = result.seasonShare

  it('is on the engine output, not left for the screen to work out', () => {
    // The report component recalculates nothing by design — two implementations of one
    // number is how they start to disagree. If this block ever leaves the payload, the
    // screen has to do arithmetic and that rule is broken.
    expect(Array.isArray(rows)).toBe(true)
    expect(rows.length).toBe(3)
  })

  it('RECONCILES TO THE YEAR EXACTLY — the whole point of a share', () => {
    const sum = rows.reduce((t, r) => t + r.margin, 0)
    expect(sum).toBeCloseTo(result.totals.margin, 6)
  })

  it('accounts for all twelve months, once each', () => {
    expect(rows.reduce((t, r) => t + r.months, 0)).toBe(result.months.length)
    expect(result.months.length).toBe(12)
  })

  it('is NOT the seasonComparison block — the trap this was drawn around', () => {
    const comparison = seasonComparison({
      settings: DEFAULT_INPUTS.settings,
      people: DEFAULT_INPUTS.people,
      seasonNames: DEFAULT_INPUTS.seasonNames
    })
    const comparisonSum = comparison.reduce((t, s) => t + s.margin, 0)

    // Three parallel scenarios, not three parts of a whole. If these two ever agree,
    // something has changed that this chart's honesty depends on.
    expect(comparisonSum).not.toBeCloseTo(result.totals.margin, 2)
    expect(comparisonSum).toBeCloseTo(44434.73, 2)
  })

  it('carries the sample figures the drawing was approved on', () => {
    const by = {}
    rows.forEach((r) => { by[r.name] = r })

    expect(by['Dry n Light'].months).toBe(4)
    expect(by['Dry n Light'].margin).toBeCloseTo(198304.07, 2)
    expect(by['Std Season'].months).toBe(7)
    expect(by['Std Season'].margin).toBeCloseTo(90763.02, 2)
    expect(by['Wet n Dark'].months).toBe(1)
    expect(by['Wet n Dark'].margin).toBeCloseTo(-131.83, 2)
  })

  it('orders by margin, largest first, so the season carrying the year leads', () => {
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].margin).toBeGreaterThanOrEqual(rows[i].margin)
    }
  })

  describe('share', () => {
    it('is the season margin over the YEAR margin', () => {
      const dry = rows.find(r => r.name === 'Dry n Light')
      expect(dry.share).toBeCloseTo(dry.margin / result.totals.margin, 10)
      expect(dry.share).toBeCloseTo(0.6863, 3)
    })

    it('🔴 IS NULL FOR A LOSING SEASON, NEVER 0 — a loss has no share of a profit', () => {
      const wet = rows.find(r => r.name === 'Wet n Dark')
      expect(wet.margin).toBeLessThan(0)
      // Null so the screen must decide what to print. A 0 here becomes "0%" on the ring,
      // which claims the season earned nothing when it in fact lost money.
      expect(wet.share).toBeNull()
      expect(wet.share).not.toBe(0)
    })

    it('the positive shares sum to one, less whatever the losses take out', () => {
      const positives = rows.filter(r => r.share !== null)
      const total = positives.reduce((t, r) => t + r.share, 0)
      expect(total).toBeGreaterThan(1)
      expect(total).toBeLessThan(1.001)
    })
  })

  describe('the edges', () => {
    it('gives every season a null share when the year lost money overall', () => {
      // A share of a negative whole is not a share of anything. Every row goes null
      // rather than the chart drawing slices of a loss.
      const rowsOnLoss = seasonShare(
        [
          { season: 'Wet n Dark', seasonKey: 'wet', margin: -400 },
          { season: 'Std Season', seasonKey: 'std', margin: 100 }
        ],
        -300
      )
      rowsOnLoss.forEach((r) => { expect(r.share).toBeNull() })
    })

    it('holds a season whose months cancel to exactly zero at null, not at 0%', () => {
      const rowsOnZero = seasonShare(
        [
          { season: 'Std Season', seasonKey: 'std', margin: 500 },
          { season: 'Std Season', seasonKey: 'std', margin: -500 },
          { season: 'Dry n Light', seasonKey: 'dry', margin: 1000 }
        ],
        1000
      )
      const std = rowsOnZero.find(r => r.name === 'Std Season')
      expect(std.months).toBe(2)
      expect(std.margin).toBe(0)
      expect(std.share).toBeNull()
    })

    it('returns nothing at all when there are no months', () => {
      expect(seasonShare([], 0)).toEqual([])
    })

    it('groups on the season KEY, so two months of one season never split', () => {
      const grouped = seasonShare(
        [
          { season: 'Dry n Light', seasonKey: 'dry', margin: 10 },
          { season: 'Dry n Light', seasonKey: 'dry', margin: 20 }
        ],
        30
      )
      expect(grouped.length).toBe(1)
      expect(grouped[0].months).toBe(2)
      expect(grouped[0].margin).toBe(30)
    })
  })

  describe('on the shutdown basis', () => {
    it('still reconciles to that basis own year total', () => {
      const shutdown = computeWages(
        Object.assign({}, DEFAULT_INPUTS, { basis: 'shutdown' })
      )
      const sum = shutdown.seasonShare.reduce((t, r) => t + r.margin, 0)
      expect(sum).toBeCloseTo(shutdown.totals.margin, 6)
    })
  })
})
