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
const { computeLoanEstimatorReport } = require('../report/loanEstimatorModel')
const { computeLeaseVsBuy } = require('../report/leaseVsBuyModel')
const { computeMultiplePropertyAssessment, computeMultiplePropertyPortfolio } = require('../report/multiplePropertyModel')
const { computeCostOfCapital } = require('../report/costOfCapitalModel')
const { computeVolatility } = require('../report/volatilityModel')
const { computeThreeWayForecast, computeThreeYearForecast } = require('../report/threeWayForecastModel')
const { assembleForecastIntake, MAX_FILES: MAX_FORECAST_FILES } = require('../report/intake/threeWayForecastAssembler')
const { listReportModels } = require('../utils/reportModels')
const { parseUpload, parseForecastUpload } = require('../report/intake/xeroReportParser')
const { assembleAnnualReports, MAX_FILES } = require('../report/intake/annualAssembler')
const { parseMonthlyUpload } = require('../report/intake/monthlySalesParser')
const { assembleMonthlySeries, MAX_FILES: MAX_MONTHLY_FILES } = require('../report/intake/monthlySeriesAssembler')
const { intakeErrorResponse } = require('../report/intakeError')

// formidable pinned to v2.1.2 repo-wide (Node 14.15 — see firmManager.js); same
// named-export + callback-wrap pattern as the firm-manager uploads.

// 5 MB per REQUEST — formidable v2's maxFileSize accumulates across all parts, so on
// the multi-file EBITDA intake this caps the batch total, not each file (R14, Mike's
// option B 2026-07-20: the cap stays; the messages say "together"). A Xero report
// export is well under 1 MB, so five years fit with huge headroom.
const INTAKE_MAX_BYTES = 5 * 1024 * 1024

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
    console.error('[report] working-capital-cycle compute failed:', err)
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
    console.error('[report] debtor-drag compute failed:', err)
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
    console.error('[report] margin-breakeven compute failed:', err)
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
    console.error('[report] eight-levers compute failed:', err)
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
    console.error('[report] quick-position compute failed:', err)
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
    console.error('[report] ebitda-dcf compute failed:', err)
    res.send(400, { success: false, error: { code: 'EBITDA_DCF_COMPUTE_FAILED', message: 'Could not compute the model from the supplied inputs.' }, timestamp: new Date().toISOString() })
  }
  return next()
}

/**
 * POST /api/report/loan-estimator
 * @param {object} req.body - { securityPosition, repayment, serviceability } — each block
 *   partial Loan Estimator inputs for its Part (A+B security position, D repayment
 *   schedule, C serviceability); an omitted block computes on the workbook sample and is
 *   named in that part's `defaultedInputs` (R8 — defaults never substitute silently).
 * @returns {object} { success, data: { securityPosition, repayment, serviceability },
 *   timestamp } — serviceability carries `verdictPass` + `surplus`; wording is the screen's.
 */
function loanEstimator (req, res, next) {
  try {
    const inputs = (req.body && typeof req.body === 'object') ? req.body : {}
    const data = computeLoanEstimatorReport(inputs)
    res.send(200, { success: true, data, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[report] loan-estimator compute failed:', err)
    res.send(400, { success: false, error: { code: 'LOAN_ESTIMATOR_COMPUTE_FAILED', message: 'Could not compute the model from the supplied inputs.' }, timestamp: new Date().toISOString() })
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
        error: { code: tooBig ? 'FILE_TOO_LARGE' : 'UPLOAD_PARSE_FAILED', message: tooBig ? 'The file is larger than 5 MB — an accounting export should be well under that.' : 'The upload could not be read. Please try again.' },
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
    const safe = intakeErrorResponse(err, 'The file could not be read as an accounting export.')
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
        error: { code: tooBig ? 'FILE_TOO_LARGE' : 'UPLOAD_PARSE_FAILED', message: tooBig ? 'The files together are larger than 5 MB — an accounting export should be well under 1 MB each. Please export again without extra tabs or images.' : 'The upload could not be read. Please try again.' },
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
    // R15: refuse over-count uploads BEFORE any file is parsed (the assembler's own
    // count check stays as the backstop; same authored message, same code).
    if (uploaded.length > MAX_FILES) {
      const e = new Error('This model reads up to ' + MAX_FILES + ' years — ' + uploaded.length + ' files were sent. Please drop one Profit and Loss export per year.')
      e.code = 'TOO_MANY_FILES'
      throw e
    }

    const parsed = uploaded.map(f => parseUpload(fs.readFileSync(f.filepath)))
    const data = assembleAnnualReports(parsed)
    res.send(200, { success: true, data, timestamp: new Date().toISOString() })
  } catch (err) {
    // Log the stable code only — never the filename, labels or content (identity stays local)
    console.error('[report] ebitda-dcf intake rejected:', (err && err.code) || 'INTAKE_PARSE_FAILED')
    const safe = intakeErrorResponse(err, 'A file could not be read as an accounting export.')
    res.send(safe.status, safe.body)
  } finally {
    // Parse-and-discard: always remove every temp file formidable wrote
    for (const f of uploaded) {
      if (f && f.filepath) { fs.unlink(f.filepath, () => {}) }
    }
  }
}

/**
 * POST /api/report/volatility/intake  (firmAuth — uploads are never anonymous)
 *
 * Multipart upload of 1..2 Xero "Current financial year by month" P&L exports (.xlsx or
 * .csv, max 5 MB per request) in repeated `file` fields — this year's, and optionally
 * last year's for the 18 and 24-month windows (Mike's ruling, 2026-08-31). Each is read
 * across its month columns for trading-income line items, then the two are joined into
 * one oldest-first run.
 *
 * The response separates `usable` from `setAside` on purpose: months after the data
 * cut-off read as a genuine 0 and the cut-off month itself is usually partial, and both
 * would produce a wrong volatility score that looks entirely plausible (REPORT-DATA-MODEL
 * §3.9). The screen shows what came off and why, so a person decides rather than the
 * arithmetic deciding silently.
 *
 * Parse-and-discard, as the other two intakes: temp files are deleted in `finally`,
 * nothing is stored, and no client-identifying content — filenames, account row labels,
 * company names — is ever logged. Only stable error codes.
 *
 * @param {object} req - multipart request; req.firmId set by firmAuth.
 * @returns {object} { success, data: { files, series, usable, setAside, warnings }, timestamp }
 */
async function volatilityIntake (req, res) {
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
        error: { code: tooBig ? 'FILE_TOO_LARGE' : 'UPLOAD_PARSE_FAILED', message: tooBig ? 'The files together are larger than 5 MB — a by-month accounting export should be well under 1 MB each. Please export again without extra tabs or images.' : 'The upload could not be read. Please try again.' },
        timestamp: new Date().toISOString()
      })
      return
    }

    const field = files && files.file
    uploaded = (Array.isArray(field) ? field : (field ? [field] : [])).filter(f => f && f.filepath)
    if (!uploaded.length) {
      res.send(400, { success: false, error: { code: 'NO_FILE', message: 'No files were attached. Send each by-month export in a "file" field.' }, timestamp: new Date().toISOString() })
      return
    }
    // Same shape as the EBITDA route's R15: refuse an over-count BEFORE any file is
    // parsed. The assembler's own check stays as the backstop, with the same message.
    if (uploaded.length > MAX_MONTHLY_FILES) {
      const e = new Error('This report reads up to ' + MAX_MONTHLY_FILES + ' accounts files — ' + uploaded.length + ' were sent. Please drop this year\'s by-month export and, if you want more than twelve months, last year\'s.')
      e.code = 'TOO_MANY_FILES'
      throw e
    }

    const parsed = uploaded.map(f => parseMonthlyUpload(fs.readFileSync(f.filepath)))
    const data = assembleMonthlySeries(parsed)
    res.send(200, { success: true, data, timestamp: new Date().toISOString() })
  } catch (err) {
    // Log the stable code only — never the filename, labels or content (identity stays local)
    console.error('[report] volatility intake rejected:', (err && err.code) || 'INTAKE_PARSE_FAILED')
    const safe = intakeErrorResponse(err, 'The file could not be read as a by-month accounting export.')
    res.send(safe.status, safe.body)
  } finally {
    // Parse-and-discard: always remove every temp file formidable wrote
    for (const f of uploaded) {
      if (f && f.filepath) { fs.unlink(f.filepath, () => {}) }
    }
  }
}

/**
 * POST /api/report/lease-vs-buy
 * @param {object} req.body - partial Lease vs Buy inputs (merged over the workbook
 *   sample): the loan block (loanType 'T'/'R', deposit, interestRate, termMonths,
 *   purchasePrice), depreciation (depreciationMethod 'sl'/'dv', depreciationRate),
 *   running-cost/tax "other" fields, the lease block (leaseTermMonths, annualLeaseKm,
 *   monthlyLeasePayment, includes* 'yes'/'no', …), the resale/residual values, and
 *   optionally buyRepairs[] (per-year); an omitted field computes on the sample and is
 *   named in `defaultedInputs` (R8 — defaults never substitute silently).
 * @returns {object} { success, data, timestamp } — data = { verdict {recommended,
 *   cheaperCost, dearerCost, saving}, buy {grossTotal, totalNet, years[]}, lease
 *   {grossTotal, totalNet, endCosts, years[]}, defaultedInputs }. The lease-end costs
 *   are counted once (the corrected workbook double-count — see the model header).
 */
function leaseVsBuy (req, res, next) {
  try {
    const inputs = (req.body && typeof req.body === 'object') ? req.body : {}
    const data = computeLeaseVsBuy(inputs)
    res.send(200, { success: true, data, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[report] lease-vs-buy compute failed:', err)
    res.send(400, { success: false, error: { code: 'LEASE_VS_BUY_COMPUTE_FAILED', message: 'Could not compute the model from the supplied inputs.' }, timestamp: new Date().toISOString() })
  }
  return next()
}

/**
 * POST /api/report/cost-of-capital
 * @param {object} req.body - partial Cost of Capital inputs (merged over the workbook
 *   sample). The WACC scalars: riskFreeRate, marketRate, beta, taxRate, equity, debt,
 *   borrowRate. There is deliberately no inflationRate or growthRate: the owner ruled
 *   both out of the WACC on 2026-07-29 (correction (4) in the model), so sending either
 *   would change nothing — the route accepts neither rather than appearing to. The beta
 *   helper series: indexValues[], equityValues[], sharesIssued[], marketReturnRate —
 *   a series slot may be `null` for a period with no data, which is NOT the same as a
 *   supplied 0 (that distinction is the corrected source defect; see the model header).
 *   An omitted field computes on the sample and is named in `defaultedInputs`
 *   (R8 — defaults never substitute silently). Optionally the hurdle-rate test:
 *   investmentCost + annualReturn — a proposed investment judged against the WACC. Both
 *   are needed; either alone (or a cost of zero) yields `hurdle: null` rather than a
 *   guessed figure, because an advisor mid-typing is not an advisor in error.
 * @returns {object} { success, data, timestamp } — data = { beta {market, company,
 *   growthRate, roiBeta, volatilityBeta, warnings[], defaultedInputs}, wacc {inputs,
 *   costOfEquity, costOfDebtAfterTax,
 *   equityRatio, debtRatio, equityComponent, debtComponent, wacc, defaultedInputs},
 *   betaSuggestions {roi, volatility, inUse}, hurdle, sensitivity }.
 *   `hurdle` is null unless testable, else {investmentCost, annualReturn, returnRate,
 *   hurdleRate, requiredAnnualReturn, marginRate, marginAmount, verdict}. `sensitivity`
 *   is one {key, step, wacc, change} per input, each measuring that input raised ON ITS
 *   OWN, biggest absolute effect first — the lines do not combine. `warnings` and `verdict`
 *   are CODES for the screen to translate — an implausible beta is reported, never
 *   passed on quietly, and no English is ever put in the engine.
 *
 * Anonymous, like every other calc route: numbers in, numbers out. It reads no database,
 * writes nothing, calls no third party, and sends nothing to an LLM — the client's equity
 * figures are used to compute the response and are never stored or logged.
 */
function costOfCapital (req, res, next) {
  try {
    const inputs = (req.body && typeof req.body === 'object') ? req.body : {}
    const data = computeCostOfCapital(inputs)
    res.send(200, { success: true, data, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[report] cost-of-capital compute failed:', err)
    res.send(400, { success: false, error: { code: 'COST_OF_CAPITAL_COMPUTE_FAILED', message: 'Could not compute the model from the supplied inputs.' }, timestamp: new Date().toISOString() })
  }
  return next()
}

/**
 * POST /api/report/multiple-property
 * @param {object} req.body - partial Multiple Property Assessment inputs, merged over the
 *   workbook's sample (Phase 1: ONE investment property, ten years). The property
 *   (purchasePrice and its land/building/chattels split, rentPerWeek, vacancyWeeks,
 *   taxRate), the nine annual costs, the growth and inflation assumptions, and the funding
 *   structure (fundingRequired, interestOnlyLoan, the two terms, the two rates,
 *   interestDeductibility 'Yes'/'No'/'Phasing' with its phasingTable[], cashDeposit).
 *
 *   Two groups exist in no workbook cell and both are Mike's rulings of 2026-08-17:
 *   `endOfInterestOnly` ('convert'/'repay') with `interestOnlyTotalTermYears`, which
 *   decides what happens when the interest-only period ends — the workbook simply zeroed
 *   the balance with nothing repaying it; and the four tax rules (`yearOneAddBack`,
 *   `managementFeeGstRate`, `depreciableAssets` + `depreciationMethod` +
 *   `buildingDepreciationRate`, `lossTreatment`) which were assumptions inside its
 *   formulas. Every default reproduces the workbook exactly.
 *
 *   An omitted field computes on the sample and is named in `defaultedInputs`
 *   (R8 — defaults never substitute silently). A setting that is present but
 *   unrecognised is named there too, so a mistyped rule never passes as a chosen one.
 * @returns {object} { success, data, timestamp } — data = { address, endOfInterestOnly,
 *   years[], headline {weeklyCashPosition, totalDebt, netEquityFinalYear,
 *   returnOnInvestorFundsFinalYear}, taxRules {…, effectiveManagementFeePct},
 *   purchasePriceSplit {total, difference, reconciles}, profitAndLoss{}, taxPosition{},
 *   loans {interestOnly{}, principalAndInterest{}}, investmentSummary{}, defaultedInputs }.
 *   Every series is ten long, index 0 = year 1.
 *
 *   `purchasePriceSplit.reconciles` is reported, never enforced: the model computes either
 *   way and the screen refuses on a non-zero difference, so an advisor mid-typing is not
 *   an advisor in error.
 *
 * Anonymous, like every other calc route: numbers in, numbers out. It reads no database,
 * writes nothing, calls no third party, and sends nothing to an LLM — the client's real
 * purchase price, rent and loan balances are used to compute the response and are never
 * stored or logged.
 */
/**
 * Is this body asking for the PORTFOLIO rather than one property?
 *
 * 🔴 THE OLD SHAPE MUST KEEP WORKING UNCHANGED. The Phase 1 screen is live in UAT and
 * calls this route, so the decision is made on what the caller SENT, never on a flag or
 * a version the old screen does not know to set. A body carrying a `properties` list or
 * a `household` object wants the portfolio; every other body computes exactly as it did
 * before Phase 2 existed, and `multiplePropertyRoute.test.js` fails the build if that
 * ever stops being true.
 *
 * One route rather than two, deliberately: the Phase 2 screen REPLACES the Phase 1 one
 * (the catalogue's "Property 1 of 5" line is written to be deleted), so a second URL
 * would be dead the day it was finished.
 *
 * @param {object} body
 * @returns {boolean}
 */
function wantsPortfolio (body) {
  if (!body || typeof body !== 'object') { return false }
  if (Array.isArray(body.properties)) { return true }
  return !!(body.household && typeof body.household === 'object')
}

/**
 * POST /api/report/multiple-property
 *
 * TWO SHAPES, ONE ROUTE — see `wantsPortfolio` for why.
 *
 * @param {object} req.body - either shape:
 *
 *   **ONE PROPERTY (the original, unchanged).** Partial Multiple Property Assessment
 *   inputs merged over the workbook's sample: the property (purchasePrice and its
 *   land/building/chattels split, rentPerWeek, vacancyWeeks, taxRate), the nine annual
 *   costs, the growth and inflation assumptions, and the funding structure
 *   (fundingRequired, interestOnlyLoan, the two terms, the two rates,
 *   interestDeductibility 'Yes'/'No'/'Phasing' with its phasingTable[], cashDeposit).
 *
 *   **THE PORTFOLIO (Phase 2).** `{ household, properties }`. `household` carries
 *   `residenceValue`, `homeMortgage`, `totalSavings`, `residenceTaxApportionmentPct` and
 *   `maxLvr`; `properties` is up to five of the objects above, each of which may also
 *   carry `depositApplied` (the family's hold-back — omit it and the property takes what
 *   is left of the pool) and `taxApportionmentPct`. 🔴 `fundingRequired` and
 *   `cashDeposit` are IGNORED on this shape: the apportionment table decides both, and a
 *   caller who sends them is describing a funding structure the table is about to
 *   overrule.
 *
 *   Two groups exist in no workbook cell and both are Mike's rulings of 2026-08-17:
 *   `endOfInterestOnly` ('convert'/'repay') with `interestOnlyTotalTermYears`, which
 *   decides what happens when the interest-only period ends — the workbook simply zeroed
 *   the balance with nothing repaying it; and the four tax rules (`yearOneAddBack`,
 *   `managementFeeGstRate`, `depreciableAssets` + `depreciationMethod` +
 *   `buildingDepreciationRate`, `lossTreatment`) which were assumptions inside its
 *   formulas. Every default reproduces the workbook exactly.
 *
 *   ⚠ `maxLvr` is NOT resolved here. It reaches the caller from the tier cascade through
 *   the authenticated `GET /api/report/property-tax-rules`, alongside the tax rules it
 *   shares a settings block with, and is passed back in on the household. This route
 *   stays anonymous, which it could not do if it read a firm's configuration itself.
 *
 *   An omitted field computes on the sample and is named in `defaultedInputs`
 *   (R8 — defaults never substitute silently). A setting that is present but
 *   unrecognised is named there too, so a mistyped rule never passes as a chosen one.
 * @returns {object} { success, data, timestamp }.
 *
 *   ONE PROPERTY — data = { address, endOfInterestOnly, years[], headline{}, taxRules{},
 *   purchasePriceSplit{}, profitAndLoss{}, taxPosition{}, loans{}, investmentSummary{},
 *   defaultedInputs }.
 *
 *   THE PORTFOLIO — data = { household{}, apportionment{}, properties[] (each of them the
 *   object above), consolidated{…, servicing{}}, headline{}, warnings[], defaultedInputs }.
 *
 *   🔴 `warnings[]` IS NOT OPTIONAL FOR A CALLER TO RENDER. A capped interest-only slice,
 *   a deposit reduced to fit, or a breached LVR are each a sentence the advisor needs to
 *   read; a screen that drops them puts the model back to producing a plausible wrong
 *   number in silence, which is the fault the apportionment corrections were made to fix.
 *
 *   Every series is ten long, index 0 = year 1.
 *
 *   `purchasePriceSplit.reconciles` is reported, never enforced: the model computes either
 *   way and the screen refuses on a non-zero difference, so an advisor mid-typing is not
 *   an advisor in error.
 *
 * Anonymous, like every other calc route: numbers in, numbers out. It reads no database,
 * writes nothing, calls no third party, and sends nothing to an LLM — the client's real
 * purchase price, rent and loan balances are used to compute the response and are never
 * stored or logged. With five properties there are now FIVE real addresses in a request
 * and none of them reaches a log line either.
 */
function multipleProperty (req, res, next) {
  try {
    const inputs = (req.body && typeof req.body === 'object') ? req.body : {}
    const data = wantsPortfolio(inputs)
      ? computeMultiplePropertyPortfolio(inputs)
      : computeMultiplePropertyAssessment(inputs)
    res.send(200, { success: true, data, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[report] multiple-property compute failed:', err)
    res.send(400, { success: false, error: { code: 'MULTIPLE_PROPERTY_COMPUTE_FAILED', message: 'Could not compute the model from the supplied inputs.' }, timestamp: new Date().toISOString() })
  }
  return next()
}

/**
 * POST /api/report/volatility
 *
 * @param {object} req.body - `{ sales: number[], window: 12|18|24 }`. `sales` is monthly
 *   figures oldest-first, as read from the firm's accounts export; `window` is how many of
 *   the MOST RECENT months to measure. An unrecognised window falls back to 12, and an
 *   unreadable cell counts as zero rather than blanking every figure on the screen.
 * @returns {object} `{ success, data, timestamp }` — the average, the population standard
 *   deviation, the three bands (with `lower` floored at zero per Mike's ruling of
 *   2026-08-31 and the workbook's own value kept beside it as `lowerUnfloored`), the dial
 *   score and its colour, each month's band, and the two years for Year on Year.
 *
 * Anonymous by design: numbers in, numbers out. Only the file-intake routes carry
 * `firmAuth`, because those accept uploads.
 */
function volatility (req, res, next) {
  try {
    const inputs = (req.body && typeof req.body === 'object') ? req.body : {}
    const data = computeVolatility(inputs)
    res.send(200, { success: true, data, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[report] volatility compute failed:', err)
    res.send(400, { success: false, error: { code: 'VOLATILITY_COMPUTE_FAILED', message: 'Could not compute the model from the supplied inputs.' }, timestamp: new Date().toISOString() })
  }
  return next()
}

/**
 * POST /api/report/three-way-forecast
 *
 * @param {object} req.body - partial Three-Way Forecast inputs (see the model's
 *   `DEFAULTS`): the opening balance sheet, twelve months of sales and purchases, the
 *   overhead set, three term loans, six fixed-asset categories, the debtor and creditor
 *   collection profiles, the GST regime and four shareholder current accounts. Anything
 *   absent computes on the source workbook's own sample figures.
 * @returns {object} { success, data, timestamp } — twelve months of linked profit &
 *   loss, balance sheet and cash flow, with the working schedules behind them,
 *   `balanceSheet.months.balanceCheck` (zero when the statements tie) and the
 *   `corrections` register naming each departure from the source workbook.
 *
 * Anonymous by design: numbers in, numbers out. Only the file-intake routes carry
 * `firmAuth`, because those accept uploads.
 *
 * The model's second parameter is deliberately NOT forwarded — it reproduces the source
 * workbook including its seven known defects and exists only for the golden test.
 * `tests/unit/threeWayForecastModel.test.js` fails the build if that changes.
 */
function threeWayForecast (req, res, next) {
  try {
    const inputs = (req.body && typeof req.body === 'object') ? req.body : {}
    const data = computeThreeWayForecast(inputs)
    res.send(200, { success: true, data, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[report] three-way-forecast compute failed:', err)
    res.send(400, { success: false, error: { code: 'THREE_WAY_FORECAST_COMPUTE_FAILED', message: 'Could not compute the model from the supplied inputs.' }, timestamp: new Date().toISOString() })
  }
  return next()
}

/**
 * POST /api/report/three-way-forecast/three-years
 *
 * @param {object} req.body - `{ years: [year1, year2, year3] }`, each the same shape the
 *   single-year route takes. Every input is per-year in the source workbook, so all
 *   three are supplied rather than a growth rate. **An omitted or partial later year
 *   inherits the year before it** — leaving years 2 and 3 empty forecasts "the same
 *   again" rather than dropping sample figures into a real client's later years.
 * @returns {object} { success, data: { years, summary }, timestamp } — three linked
 *   twelve-month years, plus `summary` with the three-year totals, the closing position
 *   and the lowest cash point across all 36 months with its date.
 *
 * Anonymous by design, like the other calculation routes; only file intake carries
 * `firmAuth`. The model's second parameter is deliberately NOT forwarded.
 */
function threeYearForecast (req, res, next) {
  try {
    const inputs = (req.body && typeof req.body === 'object') ? req.body : {}
    const data = computeThreeYearForecast(inputs)
    res.send(200, { success: true, data, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[report] three-year-forecast compute failed:', err)
    res.send(400, { success: false, error: { code: 'THREE_YEAR_FORECAST_COMPUTE_FAILED', message: 'Could not compute the model from the supplied inputs.' }, timestamp: new Date().toISOString() })
  }
  return next()
}

/**
 * POST /api/report/three-way-forecast/intake  (firmAuth — uploads are never anonymous)
 *
 * Multipart upload of up to three Xero exports (.xlsx or .csv, 5 MB per request) in
 * repeated `file` fields: a Balance Sheet (required — it is what the forecast opens
 * from), a Profit and Loss (optional, seeding the annual cost base), and optionally
 * last year's by-month P&L, whose monthly sales are offered as a STARTING POINT for the
 * forecast rather than as the forecast itself.
 *
 * The distinction matters and the response carries it: `provenance` marks each figure
 * `file`, `seeded` or `entered`. Everything forward-looking — forecast sales and
 * purchases, the mark-up, the collection profiles, depreciation rates, loan terms,
 * capital expenditure — is `entered`, because no accounting export contains a future.
 *
 * Privacy (§3A of the forecast prompt specification, Mike's standard 2026-09-02):
 * shareholder current accounts and term loans come back POSITIONAL AND UNNAMED — the
 * parser never reads those names. Parse-and-discard: temp files are always deleted,
 * nothing is stored, and only the stable error code is ever logged.
 *
 * @returns {object} { success, data: { files, proposal, provenance, blocked, warnings },
 *   timestamp } — `blocked` is a sentence saying why nothing assembled, never a partial
 *   proposal the advisor could mistake for a whole one.
 */
async function threeWayForecastIntake (req, res) {
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
        error: { code: tooBig ? 'FILE_TOO_LARGE' : 'UPLOAD_PARSE_FAILED', message: tooBig ? 'The files together are larger than 5 MB — an accounting export should be well under 1 MB each. Please export again without extra tabs or images.' : 'The upload could not be read. Please try again.' },
        timestamp: new Date().toISOString()
      })
      return
    }

    const field = files && files.file
    uploaded = (Array.isArray(field) ? field : (field ? [field] : [])).filter(f => f && f.filepath)
    if (!uploaded.length) {
      res.send(400, { success: false, error: { code: 'NO_FILE', message: 'No files were attached. Send the Balance Sheet export in a "file" field.' }, timestamp: new Date().toISOString() })
      return
    }
    // Refuse an over-count BEFORE any file is parsed, as the EBITDA intake does; the
    // assembler's own count check stays as the backstop.
    if (uploaded.length > MAX_FORECAST_FILES) {
      const e = new Error('This model reads up to ' + MAX_FORECAST_FILES + ' files — ' + uploaded.length + ' were sent. Please drop a Balance Sheet, a Profit and Loss, and at most one by-month Profit and Loss.')
      e.code = 'TOO_MANY_FILES'
      throw e
    }

    const parsed = uploaded.map(f => parseForecastUpload(fs.readFileSync(f.filepath)))
    const data = assembleForecastIntake(parsed)
    res.send(200, { success: true, data, timestamp: new Date().toISOString() })
  } catch (err) {
    // Log the stable code only — never the filename, labels or content (identity stays local)
    console.error('[report] three-way-forecast intake rejected:', (err && err.code) || 'INTAKE_PARSE_FAILED')
    const safe = intakeErrorResponse(err, 'A file could not be read as an accounting export.')
    res.send(safe.status, safe.body)
  } finally {
    // Parse-and-discard: always remove every temp file formidable wrote
    for (const f of uploaded) {
      if (f && f.filepath) { fs.unlink(f.filepath, () => {}) }
    }
  }
}

/**
 * GET /api/report/model-guide
 *
 * The Model Guide screen's whole content: what each live model is for, the figures it
 * calculates, the reading its Coach panel gives, and what it does not cover.
 *
 * 🔴 IT SERVES THE SAME RECORDS THE AI IS GIVEN, from the same file, deliberately. Ruled by
 * Mike, 2026-08-22: the page is for a firm manager choosing a model *as well as* for the AI
 * guiding an advisor. Two readers, one source — so the screen can never describe a model
 * differently from the way the AI describes it, and neither can go stale while the other
 * moves. `data/report-model-summaries.json` is tied to the catalogue in both directions by
 * `tests/unit/reportModelSummaries.test.js`, which is what makes a NEW model appear here
 * automatically: the build fails until the new model has an entry.
 *
 * No firmAuth, matching the calculation routes above — this is platform content describing
 * the app's own screens. It contains no client data and nothing firm-specific.
 *
 * @returns {object} { success, data: { models }, timestamp } — every live model, in catalogue order.
 */
function modelGuide (req, res, next) {
  try {
    const models = listReportModels()
    res.send(200, { success: true, data: { models }, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[report] model-guide read failed:', err)
    res.send(500, { success: false, error: { code: 'MODEL_GUIDE_UNAVAILABLE', message: 'Could not load the model guide.' }, timestamp: new Date().toISOString() })
  }
  return next()
}

module.exports = { workingCapitalCycle, debtorDrag, marginBreakeven, eightLevers, quickPosition, quickPositionIntake, ebitdaDcf, ebitdaDcfIntake, loanEstimator, leaseVsBuy, costOfCapital, multipleProperty, volatility, volatilityIntake, threeWayForecast, threeYearForecast, threeWayForecastIntake, modelGuide }
