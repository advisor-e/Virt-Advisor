/**
 * @jest-environment jsdom
 */
'use strict'

const { mountWithBuefy } = require('../helpers/mountComponent')
const BarPairChart = require('../../components/base/BarPairChart.vue').default

/**
 * BarPairChart — the zero line, added 2026-09-15 on Mike's ruling.
 *
 * 🔴 THE FAULT THIS CLOSES. The chart used to clamp every value with `Math.max(value, 0)`
 * while its LABEL printed the true figure. A loss therefore drew as a bar of height zero
 * sitting on the axis — visually identical to breaking even — with the real negative figure
 * written beside it. Two client-facing screens were live with it:
 *
 *   · `DashboardReportProfitLoss` feeds `netProfit`, negative for any loss-making year.
 *   · `DashboardReportCashFlow` feeds the closing bank balance. In overdraft BOTH bars went
 *     to zero and, with no positive value anywhere, the old scale fell back to `max = 1`, so
 *     the gridlines were meaningless too — a blank chart on the page about cash.
 *
 * This file has two jobs and the first matters as much as the second:
 *
 *   1. PROVE THE CHANGE IS INVISIBLE TO EVERY POSITIVE CHART. Six screens use this
 *      component and none of them asked for a fix. The first block pins the old arithmetic
 *      expression against the new geometry so a working screen cannot move by accident.
 *   2. Prove a negative now draws below the line, on the correct side, with its label clear
 *      of the axis.
 *
 * Nothing here asserts a colour, a class or a word.
 */

/** Mount with a set of groups and read back the computed geometry. */
function chart (groups, extra) {
  return mountWithBuefy(BarPairChart, {
    propsData: Object.assign({ groups, formatValue: v => String(Math.round(v)) }, extra || {})
  }).vm
}

// The component's own frame, so the expected values below are not magic numbers.
const TOP = 24
const BASELINE = 170
const SPAN = BASELINE - TOP

describe('nothing negative — the six live screens must not move', () => {
  const groups = [
    { label: 'FY24', a: 120000, b: 45000 },
    { label: 'FY25', a: 90000, b: 62000 }
  ]

  it('puts the zero line back on the old baseline', () => {
    expect(chart(groups).zeroY).toBe(BASELINE)
  })

  it('draws every bar at exactly the OLD height expression, (value / max) * span', () => {
    const vm = chart(groups)
    const max = 120000 // the largest value, as the old `max` computed it
    vm.bars.forEach((bar, i) => {
      expect(bar.ah).toBeCloseTo((groups[i].a / max) * SPAN, 9)
      expect(bar.bh).toBeCloseTo((groups[i].b / max) * SPAN, 9)
      // and the old top edge, baseline - height
      expect(bar.ay).toBeCloseTo(BASELINE - bar.ah, 9)
      expect(bar.by).toBeCloseTo(BASELINE - bar.bh, 9)
    })
  })

  it('keeps the four gridlines at the old heights and the old labels', () => {
    const vm = chart(groups)
    const max = 120000
    expect(vm.ticks.length).toBe(4)
    vm.ticks.forEach((t, idx) => {
      const i = idx + 1
      expect(t.y).toBeCloseTo(BASELINE - (SPAN * i) / 4, 9)
      expect(t.label).toBe(String(Math.round((max * i) / 4)))
    })
  })

  it('keeps every label directly above its bar, as before', () => {
    const vm = chart(groups)
    vm.bars.forEach((bar) => {
      expect(bar.aLabelY).toBeCloseTo(bar.ay - 5, 9)
      expect(bar.bLabelY).toBeCloseTo(bar.by - 5, 9)
    })
  })

  it('keeps the old canvas height and the old group-label row', () => {
    const vm = chart(groups)
    expect(vm.height).toBe(210)
    // The group labels are drawn at `height - 20`, which is the old `baseline + 20`.
    expect(vm.height - 20).toBe(BASELINE + 20)
  })

  it('an all-zero chart keeps the old scale of 1 rather than dividing by nothing', () => {
    const vm = chart([{ label: 'none', a: 0, b: 0 }])
    expect(vm.zeroY).toBe(BASELINE)
    expect(vm.ticks.map(t => t.label)).toEqual(['0', '1', '1', '1'])
    expect(vm.bars[0].ah).toBe(0)
    expect(Number.isFinite(vm.bars[0].ay)).toBe(true)
  })
})

describe('a loss — what used to draw as break-even', () => {
  const groups = [
    { label: 'FY24', a: 120000, b: 45000 },
    { label: 'FY25', a: 90000, b: -40000 }
  ]

  it('🔴 GIVES THE LOSS A REAL BAR, not a flat line on the axis', () => {
    const loss = chart(groups).bars[1]
    // The whole fault in one assertion: this was 0.
    expect(loss.bh).toBeGreaterThan(0)
  })

  it('draws it BELOW the zero line, never above', () => {
    const vm = chart(groups)
    const loss = vm.bars[1]
    expect(loss.by).toBeCloseTo(vm.zeroY, 9)
    expect(loss.by + loss.bh).toBeGreaterThan(vm.zeroY)
  })

  it('scales the loss against the same range as the profits', () => {
    const vm = chart(groups)
    const range = 120000 - -40000
    const scale = SPAN / range
    expect(vm.bars[1].bh).toBeCloseTo(40000 * scale, 9)
    expect(vm.bars[0].ah).toBeCloseTo(120000 * scale, 9)
  })

  it('puts the loss label UNDER the bar so it never crosses the axis', () => {
    const loss = chart(groups).bars[1]
    expect(loss.bLabelY).toBeCloseTo(loss.by + loss.bh + 13, 9)
    expect(loss.bLabelY).toBeGreaterThan(loss.by)
  })

  it('still prints the true figure, negative sign and all', () => {
    expect(chart(groups).bars[1].bLabel).toBe('-40000')
  })

  it('lifts the zero line off the floor to make room underneath', () => {
    expect(chart(groups).zeroY).toBeLessThan(BASELINE)
    expect(chart(groups).zeroY).toBeGreaterThan(TOP)
  })

  it('🔴 KEEPS THE LOSS LABEL CLEAR OF THE GROUP LABEL BELOW IT', () => {
    // Found by rendering the fix, not by reasoning about it: at the old canvas height a
    // loss bar reaching the plot floor put its figure at y=183 and the group label sat at
    // 190, so "-$40k" printed on top of "FY25". The canvas grows only when something is
    // negative, which is why the positive block above still sees 210.
    const vm = chart(groups)
    const groupLabelY = vm.height - 20
    vm.bars.forEach((bar) => {
      expect(bar.aLabelY).toBeLessThan(groupLabelY - 8)
      expect(bar.bLabelY).toBeLessThan(groupLabelY - 8)
    })
  })

  it('grows the canvas only when something is negative', () => {
    expect(chart(groups).height).toBe(232)
    expect(chart([{ label: 'ok', a: 10, b: 20 }]).height).toBe(210)
  })
})

describe('an overdraft — every value negative, which drew a blank chart', () => {
  const groups = [{ label: 'Closing bank', a: -25000, b: -60000 }]

  it('🔴 DRAWS BOTH BARS — this was two bars of height zero and meaningless gridlines', () => {
    const vm = chart(groups)
    expect(vm.bars[0].ah).toBeGreaterThan(0)
    expect(vm.bars[0].bh).toBeGreaterThan(0)
  })

  it('puts zero at the top, with the bars hanging below it', () => {
    const vm = chart(groups)
    expect(vm.zeroY).toBeCloseTo(TOP, 9)
    expect(vm.bars[0].ay).toBeCloseTo(vm.zeroY, 9)
  })

  it('draws the deeper overdraft as the longer bar', () => {
    const bar = chart(groups).bars[0]
    expect(bar.bh).toBeGreaterThan(bar.ah)
  })

  it('keeps both overdraft labels clear of the group label', () => {
    const vm = chart(groups)
    const groupLabelY = vm.height - 20
    expect(vm.bars[0].aLabelY).toBeLessThan(groupLabelY - 8)
    expect(vm.bars[0].bLabelY).toBeLessThan(groupLabelY - 8)
  })

  it('gives the gridlines real values instead of the old fallback of 1', () => {
    // The old chart had no positive value, so `max` fell back to 1 and the axis read
    // 0.25 / 0.5 / 0.75 / 1 against figures in the tens of thousands.
    const labels = chart(groups).ticks.map(t => Number(t.label))
    expect(labels.some(v => v <= -1000)).toBe(true)
    expect(labels).not.toEqual([0, 1, 1, 1])
  })
})

describe('the edges', () => {
  it('holds a missing value at zero height and prints nothing for it', () => {
    const vm = chart([{ label: 'partial', a: 5000, b: null }])
    expect(vm.bars[0].bh).toBe(0)
    expect(vm.bars[0].bLabel).toBe('')
  })

  it('survives no groups at all', () => {
    const vm = chart([])
    expect(vm.bars).toEqual([])
    expect(Number.isFinite(vm.zeroY)).toBe(true)
  })

  it('keeps a bar inside the plot at both extremes', () => {
    const vm = chart([{ label: 'wide', a: 100, b: -100 }])
    vm.bars.forEach((bar) => {
      expect(bar.ay).toBeGreaterThanOrEqual(TOP - 0.001)
      expect(bar.by + bar.bh).toBeLessThanOrEqual(BASELINE + 0.001)
    })
  })
})
