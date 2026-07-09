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

module.exports = { workingCapitalCycle, debtorDrag }
