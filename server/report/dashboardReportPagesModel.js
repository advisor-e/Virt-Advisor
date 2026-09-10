'use strict'

/**
 * Dashboard Report pages model — every figure the Business Performance Report's pages
 * print, computed once from the confirmed table (item 4.70, stage 2). The drawing is
 * `design/mockups/business-performance-report.html`; the rules are
 * `design/features/business-performance-report.md`.
 *
 * It composes three things that already exist and adds no arithmetic of its own where one
 * of them has it: the ratio hub (`dashboardReportsModel`, the workbook's *API Data* sheet,
 * definitions and quirks included), the two-year trend read (`trendModel`, the six cash
 * drivers banded on the firm's own thresholds) and the health score count.
 *
 * 🔴 EQUITY IS ASSETS LESS LIABILITIES. The confirm table carries no equity line: the
 * balance-sheet identity gives it, so a balance sheet that ties in Xero ties here. It is fed
 * to the hub as `ordinaryShares` so every equity ratio the sheet computes uses it.
 *
 * 🔴 THE HEALTH SCORE COUNTS THE MEASURES THAT HAVE A THRESHOLD, AND SAYS HOW MANY.
 * Mike ruled eight banded measures (2026-09-07). The six trend drivers carry the firm's
 * thresholds today; current ratio and debt-to-equity carry none, and a threshold nobody
 * ruled is a verdict nobody asked for. So the score is out of the measures that are banded,
 * `score.total` says how many, and the page prints that number. Two more thresholds make
 * it eight with no change here.
 *
 * ⚠ THE BAND WORDS' CUT-OFFS ARE PROVISIONAL. "Good", "Steady" and "At risk" are Mike's
 * words (ruled 2026-09-08); where one turns into the next is not yet ruled. `SCORE_BANDS`
 * below is the working assumption, in one place, for him to move.
 *
 * Pure, backend-only, CommonJS. Node 14.
 */

const { computePeriodRatios, computeQuarterlyComparison, healthScore } = require('./dashboardReportsModel')
const { computeTrend, MEASURES, SCORE_MEASURES } = require('./trendModel')
const { computeProfitBridge } = require('./profitBridgeModel')
const { computeCashBridge } = require('./cashBridgeModel')
const { computeProfitSensitivity } = require('./profitSensitivityModel')
const { computeStockVsAccounts } = require('./stockVsAccountsModel')
const { computeVolatility } = require('./volatilityModel')
const { LINES, dateKey } = require('./intake/dashboardReportsAssembler')

/** Twelve complete months, the Sales Volatility page's shortest window. */
const VOLATILITY_MONTHS = 12
/** Days in a year, as the trend model counts debtor days. */
const DAYS_IN_YEAR = 365

/** Score at or above which each word applies, highest first. PROVISIONAL — see the header. */
const SCORE_BANDS = [
  { band: 'good', from: 75 },
  { band: 'steady', from: 50 },
  { band: 'atRisk', from: 0 }
]

/** Trend band → health-score band, the two vocabularies the models already use. */
const TREND_TO_SCORE = { good: 'green', warn: 'amber', crit: 'red' }

/**
 * The seven cash drivers in the Cash Drivers material's order, with the direction rule
 * each carries: what an INCREASE does to cash. The six trend measures are read from the
 * trend model; net capital spend is the seventh.
 */
const DRIVERS = [
  { key: 'salesGrowth', increaseUses: true },
  { key: 'grossMargin', increaseUses: false },
  { key: 'overheadRatio', increaseUses: true },
  { key: 'debtorDays', increaseUses: true },
  { key: 'stockDays', increaseUses: true },
  { key: 'creditorDays', increaseUses: false }
]

/** Coerce to a finite number or 0. @param {*} v @returns {number} */
function num (v) {
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

/** A confirmed line's value, or 0. @param {object} lines @param {string} key */
function line (lines, key) {
  const l = lines && lines[key]
  if (l && typeof l === 'object') { return num(l.value) }
  return num(l)
}

/** Whether a line was confirmed at all. @param {object} lines @param {string} key */
function has (lines, key) {
  const l = lines && lines[key]
  if (l === null || l === undefined) { return false }
  if (typeof l === 'object') { return l.value !== null && l.value !== undefined && l.value !== '' }
  return l !== ''
}

/** @param {number|null} a @param {number|null} b @returns {number|null} a ÷ b, or null */
function ratio (a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) { return null }
  return a / b
}

/** @param {number|null} cur @param {number|null} prior @returns {number|null} change as a fraction of prior */
function pctChange (cur, prior) {
  if (!Number.isFinite(cur) || !Number.isFinite(prior) || prior === 0) { return null }
  return (cur - prior) / Math.abs(prior)
}

/** @param {number|null} cur @param {number|null} prior @returns {number|null} */
function diff (cur, prior) {
  if (!Number.isFinite(cur) || !Number.isFinite(prior)) { return null }
  return cur - prior
}

/**
 * One year's confirmed lines as the ratio hub's fifteen, with equity derived.
 * @param {object} lines
 * @param {string} [label]
 * @returns {object}
 */
function toSheet (lines, label) {
  const bank = line(lines, 'bank')
  const ar = line(lines, 'accountsReceivable')
  const currentAssets = ar + line(lines, 'stock') + line(lines, 'otherCurrentAssets')
  const fixedAssets = line(lines, 'fixedAssets')
  const cl = line(lines, 'currentLiabilities')
  const ncl = line(lines, 'nonCurrentLiabilities')
  const equity = (bank + currentAssets + fixedAssets) - (cl + ncl)
  return {
    label: label || '',
    bank,
    accountsReceivable: ar,
    currentAssets,
    fixedAssets,
    nonCurrentAssets: 0,
    currentLiabilities: cl,
    nonCurrentLiabilities: ncl,
    ordinaryShares: equity,
    currentYearEarnings: 0,
    retainedEarnings: 0,
    tradingIncome: line(lines, 'tradingIncome'),
    otherIncome: line(lines, 'otherIncome'),
    costOfSales: line(lines, 'costOfSales'),
    wages: line(lines, 'wages'),
    // The sheet's expense line is everything below gross profit; the table splits it four ways.
    operatingExpenses: line(lines, 'wages') + line(lines, 'operatingExpenses') + line(lines, 'depreciation') + line(lines, 'interestPaid')
  }
}

/**
 * The profit-and-loss page's rows for one year.
 * @param {object} lines @param {object} hub
 */
function profitLossOf (lines, hub) {
  const revenue = line(lines, 'tradingIncome')
  const operating = line(lines, 'wages') + line(lines, 'operatingExpenses')
  const below = line(lines, 'depreciation') + line(lines, 'interestPaid')
  const ebitda = hub.grossProfit + line(lines, 'otherIncome') - operating
  return {
    revenue,
    otherIncome: line(lines, 'otherIncome'),
    costOfSales: line(lines, 'costOfSales'),
    grossProfit: hub.grossProfit,
    grossMarginPct: hub.grossProfitPct,
    operatingExpenses: operating,
    operatingExpensesPct: ratio(operating, revenue),
    ebitda,
    ebitdaPct: ratio(ebitda, revenue),
    interestAndDepreciation: below,
    interestAndDepreciationPct: ratio(below, revenue),
    netProfit: hub.netProfit,
    netMarginPct: hub.netProfitPct
  }
}

/**
 * The balance-sheet page's figures for one year.
 * @param {object} lines @param {object} hub
 */
function balanceSheetOf (lines, hub) {
  const currentAssets = line(lines, 'bank') + hub.lines.currentAssets
  return {
    bank: line(lines, 'bank'),
    accountsReceivable: line(lines, 'accountsReceivable'),
    stock: line(lines, 'stock'),
    currentAssets,
    nonCurrentAssets: line(lines, 'fixedAssets'),
    totalAssets: hub.totalAssets,
    currentLiabilities: line(lines, 'currentLiabilities'),
    nonCurrentLiabilities: line(lines, 'nonCurrentLiabilities'),
    totalLiabilities: hub.totalLiabilities,
    equity: hub.netAssets,
    currentRatio: ratio(currentAssets, line(lines, 'currentLiabilities')),
    quickRatio: hub.quickRatio,
    debtToEquity: hub.debtToEquity,
    workingCapital: hub.workingCapital
  }
}

/**
 * The trend model's inputs for one year — the six drivers' raw figures, plus the two
 * score ratios' inputs taken from the balance-sheet page's own figures so the score and
 * the page agree by construction.
 * @param {object} lines @param {string|null} reportDate
 * @param {object} sheet - `balanceSheetOf(lines, hub)` for the same year
 */
function trendYear (lines, reportDate, sheet) {
  const opt = key => (has(lines, key) ? line(lines, key) : undefined)
  return {
    reportDate: reportDate || null,
    currentAssets: sheet.currentAssets,
    currentLiabilities: sheet.currentLiabilities,
    totalDebt: sheet.totalLiabilities,
    totalEquity: sheet.equity,
    sales: opt('tradingIncome'),
    costOfSales: opt('costOfSales'),
    operatingExpenses: has(lines, 'operatingExpenses')
      ? line(lines, 'wages') + line(lines, 'operatingExpenses') + line(lines, 'depreciation') + line(lines, 'interestPaid')
      : undefined,
    accountsReceivable: opt('accountsReceivable'),
    inventory: opt('stock'),
    accountsPayable: opt('accountsPayable')
  }
}

/**
 * A year's lines as plain numbers. A line the year does not carry is left OUT rather than
 * passed as 0, so a model can refuse and name it (P3: never a zero standing in for a figure
 * nobody supplied).
 * @param {object} lines
 * @returns {Object<string, number>}
 */
function plainLinesOf (lines) {
  return LINES.reduce((o, k) => { if (has(lines, k)) { o[k] = line(lines, k) } return o }, {})
}

/**
 * The word for a score. @param {number|null} score @returns {string|null}
 */
function scoreBand (score) {
  if (!Number.isFinite(score)) { return null }
  const hit = SCORE_BANDS.find(b => score >= b.from)
  return hit ? hit.band : 'atRisk'
}

/**
 * The calendar ordinal (year × 12 + month index) of a report's own period end, or null.
 * "For the year ended 30 June 2026" → 2026 × 12 + 5.
 * @param {string|null} reportDate
 * @returns {number|null}
 */
function endOrdinalOf (reportDate) {
  const key = dateKey(reportDate)
  if (key === null) { return null }
  const year = Math.floor(key / 10000)
  const month = Math.floor((key % 10000) / 100)
  return year * 12 + (month - 1)
}

/**
 * The monthly view (stage 5): the quarters for pages 4 and 5, the closing-bank line for
 * page 7, and the Sales Volatility page's twelve months — each drawn only from complete
 * months, and each saying when it cannot be drawn.
 *
 * WHICH TWELVE MONTHS ARE THIS YEAR is decided by this year's Profit and Loss's own period
 * line: the twelve calendar months ending on it. Where no date can be read, the last
 * twelve months in the series stand in. A quarter is drawn only when all three of its
 * months were read and complete — a quarter summed over an empty month is a plausible,
 * wrong bar. The volatility page takes the last twelve complete consecutive months in the
 * whole series (two files may span two years), exactly as the Volatility Report does.
 *
 * @param {object|null} monthly - `{ profitLoss: { months }, bank: { months } }` per `assembleDashboardMonthly`, or null
 * @param {number|null} yearEnd - the ordinal of this year's last month, or null
 * @returns {{available:boolean, yearEnd:(number|null), quarters:object, bank:object, salesVolatility:object}}
 */
function monthlyView (monthly, yearEnd) {
  const src = monthly && typeof monthly === 'object' ? monthly : {}
  const plMonths = src.profitLoss && Array.isArray(src.profitLoss.months) ? src.profitLoss.months.filter(m => m && Number.isFinite(m.ordinal)) : []
  const bankMonths = src.bank && Array.isArray(src.bank.months) ? src.bank.months.filter(m => m && Number.isFinite(m.ordinal)) : []
  const lastOrdinal = list => (list.length ? Math.max.apply(null, list.map(m => m.ordinal)) : null)
  const end = Number.isFinite(yearEnd) ? yearEnd : (lastOrdinal(plMonths) !== null ? lastOrdinal(plMonths) : lastOrdinal(bankMonths))
  const isComplete = m => m.complete !== false

  /* -- the four quarters, each labelled by its last month as the workbook labels them -- */
  const quarters = []
  let completeQuarters = 0
  if (end !== null) {
    const byOrdinal = new Map(plMonths.map(m => [m.ordinal, m]))
    for (let q = 0; q < 4; q++) {
      const first = end - 11 + q * 3
      const trio = [first, first + 1, first + 2].map(o => byOrdinal.get(o) || null)
      const complete = trio.every(m => m && isComplete(m))
      if (complete) {
        completeQuarters += 1
        const [sum] = computeQuarterlyComparison(trio.map(m => ({
          label: m.label, date: null, tradingIncome: m.sales, costOfSales: m.costOfSales, otherIncome: m.otherIncome, operatingExpenses: m.operatingExpenses
        })))
        quarters.push({
          index: q + 1,
          endLabel: trio[2].label,
          complete: true,
          sales: sum.sales,
          expenses: trio.reduce((t, m) => t + num(m.costOfSales) + num(m.operatingExpenses), 0),
          grossProfit: sum.grossProfit,
          netProfit: sum.netProfit
        })
      } else {
        quarters.push({ index: q + 1, endLabel: trio[2] ? trio[2].label : null, complete: false, sales: null, expenses: null, grossProfit: null, netProfit: null })
      }
    }
  }

  /* -- the closing bank balance at each month end of this year ---------------------- */
  const bankYear = end === null ? [] : bankMonths.filter(m => m.ordinal > end - 12 && m.ordinal <= end).sort((a, b) => a.ordinal - b.ordinal)
  const bankPoints = bankYear.map(m => ({ label: m.label, value: isComplete(m) && Number.isFinite(m.bank) ? m.bank : null, complete: isComplete(m) && Number.isFinite(m.bank) }))
  const bankKnown = bankPoints.filter(p => p.complete)
  let lowest = null
  bankKnown.forEach((p) => { if (lowest === null || p.value < lowest.value) { lowest = { label: p.label, value: p.value } } })

  /* -- the Sales Volatility page: the last twelve complete consecutive months ---------- */
  // Runs of complete, consecutive months. Trailing incomplete months (the cut-off month and
  // the empties after it) simply end the last run, so the window slides back over the file
  // exactly as the Volatility Report's assembler slides it; an incomplete month INSIDE the
  // series splits the runs, and the latest run is taken — a window is never spliced across
  // a month that was not read.
  const sorted = plMonths.slice().sort((a, b) => a.ordinal - b.ordinal)
  const runs = []
  let run = []
  sorted.forEach((m) => {
    if (!isComplete(m) || (run.length && m.ordinal !== run[run.length - 1].ordinal + 1)) {
      if (run.length) { runs.push(run) }
      run = []
    }
    if (isComplete(m)) { run.push(m) }
  })
  if (run.length) { runs.push(run) }
  const lastRun = runs.length ? runs[runs.length - 1] : []
  const window = lastRun.slice(-VOLATILITY_MONTHS)
  let salesVolatility
  if (window.length >= VOLATILITY_MONTHS) {
    const vol = computeVolatility({ sales: window.map(m => m.sales), window: VOLATILITY_MONTHS })
    const band1 = vol.bands[0]
    salesVolatility = {
      available: true,
      blocked: null,
      from: window[0].label,
      to: window[window.length - 1].label,
      total: vol.total,
      average: vol.average,
      standardDeviation: vol.standardDeviation,
      lower: band1.lower,
      upper: band1.upper,
      floored: band1.floored,
      score: vol.score,
      scoreBand: vol.scoreBand,
      insideFirstBand: vol.insideFirstBand,
      monthsUsed: vol.monthsUsed,
      highest: vol.highest ? { label: window[vol.highest.index].label, value: vol.highest.value } : null,
      lowest: vol.lowest ? { label: window[vol.lowest.index].label, value: vol.lowest.value } : null,
      months: vol.months.map((m, i) => ({ label: window[i].label, value: m.value, deviation: m.deviation, outside: m.outside, above: m.outside && m.deviation > 0 }))
    }
  } else {
    salesVolatility = { available: false, blocked: plMonths.length ? 'NEEDS_TWELVE_MONTHS' : 'NO_MONTHLY_FILE', monthsComplete: window.length }
  }

  return {
    available: plMonths.length > 0 || bankMonths.length > 0,
    yearEnd: end,
    quarters: { available: completeQuarters > 0, completeCount: completeQuarters, rows: quarters },
    bank: { available: bankKnown.length >= 2, points: bankPoints, lowest, latest: bankKnown.length ? bankKnown[bankKnown.length - 1] : null },
    salesVolatility
  }
}

/**
 * Every figure the pages print.
 *
 * @param {object} inputs
 * @param {object} inputs.current - this year's confirmed lines, `{ key: { value, source } }` or `{ key: value }`
 * @param {object} [inputs.prior] - last year's, or null
 * @param {{balanceSheet: (string|null), profitLoss: (string|null)}} [inputs.currentDates]
 * @param {{balanceSheet: (string|null), profitLoss: (string|null)}} [inputs.priorDates]
 * @param {{slowObsolete: (number|null), ageing: (Array<number|null>|null), stockFile: (object|null)}} [inputs.inventory] - the typed inventory figures, and the read stock export (stage 4) or null
 * @param {object} [inputs.earlier] - the year before last's lines (stage 5), for the trend table's third column, or null
 * @param {object} [inputs.monthly] - the by-month series (stage 5) per `assembleDashboardMonthly`, or null
 * @param {object} [inputs.thresholds] - the firm's resolved trend thresholds `{ levels, movements }`
 * @returns {object}
 */
function computeReportPages (inputs) {
  const src = inputs && typeof inputs === 'object' ? inputs : {}
  const cur = src.current && typeof src.current === 'object' ? src.current : {}
  const pri = src.prior && typeof src.prior === 'object' ? src.prior : null
  const ear = src.earlier && typeof src.earlier === 'object' && Object.keys(src.earlier).length ? src.earlier : null
  const curDates = src.currentDates || {}
  const priDates = src.priorDates || {}

  const hubCur = computePeriodRatios(toSheet(cur, 'current'))
  const hubPri = pri ? computePeriodRatios(toSheet(pri, 'prior')) : null
  const hubEar = ear ? computePeriodRatios(toSheet(ear, 'earlier')) : null
  const bsCur = balanceSheetOf(cur, hubCur)
  const bsPri = hubPri ? balanceSheetOf(pri, hubPri) : null

  /* -- the trend read: six drivers and two score ratios, banded on the firm's thresholds -- */
  const thresholds = src.thresholds && typeof src.thresholds === 'object' ? src.thresholds : { levels: {}, movements: {} }
  const trend = pri
    ? computeTrend({
      current: trendYear(cur, curDates.profitLoss || curDates.balanceSheet, bsCur),
      prior: trendYear(pri, priDates.profitLoss || priDates.balanceSheet, bsPri),
      thresholds,
      measures: MEASURES.concat(SCORE_MEASURES)
    })
    : { available: false, blocked: 'NO_PRIOR_YEAR', needsBalanceSheet: false, periodsCertain: true, measures: [], omitted: [], counts: { good: 0, warn: 0, crit: 0, unbanded: 0 } }
  const measureByKey = {}
  ;(trend.measures || []).forEach((m) => { measureByKey[m.key] = m })
  const measure = key => measureByKey[key] || null
  const measureValue = key => (measure(key) && Number.isFinite(measure(key).current) ? measure(key).current : null)
  const measurePrior = key => (measure(key) && Number.isFinite(measure(key).prior) ? measure(key).prior : null)

  /* -- the seven cash drivers ------------------------------------------------------ */
  const netCapitalSpend = has(cur, 'netCapitalSpend') ? line(cur, 'netCapitalSpend') : null
  const drivers = DRIVERS.map((d) => {
    const m = measure(d.key)
    const movement = m && Number.isFinite(m.movement) ? m.movement : null
    let direction = null
    if (movement !== null && movement !== 0) { direction = (movement > 0) === d.increaseUses ? 'uses' : 'releases' }
    return {
      key: d.key,
      unit: m ? m.unit : null,
      value: m && Number.isFinite(m.current) ? m.current : null,
      prior: m && Number.isFinite(m.prior) ? m.prior : null,
      movement,
      band: m ? m.band : null,
      direction
    }
  })
  drivers.push({
    key: 'netCapitalSpend',
    unit: 'money',
    value: netCapitalSpend,
    prior: pri && has(pri, 'netCapitalSpend') ? line(pri, 'netCapitalSpend') : null,
    movement: null,
    band: null,
    direction: netCapitalSpend === null || netCapitalSpend === 0 ? null : (netCapitalSpend > 0 ? 'uses' : 'releases')
  })

  /* -- the health score ----------------------------------------------------------- */
  const banded = (trend.measures || []).filter(m => m.band && TREND_TO_SCORE[m.band])
  const counted = healthScore(banded.map(m => TREND_TO_SCORE[m.band]))
  const score = {
    score: counted.score,
    band: scoreBand(counted.score),
    green: counted.green,
    amber: counted.amber,
    red: counted.red,
    total: counted.total,
    measures: banded.map(m => ({ key: m.key, band: TREND_TO_SCORE[m.band] })),
    pulledDown: banded.filter(m => m.band !== 'good').map(m => m.key)
  }

  /* -- the cash cycle --------------------------------------------------------------- */
  const stockDays = measureValue('stockDays')
  const debtorDays = measureValue('debtorDays')
  const creditorDays = measureValue('creditorDays')
  const cycleOf = (s, d, c) => (Number.isFinite(s) && Number.isFinite(d) && Number.isFinite(c) ? s + d - c : null)
  const cashCycleDays = cycleOf(stockDays, debtorDays, creditorDays)
  const priorCycle = cycleOf(measurePrior('stockDays'), measurePrior('debtorDays'), measurePrior('creditorDays'))

  /* -- the pages ---------------------------------------------------------------------- */
  const plCur = profitLossOf(cur, hubCur)
  const plPri = hubPri ? profitLossOf(pri, hubPri) : null
  // Stage 5: the year before last, for the trend table only. Debtor days is the trend
  // model's own formula; a year without the line it needs prints a blank, never a zero.
  const plEar = hubEar ? profitLossOf(ear, hubEar) : null
  const earlierDebtorDays = ear && has(ear, 'accountsReceivable') && line(ear, 'tradingIncome') > 0
    ? (line(ear, 'accountsReceivable') / line(ear, 'tradingIncome')) * DAYS_IN_YEAR
    : null
  const monthly = monthlyView(src.monthly, endOrdinalOf(curDates.profitLoss || curDates.balanceSheet))
  const costKeys = ['costOfSales', 'wages', 'operatingExpenses', 'depreciation', 'interestPaid']
  const costTotal = costKeys.reduce((t, k) => t + line(cur, k), 0)
  const costs = {
    total: costTotal,
    shares: costKeys.map(k => ({ key: k, value: line(cur, k), share: ratio(line(cur, k), costTotal) }))
  }

  const inv = src.inventory && typeof src.inventory === 'object' ? src.inventory : {}
  const slowObsolete = Number.isFinite(inv.slowObsolete) ? inv.slowObsolete : null
  const ageingRaw = Array.isArray(inv.ageing) ? inv.ageing : null
  const ageing = ageingRaw && ageingRaw.some(v => Number.isFinite(v)) ? ageingRaw.map(v => (Number.isFinite(v) ? v : 0)) : null
  const stockAtCost = has(cur, 'stock') ? line(cur, 'stock') : null
  // Stage 4: page 6's category chart is drawn from the read stock export, name and value
  // only, or is left off with that said. The accounts' stock line stays the page's figure.
  const stockFile = inv.stockFile && typeof inv.stockFile === 'object' ? inv.stockFile : null
  const stockCategories = stockFile && Array.isArray(stockFile.categories)
    ? stockFile.categories.filter(c => c && typeof c.name === 'string' && Number.isFinite(c.value)).map(c => ({ name: c.name, value: c.value }))
    : null

  /* -- the optional pages: each a model of its own on the plain lines ---------------- */
  const plainCur = plainLinesOf(cur)
  const plainPri = pri ? plainLinesOf(pri) : null
  const optional = {
    profitBridge: computeProfitBridge({ current: plainCur, prior: plainPri }),
    cashBridge: computeCashBridge({ current: plainCur, prior: plainPri }),
    profitSensitivity: computeProfitSensitivity({ current: plainCur }),
    // Stage 4: the stock export beside the balance sheet's stock line and page 7's two day
    // figures. Refuses by name with no file or no stock line; never derives an age.
    stockVsAccounts: computeStockVsAccounts({
      stockFile: inv.stockFile && typeof inv.stockFile === 'object' ? inv.stockFile : null,
      accountsStock: stockAtCost,
      stockDays,
      creditorDays
    }),
    // Stage 5: the by-month Profit and Loss's last twelve complete months, or why not.
    salesVolatility: monthly.salesVolatility
  }

  return {
    hasPrior: Boolean(pri),
    hasEarlier: Boolean(ear),
    hub: { current: hubCur, prior: hubPri, earlier: hubEar },
    monthly,
    optional,
    trend,
    summary: {
      revenue: plCur.revenue,
      revenueChangePct: plPri ? pctChange(plCur.revenue, plPri.revenue) : null,
      netProfit: plCur.netProfit,
      netProfitChangePct: plPri ? pctChange(plCur.netProfit, plPri.netProfit) : null,
      netMarginPct: plCur.netMarginPct,
      netMarginChangePts: plPri ? diff(plCur.netMarginPct, plPri.netMarginPct) : null,
      cashCycleDays,
      cashCycleChangeDays: diff(cashCycleDays, priorCycle)
    },
    score,
    dashboard: {
      grossMarginPct: hubCur.grossProfitPct,
      netMarginPct: hubCur.netProfitPct,
      currentRatio: bsCur.currentRatio,
      debtToEquity: bsCur.debtToEquity,
      stockTurn: hubCur.stockTurn,
      stockDays,
      stockDaysBand: measure('stockDays') ? measure('stockDays').band : null,
      grossMarginBand: measure('grossMargin') ? measure('grossMargin').band : null,
      revenueVsExpenses: {
        current: { revenue: plCur.revenue, expenses: line(cur, 'costOfSales') + plCur.operatingExpenses + plCur.interestAndDepreciation },
        prior: plPri ? { revenue: plPri.revenue, expenses: line(pri, 'costOfSales') + plPri.operatingExpenses + plPri.interestAndDepreciation } : null
      }
    },
    costs,
    profitLoss: { current: plCur, prior: plPri },
    balanceSheet: {
      current: bsCur,
      prior: bsPri,
      equityChangePct: bsPri ? pctChange(bsCur.equity, bsPri.equity) : null,
      workingCapitalChange: bsPri ? diff(bsCur.workingCapital, bsPri.workingCapital) : null
    },
    cashFlow: {
      stockDays,
      debtorDays,
      creditorDays,
      cashCycleDays,
      cashCycleChangeDays: diff(cashCycleDays, priorCycle),
      bankNow: line(cur, 'bank'),
      bankPrior: pri ? line(pri, 'bank') : null,
      drivers
    },
    inventory: {
      stockAtCost,
      stockChange: pri && has(pri, 'stock') && stockAtCost !== null ? stockAtCost - line(pri, 'stock') : null,
      stockTurn: hubCur.stockTurn,
      stockTurnPrior: hubPri ? hubPri.stockTurn : null,
      stockDays,
      stockDaysPrior: measurePrior('stockDays'),
      slowObsolete,
      slowObsoletePct: ratio(slowObsolete, stockAtCost),
      stockFilePackage: stockFile && typeof stockFile.package === 'string' ? stockFile.package : null,
      categories: stockCategories,
      ageing
    },
    trends: {
      hasEarlier: Boolean(ear),
      rows: [
        { key: 'revenue', earlier: plEar && has(ear, 'tradingIncome') ? plEar.revenue : null, prior: plPri ? plPri.revenue : null, current: plCur.revenue, unit: 'money' },
        { key: 'netProfit', earlier: plEar && has(ear, 'tradingIncome') ? plEar.netProfit : null, prior: plPri ? plPri.netProfit : null, current: plCur.netProfit, unit: 'money' },
        { key: 'netMargin', earlier: plEar ? plEar.netMarginPct : null, prior: plPri ? plPri.netMarginPct : null, current: plCur.netMarginPct, unit: 'percent' },
        { key: 'stockTurn', earlier: hubEar && has(ear, 'tradingIncome') ? hubEar.stockTurn : null, prior: hubPri ? hubPri.stockTurn : null, current: hubCur.stockTurn, unit: 'times' },
        { key: 'debtorDays', earlier: earlierDebtorDays, prior: measurePrior('debtorDays'), current: debtorDays, unit: 'days' }
      ]
    }
  }
}

module.exports = {
  plainLinesOf,
  SCORE_BANDS,
  DRIVERS,
  VOLATILITY_MONTHS,
  toSheet,
  scoreBand,
  endOrdinalOf,
  monthlyView,
  computeReportPages
}
