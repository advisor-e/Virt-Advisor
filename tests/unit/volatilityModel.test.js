'use strict'

const {
  DEFAULT_INPUTS,
  SCORE_WARN,
  SCORE_CRIT,
  populationStandardDeviation,
  volatilityScore,
  scoreBand,
  computeVolatility
} = require('../../server/report/volatilityModel')

/**
 * GOLDEN TEST — Volatility Report.
 *
 * Every expected number below is the source workbook's OWN cached value, read straight out of
 * `design/report-source-models/Volatility Report.xlsx`. If our port and the spreadsheet ever
 * disagree, this fails. Cell references are given so any figure can be checked by hand.
 *
 * Where the source is internally odd we assert the SOURCE's number and handle the display
 * separately — reproducing the model is the job. The one such case here is the negative third
 * lower band, which the workbook computes and the screen floors at zero on the owner's ruling
 * of 2026-08-31; both values are asserted below, so neither can drift unnoticed.
 */

// The workbook stores full floating-point values; 6dp is far tighter than anything displayed,
// while tolerating IEEE noise.
const P = 6

describe('Volatility — golden values from Volatility Report.xlsx', () => {
  describe('12-month window — sheet "12 Volatility Calcs"', () => {
    const out = computeVolatility({ sales: DEFAULT_INPUTS.sales, window: 12 })

    it('takes the most recent twelve months, not the first twelve', () => {
      // C7:N7 — the sheet's own Sales row, which is the tail of Data Input!E7:AB7.
      expect(out.sales).toEqual([
        16892, 78123, 56894, 20659, 58693, 85743, 69472, 85631, 62478, 36251, 45326, 65324
      ])
      expect(out.monthsUsed).toBe(12)
    })

    it('totals and averages to the sheet', () => {
      expect(out.total).toBeCloseTo(681486, P) //              O7
      expect(out.average).toBeCloseTo(56790.5, P) //           C14
    })

    it('uses the POPULATION standard deviation, not the sample one', () => {
      expect(out.standardDeviation).toBeCloseTo(22070.71515, 4) // C26

      // The distinction is the whole ballgame: the sample deviation would give 23,052.11 and
      // every band on the screen would be wrong by ~1,000 without looking wrong to anybody.
      const sample = Math.sqrt(
        out.sales.reduce((a, v) => a + Math.pow(v - out.average, 2), 0) / (out.sales.length - 1)
      )
      expect(sample).toBeCloseTo(23052.11, 2)
      expect(out.standardDeviation).not.toBeCloseTo(sample, 2)
    })

    it('places the three bands where the sheet places them', () => {
      const [b1, b2, b3] = out.bands
      expect(b1.lower).toBeCloseTo(34719.78485, 4) //  C10  (1 dwn)
      expect(b1.upper).toBeCloseTo(78861.21515, 4) //  C12  (1 up)
      expect(b2.lower).toBeCloseTo(12649.0697, 4) //   C16  (2 dwn)
      expect(b2.upper).toBeCloseTo(100931.9303, 4) //  C18  (2 up)
      expect(b3.upper).toBeCloseTo(123002.6455, 4) //  C22  (3 up)

      expect(b1.spread).toBeCloseTo(22070.71515, 4) // C26  (Std Dev 1)
      expect(b2.spread).toBeCloseTo(44141.4303, 4) //  C27  (Std Dev 2)
      expect(b3.spread).toBeCloseTo(66212.14545, 4) // C28  (Std Dev 3)
    })

    it('floors the negative third band at zero, and keeps the workbook value beside it', () => {
      const b3 = out.bands[2]
      // C20 — the workbook's own arithmetic, reproduced exactly.
      expect(b3.lowerUnfloored).toBeCloseTo(-9421.645451, 4)
      // What the screen shows: sales cannot be negative (Mike, 2026-08-31 — "stop it at zero").
      expect(b3.lower).toBe(0)
      expect(b3.floored).toBe(true)
      // The first two bands are positive here and must NOT be touched.
      expect(out.bands[0].floored).toBe(false)
      expect(out.bands[1].floored).toBe(false)
    })

    it('scores the dial as the workbook does', () => {
      // '12 Volatility Graph'!AH2 — the value under the rev-counter image.
      expect(out.score).toBeCloseTo(77.72678582, 6)
      expect(out.scoreBand).toBe('crit') // 77.73 is above the measured red threshold of 75
    })

    it('counts eight of twelve months inside the first band', () => {
      // January, April, June and August sit outside; nothing reaches the second band.
      expect(out.insideFirstBand).toBe(8)
      expect(out.insideFirstBandPct).toBeCloseTo(66.6666667, 5)
      expect(out.months.filter(m => m.outside).map(m => m.index)).toEqual([0, 3, 5, 7])
      expect(out.months.filter(m => m.band >= 2)).toEqual([])
    })

    it('reports the extremes with their distance from the average', () => {
      expect(out.highest).toEqual({ index: 5, value: 85743 })
      expect(out.lowest).toEqual({ index: 0, value: 16892 })
      expect(out.months[0].deviation).toBeCloseTo(-39898.5, P)
      expect(out.months[5].deviation).toBeCloseTo(28952.5, P)
    })
  })

  describe('18-month window — sheet "18 Volatility Calcs"', () => {
    const out = computeVolatility({ sales: DEFAULT_INPUTS.sales, window: 18 })

    it('takes the most recent eighteen months', () => {
      expect(out.monthsUsed).toBe(18)
      expect(out.sales[0]).toBe(28965) // C7 — the sheet's first Sales cell
      expect(out.sales[17]).toBe(65324) // T7 — its last
    })

    it('matches the sheet', () => {
      expect(out.average).toBeCloseTo(59826.83333, 4) //       C14
      expect(out.standardDeviation).toBeCloseTo(25461.98518, 4) // C26
      expect(out.bands[0].lower).toBeCloseTo(34364.84815, 4) // C10
      expect(out.bands[0].upper).toBeCloseTo(85288.81851, 4) // C12
      expect(out.bands[2].lowerUnfloored).toBeCloseTo(-16559.12221, 4) // C20
      expect(out.bands[2].lower).toBe(0) // floored for display
    })

    it('scores the dial as the workbook does', () => {
      expect(out.score).toBeCloseTo(85.11894667, 6) // '18 Volatility Graph'!AH4
      expect(out.scoreBand).toBe('crit')
    })
  })

  describe('24-month window — sheet "Data Input"', () => {
    const out = computeVolatility({ sales: DEFAULT_INPUTS.sales, window: 24 })

    it('matches the sheet', () => {
      expect(out.monthsUsed).toBe(24)
      expect(out.total).toBeCloseTo(1507069, P) //             B7
      expect(out.average).toBeCloseTo(62794.54167, 4) //       E14
      expect(out.standardDeviation).toBeCloseTo(29868.45991, 4) // E26
      expect(out.bands[0].lower).toBeCloseTo(32926.08176, 4) // E10
      expect(out.bands[0].upper).toBeCloseTo(92663.00157, 4) // E12
      expect(out.bands[2].lowerUnfloored).toBeCloseTo(-26810.83806, 4) // E20
    })

    it('scores the dial as the workbook does', () => {
      expect(out.score).toBeCloseTo(95.13075218, 6) // '24 Volatility Graph'!AH4
    })

    it('splits the two years for the Year on Year sheet', () => {
      // 'Year on Year'!C88:N88 (last year) and C89:N89 (the year before).
      expect(out.yearOnYear.lastYear).toEqual([
        16892, 78123, 56894, 20659, 58693, 85743, 69472, 85631, 62478, 36251, 45326, 65324
      ])
      expect(out.yearOnYear.yearBefore).toEqual([
        145632, 56891, 87541, 29483, 75961, 34678, 28965, 65987, 47986, 52364, 74632, 125463
      ])
    })
  })

  describe('the dial thresholds', () => {
    // Measured from the three gauge PNGs embedded in the workbook by decoding the arc; all
    // three gave the same boundaries. They are recorded here so a later edit cannot quietly
    // move a client-facing colour.
    it('turns orange at 50 and red at 75', () => {
      expect(SCORE_WARN).toBe(50)
      expect(SCORE_CRIT).toBe(75)
      expect(scoreBand(49.99)).toBe('good')
      expect(scoreBand(50)).toBe('warn')
      expect(scoreBand(74.99)).toBe('warn')
      expect(scoreBand(75)).toBe('crit')
    })
  })

  describe('inputs that would otherwise produce a broken screen', () => {
    it('survives an empty series without returning NaN', () => {
      const out = computeVolatility({ sales: [], window: 12 })
      expect(out.average).toBe(0)
      expect(out.standardDeviation).toBe(0)
      expect(out.score).toBe(0)
      expect(out.scoreBand).toBe('good')
      expect(out.insideFirstBandPct).toBe(0)
      expect(out.highest).toBeNull()
      expect(out.yearOnYear).toBeNull()
      out.bands.forEach((b) => {
        expect(Number.isFinite(b.lower)).toBe(true)
        expect(Number.isFinite(b.upper)).toBe(true)
      })
    })

    it('survives no inputs at all', () => {
      const out = computeVolatility()
      expect(out.monthsUsed).toBe(0)
      expect(out.window).toBe(12)
      expect(Number.isFinite(out.score)).toBe(true)
    })

    it('treats an unreadable cell as zero rather than poisoning every figure', () => {
      // One NaN in the series would blank the average, both bands and the dial at once.
      const out = computeVolatility({ sales: [100, 'not a number', 200, null], window: 12 })
      expect(out.monthsUsed).toBe(4)
      expect(out.total).toBe(300)
      expect(Number.isFinite(out.average)).toBe(true)
      expect(Number.isFinite(out.standardDeviation)).toBe(true)
    })

    it('falls back to twelve months when the window is not one the workbook provides', () => {
      expect(computeVolatility({ sales: DEFAULT_INPUTS.sales, window: 9 }).window).toBe(12)
      expect(computeVolatility({ sales: DEFAULT_INPUTS.sales, window: 'x' }).window).toBe(12)
    })

    it('uses everything it has when asked for more months than exist', () => {
      const out = computeVolatility({ sales: [10, 20, 30], window: 24 })
      expect(out.monthsUsed).toBe(3)
      expect(out.average).toBeCloseTo(20, P)
    })

    it('counts a month sitting exactly on a band boundary as inside that band', () => {
      // Added after mutation testing: flipping `k <= 1` to `k < 1` in bandOf() passed every
      // other assertion in this file. Real months rarely land exactly on a deviation, which
      // is why nobody would ever see it in UAT — the month would simply be reported as
      // "outside the normal range" when it is on the line.
      // Mean 1, population deviation 1, so both months sit exactly one deviation out.
      const out = computeVolatility({ sales: [0, 2], window: 12 })
      expect(out.standardDeviation).toBeCloseTo(1, P)
      expect(out.months.map(m => m.band)).toEqual([0, 0])
      expect(out.insideFirstBand).toBe(2)
      expect(out.months.filter(m => m.outside)).toEqual([])
    })

    it('puts a month beyond the third deviation in the outermost band', () => {
      // The workbook's own sample never reaches the third band, so nothing else here
      // exercises it — yet this is the case that matters most on screen. A month this far
      // out is the one an adviser is actually going to ask the client about.
      const out = computeVolatility({
        sales: [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 50000],
        window: 12
      })
      expect(out.months[11].band).toBe(3)
      expect(out.months[11].outside).toBe(true)
      expect(out.insideFirstBand).toBe(11)
    })

    it('reports a flat series as no volatility rather than dividing by zero', () => {
      const out = computeVolatility({ sales: new Array(12).fill(5000), window: 12 })
      expect(out.standardDeviation).toBe(0)
      expect(out.score).toBe(0)
      expect(out.scoreBand).toBe('good')
      expect(out.insideFirstBand).toBe(12)
    })
  })

  describe('the helpers, on their own', () => {
    it('divides by n, not n-1', () => {
      // Mean 3; deviations -2,-1,0,1,2; sum of squares 10; 10/5 = 2.
      expect(populationStandardDeviation([1, 2, 3, 4, 5], 3)).toBeCloseTo(Math.sqrt(2), P)
    })

    it('scores zero when there is no average to divide by', () => {
      expect(volatilityScore(0, 1000)).toBe(0)
    })
  })
})
