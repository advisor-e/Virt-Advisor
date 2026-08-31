'use strict'

/**
 * @file The real figures behind each model's Coach reading.
 * @module server/utils/reportModelFigures
 *
 * To-do item 4.34. Raised by Mike on 2026-08-22, reading the built Model Guide:
 * *"it makes this section worthless"*.
 *
 * 🔴 THE FAULT THIS CLOSES. `data/report-model-summaries.json` stores each model's Coach
 * reading as a SENTENCE WITH ITS NUMBERS REMOVED — "your [working capital] of working
 * capital … takes [n] days … about [amount] more revenue a year" — because the figures are
 * computed when the screen runs. `components/ModelGuide.vue` printed those lines verbatim,
 * so a firm manager choosing a model got the shape of the reading and none of its
 * substance, and **the AI was handed the same bracketed text**. This module supplies the
 * numbers, and the two readers now resolve the same sentence from the same figures.
 *
 * 🔴 IT INVENTS NO ARITHMETIC. Every value below is read straight out of the same model
 * function the screen's own route calls, run on that model's own defaults — so the guide
 * shows what the screen shows on load, and cannot drift from it. Where a reading needed a
 * derivation that only existed inside a `.vue` file, THE DERIVATION WAS MOVED INTO THE
 * MODEL (`workingCapitalCycleModel.fasterCycle`, `ebitdaDcfModel`'s `dipYear` /
 * `terminalShare`) and the screen now reads it from there too. Copying those sums here
 * would have been the same defect in a new place.
 *
 * ⚠ NUMBERS ONLY — NEVER FORMATTED TEXT. Money is currency- and locale-dependent, and
 * `mixins/currencyMixin.js` is the one formatter every report screen uses. Each figure
 * carries a `format` tag and its raw value; the reader formats. The screen formats in the
 * firm's currency; `reportModels.formatReportModelsForPrompt()` formats in the platform
 * default for the AI, which has no firm context.
 *
 * ⚠ A MODEL WITH NO ENTRY HERE IS NOT AN ERROR — several Coach entries describe the
 * pattern of a verdict rather than one reading ("returns one of three verdicts…") and
 * carry no tokens at all. What IS an error is a token with no figure, and
 * `tests/unit/reportModelFigures.test.js` fails the build on one.
 *
 * Node 14, CommonJS.
 */

const { computeWorkingCapitalCycle } = require('../report/workingCapitalCycleModel')
const { computeDebtorCashflow } = require('../report/debtorDragModel')
const { computeEbitdaDcf } = require('../report/ebitdaDcfModel')
const { computeQuickPosition } = require('../report/quickPositionModel')
const { computeLeaseVsBuy } = require('../report/leaseVsBuyModel')
const { computeVolatility, DEFAULT_INPUTS: VOL_DEFAULTS } = require('../report/volatilityModel')
const {
  computeMarginMarkup,
  requiredSales,
  DEFAULTS: MARGIN_DEFAULTS
} = require('../report/marginBreakevenModel')

/**
 * Month labels for the Debtor Drag reading.
 *
 * ⚠ A THIRD COPY OF THE SAME TWELVE STRINGS — `components/DebtorDragReport.vue` and
 * `components/FirmManagerHub.vue` each hold one. It is duplicated rather than shared
 * because the model returns a month INDEX and the screen's own labels are plain English
 * constants, not locale entries; consolidating them is a wider change than this item.
 * `tests/unit/reportModelFigures.test.js` pins this list to the screen's, so the
 * duplication is guarded rather than silent.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * How a figure is written out. The reader owns the formatting; this only says which kind.
 *
 *   money      — the firm's currency, whole units          "$120"
 *   number     — a grouped whole number                    "5"
 *   number1     — one decimal place                         "1.5"
 *   percent1   — a fraction as a percentage, one decimal   "53.7%"
 *   percentInt — a fraction as a whole percentage          "5%"
 *   plain      — printed as-is, never grouped              "2024", "2"
 *   text       — an already-final word                     "May"
 *
 * `plain` exists for the year: grouping would render 2024 as "2,024".
 */

/** @param {number|string} value @param {string} format @returns {{value: *, format: string}} */
function fig (value, format) {
  return { value, format }
}

/**
 * Every Coach figure, keyed by the model's route then by the token name used in
 * `data/report-model-summaries.json`.
 *
 * Each model is computed once, from its own defaults, exactly as an advisor opening the
 * screen would see it.
 *
 * @returns {Object<string, Object<string, {value: *, format: string}>>}
 */
function computeCoachFigures () {
  const out = {}

  // ── Working Capital Cycle ──────────────────────────────────────────────────────────
  const wcc = computeWorkingCapitalCycle({})
  out['/business-performance-report'] = {
    workingCapital: fig(wcc.workingCapital, 'money'),
    cycleDays: fig(Math.round(wcc.cycleDays), 'number'),
    cycleFactor: fig(wcc.cycleFactorMonthly, 'number1'),
    fasterDays: fig(wcc.fasterCycle.days, 'number'),
    fasterFactor: fig(wcc.fasterCycle.factor, 'number1'),
    fasterExtra: fig(wcc.fasterCycle.extraAnnualRevenue, 'money')
  }

  // ── Debtor Business Drag ───────────────────────────────────────────────────────────
  const ddg = computeDebtorCashflow({})
  out['/debtor-drag'] = {
    deepestLow: fig(ddg.deepestLow.value, 'money'),
    deepestLowMonth: fig(MONTHS[ddg.deepestLow.month] || '', 'text'),
    monthsInOverdraft: fig(ddg.monthsInOverdraft, 'number')
  }

  // ── EBITDA & Discounted Cash Flow ──────────────────────────────────────────────────
  const dcf = computeEbitdaDcf({})
  const ebitdaSeries = dcf.pnl.ebitda
  out['/ebitda-dcf'] = {
    years: fig(dcf.years.length, 'number'),
    from: fig(ebitdaSeries[0], 'money'),
    to: fig(ebitdaSeries[ebitdaSeries.length - 1], 'money'),
    avgGrowth: fig(dcf.valuation.averageActualGrowth, 'percent1'),
    enterpriseValue: fig(dcf.valuation.enterpriseValue, 'money'),
    dipYear: fig(dcf.valuation.dipYear, 'plain'),
    dipGrowth: fig(dcf.valuation.dipGrowth, 'percent1'),
    exitMultiple: fig(dcf.valuation.exitMultiple, 'plain'),
    terminalShare: fig(dcf.valuation.terminalShare, 'percent1')
  }

  // ── Margin · Mark-up · Break-even ──────────────────────────────────────────────────
  //
  // ⚠ THE ONE MODEL CALLED WITH EXPLICIT INPUTS. Its route applies no defaults — see the
  // note on `DEFAULTS` in `server/report/marginBreakevenModel.js` — so an empty request
  // computes zeros. Passing the screen's own sample figures is what makes this reading
  // the reading the screen actually gives.
  const mm = computeMarginMarkup(MARGIN_DEFAULTS.cost, MARGIN_DEFAULTS.price)
  out['/margin-breakeven'] = {
    margin: fig(mm.marginPct, 'percentInt'),
    markup: fig(mm.markup, 'percentInt'),
    overheads: fig(MARGIN_DEFAULTS.overheads, 'money'),
    drawings: fig(MARGIN_DEFAULTS.ownerDrawings, 'money'),
    requiredSales: fig(
      requiredSales(MARGIN_DEFAULTS.overheads, MARGIN_DEFAULTS.ownerDrawings, mm.marginPct),
      'money'
    )
  }

  // ── Quick Position ─────────────────────────────────────────────────────────────────
  const qp = computeQuickPosition({})
  out['/quick-position'] = {
    monthsZeroSales: fig(qp.expenseCyclesZeroSales, 'number1'),
    monthsWithLifeline: fig(qp.tradingCyclesWithLifeline, 'number1'),
    breakEvenSales: fig(qp.breakEvenSalesRequired, 'money'),
    // The screen prints the discount straight off its slider ("5%"), not to one decimal.
    discount: fig(qp.discountExample.discountPct, 'percentInt'),
    salesIncrease: fig(qp.salesIncreaseToMaintainGM, 'percent1')
  }

  // ── Lease vs Buy ───────────────────────────────────────────────────────────────────
  const lvb = computeLeaseVsBuy({})
  out['/lease-vs-buy'] = {
    saving: fig(lvb.verdict.saving, 'money')
  }

  // ── Volatility Report ──────────────────────────────────────────────────────────────
  // The screen's own default: the workbook's 24 months, measured over the most recent 12.
  const vol = computeVolatility({ sales: VOL_DEFAULTS.sales, window: 12 })
  out['/volatility'] = {
    n: fig(vol.insideFirstBand, 'plain'),
    of: fig(vol.monthsUsed, 'plain'),
    // The screen prints the share as a whole number beside the model's expected 68%.
    pct: fig(Math.round(vol.insideFirstBandPct), 'plain')
  }

  return out
}

module.exports = { computeCoachFigures, MONTHS }
