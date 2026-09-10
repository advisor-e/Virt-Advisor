'use strict'

/**
 * @file "Why profit changed" — the Business Performance Report's optional page that
 *   bridges last year's net profit to this year's, step by step (item 4.70; the approved
 *   drawing is page 11 of `design/mockups/business-performance-report-optional-pages.html`).
 * @module server/report/profitBridgeModel
 *
 * WHY THIS EXISTS. Mike, 2026-09-08: the optional pages must answer the questions an owner
 * asks of a performance report, not reuse the models that happen to exist. The first
 * question is "why did my profit change?", and both years' Profit and Loss exports answer it
 * without a single typed figure.
 *
 * THE ARITHMETIC RECONCILES BY CONSTRUCTION. With R = revenue, g = gross margin as a share
 * of revenue, and subscripts p/c for prior/current:
 *   more sales at last year's margin   (Rc − Rp) · gp
 *   the margin change on this year's   (gc − gp) · Rc
 * sum to (gc·Rc − gp·Rp), which is exactly the change in gross profit. Other income,
 * overheads and the below-the-line costs are plain differences, so the steps always add
 * up to the change in net profit — a bridge that does not close is a bug here, not a
 * finding to print.
 *
 * WHAT IT REFUSES. Sales are NOT split into price and volume: no set of accounts carries
 * units, and the page says so. Without a prior year, or with no prior revenue to take a
 * margin from, there is no bridge and `available` is false with the reason.
 *
 * Pure, side-effect free, backend-only per the Stack Constitution. The net profit here is
 * the same figure the profit-and-loss page prints: gross profit plus other income, less
 * wages, operating expenses, depreciation and interest — a pre-tax figure, as the annual
 * readers read.
 */

/** Coerce to a finite number, or null. @param {*} v @returns {number|null} */
function num (v) {
  if (v === null || v === undefined || v === '') { return null }
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : null
}

/** A year's lines as plain numbers, absent ones as 0 except revenue, which stays null when absent. */
function yearOf (y) {
  const src = y && typeof y === 'object' ? y : {}
  const z = k => num(src[k]) || 0
  const revenue = num(src.tradingIncome)
  const grossProfit = revenue === null ? null : revenue - z('costOfSales')
  const overheads = z('wages') + z('operatingExpenses')
  const belowLine = z('depreciation') + z('interestPaid')
  return {
    revenue,
    costOfSales: z('costOfSales'),
    grossProfit,
    grossMarginPct: revenue !== null && revenue > 0 ? grossProfit / revenue : null,
    otherIncome: z('otherIncome'),
    overheads,
    belowLine,
    netProfit: grossProfit === null ? null : grossProfit + z('otherIncome') - overheads - belowLine
  }
}

/**
 * The bridge from last year's net profit to this year's.
 *
 * @param {object} input
 * @param {object} input.current - this year's lines (`tradingIncome`, `costOfSales`,
 *   `otherIncome`, `wages`, `operatingExpenses`, `depreciation`, `interestPaid`), numbers.
 * @param {object|null} input.prior - last year's, or null.
 * @returns {object} {
 *   available: boolean, blocked: string|null,
 *   prior: {revenue, grossMarginPct, overheads, belowLine, netProfit}|null,
 *   current: {…}|null,
 *   steps: Array<{key, value}>,  // salesGrowth, margin, otherIncome, overheads, belowLine
 *   change: number|null, changePct: number|null
 * }
 */
function computeProfitBridge (input) {
  const opts = input || {}
  const empty = { available: false, blocked: null, prior: null, current: null, steps: [], change: null, changePct: null }
  if (!opts.current || !opts.prior) { return Object.assign({}, empty, { blocked: 'NO_PRIOR_YEAR' }) }

  const cur = yearOf(opts.current)
  const pri = yearOf(opts.prior)
  if (cur.revenue === null || pri.revenue === null) { return Object.assign({}, empty, { blocked: 'NO_REVENUE' }) }
  if (pri.revenue <= 0) { return Object.assign({}, empty, { blocked: 'NO_PRIOR_REVENUE' }) }

  const salesGrowth = (cur.revenue - pri.revenue) * pri.grossMarginPct
  const margin = ((cur.grossMarginPct || 0) - pri.grossMarginPct) * cur.revenue
  const steps = [
    { key: 'salesGrowth', value: salesGrowth },
    { key: 'margin', value: margin },
    { key: 'otherIncome', value: cur.otherIncome - pri.otherIncome },
    // Costs are signed as their effect on profit: a rise takes from it.
    { key: 'overheads', value: -(cur.overheads - pri.overheads) },
    { key: 'belowLine', value: -(cur.belowLine - pri.belowLine) }
  ]
  const change = cur.netProfit - pri.netProfit

  return {
    available: true,
    blocked: null,
    prior: pri,
    current: cur,
    steps,
    change,
    changePct: pri.netProfit > 0 ? change / pri.netProfit : null
  }
}

module.exports = { computeProfitBridge, yearOf }
