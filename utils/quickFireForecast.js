'use strict'

/**
 * @file The quick-fire option — three years of forecast figures from nine percentages.
 * @module utils/quickFireForecast
 *
 * Item **4.71**. Mike's request of 2026-09-07, in his own words: *"draw it up please and
 * make it a 'quick-fire option'. tick a box, it opens so i can put the data in and it just
 * adds or subtracts from previous known data. untick it and the status quo continues"* —
 * asked after being told that growth, cost-increase and margin percentages for years 1, 2
 * and 3 could be entered nowhere. Drawn as
 * `design/mockups/three-way-forecast-quick-fire.html`, approved the same day with all five
 * of its questions ruled.
 *
 * 🔴 IT TRANSFORMS INPUTS; IT DOES NOT FORECAST. Everything here does is decide what
 * `sales`, `markup` and `overheads` the existing engine is asked about. The forecast itself
 * stays where it has always been — `server/report/threeWayForecastModel.js`, backend-only —
 * and nothing in this file computes interest, depreciation, tax or a balance sheet.
 *
 * WHY IT SITS IN `utils/` RATHER THAN ON THE BACKEND, stated rather than assumed. The
 * Stack Constitution puts business logic on Restify, and the forecast obeys that. This is
 * the same shape as the four sliders that already ship: `payload()` in
 * `components/ThreeWayForecastReport.vue` scales `base.sales` and `base.overheads` and sets
 * `base.markup` in the browser, then asks the backend for the forecast. Quick-fire does the
 * identical thing one step earlier, and it has to recompute on every keystroke — a round
 * trip per digit would make the grid unusable. Extracted rather than written into the
 * component because **slice 2 needs years 2 and 3 for the three-year screen**, and two
 * copies of a compounding rule would drift into two different forecasts from one client.
 *
 * 🔴 GROWTH KEEPS LAST YEAR'S MONTHLY SHAPE. Each month is grown against **that same month**
 * a year earlier, never spread evenly across twelve. A three-way forecast is read for its
 * cash line, and a business with a quiet January and a heavy March that is flattened into
 * twelve equal months produces a cash curve that will not happen.
 *
 * 🔴 A BLANK YEAR MEANS "THE SAME AGAIN", never zero and never the sample workbook. This is
 * the rule `computeThreeYearForecast` already follows for an omitted later year, and it is
 * followed here so the two cannot disagree.
 *
 * Node 14.15 safe, CommonJS, pure and side-effect free.
 */

/** The twelve months every forecast year carries. */
const MONTHS = 12

/**
 * A percentage the advisor typed, or `null` where they left it blank.
 *
 * Blank is a real answer here and must be told from zero: blank growth means "the same
 * again" while `0` means the same thing, but blank MARGIN inherits last year's margin
 * whereas `0` would forecast selling everything at cost.
 *
 * @param {number|string|null|undefined} v the raw field value.
 * @returns {number|null} the number, or null when the field is empty or unusable.
 */
function typedPct (v) {
  if (v === null || v === undefined || v === '') { return null }
  const n = typeof v === 'number' ? v : parseFloat(v)
  return (typeof n === 'number' && isFinite(n)) ? n : null
}

/**
 * Gross margin as a percentage of sales, from a mark-up on cost.
 *
 * The engine works in mark-up and the advisor thinks in margin (Mike's ruling of
 * 2026-09-07, question 1), so the conversion has one definition and lives here.
 *
 * @param {number} markupPct mark-up on cost, e.g. `68`.
 * @returns {number} gross margin, e.g. `40.476…`.
 */
function marginFromMarkup (markupPct) {
  const m = Number(markupPct) || 0
  if (m <= -100) { return 0 }
  return (m / (100 + m)) * 100
}

/**
 * The highest margin the grid accepts. 99% is not a business decision — it is the point at
 * which the mark-up conversion stops being meaningful, and a typed `100` is far more likely
 * to be a slip than an intention.
 */
const MAX_MARGIN_PCT = 99

/**
 * Mark-up on cost, from a gross margin percentage. The inverse of `marginFromMarkup`.
 *
 * ⚠ A margin of 100% has NO mark-up — it is selling at an infinite multiple of cost — so
 * anything at or above `MAX_MARGIN_PCT` is capped there rather than returned as `Infinity`.
 * An infinite mark-up would reach the engine and produce a forecast of nonsense that still
 * balanced, which is the shape of error nobody catches on screen.
 *
 * @param {number} marginPct gross margin, e.g. `41`.
 * @returns {number} mark-up on cost, e.g. `69.49…`.
 */
function markupFromMargin (marginPct) {
  const raw = Number(marginPct) || 0
  if (raw <= -100) { return 0 }
  const m = Math.min(raw, MAX_MARGIN_PCT)
  return (m / (100 - m)) * 100
}

/**
 * Sum an object's numeric values.
 *
 * @param {object} obj e.g. the 23 overhead lines.
 * @returns {number}
 */
function sumValues (obj) {
  const keys = Object.keys(obj || {})
  let total = 0
  for (let i = 0; i < keys.length; i++) { total += Number(obj[keys[i]]) || 0 }
  return total
}

/**
 * Sum an array's numeric values.
 *
 * @param {Array<number>} arr
 * @returns {number}
 */
function sumArray (arr) {
  let total = 0
  for (let i = 0; i < (arr || []).length; i++) { total += Number(arr[i]) || 0 }
  return total
}

/**
 * Grow three years out of one known year and nine percentages.
 *
 * Each year compounds on the one before it — year 1 on the base, year 2 on year 1, year 3
 * on year 2 — which is Mike's *"adds or subtracts from previous known data"* and matches
 * what `computeThreeYearForecast` already does with the balance sheet, where each year's
 * closing position opens the next.
 *
 * @param {object} base the year being grown FROM — last year's actuals, read from the file.
 *   `{ sales: number[12], markup: number (percent on cost), overheads: {key: number} }`.
 * @param {Array<object>} entries up to three `{ salesGrowth, grossMargin, overheadsIncrease }`,
 *   each field a percentage or blank. A blank growth or increase is **no change**; a blank
 *   margin **inherits the year before it**. Fewer than three entries yields fewer years.
 * @returns {Array<object>} one per entry, each
 *   `{ sales: number[12], markup, grossMargin, overheads, totals }` where `totals` is
 *   `{ sales, costOfSales, grossProfit, overheads, netProfit }`. `markup` is a percentage,
 *   in the same units `form.markup` holds, so a caller substitutes it directly.
 *
 *   ⚠ `totals.netProfit` is gross profit less overheads and **nothing else** — no interest,
 *   no depreciation, no tax. It is what the grid shows the advisor while they type; the
 *   forecast's own result comes from the engine and will differ. The screen says so.
 */
function quickFireYears (base, entries) {
  const rows = Array.isArray(entries) ? entries : []
  const baseSales = Array.isArray(base && base.sales) ? base.sales : []
  const out = []

  // What each year grows from. It starts as the known year and is replaced by each year in
  // turn, which is the whole of the compounding rule.
  let prevSales = []
  for (let m = 0; m < MONTHS; m++) { prevSales.push(Number(baseSales[m]) || 0) }
  let prevOverheads = Object.assign({}, base && base.overheads)
  let prevMargin = marginFromMarkup(base && base.markup)

  for (let y = 0; y < rows.length; y++) {
    const row = rows[y] || {}
    const growth = typedPct(row.salesGrowth)
    const margin = typedPct(row.grossMargin)
    const increase = typedPct(row.overheadsIncrease)

    // Blank is "the same again" — never zero, and never the sample workbook's figures.
    const salesFactor = 1 + ((growth === null ? 0 : growth) / 100)
    const overheadFactor = 1 + ((increase === null ? 0 : increase) / 100)
    const thisMargin = margin === null ? prevMargin : Math.min(margin, MAX_MARGIN_PCT)

    const sales = []
    for (let m = 0; m < MONTHS; m++) { sales.push(prevSales[m] * salesFactor) }

    const overheads = {}
    const keys = Object.keys(prevOverheads)
    for (let i = 0; i < keys.length; i++) {
      overheads[keys[i]] = (Number(prevOverheads[keys[i]]) || 0) * overheadFactor
    }

    const salesTotal = sumArray(sales)
    const grossProfit = salesTotal * (thisMargin / 100)
    const overheadTotal = sumValues(overheads)

    out.push({
      sales,
      markup: markupFromMargin(thisMargin),
      grossMargin: thisMargin,
      overheads,
      totals: {
        sales: salesTotal,
        costOfSales: salesTotal - grossProfit,
        grossProfit,
        overheads: overheadTotal,
        netProfit: grossProfit - overheadTotal
      }
    })

    prevSales = sales
    prevOverheads = overheads
    prevMargin = thisMargin
  }

  return out
}

module.exports = {
  quickFireYears,
  marginFromMarkup,
  markupFromMargin,
  MAX_MARGIN_PCT,
  MONTHS
}
