/**
 * @file What ONE asset is carried at in the month it is sold.
 * @module utils/assetBookValue
 *
 * Item **4.65**, question 1, ruled by Mike 2026-09-08: *the book value is depreciated to the
 * month of the sale, and the working is shown.* The schedule gives what an asset was worth at
 * the last balance date; a sale in March happens after January and February have been charged
 * against it, so the year-end figure overstates it — and the loss on sale with it, by more the
 * later in the year the sale falls.
 *
 * 🔴 THE RATE IS THE CATEGORY'S, NEVER THE ASSET'S. Question 4, ruled the same day. The engine
 * depreciates the category POOL at one rate (`server/report/threeWayForecastModel.js`,
 * `assetSchedule`). Valuing one asset inside that pool at a different rate would mean the
 * disposal no longer reconciles with the pool it came out of — the category would drift from
 * the sum of its parts and the forecast would still balance. MYOB supplies a per-asset rate and
 * QuickBooks supplies none, so using MYOB's would also make one business forecast differently
 * depending on which package it happens to run.
 *
 * ⚠ IT MIRRORS THE ENGINE'S ARITHMETIC RATHER THAN CALLING IT. The engine is backend CommonJS
 * and this runs in the browser, so `excelRound` is reproduced here — and
 * `tests/unit/assetBookValue.test.js` asserts the two agree across a range of values, because a
 * silent divergence would put a figure on screen that the forecast then disagrees with.
 */

/**
 * The engine's rounding, reproduced exactly.
 *
 * ⚠ IT ROUNDS TO WHOLE UNITS, not to the penny — every figure in the forecast's asset schedules
 * is a whole number. Copied from `threeWayForecastModel.excelRound`, negative-zero
 * normalisation included: a balance line reading "-0" is a defect.
 *
 * @param {number} x
 * @returns {number}
 */
export function excelRound (x) {
  if (!isFinite(x)) { return x }
  const v = x === 0 ? 0 : Number(x.toPrecision(15))
  const r = v < 0 ? -Math.floor(-v + 0.5) : Math.floor(v + 0.5)
  return r === 0 ? 0 : r
}

/**
 * An asset's book value in the month it is sold, and the working behind it.
 *
 * 🔴 DEPRECIATION IS CHARGED FOR THE MONTHS BEFORE THE SALE, NOT INCLUDING IT. The engine
 * removes a disposal from the pool BEFORE charging that month's depreciation —
 * `subtotal[m] = bookValue[m] + additions[m] - disposals[m]`, then depreciation on the
 * subtotal — so an asset sold in month 3 is written down in months 1 and 2 and no further.
 * Charging the sale month too would understate the book value and overstate the gain.
 *
 * @param {number} openingBookValue - what the schedule says the asset is carried at
 * @param {number} annualRate - the CATEGORY's rate as a fraction, e.g. 0.2 for 20%
 * @param {number} saleMonth - the forecast month of the sale, 1-12
 * @returns {{bookValue: number, monthsCharged: number, depreciation: number, opening: number}}
 */
export function bookValueAtSale (openingBookValue, annualRate, saleMonth) {
  const opening = Number(openingBookValue)
  const rate = Number(annualRate)
  const month = Math.floor(Number(saleMonth))

  if (!isFinite(opening) || !isFinite(rate) || !isFinite(month)) {
    return { bookValue: 0, monthsCharged: 0, depreciation: 0, opening: 0 }
  }

  // A sale in month 1 happens before anything is charged, so the schedule's own figure stands.
  // Anything outside 1-12 is treated as month 1 rather than throwing: a broken month must not
  // cost the advisor a figure, and the screen constrains the input to twelve months anyway.
  const monthsCharged = (month > 1 && month <= 12) ? month - 1 : 0

  let value = opening
  for (let m = 0; m < monthsCharged; m++) {
    value = value - excelRound((value * rate) / 12)
  }

  return {
    bookValue: value,
    monthsCharged,
    depreciation: opening - value,
    opening
  }
}
