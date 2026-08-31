'use strict'

/**
 * Volatility Report model — calculation engine.
 *
 * Faithful port of `design/report-source-models/Volatility Report.xlsx`, whose seven sheets
 * are three views of one calculation:
 *
 *   - `Data Input`            — 24 months of sales, and the 24-month statistics (E7:AB7).
 *   - `12 / 18 Volatility Calcs` — the same statistics over the most recent 12 and 18 months.
 *   - `12 / 18 / 24 Volatility Graph` — the plotted bands, and the dial score in `AH2`/`AH4`.
 *   - `Year on Year`          — last year's twelve months against the twelve before them.
 *
 * WHAT THE MODEL SAYS. Plot monthly sales, draw the average through them, then draw bands at
 * one, two and three standard deviations either side. Roughly 68% of months should fall inside
 * the first band, 95% inside the second. A business whose months land where the model predicts
 * is *varying normally* — its ups and downs are the system's own noise. Reacting to that noise
 * is what Deming called tampering, and it makes the business worse, not better. See
 * `data/demings-volatility-reference.json`, the coaching content behind this report.
 *
 * FIDELITY NOTES — reproduced as the source has them, not "corrected":
 *
 *   - **Population standard deviation** (Excel `STDEV.P`, divide by n), NOT the sample one.
 *     The 12-month window gives 22,070.71515 with population and 23,052.11 with sample;
 *     `'12 Volatility Calcs'!C26` holds the former. Getting this wrong changes every band on
 *     the screen and would not look wrong to anybody.
 *   - **A window is the most RECENT n months**, not the first n. The 12-month sheet's series
 *     is the last twelve of the Data Input twenty-four, and the 18-month sheet's is the last
 *     eighteen. Verified against both sheets' own `Sales` rows.
 *   - **The third lower band is negative** in the source (−9,421.65 at 12 months,
 *     `'12 Volatility Calcs'!C20`). Sales cannot be negative, so the screen floors it at zero
 *     — **owner ruling, Mike, 2026-08-31: "stop it at zero"**. The unfloored arithmetic is kept
 *     on every band as `lowerUnfloored` so the port can still be checked against the workbook
 *     cell by cell, and so nothing is silently discarded.
 *
 * THE DIAL. The workbook's "rev counter" images show 77.73 / 85.12 / 95.13 for the three
 * windows, and those values live in cells (`'12 Volatility Graph'!AH2`, and `AH4` on the other
 * two). The formula is `(2 x standard deviation) / average x 100` — the width of the first band
 * as a share of an average month. Its green/orange/red boundaries (50 and 75) were measured
 * from the workbook's own gauge images, which are flat PNGs; they are not a choice made here.
 *
 * Pure, backend-only, no I/O (Stack Constitution: calculation never happens in a Vue component).
 */

/** Score at or above which the dial reads orange. Measured from the workbook's gauge images. */
const SCORE_WARN = 50

/** Score at or above which the dial reads red. Measured from the workbook's gauge images. */
const SCORE_CRIT = 75

/** The windows the workbook provides a sheet for. */
const WINDOWS = [12, 18, 24]

/**
 * The workbook's own 24 monthly sales figures, oldest first — `Data Input!E7:AB7`.
 * @type {{ sales: number[], window: number }}
 */
const DEFAULT_INPUTS = {
  sales: [
    145632, 56891, 87541, 29483, 75961, 34678,
    28965, 65987, 47986, 52364, 74632, 125463,
    16892, 78123, 56894, 20659, 58693, 85743,
    69472, 85631, 62478, 36251, 45326, 65324
  ],
  window: 12
}

/**
 * Coerce one cell to a finite number. Anything else is zero — an intake row that could not be
 * read must not poison the mean with NaN, which would blank every figure on the screen at once.
 *
 * @param {*} v
 * @returns {number}
 */
function toNumber (v) {
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * The population standard deviation — Excel's `STDEV.P`, dividing by n.
 *
 * Deliberately NOT the sample deviation: see the fidelity note at the top of this file. The
 * workbook treats the months in hand as the whole population, which is the right reading — we
 * are describing the variation that happened, not estimating a wider population from a sample.
 *
 * @param {number[]} values
 * @param {number} mean
 * @returns {number} 0 for an empty series.
 */
function populationStandardDeviation (values, mean) {
  if (values.length === 0) { return 0 }
  let sumSq = 0
  for (let i = 0; i < values.length; i++) {
    const d = values[i] - mean
    sumSq += d * d
  }
  return Math.sqrt(sumSq / values.length)
}

/**
 * Which deviation band a value sits in: 0 inside the first, 1 between the first and second,
 * 2 between the second and third, 3 beyond the third.
 *
 * Compared against the UNFLOORED bands on purpose. Flooring the display at zero must not change
 * which band a month is counted in, or a low month would be silently reclassified.
 *
 * @param {number} value
 * @param {number} mean
 * @param {number} sd
 * @returns {number}
 */
function bandOf (value, mean, sd) {
  if (sd === 0) { return 0 }
  const k = Math.abs(value - mean) / sd
  if (k <= 1) { return 0 }
  if (k <= 2) { return 1 }
  if (k <= 3) { return 2 }
  return 3
}

/**
 * The dial: the width of the first band as a percentage of an average month.
 *
 * @param {number} mean
 * @param {number} sd
 * @returns {number} 0 when there is no average to divide by.
 */
function volatilityScore (mean, sd) {
  if (mean === 0) { return 0 }
  return (2 * sd) / mean * 100
}

/**
 * The dial's colour for a score.
 *
 * @param {number} score
 * @returns {'good'|'warn'|'crit'}
 */
function scoreBand (score) {
  if (score >= SCORE_CRIT) { return 'crit' }
  if (score >= SCORE_WARN) { return 'warn' }
  return 'good'
}

/**
 * Compute the Volatility Report.
 *
 * @param {{ sales?: Array<number|string>, window?: number }} inputs
 *   `sales` is monthly figures oldest-first — the whole history available. `window` is how many
 *   of the most recent months to measure (12, 18 or 24; anything else falls back to 12).
 * @returns {{
 *   window: number, monthsUsed: number, sales: number[],
 *   total: number, average: number, standardDeviation: number,
 *   bands: Array<{ k: number, spread: number, lower: number, lowerUnfloored: number, upper: number, floored: boolean }>,
 *   score: number, scoreBand: string,
 *   months: Array<{ index: number, value: number, deviation: number, band: number, outside: boolean }>,
 *   insideFirstBand: number, insideFirstBandPct: number,
 *   highest: { index: number, value: number }|null, lowest: { index: number, value: number }|null,
 *   yearOnYear: { lastYear: number[], yearBefore: number[] }|null
 * }}
 */
function computeVolatility (inputs) {
  const src = (inputs && typeof inputs === 'object') ? inputs : {}
  const all = Array.isArray(src.sales) ? src.sales.map(toNumber) : []

  const requested = Number(src.window)
  const window = WINDOWS.includes(requested) ? requested : 12

  // The most recent n months — never the first n. See the fidelity note.
  const sales = all.length > window ? all.slice(all.length - window) : all.slice()
  const monthsUsed = sales.length

  let total = 0
  for (let i = 0; i < sales.length; i++) { total += sales[i] }
  const average = monthsUsed === 0 ? 0 : total / monthsUsed
  const standardDeviation = populationStandardDeviation(sales, average)

  const bands = [1, 2, 3].map((k) => {
    const spread = k * standardDeviation
    const lowerUnfloored = average - spread
    return {
      k,
      spread,
      lowerUnfloored,
      // Owner ruling 2026-08-31 — sales cannot be negative, so the band stops at zero.
      lower: Math.max(0, lowerUnfloored),
      upper: average + spread,
      floored: lowerUnfloored < 0
    }
  })

  const months = sales.map((value, index) => {
    const band = bandOf(value, average, standardDeviation)
    return {
      index,
      value,
      deviation: value - average,
      band,
      outside: band > 0
    }
  })

  let insideFirstBand = 0
  for (let i = 0; i < months.length; i++) { if (months[i].band === 0) { insideFirstBand++ } }

  let highest = null
  let lowest = null
  for (let i = 0; i < sales.length; i++) {
    if (highest === null || sales[i] > highest.value) { highest = { index: i, value: sales[i] } }
    if (lowest === null || sales[i] < lowest.value) { lowest = { index: i, value: sales[i] } }
  }

  // `Year on Year` — only meaningful with two full years behind us.
  const yearOnYear = all.length >= 24
    ? {
        lastYear: all.slice(all.length - 12),
        yearBefore: all.slice(all.length - 24, all.length - 12)
      }
    : null

  const score = volatilityScore(average, standardDeviation)

  return {
    window,
    monthsUsed,
    sales,
    total,
    average,
    standardDeviation,
    bands,
    score,
    scoreBand: scoreBand(score),
    months,
    insideFirstBand,
    insideFirstBandPct: monthsUsed === 0 ? 0 : (insideFirstBand / monthsUsed) * 100,
    highest,
    lowest,
    yearOnYear
  }
}

module.exports = {
  DEFAULT_INPUTS,
  WINDOWS,
  SCORE_WARN,
  SCORE_CRIT,
  populationStandardDeviation,
  volatilityScore,
  scoreBand,
  computeVolatility
}
