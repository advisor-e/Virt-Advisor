'use strict'

/**
 * Margin · Mark-up · Break-even model — calculation engine.
 *
 * Faithful port of two source models:
 *   - `GE.Margin - Markup - Breakeven Calculator.xlsx` (margin vs mark-up; break-even =
 *     (overheads + owner's salary) / margin)
 *   - `Break-Even_.xlsx` ("Input": break-even from fixed costs ÷ GP%; "What If Price":
 *     how a price / margin change swings the sales volume needed to hold the profit target)
 *
 * The unifying idea: **required sales = (overheads + owner's drawings) ÷ margin.** Break-even
 * is that with drawings = the owner's target salary; the what-if shows how changing price
 * changes the margin, and so the level of business activity needed to support the decision.
 *
 * Pure, side-effect free, backend-only per the Stack Constitution. Validated against the
 * spreadsheets' own values (see the golden test).
 */

/**
 * Coerce a value to a finite number (accepts JSON-string numbers), else 0.
 * The route receives raw JSON, so a numeric field arriving as text must not
 * string-concatenate or become NaN.
 * @param {*} v @returns {number}
 */
function num (v) {
  if (typeof v === 'number') { return Number.isFinite(v) ? v : 0 }
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Margin vs mark-up from a cost and a sale price.
 * @param {number} cost - unit cost.
 * @param {number} price - sale price.
 * @returns {{grossProfit:number, marginPct:number, markup:number, costOfSalesPct:number}}
 */
function computeMarginMarkup (cost, price) {
  cost = num(cost); price = num(price)
  const grossProfit = price - cost
  return {
    grossProfit,
    marginPct: price ? grossProfit / price : 0, // margin = GP / SALE price
    markup: cost ? grossProfit / cost : 0, // mark-up = GP / COST price
    costOfSalesPct: price ? cost / price : 0
  }
}

/**
 * The price implied by a target mark-up.
 * @param {number} cost
 * @param {number} markup - as a multiple (e.g. 3.6 = 360%).
 * @returns {{price:number, marginPct:number}}
 */
function priceFromMarkup (cost, markup) {
  cost = num(cost); markup = num(markup)
  const price = cost + (cost * markup)
  return { price, marginPct: price ? (price - cost) / price : 0 }
}

/**
 * Sales needed to cover overheads plus the owner's drawings at a given margin.
 * This is the break-even (drawings = target salary) and the target-sales engine both.
 * @param {number} overheads
 * @param {number} ownerSalary - owner's salary / drawings target.
 * @param {number} marginPct - gross margin as a fraction.
 * @returns {number} sales required.
 */
function requiredSales (overheads, ownerSalary, marginPct) {
  overheads = num(overheads); ownerSalary = num(ownerSalary); marginPct = num(marginPct)
  return marginPct ? (overheads + ownerSalary) / marginPct : 0
}

/**
 * What-If-Price: change the price (up or down) and see the new margin and the sales the
 * business must do to still cover overheads + the owner's drawings.
 * @param {object} p
 * @param {number} p.price - current sale price.
 * @param {number} p.costOfSalesPct - cost of sales as a fraction of the current price.
 * @param {number} p.overheads
 * @param {number} p.ownerDrawings - overheads + drawings = the gross-profit target to hold.
 * @param {number} p.priceChangePct - e.g. -0.04, +0.5.
 * @returns {{newPrice:number, newMarginPct:number, salesRequired:number, unitsRequired:number, costPerUnit:number}}
 */
function whatIfPrice (p) {
  p = p || {}
  const price = num(p.price)
  const costOfSalesPct = num(p.costOfSalesPct)
  const priceChangePct = num(p.priceChangePct)
  const costPerUnit = price * costOfSalesPct // $ cost per unit — fixed as price changes
  const newPrice = price * (1 + priceChangePct)
  const newMarginPct = newPrice ? (newPrice - costPerUnit) / newPrice : 0
  const gpTarget = num(p.overheads) + num(p.ownerDrawings)
  const salesRequired = newMarginPct ? gpTarget / newMarginPct : 0
  const unitsRequired = newPrice ? salesRequired / newPrice : 0
  return { newPrice, newMarginPct, salesRequired, unitsRequired, costPerUnit }
}

/**
 * The sample figures the screen opens on.
 *
 * 🔴 WHY THIS EXISTS HERE (to-do item 4.34, 2026-08-22). Every other model in this folder
 * carries its own defaults and answers a request with an empty body by computing the
 * sample scenario. This one did not: its defaults lived only in
 * `components/MarginBreakevenReport.vue`, so anything asking the backend what this model
 * shows got a page of zeros. That is why the Model Guide could not quote its reading.
 *
 * ⚠ THE ROUTE IS DELIBERATELY NOT CHANGED to fall back on these. `POST /api/report/
 * margin-breakeven` reads `+i.overheads || 0`, and its overheads and drawings sliders both
 * start at zero — so "missing" and "the user dragged it to nothing" are the same value on
 * the wire, and defaulting there would silently overwrite a real choice. The screen always
 * sends every field. These are for readers that have no inputs to send at all.
 *
 * `tests/unit/reportModelFigures.test.js` holds them to the component's own DEFAULTS line,
 * so the two copies cannot drift.
 */
const DEFAULTS = { price: 250, cost: 82.5, overheads: 11500, ownerDrawings: 8600, priceChangePct: 0 }

module.exports = { computeMarginMarkup, priceFromMarkup, requiredSales, whatIfPrice, DEFAULTS }
