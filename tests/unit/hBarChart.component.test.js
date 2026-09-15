/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const HBarChart = require('../../components/base/HBarChart.vue').default

/**
 * HBarChart — drawing left of zero, added 2026-09-15 on Mike's ruling.
 *
 * 🔴 THE FAULT. It clamped with `Math.max(value, 0)` while its LABEL printed the true figure,
 * so a negative drew as NO BAR AT ALL with "-$500" sitting beside the empty row.
 *
 * ⚠ HOW REACHABLE IT WAS, ESTABLISHED BEFORE THE FIX RATHER THAN ASSUMED. Four of the five
 * call sites are stock values and cannot go negative. The fifth is the sensitivity levers,
 * and `computeProfitSensitivity` guards better than feared: it blocks on `NO_REVENUE` and
 * `NO_CONTRIBUTION`, so no-revenue and selling-below-cost never render, and a merely
 * loss-making business produces four POSITIVE levers because they measure the size of an
 * effect rather than a profit. What stays reachable is a negative expense line in a client's
 * accounts export — proved to yield a negative lever. An anomaly, not a bad year; fixed in
 * the component because this app reads exports it does not control.
 *
 * Two jobs, and the first matters as much as the second:
 *   1. PROVE NOTHING MOVES FOR THE FOUR POSITIVE-ONLY SCREENS.
 *   2. Prove a negative now draws, on the correct side, with its figure clear of the row name.
 */

const PLOT_LEFT = 106

function chart (bars, extra) {
  return mountWithBuefy(HBarChart, {
    propsData: Object.assign({ bars, formatValue: v => String(Math.round(v)) }, extra || {})
  }).vm
}

describe('nothing negative — the four stock screens must not move', () => {
  const bars = [
    { label: 'Raw', value: 40000, colour: '#0070c0' },
    { label: 'WIP', value: 25000, colour: '#00b1e0' },
    { label: 'Finished', value: 10000, colour: '#4ca52d' }
  ]

  it('keeps zero at the old fixed left edge', () => {
    expect(chart(bars).zeroX).toBe(PLOT_LEFT)
    expect(chart(bars).hasNegative).toBe(false)
  })

  it('draws every bar at exactly the OLD width expression, (value / max) * maxWidth', () => {
    const vm = chart(bars, { maxWidth: 340 })
    const max = 40000
    vm.rows.forEach((row, i) => {
      expect(row.w).toBeCloseTo((bars[i].value / max) * 340, 9)
      expect(row.x).toBe(PLOT_LEFT)
    })
  })

  it('keeps every figure just past the end of its own bar, as before', () => {
    const vm = chart(bars)
    vm.rows.forEach((row) => {
      expect(row.labelX).toBeCloseTo(PLOT_LEFT + row.w + 8, 9)
    })
  })

  it('honours the caller maxWidth, which exists to leave room for the figure', () => {
    const vm = chart(bars, { maxWidth: 220 })
    expect(Math.max(...vm.rows.map(r => r.w))).toBeCloseTo(220, 9)
  })

  it('an all-zero chart keeps a finite layout rather than dividing by nothing', () => {
    const vm = chart([{ label: 'none', value: 0 }])
    expect(vm.zeroX).toBe(PLOT_LEFT)
    expect(vm.rows[0].w).toBe(0)
    expect(Number.isFinite(vm.rows[0].labelX)).toBe(true)
  })
})

describe('a negative lever — what used to draw as nothing at all', () => {
  // The shape proved reachable: a credit posted to cost of sales makes that lever negative.
  const bars = [
    { label: 'Price', value: 10000, colour: '#0070c0' },
    { label: 'Volume', value: 10500, colour: '#00b1e0' },
    { label: 'Overheads', value: 2800, colour: '#4ca52d' },
    { label: 'Cost of sales', value: -500, colour: '#ff9900' }
  ]

  it('🔴 GIVES THE NEGATIVE A REAL BAR, not an empty row', () => {
    expect(chart(bars).rows[3].w).toBeGreaterThan(0)
  })

  it('draws it to the LEFT of the zero line, never to the right', () => {
    const vm = chart(bars)
    const row = vm.rows[3]
    expect(row.x).toBeLessThan(vm.zeroX)
    expect(row.x + row.w).toBeCloseTo(vm.zeroX, 9)
  })

  it('scales it against the same range as the positive bars', () => {
    const vm = chart(bars, { maxWidth: 280 })
    const range = 10500 - -500
    expect(vm.rows[3].w).toBeCloseTo((500 / range) * 280, 9)
    expect(vm.rows[1].w).toBeCloseTo((10500 / range) * 280, 9)
  })

  it('shifts the zero line right to make room, and shows it', () => {
    const vm = chart(bars)
    expect(vm.hasNegative).toBe(true)
    expect(vm.zeroX).toBeGreaterThan(PLOT_LEFT)
  })

  it('🔴 KEEPS THE FIGURE CLEAR OF THE ROW NAME', () => {
    // The row's own name is drawn ending at x=96. A negative figure placed beyond the bar's
    // LEFT end would print over it at full extent, so it sits right of the zero line where
    // the row is empty.
    const vm = chart(bars)
    expect(vm.rows[3].labelX).toBeGreaterThan(96)
    expect(vm.rows[3].labelX).toBeCloseTo(vm.zeroX + 8, 9)
  })

  it('still prints the true figure, negative sign and all', () => {
    expect(chart(bars).rows[3].text).toBe('-500')
  })
})

describe('the edges', () => {
  it('keeps every bar inside the plot when values run both ways', () => {
    const vm = chart([
      { label: 'up', value: 100 },
      { label: 'down', value: -100 }
    ], { maxWidth: 340 })
    vm.rows.forEach((row) => {
      expect(row.x).toBeGreaterThanOrEqual(PLOT_LEFT - 0.001)
      expect(row.x + row.w).toBeLessThanOrEqual(PLOT_LEFT + 340 + 0.001)
    })
  })

  it('handles every value being negative', () => {
    const vm = chart([{ label: 'a', value: -20 }, { label: 'b', value: -50 }], { maxWidth: 340 })
    // Zero goes to the far right and the bars hang back from it.
    expect(vm.zeroX).toBeCloseTo(PLOT_LEFT + 340, 9)
    expect(vm.rows[1].w).toBeGreaterThan(vm.rows[0].w)
  })

  it('holds a missing value at zero width and prints nothing for it', () => {
    const vm = chart([{ label: 'partial', value: null }])
    expect(vm.rows[0].w).toBe(0)
    expect(vm.rows[0].text).toBe('')
  })

  it('survives no bars at all', () => {
    const vm = chart([])
    expect(vm.rows).toEqual([])
    expect(Number.isFinite(vm.zeroX)).toBe(true)
  })
})
