'use strict'

/**
 * Business Performance Report — Restify routes.
 *
 * Backend-only calculation endpoints for the report feature. Pure maths (no client data,
 * no AI) — business logic lives on the backend per the Stack Constitution; the Nuxt screen
 * posts inputs and renders the returned figures.
 */

const fs = require('fs')
const { formidable } = require('formidable')
const { computeWorkingCapitalCycle } = require('../report/workingCapitalCycleModel')
const { computeDebtorCashflow } = require('../report/debtorDragModel')
const { computeMarginMarkup, requiredSales, whatIfPrice } = require('../report/marginBreakevenModel')
const { computeEightLevers } = require('../report/eightLeversModel')
const { computeQuickPosition, computeExpensesReview } = require('../report/quickPositionModel')
const { computeEbitdaDcf } = require('../report/ebitdaDcfModel')
const { parseUpload } = require('../report/intake/xeroReportParser')
const { assembleAnnualReports } = require('../report/intake/annualAssembler')
const { intakeErrorResponse } = require('../report/intakeError')

// formidable pinned to v2.1.2 repo-wide (Node 14.15 — see firmManager.js); same
// named-export + callback-wrap pattern as the firm-manager uploads.

const INTAKE_MAX_BYTES = 5 * 1024 * 1024 // a Xero report export is well under 1 MB

/** Wrap formidable v2's callback parse() for await use. @param {object} form @param {object} req */
function parseForm (form, req) {
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) { reject(err); return }
      resolve([fields, files])
    })
  })
}

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

/**
 * POST /api/report/ebitda-dcf
 * @param {object} req.body - partial EBITDA & DCF inputs (merged over the source-sheet
 *   defaults), all per-year arrays oldest-first: sales/costOfSales/operatingExpenses,
 *   sundry{}, addBacks{}, fairMarket{}, dcf{projectedGrowth, discountRates, exitMultiple},
 *   listed{sharesIssued, sharePrice, ebitdaHistory, projectedGrowth, discountRates,
 *   exitMultiple, figuresMultiple}, latestYear.
 * @returns {object} { success, data, timestamp } — years, periodCount, the full P&L
 *   review (pnl), the private-business valuation (valuation, incl. enterpriseValue) and
 *   the listed-company lens (listed, incl. assessedSharePrice). Undefined figures are
 *   null (zero-share price, zero-prior-year growth), never fabricated.
 */
function ebitdaDcf (req, res, next) {
  try {
    const inputs = (req.body && typeof req.body === 'object') ? req.body : {}
    const data = computeEbitdaDcf(inputs)
    res.send(200, { success: true, data, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[report] ebitda-dcf compute failed:', err && err.message)
    res.send(400, { success: false, error: { code: 'EBITDA_DCF_COMPUTE_FAILED', message: 'Could not compute the model from the supplied inputs.' }, timestamp: new Date().toISOString() })
  }
  return next()
}

// Intake error mapping lives in server/report/intakeError.js (R6): allowlisted codes
// pass their authored message through; anything unexpected returns the generic
// sentence — an fs error's message carries a server path and must never reach the client.

/**
 * POST /api/report/quick-position/intake  (firmAuth — uploads are never anonymous)
 *
 * Multipart upload of ONE Xero report export (.xlsx or .csv, max 5 MB) in the `file`
 * field. Parses on the backend per the intake contract (REPORT-DATA-MODEL §4): sums
 * line items (never Total rows), auto-detects Balance Sheet vs P&L, returns proposed
 * figures tagged `source: 'file'` with per-row candidates, the report's own date, and
 * any cross-check warnings. Parse-and-discard: the temp file is deleted in `finally`,
 * nothing is stored, and no client-identifying content (names, labels, filenames) is
 * ever logged — only stable error codes.
 *
 * @param {object} req - multipart request; req.firmId set by firmAuth.
 * @returns {object} { success, data: { kind, companyName, reportDate, proposals|expenseLines, warnings }, timestamp }
 */
async function quickPositionIntake (req, res) {
  const form = formidable({ maxFileSize: INTAKE_MAX_BYTES, multiples: false })
  let uploadedFile = null
  try {
    let files
    try {
      ;[, files] = await parseForm(form, req)
    } catch (err) {
      const tooBig = err && /maxFileSize/i.test(err.message || '')
      res.send(tooBig ? 413 : 400, {
        success: false,
        error: { code: tooBig ? 'FILE_TOO_LARGE' : 'UPLOAD_PARSE_FAILED', message: tooBig ? 'The file is larger than 5 MB — a Xero report export should be well under that.' : 'The upload could not be read. Please try again.' },
        timestamp: new Date().toISOString()
      })
      return
    }

    uploadedFile = files && (Array.isArray(files.file) ? files.file[0] : files.file)
    if (!uploadedFile || !uploadedFile.filepath) {
      res.send(400, { success: false, error: { code: 'NO_FILE', message: 'No file was attached. Send the export in the "file" field.' }, timestamp: new Date().toISOString() })
      return
    }

    const buffer = fs.readFileSync(uploadedFile.filepath)
    const data = parseUpload(buffer)
    res.send(200, { success: true, data, timestamp: new Date().toISOString() })
  } catch (err) {
    // Log the stable code only — never the filename, labels or content (identity stays local)
    console.error('[report] quick-position intake rejected:', (err && err.code) || 'INTAKE_PARSE_FAILED')
    const safe = intakeErrorResponse(err, 'The file could not be read as a Xero report export.')
    res.send(safe.status, safe.body)
  } finally {
    // Parse-and-discard: always remove formidable's temp file
    if (uploadedFile && uploadedFile.filepath) {
      fs.unlink(uploadedFile.filepath, () => {})
    }
  }
}

/**
 * POST /api/report/ebitda-dcf/intake  (firmAuth — uploads are never anonymous)
 *
 * Multipart upload of 1..5 Xero P&L exports (.xlsx or .csv, max 5 MB each), one per
 * year, in repeated `file` fields. Each parses per the intake contract (sum line items,
 * never Total rows); every file must be a P&L or the whole request fails loudly with
 * the offending positions — no partial parse. Years come from each report's own date
 * line; when all are known and distinct the response carries the engine-ready
 * oldest-first arrays (`assembled`), otherwise the screen resolves the years from the
 * per-file proposals. Parse-and-discard: temp files always deleted, nothing stored, no
 * client-identifying content (names, labels, filenames) ever logged — error codes only.
 *
 * @param {object} req - multipart request; req.firmId set by firmAuth.
 * @returns {object} { success, data: { files, assembled|null, warnings }, timestamp }
 */
async function ebitdaDcfIntake (req, res) {
  const form = formidable({ maxFileSize: INTAKE_MAX_BYTES, multiples: true })
  let uploaded = []
  try {
    let files
    try {
      ;[, files] = await parseForm(form, req)
    } catch (err) {
      const tooBig = err && /maxFileSize/i.test(err.message || '')
      res.send(tooBig ? 413 : 400, {
        success: false,
        error: { code: tooBig ? 'FILE_TOO_LARGE' : 'UPLOAD_PARSE_FAILED', message: tooBig ? 'A file is larger than 5 MB — a Xero report export should be well under that.' : 'The upload could not be read. Please try again.' },
        timestamp: new Date().toISOString()
      })
      return
    }

    const field = files && files.file
    uploaded = (Array.isArray(field) ? field : (field ? [field] : [])).filter(f => f && f.filepath)
    if (!uploaded.length) {
      res.send(400, { success: false, error: { code: 'NO_FILE', message: 'No files were attached. Send each year\'s P&L export in a "file" field.' }, timestamp: new Date().toISOString() })
      return
    }

    const parsed = uploaded.map(f => parseUpload(fs.readFileSync(f.filepath)))
    const data = assembleAnnualReports(parsed)
    res.send(200, { success: true, data, timestamp: new Date().toISOString() })
  } catch (err) {
    // Log the stable code only — never the filename, labels or content (identity stays local)
    console.error('[report] ebitda-dcf intake rejected:', (err && err.code) || 'INTAKE_PARSE_FAILED')
    const safe = intakeErrorResponse(err, 'A file could not be read as a Xero report export.')
    res.send(safe.status, safe.body)
  } finally {
    // Parse-and-discard: always remove every temp file formidable wrote
    for (const f of uploaded) {
      if (f && f.filepath) { fs.unlink(f.filepath, () => {}) }
    }
  }
}

module.exports = { workingCapitalCycle, debtorDrag, marginBreakeven, eightLevers, quickPosition, quickPositionIntake, ebitdaDcf, ebitdaDcfIntake }
