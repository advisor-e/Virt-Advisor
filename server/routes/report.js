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
const { computeMultiplePropertyAssessment } = require('../report/multiplePropertyModel')
const { computeCostOfCapital } = require('../report/costOfCapitalModel')
const { parseUpload } = require('../report/intake/xeroReportParser')
const { assembleAnnualReports, MAX_FILES } = require('../report/intake/annualAssembler')
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
        error: { code: tooBig ? 'FILE_TOO_LARGE' : 'UPLOAD_PARSE_FAILED', message: tooBig ? 'The files together are larger than 5 MB — a Xero report export should be well under 1 MB each. Please export again without extra tabs or images.' : 'The upload could not be read. Please try again.' },
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
    const safe = intakeErrorResponse(err, 'A file could not be read as a Xero report export.')
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
function multipleProperty (req, res, next) {
  try {
    const inputs = (req.body && typeof req.body === 'object') ? req.body : {}
    const data = computeMultiplePropertyAssessment(inputs)
    res.send(200, { success: true, data, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[report] multiple-property compute failed:', err)
    res.send(400, { success: false, error: { code: 'MULTIPLE_PROPERTY_COMPUTE_FAILED', message: 'Could not compute the model from the supplied inputs.' }, timestamp: new Date().toISOString() })
  }
  return next()
}

module.exports = { workingCapitalCycle, debtorDrag, marginBreakeven, eightLevers, quickPosition, quickPositionIntake, ebitdaDcf, ebitdaDcfIntake, loanEstimator, leaseVsBuy, costOfCapital, multipleProperty }
