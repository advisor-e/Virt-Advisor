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
 * Margin vs mark-up from a cost and a sale price.
 * @param {number} cost - unit cost.
 * @param {number} price - sale price.
 * @returns {{grossProfit:number, marginPct:number, markup:number, costOfSalesPct:number}}
 */
function computeMarginMarkup (cost, price) {
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
  const costPerUnit = p.price * p.costOfSalesPct // $ cost per unit — fixed as price changes
  const newPrice = p.price * (1 + p.priceChangePct)
  const newMarginPct = newPrice ? (newPrice - costPerUnit) / newPrice : 0
  const gpTarget = p.overheads + p.ownerDrawings
  const salesRequired = newMarginPct ? gpTarget / newMarginPct : 0
  const unitsRequired = newPrice ? salesRequired / newPrice : 0
  return { newPrice, newMarginPct, salesRequired, unitsRequired, costPerUnit }
}

module.exports = { computeMarginMarkup, priceFromMarkup, requiredSales, whatIfPrice }
