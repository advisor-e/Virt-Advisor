'use strict'

const { computeMarginMarkup, priceFromMarkup, requiredSales, whatIfPrice } = require('../../server/report/marginBreakevenModel')

/**
 * Golden values from the source spreadsheets, verified 2026-07-09:
 *  - GE.Margin - Markup - Breakeven Calculator.xlsx (margin/mark-up + break-even)
 *  - Break-Even_.xlsx ("Input" + "What If Price")
 */
describe('Margin · Mark-up · Break-even — golden values', () => {
  test('margin vs mark-up (price 230, cost 50) — GE calculator', () => {
    const r = computeMarginMarkup(50, 230)
    expect(r.grossProfit).toBeCloseTo(180, 6)
    expect(r.marginPct).toBeCloseTo(0.7826086957, 8) // GP / sale
    expect(r.markup).toBeCloseTo(3.6, 8) // GP / cost
    expect(r.costOfSalesPct).toBeCloseTo(0.2173913043, 8)
  })

  test('price from a target mark-up (cost 50, mark-up 3.6) → 230', () => {
    const r = priceFromMarkup(50, 3.6)
    expect(r.price).toBeCloseTo(230, 6)
    expect(r.marginPct).toBeCloseTo(0.7826086957, 8)
  })

  test('break-even = (overheads + owner salary) / margin — GE calculator', () => {
    expect(requiredSales(100000, 100000, 0.5)).toBeCloseTo(400000, 2)
  })

  test('monthly break-even from fixed costs ÷ GP% — Break-Even_ Input', () => {
    // GP% = (17500-6800)/17500 = 0.6114285714 ; break-even = 4125 / GP%
    const gpPct = (17500 - 6800) / 17500
    expect(gpPct).toBeCloseTo(0.6114285714, 8)
    expect(requiredSales(4125, 0, gpPct)).toBeCloseTo(6746.495327, 2)
  })
})

describe('What If Price — matches the source table (price 250, cost 33%, overheads 11500, target 8600)', () => {
  const base = { price: 250, costOfSalesPct: 0.33, overheads: 11500, ownerDrawings: 8600 }

  test('price reduced 4% → 240, and 30,628.57 sales / 127.62 units required', () => {
    const r = whatIfPrice(Object.assign({}, base, { priceChangePct: -0.04 }))
    expect(r.newPrice).toBeCloseTo(240, 6)
    expect(r.newMarginPct).toBeCloseTo(0.65625, 6)
    expect(r.salesRequired).toBeCloseTo(30628.57143, 2)
    expect(r.unitsRequired).toBeCloseTo(127.6190476, 4)
  })

  test('price increased 50% → 375, and only 25,769.23 sales / 68.72 units required', () => {
    const r = whatIfPrice(Object.assign({}, base, { priceChangePct: 0.5 }))
    expect(r.newPrice).toBeCloseTo(375, 6)
    expect(r.newMarginPct).toBeCloseTo(0.78, 6)
    expect(r.salesRequired).toBeCloseTo(25769.23077, 2)
    expect(r.unitsRequired).toBeCloseTo(68.71794872, 4)
  })

  test('no change reproduces the base margin and target sales', () => {
    const r = whatIfPrice(Object.assign({}, base, { priceChangePct: 0 }))
    expect(r.newMarginPct).toBeCloseTo(0.67, 6) // (250-82.5)/250
    expect(r.salesRequired).toBeCloseTo(30000, 2) // 20100 / 0.67
  })
})

describe('Margin · Mark-up — behaviour', () => {
  test('a price rise lowers the sales/units you must do to hit the same target', () => {
    const base = { price: 250, costOfSalesPct: 0.33, overheads: 11500, ownerDrawings: 8600 }
    const up = whatIfPrice(Object.assign({}, base, { priceChangePct: 0.1 }))
    const flat = whatIfPrice(Object.assign({}, base, { priceChangePct: 0 }))
    expect(up.unitsRequired).toBeLessThan(flat.unitsRequired)
  })

  test('markup is always a bigger number than margin for the same deal', () => {
    const r = computeMarginMarkup(50, 230)
    expect(r.markup).toBeGreaterThan(r.marginPct)
  })
})
