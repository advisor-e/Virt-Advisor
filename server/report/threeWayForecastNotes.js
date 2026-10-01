'use strict'

/**
 * The facts behind a Three-Way Forecast's "Notes to the forecast" (item 44.1, drawing approved
 * by Mike 2026-09-30: design/mockups/three-way-forecast-notes.html).
 *
 * The notes are each forecast's OWN: a sentence that does not apply is left out, and a sentence
 * that depends on what was entered reads it — so the notes can never contradict the forecast
 * they sit in. Which sentences apply is decided HERE, from the inputs the model actually ran
 * on, never on the screen: it is business logic, and a figure the screen re-derived could
 * disagree with the engine.
 *
 * `facts` answers the drawing's 26 rules; `assumptions` is Note 2 — the figures as entered.
 * Neither changes any figure in the forecast.
 *
 * Pure, side-effect free, backend-only. CommonJS for Node 14.15.
 */

const sum = function (list) { return list.reduce(function (a, v) { return a + v }, 0) }
const any = function (list) { return Array.isArray(list) && list.some(function (v) { return v > 0 }) }

/**
 * What a collection profile never collects, to four places — null when it totals 100%, by the
 * same tolerance `uncollectedShare` in threeWayForecastModel.js charges by.
 * @param {number} collected the profile's buckets, summed @returns {number|null}
 */
function gapOf (collected) {
  const gap = collected < 1 - 1e-9 ? Math.round((1 - collected) * 10000) / 10000 : 0
  return gap > 0 ? gap : null
}

/** A funding line that carries money this year: a balance at the start, or a drawdown. */
function inUse (loan) { return loan.opening > 0 || any(loan.drawdowns) }

/**
 * Does any imported stock sell for less than it cost? Each 30-day band of the sell-down sells
 * at its own mark-up on the goods; the stock's cost is the goods plus freight and duty. A band
 * the curve never reaches is not a price anybody sells at, so it is not counted.
 * @param {object} O the resolved `overseas` block @returns {boolean}
 */
function sellsBelowCost (O) {
  const curve = O.sellDown.curve || []
  const cost = 1 + O.freightPct + O.dutyPct
  for (let b = 0; b < curve.length; b++) {
    if (!(curve[b] > 0)) { continue }
    const days = (b + 1) * 30
    const markup = days <= O.sellDown.newUpToDays
      ? O.sellDown.newMarkup
      : (days <= O.sellDown.standardUpToDays ? O.sellDown.standardMarkup : O.sellDown.runoutMarkup)
    if (1 + markup < cost) { return true }
  }
  return false
}

/**
 * @param {object} I the inputs `computeThreeWayForecast` resolved and ran on
 * @param {string} startIso the forecast's first month, as the model dated it
 * @returns {{facts: object, assumptions: object}}
 */
function forecastNotes (I, startIso) {
  const O = I.overseas
  const imports = O.enabled && (any(O.importedPurchases) || (Array.isArray(O.landings) && O.landings.length > 0))
  const exports = O.enabled && any(O.overseasSales)
  const inTransit = I.openingBalanceSheet.stockInTransitDeposits > 0
  const loans = I.loans.filter(inUse)
  const collected = sum(O.overseasCollection)
  const collectedLocally = sum(I.debtorCollection)
  const facts = {
    imports,
    exports,
    inTransit,
    fx: I.currencies.length > 0,
    belowCost: imports && sellsBelowCost(O),
    termLoans: loans.some(function (l) { return l.type !== 'facility' }),
    facilities: loans.some(function (l) { return l.type === 'facility' }),
    // A profile with nothing after the first month: the opening balance is settled in month 1.
    sameMonthDebtors: sum(I.debtorCollection.slice(1)) === 0,
    sameMonthCreditors: sum(I.creditorPayment.slice(1)) === 0,
    // The share of local and of overseas sales each profile never collects: the bad debt the
    // model charges (item 44.3). Null when there is none.
    // The same test the model charges by, so the notes never miss a charge it makes.
    localGap: gapOf(collectedLocally),
    overseasGap: exports ? gapOf(collected) : null
  }
  const assumptions = {
    startIso,
    markup: I.markup,
    salesTotal: sum(I.sales),
    purchasesTotal: sum(I.purchases),
    debtorCollection: I.debtorCollection.slice(),
    creditorPayment: I.creditorPayment.slice(),
    directCostRates: Object.assign({}, I.directCostRates),
    overheadsTotal: sum(Object.keys(I.overheads).map(function (k) { return I.overheads[k] })),
    gstRate: I.gstRate,
    gstFilingMonths: I.gstFilingMonths,
    gstBasis: I.gstBasis,
    taxRate: I.taxRate,
    overdraftInterestRate: I.overdraftInterestRate,
    inFundsInterestRate: I.inFundsInterestRate,
    shareholderInterestRate: I.shareholderInterestRate,
    assets: I.assets.map(function (a) { return { key: a.key, opening: a.opening, depreciationRate: a.depreciationRate } }),
    loans: loans.map(function (l) {
      return { name: l.name, type: l.type, opening: l.opening, interestRate: l.interestRate, monthlyRepayment: l.monthlyRepayment }
    }),
    // Overseas trade, only when there is some — Note 2 lists only what this forecast uses.
    currencies: I.currencies.map(function (c) { return { code: c.code, rate: c.rate } }),
    overseas: !(imports || exports)
      ? null
      : {
          depositPct: O.depositPct,
          freightPct: O.freightPct,
          dutyPct: O.dutyPct,
          newMarkup: O.sellDown.newMarkup,
          standardMarkup: O.sellDown.standardMarkup,
          runoutMarkup: O.sellDown.runoutMarkup,
          overseasCollection: O.overseasCollection.slice(),
          fxAllowancePct: O.fxAllowancePct,
          salesFxAllowancePct: O.salesFxAllowancePct
        }
  }
  return { facts, assumptions }
}

/**
 * Note 2's "Later years" (drawing revised and approved 2026-09-30): each later year's change
 * on the year before, read from the figures each year actually ran on. Quick-fire's "Sales
 * growth" and "Overheads increase" are the model's inflation-like inputs; the step 4 sliders
 * scale a year too; a year left alone repeats the one before. Reading the result covers all
 * three, so the note can never say "no inflation" of a forecast that grows.
 *
 * @param {Array<object>} years each year's model result, in order
 * @returns {Array<{year: number, salesChange: number|null, overheadsChange: number|null, markup: number, same: boolean}>}
 *   a change is null where the year before had nothing to grow from
 */
function laterYearChanges (years) {
  const out = []
  for (let i = 1; i < years.length; i++) {
    const a = years[i].notes.assumptions
    const b = years[i - 1].notes.assumptions
    const change = function (now, before) { return before ? Math.round((now / before - 1) * 10000) / 10000 : null }
    const salesChange = change(a.salesTotal, b.salesTotal)
    const overheadsChange = change(a.overheadsTotal, b.overheadsTotal)
    out.push({
      year: i + 1,
      salesChange,
      overheadsChange,
      markup: a.markup,
      same: !salesChange && !overheadsChange && a.markup === b.markup
    })
  }
  return out
}

module.exports = { forecastNotes, sellsBelowCost, laterYearChanges }
