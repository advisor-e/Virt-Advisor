'use strict'

/**
 * @file "What moves profit" — the Business Performance Report's optional page that ranks
 *   what a one-percent move in each of four things does to this year's profit, with the
 *   break-even point and the margin of safety (item 4.70; page 13 of
 *   `design/mockups/business-performance-report-optional-pages.html`).
 * @module server/report/profitSensitivityModel
 *
 * THE OWNER'S QUESTION: "what should I focus on?" This year's Profit and Loss alone answers
 * it, on ONE stated assumption that the page prints beside the figures: cost of sales moves
 * with sales, and wages, operating expenses, depreciation and interest are fixed for the
 * year. So, with R = revenue and C = cost of sales:
 *   price up 1%          +0.01 · R        (every dollar of price is profit)
 *   volume up 1%         +0.01 · (R − C)  (every dollar of volume carries its cost of sales)
 *   cost of sales down 1% +0.01 · C
 *   overheads down 1%    +0.01 · (wages + operating expenses)
 * The same one percent the other way costs the same amount, which is why the four are
 * reported as a size, not a direction.
 *
 * Break-even sales = fixed costs ÷ contribution margin, where fixed costs are the four fixed
 * lines less other income, and the contribution margin is (R − C) ÷ R. Margin of safety is
 * how far sales can fall before a loss, as a share of sales.
 *
 * REFUSALS. No revenue, or a cost of sales that leaves no contribution, means there is no
 * break-even and the page is not offered — a break-even of "never" is not a figure.
 *
 * Pure, side-effect free, backend-only per the Stack Constitution.
 */

const { yearOf } = require('./profitBridgeModel')

/** Coerce to a finite number, or null. @param {*} v @returns {number|null} */
function num (v) {
  if (v === null || v === undefined || v === '') { return null }
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : null
}

/**
 * @param {object} input
 * @param {object} input.current - this year's lines, numbers.
 * @returns {object} {
 *   available, blocked, profit, revenue, costOfSales, contribution, contributionMarginPct,
 *   overheads, fixedCosts,
 *   levers: Array<{key, delta, pctOfProfit}>,  // price, costOfSales, volume, overheads — largest first
 *   breakEvenSales, marginOfSafety, marginOfSafetyPct
 * }
 */
function computeProfitSensitivity (input) {
  const opts = input || {}
  const empty = { available: false, blocked: null, profit: null, revenue: null, costOfSales: null, contribution: null, contributionMarginPct: null, overheads: null, fixedCosts: null, levers: [], breakEvenSales: null, marginOfSafety: null, marginOfSafetyPct: null }
  if (!opts.current) { return Object.assign({}, empty, { blocked: 'NO_CURRENT_YEAR' }) }
  const y = yearOf(opts.current)
  if (y.revenue === null || y.revenue <= 0) { return Object.assign({}, empty, { blocked: 'NO_REVENUE' }) }
  const contribution = y.revenue - y.costOfSales
  if (contribution <= 0) { return Object.assign({}, empty, { blocked: 'NO_CONTRIBUTION' }) }

  const fixedCosts = y.overheads + y.belowLine - y.otherIncome
  const profit = y.netProfit
  const pctOf = v => (profit !== null && profit !== 0 ? v / Math.abs(profit) : null)
  const levers = [
    { key: 'price', delta: 0.01 * y.revenue },
    { key: 'costOfSales', delta: 0.01 * y.costOfSales },
    { key: 'volume', delta: 0.01 * contribution },
    { key: 'overheads', delta: 0.01 * y.overheads }
  ].map(l => Object.assign(l, { pctOfProfit: pctOf(l.delta) }))
    .sort((a, b) => b.delta - a.delta)

  const contributionMarginPct = contribution / y.revenue
  const breakEvenSales = fixedCosts / contributionMarginPct
  const marginOfSafety = y.revenue - breakEvenSales

  return {
    available: true,
    blocked: null,
    profit,
    revenue: y.revenue,
    costOfSales: y.costOfSales,
    contribution,
    contributionMarginPct,
    overheads: y.overheads,
    fixedCosts,
    levers,
    breakEvenSales,
    marginOfSafety,
    marginOfSafetyPct: marginOfSafety / y.revenue
  }
}

module.exports = { computeProfitSensitivity, num }
