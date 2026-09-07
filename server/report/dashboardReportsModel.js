'use strict'

/**
 * Dashboard Reports model — the ratio hub behind the Business Performance Report (item 4.70,
 * stage 1). A faithful port of the *API Data* sheet of
 * `design/report-source-models/Dashboard Reports_.xlsx`, pinned cell by cell in
 * `tests/unit/dashboardReportsModel.test.js`.
 *
 * What the sheet is: fifteen account lines per period — twelve months across columns F..Q
 * and five years across T..X — and about seventeen ratios computed from them. The sixty
 * charts on the workbook's five dashboard sheets are those ratios drawn; the client's report
 * (design/features/business-performance-report.md) reads the ratios from here.
 *
 * 🔴 THE RATIOS KEEP THE WORKBOOK'S DEFINITIONS, ODD ONES INCLUDED, and that is deliberate.
 * Mike's ruling of 2026-09-07: the eight ratios Stats NZ publishes in its Business Performance
 * Benchmarker are exactly this sheet's yearly ratios, with this sheet's definitions, so a
 * report that "corrected" them could no longer be compared like for like. Hence:
 *   - `quickRatio` is (bank + debtors) / current liabilities — the sheet labels the SAME
 *     formula "Quick Ratio" in the monthly block (F53) and "Current Ratio" in the yearly
 *     block (T53). One formula, one name here; the page's label is the page's business.
 *   - `stockTurn` is trading income / current assets (T139), not cost of sales / stock.
 *   - `daysCover` counts debtors at `collectible` (D49, 0.8) before dividing by the day cost.
 *   - `returnOnEquity` on a MONTH divides one month's profit by total equity (F76), which is
 *     why the sample shows 60–140 percent a month. It is what the sheet does.
 *   - `totalAssets` follows F16 exactly: bank + current assets + fixed + non-current, and
 *     debtors are added only when the debtors line is NOT positive — the sheet treats
 *     "Current Assets" as already carrying them.
 *
 * ONE RECORDED DEVIATION. Every ratio the sheet wraps in IFERROR(…, 0) returns `null` here
 * when its denominator is zero or not a number, never 0. A zero ratio reads as a real figure
 * on a client's page; a null is left off it with the reason stated (report-models.md §1: a
 * wrong number is worse than a missing one). No cell in the workbook's sample hits that case,
 * so every pinned value is unaffected.
 *
 * NOT HERE: the seven cash drivers (sales growth, gross margin, expense %, the three
 * day-counts, net capex) — six are `server/report/trendModel.js` already and are read from
 * there; the Stats NZ comparison (stage 3); the inventory figures (stage 4).
 *
 * Pure, side-effect free, backend-only, CommonJS (Stack Constitution). Node 14.
 */

const { populationStandardDeviation } = require('./volatilityModel')

/** Debtors counted as collectible for Days Cover — sheet cell D49. */
const DEFAULT_COLLECTIBLE = 0.8

/** The fifteen account lines a period carries, in the sheet's row order. */
const LINES = [
  'bank', 'accountsReceivable', 'currentAssets', 'fixedAssets', 'nonCurrentAssets',
  'currentLiabilities', 'nonCurrentLiabilities',
  'ordinaryShares', 'currentYearEarnings', 'retainedEarnings',
  'tradingIncome', 'otherIncome', 'costOfSales', 'wages', 'operatingExpenses'
]

/** The health score's bands and their points — Mike's ruling, 2026-09-07. */
const BAND_POINTS = { green: 2, amber: 1, red: 0 }

/**
 * Coerce to a finite number; JSON-string numbers ("2") are accepted; anything else is 0,
 * which is what an empty cell is to the sheet.
 * @param {*} v @returns {number}
 */
function num (v) {
  if (typeof v === 'number') { return Number.isFinite(v) ? v : 0 }
  if (v === null || v === undefined || v === '') { return 0 }
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Divide, or return null. The sheet's IFERROR(…, 0) becomes null — see the header.
 * @param {number} a @param {number} b @returns {number|null}
 */
function ratio (a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) { return null }
  return a / b
}

/**
 * Normalise one period's inputs: every line a number, the label and date carried through.
 * @param {object} p
 * @returns {object}
 */
function normalisePeriod (p) {
  const src = p && typeof p === 'object' ? p : {}
  const out = { label: src.label || '', date: src.date || null }
  LINES.forEach((k) => { out[k] = num(src[k]) })
  if (src.daysInMonth !== undefined) { out.daysInMonth = num(src.daysInMonth) }
  return out
}

/**
 * Every figure and ratio the sheet computes for one period (a month or a year).
 *
 * Cell references are the MONTHLY block's column F unless marked; the yearly block (column T)
 * uses the same formulas at the rows named in the test.
 *
 * @param {object} period - the fifteen lines, plus `daysInMonth` for a month
 * @param {object} [opts]
 * @param {number} [opts.collectible] - debtors counted for Days Cover; default D49 = 0.8
 * @returns {object}
 */
function computePeriodRatios (period, opts) {
  const p = normalisePeriod(period)
  const collectible = opts && Number.isFinite(opts.collectible) ? opts.collectible : DEFAULT_COLLECTIBLE

  // F16: if AR > 0 then bank + CA + FA + NCA, else the plain sum including AR.
  const totalAssets = p.accountsReceivable > 0
    ? p.bank + p.currentAssets + p.fixedAssets + p.nonCurrentAssets
    : p.bank + p.accountsReceivable + p.currentAssets + p.fixedAssets + p.nonCurrentAssets
  const totalLiabilities = p.currentLiabilities + p.nonCurrentLiabilities // F22
  const netAssets = totalAssets - totalLiabilities // F24
  const totalEquity = p.ordinaryShares + p.currentYearEarnings + p.retainedEarnings // F29
  const totalIncome = p.tradingIncome + p.otherIncome // F33
  const grossProfit = p.tradingIncome - p.costOfSales // F39
  const netProfit = grossProfit + p.otherIncome - p.operatingExpenses // F43
  const overheads = p.wages + p.operatingExpenses // F52
  const totalDebt = totalLiabilities // F67 = CL + NCL
  const workingCapital = (p.bank + p.currentAssets) - p.currentLiabilities // F92
  const fixedCapital = (p.fixedAssets + p.nonCurrentAssets) - p.nonCurrentLiabilities // F93
  const totalSalesCosts = p.costOfSales + p.wages // F113

  const dayCost = p.daysInMonth > 0 ? overheads / p.daysInMonth : null // F54
  const daysCover = dayCost === null
    ? null
    : ratio(p.bank + (p.accountsReceivable * collectible) - p.currentLiabilities, dayCost) // F55

  return {
    label: p.label,
    date: p.date,
    lines: LINES.reduce((acc, k) => { acc[k] = p[k]; return acc }, {}),
    totalAssets,
    totalLiabilities,
    netAssets,
    totalEquity,
    totalIncome,
    grossProfit,
    netProfit,
    overheads,
    totalDebt,
    workingCapital,
    fixedCapital,
    totalSalesCosts,
    equityAfterDebt: totalEquity - totalDebt, // F68 (the sheet's "Equity" row under Total Debt)
    quickRatio: ratio(p.bank + p.accountsReceivable, p.currentLiabilities), // F53 / T53
    debtPercentageOfLiquid: ratio(p.currentLiabilities, p.bank + p.currentAssets), // T52
    dayCost,
    daysCover,
    grossProfitPct: ratio(grossProfit, p.tradingIncome), // F61 / T61 / T153
    debtToEquity: ratio(totalDebt, totalEquity), // F70
    returnOnEquity: ratio(netProfit, totalEquity), // F76
    wagesToSales: ratio(p.wages, p.tradingIncome), // F82
    netProfitPct: ratio(netProfit, p.tradingIncome), // F88
    workingToFixed: ratio(workingCapital, fixedCapital), // F94
    debtRatio: ratio(totalLiabilities, totalAssets), // F101
    averageMarkup: ratio(grossProfit, p.costOfSales), // F107
    returnOnTotalAssets: ratio(netProfit, totalAssets), // F156 / T146
    stockTurn: ratio(p.tradingIncome, p.currentAssets), // T139
    liabilityStructure: ratio(totalEquity, totalEquity + totalLiabilities) // T159
  }
}

/**
 * The sheet's quarterly comparison (rows 125–128): twelve months summed in threes, each
 * quarter labelled by its LAST month (F125 = H8).
 *
 * @param {object[]} months - twelve (or any multiple of three) monthly periods, oldest first
 * @returns {Array<{label:string, date:*, sales:number, grossProfit:number, netProfit:number}>}
 */
function computeQuarterlyComparison (months) {
  const ms = (months || []).map(normalisePeriod)
  const out = []
  for (let i = 0; i + 2 < ms.length; i += 3) {
    const trio = ms.slice(i, i + 3)
    const sum = fn => trio.reduce((t, m) => t + fn(m), 0)
    out.push({
      label: trio[2].label,
      date: trio[2].date,
      sales: sum(m => m.tradingIncome), // F126
      grossProfit: sum(m => m.tradingIncome - m.costOfSales), // F127
      netProfit: sum(m => (m.tradingIncome - m.costOfSales) + m.otherIncome - m.operatingExpenses) // F128
    })
  }
  return out
}

/**
 * The sheet's "Volatility With Wages" block (rows 133–139): the mean of monthly sales and
 * one population standard deviation either side. The sheet counts a month only when its
 * sales exceed 1 (COUNTIF > 1, D133) and it divides the full total by that count (F135).
 *
 * @param {object[]} months
 * @returns {{count:number, total:number, average:number|null, deviation:number|null, upper:number|null, lower:number|null, salesCosts:number[], totalCosts:number[]}}
 */
function computeSalesVolatility (months) {
  const ms = (months || []).map(normalisePeriod)
  const sales = ms.map(m => m.tradingIncome)
  const counted = sales.filter(s => s > 1)
  const count = counted.length // D133
  const total = sales.reduce((t, s) => t + s, 0) // D135
  const average = count > 0 ? total / count : null // F135
  const deviation = sales.length > 0 ? populationStandardDeviation(sales, total / sales.length) : null // E139
  return {
    count,
    total,
    average,
    deviation,
    upper: average === null || deviation === null ? null : average + deviation, // F136
    lower: average === null || deviation === null ? null : average - deviation, // F137
    salesCosts: ms.map(m => m.costOfSales + m.wages), // F134
    totalCosts: ms.map(m => m.costOfSales + m.wages + m.operatingExpenses) // F145
  }
}

/**
 * The sheet's "12mth Cash Movement Summary" (rows 121–132, yearly block): a waterfall from
 * revenue to net cash flow between two year-end positions.
 *
 * Signs are the sheet's own. A fall in debtors or a rise in creditors adds cash; the reverse
 * subtracts. Note two things a reader must know: the sheet's "Drawings & Tax" line is the
 * WAGES figure (W127 = T37), and "Change in Fixed Assets" is current minus prior (W128).
 *
 * @param {object} current - this year's lines (column T)
 * @param {object} prior - last year's lines (column U)
 * @returns {object} every step, in order
 */
function computeCashMovementSummary (current, prior) {
  const c = normalisePeriod(current)
  const p = normalisePeriod(prior)
  const revenue = c.tradingIncome // U121
  const afterOperatingExpenses = revenue - c.operatingExpenses // X122
  const afterOtherIncome = afterOperatingExpenses + c.otherIncome // X123
  const changeInReceivables = p.accountsReceivable - c.accountsReceivable // V124
  const afterReceivables = afterOtherIncome + changeInReceivables // X124
  const changeInCurrentLiabilities = p.currentLiabilities - c.currentLiabilities // W125
  const operatingCashFlow = afterReceivables - changeInCurrentLiabilities // X125 / U126
  const drawingsAndTax = c.wages // W127 (the sheet's own choice)
  const afterDrawingsAndTax = operatingCashFlow - drawingsAndTax // X127
  const changeInFixedAssets = c.fixedAssets - p.fixedAssets // W128
  const freeCashFlow = afterDrawingsAndTax - changeInFixedAssets // X128 / U129
  const changeInNonCurrentLiabilities = p.nonCurrentLiabilities - c.nonCurrentLiabilities // W130
  const netCashFlow = freeCashFlow - changeInNonCurrentLiabilities // U131
  return {
    revenue,
    operatingExpenses: c.operatingExpenses,
    afterOperatingExpenses,
    otherIncome: c.otherIncome,
    afterOtherIncome,
    changeInReceivables,
    afterReceivables,
    changeInCurrentLiabilities,
    operatingCashFlow,
    drawingsAndTax,
    afterDrawingsAndTax,
    changeInFixedAssets,
    freeCashFlow,
    changeInNonCurrentLiabilities,
    netCashFlow,
    closingBank: c.bank // U132
  }
}

/**
 * The Business Health Score — Mike's ruling of 2026-09-07, following the Piotroski F-score's
 * shape: a count, not a formula. Each measure scores 2 in green, 1 in amber, 0 in red against
 * the firm's own thresholds; the score is the points won as a share of the points available,
 * out of 100, rounded to a whole number.
 *
 * The bands themselves are decided elsewhere (the trend read's thresholds); this only counts.
 * An unknown band is refused rather than scored as 0, because a typo would otherwise read as
 * "red" on a client's page.
 *
 * @param {string[]} bands - one of 'green' | 'amber' | 'red' per measure
 * @returns {{score:number|null, green:number, amber:number, red:number, total:number}}
 */
function healthScore (bands) {
  const list = Array.isArray(bands) ? bands : []
  const counts = { green: 0, amber: 0, red: 0 }
  let points = 0
  list.forEach((b) => {
    if (!Object.prototype.hasOwnProperty.call(BAND_POINTS, b)) {
      throw new TypeError('healthScore: unknown band "' + b + '"')
    }
    counts[b] += 1
    points += BAND_POINTS[b]
  })
  const total = list.length
  return {
    score: total === 0 ? null : Math.round((points / (2 * total)) * 100),
    green: counts.green,
    amber: counts.amber,
    red: counts.red,
    total
  }
}

/**
 * The whole hub for a set of inputs: every yearly and monthly period with its ratios, the
 * quarterly comparison, the sales volatility band, and the cash movement between the two
 * most recent years.
 *
 * @param {object} [inputs] - `{ yearly: object[], monthly: object[], collectible?: number }`;
 *   yearly is newest first as the sheet lays it out (T = this year, U = last); monthly is
 *   oldest first. Defaults to the workbook's own sample.
 * @returns {{yearly:object[], monthly:object[], quarterly:object[], volatility:object, cashMovement:object|null}}
 */
function computeDashboardReports (inputs) {
  const src = inputs && typeof inputs === 'object' ? inputs : DEFAULT_INPUTS
  const opts = { collectible: Number.isFinite(src.collectible) ? src.collectible : DEFAULT_COLLECTIBLE }
  const yearly = (Array.isArray(src.yearly) ? src.yearly : []).map(p => computePeriodRatios(p, opts))
  const monthly = (Array.isArray(src.monthly) ? src.monthly : []).map(p => computePeriodRatios(p, opts))
  return {
    yearly,
    monthly,
    quarterly: computeQuarterlyComparison(src.monthly),
    volatility: computeSalesVolatility(src.monthly),
    cashMovement: src.yearly && src.yearly.length >= 2
      ? computeCashMovementSummary(src.yearly[0], src.yearly[1])
      : null
  }
}

/**
 * Builds a list of periods from per-line arrays, so the sample below reads like the sheet.
 * @param {string[]} labels @param {*[]} dates @param {Object<string, number[]>} cols @param {number[]} [days]
 * @returns {object[]}
 */
function periods (labels, dates, cols, days) {
  return labels.map((label, i) => {
    const p = { label, date: dates[i] }
    LINES.forEach((k) => { p[k] = cols[k] ? cols[k][i] : 0 })
    if (days) { p.daysInMonth = days[i] }
    return p
  })
}

/**
 * The workbook's own sample figures — sheet *API Data*, yearly T..X (newest first) and
 * monthly F..Q (oldest first). Every number is a cell value, not an invention.
 */
const DEFAULT_INPUTS = {
  collectible: DEFAULT_COLLECTIBLE,
  yearly: periods(
    ['Mar 2021', 'Mar 2020', 'Mar 2019', 'Mar 2018', 'Mar 2017'],
    ['2021-03-01', '2020-03-01', '2019-03-01', '2018-03-01', '2017-03-01'],
    {
      bank: [3500, 5632, 4578, 3214, 5632],
      accountsReceivable: [1250, 1452, 1645, 1345, 1548],
      currentAssets: [4567, 6548, 8596, 5847, 6598],
      fixedAssets: [81623, 78632, 75000, 72500, 70123],
      nonCurrentAssets: [75456, 62514, 58963, 45789, 41523],
      currentLiabilities: [3245, 5412, 6958, 4896, 5263],
      nonCurrentLiabilities: [50124, 55658, 59623, 61234, 62500],
      ordinaryShares: [50000, 50000, 50000, 50000, 50000],
      currentYearEarnings: [36000, 36000, 36000, 36000, 36000],
      retainedEarnings: [61777, 42256, 30556, 11220, 6113],
      tradingIncome: [78564, 68974, 82456, 75412, 45698],
      otherIncome: [3000, 3000, 3000, 3000, 3000],
      costOfSales: [27020, 13135, 23798, 23975, 7691],
      wages: [12500, 12000, 11000, 9500, 8500],
      operatingExpenses: [9170, 11185, 1869, 414, 944]
    }
  ),
  monthly: periods(
    ['Mar 2020', 'Apr 2020', 'May 2020', 'Jun 2020', 'Jul 2020', 'Aug 2020', 'Sep 2020', 'Oct 2020', 'Nov 2020', 'Dec 2020', 'Jan 2021', 'Feb 2021'],
    ['2020-03-01', '2020-04-01', '2020-05-01', '2020-06-01', '2020-07-01', '2020-08-01', '2020-09-01', '2020-10-01', '2020-11-01', '2020-12-01', '2021-01-01', '2021-02-01'],
    {
      bank: [3500, 5632, 4578, 3214, 5632, 3500, 5632, 4578, 3214, 5632, 4578, 6598],
      accountsReceivable: [154250, 17985, 16547, 18569, 17589, 16325, 19654, 18457, 17569, 15789, 14589, 12457],
      currentAssets: [4567, 6548, 8596, 5847, 6598, 4567, 6548, 8596, 5847, 6598, 4578, 3265],
      fixedAssets: [81623, 78632, 75000, 72500, 70123, 81623, 78632, 75000, 72500, 70123, 70125, 82541],
      nonCurrentAssets: [75456, 62514, 58963, 45789, 41523, 75456, 62514, 58963, 45789, 41523, 38569, 45652],
      currentLiabilities: [3245, 5412, 6958, 4896, 5263, 3245, 5412, 6958, 4896, 5263, 3245, 5412],
      nonCurrentLiabilities: [50124, 55658, 59623, 61234, 62500, 50124, 55658, 59623, 61234, 62500, 50124, 55658],
      ordinaryShares: [50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000],
      currentYearEarnings: [3450, 3450, 3450, 3450, 3450, 3450, 3450, 3450, 3450, 3450, 3450, 3450],
      retainedEarnings: [5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000],
      tradingIncome: [45781, 65981, 58691, 74851, 65981, 84951, 75861, 95841, 84621, 75961, 36571, 85741],
      otherIncome: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      costOfSales: [2031, 2724, 2184, 2338, 2446, 3133, 2345, 3052, 2221, 3007, 2401, 3087],
      wages: [1250, 1250, 1250, 1750, 1250, 2250, 1250, 1250, 1050, 1250, 950, 1250],
      operatingExpenses: [8500, 8500, 8500, 8500, 8500, 8500, 8500, 8500, 8500, 8500, 8500, 8500]
    },
    [31, 30, 31, 30, 31, 31, 30, 31, 30, 31, 31, 28]
  )
}

module.exports = {
  LINES,
  DEFAULT_COLLECTIBLE,
  DEFAULT_INPUTS,
  BAND_POINTS,
  computePeriodRatios,
  computeQuarterlyComparison,
  computeSalesVolatility,
  computeCashMovementSummary,
  healthScore,
  computeDashboardReports
}
