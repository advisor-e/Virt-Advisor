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

  /**
   * The forecast comparison — the Three-Way Forecast's step 3 (approved drawing
   * design/mockups/three-way-forecast-volatility.html, 2026-09-03).
   *
   * These are the assertions UAT cannot make. A band edge, a severity level and an
   * alignment between two series all look completely normal on screen while being wrong,
   * and the sentence the screen prints — "7.2 deviations above the average" — is a number
   * a client may act on.
   */
  describe('a forecast placed against the history', () => {
    // The twelve months the approved forecast mockup seeds into step 3 (Big Bird Grass
    // Seed, 890,000). Average 74,166.67, population deviation 9,090.59.
    const HISTORY = [85000, 70000, 75000, 80000, 60000, 65000, 70000, 70000, 80000, 95000, 70000, 70000]
    const AVERAGE = 74166.6667
    const DEVIATION = 9090.5934

    it('leaves the report untouched when no forecast is sent', () => {
      // The Volatility Report never sends one, so its response shape must not change.
      expect(computeVolatility({ sales: HISTORY, window: 12 }).forecast).toBeNull()
    })

    it('🔴 measures the bands from the ACTUAL months, never from the forecast', () => {
      // The whole design. An optimistic forecast must not be able to widen its own normal
      // range and then sit comfortably inside it.
      const wild = HISTORY.slice()
      wild[9] = 400000
      const out = computeVolatility({ sales: HISTORY, window: 12, forecast: wild })

      expect(out.average).toBeCloseTo(AVERAGE, 3)
      expect(out.standardDeviation).toBeCloseTo(DEVIATION, 3)
      // …and the wild month is duly reported as far out, rather than absorbed.
      expect(out.forecast.months[9].band).toBe(3)
    })

    it('puts a month 7.2 deviations out beyond the third band, and quotes that figure', () => {
      // The drawing's own example: January raised from 95,000 to 140,000.
      const forecast = HISTORY.slice()
      forecast[9] = 140000
      const { forecast: read } = computeVolatility({ sales: HISTORY, window: 12, forecast })

      expect(read.months[9].band).toBe(3)
      expect(read.months[9].deviations).toBeCloseTo(7.2419, 3)
      expect(read.beyondThird).toEqual([9])
      expect(read.beyondSecond).toEqual([])
      expect(read.worst.index).toBe(9)
    })

    it('separates the amber level from the red one at the third deviation', () => {
      // 2.4 deviations up is amber; 3.5 is red. Getting these the wrong way round would
      // put the milder wording on the worse month.
      const forecast = HISTORY.slice()
      forecast[1] = AVERAGE + 2.4 * DEVIATION
      forecast[2] = AVERAGE + 3.5 * DEVIATION
      // January's own 95,000 is 2.29 deviations out in this client's history, so it is
      // levelled to the average here — otherwise the test would be asserting two things.
      forecast[9] = AVERAGE
      const { forecast: read } = computeVolatility({ sales: HISTORY, window: 12, forecast })

      expect(read.beyondSecond).toEqual([1])
      expect(read.beyondThird).toEqual([2])
      // The furthest is the one the red band quotes, not simply the first.
      expect(read.worst.index).toBe(2)
    })

    it('🔴 marks a month the advisor never touched, so seasonality is not read as a mistake', () => {
      // Forecast month j pairs with the j-th of the most recent twelve actual months. April,
      // August and September are outside the range in this client's own history; leaving
      // them alone must not produce the same warning as typing a new figure.
      const forecast = HISTORY.slice()
      forecast[9] = 140000
      const { forecast: read } = computeVolatility({ sales: HISTORY, window: 12, forecast })

      expect(read.seasonal).toEqual([0, 4, 5])
      expect(read.months[0].unchanged).toBe(true)
      expect(read.months[9].unchanged).toBe(false)
      expect(read.outsideCount).toBe(4)
    })

    it('pairs against the most recent twelve when a longer window is measured', () => {
      // 24 months in hand, measured over 24 — the forecast still lines up with the last
      // twelve, because that is where the forecast starts. Reading from the front of the
      // window would compare next April with a month two years ago.
      const older = new Array(12).fill(50000)
      const { forecast: read } = computeVolatility({
        sales: older.concat(HISTORY),
        window: 24,
        forecast: HISTORY.slice()
      })

      expect(read.months.every(m => m.unchanged)).toBe(true)
    })

    it('claims no month is out when the history never varied', () => {
      // Zero deviation divides by zero. It must report nothing out rather than everything.
      const flat = new Array(12).fill(5000)
      const { forecast: read } = computeVolatility({ sales: flat, window: 12, forecast: new Array(12).fill(99999) })

      expect(read.outsideCount).toBe(0)
      expect(read.beyondThird).toEqual([])
      expect(read.months[0].deviations).toBe(0)
    })

    it('treats an unreadable forecast cell as zero rather than poisoning the read', () => {
      // An emptied input arrives as '' or null. One NaN would blank every verdict at once.
      const forecast = HISTORY.slice()
      forecast[3] = ''
      const { forecast: read } = computeVolatility({ sales: HISTORY, window: 12, forecast })

      expect(read.months[3].value).toBe(0)
      expect(Number.isFinite(read.months[3].deviations)).toBe(true)
    })
  })
})
