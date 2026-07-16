'use strict'

/**
 * Business Performance Report — Restify routes.
 *
 * Backend-only calculation endpoints for the report feature. Pure maths (no client data,
 * no AI) — business logic lives on the backend per the Stack Constitution; the Nuxt screen
 * posts inputs and renders the returned figures.
 */

const { computeWorkingCapitalCycle } = require('../report/workingCapitalCycleModel')
const { computeDebtorCashflow } = require('../report/debtorDragModel')
const { computeMarginMarkup, requiredSales, whatIfPrice } = require('../report/marginBreakevenModel')
const { computeEightLevers } = require('../report/eightLeversModel')
const { computeQuickPosition, computeExpensesReview } = require('../report/quickPositionModel')

/**
 * POST /api/report/working-capital-cycle
 * @param {object} req.body - partial Working Capital Cycle inputs (overrides the defaults).
 * @returns {object} { success, data, timestamp } — the computed model outputs.
 */
function workingCapitalCycle (req, res, next) {
  try {
    const inputs = (req.body && typeof req.body === 'object') ? req.body : {}
    const data = computeWorkingCapitalCycle(inputs)
    res.send(200, { success: true, data, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[report] working-capital-cycle compute failed:', err && err.message)
    res.send(400, { success: false, error: { code: 'WCC_COMPUTE_FAILED', message: 'Could not compute the model from the supplied inputs.' }, timestamp: new Date().toISOString() })
  }
  return next()
}

/**
 * POST /api/report/debtor-drag
 * @param {object} req.body - partial debtor cashflow inputs (monthlySales, debtor[], creditor[],
 *   markup, netProfitPct, gstRate).
 * @returns {object} { success, data, timestamp } — monthly closing balances + summary.
 */
function debtorDrag (req, res, next) {
  try {
    const inputs = (req.body && typeof req.body === 'object') ? req.body : {}
    const data = computeDebtorCashflow(inputs)
    res.send(200, { success: true, data, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[report] debtor-drag compute failed:', err && err.message)
    res.send(400, { success: false, error: { code: 'DEBTOR_DRAG_COMPUTE_FAILED', message: 'Could not compute the model from the supplied inputs.' }, timestamp: new Date().toISOString() })
  }
  return next()
}

/**
 * POST /api/report/margin-breakeven
 * @param {object} req.body - { price, cost, overheads, ownerDrawings, priceChangePct }.
 * @returns {object} margin/mark-up, cost-of-sales %, break-even sales, and the what-if-price curve.
 */
function marginBreakeven (req, res, next) {
  try {
    const i = (req.body && typeof req.body === 'object') ? req.body : {}
    const price = +i.price || 0
    const cost = +i.cost || 0
    const overheads = +i.overheads || 0
    const drawings = +i.ownerDrawings || 0
    const chg = +i.priceChangePct || 0
    const mm = computeMarginMarkup(cost, price)
    const reqSales = requiredSales(overheads, drawings, mm.marginPct)
    const curve = []
    for (let pc = -40; pc <= 80; pc += 2) {
      const r = whatIfPrice({ price, costOfSalesPct: mm.costOfSalesPct, overheads, ownerDrawings: drawings, priceChangePct: pc / 100 })
      curve.push({ chg: pc, units: r.newMarginPct > 0 ? r.unitsRequired : null })
    }
    const chosen = whatIfPrice({ price, costOfSalesPct: mm.costOfSalesPct, overheads, ownerDrawings: drawings, priceChangePct: chg / 100 })
    const data = {
      grossProfit: mm.grossProfit,
      marginPct: mm.marginPct,
      markup: mm.markup,
      costOfSalesPct: mm.costOfSalesPct,
      requiredSales: reqSales,
      requiredUnits: price ? reqSales / price : 0,
      curve,
      chosen: { newPrice: chosen.newPrice, newMarginPct: chosen.newMarginPct, unitsRequired: chosen.unitsRequired, salesRequired: chosen.salesRequired }
    }
    res.send(200, { success: true, data, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[report] margin-breakeven compute failed:', err && err.message)
    res.send(400, { success: false, error: { code: 'MARGIN_BE_COMPUTE_FAILED', message: 'Could not compute the model from the supplied inputs.' }, timestamp: new Date().toISOString() })
  }
  return next()
}

/**
 * POST /api/report/eight-levers
 * @param {object} req.body - partial 8 Levers inputs (mix, activityCosts, trading, labour,
 *   scenarios, broad) — merged over the source-model defaults.
 * @returns {object} { success, data, timestamp } — all three sheets: calculations, scenarios,
 *   broadScenarios.
 */
function eightLevers (req, res, next) {
  try {
    const inputs = (req.body && typeof req.body === 'object') ? req.body : {}
    const data = computeEightLevers(inputs)
    res.send(200, { success: true, data, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[report] eight-levers compute failed:', err && err.message)
    res.send(400, { success: false, error: { code: 'EIGHT_LEVERS_COMPUTE_FAILED', message: 'Could not compute the model from the supplied inputs.' }, timestamp: new Date().toISOString() })
  }
  return next()
}

/**
 * POST /api/report/quick-position
 * @param {object} req.body - partial Quick Position inputs (merged over the source-sheet
 *   defaults): asset amounts + realisability factors, monthly outgoings, life-line capital,
 *   grossMarginPct/discountPct, serviceBusiness, and optionally expenseLines
 *   [{amount, maintainedPct}] + operatingMonths for the Expenses Review.
 * @returns {object} { success, data, timestamp } — quick cash, runway months (null = unlimited),
 *   break-even (null = no margin), the discount example, and expensesReview when lines were sent.
 */
function quickPosition (req, res, next) {
  try {
    const inputs = (req.body && typeof req.body === 'object') ? req.body : {}
    const data = computeQuickPosition(inputs)
    if (Array.isArray(inputs.expenseLines)) {
      data.expensesReview = computeExpensesReview(inputs.expenseLines, inputs.operatingMonths)
    }
    res.send(200, { success: true, data, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[report] quick-position compute failed:', err && err.message)
    res.send(400, { success: false, error: { code: 'QUICK_POSITION_COMPUTE_FAILED', message: 'Could not compute the model from the supplied inputs.' }, timestamp: new Date().toISOString() })
  }
  return next()
}

module.exports = { workingCapitalCycle, debtorDrag, marginBreakeven, eightLevers, quickPosition }
