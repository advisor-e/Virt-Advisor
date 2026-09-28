'use strict'

/**
 * @file Converting a foreign-currency amount into the firm's own currency, for the
 *   Three-Way Forecast and the shipment calculator that feeds it. Item 13.5.
 * @module server/report/fxConversion
 *
 * Drawing: `design/mockups/three-way-forecast-foreign-currency.html`, approved by Mike
 * 2026-09-26. Accounting basis: `design/CALCULATION-ASSUMPTIONS.md` §1.
 *
 * 🔴 ONE HOME FOR THE ARITHMETIC. The engine converts typed grids, shipments and the
 * opening balance owed; the calculator converts the same shipments for the screen. Two
 * copies of "divide by the rate" is how the advisor gets shown one figure and charged
 * another.
 *
 * THE RATE IS QUOTED THE WAY NZ BANKS QUOTE IT — Mike's ruling of 2026-09-26: "1 NZD buys
 * 0.6000 USD". So a foreign amount DIVIDES by it: 64,585.80 USD at 0.6000 is 107,643.00 NZD.
 *
 * The firm's own currency is the empty code. It is never in the table and is never
 * converted, which is every forecast saved before 13.5.
 */

/** The most currencies one forecast holds — Mike's ruling of 2026-09-26. */
const MAX_CURRENCIES = 3

/** An ISO 4217 code: three capital letters. @param {*} v @returns {boolean} */
function isCode (v) {
  return typeof v === 'string' && /^[A-Z]{3}$/.test(v)
}

/**
 * The "Currencies you trade in" table, cleaned. A row without a code or a positive rate is
 * dropped, a repeated code keeps its first row, and anything past the third is ignored.
 *
 * @param {*} list - `[{ code, rate }]`
 * @returns {Array<{code: string, rate: number}>}
 */
function resolveCurrencies (list) {
  const out = []
  if (!Array.isArray(list)) { return out }
  for (let i = 0; i < list.length && out.length < MAX_CURRENCIES; i++) {
    const row = list[i]
    const code = row && typeof row.code === 'string' ? row.code.trim().toUpperCase() : ''
    const rate = row ? Number(row.rate) : NaN
    if (!isCode(code) || !isFinite(rate) || rate <= 0) { continue }
    if (out.some(function (c) { return c.code === code })) { continue }
    out.push({ code, rate })
  }
  return out
}

/**
 * Which currency an amount is in, as the forecast will treat it.
 *
 * ⚠ A CODE THE TABLE DOES NOT HOLD IS REPORTED, NOT GUESSED. It happens when a currency is
 * removed from the table after a shipment chose it. Treating the amount as the firm's own
 * currency is the only figure the engine can compute, and the caller is told so through
 * `known: false`, so the report can say which amount was not converted.
 *
 * @param {*} code
 * @param {Array<{code: string, rate: number}>} table - from `resolveCurrencies`
 * @returns {{code: string, rate: number, known: boolean}} rate 1 for the firm's own currency
 */
function currencyOf (code, table) {
  if (!code) { return { code: '', rate: 1, known: true } }
  const c = String(code).trim().toUpperCase()
  for (let i = 0; i < table.length; i++) {
    if (table[i].code === c) { return { code: c, rate: table[i].rate, known: true } }
  }
  return { code: c, rate: 1, known: false }
}

/**
 * A foreign amount in the firm's own currency.
 * @param {number} amount @param {{rate: number}} currency - from `currencyOf`
 * @returns {number}
 */
function toHome (amount, currency) {
  return amount / currency.rate
}

/**
 * The same table with every rate moved together — the "what if the exchange rate moves"
 * setting (Mike's ruling of 2026-09-26: one setting per side moves every rate).
 *
 * A NEGATIVE MOVE IS THE NZ DOLLAR FALLING: 1 NZD buys less, so every foreign amount costs
 * more. `move` is a share, -0.1 for a 10% fall.
 *
 * @param {Array<{code: string, rate: number}>} table @param {number} move
 * @returns {Array<{code: string, rate: number}>}
 */
function movedRates (table, move) {
  return table.map(function (c) { return { code: c.code, rate: c.rate * (1 + move) } })
}

module.exports = {
  MAX_CURRENCIES,
  isCode,
  resolveCurrencies,
  currencyOf,
  toHome,
  movedRates
}
